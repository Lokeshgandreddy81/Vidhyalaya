import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  Eye, EyeOff, ArrowRight, ArrowLeft,
  AlertCircle, Mail, Lock, User,
} from 'lucide-react';
import { api, SERVER_BASE_URL } from '../services/api';
import { UserProfile } from '../types';
import { isValidGeminiApiKeyFormat, validateGeminiAccess, initializeSandboxKey } from '../services/geminiService';
import { toast } from 'sonner';

/* ─── Types ─── */
type GoogleCredentialResponse = { credential?: string };
type GoogleIdentityServices = {
  accounts: { id: {
    initialize: (c: { client_id: string; callback: (r: GoogleCredentialResponse) => void; auto_select: boolean; cancel_on_tap_outside: boolean }) => void;
    renderButton: (el: HTMLElement | null, opts: Record<string, string | number>) => void;
    prompt: () => void;
  }};
};
declare global { interface Window { google?: GoogleIdentityServices; } }

const getErrorMessage = (e: unknown, fb: string) => e instanceof Error && e.message ? e.message : fb;

/* ─── Cortex SVG Mark ─── */
const CortexMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity={0.45} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

/* ─── Password strength ─── */
const getPasswordStrength = (pw: string) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' };
  return { score, label: 'Strong', color: '#10b981' };
};

/* ─── Input field ─── */
const AuthInput: React.FC<{
  type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon?: React.ReactNode;
  rightElement?: React.ReactNode; error?: string; disabled?: boolean;
  autoComplete?: string;
}> = ({ type = 'text', placeholder, value, onChange, icon, rightElement, error, disabled, autoComplete }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="space-y-1.5 text-left">
      <div 
        className="relative flex items-center rounded-lg transition-all duration-200"
        style={{ 
          background: '#ffffff', 
          border: `1px solid ${error ? '#ef4444' : isFocused ? '#0f0b6b' : '#c2c8d0'}`, 
          boxShadow: error 
            ? '0 0 0 3px rgba(239,68,68,0.1)' 
            : isFocused 
              ? '0 0 0 3px rgba(15,23,42,0.06)' 
              : 'none' 
        }}
      >
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full h-12 bg-transparent px-4 text-[14.5px] font-medium text-slate-800 outline-none placeholder-slate-400 rounded-lg"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        {rightElement && <span className="absolute right-3.5 flex items-center">{rightElement}</span>}
      </div>
      {error && <p className="text-[11px] text-red-500 font-semibold pl-1">{error}</p>}
    </div>
  );
};

/* ─── Main AuthPage ─── */
const AuthPage: React.FC = () => {
  const { setAuthenticated, updateUserProfile, isAuthenticated, setIsFirstLogin, updateByokConfig, updateByokMode } = useAppStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Email Verification States
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devCode, setDevCode] = useState('');
  const [devUrl, setDevUrl] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Google SSO
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nameErr, setNameErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  // Optional API Key Setup on Signup
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq'>('gemini');
  const [showApiKeyField, setShowApiKeyField] = useState(false);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Load Google GSI script
  useEffect(() => {
    if (window.google?.accounts?.id) { setGoogleReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setGoogleBlocked(true);
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // Render Google button
  useEffect(() => {
    if (!googleReady || !window.google?.accounts?.id || googleBlocked) return;
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your-google-client-id') {
        setGoogleBlocked(true);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard', theme: 'outline', size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular', logo_alignment: 'left', width: 350,
      });
    } catch {
      setGoogleBlocked(true);
    }
  }, [googleReady, mode, googleBlocked]);

  /* ── Post-auth: persist + route ── */
  const finalizeAuth = (result: { token: string; userId: string; isFirstLogin: boolean; profile: UserProfile }) => {
    localStorage.setItem('vidyal_user_token', result.token);
    localStorage.setItem('vidyal_user_id', result.userId);
    setAuthenticated(true);
    updateUserProfile(result.profile);
    setIsFirstLogin(result.isFirstLogin ?? true);

    // Save BYOK configuration if provided during signup!
    if (mode === 'signup' && apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      
      // Save to provider cache
      try {
        const cachedKeysRaw = localStorage.getItem('vidyal_byok_keys_cache') || '{}';
        const cachedKeys = JSON.parse(cachedKeysRaw);
        cachedKeys[apiProvider] = trimmedKey;
        localStorage.setItem('vidyal_byok_keys_cache', JSON.stringify(cachedKeys));
      } catch (e) {
        console.warn('Failed to cache BYOK key:', e);
      }

      // Update BYOK Config in store
      updateByokConfig({
        provider: apiProvider,
        apiKey: trimmedKey,
      });
      updateByokMode('custom');
    } else {
      // By default use system key (auto mode)
      updateByokMode('auto');
    }

    navigate(result.isFirstLogin ? '/onboarding' : '/dashboard', { replace: true });
  };

  /* ── Google SSO handler ── */
  const handleGoogleCredentialResponse = async (response: GoogleCredentialResponse) => {
    if (!response.credential) return;
    setIsLoading(true);
    setLoadingStep('Verifying with Google…');
    setGlobalError('');
    try {
      const result = await api.googleLogin(response.credential);
      setLoadingStep('Setting up workspace…');
      await new Promise(r => setTimeout(r, 400));
      finalizeAuth(result);
    } catch (err) {
      setGlobalError(getErrorMessage(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  /* ── Form validation ── */
  const validateForm = () => {
    let valid = true;
    setNameErr(''); setEmailErr(''); setPasswordErr(''); setConfirmErr(''); setGlobalError('');
    if (mode === 'signup' && name.trim().length < 2) { setNameErr('Name must be at least 2 characters.'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Enter a valid email address.'); valid = false; }
    if (password.length < 8) { setPasswordErr('Password must be at least 8 characters.'); valid = false; }
    if (mode === 'signup' && password !== confirmPassword) { setConfirmErr('Passwords do not match.'); valid = false; }

    // Optional API key format validation
    if (mode === 'signup' && apiKey.trim()) {
      const keyTrimmed = apiKey.trim();
      if (apiProvider === 'gemini' && !isValidGeminiApiKeyFormat(keyTrimmed)) {
        setGlobalError('Invalid Gemini key format. Paste the full key from Google AI Studio.');
        valid = false;
      }
      if (apiProvider === 'openai' && !keyTrimmed.startsWith('sk-')) {
        setGlobalError('Invalid OpenAI key format. Typically starts with "sk-".');
        valid = false;
      }
      if (apiProvider === 'anthropic' && !keyTrimmed.startsWith('sk-ant-')) {
        setGlobalError('Invalid Anthropic key format. Typically starts with "sk-ant-".');
        valid = false;
      }
      if (apiProvider === 'groq' && !keyTrimmed.startsWith('gsk_')) {
        setGlobalError('Invalid Groq key format. Typically starts with "gsk_".');
        valid = false;
      }
    }

    return valid;
  };

  /* ── Email/Password submit ── */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setGlobalError('');
    try {
      // If a Gemini key is provided at signup, validate it first
      if (mode === 'signup' && apiKey.trim() && apiProvider === 'gemini') {
        setLoadingStep('Validating API key…');
        await validateGeminiAccess(apiKey.trim());
      }

      setLoadingStep(mode === 'signup' ? 'Creating your account…' : 'Signing you in…');
      const result = mode === 'signup'
        ? await api.signup(name.trim(), email.trim(), password)
        : await api.emailLogin(email.trim(), password);

      if (result.requiresVerification) {
        setVerificationEmail(result.email || email.trim());
        if (result.devCode) {
          setDevCode(result.devCode);
        }
        if (result.devUrl) {
          setDevUrl(result.devUrl);
        }
        setShowVerificationScreen(true);
        setIsLoading(false);
        setLoadingStep('');
        return;
      }

      setLoadingStep('Preparing workspace…');
      await new Promise(r => setTimeout(r, 300));
      finalizeAuth(result as any);
    } catch (err) {
      setGlobalError(getErrorMessage(err, mode === 'signup' ? 'Signup failed.' : 'Sign in failed.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  /* ── Email Verification submit ── */
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setGlobalError('Please enter a 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    setGlobalError('');
    setLoadingStep('Verifying your code…');
    try {
      const result = await api.verifyEmail(verificationEmail, verificationCode.trim());
      setLoadingStep('Preparing workspace…');
      await new Promise(r => setTimeout(r, 300));
      finalizeAuth(result);
    } catch (err) {
      setGlobalError(getErrorMessage(err, 'Verification failed. Please check the code.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  /* ── Resend Verification Code ── */
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setGlobalError('');
    setLoadingStep(verificationEmail.endsWith('@cortex.sandbox') ? 'Resending code…' : 'Resending link…');
    try {
      const result = await api.resendVerificationCode(verificationEmail);
      if (result.devCode) {
        setDevCode(result.devCode);
      }
      if (result.devUrl) {
        setDevUrl(result.devUrl);
      }
      setResendCooldown(60);
      toast.success(verificationEmail.endsWith('@cortex.sandbox') ? 'A new verification code has been sent.' : 'A new verification link has been sent to your email.');
    } catch (err) {
      setGlobalError(getErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  /* ── Back to Login from Verification ── */
  const handleBackToLogin = () => {
    setShowVerificationScreen(false);
    setVerificationCode('');
    setDevCode('');
    setDevUrl('');
    setGlobalError('');
    setMode('signin');
  };

  /* ── Dev sandbox ── */
  const handleSandboxBypass = async () => {
    setIsLoading(true);
    setGlobalError('');
    setLoadingStep('Initializing sandbox session…');
    try {
      const result = await api.sandboxRequest();
      if (result.requiresVerification) {
        setVerificationEmail(result.email);
        setDevCode(result.devCode);
        setShowVerificationScreen(true);
      } else {
        throw new Error('Sandbox request failed to require verification.');
      }
    } catch (err) {
      setGlobalError(getErrorMessage(err, 'Failed to initialize sandbox session.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setGlobalError(''); setNameErr(''); setEmailErr(''); setPasswordErr(''); setConfirmErr('');
    setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
  };

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════
          LEFT PANEL — Exact Landing Page Aurora
          ══════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 flex-shrink-0 relative overflow-hidden">

      {/* ─── Layer 1: Base navy (exact .hero-shell background) ─── */}
        <div className="absolute inset-0" style={{ background: '#0f0b6b' }} />

        {/* ─── Layer 2: cortex-blue-field.png with heroFieldDrift (exact landing page) ─── */}
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

        {/* ─── Layer 3: Vignette overlay (exact .hero-shell::after) ─── */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 36% at 50% 28%, rgba(255,255,255,0.08), transparent 64%),
              linear-gradient(180deg, rgba(15,5,90,0.2) 0%, rgba(5,18,100,0.26) 50%, rgba(2,10,68,0.5) 100%)
            `,
          }}
        />

        {/* Content on top of aurora */}
        <div className="relative z-10 p-12 flex flex-col justify-between h-full">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <CortexMark size={20} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>Cortex</span>
          </div>

          {/* Hero copy — Google UX writing standard */}
          <div className="space-y-10">
            <div className="space-y-6">
              {/* Eyebrow */}
              <p className="text-[12px] font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(156,138,255,0.95)' }}>
                Adaptive Learning Engine
              </p>

              {/* Headline — direct, confident, no fluff */}
              <h1
                className="font-bold text-white leading-[1.12]"
                style={{ fontSize: 'clamp(34px, 3.2vw, 52px)', letterSpacing: '-0.04em' }}
              >
                Learn anything.<br />
                Master it<br />
                completely.
              </h1>

              {/* Body — text-justify for rigorous academic readability */}
              <p className="text-[14.5px] leading-[1.7] font-normal text-justify hyphens-auto" style={{ color: 'rgba(255,255,255,0.64)', maxWidth: 360 }}>
                Cortex builds your personal curriculum, generates study material, and guides you from curious to capable using your preferred AI model.
              </p>
            </div>

            {/* Feature list — glass checkmark pills */}
            <ul className="space-y-4">
              {[
                'Personalized paths from any goal',
                'SARA — your AI mentor, always on',
                'Track mastery, not just progress',
              ].map(feat => (
                <li key={feat} className="flex items-center gap-3.5 text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.76)' }}>
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" className="w-2.5 h-2.5 text-white" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom trust line */}
          <p className="text-[11.5px] font-medium" style={{ color: 'rgba(255,255,255,0.24)' }}>
            Secure · Private · Zero ads
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Premium Auth Form
          ══════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)' }}
      >
        {/* Back to home */}
        <button onClick={() => navigate('/')} className="absolute top-6 left-6 flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 transition-colors z-10">
          <ArrowLeft size={14} /> Home
        </button>

        {/* Ambient glow — top right */}
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, top: '-80px', right: '-80px', background: 'radial-gradient(circle, rgba(78,91,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
        {/* Ambient glow — bottom left */}
        <div className="absolute pointer-events-none" style={{ width: 320, height: 320, bottom: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(136,108,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(238,245,255,0.92)', backdropFilter: 'blur(6px)' }}>
            <div className="w-10 h-10 rounded-full border-2 border-[#4e5bff]/20 border-t-[#4e5bff] animate-spin mb-4" />
            <p className="text-[13.5px] font-semibold text-slate-700">{loadingStep || 'Please wait…'}</p>
          </div>
        )}

        {/* ── Form Card ── */}
        <div
          className="relative z-10 w-full max-w-[450px] rounded-[24px] p-12 space-y-8"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 24px 64px -12px rgba(15,23,42,0.08), 0 8px 16px -6px rgba(15,23,42,0.04), 0 0 0 1px rgba(78,91,255,0.02)',
          }}
        >
          {showVerificationScreen ? (
            <div className="space-y-5">
              <div className="space-y-1.5 pb-1">
                <h2 className="text-[24px] font-bold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>
                  {verificationEmail.endsWith('@cortex.sandbox') ? 'Verify Sandbox Access' : 'Verify your email'}
                </h2>
                <p className="text-[13px] leading-relaxed text-slate-400 font-medium">
                  {verificationEmail.endsWith('@cortex.sandbox') ? (
                    'Enter the 6-digit sandbox access code displayed below to initialize your temporary workspace.'
                  ) : (
                    <>
                      We sent a verification link to <strong className="text-slate-600 font-semibold">{verificationEmail}</strong>. Click the link inside the email to activate your account.
                    </>
                  )}
                </p>
              </div>

              {globalError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', color: '#dc2626' }}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{globalError}</span>
                </div>
              )}

              {/* Sandbox code bypass */}
              {verificationEmail.endsWith('@cortex.sandbox') && devCode && (
                <div className="flex flex-col gap-1 px-3.5 py-3 rounded-2xl text-[12px] font-medium"
                  style={{ background: 'rgba(78,91,255,0.06)', border: '1px solid rgba(78,91,255,0.15)', color: '#3b44d4' }}>
                  <span className="font-bold text-slate-800">
                    🛠️ Sandbox OTP Access Code
                  </span>
                  <span className="text-slate-500 leading-normal font-medium text-justify hyphens-auto">
                    Use this verification code to enter the sandbox: <strong className="text-indigo-600 font-extrabold text-[13.5px] font-mono tracking-wide">{devCode}</strong>
                  </span>
                </div>
              )}

              {/* Dev Mode Bypass for standard users */}
              {!verificationEmail.endsWith('@cortex.sandbox') && devUrl && (
                <div className="flex flex-col gap-2 px-3.5 py-3 rounded-2xl text-[12px] font-medium"
                  style={{ background: 'rgba(78,91,255,0.06)', border: '1px solid rgba(78,91,255,0.15)', color: '#3b44d4' }}>
                  <span className="font-bold text-slate-800">
                    🛠️ Dev Mode Magic Link Bypass
                  </span>
                  <p className="text-slate-500 leading-normal font-medium text-justify hyphens-auto m-0">
                    Real email delivery is disabled because SMTP/Resend API is not configured. Click below to verify directly:
                  </p>
                  <a
                    href={devUrl}
                    className="w-full h-10 mt-1 flex items-center justify-center rounded-lg text-[12px] font-bold text-white transition-all duration-200 shadow-sm hover:bg-[#1e1a8f] active:scale-[0.99] text-center no-underline"
                    style={{ background: '#0f0b6b' }}
                  >
                    Verify Directly (Bypass)
                  </a>
                </div>
              )}

              {verificationEmail.endsWith('@cortex.sandbox') ? (
                <form onSubmit={handleVerifySubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={verificationCode}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(val);
                        setGlobalError('');
                      }}
                      className="w-full h-12 text-center text-xl font-bold font-mono tracking-[0.25em] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0f0b6b] focus:bg-white transition-all shadow-inner"
                      style={{ letterSpacing: '0.3em' }}
                      disabled={isLoading}
                      autoComplete="one-time-code"
                    />
                  </div>

                  <button type="submit" disabled={isLoading || verificationCode.length !== 6}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: '#0f0b6b' }}>
                    Verify and Continue
                    <ArrowRight size={14} />
                  </button>
                </form>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-[#0f0b6b] animate-pulse">
                    <Mail size={32} />
                  </div>
                  <div className="space-y-1 px-4">
                    <p className="text-[13px] font-semibold text-slate-700">Awaiting Verification Link</p>
                    <p className="text-[11.5px] text-slate-400 max-w-[280px] mx-auto text-justify hyphens-auto leading-relaxed">
                      Please click the secure link inside the email we sent you. This window will automatically update once you are verified, or you can sign in after clicking the link.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-[11.5px] font-semibold text-[#4e5bff] hover:text-[#3a44d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 
                    ? `Resend link in ${resendCooldown}s` 
                    : verificationEmail.endsWith('@cortex.sandbox')
                      ? 'Resend verification code'
                      : 'Resend verification link'}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Back to Sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Logo - centered top */}
              <div className="flex justify-center mb-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: '#0f0b6b', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <CortexMark size={24} className="text-white" />
                </div>
              </div>

              {/* Header */}
              <div className="space-y-1.5 pb-1 text-center">
                <h2 className="text-[28px] font-bold text-slate-900 leading-tight" style={{ letterSpacing: '-0.035em', fontFamily: "'Inter', sans-serif" }}>
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-[13px] text-slate-500 font-medium text-center">
                  {mode === 'signin' ? 'Sign in to continue your journey.' : 'Get started with Cortex for free.'}
                </p>
              </div>

              {/* Google SSO */}
              {!googleBlocked && (
                <div className="flex flex-col items-center min-h-[46px] justify-center">
                  {googleReady ? (
                    <div ref={googleBtnRef} className="transition-transform duration-200 hover:scale-[1.01]" />
                  ) : (
                    <div className="w-full h-[44px] rounded-lg animate-pulse" style={{ background: '#f1f4f9' }} />
                  )}
                </div>
              )}

              {/* Divider */}
              {!googleBlocked && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: '#e8ecf4' }} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1" style={{ background: '#e8ecf4' }} />
                </div>
              )}

              {/* Global error */}
              {globalError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', color: '#dc2626' }}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{globalError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                {mode === 'signup' && (
                  <AuthInput placeholder="Full name" value={name} onChange={v => { setName(v); setNameErr(''); }}
                    icon={<User size={15} />} error={nameErr} disabled={isLoading} autoComplete="name" />
                )}

                <AuthInput type="email" placeholder="Email address" value={email} onChange={v => { setEmail(v); setEmailErr(''); }}
                  icon={<Mail size={15} />} error={emailErr} disabled={isLoading} autoComplete="email" />

                <AuthInput
                  type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                  onChange={v => { setPassword(v); setPasswordErr(''); }} icon={<Lock size={15} />}
                  error={passwordErr} disabled={isLoading} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />

                {/* Password strength — signup only */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="space-y-1 px-0.5">
                     <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength.score ? strength.color : '#e8ecf4' }} />
                      ))}
                    </div>
                    <p className="text-[10.5px] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}

                {/* Forgot password link — signin only */}
                {mode === 'signin' && (
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[11.5px] font-semibold text-[#4e5bff] hover:text-[#3a44d4] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                {mode === 'signup' && (
                  <>
                    <AuthInput
                      type={showConfirm ? 'text' : 'password'} placeholder="Confirm password"
                      value={confirmPassword} onChange={v => { setConfirmPassword(v); setConfirmErr(''); }}
                      icon={<Lock size={15} />} error={confirmErr} disabled={isLoading} autoComplete="new-password"
                      rightElement={
                        <button type="button" onClick={() => setShowConfirm(p => !p)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      }
                    />

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowApiKeyField(p => !p)}
                        className="text-[11.5px] font-semibold text-slate-500 hover:text-[#4e5bff] flex items-center gap-1.5 transition-colors"
                      >
                        <span>{showApiKeyField ? 'Hide API Key Setup' : '🔑 Bring your own API key (optional)'}</span>
                      </button>
                      
                      {showApiKeyField && (
                        <div className="mt-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2.5 animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Provider</label>
                            <select
                              value={apiProvider}
                              onChange={e => setApiProvider(e.target.value as any)}
                              className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-[#4e5bff] cursor-pointer transition-all shadow-sm"
                            >
                              <option value="gemini">Google Gemini</option>
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">Anthropic</option>
                              <option value="openrouter">OpenRouter</option>
                              <option value="groq">Groq</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Key</label>
                            <input
                              type="password"
                              placeholder={
                                apiProvider === 'gemini' ? 'AIzaSy… or AQ.…' :
                                apiProvider === 'openai' ? 'sk-...' :
                                apiProvider === 'anthropic' ? 'sk-ant-...' :
                                apiProvider === 'groq' ? 'gsk_...' : 'sk-or-...'
                              }
                              value={apiKey}
                              onChange={e => setApiKey(e.target.value)}
                              className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-mono text-slate-800 outline-none focus:border-[#4e5bff] transition-all shadow-sm"
                            />
                            <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">
                              Optional. Leave blank to default to our shared system key.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Submit — solid dark navy */}
                <button type="submit" disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm mt-2 hover:bg-[#1e1a8f] active:scale-[0.99] disabled:opacity-55"
                  style={{ background: '#0f0b6b' }}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={14} />
                </button>
              </form>

              {/* Footer Links (OpenAI-style toggles) */}
              <div className="flex flex-col items-center gap-3 pt-3 border-t border-slate-100 text-center">
                <p className="text-[13px] text-slate-500 font-medium">
                  {mode === 'signin' ? (
                    <>
                      Don't have an account?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="text-[#4e5bff] hover:text-[#3a44d4] font-semibold hover:underline">
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button type="button" onClick={() => switchMode('signin')} className="text-[#4e5bff] hover:text-[#3a44d4] font-semibold hover:underline">
                        Log in
                      </button>
                    </>
                  )}
                </p>

                {mode === 'signup' && (
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-[280px]">
                    By continuing, you agree to our{' '}
                    <span className="text-slate-500 underline cursor-pointer hover:text-slate-700 transition-colors">Terms</span>
                    {' '}and{' '}
                    <span className="text-slate-500 underline cursor-pointer hover:text-slate-700 transition-colors">Privacy Policy</span>.
                  </p>
                )}

                <button type="button" onClick={handleSandboxBypass}
                  className="text-[11.5px] font-semibold text-slate-400 hover:text-slate-600 transition-colors pt-1">
                  Continue as sandbox user
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Keyframe — exact heroFieldDrift from portfolio.css */}
      <style>{`
        @keyframes authHeroFieldDrift {
          0%   { transform: translate3d(-3%, -2%, 0) scale(1.05) rotate(-2deg); background-position: center 30%; }
          100% { transform: translate3d( 3%,  2%, 0) scale(1.15) rotate(2deg); background-position: center 70%; }
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
