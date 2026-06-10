import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: { expires: 86400 } } // Auto-expire after 24 hours
}, { timestamps: true });

export default mongoose.model('AiUsage', aiUsageSchema);
