import { SandboxLanguage, SandboxRunResult } from '../types';
import { api } from './api';
import { transpileTypeScriptToJs } from '../utils/typescriptTranspiler';

export type FreeformLanguage = SandboxLanguage | 'typescript' | 'html' | 'c' | 'cpp' | 'java';

const COMPILED_LANGUAGES = new Set(['c', 'cpp', 'java', 'python']);

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (msg: string) => void }) => void;
  setStderr: (opts: { batched: (msg: string) => void }) => void;
}

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
let pyodideInstance: PyodideInterface | null = null;
let pyodideLoading: Promise<PyodideInterface> | null = null;

function parseJsErrorLine(message: string, code: string): number | undefined {
  const match = message.match(/<anonymous>:(\d+):/);
  if (match) return Number(match[1]);
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (message.includes(lines[i].trim()) && lines[i].trim().length > 3) return i + 1;
  }
  return undefined;
}

function parsePythonErrorLine(message: string): number | undefined {
  const match = message.match(/File "<exec>", line (\d+)/);
  return match ? Number(match[1]) : undefined;
}

async function loadPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-pyodide]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Failed to load Python runtime')));
          return;
        }
        const script = document.createElement('script');
        script.src = `${PYODIDE_URL}pyodide.js`;
        script.dataset.pyodide = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Python runtime'));
        document.head.appendChild(script);
      });
    }
    if (!window.loadPyodide) throw new Error('Python runtime unavailable');
    pyodideInstance = await window.loadPyodide({ indexURL: PYODIDE_URL });
    return pyodideInstance;
  })();

  return pyodideLoading;
}

export async function preparePythonRuntime(onStatus?: (msg: string) => void): Promise<void> {
  onStatus?.('Preparing Python environment…');
  await loadPyodide();
}

function runCodeInWorker(
  code: string,
  testCode: string,
  timeoutMs: number = 2000,
): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    const start = performance.now();

    if (typeof Worker === 'undefined') {
      // Fallback for Node/jsdom test environments
      try {
        const stdout: string[] = [];
        const stderr: string[] = [];
        const mockConsole = {
          log: (...args: unknown[]) => stdout.push(args.map(String).join(' ')),
          error: (...args: unknown[]) => stderr.push(args.map(String).join(' ')),
          warn: (...args: unknown[]) => stderr.push(args.map(String).join(' ')),
          info: (...args: unknown[]) => stdout.push(args.map(String).join(' ')),
          dir: (...args: unknown[]) => stdout.push(args.map(String).join(' ')),
          table: (...args: unknown[]) => stdout.push(args.map(String).join(' ')),
        };
        const runner = new Function('console', code + '\n' + testCode);
        const result = runner(mockConsole);
        const testResult = (globalThis as any).__testResult;
        delete (globalThis as any).__testResult;
        const testsPassed = testResult?.passed ?? 0;
        const testsTotal = testResult?.total ?? 0;
        const pass = testsTotal === 0 || testsPassed === testsTotal;
        const out = stdout.join('\n') + (result !== undefined ? (stdout.length > 0 ? '\n' + String(result) : String(result)) : '');

        resolve({
          success: pass,
          stdout: out,
          stderr: stderr.join('\n'),
          testsPassed,
          testsTotal,
          durationMs: Math.round(performance.now() - start),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        resolve({
          success: false,
          stdout: '',
          stderr: message,
          errorMessage: message,
          errorLine: parseJsErrorLine(message, code),
          durationMs: Math.round(performance.now() - start),
        });
      }
      return;
    }

    const workerCode = `
      self.onmessage = function(e) {
        const { code, testCode } = e.data;
        const stdout = [];
        const stderr = [];
        const NL = String.fromCharCode(10);
        const mockConsole = {
          log: (...args) => stdout.push(args.map(String).join(' ')),
          error: (...args) => stderr.push(args.map(String).join(' ')),
          warn: (...args) => stderr.push(args.map(String).join(' ')),
          info: (...args) => stdout.push(args.map(String).join(' ')),
          dir: (...args) => stdout.push(args.map(String).join(' ')),
          table: (...args) => stdout.push(args.map(String).join(' ')),
          count: () => {},
          countReset: () => {},
          time: () => {},
          timeEnd: () => {},
          timeLog: () => {},
          group: () => {},
          groupCollapsed: () => {},
          groupEnd: () => {},
          assert: (cond, ...args) => { if (!cond) stderr.push('Assertion failed: ' + args.map(String).join(' ')); },
          trace: (...args) => stdout.push('Trace: ' + args.map(String).join(' ')),
        };
        try {
          const runner = new Function('console', code + NL + testCode);
          const result = runner(mockConsole);
          const testResult = self.__testResult || globalThis.__testResult;
          self.postMessage({
            success: true,
            stdout: stdout.join(NL),
            stderr: stderr.join(NL),
            result: result !== undefined ? String(result) : undefined,
            testResult
          });
        } catch (err) {
          self.postMessage({
            success: false,
            stdout: stdout.join(NL),
            stderr: stderr.join(NL),
            errorMessage: err instanceof Error ? err.message : String(err)
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    let completed = false;

    const timeoutId = setTimeout(() => {
      if (completed) return;
      completed = true;
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        success: false,
        stdout: '',
        stderr: 'Error: Execution timed out (infinite loop or hang detected).',
        errorMessage: 'Execution timed out (infinite loop or hang detected).',
        durationMs: timeoutMs,
      });
    }, timeoutMs);

    worker.onmessage = (e) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutId);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      const { success, stdout, stderr, errorMessage, testResult, result } = e.data;
      const testsPassed = testResult?.passed ?? 0;
      const testsTotal = testResult?.total ?? 0;
      const pass = success && (testsTotal === 0 || testsPassed === testsTotal);

      // If we have a plain return value (e.g. from freeform run), return it as result
      const out = stdout + (result !== undefined ? (stdout ? '\n' + result : result) : '');

      resolve({
        success: pass,
        stdout: out,
        stderr: stderr || '',
        errorMessage,
        errorLine: errorMessage ? parseJsErrorLine(errorMessage, code) : undefined,
        testsPassed,
        testsTotal,
        durationMs: Math.round(performance.now() - start),
      });
    };

    worker.onerror = (err) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutId);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        errorMessage: err.message,
        durationMs: Math.round(performance.now() - start),
      });
    };

    worker.postMessage({ code, testCode });
  });
}

export async function runJavaScript(
  code: string,
  testCode: string,
): Promise<SandboxRunResult> {
  return runCodeInWorker(code, testCode);
}

export async function runPython(
  code: string,
  testCode: string,
): Promise<SandboxRunResult> {
  const start = performance.now();
  const stdout: string[] = [];
  const stderr: string[] = [];

  try {
    const pyodide = await loadPyodide();
    pyodide.setStdout({ batched: (msg) => stdout.push(msg) });
    pyodide.setStderr({ batched: (msg) => stderr.push(msg) });

    await pyodide.runPythonAsync(code);
    await pyodide.runPythonAsync(testCode);

    const result = await pyodide.runPythonAsync('__test_result__');
    const testsPassed = (result as { passed?: number })?.passed ?? 0;
    const testsTotal = (result as { total?: number })?.total ?? 0;
    const success = testsPassed === testsTotal && testsTotal > 0;

    return {
      success,
      stdout: stdout.join('\n').trim(),
      stderr: stderr.join('\n').trim(),
      testsPassed,
      testsTotal,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stdout: stdout.join('\n').trim(),
      stderr: stderr.join('\n').trim(),
      errorMessage: message,
      errorLine: parsePythonErrorLine(message),
      durationMs: Math.round(performance.now() - start),
    };
  }
}

export async function runSandboxCode(
  language: SandboxLanguage,
  code: string,
  testCode: string,
  onStatus?: (msg: string) => void,
): Promise<SandboxRunResult> {
  if (language === 'python') {
    onStatus?.('Running Python on backend…');
    return api.runCompiledCode('python', code, testCode);
  }
  return runJavaScript(code, testCode);
}

async function runCompiledLanguage(
  language: 'c' | 'cpp' | 'java' | 'python',
  code: string,
  start: number,
): Promise<SandboxRunResult> {
  try {
    const result = await api.runCompiledCode(language, code);
    return {
      ...result,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stdout: '',
      stderr: message,
      errorMessage: message,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

/** Run user code without exercise tests (Practice compiler / freeform). */
export async function runFreeformCode(
  language: FreeformLanguage,
  code: string,
  onStatus?: (msg: string) => void,
): Promise<SandboxRunResult> {
  const start = performance.now();
  let codeToRun = code;

  const langLower = language.toLowerCase();
  if (langLower === 'typescript' || langLower === 'ts') {
    codeToRun = transpileTypeScriptToJs(code);
  }

  if (COMPILED_LANGUAGES.has(langLower)) {
    const action = langLower === 'python' ? 'Running' : 'Compiling';
    onStatus?.(`${action} ${langLower.toUpperCase()}…`);
    return runCompiledLanguage(langLower as 'c' | 'cpp' | 'java' | 'python', codeToRun, start);
  }

  return runCodeInWorker(codeToRun, '');
}
