/**
 * WorkspaceConfigurator Worker — Generates project structure and starter code.
 *
 * Uses callAIEngine to produce file trees and initial implementation files
 * that the student can use as a starting point for their project.
 */

import { callAIEngine } from '../../../utils/aiClientRouter.js';

/**
 * @param {{ topic: string, context: string, req: import('express').Request }} params
 * @returns {Promise<{ structure: string, files: Array<{ name: string, content: string, language: string }> }>}
 */
export async function executeWorkspaceConfigurator({ topic, context, req }) {
  const prompt = `Generate a clean project structure and starter code files for a project about "${topic}".
Context: ${context || 'General project setup'}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "structure": "A clean ASCII file tree showing the recommended project directory layout using ├── and └── characters",
  "files": [
    {
      "name": "filename.ext",
      "content": "The actual starter code content for this file",
      "language": "javascript"
    }
  ]
}

Guidelines:
- Keep the file tree focused and minimal (no node_modules, no build artifacts)
- Include only 2-4 essential starter files (e.g., entry point, config, one core module)
- Each file should have clean, well-commented, production-ready starter code
- Use modern best practices for the relevant tech stack
- Language field should be: javascript, typescript, python, html, css, go, rust, or similar`;

  const text = await callAIEngine({
    req,
    prompt,
    systemInstruction: 'You are a project scaffolding expert. Return only valid JSON objects. No markdown fences.',
    temperature: 0.2,
    maxOutputTokens: 2048,
    timeoutMs: 4000,
  });

  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && typeof parsed.structure === 'string' && Array.isArray(parsed.files)) {
      const files = parsed.files.slice(0, 4).map((f) => ({
        name: String(f.name || ''),
        content: String(f.content || ''),
        language: String(f.language || 'text'),
      })).filter((f) => f.name.length > 0 && f.content.length > 0);

      console.log(`[WorkspaceConfigurator] Generated structure with ${files.length} files for "${topic}"`);
      return {
        structure: parsed.structure,
        files,
      };
    }
  } catch (parseErr) {
    console.warn(`[WorkspaceConfigurator] Failed to parse response: ${parseErr.message}`);
  }

  return { structure: '', files: [] };
}
