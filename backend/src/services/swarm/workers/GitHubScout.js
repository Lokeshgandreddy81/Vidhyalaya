/**
 * GitHubScout Worker — Discovers relevant GitHub repositories and boilerplates.
 *
 * Uses callAIEngine with Google Search grounding (tools: [{ googleSearch: {} }])
 * to find real GitHub repositories, starter templates, and reference implementations.
 */

import { callAIEngine } from '../../../utils/aiClientRouter.js';

const MAX_RESULTS = 4;

/**
 * @param {{ topic: string, context: string, req: import('express').Request }} params
 * @returns {Promise<{ repos: Array<{ name: string, url: string, description: string }> }>}
 */
export async function executeGitHubScout({ topic, context, req }) {
  const prompt = `Find ${MAX_RESULTS} relevant and popular GitHub repositories related to "${topic}".
Context: ${context || 'General learning'}

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  { "name": "owner/repo-name", "url": "https://github.com/owner/repo-name", "description": "Brief description of what this repo provides" }
]

Prioritize:
- Actively maintained repositories (recent commits)
- Repos with high star counts that indicate community trust
- Starter templates and boilerplates that help beginners get started quickly
- Reference implementations and example projects
- Libraries or frameworks directly relevant to the topic`;

  const text = await callAIEngine({
    req,
    prompt,
    systemInstruction: 'You are a GitHub repository researcher. Return only valid JSON arrays. No markdown fences.',
    temperature: 0.1,
    maxOutputTokens: 1024,
    timeoutMs: 4000,
    tools: [{ googleSearch: {} }],
  });

  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      const repos = parsed.slice(0, MAX_RESULTS).map((r) => ({
        name: String(r.name || ''),
        url: String(r.url || ''),
        description: String(r.description || ''),
      })).filter((r) => r.name.length > 0 && r.url.length > 0);

      console.log(`[GitHubScout] Found ${repos.length} repos for "${topic}"`);
      return { repos };
    }
  } catch (parseErr) {
    console.warn(`[GitHubScout] Failed to parse response: ${parseErr.message}`);
  }

  return { repos: [] };
}
