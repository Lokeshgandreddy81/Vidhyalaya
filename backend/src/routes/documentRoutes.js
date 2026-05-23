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

// GET /api/documents — Fetch documents, scoped by query params
// Query: ?universityId=&branch=&semester=
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.universityId) filter.universityId = req.query.universityId.toLowerCase();
    if (req.query.branch) filter.branch = req.query.branch.toLowerCase();
    if (req.query.semester) filter.semester = req.query.semester;

    const documents = await Document.find(filter).sort({ subjectName: 1, chapterNumber: 1, uploadDate: -1 });
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

    const {
      title,
      domain,
      branch,
      semester,
      subjectName,
      subjectCode,
      chapterNumber,
      chapterTitle,
      // Legacy fallback
      courseName,
    } = req.body;

    const { universityId } = req; // Injected by requireAdminAuth

    if (!subjectName || !branch || !semester || !domain) {
      return res.status(400).json({ error: 'domain, branch, semester, and subjectName are required.' });
    }

    // Resolve the university's Gemini API key
    const university = await University.findOne({ universityId });
    if (!university || !university.geminiApiKey) {
      return res.status(422).json({
        error: 'No Gemini API Key found for this university. Please save one in the Admin Dashboard first.',
      });
    }

    const adminApiKey = university.geminiApiKey;
    const documentId = `doc-${Date.now()}`;

    // Save physical file to public/uploads
    const ext = path.extname(req.file.originalname) || '.pdf';
    const filename = `${documentId}${ext}`;
    const uploadDir = path.join(__dirname, '../../public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const targetPath = path.join(uploadDir, filename);
    await fs.copyFile(req.file.path, targetPath);
    const fileUrl = `/uploads/${filename}`;

    // Run the RAG Ingestion Pipeline
    const docTitle = title || chapterTitle || subjectName;
    console.log(`[DocumentRoute] Ingesting: "${docTitle}" | ${universityId} | ${branch} | Sem ${semester}`);
    const ingestionResult = await processAndStoreDocument(req.file.path, documentId, universityId, adminApiKey);

    // Save Metadata to MongoDB with full hierarchy
    const newDoc = new Document({
      documentId,
      title: docTitle,
      domain: domain || 'General',
      branch: branch.toLowerCase().trim(),
      semester,
      subjectName,
      subjectCode: subjectCode || '',
      chapterNumber: parseInt(chapterNumber) || 1,
      chapterTitle: chapterTitle || '',
      fileUrl,
      universityId,
      courseName: courseName || subjectName, // legacy compat
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
    const { id } = req.params;
    const { universityId } = req;

    const doc = await Document.findOne({ documentId: id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in registry.' });
    }

    if (doc.universityId !== universityId) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete documents from another university.' });
    }

    await deleteDocumentFromIndex(id);

    if (doc.fileUrl) {
      const filename = path.basename(doc.fileUrl);
      const filePath = path.join(__dirname, '../../public/uploads', filename);
      try {
        await fs.unlink(filePath);
      } catch (fErr) {
        console.warn(`[DocumentRoute] Failed to delete file: ${filePath}`, fErr.message);
      }
    }

    await Document.deleteOne({ documentId: id });

    res.status(200).json({ success: true, message: `Document ${id} successfully deleted.` });
  } catch (error) {
    console.error('❌ DELETE /api/documents/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
