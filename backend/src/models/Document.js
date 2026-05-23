import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  // Hierarchy fields
  universityId: {
    type: String,
    required: true,
    default: 'system',
    lowercase: true,
  },
  domain: {
    type: String,
    required: true,
    default: 'General',         // e.g. 'Computer Science', 'Electronics'
  },
  branch: {
    type: String,
    required: true,
    default: 'general',         // e.g. 'cse', 'ece'
    lowercase: true,
  },
  semester: {
    type: String,
    required: true,
    default: '1',               // '1' through '8'
  },
  subjectName: {
    type: String,
    required: true,             // e.g. 'Data Structures'
  },
  subjectCode: {
    type: String,
    default: '',                // e.g. 'CS-301'
  },
  chapterNumber: {
    type: Number,
    default: 1,
  },
  chapterTitle: {
    type: String,
    default: '',                // e.g. 'Chapter 1: Arrays & Linked Lists'
  },
  // Legacy / compat fields
  title: {
    type: String,
    required: true,
  },
  courseName: {
    type: String,
    default: '',                // Kept for backward compat with old docs
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient student-scoped queries
documentSchema.index({ universityId: 1, branch: 1, semester: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
