import test from 'node:test';
import assert from 'node:assert';
import { validateCustomEndpoint } from './aiClientRouter.js';

test('validateCustomEndpoint - SSRF Prevention', async (t) => {
  await t.test('allows valid external HTTPS endpoints', () => {
    assert.strictEqual(validateCustomEndpoint('https://api.openai.com/v1'), 'https://api.openai.com/v1');
    assert.strictEqual(validateCustomEndpoint('https://my-custom-llm.herokuapp.com/chat'), 'https://my-custom-llm.herokuapp.com/chat');
    assert.strictEqual(validateCustomEndpoint(''), ''); // Empty string should pass through safely
  });

  await t.test('blocks non-HTTPS protocols', () => {
    assert.throws(() => validateCustomEndpoint('http://api.openai.com/v1'), /Custom endpoints must use HTTPS protocol/);
    assert.throws(() => validateCustomEndpoint('ftp://192.168.1.1'), /Custom endpoints must use HTTPS protocol/);
    assert.throws(() => validateCustomEndpoint('file:///etc/passwd'), /Custom endpoints must use HTTPS protocol/);
  });

  await t.test('blocks internal/reserved hostnames', () => {
    assert.throws(() => validateCustomEndpoint('https://localhost/v1'), /Custom endpoints cannot target internal networks/);
    assert.throws(() => validateCustomEndpoint('https://127.0.0.1/v1'), /Custom endpoints cannot target internal networks/);
    assert.throws(() => validateCustomEndpoint('https://0.0.0.0:8080'), /Custom endpoints cannot target internal networks/);
    assert.throws(() => validateCustomEndpoint('https://[::1]/v1'), /Custom endpoints cannot target internal networks/);
    assert.throws(() => validateCustomEndpoint('https://my-service.local/v1'), /Custom endpoints cannot target internal networks/);
    assert.throws(() => validateCustomEndpoint('https://169.254.169.254/latest/meta-data'), /Custom endpoints cannot target internal networks/); // AWS IMDS
  });

  await t.test('blocks private IP ranges', () => {
    // 10.0.0.0/8
    assert.throws(() => validateCustomEndpoint('https://10.0.0.1/api'), /Custom endpoints cannot target internal IP addresses/);
    assert.throws(() => validateCustomEndpoint('https://10.255.255.255'), /Custom endpoints cannot target internal IP addresses/);

    // 172.16.0.0/12
    assert.throws(() => validateCustomEndpoint('https://172.16.0.1'), /Custom endpoints cannot target internal IP addresses/);
    assert.throws(() => validateCustomEndpoint('https://172.31.255.255'), /Custom endpoints cannot target internal IP addresses/);

    // 192.168.0.0/16
    assert.throws(() => validateCustomEndpoint('https://192.168.0.1'), /Custom endpoints cannot target internal IP addresses/);
    assert.throws(() => validateCustomEndpoint('https://192.168.255.255'), /Custom endpoints cannot target internal IP addresses/);

    // 127.0.0.0/8 (loopback)
    assert.throws(() => validateCustomEndpoint('https://127.0.0.2'), /Custom endpoints cannot target internal IP addresses/);
  });

  await t.test('handles invalid URLs gracefully', () => {
    assert.throws(() => validateCustomEndpoint('not-a-valid-url'), /Invalid custom endpoint/);
  });
});
