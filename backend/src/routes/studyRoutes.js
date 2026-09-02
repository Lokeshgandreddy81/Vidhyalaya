import express from 'express';
import { generateFlashcards, gradeFlashcardAnswer, generateQuiz } from '../services/studyService.js';
import { generateLearningPlan } from '../services/learningPlanService.js';
import { generateModuleContent } from '../services/moduleContentService.js';
import { generateKnowledgeGraph } from '../services/knowledgeGraphService.js';
import { chatWithTutor, resolveQualification } from '../services/tutorChatService.js';
import { askSaraWithRAG } from '../services/chatService.js';
import Document from '../models/Document.js';
import SmartStudyDocument from '../models/SmartStudyDocument.js';
import University from '../models/University.js';
import { authenticateToken } from '../middleware/auth.js';
import { resolveGeminiApiKey, withGeminiKeyFallback } from '../utils/resolveGeminiApiKey.js';
import { runCode } from '../utils/codeRunner.js';
import { enforceAiQuota } from '../middleware/quotaEnforcement.js';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

// Enforce authentication on all study assistant endpoints
router.use(authenticateToken);

/**
 * Helper: resolveUniversityKey
 * Given a documentId, look up the university's Gemini API key from MongoDB.
 * This is how the backend serves students without ever exposing the key to the browser.
 * Also performs zero-trust authorization verification.
 */
const resolveUniversityKey = async (documentId, user, req) => {
  // 1. Try Document model first (Admin RAG docs)
  const doc = await Document.findOne({ documentId });
  if (doc) {
    if (user) {
      const { role, universityId, branch, semester } = user;
      if (role === 'student') {
        if (
          (doc.universityId && doc.universityId.toLowerCase() !== universityId?.toLowerCase()) ||
          (doc.branch && doc.branch.toLowerCase() !== branch?.toLowerCase()) ||
          (doc.semester && String(doc.semester) !== String(semester))
        ) {
          throw Object.assign(
            new Error("Forbidden: You are not authorized to access this document's scope."),
            { status: 403 }
          );
        }
      } else if (role === 'admin') {
        if (doc.universityId && doc.universityId.toLowerCase() !== universityId?.toLowerCase()) {
          throw Object.assign(
            new Error("Forbidden: You are not authorized to access documents from this university."),
            { status: 403 }
          );
        }
      }
    }

    const university = await University.findOne({ universityId: doc.universityId.toLowerCase() });
    if (!university || !university.geminiApiKey) {
      throw Object.assign(
        new Error('This university has not configured a Gemini API Key. Please contact your administrator.'),
        { status: 503 }
      );
    }

    return university.geminiApiKey;
  }

  // 2. Try SmartStudyDocument model next (Student personal uploads)
  let smartDoc;
  const mongoose = await import('mongoose');
  if (mongoose.default.isValidObjectId(documentId)) {
    smartDoc = await SmartStudyDocument.findById(documentId);
  } else {
    smartDoc = await SmartStudyDocument.findOne({ $or: [{ _id: documentId }, { geminiFileName: documentId }] });
  }

  if (smartDoc) {
    if (user && smartDoc.userId !== user.id) {
      throw Object.assign(
        new Error("Forbidden: You are not authorized to access this personal document."),
        { status: 403 }
      );
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      throw Object.assign(
        new Error('Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env or link a key in Settings.'),
        { status: 503 }
      );
    }
    return apiKey;
  }

  throw Object.assign(new Error(`Document not found: ${documentId}`), { status: 404 });
};

// POST /api/study/chat
router.post('/chat', enforceAiQuota, async (req, res) => {
  try {
    const { message, documentId, history, stream } = req.body;

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required.' });
    }

    const apiKey = await resolveUniversityKey(documentId, req.user, req);
    const isStreaming = stream === true || req.query.stream === 'true';

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const result = await askSaraWithRAG(
          message,
          documentId,
          req,
          apiKey,
          history || [],
          (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        );

        res.write(`data: ${JSON.stringify({ done: true, response: result.answer, retrievedChunks: result.retrievedChunks })}\n\n`);
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    const result = await askSaraWithRAG(message, documentId, req, apiKey, history || []);
    res.status(200).json({ success: true, response: result.answer, retrievedChunks: result.retrievedChunks });
  } catch (error) {
    console.error('❌ /api/study/chat error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/study/generate-flashcards
router.post('/generate-flashcards', enforceAiQuota, async (req, res) => {
  try {
    const { highlightedText, documentId } = req.body;

    if (!highlightedText || !documentId) {
      return res.status(400).json({ error: 'highlightedText and documentId are required.' });
    }

    const apiKey = await resolveUniversityKey(documentId, req.user, req);
    const flashcards = await generateFlashcards(highlightedText, documentId, req, apiKey);

    res.status(200).json({ success: true, flashcards });
  } catch (error) {
    console.error('❌ /api/study/generate-flashcards error:', error);
    const status = error.status === 429 ? 429 : (error.status || 500);
    res.status(status).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

// POST /api/study/grade-flashcard-answer
router.post('/grade-flashcard-answer', async (req, res) => {
  try {
    const { flashcardQuestion, correctAnswer, userInputAnswer, documentId } = req.body;

    if (!flashcardQuestion || !correctAnswer || !userInputAnswer || !documentId) {
      return res.status(400).json({
        error: 'flashcardQuestion, correctAnswer, userInputAnswer, and documentId are all required.',
      });
    }

    const result = await gradeFlashcardAnswer(flashcardQuestion, correctAnswer, userInputAnswer, req);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('❌ /api/study/grade-flashcard-answer error:', error);
    const status = error.status === 429 ? 429 : (error.status || 500);
    res.status(status).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/study/generate-learning-plan
router.post('/generate-learning-plan', enforceAiQuota, async (req, res) => {
  try {
    const {
      goal,
      skillLevel = 'beginner',
      dailyCommitment = 45,
      expectedOutcome = 'Mastery',
      mode = 'preview',
      resources = '',
      studyLens,
      scholarPersona,
      cognitiveDensity,
    } = req.body;

    if (!goal || String(goal).trim().length < 2) {
      return res.status(400).json({ error: 'goal is required.' });
    }

    const byokMode = req.headers['x-byok-mode'] || 'auto';
    const byokProvider = req.headers['x-byok-provider'] || 'gemini';
    const hasApiKey = byokMode === 'custom' ? !!req.headers['x-byok-api-key'] : !!process.env.GEMINI_API_KEY;
    if (!hasApiKey && byokProvider === 'gemini') {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env or link a key in Settings.',
      });
    }

    const plan = await generateLearningPlan({
      goal,
      skillLevel,
      dailyCommitment,
      expectedOutcome,
      mode,
      resources,
      studyLens,
      scholarPersona,
      cognitiveDensity,
      req,
    });

    res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('❌ /api/study/generate-learning-plan error:', error);
    const status = error?.status === 429 ? 429 : (error?.status || 500);
    res.status(status).json({ error: error.message || 'Failed to generate learning plan' });
  }
});

// POST /api/study/generate-module-content
router.post('/generate-module-content', enforceAiQuota, async (req, res) => {
  try {
    const { moduleTitle, concepts = [], goal = 'General Mastery', moduleResources = [], studyLens, scholarPersona, cognitiveDensity, stream } = req.body;

    if (!moduleTitle || String(moduleTitle).trim().length < 2) {
      return res.status(400).json({ error: 'moduleTitle is required.' });
    }

    const isStreaming = stream === true || req.query.stream === 'true';

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const result = await generateModuleContent({
          moduleTitle,
          concepts,
          goal,
          moduleResources,
          studyLens,
          scholarPersona,
          cognitiveDensity,
          req,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        });

        res.write(`data: ${JSON.stringify({ done: true, content: result.content, citations: result.citations || [] })}\n\n`);
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    const result = await generateModuleContent({
      moduleTitle,
      concepts,
      goal,
      moduleResources,
      studyLens,
      scholarPersona,
      cognitiveDensity,
      req,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('❌ /api/study/generate-module-content error:', error);
    const status = error?.status === 429 ? 429 : (error?.status || 500);
    res.status(status).json({ error: error.message || 'Failed to generate module content' });
  }
});

// POST /api/study/generate-knowledge-graph
router.post('/generate-knowledge-graph', enforceAiQuota, async (req, res) => {
  try {
    const { moduleTitle, concepts = [], content = '', sourceModuleId, studyLens, scholarPersona, cognitiveDensity, goalContext } = req.body;

    if (!moduleTitle || String(moduleTitle).trim().length < 2) {
      return res.status(400).json({ error: 'moduleTitle is required.' });
    }

    const graph = await generateKnowledgeGraph({
      moduleTitle,
      concepts,
      content,
      sourceModuleId,
      studyLens,
      scholarPersona,
      cognitiveDensity,
      goalContext,
      req,
    });

    res.status(200).json({ success: true, graph });
  } catch (error) {
    console.error('❌ /api/study/generate-knowledge-graph error:', error);
    const status = error?.status === 429 ? 429 : (error?.status || 500);
    res.status(status).json({ error: error.message || 'Failed to generate knowledge graph' });
  }
});

// POST /api/study/tutor-chat
router.post('/tutor-chat', enforceAiQuota, async (req, res) => {
  try {
    const { history = [], newMessage, context = '', currentContent = '', chatContext, stream } = req.body;

    if (!newMessage || String(newMessage).trim().length < 1) {
      return res.status(400).json({ error: 'newMessage is required.' });
    }

    const isStreaming = stream === true || req.query.stream === 'true';

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        await chatWithTutor({
          history,
          newMessage,
          context,
          currentContent,
          chatContext,
          req,
          res,
          onChunk: (chunk) => {
            if (chunk.startsWith('data: ')) {
              res.write(chunk);
            } else {
              res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            if (res.flush) res.flush();
          }
        });
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        if (res.flush) res.flush();
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        if (res.flush) res.flush();
        res.end();
      }
      return;
    }

    const response = await chatWithTutor({
      history,
      newMessage,
      context,
      currentContent,
      chatContext,
      req,
    });

    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('❌ /api/study/tutor-chat error:', error);
    const status = error?.status === 429 ? 429 : (error?.status || 500);
    res.status(status).json({ error: error.message || 'Tutor chat failed' });
  }
});

// POST /api/study/tutor-chat/qualification-resolve
router.post('/tutor-chat/qualification-resolve', enforceAiQuota, async (req, res) => {
  try {
    const { history = [], choiceId, topic, context = '', currentContent = '', chatContext } = req.body;

    if (!choiceId || !topic) {
      return res.status(400).json({ error: 'choiceId and topic are required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const result = await resolveQualification({
        history,
        choiceId,
        topic,
        context,
        currentContent,
        chatContext,
        req,
        res,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('❌ /api/study/tutor-chat/qualification-resolve error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Resolve qualification failed' })}\n\n`);
    res.end();
  }
});

// POST /api/study/generate-quiz
router.post('/generate-quiz', enforceAiQuota, async (req, res) => {
  try {
    const { highlightedText, documentId } = req.body;

    if (!highlightedText || !documentId) {
      return res.status(400).json({ error: 'highlightedText and documentId are required.' });
    }

    const apiKey = await resolveUniversityKey(documentId, req.user, req);
    const quiz = await generateQuiz(highlightedText, documentId, req, apiKey);

    res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('❌ /api/study/generate-quiz error:', error);
    const status = error.status === 429 ? 429 : (error.status || 500);
    res.status(status).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/study/ai-proxy — Generic secure proxy for direct client requests
router.post('/ai-proxy', enforceAiQuota, async (req, res) => {
  try {
    const { kind, params } = req.body;
    if (!kind || !params) {
      return res.status(400).json({ error: 'kind and params are required.' });
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    // Map model family kinds
    let model = 'gemini-2.5-flash';
    if (kind === 'lite') {
      model = 'gemini-2.0-flash';
    } else if (kind === 'tts') {
      model = 'gemini-2.5-flash';
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Call Google GenAI SDK
    const response = await ai.models.generateContent({
      model,
      ...params
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ /api/study/ai-proxy error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'AI proxy request failed.' });
  }
});

// POST /api/study/run-code
router.post('/run-code', async (req, res) => {
  try {
    const { language, code, testCode } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required.' });
    }

    const aliases = {
      js: 'javascript',
      jsx: 'javascript',
      node: 'javascript',
      nodejs: 'javascript',
      py: 'python',
      golang: 'go',
      rs: 'rust',
      'c++': 'cpp',
    };
    const normalizedLanguage = aliases[String(language).toLowerCase()] || String(language).toLowerCase();

    if (!['javascript', 'c', 'cpp', 'java', 'python', 'go', 'rust'].includes(normalizedLanguage)) {
      return res.status(400).json({ error: 'Unsupported compiler language.' });
    }

    const result = await runCode(normalizedLanguage, code, testCode);
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ /api/study/run-code error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
