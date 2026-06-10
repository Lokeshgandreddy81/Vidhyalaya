import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Attempt connecting to the primary MongoDB Atlas database with a 5-second timeout
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('🔄 Falling back to local in-memory MongoDB (mongodb-memory-server) for local development...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`❌ In-Memory MongoDB Failed to start: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
