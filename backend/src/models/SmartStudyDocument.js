import mongoose from 'mongoose';

const smartStudyDocumentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  originalFileName: { type: String, required: true },
  geminiFileUri: { type: String, required: true },
  geminiFileName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SmartStudyDocument', smartStudyDocumentSchema);
