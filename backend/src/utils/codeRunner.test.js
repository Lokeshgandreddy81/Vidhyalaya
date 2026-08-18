import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runCode } from './codeRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let hasFirejail = false;
try {
  execSync('which firejail', { stdio: 'ignore' });
  hasFirejail = true;
} catch {
  // Ignore
}
let hasSandboxExec = false;
try {
  execSync('which sandbox-exec', { stdio: 'ignore' });
  hasSandboxExec = true;
} catch {
  // Ignore
}

const canSandbox = process.platform === 'linux' ? hasFirejail : (process.platform === 'darwin' ? hasSandboxExec : false);

describe('Cortex Code Sandbox Runner', () => {
  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("Hello world")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stdout.trim(), 'Hello world');
    assert.strictEqual(result.stderr.trim(), '');
  });

  it('should block read access to backend/.env file (sandbox constraint)', { skip: !canSandbox }, async () => {
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

  it('should block network access (sandbox constraint)', { skip: !canSandbox }, async () => {
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
