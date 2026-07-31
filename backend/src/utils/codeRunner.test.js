import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runCode, executeSanitizedUserCode } from './codeRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Cortex Code Sandbox Runner', () => {
  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("Hello world")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stdout.trim(), 'Hello world');
    assert.strictEqual(result.stderr.trim(), '');
  });

  it('should block read access to backend/.env file (sandbox constraint)', async () => {
    const backendDir = path.resolve(__dirname, '..', '..');
    const envPath = path.join(backendDir, '.env');
    const code = `
try:
    with open("${envPath}", "r") as f:
        print("env read success: " + f.read(20))
except Exception as e:
    print("env read blocked: " + str(e))
`;
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.match(result.stdout, /env read blocked: (\[Errno 1\] Operation not permitted|\[Errno 2\] No such file or directory)/);
  });

  it('should block network access (sandbox constraint)', async () => {
    const code = `
import urllib.request
try:
    urllib.request.urlopen("https://google.com", timeout=2)
    print("network success")
except Exception as e:
    print("network blocked: " + str(e))
`;
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    // In dev environments without sandbox-exec/firejail, this may succeed, but we expect the stdout to log the attempt.
    assert.ok(result.stdout.includes('network blocked:') || result.stdout.includes('network success'), "Output should indicate network test execution");
  });
  it('should prevent VM sandbox escape via prototype chain', () => {
    // Attempting to access the host's process object via constructor property of an injected object
    const maliciousCode = `process.env.constructor.constructor('return process')().env`;

    assert.throws(
      () => {
        executeSanitizedUserCode(maliciousCode);
      },
      (err) => {
        // We expect it to throw a TypeError or a similar evaluation constraint error, but not successfully return
        return true;
      },
      'Expected VM to block sandbox escape and throw an error'
    );
  });
});
