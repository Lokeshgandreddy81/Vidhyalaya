import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';
import { chatWithTutorStream, generateThreadTitle } from '../services/geminiService';
import { ChatMessage, ChatSession } from '../types';
import {
  File, UploadCloud, Plus, Send, Copy, Check, Loader, Trash2, Zap, ArrowRight, Bot, Network, Sparkles, BookOpen, PenLine, RotateCw, Mic, MicOff, Terminal, Columns, X, Maximize2, Pin, PinOff, Search, MessageSquare, PlusCircle, Clock, Edit3, Library, Menu, PanelLeftClose, PanelLeftOpen, Image as ImageIcon, FileText, ChevronLeft, ChevronRight, Play, CheckCircle2, AlertTriangle, Type
} from 'lucide-react';
import { ModelSelector } from '../components/ui/ModelSelector';
import { getModelDisplayName, getDefaultModelForProvider, type ProviderId } from '../config/modelRegistry';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { get, set } from 'idb-keyval';
import CodeSandbox from '../components/ui/CodeSandbox';
import MermaidDiagram from '../components/ui/MermaidDiagram';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';
// @ts-ignore
import { pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';

import {
  cleanInnerCode,
  parseMessageWithArtifacts,
  parseStreamBuffer,
  formatReasoningText,
  getStakesPriority,
  sanitizeSaraMessage,
  parseAsciiTree,
  retrieveMemoryContext,
  normalizeChatTreeHistory,
  getActiveThread,
  getSiblings
} from '../utils/chatUtils';

import '../styles/AssistantGlass.css';


pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const STANDALONE_SLASH_COMMANDS = [
  { cmd: '/clear', desc: 'Clear chat conversation history thread', action: 'clear_chat' },
  { cmd: '/sandbox', desc: 'Initialize an interactive coding sandbox', placeholder: '/sandbox ' },
  { cmd: '/eli5', desc: 'Explain conceptually simple (ELI5)', placeholder: '/eli5 ' },
  { cmd: '/debug', desc: 'Request code debugging help', placeholder: '/debug ' },
];

interface StandaloneSaraMessageBubbleProps {
  message: ChatMessage;
  index: number;
  chatHistory: ChatMessage[];
  isZenMode: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  setInputMessage: (val: string) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  getActiveModelName: () => string;
  ChatMarkdownComponents: any;
  onEditMessage: (idx: number, text: string) => void;
  onSelectBranch?: (parentKey: string, childId: string) => void;
  onOpenWorkbench?: (code: string, language: string, title?: string) => void;
  onTogglePin?: (id: string) => void;
}

const VisualSkillTree: React.FC<{ text: string; isZenMode: boolean }> = ({ text, isZenMode }) => {
  const tree = useMemo(() => parseAsciiTree(text), [text]);
  const hasBoxDrawingChars = useMemo(() => /[┌└├│─▼▲┌┐└┘├┤┬┴┼]/.test(text), [text]);

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
  onOpenWorkbench?: (code: string, language: string, title?: string, sourceMsgId?: string) => void;
  executionFeedback?: { stdout: string; stderr: string; success: boolean };
  onExecutionOutput?: (output: { stdout: string; stderr: string; success: boolean; sourceMsgId?: string }) => void;
}

const ChatMessageContentRenderer: React.FC<ChatMessageContentRendererProps> = ({
  text,
  msgId,
  isLatest,
  isZenMode,
  components,
  onAskSara,
  onOpenWorkbench,
  executionFeedback,
  onExecutionOutput
}) => {
  const blocks = useMemo(() => parseMessageWithArtifacts(text), [text]);

  const onAskSaraRef = useRef(onAskSara);
  useEffect(() => {
    onAskSaraRef.current = onAskSara;
  }, [onAskSara]);

  const handleAskSaraStable = useCallback((prompt: string) => {
    onAskSaraRef.current?.(prompt);
  }, []);

  const localComponents = useMemo(() => {
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
              <div className="my-4 rounded-xl border border-white/[0.05] bg-zinc-950 overflow-hidden text-left select-text">
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#090b10] border-b border-white/[0.06] select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                      <Terminal size={11} className="text-indigo-400" />
                      <span>Code Block</span>
                    </div>
                    <span className="text-[10.5px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                      {lang}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenWorkbench?.(codeString, lang, undefined, msgId);
                      window.dispatchEvent(new CustomEvent('cortex:open-workbench', { detail: { code: codeString, language: lang, sourceMsgId: msgId } }));
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                    title="Expand to side-by-side Split Artifact Workbench"
                  >
                    <Play size={10} className="fill-indigo-400" /> Run in Sandbox
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto font-mono text-[11px] leading-relaxed">
                  <code className={className} {...props}>
                    {codeString}
                  </code>
                </pre>
                {executionFeedback && (
                  <div className={`border-t border-white/5 p-3 font-mono text-[11px] max-h-[200px] overflow-y-auto ${executionFeedback.success ? 'bg-indigo-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>
                    <div className="flex items-center gap-1.5 mb-2 text-[9px] uppercase tracking-widest font-bold opacity-70">
                      {executionFeedback.success ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                      <span>Execution Feedback</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{executionFeedback.stderr || executionFeedback.stdout || 'Process finished with no output'}</pre>
                  </div>
                )}
              </div>
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenWorkbench?.(codeString, lang, undefined, msgId);
                    window.dispatchEvent(new CustomEvent('cortex:open-workbench', { detail: { code: codeString, language: lang, sourceMsgId: msgId } }));
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                  title="Expand to side-by-side Split Artifact Workbench"
                >
                  <Columns size={11} className="text-indigo-400" />
                  <span>Expand Workbench</span>
                </button>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={codeString}
                  initialLanguage={lang}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={handleAskSaraStable}
                  onOpenWorkbench={onOpenWorkbench}
                  hideCloseButton={true}
                  sourceMsgId={msgId}
                  onExecutionOutput={onExecutionOutput}
                />
              </div>
              {executionFeedback && (
                <div className={`border-t border-white/5 p-3 font-mono text-[11px] max-h-[200px] overflow-y-auto ${executionFeedback.success ? 'bg-indigo-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>
                  <div className="flex items-center gap-1.5 mb-2 text-[9px] uppercase tracking-widest font-bold opacity-70">
                    {executionFeedback.success ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                    <span>Execution Feedback</span>
                  </div>
                  <pre className="whitespace-pre-wrap">{executionFeedback.stderr || executionFeedback.stdout || 'Process finished with no output'}</pre>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="my-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-950 overflow-hidden text-left select-text">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-[#090b10] border-b border-slate-200 dark:border-white/[0.06] select-none">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-zinc-400">
                {match ? match[1] : 'code'}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const l = match ? match[1] : 'javascript';
                  onOpenWorkbench?.(codeString, l);
                  window.dispatchEvent(new CustomEvent('cortex:open-workbench', { detail: { code: codeString, language: l } }));
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 hover:text-indigo-300 font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                title="Expand to side-by-side Split Artifact Workbench"
              >
                <Columns size={11} className="text-indigo-400" />
                <span>Expand Workbench</span>
              </button>
            </div>
            <pre className="p-4 overflow-x-auto font-mono text-[11px] leading-relaxed">
              <code className={className} {...props}>
                {codeString}
              </code>
            </pre>
          </div>
        );
      }
    };
  }, [components, isLatest, isZenMode, handleAskSaraStable, onOpenWorkbench]);

  return (
    <div className="space-y-4">
      {blocks.map((block: any, idx: number) => {
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const c = cleanInnerCode(block.content);
                    const l = block.language || 'javascript';
                    const t = block.name;
                    onOpenWorkbench?.(c, l, t);
                    window.dispatchEvent(new CustomEvent('cortex:open-workbench', { detail: { code: c, language: l, title: t } }));
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                  title="Expand to side-by-side Split Artifact Workbench"
                >
                  <Columns size={11} className="text-indigo-400" />
                  <span>Expand Workbench</span>
                </button>
              </div>
              <div className="p-1 h-[320px]">
                <CodeSandbox
                  initialCode={cleanInnerCode(block.content)}
                  initialLanguage={block.language}
                  onClose={() => {}}
                  isZenMode={isZenMode}
                  onAskSara={onAskSara}
                  onOpenWorkbench={onOpenWorkbench}
                  hideCloseButton={true}
                />
              </div>
            </div>
          );
        }

        if (block.artifactType === 'mermaid') {
          return (
            <div key={`${msgId}-block-${idx}`} className="my-4 rounded-xl border border-white/5 overflow-hidden bg-[#0d111d] shadow-2xl h-[330px] text-left select-none relative group/mermaid">
              <div className="px-4 py-3 bg-[#0d111d] border-b border-white/5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Network size={12} className="text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-indigo-300">
                    Architect Blueprint
                  </span>
                </div>
                <button
                  onClick={() => {
                    onOpenWorkbench?.(cleanInnerCode(block.content), 'mermaid', 'System Blueprint');
                    window.dispatchEvent(new CustomEvent('cortex:open-workbench', { detail: { code: cleanInnerCode(block.content), language: 'mermaid', title: 'System Blueprint' } }));
                  }}
                  className="opacity-0 group-hover/mermaid:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider cursor-pointer border-none"
                  title="Expand to side-by-side Artifact Workbench"
                >
                  <Maximize2 size={10} /> Open in Canvas
                </button>
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

const StandaloneSaraMessageBubble = ({
  message: m,
  index: idx,
  chatHistory,
  isZenMode,
  onSendMessage,
  onRegenerate,
  setInputMessage,
  chatInputRef,
  getActiveModelName,
  ChatMarkdownComponents,
  onEditMessage,
  onSelectBranch,
  onOpenWorkbench,
  onTogglePin,
}: StandaloneSaraMessageBubbleProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // ── Sibling Branch Variants Calculation ──
  const siblings = useMemo(() => getSiblings(chatHistory, m), [chatHistory, m]);
  const siblingIndex = useMemo(() => siblings.findIndex(s => s.id === m.id), [siblings, m.id]);

  // ── TOC Minimap Heading Extraction ──
  const headings = useMemo(() => {
    if (!m.text || m.role !== 'model') return [];
    const matches = m.text.match(/^##\s+(.+)$/gm);
    if (!matches) return [];
    return matches.map(match => {
      const title = match.replace(/^##\s+/, '').trim();
      const id = 'header-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return { title, id };
    });
  }, [m.text, m.role]);
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

  const [isAhaFlashing, setIsAhaFlashing] = useState(false);
  const prevIsModelThinking = useRef(isModelThinking);

  useEffect(() => {
    if (isModelThinking) {
      setIsAccordionOpen(true);
    } else if (m.reasoning && m.text && isGenerating) {
      // Auto-collapse when reasoning finishes but we still generate text
      setIsAccordionOpen(false);
    }

    // Aha! moment detection (transition from thinking to not thinking while generating)
    if (prevIsModelThinking.current && !isModelThinking && m.reasoning) {
      setIsAhaFlashing(true);
      setTimeout(() => setIsAhaFlashing(false), 1500); // Remove animation class after 1.5s
    }
    prevIsModelThinking.current = isModelThinking;
  }, [isModelThinking, m.text, m.reasoning, isGenerating]);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(m.text || '');
  const [copied, setCopied] = useState(false);

  const handleFixCode = useCallback(
    (codeOrContext: string, issue: string) => {
      const prompt = `The Swarm Auditor/Linter flagged a critical issue: "${issue}". Please optimize, fix, and rewrite the affected code or strategy to resolve this issue completely. Here is the reference code/context:\n\n${codeOrContext}`;
      onSendMessage(prompt);
    },
    [onSendMessage]
  );

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
      className={`flex w-full ${m.role === 'user' ? 'justify-end px-2 py-3' : 'justify-start px-2 py-5'}`}
    >
      {m.role === 'user' ? (
        isEditing ? (
          <div className="w-full flex flex-col gap-2 select-text my-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={`w-full rounded-[20px] px-6 py-4 text-[15.5px] font-normal outline-none resize-none min-h-[56px] custom-scrollbar border transition-all ${
                isZenMode
                  ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
                  : 'bg-[#F5F5F7] border-[#E5E5E7] text-[#1D1D1F] focus:border-[#4e5bff] focus:ring-0'
              }`}
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
            <div className="flex justify-end gap-3 mt-1.5 px-1">
              <button
                onClick={() => {
                  setEditText(m.text || '');
                  setIsEditing(false);
                }}
                className={`px-4 py-2 text-[14px] font-medium rounded-full cursor-pointer transition-all border-none ${
                  isZenMode
                    ? 'text-slate-350 hover:bg-white/5 hover:text-white'
                    : 'text-[#1f1f1f] hover:bg-black/5'
                }`}
              >
                Cancel
              </button>
              <button
                disabled={editText.trim() === m.text || !editText.trim()}
                onClick={() => {
                  if (editText.trim() && editText.trim() !== m.text) {
                    onEditMessage(idx, editText.trim());
                    setIsEditing(false);
                  } else {
                    setIsEditing(false);
                  }
                }}
                className={`px-5 py-2 text-[14px] font-semibold rounded-full cursor-pointer border-none transition-all active:scale-95 shadow-sm ${
                  editText.trim() !== m.text
                    ? (isZenMode ? 'bg-indigo-500 hover:bg-indigo-650 text-white' : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white')
                    : (isZenMode ? 'bg-[#3c4043] text-[#9aa0a6] cursor-not-allowed opacity-50' : 'bg-[#e2ecfc] text-[#a8c7fa] cursor-not-allowed')
                }`}
              >
                Update
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1 max-w-[70%] group/userbubble">
            {m.isPinned && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-mono font-bold uppercase tracking-wider mb-1.5 shadow-sm">
                <Pin size={10} className="fill-amber-400 text-amber-400" />
                <span>Pinned Anchor</span>
              </div>
            )}
            <motion.div
              drag={siblings.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(e, info) => {
                if (siblings.length <= 1) return;
                const swipeThreshold = 60;
                if (info.offset.x > swipeThreshold && siblingIndex > 0) {
                  // Swipe right -> previous branch
                  onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex - 1].id);
                } else if (info.offset.x < -swipeThreshold && siblingIndex < siblings.length - 1) {
                  // Swipe left -> next branch
                  onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex + 1].id);
                }
              }}
              className={`gemini-user-msg-capsule ${
              isZenMode 
                ? 'bg-zinc-800 text-slate-100 border border-zinc-700' 
                : 'bg-indigo-50/50 text-[#1D1D1F] border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)] cursor-grab active:cursor-grabbing'
            } relative px-5 py-3.5 rounded-[24px] max-w-full`}
            >
              <div className={`prose max-w-none prose-p:leading-[1.6] font-sans font-medium ${isZenMode ? 'text-[13px]' : 'text-[14px]'}`}>
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {m.images.map((img: any, index: number) => (
                      <img 
                        key={index}
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={`Uploaded ${index}`}
                        className="max-w-[200px] max-h-[200px] rounded-xl border border-black/10 dark:border-white/20 object-contain shadow-sm"
                      />
                    ))}
                  </div>
                )}
                {m.documents && m.documents.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3 select-none">
                    {m.documents.map((doc: any, dIdx: number) => (
                      <div 
                        key={dIdx} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border max-w-[280px] ${
                          isZenMode 
                            ? 'border-white/10 bg-white/5 text-white' 
                            : 'border-slate-200/80 bg-white/90 text-[#1f1f1f] shadow-sm'
                        }`}
                      >
                        <File size={13} className={isZenMode ? 'text-indigo-300' : 'text-indigo-600'} />
                        <span className="text-[12px] font-bold truncate max-w-[180px]">
                          {doc.name}
                        </span>
                        <span className={`text-[8.5px] uppercase tracking-wider ${
                          isZenMode ? 'text-zinc-400' : 'text-slate-450'
                        }`}>
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
                  onOpenWorkbench={onOpenWorkbench}
                  executionFeedback={undefined}
                />
              </div>
            </motion.div>
            
            <div className="flex items-center gap-3 px-2 mt-1 select-none text-slate-400 dark:text-slate-500 h-4">
              {siblings.length > 1 && (
                <div className="flex items-center gap-2 font-mono text-[10.5px] font-extrabold select-none px-2.5 py-1 rounded-full border border-indigo-500/20 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 shadow-sm transition-all">
                  <button
                    disabled={siblingIndex <= 0}
                    onClick={() => onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex - 1].id)}
                    className="hover:text-indigo-600 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent p-0 flex items-center justify-center outline-none text-sm px-0.5"
                    title="Previous question variant (Swipe Right)"
                  >
                    <ChevronLeft size={12} strokeWidth={3} />
                  </button>
                  <span className="tracking-widest">{siblingIndex + 1} / {siblings.length}</span>
                  <button
                    disabled={siblingIndex >= siblings.length - 1}
                    onClick={() => onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex + 1].id)}
                    className="hover:text-indigo-600 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent p-0 flex items-center justify-center outline-none text-sm px-0.5"
                    title="Next question variant (Swipe Left)"
                  >
                    <ChevronRight size={12} strokeWidth={3} />
                  </button>
                </div>
              )}
              {m.editCount !== undefined && m.editCount > 0 && (
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 select-none">
                  v{m.editCount + 1}
                </span>
              )}
              <div className="flex items-center gap-2 opacity-0 group-hover/userbubble:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onTogglePin?.(m.id)}
                  className={`cursor-pointer transition-all p-0.5 bg-transparent border-none ${
                    m.isPinned ? 'text-amber-400 hover:text-amber-300' : 'hover:text-amber-400 text-slate-400 dark:text-slate-500'
                  }`}
                  title={m.isPinned ? "Unpin memory anchor" : "Pin to permanent system context anchors"}
                  aria-label={m.isPinned ? "Unpin memory anchor" : "Pin memory anchor"}
                >
                  <Pin size={11} strokeWidth={2.5} className={m.isPinned ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <button
                  onClick={handleCopy}
                  className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-0.5 bg-transparent border-none"
                  title="Copy question"
                  aria-label="Copy question"
                >
                  {copied ? <Check size={11} className="text-emerald-555" strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2.5} />}
                </button>
                <button
                  onClick={() => {
                    setEditText(m.text || '');
                    setIsEditing(true);
                  }}
                  className="hover:text-slate-660 dark:hover:text-slate-200 cursor-pointer transition-colors p-0.5 bg-transparent border-none"
                  title="Edit question"
                  aria-label="Edit question"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="gemini-sara-msg-layout max-w-3xl mx-auto w-full group relative">
          {headings.length >= 2 && (
            <div className="absolute left-[calc(100%+24px)] top-0 hidden lg:flex flex-col gap-2.5 w-44 bg-white/40 dark:bg-black/15 backdrop-blur-md border border-slate-200/20 dark:border-white/5 p-3.5 rounded-2xl shadow-lg select-none text-[11px] font-sans">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-555 mb-1 font-mono">
                Response Minimap
              </div>
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {headings.map((h, hIdx) => (
                  <button
                    key={hIdx}
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="text-left text-slate-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-white/5 px-2 py-1.5 rounded-lg transition-all truncate text-[10.5px] font-bold border-none bg-transparent cursor-pointer outline-none"
                    title={h.title}
                  >
                    • {h.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="gemini-message-body-text pr-2">
            

            
            {(isWaitingForFirstToken || m.reasoning) && (
              <details 
                open={isAccordionOpen}
                onToggle={(e) => setIsAccordionOpen((e.target as HTMLDetailsElement).open)}
                className={`mb-4 group/reasoning outline-none animate-fadeIn rounded-xl border border-transparent transition-all duration-700 ${isAhaFlashing ? 'aha-glow bg-emerald-500/5' : ''}`}
              >
                <summary className={`cursor-pointer inline-flex items-center gap-2 text-[12px] font-medium transition-all select-none list-none outline-none ${
                  isZenMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-550 hover:text-slate-700'
                }`}>
                  {(isModelThinking || isWaitingForFirstToken) ? (
                    <Loader size={16} className="text-indigo-500 animate-spin" />
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 group-open/reasoning:animate-pulse">
                      <path d="M12 3v1M12 20v1M4 12H3M21 12h-1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                    </svg>
                  )}
                  <span className="font-semibold tracking-wide font-mono text-[11px] opacity-75">
                    {(isModelThinking || isWaitingForFirstToken) 
                      ? `Thinking... ${elapsedTime}s` 
                      : `Thought process (${m.thinkingDuration || elapsedTime || 1}s)`
                    }
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-50 group-open/reasoning:rotate-180 transition-transform">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                
                <div className="mt-2 pl-4 py-1 ml-[5px] border-l border-slate-200 dark:border-white/10">
                  <div className={`max-h-[350px] overflow-y-auto custom-scrollbar text-[12.5px] leading-relaxed tracking-wide ${
                    isZenMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {m.reasoning ? (
                      formatReasoningText(m.reasoning || '', isZenMode, (tag, content) => {
                        setInputMessage(`Regarding SARA's thought step [${tag}], you said: "${content.substring(0, 60)}...". Why did you choose this strategy? `);
                        setTimeout(() => chatInputRef.current?.focus(), 50);
                      }, handleFixCode, isModelThinking)
                    ) : (
                      <div className="flex items-center gap-2 text-indigo-500/70 dark:text-indigo-400/75 animate-pulse text-[11.5px] font-mono select-none">
                        <Loader size={11} className="animate-spin text-indigo-500" />
                        <span>Organizing cognitive strategy...</span>
                      </div>
                    )}
                    <div ref={reasoningEndRef} />
                  </div>
                </div>
              </details>
            )}

            {m.mode && m.mode !== 'Companion' && m.mode !== 'Assistant' && (
              <div className="flex items-center flex-wrap gap-2 mb-2 select-none">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border shrink-0 ${
                  isZenMode
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-105/55'
                }`}>
                  {m.mode}
                </span>
                {m.intent && m.intent !== 'Unknown' && (
                  <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    • {m.intent}
                  </span>
                )}

                {getStakesPriority(m.text || '') && (
                  <div className={`w-full border rounded-xl px-4 py-2.5 text-[12.5px] leading-relaxed break-words shadow-[0_1px_2px_rgba(0,0,0,0.02)] mt-2 ${
                    isZenMode
                      ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400'
                      : 'bg-white border-slate-200/60 text-slate-600'
                  }`}>
                    <strong className={isZenMode ? 'text-indigo-400 font-bold' : 'text-slate-800 font-bold'}>Focus:</strong> {getStakesPriority(m.text || '')}
                  </div>
                )}
              </div>
            )}

            {m.text && (
              <div className={`prose max-w-none text-justify hyphens-auto ${isZenMode ? 'text-[13px] prose-code:text-[12px] prose-pre:text-[12px]' : 'text-[14px] prose-code:text-[13px] prose-pre:text-[13px]'} leading-relaxed font-sans prose-p:leading-relaxed prose-headings:font-bold prose-h1:text-[20px] prose-h2:text-[18px] prose-h3:text-[16px] prose-h4:text-[15px] prose-li:leading-relaxed ${isZenMode ? 'prose-invert text-slate-200' : 'text-[#0d0d0d]'}`}>
                <ChatMessageContentRenderer
                  text={(() => {
                    let t = m.text || '';
                    if (m.role === 'model' && m.isGenerating) {
                      const backticks = (t.match(/```/g) || []).length;
                      if (backticks % 2 !== 0) {
                        t += '\n```';
                      }
                    }
                    return t;
                  })()}
                  msgId={m.id}
                  isLatest={idx === chatHistory.length - 1 && m.role === 'model' && m.isGenerating}
                  isZenMode={isZenMode}
                  components={ChatMarkdownComponents}
                  onAskSara={onSendMessage}
                  onOpenWorkbench={onOpenWorkbench}
                />
                
                {m.role === 'model' && m.isGenerating && (
                  <div className={`mt-5 mb-1 transition-all duration-500 opacity-40 animate-pulse`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`w-[16px] h-[16px] ${isZenMode ? 'text-indigo-400' : 'text-indigo-500'} animate-spin-slow`}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
                      <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
                      <circle cx="12" cy="12" r="2.2" className={`stroke-none ${isZenMode ? 'fill-indigo-400' : 'fill-indigo-500'}`} />
                    </svg>
                  </div>
                )}
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
                              ? (isZenMode ? 'text-zinc-500 line-through' : 'text-slate-450 line-through') 
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



            {/* Persona choices */}
            {m.sara_metadata?.ui_suggestion === 'render_persona_pills' && idx === chatHistory.length - 1 && (
              <div className="mt-4 flex flex-wrap gap-2.5 items-center select-none animate-fadeIn">
                <button
                  onClick={() => {
                    setInputMessage("Hacker mode active: SARA, go straight to the code. Direct diff fixes, minimal fluff.");
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                    isZenMode
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 shadow-sm'
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
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 shadow-sm'
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
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 shadow-sm'
                  }`}
                >
                  The Psychologist
                </button>
              </div>
            )}

            {/* Friction Choice Challenge */}
            {m.sara_metadata?.ui_suggestion === 'render_friction_poll' && idx === chatHistory.length - 1 && (
              <div className="mt-4 p-3.5 rounded-xl border flex flex-col gap-2.5 animate-fadeIn max-w-sm select-none bg-indigo-500/[0.02] border-indigo-500/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  Stop & Think Challenge:
                </span>
                {m.sara_metadata.micro_challenge && (
                  <p className={`text-[12px] font-medium leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {m.sara_metadata.micro_challenge}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setInputMessage("I choose the Socratic Nudge (teach me to fish). Pose a Socratic question.");
                      setTimeout(() => chatInputRef.current?.focus(), 50);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-indigo-500 hover:bg-indigo-650 text-white shadow shadow-indigo-500/10 border-none"
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
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 shadow-sm'
                    }`}
                  >
                    Show me the fix
                  </button>
                </div>
              </div>
            )}

            {/* Interactive blocks */}
            {m.interactive_block && (
              <div className="mt-3 select-none">
                {m.interactive_block.type === 'quick_choices' && Array.isArray(m.interactive_block.data) && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {m.interactive_block.data.map((choice: string, cIdx: number) => (
                      <button
                        key={cIdx}
                        onClick={() => onSendMessage(choice)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isZenMode
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
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
                      {Array.isArray(m.interactive_block.data.options) && m.interactive_block.data.options.map((opt: string, oIdx: number) => (
                        <button
                          key={oIdx}
                          onClick={() => onSendMessage(`Answer: ${opt}`)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-[11px] font-semibold transition-all hover:translate-x-1 duration-150 cursor-pointer ${
                            isZenMode
                              ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                              : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-50 hover:border-indigo-400'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={`mt-4 pt-3 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 select-none ${
              isZenMode ? 'border-white/5' : 'border-slate-100/90'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTogglePin?.(m.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                    m.isPinned
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : (isZenMode
                          ? 'bg-[#1e202a] border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650 hover:text-amber-600')
                  }`}
                  title={m.isPinned ? "Unpin memory anchor" : "Pin to permanent system context anchors"}
                  aria-label={m.isPinned ? "Unpin memory anchor" : "Pin memory anchor"}
                >
                  <Pin size={11.5} strokeWidth={2.5} className={m.isPinned ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <button
                  onClick={handleCopy}
                  className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                    isZenMode
                      ? 'bg-[#1e202a] border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650 hover:text-slate-900'
                  }`}
                  title="Copy response"
                  aria-label="Copy response"
                >
                  {copied ? <Check size={11.5} className="text-emerald-500" strokeWidth={2.5} /> : <Copy size={11.5} strokeWidth={2.5} />}
                </button>
                <button
                  onClick={onRegenerate}
                  className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                    isZenMode
                      ? 'bg-[#1e202a] border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650 hover:text-slate-900'
                  }`}
                  title="Regenerate response variant"
                  aria-label="Regenerate response variant"
                >
                  <RotateCw size={11.5} strokeWidth={2.5} />
                </button>
                {siblings.length > 1 && (
                  <div className="flex items-center gap-1 font-mono text-[10px] font-extrabold select-none px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-white/10 bg-slate-100/60 dark:bg-white/5 text-slate-500 dark:text-zinc-400">
                    <button
                      disabled={siblingIndex <= 0}
                      onClick={() => onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex - 1].id)}
                      className="hover:text-indigo-500 disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent p-0 flex items-center justify-center outline-none text-xs px-0.5"
                      title="Previous response variant"
                    >
                      ‹
                    </button>
                    <span>{siblingIndex + 1} / {siblings.length}</span>
                    <button
                      disabled={siblingIndex >= siblings.length - 1}
                      onClick={() => onSelectBranch?.(m.parentId ?? 'root', siblings[siblingIndex + 1].id)}
                      className="hover:text-indigo-500 disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent p-0 flex items-center justify-center outline-none text-xs px-0.5"
                      title="Next response variant"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const CortexChat: React.FC = () => {
  const { isZenMode } = useFocus();
  const {
    paths, byokMode, byokConfig, updateByokConfig, updateByokMode, userProfile,
    activeMission, activeScenario
  } = useAppStore();

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedChildMap, setSelectedChildMap] = useState<Record<string, string>>({});
  const [workbenchArtifact, setWorkbenchArtifact] = useState<{ code: string; language: string; title?: string; sourceMsgId?: string } | null>(null);
  const [executionFeedbackMap, setExecutionFeedbackMap] = useState<Record<string, { stdout: string; stderr: string; success: boolean }>>({});

  const handleExecutionOutput = useCallback((output: { stdout: string; stderr: string; success: boolean; sourceMsgId?: string }) => {
    if (output.sourceMsgId) {
      setExecutionFeedbackMap(prev => ({
        ...prev,
        [output.sourceMsgId as string]: output
      }));
    }
  }, []);

  // Floating Action Toolbar State
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // ── Multi-Thread Session Management & Full-Text Local RAG Search State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionSearchQuery, setSessionSearchQuery] = useState<string>('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  // Initial Load of Multi-Sessions from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        const storedSessions = await get<ChatSession[]>('cortex-chat-sessions');
        const storedActiveId = await get<string>('cortex-active-session-id');
        const legacyHistory = await get<ChatMessage[]>('cortex-chat-history');

        let initialSessions: ChatSession[] = storedSessions || [];
        
        // Migration: If no sessions stored but legacy flat chatHistory exists, convert to primary session
        if (initialSessions.length === 0) {
          const defaultSession: ChatSession = {
            id: uuidv4(),
            title: legacyHistory && legacyHistory.length > 0 ? (legacyHistory[0].text.substring(0, 30) || 'Previous Session') : 'Default Discussion',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: legacyHistory || [],
            selectedChildMap: {},
          };
          initialSessions = [defaultSession];
          await set('cortex-chat-sessions', initialSessions);
        }

        setSessions(initialSessions);

        const currentActive = initialSessions.find(s => s.id === storedActiveId) || initialSessions[0];
        setActiveSessionId(currentActive.id);
        setChatHistory(currentActive.messages || []);
        setSelectedChildMap(currentActive.selectedChildMap || {});
        await set('cortex-active-session-id', currentActive.id);
      } catch (err) {
        console.error('Failed loading chat sessions:', err);
      }
    })();
  }, []);

  // Text Selection Listener
  useEffect(() => {
    const handleSelection = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setSelectionRect(null);
          setSelectedText('');
          return;
        }
        const text = selection.toString().trim();
        if (!text) {
          setSelectionRect(null);
          setSelectedText('');
          return;
        }
        
        let node = selection.anchorNode;
        let isMessage = false;
        while (node && (node.nodeType === Node.ELEMENT_NODE || node.parentNode)) {
          const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode) as Element;
          if (el && el.classList && el.classList.contains('prose')) {
            isMessage = true;
            break;
          }
          node = node.parentNode;
        }
        
        if (!isMessage) {
          setSelectionRect(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionRect(rect);
        setSelectedText(text);
      }, 50);
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Sync ChatHistory and Auto-Titling to Active Session
  useEffect(() => {
    if (!activeSessionId) return;

    setSessions(prevSessions => {
      const existingIdx = prevSessions.findIndex(s => s.id === activeSessionId);
      if (existingIdx === -1) return prevSessions;

      const currentSession = prevSessions[existingIdx];
      const updatedSession: ChatSession = {
        ...currentSession,
        messages: chatHistory,
        selectedChildMap: selectedChildMap,
        updatedAt: Date.now(),
      };

      const nextSessions = [...prevSessions];
      nextSessions[existingIdx] = updatedSession;
      set('cortex-chat-sessions', nextSessions);
      set('cortex-chat-history', chatHistory);
      return nextSessions;
    });

    // AI Auto-Titling Trigger when initial conversation turn completes
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (
      currentSession &&
      (currentSession.title === 'Default Discussion' || currentSession.title === 'New Discussion' || !currentSession.title) &&
      chatHistory.length >= 2
    ) {
      const userTurn = chatHistory.find(m => m.role === 'user')?.text || '';
      const aiTurn = chatHistory.find(m => m.role === 'model')?.text || '';
      if (userTurn && aiTurn) {
        generateThreadTitle(userTurn, aiTurn).then(generatedTitle => {
          setSessions(prev => {
            const next = prev.map(s => s.id === activeSessionId ? { ...s, title: generatedTitle } : s);
            set('cortex-chat-sessions', next);
            return next;
          });
        });
      }
    }
  }, [chatHistory, selectedChildMap, activeSessionId]);

  // Session Actions
  const handleCreateNewSession = useCallback(async () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Discussion',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      selectedChildMap: {},
    };

    const nextSessions = [newSession, ...sessions];
    setSessions(nextSessions);
    setActiveSessionId(newSession.id);
    setChatHistory([]);
    setSelectedChildMap({});
    await set('cortex-chat-sessions', nextSessions);
    await set('cortex-active-session-id', newSession.id);
    toast.success("Initialized new discussion session");
  }, [sessions]);

  const handleSwitchSession = useCallback(async (sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;

    setActiveSessionId(target.id);
    setChatHistory(target.messages || []);
    setSelectedChildMap(target.selectedChildMap || {});
    await set('cortex-active-session-id', target.id);
    toast.success(`Switched session to "${target.title}"`);
  }, [sessions]);

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== sessionId);
    if (remaining.length === 0) {
      handleCreateNewSession();
      return;
    }

    setSessions(remaining);
    await set('cortex-chat-sessions', remaining);

    if (activeSessionId === sessionId) {
      const nextActive = remaining[0];
      setActiveSessionId(nextActive.id);
      setChatHistory(nextActive.messages || []);
      setSelectedChildMap(nextActive.selectedChildMap || {});
      await set('cortex-active-session-id', nextActive.id);
    }
    toast.info("Session removed");
  }, [sessions, activeSessionId, handleCreateNewSession]);

  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => {
      const next = prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s);
      set('cortex-chat-sessions', next);
      return next;
    });
    setEditingTitleId(null);
    toast.success("Thread renamed");
  }, []);

  // Sync sessions state with layout sidebar via custom DOM events
  useEffect(() => {
    const event = new CustomEvent('cortex-sessions-updated', {
      detail: { sessions, activeSessionId }
    });
    window.dispatchEvent(event);
  }, [sessions, activeSessionId]);

  useEffect(() => {
    const onSelect = (e: Event) => {
      const sessionId = (e as CustomEvent).detail;
      void handleSwitchSession(sessionId);
    };
    const onCreate = () => {
      void handleCreateNewSession();
    };
    const onDelete = (e: Event) => {
      const sessionId = (e as CustomEvent).detail;
      const dummyEvent = { stopPropagation: () => {} } as React.MouseEvent;
      void handleDeleteSession(sessionId, dummyEvent);
    };
    const onRename = (e: Event) => {
      const { sessionId, title } = (e as CustomEvent).detail;
      handleRenameSession(sessionId, title);
    };

    window.addEventListener('select-cortex-session', onSelect);
    window.addEventListener('new-cortex-session', onCreate);
    window.addEventListener('delete-cortex-session', onDelete);
    window.addEventListener('rename-cortex-session', onRename);

    return () => {
      window.removeEventListener('select-cortex-session', onSelect);
      window.removeEventListener('new-cortex-session', onCreate);
      window.removeEventListener('delete-cortex-session', onDelete);
      window.removeEventListener('rename-cortex-session', onRename);
    };
  }, [handleSwitchSession, handleCreateNewSession, handleDeleteSession, handleRenameSession]);

  // Full-Text Local RAG Search Filter
  const filteredSessions = useMemo(() => {
    if (!sessionSearchQuery.trim()) return sessions;
    const q = sessionSearchQuery.toLowerCase().trim();
    return sessions.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(q);
      const textMatch = s.messages.some(m => m.text.toLowerCase().includes(q) || (m.reasoning && m.reasoning.toLowerCase().includes(q)));
      return titleMatch || textMatch;
    });
  }, [sessions, sessionSearchQuery]);

  const pinnedAnchors = useMemo(() => chatHistory.filter(m => m.isPinned), [chatHistory]);
  const [showPinnedTray, setShowPinnedTray] = useState(false);

  const handleTogglePin = useCallback((messageId: string) => {
    setChatHistory(prev => {
      const next = prev.map(m => {
        if (m.id === messageId) {
          const nextPinned = !m.isPinned;
          toast.success(
            nextPinned 
              ? "Pinned to permanent system context anchors ([USER PINNED SYSTEM CONTEXT])" 
              : "Unpinned from memory anchors"
          );
          return { ...m, isPinned: nextPinned, pinnedAt: nextPinned ? Date.now() : undefined };
        }
        return m;
      });
      set('cortex-chat-history', next);
      return next;
    });
  }, []);

  const handleOpenWorkbench = useCallback((code: string, language: string, title?: string) => {
    setWorkbenchArtifact({ code, language, title });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && workbenchArtifact) {
        setWorkbenchArtifact(null);
      }
    };
    const handleCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.code) {
        setWorkbenchArtifact({
          code: detail.code,
          language: detail.language || 'javascript',
          title: detail.title
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('cortex:open-workbench', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('cortex:open-workbench', handleCustomOpen);
    };
  }, [workbenchArtifact]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<any>(null);



  const toggleSpeechToText = () => {
    if (isRecording) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscriptBuffer = inputMessage;
    if (finalTranscriptBuffer && !finalTranscriptBuffer.endsWith(' ')) {
      finalTranscriptBuffer += ' ';
    }

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success('Listening...', { id: 'stt-toast' });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscriptChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptChunk += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscriptChunk) {
        finalTranscriptBuffer += finalTranscriptChunk + ' ';
      }
      setInputMessage(finalTranscriptBuffer + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'aborted') {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  };

  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  const activeThread = useMemo(
    () => getActiveThread(chatHistory, selectedChildMap),
    [chatHistory, selectedChildMap]
  );

  const handleSelectBranch = useCallback((parentKey: string, childId: string) => {
    setSelectedChildMap(prev => ({
      ...prev,
      [parentKey]: childId
    }));
  }, []);

  // Load chat history & branch selections from IndexedDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await get<ChatMessage[]>('cortex-chat-history');
        if (stored && Array.isArray(stored)) {
          setChatHistory(normalizeChatTreeHistory(stored));
        }
        const storedBranches = await get<Record<string, string>>('cortex-chat-selected-branches');
        if (storedBranches && typeof storedBranches === 'object') {
          setSelectedChildMap(storedBranches);
        }
      } catch (err) {
        console.error("Failed to load standalone chat history:", err);
      }
    };
    void loadHistory();
  }, []);

  // Save history & branch selections to IndexedDB
  useEffect(() => {
    if (chatHistory.length > 0) {
      set('cortex-chat-history', chatHistory).catch(console.error);
    }
    if (Object.keys(selectedChildMap).length > 0) {
      set('cortex-chat-selected-branches', selectedChildMap).catch(console.error);
    }
  }, [chatHistory, selectedChildMap]);

  const clearChatHistory = useCallback(async () => {
    setChatHistory([]);
    setSelectedChildMap({});
    try {
      await set('cortex-chat-history', []);
      await set('cortex-chat-selected-branches', {});
      toast.success("Chat thread cleared");
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeThread, isTyping]);

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

  const handleCancelSara = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    setIsTyping(false);
    setChatHistory(prev => prev.map((m: any, idx: number) => idx === prev.length - 1 && m.role === 'model' && m.isGenerating ? {
      ...m,
      isGenerating: false,
      text: m.text || '*Synthesis cancelled*'
    } : m));
    toast.info("SARA synthesis paused");
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

  const handleFileDrop = async (file: File) => {
    if (!file) return;

    const loadingToast = toast.loading(`Preparing ${file.name}...`);

    try {
      const isValidImage = file.type.startsWith('image/');
      const isValidPdf = file.type === 'application/pdf';
      const isValidTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
      const isCodeFile = /\.(js|ts|tsx|py|html|css|json|md|go|rs|cpp|h)$/i.test(file.name) && !isValidPdf;

      // Stage code and text reference files
      if (isCodeFile || isValidTxt) {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
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
        toast.success(`Attached code reference: ${file.name}`, { id: loadingToast });
        return;
      }

      // Stage images
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
            toast.success("Image attached! Ready to send.", { id: loadingToast });
          }
        } catch (err) {
          toast.error("Image could not be processed.", { id: loadingToast });
        }
        return;
      }

      // Stage PDFs
      if (isValidPdf) {
        const textContent = await extractTextFromPDF(file);
        const base64Data = await readFileAsBase64(file);
        
        if (textContent.trim().length < 150) {
          toast.loading("Scanned PDF detected. Rendering pages visually...", { id: loadingToast });
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
              toast.success(`Attached scanned PDF visually (first 5 pages)`, { id: loadingToast });
            } else {
              toast.error("No content could be extracted.", { id: loadingToast });
            }
          } catch (renderErr) {
            toast.error("Failed to parse visual PDF.", { id: loadingToast });
          }
        } else {
          setPendingFiles(prev => [...prev, {
            id: uuidv4(),
            name: file.name,
            data: base64Data,
            mimeType: file.type,
            fileType: 'pdf',
            extractedText: textContent
          }]);
          toast.success("PDF attached! Ready to send.", { id: loadingToast });
        }
        return;
      }

      toast.error(`Unsupported file type: ${file.type}`, { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error(`Error attaching file: ${err.message || 'Unknown error'}`, { id: loadingToast });
    }
  };

  const handleSendMessage = async (
    text?: string, 
    displayText?: string, 
    skipUserAppend = false, 
    overrideHistory?: ChatMessage[],
    targetModelId?: string,
    targetUserParentId?: string | null
  ) => {
    // Stage attachments
    const imagesToSend = pendingFiles
      .filter((f: any) => f.fileType === 'image')
      .map((f: any) => ({ data: f.data, mimeType: f.mimeType }));
    
    const scannedPdfImages = pendingFiles
      .filter((f: any) => f.fileType === 'pdf' && f.visualPages)
      .flatMap((f: any) => f.visualPages || []);

    const finalImages = [...imagesToSend, ...scannedPdfImages];

    const docsToSend = pendingFiles.filter((f: any) => f.fileType === 'pdf' && !f.visualPages);
    const textDocs = pendingFiles.filter((f: any) => f.fileType === 'text');
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

    // Standalone Slash Commands Check
    if (msg.startsWith('/') && !text) {
      const parts = msg.trim().split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (command === '/clear') {
        setInputMessage('');
        void clearChatHistory();
        return;
      }

      if (command === '/sandbox') {
        if (!args.trim()) {
          toast.error("Please specify a sandbox language, e.g. /sandbox html or /sandbox javascript");
          return;
        }
        setInputMessage('');
        void handleSendMessage(`Initialize an interactive coding sandbox for: ${args}`, `Initialize sandbox: ${args}`);
        return;
      }

      if (command === '/eli5') {
        if (!args.trim()) {
          toast.error("Please specify a topic, e.g. /eli5 microservices");
          return;
        }
        setInputMessage('');
        void handleSendMessage(`Explain conceptually in simple terms (ELI5): ${args}`, `Explain simple: ${args}`);
        return;
      }

      if (command === '/debug') {
        if (!args.trim()) {
          toast.error("Please provide details of code or reference, e.g. /debug");
          return;
        }
        setInputMessage('');
        void handleSendMessage(`Debug help request: ${args}`, `Debug: ${args}`);
        return;
      }

      toast.error(`Unknown command: ${command}`);
      return;
    }

    const sanitized = sanitizeSaraMessage(msg);
    if (!sanitized) {
      toast.error('Formatting error. Please type plain text.');
      return;
    }



    let extraDocCtx = '';
    if (finalDocuments.length > 0) {
      for (const doc of finalDocuments) {
        extraDocCtx += `\n\n--- Document Attached: ${doc.name} ---\n${doc.extractedText || ''}`;
      }
    }

    let userMsgId = '';
    if (!skipUserAppend) {
      const sanitizedDisplay = displayText ? sanitizeSaraMessage(displayText) : sanitized;
      const currentTip = activeThread[activeThread.length - 1];
      const parentId = currentTip ? currentTip.id : null;
      userMsgId = uuidv4();

      const userMsg: ChatMessage = { 
        id: userMsgId, 
        role: 'user', 
        text: sanitizedDisplay || sanitized, 
        parentId,
        timestamp: Date.now(),
        images: finalImages,
        documents: finalDocuments.map((d: any) => ({ name: d.name, type: d.mimeType }))
      };

      setSelectedChildMap(prev => ({
        ...prev,
        [parentId ?? 'root']: userMsg.id
      }));

      setChatHistory(prev => [...normalizeChatTreeHistory(prev), userMsg]);
    } else if (targetUserParentId !== undefined) {
      userMsgId = targetUserParentId || '';
    }
    
    setInputMessage('');
    setPendingFiles([]);
    setIsTyping(true);

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    chatAbortControllerRef.current = new AbortController();

    const modelMsgId = targetModelId || uuidv4();
    const parentForModel = userMsgId || (activeThread[activeThread.length - 1]?.id ?? null);

    const initialModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      reasoning: '',
      parentId: parentForModel,
      timestamp: Date.now(),
      isGenerating: true,
    };

    if (parentForModel) {
      setSelectedChildMap(prev => ({
        ...prev,
        [parentForModel]: modelMsgId
      }));
    }

    setChatHistory(prev => {
      const normalized = normalizeChatTreeHistory(prev);
      const existing = normalized.find(m => m.id === modelMsgId);
      if (existing) return normalized;
      return [...normalized, initialModelMsg];
    });

    const contextHistory = overrideHistory || activeThread;

    const chatStartTime = Date.now();
    let ttft: number | undefined;
    let accumulatedText = '';
    
    const onChunk = (chunk: string) => {
      if (!ttft) {
        ttft = Date.now() - chatStartTime;
      }
      accumulatedText += chunk;
      const parsed = parseStreamBuffer(accumulatedText);
      setChatHistory(prev => prev.map((m: any) => m.id === modelMsgId ? {
        ...m,
        text: parsed.text,
        reasoning: parsed.reasoning,
        isThinking: parsed.isThinking,
        activeAgents: parsed.activeAgents || m.activeAgents,
        completedAgents: parsed.completedAgents || m.completedAgents,
        payloadData: parsed.payloadData || m.payloadData,
      } : m));
    };

    const chatContextPayload = {
      uploadedImagesContext: finalImages,
      uploadedDocumentContext: extraDocCtx,
      activePathId: null,
      studentSkillProfile: 'Intermediate',
      mode: 'general',
    };

    try {
      const memoryRAGContext = retrieveMemoryContext(sanitized, contextHistory);
      const finalContext = memoryRAGContext || '';

      const result = await chatWithTutorStream(
        contextHistory,
        sanitized,
        finalContext,
        "",
        chatContextPayload,
        onChunk,
        chatAbortControllerRef.current?.signal
      );
      const thinkingDuration = Math.max(1, Math.round((Date.now() - chatStartTime) / 1000));
      
      setChatHistory(prev => prev.map((m: any) => m.id === modelMsgId ? {
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

      setIsTyping(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      const errorMsg = err?.message || '';
      let saraErrorText = `> ⚠️ **Error communicating with SARA** — ${errorMsg || 'Failed to compile request stream'}`;

      if (errorMsg.includes('image input')) {
        saraErrorText = `> ⚠️ **Unsupported content type** — image processing failed.`;
      }

      setChatHistory(prev => prev.map((m: any) => m.id === modelMsgId ? {
        ...m,
        text: saraErrorText,
        isGenerating: false,
      } : m));
      setIsTyping(false);
    }
  };

  const handleRegenerate = async () => {
    const lastModelMsg = [...activeThread].reverse().find((m: ChatMessage) => m.role === 'model');
    if (!lastModelMsg) return;

    const parentUserMsgId = lastModelMsg.parentId;
    if (!parentUserMsgId) return;

    const parentUserMsg = chatHistory.find(m => m.id === parentUserMsgId);
    if (!parentUserMsg) return;

    const newModelMsgId = uuidv4();
    setSelectedChildMap(prev => ({
      ...prev,
      [parentUserMsg.id]: newModelMsgId
    }));

    const parentUserIdx = activeThread.findIndex(m => m.id === parentUserMsg.id);
    const newContextHistory = parentUserIdx !== -1 ? activeThread.slice(0, parentUserIdx + 1) : activeThread;

    await handleSendMessage(parentUserMsg.text, undefined, true, newContextHistory, newModelMsgId, parentUserMsg.id);
  };

  const handleEditMessage = async (idx: number, newText: string) => {
    const targetMsg = activeThread[idx];
    if (!targetMsg || targetMsg.role !== 'user') return;

    const parentKey = targetMsg.parentId ?? null;

    const newUserMsgId = uuidv4();
    const newUserMsg: ChatMessage = {
      id: newUserMsgId,
      role: 'user',
      text: newText,
      parentId: parentKey,
      timestamp: Date.now(),
      editCount: (targetMsg.editCount || 0) + 1
    };

    const newModelMsgId = uuidv4();

    setSelectedChildMap(prev => ({
      ...prev,
      [parentKey ?? 'root']: newUserMsgId,
      [newUserMsgId]: newModelMsgId
    }));

    setChatHistory(prev => [...normalizeChatTreeHistory(prev), newUserMsg]);

    const contextHistory = activeThread.slice(0, idx);
    await handleSendMessage(newText, undefined, true, [...contextHistory, newUserMsg], newModelMsgId, newUserMsgId);
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
      h2: ({ children }: any) => {
        const textVal = String(children);
        const id = 'header-' + textVal.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return (
          <h2 id={id} className={`text-[13px] font-black mt-3 mb-2 tracking-tight uppercase tracking-wide scroll-mt-24 select-text ${isZenMode ? 'text-indigo-300' : 'text-indigo-650'}`}>
            {children}
          </h2>
        );
      },
      h3: ({ children }: any) => (
        <h3 className={`text-[12px] font-bold mt-2 mb-1 tracking-tight ${isZenMode ? 'text-slate-300' : 'text-slate-800'}`}>
          {children}
        </h3>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-indigo-500 pl-3 my-3 italic text-[11px] text-slate-400 leading-relaxed">
          {children}
        </blockquote>
      )
    };
  }, [isZenMode]);

  const greetingName = userProfile?.name || 'Scholar';
  const firstName = greetingName.split(' ')[0];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileDrop(file);
      }}
      className={`cortex-chat-root flex flex-col h-full w-full relative overflow-hidden transition-all duration-[800ms] ease-in-out ${
        isZenMode ? 'bg-[#05070a]' : 'bg-gradient-to-b from-[#F9F9FB] to-[#e3eeff]/60'
      }`}
    >
      <AnimatePresence>
        {selectionRect && selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: Math.max(10, selectionRect.top - 50),
              left: Math.max(10, selectionRect.left + (selectionRect.width / 2) - 80),
              zIndex: 9999
            }}
            className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#090b10]/95 backdrop-blur-md border border-white/10 shadow-2xl"
          >
            <button
              onClick={() => {
                setInputMessage(`Explain this concept: "${selectedText}"`);
                setTimeout(() => chatInputRef.current?.focus(), 50);
                setSelectedText('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-indigo-300 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
            >
              <img src="/images/logo-animated.svg" alt="Explain" className="w-3 h-3" /> Explain
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedText);
                toast.success('Copied to clipboard');
                setSelectionRect(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
            >
              <Copy size={11} /> Copy
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#05070a]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/50 m-4 rounded-2xl transition-all duration-200"
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center p-6 select-none">
              <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-2 animate-bounce">
                <UploadCloud size={30} />
              </div>
              <span className="text-[12px] font-black uppercase tracking-widest text-indigo-300">
                Drop reference file
              </span>
              <span className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed">
                Release to attach PDF, image, or text file context into SARA's active workspace query.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKBENCH & CHAT CANVAS WRAPPER */}
      <div className="flex-1 flex w-full min-h-0 relative overflow-hidden">
          


          {/* LEFT PANE: Chat Stream */}
          <div className={`flex flex-col min-w-0 h-full transition-all duration-300 ${workbenchArtifact ? 'w-full lg:w-1/2 shrink-0 border-r border-white/5' : 'w-full flex-1'}`}>

          {/* GOOGLE MATERIAL 3 FLOATING MEMORY ANCHORS DOCK */}
          {pinnedAnchors.length > 0 && (
            <div className="sticky top-3 z-30 flex flex-col items-center w-full pointer-events-none select-none px-4">
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setShowPinnedTray(!showPinnedTray)}
                className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 hover:bg-amber-500/20 dark:hover:bg-amber-400/20 border border-amber-500/25 dark:border-amber-400/30 backdrop-blur-xl shadow-md text-amber-700 dark:text-amber-300 font-mono text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 border-none outline-none"
              >
                <Pin size={12} className="fill-amber-400 text-amber-400 animate-pulse" />
                <span>{pinnedAnchors.length} Memory Anchor{pinnedAnchors.length > 1 ? 's' : ''} Active</span>
                <span className="text-[9px] font-mono opacity-60 font-semibold lowercase">([user pinned system context])</span>
                <span className="ml-1 text-[9px] text-amber-500 font-mono font-black">{showPinnedTray ? '▲' : '▼'}</span>
              </motion.button>

              {/* FLOATING GLASS POPOVER CARD */}
              <AnimatePresence>
                {showPinnedTray && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="pointer-events-auto mt-2 w-full max-w-xl bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-2xl border border-amber-500/25 dark:border-amber-400/25 shadow-2xl rounded-2xl p-4 space-y-3 font-sans text-left"
                  >
                    <div className="flex items-center justify-between border-b border-amber-500/15 dark:border-amber-400/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Pin size={13} className="fill-amber-400" />
                        </div>
                        <div>
                          <div className="text-[11px] font-mono font-black uppercase tracking-wider text-slate-800 dark:text-amber-300">
                            Permanent Memory Anchors ({pinnedAnchors.length})
                          </div>
                          <div className="text-[9.5px] text-slate-500 dark:text-zinc-400 font-sans">
                            Injected into system instructions on every turn regardless of sliding window depth
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPinnedTray(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
                        title="Close popover"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                      {pinnedAnchors.map((anchor) => (
                        <div key={anchor.id} className="group flex items-center justify-between p-3 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-amber-500/30 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-mono font-black uppercase tracking-wider shrink-0 ${
                              anchor.role === 'user'
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}>
                              {anchor.role === 'user' ? 'USER' : 'SARA'}
                            </span>
                            <span className="text-[12px] text-slate-700 dark:text-zinc-200 font-medium truncate max-w-[360px]">
                              {anchor.text}
                            </span>
                          </div>
                          <button
                            onClick={() => handleTogglePin(anchor.id)}
                            className="opacity-80 group-hover:opacity-100 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none flex items-center gap-1 shrink-0"
                            title="Unpin Anchor"
                          >
                            <PinOff size={11} />
                            <span>Unpin</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* CHAT SCROLL AREA */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-8 space-y-8 min-h-0">
            <div className="max-w-3xl mx-auto w-full">
              <AnimatePresence mode="wait">
                {activeThread.length === 0 ? (
                  <motion.div
                    key="welcome-gemini"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                    className="flex flex-col justify-center items-center text-center min-h-[50vh] py-8 select-none max-w-2xl mx-auto"
                  >

                    <h1 className={`text-4xl md:text-5xl font-medium tracking-tight font-sans ${isZenMode ? 'text-white' : 'text-[#202124]'}`}>
                      Welcome to Cortex, {firstName}.
                    </h1>
                    <h2 className={`text-2xl font-normal font-sans mt-3 mb-10 ${isZenMode ? 'text-slate-400' : 'text-[#5F6368]'}`}>
                      What would you like to explore today?
                    </h2>
                    

                  </motion.div>
                ) : (
                  <div className="space-y-6">
                {activeThread.map((msg: ChatMessage, idx: number) => {
                  const isLatest = idx === activeThread.length - 1;
                  const msgFeedback = executionFeedbackMap[msg.id];
                  if (msg.role === 'model') {
                    return (
                      <StandaloneSaraMessageBubble
                        key={msg.id}
                        message={msg}
                        index={idx}
                        chatHistory={activeThread}
                        isZenMode={isZenMode}
                        onSendMessage={handleSendMessage}
                        onRegenerate={handleRegenerate}
                        setInputMessage={setInputMessage}
                        chatInputRef={chatInputRef}
                        getActiveModelName={getActiveModelName}
                        ChatMarkdownComponents={{
                          ...ChatMarkdownComponents,
                          code: ({ inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            
                            if (codeString.includes('├──') || codeString.includes('└──') || codeString.includes('Skill Landscape')) {
                              return <VisualSkillTree text={codeString} isZenMode={isZenMode} />;
                            }

                            if (!inline && match) {
                              let lang = match[1].toLowerCase();
                              if (lang === 'js') lang = 'javascript';
                              if (lang === 'ts') lang = 'typescript';
                              if (lang === 'py') lang = 'python';
                              if (lang === 'rs') lang = 'rust';
                              if (lang === 'golang') lang = 'go';
                              if (lang === 'c++') lang = 'cpp';

                              if (isLatest) {
                                return (
                                  <div className="my-4 rounded-xl border border-white/[0.05] bg-zinc-950 overflow-hidden text-left select-text">
                                    <div className="flex items-center justify-between px-3.5 py-2 bg-[#090b10] border-b border-white/[0.06] select-none">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                                          <Terminal size={11} className="text-indigo-400" />
                                          <span>Code Block</span>
                                        </div>
                                        <span className="text-[10.5px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">{lang}</span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setWorkbenchArtifact({ code: codeString, language: lang, title: 'Code Workbench', sourceMsgId: msg.id });
                                        }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                                      >
                                        <Play size={10} className="fill-indigo-400" /> Run in Sandbox
                                      </button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto font-mono text-[11px] leading-relaxed">
                                      <code className={className} {...props}>{codeString}</code>
                                    </pre>
                                    {msgFeedback && (
                                      <div className={`border-t border-white/5 p-3 font-mono text-[11px] max-h-[200px] overflow-y-auto ${msgFeedback.success ? 'bg-indigo-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>
                                        <div className="flex items-center gap-1.5 mb-2 text-[9px] uppercase tracking-widest font-bold opacity-70">
                                          {msgFeedback.success ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                          <span>Execution Feedback</span>
                                        </div>
                                        <pre className="whitespace-pre-wrap">{msgFeedback.stderr || msgFeedback.stdout || 'Process finished with no output'}</pre>
                                      </div>
                                    )}
                                  </div>
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
                                      <span className="text-[10.5px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">{lang}</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setWorkbenchArtifact({ code: codeString, language: lang, title: 'Code Workbench', sourceMsgId: msg.id });
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
                                    >
                                      <Columns size={11} className="text-indigo-400" /> Expand Workbench
                                    </button>
                                  </div>
                                  <div className="p-1 h-[320px]">
                                    <CodeSandbox
                                      initialCode={codeString}
                                      initialLanguage={lang}
                                      onClose={() => {}}
                                      isZenMode={isZenMode}
                                      onAskSara={handleSendMessage}
                                      onOpenWorkbench={(c, l, t) => setWorkbenchArtifact({ code: c, language: l, title: t, sourceMsgId: msg.id })}
                                      hideCloseButton={true}
                                      sourceMsgId={msg.id}
                                      onExecutionOutput={handleExecutionOutput}
                                    />
                                  </div>
                                  {msgFeedback && (
                                    <div className={`border-t border-white/5 p-3 font-mono text-[11px] max-h-[200px] overflow-y-auto ${msgFeedback.success ? 'bg-indigo-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>
                                      <div className="flex items-center gap-1.5 mb-2 text-[9px] uppercase tracking-widest font-bold opacity-70">
                                        {msgFeedback.success ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                        <span>Execution Feedback</span>
                                      </div>
                                      <pre className="whitespace-pre-wrap">{msgFeedback.stderr || msgFeedback.stdout || 'Process finished with no output'}</pre>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <code className={`px-1.5 py-0.5 rounded text-[11px] font-mono border inline font-semibold ${isZenMode ? 'bg-white/10 text-indigo-300 border-white/10' : 'bg-indigo-50/70 text-indigo-700 border-indigo-200/60'}`} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                        onEditMessage={handleEditMessage}
                        onSelectBranch={handleSelectBranch}
                        onOpenWorkbench={(code, language, title) => setWorkbenchArtifact({ code, language, title, sourceMsgId: msg.id })}
                        onTogglePin={(id) => {
                          setChatHistory(prev => prev.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
                        }}
                      />
                    );
                  }
                  return (
                    <StandaloneSaraMessageBubble
                      key={msg.id}
                      message={msg}
                      index={idx}
                      chatHistory={activeThread}
                      isZenMode={isZenMode}
                      onSendMessage={handleSendMessage}
                      onRegenerate={handleRegenerate}
                      setInputMessage={setInputMessage}
                      chatInputRef={chatInputRef}
                      getActiveModelName={getActiveModelName}
                      ChatMarkdownComponents={ChatMarkdownComponents}
                      onEditMessage={handleEditMessage}
                      onSelectBranch={handleSelectBranch}
                      onOpenWorkbench={handleOpenWorkbench}
                      onTogglePin={handleTogglePin}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>


        </div>
      </div>

      {/* INPUT CONTAINER */}
      <div className={`px-4 pb-3.5 pt-2 shrink-0 ${isZenMode ? '' : 'bg-transparent'}`}>
        <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
          
          <div className={`gemini-pill-input w-full rounded-[32px] border transition-all flex flex-col relative px-5 py-3 aurora-bg-container ${isTyping ? 'active' : ''} ${
            isZenMode
              ? `bg-[#1e202a] border-transparent ${isTyping ? 'opacity-65' : ''}`
              : (!isZenMode && chatHistory.length === 0)
                ? `gemini-new-chat-glowing ${isTyping ? 'opacity-65' : ''}`
                : `bg-white border-[#DADCE0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-[#1A73E8] focus-within:ring-4 focus-within:ring-[#1A73E8]/8 ${isTyping ? 'opacity-65' : ''}`
          }`}>
            
            {showSlashMenu && (
              <div className={`absolute bottom-[80px] left-4 right-4 md:left-auto md:right-auto md:w-72 rounded-xl border shadow-xl z-[150] overflow-hidden ${
                isZenMode ? 'bg-[#0b0c10]/95 backdrop-blur-md border-white/10 text-slate-200' : 'bg-white border-[#E5E5E7] text-[#1D1D1F]'
              }`}>
                <div className={`px-3 py-1.5 text-[8.5px] font-black uppercase tracking-[0.2em] border-b ${
                  isZenMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-[#E5E5E7] bg-[#F5F5F7] text-[#6E6E73]'
                }`}>
                  Quick Assistant Commands
                </div>
                {STANDALONE_SLASH_COMMANDS
                  .filter(c => c.cmd.startsWith(inputMessage))
                  .map((c, idx) => (
                  <button
                    key={c.cmd}
                    onClick={() => {
                      if (c.action === 'clear_chat') {
                        setInputMessage('');
                        void clearChatHistory();
                        setShowSlashMenu(false);
                        return;
                      }
                      setInputMessage(c.placeholder || c.cmd);
                      setShowSlashMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-[11px] flex items-center justify-between transition-colors border-none cursor-pointer ${
                      idx === slashSelectedIndex 
                        ? (isZenMode ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'bg-[#F5F5F7] text-[#0D0D0E] font-bold') 
                        : (isZenMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-[#F5F5F7] text-[#6E6E73]')
                    }`}
                  >
                    <span className="font-mono">{c.cmd}</span>
                    <span className={`text-[9.5px] ${isZenMode ? 'text-zinc-500' : 'text-[#86868B]'}`}>{c.desc}</span>
                  </button>
                ))}
              </div>
            )}

                {(pendingFiles.length > 0 || activeMission || activeScenario) && (
                  <div className="flex flex-col gap-1.5 mb-2 pb-2 border-b border-slate-200/50 dark:border-white/5 select-none">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500/70 dark:text-indigo-400/60">
                      <Sparkles size={10} /> Active Context
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeMission && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                          <Library size={11} /> {(activeMission as any).title || (activeMission as any).name || 'Mission'}
                        </div>
                      )}
                      {activeScenario && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
                          <Terminal size={11} /> {(activeScenario as any).title || (activeScenario as any).name || 'Scenario'}
                        </div>
                      )}
                      {pendingFiles.map((pf: any, i: number) => (
                        <div key={pf.id || i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold max-w-[200px] ${
                          isZenMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/80 border-slate-200/60 text-slate-700 shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)]'
                        }`}>
                          {pf.type === 'image' ? (
                            <ImageIcon size={11} className="text-blue-400" />
                          ) : pf.type === 'pdf' ? (
                            <FileText size={11} className="text-rose-400" />
                          ) : (
                            <File size={11} className="text-indigo-500" />
                          )}
                          <span className="truncate max-w-[140px]">{pf.name}</span>
                          <button
                            onClick={() => setPendingFiles((prev: any[]) => prev.filter((f: any) => f.id !== pf.id))}
                            className="hover:text-rose-500 transition-colors border-none bg-transparent cursor-pointer p-0 text-slate-400 ml-1"
                            title="Remove file context"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 1: Full-width Textarea */}
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
                    const filteredCommands = STANDALONE_SLASH_COMMANDS.filter(c => c.cmd.startsWith(inputMessage));
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
                        if (selectedCmd.action === 'clear_chat') {
                          setInputMessage('');
                          void clearChatHistory();
                          setShowSlashMenu(false);
                          return;
                        }
                        setInputMessage(selectedCmd.placeholder || selectedCmd.cmd);
                        setShowSlashMenu(false);
                        return;
                      }
                      if (e.key === 'Escape') {
                        setShowSlashMenu(false);
                        return;
                      }
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={
                    isTyping
                      ? "Cortex synthesis active..."
                      : "Ask Cortex anything..."
                  }
                  className={`w-full bg-transparent border-none outline-none resize-none text-[13.5px] font-medium leading-relaxed max-h-48 custom-scrollbar ${
                    isZenMode 
                      ? 'text-white placeholder:text-zinc-500' 
                      : 'text-[#1D1D1F] placeholder:text-[#86868B]'
                  }`}
                />

                {/* Row 2: Bottom Toolbar Controls */}
                <div className="flex items-center justify-between pt-2 mt-1 select-none">
                  {/* Left actions: Attach file + Clear thread */}
                  <div className="flex items-center gap-1">
                    <input
                      ref={chatFileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,text/*,.txt,.md,.json,.js,.ts,.tsx,.jsx"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(f => handleFileDrop(f));
                        if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none ${
                        isZenMode
                          ? 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          : 'bg-transparent text-slate-550 hover:bg-slate-200 hover:text-slate-800'
                      }`}
                      title="Attach reference document or image"
                      aria-label="Attach file"
                    >
                      <Plus size={16} />
                    </button>

                    <div className="h-3 w-[1px] bg-slate-300 dark:bg-zinc-700/60 mx-1" />

                    {/* Model selector chip inside input toolbar */}
                    <ModelSelector
                      byokMode={byokMode}
                      byokConfig={byokConfig}
                      onSelect={handleModelSelectChange}
                      variant={isZenMode ? 'zen' : 'light'}
                      compact={true}
                      dropdownPosition="top"
                    />
                  </div>

                  {/* Right action: Mic + Send or Cancel */}
                  <div className="flex items-center gap-1.5">
                    {isRecording && (
                      <div className={`flex items-center mr-2 ${isZenMode ? 'text-rose-400' : 'text-rose-500'}`}>
                        <div className="gemini-wave">
                          <span /><span /><span /><span /><span />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={toggleSpeechToText}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none ${
                        isRecording 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                          : (isZenMode ? 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'bg-transparent text-slate-550 hover:bg-slate-200 hover:text-slate-800')
                      }`}
                      title={isRecording ? "Stop recording" : "Dictate prompt"}
                      aria-label="Speech to text"
                    >
                      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    
                    {isTyping ? (
                      <button
                        aria-label="Cancel response"
                        title="Cancel response"
                        type="button"
                        onClick={handleCancelSara}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border-none shadow-sm animate-pulse ${isZenMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        </svg>
                      </button>
                    ) : (
                      <button
                        aria-label="Send message"
                        title="Send message"
                        type="button"
                        disabled={inputMessage.trim() === '' && pendingFiles.length === 0}
                        onClick={() => handleSendMessage()}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-none ${
                          (inputMessage.trim() === '' && pendingFiles.length === 0)
                            ? 'opacity-70 cursor-not-allowed text-slate-500 dark:text-zinc-500 bg-slate-100/50 dark:bg-zinc-800/50'
                            : 'hover:scale-105 active:scale-95 bg-[#4e5bff] text-white shadow shadow-indigo-500/10'
                        }`}
                      >
                        <Send size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Split Artifact Workbench */}
        <AnimatePresence>
          {workbenchArtifact && (
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-0 lg:relative lg:inset-auto z-[200] lg:z-20 flex flex-col h-full w-full lg:w-1/2 shrink-0 bg-[#07080b] border-l border-white/[0.08] shadow-2xl overflow-hidden"
            >
              {/* Workbench Top Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#090b10] border-b border-white/[0.08] select-none shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Columns size={14} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">
                        {workbenchArtifact.title || 'Artifact Workbench'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {workbenchArtifact.language}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">
                      Live Side-by-Side Playground
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkbenchArtifact(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
                    title="Close Workbench Pane"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Workbench Content */}
              <div className="flex-1 p-2 h-full overflow-hidden relative">
                {workbenchArtifact.language === 'mermaid' ? (
                  <div className="w-full h-full bg-[#0d111d] rounded-xl overflow-auto p-4 border border-white/5 relative shadow-inner">
                    <MermaidDiagram chart={workbenchArtifact.code} isZenMode={true} />
                  </div>
                ) : (
                  <CodeSandbox
                    initialCode={workbenchArtifact.code}
                    initialLanguage={workbenchArtifact.language}
                    onClose={() => setWorkbenchArtifact(null)}
                    isZenMode={isZenMode}
                    onAskSara={handleSendMessage}
                    hideCloseButton={true}
                    sourceMsgId={workbenchArtifact.sourceMsgId}
                    onExecutionOutput={handleExecutionOutput}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CortexChat;
