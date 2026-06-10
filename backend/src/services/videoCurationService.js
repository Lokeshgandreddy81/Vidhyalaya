import crypto from 'crypto';
import {
  isYouTubeApiEnabled,
  searchVideos as searchViaYouTubeApi,
  verifyEmbeddableVideos,
} from './youtubeDataApi.js';

const TRASH_KEYWORD_BLACKLIST = new Set([
  'unboxing', 'review', 'drama', 'reaction', 'parody', 'vlog', 'rant', 
  'shorts compilation', 'funny moments', 'news', 'podcast clip', 'tiktok'
]);

function containsTrashKeywords(title) {
  if (!title) return true;
  const lowerTitle = title.toLowerCase();
  return [...TRASH_KEYWORD_BLACKLIST].some(word => lowerTitle.includes(word));
}

export function scoreTopicRelevance(video, moduleTitle, keyConcepts = []) {
  if (!video) return 10;
  const titleLower = (video.title || '').toLowerCase();
  const channelLower = (video.channel || video.channelTitle || video.author || '').toLowerCase();

  if (containsTrashKeywords(titleLower)) return 10; // Instantly tank trash videos

  // Safely parse moduleTitle
  const cleanModuleTitle = typeof moduleTitle === 'string' ? moduleTitle.trim() : '';
  const primaryKeywords = cleanModuleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Enforce structural intersection: The video title MUST match at least one core keyword
  const hasIntersection = primaryKeywords.length === 0 || primaryKeywords.some(kw => titleLower.includes(kw));
  if (!hasIntersection) {
    return 20; // Hard penalty if it doesn't match the actual topic
  }

  let score = 0;
  for (const kw of new Set(primaryKeywords)) {
    if (titleLower.includes(kw)) score += 15;
  }

  if (cleanModuleTitle && titleLower.includes(cleanModuleTitle.toLowerCase())) {
    score += 30;
  }

  // Safely parse and score keyConcepts (guarding against array/object/undefined/nulls)
  let conceptsList = [];
  if (Array.isArray(keyConcepts)) {
    conceptsList = keyConcepts.flatMap(c => {
      if (typeof c === 'string') {
        return c.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      }
      return [];
    });
  } else if (typeof keyConcepts === 'string') {
    conceptsList = keyConcepts.toLowerCase().split(/[\s,.]+/).filter(w => w.length > 2);
  }

  for (const kw of new Set(conceptsList)) {
    if (titleLower.includes(kw)) score += 10;
  }

  // Channel authority bonus (Only applies if the video is actually on-topic)
  const authorityChannels = [
    'freecodecamp', 'traversy', 'mosh', 'fireship', 'simplified', 'academind',
    '3blue1brown', 'mit', 'khan', 'computerphile', 'net ninja', 'kevin powell',
    'sentdex', 'corey schafer', 'neetcode', 'ben eater', 'harkirat', 'clever programmer',
    'veritasium', 'smartereveryday', 'kurzgesagt', 'ted-ed', 'tedx', 'vsauce', 'asapscience',
    'mark rober', 'numberphile', 'crashcourse', 'scishow', 'vox', 'huberman', 'lex fridman',
    'bilyeu', 'impact theory', 'lewis howes', 'greatness', 'tim ferriss', 'motivation',
    'goalcast', 'robbins', 'sinek', 'jocko', 'goggins', 'arnold schwarzenegger', 'stanford gsb',
    'better ideas'
  ];
  if (authorityChannels.some(ch => channelLower.includes(ch))) score += 15;

  return Math.min(99, Math.max(10, score));
}


const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;
const FETCH_TIMEOUT = 5000;

export function sanitizeVideoId(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:v=|embed\/|shorts\/|live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  return trimmed;
}

function getCached(key) {
  const entry = CACHE.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
}

function parseISODuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function resolveGeminiKey(geminiApiKey) {
  const key = geminiApiKey || process.env.GEMINI_API_KEY || '';
  const trimmed = key.trim();
  return trimmed.length > 20 && !trimmed.includes('your_') ? trimmed : '';
}

// ── Step 1: Use Gemini + Google Search to find real YouTube videos ──
async function findYouTubeVideosViaGemini(query, geminiApiKey = '') {
  const activeGeminiKey = resolveGeminiKey(geminiApiKey);
  if (!activeGeminiKey) return [];

  const cacheKey = `gemini_search:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are a video research assistant. Search YouTube for high-quality content about: "${query}"

Return a JSON object with this exact structure:
{
  "videos": [
    {"id": "11-char-youtube-id", "title": "exact video title", "channel": "channel name"},
    {"id": "11-char-youtube-id", "title": "exact video title", "channel": "channel name"}
  ]
}

Rules:
- Find 5-10 real YouTube videos specifically matching the topic: "${query}".
- The "id" MUST be the exact, valid 11-character YouTube video ID.
- Prefer authoritative and highly popular channels tailored to the topic type:
  * For coding/technical topics: prefer freeCodeCamp, Fireship, Programming with Mosh, Traversy Media, Net Ninja, Web Dev Simplified, Academind, NeetCode.
  * For math/science/academic theory: prefer 3Blue1Brown, Khan Academy, Veritasium, CrashCourse, SmarterEveryDay, MIT OpenCourseWare.
  * For mindset, self-improvement, motivation, or business: prefer speeches, podcasts, interviews, or documentaries (e.g. Arnold Schwarzenegger, Lewis Howes/School of Greatness, Huberman Lab, Tom Bilyeu/Impact Theory, Goalcast, Simon Sinek, Stanford GSB).
- Only include videos that are actually about the topic.
- Prefer videos with high view counts and engagement.
- Return ONLY the JSON object. No markdown. No explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeGeminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[GeminiSearch] API error ${response.status}: ${errText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text.trim()) return [];

    // Extract grounding URLs (these are REAL pages Google fetched)
    const groundingUrls = [];
    const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk?.web?.uri) groundingUrls.push(chunk.web.uri);
    }

    // Extract YouTube IDs from grounding URLs
    const groundingIds = new Set();
    for (const url of groundingUrls) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (match) groundingIds.add(match[1]);
    }

    // Parse Gemini's JSON response
    let jsonIds = [];
    try {
      const parsed = JSON.parse(text);
      if (parsed.videos && Array.isArray(parsed.videos)) {
        jsonIds = parsed.videos.filter(v => v?.id && /^[A-Za-z0-9_-]{11}$/.test(v.id));
      }
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.videos && Array.isArray(parsed.videos)) {
            jsonIds = parsed.videos.filter(v => v?.id && /^[A-Za-z0-9_-]{11}$/.test(v.id));
          }
        } catch {}
      }
    }

    // Merge: grounding IDs are more reliable, then JSON IDs
    const seen = new Set();
    const result = [];

    for (const id of groundingIds) {
      if (!seen.has(id)) {
        seen.add(id);
        const jsonMatch = jsonIds.find(v => v.id === id);
        result.push({ id, title: jsonMatch?.title || '', channel: jsonMatch?.channel || '' });
      }
    }

    for (const v of jsonIds) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        result.push({ id: v.id, title: v.title, channel: v.channel });
      }
    }

    console.log(`[GeminiSearch] Found ${result.length} YouTube candidates for "${query}" (${groundingIds.size} from grounding, ${jsonIds.length} from JSON)`);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[GeminiSearch] Failed for "${query}":`, err.message);
    return [];
  }
}

// ── Step 2: Verify videos via oEmbed + get real titles/channels ──
async function verifyViaOEmbed(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];

  const results = [];
  for (const id of videoIds) {
    const cacheKey = `oembed:${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      results.push(cached);
      continue;
    }

    try {
      const oembedUrls = [
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/shorts/${id}`)}&format=json`,
      ];

      let resolved = null;
      for (const url of oembedUrls) {
        const res = await fetchWithTimeout(url, 3000);
        if (res.ok) {
          const data = await res.json();
          resolved = {
            id,
            title: data.title || '',
            channel: data.author_name || '',
            embeddable: true,
          };
          break;
        }
        if (res.status === 404) continue;
      }

      if (resolved) {
        setCache(cacheKey, resolved);
        results.push(resolved);
      } else {
        const result = { id, title: '', channel: '', embeddable: false };
        setCache(cacheKey, result);
        results.push(result);
      }
    } catch {
      results.push({ id, title: '', channel: '', embeddable: null });
    }
  }

  return results;
}

// ── Step 3: Get duration info via page scraping ──
async function getDurationFromPage(videoId) {
  const cacheKey = `duration:${videoId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return 0;

    const html = await res.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
    if (!match) return 0;

    const player = JSON.parse(match[1]);
    const secs = parseInt(player?.videoDetails?.lengthSeconds || '0');
    setCache(cacheKey, secs);
    return secs;
  } catch {
    return 0;
  }
}

async function enrichWithDurations(videos) {
  const enriched = [];
  for (const v of videos) {
    const durationSeconds = await getDurationFromPage(v.id);
    enriched.push({
      ...v,
      durationSeconds,
      durationFormatted: formatDuration(durationSeconds),
    });
  }
  return enriched;
}

// ── Step 4: Gemini re-ranking against learning context ──
async function rankVideosWithGemini(videos, learningContext, geminiApiKey = '') {
  if (!videos || videos.length === 0) return [];

  const localScoreFallback = () => {
    const scored = videos.map(v => {
      // Find relevance percentage using scoreTopicRelevance helper
      const pct = scoreTopicRelevance(
        { title: v.title, author: v.channel || v.author },
        learningContext.substring(0, 150),
        learningContext ? learningContext.split(/[\s,.]+/) : []
      );
      // Map 40-99 to 4-10 relevanceScore
      const score = Math.max(1, Math.min(10, Math.round(pct / 10)));
      return {
        ...v,
        relevanceScore: score,
        relevanceReason: `Local relevance evaluation (${score}/10)`,
      };
    });
    // Sort descending by relevance score
    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  };

  const activeGeminiKey = resolveGeminiKey(geminiApiKey);
  if (!activeGeminiKey) {
    return localScoreFallback();
  }
  if (!learningContext || learningContext.length < 5) {
    return localScoreFallback();
  }

  const cacheKey = `rank:${learningContext.substring(0, 120)}:${videos.map(v => v.id).join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const catalog = videos.map((v, i) =>
    `[${i + 1}] "${v.title || 'Unknown'}" by ${v.channel || 'Unknown'} (${v.durationFormatted || '?'})`
  ).join('\n');

  const prompt = `You are an expert video content curator. Rank these YouTube videos by relevance to the learning context.

LEARNING CONTEXT: "${learningContext.substring(0, 2000)}"

VIDEOS:
${catalog}

Return a JSON array of objects: [{ "index": number, "relevanceScore": 1-10, "reason": "brief reason" }]
Sort by relevanceScore descending.

Scoring rules:
- Adapt the scoring to the target domain of the learning context:
  * For academic/technical topics: favor clear, structured tutorials, lectures, or visualizations.
  * For mindset, self-improvement, or motivational topics (e.g. Arnold Schwarzenegger, Stoicism, focus): favor direct speeches, podcasts, interviews, or high-quality documentaries of the subject figure or authoritative experts.
  * For creative/artistic topics: favor high-quality walkthroughs, live demos, or technique guides.
- 10 = Perfect match. Directly covers the specific subject/concept of the learning context with high fidelity.
- 8-9 = Excellent. Highly relevant, covers the topic well.
- 6-7 = Good. Relevant but may cover adjacent concepts.
- 4-5 = Decent. Tangentially related or lacks focus on the requested topic.
- 1-3 = Poor. Barely related or completely off-topic.
Score MUST be integer between 1 and 10. Return ONLY the JSON array.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeGeminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text.trim()) throw new Error('Empty response');

    let rankings;
    try {
      rankings = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) rankings = JSON.parse(match[0]);
      else throw new Error('Could not parse');
    }

    const rankedIndices = new Set();
    const ranked = [];
    for (const r of rankings) {
      const idx = r.index;
      if (idx < 1 || idx > videos.length || rankedIndices.has(idx)) continue;
      rankedIndices.add(idx);
      ranked.push({
        ...videos[idx - 1],
        relevanceScore: Math.max(1, Math.min(10, Math.round(r.relevanceScore))),
        relevanceReason: (r.reason || '').substring(0, 200),
      });
    }

    const unranked = videos.filter((_, i) => !rankedIndices.has(i + 1));
    const result = [...ranked, ...unranked.map(v => ({ ...v, relevanceScore: 1 }))];
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Gemini ranking error:', err.message);
    return localScoreFallback();
  }
}

// ── Curated library fallback (static 137-video list) ──
const CURATED_FALLBACKS = [
  { id: 'PkZNo7MFNFg', title: 'Learn JavaScript - Full Course for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 12720 },
  { id: 'DHjqpvDnNGE', title: 'JavaScript in 100 Seconds', channel: 'Fireship', durationSeconds: 120 },
  { id: 'hdI2bqOjy3c', title: 'JavaScript Crash Course for Beginners', channel: 'Traversy Media', durationSeconds: 5580 },
  { id: 'W6NZfCO5SIk', title: 'JavaScript Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 2880 },
  { id: 'zJSY8tbf_ys', title: 'TypeScript - The Complete Developer Guide', channel: 'freeCodeCamp.org', durationSeconds: 10080 },
  { id: 'BwuLxPt4FnQ', title: 'TypeScript Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 3540 },
  { id: 'nu_pCVPKzTk', title: 'React JS - Full Course for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 17700 },
  { id: 'w7ejDZ8SWv8', title: 'React JS Crash Course', channel: 'Traversy Media', durationSeconds: 6300 },
  { id: 'SqcY0GlETPk', title: 'React Query in 100 Seconds', channel: 'Fireship', durationSeconds: 120 },
  { id: 'CvAQkFJqXQQ', title: 'React Hooks Tutorial', channel: 'Web Dev Simplified', durationSeconds: 2280 },
  { id: 'qf0O0Z1vY1Y', title: 'Python for Beginners - Full Course', channel: 'freeCodeCamp.org', durationSeconds: 16860 },
  { id: '_uQrJ0TkZlc', title: 'Python Tutorial - Full Course for Beginners', channel: 'Programming with Mosh', durationSeconds: 21600 },
  { id: 'rfscVS0vtbw', title: 'Learn Python - Full Course for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 16860 },
  { id: 'RBSGKlAvoiM', title: 'Data Structures - Full Course', channel: 'freeCodeCamp.org', durationSeconds: 27600 },
  { id: 'toL1tVkrVEk', title: 'Algorithms and Data Structures Tutorial', channel: 'freeCodeCamp.org', durationSeconds: 12000 },
  { id: 'HXV3zeQKqGY', title: 'SQL Full Course - Learn SQL in 4 Hours', channel: 'freeCodeCamp.org', durationSeconds: 14400 },
  { id: 'p3qvj9hO_Bo', title: 'MongoDB Crash Course', channel: 'Traversy Media', durationSeconds: 3600 },
  { id: 'Oe421EPjeBE', title: 'Node.js and Express.js - Full Course', channel: 'freeCodeCamp.org', durationSeconds: 25200 },
  { id: '32M1al-Y6Ag', title: 'Node.js Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 3600 },
  { id: 'ENrzD9HAZK4', title: 'Node.js in 100 Seconds', channel: 'Fireship', durationSeconds: 120 },
  { id: '9GZlVOafYTg', title: 'Computer Networking Full Course', channel: 'freeCodeCamp.org', durationSeconds: 23760 },
  { id: 'zOjov-2OZ0E', title: 'Introduction to Programming and Computer Science', channel: 'freeCodeCamp.org', durationSeconds: 4500 },
  { id: 'KNAWp2S3w94', title: 'Machine Learning for Everybody', channel: 'freeCodeCamp.org', durationSeconds: 12840 },
  { id: 'aircAruvnKk', title: 'But what is a neural network?', channel: '3Blue1Brown', durationSeconds: 1140 },
  { id: 'fNk_zzaMoEs', title: 'Essence of Linear Algebra', channel: '3Blue1Brown', durationSeconds: 900 },
  { id: '7UJt_KqYrFY', title: 'MIT Linear Algebra Lectures', channel: 'MIT OpenCourseWare', durationSeconds: 2700 },
  { id: 'nKIu9yen5nc', title: 'AWS Certified Cloud Practitioner Course', channel: 'freeCodeCamp.org', durationSeconds: 22800 },
  { id: 'fqMOX6JJhGo', title: 'Docker Tutorial for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 10800 },
  { id: 'RGOj5yH7evk', title: 'Git and GitHub for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 4140 },
  { id: 'Jr9nO4ud7ME', title: 'CSS Full Course for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 22920 },
  { id: 'G3e-cpL7ofc', title: 'HTML & CSS Full Course - Beginner to Pro', channel: 'SuperSimpleDev', durationSeconds: 41760 },
  { id: 'kqtD5dpn9C8', title: 'Python for Everybody - Full University Course', channel: 'freeCodeCamp.org', durationSeconds: 84000 },
  { id: 'YS4e4q9oBaU', title: 'Go Programming – Golang Course with Bonus Projects', channel: 'freeCodeCamp.org', durationSeconds: 27000 },
  { id: 'BpPEoZW5IiY', title: 'Rust Programming Course for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 51600 },
  { id: 'oxuRxtrO2Ag', title: 'Linux Command Line Full Course', channel: 'freeCodeCamp.org', durationSeconds: 16800 },
  { id: 'vLnPwxZdW4Y', title: 'Git Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 3540 },
  { id: 'eIrMbAQSU34', title: 'Java Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 9000 },
  { id: '4deVCNJq3qc', title: 'Vue JS Crash Course', channel: 'Traversy Media', durationSeconds: 6600 },
  { id: 'k5E2AVpwsko', title: 'Angular Tutorial for Beginners', channel: 'Programming with Mosh', durationSeconds: 7200 },
  { id: 'm8Icp_Cid5o', title: 'System Design for Beginners', channel: 'freeCodeCamp.org', durationSeconds: 3600 },
  { id: 'vBURTt97EkA', title: 'Operating Systems - Full Course', channel: 'freeCodeCamp.org', durationSeconds: 25200 },
  { id: '8hly31xKli0', title: 'Dynamic Programming - Learn to Solve Algorithmic Problems', channel: 'freeCodeCamp.org', durationSeconds: 18000 },
  { id: 'tv-_1er1mWI', title: 'Design Patterns in Plain English', channel: 'Programming with Mosh', durationSeconds: 4800 },
  { id: '8aGhZQkoFbQ', title: 'What the heck is the event loop?', channel: 'JSConf', durationSeconds: 1560 },
  { id: 'c9B4TPnak1A', title: 'UI/UX Design Course', channel: 'freeCodeCamp.org', durationSeconds: 19800 },
  { id: 'FgnxcUQ5vho', title: 'JavaScript Testing Tutorial', channel: 'Web Dev Simplified', durationSeconds: 2700 },
];

function getCuratedFallback(query) {
  const q = query.toLowerCase();
  const keywords = q.split(/[\s-]+/).filter(w => w.length >= 2);

  // 1. Try exact keyword scoring on CURATED_FALLBACKS
  let best = [];
  let bestScore = 0;

  for (const v of CURATED_FALLBACKS) {
    const title = v.title.toLowerCase();
    const channel = v.channel.toLowerCase();
    let score = 0;

    if (title.includes(q)) score += 20;
    if (channel.includes(q)) score += 15;

    for (const kw of keywords) {
      if (title.includes(kw)) score += 5;
      if (channel.includes(kw)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = [v];
    } else if (score === bestScore && score > 0) {
      best.push(v);
    }
  }

  // 2. High-fidelity category match fallback if direct keyword matches are poor (bestScore < 8)
  if (best.length === 0 || bestScore < 8) {
    const CATEGORY_MAP = [
      {
        name: 'git',
        keywords: ['git', 'github', 'version', 'branch', 'merge', 'commit', 'checkout', 'repo', 'repository', 'giggle', 'git hub'],
        ids: ['RGOj5yH7evk', 'vLnPwxZdW4Y', 'oxuRxtrO2Ag']
      },
      {
        name: 'sql',
        keywords: ['sql', 'database', 'db', 'query', 'mysql', 'postgres', 'postgresql', 'nosql', 'mongodb', 'mongoose', 'schema', 'sequel', 'mongo', 'postgress'],
        ids: ['HXV3zeQKqGY', 'p3qvj9hO_Bo', 'ofme2o29ngU', 'WpD8bN1cwR0']
      },
      {
        name: 'docker',
        keywords: ['docker', 'kubernetes', 'k8s', 'container', 'aws', 'cloud', 'gcp', 'azure', 'devops', 'lambda', 'serverless', 'doc or', 'cooper netties', 'ay double you es', 'amazon web services'],
        ids: ['fqMOX6JJhGo', 'Pz5cMtbAMu0', 'JiD78s_fI-I', '3hLmDS179YE']
      },
      {
        name: 'react',
        keywords: ['react', 'nextjs', 'next.js', 'redux', 'hooks', 'usestate', 'useeffect', 'jsx', 'component', 'props', 'use state', 'use effect', 'next jay es'],
        ids: ['nu_pCVPKzTk', 'w7ejDZ8SWv8', 'CvAQkFJqXQQ', 'SqcY0GlETPk']
      },
      {
        name: 'typescript',
        keywords: ['typescript', 'ts', 'interface', 'generic', 'types'],
        ids: ['zJSY8tbf_ys', 'BwuLxPt4FnQ']
      },
      {
        name: 'javascript',
        keywords: ['javascript', 'js', 'es6', 'callback', 'promise', 'async', 'await', 'event loop'],
        ids: ['PkZNo7MFNFg', 'DHjqpvDnNGE', 'hdI2bqOjy3c', 'W6NZfCO5SIk', '8aGhZQkoFbQ']
      },
      {
        name: 'css',
        keywords: ['css', 'html', 'flexbox', 'grid', 'styling', 'markup', 'ui', 'ux', 'design', 'figma'],
        ids: ['Jr9nO4ud7ME', 'G3e-cpL7ofc', 'FqmB-Zj2-PA', 'c9B4TPnak1A']
      },
      {
        name: 'networking',
        keywords: ['networking', 'http', 'dns', 'tcp', 'ip', 'protocol', 'request', 'response', 'lifecycle', 'internet', 'web works'],
        ids: ['9GZlVOafYTg', 'hJHvdElxZGI', 'iYM2zFP3ZO0']
      },
      {
        name: 'python',
        keywords: ['python', 'pandas', 'numpy', 'data analysis', 'data science', 'scripting'],
        ids: ['rfscVS0vtbw', '_uQrJ0TkZlc', 'kqtD5dpn9C8']
      },
      {
        name: 'rust',
        keywords: ['rust', 'go', 'golang', 'systems programming', 'memory safety'],
        ids: ['BpPEoZW5IiY', 'YS4e4q9oBaU']
      },
      {
        name: 'dsa',
        keywords: ['dsa', 'algorithm', 'structure', 'sorting', 'searching', 'complexity', 'dynamic programming', 'recursion', 'linked list', 'graph', 'tree'],
        ids: ['RBSGKlAvoiM', 'toL1tVkrVEk', '8hly31xKli0']
      }
    ];

    let bestCategory = null;
    let maxCategoryScore = 0;

    for (const cat of CATEGORY_MAP) {
      let score = 0;
      for (const kw of cat.keywords) {
        const hasExactWord = keywords.includes(kw);
        if (hasExactWord) {
          score += 15; // Major boost for exact word matches
        } else if (q.includes(kw)) {
          score += 5;
        }
      }
      if (score > maxCategoryScore) {
        maxCategoryScore = score;
        bestCategory = cat;
      }
    }

    if (bestCategory && maxCategoryScore > 0) {
      console.log(`[Smartboard Backend] Fallback matched category: ${bestCategory.name} (score ${maxCategoryScore})`);
      const matchedVideos = CURATED_FALLBACKS.filter(v => bestCategory.ids.includes(v.id));
      if (matchedVideos.length > 0) {
        return matchedVideos.slice(0, 8).map(v => ({
          id: v.id,
          title: v.title,
          channel: v.channel,
          durationSeconds: v.durationSeconds,
          durationFormatted: formatDuration(v.durationSeconds),
          embeddable: true,
          relevanceScore: 8,
          isAuthority: false,
          isElite: false,
          source: 'curated_fallback',
        }));
      }
    }
  }

  // 3. Fallback to matched keyword items if available
  if (best.length > 0) {
    return best.slice(0, 8).map(v => ({
      id: v.id,
      title: v.title,
      channel: v.channel,
      durationSeconds: v.durationSeconds,
      durationFormatted: formatDuration(v.durationSeconds),
      embeddable: true,
      relevanceScore: 7,
      isAuthority: false,
      isElite: false,
      source: 'curated_fallback',
    }));
  }

  // 4. Default broad fallback
  return CURATED_FALLBACKS.slice(0, 5).map(v => ({
    id: v.id,
    title: v.title,
    channel: v.channel,
    durationSeconds: v.durationSeconds,
    durationFormatted: formatDuration(v.durationSeconds),
    embeddable: true,
    relevanceScore: 3,
    isAuthority: false,
    isElite: false,
    source: 'curated_fallback',
  }));
}

function mapHitsToPerfectVideos(hits, ranked = null) {
  const byId = new Map(hits.map(v => [v.id, v]));
  const ordered = ranked?.length
    ? ranked.filter(v => byId.has(v.id))
    : [...hits].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  return ordered.slice(0, 15).map(v => {
    const src = byId.get(v.id) || v;
    const score = v.relevanceScore ?? 7;
    return {
      id: src.id,
      title: src.title || v.title || '',
      channel: src.channel || v.channel || '',
      channelId: src.channelId || '',
      description: src.description || '',
      durationSeconds: src.durationSeconds || v.durationSeconds || 0,
      durationFormatted: src.durationFormatted || v.durationFormatted || '',
      viewCount: src.viewCount || v.viewCount || 0,
      likeCount: src.likeCount || 0,
      embeddable: true,
      isAuthority: /(?:freecodecamp|mit\s*open|khan\s*academy|fireship|traversy|mosh|3blue1brown|sentdex|corey\s*schafer|computerphile|academind|web\s*dev\s*simplified|neetcode|ben\s*eater|the\s*net\s*ninja|harkirat|clever\s*programmer|veritasium|smartereveryday|kurzgesagt|ted-ed|tedx|vsauce|asapscience|mark\s*rober|numberphile|crashcourse|scishow|vox|huberman|lex\s*fridman|bilyeu|impact\s*theory|lewis\s*howes|greatness|tim\s*ferriss|motivation|goalcast|robbins|sinek|jocko|goggins|arnold\s*schwarzenegger|stanford\s*gsb|better\s*ideas)/i.test(src.channel || ''),
      isElite: score >= 8,
      relevanceScore: score,
      relevanceReason: v.relevanceReason,
      source: 'youtube_api',
    };
  });
}

async function searchViaYouTubeApiStrict(query, context, minRelevanceScore, geminiApiKey = '') {
  let apiHits = await searchViaYouTubeApi(query, 18);
  if (!apiHits.length) return [];

  // IMMEDIATELY DROP TRASH TITLES BEFORE RE-RANKING
  apiHits = apiHits.filter(v => !containsTrashKeywords(v.title));

  const verified = await verifyEmbeddableVideos(apiHits.map(v => v.id));
  const verifiedMap = new Map(verified.map(v => [v.id, v]));

  apiHits = apiHits
    .filter(v => verifiedMap.has(v.id) || v.embeddable !== false)
    .map(v => ({ ...v, ...verifiedMap.get(v.id) }));

  if (!apiHits.length) {
    // Last resort: trust oEmbed on raw search IDs
    const oembedVerified = await verifyViaOEmbed(
      (await searchViaYouTubeApi(query, 8)).map(v => v.id),
    );
    apiHits = oembedVerified
      .filter(v => v.embeddable !== false && !containsTrashKeywords(v.title))
      .map(v => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        durationSeconds: 0,
        durationFormatted: '',
        embeddable: true,
        viewCount: 0,
      }));
  }

  if (!apiHits.length) return [];

  let ranked = apiHits;
  try {
    ranked = await rankVideosWithGemini(
      apiHits.map(v => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        durationSeconds: v.durationSeconds,
        durationFormatted: v.durationFormatted,
        embeddable: true,
      })),
      context || query,
      geminiApiKey,
    );
  } catch (err) {
    console.error('[Smartboard] Ranking failed, falling back to original hits:', err.message);
    ranked = apiHits.map(v => {
      const fallbackScore = Math.max(1, Math.min(10, Math.round(scoreTopicRelevance(v, query) / 10)));
      return { ...v, relevanceScore: fallbackScore };
    });
  }

  return mapHitsToPerfectVideos(apiHits, ranked)
    .filter(v => v.relevanceScore >= Math.max(minRelevanceScore, 5)); // Hard floor rejection
}

const GENERIC_TITLES = new Set([
  'introduction', 'basics', 'overview', 'summary', 'setup', 'conclusion', 'deep dive',
  'getting started', 'welcome', 'outro', 'wrap up', 'next steps', 'module', 'chapter',
  'intro', 'outro', 'conclusion', 'prerequisites', 'course overview', 'basic setup',
  'hello world', 'first app', 'first program', 'project setup'
]);

function isGenericTitle(title) {
  if (!title) return true;
  const clean = title.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  if (clean.length < 3) return true;
  if (GENERIC_TITLES.has(clean)) return true;
  if (/^(?:module|chapter|section|part|step)\s+\d+$/i.test(clean)) return true;
  return false;
}

export function cleanQueryString(query, goalContext = '') {
  if (!query) return '';
  let clean = query.replace(/[#*_`>\n]/g, ' ').replace(/\s+/g, ' ').trim();

  // Apply phonetic transcript overrides case-insensitively
  const phoneticMap = {
    'doc or': 'docker',
    'cooper netties': 'kubernetes',
    'sequel': 'sql',
    'giggle': 'git',
    'git hub': 'github',
    'ay double you es': 'aws',
    'next jay es': 'nextjs'
  };

  let lower = clean.toLowerCase();
  for (const [phonetic, replacement] of Object.entries(phoneticMap)) {
    if (lower.includes(phonetic)) {
      const regex = new RegExp(phonetic.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      clean = clean.replace(regex, replacement);
      lower = clean.toLowerCase();
    }
  }

  // Expand short acronyms/words under 3 characters (e.g. "js" -> "javascript")
  const shortWords = clean.split(/\s+/);
  const shortQueryMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'go': 'golang',
    'db': 'database'
  };

  const expandedWords = shortWords.map(w => {
    const wCleaned = w.replace(/[^a-zA-Z0-9]/g, '');
    const wLower = wCleaned.toLowerCase();
    if (wLower.length < 3 && shortQueryMap[wLower]) {
      return w.toLowerCase().replace(wLower, shortQueryMap[wLower]);
    }
    return w;
  });
  clean = expandedWords.join(' ');

  // Split into words again after expansion/phonetics
  const words = clean.split(/\s+/);

  // Remove common generic stop words from the query if they are accompanied by other words.
  const genericWords = new Set([
    'introduction', 'basics', 'overview', 'summary', 'setup', 'conclusion', 'deep-dive', 'deep', 'dive',
    'getting-started', 'getting', 'started', 'welcome', 'outro', 'wrap-up', 'wrap', 'up', 'next-steps',
    'module', 'chapter', 'section', 'part', 'step', 'tutorial', 'course', 'video', 'youtube'
  ]);

  if (words.length > 2) {
    const filtered = words.filter(w => !genericWords.has(w.toLowerCase().replace(/[^a-z0-9]/g, '')));
    if (filtered.length >= 2) {
      clean = filtered.join(' ');
    }
  }

  // If the title is generic, or if it doesn't mention the subject and goalContext is present:
  if (isGenericTitle(clean) && goalContext) {
    return `${goalContext.trim()} ${clean}`.trim();
  }

  // For specific titles, if it's very short (e.g., "State") and goalContext is "React",
  // we can prepend goalContext if it doesn't already contain it.
  if (clean.split(/\s+/).length <= 2 && goalContext) {
    const goalLower = goalContext.toLowerCase();
    const cleanLower = clean.toLowerCase();
    const wordsInClean = cleanLower.split(/\s+/);

    // Overlap checker: handles length >= 2 to catch JS, Go, Git, etc.
    // Normalized comparison to map "js" vs "javascript", "go" vs "golang"
    const normalizeWord = w => {
      const cleaned = w.replace(/[^a-z0-9]/g, '');
      return shortQueryMap[cleaned] || cleaned;
    };
    const normalizedCleanWords = wordsInClean.map(normalizeWord);
    const normalizedGoalWords = goalLower.split(/\s+/).map(normalizeWord);

    const hasOverlap = normalizedCleanWords.some(w =>
      w.length >= 2 && normalizedGoalWords.some(gw => gw.includes(w) || w.includes(gw))
    );

    if (!hasOverlap) {
      return `${goalContext.trim()} ${clean}`.trim();
    }
  }

  return clean;
}

function refineQueryWithHeuristics(query, context, goalContext = '') {
  const cleaned = cleanQueryString(query, goalContext);
  if (!isGenericTitle(cleaned)) {
    return cleaned;
  }

  // Generic title — try to use goalContext as anchor first
  if (goalContext) {
    return `${goalContext} ${cleaned}`.trim();
  }

  if (context && typeof context === 'string') {
    const headingMatch = context.match(/^(?:#|##|###)\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
      const topic = headingMatch[1].replace(/[#*_`>\[\]]/g, '').trim();
      if (topic && topic.length >= 3 && !isGenericTitle(topic)) {
        return topic;
      }
    }
  }

  return cleaned;
}

async function refineQueryWithGemini(query, context, geminiApiKey, goalContext = '') {
  const activeKey = resolveGeminiKey(geminiApiKey);
  if (!activeKey) {
    return refineQueryWithHeuristics(query, context, goalContext);
  }

  const contextSnippet = (context || '').substring(0, 1500).trim();
  if (!contextSnippet && !goalContext) {
    return refineQueryWithHeuristics(query, context, goalContext);
  }

  const goalLine = goalContext ? `\nOverall course/path subject: "${goalContext}"` : '';
  const prompt = `You are a search query refiner. Refine this video search query to be highly specific and suitable for finding high-quality YouTube videos matching the user's learning intent.

Original module title/query: "${query}"${goalLine}
Module content context:
"${contextSnippet || 'No content available yet.'}"

Rules:
- Adapt the query to the domain of the path/goal (e.g. self-improvement, tech, sciences, humanities, art).
- Generate a single, concise search query (maximum 4-6 words).
- If the target is a specific person (e.g. Arnold Schwarzenegger, Marcus Aurelius) or a mindset/motivational/lifestyle topic, use descriptive search keywords such as "mindset", "speech", "interview", "podcast", "motivation" or "lessons" combined with the key figure (e.g. "Arnold Schwarzenegger mindset speech interview").
- Do NOT blindly prefix the query with the subject if the query is already specific (e.g. if the query is "Arnold Schwarzenegger speeches", do not output "build mindset like arnold Arnold Schwarzenegger speeches"). Only prefix or combine with the subject if the query is too generic (like "Basics", "Introduction", "Setup", "Overview") and lacks context on its own.
- Keep the terms natural and optimized for YouTube's search box.
- Do NOT include words like "video", "youtube", "tutorial", "course" in the query unless they are highly appropriate for practical/programming walk-throughs.
- Return ONLY the final search query. No markdown. No quotes. No explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/["']/g, '').trim();
      if (text && text.length >= 2 && !isGenericTitle(text)) {
        console.log(`[Smartboard QueryRefiner] Refined "${query}" → "${text}"`);
        return text;
      }
    }
  } catch (err) {
    console.error('[Smartboard QueryRefiner] Gemini query refinement error:', err.message);
  }

  return refineQueryWithHeuristics(query, context, goalContext);
}

// ── Main orchestrator ──
export async function searchPerfectVideos({ query, context, goalContext = '', minRelevanceScore = 0, geminiApiKey = '' }) {
  if (!query || query.length < 2) return [];

  // Refine the query using context + goalContext to avoid generic searches
  let refinedQuery = query;
  if (resolveGeminiKey(geminiApiKey)) {
    refinedQuery = await refineQueryWithGemini(query, context, geminiApiKey, goalContext);
  } else {
    refinedQuery = refineQueryWithHeuristics(query, context, goalContext);
  }

  const contextHash = crypto
    .createHash('sha256')
    .update(`${refinedQuery}:${context || ''}:${goalContext || ''}`)
    .digest('hex');

  const cacheKey = `perfect_v2:${contextHash}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    console.log(`[Smartboard] Searching videos for: "${refinedQuery}" (original: "${query}")`);
    let results = [];

    // Strategy 0: YouTube Data API v3 (incl. Shorts) when key is set
    if (isYouTubeApiEnabled()) {
      const apiResults = await searchViaYouTubeApiStrict(refinedQuery, context, minRelevanceScore, geminiApiKey);
      if (apiResults.length > 0) {
        results = apiResults;
      }
    }

    // If we don't have enough videos (fewer than 8), run Strategy 1 (Gemini Search) to merge and deduplicate
    if (results.length < 8) {
      const candidates = await findYouTubeVideosViaGemini(refinedQuery, geminiApiKey);
      if (candidates.length > 0) {
        const verified = await verifyViaOEmbed(candidates.map(c => c.id));
        const embeddable = verified.filter(v => v.embeddable !== false);

        if (embeddable.length > 0) {
          const merged = embeddable.map(oe => {
            const candidate = candidates.find(c => c.id === oe.id);
            return {
              id: oe.id,
              title: oe.title || candidate?.title || '',
              channel: oe.channel || candidate?.channel || '',
              embeddable: true,
            };
          });

          const withDurations = await enrichWithDurations(merged);
          const ranked = await rankVideosWithGemini(withDurations, context || refinedQuery, geminiApiKey);

          const geminiResults = ranked
            .filter(v => v.relevanceScore >= minRelevanceScore)
            .map(v => ({ ...v, source: 'gemini_search' }));

          const existingIds = new Set(results.map(r => r.id));
          for (const r of geminiResults) {
            if (!existingIds.has(r.id)) {
              results.push(r);
              existingIds.add(r.id);
            }
          }
        }
      }
    }

    // If we still don't have enough results (fewer than 3), merge curated fallback
    if (results.length < 3) {
      console.log(`[Smartboard] Falling back to curated library for: "${refinedQuery}"`);
      const fallback = getCuratedFallback(refinedQuery);

      const fallbackVerified = await verifyViaOEmbed(fallback.map(v => v.id));
      const fallbackEmbeddable = fallback.filter(v =>
        fallbackVerified.find(oe => oe.id === v.id && oe.embeddable !== false)
      );

      const fallbackResults = (fallbackEmbeddable.length > 0 ? fallbackEmbeddable : fallback);
      const existingIds = new Set(results.map(r => r.id));
      for (const r of fallbackResults) {
        if (!existingIds.has(r.id)) {
          results.push(r);
          existingIds.add(r.id);
        }
      }
    }

    // Sort final results by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const finalResult = results.slice(0, 12);
    setCache(cacheKey, finalResult);
    return finalResult;
  } catch (err) {
    console.error('[Smartboard] searchPerfectVideos error:', err.message);
    const fallback = getCuratedFallback(refinedQuery);
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Study Session video scout — wraps searchPerfectVideos with playlist-shaped response.
 */
export async function scoutModuleVideos({ moduleTitle, keyConcepts = [], goalContext = '', contextText = '', geminiApiKey = '' }) {
  // Build a clean, unbloated search query focused on the core module subject
  const query = cleanQueryString(moduleTitle, goalContext);
  const context = [contextText, moduleTitle, goalContext, keyConcepts.join(', ')].filter(Boolean).join('. ');

  const ranked = await searchPerfectVideos({ query, context, goalContext, minRelevanceScore: 0, geminiApiKey });

  const videos = ranked.slice(0, 12).map((v, i) => {
    // Normalise relevanceScore (scale of 1-10) to 0-100 match percentage
    const rawScore = v.relevanceScore ?? 7;
    const matchPercent = rawScore > 10 ? rawScore : Math.round(rawScore * 10);
    
    return {
      videoId: v.id,
      title: v.title || '',
      channel: v.channel || '',
      label: i === 0 ? 'Best match' : `Related ${i + 1}`,
      matchScore: matchPercent,
    };
  });

  const primary = videos[0];

  return {
    videoId: primary?.videoId,
    title: primary?.title,
    videos,
    triggerSignal: videos.length > 0,
  };
}
