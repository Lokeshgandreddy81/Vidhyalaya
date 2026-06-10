/**
 * YouTube Data API v3 — search, metadata, chapters, flexible embed verification.
 * Set YOUTUBE_API_KEY in backend/.env
 */

import { parseDescriptionChapters, sanitizeVideoId } from './youtubeService.js';

const BASE = 'https://www.googleapis.com/youtube/v3';
const OEMBED_TIMEOUT = 4000;

function getApiKey() {
  return process.env.YOUTUBE_API_KEY?.trim() || '';
}

export function isYouTubeApiEnabled() {
  const key = getApiKey();
  return key.length > 20 && !key.includes('your_key');
}

function parseISODuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0', 10) * 3600)
    + (parseInt(match[2] || '0', 10) * 60)
    + parseInt(match[3] || '0', 10);
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function apiFetch(path, params = {}) {
  const key = getApiKey();
  if (!key) return null;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('key', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.warn(`[YouTubeAPI] ${path} → ${res.status}: ${err.substring(0, 120)}`);
    return null;
  }
  return res.json();
}

/** oEmbed check — tries watch URL then Shorts URL. */
export async function checkOEmbedEmbeddable(videoId) {
  const id = sanitizeVideoId(videoId);
  if (!id) return { embeddable: false, id: '' };

  const urls = [
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtu.be/${id}`,
  ];

  for (const pageUrl of urls) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(OEMBED_TIMEOUT) });
      if (res.ok) {
        const data = await res.json();
        return {
          id,
          embeddable: true,
          title: data.title || '',
          channel: data.author_name || '',
        };
      }
      if (res.status === 404) {
        continue;
      }
    } catch {
      /* try next URL format */
    }
  }

  return { id, embeddable: false, title: '', channel: '' };
}

function mapSearchItems(data, detailMap) {
  if (!data?.items?.length) return [];

  return data.items
    .map(item => {
      const id = item.id?.videoId;
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
      const detail = detailMap.get(id);
      const snippet = item.snippet || {};
      const durationSeconds = detail?.durationSeconds || 0;
      return {
        id,
        title: detail?.title || snippet.title || '',
        channel: detail?.channel || snippet.channelTitle || '',
        channelId: snippet.channelId || detail?.channelId || '',
        description: detail?.description || snippet.description || '',
        durationSeconds,
        durationFormatted: detail?.durationFormatted || formatDuration(durationSeconds),
        viewCount: detail?.viewCount || 0,
        embeddable: detail ? detail.embeddable !== false : true,
        isShort: durationSeconds > 0 && durationSeconds <= 60,
        publishedAt: snippet.publishedAt || '',
      };
    })
    .filter(Boolean);
}

async function runSearchQuery(params) {
  const cleanQ = params.q ? `${params.q} -reaction -vlog -gaming -parody -meme -review -trailer -shorts`.trim() : '';
  const data = await apiFetch('/search', {
    part: 'snippet',
    type: 'video',
    relevanceLanguage: 'en',
    maxResults: 15,
    ...params,
    ...(cleanQ ? { q: cleanQ } : {}),
  });
  if (!data?.items?.length) return [];

  const ids = data.items
    .map(item => item.id?.videoId)
    .filter(id => id && /^[A-Za-z0-9_-]{11}$/.test(id));

  if (!ids.length) return [];

  const details = await getVideosByIds(ids);
  const detailMap = new Map(details.map(v => [v.id, v]));
  return mapSearchItems(data, detailMap).filter(v => v.embeddable !== false);
}

/**
 * Scrape public YouTube search page to extract search results without API key/limits.
 */
export async function searchVideosViaScraper(query, maxResults = 15) {
  if (!query?.trim()) return [];
  const q = `${query.trim()} -reaction -vlog -gaming -parody -meme -review -trailer -shorts`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[YouTubeScraper] Fetch search page failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*(\{.+?\})\s*;/);
    if (!match) {
      console.warn('[YouTubeScraper] Could not find ytInitialData in HTML');
      return [];
    }

    const data = JSON.parse(match[1]);
    const videos = [];
    const seen = new Set();

    function findVideoRenderers(obj) {
      if (!obj || typeof obj !== 'object') return;

      if (obj.videoRenderer) {
        const vr = obj.videoRenderer;
        const videoId = vr.videoId;
        if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) && !seen.has(videoId)) {
          seen.add(videoId);

          const title = vr.title?.runs?.[0]?.text || vr.title?.accessibility?.accessibilityData?.label || '';
          const channel = vr.ownerText?.runs?.[0]?.text || '';
          const durationText = vr.lengthText?.simpleText || '';

          // Parse duration to seconds (e.g. "13:49" or "1:03:41")
          let durationSeconds = 0;
          if (durationText) {
            const parts = durationText.split(':').map(p => parseInt(p, 10));
            if (parts.every(p => !isNaN(p))) {
              if (parts.length === 2) {
                durationSeconds = parts[0] * 60 + parts[1];
              } else if (parts.length === 3) {
                durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }
            }
          }

          // Parse view count (e.g. "684,518 views" or "134K views")
          let viewCount = 0;
          const viewText = vr.viewCountText?.simpleText || '';
          if (viewText) {
            const cleanText = viewText.toLowerCase().replace(/[^a-z0-9]/g, '');
            const numMatch = viewText.replace(/,/g, '').match(/\d+/);
            if (numMatch) {
              viewCount = parseInt(numMatch[0], 10);
              if (cleanText.includes('k')) viewCount *= 1000;
              else if (cleanText.includes('m')) viewCount *= 1000000;
              else if (cleanText.includes('b')) viewCount *= 1000000000;
            }
          }

          videos.push({
            id: videoId,
            title,
            channel,
            channelId: vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '',
            description: vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '',
            durationSeconds,
            durationFormatted: durationText,
            viewCount,
            embeddable: true,
            isShort: durationSeconds > 0 && durationSeconds <= 60,
            publishedAt: vr.publishedTimeText?.simpleText || '',
          });
        }
      }

      for (const key of Object.keys(obj)) {
        findVideoRenderers(obj[key]);
      }
    }

    findVideoRenderers(data);
    console.log(`[YouTubeScraper] Scraped ${videos.length} videos for query "${q}"`);
    return videos.slice(0, maxResults);
  } catch (err) {
    console.error('[YouTubeScraper] Scraper error:', err.message);
    return [];
  }
}

/**
 * Execute API search queries without Shorts filter.
 */
async function runApiSearch(query, maxResults = 15) {
  const q = query.trim();
  const seen = new Set();
  const merged = [];

  const push = (hits) => {
    for (const hit of hits) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        merged.push(hit);
      }
    }
  };

  // Pass 1: embeddable, relevance
  push(await runSearchQuery({
    q,
    videoEmbeddable: 'true',
    order: 'relevance',
    maxResults: Math.min(maxResults, 20),
  }));

  // Pass 2: relaxed — no embeddable filter, verify via details API
  if (merged.length < 3) {
    push(await runSearchQuery({
      q,
      order: 'relevance',
      maxResults: 12,
    }));
  }

  // Pass 3: shorter query
  if (merged.length < 2) {
    const shortQ = q.split(/\s+/).slice(0, 3).join(' ');
    if (shortQ.length >= 2 && shortQ !== q) {
      push(await runSearchQuery({
        q: shortQ,
        videoEmbeddable: 'true',
        order: 'viewCount',
        maxResults: 10,
      }));
    }
  }

  return merged.slice(0, maxResults);
}

/** Search embeddable videos — API first with Scraper fallback. */
export async function searchVideos(query, maxResults = 15) {
  if (!query?.trim()) return [];

  if (isYouTubeApiEnabled()) {
    try {
      const apiResults = await runApiSearch(query, maxResults);
      if (apiResults && apiResults.length >= 3) {
        console.log(`[YouTubeDataApi] API search succeeded with ${apiResults.length} videos`);
        return apiResults;
      }
    } catch (err) {
      console.warn('[YouTubeDataApi] API search failed, falling back to scraper:', err.message);
    }
  }

  // Fallback to scraper if API is disabled, rate-limited, or returned too few results
  return searchVideosViaScraper(query, maxResults);
}


/** Batch fetch video metadata by ID. */
export async function getVideosByIds(videoIds) {
  if (!isYouTubeApiEnabled()) return [];

  const ids = [...new Set(videoIds.map(sanitizeVideoId).filter(Boolean))].slice(0, 50);
  if (!ids.length) return [];

  const data = await apiFetch('/videos', {
    part: 'snippet,contentDetails,statistics,status',
    id: ids.join(','),
  });

  if (!data?.items?.length) return [];

  return data.items.map(item => {
    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const status = item.status || {};
    const contentDetails = item.contentDetails || {};
    const durationSeconds = parseISODuration(contentDetails.duration);

    // Check region restrictions (block list / allow list)
    const regionRestriction = contentDetails.regionRestriction || {};
    const blockedCountries = regionRestriction.blocked || [];
    const allowedCountries = regionRestriction.allowed || [];

    // Check age restrictions
    const contentRating = contentDetails.contentRating || {};
    const isAgeRestricted = contentRating.ytRating === 'ytAgeRestricted';

    // Verify embeddable, privacy, and rating constraints
    const embeddable = status.embeddable !== false &&
                       status.privacyStatus === 'public' &&
                       !isAgeRestricted;

    return {
      id: item.id,
      title: snippet.title || '',
      channel: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      description: snippet.description || '',
      durationSeconds,
      durationFormatted: formatDuration(durationSeconds),
      viewCount: parseInt(stats.viewCount || '0', 10),
      likeCount: parseInt(stats.likeCount || '0', 10),
      embeddable,
      isShort: durationSeconds > 0 && durationSeconds <= 60,
      tags: snippet.tags || [],
    };
  });
}

/**
 * Verify embeddability — Data API first, oEmbed fallback for gaps (incl. Shorts).
 */
export async function verifyEmbeddableVideos(videoIds) {
  const ids = [...new Set(videoIds.map(sanitizeVideoId).filter(Boolean))].slice(0, 30);
  if (!ids.length) return [];

  const results = new Map();

  if (isYouTubeApiEnabled()) {
    const details = await getVideosByIds(ids);
    for (const v of details) {
      if (v.embeddable !== false && v.id) {
        results.set(v.id, {
          id: v.id,
          title: v.title,
          channel: v.channel,
          embeddable: true,
          durationSeconds: v.durationSeconds,
          durationFormatted: v.durationFormatted,
          viewCount: v.viewCount,
          isShort: v.isShort,
        });
      }
    }
  }

  // oEmbed fallback for IDs the API missed or marked unavailable
  const missing = ids.filter(id => !results.has(id));
  await Promise.all(missing.map(async (id) => {
    const oe = await checkOEmbedEmbeddable(id);
    if (oe.embeddable) {
      results.set(id, {
        id,
        title: oe.title || '',
        channel: oe.channel || '',
        embeddable: true,
        durationFormatted: '',
        viewCount: 0,
      });
    }
  }));

  return [...results.values()];
}

/** Chapters + metadata via Data API description. */
export async function getVideoChaptersViaApi(videoId) {
  const id = sanitizeVideoId(videoId);
  if (!id || !isYouTubeApiEnabled()) return null;

  const videos = await getVideosByIds([id]);
  const video = videos[0];
  if (!video) return null;

  const chapters = parseDescriptionChapters(video.description);
  const durationSecs = video.durationSeconds || 0;

  const chaptersWithEnd = chapters.map((ch, i) => ({
    ...ch,
    endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
  }));

  return {
    chapters: chaptersWithEnd,
    videoTitle: video.title,
    author: video.channel,
    durationSecs,
    description: video.description,
    viewCount: video.viewCount,
  };
}
