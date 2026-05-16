import express from 'express';
import LearningPath from '../models/LearningPath.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// GET all paths for a user
router.get('/user/:userId', async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized access to user paths' });
  }
  try {
    const paths = await LearningPath.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(paths);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single path
router.get('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this path' });
    }
    res.json(path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new path
router.post('/', async (req, res) => {
  try {
    const { userId, ...pathData } = req.body;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot create path for another user' });
    }
    const newPath = new LearningPath({ ...pathData, userId });
    await newPath.save();
    res.status(201).json(newPath);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update path
router.put('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this path' });
    }

    // Prevent mass assignment vulnerability by picking only allowed fields
    const {
      title,
      goal,
      expectedOutcome,
      targetDate,
      dailyCommitmentMinutes,
      preferredStartTime,
      phases,
      sessions,
      status,
      progress
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (goal !== undefined) updateData.goal = goal;
    if (expectedOutcome !== undefined) updateData.expectedOutcome = expectedOutcome;
    if (targetDate !== undefined) updateData.targetDate = targetDate;
    if (dailyCommitmentMinutes !== undefined) updateData.dailyCommitmentMinutes = dailyCommitmentMinutes;
    if (preferredStartTime !== undefined) updateData.preferredStartTime = preferredStartTime;
    if (phases !== undefined) updateData.phases = phases;
    if (sessions !== undefined) updateData.sessions = sessions;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;

    const updated = await LearningPath.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE path
router.delete('/:id', async (req, res) => {
  try {
    const path = await LearningPath.findOne({ id: req.params.id });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    if (path.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this path' });
    }

    await LearningPath.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Path deleted' });
  } catch (error) {
    console.error('Error deleting learning path:', error);
    res.status(500).json({ error: 'Failed to delete learning path' });
  }
});

export default router;
