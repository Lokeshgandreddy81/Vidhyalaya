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
  // Store original environment variables to restore them after tests
  const originalEnv = { ...process.env };

  t.beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.YOUTUBE_API_KEY = 'test-youtube-key';
  });

  t.afterEach(() => {
    process.env = { ...originalEnv };
    t.mock.restoreAll();
  });

  await t.test('throws error if contextText is too short', async () => {
    await assert.rejects(
      async () => await getPerfectVideo('Too short'),
      { message: 'Context text too short to extract meaningful concepts' }
    );
  });

  await t.test('returns perfect video on happy path', async () => {
    // Mock fetch to simulate Gemini and YouTube responses
    t.mock.method(global, 'fetch', async (url, options) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        conceptQuery: 'quantum mechanics explained',
                        milestones: [
                          { timestamp: 10, concept: 'Intro', summary: 'Introduction to quantum', difficultyScore: 3 }
                        ]
                      })
                    }
                  ]
                }
              }
            ]
          })
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('youtube.com/v3/search') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: { videoId: 'dQw4w9WgXcQ' },
                snippet: {
                  title: 'Quantum Mechanics for Beginners',
                  channelTitle: 'Kurzgesagt',
                  channelId: 'UCsXVk37bltHxD1rDPwtNM8Q' // Authority channel
                }
              }
            ]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({ items: [] })
      };
    });

    // Unique context text to avoid caching
    const contextText = 'This is a long enough context text about quantum mechanics for the happy path test.';
    const result = await getPerfectVideo(contextText);

    assert.strictEqual(result.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(result.title, 'Quantum Mechanics for Beginners');
    assert.ok(result.reason.includes('quantum mechanics explained'));
    assert.ok(result.reason.includes('Kurzgesagt'));
    assert.strictEqual(result.milestones.length, 1);
    assert.strictEqual(result.milestones[0].concept, 'Intro');
    assert.strictEqual(result.triggerSignal, true);
  });

  await t.test('handles Gemini failure and uses fallback query', async () => {
    t.mock.method(global, 'fetch', async (url, options) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        // Simulate Gemini failure
        return {
          ok: false,
          json: async () => ({})
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('youtube.com/v3/search') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: { videoId: 'abc123xyz45' },
                snippet: {
                  title: 'Fallback Video',
                  channelTitle: 'Some Channel',
                  channelId: 'UC_unknown'
                }
              }
            ]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({ items: [] })
      };
    });

    const contextText = 'Word1 Word2 Word3 Word4 Word5 extra text for fallback test.';
    const result = await getPerfectVideo(contextText);

    assert.strictEqual(result.videoId, 'abc123xyz45');
    assert.strictEqual(result.title, 'Fallback Video');
    assert.ok(result.reason.includes('Word1 Word2 Word3 Word4 Word5'));
    assert.strictEqual(result.triggerSignal, true);
    // Fallback milestones
    assert.strictEqual(result.milestones.length, 1);
    assert.strictEqual(result.milestones[0].concept, 'Introduction');
  });

  await t.test('returns error object if no suitable video found', async () => {
    t.mock.method(global, 'fetch', async (url, options) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        conceptQuery: 'obscure topic',
                        milestones: []
                      })
                    }
                  ]
                }
              }
            ]
          })
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('youtube.com/v3/search') || urlString.includes('googleapis.com/youtube')) {
        // Simulate no videos found
        return {
          ok: true,
          json: async () => ({ items: [] })
        };
      }
      return {
        ok: true,
        json: async () => ({ items: [] })
      };
    });

    const contextText = 'This context text is about a very obscure topic that has no videos.';
    const result = await getPerfectVideo(contextText);

    assert.strictEqual(result.error, 'No suitable educational video found');
    assert.strictEqual(result.triggerSignal, false);
  });

  await t.test('returns cached result on subsequent calls', async () => {
    let fetchCallCount = 0;
    t.mock.method(global, 'fetch', async (url, options) => {
      fetchCallCount++;
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        conceptQuery: 'caching test',
                        milestones: []
                      })
                    }
                  ]
                }
              }
            ]
          })
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('youtube.com/v3/search') || urlString.includes('googleapis.com/youtube')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: { videoId: 'cache123xyz' },
                snippet: {
                  title: 'Cached Video',
                  channelTitle: 'Cache Channel',
                  channelId: 'UC_cache'
                }
              }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const contextText = 'This is a unique context string meant exclusively to test the caching mechanism behavior.';

    // First call should trigger fetch
    const result1 = await getPerfectVideo(contextText);
    assert.strictEqual(result1.videoId, 'cache123xyz');
    assert.strictEqual(fetchCallCount, 2); // 1 for Gemini, 1 for YouTube

    // Second call should return cached result, fetch shouldn't be called again
    const result2 = await getPerfectVideo(contextText);
    assert.strictEqual(result2.videoId, 'cache123xyz');
    assert.strictEqual(fetchCallCount, 2);
    assert.deepStrictEqual(result1, result2);
  });

  await t.test('returns error object when GEMINI_API_KEY is missing', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const contextText = 'Context text for missing gemini key test.';
      const result = await getPerfectVideo(contextText);

      assert.strictEqual(result.error, 'GEMINI_API_KEY is not configured');
      assert.strictEqual(result.triggerSignal, false);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('returns error object when YOUTUBE_API_KEY is missing', async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;

    try {
      // Mock fetch for Gemini so it gets past the first step
      t.mock.method(global, 'fetch', async (url, options) => {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'test', milestones: [] }) }] } }]
          })
        };
      });

      const contextText = 'Context text for missing youtube key test.';
      const result = await getPerfectVideo(contextText);

      assert.strictEqual(result.error, 'YOUTUBE_API_KEY is not configured');
      assert.strictEqual(result.triggerSignal, false);
    } finally {
      process.env.YOUTUBE_API_KEY = originalKey;
    }
  });

  await t.test('handles network failure during YouTube fetch gracefully', async () => {
    t.mock.method(global, 'fetch', async (url, options) => {
      const urlString = url.toString();
      if (urlString.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ conceptQuery: 'network error test', milestones: [] }) }] } }]
          })
        };
      }
      if (urlString.includes('youtube.googleapis.com') || urlString.includes('youtube.com/v3/search') || urlString.includes('googleapis.com/youtube')) {
        throw new Error('Network connection failed');
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const contextText = 'Context text to test youtube network error handling gracefully.';
    const result = await getPerfectVideo(contextText);

    assert.strictEqual(result.error, 'Network connection failed');
    assert.strictEqual(result.triggerSignal, false);
  });
});
