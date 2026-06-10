import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import SARAVaultPanel from '../features/study/SARAVaultPanel';
import { useAppStore } from '../context/Store';
import {
  generateModuleContent,
  scoutResources,
  chatWithTutor,
  generateQuizForModule,
  triggerBackgroundPreGeneration
} from '../services/geminiService';
import { ChatMessage, QuizQuestion, KnowledgeMilestone, ContentCitation, Resource, VideoSegment, SmartboardJumpEventDetail, KnowledgeNode, MasteryStatus, SandboxState } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, UploadCloud, ChevronLeft, ChevronRight,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye, GitBranch, Layout, Target, ShieldCheck,
  Play, Pause, Clock, Music, Volume2, Copy, ChevronDown
} from 'lucide-react';
import { ModelSelector, PROVIDER_MODELS } from '../components/ui/ModelSelector';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import ContentRenderer from '../components/ui/ContentRenderer';
import KnowledgeMap from '../components/knowledge-map/KnowledgeMap';
import PracticeCompiler from '../components/practice/PracticeCompiler';
import FloatingSandboxPanel from '../components/study/FloatingSandboxPanel';
import Smartboard from '../features/study/Smartboard';
import AITerminalOverlay, { ActionType } from '../components/ui/AITerminalOverlay';
import { mapMasteryTimeline } from '../services/geminiService';
import { soundscape } from '../services/soundscapeService';
import { sanitizeVideoId } from '../utils/youtube';

import { useFocus } from '../context/FocusContext';
import { useFocusSession } from '../hooks/useFocusSession';
import { motion, AnimatePresence } from 'framer-motion';
import SARAActionChips from '../components/ui/SARAActionChips';
import SARAQuizPanel from '../features/study/SARAQuizPanel';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';
import CodeSandbox from '../components/ui/CodeSandbox';
import MermaidDiagram from '../components/ui/MermaidDiagram';
import { ClassroomPlaybackProvider, useClassroomPlayback } from '../context/ClassroomPlaybackContext';
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
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = prefix + selectedText + suffix;
    const newValue = text.substring(0, start) + replacement + text.substring(end);

    onChange(newValue);

    // Refocus and reset cursor position after state change
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  const handleCopy = () => {
    if (!content.trim()) {
      toast.error("Notes are empty. Nothing to copy.");
      return;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Notes copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-transparent' : 'bg-white shadow-xl'}`}>
      {/* Top Header/Toolbar */}
      <div className={`flex flex-col border-b ${isZenMode ? 'border-white/5 bg-white/5' : 'border-slate-200/60 bg-slate-50/40'}`}>
        <div className="flex items-center justify-between gap-1.5 px-4 py-3">
          <div className="flex items-center gap-2">
             <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Knowledge Base</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-205/50">
              <button
                onClick={() => setIsPreview(false)}
                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer ${
                  !isPreview
                    ? (isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-[#4e5bff] shadow-sm')
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setIsPreview(true)}
                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer ${
                  isPreview
                    ? (isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-[#4e5bff] shadow-sm')
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Preview
              </button>
            </div>

            <button
              onClick={handleCopy}
              title="Copy notes"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isZenMode
                  ? 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Formatting toolbar (only in Edit mode) */}
        {!isPreview && (
          <div className={`flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto select-none ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
            {[
              { label: 'Bold', syntax: ['**', '**'], icon: <Bold size={10} /> },
              { label: 'Italic', syntax: ['*', '*'], icon: <Italic size={10} /> },
              { label: 'Code', syntax: ['`', '`'], icon: <span className="font-mono text-[9px] font-black leading-none">`</span> },
              { label: 'List', syntax: ['- ', ''], icon: <ListIcon size={10} /> },
              { label: 'Heading', syntax: ['### ', ''], icon: <span className="font-bold text-[9px] leading-none">H3</span> },
            ].map((tool) => (
              <button
                key={tool.label}
                onClick={() => insertMarkdown(tool.syntax[0], tool.syntax[1])}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isZenMode
                    ? 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-350 shadow-sm'
                }`}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {isPreview ? (
          <div className={`absolute inset-0 overflow-y-auto p-6 prose prose-sm max-w-none custom-scrollbar text-justify hyphens-auto ${isZenMode ? 'prose-invert prose-p:text-slate-300' : 'prose-slate bg-white'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*No notes yet...*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your notes in Markdown..."
            className={`absolute inset-0 w-full h-full resize-none p-6 text-[13px] leading-relaxed font-mono focus:outline-none custom-scrollbar ${isZenMode ? 'bg-transparent text-slate-300' : 'bg-white text-slate-700'}`}
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

const isSyntheticFallbackContent = (content?: string | null) => {
  if (!content) return false;
  return (
    /AI Synthesis Paused|Gemini key blocked|Content will auto-refresh once quota resets|Core ideas for .*?\n\n## Core Concepts/i.test(content) ||
    /quota exceeded|resource_exhausted|exceeded your current quota|"code":\s*429/i.test(content)
  );
};

const isLegacyModuleContent = (content?: string | null, keyConcepts?: string[]) => {
  if (!content || !keyConcepts || keyConcepts.length === 0) return false;
  const hasLegacyHeadings = content.includes('## Core Concepts') || content.includes('## How It Works') || content.includes('## Common Patterns & Best Practices');
  if (hasLegacyHeadings) {
    const hasConceptHeading = keyConcepts.some(c => {
      const escaped = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const h2Reg = new RegExp(`^#{2,3}\\s+${escaped}`, 'im');
      return h2Reg.test(content);
    });
    if (!hasConceptHeading) {
      return true;
    }
  }
  return false;
};

const cleanInnerCode = (code: string) => {
  return code.replace(/^```\w*\n/, '').replace(/\n```$/, '').trim();
};

const parseMessageWithArtifacts = (text: string) => {
  const regex = /<VidhyalayaArtifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+name="([^"]+)")?>([\s\S]*?)<\/VidhyalayaArtifact>/g;
  const blocks = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex, startIndex),
      });
    }

    blocks.push({
      type: 'artifact',
      artifactType: match[1],
      language: match[2] || 'javascript',
      name: match[3] || '',
      content: match[4],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
};

const analyzeCompilerError = (error: string) => {
  const errLower = error.toLowerCase();
  if (errLower.includes('bounds') || errLower.includes('indexout') || (errLower.includes('undefined') && errLower.includes('index'))) {
    return "Hey, your array bounds check failed inside your index calculation. Let's fix this together.";
  }
  if (errLower.includes('syntax') || errLower.includes('unexpected token') || errLower.includes('parse error')) {
    return "Hey, looks like a syntax error or a typo in your brackets. Let's fix this together.";
  }
  if (errLower.includes('is not defined') || errLower.includes('cannot find name')) {
    const varMatch = error.match(/(?:name|defined)\s+'?([\w\d_]+)'?/i) || error.match(/'?([\w\d_]+)'?\s+is not defined/i);
    const varName = varMatch ? `"${varMatch[1]}"` : 'a variable';
    return `Hey, it looks like a reference error: ${varName} is not defined. Let's fix this together.`;
  }
  if (errLower.includes('nullpointer') || errLower.includes('cannot read properties of null')) {
    return "Hey, you hit a null pointer dereference or null property access. Let's fix this together.";
  }
  if (errLower.includes('type') || errLower.includes('not assignable') || errLower.includes('typeerror')) {
    return "Hey, you encountered a TypeScript or variable type mismatch. Let's fix this together.";
  }
  return "Hey, your code failed to compile. Let's trace the error together.";
};

interface ChatMessageContentRendererProps {
  text: string;
  msgId: string;
  isLatest: boolean;
  isZenMode: boolean;
  components: any;
  onAskSara?: (prompt: string) => void;
}

const ChatMessageContentRenderer: React.FC<ChatMessageContentRendererProps> = ({
  text,
  msgId,
  isLatest,
  isZenMode,
  components,
  onAskSara
}) => {
  const blocks = React.useMemo(() => parseMessageWithArtifacts(text), [text]);

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return (
            <TypewriterMarkdown
              key={`${msgId}-block-${idx}`}
              text={block.content}
              msgId={`${msgId}-${idx}`}
              isLatest={isLatest && idx === blocks.length - 1}
              components={components}
            />
          );
        }

        if (block.artifactType === 'sandbox') {
          return (
            <div key={`${msgId}-block-${idx}`} className="my-4 rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950 shadow-xl max-w-full text-left select-text">
              <div className="px-4 py-2 bg-zinc-900 border-b border-white/[0.05] text-[11px] font-mono text-zinc-400 flex justify-between items-center select-none">
                <span>⚡ Interactive Live Workspace {block.name ? `(${block.name})` : ''}</span>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={cleanInnerCode(block.content)}
                  initialLanguage={block.language}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={onAskSara}
                />
              </div>
            </div>
          );
        }

        if (block.artifactType === 'mermaid') {
          return (
            <div key={`${msgId}-block-${idx}`} className="my-4 rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950/80 shadow-xl h-[300px] text-left select-none">
              <div className="px-4 py-2 bg-zinc-900 border-b border-white/[0.05] text-[11px] font-mono text-zinc-400">
                📊 Interactive Diagram
              </div>
              <div className="h-[260px] relative animate-in fade-in duration-500">
                <MermaidDiagram chart={cleanInnerCode(block.content)} isZenMode={isZenMode} />
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

interface SessionFileDropZoneProps {
  activeModuleTitle: string;
  isZenMode?: boolean;
  onFileSelect: (file: File) => void;
}

const SessionFileDropZone: React.FC<SessionFileDropZoneProps> = ({
  activeModuleTitle,
  isZenMode,
  onFileSelect
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl transition-all duration-200 p-4 cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 select-none ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/5 text-indigo-400'
          : isZenMode
            ? 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:bg-white/[0.04]'
            : 'border-slate-200 bg-slate-50/50 text-slate-650 hover:border-indigo-400 hover:bg-indigo-50/10'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <UploadCloud size={16} className={`animate-pulse ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
      <span className="text-[10px] font-bold tracking-wide">
        Drop reference files or click to upload
      </span>
      <span className="text-[8.5px] text-slate-500 max-w-[200px] leading-normal">
        Inject files directly to hydrate the sandbox workspace & video playlists.
      </span>
    </div>
  );
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const { seekToTimestamp } = useClassroomPlayback();
  const navigate = useNavigate();
  const {
    paths, loadPathDetail, isCloudSynced, updateModuleStatus, saveModuleNotes, saveModuleContent, saveModuleCitations, replaceModuleResources,
    saveModuleKnowledgeGraph, saveNodeMastery, saveModuleSandboxState, byokMode, byokConfig, updateByokConfig, updateByokMode,
  } = useAppStore();
  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);
  const citations = module?.citations || [];

  useEffect(() => {
    if (pathId && (!path || !path.phases)) {
      void loadPathDetail(pathId);
    }
  }, [pathId, path]);

  const getActiveModelName = () => {
    if (byokMode === 'custom' && byokConfig) {
      if (byokConfig.preferredModel?.trim()) {
        const found = (PROVIDER_MODELS[byokConfig.provider] || []).find(m => m.id === byokConfig.preferredModel);
        if (found) return `${found.name} (BYOK)`;
        return `${byokConfig.preferredModel.trim()} (BYOK)`;
      }
      const providerNames: Record<string, string> = {
        gemini: 'Gemini 2.5 Flash',
        openai: 'gpt-4o-mini',
        anthropic: 'Claude 3.5 Sonnet',
        groq: 'Llama 3.3',
        openrouter: 'OpenRouter Model',
      };
      const providerLabel = providerNames[byokConfig.provider] || 'Custom Model';
      return `${providerLabel} (BYOK)`;
    }
    return 'Gemini 2.5 Flash';
  };

  const handleModelSelectChange = (val: string) => {
    if (val === 'auto') {
      updateByokMode('auto');
      toast.success('Switched to Auto (System Choice) 🔒');
    } else {
      const slashIndex = val.indexOf('/');
      if (slashIndex !== -1) {
        const provider = val.substring(0, slashIndex);
        const preferredModel = val.substring(slashIndex + 1);
        
        // Retrieve key from cache or existing config
        const cachedKeysRaw = localStorage.getItem('vidyal_byok_keys_cache') || '{}';
        let key = localStorage.getItem(`vidyal_byok_key_${provider}`) || '';
        if (!key) {
          try {
            const cachedKeys = JSON.parse(cachedKeysRaw);
            key = cachedKeys[provider] || '';
          } catch {}
        }
        
        if (!key && byokConfig && byokConfig.provider === provider) {
          key = byokConfig.apiKey || '';
        }
        
        updateByokConfig({
          provider: provider as any,
          apiKey: key,
          preferredModel,
        });
        updateByokMode('custom');
        toast.success(`Switched to Custom model: ${preferredModel} 🔓`);
        
        if (!key) {
          toast.warning(`API key for ${provider} is not set. Please add it in Settings.`);
        }
      }
    }
  };

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
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer' | 'practice'>('smartboard');
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);
  const autoSelectedModuleRef = useRef<string | null>(null);
  const [focusMode, setFocusMode] = useState<'content' | 'split'>('split');
  const [saraOpen, setSaraOpen] = useState(true);
  const [sandboxCode, setSandboxCode] = useState(DEFAULT_SANDBOX_CODE);
  const [sandboxLanguage, setSandboxLanguage] = useState('javascript');
  const [sandboxForceInitialCode, setSandboxForceInitialCode] = useState(false);
  const [sandboxRunTrigger, setSandboxRunTrigger] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [sandboxVersion, setSandboxVersion] = useState(0);
  const [practiceCode, setPracticeCode] = useState<string | null>(null);
  const [practiceLanguage, setPracticeLanguage] = useState<string | null>(null);
  const [isNeuralFullScreen] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [milestones, setMilestones] = useState<KnowledgeMilestone[]>([]);
  const [localCitations, setLocalCitations] = useState<ContentCitation[]>([]);

  // Zen Mode Controls Auto-Hide
  const [showZenControls, setShowZenControls] = useState(true);
  const zenControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetZenControlsTimeout = useCallback(() => {
    if (!isZenMode) return;
    setShowZenControls(true);
    if (zenControlsTimeoutRef.current) {
      clearTimeout(zenControlsTimeoutRef.current);
    }
    zenControlsTimeoutRef.current = setTimeout(() => {
      setShowZenControls(false);
    }, 3000);
  }, [isZenMode]);

  const handleZenControlsPointerLeave = useCallback(() => {
    if (!isZenMode) return;
    if (zenControlsTimeoutRef.current) {
      clearTimeout(zenControlsTimeoutRef.current);
    }
    zenControlsTimeoutRef.current = setTimeout(() => {
      setShowZenControls(false);
    }, 800);
  }, [isZenMode]);

  useEffect(() => {
    if (isZenMode) {
      resetZenControlsTimeout();
    } else {
      setShowZenControls(true);
      if (zenControlsTimeoutRef.current) {
        clearTimeout(zenControlsTimeoutRef.current);
      }
    }
  }, [isZenMode, resetZenControlsTimeout]);

  useEffect(() => {
    return () => {
      if (zenControlsTimeoutRef.current) {
        clearTimeout(zenControlsTimeoutRef.current);
      }
    };
  }, []);

  // Soundscape Focus Beats States
  const [soundscapeState, setSoundscapeState] = useState(() => {
    const savedVol = localStorage.getItem('vidyalai_soundscape_volume');
    return {
      binaural: false,
      rain: false,
      synth: false,
      volume: savedVol ? parseFloat(savedVol) : 0.5,
    };
  });

  const isAudioActive = soundscapeState.binaural || soundscapeState.rain || soundscapeState.synth;

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
    return () => {
      soundscape.stopAll();
    };
  }, []);

  // Missing variables and stubs from standardizations/merges
  const [curatedVideoId, setCuratedVideoId] = useState<string | null>(null);
  const [scoutedVideoIds, setScoutedVideoIds] = useState<{ id: string; title: string; channel?: string }[]>([]);
  const [videoTimeline, setVideoTimeline] = useState<VideoSegment[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');
  const [lastCompilationError, setLastCompilationError] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalAction, setTerminalAction] = useState<ActionType>('refresh');

  const [searchParams] = useSearchParams();
  const isFromClassroom = searchParams.get('entry') === 'classroom';

  type StudyWorkspaceMode = 'smartboard' | 'content' | 'visualizer' | 'practice';
  const workspaceMode = leftPanelMode;
  const setWorkspaceMode = (mode: StudyWorkspaceMode) => setLeftPanelMode(mode);

  const sanitizeSaraMessage = (text: string) => text;
  const handleJumpToTimestamp = (seconds: number) => {
    seekToTimestamp(seconds);
    setLeftPanelMode('smartboard');
  };

  const handleAddToVault = (title: string, content: string, type: 'insight' | 'citation', source: string) => {
    const newItem = {
      id: uuidv4(),
      title,
      content,
      type,
      source,
      timestamp: Date.now(),
    };
    setVaultItems(prev => [newItem, ...prev]);
    toast.success("Added to SARA Vault.");
  };

  const currentSandboxStateRef = useRef<SandboxState | null>(null);
  const prevModuleRef = useRef<{ pathId: string; phaseId: string; moduleId: string } | null>(null);

  // Auto-save previous module sandbox state on module switch
  useEffect(() => {
    if (prevModuleRef.current) {
      const { pathId: pId, phaseId: phId, moduleId: mId } = prevModuleRef.current;
      if (currentSandboxStateRef.current) {
        saveModuleSandboxState(pId, phId, mId, currentSandboxStateRef.current);
      }
    }
    // Reset sandbox state ref for the new module
    currentSandboxStateRef.current = null;

    if (pathId && phaseId && moduleId) {
      prevModuleRef.current = { pathId, phaseId, moduleId };
    } else {
      prevModuleRef.current = null;
    }
  }, [pathId, phaseId, moduleId, saveModuleSandboxState]);

  // Auto-save on page exit / component unmount
  useEffect(() => {
    return () => {
      if (prevModuleRef.current && currentSandboxStateRef.current) {
        const { pathId: pId, phaseId: phId, moduleId: mId } = prevModuleRef.current;
        saveModuleSandboxState(pId, phId, mId, currentSandboxStateRef.current);
      }
    };
  }, [saveModuleSandboxState]);

  const handleSandboxStateChange = useCallback((state: SandboxState) => {
    currentSandboxStateRef.current = state;
  }, []);

  const handleFileDrop = async (file: File) => {
    if (!file || !moduleId) return;

    const loadingToast = toast.loading(`Injecting ${file.name} into study session...`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textContent = event.target?.result as string;

        const { api } = await import('../services/api');
        const data = await api.injectSessionFile(
          moduleId,
          file.name,
          textContent,
          file.type || 'text/plain',
          module?.title || ''
        );

        if (data.success) {
          // 1. Instantly update the file tab state tree in Zustand store
          if (data.injectedWorkspaceFile) {
            const currentSandbox = module?.sandboxState || {
              files: {},
              activeFile: '',
              language: 'javascript' as const,
              exerciseIndex: 0,
              attempts: {},
              completedExerciseIds: []
            };

            const nextSandboxState = {
              ...currentSandbox,
              files: {
                ...currentSandbox.files,
                [data.injectedWorkspaceFile.name]: data.injectedWorkspaceFile.content
              },
              activeFile: data.injectedWorkspaceFile.name,
              language: data.injectedWorkspaceFile.name.endsWith('.py') ? ('python' as const) : ('javascript' as const)
            };

            // Save to Zustand store
            saveModuleSandboxState(pathId!, phaseId!, moduleId!, nextSandboxState);
            
            // Force re-mount of sandbox by incrementing version
            setSandboxVersion(prev => prev + 1);

            // Set active file code in workspace
            setSandboxCode(data.injectedWorkspaceFile.content);
            setSandboxLanguage(data.injectedWorkspaceFile.name.endsWith('.py') ? 'python' : 'javascript');
            setSandboxForceInitialCode(true);
            setSandboxPanelOpen(true);
          }

          // 2. Refresh the video playlist track list view
          if (data.contextualVideos && data.contextualVideos.length > 0) {
            const mappedVideos = data.contextualVideos.map((v: any) => ({
              id: v.id,
              title: v.title,
              channel: v.channel
            }));
            setScoutedVideoIds(mappedVideos);
            setCuratedVideoId(mappedVideos[0].id);

            // Re-map the timeline based on the new context
            try {
              const videoIds = mappedVideos.map((v: any) => v.id);
              const timeline = await mapMasteryTimeline(textContent.substring(0, 1500), videoIds);
              setVideoTimeline(timeline);
            } catch (timelineErr) {
              console.warn('Failed to update timeline:', timelineErr);
            }
          }

          // 3. Add system alert in chat history notifying user about context change
          const systemMsgId = uuidv4();
          setChatHistory(prev => [
            ...prev,
            {
              id: systemMsgId,
              role: 'model',
              text: `📥 **Context Hydrated**: I've injected \`${file.name}\` into your workspace. \n\n* The **Sandbox Compiler** has loaded the file as \`src/${file.name}\` into the editor.\n* The **Video Scout Engine** has refreshed video playlists using technical patterns from this file.\n* My chat assistant is now grounded in this custom reference context. Ask me anything about it!`,
              timestamp: Date.now(),
              mode: 'PairProgrammer'
            }
          ]);

          toast.success(`Success: Injected ${file.name} into active session!`, { id: loadingToast });
        } else {
          toast.error(data.error || 'Failed to inject file', { id: loadingToast });
        }
      } catch (err: any) {
        console.error('File drop injection failed:', err);
        toast.error(`Error: ${err.message || 'File upload failed.'}`, { id: loadingToast });
      }
    };

    reader.readAsText(file);
  };

  // Sequence Lock Guard: Prevent access to locked modules via URL bypass
  useEffect(() => {
    if (path && module) {
      const isLocked = (() => {
        if (!module.dependsOnModuleIds?.length) return false;
        const allModules = path.phases.flatMap(p => p.modules);
        return module.dependsOnModuleIds.some(depId => {
          const m = allModules.find(x => x.id === depId);
          return m && !m.isCompleted;
        });
      })();

      if (isLocked) {
        toast.error(`"${module.title}" is locked. Complete the prerequisites first.`);
        navigate(`/path/${path.id}`, { replace: true });
      }
    }
  }, [path, module, navigate]);

  const handleSetWorkspaceMode = (mode: StudyWorkspaceMode) => {
    setWorkspaceMode(mode);
  };

  const openSandboxWithCode = (code: string, language = 'javascript') => {
    setSandboxCode(code || DEFAULT_SANDBOX_CODE);
    setSandboxLanguage(language || 'javascript');
    setSandboxForceInitialCode(true);
    setSandboxPanelOpen(true);
    setSaraOpen(true);
    setSandboxRunTrigger(prev => prev + 1);
    toast.success('Sandbox opened — run code beside SARA');
  };

  const getPanelModeIndex = () => {
    const modes = ['smartboard', 'content', 'visualizer', 'practice'];
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
    const resolvedLang = inferSandboxLanguage(code, language);
    setPracticeCode(code);
    setPracticeLanguage(resolvedLang);
    setLeftPanelMode('practice');
    toast.success('Attached code snippet to Practice tab');
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
        <p className="mb-2.5 last:mb-0 leading-relaxed text-[12px] font-medium text-justify hyphens-auto">
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
        <strong className={`font-extrabold ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>
          {children}
        </strong>
      ),
      h1: ({ children }: any) => (
        <h1 className={`text-[15px] font-black mt-4 mb-2 tracking-tight uppercase tracking-wide ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className={`text-[13px] font-black mt-3 mb-2 tracking-tight uppercase tracking-wide ${isZenMode ? 'text-indigo-300' : 'text-indigo-650'}`}>
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className={`text-[12px] font-bold mt-2 mb-1 tracking-tight ${isZenMode ? 'text-slate-300' : 'text-slate-800'}`}>
          {children}
        </h3>
      ),
      code: ({ inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        if (!inline && match && ['javascript', 'typescript', 'python', 'html'].includes(match[1]) && codeString.includes('// EXERCISE:')) {
          return (
            <div className="my-4 rounded-xl border border-white/[0.08] bg-zinc-950 shadow-inner overflow-hidden text-left select-text">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/[0.05] select-none">
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                  ⚡ Live Interactive Playground Task
                </span>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={codeString}
                  initialLanguage={match[1]}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={(prompt) => handleSendMessageRef.current(prompt)}
                />
              </div>
            </div>
          );
        }

        return (
          <code className={`${className || ''} px-1.5 py-0.5 rounded text-[11px] font-mono border ${isZenMode ? 'bg-white/5 text-indigo-300 border-white/5' : 'bg-slate-50 text-indigo-650 border-slate-200'}`} {...props}>
            {children}
          </code>
        );
      },
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-indigo-500 pl-3 my-3 italic text-[11px] text-slate-400 leading-relaxed">
          {children}
        </blockquote>
      )
    };
  }, [isZenMode]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
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

  const smartboardVideoIds = useMemo(() => [
    ...scoutedVideoIds,
    ...(module?.resources?.filter(r => r.type === 'youtube' && r.videoId && !scoutedVideoIds.some(s => s.id === r.videoId)).map(r => ({
      id: r.videoId!,
      title: r.title || '',
      channel: r.title || '',
    })) || []),
  ], [scoutedVideoIds, module?.resources]);

  const smartboardPrimaryId = curatedVideoId
    || scoutedVideoIds[0]?.id
    || module?.resources?.find(r => r.type === 'youtube')?.videoId
    || '';

  useEffect(() => {
    // Drop legacy browser keys so backend GEMINI_API_KEY is used.
    if (localStorage.getItem('vidyal_custom_gemini_api_key')) {
      localStorage.removeItem('vidyal_custom_gemini_api_key');
    }
  }, []);

  // Eliminated redundant moduleId useEffect since all resets are now handled atomically below

  useEffect(() => {
    if (module) {
      setNotes(module.userNotes || '');
      
      // Reset state vectors atomically on module switch to avoid async layout hydration race conditions
      setCuratedVideoId(null);
      setScoutedVideoIds([]);
      setVideoTimeline([]);
      setLocalCitations([]);
      setActiveChapterTitle('');
      setHasReachedBottom(false);
      setCurrentVideoId(null);
      setCurrentVideoTime(0);

      if (module.generatedContent && !isSyntheticFallbackContent(module.generatedContent) && !isLegacyModuleContent(module.generatedContent, module.keyConcepts || [])) {
        setGeneratedContent(module.generatedContent);
        setLocalCitations(module.citations || []);
        scoutAndMap(module.generatedContent);
      }
      else loadContent();
    }
  }, [module?.id]);

  // Silent Background Warm-up for the next module
  useEffect(() => {
    if (generatedContent && !isSyntheticFallbackContent(generatedContent) && nextModule && !nextModule.generatedContent && pathId && path) {
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
            replaceModuleResources,
            path.studyLens || 'roadmap',
            path.scholarPersona || 'visionary',
            path.cognitiveDensity || 'overview'
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
      // ── STEP 1: Seed verified resources immediately so synthesis is not blocked by web scouting ──
      let resources = module.resources || [];
      if (resources.length === 0) {
        const { getVideosByTopic } = await import('../services/videoLibrary');
        resources = getVideosByTopic(module.title || '', 4).map(video => ({
          id: `local-${video.id}`,
          title: video.title,
          type: 'youtube' as const,
          content: `https://www.youtube.com/watch?v=${video.id}`,
          videoId: video.id,
        }));
        if (resources.length > 0 && pathId && phaseId && moduleId) {
          replaceModuleResources(pathId, phaseId, moduleId, resources);
        }
      }

      // ── STEP 2: Generate content WITH the scouted resources ──
      let streamBuffer = '';
      const { content, citations } = await generateModuleContent(
        module?.title || '',
        module?.keyConcepts || [],
        path?.goal || 'General Mastery',
        resources,
        path?.studyLens || 'roadmap',
        path?.scholarPersona || 'visionary',
        path?.cognitiveDensity || 'overview',
        (chunk) => {
          streamBuffer += chunk;
          setGeneratedContent(streamBuffer);
        }
      );
      setGeneratedContent(content);
      setLocalCitations(citations || []);
      if (pathId && phaseId && moduleId) {
        saveModuleContent(pathId, phaseId, moduleId, content);
        if (citations) saveModuleCitations(pathId, phaseId, moduleId, citations);
      }

      // ── STEP 3: Map timeline (resources already scouted above) ──
      scoutAndMap(content, false, resources);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || '');
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate');
      const isKeyBlocked = /reported as leaked|api key|403|forbidden|permission/i.test(msg);
      setContentError(isKeyBlocked ? 'key' : isQuota ? 'quota' : 'error');
      const fallback = isKeyBlocked
        ? `## ${module?.title || ''}\n\n> **Gemini key blocked** — Google rejected the configured Gemini API key, so Cortex cannot synthesize this module yet.\n\n### What to do\n1. Create a new Gemini API key in Google AI Studio.\n2. Save it in Settings or the API setup screen.\n3. Reload this study session to generate the full module.\n\n### Key Concepts Waiting For Synthesis\n${(module?.keyConcepts || []).map(c => `- **${c}**`).join('\n') || '- Module concepts will appear after synthesis.'}`
        : `## ${module?.title || ''}\n\n> **AI Synthesis Paused** — Gemini did not return a completed module within the available synthesis window.\n\n### Key Concepts\n${(module?.keyConcepts || []).map(c => `- **${c}**`).join('\n')}\n\n### Study Tips\nWhile synthesis is paused, you can:\n1. Review the key concepts above\n2. Ask SARA specific questions in the Chat panel\n3. Use the Quiz tab to test your existing knowledge\n\nReload or retry after the model/key issue is resolved.`;
      setGeneratedContent(fallback);
      if (isKeyBlocked) toast.error('Gemini API key is blocked. Create a new key and save it in Settings.');
      else if (isQuota) toast.warning('API quota reached — showing cached mode. Quiz & Chat still work!');
      else toast.error('Content synthesis failed. Showing fallback mode.');
    } finally { setIsContentLoading(false); }
  };

  const scoutAndMap = async (content: string, force = false, preloadedResources?: Resource[]) => {
    if (!module || !path) return;
    setIsScouting(true);
    try {
      const { api } = await import('../services/api');
      const { sanitizeVideoId } = await import('../utils/youtube');

      let verifiedCurationVideos: { id: string; title: string; channel?: string }[] = [];
      let curatedId: string | undefined = undefined;

      try {
        const curation = await api.curateVideo({
          moduleTitle: module.title || '',
          keyConcepts: module.keyConcepts || [],
          goalContext: path.goal || 'General Mastery',
          contextText: content,
        });

        if (curation?.videos?.length) {
          const candidates = curation.videos
            .map(v => ({
              id: sanitizeVideoId(v.videoId),
              title: v.title || '',
              channel: v.channel || '',
            }))
            .filter(v => v.id);

          const apiVerified = await api.verifyVideos(candidates.map(v => v.id));
          const verifiedSet = new Set(apiVerified.map(v => v.id));
          verifiedCurationVideos = candidates
            .filter(v => verifiedSet.has(v.id))
            .map(v => {
              const meta = apiVerified.find(a => a.id === v.id);
              return {
                id: v.id,
                title: meta?.title || v.title,
                channel: meta?.channel || v.channel,
              };
            });

          if (verifiedCurationVideos.length > 0) {
            curatedId = verifiedCurationVideos[0].id;
          }
        } else if (curation?.videoId) {
          const id = sanitizeVideoId(curation.videoId);
          const check = await api.verifyVideos([id]);
          if (check.length > 0) {
            curatedId = id;
          }
        }
      } catch (curationErr) {
        console.error("Curation failed:", curationErr);
      }

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

      // Build unified video IDs set for timeline mapping
      const videoIdSet = new Set<string>();
      currentResources
        .filter(r => r.type === 'youtube' && r.videoId)
        .forEach(r => videoIdSet.add(r.videoId as string));
      
      verifiedCurationVideos.forEach(v => { if (v.id) videoIdSet.add(v.id); });
      if (curatedId) videoIdSet.add(curatedId);

      // Update state for smartboard rendering
      if (verifiedCurationVideos.length > 0) {
        setScoutedVideoIds(verifiedCurationVideos);
      }
      if (curatedId) {
        setCuratedVideoId(curatedId);
      }

      const videoIds = [...videoIdSet];
      if (videoIds.length > 0 && content) {
        const timeline = await mapMasteryTimeline(content, videoIds);
        setVideoTimeline(timeline);
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

  const packageChatContext = () => {
    const sandboxState = currentSandboxStateRef.current;
    const openFiles = sandboxState?.files
      ? Object.keys(sandboxState.files).map(name => ({ name, path: name }))
      : [];
    const activeEditorFile = sandboxState?.activeFile && sandboxState.files
      ? sandboxState.files[sandboxState.activeFile] || ''
      : '';
    const activeLanguage = sandboxState?.language || 'javascript';

    return {
      activePathId: pathId || null,
      activeModule: module?.title || null,
      currentSyllabusContext: generatedContent?.substring(0, 3000) || '',
      openFiles,
      activeEditorFile,
      activeLanguage,
      lastCompilationError,
      videoPlayback: currentVideoId ? { 
        id: currentVideoId, 
        timestamp: currentVideoTime,
        activeChapterTitle: activeChapterTitle || ''
      } : null,
    };
  };

  const handleSendMessage = async (text?: string, displayText?: string) => {
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
      const result = await chatWithTutor(chatHistory, sanitized, `Module: ${module?.title}`, generatedContent || '', undefined, packageChatContext());
      
      const newModelMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: result.text || '',
        timestamp: Date.now(),
        mode: result.mode,
        intent: result.intent,
        action: result.action,
        target: result.target,
        skill_update: result.skill_update,
        interactive_block: result.interactive_block,
      };

      setChatHistory(prev => [...prev, newModelMsg]);

      // ─── AI Layout Actions Trigger ───
      if (result.action === 'open_notes') {
        setActiveRightTab('notes');
        toast.info('SARA opened Notes');
      }

      // ─── Dynamic Skill Mastery Update ───
      if (result.skill_update && pathId && phaseId && moduleId && module) {
        const { concept, delta } = result.skill_update;
        const nodeId = concept.toLowerCase().replace(/\s+/g, '-');
        const currentMastery = (module.nodeMastery?.[nodeId] as MasteryStatus) || 'unknown';
        let nextMastery: MasteryStatus = currentMastery;

        if (delta > 0.02) {
          if (currentMastery === 'unknown') nextMastery = 'learning';
          else if (currentMastery === 'learning') nextMastery = 'understood';
          else if (currentMastery === 'understood' && delta >= 0.05) nextMastery = 'mastered';
        } else if (delta < -0.02) {
          nextMastery = 'unknown';
        }

        if (nextMastery !== currentMastery) {
          saveNodeMastery(pathId, phaseId, moduleId, nodeId, nextMastery);
          toast.success(`Concept "${concept}" mastery updated to ${nextMastery}!`);
        }
      }

    } catch (err: any) {
      const errorMsg = err?.message || '';
      // Build a contextual inline SARA error message — no toast, it appears right in the chat
      let saraErrorText = '';
      if (errorMsg.includes('image input') || errorMsg.includes('does not support')) {
        saraErrorText = `> ⚠️ **I can't process images or file paths** — please type your question as text.`;
      } else if (errorMsg.includes('AI_TIMEOUT') || errorMsg.includes('timeout')) {
        saraErrorText = `> ⏱️ **That request timed out.** The model took too long to respond.\n\n**Try this:** Tap the **⚡ model chip** below and choose a faster model (like **Gemini 1.5 Flash**).`;
      } else if (errorMsg.includes('quota') || errorMsg.includes('exhausted') || errorMsg.includes('429')) {
        saraErrorText = `> 🔴 **API quota reached.** You've hit the rate limit on the current model.\n\n**Fix it now:** Tap the **⚡ model chip** at the bottom and switch to a different model of your choice.`;
      } else if (errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unavailable') || errorMsg.includes('GEMINI_API_KEY')) {
        saraErrorText = `> 🔑 **Model connection failed.** Your current engine can't reach the API.\n\n**Fix it now:** Tap the **⚡ model chip** at the bottom and switch to a different provider or model, or go to **Settings → Custom Keys** to add your own key.`;
      } else {
        saraErrorText = `> ⚠️ **I couldn't generate a response** with the current model.\n\n**Suggestion:** Try switching models using the **⚡ model chip** at the bottom of the chat.`;
      }
      const errorModelMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: saraErrorText,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, errorModelMsg]);
      console.warn('[Chat] handleSendMessage error:', errorMsg);
    } finally { setIsTyping(false); }
  };

  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

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
      const urlStr = citation.url || '';
      const isYoutube = urlStr.includes('youtube.com') || urlStr.includes('youtu.be');
      if (isYoutube) {
        const vId = sanitizeVideoId(urlStr);
        if (vId) {
          const event = new CustomEvent<SmartboardJumpEventDetail>('smartboard-jump', {
            detail: { timestamp: 0, videoId: vId }
          });
          window.dispatchEvent(event);
          setLeftPanelMode('smartboard');
          toast.success('Loading source video inside Smartboard');
          return;
        }
      }
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
        handleSendMessageRef.current(prompt);
      }
    };
    document.addEventListener('sara-action', handleSaraAction);
    return () => document.removeEventListener('sara-action', handleSaraAction);
  }, []);

  useEffect(() => {
    const handleCodeInjection = (e: any) => {
      const detail = e.detail || {};
      if (!detail.code) return;
      openSandboxWithCode(detail.code, detail.language || 'javascript');
    };
    window.addEventListener('vidyal_inject_code', handleCodeInjection);
    return () => window.removeEventListener('vidyal_inject_code', handleCodeInjection);
  }, []);
  useEffect(() => {
    const handleCompilerError = (e: any) => {
      const detail = e.detail || {};
      const { error, code, language } = detail;
      if (!error) return;

      setLastCompilationError(error);

      const toastMessage = analyzeCompilerError(error);

      toast.error(toastMessage, {
        duration: 10000,
        action: {
          label: 'Debug Code',
          onClick: () => {
            setSaraOpen(true);
            setActiveRightTab('chat');
            const debugPrompt = `I got a compiler error in my ${language || 'code'} sandbox:\n\`\`\`\n${error}\n\`\`\`\n\nHere is my code:\n\`\`\`${language || ''}\n${code || ''}\n\`\`\`\n\nCan you help me fix it?`;
            handleSendMessageRef.current(debugPrompt, `Help me debug this compiler error: "${error.split('\n')[0]}"`);
          }
        }
      });
    };

    window.addEventListener('sara-compiler-error', handleCompilerError);
    return () => window.removeEventListener('sara-compiler-error', handleCompilerError);
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
    <div 
      className={`flex flex-col w-full h-full transition-colors duration-1000 overflow-hidden font-sans ${isZenMode ? 'bg-[#05070a]' : 'bg-transparent'}`}
      onPointerMove={resetZenControlsTimeout}
      onPointerLeave={handleZenControlsPointerLeave}
    >

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
          <header className={`shrink-0 overflow-hidden px-5 sm:px-8 grid grid-cols-3 items-center z-[60] transition-all duration-700 relative ${isZenMode || isNeuralFullScreen ? 'h-0 opacity-0 border-none pointer-events-none' : 'h-14 bg-[#0f0b6b] border-b border-white/10 shadow-sm'}`}>

            {/* Dynamic Glowing HSL Border Line */}
            {!isZenMode && !isNeuralFullScreen && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[1.5px] z-10"
                style={{
                  background: 'linear-gradient(90deg, transparent, #38bdf8, #8b5cf6, #38bdf8, transparent)',
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
                <Link to="/dashboard" aria-label="Back to Dashboard" title="Back to Dashboard" className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white text-[#0f0b6b] hover:bg-white/90 shadow-sm border border-white/20 flex items-center justify-center">
                  <ArrowLeft size={18} />
                </Link>
                <button
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center border ${
                    isCurriculumOpen
                      ? 'bg-white/25 text-white border-white/30 hover:bg-white/30'
                      : 'bg-white text-[#0f0b6b] hover:bg-white/90 border-white/20 shadow-sm'
                  }`}
                >
                  <GitBranch size={18} />
                </button>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full shrink-0 bg-white/10 text-indigo-200 border border-white/10">
                    Phase {path?.phases.findIndex(p => p.id === phaseId) !== -1 ? ((path?.phases.findIndex(p => p.id === phaseId) ?? 0) + 1).toString().padStart(2, '0') : '01'}
                  </span>
                  <span className="text-[9.5px] font-bold tracking-tight truncate text-indigo-200/70">{phase?.title}</span>
                </div>
                <h1 className="text-[14px] font-black tracking-tight leading-none truncate text-white">{module?.title}</h1>
              </div>
            </div>

            {/* Center Section: Mode Toggle (Animate with Brilliant Sliding Background) */}
            <div className="flex justify-center min-w-0">
              <div className="relative flex p-0.5 rounded-[12px] ring-1 transition-all bg-white/10 ring-white/10 border border-white/5 shadow-inner">
                {/* Sliding Background Indicator */}
                <motion.div
                  initial={false}
                  animate={{ x: getPanelModeIndex() * 88 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                  className="absolute top-0.5 bottom-0.5 w-[86px] rounded-[10px] z-0 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15),_0_0_8px_rgba(78,91,255,0.25)] ring-1 ring-white/10"
                />

                <button
                  onClick={() => setLeftPanelMode('smartboard')}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'smartboard' ? 'text-[#0f0b6b]' : 'text-white/60 hover:text-white'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'smartboard' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'smartboard' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Smartboard
                  </motion.span>
                </button>

                <button
                  onClick={() => setLeftPanelMode('content')}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'content' ? 'text-[#0f0b6b]' : 'text-white/60 hover:text-white'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'content' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'content' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Whiteboard
                  </motion.span>
                </button>
                <button
                  onClick={() => setLeftPanelMode('visualizer')}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'visualizer' ? 'text-[#0f0b6b]' : 'text-white/60 hover:text-white'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'visualizer' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'visualizer' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Neural Map
                  </motion.span>
                </button>
                <button
                  onClick={() => setLeftPanelMode('practice')}
                  className={`relative z-10 w-[86px] py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${leftPanelMode === 'practice' ? 'text-[#0f0b6b]' : 'text-white/60 hover:text-white'}`}
                >
                  <motion.span
                    animate={leftPanelMode === 'practice' ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: 0.6 }}
                    transition={leftPanelMode === 'practice' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    Practice
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
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                    : 'bg-white/10 border-white/15 text-white shadow-sm'
                }`}
              >
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
                  className="hover:scale-110 active:scale-95 transition-all text-current cursor-pointer flex items-center justify-center"
                >
                  {isTimerRunning ? <Pause size={10} strokeWidth={3} /> : <Play size={10} strokeWidth={3} />}
                </button>

                <div 
                  onDoubleClick={() => {
                    const originalTime = module?.estimatedMinutes ? module.estimatedMinutes * 60 : 25 * 60;
                    setTimeLeft(originalTime);
                    setTimerAlert(false);
                    toast.success("Timer reset to original module duration");
                  }}
                  title="Double-click to reset timer"
                  className="flex items-center gap-1.5 min-w-[50px] justify-center font-mono text-[10.5px] font-black tracking-wider relative cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {/* SVG Micro Circular Progress Ring */}
                  <div className="relative w-[18px] h-[18px] flex items-center justify-center shrink-0">
                    <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke={timerAlert ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth="1.8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke={timerAlert ? '#ef4444' : '#ffffff'}
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
                  className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer text-white"
                >
                  +5m
                </button>
              </div>

              <button
                onClick={() => setIsZenMode(!isZenMode)}
                className="flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all hover:scale-105 active:scale-95 bg-white text-[#0f0b6b] hover:bg-white/90 shadow-sm border border-white/20"
              >
                <Sparkles size={12} strokeWidth={2.4} />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] hidden sm:block">
                  Zen Mode
                </span>
              </button>

              <button
                onClick={() => {
                  const next = !saraOpen;
                  setSaraOpen(next);
                  setFocusMode(next ? 'split' : 'content');
                }}
                className="flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all hover:scale-105 active:scale-95 bg-white text-[#0f0b6b] hover:bg-white/90 shadow-sm border border-white/20"
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
                  <h2 className={`text-[clamp(17.5px,5.5cqw,21px)] font-bold tracking-tight ${isZenMode ? 'text-white' : 'text-[#444]'}`}>
                    {path?.title || 'Machine learning'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  {path?.phases?.map((p) => (
                    <div key={p.id} className="mb-6">
                      <div className="px-8 py-2">
                        <h4 className={`text-[clamp(15px,4.5cqw,17.5px)] font-normal ${isZenMode ? 'text-slate-400' : 'text-[#666]'}`}>{p.title}</h4>
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
                                  ? (isZenMode ? 'bg-white/5' : 'bg-[#4e5bff]/5')
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                 <div className={`shrink-0 transition-all duration-300 ${isActive ? 'translate-x-0 scale-110' : 'group-hover:translate-x-1.5'}`}>
                                   <div
                                     className={`w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] transition-colors ${isActive ? 'animate-pulse' : ''}`}
                                     style={{ borderLeftColor: isActive ? '#4e5bff' : (isZenMode ? '#444' : '#94a3b8') }}
                                   />
                                 </div>
                                 <span className={`text-[clamp(14px,4.5cqw,17px)] font-normal transition-colors truncate block leading-tight ${isActive ? (isZenMode ? 'text-white' : 'text-[#0f0b6b] font-semibold') : (isZenMode ? 'text-slate-400' : 'text-slate-600 group-hover:text-slate-900')}`}>
                                   {m.title}
                                 </span>
                              </div>
                              {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-[#4e5bff]" />
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
                     <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Path Progress</p>
                     <p className={`text-[13px] font-bold ${isZenMode ? 'text-white' : 'text-slate-600'}`}>{path?.progress}%</p>
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
              <div className={`absolute top-0 left-0 right-0 h-[52px] z-[100] flex items-center justify-between px-6 bg-[#05070a]/40 backdrop-blur-[15px] border-b border-white/5 shadow-2xl transition-all duration-300 ease-out ${
                showZenControls 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-full pointer-events-none'
              }`}>
                {/* Left: Indicator + Timer */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Zen Mode</span>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-px h-3 bg-white/10" />

                  {/* Zen Timer HUD Display */}
                  <div className={`flex items-center gap-2 px-2.5 py-0.5 rounded border transition-all ${
                    timerAlert
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-450 animate-pulse'
                      : 'bg-white/5 border-white/5 text-slate-200'
                  }`}>
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="hover:scale-110 active:scale-95 transition-all text-current cursor-pointer flex items-center justify-center"
                    >
                      {isTimerRunning ? <Pause size={9} strokeWidth={2.5} /> : <Play size={9} strokeWidth={2.5} />}
                    </button>
                    <span 
                      onDoubleClick={() => {
                        const originalTime = module?.estimatedMinutes ? module.estimatedMinutes * 60 : 25 * 60;
                        setTimeLeft(originalTime);
                        setTimerAlert(false);
                        toast.success("Timer reset to original module duration");
                      }}
                      title="Double-click to reset timer"
                      className="text-[10px] font-mono font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      {formatTimerTime(timeLeft)}
                    </span>
                    <button
                      onClick={() => handleAdjustTimer(5 * 60)}
                      className="text-[7.5px] px-1 rounded bg-white/5 text-slate-405 hover:text-white transition-colors cursor-pointer"
                    >
                      +5m
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-4 bg-white/10" />

                  {/* Audio icon + track buttons + volume */}
                  <div className="flex items-center gap-1.5">
                    <Music size={11} className={isAudioActive ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
                    {/* Sound-wave viz */}
                    <div className="flex items-end gap-[2px] h-3 pb-[1px]">
                      {[0.6, 1.1, 0.8, 1.2, 0.7].map((dur, i) => (
                        <div
                          key={i}
                          className="w-[2px] h-full rounded-full sound-wave-bar origin-bottom"
                          style={{
                            background: ['#4e5bff','#8b5cf6','#38bdf8','#8b5cf6','#4e5bff'][i],
                            animationDuration: `${dur}s`,
                            animationDelay: `${[0.1,0.35,0.18,0.45,0.25][i]}s`,
                            animationPlayState: isAudioActive ? 'running' : 'paused',
                            opacity: isAudioActive ? 1 : 0.2,
                          }}
                        />
                      ))}
                    </div>
                    {/* Track toggles — abbreviated */}
                    {([
                      { id: 'binaural' as const, label: 'BIN', title: 'Binaural Beats Focus Track' },
                      { id: 'rain' as const, label: 'RAIN', title: 'Natural Rain Background' },
                      { id: 'synth' as const, label: 'SYN', title: 'Deep Focus Synthesizer Drone' },
                    ]).map((tTrack) => {
                      const active = soundscapeState[tTrack.id];
                      return (
                        <button
                          key={tTrack.id}
                          onClick={() => toggleTrack(tTrack.id)}
                          title={tTrack.title}
                          className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            active 
                              ? 'bg-indigo-500/90 text-white shadow-[0_0_8px_rgba(99,102,241,0.45)]' 
                              : 'bg-white/5 text-slate-500 hover:text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {tTrack.label}
                        </button>
                      );
                    })}
                    {/* Volume slider */}
                    <div className="flex items-center gap-1 ml-1">
                      <Volume2 size={9} className="text-slate-500" />
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={soundscapeState.volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-14 h-[3px] bg-white/15 rounded-full appearance-none cursor-pointer accent-indigo-400"
                        title="Volume"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Exit button */}
                <button 
                  onClick={() => setIsZenMode(false)}
                  className="shrink-0 px-3.5 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-95"
                >
                  Exit Zen
                </button>
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
               <div className={`flex flex-col relative transition-all duration-500 flex-1 h-full min-w-0 min-h-0 z-10 ${isZenMode ? `border-r border-white/5 ${showZenControls ? 'pt-[52px]' : 'pt-0'}` : (leftPanelMode === 'content' ? 'bg-transparent' : 'border-r border-slate-200/50')}`}>
                  <div className="flex-1 overflow-hidden relative min-h-0">
                    {leftPanelMode === 'smartboard' ? (
                      <Smartboard
                        videoId={smartboardPrimaryId}
                        allVideoIds={smartboardVideoIds}
                        moduleTitle={module?.title || ''}
                        moduleContent={generatedContent}
                        goalContext={path?.goal || ''}
                        videoTimeline={videoTimeline}
                        isZenMode={isZenMode}
                        isContentLoading={isContentLoading}
                        isScouting={isScouting}
                        onReSync={() => {
                          if (generatedContent && !isSyntheticFallbackContent(generatedContent)) scoutAndMap(generatedContent, true);
                        }}
                        onTimeUpdate={(vId, time, chapterTitle) => {
                          setCurrentVideoId(vId);
                          setCurrentVideoTime(time);
                          if (chapterTitle !== undefined) {
                            setActiveChapterTitle(chapterTitle || '');
                          }
                        }}
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
                          onRunInSandbox={openSandboxWithCode}
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
                   ) : leftPanelMode === 'practice' ? (
                       <PracticeCompiler
                         key={practiceCode ? `${practiceLanguage}-${practiceCode.length}` : (moduleId || 'default')}
                         isZenMode={isZenMode}
                         initialCode={practiceCode || undefined}
                         initialLanguage={practiceLanguage || undefined}
                         pathId={pathId}
                         moduleId={practiceCode ? undefined : moduleId}
                         moduleTitle={module?.title}
                         learningContext={generatedContent || undefined}
                       />
                   ) : leftPanelMode === 'visualizer' ? (
                      <KnowledgeMap
                        moduleTitle={module?.title || ''}
                        moduleContent={generatedContent}
                        keyConcepts={module?.keyConcepts || []}
                        storedGraph={module?.knowledgeGraph}
                        nodeMastery={module?.nodeMastery}
                        pathId={pathId}
                        phaseId={phaseId}
                        moduleId={moduleId}
                        isZenMode={isZenMode}
                        studyLens={path?.studyLens}
                        scholarPersona={path?.scholarPersona}
                        cognitiveDensity={path?.cognitiveDensity}
                        goalContext={path?.goal || ''}
                        onGraphGenerated={(graph) => {
                          if (pathId && phaseId && moduleId) {
                            saveModuleKnowledgeGraph(pathId, phaseId, moduleId, graph);
                          }
                        }}
                        onMasteryChange={(nodeId, status) => {
                          if (pathId && phaseId && moduleId) {
                            saveNodeMastery(pathId, phaseId, moduleId, nodeId, status);
                          }
                        }}
                        onAskAI={(node: KnowledgeNode) => {
                          setSaraOpen(true);
                          setActiveRightTab('chat');
                          handleSendMessage(`Explain "${node.label}" in the context of ${module?.title}. Why does it matter and how does it connect to other concepts?`);
                        }}
                      />
                   ) : null}
                  </div>
               </div>

             <FloatingSandboxPanel
               key={`${moduleId}-${sandboxVersion}`}
               open={sandboxPanelOpen}
               code={sandboxCode}
               language={sandboxLanguage}
               forceInitialCode={sandboxForceInitialCode}
               runTrigger={sandboxRunTrigger}
               isZenMode={isZenMode}
               initialSandboxState={module?.sandboxState}
               onStateChange={handleSandboxStateChange}
               onClose={() => {
                 setSandboxPanelOpen(false);
                 setSandboxForceInitialCode(false);
               }}
               onAskSara={(prompt) => {
                 setSaraOpen(true);
                 setActiveRightTab('chat');
                 handleSendMessage(prompt);
               }}
             />

             {/* PANEL 2: ASSISTANT SIDEBAR — Ghost Mode in Zen */}
            <div
              className={`shrink-0 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-20 ${(saraOpen && !isContentLoading) ? 'w-[420px] min-w-[420px]' : 'w-0 min-w-0 opacity-0 pointer-events-none'} ${isZenMode ? `bg-[#05070a]/90 backdrop-blur-xl border-white/5 zen-mode ${showZenControls ? 'pt-[52px]' : 'pt-0'}` : 'bg-white border-l border-slate-200 shadow-2xl'}`}
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
                      key={activeRightTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 flex flex-col overflow-hidden"
                    >
                          {activeRightTab === 'chat' && (
                             <div
                               onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                               onDragLeave={() => setIsDraggingFile(false)}
                               onDrop={(e) => {
                                 e.preventDefault();
                                 setIsDraggingFile(false);
                                 const file = e.dataTransfer?.files?.[0];
                                 if (file) handleFileDrop(file);
                               }}
                               className={`flex h-full flex-col assistant-glass-panel relative ${isZenMode ? 'bg-transparent' : 'bg-transparent'}`}
                             >
                               <AnimatePresence>
                                 {isDraggingFile && (
                                   <motion.div
                                     initial={{ opacity: 0 }}
                                     animate={{ opacity: 1 }}
                                     exit={{ opacity: 0 }}
                                     className="absolute inset-0 bg-[#05070a]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/50 m-3 rounded-2xl transition-all duration-200"
                                   >
                                     <div className="flex flex-col items-center justify-center gap-3 text-center p-6 select-none">
                                       <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-2 animate-bounce">
                                         <UploadCloud size={30} />
                                       </div>
                                       <span className="text-[12px] font-black uppercase tracking-widest text-indigo-300">
                                         Drop to Hydrate Session
                                       </span>
                                       <span className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed">
                                         Release to inject your code file or document into the active workspace editor, video playlists, and SARA context.
                                       </span>
                                     </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>

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
                                          <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSendMessage("Give me a high-level summary of this module.")}
                                            className={`w-full py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                              isZenMode
                                                ? 'border-white/10 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
                                                : 'border-slate-200 text-slate-650 bg-white hover:bg-slate-50 hover:border-indigo-450 shadow-sm hover:shadow-[0_4px_12px_rgba(78,91,255,0.08)]'
                                            }`}
                                          >
                                            Summarize Path
                                          </motion.button>
                                          <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSendMessage("What are the 3 most important concepts here?")}
                                            className={`w-full py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                              isZenMode
                                                ? 'border-white/10 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
                                                : 'border-slate-200 text-slate-650 bg-white hover:bg-slate-50 hover:border-indigo-450 shadow-sm hover:shadow-[0_4px_12px_rgba(78,91,255,0.08)]'
                                            }`}
                                          >
                                            Pinpoint Essentials
                                          </motion.button>
                                       </div>
                                    </motion.div>
                                  ) : (
                                    chatHistory.map((m, idx) => (
                                      <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                      >
                                        <div className={`max-w-[92%] p-5 text-[13px] leading-relaxed group relative ${m.role === 'user' ? 'user-message-bubble' : 'sara-message-bubble'} ${isZenMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                          {m.role === 'model' && m.mode && (
                                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 select-none">
                                              <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase border shrink-0 ${
                                                isZenMode
                                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                  : 'bg-indigo-50 text-indigo-650 border-indigo-100'
                                              }`}>
                                                {m.mode} Mode
                                              </span>
                                              {m.intent && m.intent !== 'Unknown' && (
                                                <span className={`text-[8.5px] font-bold lowercase opacity-40 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                                                  intent: {m.intent}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          <div className={`prose prose-sm max-w-none ${isZenMode ? 'prose-invert text-slate-100' : 'text-slate-800'}`}>
                                            <ChatMessageContentRenderer
                                              text={m.text}
                                              msgId={m.id}
                                              isLatest={idx === chatHistory.length - 1 && m.role === 'model'}
                                              isZenMode={isZenMode}
                                              components={ChatMarkdownComponents}
                                              onAskSara={handleSendMessage}
                                            />
                                          </div>

                                          {/* ─── SARA Interactive Blocks ─── */}
                                          {m.role === 'model' && m.interactive_block && (
                                            <div className="mt-3 select-none">
                                              {m.interactive_block.type === 'quick_choices' && Array.isArray(m.interactive_block.data) && (
                                                <div className="flex flex-wrap gap-2 pt-1.5">
                                                  {m.interactive_block.data.map((choice: string, idx: number) => (
                                                    <button
                                                      key={idx}
                                                      onClick={() => handleSendMessage(choice)}
                                                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                        isZenMode
                                                          ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-350 hover:text-white'
                                                          : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-600 shadow-sm'
                                                      }`}
                                                    >
                                                      {choice}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}

                                              {m.interactive_block.type === 'inline_challenge' && m.interactive_block.data && (
                                                <div className={`p-4 rounded-xl border ${
                                                  isZenMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-150'
                                                }`}>
                                                  <div className={`text-[12px] font-extrabold mb-3 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                                                    🧠 Quick Quiz: {m.interactive_block.data.question}
                                                  </div>
                                                  <div className="flex flex-col gap-2">
                                                    {Array.isArray(m.interactive_block.data.options) && m.interactive_block.data.options.map((opt: string, idx: number) => (
                                                      <button
                                                        key={idx}
                                                        onClick={() => handleSendMessage(`Answer: ${opt}`)}
                                                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-[11px] font-semibold transition-all hover:translate-x-1 duration-150 cursor-pointer ${
                                                          isZenMode
                                                            ? 'bg-white/5 border-white/5 text-slate-350 hover:bg-white/10 hover:text-white hover:border-white/20'
                                                            : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-50 hover:border-indigo-400'
                                                        }`}
                                                      >
                                                        {opt}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {m.interactive_block.type === 'guided_experiment' && m.interactive_block.data && (
                                                <div className={`rounded-xl border overflow-hidden ${
                                                  isZenMode ? 'bg-[#0b0c10] border-white/5' : 'bg-slate-950 border-slate-800'
                                                }`}>
                                                  <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
                                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                                      {m.interactive_block.data.language || 'Code Snippet'}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        const code = m.interactive_block?.data?.code || '';
                                                        const lang = m.interactive_block?.data?.language || 'javascript';
                                                        setSandboxCode(code);
                                                        setSandboxLanguage(lang);
                                                        setSandboxForceInitialCode(true);
                                                        setSandboxPanelOpen(true);
                                                        setSandboxRunTrigger(prev => prev + 1);
                                                        toast.success("Copied to Sandbox! Running code...");
                                                      }}
                                                      className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none"
                                                    >
                                                      <Zap size={10} />
                                                      Run in Sandbox
                                                    </button>
                                                  </div>
                                                  <pre className="p-4 text-[11.5px] font-mono text-slate-355 overflow-x-auto leading-relaxed custom-scrollbar bg-black/20">
                                                    <code>{m.interactive_block.data.code}</code>
                                                  </pre>
                                                </div>
                                              )}
                                            </div>
                                          )}

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
                                                <span className="text-[9px] font-medium text-slate-500">{getActiveModelName()}</span>
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
                                 {chatHistory.length === 0 && (
                                   <div className="space-y-3 mb-2">
                                     <SessionFileDropZone 
                                       activeModuleTitle={module?.title || ''} 
                                       isZenMode={isZenMode} 
                                       onFileSelect={handleFileDrop} 
                                     />
                                     <SARAActionChips onAction={(p) => handleSendMessage(p)} isZenMode={isZenMode} />
                                   </div>
                                 )}
                                 <div className={`relative mt-2 rounded-2xl border transition-all duration-300 flex flex-col ${
                                   isZenMode
                                     ? `bg-white/[0.03] border-white/[0.08] focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 ${isTyping ? 'opacity-60' : ''}`
                                     : `bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/5 ${isTyping ? 'opacity-60' : ''}`
                                 }`}>
                                    <textarea
                                      ref={chatInputRef}
                                      value={inputMessage}
                                      disabled={isTyping}
                                      rows={1}
                                      onChange={(e) => {
                                        setInputMessage(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          if (!isTyping && inputMessage.trim() !== '') {
                                            handleSendMessage();
                                          }
                                        }
                                      }}
                                      placeholder={isTyping ? "SARA is thinking..." : "Command SARA..."}
                                      className={`w-full bg-transparent border-none outline-none py-3.5 px-4 text-[13.5px] font-medium resize-none min-h-[48px] max-h-[160px] custom-scrollbar ${
                                        isZenMode ? 'text-white placeholder:text-slate-650' : 'text-slate-900 placeholder:text-slate-400'
                                      }`}
                                      style={{ height: 'auto' }}
                                    />
                                    <div className={`flex items-center justify-between px-3 pb-3 pt-1.5 border-t border-dashed ${
                                      isZenMode ? 'border-white/[0.05]' : 'border-slate-100'
                                    }`}>
                                      <div className="flex items-center gap-1.5">
                                        <ModelSelector
                                          byokMode={byokMode}
                                          byokConfig={byokConfig}
                                          onSelect={handleModelSelectChange}
                                          variant={isZenMode ? 'zen' : 'light'}
                                          compact={true}
                                          dropdownPosition="top"
                                        />
                                      </div>
                                      <button
                                        aria-label="Send message"
                                        title="Send message"
                                        disabled={isTyping || inputMessage.trim() === ''}
                                        onClick={() => handleSendMessage()}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                          isTyping || inputMessage.trim() === ''
                                            ? 'opacity-35 cursor-not-allowed pointer-events-none'
                                            : 'hover:scale-105 active:scale-95 shadow-md'
                                        } ${
                                          isZenMode
                                            ? 'bg-white text-[#05070a]'
                                            : 'bg-[#4e5bff] text-white shadow-lg shadow-indigo-500/10'
                                        }`}
                                      >
                                         <Send size={14} />
                                      </button>
                                    </div>
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
    <ClassroomPlaybackProvider>
      <StudySession />
    </ClassroomPlaybackProvider>
  </StudySessionErrorBoundary>
);
