import { GeminiEmbedding } from '@llamaindex/google';
import { VectorStoreIndex } from 'llamaindex';
import { createVectorStore, initRAG } from './src/config/ragConfig.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const test = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await initRAG();

  const embedModel = new GeminiEmbedding({
    model: 'models/gemini-embedding-001',
    apiKey: 'AIzaSyD5NMRMLa2J2UiOwnA9XvKWVPHXsDEEGNU', // valid key
  });

  const vectorStore = createVectorStore(embedModel);
  const index = await VectorStoreIndex.fromVectorStore(vectorStore);
  
  // PATCH THE EMBED MODEL
  index.embedModel = embedModel;

  const retriever = index.asRetriever({
    similarityTopK: 1,
    preFilters: { filters: [{ key: 'documentId', value: 'doc-1778874564238', operator: '==' }] },
  });

  try {
    console.log("Retrieving...");
    const nodes = await retriever.retrieve({ query: "Test" });
    console.log("Success! Nodes retrieved:", nodes.length);
  } catch (err) {
    console.error("Failed!", err.message);
  }
  process.exit(0);
};

test();
