import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { processAndStoreDocument } from '../services/documentService.js';
import { askSaraWithRAG, explainHighlight } from '../services/chatService.js';

const router = express.Router();

// Modification 1: Configure multer to temporarily save uploaded PDFs to /tmp/
// so LlamaParseReader has a valid local file path to read from.
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// DEV ROUTE: Upload and Process Textbook
router.post('/upload-textbook', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const { documentId, universityId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required in form data.' });
    }

    // Call the ingestion pipeline (it handles cleaning up the temporary file)
    const result = await processAndStoreDocument(req.file.path, documentId, universityId);

    res.status(200).json({ 
      success: true, 
      message: 'Document successfully processed and stored.',
      chunksCount: result.chunksCount 
    });
  } catch (error) {
    console.error('❌ /api/dev/upload-textbook error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DEV ROUTE: Ask SARA with RAG
router.post('/chat', async (req, res) => {
  try {
    const { query, documentId, userApiKey } = req.body;

    if (!query || !documentId || !userApiKey) {
      return res.status(400).json({ error: 'query, documentId, and userApiKey are required.' });
    }

    const result = await askSaraWithRAG(query, documentId, userApiKey);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('❌ /api/dev/chat error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DEV ROUTE: Explain Highlight
router.post('/highlight', async (req, res) => {
  try {
    const { highlightedText, userApiKey } = req.body;

    if (!highlightedText || !userApiKey) {
      return res.status(400).json({ error: 'highlightedText and userApiKey are required.' });
    }

    const result = await explainHighlight(highlightedText, userApiKey);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('❌ /api/dev/highlight error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
