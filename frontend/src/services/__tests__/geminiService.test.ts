import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as geminiService from '../geminiService';

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

describe('generateAudioOverview', () => {
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

  it('should return an ArrayBuffer on success', async () => {
    const base64Audio = btoa('dummy-audio-content');
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: base64Audio } }]
          }
        }
      ]
    });

    const result = await geminiService.generateAudioOverview('Hello World');
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('should return null when inlineData is missing', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'no audio here' }]
          }
        }
      ]
    });

    const result = await geminiService.generateAudioOverview('Hello World');
    expect(result).toBeNull();
  });

  it('should propagate errors correctly', async () => {
    const apiError = new Error('API Error non-retryable');
    mockGenerateContent.mockRejectedValue(apiError);

    await expect(geminiService.generateAudioOverview('Hello World')).rejects.toThrow('API Error non-retryable');
  });
});
