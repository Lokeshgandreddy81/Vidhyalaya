import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { Sparkles, GraduationCap, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

const AuthPage: React.FC = () => {
  const { setAuthenticated, updateUserProfile } = useAppStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  // Dynamically load official Google Identity Services client script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ [AUTH] Google Identity Services script loaded successfully.');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ [AUTH] Failed to load Google Identity Services script.');
      setScriptError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script if unmounted before loading completes
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize and Render the Google Identity Prompt / Button once script is loaded
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

      // Render the official Google Sign-In button inside our target container
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { 
          type: 'standard',
          theme: 'outline', 
          size: 'large', 
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320 
        }
      );

      // Optionally present the secure One-Tap selector floating prompt
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error('Error rendering Google SSO button:', err);
    }
  }, [scriptLoaded]);

  // ZERO-TRUST CRYPTOGRAPHIC GOOGLE HANDSHAKE CALLBACK
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response.credential) {
      toast.error('Google account selection cancelled or failed.');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Securing identity credentials...');

    try {
      // 1. Send ID Token cryptographically to backend for signature verification & provisioning
      setLoadingStep('Verifying secure digital handshake...');
      const authResult = await api.googleLogin(response.credential);

      // 2. Delay slightly for premium FAANG transition feel
      await new Promise((resolve) => setTimeout(resolve, 800));

      setLoadingStep('Initializing scholastic profile...');
      
      // 3. Save secure session state in memory & storage
      localStorage.setItem('vidyal_user_token', authResult.token);
      localStorage.setItem('vidyal_user_id', authResult.userId);
      setAuthenticated(true);
      updateUserProfile(authResult.profile);

      toast.success(`Welcome to Cortex, ${authResult.profile.name}!`);

      // 4. Check custom API key configuration and route accordingly
      const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      if (!hasCustomKey) {
        navigate('/api-setup');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('SSO handshaking failure:', err);
      toast.error(err.message || 'Single Sign-On authentication rejected by backend.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // DEVELOPER BYPASS FAILSafe (Dev Mode Sandbox)
  const handleSandboxBypass = () => {
    setIsLoading(true);
    setLoadingStep('Initializing Offline Sandbox Session...');
    
    setTimeout(() => {
      localStorage.setItem('vidyal_user_id', 'sandbox-scholar');
      setAuthenticated(true);
      updateUserProfile({
        userId: 'sandbox-scholar',
        name: 'Sandbox Scholar',
        email: 'scholar@cortex.ai',
        role: 'Architect',
        xp: 120,
        level: 2,
        streakDays: 4,
        joinedAt: new Date().toISOString(),
      });
      
      toast.success('Access initialized in Offline Sandbox Mode.');
      setIsLoading(false);
      
      const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      if (!hasCustomKey) {
        navigate('/api-setup');
      } else {
        navigate('/dashboard');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-800 flex items-center justify-center relative overflow-hidden font-sans p-4">
      {/* Top Left Navigation Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 border border-slate-200 hover:bg-white hover:border-slate-300 text-slate-500 hover:text-slate-900 text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      {/* Dynamic Aurora Ambient Background (Light Theme Luminous) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.06)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.05)_0%,transparent_50%)]" />
        <div className="absolute top-[12%] left-[10%] w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[18%] right-[12%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* GLASSMORPHIC LOADER INTERACTIVE OVERLAY */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-50/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative flex flex-col items-center space-y-6">
            {/* Spinning Halo Orb */}
            <div className="w-20 h-20 rounded-full border-2 border-indigo-600/10 border-t-indigo-600 animate-spin flex items-center justify-center shadow-xl shadow-indigo-500/5">
              <RefreshCw size={24} className="text-indigo-600 animate-pulse" />
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-950 animate-pulse">
                {loadingStep || 'Authorizing Session...'}
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Cortex Identity Gateway
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-[#4e5bff] to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <GraduationCap size={28} className="text-white relative z-10 transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div className="space-y-1 mt-4">
            <h1 className="text-2xl font-black uppercase tracking-[0.25em] bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 bg-clip-text text-transparent leading-none">
              Cortex
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-indigo-600 mt-1 leading-none">
              Academy
            </p>
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-slate-400 mt-1 block">
              Autonomous Learning Ecosystem
            </p>
          </div>
        </div>

        {/* Enterprise OAuth Card (White Glassmorphic) */}
        <div className="bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[32px] p-8 shadow-[0_30px_100px_rgba(79,70,229,0.06)] relative overflow-hidden flex flex-col items-center space-y-8">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />

          <div className="text-center space-y-2">
            <h2 className="text-base font-black uppercase tracking-widest text-indigo-950">
              Enterprise Single Sign-On
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed max-w-[280px]">
              Access the adaptive study dashboard using your institutional or verified personal Google Account.
            </p>
          </div>

          {/* Secure Official Google Button Target Container */}
          <div className="w-full flex flex-col items-center justify-center py-2 relative min-h-[46px]">
            {scriptLoaded ? (
              <div 
                id="google-signin-btn" 
                className="transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-slate-200/50 rounded-full"
              />
            ) : scriptError ? (
              <div className="flex flex-col items-center space-y-3 text-rose-500 text-xs font-bold text-center">
                <AlertCircle size={28} />
                <span>Google authentication services failed to load.<br />Check your network connection.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold animate-pulse">
                <RefreshCw size={14} className="animate-spin text-indigo-500" />
                <span>Readying identity prompt...</span>
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-center gap-3">
            <div className="h-px bg-slate-200/80 flex-1" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">or</span>
            <div className="h-px bg-slate-200/80 flex-1" />
          </div>

          {/* Offline Sandbox Fallback Button */}
          <button
            onClick={handleSandboxBypass}
            className="text-[9.5px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-colors duration-200 flex items-center gap-1.5 px-4 py-2 bg-indigo-50/30 rounded-full border border-indigo-100"
          >
            <Sparkles size={11} />
            Enter Sandbox Mode
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-center text-[10px] font-bold text-slate-400">
          <ShieldCheck size={14} className="text-indigo-500/40" />
          <span>Cortex secure context — zero-trust Google SSO verification.</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
