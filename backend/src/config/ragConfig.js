import { MongoClient } from 'mongodb';
import { Settings } from 'llamaindex';
import { MongoDBAtlasVectorSearch } from '@llamaindex/mongodb';
import { GeminiEmbedding } from '@llamaindex/google';
import dotenv from 'dotenv';

dotenv.config({ override: true });

// Only the MongoClient is a singleton (connection pooling).
// The VectorStore is created per-request to isolate BYOK keys.
let mongoClient = null;
let isInitialized = false;

export const initRAG = async () => {
  if (isInitialized) return;

  try {
    // LlamaIndex's Settings object requires a global embedModel during startup
    // (some internal module checks use it). We satisfy that check with a dummy
    // placeholder. It is NEVER used for actual compute — every real operation
    // gets its own instance via createVectorStore(embedModel).
    Settings.embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: 'dummy-key-to-satisfy-startup-check-only',
    });

    // Initialize MongoDB Client for Vector Search (connection pool)
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is required for Vector Search.');
    }

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    isInitialized = true;
    console.log('✅ MongoDB Atlas client connected and RAG ready.');
  } catch (error) {
    console.error('❌ Failed to initialize RAG configuration:', error);
    throw error;
  }
};

/**
 * Factory function: creates a fresh MongoDBAtlasVectorSearch instance
 * locked to a specific BYOK embedModel. Call this once per request.
 * This avoids the SDK's internal embedModel caching bug.
 */
export const createVectorStore = (embedModel) => {
  if (!isInitialized || !mongoClient) {
    throw new Error('RAG not initialized. Call initRAG() first.');
  }

  const dbName = 'vidhyalai';
  const collectionName = 'chunks';
  const indexName = 'vector_index';

  return new MongoDBAtlasVectorSearch({
    mongodbClient: mongoClient,
    dbName,
    collectionName,
    indexName,
    embedModel, // Directly inject the BYOK model — bypasses all caching
  });
};
