import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runCode } from './codeRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if OS sandboxing tools are available for testing security constraints
let isSandboxAvailable = false;
try {
  if (process.platform === 'darwin') {
    execSync('which sandbox-exec', { stdio: 'ignore' });
    isSandboxAvailable = true;
  } else if (process.platform === 'linux') {
    execSync('which firejail', { stdio: 'ignore' });
    isSandboxAvailable = true;
  }
} catch (e) {
  console.warn('[codeRunner.test.js] Sandbox tools (firejail/sandbox-exec) not found. Security tests will be skipped.');
}

describe('Cortex Code Sandbox Runner', () => {
  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("Hello world")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stdout.trim(), 'Hello world');
    assert.strictEqual(result.stderr.trim(), '');
  });

  it('should block read access to backend/.env file (sandbox constraint)', { skip: !isSandboxAvailable }, async () => {
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

  it('should block network access (sandbox constraint)', { skip: !isSandboxAvailable }, async () => {
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
