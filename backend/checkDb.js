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
    console.log("Connected to DB.");
    const db = mongoose.connection.db;
    const university = await db.collection('universities').findOne({ universityId: 'shesheer_16' });
    console.log("University record:", university);
  } finally {
    process.exit(0);
  }
};

checkDb();
