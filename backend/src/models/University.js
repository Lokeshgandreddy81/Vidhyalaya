import mongoose from 'mongoose';

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
    geminiApiKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const University = mongoose.model('University', universitySchema);

export default University;
