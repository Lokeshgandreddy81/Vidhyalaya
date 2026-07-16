import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  MessageSquare,
  Settings,
  Sparkles,
  BookOpen,
  Zap,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2
} from 'lucide-react';
import { get } from 'idb-keyval';
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

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { paths, userProfile } = useAppStore();

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const hasAutoClosedOnce = sessionStorage.getItem('vidyal_auto_collapsed_once');
    if (!hasAutoClosedOnce) {
      return false;
    }
    return localStorage.getItem('vidyal_sidebar_collapsed') === 'true';
  });

  const [isPathsExpanded, setIsPathsExpanded] = React.useState(true);
  const [isSaraExpanded, setIsSaraExpanded] = React.useState(true);
  const [isChatsExpanded, setIsChatsExpanded] = React.useState(true);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string>('');

  React.useEffect(() => {
    // Read from idb on mount
    get<ChatSession[]>('cortex-chat-sessions').then(stored => {
      if (stored) setSessions(stored);
    });
    get<string>('cortex-active-session-id').then(stored => {
      if (stored) setActiveSessionId(stored);
    });

    // Listen to updates from SARA chat
    const handleUpdated = (e: Event) => {
      const { sessions: updatedSessions, activeSessionId: updatedActiveId } = (e as CustomEvent).detail;
      setSessions(updatedSessions || []);
      setActiveSessionId(updatedActiveId || '');
    };
    window.addEventListener('cortex-sessions-updated', handleUpdated);
    return () => window.removeEventListener('cortex-sessions-updated', handleUpdated);
  }, []);

  React.useEffect(() => {
    const hasAutoClosedOnce = sessionStorage.getItem('vidyal_auto_collapsed_once');
    if (!hasAutoClosedOnce) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
        sessionStorage.setItem('vidyal_auto_collapsed_once', 'true');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('vidyal_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    document.documentElement.setAttribute('data-sidebar-collapsed', isCollapsed ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: isCollapsed }));
  }, [isCollapsed]);

  React.useEffect(() => {
    const handleSetCollapsed = (e: Event) => {
      const val = (e as CustomEvent).detail;
      setIsCollapsed(val);
    };
    window.addEventListener('set-sidebar-collapsed', handleSetCollapsed);
    return () => {
      window.removeEventListener('set-sidebar-collapsed', handleSetCollapsed);
    };
  }, []);

  React.useEffect(() => {
    sessionStorage.setItem('fromApp', 'true');
  }, []);

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
    { icon: GraduationCap, label: 'Classrooms', to: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', to: '/courses' },
    { icon: BookOpen, label: 'Documentation', to: '/docs' },
  ];

  const CommandPalette = (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search... (Cmd+K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem 
              key={item.label} 
              onSelect={() => { 
                if (item.to === '/docs') {
                  navigate(item.to, { state: { fromApp: true } });
                } else {
                  navigate(item.to);
                }
                setOpen(false); 
              }}
            >
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
        {isCollapsed && !isStudyMode && location.pathname !== '/create' && location.pathname !== '/explore' && !location.pathname.startsWith('/path/') && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={() => setIsCollapsed(false)}
            className="fixed top-4.5 left-4.5 z-[110] p-2 rounded-xl text-slate-500 hover:text-slate-800 active:scale-95 transition-all focus:outline-none shadow-sm border border-slate-200 bg-white/90 backdrop-blur-md hover:bg-slate-50"
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={16} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isStudyMode
            ? 0
            : isCollapsed
              ? 0
              : 240
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full flex flex-col relative z-[20] shrink-0 overflow-hidden single-sidebar-bg text-[#202124]"
      >
        {shouldRenderSidebarContents && (
          <div className="w-[240px] h-full flex flex-col justify-between relative select-none">

            {/* Top Workspace Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-full text-[#444746] hover:text-[#1F1F1F] hover:bg-[#F0F4F9] transition-all focus:outline-none flex items-center justify-center cursor-pointer border-none"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose size={14} strokeWidth={2.2} />
                </button>
              </div>

              {/* Primary Navigation */}
              <div className="px-2.5 mb-4 space-y-0.5 shrink-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to ||
                    (item.to === '/dashboard' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));

                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (item.to === '/docs') {
                          navigate(item.to, { state: { fromApp: true } });
                        } else {
                          navigate(item.to);
                        }
                      }}
                      className={`single-sidebar-btn ${isActive ? 'single-sidebar-btn-active' : ''}`}
                    >
                      <Icon size={14} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-[#041E49]' : 'text-[#444746]'} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Separator Line */}
              <div className="mx-4 border-t border-[#E8EAED] mb-3 shrink-0" />

              {/* Scrollable Dynamic Goal Explorer Tree */}
              <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-3 scroll-smooth custom-scrollbar">

                {/* Collapsible Section A: Active Paths */}
                <div>
                  <div
                    onClick={() => setIsPathsExpanded(!isPathsExpanded)}
                    className="sidebar-section-header-dark group"
                  >
                    <span>Active Roadmaps</span>
                    <div className="text-[#5F6368] group-hover:text-[#202124] transition-colors shrink-0">
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
                              className={`group w-full flex items-center gap-2.5 h-9 px-3 rounded-[20px] text-left text-[12.5px] font-medium transition-all border-none mb-0.5 ${
                                isPathActive
                                  ? 'bg-[#D3E3FD] text-[#041E49]'
                                  : 'text-[#444746] hover:bg-[#F0F4F9] hover:text-[#1F1F1F]'
                              }`}
                            >
                              <span className="flex-1 truncate">{path.title}</span>
                              <span className={`text-[9px] font-bold font-mono opacity-60 group-hover:opacity-100 transition-opacity ${isPathActive ? 'text-[#041E49]' : 'text-[#444746]'}`}>
                                {path.progress || 0}%
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-[#5F6368] font-medium italic">
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
                    <div className="text-[#5F6368] group-hover:text-[#202124] transition-colors shrink-0">
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
                            className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-[20px] text-left text-[12.5px] font-medium transition-all border-none ${
                              isSActive
                                ? 'bg-[#D3E3FD] text-[#041E49]'
                                : 'text-[#444746] hover:bg-[#F0F4F9] hover:text-[#1F1F1F]'
                            }`}
                          >
                            <SIcon size={13} className={isSActive ? 'text-[#1A73E8]' : 'text-[#444746]'} />
                            <span className="flex-1 truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Collapsible Section C: Recent Chats */}
                {location.pathname === '/courses' && (
                  <div>
                    <div
                      onClick={() => setIsChatsExpanded(!isChatsExpanded)}
                      className="sidebar-section-header-dark group flex items-center justify-between cursor-pointer"
                    >
                      <span>Recent Chats</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('new-cortex-session'));
                          }}
                          className="p-0.5 rounded-full text-[#5F6368] hover:text-[#1F1F1F] hover:bg-[#F0F4F9] transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                          title="New chat session"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                        <div className="text-[#5F6368] group-hover:text-[#202124] transition-colors flex items-center justify-center">
                          {isChatsExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </div>
                      </div>
                    </div>

                    {isChatsExpanded && (
                      <div className="mt-1 space-y-0.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
                        {sessions.length > 0 ? (
                          sessions.map((s) => {
                            const isActive = s.id === activeSessionId;
                            return (
                              <div
                                key={s.id}
                                className={`group/item w-full flex items-center justify-between rounded-[20px] h-9 px-3 transition-all mb-0.5 ${
                                  isActive
                                    ? 'bg-[#D3E3FD] text-[#041E49]'
                                    : 'text-[#444746] hover:bg-[#F0F4F9] hover:text-[#1F1F1F]'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => window.dispatchEvent(new CustomEvent('select-cortex-session', { detail: s.id }))}
                                  className="flex-1 text-left text-[12.5px] font-medium truncate bg-transparent border-none cursor-pointer p-0 text-inherit outline-none"
                                >
                                  {s.title}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('delete-cortex-session', { detail: s.id }));
                                  }}
                                  className="opacity-0 group-hover/item:opacity-100 hover:text-rose-500 transition-opacity p-0.5 rounded-full border-none bg-transparent cursor-pointer text-[#5F6368] flex items-center justify-center"
                                  title="Delete conversation"
                                >
                                  <Trash2 size={10} strokeWidth={2.2} />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-[11px] text-[#5F6368] font-medium italic">
                            No recent chats
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Footer Section */}
            <div className="px-3 py-3 border-t border-[#E8EAED] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Clean letter avatar */}
                <div
                  className="relative w-7 h-7 rounded-full flex items-center justify-center bg-[#1A73E8] cursor-pointer"
                  title={`Learning profile · ${displayName}`}
                >
                  <span className="text-[10px] font-bold text-white select-none">{avatarInitials}</span>
                </div>

                {/* User info details */}
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-[#1F1F1F] truncate max-w-[130px]">{displayName}</span>
                </div>
              </div>

              {/* Settings Gear trigger */}
              <button
                onClick={() => navigate('/settings')}
                className={`p-1.5 rounded-full text-[#444746] hover:text-[#1F1F1F] hover:bg-[#F0F4F9] transition-all focus:outline-none flex items-center justify-center cursor-pointer border-none ${location.pathname === '/settings' ? 'text-[#1F1F1F] bg-[#D3E3FD]' : ''}`}
                title="Settings"
              >
                <Settings size={14} />
              </button>
            </div>

          </div>
        )}
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-[10]">
        <div className="flex-1 overflow-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className={(isStudyMode || location.pathname === '/create' || location.pathname === '/courses') ? "h-full w-full overflow-hidden" : "h-full overflow-y-auto scroll-smooth"}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {CommandPalette}
    </div>
  );
};

export default Layout;
