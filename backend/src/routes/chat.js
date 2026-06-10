import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { callAIEngine } from '../utils/aiClientRouter.js';

const router = express.Router();

router.post('/general', authenticateToken, async (req, res) => {
  try {
    const { message, history, liveContext } = req.body;

    // 1. Structural assembly of environmental data
    let environmentContextBlock = `\n[CRITICAL LIVE STUDENT WORKSPACE CONTEXT]:`;
    
    if (liveContext?.activeModuleTitle) {
      environmentContextBlock += `\n- Current Learning Module: "${liveContext.activeModuleTitle}"`;
    }
    
    if (liveContext?.videoState) {
      environmentContextBlock += `\n- Active Lecture Video: watch?v=${liveContext.videoState.videoId} at timestamp ${Math.floor(liveContext.videoState.currentTime)}s${liveContext.videoState.activeChapterTitle ? ` (Chapter: "${liveContext.videoState.activeChapterTitle}")` : ''}`;
    }

    if (liveContext?.editorBuffer?.trim()) {
      environmentContextBlock += `\n- Code inside Student Editor Window:\n\`\`\`${liveContext.activeLanguage || 'javascript'}\n${liveContext.editorBuffer}\n\`\`\``;
    }

    if (liveContext?.lastCompilationError?.trim()) {
      environmentContextBlock += `\n- **LIVE CRITICAL ERROR LOG IN TERMINAL**:\n\`\`\`\n${liveContext.lastCompilationError}\n\`\`\``;
    }

    // 2. Synthesize the system anchor to control response format behavior
    const targetSystemInstruction = `You are SARA, an expert tech mentor. Guide the user through technical concepts step-by-step.
    
    Rules for Interactive Components:
    - If explaining multi-file directory updates, structure code snippets inside Markdown syntax specifying exact relative paths.
    - If the user has a terminal or compilation error on screen, analyze their active editor buffer code and point them to the exact logic mismatch without just dumping the final solution copy-paste style. Give them hints first.`;

    // 3. Append context data onto the user prompt to protect conversational history from context drift
    const fullPrompt = `${environmentContextBlock}\n\n[Student Message]: ${message}`;

    const textResponse = await callAIEngine({
      req,
      prompt: fullPrompt,
      systemInstruction: targetSystemInstruction,
      temperature: 0.2, // Keep reasoning deterministic and accurate
      maxOutputTokens: 3000
    });

    res.json({ text: textResponse });
  } catch (err) {
    console.error('[CortexChat] General execution error:', err.message);
    res.status(500).json({ error: 'Failed to process chat query.' });
  }
});

export default router;
