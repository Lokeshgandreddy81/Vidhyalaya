import express from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAndStoreDocument, deleteDocumentFromIndex } from '../services/documentService.js';
import Document from '../models/Document.js';
import University from '../models/University.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// GET /api/documents — Fetch all registered RAG documents (optionally scoped by universityId)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.universityId ? { universityId: req.query.universityId } : {};
    const documents = await Document.find(filter).sort({ uploadDate: -1 });
    res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error('❌ GET /api/documents error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/documents/upload — Upload and ingest a new RAG document (Admin only)
router.post('/upload', requireAdminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const { title, courseName } = req.body;
    const { universityId } = req; // Injected by requireAdminAuth

    if (!title || !courseName) {
      return res.status(400).json({ error: 'title and courseName are required.' });
    }

    // Resolve the university's Gemini API key from the database
    const university = await University.findOne({ universityId });
    if (!university || !university.geminiApiKey) {
      return res.status(422).json({
        error: 'No Gemini API Key found for this university. Please save one in the Admin Dashboard first.',
      });
    }

    const adminApiKey = university.geminiApiKey;

    // Generate a unique documentId
    const documentId = `doc-${Date.now()}`;

    // 1. Save physical file to public/uploads for PDF Viewer
    const ext = path.extname(req.file.originalname) || '.pdf';
    const filename = `${documentId}${ext}`;
    const uploadDir = path.join(__dirname, '../../public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const targetPath = path.join(uploadDir, filename);
    await fs.copyFile(req.file.path, targetPath);

    const fileUrl = `/uploads/${filename}`;

    // 2. Run the RAG Ingestion Pipeline (key resolved server-side)
    console.log(`[DocumentRoute] Starting ingestion for: ${title} (${documentId}) | University: ${universityId}`);
    const ingestionResult = await processAndStoreDocument(req.file.path, documentId, universityId, adminApiKey);

    // 3. Save Metadata to MongoDB
    const newDoc = new Document({
      documentId,
      title,
      courseName,
      fileUrl,
      universityId,
    });
    await newDoc.save();

    res.status(200).json({
      success: true,
      message: 'Document successfully ingested and registered.',
      document: newDoc,
      chunksCount: ingestionResult.chunksCount,
    });
  } catch (error) {
    console.error('❌ POST /api/documents/upload error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/documents/:id — Delete a RAG document (Admin only)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params; // This is the documentId (doc-...)
    const { universityId } = req; // From JWT

    // 1. Find the document in MongoDB
    const doc = await Document.findOne({ documentId: id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in registry.' });
    }

    // 2. Ensure the admin belongs to the same university as the document
    if (doc.universityId !== universityId) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete documents from another university.' });
    }

    // 3. Delete from Vector Store Index
    await deleteDocumentFromIndex(id);

    // 4. Delete physical file from /uploads
    if (doc.fileUrl) {
      const filename = path.basename(doc.fileUrl);
      const filePath = path.join(__dirname, '../../public/uploads', filename);
      try {
        await fs.unlink(filePath);
        console.log(`[DocumentRoute] Deleted physical file: ${filePath}`);
      } catch (fErr) {
        console.warn(`[DocumentRoute] Failed to delete file (may not exist): ${filePath}`, fErr.message);
      }
    }

    // 5. Delete from MongoDB Registry
    await Document.deleteOne({ documentId: id });

    res.status(200).json({ success: true, message: `Document ${id} successfully deleted.` });
  } catch (error) {
    console.error('❌ DELETE /api/documents/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});


export default router;
