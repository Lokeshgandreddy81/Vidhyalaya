import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const universitySchema = new mongoose.Schema(
  {
    universityId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passcodeHash: {
      type: String,
      required: true,
    },
    // Stored server-side only. Never sent to any frontend client.
    // Transparently encrypted in DB and decrypted in memory.
    geminiApiKey: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

const University = mongoose.model('University', universitySchema);

export default University;
