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
    assert.match(result.stdout, /env read blocked: \[Errno 1\] Operation not permitted/);
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
    assert.match(result.stdout, /network blocked:/);
  });
  it('should prevent VM sandbox escapes via the prototype chain in executeSanitizedUserCode', () => {
    const maliciousCode = `
      const ForeignFunction = this.constructor.constructor;
      const process1 = ForeignFunction("return process")();
      process1.env.HACKED = "YES!";
    `;

    // We expect this to fail because the sandbox context has no prototype,
    // and thus no access to `this.constructor` or `process`.
    assert.throws(() => {
      executeSanitizedUserCode(maliciousCode);
    }, /Cannot read properties of undefined|process is not defined/);

    // Ensure the host process was NOT polluted
    assert.strictEqual(process.env.HACKED, undefined);
  });
});
