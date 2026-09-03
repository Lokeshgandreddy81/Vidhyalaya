import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import University from '../models/University.js';
import Student from '../models/Student.js';
import LoginAttempt from '../models/LoginAttempt.js';

const seedDefaults = async () => {
  try {
    const existingUni = await University.findOne({ universityId: 'shesheer_16' });
    if (!existingUni) {
      const salt = await bcrypt.genSalt(10);
      const passcodeHash = await bcrypt.hash('shesheer16', salt);
      await University.create({
        universityId: 'shesheer_16',
        name: 'Test University',
        passcodeHash,
        geminiApiKey: process.env.GEMINI_API_KEY || null,
      });
      console.log('🏛️ Auto-seeded Test University (shesheer_16 / shesheer16)');
    }

    const existingStudent = await Student.findOne({ rollNumber: '21CS001', universityId: 'shesheer_16' });
    if (!existingStudent) {
      const salt = await bcrypt.genSalt(10);
      const passcodeHash = await bcrypt.hash('Pass@123', salt);
      await Student.create({
        rollNumber: '21CS001',
        universityId: 'shesheer_16',
        name: 'Demo Scholar',
        branch: 'cse',
        semester: '5',
        passcodeHash,
      });
      console.log('🎓 Auto-seeded Demo Student (21CS001 / Pass@123)');
    }

    // Ensure demo accounts are never locked
    await LoginAttempt.deleteMany({
      identifier: { $in: ['student:21cs001:shesheer_16', 'admin:shesheer_16'] }
    });
  } catch (seedErr) {
    console.warn('⚠️ Auto-seed notice:', seedErr.message);
  }
};

const connectDB = async () => {
  try {
    // Attempt connecting to the primary MongoDB Atlas database with a 5-second timeout
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await seedDefaults();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('🔄 Falling back to local in-memory MongoDB (mongodb-memory-server) for local development...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
      await seedDefaults();
    } catch (fallbackError) {
      console.error(`❌ In-Memory MongoDB Failed to start: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
