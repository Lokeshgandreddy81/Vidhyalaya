import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Section Tracking (IntersectionObserver) ───────────────────────── */
  useEffect(() => {
    if (!isHome) return;
    
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
  }, [isHome]);

  const navItems = [
    { label: 'Home', id: 'home' },
    { label: 'Collective', id: 'about' },
    { label: 'Work', id: 'work' },
    { label: 'Connect', id: 'contact' },
  ];

  const handleNavClick = (item) => {
    setIsMenuOpen(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => scrollTo(item.id), 100);
    } else {
      scrollTo(item.id);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-300 ${
          scrolled || isMenuOpen
            ? 'bg-[#fafafa]/90 dark:bg-[#050505]/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Left: Branding */}
          <div 
            onClick={() => {
              setIsMenuOpen(false);
              if (isHome) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigate('/');
              }
            }}
            className="font-mono text-[11px] font-black uppercase tracking-[0.3em] cursor-pointer text-black dark:text-white"
          >
            Vidhyalaya
          </div>

          {/* Center: Minimal Navigation links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`relative font-mono text-[9px] uppercase tracking-[0.2em] transition-all cursor-pointer border-none bg-transparent pb-1 ${
                    isActive
                      ? 'text-black dark:text-white font-bold'
                      : 'text-black/40 dark:text-white/30 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Theme + Shortcut + Hamburger */}
          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white transition-all cursor-pointer border-none bg-transparent"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={() => window.location.hash = '/dashboard'}
              className="hidden sm:block px-5 py-2 rounded-full border border-black/10 dark:border-white/10 text-black dark:text-white font-mono text-[9px] uppercase tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Classroom
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex items-center justify-center text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer border-none bg-transparent"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[99] bg-[#fafafa]/95 dark:bg-[#050505]/95 backdrop-blur-md md:hidden pt-28 px-8 flex flex-col justify-between pb-12 transition-all">
          <div className="flex flex-col gap-8">
            {navItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`text-left font-mono text-[14px] uppercase tracking-[0.25em] bg-transparent border-none py-2 ${
                    isActive
                      ? 'text-blue-500 font-bold'
                      : 'text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                window.location.hash = '/dashboard';
              }}
              className="text-left font-mono text-[14px] uppercase tracking-[0.25em] bg-transparent border-none py-2 text-emerald-500 font-bold"
            >
              Classroom
            </button>
          </div>
          <div className="font-mono text-[9px] text-black/40 dark:text-white/30 uppercase tracking-widest border-t border-black/5 dark:border-white/5 pt-6">
            © {new Date().getFullYear()} VIDHYAL.AI ALL RIGHTS RESERVED.
          </div>
        </div>
      )}
    </>
  );
};

export default Header;