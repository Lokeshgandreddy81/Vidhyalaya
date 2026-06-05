import { GoogleGenAI, Modality } from "@google/genai";
import { LearningPath, Resource, ChatMessage, QuizQuestion, VideoSegment, ContentCitation, StudentBrainState, LLMConfig } from "../types";
import { api } from "./api";

// ─── FILE ATTACHMENT (for full-document Gemini inline processing) ─────────────
export interface FileAttachment {
  name: string;
  base64: string;
  mimeType: string;
}

type ModelKind = 'text' | 'lite' | 'tts';

const PREFERRED_MODELS: Record<ModelKind, string[]> = {
  text: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
  ],
  lite: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ],
  tts: [
    'gemini-2.5-flash',
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

export function getBYOKConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem('vidyal_byok_config');
    if (raw) return JSON.parse(raw);
  } catch {}

  const legacyGeminiKey = localStorage.getItem('vidyal_custom_gemini_api_key');
  if (legacyGeminiKey) {
    return {
      provider: 'gemini',
      apiKey: legacyGeminiKey
    };
  }
  return null;
}

async function callBYOKCompletions(prompt: string, options: {
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const config = getBYOKConfig();
  const provider = config?.provider || 'gemini';
  const apiKey = config?.apiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your API key in Settings or the API Setup screen.");
  }

  let model = config?.preferredModel;
  if (!model) {
    if (provider === 'gemini') model = 'gemini-2.5-flash';
    else if (provider === 'openai') model = 'gpt-4o-mini';
    else if (provider === 'anthropic') model = 'claude-3-5-haiku-latest';
    else if (provider === 'openrouter') model = 'google/gemini-2.5-flash';
    else if (provider === 'groq') model = 'llama-3.3-70b-versatile';
  }

  let endpoint = config?.customEndpoint;
  if (!endpoint) {
    if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
    else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    else if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    else if (provider === 'anthropic') endpoint = 'https://api.anthropic.com/v1/messages';
  }

  if (provider === 'openai' || provider === 'openrouter' || provider === 'groq') {
    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Cortex Campus';
    }

    const body: Record<string, any> = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
    };
    if (options.responseMimeType === 'application/json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Provider Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'anthropic') {
    const messages = [{ role: 'user', content: prompt }];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-html-user-agents': 'true'
    };

    const body: Record<string, any> = {
      model,
      max_tokens: options.maxOutputTokens ?? 2000,
      messages,
      temperature: options.temperature ?? 0.2,
    };
    if (options.systemInstruction) {
      body.system = options.systemInstruction;
    }

    const response = await fetch(endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text ?? '';
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
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
  const byok = getBYOKConfig();
  if (byok && byok.provider !== 'gemini') {
    let prompt = '';
    if (typeof params.contents === 'string') {
      prompt = params.contents;
    } else if (Array.isArray(params.contents)) {
      const parts = params.contents.map(c => {
        if (typeof c === 'string') return c;
        if (c.parts && Array.isArray(c.parts)) {
          return c.parts.map((p: any) => p.text || '').join('\n');
        }
        return '';
      });
      prompt = parts.join('\n');
    }

    const config = params.config as any;
    const systemInstruction = config?.systemInstruction;
    const responseMimeType = config?.responseMimeType;
    const temperature = config?.temperature;
    const maxOutputTokens = config?.maxOutputTokens;

    const responseText = await callBYOKCompletions(prompt, {
      systemInstruction,
      responseMimeType,
      temperature,
      maxOutputTokens
    });

    return {
      text: responseText,
      candidates: [{
        content: {
          parts: [{ text: responseText }]
        }
      }]
    };
  }

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
  private activeCount = 0;
  private maxConcurrency: number;
  private minDelayMs: number;

  constructor(maxConcurrency = 2, minDelayMs = 200) {
    this.maxConcurrency = maxConcurrency;
    this.minDelayMs = minDelayMs;
  }

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        // Per-task timeout: if AI hangs for 90s, reject and unblock the queue
        const controller = { cancelled: false };
        const timeout = setTimeout(() => {
          controller.cancelled = true;
          reject(new Error('AI_TIMEOUT: Request exceeded 90 seconds. The model may be overloaded.'));
        }, 90000);
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
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      const task = this.queue.shift();
      if (task) {
        this.activeCount++;
        task()
          .catch(e => console.error('[Queue] Task error:', e))
          .finally(() => {
            this.activeCount--;
            // Stagger next task slightly to avoid burst quota hits
            setTimeout(() => this.process(), this.minDelayMs);
          });
      }
    }
  }
}

// Primary queue: 2 concurrent slots, 200ms stagger (was: 1 serial, 800ms)
export const apiQueue = new AIRequestQueue(2, 200);
// Low-priority queue for background pre-gen — 1 slot, won't block interactive
export const bgQueue = new AIRequestQueue(1, 500);
// Dedicated high-priority queue: 3 concurrent slots, 100ms stagger
export const chatQueue = new AIRequestQueue(3, 100);

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 2, delay = 800): Promise<T> {
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
      const waitMs = delay + Math.random() * 500; // tighter jitter
      console.warn(`[Gemini] Retryable error. Waiting ${Math.round(waitMs)}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return retryWithBackoff(operation, retries - 1, Math.min(delay * 2, 4000)); // cap at 4s
    }
    throw error;
  }
}

// ─── HELPER: safe text extractor ────────────────────────────────────────────
function getText(response: any): string {
  return response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const generateAudioOverview = async (sourceText: string): Promise<ArrayBuffer | null> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await generateContentWithFallback('tts', {
      contents: [{
        role: 'user',
        parts: [{
          text: `Create a concise audio study overview for this Cortex learning material.\n\n${sourceText}`,
        }],
      }],
      config: {
        responseModalities: [Modality.AUDIO],
      } as any,
    });

    const inlineData = response?.candidates?.[0]?.content?.parts?.find((part: any) => part?.inlineData)?.inlineData;
    if (!inlineData?.data) {
      return null;
    }

    return base64ToArrayBuffer(inlineData.data);
  }));
};

// ─── LEARNING PLAN ────────────────────────────────────────────────────────────
export const generateLearningPlan = async (
  goal: string,
  resources: string,
  dailyCommitment: number,
  skillLevel: string,
  expectedOutcome?: string,
  targetDate?: string,
  depth: 'Foundational' | 'Expert' | 'Advanced' = 'Expert',
  fileAttachments?: FileAttachment[]
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
    // Build parts: text prompt + any inline file attachments (full PDF, etc.)
    const parts: any[] = [{ text: prompt }];
    if (fileAttachments && fileAttachments.length > 0) {
      for (const f of fileAttachments) {
        parts.push({ inlineData: { mimeType: f.mimeType, data: f.base64 } });
      }
    }

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts }],
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
// Strategy:
//   1. Use Gemini + Google Search to find REAL high-engagement sources:
//      official docs, top articles, high-view YouTube videos.
//   2. Parse grounding chunks for real URLs. Extract YouTube IDs.
//   3. Fall back to curated library for any YouTube slots not filled.
//   4. Verify all YouTube IDs via backend oembed. Return max 6 sources.
export const scoutResources = async (topic: string, goalContext = 'General Mastery', retryCount = 0): Promise<Resource[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const { getVideosByTopic } = await import('./videoLibrary');

    // ── STEP 1: Live web scout via Gemini + Google Search ────────────────────
    // Ask Gemini to find real, high-engagement sources. With googleSearch tool
    // enabled, Gemini actually searches the web — results come back as
    // groundingChunks with real URLs Google fetched.
    const scoutPrompt = `You are a research scout for an educational platform.
Find the best learning resources for: "${topic}"
Goal context: "${goalContext}"

Find and list EXACTLY in this JSON format:
{
  "youtube": [
    {"id": "YOUTUBE_VIDEO_ID_11CHARS", "title": "Exact video title"},
    {"id": "YOUTUBE_VIDEO_ID_11CHARS", "title": "Exact video title"},
    {"id": "YOUTUBE_VIDEO_ID_11CHARS", "title": "Exact video title"}
  ],
  "docs": [
    {"title": "Official Docs/Article Title", "url": "https://exact-url.com/page"},
    {"title": "Official Docs/Article Title", "url": "https://exact-url.com/page"}
  ]
}

STRICT RULES:
- youtube: Find 3 real YouTube videos with HIGH view counts (>100k views) specifically about "${topic}".
  Prefer: official channels, freeCodeCamp, Fireship, Traversy Media, Programming with Mosh, MIT OpenCourseWare, 3Blue1Brown.
  The "id" field MUST be the 11-character YouTube video ID only (e.g. "dQw4w9WgXcQ").
- docs: Find 2 authoritative sources — official documentation, MDN, Python docs, W3Schools (only for HTML/CSS), 
  high-quality dev articles from reputable sources.
- Return ONLY the JSON object. No explanation. No markdown fences.`;

    let ytCandidates: { id: string; title: string }[] = [];
    let docResources: Resource[] = [];
    let groundingUrls: string[] = [];

    try {
      const scoutResponse: any = await Promise.race([
        generateContentWithFallback('text', {
          contents: [{ role: 'user', parts: [{ text: scoutPrompt }] }],
          config: { tools: [{ googleSearch: {} }] }
        } as any),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Scout timeout')), 30000))
      ]);

      // Extract real URLs from grounding metadata (these are real pages Google fetched)
      const chunks = scoutResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      groundingUrls = chunks
        .map((c: any) => c?.web?.uri || '')
        .filter((u: string) => u.length > 0);

      // Parse the structured JSON response for YouTube IDs and doc URLs
      let rawText = getText(scoutResponse).trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.youtube)) {
          ytCandidates = parsed.youtube
            .filter((v: any) => v?.id && /^[A-Za-z0-9_-]{10,12}$/.test(v.id))
            .slice(0, 4);
        }
        if (Array.isArray(parsed.docs)) {
          docResources = parsed.docs
            .filter((d: any) => d?.url && d?.title && d.url.startsWith('http'))
            .slice(0, 2)
            .map((d: any, idx: number) => ({
              id: `doc-${Math.random().toString(36).substr(2, 9)}`,
              title: d.title,
              type: 'article' as const,
              content: d.url,
            }));
        }
      }

      // Also mine grounding URLs for any YouTube IDs we missed
      for (const url of groundingUrls) {
        const ytMatch = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{10,12})/.exec(url);
        if (ytMatch && !ytCandidates.some(v => v.id === ytMatch[1])) {
          ytCandidates.push({ id: ytMatch[1], title: '' });
        }
      }

      console.log(`🔍 [SARA] Web scout found: ${ytCandidates.length} YT candidates, ${docResources.length} docs`);
    } catch (err) {
      console.warn('⚠️ [SARA] Web scout failed, falling back to curated library:', err);
    }

    // ── STEP 2: Curated library fallback for YouTube slots ───────────────────
    // If web scout found fewer than 3 YouTube candidates, fill from curated library
    const curated = getVideosByTopic(topic, 6);
    const seenIds = new Set(ytCandidates.map(v => v.id));
    for (const v of curated) {
      if (ytCandidates.length >= 4) break;
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        ytCandidates.push({ id: v.id, title: v.title });
      }
    }
    console.log(`📚 [SARA] After curated fill: ${ytCandidates.length} YT candidates total`);

    // ── STEP 3: Verify all YouTube IDs via backend oembed ────────────────────
    const verificationMap = new Map<string, { id: string; title: string; embeddable: boolean }>();

    // Pre-mark curated as embeddable (pre-verified in videoLibrary.ts)
    for (const v of curated) {
      verificationMap.set(v.id, { id: v.id, title: v.title, embeddable: true });
    }

    // Send all candidates to backend (batch, max 8)
    const toVerify = ytCandidates.filter(v => !verificationMap.has(v.id));
    if (toVerify.length > 0) {
      try {
        const verified = await api.verifyVideos(toVerify.map(v => v.id));
        for (const v of verified) {
          verificationMap.set(v.id, v);
        }
        console.log(`✅ [SARA] Backend verified ${verified.length}/${toVerify.length} web-scouted videos`);
      } catch (err) {
        console.warn('⚠️ [SARA] Backend verification failed:', err);
        // Non-curated candidates get marked false; curated remain true
        for (const v of toVerify) {
          if (!verificationMap.has(v.id)) {
            verificationMap.set(v.id, { id: v.id, title: v.title, embeddable: false });
          }
        }
      }
    }

    // ── STEP 4: Build final resource list — docs first, then verified YT ─────
    const ytResources: Resource[] = ytCandidates
      .filter(v => verificationMap.get(v.id)?.embeddable)
      .slice(0, 4)
      .map(v => ({
        id: `res-${Math.random().toString(36).substr(2, 9)}`,
        title: verificationMap.get(v.id)?.title || v.title || topic,
        type: 'youtube' as const,
        content: `https://www.youtube.com/watch?v=${v.id}`,
        videoId: v.id,
      }));

    const finalResources = [...ytResources, ...docResources].slice(0, 6);

    console.log(`✨ [SARA] Final scouted resources: ${ytResources.length} videos + ${docResources.length} docs = ${finalResources.length} total`);
    return finalResources;
  }));
};

// ─── SCOUT CACHE: Prevents duplicate scouting for the same topic in a session ─
const scoutCache = new Map<string, { resources: Resource[]; ts: number }>();
const SCOUT_CACHE_TTL = 10 * 60 * 1000; // 10 min

export const scoutResourcesCached = async (topic: string, goalContext = 'General Mastery'): Promise<Resource[]> => {
  const key = `${topic}::${goalContext}`.toLowerCase();
  const cached = scoutCache.get(key);
  if (cached && Date.now() - cached.ts < SCOUT_CACHE_TTL && cached.resources.length > 0) {
    console.log(`⚡ [SARA] Scout cache HIT for "${topic}" (${cached.resources.length} resources)`);
    return cached.resources;
  }
  const resources = await scoutResources(topic, goalContext);
  if (resources.length > 0) {
    scoutCache.set(key, { resources, ts: Date.now() });
  }
  return resources;
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
      contents: [{ 
        role: 'user', 
        parts: [{ 
          text: `Generate exactly 5 high-fidelity multiple-choice quiz questions designed to test knowledge of the module "${moduleTitle}". 
Concepts to include: ${concepts.join(", ")}. 
Each question must be a multiple choice question with exactly 4 options. Make sure the questions cover these concepts in detail.

Return your response strictly as a JSON array of objects following this format:
[
  {
    "question": "The question text.",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Detailed explanation of why Option A is correct."
  }
]` 
        }] 
      }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          description: "A list of exactly 5 multiple choice quiz questions",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "The quiz question text." },
              options: {
                type: "array",
                items: { type: "string" },
                description: "Exactly 4 unique options."
              },
              correctAnswerIndex: { 
                type: "integer", 
                description: "The 0-based index (0, 1, 2, or 3) of the correct option." 
              },
              explanation: { 
                type: "string", 
                description: "Detailed cognitive explanation of why the correct option is right." 
              }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      } as any
    });
    
    let text = getText(response);
    if (!text) throw new Error("Empty response from AI");
    
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      // Robust JSON Extraction Fallback
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\])/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch (innerE) {
          console.error("Regex JSON Parse Error", innerE, "Raw Match:", jsonMatch[1]);
          throw new Error("AI returned invalid data format.");
        }
      } else {
        console.error("Direct JSON Parse Error", e, "Raw:", text);
        throw new Error("AI returned invalid data format.");
      }
    }

    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (arrayKey) {
        return parsed[arrayKey];
      }
    }
    throw new Error("Parsed content is not a quiz array.");
  }));
};

// ─── TUTOR CHAT ───────────────────────────────────────────────────────────────
export const chatWithTutor = async (history: ChatMessage[], newMessage: string, context: string, currentContent?: string, brainState?: StudentBrainState): Promise<string> => {
  return chatQueue.add(() => retryWithBackoff(async () => {
    const recentContext = history.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'Study Copilot'}: ${m.text}`).join('\n');
    const contentContext = currentContent ? `\nCURRENT PAGE CONTENT (for reference): ${currentContent.substring(0, 3500)}` : '';
    const brainContext = brainState ? `\nSTUDENT BRAIN STATE:\nConfidence: ${brainState.confidence}\nStruggling Concepts: ${brainState.strugglingConcepts.join(', ')}\nLast Mistakes: ${brainState.lastMistakes.join(', ')}\nHesitation Score: ${brainState.hesitationScore}` : '';
    const memoryContext = brainState?.mentorMemory ? `\nMENTOR MEMORY VECTOR:\nStrengths: ${brainState.mentorMemory.strengths.join(', ')}\nWeaknesses: ${brainState.mentorMemory.weaknesses.join(', ')}\nCommon Mistakes: ${brainState.mentorMemory.commonMistakes.join(', ')}\nLearning Style: ${brainState.mentorMemory.learningStyle}` : '';

    const prompt = `SYSTEM: You are SARA, the Cortex Student Intelligence System.
You are an adaptive, fluid mentor. You must analyze the student's intent, select the appropriate persona (Mode), and formulate your response.

CRITICAL MANDATE: You MUST output ONLY valid JSON matching this exact schema:
{
  "intent": "Debugging" | "Conceptual" | "Frustration" | "Curiosity" | "Validation" | "Unknown",
  "mode": "Teacher" | "Mentor" | "Debugger" | "Coach" | "Socratic" | "Interviewer" | "PairProgrammer",
  "speech": "Your textual response. Follow mode tone strictly.",
  "action": "highlight_code" | "move_cursor" | "dim_terminal" | "open_notes" | "none",
  "target": "optional target",
  "skill_update": { "concept": "the_concept_name", "delta": 0.05 },
  "interactive_block": null
}
Do NOT wrap the JSON in markdown blocks. Return raw JSON only.

SKILL_UPDATE RULES:
- ALWAYS include "skill_update". Set "concept" to the main topic being discussed.
- If the student shows understanding, set "delta" between 0.02 and 0.1.
- If the student is confused or wrong, set "delta" between -0.1 and -0.02.
- If neutral, set "delta" to 0.

INTERACTIVE_BLOCK RULES (set to null when not applicable):
- For "quick_choices": { "type": "quick_choices", "data": ["Option A", "Option B", "Option C"] }
- For "inline_challenge": { "type": "inline_challenge", "data": { "question": "What does X do?", "options": ["A", "B", "C"] } }
- For "guided_experiment": { "type": "guided_experiment", "data": { "code": "console.log('hello')", "language": "javascript" } }
- Use quick_choices when offering next steps.
- Use inline_challenge in Socratic or Interviewer mode to test knowledge.
- Use guided_experiment in PairProgrammer mode to suggest runnable code.

MEMORY AWARENESS:
- If the MENTOR MEMORY VECTOR shows strengths, acknowledge them briefly.
- If it shows weaknesses, be extra patient and scaffold your explanation.
- If it shows common mistakes, proactively warn about them.
- Match the learningStyle preference.

Context: ${context}${contentContext}${brainContext}${memoryContext}
Recent conversation:
${recentContext || 'No prior conversation in this panel.'}

MODES OF OPERATION:
- Teacher: Uses analogies, bullet points, explains "Why".
- Mentor: Evaluates ideas, points out industry best practices, focuses on architecture.
- Debugger: Surgical. Truncates theory. Looks at specific errors and lines of code.
- Coach: Focuses on psychology. Validates difficulty. Breaks tasks into micro-steps.
- Socratic: Refuses to give the direct answer. Asks a leading question back.
- Interviewer: Asks challenging edge-case questions. Expects student to explain code.
- PairProgrammer: Works alongside. Suggests small runnable code blocks.

RULES FOR "speech":
- Do not greet. Answer immediately.
- Maximum 140 words. Use 1-3 short blocks.
- Adopt the persona defined by your chosen "mode".

USER: ${newMessage}`;

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.15,
        maxOutputTokens: 800,
        responseMimeType: "application/json"
      } as any
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

    // Build citations list from scouted resources
    const manualCitations: ContentCitation[] = (moduleResources || []).map((r, idx) => ({
      index: idx + 1,
      title: r.title || 'Source',
      url: r.content,
      domain: r.content.includes('youtube.com') || r.content.includes('youtu.be')
        ? 'youtube.com'
        : (() => { try { return new URL(r.content).hostname.replace(/^www\./, ''); } catch { return 'source'; } })(),
      snippet: 'Scouted resource for this module.',
    }));

    const hasResources = manualCitations.length > 0;

    // Separate docs/articles from YouTube (AI can read article URLs, not YT videos)
    const readableSources = (moduleResources || []).filter(r => r.type !== 'youtube');
    const ytSources       = (moduleResources || []).filter(r => r.type === 'youtube');

    // Build the source reference block for the prompt
    const sourceBlock = hasResources
      ? `SCOUTED SOURCES FOR THIS MODULE:
${ytSources.length > 0 ? `YouTube Videos (use as topic signals for relevance):
${ytSources.map((r, i) => `[YT${i+1}] ${r.title}`).join('\n')}
` : ''}${readableSources.length > 0 ? `Reference Articles & Docs (use Google Search to access and synthesize their content):
${readableSources.map((r, i) => `[DOC${i+1}] ${r.title} — ${r.content}`).join('\n')}
` : ''}`
      : '';

    // MERGED PROMPT: Cortex persona + new formatting and resources
    const prompt = `You are SARA, a Senior Technical Strategist at Cortex.
Your mission is to generate a high-fidelity, clean scholarly whitepaper for "${moduleTitle}".

${sourceBlock}
MANDATE:
- Write accurate, expert-level content about "${moduleTitle}" specifically.
- Use Google Search to access and synthesize any documentation or article URLs listed above.
- Scope: strictly ${concepts.join(', ')} only — no drift, no padding.
- Add your intelligence: clarify confusing parts, give concrete examples, highlight real-world usage.
- Make it simple enough for the target learner but complete enough to be authoritative.
- Every technical claim must be correct. No vague generalities.

FORMAT (strictly follow):
# ${moduleTitle}

## Introduction
[What it is, why it matters, when to use it — 150 words max]

## Core Concepts
[The essential mechanics — use sub-headers for each concept]

## How It Works
[Practical mechanics with code examples where relevant]

## Common Patterns & Best Practices
[Real-world usage patterns, what to do and what to avoid]

## Common Mistakes
[Top 3-5 mistakes learners make and how to avoid them]
${hasResources && readableSources.length > 0 ? `
## Further Reading
${readableSources.map(r => `- [${r.title}](${r.content})`).join('\n')}` : ''}
${hasResources && ytSources.length > 0 ? `
## Video Resources
${ytSources.map(r => `- [${r.title}](${r.content})`).join('\n')}` : ''}

Goal: ${goal}
Concepts to cover: ${concepts.join(', ')}

START DIRECTLY WITH THE # HEADING. No preamble.`;

    let text = '';
    let citations: ContentCitation[] = [];
    let attempts = 0;

    console.time(`[Cortex] Content generation: ${moduleTitle}`);

    while (attempts < 3) {
      try {
        if (attempts === 0) {
          // Attempt 1 (FAST PATH): Direct generation — no Google Search overhead
          // Resources are already scouted, so the prompt has all context it needs
          const response = await generateContentWithFallback('text', {
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          text = getText(response);
          citations = manualCitations;
        } else if (attempts === 1) {
          // Attempt 2 (ENRICHED PATH): WITH Google Search for grounding (20s timeout)
          const searchResponse: any = await Promise.race([
            generateContentWithFallback('text', {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { tools: [{ googleSearch: {} }] }
            } as any),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Content generation timeout')), 20000))
          ]);
          text = getText(searchResponse);

          // Extract any real grounding URLs found by Google Search
          const groundingChunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundingCitations: ContentCitation[] = groundingChunks
            .filter((c: any) => c?.web?.uri && c?.web?.title)
            .slice(0, 3)
            .map((c: any, idx: number) => ({
              index: manualCitations.length + idx + 1,
              title: c.web.title,
              url: c.web.uri,
              domain: (() => { try { return new URL(c.web.uri).hostname.replace(/^www\./, ''); } catch { return 'source'; } })(),
              snippet: 'Found via live web search during content generation.',
            }));

          citations = [...manualCitations, ...groundingCitations];
        } else {
          // Attempt 3: Bulletproof Ultra-lightweight Fallback
          const lightPrompt = `You are SARA, Senior Learning Architect for Cortex. 
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
          console.timeEnd(`[Cortex] Content generation: ${moduleTitle}`);
          return { content: text, citations };
        }
      } catch (err) {
        console.warn(`[Cortex] Generation attempt ${attempts + 1} failed:`, err);
      }
      attempts++;
    }

    console.timeEnd(`[Cortex] Content generation: ${moduleTitle}`);
    throw new Error('Content generation failed after multiple attempts.');
  }));
};

// ─── CONCEPT MAP ─────────────────────────────────────────────────────────────
export const generateConceptMap = async (
  moduleTitle: string,
  concepts: string[],
  content: string,
  complexity: string = 'overview',
  studyLens: string = 'roadmap',
  scholarPersona: string = 'visionary'
): Promise<{
  centralConcept: string;
  nodes: Array<{ id: string; label: string; description: string; depth: number; parentId?: string; connections?: string[] }>;
  relationships: Array<{ from: string; to: string; label: string }>;
}> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const targetNodes: Record<string, string> = {
      spark: '1-2',
      snapshot: '3-5',
      overview: '6-8',
      detailed: '12-16',
      deep: '20-26',
      mastery: '28-34',
      infinite: '35-50',
    };
    const lensInstruction: Record<string, string> = {
      roadmap: 'Organize as a step-by-step learning path from prerequisites to mastery.',
      foundations: 'Prioritize fundamentals, prerequisites, definitions, and first principles.',
      practice: 'Prioritize actionable skills, drills, implementation steps, and hands-on checkpoints.',
      exam: 'Prioritize high-yield facts, common question patterns, and fast revision order.',
      pitfalls: 'Prioritize misconceptions, confusing contrasts, failure modes, and debugging checkpoints.',
      feynman: 'Decompose every concept until a 10-year-old could explain it. Use analogies and simple language.',
      sherlock: 'Trace each concept back to its origin clue. Show the detective chain of reasoning.',
      einstein: 'Derive everything from first principles. Show axioms, then build up.',
      sprint: 'Organize for maximum retention in 60 minutes. Prioritize by impact-per-minute.',
      debate: 'For every concept, include a counter-argument or common misconception to stress-test understanding.',
    };
    const personaInstruction: Record<string, string> = {
      visionary: 'Frame each node as a future capability the student will unlock. Focus on what becomes possible.',
      analyst: 'Use precise, data-driven descriptions. Quantify relationships where possible.',
      builder: 'Frame everything as something constructable. Each node is a building block toward a project.',
      challenger: 'Each description should pose a provocative question or challenge an assumption.',
      storyteller: 'Each node is a chapter in a story. Show narrative progression and dramatic tension.',
      strategist: 'Frame mastery as a strategic campaign. Show tactical advantages of each concept.',
      hacker: 'Shortest path, maximum leverage. Each node shows the hack or shortcut to understanding.',
    };
    const prompt = `You are a Lead Knowledge Engineer. Perform a Deep Semantic Extraction for a Neural Synthesis Map.
Topic: "${moduleTitle}"
Content: ${content ? (content.match(/^#{1,3}\s+.+$/gm) || []).join('\n') + '\n' + content.substring(0, 2000) : concepts.join(', ')}
Complexity: ${complexity} (return ${targetNodes[complexity] || '6-8'} nodes)
Study lens: ${studyLens}. ${lensInstruction[studyLens] || ''}
Scholar Persona: ${scholarPersona}. ${personaInstruction[scholarPersona] || ''}

Rules:
- Root node (depth 0) must have id "root".
- Every node must have a parentId.
- Keep depth 0-3 for readability.

Return ONLY valid JSON:
{
  "centralConcept": "${moduleTitle}",
  "nodes": [
    { "id": "root", "label": "${moduleTitle}", "description": "Core Topic", "depth": 0, "parentId": null }
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

// ─── BACKGROUND PRE-GENERATION WORKER (uses bgQueue to avoid blocking interactive) ──
export const triggerBackgroundPreGeneration = async (
  pathId: string,
  phaseId: string,
  moduleId: string,
  moduleTitle: string,
  keyConcepts: string[],
  goal: string,
  existingResources: any[],
  saveModuleContent: (pathId: string, phaseId: string, moduleId: string, content: string) => void,
  saveModuleCitations: (pathId: string, phaseId: string, moduleId: string, citations: ContentCitation[]) => void,
  replaceModuleResources: (pathId: string, phaseId: string, moduleId: string, resources: Resource[]) => void
) => {
  // Use bgQueue so this doesn't compete with interactive requests
  bgQueue.add(async () => {
    try {
      console.log(`[Warmup] Background pre-generating content for: "${moduleTitle}"`);
      let resources = existingResources || [];
      if (resources.length === 0) {
        resources = await scoutResourcesCached(moduleTitle, goal);
        if (resources.length > 0) {
          replaceModuleResources(pathId, phaseId, moduleId, resources);
        }
      }

      const { content, citations } = await generateModuleContent(
        moduleTitle,
        keyConcepts,
        goal,
        resources
      );

      saveModuleContent(pathId, phaseId, moduleId, content);
      if (citations) {
        saveModuleCitations(pathId, phaseId, moduleId, citations);
      }
      console.log(`[Warmup] Background pre-generation complete for: "${moduleTitle}"`);
    } catch (err) {
      console.warn(`[Warmup] Background pre-generation failed for: "${moduleTitle}"`, err);
    }
  }).catch(() => {}); // fire-and-forget, errors handled inside
};

// ─── STRUCTURED WEB SCOUTING FOR CREATION ────────────────────────────────────
export const scoutWebForResourcesJSON = async (topic: string): Promise<any[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `You are the Cortex Scout-Sphere, a multi-agentic web research and curation engine designed to build highly-grounded learning roadmaps.
Your target topic is: "${topic}".

To retrieve the absolute best and most authoritative learning resources, proceed through these 3 steps:

STEP 1: SEMANTIC QUERY DECOMPOSITION
Decompose the target learning topic into 3 specialized, high-intent sub-queries:
1. Documentation & Manuals: Searching for official guides, documentation, or reference manuals.
2. Practical & Articles: Searching for hands-on tutorials, code repositories, boilerplates, or deep dives.
3. Video Masterclasses: Searching for high-quality video courses, freeCodeCamp, or interactive sandboxes.

STEP 2: RESEARCH & EXTRACTION
Execute Google searches for these decomposed sub-queries. Gather a total of 6 verified resources. 

STEP 3: THE CURATION JURY (SCORING)
Score each potential resource and filter out:
- Paywalled or heavily ad-ridden sites.
- Stale resources (e.g. Next.js 12 tutorials when Next.js 14 is current, unless absolutely relevant).
- Low-value introductory blog posts without depth.

AGGREGATION FORMAT:
Return ONLY a valid JSON array of objects representing the final 6 curated resources. Do NOT include markdown fences, conversational text, or preambles.

JSON Schema format:
[
  {
    "title": "Exact and Authoritative Resource Title",
    "url": "https://link-to-resource-source-domain.com/exact-path",
    "snippet": "Why this resource was selected by the Cortex Jury and what specific outline it covers.",
    "type": "doc"
  }
]`;
    try {
      const response = await generateContentWithFallback('text', {
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] } as any
      });
      let text = getText(response) || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) text = jsonMatch[0];
      return JSON.parse(text);
    } catch (e) {
      const response = await generateContentWithFallback('text', { contents: prompt });
      let text = getText(response) || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) text = jsonMatch[0];
      return JSON.parse(text);
    }
  }));
};

export const getNotesAutocomplete = async (
  moduleTitle: string,
  notesContent: string,
  keyConcepts: string[]
): Promise<string> => {
  return chatQueue.add(() => retryWithBackoff(async () => {
    const contextSnippet = notesContent.substring(Math.max(0, notesContent.length - 1200));
    const prompt = `You are a note-taking autocomplete engine inside a smart study editor for the module "${moduleTitle}".
Key concepts: ${keyConcepts.join(", ")}

Task: Given the note content context below, predict/suggest the continuation of the current sentence or thought.
Rules:
- The suggestion MUST be 3 to 7 words.
- It MUST start exactly where the notes text ends to form a natural completion.
- Return ONLY the exact suggested continuation text. No markdown formatting, no quotes, no commentary, no chat prefix/conversational text.

Notes text context:
"""
${contextSnippet}
"""

Suggestion:`;

    const response = await generateContentWithFallback('lite', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        maxOutputTokens: 15
      }
    });

    let suggestion = getText(response) || '';
    // Clean quotes or prefix/suffix
    suggestion = suggestion.trim().replace(/^["']|["']$/g, '').trim();
    return suggestion;
  }));
};

export interface SocraticQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export const generateSocraticCheckpoint = async (
  conceptLabel: string,
  conceptDescription: string,
  moduleTitle: string
): Promise<SocraticQuestion> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `You are SARA, the Student Intelligence System of Vidyal.ai. 
Generate EXACTLY ONE interactive multiple-choice Socratic checkpoint question to test a student's conceptual understanding of the topic: "${conceptLabel}".

Description of concept: "${conceptDescription}"
Context of module: "${moduleTitle}"

The question should be conceptual, engaging, and require active thought. Offer exactly 4 options.
Return your response strictly as a JSON object following this format:
{
  "question": "The question text.",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": 0,
  "explanation": "Detailed explanation of why Option A is correct."
}`;

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correctAnswerIndex: { type: "integer" },
            explanation: { type: "string" }
          },
          required: ["question", "options", "correctAnswerIndex", "explanation"]
        }
      } as any
    });

    const text = getText(response);
    if (!text) throw new Error("Empty response from Socratic checkpoint generator");
    return JSON.parse(text.trim());
  }));
};


