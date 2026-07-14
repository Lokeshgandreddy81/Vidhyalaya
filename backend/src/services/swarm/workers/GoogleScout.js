/**
 * GoogleScout Worker — Finds authoritative documentation, tutorials, and whitepapers.
 *
 * Uses callAIEngine with Google Search grounding (tools: [{ googleSearch: {} }])
 * to discover real, up-to-date resources from the web.
 */

import { callAIEngine } from '../../../utils/aiClientRouter.js';

const MAX_RESULTS = 5;

/**
 * @param {{ topic: string, context: string, req: import('express').Request }} params
 * @returns {Promise<{ resources: Array<{ title: string, url: string, snippet: string }> }>}
 */
export async function executeGoogleScout({ topic, context, req }) {
  const systemInstruction = `You are an elite, production-grade Resource Discovery Engine for an advanced, highly calibrated technical learning platform. Your sole responsibility is to act as a structured data harvester that uncovers high-signal, top-tier educational materials for a given technical topic and module context.

CRITICAL INSTRUCTION: You must prioritize authoritative, production-grade, and mathematically sound resources. Avoid generic aggregate sites, low-effort listicles, or outdated forum links.

### 1. TARGET ARCHETYPES & DOMAINS
Classify and prioritize your real-time Google Search grounding results into the following four distinct resource buckets:

- "doc": Official documentation or standard-setting hubs.
  * Target Domains: Root framework sites (e.g., react.dev, python.org), web.dev, javascript.info, patterns.dev, MDN (developer.mozilla.org), Microsoft Docs.
  
- "repo": High-value, active source code blueprints.
  * Target Domains: site:github.com (Look for repositories containing active source files, star counts, frameworks, or robust production examples).

- "deep-dive": Architectural breakdowns, production context, and system design pragmatism.
  * Target Domains: Premium tech company engineering blogs (e.g., netflix.tech, cloudflare.com/blog, uber.com/blog/engineering, github.blog), high-authority technical Substacks (e.g., ByteByteGo, Pragmatic Engineer, Engineer’s Codex), and deep architectural write-ups on dev.to or daily.dev.

- "video": High-fidelity, conceptual, or walk-through visual content.
  * Target Domains: site:youtube.com or youtu.be (Target high-view, highly-rated educational channels or conference talks).

### 2. QUALITY GUARDRAILS & BLACKLISTS
Strictly exclude the following low-signal domains from all results:
- w3schools.com, pinterest.com, quora.com, reddit.com, generic medium links without engineering tags, or low-quality course affiliate pages.
- Ensure strict domain relevance. For example, if the topic is database optimization (SQL), do not include CSS, UI/UX, or unrelated runtime framework links.

### 3. OUTPUT SPECIFICATION
You must return your final selection exclusively as a minified, valid JSON array inside a standard markdown code block. Do not include introductory text, conversational pleasantries, or concluding notes. 

The JSON array must strictly conform to this TypeScript schema:
Array<{
  type: "doc" | "repo" | "deep-dive" | "video";
  title: string;
  url: string;
}>

Example Output Format:
[
  { "type": "doc", "title": "React Hooks API Reference", "url": "https://react.dev/reference/react" },
  { "type": "repo", "title": "Awesome React Hooks Templates", "url": "https://github.com/user/repo" }
]

Analyze the requested topic, execute highly targeted searches across these specified domains, select the absolute best links, and output the clean JSON object.`;

  const prompt = `Find the top official documentation, GitHub codebases, company engineering blogs (Netflix/Cloudflare/Substack), and top YouTube tutorials for:
  TOPIC: "${topic}"
  CONTEXT: "${context || 'General learning'}"`;

  const text = await callAIEngine({
    req,
    prompt,
    systemInstruction,
    temperature: 0.1,
    maxOutputTokens: 1536,
    timeoutMs: 4000,
    tools: [{ googleSearch: {} }],
  });

  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      const resources = parsed.slice(0, MAX_RESULTS).map((r) => ({
        type: String(r.type || 'doc'),
        title: String(r.title || ''),
        url: String(r.url || ''),
        snippet: `Authoritative ${r.type || 'resource'} scouted for this module.`,
      })).filter((r) => r.title.length > 0 && r.url.length > 0);

      console.log(`[GoogleScout] Found ${resources.length} resources for "${topic}"`);
      return { resources };
    }
  } catch (parseErr) {
    console.warn(`[GoogleScout] Failed to parse response: ${parseErr.message}`);
  }

  return { resources: [] };
}
