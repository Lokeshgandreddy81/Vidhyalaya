/**
 * YouTubeScout Worker — Finds educational YouTube videos for a given topic.
 *
 * Primary: Uses the official YouTube Data API (searchVideos).
 * Fallback: Uses programmatic searchVideosViaScraper to fetch real videos,
 * eliminating loose LLM grounding to prevent hallucinated video IDs.
 */

import { searchVideos, isYouTubeApiEnabled, searchVideosViaScraper } from '../../youtubeDataApi.js';

const MAX_RESULTS = 4;

/**
 * @param {{ topic: string, context: string, req: import('express').Request, abortSignal?: AbortSignal }} params
 * @returns {Promise<{ videos: Array<{ id: string, title: string, channel: string }> }>}
 */
export async function executeYouTubeScout({ topic, context, req, abortSignal }) {
  console.log(`[YouTubeScout] Scouting videos for topic: "${topic}"`);

  // Primary Path: Official YouTube Data API
  if (isYouTubeApiEnabled()) {
    try {
      if (abortSignal?.aborted) return { videos: [] };
      const results = await searchVideos(`${topic} tutorial explained`, MAX_RESULTS);

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
      console.warn(`[YouTubeScout] YouTube API failed: ${err.message}. Falling back to programmatic scraper.`);
    }
  }

  // Strict Fallback Sequence: Programmatic scraper runner (runs client fetch/scraping)
  try {
    if (abortSignal?.aborted) return { videos: [] };
    const scrapedResults = await searchVideosViaScraper(`${topic} tutorial explained`, MAX_RESULTS);
    
    if (scrapedResults && scrapedResults.length > 0) {
      const videos = scrapedResults.slice(0, MAX_RESULTS).map((v) => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
      }));
      console.log(`[YouTubeScout] Found ${videos.length} videos via programmatic scraper fallback for "${topic}"`);
      return { videos };
    }
  } catch (scrapeErr) {
    console.error(`[YouTubeScout] Programmatic scraper fallback failed: ${scrapeErr.message}`);
  }

  return { videos: [] };
}

