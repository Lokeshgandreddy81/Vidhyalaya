import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Get a token for a user
router.post('/token', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // In a real app, you would verify credentials here.
  // For this security fix context, we are just issuing a token for the given userId.
  const user = { id: userId };

  // Use a secret from env, or fallback to a default for development
  const secret = process.env.JWT_SECRET || 'your-256-bit-secret';

  const token = jwt.sign(user, secret, { expiresIn: '24h' });

  res.json({ token });
});

export default router;
