import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  generateModuleContent, 
  scoutResourcesCached, 
  chatWithTutor, 
  generateQuizForModule,
  triggerBackgroundPreGeneration,
  generateMermaidDiagram,
  getNotesAutocomplete
} from '../services/geminiService';
import { ChatMessage, QuizQuestion, SmartboardJumpEventDetail, VideoSegment, KnowledgeMilestone, ContentCitation, Resource } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, ChevronLeft, ChevronRight,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye, GitBranch, Layout, Target, ShieldCheck, Network,
  Play, Pause, Clock, Volume2, Music, X, Lock, Mic, Copy, Palette, Columns4, ChevronDown,
  Code, Terminal, CheckSquare, Quote, Table, Link as LinkIcon, Search, Gamepad2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import ContentRenderer from '../components/ui/ContentRenderer';
import NeuralSynthesizer, { NodeDetailPanel, ConceptNode } from '../features/study/NeuralSynthesizer';
import Smartboard from '../features/study/Smartboard';
import AITerminalOverlay, { ActionType } from '../components/ui/AITerminalOverlay';
import { mapMasteryTimeline } from '../services/geminiService';
import CodeSandbox from '../components/ui/CodeSandbox';
import { soundscape } from '../services/soundscapeService';
import MermaidDiagram from '../components/ui/MermaidDiagram';

import { useFocus } from '../context/FocusContext';
import { useFocusSession } from '../hooks/useFocusSession';
import { motion, AnimatePresence } from 'framer-motion';
import SARAActionChips from '../components/ui/SARAActionChips';
import SARAQuizPanel from '../features/study/SARAQuizPanel';
import SARAVaultPanel from '../features/study/SARAVaultPanel';
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

interface RichNotesEditorProps {
  content: string;
  onChange: (val: string) => void;
  isZenMode: boolean;
  moduleTitle?: string;
  keyConcepts?: string[];
}

// ── Web Audio Keyboard Soundscape Synthesizer ──
class KeyboardSynth {
  private static audioCtx: AudioContext | null = null;
  private static soundType: 'bubble' | 'click' | 'mute' = 'mute';

  public static setSoundType(type: 'bubble' | 'click' | 'mute') {
    this.soundType = type;
  }

  public static play() {
    if (this.soundType === 'mute') return;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Randomize pitch slightly for organic tactile typing feel
      const pitchOffset = Math.random() * 0.16 - 0.08; // +/- 8%

      if (this.soundType === 'bubble') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        const baseFreq = 480 * (1 + pitchOffset);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.4, ctx.currentTime + 0.035);
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (this.soundType === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        
        const baseFreq = 750 * (1 + pitchOffset);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      }
    } catch (err) {
      // fail silently
    }
  }
}

// ── 3D Flipping Active Recall Flashcard Component ──
const FlippingRecallCard: React.FC<{ front: string; back: string }> = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div 
      onClick={() => setIsFlipped(prev => !prev)}
      className="my-4 cursor-pointer w-full max-w-md mx-auto h-28 select-none"
      style={{ perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full duration-500 transition-transform"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}
      >
        {/* Front Side */}
        <div 
          className="absolute inset-0 flex flex-col justify-center items-center p-4 rounded-xl border border-[#4e5bff]/20 bg-gradient-to-br from-indigo-50/80 to-white/95 dark:from-[#0f111a]/95 dark:to-[#171a26]/95 backdrop-blur-md shadow-lg text-center"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="text-[8px] font-black uppercase tracking-widest text-[#4e5bff] mb-1.5 flex items-center gap-1">
            <span>❓ ACTIVE RECALL FLASHCARD</span>
            <span className="text-[7px] text-slate-400 font-medium font-sans">(Click to Flip)</span>
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed">
            {front}
          </div>
        </div>

        {/* Back Side */}
        <div 
          className="absolute inset-0 flex flex-col justify-center items-center p-4 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/80 to-white/95 dark:from-[#0c1c14]/95 dark:to-[#0f241a]/95 backdrop-blur-md shadow-lg text-center"
          style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)' 
          }}
        >
          <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1.5 flex items-center gap-1">
            <span>💡 ANSWER DECRYPTED</span>
            <span className="text-[7px] text-slate-450 font-medium font-sans">(Click to Flip)</span>
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-emerald-300 line-clamp-2 leading-relaxed font-sans">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
};

const RichNotesEditor: React.FC<RichNotesEditorProps> = ({ content, onChange, isZenMode, moduleTitle, keyConcepts = [] }) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [editorTheme, setEditorTheme] = useState<'paper' | 'sepia' | 'midnight' | 'cyberpunk'>('paper');
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('vidyalai_notes_font_size');
    return saved ? parseInt(saved, 10) : 13;
  });

  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  // Outline Navigation and Goal Metrics States
  const [showOutline, setShowOutline] = useState(false);
  const [wordGoal, setWordGoal] = useState<number>(() => {
    const saved = localStorage.getItem('vidyalai_notes_word_goal');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'drafting'>('saved');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Autocomplete & Soundscape States
  const [copilotEnabled, setCopilotEnabled] = useState(() => {
    return localStorage.getItem('vidyalai_notes_copilot_enabled') === 'true';
  });
  const [ghostSuggestion, setGhostSuggestion] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [typingSound, setTypingSound] = useState<'bubble' | 'click' | 'mute'>(() => {
    return (localStorage.getItem('vidyalai_notes_typing_sound') as any) || 'mute';
  });
  const copilotTimeoutRef = useRef<any>(null);

  // Sync typing feedback sound
  useEffect(() => {
    KeyboardSynth.setSoundType(typingSound);
    localStorage.setItem('vidyalai_notes_typing_sound', typingSound);
  }, [typingSound]);

  // SARA Ghost Autocomplete effect
  useEffect(() => {
    if (!copilotEnabled || !content || viewMode === 'preview') {
      setGhostSuggestion('');
      return;
    }

    if (copilotTimeoutRef.current) clearTimeout(copilotTimeoutRef.current);
    
    // Clear suggestion when typing starts
    setGhostSuggestion('');

    copilotTimeoutRef.current = setTimeout(async () => {
      const textarea = editorRef.current;
      if (!textarea) return;
      
      const cursor = textarea.selectionEnd;
      // Trigger if cursor is near the end
      if (cursor < content.length - 20) return;

      setIsCopilotLoading(true);
      try {
        const suggestion = await getNotesAutocomplete(
          moduleTitle || 'General Study',
          content,
          keyConcepts || []
        );
        if (suggestion && suggestion.trim().length > 0) {
          setGhostSuggestion(suggestion);
        }
      } catch (err) {
        console.warn("Copilot autocomplete failed:", err);
      } finally {
        setIsCopilotLoading(false);
      }
    }, 1200);

    return () => {
      if (copilotTimeoutRef.current) clearTimeout(copilotTimeoutRef.current);
    };
  }, [content, copilotEnabled, moduleTitle, keyConcepts, viewMode]);

  // Concept coverage live analysis
  const conceptCoverage = useMemo(() => {
    const list: { concept: string; isCovered: boolean }[] = [];
    if (!keyConcepts || keyConcepts.length === 0) return list;
    
    const lowerContent = (content || '').toLowerCase();
    keyConcepts.forEach(c => {
      const isCovered = lowerContent.includes(c.toLowerCase());
      list.push({ concept: c, isCovered });
    });
    return list;
  }, [content, keyConcepts]);

  // Insert a draft concept template outline skeleton
  const insertConceptTemplate = (concept: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const template = `\n\n## ${concept}\n- **Core Definition:** \n- **Key Mechanics:** \n- **Application:** \n`;
    const insertion = template;
    
    try {
      textarea.focus();
      if (!document.execCommand('insertText', false, insertion)) {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      const newValue = text.substring(0, start) + insertion + text.substring(end);
      handleTextChange(newValue);
    }
    toast.success(`Inserted template for "${concept}"`);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const activeScrollSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Sync scroll editor -> preview
  const handleEditorScroll = () => {
    if (activeScrollSourceRef.current === 'preview') return;
    activeScrollSourceRef.current = 'editor';
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (editor && preview) {
      const percentage = editor.scrollTop / Math.max(1, editor.scrollHeight - editor.clientHeight);
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      activeScrollSourceRef.current = null;
    }, 100);
  };

  // Sync scroll preview -> editor
  const handlePreviewScroll = () => {
    if (activeScrollSourceRef.current === 'editor') return;
    activeScrollSourceRef.current = 'preview';
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (editor && preview) {
      const percentage = preview.scrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight);
      editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    }
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      activeScrollSourceRef.current = null;
    }, 100);
  };

  // Helper to toggle checkbox values in raw markdown
  const handleToggleCheckbox = (targetIndex: number) => {
    let matchCount = 0;
    const regex = /((?:^|\n)[-*]\s+\[)([ xX])(\])/g;
    const newContent = content.replace(regex, (match, prefix, state, suffix) => {
      if (matchCount === targetIndex) {
        const newState = state === ' ' ? 'x' : ' ';
        matchCount++;
        return `${prefix}${newState}${suffix}`;
      }
      matchCount++;
      return match;
    });
    handleTextChange(newContent);
  };

  // Helper to get selected text in editor
  const getSelectedText = () => {
    const textarea = editorRef.current;
    if (!textarea) return '';
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  };

  // Local Storage Disaster Backup Draft Key
  const backupKey = useMemo(() => {
    return `vidyalai_notes_backup_${moduleTitle?.replace(/\s+/g, '_') || 'default'}`;
  }, [moduleTitle]);

  // Load local backup if newer or matches conditions
  useEffect(() => {
    const cached = localStorage.getItem(backupKey);
    if (cached && cached !== content && cached.trim() !== '') {
      toast.info("Found unsaved local draft for this module.", {
        duration: 8000,
        action: {
          label: "Restore Draft",
          onClick: () => {
            handleTextChange(cached);
            toast.success("Draft restored!");
          }
        }
      });
    }
  }, [backupKey]);

  // Text changing handler (writing to backend + caching draft locally + auto-save indicators)
  const handleTextChange = (val: string) => {
    setSaveStatus('drafting');
    onChange(val);
    localStorage.setItem(backupKey, val);

    // Play satisfying mechanical or bubble keyboard sound!
    KeyboardSynth.play();

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 1000);
  };

  // Cycle Word Goal targets
  const cycleWordGoal = () => {
    const goals = [0, 100, 250, 500, 1000];
    const nextIndex = (goals.indexOf(wordGoal) + 1) % goals.length;
    const nextGoal = goals[nextIndex];
    setWordGoal(nextGoal);
    localStorage.setItem('vidyalai_notes_word_goal', String(nextGoal));
    toast.info(nextGoal ? `Writing goal set to ${nextGoal} words` : "Writing goal disabled");
  };

  // Parse Markdown outline headings
  const headings = useMemo(() => {
    const list: { level: number; text: string; offset: number }[] = [];
    if (!content) return list;
    const regex = /(?:^|\n)(#{1,3})\s+(.+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      list.push({
        level: match[1].length,
        text: match[2].trim(),
        offset: match.index
      });
    }
    return list;
  }, [content]);

  // Keyboard events handler: tab key, bracket/markdown tag auto-closing & backspace pairing
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    KeyboardSynth.play();
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    const openChars: Record<string, string> = {
      '*': '*',
      '_': '_',
      '`': '`',
      '[': ']',
      '(': ')',
      '{': '}'
    };

    if (e.key === 'Tab') {
      e.preventDefault();

      // If SARA autocomplete ghost suggestion exists, accept it!
      if (ghostSuggestion) {
        const before = value.substring(0, selectionStart);
        const after = value.substring(selectionEnd);
        const updated = before + ghostSuggestion + after;
        handleTextChange(updated);
        const newCursorPos = selectionStart + ghostSuggestion.length;
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        setGhostSuggestion('');
        toast.success("AI suggestion accepted!");
        return;
      }

      try {
        textarea.focus();
        if (!document.execCommand('insertText', false, '  ')) {
          throw new Error('execCommand not supported');
        }
      } catch (err) {
        const start = selectionStart;
        const end = selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        handleTextChange(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
      return;
    }

    if (openChars[e.key] !== undefined) {
      e.preventDefault();
      const openChar = e.key;
      const closeChar = openChars[openChar];
      const selected = value.substring(selectionStart, selectionEnd);
      const wrapped = openChar + selected + closeChar;
      try {
        textarea.focus();
        if (!document.execCommand('insertText', false, wrapped)) {
          throw new Error('execCommand not supported');
        }
        if (selectionStart !== selectionEnd) {
          textarea.setSelectionRange(selectionStart + 1, selectionEnd + 1);
        } else {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
        }
      } catch (err) {
        const newValue = value.substring(0, selectionStart) + wrapped + value.substring(selectionEnd);
        handleTextChange(newValue);
        setTimeout(() => {
          textarea.focus();
          if (selectionStart !== selectionEnd) {
            textarea.setSelectionRange(selectionStart + 1, selectionEnd + 1);
          } else {
            textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
          }
        }, 0);
      }
      return;
    }

    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const prevChar = value[selectionStart - 1];
      const nextChar = value[selectionStart];
      if (openChars[prevChar] === nextChar) {
        e.preventDefault();
        try {
          textarea.focus();
          textarea.setSelectionRange(selectionStart - 1, selectionStart + 1);
          if (!document.execCommand('insertText', false, '')) {
            throw new Error('execCommand not supported');
          }
        } catch (err) {
          const newValue = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
          handleTextChange(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart - 1, selectionStart - 1);
          }, 0);
        }
        return;
      }
    }
  };

  // Inline formatting triggers with selection preservation & multi-line block listing support
  const insertMarkdown = (type: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let insertion = '';
    let selectStart = start;
    let selectEnd = end;

    const lines = selected.split('\n');

    switch (type) {
      case 'bold':
        insertion = `**${selected || 'bold'}**`;
        selectStart = start + 2;
        selectEnd = start + 2 + (selected ? selected.length : 4);
        break;
      case 'italic':
        insertion = `*${selected || 'italic'}*`;
        selectStart = start + 1;
        selectEnd = start + 1 + (selected ? selected.length : 6);
        break;
      case 'code':
        insertion = `\`${selected || 'code'}\``;
        selectStart = start + 1;
        selectEnd = start + 1 + (selected ? selected.length : 4);
        break;
      case 'codeblock':
        insertion = `\n\`\`\`javascript\n${selected || '// code here'}\n\`\`\`\n`;
        selectStart = start + 15;
        selectEnd = start + 15 + (selected ? selected.length : 12);
        break;
      case 'h1':
        insertion = `\n# ${selected || 'Heading 1'}\n`;
        selectStart = start + 3;
        selectEnd = start + 3 + (selected ? selected.length : 9);
        break;
      case 'h2':
        insertion = `\n## ${selected || 'Heading 2'}\n`;
        selectStart = start + 4;
        selectEnd = start + 4 + (selected ? selected.length : 9);
        break;
      case 'h3':
        insertion = `\n### ${selected || 'Heading 3'}\n`;
        selectStart = start + 5;
        selectEnd = start + 5 + (selected ? selected.length : 9);
        break;
      case 'list': {
        if (selected.includes('\n')) {
          const formattedLines = lines.map(line => {
            if (line.trim() === '') return line;
            if (/^\s*[-*+]\s/.test(line)) return line;
            return `- ${line}`;
          });
          insertion = formattedLines.join('\n');
          selectStart = start;
          selectEnd = start + insertion.length;
        } else {
          insertion = `- ${selected || 'List item'}`;
          selectStart = start + 2;
          selectEnd = start + 2 + (selected ? selected.length : 9);
        }
        break;
      }
      case 'todo': {
        if (selected.includes('\n')) {
          const formattedLines = lines.map(line => {
            if (line.trim() === '') return line;
            if (/^\s*[-*+]\s+\[[ xX]\]\s/.test(line)) return line;
            if (/^\s*[-*+]\s/.test(line)) {
              return line.replace(/^\s*[-*+]\s/, '- [ ] ');
            }
            return `- [ ] ${line}`;
          });
          insertion = formattedLines.join('\n');
          selectStart = start;
          selectEnd = start + insertion.length;
        } else {
          insertion = `- [ ] ${selected || 'Task item'}`;
          selectStart = start + 6;
          selectEnd = start + 6 + (selected ? selected.length : 9);
        }
        break;
      }
      case 'quote':
        insertion = `\n> ${selected || 'Blockquote'}\n`;
        selectStart = start + 3;
        selectEnd = start + 3 + (selected ? selected.length : 10);
        break;
      case 'link':
        insertion = `[${selected || 'Link Text'}](https://example.com)`;
        selectStart = start + 1;
        selectEnd = start + 1 + (selected ? selected.length : 9);
        break;
      case 'table':
        insertion = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`;
        selectStart = start + insertion.length;
        selectEnd = start + insertion.length;
        break;
      default:
        break;
    }

    try {
      textarea.focus();
      if (!document.execCommand('insertText', false, insertion)) {
        throw new Error('execCommand not supported');
      }
      textarea.setSelectionRange(selectStart, selectEnd);
    } catch (err) {
      const newValue = text.substring(0, start) + insertion + text.substring(end);
      handleTextChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(selectStart, selectEnd);
      }, 50);
    }
  };

  // Clean conversational chatter and markdown wrappers returned by the AI
  const cleanAIResponse = (text: string): string => {
    if (!text) return '';
    let cleaned = text.trim();

    // 1. Strip leading and trailing markdown code fences
    cleaned = cleaned.replace(/^```(?:markdown)?\n([\s\S]*?)\n```$/i, '$1');
    cleaned = cleaned.replace(/^```(?:markdown)?\n([\s\S]*?)$/i, '$1');
    cleaned = cleaned.replace(/([\s\S]*?)\n```$/i, '$1');
    cleaned = cleaned.trim();

    // 2. Heuristic sentence pruning for typical conversational preambles
    const lines = cleaned.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0].trim();
      const conversationalPatterns = [
        /^here\s+is\b/i,
        /^here\s+are\b/i,
        /^sure\b/i,
        /^certainly\b/i,
        /^i\s+(?:have|ve)\b/i,
        /^as\s+requested\b/i,
        /^below\s+is\b/i,
        /^this\s+is\b/i
      ];
      const isConversational = conversationalPatterns.some(pat => pat.test(firstLine)) && 
                               (firstLine.endsWith(':') || firstLine.endsWith('.') || firstLine.length < 100);
      
      if (isConversational) {
        lines.shift();
        while (lines.length > 0 && lines[0].trim() === '') {
          lines.shift();
        }
        cleaned = lines.join('\n').trim();
      }
    }
    
    return cleaned;
  };

  // SARA AI Notes Copilot Actions with response cleansing
  const runAiAction = async (action: 'summarize' | 'polish' | 'elaborate') => {
    setShowAiDropdown(false);
    
    let prompt = '';
    const selectedText = getSelectedText();

    if (action === 'elaborate') {
      if (!selectedText.trim()) {
        toast.warning("Please highlight/select a word or phrase in the editor first.");
        return;
      }
      prompt = `Read my study notes for the module "${moduleTitle || 'general'}". Explain the following highlighted concept in detail, including clear technical definitions, context, and a short practical example. Format the output in clean markdown starting with a '### 💡 Concept Expansion: ${selectedText}' header. Concept to expand:\n\n${selectedText}`;
    } else if (action === 'summarize') {
      prompt = `Read my study notes below for the module "${moduleTitle || 'general'}". Synthesize a brief summary of key takeaways and actionable bullet points. Format the output in clean markdown under a '# 📋 Summary Takeaways' header. Do not repeat the existing notes. Notes content:\n\n${content}`;
    } else if (action === 'polish') {
      prompt = `You are a professional editor. Read my study notes below for the module "${moduleTitle || 'general'}" and polish them. Standardize markdown headers, clean up list spacing, fix spelling/grammar mistakes, and make formatting neat. Return only the revised markdown text. Do not add any conversational prefixes/suffixes. Notes content:\n\n${content}`;
    }

    setIsAiLoading(true);
    toast.info(`🤖 Asking SARA to ${action} notes...`);

    try {
      const response = await chatWithTutor([], prompt, `Module: ${moduleTitle || 'Study Session'}`, '');
      const cleanedResponse = cleanAIResponse(response);
      
      if (action === 'summarize') {
        handleTextChange(content + "\n\n" + cleanedResponse);
        toast.success("Summary takeaways appended to notes!");
      } else if (action === 'polish') {
        handleTextChange(cleanedResponse);
        toast.success("Notes formatted and polished!");
      } else if (action === 'elaborate') {
        const textarea = editorRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const before = content.substring(0, start);
          const after = content.substring(end);
          const updated = before + "\n\n" + cleanedResponse + "\n\n" + after;
          handleTextChange(updated);
          toast.success("Concept elaboration inserted!");
        } else {
          handleTextChange(content + "\n\n" + cleanedResponse);
          toast.success("Concept elaboration added!");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to run AI assistance. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Search & Replace Handlers
  const handleReplace = () => {
    if (!searchQuery) return;
    const index = content.indexOf(searchQuery);
    if (index !== -1) {
      const updated = content.substring(0, index) + replaceQuery + content.substring(index + searchQuery.length);
      handleTextChange(updated);
      toast.success("First match replaced");
    } else {
      toast.info("No matches found");
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    const matches = content.match(regex)?.length || 0;
    if (matches > 0) {
      const updated = content.replace(regex, replaceQuery);
      handleTextChange(updated);
      toast.success(`Replaced ${matches} occurrences`);
    } else {
      toast.info("No matches found");
    }
  };

  // Exporters
  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `study_notes_${moduleTitle?.replace(/\s+/g, '_') || 'session'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Markdown file downloaded!");
  };

  const copyFormattedHTML = async () => {
    const previewEl = previewRef.current;
    if (!previewEl) {
      toast.warning("Switch to Preview or Split mode to copy formatted HTML.");
      return;
    }
    try {
      const htmlContent = previewEl.innerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([content], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })];
      await navigator.clipboard.write(data);
      toast.success("Formatted notes copied to clipboard!");
    } catch (err) {
      await navigator.clipboard.writeText(content);
      toast.info("Copied raw markdown text to clipboard.");
    }
  };

  // Keyboard shortcut listener (Cmd+F / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorRef.current || document.activeElement !== editorRef.current) return;
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (isMeta && e.key === 's') {
        e.preventDefault();
        downloadMarkdown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, searchQuery, replaceQuery]);

  // Statistics heuristics
  const wordCount = useMemo(() => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const charCount = content ? content.length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Theme styling helpers
  const getThemeClasses = (isPreview: boolean) => {
    switch (editorTheme) {
      case 'sepia':
        return isPreview 
          ? 'bg-[#f5ebd6] text-[#4a3b2c] prose-headings:text-[#382b1e] prose-p:text-[#4a3b2c] font-serif border-[#e8ddc7] selection:bg-[#dfc49c]'
          : 'bg-[#f5ebd6] text-[#4a3b2c] font-serif selection:bg-[#dfc49c] focus:ring-0';
      case 'midnight':
        return isPreview
          ? 'bg-[#0a0c10] text-[#d1d5db] prose-headings:text-white prose-p:text-slate-355 border-white/5 selection:bg-[#312e81]'
          : 'bg-[#0a0c10] text-[#d1d5db] font-mono selection:bg-[#312e81] focus:ring-0';
      case 'cyberpunk':
        return isPreview
          ? 'bg-[#02050b] text-[#39ff14] prose-headings:text-[#ff007f] prose-p:text-[#39ff14] font-mono border-[#ff007f]/20 selection:bg-[#ff007f]/30'
          : 'bg-[#02050b] text-[#39ff14] font-mono selection:bg-[#ff007f]/30 caret-[#ff007f] focus:ring-0';
      default: // paper
        return isPreview
          ? isZenMode ? 'prose-invert bg-transparent text-slate-300' : 'bg-white/40 text-slate-800 border-slate-200/50'
          : isZenMode ? 'bg-transparent text-slate-300' : 'bg-white/40 text-slate-800';
    }
  };

  let checkboxIndex = 0;
  const renderMarkdown = () => {
    checkboxIndex = 0;

    // Replace WikiLinks [[Concept Name]] -> [🔗 Concept Name](smartboard-jump://Concept%20Name)
    const contentWithWikiLinks = (content || '').replace(/\[\[(.*?)\]\]/g, (match, term) => {
      return `[🔗 ${term}](smartboard-jump://${encodeURIComponent(term)})`;
    });

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            if (href.startsWith('smartboard-jump://')) {
              const term = decodeURIComponent(href.replace('smartboard-jump://', ''));
              return (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('smartboard-jump', { detail: { concept: term } }));
                  }}
                  className="cursor-pointer inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-[#4e5bff] hover:text-indigo-400 bg-[#4e5bff]/10 border border-[#4e5bff]/15 px-1.5 py-0.5 rounded-lg transition-all select-none hover:scale-[1.02] active:scale-[0.98] mr-0.5"
                >
                  {props.children}
                </span>
              );
            }
            return <a {...props} className="text-[#4e5bff] hover:underline" target="_blank" rel="noopener noreferrer" />;
          },
          p: ({ node, children, ...props }) => {
            const textContent = React.Children.toArray(children)
              .map(c => typeof c === 'string' ? c : '')
              .join('');
            if (textContent.startsWith('? ') && textContent.includes('||')) {
              const parts = textContent.slice(2).split('||');
              const front = parts[0].trim();
              const back = parts.slice(1).join('||').trim();
              return <FlippingRecallCard front={front} back={back} />;
            }
            return <p {...props}>{children}</p>;
          },
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              const currentIndex = checkboxIndex++;
              return (
                <input
                  type="checkbox"
                  checked={props.checked}
                  className="cursor-pointer rounded border-slate-350 dark:border-white/15 text-[#4e5bff] mr-1.5 accent-[#4e5bff] w-3.5 h-3.5"
                  onChange={() => handleToggleCheckbox(currentIndex)}
                />
              );
            }
            return <input {...props} />;
          }
        }}
      >
        {contentWithWikiLinks || '*No notes yet...*'}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-transparent' : 'bg-white/40 backdrop-blur-[8px]'}`}>
      
      {/* Upper Navigation Row */}
      <div className={`flex items-center justify-between gap-1.5 border-b px-3 py-2 shrink-0 ${isZenMode ? 'border-white/5 bg-white/5' : 'border-slate-200/50 bg-slate-50/30'}`}>
        <div className="flex items-center gap-2">
           <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Knowledge Base</span>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg border border-slate-200/30 dark:border-white/5 bg-white/10">
          {(['edit', 'preview', 'split'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === mode
                  ? (isZenMode ? 'bg-[#4e5bff]/25 text-[#4e5bff]' : 'bg-[#4e5bff]/10 text-[#4e5bff]')
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Formatting, customizers & SARA AI Toolbar */}
      {viewMode !== 'preview' && (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b shrink-0 ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200/40 bg-slate-50/50'}`}>
          {/* Formatting operations */}
          <div className="flex items-center gap-1">
            <button onClick={() => insertMarkdown('bold')} title="Bold" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Bold size={11} />
            </button>
            <button onClick={() => insertMarkdown('italic')} title="Italic" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Italic size={11} />
            </button>
            <button onClick={() => insertMarkdown('code')} title="Code Inline" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Code size={11} />
            </button>
            <button onClick={() => insertMarkdown('codeblock')} title="Code Block" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Terminal size={11} />
            </button>

            <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-1" />

            <button onClick={() => insertMarkdown('h1')} title="Heading 1" className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-[9px] font-bold text-slate-400 hover:text-[#4e5bff] transition-all">
              H1
            </button>
            <button onClick={() => insertMarkdown('h2')} title="Heading 2" className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-[9px] font-bold text-slate-400 hover:text-[#4e5bff] transition-all">
              H2
            </button>
            <button onClick={() => insertMarkdown('h3')} title="Heading 3" className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-[9px] font-bold text-slate-400 hover:text-[#4e5bff] transition-all">
              H3
            </button>

            <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-1" />

            <button onClick={() => insertMarkdown('list')} title="Bullet List" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <ListIcon size={11} />
            </button>
            <button onClick={() => insertMarkdown('todo')} title="Task Checklist" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <CheckSquare size={11} />
            </button>
            <button onClick={() => insertMarkdown('quote')} title="Quote block" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Quote size={11} />
            </button>
            <button onClick={() => insertMarkdown('link')} title="Insert link" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <LinkIcon size={11} />
            </button>
            <button onClick={() => insertMarkdown('table')} title="Insert Table" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-400 hover:text-[#4e5bff] transition-all">
              <Table size={11} />
            </button>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5">
            {/* Outline Toggler */}
            <button
              onClick={() => setShowOutline(prev => !prev)}
              title="Toggle Notes Outline"
              className={`p-1 rounded transition-all cursor-pointer ${
                showOutline
                  ? 'bg-indigo-500/10 text-[#4e5bff] border border-[#4e5bff]/25'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Layout size={11} />
            </button>

            {/* Search Toggler */}
            <button
              onClick={() => setShowSearch(prev => !prev)}
              title="Search and Replace (⌘F)"
              className={`p-1 rounded transition-all cursor-pointer ${
                showSearch
                  ? 'bg-indigo-500/10 text-[#4e5bff] border border-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Search size={11} />
            </button>

            {/* Font Zoom */}
            <div className="flex items-center gap-0.5 border border-slate-200/50 dark:border-white/5 rounded-lg px-1 py-0.5 bg-white/10 dark:bg-white/[0.02]">
              <button
                onClick={() => {
                  const val = Math.max(10, editorFontSize - 1);
                  setEditorFontSize(val);
                  localStorage.setItem('vidyalai_notes_font_size', String(val));
                }}
                title="Decrease Font Size"
                className="px-1 text-[9px] font-bold text-slate-400 hover:text-[#4e5bff] cursor-pointer"
              >
                A-
              </button>
              <span className="text-[7.5px] font-bold font-mono px-1 border-x border-slate-200/30 dark:border-white/5 text-slate-400">
                {editorFontSize}px
              </span>
              <button
                onClick={() => {
                  const val = Math.min(20, editorFontSize + 1);
                  setEditorFontSize(val);
                  localStorage.setItem('vidyalai_notes_font_size', String(val));
                }}
                title="Increase Font Size"
                className="px-1 text-[9px] font-bold text-slate-400 hover:text-[#4e5bff] cursor-pointer"
              >
                A+
              </button>
            </div>

            {/* Writing Theme Select */}
            <select
              value={editorTheme}
              onChange={e => setEditorTheme(e.target.value as any)}
              className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5 bg-white/10 dark:bg-[#0c0e14] focus:outline-none cursor-pointer text-slate-400"
            >
              <option value="paper">📄 Paper</option>
              <option value="sepia">⏳ Sepia</option>
              <option value="midnight">🌙 Midnight</option>
              <option value="cyberpunk">🔋 Neon</option>
            </select>

            {/* Typing Sound Select */}
            <select
              value={typingSound}
              onChange={e => setTypingSound(e.target.value as any)}
              className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5 bg-white/10 dark:bg-[#0c0e14] focus:outline-none cursor-pointer text-slate-400"
              title="Select Typing Feedback Sound"
            >
              <option value="mute">🔇 Muted</option>
              <option value="click">⌨️ Click</option>
              <option value="bubble">🫧 Bubble</option>
            </select>

            {/* Copilot Toggle */}
            <button
              onClick={() => {
                const next = !copilotEnabled;
                setCopilotEnabled(next);
                localStorage.setItem('vidyalai_notes_copilot_enabled', String(next));
                toast.info(next ? "SARA Copilot Enabled" : "SARA Copilot Disabled");
              }}
              title="Toggle AI Autocomplete Copilot"
              className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                copilotEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-white/10 border-slate-200/30 text-slate-400 hover:text-slate-650'
              }`}
            >
              <Zap size={9.5} />
              <span>Copilot</span>
            </button>

            <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

            {/* SARA AI Note Assistant drop trigger */}
            <div className="relative">
              <button
                ref={aiButtonRef}
                onClick={() => setShowAiDropdown(prev => !prev)}
                disabled={isAiLoading}
                className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#4e5bff] to-[#8b5cf6] text-white text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
              >
                <Sparkles size={8.5} className="animate-pulse" /> SARA AI
              </button>
              
              {showAiDropdown && (
                <div className="absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-1 p-2 w-44 rounded-xl border backdrop-blur-xl shadow-2xl bg-white dark:bg-[#0c0e14] border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => runAiAction('summarize')}
                    className="w-full text-left px-2 py-1.5 text-[8.5px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-355 cursor-pointer flex items-center gap-1.5"
                  >
                    📋 Summarize Notes
                  </button>
                  <button
                    onClick={() => runAiAction('polish')}
                    className="w-full text-left px-2 py-1.5 text-[8.5px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-355 cursor-pointer flex items-center gap-1.5"
                  >
                    ✨ Polish Formatting
                  </button>
                  <button
                    onClick={() => runAiAction('elaborate')}
                    className="w-full text-left px-2 py-1.5 text-[8.5px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-355 cursor-pointer flex items-center gap-1.5"
                  >
                    💡 Elaborate Highlight
                  </button>
                </div>
              )}
            </div>

            {/* Document Download & Clipboard Exporters */}
            <div className="flex border border-slate-200/50 dark:border-white/5 rounded-lg overflow-hidden bg-white/10 dark:bg-white/[0.02]">
              <button
                onClick={copyFormattedHTML}
                title="Copy formatted notes (HTML) to Clipboard"
                className="p-1 text-slate-400 hover:text-[#4e5bff] cursor-pointer border-r border-slate-200/30 dark:border-white/5"
              >
                <Copy size={9.5} />
              </button>
              <button
                onClick={downloadMarkdown}
                title="Download notes as markdown file (.md)"
                className="p-1 text-slate-400 hover:text-[#4e5bff] cursor-pointer"
              >
                <File size={9.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Replace overlay panel */}
      {showSearch && (
        <div className={`flex items-center gap-2 px-3.5 py-1.5 border-b text-[8.5px] shrink-0 ${isZenMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200/30 bg-slate-50/30'}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-455">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Find text..."
              className="px-2 py-0.5 rounded border border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-[#0c0e14] text-[8.5px] outline-none w-28 focus:border-indigo-500/50 text-slate-700 dark:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-455">Replace:</span>
            <input
              type="text"
              value={replaceQuery}
              onChange={e => setReplaceQuery(e.target.value)}
              placeholder="Replace with..."
              className="px-2 py-0.5 rounded border border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-[#0c0e14] text-[8.5px] outline-none w-28 focus:border-indigo-500/50 text-slate-700 dark:text-slate-300"
            />
          </div>
          <button
            onClick={handleReplace}
            className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-[#4e5bff]/10 text-[#4e5bff] hover:bg-indigo-100 dark:hover:bg-[#4e5bff]/20 transition-all font-bold cursor-pointer border border-[#4e5bff]/15"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-[#4e5bff]/10 text-[#4e5bff] hover:bg-indigo-100 dark:hover:bg-[#4e5bff]/20 transition-all font-bold cursor-pointer border border-[#4e5bff]/15"
          >
            Replace All
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(''); setReplaceQuery(''); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 font-bold"
          >
            Close
          </button>
        </div>
      )}

      {/* Editor & Preview Pane Viewport */}
      <div className="flex-1 min-h-0 relative flex">
        {showOutline && viewMode !== 'preview' && (
          <div className="w-[155px] shrink-0 border-r border-slate-200/30 dark:border-white/5 overflow-y-auto p-3 flex flex-col gap-3.5 bg-slate-50/10 dark:bg-white/[0.005] custom-scrollbar">
            
            {/* Outline section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[7.5px] font-black uppercase tracking-widest text-[#4e5bff] mb-1">Document Outline</span>
              {headings.length === 0 ? (
                <span className="text-[8px] text-slate-400 italic">No headings found.</span>
              ) : (
                headings.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const textarea = editorRef.current;
                      if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(h.offset, h.offset);
                      }
                    }}
                    className={`text-left text-[8.5px] font-bold truncate hover:text-[#4e5bff] dark:hover:text-white transition-all cursor-pointer ${
                      h.level === 1 ? 'pl-0 text-slate-750 dark:text-slate-200 font-extrabold' :
                      h.level === 2 ? 'pl-1.5 text-slate-550 dark:text-slate-400' : 'pl-3 text-slate-405'
                    }`}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))
              )}
            </div>

            <div className="h-px bg-slate-200 dark:bg-white/10 w-full" />

            {/* Syllabus coverage section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-emerald-500 font-black">Syllabus Check</span>
                <span className="text-[7px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1 rounded">
                  {conceptCoverage.filter(c => c.isCovered).length}/{conceptCoverage.length}
                </span>
              </div>
              
              {conceptCoverage.length === 0 ? (
                <span className="text-[8px] text-slate-400 italic">No syllabus concepts.</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {conceptCoverage.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => insertConceptTemplate(c.concept)}
                      title={`Click to insert template for "${c.concept}"`}
                      className={`text-left text-[8px] font-bold py-0.5 rounded transition-all cursor-pointer flex items-center justify-between group ${
                        c.isCovered 
                          ? 'text-emerald-500 hover:text-emerald-600' 
                          : 'text-slate-405 hover:text-[#4e5bff]'
                      }`}
                    >
                      <span className="truncate pr-1 font-sans font-bold">{c.concept}</span>
                      <span className="text-[7.5px] font-mono shrink-0">
                        {c.isCovered ? '✓' : '+'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <div className="flex-1 min-h-0 relative">
          
          {/* SARA Notes AI Loading Overlay */}
          {isAiLoading && (
            <div className="absolute inset-0 z-40 bg-[#0c0e14]/40 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <Loader className="animate-spin text-[#4e5bff] mb-3" size={24} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#4e5bff]">SARA Notes Engine Active</h4>
              <p className="text-[9px] font-medium text-slate-400 mt-1 max-w-[180px] leading-relaxed">Gemini is analyzing note structures and processing your request...</p>
            </div>
          )}

          {viewMode === 'edit' && (
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              style={{ fontSize: `${editorFontSize}px` }}
              placeholder="Write your notes in Markdown..."
              className={`absolute inset-0 w-full h-full resize-none p-6 leading-relaxed focus:outline-none custom-scrollbar border-none ${getThemeClasses(false)}`}
            />
          )}

          {viewMode === 'preview' && (
            <div 
              ref={previewRef}
              className={`absolute inset-0 overflow-y-auto p-6 prose prose-sm max-w-none custom-scrollbar ${getThemeClasses(true)}`}
            >
              {renderMarkdown()}
            </div>
          )}

          {viewMode === 'split' && (
            <div className="absolute inset-0 flex divide-x divide-slate-200/50 dark:divide-white/5">
              <textarea
                ref={editorRef}
                onScroll={handleEditorScroll}
                value={content}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                style={{ fontSize: `${editorFontSize}px` }}
                placeholder="Write your notes in Markdown..."
                className={`w-1/2 h-full resize-none p-5 leading-relaxed focus:outline-none custom-scrollbar border-none ${getThemeClasses(false)}`}
              />
              <div
                ref={previewRef}
                onScroll={handlePreviewScroll}
                className={`w-1/2 h-full overflow-y-auto p-5 prose prose-sm max-w-none custom-scrollbar ${getThemeClasses(true)}`}
              >
                {renderMarkdown()}
              </div>
            </div>
          )}

          {/* SARA Ghost Autocomplete suggestion banner */}
          {ghostSuggestion && (
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl shadow-lg bg-indigo-950/90 border-indigo-500/30 text-indigo-200 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono text-[9px]">
              <Sparkles size={10} className="text-[#39ff14] animate-pulse" />
              <span>💡 Press <kbd className="px-1 py-0.5 rounded bg-white/20 text-white font-extrabold text-[8px] mx-0.5">Tab</kbd> to insert:</span>
              <span className="text-white font-bold ml-1">"{ghostSuggestion}"</span>
            </div>
          )}
          
          {isCopilotLoading && (
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl bg-white/10 border-white/10 text-slate-400 font-mono text-[9px]">
              <Loader className="animate-spin text-slate-400" size={10} />
              <span>SARA Thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats metadata footer */}
      <div className={`flex items-center justify-between px-3.5 py-1.5 border-t text-[8px] font-mono font-bold tracking-wider shrink-0 ${isZenMode ? 'border-white/5 text-slate-500 bg-white/[0.01]' : 'border-slate-200/50 text-slate-400 bg-slate-50/20'}`}>
        <div className="flex gap-2 items-center flex-wrap">
          <span>{charCount} chars</span>
          <span>·</span>
          <button 
            onClick={cycleWordGoal}
            title="Click to set word target goal"
            className="hover:text-[#4e5bff] transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{wordCount} words</span>
            {wordGoal > 0 && (
              <span className={`text-[7.5px] px-1 rounded ${wordCount >= wordGoal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-[#4e5bff]'}`}>
                {Math.round((wordCount / wordGoal) * 100)}% of {wordGoal}w
              </span>
            )}
          </button>

          {wordGoal > 0 && (
            <div className="relative w-3 h-3 flex items-center justify-center shrink-0 ml-0.5">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" stroke="rgba(78,91,255,0.08)" strokeWidth="2.5" fill="transparent" />
                <circle cx="10" cy="10" r="8" stroke={wordCount >= wordGoal ? '#10b981' : '#4e5bff'} strokeWidth="2.5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 8}
                  strokeDashoffset={2 * Math.PI * 8 - (Math.min(1, wordCount / wordGoal)) * 2 * Math.PI * 8}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          <span>·</span>
          <span>{readingTime} min read</span>
        </div>

        {/* Real-time saving status badge */}
        <div className="flex items-center gap-1.5">
          {!isOnline ? (
            <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
              <span>⚠️</span>
              <span>Offline Backup</span>
            </span>
          ) : saveStatus === 'drafting' ? (
            <span className="flex items-center gap-1 text-[#4e5bff] bg-[#4e5bff]/10 px-2 py-0.5 rounded-full border border-[#4e5bff]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-pulse" />
              <span>Drafting</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span>✓</span>
              <span>Saved to Atlas</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SARAArchitecturePanel: React.FC<{
  isZenMode: boolean;
  module: any;
}> = ({ isZenMode, module }) => {
  const [diagram, setDiagram] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagramType, setDiagramType] = useState<string>('flowchart TD');
  const [error, setError] = useState<string | null>(null);

  const fetchDiagram = async (type = diagramType) => {
    if (!module) return;
    setIsLoading(true);
    setError(null);
    try {
      const code = await generateMermaidDiagram(module.title, module.keyConcepts || [], type);
      setDiagram(code);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to generate architecture diagram.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagram();
  }, [module?.id, diagramType]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`p-4 border-b flex items-center justify-between gap-2 shrink-0 ${isZenMode ? 'border-white/5 bg-white/5' : 'border-slate-200/50 bg-slate-50/30'}`}>
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Architecture Visualizer</span>
          <span className="text-[9px] text-slate-405 mt-0.5">Interactive Spatial Map</span>
        </div>
        <select
          value={diagramType}
          onChange={(e) => setDiagramType(e.target.value)}
          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border focus:outline-none transition-all ${
            isZenMode
              ? 'bg-[#090a0f] border-white/10 text-slate-300 focus:border-indigo-500/50'
              : 'bg-white border-slate-200 text-slate-700 focus:border-[#4e5bff]'
          }`}
        >
          <option value="flowchart TD">Flowchart (Top-Down)</option>
          <option value="flowchart LR">Flowchart (Left-Right)</option>
          <option value="sequenceDiagram">Sequence Diagram</option>
          <option value="stateDiagram-v2">State Diagram</option>
        </select>
      </div>

      <div className="flex-1 relative min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-transparent">
            <Loader className="animate-spin text-[#4e5bff] mb-3" size={24} />
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Compiling Spatial Model</h4>
            <p className="text-[9px] font-medium text-slate-405 mt-1 max-w-[200px] leading-relaxed">Gemini is synthesizing custom Mermaid.js architecture chart...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-transparent">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-500">
              ⚡
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Compilation Failed</h4>
            <p className="text-[9px] font-medium text-slate-405 mt-1 mb-6 max-w-[200px] leading-relaxed">{error}</p>
            <button
              onClick={() => fetchDiagram()}
              className="px-4 py-2 bg-[#4e5bff] hover:scale-105 transition-all text-white text-[9px] font-black uppercase tracking-wider rounded-lg"
            >
              Retry Compilation
            </button>
          </div>
        ) : diagram ? (
          <MermaidDiagram chart={diagram} isZenMode={isZenMode} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-transparent">
            <p className="text-[10px] font-medium text-slate-400">No architecture chart compiled yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromClassroom = searchParams.get('entry') === 'classroom';
  const { paths, isCloudSynced, updateModuleStatus, saveModuleNotes, saveModuleContent, saveModuleCitations, replaceModuleResources } = useAppStore();
  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);
  const citations = module?.citations || [];

  const isModuleLocked = (m: any) => {
    if (!path) return false;
    if (!m.dependsOnModuleIds || m.dependsOnModuleIds.length === 0) return false;
    const completedModuleIds = new Set(
      path.phases.flatMap(p => p.modules).filter(mod => mod.isCompleted).map(mod => mod.id)
    );
    return m.dependsOnModuleIds.some((id: string) => !completedModuleIds.has(id));
  };

  const getRequiredModuleTitles = (m: any) => {
    if (!path || !m.dependsOnModuleIds) return [];
    const completedModuleIds = new Set(
      path.phases.flatMap(p => p.modules).filter(mod => mod.isCompleted).map(mod => mod.id)
    );
    const uncompletedRequiredIds = m.dependsOnModuleIds.filter((id: string) => !completedModuleIds.has(id));
    const allModules = path.phases.flatMap(p => p.modules);
    return uncompletedRequiredIds.map((id: string) => {
      const found = allModules.find(mod => mod.id === id);
      return found ? found.title : 'Required Module';
    });
  };
  
  const { isZenMode, setIsZenMode } = useFocus();
  const { isSidebarGhost, scrollProgress } = useFocusSession(isZenMode);

  const getTabIcon = (tab: string) => {
    if (tab === 'chat') return <Sparkles size={11} className="shrink-0" />;
    if (tab === 'quiz') return <Zap size={11} className="shrink-0" />;
    if (tab === 'notes') return <PenLine size={11} className="shrink-0" />;
    if (tab === 'vault') return <ShieldCheck size={11} className="shrink-0" />;
    return <GitBranch size={11} className="shrink-0" />;
  };

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz' | 'vault' | 'architecture'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  // Premium TTS available voices state preloader
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load and cache premium speech synthesis voices asynchronously
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Speech Recognition / Voice Input States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Cortex Code Sandbox States
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [sandboxLanguage, setSandboxLanguage] = useState<string>('javascript');

  // Soundscape Focus Beats States
  const [soundscapeState, setSoundscapeState] = useState(() => {
    const savedVol = localStorage.getItem('vidyalai_soundscape_volume');
    return {
      binaural: false,
      rain: false,
      synth: false,
      volume: savedVol ? parseFloat(savedVol) : 0.5
    };
  });

  const [hoveredNode, setHoveredNode] = useState<{ title: string; x: number; y: number } | null>(null);
  
  // Custom prerequisites outline hover state
  const [hoveredLockedModule, setHoveredLockedModule] = useState<{
    id: string;
    title: string;
    prerequisites: string[];
    x: number;
    y: number;
  } | null>(null);

  // Optimistic completion ripple burst state
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);

  // Premium TTS Voice Reader Engine
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [activeParagraphText, setActiveParagraphText] = useState<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const paragraphsToReadRef = useRef<string[]>([]);
  const currentParagraphIndexRef = useRef<number>(0);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setAudioState('idle');
    setActiveParagraphText(null);
    currentParagraphIndexRef.current = 0;
  };

  const speakParagraph = (index: number) => {
    if (index >= paragraphsToReadRef.current.length) {
      stopSpeaking();
      toast.success("🏁 Read aloud completed.");
      return;
    }

    currentParagraphIndexRef.current = index;
    const text = paragraphsToReadRef.current[index];
    setActiveParagraphText(text);
    setAudioState('playing');

    const utterance = new SpeechSynthesisUtterance(text);
    // Find premium natural voice from cached state, falling back to on-the-fly search if cache is empty
    const premiumVoice = availableVoices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Samantha') ||
      v.lang.startsWith('en')
    ) || window.speechSynthesis.getVoices().find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Samantha') ||
      v.lang.startsWith('en')
    );
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }
    
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      speakParagraph(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error("Speech Synthesis Error:", e);
        stopSpeaking();
      }
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleListen = () => {
    if (audioState === 'playing') {
      window.speechSynthesis.pause();
      setAudioState('paused');
      return;
    }
    
    if (audioState === 'paused') {
      window.speechSynthesis.resume();
      setAudioState('playing');
      return;
    }

    if (!generatedContent) return;

    // Clean markdown and split into readable paragraphs
    const cleaned = generatedContent
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/#+\s+/g, '') // Remove headings
      .replace(/>\s+/g, '') // Remove blockquotes
      .replace(/\*+/g, '') // Remove bold/italic markers
      .replace(/\[\d+(?:,\s*\d+)*\]/g, ''); // Remove citations

    const paragraphs = cleaned
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 10 && !p.startsWith('-') && !p.startsWith('*'));

    if (paragraphs.length === 0) {
      toast.error("No readable text content found.");
      return;
    }

    paragraphsToReadRef.current = paragraphs;
    speakParagraph(0);
  };

  // Clean up speech synthesis & speech recognition on unmount or module change
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setAudioState('idle');
      setActiveParagraphText(null);
      paragraphsToReadRef.current = [];
      currentParagraphIndexRef.current = 0;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    };
  }, [moduleId]);

  // Breathing Warmup States
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold_in' | 'exhale' | 'hold_out'>('inhale');
  const [breathingCycle, setBreathingCycle] = useState(0);

  const isAudioActive = soundscapeState.binaural || soundscapeState.rain || soundscapeState.synth;

  useEffect(() => {
    if (isZenMode) {
      setBreathingActive(true);
      setBreathingPhase('inhale');
      setBreathingCycle(0);
      soundscape.playBreathingHum('inhale');
    } else {
      setBreathingActive(false);
      soundscape.playBreathingHum('stop');
    }
  }, [isZenMode]);

  useEffect(() => {
    if (!breathingActive || !isZenMode) return;

    const timer = setInterval(() => {
      setBreathingPhase(prev => {
        if (prev === 'inhale') {
          soundscape.playBreathingHum('hold_in');
          return 'hold_in';
        }
        if (prev === 'hold_in') {
          soundscape.playBreathingHum('exhale');
          return 'exhale';
        }
        if (prev === 'exhale') {
          soundscape.playBreathingHum('hold_out');
          return 'hold_out';
        }
        // hold_out completed, check cycle count!
        setBreathingCycle(c => {
          const nextCycle = c + 1;
          if (nextCycle >= 3) {
            setBreathingActive(false);
            soundscape.playBreathingHum('stop');
            toast.success("🧠 Brain calibrated! Session unlocked.");
          }
          return nextCycle;
        });
        soundscape.playBreathingHum('inhale');
        return 'inhale';
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [breathingActive, isZenMode]);

  const toggleTrack = (track: 'binaural' | 'rain' | 'synth') => {
    const nextVal = !soundscapeState[track];
    setSoundscapeState(prev => ({ ...prev, [track]: nextVal }));
    soundscape.setVolume(soundscapeState.volume); // Force match preference volume before triggering track
    if (track === 'binaural') soundscape.toggleBinaural(nextVal);
    else if (track === 'rain') soundscape.toggleRain(nextVal);
    else if (track === 'synth') soundscape.toggleSynth(nextVal);
  };

  const handleVolumeChange = (vol: number) => {
    setSoundscapeState(prev => ({ ...prev, volume: vol }));
    soundscape.setVolume(vol);
    localStorage.setItem('vidyalai_soundscape_volume', vol.toString());
  };

  useEffect(() => {
    soundscape.stopAll();
    setSoundscapeState(prev => ({
      ...prev,
      binaural: false,
      rain: false,
      synth: false
    }));
    return () => {
      soundscape.stopAll();
    };
  }, [moduleId]);

  useEffect(() => {
    if (!isZenMode) {
      soundscape.stopAll();
      setSoundscapeState(prev => ({
        ...prev,
        binaural: false,
        rain: false,
        synth: false
      }));
    }
  }, [isZenMode]);

  const constellationNodes = useMemo(() => {
    if (!phase?.modules) return [];
    const mods = phase.modules;
    const N = mods.length;
    const W = 200; // total width
    return mods.map((m, idx) => {
      const x = N > 1 ? 16 + ((W - 32) / (N - 1)) * idx : W / 2;
      const y = 14 + Math.sin(idx * 2) * 5; // slight wave pattern
      const isActive = m.id === moduleId;
      const isCompleted = m.isCompleted;
      return {
        id: m.id,
        title: m.title,
        x,
        y,
        isActive,
        isCompleted,
        m
      };
    });
  }, [phase?.modules, moduleId]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false); // kept for legacy terminal flow
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer' | 'challenge'>('smartboard');
  const [workspaceMode, setWorkspaceMode] = useState<'notes' | 'canvas' | 'split'>(() => {
    try {
      const saved = localStorage.getItem('vidyal_workspace_viewmode');
      if (saved === 'notes' || saved === 'canvas' || saved === 'split') {
        return saved;
      }
    } catch (_) {}
    return 'notes';
  });

  const handleSetWorkspaceMode = (mode: 'notes' | 'canvas' | 'split') => {
    setWorkspaceMode(mode);
    try {
      localStorage.setItem('vidyal_workspace_viewmode', mode);
    } catch (_) {}
  };

  const [showWhiteboardDropdown, setShowWhiteboardDropdown] = useState(false);
  const [showNeuralDropdown, setShowNeuralDropdown] = useState(false);
  const autoSelectedModuleRef = useRef<string | null>(null);
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

  // Dynamic automatic mode selection based on resource availability (guaranteed to run exactly once per module load)
  useEffect(() => {
    if (!module?.id) return;
    if (!isContentLoading && !isScouting && autoSelectedModuleRef.current !== module.id) {
      if (!hasVideos) {
        setLeftPanelMode('content');
      } else {
        setLeftPanelMode('smartboard');
      }
      autoSelectedModuleRef.current = module.id;
    }
  }, [hasVideos, isContentLoading, isScouting, module?.id]);

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
    } catch (e: any) {
      const msg = e?.message || "Please check your network or try again.";
      toast.error(`Failed to generate quiz automatically: ${msg}. Start in the quiz panel to retry.`);
    } finally {
      setIsTyping(false);
    }
  };

  const triggerCheckpointQuizRef = useRef(triggerCheckpointQuiz);
  useEffect(() => {
    triggerCheckpointQuizRef.current = triggerCheckpointQuiz;
  });

  // Timer Tick
  useEffect(() => {
    if (!isTimerRunning || isContentLoading || !module) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerCheckpointQuizRef.current();
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
        <div className={`my-3 overflow-x-auto rounded-[16px] border shadow-sm ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200/50 bg-slate-50/50'}`}>
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
        <tbody className={`divide-y ${isZenMode ? 'divide-white/5' : 'divide-slate-200/50'}`}>
          {children}
        </tbody>
      ),
      tr: ({ children }: any) => (
        <tr className={`transition-colors ${isZenMode ? 'hover:bg-white/5' : 'hover:bg-slate-100/30'}`}>
          {children}
        </tr>
      ),
      th: ({ children }: any) => (
        <th className={`p-2.5 font-bold border-b ${isZenMode ? 'border-white/5' : 'border-slate-200/50'}`}>
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className={`p-2.5 border-b ${isZenMode ? 'border-white/5' : 'border-slate-200/50'} font-medium`}>
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
        <strong className={`font-extrabold ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          {children}
        </strong>
      ),
      h1: ({ children }: any) => (
        <h1 className={`text-[15px] font-black mt-4 mb-2 tracking-tight uppercase tracking-wide ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className={`text-[13px] font-black mt-3 mb-2 tracking-tight uppercase tracking-wide ${isZenMode ? 'text-indigo-300' : 'text-[#4e5bff]'}`}>
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className={`text-[12px] font-bold mt-2 mb-1 tracking-tight ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {children}
        </h3>
      ),
      pre: ({ children }: any) => <>{children}</>,
      code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : 'text';
        const codeString = String(children).replace(/\n$/, '');
        const isBlockCode = !inline && (codeString.includes('\n') || className);
        
        if (isBlockCode) {
          return (
            <div className="relative my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f] shadow-lg group/code animate-in fade-in duration-200">
              {/* Header with Language and Inject Button */}
              <div className="flex justify-between items-center px-3.5 py-1.5 border-b border-white/5 bg-white/[0.02]">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">{language}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('vidyal_inject_code', { 
                        detail: { code: codeString, language } 
                      }));
                    }}
                    className="p-1 rounded bg-indigo-600/20 hover:bg-[#4e5bff]/30 text-indigo-400 hover:text-white transition-all cursor-pointer border border-[#4e5bff]/25 flex items-center justify-center shadow-sm bg-transparent"
                    title="Inject Code into Playground"
                  >
                    <Zap size={11} className="text-[#38bdf8] animate-pulse" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codeString);
                      toast.success("Copied to clipboard");
                    }}
                    className="text-slate-500 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                    title="Copy code"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
              <pre className="p-3.5 m-0 overflow-x-auto font-mono text-[11px] leading-relaxed text-indigo-300/90 bg-transparent" style={{ whiteSpace: 'pre', overflowX: 'auto' }}>
                <code>{codeString}</code>
              </pre>
            </div>
          );
        }
        
        return (
          <code className={`px-1.5 py-0.5 rounded text-[11px] font-mono border ${isZenMode ? 'bg-white/5 text-indigo-300 border-white/5' : 'bg-slate-100 text-indigo-700 border-slate-200/60'}`} {...props}>
            {children}
          </code>
        );
      },
      blockquote: ({ children }: any) => (
        <blockquote className={`border-l-2 border-indigo-500 pl-3 my-3 italic text-[11px] leading-relaxed ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {children}
        </blockquote>
      )
    };
  }, [isZenMode]);

  // Auto-populate vault from citations
  useEffect(() => {
    if (module?.resources) {
      const resourceItems = module.resources.map((r, idx) => ({
        id: `res-${r.videoId || 'ref'}-${Date.now()}-${idx}`,
        title: r.title || 'Curated Module Resource',
        content: 'Verified scholarly video resource pulled for this module.',
        source: r.videoId ? `https://www.youtube.com/watch?v=${r.videoId}` : r.content,
        type: 'citation',
        timestamp: Date.now()
      }));
      setVaultItems(prev => {
        const existingUrls = new Set(prev.map(i => i.source));
        const newItems = resourceItems.filter(i => !existingUrls.has(i.source));
        return [...prev, ...newItems];
      });
    }
  }, [module?.resources]);

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
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      const el = chatScrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom || chatHistory.length <= 1) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (chatInputRef.current) {
      if (!inputMessage) {
        chatInputRef.current.style.height = '48px';
      } else {
        chatInputRef.current.style.height = '48px';
        const newHeight = Math.min(chatInputRef.current.scrollHeight, 120);
        chatInputRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [inputMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
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
    console.time(`[Cortex] Total load: ${module.title}`);
    try {
      // ── STEP 1: Scout resources FIRST so content generation uses real sources ──
      let resources = module.resources || [];
      if (resources.length === 0) {
        console.log(`[SARA] Pre-scouting resources before content generation for: "${module.title}"`);
        resources = await scoutResourcesCached(module.title || '', path?.goal || 'General Mastery');
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

      console.timeEnd(`[Cortex] Total load: ${module.title}`);

      // ── STEP 3: Map timeline NON-BLOCKING (resources already scouted, skip re-check) ──
      scoutAndMap(content, false, resources, true);
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

  const scoutAndMap = async (content: string, force = false, preloadedResources?: Resource[], freshScouted = false) => {
    if (!module || !path) return;
    setIsScouting(true);
    try {
      // 1. Get Milestones and Curated Video from Backend (non-blocking)
      const { api } = await import('../services/api');
      api.curateVideo(content).then(curation => {
        if (curation?.milestones) setMilestones(curation.milestones);
        if (curation?.videoId) setCuratedVideoId(curation.videoId);
      }).catch(() => {});

      let currentResources = preloadedResources || module.resources || [];

      // Skip bad-resource check if resources were freshly scouted (they're already verified)
      if (!freshScouted) {
        // Logic-based bad resource detection:
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
      }

      if (currentResources.length === 0 || force) {
        console.log(`[SARA] Scouting topic-specific resources for: "${module.title}"`);
        currentResources = await scoutResourcesCached(module.title || '', path.goal);

        if (currentResources.length > 0 && pathId && phaseId && moduleId) {
          replaceModuleResources(pathId, phaseId, moduleId, currentResources);
        }
      }

      // SYNC BIBLIOGRAPHY & SMARTBOARD
      if (currentResources.length > 0) {
        setScoutedVideoIds(
          currentResources
            .filter(r => r.type === 'youtube' && r.videoId)
            .map(r => ({ id: r.videoId!, title: r.title || module.title }))
        );

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

      // Map timeline chapters to content sections — NON-BLOCKING (fire-and-forget)
      if (currentResources.length > 0) {
        const videoIds = currentResources
          .filter(r => r.type === 'youtube' && r.videoId)
          .map(r => r.videoId as string);
        if (videoIds.length > 0) {
          mapMasteryTimeline(content, videoIds)
            .then(timeline => setVideoTimeline(timeline))
            .catch(err => console.warn('[Timeline] Non-blocking mapping failed:', err));
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
    const event = new CustomEvent<SmartboardJumpEventDetail>('smartboard-jump', { detail: { timestamp: seconds } });
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

  const handleSaveToVault = (imageDataUrl: string) => {
    try {
      const link = document.createElement('a');
      link.download = `sara_vault_whiteboard_${moduleId}.png`;
      link.href = imageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Conceptual diagram successfully archived in your SARA Vault! Local backup downloaded.");
    } catch (e) {
      toast.error("Failed to archive diagram in vault.");
    }
  };

  const handleScanSketch = (imageDataUrl: string) => {
    setSaraOpen(true);
    setActiveRightTab('chat');
    handleSendMessage(`🧠 [Whiteboard Diagram Scan] SARA, I have sketched a conceptual diagram representing the core topics in "${module?.title}". Please analyze the system flow, key interactions, or technical formulations shown in this drawing and explain how it maps to our learning path.`);
    toast.success("Sketch scanned! Submitting to SARA tutor for analysis...");
  };

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;

    // Sanitize: strip macOS file paths (screenshots, drag-drop file references) that can crash Gemini
    const sanitized = msg.replace(/Screenshot\s+\d{4}-\d{2}-\d{2}\s+at\s+\d{2}\.\d{2}\.\d{2}[^.]*\.(png|jpg|jpeg|gif|heic)/gi, '').trim();
    if (!sanitized) {
      toast.error('File paths and images are not supported. Please type your question as text.');
      return;
    }

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: sanitized, timestamp: Date.now() };
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

  const toggleSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      toast.info("Voice input complete.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      let hasError = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Voice typing active. Speak now...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(prev => prev ? prev + ' ' + transcript : transcript);
          toast.success("Voice transcribed!");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[SpeechToText] Error:", event.error);
        hasError = true;
        if (event.error === 'not-allowed') {
          toast.error("Microphone access blocked. Please enable it in browser settings.");
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!hasError) {
          toast.success("Voice typing complete.");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("[SpeechToText] Failed to initialize:", e);
      toast.error("Failed to start speech recognition.");
      setIsListening(false);
    }
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
    const citation = localCitations?.[idx - 1];
    if (citation) {
      window.open(citation.url, '_blank');
    } else {
      toast.error('Source link unavailable');
    }
  };

  // Keep handleSendMessage ref fresh to avoid stale closures
  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (breathingActive && isZenMode) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setBreathingActive(false);
          soundscape.playBreathingHum('stop');
          toast.success("🧘 Calibration skipped. Workspace active.");
          return;
        }
      }
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, setIsZenMode, breathingActive]);

  // ── Global SARA Actions (from Command Palette) ──
  useEffect(() => {
    const handleSaraAction = (e: any) => {
      const prompt = e.detail;
      if (prompt) {
        setSaraOpen(true);
        setActiveRightTab('chat');
        handleSendMessageRef.current(prompt);
      }
    };
    document.addEventListener('sara-action', handleSaraAction);
    return () => document.removeEventListener('sara-action', handleSaraAction);
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
            setTerminalAction('quiz');
            setTerminalOpen(true);
          }
        },
        duration: 10000,
      });
    }, 600000);

    return () => clearInterval(interval);
  }, [module, isContentLoading, isZenMode]);

  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);

  return (
    <div className={`flex flex-col w-full h-full transition-colors duration-1000 overflow-hidden font-sans ${isZenMode ? 'bg-[#05070a]' : 'bg-[#fafbfc]'}`}>

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
          <header className={`shrink-0 mx-4 sm:mx-6 mt-4 mb-3 grid grid-cols-3 items-center z-[60] transition-all duration-700 relative rounded-2xl border backdrop-blur-2xl overflow-visible h-16 px-5 sm:px-6 shadow-[0_12px_40px_rgba(78,91,255,0.03)] ${
            isZenMode || isNeuralFullScreen 
              ? 'h-0 opacity-0 border-none pointer-events-none overflow-hidden mt-0 mb-0' 
              : `${isZenMode ? 'bg-[#0a0c16]/80 border-white/5 shadow-black/40' : 'bg-white/80 border-slate-200/40 shadow-indigo-900/5'}`
          }`}>
            
            {/* Dynamic Glowing Laser Border Line */}
            {!isZenMode && !isNeuralFullScreen && (
              <div 
                className="absolute bottom-0 left-6 right-6 h-[1.5px] z-10 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, #4e5bff, #8b5cf6, #38bdf8, transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift 4s linear infinite',
                  opacity: isTimerRunning ? 0.9 : 0.4,
                  boxShadow: '0 1px 12px rgba(99, 102, 241, 0.22)',
                  transition: 'opacity 0.5s ease',
                }}
              />
            )}

            {/* Left Section */}
            <div className="flex items-center gap-3.5 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <Link to="/dashboard" aria-label="Back to Dashboard" title="Back to Dashboard" className="w-8 h-8 rounded-xl transition-all hover:scale-105 active:scale-95 border border-slate-200/40 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-slate-500 hover:text-[#4e5bff] dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 shadow-sm flex items-center justify-center">
                  <ArrowLeft size={13} strokeWidth={2.5} />
                </Link>
                <button 
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`w-8 h-8 rounded-xl transition-all hover:scale-105 active:scale-95 border flex items-center justify-center shadow-sm ${
                    isCurriculumOpen 
                      ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-500' 
                      : 'border-slate-200/40 bg-slate-50/50 dark:bg-white/5 text-slate-500 hover:text-[#4e5bff] dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10'
                  }`}
                  title="Toggle Path Syllabus"
                >
                  <GitBranch size={13} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className={`flex items-center gap-1 mb-0.5 text-[8.5px] font-black tracking-widest uppercase truncate ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Link to="/dashboard" className="hover:text-[#4e5bff] transition-colors">Dashboard</Link>
                  <span className="text-slate-300 dark:text-white/10 mx-0.5 select-none font-light">/</span>
                  <Link to={`/path/${pathId}`} className="hover:text-[#4e5bff] transition-colors max-w-[100px] truncate block" title={path?.title}>{path?.title}</Link>
                  <span className="text-slate-300 dark:text-white/10 mx-0.5 select-none font-light">/</span>
                  <span className="max-w-[100px] truncate block text-slate-500" title={phase?.title}>{phase?.title}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse bg-gradient-to-r from-[#4e5bff] to-[#8b5cf6] shadow-[0_0_6px_rgba(78,91,255,0.4)]" />
                  <h1 className={`text-[10.5px] font-black uppercase tracking-wider font-display truncate ${isZenMode ? 'text-white' : 'text-slate-800'}`}>{module?.title}</h1>
                </div>
              </div>
            </div>

            {/* Center Section: Mode Toggle & Constellation HUD */}
            <div className="flex flex-col items-center gap-1 min-w-0 justify-center">
              {phase?.modules && phase.modules.length > 0 && (
                <div className="flex items-center justify-center relative w-56 h-6 select-none overflow-visible hidden sm:block">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 200 28">
                    <defs>
                      <filter id="constellation-glow" x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="active-glow" x="-35%" y="-35%" width="170%" height="170%">
                        <feGaussianBlur stdDeviation="4.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    
                    {/* Lines */}
                    {constellationNodes.map((node, idx) => {
                      if (idx === 0) return null;
                      const prev = constellationNodes[idx - 1];
                      const isLineActive = prev.isCompleted && node.isCompleted;
                      return (
                        <line
                          key={`const-line-${idx}`}
                          x1={prev.x}
                          y1={prev.y}
                          x2={node.x}
                          y2={node.y}
                          stroke={isLineActive ? '#10b981' : (isZenMode ? 'rgba(255,255,255,0.08)' : '#cbd5e1')}
                          strokeWidth={node.isActive || prev.isActive ? 2 : 1.5}
                          strokeDasharray={(!prev.isCompleted || !node.isCompleted) ? '3,3' : undefined}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                    
                    {/* Nodes */}
                    {constellationNodes.map((node) => {
                      let nodeColor = isZenMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1'; // future / locked
                      let strokeColor = isZenMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(203, 213, 225, 0.2)';
                      let pulseClass = '';
                      
                      if (node.isActive) {
                        nodeColor = '#4e5bff'; // active
                        strokeColor = isZenMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(78, 91, 255, 0.4)';
                        pulseClass = 'constellation-active-glow';
                      } else if (node.isCompleted) {
                        nodeColor = '#10b981'; // completed
                        strokeColor = 'rgba(16, 185, 129, 0.3)';
                      }
                      
                      return (
                        <g 
                          key={`const-node-${node.id}`} 
                          className="cursor-pointer group/node"
                          onClick={() => navigate(`/study/${pathId}/${phaseId}/${node.id}`)}
                          onMouseEnter={(e) => {
                            const svgEl = e.currentTarget.ownerSVGElement;
                            if (svgEl) {
                              const svgRect = svgEl.getBoundingClientRect();
                              // Calculate stable coordinates based on node's static coordinates relative to SVG viewBox (800x500)
                              const scaleX = svgRect.width / 800;
                              const scaleY = svgRect.height / 500;
                              setHoveredNode({
                                title: node.title,
                                x: svgRect.left + node.x * scaleX,
                                y: svgRect.top + node.y * scaleY - 12
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {/* Stable, non-scaling pointer hit target circle to prevent hover flickering loops */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={18}
                            fill="transparent"
                            className="pointer-events-auto"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.isActive ? 8 : 6}
                            fill="transparent"
                            stroke={strokeColor}
                            strokeWidth={1.8}
                            className={`transition-all duration-300 group-hover/node:scale-125 ${pulseClass}`}
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.isActive ? 4.5 : 3.5}
                            fill={nodeColor}
                            filter={node.isActive ? 'url(#active-glow)' : node.isCompleted ? 'url(#constellation-glow)' : undefined}
                            className="transition-all duration-300 group-hover/node:scale-110"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              <div className={`relative flex p-0.5 rounded-[12px] ring-1 transition-all shadow-inner ${isZenMode ? 'bg-white/5 ring-white/10 shadow-black/40' : 'bg-slate-100/50 ring-slate-200/40 shadow-slate-200/50'}`}>
                {/* Sliding Background Indicator */}
                <motion.div 
                  initial={false}
                  animate={{ 
                    x: hasVideos 
                      ? (leftPanelMode === 'smartboard' ? 0 : leftPanelMode === 'content' ? 106 : leftPanelMode === 'visualizer' ? 212 : 318)
                      : (leftPanelMode === 'content' ? 0 : leftPanelMode === 'visualizer' ? 106 : 212)
                  }}
                  transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                  className={`absolute top-0.5 bottom-0.5 w-[104px] rounded-[10px] z-0 ${isZenMode ? 'bg-gradient-to-r from-[#4e5bff]/20 to-[#8b5cf6]/20 shadow-[0_0_15px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/30' : 'bg-white shadow-[0_4px_14px_-2px_rgba(78,91,255,0.12)] ring-1 ring-slate-200/60'}`}
                />

                {hasVideos && (
                  <button 
                    onClick={() => {
                      setLeftPanelMode('smartboard');
                      setSelectedNeuralNode(null);
                    }}
                    className={`relative z-10 w-[104px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 cursor-pointer ${leftPanelMode === 'smartboard' ? (isZenMode ? 'text-indigo-400 font-bold' : 'text-[#4e5bff] font-bold') : 'text-slate-400 hover:text-slate-500'}`}
                  >
                    <motion.span
                      animate={leftPanelMode === 'smartboard' ? { opacity: [0.85, 1, 0.85] } : { opacity: 0.6 }}
                      transition={leftPanelMode === 'smartboard' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                    >
                      Smartboard
                    </motion.span>
                  </button>
                )}
                
                <div 
                  className="relative overflow-visible"
                  onMouseEnter={() => {
                    setShowWhiteboardDropdown(true);
                  }}
                  onMouseLeave={() => {
                    setShowWhiteboardDropdown(false);
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeftPanelMode('content');
                      setSelectedNeuralNode(null);
                      setShowWhiteboardDropdown(prev => !prev);
                    }}
                    className={`relative z-10 w-[104px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.15em] transition-colors duration-500 cursor-pointer flex items-center justify-center gap-1 ${leftPanelMode === 'content' ? (isZenMode ? 'text-indigo-400 font-bold' : 'text-[#4e5bff] font-bold') : 'text-slate-400 hover:text-slate-500'}`}
                  >
                    {leftPanelMode === 'content' && (
                      workspaceMode === 'notes' ? <BookOpen size={9} className="shrink-0" /> : 
                      workspaceMode === 'canvas' ? <Palette size={9} className="shrink-0" /> : 
                      <Columns4 size={9} className="shrink-0" />
                    )}
                    <span>Whiteboard</span>
                    <ChevronDown size={8} className={`transition-transform duration-300 opacity-60 ${showWhiteboardDropdown ? 'rotate-180 text-[#4e5bff]' : ''}`} />
                  </button>

                  {/* Sleek, Glassmorphic Hover Dropdown Menu */}
                  <AnimatePresence>
                    {showWhiteboardDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute left-1/2 -translate-x-1/2 mt-2 w-52 rounded-2xl p-2 border shadow-2xl backdrop-blur-xl z-[999] flex flex-col gap-1 ${
                          isZenMode 
                            ? 'bg-[#090a0f]/95 border-white/10 text-white shadow-indigo-500/10' 
                            : 'bg-white/95 border-slate-200/60 text-slate-800 shadow-[0_25px_60px_-15px_rgba(78,91,255,0.25)]'
                        }`}
                      >
                        <div className="px-3 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5 flex flex-col text-left">
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-[#4e5bff]">Workspace Layout</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Select view option</span>
                        </div>

                        {[
                          { id: 'notes' as const, label: 'Study Notes', Icon: BookOpen },
                          { id: 'canvas' as const, label: 'Whiteboard Canvas', Icon: Palette },
                          { id: 'split' as const, label: 'Split Workspace', Icon: Columns4 }
                        ].map((opt) => {
                          const active = leftPanelMode === 'content' && workspaceMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setLeftPanelMode('content');
                                setSelectedNeuralNode(null);
                                handleSetWorkspaceMode(opt.id);
                                setShowWhiteboardDropdown(false);
                                toast.success(`Workspace layout set to ${opt.label}!`);
                              }}
                              className={`w-full flex items-center justify-start gap-3 px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-left ${
                                active
                                  ? 'bg-gradient-to-r from-[#4e5bff] to-[#6366f1] text-white shadow-md shadow-indigo-500/20'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <opt.Icon size={12} className={active ? 'text-white' : 'text-[#4e5bff]'} />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div 
                  className="relative overflow-visible animate-in fade-in duration-300"
                  onMouseEnter={() => {
                    setShowNeuralDropdown(true);
                  }}
                  onMouseLeave={() => {
                    setShowNeuralDropdown(false);
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNeuralDropdown(prev => !prev);
                      setShowWhiteboardDropdown(false);
                    }}
                    className={`relative z-10 w-[104px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.15em] transition-colors duration-500 cursor-pointer flex items-center justify-center gap-1 ${(leftPanelMode === 'visualizer' || leftPanelMode === 'challenge') ? (isZenMode ? 'text-indigo-400 font-bold' : 'text-[#4e5bff] font-bold') : 'text-slate-400 hover:text-slate-500'}`}
                  >
                    {(leftPanelMode === 'visualizer' || leftPanelMode === 'challenge') && (
                      leftPanelMode === 'challenge' ? <Gamepad2 size={9} className="shrink-0 animate-pulse text-indigo-400" /> : <Network size={9} className="shrink-0" />
                    )}
                    <span>Neural Map</span>
                    <ChevronDown size={8} className={`transition-transform duration-300 opacity-60 ${showNeuralDropdown ? 'rotate-180 text-[#4e5bff]' : ''}`} />
                  </button>

                  {/* Sleek, Glassmorphic Hover Dropdown Menu */}
                  <AnimatePresence>
                    {showNeuralDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute left-1/2 -translate-x-1/2 mt-2 w-52 rounded-2xl p-2 border shadow-2xl backdrop-blur-xl z-[999] flex flex-col gap-1 ${
                          isZenMode 
                            ? 'bg-[#090a0f]/95 border-white/10 text-white shadow-indigo-500/10' 
                            : 'bg-white/95 border-slate-200/60 text-slate-800 shadow-[0_25px_60px_-15px_rgba(78,91,255,0.25)]'
                        }`}
                      >
                        <div className="px-3 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5 flex flex-col text-left">
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-[#4e5bff]">Neural Workspace</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Select view option</span>
                        </div>

                        {[
                          { id: 'visualizer' as const, label: 'Neural Map Visualizer', Icon: Network },
                          { id: 'challenge' as const, label: 'Palace Arena Puzzle', Icon: Gamepad2 }
                        ].map((opt) => {
                          const active = leftPanelMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setLeftPanelMode(opt.id);
                                setSelectedNeuralNode(null);
                                setShowNeuralDropdown(false);
                                toast.success(`Neural workspace set to ${opt.label}!`);
                              }}
                              className={`w-full flex items-center justify-start gap-3 px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-left ${
                                active
                                  ? 'bg-gradient-to-r from-[#4e5bff] to-[#6366f1] text-white shadow-md shadow-indigo-500/20'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <opt.Icon size={12} className={active ? 'text-white' : 'text-[#4e5bff]'} />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end gap-2.5 min-w-0">
              {/* Real-Time Checkpoint Timer Pill */}
              <div 
                className={`flex items-center gap-2 h-8 px-2.5 rounded-xl border transition-all duration-300 hover:scale-[1.02] shadow-sm ${
                  timerAlert 
                    ? 'timer-alert-smooth' 
                    : (isZenMode 
                        ? 'bg-white/5 border-white/10 text-slate-300' 
                        : 'bg-slate-50/50 border-slate-250/30 text-slate-500 hover:border-slate-350')
                }`}
              >
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
                  className="hover:scale-110 active:scale-95 transition-all text-current cursor-pointer flex items-center justify-center"
                >
                  {isTimerRunning ? <Pause size={9} strokeWidth={3} /> : <Play size={9} strokeWidth={3} />}
                </button>
                
                <div className="flex items-center gap-1.5 min-w-[45px] justify-center font-mono text-[10px] font-black tracking-wider relative">
                  {/* SVG Micro Circular Progress Ring */}
                  <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
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
                    <Clock size={8} className={`relative z-10 text-current ${isTimerRunning && !timerAlert ? "animate-[spin_10s_linear_infinite]" : ""}`} />
                  </div>
                  <span>{formatTimerTime(timeLeft)}</span>
                </div>

                <button
                  onClick={() => handleAdjustTimer(5 * 60)}
                  title="Add +5 Mins"
                  className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[#4e5bff]/10 dark:bg-white/10 text-[#4e5bff] dark:text-white hover:bg-[#4e5bff] dark:hover:bg-white hover:text-white dark:hover:text-slate-900 active:scale-95 transition-all cursor-pointer font-mono border border-[#4e5bff]/20 dark:border-white/10"
                >
                  +5m
                </button>
              </div>

              <div className={`w-px h-4 shrink-0 ${isZenMode ? 'bg-white/10' : 'bg-slate-200/60'}`} />

              {/* Zen Mode Button */}
              <button 
                onClick={() => setIsZenMode(!isZenMode)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl transition-all active:scale-95 border ${
                  isZenMode 
                    ? 'bg-white border-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.28)] font-black' 
                    : 'bg-slate-50/50 border-slate-250/30 text-slate-450 hover:text-[#4e5bff] hover:border-indigo-500/20 hover:bg-[#4e5bff]/5'
                }`}
              >
                <Sparkles size={12} strokeWidth={2.4} className={isZenMode ? 'animate-pulse text-indigo-500' : ''} />
                <span className="text-[9px] font-black uppercase tracking-wider hidden md:block">
                  {isZenMode ? 'Exit Zen' : 'Zen'}
                </span>
              </button>

              <div className={`w-px h-4 shrink-0 ${isZenMode ? 'bg-white/10' : 'bg-slate-200/60'}`} />

              {/* Focus/Split Panel Button */}
              <button 
                onClick={() => {
                  const next = !saraOpen;
                  setSaraOpen(next);
                  setFocusMode(next ? 'split' : 'content');
                }}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl transition-all active:scale-95 border ${
                  saraOpen 
                    ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-500 shadow-sm font-black' 
                    : 'bg-slate-50/50 border-slate-250/30 text-slate-450 hover:text-slate-650 hover:border-slate-350 hover:bg-slate-100/50'
                }`}
              >
                <BookOpen size={12} strokeWidth={2.4} />
                <span className="text-[9px] font-black uppercase tracking-wider hidden md:block">
                  {saraOpen ? 'Focus' : 'Split'}
                </span>
              </button>
            </div>
          </header>

          <main ref={containerRef} className={`flex-1 flex overflow-hidden relative min-h-0 transition-all duration-1000 ${
            isZenMode ? 'zen-mode-aurora-bg text-white' : 'bg-[#fafbfc]'
          } ${
            isZenMode || isNeuralFullScreen
              ? ''
              : 'mx-4 sm:mx-6 mb-4 rounded-2xl border border-slate-200/30 dark:border-white/5 bg-white shadow-[0_8px_30px_rgba(78,91,255,0.02)] overflow-hidden'
          }`}>
            
            {/* BREATH OF ZEN OVERLAY */}
            <AnimatePresence>
              {isZenMode && breathingActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setBreathingActive(false);
                    soundscape.playBreathingHum('stop');
                    toast.success("🧘 Calibration skipped. Workspace active.");
                  }}
                  className="absolute inset-0 bg-[#05070a] z-[120] flex flex-col items-center justify-center text-center p-8 select-none pointer-events-auto cursor-pointer"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#312e81_0%,transparent_60%)] opacity-40 animate-pulse pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center max-w-sm cursor-default" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Cognitive Calibration</span>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">Breath of Zen</h2>
                    <p className="text-[11px] font-medium text-slate-500 mb-12">Synchronizing brain frequencies for deep concept absorption...</p>

                    <div className="relative w-48 h-48 flex items-center justify-center mb-12">
                      <motion.div
                        animate={{
                          scale: breathingPhase === 'inhale' || breathingPhase === 'hold_in' ? 1.5 : 0.8,
                          opacity: breathingPhase === 'inhale' ? [0.2, 0.6] : breathingPhase === 'exhale' ? [0.6, 0.2] : 0.6
                        }}
                        transition={{ duration: 4, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 blur-sm"
                      />
                      
                      <motion.div
                        animate={{
                          scale: breathingPhase === 'inhale' || breathingPhase === 'hold_in' ? 1.3 : 0.7,
                          backgroundColor: breathingPhase === 'hold_in' ? '#8b5cf6' : '#4e5bff',
                          boxShadow: breathingPhase === 'hold_in' 
                            ? '0 0 40px rgba(139, 92, 246, 0.6)' 
                            : '0 0 30px rgba(78, 91, 255, 0.4)'
                        }}
                        transition={{ duration: 4, ease: 'easeInOut' }}
                        className="w-24 h-24 rounded-full flex flex-col items-center justify-center relative"
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">
                          {breathingPhase === 'inhale' && 'Breathe In'}
                          {breathingPhase === 'hold_in' && 'Hold'}
                          {breathingPhase === 'exhale' && 'Breathe Out'}
                          {breathingPhase === 'hold_out' && 'Hold'}
                        </span>
                      </motion.div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className="flex gap-2">
                        {[0, 1, 2].map(cycle => (
                          <div 
                            key={cycle} 
                            className={`w-2 h-2 rounded-full transition-all duration-500 ${
                              cycle < breathingCycle 
                                ? 'bg-indigo-500' 
                                : cycle === breathingCycle 
                                  ? 'bg-indigo-400 scale-125 shadow-[0_0_8px_#818cf8]' 
                                  : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setBreathingActive(false);
                          soundscape.playBreathingHum('stop');
                          toast.success("🧘 Calibration skipped. Workspace active.");
                        }}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all duration-300 mt-4 cursor-pointer"
                      >
                        Skip Warmup
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Curriculum Navigator (Pristine Minimalist Sidebar) ── */}
            <motion.div 
              initial={false}
              animate={{ 
                width: (isCurriculumOpen && !isNeuralFullScreen) ? 250 : 0, 
                opacity: (isCurriculumOpen && !isNeuralFullScreen) ? 1 : 0 
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`shrink-0 flex flex-col border-r overflow-hidden z-30 transition-all duration-500 @container ${isZenMode ? 'bg-[#090a0f]/95 backdrop-blur-xl border-white/5' : 'bg-[#fafbfc] border-slate-200/50 shadow-sm'}`}
            >
              <div className="flex-1 flex flex-col min-w-[250px] h-full max-h-full">
                <div className="p-6 pb-3">
                  <h2 className={`text-[12px] font-black uppercase tracking-wider font-display ${isZenMode ? 'text-white' : 'text-slate-800'}`}>
                    {path?.title || 'Machine learning'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pt-1 px-2.5 sidebar-scroll-mask">
                  {path?.phases?.map((p, phaseIdx) => {
                    const completedInPhase = p.modules?.filter(m => m.isCompleted).length || 0;
                    const totalInPhase = p.modules?.length || 0;
                    const isCurrentPhase = p.modules?.some(m => m.id === moduleId);
                    return (
                    <div key={p.id} className="mb-1.5">
                      {/* Phase divider line between groups */}
                      {phaseIdx > 0 && (
                        <div className={`mx-3 mb-2 h-px ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                      )}
                      {/* Phase container card */}
                      <div className={`rounded-xl py-2 transition-all duration-300 ${
                        isCurrentPhase 
                          ? (isZenMode ? 'bg-white/[0.03]' : 'bg-[#4e5bff]/[0.015]')
                          : 'bg-transparent'
                      }`}>
                        <div className="px-4 py-1.5 flex items-center justify-between">
                          <h4 className={`text-[10px] font-black uppercase tracking-widest ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{p.title}</h4>
                          <div className="flex items-center gap-1.5">
                            {/* Tiny 14px SVG Progress Ring */}
                            {totalInPhase > 0 && (
                              <div className="relative w-3.5 h-3.5 shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 20 20">
                                  <circle cx="10" cy="10" r="8" stroke={isZenMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} strokeWidth="2" fill="transparent" />
                                  <circle cx="10" cy="10" r="8" stroke={completedInPhase === totalInPhase ? '#10b981' : '#4e5bff'} strokeWidth="2" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 8}
                                    strokeDashoffset={2 * Math.PI * 8 - (completedInPhase / totalInPhase) * 2 * Math.PI * 8}
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                            )}
                            <span className={`text-[9px] font-bold tabular-nums ${
                              completedInPhase === totalInPhase && totalInPhase > 0
                                ? 'text-emerald-500'
                                : (isZenMode ? 'text-slate-600' : 'text-slate-350')
                            }`}>
                              {completedInPhase}/{totalInPhase}
                            </span>
                          </div>
                        </div>
                        <div className="mt-0.5 relative">
                          {/* Linear Constellation Connection Track */}
                          <div className={`absolute left-[24px] top-[14px] bottom-[14px] w-[1px] border-l border-dashed pointer-events-none -z-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`} />
                          
                          {p.modules?.map((m) => {
                            const isActive = m.id === moduleId;
                            const isCompleted = m.isCompleted;
                            const locked = isModuleLocked(m);
                            const requiredTitles = getRequiredModuleTitles(m);

                            return (
                               <motion.button
                                 key={m.id}
                                 onClick={() => {
                                   if (locked) {
                                     toast.error(`This module is locked. Please complete the following first: ${requiredTitles.join(', ')}`);
                                     return;
                                   }
                                   navigate(`/study/${pathId}/${p.id}/${m.id}`);
                                 }}
                                 onMouseEnter={(e) => {
                                   if (locked) {
                                     const rect = e.currentTarget.getBoundingClientRect();
                                     setHoveredLockedModule({
                                       id: m.id,
                                       title: m.title,
                                       prerequisites: requiredTitles,
                                       x: rect.right,
                                       y: rect.top + rect.height / 2
                                     });
                                   }
                                 }}
                                 onMouseLeave={() => {
                                   setHoveredLockedModule(null);
                                 }}
                                 whileHover={{ scale: locked ? 1 : 1.012, y: locked ? 0 : -0.5 }}
                                 transition={{ type: "spring", stiffness: 450, damping: 28 }}
                                 disabled={locked}
                                 className={`mx-1.5 w-[calc(100%-12px)] flex flex-col py-2.5 px-3.5 transition-all duration-300 group relative border rounded-xl my-0.5 overflow-hidden ${
                                   locked
                                     ? (isZenMode 
                                       ? 'opacity-50 cursor-not-allowed border-transparent text-slate-500 bg-white/[0.02]'
                                       : 'opacity-50 cursor-not-allowed border-slate-100/50 text-slate-400 bg-slate-50/30')
                                     : isActive
                                       ? (isZenMode
                                         ? 'bg-white/[0.05] text-white font-bold border-white/10 shadow-sm'
                                         : 'bg-white text-[#4e5bff] font-bold border-slate-200 shadow-md shadow-slate-100/50')
                                       : isCompleted
                                         ? (isZenMode 
                                           ? 'bg-transparent text-slate-400 border-transparent hover:bg-white/[0.02] hover:text-white' 
                                           : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50/50 hover:text-slate-900')
                                         : (isZenMode 
                                           ? 'text-slate-300 hover:bg-white/[0.04] border-transparent hover:border-white/8 hover:text-white' 
                                           : 'text-slate-600 bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200/40 hover:text-slate-900')
                                 }`}
                               >
                                 {isActive && showCompletionBurst && (
                                   <motion.div
                                     initial={{ scale: 0.8, opacity: 0.8 }}
                                     animate={{ scale: 1.5, opacity: 0 }}
                                     transition={{ duration: 0.6 }}
                                     className="absolute inset-0 bg-emerald-500/20 rounded-xl pointer-events-none z-50 filter blur-[1px]"
                                   />
                                 )}
                                 <div className="flex items-center gap-2.5 min-w-0 w-full relative z-10">
                                   <div className="shrink-0 flex items-center justify-center w-4 h-4">
                                     {locked ? (
                                       <Lock size={12} className={isZenMode ? 'text-slate-600' : 'text-slate-350'} />
                                     ) : isCompleted ? (
                                       <CheckCircle2 size={13} className="text-[#10b981]" />
                                     ) : (
                                       <div 
                                         className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                           isActive 
                                             ? 'bg-[#4e5bff]' 
                                             : (isZenMode ? 'bg-slate-700' : 'bg-slate-300')
                                         }`}
                                       />
                                     )}
                                   </div>
                                   <span className={`text-[11px] transition-colors truncate block leading-tight ${
                                     isActive ? 'font-bold' : 'font-medium'
                                   }`}>
                                     {m.title}
                                   </span>
                                 </div>
                                 {/* Show prerequisite names inline for locked modules */}
                                 {locked && requiredTitles.length > 0 && (
                                   <div className="flex items-center gap-1.5 mt-1 ml-[22px] relative z-10">
                                     <span className={`text-[8.5px] font-medium truncate ${isZenMode ? 'text-slate-600' : 'text-slate-350'}`}>
                                       Requires: {requiredTitles[0]}{requiredTitles.length > 1 ? ` +${requiredTitles.length - 1}` : ''}
                                     </span>
                                   </div>
                                 )}
                                 {/* Ambient Active Aura strip */}
                                 {isActive && (
                                   <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4e5bff] z-10 rounded-r-md" />
                                 )}
                               </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Intelligent Progress Footer */}
                <div className={`px-4 py-4 border-t ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* Mini circular progress ring */}
                      <div className="relative w-8 h-8 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32" style={(path?.progress || 0) > 80 ? { filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.45))' } : undefined}>
                          <circle cx="16" cy="16" r="13" stroke={isZenMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} strokeWidth="2.5" fill="transparent" />
                          <circle cx="16" cy="16" r="13" stroke="#4e5bff" strokeWidth="2.5" fill="transparent"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 - ((path?.progress || 0) / 100) * 2 * Math.PI * 13}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-black ${isZenMode ? 'text-white' : 'text-slate-700'}`}>
                          {path?.progress || 0}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold leading-tight ${isZenMode ? 'text-white' : 'text-slate-700'}`}>
                          {path?.phases?.reduce((acc, p) => acc + (p.modules?.filter(m => m.isCompleted).length || 0), 0) || 0}/{path?.phases?.reduce((acc, p) => acc + (p.modules?.length || 0), 0) || 0} modules
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 leading-tight mt-0.5">
                          Phase {(path?.phases?.findIndex(p => p.modules?.some(m => m.id === moduleId)) ?? 0) + 1} of {path?.phases?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Zen Mode Ambient Background */}
            {isZenMode && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#312e81_0%,transparent_40%)]" />
                <div className="absolute inset-0 aurora-silk opacity-20" />
                {/* Subtle Glass Particles (CSS-only premium noise) */}
                <div className="absolute inset-0 app-aurora-noise opacity-15 mix-blend-screen pointer-events-none" />
                
                {/* Ambient Synthesizer Pulse Layer */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="absolute w-[1000px] h-[1000px] rounded-full bg-indigo-500/20 blur-[120px] zen-ambient-pulse-1" />
                   <div className="absolute w-[900px] h-[900px] rounded-full bg-violet-500/20 blur-[130px] zen-ambient-pulse-2" />
                </div>
              </div>
            )}

            {/* Floating Zen Controls */}
            {isZenMode && !isNeuralFullScreen && (
              <div className="absolute top-0 left-0 right-0 h-[80px] z-[100] flex items-start justify-center pt-8 group/zen-header">
                <div className={`flex items-center gap-x-6 px-5 py-2.5 bg-white/[0.08] backdrop-blur-[20px] border border-white/10 rounded-full shadow-2xl transition-all duration-1000 ${isSidebarGhost ? 'opacity-20 group-hover/zen-header:opacity-100 group-hover/zen-header:-translate-y-0 -translate-y-1' : 'opacity-100 translate-y-0'}`}>
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

                  {/* Binaural Focus Audio Controller */}
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                    <div className="flex items-center gap-1.5 text-slate-450 select-none">
                      <Music size={12} className={isAudioActive ? 'text-[#4e5bff] animate-pulse' : ''} />
                      <div className="flex items-end gap-[2.5px] h-3.5 pb-0.5">
                        <div className="w-[2.2px] h-full bg-[#4e5bff] rounded-full sound-wave-bar origin-bottom transition-all duration-300" style={{ animationDelay: '0.1s', animationDuration: '0.6s', animationPlayState: isAudioActive ? 'running' : 'paused', opacity: isAudioActive ? 1 : 0.25 }} />
                        <div className="w-[2.2px] h-full bg-[#8b5cf6] rounded-full sound-wave-bar origin-bottom transition-all duration-300" style={{ animationDelay: '0.35s', animationDuration: '1.1s', animationPlayState: isAudioActive ? 'running' : 'paused', opacity: isAudioActive ? 1 : 0.25 }} />
                        <div className="w-[2.2px] h-full bg-[#38bdf8] rounded-full sound-wave-bar origin-bottom transition-all duration-300" style={{ animationDelay: '0.18s', animationDuration: '0.8s', animationPlayState: isAudioActive ? 'running' : 'paused', opacity: isAudioActive ? 1 : 0.25 }} />
                        <div className="w-[2.2px] h-full bg-[#8b5cf6] rounded-full sound-wave-bar origin-bottom transition-all duration-300" style={{ animationDelay: '0.45s', animationDuration: '1.2s', animationPlayState: isAudioActive ? 'running' : 'paused', opacity: isAudioActive ? 1 : 0.25 }} />
                        <div className="w-[2.2px] h-full bg-[#4e5bff] rounded-full sound-wave-bar origin-bottom transition-all duration-300" style={{ animationDelay: '0.25s', animationDuration: '0.7s', animationPlayState: isAudioActive ? 'running' : 'paused', opacity: isAudioActive ? 1 : 0.25 }} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'binaural' as const, label: 'Binaural' },
                        { id: 'rain' as const, label: 'Rain' },
                        { id: 'synth' as const, label: 'Synth' }
                      ].map((tTrack) => {
                        const active = soundscapeState[tTrack.id];
                        return (
                          <button
                            key={tTrack.id}
                            onClick={() => toggleTrack(tTrack.id)}
                            className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              active 
                                ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {tTrack.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-px h-3 bg-white/10 mx-1" />

                    <div className="flex items-center gap-1.5 ml-1 select-none">
                      <Volume2 size={10} className="text-slate-500" />
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={soundscapeState.volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-12 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                        title="Focus Audio Volume"
                      />
                    </div>
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
                  moduleId={moduleId}
                  viewMode={workspaceMode}
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
                        videoTimeline={videoTimeline}
                        onReSync={() => scoutAndMap(generatedContent || '', true)}
                        onVideoError={() => {
                          console.error('[Smartboard] All video entries failed to load');
                          toast.error('Video playback restricted or unavailable. Try re-scouting or selecting from recommendations.');
                        }}
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
                          citations={localCitations}
                          onCitationClick={handleCitationClick}
                          onJumpToTimestamp={handleJumpToTimestamp}
                          onRunInSandbox={(code, lang) => {
                            setSandboxCode(code);
                            setSandboxLanguage(lang);
                            toast.success("Code piped to Cortex Sandbox! Check the collapsible slide-out playground.");
                          }}
                          onSelectionAction={(action, text) => {
                            setSaraOpen(true);
                            setActiveRightTab('chat');
                            let prompt = '';
                            if (action === 'explain') prompt = `Explain this in depth within the context of ${module?.title}: "${text}"`;
                            else if (action === 'summarize') prompt = `Give me a concise scholarly summary of this: "${text}"`;
                            else if (action === 'examples') prompt = `Provide 3 real-world technical examples for this concept: "${text}"`;
                            handleSendMessage(prompt);
                          }}
                          audioState={audioState}
                          onListen={handleToggleListen}
                          activeParagraphText={activeParagraphText}
                          moduleId={moduleId}
                          onSaveToVault={handleSaveToVault}
                          onScanSketch={handleScanSketch}
                          viewMode={workspaceMode}
                        />
                        
                        {hasReachedBottom && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                              <motion.button 
                                whileTap={{ scale: 0.94 }}
                                onClick={() => {
                                  const nextCompleted = !module?.isCompleted;
                                  if (nextCompleted) {
                                    setShowCompletionBurst(true);
                                    setTimeout(() => setShowCompletionBurst(false), 850);
                                  }
                                  updateModuleStatus(pathId!, phaseId!, moduleId!, nextCompleted);
                                }}
                                className={`content-bottom-btn content-bottom-btn-secondary px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 relative overflow-hidden ${module?.isCompleted ? 'bg-emerald-500 text-white shadow-lg' : (isZenMode ? 'bg-white/10 text-white border border-white/10 hover:border-indigo-500/50' : 'bg-white text-slate-900 border border-slate-200 shadow-md hover:border-[#4e5bff]')}`}
                              >
                                {showCompletionBurst && (
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0.7 }}
                                    animate={{ scale: 1.8, opacity: 0 }}
                                    transition={{ duration: 0.6 }}
                                    className="absolute inset-0 bg-emerald-500/35 rounded-full pointer-events-none"
                                  />
                                )}
                                {module?.isCompleted ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                                {module?.isCompleted ? 'Mastered' : 'Mark Complete'}
                              </motion.button>
                              
                              {nextModule && (
                                <motion.button 
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => navigate(`/study/${pathId}/${nextModule.phaseId}/${nextModule.id}`)}
                                  className="content-bottom-btn content-bottom-btn-primary px-6 py-3 rounded-full bg-[#4e5bff] text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 group"
                                >
                                  Next Chapter
                                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
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
                        pingNodeId={pingNodeId}
                        initialChallengeActive={leftPanelMode === 'challenge'}
                      />
                    )}
                  </div>
               </div>
             
            {/* PANEL 3: CODE SANDBOX SIDEBAR */}
            <motion.div
              initial={false}
              animate={{ 
                width: sandboxCode !== null ? 440 : 0,
                opacity: sandboxCode !== null ? 1 : 0
              }}
              transition={{ type: 'spring', damping: 26, stiffness: 200 }}
              className={`shrink-0 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-25 ${
                isZenMode 
                  ? 'bg-[#05070a]/90 backdrop-blur-xl border-white/5' 
                  : 'bg-white border-l border-slate-200/50 shadow-2xl'
              }`}
              style={{
                width: sandboxCode !== null ? '440px' : '0px',
                minWidth: sandboxCode !== null ? '440px' : '0px',
              }}
            >
              {sandboxCode !== null && (
                <CodeSandbox
                  initialCode={sandboxCode}
                  initialLanguage={sandboxLanguage}
                  onClose={() => setSandboxCode(null)}
                  isZenMode={isZenMode}
                  onAskSara={(prompt) => {
                    setSaraOpen(true);
                    setActiveRightTab('chat');
                    handleSendMessage(prompt);
                  }}
                />
              )}
            </motion.div>

            {/* PANEL 2: ASSISTANT SIDEBAR — Ghost Mode in Zen */}
            <div
              className={`shrink-0 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-20 ${
                (saraOpen && !isContentLoading) ? 'w-[350px] min-w-[350px]' : 'w-0 min-w-0 opacity-0 pointer-events-none'
              } ${
                isZenMode 
                  ? 'bg-[#0b0f19]/80 backdrop-blur-[12px] border-l border-white/10' 
                  : 'bg-white/80 backdrop-blur-[12px] border-l border-slate-200/60 shadow-lg'
              }`}
              style={{
                opacity: (saraOpen && !isContentLoading) ? (isZenMode && isSidebarGhost ? 0.15 : 1) : 0,
                transition: 'opacity 1.5s ease, width 0.5s ease',
              }}
              onMouseEnter={() => { /* hook resets on mousemove globally */ }}
            >
                {/* SARA Brand Header with Quantum Thinking Orb */}
                <div className={`px-4 py-3 shrink-0 flex items-center justify-between border-b ${isZenMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200/30 bg-slate-50/50'}`}>
                  <div className="flex items-center gap-2">
                    {/* Breathing Cognitive Orb container */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      {/* Outer pulse */}
                      <motion.div
                        className="absolute inset-0 rounded-full bg-indigo-500/35 blur-[3px]"
                        animate={isTyping ? {
                          scale: [1, 1.4, 1],
                          opacity: [0.4, 0.8, 0.4]
                        } : {
                          scale: [1, 1.15, 1],
                          opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{
                          duration: isTyping ? 1.5 : 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      {/* Morphing Quantum Orb */}
                      <motion.div
                        className="w-3.5 h-3.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-400 shadow-[0_0_10px_rgba(99,102,241,0.5)] z-10"
                        animate={isTyping ? {
                          scale: [1, 1.25, 0.9, 1.1, 1],
                          borderRadius: ["42%", "58%", "46%", "62%", "42%"],
                          rotate: [0, 90, 180, 270, 360]
                        } : {
                          scale: [1, 1.1, 1],
                          borderRadius: ["50%", "45%", "55%", "50%"],
                          rotate: [0, 180, 360]
                        }}
                        transition={{
                          duration: isTyping ? 2.5 : 6,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isZenMode ? 'text-white' : 'text-slate-900'}`}>SARA</span>
                      <span className="text-[7px] font-bold text-slate-500 tracking-wider">
                        {isTyping ? 'thinking...' : 'cognitive assistant'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicator / Waveforms */}
                  <div className="flex items-center gap-2">
                    {isTyping ? (
                      <div className="flex items-end gap-[2px] h-3.5 px-1">
                        {[0.4, 0.2, 0.6, 0.3, 0.5].map((delay, i) => (
                          <motion.span
                            key={i}
                            animate={{ height: ["2px", "14px", "2px"] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: delay,
                              ease: "easeInOut"
                            }}
                            className="w-[1.5px] bg-[#4e5bff] rounded-full filter drop-shadow-[0_0_2px_rgba(78,91,255,0.6)]"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[7px] font-black uppercase tracking-wider text-slate-500">online</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SARA Sliding Tab Indicators */}
                <div className={`flex p-1.5 gap-0.5 shrink-0 relative ${isZenMode ? 'bg-white/5 border-b border-white/5' : 'border-b border-slate-200/30 bg-slate-100/60 backdrop-blur-sm'}`}>
                   {(['chat', 'quiz', 'notes', 'vault', 'architecture'] as const).map(t => {
                     const isActive = activeRightTab === t;
                     const tabLabels: Record<string, string> = { chat: 'Ask', quiz: 'Quiz', notes: 'Notes', vault: 'Vault', architecture: 'Arch' };
                     return (
                       <button 
                         key={t} 
                         onClick={() => setActiveRightTab(t as any)}
                         className={`flex-1 py-2 rounded-[8px] text-[8px] font-black uppercase tracking-wider font-display relative z-10 transition-all duration-300 ${
                           isActive 
                             ? (isZenMode ? 'text-white' : 'text-[#4e5bff]') 
                             : (isZenMode ? 'text-slate-500 hover:text-slate-350' : 'text-slate-400 hover:text-slate-750')
                         }`}
                       >
                         {isActive && (
                           <motion.div
                             layoutId="sara-active-tab"
                             className={`absolute inset-0 rounded-[6px] z-[-1] ${
                               isZenMode 
                                 ? 'bg-white/10 ring-1 ring-white/10' 
                                 : 'bg-white text-[#4e5bff] shadow-[0_3px_10px_rgba(78,91,255,0.12)] border border-slate-200/60'
                             }`}
                             style={isZenMode ? { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' } : undefined}
                             transition={{ type: 'spring', damping: 20, stiffness: 220 }}
                           />
                         )}
                         <span className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                           {getTabIcon(t)}
                           <span className="text-[7px] leading-none">{tabLabels[t]}</span>
                         </span>
                       </button>
                     );
                   })}
                </div>
               
               <div className="flex-1 overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={(leftPanelMode === 'visualizer' || leftPanelMode === 'challenge') ? (selectedNeuralNode ? `node-${selectedNeuralNode.id}` : 'visualizer-empty') : activeRightTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 flex flex-col overflow-hidden"
                    >
                      {(leftPanelMode === 'visualizer' || leftPanelMode === 'challenge') ? (
                        selectedNeuralNode ? (
                          <NodeDetailPanel 
                            node={selectedNeuralNode} 
                            moduleTitle={module?.title || ''} 
                            onClose={() => setSelectedNeuralNode(null)}
                            isSidebar={true}
                            isZenMode={isZenMode}
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
                                      className="h-full flex flex-col items-center justify-center text-center py-8 px-5"
                                    >
                                       {/* Module-aware context header */}
                                       <div className="relative mb-5">
                                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#4e5bff]/8 text-[#4e5bff]'}`}>
                                             <Sparkles size={24} />
                                          </div>
                                       </div>
                                       <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] mb-1.5 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                                          SARA Ready
                                       </h3>
                                       <p className={`text-[10px] font-medium leading-relaxed mb-6 px-2 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                          Focused on <span className={`font-bold ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>{module?.title || 'this module'}</span>
                                       </p>
                                       {/* Action cards grid */}
                                       <div className="w-full space-y-2">
                                          <button onClick={() => handleSendMessage("Give me a high-level summary of this module.")} className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-left transition-all group ${isZenMode ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/5' : 'bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 hover:border-[#4e5bff]/15'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#4e5bff]/8 text-[#4e5bff]'}`}><BookOpen size={14} /></div>
                                            <div className="flex flex-col min-w-0">
                                              <span className={`text-[10px] font-bold ${isZenMode ? 'text-white' : 'text-slate-800'}`}>Summarize Module</span>
                                              <span className="text-[9px] text-slate-400 font-medium">Get the key points fast</span>
                                            </div>
                                          </button>
                                          <button onClick={() => handleSendMessage("What are the 3 most important concepts here?")} className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-left transition-all group ${isZenMode ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/5' : 'bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 hover:border-[#4e5bff]/15'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isZenMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-500/8 text-amber-600'}`}><Target size={14} /></div>
                                            <div className="flex flex-col min-w-0">
                                              <span className={`text-[10px] font-bold ${isZenMode ? 'text-white' : 'text-slate-800'}`}>Core Concepts</span>
                                              <span className="text-[9px] text-slate-400 font-medium">3 essentials to master</span>
                                            </div>
                                          </button>
                                          <button onClick={() => handleSendMessage("Give me a quick 3-question mastery check.")} className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-left transition-all group ${isZenMode ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/5' : 'bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 hover:border-emerald-500/15'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isZenMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/8 text-emerald-600'}`}><Zap size={14} /></div>
                                            <div className="flex flex-col min-w-0">
                                              <span className={`text-[10px] font-bold ${isZenMode ? 'text-white' : 'text-slate-800'}`}>Quick Quiz</span>
                                              <span className="text-[9px] text-slate-400 font-medium">Test your understanding</span>
                                            </div>
                                          </button>
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
                                        <div className={`max-w-[88%] text-[13px] leading-relaxed group relative ${m.role === 'user' ? 'user-message-bubble' : 'sara-message-bubble'}`}>
                                          {/* SARA avatar indicator */}
                                          {m.role === 'model' && (
                                            <div className="flex items-center gap-2 mb-2.5">
                                              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isZenMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[#4e5bff]/10 text-[#4e5bff]'}`}>
                                                <Sparkles size={10} />
                                              </div>
                                              <span className={`text-[9px] font-bold uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>SARA</span>
                                            </div>
                                          )}
                                          <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'text-white prose-invert' : (isZenMode ? 'prose-invert text-slate-100' : 'text-slate-800')}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={ChatMarkdownComponents}>{m.text}</ReactMarkdown>
                                          </div>
                                          
                                          {m.role === 'model' && (
                                            <div className={`mt-3 pt-2.5 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 ${isZenMode ? 'border-t border-white/5' : 'border-t border-slate-100'}`}>
                                                  <button 
                                                    onClick={() => {
                                                      setNotes(prev => {
                                                        const newNotes = prev + `\n\n### Insight from SARA\n${m.text}`;
                                                        if (pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, newNotes);
                                                        return newNotes;
                                                      });
                                                      toast.success("Added to Notes");
                                                    }}
                                                    className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isZenMode ? 'text-indigo-400 hover:text-white' : 'text-[#4e5bff] hover:text-[#4e5bff]/80'}`}
                                                  >
                                                    Save to Notes
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                      handleAddToVault(`SARA Insight: ${module?.title}`, m.text, 'insight', 'SARA assistant');
                                                    }}
                                                    className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isZenMode ? 'text-emerald-400 hover:text-white' : 'text-emerald-600 hover:text-emerald-500'}`}
                                                  >
                                                    Vault It
                                                  </button>
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
                              <div className={`p-4 border-t ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                                 {/* Module context badge */}
                                 <div className="flex items-center gap-1.5 mb-2 px-1">
                                   <div className={`w-1 h-1 rounded-full ${isZenMode ? 'bg-indigo-400' : 'bg-[#4e5bff]'}`} />
                                   <span className={`text-[8px] font-bold uppercase tracking-widest ${isZenMode ? 'text-slate-600' : 'text-slate-350'}`}>
                                     Focused on: {module?.title ? (module.title.length > 28 ? module.title.slice(0, 28) + '...' : module.title) : 'Module'}
                                   </span>
                                 </div>
                                 <div className="relative">
                                    <textarea 
                                      ref={chatInputRef}
                                      rows={1}
                                      value={inputMessage}
                                      onChange={(e) => setInputMessage(e.target.value)}
                                      onKeyDown={handleKeyDown}
                                      placeholder={isListening ? "Listening... Speak now!" : "Ask SARA anything..."}
                                      className={`w-full rounded-2xl py-3 pl-4 pr-24 text-[13px] font-medium outline-none transition-all resize-none overflow-y-auto custom-scrollbar leading-normal ${
                                        isListening
                                          ? (isZenMode ? 'border-rose-500/40 ring-2 ring-rose-500/10 bg-[#0c0d10] text-white placeholder:text-rose-400/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-rose-400/60 ring-2 ring-rose-500/8 bg-white text-slate-900 placeholder:text-rose-500/50 shadow-[0_0_15px_rgba(239,68,68,0.06)]')
                                          : (isZenMode
                                              ? 'haptic-glow-input text-white placeholder:text-slate-600'
                                              : 'bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-[#4e5bff]/30 focus:ring-2 focus:ring-[#4e5bff]/8 focus:bg-white')
                                      }`}
                                      style={{ minHeight: '48px', maxHeight: '120px' }}
                                    />
                                    <button 
                                      aria-label={isListening ? "Stop voice input" : "Start voice input"} 
                                      title={isListening ? "Stop voice input" : "Voice input"} 
                                      onClick={toggleSpeechToText} 
                                      className={`absolute right-12 bottom-1.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                                        isListening 
                                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse' 
                                          : (isZenMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-[#4e5bff] hover:bg-slate-200/60')
                                      }`}
                                    >
                                      <Mic size={16} className={isListening ? 'animate-bounce' : ''} />
                                    </button>
                                    <button aria-label="Send message" title="Send message" onClick={() => handleSendMessage()} className={`absolute right-1.5 bottom-1.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isZenMode ? 'bg-white text-[#05070a] shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#4e5bff] text-white shadow-md shadow-indigo-500/15'}`}>
                                      <Send size={16} />
                                    </button>
                                 </div>
                              </div>
                            </div>
                          )}
                          {activeRightTab === 'notes' && <RichNotesEditor isZenMode={isZenMode} content={notes} moduleTitle={module?.title} keyConcepts={module?.keyConcepts || []} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />}
                          {activeRightTab === 'quiz' && (
                            <div className={`h-full flex flex-col ${isZenMode ? 'bg-transparent' : 'bg-transparent'}`}>
                              {quizState === 'active' && quizQuestions.length > 0 ? (
                                <SARAQuizPanel 
                                  questions={quizQuestions} 
                                  isZenMode={isZenMode} 
                                  onRestart={() => setQuizState('idle')} 
                                  onSaveToVault={(item) => setVaultItems(prev => [item, ...prev])}
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
                                      } catch (e: any) {
                                        const msg = e?.message || "Please check your network or try again.";
                                        toast.error(`Failed to generate assessment: ${msg}`);
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
                          {activeRightTab === 'architecture' && (
                            <SARAArchitecturePanel isZenMode={isZenMode} module={module} />
                          )}
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </main>
          </>
        )}

      {/* Star Constellation Tooltip Capsule */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: -7, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', damping: 15, stiffness: 150 }}
            className="fixed z-[999] px-4 py-1.8 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#0c0d10]/90 backdrop-blur-xl text-white border border-[#4e5bff]/30 shadow-[0_4px_20px_rgba(78,91,255,0.22)] pointer-events-none -translate-x-1/2 flex items-center gap-1.5"
            style={{ left: hoveredNode.x, top: hoveredNode.y + 22 }}
          >
            <Sparkles size={9} className="text-[#38bdf8] animate-pulse" />
            <span>{hoveredNode.title}</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-[#0c0d10]/90" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Locked Module Tooltip */}
      <AnimatePresence>
        {hoveredLockedModule && (
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            className="fixed z-[9999] p-5 rounded-[24px] w-64 bg-[#08090d]/90 backdrop-blur-2xl text-white border border-red-500/15 shadow-[0_20px_50px_-15px_rgba(239,68,68,0.25)] pointer-events-none -translate-y-1/2 flex flex-col gap-2.5 overflow-hidden"
            style={{ left: hoveredLockedModule.x + 16, top: hoveredLockedModule.y }}
          >
            {/* Background red soft glow aura */}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-red-500/5 blur-2xl pointer-events-none z-0" />
            
            <div className="relative z-10 flex flex-col gap-2.5 w-full">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-rose-500/10 text-rose-400 shrink-0">
                  <Lock size={12} className="text-rose-450 animate-pulse" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">Module Locked</span>
              </div>
              
              <h4 className="text-[13px] font-black leading-snug tracking-tight text-white">{hoveredLockedModule.title}</h4>
              
              <div className="h-px bg-white/5 my-1" />
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Prerequisites Required:</span>
                <div className="flex flex-col gap-1.5">
                  {hoveredLockedModule.prerequisites.map((title, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-normal">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500/40 shrink-0 mt-1" />
                      <span className="font-medium truncate">{title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Custom pointer anchor indicator */}
            <div className="absolute top-1/2 -left-[4px] -translate-y-1/2 border-[4px] border-transparent border-r-[#08090d]/90 z-20" />
          </motion.div>
        )}
      </AnimatePresence>

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
