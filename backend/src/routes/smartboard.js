import express from 'express';
import { scoutModuleVideos, searchPerfectVideos } from '../services/videoCurationService.js';
import { isYouTubeApiEnabled } from '../services/youtubeDataApi.js';
import { authenticateToken } from '../middleware/auth.js';
import { resolveGeminiApiKey } from '../utils/resolveGeminiApiKey.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * POST /api/smartboard/curate
 * Body: { moduleTitle, keyConcepts?, goalContext?, contextText? }
 * Returns verified, topic-ranked video playlist (Study Session pipeline).
 */
router.post('/curate', async (req, res) => {
  try {
    const { moduleTitle, keyConcepts = [], goalContext = '', contextText = '' } = req.body;

    const title = moduleTitle || contextText?.substring(0, 80)?.replace(/[#*_`>\n]/g, ' ').trim();
    if (!title) {
      return res.status(400).json({ error: 'moduleTitle or contextText required' });
    }

    const result = await scoutModuleVideos({
      moduleTitle: title,
      keyConcepts: Array.isArray(keyConcepts) ? keyConcepts : [],
      goalContext,
      contextText,
      geminiApiKey: resolveGeminiApiKey(req),
    });

    res.json(result);
  } catch (error) {
    console.error('Smartboard curate route error:', error);
    res.status(500).json({ error: 'Failed to curate videos', videos: [] });
  }
});

// POST /api/smartboard/search
// Body: { query: string, context?: string, minRelevanceScore?: number, goalContext?: string }
router.post('/search', async (req, res) => {
  try {
    const { query, context, minRelevanceScore = 0, goalContext = '' } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'query must be at least 2 characters', videos: [] });
    }

    const result = await searchPerfectVideos({
      query,
      context,
      goalContext,
      minRelevanceScore,
      geminiApiKey: resolveGeminiApiKey(req),
    });
    // searchPerfectVideos now returns { videos, fallbackActive, fallbackReason }
    const videos = Array.isArray(result?.videos) ? result.videos : (Array.isArray(result) ? result : []);
    res.json({
      query,
      videos,
      fallbackActive: result?.fallbackActive ?? false,
      fallbackReason: result?.fallbackReason ?? null,
      youtubeApiEnabled: isYouTubeApiEnabled(),
      geminiApiEnabled: Boolean(resolveGeminiApiKey(req)),
    });
  } catch (error) {
    console.error('Smartboard search route error:', error);
    res.status(500).json({ error: 'Failed to search for videos', videos: [] });
  }
});

export default router;
