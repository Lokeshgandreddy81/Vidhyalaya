import React, { useState, useEffect } from 'react';
import CustomCursor from '../../components/ui/CustomCursor';
import SmoothScroll from '../../components/ui/SmoothScroll';
import Header from '../components/Header';
import Hero from '../components/Hero';
import WorkSection from '../components/WorkSection';
import AboutSection from '../components/AboutSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import Preloader from '../components/Preloader';
import { useTheme } from '../context/ThemeContext';

/* ─── Editorial section divider ──────────────────────────────────────────── */
const SectionDivider = ({ num, label }) => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <div
      className="w-full px-8 md:px-14 py-8 flex items-center gap-6 transition-colors duration-700"
      style={{
        background: dark ? '#050505' : '#f7f6f2',
        borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.4em] flex-shrink-0 transition-colors duration-700"
        style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
        {num}
      </span>
      <div className="flex-1 h-[1px] transition-colors duration-700"
        style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.4em] flex-shrink-0 transition-colors duration-700"
        style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
        {label}
      </span>
    </div>
  );
};

/* ─── Jaw-drop Core Directive break ─────────────────────────────────────── */
const ManifestoBreak = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [visible, setVisible] = useState(false);
  const [mx, setMx] = useState(0.5);
  const [my, setMy] = useState(0.5);
  const ref = React.useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      setMx(e.clientX / window.innerWidth);
      setMy(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [visible]);

  const bg = dark ? '#f2f1ed' : '#080808';
  const text = dark ? '#0a0a0a' : '#f0efe9';
  const sub = dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)';

  const lineStyle = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(48px)',
    transition: `opacity 1.1s ease ${delay}s, transform 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <div
      ref={ref}
      className="w-full relative overflow-hidden transition-colors duration-700 flex flex-col min-h-screen justify-center"
      style={{ background: bg }}
    >
      {/* ── Refined & Natural G Parallax ──────────────────────────────── */}
      <div
        className="absolute right-0 top-0 w-[45vw] h-full pointer-events-none hidden lg:flex items-center justify-center select-none z-0"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 2.5s ease 0.3s',
        }}
      >
        {/* Soft, natural ambient base glow */}
        <div
          className="absolute inset-0 rounded-full blur-[100px] opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle at center, #a853ba 0%, #3b82f6 50%, transparent 100%)',
            transform: `translate(${(0.5 - mx) * 20}px, ${(0.5 - my) * 20}px)`,
            transition: 'transform 2s cubic-bezier(0.16,1,0.3,1)'
          }}
        />

        {/* Clean, elegant G */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${(mx - 0.5) * -40}px, ${(my - 0.5) * -25}px)`,
            transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1)'
          }}
        >
          <span
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(22rem, 38vw, 44rem)',
              fontWeight: 300,
              lineHeight: 0.8,
              letterSpacing: '-0.06em',
              background: 'linear-gradient(135deg, #3b82f6 0%, #a853ba 40%, #e92a67 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: 0.75, // Keeps it natural and sheer
              display: 'inline-block',
              position: 'relative',
              right: '2vw', // Optical centering adjustment
            }}
          >
            V
          </span>
        </div>
      </div>

      {/* ── Subtle dot grid ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, ${dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-8 md:px-16 lg:px-24 py-24 md:py-32 max-w-[1600px] mx-auto">

        {/* Eyebrow row */}
        <div className="flex items-center gap-5 mb-12 md:mb-16" style={lineStyle(0.05)}>
          <div className="w-8 h-[1px]" style={{ background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)' }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.5em]" style={{ color: sub }}>
            Core Directive · 04
          </span>
          <div className="flex-1 h-[1px]" style={{ background: dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
        </div>

        <div className="flex flex-col gap-2 md:gap-4 mb-16 md:mb-20">

          {/* Line 1: "Systems don't" */}
          <div style={lineStyle(0.1)}>
            <span
              className="block font-light leading-[1] tracking-tighter"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: text,
              }}
            >
              Systems don't
            </span>
          </div>

          {/* Line 2: "just RUN —" */}
          <div style={lineStyle(0.22)} className="flex items-baseline flex-wrap gap-x-4 md:gap-x-6">
            <span
              className="font-light leading-[1] tracking-tighter"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: text,
              }}
            >
              just&nbsp;
            </span>
            <span
              className="font-light leading-[1] tracking-tighter italic"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: 'transparent',
                WebkitTextStroke: dark ? '2px rgba(0,0,0,0.55)' : '2px rgba(255,255,255,0.55)',
                letterSpacing: '-0.02em',
              }}
            >
              run
            </span>
            <span
              className="font-light leading-[1] tracking-tighter"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: text,
                opacity: 0.5,
              }}
            >
              &nbsp;—
            </span>
          </div>

          {/* Line 3: "they think." */}
          <div style={lineStyle(0.35)} className="flex items-baseline flex-wrap gap-x-2 md:gap-x-4">
            <span
              className="font-light leading-[1] tracking-tighter"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: text,
              }}
            >
              they&nbsp;
            </span>
            <span
              className="font-light leading-[1] tracking-tighter italic"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2.2rem, 10vw, 11rem)',
                color: dark ? '#818cf8' : '#6366f1',
                letterSpacing: '-0.02em',
              }}
            >
              think.
            </span>
          </div>
        </div>


        {/* ── Glowing divider ──────────────────────────────────── */}
        <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.6s' }}>
          <div className="relative h-[1px] w-full mb-10">
            <div className="absolute inset-0" style={{
              background: dark
                ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15) 30%, rgba(59,130,246,0.4) 50%, rgba(0,0,0,0.15) 70%, transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 30%, rgba(96,165,250,0.5) 50%, rgba(255,255,255,0.15) 70%, transparent)',
            }} />
            {/* Glowing dot at the center of the line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
              style={{
                background: '#3b82f6',
                boxShadow: '0 0 12px 4px rgba(59,130,246,0.5)',
              }} />
          </div>

          {/* Attribution row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: sub }}>
                The Team
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: sub }}>
                System Architect
              </span>
              <span className="font-mono text-[10px] tracking-widest" style={{ color: dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' }}>
                2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vertical side label ─────────────────────────────────── */}
      <div
        className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex pointer-events-none items-center justify-center z-10 h-full"
        style={{
          opacity: visible ? 0.3 : 0,
          transition: 'opacity 1s ease 0.8s',
        }}
      >
        <span
          className="font-mono text-[9px] uppercase tracking-[0.5em] whitespace-nowrap"
          style={{
            color: dark ? '#ffffff' : '#0a0a0a',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          Vidhyalaya Systems · Core Architecture
        </span>
      </div>

      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

/* ─── Home page ───────────────────────────────────────────────────────────── */
const Home = () => {
  const [preloaderDone, setPreloaderDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = preloaderDone ? '' : 'hidden';
  }, [preloaderDone]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      <CustomCursor />

      {/* Global noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      <Header />

      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}

      <div style={{ opacity: preloaderDone ? 1 : 0, transition: 'opacity 0.8s ease-out' }}>
        <SmoothScroll>
          <main>
            <Hero />

            <SectionDivider num="02" label="The Archive" />
            <WorkSection />

            <SectionDivider num="03" label="The Architect" />
            <AboutSection />

            {/* ── JAW-DROP BREAK ─────────────────────────────────────── */}
            <ManifestoBreak />

            <SectionDivider num="04" label="Connect" />
            <ContactSection />
          </main>
          <Footer />
        </SmoothScroll>
      </div>
    </div>
  );
};

export default Home;