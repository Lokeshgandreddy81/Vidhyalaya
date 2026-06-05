import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import University from '../models/University.js';
import LoginAttempt from '../models/LoginAttempt.js';
import AuditLog from '../models/AuditLog.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { generateTokens } from '../utils/authHelper.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Input length limits to prevent abuse
const MAX_FIELD_LENGTH = 128;

function sanitizeInput(val) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, MAX_FIELD_LENGTH);
}

// POST /api/students/register — RATE LIMITED
router.post('/register', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  try {
    const { rollNumber, universityId, name, branch, semester, passcode } = req.body;

    if (!rollNumber || !universityId || !name || !branch || !semester || !passcode) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate passcode length
    if (typeof passcode !== 'string' || passcode.length < 4 || passcode.length > 64) {
      return res.status(400).json({ error: 'Passcode must be between 4 and 64 characters.' });
    }

    const cleanRoll = sanitizeInput(rollNumber);
    const cleanUniId = sanitizeInput(universityId).toLowerCase();
    const cleanName = sanitizeInput(name);
    const cleanBranch = sanitizeInput(branch).toLowerCase();

    // Validate university exists
    const university = await University.findOne({ universityId: cleanUniId });
    if (!university) {
      return res.status(404).json({ error: 'University not found. Please check your University ID.' });
    }

    // Check for duplicate roll number within same university
    const existing = await Student.findOne({ rollNumber: cleanRoll, universityId: cleanUniId });
    if (existing) {
      return res.status(409).json({ error: 'A student with this Roll Number is already registered at this university.' });
    }

    const passcodeHash = await bcrypt.hash(passcode, 12); // 12 rounds (up from 10)

    const student = new Student({
      rollNumber: cleanRoll,
      universityId: cleanUniId,
      name: cleanName,
      branch: cleanBranch,
      semester,
      passcodeHash,
    });

    await student.save();

    await AuditLog.create({
      event: 'student_registered',
      actor: cleanRoll,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { universityId: cleanUniId, branch: student.branch, semester: student.semester },
      requestId: req.id,
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      student: { rollNumber: student.rollNumber, name: student.name, branch: student.branch, semester: student.semester },
    });
  } catch (error) {
    log.error({ err: error }, 'Student registration error');
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This Roll Number is already registered at this university.' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/students/login — RATE LIMITED with Lockout Enforcement
router.post('/login', authRateLimiter, async (req, res) => {
  const log = req.log || logger;
  try {
    const { rollNumber, universityId, passcode } = req.body;

    if (!rollNumber || !universityId || !passcode) {
      return res.status(400).json({ error: 'rollNumber, universityId and passcode are required.' });
    }

    const cleanRoll = sanitizeInput(rollNumber);
    const cleanUniId = sanitizeInput(universityId).toLowerCase();
    const identifier = `student:${cleanRoll}:${cleanUniId}`;

    // 1. Lockout verification
    const lockout = await LoginAttempt.getOrCreate(identifier);

    if (lockout.isLocked()) {
      const remainingMs = lockout.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));
      
      log.warn({ identifier }, `Login blocked: Account is locked. Locked until: ${lockout.lockedUntil}`);

      await AuditLog.create({
        event: 'suspicious_activity',
        actor: cleanRoll,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Student login attempt on locked account', universityId: cleanUniId },
        requestId: req.id,
      });

      return res.status(423).json({
        error: `Account is temporarily locked due to too many failed attempts. Try again in ${remainingMin} minutes.`
      });
    }

    const student = await Student.findOne({
      rollNumber: cleanRoll,
      universityId: cleanUniId,
    });

    if (!student) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'student_login_failure',
        actor: cleanRoll,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Student not found', universityId: cleanUniId },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: cleanRoll,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (student)', universityId: cleanUniId },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(passcode, student.passcodeHash);
    if (!isValid) {
      await lockout.recordFailure();

      await AuditLog.create({
        event: 'student_login_failure',
        actor: cleanRoll,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Incorrect passcode', universityId: cleanUniId },
        requestId: req.id,
      });

      if (lockout.isLocked()) {
        await AuditLog.create({
          event: 'account_locked',
          actor: cleanRoll,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'Max login failures reached (student)', universityId: cleanUniId },
          requestId: req.id,
        });
      }

      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Success: reset attempts
    await lockout.resetAttempts();

    // Issue shortened 15m access token & rotated refresh token
    const { accessToken } = await generateTokens(
      {
        studentId: student._id,
        rollNumber: student.rollNumber,
        universityId: student.universityId,
        branch: student.branch,
        semester: student.semester,
        name: student.name,
      },
      'student',
      req,
      res
    );

    await AuditLog.create({
      event: 'student_login_success',
      actor: student.rollNumber,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { universityId: student.universityId },
      requestId: req.id,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
        branch: student.branch,
        semester: student.semester,
        universityId: student.universityId,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Student login error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/students/me — verify student token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json({
      success: true,
      student: {
        rollNumber: decoded.rollNumber,
        name: decoded.name,
        branch: decoded.branch,
        semester: decoded.semester,
        universityId: decoded.universityId,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
