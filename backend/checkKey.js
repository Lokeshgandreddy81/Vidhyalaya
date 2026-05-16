import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const checkDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const university = await db.collection('universities').findOne({ universityId: 'shesheer_16' });
    if (university) {
      const key = university.geminiApiKey;
      const maskedKey = key ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : 'NULL';
      console.log(`University ID: ${university.universityId}`);
      console.log(`Masked Gemini API Key in DB: ${maskedKey}`);
      console.log(`Key Length: ${key ? key.length : 0}`);
      console.log(`Last Updated At: ${university.updatedAt}`);
    } else {
      console.log("University record not found.");
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit(0);
  }
};

checkDb();
