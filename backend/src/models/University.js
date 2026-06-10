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
    // Stored server-side only. MUST NEVER be included in any API response.
    // Transparently encrypted at rest via AES-256. Getter decrypts in-memory only.
    geminiApiKey: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
  },
  { 
    timestamps: true,
    // toObject uses getters so in-memory code can read the decrypted key.
    toObject: { getters: true },
    // SECURITY: toJSON MUST NOT expose the decrypted key. We explicitly strip it.
    toJSON: {
      getters: false,
      transform: (_doc, ret) => {
        delete ret.geminiApiKey;
        delete ret.passcodeHash;
        return ret;
      },
    },
  }
);

const University = mongoose.model('University', universitySchema);

export default University;

