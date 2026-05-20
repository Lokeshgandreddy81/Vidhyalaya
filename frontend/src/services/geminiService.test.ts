import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIRequestQueue } from './geminiService';
import * as geminiService from './geminiService';

const mockGenerateContent = vi.fn();
const mockList = vi.fn().mockImplementation(async function* () {
  yield { name: 'models/gemini-2.0-flash', supportedActions: ['generateContent'] };
});

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      list: mockList,
      generateContent: mockGenerateContent
    };
    constructor() {}
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
    Modality: { AUDIO: 'AUDIO' }
  };
});

describe('AIRequestQueue', () => {
  let queue: AIRequestQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new AIRequestQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should process a single successful request', async () => {
    const mockTask = vi.fn().mockResolvedValue('success result');
    const resultPromise = queue.add(mockTask);

    // Fast-forward to allow the microtask queue to process
    await Promise.resolve();

    expect(mockTask).toHaveBeenCalledTimes(1);
    const result = await resultPromise;
    expect(result).toBe('success result');
  });

  it('should delay subsequent requests by minDelayMs (800ms)', async () => {
    const mockTask1 = vi.fn().mockResolvedValue('result 1');
    const mockTask2 = vi.fn().mockResolvedValue('result 2');

    const resultPromise1 = queue.add(mockTask1);
    const resultPromise2 = queue.add(mockTask2);

    // Initial check: task 1 should start immediately, task 2 should wait
    await Promise.resolve();
    expect(mockTask1).toHaveBeenCalledTimes(1);
    expect(mockTask2).toHaveBeenCalledTimes(0);

    // Fast-forward slightly before minDelayMs
    await vi.advanceTimersByTimeAsync(799);
    expect(mockTask2).toHaveBeenCalledTimes(0);

    // Fast-forward to exactly minDelayMs
    await vi.advanceTimersByTimeAsync(1);
    expect(mockTask2).toHaveBeenCalledTimes(1);

    const [res1, res2] = await Promise.all([resultPromise1, resultPromise2]);
    expect(res1).toBe('result 1');
    expect(res2).toBe('result 2');
  });

  it('should propagate errors from the task and continue processing the queue', async () => {
    const errorTask = vi.fn().mockRejectedValue(new Error('Task failed'));
    const successTask = vi.fn().mockResolvedValue('success result');

    const errorPromise = queue.add(errorTask);
    const successPromise = queue.add(successTask);

    await Promise.resolve();
    expect(errorTask).toHaveBeenCalledTimes(1);

    await expect(errorPromise).rejects.toThrow('Task failed');

    // Wait for the delay
    await vi.advanceTimersByTimeAsync(800);
    expect(successTask).toHaveBeenCalledTimes(1);

    const result = await successPromise;
    expect(result).toBe('success result');
  });

  it('should timeout a task if it takes more than 120 seconds', async () => {
    // A task that never resolves
    const longTask = vi.fn().mockImplementation(() => new Promise(() => {}));

    const resultPromise = queue.add(longTask);

    await Promise.resolve();
    expect(longTask).toHaveBeenCalledTimes(1);

    // Fast forward just before timeout
    await vi.advanceTimersByTimeAsync(119999);

    // Fast forward past timeout
    const timeoutPromise = expect(resultPromise).rejects.toThrow('AI_TIMEOUT: Request exceeded 120 seconds. The model may be overloaded.');

    await vi.advanceTimersByTimeAsync(1);

    await timeoutPromise;
  });
});

describe('generateConceptMap edge case parsing failure', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
    mockGenerateContent.mockClear();
    mockList.mockClear();
    localStorage.clear();

    // Populate cached models
    await geminiService.listModels(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should construct and return the default structure when AI response is invalid JSON', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'This is an invalid JSON payload }' }]
          }
        }
      ]
    });

    const moduleTitle = 'React Advanced Concepts';
    const concepts = ['Hooks', 'Context API'];
    const content = 'Some detailed text...';

    const result = await geminiService.generateConceptMap(moduleTitle, concepts, content);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to parse concept map:",
      expect.any(Error)
    );

    expect(result).toBeDefined();
    expect(result.centralConcept).toBe(moduleTitle);

    expect(result.nodes).toHaveLength(3);
    expect(result.relationships).toHaveLength(2);

    expect(result.nodes[0]).toEqual({
      id: 'central',
      label: moduleTitle,
      description: `Master ${moduleTitle}`,
      depth: 0
    });

    expect(result.nodes[1]).toEqual({
      id: 'concept-0',
      label: 'Hooks',
      description: 'Hooks',
      depth: 1,
      parentId: 'central',
      connections: ['central']
    });

    expect(result.relationships[0]).toEqual({
      from: 'central',
      to: 'concept-0',
      label: 'includes'
    });

    consoleSpy.mockRestore();
  });
});
