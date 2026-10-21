import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { runCode } from './codeRunner.js';

let hasSandbox = true;
try {
  if (process.platform === 'darwin') {
    execSync('which sandbox-exec');
  } else {
    execSync('which firejail');
  }
} catch (e) {
  hasSandbox = false;
}

describe('Cortex Code Sandbox Runner', () => {

  it('should run javascript code successfully and capture stdout', async () => {
    const code = 'console.log("hello test");';
    const result = await runCode('javascript', code);

    assert.strictEqual(result.stdout.trim(), 'hello test');
    assert.strictEqual(result.error, null);
  });

  it('should report javascript runtime errors without crashing the server', async () => {
    const code = 'throw new Error("test crash");';
    const result = await runCode('javascript', code);

    assert.strictEqual(result.stdout, '');
    assert.match(result.error, /Error: test crash/);
  });

  it('should compile and run python code successfully (happy path)', async () => {
    const code = 'print("hello from python")';
    const result = await runCode('python', code);
    
    assert.strictEqual(result.stdout.trim(), 'hello from python');
    assert.strictEqual(result.error, null);
  });

  it('should block read access to backend/.env file (sandbox constraint)', { skip: !hasSandbox }, async () => {
    const code = `
try:
    with open('/app/backend/.env', 'r') as f:
        print("env read success: " + f.read())
except Exception as e:
    print("env read blocked: " + str(e))
    `;
    const result = await runCode('python', code);
    assert.match(result.stdout, /env read blocked: \[Errno 1\] Operation not permitted/);
  });

  it('should block network access (sandbox constraint)', { skip: !hasSandbox }, async () => {
    const code = `
import urllib.request
try:
    urllib.request.urlopen('http://example.com', timeout=1)
    print("network success")
except Exception as e:
    print("network blocked: " + str(e))
    `;
    const result = await runCode('python', code);
    assert.match(result.stdout, /network blocked:/);
  });
});
