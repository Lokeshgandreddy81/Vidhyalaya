import React from 'react';
import { MonitorPlay, GraduationCap, Library, CalendarDays, Settings, FileCheck, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    <div className="flex h-screen bg-white font-sans overflow-hidden relative">
      {/* Global Left Navigation Sidebar */}
      <aside 
        className={`h-screen bg-slate-50 border-r border-slate-200 py-6 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col relative z-40 ${isCollapsed ? 'w-[84px]' : 'w-[240px]'}`}
      >
        {/* LOGO AREA */}
        <div className={`px-5 mb-10 transition-all duration-500 ${isCollapsed ? 'text-center' : ''}`}>
          <Link to="/dashboard" className="block group/logo">
            {isCollapsed ? (
              <div className="w-10 h-10 bg-[#000666] rounded-xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-900/20">
                <span className="text-xl font-black">V</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[18px] font-black text-[#000666] tracking-[0.25em] uppercase leading-none">Vidhyalaya</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-[1px] w-4 bg-indigo-500/30" />
                  <span className="text-[8px] font-black text-indigo-500/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap">Learning Platform</span>
                </div>
              </div>
            )}
          </Link>
        </div>
        
        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
                            (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));
            return (
              <button
                key={item.label}
                onClick={() => item.to && navigate(item.to)}
                className={`group flex items-center p-3 rounded-2xl transition-all duration-300 w-full text-left relative
                  ${isActive
                    ? 'text-indigo-700 bg-indigo-50/80 shadow-sm font-semibold'
                    : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`}
                >
                <div className={`flex items-center justify-center transition-all duration-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}>
                  <Icon size={22} />
                </div>
                {!isCollapsed && (
                  <span className="text-[14px] font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-500">{item.label}</span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-3 bottom-3 w-1 bg-indigo-700 rounded-l-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* COLLAPSE TOGGLE */}
        <div className="px-3 pt-6 border-t border-slate-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-3 rounded-2xl text-slate-400 hover:text-[#000666] hover:bg-white transition-all group"
          >
            {isCollapsed ? <PanelLeft size={20} /> : (
              <div className="flex items-center gap-3 w-full">
                <PanelLeftClose size={20} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Collapse</span>
              </div>
            )}
          </button>
        </div>

        {/* USER ROLE BADGE */}
        {!isCollapsed && (
          <div className="mx-4 mt-8 p-4 rounded-2xl bg-[#000666]/5 border border-indigo-100/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#000666] flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Current Protocol</span>
                <span className="text-[11px] font-black text-[#000666] tracking-tight">Lead Architect</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white h-full">
        {children}
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
