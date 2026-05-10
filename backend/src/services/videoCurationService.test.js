import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeVideoId, getPerfectVideo } from './videoCurationService.js';

test('sanitizeVideoId utility', async (t) => {
  await t.test('returns empty string for null/undefined/empty input', () => {
    assert.strictEqual(sanitizeVideoId(null), '');
    assert.strictEqual(sanitizeVideoId(undefined), '');
    assert.strictEqual(sanitizeVideoId(''), '');
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
});
