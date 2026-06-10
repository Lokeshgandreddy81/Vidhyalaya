import mongoose from 'mongoose';

const videoCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

// TTL index to automatically delete cache entries after 24 hours (86400 seconds)
videoCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('VideoCache', videoCacheSchema);
