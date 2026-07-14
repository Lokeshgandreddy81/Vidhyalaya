import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Unlock, Cpu, Check, Zap, ShieldCheck, Archive } from 'lucide-react';
import {
  MODEL_REGISTRY,
  PROVIDER_META,
  PROVIDER_MODELS,
  getModelsForProvider,
  getModelDisplayName,
  type ProviderId,
  type ModelTier,
  type TierIconId,
} from '../../config/modelRegistry';

/* ── Re-export for backward compatibility ── */
export { PROVIDER_MODELS };

interface ModelSelectorProps {
  byokMode: 'auto' | 'custom';
  byokConfig: { provider: string; apiKey: string; preferredModel?: string; customEndpoint?: string } | null;
  onSelect: (value: string) => void;
  variant?: 'light' | 'dark' | 'zen';
  compact?: boolean;
  dropdownPosition?: 'top' | 'bottom';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  byokMode,
  byokConfig,
  onSelect,
  variant = 'dark',
  compact = false,
  dropdownPosition = 'bottom',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const isProviderKeyConfigured = (provider: string): boolean => {
    // Check both localStorage (Settings page) and sessionStorage (ApiKeySetupPage/AuthPage)
    const localKey = localStorage.getItem(`vidyal_byok_key_${provider}`);
    const sessionKey = sessionStorage.getItem(`vidyal_byok_key_${provider}`);
    
    if (provider === 'gemini') {
      return Boolean(import.meta.env.VITE_GEMINI_API_KEY || localKey?.trim() || sessionKey?.trim());
    }
    return Boolean(localKey?.trim() || sessionKey?.trim());
  };

  const currentValue = byokMode === 'auto' ? 'auto' : `${byokConfig?.provider}/${byokConfig?.preferredModel || ''}`;

  const getDisplayLabel = useCallback((): string => {
    if (byokMode === 'auto') return 'Auto';
    if (!byokConfig) return 'Auto';
    if (byokConfig.preferredModel?.trim()) {
      const displayName = getModelDisplayName(byokConfig.provider as ProviderId, byokConfig.preferredModel);
      return displayName;
    }
    const fallbacks: Record<string, string> = {
      gemini: 'Gemini 3.5 Flash', openai: 'GPT-5.5', anthropic: 'Claude Sonnet 4.6',
      groq: 'DeepSeek R1 Llama', openrouter: 'OpenRouter',
    };
    return fallbacks[byokConfig.provider] || 'Custom';
  }, [byokMode, byokConfig]);

  const handleSelect = (val: string) => {
    onSelect(val);
    setOpen(false);
  };

  // ── Tier accent colors for subtle visual hierarchy ──
  const tierAccent: Record<ModelTier, string> = {
    Frontier: variant === 'light' ? 'text-purple-500/70' : 'text-purple-400/50',
    Stable:   variant === 'light' ? 'text-slate-400/70'  : 'text-white/25',
    Legacy:   variant === 'light' ? 'text-slate-300/60'  : 'text-white/15',
  };

  // Style variants
  const triggerStyles = {
    light: `bg-white/90 backdrop-blur-sm border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm`,
    dark: `bg-white/[0.04] backdrop-blur-sm border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white`,
    zen: `bg-white/[0.04] backdrop-blur-sm border-white/[0.06] text-slate-300 hover:bg-white/[0.08] hover:border-white/[0.12]`,
  };

  const panelStyles = {
    light: `bg-white border-slate-200 shadow-xl shadow-slate-200/50`,
    dark: `bg-[#0f1117] border-white/[0.08] shadow-2xl shadow-black/50`,
    zen: `bg-[#0c0e14] border-white/[0.06] shadow-2xl shadow-black/60`,
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Trigger Pill */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 ${compact ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]'} rounded-lg border font-bold tracking-wide uppercase cursor-pointer transition-all duration-200 ${triggerStyles[variant]}`}
      >
        {byokMode === 'auto' ? (
          <Unlock size={compact ? 9 : 10} strokeWidth={2.5} className="opacity-50" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PROVIDER_META[byokConfig?.provider as ProviderId]?.dot || '#4285F4' }} />
        )}
        <span className="truncate max-w-[120px]">{getDisplayLabel()}</span>
        <ChevronDown size={compact ? 10 : 11} strokeWidth={2.5} className={`opacity-40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: dropdownPosition === 'top' ? 4 : -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropdownPosition === 'top' ? 4 : -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${
              dropdownPosition === 'top' ? 'bottom-full mb-1.5 left-0' : 'right-0 mt-1.5'
            } z-[100] w-[280px] rounded-xl border overflow-hidden ${panelStyles[variant]}`}
          >
            {/* Auto Option */}
            <button
              onClick={() => handleSelect('auto')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all duration-150 ${
                variant === 'light'
                  ? `hover:bg-slate-50 ${currentValue === 'auto' ? 'bg-blue-50/60' : ''}`
                  : `hover:bg-white/[0.05] ${currentValue === 'auto' ? 'bg-white/[0.06]' : ''}`
              }`}
            >
              <div className={`flex items-center justify-center w-5 h-5 rounded-md ${
                variant === 'light' ? 'bg-slate-100' : 'bg-white/[0.06]'
              }`}>
                <Cpu size={11} strokeWidth={2} className={variant === 'light' ? 'text-slate-500' : 'text-white/40'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-bold ${variant === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                  Auto (System Choice)
                </div>
                <div className={`text-[9px] ${variant === 'light' ? 'text-slate-400' : 'text-white/30'}`}>Gemini 3.5 Flash · Default</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentValue === 'auto' && <Check size={12} strokeWidth={3} className="text-blue-400" />}
                <Unlock size={10} strokeWidth={2} className={variant === 'light' ? 'text-slate-400' : 'text-white/25'} />
              </div>
            </button>

            {/* Separator */}
            <div className={`mx-3 ${variant === 'light' ? 'border-t border-slate-100' : 'border-t border-white/[0.05]'}`} />

            {/* Provider Groups with Tier Sub-Sections */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar py-1">
              {(Object.keys(MODEL_REGISTRY) as ProviderId[]).map((provider) => {
                const providerMeta = PROVIDER_META[provider];
                const providerModels = getModelsForProvider(provider);

                return (
                  <div key={provider}>
                    {/* Provider Group Label */}
                    <div className={`flex items-center gap-2 px-3.5 pt-3 pb-1 ${
                      variant === 'light' ? 'text-slate-400' : 'text-white/25'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: providerMeta.dot }} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{providerMeta.label}</span>
                      {!isProviderKeyConfigured(provider) && (
                        <Lock size={8} strokeWidth={2.5} className="text-red-400/50 ml-auto" />
                      )}
                    </div>

                    {/* Model Options */}
                    <div>
                      {providerModels.map(m => {
                        const val = `${provider}/${m.id}`;
                        const isActive = currentValue === val;
                        return (
                          <button
                            key={val}
                            onClick={() => handleSelect(val)}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-left transition-all duration-150 group ${
                              variant === 'light'
                                ? `hover:bg-slate-50 ${isActive ? 'bg-blue-50/50' : ''}`
                                : `hover:bg-white/[0.04] ${isActive ? 'bg-white/[0.05]' : ''}`
                            }`}
                          >
                            <div className="flex-1 min-w-0 pl-6">
                              <span className={`text-[10.5px] font-semibold ${
                                variant === 'light'
                                  ? isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-800'
                                  : isActive ? 'text-blue-400' : 'text-white/55 group-hover:text-white/80'
                              }`}>
                                {m.name}
                                {m.default && (
                                  <span className={`ml-1.5 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                                    variant === 'light'
                                      ? 'bg-blue-100/60 text-blue-500/70'
                                      : 'bg-blue-500/10 text-blue-400/60'
                                  }`}>Default</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isActive && <Check size={11} strokeWidth={3} className="text-blue-400" />}
                              {isProviderKeyConfigured(provider) ? (
                                <Unlock size={9} strokeWidth={2} className={`${
                                  variant === 'light' ? 'text-slate-300' : 'text-white/15'
                                } group-hover:text-blue-400/40 transition-colors`} />
                              ) : (
                                <Lock size={9} strokeWidth={2} className="text-red-400/60 group-hover:text-red-400 transition-colors" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Provider Separator */}
                    <div className={`mx-3 my-0.5 ${variant === 'light' ? 'border-t border-slate-50' : 'border-t border-white/[0.03]'}`} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;
