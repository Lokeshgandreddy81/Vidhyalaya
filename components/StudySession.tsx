import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  generateModuleContent, 
  scoutResources, 
  chatWithTutor, 
  generateQuizForModule,
  mapMasteryTimeline 
} from '../services/geminiService';
import { ChatMessage, QuizQuestion, StudyModule, Resource, VideoSegment } from '../types';
import {
  ArrowLeft, Sparkles, CheckCircle, BrainCircuit, X, HelpCircle,
  School, Loader, BookOpen, PenLine, File, ChevronRight, ChevronDown,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, ListOrdered,
  LayoutDashboard, Library, RefreshCcw, GraduationCap,
  Headphones, Check, Map as MapIcon, Copy, Quote, Globe,
  MonitorPlay, CalendarDays, Menu, Settings as SettingsIcon, FileCheck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import ContentRenderer from './ContentRenderer';
import NeuralSynthesizer from './NeuralSynthesizer';
import CinemaStudio from './CinemaStudio';
import { SourcesPanel } from './SourcesPanel';


const RichNotesEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== content) editorRef.current.innerHTML = content || ''; }, [content]);
  const exec = (command: string, value: string = '') => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  const toolbarButton = (command: string, Icon: any, label: string) => (
    <button
      type="button"
      aria-label={label}
      onMouseDown={event => event.preventDefault()}
      onClick={() => exec(command)}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-indigo-50 hover:text-[#000666]"
    >
      <Icon size={15}/>
    </button>
  );
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        {toolbarButton('bold', Bold, 'Bold')}
        {toolbarButton('italic', Italic, 'Italic')}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        {toolbarButton('insertUnorderedList', ListIcon, 'Bullet list')}
        {toolbarButton('insertOrderedList', ListOrdered, 'Numbered list')}
      </div>
      <div className="min-h-0 flex-1 bg-white p-3">
        <div
          ref={editorRef}
          contentEditable
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          data-placeholder="Write a short takeaway, example, or question..."
          className="rich-editor h-full overflow-y-auto rounded-xl bg-slate-50/55 p-4 text-sm leading-relaxed text-slate-700 selection:bg-indigo-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </div>
  );
};

const normalizeSelectionText = (value: string) => value.replace(/\s+/g, ' ').trim();

const escapeNoteHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const selectionPreview = (value: string, maxLength = 120) => {
  const normalized = normalizeSelectionText(value);
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const formatSegmentTime = (seconds = 0) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

const sanitizeLearningLabel = (value: string) => value
  .replace(/Step\s*9\.5\s*[—–-]\s*Quick Review Flow/gi, 'Step 9.5 — Mastery Checkpoint')
  .replace(/Quick Review Flow/gi, 'Mastery Checkpoint')
  .trim();

const sanitizeTimeline = (timeline: any[] = []) => timeline.map(segment => ({
  ...segment,
  label: sanitizeLearningLabel(segment?.label || ''),
}));

const buildLessonTimelineFallback = (content: string | null, title = 'Current lesson'): VideoSegment[] => {
  const headingLabels = (content || '')
    .split('\n')
    .map(line => line.match(/^#{2,3}\s+(.+)$/)?.[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .map(value => sanitizeLearningLabel(value.replace(/\*\*/g, '').replace(/`/g, '')))
    .filter(value => value && !/^contents?$/i.test(value));

  const uniqueLabels = Array.from(new Set(headingLabels)).slice(0, 8);
  const labels = uniqueLabels.length > 0
    ? uniqueLabels
    : ['Entry Hook', 'Minimal Anchor', 'Hierarchy Map', 'Core Concepts', 'Mastery Checkpoint'];

  return labels.map((label, index) => ({
    id: `fallback-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: index === 0 && !headingLabels.length ? title : label,
    timestamp: Math.max(8, index * 95 + 8),
    confidence: 0.45,
  }));
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { paths, updateModuleStatus, saveModuleNotes, replaceModuleResources, saveModuleContent, saveModuleCitations, isCloudSynced } = useAppStore();

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz' | 'resources' | 'sources'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSynthesizingNotes, setIsSynthesizingNotes] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isScouting, setIsScouting] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [saraOpen, setSaraOpen] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [mainMenuOwner, setMainMenuOwner] = useState<string | null>(null);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [boardMenuOwner, setBoardMenuOwner] = useState<string | null>(null);
  const [videoTimeline, setVideoTimeline] = useState<any[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<'content' | 'visualizer'>('content');
  const [focusMode, setFocusMode] = useState<'content' | 'video' | 'split'>('content');
  const [isFocusTransitioning, setIsFocusTransitioning] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionCommand, setSelectionCommand] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selectionCopied, setSelectionCopied] = useState(false);
  const [tutorRailWidth, setTutorRailWidth] = useState(390);
  const [isTutorRailCollapsed, setIsTutorRailCollapsed] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const loadAttemptRef = useRef<string | null>(null);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const boardMenuCloseTimerRef = useRef<number | null>(null);
  
  // ── RESIZING & FOCUS LOGIC ──
  const [splitRatio, setSplitRatio] = useState(55);
  const isResizingRef = useRef(false);
  const isTutorRailResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncViewport = () => setIsCompactViewport(window.innerWidth < 900);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  // Derived effective split ratio based on focus mode
  const effectiveSplit = useMemo(() => {
    if (focusMode === 'content') return 100;
    if (focusMode === 'video') return 0;
    if (isCompactViewport) return 100;
    return splitRatio;
  }, [focusMode, isCompactViewport, splitRatio]);

  const boardTransition = isResizing
    ? 'none'
    : 'width 1250ms cubic-bezier(0.16,1,0.3,1), opacity 950ms cubic-bezier(0.16,1,0.3,1), transform 1250ms cubic-bezier(0.16,1,0.3,1), filter 950ms cubic-bezier(0.16,1,0.3,1), max-height 900ms cubic-bezier(0.16,1,0.3,1), box-shadow 1250ms cubic-bezier(0.16,1,0.3,1)';

  const setBoardFocusMode = (nextMode: 'content' | 'video' | 'split') => {
    if (nextMode === focusMode) return;

    if (focusTransitionTimerRef.current) window.clearTimeout(focusTransitionTimerRef.current);
    setIsFocusTransitioning(true);
    setFocusMode(nextMode);
    focusTransitionTimerRef.current = window.setTimeout(() => {
      setIsFocusTransitioning(false);
      focusTransitionTimerRef.current = null;
    }, 1320);
  };

  const requestFocusMode = (target: 'content' | 'video') => {
    const nextMode = focusMode === target ? 'split' : target;
    setBoardFocusMode(nextMode);
  };

  useEffect(() => {
    return () => {
      if (focusTransitionTimerRef.current) window.clearTimeout(focusTransitionTimerRef.current);
      if (boardMenuCloseTimerRef.current) window.clearTimeout(boardMenuCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (focusMode !== 'video') return;
    setSaraOpen(false);
    setSelectionCommand(null);
  }, [focusMode]);

  useEffect(() => {
    const handleMouseUp = () => { 
      isResizingRef.current = false; 
      isTutorRailResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        setSplitRatio(Math.min(Math.max(newRatio, 20), 80));
      }
      if (isTutorRailResizingRef.current) {
        const nextWidth = window.innerWidth - e.clientX;
        setTutorRailWidth(Math.min(Math.max(nextWidth, 340), Math.min(window.innerWidth * 0.58, 860)));
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const path = useMemo(() => {
    const p = paths.find(p => p.id === pathId);
    return p;
  }, [paths, pathId]);

  const phase = useMemo(() => {
    const ph = path?.phases.find(p => p.id === phaseId);
    return ph;
  }, [path, phaseId]);

  const module = useMemo(() => {
    const m = phase?.modules.find(m => m.id === moduleId);
    return m;
  }, [phase, moduleId]);

  const selectedSnippet = useMemo(() => normalizeSelectionText(selectedText).slice(0, 280), [selectedText]);
  const lessonTimeline = useMemo(
    () => videoTimeline.length > 0 ? videoTimeline : buildLessonTimelineFallback(generatedContent, module?.title),
    [videoTimeline, generatedContent, module?.title]
  );
  // isSmartboardAssistant: true when video is the primary focus mode
  const isSmartboardAssistant = focusMode === 'video';
  const activeTutorMoment = useMemo(
    () => lessonTimeline.find(segment => segment.id === activeSegmentId) || lessonTimeline[0],
    [lessonTimeline, activeSegmentId]
  );

  const selectionActions = useMemo(() => [
    {
      id: 'explain',
      label: 'Explain',
      hint: 'Clear confusion',
      icon: Sparkles,
      prompt: (text: string) => `Explain this selected passage like a patient tutor. Convert it into: 1) minimal anchor, 2) why it matters, 3) one example, 4) common confusion.\n\nSelected passage:\n"${text}"`,
    },
    {
      id: 'example',
      label: 'Example',
      hint: 'Make it concrete',
      icon: Zap,
      prompt: (text: string) => `Give a concrete real-world example for this selected passage, then show a Standard vs Pro interpretation.\n\nSelected passage:\n"${text}"`,
    },
    {
      id: 'quiz',
      label: 'Quiz Me',
      hint: 'Test recall',
      icon: HelpCircle,
      prompt: (text: string) => `Create 3 quick active-recall questions from this selected passage. Include answers after each question.\n\nSelected passage:\n"${text}"`,
    },
    {
      id: 'simplify',
      label: 'Simplify',
      hint: 'Remove fog',
      icon: BookOpen,
      prompt: (text: string) => `Simplify this selected passage into plain language without losing accuracy. Use short bullets and one analogy.\n\nSelected passage:\n"${text}"`,
    },
  ], []);

  const saraQuickStarts = useMemo(() => {
    const title = module?.title || 'this module';
    const concepts = module?.keyConcepts?.join(', ') || 'the core concepts';

    if (isSmartboardAssistant) {
      const moment = activeTutorMoment?.label || title;
      const time = activeTutorMoment ? formatSegmentTime(activeTutorMoment.timestamp) : 'current moment';
      return [
        {
          label: 'Explain Moment',
          icon: BrainCircuit,
          prompt: `Explain the Smartboard video moment "${moment}" at ${time}. Keep it short, direct, and tied to "${title}".`,
        },
        {
          label: 'Timestamp Notes',
          icon: PenLine,
          prompt: `Create clean notes for the Smartboard video moment "${moment}" at ${time}: key idea, why it matters, one example, and one warning.`,
        },
        {
          label: 'Quiz Clip',
          icon: HelpCircle,
          prompt: `Quiz me on the Smartboard video moment "${moment}" at ${time}. Ask 3 active-recall questions with concise answers.`,
        },
        {
          label: 'Rewatch Plan',
          icon: RefreshCcw,
          prompt: `Give me a 3-step rewatch plan for "${moment}" at ${time}: what to notice before, during, and after replaying it.`,
        },
      ];
    }

    return [
      {
        label: 'Module Map',
        icon: MapIcon,
        prompt: `Create a compact learning map for "${title}" using the key concepts: ${concepts}. Show hierarchy, dependencies, and the first thing I should understand.`,
      },
      {
        label: 'Teach Simply',
        icon: Sparkles,
        prompt: `Teach "${title}" like I am confused but motivated. Use short steps, one analogy, and a final 60-second review.`,
      },
      {
        label: 'Quiz Sprint',
        icon: HelpCircle,
        prompt: `Run a fast quiz sprint for "${title}". Ask 5 active-recall questions with answers and one trap misconception.`,
      },
      {
        label: 'Pro View',
        icon: GraduationCap,
        prompt: `Show the Standard vs Pro understanding of "${title}" using the concepts: ${concepts}. Keep it practical and exam-useful.`,
      },
    ];
  }, [activeTutorMoment?.label, activeTutorMoment?.timestamp, isSmartboardAssistant, module?.title, module?.keyConcepts]);

  const commitVideoTimeline = (timeline: any[] = []) => {
    setVideoTimeline(sanitizeTimeline(timeline));
  };

  // Fix: Only trigger on module ID change. Use a ref to prevent re-entrant loading.
  useEffect(() => {
    if (!module) return;
    setNotes(module.userNotes || '');
    if (module.generatedContent) {
      setGeneratedContent(module.generatedContent);
      loadAttemptRef.current = module.id;
    } else if (loadAttemptRef.current !== module.id) {
      loadAttemptRef.current = module.id;
      checkCloudCache();
    }

    const youtubeRes = module.resources.find(r => r.type === 'youtube' && r.videoId);
    if (youtubeRes && module.generatedContent) {
      if (youtubeRes.timeline && youtubeRes.timeline.length > 0) {
        console.log(`✅ Using pre-mapped timeline for ${youtubeRes.videoId}`);
        commitVideoTimeline(youtubeRes.timeline);
      } else {
        console.log(`📺 Mapping timeline dynamically for: ${youtubeRes.videoId}`);
        setIsMapping(true);
        const videoIds = module.resources.filter(r => r.type === 'youtube').map(r => r.videoId!);
        mapMasteryTimeline(module.generatedContent, videoIds)
          .then((timeline) => {
            console.log(`✅ Dynamic timeline generated with ${timeline.length} segments`);
            commitVideoTimeline(timeline);
          })
          .catch(err => console.error("Timeline Mapping Failed:", err))
          .finally(() => setIsMapping(false));
      }
    } else {
      if (!youtubeRes) console.warn('⚠️ No YouTube video found for timeline mapping');
      if (!module.generatedContent) console.warn('⚠️ No generated content available for timeline mapping');
    }
  }, [module?.id, module?.generatedContent, module?.resources]);

  const checkCloudCache = async () => {
    if (!module) return;
    try {
      const puter = (window as any).puter;
      if (puter) {
        const cached = await puter.kv.get(`content_${module.id}`);
        if (cached) {
          setGeneratedContent(cached);
          if (pathId && phaseId && moduleId) saveModuleContent(pathId, phaseId, moduleId, cached);
          return;
        }
      }
    } catch (e) {
      console.warn("Puter KV not available or failed:", e);
    }
    loadContent();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      const anchorNode = sel?.anchorNode;
      if (!sel || sel.isCollapsed || !anchorNode || !contentRef.current?.contains(anchorNode)) return;
      const text = sel.toString().trim();
      if (text.length < 3) return;
      const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      const x = rect ? Math.min(Math.max(rect.left + rect.width / 2, 180), window.innerWidth - 260) : window.innerWidth - 520;
      const y = rect ? Math.max(rect.top - 62, 96) : 180;
      
      if (text.length > 5) {
        setSelectedText(text);
        setSelectionCommand({ text, x, y });
      }
    };
    document.addEventListener('mouseup', handleSelectionChange);
    return () => { document.removeEventListener('mouseup', handleSelectionChange); };
  }, [saraOpen]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isTyping]);

  const loadContent = async () => {
    if (!module) return;
    setIsContentLoading(true);
    try {
      const { content, citations } = await generateModuleContent(module.title, module.keyConcepts, path?.goal || 'General Mastery');
      setGeneratedContent(content);
      if (pathId && phaseId && moduleId) {
        saveModuleContent(pathId, phaseId, moduleId, content);
        if (citations && citations.length > 0) {
          saveModuleCitations(pathId, phaseId, moduleId, citations);
        }
      }
      const puter = (window as any).puter;
      if (puter) await puter.kv.set(`content_${module.id}`, content);
    } finally { setIsContentLoading(false); }
  };

  const handleSendMessage = async (text?: string, displayText?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: displayText || msg, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const tutorContext = [
        `Module: ${module?.title}`,
        `Concepts: ${module?.keyConcepts.join(", ")}`,
        isSmartboardAssistant && activeTutorMoment
          ? `Mode: Smartboard video tutor. Current timestamp: ${formatSegmentTime(activeTutorMoment.timestamp)}. Current moment: ${activeTutorMoment.label}. Answer as if the student is watching this exact moment.`
          : '',
      ].filter(Boolean).join('. ');
      const response = await chatWithTutor(chatHistory, msg, tutorContext);
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
    } finally { setIsTyping(false); }
  };

  const handleSelectionAsk = (actionId: string) => {
    const action = selectionActions.find(item => item.id === actionId);
    const text = normalizeSelectionText(selectedText || selectionCommand?.text || '').slice(0, 1800);
    if (!action || !text.trim()) return;
    setSaraOpen(true);
    setActiveRightTab('chat');
    setSelectionCommand(null);
    window.getSelection()?.removeAllRanges();
    handleSendMessage(action.prompt(text), `${action.label} selection: "${selectionPreview(text)}"`);
  };

  const handleSelectionCopy = async () => {
    const text = normalizeSelectionText(selectedText || selectionCommand?.text || '');
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setSelectionCopied(true);
      window.setTimeout(() => setSelectionCopied(false), 1300);
    } catch (err) {
      console.warn('Clipboard unavailable, drafting selection inside SARA instead:', err);
      setInputMessage(`Explain this selected text:\n"${text.slice(0, 900)}"`);
      setSaraOpen(true);
      setActiveRightTab('chat');
      window.setTimeout(() => chatInputRef.current?.focus(), 80);
    }
  };

  const handleSelectionDraft = () => {
    const text = normalizeSelectionText(selectedText || selectionCommand?.text || '').slice(0, 900);
    if (!text) return;
    setInputMessage(`Explain this selected text:\n"${text}"`);
    setSaraOpen(true);
    setActiveRightTab('chat');
    setSelectionCommand(null);
    window.getSelection()?.removeAllRanges();
    window.setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  const handleSelectionNote = () => {
    const text = normalizeSelectionText(selectedText || selectionCommand?.text || '');
    if (!text.trim()) return;
    const safeText = escapeNoteHtml(text);
    const newNotes = notes
      ? `${notes}<p><strong>Captured Insight:</strong> ${safeText}</p>`
      : `<p><strong>Captured Insight:</strong> ${safeText}</p>`;
    setNotes(newNotes);
    if (pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, newNotes);
    setSaraOpen(true);
    setActiveRightTab('notes');
    setSelectionCommand(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleScoutResources = async () => {
    if (!module) return;
    setIsScouting(true);
    try {
      console.log('🔍 [SCOUT] Starting re-scout for module:', module.id);
      const results = await scoutResources(module.title);
      const youtubeResults = results.filter(r => r.type === 'youtube' && r.videoId);

      if (youtubeResults.length === 0) {
        setIsScouting(false);
        alert('⚠️ Could not find embeddable videos for this topic. The AI will try again with different search terms.');
        return;
      }

      const nonYoutubeResources = module.resources ? module.resources.filter(r => r.type !== 'youtube') : [];
      const newResources = [...nonYoutubeResources, ...results];

      // Step 5: Perform Timeline Mapping to link sections with timestamps
      let finalResources = newResources;
      if (youtubeResults.length > 0 && generatedContent) {
        console.log('🔗 [SCOUT] Mapping timeline for', youtubeResults.length, 'videos...');
        setIsMapping(true);
        try {
          const videoIds = youtubeResults.map(r => r.videoId!);
          const timeline = await mapMasteryTimeline(generatedContent, videoIds);
          
          if (timeline.length > 0) {
            finalResources = newResources.map(r => {
              if (r.type === 'youtube' && r.videoId === youtubeResults[0].videoId) {
                return { ...r, timeline };
              }
              return r;
            });
          }
        } finally {
          setIsMapping(false);
        }
      }

      if (pathId && phaseId && moduleId) {
        replaceModuleResources(pathId, phaseId, moduleId, finalResources);
      }

      // Find the timeline in the final resources and set it locally
      const youtubeRes = finalResources.find(r => r.type === 'youtube' && r.timeline);
      if (youtubeRes?.timeline) {
        commitVideoTimeline(youtubeRes.timeline);
      } else {
        commitVideoTimeline([]);
      }
      setActiveSegmentId(null);

      // Success feedback
      console.log('✅ [SCOUT] Complete! New videos:', youtubeResults.map(v => v.videoId).join(', '));
    } catch (err) {
      console.error('❌ [SCOUT] Failed:', err);
      alert('❌ Failed to scout videos. Check console for details.');
    } finally {
      setIsScouting(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!module) return;
    setQuizLoading(true);
    setQuizState('active');
    try {
      const questions = await generateQuizForModule(module.title, module.keyConcepts);
      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setQuizScore(0);
    } finally { setQuizLoading(false); }
  };

  const handleSynthesizeNotes = async () => {
    if (!module) return;
    setIsSynthesizingNotes(true);
    try {
      const response = await chatWithTutor([], "Summarize this module into concise, high-yield field notes using markdown.", `Module: ${module.title}. Concepts: ${module.keyConcepts.join(', ')}`);
      const newNotes = notes ? `${notes}\n\n---\n\n## AI Synthesis\n\n${response}` : `## AI Synthesis\n\n${response}`;
      setNotes(newNotes);
      if (pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, newNotes);
    } finally { setIsSynthesizingNotes(false); }
  };

  const focusTimelineTopic = (topicLabel: string) => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const normalizedTopic = normalize(topicLabel);
    const segment = lessonTimeline.find(s => normalize(s.label) === normalizedTopic)
      || lessonTimeline.find(s => {
        const normalizedLabel = normalize(s.label);
        return normalizedLabel.includes(normalizedTopic) || normalizedTopic.includes(normalizedLabel);
      });
    if (segment) setActiveSegmentId(segment.id);
  };

  if (!module) {
    if (isCloudSynced) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa] animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-900/5">
            <X size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Session Not Found</h2>
          <p className="text-slate-400 font-medium mb-8 max-w-xs text-center leading-relaxed">The learning module you're looking for doesn't exist or has been archived.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-[#000666] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-slate-100 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-orange-900/20 mx-auto">
              <School size={32} className="animate-pulse text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl vidhyalaya-brand-animation mb-3 tracking-tighter">Vidhyalaya</h2>
          <p className="text-slate-500 font-medium text-sm max-w-[240px] mx-auto leading-relaxed">Synthesizing your personalized learning journey...</p>
          
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#000666] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-[#000666] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-[#000666] rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  const allModules = path?.phases.flatMap((p, phaseIndex) => p.modules.map((m, moduleIndex) => ({
    ...m,
    phaseId: p.id,
    phaseTitle: p.title,
    phaseIndex,
    moduleIndex,
  }))) || [];
  const currentModuleIndex = Math.max(0, allModules.findIndex(m => m.id === module.id));
  const pathProgress = allModules.length > 0 ? Math.round(((currentModuleIndex + (module.isCompleted ? 1 : 0.35)) / allModules.length) * 100) : 0;
  const primaryVideo = module.resources.find(r => r.type === 'youtube' && r.videoId);
  const nextLearningModule = allModules[currentModuleIndex + 1];
  const isNextChapter = Boolean(nextLearningModule && nextLearningModule.phaseId !== phaseId);
  const continuePathLabel = nextLearningModule ? (isNextChapter ? 'Next Chapter' : 'Next Lesson') : 'Path Complete';
  const continuePathTitle = nextLearningModule?.title || 'Review the full learning path';
  const continuePathMeta = nextLearningModule
    ? `Chapter ${nextLearningModule.phaseIndex + 1} · Lesson ${nextLearningModule.moduleIndex + 1}`
    : `${pathProgress}% mastery index`;
  const handleContinuePath = () => {
    if (nextLearningModule && pathId) {
      navigate(`/study/${pathId}/${nextLearningModule.phaseId}/${nextLearningModule.id}`);
      return;
    }
    if (pathId) navigate(`/path/${pathId}`);
  };
  const activeBoardMode = focusMode === 'content' ? 'whiteboard' : focusMode === 'video' ? 'smartboard' : 'dual';
  const boardModes = [
    {
      id: 'whiteboard' as const,
      label: 'Whiteboard',
      caption: 'Learning Panel',
      detail: 'Read, blueprint, notes, and neural map',
      icon: BookOpen,
    },
    {
      id: 'smartboard' as const,
      label: 'Smartboard',
      caption: 'Cinematic Media',
      detail: 'Full video focus with mastery log dock',
      icon: Headphones,
    },
    {
      id: 'dual' as const,
      label: 'Dual Board',
      caption: 'Study Studio',
      detail: 'Whiteboard and smartboard side by side',
      icon: LayoutDashboard,
    },
  ];
  const activeBoard = boardModes.find(mode => mode.id === activeBoardMode) || boardModes[0];
  const clearBoardMenuCloseTimer = () => {
    if (boardMenuCloseTimerRef.current) {
      window.clearTimeout(boardMenuCloseTimerRef.current);
      boardMenuCloseTimerRef.current = null;
    }
  };
  const closeBoardMenu = () => {
    clearBoardMenuCloseTimer();
    setBoardMenuOpen(false);
    setBoardMenuOwner(null);
  };

  const openBoardMenu = (owner: string) => {
    clearBoardMenuCloseTimer();
    closeMainMenu();
    setBoardMenuOwner(owner);
    setBoardMenuOpen(open => !(open && boardMenuOwner === owner));
  };

  const handleBoardModeSelect = (mode: typeof boardModes[number]['id']) => {
    closeBoardMenu();
    if (mode === 'whiteboard') {
      setLeftPanelMode('content');
      setBoardFocusMode('content');
      return;
    }
    if (mode === 'smartboard') {
      setBoardFocusMode('video');
      return;
    }
    setLeftPanelMode('content');
    setBoardFocusMode('split');
  };
  const sessionModes = [
    { id: 'read' as const, label: 'Read', caption: 'Start here', icon: BookOpen },
    { id: 'watch' as const, label: 'Watch', caption: primaryVideo ? 'Video lesson' : 'Find video', icon: Headphones },
    { id: 'map' as const, label: 'Map', caption: 'See structure', icon: MapIcon },
    { id: 'practice' as const, label: 'Practice', caption: 'Check mastery', icon: GraduationCap },
  ];
  // Which session view is active based on focusMode + leftPanelMode
  const derivedSessionView = focusMode === 'video' ? 'watch' : leftPanelMode === 'visualizer' ? 'map' : 'read';
  const showWhiteboardTutorRail = focusMode === 'content' && !isCompactViewport;
  const beginTutorRailResize = () => {
    isTutorRailResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const mainNavItems = [
    { icon: MonitorPlay, label: 'ClassRoom', to: '/' },
    { icon: GraduationCap, label: 'Courses', to: '/courses' },
    { icon: Library, label: 'Library', to: '/library' },
    { icon: CalendarDays, label: 'Schedule', to: '/schedule' },
    { icon: FileCheck, label: 'Exam Mode', to: '/exam' },
    { icon: SettingsIcon, label: 'Settings', to: '/settings' },
  ];

  const closeMainMenu = () => {
    setMainMenuOpen(false);
    setMainMenuOwner(null);
  };

  const openMainMenu = (owner: string) => {
    clearBoardMenuCloseTimer();
    closeBoardMenu();
    setMainMenuOwner(owner);
    setMainMenuOpen(open => !(open && mainMenuOwner === owner));
  };

  const renderBoardSwitcher = (align: 'left' | 'right' = 'left', owner = 'default', labelOverride?: string) => {
    const boardLabel = labelOverride || activeBoard.label;
    const isMainMenuActive = mainMenuOpen && mainMenuOwner === owner;
    const isBoardMenuActive = boardMenuOpen && boardMenuOwner === owner;

    return (
    <div className={`relative flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`} data-board-menu-owner={owner}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openMainMenu(owner);
        }}
        aria-label={`Open app menu from ${boardLabel}`}
        aria-expanded={isMainMenuActive}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#000666] shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50"
      >
        <Menu size={16} strokeWidth={2.6} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openBoardMenu(owner);
        }}
        aria-label={`Switch board mode from ${boardLabel}`}
        aria-expanded={isBoardMenuActive}
        className={`board-brand-trigger group relative flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 text-left ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        <span className="block max-w-[150px] truncate text-xs font-black uppercase leading-none">
          <span className="block truncate tracking-[0.18em] text-[#000666]">
            {boardLabel}
          </span>
        </span>
        <ChevronDown
          size={13}
          strokeWidth={3}
          className={`board-mode-arrow shrink-0 text-[#000666] transition-transform duration-150 ${isBoardMenuActive ? 'rotate-180' : ''}`}
        />
      </button>
      {isMainMenuActive && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[980] cursor-default bg-slate-950/10 backdrop-blur-[1px]"
            onClick={closeMainMenu}
            aria-label="Close main menu overlay"
          />
          <div className="fixed bottom-4 left-4 top-4 z-[990] flex w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_110px_-52px_rgba(0,6,102,0.65)]">
            <div className="border-b border-slate-100 px-7 pb-6 pt-7">
              <div className="flex items-start justify-between gap-5">
                <button
                  type="button"
                  onClick={() => {
                    closeMainMenu();
                    navigate('/');
                  }}
                  className="min-w-0 text-left"
                >
                  <span className="block text-[19px] font-black uppercase leading-none tracking-[0.32em] text-[#000666]">
                    Vidhyalaya
                  </span>
                  <span className="mt-3 flex items-center gap-3 text-[9px] font-black uppercase leading-none tracking-[0.22em] text-indigo-300">
                    <span className="h-px w-8 bg-indigo-200" />
                    Learning Platform
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeMainMenu}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-[#000666]"
                  aria-label="Close main menu"
                >
                  <X size={17} strokeWidth={2.6} />
                </button>
              </div>
              <div className="mt-6">
                <p className="text-[15px] font-black uppercase tracking-[0.22em] text-[#000666]">Main Menu</p>
                <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-400">
                  Move between class, courses, library, schedule, and settings without losing your board context.
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 px-4 py-5">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to
                  || (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/create'));

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      closeMainMenu();
                      navigate(item.to);
                    }}
                    className={`flex w-full items-center gap-5 rounded-2xl px-6 py-5 text-left transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={22} strokeWidth={2.25} />
                    <span className="text-[18px] font-black">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {isBoardMenuActive && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[980] cursor-default bg-transparent"
            onClick={closeBoardMenu}
            aria-label="Close board menu overlay"
          />
          <div className={`absolute top-[calc(100%+10px)] z-[990] w-[266px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_26px_70px_-36px_rgba(0,6,102,0.55)] ${
            align === 'right' ? 'right-0' : 'left-10'
          }`}>
            <div className="px-3 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.28em] text-sky-500">Board View</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#000666]">Switch Workspace</p>
            </div>
            <div className="space-y-1">
              {boardModes.map(mode => {
                const isActive = activeBoardMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleBoardModeSelect(mode.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-sky-100 bg-sky-50/70 text-[#000666]'
                        : 'border-transparent text-slate-500 hover:border-sky-100 hover:bg-sky-50/50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <mode.icon size={17} className={isActive ? 'text-[#000666]' : 'text-slate-400'} />
                      <span className="min-w-0">
                        <span className={`block text-[10px] font-black uppercase tracking-[0.18em] ${isActive ? 'text-[#000666]' : 'text-slate-600'}`}>
                          {mode.label}
                        </span>
                        <span className="mt-1 block text-[9px] font-semibold leading-snug text-slate-400">
                          {mode.caption}
                        </span>
                      </span>
                    </span>
                    {isActive && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white text-[#000666] shadow-[0_8px_20px_-14px_rgba(0,6,102,0.9)]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
    );
  };

  const renderSaraTutorRail = () => {
    const assistantTabs = [
      { id: 'chat', label: 'Ask', icon: BrainCircuit },
      { id: 'notes', label: 'Notes', icon: PenLine },
      { id: 'resources', label: isSmartboardAssistant ? 'Moments' : 'Vault', icon: isSmartboardAssistant ? Headphones : BookOpen },
      { id: 'quiz', label: 'Quiz', icon: HelpCircle },
      ...(module.citations && module.citations.length > 0 ? [{ id: 'sources', label: 'Sources', icon: Globe }] : []),
    ];
    const assistantEyebrow = isSmartboardAssistant ? 'Smartboard Tutor' : 'Study Sidecar';
    const assistantSubtitle = isSmartboardAssistant
      ? 'Ask the video. Save moments. Rewatch smarter.'
      : 'Ask clearly. Save notes. Check recall.';
    const emptyTitle = isSmartboardAssistant ? 'Ask the current video moment.' : 'Ask one focused thing.';
    const emptyCopy = isSmartboardAssistant
      ? 'I’ll answer short, timestamp-aware, and tied to what is on screen right now.'
      : 'Highlight text or type a question. I’ll answer short, direct, and tied to this lesson.';

    return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-[#fbfcff] px-4 py-4">
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-500">{assistantEyebrow}</p>
            <h3 className="mt-1 truncate text-[15px] font-black uppercase tracking-[0.14em] text-[#000666]">Study Copilot</h3>
            <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{assistantSubtitle}</p>
          </div>
          <div className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]" />
        </div>
      </div>

      <div className="shrink-0 py-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {assistantTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveRightTab(tab.id as any)}
              className={`rounded-lg px-1.5 py-2 text-[7px] font-black uppercase tracking-widest transition-all ${
                activeRightTab === tab.id
                  ? 'bg-white text-[#000666] shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} className="mx-auto mb-0.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {activeRightTab === 'chat' && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 custom-scrollbar">
              {selectedSnippet && (
                <div className="mb-3 rounded-[24px] border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.28em] text-indigo-400">Captured Selection</p>
                    <button onClick={() => setSelectedText('')} className="text-slate-300 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  </div>
                  <p className="line-clamp-4 text-[12px] font-medium leading-relaxed text-slate-600">{selectedSnippet}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectionActions.slice(0, 4).map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleSelectionAsk(action.id)}
                        className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-left transition-all hover:border-indigo-100 hover:bg-white hover:shadow-sm"
                      >
                        <span className="block text-[9px] font-black uppercase tracking-wider text-[#000666]">{action.label}</span>
                        <span className="mt-0.5 block text-[8px] font-bold text-slate-400">{action.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.length === 0 ? (
                <div className="py-1">
                  <Sparkles size={18} className="mb-3 text-[#000666]" />
                  <h4 className="text-[15px] font-black leading-tight text-[#000666]">{emptyTitle}</h4>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">
                    {emptyCopy}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {saraQuickStarts.map(item => (
                      <button
                        key={item.label}
                        onClick={() => handleSendMessage(item.prompt, item.label)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-[#000666] transition-all hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <item.icon size={13} />
                          {item.label}
                        </span>
                        <ChevronRight size={12} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-full flex-col justify-end space-y-3">
                  {chatHistory.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-3.5 py-3 text-[12px] leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-br-md bg-[#000666] text-white'
                          : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                      }`}>
                        {m.role === 'model' ? (
                          <div className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_strong]:text-slate-900">
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>
                        ) : m.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-[11px] font-bold text-indigo-500">
                      <Loader size={12} className="animate-spin" />
                      Thinking...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              <div className="relative">
                <input
                  ref={chatInputRef}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50/60"
                  placeholder={isSmartboardAssistant ? 'Ask about this video moment...' : 'Ask a focused question...'}
                />
              </div>
            </div>
          </div>
        )}

        {activeRightTab === 'notes' && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-500">Notes</p>
                <p className="mt-0.5 text-[12px] font-black uppercase tracking-[0.14em] text-[#000666]">
                  {isSmartboardAssistant ? 'Smart Notes' : 'Field Notes'}
                </p>
              </div>
              <button
                onClick={handleSynthesizeNotes}
                disabled={isSynthesizingNotes}
                className="shrink-0 rounded-xl bg-[#000666] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white shadow-sm disabled:opacity-50"
              >
                {isSynthesizingNotes ? 'Writing...' : 'Synthesize'}
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <RichNotesEditor content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />
            </div>
          </div>
        )}

        {activeRightTab === 'resources' && (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#000666]">
                {isSmartboardAssistant ? 'Video Moments' : 'Knowledge Vault'}
              </p>
              {!isSmartboardAssistant && (
                <button onClick={handleScoutResources} disabled={isScouting} className="rounded-full bg-[#000666] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                  {isScouting ? 'Finding...' : 'Scout'}
                </button>
              )}
            </div>
            {isSmartboardAssistant ? (
              <div className="space-y-2">
                {lessonTimeline.slice(0, 10).map((segment, index) => {
                  const isActive = segment.id === activeSegmentId;
                  return (
                    <button
                      key={segment.id}
                      onClick={() => handleSendMessage(
                        `Explain the Smartboard checkpoint "${segment.label}" at ${formatSegmentTime(segment.timestamp)} in 120 words. Give one thing to watch for in the video.`,
                        `Explain ${segment.label}`
                      )}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? 'border-[#000666]/20 bg-indigo-50 text-[#000666]'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-black text-orange-600 shadow-sm">
                        {formatSegmentTime(segment.timestamp)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-black">{segment.label}</span>
                        <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          Moment {String(index + 1).padStart(2, '0')}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {lessonTimeline.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-[11px] font-bold text-slate-400">
                    No video moments mapped yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {module.resources.map(res => (
                  <a key={res.id} href={res.content} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-indigo-100 hover:text-[#000666]">
                    <File size={15} className="shrink-0 text-indigo-300" />
                    <span className="truncate">{res.title || 'Resource'}</span>
                  </a>
                ))}
                {module.resources.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-[11px] font-bold text-slate-400">
                    No saved resources yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeRightTab === 'quiz' && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-500">Quiz</p>
              <p className="mt-0.5 text-[12px] font-black uppercase tracking-[0.14em] text-[#000666]">
                {isSmartboardAssistant ? 'Clip Check' : 'Knowledge Check'}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="border-l-2 border-[#000666]/20 py-1 pl-4">
                <GraduationCap size={24} className="mb-4 text-[#000666]" />
                <h3 className="text-[15px] font-black text-[#000666]">{isSmartboardAssistant ? 'Test this clip.' : 'Check your recall.'}</h3>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">
                {isSmartboardAssistant ? 'Test the exact video moment before you move ahead.' : 'Start a focused quiz without leaving the lesson.'}
                </p>
                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <span>Mode</span>
                    <span>{quizQuestions.length ? `${quizQuestions.length} Questions` : 'Adaptive'}</span>
                  </div>
                  <button
                    onClick={handleStartQuiz}
                    disabled={quizLoading}
                    className="mt-3 w-full rounded-xl bg-[#000666] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {quizLoading ? 'Building...' : quizQuestions.length ? 'Restart Quiz' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeRightTab === 'sources' && (
          <div className="h-full overflow-hidden">
            <SourcesPanel citations={module.citations || []} />
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderPracticeView = () => (
    <div className="h-full overflow-y-auto bg-[#f8f9fa] p-4 md:p-8 custom-scrollbar">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col">
        <div className="mb-5 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400">Practice</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#000666]">Quick Checkpoint</h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">Use this when you feel you understood the lesson. The goal is not marks; it is finding the exact weak spot before it becomes confusion.</p>
            </div>
            <button
              onClick={handleStartQuiz}
              disabled={quizLoading}
              className="rounded-2xl bg-[#000666] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-900/15 transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {quizLoading ? 'Building...' : quizQuestions.length ? 'Restart Check' : 'Start Check'}
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.75)]">
          {quizLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Loader size={42} className="mb-4 animate-spin text-[#000666]" />
              <h3 className="text-lg font-black text-[#000666]">Preparing your checkpoint</h3>
              <p className="mt-2 text-sm font-medium text-slate-400">SARA is choosing questions from this module.</p>
            </div>
          ) : quizState === 'complete' ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[32px] bg-emerald-50 text-emerald-600 shadow-inner">
                <CheckCircle2 size={38} />
              </div>
              <h3 className="text-2xl font-black text-[#000666]">{Math.round((quizScore / (quizQuestions.length * 10 || 1)) * 100)}% checkpoint score</h3>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">Good. Now return to Read mode and fix anything that felt shaky.</p>
              <button onClick={() => { setLeftPanelMode('content'); setBoardFocusMode('content'); }} className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#000666] shadow-sm transition-all hover:bg-slate-50">
                Back to Read
              </button>
            </div>
          ) : quizQuestions.length > 0 ? (
            <div className="mx-auto max-w-2xl py-4">
              <div className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000666]">{quizScore} pts</span>
              </div>
              <h3 className="mb-6 text-xl font-black leading-tight text-slate-800">{quizQuestions[currentQuizIndex].question}</h3>
              <div className="grid gap-3">
                {quizQuestions[currentQuizIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const isCorrect = i === quizQuestions[currentQuizIndex].correctAnswerIndex;
                      if (isCorrect) setQuizScore(s => s + 10);
                      if (currentQuizIndex < quizQuestions.length - 1) setCurrentQuizIndex(c => c + 1);
                      else setQuizState('complete');
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-[#000666]/30 hover:bg-indigo-50/40"
                  >
                    <span>{opt}</span>
                    <ChevronRight size={16} className="text-slate-300 transition-colors group-hover:text-[#000666]" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-center">
              <div>
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-[#000666]">
                  <GraduationCap size={34} />
                </div>
                <h3 className="text-xl font-black text-[#000666]">No checkpoint started yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">Read first, then start a checkpoint when you are ready to test yourself.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // renderSessionView is kept for standalone tab rendering (Practice tab in left panel).
  // The primary rendering is done directly in the board layout sections below.
  const renderSessionView = () => {
    if (derivedSessionView === 'map') {
      return (
        <div className="h-full bg-white">
          <NeuralSynthesizer
            moduleTitle={module?.title || ''}
            moduleContent={generatedContent}
            keyConcepts={module?.keyConcepts || []}
            generatedContent={generatedContent}
          />
        </div>
      );
    }

    if (derivedSessionView === 'watch' || focusMode === 'video') {
      return null; // Handled by the SmartBoard section directly
    }

    return (
      <div className="h-full overflow-hidden bg-[#fbfcff]">
        <ContentRenderer
          content={generatedContent}
          isLoading={isContentLoading}
          moduleTitle={module?.title}
          phaseName={phase?.title}
          scrollRef={contentRef}
          onRetry={loadContent}
          videoTimeline={lessonTimeline}
          activeSegmentId={activeSegmentId}
          focusMode="content"
          onTopicClick={focusTimelineTopic}
          onToggleNeuralMap={() => setLeftPanelMode('visualizer')}
          nextActionLabel={continuePathLabel}
          nextActionTitle={continuePathTitle}
          nextActionMeta={continuePathMeta}
          onNextAction={handleContinuePath}
        />
      </div>
    );
  };



  // ── All rendering is handled by the live dual-board layout below. ──
  // focusMode + leftPanelMode are the single source of truth for the UI.


  return (
    <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col overflow-hidden selection:bg-indigo-100 relative animate-in fade-in duration-700">
      {/* ── BACKGROUND ACCENTS ── */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-slate-100 rounded-full blur-[100px] pointer-events-none" />

      {/* ── DRAG OVERLAY (Prevents iframes from stealing mouse events during resize) ── */}
      {isResizing && (
        <div 
          className="fixed inset-0 z-[9999]"
          style={{ cursor: 'col-resize' }}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* ═══ DUAL BOARD LAYOUT WITH RESIZER ═══ */}
        <main ref={containerRef} className={`flex-1 flex min-w-0 overflow-hidden relative ${isFocusTransitioning ? 'board-focus-breathing' : ''}`}>
          {isFocusTransitioning && (
            <div className="pointer-events-none absolute inset-0 z-[46] board-focus-veil" />
          )}

          <section 
            style={{ 
              width: `${effectiveSplit}%`, 
              opacity: effectiveSplit === 0 ? 0 : 1,
              pointerEvents: effectiveSplit === 0 ? 'none' : 'auto',
              transition: boardTransition,
              transform: focusMode === 'video' ? 'scale(0.985)' : 'scale(1)',
              transformOrigin: 'left center',
              filter: focusMode === 'video' ? 'saturate(0.92) brightness(0.98)' : 'saturate(1) brightness(1)',
            }}
            className={`h-full overflow-hidden min-w-0 flex flex-col bg-[#fcfcfd] border-r border-slate-200/50 shadow-sm relative z-0 will-change-[width,opacity,transform,filter] ${focusMode === 'content' ? 'shadow-[0_30px_90px_-60px_rgba(0,6,102,0.35)]' : ''}`}
          >
            {/* WHITEBOARD HEADER */}
            <div className="relative z-[220] flex min-h-[64px] shrink-0 items-center justify-between overflow-visible border-b border-slate-200/40 bg-white px-6 py-2">
              <div className="flex items-center gap-3">
                {renderBoardSwitcher('left', 'whiteboard', 'Whiteboard')}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pathId && phaseId && moduleId && updateModuleStatus(pathId, phaseId, moduleId, !module.isCompleted)}
                  className={`flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[9px] font-black uppercase tracking-wider transition-all ${
                    module.isCompleted
                      ? 'bg-emerald-400 text-black border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                  {module.isCompleted ? 'Mastered' : 'Complete'}
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsTutorRailCollapsed(value => !value)}
                  className={`flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[9px] font-black uppercase tracking-wider transition-all ${
                    isTutorRailCollapsed
                      ? 'border-[#000666] bg-[#000666] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-[#000666] hover:border-[#000666]/20 hover:bg-slate-50'
                  }`}
                  aria-label={isTutorRailCollapsed ? 'Open Study Copilot' : 'Collapse Study Copilot'}
                  title={isTutorRailCollapsed ? 'Open Study Copilot' : 'Collapse Study Copilot'}
                >
                  <BrainCircuit size={12} />
                  SARA
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <button
                  onClick={() => setLeftPanelMode(leftPanelMode === 'content' ? 'visualizer' : 'content')}
                  className={`flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[9px] font-black uppercase tracking-wider transition-all relative overflow-hidden ${
                    leftPanelMode === 'visualizer'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'neural-map-attention bg-white text-[#000666] border-[#000666]/10 hover:bg-slate-50 hover:shadow-md'
                  }`}
                >
                  {leftPanelMode === 'content' ? <MapIcon size={12} className="neural-map-icon-animation" /> : <BookOpen size={12} />}
                  <span className={leftPanelMode === 'content' ? 'neural-map-brand-animation' : undefined}>
                    {leftPanelMode === 'content' ? 'Neural Map' : 'Read Content'}
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable content or Visualizer */}
            <div className={`flex-1 overflow-hidden relative ${showWhiteboardTutorRail ? 'flex bg-[#fbfcff]' : ''}`}>
              <div className={showWhiteboardTutorRail ? 'min-w-0 flex-1 overflow-hidden relative' : 'absolute inset-0'}>
                {leftPanelMode === 'content' ? (
                  <ContentRenderer
                    content={generatedContent}
                    isLoading={isContentLoading}
                    moduleTitle={module?.title}
                    phaseName={phase?.title}
                    scrollRef={contentRef}
                    onRetry={loadContent}
                    videoTimeline={lessonTimeline}
                    activeSegmentId={activeSegmentId}
                    focusMode={focusMode}
                    onTopicClick={focusTimelineTopic}
                    onToggleNeuralMap={() => setLeftPanelMode('visualizer')}
                    nextActionLabel={continuePathLabel}
                    nextActionTitle={continuePathTitle}
                    nextActionMeta={continuePathMeta}
                    onNextAction={handleContinuePath}
                    citations={module?.citations}
                    onCitationClick={(idx) => {
                      setActiveTab('sources');
                      setIsTutorRailCollapsed(false);
                    }}
                  />
                ) : (
                  <div className="absolute inset-0">
                    <NeuralSynthesizer
                      moduleTitle={module?.title || ''}
                      moduleContent={generatedContent}
                      keyConcepts={module?.keyConcepts || []}
                      generatedContent={generatedContent}
                    />
                  </div>
                )}
              </div>
              {showWhiteboardTutorRail && !isTutorRailCollapsed && (
                <>
                  <div
                    onMouseDown={beginTutorRailResize}
                    className="hidden w-2 shrink-0 cursor-col-resize border-l border-slate-100 bg-slate-50/80 transition-colors hover:bg-cyan-100 md:block"
                    title="Resize Study Copilot"
                  />
                  <aside
                    className="flex shrink-0"
                    style={{ width: tutorRailWidth, minWidth: 340, maxWidth: Math.min(window.innerWidth * 0.58, 860) }}
                  >
                    {renderSaraTutorRail()}
                  </aside>
                </>
              )}
            </div>
          </section>

          {/* ── RESIZER HANDLE ── */}
          {focusMode === 'split' && !isCompactViewport && (
            <div 
              onMouseDown={() => { 
                isResizingRef.current = true; 
                setIsResizing(true);
                document.body.style.cursor = 'col-resize'; 
                document.body.style.userSelect = 'none';
              }}
              className="w-1.5 hover:w-2 bg-slate-50/50 hover:bg-indigo-50 cursor-col-resize flex-none transition-all duration-800 ease-[cubic-bezier(0.23,1,0.32,1)] relative z-10 group border-l border-r border-slate-200/30"
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-transparent via-indigo-400/40 to-transparent group-hover:via-indigo-500 group-hover:w-[2px] transition-all" />
            </div>
          )}

          {/* ── RIGHT: FULL CINEMA STUDIO ── */}
          <section 
            style={{ 
              width: `${100 - effectiveSplit}%`, 
              opacity: effectiveSplit === 100 ? 0 : 1,
              pointerEvents: effectiveSplit === 100 ? 'none' : 'auto',
              transition: boardTransition,
              transform: focusMode === 'content' ? 'scale(0.985)' : 'scale(1)',
              transformOrigin: 'right center',
              filter: focusMode === 'content' ? 'saturate(0.92) brightness(0.98)' : 'saturate(1) brightness(1)',
            }}
            className={`h-full overflow-hidden min-w-0 flex flex-col bg-white border-l border-slate-200 shadow-2xl relative z-0 will-change-[width,opacity,transform,filter] ${focusMode === 'video' ? 'bg-white shadow-[0_35px_120px_-70px_rgba(0,6,102,0.45)]' : ''}`}
          >
            {focusMode !== 'video' && (
              <div
                className="relative z-[220] flex min-h-[64px] shrink-0 items-center justify-between overflow-visible border-b border-slate-200/40 bg-white px-6 py-2"
                style={{
                  transition: boardTransition,
                }}
              >
                {renderBoardSwitcher('left', 'smartboard-panel', 'Smartboard')}
              </div>
            )}

            <div
              className={`flex-1 w-full flex flex-col ${focusMode === 'video' ? 'h-full overflow-hidden' : ''}`}
              style={{
                transition: boardTransition,
                transform: focusMode === 'video' ? 'scale(1)' : 'scale(1)',
              }}
            >
              <div className="min-h-0 flex-1">
                {module.resources.find(r => r.type === 'youtube' && r.videoId) ? (
                  <CinemaStudio
                    key={module.resources.find(r => r.type === 'youtube' && r.videoId)!.videoId}
                    videoId={module.resources.find(r => r.type === 'youtube' && r.videoId)!.videoId!}
                    allVideoIds={module.resources.filter(r => r.type === 'youtube' && r.videoId).map(r => ({ id: r.videoId!, title: r.title }))}
                    moduleTitle={module.title}
                    moduleContent={generatedContent}
                    timeline={lessonTimeline}
                    activeSegmentId={activeSegmentId || ''}
                    isMapping={isMapping}
                    isTheaterMode={focusMode === 'video'}
                    boardControl={renderBoardSwitcher('left', 'smartboard-dual', 'Smartboard')}
                    onOpenContents={() => setNavbarOpen(true)}
                    onTimestampReached={(seg) => setActiveSegmentId(seg.id)}
                    onReSync={async () => {
                      await handleScoutResources();
                    }}
                  />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center bg-white relative overflow-hidden group">
                      {/* Decorative Background Elements */}
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
                      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
                      
                      <div className="relative z-10 animate-in fade-in zoom-in-95 duration-700">
                        <div className="w-20 h-20 rounded-[32px] bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 shadow-xl shadow-indigo-900/5 group-hover:scale-110 transition-transform duration-500 group-hover:border-indigo-200">
                          <Zap size={32} className="text-indigo-400 animate-pulse" />
                        </div>
                        <h3 className="text-slate-900 text-sm font-black uppercase tracking-[0.4em] mb-3">Smartboard Offline</h3>
                        <p className="text-slate-400 text-[10px] mb-8 max-w-[240px] mx-auto font-medium leading-relaxed">SARA is ready to scout the web for high-fidelity video content synchronized to this module.</p>
                        
                        <button 
                          onClick={handleScoutResources}
                          disabled={isScouting}
                          className="group/btn relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            {isScouting ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <Sparkles size={14} className="text-indigo-200" />
                            )}
                            <span>{isScouting ? 'Scouting Web...' : 'Activate Live Sync'}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* CONTEXTUAL SELECTION COMMAND BAR */}
        {selectionCommand && (
          <div
            className="fixed z-[140] -translate-x-1/2 rounded-2xl border border-slate-200/70 bg-white/95 p-2 shadow-[0_24px_70px_-30px_rgba(0,6,102,0.45)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ left: selectionCommand.x, top: selectionCommand.y }}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSelectionAsk('explain')}
                className="flex items-center gap-2 rounded-xl bg-[#000666] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-900/20 hover:-translate-y-0.5 transition-all"
              >
                <BrainCircuit size={13} />
                Ask SARA
              </button>
              <button
                onClick={handleSelectionDraft}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-[#000666] transition-all"
              >
                <Quote size={12} />
                Draft
              </button>
              <button
                onClick={() => handleSelectionAsk('simplify')}
                className="rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-[#000666] transition-all"
              >
                Simplify
              </button>
              <button
                onClick={handleSelectionNote}
                className="rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-[#000666] transition-all"
              >
                Note
              </button>
              <button
                onClick={handleSelectionCopy}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-[#000666] transition-all"
              >
                <Copy size={12} />
                {selectionCopied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setSelectionCommand(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-all"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* SARA ASSISTANT OVERLAY PANEL */}
        {saraOpen && !showWhiteboardTutorRail && (
          <aside
            className="fixed right-3 top-[136px] bottom-0 z-[90] flex w-[calc(100vw-24px)] max-w-[448px] min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/80 bg-white/94 p-2.5 shadow-[0_42px_120px_-44px_rgba(0,6,102,0.52)] backdrop-blur-2xl animate-in slide-in-from-right zoom-in-95 duration-500 origin-right md:right-5 md:top-[140px] md:bottom-1"
          >
            <div className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full bg-indigo-100/70 blur-[70px]" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-100/60 blur-[80px]" />
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {/* Command Header */}
              <div className="relative mb-2.5 rounded-[26px] border border-slate-200/70 bg-white/88 px-4 py-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#000666] to-indigo-600 text-white shadow-xl shadow-indigo-900/25">
                      <BrainCircuit size={22} />
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#000666]">Study Copilot</h3>
                      </div>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.32em] text-indigo-400">
                        {isSmartboardAssistant ? 'Smartboard timestamp tutor' : 'Selection-aware tutor'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSaraOpen(false);
                      setSelectionCommand(null);
                      setSelectedText('');
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all"
                    title="Close SARA"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="relative flex shrink-0 gap-1.5 rounded-2xl border border-slate-200/60 bg-slate-100/60 p-1.5 shadow-sm">
                {[
                  { id: 'chat', label: 'Ask', icon: BrainCircuit },
                  { id: 'notes', label: 'Notes', icon: PenLine },
                  { id: 'resources', label: isSmartboardAssistant ? 'Moments' : 'Vault', icon: isSmartboardAssistant ? Headphones : BookOpen },
                  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
                  ...(module.citations && module.citations.length > 0 ? [{ id: 'sources', label: 'Sources', icon: Globe }] : [])
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRightTab(tab.id as any)}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                      activeRightTab === tab.id
                        ? 'bg-white text-[#000666] font-bold shadow-[0_10px_24px_-16px_rgba(0,6,102,0.45)] border border-indigo-100'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                    }`}
                  >
                    <tab.icon size={17} className="mb-0.5" />
                    <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/60 bg-white/92 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.75)]">

                {/* CHAT TAB */}
                {activeRightTab === 'chat' && (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-white">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a237e] to-indigo-600 flex items-center justify-center shadow-md">
                            <BrainCircuit size={19} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-[#000666] leading-none uppercase tracking-wide">
                              {isSmartboardAssistant ? 'Smartboard Tutor' : 'Learning Copilot'}
                            </h3>
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.25em] mt-1.5">
                              {selectedText ? 'Selection captured' : isSmartboardAssistant ? 'Current timestamp ready' : 'Ready for precision tutoring'}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                          Live
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gradient-to-b from-white to-slate-50/30">
                      {selectedSnippet && (
                        <div className="rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#000666] shadow-sm">
                                <Quote size={15} />
                              </div>
                              <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-indigo-400">Captured Selection</div>
                                <div className="text-[10px] font-bold text-slate-400">{selectedText.length} characters</div>
                              </div>
                            </div>
                            <button
                              onClick={() => { setSelectedText(''); setSelectionCommand(null); }}
                              className="text-slate-300 hover:text-slate-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="rounded-2xl border border-white/80 bg-white/80 p-3 text-[12px] font-medium leading-relaxed text-slate-600 shadow-sm">
                            {selectedSnippet}{selectedText.length > selectedSnippet.length ? '...' : ''}
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {selectionActions.map(action => (
                              <button
                                key={action.id}
                                onClick={() => handleSelectionAsk(action.id)}
                                className="group flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2.5 text-left shadow-sm hover:border-[#000666]/15 hover:shadow-md transition-all"
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#000666] group-hover:bg-[#000666] group-hover:text-white transition-all">
                                  <action.icon size={14} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[10px] font-black uppercase tracking-wider text-[#000666]">{action.label}</span>
                                  <span className="block truncate text-[9px] font-bold text-slate-400">{action.hint}</span>
                                </span>
                              </button>
                            ))}
                            <button
                              onClick={handleSelectionNote}
                              className="group col-span-1 flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2.5 text-left shadow-sm hover:border-[#000666]/15 hover:shadow-md transition-all"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#000666] group-hover:bg-[#000666] group-hover:text-white transition-all">
                                <PenLine size={14} />
                              </span>
                              <span>
                                <span className="block text-[10px] font-black uppercase tracking-wider text-[#000666]">Save Note</span>
                                <span className="block text-[9px] font-bold text-slate-400">Capture insight</span>
                              </span>
                            </button>
                            <button
                              onClick={handleSelectionCopy}
                              className="group col-span-1 flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2.5 text-left shadow-sm hover:border-[#000666]/15 hover:shadow-md transition-all"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#000666] group-hover:bg-[#000666] group-hover:text-white transition-all">
                                <Copy size={14} />
                              </span>
                              <span>
                                <span className="block text-[10px] font-black uppercase tracking-wider text-[#000666]">{selectionCopied ? 'Copied' : 'Copy Text'}</span>
                                <span className="block text-[9px] font-bold text-slate-400">Clipboard ready</span>
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                      {chatHistory.length === 0 ? (
                        <div className="p-5 bg-gradient-to-br from-slate-950 via-[#000666] to-indigo-700 rounded-[26px] border border-indigo-100 text-left mt-3 text-white shadow-[0_22px_60px_-36px_rgba(0,6,102,0.8)] overflow-hidden relative">
                          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 shadow-sm">
                            <Sparkles size={22} className="text-indigo-100" />
                          </div>
                          <h4 className="font-black text-white mb-2 text-[18px]">
                            {isSmartboardAssistant ? 'Ask the video moment. I’ll make it click.' : 'Select text. I’ll turn it into clarity.'}
                          </h4>
                          <p className="text-xs text-indigo-100/80 leading-relaxed">
                            {isSmartboardAssistant
                              ? 'Use me for timestamp explanations, rewatch plans, clip notes, and quick recall checks while the video stays in context.'
                              : 'Highlight any sentence in the Whiteboard to explain it, simplify it, build examples, quiz yourself, copy it, or save it to notes.'}
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            {saraQuickStarts.map(item => (
                              <button
                                key={item.label}
                                onClick={() => handleSendMessage(item.prompt, item.label)}
                                className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-white/80 transition-all hover:border-white/25 hover:bg-white/15 hover:text-white"
                              >
                                <item.icon size={13} className="text-indigo-100 transition-transform group-hover:scale-110" />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        chatHistory.map(m => (
                          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3.5 rounded-2xl text-[13px] leading-relaxed max-w-[88%] shadow-sm ${
                              m.role === 'user'
                                ? 'bg-gradient-to-br from-[#000666] to-indigo-700 text-white rounded-br-md'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'
                            }`}>
                              {m.role === 'user' ? m.text : (
                                <div className="prose prose-sm prose-slate max-w-none prose-p:leading-snug prose-code:bg-indigo-50 prose-code:text-[#000666] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px]">
                                  <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white p-3.5 rounded-2xl rounded-bl-md border border-slate-100 shadow-sm text-[12px] font-semibold text-indigo-600 flex items-center gap-2">
                            <Loader size={13} className="animate-spin" /> Thinking...
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3.5 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <div className="relative">
                        <input
                          ref={chatInputRef}
                          value={inputMessage}
                          onChange={e => setInputMessage(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                          className="w-full bg-white border border-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50 placeholder:text-slate-400 text-sm px-4 py-3 rounded-2xl shadow-sm transition-all"
                          placeholder={isSmartboardAssistant ? 'Ask about this video moment...' : 'Ask SARA anything...'}
                          type="text"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {activeRightTab === 'notes' && (
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white">
                      <h3 className="text-sm font-bold text-[#000666]">
                        {isSmartboardAssistant ? 'Smart Notes' : 'Field Notes'}
                      </h3>
                      <button
                        onClick={handleSynthesizeNotes}
                        disabled={isSynthesizingNotes}
                        className="text-[9px] font-bold bg-gradient-to-r from-[#000666] to-indigo-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {isSynthesizingNotes ? <Loader size={11} className="animate-spin" /> : <Zap size={11} className="text-amber-300" />}
                        <span className="uppercase tracking-wider">Synthesize</span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <RichNotesEditor content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />
                    </div>
                  </div>
                )}

                {/* QUIZ TAB */}
                {activeRightTab === 'quiz' && (
                  <div className="flex flex-col h-full p-5 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-slate-50/30">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl">
                        <GraduationCap size={19} className="text-[#000666]" />
                      </div>
                      <h3 className="text-base font-black text-[#000666]">
                        {isSmartboardAssistant ? 'Clip Check' : 'Knowledge Check'}
                      </h3>
                    </div>

                    {quizLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative">
                          <Loader size={52} className="animate-spin text-[#000666]" />
                          <Sparkles size={18} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                        </div>
                        <p className="font-bold text-[#000666] text-base mt-5">Generating Assessment...</p>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium">Tailoring questions to your progress</p>
                      </div>
                    ) : quizState === 'complete' ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100 to-white border-4 border-white shadow-xl flex items-center justify-center mb-6 relative">
                          <span className="text-2xl font-black text-[#000666]">{Math.round((quizScore / (quizQuestions.length * 10)) * 100)}%</span>
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2 rounded-xl shadow-lg">
                            <CheckCircle2 size={20} />
                          </div>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Module Mastery!</h4>
                        <p className="text-slate-500 mb-6 text-sm font-medium px-4">You scored {quizScore} points. Keep pushing toward excellence.</p>
                        <button
                          onClick={() => { setQuizState('idle'); setQuizQuestions([]); }}
                          className="w-full py-3.5 bg-gradient-to-r from-[#000666] to-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                        >
                          Return to Learning
                        </button>
                      </div>
                    ) : quizQuestions.length > 0 ? (
                      <div className="space-y-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 to-slate-50 p-3.5 rounded-xl border border-indigo-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Q{currentQuizIndex + 1}/{quizQuestions.length}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#000666] to-indigo-500 transition-all duration-500" style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-black text-[#000666]">{quizScore} PTS</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-800 leading-tight mb-5 font-serif italic">"{quizQuestions[currentQuizIndex].question}"</h4>
                          <div className="grid grid-cols-1 gap-2.5">
                            {quizQuestions[currentQuizIndex].options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  const isCorrect = i === quizQuestions[currentQuizIndex].correctAnswerIndex;
                                  if (isCorrect) setQuizScore(s => s + 10);
                                  if (currentQuizIndex < quizQuestions.length - 1) setCurrentQuizIndex(c => c + 1);
                                  else setQuizState('complete');
                                }}
                                className="w-full text-left p-3.5 rounded-xl border-2 border-slate-100 bg-white hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 to-indigo-50/50 hover:shadow-md transition-all font-bold text-[12px] text-slate-700 flex items-center justify-between group"
                              >
                                {opt}
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-[#000666] transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-white rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm mb-4">
                          <HelpCircle size={36} className="text-[#000666]" />
                        </div>
                        <h4 className="text-lg font-black text-[#000666] mb-2">
                          {isSmartboardAssistant ? 'Clip Check' : 'Knowledge Check'}
                        </h4>
                        <p className="text-slate-400 font-medium text-[12px] px-6 leading-relaxed mb-5">
                          {isSmartboardAssistant ? 'Test the exact video moment before you move ahead.' : 'Test your mastery with AI-generated questions tailored to your progress.'}
                        </p>
                        <button
                          onClick={handleStartQuiz}
                          className="w-full py-3.5 bg-gradient-to-r from-[#000666] to-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                        >
                          Start Quiz
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* RESOURCES TAB */}
                {activeRightTab === 'resources' && (
                  <div className="flex flex-col h-full p-5 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-slate-50/30">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl">
                          {isSmartboardAssistant ? <Headphones size={19} className="text-[#000666]" /> : <BookOpen size={19} className="text-[#000666]" />}
                        </div>
                        <h3 className="text-base font-black text-[#000666]">
                          {isSmartboardAssistant ? 'Video Moments' : 'Knowledge Vault'}
                        </h3>
                      </div>
                      {!isSmartboardAssistant && <button
                        onClick={handleScoutResources}
                        disabled={isScouting}
                        className="text-[9px] font-bold bg-gradient-to-r from-[#000666] to-indigo-700 text-white px-3.5 py-2 rounded-full flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isScouting ? <Loader size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
                        <span className="uppercase tracking-wider">{isScouting ? 'Scouting...' : 'Scout'}</span>
                      </button>}
                    </div>

                    <div className="space-y-3 flex-1">
                      {isSmartboardAssistant ? (
                        lessonTimeline.slice(0, 12).map((segment, index) => (
                          <button
                            key={segment.id}
                            onClick={() => handleSendMessage(
                              `Explain the Smartboard checkpoint "${segment.label}" at ${formatSegmentTime(segment.timestamp)} in 120 words. Give one thing to watch for in the video.`,
                              `Explain ${segment.label}`
                            )}
                            className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition-all hover:border-indigo-100 hover:bg-slate-50 ${
                              segment.id === activeSegmentId ? 'border-[#000666]/20 text-[#000666]' : 'border-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[10px] font-black text-orange-600">
                              {formatSegmentTime(segment.timestamp)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-black">{segment.label}</span>
                              <span className="mt-0.5 block text-[8px] font-black uppercase tracking-widest text-slate-400">
                                Moment {String(index + 1).padStart(2, '0')}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : module.resources.map(res => (
                        <div key={res.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all">
                          {res.type === 'youtube' && res.videoId ? (
                            <div>
                              <div className="relative pt-[56.25%] bg-slate-900">
                                <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${res.videoId}`} frameBorder="0" allowFullScreen title={res.title} />
                              </div>
                              <div className="p-3.5 flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                  <Zap size={13} className="text-red-500" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-[12px] text-slate-800 line-clamp-2">{res.title}</h4>
                                  <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-0.5">Video</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <a href={res.content} target="_blank" rel="noreferrer" className="p-3.5 flex items-center gap-3.5">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100 text-[#000666] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <File size={18} />
                              </div>
                              <div className="flex-1 truncate">
                                <h4 className="font-bold text-[12px] text-slate-800 truncate">{res.title || 'Resource'}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">Source</span>
                                  <ChevronRight size={8} className="text-indigo-300" />
                                </div>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}

                      {((isSmartboardAssistant && lessonTimeline.length === 0) || (!isSmartboardAssistant && module.resources.length === 0 && !isScouting)) && (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Library size={28} className="text-slate-300" />
                          </div>
                          <h4 className="text-slate-400 font-bold text-sm">Vault is empty</h4>
                          <p className="text-slate-300 text-[11px] font-medium mt-1">Scout AI to find resources</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SOURCES TAB */}
                {activeRightTab === 'sources' && (
                  <div className="flex h-full min-h-0 flex-col">
                    <SourcesPanel citations={module.citations || []} />
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default StudySession;
