import { MarkdownNodeParser, Document, VectorStoreIndex, storageContextFromDefaults } from 'llamaindex';
import { LlamaParseReader } from 'llama-cloud-services';
import { GeminiEmbedding } from '@llamaindex/google';
import { createVectorStore } from '../config/ragConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const processAndStoreDocument = async (pdfPath, documentId, universityId, adminApiKey) => {
  try {
    if (!adminApiKey) {
      throw new Error('Missing Admin Gemini API Key for ingestion embeddings.');
    }
    if (!process.env.LLAMAPARSE_API_KEY) {
      throw new Error('LLAMAPARSE_API_KEY is not configured in .env.');
    }

    console.log(`[DocumentService] Starting ingestion for document ${documentId}...`);

    // Step A: Parse PDF to Markdown via LlamaParse
    const reader = new LlamaParseReader({
      resultType: 'markdown',
      apiKey: process.env.LLAMAPARSE_API_KEY,
    });

    console.log(`[DocumentService] Uploading ${pdfPath} to LlamaParse...`);
    const parsedDocs = await reader.loadData(pdfPath);

    if (!parsedDocs || parsedDocs.length === 0) {
      throw new Error('LlamaParse returned no data for the document.');
    }

    const fullMarkdownText = parsedDocs.map(d => d.text).join('\n\n');

    const document = new Document({
      text: fullMarkdownText,
      metadata: {
        documentId: documentId.toString(),
        universityId: universityId ? universityId.toString() : 'unknown',
      },
    });

    // Step B: Chunk by Markdown headers
    const parser = new MarkdownNodeParser();
    const nodes = parser.getNodesFromDocuments([document]);

    console.log(`[DocumentService] Parsed ${nodes.length} nodes from Markdown headers.`);

    // Step C & D: Create a BYOK-specific embedding model instance
    const embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: adminApiKey,
    });

    // Create a fresh vectorStore with the BYOK embedModel directly injected.
    // This avoids the SDK's constructor-level model caching bug.
    const vectorStore = createVectorStore(embedModel);
    const storageContext = await storageContextFromDefaults({ vectorStore });

    await VectorStoreIndex.init({
      nodes,
      storageContext,
    });

    console.log(`✅ Successfully embedded and stored ${nodes.length} chunks for document ${documentId}.`);
    return { success: true, chunksCount: nodes.length };

  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    throw error;
  } finally {
    // Always clean up the temporary file
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`[DocumentService] Cleaned up temporary file ${pdfPath}.`);
    }
  }
};

/**
 * deleteDocumentFromIndex
 * Removes all chunks associated with a documentId from MongoDB Atlas Vector Search.
 */
export const deleteDocumentFromIndex = async (documentId) => {
  const { MongoClient } = await import('mongodb');
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('vidhyalai');
    const collection = db.collection('chunks');
    
    console.log(`[DocumentService] Deleting chunks for documentId: ${documentId}`);
    const result = await collection.deleteMany({ 'metadata.documentId': documentId });
    console.log(`[DocumentService] Deleted ${result.deletedCount} chunks.`);
    
    return result.deletedCount;
  } finally {
    await client.close();
  }
};

