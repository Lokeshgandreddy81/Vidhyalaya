import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  universityId: {
    type: String,
    default: 'system',
    lowercase: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
