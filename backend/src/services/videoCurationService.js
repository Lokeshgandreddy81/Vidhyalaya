const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;
const FETCH_TIMEOUT = 5000;

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

// ── Step 1: Use Gemini + Google Search to find real YouTube videos ──
async function findYouTubeVideosViaGemini(query) {
  const cacheKey = `gemini_search:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are a video research assistant. Search YouTube for high-quality educational content about: "${query}"

Return a JSON object with this exact structure:
{
  "videos": [
    {"id": "11-char-youtube-id", "title": "exact video title", "channel": "channel name"},
    {"id": "11-char-youtube-id", "title": "exact video title", "channel": "channel name"}
  ]
}

Rules:
- Find 5-10 real YouTube videos specifically about "${query}".
- The "id" MUST be the exact 11-character YouTube video ID.
- Prefer: freeCodeCamp, Fireship, Traversy Media, MIT OpenCourseWare, 3Blue1Brown, Programming with Mosh, Web Dev Simplified, Khan Academy, CrashCourse, Computerphile, Academind, Ben Eater, NeetCode.
- Only include videos that are actually about the topic.
- Prefer videos with at least 50k views.
- Return ONLY the JSON object. No markdown. No explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
      const res = await fetchWithTimeout(url, 3000);

      if (res.ok) {
        const data = await res.json();
        const result = {
          id,
          title: data.title || '',
          channel: data.author_name || '',
          embeddable: true,
        };
        setCache(cacheKey, result);
        results.push(result);
      } else if (res.status === 404) {
        // Video doesn't exist
        const result = { id, title: '', channel: '', embeddable: false };
        setCache(cacheKey, result);
        results.push(result);
      } else {
        // 401/403 = might exist but embedding disabled — still try scraping
        results.push({ id, title: '', channel: '', embeddable: null }); // null = unknown
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
async function rankVideosWithGemini(videos, learningContext) {
  if (!videos || videos.length === 0) return [];
  if (!learningContext || learningContext.length < 5) {
    return videos.map(v => ({ ...v, relevanceScore: 5 }));
  }

  const cacheKey = `rank:${learningContext.substring(0, 120)}:${videos.map(v => v.id).join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const catalog = videos.map((v, i) =>
    `[${i + 1}] "${v.title || 'Unknown'}" by ${v.channel || 'Unknown'} (${v.durationFormatted || '?'})`
  ).join('\n');

  const prompt = `You are an expert educational video curator. Rank these YouTube videos by relevance to the learning context.

LEARNING CONTEXT: "${learningContext.substring(0, 2000)}"

VIDEOS:
${catalog}

Return a JSON array of objects: [{ "index": number, "relevanceScore": 1-10, "reason": "brief reason" }]
Sort by relevanceScore descending.

Scoring rules:
- 10 = Perfect match. Exactly the right topic at the right depth. Authoritative channel.
- 8-9 = Excellent. Highly relevant, covers the core concepts well.
- 6-7 = Good. Relevant but may cover adjacent topics rather than the exact subject.
- 4-5 = Decent. Tangentially related or too basic/advanced for the context.
- 1-3 = Poor. Barely related or wrong topic.
Score MUST be integer between 1 and 10. Return ONLY the JSON array.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      }
    );

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
    return videos.map(v => ({ ...v, relevanceScore: 5 }));
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
  }));
}

// ── Main orchestrator ──
export async function searchPerfectVideos({ query, context, minRelevanceScore = 0 }) {
  if (!query || query.length < 2) return [];

  const cacheKey = `perfect:${query}:${(context || '').substring(0, 60)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Strategy 1: Gemini + Google Search + oEmbed + scraping
    console.log(`[Smartboard] Searching videos for: "${query}"`);
    const candidates = await findYouTubeVideosViaGemini(query);

    if (candidates.length > 0) {
      // Verify via oEmbed
      const verified = await verifyViaOEmbed(candidates.map(c => c.id));
      const embeddable = verified.filter(v => v.embeddable !== false);

      if (embeddable.length > 0) {
        // Merge metadata from oEmbed
        const merged = embeddable.map(oe => {
          const candidate = candidates.find(c => c.id === oe.id);
          return {
            id: oe.id,
            title: oe.title || candidate?.title || '',
            channel: oe.channel || candidate?.channel || '',
            embeddable: true,
          };
        });

        // Get real durations via scraping
        const withDurations = await enrichWithDurations(merged);

        // Rank against learning context
        const ranked = await rankVideosWithGemini(withDurations, context || query);

        const result = ranked
          .filter(v => v.relevanceScore >= minRelevanceScore)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10);

        if (result.length >= 3) {
          console.log(`[Smartboard] ${result.length} videos found via Gemini+oEmbed+scraping`);
          setCache(cacheKey, result);
          return result;
        }
      }
    }

    // Strategy 2: Fall back to curated library
    console.log(`[Smartboard] Falling back to curated library for: "${query}"`);
    const fallback = getCuratedFallback(query);

    // Try to verify curated videos via oEmbed
    const fallbackVerified = await verifyViaOEmbed(fallback.map(v => v.id));
    const fallbackEmbeddable = fallback.filter(v =>
      fallbackVerified.find(oe => oe.id === v.id && oe.embeddable !== false)
    );

    const result = (fallbackEmbeddable.length > 0 ? fallbackEmbeddable : fallback).slice(0, 8);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[Smartboard] searchPerfectVideos error:', err.message);
    // Ultimate fallback: curated library
    const fallback = getCuratedFallback(query);
    setCache(cacheKey, fallback);
    return fallback;
  }
}
