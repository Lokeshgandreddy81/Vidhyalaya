import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Database, Network, Bot } from 'lucide-react';

interface SaraLayoutProps {
  children: React.ReactNode;
}

const SaraLayout: React.FC<SaraLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // On the vault route, render children full-screen — no sidebar overlay
  if (location.pathname === '/sara/vault') {
    return (
      <div className="flex h-screen w-screen font-sans overflow-hidden relative aurora-silk">
        {children}
      </div>
    );
  }

  // SARA Home — full layout with glass sidebar
  return (
    <div className="flex h-screen w-screen font-sans overflow-hidden relative aurora-silk">
      
      {/* ── SARA Side Dashboard ────────────────────────────────── */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-[280px] h-full glass-panel border-r border-white/20 flex flex-col relative z-[100] shadow-2xl shrink-0 backdrop-blur-xl bg-white/40"
      >
        <div className="h-[76px] flex items-center px-6 border-b border-white/20 overflow-hidden shrink-0">
          <Link to="/sara" className="flex items-center gap-3 group shrink-0">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-950/30">
              <Bot size={16} className="animate-pulse text-indigo-100" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-black text-indigo-950 tracking-[0.18em] uppercase leading-none">
                Cortex
              </span>
              <span className="text-[8px] font-bold text-indigo-600 tracking-[0.25em] uppercase mt-1 leading-none">
                Campus
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="relative flex flex-col flex-1 overflow-y-auto pt-6 px-3 space-y-2 scroll-smooth custom-scrollbar">
          
          {/* Escape hatch */}
          <button
            onClick={() => navigate('/dashboard')}
            className="group relative w-full flex items-center h-[48px] rounded-xl transition-all duration-300 text-slate-500 hover:bg-white/50 hover:text-indigo-900 border border-transparent hover:border-white/50 mb-6"
          >
            <div className="w-[56px] shrink-0 flex items-center justify-center">
              <ArrowLeft size={18} strokeWidth={2} />
            </div>
            <span className="text-[12px] font-bold tracking-tight whitespace-nowrap">
              Back to Cortex
            </span>
          </button>

          {/* SARA nav items */}
          {[
            { icon: Database, label: 'University Vault', to: '/sara/vault' },
            { icon: Network, label: 'Connect Uni', to: '/admin', badge: 'In Dev' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className={`group relative w-full flex items-center h-[48px] rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-indigo-600/10 text-indigo-900 border border-indigo-200/50 shadow-sm'
                    : 'text-slate-500 hover:bg-white/40 hover:text-indigo-900 border border-transparent'
                  }`}
              >
                <div className="w-[56px] shrink-0 flex items-center justify-center">
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-indigo-600' : ''} />
                </div>
                <span className="text-[12px] font-bold tracking-tight whitespace-nowrap flex-1 text-left">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="mr-3 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-tight">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="sara-active-bar"
                    className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SaraLayout;
