import mongoose from 'mongoose';

const moduleContentSchema = new mongoose.Schema({
  pathId: { type: String, required: true, index: true },
  moduleId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  citations: { type: Array, default: [] }
}, { timestamps: true });

// Compound unique index for quick lookup
moduleContentSchema.index({ pathId: 1, moduleId: 1 }, { unique: true });

export default mongoose.model('ModuleContent', moduleContentSchema);
