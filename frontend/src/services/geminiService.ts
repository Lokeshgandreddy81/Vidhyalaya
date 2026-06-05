import { GoogleGenAI, Modality } from "@google/genai";
import { LearningPath, Resource, ChatMessage, QuizQuestion, VideoSegment, ContentCitation, SandboxErrorExplanation, SandboxFixProposal } from "../types";
import { api } from "./api";

type ModelKind = 'text' | 'lite' | 'tts';

const PREFERRED_MODELS: Record<ModelKind, string[]> = {
  text: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
  ],
  lite: [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ],
  tts: [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ],
};

let aiInstance: GoogleGenAI | null = null;
let cachedAvailableModels: string[] | null = null;
let resolvedModelCache: Partial<Record<ModelKind, string>> = {};

function getAI(): GoogleGenAI {
  const customApiKey = localStorage.getItem('vidyal_custom_gemini_api_key');
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please enter your Gemini API Key in Settings or the API Setup screen.");
  }
  
  if (!aiInstance || (aiInstance as any)._apiKey !== apiKey) {
    aiInstance = new GoogleGenAI({
      apiKey,
      apiVersion: import.meta.env.VITE_GEMINI_API_VERSION || 'v1beta',
    });
    (aiInstance as any)._apiKey = apiKey;
  }
  return aiInstance;
}

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, '');
}

function getSupportedActions(model: any): string[] {
  return model?.supportedActions ?? model?.supported_actions ?? [];
}

function isModelNotFoundError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    error?.status === 404 ||
    message.includes('not found for api version') ||
    message.includes('call listmodels') ||
    message.includes('not supported for generatecontent')
  );
}

function isQuotaError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    error?.status === 429 ||
    error?.status === 503 ||
    message.includes('quota exceeded') ||
    message.includes('resource_exhausted') ||
    message.includes('high demand') ||
    message.includes('retry in')
  );
}

export async function listModels(forceRefresh = false): Promise<string[]> {
  if (!forceRefresh && cachedAvailableModels) return cachedAvailableModels;

  try {
    const pager = await getAI().models.list();
    const models: string[] = [];

    for await (const model of pager) {
      if (getSupportedActions(model).includes('generateContent') && model?.name) {
        models.push(normalizeModelName(model.name));
      }
    }

    cachedAvailableModels = Array.from(new Set(models));
  } catch (err) {
    console.warn('[Gemini] listModels API call failed, falling back to standard list:', err);
    cachedAvailableModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-pro'];
  }
  return cachedAvailableModels;
}

function buildModelCandidates(kind: ModelKind, available: string[]): string[] {
  const cached = resolvedModelCache[kind];
  const preferred = PREFERRED_MODELS[kind].filter(model => available.includes(model));
  const suitableFallback = available.filter(model => {
    if (preferred.includes(model)) return false;
    if (kind === 'tts') return model.includes('tts');
    return model.startsWith('gemini-') && !model.includes('tts') && !model.includes('image');
  });
  const lastResort = available.filter(
    model => !preferred.includes(model) && !suitableFallback.includes(model)
  );
  const candidates = [...preferred, ...suitableFallback, ...lastResort];

  if (!cached || !candidates.includes(cached)) return candidates;
  return [cached, ...candidates.filter(model => model !== cached)];
}

async function generateContentWithFallback(
  kind: ModelKind,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  let available = await listModels();
  let candidates = buildModelCandidates(kind, available);
  let lastError: any;

  while (candidates.length > 0) {
    const model = candidates.shift()!;
    resolvedModelCache[kind] = model;

    try {
      return await getAI().models.generateContent({ ...params, model });
    } catch (error) {
      lastError = error;

      if (isModelNotFoundError(error)) {
        cachedAvailableModels = null;
        available = await listModels(true);
        candidates = buildModelCandidates(kind, available).filter(candidate => candidate !== model);
        continue;
      }

      if (isQuotaError(error) && candidates.length > 0) {
        console.warn(`[Gemini] ${model} hit quota limits. Trying next available ${kind} model...`);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error(`No usable Gemini ${kind} model is currently available.`);
}

export class AIRequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelayMs = 800; // Accelerated from 1500ms for higher throughput

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        // Per-task timeout: if AI hangs for 120s, reject and unblock the queue
        const controller = { cancelled: false };
        const timeout = setTimeout(() => {
          controller.cancelled = true;
          reject(new Error('AI_TIMEOUT: Request exceeded 120 seconds. The model may be overloaded.'));
        }, 120000);
        try {
          const result = await operation();
          clearTimeout(timeout);
          if (!controller.cancelled) resolve(result);
        } catch (err) {
          clearTimeout(timeout);
          if (!controller.cancelled) reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try { await task(); } catch (e) { console.error('[Queue] Task error:', e); }
        await new Promise(resolve => setTimeout(resolve, this.minDelayMs));
      }
    }
    this.isProcessing = false;
  }
}

export const apiQueue = new AIRequestQueue();

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 4, delay = 1500): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRetryable = 
      error?.status === 429 || error?.status === 503 || 
      String(error?.message ?? '').includes('429') ||
      String(error?.message ?? '').includes('503') ||
      String(error?.message ?? '').toLowerCase().includes('exhausted') || 
      String(error?.message ?? '').toLowerCase().includes('high demand') ||
      String(error?.message ?? '').toLowerCase().includes('overloaded') ||
      String(error?.message ?? '').toLowerCase().includes('unavailable');
    if (isRetryable && retries > 0) {
      const waitMs = delay + Math.random() * 1000; // jitter
      console.warn(`[Gemini] Retryable error. Waiting ${Math.round(waitMs)}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ─── HELPER: safe text extractor ────────────────────────────────────────────
function getText(response: any): string {
  return response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── LEARNING PLAN ────────────────────────────────────────────────────────────
export const generateLearningPlan = async (
  goal: string,
  resources: string,
  dailyCommitment: number,
  skillLevel: string,
  expectedOutcome?: string,
  targetDate?: string,
  depth: 'Foundational' | 'Expert' | 'Advanced' = 'Expert'
): Promise<any> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    let phaseInstruction = "";
    if (depth === 'Foundational') {
      phaseInstruction = "CRITICAL SYSTEM RULE: You MUST output exactly between 3 and 5 phases in the JSON array. Generating more than 5 phases is strictly forbidden. Focus on absolute core essentials and rapid execution mechanics.";
    } else if (depth === 'Advanced') {
      phaseInstruction = "CRITICAL SYSTEM RULE: You MUST output exactly between 15 and 20 phases in the JSON array. Generating fewer than 15 phases is strictly forbidden. Represent an exhaustive, full-spectrum, academic-grade curriculum covering every corner, theory, edge case, and architectural milestone.";
    } else {
      phaseInstruction = "CRITICAL SYSTEM RULE: You MUST output exactly between 5 and 15 phases in the JSON array. Cover advanced conceptual models, deep methodologies, edge-case systems, and robust implementation mechanics.";
    }

    const prompt = `You are a curriculum architect. Return ONLY a raw JSON object — no markdown, no explanation, no preamble.

Generate a learning roadmap for: "${goal}"
Skill Level: "${skillLevel}"
Expected Outcome: "${expectedOutcome || 'Mastery'}"

GROUNDING RESOURCES (use these to inform the curriculum structure and module content):
${resources || 'No specific resources provided.'}

${phaseInstruction}

JSON shape (strictly follow this):
{
  "title": "string",
  "description": "string",
  "phases": [
    {
      "title": "string",
      "description": "string",
      "modules": [
        {
          "title": "string",
          "description": "string",
          "estimatedMinutes": 30,
          "keyConcepts": ["string"],
          "suggestedResources": [
            { "title": "string", "url": "string", "snippet": "brief relevance note" }
          ]
        }
      ]
    }
  ]
}`;
    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    let text = getText(response);
    if (!text) throw new Error("AI returned an empty response.");

    // Robust JSON Extraction: Handle Markdown fences or conversational preface
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) text = jsonMatch[1];
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error", e, "Raw:", text);
      throw new Error("AI returned invalid data format.");
    }
  }));
};

// ─── SCOUT RESOURCES ─────────────────────────────────────────────────────────
export const scoutResources = async (
  topic: string,
  goalContext = 'General Mastery',
  keyConcepts: string[] = [],
  retryCount = 0
): Promise<Resource[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const { sanitizeVideoId, scoreVideoMatch } = await import('../utils/youtube');
    let aiResults: Array<{ title: string; content: string }> = [];

    const { getVideosByTopic } = await import('./videoLibrary');
    const curated = getVideosByTopic(topic, 8, [], 'overview');

    const prompt = `Find 8 high-quality, REAL YouTube video IDs for learning: "${topic}".
Goal: "${goalContext}".
Key concepts: ${keyConcepts.slice(0, 5).join(', ') || topic}.
Channels: freeCodeCamp, Traversy Media, Programming with Mosh, Fireship, Web Dev Simplified, Academind, 3Blue1Brown.
Return EXACTLY 8 videos as a raw JSON array. DO NOT hallucinate IDs.
[{"title": "Video Title", "type": "youtube", "content": "https://www.youtube.com/watch?v=XXXXXXXXXXX"}]`;

    try {
      const r = await generateContentWithFallback('text', {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] },
      } as Parameters<typeof generateContentWithFallback>[1]);
      aiResults = JSON.parse(getText(r));
    } catch {
      try {
        const r = await generateContentWithFallback('text', {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' },
        });
        aiResults = JSON.parse(getText(r));
      } catch { aiResults = []; }
    }

    const uniqueIds = new Set<string>();
    const finalCandidates: Array<{ title: string; content: string; videoId: string }> = [];

    for (const v of curated) {
      const vid = sanitizeVideoId(v.id);
      if (vid && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({
          title: v.title,
          content: `https://www.youtube.com/watch?v=${vid}`,
          videoId: vid,
        });
      }
    }

    for (const item of aiResults) {
      if (!item?.content) continue;
      const vid = sanitizeVideoId(item.content);
      if (vid && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({
          title: item.title || topic,
          content: `https://www.youtube.com/watch?v=${vid}`,
          videoId: vid,
        });
      }
    }

    console.log(`📡 [SARA] Verifying ${finalCandidates.length} candidate(s) for "${topic}"...`);
    const verificationResults = await api.verifyVideos(finalCandidates.map(c => c.videoId));
    const verificationMap = new Map(verificationResults.map(v => [v.id, v]));

    const verifiedWithScore = finalCandidates
      .filter(c => verificationMap.get(c.videoId)?.embeddable)
      .map(c => ({
        candidate: c,
        score: scoreVideoMatch(
          verificationMap.get(c.videoId)?.title || c.title,
          '',
          topic,
          keyConcepts
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const verifiedResources: Resource[] = verifiedWithScore.slice(0, 8).map(({ candidate: c }) => ({
      id: `res-${Math.random().toString(36).slice(2, 11)}`,
      title: verificationMap.get(c.videoId)?.title || c.title,
      type: 'youtube' as const,
      content: c.content,
      videoId: c.videoId,
    }));

    if (verifiedResources.length === 0 && retryCount < 2) {
      console.warn(`⚠️ [SARA] No embeddable videos for "${topic}". Retrying...`);
      const simplifiedTopic = topic.split(' ').slice(0, 3).join(' ') + ' tutorial';
      return scoutResources(simplifiedTopic, goalContext, keyConcepts, retryCount + 1);
    }

    console.log(`✨ [SARA] Found ${verifiedResources.length} verified resources for "${topic}".`);
    return verifiedResources;
  }));
};

// ─── MAP MASTERY TIMELINE ─────────────────────────────────────────────────────
/**
 * Takes the generated content (markdown) and a list of verified YouTube videos,
 * and uses the backend to match each section heading with the best video clip.
 */
export const mapMasteryTimeline = async (content: string, videoIds: string[]): Promise<VideoSegment[]> => {
  if (!content || videoIds.length === 0) return [];

  const sanitizeSectionLabel = (label: string) => label
    .replace(/Step\s*9\.5\s*[—–-]\s*Quick Review Flow/gi, 'Step 9.5 — Mastery Checkpoint')
    .replace(/Quick Review Flow/gi, 'Mastery Checkpoint')
    .trim();

  // Extract H2 and H3 headings from markdown for a richer timeline
  const sections = (content.match(/^#{2,3}\s+(.+)$/gm) || [])
    .map(s => s.replace(/^#{2,3}\s+/, '').trim())
    .map(sanitizeSectionLabel)
    .filter(s => s.length > 3 && !s.toLowerCase().includes('conclusion') && !s.toLowerCase().includes('summary'));

  if (sections.length === 0) return [];

  console.log(`🔗 [MAP] Matching ${sections.length} sections against ${videoIds.length} videos...`);
  
  try {
    const matched = await api.matchChapters(sections, videoIds);
    
    return matched
      .filter(m => m.clips && m.clips.length > 0) // Only include matched sections
      .map((m, idx) => {
        const bestClip = m.clips[0];
        return {
          id: `seg-${idx}`,
          label: sanitizeSectionLabel(m.section),
          timestamp: bestClip.timestamp,
          videoId: bestClip.videoId,
          clips: m.clips.map(c => ({
            videoId: c.videoId,
            videoTitle: c.videoTitle,
            chapterTitle: c.chapterTitle,
            timestamp: c.timestamp,
            endTimestamp: c.endTimestamp,
            confidence: c.confidence
          })),
          confidence: bestClip.confidence
        };
      });
  } catch (err) {
    console.error('❌ [MAP] Timeline mapping failed:', err);
    return [];
  }
};

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
export const generateQuizForModule = async (moduleTitle: string, concepts: string[]): Promise<QuizQuestion[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: `Generate 5 multiple-choice quiz questions for "${moduleTitle}". Concepts: ${concepts.join(", ")}. Return JSON array: [{ "question": string, "options": string[4], "correctAnswerIndex": number, "explanation": string }]` }] }],
      config: { responseMimeType: "application/json" }
    });
    let text = getText(response);
    if (!text) throw new Error("Empty response from AI");
    
    // Robust JSON Extraction
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\])/);
    if (jsonMatch) text = jsonMatch[1];
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error", e, "Raw:", text);
      throw new Error("AI returned invalid data format.");
    }
  }));
};

// ─── TUTOR CHAT ───────────────────────────────────────────────────────────────
export const chatWithTutor = async (history: ChatMessage[], newMessage: string, context: string, currentContent?: string): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    // DIRECT CORE UPLINK: Use flat string payload for absolute SDK compliance
    const recentContext = history.slice(-4).map(m => `${m.role === 'user' ? 'Student' : 'Study Copilot'}: ${m.text}`).join('\n');
    const contentContext = currentContent ? `\nCURRENT PAGE CONTENT (for reference): ${currentContent.substring(0, 3500)}` : '';
    const prompt = `SYSTEM: You are SARA, the Student Intelligence System of Vidhyalaya. In the UI, you appear as "Study Copilot".
You are not a generic chatbot. You are an invisible learning architect who renders the exact shape a student's brain needs.
Core Law: Every piece of information has a natural shape. Find the shape. Render the shape. Never pour it into prose.
Context: ${context}${contentContext}
Recent conversation:
${recentContext || 'No prior conversation in this panel.'}

Small-window response contract:
- Answer the exact question first. Default maximum 90 words; absolute maximum 140 words unless the student explicitly asks for depth.
- Never open with "Welcome" or generic preface. Start with a direct anchor.
- Use 1-3 short blocks only. No paragraph may exceed 2 sentences.
- Prefer plain direct explanation first. Use tables, trees, warnings, and callouts only when they make the answer shorter or clearer.
- HARD CAP: maximum 1 callout block per answer. Never stack callouts back-to-back.
- If code or commands are useful, show them as static reference: final snippet, expected output, and what to notice. Do not ask the student to run, click, reveal, or execute inside SARA.
- If this is a new term, define it in one plain sentence, then give one concrete example.
- If this is steps in order, use a Process Flow only when order is essential and the sequence has 3-5 meaningful steps. Otherwise use concise prose.
- If this is A vs B, render a Comparison Table with "Main danger", "Real-world example", and "You're ready for Pro when".
- If this is a trap, render a Warning Card with THE FIX and YOU ARE IN IT WHEN.
- If this is abstract, give a physical mental model before theory.
- If this is structure, render an ASCII Hierarchy Tree.
- If this is skill growth, render a Complexity Ladder with readiness signals.
- Do not force a Next Confusion Predictor. Add one final "Watch out:" line only when there is a likely next confusion.
- When the user selected text, directly transform the selected passage. Do not restate the entire passage.

USER: ${newMessage}
Study Copilot:`;

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return getText(response);
  }));
};

// ─── MODULE CONTENT ───────────────────────────────────────────────────────────
export interface ModuleContentResult {
  content: string;
  citations: ContentCitation[];
}

export const generateModuleContent = async (moduleTitle: string, concepts: string[], goal: string, moduleResources?: Resource[]): Promise<ModuleContentResult> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    // 1. Pre-calculate manual citations from scouted resources
    const manualCitations: ContentCitation[] = (moduleResources || []).map((r, idx) => ({
      index: idx + 1,
      title: r.title || 'Source',
      url: r.content,
      domain: r.content.includes('youtube.com') || r.content.includes('youtu.be') ? 'youtube.com' : undefined,
      snippet: 'Pre-scouted resource for this module.',
    }));

    const prompt = `You are SARA, a Senior Technical Strategist at Vidhyalaya.
Your mission is to generate a high-fidelity, clean scholarly whitepaper for "${moduleTitle}".

CORE ARCHITECTURE:
- Pure Content: No "Steps", no "Hooks", no "Geometric Shapes", no "ASCII trees", no "Hierarchy Maps".
- Professional Narrative: Write a flowing, professional guide that provides deep insight and clear explanations.
- Medium Depth: Target 1000-1500 words of high-quality "matter".
- Clean Markdown: Use only # (H1), ## (H2), standard paragraphs, lists, and tables.

Goal: ${goal}
Concepts: ${concepts.join(", ")}

${manualCitations.length > 0 ? `GROUNDING SOURCES:
${manualCitations.map(c => `[${c.index}] ${c.title} (${c.domain}) - Snippet: ${c.snippet}`).join('\n')}

CITATION LAW:
1. Every subheading (##) MUST include a source marker: [Source: index].
2. Use inline markers [index] for specific technical facts.
3. Cite only from the archive above or high-quality Google Search results.` : ''}

STRUCTURE:
1. # ${moduleTitle} (The Main Heading)
2. A deep-dive narrative introduction.
3. Use ## Subheadings to organize the content logically (e.g., "Principles", "Architectural Analysis", "Practical Implementation", "Current Landscape").
4. Use standard markdown tables for comparisons.
5. Use code blocks for technical examples.

NON-NEGOTIABLE:
- No procedural noise.
- No "Step X" markers.
- No "Cognitive Hook" or "Minimal Anchor" labels.
- Start directly with the content.
- Use Google Search to ground every single claim in real-world data.`;

    let text = "";
    let citations: ContentCitation[] = [];
    let attempts = 0;

    while (attempts < 3) {
      try {
        if (attempts === 0) {
          // Attempt 1: Search-enhanced
          const searchResponse: any = await Promise.race([
            generateContentWithFallback('text', {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            } as any),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Search Timeout")), 45000))
          ]);
          text = getText(searchResponse);
          
          // Citations processing...
          const groundingChunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundingSupports = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingSupports || [];
          
          // Google Search Grounding has been disabled to prevent hallucinated 404 URLs.
          // We exclusively rely on the verified manualCitations (scouted YouTube resources).
          citations = [...manualCitations];

          // 4. Citation injection relies purely on the prompt instructions 
          // to naturally cite the verified manualCitations.
        } else if (attempts === 1) {
          // Attempt 2: Standard Fallback (Direct)
          const response = await generateContentWithFallback('text', { contents: [{ role: 'user', parts: [{ text: prompt }] }] });
          text = getText(response);
          citations = manualCitations;
        } else {
          // Attempt 3: Bulletproof Ultra-lightweight Fallback
          const lightPrompt = `You are SARA, Senior Learning Architect for Vidhyalaya. 
Generate a highly detailed, comprehensive study guide for: "${moduleTitle}".
Goal: ${goal}
Concepts: ${concepts.join(", ")}

Format precisely as:
# ${moduleTitle}
## Step 0 — Entry Hook
## Step 1 — Minimal Anchor
## Step 2 — Hierarchy Map
## Step 3 — Worked Example
## Step 4 — Common Mistakes
## Step 5 — Mental Model
## Step 9.5 — Mastery Checkpoint
## Step 10 — Next Confusion Predictor`;
          
          const response = await generateContentWithFallback('lite', { contents: [{ role: 'user', parts: [{ text: lightPrompt }] }] });
          text = getText(response);
          citations = manualCitations;
        }

        if (text && text.trim().length > 150) {
          return { content: text, citations };
        }
      } catch (err) {
        console.warn(`[Vidhyalaya] Generation attempt ${attempts + 1} failed:`, err);
      }
      attempts++;
    }

    throw new Error('Content generation failed after multiple attempts.');
  }));
};

// ─── AUDIO OVERVIEW ───────────────────────────────────────────────────────────
export const generateAudioOverview = async (text: string): Promise<ArrayBuffer | null> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await generateContentWithFallback('tts', {
      contents: `Read clearly: ${text.substring(0, 1000)}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = (response as any).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }));
};

// ─── WEB RESOURCE SEARCH ─────────────────────────────────────────────────────
export const searchWebForResources = async (topic: string): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `Find 5 high-quality, free learning resources (official docs, video courses, tutorials) for: "${topic}". Format as a list: - Title (URL) - Short description`;
    try {
      const response = await generateContentWithFallback('text', {
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] } as any
      });
      return getText(response) || "No resources found.";
    } catch (e) {
      const response = await generateContentWithFallback('text', { contents: prompt });
      return getText(response) || "No resources found.";
    }
  }));
};

// ─── MERMAID DIAGRAM ─────────────────────────────────────────────────────────
export const generateMermaidDiagram = async (moduleTitle: string, concepts: string[], diagramType = 'flowchart TD', intent = ''): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const intentPrompt = intent ? `\nUser Intent/Focus: "${intent}"` : '';
    const prompt = `Create a Mermaid.js diagram using "${diagramType}" to visually map core concepts of "${moduleTitle}".
Concepts: ${concepts.join(", ")}.${intentPrompt}
Return ONLY raw Mermaid code. No markdown fences. No explanation.`;
    const response = await generateContentWithFallback('text', { contents: prompt });
    let text = getText(response);
    text = text.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
    return text;
  }));
};

// ─── CONCEPT MAP (legacy wrapper) ────────────────────────────────────────────
export const generateConceptMap = async (
  moduleTitle: string,
  concepts: string[],
  content: string,
  _complexity = 'overview',
  _studyLens = 'roadmap',
  _scholarPersona = 'visionary',
): Promise<{
  centralConcept: string;
  nodes: Array<{ id: string; label: string; description: string; depth: number; parentId?: string; connections?: string[] }>;
  relationships: Array<{ from: string; to: string; label: string }>;
}> => {
  const graph = await generateKnowledgeGraph(moduleTitle, concepts, content);
  const root = graph.nodes.find(n => n.level === 0) ?? graph.nodes[0];
  const parentByChild = new Map<string, string>();
  graph.edges.filter(e => e.type === 'contains').forEach(e => parentByChild.set(e.to, e.from));

  return {
    centralConcept: graph.topic,
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      description: n.description,
      depth: n.level,
      parentId: n.level === 0 ? undefined : parentByChild.get(n.id),
      connections: graph.edges.filter(e => e.to === n.id).map(e => e.from),
    })),
    relationships: graph.edges.map(e => ({ from: e.from, to: e.to, label: e.type })),
  };
};

// ─── KNOWLEDGE GRAPH ─────────────────────────────────────────────────────────
export const generateKnowledgeGraph = async (
  moduleTitle: string,
  concepts: string[],
  content: string,
  sourceModuleId?: string,
): Promise<import('../types').KnowledgeGraph> => {
  const { validateAndNormalizeGraph, buildFallbackGraph } = await import('../components/knowledge-map/graphValidator');

  return apiQueue.add(() => retryWithBackoff(async () => {
    const headings = (content.match(/^#{2,3}\s+(.+)$/gm) || [])
      .map(h => h.replace(/^#{2,3}\s+/, '').trim())
      .slice(0, 12);

    const prompt = `You are an educational knowledge engineer. Extract a precise concept map from this lesson.

Topic: "${moduleTitle}"
Key concepts: ${concepts.slice(0, 8).join(', ') || moduleTitle}
Content headings: ${headings.join(' | ') || 'none'}
Content excerpt: ${content ? content.substring(0, 4000) : concepts.join(', ')}

Rules:
- Return max 16 nodes total
- Root node id "root", level 0
- Levels: 0=core topic, 1=pillars (3-5 max), 2=supporting, 3=details
- Every node except root MUST include sourceRef citing a heading from the content (e.g. "§ Introduction")
- Use ONLY these edge types: contains, requires, uses, implements, contrasts, leads_to, example_of
- Every edge must be meaningful — no decorative links
- learningPath: ordered node ids for optimal study sequence
- diagramType: one of concept_tree, process_flow, component_tree, architecture, comparison_matrix, timeline, dependency_graph

Return ONLY valid JSON:
{
  "diagramType": "concept_tree",
  "topic": "${moduleTitle}",
  "nodes": [
    { "id": "root", "label": "${moduleTitle}", "description": "One sentence summary", "level": 0, "importance": "critical", "sourceRef": "§ Overview" }
  ],
  "edges": [
    { "from": "root", "to": "n1", "type": "contains", "label": "contains" }
  ],
  "learningPath": ["n1", "n2"]
}`;

    try {
      const response = await generateContentWithFallback('text', {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      let text = getText(response) || '{}';
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) text = jsonMatch[1];
      text = text.trim();

      const parsed = JSON.parse(text);
      return validateAndNormalizeGraph(
        { ...parsed, generatedAt: Date.now(), sourceModuleId },
        moduleTitle,
        sourceModuleId,
      );
    } catch (e) {
      console.error('Failed to parse knowledge graph:', e);
      return buildFallbackGraph(moduleTitle, concepts.length ? concepts : [moduleTitle], sourceModuleId);
    }
  }));
};

// ─── FLASHCARDS ───────────────────────────────────────────────────────────────
export interface Flashcard { id: string; front: string; back: string; hint?: string; }

export const generateFlashcards = async (topic: string, concepts: string[]): Promise<Flashcard[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await generateContentWithFallback('text', {
      contents: `Create 8 high-quality flashcards for: "${topic}". Concepts: ${concepts.slice(0, 8).join(', ')}. Return JSON array: [{ "front": string, "back": string, "hint": string }]`,
      config: { responseMimeType: "application/json" }
    });
    const text = getText(response);
    if (!text) throw new Error('Empty response');
    const cards = JSON.parse(text);
    return cards.map((c: any, i: number) => ({ ...c, id: `fc-${i}-${Math.random().toString(36).substr(2, 5)}` }));
  }));
};

// ─── QUICK REFRESH ────────────────────────────────────────────────────────────
export const generateQuickRefresh = async (topic: string, concepts: string[]): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await generateContentWithFallback('text', {
      contents: `Generate a premium, ultra-condensed cheat sheet for: "${topic}". Concepts: ${concepts.join(', ')}. Format with: # Topic Quick Refresh, ## Core Essence (2-3 sentences), ## Key Concepts (one line each), ## Critical Patterns (code block if applicable), ## Common Pitfalls (bullets), ## Mastery Checklist (checkboxes). Be brilliant and actionable.`
    });
    return getText(response) || 'No content generated.';
  }));
};

// ─── SANDBOX ERROR COACH ─────────────────────────────────────────────────────

export const explainSandboxError = async (params: {
  code: string;
  error: string;
  language: string;
  exerciseTitle: string;
  line?: number;
}): Promise<SandboxErrorExplanation> => {
  const { code, error, language, exerciseTitle, line } = params;
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `You are a patient coding tutor. A student is working on "${exerciseTitle}" in ${language}.
${line ? `Error on line ${line}.` : ''}
Error: ${error}

Code:
\`\`\`
${code.slice(0, 2000)}
\`\`\`

Return JSON only: { "what": "one sentence", "why": "one sentence", "howToFix": "1-2 actionable steps" }
Use plain language. No jargon. Be encouraging.`;

    try {
      const response = await generateContentWithFallback('lite', {
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const text = getText(response) || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      return {
        what: String(parsed.what || error),
        why: String(parsed.why || 'Something in the code did not work as expected.'),
        howToFix: String(parsed.howToFix || 'Review the highlighted line and try again.'),
      };
    } catch {
      return {
        what: error,
        why: 'The code could not run successfully.',
        howToFix: 'Check the line mentioned in the error and verify spelling and logic.',
      };
    }
  }));
};

export const proposeSandboxFix = async (params: {
  code: string;
  error: string;
  language: string;
  exerciseTitle: string;
  fileName: string;
}): Promise<SandboxFixProposal> => {
  const { code, error, language, exerciseTitle, fileName } = params;
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `Fix this ${language} code for exercise "${exerciseTitle}".
Error: ${error}

\`\`\`
${code.slice(0, 3000)}
\`\`\`

Return JSON only: { "fixed": "complete corrected code", "description": "one sentence explaining the fix" }`;

    try {
      const response = await generateContentWithFallback('lite', {
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const text = getText(response) || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      return {
        file: fileName,
        original: code,
        fixed: String(parsed.fixed || code),
        description: String(parsed.description || 'Suggested correction'),
      };
    } catch {
      return {
        file: fileName,
        original: code,
        fixed: code,
        description: 'Could not generate a fix. Try the hints instead.',
      };
    }
  }));
};
