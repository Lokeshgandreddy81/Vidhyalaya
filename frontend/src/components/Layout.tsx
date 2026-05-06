import React from 'react';
import { MonitorPlay, GraduationCap, Library, CalendarDays, Settings, FileCheck, PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Sparkles, BookOpen, Zap, Target } from 'lucide-react';
import { useFocus } from '../context/FocusContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
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
    { icon: MonitorPlay, label: 'Classrooms', to: '/dashboard' },
    { icon: GraduationCap, label: 'Courses', to: '/courses' },
    { icon: Library, label: 'Library', to: '/library' },
    { icon: CalendarDays, label: 'Schedule', to: '/schedule' },
    { icon: FileCheck, label: 'Exam Mode', to: '/exam' },
    { icon: Settings, label: 'Settings', to: '/settings' },
  ];

  if (isStudyMode || isZenMode) {
    return (
      <div className="fixed inset-0 flex flex-col w-screen h-screen bg-[#f8f9fa] text-slate-900 font-sans overflow-hidden">
        {children}
        
        {/* Command Palette still needs to be available in Zen/Study mode if we want it global, 
            but for now we'll just render it outside the main flex flow */}
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
            <CommandGroup heading="SARA Actions (Contextual)">
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
      </div>
    );
  }


  return (
    <div className="flex h-screen flex-col bg-[#fdfdfe] font-sans overflow-hidden relative">
      {/* ── Ultra-Clean Glass Ribbon ────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-[72px] flex items-center justify-center px-10 z-[100] pointer-events-none">
        <header 
          className="w-full max-w-[1280px] h-[48px] flex items-center justify-between px-6 bg-white/40 backdrop-blur-3xl rounded-full border border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] pointer-events-auto"
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-[#000666] rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-lg">
              V
            </div>
            <span className="text-[11px] font-black text-[#000666] tracking-[0.15em] uppercase">Vidhyalaya</span>
          </Link>

          {/* Navigation Hub */}
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || 
                              (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));
              return (
                <button
                  key={item.label}
                  onClick={() => item.to && navigate(item.to)}
                  className={`group relative flex items-center px-4 py-1.5 rounded-full transition-all duration-500
                    ${isActive ? 'text-[#000666]' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-ribbon-pill"
                      className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-100/50 rounded-full z-0"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon size={14} className="relative z-10 mr-2" />
                  <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Minimal User Access */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-white/80 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <GraduationCap size={11} className="text-slate-400" />
              </div>
              <span className="text-[10px] font-black text-[#000666] tracking-tight">Scholar</span>
            </div>
            
            <button 
              onClick={() => setOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#000666] text-white shadow-lg shadow-indigo-900/10 hover:scale-110 active:scale-95 transition-all"
            >
              <Search size={14} />
            </button>
          </div>
        </header>
      </div>

      {/* Spacer */}
      <div className="h-[72px] shrink-0" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#fdfdfe] h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.23, 1, 0.32, 1] 
            }}
            className="flex-1 h-full overflow-hidden"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

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
          <CommandGroup heading="SARA Actions (Contextual)">
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

    </div>
  );
};

export default Layout;
