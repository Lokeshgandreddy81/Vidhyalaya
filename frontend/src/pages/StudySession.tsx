import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  generateModuleContent,
  scoutResources,
  chatWithTutor,
  generateQuizForModule,
  triggerBackgroundPreGeneration
} from '../services/geminiService';
import { ChatMessage, QuizQuestion, KnowledgeMilestone, ContentCitation, Resource } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, ChevronLeft, ChevronRight,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye, GitBranch, Layout, Target, ShieldCheck,
  Play, Pause, Clock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import ContentRenderer from '../components/ui/ContentRenderer';
import CodeSandbox from '../components/ui/CodeSandbox';
import NeuralSynthesizer, { NodeDetailPanel, ConceptNode } from '../features/study/NeuralSynthesizer';
import Smartboard from '../features/study/Smartboard';
import AITerminalOverlay, { ActionType } from '../components/ui/AITerminalOverlay';
import { mapMasteryTimeline } from '../services/geminiService';

import { useFocus } from '../context/FocusContext';
import { useFocusSession } from '../hooks/useFocusSession';
import { motion, AnimatePresence } from 'framer-motion';
import SARAActionChips from '../components/ui/SARAActionChips';
import SARAQuizPanel from '../features/study/SARAQuizPanel';
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
            className="px-6 py-3 rounded-[14px] bg-[#4e5bff] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
            Reload Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RichNotesEditor: React.FC<{ content: string; onChange: (val: string) => void, isZenMode: boolean }> = ({ content, onChange, isZenMode }) => {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-transparent' : 'bg-white/40 backdrop-blur-[8px]'}`}>
      <div className={`flex items-center justify-between gap-1.5 border-b px-3 py-2 ${isZenMode ? 'border-white/5 bg-white/5' : 'border-slate-200/50 bg-slate-50/30'}`}>
        <div className="flex items-center gap-2">
           <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Knowledge Base</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsPreview(false)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${!isPreview ? (isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-[#4e5bff]') : 'text-slate-400 hover:text-slate-600'}`}>Edit</button>
          <button onClick={() => setIsPreview(true)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${isPreview ? (isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-[#4e5bff]') : 'text-slate-400 hover:text-slate-600'}`}>Preview</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {isPreview ? (
          <div className={`absolute inset-0 overflow-y-auto p-6 prose prose-sm max-w-none custom-scrollbar ${isZenMode ? 'prose-invert prose-p:text-slate-300' : 'prose-slate'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*No notes yet...*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your notes in Markdown..."
            className={`absolute inset-0 w-full h-full resize-none p-6 text-[13px] leading-relaxed font-mono focus:outline-none custom-scrollbar ${isZenMode ? 'bg-transparent text-slate-300' : 'bg-transparent text-slate-700'}`}
          />
        )}
      </div>
    </div>
  );
};

const DEFAULT_SANDBOX_CODE = `// Cortex Sandbox
// Try a quick example from this lesson here.
console.log("Ready to build.");
`;

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { paths, isCloudSynced, updateModuleStatus, saveModuleNotes, saveModuleContent, saveModuleCitations, replaceModuleResources } = useAppStore();
  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);
  const citations = module?.citations || [];

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
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer' | 'sandbox'>('smartboard');
  const autoSelectedModuleRef = useRef<string | null>(null);
  const [focusMode, setFocusMode] = useState<'content' | 'split'>('split');
  const [saraOpen, setSaraOpen] = useState(true);
  const [sandboxCode, setSandboxCode] = useState(DEFAULT_SANDBOX_CODE);
  const [sandboxLanguage, setSandboxLanguage] = useState('javascript');
  const [sandboxForceInitialCode, setSandboxForceInitialCode] = useState(false);
  const [selectedNeuralNode, setSelectedNeuralNode] = useState<ConceptNode | null>(null);
  const [isNeuralFullScreen, setIsNeuralFullScreen] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [milestones, setMilestones] = useState<KnowledgeMilestone[]>([]);
  const [localCitations, setLocalCitations] = useState<ContentCitation[]>([]);
  const [pingNodeId, setPingNodeId] = useState<string | null>(null);

  // Check if active module has YouTube resources curated or scouted
  const hasVideos = useMemo(() => {
    if (isFromClassroom) return false; // Hide smartboard tab when entered via classroom
    return !!(
      curatedVideoId ||
      scoutedVideoIds.length > 0 ||
      module?.resources?.some(r => r.type === 'youtube' && r.videoId)
    );
  }, [curatedVideoId, scoutedVideoIds, module?.resources, isFromClassroom]);

  const handleSetWorkspaceMode = (mode: StudyWorkspaceMode) => {
    setWorkspaceMode(mode);
    if (mode !== 'neural') setIsNeuralFullScreen(false);
  };

  const openSandboxWithCode = (code: string, language = 'javascript') => {
    setSandboxCode(code || DEFAULT_SANDBOX_CODE);
    setSandboxLanguage(language || 'javascript');
    handleSetWorkspaceMode('sandbox');
    toast.success('Opened in Cortex Sandbox');
  };

  const getPanelModeIndex = () => {
    const modes = hasVideos
      ? ['smartboard', 'content', 'visualizer', 'sandbox']
      : ['content', 'visualizer', 'sandbox'];
    const index = modes.indexOf(leftPanelMode);
    return Math.max(0, index);
  };

  const inferSandboxLanguage = (code: string, language: string) => {
    const normalized = language.toLowerCase();
    if (normalized && !['text', 'txt', 'plain'].includes(normalized)) return normalized;

    const trimmed = code.trim();
    if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed) || /^<\w+[\s>]/.test(trimmed)) return 'html';
    if (/^(@media|:root|body|\.[\w-]+|#[\w-]+)\s*\{/.test(trimmed)) return 'css';
    if (/^(from\s+\w+\s+import|import\s+\w+|def\s+\w+|print\s*\()/m.test(trimmed)) return 'python';
    return 'javascript';
  };

  const handleAttachCodeToSandbox = (code: string, language: string) => {
    setSandboxCode(code);
    setSandboxLanguage(inferSandboxLanguage(code, language));
    setSandboxForceInitialCode(true);
    setLeftPanelMode('sandbox');
    setSelectedNeuralNode(null);
    toast.success('Code attached to Sandbox.');
  };

  // ── Real-Time Active Recall Timer States ──
  const [timeLeft, setTimeLeft] = useState(() => {
    return module?.estimatedMinutes ? module.estimatedMinutes * 60 : 25 * 60;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [timerAlert, setTimerAlert] = useState(false);

  // Sync Timer with Module Selection
  useEffect(() => {
    if (module) {
      setTimeLeft(module.estimatedMinutes ? module.estimatedMinutes * 60 : 25 * 60);
      setIsTimerRunning(true);
      setTimerAlert(false);
    }
  }, [module?.id]);

  const triggerCheckpointQuiz = async () => {
    if (!module) return;
    setIsTimerRunning(false);
    toast.success("⏰ Checkpoint reached! SARA is calibrating a Knowledge Assessment...", {
      duration: 5000,
    });
    setSaraOpen(true);
    setActiveRightTab('quiz');
    setQuizState('idle');
    setIsTyping(true);
    try {
      const questions = await generateQuizForModule(module.title || '', module.keyConcepts || []);
      setQuizQuestions(questions);
      setQuizState('active');
      toast.success("🧠 Checkpoint quiz active! Answer SARA to prove your module mastery.");
    } catch (e) {
      toast.error("Failed to generate quiz automatically. Start in the quiz panel to retry.");
    } finally {
      setIsTyping(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (!isTimerRunning || isContentLoading || !module) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerCheckpointQuiz();
          return 0;
        }
        if (prev <= 61) {
          setTimerAlert(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isContentLoading, module?.id]);

  const formatTimerTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleAdjustTimer = (amountSeconds: number) => {
    setTimeLeft((prev) => prev + amountSeconds);
    setTimerAlert(false);
    toast.success(`Session extended by ${amountSeconds / 60} minutes`);
  };

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
        <thead className={`${isZenMode ? 'bg-white/5 text-indigo-300' : 'bg-[#4e5bff]/5 text-indigo-900'} text-[9px] font-black uppercase tracking-wider`}>
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
      if (module.generatedContent) {
        setGeneratedContent(module.generatedContent);
        setLocalCitations(module.citations || []);
        scoutAndMap(module.generatedContent);
      }
      else loadContent();
    }
  }, [module?.id]);

  // Silent Background Warm-up for the next module
  useEffect(() => {
    if (generatedContent && nextModule && !nextModule.generatedContent && pathId && path) {
      const timer = setTimeout(() => {
        const nextPhase = path.phases.find(p => p.modules.some(m => m.id === nextModule.id));
        if (nextPhase) {
          triggerBackgroundPreGeneration(
            pathId,
            nextPhase.id,
            nextModule.id,
            nextModule.title,
            nextModule.keyConcepts || [],
            path.goal,
            nextModule.resources || [],
            saveModuleContent,
            saveModuleCitations,
            replaceModuleResources
          );
        }
      }, 3000); // 3s delay to ensure the current session renders and paints completely first
      return () => clearTimeout(timer);
    }
  }, [generatedContent, nextModule?.id, pathId]);

  const [contentError, setContentError] = useState<string | null>(null);

  const loadContent = async () => {
    if (!module) return;
    setIsContentLoading(true);
    setGeneratedContent(null);
    setContentError(null);
    try {
      // ── STEP 1: Scout resources FIRST so content generation uses real sources ──
      let resources = module.resources || [];
      if (resources.length === 0) {
        console.log(`[SARA] Pre-scouting resources before content generation for: "${module.title}"`);
        resources = await scoutResources(module.title || '', path?.goal || 'General Mastery');
        if (resources.length > 0 && pathId && phaseId && moduleId) {
          replaceModuleResources(pathId, phaseId, moduleId, resources);
        }
      }

      // ── STEP 2: Generate content WITH the scouted resources ──
      const { content, citations } = await generateModuleContent(
        module?.title || '',
        module?.keyConcepts || [],
        path?.goal || 'General Mastery',
        resources
      );
      setGeneratedContent(content);
      setLocalCitations(citations || []);
      if (pathId && phaseId && moduleId) {
        saveModuleContent(pathId, phaseId, moduleId, content);
        if (citations) saveModuleCitations(pathId, phaseId, moduleId, citations);
      }

      // ── STEP 3: Map timeline (resources already scouted above) ──
      scoutAndMap(content, false, resources);
    } catch (err: any) {
      const msg = err?.message || '';
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate');
      setContentError(isQuota ? 'quota' : 'error');
      const fallback = `## ${module?.title || ''}\n\n> ⚡ **AI Synthesis Paused** — The Gemini API is temporarily rate-limited. Your session is still active.\n\n### Key Concepts\n${(module?.keyConcepts || []).map(c => `- **${c}**`).join('\n')}\n\n### Study Tips\nWhile AI synthesis is paused, you can:\n1. Review the key concepts above\n2. Ask SARA specific questions in the Chat panel\n3. Use the Quiz tab to test your existing knowledge\n\n*Content will auto-refresh once quota resets.*`;
      setGeneratedContent(fallback);
      if (isQuota) toast.warning('API quota reached — showing cached mode. Quiz & Chat still work!');
      else toast.error('Content synthesis failed. Showing fallback mode.');
    } finally { setIsContentLoading(false); }
  };

  const scoutAndMap = async (content: string, force = false, preloadedResources?: Resource[]) => {
    if (!module || !path) return;
    setIsScouting(true);
    try {
      // 1. Get Milestones and Curated Video from Backend (non-blocking)
      const { api } = await import('../services/api');
      api.curateVideo(content).then(curation => {
        if (curation?.milestones) setMilestones(curation.milestones);
      }).catch(() => {});

      let currentResources = preloadedResources || module.resources || [];

      // Logic-based bad resource detection:
      // A resource is "bad" if its title explicitly names a DIFFERENT technology than the module.
      const moduleTitleLower = (module.title || '').toLowerCase();
      const techMismatches = [
        { signal: 'html', check: (t: string) => t.includes('html') && !moduleTitleLower.includes('html') },
        { signal: 'css',  check: (t: string) => t.includes('css')  && !moduleTitleLower.includes('css') },
        { signal: 'git',  check: (t: string) => t.includes('git')  && !moduleTitleLower.includes('git') },
        { signal: 'sql',  check: (t: string) => t.includes('sql')  && !moduleTitleLower.includes('sql') },
        { signal: 'rust', check: (t: string) => t.includes('rust') && !moduleTitleLower.includes('rust') },
      ];
      const hasBadResource = currentResources.some(r => {
        if (!r.videoId || r.videoId.length < 5) return true;
        const titleLower = (r.title || '').toLowerCase();
        return techMismatches.some(m => m.check(titleLower));
      });

      if (hasBadResource) {
        console.log(`[SARA] Purging mismatched resources for: "${module.title}"`);
        if (pathId && phaseId && moduleId) {
          replaceModuleResources(pathId, phaseId, moduleId, []);
        }
        currentResources = [];
      }

      if (currentResources.length === 0 || force) {
        console.log(`[SARA] Scouting topic-specific resources for: "${module.title}"`);
        currentResources = await scoutResources(module.title || '', path.goal);

        if (currentResources.length > 0 && pathId && phaseId && moduleId) {
          replaceModuleResources(pathId, phaseId, moduleId, currentResources);
        }
      }

      // Sync bibliography only; the classroom now stays focused on lesson evidence.
      if (currentResources.length > 0) {
        const baseCitations = module.citations || [];
        const existingUrls = new Set(baseCitations.map(c => c.url));

        const scoutedCitations: ContentCitation[] = currentResources
          .filter(r => !existingUrls.has(r.content))
          .map((r, idx) => ({
            index: baseCitations.length + idx + 1,
            title: r.title || 'Scouted Source',
            url: r.content,
            domain: r.content.includes('youtube.com') || r.content.includes('youtu.be') ? 'youtube.com' : undefined,
            snippet: 'Verified resource found via AI Web Scout.',
          }));

        const mergedCitations = [...baseCitations, ...scoutedCitations];
        setLocalCitations(mergedCitations);

        if (pathId && phaseId && moduleId && scoutedCitations.length > 0) {
          saveModuleCitations(pathId, phaseId, moduleId, mergedCitations);
        }
      }

      // Map timeline chapters to content sections
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
  }, [generatedContent, isContentLoading]);

  useEffect(() => {
    setHasReachedBottom(false);
  }, [moduleId]);

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;

    // Sanitize: strip macOS file paths (screenshots, drag-drop file references) that can crash Gemini
    const sanitized = sanitizeSaraMessage(msg);
    if (!sanitized) {
      toast.error('File paths and images are not supported. Please type your question as text.');
      return;
    }

    const sanitizedDisplay = displayText ? sanitizeSaraMessage(displayText) : sanitized;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: sanitizedDisplay || sanitized, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const response = await chatWithTutor(chatHistory, sanitized, `Module: ${module?.title}`, generatedContent || '');
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);

      const keywords = response.toLowerCase().split(/[\s,.]+/);
      const pingId = (window as any).__NEURAL_NODES__?.find((node: any) =>
        node.label && keywords.includes(node.label.toLowerCase())
      )?.id;

      if (pingId) {
        setPingNodeId(pingId);
        setTimeout(() => setPingNodeId(null), 5000);
      }
    } catch (err: any) {
      const errorMsg = err?.message || '';
      if (errorMsg.includes('image input') || errorMsg.includes('does not support')) {
        toast.error('SARA cannot process images or file paths. Please type your question as text.');
      } else if (errorMsg.includes('AI_TIMEOUT')) {
        toast.error('Request timed out. Please try a simpler question.');
      } else if (errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
        toast.error('AI service is busy. Please wait a moment and try again.');
      } else {
        toast.error('Failed to get a response. Please try rephrasing your question.');
      }
      console.warn('[Chat] handleSendMessage error:', errorMsg);
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

  const handleCitationClick = (idx: number) => {
    const citation = citations?.[idx - 1];
    if (citation) {
      window.open(citation.url, '_blank');
    } else {
      toast.error('Source link unavailable');
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

  useEffect(() => {
    const handleCodeInjection = (e: any) => {
      const detail = e.detail || {};
      if (!detail.code) return;
      openSandboxWithCode(detail.code, detail.language || 'javascript');
    };
    window.addEventListener('vidyal_inject_code', handleCodeInjection);
    return () => window.removeEventListener('vidyal_inject_code', handleCodeInjection);
  }, []);

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
            setSaraOpen(true);
            setActiveRightTab('quiz');
            setQuizState('idle');
          }
        },
        duration: 10000,
      });
    }, 600000);

    return () => clearInterval(interval);
  }, [module, isContentLoading, isZenMode]);

  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);

  return (
    <div className={`flex flex-col w-full h-full transition-colors duration-1000 overflow-hidden font-sans ${isZenMode ? 'bg-[#05070a]' : 'bg-transparent'}`}>

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
                  <div className={`absolute inset-0 animate-pulse ${isZenMode ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-br from-indigo-500/5 to-[#4e5bff]/5'}`} />
                  <Loader size={32} className={`animate-spin relative z-10 ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`} />
                </div>
                <div className={`absolute -inset-4 border border-dashed rounded-full animate-[spin_20s_linear_infinite] opacity-50 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`} />
              </div>
              <div className="mt-12 text-center space-y-3">
                <h2 className={`text-[10px] font-black uppercase tracking-[0.5em] animate-pulse ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Synchronizing Neural Data</h2>
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
                className={`flex items-center gap-2 px-6 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isZenMode ? 'bg-white text-slate-900' : 'bg-[#4e5bff] text-white shadow-lg shadow-indigo-500/20'}`}
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <header className={`shrink-0 overflow-hidden px-5 sm:px-8 grid grid-cols-3 items-center z-[60] transition-all duration-700 relative ${isZenMode || isNeuralFullScreen ? 'h-0 opacity-0 border-none pointer-events-none' : 'h-14 bg-white/70 backdrop-blur-md border-b border-slate-200/40 shadow-sm'}`}>

            {/* Dynamic Glowing HSL Border Line */}
            {!isZenMode && !isNeuralFullScreen && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[1.5px] z-10"
                style={{
                  background: 'linear-gradient(90deg, transparent, #4e5bff, #8b5cf6, #38bdf8, transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift 4s linear infinite',
                  opacity: isTimerRunning ? 0.85 : 0.35,
                  transition: 'opacity 0.5s ease',
                }}
              />
            )}

            {/* Left Section */}
            <div className="flex items-center gap-4 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <Link to="/dashboard" aria-label="Back to Dashboard" title="Back to Dashboard" className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-slate-200/50 hover:bg-slate-50/80 ${isZenMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-[#4e5bff]'}`}>
                  <ArrowLeft size={18} />
                </Link>
                <button
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-transparent hover:border-slate-200/50 hover:bg-slate-50/80 ${isCurriculumOpen ? 'bg-indigo-500/10 text-indigo-500' : (isZenMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-[#4e5bff]')}`}
                >
                  <GitBranch size={18} />
                </button>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <span className={`text-[8px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full shrink-0 ${isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/10'}`}>
                    Phase {path?.phases.findIndex(p => p.id === phaseId) !== -1 ? ((path?.phases.findIndex(p => p.id === phaseId) ?? 0) + 1).toString().padStart(2, '0') : '01'}
                  </span>
                  <span className={`text-[9.5px] font-bold tracking-tight truncate ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>{phase?.title}</span>
                </div>
                <h1 className={`text-[14px] font-black tracking-tight leading-none truncate ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{module?.title}</h1>
              </div>
            </div>

            {/* Center Section: Mode Toggle (Animate with Brilliant Sliding Background) */}
            <div className="flex justify-center min-w-0">
              <div className={`relative flex p-0.5 rounded-[12px] ring-1 shadow-sm transition-all ${isZenMode ? 'bg-white/5 ring-white/10' : 'bg-slate-50 ring-slate-100'}`}>
                {/* Sliding Background Indicator */}
                <motion.div
                  initial={false}
                  animate={{ x: getPanelModeIndex() * 88 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                  className={`absolute top-0.5 bottom-0.5 w-[86px] rounded-[10px] z-0 ${isZenMode ? 'bg-white/10 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50' : 'bg-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-slate-200'}`}
                />

                {hasVideos && (
                  <button
                    onClick={() => {
                      setLeftPanelMode('smartboard');
                      setSelectedNeuralNode(null);
                    }}
                    className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'smartboard' ? (isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]') : 'text-slate-400 hover:text-slate-500'}`}
                  >
                    <motion.span
                      animate={leftPanelMode === 'smartboard' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                      transition={leftPanelMode === 'smartboard' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                    >
                      Smartboard
                    </motion.span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setLeftPanelMode('content');
                    setSelectedNeuralNode(null);
                  }}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'content' ? (isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]') : 'text-slate-400 hover:text-slate-500'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'content' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'content' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Whiteboard
                  </motion.span>
                </button>
                <button
                  onClick={() => {
                    setLeftPanelMode('visualizer');
                    setSelectedNeuralNode(null);
                  }}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'visualizer' ? (isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]') : 'text-slate-400 hover:text-slate-500'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'visualizer' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'visualizer' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Neural Map
                  </motion.span>
                </button>
                <button
                  onClick={() => {
                    setLeftPanelMode('sandbox');
                    setSandboxForceInitialCode(false);
                    setSelectedNeuralNode(null);
                  }}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'sandbox' ? (isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]') : 'text-slate-400 hover:text-slate-500'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'sandbox' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'sandbox' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Sandbox
                  </motion.span>
                </button>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end gap-3.5 min-w-0">
              {/* Real-Time Checkpoint Timer Pill */}
              <div
                className={`flex items-center gap-2.5 h-7 px-3.5 rounded-full border transition-all duration-300 ${
                  timerAlert
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.12)]'
                    : 'bg-[#4e5bff]/5 border-slate-200/60 text-[#4e5bff] shadow-sm'
                }`}
              >
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
                  className="hover:scale-110 active:scale-95 transition-all text-current cursor-pointer flex items-center justify-center"
                >
                  {isTimerRunning ? <Pause size={10} strokeWidth={3} /> : <Play size={10} strokeWidth={3} />}
                </button>

                <div className="flex items-center gap-1.5 min-w-[50px] justify-center font-mono text-[10.5px] font-black tracking-wider relative">
                  {/* SVG Micro Circular Progress Ring */}
                  <div className="relative w-[18px] h-[18px] flex items-center justify-center shrink-0">
                    <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke={timerAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(78, 91, 255, 0.1)'}
                        strokeWidth="1.8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke={timerAlert ? '#ef4444' : '#4e5bff'}
                        strokeWidth="1.8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 8}
                        strokeDashoffset={2 * Math.PI * 8 - (Math.max(0, Math.min(100, (timeLeft / (module?.estimatedMinutes ? module.estimatedMinutes * 60 : 25 * 60)) * 100)) / 100) * 2 * Math.PI * 8}
                        strokeLinecap="round"
                        transition={{ duration: 0.5 }}
                      />
                    </svg>
                    <Clock size={9} className={`relative z-10 text-current ${isTimerRunning && !timerAlert ? "animate-[spin_10s_linear_infinite]" : ""}`} />
                  </div>
                  <span>{formatTimerTime(timeLeft)}</span>
                </div>

                <button
                  onClick={() => handleAdjustTimer(5 * 60)}
                  title="Add +5 Mins"
                  className="text-[8px] font-black uppercase px-1 rounded bg-[#4e5bff]/10 hover:bg-[#4e5bff]/20 active:scale-95 transition-all cursor-pointer"
                >
                  +5m
                </button>
              </div>

              <button
                onClick={() => setIsZenMode(!isZenMode)}
                className={`flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all hover:scale-105 active:scale-95 ${isZenMode ? 'bg-white text-[#05070a] shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:text-[#4e5bff] hover:bg-slate-100'}`}
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
                className={`flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all hover:scale-105 active:scale-95 ${saraOpen ? (isZenMode ? 'bg-white/10 text-white' : 'bg-[#4e5bff] text-white shadow-sm') : (isZenMode ? 'bg-white/5 text-slate-500 ring-1 ring-white/10 hover:text-slate-300' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:text-slate-600 hover:bg-slate-100')}`}
              >
                <BookOpen size={12} strokeWidth={2.4} />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] hidden sm:block">
                  {saraOpen ? 'Close Panel' : 'Panel Mode'}
                </span>
              </button>
            </div>
          </header>

          <main ref={containerRef} className={`flex-1 flex overflow-hidden relative min-h-0 transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-transparent'}`}>

            {/* ── Curriculum Navigator (Pristine Minimalist Sidebar) ── */}
            <motion.div
              initial={false}
              animate={{
                width: (isCurriculumOpen && !isNeuralFullScreen) ? 340 : 0,
                opacity: (isCurriculumOpen && !isNeuralFullScreen) ? 1 : 0
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`shrink-0 flex flex-col border-r overflow-hidden z-30 transition-all duration-500 @container ${isZenMode ? 'bg-[#05070a]/90 backdrop-blur-xl border-white/5' : 'bg-white/75 backdrop-blur-[14px] border-slate-200/50 shadow-sm'}`}
            >
              <div className="flex-1 flex flex-col min-w-[340px] h-full max-h-full">
                <div className="p-8 pb-4">
                  <h2 className={`text-[clamp(14px,5cqw,18px)] font-bold tracking-tight ${isZenMode ? 'text-white' : 'text-[#444]'}`}>
                    {path?.title || 'Machine learning'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  {path?.phases?.map((p) => (
                    <div key={p.id} className="mb-6">
                      <div className="px-8 py-2">
                        <h4 className={`text-[clamp(12px,4cqw,15px)] font-normal ${isZenMode ? 'text-slate-400' : 'text-[#666]'}`}>{p.title}</h4>
                      </div>
                      <div className="mt-2">
                        {p.modules?.map((m) => {
                          const isActive = m.id === moduleId;
                          return (
                            <button
                              key={m.id}
                              onClick={() => navigate(`/study/${pathId}/${p.id}/${m.id}`)}
                              className={`w-full flex items-center justify-between py-3 px-8 transition-all group relative ${
                                isActive
                                  ? (isZenMode ? 'bg-white/5' : 'bg-slate-50')
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                 <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'translate-x-0' : 'group-hover:translate-x-1'}`}>
                                   <div
                                     className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] transition-colors"
                                     style={{ borderLeftColor: isZenMode ? (isActive ? '#6366f1' : '#444') : (isActive ? '#444' : '#666') }}
                                   />
                                 </div>
                                 <span className={`text-[clamp(11px,4.2cqw,15px)] font-normal transition-colors truncate block leading-tight ${isActive ? (isZenMode ? 'text-white' : 'text-[#333]') : (isZenMode ? 'text-slate-400' : 'text-[#444]')}`}>
                                   {m.title}
                                 </span>
                              </div>
                              {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-indigo-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-8 border-t ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Path Progress</p>
                     <p className={`text-[11px] font-bold ${isZenMode ? 'text-white' : 'text-slate-600'}`}>{path?.progress}%</p>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${path?.progress}%` }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Zen Mode Ambient Background */}
            {isZenMode && !isNeuralFullScreen && (
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

                  {/* Zen Timer HUD Display */}
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-black border transition-all ${
                    timerAlert
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                      : 'bg-white/5 border-white/10 text-white shadow-sm'
                  }`}>
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="hover:scale-110 active:scale-95 transition-all text-current cursor-pointer flex items-center justify-center"
                    >
                      {isTimerRunning ? <Pause size={10} strokeWidth={3} /> : <Play size={10} strokeWidth={3} />}
                    </button>
                    <span>{formatTimerTime(timeLeft)}</span>
                    <button
                      onClick={() => handleAdjustTimer(5 * 60)}
                      className="text-[8px] px-1 rounded bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      +5m
                    </button>
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
               <div className={`flex flex-col relative transition-all duration-500 flex-1 h-full min-w-0 min-h-0 z-10 ${isZenMode ? 'border-r border-white/5' : (leftPanelMode === 'content' ? 'bg-transparent' : 'border-r border-slate-200/50')}`}>

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
                        keyConcepts={module?.keyConcepts || []}
                        generatedContent={generatedContent || ''}
                        onFullScreenToggle={() => {
                          setIsNeuralFullScreen(prev => {
                            const next = !prev;
                            if (next) setSaraOpen(false);
                            return next;
                          });
                        }}
                        isFullScreen={isNeuralFullScreen}
                        focusMode={focusMode}
                        isZenMode={isZenMode}
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
                          citations={localCitations}
                          onCitationClick={handleCitationClick}
                          onJumpToTimestamp={handleJumpToTimestamp}
                          onCodeAttach={handleAttachCodeToSandbox}
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
                                className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${module?.isCompleted ? 'bg-emerald-500 text-white shadow-lg' : (isZenMode ? 'bg-white/10 text-white border border-white/10 hover:border-indigo-500/50' : 'bg-white text-slate-900 border border-slate-200 shadow-md hover:border-[#4e5bff]')}`}
                              >
                                {module?.isCompleted ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                                {module?.isCompleted ? 'Mastered' : 'Mark Complete'}
                              </button>

                              {nextModule && (
                                <button
                                  onClick={() => navigate(`/study/${pathId}/${nextModule.phaseId}/${nextModule.id}`)}
                                  className="px-6 py-3 rounded-full bg-[#4e5bff] text-white text-[9px] font-black uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2.5 group"
                                >
                                  Next Mission
                                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                          </div>
                        )}
                     </div>
                   ) : leftPanelMode === 'sandbox' ? (
                      <CodeSandbox
                        initialCode={sandboxCode}
                        initialLanguage={sandboxLanguage}
                        forceInitialCode={sandboxForceInitialCode}
                        onClose={() => setLeftPanelMode('content')}
                        isZenMode={isZenMode}
                        onAskSara={(prompt) => {
                          setSaraOpen(true);
                          setActiveRightTab('chat');
                          handleSendMessage(prompt);
                        }}
                      />
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
                        pingNodeId={pingNodeId}
                      />
                    )}
                  </div>
               </div>

             {/* PANEL 2: ASSISTANT SIDEBAR — Ghost Mode in Zen */}
            <div
              className={`shrink-0 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-20 ${(saraOpen && !isContentLoading) ? 'w-[420px] min-w-[420px]' : 'w-0 min-w-0 opacity-0 pointer-events-none'} ${isZenMode ? 'bg-[#05070a]/90 backdrop-blur-xl border-white/5 zen-mode' : 'bg-white/75 backdrop-blur-[14px] border-l border-slate-200/50 shadow-lg'}`}
              style={{
                opacity: (saraOpen && !isContentLoading) ? (isZenMode && isSidebarGhost ? 0.1 : 1) : 0,
                transition: 'opacity 1.2s ease, width 0.5s ease',
              }}
              onMouseEnter={() => { /* hook resets on mousemove globally */ }}
            >
               {/* SARA Sliding Tab Indicators */}
               <div className={`flex p-1.5 gap-1.5 shrink-0 relative ${isZenMode ? 'bg-white/5 border-b border-white/5' : 'border-b border-slate-200/30 bg-slate-100/60 backdrop-blur-sm'}`}>
                  {['chat', 'quiz', 'notes', 'vault'].map(t => {
                    const isActive = activeRightTab === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setActiveRightTab(t as any)}
                        className={`flex-1 py-2 rounded-[10px] text-[8.5px] font-black uppercase tracking-[0.22em] relative z-10 transition-all duration-300 ${
                          isActive
                            ? (isZenMode ? 'text-white' : 'text-[#4e5bff]')
                            : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700')
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sara-active-tab"
                            className={`absolute inset-0 rounded-[8px] z-[-1] ${
                              isZenMode
                                ? 'bg-white/10 ring-1 ring-white/10 shadow-lg'
                                : 'bg-white text-[#4e5bff] shadow-[0_3px_12px_rgba(78,91,255,0.15)] border border-slate-200/60'
                            }`}
                            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
                          />
                        )}
                        <span className="relative z-10">{t}</span>
                      </button>
                    );
                  })}
               </div>

               <div className="flex-1 overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={leftPanelMode === 'visualizer' ? (selectedNeuralNode ? `node-${selectedNeuralNode.id}` : 'visualizer-empty') : activeRightTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 flex flex-col overflow-hidden"
                    >
                      {leftPanelMode === 'visualizer' ? (
                        selectedNeuralNode ? (
                          <NodeDetailPanel
                            node={selectedNeuralNode}
                            moduleTitle={module?.title || ''}
                            onClose={() => setSelectedNeuralNode(null)}
                            isSidebar={true}
                          />
                        ) : (
                          <div className={`h-full flex flex-col items-center justify-center p-12 text-center ${isZenMode ? 'bg-transparent' : 'bg-slate-50/30'}`}>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${isZenMode ? 'bg-white/5 border border-white/10 text-slate-500' : 'bg-white border border-slate-100 text-slate-300'}`}>
                              <Eye size={24} />
                            </div>
                            <h4 className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Neural Observation</h4>
                            <p className="text-[10px] font-medium text-slate-400 max-w-[200px] leading-relaxed">Select a node in the map to expand its scholarly detail.</p>
                          </div>
                        )
                      ) : (
                        <>
                          {activeRightTab === 'chat' && (
                            <div className={`flex h-full flex-col assistant-glass-panel relative ${isZenMode ? 'bg-transparent' : 'bg-transparent'}`}>

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
                                          <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center relative z-10 ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                             <Sparkles size={32} className="animate-pulse" />
                                          </div>
                                          <div className={`absolute -inset-4 rounded-full blur-2xl animate-pulse ${isZenMode ? 'bg-indigo-500/5' : 'bg-indigo-500/10'}`} />
                                       </div>
                                       <h3 className={`text-[11px] font-black uppercase tracking-[0.4em] mb-3 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                                          Intelligence Link Established
                                       </h3>
                                       <p className="text-[12px] font-medium text-slate-500 leading-relaxed mb-10 max-w-[240px]">
                                          Welcome to your scholarly ecosystem. I am SARA, your neural learning architect. How shall we expand your mastery today?
                                       </p>
                                       <div className="w-full space-y-3">
                                          <button onClick={() => handleSendMessage("Give me a high-level summary of this module.")} className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200'}`}>Summarize Path</button>
                                          <button onClick={() => handleSendMessage("What are the 3 most important concepts here?")} className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200'}`}>Pinpoint Essentials</button>
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
                                                      setNotes(prev => {
                                                        const newNotes = prev + `\n\n### Insight from SARA\n${m.text}`;
                                                        if (pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, newNotes);
                                                        return newNotes;
                                                      });
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
                                    <button aria-label="Send message" title="Send message" onClick={() => handleSendMessage()} className={`absolute right-2 top-2 w-10 h-10 rounded-[14px] flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isZenMode ? 'bg-white text-[#05070a] shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#4e5bff] text-white shadow-lg shadow-indigo-500/20'}`}>
                                      <Send size={18} />
                                    </button>
                                 </div>
                              </div>
                            </div>
                          )}
                          {activeRightTab === 'notes' && <RichNotesEditor isZenMode={isZenMode} content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />}
                          {activeRightTab === 'quiz' && (
                            <div className={`h-full flex flex-col ${isZenMode ? 'bg-transparent' : 'bg-transparent'}`}>
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
                                      <div className={`w-24 h-24 rounded-[36px] flex items-center justify-center ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-50 text-[#4e5bff]'}`}>
                                         <Zap size={40} className="animate-pulse" />
                                      </div>
                                      <div className="absolute -inset-6 border border-dashed border-indigo-500/20 rounded-full animate-[spin_12s_linear_infinite]" />
                                   </div>

                                   <h3 className={`text-[12px] font-black uppercase tracking-[0.4em] mb-4 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Knowledge Pulse</h3>
                                   <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-10 max-w-[260px]">
                                      Cortex has analyzed the module content. Are you ready to validate your mastery with a neural assessment?
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
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl ${isZenMode ? 'bg-white text-slate-900' : 'bg-[#4e5bff] text-white shadow-indigo-500/20'} hover:scale-105 active:scale-95 disabled:opacity-50`}
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
                    </motion.div>
                  </AnimatePresence>
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
