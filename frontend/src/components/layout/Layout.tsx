import React from 'react';
import { 
  MonitorPlay, 
  GraduationCap, 
  Library, 
  CalendarDays, 
  Settings, 
  FileCheck, 
  Sparkles,
  BookOpen,
  Zap,
  Target,
  Bot,
  ChevronLeft,
  ChevronRight,
  User,
  Database,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command';
import { useFocus } from '../../context/FocusContext';

const BrandLogo: React.FC = () => (
  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-indigo-50 border border-slate-100 group-hover:border-indigo-100/50 transition-all duration-300 shadow-sm">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[18px] h-[18px] text-slate-700 group-hover:text-indigo-600 transition-all group-hover:rotate-[30deg] duration-500">
      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
      <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
      <circle cx="12" cy="12" r="2.2" className="fill-slate-700 group-hover:fill-indigo-600 stroke-none transition-colors" />
    </svg>
  </div>
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(() => location.pathname === '/create');

  // Auto-collapse on /create, auto-expand on other pages
  React.useEffect(() => {
    setIsCollapsed(location.pathname === '/create');
  }, [location.pathname]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { isZenMode } = useFocus();
  const isStudyMode = location.pathname.startsWith('/study/');

  const navItems = [
    { icon: MonitorPlay, label: 'Developer Roadmaps', to: '/dashboard' },
    { icon: GraduationCap, label: 'Classrooms', to: '/courses' },
    { icon: Library, label: 'Archive', to: '/library' },
    { icon: CalendarDays, label: 'Schedule', to: '/schedule' },
    { icon: Settings, label: 'Settings', to: '/settings' },
  ];

  const CommandPalette = (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search... (Cmd+K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem key={item.label} onSelect={() => { navigate(item.to); setOpen(false); }}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Cortex Campus Actions (Contextual)">
          <CommandItem onSelect={() => { document.dispatchEvent(new CustomEvent('sara-action', { detail: 'Provide a concise, high-yield summary of this page.' })); setOpen(false); }}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Summarize</span>
          </CommandItem>
          <CommandItem onSelect={() => { document.dispatchEvent(new CustomEvent('sara-action', { detail: 'Explain the core technical concepts of this module in simple terms.' })); setOpen(false); }}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Explain</span>
          </CommandItem>
          <CommandItem onSelect={() => { document.dispatchEvent(new CustomEvent('sara-action', { detail: 'Give me a quick 3-question mastery check based on what I just read.' })); setOpen(false); }}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Quiz Me</span>
          </CommandItem>
          <CommandItem onSelect={() => { document.dispatchEvent(new CustomEvent('sara-action', { detail: 'What should I focus on next to master this module?' })); setOpen(false); }}>
            <Target className="mr-2 h-4 w-4" />
            <span>Next Steps</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );

  return (
    <div className="flex h-screen w-screen font-sans overflow-hidden relative" style={{ background: 'transparent' }}>
      
      {/* ── AURORA ATMOSPHERE — Exact Landing Page Replica ── */}
      <div className="app-aurora-root">
        <div className="app-aurora-layer" />
        <div className="app-aurora-noise" />
      </div>

      {/* Floating Toggle Button when Collapsed */}
      <AnimatePresence>
        {isCollapsed && !isStudyMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={() => setIsCollapsed(false)}
            className="fixed top-4 left-4 z-[110] p-2.5 rounded-xl text-slate-500 hover:text-slate-900 active:scale-95 transition-all focus:outline-none"
            style={{
              background: 'rgba(255, 255, 255, 0.76)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 4px 20px rgba(42, 64, 128, 0.08)',
            }}
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={18} strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Codex-style Bright Glass White Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: (isCollapsed || isStudyMode) ? 0 : 260 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full flex flex-col relative z-[100] shrink-0 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(35px)',
          WebkitBackdropFilter: 'blur(35px)',
          borderRight: (isCollapsed || isStudyMode) ? '0px solid transparent' : '1px solid rgba(0, 0, 0, 0.04)',
          boxShadow: (isCollapsed || isStudyMode) ? 'none' : '4px 0 24px rgba(0, 0, 0, 0.01)',
        }}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center border-b border-slate-100/60 h-[65px] shrink-0 ${isCollapsed ? 'flex-col justify-center gap-1.5 px-1 py-2' : 'justify-between px-4 py-5'}`}>
          {!isCollapsed ? (
            <>
              <button 
                onClick={() => navigate('/')} 
                className="flex items-center gap-3 group text-left focus:outline-none"
              >
                <BrandLogo />
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mt-[2px] group-hover:text-indigo-600 transition-colors duration-300"
                >
                  Cortex
                </motion.span>
              </button>
              <button 
                onClick={() => setIsCollapsed(true)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-100 active:scale-95 transition-all focus:outline-none"
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={17} strokeWidth={2} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full pt-1">
              <button 
                onClick={() => navigate('/')} 
                className="group focus:outline-none" 
                title="Go to Landing Page"
              >
                <BrandLogo />
              </button>
              <button 
                onClick={() => setIsCollapsed(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-100 active:scale-95 transition-all focus:outline-none"
                title="Expand Sidebar"
              >
                <PanelLeftOpen size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className={`flex flex-col flex-1 overflow-y-auto pt-4 space-y-1.5 ${isCollapsed ? 'px-1.5' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to ||
              (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));

             return (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="group relative w-full flex items-center h-[44px] rounded-xl transition-all duration-300 focus:outline-none cursor-pointer"
                style={{
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(78, 91, 255, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)' 
                    : 'transparent',
                  border: isActive ? '1px solid rgba(78, 91, 255, 0.12)' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 12px -2px rgba(78, 91, 255, 0.04)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Active indicator bar */}
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="active-bar-indicator"
                    className="absolute left-1 top-[13px] bottom-[13px] w-[3px] rounded-full bg-gradient-to-b from-[#4e5bff] to-[#8b5cf6] shadow-[0_0_8px_rgba(78,91,255,0.5)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}

                <div className={`${isCollapsed ? 'w-full' : 'w-[28px] mr-2.5'} shrink-0 flex items-center justify-center`}>
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{ color: isActive ? '#4e5bff' : '#64748b' }}
                    className="transition-all duration-300 group-hover:scale-110 group-hover:text-slate-900"
                  />
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] tracking-tight whitespace-nowrap transition-colors duration-250"
                    style={{
                      fontWeight: isActive ? 650 : 500,
                      color: isActive ? '#0f172a' : '#64748b',
                    }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        {/* SARA Button */}
        <div className={`${isCollapsed ? 'px-1.5' : 'px-3'} pb-5`}>
          <button
            onClick={() => navigate('/sara')}
            className="group relative flex items-center w-full rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            style={{
              padding: isCollapsed ? '12px 0' : '12px 16px',
              background: 'linear-gradient(135deg, rgba(78,91,255,0.07) 0%, rgba(139,92,246,0.07) 100%)',
              border: '1px solid rgba(78,91,255,0.15)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(78,91,255,0.12) 0%, rgba(139,92,246,0.12) 100%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.28)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(78,91,255,0.07) 0%, rgba(139,92,246,0.07) 100%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.15)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            {/* Subtle animated neon border line effect inside */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <Bot size={18} className="text-[#4e5bff] group-hover:rotate-6 transition-transform duration-300 flex-shrink-0" />
            
            {!isCollapsed && (
              <div className="flex flex-col items-start pl-3 text-left">
                <span className="text-[13px] font-black tracking-wide text-[#4e5bff] group-hover:text-[#3b46ff] transition-colors">
                  Cortex Campus
                </span>
                <span className="text-[9px] font-semibold text-slate-400 tracking-normal group-hover:text-slate-500 transition-colors mt-0.5">
                  AI Study Assistant
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                Cortex Campus
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className={isStudyMode ? "h-full w-full overflow-hidden" : "h-full overflow-y-auto scroll-smooth"}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {CommandPalette}
    </div>
  );
};

export default Layout;
