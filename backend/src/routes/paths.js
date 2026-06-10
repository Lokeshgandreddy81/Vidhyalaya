import express from 'express';
import LearningPath from '../models/LearningPath.js';
import ModuleContent from '../models/ModuleContent.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateHydratedSandboxExercise } from '../services/moduleContentService.js';
import { callAIEngine } from '../utils/aiClientRouter.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Helper: Extract generated content and write to ModuleContent
async function extractModuleContent(pathId, phases) {
  if (!phases || !Array.isArray(phases)) return;
  for (const phase of phases) {
    if (phase.modules && Array.isArray(phase.modules)) {
      for (const mod of phase.modules) {
        if (mod.generatedContent !== undefined) {
          await ModuleContent.findOneAndUpdate(
            { pathId, moduleId: mod.id },
            {
              $set: {
                content: mod.generatedContent || '',
                citations: mod.citations || []
              }
            },
            { upsert: true, new: true }
          );
          // Set to empty string or remove to prevent document size growth
          mod.generatedContent = '';
        }
      }
    }
  }
}

// GET all paths for a user (Paginated, Metadata only)
router.get('/user/:userId', async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized access to user paths' });
  }
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const paths = await LearningPath.find({ userId: req.params.userId })
      .select('-phases -sessions') // Exclude heavy subdocument lists
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(paths);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single path (Detailed, populated generatedContent)
router.get('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id }).lean();
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this path' });
    }

    // Fetch and merge generatedContent from ModuleContent
    const contents = await ModuleContent.find({ pathId: path.id });
    const contentMap = {};
    contents.forEach(c => {
      contentMap[c.moduleId] = {
        content: c.content,
        citations: c.citations || []
      };
    });

    if (path.phases) {
      path.phases = path.phases.map(phase => {
        if (phase.modules) {
          phase.modules = phase.modules.map(mod => {
            if (contentMap[mod.id]) {
              mod.generatedContent = contentMap[mod.id].content;
              mod.citations = contentMap[mod.id].citations;
            }
            return mod;
          });
        }
        return phase;
      });
    }

    res.json(path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new path
router.post('/', async (req, res) => {
  try {
    const { userId, ...pathData } = req.body;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot create path for another user' });
    }

    // Handle sandbox path TTL: sandbox user paths expire with the user
    const isSandboxUser = userId === 'sandbox-scholar' || userId.startsWith('sandbox_');
    const expiresAt = isSandboxUser ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const newPath = new LearningPath({ ...pathData, userId, expiresAt });
    
    // Extract module content before saving to keep document size light
    if (newPath.phases) {
      await extractModuleContent(newPath.id, newPath.phases);
    }

    await newPath.save();
    res.status(201).json(newPath);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update path
router.put('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this path' });
    }

    // Prevent mass assignment and NoSQL injection
    const allowedFields = [
      'title', 'goal', 'expectedOutcome', 'targetDate',
      'dailyCommitmentMinutes', 'preferredStartTime',
      'phases', 'sessions', 'status', 'progress',
      'studyLens', 'scholarPersona', 'cognitiveDensity',
      'graphTopology'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Extract module content before updating
    if (updateData.phases) {
      await extractModuleContent(path.id, updateData.phases);
    }

    const updated = await LearningPath.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET hydrated sandbox exercise for a module
router.get('/:id/modules/:moduleId/sandbox', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to access this path' });
    }

    // Find the module
    let foundModule = null;
    for (const phase of path.phases) {
      const m = phase.modules.find(x => x.id === req.params.moduleId);
      if (m) {
        foundModule = m;
        break;
      }
    }
    if (!foundModule) return res.status(404).json({ error: 'Module not found' });

    // Return cached sandboxState if already hydrated
    if (foundModule.sandboxState && foundModule.sandboxState.hydrated) {
      return res.json(foundModule.sandboxState);
    }

    // Fetch learningContext
    const contentDoc = await ModuleContent.findOne({ pathId: path.id, moduleId: foundModule.id });
    const learningContext = contentDoc?.content || foundModule.description || foundModule.title;

    // Generate
    const exercise = await generateHydratedSandboxExercise(foundModule.title, learningContext, req);

    const sandboxState = {
      hydrated: true,
      initialCode: exercise.initialCode,
      solutionCheckRegex: exercise.solutionCheckRegex,
      instructionsMarkdown: exercise.instructionsMarkdown
    };

    // Update the path document with the hydrated sandboxState
    foundModule.sandboxState = sandboxState;
    path.markModified('phases');
    await path.save();

    res.json(sandboxState);
  } catch (error) {
    console.error('Error generating hydrated sandbox exercise:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST dynamically hydrate sandbox exercise from active timestamp moment
router.post('/:id/modules/:moduleId/sandbox/hydrate-from-moment', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to access this path' });
    }

    // Find the module
    let foundModule = null;
    for (const phase of path.phases) {
      const m = phase.modules.find(x => x.id === req.params.moduleId);
      if (m) {
        foundModule = m;
        break;
      }
    }
    if (!foundModule) return res.status(404).json({ error: 'Module not found' });

    const { activeChapterTitle, lessonContextText } = req.body;
    const moduleTitle = foundModule.title;

    const prompt = `You are a Senior Technical Instructor. Generate a precise, single-file interactive coding lab configuration that perfectly complements the target concept.
    
    CURRENT CLASSROOM LESSON STATE:
    - Course Topic: "${moduleTitle}"
    - Active Sub-chapter Lecture Focus: "${activeChapterTitle || 'General Concepts'}"
    - Nearby Context Blueprint: "${(lessonContextText || '').substring(0, 800)}"

    Task:
    Design a hands-on exercise files payload. You must include a section marked with "// EXERCISE: Fix or implement logic here" inside a broken codebase shell script or Javascript/Python code block that fails verification rules until the concept is correctly applied.

    Return exactly this JSON data layout structure:
    {
      "instructionsMarkdown": "string explaining target goals and requirements",
      "initialFileBuffer": "string containing code structure with logical flaws",
      "regexValidationRule": "string regex pattern to run against output execution logs"
    }`;

    const rawResponse = await callAIEngine({
      req,
      prompt,
      temperature: 0.1, // Ensure stable code generation
      responseMimeType: 'application/json'
    });

    const parsed = JSON.parse(rawResponse.trim());
    
    const momentSandboxState = {
      hydrated: true,
      initialCode: parsed.initialFileBuffer,
      solutionCheckRegex: parsed.regexValidationRule,
      instructionsMarkdown: parsed.instructionsMarkdown,
      isDynamicMoment: true,
      momentChapter: activeChapterTitle
    };

    res.json(momentSandboxState);
  } catch (err) {
    console.error('[SandboxHydration] Failed to generate dynamic lab:', err.message);
    res.status(500).json({ error: 'Failed to synchronize workspace environment.' });
  }
});

// DELETE path
router.delete('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this path' });
    }

    await LearningPath.findOneAndDelete({ id: req.params.id });
    // Cleanup orphaned ModuleContent
    await ModuleContent.deleteMany({ pathId: req.params.id });

    res.json({ message: 'Path deleted' });
  } catch (error) {
    console.error('Error deleting learning path:', error);
    res.status(500).json({ error: 'Failed to delete learning path' });
  }
});

export default router;
