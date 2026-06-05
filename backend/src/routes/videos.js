import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  sanitizeVideoId,
  verifyVideoIds,
  getVideoChapters,
} from '../services/youtubeService.js';

const router = express.Router();

// ── ROUTE: POST /api/videos/verify ──────────────────────────────────────────

router.post('/verify', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }

    const sanitized = ids.map(sanitizeVideoId).filter(Boolean).slice(0, 12);
    const results = await verifyVideoIds(sanitized);
    const embeddable = results.filter(r => r.embeddable);
    console.log(`[verify] ${embeddable.length}/${sanitized.length} embeddable`);
    res.json({ videos: embeddable });
  } catch (err) {
    console.error('[verify] error:', err);
    res.status(500).json({ error: 'Failed to verify videos' });
  }
});

// ── ROUTE: GET /api/videos/chapters/:videoId ─────────────────────────────────

router.get('/chapters/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { chapters, videoTitle } = await getVideoChapters(videoId);
  res.json({ chapters, videoTitle });
});

// ── ROUTE: POST /api/videos/match-chapters ───────────────────────────────────

router.post('/match-chapters', async (req, res) => {
  try {
    const { sections, videoIds } = req.body;
    if (!Array.isArray(sections) || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'sections and videoIds arrays required' });
    }

    const videoChapterData = await Promise.all(
      videoIds.map(async (rawId) => {
        const videoId = sanitizeVideoId(rawId);
        const { chapters, videoTitle, author } = await getVideoChapters(videoId);
        return { videoId, chapters, videoTitle, author };
      })
    );

    const processedVideos = videoChapterData.map(v => {
      let channelLabel = 'Alt';
      const searchPool = `${v.author} ${v.videoTitle}`.toLowerCase();
      if (searchPool.includes('freecodecamp')) channelLabel = 'fCC';
      else if (searchPool.includes('mosh')) channelLabel = 'Mosh';
      else if (searchPool.includes('fireship')) channelLabel = 'Fireship';
      else if (searchPool.includes('traversy')) channelLabel = 'Traversy';
      else if (searchPool.includes('simplified')) channelLabel = 'WDS';
      else if (searchPool.includes('academind')) channelLabel = 'Academind';
      else if (v.author) channelLabel = v.author.split(' ')[0];

      const processedChapters = v.chapters.map(ch => {
        const chLower = ch.title.toLowerCase();
        const chapterWords = chLower.split(/\s+/).filter(w => w.length > 2);
        return { ...ch, chLower, chapterWords, chapterWordsSet: new Set(chapterWords) };
      });

      return { ...v, channelLabel, processedChapters, durationSecs: v.chapters.at(-1)?.endSecs || 0 };
    });

    const sectionClips = sections.map((section, sectionIdx) => {
      const sectionLower = section.toLowerCase();
      const sectionWords = sectionLower.split(/\s+/).filter(w => w.length > 2);
      const clips = [];

      for (const { videoId, channelLabel, processedChapters } of processedVideos) {
        if (processedChapters.length === 0) continue;

        let bestScore = -1;
        let bestChapter = null;

        for (const ch of processedChapters) {
          let score = 0;
          if (ch.chLower.includes(sectionLower)) score += 10;
          for (const sw of sectionWords) {
            if (ch.chLower.includes(sw)) {
              score += 3;
              for (const cw of ch.chapterWords) {
                if (cw === sw) score += 2;
                else if (cw.includes(sw) || sw.includes(cw)) score += 1;
              }
            } else {
              for (const cw of ch.chapterWords) {
                if (sw.includes(cw)) score += 1;
              }
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestChapter = ch;
          }
        }

        if (bestChapter && bestScore >= 2) {
          clips.push({
            videoId,
            videoTitle: channelLabel,
            chapterTitle: bestChapter.title,
            timestamp: bestChapter.startSecs,
            endTimestamp: bestChapter.endSecs,
            confidence: Math.min(bestScore / 15, 1.0),
          });
        }
      }

      // Fallback: evenly distribute across primary video when no chapter match
      if (clips.length === 0 && processedVideos.length > 0) {
        const primary = processedVideos[0];
        const duration = primary.durationSecs || 600;
        const slotCount = Math.max(sections.length, 1);
        const timestamp = Math.floor((sectionIdx / slotCount) * duration * 0.85);
        clips.push({
          videoId: primary.videoId,
          videoTitle: primary.channelLabel,
          chapterTitle: section,
          timestamp,
          endTimestamp: Math.min(timestamp + 120, duration),
          confidence: 0.35,
        });
      }

      return { section, clips: clips.sort((a, b) => b.confidence - a.confidence) };
    });

    res.json({ sectionClips });
  } catch (err) {
    console.error('[match-chapters] error:', err);
    res.status(500).json({ error: 'Failed to match chapters' });
  }
});

export default router;
