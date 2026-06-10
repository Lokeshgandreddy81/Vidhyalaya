import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

/* ── Cortex SVG Mark ── */
const CortexMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity={0.45} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

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

const getErrorMessage = (e: unknown, fb: string) => e instanceof Error && e.message ? e.message : fb;

/* ─────────────────────────────────────────── */
const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Parse URL params — token + email come from the reset link
  const [token, setToken] = useState('');
  const [emailFromUrl, setEmailFromUrl] = useState('');

  useEffect(() => {
    const hash = window.location.hash; // e.g. #/reset-password?token=xxx&email=yyy
    const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryStr);
    setToken(params.get('token') || '');
    setEmailFromUrl(decodeURIComponent(params.get('email') || ''));
  }, []);

  // ── Forgot password state (no token in URL) ──
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSent, setFpSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  // ── Reset password state (token in URL) ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rpLoading, setRpLoading] = useState(false);
  const [rpError, setRpError] = useState('');
  const [rpSuccess, setRpSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  /* ── Submit forgot password request ── */
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail.trim())) {
      setFpError('Please enter a valid email address.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      const result = await api.forgotPassword(fpEmail.trim());
      setFpSent(true);
      if (result.devResetUrl) {
        setDevResetUrl(result.devResetUrl);
      }
    } catch (err) {
      setFpError(getErrorMessage(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setFpLoading(false);
    }
  };

  /* ── Submit new password ── */
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setRpError('Password must be at least 8 characters.'); return; }
    if (newPassword.length > 128) { setRpError('Password must be 128 characters or fewer.'); return; }
    if (newPassword !== confirmPassword) { setRpError('Passwords do not match.'); return; }
    setRpLoading(true);
    setRpError('');
    try {
      await api.resetPassword(emailFromUrl, token, newPassword);
      setRpSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setRpError(getErrorMessage(err, 'Reset failed. The link may have expired — request a new one.'));
    } finally {
      setRpLoading(false);
    }
  };

  /* ─── Shared Layout Shell ─── */
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
          <h1 className="text-[36px] font-bold leading-[1.12] text-white" style={{ letterSpacing: '-0.035em', maxWidth: 300 }}>
            Reclaim your account.
          </h1>
          <p className="text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)', maxWidth: 320 }}>
            Set a new password and get straight back to where you left off. Your learning progress is safe.
          </p>
        </div>
        <div className="relative z-10 p-12 pb-10" />
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)' }}>
        {/* Back to login */}
        <button onClick={() => navigate('/login')} className="absolute top-6 left-6 flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 transition-colors z-10">
          <ArrowLeft size={14} />
          Back to sign in
        </button>

        {/* Glow */}
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, top: '-80px', right: '-80px', background: 'radial-gradient(circle, rgba(78,91,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute pointer-events-none" style={{ width: 320, height: 320, bottom: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(136,108,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Card */}
        <div className="relative z-10 w-full max-w-[400px] rounded-3xl p-8 space-y-6"
          style={{ background: '#ffffff', border: '1px solid rgba(78,91,255,0.08)', boxShadow: '0 10px 30px -10px rgba(15,23,42,0.04), 0 30px 60px -15px rgba(15,23,42,0.12)' }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0f0b6b' }}>
              <CortexMark size={17} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
          </div>

          {/* ────────────────────────────────────────────
              STATE A: Reset form (token in URL)
          ──────────────────────────────────────────── */}
          {token ? (
            rpSuccess ? (
              /* ─ Success state ─ */
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-[20px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Password updated!</h2>
                  <p className="text-[12.5px] text-slate-400 font-medium">Redirecting you to sign in…</p>
                </div>
              </div>
            ) : (
              /* ─ New password form ─ */
              <div className="space-y-5">
                <div className="space-y-1 pb-1">
                  <h2 className="text-[21px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Set new password</h2>
                  <p className="text-[12.5px] leading-relaxed text-slate-400 font-medium">
                    Resetting password for <strong className="text-slate-600">{emailFromUrl}</strong>
                  </p>
                </div>

                {rpError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', color: '#dc2626' }}>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{rpError}</span>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                    <div className="relative flex items-center rounded-xl transition-all" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
                      <Lock size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setRpError(''); }}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="w-full h-12 bg-transparent pl-10 pr-10 text-[14px] font-medium text-slate-800 outline-none placeholder-slate-400 rounded-xl"
                        disabled={rpLoading}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {newPassword && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }} />
                          ))}
                        </div>
                        <p className="text-[10.5px] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative flex items-center rounded-xl transition-all" style={{ background: '#fff', border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '#e2e8f0'}` }}>
                      <Lock size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setRpError(''); }}
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                        className="w-full h-12 bg-transparent pl-10 pr-10 text-[14px] font-medium text-slate-800 outline-none placeholder-slate-400 rounded-xl"
                        disabled={rpLoading}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-[11px] text-red-500 font-semibold pl-1">Passwords do not match</p>
                    )}
                  </div>

                  <button type="submit" disabled={rpLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #09054a 0%, #0f0b6b 50%, #1e1a8f 100%)' }}>
                    {rpLoading ? <><Loader2 size={14} className="animate-spin" /><span>Updating…</span></> : <><span>Update Password</span><ArrowRight size={14} /></>}
                  </button>
                </form>
              </div>
            )
          ) : (
            /* ────────────────────────────────────────────
               STATE B: Forgot password (request link)
            ──────────────────────────────────────────── */
            fpSent ? (
              /* ─ Email sent state ─ */
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,91,255,0.08)' }}>
                  <Mail size={26} className="text-[#4e5bff]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-[20px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Check your inbox</h2>
                  <p className="text-[12.5px] leading-relaxed text-slate-400 font-medium">
                    If an account exists for <strong className="text-slate-600">{fpEmail}</strong>, a reset link has been sent. It expires in 1 hour.
                  </p>
                </div>

                {/* Dev mode: show clickable reset link if no SMTP configured */}
                {devResetUrl && (
                  <div className="w-full flex flex-col gap-1 px-3.5 py-3 rounded-2xl text-[12px] font-medium text-left"
                    style={{ background: 'rgba(78,91,255,0.06)', border: '1px solid rgba(78,91,255,0.15)', color: '#3b44d4' }}>
                    <span className="font-bold text-slate-800">🛠️ Developer Sandbox Notice</span>
                    <span className="text-slate-500 leading-normal font-medium">
                      SMTP not configured. Click to reset:
                    </span>
                    <a href={devResetUrl} className="text-indigo-600 font-semibold underline break-all text-[11px]">
                      Open reset link →
                    </a>
                  </div>
                )}

                <button onClick={() => { setFpSent(false); setDevResetUrl(''); setFpEmail(''); }}
                  className="text-[12px] font-semibold text-[#4e5bff] hover:text-[#3a44d4] transition-colors">
                  Try a different email
                </button>
              </div>
            ) : (
              /* ─ Email input form ─ */
              <div className="space-y-5">
                <div className="space-y-1 pb-1">
                  <h2 className="text-[21px] font-bold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Forgot password?</h2>
                  <p className="text-[12.5px] leading-relaxed text-slate-400 font-medium">
                    Enter the email linked to your account and we'll send a reset link.
                  </p>
                </div>

                {fpError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', color: '#dc2626' }}>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{fpError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative flex items-center rounded-xl" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
                      <Mail size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={fpEmail}
                        onChange={e => { setFpEmail(e.target.value); setFpError(''); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full h-12 bg-transparent pl-10 pr-4 text-[14px] font-medium text-slate-800 outline-none placeholder-slate-400 rounded-xl"
                        disabled={fpLoading}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={fpLoading || !fpEmail.trim()}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #09054a 0%, #0f0b6b 50%, #1e1a8f 100%)' }}>
                    {fpLoading ? <><Loader2 size={14} className="animate-spin" /><span>Sending…</span></> : <><span>Send Reset Link</span><ArrowRight size={14} /></>}
                  </button>
                </form>
              </div>
            )
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

export default ResetPasswordPage;
