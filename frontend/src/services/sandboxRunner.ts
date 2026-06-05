import { SandboxLanguage, SandboxRunResult } from '../types';

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

export function runJavaScript(
  code: string,
  testCode: string,
): SandboxRunResult {
  const start = performance.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => stdout.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => stderr.push(args.map(String).join(' ')),
  };

  try {
    const runner = new Function('console', `${code}\n${testCode}`);
    runner(mockConsole);
    const result = (globalThis as { __testResult?: { passed: number; total: number } }).__testResult;
    delete (globalThis as { __testResult?: unknown }).__testResult;

    const testsPassed = result?.passed ?? 0;
    const testsTotal = result?.total ?? 0;
    const success = testsPassed === testsTotal && testsTotal > 0;

    return {
      success,
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n'),
      testsPassed,
      testsTotal,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n'),
      errorMessage: message,
      errorLine: parseJsErrorLine(message, code),
      durationMs: Math.round(performance.now() - start),
    };
  }
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
    await preparePythonRuntime(onStatus);
  }
  return language === 'python'
    ? runPython(code, testCode)
    : Promise.resolve(runJavaScript(code, testCode));
}
