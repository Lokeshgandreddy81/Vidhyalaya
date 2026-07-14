import { describe, it, expect } from 'vitest';
import { buildModuleExercises, createInitialSandboxState } from './exercises';
import { runJavaScript } from '../../services/sandboxRunner';

describe('sandbox exercises', () => {
  it('creates three exercises per module', () => {
    const exercises = buildModuleExercises('Loops', ['iteration', 'arrays']);
    expect(exercises).toHaveLength(3);
    expect(exercises[0].language).toBe('javascript');
    expect(exercises[2].language).toBe('python');
  });

  it('initializes sandbox state from first exercise', () => {
    const exercises = buildModuleExercises('Test', ['a']);
    const state = createInitialSandboxState(exercises);
    expect(state.exerciseIndex).toBe(0);
    expect(state.files['main.js']).toBeDefined();
  });
});

describe('runJavaScript', () => {
  it('passes when greet function is correct', async () => {
    const code = `function greet(name) { return 'Hello, ' + name + '!'; }`;
    const testCode = `
      if (greet('World') !== 'Hello, World!') throw new Error('fail');
      globalThis.__testResult = { passed: 1, total: 1 };
    `;
    const result = await runJavaScript(code, testCode);
    expect(result.success).toBe(true);
    expect(result.testsPassed).toBe(1);
  });

  it('fails with error message on bad code', async () => {
    const code = `function greet(name) { return prnt(name); }\nconsole.log(greet('World'));`;
    const testCode = `globalThis.__testResult = { passed: 0, total: 1 };`;
    const result = await runJavaScript(code, testCode);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});
