import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, HelpCircle, ArrowRight, ShieldAlert, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../context/Store';
import {
  hasConfiguredApiKey,
  isValidGeminiApiKeyFormat,
  refreshServerAiStatus,
  validateGeminiAccess,
  initializeSandboxKey,
} from '../services/geminiService';

/* ── Cortex Logomark ── */
const CortexMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    width={size}
    height={size}
    className={className}
  >
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity={0.45} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

import { cleanErrorMessage } from '../utils/errorUtils';

const getErrorMessage = (error: unknown, fallback: string) => {
  return cleanErrorMessage(error, fallback);
};

const PROVIDER_INFO = {
  gemini: {
    label: 'Gemini API Key',
    link: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy… or AQ.…',
    linkText: 'Get free key'
  },
  openai: {
    label: 'OpenAI API Key',
    link: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
    linkText: 'Get key'
  },
  anthropic: {
    label: 'Anthropic API Key',
    link: 'https://console.anthropic.com/',
    placeholder: 'sk-ant-...',
    linkText: 'Get key'
  }
};

const navigateAfterSetup = (
  navigate: ReturnType<typeof useNavigate>,
  isAuthenticated: boolean,
) => {
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return;
  }
  toast.success('API access configured. Sign in to open your workspace.');
  navigate('/login', { replace: true });
};

const ApiKeySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateByokConfig, updateByokMode, byokConfig, isAuthenticated, isFirstLogin } = useAppStore();

  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>(
    () => (byokConfig?.provider as 'gemini' | 'openai' | 'anthropic') || 'gemini'
  );
  const [apiKey, setApiKey] = useState(() => byokConfig?.apiKey || '');
  const [customEndpoint, setCustomEndpoint] = useState(() => byokConfig?.customEndpoint || '');
  const [preferredModel, setPreferredModel] = useState(() => byokConfig?.preferredModel || '');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Only auto-skip if returning user (not first login) who already configured a BYOK key
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isFirstLogin && byokConfig?.apiKey) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, isAuthenticated, isFirstLogin, byokConfig?.apiKey]);

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API Key');
      return;
    }

    try {
      const keyTrimmed = apiKey.trim();
      if (provider === 'gemini' && !isValidGeminiApiKeyFormat(keyTrimmed)) {
        throw new Error('Invalid Gemini key format. Paste the full key from Google AI Studio or Google Cloud.');
      }
      if (provider === 'openai' && !keyTrimmed.startsWith('sk-')) {
        throw new Error('Invalid key format. OpenAI API keys typically start with "sk-".');
      }
      if (provider === 'anthropic' && !keyTrimmed.startsWith('sk-ant-')) {
        throw new Error('Invalid key format. Anthropic API keys typically start with "sk-ant-".');
      }

      setIsValidating(true);

      if (provider === 'gemini') {
        await validateGeminiAccess(keyTrimmed);
      }

      // Save it under a unified, clean namespace matching the provider
      sessionStorage.setItem(`vidyal_byok_key_${provider}`, keyTrimmed);
      sessionStorage.setItem('vidyal_byok_provider', provider);
      
      // Backwards compatibility for current ModelSelector checks
      if (provider === 'gemini') {
        sessionStorage.setItem('vidyal_sandbox_api_key', keyTrimmed);
      }

      updateByokMode('custom');
      updateByokConfig({
        provider,
        apiKey: keyTrimmed,
        customEndpoint: customEndpoint.trim() || undefined,
        preferredModel: preferredModel.trim() || undefined
      });

      setIsSuccess(true);
      toast.success(`${provider.toUpperCase()} API Key successfully linked and validated!`);
      navigateAfterSetup(navigate, isAuthenticated);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Validation failed. Please verify your API Key.'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleUseDefault = () => {
    const defaultKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (defaultKey) {
      toast.info('Using system-configured default Gemini API key.');
      updateByokConfig({
        provider: 'gemini',
        apiKey: defaultKey
      });
      navigateAfterSetup(navigate, isAuthenticated);
    } else {
      toast.error('No system-default API key is configured. You must enter your own.');
    }
  };

  const handleUseServerKey = async () => {
    setIsValidating(true);
    try {
      const serverReady = await refreshServerAiStatus();
      if (serverReady) {
        await initializeSandboxKey();
        toast.success('Using Gemini API key configured on the backend server.');
        navigateAfterSetup(navigate, isAuthenticated);
        return;
      }
      toast.error('Backend GEMINI_API_KEY is not set. Add it to backend/.env and restart the server.');
    } finally {
      setIsValidating(false);
    }
  };

  const defaultKeyExists = !!import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Panel — Brand ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 flex-shrink-0 relative overflow-hidden">
        {/* Layer 1: Base navy */}
        <div className="absolute inset-0" style={{ background: '#0f0b6b' }} />

        {/* Layer 2: cortex-blue-field.png drifting animation */}
        <div
          className="absolute"
          style={{
            top: '-16%',
            left: '-16%',
            right: '-16%',
            bottom: '-16%',
            backgroundImage: "url('/images/cortex-blue-field.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 44%',
            filter: 'saturate(150%) contrast(120%) brightness(0.76)',
            animation: 'authHeroFieldDrift 6s ease-in-out infinite alternate',
          }}
        />

        {/* Layer 3: Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 36% at 50% 28%, rgba(255,255,255,0.08), transparent 64%),
              linear-gradient(180deg, rgba(15,5,90,0.2) 0%, rgba(5,18,100,0.26) 50%, rgba(2,10,68,0.5) 100%)
            `,
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10 p-12">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <CortexMark size={20} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            Cortex
          </span>
        </div>

        {/* Main statement */}
        <div className="relative z-10 space-y-6 p-12">
          <h1
            className="text-[36px] font-bold leading-[1.12] text-white"
            style={{ letterSpacing: '-0.035em', maxWidth: 320 }}
          >
            Setup Cortex intelligence.
          </h1>
          <p
            className="text-[14.5px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.52)', maxWidth: 340 }}
          >
            Connect your own API key for private, unlimited usage — or just start with the shared system key and upgrade anytime in your Settings.
          </p>
        </div>

        {/* Bottom trust line */}
        <div className="relative z-10 flex items-center gap-2 p-12">
          <ShieldAlert size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Stored locally · Direct secure connection to completions endpoint
          </span>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)' }}
      >
        {/* Back button */}
        {!isFirstLogin && (
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 transition-colors z-10"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        )}

        {/* Ambient glow — top right */}
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, top: '-80px', right: '-80px', background: 'radial-gradient(circle, rgba(78,91,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
        {/* Ambient glow — bottom left */}
        <div className="absolute pointer-events-none" style={{ width: 320, height: 320, bottom: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(136,108,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Form Card */}
        <div
          className="relative z-10 w-full max-w-[400px] rounded-3xl p-8 space-y-6"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(78,91,255,0.08)',
            boxShadow: '0 10px 30px -10px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.02), 0 30px 60px -15px rgba(15,23,42,0.12), 0 0 0 1px rgba(78,91,255,0.02)',
          }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0f0b6b' }}>
              <CortexMark size={17} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
          </div>

          {/* Header */}
          <div className="space-y-1.5 pb-1">
            <h2 className="text-[24px] font-extrabold text-slate-900 leading-tight" style={{ letterSpacing: '-0.035em' }}>
              Connect API Key
            </h2>
            <p className="text-[13px] text-slate-500 font-medium text-justify hyphens-auto">
              Bring your own API key for unlimited private usage, or proceed with our shared system key.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleValidateAndSave} className="space-y-4">
            {/* Provider Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-[#4e5bff] focus:ring-4 focus:ring-[#4e5bff]/10 cursor-pointer transition-all shadow-sm"
                disabled={isValidating || isSuccess}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {PROVIDER_INFO[provider].label}
                </label>
                <a
                  href={PROVIDER_INFO[provider].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-[#4e5bff] hover:text-[#3a44d4] flex items-center gap-1 transition-colors"
                >
                  {PROVIDER_INFO[provider].linkText} <HelpCircle size={10} />
                </a>
              </div>
              <div className="relative flex items-center rounded-xl border border-slate-200 focus-within:border-[#4e5bff] focus-within:ring-4 focus-within:ring-[#4e5bff]/10 transition-all duration-200">
                <span className="absolute left-3.5 text-slate-400"><Key size={15} /></span>
                <input
                  type="password"
                  required
                  placeholder={PROVIDER_INFO[provider].placeholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-12 bg-white pl-10 pr-4 text-xs font-mono font-bold text-slate-850 outline-none rounded-xl"
                  disabled={isValidating || isSuccess}
                />
              </div>
            </div>

            {/* Link Custom Key Button */}
            <button
              type="submit"
              disabled={isValidating || isSuccess || !apiKey.trim()}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #09054a 0%, #0f0b6b 50%, #1e1a8f 100%)',
              }}
            >
              {isValidating ? (
                <><Loader2 size={13} className="animate-spin" /><span>Validating Key...</span></>
              ) : isSuccess ? (
                <><CheckCircle2 size={13} className="text-emerald-400" /><span>Linked Successfully</span></>
              ) : (
                <><span>Link API Key</span><ArrowRight size={13} /></>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">or</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            {/* Use System / Server Key Button — always visible for all new users */}
            <button
              type="button"
              onClick={() => void handleUseServerKey()}
              disabled={isValidating || isSuccess}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[12.5px] font-semibold border transition-all"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#374151',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {isValidating ? (
                <><Loader2 size={13} className="animate-spin" /><span>Checking Server...</span></>
              ) : (
                <><span>⚡ Continue with system key</span></>
              )}
            </button>
            
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10.5px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
              >
                <span>{showAdvanced ? 'Hide advanced settings' : 'Show advanced settings (optional)'}</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-3 pt-2.5 border-t border-slate-100 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Preferred Model</label>
                  <input
                    type="text"
                    placeholder="e.g. gpt-4o-mini"
                    value={preferredModel}
                    onChange={(e) => setPreferredModel(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#4e5bff] transition-all shadow-sm"
                    disabled={isValidating || isSuccess}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custom Endpoint</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#4e5bff] transition-all shadow-sm"
                    disabled={isValidating || isSuccess}
                  />
                </div>
              </div>
            )}
          </form>

          {/* Privacy notice */}
          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
            <ShieldAlert size={14} className="text-[#4e5bff] shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-slate-400 font-medium">
              <strong className="text-slate-500">Privacy:</strong> Keys are saved in local storage and sent directly to endpoints.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes authHeroFieldDrift {
          0%   { transform: translate3d(-3%, -2%, 0) scale(1.05) rotate(-2deg); background-position: center 30%; }
          100% { transform: translate3d( 3%,  2%, 0) scale(1.15) rotate(2deg); background-position: center 70%; }
        }
      `}</style>
    </div>
  );
};

export default ApiKeySetupPage;
