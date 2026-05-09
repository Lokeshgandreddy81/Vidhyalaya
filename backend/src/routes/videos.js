import express from 'express';

const router = express.Router();

// ── In-memory cache ──────────────────────────────────────────────────────────
const videoCache = new Map();      // embeddability
const chapterCache = new Map();    // chapters
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── HELPERS ──────────────────────────────────────────────────────────────────

async function fetchYouTubePage(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.text();
}

function parsePlayerResponse(html) {
  if (!html) return null;
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** Parse timestamp chapters from video description with high tolerance */
function parseDescriptionChapters(description) {
  if (!description) return [];
  const lines = description.split('\n');
  const chapters = [];
  
  // Matches 0:00, 00:00, 1:00:00, (0:00), [0:00] etc. anywhere in line
  const tsRegex = /(?:[([ ]|^)(\d{1,2}:)?(\d{1,2}):(\d{2})(?=[\])]| |$)/;

  for (const line of lines) {
    const m = line.match(tsRegex);
    if (m) {
      const hours = m[1] ? parseInt(m[1]) : 0;
      const mins = parseInt(m[2]);
      const secs = parseInt(m[3]);
      const startSecs = hours * 3600 + mins * 60 + secs;
      
      // The rest of the line is the title
      let title = line.replace(m[0], '').replace(/^[ \-–—:|]+|[ \-–—:|]+$/g, '').trim();
      
      if (title.length > 0 && title.length < 120) {
        chapters.push({ title, startSecs });
      }
    }
  }

  // Sort by timestamp and remove duplicates
  const unique = chapters.sort((a, b) => a.startSecs - b.startSecs)
    .filter((ch, i, arr) => i === 0 || ch.startSecs !== arr[i-1].startSecs);

  return unique.length >= 2 ? unique : [];
}

/** Parse chapters from YouTube's built-in chapter markers */
function parseYTChapters(playerResponse) {
  try {
    // Path 1: engagementPanels (most reliable for modern YT)
    const panels = playerResponse?.engagementPanels || [];
    for (const panel of panels) {
      const chapters = panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
      if (chapters && Array.isArray(chapters)) {
        const result = [];
        for (const c of chapters) {
          const renderer = c.macroMarkersListItemRenderer;
          if (!renderer) continue;

          const title = renderer.title?.simpleText || renderer.title?.runs?.[0]?.text || '';
          if (!title) continue;

          let startSecs = 0;
          const url = renderer.onTap?.commandMetadata?.webCommandMetadata?.url;
          if (url) {
            const tIndex = url.indexOf('t=');
            if (tIndex !== -1) {
              const sIndex = url.indexOf('s', tIndex + 2);
              if (sIndex !== -1) {
                const timeStr = url.substring(tIndex + 2, sIndex);
                const parsed = parseInt(timeStr, 10);
                if (!isNaN(parsed)) {
                  startSecs = Math.floor(parsed);
                }
              }
            }
          }

          result.push({ title, startSecs });
        }
        if (result.length > 0) return result;
      }
    }

    // Path 2: decoratedPlayerBarRenderer (classic)
    const markersMap = playerResponse?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer
      ?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap;

    if (markersMap) {
      for (const marker of Object.values(markersMap)) {
        const chapters = marker?.value?.chapters;
        if (chapters && Array.isArray(chapters)) {
          return chapters.map(c => ({
            title: c.chapterRenderer?.title?.simpleText || c.chapterRenderer?.title?.runs?.[0]?.text || '',
            startSecs: Math.floor((c.chapterRenderer?.timeRangeStartMillis || 0) / 1000),
          })).filter(c => c.title);
        }
      }
    }
  } catch (e) {
    console.warn('[chapters] parseYTChapters error:', e.message);
  }
  return [];
}

// ── ROUTE: POST /api/videos/verify ──────────────────────────────────────────

async function checkEmbeddable(videoId) {
  const cached = videoCache.get(videoId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.result;

  try {
    const html = await fetchYouTubePage(videoId);
    const playerResponse = parsePlayerResponse(html);
    if (!playerResponse) return { embeddable: false };

    const playabilityStatus = playerResponse?.playabilityStatus;
    const videoDetails = playerResponse?.videoDetails;
    const isEmbeddable = playabilityStatus?.playableInEmbed === true;
    const isAvailable = playabilityStatus?.status === 'OK';

    const result = {
      embeddable: isEmbeddable && isAvailable,
      title: videoDetails?.title || '',
      author: videoDetails?.author || '',
    };
    videoCache.set(videoId, { result, ts: Date.now() });
    console.log(`[verify] ${videoId} → embeddable=${result.embeddable} "${result.title}"`);
    return result;
  } catch (err) {
    console.error(`[verify] Error checking ${videoId}:`, err.message);
    return { embeddable: false };
  }
}

router.post('/verify', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const results = await Promise.all(ids.slice(0, 8).map(async id => ({ id, ...(await checkEmbeddable(id)) })));
    const embeddable = results.filter(r => r.embeddable);
    console.log(`[verify] ${embeddable.length}/${ids.length} embeddable`);
    res.json({ videos: embeddable });
  } catch (err) {
    console.error('[verify] error:', err);
    res.status(500).json({ error: 'Failed to verify videos' });
  }
});

// ── ROUTE: GET /api/videos/chapters/:videoId ─────────────────────────────────
// Returns chapter timestamps from a YouTube video.
// Chapters are used to precisely sync content sections to video moments.

router.get('/chapters/:videoId', async (req, res) => {
  const { videoId } = req.params;

  const cached = chapterCache.get(videoId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`[chapters] Cache hit for ${videoId}: ${cached.chapters.length} chapters`);
    return res.json({ chapters: cached.chapters });
  }

  try {
    const html = await fetchYouTubePage(videoId);
    const playerResponse = parsePlayerResponse(html);

    if (!playerResponse) {
      return res.json({ chapters: [] });
    }

    const videoDetails = playerResponse?.videoDetails;
    const description = videoDetails?.shortDescription || '';
    const title = videoDetails?.title || '';
    const durationSecs = parseInt(videoDetails?.lengthSeconds || '0');

    // Try built-in YouTube chapters first
    let chapters = parseYTChapters(playerResponse);

    // Fallback: parse timestamps from video description
    if (chapters.length === 0) {
      chapters = parseDescriptionChapters(description);
    }

    // Add end timestamps based on next chapter start
    const chaptersWithEnd = chapters.map((ch, i) => ({
      ...ch,
      endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
    }));

    console.log(`[chapters] ${videoId} "${title}" → ${chaptersWithEnd.length} chapters`);
    chaptersWithEnd.forEach(c => console.log(`  ${c.startSecs}s: ${c.title}`));

    chapterCache.set(videoId, { chapters: chaptersWithEnd, ts: Date.now() });
    res.json({ chapters: chaptersWithEnd, videoTitle: title });
  } catch (err) {
    console.error(`[chapters] Error for ${videoId}:`, err.message);
    res.json({ chapters: [] });
  }
});

// ── ROUTE: POST /api/videos/match-chapters ───────────────────────────────────
// Given a list of section headings and multiple video IDs with their chapters,
// returns the best-matching chapter for each section across all videos.

router.post('/match-chapters', async (req, res) => {
  try {
    const { sections, videoIds } = req.body;
    if (!Array.isArray(sections) || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'sections and videoIds arrays required' });
    }

    // Fetch chapters for all videos in parallel
    const videoChapterData = await Promise.all(
      videoIds.map(async (videoId) => {
        const cached = chapterCache.get(videoId);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          return { videoId, chapters: cached.chapters, videoTitle: cached.videoTitle, author: cached.author };
        }
        try {
          const html = await fetchYouTubePage(videoId);
          const playerResponse = parsePlayerResponse(html);
          if (!playerResponse) return { videoId, chapters: [], videoTitle: '' };

          const videoDetails = playerResponse?.videoDetails;
          const description = videoDetails?.shortDescription || '';
          const title = videoDetails?.title || '';
          const durationSecs = parseInt(videoDetails?.lengthSeconds || '0');

          let chapters = parseYTChapters(playerResponse);
          if (chapters.length === 0) chapters = parseDescriptionChapters(description);

          const chaptersWithEnd = chapters.map((ch, i) => ({
            ...ch,
            endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
          }));

          const author = videoDetails?.author || '';
          chapterCache.set(videoId, { chapters: chaptersWithEnd, videoTitle: title, author, ts: Date.now() });
          return { videoId, chapters: chaptersWithEnd, videoTitle: title, author };
        } catch {
          return { videoId, chapters: [], videoTitle: '', author: '' };
        }
      })
    );

    // For each section, find the best matching chapter in each video
    const sectionClips = sections.map(section => {
      const sectionLower = section.toLowerCase();
      const sectionWords = sectionLower.split(/\s+/).filter(w => w.length > 2);
      const clips = [];

      for (const { videoId, chapters, videoTitle, author } of videoChapterData) {
        if (chapters.length === 0) continue;

        // Try to find the channel name from author or title
        let channelLabel = 'Alt';
        const searchPool = `${author} ${videoTitle}`.toLowerCase();
        
        if (searchPool.includes('freecodecamp')) channelLabel = 'fCC';
        else if (searchPool.includes('mosh')) channelLabel = 'Mosh';
        else if (searchPool.includes('fireship')) channelLabel = 'Fireship';
        else if (searchPool.includes('traversy')) channelLabel = 'Traversy';
        else if (searchPool.includes('simplified')) channelLabel = 'WDS';
        else if (searchPool.includes('academind')) channelLabel = 'Academind';
        else if (author) channelLabel = author.split(' ')[0]; // Fallback to first word of channel

        // Score each chapter by keyword overlap with the section heading
        const scored = chapters.map(ch => {
          const chLower = ch.title.toLowerCase();
          const chapterWords = chLower.split(/\s+/).filter(w => w.length > 2);
          
          let score = 0;
          // Exact phrase match is a huge boost
          if (chLower.includes(sectionLower)) score += 10;
          
          for (const sw of sectionWords) {
            if (chLower.includes(sw)) score += 3;
            for (const cw of chapterWords) {
              if (cw === sw) score += 2;
              else if (cw.includes(sw) || sw.includes(cw)) score += 1;
            }
          }
          return { ...ch, score };
        });

        const best = scored.sort((a, b) => b.score - a.score)[0];
        // Only include if score is decent (at least one strong word match)
        if (best && best.score >= 3) {
          clips.push({
            videoId,
            videoTitle: channelLabel, // Use short label for UI
            chapterTitle: best.title,
            timestamp: best.startSecs,
            endTimestamp: best.endSecs,
            confidence: Math.min(best.score / 20, 1.0),
          });
        }
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
