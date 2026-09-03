import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * processAndStoreDocument — High-speed, robust PDF -> Markdown -> Chunks -> Vector Embeddings pipeline.
 * Uses local PDF extraction (fast & 0-quota) with Gemini fallback and gemini-embedding-001 vectors.
 */
export const processAndStoreDocument = async (pdfPath, documentId, universityId, adminApiKey, embedProvider = 'gemini') => {
  console.log(`[DocumentService] Starting robust ingestion for doc ${documentId}...`);

  const fileBuffer = fs.readFileSync(pdfPath);
  let allChunks = [];

  // 1. FAST LOCAL EXTRACTION (Zero API quota, zero delay, works on any standard PDF)
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();

    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      for (const p of parsed.pages) {
        if (p.text && p.text.trim()) {
          const chunks = chunkMarkdown(p.text, p.num || 1);
          allChunks.push(...chunks);
        }
      }
    } else if (parsed && parsed.text && parsed.text.trim()) {
      allChunks = chunkMarkdown(parsed.text, 1);
    }
    console.log(`[DocumentService] Local PDF extraction succeeded: ${allChunks.length} chunks.`);
  } catch (localErr) {
    console.warn(`[DocumentService] Local PDF extraction warning: ${localErr.message}`);
  }

  // 2. GEMINI FALLBACK (If local extraction had no selectable text, e.g. scanned/complex PDF)
  if (allChunks.length === 0 && adminApiKey) {
    console.log('[DocumentService] No text found locally. Falling back to Gemini Multimodal parsing...');
    try {
      const ai = new GoogleGenAI({ apiKey: adminApiKey });
      const base64Data = fileBuffer.toString('base64');
      
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf',
            },
          },
          {
            text: 'Convert this entire PDF document into clean, structured Markdown. Extract all sections, headings, code blocks, tables, and academic text. Do NOT include conversational filler.',
          },
        ],
        config: { temperature: 0.1 },
      });

      const markdown = response.text || '';
      if (markdown.trim()) {
        allChunks = chunkMarkdown(markdown, 1);
        console.log(`[DocumentService] Gemini extraction generated ${allChunks.length} chunks.`);
      }
    } catch (geminiErr) {
      console.warn(`[DocumentService] Gemini extraction notice: ${geminiErr.message}`);
    }
  }

  // If still empty (e.g. blank document), create at least one placeholder chunk
  if (allChunks.length === 0) {
    allChunks.push({
      text: `Document ${documentId} (PDF content was image-based or blank)`,
      pageSource: 1,
      metadata: { hasCode: false, parentHeading: 'Overview' },
    });
  }

  // 3. VECTOR EMBEDDINGS VIA gemini-embedding-001
  const effectiveKey = adminApiKey || process.env.GEMINI_API_KEY;
  if (effectiveKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveKey });
      const batchSize = 10;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        try {
          const embedRes = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: batch.map(c => c.text),
          });

          if (Array.isArray(embedRes.embeddings)) {
            batch.forEach((node, idx) => {
              node.embedding = embedRes.embeddings[idx]?.values || [];
            });
          } else if (embedRes.embedding) {
            batch[0].embedding = embedRes.embedding.values || [];
          }
        } catch (embedBatchErr) {
          console.warn(`[DocumentService] Batch embedding note: ${embedBatchErr.message}`);
        }
        if (i + batchSize < allChunks.length) {
          await delay(300);
        }
      }
    } catch (embedInitErr) {
      console.warn(`[DocumentService] Embedding generation note: ${embedInitErr.message}`);
    }
  }

  // 4. PERSIST CHUNKS TO MONGODB
  try {
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (db && allChunks.length > 0) {
      const collection = db.collection('chunks');
      const docsToInsert = allChunks.map(c => ({
        text: c.text,
        pageSource: c.pageSource,
        metadata: {
          documentId,
          universityId: universityId || 'system',
          ...c.metadata,
        },
        embedding: c.embedding || [],
        createdAt: new Date(),
      }));
      await collection.insertMany(docsToInsert);
      console.log(`[DocumentService] ✅ Persisted ${docsToInsert.length} chunks to MongoDB chunks collection.`);
    }
  } catch (mongoErr) {
    console.warn('[DocumentService] Chunk persistence notice:', mongoErr.message);
  }

  return { success: true, chunksCount: allChunks.length, chunks: allChunks };
};

/**
 * Chunk text while respecting paragraph boundaries, headings, and code blocks.
 */
function chunkMarkdown(text, pageSource) {
  if (!text || !text.trim()) return [];
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = '';
  let inCodeBlock = false;
  let inTable = false;
  let parentHeading = '';

  for (const line of lines) {
    if (!inCodeBlock && line.startsWith('#')) {
      parentHeading = line.replace(/^#+\s*/, '').trim();
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          pageSource,
          metadata: {
            hasCode: currentChunk.includes('```'),
            parentHeading,
          },
        });
        currentChunk = '';
      }
    }

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    if (!inCodeBlock && line.startsWith('|')) {
      inTable = true;
    } else if (!inCodeBlock && inTable && !line.startsWith('|')) {
      inTable = false;
    }

    currentChunk += line + '\n';

    if (currentChunk.length > 1000 && !inCodeBlock && !inTable) {
      chunks.push({
        text: currentChunk.trim(),
        pageSource,
        metadata: {
          hasCode: currentChunk.includes('```'),
          parentHeading,
        },
      });
      currentChunk = '';
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      pageSource,
      metadata: {
        hasCode: currentChunk.includes('```'),
        parentHeading,
      },
    });
  }

  return chunks;
}

/**
 * deleteDocumentFromIndex
 * Removes all chunks associated with a documentId from MongoDB chunks collection.
 */
export const deleteDocumentFromIndex = async (documentId) => {
  try {
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('[DocumentService] No active DB connection for chunk deletion.');
      return 0;
    }
    const collection = db.collection('chunks');
    console.log(`[DocumentService] Deleting chunks for documentId: ${documentId}`);
    const result = await collection.deleteMany({ 'metadata.documentId': documentId });
    console.log(`[DocumentService] Deleted ${result.deletedCount} chunks.`);
    return result.deletedCount;
  } catch (err) {
    console.warn(`[DocumentService] Chunk deletion failed: ${err.message}`);
    return 0;
  }
};
