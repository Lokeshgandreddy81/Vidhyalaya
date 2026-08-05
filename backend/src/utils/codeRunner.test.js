import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { runCode } from './codeRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Cortex Code Sandbox Runner', () => {
  let hasSandboxExec = false;
  let hasFirejail = false;

  before(() => {
    if (process.platform === 'darwin') {
      try {
        execSync('which sandbox-exec', { stdio: 'ignore' });
        hasSandboxExec = true;
      } catch {}
    } else if (process.platform === 'linux') {
      try {
        execSync('which firejail', { stdio: 'ignore' });
        hasFirejail = true;
      } catch {}
    }
  });

  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("Hello world")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stdout.trim(), 'Hello world');
    assert.strictEqual(result.stderr.trim(), '');
  });

  it('should block read access to backend/.env file (sandbox constraint)', async (t) => {
    if (process.env.NODE_ENV !== 'production' && !hasSandboxExec && !hasFirejail) {
      t.skip('Sandbox tool (sandbox-exec or firejail) is not available');
      return;
    }

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

  it('should block network access (sandbox constraint)', async (t) => {
    if (process.env.NODE_ENV !== 'production' && !hasSandboxExec && !hasFirejail) {
      t.skip('Sandbox tool (sandbox-exec or firejail) is not available');
      return;
    }

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
});
