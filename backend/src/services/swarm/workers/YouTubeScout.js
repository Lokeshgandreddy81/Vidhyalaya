/**
 * YouTubeScout Worker — Finds educational YouTube videos for a given topic.
 *
 * Primary: Uses the existing YouTube Data API (searchVideos).
 * Fallback: Uses Gemini with Google Search grounding when API key is missing.
 */

import { searchVideos, isYouTubeApiEnabled } from '../../youtubeDataApi.js';
import { callAIEngine } from '../../../utils/aiClientRouter.js';

const MAX_RESULTS = 4;

/**
 * @param {{ topic: string, context: string, req: import('express').Request }} params
 * @returns {Promise<{ videos: Array<{ id: string, title: string, channel: string }> }>}
 */
export async function executeYouTubeScout({ topic, context, req }) {
  // Primary path: Use the existing YouTube Data API
  if (isYouTubeApiEnabled()) {
    try {
      const results = await searchVideos(`${topic} tutorial explained`, MAX_RESULTS + 2);

      if (results && results.length > 0) {
        const videos = results.slice(0, MAX_RESULTS).map((v) => ({
          id: v.id,
          title: v.title,
          channel: v.channel,
        }));

        console.log(`[YouTubeScout] Found ${videos.length} videos via API for "${topic}"`);
        return { videos };
      }
    } catch (err) {
      console.warn(`[YouTubeScout] YouTube API failed, falling back to Gemini grounding: ${err.message}`);
    }
  }

  // Fallback: Gemini with Google Search grounding
  const prompt = `Find ${MAX_RESULTS} high-quality educational YouTube videos about "${topic}".
Context: ${context || 'General learning'}

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  { "id": "youtube_video_id", "title": "Video Title", "channel": "Channel Name" }
]

Focus on:
- Tutorial and explainer videos from reputable educational channels
- Recent, well-viewed content
- Videos that are actually embeddable on third-party sites
- Return real YouTube video IDs (11 characters, alphanumeric with hyphens/underscores)`;

  const text = await callAIEngine({
    req,
    prompt,
    systemInstruction: 'You are a YouTube video researcher. Return only valid JSON arrays. No markdown fences.',
    temperature: 0.1,
    maxOutputTokens: 1024,
    timeoutMs: 4000,
    tools: [{ googleSearch: {} }],
  });

  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      const videos = parsed.slice(0, MAX_RESULTS).map((v) => ({
        id: String(v.id || ''),
        title: String(v.title || ''),
        channel: String(v.channel || ''),
      })).filter((v) => v.id.length > 0);

      console.log(`[YouTubeScout] Found ${videos.length} videos via Gemini grounding for "${topic}"`);
      return { videos };
    }
  } catch (parseErr) {
    console.warn(`[YouTubeScout] Failed to parse Gemini grounding response: ${parseErr.message}`);
  }

  return { videos: [] };
}
