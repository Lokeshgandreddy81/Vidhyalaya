import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateLearningPlan, scoutWebForResourcesJSON, FileAttachment, chatWithTutor } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Zap, Loader2,
  UploadCloud, FileText, X, Globe, Video,
  TrendingUp, Heart, BookOpen, Target, Layout as LayoutIcon,
  ChevronDown, CheckCircle2, Search, Sparkles, Plus, Terminal, Code,
  AlertTriangle, Compass, GitBranch, ArrowUp, Users, Sliders, Trash, ArrowDown, Layers, PanelRightClose, PanelRightOpen, PanelLeftOpen, Mic, MicOff
} from 'lucide-react';
import { ShellTerminal } from '../components/ui/ShellTerminal';
import { ModelSelector, PROVIDER_MODELS } from '../components/ui/ModelSelector';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';

/* ── Option Color Tag Classifier ── */
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

const getChipBadgeClass = (label: string, value: string) => {
  const v = value.toLowerCase();
  const l = label.toLowerCase();

  if (l === 'depth') {
    if (v.includes('expert')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('advanced')) return 'text-purple-700 bg-purple-50 border-purple-200/50';
    return 'text-blue-700 bg-blue-50 border-blue-200/50';
  }
  if (l === 'level') {
    if (v.includes('expert')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('competent')) return 'text-emerald-700 bg-emerald-50 border-emerald-200/50';
    if (v.includes('beginner')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    return 'text-slate-650 bg-slate-50 border-slate-200/50';
  }
  if (l === 'for') {
    if (v.includes('career')) return 'text-blue-700 bg-blue-50 border-blue-200/50';
    if (v.includes('project')) return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
    if (v.includes('academic')) return 'text-violet-700 bg-violet-50 border-violet-200/50';
    return 'text-slate-650 bg-slate-50 border-slate-200/50';
  }
  if (l === 'load') {
    if (v.includes('balanced')) return 'text-emerald-700 bg-emerald-50 border-emerald-200/50';
    if (v.includes('spaced')) return 'text-blue-700 bg-blue-50 border-blue-200/50';
    return 'text-rose-700 bg-rose-50 border-rose-200/50';
  }
  if (l === 'mode') {
    if (v.includes('mixed')) return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
    if (v.includes('interactive')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    if (v.includes('video')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    return 'text-slate-655 bg-slate-50 border-slate-200/50';
  }
  if (l === 'focus') {
    if (v.includes('deep')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('exam')) return 'text-violet-700 bg-violet-50 border-violet-200/50';
    if (v.includes('sprint')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
  }
  return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
};

/* ── Popover Selector Dropdown ── */
const PopoverSelector = ({
  label, value, options, onChange, isDark
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; isDark?: boolean }) => {
  const badgeClass = getChipBadgeClass(label, value);
  return (
    <div className={`flex items-center justify-between gap-3 py-1 border-b last:border-b-0 ${
      isDark ? 'border-white/[0.04]' : 'border-slate-150'
    }`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
        isDark ? 'text-white/40' : 'text-slate-450'
      }`}>{label}</span>
      <div className="relative inline-flex items-center">
        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold font-mono ${
          isDark
            ? 'text-white bg-white/[0.03] border-white/10'
            : badgeClass
        }`}>
          {value}
        </span>
        <ChevronDown size={10} className={`${isDark ? 'text-white/30' : 'text-slate-450'} ml-1 shrink-0`} />
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt} style={{ color: '#0d0d0d', background: '#ffffff' }}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* ── Popover Grid Selector Dropdown ── */
const PopoverGridSelector = ({
  label, value, options, onChange, isAuto, onToggleAuto
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  isAuto?: boolean;
  onToggleAuto?: () => void;
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      <div className="flex items-center justify-between w-full">
        <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-white/30 block">{label}</span>
        {onToggleAuto && (
          <button
            type="button"
            onClick={onToggleAuto}
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border flex items-center gap-1 leading-none ${
              isAuto
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${isAuto ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isAuto ? 'Auto' : 'Locked'}
          </button>
        )}
      </div>
      <div className="relative w-full">
        <div className="w-full bg-[#161616] border border-white/[0.07] hover:border-white/[0.15] rounded-xl px-3 py-2 text-[11px] font-bold text-white/80 transition-all flex items-center justify-between cursor-pointer">
          <span className="truncate pr-4">{value}</span>
          <ChevronDown size={11} className="text-white/30 shrink-0" />
        </div>
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt} style={{ color: '#0d0d0d', background: '#ffffff' }}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* ── Interactive Chip Option Selector ── */
const InteractiveChipSelector = ({
  label, value, options, onChange
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => {
  return (
    <div className="flex flex-col gap-1.5 pb-2.5 w-full">
      <span className="text-[9.5px] font-bold uppercase tracking-wider font-mono text-white/30">{label}</span>
      <div className="flex flex-wrap gap-1 bg-black/35 border border-white/[0.04] p-1 rounded-xl relative w-full select-none">
        {options.map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`relative px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer border-none z-10 ${
                isActive ? 'text-white font-bold' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.01]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={`active-pill-${label}`}
                  className="absolute inset-0 bg-gradient-to-r from-[#4e5bff] to-[#3b46e6] rounded-lg shadow-[0_2px_10px_rgba(78,91,255,0.3)] z-[-1]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="truncate">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Click-To-Edit Inline Text Input ── */
const ClickToEditInput = ({
  value, onChange, className, placeholder
}: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <input
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onChange(tempValue);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsEditing(false);
            onChange(tempValue);
          }
          if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
        autoFocus
        placeholder={placeholder}
        className={`bg-[#181818] border border-[#4e5bff]/40 rounded px-1.5 py-0.5 outline-none text-white focus:shadow-[0_0_8px_rgba(78,91,255,0.2)] focus:border-[#4e5bff] font-bold text-[11.5px] ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`group/edit cursor-pointer hover:bg-white/[0.02] hover:text-[#4e5bff] rounded px-1.5 py-0.5 transition-all flex items-center gap-1.5 min-h-[24px] ${className}`}
    >
      <span className="truncate">{value || <span className="text-white/20 italic">{placeholder || 'Empty'}</span>}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-white/20 group-hover/edit:text-[#4e5bff] opacity-0 group-hover/edit:opacity-100 transition-all shrink-0">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </div>
  );
};

/* ── Click-To-Edit Inline Textarea ── */
const ClickToEditTextarea = ({
  value, onChange, className, placeholder
}: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <textarea
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onChange(tempValue);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setIsEditing(false);
            onChange(tempValue);
          }
          if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
        autoFocus
        rows={3}
        placeholder={placeholder}
        className={`w-full bg-[#181818] border border-[#4e5bff]/40 rounded p-1.5 outline-none text-white focus:shadow-[0_0_8px_rgba(78,91,255,0.2)] focus:border-[#4e5bff] resize-none text-[10.5px] leading-relaxed font-sans font-medium ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`group/edit cursor-pointer hover:bg-white/[0.01] rounded p-1.5 transition-all text-white/50 hover:text-white/80 leading-relaxed min-h-[36px] flex items-start justify-between gap-2 text-[10.5px] font-sans font-medium w-full ${className}`}
    >
      <p className="flex-1 text-left">{value || <span className="text-white/20 italic">{placeholder || 'Click to add description'}</span>}</p>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-white/20 group-hover/edit:text-[#4e5bff] opacity-0 group-hover/edit:opacity-100 transition-all shrink-0 mt-0.5">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </div>
  );
};

/* ── Holographic Compiler Visualizer ── */
const HolographicCompiler = ({
  terminalHistory
}: { terminalHistory: string[] }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const hasScout = terminalHistory.some(line => line.includes('WebScout') || line.includes('Scouting'));
  const isScouting = terminalHistory.some(line => line.includes('Scouting'));
  const isSynthesizing = terminalHistory.some(line => line.includes('Synthesizing') || line.includes('CurriculumSynthesizer'));
  const isFormatting = terminalHistory.some(line => line.includes('Formatting') || line.includes('SARA'));
  const isLinking = terminalHistory.some(line => line.includes('Linking') || line.includes('Compiler:'));

  const steps = [
    {
      label: 'Academic Scout Verification',
      status: isSynthesizing || isFormatting || isLinking ? 'completed' : (isScouting ? 'active' : 'pending'),
      desc: 'Retrieving external validation indexes & YouTube payloads'
    },
    {
      label: 'Cognitive Blueprint Alignment',
      status: isFormatting || isLinking ? 'completed' : (isSynthesizing ? 'active' : 'pending'),
      desc: 'Formulating prompts for model instruction matrices'
    },
    {
      label: 'Gemini Logic Engine Synthesis',
      status: isLinking ? 'completed' : (isFormatting ? 'active' : 'pending'),
      desc: 'Generating custom modular schemas via Gemini 1.5 Pro/Flash'
    },
    {
      label: 'SARA Dependency Node Parsing',
      status: terminalHistory.some(line => line.includes('compiled successfully') || line.includes('blueprint') || line.includes('launch')) ? 'completed' : (isLinking ? 'active' : 'pending'),
      desc: 'Structuring phases, modules, and timing metrics'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05070a] overflow-hidden relative select-none">
      {/* Aurora glow background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(78,91,255,0.06),transparent_65%)]" />

      {/* Main Holographic Grid */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-8 overflow-y-auto custom-scrollbar">
        {/* Holographic Ring Visualizer */}
        <div className="flex flex-col items-center justify-center relative w-64 h-64 shrink-0">
          {/* Rotating Outer Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            className="absolute inset-0 border border-dashed border-[#4e5bff]/30 rounded-full shadow-[0_0_20px_rgba(78,91,255,0.05)]"
          />
          {/* Rotating Middle Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute inset-4 border border-indigo-500/20 rounded-full border-spacing-2"
          />
          {/* Glowing Inner Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute inset-8 border border-double border-[#4e5bff]/45 rounded-full flex items-center justify-center"
          />
          {/* Core pulsing portal */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-16 rounded-full bg-gradient-to-br from-[#4e5bff]/20 to-indigo-900/40 border border-[#4e5bff]/60 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(78,91,255,0.35)]"
          >
            <Zap size={24} className="text-[#4e5bff] fill-[#4e5bff]/30 animate-pulse" />
            <span className="text-[8px] font-mono font-bold tracking-widest text-[#4e5bff]/80 mt-1 uppercase">compiling</span>
          </motion.div>
        </div>

        {/* Pipeline Checklist */}
        <div className="flex-1 max-w-md w-full space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black tracking-widest font-mono text-[#4e5bff] bg-[#4e5bff]/10 border border-[#4e5bff]/20 px-2 py-0.5 rounded-full uppercase inline-block">
              Orchestrator pipeline
            </span>
            <h3 className="text-sm font-bold font-mono tracking-tight text-white uppercase mt-1">
              Synthesizing Cognitive Syllabus
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                  step.status === 'completed'
                    ? 'border-emerald-500/10 bg-emerald-500/[0.02]'
                    : step.status === 'active'
                    ? 'border-[#4e5bff]/20 bg-[#4e5bff]/[0.02] shadow-[0_0_12px_rgba(78,91,255,0.05)]'
                    : 'border-white/[0.02] bg-white/[0.01] opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'completed' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  ) : step.status === 'active' ? (
                    <div className="w-4 h-4 rounded-full bg-[#4e5bff]/20 border border-[#4e5bff]/50 flex items-center justify-center relative">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] z-10" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5 text-left">
                  <h4 className={`text-[11px] font-bold font-mono ${step.status === 'completed' ? 'text-emerald-450' : step.status === 'active' ? 'text-white' : 'text-white/40'}`}>
                    {step.label}
                  </h4>
                  <p className="text-[10px] text-white/35 font-sans leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streaming Console Terminal logs at bottom */}
      <div className="h-40 border-t border-white/[0.04] bg-[#0c0d12]/90 backdrop-blur-md flex flex-col select-text">
        <div className="px-4 py-1.5 border-b border-white/[0.04] bg-[#16171d]/60 flex items-center justify-between shrink-0 font-mono text-[9px] text-white/40 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500/30" />
            <span className="w-2 h-2 rounded-full bg-yellow-500/30" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/30" />
            <span className="font-semibold text-white/20 ml-2">COMPILED_DIAGNOSTICS_STREAM</span>
          </div>
          <span className="flex items-center gap-1 text-[#4e5bff]"><Loader2 size={9} className="animate-spin text-[#4e5bff]" /> streaming</span>
        </div>
        <div className="flex-1 p-4 font-mono text-[10px] text-emerald-450/90 space-y-1 overflow-y-auto custom-scrollbar select-text text-left">
          {terminalHistory.map((log, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all select-text">
              {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

/* ── Conversation Message Interface ── */
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  type?: 'greeting' | 'grounding' | 'text';
  timestamp?: number;
  mode?: 'Teacher' | 'Mentor' | 'Debugger' | 'Coach' | 'Socratic' | 'Interviewer' | 'PairProgrammer';
  intent?: 'Debugging' | 'Conceptual' | 'Frustration' | 'Curiosity' | 'Validation' | 'Unknown';
  action?: 'highlight_code' | 'move_cursor' | 'dim_terminal' | 'open_notes' | 'none';
  target?: string;
  skill_update?: { concept: string; delta: number } | null;
  interactive_block?: {
    type: 'quick_choices' | 'inline_challenge' | 'guided_experiment';
    data: any;
  } | null;
  parameters?: any;
}

/* ── Autocomplete Suggestion Configs ── */
const CONTEXT_SUGGESTIONS = [
  { trigger: '@file', label: 'Reference PDF / Syllabus', desc: 'Ground with study documents', icon: <FileText size={11} /> },
  { trigger: '@codebase', label: 'Current Workspace Files', desc: 'Scan local codebase paths', icon: <Code size={11} /> },
  { trigger: '@web', label: 'Auto WebScout Search', desc: 'Crawl live reference documentations', icon: <Globe size={11} /> },
  { trigger: '@terminal', label: 'Attach Compiler Logs', desc: 'Include active console outputs', icon: <Terminal size={11} /> },
];

const COMMAND_SUGGESTIONS = [
  { trigger: '/compile', label: 'Compile Syllabus Plan', desc: 'Synthesize path from inputs', icon: <Zap size={11} /> },
  { trigger: '/refine', label: 'Refine Curriculum Blueprint', desc: 'Provide follow-up constraints', icon: <Sparkles size={11} /> },
  { trigger: '/test', label: 'Generate Skills Quiz', desc: 'Start quick simulated exam', icon: <Target size={11} /> },
  { trigger: '/code', label: 'Boilerplate Code Templates', desc: 'Render coding exercises & files', icon: <BookOpen size={11} /> },
];

/* ── Markdown Renderer Theme ── */
const ChatMarkdownComponents = {
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-[16px] border border-white/5 shadow-sm bg-white/[0.02]">
      <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-white/5 text-indigo-300 text-[9px] font-black uppercase tracking-wider">
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
    <strong className="font-extrabold text-[#4e5bff]">
      {children}
    </strong>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-[14px] font-black mt-4 mb-2 tracking-wide uppercase text-white">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-[12.5px] font-black mt-3 mb-2 tracking-wide uppercase text-indigo-300">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[11.5px] font-bold mt-2 mb-1 text-slate-350">
      {children}
    </h3>
  ),
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 rounded text-[11px] font-mono border bg-white/5 text-indigo-300 border-white/5">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-indigo-500 pl-3 my-3 italic text-[11px] text-slate-400 leading-relaxed">
      {children}
    </blockquote>
  )
};

const ONBOARDING_CONTEXT = `You are helping the student design their learning roadmap on Vidhyalaya.
They have NOT compiled their learning path/curriculum yet.
You are a helpful mentor — not a robotic assistant. Be warm, direct, and conversational. No filler phrases like "Great question!" or "Certainly!".
If the student asks a general question (programming concepts, career advice, skills to learn, etc.), answer it comprehensively and conversationally using Markdown. Adapt to their level.
If the student wants to study or master a specific subject, language, or concept — help them frame it clearly, then proceed.
CRITICAL: When the student has clearly named a topic they want to study, you MUST set "action": "set_goal" and "target": "[The Topic Name]" in your <sara_metadata> block so the system can initialize the curriculum compiler. For example: "target": "Machine Learning".
If they are just chatting or asking general questions, keep "action": "none" and "target": "".

FOLLOW-UP QUICK CHOICES RULES:
- Once the initial greetings are done (meaning after the user's first general greeting message like "hi" or "hello" is answered and the user asks a real learning or conceptual question), you MUST provide 2-4 highly relevant, short follow-up choices inside "interactive_block" under type "quick_choices".
- CRITICAL: Do NOT generate "quick_choices" for simple greetings/introductory turns. Set "interactive_block" to null in those cases. Only start offering them once greetings are complete and the user begins their learning inquiry.

COMPILER OPTIONS ANALYSIS:
During the onboarding conversation, you should infer the user's learning preferences and output them in the "parameters" field in the <sara_metadata> JSON block when they indicate specific needs.
Available parameters (with exact matching string values):
1. depth: "Foundational" | "Advanced" | "Expert" | "Mastery / Deep-Dive" | "Academic & Research"
2. timeline: "14d at 30m/day" | "30d at 45m/day" | "60d at 60m/day" | "90d at 90m/day"
3. proficiency: "Novice" | "Beginner" | "Competent" | "Expert"
4. motivation: "Career" | "Project" | "Academic" | "Hobby"
5. cognitiveProfile: "Practical Dev-First" | "Visual & Conceptual" | "Theoretical & Derivations" | "Dialectic Active Recall"
6. tutorPersona: "Silicon Valley Tech Lead" | "Rigorous Scholar" | "Socratic Mentor" | "Interactive Partner"
7. assessmentStyle: "Sprint Diagnostics" | "Project Blueprint" | "Comprehensive Review" | "Read Only (Zen)"
8. primaryMedia: "Mixed Scout" | "Written-first Papers" | "Interactive Video Notes"
9. language: "English" | "Spanish" | "Hindi" | "German" | "French" | "Telugu" | "Tamil" | "Japanese" | "Chinese"
10. pacing: "Adaptive" | "Linear" | "Accelerated" | "Spaced Repetition"
11. difficultyScaling: "Dynamic Auto-scaling" | "Fixed Standard" | "Assisted / Guided"
12. projectTarget: "Portfolio Project" | "Industry Lab" | "Proof of Concept" | "None (Pure Theory)"

Example metadata output in JSON (only include keys that you want to update):
"parameters": {
  "depth": "Mastery / Deep-Dive",
  "timeline": "30d at 45m/day",
  "language": "Spanish",
  "proficiency": "Competent"
}`;


/* ── Cortex Orbital Logo Component ── */
const CortexLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; animate?: boolean }> = ({ size = 'md', animate = false }) => {
  const dimensions = {
    sm: { container: 'w-5.5 h-5.5 rounded-lg', svg: 'w-[12px] h-[12px]', stroke: '1.8' },
    md: { container: 'w-7.5 h-7.5 rounded-xl', svg: 'w-[16px] h-[16px]', stroke: '2.2' },
    lg: { container: 'w-8.5 h-8.5 rounded-xl', svg: 'w-[18px] h-[18px]', stroke: '2.2' },
  }[size];

  return (
    <div className={`relative flex items-center justify-center bg-white/5 border border-white/[0.08] transition-all duration-300 shadow-none shrink-0 ${dimensions.container}`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth={dimensions.stroke} 
        strokeLinecap="round" 
        className={`text-indigo-300 transition-all duration-500 ${dimensions.svg} ${
          animate ? 'cortex-animate-spin-slow' : ''
        }`}
      >
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          strokeDasharray="3 3" 
          className={`opacity-40 origin-center ${animate ? 'cortex-animate-spin-reverse' : ''}`} 
        />
        <path 
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" 
          className={`opacity-90 origin-center ${animate ? 'cortex-animate-pulse-slow' : ''}`} 
        />
        <path 
          d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" 
          className={`opacity-90 origin-center ${animate ? 'cortex-animate-pulse-slow' : ''}`} 
        />
        <circle 
          cx="12" 
          cy="12" 
          r="2.2" 
          className={`fill-indigo-300 stroke-none origin-center ${animate ? 'cortex-animate-center-glow' : ''}`} 
        />
      </svg>
    </div>
  );
};

/* ── Main Component ── */
const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath, userProfile, byokMode, updateByokMode, byokConfig, updateByokConfig } = useAppStore();

  const handleModelSelectChange = (val: string) => {
    if (val === 'auto') {
      updateByokMode('auto');
      toast.success('Switched to Auto (System Choice) \uD83D\uDD12');
    } else {
      const slashIndex = val.indexOf('/');
      if (slashIndex !== -1) {
        const provider = val.substring(0, slashIndex);
        const preferredModel = val.substring(slashIndex + 1);
        const cachedKeysRaw = localStorage.getItem('vidyal_byok_keys_cache') || '{}';
        let key = '';
        try {
          const cachedKeys = JSON.parse(cachedKeysRaw);
          key = cachedKeys[provider] || '';
        } catch { /* ignore */ }
        if (!key && byokConfig && byokConfig.provider === provider) {
          key = byokConfig.apiKey || '';
        }
        updateByokConfig({
          provider: provider as 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq',
          apiKey: key,
          preferredModel,
        });
        updateByokMode('custom');
        const found = (PROVIDER_MODELS[provider] || []).find(m => m.id === preferredModel);
        toast.success(`Switched to ${found ? found.name : preferredModel} \uD83D\uDD13`);
        if (!key) {
          toast.warning(`API key for ${provider} is not set. Please add it in Settings.`);
        }
      }
    }
  };

  const isSelectedModelKeyMissing = () => {
    if (byokMode === 'custom' && byokConfig) {
      if (byokConfig.provider !== 'gemini' && !byokConfig.apiKey?.trim()) {
        return true;
      }
    }
    return false;
  };

  const getActiveModelName = () => {
    let name = 'Gemini 2.5 Flash';
    if (byokMode === 'custom' && byokConfig) {
      if (byokConfig.preferredModel?.trim()) {
        const found = (PROVIDER_MODELS[byokConfig.provider] || []).find(m => m.id === byokConfig.preferredModel);
        name = found ? found.name : byokConfig.preferredModel.trim();
      } else {
        const providerNames: Record<string, string> = {
          gemini: 'Gemini 2.5 Flash',
          openai: 'gpt-4o-mini',
          anthropic: 'Claude 3.5 Sonnet',
          groq: 'Llama 3.3',
          openrouter: 'OpenRouter Model',
        };
        name = providerNames[byokConfig.provider] || 'Custom Model';
      }
    }
    if (isSelectedModelKeyMissing()) {
      return `${name} (Gemini Fallback)`;
    }
    return name;
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followUpTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content?: string; attachment?: FileAttachment }[]>([]);
  const [webScoutActive, setWebScoutActive] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [isSaraTyping, setIsSaraTyping] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('vidyal_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      setIsSidebarCollapsed((e as CustomEvent).detail);
    };
    window.addEventListener('set-sidebar-collapsed', handleSync);
    
    // Expand the sidebar on mount so it is clearly visible on the creation page
    window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
    
    return () => {
      window.removeEventListener('set-sidebar-collapsed', handleSync);
    };
  }, []);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak now 🎙️");
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
        if (e.error !== 'no-speech') {
          toast.error("Speech recognition error: " + e.error);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setFormData(prev => ({
            ...prev,
            goal: prev.goal ? prev.goal + ' ' + transcript : transcript
          }));
          toast.success("Speech captured! 🎙️");
          
          // Focus the active textarea after speech is synthesized
          setTimeout(() => {
            if (followUpTextareaRef.current) {
              followUpTextareaRef.current.focus();
            } else if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 50);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    }
  };

  const [conversationStage, setConversationStage] = useState<'greet' | 'ground' | 'compiling'>('greet');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('goal') || '';
  });

  const [compiledPath, setCompiledPath] = useState<any | null>(null);
  const [rightPaneState, setRightPaneState] = useState<'idle' | 'compiling' | 'completed'>('idle');

  // Workspace Dynamic Tabs & Editor/Browser states
  const [workspaceTab, setWorkspaceTab] = useState<'roadmap' | 'terminal' | 'blueprint' | 'browser'>('blueprint');
  const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState<boolean>(true);
  const [activeSuggestionType, setActiveSuggestionType] = useState<'context' | 'command' | null>(null);
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState<string>('');
  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);
  const [selectedEditorFile, setSelectedEditorFile] = useState<string>('App.tsx');
  const [browserUrl, setBrowserUrl] = useState<string>('https://127.0.0.1:3003/dashboard');
  const [browserHistory, setBrowserHistory] = useState<string[]>(['https://127.0.0.1:3003/dashboard']);
  const [browserHistoryIndex, setBrowserHistoryIndex] = useState<number>(0);
  const [browserNotificationEmail, setBrowserNotificationEmail] = useState<string>('');
  const [isBrowserSubscribed, setIsBrowserSubscribed] = useState<boolean>(false);
  const [showBrowserDiagnostics, setShowBrowserDiagnostics] = useState<boolean>(false);

  // Terminal interactive state hooks
  const [terminalHistory, setTerminalHistory] = useState<string[]>(() => [
    'Last login: ' + new Date().toDateString() + ' on ttys002',
    'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
  ]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);

  const [editorFiles, setEditorFiles] = useState<any[]>(() => [
    {
      name: 'App.tsx',
      path: 'src/App.tsx',
      language: 'tsx',
      content: `import React from 'react';
import Dashboard from './pages/Dashboard';
import CreatePath from './pages/CreatePath';

export default function App() {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">
      <header className="p-4 border-b border-white/[0.04]">
        <h1 className="text-sm font-mono font-bold">Vidyal.ai Workspace</h1>
      </header>
      <main className="p-6">
        <CreatePath />
      </main>
    </div>
  );
}`
    },
    {
      name: 'Store.tsx',
      path: 'src/context/Store.tsx',
      language: 'typescript',
      content: `import React, { createContext, useContext, useState } from 'react';

interface StoreState {
  paths: any[];
  addPath: (path: any) => void;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export const AppProvider: React.FC = ({ children }) => {
  const [paths, setPaths] = useState([]);
  const addPath = (path) => setPaths(prev => [path, ...prev]);

  return (
    <StoreContext.Provider value={{ paths, addPath }}>
      {children}
    </StoreContext.Provider>
  );
};`
    },
    {
      name: 'notes.md',
      path: 'docs/notes.md',
      language: 'markdown',
      content: `# Personal Learning Notes

* Focus: Expert Software Architect blueprint.
* Study Pace: 45 minutes / day.
* Target: High-performance systems and backend compilation logs.

## Quick References:
- SARA agent compile pipeline: Auto 🔓
- Port binding mappings: localhost:3003
`
    },
    {
      name: 'exercises.ts',
      path: 'exercises/exercises.ts',
      language: 'typescript',
      content: `// Vidyal.ai Coding Sandbox Exercises
// Run, edit, and explore live concepts here.

export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Compile & Test runner
console.log("Fibonacci(10) =", fibonacci(10));
`
    }
  ]);

  const [formData, setFormData] = useState<{
    goal: string; proficiency: string; skillValue: number; expectedOutcome: string;
    targetDate: string; durationDays: number; dailyCommitment: number; resources: string;
    track: string; motivation: string; cognitiveLoad: string; outputMode: string;
    preferredStartTime: string; depth: 'Foundational' | 'Expert' | 'Advanced' | 'Mastery / Deep-Dive' | 'Academic & Research';
    cognitiveProfile: 'Practical Dev-First' | 'Visual & Conceptual' | 'Theoretical & Derivations' | 'Dialectic Active Recall';
    tutorPersona: 'Silicon Valley Tech Lead' | 'Rigorous Scholar' | 'Socratic Mentor' | 'Interactive Partner';
    assessmentStyle: 'Sprint Diagnostics' | 'Project Blueprint' | 'Comprehensive Review' | 'Read Only (Zen)';
    primaryMedia: 'Mixed Scout' | 'Written-first Papers' | 'Interactive Video Notes';
    language: string;
    pacing: string;
    difficultyScaling: string;
    projectTarget: string;
  }>(() => {
    const params = new URLSearchParams(location.search);
    return {
      goal: params.get('goal') || '',
      proficiency: 'Beginner', skillValue: 25, expectedOutcome: '',
      targetDate: '', durationDays: 30, dailyCommitment: 45, resources: '',
      track: params.get('track') || '', motivation: 'Project',
      cognitiveLoad: 'Balanced', outputMode: 'Mixed', preferredStartTime: '09:00', depth: 'Expert',
      cognitiveProfile: 'Practical Dev-First',
      tutorPersona: 'Silicon Valley Tech Lead',
      assessmentStyle: 'Sprint Diagnostics',
      primaryMedia: 'Mixed Scout',
      language: 'English',
      pacing: 'Adaptive',
      difficultyScaling: 'Dynamic Auto-scaling',
      projectTarget: 'Portfolio Project',
    };
  });

  const [autoParameters, setAutoParameters] = useState<Record<string, boolean>>({
    depth: true,
    timeline: true,
    level: true,
    for: true,
    profile: true,
    persona: true,
    assessments: true,
    media: true,
    language: true,
    pacing: true,
    difficulty: true,
    project: true,
  });

  const [customPromptDirectives, setCustomPromptDirectives] = useState('');
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [showPromptEditorPanel, setShowPromptEditorPanel] = useState(false);

  const getCompiledPrompt = () => {
    const activeGoal = selectedGoal || formData.goal;
    const directives = customPromptDirectives ? `\n\n--- CUSTOM DIRECTIVES & CONSTRAINTS ---\n${customPromptDirectives}` : '';
    const fileList = uploadedFiles.map(f => f.name).join(', ');
    const attachments = fileList ? `\n\n--- ATTACHED SYLLABUS FILES ---\n${fileList}` : '';
    const trackLine = formData.track ? `Track: ${formData.track}\n` : '';
    
    return `You are SARA's curriculum synthesizer. Generate a structured learning path with phases and modules.

Goal: ${activeGoal || '(Specify a goal or chat with SARA to begin)'}
Depth: ${formData.depth}
Proficiency: ${formData.proficiency}
${trackLine}Motivation: ${formData.motivation}
Cognitive Load: ${formData.cognitiveLoad}
Cognitive Profile: ${formData.cognitiveProfile}
AI Tutor Persona: ${formData.tutorPersona}
Assessment Style: ${formData.assessmentStyle}
Primary Media Focus: ${formData.primaryMedia}
Study Language: ${formData.language || 'English'}
Pacing Mode: ${formData.pacing || 'Adaptive'}
Difficulty Scaling: ${formData.difficultyScaling || 'Dynamic Auto-scaling'}
Project Target: ${formData.projectTarget || 'Portfolio Project'}${directives}${attachments}

Return your response in valid JSON matching the schema:
{
  "title": "string",
  "description": "string",
  "phases": [{ "title": "string", "description": "string", "modules": [{ "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"], "suggestedResources": [{"title": "string", "url": "string"}] }] }]
}`;
  };

  useEffect(() => {
    if (!isPromptCustomized) {
      setCustomPromptText(getCompiledPrompt());
    }
  }, [
    selectedGoal,
    formData.goal,
    formData.track,
    formData.motivation,
    formData.cognitiveLoad,
    formData.depth,
    formData.cognitiveProfile,
    formData.tutorPersona,
    formData.assessmentStyle,
    formData.primaryMedia,
    formData.language,
    formData.pacing,
    formData.difficultyScaling,
    formData.projectTarget,
    customPromptDirectives,
    uploadedFiles,
    isPromptCustomized
  ]);

  // Helper functions for inline roadmap customization
  const handleUpdatePhaseTitle = (phaseIdx: number, title: string) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx]) return prev;
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], title };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleUpdateModule = (phaseIdx: number, moduleIdx: number, key: string, value: any) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx] || !Array.isArray(updatedPhases[phaseIdx].modules)) return prev;
      const updatedModules = [...updatedPhases[phaseIdx].modules];
      if (!updatedModules[moduleIdx]) return prev;
      updatedModules[moduleIdx] = { ...updatedModules[moduleIdx], [key]: value };
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], modules: updatedModules };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleRemoveConcept = (phaseIdx: number, moduleIdx: number, conceptIdx: number) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx] || !Array.isArray(updatedPhases[phaseIdx].modules)) return prev;
      const updatedModules = [...updatedPhases[phaseIdx].modules];
      if (!updatedModules[moduleIdx]) return prev;
      const concepts = [...(updatedModules[moduleIdx].keyConcepts || [])];
      concepts.splice(conceptIdx, 1);
      updatedModules[moduleIdx] = { ...updatedModules[moduleIdx], keyConcepts: concepts };
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], modules: updatedModules };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleAddConcept = (phaseIdx: number, moduleIdx: number, concept: string) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx] || !Array.isArray(updatedPhases[phaseIdx].modules)) return prev;
      const updatedModules = [...updatedPhases[phaseIdx].modules];
      if (!updatedModules[moduleIdx]) return prev;
      const concepts = [...(updatedModules[moduleIdx].keyConcepts || []), concept];
      updatedModules[moduleIdx] = { ...updatedModules[moduleIdx], keyConcepts: concepts };
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], modules: updatedModules };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleMoveModule = (phaseIdx: number, moduleIdx: number, direction: 'up' | 'down') => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx] || !Array.isArray(updatedPhases[phaseIdx].modules)) return prev;
      const modules = [...updatedPhases[phaseIdx].modules];
      const targetIdx = direction === 'up' ? moduleIdx - 1 : moduleIdx + 1;
      
      if (targetIdx < 0 || targetIdx >= modules.length || !modules[moduleIdx] || !modules[targetIdx]) return prev;
      
      const temp = modules[moduleIdx];
      modules[moduleIdx] = modules[targetIdx];
      modules[targetIdx] = temp;
      
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], modules };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleDeleteModule = (phaseIdx: number, moduleIdx: number) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx] || !Array.isArray(updatedPhases[phaseIdx].modules)) return prev;
      const modules = [...updatedPhases[phaseIdx].modules];
      modules.splice(moduleIdx, 1);
      updatedPhases[phaseIdx] = { ...updatedPhases[phaseIdx], modules };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleAddModule = (phaseIdx: number) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      if (!updatedPhases[phaseIdx]) return prev;
      const newModule = {
        id: generateSimpleId(),
        title: 'New Custom Module',
        description: 'Describe what this module covers.',
        estimatedMinutes: 30,
        keyConcepts: [],
        resources: [],
        dependsOnModuleIds: [],
        isCompleted: false,
        userNotes: ''
      };
      const modules = Array.isArray(updatedPhases[phaseIdx].modules) ? updatedPhases[phaseIdx].modules : [];
      updatedPhases[phaseIdx] = {
        ...updatedPhases[phaseIdx],
        modules: [...modules, newModule]
      };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleAddPhase = () => {
    setCompiledPath((prev: any) => {
      if (!prev) return prev;
      const phases = Array.isArray(prev.phases) ? prev.phases : [];
      const newPhase = {
        id: generateSimpleId(),
        title: 'New Phase',
        description: 'New phase description',
        order: phases.length + 1,
        modules: []
      };
      return { ...prev, phases: [...phases, newPhase] };
    });
  };

  const handleDeletePhase = (phaseIdx: number) => {
    setCompiledPath((prev: any) => {
      if (!prev || !Array.isArray(prev.phases)) return prev;
      const updatedPhases = [...prev.phases];
      updatedPhases.splice(phaseIdx, 1);
      const reordered = updatedPhases.map((p, idx) => ({ ...p, order: idx + 1 }));
      return { ...prev, phases: reordered };
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [formData.goal]);

  useEffect(() => {
    if (followUpTextareaRef.current) {
      followUpTextareaRef.current.style.height = 'auto';
      followUpTextareaRef.current.style.height = `${followUpTextareaRef.current.scrollHeight}px`;
    }
  }, [formData.goal]);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  // Enforce dark mode layout style on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-generation-active', 'true');
    return () => {
      document.documentElement.removeAttribute('data-generation-active');
    };
  }, []);

  // Scroll chat feed automatically
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...Array.from(bytes.slice(i, i + CHUNK)));
    return btoa(binary);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        if (isPdf) {
          const base64 = await fileToBase64(file);
          const attachment: FileAttachment = { name: file.name, base64, mimeType: 'application/pdf' };
          setUploadedFiles(prev => [...prev, { name: file.name, attachment }]);
        } else {
          const text = await file.text();
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setFormData(prev => ({ ...prev, resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}` }));
        }
        setAttachedContexts(prev => prev.includes('@file') ? prev : [...prev, '@file']);
        setError(null);
      } catch (err: any) { setError(err.message); }
    }
  };

  const handleInputChange = (val: string) => {
    setFormData(prev => ({ ...prev, goal: val }));

    // Check for trigger symbols
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setActiveSuggestionType('context');
      setSuggestionSearchQuery(lastWord.slice(1).toLowerCase());
    } else if (lastWord.startsWith('/')) {
      setActiveSuggestionType('command');
      setSuggestionSearchQuery(lastWord.slice(1).toLowerCase());
    } else {
      setActiveSuggestionType(null);
      setSuggestionSearchQuery('');
    }
  };

  const handleSelectSuggestion = (trigger: string) => {
    const words = formData.goal.split(' ');
    words.pop();
    const baseText = words.join(' ');

    if (trigger.startsWith('@')) {
      if (!attachedContexts.includes(trigger)) {
        setAttachedContexts(prev => [...prev, trigger]);
      }
      if (trigger === '@file') {
        fileInputRef.current?.click();
      }
      if (trigger === '@web') {
        setWebScoutActive(true);
      }
      setFormData(prev => ({
        ...prev,
        goal: baseText ? baseText + ' ' : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        goal: baseText ? `${baseText} ${trigger} ` : `${trigger} `
      }));
    }
    setActiveSuggestionType(null);
    setSuggestionSearchQuery('');
  };

  const handleOpenBrowserUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success("Opening resource in new tab 🌐");
  };

  const handleSelectTemplate = (card: typeof suggestionCards[0]) => {
    setSelectedGoal(card.goal);
    setFormData(prev => ({
      ...prev,
      track: card.title
    }));
    const userMsgId = 'user-' + Date.now();
    const modelMsgId = 'model-' + Date.now();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: `I choose the "${card.title}" preset template.` },
      {
        id: modelMsgId,
        role: 'model',
        text: `Excellent choice! I've set your target goal to **${card.goal}** in the **Blueprint Studio** panel on the right.\n\nWe can continue chatting here to refine your goals, or you can configure prompt parameters and click **Synthesize Academy Roadmap** in the panel whenever you're ready!`,
        type: 'text'
      }
    ]);
    setConversationStage('ground');
  };

  const scanMessageForParameters = (text: string, currentAutoSettings: Record<string, boolean>) => {
    const t = text.toLowerCase();
    const updates: any = {};
    
    if (currentAutoSettings.depth) {
      if (t.includes('mastery') || t.includes('deep-dive') || t.includes('deep dive')) updates.depth = 'Mastery / Deep-Dive';
      else if (t.includes('academic & research') || t.includes('academic and research') || t.includes('research paper')) updates.depth = 'Academic & Research';
      else if (t.includes('expert') || t.includes('architect')) updates.depth = 'Expert';
      else if (t.includes('advanced')) updates.depth = 'Advanced';
      else if (t.includes('foundational') || t.includes('beginner-friendly') || t.includes('basics')) updates.depth = 'Foundational';
    }
    
    if (currentAutoSettings.timeline) {
      if (t.includes('2 weeks') || t.includes('14 days') || t.includes('14d')) {
        updates.timeline = '14d at 30m/day';
      } else if (t.includes('1 month') || t.includes('30 days') || t.includes('30d')) {
        updates.timeline = '30d at 45m/day';
      } else if (t.includes('2 months') || t.includes('60 days') || t.includes('60d')) {
        updates.timeline = '60d at 60m/day';
      } else if (t.includes('3 months') || t.includes('90 days') || t.includes('90d')) {
        updates.timeline = '90d at 90m/day';
      }
    }
    
    if (currentAutoSettings.level) {
      if (t.includes('novice') || t.includes('absolute beginner')) updates.proficiency = 'Novice';
      else if (t.includes('beginner')) updates.proficiency = 'Beginner';
      else if (t.includes('competent') || t.includes('intermediate') || t.includes('know the basics')) updates.proficiency = 'Competent';
      else if (t.includes('expert') || t.includes('senior') || t.includes('pro')) updates.proficiency = 'Expert';
    }
    
    if (currentAutoSettings.for) {
      if (t.includes('job') || t.includes('career') || t.includes('employment') || t.includes('interview') || t.includes('resume')) updates.motivation = 'Career';
      else if (t.includes('project') || t.includes('build') || t.includes('app') || t.includes('portfolio')) updates.motivation = 'Project';
      else if (t.includes('exam') || t.includes('school') || t.includes('academic') || t.includes('degree')) updates.motivation = 'Academic';
      else if (t.includes('hobby') || t.includes('interest') || t.includes('just for fun')) updates.motivation = 'Hobby';
    }
    
    if (currentAutoSettings.profile) {
      if (t.includes('practical') || t.includes('hands-on') || t.includes('code-first')) updates.cognitiveProfile = 'Practical Dev-First';
      else if (t.includes('visual') || t.includes('diagram') || t.includes('conceptual')) updates.cognitiveProfile = 'Visual & Conceptual';
      else if (t.includes('theoretical') || t.includes('math') || t.includes('derivation')) updates.cognitiveProfile = 'Theoretical & Derivations';
      else if (t.includes('active recall') || t.includes('quiz') || t.includes('test me')) updates.cognitiveProfile = 'Dialectic Active Recall';
    }
    
    if (currentAutoSettings.persona) {
      if (t.includes('tech lead') || t.includes('silicon valley')) updates.tutorPersona = 'Silicon Valley Tech Lead';
      else if (t.includes('scholar') || t.includes('professor')) updates.tutorPersona = 'Rigorous Scholar';
      else if (t.includes('socratic') || t.includes('ask questions')) updates.tutorPersona = 'Socratic Mentor';
      else if (t.includes('partner') || t.includes('peer')) updates.tutorPersona = 'Interactive Partner';
    }
    
    if (currentAutoSettings.assessments) {
      if (t.includes('diagnostic') || t.includes('quick quiz')) updates.assessmentStyle = 'Sprint Diagnostics';
      else if (t.includes('blueprint') || t.includes('milestone project')) updates.assessmentStyle = 'Project Blueprint';
      else if (t.includes('comprehensive') || t.includes('final exam')) updates.assessmentStyle = 'Comprehensive Review';
      else if (t.includes('zen') || t.includes('no test') || t.includes('read only')) updates.assessmentStyle = 'Read Only (Zen)';
    }
    
    if (currentAutoSettings.media) {
      if (t.includes('mixed') || t.includes('articles and videos')) updates.primaryMedia = 'Mixed Scout';
      else if (t.includes('paper') || t.includes('textbook') || t.includes('written')) updates.primaryMedia = 'Written-first Papers';
      else if (t.includes('video') || t.includes('youtube') || t.includes('screencast')) updates.primaryMedia = 'Interactive Video Notes';
    }
    
    if (currentAutoSettings.language) {
      if (t.includes('spanish') || t.includes('español')) updates.language = 'Spanish';
      else if (t.includes('hindi')) updates.language = 'Hindi';
      else if (t.includes('german')) updates.language = 'German';
      else if (t.includes('french')) updates.language = 'French';
      else if (t.includes('telugu')) updates.language = 'Telugu';
      else if (t.includes('tamil')) updates.language = 'Tamil';
      else if (t.includes('japanese')) updates.language = 'Japanese';
      else if (t.includes('chinese')) updates.language = 'Chinese';
      else if (t.includes('english')) updates.language = 'English';
    }
    
    if (currentAutoSettings.pacing) {
      if (t.includes('adaptive') || t.includes('personalized')) updates.pacing = 'Adaptive';
      else if (t.includes('linear') || t.includes('step-by-step')) updates.pacing = 'Linear';
      else if (t.includes('accelerated') || t.includes('fast') || t.includes('crash course')) updates.pacing = 'Accelerated';
      else if (t.includes('spaced') || t.includes('repetition') || t.includes('retention')) updates.pacing = 'Spaced Repetition';
    }
    
    if (currentAutoSettings.difficulty) {
      if (t.includes('auto-scaling') || t.includes('dynamic')) updates.difficultyScaling = 'Dynamic Auto-scaling';
      else if (t.includes('fixed') || t.includes('standard') || t.includes('normal')) updates.difficultyScaling = 'Fixed Standard';
      else if (t.includes('guided') || t.includes('assisted') || t.includes('easy')) updates.difficultyScaling = 'Assisted / Guided';
    }
    
    if (currentAutoSettings.project) {
      if (t.includes('portfolio') || t.includes('showcase')) updates.projectTarget = 'Portfolio Project';
      else if (t.includes('industry') || t.includes('enterprise')) updates.projectTarget = 'Industry Lab';
      else if (t.includes('proof of concept') || t.includes('prototype') || t.includes('poc')) updates.projectTarget = 'Proof of Concept';
      else if (t.includes('pure theory') || t.includes('no project')) updates.projectTarget = 'None (Pure Theory)';
    }
    
    return updates;
  };

  const handleCustomGoalSubmit = (goalText: string) => {
    if (!goalText || !goalText.trim()) return;

    setActiveSuggestionType(null);
    setSuggestionSearchQuery('');

    const userMsgId = 'user-' + Date.now();
    const modelMsgId = 'model-' + Date.now();

    const isCommand = goalText.startsWith('/');
    if (isCommand) {
      const parts = goalText.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1).join(' ');

      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: 'user', text: goalText }
      ]);

      if (cmd === '/compile') {
        if (args) {
          setSelectedGoal(args);
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(args), 100);
        } else if (selectedGoal) {
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(), 100);
        } else {
          setMessages(prev => [
            ...prev,
            { id: modelMsgId, role: 'model', text: "Please specify a goal to compile, e.g., `/compile Machine Learning`" }
          ]);
        }
      } else if (cmd === '/refine') {
        if (!compiledPath) {
          setMessages(prev => [
            ...prev,
            { id: modelMsgId, role: 'model', text: "No active syllabus compiled yet. Please compile a path first before refining." }
          ]);
        } else {
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(args || "Refine curriculum blueprint"), 100);
        }
      } else if (cmd === '/test') {
        setFormData(prev => ({ ...prev, goal: '' }));
        setWorkspaceTab('terminal');
        setRightPaneState('compiling');

        setTerminalHistory(prev => {
          const clean = prev.slice(0, prev.length - 1);
          return [
            ...clean,
            'lokeshgandreddy@MacBook-Pro Vidhyalaya % npm run test',
            `[${new Date().toLocaleTimeString()}] Starting diagnostic quiz...`,
          ];
        });

        let logSteps = [
          '● Releasing quizzer subagent...',
          '● Generating skills diagnostic questions...',
          'Question 1: What is the primary difference between a system process and a thread?',
          '  [A] Threads share memory space; processes do not',
          '  [B] Processes are lighter than threads',
          '  [C] Processes share file handles',
          '  [D] None of the above',
          'Ready to test. Answer in the chat window!'
        ];
        let currentLogIndex = 0;
        const logInterval = setInterval(() => {
          if (currentLogIndex < logSteps.length) {
            setTerminalHistory(prev => [...prev, logSteps[currentLogIndex]]);
            currentLogIndex++;
          } else {
            clearInterval(logInterval);
            setTerminalHistory(prev => [...prev, 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ']);
            setRightPaneState('completed');
          }
        }, 250);

        setMessages(prev => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: "I have initialized a skills diagnostics terminal in the right pane. Let me know your answers directly in the chat window."
          }
        ]);
      } else if (cmd === '/code') {
        setFormData(prev => ({ ...prev, goal: '' }));
        setWorkspaceTab('blueprint');
        setMessages(prev => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: "I have opened the Blueprint Studio in the right pane. You can inspect the system prompts and parameters there."
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { id: modelMsgId, role: 'model', text: `Unknown command: ${cmd}. Supported commands are: /compile, /refine, /test, /code` }
        ]);
      }
      return;
    }

    // Add user message to history to trigger the transition to chat layout
    const newUserMsg: ChatMessage = { id: userMsgId, role: 'user', text: goalText };
    setMessages(prev => [...prev, newUserMsg]);
    setFormData(prev => ({ ...prev, goal: '' }));
    setIsSaraTyping(true);
    setError(null);

    // Call SARA via chatWithTutor - cast local messages to include timestamp for compatibility
    const historyForSara = messages.map(m => ({ ...m, timestamp: Date.now() }));
    chatWithTutor(historyForSara as any, goalText, ONBOARDING_CONTEXT)
      .then((result) => {
        setIsSaraTyping(false);
        // Detect a goal selection via result.target (SARA sets this when she identifies a study topic)
        const isGoalSet = Boolean(result.target && result.target.trim().length > 0);
        const targetGoal = result.target?.trim() || '';

        if (isGoalSet && targetGoal) {
          setSelectedGoal(targetGoal);
          setConversationStage('ground');
        }

        // If a constraint is added or selectedGoal is already active, we append it to custom directives
        if (selectedGoal && !isGoalSet) {
          setCustomPromptDirectives(prev => prev ? `${prev}\n- ${goalText}` : `- ${goalText}`);
        }

        // Dynamically update parameters from SARA metadata or text scan if in Auto mode
        const saraParams = (result as any).parameters;
        const keywordParams = scanMessageForParameters(goalText + ' ' + (result.text || ''), autoParameters);

        setFormData(prev => {
          const next = { ...prev };
          const getVal = (key: string, metaVal: any, kwVal: any) => {
            if (!autoParameters[key]) return next[key as keyof typeof next];
            if (metaVal !== undefined && metaVal !== null) return metaVal;
            if (kwVal !== undefined && kwVal !== null) return kwVal;
            return next[key as keyof typeof next];
          };

          next.depth = getVal('depth', saraParams?.depth, keywordParams.depth) as any;
          next.proficiency = getVal('level', saraParams?.proficiency || saraParams?.level, keywordParams.proficiency) as any;
          next.motivation = getVal('for', saraParams?.motivation || saraParams?.for, keywordParams.motivation) as any;
          next.cognitiveProfile = getVal('profile', saraParams?.cognitiveProfile || saraParams?.profile, keywordParams.cognitiveProfile) as any;
          next.tutorPersona = getVal('persona', saraParams?.tutorPersona || saraParams?.persona, keywordParams.tutorPersona) as any;
          next.assessmentStyle = getVal('assessments', saraParams?.assessmentStyle || saraParams?.assessments, keywordParams.assessmentStyle) as any;
          next.primaryMedia = getVal('media', saraParams?.primaryMedia || saraParams?.media, keywordParams.primaryMedia) as any;
          next.language = getVal('language', saraParams?.language, keywordParams.language) as any;
          next.pacing = getVal('pacing', saraParams?.pacing, keywordParams.pacing) as any;
          next.difficultyScaling = getVal('difficulty', saraParams?.difficultyScaling || saraParams?.difficulty, keywordParams.difficultyScaling) as any;
          next.projectTarget = getVal('project', saraParams?.projectTarget || saraParams?.project, keywordParams.projectTarget) as any;

           if (saraParams?.track) {
            next.track = saraParams.track;
          }

          if (autoParameters.timeline) {
            const timelineStr = saraParams?.timeline || keywordParams.timeline;
            if (timelineStr) {
              const daysMatch = timelineStr.match(/(\d+)\s*d/);
              const minsMatch = timelineStr.match(/at\s*(\d+)\s*m/);
              if (daysMatch) next.durationDays = parseInt(daysMatch[1]);
              if (minsMatch) next.dailyCommitment = parseInt(minsMatch[1]);
            }
          }

          return next;
        });

        const newModelMsg: ChatMessage = {
          id: modelMsgId,
          role: 'model',
          text: result.text || '',
          type: 'text',
          timestamp: Date.now(),
          mode: result.mode,
          intent: result.intent,
          action: result.action,
          target: result.target,
          skill_update: result.skill_update,
          interactive_block: result.interactive_block,
        };

        setMessages(prev => [...prev, newModelMsg]);
      })
      .catch((err: any) => {
        setIsSaraTyping(false);
        const errorMsg = err?.message || '';
        let saraErrorText = '';
        if (errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unavailable') || errorMsg.includes('GEMINI_API_KEY')) {
          saraErrorText = `> 🔑 **Couldn't connect to the AI engine.** The current model needs an API key.\n\n**Fix it:** Click the **⚡ model chip** below and switch to a different provider/model, or go to **Settings → Custom Keys** to update your keys.`;
        } else if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('exhausted')) {
          saraErrorText = `> 🔴 **Rate limit hit.** The current model has reached its quota.\n\n**Fix it:** Click the **⚡ model chip** below and choose a different model.`;
        } else if (errorMsg.includes('timeout') || errorMsg.includes('AI_TIMEOUT')) {
          saraErrorText = `> ⏱️ **Response timed out.** The model is slow right now.\n\n**Try:** Switch to a different model (like **Gemini 1.5 Flash**) using the engine selector below.`;
        } else {
          saraErrorText = `> ⚠️ **I hit an issue with the current model.**\n\n**Suggestion:** Click the **⚡ model chip** below and select a different model.`;
        }
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model' as const,
          text: saraErrorText,
          type: 'text' as const,
        }]);
      });
  };

  const handleBuild = async (customPromptFeedback?: string) => {
    const fallbackGoal = [...messages].reverse().find(m => m.role === 'user')?.text || '';
    const activeGoal = selectedGoal || formData.goal || fallbackGoal;
    if (!activeGoal) return setError('Please specify a goal first.');
    if (isSelectedModelKeyMissing()) {
      toast.info('Using system Gemini fallback key (developer sandbox)');
    }
    setLoading(true); setError(null);
    setRightPaneState('compiling');
    setWorkspaceTab('terminal');
    setTerminalHistory(prev => {
      const clean = prev.slice(0, prev.length - 1);
      return [
        ...clean,
        `lokeshgandreddy@MacBook-Pro Vidhyalaya % npx sara compile --goal="${activeGoal}" --depth=${formData.depth} --scout=${webScoutActive}`,
        `[${new Date().toLocaleTimeString()}] ● Starting compilation pipeline...`,
      ];
    });

    const logSteps = [
      'Releasing Cortex Compiler Agent...',
      webScoutActive ? 'Releasing WebScout subagent...' : null,
      webScoutActive ? 'WebScout: Scouting live docs & references...' : null,
      'Releasing CurriculumSynthesizer subagent...',
      'Cortex: Synthesizing phases and weekly layout...',
      'SARA: Formatting dependency modules...',
      'Compiler: Linking recommended resources...'
    ].filter(Boolean) as string[];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logSteps.length) {
        setTerminalHistory(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logSteps[currentLogIndex]}`]);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 400);

    try {
      let scoutedText = '';
      if (webScoutActive) {
        const results = await scoutWebForResourcesJSON(activeGoal);
        if (Array.isArray(results) && results.length > 0) {
          scoutedText = results.map(r => `[${r.type?.toUpperCase() || 'URL'}] ${r.title} — ${r.url}\nRelevance: ${r.snippet}`).join('\n\n');
        }
      }

      const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const fileAttachments: FileAttachment[] = uploadedFiles.filter(f => f.attachment).map(f => f.attachment!);

      const compiledResources = [
        formData.resources,
        scoutedText ? `--- AI Web Search Grounding ---\n${scoutedText}` : ''
      ].filter(Boolean).join('\n\n');

      let compilationInstructions = customPromptText || getCompiledPrompt();
      if (customPromptFeedback && compiledPath && Array.isArray(compiledPath.phases)) {
        compilationInstructions += `\n\n--- REFINEMENT INSTRUCTIONS ---\nUser request: "${customPromptFeedback}"\nPrevious outline to modify: ${JSON.stringify(compiledPath.phases.map((p: any) => ({
          title: p?.title || '',
          modules: (Array.isArray(p?.modules) ? p.modules : []).map((m: any) => ({ title: m?.title || '', description: m?.description || '', estimatedMinutes: m?.estimatedMinutes || 30 }))
        })))}`;
      }

      const planData: any = await generateLearningPlan(
        compilationInstructions,
        compiledResources, formData.dailyCommitment, formData.proficiency, '',
        targetDate.toISOString().split('T')[0], formData.depth,
        fileAttachments.length > 0 ? fileAttachments : undefined,
        { mode: 'full', timeoutMs: (formData.depth === 'Advanced' || formData.depth === 'Mastery / Deep-Dive' || formData.depth === 'Academic & Research') ? 90_000 : 70_000 },
      );

      const phasesWithIds = (Array.isArray(planData?.phases) ? planData.phases : [])
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => ({
          ...p,
          id: p.id || generateSimpleId(),
          modules: (Array.isArray(p.modules) ? p.modules : [])
            .filter((m: any) => m && typeof m === 'object')
            .map((m: any) => ({
              ...m,
              id: m.id || generateSimpleId()
            })),
        }));

      const newPath: any = {
        id: generateSimpleId(),
        userId: userProfile?.userId || 'default-user',
        title: planData?.title || activeGoal,
        goal: activeGoal,
        createdAt: new Date().toISOString(),
        status: 'active',
        progress: 0,
        dailyCommitmentMinutes: formData.dailyCommitment,
        studyLens: 'roadmap',
        scholarPersona: 'visionary',
        cognitiveDensity: 'overview',
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id,
          title: p.title || `Phase ${i + 1}`,
          description: p.description || '',
          order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id,
            title: m.title || 'Untitled Module',
            description: m.description || '',
            estimatedMinutes: Number(m.estimatedMinutes) || 30,
            isCompleted: false,
            keyConcepts: Array.isArray(m.keyConcepts) ? m.keyConcepts : [],
            resources: (Array.isArray(m.suggestedResources) ? m.suggestedResources : [])
              .filter((sr: any) => sr && typeof sr === 'object' && typeof sr.url === 'string')
              .map((sr: any) => {
                const url = sr.url.toLowerCase();
                const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                let resType: 'url' | 'text' | 'pdf' | 'video' | 'youtube' | 'pdf_link' | 'article' = 'url';
                let rawTitle = sr.title || 'Untitled Resource';
                let videoId = undefined;
                
                if (isYoutube) {
                  resType = 'youtube';
                  videoId = sr.url.includes('v=') ? sr.url.split('v=')[1]?.split('&')[0] : sr.url.split('/').pop();
                } else if (url.includes('github.com')) {
                  resType = 'article';
                  if (!rawTitle.startsWith('[GitHub]')) rawTitle = `[GitHub] ${rawTitle}`;
                } else if (url.includes('arxiv.org') || url.endsWith('.pdf')) {
                  resType = 'pdf_link';
                  if (!rawTitle.startsWith('[Paper]')) rawTitle = `[Paper] ${rawTitle}`;
                } else if (url.includes('stackblitz.com') || url.includes('codesandbox.io') || url.includes('replit.com') || url.includes('jsfiddle.net')) {
                  resType = 'url';
                  if (!rawTitle.startsWith('[Sandbox]')) rawTitle = `[Sandbox] ${rawTitle}`;
                } else if (url.includes('stackoverflow.com') || url.includes('reddit.com')) {
                  resType = 'url';
                  if (!rawTitle.startsWith('[Q&A]')) rawTitle = `[Q&A] ${rawTitle}`;
                } else if (url.includes('dev.to') || url.includes('hashnode') || url.includes('medium.com') || url.includes('news.ycombinator.com')) {
                  resType = 'article';
                  if (!rawTitle.startsWith('[Community]')) rawTitle = `[Community] ${rawTitle}`;
                } else {
                  resType = 'url';
                }
                
                return {
                  id: generateSimpleId(),
                  type: resType,
                  content: sr.url,
                  title: rawTitle,
                  videoId
                };
              }),
            dependsOnModuleIds: [],
            userNotes: '',
          })),
        })),
        sessions: [],
        preferredStartTime: formData.preferredStartTime,
      };

      clearInterval(logInterval);
      setTerminalHistory(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SARA: Curriculum compiled successfully!`,
        `[${new Date().toLocaleTimeString()}] Cortex: Releasing final blueprint context...`,
        'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
      ]);

      await new Promise(r => setTimeout(r, 500));

      setCompiledPath(newPath);
      setRightPaneState('completed');
      setWorkspaceTab('blueprint');
      setShowPromptEditorPanel(false);

      // Inject compiled path as an editable JSON file in the mock editor
      setEditorFiles(prev => {
        const hasSyllabus = prev.some(f => f.name === 'syllabus.json');
        const syllabusFile = {
          name: 'syllabus.json',
          path: 'src/syllabus.json',
          language: 'json',
          content: JSON.stringify(newPath, null, 2)
        };
        if (hasSyllabus) {
          return prev.map(f => f.name === 'syllabus.json' ? syllabusFile : f);
        }
        return [...prev, syllabusFile];
      });

      const confirmMsgId = 'confirm-' + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: confirmMsgId,
          role: 'model',
          text: customPromptFeedback
            ? `I have successfully updated the learning path syllabus based on your feedback: "${customPromptFeedback}". You can inspect and edit the revised modules directly in the **Blueprint Studio** tab.`
            : `Path generated! I've released the SARA curriculum architect and loaded the modules in the **Blueprint Studio** tab on the right. You can customize the module titles, durations, or add concepts inline, then click **Approve Blueprint & Launch Academy** when ready!`,
          type: 'text'
        }
      ]);
    } catch (err: any) {
      clearInterval(logInterval);
      setError(err.message || 'Compiler failed.');
      setTerminalHistory(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err.message || 'Compiler failed.'}`,
        'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
      ]);
      setRightPaneState('idle');
    } finally {
      setLoading(false);
    }
  };

  const suggestionCards = [
    { title: 'Fullstack Systems', subtitle: 'React, Node, DBs', icon: <LayoutIcon size={14} />, goal: 'Fullstack Web Specialist', accentColor: '#3b82f6', iconBg: 'text-blue-700 bg-blue-50 border-blue-200/50', },
    { title: 'AI & Machine Learning', subtitle: 'Neural Networks, LLMs', icon: <Zap size={14} />, goal: 'AI & Machine Learning Engineer', accentColor: '#e11d48', iconBg: 'text-rose-700 bg-rose-50 border-rose-200/50', },
    { title: 'Corporate Finance', subtitle: 'Valuation, Stocks, Capital', icon: <TrendingUp size={14} />, goal: 'Corporate Finance Specialist', accentColor: '#d97706', iconBg: 'text-amber-700 bg-amber-50 border-amber-200/50', },
    { title: 'Human Anatomy', subtitle: 'Muscles, Organs, Systems', icon: <Heart size={14} />, goal: 'Human Anatomy Mastery', accentColor: '#059669', iconBg: 'text-emerald-700 bg-emerald-50 border-emerald-200/50', },
    { title: 'Creative Writing', subtitle: 'Novels, Storytelling, Plot', icon: <BookOpen size={14} />, goal: 'Creative Fiction Author', accentColor: '#7c3aed', iconBg: 'text-purple-700 bg-purple-50 border-purple-200/50', },
    { title: 'Mindset & Motivation', subtitle: 'Habits, Focus, Grit', icon: <Target size={14} />, goal: 'Peak Performance Mastery', accentColor: '#ec4899', iconBg: 'text-pink-700 bg-pink-50 border-pink-200/50', },
  ];

  const isLanding = messages.length === 0;

  return (
    <div className={`flex h-full w-full antialiased text-white select-text overflow-hidden ${isLanding ? 'bg-[#0b0c0e]' : 'bg-[#1c1c1c]'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-root { display: none !important; }
        body { background-color: ${isLanding ? '#0b0c0e' : '#1c1c1c'} !important; }
        aside { 
          background-color: #0b0c0e !important; 
          border-right: 1px solid rgba(255,255,255,0.08) !important;
          transition: background-color 0.2s, border-right 0.2s, box-shadow 0.2s !important;
        }
        html[data-sidebar-collapsed="true"] aside {
          border-right: none !important;
          box-shadow: none !important;
        }
        html[data-sidebar-collapsed="false"] aside {
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.35) !important;
        }
        main { background-color: ${isLanding ? '#0b0c0e' : '#1c1c1c'} !important; }
        @keyframes cortex-orbit-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cortex-orbit-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes cortex-center-glow {
          0%, 100% { transform: scale(1); opacity: 0.8; filter: drop-shadow(0 0 1px rgba(99,102,241,0.25)); }
          50% { transform: scale(1.22); opacity: 1; filter: drop-shadow(0 0 6px rgba(99,102,241,0.8)); }
        }
        .cortex-animate-spin-slow {
          animation: cortex-orbit-spin 25s linear infinite;
          transform-origin: center;
        }
        .cortex-animate-spin-reverse {
          animation: cortex-orbit-spin 18s linear infinite reverse;
          transform-origin: center;
        }
        .cortex-animate-pulse-slow {
          animation: cortex-orbit-pulse 3s ease-in-out infinite;
          transform-origin: center;
        }
        .cortex-animate-center-glow {
          animation: cortex-center-glow 2.2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes cortex-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cortex-typing-dot {
          animation: cortex-bounce 1.2s ease-in-out infinite;
        }
        .cortex-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .cortex-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cortex-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}} />

      {messages.length === 0 ? (
        <div className="w-full max-w-[620px] mx-auto px-4 flex-1 flex flex-col items-center justify-center min-h-[85vh] h-full gap-6 select-none relative">
          {isSidebarCollapsed && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
              }}
              className="fixed top-4.5 left-4.5 z-[110] p-2 rounded-xl text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none shadow-lg border border-white/[0.08] bg-[#181818]/90 backdrop-blur-md hover:bg-white/10 cursor-pointer flex items-center justify-center"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={16} strokeWidth={2.5} />
            </button>
          )}
          {/* Hero heading */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4e5bff] to-[#7c3aed] flex items-center justify-center mx-auto mb-4 shadow-[0_0_28px_rgba(78,91,255,0.35)]">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                className={`text-white transition-all duration-500 w-[20px] h-[20px] ${
                  isSaraTyping ? 'cortex-animate-spin-slow' : ''
                }`}
              >
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  strokeDasharray="3 3" 
                  className={`opacity-40 origin-center ${isSaraTyping ? 'cortex-animate-spin-reverse' : ''}`} 
                />
                <path 
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" 
                  className={`opacity-90 origin-center ${isSaraTyping ? 'cortex-animate-pulse-slow' : ''}`} 
                />
                <path 
                  d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" 
                  className={`opacity-90 origin-center ${isSaraTyping ? 'cortex-animate-pulse-slow' : ''}`} 
                />
                <circle 
                  cx="12" 
                  cy="12" 
                  r="2.2" 
                  className={`fill-white stroke-none origin-center ${isSaraTyping ? 'cortex-animate-center-glow' : ''}`} 
                />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">How can I help you learn today?</h1>
            <p className="text-[13px] text-white/35 mt-1.5 font-medium">Ask anything — concepts, code, career, roadmaps.</p>
          </motion.div>

          {/* Claude-style input area */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="relative w-full"
          >
            <AnimatePresence>
              {showSettingsPopover && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-3 left-0 right-0 rounded-2xl p-4 bg-[#1e1e1e] backdrop-blur-2xl border border-white/[0.09] text-white shadow-2xl z-50 flex flex-col gap-2.5 max-w-[800px] mx-auto"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-white/50">
                      <Sparkles size={11} className="text-[#4e5bff]" />
                      Compiler Options
                    </span>
                    <button onClick={() => setShowSettingsPopover(false)} className="p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                      {/* Column 1: Schedule & Target */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400">Schedule & Target</span>
                        </div>
                        <PopoverGridSelector 
                          label="Depth" 
                          value={formData.depth} 
                          options={['Foundational', 'Advanced', 'Expert', 'Mastery / Deep-Dive', 'Academic & Research']} 
                          onChange={v => {
                            setFormData({ ...formData, depth: v as any });
                            setAutoParameters(prev => ({ ...prev, depth: false }));
                          }} 
                          isAuto={autoParameters.depth}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, depth: !prev.depth }))}
                        />
                        <PopoverGridSelector 
                          label="Timeline" 
                          value={`${formData.durationDays}d at ${formData.dailyCommitment}m/day`} 
                          options={['14d at 30m/day', '30d at 45m/day', '60d at 60m/day', '90d at 90m/day']} 
                          onChange={v => { 
                            const days = parseInt(v.split('d')[0]); 
                            const mins = parseInt(v.split('at ')[1].split('m')[0]); 
                            setFormData({ ...formData, durationDays: days, dailyCommitment: mins }); 
                            setAutoParameters(prev => ({ ...prev, timeline: false }));
                          }} 
                          isAuto={autoParameters.timeline}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, timeline: !prev.timeline }))}
                        />
                        <PopoverGridSelector 
                          label="Level" 
                          value={formData.proficiency} 
                          options={['Novice', 'Beginner', 'Competent', 'Expert']} 
                          onChange={v => {
                            setFormData({ ...formData, proficiency: v });
                            setAutoParameters(prev => ({ ...prev, level: false }));
                          }} 
                          isAuto={autoParameters.level}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, level: !prev.level }))}
                        />
                        <PopoverGridSelector 
                          label="For" 
                          value={formData.motivation} 
                          options={['Career', 'Project', 'Academic', 'Hobby']} 
                          onChange={v => {
                            setFormData({ ...formData, motivation: v });
                            setAutoParameters(prev => ({ ...prev, for: false }));
                          }} 
                          isAuto={autoParameters.for}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, for: !prev.for }))}
                        />
                      </div>

                      {/* Column 2: Cognitive & Tutor */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-400">Cognitive & Tutor</span>
                        </div>
                        <PopoverGridSelector 
                          label="Profile" 
                          value={formData.cognitiveProfile} 
                          options={['Practical Dev-First', 'Visual & Conceptual', 'Theoretical & Derivations', 'Dialectic Active Recall']} 
                          onChange={v => {
                            setFormData({ ...formData, cognitiveProfile: v as any });
                            setAutoParameters(prev => ({ ...prev, profile: false }));
                          }} 
                          isAuto={autoParameters.profile}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, profile: !prev.profile }))}
                        />
                        <PopoverGridSelector 
                          label="Persona" 
                          value={formData.tutorPersona} 
                          options={['Silicon Valley Tech Lead', 'Rigorous Scholar', 'Socratic Mentor', 'Interactive Partner']} 
                          onChange={v => {
                            setFormData({ ...formData, tutorPersona: v as any });
                            setAutoParameters(prev => ({ ...prev, persona: false }));
                          }} 
                          isAuto={autoParameters.persona}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, persona: !prev.persona }))}
                        />
                        <PopoverGridSelector 
                          label="Assessments" 
                          value={formData.assessmentStyle} 
                          options={['Sprint Diagnostics', 'Project Blueprint', 'Comprehensive Review', 'Read Only (Zen)']} 
                          onChange={v => {
                            setFormData({ ...formData, assessmentStyle: v as any });
                            setAutoParameters(prev => ({ ...prev, assessments: false }));
                          }} 
                          isAuto={autoParameters.assessments}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, assessments: !prev.assessments }))}
                        />
                        <PopoverGridSelector 
                          label="Media Focus" 
                          value={formData.primaryMedia} 
                          options={['Mixed Scout', 'Written-first Papers', 'Interactive Video Notes']} 
                          onChange={v => {
                            setFormData({ ...formData, primaryMedia: v as any });
                            setAutoParameters(prev => ({ ...prev, media: false }));
                          }} 
                          isAuto={autoParameters.media}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, media: !prev.media }))}
                        />
                      </div>

                      {/* Column 3: Advanced Preferences */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-pink-400">Advanced (Optional)</span>
                        </div>
                        <PopoverGridSelector 
                          label="Study Language" 
                          value={formData.language} 
                          options={['English', 'Spanish', 'Hindi', 'German', 'French', 'Telugu', 'Tamil', 'Japanese', 'Chinese']} 
                          onChange={v => {
                            setFormData({ ...formData, language: v });
                            setAutoParameters(prev => ({ ...prev, language: false }));
                          }} 
                          isAuto={autoParameters.language}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, language: !prev.language }))}
                        />
                        <PopoverGridSelector 
                          label="Pacing Mode" 
                          value={formData.pacing} 
                          options={['Adaptive', 'Linear', 'Accelerated', 'Spaced Repetition']} 
                          onChange={v => {
                            setFormData({ ...formData, pacing: v });
                            setAutoParameters(prev => ({ ...prev, pacing: false }));
                          }} 
                          isAuto={autoParameters.pacing}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, pacing: !prev.pacing }))}
                        />
                        <PopoverGridSelector 
                          label="Difficulty Scaling" 
                          value={formData.difficultyScaling} 
                          options={['Dynamic Auto-scaling', 'Fixed Standard', 'Assisted / Guided']} 
                          onChange={v => {
                            setFormData({ ...formData, difficultyScaling: v });
                            setAutoParameters(prev => ({ ...prev, difficulty: false }));
                          }} 
                          isAuto={autoParameters.difficulty}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, difficulty: !prev.difficulty }))}
                        />
                        <PopoverGridSelector 
                          label="Project Target" 
                          value={formData.projectTarget} 
                          options={['Portfolio Project', 'Industry Lab', 'Proof of Concept', 'None (Pure Theory)']} 
                          onChange={v => {
                            setFormData({ ...formData, projectTarget: v });
                            setAutoParameters(prev => ({ ...prev, project: false }));
                          }} 
                          isAuto={autoParameters.project}
                          onToggleAuto={() => setAutoParameters(prev => ({ ...prev, project: !prev.project }))}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeSuggestionType && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.99 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full mb-3 left-0 right-0 bg-[#1e1e1e] border border-white/[0.08] rounded-2xl shadow-2xl p-1 z-35 flex flex-col max-h-[220px] overflow-y-auto"
                >
                  <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-white/30 uppercase border-b border-white/[0.04] mb-1">
                    {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                  </div>
                  {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                    .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                    .map((item) => (
                      <button
                        key={item.trigger}
                        onClick={() => handleSelectSuggestion(item.trigger)}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] text-left transition-colors cursor-pointer border-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/50">
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-[11.5px] font-bold text-white">{item.trigger}</div>
                            <div className="text-[9.5px] font-medium text-white/40">{item.label}</div>
                          </div>
                        </div>
                        <span className="text-[9.5px] text-white/20 font-mono pr-1">{item.desc}</span>
                      </button>
                    ))}
                  {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                    .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                    <div className="p-3 text-center text-white/30 text-[11px] font-mono">No matching suggestions</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Claude-style input box */}
            <div className="w-full bg-[#161616] border border-white/[0.09] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition-all duration-300 focus-within:border-[#4e5bff]/40 focus-within:shadow-[0_8px_40px_rgba(78,91,255,0.12)] flex flex-col">
              {/* Context tags row */}
              {attachedContexts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                  {attachedContexts.map(ctx => (
                    <span
                      key={ctx}
                      className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>{ctx}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedContexts(prev => prev.filter(c => c !== ctx));
                          if (ctx === '@web') setWebScoutActive(false);
                        }}
                        className="hover:text-indigo-200 cursor-pointer p-0 bg-transparent border-none font-bold leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Textarea */}
              <div className="px-4 pt-3.5 pb-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={formData.goal}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder="Ask me anything — concepts, code, career, roadmaps..."
                  className="w-full bg-transparent border-none outline-none text-white text-[14px] placeholder:text-white/25 py-0 font-sans font-medium resize-none overflow-hidden leading-relaxed"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        // Allow newline
                      } else {
                        e.preventDefault();
                        if (formData.goal.trim()) {
                          handleCustomGoalSubmit(formData.goal);
                        }
                      }
                    }
                  }}
                />
              </div>
              {/* Toolbar row */}
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] cursor-pointer transition-all ${
                      uploadedFiles.length > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-white/35 hover:text-white hover:bg-white/[0.06]'
                    }`}
                    title="Attach file"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                  <ModelSelector
                    byokMode={byokMode}
                    byokConfig={byokConfig}
                    onSelect={handleModelSelectChange}
                    variant="dark"
                    compact={true}
                    dropdownPosition="top"
                  />
                  <button
                    onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      showSettingsPopover ? 'bg-white/10 text-white border border-white/15' : 'text-white/35 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    ⚙️ {formData.depth}
                  </button>
                </div>
                {/* Right side container with mic and send button */}
                <div className="flex items-center gap-3 pr-1">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`transition-all cursor-pointer flex items-center justify-center ${
                      isListening
                        ? 'text-rose-500 animate-pulse scale-110'
                        : 'text-white/40 hover:text-white/90 hover:scale-105 active:scale-95'
                    }`}
                    title={isListening ? "Stop dictating" : "Dictate (Speech-to-Text)"}
                  >
                    {isListening ? <MicOff size={16} strokeWidth={2.2} /> : <Mic size={16} strokeWidth={2.2} />}
                  </button>
                  <motion.button
                    onClick={() => formData.goal.trim() && handleCustomGoalSubmit(formData.goal)}
                    disabled={!formData.goal?.trim()}
                    whileHover={{ scale: formData.goal?.trim() ? 1.05 : 1 }}
                    whileTap={{ scale: formData.goal?.trim() ? 0.93 : 1 }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      formData.goal?.trim()
                        ? 'bg-gradient-to-br from-[#4e5bff] to-[#6b21a8] text-white shadow-[0_4px_16px_rgba(78,91,255,0.4)]'
                        : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp size={14} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick-start chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {[
              { label: 'Plan a roadmap', icon: '🗺️' },
              { label: 'Explain a concept', icon: '💡' },
              { label: 'Debug my code', icon: '🐛' },
              { label: 'Career advice', icon: '🚀' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleCustomGoalSubmit(chip.label)}
                className="px-3.5 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 text-white/50 hover:text-white text-[11.5px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="flex h-full w-full overflow-hidden">
          {/* LEFT: Chat Panel */}
          <div
            className="shrink-0 border-r border-white/[0.05] bg-[#111111] flex flex-col h-full relative transition-all duration-300 ease-in-out"
            style={{ width: isWorkspaceCollapsed ? '100%' : '50%' }}
          >
            {/* Chat Header */}
            <div className="cortex-chat-header flex items-center justify-between border-b border-white/[0.05] px-5 py-3 shrink-0 select-none transition-all duration-300">
              <div className="flex items-center gap-2.5">
                {isSidebarCollapsed && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
                    }}
                    className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/45 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 mr-0.5"
                    title="Expand Sidebar"
                  >
                    <PanelLeftOpen size={14} strokeWidth={2.2} />
                  </button>
                )}
                <div className="relative">
                  <CortexLogo size="md" animate={isSaraTyping} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111111]" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-white leading-tight">
                    {selectedGoal ? selectedGoal.substring(0, 28) + (selectedGoal.length > 28 ? '...' : '') : 'General Chat'}
                  </div>
                  <div className="text-[9.5px] text-white/35 font-medium flex items-center gap-1">
                    <span>Cortex · {getActiveModelName()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                  conversationStage === 'greet' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  conversationStage === 'ground' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {conversationStage}
                </span>

                <button
                  onClick={() => setIsWorkspaceCollapsed(!isWorkspaceCollapsed)}
                  className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer flex items-center justify-center"
                  title={isWorkspaceCollapsed ? "Show Workspace Studio" : "Collapse Workspace Studio"}
                >
                  {isWorkspaceCollapsed ? (
                    <PanelRightOpen size={14} className="text-[#4e5bff]" />
                  ) : (
                    <PanelRightClose size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar min-h-0">
              <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
              {(() => {
                const latestGroundingMsg = [...messages].reverse().find(m => m.type === 'grounding');
                const latestGroundingId = latestGroundingMsg?.id;

                return (
                  <>
                    {messages.map((msg, idx) => {
                      const isModel = msg.role === 'model';
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut', delay: idx === messages.length - 1 ? 0 : 0 }}
                          className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                        >
                          {!isModel ? (
                            /* User bubble */
                            <div className="group max-w-[82%]">
                              <div className="bg-[#1e1e24] border border-white/[0.07] rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] text-white font-medium shadow-sm leading-relaxed">
                                {msg.text}
                              </div>
                            </div>
                          ) : (
                            /* AI response */
                            <div className="w-full flex flex-col gap-0">
                              {/* Avatar row */}
                              <div className="flex items-center gap-2 mb-2.5">
                                <CortexLogo size="sm" animate={isSaraTyping && idx === messages.length - 1} />
                                <span className="text-[10.5px] font-semibold text-white/40">Cortex</span>
                              </div>
                              {/* Content */}
                              <div className="pl-7 font-sans font-medium text-[13px] text-white/88 leading-[1.7]">
                                <TypewriterMarkdown
                                  text={msg.text}
                                  msgId={msg.id}
                                  isLatest={idx === messages.length - 1 && msg.role === 'model'}
                                  components={ChatMarkdownComponents}
                                />

                                {isWorkspaceCollapsed && 
                                 (msg.text.toLowerCase().includes('blueprint') || 
                                  msg.text.toLowerCase().includes('roadmap') || 
                                  msg.text.toLowerCase().includes('modules') || 
                                  msg.text.toLowerCase().includes('studio')) && (
                                  <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-[#8b98ff] font-sans flex items-center gap-2 w-fit select-none animate-pulse">
                                    <span className="text-[12px]">💡</span>
                                    <span>Workspace is collapsed. Click the sidebar icon <PanelRightOpen size={11} className="inline-block align-text-bottom text-[#4e5bff]" /> in the header to view Blueprint Studio!</span>
                                  </div>
                                )}

                                {/* ─── SARA Interactive Blocks ─── */}
                                {msg.interactive_block && (
                                  <div className="mt-3 select-none">
                                    {msg.interactive_block.type === 'quick_choices' && Array.isArray(msg.interactive_block.data) && (
                                      <div className="flex flex-wrap gap-2 pt-1.5">
                                        {msg.interactive_block.data.map((choice: string, choiceIdx: number) => (
                                          <button
                                            key={choiceIdx}
                                            onClick={() => handleCustomGoalSubmit(choice)}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            {choice}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {msg.interactive_block.type === 'inline_challenge' && msg.interactive_block.data && (
                                      <div className="p-4 rounded-xl border bg-white/[0.02] border-white/5">
                                        <div className="text-[12px] font-extrabold mb-3 text-white">
                                          🧠 Quick Quiz: {msg.interactive_block.data.question}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          {Array.isArray(msg.interactive_block.data.options) && msg.interactive_block.data.options.map((opt: string, optIdx: number) => (
                                            <button
                                              key={optIdx}
                                              onClick={() => handleCustomGoalSubmit(`Answer: ${opt}`)}
                                              className="w-full text-left px-3.5 py-2.5 rounded-lg border bg-white/5 border-white/5 text-slate-350 hover:bg-white/10 hover:text-white hover:border-white/20 text-[11px] font-semibold transition-all hover:translate-x-1 duration-150 cursor-pointer"
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Greeting suggestion cards — 2×3 grid */}
                                {msg.type === 'greeting' && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.3 }}
                                    className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-white/[0.05] w-full"
                                  >
                                    {suggestionCards.map((card, idx) => (
                                      <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 + idx * 0.05, duration: 0.25 }}
                                        whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                                        onClick={() => handleSelectTemplate(card)}
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-left transition-colors duration-150 cursor-pointer relative overflow-hidden group"
                                        style={{ borderLeft: `2px solid ${card.accentColor}30` }}
                                      >
                                        <div
                                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0"
                                          style={{ background: `${card.accentColor}15`, color: card.accentColor }}
                                        >
                                          {card.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[11px] font-bold text-white truncate">{card.title}</div>
                                          <div className="text-[9.5px] font-medium text-white/40 truncate mt-0.5">{card.subtitle}</div>
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ background: `linear-gradient(135deg, ${card.accentColor}05, transparent)` }} />
                                      </motion.button>
                                    ))}
                                  </motion.div>
                                )}

                                {/* Grounding panel */}
                                {msg.type === 'grounding' && msg.id === latestGroundingId && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15, duration: 0.3 }}
                                    className="flex flex-col gap-4 mt-4 pt-4 border-t border-white/[0.05] w-full"
                                  >
                                    <div>
                                      <label className="text-[9.5px] font-bold uppercase tracking-wider block mb-1.5 font-mono text-white/35">
                                        Custom Guidelines
                                      </label>
                                      <textarea
                                        value={formData.resources}
                                        onChange={e => setFormData(prev => ({ ...prev, resources: e.target.value }))}
                                        placeholder="Optional guidelines, constraints, focus areas..."
                                        className="w-full h-20 bg-[#161616] border border-white/[0.07] rounded-xl p-3 text-[11.5px] font-medium placeholder:text-white/20 outline-none resize-none focus:border-[#4e5bff]/30 focus:bg-[#1a1a1a] text-white transition-colors"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border text-[11.5px] font-bold cursor-pointer transition-all ${
                                          uploadedFiles.length > 0
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                                            : 'bg-white/[0.03] border-white/[0.07] text-white/70 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                      >
                                        <UploadCloud size={13} />
                                        <span>{uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) attached` : 'Upload Syllabus File'}</span>
                                      </button>
                                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                                      <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleBuild()}
                                        className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-[#4e5bff]/20 to-[#7c3aed]/20 border border-[#4e5bff]/30 text-[#8b98ff] hover:border-[#4e5bff]/50 hover:text-white font-mono text-[11.5px] font-bold cursor-pointer transition-all shadow-[0_2px_16px_rgba(78,91,255,0.1)]"
                                      >
                                        <Zap size={12} fill="currentColor" className="animate-pulse" />
                                        <span>Compile Learning Path</span>
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Typing indicator */}
                    {isSaraTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2"
                      >
                        <CortexLogo size="sm" animate={true} />
                        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3">
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff]/80" />
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff]/80" />
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff]/80" />
                        </div>
                      </motion.div>
                    )}
                  </>
                );
              })()}
              <div ref={chatEndRef} />
              </div>
            </div>
            {/* Bottom Input */}
            <div className="px-4 pb-4 shrink-0 relative z-25">
              <div className="max-w-3xl mx-auto w-full flex flex-col gap-2 relative">
                <AnimatePresence>
                  {showSettingsPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl p-4 bg-[#1e1e1e] border border-white/[0.09] text-white shadow-2xl z-50 flex flex-col gap-2.5 max-w-[800px] mx-auto"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-white/50">
                          <Sparkles size={11} className="text-[#4e5bff]" />
                          Compiler Options
                        </span>
                        <button onClick={() => setShowSettingsPopover(false)} className="p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                          {/* Column 1: Schedule & Target */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400">Schedule & Target</span>
                            </div>
                            <PopoverGridSelector 
                              label="Depth" 
                              value={formData.depth} 
                              options={['Foundational', 'Advanced', 'Expert', 'Mastery / Deep-Dive', 'Academic & Research']} 
                              onChange={v => {
                                setFormData({ ...formData, depth: v as any });
                                setAutoParameters(prev => ({ ...prev, depth: false }));
                              }} 
                              isAuto={autoParameters.depth}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, depth: !prev.depth }))}
                            />
                            <PopoverGridSelector 
                              label="Timeline" 
                              value={`${formData.durationDays}d at ${formData.dailyCommitment}m/day`} 
                              options={['14d at 30m/day', '30d at 45m/day', '60d at 60m/day', '90d at 90m/day']} 
                              onChange={v => { 
                                const days = parseInt(v.split('d')[0]); 
                                const mins = parseInt(v.split('at ')[1].split('m')[0]); 
                                setFormData({ ...formData, durationDays: days, dailyCommitment: mins }); 
                                setAutoParameters(prev => ({ ...prev, timeline: false }));
                              }} 
                              isAuto={autoParameters.timeline}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, timeline: !prev.timeline }))}
                            />
                            <PopoverGridSelector 
                              label="Level" 
                              value={formData.proficiency} 
                              options={['Novice', 'Beginner', 'Competent', 'Expert']} 
                              onChange={v => {
                                setFormData({ ...formData, proficiency: v });
                                setAutoParameters(prev => ({ ...prev, level: false }));
                              }} 
                              isAuto={autoParameters.level}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, level: !prev.level }))}
                            />
                            <PopoverGridSelector 
                              label="For" 
                              value={formData.motivation} 
                              options={['Career', 'Project', 'Academic', 'Hobby']} 
                              onChange={v => {
                                setFormData({ ...formData, motivation: v });
                                setAutoParameters(prev => ({ ...prev, for: false }));
                              }} 
                              isAuto={autoParameters.for}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, for: !prev.for }))}
                            />
                          </div>

                          {/* Column 2: Cognitive & Tutor */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-400">Cognitive & Tutor</span>
                            </div>
                            <PopoverGridSelector 
                              label="Profile" 
                              value={formData.cognitiveProfile} 
                              options={['Practical Dev-First', 'Visual & Conceptual', 'Theoretical & Derivations', 'Dialectic Active Recall']} 
                              onChange={v => {
                                setFormData({ ...formData, cognitiveProfile: v as any });
                                setAutoParameters(prev => ({ ...prev, profile: false }));
                              }} 
                              isAuto={autoParameters.profile}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, profile: !prev.profile }))}
                            />
                            <PopoverGridSelector 
                              label="Persona" 
                              value={formData.tutorPersona} 
                              options={['Silicon Valley Tech Lead', 'Rigorous Scholar', 'Socratic Mentor', 'Interactive Partner']} 
                              onChange={v => {
                                setFormData({ ...formData, tutorPersona: v as any });
                                setAutoParameters(prev => ({ ...prev, persona: false }));
                              }} 
                              isAuto={autoParameters.persona}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, persona: !prev.persona }))}
                            />
                            <PopoverGridSelector 
                              label="Assessments" 
                              value={formData.assessmentStyle} 
                              options={['Sprint Diagnostics', 'Project Blueprint', 'Comprehensive Review', 'Read Only (Zen)']} 
                              onChange={v => {
                                setFormData({ ...formData, assessmentStyle: v as any });
                                setAutoParameters(prev => ({ ...prev, assessments: false }));
                              }} 
                              isAuto={autoParameters.assessments}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, assessments: !prev.assessments }))}
                            />
                            <PopoverGridSelector 
                              label="Media Focus" 
                              value={formData.primaryMedia} 
                              options={['Mixed Scout', 'Written-first Papers', 'Interactive Video Notes']} 
                              onChange={v => {
                                setFormData({ ...formData, primaryMedia: v as any });
                                setAutoParameters(prev => ({ ...prev, media: false }));
                              }} 
                              isAuto={autoParameters.media}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, media: !prev.media }))}
                            />
                          </div>

                          {/* Column 3: Advanced Preferences */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-pink-400">Advanced (Optional)</span>
                            </div>
                            <PopoverGridSelector 
                              label="Study Language" 
                              value={formData.language} 
                              options={['English', 'Spanish', 'Hindi', 'German', 'French', 'Telugu', 'Tamil', 'Japanese', 'Chinese']} 
                              onChange={v => {
                                setFormData({ ...formData, language: v });
                                setAutoParameters(prev => ({ ...prev, language: false }));
                              }} 
                              isAuto={autoParameters.language}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, language: !prev.language }))}
                            />
                            <PopoverGridSelector 
                              label="Pacing Mode" 
                              value={formData.pacing} 
                              options={['Adaptive', 'Linear', 'Accelerated', 'Spaced Repetition']} 
                              onChange={v => {
                                setFormData({ ...formData, pacing: v });
                                setAutoParameters(prev => ({ ...prev, pacing: false }));
                              }} 
                              isAuto={autoParameters.pacing}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, pacing: !prev.pacing }))}
                            />
                            <PopoverGridSelector 
                              label="Difficulty Scaling" 
                              value={formData.difficultyScaling} 
                              options={['Dynamic Auto-scaling', 'Fixed Standard', 'Assisted / Guided']} 
                              onChange={v => {
                                setFormData({ ...formData, difficultyScaling: v });
                                setAutoParameters(prev => ({ ...prev, difficulty: false }));
                              }} 
                              isAuto={autoParameters.difficulty}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, difficulty: !prev.difficulty }))}
                            />
                            <PopoverGridSelector 
                              label="Project Target" 
                              value={formData.projectTarget} 
                              options={['Portfolio Project', 'Industry Lab', 'Proof of Concept', 'None (Pure Theory)']} 
                              onChange={v => {
                                setFormData({ ...formData, projectTarget: v });
                                setAutoParameters(prev => ({ ...prev, project: false }));
                              }} 
                              isAuto={autoParameters.project}
                              onToggleAuto={() => setAutoParameters(prev => ({ ...prev, project: !prev.project }))}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {activeSuggestionType && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.99 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl p-1 bg-[#1e1e1e] border border-white/[0.08] text-white shadow-2xl z-50 flex flex-col max-h-[220px] overflow-y-auto"
                    >
                      <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-white/30 uppercase border-b border-white/[0.04] mb-1">
                        {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                      </div>
                      {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                        .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                        .map((item) => (
                          <button
                            key={item.trigger}
                            onClick={() => handleSelectSuggestion(item.trigger)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/50">
                                {item.icon}
                              </div>
                              <div>
                                <div className="text-[11.5px] font-bold text-white">{item.trigger}</div>
                                <div className="text-[9.5px] font-medium text-white/40">{item.label}</div>
                              </div>
                            </div>
                            <span className="text-[9.5px] text-white/20 font-mono pr-1">{item.desc}</span>
                          </button>
                        ))}
                      {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                        .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                        <div className="p-3 text-center text-white/30 text-[11px] font-mono">No matching suggestions</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Claude-style follow-up input */}
                <div className="bg-[#161616] border border-white/[0.09] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 focus-within:border-[#4e5bff]/40 focus-within:shadow-[0_4px_24px_rgba(78,91,255,0.1)] flex flex-col">
                  {/* Context tags */}
                  {attachedContexts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                      {attachedContexts.map(ctx => (
                        <span
                          key={ctx}
                          className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0"
                        >
                          <span>{ctx}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedContexts(prev => prev.filter(c => c !== ctx));
                                  if (ctx === '@web') setWebScoutActive(false);
                            }}
                            className="hover:text-indigo-200 cursor-pointer p-0 bg-transparent border-none font-bold leading-none"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Textarea */}
                  <div className="px-4 pt-3 pb-2">
                    <textarea
                      ref={followUpTextareaRef}
                      rows={1}
                      value={formData.goal}
                      onChange={e => handleInputChange(e.target.value)}
                      placeholder={compiledPath ? "Refine your learning path..." : "Ask a follow-up..."}
                      className="w-full bg-transparent border-none outline-none text-[13.5px] font-medium text-white placeholder:text-white/25 py-0 font-sans resize-none overflow-hidden leading-relaxed"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (e.shiftKey) {
                            // Allow newline
                          } else {
                            e.preventDefault();
                            if (formData.goal.trim()) {
                              handleCustomGoalSubmit(formData.goal);
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => fileInputRef.current?.click()} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${uploadedFiles.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/35 hover:text-white hover:bg-white/[0.06]'}`} title="Attach file">
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                      <ModelSelector
                        byokMode={byokMode}
                        byokConfig={byokConfig}
                        onSelect={handleModelSelectChange}
                        variant="dark"
                        compact={true}
                        dropdownPosition="top"
                      />
                      {compiledPath && (
                        <span className="text-[9px] font-bold uppercase font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">📎 Blueprint</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pr-1">
                      <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} className={`h-6 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${showSettingsPopover ? 'bg-white/10 text-white border border-white/15' : 'text-white/35 hover:text-white hover:bg-white/[0.06]'}`}>
                        ⚙️
                      </button>
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`transition-all cursor-pointer flex items-center justify-center ${
                          isListening
                            ? 'text-rose-500 animate-pulse scale-110'
                            : 'text-white/40 hover:text-white/90 hover:scale-105 active:scale-95'
                        }`}
                        title={isListening ? "Stop dictating" : "Dictate (Speech-to-Text)"}
                      >
                        {isListening ? <MicOff size={15} strokeWidth={2.2} /> : <Mic size={15} strokeWidth={2.2} />}
                      </button>
                      <motion.button
                        onClick={() => handleCustomGoalSubmit(formData.goal)}
                        disabled={!formData.goal || !formData.goal.trim()}
                        whileHover={{ scale: formData.goal?.trim() ? 1.05 : 1 }}
                        whileTap={{ scale: formData.goal?.trim() ? 0.93 : 1 }}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          formData.goal?.trim()
                            ? 'bg-gradient-to-br from-[#4e5bff] to-[#6b21a8] text-white shadow-[0_2px_12px_rgba(78,91,255,0.4)]'
                            : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUp size={13} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between text-[9.5px] text-white/20 font-mono px-1 select-none">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Local Workspace</span>
                  {uploadedFiles.length > 0 && <span className="text-emerald-400 font-medium truncate max-w-[150px]">📎 {uploadedFiles.length} file(s)</span>}
                </div>
              </div>
            </div>
          </div>



          <div
            className="bg-[#1c1c1c] flex flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out border-l border-white/[0.04]"
            style={{
              width: isWorkspaceCollapsed ? '0%' : '50%',
              minWidth: isWorkspaceCollapsed ? '0' : '300px',
              opacity: isWorkspaceCollapsed ? 0 : 1,
              pointerEvents: isWorkspaceCollapsed ? 'none' : 'auto',
            }}
          >
            {/* Tab selector bar */}
            <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#1a1a1a] shrink-0 select-none px-4">
              <div className="flex items-center gap-1 pt-1.5 font-mono">
                {[
                  { id: 'roadmap', label: 'Roadmap', icon: <Sparkles size={11} /> },
                  { id: 'blueprint', label: 'Blueprint Studio', icon: <Layers size={11} /> },
                  { id: 'terminal', label: 'Terminal', icon: <Terminal size={11} /> },
                  { id: 'browser', label: 'Web Browser', icon: <Globe size={11} />, badge: 'Soon' },
                ].map(tab => {
                  const isActive = workspaceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-[10.5px] font-bold border-t border-x rounded-t-md transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1c1c1c] border-white/[0.04] text-white z-10 -mb-[1px]'
                          : 'bg-[#181818] border-transparent text-white/40 hover:text-white hover:bg-white/[0.01]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-indigo-500/20 text-[#8b98ff] border border-indigo-500/30 font-bold uppercase tracking-wider scale-[0.9] origin-left">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-white/20 font-mono flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider select-none">
                  <span>cortex-env</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <button
                  onClick={() => setIsWorkspaceCollapsed(true)}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Collapse Workspace Studio"
                >
                  <PanelRightClose size={13} />
                </button>
              </div>
            </div>

            {/* Tab content viewer */}
            {rightPaneState === 'compiling' ? (
              <HolographicCompiler terminalHistory={terminalHistory} />
            ) : (
              <>
                {workspaceTab === 'terminal' && (
                  <ShellTerminal
                terminalHistory={terminalHistory}
                setTerminalHistory={setTerminalHistory}
                editorFiles={editorFiles}
                setEditorFiles={setEditorFiles}
                selectedEditorFile={selectedEditorFile}
                setSelectedEditorFile={setSelectedEditorFile}
                isServerRunning={isServerRunning}
                setIsServerRunning={setIsServerRunning}
                setWorkspaceTab={setWorkspaceTab}
                setRightPaneState={setRightPaneState}
                setBrowserUrl={setBrowserUrl}
                setBrowserHistory={setBrowserHistory}
                setBrowserHistoryIndex={setBrowserHistoryIndex}
                loading={loading}
              />
            )}

            {workspaceTab === 'roadmap' && (
              rightPaneState === 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/20 select-none bg-[#05070a] sidebar-grid-canvas relative">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(78,91,255,0.04),transparent_55%)]" />
                  <Terminal size={28} className="stroke-[1.5] mb-3 text-white/10 animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/30">Cortex Workspace Terminal</span>
                  <span className="text-[11.5px] mt-1 font-sans text-white/40 max-w-xs leading-relaxed font-medium">
                    Submit your path compilation requests in SARA chat to compile a structural blueprint.
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between h-full overflow-hidden bg-[#05070a] border-l border-white/[0.04] relative">
                  {/* Compiler Status Cockpit HUD */}
                  <div className="px-6 py-5 border-b border-white/[0.04] bg-[#0c0d12]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-10 relative">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold tracking-widest font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          RESOLVED
                        </span>
                        <h2 className="text-[12px] font-bold font-mono tracking-tight text-white uppercase truncate max-w-[240px]">
                          {compiledPath?.title || 'Compiled Blueprint'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[9.5px] font-mono text-white/40">
                        <span className="text-white/60">{compiledPath?.phases?.length || 0} PHASES</span>
                        <span className="text-white/20">•</span>
                        <span>{compiledPath?.phases?.reduce((acc: number, p: any) => acc + (p?.modules?.length || 0), 0) || 0} NODES</span>
                        <span className="text-white/20">•</span>
                        <span>{formData.durationDays} DAYS</span>
                        <span className="text-white/20">•</span>
                        <span className="text-[#4e5bff] font-bold">{formData.depth.toUpperCase()} TRACK</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (compiledPath) {
                          addPath(compiledPath);
                          navigate(`/path/${compiledPath.id}`);
                        }
                      }}
                      className="h-8 px-4 bg-gradient-to-r from-[#4e5bff] to-[#3b46e6] hover:from-[#3b46e6] hover:to-[#2b35c0] text-white text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(78,91,255,0.2)] hover:shadow-[0_0_20px_rgba(78,91,255,0.35)] cursor-pointer border-none"
                    >
                      <Zap size={11} fill="currentColor" />
                      <span>Approve & Launch Academy</span>
                    </button>
                  </div>

                  {/* Syllabus content view */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#05070a] relative select-none sidebar-grid-canvas">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(78,91,255,0.06),transparent_50%)]" />
                    
                    {/* Glowing vertical spine timeline track */}
                    <div className="absolute left-[33px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-[#4e5bff]/50 via-indigo-500/20 to-[#4e5bff]/5 pointer-events-none shadow-[0_0_12px_rgba(78,91,255,0.2)]" />

                    <div className="pl-10 relative space-y-10">
                      {compiledPath?.phases?.map((phase: any, pIdx: number) => {
                        const themeColors = getPathColor(phase.title);
                        return (
                          <div key={phase.id || pIdx} className="relative space-y-4 group/phase">
                            {/* Circular milestone node port centered on the spine */}
                            <div 
                              className="absolute left-[-34px] top-1.5 w-[18px] h-[18px] rounded-full bg-[#05070a] border-2 flex items-center justify-center z-10 transition-shadow duration-300"
                              style={{ 
                                borderColor: themeColors.stroke,
                                boxShadow: `0 0 8px ${themeColors.stroke}66`
                              }}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.stroke }} />
                            </div>

                            <div className="flex items-start justify-between border-b border-white/[0.06] pb-2.5">
                              <div>
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block">Phase 0{pIdx + 1} Pipeline</span>
                                <h3 className="text-[13px] font-black text-white tracking-wide uppercase mt-0.5">{phase.title}</h3>
                              </div>
                              {phase.description && (
                                <span className="text-[9.5px] font-mono text-white/40 max-w-[240px] text-right truncate" title={phase.description}>
                                  {phase.description}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 pl-1">
                              {phase.modules?.map((mod: any, mIdx: number) => (
                                <div
                                  key={mod.id || mIdx}
                                  className="group relative p-4 rounded-xl border border-white/[0.04] bg-[#0c0d12]/40 hover:bg-[#0c0d12]/80 hover:border-white/[0.08] transition-all duration-200"
                                >
                                  {/* Left module indicator connector centered on spine */}
                                  <div className="absolute left-[-29px] top-5 w-2 h-2 rounded-full bg-[#05070a] border-2 border-slate-600 group-hover:border-[#4e5bff] transition-colors z-10 flex items-center justify-center">
                                    <div className="w-[3px] h-[3px] rounded-full bg-slate-700 group-hover:bg-[#4e5bff] transition-colors" />
                                  </div>
                                  <div className="absolute left-[-25px] top-[23px] w-[25px] h-[2px] bg-white/[0.03] group-hover:bg-[#4e5bff]/20 transition-colors pointer-events-none" />

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-1">
                                      <h4 className="text-[12.5px] font-bold text-white group-hover:text-[#4e5bff] transition-colors leading-snug">
                                        {mod.title}
                                      </h4>
                                    </div>
                                    <span className="text-[9.5px] font-mono font-bold text-[#4e5bff] shrink-0 bg-[#4e5bff]/5 border border-[#4e5bff]/10 px-2.5 py-0.5 rounded-md">
                                      {mod.estimatedMinutes}m CPU
                                    </span>
                                  </div>
                                  
                                  {mod.description && (
                                    <p className="text-[11.5px] text-white/45 mt-2 leading-relaxed font-sans font-medium">
                                      {mod.description}
                                    </p>
                                  )}

                                  {mod.keyConcepts && Array.isArray(mod.keyConcepts) && mod.keyConcepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                      {mod.keyConcepts.map((concept: string, cIdx: number) => (
                                        <span
                                          key={concept || cIdx}
                                          className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-[9px] font-mono text-white/40 group-hover:text-white/60 group-hover:border-white/[0.06] transition-all"
                                        >
                                          {concept}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {mod.resources && Array.isArray(mod.resources) && mod.resources.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/[0.03] space-y-1.5 font-mono">
                                      <span className="text-[8.5px] font-bold text-white/20 uppercase tracking-widest block">Linked Resources</span>
                                      <div className="space-y-1.5">
                                        {mod.resources.map((res: any, rIdx: number) => (
                                          <button
                                            key={res.id || rIdx}
                                            onClick={() => handleOpenBrowserUrl(res.content)}
                                            className="w-full flex items-center gap-2 text-[10px] text-blue-400/80 hover:text-blue-300 transition-colors truncate max-w-full text-left bg-transparent border-none cursor-pointer p-0 group/link"
                                          >
                                            <span className="text-white/25 group-hover/link:text-blue-400 transition-colors font-bold">
                                              {rIdx === mod.resources.length - 1 ? '└─' : '├─'}
                                            </span>
                                            {(() => {
                                              const title = res.title || '';
                                              if (title.startsWith('[GitHub]')) {
                                                return <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded shrink-0 uppercase">GITHUB</span>;
                                              }
                                              if (title.startsWith('[Paper]')) {
                                                return <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded shrink-0 uppercase">PAPER</span>;
                                              }
                                              if (title.startsWith('[Sandbox]')) {
                                                return <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded shrink-0 uppercase">SANDBOX</span>;
                                              }
                                              if (title.startsWith('[Q&A]')) {
                                                return <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded shrink-0 uppercase">Q&A</span>;
                                              }
                                              if (title.startsWith('[Community]')) {
                                                return <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded shrink-0 uppercase">BLOG</span>;
                                              }
                                              return res.type === 'youtube' ? (
                                                <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded shrink-0 uppercase">VIDEO</span>
                                              ) : (
                                                <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded shrink-0 uppercase">DOCS</span>
                                              );
                                            })()}
                                            <span className="truncate">
                                              {(res.title || res.content)
                                                .replace(/^\[GitHub\]\s*/i, '')
                                                .replace(/^\[Paper\]\s*/i, '')
                                                .replace(/^\[Sandbox\]\s*/i, '')
                                                .replace(/^\[Q&A\]\s*/i, '')
                                                .replace(/^\[Community\]\s*/i, '')}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            )}

            {workspaceTab === 'blueprint' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#05070a] relative">
                {/* Subtle grid bg */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(78,91,255,0.05),transparent_55%)] sidebar-grid-canvas" />

                {(!compiledPath || showPromptEditorPanel) ? (
                  /* ── FULL-HEIGHT IDE LAYOUT ── */
                  <div className="flex flex-col h-full overflow-hidden relative z-10">

                    {/* ── Top Bar ── */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05] bg-[#07080c]/80 backdrop-blur-md shrink-0">
                      <div className="flex items-center gap-3">
                        {/* Traffic lights */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/20" />
                          <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/20" />
                          <span className="w-3 h-3 rounded-full bg-[#28c840] border border-black/20" />
                        </div>
                        <div className="w-px h-4 bg-white/[0.06]" />
                        {/* File tab */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0f1117] border border-white/[0.07]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[11px] font-bold font-mono text-white/80 tracking-tight">prompt_payload.json</span>
                          {isPromptCustomized && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved overrides" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Auto-Sync pill */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-mono text-white/30">Auto-Sync</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isPromptCustomized) {
                                setIsPromptCustomized(false);
                                setCustomPromptText(getCompiledPrompt());
                                toast.success("Re-engaged Auto-Sync! 🔄");
                              } else {
                                setIsPromptCustomized(true);
                              }
                            }}
                            className={`w-9 h-5 rounded-full p-0.5 cursor-pointer border-none transition-colors duration-200 relative flex items-center shrink-0 ${
                              !isPromptCustomized ? 'bg-[#4e5bff]' : 'bg-white/10'
                            }`}
                          >
                            <motion.div
                              layout
                              className="w-4 h-4 rounded-full bg-white shadow-sm"
                              animate={{ x: !isPromptCustomized ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                        {/* Token badge */}
                        <div className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] rounded-md font-mono text-[9px] text-white/40">
                          {customPromptText.length.toLocaleString()} chars · ~{Math.round(customPromptText.length / 4).toLocaleString()} tokens
                        </div>
                      </div>
                    </div>

                    {/* ── IDE Body — fills all remaining height ── */}
                    <div className="flex flex-1 overflow-hidden min-h-0">
                      {/* Line numbers gutter */}
                      <div className="flex flex-col text-right select-none shrink-0 w-12 pt-4 pb-4 pr-3 bg-[#07080c]/60 border-r border-white/[0.04] text-white/[0.15] font-mono text-[11px] leading-[22px] overflow-hidden">
                        {Array.from({ length: Math.max(30, customPromptText.split('\n').length + 5) }).map((_, i) => (
                          <div key={i} className="h-[22px]">{i + 1}</div>
                        ))}
                      </div>

                      {/* Editor area */}
                      <textarea
                        value={customPromptText}
                        onChange={(e) => {
                          setCustomPromptText(e.target.value);
                          setIsPromptCustomized(true);
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-emerald-400/90 font-mono text-[12px] leading-[22px] px-5 pt-4 pb-4 resize-none select-text focus:ring-0 w-full custom-scrollbar"
                        placeholder={`{\n  "goal": "Your learning goal...",\n  "depth": "Expert",\n  "timeline": "30d at 45m/day",\n  ...\n}`}
                        spellCheck={false}
                        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
                      />
                    </div>

                    {/* ── Bottom status bar + Synthesize button ── */}
                    <div className="shrink-0 border-t border-white/[0.05] bg-[#07080c]/80 backdrop-blur-md">
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.03]">
                        <div className="flex items-center gap-3 text-[9.5px] font-mono text-white/25">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            JSON
                          </span>
                          <span>·</span>
                          <span>{customPromptText.split('\n').length} lines</span>
                          <span>·</span>
                          <span>{isPromptCustomized ? <span className="text-amber-400/70">Manual Override</span> : <span className="text-emerald-400/70">Auto-Synced</span>}</span>
                        </div>
                        <span className="text-[9.5px] font-mono text-white/20">
                          Configure depth · timeline · level in chat ⚙️
                        </span>
                      </div>

                      {/* Synthesize button — full width, tall, prominent */}
                      <div className="px-5 py-4">
                        {(() => {
                          const fallbackGoal = [...messages].reverse().find(m => m.role === 'user')?.text || '';
                          const hasActiveGoal = Boolean(selectedGoal || formData.goal || fallbackGoal);
                          return (
                            <button
                              onClick={() => handleBuild()}
                              disabled={loading || !hasActiveGoal}
                              className="w-full h-11 bg-gradient-to-r from-[#4e5bff] to-[#3b46e6] hover:from-[#5a68ff] hover:to-[#4e5bff] disabled:from-white/[0.03] disabled:to-white/[0.03] disabled:text-white/20 text-white text-[12.5px] font-mono font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 shadow-[0_0_24px_rgba(78,91,255,0.3)] hover:shadow-[0_0_36px_rgba(78,91,255,0.5)] cursor-pointer border-none disabled:shadow-none"
                            >
                              {loading ? (
                                <>
                                  <Loader2 size={15} className="animate-spin" />
                                  <span>Generating Blueprint...</span>
                                </>
                              ) : (
                                <>
                                  <Zap size={15} fill="currentColor" className="animate-pulse" />
                                  <span>Synthesize Academy Roadmap</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Post-generation: Compiled Modules Preview & Edit */}
                {compiledPath && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                    <div className="space-y-6">

                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-left">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block">Interactive Editor</span>
                          <h3 className="text-[13px] font-black text-white tracking-wide uppercase mt-0.5">Customize Roadmap Blueprint</h3>
                        </div>
                        <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          EDITABLE BLUEPRINT
                        </span>
                      </div>

                      {/* Editable Phases and Modules list */}
                      <div className="space-y-6">
                        <AnimatePresence initial={false}>
                          {(compiledPath?.phases || []).map((phase: any, pIdx: number) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              key={phase.id || pIdx}
                              className="p-4 rounded-xl border border-white/[0.04] bg-[#0c0d12]/30 space-y-4 text-left"
                            >
                              {/* Phase Title Input using ClickToEditInput */}
                              <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-2">
                                <div className="flex-1">
                                  <span className="text-[8.5px] font-mono font-bold text-white/20 uppercase tracking-widest block">Phase 0{pIdx + 1}</span>
                                  <ClickToEditInput
                                    value={phase.title}
                                    onChange={(val) => handleUpdatePhaseTitle(pIdx, val)}
                                    className="font-black uppercase tracking-wide text-[12px] text-white"
                                    placeholder="Phase Title"
                                  />
                                </div>
                                <button
                                  onClick={() => handleDeletePhase(pIdx)}
                                  className="flex items-center gap-1.5 text-[9.5px] text-white/30 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer bg-transparent border-none font-mono font-bold"
                                  title="Delete Phase"
                                >
                                  <Trash size={10} />
                                  <span>Delete Phase</span>
                                </button>
                              </div>

                              {/* Modules inside Phase */}
                              <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                  {(phase?.modules || []).map((mod: any, mIdx: number) => (
                                    <motion.div
                                      layout
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.98 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                      key={mod.id || mIdx}
                                      className="bg-[#12141c]/60 border border-white/[0.04] rounded-lg p-3.5 space-y-3 hover:border-white/10 transition-colors"
                                    >
                                      {/* Module Title & Estimated Minutes */}
                                      <div className="flex items-center justify-between gap-4">
                                        <ClickToEditInput
                                          value={mod.title}
                                          onChange={(val) => handleUpdateModule(pIdx, mIdx, 'title', val)}
                                          className="font-bold text-white text-[11.5px] flex-1"
                                          placeholder="Module Title"
                                        />
                                        <div className="flex items-center gap-1 shrink-0 bg-[#4e5bff]/5 border border-[#4e5bff]/10 px-2 py-0.5 rounded">
                                          <input
                                            type="number"
                                            value={mod.estimatedMinutes}
                                            onChange={(e) => handleUpdateModule(pIdx, mIdx, 'estimatedMinutes', parseInt(e.target.value) || 0)}
                                            className="bg-transparent border-none font-bold text-[#4e5bff] text-[9.5px] outline-none w-8 text-right font-mono"
                                          />
                                          <span className="text-[#4e5bff] text-[9.5px] font-mono font-bold">m</span>
                                        </div>
                                      </div>

                                      {/* Module Description using ClickToEditTextarea */}
                                      <ClickToEditTextarea
                                        value={mod.description || ''}
                                        onChange={(val) => handleUpdateModule(pIdx, mIdx, 'description', val)}
                                        placeholder="Provide a concise description of what will be learned."
                                        className="text-white/50 hover:text-white/80"
                                      />

                                      {/* Key Concepts Tags */}
                                      <div className="space-y-1.5">
                                        <span className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-widest block">Core Skills & Concepts</span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {mod.keyConcepts?.map((concept: string, conceptIdx: number) => (
                                            <span key={conceptIdx} className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-[9px] font-mono text-white/40 flex items-center gap-1">
                                              <span>{concept}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveConcept(pIdx, mIdx, conceptIdx)}
                                                className="text-white/35 hover:text-white cursor-pointer bg-transparent border-none p-0 leading-none text-[8.5px]"
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                          
                                          {/* Add Concept Tag Input */}
                                          <input
                                            type="text"
                                            placeholder="+ Add concept"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                  handleAddConcept(pIdx, mIdx, val);
                                                  e.currentTarget.value = '';
                                                }
                                              }
                                            }}
                                            className="bg-transparent border-dashed border border-white/10 rounded px-1.5 py-0.5 text-[8.5px] font-mono text-white/30 outline-none w-16 focus:w-24 focus:border-[#4e5bff]/30 focus:text-white/60 transition-all font-semibold"
                                          />
                                        </div>
                                      </div>

                                      {/* Action Buttons for Module - Reordering and Deletion */}
                                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.02] mt-2 text-[9.5px] font-mono text-white/30">
                                        <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg p-0.5">
                                          <button
                                            onClick={() => handleMoveModule(pIdx, mIdx, 'up')}
                                            disabled={mIdx === 0}
                                            className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white disabled:text-white/10 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            title="Move Up"
                                          >
                                            <ArrowUp size={11} />
                                          </button>
                                          <button
                                            onClick={() => handleMoveModule(pIdx, mIdx, 'down')}
                                            disabled={mIdx === phase.modules.length - 1}
                                            className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white disabled:text-white/10 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                            title="Move Down"
                                          >
                                            <ArrowDown size={11} />
                                          </button>
                                        </div>
                                        
                                        <button
                                          onClick={() => handleDeleteModule(pIdx, mIdx)}
                                          className="flex items-center gap-1 text-white/30 hover:text-rose-400 cursor-pointer bg-transparent border-none p-1 hover:bg-rose-500/10 rounded transition-colors text-[9.5px] font-mono font-bold"
                                        >
                                          <Trash size={10} />
                                          <span>Delete Module</span>
                                        </button>
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>

                              {/* Add Module inside Phase Button */}
                              <button
                                onClick={() => handleAddModule(pIdx)}
                                className="w-full py-2 border border-dashed border-white/5 hover:border-white/10 rounded-lg text-center text-white/30 hover:text-white/60 text-[10px] font-mono cursor-pointer transition-all bg-transparent"
                              >
                                + Insert New Module Card
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        {/* Add Phase Button */}
                        <button
                          onClick={() => handleAddPhase()}
                          className="w-full py-3 border border-dashed border-white/10 hover:border-white/20 rounded-xl text-center text-white/40 hover:text-white/80 text-[11px] font-mono cursor-pointer transition-all bg-[#0c0d12]/10"
                        >
                          + Add New Phase Block
                        </button>
                      </div>

                      {/* Final Accept & Save Button */}
                      <div className="pt-4 flex flex-col gap-2 items-center">
                        <button
                          onClick={() => {
                            if (compiledPath) {
                              addPath(compiledPath);
                              navigate(`/path/${compiledPath.id}`);
                              toast.success("Academy initialized successfully! 🚀");
                            }
                          }}
                          className="w-full max-w-md h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[12px] font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer border-none"
                        >
                          <CheckCircle2 size={14} />
                          <span>Approve Blueprint & Launch Academy</span>
                        </button>
                        <span className="text-[9.5px] font-mono text-white/20">
                          Enrolls you in this customized learning academy path.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {workspaceTab === 'browser' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0b10] border-l border-white/[0.04] relative select-none">
                {/* Subtle Grid Backdrop */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(78,91,255,0.05),transparent_70%)] sidebar-grid-canvas" />

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10 flex flex-col justify-center max-w-xl mx-auto w-full text-center">
                  {/* Glowing Icon Container */}
                  <div className="flex justify-center mb-2">
                    <motion.div
                      animate={{
                        scale: [1, 1.04, 1],
                        rotate: 360
                      }}
                      transition={{
                        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 60, repeat: Infinity, ease: "linear" }
                      }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4e5bff]/10 to-[#7c3aed]/10 border border-[#4e5bff]/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(78,91,255,0.15)]"
                    >
                      <Globe className="text-[#8b98ff]" size={24} />
                      <div className="absolute inset-0 rounded-full border border-dashed border-[#4e5bff]/20 animate-spin-slow" style={{ animationDuration: '20s' }} />
                    </motion.div>
                  </div>

                  {/* Header Titles */}
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[#8b98ff] text-[9px] font-mono font-bold uppercase tracking-wider mx-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-pulse" />
                      Planned Integration
                    </div>
                    <h2 className="text-xl font-bold font-sans text-white tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                      Autonomous Browser Sandbox
                    </h2>
                    <p className="text-[12px] text-white/40 leading-relaxed font-sans font-medium">
                      An integrated agentic browser environments tab. In a future update, this tab will allow you to preview compiler outputs locally and let SARA browse the web to fetch live docs.
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 gap-3 text-left mt-2">
                    {[
                      {
                        title: "Live Localhost Previewer",
                        desc: "Render and interact with Web applications compiled in the Cortex terminal sandbox (e.g. running Vite development servers).",
                        icon: <Code size={13} className="text-[#8b98ff]" />
                      },
                      {
                        title: "Autonomous Web Scout",
                        desc: "Allow SARA to securely scan software documentation, debug stacktraces, and research package APIs to resolve errors.",
                        icon: <Sparkles size={13} className="text-indigo-400" />
                      },
                      {
                        title: "Security Sandboxing",
                        desc: "Completely isolated local proxy environment protecting your private network credentials from target web assets.",
                        icon: <Terminal size={13} className="text-emerald-400" />
                      }
                    ].map((f, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-white/[0.04] bg-[#12131a]/60 hover:bg-[#12131a]/90 hover:border-white/[0.07] transition-all flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                          {f.icon}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-[11.5px] font-bold text-white font-sans">{f.title}</h4>
                          <p className="text-[10.5px] text-white/40 leading-relaxed font-sans font-medium">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Newsletter Subscription */}
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-[#12131a]/40 space-y-3 mt-2">
                    {!isBrowserSubscribed ? (
                      <div className="space-y-2.5">
                        <div className="text-[10.5px] font-medium text-white/50 font-sans">
                          Request early beta access to the Agentic Browser:
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (browserNotificationEmail.trim()) {
                              setIsBrowserSubscribed(true);
                              toast.success("Successfully subscribed to Browser updates! 🚀");
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="email"
                            required
                            placeholder="your.email@example.com"
                            value={browserNotificationEmail}
                            onChange={(e) => setBrowserNotificationEmail(e.target.value)}
                            className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-[11.5px] text-white placeholder:text-white/20 outline-none focus:border-[#4e5bff]/50 focus:shadow-[0_0_12px_rgba(78,91,255,0.08)] transition-all"
                          />
                          <button
                            type="submit"
                            className="h-9 px-4 bg-gradient-to-r from-[#4e5bff] to-[#6b21a8] hover:from-[#5c68ff] hover:to-[#782cb4] text-white text-[11px] font-mono font-bold rounded-lg transition-all shadow-[0_2px_10px_rgba(78,91,255,0.25)] border-none cursor-pointer"
                          >
                            Get Notified
                          </button>
                        </form>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-2 space-y-1.5 text-center"
                      >
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <span className="text-[11.5px] font-bold text-white">Added to Early Access!</span>
                        <span className="text-[10px] text-white/35 font-medium">We will notify you at {browserNotificationEmail} when beta keys are distributed.</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Diagnostics Console Toggle */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowBrowserDiagnostics(!showBrowserDiagnostics)}
                      className="text-[10px] font-mono font-bold text-[#8b98ff]/75 hover:text-white transition-colors cursor-pointer"
                    >
                      {showBrowserDiagnostics ? "Hide Sandbox Diagnostics [-]" : "Show Sandbox Diagnostics [+]"}
                    </button>

                    {showBrowserDiagnostics && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 p-3 rounded-lg bg-black/60 border border-white/[0.06] text-left font-mono text-[9.5px] text-emerald-400/90 space-y-1 overflow-x-auto shadow-inner leading-relaxed animate-pulse"
                      >
                        <div>[cortex-browser-daemon:init] Initializing sandbox environment...</div>
                        <div>[cortex-browser-daemon:tunnel] Tor/Proxy socks router {"->"} listening on 127.0.0.1:9050</div>
                        <div>[cortex-browser-daemon:render] Webkit/Blink environment mapping active</div>
                        <div>[cortex-browser-daemon:status] DAEMON IDLE - Awaiting compiler handshake...</div>
                        <div className="text-white/20 select-none">■ Host pipeline listening...</div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
        </div>
      )}
    </div>
  );
};

export default CreatePath;
