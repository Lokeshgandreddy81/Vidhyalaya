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

  it('should block VM sandbox escape via prototype chain in executeSanitizedUserCode', () => {
    // Attempt exploit via standard prototype chain, blocked by code generation disabled
    const code1 = `
      const hostProcess = this.constructor.constructor('return process')();
      hostProcess.env.TEST_SECRET_VARIABLE = "exploited";
      "Exploit successful";
    `;
    assert.throws(
      () => executeSanitizedUserCode(code1),
      /Code generation from strings disallowed for this context/
    );

    // Attempt exploit via exposed host object prototype, blocked by Object.create(null)
    const code2 = `
      const hostProcess = process.env.constructor.constructor('return process')();
      hostProcess.env.TEST_SECRET_VARIABLE = "exploited";
      "Exploit successful";
    `;
    assert.throws(
      () => executeSanitizedUserCode(code2),
      /Cannot read properties of undefined/ // `process.env.constructor` is undefined
    );

    // Attempt exploit via exposed host function prototype, blocked by context-local compilation and disabled code generation
    const code3 = `
      const hostProcess = process.exit.constructor('return process')();
      hostProcess.env.TEST_SECRET_VARIABLE = "exploited";
      "Exploit successful";
    `;
    assert.throws(
      () => executeSanitizedUserCode(code3),
      /Code generation from strings disallowed for this context/ // Sandbox local Function constructor refuses generation
    );
  });
});
