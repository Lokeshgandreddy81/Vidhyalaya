import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runCode } from './codeRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let hasSandbox = false;
try {
  if (process.platform === 'linux') {
    execSync('which firejail', { stdio: 'ignore' });
    hasSandbox = true;
  } else if (process.platform === 'darwin') {
    execSync('which sandbox-exec', { stdio: 'ignore' });
    hasSandbox = true;
  }
} catch (e) {
  // Sandbox tool not found
  hasSandbox = false;
}

const skipIfNoSandbox = hasSandbox ? {} : { skip: 'Skipping security sandbox tests because firejail/sandbox-exec is not installed on the system' };

describe('Cortex Code Sandbox Runner', () => {
  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("Hello world")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stdout.trim(), 'Hello world');
    assert.strictEqual(result.stderr.trim(), '');
  });

  it('should block read access to backend/.env file (sandbox constraint)', skipIfNoSandbox, async () => {
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

  it('should block network access (sandbox constraint)', skipIfNoSandbox, async () => {
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
