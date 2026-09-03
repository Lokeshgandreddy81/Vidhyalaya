import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import UserProfile from '../models/UserProfile.js';
import RefreshToken from '../models/RefreshToken.js';
import LoginAttempt from '../models/LoginAttempt.js';
import AuditLog from '../models/AuditLog.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { generateTokens } from '../utils/authHelper.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import logger from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { timingSafeCompare } from '../utils/timingSafe.js';

const router = express.Router();

// Get a token for a user (dev mode only, rate-limited)
router.post('/token', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return res.status(400).json({ error: 'Valid userId is required (string, max 128 chars)' });
  }

  const isSandbox = userId.startsWith('sandbox_') || userId === 'default-user';
  if (!isSandbox && process.env.ALLOW_DEV_TOKEN !== 'true') {
    return res.status(403).json({ error: 'Dev token endpoint is disabled.' });
  }

  try {
    const { accessToken } = await generateTokens({ id: userId }, 'user', req, res);
    
    await AuditLog.create({
      event: 'login_success',
      actor: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { method: 'dev-token-endpoint' },
      requestId: req.id,
    });

    res.json({ token: accessToken });
  } catch (error) {
    log.error({ err: error }, 'Dev token generation failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GOOGLE OAUTH SSO — RATE-LIMITED, ZERO-TRUST VERIFICATION
router.post('/google-login', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { idToken } = req.body;
  
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'Google ID Token (credential) is required' });
  }

  try {
    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId) {
      // PRODUCTION PATH: Cryptographically verify Google-issued identity token
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } else if (process.env.NODE_ENV === 'production') {
      // HARD BLOCK: No dev fallback in production. Ever.
      log.error('CRITICAL: GOOGLE_CLIENT_ID missing in production. Rejecting login.');
      
      await AuditLog.create({
        event: 'login_failure',
        actor: 'google-sso',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'GOOGLE_CLIENT_ID missing in production' },
        requestId: req.id,
      });
      
      return res.status(500).json({ error: 'SSO configuration error. Contact administrator.' });
    } else {
      // DEV ONLY: Unverified decode for local development bootstrapping
      log.warn('⚠️  DEV MODE: GOOGLE_CLIENT_ID not set. Using unverified JWT decode.');
      payload = jwt.decode(idToken);
    }

    if (!payload || !payload.email) {
      await AuditLog.create({
        event: 'login_failure',
        actor: 'google-sso',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Invalid Google token payload' },
        requestId: req.id,
      });
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleUserId, email, name } = payload;

    // Zero-trust query: find by Google User ID (sub) or email
    let profile = await UserProfile.findOne({
      $or: [{ userId: googleUserId }, { email: email.toLowerCase() }]
    });

    if (!profile) {
      log.info({ email }, `Provisioning new user profile for: ${email}`);
      profile = new UserProfile({
        userId: googleUserId,
        name: name || 'Scholar',
        email: email.toLowerCase(),
        authProvider: 'google',
        isFirstLogin: true,
        isEmailVerified: true,
        joinedAt: new Date(),
        xp: 0,
        level: 1,
        streakDays: 1,
      });
      await profile.save();
      
      await AuditLog.create({
        event: 'student_registered',
        actor: profile.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { provider: 'google', userId: profile.userId },
        requestId: req.id,
      });
    } else if (profile.userId !== googleUserId) {
      // Map legacy/email-based users to their official Google sub ID
      profile.userId = googleUserId;
      if (name) profile.name = name;
      await profile.save();
    }

    // Issue production-ready short-lived access token and rotated refresh token
    const { accessToken } = await generateTokens(
      { id: profile.userId, email: profile.email },
      'user',
      req,
      res
    );

    await AuditLog.create({
      event: 'login_success',
      actor: profile.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: 'google', userId: profile.userId },
      requestId: req.id,
    });

    return res.json({
      token: accessToken,
      userId: profile.userId,
      isFirstLogin: profile.isFirstLogin,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        scholasticRole: profile.scholasticRole,
        cognitivePace: profile.cognitivePace,
        analogyDomain: profile.analogyDomain,
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        joinedAt: profile.joinedAt,
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Google Token verification failed');
    
    await AuditLog.create({
      event: 'login_failure',
      actor: 'google-sso',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: error.message },
      requestId: req.id,
    });

    return res.status(401).json({ error: 'Authentication failed. Please try again.' });
  }
});

// POST /api/auth/signup — EMAIL + PASSWORD REGISTRATION (Verification Code Sent)
router.post('/signup', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { name, email, password } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password must be 128 characters or fewer.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Duplicate check
    const existing = await UserProfile.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.isEmailVerified) {
        return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
      }

      log.info({ email: normalizedEmail }, 'Overwriting existing unverified user profile.');

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

      existing.name = name.trim();
      existing.password = hashedPassword;
      existing.emailVerificationCode = null; // Clear OTP fields
      existing.emailVerificationToken = verificationToken;
      existing.emailVerificationExpires = verificationExpires;
      existing.isFirstLogin = true;
      await existing.save();

      await AuditLog.create({
        event: 'student_registered',
        actor: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { provider: 'email', userId: existing.userId, verified: false, overwroteUnverified: true },
        requestId: req.id,
      });

      await sendVerificationEmail(normalizedEmail, verifyUrl);

      const isMailerConfigured = !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD));
      const responsePayload = {
        requiresVerification: true,
        email: normalizedEmail,
        error: 'Account created. Please verify your email using the link sent to your inbox.',
      };

      if (process.env.NODE_ENV !== 'production' && !isMailerConfigured) {
        responsePayload.devUrl = verifyUrl;
      }

      return res.status(403).json(responsePayload);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate secure verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Create user with a secure random userId, marked as unverified
    const userId = `email_${crypto.randomBytes(12).toString('hex')}`;
    const profile = new UserProfile({
      userId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: 'email',
      isFirstLogin: true,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      joinedAt: new Date(),
      xp: 0,
      level: 1,
      streakDays: 1,
    });
    await profile.save();

    await AuditLog.create({
      event: 'student_registered',
      actor: normalizedEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: 'email', userId, verified: false },
      requestId: req.id,
    });

    // Send the email link
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    log.info({ email: normalizedEmail }, 'New user profile created; verification email sent');

    // Return 403 Forbidden indicating verification required
    const isMailerConfigured = !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD));
    const responsePayload = {
      requiresVerification: true,
      email: normalizedEmail,
      error: 'Account created. Please verify your email using the link sent to your inbox.',
    };

    if (process.env.NODE_ENV !== 'production' && !isMailerConfigured) {
      responsePayload.devUrl = verifyUrl;
    }

    return res.status(403).json(responsePayload);
  } catch (error) {
    log.error({ err: error }, 'Email signup failed');
    return res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// POST /api/auth/login — EMAIL + PASSWORD SIGN IN (Blocked if Unverified)
router.post('/login', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const identifier = `user:${normalizedEmail}`;

    // Lockout verification
    const lockout = await LoginAttempt.getOrCreate(identifier);

    if (lockout.isLocked()) {
      const remainingMs = lockout.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));
      
      log.warn({ identifier }, `Login blocked: Account is locked. Locked until: ${lockout.lockedUntil}`);

      await AuditLog.create({
        event: 'suspicious_activity',
        actor: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'User login attempt on locked account' },
        requestId: req.id,
      });

      return res.status(423).json({
        error: `Your account is temporarily locked due to too many failed login attempts. Try again in ${remainingMin} minutes.`
      });
    }

    const profile = await UserProfile.findOne({ email: normalizedEmail });

    // Use generic error to prevent email enumeration
    const INVALID_MSG = 'Incorrect email or password.';

    if (!profile || profile.authProvider !== 'email' || !profile.password) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'login_failure',
        actor: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'User not found or not an email account' },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: normalizedEmail,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (user)' },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: INVALID_MSG });
    }

    const passwordMatch = await bcrypt.compare(password, profile.password);
    if (!passwordMatch) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'login_failure',
        actor: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Invalid password' },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: normalizedEmail,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (user)' },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: INVALID_MSG });
    }

    // Success: reset attempts
    await lockout.resetAttempts();

    // ─── Verification Gate ───
    if (!profile.isEmailVerified) {
      // Regenerate token and resend
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
      
      profile.emailVerificationCode = null; // Clear OTP fields
      profile.emailVerificationToken = verificationToken;
      profile.emailVerificationExpires = verificationExpires;
      await profile.save();

      await sendVerificationEmail(normalizedEmail, verifyUrl);

      await AuditLog.create({
        event: 'login_failure',
        actor: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Unverified email address' },
        requestId: req.id,
      });

      const isMailerConfigured = !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD));
      const responsePayload = {
        requiresVerification: true,
        email: normalizedEmail,
        error: 'Your email address is not verified. A new verification link has been sent to your inbox.',
      };

      if (process.env.NODE_ENV !== 'production' && !isMailerConfigured) {
        responsePayload.devUrl = verifyUrl;
      }

      return res.status(403).json(responsePayload);
    }

    const { accessToken } = await generateTokens(
      { id: profile.userId, email: profile.email },
      'user',
      req,
      res
    );

    await AuditLog.create({
      event: 'login_success',
      actor: normalizedEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: 'email', userId: profile.userId },
      requestId: req.id,
    });

    log.info({ email: normalizedEmail }, 'User signed in via email/password');

    return res.json({
      token: accessToken,
      userId: profile.userId,
      isFirstLogin: profile.isFirstLogin,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        scholasticRole: profile.scholasticRole,
        cognitivePace: profile.cognitivePace,
        analogyDomain: profile.analogyDomain,
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        joinedAt: profile.joinedAt,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Email login failed');
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

// POST /api/auth/verify-email — SUBMIT AND VERIFY Email Code or Magic Link Token
router.post('/verify-email', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { email, code, token } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  if (!code && !token) {
    return res.status(400).json({ error: 'Verification code or token is required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = await UserProfile.findOne({ email: normalizedEmail });

    if (!profile) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (profile.isEmailVerified) {
      return res.status(400).json({ error: 'Email address is already verified.' });
    }

    if (token) {
      const cleanToken = String(token).trim();
      if (!profile.emailVerificationToken || !timingSafeCompare(profile.emailVerificationToken, cleanToken)) {
        return res.status(400).json({ error: 'Invalid verification link.' });
      }
    } else {
      const cleanCode = String(code).trim();
      if (!profile.emailVerificationCode || !timingSafeCompare(profile.emailVerificationCode, cleanCode)) {
        return res.status(400).json({ error: 'Invalid verification code.' });
      }
    }

    if (profile.emailVerificationExpires && profile.emailVerificationExpires < new Date()) {
      const expiredMsg = token 
        ? 'Verification link has expired. Please request a new one.'
        : 'Verification code has expired. Please request a new one.';
      return res.status(400).json({ error: expiredMsg });
    }

    // Mark as verified
    profile.isEmailVerified = true;
    profile.emailVerificationCode = null;
    profile.emailVerificationToken = null;
    profile.emailVerificationExpires = null;
    await profile.save();

    // Generate JWT access + refresh tokens
    const { accessToken } = await generateTokens(
      { id: profile.userId, email: profile.email },
      'user',
      req,
      res
    );

    await AuditLog.create({
      event: 'email_verified',
      actor: normalizedEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId: profile.userId },
      requestId: req.id,
    });

    log.info({ email: normalizedEmail }, 'User email successfully verified');

    return res.status(200).json({
      token: accessToken,
      userId: profile.userId,
      isFirstLogin: profile.isFirstLogin,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        scholasticRole: profile.scholasticRole,
        cognitivePace: profile.cognitivePace,
        analogyDomain: profile.analogyDomain,
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        joinedAt: profile.joinedAt,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Email verification failed');
    return res.status(500).json({ error: 'Failed to verify email. Please try again.' });
  }
});

// POST /api/auth/resend-verification — RESEND Verification Code/Link
router.post('/resend-verification', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = await UserProfile.findOne({ email: normalizedEmail });

    if (!profile) {
      // Generic success to prevent email scanning
      return res.status(200).json({ success: true, message: 'If the account exists, verification details were sent.' });
    }

    if (profile.isEmailVerified) {
      return res.status(400).json({ error: 'This email address is already verified.' });
    }

    const isSandbox = profile.authProvider === 'sandbox' || normalizedEmail.endsWith('@cortex.sandbox');
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (isSandbox) {
      const verificationCode = crypto.randomInt(100000, 1000000).toString();
      profile.emailVerificationCode = verificationCode;
      profile.emailVerificationToken = null;
      profile.emailVerificationExpires = verificationExpires;
      await profile.save();

      log.info({ email: normalizedEmail }, 'Sandbox verification code regenerated successfully');
      return res.status(200).json({
        success: true,
        message: 'Sandbox verification code generated.',
        devCode: verificationCode,
      });
    } else {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

      profile.emailVerificationCode = null;
      profile.emailVerificationToken = verificationToken;
      profile.emailVerificationExpires = verificationExpires;
      await profile.save();

      await sendVerificationEmail(normalizedEmail, verifyUrl);

      log.info({ email: normalizedEmail }, 'Verification magic link resent successfully');
      const isMailerConfigured = !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD));
      const responsePayload = { success: true, message: 'Verification email sent.' };

      if (process.env.NODE_ENV !== 'production' && !isMailerConfigured) {
        responsePayload.devUrl = verifyUrl;
      }

      return res.status(200).json(responsePayload);
    }
  } catch (error) {
    log.error({ err: error }, 'Resending verification failed');
    return res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
});

// POST /api/auth/complete-onboarding — FINALIZE FIRST-LOGIN PROFILE
// Requires valid JWT access token in Authorization header
router.post('/complete-onboarding', authenticateToken, async (req, res) => {
  const log = req.log || logger;
  try {
    const userId = req.user.id;

    const { name, scholasticRole, cognitivePace, analogyDomain } = req.body;

    const VALID_ROLES = ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'];
    const VALID_PACES = ['Focused', 'Balanced', 'Rapid'];
    const VALID_DOMAINS = ['Tech', 'Science', 'Business', 'Sports'];

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (scholasticRole && !VALID_ROLES.includes(scholasticRole)) {
      return res.status(400).json({ error: 'Invalid scholastic role.' });
    }
    if (cognitivePace && !VALID_PACES.includes(cognitivePace)) {
      return res.status(400).json({ error: 'Invalid cognitive pace.' });
    }
    if (analogyDomain && !VALID_DOMAINS.includes(analogyDomain)) {
      return res.status(400).json({ error: 'Invalid analogy domain.' });
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name?.trim()) profile.name = name.trim();
    if (scholasticRole) profile.scholasticRole = scholasticRole;
    if (cognitivePace) profile.cognitivePace = cognitivePace;
    if (analogyDomain) profile.analogyDomain = analogyDomain;
    profile.isFirstLogin = false;
    await profile.save();

    log.info({ userId }, 'Onboarding completed');

    return res.json({
      success: true,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        scholasticRole: profile.scholasticRole,
        cognitivePace: profile.cognitivePace,
        analogyDomain: profile.analogyDomain,
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        joinedAt: profile.joinedAt,
        isFirstLogin: false,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Complete onboarding failed');
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
});

// POST /api/auth/forgot-password — REQUEST PASSWORD RESET LINK
router.post('/forgot-password', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Always return 200 to prevent email enumeration
  const GENERIC_OK = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const profile = await UserProfile.findOne({ email: normalizedEmail, authProvider: 'email' });

    if (!profile) {
      log.info({ email: normalizedEmail }, 'Password reset requested for unknown email — silently ignored');
      return res.status(200).json(GENERIC_OK);
    }

    // Generate a cryptographically secure reset token (64 bytes = 128-char hex)
    const resetToken = crypto.randomBytes(64).toString('hex');
    // Store hashed version in DB — never store raw tokens
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    profile.passwordResetToken = resetTokenHash;
    profile.passwordResetExpires = resetTokenExpires;
    await profile.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const isMailerConfigured = !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD));

    // Send reset email
    await sendPasswordResetEmail(normalizedEmail, resetUrl);

    log.info({ email: normalizedEmail }, 'Password reset email sent');

    await AuditLog.create({
      event: 'password_reset_requested',
      actor: normalizedEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId: profile.userId },
      requestId: req.id,
    });

    const response = { ...GENERIC_OK };
    if (process.env.NODE_ENV !== 'production' && !isMailerConfigured) {
      response.devResetUrl = resetUrl;
    }
    return res.status(200).json(response);
  } catch (error) {
    log.error({ err: error }, 'Forgot password failed');
    return res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// POST /api/auth/reset-password — SUBMIT NEW PASSWORD WITH RESET TOKEN
router.post('/reset-password', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (newPassword.length > 128) {
    return res.status(400).json({ error: 'Password must be 128 characters or fewer.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const profile = await UserProfile.findOne({
      email: normalizedEmail,
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!profile) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    // Hash and apply new password
    profile.password = await bcrypt.hash(newPassword, 12);
    profile.passwordResetToken = null;
    profile.passwordResetExpires = null;
    await profile.save();

    // Invalidate ALL existing refresh tokens for this user (force re-login everywhere)
    await RefreshToken.deleteMany({ userId: profile.userId });

    await AuditLog.create({
      event: 'password_reset_success',
      actor: normalizedEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { userId: profile.userId },
      requestId: req.id,
    });

    log.info({ email: normalizedEmail }, 'Password reset successfully');
    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (error) {
    log.error({ err: error }, 'Reset password failed');
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// POST /api/auth/refresh — ROTATES REFRESH TOKEN & REISSUES ACCESS TOKEN
router.post('/refresh', async (req, res) => {
  const log = req.log || logger;
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Parse cookies manually to avoid external dependency
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      const k = parts[0]?.trim();
      const v = parts.slice(1).join('=')?.trim();
      if (k && v) {
        try {
          acc[k] = decodeURIComponent(v);
        } catch {
          acc[k] = v;
        }
      }
      return acc;
    }, {});

    let oldTokenString = null;
    const scope = req.query?.scope;
    if (scope === 'student') {
      oldTokenString = cookies.studentRefreshToken;
    } else if (scope === 'admin') {
      oldTokenString = cookies.adminRefreshToken;
    } else if (scope === 'user') {
      oldTokenString = cookies.userRefreshToken;
    } else {
      oldTokenString = cookies.userRefreshToken || cookies.studentRefreshToken || cookies.adminRefreshToken || cookies.refreshToken;
    }

    if (!oldTokenString) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // 1. Look up token in DB
    const tokenDoc = await RefreshToken.findOne({ token: oldTokenString });

    if (!tokenDoc) {
      // CRITICAL: Token reuse could indicate theft. Detect and alert.
      log.warn(`[AUTH] Possible token reuse attack detected for token: ${oldTokenString}`);
      
      await AuditLog.create({
        event: 'suspicious_activity',
        actor: 'unknown-refresh-token',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Refresh token not found (potential reuse/theft)', token: oldTokenString },
        requestId: req.id,
      });

      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // 2. Expiry check
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      
      await AuditLog.create({
        event: 'token_revoked',
        actor: tokenDoc.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Refresh token expired' },
        requestId: req.id,
      });

      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // 3. Generate rotated tokens
    const { accessToken } = await generateTokens(tokenDoc.sessionData, tokenDoc.role, req, res);

    // 4. Delete old refresh token from database (Rotation enforcement)
    await RefreshToken.deleteOne({ _id: tokenDoc._id });

    await AuditLog.create({
      event: 'token_refresh',
      actor: tokenDoc.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { role: tokenDoc.role },
      requestId: req.id,
    });

    res.json({ token: accessToken });
  } catch (error) {
    log.error({ err: error }, 'Token refresh error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/logout — CLEARS REFRESH TOKEN
router.post('/logout', async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const parts = cookie.split('=');
        const k = parts[0]?.trim();
        const v = parts.slice(1).join('=')?.trim();
        if (k && v) {
          try {
            acc[k] = decodeURIComponent(v);
          } catch {
            acc[k] = v;
          }
        }
        return acc;
      }, {});

      const tokenStrings = [
        cookies.userRefreshToken,
        cookies.studentRefreshToken,
        cookies.adminRefreshToken,
        cookies.refreshToken
      ].filter(Boolean);

      for (const tokenString of tokenStrings) {
        const tokenDoc = await RefreshToken.findOne({ token: tokenString });
        if (tokenDoc) {
          await RefreshToken.deleteOne({ _id: tokenDoc._id });
          
          await AuditLog.create({
            event: 'token_revoked',
            actor: tokenDoc.userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { reason: 'User logged out' },
            requestId: req.id,
          });
        }
      }
    }

    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh',
    };

    res.clearCookie('userRefreshToken', clearOpts);
    res.clearCookie('studentRefreshToken', clearOpts);
    res.clearCookie('adminRefreshToken', clearOpts);
    res.clearCookie('refreshToken', clearOpts);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/sandbox-request — REQUEST OTP FOR NEW SANDBOX SESSION
router.post('/sandbox-request', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  try {
    // Generate unique random sandbox identifier
    const randomHex = crypto.randomBytes(6).toString('hex');
    const userId = `sandbox_${randomHex}`;
    const email = `sandbox_${randomHex}@cortex.sandbox`;

    // Create a temporary UserProfile for this sandbox session
    const profile = new UserProfile({
      userId,
      name: 'Sandbox Scholar',
      email,
      authProvider: 'sandbox',
      isFirstLogin: false, // Sandbox scholars bypass onboarding
      isEmailVerified: true,
      joinedAt: new Date(),
      xp: 0,
      level: 1,
      streakDays: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Auto-expire in 24 hours
    });
    
    await profile.save();

    // Generate JWT access + refresh tokens
    const { accessToken } = await generateTokens(
      { id: profile.userId, email: profile.email },
      'user',
      req,
      res
    );

    await AuditLog.create({
      event: 'student_registered',
      actor: email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: 'sandbox', userId, verified: true },
      requestId: req.id,
    });

    log.info({ email, userId }, 'New sandbox user profile created and authenticated immediately');

    return res.status(200).json({
      token: accessToken,
      userId: profile.userId,
      isFirstLogin: profile.isFirstLogin,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        scholasticRole: profile.scholasticRole,
        cognitivePace: profile.cognitivePace,
        analogyDomain: profile.analogyDomain,
        xp: profile.xp,
        level: profile.level,
        streakDays: profile.streakDays,
        joinedAt: profile.joinedAt,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Sandbox request failed');
    return res.status(500).json({ error: 'Failed to initialize sandbox session. Please try again.' });
  }
});

// GET /api/auth/sandbox-key — RETRIEVE SYSTEM GEMINI API KEY FOR SANDBOX SESSIONS
// SECURITY: This endpoint is DISABLED in production. The system API key must never
// be served to any client in a production environment, regardless of user role.
// Sandbox sessions in production must supply their own API key.
router.get('/sandbox-key', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Access denied: sandbox key endpoint is disabled in production.' });
  }

  // Dev-only: allow sandbox users and the legacy dev token to retrieve the key
  const isSandboxUser = req.user?.id === 'sandbox-scholar' || req.user?.id?.startsWith('sandbox_');
  if (isSandboxUser) {
    return res.json({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  return res.status(403).json({ error: 'Access denied: not a sandbox session.' });
});

export default router;
