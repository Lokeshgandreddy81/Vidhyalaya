import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles, Zap } from 'lucide-react';
import { useAppStore } from '../context/Store';
import { api } from '../services/api';

/* ─── Step 1 — Scholastic Role ─── */
const ROLES = [
  { id: 'Scholar', emoji: '📚', title: 'Scholar', desc: 'I love deep, thorough learning' },
  { id: 'Researcher', emoji: '🔬', title: 'Researcher', desc: 'I dig into the why behind everything' },
  { id: 'Architect', emoji: '🏗️', title: 'Architect', desc: 'I build systems and solve hard problems' },
  { id: 'CEO', emoji: '🎯', title: 'CEO / Founder', desc: 'I need strategic, high-level understanding' },
  { id: 'CPO', emoji: '🧭', title: 'CPO / PM', desc: 'I bridge tech and product thinking' },
];

/* ─── Step 2 — Learning Style ─── */
const PACES = [
  { id: 'Focused', emoji: '🎯', title: 'Focused', desc: 'Deep dives, one concept at a time' },
  { id: 'Balanced', emoji: '⚖️', title: 'Balanced', desc: 'Mix of depth and breadth' },
  { id: 'Rapid', emoji: '⚡', title: 'Rapid', desc: 'Fast overview, then drill what matters' },
];

const DOMAINS = [
  { id: 'Tech', emoji: '💻', label: 'Tech / Code' },
  { id: 'Science', emoji: '🔭', label: 'Science' },
  { id: 'Business', emoji: '📈', label: 'Business' },
  { id: 'Sports', emoji: '⚽', label: 'Sports' },
];

/* ─── Cortex Mark ─── */
const CortexMark: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={size} height={size}>
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity={0.45} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateUserProfile, setIsFirstLogin, userProfile } = useAppStore();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState('Scholar');
  const [pace, setPace] = useState('Balanced');
  const [domain, setDomain] = useState('Tech');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await api.completeOnboarding({
        name: userProfile?.name,
        scholasticRole: role,
        cognitivePace: pace,
        analogyDomain: domain,
      });
      updateUserProfile({ ...result.profile });
      setIsFirstLogin(false);
      // Persist preferences for SARA personalization
      const prefs = { cognitivePace: pace, pedagogicalMode: 'Coach', analogyDomain: domain, temperature: 0.3 };
      localStorage.setItem('vidyal_user_preferences', JSON.stringify(prefs));
      navigate('/api-setup', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)', fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[520px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#09054a' }}>
            <CortexMark size={20} />
          </div>
          <span className="text-[15px] font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Cortex</span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Step {step + 1} of {totalSteps}</span>
            <span className="text-[11px] font-semibold text-slate-400">{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #4e5bff, #886cff)' }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-xl" style={{ background: '#ffffff', border: '1px solid rgba(78,91,255,0.1)' }}>
          <AnimatePresence mode="wait">
            {/* ── STEP 0: Who are you? ── */}
            {step === 0 && (
              <motion.div key="step0" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.025em' }}>
                    Who are you as a learner?
                  </h2>
                  <p className="text-[13px] text-slate-500">This shapes how SARA teaches you — your tone, depth, and examples.</p>
                </div>
                <div className="space-y-2.5">
                  {ROLES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-150 text-left"
                      style={{
                        background: role === r.id ? 'rgba(78,91,255,0.06)' : '#f8fafc',
                        border: `1.5px solid ${role === r.id ? '#4e5bff' : '#e2e8f0'}`,
                      }}
                    >
                      <span className="text-[22px] shrink-0">{r.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-slate-800">{r.title}</p>
                        <p className="text-[11.5px] text-slate-500 font-medium">{r.desc}</p>
                      </div>
                      {role === r.id && (
                        <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-[#4e5bff] flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: How do you learn? ── */}
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.025em' }}>
                    How do you like to learn?
                  </h2>
                  <p className="text-[13px] text-slate-500">SARA adjusts her pace and depth based on your style.</p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {PACES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPace(p.id)}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-150 text-left"
                      style={{
                        background: pace === p.id ? 'rgba(78,91,255,0.06)' : '#f8fafc',
                        border: `1.5px solid ${pace === p.id ? '#4e5bff' : '#e2e8f0'}`,
                      }}
                    >
                      <span className="text-[22px] shrink-0">{p.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-slate-800">{p.title}</p>
                        <p className="text-[11.5px] text-slate-500 font-medium">{p.desc}</p>
                      </div>
                      {pace === p.id && (
                        <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-[#4e5bff] flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    SARA uses analogies from…
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DOMAINS.map(d => (
                      <button
                        key={d.id}
                        onClick={() => setDomain(d.id)}
                        className="flex items-center gap-2.5 p-3 rounded-xl transition-all duration-150 text-left"
                        style={{
                          background: domain === d.id ? 'rgba(78,91,255,0.06)' : '#f8fafc',
                          border: `1.5px solid ${domain === d.id ? '#4e5bff' : '#e2e8f0'}`,
                        }}
                      >
                        <span className="text-[18px]">{d.emoji}</span>
                        <span className="text-[12.5px] font-semibold" style={{ color: domain === d.id ? '#4e5bff' : '#475569' }}>{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Your Engine ── */}
            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.025em' }}>
                    You're all set! 🎉
                  </h2>
                  <p className="text-[13px] text-slate-500">
                    SARA is personalized and ready. Your AI engine is configured — you can start learning immediately.
                  </p>
                </div>

                {/* Summary card */}
                <div className="p-4 rounded-xl mb-6 space-y-2.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Your profile</p>
                  {[
                    { label: 'Role', value: ROLES.find(r => r.id === role)?.title || role },
                    { label: 'Pace', value: PACES.find(p => p.id === pace)?.title || pace },
                    { label: 'Analogies from', value: DOMAINS.find(d => d.id === domain)?.label || domain },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-slate-500 font-medium">{item.label}</span>
                      <span className="font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Engine status */}
                <div className="p-4 rounded-xl mb-4" style={{ background: 'linear-gradient(90deg, rgba(78,91,255,0.06) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(78,91,255,0.15)' }}>
                  <div className="flex items-start gap-3">
                    <Zap size={16} className="text-[#4e5bff] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">Configure your API Access next</p>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">Next, you'll set up your private API key (Gemini, OpenAI, etc.) to enable SARA and unlock your dashboard.</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] text-red-500 font-medium px-1 mb-3">{error}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 rounded-xl text-[12.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {step < totalSteps - 1 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #4e5bff, #7c3aed)' }}
            >
              Continue <ArrowRight size={14} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-md transition-all disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #4e5bff, #7c3aed)' }}
            >
              {isSubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Starting…</>
              ) : (
                <><Sparkles size={14} /> Enter Cortex</>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
