import mongoose from 'mongoose';

/**
 * AuditLog — Persistent security event store.
 * 
 * Every login attempt (success/fail), token refresh, account lockout,
 * and admin action is recorded here for compliance and forensics.
 * 
 * TTL index auto-deletes logs after 90 days (configurable).
 */
const auditLogSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    enum: [
      'login_success',
      'login_failure',
      'token_refresh',
      'token_revoked',
      'account_locked',
      'account_unlocked',
      'admin_login_success',
      'admin_login_failure',
      'student_login_success',
      'student_login_failure',
      'student_registered',
      'email_verified',
      'api_key_updated',
      'rate_limit_exceeded',
      'suspicious_activity',
      'password_reset_requested',
      'password_reset_success',
    ],
    index: true,
  },
  actor: {
    type: String, // userId, email, rollNumber, universityId, or IP
    index: true,
  },
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed, // Flexible field for event-specific data
  requestId: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // We use our own timestamp field
});

// Auto-expire audit logs after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
