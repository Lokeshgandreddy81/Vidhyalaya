/**
 * Shared YouTube utilities — embeddability checks, page fetching, chapter parsing.
 */

const videoCache = new Map();
const chapterCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function sanitizeVideoId(idOrUrl) {
  if (!idOrUrl || typeof idOrUrl !== 'string') return '';
  const clean = idOrUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : clean;
}

export async function fetchYouTubePage(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/** Parse timestamp from YouTube chapter URL — supports t=120, t=120s, t=1m30s */
function parseTimestampFromUrl(url) {
  if (!url) return 0;
  const tMatch = url.match(/[?&]t=(\d+)/);
  if (tMatch) return parseInt(tMatch[1], 10);
  return 0;
}

export function parseDescriptionChapters(description) {
  if (!description) return [];
  const lines = description.split('\n');
  const chapters = [];
  const tsRegex = /(?:[([ ]|^)(\d{1,2}:)?(\d{1,2}):(\d{2})(?=[\])]| |$)/;

  for (const line of lines) {
    const m = line.match(tsRegex);
    if (m) {
      const hours = m[1] ? parseInt(m[1], 10) : 0;
      const mins = parseInt(m[2], 10);
      const secs = parseInt(m[3], 10);
      const startSecs = hours * 3600 + mins * 60 + secs;
      let title = line.replace(m[0], '').replace(/^[ \-–—:|]+|[ \-–—:|]+$/g, '').trim();
      if (title.length > 0 && title.length < 120) {
        chapters.push({ title, startSecs });
      }
    }
  }

  const unique = chapters
    .sort((a, b) => a.startSecs - b.startSecs)
    .filter((ch, i, arr) => i === 0 || ch.startSecs !== arr[i - 1].startSecs);

  return unique.length >= 2 ? unique : [];
}

export function parseYTChapters(playerResponse) {
  try {
    const panels = playerResponse?.engagementPanels || [];
    for (const panel of panels) {
      const chapters =
        panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
      if (chapters && Array.isArray(chapters)) {
        const result = [];
        for (const c of chapters) {
          const renderer = c.macroMarkersListItemRenderer;
          if (!renderer) continue;
          const title = renderer.title?.simpleText || renderer.title?.runs?.[0]?.text || '';
          if (!title) continue;
          const url = renderer.onTap?.commandMetadata?.webCommandMetadata?.url;
          result.push({ title, startSecs: parseTimestampFromUrl(url) });
        }
        if (result.length > 0) return result;
      }
    }

    const markersMap =
      playerResponse?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer
        ?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap;

    if (markersMap) {
      for (const marker of Object.values(markersMap)) {
        const chapters = marker?.value?.chapters;
        if (chapters && Array.isArray(chapters)) {
          return chapters
            .map(c => ({
              title: c.chapterRenderer?.title?.simpleText || c.chapterRenderer?.title?.runs?.[0]?.text || '',
              startSecs: Math.floor((c.chapterRenderer?.timeRangeStartMillis || 0) / 1000),
            }))
            .filter(c => c.title);
        }
      }
    }
  } catch (e) {
    console.warn('[chapters] parseYTChapters error:', e.message);
  }
  return [];
}

export async function checkEmbeddable(videoId) {
  const id = sanitizeVideoId(videoId);
  if (!id) return { embeddable: false, id: '' };

  const cached = videoCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return { id, ...cached.result };

  try {
    const html = await fetchYouTubePage(id);
    const playerResponse = parsePlayerResponse(html);
    if (!playerResponse) return { id, embeddable: false };

    const playabilityStatus = playerResponse?.playabilityStatus;
    const videoDetails = playerResponse?.videoDetails;
    const isEmbeddable = playabilityStatus?.playableInEmbed === true;
    const isAvailable = playabilityStatus?.status === 'OK';

    const result = {
      embeddable: isEmbeddable && isAvailable,
      title: videoDetails?.title || '',
      author: videoDetails?.author || '',
    };
    videoCache.set(id, { result, ts: Date.now() });
    return { id, ...result };
  } catch (err) {
    console.error(`[verify] Error checking ${id}:`, err.message);
    return { id, embeddable: false };
  }
}

export async function verifyVideoIds(ids) {
  const unique = [...new Set(ids.map(sanitizeVideoId).filter(Boolean))];
  const results = await Promise.all(unique.map(id => checkEmbeddable(id)));
  return results;
}

export async function getVideoChapters(videoId) {
  const id = sanitizeVideoId(videoId);
  if (!id) return { chapters: [], videoTitle: '', author: '' };

  const cached = chapterCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { chapters: cached.chapters, videoTitle: cached.videoTitle, author: cached.author };
  }

  try {
    const html = await fetchYouTubePage(id);
    const playerResponse = parsePlayerResponse(html);
    if (!playerResponse) return { chapters: [], videoTitle: '', author: '' };

    const videoDetails = playerResponse?.videoDetails;
    const description = videoDetails?.shortDescription || '';
    const title = videoDetails?.title || '';
    const durationSecs = parseInt(videoDetails?.lengthSeconds || '0', 10);
    const author = videoDetails?.author || '';

    let chapters = parseYTChapters(playerResponse);
    if (chapters.length === 0) chapters = parseDescriptionChapters(description);

    const chaptersWithEnd = chapters.map((ch, i) => ({
      ...ch,
      endSecs: chapters[i + 1]?.startSecs ?? durationSecs,
    }));

    chapterCache.set(id, { chapters: chaptersWithEnd, videoTitle: title, author, ts: Date.now() });
    return { chapters: chaptersWithEnd, videoTitle: title, author };
  } catch (err) {
    console.error(`[chapters] Error for ${id}:`, err.message);
    return { chapters: [], videoTitle: '', author: '' };
  }
}

/** Score how well a video title/channel matches the module topic (0–100). */
export function scoreTopicRelevance(video, moduleTitle, keyConcepts = []) {
  const haystack = `${video.title || ''} ${video.author || video.channelTitle || ''}`.toLowerCase();
  const keywords = [
    ...moduleTitle.toLowerCase().split(/\s+/),
    ...keyConcepts.flatMap(c => c.toLowerCase().split(/\s+/)),
  ].filter(w => w.length > 2);

  if (keywords.length === 0) return 50;

  let score = 0;
  const uniqueKeywords = [...new Set(keywords)];
  for (const kw of uniqueKeywords) {
    if (haystack.includes(kw)) score += 12;
  }

  const titleLower = moduleTitle.toLowerCase();
  if (haystack.includes(titleLower)) score += 25;

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
  if (authorityChannels.some(ch => haystack.includes(ch))) score += 10;

  return Math.min(99, Math.max(40, score));
}
