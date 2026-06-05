import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import University from '../models/University.js';
import LoginAttempt from '../models/LoginAttempt.js';
import AuditLog from '../models/AuditLog.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { generateTokens } from '../utils/authHelper.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/admin/login — RATE LIMITED with Lockout Enforcement
router.post('/login', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  try {
    const { universityId, passcode } = req.body;

    if (!universityId || !passcode) {
      return res.status(400).json({ error: 'universityId and passcode are required.' });
    }

    if (typeof universityId !== 'string' || typeof passcode !== 'string') {
      return res.status(400).json({ error: 'Invalid input types.' });
    }

    const cleanUniId = universityId.toLowerCase().trim().slice(0, 128);
    const identifier = `admin:${cleanUniId}`;

    // 1. Lockout verification
    const lockout = await LoginAttempt.getOrCreate(identifier);

    if (lockout.isLocked()) {
      const remainingMs = lockout.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));
      
      log.warn({ identifier }, `Admin login blocked: Account is locked. Locked until: ${lockout.lockedUntil}`);

      await AuditLog.create({
        event: 'suspicious_activity',
        actor: `admin:${cleanUniId}`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Admin login attempt on locked account' },
        requestId: req.id,
      });

      return res.status(423).json({
        error: `Admin account is temporarily locked due to too many failed attempts. Try again in ${remainingMin} minutes.`
      });
    }

    const university = await University.findOne({ universityId: cleanUniId });
    if (!university) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'admin_login_failure',
        actor: `admin:${cleanUniId}`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'University not found' },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: `admin:${cleanUniId}`,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (admin)' },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(passcode, university.passcodeHash);
    if (!isValid) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'admin_login_failure',
        actor: `admin:${cleanUniId}`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Incorrect passcode' },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: `admin:${cleanUniId}`,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (admin)' },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Success: reset attempts
    await lockout.resetAttempts();

    // Issue shortened 1h access token & rotated refresh token for admin
    const { accessToken } = await generateTokens(
      {
        universityId: university.universityId,
        universityName: university.name,
      },
      'admin',
      req,
      res
    );

    await AuditLog.create({
      event: 'admin_login_success',
      actor: `admin:${university.universityId}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { universityId: university.universityId },
      requestId: req.id,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      universityName: university.name,
      universityId: university.universityId,
    });
  } catch (error) {
    log.error({ err: error }, 'Admin login error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/me
router.get('/me', requireAdminAuth, async (req, res) => {
  const log = req.log || logger;
  try {
    const university = await University.findOne({ universityId: req.universityId }).select('-passcodeHash');
    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }
    res.status(200).json({
      success: true,
      universityId: university.universityId,
      universityName: university.name,
      hasApiKey: !!university.geminiApiKey,
    });
  } catch (error) {
    log.error({ err: error }, 'GET /me error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/update-key
router.put('/update-key', requireAdminAuth, async (req, res) => {
  const log = req.log || logger;
  try {
    const { geminiApiKey } = req.body;

    if (!geminiApiKey || typeof geminiApiKey !== 'string' || geminiApiKey.trim().length < 10) {
      return res.status(400).json({ error: 'A valid Gemini API Key is required.' });
    }

    // Limit key length to prevent payload abuse
    if (geminiApiKey.length > 256) {
      return res.status(400).json({ error: 'API key is too long.' });
    }

    // Must query and use save() to trigger the transparent encryption getter/setter
    const university = await University.findOne({ universityId: req.universityId });

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    university.geminiApiKey = geminiApiKey.trim();
    await university.save();

    await AuditLog.create({
      event: 'api_key_updated',
      actor: `admin:${req.universityId}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { universityId: req.universityId },
      requestId: req.id,
    });

    log.info({ universityId: req.universityId }, `Gemini API key updated and encrypted for: ${req.universityId}`);
    res.status(200).json({ success: true, message: 'Gemini API Key saved and encrypted successfully.' });
  } catch (error) {
    log.error({ err: error }, 'PUT /update-key error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
