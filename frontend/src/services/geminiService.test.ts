import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIRequestQueue } from './geminiService';

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

  it('should delay subsequent requests by minDelayMs (1500ms)', async () => {
    const mockTask1 = vi.fn().mockResolvedValue('result 1');
    const mockTask2 = vi.fn().mockResolvedValue('result 2');

    const resultPromise1 = queue.add(mockTask1);
    const resultPromise2 = queue.add(mockTask2);

    // Initial check: task 1 should start immediately, task 2 should wait
    await Promise.resolve();
    expect(mockTask1).toHaveBeenCalledTimes(1);
    expect(mockTask2).toHaveBeenCalledTimes(0);

    // Fast-forward slightly before minDelayMs
    await vi.advanceTimersByTimeAsync(1499);
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
    await vi.advanceTimersByTimeAsync(1500);
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
