import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { label: 'Product', id: 'product' },
    { label: 'Architecture', id: 'architecture' },
    { label: 'Research', id: 'research' },
  ];

  const handleNav = (item) => {
    setIsMenuOpen(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => scrollTo(item.id), 150);
    } else {
      scrollTo(item.id);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled
            ? 'bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => isHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              V
            </div>
            <span className="text-[13px] font-semibold text-white tracking-tight">
              vidhyal.ai
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400 mono">LIVE</span>
            </span>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full px-1 py-1">
            {links.map(item => (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className="px-4 py-1.5 rounded-full text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border-none bg-transparent"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.hash = '/dashboard'}
              className="hidden sm:flex items-center gap-2 h-9 px-5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-zinc-100 active:scale-[0.97] transition-all cursor-pointer border-none shimmer"
            >
              Open App
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 hover:text-white cursor-pointer border-none"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] bg-[#09090b]/95 backdrop-blur-3xl md:hidden flex flex-col pt-20 px-8"
          >
            <div className="flex flex-col gap-1 mt-8">
              {links.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item)}
                  className="text-left text-2xl font-semibold text-zinc-400 hover:text-white py-4 border-b border-white/[0.04] bg-transparent border-x-0 border-t-0 cursor-pointer transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setIsMenuOpen(false); window.location.hash = '/dashboard'; }}
                className="mt-8 h-12 rounded-xl bg-white text-black text-[14px] font-semibold cursor-pointer border-none"
              >
                Open App →
              </button>
            </div>
            <p className="mt-auto pb-8 text-[11px] text-zinc-600 mono">
              © 2026 vidhyal.ai
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;