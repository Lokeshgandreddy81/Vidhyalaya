import express from 'express';
import { searchPerfectVideos } from '../services/videoCurationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/smartboard/search
// Body: { query: string, context?: string, minRelevanceScore?: number }
router.post('/search', async (req, res) => {
  try {
    const { query, context, minRelevanceScore = 0 } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'query must be at least 2 characters', videos: [] });
    }

    const videos = await searchPerfectVideos({ query, context, minRelevanceScore });
    res.json({ query, videos });
  } catch (error) {
    console.error('Smartboard search route error:', error);
    res.status(500).json({ error: 'Failed to search for videos', videos: [] });
  }
});

export default router;
