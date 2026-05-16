import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, Copy, AlertCircle, Play, Anchor,
  Terminal, GitBranch, ShieldCheck, AlertTriangle, Zap,
  Box, Layers, Sparkles, ChevronRight, BrainCircuit, ChevronDown, Loader2,
  Globe, ArrowUpRight
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { ContentCitation, KnowledgeMilestone } from '../types';

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
            : 'bg-white border-[#000666]/10 hover:border-[#000666] shadow-[0_10px_30px_-10px_rgba(0,6,102,0.15)]'
        }`}
      >
        <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform duration-500 group-hover/seal:rotate-12 ${
          isZenMode ? 'bg-indigo-500 text-white' : 'bg-[#000666] text-white'
        }`}>
          <div className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-indigo-400" />
          <BookOpen size={20} className="relative z-10" />
        </div>
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>Verified Source</span>
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
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 hover:text-white' 
            : 'bg-indigo-50 text-[#000666] border-2 border-indigo-100 shadow-sm hover:bg-[#000666] hover:text-white hover:border-[#000666] hover:shadow-lg hover:shadow-indigo-500/20'
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

export const SYNTHESIS_STEPS = [
  "Establishing secure neural uplink...",
  "Parsing semantic intent of module...",
  "Querying academic databases...",
  "Structuring pedagogical hierarchy...",
  "Injecting real-world applications...",
  "Formatting technical markdown...",
  "Finalizing knowledge synthesis..."
];

const SynthesisSimulator: React.FC<{ isZenMode: boolean }> = ({ isZenMode }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, SYNTHESIS_STEPS.length - 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000">
      <div className="relative mb-12">
        <div className={`w-32 h-32 rounded-full border border-dashed animate-[spin_10s_linear_infinite] flex items-center justify-center ${isZenMode ? 'border-indigo-500/30' : 'border-[#000666]/20'}`}>
          <div className={`w-24 h-24 rounded-full border border-dotted animate-[spin_5s_linear_infinite_reverse] flex items-center justify-center ${isZenMode ? 'border-purple-500/40' : 'border-indigo-400/40'}`}>
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse shadow-2xl ${isZenMode ? 'bg-[#05070a] shadow-indigo-500/20' : 'bg-white shadow-indigo-900/10'}`}>
               <BrainCircuit size={28} className={isZenMode ? 'text-indigo-400' : 'text-[#000666]'} />
             </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center max-w-md w-full gap-4">
        <h3 className={`text-[12px] font-black uppercase tracking-[0.4em] animate-pulse ${isZenMode ? 'text-white' : 'text-[#000666]'}`}>
          Synthesizing Module Data
        </h3>
        
        <div className={`w-full p-6 rounded-2xl border backdrop-blur-sm shadow-inner overflow-hidden relative ${isZenMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200/50'}`}>
          <div className="flex flex-col gap-3 font-mono text-[10px] uppercase tracking-widest">
            {SYNTHESIS_STEPS.map((text, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 transition-all duration-500 ${idx === step ? (isZenMode ? 'text-indigo-400 opacity-100' : 'text-[#000666] opacity-100 font-bold') : idx < step ? (isZenMode ? 'text-emerald-500 opacity-60' : 'text-emerald-600 opacity-60') : 'text-slate-500 opacity-0 h-0 overflow-hidden'}`}
              >
                {idx < step ? <CheckCircle2 size={12} /> : idx === step ? <Loader2 size={12} className="animate-spin" /> : <div className="w-3 h-3" />}
                {text}
              </div>
            ))}
          </div>
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-200/30">
            <div 
              className={`h-full transition-all duration-1000 ${isZenMode ? 'bg-indigo-500' : 'bg-[#000666]'}`} 
              style={{ width: `${((step + 1) / SYNTHESIS_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
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
  isZenMode = false,
  milestones,
  onJumpToTimestamp,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [selectionData, setSelectionData] = useState<{ text: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loadingLogs, setLoadingLogs] = useState<{id: number, msg: string, type: 'info'|'success'|'thinking'}[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
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
    
    // Remove AI boilerplate and duplicate tree blocks
    let cleaned = removeDuplicateTreeBlocks(raw)
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

  useEffect(() => {
    if (isLoading) {
      setLoadingLogs([]);
      setElapsedTime(0);
      let isSubscribed = true;
      
      const timer = setInterval(() => {
        if (isSubscribed) setElapsedTime(prev => prev + 1);
      }, 1000);

      const coreMsgs = [
        "Initializing Cognitive Engine...",
        "Scanning target concepts...",
        "Structuring theoretical framework...",
        "Cross-referencing documentation...",
        "Synthesizing Markdown architecture...",
        "Finalizing content rendering..."
      ];

      const thinkingMsgs = [
        "Expanding research radius...",
        "Validating technical depth...",
        "Correlating semantic anchors...",
        "Refining architectural logic...",
        "Optimizing for learner retention...",
        "Deduplicating knowledge nodes..."
      ];

      let timeAccumulator = 0;
      coreMsgs.forEach((msg, i) => {
        timeAccumulator += 800 + Math.random() * 400;
        setTimeout(() => {
          if (isSubscribed) setLoadingLogs(prev => [{id: Date.now(), msg, type: i === coreMsgs.length - 1 ? 'success' : 'info'}, ...prev]);
        }, timeAccumulator);
      });

      let thinkingTimer: NodeJS.Timeout;
      let startThinkingTimeout = setTimeout(() => {
        let cycle = 0;
        const runThinkingLoop = () => {
          thinkingTimer = setTimeout(() => {
            if (isSubscribed) {
              setLoadingLogs(prev => [{id: Date.now(), msg: thinkingMsgs[cycle % thinkingMsgs.length], type: 'thinking'}, ...prev]);
              cycle++;
              runThinkingLoop();
            }
          }, 2500 + Math.random() * 1000);
        };
        if (isSubscribed) runThinkingLoop();
      }, timeAccumulator);

      return () => { 
        isSubscribed = false; 
        clearInterval(timer);
        clearTimeout(thinkingTimer);
        clearTimeout(startThinkingTimeout);
      };
    }
  }, [isLoading]);

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
      <h1 className={`mb-10 font-black tracking-tight leading-[1.1] transition-colors ${
        isZenMode ? 'text-white' : 'text-slate-900'
      } ${focusMode === 'content' ? 'text-[40px]' : 'text-[32px]'}`}>
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
      const cleanText = fullText
        .replace(/\s*\[Source:\s*\d+\]$/i, '')
        .replace(/^(Step\s*\d+[\s.:—–\-]*|(\d+[\s.:—–\-]+))/i, '')
        .trim();
      
      return (
        <h2 className={`mt-14 mb-6 font-black tracking-tight leading-tight transition-colors ${
          isZenMode ? 'text-slate-100' : 'text-slate-900'
        } ${focusMode === 'content' ? 'text-[28px]' : 'text-[24px]'}`}>
          {cleanText}
        </h2>
      );
    },
    h3: ({ children }: any) => (
      <h3 className={`mt-10 mb-4 font-bold tracking-tight leading-snug transition-colors ${
        isZenMode ? 'text-slate-200' : 'text-slate-800'
      } ${focusMode === 'content' ? 'text-[20px]' : 'text-[18px]'}`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => {
      // Strip citation markers from text
      const stripCitations = (child: any): any => {
        if (typeof child === 'string') return child.replace(/\[\d+(?:,\s*\d+)*\]/g, '');
        return child;
      };
      const processed = React.Children.map(children, stripCitations);

      return (
        <p className={`mb-6 leading-[1.9] tracking-tight transition-colors ${
          focusMode === 'content' ? 'text-[17px]' : 'text-[15.5px]'
        } ${isZenMode ? 'text-slate-300/90' : 'text-slate-700 font-medium'}`}>
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
            className={`relative my-8 overflow-hidden rounded-xl border ${isZenMode ? 'bg-[#0a0a0f] border-white/10' : 'bg-slate-900 border-slate-800'} shadow-xl`}
            style={{ breakInside: 'avoid' }}
          >
            <div className={`flex justify-between items-center px-4 py-2 border-b ${isZenMode ? 'border-white/10 bg-white/5' : 'border-slate-800 bg-white/5'}`}>
              <span className="text-[11px] font-mono font-bold text-slate-400">{language}</span>
              <CopyButton text={codeString} />
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                language={language}
                style={atomDark}
                customStyle={{
                  margin: 0,
                  padding: '16px 20px',
                  fontSize: '13px',
                  lineHeight: '1.6',
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
        <code className={`font-mono text-[13px] px-1.5 py-0.5 rounded-md mx-1 transition-colors ${isZenMode ? 'bg-white/10 text-indigo-300' : 'bg-slate-100 text-[#000666]'}`} {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className={`my-6 border-l-2 pl-5 py-1 ${isZenMode ? 'border-white/20 text-slate-400' : 'border-indigo-200 text-slate-600 italic'}`}>
        {children}
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className={`my-5 pl-6 space-y-2 list-disc ${isZenMode ? 'text-slate-300 marker:text-slate-500' : 'text-slate-600 marker:text-slate-400'} text-[15px] leading-relaxed`}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`my-5 pl-6 space-y-2 list-decimal ${isZenMode ? 'text-slate-300 marker:text-slate-500' : 'text-slate-600 marker:text-slate-400'} text-[15px] leading-relaxed`}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => <li className="pl-1">{children}</li>,
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
    <div className={`relative w-full h-full min-h-0 overflow-hidden flex transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>


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
        className={`relative h-full flex-1 overflow-y-auto scroll-smooth py-8 px-8 md:px-16 transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a] text-slate-300' : 'bg-white text-slate-800'}`}
      >
        <div className="max-w-[800px] mx-auto w-full pb-32">
          {isLoading ? (
            <SynthesisSimulator isZenMode={isZenMode} />
          ) : processedContent ? (
            <>
              <div className={`prose max-w-none ${isZenMode ? 'prose-invert prose-p:text-slate-300 prose-headings:text-slate-100' : 'prose-slate prose-p:text-slate-800 prose-headings:text-slate-900'}`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>

              {/* ── GROUNDED CITATIONS SECTION ── */}
              {citations && citations.length > 0 && (
                <div className={`mt-20 pt-10 border-t pb-16 transition-colors ${isZenMode ? 'border-white/5' : 'border-slate-200/60'}`}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${isZenMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-[#000666]/5 border border-[#000666]/10 text-[#000666]'}`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black transition-colors ${isZenMode ? 'text-white' : 'text-[#000666]'}`}>Grounded Sources</h3>
                      <p className={`text-[12px] font-bold uppercase tracking-widest mt-0.5 transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-500'}`}>Verified Real-World Information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {citations.map((c, i) => (
                      <a 
                        key={i} 
                        href={c.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => onCitationClick?.(i + 1)}
                        className={`group flex flex-col p-6 rounded-[24px] border transition-all duration-500 text-left ${isZenMode ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-indigo-500/30' : 'border-slate-200/60 bg-white/50 hover:bg-white hover:border-indigo-300 hover:shadow-[0_20px_50px_-20px_rgba(0,6,102,0.15)] hover:-translate-y-1'}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black group-hover:text-white transition-colors ${isZenMode ? 'bg-indigo-900/50 text-indigo-300 group-hover:bg-indigo-500' : 'bg-indigo-100 text-[#000666] group-hover:bg-[#000666]'}`}>
                            {i + 1}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isZenMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}`}>
                            {c.domain}
                          </span>
                        </div>
                        <h4 className={`text-[14px] font-bold mb-2 line-clamp-2 leading-snug transition-colors ${isZenMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-[#000666]'}`}>
                          {c.title}
                        </h4>
                        {c.snippet && (
                          <p className={`text-[12px] line-clamp-2 leading-relaxed transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            "{c.snippet}"
                          </p>
                        )}
                      </a>
                    ))}
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
                  className={`px-8 py-3 rounded-full font-bold transition-all active:scale-95 ${isZenMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-[#000666] text-white hover:shadow-xl'}`}
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
            <div className={`rounded-2xl border backdrop-blur-xl p-4 shadow-2xl transition-all ${isZenMode ? 'bg-[#05070a]/95 border-white/10 shadow-indigo-500/10' : 'bg-white/95 border-indigo-200 shadow-[0_20px_50px_-15px_rgba(0,6,102,0.2)]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black transition-colors ${isZenMode ? 'bg-indigo-600 text-white' : 'bg-[#000666] text-white'}`}>
                  {hoveredCitation}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isZenMode ? 'text-indigo-400' : 'text-indigo-400'}`}>
                  {citations[hoveredCitation - 1].domain}
                </span>
              </div>
              <p className={`text-[12px] font-bold mb-2 line-clamp-2 leading-snug transition-colors ${isZenMode ? 'text-slate-200' : 'text-[#000666]'}`}>
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
            <div className={`flex items-center gap-1 p-1 border rounded-[18px] shadow-[0_12px_40px_-12px_rgba(0,6,102,0.4)] backdrop-blur-md ${isZenMode ? 'bg-white border-white/20' : 'bg-[#000666] border-white/20'}`}>
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
            <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[6px] border-transparent ${isZenMode ? 'border-t-white' : 'border-t-[#000666]'}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRenderer;
