/**
 * ─── Vidhyalaya Model Registry ───────────────────────────────────────────────
 * Single source of truth for all supported AI models across providers.
 * 
 * Adding a new model = adding one entry to the relevant provider array below.
 * No UI rewrites, no backend changes, no scattered hardcoded values.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModelTier = 'Frontier' | 'Stable' | 'Legacy';
export type ProviderId = 'gemini' | 'openai' | 'anthropic';
export type TierIconId = 'zap' | 'shield' | 'archive';

export interface ModelEntry {
  id: string;
  name: string;
  tier: ModelTier;
  /** Marks this model as the provider default when no preference is set */
  default?: boolean;
}

// ─── Tier Metadata (for UI rendering) ────────────────────────────────────────

export const TIER_META: Record<ModelTier, { label: string; iconId: TierIconId; sortOrder: number }> = {
  Frontier: { label: 'FRONTIER ERA', iconId: 'zap', sortOrder: 0 },
  Stable:   { label: 'STABLE PRODUCTION', iconId: 'shield', sortOrder: 1 },
  Legacy:   { label: 'LEGACY VAULT', iconId: 'archive', sortOrder: 2 },
};

// ─── Provider Metadata ──────────────────────────────────────────────────────

export const PROVIDER_META: Record<ProviderId, { label: string; dot: string }> = {
  gemini:     { label: 'Google Gemini', dot: '#4285F4' },
  openai:     { label: 'OpenAI',        dot: '#10A37F' },
  anthropic:  { label: 'Anthropic',     dot: '#D97706' },
};

// ─── The Registry ────────────────────────────────────────────────────────────

export const MODEL_REGISTRY: Record<ProviderId, ModelEntry[]> = {

  // ──────────────────────────────────────────────────────────────────────────
  // 🔵 Google Gemini Family
  // Architectural pivot from 1.5 → 2.5 → 3.x series
  // ──────────────────────────────────────────────────────────────────────────
  gemini: [
    // Frontier Tier (2026 Releases)
    { id: 'gemini-flash-latest',        name: 'Gemini Flash Latest',  tier: 'Frontier', default: true },
    { id: 'gemini-3.1-pro-preview',  name: 'Gemini 3.1 Pro',   tier: 'Frontier' },
    { id: 'gemini-3.1-flash-lite',   name: 'Gemini 3.1 Flash-Lite', tier: 'Frontier' },
    // High-Stability Tier (Late 2025)
    { id: 'gemini-2.5-pro',          name: 'Gemini 2.5 Pro',  tier: 'Stable' },
    { id: 'gemini-2.5-flash',        name: 'Gemini 2.5 Flash',                 tier: 'Stable' },
    // Legacy Preservation Tier
    { id: 'gemini-1.5-pro',          name: 'Gemini 1.5 Pro',           tier: 'Legacy' },
    { id: 'gemini-1.5-flash',        name: 'Gemini 1.5 Flash',         tier: 'Legacy' },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 🟢 OpenAI Family
  // GPT-4.5/5 cutover to ultimate reasoning models
  // ──────────────────────────────────────────────────────────────────────────
  openai: [
    // Frontier Reasoning & Generation (2026)
    { id: 'gpt-5.5',       name: 'GPT-5.5',           tier: 'Frontier', default: true },
    { id: 'gpt-5.4-mini',  name: 'GPT-5.4 Mini',            tier: 'Frontier' },
    { id: 'o3-mini',       name: 'OpenAI o3-mini', tier: 'Frontier' },
    // Stable Tier (Late 2025 Snapshots)
    { id: 'gpt-5',         name: 'GPT-5',              tier: 'Stable' },
    { id: 'gpt-4.5',       name: 'GPT-4.5',            tier: 'Stable' },
    // Legacy Workhorses
    { id: 'gpt-4o',        name: 'GPT-4o',             tier: 'Legacy' },
    { id: 'gpt-4o-mini',   name: 'GPT-4o Mini',                 tier: 'Legacy' },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 🟠 Anthropic Claude Family
  // Sonnet 3.5 → 4.x/4.6 series + Mythos/Fable architecture
  // ──────────────────────────────────────────────────────────────────────────
  anthropic: [
    // Frontier Intelligence (2026 Releases)
    { id: 'claude-fable-5',          name: 'Claude Fable 5',   tier: 'Frontier' },
    { id: 'claude-sonnet-4.6',       name: 'Claude Sonnet 4.6', tier: 'Frontier', default: true },
    { id: 'claude-opus-4.8',         name: 'Claude Opus 4.8',     tier: 'Frontier' },
    // Stable Tier (Late 2025)
    { id: 'claude-sonnet-4.5',       name: 'Claude Sonnet 4.5',                     tier: 'Stable' },
    { id: 'claude-haiku-4.5',        name: 'Claude Haiku 4.5',                      tier: 'Stable' },
    // Legacy Legends
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet',        tier: 'Legacy' },
    { id: 'claude-3-5-haiku-latest',  name: 'Claude 3.5 Haiku',            tier: 'Legacy' },
  ],
};

// ─── Derived Helpers ─────────────────────────────────────────────────────────

/** Get all models for a given provider, ordered by tier (Frontier → Stable → Legacy) */
export function getModelsForProvider(provider: ProviderId): ModelEntry[] {
  return MODEL_REGISTRY[provider] || [];
}

/** Get the default model ID for a provider (first entry marked `default: true`, or first entry) */
export function getDefaultModelForProvider(provider: ProviderId): string {
  const models = MODEL_REGISTRY[provider];
  if (!models?.length) return 'gemini-flash-latest';
  const defaultModel = models.find(m => m.default);
  return defaultModel ? defaultModel.id : models[0].id;
}

/** Get human-readable display name for a model ID within a provider */
export function getModelDisplayName(provider: ProviderId, modelId: string): string {
  const models = MODEL_REGISTRY[provider];
  if (!models) return modelId;
  const found = models.find(m => m.id === modelId);
  return found ? found.name : modelId;
}

/** Reverse lookup: find which provider owns a given model ID */
export function getProviderForModelId(modelId: string): ProviderId | undefined {
  for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
    if (models.some(m => m.id === modelId)) return provider as ProviderId;
  }
  return undefined;
}

/** Get models grouped by tier for a given provider (for UI rendering) */
export function getModelsGroupedByTier(provider: ProviderId): { tier: ModelTier; models: ModelEntry[] }[] {
  const models = MODEL_REGISTRY[provider] || [];
  const tierOrder: ModelTier[] = ['Frontier', 'Stable', 'Legacy'];
  return tierOrder
    .map(tier => ({ tier, models: models.filter(m => m.tier === tier) }))
    .filter(group => group.models.length > 0);
}

/**
 * Legacy compatibility: flat provider→models map for any code that still
 * expects the old PROVIDER_MODELS shape. Strips tier metadata.
 */
export const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = Object.fromEntries(
  Object.entries(MODEL_REGISTRY).map(([provider, models]) => [
    provider,
    models.map(({ id, name }) => ({ id, name })),
  ])
);
