import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  checkOEmbedEmbeddable,
  getVideoChaptersViaApi,
  isYouTubeApiEnabled,
  verifyEmbeddableVideos,
} from '../services/youtubeDataApi.js';
import { callAIEngine } from '../utils/aiClientRouter.js';
import VideoCache from '../models/VideoCache.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// ── Database cache helpers ──────────────────────────────────────────────────
async function getCachedValue(key) {
  try {
    const entry = await VideoCache.findOne({ key });
    return entry ? entry.value : null;
  } catch (err) {
    console.warn(`[VideoCache] Get error for key ${key}:`, err.message);
    return null;
  }
}

async function setCachedValue(key, value) {
  try {
    await VideoCache.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.warn(`[VideoCache] Set error for key ${key}:`, err.message);
  }
}

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

/** Ultimate AI Fallback: Generate logical chapter segments using AI completions */
async function generateFallbackChaptersWithGemini(videoId, title, description, durationSecs, req) {
  if (!durationSecs || durationSecs <= 60) return [];

  let transcriptText = '';
  try {
    // 1. Fetch player page to extract caption tracks
    const html = await fetchYouTubePage(videoId);
    const playerResponse = parsePlayerResponse(html);
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (captionTracks.length > 0) {
      // Find English or first available caption track
      const englishTrack = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
      if (englishTrack && englishTrack.baseUrl) {
        const capRes = await fetch(englishTrack.baseUrl, { signal: AbortSignal.timeout(3000) });
        if (capRes.ok) {
          const xml = await capRes.text();
          // Extract text and start times
          const textMatches = xml.matchAll(/<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g);
          const lines = [];
          for (const match of textMatches) {
            const start = parseFloat(match[1]);
            const text = match[2]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/<[^>]*>/g, '')
              .trim();
            if (text) {
              lines.push({ start, text });
            }
          }
          // Sample timeline
          transcriptText = lines
            .filter((_, idx) => idx % 4 === 0)
            .map(l => `[${Math.floor(l.start)}s] ${l.text}`)
            .join(' | ')
            .substring(0, 4000);
        }
      }
    }
  } catch (err) {
    console.warn(`[GeminiChapters] Could not fetch closed captions for ${videoId}: ${err.message}`);
  }

  const cleanDescription = (description || '').substring(0, 1500);
  const prompt = `You are an expert technical video curator. Create a logical timeline chapter list for this educational YouTube video.
  
VIDEO DETAILS:
- Title: "${title}"
- Total Duration: ${durationSecs} seconds (${Math.floor(durationSecs / 60)} mins)
- Transcript Timeline Highlight: "${transcriptText || 'Not available'}"
- Description Excerpt: "${cleanDescription}"

Task:
Divide this video duration into 4 to 7 highly logical, sequential educational chapters based on standard syllabus milestones.
Use the actual timestamps and themes in the Transcript Timeline Highlight to place the startSecs of each chapter with absolute pinpoint accuracy!

Rules:
- The first chapter MUST start at 0 seconds.
- The timestamps must be strictly sequential and spaced logically (e.g., each chapter should be at least 90-180 seconds long).
- The last timestamp MUST be less than the total duration of ${durationSecs} seconds.
- Titles must be clear, concise, and educational.
- **Phonetic Speech-to-Text Correction**: The Transcript Timeline Highlight might contain automated voice transcription errors (homophones). Standard technical voice approximations include: "doc or" or "docker", "sequel" or "SQL", "ay double you es" or "AWS", "giggle" or "Git/GitHub", "usestate" or "useState", "next jay es" or "Next.js". Please logically correct and align these errors to identify correct chapter topics!

Return a JSON object with this exact structure:
{
  "chapters": [
    { "title": "Chapter Title", "startSecs": 0 },
    { "title": "Chapter Title", "startSecs": 240 }
  ]
}

Return ONLY the JSON. No explanations.`;

  try {
    const text = await callAIEngine({
      req,
      prompt,
      temperature: 0.2,
      responseMimeType: 'application/json',
      timeoutMs: 8000,
    });

    if (!text.trim()) return [];

    const parsed = JSON.parse(text.trim());
    if (parsed.chapters && Array.isArray(parsed.chapters)) {
      return parsed.chapters
        .map(ch => ({
          title: ch.title,
          startSecs: Math.max(0, Math.min(durationSecs - 10, Math.round(ch.startSecs))),
        }))
        .sort((a, b) => a.startSecs - b.startSecs);
    }
  } catch (err) {
    console.warn(`[GeminiChapters] Failed to generate chapters: ${err.message}`);
  }
  return [];
}

/** Ultimate AI Backup Fallback: Generate custom timed dialogue transcripts using AI */
async function generateBackupTranscriptWithGemini(title, context, req) {
  const cleanContext = (context || '').substring(0, 2000);
  const prompt = `You are a world-class technical instructor teaching a highly engaging video course on: "${title}".
  
LESSON CONTEXT:
"${cleanContext}"

Task:
Write a timed, step-by-step presentation script of a 5-minute lecture teaching these exact concepts. 
Divide the lecture into 5 to 8 sequential dialogue segments.
Each segment should have a start timestamp in seconds (spaced by approx. 45-60 seconds), a duration in seconds, and a clear, highly educational timed dialogue.

Rules:
- Make sure the dialogue is technical, accurate, and teaches actual concepts from the context.
- Keep each paragraph dialogue concise (1-2 clear sentences).
- Timestamps must be strictly sequential starting at 0.

Return a JSON object with this exact structure:
{
  "transcript": [
    { "start": 0, "duration": 45, "text": "Welcome to this deep dive into... In this lesson, we will explore..." },
    { "start": 45, "duration": 60, "text": "Now let's look at the core architecture. When a browser loads a page, it first..." }
  ]
}

Return ONLY the JSON. No explanation.`;

  try {
    const text = await callAIEngine({
      req,
      prompt,
      temperature: 0.3,
      responseMimeType: 'application/json',
      timeoutMs: 8000,
    });

    if (!text.trim()) return [];

    const parsed = JSON.parse(text.trim());
    return parsed.transcript || [];
  } catch (err) {
    console.warn('[GeminiTranscript] Failed to generate backup transcript:', err.message);
    return [];
  }
}

// ── ROUTE: POST /api/videos/verify ──────────────────────────────────────────

async function checkEmbeddable(videoId) {
  const cached = await getCachedValue(`embed:${videoId}`);
  if (cached) return cached;

  try {
    const oe = await checkOEmbedEmbeddable(videoId);
    if (oe.embeddable) {
      const result = { embeddable: true, title: oe.title || '', author: oe.channel || '' };
      await setCachedValue(`embed:${videoId}`, result);
      console.log(`[verify-oembed] ${videoId} → embeddable=true "${result.title}"`);
      return result;
    }
    if (oe.id && !oe.embeddable) {
      const result = { embeddable: false };
      await setCachedValue(`embed:${videoId}`, result);
      return result;
    }
  } catch (err) {
    console.warn(`[verify-oembed] oembed check failed for ${videoId}, falling back to scraping:`, err.message);
  }

  // Fallback to classic html scraping if oembed fails / errors
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
    await setCachedValue(`embed:${videoId}`, result);
    console.log(`[verify-scrape] ${videoId} → embeddable=${result.embeddable} "${result.title}"`);
    return result;
  } catch (err) {
    console.error(`[verify-scrape] Error checking ${videoId}:`, err.message);
    return { embeddable: false };
  }
}

router.post('/verify', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }

    const slice = ids.slice(0, 20);

    const apiVerified = isYouTubeApiEnabled()
      ? await verifyEmbeddableVideos(slice)
      : [];

    const verifiedMap = new Map(apiVerified.map(v => [v.id, v]));
    const missing = slice.filter(id => !verifiedMap.has(id));

    if (missing.length > 0) {
      const oembedResults = await Promise.all(
        missing.map(async id => ({ id, ...(await checkEmbeddable(id)) })),
      );
      for (const r of oembedResults) {
        if (r.embeddable) {
          verifiedMap.set(r.id, {
            id: r.id,
            title: r.title || '',
            channel: r.author || '',
            embeddable: true,
          });
        }
      }
    }

    const embeddable = [...verifiedMap.values()];
    console.log(`[verify] ${embeddable.length}/${slice.length} embeddable`);
    res.json({
      videos: embeddable.map(v => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        embeddable: true,
        durationFormatted: v.durationFormatted,
        viewCount: v.viewCount,
      })),
    });
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

  const cached = await getCachedValue(`chapters:${videoId}`);
  if (cached) {
    return res.json({ chapters: cached.chapters, videoTitle: cached.videoTitle, author: cached.author });
  }

  try {
    let title = '';
    let description = '';
    let durationSecs = 0;
    let author = '';
    let chapters = [];

    if (isYouTubeApiEnabled()) {
      const apiData = await getVideoChaptersViaApi(videoId);
      if (apiData) {
        title = apiData.videoTitle;
        description = apiData.description;
        durationSecs = apiData.durationSecs;
        author = apiData.author;
        chapters = apiData.chapters;
      }
    }

    const html = await fetchYouTubePage(videoId);
    const playerResponse = parsePlayerResponse(html);

    if (playerResponse) {
      const videoDetails = playerResponse?.videoDetails;
      title = title || videoDetails?.title || '';
      description = description || videoDetails?.shortDescription || '';
      durationSecs = durationSecs || parseInt(videoDetails?.lengthSeconds || '0', 10);
      author = author || videoDetails?.author || '';

      const nativeChapters = parseYTChapters(playerResponse);
      if (nativeChapters.length > 0) {
        chapters = nativeChapters;
      } else if (chapters.length === 0) {
        chapters = parseDescriptionChapters(description);
      }
    }

    if (chapters.length === 0 && durationSecs > 60) {
      console.log(`[chapters] Gemini fallback for ${videoId}`);
      chapters = await generateFallbackChaptersWithGemini(
        videoId,
        title,
        description,
        durationSecs,
        req,
      );
    }

    const chaptersWithEnd = chapters.map((ch, i) => ({
      ...ch,
      endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
    }));

    await setCachedValue(`chapters:${videoId}`, {
      chapters: chaptersWithEnd,
      videoTitle: title,
      author,
    });

    res.json({ chapters: chaptersWithEnd, videoTitle: title, author });
  } catch (err) {
    console.error(`[chapters] Error for ${videoId}:`, err.message);
    res.json({ chapters: [] });
  }
});

// ── ROUTE: POST /api/videos/transcript/:videoId ───────────────────────────────
// Returns a full timed closed-caption list from a YouTube video or generates an AI backup transcript to bypass adblockers.
router.post('/transcript/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { title = '', context = '' } = req.body;
  const transcript = [];

  try {
    const cached = await getCachedValue(`transcript:${videoId}`);
    if (cached) {
      return res.json({ transcript: cached });
    }

    const html = await fetchYouTubePage(videoId);
    const playerResponse = parsePlayerResponse(html);
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (captionTracks.length > 0) {
      const englishTrack = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
      if (englishTrack && englishTrack.baseUrl) {
        const capRes = await fetch(englishTrack.baseUrl, { signal: AbortSignal.timeout(3000) });
        if (capRes.ok) {
          const xml = await capRes.text();
          const textMatches = xml.matchAll(/<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g);
          for (const match of textMatches) {
            const start = parseFloat(match[1]);
            const duration = parseFloat(match[2]);
            const text = match[3]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/<[^>]*>/g, '') // strip residual HTML tags
              .trim();
            if (text) {
              transcript.push({ start, duration, text });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[transcript] Closed-caption extraction failed for ${videoId}:`, err.message);
  }

  // Ultimate AI Backup: If captions are blocked or unavailable, generate timing-accurate backup dialogue
  if (transcript.length === 0) {
    console.log(`[transcript] Dialogue track blocked or empty for ${videoId}. Synthesizing AI backup transcript...`);
    try {
      const backup = await generateBackupTranscriptWithGemini(title || videoId, context, req);
      if (backup && backup.length > 0) {
        await setCachedValue(`transcript:${videoId}`, backup);
      }
      return res.json({ transcript: backup });
    } catch (err) {
      console.error(`[transcript] AI backup synthesis failed:`, err.message);
    }
  }

  if (transcript.length > 0) {
    await setCachedValue(`transcript:${videoId}`, transcript);
  }
  res.json({ transcript });
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
        const cached = await getCachedValue(`chapters:${videoId}`);
        if (cached) {
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
          if (chapters.length === 0 && durationSecs > 60) {
            chapters = await generateFallbackChaptersWithGemini(
              videoId,
              title,
              description,
              durationSecs,
              req,
            );
          }

          const chaptersWithEnd = chapters.map((ch, i) => ({
            ...ch,
            endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
          }));

          const author = videoDetails?.author || '';
          await setCachedValue(`chapters:${videoId}`, { chapters: chaptersWithEnd, videoTitle: title, author });
          return { videoId, chapters: chaptersWithEnd, videoTitle: title, author };
        } catch {
          return { videoId, chapters: [], videoTitle: '', author: '' };
        }
      })
    );

    // Pre-process video data to avoid redundant string parsing and array creations
    const processedVideos = videoChapterData.map(v => {
      let channelLabel = 'Alt';
      const searchPool = `${v.author} ${v.videoTitle}`.toLowerCase();

      if (searchPool.includes('freecodecamp')) channelLabel = 'fCC';
      else if (searchPool.includes('mosh')) channelLabel = 'Mosh';
      else if (searchPool.includes('fireship')) channelLabel = 'Fireship';
      else if (searchPool.includes('traversy')) channelLabel = 'Traversy';
      else if (searchPool.includes('simplified')) channelLabel = 'WDS';
      else if (searchPool.includes('academind')) channelLabel = 'Academind';
      else if (v.author) channelLabel = v.author.split(' ')[0]; // Fallback to first word of channel

      const processedChapters = v.chapters.map(ch => {
        const chLower = ch.title.toLowerCase();
        const chapterWords = chLower.split(/\s+/).filter(w => w.length > 2);
        return {
          ...ch,
          chLower,
          chapterWords,
          chapterWordsSet: new Set(chapterWords),
        };
      });

      return {
        ...v,
        channelLabel,
        processedChapters,
      };
    });

    // For each section, find the best matching chapter in each video
    const sectionClips = sections.map(section => {
      const sectionLower = section.toLowerCase();
      const sectionWords = sectionLower.split(/\s+/).filter(w => w.length > 2);
      const clips = [];

      for (const { videoId, channelLabel, processedChapters } of processedVideos) {
        if (processedChapters.length === 0) continue;

        let bestScore = -1;
        let bestChapter = null;

        // Score each chapter by keyword overlap with the section heading
        for (let i = 0; i < processedChapters.length; i++) {
          const ch = processedChapters[i];
          let score = 0;

          // Exact phrase match is a huge boost
          if (ch.chLower.indexOf(sectionLower) !== -1) score += 10;
          
          for (let j = 0; j < sectionWords.length; j++) {
            const sw = sectionWords[j];
            if (ch.chLower.indexOf(sw) !== -1) {
              score += 3;
              for (let k = 0; k < ch.chapterWords.length; k++) {
                const cw = ch.chapterWords[k];
                if (cw === sw) score += 2;
                else if (cw.indexOf(sw) !== -1 || sw.indexOf(cw) !== -1) score += 1;
              }
            } else {
              // If chLower does not contain sw, then no cw can equal sw, and no cw can contain sw.
              // We only need to check if sw contains cw.
              for (let k = 0; k < ch.chapterWords.length; k++) {
                const cw = ch.chapterWords[k];
                if (sw.indexOf(cw) !== -1) score += 1;
              }
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestChapter = ch;
          }
        }

        // Only include if score is decent (at least one strong word match)
        if (bestChapter && bestScore >= 2) {
          clips.push({
            videoId,
            videoTitle: channelLabel, // Use short label for UI
            chapterTitle: bestChapter.title,
            timestamp: bestChapter.startSecs,
            endTimestamp: bestChapter.endSecs,
            confidence: Math.min(bestScore / 20, 1.0),
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
