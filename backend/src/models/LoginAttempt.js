import mongoose from 'mongoose';

/**
 * LoginAttempt — Tracks failed login attempts per account for lockout enforcement.
 * 
 * After MAX_ATTEMPTS failures within LOCKOUT_WINDOW, the account is locked.
 * Lockout auto-resets after LOCKOUT_DURATION.
 * 
 * Constants are exported for use in route handlers.
 */

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const loginAttemptSchema = new mongoose.Schema({
  // Composite key: identifier can be email, rollNumber+universityId, or universityId (admin)
  identifier: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Check if the account is currently locked.
 * @returns {boolean}
 */
loginAttemptSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

/**
 * Record a failed login attempt. Locks account after MAX_ATTEMPTS with exponential decay/backoff.
 * 5th failure: 5 minutes lock
 * 6th failure: 10 minutes lock
 * 7th failure: 20 minutes lock
 * ...
 * Caps at 24 hours lock.
 */
loginAttemptSchema.methods.recordFailure = async function () {
  this.failedAttempts += 1;
  this.lastAttemptAt = new Date();

  if (this.failedAttempts >= MAX_ATTEMPTS) {
    const factor = Math.pow(2, this.failedAttempts - MAX_ATTEMPTS); // 1, 2, 4, 8, 16...
    const baseDurationMs = 5 * 60 * 1000; // 5 mins base
    const maxDurationMs = 24 * 60 * 60 * 1000; // 24 hours cap
    const duration = Math.min(factor * baseDurationMs, maxDurationMs);
    
    this.lockedUntil = new Date(Date.now() + duration);
  }

  await this.save();
};

/**
 * Reset attempt counter on successful login.
 */
loginAttemptSchema.methods.resetAttempts = async function () {
  this.failedAttempts = 0;
  this.lockedUntil = null;
  this.lastAttemptAt = new Date();
  await this.save();
};

/**
 * Static helper: get or create a LoginAttempt record.
 */
loginAttemptSchema.statics.getOrCreate = async function (identifier) {
  let record = await this.findOne({ identifier });
  if (!record) {
    record = new this({ identifier });
  }
  return record;
};

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

export default LoginAttempt;
