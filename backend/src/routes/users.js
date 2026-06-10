import express from 'express';
import UserProfile from '../models/UserProfile.js';
import UserLearningState from '../models/UserLearningState.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// GET user learning state
router.get('/state/get', async (req, res) => {
  try {
    let state = await UserLearningState.findOne({ userId: req.user.id });
    if (!state) {
      const stateData = { userId: req.user.id };
      if (req.user.id.startsWith('sandbox_')) {
        stateData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      state = new UserLearningState(stateData);
      await state.save();
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update user learning state
router.put('/state/update', async (req, res) => {
  try {
    const { skills, memory, activeMission, activeScenario, byokConfig, byokMode, isFirstLogin } = req.body;
    const updateData = {};
    if (skills !== undefined) updateData.skills = skills;
    if (memory !== undefined) updateData.memory = memory;
    if (activeMission !== undefined) updateData.activeMission = activeMission;
    if (activeScenario !== undefined) updateData.activeScenario = activeScenario;
    if (byokConfig !== undefined) updateData.byokConfig = byokConfig;
    if (byokMode !== undefined) updateData.byokMode = byokMode;
    if (isFirstLogin !== undefined) updateData.isFirstLogin = isFirstLogin;

    if (req.user.id.startsWith('sandbox_')) {
      updateData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const updated = await UserLearningState.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateData },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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
    // Prevent mass assignment vulnerability by picking only allowed fields
    const { name, email } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

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
