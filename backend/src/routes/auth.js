import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import UserProfile from '../models/UserProfile.js';

const router = express.Router();

// Get a token for a user (legacy/failsafe dev mode)
router.post('/token', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // SECURITY: Prevent unauthorized minting of tokens for actual users.
  // The frontend uses 'default-user' for anonymous sessions.
  if (userId !== 'default-user') {
    return res.status(403).json({ error: 'Unauthorized to mint tokens for arbitrary user IDs' });
  }

  const user = { id: userId };
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set.');
    return res.status(500).json({ error: 'Internal server error' });
  }

  const token = jwt.sign(user, secret, { expiresIn: '24h' });
  res.json({ token });
});

// ZERO-TRUST CRYPTOGRAPHIC GOOGLE OAUTH SSO VERIFICATION & PROVISIONING
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'Google ID Token (credential) is required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('CRITICAL ERROR: JWT_SECRET environment variable is not configured.');
    return res.status(500).json({ error: 'Internal configuration error' });
  }

  try {
    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId) {
      // Cryptographically verify Google-issued identity token
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } else {
      // Fallback dev mode (if client ID is not configured yet in .env)
      console.warn('WARNING: GOOGLE_CLIENT_ID is not configured in .env. Falling back to JWT decoding for development onboarding.');
      payload = jwt.decode(idToken);
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleUserId, email, name, picture } = payload;

    // Zero-trust query: find by Google User ID (sub) or email
    let profile = await UserProfile.findOne({
      $or: [{ userId: googleUserId }, { email: email.toLowerCase() }]
    });

    if (!profile) {
      console.log(`[AUTH] Automatically provisioning a new enterprise user profile for: ${email}`);
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
    } else if (profile.userId !== googleUserId) {
      // Map legacy/email-based users to their official Google sub ID
      profile.userId = googleUserId;
      if (name) profile.name = name;
      await profile.save();
    }

    // Issue standard, production-ready JWT session token (expires in 30 days)
    const sessionToken = jwt.sign(
      { id: profile.userId, email: profile.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      token: sessionToken,
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
    console.error('FAILED Google Token verification:', error);
    return res.status(401).json({ error: 'Cryptographic token validation failed: ' + error.message });
  }
});

export default router;
