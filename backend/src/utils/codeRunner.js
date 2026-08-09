import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { exec, execSync } from 'child_process';
import crypto from 'crypto';
import { createContext, runInContext } from 'vm';

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

// ── Pre-flight compiler availability cache ───────────────────────────────────
const compilerCache = new Map(); // language -> { available: bool, checkedAt: number }
const CACHE_TTL_MS = 60 * 1000; // re-check every 60s

const COMPILER_CHECKS = {
  java: { cmd: 'javac -version', label: 'Java Development Kit (JDK)' },
  c:    { cmd: 'gcc --version',  label: 'GCC C compiler' },
  cpp:  { cmd: 'g++ --version',  label: 'G++ C++ compiler' },
  python: { cmd: 'python3 --version', label: 'Python 3' },
  go:    { cmd: 'go version',    label: 'Go compiler' },
  rust:  { cmd: 'rustc --version',  label: 'Rust compiler' },
};

/**
 * Returns null if the compiler is available, or a user-facing error string if not.
 * Results are cached for 60 seconds to avoid repeated shell forks on every run.
 */
async function checkCompilerAvailable(language) {
  const check = COMPILER_CHECKS[language];
  if (!check) return null; // unknown language — let execution attempt handle it

  const cached = compilerCache.get(language);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.available ? null : cached.error;
  }

  const result = await new Promise((resolve) => {
    exec(check.cmd, { timeout: 3000 }, (err, stdout, stderr) => {
      // Apple's JDK stub exits with code 1 and prints "Unable to locate a Java Runtime"
      const combined = (stdout + stderr).toLowerCase();
      const isAppleStub = combined.includes('unable to locate') ||
                          combined.includes('no java runtime') ||
                          combined.includes('visit http');
      resolve({ err, isAppleStub });
    });
  });

  const available = !result.err && !result.isAppleStub;
  const error = available ? null :
    `${check.label} is not installed on this server. ` +
    `To enable ${language.toUpperCase()} execution, install the required runtime and ensure it is in the system PATH.`;

  compilerCache.set(language, { available, error, checkedAt: Date.now() });
  return error;
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
    // Build a minimal env that preserves essential system paths (so compilers are
    // discoverable) but scrubs secrets (API keys, DB URIs, JWT secrets, etc.).
    const safeEnv = {
      PATH:    process.env.PATH    || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      HOME:    process.env.HOME    || '/tmp',
      TMPDIR:  process.env.TMPDIR  || '/tmp',
      LANG:    process.env.LANG    || 'en_US.UTF-8',
      NODE_ENV: process.env.NODE_ENV || 'production',
    };
    const execOptions = {
      timeout: 5000, // 5s timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB limit
      env: safeEnv,
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

function formatEnvironmentError(error, stderr, language) {
  const errorMsg = (error && error.message ? error.message : '').toLowerCase();
  const stderrMsg = (stderr || '').toLowerCase();
  const code = error && error.code;

  if (
    code === 'ENOENT' ||
    errorMsg.includes('not found') ||
    errorMsg.includes('unable to locate') ||
    errorMsg.includes('cannot find') ||
    stderrMsg.includes('not found') ||
    stderrMsg.includes('unable to locate') ||
    stderrMsg.includes('cannot find') ||
    stderrMsg.includes('java runtime') ||
    stderrMsg.includes('no such file')
  ) {
    if (language === 'java') {
      return 'Java Development Kit (JDK) is not installed or configured on the host server. Please install JDK and ensure "javac" and "java" are available in the system PATH.';
    }
    if (language === 'c' || language === 'cpp') {
      return 'GCC/G++ compiler is not installed or configured on the host server. Please install GCC/G++ and ensure "gcc" and "g++" are available in the system PATH.';
    }
    if (language === 'python') {
      return 'Python 3 is not installed or configured on the host server. Please install Python 3 and ensure "python3" is available in the system PATH.';
    }
    if (language === 'go') {
      return 'Go SDK is not installed or configured on the host server. Please install Go and ensure "go" is available in the system PATH.';
    }
    if (language === 'rust') {
      return 'Rust compiler (rustc) is not installed or configured on the host server. Please install Rust and ensure "rustc" is available in the system PATH.';
    }
  }
  return null;
}

/**
 * Compiles and runs the code locally.
 * Supports C, C++, Java, Python, Go, and Rust.
 */
export async function runCode(language, code, testCode = '') {
  // ── Pre-flight: ensure the required compiler/runtime is actually installed ──
  const compilerError = await checkCompilerAvailable(language);
  if (compilerError) {
    return {
      success: false,
      stdout: '',
      stderr: compilerError,
      errorMessage: compilerError,
      runtimeMissing: true,
      durationMs: 0,
    };
  }

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
    } else if (language === 'go') {
      sourceFile = 'main.go';
      compileCmd = 'go build -o main main.go';
      runCmd = './main';
      if (testCode) {
        codeToRun = code + '\n\n' + testCode;
      }
    } else if (language === 'rust') {
      sourceFile = 'main.rs';
      compileCmd = 'rustc -O main.rs -o main';
      runCmd = './main';
      if (testCode) {
        codeToRun = code + '\n\n' + testCode;
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
        const envErr = formatEnvironmentError(compileResult.error, compileResult.stderr, language);
        const compileErr = envErr || compileResult.stderr || compileResult.error.message;
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
      const envErr = formatEnvironmentError(runError, runResult.stderr, language);
      if (envErr) {
        errorMessage = envErr;
        runResult.stderr = (runResult.stderr + '\n' + envErr).trim();
      } else if (runError.killed || runError.signal === 'SIGTERM') {
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

/**
 * Execute a Javascript user code block safely within VM sandbox context
 */
export function executeSanitizedUserCode(userCodeString) {
  // Create an isolated context block mask to explicitly overwrite system process access
  const executionContextSandbox = Object.create(null);
  const safeProcess = Object.create(null);
  const safeEnv = Object.create(null);

  safeEnv.NODE_ENV = 'production'; // Erase private master API keys from visibility scope
  safeProcess.env = safeEnv;

  executionContextSandbox.process = safeProcess;
  executionContextSandbox.global = Object.create(null);
  executionContextSandbox.require = null; // Stop runtime file system access leaks

  // Execute using proper VM context isolation paradigms
  const context = createContext(executionContextSandbox, {
    codeGeneration: {
      strings: false,
      wasm: false
    }
  });

  return runInContext(userCodeString, context, { timeout: 2000 });
}
