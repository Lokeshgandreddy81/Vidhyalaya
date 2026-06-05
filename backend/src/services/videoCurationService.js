import {
  sanitizeVideoId,
  checkEmbeddable,
  scoreTopicRelevance,
} from './youtubeService.js';

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

export { sanitizeVideoId };

const YOUTUBE_AUTHORITY_CHANNELS = [
  'UC4a-Gbdw7vOaccHmFo40b9g', // Khan Academy
  'UCEWpbXPQIlPEH10vn482H4Q', // CrashCourse
  'UCsooa4yRKGN_zEE8iknghZA', // TED-Ed
  'UCsXVk37bltHxD1rDPwtNM8Q', // Kurzgesagt
  'UCoxcjq-8xIDTYp3uz647V5A', // Numberphile
  'UCs4aHmggTfFrpkPcWSaBN9g', // MIT OpenCourseWare
  'UCYO_jab_esuFRV4b17AJtAw', // 3Blue1Brown
];

const PLAYLIST_LABELS = [
  'Best Overall',
  'Beginner Friendly',
  'Industry Practical',
  'Interview Focused',
  'Deep Dive',
  'Advanced',
];

/**
 * Extract a focused YouTube search query from module metadata.
 */
async function extractSearchQuery(moduleTitle, keyConcepts, goalContext) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const primaryTopic = moduleTitle || keyConcepts[0] || '';

  if (!GEMINI_API_KEY || !primaryTopic) {
    return `${primaryTopic} tutorial explained`.trim();
  }

  const prompt = `You are an educational video curator.
Module: "${moduleTitle}"
Key concepts: ${keyConcepts.slice(0, 5).join(', ') || 'none'}
Learning goal: "${goalContext || 'General Mastery'}"

Return a JSON object with ONE field:
"conceptQuery": A precise 3-5 word YouTube search query to find the BEST tutorial video for this exact module topic.
Focus on the module title, not generic CS content. Return ONLY valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.conceptQuery) return parsed.conceptQuery;
    }
  } catch (err) {
    console.warn('[curate] Gemini query extraction failed:', err.message);
  }

  return `${moduleTitle} tutorial`.trim();
}

/**
 * Search YouTube for educational videos on a concept.
 */
async function searchYouTube(conceptQuery, maxResults = 15) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is not configured');

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.append('part', 'snippet');
  searchUrl.searchParams.append('q', conceptQuery);
  searchUrl.searchParams.append('type', 'video');
  searchUrl.searchParams.append('videoDefinition', 'high');
  searchUrl.searchParams.append('videoEmbeddable', 'true');
  searchUrl.searchParams.append('maxResults', String(maxResults));
  searchUrl.searchParams.append('key', YOUTUBE_API_KEY);

  const response = await fetch(searchUrl.toString());
  const data = await response.json();

  if (!data.items?.length) return [];

  // Authority channels first, then rest
  const authority = data.items.filter(item =>
    YOUTUBE_AUTHORITY_CHANNELS.includes(item.snippet.channelId)
  );
  const others = data.items.filter(
    item => !YOUTUBE_AUTHORITY_CHANNELS.includes(item.snippet.channelId)
  );

  return [...authority, ...others].map(item => ({
    videoId: sanitizeVideoId(item.id.videoId),
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
  })).filter(v => v.videoId);
}

/**
 * Scout verified, topic-ranked videos for a module.
 * Returns primary video + ranked alternates — all embed-verified.
 */
export async function scoutModuleVideos({ moduleTitle, keyConcepts = [], goalContext = '' }) {
  if (!moduleTitle || moduleTitle.length < 2) {
    throw new Error('moduleTitle is required');
  }

  const cacheKey = `${moduleTitle}::${keyConcepts.join(',')}::${goalContext}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  const conceptQuery = await extractSearchQuery(moduleTitle, keyConcepts, goalContext);
  const candidates = await searchYouTube(conceptQuery, 15);

  if (candidates.length === 0) {
    return { error: 'No suitable educational video found', triggerSignal: false, videos: [] };
  }

  // Verify embeddability — stop once we have 6 verified
  const verified = [];
  for (const candidate of candidates) {
    const check = await checkEmbeddable(candidate.videoId);
    if (check.embeddable) {
      verified.push({
        videoId: check.id,
        title: check.title || candidate.title,
        channelTitle: check.author || candidate.channelTitle,
      });
    }
    if (verified.length >= 6) break;
  }

  if (verified.length === 0) {
    return { error: 'No embeddable videos found for this topic', triggerSignal: false, videos: [] };
  }

  // Rank by topic relevance
  const ranked = verified
    .map((v, i) => {
      const matchScore = scoreTopicRelevance(v, moduleTitle, keyConcepts);
      return {
        videoId: v.videoId,
        title: v.title,
        channel: v.channelTitle,
        label: PLAYLIST_LABELS[i] || 'Alternative',
        matchScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const result = {
    videoId: ranked[0].videoId,
    title: ranked[0].title,
    reason: `Best match for "${moduleTitle}" via query "${conceptQuery}".`,
    videos: ranked,
    conceptQuery,
    triggerSignal: true,
  };

  cache.set(cacheKey, { result, ts: Date.now() });
  return result;
}

/**
 * Legacy single-video curation — delegates to scoutModuleVideos.
 */
export async function getPerfectVideo(contextText, options = {}) {
  const moduleTitle = options.moduleTitle || contextText.substring(0, 80).replace(/[#*_`>\n]/g, ' ').trim();
  const keyConcepts = options.keyConcepts || [];
  const goalContext = options.goalContext || '';

  if (!moduleTitle || moduleTitle.length < 3) {
    return { error: 'Context text too short to extract meaningful concepts', triggerSignal: false };
  }

  try {
    const scout = await scoutModuleVideos({ moduleTitle, keyConcepts, goalContext });
    if (!scout.triggerSignal) {
      return { error: scout.error || 'No suitable video found', triggerSignal: false };
    }

    return {
      videoId: scout.videoId,
      title: scout.title,
      reason: scout.reason,
      videos: scout.videos,
      conceptQuery: scout.conceptQuery,
      milestones: [],
      triggerSignal: true,
    };
  } catch (error) {
    console.error('Video Curation Error:', error.message);
    return { error: error.message, triggerSignal: false };
  }
}
