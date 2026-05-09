import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeVideoId } from './videoCurationService.js';

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
