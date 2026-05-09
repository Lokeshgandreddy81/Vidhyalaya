import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAudioOverview } from '../geminiService';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Modality: { AUDIO: 'AUDIO', TEXT: 'TEXT' },
  };
});

describe('geminiService: generateAudioOverview', () => {
  let originalEnv: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv, VITE_GEMINI_API_KEY: 'test-api-key' };

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
      },
      writable: true
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-1.5-flash' },
          { name: 'models/gemini-1.5-pro' },
          { name: 'models/gemini-2.5-flash' },
          { name: 'models/gemini-2.5-pro' },
          { name: 'models/gemini-tts' },
        ]
      })
    }) as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return null when the API successfully responds but returns no base64 audio data', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                // Missing inlineData
              }
            ]
          }
        }
      ]
    });

    const result = await generateAudioOverview('This is a test text');
    expect(result).toBeNull();
  });

  it('should handle retries and eventually throw specific error if it fails multiple times', async () => {
    const error: any = new Error('Too Many Requests');
    error.status = 429;

    mockGenerateContent.mockRejectedValue(error);

    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, ms: any) => {
        if (ms !== 120000) {
            cb();
        }
        return { unref: () => {} } as any;
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await expect(generateAudioOverview('This is a test text')).rejects.toThrow('Too Many Requests');
  });

  it('should handle generic API failures without retries', async () => {
    const error = new Error('Generic API Failure');
    mockGenerateContent.mockRejectedValue(error);

    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, ms: any) => {
        if (ms !== 120000) {
            cb();
        }
        return { unref: () => {} } as any;
    });

    await expect(generateAudioOverview('This is a test text')).rejects.toThrow('Generic API Failure');
  });
});
