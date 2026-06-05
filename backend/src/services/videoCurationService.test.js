import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeVideoId, getPerfectVideo } from './videoCurationService.js';

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

  await t.test('extracts ID from YouTube watch URL with additional parameters', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from shortened youtu.be URL', () => {
    assert.strictEqual(sanitizeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('https://youtu.be/dQw4w9WgXcQ?t=42s'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube embed URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube v/ or e/ URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/v/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/e/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube Shorts URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube Live URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  await t.test('returns original string if no match found and not 11 chars', () => {
    assert.strictEqual(sanitizeVideoId('short'), 'short');
    assert.strictEqual(sanitizeVideoId('this-is-too-long-to-be-an-id'), 'this-is-too-long-to-be-an-id');
  });

  await t.test('handles IDs with underscores and hyphens', () => {
    const idWithSpecialChars = 'y-6_8-9_0-1';
    assert.strictEqual(sanitizeVideoId(idWithSpecialChars), idWithSpecialChars);
    assert.strictEqual(sanitizeVideoId(`https://youtu.be/${idWithSpecialChars}`), idWithSpecialChars);
  });

  await t.test('extracts ID from YouTube Shorts URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share'), 'dQw4w9WgXcQ');
  });

  await t.test('extracts ID from YouTube Live URL', () => {
    assert.strictEqual(sanitizeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(sanitizeVideoId('https://youtube.com/live/dQw4w9WgXcQ?feature=share'), 'dQw4w9WgXcQ');
  });
});

test('getPerfectVideo service', async (t) => {
  const originalEnv = { ...process.env };

  const embeddableHtml = JSON.stringify({
    playableInEmbed: true,
    status: 'OK',
  });

  const mockWatchPage = `<html><script>ytInitialPlayerResponse = {"playabilityStatus": ${embeddableHtml}, "videoDetails": {"title": "Test Video", "author": "Test Channel"}};</script></html>`;

  t.beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.YOUTUBE_API_KEY = 'test-youtube-key';
  });

  t.afterEach(() => {
    process.env = { ...originalEnv };
    t.mock.restoreAll();
  });

  await t.test('returns error if module title too short', async () => {
    const result = await getPerfectVideo('ab');
    assert.strictEqual(result.triggerSignal, false);
    assert.ok(result.error);
  });

  await t.test('returns perfect video on happy path', async () => {
    t.mock.method(global, 'fetch', async (url) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({ conceptQuery: 'quantum mechanics explained' }),
                }],
              },
            }],
          }),
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [{
              id: { videoId: 'dQw4w9WgXcQ' },
              snippet: {
                title: 'Quantum Mechanics for Beginners',
                channelTitle: 'Kurzgesagt',
                channelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
              },
            }],
          }),
        };
      }
      if (urlString.includes('youtube.com/watch')) {
        return { ok: true, text: async () => mockWatchPage };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const result = await getPerfectVideo(
      'This is a long enough context text about quantum mechanics for the happy path test.',
      { moduleTitle: 'Quantum Mechanics' }
    );

    assert.strictEqual(result.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(result.title, 'Test Video');
    assert.ok(result.videos?.length >= 1);
    assert.strictEqual(result.triggerSignal, true);
  });

  await t.test('handles Gemini failure and uses fallback query', async () => {
    t.mock.method(global, 'fetch', async (url) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return { ok: false, json: async () => ({}) };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [{
              id: { videoId: 'abc123xyz45' },
              snippet: { title: 'Fallback Video', channelTitle: 'Some Channel', channelId: 'UC_unknown' },
            }],
          }),
        };
      }
      if (urlString.includes('youtube.com/watch')) {
        return { ok: true, text: async () => mockWatchPage };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const result = await getPerfectVideo('Word1 Word2 Word3 Word4 Word5 extra text.', {
      moduleTitle: 'Word1 Word2 Word3',
    });

    assert.strictEqual(result.videoId, 'abc123xyz45');
    assert.strictEqual(result.triggerSignal, true);
  });

  await t.test('returns error object if no suitable video found', async () => {
    t.mock.method(global, 'fetch', async (url) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'obscure topic' }) }] } }],
          }),
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('googleapis.com/youtube')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const result = await getPerfectVideo('This context text is about a very obscure topic.', {
      moduleTitle: 'Obscure Topic Module',
    });

    assert.strictEqual(result.error, 'No suitable educational video found');
    assert.strictEqual(result.triggerSignal, false);
  });

  await t.test('returns cached result on subsequent calls', async () => {
    let fetchCallCount = 0;
    t.mock.method(global, 'fetch', async (url) => {
      fetchCallCount++;
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'caching test' }) }] } }],
          }),
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [{
              id: { videoId: 'cache123xyz' },
              snippet: { title: 'Cached Video', channelTitle: 'Cache Channel', channelId: 'UC_cache' },
            }],
          }),
        };
      }
      if (urlString.includes('youtube.com/watch')) {
        return { ok: true, text: async () => mockWatchPage };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const opts = { moduleTitle: 'Caching Test Module Unique' };
    const result1 = await getPerfectVideo('Unique context for caching test behavior.', opts);
    assert.strictEqual(result1.videoId, 'cache123xyz');
    const callsAfterFirst = fetchCallCount;

    const result2 = await getPerfectVideo('Unique context for caching test behavior.', opts);
    assert.strictEqual(result2.videoId, 'cache123xyz');
    assert.strictEqual(fetchCallCount, callsAfterFirst);
  });

  await t.test('returns error object when YOUTUBE_API_KEY is missing', async () => {
    delete process.env.YOUTUBE_API_KEY;

    t.mock.method(global, 'fetch', async (url) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'test' }) }] } }],
          }),
        };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const result = await getPerfectVideo('Context text for missing youtube key test.', {
      moduleTitle: 'Missing YouTube Key Test',
    });

    assert.strictEqual(result.error, 'YOUTUBE_API_KEY is not configured');
    assert.strictEqual(result.triggerSignal, false);
  });

  await t.test('handles network failure during YouTube fetch gracefully', async () => {
    t.mock.method(global, 'fetch', async (url) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'network error test' }) }] } }],
          }),
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('googleapis.com/youtube')) {
        throw new Error('Network connection failed');
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const result = await getPerfectVideo('Context text to test youtube network error.', {
      moduleTitle: 'Network Error Test Module',
    });

    assert.strictEqual(result.error, 'Network connection failed');
    assert.strictEqual(result.triggerSignal, false);
  });
});
