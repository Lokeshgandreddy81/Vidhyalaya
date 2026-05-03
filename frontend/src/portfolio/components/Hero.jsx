import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import siteConfig from '../config/siteConfig';

const Hero = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate normalized positions
      const nx = clientX / innerWidth;
      const ny = clientY / innerHeight;
      
      // Set CSS variables for high-performance parallax
      containerRef.current.style.setProperty('--mouse-x', nx.toString());
      containerRef.current.style.setProperty('--mouse-y', ny.toString());
      
      if (profileRef.current) {
        const rect = profileRef.current.getBoundingClientRect();
        const px = (clientX - (rect.left + rect.width / 2)) * 0.08;
        const py = (clientY - (rect.top + rect.height / 2)) * 0.08;
        containerRef.current.style.setProperty('--profile-x', `${px}px`);
        containerRef.current.style.setProperty('--profile-y', `${py}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <section
      id="home"
      ref={containerRef}
      className="min-h-[120vh] w-full relative z-50 dark:bg-black bg-[#f8f9fa] transition-colors duration-500 ease-out flex flex-col justify-center overflow-hidden"
      style={{
        '--mouse-x': '0.5',
        '--mouse-y': '0.5',
        '--profile-x': '0px',
        '--profile-y': '0px',
      }}
    >

      {/* ── Dashboard Shortcut ── */}
      <div className="absolute top-8 right-8 z-[60] pointer-events-auto">
        <button
          onClick={() => window.location.hash = '/dashboard'}
          className="group relative flex items-center gap-3 px-6 py-2.5 rounded-full border border-black/10 dark:border-white/10 bg-white/5 backdrop-blur-md transition-all duration-500 hover:border-blue-500/50 hover:bg-blue-500/10 cursor-pointer overflow-hidden shadow-sm hover:shadow-blue-500/10"
          style={{
            opacity: isMounted ? 1 : 0,
            transform: isMounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.8s',
          }}
        >
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/60 dark:text-white/80 group-hover:text-blue-400 transition-colors relative z-10">Dashboard</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-500 animate-pulse relative z-10" />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════
          DARK MODE ATMOSPHERE
      ════════════════════════════════════════════════════ */}

      {/* Rotating aurora conic — the heartbeat of the scene */}
      <div
        className="absolute pointer-events-none hidden dark:block"
        style={{
          top: '50%', left: '50%',
          width: '200vw', height: '200vw',
          transform: `translate(-50%, -50%) rotate(calc((var(--mouse-x) - 0.5) * 200deg + (var(--mouse-y) - 0.5) * 80deg))`,
          transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: 'conic-gradient(from 0deg at 50% 50%, #04050d 0deg, #0a1230 50deg, #0e0328 100deg, #040913 150deg, #0a1230 200deg, #0c0325 260deg, #04050d 310deg, #070d24 360deg)',
          opacity: 0.85,
          zIndex: 0,
        }}
      />

      {/* Blue orb — top right — mouse reactive */}
      <div
        className="absolute pointer-events-none mix-blend-screen hidden dark:block rounded-full"
        style={{
          width: '72vw', height: '72vw',
          top: '-18%', right: '-15%',
          background: 'radial-gradient(circle, rgba(29,78,216,0.35) 0%, rgba(67,56,202,0.18) 40%, transparent 70%)',
          filter: 'blur(90px)',
          transform: `translate(calc((var(--mouse-x) - 0.5) * -50px), calc((var(--mouse-y) - 0.5) * -50px + (var(--scroll-y, 0) * 0.15px)))`,
          transition: 'transform 3s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 1,
        }}
      />

      {/* Violet orb — bottom left — mouse reactive */}
      <div
        className="absolute pointer-events-none mix-blend-screen hidden dark:block rounded-full"
        style={{
          width: '58vw', height: '58vw',
          bottom: '-12%', left: '-10%',
          background: 'radial-gradient(circle, rgba(91,33,182,0.30) 0%, rgba(109,40,217,0.15) 45%, transparent 72%)',
          filter: 'blur(80px)',
          transform: `translate(calc((var(--mouse-x) - 0.5) * 40px), calc((var(--mouse-y) - 0.5) * 40px + (var(--scroll-y, 0) * -0.08px)))`,
          transition: 'transform 2.5s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 1,
        }}
      />

      {/* Pink accent — center */}
      <div
        className="absolute pointer-events-none mix-blend-screen hidden dark:block rounded-full"
        style={{
          width: '32vw', height: '32vw',
          top: '50%', left: '42%',
          background: 'radial-gradient(circle, rgba(157,23,77,0.18) 0%, transparent 70%)',
          filter: 'blur(70px)',
          opacity: 0.9,
          zIndex: 1,
        }}
      />

      {/* Subtle noise grain — dark only */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
          opacity: 0.035,
          mixBlendMode: 'overlay',
          zIndex: 2,
        }}
      />

      {/* Architectural grid — dark only */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
          zIndex: 2,
        }}
      />

      {/* ════════════════════════════════════════════════════
          LIGHT MODE ATMOSPHERE
      ════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply block dark:hidden"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 50%)',
          transform: 'translateY(calc(var(--scroll-y, 0) * 0.2px))',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply block dark:hidden"
        style={{
          background: 'radial-gradient(circle at 30% 80%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0) 60%)',
          transform: 'translateY(calc(var(--scroll-y, 0) * -0.1px))',
        }}
      />

      {/* ════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════ */}
      <div
        className="container mx-auto px-6 md:px-12 relative w-full flex flex-col items-center text-center"
        style={{
          zIndex: 10,
          opacity: 'calc(1 - (var(--scroll-y, 0) / (0.8 * 100vh)))',
          transform: 'translateY(calc(var(--scroll-y, 0) * 0.4px))',
          willChange: 'transform, opacity',
        }}
      >
        <div className="flex flex-col items-center w-full gap-12 md:gap-0">

          {/* ── Monolithic Typography ── */}
          <div className="flex flex-col relative z-20 pointer-events-auto items-center">

            {/* Vidhyalaya // Year — slide up on mount */}
            <div className="flex items-center justify-between w-full mb-8 px-4 max-w-4xl">
              <span className="font-mono text-xs tracking-[0.4em] uppercase text-black/50 dark:text-white/40 overflow-hidden inline-block">
                <span
                  className="inline-block"
                  style={{
                    transform: isMounted ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 1s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  Vidhyalaya // {new Date().getFullYear()}
                </span>
              </span>

              {/* ENTER BUTTON */}
              <button
                onClick={() => window.location.hash = '/dashboard'}
                className="group relative flex items-center gap-2 px-6 py-2 rounded-full border border-black/10 dark:border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-500 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer"
                style={{
                  opacity: isMounted ? 1 : 0,
                  transform: isMounted ? 'translateX(0)' : 'translateX(20px)',
                  transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.5s',
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 dark:text-white/60 group-hover:text-blue-500 transition-colors">Enter System</span>
                <ArrowRight size={14} className="text-black/40 dark:text-white/40 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <h1 className="flex flex-col leading-[0.85] tracking-tighter relative group cursor-default items-center">

              {/* Ambient indigo glow behind the text */}
              <div
                className="absolute -inset-8 z-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 85% 65% at 50% 50%, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.08) 55%, transparent 80%)',
                  transform: `translate(calc((var(--mouse-x) - 0.5) * -30px), calc((var(--mouse-y) - 0.5) * -30px))`,
                  transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Outer counter-rotating ring — majestic mouse parallax */}
              <div
                className="absolute inset-[-35%] z-0 rounded-full blur-[80px] pointer-events-none transition-all duration-[1500ms]"
                style={{
                  opacity: 0.45,
                  transform: `translate(calc((0.5 - var(--mouse-x)) * 60px), calc((0.5 - var(--mouse-y)) * 60px)) scale(1.1)`,
                  transition: 'transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 1500ms'
                }}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg at 50% 50%, #3b82f6 0deg, transparent 60deg, #a853ba 120deg, transparent 180deg, #e92a67 240deg, transparent 300deg, #3b82f6 360deg)',
                    animation: 'heroSpinCCW 30s linear infinite',
                  }}
                />
              </div>

              {/* Inner tracking conic bloom — base visible, intensifies on hover */}
              <div
                className="absolute inset-[-20%] z-0 rounded-full blur-[60px] pointer-events-none group-hover:scale-110 group-hover:blur-[80px] transition-all duration-[2000ms] opacity-70"
                style={{
                  transform: `translate(calc((var(--mouse-x) - 0.5) * -70px), calc((var(--mouse-y) - 0.5) * -70px)) scale(1.2)`,
                  transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1), opacity 2000ms, filter 2000ms'
                }}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 120deg, #e92a67 240deg, #2a8af6 360deg)',
                    animation: 'heroSpin 20s linear infinite',
                  }}
                />
              </div>

              {/* ── Line 1: IDEAS BECOME ── */}
              <span className="overflow-visible py-1 inline-block relative z-10">
                <span
                  className="inline-block"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: 'clamp(3rem, 6.2vw, 6.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                    background: isDark
                      ? 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
                      : 'linear-gradient(135deg, #000000 0%, #000000 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 60px rgba(139,92,246,0.6)) drop-shadow(0 10px 15px rgba(0,0,0,0.8))',
                    transform: isMounted ? 'translateY(0)' : 'translateY(110%)',
                    transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1)',
                    transitionDelay: '0.1s',
                  }}
                >
                  Ideas Become
                </span>
              </span>

              {/* ── Line 2: INFRASTRUCTURE — counter-flowing, serif ── */}
              <span className="overflow-visible py-1 inline-block relative z-10 mt-[-0.5rem]">
                <span
                  className="inline-block"
                  style={{
                    fontFamily: '"Playfair Display", "Cormorant Garamond", serif',
                    fontSize: 'clamp(4rem, 8.5vw, 9rem)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                    background: isDark
                      ? 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
                      : 'linear-gradient(135deg, #000000 0%, #000000 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 70px rgba(168,85,247,0.5)) drop-shadow(0 15px 25px rgba(0,0,0,0.9))',
                    transform: isMounted ? 'translateY(0)' : 'translateY(110%)',
                    transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1)',
                    transitionDelay: '0.22s',
                  }}
                >
                  Infrastructure
                </span>
              </span>
            </h1>
          </div>

        </div>

        {/* ── TAGLINE CARD ── */}
        <div className="mt-24 md:mt-40 max-w-2xl overflow-hidden relative z-20 mx-auto">
          <div
            className="p-8 md:p-12 border border-black/10 dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.025] backdrop-blur-xl rounded-2xl relative overflow-hidden group"
            style={{
              boxShadow: '0 0 0 0.5px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.12)',
              opacity: isMounted ? 1 : 0,
              transform: isMounted ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1)',
              transitionDelay: '0.55s',
            }}
          >
            {/* Top-edge gradient line on the card */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5) 30%, rgba(168,85,247,0.6) 60%, transparent)',
              }}
            />

            {/* Hover inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl" />

            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-black/40 dark:text-white/35 mb-6 block">
              The Architecture Directive
            </p>
            <p className="text-black/80 dark:text-white/75 text-xl md:text-[1.65rem] font-light leading-snug tracking-tight">
              We architect intelligent systems that think, automate, and scale.{' '}
              <span className="dark:text-white/45 text-black/40 italic">
                This is where ideas become infrastructure.
              </span>
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <div className="w-12 h-[1px]" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.6), rgba(168,85,247,0.4))' }} />
              <span
                className="font-medium text-sm tracking-widest uppercase text-black dark:text-white/80"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {siteConfig.name}
              </span>
              <div className="w-12 h-[1px]" style={{ background: 'linear-gradient(270deg, rgba(99,102,241,0.6), rgba(168,85,247,0.4))' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;