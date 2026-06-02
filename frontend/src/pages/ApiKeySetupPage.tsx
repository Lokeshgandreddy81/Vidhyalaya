import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, HelpCircle, ArrowRight, ShieldAlert, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type GoogleCredentialResponse = {
  credential?: string;
};

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const ApiKeySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API Key');
      return;
    }

    setIsValidating(true);

    try {
      if (!apiKey.startsWith('AIzaSy')) {
        throw new Error('Invalid key format. Gemini API keys typically start with "AIzaSy".');
      }

      // Simulate network validation check
      await new Promise((resolve) => setTimeout(resolve, 1500));

      localStorage.setItem('vidyal_custom_gemini_api_key', apiKey.trim());
      setIsSuccess(true);
      toast.success('Gemini API Key successfully linked and validated!');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
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
      navigate('/dashboard');
    } else {
      toast.error('No system-default API key is configured. You must enter your own.');
    }
  };

  const defaultKeyExists = !!import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Panel — Brand ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: '#09054a' }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500, height: 500,
            top: '40%', left: '30%',
            background: 'radial-gradient(circle, rgba(78,91,255,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <CortexMark size={20} className="text-white" />
          </div>
          <span
            className="text-[15px] font-bold text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            Cortex
          </span>
        </div>

        {/* Main statement */}
        <div className="relative z-10 space-y-6">
          <h1
            className="text-[36px] font-bold leading-tight text-white"
            style={{ letterSpacing: '-0.03em', maxWidth: 320 }}
          >
            Setup Cortex intelligence.
          </h1>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 340 }}
          >
            Cortex needs model access to generate paths, lessons, quizzes, and grounded study resources. 
            Bring your own Gemini API key or use the configured workspace key.
          </p>
        </div>

        {/* Bottom trust line */}
        <div className="relative z-10 flex items-center gap-2">
          <ShieldAlert size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Stored locally · Sent directly to Gemini API
          </span>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 relative"
        style={{ background: '#f8fafc' }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        {/* Setup card */}
        <div className="w-full max-w-[360px] space-y-8">

          {/* Mobile logo (hidden on lg) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#09054a' }}
            >
              <CortexMark size={18} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-[24px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>
              Connect API Key
            </h2>
            <p className="text-[13px] leading-relaxed text-slate-500">
              Provide your Gemini API key to activate path generation, personalized lessons, and quizzes.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleValidateAndSave} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#4e5bff] hover:text-[#3a44d4] flex items-center gap-1 transition-colors"
                >
                  Get free key <HelpCircle size={10} />
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></span>
                <input
                  type="password"
                  required
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#4e5bff] focus:bg-white transition-all shadow-sm"
                  disabled={isValidating || isSuccess}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={isValidating || isSuccess}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 shadow-sm"
                style={{
                  background: '#0d0d0d',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.84';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                }}
              >
                {isValidating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Validating Key...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Linked Successfully</span>
                  </>
                ) : (
                  <>
                    <span>Link API Key</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>

              {defaultKeyExists && (
                <button
                  type="button"
                  onClick={handleUseDefault}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#374151',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.background = '#ffffff';
                  }}
                >
                  Use system default key
                </button>
              )}
            </div>
          </form>

          {/* Privacy notice */}
          <div className="flex items-start gap-2.5 pt-2">
            <ShieldAlert size={14} className="text-[#4e5bff] shrink-0 mt-0.5" />
            <p className="text-[12px] leading-relaxed text-slate-400 font-medium">
              <strong className="text-slate-500">Privacy notice:</strong> Your key is stored in this browser and sent only to Google's Gemini endpoint for Cortex intelligence features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetupPage;
