import { GoogleGenAI, Modality } from "@google/genai";
import { LearningPath, Resource, ChatMessage, QuizQuestion, VideoSegment, ContentCitation, StudentBrainState, LLMConfig, SandboxErrorExplanation, SandboxFixProposal, ScheduledSession } from "../types";
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
  ],
  lite: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
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
let sandboxApiKey = localStorage.getItem('vidyal_sandbox_api_key') || '';

export async function initializeSandboxKey(): Promise<void> {
  // Hardened Release: Client no longer fetches or handles the server sandbox keys directly.
}

function getExplicitByokGeminiKey(): string {
  try {
    const raw = localStorage.getItem('vidyal_byok_config');
    if (raw) {
      const parsed = JSON.parse(raw) as LLMConfig;
      if (parsed.provider === 'gemini' && parsed.apiKey?.trim()) {
        return parsed.apiKey.trim();
      }
    }
  } catch {
    /* ignore */
  }
  return '';
}

function getGeminiApiKey(): string {
  const byokGeminiKey = getExplicitByokGeminiKey();
  const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiKey = byokGeminiKey || envGeminiKey || sandboxApiKey;
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured in the browser. Add GEMINI_API_KEY to backend/.env (recommended) or link a key in Settings.',
    );
  }
  return apiKey;
}

function getAI(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  
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
    if (raw) return JSON.parse(raw) as LLMConfig;
  } catch {
    /* ignore malformed config */
  }
  return null;
}

const SERVER_AI_FLAG = 'vidyal_server_gemini_configured';

/** Accept classic AI Studio keys (AIzaSy…) and newer Google Cloud key formats (e.g. AQ.…). */
export function isValidGeminiApiKeyFormat(apiKey: string): boolean {
  const key = apiKey.trim();
  if (key.length < 20 || key.includes('your_')) return false;
  if (key.startsWith('AIzaSy')) return true;
  if (key.startsWith('AQ.')) return true;
  // Other Google-issued key prefixes — validate via API, not prefix alone.
  return /^[A-Za-z0-9._-]{24,}$/.test(key);
}

/** True when the browser can call Gemini directly (Settings BYOK or build-time env). */
export function hasClientGeminiKey(): boolean {
  if (import.meta.env.VITE_GEMINI_API_KEY || sandboxApiKey) return true;
  const byok = getBYOKConfig();
  return byok?.provider === 'gemini' && Boolean(byok.apiKey?.trim());
}

export function isServerGeminiConfigured(): boolean {
  return sessionStorage.getItem(SERVER_AI_FLAG) === '1';
}

export async function refreshServerAiStatus(): Promise<boolean> {
  try {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api$/, '');
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) return false;
    const data = await res.json() as { geminiConfigured?: boolean };
    const ok = Boolean(data.geminiConfigured);
    sessionStorage.setItem(SERVER_AI_FLAG, ok ? '1' : '0');
    return ok;
  } catch {
    return false;
  }
}

/** True when AI is available via browser key or backend GEMINI_API_KEY. */
export function hasConfiguredApiKey(): boolean {
  return hasClientGeminiKey() || isServerGeminiConfigured();
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
    else if (provider === 'groq') model = 'llama-3.3-70b-specdec';
  }

  let endpoint = config?.customEndpoint;
  if (!endpoint) {
    if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
    else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    else if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    else if (provider === 'anthropic') endpoint = 'https://api.anthropic.com/v1/messages';
  }

  if (provider === 'openai' || provider === 'openrouter' || provider === 'groq') {
    const isReasoningModel = model.startsWith('o1') || model.startsWith('o3') || model.includes('/o1') || model.includes('/o3');
    const messages = [];
    if (options.systemInstruction) {
      messages.push({ 
        role: isReasoningModel ? 'developer' : 'system', 
        content: options.systemInstruction 
      });
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

    const isAnthropicModel = model.toLowerCase().includes('claude') || model.toLowerCase().includes('anthropic');
    const body: Record<string, any> = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
    };
    if (options.responseMimeType === 'application/json') {
      if (isAnthropicModel) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && !lastMsg.content.includes('valid JSON')) {
          lastMsg.content = `${lastMsg.content}\n\nCRITICAL: Return strictly valid JSON. Do not wrap in markdown fences.`;
        }
      } else {
        body.response_format = { type: 'json_object' };
      }
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
    let finalPrompt = prompt;
    if (options.responseMimeType === 'application/json' && !prompt.includes('valid JSON')) {
      finalPrompt = `${prompt}\n\nCRITICAL: Return strictly valid JSON. Do not wrap in markdown fences.`;
    }
    const messages = [{ role: 'user', content: finalPrompt }];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-html-user-agents': 'true'
    };

    const body: Record<string, any> = {
      model,
      max_tokens: options.maxOutputTokens ?? 8192,
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

export function getGeminiProviderErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();
  if (message.includes('reported as leaked')) {
    return 'This Gemini API key was reported as leaked by Google. Create a new key in Google AI Studio and replace the old one.';
  }
  if (message.includes('api key') && (message.includes('invalid') || message.includes('expired'))) {
    return 'This Gemini API key is invalid. Please create or paste a valid Gemini API key.';
  }
  if (message.includes('403') || message.includes('permission') || message.includes('forbidden')) {
    return 'Gemini rejected this API key with a permissions error. Check key restrictions or create a new key.';
  }
  if (message.includes('quota') || message.includes('429') || message.includes('resource_exhausted')) {
    return 'Gemini quota is exhausted for this key. Try again later or use a different key.';
  }
  return raw || 'Gemini validation failed.';
}

export async function validateGeminiAccess(apiKey?: string): Promise<void> {
  const key = apiKey?.trim() || getGeminiApiKey();
  const ai = new GoogleGenAI({
    apiKey: key,
    apiVersion: import.meta.env.VITE_GEMINI_API_VERSION || 'v1beta',
  });

  try {
    // Use gemini-2.5-flash for validation — it has no "thinking" tokens
    // so it reliably returns text even with a small output budget.
    const response = await withGeminiTimeout(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Say the word OK.' }] }],
        config: { maxOutputTokens: 50, temperature: 0 },
      }),
      20_000,
      'Gemini validation',
    );
    // Accept any non-empty response — the key is valid if the API call succeeded at all
    const text = getText(response).trim();
    if (!text && text !== '0') {
      // Some models return thinking-only responses; treat a successful API call as valid
      // and only fail on actual API errors (caught below)
      console.warn('[validateGeminiAccess] Empty text response — treating as success since no API error was thrown.');
    }
  } catch (error) {
    throw new Error(getGeminiProviderErrorMessage(error));
  }
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
    cachedAvailableModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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

function getUserPrefModel(): string {
  try {
    const raw = localStorage.getItem('vidyal_user_preferences');
    if (raw) {
      const pref = JSON.parse(raw);
      if (pref.aiModel) return pref.aiModel;
    }
  } catch {
    /* ignore */
  }
  return '';
}

function buildDirectModelCandidates(kind: ModelKind): string[] {
  const byok = getBYOKConfig();
  const byokMode = localStorage.getItem('vidyal_byok_mode') || 'auto';
  const preferredModel = byokMode === 'custom' && byok?.provider === 'gemini'
    ? byok.preferredModel?.trim()
    : getUserPrefModel();
  const cached = resolvedModelCache[kind];
  return Array.from(new Set([
    cached,
    preferredModel,
    ...PREFERRED_MODELS[kind],
  ].filter((model): model is string => Boolean(model))));
}

async function generateContentWithFallback(
  kind: ModelKind,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const byok = getBYOKConfig();
  const isCustomByok = byok?.provider === 'gemini' && Boolean(byok.apiKey?.trim());
  const byokMode = localStorage.getItem('vidyal_byok_mode') || 'auto';

  if (byokMode === 'auto' && !isCustomByok) {
    const { api } = await import('./api');
    return api.aiProxy({ kind, params });
  }

  if (byok && byok.provider !== 'gemini' && byok.apiKey?.trim()) {
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

  let candidates = buildDirectModelCandidates(kind);
  let lastError: any;

  while (candidates.length > 0) {
    const model = candidates.shift()!;

    try {
      const response = await getAI().models.generateContent({ ...params, model });
      resolvedModelCache[kind] = model;
      return response;
    } catch (error) {
      lastError = error;

      if (isModelNotFoundError(error)) {
        continue;
      }

      if (isQuotaError(error) && candidates.length > 0) {
        console.warn(`[Gemini] ${model} hit quota limits. Trying next available ${kind} model...`);
        continue;
      }

      throw error;
    }
  }

  let available = await listModels(true);
  candidates = buildModelCandidates(kind, available);

  while (candidates.length > 0) {
    const model = candidates.shift()!;

    try {
      const response = await getAI().models.generateContent({ ...params, model });
      resolvedModelCache[kind] = model;
      return response;
    } catch (error) {
      lastError = error;

      if (isModelNotFoundError(error)) continue;
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
  private taskTimeoutMs: number;

  constructor(maxConcurrency = 1, minDelayMs = 1500, taskTimeoutMs = 120000) {
    this.maxConcurrency = maxConcurrency;
    this.minDelayMs = minDelayMs;
    this.taskTimeoutMs = taskTimeoutMs;
  }

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const controller = { cancelled: false };
        const timeout = setTimeout(() => {
          controller.cancelled = true;
          reject(new Error(`AI_TIMEOUT: Request exceeded ${Math.round(this.taskTimeoutMs / 1000)} seconds. The model may be overloaded.`));
        }, this.taskTimeoutMs);
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

// Gemini quota safety: serial execution, 1.5s stagger, 120s per-task timeout.
export const apiQueue = new AIRequestQueue(1, 1500, 120000);
export const bgQueue = new AIRequestQueue(1, 1500, 120000);
export const chatQueue = new AIRequestQueue(1, 1500, 120000);
export const planQueue = new AIRequestQueue(1, 1500, 120000);

export function withGeminiTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'Gemini request',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 1, delay = 600): Promise<T> {
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
    const parts = response?.candidates?.[0]?.content?.parts as any[] | undefined;
    const inlineData = parts?.find((part: any) => part?.inlineData)?.inlineData;
    if (!inlineData?.data) {
      return null;
    }

    return base64ToArrayBuffer(inlineData.data);
  }));
};

// ─── LEARNING PLAN ────────────────────────────────────────────────────────────
export type GenerateLearningPlanOptions = {
  mode?: 'preview' | 'full';
  timeoutMs?: number;
  studyLens?: string;
  scholarPersona?: string;
  cognitiveDensity?: string;
};

function extractGoalTitle(goal: string): string {
  const match = goal.match(/Goal:\s*(.+)/i);
  return (match?.[1] || goal).split('\n')[0].trim() || 'Learning Path';
}

function buildFallbackLearningPlan(goal: string, skillLevel: string): Record<string, unknown> {
  const topic = extractGoalTitle(goal);
  const module = (title: string, description: string, minutes: number, concepts: string[]) => ({
    title,
    description,
    estimatedMinutes: minutes,
    keyConcepts: concepts,
  });

  return {
    title: topic,
    description: `A focused ${skillLevel} path for ${topic}.`,
    isFallback: true,
    phases: [
      {
        title: 'Core Foundations',
        description: `Essential concepts for ${topic}.`,
        modules: [
          module('Introduction & Mental Model', `What ${topic} is and why it matters.`, 30, ['overview', 'terminology']),
          module('Setup & First Steps', 'Environment, tooling, and a minimal working example.', 45, ['setup', 'basics']),
        ],
      },
      {
        title: 'Applied Practice',
        description: 'Hands-on skills and patterns.',
        modules: [
          module('Guided Exercises', 'Structured drills on the most important skills.', 45, ['practice', 'patterns']),
          module('Mini Build', 'A small project that connects the core ideas.', 60, ['project', 'integration']),
        ],
      },
      {
        title: 'Mastery Checkpoint',
        description: 'Consolidate and extend.',
        modules: [
          module('Advanced Patterns', 'Common pitfalls, best practices, and next-level techniques.', 45, ['advanced', 'best-practices']),
          module('Review & Road Ahead', 'Summary, self-check, and what to learn next.', 30, ['review', 'roadmap']),
        ],
      },
    ],
  };
}

function parseLearningPlanJson(text: string): Record<string, unknown> {
  let raw = text;
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  if (jsonMatch) raw = jsonMatch[1];
  raw = raw.trim();
  return JSON.parse(raw);
}

export const generateLearningPlan = async (
  goal: string,
  resources: string,
  dailyCommitment: number,
  skillLevel: string,
  expectedOutcome?: string,
  targetDate?: string,
  depth: 'Foundational' | 'Expert' | 'Advanced' | 'Mastery / Deep-Dive' | 'Academic & Research' = 'Expert',
  fileAttachments?: FileAttachment[],
  options: GenerateLearningPlanOptions = {},
): Promise<any> => {
  const mode = options.mode ?? 'full';
  const timeoutMs = options.timeoutMs ?? (mode === 'preview' ? 28_000 : 70_000);
  const isPreview = mode === 'preview';

  return planQueue.add(() => retryWithBackoff(async () => {
    const backendPlan = await api.generateLearningPlan({
      goal,
      skillLevel,
      dailyCommitment,
      expectedOutcome,
      mode,
      resources,
      studyLens: options.studyLens,
      scholarPersona: options.scholarPersona,
      cognitiveDensity: options.cognitiveDensity,
    });
    if (backendPlan?.phases) {
      return backendPlan;
    }

    let phaseInstruction = '';
    const activeDensity = options.cognitiveDensity || (depth === 'Foundational' ? 'overview' : depth === 'Expert' ? 'deep' : 'infinite');
    
    if (isPreview) {
      phaseInstruction = 'CRITICAL: Output EXACTLY 3 phases. Each phase has EXACTLY 2 modules. Keep descriptions under 120 characters. No URLs or suggestedResources.';
    } else if (['spark', 'snapshot', 'overview'].includes(activeDensity)) {
      phaseInstruction = 'Output 3-4 phases. Max 3 modules per phase. Keep descriptions concise.';
    } else if (activeDensity === 'deep') {
      phaseInstruction = 'Output 5-7 phases. Max 3 modules per phase. Cover core pillars without filler.';
    } else if (activeDensity === 'infinite') {
      phaseInstruction = 'Output 8-12 phases. Max 4 modules per phase. Go extremely deep into advanced modules and specialization details.';
    } else {
      phaseInstruction = 'Output 5-7 phases. Max 3 modules per phase. Cover core pillars without filler.';
    }

    const resourceBlock = isPreview || !resources
      ? ''
      : `\nGROUNDING RESOURCES (inform structure only — do not echo URLs):\n${resources.substring(0, 12000)}`;

    const moduleShape = isPreview
      ? `{ "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"] }`
      : `{ "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"], "suggestedResources": [{ "title": "string", "url": "string", "snippet": "string" }] }`;

    const prompt = `Return ONLY valid JSON. No markdown fences.

Roadmap for: "${goal.substring(0, 16000)}"
Skill: "${skillLevel}" | Outcome: "${expectedOutcome || 'Mastery'}" | Daily mins: ${dailyCommitment}
${resourceBlock}

${phaseInstruction}

JSON:
{
  "title": "string",
  "description": "string (max 200 chars)",
  "phases": [{ "title": "string", "description": "string", "modules": [${moduleShape}] }]
}`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
    if (!isPreview && fileAttachments && fileAttachments.length > 0) {
      for (const f of fileAttachments) {
        parts.push({ inlineData: { mimeType: f.mimeType, data: f.base64 } });
      }
    }

    const modelKind: ModelKind = isPreview || depth === 'Foundational' ? 'lite' : 'text';

    const request = generateContentWithFallback(modelKind, {
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.35,
        maxOutputTokens: isPreview ? 2800 : (depth === 'Advanced' || depth === 'Mastery / Deep-Dive' || depth === 'Academic & Research') ? 8192 : 5500,
      },
    });

    let response: Awaited<ReturnType<typeof generateContentWithFallback>>;
    try {
      response = await Promise.race([
        request,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('PLAN_TIMEOUT')), timeoutMs);
        }),
      ]);
    } catch (err) {
      console.warn('[LearningPlan] Client Gemini failed or timed out — using fallback blueprint:', err);
      return buildFallbackLearningPlan(goal, skillLevel);
    }

    const text = getText(response);
    if (!text) {
      console.warn('[LearningPlan] AI returned empty response — using fallback blueprint');
      return buildFallbackLearningPlan(goal, skillLevel);
    }

    try {
      return parseLearningPlanJson(text);
    } catch (e) {
      console.error('JSON Parse Error', e, 'Raw:', text);
      return buildFallbackLearningPlan(goal, skillLevel);
    }
  }, isPreview ? 1 : 2));
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
      if (!hasClientGeminiKey()) {
        throw new Error('Skip client scout — using local video library');
      }

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

// Helper to extract speech field from SARA's structured JSON response
function extractSpeech(text: string): string {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && typeof parsed.speech === 'string') {
      return parsed.speech;
    }
  } catch (e) {
    // Regex fallback
    const match = trimmed.match(/"speech"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
    if (match) {
      try {
        return JSON.parse(`"${match[1]}"`);
      } catch {
        return match[1];
      }
    }
  }
  // Try to clean outer JSON wrapper
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const speechIndex = trimmed.indexOf('"speech"');
    if (speechIndex !== -1) {
      const startQuote = trimmed.indexOf('"', speechIndex + 8);
      if (startQuote !== -1) {
        let endQuote = -1;
        for (let i = startQuote + 1; i < trimmed.length; i++) {
          if (trimmed[i] === '"' && trimmed[i - 1] !== '\\') {
            endQuote = i;
            break;
          }
        }
        if (endQuote !== -1) {
          return trimmed.substring(startQuote + 1, endQuote).replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
      }
    }
  }
  return trimmed;
}

// ─── TUTOR CHAT ───────────────────────────────────────────────────────────────
export const parseTutorResponse = (text: string): Partial<ChatMessage> => {
  const trimmed = text.trim();
  
  // Look for XML tags first
  const metadataStart = trimmed.indexOf('<sara_metadata>');
  const metadataEnd = trimmed.indexOf('</sara_metadata>');
  
  if (metadataStart !== -1 && metadataEnd !== -1) {
    const rawText = trimmed.substring(0, metadataStart).trim();
    const jsonStr = trimmed.substring(metadataStart + 15, metadataEnd).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        return {
          text: rawText,
          mode: parsed.mode || 'Teacher',
          intent: parsed.intent || 'Unknown',
          action: parsed.action || 'none',
          target: parsed.target || '',
          skill_update: parsed.skill_update || null,
          interactive_block: parsed.interactive_block || null,
          parameters: parsed.parameters || null,
        };
      }
    } catch (e) {
      console.warn('[Parser] failed to parse JSON in metadata tags, using regex fallback on tags', e);
    }
  }

  // Fallback: If it's a raw JSON response (old style or fallback)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return {
        text: parsed.speech || parsed.text || '',
        mode: parsed.mode || 'Teacher',
        intent: parsed.intent || 'Unknown',
        action: parsed.action || 'none',
        target: parsed.target || '',
        skill_update: parsed.skill_update || null,
        interactive_block: parsed.interactive_block || null,
        parameters: parsed.parameters || null,
      };
    }
  } catch (e) {
    // Treat as raw text
  }

  // Regex fallback parser
  const speechMatch = trimmed.match(/"speech"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
  const speech = speechMatch ? JSON.parse(`"${speechMatch[1]}"`) : trimmed;
  
  const modeMatch = trimmed.match(/"mode"\s*:\s*"([^"]+)"/);
  const mode = modeMatch ? modeMatch[1] : 'Teacher';
  
  const intentMatch = trimmed.match(/"intent"\s*:\s*"([^"]+)"/);
  const intent = intentMatch ? intentMatch[1] : 'Unknown';

  const actionMatch = trimmed.match(/"action"\s*:\s*"([^"]+)"/);
  const action = actionMatch ? actionMatch[1] : 'none';

  const targetMatch = trimmed.match(/"target"\s*:\s*"([^"]+)"/);
  const target = targetMatch ? targetMatch[1] : '';

  return {
    text: speech,
    mode: mode as any,
    intent: intent as any,
    action: action as any,
    target,
    skill_update: null,
    interactive_block: null,
    parameters: null
  };
};

// ─── TUTOR CHAT ───────────────────────────────────────────────────────────────
export const chatWithTutor = async (history: ChatMessage[], newMessage: string, context: string, currentContent?: string, brainState?: StudentBrainState, chatContext?: any): Promise<Partial<ChatMessage>> => {
  return chatQueue.add(() => retryWithBackoff(async () => {
    const backendResponse = await api.tutorChat({
      history: history.map((m) => ({ role: m.role, content: m.text })),
      newMessage,
      context,
      currentContent,
      chatContext,
    });
    if (backendResponse) {
      return parseTutorResponse(backendResponse);
    }
    if (!hasClientGeminiKey()) {
      throw new Error('SARA is unavailable — check backend/.env GEMINI_API_KEY or add a key in Settings.');
    }

    const recentContext = history.slice(-8).map(m => `${m.role === 'user' ? 'USER' : 'SARA'}: ${m.text}`).join('\n');
    const contentContext = currentContent ? `\nCURRENT MODULE CONTENT (ground answers here): ${currentContent.substring(0, 3500)}` : '';
    const brainContext = brainState ? `\nSTUDENT BRAIN STATE:\nConfidence: ${brainState.confidence}\nStruggling Concepts: ${brainState.strugglingConcepts.join(', ')}\nLast Mistakes: ${brainState.lastMistakes.join(', ')}\nHesitation Score: ${brainState.hesitationScore}` : '';
    const memoryContext = brainState?.mentorMemory ? `\nMENTOR MEMORY:\nStrengths: ${brainState.mentorMemory.strengths.join(', ')}\nWeaknesses: ${brainState.mentorMemory.weaknesses.join(', ')}\nCommon Mistakes: ${brainState.mentorMemory.commonMistakes.join(', ')}\nLearning Style: ${brainState.mentorMemory.learningStyle}` : '';

    const prompt = `You are SARA, an interactive, explainable, friendly AI assistant and learning mentor on Vidhyalaya.

CORE IDENTITY:
You are a helpful mentor — not a robotic chatbot. Think of yourself as the smartest friend the user has: someone who gives real information based on their specific situation, speaks plainly, and actually engages with problems. You are warm, direct, encouraging, and slightly conversational — never childish, never overly formal.

TONE:
- Friendly and direct
- Encouraging without being fake
- Slightly conversational — like texting a smart senior colleague
- Never robotic, never overly formal
- Never use filler phrases like "Great question!" or "Certainly!"

CORE BEHAVIOR:
- Ask clarifying questions ONLY when truly needed. Never ask multiple questions at once.
- Explain step-by-step when the topic is complex.
- Keep answers simple, clear, and practical — use plain language first.
- Use concrete examples, analogies, or real-world scenarios whenever they help.
- Adapt your level to the user: detect if they're beginner, intermediate, or advanced from context.
- Do NOT give huge paragraphs unless explicitly asked. Break big problems into small, digestible chunks.
- Be confident — if you know the answer, give it. Don't hedge unnecessarily.

TEACHING FLOW (for conceptual / "explain X" questions):
1. **Punchy Core Definition**: A bold, high-impact, one-sentence explanation defining the concept cleanly without jargon.
2. **Vivid Analogy**: A clear comparison/analogy mapping the concept to real-world objects, software, or roles using a clean bullet structure (e.g. "Think of it like this: ...").
3. **Structured Progressive Breakdown**: Group sub-concepts into progressive "Levels" (e.g., Level 1: Basic, Level 2: Advanced) with clear example blocks (e.g., using ❌ Weak / ✅ Better comparison structures).
4. **ASCII Skill Tree**: Provide an ASCII taxonomy chart/tree showing the concept breakdown or skill landscape (using ├── and └──).
5. **Goal Contextualization**: Ground the advice directly in the user's specific learning goal (e.g., "For Your Goal ([Goal Name])...") with breakdown percentages (e.g., "Concept A → 30%, Concept B → 30%...").
6. **Industry Takeaway**: Conclude with a strong, quote-like industry takeaway that challenges passive thinking.

CODING HELP FLOW:
1. First, understand the problem clearly
2. Explain the idea/approach before jumping to code
3. Give clean, minimal, well-commented code
4. Briefly explain what the code does (don't repeat line by line)
5. Mention edge cases or possible improvements

CAREER & LEARNING ADVICE:
- Give realistic, honest, actionable advice
- Focus on practical execution over abstract theory
- Suggest specific projects, roadmaps, and tools by name
- Avoid fake motivation — be honest but always supportive
- Recommend concrete next steps, not vague direction

MARKDOWN FORMATTING:
- Use ## / ### headers to organize long answers
- Use bullet points for lists
- Use \`\`\`language code blocks for ALL code
- Use **bold** for key terms and important points
- Use > blockquote for tips, warnings, or "pro tips"
- Keep paragraphs to 2-4 lines max — white space is your friend

MEMORY AWARENESS:
- If MENTOR MEMORY shows strengths, acknowledge them briefly and build on them
- If it shows weaknesses or common mistakes, be extra patient and scaffold carefully
- Match the learningStyle preference when applicable

AFTER YOUR ANSWER:
Once your answer is complete, add one light follow-up — either a gentle question that nudges toward their active learning path, or a "What next?" that bridges to their curriculum goals. One sentence max. Don't force it if the answer is self-contained.

THEN, at the very end of your response, you MUST append the metadata block:

<sara_metadata>
{
  "intent": "Debugging" | "Conceptual" | "Frustration" | "Curiosity" | "Validation" | "Unknown",
  "mode": "Teacher" | "Mentor" | "Debugger" | "Coach" | "Socratic" | "Interviewer" | "PairProgrammer",
  "action": "highlight_code" | "move_cursor" | "dim_terminal" | "open_notes" | "none",
  "target": "optional string or empty string",
  "skill_update": { "concept": "topic_name", "delta": 0.05 } | null,
  "interactive_block": null | {
    "type": "quick_choices" | "inline_challenge" | "guided_experiment",
    "data": {}
  }
}
</sara_metadata>

SKILL_UPDATE RULES:
- ALWAYS include skill_update. Set "concept" to the main topic being discussed.
- Student shows understanding → delta between 0.02 and 0.1
- Student is confused or wrong → delta between -0.1 and -0.02
- Neutral / new topic introduction → delta = 0

INTERACTIVE_BLOCK RULES (null when not needed):
- quick_choices: Offer 2-4 follow-up paths after conceptual/learning answers.
  CRITICAL: Do NOT generate "quick_choices" (set to null) during the initial greeting phase (e.g. when the user first says hello or "hi"). Only start providing them once greetings are done and the user asks a real concept or study goal.
  Format: { "type": "quick_choices", "data": ["Option A", "Option B"] }
- inline_challenge: Short quiz to test understanding in Socratic/Interviewer mode. { "type": "inline_challenge", "data": { "question": "...", "options": ["A", "B", "C"] } }
- guided_experiment: Runnable code snippet in PairProgrammer mode. { "type": "guided_experiment", "data": { "code": "console.log('hello')", "language": "javascript" } }

MODE SELECTION GUIDE:
- Teacher → conceptual questions, "what is X", "explain Y"
- Mentor → architecture, best practices, career, design decisions
- Debugger → errors, bugs, stack traces, "why is X not working"
- Coach → motivation, learning blocks, frustration signals
- Socratic → quiz requests, "test me", "challenge me"
- Interviewer → interview prep, edge-case questions
- PairProgrammer → "help me code", "write this with me", step-by-step builds

Context: ${context}${contentContext}${brainContext}${memoryContext}
Recent conversation:
${recentContext || 'No prior conversation in this session.'}

USER: ${newMessage}`;

    const response = await generateContentWithFallback('text', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 3000
      } as any
    });

    return parseTutorResponse(getText(response));
  }));
};

// ─── MODULE CONTENT ───────────────────────────────────────────────────────────
export interface ModuleContentResult {
  content: string;
  citations: ContentCitation[];
}

export const generateModuleContent = async (
  moduleTitle: string,
  concepts: string[],
  goal: string,
  moduleResources?: Resource[],
  studyLens: string = 'roadmap',
  scholarPersona: string = 'visionary',
  cognitiveDensity: string = 'overview',
  onChunk?: (text: string) => void
): Promise<ModuleContentResult> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const backendResult = await api.generateModuleContent({
      moduleTitle,
      concepts,
      goal,
      moduleResources: (moduleResources || []).map((r) => ({
        title: r.title,
        content: r.content,
        type: r.type,
      })),
      studyLens,
      scholarPersona,
      cognitiveDensity,
    }, onChunk);
    if (backendResult?.content) {
      return backendResult;
    }

    if (!hasClientGeminiKey()) {
      throw new Error(
        backendResult?.error ||
          'Server synthesis failed. Check backend/.env GEMINI_API_KEY and reload the session.',
      );
    }

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
    const conceptList = concepts.filter(Boolean).slice(0, 12);

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

    const bibliography = hasResources
      ? `UNIFIED BIBLIOGRAPHY:
${manualCitations.map(c => `[${c.index}] ${c.title} — ${c.url}`).join('\n')}`
      : 'UNIFIED BIBLIOGRAPHY:\n[1] Course context and module key concepts supplied by Cortex.';

    const headingsFormat = conceptList.length > 0
      ? `## Introduction
> Source: [1]
[What it is, why it matters, when to use it — 150 words max]

${conceptList.map(c => `## ${c}\n> Source: [1]\n[Detailed coverage and technical explanation of the concept "${c}"]`).join('\n\n')}

## Mastery Checkpoint
> Source: [1]
[Mastery summary and self-check questions]`
      : `## Introduction
> Source: [1]
[What it is, why it matters, when to use it — 150 words max]

## Core Concepts
> Source: [1]
[The essential mechanics — use sub-headers for each concept]

## How It Works
> Source: [1]
[Practical mechanics with code examples where relevant]

## Common Patterns & Best Practices
> Source: [1]
[Real-world usage patterns, what to do and what to avoid]

## Common Mistakes
> Source: [1]
[Top 3-5 mistakes learners make and how to avoid them]

## Mastery Checkpoint
> Source: [1]
[Mastery summary and self-check questions]`;

    const lensInstruction: Record<string, string> = {
      roadmap: 'Structure the paper as a clear, sequential step-by-step roadmap from foundations to advanced usage.',
      foundations: 'Focus deeply on core fundamentals, prerequisites, definitions, history, and base terminology.',
      practice: 'Emphasize real-world implementation, code drills, step-by-step tutorials, and concrete exercises.',
      exam: 'Focus on high-yield facts, core conceptual checkpoints, flashcard-style takeaways, and typical exam questions.',
      pitfalls: 'Explicitly focus on common mistakes, anti-patterns, performance bottlenecks, debugging strategies, and traps.',
      feynman: 'Explain all concepts using simple analogies, clear terminology, and plain English, as if explaining to a 10-year-old.',
      sherlock: 'Use detective-like deductive reasoning. Trace concepts from historical source/clues and analyze evidence.',
      einstein: 'Derive concepts strictly from first principles. Start with simple axioms, logic, and build up the logic tree.',
      sprint: 'High-impact, concise, fast-paced explanation optimized for maximum retention under time constraints.',
      debate: 'For every key concept, present a thesis and an opposing antithesis or counter-argument to stress-test validity.'
    };

    const personaInstruction: Record<string, string> = {
      visionary: 'Adopt a visionary tone: inspire the reader, highlight future applications, and show how this unlocks new capabilities.',
      analyst: 'Adopt an analytical tone: write with surgical precision, include metrics, performance specs, and quantitative relationships.',
      builder: 'Adopt a builder tone: explain concepts as building blocks for constructing actual systems, projects, or applications.',
      challenger: 'Adopt a challenger tone: ask provocative questions, challenge common dogmas, and stress-test every standard assumption.',
      storyteller: 'Adopt a storyteller tone: weave concepts into a narrative with historical progression, drama, conflict, and resolution.',
      strategist: 'Adopt a strategist tone: frame mastery as a strategic campaign, highlighting tactical advantages, trade-offs, and design choices.',
      hacker: 'Adopt a hacker tone: focus on maximum leverage, rapid shortcuts, neat hacks, real-world workarounds, and minimal fluff.'
    };

    const densityInstruction: Record<string, string> = {
      spark: 'Provide a very concise, ultra-focused summary of 1-2 core insights (approx. 300 words).',
      snapshot: 'Provide a brief, high-yield overview of 3-5 core concepts (approx. 500 words).',
      overview: 'Provide a balanced overview of 6-8 key concepts (approx. 900 words).',
      detailed: 'Provide a highly detailed analysis of 12-16 concepts with code details (approx. 1500 words).',
      deep: 'Provide a comprehensive deep dive covering advanced details and edge cases (approx. 2000 words).',
      mastery: 'Provide an exhaustive scholarly resource covering theoretical underpinnings and mathematical/logical details (approx. 2500 words).',
      infinite: 'Provide an absolute masterclass manual detailing internal architecture, low-level mechanics, and historical contexts (approx. 3000 words).'
    };

    const selectedLensPrompt = lensInstruction[studyLens] || lensInstruction.roadmap;
    const selectedPersonaPrompt = personaInstruction[scholarPersona] || personaInstruction.visionary;
    const selectedDensityPrompt = densityInstruction[cognitiveDensity] || densityInstruction.overview;

    // MERGED PROMPT: Cortex persona + new formatting and resources
    const prompt = `You are SARA, a Senior Technical Strategist at Cortex.
Your mission is to generate a high-fidelity, clean scholarly whitepaper for "${moduleTitle}".

${sourceBlock}
${bibliography}

STYLE & PERSPECTIVE ADAPTATION:
- STUDY LENS: ${selectedLensPrompt}
- SCHOLAR PERSONA: ${selectedPersonaPrompt}
- COGNITIVE DENSITY / COMPLEXITY: ${selectedDensityPrompt}

MANDATE:
- Write accurate, expert-level content about "${moduleTitle}" specifically.
- Use the bibliography and module concepts as the grounding set. Do not invent unrelated topics.
- Scope: strictly ${conceptList.join(', ') || moduleTitle} only — no drift, no padding.
- Add your intelligence: clarify confusing parts, give concrete examples, highlight real-world usage.
- Make it simple enough for the target learner but complete enough to be authoritative.
- Every technical claim must be correct. No vague generalities.
- IMPORTANT: after every H2 heading, add a line exactly like "> Source: [1]" or "> Source: [1], [2]" referencing the unified bibliography.

FORMAT (strictly follow):
# ${moduleTitle}

${headingsFormat}
${hasResources && readableSources.length > 0 ? `
## Further Reading
> Source: ${readableSources.map((_, i) => `[${ytSources.length + i + 1}]`).join(', ')}
${readableSources.map(r => `- [${r.title}](${r.content})`).join('\n')}` : ''}
${hasResources && ytSources.length > 0 ? `
## Video Resources
> Source: ${ytSources.map((_, i) => `[${i + 1}]`).join(', ')}
${ytSources.map(r => `- [${r.title}](${r.content})`).join('\n')}` : ''}

Goal: ${goal}
Concepts to cover: ${conceptList.join(', ') || moduleTitle}

START DIRECTLY WITH THE # HEADING. No preamble.`;

    console.time(`[Cortex] Content generation: ${moduleTitle}`);
    const attempts = [
      {
        label: 'full synthesis',
        kind: 'text' as ModelKind,
        prompt,
        timeoutMs: 110_000,
        maxOutputTokens: 9000,
        temperature: 0.32,
      },
      {
        label: 'compact synthesis',
        kind: 'lite' as ModelKind,
        prompt: `Generate a complete, accurate Cortex study whitepaper for "${moduleTitle}".
Grounding bibliography:
${bibliography}
Goal: ${goal}
Concepts: ${conceptList.join(', ') || moduleTitle}

Rules:
- Start with "# ${moduleTitle}".
- Include H2 sections: Introduction, Core Concepts, How It Works, Patterns, Mistakes, Mastery Checkpoint.
- After every H2 heading, include "> Source: [1]".
- Be specific, technical, and useful. Do not output a placeholder.
- Minimum 900 words unless the topic is tiny.`,
        timeoutMs: 85_000,
        maxOutputTokens: 6500,
        temperature: 0.25,
      },
    ];

    let lastError: unknown = null;
    for (const attempt of attempts) {
      try {
        const response = await withGeminiTimeout(
          generateContentWithFallback(attempt.kind, {
            contents: [{ role: 'user', parts: [{ text: attempt.prompt }] }],
            config: {
              maxOutputTokens: attempt.maxOutputTokens,
              temperature: attempt.temperature,
            },
          }),
          attempt.timeoutMs,
          `Module content ${attempt.label}`,
        );
        const text = getText(response).trim();

        if (text.length >= 700 && !/AI Synthesis Paused|Core ideas for|No content generated/i.test(text)) {
          console.timeEnd(`[Cortex] Content generation: ${moduleTitle}`);
          return { content: text, citations: manualCitations };
        }
        lastError = new Error(`Module content ${attempt.label} returned weak output (${text.length} chars).`);
      } catch (err) {
        lastError = err;
        console.warn(`[Cortex] ${attempt.label} failed:`, err);
      }
    }

    console.timeEnd(`[Cortex] Content generation: ${moduleTitle}`);
    throw lastError instanceof Error ? lastError : new Error('Module content generation failed.');
  }, 2, 1200));
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
  replaceModuleResources: (pathId: string, phaseId: string, moduleId: string, resources: Resource[]) => void,
  studyLens: string = 'roadmap',
  scholarPersona: string = 'visionary',
  cognitiveDensity: string = 'overview'
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
        resources,
        studyLens,
        scholarPersona,
        cognitiveDensity
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
Decompose the target learning topic into specialized, high-intent queries targeting the following 7 categories:
1. GitHub Repositories (github): Codebases, active open-source templates, boilerplates, and reference repositories.
2. Academic & Research Papers (paper): Preprints from arXiv, Google Scholar, SOTA research documents, and mathematical proofs.
3. Interactive Code Sandboxes (sandbox): StackBlitz, CodeSandbox, Replit, or JSFiddle playgrounds.
4. Developer Blogs & Community (community): Dev.to, Hashnode, Medium publications, Hacker News, or tech newsletters.
5. Technical Q&A & Forums (qa): StackOverflow, Reddit engineering boards, or GitHub Discussions.
6. YouTube Videos (youtube): High-engagement video courses, tutorials, or conference talks.
7. Official Documentation (doc): Manuals, specifications, official reference guides.

STEP 2: RESEARCH & EXTRACTION
Execute Google searches for these decomposed queries. Gather a pool of at least 12 (up to 15) high-quality, verified resources. Ensure you have at least one resource representing each of the 7 categories above if available.

STEP 3: THE CURATION JURY (SCORING)
Score each potential resource and filter out:
- Paywalled or heavily ad-ridden sites.
- Stale resources (e.g. outdated API/framework versions).
- Low-value introductory blog posts without depth.

AGGREGATION FORMAT:
Return ONLY a valid JSON array of objects representing the final pool of 12-15 curated resources. Do NOT include markdown fences, conversational text, or preambles.

JSON Schema format:
[
  {
    "title": "Resource Title",
    "url": "https://exact-path-to-resource.com",
    "snippet": "Why this resource was selected by the Cortex Jury and what specific outline it covers.",
    "type": "github" | "paper" | "sandbox" | "community" | "qa" | "youtube" | "doc"
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

// ─── KNOWLEDGE MAP ────────────────────────────────────────────────────────────
export const generateKnowledgeGraph = async (
  moduleTitle: string,
  concepts: string[],
  content: string,
  sourceModuleId?: string,
  studyLens: string = 'roadmap',
  scholarPersona: string = 'visionary',
  cognitiveDensity: string = 'overview',
  goalContext?: string
): Promise<import('../types').KnowledgeGraph> => {
  const { validateAndNormalizeGraph, buildFallbackGraph } = await import('../components/knowledge-map/graphValidator');

  return apiQueue.add(() => retryWithBackoff(async () => {
    const backendGraph = await api.generateKnowledgeGraph({
      moduleTitle,
      concepts,
      content,
      sourceModuleId,
      studyLens,
      scholarPersona,
      cognitiveDensity,
      goalContext,
    });
    if (backendGraph?.nodes?.length) {
      return validateAndNormalizeGraph(backendGraph, moduleTitle, sourceModuleId);
    }
    if (!hasClientGeminiKey()) {
      return buildFallbackGraph(
        moduleTitle,
        concepts.length ? concepts : [moduleTitle],
        sourceModuleId,
      );
    }

    const headings = (content.match(/^#{2,3}\s+(.+)$/gm) || [])
      .map(h => h.replace(/^#{2,3}\s+/, '').trim())
      .slice(0, 12);

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
    const densityNodes: Record<string, string> = {
      spark: '4-6',
      snapshot: '6-8',
      overview: '10-14',
      detailed: '16-22',
      deep: '24-30',
      mastery: '32-38',
      infinite: '40-50',
    };

    const nodesCount = densityNodes[cognitiveDensity] || '16-22';
    const lensPrompt = lensInstruction[studyLens] || '';
    const personaPrompt = personaInstruction[scholarPersona] || '';

    const prompt = `You are SARA, a senior learning architect. Build a rich, multi-layer knowledge graph for "${moduleTitle}" in the context of the overall learning goal "${goalContext || moduleTitle}".

CURRICULUM CONCEPTS (Mandatory Level 1 nodes):
${concepts.slice(0, 10).join(', ') || moduleTitle}

SECTION HEADINGS: ${headings.join(' | ') || 'derive from topic'}
CONTENT EXCERPT:
${content ? content.substring(0, 4500) : concepts.join('\n')}

STYLE & ADAPTATION CONFIGURATION:
- Study Lens: ${studyLens}. ${lensPrompt}
- Scholar Persona: ${scholarPersona}. ${personaPrompt}
- Cognitive Density / Complexity: ${cognitiveDensity} (Target node count: ${nodesCount} nodes)

REQUIREMENTS:
- ${nodesCount} nodes across 4 levels: 0=topic root, 1=major pillars, 2=mechanics/patterns, 3=examples/applications
- Root node id MUST be "root", representing "${moduleTitle}" at level 0.
- Level 1 nodes (major pillars) MUST map 1:1 to the CURRICULUM CONCEPTS: ${concepts.slice(0, 10).join(', ') || moduleTitle}. You must create exactly one level 1 node for each concept in this list, with the label matching the concept name. Do NOT introduce other level-1 major pillars outside this list.
- Level 2 (mechanics/patterns) and Level 3 (examples/applications) nodes must branch off from these level 1 concept nodes as children.
- Edges: Connect the 'root' node to each level 1 concept node. Show relationships between level 1, 2, and 3 nodes.
- Labels: concise (≤42 chars), descriptions: 1–2 expert sentences each
- Use varied edge types: contains, requires, uses, implements, contrasts, leads_to, example_of
- Include at least 4 non-"contains" edges showing real relationships
- learningPath: ordered node ids for mastery (start → advanced)
- diagramType: pick concept_tree | dependency_graph | process_flow based on topic shape

Return ONLY valid JSON:
{
  "diagramType": "...",
  "topic": "${moduleTitle}",
  "nodes": [{ "id": "...", "label": "...", "description": "...", "level": 0, "importance": "critical|important|supplementary" }],
  "edges": [{ "from": "...", "to": "...", "type": "contains|requires|uses|implements|contrasts|leads_to|example_of", "label": "..." }],
  "learningPath": ["..."]
}`;

    const compactPrompt = `Return ONLY JSON for a Cortex knowledge graph about "${moduleTitle}" in the context of the overall learning goal "${goalContext || moduleTitle}".
Use 10-14 nodes. Root id "root" at level 0.
Level 1 nodes MUST map 1:1 to the curriculum concepts: ${concepts.slice(0, 10).join(', ') || moduleTitle}. Do not introduce other major pillars at level 1.
Include diagramType, topic, nodes, edges, learningPath.`;

    const attempts = [
      { label: 'full graph', kind: 'text' as ModelKind, prompt, timeoutMs: 100_000, maxOutputTokens: 6500 },
      { label: 'compact graph', kind: 'lite' as ModelKind, prompt: compactPrompt, timeoutMs: 75_000, maxOutputTokens: 4200 },
    ];

    for (const attempt of attempts) {
      try {
        const response = await withGeminiTimeout(
          generateContentWithFallback(attempt.kind, {
            contents: [{ role: 'user', parts: [{ text: attempt.prompt }] }],
            config: {
              responseMimeType: 'application/json',
              maxOutputTokens: attempt.maxOutputTokens,
              temperature: 0.28,
            },
          }),
          attempt.timeoutMs,
          `Knowledge map ${attempt.label}`,
        );

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
        console.error(`[KnowledgeMap] ${attempt.label} failed:`, e);
      }
    }

    return buildFallbackGraph(moduleTitle, concepts.length ? concepts : [moduleTitle], sourceModuleId);
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

Return JSON only: { "what": "one sentence", "why": "one sentence", "howToFix": "1-2 actionable steps" }`;

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

export const rebalanceCalendarSessions = async (
  sessions: ScheduledSession[],
  dailyCommitmentMinutes: number,
  preferredStartTime: string,
  pathGoal: string
): Promise<Array<{ id: string; startTime: string; endTime: string }>> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const sessionData = sessions.map(s => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime,
      endTime: s.endTime,
      isCompleted: s.isCompleted
    }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const prompt = `You are SARA, the AI Orchestration Scheduler at Vidyal.ai.
The student has missed some scheduled study sessions for their path with goal: "${pathGoal}".
Their current daily commitment is ${dailyCommitmentMinutes} minutes, with a preferred study start time of "${preferredStartTime}".

Here is the list of sessions that need rebalancing. Completed sessions must NEVER be moved, but uncompleted/overdue sessions must be rescheduled to future dates starting from tomorrow (${tomorrow.toDateString()} onwards).
Do not schedule more than one session per day if possible. Avoid overlaps. Align rescheduled sessions to start at "${preferredStartTime}".

Sessions list:
${JSON.stringify(sessionData)}

Task:
Reschedule the dates and times for the uncompleted sessions. Retain their original duration (derived from startTime and endTime).
Do NOT modify the "isCompleted" or "title" or "id" of any session. Only output the rescheduled times.

Return your response strictly as a JSON array of objects, containing the session id, and the new startTime and endTime:
[
  { "id": "session-id", "startTime": "ISO_STRING_START", "endTime": "ISO_STRING_END" }
]`;

    const response = await generateContentWithFallback('lite', {
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              startTime: { type: "string" },
              endTime: { type: "string" }
            },
            required: ["id", "startTime", "endTime"]
          }
        }
      } as any,
    });

    const text = getText(response) || '[]';
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse AI rebalanced sessions:', e);
      return [];
    }
  }));
};
