import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const testApi = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const university = await db.collection('universities').findOne({ universityId: 'shesheer_16' });
    const key = university.geminiApiKey;

    if (!key) {
      console.log("No key found");
      process.exit(1);
    }

    console.log(`Testing key: ${key.substring(0, 10)}...`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{text: "Hello, this is a 1 token test."}]
        }]
      })
    });

    const data = await response.json();
    console.log("Status Code:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
};

testApi();
