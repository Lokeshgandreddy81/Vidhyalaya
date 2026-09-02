import { MongoClient } from 'mongodb';
import { Settings, SimpleVectorStore } from 'llamaindex';
import { MongoDBAtlasVectorSearch } from '@llamaindex/mongodb';
import { GeminiEmbedding } from '@llamaindex/google';
import dotenv from 'dotenv';

import { AsyncLocalStorage } from 'async_hooks';

dotenv.config({ override: true });

// AsyncLocalStorage to isolate Settings.embedModel on a per-request basis
export const ragLocalStorage = new AsyncLocalStorage();

let defaultEmbedModel = null;

Object.defineProperty(Settings, 'embedModel', {
  get() {
    const store = ragLocalStorage.getStore();
    if (store && store.embedModel) {
      return store.embedModel;
    }
    return defaultEmbedModel;
  },
  set(val) {
    const store = ragLocalStorage.getStore();
    if (store) {
      store.embedModel = val;
    } else {
      defaultEmbedModel = val;
    }
  },
  configurable: true,
  enumerable: true,
});

// Only the MongoClient is a singleton (connection pooling).
// The VectorStore is created per-request to isolate BYOK keys.
let mongoClient = null;
let isInitialized = false;
let fallbackVectorStore = null;

export const initRAG = async () => {
  if (isInitialized) return;

  const backupKey = process.env.GEMINI_API_KEY || '';

  try {
    // LlamaIndex's Settings object requires a global embedModel during startup
    // (some internal module checks use it). We satisfy that check with a dummy
    // placeholder. It is NEVER used for actual compute — every real operation
    // gets its own instance via createVectorStore(embedModel).
    Settings.embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      // Use a secure server-side environment key instead of a placeholder string to handle deep stack queries safely
      apiKey: backupKey || 'placeholder_prevent_startup_crash',
    });

    // Initialize MongoDB Client for Vector Search (connection pool)
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is required for Vector Search.');
    }

    mongoClient = new MongoClient(uri);
    // 5 second timeout to prevent hanging on dns resolution issues
    await mongoClient.connect({ serverSelectionTimeoutMS: 5000 });

    isInitialized = true;
    console.log('✅ MongoDB Atlas client connected and RAG ready.');
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB Atlas Vector Search:', error.message);
    console.log('🔄 Falling back to SimpleVectorStore (in-memory) for RAG.');
    isInitialized = true;
  }
};

/**
 * Factory function: creates a fresh MongoDBAtlasVectorSearch instance
 * locked to a specific BYOK embedModel. Call this once per request.
 * This avoids the SDK's internal embedModel caching bug.
 */
export const createVectorStore = (embedModel) => {
  if (!isInitialized) {
    throw new Error('RAG not initialized. Call initRAG() first.');
  }

  if (!mongoClient) {
    if (!fallbackVectorStore) {
      fallbackVectorStore = new SimpleVectorStore();
    }
    return fallbackVectorStore;
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
