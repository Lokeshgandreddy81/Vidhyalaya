import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) {
    if (window.lenis) {
      window.lenis.scrollTo(el, { duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [activeId, setActiveId] = useState('home');
  const headerRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (location.pathname === '/resume') {
      setActiveId('resume');
    } else if (isHome && window.scrollY < 60) {
      setActiveId('home');
    }
  }, [location.pathname, isHome]);

  /* ── Section Tracking (IntersectionObserver) ───────────────────────── */
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    ['home', 'about', 'work', 'contact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  /* ── Scroll tracking ─────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const isScrolled = y > 60;
      
      if (isScrolled !== scrolled) setScrolled(isScrolled);
      
      if (headerRef.current) {
        headerRef.current.style.setProperty('--sp', `${Math.min((y / h) * 100, 100)}%`);
      }
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrolled]);


  const navItems = [
    { label: 'Home', id: 'home', num: '01' },
    { label: 'Collective', id: 'about', num: '02' },
    { label: 'Work', id: 'work', num: '03' },
    { label: 'Connect', id: 'contact', num: '04' },
    { label: 'Resume', route: '/resume', id: 'resume', num: '05' },
    { label: 'Dashboard', route: '/dashboard', id: 'dashboard', num: '06' },
  ];

  const handleNavClick = (item) => {
    if (item.route) {
      navigate(item.route);
    } else {
      if (!isHome) {
        navigate('/');
        setTimeout(() => scrollTo(item.id), 100);
      } else {
        scrollTo(item.id);
      }
    }
  };

  /* ─────────────────────────────────────────────────────────────── */
  /* Pill appearance tokens — adapt to scroll and theme             */
  /* ─────────────────────────────────────────────────────────────── */
  const pillBg = scrolled
    ? (isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.60)')
    : 'transparent';

  const pillBorder = scrolled
    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')
    : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)');

  const textPrimary = isDark ? 'rgba(255,255,255,0.90)' : (scrolled ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)');
  const textSecondary = isDark ? 'rgba(255,255,255,0.35)' : (scrolled ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.45)');
  const navHoverBg = isDark ? 'rgba(255,255,255,0.06)' : (scrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)');

  const isExpanded = !scrolled || isNavHovered;

  return (
    <>
      {/* ══ Floating Command Bar ══════════════════════════════════════ */}
      <header
        ref={headerRef}
        className="fixed bottom-6 sm:bottom-8 left-1/2 z-[100]"
        style={{
          transform: `translateX(-50%) scale(${scrolled ? 1.01 : 1})`,
          transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1)',
          maxWidth: '96vw',
        }}
      >
        {/* Bloom glow beneath */}
        <div className="absolute pointer-events-none" style={{
          bottom: '-14px', left: '5%', right: '5%', height: '28px',
          borderRadius: '50%',
          background: isDark ? 'linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.05), transparent)' : 'linear-gradient(to bottom, rgba(99,102,241,0.5), rgba(168,85,247,0.2), transparent)',
          filter: 'blur(16px)',
          opacity: scrolled ? 0.7 : 0.3,
          animation: 'navBloom 4s ease-in-out infinite',
          transition: 'opacity 1s ease',
          zIndex: 0,
        }} />
        {/* Beam line */}
        <div className="absolute pointer-events-none" style={{
          bottom: '-3px', left: '10%', right: '10%', height: '1px',
          background: isDark ? 'linear-gradient(90deg, transparent, #ffffff 25%, #ffffff 55%, #ffffff 80%, transparent)' : 'linear-gradient(90deg, transparent, #3b82f6 25%, #a855f7 55%, #ec4899 80%, transparent)',
          filter: 'blur(1.5px)',
          opacity: scrolled ? 0.8 : 0.3,
          animation: 'navBeam 3.5s ease-in-out infinite',
          transition: 'opacity 1s ease',
          zIndex: 0,
        }} />

        {/* ── Pill ─────────────────────────────────────────────────── */}
        <div
          className="relative z-10 overflow-hidden"
          style={{
            borderRadius: '999px',
            padding: scrolled ? '8px 10px 8px 14px' : '8px 10px 8px 14px',
            background: pillBg,
            backdropFilter: scrolled ? 'blur(56px) saturate(200%)' : 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: scrolled ? 'blur(56px) saturate(200%)' : 'blur(20px) saturate(140%)',
            border: `1px solid ${pillBorder}`,
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: scrolled
              ? `0 2px 24px rgba(0,0,0,0.25), 0 0 0 0.5px ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(168,85,247,0.15)'}`
              : `0 2px 12px rgba(0,0,0,0.1), 0 0 0 0.5px ${pillBorder}`,
          }}
        >
          {/* ── Hero aurora INSIDE the pill — same conic, small scale ── */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            {/* Spinning conic aurora — same as hero background */}
            <div
              className="absolute"
              style={{
                top: '50%', left: '50%',
                width: '300%', height: '300%',
                transform: 'translate(-50%, -50%)',
                animation: 'navAuroraRotate 20s linear infinite',
                background: 'conic-gradient(from 0deg at 50% 50%, #050917 0deg, #0d1a3a 40deg, #13053a 90deg, #0a0019 130deg, #06162e 180deg, #0e0430 220deg, #050917 260deg, #0b1832 310deg, #050917 360deg)',
                opacity: scrolled ? 0.0 : 0.85,
                transition: 'opacity 0.8s ease',
              }}
            />
            {/* Color bleed — matches hero blue/violet/pink */}
            <div
              className="absolute"
              style={{
                top: '-50%', right: '-20%',
                width: '80%', height: '200%',
                background: 'radial-gradient(ellipse, rgba(37,99,235,0.25) 0%, transparent 70%)',
                filter: 'blur(12px)',
                animation: 'navColorDrift 8s ease-in-out infinite',
                opacity: scrolled ? 0.0 : 1,
                transition: 'opacity 0.8s ease',
              }}
            />
            <div
              className="absolute"
              style={{
                bottom: '-60%', left: '-10%',
                width: '70%', height: '180%',
                background: 'radial-gradient(ellipse, rgba(109,40,217,0.2) 0%, transparent 70%)',
                filter: 'blur(10px)',
                animation: 'navColorDrift 10s ease-in-out infinite reverse',
                opacity: scrolled ? 0.0 : 1,
                transition: 'opacity 0.8s ease',
              }}
            />
          </div>

          {/* Spinning chromatic border (on scroll) */}
          <div className="absolute inset-0 z-0 pointer-events-none rounded-full" style={{
            padding: '1px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          }}>
            <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2" style={{
              background: 'conic-gradient(from 0deg, transparent 40%, rgba(59,130,246,0.9), rgba(168,85,247,1), rgba(236,72,153,0.9), transparent 60%)',
              animation: 'navSpin 3s linear infinite',
              opacity: scrolled ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }} />
          </div>

          {/* Scroll progress bar */}
          <div className="absolute top-0 left-0 pointer-events-none z-20" style={{
            height: '1.5px', borderRadius: '0 2px 2px 0',
            width: 'var(--sp, 0%)',
            background: isDark ? '#ffffff' : 'linear-gradient(90deg, #3b82f6, #a855f7 55%, #ec4899)',
            boxShadow: isDark ? '0 0 8px rgba(255,255,255,0.6)' : '0 0 8px rgba(99,102,241,0.8)',
            opacity: scrolled ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }} />

          {/* ── Row ───────────────────────────────────────────────── */}
          <div
            className="relative z-10 flex items-center gap-0"
            onMouseEnter={() => setIsNavHovered(true)}
            onMouseLeave={() => setIsNavHovered(false)}
          >

            {/* LEFT: Live dot ──────────────────────────────────────── */}
            <div className="flex items-center flex-shrink-0 pr-3" style={{
              borderRight: `1px solid ${pillBorder}`,
            }}>
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
                <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
              </div>
            </div>

            {/* CENTER: Nav links ────────────────────────────────────── */}
            <nav className="flex items-center px-1">
              {navItems.map((item, i) => {
                const isActive = activeId === item.id;
                const isItemHovered = hoveredIdx === i;
                const showItem = isExpanded || isActive;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="relative group rounded-full overflow-hidden transition-all duration-500"
                    style={{
                      background: isItemHovered ? navHoverBg : 'transparent',
                      maxWidth: showItem ? '140px' : '0px',
                      padding: showItem ? '8px 14px' : '8px 0px',
                      opacity: showItem ? 1 : 0,
                      margin: showItem ? '0 2px' : '0 0px',
                      pointerEvents: showItem ? 'auto' : 'none',
                      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center whitespace-nowrap min-w-max relative w-full h-full">
                      {/* Active indicator */}
                      {isActive && (
                        <span
                          className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{
                            background: isDark ? '#ffffff' : 'linear-gradient(90deg, #3b82f6, #a855f7)',
                            boxShadow: isDark ? '0 0 4px rgba(255,255,255,0.8)' : '0 0 4px rgba(99,102,241,0.9)',
                            transform: 'translateY(-4px)'
                          }}
                        />
                      )}
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.2em] block transition-all duration-300"
                        style={{
                          color: isActive ? textPrimary : isItemHovered ? textPrimary : textSecondary,
                          fontWeight: isActive ? '600' : '400',
                          transform: isItemHovered ? 'translateY(-1px)' : 'translateY(0)',
                        }}
                      >
                        {item.label}
                      </span>
                      {/* Sweep underline */}
                      <span
                        className="absolute bottom-[-4px] left-0 right-0 h-[1px] rounded-full origin-left transition-all duration-400"
                        style={{
                          background: isDark ? '#ffffff' : 'linear-gradient(90deg, #3b82f6, #a855f7)',
                          transform: isItemHovered ? 'scaleX(1)' : 'scaleX(0)',
                          opacity: isItemHovered ? 0.8 : 0,
                          boxShadow: isDark ? '0 0 6px rgba(255,255,255,0.5)' : '0 0 6px rgba(99,102,241,0.6)',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* RIGHT: Theme + Menu ─────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0 pl-2" style={{
              borderLeft: `1px solid ${pillBorder}`,
            }}>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="group relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-400 hover:scale-110 active:scale-95"
                style={{
                  background: isDark ? 'rgba(250,204,21,0.1)' : 'rgba(255,255,255,0.10)',
                  border: isDark ? '1px solid rgba(250,204,21,0.25)' : '1px solid rgba(255,255,255,0.18)',
                }}
              >
                {isDark
                  ? <Sun className="w-3.5 h-3.5 text-yellow-300 group-hover:rotate-90 transition-transform duration-700" />
                  : <Moon className="w-3.5 h-3.5 text-indigo-300 group-hover:-rotate-12 transition-transform duration-500" />
                }
              </button>

            </div>
          </div>
        </div>
      </header >



      {/* ── CSS Keyframes ─────────────────────────────────────────────── */}
      < style > {`
        @keyframes navBloom {
          0%, 100% { opacity: 0.35; transform: scaleY(0.7) scaleX(0.92); }
          50%       { opacity: 0.7;  transform: scaleY(1)   scaleX(1.04); }
        }
        @keyframes navBeam {
          0%, 100% { opacity: 0.45; transform: scaleX(0.9); }
          50%       { opacity: 0.9;  transform: scaleX(1.05); }
        }
        @keyframes navSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes navAuroraRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes navColorDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(15%, 10%) scale(1.1); }
        }
      `}</style >
    </>
  );
};

export default Header;