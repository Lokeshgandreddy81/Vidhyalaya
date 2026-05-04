import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import siteConfig from '../config/siteConfig';

/* ─── Animated index number ──────────────────────────────────────────────── */
const AnimatedIndex = ({ num, active, dark }) => (
  <span
    className="font-mono text-sm font-bold transition-all duration-500"
    style={{
      color: active
        ? '#3b82f6'
        : dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      transform: active ? 'scale(1.2)' : 'scale(1)',
      display: 'block',
    }}
  >
    {num}
  </span>
);

/* ─── Manifesto Card ─────────────────────────────────────────────────────── */
const ManifestoCard = ({ index, section, dark }) => {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect(); // Trigger once to prevent scroll jitter
        }
      },
      { threshold: 0.3 }
    );
    if (cardRef.current) obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-default transition-all duration-700 pl-8 py-2"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.9s ease ${index * 200}ms, transform 0.9s ease ${index * 200}ms`,
      }}
    >
      {/* Glowing left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all duration-700"
        style={{
          background: hovered
            ? 'linear-gradient(to bottom, #3b82f6, #a78bfa, transparent)'
            : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          boxShadow: hovered ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
        }}
      />

      {/* Index row */}
      <div className="flex items-center gap-4 mb-5">
        <AnimatedIndex num={`0${index + 1}`} active={hovered} dark={dark} />
        <div
          className="h-[1px] flex-1 transition-all duration-700"
          style={{
            background: hovered
              ? 'linear-gradient(to right, #3b82f6, transparent)'
              : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            transform: hovered ? 'scaleX(1)' : 'scaleX(0.3)',
            transformOrigin: 'left',
          }}
        />
      </div>

      {/* Title */}
      <h3
        className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.1] mb-5 transition-all duration-700"
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          color: dark
            ? (hovered ? '#fff' : 'rgba(255,255,255,0.85)')
            : (hovered ? '#000000' : 'rgba(0,0,0,0.75)'),
          transform: hovered ? 'skewX(-3deg) translateX(8px)' : 'skewX(0deg) translateX(0)',
        }}
      >
        {section.title}
      </h3>

      {/* Description */}
      <p
        className="font-mono text-sm leading-relaxed transition-all duration-500"
        style={{
          color: hovered
            ? (dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)')
            : (dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'),
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        {section.description}
      </p>

      {/* Sweep underline */}
      <div
        className="mt-6 h-[1px] rounded-full transition-all duration-700"
        style={{
          background: 'linear-gradient(to right, #3b82f6, #a78bfa)',
          width: hovered ? '100%' : '0%',
        }}
      />
    </div>
  );
};

/* ─── Main AboutSection ───────────────────────────────────────────────────── */
const AboutSection = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardRef = useRef(null);

  // Antigravity Parallax State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [isHoveringCard, setIsHoveringCard] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation (-10 to 10 degrees)
    const rY = ((x / rect.width) - 0.5) * 20;
    const rX = ((y / rect.height) - 0.5) * -20;

    setRotateX(rX);
    setRotateY(rY);
    setGlareX((x / rect.width) * 100);
    setGlareY((y / rect.height) * 100);
  };

  const handleMouseEnter = () => setIsHoveringCard(true);
  const handleMouseLeave = () => {
    setIsHoveringCard(false);
    setRotateX(0);
    setRotateY(0);
    setGlareX(50);
    setGlareY(50);
  };

  return (
    <section
      id="about"
      className="w-full relative z-30 overflow-hidden transition-colors duration-700"
      style={{ background: dark ? '#000000' : '#ffffff' }}
    >
      <div className="container mx-auto px-6 md:px-12 max-w-[1600px] py-24 md:py-32">

        {/* Section header */}
        <div className="mb-16 md:mb-24">
          <span
            className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6 block transition-colors duration-700"
            style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
          >
            System Identity
          </span>
          <h2
            className="text-7xl md:text-[10rem] font-light tracking-tighter leading-none transition-colors duration-700"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              color: dark ? '#ffffff' : '#000000',
            }}
          >
            The Collective
          </h2>
        </div>

        {/* Manifesto Cards — Now Centered */}
        <div className="max-w-4xl mx-auto flex flex-col gap-14 md:gap-20 pt-2">
          {siteConfig.aboutSections.map((section, i) => (
            <ManifestoCard key={i} index={i} section={section} dark={dark} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;