import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import University from '../models/University.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = express.Router();

// POST /api/admin/login
// Validates universityId + passcode, returns a short-lived admin JWT.
router.post('/login', async (req, res) => {
  try {
    const { universityId, passcode } = req.body;

    if (!universityId || !passcode) {
      return res.status(400).json({ error: 'universityId and passcode are required.' });
    }

    const university = await University.findOne({ universityId: universityId.toLowerCase().trim() });
    if (!university) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(passcode, university.passcodeHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        role: 'admin',
        universityId: university.universityId,
        universityName: university.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      token,
      universityName: university.name,
      universityId: university.universityId,
    });
  } catch (error) {
    console.error('❌ POST /api/admin/login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/me
// Verifies the admin token and returns university info. Used by frontend to check auth state.
router.get('/me', requireAdminAuth, async (req, res) => {
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
    console.error('❌ GET /api/admin/me error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/update-key
// Saves or updates the university's Gemini API key. Key is stored server-side only.
router.put('/update-key', requireAdminAuth, async (req, res) => {
  try {
    const { geminiApiKey } = req.body;

    if (!geminiApiKey || geminiApiKey.trim().length < 10) {
      return res.status(400).json({ error: 'A valid Gemini API Key is required.' });
    }

    const university = await University.findOneAndUpdate(
      { universityId: req.universityId },
      { geminiApiKey: geminiApiKey.trim() },
      { new: true }
    );

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    console.log(`[AdminRoute] Gemini API key updated for university: ${req.universityId}`);
    res.status(200).json({ success: true, message: 'Gemini API Key saved successfully.' });
  } catch (error) {
    console.error('❌ PUT /api/admin/update-key error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
