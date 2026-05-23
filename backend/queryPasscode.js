import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const checkPasscode = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const university = await mongoose.connection.db.collection('universities').findOne({ universityId: 'shesheer_16' });
    const isValid = await bcrypt.compare('shesheer16', university.passcodeHash);
    console.log("Is 'shesheer16' the correct password for shesheer_16?", isValid);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
};
checkPasscode();
