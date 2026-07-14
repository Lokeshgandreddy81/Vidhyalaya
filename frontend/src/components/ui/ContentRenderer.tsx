import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, Copy, AlertCircle, Play, Anchor, Check,
  Terminal, GitBranch, ShieldCheck, AlertTriangle, Zap,
  Box, Layers, Sparkles, ChevronRight, BrainCircuit, ChevronDown, Loader2,
  Globe, ArrowUpRight, Paperclip
} from 'lucide-react';
import { useAppStore } from '../../context/Store';
import { ContentCitation, KnowledgeMilestone } from '../../types';
import TimestampAnchor from '../study/TimestampAnchor';

const injectTimestampAnchors = (text: string) => {
  if (!text || typeof text !== 'string') return text;
  
  // Match timestamps in brackets, parentheses, or bare e.g. [1:23:45], (12:34), or 5:45
  const tsRegex = /(?:\[|\()?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\))?/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = tsRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    
    // Prevent matching URL ports like localhost:3000 or IP:8080
    const precedingChar = matchIndex > 0 ? text[matchIndex - 1] : '';
    const isPort = /[:a-zA-Z]/.test(precedingChar);
    if (isPort) {
      parts.push(text.substring(lastIndex, matchIndex + match[0].length));
      lastIndex = tsRegex.lastIndex;
      continue;
    }
    
    // Add text preceding the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const label = match[0];
    
    parts.push(
      <TimestampAnchor
        key={`ts-${totalSeconds}-${matchIndex}`}
        seconds={totalSeconds}
        label={label}
      />
    );
    
    lastIndex = tsRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

interface ContentRendererProps {
  content: string | null;
  isLoading: boolean;
  moduleTitle?: string;
  phaseName?: string;
  isCompleted?: boolean;
  onComplete?: () => void;
  onListen?: () => void;
  audioState?: 'idle' | 'loading' | 'playing' | 'paused';
  scrollRef?: React.RefObject<HTMLDivElement>;
  scrollProgress?: number;
  onRetry?: () => void;
  videoTimeline?: any[];
  activeSegmentId?: string | null;
  onTopicClick?: (topicLabel: string) => void;
  focusMode?: 'content' | 'video' | 'split';
  onToggleNeuralMap?: () => void;
  leftPanelMode?: 'content' | 'visualizer';
  nextActionLabel?: string;
  nextActionTitle?: string;
  nextActionMeta?: string;
  onNextAction?: () => void;
  citations?: ContentCitation[];
  onCitationClick?: (idx: number) => void;
  onSelectionAction?: (action: 'explain' | 'summarize' | 'examples', text: string) => void;
  onCodeAttach?: (code: string, language: string) => void;
  onRunInSandbox?: (code: string, language: string) => void;
  isZenMode?: boolean;
  milestones?: KnowledgeMilestone[];
  onJumpToTimestamp?: (seconds: number) => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-white/40 hover:text-white/75 transition-all text-[11px] uppercase tracking-wider font-bold">
      {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const AttachCodeButton = ({ code, language, onAttach }: { code: string; language: string; onAttach?: (code: string, language: string) => void }) => {
  const [attached, setAttached] = useState(false);

  if (!onAttach) return null;

  const handleAttach = () => {
    onAttach(code, language);
    setAttached(true);
    setTimeout(() => setAttached(false), 1800);
  };

  return (
    <button
      onClick={handleAttach}
      className="flex items-center gap-1.5 text-white/40 hover:text-white/75 transition-all text-[11px] uppercase tracking-wider font-bold"
    >
      {attached ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Paperclip size={12} />}
      {attached ? 'Attached' : 'Attach'}
    </button>
  );
};

const RunInSandboxButton = ({ code, language, onRun }: { code: string; language: string; onRun?: (code: string, language: string) => void }) => {
  if (!onRun) return null;
  const RUNNABLE_LANGS = ['javascript', 'typescript', 'js', 'ts', 'html', 'css', 'python', 'py', 'go', 'rust', 'c', 'cpp', 'java'];
  const isRunnable = RUNNABLE_LANGS.includes(language.toLowerCase());
  if (!isRunnable) return null;

  return (
    <button
      onClick={() => onRun(code, language)}
      className="relative flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest font-black cursor-pointer bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.15)] overflow-hidden"
    >
      <span className="absolute inset-0 border border-emerald-400/40 rounded-md animate-ping pointer-events-none scale-105 opacity-30" />
      <Play size={10} fill="currentColor" className="text-emerald-400" />
      <span>Run Sandbox</span>
    </button>
  );
};

const CortexLogo = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    className={className}
    style={{ width: size, height: size }}
  >
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-30" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
    <circle cx="12" cy="12" r="2" fill="currentColor" className="stroke-none" />
  </svg>
);

const SourceBadge: React.FC<{
  num: number;
  citations?: ContentCitation[];
  onCitationClick?: (idx: number) => void;
  isZenMode: boolean;
  variant?: 'inline' | 'heading';
}> = ({ num, citations, onCitationClick, isZenMode, variant = 'inline' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const citation = citations?.[num - 1];

  if (!citation) return null;

  if (variant === 'heading') {
    return (
      <button
        onClick={() => {
          const searchQuery = `${citation.title} ${citation.domain || ''}`.trim();
          window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank', 'noopener,noreferrer');
        }}
        className={`group/seal relative flex items-center gap-4 pl-1 pr-6 py-2 rounded-2xl border-2 transition-all duration-500 hover:scale-[1.02] shadow-xl ${
          isZenMode
            ? 'bg-indigo-600/10 border-indigo-500/30 hover:border-indigo-400'
            : 'bg-white border-[#4e5bff]/10 hover:border-[#4e5bff] shadow-[0_10px_30px_-10px_rgba(78, 91, 255,0.15)]'
        }`}
      >
        <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform duration-500 group-hover/seal:rotate-12 ${
          isZenMode ? 'bg-indigo-500 text-white' : 'bg-[#4e5bff] text-white'
        }`}>
          <div className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-indigo-400" />
          <BookOpen size={20} className="relative z-10" />
        </div>
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Verified Source</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-md bg-slate-100 text-[8px] font-black text-slate-500">[{num}]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[15px] font-black tracking-tight ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
              {citation.domain || citation.title || 'Course Material'}
            </span>
            <ChevronRight size={14} className="text-slate-300 group-hover/seal:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative inline-block mx-1 align-baseline group/jewel"
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const searchQuery = `${citation.title} ${citation.domain || ''}`.trim();
          window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank', 'noopener,noreferrer');
        }}
        className={`
          relative flex items-center justify-center
          h-[22px] w-[22px] rounded-full text-[10px] font-black
          transition-all duration-500 hover:scale-125
          ${isZenMode
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-50 hover:text-white'
            : 'bg-indigo-50 text-[#4e5bff] border-2 border-indigo-100 shadow-sm hover:bg-[#4e5bff] hover:text-white hover:border-[#4e5bff] hover:shadow-lg hover:shadow-indigo-500/20'
          }
        `}
      >
        <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-indigo-400 group-hover/jewel:animate-ping" />
        {num}
      </button>

      {/* JAW-DROPPING HOVER PREVIEW */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={`
              absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-5 rounded-[24px] z-[999]
              backdrop-blur-2xl border-2 shadow-2xl pointer-events-none
              ${isZenMode
                ? 'bg-[#05070a]/90 border-white/10 text-white shadow-indigo-500/10'
                : 'bg-white/95 border-slate-100 text-slate-900 shadow-indigo-500/20'
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${isZenMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <ShieldCheck size={12} className="text-indigo-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Academic Grounding</span>
              </div>
              <div className="flex items-center gap-1 opacity-40">
                <Globe size={10} />
                <span className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[80px]">
                  {citation.domain || 'Source'}
                </span>
              </div>
            </div>

            <h6 className="text-[13px] font-black leading-tight mb-2 line-clamp-2">{citation.title || 'Scholarly Reference'}</h6>

            {citation.snippet && (
               <p className={`text-[10px] font-medium leading-relaxed italic border-l-2 pl-3 mt-3 opacity-70 ${isZenMode ? 'border-indigo-500/30' : 'border-indigo-100'}`}>
                 "{citation.snippet.substring(0, 80)}..."
               </p>
            )}

            <div className={`mt-4 pt-3 border-t flex items-center justify-between opacity-50 ${isZenMode ? 'border-white/5' : 'border-slate-50'}`}>
               <span className="text-[8px] font-black uppercase tracking-widest">Click to view source</span>
               <ArrowUpRight size={12} />
            </div>

            {/* Tooltip Arrow */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${
              isZenMode ? 'border-t-[#05070a]/90' : 'border-t-white/95'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  isLoading,
  moduleTitle,
  phaseName,
  scrollRef,
  scrollProgress: externalScrollProgress,
  onRetry,
  videoTimeline,
  activeSegmentId,
  onTopicClick,
  focusMode = 'split',
  onToggleNeuralMap,
  leftPanelMode = 'content',
  nextActionLabel = 'Continue Path',
  nextActionTitle,
  nextActionMeta,
  onNextAction,
  citations,
  onCitationClick,
  onSelectionAction,
  onCodeAttach,
  onRunInSandbox,
  isZenMode = false,
  milestones,
  onJumpToTimestamp,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [selectionData, setSelectionData] = useState<{ text: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const innerScrollRef = useRef<HTMLDivElement>(null);


  const extractTextFromChildren = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractTextFromChildren).join(' ');
    if (children?.props?.children) return extractTextFromChildren(children.props.children);
    return '';
  };

  const removeDuplicateTreeBlocks = (value: string) => {
    let treeCount = 0;
    return value.replace(/```tree[\s\S]*?```/gi, block => {
      treeCount += 1;
      return treeCount === 1 ? block : '';
    });
  };
  const finalizeTable = (buffer: string[]) => {
    return buffer.map(l => l.replace(/\s+/g, ' ').trim()).join('\n');
  };

  const healTables = (raw: string) => {
    const lines = raw.split('\n');
    const output: string[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const isHeaderLike = (s: string) => /\|\s*feature\s*\|/i.test(s) || (/\|\s*standard\s*\|/i.test(s) && /\|\s*pro\s*\|/i.test(s));
    const isSepLike = (s: string) => /\|\s*:?-+:?\s*\|/.test(s);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();

      const startsWithPipe = t.startsWith('|');

      if (inTable) {
        if (t === '' || t.startsWith('#') || t.startsWith('```')) {
          inTable = false;
          if (tableBuffer.length) {
            output.push(finalizeTable(tableBuffer));
            tableBuffer = [];
          }
          output.push(line);
        } else {
          if (startsWithPipe) {
            tableBuffer.push(line);
          } else {
            // Continuity line without starting pipe - append to the last buffer item to heal broken rows
            if (tableBuffer.length > 0) {
              tableBuffer[tableBuffer.length - 1] += ' ' + t;
            } else {
              tableBuffer.push(line);
            }
          }
        }
      } else {
        // Look for table trigger condition
        if (startsWithPipe && (isHeaderLike(t) || isSepLike(t) || (i < lines.length - 1 && isSepLike(lines[i+1].trim())))) {
          inTable = true;
          tableBuffer.push(line);
        } else {
          output.push(line);
        }
      }
    }

    if (tableBuffer.length) {
      output.push(finalizeTable(tableBuffer));
    }

    return output.join('\n');
  };


  const cleanContent = (raw: string | null) => {
    if (!raw) return "";

    // Remove source quotes (e.g. "> Source: [1]") completely from content
    let cleaned = raw.replace(/^[>\s]*Source:\s*(\[\d+\]|[\d,\s\[\]]*)*$/gim, '');

    // Remove AI boilerplate and duplicate tree blocks
    cleaned = removeDuplicateTreeBlocks(cleaned)
      .replace(/^[\s\S]*?(?=#\s)/, '') // Remove everything before the first # Heading
      .replace(/^(?:Vidyal\.ai|Architectural Intelligence Report|Subject:|Classification:|System:|v\d+\.\d+\.\d+).*$/gm, '')
      .replace(/^##\s*Step\s*9\.5\s*[—-]\s*Quick Review Flow[\s\S]*?(?=^##\s*Step\s*10\b)/gim, '## Step 9.5 — Mastery Checkpoint\n\n');

    // Convert ALL CAPS lines (standalone) into Headings to improve structure
    cleaned = cleaned.replace(/^(?![#\s])([A-Z][A-Z0-9\s:]{6,})$/gm, '## $1');

    // Rename Entry Hook (with or without Step prefixes) to Introduction
    cleaned = cleaned.replace(/^(?:#+|\*\*)\s*(?:Step\s*[\d.]+[\s.:—–\-]+)?Entry Hook\s*(?:\*\*)?:?\s*$/gim, '## Introduction');

    // Completely delete Minimal Anchor heading so its paragraph merges with Introduction
    cleaned = cleaned.replace(/^(?:#+|\*\*)\s*(?:Step\s*[\d.]+[\s.:—–\-]+)?Minimal Anchor\s*(?:\*\*)?:?\s*$/gim, '');

    // Ensure strict empty lines before lists and headings to prevent parsing failures
    // This is critical for react-markdown + remark-gfm to recognize blocks correctly
    cleaned = cleaned.replace(/([^\n])\n(\*|\d+\.)/g, '$1\n\n$2'); // Lists
    cleaned = cleaned.replace(/([^\n])\n(#)/g, '$1\n\n$2'); // Headings

    // Heal broken AI markdown tables and auto-promote to premium components
    cleaned = healTables(cleaned);

    return cleaned
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const processedContent = React.useMemo(() => cleanContent(content), [content]);

  const topics = React.useMemo(() => {
    return (processedContent.match(/^##\s+(.+)$/gm) || [])
      .map(t => t.replace(/^##\s+/, '').trim())
      .slice(0, 12);
  }, [processedContent]);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const scrollRoot = scrollRef?.current || innerScrollRef.current;
    if (!scrollRoot || topics.length === 0) return;

    const handleScrollActive = () => {
      const h2Elements = [...scrollRoot.querySelectorAll('h2')];
      if (h2Elements.length === 0) return;

      const containerRect = scrollRoot.getBoundingClientRect();
      let currentActive = h2Elements[0];
      let minDiff = Infinity;

      h2Elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const diff = Math.abs(rect.top - containerRect.top - 60);
        if (diff < minDiff && rect.top < containerRect.bottom - 100) {
          minDiff = diff;
          currentActive = el;
        }
      });

      if (currentActive) {
        let title = currentActive.textContent || '';
        title = title.replace(/^(?:Step\s*[\d.]+[\s.:—–\-]+)?/i, '')
                     .replace(/\[Source:\s*\d+\]/gi, '')
                     .trim();
        setActiveSection(title);
      }
    };

    scrollRoot.addEventListener('scroll', handleScrollActive);
    // Initial call
    handleScrollActive();

    return () => scrollRoot.removeEventListener('scroll', handleScrollActive);
  }, [scrollRef, topics, processedContent]);

  const scrollToSection = (topic: string) => {
    const scrollRoot = scrollRef?.current || innerScrollRef.current;
    if (!scrollRoot) return;
    const h2Elements = [...scrollRoot.querySelectorAll('h2')];
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '');

    const target = h2Elements.find(el => {
      const cleanText = el.textContent?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      return cleanText.includes(cleanTopic) || cleanTopic.includes(cleanText);
    });

    if (target) {
      const containerRect = scrollRoot.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const scrollTop = scrollRoot.scrollTop + (targetRect.top - containerRect.top) - 40;
      scrollRoot.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  };

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    if (focusMode === 'content') {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setShowColumns(false);
      }, 1050);
      return () => clearTimeout(timer);
    } else {
      setShowColumns(false);
      const timer = setTimeout(() => setIsTransitioning(false), 950);
      return () => clearTimeout(timer);
    }
  }, [focusMode]);



  // Sync the inner ref to the passed scrollRef so parent can use it
  useEffect(() => {
    if (scrollRef && innerScrollRef.current) {
      (scrollRef as any).current = innerScrollRef.current;
    }
  }, [scrollRef]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef?.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(100);
      } else {
        setScrollProgress((scrollTop / maxScroll) * 100);
      }
    };

    const ref = scrollRef?.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef, content]);

  // Intersection Observer for bi-directional scroll sync
  useEffect(() => {
    const scrollRoot = innerScrollRef.current;
    if (!scrollRoot || !videoTimeline || videoTimeline.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const segmentId = entry.target.id.replace('segment-', '');
            const segment = videoTimeline.find(s => s.id === segmentId);
            if (segment && segment.id !== activeSegmentId) {
              onTopicClick?.(segment.label);
            }
          }
        });
      },
      { threshold: 0.5, root: scrollRoot, rootMargin: '-10% 0px -70% 0px' }
    );

    const headings = scrollRoot.querySelectorAll('[id^="segment-"]');
    headings.forEach(h => observer.observe(h));

    return () => observer.disconnect();
  }, [videoTimeline, content, onTopicClick, activeSegmentId]);

  // Auto-scroll to active segment (when triggered from video)
  useEffect(() => {
    const scrollRoot = scrollRef?.current;
    if (activeSegmentId && scrollRoot) {
      const el = [...scrollRoot.querySelectorAll<HTMLElement>('[id^="segment-"]')]
        .find(segment => segment.id === `segment-${activeSegmentId}`);
      if (el) {
        const containerRect = scrollRoot.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        // Only scroll if not already visible (to avoid fighting manual scroll)
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          const scrollTop = scrollRoot.scrollTop + (elRect.top - containerRect.top) - 100;
          scrollRoot.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }
  }, [activeSegmentId, scrollRef]);

  const progress = externalScrollProgress ?? scrollProgress;
  const activeLabel = videoTimeline?.find(segment => segment.id === activeSegmentId)?.label ?? null;

  const normalizeText = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findTimelineSegment = (text: string) => {
    const normalizedText = normalizeText(text);
    if (normalizedText.length < 3) return undefined;
    return videoTimeline?.find(segment => normalizeText(segment.label) === normalizedText)
      || videoTimeline?.find(segment => {
        const normalizedLabel = normalizeText(segment.label);
        return normalizedLabel.includes(normalizedText) || normalizedText.includes(normalizedLabel);
      });
  };

  const handleTimelineJump = (text: string) => {
    const segment = findTimelineSegment(text);
    if (segment) onTopicClick?.(segment.label);
  };



  const MarkdownComponents: any = {
    h1: ({ children }: any) => (
      <h1 className={`mb-10 font-serif font-black tracking-tight leading-[1.1] transition-colors ${
        isZenMode ? 'text-white' : 'text-slate-900'
      } ${focusMode === 'content' ? 'text-[48px]' : 'text-[38px]'}`}>
        {children}
      </h1>
    ),
    hr: () => (
      <hr className={`my-12 border-0 h-px ${isZenMode ? 'bg-white/10' : 'bg-slate-100'}`} />
    ),
    strong: ({ children }: any) => (
      <strong className={`font-bold ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
        {children}
      </strong>
    ),
    h2: ({ children }: any) => {
      const fullText = extractTextFromChildren(children);
      
      // Parse step number (e.g. "Step 1" or "2.3")
      let stepNumber = '';
      let cleanText = fullText.trim();
      
      const stepMatch = cleanText.match(/^(?:Step\s*([\d.]+)|(\d+))[\s.:—–\-]+(.*)$/i);
      if (stepMatch) {
        stepNumber = stepMatch[1] || stepMatch[2];
        cleanText = stepMatch[3];
      }
      
      // Strip out source marker completely
      cleanText = cleanText
        .replace(/\[Source:\s*\d+\]/gi, '')
        .replace(/\s*\[Source:\s*\d+\]$/gi, '')
        .trim();

      const headingText = stepNumber ? `Step ${stepNumber}: ${cleanText}` : cleanText;

      return (
        <h2 className={`mt-14 mb-5 font-serif font-black tracking-tight leading-tight transition-colors border-b pb-2 ${
          isZenMode ? 'text-slate-100 border-white/5' : 'text-slate-900 border-slate-100/80'
        } ${focusMode === 'content' ? 'text-[32px]' : 'text-[27px]'}`}>
          {headingText}
        </h2>
      );
    },
    h3: ({ children }: any) => (
      <h3 className={`mt-10 mb-4 font-serif font-bold tracking-tight leading-snug transition-colors ${
        isZenMode ? 'text-slate-200' : 'text-slate-800'
      } ${focusMode === 'content' ? 'text-[25px]' : 'text-[22px]'}`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => {
      // Strip citation markers from text and inject timestamp links
      const stripCitations = (child: any): any => {
        if (typeof child === 'string') {
          const stripped = child
            .replace(/\[Source:\s*\d+\]/gi, '')
            .replace(/\[\d+(?:,\s*\d+)*\]/g, '');
          return injectTimestampAnchors(stripped);
        }
        return child;
      };
      const processed = React.Children.map(children, stripCitations);

      return (
        <p className={`mb-6 leading-[1.95] tracking-tight transition-colors text-justify hyphens-auto font-sans font-medium text-slate-700 ${
          focusMode === 'content' ? 'text-[21px]' : 'text-[18.5px]'
        } ${isZenMode ? 'text-slate-300/90' : 'text-slate-700/95'}`}>
          {processed}
        </p>
      );
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');
      const spansMultipleLines = node?.position?.start?.line !== undefined
        && node?.position?.end?.line !== undefined
        && node.position.end.line > node.position.start.line;
      const isBlockCode = spansMultipleLines || codeString.includes('\n');

      if (isBlockCode) {
        return (
          <div
            className={`relative my-6 overflow-hidden rounded-xl border ${
              isZenMode 
                ? 'bg-[#06080c]/98 border-white/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] shadow-indigo-950/20' 
                : 'bg-[#0c111e]/98 border-slate-800 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] shadow-indigo-950/15'
            } max-w-full`}
            style={{ breakInside: 'avoid' }}
          >
            <div className={`flex justify-between items-center pl-4 pr-3 py-2.5 border-b text-[11px] font-mono select-none ${
              isZenMode ? 'border-white/5 bg-[#0b0c10]/70 text-slate-400' : 'border-slate-800/80 bg-slate-950/80 text-slate-300'
            }`}>
              <div className="flex items-center gap-4">
                {/* Mock macOS dots */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
                </div>
                
                {/* Active Tab */}
                <div className="flex items-center gap-2 text-slate-400 border-l border-white/10 pl-4 py-0.5">
                  <Terminal size={11} className="text-indigo-400" />
                  <span className="text-[10px] tracking-wide text-slate-350">
                    index.{language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language === 'css' ? 'css' : language === 'html' ? 'html' : language}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <RunInSandboxButton code={codeString} language={language} onRun={onRunInSandbox || onCodeAttach} />
                <AttachCodeButton code={codeString} language={language} onAttach={onCodeAttach} />
                <CopyButton text={codeString} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                language={language}
                style={atomDark}
                customStyle={{
                  margin: 0,
                  padding: '14px 18px',
                  fontSize: '12.5px',
                  lineHeight: '1.55',
                  background: 'transparent',
                }}
                wrapLines={true}
                wrapLongLines={true}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      return (
        <code className={`font-mono text-[13px] px-1 py-0.5 rounded mx-1 transition-colors ${isZenMode ? 'bg-white/5 text-indigo-300 border border-white/5' : 'bg-slate-50 text-[#4e5bff] border border-slate-100'}`} {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => {
      // Helper function to strip alert tags from children text
      const stripTags = (child: any): any => {
        if (typeof child === 'string') {
          return child.replace(/^\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION)\]\s*/i, '');
        }
        if (React.isValidElement(child)) {
          const innerChildren = (child.props as any).children;
          if (innerChildren) {
            return React.cloneElement(child, {
              children: React.Children.map(innerChildren, stripTags)
            } as any);
          }
        }
        return child;
      };

      const fullText = extractTextFromChildren(children);
      const alertMatch = fullText.match(/\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION)\]/i);

      let borderClass = isZenMode ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-[#4e5bff]/30 bg-slate-50/40';
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        if (type === 'IMPORTANT') {
          borderClass = isZenMode ? 'border-amber-500/40 bg-amber-950/10' : 'border-amber-500/30 bg-amber-50/20';
        } else if (type === 'WARNING' || type === 'CAUTION') {
          borderClass = isZenMode ? 'border-rose-500/40 bg-rose-950/10' : 'border-rose-500/30 bg-rose-50/20';
        } else if (type === 'TIP') {
          borderClass = isZenMode ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-emerald-500/30 bg-emerald-50/20';
        }
      }

      const cleanedChildren = React.Children.map(children, stripTags);
      const processed = React.Children.map(cleanedChildren, (child) => {
        if (typeof child === 'string') {
          return injectTimestampAnchors(child);
        }
        return child;
      });

      return (
        <blockquote className={`my-8 pl-6 py-1 italic transition-all text-justify hyphens-auto border-0 bg-transparent ${
          isZenMode ? 'text-slate-400' : 'text-slate-650'
        } ${
          focusMode === 'content' ? 'text-[21px]' : 'text-[18.5px]'
        }`}>
          {processed}
        </blockquote>
      );
    },

    ul: ({ children }: any) => (
      <ul className={`my-5 pl-6 space-y-2 list-disc ${isZenMode ? 'text-slate-300 marker:text-slate-500' : 'text-slate-600 marker:text-indigo-400/70'} ${focusMode === 'content' ? 'text-[21px]' : 'text-[18.5px]'} leading-relaxed`}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`my-5 pl-6 space-y-2 list-decimal ${isZenMode ? 'text-slate-300 marker:text-slate-500' : 'text-slate-600 marker:text-indigo-400/70'} ${focusMode === 'content' ? 'text-[21px]' : 'text-[18.5px]'} leading-relaxed`}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => {
      const processed = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return injectTimestampAnchors(child);
        }
        return child;
      });
      return <li className="pl-1 leading-relaxed">{processed}</li>;
    },
    table: ({ children }: any) => (
      <div className={`my-8 w-full overflow-x-auto rounded-xl border-0 shadow-sm ${isZenMode ? 'bg-white/5' : 'bg-slate-50/50'}`}>
        <table className="w-full text-left border-collapse text-[14px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className={`text-[12px] font-bold ${isZenMode ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
        {children}
      </thead>
    ),
    tr: ({ children }: any) => (
      <tr className={`border-b ${isZenMode ? 'border-white/5' : 'border-slate-200/50'}`}>
        {children}
      </tr>
    ),
    td: ({ children }: any) => (
      <td className={`px-4 py-3 ${isZenMode ? 'text-slate-300' : 'text-slate-600'}`}>
        {children}
      </td>
    ),
    th: ({ children }: any) => (
      <th className={`px-4 py-3 font-bold ${isZenMode ? 'text-slate-200' : 'text-slate-800'}`}>
        {children}
      </th>
    ),
  };

  return (
    <div className={`relative w-full h-full min-h-0 overflow-hidden flex transition-all duration-1000 bg-transparent`}>

      {/* Floating Table of Contents Outline Sidebar */}
      {topics.length > 0 && focusMode === 'content' && (
        <div className="hidden xl:block fixed right-10 top-24 w-52 shrink-0 z-30 select-none animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="relative pl-6 py-2">
            {/* Vertical Scroll Progress Bar Track */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-200/50 dark:bg-white/5 rounded-full">
              <div 
                className="absolute top-0 left-0 w-full bg-[#4e5bff] transition-all duration-150 rounded-full" 
                style={{ height: `${progress}%` }}
              />
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#4e5bff] shadow-[0_0_8px_#4e5bff] transition-all duration-150 animate-ping" 
                style={{ top: `calc(${progress}% - 4px)` }}
              />
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#4e5bff] shadow-[0_0_4px_#4e5bff] transition-all duration-150" 
                style={{ top: `calc(${progress}% - 3px)` }}
              />
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-450 dark:text-slate-500 mb-5">
              Outline
            </h4>

            <div className="space-y-4">
              {topics.map((topic, idx) => {
                const isCurrent = activeSection && (
                  topic.toLowerCase().includes(activeSection.toLowerCase()) || 
                  activeSection.toLowerCase().includes(topic.toLowerCase())
                );
                
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(topic)}
                    className={`block text-left text-[12.5px] font-medium leading-tight transition-all duration-300 hover:translate-x-1 ${
                      isCurrent 
                        ? 'text-[#4e5bff] font-black' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250'
                    }`}
                  >
                    {topic.replace(/^(?:Step\s*[\d.]+[\s.:—–\-]+)?/i, '')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}


      <div
        ref={innerScrollRef}
        onMouseUp={() => {
          const selection = window.getSelection();
          const selectedText = selection?.toString().trim();

          if (selectedText && selectedText.length > 3) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();
            if (rect) {
              setSelectionData({
                text: selectedText,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
            }
          } else {
            setSelectionData(null);
          }
        }}
        className={`relative h-full flex-1 overflow-y-auto scroll-smooth py-12 px-8 md:px-16 transition-all duration-1000 bg-transparent ${isZenMode ? 'text-slate-300' : 'text-slate-900 border-r border-slate-100/50'}`}
      >
        <div className="max-w-[800px] mx-auto w-full pb-32">
          {(isLoading && !processedContent) ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative flex items-center justify-center mb-6">
                <span className="absolute w-8 h-8 rounded-full border border-indigo-400/20 animate-ping" />
                <div className="w-8 h-8 rounded-full border-2 border-[#4e5bff] border-t-transparent animate-spin" />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Synthesizing module...
              </p>
            </div>
          ) : processedContent ? (
            <>
              {/* Premium Dual-Font System Styles */}
              <style>{`
                .whiteboard-content h1, 
                .whiteboard-content h2, 
                .whiteboard-content h3 {
                  font-family: 'Newsreader', Georgia, Cambria, serif !important;
                }
                .whiteboard-content p {
                  font-family: 'Outfit', 'Inter', system-ui, sans-serif !important;
                }
              `}</style>

              <div className={`whiteboard-content prose max-w-none ${isZenMode ? 'prose-invert prose-p:text-slate-300 prose-headings:text-slate-100' : 'prose-slate prose-p:text-slate-800 prose-headings:text-slate-900'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>

              {/* ── GROUNDED CITATIONS SECTION ── */}
              {citations && citations.length > 0 && (
                <div className={`mt-16 pt-8 border-t pb-12 transition-colors ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <h3 className={`text-[13px] font-black uppercase tracking-[0.2em] mb-6 transition-colors ${isZenMode ? 'text-slate-400' : 'text-slate-500 font-sans'}`}>
                    References & Grounding Sources
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {citations.map((c, i) => {
                      const isVideo = c.domain === 'youtube.com' || c.url.includes('youtube.com') || c.url.includes('youtu.be');
                      return (
                        <motion.a
                          key={i}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onCitationClick?.(i + 1)}
                          whileHover={{ y: -4, scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className={`block p-4.5 rounded-2xl border transition-all text-left group ${
                            isZenMode 
                              ? 'bg-[#0b0c10]/40 border-white/5 hover:border-indigo-500/40 hover:bg-[#0b0c10]/60 shadow-xl shadow-black/40 hover:shadow-indigo-950/10' 
                              : 'bg-[#fafafa]/50 border-slate-200/60 hover:border-[#4e5bff]/40 hover:bg-white shadow-sm hover:shadow-[0_12px_30px_rgba(78,91,255,0.06)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3.5 select-none">
                            <div className="flex items-center gap-2">
                              {/* Source Badge */}
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                isVideo
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                              }`}>
                                {i + 1}
                              </span>
                              
                              {/* Icon Badge */}
                              <div className="shrink-0">
                                {isVideo ? (
                                  <div className="p-1 rounded-md bg-red-500/10 text-red-500">
                                    <Play size={10} fill="currentColor" />
                                  </div>
                                ) : (
                                  <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                                    <BookOpen size={10} />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Domain */}
                            <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${
                              isZenMode ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              {c.domain || 'article'}
                            </span>
                          </div>
                          
                          <h4 className={`text-[13px] font-black tracking-tight leading-snug font-sans group-hover:underline decoration-1 ${
                            isZenMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-[#4e5bff]'
                          }`}>
                            {c.title}
                          </h4>
                          
                          {c.snippet && (
                            <p className={`text-[11px] mt-2.5 leading-relaxed italic line-clamp-2 ${
                              isZenMode ? 'text-slate-500 border-l border-white/5 pl-2' : 'text-slate-400 border-l border-slate-200 pl-2'
                            }`}>
                              "{c.snippet}"
                            </p>
                          )}
                        </motion.a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isZenMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <AlertCircle size={32} className={isZenMode ? 'text-slate-700' : 'text-slate-300'} />
              </div>
              <h3 className={`text-xl font-headline-md mb-2 transition-colors ${isZenMode ? 'text-white' : 'text-slate-800'}`}>No Content Synthesized</h3>
              <p className={`max-w-md mx-auto mb-8 transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-500'}`}>
                The research engine hasn't generated content for this module yet.
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`px-8 py-3 rounded-full font-bold transition-all active:scale-95 ${isZenMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-[#4e5bff] text-white hover:shadow-xl'}`}
                >
                  Regenerate Technical Deep-Dive
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── FLOATING CITATION PREVIEW (TRUTH TO POWER) ── */}
        {hoveredCitation && citations?.[hoveredCitation - 1] && (
          <div
            className="fixed z-[9999] w-80 animate-in fade-in zoom-in duration-300 pointer-events-none"
            style={{
              left: `${mousePos.x + 20}px`,
              top: `${mousePos.y - 40}px`,
              transform: 'translate3d(0, 0, 0)'
            }}
          >
            <div className={`rounded-2xl border backdrop-blur-xl p-4 shadow-2xl transition-all ${isZenMode ? 'bg-[#05070a]/95 border-white/10 shadow-indigo-500/10' : 'bg-white/95 border-indigo-200 shadow-[0_20px_50px_-15px_rgba(78, 91, 255,0.2)]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black transition-colors ${isZenMode ? 'bg-indigo-600 text-white' : 'bg-[#4e5bff] text-white'}`}>
                  {hoveredCitation}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isZenMode ? 'text-indigo-400' : 'text-indigo-400'}`}>
                  {citations[hoveredCitation - 1].domain}
                </span>
              </div>
              <p className={`text-[12px] font-bold mb-2 line-clamp-2 leading-snug transition-colors ${isZenMode ? 'text-slate-200' : 'text-[#4e5bff]'}`}>
                {citations[hoveredCitation - 1].title}
              </p>
              {citations[hoveredCitation - 1].snippet && (
                <p className={`text-[10px] leading-relaxed italic border-l-2 pl-3 transition-colors ${isZenMode ? 'text-slate-500 border-white/10' : 'text-slate-500 border-slate-100'}`}>
                  "{citations[hoveredCitation - 1].snippet}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* SELECTION ACTION MENU */}
        {selectionData && (
          <div
            className="fixed z-[10000] -translate-x-1/2 -translate-y-full animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ left: selectionData.x, top: selectionData.y - 12 }}
          >
            <div className={`flex items-center gap-1 p-1 border rounded-[18px] shadow-[0_12px_40px_-12px_rgba(78, 91, 255,0.4)] backdrop-blur-md ${isZenMode ? 'bg-white border-white/20' : 'bg-[#4e5bff] border-white/20'}`}>
              {[
                { id: 'explain' as const, label: 'Explain', Icon: Sparkles, color: isZenMode ? 'text-indigo-600' : 'text-indigo-300' },
                { id: 'summarize' as const, label: 'Summarize', Icon: BookOpen, color: isZenMode ? 'text-emerald-600' : 'text-emerald-300' },
                { id: 'examples' as const, label: 'Examples', Icon: Layers, color: isZenMode ? 'text-amber-600' : 'text-amber-300' }
              ].map((act) => (
                <button
                  key={act.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectionAction?.(act.id, selectionData.text);
                    setSelectionData(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[14px] transition-all group ${isZenMode ? 'hover:bg-[#05070a]/10' : 'hover:bg-white/10'}`}
                >
                  <act.Icon size={12} className={`${act.color} group-hover:scale-110 transition-transform`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isZenMode ? 'text-[#05070a]/90' : 'text-white/90'}`}>{act.label}</span>
                </button>
              ))}
            </div>
            <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[6px] border-transparent ${isZenMode ? 'border-t-white' : 'border-t-[#4e5bff]'}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRenderer;
