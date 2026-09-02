import express from 'express';
import EpisodicMemory from '../models/EpisodicMemory.js';
import { authenticateToken } from '../middleware/auth.js';
import { saveEpisodicMemory, recallEpisodicMemories } from '../services/episodicMemoryService.js';

const router = express.Router();

// Apply auth middleware to all memory endpoints
router.use(authenticateToken);

/**
 * GET /api/memory — Fetch vector-backed episodic memories for current user
 */
router.get('/', async (req, res) => {
  try {
    const { query, category, limit } = req.query;
    const userId = req.user.id;

    if (query) {
      const memories = await recallEpisodicMemories({
        userId,
        queryText: String(query),
        topK: limit ? parseInt(limit, 10) : 10,
        req,
      });
      return res.json({ memories });
    }

    const filter = { userId };
    if (category) filter.category = category;

    const memories = await EpisodicMemory.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 50)
      .lean();

    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/memory — Create a new episodic memory item
 */
router.post('/', async (req, res) => {
  try {
    const { content, category, metadata } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content string is required.' });
    }

    const memory = await saveEpisodicMemory({
      userId: req.user.id,
      content,
      category: category || 'preference',
      metadata: metadata || {},
      req,
    });

    res.status(201).json({ success: true, memory });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/memory/:id — Delete a specific memory item (Owner Lock enforced)
 */
router.delete('/:id', async (req, res) => {
  try {
    const memory = await EpisodicMemory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory item not found.' });
    }

    if (memory.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this memory item.' });
    }

    await EpisodicMemory.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Memory item deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
