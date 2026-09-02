import mongoose from 'mongoose';

/**
 * EpisodicMemory — Persistent, vector-backed cross-session memory for Cortex learners.
 * Stores architectural preferences, coding styles, historical compilation errors,
 * and quiz struggles along with numerical vector embeddings for semantic recall.
 */
const episodicMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['error', 'preference', 'quiz_failure', 'coding_style', 'learning_struggle'],
    default: 'preference',
    index: true,
  },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

episodicMemorySchema.index({ userId: 1, category: 1 });

export default mongoose.model('EpisodicMemory', episodicMemorySchema);
