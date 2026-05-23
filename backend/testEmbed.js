import { GeminiEmbedding } from '@llamaindex/google';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const test = async () => {
  try {
    const embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: 'AIzaSyD5NMRMLa2J2UiOwnA9XvKWVPHXsDEEGNU', // The DB key
    });
    console.log("Testing DB key...");
    await embedModel.getTextEmbedding("Test string");
    console.log("DB key is valid!");
  } catch (error) {
    console.error("DB key failed:", error.message);
  }

  try {
    const embedModel2 = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: 'dummy-key-to-satisfy-startup-check-only', // The dummy key
    });
    console.log("Testing dummy key...");
    await embedModel2.getTextEmbedding("Test string");
    console.log("Dummy key is valid?!");
  } catch (error) {
    console.error("Dummy key failed:", error.message);
  }
};

test();
