import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const queryDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("--- Universities (Admins) ---");
    const universities = await mongoose.connection.db.collection('universities').find({}).toArray();
    console.log(JSON.stringify(universities.map(u => ({ id: u.universityId, name: u.name })), null, 2));
    
    console.log("\n--- Students ---");
    const students = await mongoose.connection.db.collection('students').find({}).toArray();
    console.log(JSON.stringify(students.map(s => ({ rollNumber: s.rollNumber, name: s.name, universityId: s.universityId })), null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
};

queryDb();
