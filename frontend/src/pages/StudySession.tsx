import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  generateModuleContent,
  scoutResources,
  chatWithTutor,
  chatWithTutorStream,
  generateQuizForModule,
  triggerBackgroundPreGeneration,
  isBadResource,
  hasConfiguredApiKey
} from '../services/geminiService';
import { ChatMessage, QuizQuestion, KnowledgeMilestone, ContentCitation, Resource, VideoSegment, SmartboardJumpEventDetail, KnowledgeNode, MasteryStatus, SandboxState } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, UploadCloud, ChevronLeft, ChevronRight,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye, GitBranch, Layout, Target, ShieldCheck,
  Play, Pause, Clock, Music, Volume2, Copy, ChevronDown, BrainCircuit, Check, Cpu, Terminal, Database, Network, Plus, Lock, Trash2
} from 'lucide-react';
import { ModelSelector, PROVIDER_MODELS } from '../components/ui/ModelSelector';
import { getModelDisplayName, getDefaultModelForProvider, type ProviderId } from '../config/modelRegistry';
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
import SARAQuizPanel from '../features/study/SARAQuizPanel';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';
import CodeSandbox from '../components/ui/CodeSandbox';
import MermaidDiagram from '../components/ui/MermaidDiagram';
import { ClassroomPlaybackProvider, useClassroomPlayback } from '../context/ClassroomPlaybackContext';
import '../styles/AssistantGlass.css';
import SwarmBentoGrid from '../components/ui/SwarmBentoGrid';

import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const SLASH_COMMANDS = [
  { cmd: '/chat', desc: 'Switch to Chat mode', action: 'switch_tab', target: 'chat' },
  { cmd: '/quiz', desc: 'Switch to Quiz mode', action: 'switch_tab', target: 'quiz' },
  { cmd: '/notes', desc: 'Switch to Notes mode', action: 'switch_tab', target: 'notes' },
  { cmd: '/clear', desc: 'Clear chat conversation history thread', action: 'clear_chat' },
  { cmd: '/scout', desc: 'Query Google/YouTube swarm agents', placeholder: '/scout ' },
  { cmd: '/sandbox', desc: 'Open code sandbox', placeholder: '/sandbox ' },
  { cmd: '/visualize', desc: 'Focus Neural Map node', placeholder: '/visualize ' },
  { cmd: '/eli5', desc: 'Explain conceptually simple (ELI5)', placeholder: '/eli5 ' },
  { cmd: '/debug', desc: 'Run code surgery compiler check', placeholder: '/debug ' },
];

const classifyIntentLocally = (message: string): string[] => {
  const msg = message.toLowerCase();
  const agents = new Set<string>();
  
  if (/\b(scout|search|youtube|video|tutorial|google|github|repo|code|boilerplate|structure|file\s*tree|scaffold)\b/i.test(msg)) {
    if (/\b(video|youtube|tutorial|watch|lecture)\b/i.test(msg)) {
      agents.add('YouTubeScout');
    }
    if (/\b(github|repo|boilerplate|open\s*source)\b/i.test(msg)) {
      agents.add('GitHubScout');
    }
    if (/\b(file|folder|structure|scaffold|directory|setup|tsconfig|package\.json)\b/i.test(msg)) {
      agents.add('WorkspaceConfigurator');
    }
    if (agents.size === 0 || /\b(google|search|scout|docs|documentation|best\s*practices)\b/i.test(msg)) {
      agents.add('GoogleScout');
    }
  } else if (/\b(architect|system\s*design|microservice|distributed|pipeline|ci[\s/]cd|deployment|docker|kubernetes|terraform)\b/i.test(msg)) {
    agents.add('GoogleScout');
    agents.add('GitHubScout');
    agents.add('WorkspaceConfigurator');
  } else if (msg.length > 80) {
    agents.add('GoogleScout');
  }

  return Array.from(agents);
};

interface ParsedStream {
  reasoning: string;
  text: string;
  isThinking: boolean;
  activeAgents?: string[];
  completedAgents?: string[];
  payloadData?: any;
}

const parseStreamBuffer = (buffer: string): ParsedStream => {
  let temp = buffer;
  let reasoning = '';
  let text = '';
  let isThinking = false;
  let activeAgents: string[] | undefined;
  let completedAgents: string[] | undefined;
  let payloadData: any = null;

  // Extract swarm_manifest if present in the stream
  const manifestMatch = temp.match(/<swarm_manifest\s+agents=([^/>\s]+|\"[^\"]*\"|'[^']*')\s*\/?>/i);
  if (manifestMatch) {
    try {
      const rawAgents = manifestMatch[1].replace(/['"]/g, '');
      activeAgents = JSON.parse(rawAgents);
    } catch {
      // Fallback manual parse if JSON fails
      const cleanRaw = manifestMatch[1].replace(/['"\[\]]/g, '').trim();
      if (cleanRaw) {
        activeAgents = cleanRaw.split(',').map(s => s.trim());
      }
    }
    // Remove the manifest tag from the text processing
    temp = temp.replace(manifestMatch[0], '');
  }

  // Extract completed/active agents from <cortex_payload> if present in the stream
  const payloadRegex = /<cortex_payload>([\s\S]*?)(?:<\/cortex_payload>|$)/i;
  const payloadMatch = temp.match(payloadRegex);
  if (payloadMatch) {
    try {
      const parsed = JSON.parse(payloadMatch[1].trim());
      if (parsed.payloadData) {
        payloadData = parsed.payloadData;
      } else {
        payloadData = parsed;
      }
      if (parsed.activeAgents && !activeAgents) {
        activeAgents = parsed.activeAgents;
      }
      if (parsed.completedAgents) {
        completedAgents = parsed.completedAgents;
      }
    } catch (e) {
      // Ignore partial JSON parsing errors
    }
    // Remove the payload tag from the text processing
    temp = temp.replace(payloadRegex, '');
  }
  
  const thinkStartIdx = temp.indexOf('<think>');
  const thinkEndIdx = temp.indexOf('</think>');
  
  if (thinkStartIdx !== -1) {
    if (thinkEndIdx !== -1) {
      reasoning = temp.substring(thinkStartIdx + 7, thinkEndIdx).trim();
      const rawText = temp.substring(thinkEndIdx + 8);
      const metadataStart = rawText.indexOf('<sara_metadata>');
      if (metadataStart !== -1) {
        text = rawText.substring(0, metadataStart).trim();
      } else {
        text = rawText.trim();
      }
    } else {
      reasoning = temp.substring(thinkStartIdx + 7).trim();
      isThinking = true;
    }
  } else {
    const metadataStart = temp.indexOf('<sara_metadata>');
    if (metadataStart !== -1) {
      text = temp.substring(0, metadataStart).trim();
    } else {
      text = temp.trim();
    }
  }
  
  return { reasoning, text, isThinking, activeAgents };
};

const formatReasoningText = (
  text: string,
  isZenMode: boolean,
  onInquire: (tag: string, content: string) => void
): React.ReactNode => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const tagMatch = line.match(/^(\s*-\s*)?(\[[A-Z\s_&]+\]):?/);
    if (tagMatch) {
      const fullTag = tagMatch[2];
      const remainder = line.substring(line.indexOf(fullTag) + fullTag.length).replace(/^:\s*/, '');
      const cleanTag = fullTag.replace(/[\[\]]/g, '').trim();
      return (
        <div key={idx} className="mb-3">
          <button
            onClick={() => onInquire(cleanTag, remainder)}
            className={`font-extrabold uppercase tracking-wider text-[10.5px] cursor-pointer hover:underline text-left outline-none bg-transparent border-none p-0 block ${
              isZenMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-650 hover:text-indigo-500'
            }`}
            title="Click to inquire about SARA's thought step"
          >
            {fullTag}
          </button>
          <div className="mt-1 pl-1 text-[12.5px] leading-relaxed opacity-95">{remainder}</div>
        </div>
      );
    }
    return <div key={idx} className="mb-1">{line}</div>;
  });
};

const getStakesPriority = (text: string): string | null => {
  if (!text) return null;
  const match = text.match(/80% of your focus should be on\s+([A-Za-z0-9_'\s`\[\]\-\+\*\/\#\.&]+)/i);
  if (match) {
    return match[1].replace(/[\[\]`\.]/g, '').trim();
  }
  return null;
};

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

interface SaraMessageBubbleProps {
  message: ChatMessage;
  index: number;
  chatHistory: ChatMessage[];
  isZenMode: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  pathId?: string;
  phaseId?: string;
  moduleId?: string;
  module?: any;
  saveModuleNotes: (pathId: string, phaseId: string, moduleId: string, notes: string) => void;
  saveNodeMastery: (pathId: string, phaseId: string, moduleId: string, nodeId: string, status: any) => void;
  getActiveModelName: () => string;
  setCuratedVideoId: (id: string) => void;
  setLeftPanelMode: (mode: any) => void;
  setSandboxCode: (code: string) => void;
  setSandboxLanguage: (lang: string) => void;
  setSandboxForceInitialCode: (b: boolean) => void;
  setSandboxPanelOpen: (b: boolean) => void;
  setSandboxRunTrigger: React.Dispatch<React.SetStateAction<number>>;
  ChatMarkdownComponents: any;
  onEditMessage: (idx: number, text: string) => void;
}

const SaraMessageBubble = ({
  message: m,
  index: idx,
  chatHistory,
  isZenMode,
  onSendMessage,
  onRegenerate,
  inputMessage,
  setInputMessage,
  chatInputRef,
  notes,
  setNotes,
  pathId,
  phaseId,
  moduleId,
  module,
  saveModuleNotes,
  saveNodeMastery,
  getActiveModelName,
  setCuratedVideoId,
  setLeftPanelMode,
  setSandboxCode,
  setSandboxLanguage,
  setSandboxForceInitialCode,
  setSandboxPanelOpen,
  setSandboxRunTrigger,
  ChatMarkdownComponents,
  onEditMessage,
}: SaraMessageBubbleProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isGenerating = m.isGenerating;
  const isModelThinking = isGenerating && m.isThinking === true;
  const isWaitingForFirstToken = isGenerating && !m.text && !m.reasoning;

  const timerActiveRef = useRef(false);
  useEffect(() => {
    const shouldRun = isModelThinking || isWaitingForFirstToken;
    if (!shouldRun) {
      timerActiveRef.current = false;
      return;
    }
    if (timerActiveRef.current) return;
    timerActiveRef.current = true;
    const startTime = Date.now() - (elapsedTime * 1000);
    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { clearInterval(interval); timerActiveRef.current = false; };
  }, [isModelThinking, isWaitingForFirstToken]);

  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModelThinking && reasoningEndRef.current) {
      reasoningEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [m.reasoning, isModelThinking]);

  useEffect(() => {
    if (isModelThinking) {
      setIsAccordionOpen(true);
    } else if (m.reasoning && m.text && isGenerating) {
      setIsAccordionOpen(false);
    }
  }, [isModelThinking, m.text, m.reasoning, isGenerating]);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(m.text || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(m.text || '');
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${m.role === 'user' ? 'justify-end px-4 py-2' : 'justify-start px-2 py-4 border-b border-transparent hover:bg-slate-100/30 transition-colors'}`}
    >
      {m.role === 'user' ? (
        <div className="flex flex-col items-end gap-1 max-w-[85%] group/userbubble">
          {/* Bubble containing text */}
          <div className={`px-4 py-3 text-[13.5px] rounded-2xl rounded-tr-sm shadow-sm border ${isZenMode ? 'bg-white/10 border-transparent text-slate-100' : 'bg-[#F5F5F7] border-[#E5E5E7] text-[#1D1D1F]'} relative w-full`}>
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full py-1 text-slate-200 select-text">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white text-[13.5px] outline-none focus:border-indigo-400 resize-none min-h-[70px] custom-scrollbar focus:ring-1 focus:ring-indigo-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (editText.trim() && editText.trim() !== m.text) {
                        onEditMessage(idx, editText.trim());
                        setIsEditing(false);
                      }
                    }
                  }}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setEditText(m.text || '');
                      setIsEditing(false);
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white cursor-pointer border border-white/10 transition-all duration-150 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editText.trim() && editText.trim() !== m.text) {
                        onEditMessage(idx, editText.trim());
                        setIsEditing(false);
                      } else {
                        setIsEditing(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer border-none transition-all duration-150 active:scale-95 shadow shadow-indigo-500/20"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className={`prose max-w-none text-[13.5px] ${isZenMode ? 'text-white prose-p:text-white prose-strong:text-white' : 'text-[#1D1D1F] prose-p:text-[#1D1D1F] prose-strong:text-[#0D0D0E]'}`}>
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.images.map((img, index) => (
                      <img 
                        key={index}
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={`Uploaded ${index}`}
                        className="max-w-[200px] max-h-[200px] rounded-lg border border-white/20 object-contain shadow-sm"
                      />
                    ))}
                  </div>
                )}
                {m.documents && m.documents.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3 select-none">
                    {m.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white max-w-[280px]">
                        <File size={13} className="text-indigo-300" />
                        <span className="text-[12px] font-bold truncate max-w-[180px]">
                          {doc.name}
                        </span>
                        <span className="text-[8.5px] uppercase tracking-wider opacity-60">
                          {doc.type === 'application/pdf' ? 'pdf' : 'txt'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <ChatMessageContentRenderer
                  text={m.text || ''}
                  msgId={m.id}
                  isLatest={false}
                  isZenMode={isZenMode}
                  components={ChatMarkdownComponents}
                  onAskSara={onSendMessage}
                />
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className="flex items-center gap-3 px-1 mt-0.5 select-none text-slate-400 dark:text-slate-500 h-4">
              {m.editCount !== undefined && m.editCount > 0 && (
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 select-none">
                  v{m.editCount + 1}
                </span>
              )}
              <div className="flex items-center gap-2 opacity-0 group-hover/userbubble:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer transition-colors p-0.5"
                  title="Copy question"
                  aria-label="Copy question"
                >
                  {copied ? <Check size={11} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2.5} />}
                </button>
                <button
                  onClick={() => {
                    setEditText(m.text || '');
                    setIsEditing(true);
                  }}
                  className="hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer transition-colors p-0.5"
                  title="Edit question"
                  aria-label="Edit question"
                >
                  <PenLine size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`w-full max-w-4xl mx-auto text-[14.5px] leading-relaxed group relative ${isZenMode ? 'text-slate-100' : 'text-[#1D1D1F]'} pr-10`}>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none z-10">
            <button
              onClick={handleCopy}
              className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                isZenMode 
                  ? 'bg-[#1e202a] border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white' 
                  : 'bg-[#F5F5F7] border-[#E5E5E7] hover:bg-[#E5E5E7] text-[#6E6E73] hover:text-[#0D0D0E]'
              }`}
            >
              {copied ? <Check size={11} className="text-emerald-500" strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2.5} />}
            </button>
          </div>
          
          {(isWaitingForFirstToken || m.reasoning) && (
            <details 
              open={isAccordionOpen}
              onToggle={(e) => setIsAccordionOpen((e.target as HTMLDetailsElement).open)}
              className="mb-4 group/reasoning outline-none animate-fadeIn"
            >
              <summary className={`cursor-pointer inline-flex items-center gap-2 text-[13px] font-medium transition-all select-none list-none outline-none ${
                isZenMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}>
                {(isModelThinking || isWaitingForFirstToken) ? (
                  <Loader size={13} className="text-indigo-500 animate-spin" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500/90 group-open/reasoning:animate-pulse">
                    <path d="M12 3v1M12 20v1M4 12H3M21 12h-1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                  </svg>
                )}
                <span className="font-semibold tracking-wide font-mono">
                  {(isModelThinking || isWaitingForFirstToken) 
                    ? `Thinking... ${elapsedTime}s` 
                    : `Thought for ${m.thinkingDuration || elapsedTime || 1} ${m.thinkingDuration === 1 ? 'second' : 'seconds'}`
                  }
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-50 group-open/reasoning:rotate-180 transition-transform">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              
              <div className="mt-2 pl-4 py-1 ml-[7px] border-l border-slate-200 dark:border-white/10">
                <div className={`max-h-[350px] overflow-y-auto custom-scrollbar text-[13px] leading-relaxed tracking-wide ${
                  isZenMode ? 'text-slate-400' : 'text-slate-655'
                }`}>
                  {m.reasoning ? (
                    formatReasoningText(m.reasoning || '', isZenMode, (tag, content) => {
                      setInputMessage(`Regarding SARA's thought step [${tag}], you said: "${content.substring(0, 60)}...". Why did you choose this strategy? `);
                      setTimeout(() => chatInputRef.current?.focus(), 50);
                    })
                  ) : (
                    <div className="flex items-center gap-2 text-indigo-500/70 dark:text-indigo-400/75 animate-pulse text-[12px] font-mono select-none">
                      <Loader size={12} className="animate-spin text-indigo-500" />
                      <span>Organizing cognitive strategy...</span>
                    </div>
                  )}
                  <div ref={reasoningEndRef} />
                </div>
              </div>
            </details>
          )}

          {m.mode && m.mode !== 'Companion' && m.mode !== 'Assistant' && (
            <div className="flex items-center flex-wrap gap-2 mb-3 select-none">
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border shrink-0 ${
                isZenMode
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100/50'
              }`}>
                {m.mode}
              </span>
              {m.intent && m.intent !== 'Unknown' && (
                <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  • {m.intent}
                </span>
              )}
              {m.sara_metadata?.cognitive_load && (
                <span className={`text-[8.5px] px-2 py-0.5 rounded border font-mono tracking-widest uppercase shrink-0 ${
                  isZenMode
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-350'
                    : 'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  Load: {m.sara_metadata.cognitive_load}/5
                </span>
              )}
              {m.sara_metadata?.recommended_duration && (
                <span className={`text-[8.5px] px-2 py-0.5 rounded border font-mono tracking-widest uppercase shrink-0 ${
                  isZenMode
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-350'
                    : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                  {m.sara_metadata.recommended_duration}
                </span>
              )}
              {getStakesPriority(m.text || '') && (
                <span className={`text-[8.5px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest flex items-center gap-1 shadow-sm shrink-0 ${
                  isZenMode
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-350'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  Focus: {getStakesPriority(m.text || '')}
                </span>
              )}
            </div>
          )}

          {m.text && (
            <div className={`prose max-w-none ${isZenMode ? 'prose-invert text-slate-100' : 'text-slate-800 prose-p:leading-relaxed prose-headings:font-semibold text-[14.5px]'}`}>
              <ChatMessageContentRenderer
                text={m.text}
                msgId={m.id}
                isLatest={idx === chatHistory.length - 1 && m.role === 'model' && m.isGenerating}
                isZenMode={isZenMode}
                components={ChatMarkdownComponents}
                onAskSara={onSendMessage}
              />
            </div>
          )}

          {/* ─── Swarm Active Agents Workflow Panel ─── */}
          {m.activeAgents && m.activeAgents.length > 0 && m.isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`mt-3.5 p-3.5 rounded-xl border max-w-md w-full ${
                isZenMode
                  ? 'border-white/5 bg-white/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                  : 'border-slate-200/80 bg-white shadow-sm'
              }`}
            >
              <div className={`flex items-center justify-between mb-2 pb-1.5 border-b ${
                isZenMode ? 'border-white/5' : 'border-slate-100'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                  isZenMode ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Swarm Agent Fleet Activity
                </span>
                <span className={`text-[9px] font-mono ${isZenMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {m.completedAgents?.length || 0} / {m.activeAgents.length} completed
                </span>
              </div>
              <div className="space-y-2">
                {m.activeAgents.map((agentName) => {
                  const isCompleted = m.completedAgents?.includes(agentName);
                  return (
                    <div key={agentName} className="flex items-center justify-between text-[11.5px] font-medium py-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isCompleted 
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                            : 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                        }`} />
                        <span className={`font-mono text-[11px] ${
                          isCompleted 
                            ? (isZenMode ? 'text-zinc-500 line-through' : 'text-slate-455 line-through') 
                            : (isZenMode ? 'text-slate-200' : 'text-slate-700')
                        }`}>
                          {agentName}
                        </span>
                      </div>
                      <div>
                        {isCompleted ? (
                          <span className={`font-mono text-[10px] border px-1.5 py-0.5 rounded font-bold ${
                            isZenMode 
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}>
                            ✓ Done
                          </span>
                        ) : (
                          <span className={`font-mono text-[10px] border px-1.5 py-0.5 rounded animate-pulse font-bold ${
                            isZenMode
                              ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                              : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                          }`}>
                            ⚡ Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Swarm Bento Grid Payload (Interactive Workspace) ─── */}
          {!m.isGenerating && m.payloadData && (
            <AnimatePresence>
              <div className="mt-4 w-full">
                <SwarmBentoGrid payload={m.payloadData} />
              </div>
            </AnimatePresence>
          )}

          {/* ─── Premium UI Overhaul: Onboarding Persona Pills ─── */}
          {m.sara_metadata?.ui_suggestion === 'render_persona_pills' && idx === chatHistory.length - 1 && (
            <div className="mt-4 flex flex-wrap gap-2.5 items-center select-none animate-fadeIn">
              <button
                onClick={() => {
                  setInputMessage("Hacker mode active: SARA, go straight to the code. Direct diff fixes, minimal fluff.");
                  setTimeout(() => chatInputRef.current?.focus(), 50);
                }}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                  isZenMode
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                }`}
              >
                The Hacker
              </button>
              <button
                onClick={() => {
                  setInputMessage("Yoda mode active: SARA, guide me with Socratic nudges. Do not give the direct answer first.");
                  setTimeout(() => chatInputRef.current?.focus(), 50);
                }}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                  isZenMode
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                }`}
              >
                The Yoda
              </button>
              <button
                onClick={() => {
                  setInputMessage("Psychologist mode active: SARA, focus on high-encouragement, small milestones, and pacing.");
                  setTimeout(() => chatInputRef.current?.focus(), 50);
                }}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                  isZenMode
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                }`}
              >
                The Psychologist
              </button>
            </div>
          )}

          {/* ─── Premium UI Overhaul: Friction Choice Poll ─── */}
          {m.sara_metadata?.ui_suggestion === 'render_friction_poll' && idx === chatHistory.length - 1 && (
            <div className="mt-4 p-3.5 rounded-xl border flex flex-col gap-2.5 animate-fadeIn max-w-sm select-none bg-indigo-500/[0.02] border-indigo-500/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                Stop & Think Challenge:
              </span>
              {m.sara_metadata.micro_challenge && (
                <p className={`text-[12px] font-medium leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-655'}`}>
                  {m.sara_metadata.micro_challenge}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setInputMessage("I choose the Socratic Nudge (teach me to fish). Pose a Socratic question.");
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-indigo-500 hover:bg-indigo-600 text-white shadow shadow-indigo-500/10 border-none"
                >
                  Teach me to fish
                </button>
                <button
                  onClick={() => {
                    setInputMessage("I choose the Direct Fix (show me the fix). Show me the before/after code diff.");
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border ${
                    isZenMode
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  Show me the fix
                </button>
              </div>
            </div>
          )}

          {/* ─── SARA Interactive Blocks ─── */}
          {m.interactive_block && (
            <div className="mt-3 select-none">
              {m.interactive_block.type === 'quick_choices' && Array.isArray(m.interactive_block.data) && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {m.interactive_block.data.map((choice: string, cidx: number) => (
                    <button
                      key={cidx}
                      onClick={() => onSendMessage(choice)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isZenMode
                          ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-355 hover:text-white'
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
                    Quick Quiz: {m.interactive_block.data.question}
                  </div>
                  <div className="flex flex-col gap-2">
                    {Array.isArray(m.interactive_block.data.options) && m.interactive_block.data.options.map((opt: string, oidx: number) => (
                      <button
                        key={oidx}
                        onClick={() => onSendMessage(`Answer: ${opt}`)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-[11px] font-semibold transition-all hover:translate-x-1 duration-150 cursor-pointer ${
                          isZenMode
                            ? 'bg-white/5 border-white/5 text-slate-355 hover:bg-white/10 hover:text-white hover:border-white/20'
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

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 select-none">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => {
                  setNotes(prev => {
                    const newNotes = prev + `\n\n### Insight from SARA\n${m.text}`;
                    if (pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, newNotes);
                    return newNotes;
                  });
                  toast.success("Added to Notes");
                }}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                Save to Notes
              </button>
              {idx === chatHistory.length - 1 && (
                <button
                  onClick={() => onRegenerate()}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                >
                  Regenerate
                </button>
              )}
            </div>
            <span className="text-[9px] font-medium text-slate-500">{getActiveModelName()}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

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
             {/* Removed 'Knowledge Base' text to fix overlap with Cortex header */}
             <div className="w-32"></div>
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

interface SkillNode {
  label: string;
  children: SkillNode[];
}

const parseAsciiTree = (text: string): SkillNode | null => {
  if (!text) return null;
  const normalizedText = text
    .replace(/(\S)\s*(├──|└──)/g, '$1\n$2')
    .replace(/(├──|└──)\s*([^\n├└]+)(?=\s*(?:├──|└──))/g, '$1 $2\n');

  const lines = normalizedText.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0);
  if (lines.length === 0) return null;

  let rootLabel = "Skill Landscape";
  let startIndex = 0;
  if (!lines[0].includes('├──') && !lines[0].includes('└──') && !lines[0].includes('│') && !lines[0].includes('|')) {
    rootLabel = lines[0].replace(/Skill Tree:?/gi, '').trim() || "Skill Landscape";
    startIndex = 1;
  }

  const root: SkillNode = { label: rootLabel, children: [] };
  const stack: { node: SkillNode; depth: number }[] = [{ node: root, depth: 0 }];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^([│||\s]*)[├└]──\s*(.*)$/);
    if (!match) {
      const cleaned = line.replace(/[├└│|─\s]+/g, '').trim();
      if (cleaned) {
        root.children.push({ label: cleaned, children: [] });
      }
      continue;
    }

    const prefix = match[1];
    const label = match[2].trim();
    const depth = Math.floor(prefix.length / 4) + 1;

    const node: SkillNode = { label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
      stack.push({ node, depth });
    } else {
      root.children.push(node);
      stack.push({ node, depth: 1 });
    }
  }

  return root;
};

const VisualSkillTree: React.FC<{ text: string; isZenMode: boolean }> = ({ text, isZenMode }) => {
  const tree = React.useMemo(() => parseAsciiTree(text), [text]);
  const hasBoxDrawingChars = React.useMemo(() => /[┌└├│─▼▲┌┐└┘├┤┬┴┼]/.test(text), [text]);

  if (hasBoxDrawingChars) {
    return (
      <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.45] tracking-normal text-sky-400 bg-slate-950 p-5 rounded-xl overflow-x-auto border border-slate-800 select-none whitespace-pre shadow-xl my-4">
        {text.trim()}
      </pre>
    );
  }

  if (!tree) return null;

  const rootTitle = tree.label || "Skill Landscape";
  const columns = tree.children;

  return (
    <div className={`w-full overflow-x-auto my-4 p-5 rounded-xl border select-none transition-all ${
      isZenMode 
        ? 'bg-slate-950 border-slate-800 text-slate-100 shadow-2xl' 
        : 'bg-slate-950 border-slate-800 text-slate-100 shadow-xl'
    }`}>
      <div className="min-w-[620px] flex flex-col items-center font-sans">
        
        {/* Level 1: Root Node */}
        <div className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg border border-indigo-500 flex items-center gap-2 text-[12.5px] uppercase tracking-wider">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>{rootTitle}</span>
        </div>

        {/* Vertical Connector Line from Root */}
        {columns.length > 0 && <div className="w-[2px] h-5 bg-slate-700" />}

        {/* Horizontal Split Line linking columns */}
        {columns.length > 1 && (
          <div className="w-[82%] h-[2px] bg-slate-700 flex justify-between relative">
            <div className="absolute top-0 left-0 w-[2px] h-3.5 bg-slate-700" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-3.5 bg-slate-700" />
            <div className="absolute top-0 right-0 w-[2px] h-3.5 bg-slate-700" />
          </div>
        )}

        {/* Level 2: Core Columns */}
        <div className={`grid gap-5 w-full mt-3.5 items-start text-center ${
          columns.length === 1 ? 'grid-cols-1 max-w-md' : columns.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {columns.map((colNode) => {
            const titleMatch = colNode.label.match(/^(.*?)(?:\s*\((.*?)\))?$/);
            const mainTitle = titleMatch ? titleMatch[1] : colNode.label;
            const subtitle = titleMatch ? titleMatch[2] : null;

            return (
              <div key={colNode.label} className="flex flex-col items-center">
                <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3.5 rounded-lg w-full shadow-md hover:border-indigo-500/50 transition-all">
                  <div className="font-semibold text-xs uppercase tracking-wide text-indigo-200">{mainTitle}</div>
                  {subtitle && <div className="text-[11px] text-slate-400 mt-0.5 font-mono">({subtitle})</div>}
                </div>

                {colNode.children.length > 0 && (
                  <>
                    {/* Sub-node Connector */}
                    <div className="w-[2px] h-4 bg-slate-800" />

                    {colNode.children.length === 1 ? (
                      <div className="bg-slate-900/60 border border-slate-800/80 text-slate-300 p-2.5 rounded-lg w-[95%] text-[11px]">
                        <div className="font-medium text-slate-200">{colNode.children[0].label}</div>
                      </div>
                    ) : (
                      <>
                        <div className="w-[70%] h-[2px] bg-slate-800 flex justify-between relative">
                          <div className="absolute top-0 left-0 w-[2px] h-3 bg-slate-800" />
                          <div className="absolute top-0 right-0 w-[2px] h-3 bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full mt-3">
                          {colNode.children.map((sub) => (
                            <div key={sub.label} className="bg-slate-900/50 border border-slate-800/80 text-slate-300 p-2 rounded-lg text-[11px] hover:border-slate-700 transition-all">
                              <div className="font-medium">{sub.label}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
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

  const onAskSaraRef = React.useRef(onAskSara);
  React.useEffect(() => {
    onAskSaraRef.current = onAskSara;
  }, [onAskSara]);

  const handleAskSaraStable = React.useCallback((prompt: string) => {
    onAskSaraRef.current?.(prompt);
  }, []);

  const localComponents = React.useMemo(() => {
    return {
      ...components,
      code: ({ inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        const supportedLangs = [
          'javascript', 'typescript', 'python', 'html', 'css', 'go', 'rust', 'c', 'cpp', 'java',
          'js', 'ts', 'py', 'rs', 'golang', 'c++'
        ];

        // Check if the block represents an ASCII Skill Tree
        const isSkillTree = codeString.includes('├──') || codeString.includes('└──') || codeString.includes('Skill Landscape');
        if (isSkillTree) {
          return <VisualSkillTree text={codeString} isZenMode={isZenMode} />;
        }

        const isBlockCode = Boolean(!inline && match) || codeString.includes('\n');

        if (!isBlockCode) {
          return (
            <code className={`px-1.5 py-0.5 rounded text-[11px] font-mono border inline font-semibold ${isZenMode ? 'bg-white/10 text-indigo-300 border-white/10' : 'bg-indigo-50/70 text-indigo-700 border-indigo-200/60'}`} {...props}>
              {children}
            </code>
          );
        }

        if (match && supportedLangs.includes(match[1].toLowerCase())) {
          let lang = match[1].toLowerCase();
          if (lang === 'js') lang = 'javascript';
          if (lang === 'ts') lang = 'typescript';
          if (lang === 'py') lang = 'python';
          if (lang === 'rs') lang = 'rust';
          if (lang === 'golang') lang = 'go';
          if (lang === 'c++') lang = 'cpp';

          if (isLatest) {
            return (
              <pre className="my-4 rounded-xl border border-white/[0.05] bg-zinc-950 p-4 overflow-x-auto text-left select-text">
                <code className={className} {...props}>
                  {codeString}
                </code>
              </pre>
            );
          }

          return (
            <div className="my-4 rounded-xl border border-white/[0.08] bg-zinc-950 shadow-inner overflow-hidden text-left select-text">
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#090b10] border-b border-white/[0.06] select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                    <Terminal size={11} className="text-indigo-400" />
                    <span>Code Sandbox</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                    {lang}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest font-bold hidden sm:inline">
                  Interactive Playground
                </span>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={codeString}
                  initialLanguage={lang}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={handleAskSaraStable}
                  hideCloseButton={true}
                />
              </div>
            </div>
          );
        }

        return (
          <pre className="my-4 rounded-xl border border-slate-200 dark:border-white/[0.05] bg-slate-50 dark:bg-zinc-950 p-4 overflow-x-auto text-left select-text font-mono text-[11px] leading-relaxed">
            <code className={className} {...props}>
              {codeString}
            </code>
          </pre>
        );
      }
    };
  }, [components, isLatest, isZenMode, handleAskSaraStable]);

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
              components={localComponents}
            />
          );
        }

        if (block.artifactType === 'sandbox') {
          return (
            <div key={`${msgId}-block-${idx}`} className="my-4 rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950 shadow-xl max-w-full text-left select-text">
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#090b10] border-b border-white/[0.06] select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                    <Terminal size={11} className="text-indigo-400" />
                    <span>Interactive Workspace</span>
                  </div>
                  {block.name && (
                    <span className="text-[10.5px] font-mono text-zinc-400 font-semibold">
                      ({block.name})
                    </span>
                  )}
                </div>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={cleanInnerCode(block.content)}
                  initialLanguage={block.language}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={onAskSara}
                  hideCloseButton={true}
                />
              </div>
            </div>
          );
        }

        if (block.artifactType === 'mermaid') {
          return (
            <div key={`${msgId}-block-${idx}`} className="my-4 rounded-xl border border-white/5 overflow-hidden bg-[#0d111d] shadow-2xl h-[330px] text-left select-none">
              <div className="px-4 py-3 bg-[#0d111d] border-b border-white/5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Network size={12} className="text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-indigo-300">
                    Architect Blueprint
                  </span>
                </div>
              </div>
              <div className="h-[278px] relative animate-in fade-in duration-500">
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



interface ConditionalPortalProps {
  active: boolean;
  children: React.ReactNode;
}
const ConditionalPortal: React.FC<ConditionalPortalProps> = ({ active, children }) => {
  return active ? createPortal(children, document.body) : <>{children}</>;
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

  const getThemeColors = () => {
    const lbl = (path?.title || '').toLowerCase();
    if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web') || lbl.includes('ios') || lbl.includes('android')) {
      return {
        primary: '#ea580c',
        bg: 'rgba(234, 88, 12, 0.08)',
        secondaryBg: 'rgba(251, 146, 60, 0.06)',
        text: '#ea580c'
      };
    }
    if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')) {
      return {
        primary: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.08)',
        secondaryBg: 'rgba(74, 222, 128, 0.06)',
        text: '#16a34a'
      };
    }
    if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')) {
      return {
        primary: '#db2777',
        bg: 'rgba(219, 39, 119, 0.08)',
        secondaryBg: 'rgba(244, 114, 182, 0.06)',
        text: '#db2777'
      };
    }
    if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp') || lbl.includes('vision') || lbl.includes('analyst')) {
      return {
        primary: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.08)',
        secondaryBg: 'rgba(14, 165, 233, 0.06)',
        text: '#0284c7'
      };
    }
    return {
      primary: '#4e5bff',
      bg: 'rgba(78, 91, 255, 0.1)',
      secondaryBg: 'rgba(129, 140, 248, 0.06)',
      text: '#4e5bff'
    };
  };
  const theme = getThemeColors();

  useEffect(() => {
    if (pathId && (!path || !path.phases)) {
      void loadPathDetail(pathId);
    }
  }, [pathId, path]);

  const getActiveModelName = () => {
    if (byokMode === 'custom' && byokConfig) {
      if (byokConfig.preferredModel?.trim()) {
        const displayName = getModelDisplayName(byokConfig.provider as ProviderId, byokConfig.preferredModel);
        return `${displayName} (BYOK)`;
      }
      const defaultName = getModelDisplayName(byokConfig.provider as ProviderId, getDefaultModelForProvider(byokConfig.provider as ProviderId));
      return `${defaultName} (BYOK)`;
    }
    return 'Gemini 3.5 Flash';
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
        let key = localStorage.getItem(`vidyal_byok_key_${provider}`) || sessionStorage.getItem(`vidyal_byok_key_${provider}`) || '';
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
          provider: provider as ProviderId,
          apiKey: key,
          preferredModel,
        });
        updateByokMode('custom');
        toast.success(`Switched to Custom model: ${getModelDisplayName(provider as ProviderId, preferredModel)} 🔓`);
        
        if (!key) {
          toast.warning(`API key for ${provider} is not set. Please add it in Settings.`);
        }
      }
    }
  };

  const { isZenMode, setIsZenMode } = useFocus();
  const { isSidebarGhost, scrollProgress } = useFocusSession(isZenMode);

  interface PendingFile {
    id: string;
    name: string;
    data: string;
    mimeType: string;
    fileType: 'image' | 'pdf' | 'text';
    extractedText?: string;
    visualPages?: { data: string, mimeType: string }[];
  }

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz'>('chat');
  const [uploadedDocumentContext, setUploadedDocumentContext] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [activeScoutingAgents, setActiveScoutingAgents] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    toast.success('Conversation reset successfully.');
  }, []);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer' | 'practice'>('content');
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);
  const [isSandboxFullscreen, setIsSandboxFullscreen] = useState(false);
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
  const [videoFeedFallbackActive, setVideoFeedFallbackActive] = useState<boolean>(false);
  const [videoFeedFallbackReason, setVideoFeedFallbackReason] = useState<string | null>(null);
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

  const extractTextFromPDF = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to parse PDF.');
    }
  };

  const renderPDFPagesAsImages = async (file: File, maxPages = 5): Promise<{data: string, mimeType: string}[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const images: {data: string, mimeType: string}[] = [];
      const numPages = Math.min(pdf.numPages, maxPages);

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          images.push({
            data: base64Data,
            mimeType: 'image/jpeg'
          });
        }
      }
      return images;
    } catch (error) {
      console.error('Error rendering PDF pages as images:', error);
      throw new Error('Failed to render PDF pages visually.');
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resizeImage = (file: File, maxWidth = 1024, maxHeight = 1024): Promise<{data: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
          } else {
            if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve({
            data: canvas.toDataURL(file.type, 0.85).split(',')[1],
            mimeType: file.type
          });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileDrop = async (file: File) => {
    if (!file || !moduleId) return;

    const loadingToast = toast.loading(`Preparing ${file.name}...`);

    try {
      const isValidImage = file.type.startsWith('image/');
      const isValidPdf = file.type === 'application/pdf';
      const isValidTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
      const isCodeFile = /\.(js|ts|tsx|py|html|css|json|md|go|rs|cpp|h)$/i.test(file.name) && !isValidPdf;

      // Handle immediate workspace code files
      if (isCodeFile) {
        toast.loading(`Injecting code file ${file.name} to sandbox...`, { id: loadingToast });
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(new Error('Failed to read file as text'));
          reader.readAsText(file);
        });

        const { api } = await import('../services/api');
        const data = await api.injectSessionFile(
          moduleId,
          file.name,
          textContent,
          file.type || 'text/plain',
          module?.title || ''
        );

        if (data.success && data.injectedWorkspaceFile) {
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

          saveModuleSandboxState(pathId!, phaseId!, moduleId!, nextSandboxState);
          setSandboxVersion(prev => prev + 1);
          setSandboxCode(data.injectedWorkspaceFile.content);
          setSandboxLanguage(data.injectedWorkspaceFile.name.endsWith('.py') ? 'python' : 'javascript');
          setSandboxForceInitialCode(true);
          setSandboxPanelOpen(true);
          toast.success(`Injected ${file.name} directly into Sandbox!`, { id: loadingToast });
        } else {
          toast.error("Failed to inject code file.", { id: loadingToast });
        }
        return;
      }

      // Handle images
      if (isValidImage) {
        try {
          const resizedImage = await resizeImage(file);
          if (resizedImage.data) {
            setPendingFiles(prev => [...prev, {
              id: uuidv4(),
              name: file.name,
              data: resizedImage.data,
              mimeType: file.type,
              fileType: 'image'
            }]);
            toast.success("Image attached! Type a prompt or press Send.", { id: loadingToast });
          }
        } catch (err) {
          toast.error("Image could not be processed. Please try a smaller file.", { id: loadingToast });
        }
        return;
      }

      // Handle PDFs
      if (isValidPdf) {
        const textContent = await extractTextFromPDF(file);
        const base64Data = await readFileAsBase64(file);
        
        // If digital text extraction yields nothing (scanned document)
        if (textContent.trim().length < 150) {
          toast.loading("Scanned PDF detected. Rendering pages as images...", { id: loadingToast });
          try {
            const visualPages = await renderPDFPagesAsImages(file, 5);
            if (visualPages.length > 0) {
              setPendingFiles(prev => [...prev, {
                id: uuidv4(),
                name: file.name,
                data: base64Data,
                mimeType: file.type,
                fileType: 'pdf',
                visualPages
              }]);
              toast.success(`Scanned PDF attached visually (first 5 pages). Ready to send!`, { id: loadingToast });
            } else {
              toast.error("No content could be extracted from this PDF.", { id: loadingToast });
            }
          } catch (renderErr) {
            toast.error("Failed to parse visual PDF.", { id: loadingToast });
          }
        } else {
          // Digital PDF
          setPendingFiles(prev => [...prev, {
            id: uuidv4(),
            name: file.name,
            data: base64Data,
            mimeType: file.type,
            fileType: 'pdf',
            extractedText: textContent
          }]);
          toast.success("PDF attached! Type a prompt or press Send.", { id: loadingToast });
        }
        return;
      }

      // Handle text documents
      if (isValidTxt) {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(new Error('Failed to read document'));
          reader.readAsText(file);
        });
        const base64Data = btoa(unescape(encodeURIComponent(textContent)));
        setPendingFiles(prev => [...prev, {
          id: uuidv4(),
          name: file.name,
          data: base64Data,
          mimeType: file.type || 'text/plain',
          fileType: 'text',
          extractedText: textContent
        }]);
        toast.success("Text document attached! Type a prompt or press Send.", { id: loadingToast });
        return;
      }

      toast.error("Unsupported file type. Please upload images or PDFs.", { id: loadingToast });
    } catch (err) {
      toast.error(`Failed to stage file: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: loadingToast });
    }
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
    setSandboxRunTrigger(prev => prev + 1);
    toast.success('Sandbox opened with code');
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

        if (codeString.includes('├──') || codeString.includes('└──') || codeString.includes('Skill Landscape')) {
          return <VisualSkillTree text={codeString} isZenMode={isZenMode} />;
        }

        const isBlockCode = Boolean(!inline && match) || codeString.includes('\n');

        if (!isBlockCode) {
          return (
            <code className={`px-1.5 py-0.5 rounded text-[11px] font-mono border inline font-semibold ${isZenMode ? 'bg-white/10 text-indigo-300 border-white/10' : 'bg-indigo-50/70 text-indigo-700 border-indigo-200/60'}`} {...props}>
              {children}
            </code>
          );
        }

        if (match && ['javascript', 'typescript', 'python', 'html'].includes(match[1]) && codeString.includes('// EXERCISE:')) {
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
                  hideCloseButton={true}
                />
              </div>
            </div>
          );
        }

        return (
          <div className="my-3 rounded-xl border border-white/[0.08] bg-zinc-950 p-4 overflow-x-auto text-left select-text">
            <code className={`${className || ''} text-[12px] font-mono text-indigo-200`} {...props}>
              {codeString}
            </code>
          </div>
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
  const chatFileInputRef = useRef<HTMLInputElement>(null);
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

      setChatHistory([]);

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
    let resources: Resource[] = module.resources || [];
    try {
      // ── STEP 1: Live web scout or seed resources immediately if offline/fallback ──
      const hasOnlyVideos = resources.length > 0 && resources.every(r => r.type === 'youtube');
      if (resources.length === 0 || hasOnlyVideos) {
        try {
          if (hasConfiguredApiKey()) {
            console.log(`[SARA] Scouting topic-specific resources for: "${module.title}"`);
            const scouted = await scoutResources(module.title || '', path?.goal || 'General Mastery');
            if (scouted.length > 0) {
              resources = scouted;
            }
          }
        } catch (scoutErr) {
          console.warn('⚠️ Live web scout failed during loading, falling back to local library:', scoutErr);
        }

        // Curated/Local fallback if scouting returned nothing or failed
        if (resources.length === 0) {
          const { getVideosByTopic } = await import('../services/videoLibrary');
          resources = getVideosByTopic(module.title || '', 4).map(video => ({
            id: `local-${video.id}`,
            title: video.title,
            type: 'youtube' as const,
            content: `https://www.youtube.com/watch?v=${video.id}`,
            videoId: video.id,
          }));
        }

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
      
      // Trigger video curation and timeline mapping even on fallback so the Smartboard never freezes!
      scoutAndMap(fallback, false, resources);
    } finally { setIsContentLoading(false); }
  };

  const scoutAndMap = async (content: string, force = false, preloadedResources?: Resource[]) => {
    if (!module || !path) return;
    setIsScouting(true);
    // Reset fallback flags immediately so a stale amber banner from a previous module
    // does not persist during the async curation window of the new module.
    setVideoFeedFallbackActive(false);
    setVideoFeedFallbackReason(null);
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
        setVideoFeedFallbackActive(curation?.fallbackActive === true);
        setVideoFeedFallbackReason(curation?.fallbackReason || null);
      } catch (curationErr) {
        console.error("Curation failed:", curationErr);
        setVideoFeedFallbackActive(true);
        setVideoFeedFallbackReason('TIMEOUT_OR_RATE_LIMIT');
      }

      let currentResources = preloadedResources || module.resources || [];

      // Logic-based bad resource detection using comprehensive mismatch rules:
      const hasBadResource = currentResources.some(r => {
        if (r.type === 'youtube' && (!r.videoId || r.videoId.length < 5)) return true;
        return isBadResource(r.title || '', module.title || '');
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
            domain: r.content.includes('youtube.com') || r.content.includes('youtu.be')
              ? 'youtube.com'
              : (() => {
                  try {
                    return new URL(r.content).hostname.replace(/^www\./, '');
                  } catch {
                    return 'article';
                  }
                })(),
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
      // If citations exist, reveal buttons when user reaches references section (350px from bottom)
      const threshold = (localCitations && localCitations.length > 0) ? 350 : 80;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
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
  }, [generatedContent, isContentLoading, localCitations, hasReachedBottom]);

  useEffect(() => {
    setHasReachedBottom(false);
  }, [moduleId]);

  const packageChatContext = (extraImages?: { data: string; mimeType: string }[], extraDocumentContext?: string) => {
    const sandboxState = currentSandboxStateRef.current;
    const openFiles = sandboxState?.files
      ? Object.keys(sandboxState.files).map(name => ({ name, path: name }))
      : [];
    const fullEditorCode = sandboxState?.activeFile && sandboxState.files
      ? sandboxState.files[sandboxState.activeFile] || ''
      : '';
    const activeLanguage = sandboxState?.language || 'javascript';

    // Slice editor file to only send active cursor focus (imports + 30 lines above/below cursor)
    let activeEditorFile = '';
    if (fullEditorCode.trim()) {
      const fileLines = fullEditorCode.split('\n');
      const cursorLine = sandboxState?.cursorLine || 1;
      const startLine = Math.max(0, cursorLine - 31);
      const endLine = Math.min(fileLines.length, cursorLine + 30);
      const focusSlice = fileLines.slice(startLine, endLine).join('\n');
      
      const fileImports = (fullEditorCode.match(/^import\s+[\s\S]*?from\s+['"].*?['"]/gm) || []).join('\n');
      activeEditorFile = `${fileImports}\n\n// ... [File Sliced: Lines ${startLine + 1} to ${endLine} around Active Cursor Focus] ...\n${focusSlice}`;
    }

    // Compute student skill profile based on active node masteries
    let studentSkillProfile = 'Beginner';
    if (module?.nodeMastery && Object.keys(module.nodeMastery).length > 0) {
      const keys = Object.keys(module.nodeMastery);
      const values = Object.values(module.nodeMastery);
      const masteredCount = values.filter(v => v === 'mastered').length;
      const understoodCount = values.filter(v => v === 'understood').length;
      const learningCount = values.filter(v => v === 'learning').length;
      
      const advancedScore = (masteredCount + understoodCount) / keys.length;
      const intermediateScore = (masteredCount + understoodCount + learningCount) / keys.length;
      
      if (advancedScore > 0.6) {
        studentSkillProfile = 'Advanced';
      } else if (intermediateScore > 0.4) {
        studentSkillProfile = 'Intermediate';
      }
    }

    // Extract project AST/imports metadata for all files in sandbox
    const projectEcosystem = sandboxState?.files
      ? Object.entries(sandboxState.files).map(([name, content]) => {
          const imports = (content.match(/^import\s+[\s\S]*?from\s+['"].*?['"]/gm) || []).join('\n');
          const declarations = (content.match(/(?:export\s+)?(const|function|async\s+function|class)\s+[A-Za-z0-9_]+/g) || []).slice(0, 8).join(', ');
          return {
            filename: name,
            imports: imports || 'none',
            declarations: declarations || 'none'
          };
        })
      : [];

    return {
      activePathId: pathId || null,
      activeModule: module?.title || null,
      currentSyllabusContext: generatedContent?.substring(0, 3000) || '',
      uploadedDocumentContext: uploadedDocumentContext + (extraDocumentContext || ''),
      uploadedImagesContext: [
        ...chatHistory.flatMap(m => m.images || []),
        ...(extraImages || [])
      ],
      openFiles,
      activeEditorFile,
      activeLanguage,
      lastCompilationError,
      studentSkillProfile,
      projectEcosystem,
      activeStudyMode: leftPanelMode,
      videoPlayback: currentVideoId ? { 
        id: currentVideoId, 
        timestamp: currentVideoTime,
        activeChapterTitle: activeChapterTitle || ''
      } : null,
    };
  };

  const handleSendMessage = async (
    text?: string, 
    displayText?: string, 
    skipUserAppend = false, 
    overrideHistory?: ChatMessage[]
  ) => {
    // Stage attachments
    const imagesToSend = pendingFiles
      .filter(f => f.fileType === 'image')
      .map(f => ({ data: f.data, mimeType: f.mimeType }));
    
    const scannedPdfImages = pendingFiles
      .filter(f => f.fileType === 'pdf' && f.visualPages)
      .flatMap(f => f.visualPages || []);

    const finalImages = [...imagesToSend, ...scannedPdfImages];

    const docsToSend = pendingFiles.filter(f => f.fileType === 'pdf' && !f.visualPages);
    const textDocs = pendingFiles.filter(f => f.fileType === 'text');
    const finalDocuments = [...docsToSend, ...textDocs];

    let msg = text || inputMessage;
    if (!msg.trim()) {
      if (finalImages.length > 0 && finalDocuments.length > 0) {
        msg = "Analyze these files:";
      } else if (finalImages.length > 0) {
        msg = finalImages.length > 1 ? "Analyze these images:" : "Analyze this image:";
      } else if (finalDocuments.length > 0) {
        msg = finalDocuments.length > 1 ? "Analyze these documents:" : `Analyze this document: ${finalDocuments[0].name}`;
      }
    }
    if (!msg.trim() && finalImages.length === 0 && finalDocuments.length === 0) return;

    // Intercept slash commands
    if (msg.startsWith('/')) {
      const parts = msg.trim().split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (command === '/scout') {
        if (!args.trim()) {
          toast.error("Please specify search query, e.g. /scout react router docs");
          return;
        }
        setInputMessage('');
        setLeftPanelMode('content');
        toast.info(`Swarm agents querying for: ${args}`);
        return;
      }

      if (command === '/sandbox') {
        setInputMessage('');
        const lang = args.trim().toLowerCase() || 'javascript';
        setLeftPanelMode('practice');
        setSandboxLanguage(lang);
        setSandboxPanelOpen(true);
        toast.info(`Sandbox switched to ${lang}`);
        return;
      }

      if (command === '/clear' || command === '/clearchat' || command === '/clear-chat') {
        setInputMessage('');
        clearChatHistory();
        return;
      }

      if (command === '/chat' || command === '/quiz' || command === '/notes') {
        setInputMessage('');
        setActiveRightTab(command.substring(1) as any);
        return;
      }

      if (command === '/visualize') {
        setInputMessage('');
        if (!args.trim()) {
          toast.error("Please specify a concept to visualize, e.g. /visualize state");
          return;
        }
        setLeftPanelMode('visualizer');
        toast.info(`Neural map focused on: ${args}`);
        return;
      }

      if (command === '/eli5') {
        if (!args.trim()) {
          toast.error("Please specify a topic, e.g. /eli5 flexbox");
          return;
        }
        setInputMessage('');
        handleSendMessage(`Explain like I'm 5: ${args}`, `Explain like I'm 5: ${args}`);
        return;
      }

      if (command === '/debug') {
        if (!args.trim()) {
          toast.error("Please specify code or file details, e.g. /debug index.js");
          return;
        }
        setInputMessage('');
        handleSendMessage(`Debug my file: ${args}`, `Debug my file: ${args}`);
        return;
      }

      toast.error(`Unknown command: ${command}`);
      return;
    }

    // Sanitize: strip macOS file paths (screenshots, drag-drop file references) that can crash Gemini
    const sanitized = sanitizeSaraMessage(msg);
    if (!sanitized) {
      toast.error('File paths and images are not supported. Please type your question as text.');
      return;
    }

    const localAgents = classifyIntentLocally(sanitized);
    setActiveScoutingAgents(localAgents);

    let extraDocCtx = '';
    if (finalDocuments.length > 0) {
      const { api } = await import('../services/api');
      for (const doc of finalDocuments) {
        try {
          await api.injectSessionFile(
            moduleId,
            doc.name,
            doc.extractedText || '',
            doc.mimeType,
            module?.title || ''
          );
          extraDocCtx += `\n\n--- Document: ${doc.name} ---\n${doc.extractedText || ''}`;
        } catch (err) {
          console.error("Failed to inject document context:", err);
        }
      }
      setUploadedDocumentContext(prev => prev + extraDocCtx);
    }

    if (!skipUserAppend) {
      const sanitizedDisplay = displayText ? sanitizeSaraMessage(displayText) : sanitized;
      const userMsg: ChatMessage = { 
        id: uuidv4(), 
        role: 'user', 
        text: sanitizedDisplay || sanitized, 
        timestamp: Date.now(),
        images: finalImages,
        documents: finalDocuments.map(d => ({ name: d.name, type: d.mimeType }))
      };
      setChatHistory(prev => [...prev, userMsg]);
    }
    
    setInputMessage('');
    setPendingFiles([]);
    setIsTyping(true);

    // Set up AbortController for stream cancellation
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    chatAbortControllerRef.current = new AbortController();

    const modelMsgId = uuidv4();
    const initialModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      reasoning: '',
      timestamp: Date.now(),
      isGenerating: true,
    };
    setChatHistory(prev => {
      const base = overrideHistory || prev;
      return [...base, initialModelMsg];
    });

    const chatStartTime = Date.now();
    let ttft: number | undefined;
    let accumulatedText = '';
    
    const onChunk = (chunk: string) => {
      if (!ttft) {
        ttft = Date.now() - chatStartTime;
      }
      accumulatedText += chunk;
      const parsed = parseStreamBuffer(accumulatedText);
      setChatHistory(prev => prev.map(m => m.id === modelMsgId ? {
        ...m,
        text: parsed.text,
        reasoning: parsed.reasoning,
        isThinking: parsed.isThinking,
        activeAgents: parsed.activeAgents || m.activeAgents,
        completedAgents: parsed.completedAgents || m.completedAgents,
        payloadData: parsed.payloadData || m.payloadData,
      } : m));
    };

    try {
      const result = await chatWithTutorStream(
        overrideHistory || chatHistory,
        sanitized,
        `Module: ${module?.title}`,
        generatedContent || '',
        packageChatContext(finalImages, extraDocCtx),
        onChunk,
        chatAbortControllerRef.current?.signal
      );
      const thinkingDuration = Math.max(1, Math.round((Date.now() - chatStartTime) / 1000));
      
      setChatHistory(prev => prev.map(m => m.id === modelMsgId ? {
        ...m,
        text: result.text || '',
        reasoning: result.reasoning,
        mode: result.mode,
        intent: result.intent,
        action: result.action,
        target: result.target,
        skill_update: result.skill_update,
        interactive_block: result.interactive_block,
        sara_metadata: result.sara_metadata || null,
        activeAgents: result.activeAgents,
        completedAgents: result.completedAgents,
        payloadData: result.payloadData,
        thinkingDuration,
        ttft: ttft ? Math.round(ttft) : undefined,
        isGenerating: false,
      } : m));

      // ─── AI Layout Actions Trigger ───
      // (open_notes action removed to prevent flow disruption)

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
      let shouldRetry = false;
      let saraErrorText = '';

      if (errorMsg.includes('image input') || errorMsg.includes('does not support')) {
        saraErrorText = `> ⚠️ **I can't process images or file paths** — please type your question as text.`;
      } else if (
        errorMsg.includes('AI_TIMEOUT') || 
        errorMsg.includes('timeout') || 
        errorMsg.includes('quota') || 
        errorMsg.includes('exhausted') || 
        errorMsg.includes('429') ||
        errorMsg.includes('API key') || 
        errorMsg.includes('401') || 
        errorMsg.includes('403') || 
        errorMsg.includes('unavailable') || 
        errorMsg.includes('GEMINI_API_KEY') ||
        errorMsg.includes('failed')
      ) {
        // Automatic Silent Retry System: If the custom model fails, immediately try again.
        // We do this by temporarily overriding the mode to 'auto' for this request, 
        // letting the backend try its fallback keys and default models, or letting 
        // the client-side use its built-in fallback chain without bothering the user.
        shouldRetry = true;
      } else {
        shouldRetry = true;
      }

      if (shouldRetry) {
        try {
          console.warn('[SARA] Primary model request failed. Initiating automatic retry with fallback...');
          const retryStartTime = Date.now();
          let retryAccumulated = '';
          
          const onRetryChunk = (chunk: string) => {
            retryAccumulated += chunk;
            const parsed = parseStreamBuffer(retryAccumulated);
            setChatHistory(prev => prev.map(m => m.id === modelMsgId ? {
              ...m,
              text: parsed.text,
              reasoning: parsed.reasoning,
              isThinking: parsed.isThinking,
              activeAgents: parsed.activeAgents || m.activeAgents,
            } : m));
          };

          const retryResult = await chatWithTutorStream(
            chatHistory,
            sanitized,
            `Module: ${module?.title}`,
            generatedContent || '',
            packageChatContext(),
            onRetryChunk,
            chatAbortControllerRef.current?.signal
          );
          const thinkingDuration = Math.max(1, Math.round((Date.now() - retryStartTime) / 1000));
          
          setChatHistory(prev => prev.map(m => m.id === modelMsgId ? {
            ...m,
            text: retryResult.text || '',
            reasoning: retryResult.reasoning,
            mode: retryResult.mode,
            intent: retryResult.intent,
            action: retryResult.action,
            target: retryResult.target,
            skill_update: retryResult.skill_update,
            interactive_block: retryResult.interactive_block,
            activeAgents: retryResult.activeAgents,
            completedAgents: retryResult.completedAgents,
            payloadData: retryResult.payloadData,
            thinkingDuration,
            ttft: ttft ? Math.round(ttft) : undefined,
            isGenerating: false,
          } : m));
          
          // (open_notes action removed to prevent flow disruption)
          
          // Re-process mastery updates
          if (retryResult.skill_update && pathId && phaseId && moduleId && module) {
            const { concept, delta } = retryResult.skill_update;
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
            }
          }
          return; // Successfully recovered!
        } catch (retryErr: any) {
          // If the retry also fails, show a clean, graceful error
          saraErrorText = `> ⚠️ **Temporary Network Issue.** I couldn't reach the AI engine right now. Please try your request again in a few moments.\n\n*(Debug: ${retryErr.message || String(retryErr)})*`;
        }
      }

      setChatHistory(prev => prev.map(m => m.id === modelMsgId ? {
        ...m,
        text: saraErrorText,
        isGenerating: false,
      } : m));
    } finally {
      setIsTyping(false);
      setActiveScoutingAgents([]);
    }
  };

  const handleCancelSara = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
      setIsTyping(false);
      setActiveScoutingAgents([]);
      
      // Update last generating message to show cancelled status
      setChatHistory(prev => prev.map(m => m.isGenerating ? {
        ...m,
        text: '> 🛑 *Response generation cancelled by student.*',
        isGenerating: false,
      } : m));
    }
  };

  const handleRegenerate = async () => {
    const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    
    const lastUserIdx = chatHistory.findIndex(m => m.id === lastUserMsg.id);
    if (lastUserIdx === -1) return;
    
    const newHistory = chatHistory.slice(0, lastUserIdx + 1);
    setChatHistory(newHistory);
    
    await handleSendMessage(lastUserMsg.text, undefined, true, newHistory);
  };

  const handleEditMessage = async (idx: number, newText: string) => {
    const updated = [...chatHistory];
    const m = updated[idx];
    updated[idx] = {
      ...m,
      text: newText,
      editCount: (m.editCount || 0) + 1
    };
    const newHistory = updated.slice(0, idx + 1);
    setChatHistory(newHistory);

    await handleSendMessage(newText, undefined, true, newHistory);
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
      className="flex flex-col w-full h-full transition-all duration-1000 overflow-hidden font-sans"
      style={{
        background: isZenMode ? '#05070a' : '#ffffff'
      }}
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
          <header className={`shrink-0 overflow-hidden px-5 sm:px-8 grid grid-cols-3 items-center z-[60] transition-all duration-700 relative ${isZenMode || isNeuralFullScreen ? 'h-0 opacity-0 border-none pointer-events-none' : 'h-14 bg-[#09054a]/85 backdrop-blur-[12px] border-b border-white/[0.08] shadow-sm'}`}>

            {/* Dynamic Glowing HSL Border Line */}
            {!isZenMode && !isNeuralFullScreen && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px] z-10"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.25), rgba(139,92,246,0.4), rgba(56,189,248,0.25), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift 4s linear infinite',
                  opacity: isTimerRunning ? 0.85 : 0.35,
                  transition: 'opacity 0.5s ease',
                }}
              />
            )}

            {/* Left Section */}
            <div className="flex items-center gap-3.5 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <Link to="/dashboard" aria-label="Back to Dashboard" title="Back to Dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/10 transition-all cursor-pointer">
                  <ArrowLeft size={15} />
                </Link>
                <button
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 border cursor-pointer ${
                    isCurriculumOpen
                      ? 'bg-[#4e5bff]/20 text-[#9aa3ff] border-[#4e5bff]/30'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                  title="Toggle Study Outline"
                >
                  <GitBranch size={15} />
                </button>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-0.5 min-w-0 select-none">
                  <span className="text-[8px] font-black font-display uppercase tracking-[0.2em] px-2 py-0.5 rounded-full shrink-0 bg-white/5 text-indigo-300 border border-white/10">
                    Phase {path?.phases.findIndex(p => p.id === phaseId) !== -1 ? ((path?.phases.findIndex(p => p.id === phaseId) ?? 0) + 1).toString().padStart(2, '0') : '01'}
                  </span>
                  <span className="text-[9px] font-semibold font-display tracking-wide truncate text-indigo-200/60">
                    {phase?.title ? phase.title.replace(/^Phase\s*\d+\s*[:\-]\s*/i, '') : ''}
                  </span>
                </div>
                <h1 className="text-[13px] font-semibold tracking-tight truncate leading-tight text-white">{module?.title}</h1>
              </div>
            </div>

            {/* Center Section: Mode Toggle */}
            <div className="flex justify-center min-w-0">
              <div className="relative flex p-[3px] rounded-full bg-white/[0.04] border border-white/10 shadow-inner items-center">
                {/* Sliding Background Indicator */}
                <motion.div
                  initial={false}
                  animate={{ x: getPanelModeIndex() * 86 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                  className="absolute top-[3px] bottom-[3px] left-[3px] w-[86px] rounded-full z-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />

                <button
                  onClick={() => setLeftPanelMode('smartboard')}
                  className={`relative z-10 w-[86px] py-1 rounded-full text-[9px] font-display font-semibold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                    leftPanelMode === 'smartboard' ? 'text-slate-950 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Smartboard
                </button>

                <button
                  onClick={() => setLeftPanelMode('content')}
                  className={`relative z-10 w-[86px] py-1 rounded-full text-[9px] font-display font-semibold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                    leftPanelMode === 'content' ? 'text-slate-950 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Whiteboard
                </button>

                <button
                  onClick={() => setLeftPanelMode('visualizer')}
                  className={`relative z-10 w-[86px] py-1 rounded-full text-[9px] font-display font-semibold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                    leftPanelMode === 'visualizer' ? 'text-slate-950 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Neural Map
                </button>

                <button
                  onClick={() => setLeftPanelMode('practice')}
                  className={`relative z-10 w-[86px] py-1 rounded-full text-[9px] font-display font-semibold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                    leftPanelMode === 'practice' ? 'text-slate-950 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Practice
                </button>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end gap-3 min-w-0">
              {/* Real-Time Checkpoint Timer Pill */}
              <div
                className={`flex items-center gap-2.5 h-8 px-3 rounded-full border transition-all duration-300 ${
                  timerAlert
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                    : 'bg-white/[0.04] border-white/10 text-white shadow-sm'
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
                  className="flex items-center gap-1.5 min-w-[50px] justify-center font-mono text-[10px] font-bold tracking-wider relative cursor-pointer hover:opacity-85 transition-opacity"
                >
                  {/* SVG Micro Circular Progress Ring */}
                  <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
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
                    <Clock size={8.5} className={`relative z-10 text-current ${isTimerRunning && !timerAlert ? "animate-[spin_10s_linear_infinite]" : ""}`} />
                  </div>
                  <span>{formatTimerTime(timeLeft)}</span>
                </div>

                <button
                  onClick={() => handleAdjustTimer(5 * 60)}
                  title="Add +5 Mins"
                  className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all cursor-pointer text-white border border-white/5"
                >
                  +5m
                </button>
              </div>

              <button
                onClick={() => setIsZenMode(!isZenMode)}
                className="flex items-center justify-center h-8 px-3.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-white/5 text-slate-200 hover:text-white border border-white/10 hover:bg-white/10 cursor-pointer font-display text-[9px] font-semibold tracking-wider uppercase"
              >
                <span>Zen Mode</span>
              </button>

              <button
                onClick={() => {
                  const next = !saraOpen;
                  setSaraOpen(next);
                  setFocusMode(next ? 'split' : 'content');
                }}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-white/5 text-slate-200 hover:text-white border border-white/10 hover:bg-white/10 cursor-pointer font-display text-[9px] font-semibold tracking-wider uppercase"
              >
                <BookOpen size={11} strokeWidth={2.4} />
                <span className="hidden sm:block">
                  {saraOpen ? 'Close Cortex' : 'Cortex'}
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
              className={`shrink-0 flex flex-col border-r overflow-hidden z-30 transition-all duration-500 @container ${
                isZenMode 
                  ? 'bg-[#05070a]/95 backdrop-blur-xl border-white/5' 
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex-1 flex flex-col min-w-[340px] h-full max-h-full">
                {/* ── Header Section ── */}
                <div className={`p-6 border-b transition-all ${
                  isZenMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-white'
                }`}>
                  <div className="flex items-center mb-2 select-none">
                    <span className={`text-[9.5px] font-black uppercase tracking-[0.25em] ${
                      isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'
                    }`}>
                      Roadmap
                    </span>
                  </div>
                  <h2 className={`text-[17px] font-display font-bold tracking-tight leading-tight ${
                    isZenMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {path?.title || 'Study Roadmap'}
                  </h2>
                </div>

                {/* ── Phase & Module List ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
                  {path?.phases?.map((p, pIdx) => (
                    <div key={p.id} className="mb-8 relative">
                      {/* Phase Header */}
                      <div className="px-6 pb-2">
                        <div className="flex items-center gap-2 mb-1 select-none">
                          <span className={`text-[9px] font-black uppercase tracking-widest font-mono ${
                            isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'
                          }`}>
                            Chapter {pIdx + 1}
                          </span>
                          <div className={`h-[1px] flex-1 ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                        </div>
                        <h4 className={`text-[12.5px] font-extrabold tracking-tight font-serif ${
                          isZenMode ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {p.title.replace(/^Phase\s*\d+\s*[:\-]\s*/i, '')}
                        </h4>
                      </div>

                      <div className="mt-2 relative">
                        <div className="flex flex-col">
                          {p.modules?.map((m, mIdx) => {
                            const isActive = m.id === moduleId;
                            return (
                              <button
                                key={m.id}
                                onClick={() => navigate(`/study/${pathId}/${p.id}/${m.id}`)}
                                className="w-full flex items-baseline justify-between px-6 py-1.5 group relative text-left focus:outline-none cursor-pointer text-[12.5px] transition-colors"
                              >
                                {/* Module Prefix & Title */}
                                <div className="flex items-baseline gap-2 min-w-0 max-w-[75%] select-none">
                                  <span className="text-[10px] font-bold font-mono tracking-tight text-slate-400 shrink-0">
                                    {pIdx + 1}.{mIdx + 1}
                                  </span>
                                  {(() => {
                                    const match = m.title.match(/^\[(.*?)\]\s*(.*)/);
                                    const tag = match ? match[1] : null;
                                    const cleanTitle = match ? match[2] : m.title;

                                    let tagColor = isZenMode ? 'bg-white/10 text-slate-300 border-white/15' : 'bg-slate-100 text-slate-700 border-slate-200';
                                    if (tag) {
                                      const tl = tag.toLowerCase();
                                      if (tl.includes('front') || tl.includes('ux') || tl.includes('react')) tagColor = isZenMode ? 'bg-amber-950/60 text-amber-300 border-amber-800/40' : 'bg-amber-50 text-amber-700 border-amber-200/60';
                                      else if (tl.includes('back') || tl.includes('sql') || tl.includes('mongo')) tagColor = isZenMode ? 'bg-sky-950/60 text-sky-300 border-sky-800/40' : 'bg-sky-50 text-sky-700 border-sky-200/60';
                                      else if (tl.includes('devops') || tl.includes('cloud') || tl.includes('docker')) tagColor = isZenMode ? 'bg-violet-950/60 text-violet-300 border-violet-800/40' : 'bg-violet-50 text-violet-700 border-violet-200/60';
                                      else if (tl.includes('hybrid') || tl.includes('capstone') || tl.includes('synth')) tagColor = isZenMode ? 'bg-purple-900/80 text-purple-200 border-purple-500/50 font-black' : 'bg-purple-100 text-purple-800 border-purple-300/80 font-black';
                                    }

                                    return (
                                      <>
                                        {tag && (
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border select-none shrink-0 ${tagColor}`}>
                                            {tag}
                                          </span>
                                        )}
                                        <span className={`font-medium truncate transition-colors duration-200 ${
                                          isActive
                                            ? (isZenMode ? 'text-indigo-400 font-bold' : 'text-[#4e5bff] font-bold')
                                            : m.isCompleted
                                              ? 'line-through text-slate-400 dark:text-slate-500'
                                              : (isZenMode ? 'text-slate-350 hover:text-slate-100' : 'text-slate-600 hover:text-[#4e5bff]')
                                        }`}>
                                          {cleanTitle}
                                        </span>
                                      </>
                                    );
                                  })()}
                                  {isActive && (
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50/80 text-[#4e5bff]'
                                    } select-none scale-90 origin-left shrink-0`}>
                                      Active
                                    </span>
                                  )}
                                </div>

                                {/* Dotted Line Leader */}
                                <div className={`flex-1 border-b border-dotted mx-2 min-w-[10px] self-center transition-colors ${
                                  isZenMode ? 'border-white/[0.06] group-hover:border-indigo-500/30' : 'border-slate-200 group-hover:border-indigo-200'
                                }`} />

                                {/* Metadata & Status */}
                                <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                                  <span className="text-slate-400 dark:text-slate-500">{m.estimatedMinutes || 15}m</span>
                                  {m.isCompleted ? (
                                    <span className="text-[#22c55e] font-extrabold uppercase tracking-wider text-[8.5px] select-none">
                                      Done
                                    </span>
                                  ) : isActive ? (
                                    <span className={`font-extrabold uppercase tracking-wider text-[8.5px] select-none ${
                                      isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'
                                    }`}>
                                      Active
                                    </span>
                                  ) : (
                                    <span className="text-slate-350 dark:text-slate-500 font-bold uppercase tracking-wider text-[8.5px] select-none flex items-center gap-0.5">
                                      <Lock size={8} /> Lock
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Progress Footer Section ── */}
                {(() => {
                  const totalModules = path?.phases?.reduce((acc, p) => acc + (p.modules?.length || 0), 0) || 0;
                  const completedModules = path?.phases?.reduce((acc, p) => acc + (p.modules?.filter(m => m.isCompleted).length || 0), 0) || 0;
                  return (
                    <div className={`p-6 border-t transition-all ${
                      isZenMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-white'
                    }`}>
                      <div className="flex justify-between items-center mb-2.5">
                         <div className="flex flex-col">
                           <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                             isZenMode ? 'text-slate-500' : 'text-slate-450'
                           }`}>Curriculum Progress</p>
                           <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                             {completedModules} of {totalModules} modules completed
                           </p>
                         </div>
                         <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                           isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#4e5bff]/10 text-[#4e5bff]'
                         }`}>
                           {path?.progress || 0}%
                         </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${path?.progress || 0}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                          className="h-full bg-gradient-to-r from-[#4e5bff] to-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })()}
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
                  <div className="flex items-center gap-2">
                    <Music size={11} className={isAudioActive ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
                    {/* Sound-wave viz */}
                    <div className="flex items-end gap-[2.5px] h-3.5 pb-[1.5px] px-1 bg-white/[0.02] border border-white/5 rounded-md">
                      {[0.6, 1.1, 0.8, 1.2, 0.7].map((dur, i) => (
                        <div
                          key={i}
                          className="w-[2px] h-full rounded-full sound-wave-bar origin-bottom"
                          style={{
                            background: ['#4e5bff','#8b5cf6','#38bdf8','#8b5cf6','#4e5bff'][i],
                            animationDuration: `${dur}s`,
                            animationDelay: `${[0.1,0.35,0.18,0.45,0.25][i]}s`,
                            animationPlayState: isAudioActive ? 'running' : 'paused',
                            opacity: isAudioActive ? 1 : 0.25,
                          }}
                        />
                      ))}
                    </div>
                    {/* Track toggles — Segmented Pills */}
                    <div className="flex items-center gap-0.5 bg-white/5 border border-white/5 p-0.5 rounded-full select-none shrink-0">
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
                            className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider transition-all cursor-pointer border-none ${
                              active 
                                ? 'bg-white/10 text-indigo-300 font-black shadow-[0_1px_5px_rgba(99,102,241,0.15)]' 
                                : 'bg-transparent text-slate-500 hover:text-slate-350 hover:bg-white/[0.02]'
                            }`}
                          >
                            {tTrack.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Volume slider */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <Volume2 size={9.5} className="text-slate-500" />
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={soundscapeState.volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-14 cursor-pointer soundscape-volume-slider"
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

            {/* PANEL 1: CONTENT / VISUALIZER */}
               <div className={`flex flex-col relative transition-all duration-500 flex-1 h-full min-w-0 min-h-0 z-10 ${isZenMode ? `border-r border-white/5 ${showZenControls ? 'pt-[52px]' : 'pt-0'}` : (leftPanelMode === 'content' ? 'bg-transparent' : 'border-r border-slate-200/50')}`}>
                  <div className="flex-1 overflow-hidden relative min-h-0">
                    {/* Premium Ambient Background layer */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                      {/* Ambient Glow Orb 1 */}
                      <div 
                        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 transition-all duration-1000"
                        style={{ 
                          background: `radial-gradient(circle, ${theme.primary}22 0%, transparent 70%)` 
                        }} 
                      />
                      {/* Ambient Glow Orb 2 */}
                      <div 
                        className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full blur-[120px] opacity-40 transition-all duration-1000"
                        style={{ 
                          background: `radial-gradient(circle, ${theme.primary}10 0%, transparent 70%)` 
                        }} 
                      />
                      {/* Fine Dot Grid Pattern */}
                      <div 
                        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
                        style={{
                          backgroundImage: isZenMode 
                            ? 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)' 
                            : 'radial-gradient(rgba(78, 91, 255, 0.08) 1px, transparent 1px)',
                          backgroundSize: '24px 24px'
                        }}
                      />
                    </div>

                    <div className="relative z-10 w-full h-full">
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
                        fallbackActive={videoFeedFallbackActive}
                        fallbackReason={videoFeedFallbackReason}
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
                </div>

              <FloatingSandboxPanel
               key={moduleId}
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
               saraOpen={saraOpen}
               onToggleSara={() => setSaraOpen(!saraOpen)}
               onFullscreenChange={(isFS) => setIsSandboxFullscreen(isFS)}
             />

             {/* PANEL 2: ASSISTANT SIDEBAR — Liquid Glass Aesthetics */}
             <ConditionalPortal active={isSandboxFullscreen}>
              <div
              className={`shrink-0 flex flex-col transition-all duration-500 ease-out overflow-hidden ${isSandboxFullscreen ? 'fixed top-0 bottom-0 right-0 h-screen shadow-2xl z-[10000]' : 'absolute xl:relative right-0 top-0 bottom-0 h-full z-40'} ${(saraOpen && !isContentLoading) ? 'w-[580px] xl:w-[620px] max-w-full' : 'w-0 min-w-0 opacity-0 pointer-events-none'} ${isZenMode ? `bg-[#05070a]/95 backdrop-blur-2xl border-l border-white/5 zen-mode ${showZenControls ? 'pt-[52px]' : 'pt-0'}` : 'bg-[#F9F9FB] border-l border-[#E5E5E7] shadow-[-10px_0_40px_rgba(0,0,0,0.06)] xl:shadow-[0_16px_48px_rgba(15,23,42,0.04)]'}`}
              style={{
                opacity: (saraOpen && !isContentLoading) ? (isZenMode && isSidebarGhost ? 0.1 : 1) : 0,
                transition: 'opacity 0.8s ease, width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={() => { /* hook resets on mousemove globally */ }}
            >
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Dedicated Header for Right Panel Tabs (Only shown when Assessment is active) */}
                    {quizQuestions.length > 0 && (
                      <div className={`shrink-0 z-[60] px-6 py-3 flex items-center justify-between border-b select-none ${
                        isZenMode 
                          ? 'bg-transparent border-white/5' 
                          : 'bg-white/70 backdrop-blur-md border-slate-100/90'
                      }`}>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setActiveRightTab('chat')}
                            className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all cursor-pointer ${
                              activeRightTab === 'chat' 
                                ? (isZenMode ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-[#4e5bff] border-b-2 border-[#4e5bff] pb-1') 
                                : (isZenMode ? 'text-slate-400/50 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                            }`}
                          >
                            Assistant
                          </button>
                          <span className={`text-[11px] ${isZenMode ? 'text-white/10' : 'text-slate-200'}`}>|</span>
                          <button 
                            onClick={() => setActiveRightTab('quiz')}
                            className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all cursor-pointer ${
                              activeRightTab === 'quiz' 
                                ? (isZenMode ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-[#4e5bff] border-b-2 border-[#4e5bff] pb-1') 
                                : (isZenMode ? 'text-slate-400/50 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                            }`}
                          >
                            Assessment
                          </button>
                        </div>
                      </div>
                    )}

                   <div className="flex-1 relative min-h-0">
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
                               className="flex h-full flex-col assistant-glass-panel relative bg-transparent"
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
                                <AnimatePresence mode="wait">
                                  {chatHistory.length === 0 && inputMessage.trim().length === 0 && !isChatInputFocused ? (
                                    <motion.div
                                      key="welcome-cortex-card"
                                      initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
                                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                      exit={{ opacity: 0, scale: 0.93, filter: 'blur(8px)', transition: { duration: 0.22, ease: 'easeOut' } }}
                                      className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 relative overflow-hidden"
                                    >
                                      <style>{`
                                        @keyframes saraHeroFieldDrift {
                                          0% { transform: scale(1.08) translate(0, 0) rotate(0deg); opacity: 0.9; }
                                          100% { transform: scale(1.03) translate(-10px, 6px) rotate(0.5deg); opacity: 1; }
                                        }
                                      `}</style>

                                      <div className="relative z-10 flex flex-col items-center p-9 sm:p-10 rounded-[32px] border border-indigo-400/35 shadow-[0_24px_64px_rgba(15,11,107,0.45)] overflow-hidden w-full max-w-[370px] bg-gradient-to-br from-[#090547] via-[#0f0b6b] to-[#040228] text-white">
                                        {/* Background Animated Neural Drift Field */}
                                        <div 
                                          className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-[0.9] mix-blend-screen pointer-events-none"
                                          style={{ 
                                            backgroundImage: "url('/images/cortex-blue-field.png')",
                                            transformOrigin: 'center center',
                                            animation: 'saraHeroFieldDrift 7s ease-in-out infinite alternate',
                                          }} 
                                        />
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,11,107,0)_0%,#060430_100%)] opacity-85 mix-blend-multiply pointer-events-none" />

                                        {/* Floating High-Tech Glowing Emblem */}
                                        <div className="relative mb-6 z-10">
                                          <div className="w-18 h-18 rounded-[24px] flex items-center justify-center relative z-10 bg-indigo-500/25 text-indigo-200 border border-indigo-300/40 backdrop-blur-xl shadow-[inset_0_2px_12px_rgba(255,255,255,0.2)]">
                                            <svg 
                                              viewBox="0 0 24 24" 
                                              fill="none" 
                                              stroke="currentColor" 
                                              strokeWidth="2.2" 
                                              strokeLinecap="round" 
                                              className="w-8 h-8 text-indigo-200"
                                            >
                                              <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40 origin-center animate-[spin_18s_linear_infinite]" />
                                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-95 animate-pulse" />
                                              <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-95 animate-pulse" />
                                              <circle cx="12" cy="12" r="2.2" fill="currentColor" className="stroke-none" />
                                            </svg>
                                          </div>
                                          <div className="absolute -inset-4 rounded-full blur-2xl animate-pulse bg-indigo-400/40" />
                                        </div>
                                        
                                        <h3 className="relative z-10 text-[11.5px] font-black uppercase tracking-[0.25em] mb-2 text-white">
                                          Cortex Neural Architect
                                        </h3>
                                        <p className="relative z-10 text-[12.5px] font-medium mb-7 leading-relaxed text-indigo-100/90 max-w-[260px]">
                                          I am SARA. Ask any concept question, code challenge, or module review.
                                        </p>

                                        <div className="relative z-10 w-full space-y-3">
                                          <motion.button
                                            whileHover={{ scale: 1.025, y: -1.5 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => handleSendMessage("Give me a high-level summary of this module.")}
                                            className="w-full py-3 px-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border border-white/25 text-white bg-white/12 hover:bg-white/25 hover:border-white/50 backdrop-blur-md transition-all cursor-pointer shadow-md"
                                          >
                                            Summarize Path
                                          </motion.button>
                                          <motion.button
                                            whileHover={{ scale: 1.025, y: -1.5 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => handleSendMessage("What are the 3 most important concepts here?")}
                                            className="w-full py-3 px-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border border-white/25 text-white bg-white/12 hover:bg-white/25 hover:border-white/50 backdrop-blur-md transition-all cursor-pointer shadow-md"
                                          >
                                            Pinpoint Essentials
                                          </motion.button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ) : (
                                    chatHistory.map((m, idx) => (
                                      <SaraMessageBubble
                                        key={m.id}
                                        message={m}
                                        index={idx}
                                        chatHistory={chatHistory}
                                        isZenMode={isZenMode}
                                        onSendMessage={handleSendMessage}
                                        onRegenerate={handleRegenerate}
                                        inputMessage={inputMessage}
                                        setInputMessage={setInputMessage}
                                        chatInputRef={chatInputRef}
                                        notes={notes}
                                        setNotes={setNotes}
                                        pathId={pathId}
                                        phaseId={phaseId}
                                        moduleId={moduleId}
                                        module={module}
                                        saveModuleNotes={saveModuleNotes}
                                        saveNodeMastery={saveNodeMastery}
                                        getActiveModelName={getActiveModelName}
                                        setCuratedVideoId={setCuratedVideoId}
                                        setLeftPanelMode={setLeftPanelMode}
                                        setSandboxCode={setSandboxCode}
                                        setSandboxLanguage={setSandboxLanguage}
                                        setSandboxForceInitialCode={setSandboxForceInitialCode}
                                        setSandboxPanelOpen={setSandboxPanelOpen}
                                        setSandboxRunTrigger={setSandboxRunTrigger}
                                        ChatMarkdownComponents={ChatMarkdownComponents}
                                        onEditMessage={handleEditMessage}
                                      />
                                    ))
                                  )}
                                </AnimatePresence>

                                {isTyping && activeScoutingAgents.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start w-full px-2 py-4"
                                  >
                                    <div className={`w-full max-w-4xl mx-auto flex flex-col gap-3.5 select-none ${isZenMode ? 'text-slate-300' : 'text-slate-500'}`}>
                                       {activeScoutingAgents.length > 0 && (
                                         <div className={`mt-1 p-3 rounded-xl border space-y-2.5 ${isZenMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                           <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                             Running Agents ({activeScoutingAgents.length})
                                           </div>
                                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                             {activeScoutingAgents.map((agent) => (
                                               <div
                                                 key={agent}
                                                 className={`flex items-center gap-2.5 p-2 rounded-lg border text-[11px] font-medium transition-all ${
                                                   isZenMode
                                                     ? 'bg-white/[0.03] border-white/5 text-slate-350'
                                                     : 'bg-white border-slate-150 text-slate-650 shadow-sm'
                                                 }`}
                                               >
                                                 {/* Spinner/Pulse */}
                                                 <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                                                   <Loader size={12} className="text-indigo-550 animate-spin" />
                                                 </div>
                                                 <div className="flex flex-col min-w-0">
                                                   <span className="font-mono text-[10px] font-black truncate">{agent}</span>
                                                   <span className="text-[8px] text-slate-400 truncate">
                                                     {agent === 'YouTubeScout' && 'scouting visual lectures...'}
                                                     {agent === 'GoogleScout' && 'querying web documents...'}
                                                     {agent === 'GitHubScout' && 'finding open-source boilerplate...'}
                                                     {agent === 'WorkspaceConfigurator' && 'generating starter project...'}
                                                   </span>
                                                 </div>
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       )}
                                    </div>
                                  </motion.div>
                                )}
                              </div>

                              {/* Input Section */}
                              <div className={`p-4 border-t ${isZenMode ? 'border-white/5' : 'border-[#E5E5E7]'}`}>
                                 <div className={`relative mt-2 rounded-[32px] border transition-all duration-300 flex flex-col ${
                                    isZenMode
                                      ? `bg-white/[0.03] border-white/[0.08] focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 ${isTyping ? 'opacity-60' : ''}`
                                      : (!isZenMode && chatHistory.length === 0)
                                        ? `gemini-new-chat-glowing ${isTyping ? 'opacity-60' : ''}`
                                        : `bg-white border-[#DADCE0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-[#1A73E8] focus-within:ring-4 focus-within:ring-[#1A73E8]/8 ${isTyping ? 'opacity-60' : ''}`
                                  }`}>
                                    {showSlashMenu && (
                                      <div className={`absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-xl z-[150] overflow-hidden ${
                                        isZenMode ? 'bg-[#0b0c10]/95 backdrop-blur-md border-white/10 text-slate-200' : 'bg-white border-[#E5E5E7] text-[#1D1D1F]'
                                      }`}>
                                        <div className={`px-3 py-1.5 text-[8.5px] font-black uppercase tracking-[0.2em] border-b ${
                                          isZenMode ? 'border-white/5 text-slate-500' : 'border-[#E5E5E7] text-[#86868B]'
                                        }`}>
                                          Classroom Slash Commands
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                          {SLASH_COMMANDS.filter(c => c.cmd.startsWith(inputMessage)).map((command, idx) => {
                                            const isSelected = idx === slashSelectedIndex;
                                            return (
                                              <button
                                                key={command.cmd}
                                                type="button"
                                                onClick={() => {
                                                  if ((command as any).action === 'switch_tab') {
                                                    setActiveRightTab((command as any).target);
                                                    setShowSlashMenu(false);
                                                    setInputMessage('');
                                                    return;
                                                  }
                                                  if ((command as any).action === 'clear_chat') {
                                                    clearChatHistory();
                                                    setShowSlashMenu(false);
                                                    setInputMessage('');
                                                    return;
                                                  }
                                                  setInputMessage(command.placeholder || command.cmd);
                                                  setShowSlashMenu(false);
                                                  setTimeout(() => chatInputRef.current?.focus(), 50);
                                                }}
                                                className={`w-full text-left px-3.5 py-2.5 flex flex-col transition-colors cursor-pointer border-none outline-none ${
                                                  isSelected
                                                    ? (isZenMode ? 'bg-indigo-500/20 text-white font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold')
                                                    : (isZenMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                                                }`}
                                              >
                                                <span className="text-[12.5px] font-mono font-bold">{command.cmd}</span>
                                                <span className={`text-[9.5px] mt-0.5 ${isSelected ? (isZenMode ? 'text-indigo-300' : 'text-indigo-500') : 'text-slate-400'}`}>
                                                  {command.desc}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* PENDING FILES PREVIEW */}
                                    {pendingFiles.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-3 p-3 pb-0 select-none">
                                        {pendingFiles.map((file) => (
                                          <div key={file.id} className="relative group">
                                            {file.fileType === 'image' ? (
                                              <img
                                                src={`data:${file.mimeType};base64,${file.data}`}
                                                alt={file.name}
                                                className={`max-w-[100px] max-h-[100px] rounded-lg border object-contain shadow-sm ${
                                                  isZenMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                                                }`}
                                              />
                                            ) : (
                                              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                                isZenMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-755'
                                              } relative group max-w-[280px]`}>
                                                <File size={13} className={isZenMode ? 'text-indigo-400' : 'text-indigo-500'} />
                                                <span className="text-[11.5px] font-bold truncate max-w-[180px]">
                                                  {file.name}
                                                </span>
                                                <span className="text-[8.5px] uppercase tracking-wider opacity-60">
                                                  {file.mimeType === 'application/pdf' ? 'pdf' : 'txt'}
                                                </span>
                                              </div>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== file.id))}
                                              className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md cursor-pointer border-none transition-all hover:scale-105 active:scale-95"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <textarea
                                      ref={chatInputRef}
                                      value={inputMessage}
                                      disabled={isTyping}
                                      rows={1}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInputMessage(val);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                        
                                        const isSlash = val.startsWith('/') && !val.includes(' ');
                                        setShowSlashMenu(isSlash);
                                        if (isSlash) {
                                          setSlashSelectedIndex(0);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        const filteredCommands = SLASH_COMMANDS.filter(c => c.cmd.startsWith(inputMessage));
                                        if (showSlashMenu && filteredCommands.length > 0) {
                                          if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSlashSelectedIndex(prev => (prev + 1) % filteredCommands.length);
                                            return;
                                          }
                                          if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSlashSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                                            return;
                                          }
                                          if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            const selectedCmd = filteredCommands[slashSelectedIndex];
                                            setInputMessage(selectedCmd.placeholder || selectedCmd.cmd);
                                            setShowSlashMenu(false);
                                            return;
                                          }
                                          if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowSlashMenu(false);
                                            return;
                                          }
                                        }

                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          if (!isTyping && (inputMessage.trim() !== '' || pendingFiles.length > 0)) {
                                            handleSendMessage();
                                          }
                                        }
                                      }}
                                      onFocus={() => setIsChatInputFocused(true)}
                                      onBlur={() => setIsChatInputFocused(false)}
                                      placeholder={isTyping ? "SARA is thinking..." : "Command SARA..."}
                                      className={`w-full bg-transparent border-none outline-none py-3.5 px-4 text-[13.5px] font-medium resize-none min-h-[48px] max-h-[160px] custom-scrollbar ${
                                        isZenMode ? 'text-white placeholder:text-slate-650' : 'text-[#1D1D1F] placeholder:text-[#86868B]'
                                      }`}
                                      style={{ height: 'auto' }}
                                    />
                                    <div className={`flex items-center justify-between px-3 pb-3 pt-1.5 border-t border-dashed ${
                                      isZenMode ? 'border-white/[0.05]' : 'border-[#E5E5E7]'
                                    }`}>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          ref={chatFileInputRef}
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleFileDrop(file);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => chatFileInputRef.current?.click()}
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer ${
                                            isZenMode 
                                              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white' 
                                              : 'bg-slate-100 border-slate-200 hover:bg-slate-200/75 text-slate-600 hover:text-slate-900'
                                          }`}
                                          title="Upload reference file"
                                          aria-label="Upload reference file"
                                        >
                                          <Plus size={11} strokeWidth={2.5} />
                                        </button>
                                        <ModelSelector
                                          byokMode={byokMode}
                                          byokConfig={byokConfig}
                                          onSelect={handleModelSelectChange}
                                          variant={isZenMode ? 'zen' : 'light'}
                                          compact={true}
                                          dropdownPosition="top"
                                        />
                                      </div>
                                      {isTyping ? (
                                        <button
                                          aria-label="Cancel SARA response"
                                          title="Cancel SARA response"
                                          onClick={() => handleCancelSara()}
                                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md bg-rose-500 hover:bg-rose-600 text-white cursor-pointer animate-pulse"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                          </svg>
                                        </button>
                                      ) : (
                                        <button
                                          aria-label="Send message"
                                          title="Send message"
                                          disabled={inputMessage.trim() === '' && pendingFiles.length === 0}
                                          onClick={() => handleSendMessage()}
                                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                            (inputMessage.trim() === '' && pendingFiles.length === 0)
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
                                      )}
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

                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
             </ConditionalPortal>
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
