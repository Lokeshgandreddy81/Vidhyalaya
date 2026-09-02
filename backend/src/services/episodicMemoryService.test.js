import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { cosineSimilarity } from '../utils/math.js';
import {
  saveEpisodicMemory,
  recallEpisodicMemories,
  extractAndPersistMemory,
} from './episodicMemoryService.js';

describe('EpisodicMemoryService & Cosine Vector Recall', () => {
  it('calculates cosine similarity correctly between vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    assert.strictEqual(cosineSimilarity(vecA, vecB), 1);
    assert.strictEqual(cosineSimilarity(vecA, vecC), 0);
  });

  it('handles null/invalid arguments gracefully in saveEpisodicMemory', async () => {
    const res = await saveEpisodicMemory({ userId: null, content: '' });
    assert.strictEqual(res, null);
  });

  it('handles null/invalid arguments gracefully in recallEpisodicMemories', async () => {
    const res = await recallEpisodicMemories({ userId: null });
    assert.deepStrictEqual(res, []);
  });

  it('extractAndPersistMemory executes asynchronously without throwing errors', async () => {
    assert.doesNotThrow(async () => {
      await extractAndPersistMemory({
        userId: 'test_user_123',
        newMessage: 'I prefer async/await over raw promises in Node.js',
        chatContext: { lastCompilationError: 'ReferenceError: foo is not defined' },
      });
    });
  });
});
