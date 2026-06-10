import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import mongoose from 'mongoose';
import { uploadDocumentToGemini, askDocument, deleteDocumentFromGemini } from '../services/geminiService.js';
import SmartStudyDocument from '../models/SmartStudyDocument.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Configure multer for disk storage so we can pass a filepath to Gemini
const upload = multer({ dest: os.tmpdir() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const originalFileName = req.file.originalname;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Resolve key from headers
    const customKey = req.headers['x-byok-mode'] === 'custom' && req.headers['x-byok-provider'] === 'gemini'
      ? req.headers['x-byok-api-key']
      : null;

    // 1. Upload to Gemini File API
    const geminiFile = await uploadDocumentToGemini(filePath, mimeType, customKey);

    // 2. Save metadata to MongoDB
    const doc = new SmartStudyDocument({
      userId,
      originalFileName,
      geminiFileUri: geminiFile.uri,
      geminiFileName: geminiFile.name
    });
    
    await doc.save();

    // 3. Clean up the temp file
    fs.unlinkSync(filePath);

    res.status(200).json({ 
      success: true, 
      documentId: doc._id,
      originalFileName: doc.originalFileName
    });
    
  } catch (error) {
    console.error('UPLOAD ROUTE ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { documentId, message, history, stream } = req.body;

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' });
    }

    if (!mongoose.isValidObjectId(documentId)) {
      return res.status(400).json({ error: `Invalid documentId format: "${documentId}". Must be a valid MongoDB ObjectId.` });
    }

    // 1. Find the document in MongoDB
    const doc = await SmartStudyDocument.findById(documentId);
    if (!doc) {
      throw new Error('Document not found in database');
    }

    if (doc.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Resolve key from headers
    const customKey = req.headers['x-byok-mode'] === 'custom' && req.headers['x-byok-provider'] === 'gemini'
      ? req.headers['x-byok-api-key']
      : null;

    const isStreaming = stream === true || req.query.stream === 'true';

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const aiResponse = await askDocument(
          doc.geminiFileUri,
          message,
          history || [],
          customKey,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        );

        res.write(`data: ${JSON.stringify({ done: true, response: aiResponse })}\n\n`);
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    // 2. Pass the file URI and history to Gemini
    const aiResponse = await askDocument(doc.geminiFileUri, message, history || [], customKey);
    res.status(200).json({ response: aiResponse });

  } catch (error) {
    console.error('CHAT ROUTE ERROR:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.delete('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the document record in MongoDB
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: `Invalid document id format: "${id}". Must be a valid MongoDB ObjectId.` });
    }
    const doc = await SmartStudyDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in database' });
    }

    if (doc.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Resolve key from headers
    const customKey = req.headers['x-byok-mode'] === 'custom' && req.headers['x-byok-provider'] === 'gemini'
      ? req.headers['x-byok-api-key']
      : null;

    // 2. Delete from Google Gemini servers (best-effort — don't block on error)
    try {
      await deleteDocumentFromGemini(doc.geminiFileName, customKey);
    } catch (geminiError) {
      console.warn('Gemini delete warning (file may already be gone):', geminiError.message);
    }

    // 3. Delete from MongoDB
    await SmartStudyDocument.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('DELETE DOCUMENT ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed to delete document' });
  }
});

export default router;
