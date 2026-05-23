import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    universityId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      lowercase: true,     // e.g. 'cse', 'ece'
      trim: true,
    },
    semester: {
      type: String,
      required: true,      // '1' through '8'
    },
    passcodeHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index: a roll number is unique per university
studentSchema.index({ rollNumber: 1, universityId: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

export default Student;
