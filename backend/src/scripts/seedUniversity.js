/**
 * University Seeder Script
 * Run once to create the initial university admin record.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/seedUniversity.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import University from '../models/University.js';

const SEED_DATA = {
  universityId: 'shesheer_16',
  name: 'Test University',
  passcode: 'shesheer16',
};

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const existing = await University.findOne({ universityId: SEED_DATA.universityId });

    if (existing) {
      console.log(`⚠️  University "${SEED_DATA.universityId}" already exists. Skipping seed.`);
      console.log(`   Name: ${existing.name}`);
      console.log(`   Has API Key: ${existing.geminiApiKey ? 'Yes' : 'No'}`);
    } else {
      const salt = await bcrypt.genSalt(12);
      const passcodeHash = await bcrypt.hash(SEED_DATA.passcode, salt);

      await University.create({
        universityId: SEED_DATA.universityId,
        name: SEED_DATA.name,
        passcodeHash,
        geminiApiKey: null, // Set via Admin Dashboard after login
      });

      console.log('🎉 University seeded successfully!');
      console.log(`   universityId : ${SEED_DATA.universityId}`);
      console.log(`   name         : ${SEED_DATA.name}`);
      console.log(`   passcode     : ${SEED_DATA.passcode}`);
      console.log('');
      console.log('Next: Log in at /admin and save your Gemini API Key.');
    }
  } catch (error) {
    console.error('❌ Seeder failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
}

seed();
