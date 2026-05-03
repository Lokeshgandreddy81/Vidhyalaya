import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: String,
  unlockedAt: Date,
  condition: {
    type: String,
    enum: ['first_module', 'first_path', 'quiz_master', 'streak_7']
  }
});

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, default: 'Scholar' },
  email: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streakDays: { type: Number, default: 1 },
  joinedAt: { type: Date, default: Date.now },
  achievements: [achievementSchema]
}, { timestamps: true });

export default mongoose.model('UserProfile', userProfileSchema);
