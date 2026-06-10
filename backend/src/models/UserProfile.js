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
  email: { type: String, unique: true, sparse: true, index: true },
  expiresAt: { type: Date, default: null, index: { expires: 0 } },
  // Auth fields
  password: { type: String, default: null },        // bcrypt hash — null for Google users
  authProvider: { type: String, enum: ['google', 'email', 'sandbox'], default: 'google' },
  isFirstLogin: { type: Boolean, default: true },   // true until onboarding completes
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, default: null },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  // Password reset
  passwordResetToken: { type: String, default: null },     // SHA-256 hash of the raw token
  passwordResetExpires: { type: Date, default: null },
  // Learner profile
  scholasticRole: {
    type: String,
    enum: ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'],
    default: 'Scholar',
  },
  cognitivePace: { type: String, default: 'Balanced' },
  analogyDomain: { type: String, default: 'Tech' },
  // Gamification
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streakDays: { type: Number, default: 1 },
  joinedAt: { type: Date, default: Date.now },
  achievements: [achievementSchema]
}, { timestamps: true });

export default mongoose.model('UserProfile', userProfileSchema);
