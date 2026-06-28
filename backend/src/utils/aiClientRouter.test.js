import { describe, it } from 'node:test';
import assert from 'node:assert';
import { callAIEngine } from './aiClientRouter.js';

describe('aiClientRouter SSRF Protection', () => {
  it('should block localhost (string match)', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test-key',
        'x-byok-endpoint': 'https://localhost:8080/v1/chat/completions'
      }
    };

    await assert.rejects(
      async () => await callAIEngine({ req, prompt: 'Hello' }),
      (err) => err.message.includes('forbidden internal network')
    );
  });

  it('should block 127.0.0.1 (string match)', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test-key',
        'x-byok-endpoint': 'https://127.0.0.1:8080/v1/chat/completions'
      }
    };

    await assert.rejects(
      async () => await callAIEngine({ req, prompt: 'Hello' }),
      (err) => err.message.includes('forbidden internal network')
    );
  });

  it('should block non-HTTPS protocols', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test-key',
        'x-byok-endpoint': 'http://google.com'
      }
    };

    await assert.rejects(
      async () => await callAIEngine({ req, prompt: 'Hello' }),
      (err) => err.message.includes('Custom endpoints must use HTTPS')
    );
  });

  it('should block custom domain pointing to 127.0.0.1 (DNS resolution)', async () => {
    const req = {
      headers: {
        'x-byok-mode': 'custom',
        'x-byok-provider': 'openai',
        'x-byok-api-key': 'test-key',
        'x-byok-endpoint': 'https://localtest.me/v1/chat/completions'
      }
    };

    await assert.rejects(
      async () => await callAIEngine({ req, prompt: 'Hello' }),
      (err) => err.message.includes('forbidden internal network')
    );
  });
});
