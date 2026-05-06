import { GoogleGenAI, Modality } from "@google/genai";
import { LearningPath, Resource, ChatMessage, QuizQuestion, VideoSegment, ContentCitation } from "../types";
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

class AIRequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelayMs = 1500;

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

const apiQueue = new AIRequestQueue();

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
      phaseInstruction = "Generate exactly 4 phases (range: 3 to 5) focusing on absolute core essentials and rapid execution mechanics.";
    } else if (depth === 'Advanced') {
      phaseInstruction = "Generate exactly 16 phases (range: 15 to 20) representing an exhaustive, full-spectrum, academic-grade curriculum covering every corner, theory, edge case, and architectural milestone so absolutely nothing is wasted.";
    } else {
      phaseInstruction = "Generate exactly 8 phases (range: 5 to 15) covering advanced conceptual models, deep methodologies, edge-case systems, and robust implementation mechanics.";
    }

    const prompt = `You are a curriculum architect. Return ONLY a raw JSON object — no markdown, no explanation, no preamble.

Generate a learning roadmap for: "${goal}"
Skill Level: "${skillLevel}"
Expected Outcome: "${expectedOutcome || 'Mastery'}"

Phase Requirement:
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
          "keyConcepts": ["string"]
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
export const scoutResources = async (topic: string, goalContext = 'General Mastery', retryCount = 0): Promise<Resource[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    console.log(`🔍 [SARA] Scouting resources for: "${topic}" (Attempt ${retryCount + 1})`);
    let aiResults: Array<{ title: string; content: string }> = [];

    // ── STEP 1: Search Curated ──────
    const { getVideosByTopic } = await import('./videoLibrary');
    const curated = getVideosByTopic(topic, 5);
    
    // ── STEP 2: AI Deep Scout ──────
    const prompt = `Find 10 high-quality, REAL YouTube video IDs for learning: "${topic}".
Goal: "${goalContext}".
Channels: freeCodeCamp, Traversy Media, Programming with Mosh, Fireship, Web Dev Simplified, Academind, Kevin Powell, Net Ninja, Computerphile, 3Blue1Brown.
Return EXACTLY 10 videos as a raw JSON array. DO NOT hallucinate.
[{"title": "Video Title", "type": "youtube", "content": "https://www.youtube.com/watch?v=ID"}]`;

    try {
      const r = await generateContentWithFallback('text', {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", tools: [{ googleSearch: {} }] }
      } as any);
      aiResults = JSON.parse(getText(r));
    } catch {
      try {
        const r = await generateContentWithFallback('text', {
          contents: [{ role: 'user', parts: [{ text: prompt }] }], 
          config: { responseMimeType: "application/json" } 
        });
        aiResults = JSON.parse(getText(r));
      } catch { aiResults = []; }
    }

    const combined = [
      ...curated.map(v => ({ title: v.title, content: `https://www.youtube.com/watch?v=${v.id}` })),
      ...aiResults
    ];

    const uniqueIds = new Set();
    const finalCandidates = [];
    for (const item of combined) {
      if (!item || !item.content) continue;
      const vid = item.content?.match(/v=([^&]+)/)?.[1] || item.content?.split('/').pop();
      if (vid && vid.length >= 10 && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({ ...item, videoId: vid });
      }
    }

    console.log(`📡 [SARA] Verifying ${finalCandidates.length} candidate(s)...`);
    const verificationResults = await api.verifyVideos(finalCandidates.map(c => c.videoId));
    const verificationMap = new Map(verificationResults.map(v => [v.id, v]));

    const verifiedResources: Resource[] = finalCandidates
      .filter(c => verificationMap.get(c.videoId)?.embeddable)
      .slice(0, 8)
      .map(c => ({
        id: `res-${Math.random().toString(36).substr(2, 9)}`,
        title: verificationMap.get(c.videoId)?.title || c.title,
        type: 'youtube' as const,
        content: c.content,
        videoId: c.videoId,
      }));

    if (verifiedResources.length === 0 && retryCount < 2) {
      console.warn(`⚠️ [SARA] No embeddable videos for "${topic}". Retrying with simplified query...`);
      // Strip technical jargon for a broader search
      const simplifiedTopic = topic.split(' ').slice(0, 3).join(' ') + ' tutorial';
      return scoutResources(simplifiedTopic, goalContext, retryCount + 1);
    }

    console.log(`✨ [SARA] Found ${verifiedResources.length} verified resources.`);
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

export const generateModuleContent = async (moduleTitle: string, concepts: string[], goal: string): Promise<ModuleContentResult> => {
  console.log(`[Vidhyalaya] Generating content for: ${moduleTitle}`);

  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `You are SARA, the Senior Learning Architect for Vidhyalaya.
Your mission is to build a complete, readable learning whiteboard.
Core Law: teach the idea with enough substance first, then use shapes only when they make structure clearer.

Generate a cognitively optimized Geometry of Information module for "${moduleTitle}".
Goal: ${goal}
Concepts: ${concepts.join(", ")}

NON-NEGOTIABLE LAWS:
1. DO NOT include any "Architectural Intelligence Report", "Subject", "Classification", or "System" boilerplate.
2. START DIRECTLY with exactly one # heading: "# ${moduleTitle}".
3. Every major step must teach the idea fully instead of only labeling it.
4. Use a component only when it reduces cognitive load. Do not create decorative filler, placeholder commands, repeated flow charts, or oversized cards.
5. If code or terminal commands are useful, present them as static reference: final snippet, expected output, and what to notice. Never ask the learner to run, click, reveal, or execute inside the lesson.
6. Use Google Search grounding to provide real-world context and actual citations.
7. End with Step 10 exactly. Do not end with a generic conclusion.
8. HARD CAP: maximum one PROCESS_FLOW per module. Most modules should use zero.
9. HARD CAP: maximum 4 callout blocks per module total. Do not place callouts back-to-back.
10. Definitions should usually be inline prose. Use a DEFINITION block only for terms that would block understanding.
11. CONTENT DEPTH FLOOR: include at least 1200-2200 words of useful teaching content, excluding code blocks and tables. This is a comprehensive deep-dive.
12. Every core idea needs: what it means, why it matters, one concrete example, one common mistake, and one quick check.
13. Every concept must be explained TWICE — once abstractly, once with a concrete real-world example from the current year.

MANDATORY STEP-SEQUENCE:
## Step 0 — Entry Hook
Address what a confused learner is likely misunderstanding right now. Use 2-3 precise sentences.

## Step 1 — Minimal Anchor
Write 3-4 compact sentences that anchor the whole module with a simple example.

## Step 2 — Hierarchy Map
Return an ASCII tree in a fenced code block using this style:
\`\`\`tree
${moduleTitle}
├── First principle
│   ├── Supporting idea
│   └── Common confusion
└── Mastery outcome
\`\`\`

## Step 3 — Worked Example
Walk through a complete, realistic scenario step-by-step showing how the concepts are applied.

## Step 4 — Common Mistake Breakdown
Detail 3 specific mistakes people make with this topic, including a diagnosis of why it happens and how to fix it.

## Step 5 — Mental Model
Provide the one metaphor or mental model that makes this concept stick permanently.

## Step 6 — Edge Cases
Explain what breaks the standard rules, why it happens, and how to handle it.

## Step 7 — Geometric Content Blocks
Use the component library below selectively. The goal is useful density, not component count.
Required baseline: one Golden Rule or Warning, one Standard vs Pro table when real-world practice matters, one Complexity Ladder when skill progression matters.
Between visual blocks, write normal teaching prose (multiple paragraphs) that connects the ideas so the module feels complete.
Optional: code/terminal only when the learner benefits from seeing exact commands, output, or final code.
Avoid: repeated definition cards, repeated process cards, decorative geometry, and any component that repeats the same visual rhythm twice in a row.


12-COMPONENT LIBRARY:
1. ENTRY_HOOK — a short confusion reset card.
2. MINIMAL_ANCHOR — a two-sentence anchor box.
3. HIERARCHY_MAP — ASCII tree with ├── and └──.
4. LIVE_TERMINAL — fenced \`\`\`terminal block shown as static reference only. Include expected output and what to notice.
5. GOLDEN_RULE — blockquote starting with "> **GOLDEN RULE:**".
6. DEFINITION_BOX — blockquote starting with "> **DEFINITION:**".
7. WARNING_CARD — blockquote starting with "> **WARNING:**".
8. PROCESS_FLOW — fenced \`\`\`geometry block only for one truly ordered sequence. Maximum one per module.
9. STANDARD_VS_PRO — markdown table comparing standard vs pro, validated against current real-world practice.
10. COMPLEXITY_LADDER — fenced \`\`\`geometry block with Level 1, Level 2, Level 3 Pro, Level 4 Architect.
11. ARCHITECTURE_TREE — retired after Step 2. Do not generate a second fenced tree block later in the module.
12. NEXT_CONFUSION — final predictor box.
Do NOT generate QUICK_REVIEW_FLOW. That pattern is retired because it creates visual noise without adding mastery value.

PROCESS FLOW FORMAT, only if truly needed:
\`\`\`geometry
╔══ SHAPE: PROCESS_FLOW ══╗
║ 1. Input ──> 2. Transform ──> 3. Output
║ Why it matters: one-line reason
╚═════════════════════════╝
\`\`\`

TERMINAL BLOCK FORMAT:
\`\`\`terminal
$ exact-command-if-needed
Output: exact expected result, not hidden
Notice: one line explaining what the learner should pay attention to
\`\`\`

Before Step 10, add exactly this heading and no body. The UI will render the self-check checkpoint:
## Step 9.5 — Mastery Checkpoint

Step 10 must be:
## Step 10 — Next Confusion Predictor
> **NEXT CONFUSION:** Predict the next mistake the learner will make, then give the one action that prevents it.`;

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
              config: { tools: [{ googleSearch: {} }] }
            } as any),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Search Timeout")), 45000))
          ]);
          text = getText(searchResponse);
          
          // Citations processing...
          const groundingChunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundingSupports = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingSupports || [];
          
          citations = groundingChunks
            .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
            .map((chunk: any, idx: number) => {
              let domain = undefined;
              try {
                domain = new URL(chunk.web.uri).hostname.replace(/^www\./, '');
              } catch (e) {}
              
              return {
                index: idx + 1,
                title: chunk.web.title,
                url: chunk.web.uri,
                domain,
                snippet: chunk.web.snippet || '',
              };
            });

          // Citation injection...
          if (citations.length > 0 && groundingSupports.length > 0) {
            let originalText = text;
            let injectedText = '';
            let lastIdx = 0;
            const sortedSupports = [...groundingSupports].sort((a: any, b: any) => (a.segment?.startIndex || 0) - (b.segment?.startIndex || 0));
            
            for (const support of sortedSupports) {
              const start = support.segment?.startIndex || 0;
              const end = support.segment?.endIndex || 0;
              const chunkIndices = support.groundingChunkIndices || [];
              if (start >= lastIdx && end > start && chunkIndices.length > 0 && end <= originalText.length) {
                injectedText += originalText.substring(lastIdx, end);
                const markers = chunkIndices.map((idx: number) => `[${idx + 1}]`).join('');
                injectedText += markers;
                lastIdx = end;
              }
            }
            injectedText += originalText.substring(lastIdx);
            if (injectedText.length > 150) text = injectedText;
          }
        } else if (attempts === 1) {
          // Attempt 2: Standard Fallback (Direct)
          const response = await generateContentWithFallback('text', { contents: [{ role: 'user', parts: [{ text: prompt }] }] });
          text = getText(response);
          citations = [];
        } else {
          // Attempt 3: Bulletproof Ultra-lightweight Fallback (Guaranteed to succeed and generate in <5s)
          const lightPrompt = `You are SARA, Senior Learning Architect for Vidhyalaya. 
Generate a highly detailed, comprehensive study guide for: "${moduleTitle}".
Goal: ${goal}
Concepts: ${concepts.join(", ")}

Format precisely as:
# ${moduleTitle}
## Step 0 — Entry Hook
Brief overview of what is commonly misunderstood.
## Step 1 — Minimal Anchor
A simple, compact real-world example.
## Step 2 — Hierarchy Map
An ASCII tree showing concept relations.
## Step 3 — Worked Example
A step-by-step practical walk-through.
## Step 4 — Common Mistakes
At least 2 common mistakes and how to fix them.
## Step 5 — Mental Model
One memorable metaphor.
## Step 9.5 — Mastery Checkpoint
## Step 10 — Next Confusion Predictor`;
          
          const response = await generateContentWithFallback('lite', { contents: [{ role: 'user', parts: [{ text: lightPrompt }] }] });
          text = getText(response);
          citations = [];
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

// ─── CONCEPT MAP ─────────────────────────────────────────────────────────────
export const generateConceptMap = async (
  moduleTitle: string,
  concepts: string[],
  content: string,
  complexity: 'snapshot' | 'overview' | 'detailed' | 'deep' | 'mastery' = 'overview',
  studyLens: 'roadmap' | 'foundations' | 'practice' | 'exam' | 'pitfalls' = 'roadmap'
): Promise<{
  centralConcept: string;
  nodes: Array<{ id: string; label: string; description: string; depth: number; parentId?: string; connections?: string[] }>;
  relationships: Array<{ from: string; to: string; label: string }>;
}> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const targetNodes = {
      snapshot: '3-5',
      overview: '6-8',
      detailed: '12-16',
      deep: '20-26',
      mastery: '28-34',
    }[complexity];
    const lensInstruction = {
      roadmap: 'Organize the map as a step-by-step learning path from prerequisites to mastery.',
      foundations: 'Prioritize fundamentals, prerequisites, definitions, and first principles.',
      practice: 'Prioritize actionable skills, drills, implementation steps, and hands-on checkpoints.',
      exam: 'Prioritize high-yield facts, common question patterns, memory anchors, and fast revision order.',
      pitfalls: 'Prioritize misconceptions, confusing contrasts, failure modes, and debugging checkpoints.',
    }[studyLens];
    const prompt = `You are a Lead Knowledge Engineer. Perform a Deep Semantic Extraction for a Neural Synthesis Map.
Topic: "${moduleTitle}"
Content: ${content ? content.substring(0, 7000) : concepts.join(', ')}
Complexity: ${complexity} (return ${targetNodes} total nodes)
Study lens: ${studyLens}. ${lensInstruction}

Rules:
- Keep labels short: 2-5 words each.
- Use exactly one root node with depth 0 and id "root".
- Every non-root node must include a parentId that references an existing node.
- Keep depth between 0 and ${complexity === 'mastery' ? 4 : 3} so the visual map stays readable.
- Relationships should primarily describe parent-child edges. Avoid disconnected or duplicate nodes.
- Node descriptions must help a student know what to learn, why it matters, and what to do next for the selected study lens.

Return ONLY valid JSON:
{
  "centralConcept": "${moduleTitle}",
  "nodes": [
    { "id": "root", "label": "${moduleTitle}", "description": "Core Topic", "depth": 0, "parentId": null, "connections": ["p1"] },
    { "id": "p1", "label": "First Pillar", "description": "...", "depth": 1, "parentId": "root", "connections": [] }
  ],
  "relationships": [{ "from": "root", "to": "p1", "label": "architects" }]
}`;

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    let text = getText(response) || "{}";
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) text = jsonMatch[1];
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse concept map:", e);
      return {
        centralConcept: moduleTitle,
        nodes: [
          { id: 'central', label: moduleTitle, description: `Master ${moduleTitle}`, depth: 0 },
          ...concepts.map((c, i) => ({ id: `concept-${i}`, label: c, description: c, depth: 1, parentId: 'central', connections: ['central'] })),
        ],
        relationships: concepts.map((_, i) => ({ from: 'central', to: `concept-${i}`, label: 'includes' })),
      };
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
