import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Hero = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      id="home"
      className="min-h-screen w-full relative z-50 dark:bg-[#050505] bg-[#fafafa] transition-colors duration-500 ease-out flex flex-col justify-center items-center overflow-hidden"
    >
      {/* ── Ultra-Subtle Dot Grid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        zIndex: 1
      }} />

      {/* ── Pristine Centered Content ── */}
      <div
        className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center max-w-4xl"
        style={{
          opacity: isMounted ? 1 : 0,
          transform: isMounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Subtle Mono Tag */}
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400 mb-8 font-medium">
          Adaptive Learning Architecture
        </span>

        {/* Majestic Grand Typography */}
        <h1 className="leading-[1.1] tracking-tight text-black dark:text-white font-serif max-w-3xl">
          <span className="block text-[42px] md:text-[84px] font-light tracking-tighter">Where ideas become</span>
          <span className="block text-[48px] md:text-[96px] font-light italic text-blue-600 dark:text-blue-400 mt-2">infrastructure.</span>
        </h1>

        {/* Clean Legible Subtitle */}
        <p className="text-black/60 dark:text-white/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mt-8">
          Vidhyalaya is a scholastic engine engineered to translate unstructured complexity into structured mastery using adaptive, type-safe AI roadmaps.
        </p>

        {/* Premium Minimal CTA */}
        <div className="mt-12">
          <button
            onClick={() => window.location.hash = '/dashboard'}
            className="group relative flex items-center gap-3 px-8 py-3.5 rounded-full dark:bg-white bg-black dark:text-black text-white font-mono text-[10px] uppercase tracking-[0.25em] hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
          >
            <span>Deploy Dashboard</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;