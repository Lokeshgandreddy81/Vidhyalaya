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
    const updated = await LearningPath.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
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
    console.error('Error deleting learning path:', error);
    res.status(500).json({ error: 'Failed to delete learning path' });
  }
});

export default router;
