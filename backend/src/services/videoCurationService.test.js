import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeVideoId, searchPerfectVideos } from './videoCurationService.js';

test('sanitizeVideoId utility', async (t) => {
  await t.test('returns empty string for null/undefined/empty input', () => {
    assert.strictEqual(sanitizeVideoId(null), '');
    assert.strictEqual(sanitizeVideoId(undefined), '');
    assert.strictEqual(sanitizeVideoId(''), '');
  });

  await t.test('returns empty string for non-string inputs', () => {
    assert.strictEqual(sanitizeVideoId(123), '');
    assert.strictEqual(sanitizeVideoId({}), '');
    assert.strictEqual(sanitizeVideoId([]), '');
  });

  await t.test('returns the same string if it is already a valid 11-char ID', () => {
    const validId = 'dQw4w9WgXcQ';
    assert.strictEqual(sanitizeVideoId(validId), validId);
  });

  await t.test('trims whitespace from 11-char ID', () => {
    const validId = 'dQw4w9WgXcQ';
    assert.strictEqual(sanitizeVideoId('  ' + validId + '  '), validId);
  });

  await t.test('extracts ID from standard YouTube watch URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from shortened youtu.be URL', () => {
    assert.strictEqual(sanitizeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube Shorts URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });
});

test('searchPerfectVideos service', async (t) => {
  const originalEnv = { ...process.env };

  t.beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-long-enough-for-validation';
  });

  t.afterEach(() => {
    process.env = { ...originalEnv };
    t.mock.restoreAll();
  });

  await t.test('returns empty array if query is too short', async () => {
    const result = await searchPerfectVideos({ query: 'a' });
    assert.deepStrictEqual(result, { videos: [], fallbackActive: true, fallbackReason: 'LIVE_SEARCH_EMPTY' });
  });

  await t.test('returns curated fallback videos if Gemini API fails', async () => {
    // Mock fetch to simulate Gemini API failure
    t.mock.method(global, 'fetch', async () => {
      return {
        ok: false,
        text: async () => 'API Key invalid'
      };
    });

    const result = await searchPerfectVideos({ query: 'javascript tutorial' });
    assert.ok(Array.isArray(result.videos));
    assert.ok(result.videos.length > 0);
    // Should match one of JavaScript curated fallbacks
    assert.ok(result.videos.some(v => v.title.toLowerCase().includes('javascript')));
  });

  await t.test('returns ranked videos from Gemini search on happy path', async () => {
    t.mock.method(global, 'fetch', async (url, options) => {
      const urlString = url.toString();
      const bodyText = options && options.body ? options.body.toString() : '';
      
      // Mock Gemini Search
      if (urlString.includes('generateContent') && (bodyText.includes('googleSearch') || bodyText.includes('Search YouTube'))) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    videos: [
                      { id: 'dQw4w9WgXcQ', title: 'JS Course 1', channel: 'fCC' },
                      { id: 'ab123xyz789', title: 'JS Course 2', channel: 'fCC' },
                      { id: 'ef456uvw123', title: 'JS Course 3', channel: 'fCC' }
                    ]
                  })
                }]
              }
            }]
          })
        };
      }

      // Mock oEmbed
      if (urlString.includes('youtube.com/oembed')) {
        return {
          ok: true,
          json: async () => ({
            title: 'JS Course',
            author_name: 'fCC'
          })
        };
      }

      // Mock YouTube page scraper for duration
      if (urlString.includes('youtube.com/watch')) {
        return {
          ok: true,
          text: async () => 'ytInitialPlayerResponse = { "videoDetails": { "lengthSeconds": "3600" } };'
        };
      }

      // Mock Gemini Re-ranking
      if (urlString.includes('generateContent') && (bodyText.includes('Rank these YouTube') || bodyText.includes('relevanceScore'))) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify([
                    { index: 1, relevanceScore: 10, reason: 'Highly relevant' },
                    { index: 2, relevanceScore: 8, reason: 'Relevant' },
                    { index: 3, relevanceScore: 7, reason: 'Decent' }
                  ])
                }]
              }
            }]
          })
        };
      }

      return { ok: false };
    });

    const result = await searchPerfectVideos({ query: 'JS Course', context: 'JavaScript basics' });
    assert.ok(Array.isArray(result.videos));
    assert.ok(result.videos.length > 0);
    assert.strictEqual(result.videos[0].id, 'dQw4w9WgXcQ');
  });
});
