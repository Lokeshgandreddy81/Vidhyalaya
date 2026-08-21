import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import dns from 'node:dns/promises';
import { validateEndpoint } from './aiClientRouter.js';

describe('SSRF Protection (validateEndpoint)', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('should allow valid HTTPS domains', async () => {
    mock.method(dns, 'lookup', async () => [{ address: '93.184.216.34' }]); // Example valid IP
    const result = await validateEndpoint('https://api.openai.com/v1/chat/completions');
    assert.strictEqual(result, true);
  });

  it('should allow empty endpoints (fallback to default)', async () => {
    const result = await validateEndpoint('');
    assert.strictEqual(result, true);
  });

  it('should reject non-HTTPS URLs', async () => {
    await assert.rejects(
      async () => validateEndpoint('http://api.openai.com/v1/chat/completions'),
      /Only HTTPS endpoints are allowed/
    );
  });

  it('should reject malformed URLs', async () => {
    await assert.rejects(
      async () => validateEndpoint('not_a_url'),
      /Invalid custom endpoint: Invalid URL/
    );
  });

  it('should reject direct internal IP usage (127.0.0.1)', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://127.0.0.1/admin'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject direct internal IP usage (10.x.x.x)', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://10.0.0.1/admin'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject direct internal IP usage (169.254.x.x IMDS)', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://169.254.169.254/latest/meta-data/'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject direct internal IP usage (192.168.x.x)', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://192.168.1.1/admin'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject direct IPv6 loopback (::1)', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://[::1]/admin'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject IPv4-mapped IPv6 internal IPs', async () => {
    await assert.rejects(
      async () => validateEndpoint('https://[::ffff:127.0.0.1]/admin'),
      /Routing to internal IPs is forbidden/
    );
    await assert.rejects(
      async () => validateEndpoint('https://[::ffff:7f00:1]/admin'),
      /Routing to internal IPs is forbidden/
    );
  });

  it('should reject domains resolving to internal IPs (DNS rebinding simulation)', async () => {
    mock.method(dns, 'lookup', async () => [{ address: '127.0.0.1' }]);

    await assert.rejects(
      async () => validateEndpoint('https://localtest.me/admin'),
      /Resolved domain points to an internal IP/
    );
  });

  it('should reject domains where ANY resolved IP is internal (DNS rebinding simulation)', async () => {
    mock.method(dns, 'lookup', async () => [
      { address: '93.184.216.34' },
      { address: '10.0.0.1' }
    ]);

    await assert.rejects(
      async () => validateEndpoint('https://malicious.com/admin'),
      /Resolved domain points to an internal IP/
    );
  });

  it('should ignore ENOTFOUND errors and allow HTTP client to fail naturally', async () => {
    mock.method(dns, 'lookup', async () => {
      const err = new Error('getaddrinfo ENOTFOUND invalid.local');
      err.code = 'ENOTFOUND';
      throw err;
    });

    const result = await validateEndpoint('https://invalid.local/api');
    assert.strictEqual(result, true);
  });
});
