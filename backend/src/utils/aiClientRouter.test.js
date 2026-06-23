import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEndpoint } from './aiClientRouter.js';

describe('validateEndpoint (SSRF Protection)', () => {
  it('should allow valid external https endpoints', () => {
    assert.strictEqual(validateEndpoint('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(validateEndpoint('https://example.com/api'), 'https://example.com/api');
  });

  it('should return empty string if no endpoint is provided', () => {
    assert.strictEqual(validateEndpoint(''), '');
    assert.strictEqual(validateEndpoint(undefined), '');
    assert.strictEqual(validateEndpoint(null), '');
  });

  it('should reject non-https protocols', () => {
    assert.throws(() => validateEndpoint('http://api.openai.com'), /Only https: is allowed/);
    assert.throws(() => validateEndpoint('ftp://example.com'), /Only https: is allowed/);
    assert.throws(() => validateEndpoint('file:///etc/passwd'), /Only https: is allowed/);
  });

  it('should reject localhost domains', () => {
    assert.throws(() => validateEndpoint('https://localhost/api'), /Localhost endpoints are not permitted/);
    assert.throws(() => validateEndpoint('https://test.localhost/api'), /Localhost endpoints are not permitted/);
  });

  it('should reject internal and reserved IPv4 addresses', () => {
    const badIps = [
      '127.0.0.1',     // loopback
      '10.0.0.1',      // class A private
      '172.16.0.1',    // class B private
      '172.31.255.255',// class B private max
      '192.168.1.100', // class C private
      '169.254.169.254',// link-local (metadata)
      '0.0.0.0',       // unspecified
      '2130706433',    // 127.0.0.1 in decimal (auto-converted by new URL)
      '0177.0000.0000.0001', // 127.0.0.1 in octal
      '0x7f.0x00.0x00.0x01'  // 127.0.0.1 in hex
    ];

    for (const ip of badIps) {
      assert.throws(() => validateEndpoint(`https://${ip}/v1/chat`), /Internal or reserved IP addresses are not permitted/, `Failed to reject ${ip}`);
    }
  });

  it('should reject internal and reserved IPv6 addresses', () => {
    const badIps = [
      '[::1]',        // loopback
      '[::]',         // unspecified
      '[fe80::1]'     // link-local
    ];

    for (const ip of badIps) {
      assert.throws(() => validateEndpoint(`https://${ip}/v1/chat`), /Internal or reserved IPv6 addresses are not permitted/, `Failed to reject ${ip}`);
    }
  });

  it('should reject metadata hostnames', () => {
    assert.throws(() => validateEndpoint('https://instance-data/latest'), /Metadata endpoints are not permitted/);
    assert.throws(() => validateEndpoint('https://metadata.google.internal/computeMetadata'), /Metadata endpoints are not permitted/);
  });

  it('should reject completely invalid URLs', () => {
    assert.throws(() => validateEndpoint('not-a-url'), /Invalid endpoint URL provided/);
  });
});
