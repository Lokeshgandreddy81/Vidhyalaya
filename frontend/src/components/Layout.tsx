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
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { useFocus } from '../context/FocusContext';

const BrandLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[22px] h-[22px] text-slate-800 transition-transform group-hover:rotate-45 duration-500">
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
    <circle cx="12" cy="12" r="2.5" className="fill-slate-800 stroke-none" />
  </svg>
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

  if (isStudyMode) {
    return (
      <div className="fixed inset-0 flex text-slate-900 font-sans overflow-hidden" style={{ background: 'transparent' }}>
        {/* Aurora background for study mode */}
        <div className="app-aurora-root">
          <div className="app-aurora-layer" />
          <div className="app-aurora-noise" />
        </div>
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  const navItems = [
    { icon: MonitorPlay, label: 'Discovery', to: '/dashboard' },
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

      {/* ── Codex-style Bright Glass White Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 58 : 260 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full flex flex-col relative z-[100] shrink-0 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.76)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '4px 0 24px rgba(42, 64, 128, 0.05)',
        }}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center border-b border-black/[0.04] h-[65px] shrink-0 ${isCollapsed ? 'flex-col justify-center gap-1.5 px-1 py-2' : 'justify-between px-4 py-5'}`}>
          {!isCollapsed ? (
            <>
              <button 
                onClick={() => navigate('/')} 
                className="flex items-center gap-2.5 group text-left focus:outline-none"
              >
                <BrandLogo />
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[14px] font-black text-slate-800 uppercase tracking-widest leading-none mt-[2px]"
                >
                  Cortex
                </motion.span>
              </button>
              <button 
                onClick={() => setIsCollapsed(true)} 
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/40 active:scale-95 transition-all focus:outline-none"
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={18} strokeWidth={2.2} />
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
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/40 active:scale-95 transition-all focus:outline-none"
                title="Expand Sidebar"
              >
                <PanelLeftOpen size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className={`flex flex-col flex-1 overflow-y-auto pt-2 space-y-1.5 ${isCollapsed ? 'px-1.5' : 'px-2.5'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to ||
              (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));

             return (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="group relative w-full flex items-center h-[46px] rounded-lg transition-all duration-150"
                style={{
                  background: isActive ? 'rgba(78, 91, 255, 0.08)' : 'transparent',
                  boxShadow: isActive ? '0 1px 4px rgba(78, 91, 255, 0.06)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.04)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div className={`${isCollapsed ? 'w-full' : 'w-[50px]'} shrink-0 flex items-center justify-center`}>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{ color: isActive ? '#4e5bff' : '#475569' }}
                    className="transition-colors group-hover:!text-slate-900"
                  />
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[14px] tracking-tight whitespace-nowrap transition-colors"
                    style={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#4e5bff' : '#334155',
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
        <div className={`${isCollapsed ? 'px-1.5' : 'px-2.5'} pb-3`}>
          <button
            onClick={() => navigate('/sara')}
            className="group flex items-center w-full rounded-xl overflow-hidden transition-all duration-200"
            style={{
              padding: isCollapsed ? '12px 0' : '12px 14px',
              background: 'rgba(78,91,255,0.12)',
              border: '1px solid rgba(78,91,255,0.2)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(78,91,255,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(78,91,255,0.12)';
            }}
          >
            <Bot size={19} style={{ color: '#4e5bff', flexShrink: 0 }} />
            {!isCollapsed && (
              <span className="text-[14px] font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-500">Cortex Campus</span>
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
              className="h-full overflow-y-auto scroll-smooth"
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
