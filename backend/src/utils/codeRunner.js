import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { exec, execSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SANDBOX_BASE = path.resolve(__dirname, '..', '..', 'sandbox_temp');

let hasFirejail = false;
if (process.platform === 'linux') {
  try {
    execSync('which firejail', { stdio: 'ignore' });
    hasFirejail = true;
  } catch {
    hasFirejail = false;
  }
}

/**
 * Execute a shell command wrapped in a Promise
 */
function execPromise(cmd, options = {}) {
  let sandboxedCmd = cmd;

  const backendRoot = path.resolve(__dirname, '..', '..');
  const projectRoot = path.resolve(backendRoot, '..');
  const envFile = path.join(backendRoot, '.env');
  const backendSrc = path.join(backendRoot, 'src');
  const frontendSrc = path.join(projectRoot, 'frontend', 'src');
  const gitDir = path.join(projectRoot, '.git');

  if (process.platform === 'darwin') {
    // macOS sandbox-exec integration
    const profile = `(version 1)
(allow default)
(deny network*)
(deny file-read* file-write*
  (literal "${envFile.replace(/"/g, '\\"')}")
  (subpath "${backendSrc.replace(/"/g, '\\"')}")
  (subpath "${frontendSrc.replace(/"/g, '\\"')}")
  (subpath "${gitDir.replace(/"/g, '\\"')}")
)`;
    const escapedProfile = profile.replace(/'/g, "'\\''");
    sandboxedCmd = `sandbox-exec -p '${escapedProfile}' ${cmd}`;
  } else if (process.platform === 'linux' && hasFirejail) {
    // Linux firejail integration with memory (256MB) and CPU shares (10) restrictions
    sandboxedCmd = `firejail --net=none --private-tmp --rlimit-as=256m --cpu.share=10 --blacklist="${envFile}" --blacklist="${backendSrc}" --blacklist="${frontendSrc}" --blacklist="${gitDir}" ${cmd}`;
  } else {
    // SECURITY: In production, we must NEVER execute code without a process sandbox.
    // If neither macOS sandbox-exec nor Linux firejail is available, abort immediately.
    if (process.env.NODE_ENV === 'production') {
      return Promise.resolve({
        error: new Error('Code execution is unavailable: no process sandbox detected on this server.'),
        stdout: '',
        stderr: 'Execution blocked: sandbox runtime unavailable in production environment.',
      });
    }
    console.warn(`[codeRunner] WARNING: Running execution without process sandboxing. Allowed only in development.`);
  }

  return new Promise((resolve) => {
    const execOptions = {
      timeout: 5000, // 5s timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB limit
      ...options
    };
    exec(sandboxedCmd, execOptions, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    });
  });
}

/**
 * Compiles and runs the code locally.
 * Supports C, C++, Java, and Python.
 */
export async function runCode(language, code, testCode = '') {
  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(SANDBOX_BASE, sessionId);

  try {
    // Ensure the session sandbox directory exists
    await fs.mkdir(sessionDir, { recursive: true });

    let sourceFile = '';
    let compileCmd = '';
    let runCmd = '';
    let codeToRun = code;

    if (language === 'c') {
      sourceFile = 'main.c';
      compileCmd = 'gcc -O2 main.c -o main';
      runCmd = './main';
      if (testCode) {
        codeToRun = code + '\n\n' + testCode;
      }
    } else if (language === 'cpp') {
      sourceFile = 'main.cpp';
      compileCmd = 'g++ -O2 main.cpp -o main';
      runCmd = './main';
      if (testCode) {
        codeToRun = code + '\n\n' + testCode;
      }
    } else if (language === 'java') {
      // Find class name from code, e.g. "public class XYZ" or default to "Main"
      let className = 'Main';
      const classMatch = code.match(/public\s+class\s+(\w+)/) || code.match(/class\s+(\w+)/);
      if (classMatch) {
        className = classMatch[1];
      }
      sourceFile = `${className}.java`;
      compileCmd = `javac ${sourceFile}`;
      runCmd = `java ${className}`;
      if (testCode) {
        codeToRun = code + '\n\n' + testCode;
      }
    } else if (language === 'python') {
      sourceFile = 'main.py';
      compileCmd = ''; // interpreted, skip compile phase
      runCmd = 'python3 main.py';
      if (testCode) {
        codeToRun = code + '\n\n' + testCode + `

print("\\n---TEST_RESULT---")
import json
try:
    print(json.dumps(__test_result__))
except NameError:
    print(json.dumps({"passed": 0, "total": 0}))
`;
      }
    } else {
      throw new Error(`Unsupported compiler language: ${language}`);
    }

    // Write the source code file
    await fs.writeFile(path.join(sessionDir, sourceFile), codeToRun, 'utf8');

    const start = performance.now();

    // 1. Compile Phase (if compileCmd exists)
    if (compileCmd) {
      const compileResult = await execPromise(compileCmd, { cwd: sessionDir });
      
      // Check for compilation errors
      if (compileResult.error) {
        const compileErr = compileResult.stderr || compileResult.error.message;
        return {
          success: false,
          stdout: compileResult.stdout.trim(),
          stderr: compileErr.trim(),
          errorMessage: compileErr.trim(),
          durationMs: Math.round(performance.now() - start),
        };
      }
    }

    // 2. Run Phase
    const runResult = await execPromise(runCmd, { cwd: sessionDir });
    const durationMs = Math.round(performance.now() - start);

    const runError = runResult.error;
    let success = !runError;
    let errorMessage = undefined;

    if (runError) {
      if (runError.killed || runError.signal === 'SIGTERM') {
        errorMessage = 'Execution timed out (5s limit exceeded).';
        runResult.stderr = (runResult.stderr + '\n' + errorMessage).trim();
      } else {
        errorMessage = runError.message;
      }
    }

    let stdout = runResult.stdout.trim();
    let stderr = runResult.stderr.trim();
    let testsPassed = undefined;
    let testsTotal = undefined;

    // Parse out test results for python exercises if applicable
    if (language === 'python' && testCode) {
      const marker = '---TEST_RESULT---';
      const markerIndex = stdout.indexOf(marker);
      if (markerIndex !== -1) {
        const jsonStr = stdout.substring(markerIndex + marker.length).trim();
        stdout = stdout.substring(0, markerIndex).trim(); // clean stdout for user display
        try {
          const testObj = JSON.parse(jsonStr);
          testsPassed = testObj.passed ?? 0;
          testsTotal = testObj.total ?? 0;
          success = testsPassed === testsTotal && testsTotal > 0;
        } catch (e) {
          console.error('Failed to parse Python test result JSON:', e);
        }
      }
    }

    return {
      success,
      stdout,
      stderr,
      errorMessage,
      testsPassed,
      testsTotal,
      durationMs,
    };

  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: err.message,
      errorMessage: err.message,
      durationMs: 0,
    };
  } finally {
    // Cleanup temporary workspace files
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error(`Failed to clean up sandbox session dir: ${sessionDir}`, cleanupErr);
    }
  }
}
