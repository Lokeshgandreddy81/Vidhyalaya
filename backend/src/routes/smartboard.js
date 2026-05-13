import express from 'express';
import { getPerfectVideo } from '../services/videoCurationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// POST /api/smartboard/curate
// Body: { contextText: string }
router.post('/curate', async (req, res) => {
  try {
    const { contextText } = req.body;
    
    if (!contextText) {
      return res.status(400).json({ error: 'Missing contextText in request body' });
    }

    const curationResult = await getPerfectVideo(contextText);
    
    res.json(curationResult);
  } catch (error) {
    console.error('Smartboard curate route error:', error);
    res.status(500).json({ error: 'Failed to curate video' });
  }
});

export default router;
