import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateConceptMap } from '../geminiService';
import * as geminiServiceModule from '../geminiService';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
        list: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { name: 'models/gemini-1.5-flash', supportedActions: ['generateContent'] };
          }
        })
      };
    }
  };
});

describe('generateConceptMap', () => {
  const originalEnv = process.env;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, VITE_GEMINI_API_KEY: 'test-api-key' };
    (import.meta as any).env = { VITE_GEMINI_API_KEY: 'test-api-key' };

    // Silence console outputs for clean test run
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should construct a valid fallback structure when JSON parsing fails', async () => {
    // Return an invalid JSON response
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'Invalid JSON Response' }]
          }
        }
      ]
    });

    const moduleTitle = "React Hooks";
    const concepts = ["useState", "useEffect"];

    const result = await generateConceptMap(moduleTitle, concepts, "test content");

    expect(result.centralConcept).toBe(moduleTitle);

    // Check nodes structure
    expect(result.nodes).toHaveLength(concepts.length + 1); // 1 central node + concept nodes

    // Check central node
    expect(result.nodes[0]).toEqual({
      id: 'central',
      label: moduleTitle,
      description: `Master ${moduleTitle}`,
      depth: 0
    });

    // Check first concept node
    expect(result.nodes[1]).toEqual({
      id: 'concept-0',
      label: 'useState',
      description: 'useState',
      depth: 1,
      parentId: 'central',
      connections: ['central']
    });

    // Check relationships
    expect(result.relationships).toHaveLength(concepts.length);
    expect(result.relationships[0]).toEqual({
      from: 'central',
      to: 'concept-0',
      label: 'includes'
    });

    // Verify that the error was caught and logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to parse concept map:",
      expect.any(SyntaxError)
    );
  });
});
