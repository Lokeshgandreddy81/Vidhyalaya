import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  generateModuleContent, 
  scoutResources, 
  chatWithTutor, 
  generateQuizForModule 
} from '../services/geminiService';
import { ChatMessage, QuizQuestion } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, ChevronLeft,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import ContentRenderer from './ContentRenderer';
import NeuralSynthesizer, { NodeDetailPanel, ConceptNode } from './NeuralSynthesizer';
import Smartboard from './Smartboard';
import AITerminalOverlay, { ActionType } from './AITerminalOverlay';
import { mapMasteryTimeline } from '../services/geminiService';
import { VideoSegment, KnowledgeMilestone } from '../types';
import { useFocus } from '../context/FocusContext';
import { useFocusSession } from '../hooks/useFocusSession';
import { motion, AnimatePresence } from 'framer-motion';
import SARAActionChips from './SARAActionChips';
import SARAQuizPanel from './SARAQuizPanel';
import SARAVaultPanel from './SARAVaultPanel';
import '../styles/AssistantGlass.css';

// ── Error Boundary (prevents blank screen on any unhandled crash) ──────────
class StudySessionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-white p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 mb-3">Session Interrupted</h2>
          <p className="text-[13px] font-medium text-slate-500 max-w-[300px] leading-relaxed mb-8">
            {this.state.error.includes('429') || this.state.error.includes('quota')
              ? 'Gemini API quota reached. Please wait a moment before trying again.'
              : 'An unexpected error occurred. Please reload the session.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-[14px] bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
            Reload Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RichNotesEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== content) editorRef.current.innerHTML = content || ''; }, [content]);
  const exec = (command: string, value: string = '') => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
        <button onMouseDown={e => { e.preventDefault(); exec('bold'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><Bold size={14}/></button>
        <button onMouseDown={e => { e.preventDefault(); exec('italic'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><Italic size={14}/></button>
        <div className="mx-1.5 h-4 w-px bg-slate-200" />
        <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><ListIcon size={14}/></button>
      </div>
      <div className="flex-1 min-h-0 bg-white">
        <div ref={editorRef} contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} data-placeholder="Start writing notes..."
          className="rich-editor h-full overflow-y-auto p-6 text-[14px] leading-relaxed text-slate-700 focus:outline-none custom-scrollbar" />
      </div>
    </div>
  );
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { paths, isCloudSynced, updateModuleStatus, saveModuleNotes, saveModuleContent, saveModuleCitations, replaceModuleResources } = useAppStore();
  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);
  
  const { isZenMode, setIsZenMode } = useFocus();
  const { isSidebarGhost, scrollProgress } = useFocusSession(isZenMode);

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz' | 'vault'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false); // kept for legacy terminal flow
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer'>('smartboard');
  const [focusMode, setFocusMode] = useState<'content' | 'split'>('split');
  const [saraOpen, setSaraOpen] = useState(true);
  const [selectedNeuralNode, setSelectedNeuralNode] = useState<ConceptNode | null>(null);
  const [isNeuralFullScreen, setIsNeuralFullScreen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalAction, setTerminalAction] = useState<ActionType>('refresh');
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [videoTimeline, setVideoTimeline] = useState<VideoSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isScouting, setIsScouting] = useState(false);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<KnowledgeMilestone[]>([]);
  const [curatedVideoId, setCuratedVideoId] = useState<string | null>(null);
  const [scoutedVideoIds, setScoutedVideoIds] = useState<{ id: string; title: string }[]>([]);

  const ChatMarkdownComponents = useMemo(() => {
    return {
      table: ({ children }: any) => (
        <div className="my-3 overflow-x-auto rounded-[16px] border border-white/5 shadow-sm bg-white/[0.02]">
          <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className={`${isZenMode ? 'bg-white/5 text-indigo-300' : 'bg-[#000666]/5 text-indigo-900'} text-[9px] font-black uppercase tracking-wider`}>
          {children}
        </thead>
      ),
      tbody: ({ children }: any) => (
        <tbody className="divide-y divide-white/5">
          {children}
        </tbody>
      ),
      tr: ({ children }: any) => (
        <tr className="hover:bg-white/5 transition-colors">
          {children}
        </tr>
      ),
      th: ({ children }: any) => (
        <th className="p-2.5 font-bold border-b border-white/5">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="p-2.5 border-b border-white/5 font-medium">
          {children}
        </td>
      ),
      p: ({ children }: any) => (
        <p className="mb-2.5 last:mb-0 leading-relaxed text-[12px] font-medium">
          {children}
        </p>
      ),
      ul: ({ children }: any) => (
        <ul className="list-disc pl-5 mb-3 space-y-1 text-[12px]">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal pl-5 mb-3 space-y-1 text-[12px]">
          {children}
        </ol>
      ),
      li: ({ children }: any) => (
        <li className="leading-relaxed">
          {children}
        </li>
      ),
      strong: ({ children }: any) => (
        <strong className="font-extrabold text-indigo-400">
          {children}
        </strong>
      ),
      h1: ({ children }: any) => (
        <h1 className="text-[15px] font-black mt-4 mb-2 tracking-tight text-white uppercase tracking-wide">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-[13px] font-black mt-3 mb-2 tracking-tight text-indigo-300 uppercase tracking-wide">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-[12px] font-bold mt-2 mb-1 tracking-tight text-slate-300">
          {children}
        </h3>
      ),
      code: ({ children }: any) => (
        <code className="bg-white/5 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300 border border-white/5">
          {children}
        </code>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-indigo-500 pl-3 my-3 italic text-[11px] text-slate-400 leading-relaxed">
          {children}
        </blockquote>
      )
    };
  }, [isZenMode]);

  // Auto-populate vault from citations
  useEffect(() => {
    if (module?.citations) {
      const citationItems = module.citations.map((c, idx) => ({
        id: `cit-${c.url || 'ref'}-${Date.now()}-${idx}`,
        title: c.title || 'Scholarly Reference',
        content: c.snippet || 'Referenced scholarly source.',
        source: c.domain || c.url || 'Internal Module',
        type: 'citation',
        timestamp: Date.now()
      }));
      setVaultItems(prev => {
        const existingUrls = new Set(prev.map(i => i.source));
        const newItems = citationItems.filter(i => !existingUrls.has(i.source));
        return [...prev, ...newItems];
      });
    }
  }, [module?.citations]);

  const handleAddToVault = (title: string, content: string, type: 'insight' | 'citation', source: string) => {
    const newItem = {
      id: `vlt-${uuidv4()}-${Date.now()}`,
      title: title || 'Saved Insight',
      content: content || '',
      type,
      source: source || 'SARA',
      timestamp: Date.now()
    };
    setVaultItems(prev => [newItem, ...prev]);
    toast.success("Saved to Vault");
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, isTyping]);
  
  const nextModule = useMemo(() => {
    if (!path || !module) return null;
    const allModules = path.phases.flatMap(p => p.modules.map(m => ({ ...m, phaseId: p.id })));
    const idx = allModules.findIndex(m => m.id === moduleId);
    return (idx !== -1 && idx < allModules.length - 1) ? allModules[idx + 1] : null;
  }, [path, module, moduleId]);

  useEffect(() => {
    if (module) {
      setNotes(module.userNotes || '');
      // Clear stale video state from previous module
      setScoutedVideoIds([]);
      setCuratedVideoId(null);
      setVideoTimeline([]);
      if (module.generatedContent) {
        setGeneratedContent(module.generatedContent);
        scoutAndMap(module.generatedContent);
      }
      else loadContent();
    }
  }, [module?.id]);

  const [contentError, setContentError] = useState<string | null>(null);

  const loadContent = async () => {
    if (!module) return;
    setIsContentLoading(true);
    setGeneratedContent(null);
    setContentError(null);
    try {
      const { content, citations } = await generateModuleContent(module?.title || '', module?.keyConcepts || [], path?.goal || 'General Mastery');
      setGeneratedContent(content);
      if (pathId && phaseId && moduleId) {
        saveModuleContent(pathId, phaseId, moduleId, content);
        if (citations) saveModuleCitations(pathId, phaseId, moduleId, citations);
      }
      scoutAndMap(content);
    } catch (err: any) {
      const msg = err?.message || '';
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate');
      setContentError(isQuota ? 'quota' : 'error');
      // Provide fallback static content so the session still renders
      const fallback = `## ${module?.title || ''}\n\n> ⚡ **AI Synthesis Paused** — The Gemini API is temporarily rate-limited. Your session is still active.\n\n### Key Concepts\n${(module?.keyConcepts || []).map(c => `- **${c}**`).join('\n')}\n\n### Study Tips\nWhile AI synthesis is paused, you can:\n1. Review the key concepts above\n2. Ask SARA specific questions in the Chat panel\n3. Use the Quiz tab to test your existing knowledge\n\n*Content will auto-refresh once quota resets.*`;
      setGeneratedContent(fallback);
      if (isQuota) toast.warning('API quota reached — showing cached mode. Quiz & Chat still work!');
      else toast.error('Content synthesis failed. Showing fallback mode.');
    } finally { setIsContentLoading(false); }
  };

  const scoutAndMap = async (content: string, force = false) => {
    if (!module || !path) return;
    setIsScouting(true);
    try {
      // 1. Get Milestones and Curated Video from Backend (non-blocking)
      const { api } = await import('../services/api');
      api.curateVideo(content).then(curation => {
        if (curation?.milestones) setMilestones(curation.milestones);
        if (curation?.videoId) setCuratedVideoId(curation.videoId);
      }).catch(() => {});

      // 2. Scout topic-specific resources via AI (Gemini search grounding)
      let currentResources = module.resources || [];
      const hasBadFallback = currentResources.some(r => 
        (r.title?.toLowerCase().includes('html') && !module.title?.toLowerCase().includes('html')) ||
        (r.title?.toLowerCase().includes('git') && !module.title?.toLowerCase().includes('git')) ||
        (r.title?.toLowerCase().includes('css') && !module.title?.toLowerCase().includes('css'))
      );

      if (currentResources.length === 0 || hasBadFallback || force) {
        console.log(`[SARA] Scouting topic-specific videos for: "${module.title}"`);
        currentResources = await scoutResources(module.title || '', path.goal);

        if (currentResources.length > 0) {
          // Save to store so subsequent visits use cached resources
          if (pathId && phaseId && moduleId) {
            replaceModuleResources(pathId, phaseId, moduleId, currentResources);
          }
          // Immediately surface videos to Smartboard via local state
          setScoutedVideoIds(
            currentResources
              .filter(r => r.type === 'youtube' && r.videoId)
              .map(r => ({ id: r.videoId!, title: r.title || module.title }))
          );
        }
      }

      // 3. Map timeline chapters to content sections
      if (currentResources.length > 0) {
        const videoIds = currentResources
          .filter(r => r.type === 'youtube' && r.videoId)
          .map(r => r.videoId as string);
        if (videoIds.length > 0) {
          const timeline = await mapMasteryTimeline(content, videoIds);
          setVideoTimeline(timeline);
        }
      }
    } catch (err) {
      console.error("Scouting failed:", err);
    } finally {
      setIsScouting(false);
    }
  };

  const handleJumpToTimestamp = (seconds: number) => {
    // We'll need a way to communicate this to Smartboard
    // For now, we can use a custom event or a ref if Smartboard supports it
    const event = new CustomEvent('smartboard-jump', { detail: { timestamp: seconds } });
    window.dispatchEvent(event);
    setLeftPanelMode('smartboard');
  };

  // Scroll Detection for Progression
  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // 20px threshold for bottom detection
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
      if (isAtBottom && !hasReachedBottom) {
        setHasReachedBottom(true);
      }
    };

    // Also check if content is shorter than viewport
    const checkInitial = () => {
      if (el.scrollHeight <= el.clientHeight && el.clientHeight > 0) {
        setHasReachedBottom(true);
      }
    };

    el.addEventListener('scroll', handleScroll);
    const resizeObserver = new ResizeObserver(checkInitial);
    resizeObserver.observe(el);
    
    checkInitial();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [generatedContent, leftPanelMode, isContentLoading]);

  useEffect(() => {
    setHasReachedBottom(false);
  }, [moduleId]);

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: msg, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const response = await chatWithTutor(chatHistory, msg, `Module: ${module?.title}`, generatedContent || '');
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
    } finally { setIsTyping(false); }
  };

  const handleTerminalComplete = (result: any) => {
    setTerminalOpen(false);
    if (terminalAction === 'quiz' && Array.isArray(result) && result.length > 0) {
      setQuizQuestions(result);
      setQuizState('active');
      setSaraOpen(true);
      setActiveRightTab('quiz');
    }
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, setIsZenMode]);

  // ── Global SARA Actions (from Command Palette) ──
  useEffect(() => {
    const handleSaraAction = (e: any) => {
      const prompt = e.detail;
      if (prompt) {
        setSaraOpen(true);
        setActiveRightTab('chat');
        handleSendMessage(prompt);
      }
    };
    document.addEventListener('sara-action', handleSaraAction);
    return () => document.removeEventListener('sara-action', handleSaraAction);
  }, [module]);

  // ── Adaptive Active Recall (Micro-Exam Timer) ──
  useEffect(() => {
    if (!module || isContentLoading) return;
    
    // Check every 10 minutes (600,000 ms)
    const interval = setInterval(() => {
      if (!isZenMode) return; // Only in focus mode
      
      toast('🧠 Technical Checkpoint', {
        description: "Ready for a quick 30-second mastery check?",
        action: {
          label: 'Start Quiz',
          onClick: () => {
            setTerminalAction('quiz');
            setTerminalOpen(true);
          }
        },
        duration: 10000,
      });
    }, 600000);

    return () => clearInterval(interval);
  }, [module, isContentLoading, isZenMode]);

  return (
    <div className={`flex flex-col w-full h-full transition-colors duration-1000 overflow-hidden font-sans ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>

      {/* ── Focus Progress Bar (Aurora Silk) ── */}
      {isZenMode && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-[200] pointer-events-none">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${scrollProgress}%`,
              background: 'linear-gradient(90deg, #6366f1, #a78bfa, #38bdf8, #6366f1)',
              backgroundSize: '200% 100%',
              boxShadow: '0 0 12px rgba(99,102,241,0.8), 0 0 4px rgba(168,139,250,0.6)',
              animation: 'gradient-shift 3s linear infinite',
            }}
          />
        </div>
      )}

      {(!path || !module) ? (
        <div className={`flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>
          {!isCloudSynced ? (
            // Still loading from backend — show spinner
            <>
              <div className="relative">
                <div className={`w-24 h-24 rounded-[32px] border flex items-center justify-center relative overflow-hidden ${isZenMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`absolute inset-0 animate-pulse ${isZenMode ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-br from-indigo-500/5 to-[#000666]/5'}`} />
                  <Loader size={32} className={`animate-spin relative z-10 ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`} />
                </div>
                <div className={`absolute -inset-4 border border-dashed rounded-full animate-[spin_20s_linear_infinite] opacity-50 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`} />
              </div>
              <div className="mt-12 text-center space-y-3">
                <h2 className={`text-[10px] font-black uppercase tracking-[0.5em] animate-pulse ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>Synchronizing Neural Data</h2>
                <p className={`text-[12px] font-medium font-serif italic tracking-wide ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>Establishing scholarly context...</p>
              </div>
            </>
          ) : (
            // Synced but module not found — show actionable error
            <>
              <div className={`w-20 h-20 rounded-[24px] border flex items-center justify-center mb-8 ${isZenMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                <BookOpen size={32} />
              </div>
              <h2 className={`text-[11px] font-black uppercase tracking-[0.4em] mb-3 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Module Not Found</h2>
              <p className={`text-[13px] font-medium text-center max-w-[280px] leading-relaxed mb-8 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                This module could not be located. It may have been moved or the link is invalid.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center gap-2 px-6 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isZenMode ? 'bg-white text-slate-900' : 'bg-[#000666] text-white shadow-lg shadow-indigo-500/20'}`}
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <header className={`shrink-0 overflow-hidden px-5 sm:px-8 grid grid-cols-3 items-center z-[60] transition-all duration-1000 ${isZenMode ? 'h-0 opacity-0 border-none' : 'h-16 border-b bg-white border-slate-100'}`}>
            {/* Left Section */}
            <div className="flex items-center gap-4 min-w-0 pr-4">
              <Link to="/dashboard" className={`p-2.5 shrink-0 rounded-xl transition-all ${isZenMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-[#000666] hover:bg-slate-50'}`}>
                <ArrowLeft size={20} />
              </Link>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] truncate ${isZenMode ? 'text-indigo-400' : 'text-indigo-400'}`}>{phase?.title}</span>
                  <div className={`w-1 h-1 shrink-0 rounded-full hidden xl:block ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <span className={`text-[10px] shrink-0 font-black uppercase tracking-[0.3em] hidden xl:block ${isZenMode ? 'text-slate-600' : 'text-slate-400'}`}>Knowledge Module</span>
                </div>
                <h1 className={`text-[16px] font-black tracking-tight leading-none truncate ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{module?.title}</h1>
              </div>
            </div>

            {/* Center Section: Mode Toggle */}
            <div className="flex justify-center min-w-0">
              <div className={`flex p-0.5 rounded-[10px] ring-1 shadow-sm transition-all ${isZenMode ? 'bg-white/5 ring-white/10' : 'bg-slate-50 ring-slate-100'}`}>
              <button 
                onClick={() => {
                  setLeftPanelMode('smartboard');
                  setSelectedNeuralNode(null);
                }}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'smartboard' ? (isZenMode ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Smartboard
              </button>
              <button 
                onClick={() => {
                  setLeftPanelMode('content');
                  setSelectedNeuralNode(null);
                }}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'content' ? (isZenMode ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Whiteboard
              </button>
              <button 
                onClick={() => setLeftPanelMode('visualizer')}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'visualizer' ? (isZenMode ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Neural Map
              </button>
            </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end gap-4 min-w-0">
              <button 
                onClick={() => setIsZenMode(!isZenMode)}
                className={`flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all ${isZenMode ? 'bg-white text-[#05070a] shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:text-[#000666] hover:bg-slate-100'}`}
              >
                <Sparkles size={12} strokeWidth={2.4} className={isZenMode ? 'animate-pulse' : ''} />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] hidden sm:block">
                  {isZenMode ? 'Exit Zen' : 'Zen Mode'}
                </span>
              </button>

              <button 
                onClick={() => {
                  const next = !saraOpen;
                  setSaraOpen(next);
                  setFocusMode(next ? 'split' : 'content');
                }}
                className={`flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all ${saraOpen ? (isZenMode ? 'bg-white/10 text-white' : 'bg-[#000666] text-white shadow-sm') : (isZenMode ? 'bg-white/5 text-slate-500 ring-1 ring-white/10 hover:text-slate-300' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:text-slate-600 hover:bg-slate-100')}`}
              >
                <BookOpen size={12} strokeWidth={2.4} />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] hidden sm:block">
                  {saraOpen ? 'Close Panel' : 'Panel Mode'}
                </span>
              </button>
            </div>
          </header>

          <main ref={containerRef} className={`flex-1 flex overflow-hidden relative min-h-0 transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>
            {/* Zen Mode Ambient Background */}
            {isZenMode && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#312e81_0%,transparent_40%)]" />
                <div className="absolute inset-0 aurora-silk opacity-20" />
                {/* Subtle Glass Particles (CSS-only for now) */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen" />
                
                {/* Ambient Synthesizer Pulse Layer */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                   <div className="w-[1000px] h-[1000px] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse" />
                </div>
              </div>
            )}

            {/* Floating Zen Controls */}
            {isZenMode && (
              <div className="absolute top-0 left-0 right-0 h-[80px] z-[100] flex items-start justify-center pt-8 group/zen-header">
                <div className={`flex items-center gap-x-6 px-5 py-2.5 bg-white/[0.08] backdrop-blur-[15px] border border-white/10 rounded-full shadow-2xl transition-all duration-1000 ${isSidebarGhost ? 'opacity-20 group-hover/zen-header:opacity-100 group-hover/zen-header:-translate-y-0 -translate-y-2' : 'opacity-100 translate-y-0'}`}>
                  <div className="flex items-center gap-3 px-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Zen Mode Active</span>
                  </div>
                  <div className="w-px h-4 bg-white/10 mx-2" />
                  <button 
                    onClick={() => setIsZenMode(false)}
                    className="px-4 py-1.5 bg-white text-[#05070a] rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  >
                    Exit Session
                  </button>
                </div>
              </div>
            )}

            {/* GLOBAL SYNTHESIS OVERLAY (Covers full main area) */}
            {isContentLoading && (
              <div className={`absolute inset-0 z-[100] animate-in fade-in duration-700 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>
                <ContentRenderer 
                  content={null} 
                  isLoading={true} 
                  moduleTitle={module?.title || ''} 
                  isZenMode={isZenMode}
                />
              </div>
            )}
            {/* PANEL 1: CONTENT / VISUALIZER */}
               <div className={`flex flex-col relative transition-all duration-500 flex-1 h-full min-w-0 min-h-0 z-10 ${isZenMode ? 'border-r border-white/5' : 'border-r border-slate-50'}`}>

                 <div className="flex-1 overflow-hidden relative min-h-0">
                    {leftPanelMode === 'smartboard' ? (
                      <Smartboard 
                        videoId={curatedVideoId || scoutedVideoIds[0]?.id || module?.resources?.find(r => r.type === 'youtube')?.videoId || ''}
                        allVideoIds={[
                          ...scoutedVideoIds,
                          ...(module?.resources?.filter(r => r.type === 'youtube' && r.videoId && !scoutedVideoIds.some(s => s.id === r.videoId)).map(r => ({ id: r.videoId!, title: r.title || '' })) || [])
                        ]}
                        moduleTitle={module?.title || ''}
                        moduleContent={generatedContent}
                        timeline={videoTimeline}
                        activeSegmentId={activeSegmentId || undefined}
                        onTimestampReached={(seg) => setActiveSegmentId(seg.id)}
                        onReSync={() => scoutAndMap(generatedContent || '', true)}
                        onVideoError={() => setLeftPanelMode('content')}
                        focusMode={focusMode}
                        isZenMode={isZenMode}
                        allowAutoplay={!isContentLoading}
                      />
                    ) : leftPanelMode === 'content' ? (
                     <div className="h-full overflow-hidden">
                        <ContentRenderer 
                          content={generatedContent} 
                          isLoading={isContentLoading} 
                          moduleTitle={module?.title || ''} 
                          scrollRef={contentScrollRef}
                          isZenMode={isZenMode}
                          milestones={milestones}
                          onJumpToTimestamp={handleJumpToTimestamp}
                          onSelectionAction={(action, text) => {
                            setSaraOpen(true);
                            setActiveRightTab('chat');
                            let prompt = '';
                            if (action === 'explain') prompt = `Explain this in depth within the context of ${module?.title}: "${text}"`;
                            else if (action === 'summarize') prompt = `Give me a concise scholarly summary of this: "${text}"`;
                            else if (action === 'examples') prompt = `Provide 3 real-world technical examples for this concept: "${text}"`;
                            handleSendMessage(prompt);
                          }}
                        />
                        
                        {hasReachedBottom && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                              <button 
                                onClick={() => updateModuleStatus(pathId!, phaseId!, moduleId!, !module?.isCompleted)}
                                className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${module?.isCompleted ? 'bg-emerald-500 text-white shadow-lg' : (isZenMode ? 'bg-white/10 text-white border border-white/10 hover:border-indigo-500/50' : 'bg-white text-slate-900 border border-slate-200 shadow-md hover:border-[#000666]')}`}
                              >
                                {module?.isCompleted ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                                {module?.isCompleted ? 'Mastered' : 'Mark Complete'}
                              </button>
                              
                              {nextModule && (
                                <button 
                                  onClick={() => navigate(`/study/${pathId}/${nextModule.phaseId}/${nextModule.id}`)}
                                  className="px-6 py-3 rounded-full bg-[#000666] text-white text-[9px] font-black uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2.5 group"
                                >
                                  Next Chapter
                                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                          </div>
                        )}
                     </div>
                   ) : (
                      <NeuralSynthesizer 
                        moduleTitle={module?.title || ''} 
                        moduleContent={generatedContent} 
                        keyConcepts={module?.keyConcepts || []} 
                        generatedContent={generatedContent || ''} 
                        onNodeClick={(node) => {
                          setSelectedNeuralNode(node);
                          setSaraOpen(true);
                        }}
                        onFullScreenToggle={() => {
                          const nextState = !isNeuralFullScreen;
                          setIsNeuralFullScreen(nextState);
                          if (nextState) setSaraOpen(false);
                          else setSaraOpen(true);
                        }}
                        isFullScreen={isNeuralFullScreen}
                        focusMode={focusMode}
                        isZenMode={isZenMode}
                      />
                   )}
                 </div>
              </div>
            
            {/* PANEL 2: ASSISTANT SIDEBAR — Ghost Mode in Zen */}
            <div
              className={`shrink-0 border-l flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-20 ${(saraOpen && !isContentLoading) ? 'w-[420px] min-w-[420px]' : 'w-0 min-w-0 opacity-0 pointer-events-none'} ${isZenMode ? 'bg-[#05070a]/90 backdrop-blur-xl border-white/5' : 'bg-white border-slate-100'}`}
              style={{
                opacity: (saraOpen && !isContentLoading) ? (isZenMode && isSidebarGhost ? 0.1 : 1) : 0,
                transition: 'opacity 1.2s ease, width 0.5s ease',
              }}
              onMouseEnter={() => { /* hook resets on mousemove globally */ }}
            >
               <div className={`flex p-1.5 gap-1 shrink-0 ${isZenMode ? 'bg-white/5 border-b border-white/5' : 'border-b border-slate-50 bg-slate-50/30'}`}>
                  {['chat', 'notes', 'quiz', 'vault'].map(t => (
                    <button key={t} onClick={() => setActiveRightTab(t as any)}
                       className={`flex-1 py-2 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${activeRightTab === t ? (isZenMode ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100') : (isZenMode ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40')}`}>{t}</button>
                  ))}
               </div>
               
               <div className="flex-1 overflow-hidden">
                  {leftPanelMode === 'visualizer' ? (
                    selectedNeuralNode ? (
                      <NodeDetailPanel 
                        node={selectedNeuralNode} 
                        moduleTitle={module?.title || ''} 
                        onClose={() => setSelectedNeuralNode(null)}
                        isSidebar={true}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                          <Eye size={24} />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2">Neural Observation</h4>
                        <p className="text-[10px] font-medium text-slate-400 max-w-[200px] leading-relaxed">Select a node in the map to expand its scholarly detail.</p>
                      </div>
                    )
                  ) : (
                    <>
                      {activeRightTab === 'chat' && (
                        <div className={`flex h-full flex-col assistant-glass-panel relative ${isZenMode ? 'bg-transparent' : 'bg-white'}`}>
                          
                          {/* Chat History */}
                          <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            <AnimatePresence initial={false}>
                              {chatHistory.length === 0 ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="h-full flex flex-col items-center justify-center text-center py-12 welcome-aura-card px-8"
                                >
                                   <div className="relative mb-8">
                                      <div className="w-20 h-20 bg-indigo-500/10 rounded-[30px] flex items-center justify-center text-indigo-400 relative z-10">
                                         <Sparkles size={32} className="animate-pulse" />
                                      </div>
                                      <div className="absolute -inset-4 bg-indigo-500/5 rounded-full blur-2xl animate-pulse" />
                                   </div>
                                   <h3 className={`text-[11px] font-black uppercase tracking-[0.4em] mb-3 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                                      Intelligence Link Established
                                   </h3>
                                   <p className="text-[12px] font-medium text-slate-500 leading-relaxed mb-10 max-w-[240px]">
                                      Welcome to your scholarly ecosystem. I am SARA, your neural learning architect. How shall we expand your mastery today?
                                   </p>
                                   <div className="w-full space-y-3">
                                      <button onClick={() => handleSendMessage("Give me a high-level summary of this module.")} className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}>Summarize Path</button>
                                      <button onClick={() => handleSendMessage("What are the 3 most important concepts here?")} className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}>Pinpoint Essentials</button>
                                   </div>
                                </motion.div>
                              ) : (
                                chatHistory.map((m) => (
                                  <motion.div 
                                    key={m.id} 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div className={`max-w-[92%] p-5 text-[13px] leading-relaxed group relative ${m.role === 'user' ? 'user-message-bubble' : 'sara-message-bubble'} ${isZenMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                      <div className={`prose prose-sm max-w-none ${isZenMode ? 'prose-invert text-slate-100' : 'text-slate-800'}`}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={ChatMarkdownComponents}>{m.text}</ReactMarkdown>
                                      </div>
                                      
                                      {m.role === 'model' && (
                                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                                           <div className="flex items-center gap-3">
                                              <button 
                                                onClick={() => {
                                                  setNotes(prev => prev + `\n\n### Insight from SARA\n${m.text}`);
                                                  toast.success("Added to Notes");
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors"
                                              >
                                                Save to Notes
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  handleAddToVault(`SARA Insight: ${module?.title}`, m.text, 'insight', 'SARA assistant');
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-colors"
                                              >
                                                Vault It
                                              </button>
                                           </div>
                                           <span className="text-[9px] font-medium text-slate-600">v3.1 Core</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </AnimatePresence>
                            
                            {isTyping && (
                              <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="flex justify-start"
                              >
                                <div className="sara-message-bubble p-5 flex items-center gap-4">
                                   <div className="flex gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 thought-stream-particle" />
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 thought-stream-particle" style={{ animationDelay: '0.2s' }} />
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 thought-stream-particle" style={{ animationDelay: '0.4s' }} />
                                   </div>
                                   <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Synthesizing...</span>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Input Section */}
                          <div className={`p-6 border-t ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                             <SARAActionChips onAction={(p) => handleSendMessage(p)} isZenMode={isZenMode} />
                             <div className="relative mt-2">
                                <input 
                                  ref={chatInputRef}
                                  value={inputMessage}
                                  onChange={(e) => setInputMessage(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                  placeholder="Command SARA..."
                                  className={`w-full rounded-[18px] py-4 pl-5 pr-14 text-[14px] font-medium outline-none transition-all ${
                                    isZenMode
                                      ? 'haptic-glow-input text-white placeholder:text-slate-600'
                                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10'
                                  }`}
                                />
                                <button onClick={() => handleSendMessage()} className={`absolute right-2 top-2 w-10 h-10 rounded-[14px] flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isZenMode ? 'bg-white text-[#05070a] shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#000666] text-white shadow-lg shadow-indigo-500/20'}`}>
                                  <Send size={18} />
                                </button>
                             </div>
                          </div>
                        </div>
                      )}
                      {activeRightTab === 'notes' && <RichNotesEditor content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />}
                      {activeRightTab === 'quiz' && (
                        <div className={`h-full flex flex-col ${isZenMode ? 'bg-transparent' : 'bg-white'}`}>
                          {quizState === 'active' && quizQuestions.length > 0 ? (
                            <SARAQuizPanel 
                              questions={quizQuestions} 
                              isZenMode={isZenMode} 
                              onRestart={() => setQuizState('idle')} 
                            />
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="h-full flex flex-col items-center justify-center p-10 text-center"
                            >
                               <div className="relative mb-10">
                                  <div className={`w-24 h-24 rounded-[36px] flex items-center justify-center ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-50 text-[#000666]'}`}>
                                     <Zap size={40} className="animate-pulse" />
                                  </div>
                                  <div className="absolute -inset-6 border border-dashed border-indigo-500/20 rounded-full animate-[spin_12s_linear_infinite]" />
                               </div>
                               
                               <h3 className={`text-[12px] font-black uppercase tracking-[0.4em] mb-4 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Knowledge Pulse</h3>
                               <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-10 max-w-[260px]">
                                  SARA has analyzed the module content. Are you ready to validate your mastery with a neural assessment?
                                </p>

                               <button 
                                 disabled={isTyping}
                                 onClick={async () => {
                                  if (!module) return;
                                  setIsTyping(true);
                                  try {
                                    const questions = await generateQuizForModule(module?.title || '', module?.keyConcepts || []);
                                    setQuizQuestions(questions);
                                    setQuizState('active');
                                  } catch (e) {
                                    toast.error("Failed to generate assessment. Try again.");
                                  } finally { setIsTyping(false); }
                                }} 
                                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl ${isZenMode ? 'bg-white text-slate-900' : 'bg-[#000666] text-white shadow-indigo-500/20'} hover:scale-105 active:scale-95 disabled:opacity-50`}
                               >
                                 {isTyping ? 'Calibrating Questions...' : 'Begin Assessment'}
                                 {!isTyping && <ArrowRight size={14} />}
                               </button>
                               
                               <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">88% Completion Required for Mastery</p>
                            </motion.div>
                          )}
                        </div>
                      )}
                      {activeRightTab === 'vault' && (
                        <SARAVaultPanel items={vaultItems} isZenMode={isZenMode} />
                      )}
                    </>
                  )}
               </div>
            </div>
          </main>
        </>
      )}

      {/* Global Modals */}
      <AITerminalOverlay isOpen={terminalOpen} actionType={terminalAction} topic={module?.title || ''} onClose={() => setTerminalOpen(false)} onComplete={handleTerminalComplete} executor={async () => {}} />
    </div>
  );
};

export default StudySession;

// Named wrapped export used in App.tsx routes
export const StudySessionWithBoundary: React.FC = () => (
  <StudySessionErrorBoundary>
    <StudySession />
  </StudySessionErrorBoundary>
);
