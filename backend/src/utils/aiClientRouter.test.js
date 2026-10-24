import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEndpoint } from './aiClientRouter.js';

describe('aiClientRouter - SSRF validation', () => {
  it('should allow valid HTTPS endpoints', async () => {
    await assert.doesNotReject(validateEndpoint('https://api.openai.com/v1'));
    await assert.doesNotReject(validateEndpoint('https://openrouter.ai/api/v1/chat/completions'));
  });

  it('should reject non-HTTPS endpoints', async () => {
    await assert.rejects(
      validateEndpoint('http://api.openai.com/v1'),
      /Custom endpoint must use HTTPS/
    );
    await assert.rejects(
      validateEndpoint('ftp://api.openai.com/v1'),
      /Custom endpoint must use HTTPS/
    );
  });

  it('should reject loopback/localhost endpoints', async () => {
    await assert.rejects(
      validateEndpoint('https://localhost:8080/v1'),
      /Invalid custom endpoint URL: internal loopback blocked/
    );
    await assert.rejects(
      validateEndpoint('https://0.0.0.0/v1'),
      /Invalid custom endpoint URL: internal loopback blocked/
    );
    await assert.rejects(
      validateEndpoint('https://[::]/v1'),
      /Invalid custom endpoint URL: internal loopback blocked/
    );
  });

  it('should reject internal IP addresses directly', async () => {
    await assert.rejects(
      validateEndpoint('https://169.254.169.254/latest/meta-data'),
      /Invalid custom endpoint URL: resolves to internal IP/
    );
    await assert.rejects(
      validateEndpoint('https://10.0.0.1/v1'),
      /Invalid custom endpoint URL: resolves to internal IP/
    );
    await assert.rejects(
      validateEndpoint('https://192.168.1.1/v1'),
      /Invalid custom endpoint URL: resolves to internal IP/
    );
    await assert.rejects(
      validateEndpoint('https://172.16.0.1/v1'),
      /Invalid custom endpoint URL: resolves to internal IP/
    );
  });

  it('should reject malformed URLs', async () => {
    await assert.rejects(
      validateEndpoint('not-a-url'),
      /Invalid custom endpoint URL\./
    );
  });
});

  it('should reject IPv6 loopback variants', async () => {
    await assert.rejects(
      validateEndpoint('https://[::1]/v1'),
      /Invalid custom endpoint URL: resolves to internal IP/
    );
  });
