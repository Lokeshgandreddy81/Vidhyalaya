import mongoose from 'mongoose';

const userLearningStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  skills: { type: mongoose.Schema.Types.Mixed, default: {} },
  memory: { type: mongoose.Schema.Types.Mixed, default: {} },
  activeMission: { type: mongoose.Schema.Types.Mixed, default: null },
  activeScenario: { type: mongoose.Schema.Types.Mixed, default: null },
  byokConfig: { type: mongoose.Schema.Types.Mixed, default: null },
  byokMode: { type: String, enum: ['auto', 'custom'], default: 'auto' },
  isFirstLogin: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model('UserLearningState', userLearningStateSchema);
