import express from 'express';
import { generateFlashcards, gradeFlashcardAnswer } from '../services/studyService.js';
import { askSaraWithRAG } from '../services/chatService.js';
import Document from '../models/Document.js';
import University from '../models/University.js';

const router = express.Router();

/**
 * Helper: resolveUniversityKey
 * Given a documentId, look up the university's Gemini API key from MongoDB.
 * This is how the backend serves students without ever exposing the key to the browser.
 */
const resolveUniversityKey = async (documentId) => {
  const doc = await Document.findOne({ documentId });
  if (!doc) throw Object.assign(new Error(`Document not found: ${documentId}`), { status: 404 });

  const university = await University.findOne({ universityId: doc.universityId.toLowerCase() });
  if (!university || !university.geminiApiKey) {
    throw Object.assign(
      new Error('This university has not configured a Gemini API Key. Please contact your administrator.'),
      { status: 503 }
    );
  }

  return university.geminiApiKey;
};

// POST /api/study/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, documentId, history } = req.body;

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required.' });
    }

    const apiKey = await resolveUniversityKey(documentId);
    const result = await askSaraWithRAG(message, documentId, apiKey, history || []);

    res.status(200).json({ success: true, response: result.answer, retrievedChunks: result.retrievedChunks });
  } catch (error) {
    console.error('❌ /api/study/chat error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/study/generate-flashcards
router.post('/generate-flashcards', async (req, res) => {
  try {
    const { highlightedText, documentId } = req.body;

    if (!highlightedText || !documentId) {
      return res.status(400).json({ error: 'highlightedText and documentId are required.' });
    }

    const apiKey = await resolveUniversityKey(documentId);
    const flashcards = await generateFlashcards(highlightedText, documentId, apiKey);

    res.status(200).json({ success: true, flashcards });
  } catch (error) {
    console.error('❌ /api/study/generate-flashcards error:', error);
    const status = error.status === 429 ? 429 : (error.status || 500);
    res.status(status).json({ error: error.message || 'Internal Server Error' });
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

    const apiKey = await resolveUniversityKey(documentId);
    const result = await gradeFlashcardAnswer(flashcardQuestion, correctAnswer, userInputAnswer, apiKey);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('❌ /api/study/grade-flashcard-answer error:', error);
    const status = error.status === 429 ? 429 : (error.status || 500);
    res.status(status).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
