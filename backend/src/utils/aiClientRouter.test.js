import assert from 'node:assert';
import { test, suite } from 'node:test';
import { callAIEngine } from './aiClientRouter.js';

suite('aiClientRouter SSRF validation', () => {
  test('should throw error for local internal IP (127.0.0.1)', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test',
        'x-byok-endpoint': 'https://127.0.0.1/v1/chat/completions'
      }
    };

    try {
      await callAIEngine({ req, prompt: 'hello' });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.match(err.message, /Internal\/Private IP endpoints are not permitted/);
    }
  });

  test('should throw error for http protocol', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test',
        'x-byok-endpoint': 'http://api.openai.com/v1/chat/completions'
      }
    };

    try {
      await callAIEngine({ req, prompt: 'hello' });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.match(err.message, /Invalid custom endpoint protocol: http:/);
    }
  });

  test('should allow valid https endpoint', async () => {
    // We don't actually want to call the API, so we catch the fetch error instead of SSRF
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test',
        'x-byok-endpoint': 'https://api.openai.com/v1/chat/completions'
      }
    };

    try {
      await callAIEngine({ req, prompt: 'hello', timeoutMs: 1 });
      assert.fail('Should have thrown an error');
    } catch (err) {
      // It passes SSRF check and hits the actual fetch (or fetch error/timeout)
      assert.doesNotMatch(err.message, /Internal\/Private IP endpoints are not permitted/);
      assert.doesNotMatch(err.message, /Invalid custom endpoint protocol/);
    }
  });
});
