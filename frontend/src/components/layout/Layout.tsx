import React, { useState, useEffect } from 'react';
import {
  Map,
  GraduationCap,
  CalendarDays,
  Settings,
  Sparkles,
  BookOpen,
  Zap,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../context/Store';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command';
import { useFocus } from '../../context/FocusContext';

const getPathColor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('front') || t.includes('ui') || t.includes('react') || t.includes('design') || t.includes('js') || t.includes('javascript') || t.includes('css')) {
    return { stroke: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: 'text-amber-400' };
  }
  if (t.includes('back') || t.includes('api') || t.includes('db') || t.includes('sql') || t.includes('node') || t.includes('go') || t.includes('rust') || t.includes('postgresql')) {
    return { stroke: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', text: 'text-blue-400' };
  }
  if (t.includes('ai') || t.includes('ml') || t.includes('machine') || t.includes('agent') || t.includes('llm') || t.includes('gpt') || t.includes('gemini') || t.includes('neural')) {
    return { stroke: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', text: 'text-rose-400' };
  }
  if (t.includes('devops') || t.includes('cloud') || t.includes('docker') || t.includes('k8s') || t.includes('kubernetes') || t.includes('sre') || t.includes('aws')) {
    return { stroke: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', text: 'text-purple-400' };
  }
  return { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: 'text-emerald-400' };
};

const BrandLogo: React.FC = () => (
  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/8 border border-[#4e5bff]/30 transition-all duration-300 shadow-none group-hover:border-[#4e5bff]/55 group-hover:bg-[#4e5bff]/10">
    {/* Inner dashed orbital circles wrapping the logomark */}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[18px] h-[18px] text-indigo-300 group-hover:text-indigo-200 transition-all group-hover:rotate-[30deg] duration-500">
      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
      <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
      <circle cx="12" cy="12" r="2.2" className="fill-indigo-300 group-hover:fill-indigo-200 stroke-none transition-colors" />
    </svg>
  </div>
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { paths, userProfile } = useAppStore();

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('vidyal_sidebar_collapsed') === 'true';
  });

  const [isPathsExpanded, setIsPathsExpanded] = React.useState(true);
  const [isSaraExpanded, setIsSaraExpanded] = React.useState(true);

  React.useEffect(() => {
    localStorage.setItem('vidyal_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    document.documentElement.setAttribute('data-sidebar-collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  // Sidebar stays visible on all non-study routes

  const [open, setOpen] = React.useState(false);
  const displayName = userProfile.name || 'Scholar';
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'S';

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
  const shouldRenderSidebarContents = !isStudyMode;

  const activePaths = React.useMemo(() => {
    return paths.filter(p => p.status === 'active' || p.progress < 100);
  }, [paths]);

  const navItems = [
    { icon: Map, label: 'Developer Roadmaps', to: '/dashboard' },
    { icon: GraduationCap, label: 'Classrooms', to: '/courses' },
    { icon: CalendarDays, label: 'Calendar', to: '/schedule' },
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
          <CommandItem onSelect={() => { navigate('/settings'); setOpen(false); }}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Control Panel</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Cortex Actions">
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
    <div className="flex h-screen w-screen font-sans overflow-hidden relative antialiased" style={{ background: 'transparent' }}>

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
            className="fixed top-4.5 left-4.5 z-[110] p-2.5 rounded-xl text-slate-355 hover:text-white active:scale-95 transition-all focus:outline-none shadow-lg border border-white/5 bg-[#03011a]/85 backdrop-blur-md hover:bg-white/5"
            style={{
              boxShadow: '0 4px 20px rgba(3, 0, 30, 0.3)',
            }}
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={18} strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Cursor/Codex Inspired Single-Pane Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{
          width: isStudyMode
            ? 0
            : isCollapsed
              ? 0
              : 300
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full flex flex-col relative z-[20] shrink-0 overflow-hidden single-sidebar-bg text-white"
      >
        {shouldRenderSidebarContents && (
          <div className="w-[300px] h-full flex flex-col justify-between sidebar-grid-canvas relative select-none">

            {/* Top Workspace Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Header */}
              <div className="px-4.5 pt-5 pb-3.5 flex items-center justify-between shrink-0 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5 group">
                  <BrandLogo />
                  <span className="text-[13px] font-semibold tracking-tight text-white/80 font-sans">Cortex</span>
                </div>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose size={14} strokeWidth={2.2} />
                </button>
              </div>

              {/* Primary Navigation */}
              <div className="px-3 mb-5 space-y-0.5 shrink-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to ||
                    (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));

                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.to)}
                      className={`single-sidebar-btn ${isActive ? 'single-sidebar-btn-active' : ''}`}
                    >
                      <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Separator Line */}
              <div className="mx-3 border-t border-white/5 mb-4 shrink-0" />

              {/* Scrollable Dynamic Goal Explorer Tree */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4.5 scroll-smooth custom-scrollbar">

                {/* Collapsible Section A: Active Paths */}
                <div>
                  <div
                    onClick={() => setIsPathsExpanded(!isPathsExpanded)}
                    className="sidebar-section-header-dark group"
                  >
                    <span>Active Roadmaps</span>
                    <div className="text-slate-500 group-hover:text-white transition-colors shrink-0">
                      {isPathsExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </div>
                  </div>

                  {isPathsExpanded && (
                    <div className="mt-1 space-y-0.5">
                      {activePaths.length > 0 ? (
                        activePaths.map((path) => {
                          const isPathActive = location.pathname === `/path/${path.id}`;
                          const themeColors = getPathColor(path.title);
                          return (
                            <button
                              key={path.id}
                              onClick={() => navigate(`/path/${path.id}`)}
                              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12px] font-medium transition-all border border-transparent ${
                                isPathActive
                                  ? 'bg-white/5 border-white/10 text-white'
                                  : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                              }`}
                            >
                              {/* Circular progress SVG */}
                              <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
                                  <circle cx="7" cy="7" r="5.5" fill="none" stroke={themeColors.stroke} strokeWidth="1.2"
                                          strokeDasharray={2 * Math.PI * 5.5}
                                          strokeDashoffset={2 * Math.PI * 5.5 * (1 - (path.progress || 0) / 100)} />
                                </svg>
                              </div>
                              <span className="flex-1 truncate">{path.title}</span>
                              <span className={`text-[9.5px] font-bold font-mono group-hover:opacity-100 transition-opacity ${isPathActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-350'}`}>
                                {path.progress || 0}%
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-2.5 py-2 text-[11px] text-slate-500 font-medium italic">
                          No active pathways
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsible Section B: Campus Assistant */}
                <div>
                  <div
                    onClick={() => setIsSaraExpanded(!isSaraExpanded)}
                    className="sidebar-section-header-dark group"
                  >
                    <span>Campus Assistant</span>
                    <div className="text-slate-500 group-hover:text-white transition-colors shrink-0">
                      {isSaraExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </div>
                  </div>

                  {isSaraExpanded && (
                    <div className="mt-1 space-y-0.5">
                      {[
                        { label: 'Connect Campus', to: '/admin', icon: Settings },
                      ].map((item) => {
                        const SIcon = item.icon;
                        const isSActive = location.pathname.startsWith(item.to);
                        return (
                          <button
                            key={item.label}
                            onClick={() => navigate(item.to)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12px] font-medium transition-all border border-transparent ${
                              isSActive
                                ? 'bg-white/5 border-white/10 text-white'
                                : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                            }`}
                          >
                            <SIcon size={13} className={isSActive ? 'text-[#4e5bff]' : 'text-slate-500'} />
                            <span className="flex-1 truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Footer Section */}
            <div className="p-3.5 border-t border-white/[0.045] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Rotating orbital border letter avatar */}
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center bg-white/8 border border-white/12 overflow-hidden cursor-pointer"
                  title={`Learning profile · ${displayName}`}
                >
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#4e5bff]/35 rotating-orbit-border-slow" style={{ transform: 'scale(1.15)' }} />
                  <span className="text-[10px] font-black text-white/80 font-mono z-10 select-none">{avatarInitials}</span>
                </div>

                {/* User info details */}
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-white/70 truncate max-w-[160px]">{displayName}</span>
                </div>
              </div>

              {/* Settings Gear trigger */}
              <button
                onClick={() => navigate('/settings')}
                className={`p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-white/5 transition-all focus:outline-none ${location.pathname === '/settings' ? 'text-white bg-white/5' : ''}`}
                title="Settings"
              >
                <Settings size={14.5} />
              </button>
            </div>

          </div>
        )}
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-[10]">
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
