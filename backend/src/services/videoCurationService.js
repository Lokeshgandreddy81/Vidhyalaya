// Simple in-memory cache to prevent redundant API hits
const cache = new Map();

const YOUTUBE_AUTHORITY_CHANNELS = [
  'UC4a-Gbdw7vOaccHmFo40b9g', // Khan Academy
  'UCEWpbXPQIlPEH10vn482H4Q', // CrashCourse
  'UCsooa4yRKGN_zEE8iknghZA', // TED-Ed
  'UCsXVk37bltHxD1rDPwtNM8Q', // Kurzgesagt
  'UCoxcjq-8xIDTYp3uz647V5A', // Numberphile
  'UCs4aHmggTfFrpkPcWSaBN9g', // MIT OpenCourseWare
  'UCYO_jab_esuFRV4b17AJtAw', // 3Blue1Brown
];

/**
 * Extracts a clean 11-character YouTube Video ID from any URL or string
 */
export function sanitizeVideoId(idOrUrl) {
  if (!idOrUrl) return '';
  const clean = idOrUrl.trim();
  if (clean.length === 11 && !clean.includes('/') && !clean.includes('?')) return clean;
  const match = clean.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : clean;
}

/**
 * Extracts a searchable educational entity and Knowledge Milestones from raw context using Gemini
 */
async function extractSearchEntityAndMilestones(contextText) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const prompt = `You are an educational curator analyzing the topic: "${contextText.substring(0, 1000)}".
Return a JSON object containing:
1. "conceptQuery": A 4-5 word search query for YouTube.
2. "milestones": An array of 3 expected knowledge milestones. Each milestone must have:
   - "timestamp": A simulated number in seconds (e.g., 45, 120, 240).
   - "concept": A short label (String).
   - "summary": A brief one-sentence summary.
   - "difficultyScore": A number from 1 to 10.
Return ONLY valid JSON. Do not use quotes or prefixes.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content) {
      throw new Error('Failed to extract concept from Gemini');
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Gemini extraction error:', err.message);
    const fallbackQuery = contextText.split(' ').slice(0, 5).join(' ');
    return {
      conceptQuery: fallbackQuery,
      milestones: []
    };
  }
}

/**
 * Queries YouTube API for the highest quality educational video on the subject
 */
async function queryYouTubeForConcept(conceptQuery) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is not configured');

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.append('part', 'snippet');
  searchUrl.searchParams.append('q', conceptQuery);
  searchUrl.searchParams.append('type', 'video');
  searchUrl.searchParams.append('videoDefinition', 'high');
  searchUrl.searchParams.append('maxResults', '15');
  searchUrl.searchParams.append('key', YOUTUBE_API_KEY);

  const response = await fetch(searchUrl.toString());
  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  let bestVideo = data.items.find(item => YOUTUBE_AUTHORITY_CHANNELS.includes(item.snippet.channelId));
  
  if (!bestVideo) {
    bestVideo = data.items[0];
  }

  return {
    videoId: sanitizeVideoId(bestVideo.id.videoId),
    title: bestVideo.snippet.title,
    channelTitle: bestVideo.snippet.channelTitle
  };
}

/**
 * Main service function to get the perfect video for a given study context
 */
export async function getPerfectVideo(contextText) {
  if (!contextText || contextText.length < 20) {
    throw new Error('Context text too short to extract meaningful concepts');
  }

  // Hash the context simply for caching (using first 2000 chars to prevent collisions across different module topics)
  const cacheKey = Buffer.from(contextText.substring(0, 2000)).toString('base64');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const { conceptQuery, milestones } = await extractSearchEntityAndMilestones(contextText);
    const videoData = await queryYouTubeForConcept(conceptQuery);

    if (!videoData) {
      throw new Error('No suitable educational video found');
    }

    const result = {
      videoId: videoData.videoId,
      title: videoData.title,
      reason: `Matches core concept: "${conceptQuery}" from trusted source ${videoData.channelTitle}.`,
      milestones: milestones && milestones.length > 0 ? milestones : [
        { timestamp: 0, concept: "Introduction", summary: "Standard video metadata fallback", difficultyScore: 1 }
      ],
      triggerSignal: true
    };

    cache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error('Video Curation Error:', error.message);
    return {
      error: error.message,
      triggerSignal: false
    };
  }
}
