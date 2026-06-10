import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../context/Store';
import { toast } from 'sonner';

/* ── Cortex SVG Mark ── */
const CortexMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity={0.45} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthenticated, updateUserProfile, setIsFirstLogin, updateByokMode } = useAppStore();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devUrl, setDevUrl] = useState('');

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Execute verification on mount
  useEffect(() => {
    const hash = window.location.hash; // e.g. #/verify-email?token=xxx&email=yyy
    const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryStr);
    const t = params.get('token') || '';
    const e = decodeURIComponent(params.get('email') || '');

    setToken(t);
    setEmail(e);

    const performVerification = async () => {
      if (!t || !e) {
        setIsVerifying(false);
        setError('Verification link is malformed. Please request a new one.');
        return;
      }

      try {
        setIsVerifying(true);
        setError('');
        const result = await api.verifyEmail(e, undefined, t);

        // Store session tokens & profile
        localStorage.setItem('vidyal_user_token', result.token);
        localStorage.setItem('vidyal_user_id', result.userId);
        
        // Update store
        setAuthenticated(true);
        updateUserProfile(result.profile);
        setIsFirstLogin(result.isFirstLogin ?? true);
        updateByokMode('auto');

        setSuccess(true);
        toast.success('Email verified successfully!');

        // Redirect after a brief visual confirmation delay
        setTimeout(() => {
          navigate(result.isFirstLogin ? '/onboarding' : '/dashboard', { replace: true });
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error && err.message ? err.message : 'Email verification failed.';
        setError(msg);
      } finally {
        setIsVerifying(false);
      }
    };

    void performVerification();
  }, [navigate, setAuthenticated, updateUserProfile, setIsFirstLogin, updateByokMode]);

  /* ── Resend Link ── */
  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      const result = await api.resendVerificationCode(email);
      setResendCooldown(60);
      toast.success('A new verification link has been sent to your email.');
      if (result.devUrl) {
        setDevUrl(result.devUrl);
      }
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Failed to resend link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 flex-shrink-0 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: '#0f0b6b' }} />
        <div
          className="absolute"
          style={{
            top: '-16%', left: '-16%', right: '-16%', bottom: '-16%',
            backgroundImage: "url('/images/cortex-blue-field.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 44%',
            filter: 'saturate(150%) contrast(120%) brightness(0.76)',
            animation: 'authHeroFieldDrift 6s ease-in-out infinite alternate',
          }}
        />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 36% at 50% 28%, rgba(255,255,255,0.08), transparent 64%), linear-gradient(180deg, rgba(15,5,90,0.2) 0%, rgba(5,18,100,0.26) 50%, rgba(2,10,68,0.5) 100%)` }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10 p-12">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <CortexMark size={20} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-white" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
        </div>

        {/* Statement */}
        <div className="relative z-10 space-y-4 p-12">
          <h1 className="text-[36px] font-bold leading-[1.12] text-white" style={{ letterSpacing: '-0.035em', maxWidth: 350 }}>
            Verifying your workspace.
          </h1>
          <p className="text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)', maxWidth: 320 }}>
            Connecting with SARA to calibrate your cognitive pace, setup your adaptive roadmap, and launch your sandbox.
          </p>
        </div>
        <div className="relative z-10 p-12 pb-10" />
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)' }}>
        
        {/* Ambient Glows */}
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, top: '-80px', right: '-80px', background: 'radial-gradient(circle, rgba(78,91,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute pointer-events-none" style={{ width: 320, height: 320, bottom: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(136,108,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Card Container */}
        <div className="relative z-10 w-full max-w-[400px] rounded-3xl p-8 space-y-6"
          style={{ background: '#ffffff', border: '1px solid rgba(78,91,255,0.08)', boxShadow: '0 10px 30px -10px rgba(15,23,42,0.04), 0 30px 60px -15px rgba(15,23,42,0.12)' }}>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0f0b6b' }}>
              <CortexMark size={17} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
          </div>

          {isVerifying && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-indigo-50">
                <Loader2 className="w-8 h-8 text-[#0f0b6b] animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Verifying email…</h2>
                <p className="text-[12.5px] text-slate-400 font-medium">Please wait while we validate your security token.</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Verification Successful!</h2>
                <p className="text-[12.5px] text-slate-400 font-medium">Your account has been activated. Opening your dashboard…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-2 space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-50">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-[20px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Verification Failed</h2>
                  <p className="text-[12.5px] text-slate-400 font-medium leading-relaxed px-2">
                    {error}
                  </p>
                </div>
              </div>

              {/* Dev Mode Bypass for standard users */}
              {devUrl && (
                <div className="flex flex-col gap-2 px-3.5 py-3 rounded-2xl text-[12px] font-medium"
                  style={{ background: 'rgba(78,91,255,0.06)', border: '1px solid rgba(78,91,255,0.15)', color: '#3b44d4' }}>
                  <span className="font-bold text-slate-800">🛠️ Dev Mode Bypass</span>
                  <p className="text-slate-500 leading-normal font-medium m-0">
                    SMTP not configured. Click the button below to verify directly:
                  </p>
                  <a
                    href={devUrl}
                    className="w-full h-10 mt-1 flex items-center justify-center rounded-lg text-[12px] font-bold text-white transition-all duration-200 shadow-sm hover:bg-[#1e1a8f] active:scale-[0.99] text-center no-underline animate-pulse"
                    style={{ background: '#0f0b6b' }}
                  >
                    Verify Directly (Bypass)
                  </a>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {email && (
                  <button
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm hover:bg-[#1e1a8f] disabled:opacity-55"
                    style={{ background: '#0f0b6b' }}
                  >
                    {isResending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>{resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : 'Resend Verification Link'}</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          )}

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

export default VerifyEmailPage;
