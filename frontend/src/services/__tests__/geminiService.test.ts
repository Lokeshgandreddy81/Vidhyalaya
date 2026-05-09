import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGenerateContent = vi.fn();

// Mock the named export GoogleGenAI directly as a class
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
        list: async function* () {
          yield { name: 'models/gemini-2.0-flash', supportedActions: ['generateContent'] };
          yield { name: 'models/gemini-1.5-flash', supportedActions: ['generateContent'] };
        },
      }
    },
    Modality: {
      AUDIO: 'AUDIO'
    }
  };
});

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

import { generateLearningPlan } from '../geminiService';

describe('geminiService: generateLearningPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully parse and return a learning plan from valid JSON', async () => {
    const validResponse = {
      title: "React Mastery",
      description: "Learn React from scratch",
      phases: [
        {
          title: "Basics",
          description: "Core concepts",
          modules: [
            {
              title: "Components",
              description: "Building blocks",
              estimatedMinutes: 30,
              keyConcepts: ["JSX", "Props"]
            }
          ]
        }
      ]
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: `\`\`\`json\n${JSON.stringify(validResponse)}\n\`\`\``
    });

    const result = await generateLearningPlan(
      'Learn React',
      'Video, articles',
      2,
      'Beginner',
      'Build a web app',
      '2024-12-31',
      'Foundational'
    );

    expect(result).toEqual(validResponse);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents[0].parts[0].text).toContain("Generate exactly 4 phases (range: 3 to 5)");
  });

  it('should successfully parse valid JSON not wrapped in markdown fences', async () => {
    const validResponse = {
      title: "Advanced TS",
      description: "Deep dive into TypeScript",
      phases: []
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(validResponse)
    });

    const result = await generateLearningPlan(
      'Learn TS',
      'Docs',
      1,
      'Expert',
      'Mastery',
      '2024-12-31',
      'Advanced'
    );

    expect(result).toEqual(validResponse);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents[0].parts[0].text).toContain("Generate exactly 16 phases");
  });

  it('should throw an error if AI returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "" });

    await expect(generateLearningPlan('Goal', 'Resources', 1, 'Beginner', 'Mastery', '2024-12-31', 'Expert'))
      .rejects.toThrow("AI returned an empty response.");
  });

  it('should throw an error if AI returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "This is not JSON at all."
    });

    await expect(generateLearningPlan('Goal', 'Resources', 1, 'Beginner', 'Mastery', '2024-12-31', 'Expert'))
      .rejects.toThrow("AI returned invalid data format.");
  });

  it('should pass correct phase instructions based on depth', async () => {
    mockGenerateContent.mockResolvedValue({
      text: `\`\`\`json\n{"title": "Test"}\n\`\`\``
    });

    // Test 'Expert' (default logic)
    await generateLearningPlan('Goal', 'Resources', 1, 'Beginner', 'Mastery', '2024-12-31', 'Expert');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents[0].parts[0].text).toContain("Generate exactly 8 phases");
  });
});
