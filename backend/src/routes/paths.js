import express from 'express';
import LearningPath from '../models/LearningPath.js';

const router = express.Router();

// GET all paths for a user
router.get('/user/:userId', async (req, res) => {
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
    res.json(path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new path
router.post('/', async (req, res) => {
  try {
    const { userId, ...pathData } = req.body;
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
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Path not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE path
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await LearningPath.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Path not found' });
    res.json({ message: 'Path deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
