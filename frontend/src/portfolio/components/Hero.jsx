import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   ALL CSS. NO CANVAS. GUARANTEED TO RENDER.
   Rich gradient background, vivid animated orbs, dramatic text.
   ═══════════════════════════════════════════════════════════════════════════ */

const heroStyles = `
  .hero-bg {
    background: linear-gradient(165deg, #0a0118 0%, #0d0b2e 25%, #120a3d 50%, #0a0118 100%);
    position: relative;
    overflow: hidden;
  }

  /* ── Vivid animated orbs — CSS only, always visible ── */
  .hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    will-change: transform;
    pointer-events: none;
  }
  .hero-orb-1 {
    width: 60vw; height: 60vw;
    max-width: 700px; max-height: 700px;
    background: radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(79,70,229,0.15) 50%, transparent 70%);
    top: 10%; left: 20%;
    animation: orbFloat1 10s ease-in-out infinite alternate;
  }
  .hero-orb-2 {
    width: 50vw; height: 50vw;
    max-width: 600px; max-height: 600px;
    background: radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(139,92,246,0.12) 50%, transparent 70%);
    top: 30%; right: 10%;
    animation: orbFloat2 12s ease-in-out infinite alternate;
  }
  .hero-orb-3 {
    width: 40vw; height: 40vw;
    max-width: 500px; max-height: 500px;
    background: radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(219,39,119,0.08) 50%, transparent 70%);
    bottom: 10%; left: 40%;
    animation: orbFloat3 14s ease-in-out infinite alternate;
  }

  @keyframes orbFloat1 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(60px, -40px) scale(1.15); }
  }
  @keyframes orbFloat2 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-50px, 50px) scale(1.1); }
  }
  @keyframes orbFloat3 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(40px, -60px) scale(1.2); }
  }

  /* ── Grid overlay ── */
  .hero-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%);
  }

  /* ── Glow line beneath headline ── */
  .hero-glow-line {
    height: 2px;
    background: linear-gradient(90deg, transparent, #818cf8, #c084fc, #e879f9, transparent);
    box-shadow: 0 0 30px rgba(129,140,248,0.5), 0 0 60px rgba(192,132,252,0.3);
    animation: glowPulse 3s ease-in-out infinite alternate;
  }
  @keyframes glowPulse {
    0% { opacity: 0.7; filter: blur(0px); }
    100% { opacity: 1; filter: blur(1px); }
  }

  /* ── Floating sparkles ── */
  .sparkle {
    position: absolute;
    width: 3px; height: 3px;
    background: white;
    border-radius: 50%;
    pointer-events: none;
    animation: sparkleFloat linear infinite;
  }
  @keyframes sparkleFloat {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100vh) scale(0); opacity: 0; }
  }

  /* ── Product card glow ── */
  .product-glow {
    position: absolute;
    inset: -40px;
    background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.15) 30%, transparent 70%);
    filter: blur(30px);
    z-index: 0;
    animation: cardGlow 4s ease-in-out infinite alternate;
  }
  @keyframes cardGlow {
    0% { opacity: 0.6; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1.05); }
  }

  /* ── Animated gradient text ── */
  .gradient-text-animated {
    background: linear-gradient(135deg, #818cf8, #a78bfa, #c084fc, #e879f9, #818cf8);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: gradientShift 6s ease infinite;
  }
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

/* ── Sparkle particles (CSS-driven, not Canvas) ── */
const Sparkles_BG = () => {
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    animationDuration: `${6 + Math.random() * 10}s`,
    animationDelay: `${Math.random() * 8}s`,
    opacity: 0.3 + Math.random() * 0.7,
    size: 1 + Math.random() * 2.5,
  }));

  return (
    <>
      {sparkles.map((s, i) => (
        <div key={i} className="sparkle" style={{
          left: s.left, bottom: '-5px',
          width: s.size, height: s.size,
          animationDuration: s.animationDuration,
          animationDelay: s.animationDelay,
          opacity: s.opacity,
          boxShadow: `0 0 ${s.size * 3}px rgba(168,85,247,0.4)`,
        }} />
      ))}
    </>
  );
};

/* ── Product Demo ── */
const DEMOS = [
  { q: "Teach me distributed systems", phases: ["Networking Fundamentals", "Core Theorems (CAP, Paxos)", "Storage & Replication", "Capstone: Build a KV Store"], stat: "14 modules · 6 weeks" },
  { q: "Master React internals deeply", phases: ["Fiber Architecture", "Reconciliation & Diffing", "Hooks & State Machines", "Custom Renderer"], stat: "13 modules · 5 weeks" },
];

const ProductDemo = () => {
  const [di, setDi] = useState(0);
  const [vis, setVis] = useState(-1);
  const demo = DEMOS[di];

  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => { setVis(i); i++; if (i >= 4) clearInterval(iv); }, 500);
      const t2 = setTimeout(() => { setVis(-1); setDi(p => (p + 1) % DEMOS.length); }, 6000);
      return () => { clearInterval(iv); clearTimeout(t2); };
    }, 2000);
    return () => clearTimeout(t);
  }, [di]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[580px] mx-auto relative"
    >
      {/* Massive glow behind card */}
      <div className="product-glow" />

      <div className="relative z-10 rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
        backdropFilter: 'blur(40px)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] text-white font-bold shadow-lg shadow-indigo-500/40">V</div>
            <span className="text-[12px] text-zinc-300 font-medium">vidhyal.ai</span>
            <span className="text-zinc-600 mx-1">·</span>
            <span className="text-[11px] text-zinc-500 mono">playground</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] text-emerald-400 mono font-medium">connected</span>
          </div>
        </div>

        {/* Query */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-[14px] text-white font-medium">{demo.q}</span>
        </div>

        {/* Results */}
        <div className="px-5 py-5 space-y-2 min-h-[200px]">
          <div className="flex items-center gap-2 mb-4">
            <motion.div animate={vis < 3 ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: vis < 3 ? Infinity : 0, ease: 'linear' }}
              className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-400 rounded-full" />
            <span className="text-[11px] text-zinc-400 mono">{vis >= 3 ? '✓ Path generated' : 'Generating path...'}</span>
          </div>
          {demo.phases.map((ph, i) => (
            <motion.div key={`${di}-${i}`}
              initial={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
              animate={i <= vis ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
                <span className="text-[10px] text-indigo-300 font-bold mono">{i + 1}</span>
              </div>
              <span className="text-[13px] text-zinc-200 font-medium">{ph}</span>
            </motion.div>
          ))}
          {vis >= 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 mono">{demo.stat}</span>
              <button className="text-[11px] text-violet-400 hover:text-violet-300 mono cursor-pointer bg-transparent border-none flex items-center gap-1">
                <Play size={10} /> Open path
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */
const wordAnim = {
  hidden: { opacity: 0, y: 50, filter: 'blur(16px)', scale: 0.85 },
  visible: (i) => ({
    opacity: 1, y: 0, filter: 'blur(0px)', scale: 1,
    transition: { duration: 1, delay: 0.5 + i * 0.18, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Hero = () => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.85]);

  return (
    <>
      <style>{heroStyles}</style>
      <section id="home" className="hero-bg relative min-h-[120vh] w-full flex flex-col items-center justify-center">
        {/* Orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        {/* Grid */}
        <div className="hero-grid" />

        {/* Floating sparkles */}
        <Sparkles_BG />

        {/* Fades */}
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#09090b] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0a0118]/80 to-transparent z-20 pointer-events-none" />

        {/* Content */}
        <motion.div style={{ opacity, y, scale }}
          className="relative z-30 w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center pt-40 pb-24">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }} className="mb-12">
            <span className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[13px] text-zinc-200 font-medium backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 40px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" />
              Now in public beta — free forever
            </span>
          </motion.div>

          {/* Headline Line 1 — white */}
          <div className="flex flex-wrap justify-center gap-x-[0.3em] mb-1">
            {["Learn", "anything."].map((w, i) => (
              <motion.span key={i} custom={i} variants={wordAnim} initial="hidden" animate="visible"
                className="text-[clamp(3.5rem,11vw,8.5rem)] font-extrabold text-white leading-[0.92] tracking-[-0.05em]"
                style={{ textShadow: '0 0 60px rgba(255,255,255,0.15)' }}>
                {w}
              </motion.span>
            ))}
          </div>

          {/* Headline Line 2 — animated gradient */}
          <div className="flex flex-wrap justify-center gap-x-[0.3em] mb-6">
            {["Forget", "nothing."].map((w, i) => (
              <motion.span key={i} custom={i + 2} variants={wordAnim} initial="hidden" animate="visible"
                className="text-[clamp(3.5rem,11vw,8.5rem)] font-extrabold leading-[0.92] tracking-[-0.05em] gradient-text-animated">
                {w}
              </motion.span>
            ))}
          </div>

          {/* Glow line */}
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
            className="hero-glow-line w-32 mb-10 origin-center rounded-full" />

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="text-[clamp(1.05rem,2.5vw,1.35rem)] text-zinc-300 max-w-[520px] mb-14 leading-[1.7] font-light">
            Vidhyalaya uses AI to decompose any subject into personalized learning paths — with neural maps, smartboards, and verified resources.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.7 }}
            className="flex flex-col sm:flex-row items-center gap-5 mb-32">
            <button onClick={() => window.location.hash = '/dashboard'}
              className="shimmer h-[58px] px-10 rounded-full text-[16px] font-bold flex items-center gap-3 active:scale-[0.96] transition-all cursor-pointer border-none relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                color: 'white',
                boxShadow: '0 0 50px rgba(99,102,241,0.4), 0 0 100px rgba(139,92,246,0.2), 0 4px 20px rgba(0,0,0,0.4)',
              }}>
              Start building free
              <ArrowRight size={18} />
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-[58px] px-10 rounded-full text-zinc-200 text-[16px] font-medium flex items-center gap-2 hover:text-white transition-all cursor-pointer backdrop-blur-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 30px rgba(0,0,0,0.3)',
              }}>
              <Play size={16} />
              Watch demo
            </button>
          </motion.div>

          {/* Product Demo */}
          <ProductDemo />

          {/* Trust */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1 }}
            className="flex items-center gap-4 mt-8 flex-wrap justify-center">
            <span className="text-[11px] text-zinc-500 mono">Powered by</span>
            {['React 19', 'Gemini 2.5', 'TypeScript', 'MongoDB'].map((t, i) => (
              <React.Fragment key={t}>
                <span className="text-[12px] text-zinc-400 mono font-medium">{t}</span>
                {i < 3 && <span className="text-zinc-700">·</span>}
              </React.Fragment>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </>
  );
};

export default Hero;