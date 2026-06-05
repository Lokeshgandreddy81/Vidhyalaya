import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { Sparkles, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
      }) => void;
      renderButton: (element: HTMLElement | null, options: Record<string, string | number>) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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

const AuthPage: React.FC = () => {
  const { setAuthenticated, updateUserProfile } = useAppStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id) return;
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 300 }
      );
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error('Error rendering Google SSO button:', err);
    }
  }, [scriptLoaded]);

  const handleGoogleCredentialResponse = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      toast.error('Google account selection cancelled or failed.');
      return;
    }
    setIsLoading(true);
    setLoadingStep('Verifying credentials...');
    try {
      const authResult = await api.googleLogin(response.credential);
      await new Promise(resolve => setTimeout(resolve, 600));
      setLoadingStep('Setting up workspace...');
      localStorage.setItem('vidyal_user_token', authResult.token);
      localStorage.setItem('vidyal_user_id', authResult.userId);
      setAuthenticated(true);
      updateUserProfile(authResult.profile);
      toast.success(`Welcome back, ${authResult.profile.name}`);
      const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      navigate(hasCustomKey ? '/dashboard' : '/api-setup');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Authentication failed. Please try again.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSandboxBypass = () => {
    setIsLoading(true);
    setLoadingStep('Initializing sandbox...');
    setTimeout(() => {
      localStorage.setItem('vidyal_user_id', 'sandbox-scholar');
      setAuthenticated(true);
      updateUserProfile({
        userId: 'sandbox-scholar',
        name: 'Sandbox Scholar',
        email: 'scholar@cortex.ai',
        role: 'Architect',
        joinedAt: new Date().toISOString(),
      });
      toast.success('Practice workspace ready.');
      setIsLoading(false);
      const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      navigate(hasCustomKey ? '/dashboard' : '/api-setup');
    }, 800);
  };

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
            Learn anything. Master it completely.
          </h1>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 340 }}
          >
            Cortex builds personalized learning paths, generates study materials,
            and guides you from goal to mastery — all powered by Gemini AI.
          </p>
        </div>

        {/* Bottom trust line */}
        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Secure · Private · Your data stays yours
          </span>
        </div>
      </div>

      {/* ── Right Panel — Auth ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 relative"
        style={{ background: '#f8fafc' }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        {/* Loading overlay */}
        {isLoading && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-10 h-10 rounded-full border-2 border-[#4e5bff]/20 border-t-[#4e5bff] animate-spin mb-4"
            />
            <p className="text-[14px] font-medium text-slate-700">
              {loadingStep || 'Signing you in...'}
            </p>
          </div>
        )}

        {/* Auth card */}
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
          <div className="space-y-1">
            <h2 className="text-[24px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>
              Sign in to Cortex
            </h2>
            <p className="text-[14px] text-slate-500">
              Continue to your learning workspace.
            </p>
          </div>

          {/* Google button */}
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center min-h-[46px]">
              {scriptLoaded ? (
                <div
                  id="google-signin-btn"
                  className="transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                />
              ) : scriptError ? (
                <div className="flex items-center gap-3 text-red-500 text-[13px] font-medium">
                  <AlertCircle size={18} />
                  <span>Google authentication failed to load. Check your connection.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-[13px]">
                  <RefreshCw size={14} className="animate-spin text-[#4e5bff]" />
                  <span>Loading sign-in…</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Sandbox button */}
            <button
              onClick={handleSandboxBypass}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-all"
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
              <Sparkles size={13} style={{ color: '#4e5bff' }} />
              Continue as sandbox user
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[12px] text-slate-400 text-center leading-relaxed">
            Google SSO saves your work across sessions.
            Sandbox mode is local and resets on logout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
