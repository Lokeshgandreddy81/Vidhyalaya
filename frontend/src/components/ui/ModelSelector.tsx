import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Unlock, Cpu, Check } from 'lucide-react';

/* ── Provider Models Registry ── */
export const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'o1-mini', name: 'o1 Mini' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  openrouter: [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  ],
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

const PROVIDER_DOTS: Record<string, string> = {
  gemini: '#4285F4',
  openai: '#10A37F',
  anthropic: '#D97706',
  groq: '#F97316',
  openrouter: '#8B5CF6',
};

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
    if (provider === 'gemini') {
      const hasEnvKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('vidyal_sandbox_api_key'));
      if (hasEnvKey) return true;
    }
    if (byokConfig && byokConfig.provider === provider && byokConfig.apiKey?.trim()) {
      return true;
    }
    try {
      const cacheRaw = localStorage.getItem('vidyal_byok_keys_cache');
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        if (cache[provider]?.trim()) return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const currentValue = byokMode === 'auto' ? 'auto' : `${byokConfig?.provider}/${byokConfig?.preferredModel || ''}`;

  const getDisplayLabel = useCallback((): string => {
    if (byokMode === 'auto') return 'Auto';
    if (!byokConfig) return 'Auto';
    if (byokConfig.preferredModel?.trim()) {
      const found = (PROVIDER_MODELS[byokConfig.provider] || []).find(m => m.id === byokConfig.preferredModel);
      if (found) return found.name;
      return byokConfig.preferredModel.trim();
    }
    const fallbacks: Record<string, string> = {
      gemini: 'Gemini 2.5 Flash', openai: 'GPT-4o Mini', anthropic: 'Claude 3.5 Sonnet',
      groq: 'Llama 3.3 70B', openrouter: 'OpenRouter',
    };
    return fallbacks[byokConfig.provider] || 'Custom';
  }, [byokMode, byokConfig]);

  const handleSelect = (val: string) => {
    onSelect(val);
    setOpen(false);
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
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PROVIDER_DOTS[byokConfig?.provider || 'gemini'] }} />
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
            } z-[100] w-[240px] rounded-xl border overflow-hidden ${panelStyles[variant]}`}
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
                <div className={`text-[9px] ${variant === 'light' ? 'text-slate-400' : 'text-white/30'}`}>Gemini 2.5 Flash · Default</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentValue === 'auto' && <Check size={12} strokeWidth={3} className="text-blue-400" />}
                <Unlock size={10} strokeWidth={2} className={variant === 'light' ? 'text-slate-400' : 'text-white/25'} />
              </div>
            </button>

            {/* Separator */}
            <div className={`mx-3 ${variant === 'light' ? 'border-t border-slate-100' : 'border-t border-white/[0.05]'}`} />

            {/* Provider Groups */}
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar py-1">
              {Object.entries(PROVIDER_MODELS).map(([provider, models]) => (
                <div key={provider}>
                  {/* Group Label */}
                  <div className={`flex items-center gap-2 px-3.5 pt-2.5 pb-1 ${
                    variant === 'light' ? 'text-slate-400' : 'text-white/25'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PROVIDER_DOTS[provider] }} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{PROVIDER_LABELS[provider]}</span>
                  </div>

                  {/* Model Options */}
                  {models.map(m => {
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
                        <div className="flex-1 min-w-0 pl-5">
                          <span className={`text-[10.5px] font-semibold ${
                            variant === 'light'
                              ? isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-800'
                              : isActive ? 'text-blue-400' : 'text-white/55 group-hover:text-white/80'
                          }`}>
                            {m.name}
                            {provider === 'openrouter' && <span className="text-[8px] opacity-50 ml-1">OR</span>}
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
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;
