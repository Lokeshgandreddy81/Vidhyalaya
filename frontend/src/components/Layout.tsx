import React from 'react';
import { 
  MonitorPlay, 
  GraduationCap, 
  Library, 
  CalendarDays, 
  Settings, 
  FileCheck, 
  PanelLeftClose, 
  PanelLeft, 
  Search,
  Sparkles,
  BookOpen,
  Zap,
  Target,
  Bot,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
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
  const isSmartStudyMode = location.pathname.startsWith('/smart-study');

  if (isStudyMode || isSmartStudyMode) {
    return (
      <div className="fixed inset-0 flex bg-[#f8f9fa] text-slate-900 font-sans overflow-hidden">
        {children}
      </div>
    );
  }

  const navItems = [
    { icon: MonitorPlay, label: 'Discovery', to: '/dashboard' },
    { icon: GraduationCap, label: 'Classrooms', to: '/courses' },
    { icon: Library, label: 'Archive', to: '/library' },
    { icon: CalendarDays, label: 'Schedule', to: '/schedule' },
    { icon: FileCheck, label: 'Exam Mode', to: '/exam' },
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
  );

  if (isStudyMode || isZenMode) {
    return (
      <div className="fixed inset-0 flex flex-col w-screen h-screen bg-[#fafafa] text-slate-900 font-sans overflow-hidden">
        {children}
        {CommandPalette}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#fafafa] font-sans overflow-hidden relative">
      
      {/* ── Collapsible Side Dashboard ────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full bg-white border-r border-slate-100 flex flex-col relative z-[100] shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0"
      >
        {/* Branding Area */}
        <div className="h-[72px] flex items-center px-6 border-b border-slate-50 overflow-hidden">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-8 h-8 bg-[#000666] rounded-xl flex items-center justify-center text-white text-[12px] font-black shadow-lg shadow-indigo-900/20">
              V
            </div>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[13px] font-black text-[#000666] tracking-[0.15em] uppercase whitespace-nowrap"
              >
                Vidhyalaya
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
          <div className="relative flex flex-col flex-1 overflow-y-auto pt-6 px-3 space-y-1 scroll-smooth">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
                            (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));
            
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className={`group relative w-full flex items-center h-[48px] rounded-xl transition-all duration-300
                  ${isActive ? 'bg-indigo-50/50 text-[#000666]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="w-[56px] shrink-0 flex items-center justify-center">
                   <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-indigo-600' : ''} />
                </div>
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] font-bold tracking-tight whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="active-bar"
                    className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full"
                  />
                )}
              </button>
            );
          })}
          </div>

        {/* SARA PREMIUM BUTTON */}
        <div className="px-3 pb-4">
          <button
            onClick={() => navigate('/smart-study')}
            className="group flex items-center p-3 rounded-2xl w-full text-left relative bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/50 text-white font-semibold transform hover:scale-105 hover:shadow-indigo-500/70 transition-all duration-300"
          >
            <div className={`flex items-center justify-center transition-all duration-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}>
              <Bot size={22} className="animate-pulse" />
            </div>
            {!isCollapsed && (
              <span className="text-[14px] font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-500">SARA</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                SARA
              </div>
            )}
          </button>
        </div>

        
        {/* Footer Sidebar Actions */}
        <div className="p-3 border-t border-slate-50 space-y-1">
          <button 
            onClick={() => setOpen(true)}
            className="w-full flex items-center h-[48px] rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all group"
          >
             <div className="w-[56px] shrink-0 flex items-center justify-center">
                <Search size={18} />
             </div>
             {!isCollapsed && <span className="text-[12px] font-bold">Search <span className="ml-2 text-[10px] opacity-40 font-mono">⌘K</span></span>}
          </button>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center h-[48px] rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all group"
          >
             <div className="w-[56px] shrink-0 flex items-center justify-center">
                {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
             </div>
             {!isCollapsed && <span className="text-[12px] font-bold">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content Container ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
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
