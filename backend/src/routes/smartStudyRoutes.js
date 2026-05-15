import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import { uploadDocumentToGemini, askDocument, deleteDocumentFromGemini } from '../services/geminiService.js';
import SmartStudyDocument from '../models/SmartStudyDocument.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

    // 1. Upload to Gemini File API
    const geminiFile = await uploadDocumentToGemini(filePath, mimeType);

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
    const { documentId, message, history } = req.body;

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' });
    }

    // 1. Find the document in MongoDB
    const doc = await SmartStudyDocument.findById(documentId);
    if (!doc) {
      throw new Error('Document not found in database');
    }

    if (doc.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this document' });
    }

    // 2. Pass the file URI and history to Gemini
    const aiResponse = await askDocument(doc.geminiFileUri, message, history || []);

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
    const doc = await SmartStudyDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in database' });
    }

    if (doc.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this document' });
    }

    // 2. Delete from Google Gemini servers (best-effort — don't block on error)
    try {
      await deleteDocumentFromGemini(doc.geminiFileName);
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
