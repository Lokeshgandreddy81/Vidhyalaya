import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchPerfectVideos } from '../services/videoCurationService.js';
import LearningPath from '../models/LearningPath.js';
import { resolveGeminiApiKey } from '../utils/resolveGeminiApiKey.js';

const router = express.Router();

router.post('/session/:sessionId/inject-file', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { fileName, fileContent, fileMimeType, currentModuleTitle } = req.body;

    if (!fileName || typeof fileContent !== 'string') {
      return res.status(400).json({ error: 'fileName and fileContent are required.' });
    }

    // 1. If it's a code file, parse and build a virtual workspace node blueprint
    const isCodeFile = 
      (fileMimeType && (
        fileMimeType.includes('javascript') || 
        fileMimeType.includes('typescript') || 
        fileMimeType.includes('json') ||
        fileMimeType.includes('python') ||
        fileMimeType.includes('html') ||
        fileMimeType.includes('css')
      )) ||
      fileName.endsWith('.js') || 
      fileName.endsWith('.jsx') || 
      fileName.endsWith('.ts') || 
      fileName.endsWith('.tsx') || 
      fileName.endsWith('.json') || 
      fileName.endsWith('.py') ||
      fileName.endsWith('.go') ||
      fileName.endsWith('.rs') ||
      fileName.endsWith('.c') ||
      fileName.endsWith('.cpp') ||
      fileName.endsWith('.java');

    let virtualWorkspaceFile = null;
    if (isCodeFile) {
      virtualWorkspaceFile = {
        name: fileName,
        content: fileContent,
        path: `./src/${fileName}`
      };
    }

    // Update the path document with the hydrated sandboxState
    if (virtualWorkspaceFile) {
      const path = await LearningPath.findOne({ 
        userId: req.user.id, 
        "phases.modules.id": sessionId 
      });
      
      if (path) {
        for (const phase of path.phases) {
          const mod = phase.modules.find(m => m.id === sessionId);
          if (mod) {
            if (!mod.sandboxState) {
              mod.sandboxState = {
                files: {},
                activeFile: '',
                language: 'javascript',
                exerciseIndex: 0,
                attempts: {},
                completedExerciseIds: []
              };
            }
            mod.sandboxState.files = mod.sandboxState.files || {};
            mod.sandboxState.files[virtualWorkspaceFile.name] = virtualWorkspaceFile.content;
            mod.sandboxState.activeFile = virtualWorkspaceFile.name;
            
            // Set language based on extension
            if (fileName.endsWith('.py')) mod.sandboxState.language = 'python';
            else if (fileName.endsWith('.go')) mod.sandboxState.language = 'go';
            else if (fileName.endsWith('.rs')) mod.sandboxState.language = 'rust';
            else mod.sandboxState.language = 'javascript';
            
            path.markModified('phases');
            await path.save();
            break;
          }
        }
      }
    }

    // 2. Extract technical context keywords from the user's custom file data
    const keywordMatches = fileContent.match(/(?:import|const|function|class)\s+(\w+)/g) || [];
    const codeKeywords = keywordMatches.map(m => {
      const parts = m.trim().split(/\s+/);
      return parts[parts.length - 1];
    });
    const refinedSearchContext = `${currentModuleTitle || ''} ${codeKeywords.slice(0, 5).join(' ')}`.trim();

    // 3. Force re-scouting of multimedia streams aligned with the newly uploaded code/doc asset
    console.log(`[SessionHydration] Re-routing video scout using structural asset blueprint context: "${refinedSearchContext}"`);
    
    // We pass the contents of the file directly into our semantic re-ranking engine
    const optimizedVideos = await searchPerfectVideos({
      query: refinedSearchContext || currentModuleTitle || 'coding tutorial',
      context: fileContent.substring(0, 2000),
      minRelevanceScore: 6,
      geminiApiKey: resolveGeminiApiKey(req)
    });

    // 4. Return both the hydrated code tree state and the new targeted video assets to the UI
    res.json({
      success: true,
      injectedWorkspaceFile: virtualWorkspaceFile,
      contextualVideos: optimizedVideos
    });

  } catch (err) {
    console.error('[SessionFileHydration] Execution failed:', err.message);
    res.status(500).json({ error: 'Failed to integrate file asset into session state.' });
  }
});

export default router;
