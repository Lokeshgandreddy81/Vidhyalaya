import React, { useRef, useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import siteConfig from '../config/siteConfig';
import VideoModal from './VideoModal';

/* ─── Themed link ────────────────────────────────────────────────────────── */
const NavLink = ({ href, children, dark }) => (
  <a
    href={href}
    target={href.startsWith('mailto') ? '_self' : '_blank'}
    rel="noopener noreferrer"
    className="group flex items-center gap-1.5 w-fit transition-all duration-300"
    style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}
    onMouseEnter={e => { e.currentTarget.style.color = dark ? '#ffffff' : '#0a0a0a'; }}
    onMouseLeave={e => { e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'; }}
  >
    <span className="font-mono text-sm md:text-base tracking-tight">{children}</span>
    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300" />
  </a>
);

/* ─── Main ContactSection ────────────────────────────────────────────────── */
const ContactSection = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [nameHovered, setNameHovered] = useState(false);
  const [videoModal, setVideoModal] = useState({ open: false, videoId: '', title: '', siteUrl: '' });

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect(); // Trigger once to prevent scroll jitter
        }
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleMouse = (e) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (sectionRef.current) {
            sectionRef.current.style.setProperty('--mx', e.clientX / window.innerWidth);
            sectionRef.current.style.setProperty('--my', e.clientY / window.innerHeight);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const links = {
    connect: [
      { label: 'Email', href: `mailto:${siteConfig.email}` },
      { label: 'LinkedIn', href: siteConfig.linkedIn },
      { label: 'GitHub', href: siteConfig.github },
    ],
    explore: siteConfig.workExperiences.map((project, idx) => ({
      label: `System 0${idx + 1}`,
      href: '#',
      onClick: () => setVideoModal({
        open: true,
        videoId: 'kulGpku0nCg', // Placeholder for now, can be specific if needed
        title: `${project.company} — Vidhyalaya`,
        siteUrl: 'https://vidhyalaya.ai',
        siteLabel: `Explore ${project.company}`,
      }),
    })),
  };

  const bg = dark ? '#000000' : '#ffffff';
  const text = dark ? '#ffffff' : '#0a0a0a';
  const sub = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative w-full overflow-hidden z-40 flex flex-col min-h-screen transition-colors duration-700"
      style={{ background: bg }}
    >
      {/* ── Parallax orb background (only in dark mode) ─────────────── */}
      {dark && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Layer 1 — blue/purple core */}
          <div className="absolute rounded-full mix-blend-screen" style={{
            width: '80vw', height: '80vw', top: '20%', left: '20%',
            transform: 'translate(calc((var(--mx, 0.5) - 0.5) * -40px), calc((var(--my, 0.5) - 0.5) * -40px))',
            background: 'radial-gradient(circle at center, #2a8af6 0%, #a853ba 50%, transparent 75%)',
            filter: 'blur(90px)', opacity: visible ? 0.18 : 0,
            transition: 'opacity 2s ease, transform 2s cubic-bezier(0.16,1,0.3,1)',
            animation: 'contactSpin 35s linear infinite',
          }} />
          {/* Layer 2 — pink */}
          <div className="absolute rounded-full mix-blend-screen" style={{
            width: '45vw', height: '45vw', top: '50%', left: '60%',
            transform: 'translate(calc((var(--mx, 0.5) - 0.5) * -90px), calc((var(--my, 0.5) - 0.5) * -90px))',
            background: 'radial-gradient(circle at center, #e92a67 0%, #a853ba 60%, transparent 80%)',
            filter: 'blur(70px)', opacity: visible ? 0.14 : 0,
            transition: 'opacity 2s ease, transform 1.4s cubic-bezier(0.16,1,0.3,1)',
          }} />
          {/* Layer 3 — cyan */}
          <div className="absolute rounded-full mix-blend-screen" style={{
            width: '30vw', height: '30vw', top: '10%', left: '70%',
            transform: 'translate(calc((var(--mx, 0.5) - 0.5) * -140px), calc((var(--my, 0.5) - 0.5) * -140px))',
            background: 'radial-gradient(circle at center, #06b6d4 0%, #3b82f6 60%, transparent 80%)',
            filter: 'blur(50px)', opacity: visible ? 0.15 : 0,
            transition: 'opacity 2s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1)',
          }} />
          {/* Layer 4 — gold */}
          <div className="absolute rounded-full mix-blend-screen" style={{
            width: '25vw', height: '25vw', top: '70%', left: '10%',
            transform: 'translate(calc((var(--mx, 0.5) - 0.5) * -70px), calc((var(--my, 0.5) - 0.5) * -70px))',
            background: 'radial-gradient(circle at center, #f59e0b 0%, #8b5cf6 60%, transparent 80%)',
            filter: 'blur(60px)', opacity: visible ? 0.10 : 0,
            transition: 'opacity 2s ease, transform 1.2s cubic-bezier(0.16,1,0.3,1)',
          }} />
          {/* SVG star field + crosses */}
          <svg className="absolute inset-0 w-full h-full" style={{
            transform: 'translate(calc((var(--mx, 0.5) - 0.5) * -8px), calc((var(--my, 0.5) - 0.5) * -8px))',
            transition: 'transform 3s cubic-bezier(0.16,1,0.3,1)', opacity: visible ? 0.15 : 0,
          }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <circle key={i} cx={`${((i * 37 + 11) % 97)}%`} cy={`${((i * 53 + 7) % 93)}%`} r={i % 3 === 0 ? 1.5 : 0.8} fill="rgba(255,255,255,0.6)" />
            ))}
          </svg>
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }} />
        </div>
      )}

      {/* Light mode — subtle dot grid */}
      {!dark && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>
      )}

      {/* top fade */}
      <div className="absolute inset-x-0 top-0 h-24 z-0 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, ${bg}, transparent)` }} />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 container mx-auto max-w-[1600px] px-8 md:px-14">

        {/* Top strip */}
        <div className="flex items-center justify-between pt-20 md:pt-28 pb-16 md:pb-24"
          style={{
            borderBottom: `1px solid ${border}`,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1s ease 0.1s, transform 1s ease 0.1s',
          }}
        >
          <div>
            <span className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase block mb-4"
              style={{ color: sub }}>
              // System Awaiting Next Directive
            </span>
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-light leading-tight max-w-lg transition-colors duration-700"
              style={{ fontFamily: 'Cormorant Garamond, serif', color: text }}
            >
              Ready to build<br />
              <span style={{
                color: 'transparent',
                WebkitTextStroke: dark ? '1.5px rgba(255,255,255,0.35)' : '1.5px rgba(0,0,0,0.25)',
                fontStyle: 'italic',
              }}>something great?</span>
            </h2>
          </div>

          <div className="hidden md:flex flex-col items-end gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: sub }}>
                Open to collaboration
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: sub }}>
              {siteConfig.location}
            </span>
          </div>
        </div>

        {/* Link grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-2 gap-12 md:gap-8 py-16 md:py-20"
          style={{
            borderBottom: `1px solid ${border}`,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 1s ease 0.25s, transform 1s ease 0.25s',
          }}
        >
          {/* Explore */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] block mb-2" style={{ color: sub }}>Explore</span>
            {links.explore.map(l => l.onClick ? (
              <button
                key={l.label}
                onClick={l.onClick}
                className="group flex items-center gap-1.5 w-fit transition-all duration-300 cursor-pointer"
                style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', background: 'none', border: 'none', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = dark ? '#ffffff' : '#0a0a0a'}
                onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'}
              >
                <span className="font-mono text-sm md:text-base tracking-tight">{l.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300" />
              </button>
            ) : (
              <NavLink key={l.label} href={l.href} dark={dark}>{l.label}</NavLink>
            ))}
          </div>

          {/* Tagline */}
          <div className="flex flex-col justify-end items-end text-right">
            <p className="font-mono text-xs leading-relaxed max-w-sm" style={{ color: sub }}>
              {siteConfig.tagline}
            </p>
          </div>
        </div>

        {/* Footer strip */}
        <div
          className="flex items-center justify-between py-6"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.4s' }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>
            All Rights Reserved
          </p>
        </div>
      </div>

      {/* ── Giant footer name ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full overflow-hidden mt-auto">
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1.2s ease 0.5s, transform 1.2s ease 0.5s',
        }}>
          {/* Two overlaid spans — GANDREDDY ↔ LOKESH cross-fade on hover */}
          <div
            className="group relative w-full text-center select-none cursor-default"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(4rem, 14vw, 18rem)',
              lineHeight: '0.82',
              letterSpacing: '-0.02em',
            }}
          >
            {/* GANDREDDY — solid black in light mode, outlined in dark mode */}
            <span
              className="block w-full transition-all duration-500 group-hover:opacity-0"
              style={{
                fontWeight: 600,
                color: '#000000',
                WebkitTextStroke: dark ? '3px #ffffff' : '0',
              }}
            >
              VIDHYALAYA
            </span>

            {/* LOKESH — fades in on hover, positioned on top */}
            <span
              className="absolute inset-0 flex items-center justify-center w-full opacity-0 transition-all duration-500 group-hover:opacity-100"
              style={{
                fontWeight: 600,
                fontStyle: 'italic',
                color: dark ? '#ffffff' : '#000000',
                WebkitTextStroke: '0',
              }}
            >
              SARA
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes contactSpin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
      `}</style>

      {/* ── Video Modal ────────────────────────────────────────────────── */}
      <VideoModal
        isOpen={videoModal.open}
        onClose={() => setVideoModal(v => ({ ...v, open: false }))}
        videoId={videoModal.videoId}
        title={videoModal.title}
        siteUrl={videoModal.siteUrl}
        siteLabel={videoModal.siteLabel}
      />
    </section>
  );
};

export default ContactSection;
