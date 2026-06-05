import { SandboxExercise, SandboxState } from '../../types';

export function buildModuleExercises(moduleTitle: string, keyConcepts: string[]): SandboxExercise[] {
  const concept = keyConcepts[0] || moduleTitle;
  const concept2 = keyConcepts[1] || concept;

  return [
    {
      id: 'ex-1-greet',
      title: 'Write a greeting function',
      brief: `Create a function called greet that takes a name and returns "Hello, {name}!". This connects to ${concept}.`,
      language: 'javascript',
      starterFiles: [
        {
          name: 'main.js',
          content: `// Complete the greet function\nfunction greet(name) {\n  // Your code here\n}\n\nconsole.log(greet('World'));\n`,
        },
      ],
      testCode: `
let __passed = 0;
const __total = 2;
if (typeof greet !== 'function') throw new Error('Define a function called greet');
if (greet('World') !== 'Hello, World!') throw new Error('greet("World") should return "Hello, World!"');
__passed++;
if (greet('${concept.replace(/'/g, "\\'")}') !== 'Hello, ${concept.replace(/'/g, "\\'")}!') throw new Error('greet should work for any name');
__passed++;
globalThis.__testResult = { passed: __passed, total: __total };
`,
      hints: [
        'Use return inside the function.',
        'Template literals look like: `Hello, ${name}!`',
      ],
    },
    {
      id: 'ex-2-fix',
      title: 'Fix the off-by-one bug',
      brief: `The sum function should add numbers from 1 to n. Find and fix the bug related to ${concept2}.`,
      language: 'javascript',
      starterFiles: [
        {
          name: 'main.js',
          content: `// Fix the bug so sum(5) returns 15\nfunction sum(n) {\n  let total = 0;\n  for (let i = 1; i < n; i++) {\n    total += i;\n  }\n  return total;\n}\n\nconsole.log(sum(5));\n`,
        },
      ],
      testCode: `
let __passed = 0;
const __total = 2;
if (sum(5) !== 15) throw new Error('sum(5) should be 15 — check your loop bounds');
__passed++;
if (sum(3) !== 6) throw new Error('sum(3) should be 6');
__passed++;
globalThis.__testResult = { passed: __passed, total: __total };
`,
      hints: [
        'Should the loop include n itself?',
        'Try changing i < n to i <= n.',
      ],
    },
    {
      id: 'ex-3-python',
      title: 'Format output in Python',
      brief: `Write a describe function that returns a sentence about ${concept} using an f-string.`,
      language: 'python',
      starterFiles: [
        {
          name: 'main.py',
          content: `# Complete describe() so it returns a sentence about the topic\ndef describe(topic):\n    # Your code here\n    pass\n\nprint(describe("${concept.replace(/"/g, '\\"')}"))\n`,
        },
      ],
      testCode: `
result = describe("${concept.replace(/"/g, '\\"')}")
assert isinstance(result, str), "describe should return a string"
assert "${concept.replace(/"/g, '\\"')}" in result, "The result should mention the topic"
assert len(result) > 10, "Write a full sentence, not just the topic name"
__test_result__ = {"passed": 2, "total": 2}
`,
      hints: [
        'Use an f-string: f"{topic} is ..."',
        'Return the string from the function.',
      ],
    },
  ];
}

export function createInitialSandboxState(exercises: SandboxExercise[]): SandboxState {
  const first = exercises[0];
  const files: Record<string, string> = {};
  for (const f of first.starterFiles) {
    files[f.name] = f.content;
  }
  return {
    files,
    activeFile: first.starterFiles[0]?.name || 'main.js',
    language: first.language,
    exerciseIndex: 0,
    attempts: {},
    completedExerciseIds: [],
  };
}

export function loadExerciseIntoState(state: SandboxState, exercises: SandboxExercise[], index: number): SandboxState {
  const exercise = exercises[index];
  if (!exercise) return state;
  const files: Record<string, string> = {};
  for (const f of exercise.starterFiles) {
    files[f.name] = state.files[f.name] ?? f.content;
  }
  return {
    ...state,
    files,
    activeFile: exercise.starterFiles[0]?.name || state.activeFile,
    language: exercise.language,
    exerciseIndex: index,
  };
}
