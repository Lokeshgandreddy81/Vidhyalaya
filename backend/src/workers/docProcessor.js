import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import SmartStudyDocument from '../models/SmartStudyDocument.js';
import { processAndStoreDocument } from '../services/documentService.js';

dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Count pages in PDF from local file buffer
function getPdfPageCount(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfText = fileBuffer.toString('binary');
    const matches = pdfText.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 1;
  } catch (err) {
    console.error('[Worker] Error reading PDF page count:', err);
    return 1;
  }
}

// Helper: Chunk Markdown while preserving syntax, tables, code blocks, etc.
function chunkMarkdown(text, pageSource) {
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = '';
  let inCodeBlock = false;
  let inTable = false;
  let parentHeading = '';

  for (const line of lines) {
    // Check heading
    if (!inCodeBlock && line.startsWith('#')) {
      parentHeading = line.replace(/^#+\s*/, '').trim();
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          pageSource,
          metadata: {
            hasCode: currentChunk.includes('```'),
            parentHeading
          }
        });
        currentChunk = '';
      }
    }

    // Check code block boundary
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Check table row boundary
    if (!inCodeBlock && line.startsWith('|')) {
      inTable = true;
    } else if (!inCodeBlock && inTable && !line.startsWith('|')) {
      inTable = false;
    }

    currentChunk += line + '\n';

    // Split if chunk is getting large, but avoid breaking code blocks or tables
    if (currentChunk.length > 1200 && !inCodeBlock && !inTable) {
      chunks.push({
        text: currentChunk.trim(),
        pageSource,
        metadata: {
          hasCode: currentChunk.includes('```'),
          parentHeading
        }
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
        parentHeading
      }
    });
  }

  return chunks;
}

async function run() {
  const { documentId, filePath, userApiKey, embedProvider, universityId, isSmartStudy } = workerData;
  
  try {
    // 1. Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) throw new Error('MONGODB_URI environment variable is missing.');
      await mongoose.connect(mongoUri);
      console.log('[Worker] Connected to MongoDB.');
    }

    if (!isSmartStudy) {
      // Admin RAG document processing
      console.log(`[Worker] Starting Admin RAG processing for doc ${documentId}`);
      const result = await processAndStoreDocument(filePath, documentId, universityId, userApiKey, embedProvider);
      parentPort.postMessage({ status: 'completed', data: result });
    } else {
      // Student SmartStudy document processing
      console.log(`[Worker] Starting Student SmartStudy processing for doc ${documentId}`);
      
      // Load document from DB
      const doc = await SmartStudyDocument.findById(documentId);
      if (!doc) throw new Error(`SmartStudyDocument not found: ${documentId}`);

      const numPages = getPdfPageCount(filePath);
      console.log(`[Worker] PDF page count resolved: ${numPages} pages.`);

      const ai = new GoogleGenAI({ apiKey: userApiKey });
      const nodes = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        console.log(`[Worker] Converting page ${pageNum}/${numPages} to Visual Markdown...`);
        
        const prompt = `Analyze page ${pageNum} of the attached document.
Convert its entire contents into clean, highly structured Markdown.

CRITICAL RULES:
- If a code segment is found, format it inside proper markdown code fences with the correct language tag.
- If a chart, database schema, or architecture diagram is visible, synthesize a detailed technical text description outlining the exact components and relationships.
- Maintain the structural hierarchy of headings (#, ##, ###).`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { fileData: { fileUri: doc.geminiFileUri, mimeType: 'application/pdf' } },
            { text: prompt }
          ],
          config: {
            temperature: 0.1
          }
        });

        const visualMarkdown = response.text || '';
        
        // Split visual markdown into chunks
        const pageChunks = chunkMarkdown(visualMarkdown, pageNum);
        nodes.push(...pageChunks);

        // Delay 1.5s as safety throttle to avoid rate limit
        if (pageNum < numPages) {
          await delay(1500);
        }
      }

      console.log(`[Worker] Total chunks generated: ${nodes.length}. Generating embeddings...`);

      // Generate vector embeddings for all chunks in batches
      const batchSize = 20;
      for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        console.log(`[Worker] Embedding batch ${i/batchSize + 1}/${Math.ceil(nodes.length/batchSize)}`);
        
        const embedRes = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: batch.map(c => c.text)
        });

        if (Array.isArray(embedRes.embeddings)) {
          batch.forEach((node, idx) => {
            node.embedding = embedRes.embeddings[idx]?.values || [];
          });
        } else if (embedRes.embedding) {
          batch[0].embedding = embedRes.embedding.values || [];
        }
      }

      // Update SmartStudyDocument in DB
      doc.nodes = nodes;
      await doc.save();

      console.log(`[Worker] Successfully stored ${nodes.length} chunks for personal doc ${documentId}`);
      parentPort.postMessage({ status: 'completed', data: { success: true, chunksCount: nodes.length } });
    }
  } catch (error) {
    console.error(`[Worker] Error processing document ${documentId}:`, error);
    parentPort.postMessage({ status: 'failed', error: error.message });
  } finally {
    // Clean up temporary file
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Worker] Cleaned up temporary file ${filePath}`);
      }
    } catch (err) {
      console.warn(`[Worker] Failed to clean up ${filePath}:`, err.message);
    }
  }
}

run();
