import express from 'express';
import UserProfile from '../models/UserProfile.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// GET user profile
router.get('/:userId', async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized access to user profile' });
  }

  try {
    let profile = await UserProfile.findOne({ userId: req.params.userId });
    if (!profile) {
      // Create default profile if not exists
      profile = new UserProfile({ userId: req.params.userId });
      await profile.save();
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update user profile
router.put('/:userId', async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized to update this profile' });
  }

  try {
    const updated = await UserProfile.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
