import mongoose from 'mongoose';

const ChunkNodeSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embeddingId: { type: String },
  embedding: { type: [Number] }, // Store the vector embeddings directly
  pageSource: { type: Number, required: true }, // Pinpoint source citation capability
  metadata: {
    hasCode: { type: Boolean, default: false },
    parentHeading: { type: String }
  }
});

const smartStudyDocumentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  originalFileName: { type: String, required: true },
  geminiFileUri: { type: String, required: true },
  geminiFileName: { type: String, required: true },
  fileSize: { type: Number },
  nodes: [ChunkNodeSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SmartStudyDocument', smartStudyDocumentSchema);

