import express from 'express';
import UserProfile from '../models/UserProfile.js';

const router = express.Router();

// GET user profile
router.get('/:userId', async (req, res) => {
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
  try {
    const {
      name,
      email,
      xp,
      level,
      streakDays,
      achievements
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (xp !== undefined) updateData.xp = xp;
    if (level !== undefined) updateData.level = level;
    if (streakDays !== undefined) updateData.streakDays = streakDays;
    if (achievements !== undefined) updateData.achievements = achievements;

    const updated = await UserProfile.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
