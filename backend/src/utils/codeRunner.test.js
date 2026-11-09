import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { runCode } from './codeRunner.js';

let hasSandbox = true;
try {
  const isLinux = process.platform === 'linux';
  const cmd = isLinux ? 'which firejail' : 'which sandbox-exec';
  execSync(cmd, { stdio: 'ignore' });
} catch (e) {
  hasSandbox = false;
  console.log(`[TEST] Skipping sandbox tests due to missing sandboxing tool: ${process.platform === 'linux' ? 'firejail' : 'sandbox-exec'}`);
}

describe('Cortex Code Sandbox Runner', () => {
  it('should run javascript code successfully and capture stdout', async () => {
    const code = `console.log("hello world");\nconsole.error("test error");`;
    const result = await runCode('javascript', code);

    assert.strictEqual(result.stdout.trim(), 'hello world');
    assert.strictEqual(result.stderr.trim(), 'test error');
    assert.strictEqual(result.exitCode, 0);
  });

  it('should report javascript runtime errors without crashing the server', async () => {
    const code = `throw new Error("test crash");`;
    const result = await runCode('javascript', code);

    assert.notStrictEqual(result.exitCode, 0);
    assert.match(result.stderr, /test crash/);
  });

  it('should compile and run python code successfully (happy path)', async () => {
    const code = `print("python hello")`;
    const result = await runCode('python', code);
    
    assert.strictEqual(result.stdout.trim(), 'python hello');
    assert.strictEqual(result.exitCode, 0);
  });

  it('should block read access to backend/.env file (sandbox constraint)', { skip: !hasSandbox }, async () => {
    const code = `
import os
try:
    with open('/app/backend/.env', 'r') as f:
        print(f.read())
except Exception as e:
    print("env read blocked: " + str(e))
`;
    const result = await runCode('python', code);
    assert.match(result.stdout, /env read blocked: \[Errno 1\] Operation not permitted|env read blocked: \[Errno 13\] Permission denied|env read blocked: \[Errno 2\] No such file or directory/);
  });

  it('should block network access (sandbox constraint)', { skip: !hasSandbox }, async () => {
    const code = `
import urllib.request
try:
    urllib.request.urlopen('http://google.com', timeout=1)
    print("network success")
except Exception as e:
    print("network blocked: " + str(e))
`;
    const result = await runCode('python', code);
    assert.match(result.stdout, /network blocked:/);
  });
});
