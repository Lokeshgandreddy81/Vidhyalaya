import express from 'express';
import { scoutModuleVideos, getPerfectVideo } from '../services/videoCurationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * POST /api/smartboard/curate
 * Body: { moduleTitle, keyConcepts?, goalContext?, contextText? }
 * Returns verified, topic-ranked video playlist.
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
    });

    res.json(result);
  } catch (error) {
    console.error('Smartboard curate route error:', error);
    res.status(500).json({ error: 'Failed to curate video' });
  }
});

export default router;
