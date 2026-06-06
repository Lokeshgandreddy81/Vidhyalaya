import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import UserProfile from '../models/UserProfile.js';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { generateTokens } from '../utils/authHelper.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get a token for a user (dev mode only, rate-limited)
router.post('/token', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Access denied: dev utility only' });
  }

  const { userId } = req.body;
  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return res.status(400).json({ error: 'Valid userId is required (string, max 128 chars)' });
  }

  if (userId !== 'default-user') {
    log.warn(`[AUTH] Attempted to use dev token endpoint with unauthorized userId: ${userId}`);
    return res.status(403).json({ error: 'Unauthorized: dev token endpoint restricted to default-user' });
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
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
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
      const [k, v] = cookie.trim().split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});

    const oldTokenString = cookies.refreshToken;
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
        const [k, v] = cookie.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const tokenString = cookies.refreshToken;
      if (tokenString) {
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

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
