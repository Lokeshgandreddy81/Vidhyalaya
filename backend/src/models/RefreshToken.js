import mongoose from 'mongoose';

/**
 * RefreshToken — Persistent token store for refresh token rotation.
 * 
 * Each refresh token is single-use. On refresh:
 * 1. Old token is deleted
 * 2. New access + refresh tokens are issued
 * 
 * TTL index auto-deletes expired tokens.
 */
const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'student', 'admin'],
  },
  // Store minimal session data needed to reissue access tokens
  sessionData: mongoose.Schema.Types.Mixed,
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired refresh tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
