import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateLearningPlan, scoutWebForResourcesJSON, FileAttachment, chatWithTutor, parseTutorResponse } from '../services/geminiService';
import { api } from '../services/api';
import { useAppStore } from '../context/Store';
import { toast } from 'sonner';
import {
  Zap, Loader2,
  UploadCloud, FileText, X, Globe,
  TrendingUp, Heart, BookOpen, Target, Layout as LayoutIcon,
  ChevronDown, Sparkles, Plus, Terminal, Code,
  ArrowUp, PanelLeftOpen, Mic, MicOff,
  Copy, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { ModelSelector, PROVIDER_MODELS } from '../components/ui/ModelSelector';
import { getModelDisplayName, getDefaultModelForProvider, type ProviderId } from '../config/modelRegistry';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';
import SwarmBentoGrid from '../components/ui/SwarmBentoGrid';

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

const SLASH_COMMANDS = [
  { cmd: '/compile', desc: 'Compile a custom curriculum path blueprint', placeholder: '/compile ' },
  { cmd: '/refine', desc: 'Refine the current curriculum blueprint', placeholder: '/refine ' },
  { cmd: '/test', desc: 'Run a skills diagnostics test in terminal', placeholder: '/test' },
  { cmd: '/code', desc: 'Open coding sandbox guidance', placeholder: '/code' },
];

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
        <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 block">{label}</span>
        {onToggleAuto && (
          <button
            type="button"
            onClick={onToggleAuto}
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border flex items-center gap-1 leading-none ${
              isAuto
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${isAuto ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isAuto ? 'Auto' : 'Locked'}
          </button>
        )}
      </div>
      <div className="relative w-full">
        <div className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer">
          <span className="truncate pr-4">{value}</span>
          <ChevronDown size={11} className="text-slate-400 shrink-0" />
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

  const hasScout = terminalHistory.some(line => line && typeof line === 'string' && (line.includes('WebScout') || line.includes('Scouting')));
  const isScouting = terminalHistory.some(line => line && typeof line === 'string' && line.includes('Scouting'));
  const isSynthesizing = terminalHistory.some(line => line && typeof line === 'string' && (line.includes('Synthesizing') || line.includes('CurriculumSynthesizer')));
  const isFormatting = terminalHistory.some(line => line && typeof line === 'string' && (line.includes('Formatting') || line.includes('SARA')));
  const isLinking = terminalHistory.some(line => line && typeof line === 'string' && (line.includes('Linking') || line.includes('Compiler:')));

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
      status: terminalHistory.some(line => line && typeof line === 'string' && (line.includes('compiled successfully') || line.includes('blueprint') || line.includes('launch'))) ? 'completed' : (isLinking ? 'active' : 'pending'),
      desc: 'Structuring phases, modules, and timing metrics'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#f4f8fe] to-[#e9f1fc] overflow-hidden relative select-none">
      {/* Aurora glow background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(78,91,255,0.12),transparent_65%)]" />

      {/* Main Holographic Grid */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-8 overflow-y-auto custom-scrollbar">
        {/* Holographic Ring Visualizer */}
        <div className="flex flex-col items-center justify-center relative w-64 h-64 shrink-0">
          {/* Rotating Outer Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            className="absolute inset-0 border border-dashed border-[#4e5bff]/40 rounded-full shadow-[0_0_20px_rgba(78,91,255,0.08)]"
          />
          {/* Rotating Middle Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute inset-4 border border-indigo-500/30 rounded-full border-spacing-2"
          />
          {/* Glowing Inner Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute inset-8 border border-double border-[#4e5bff]/55 rounded-full flex items-center justify-center"
          />
          {/* Core pulsing portal */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-16 rounded-full bg-gradient-to-br from-[#4e5bff]/15 to-indigo-900/10 border border-[#4e5bff]/50 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(78,91,255,0.2)]"
          >
            <Zap size={24} className="text-[#4e5bff] fill-[#4e5bff]/20 animate-pulse" />
            <span className="text-[8px] font-mono font-bold tracking-widest text-[#4e5bff]/90 mt-1 uppercase">compiling</span>
          </motion.div>
        </div>

        {/* Pipeline Checklist */}
        <div className="flex-1 max-w-md w-full space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black tracking-widest font-mono text-[#0e0a5c] bg-[#0e0a5c]/5 border border-[#0e0a5c]/15 px-2.5 py-0.5 rounded-full uppercase inline-block">
              Orchestrator pipeline
            </span>
            <h3 className="text-sm font-bold font-mono tracking-tight text-[#0e0a5c] uppercase mt-1">
              Synthesizing Cognitive Syllabus
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                  step.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                    : step.status === 'active'
                    ? 'border-[#4e5bff]/30 bg-white shadow-[0_4px_16px_rgba(78,91,255,0.08)]'
                    : 'border-slate-200/50 bg-slate-50/50 opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'completed' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-500/30 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  ) : step.status === 'active' ? (
                    <div className="w-4 h-4 rounded-full bg-[#4e5bff]/10 border border-[#4e5bff]/40 flex items-center justify-center relative">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] z-10" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5 text-left">
                  <h4 className={`text-[11px] font-bold font-mono ${step.status === 'completed' ? 'text-emerald-700' : step.status === 'active' ? 'text-[#0e0a5c]' : 'text-slate-400'}`}>
                    {step.label}
                  </h4>
                  <p className={`text-[10px] font-sans leading-relaxed ${step.status === 'completed' ? 'text-slate-500' : step.status === 'active' ? 'text-slate-650' : 'text-slate-400'}`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streaming Console Terminal logs at bottom */}
      <div className="h-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-md flex flex-col select-text">
        <div className="px-4 py-1.5 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0 font-mono text-[9px] text-slate-500 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-400 ml-2">COMPILED_DIAGNOSTICS_STREAM</span>
          </div>
          <span className="flex items-center gap-1 text-[#4e5bff]"><Loader2 size={9} className="animate-spin text-[#4e5bff]" /> streaming</span>
        </div>
        <div className="flex-1 p-4 font-mono text-[10px] text-slate-700 space-y-1 overflow-y-auto custom-scrollbar select-text text-left">
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
  role: 'user' | 'model' | 'assistant';
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
  isGenerating?: boolean;
  activeAgents?: string[];
  completedAgents?: string[];
  payloadData?: any;
  warning?: {
    title: string;
    message: string;
    type: 'network' | 'config' | 'tool';
    code?: string;
  } | null;
  qualificationData?: {
    question: string;
    choices: Array<{ id: string; text: string }>;
  } | null;
  selectedChoiceId?: string | null;
  isResolvingQualification?: boolean;
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
    <div className="my-3 overflow-x-auto rounded-[16px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-50 text-[#0e0a5c] text-[9.5px] font-black uppercase tracking-wider border-b border-slate-200">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-100">
      {children}
    </tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-slate-50 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }: any) => (
    <th className="p-2.5 font-bold border-b border-slate-200 text-slate-800">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="p-2.5 border-b border-slate-200 text-slate-700 font-medium">
      {children}
    </td>
  ),
  p: ({ children }: any) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed text-[13.5px] font-normal text-slate-700 text-justify hyphens-auto">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px] text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px] text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed">
      {children}
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-extrabold text-[#0e0a5c]">
      {children}
    </strong>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-[14px] font-black mt-4 mb-2 tracking-wide uppercase text-[#0e0a5c]">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-[12.5px] font-black mt-3 mb-2 tracking-wide uppercase text-[#0e0a5c]">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[11.5px] font-bold mt-2 mb-1 text-slate-700">
      {children}
    </h3>
  ),
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 rounded text-[11px] font-mono border bg-slate-50 text-indigo-700 border-slate-200/60">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-[#0e0a5c] pl-3 my-3 italic text-[11.5px] text-slate-500 bg-slate-50/50 py-1 pr-2 rounded-r-lg">
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
        let key = localStorage.getItem(`vidyal_byok_key_${provider}`) || sessionStorage.getItem(`vidyal_byok_key_${provider}`) || '';
        try {
          if (!key) {
            const cachedKeys = JSON.parse(cachedKeysRaw);
            key = cachedKeys[provider] || '';
          }
        } catch { /* ignore */ }
        if (!key && byokConfig && byokConfig.provider === provider) {
          key = byokConfig.apiKey || '';
        }
        updateByokConfig({
          provider: provider as ProviderId,
          apiKey: key,
          preferredModel,
        });
        updateByokMode('custom');
        const displayName = getModelDisplayName(provider as ProviderId, preferredModel);
        toast.success(`Switched to ${displayName} \uD83D\uDD13`);
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
    let name = 'Gemini 3.5 Flash';
    if (byokMode === 'custom' && byokConfig) {
      if (byokConfig.preferredModel?.trim()) {
        name = getModelDisplayName(byokConfig.provider as ProviderId, byokConfig.preferredModel);
      } else {
        name = getModelDisplayName(byokConfig.provider as ProviderId, getDefaultModelForProvider(byokConfig.provider as ProviderId));
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

  const logStep = useCallback((msg: string) => {
    setTerminalHistory(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content?: string; attachment?: FileAttachment }[]>([]);
  const [webScoutActive, setWebScoutActive] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'INITIALIZING' | 'FETCHING_SCOUT' | 'PARSING_SCOUT' | 'FETCHING_PLAN' | 'PARSING_PLAN' | 'FAILED' | 'SUCCESS'>('idle');
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
  const streamIntervalRef = useRef<any>(null);
  const logIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('goal') || '';
  });

  const [compiledPath, setCompiledPath] = useState<any | null>(null);
  const [rightPaneState, setRightPaneState] = useState<'idle' | 'compiling' | 'completed'>('idle');

  // Workspace Dynamic Tabs & Editor/Browser states
  const [activeSuggestionType, setActiveSuggestionType] = useState<'context' | 'command' | null>(null);
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState<string>('');
  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);

  // Terminal interactive state hooks
  const [terminalHistory, setTerminalHistory] = useState<string[]>(() => [
    'Last login: ' + new Date().toDateString() + ' on ttys002',
    'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
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

  const handleClearThread = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setMessages([]);
    setCompiledPath(null);
    setSelectedGoal('');
    setRightPaneState('idle');
    setConversationStage('greet');
    setTerminalHistory([
      'Last login: ' + new Date().toDateString() + ' on ttys002',
      'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
    ]);
    setFormData({
      goal: '',
      proficiency: 'Beginner', skillValue: 25, expectedOutcome: '',
      targetDate: '', durationDays: 30, dailyCommitment: 45, resources: '',
      track: '', motivation: 'Project',
      cognitiveLoad: 'Balanced', outputMode: 'Mixed', preferredStartTime: '09:00', depth: 'Expert',
      cognitiveProfile: 'Practical Dev-First',
      tutorPersona: 'Silicon Valley Tech Lead',
      assessmentStyle: 'Sprint Diagnostics',
      primaryMedia: 'Mixed Scout',
      language: 'English',
      pacing: 'Adaptive',
      difficultyScaling: 'Dynamic Auto-scaling',
      projectTarget: 'Portfolio Project',
    });
    setAttachedContexts([]);
    setUploadedFiles([]);
    setCustomPromptDirectives('');
    setCustomPromptText('');
    setWebScoutActive(false);
    setCompileStatus('idle');
    setIsSaraTyping(false);
    setError(null);
    
    toast.success('Conversation thread reset. All session memory cleared.');
  }, []);

  const handleResolveQualification = async (msgId: string, choiceId: string, choiceText: string, messageIdx: number) => {
    // 1. Freeze selection state on that specific message
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          selectedChoiceId: choiceId,
          isResolvingQualification: true
        };
      }
      return m;
    }));

    // 2. Append a user message confirming the selected choice
    const userMsgId = 'user-' + Date.now();
    const modelMsgId = 'model-' + Date.now();
    
    // Set the selected goal so it's locked in
    setSelectedGoal(choiceText);
    setConversationStage('ground');

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: `I choose focus area: "${choiceText}"`, timestamp: Date.now() }
    ]);

    setIsSaraTyping(true);

    try {
      // 3. Dispatch resolve request to backend
      const activeGoal = choiceText;
      const historyForSara = messages.slice(0, messageIdx + 1).map(m => ({ role: m.role, content: m.text }));
      
      const responseText = await api.resolveQualification({
        history: historyForSara,
        choiceId,
        topic: activeGoal,
        context: ONBOARDING_CONTEXT,
        currentContent: formData.resources,
      });

      if (!responseText) {
        throw new Error('No response returned from SARA qualification resolution.');
      }

      // Parse the resolved response (extracting parameters or payload metadata)
      const parsedRes = parseTutorResponse(responseText);

      // Append SARA's initial response message
      const initialModelMsg: ChatMessage = {
        id: modelMsgId,
        role: 'model',
        text: '',
        type: 'text',
        timestamp: Date.now(),
        mode: parsedRes.mode,
        intent: parsedRes.intent,
        action: parsedRes.action,
        target: parsedRes.target,
        skill_update: parsedRes.skill_update,
        interactive_block: parsedRes.interactive_block,
        isGenerating: true,
        activeAgents: [],
        completedAgents: [],
        payloadData: parsedRes.parameters || null,
      };

      setMessages(prev => [...prev, initialModelMsg]);
      setIsSaraTyping(false);

      // 4. Start the simulated streaming loop
      let currentIndex = 0;
      const chunkSize = 25;
      const intervalTime = 20;

      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

      const streamInterval = setInterval(() => {
        currentIndex += chunkSize;
        const currentChunk = responseText.substring(0, currentIndex);
        const isDone = currentIndex >= responseText.length;

        let activeAgents: string[] = [];
        let completedAgents: string[] = [];
        let payloadData = initialModelMsg.payloadData;

        // Swarm manifest regex scanner
        const manifestRegex = /<swarm_manifest\s+([^>]*)\/>/gi;
        let cleanedText = currentChunk.replace(manifestRegex, (match, attrs) => {
          const agentsMatch = attrs.match(/agents=\[([^\]]*)\]/i);
          if (agentsMatch) {
            activeAgents = agentsMatch[1]
              .split(',')
              .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean);
          }
          const completedMatch = attrs.match(/completed=\[([^\]]*)\]/i);
          if (completedMatch) {
            completedAgents = completedMatch[1]
              .split(',')
              .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean);
          }
          const payloadMatch = attrs.match(/payload=(\{[^}]*\})/i);
          if (payloadMatch) {
            try {
              payloadData = JSON.parse(payloadMatch[1]);
            } catch (e) {}
          }
          return '';
        });

        // Cortex payload regex scanner
        const payloadRegex = /<cortex_payload>([\s\S]*?)(?:<\/cortex_payload>|$)/i;
        const payloadMatch = cleanedText.match(payloadRegex);
        if (payloadMatch) {
          try {
            const jsonStr = payloadMatch[1].trim();
            if (jsonStr.endsWith('}')) {
              const parsed = JSON.parse(jsonStr);
              if (parsed.payloadData) {
                payloadData = parsed.payloadData;
              } else {
                payloadData = parsed;
              }
            }
          } catch (e) {}
          cleanedText = cleanedText.replace(payloadRegex, '');
        }

        setMessages(prev => prev.map(msg => {
          if (msg.id === modelMsgId) {
            return {
              ...msg,
              text: cleanedText,
              isGenerating: !isDone,
              activeAgents: activeAgents.length > 0 ? activeAgents : msg.activeAgents,
              completedAgents: completedAgents.length > 0 ? completedAgents : msg.completedAgents,
              payloadData: payloadData || msg.payloadData,
            };
          }
          return msg;
        }));

        if (isDone) {
          clearInterval(streamInterval);
        }
      }, intervalTime);

      streamIntervalRef.current = streamInterval;

      // Update qualification resolving state back to complete
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            isResolvingQualification: false
          };
        }
        return m;
      }));

    } catch (err: any) {
      setIsSaraTyping(false);
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return { ...m, isResolvingQualification: false };
        }
        return m;
      }));
      toast.error(err.message || 'Failed to resolve qualification.');
    }
  };

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
        text: `Excellent choice! I've set your target goal to **${card.goal}**.\n\nWe can continue chatting here to refine your goals. When you're ready, simply click **Compile Learning Path** below or type **/compile** to synthesize your customized academy roadmap!`,
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
            text: "I have initialized a skills diagnostics session. You can see the logs compiling, and you can answer directly in the chat window."
          }
        ]);
      } else if (cmd === '/code') {
        setFormData(prev => ({ ...prev, goal: '' }));
        setMessages(prev => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: "Coding sandboxes and templates can be generated directly inline in the chat! Simply ask me to write code, design a UI, or generate a script, and click the **Run in Sandbox** button on the code block to test it instantly."
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

    // Pre-Flight System Guardrails check
    const isOffline = !navigator.onLine;
    const isKeyMissing = isSelectedModelKeyMissing();

    if (isOffline || isKeyMissing) {
      setIsSaraTyping(false);
      setError(null);
      
      let warningTitle = 'System Boundary Interruption';
      let warningMessage = 'An unexpected boundary error occurred.';
      let warningType: 'network' | 'config' | 'tool' = 'network';
      let warningCode = '';

      if (isOffline) {
        warningTitle = 'Dead Network Boundary';
        warningMessage = 'Your system is currently offline. The SARA cognitive orchestration engine and subagent fleet require an active network connection to query documentation indexes and resolve academic node linkages.';
        warningType = 'network';
        warningCode = 'ERR_NETWORK_OFFLINE';
      } else if (isKeyMissing) {
        warningTitle = 'Missing AI Engine Credentials';
        warningMessage = `API configuration key for model provider "${byokConfig?.provider || 'selected'}" is missing. Please configure it in your Settings, or switch to a different engine using the selector.`;
        warningType = 'config';
        warningCode = `ERR_BYOK_KEY_MISSING_${byokConfig?.provider?.toUpperCase()}`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: modelMsgId,
          role: 'model',
          text: `I detected a pre-flight guardrail system interruption. SARA could not dispatch the model due to missing configurations or boundary failures.`,
          warning: {
            title: warningTitle,
            message: warningMessage,
            type: warningType,
            code: warningCode
          }
        }
      ]);
      return;
    }

    setIsSaraTyping(true);
    setError(null);

    // Call SARA via chatWithTutor - cast local messages to include timestamp for compatibility
    const historyForSara = messages.map(m => ({ ...m, timestamp: Date.now() }));
    chatWithTutor(historyForSara as any, goalText, ONBOARDING_CONTEXT)
      .then((result) => {
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

        const fullText = result.text || '';
        const initialModelMsg: ChatMessage = {
          id: modelMsgId,
          role: 'model',
          text: '',
          type: conversationStage === 'greet' ? 'greeting' : ((result as any).type || 'text'),
          timestamp: Date.now(),
          mode: result.mode,
          intent: result.intent,
          action: result.action,
          target: result.target,
          skill_update: result.skill_update,
          interactive_block: result.interactive_block,
          isGenerating: true,
          activeAgents: [],
          completedAgents: [],
          payloadData: saraParams || null,
        };

        setMessages(prev => [...prev, initialModelMsg]);
        setIsSaraTyping(false);

        // Streaming buffer simulation loop
        let currentIndex = 0;
        const chunkSize = 25; // chunk size for streaming speed
        const intervalTime = 20;

        const streamInterval = setInterval(() => {
          currentIndex += chunkSize;
          const currentChunk = fullText.substring(0, currentIndex);
          const isDone = currentIndex >= fullText.length;

          let activeAgents: string[] = [];
          let completedAgents: string[] = [];
          let payloadData = initialModelMsg.payloadData;

          // Regular expression scanner to capture swarm manifests inside the stream buffer
          const manifestRegex = /<swarm_manifest\s+([^>]*)\/>/gi;
          let cleanedText = currentChunk.replace(manifestRegex, (match, attrs) => {
            const agentsMatch = attrs.match(/agents=\[([^\]]*)\]/i);
            if (agentsMatch) {
              activeAgents = agentsMatch[1]
                .split(',')
                .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
            }

            const completedMatch = attrs.match(/completed=\[([^\]]*)\]/i);
            if (completedMatch) {
              completedAgents = completedMatch[1]
                .split(',')
                .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
            }

            const payloadMatch = attrs.match(/payload=(\{[^}]*\})/i);
            if (payloadMatch) {
              try {
                payloadData = JSON.parse(payloadMatch[1]);
              } catch (e) {
                // Ignore parsing errors for malformed dynamic payloads
              }
            }

            return ''; // Hide from user
          });

          // Regular expression scanner to capture SARA qualification options in the stream buffer
          const qualRegex = /<sara_qualification\s+question="([^"]+)">([\s\S]*?)<\/sara_qualification>/i;
          const qualMatch = cleanedText.match(qualRegex);
          let qualificationData = null;
          if (qualMatch) {
            const question = qualMatch[1];
            const choicesText = qualMatch[2];
            const choices: Array<{ id: string; text: string }> = [];
            const choiceRegex = /<choice\s+id="([^"]+)">([^<]+)<\/choice>/gi;
            let match;
            while ((match = choiceRegex.exec(choicesText)) !== null) {
              choices.push({ id: match[1], text: match[2].trim() });
            }
            qualificationData = { question, choices };
            cleanedText = cleanedText.replace(qualRegex, '');
          }

          // Regular expression scanner to capture cortex_payload block inside the stream buffer
          const payloadRegex = /<cortex_payload>([\s\S]*?)(?:<\/cortex_payload>|$)/i;
          const payloadMatch = cleanedText.match(payloadRegex);
          if (payloadMatch) {
            try {
              const jsonStr = payloadMatch[1].trim();
              if (jsonStr.endsWith('}')) {
                const parsed = JSON.parse(jsonStr);
                if (parsed.payloadData) {
                  payloadData = parsed.payloadData;
                } else {
                  payloadData = parsed;
                }
              }
            } catch (e) {
              // Ignore partial JSON parsing errors
            }
            cleanedText = cleanedText.replace(payloadRegex, '');
          }

          setMessages(prev => prev.map(msg => {
            if (msg.id === modelMsgId) {
              return {
                ...msg,
                text: cleanedText,
                isGenerating: !isDone,
                activeAgents: activeAgents.length > 0 ? activeAgents : msg.activeAgents,
                completedAgents: completedAgents.length > 0 ? completedAgents : msg.completedAgents,
                payloadData: payloadData || msg.payloadData,
                qualificationData: qualificationData || msg.qualificationData,
              };
            }
            return msg;
          }));

          if (isDone) {
            clearInterval(streamInterval);
          }
        }, intervalTime);
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
    if (!navigator.onLine) {
      toast.error('Dead Network Boundary: internet connection required to compile.');
      setMessages(prev => [
        ...prev,
        {
          id: 'model-err-' + Date.now(),
          role: 'model',
          text: `Curriculum compilation failed due to network constraints.`,
          warning: {
            title: 'Dead Network Boundary',
            message: 'Your system is offline. Live scouting and syllabus compilations require internet access.',
            type: 'network',
            code: 'ERR_NETWORK_OFFLINE'
          }
        }
      ]);
      return;
    }
    setLoading(true); setError(null);
    setRightPaneState('compiling');
    setTerminalHistory(prev => {
      const clean = prev.slice(0, prev.length - 1);
      return [
        ...clean,
        `lokeshgandreddy@MacBook-Pro Vidhyalaya % npx sara compile --goal="${activeGoal}" --depth=${formData.depth} --scout=${webScoutActive}`,
      ];
    });

    setCompileStatus('INITIALIZING');
    logStep('● Starting compilation pipeline...');
    logStep('Releasing Cortex Compiler Agent...');
    if (webScoutActive) logStep('Releasing WebScout subagent...');

    try {
      let scoutedText = '';
      if (webScoutActive) {
        setCompileStatus('FETCHING_SCOUT');
        logStep('WebScout: Initiating live documentation search...');
        const results = await scoutWebForResourcesJSON(activeGoal);
        setCompileStatus('PARSING_SCOUT');
        if (Array.isArray(results) && results.length > 0) {
          logStep(`WebScout: Found ${results.length} grounded resources. Injecting into curriculum context...`);
          scoutedText = results.map(r => `[${r.type?.toUpperCase() || 'URL'}] ${r.title} — ${r.url}\nRelevance: ${r.snippet}`).join('\n\n');
        } else {
          logStep('WebScout: Live search returned no results. Proceeding without grounding context.');
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

      setCompileStatus('FETCHING_PLAN');
      logStep('CurriculumSynthesizer: Streaming curriculum phases from Gemini...');
      const planData: any = await generateLearningPlan(
        compilationInstructions,
        compiledResources, formData.dailyCommitment, formData.proficiency, '',
        targetDate.toISOString().split('T')[0], formData.depth,
        fileAttachments.length > 0 ? fileAttachments : undefined,
        { mode: 'full', timeoutMs: (formData.depth === 'Advanced' || formData.depth === 'Mastery / Deep-Dive' || formData.depth === 'Academic & Research') ? 90_000 : 70_000 },
      );

      setCompileStatus('PARSING_PLAN');
      logStep('SARA: Parsing module graph and dependency links...');

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

      setCompileStatus('SUCCESS');
      logStep('SARA: Curriculum compiled successfully!');
      logStep('Cortex: Releasing final blueprint context...');
      setTerminalHistory(prev => [...prev, 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ']);

      await new Promise(r => setTimeout(r, 1000));

      setCompiledPath(newPath);
      setRightPaneState('completed');

      // Automatically add path and navigate to the newly created path detail dashboard
      addPath(newPath);
      navigate(`/path/${newPath.id}`);
      toast.success("Academy initialized successfully! 🚀");
    } catch (err: any) {
      setCompileStatus('FAILED');
      setError(err.message || 'Compiler failed.');
      const errMsg = err.message || 'Compiler failed.';
      logStep(`ERROR: ${errMsg}`);
      logStep(`STACK: ${err.stack?.split('\n')[1]?.trim() || 'No stack available'}`);
      setTerminalHistory(prev => [...prev, 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ']);
      setRightPaneState('idle');
      toast.error(err.message || 'Compiler failed.');
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
    { title: 'Antigravity Propulsion', subtitle: 'Physics, Spacetime, Gravity', icon: <Sparkles size={14} />, goal: 'Antigravity Propulsion Research', accentColor: '#ec4899', iconBg: 'text-pink-700 bg-pink-50 border-pink-200/50', },
  ];

  const isLanding = messages.length === 0;

  return (
    <div className={`flex h-full w-full antialiased text-slate-800 select-text overflow-hidden`} style={{ background: '#f2f6fc' }}>
      <style dangerouslySetInnerHTML={{__html: `
        body { background: linear-gradient(135deg, #f4f8fe 0%, #e9f1fc 100%) !important; }
        main { background: linear-gradient(135deg, #f4f8fe 0%, #e9f1fc 100%) !important; }

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
          animation: cortex-bounce 1.4s ease-in-out infinite;
        }
        .cortex-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .cortex-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cortex-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}} />

      {messages.length === 0 ? (
        <div className="w-full max-w-[620px] mx-auto px-4 flex-1 flex flex-col items-center justify-center min-h-[85vh] h-full gap-8 select-none relative">

          {isSidebarCollapsed && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
              }}
              className="fixed top-4.5 left-4.5 z-[110] p-2 rounded-xl text-slate-500 hover:text-slate-800 active:scale-95 transition-all focus:outline-none shadow-md border border-slate-200/80 bg-white/90 backdrop-blur-md hover:bg-slate-50 cursor-pointer flex items-center justify-center"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={16} strokeWidth={2.5} />
            </button>
          )}
          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="text-center"
          >
            <h1 className="text-[31px] font-semibold text-[#0e0a5c] tracking-tight leading-tight select-none">How can I help you learn today?</h1>
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
                  className="absolute top-full mt-3 left-0 right-0 rounded-2xl p-4 bg-white border border-slate-200/80 text-slate-800 shadow-2xl z-50 flex flex-col gap-2.5 max-w-[800px] mx-auto"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-slate-500">
                      <Sparkles size={11} className="text-[#4e5bff]" />
                      Compiler Options
                    </span>
                    <button onClick={() => setShowSettingsPopover(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                      {/* Column 1: Schedule & Target */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600">Schedule & Target</span>
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
                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-600">Cognitive & Tutor</span>
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
                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-pink-650">Advanced (Optional)</span>
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
                  className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-1 z-35 flex flex-col max-h-[220px] overflow-y-auto"
                >
                  <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-slate-400 uppercase border-b border-slate-100 mb-1">
                    {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                  </div>
                  {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                    .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                    .map((item, idx) => {
                      const isSelected = idx === slashSelectedIndex;
                      return (
                        <button
                          key={item.trigger}
                          onClick={() => handleSelectSuggestion(item.trigger)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer border-none ${
                            isSelected ? 'bg-[#0e0a5c]/5 text-[#0e0a5c] font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#0e0a5c]/10 border-[#0e0a5c]/25 text-[#0e0a5c]' : 'bg-slate-50 border-slate-150 text-slate-400'
                            }`}>
                              {item.icon}
                            </div>
                            <div>
                              <div className="text-[11.5px] font-bold">{item.trigger}</div>
                              <div className={`text-[9.5px] font-medium ${isSelected ? 'text-[#0e0a5c]/70' : 'text-slate-400'}`}>{item.label}</div>
                            </div>
                          </div>
                          <span className={`text-[9.5px] font-mono pr-1 ${isSelected ? 'text-[#0e0a5c]/50' : 'text-slate-400/70'}`}>{item.desc}</span>
                        </button>
                      );
                    })}
                  {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                    .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-[11px] font-mono">No matching suggestions</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input box — premium glowing container */}
            <div className="w-full bg-white border border-slate-200/80 rounded-[26px] shadow-[0_10px_30px_rgba(14,10,92,0.04)] transition-all duration-300 focus-within:border-[#0e0a5c]/35 focus-within:shadow-[0_12px_36px_rgba(14,10,92,0.07)] flex flex-col relative overflow-visible">
              {/* Context tags row */}
              {attachedContexts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4.5 pt-3.5">
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
              {/* Textarea Wrapper */}
              <div className="px-4.5 pt-3.5 pb-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={formData.goal}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent border-none outline-none text-slate-800 text-[15px] placeholder:text-slate-400 py-0 font-sans font-normal resize-none overflow-hidden leading-relaxed"
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
              <div className="flex items-center justify-between px-4 pb-3 bg-transparent">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      uploadedFiles.length > 0
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Attach file"
                  >
                    <Plus size={15} strokeWidth={2.2} />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                  
                  <div className="h-4.5 w-[1px] bg-slate-200 mx-1" />
                  
                  <ModelSelector
                    byokMode={byokMode}
                    byokConfig={byokConfig}
                    onSelect={handleModelSelectChange}
                    variant="light"
                    compact={true}
                    dropdownPosition="top"
                  />
                  
                  <div className="h-4.5 w-[1px] bg-slate-200 mx-1" />
                  
                  <button
                    onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                    className={`h-8 px-3.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                      showSettingsPopover ? 'bg-[#0e0a5c]/10 text-[#0e0a5c] border-[#0e0a5c]/20' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚙️</span>
                    <span>{formData.depth}</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isListening
                        ? 'text-rose-500 bg-rose-500/10 animate-pulse border border-rose-500/20'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isListening ? "Stop dictating" : "Dictate (Speech-to-Text)"}
                  >
                    {isListening ? <MicOff size={15} strokeWidth={2} /> : <Mic size={15} strokeWidth={2} />}
                  </button>
                  <motion.button
                    onClick={() => formData.goal.trim() && handleCustomGoalSubmit(formData.goal)}
                    disabled={!formData.goal?.trim()}
                    whileHover={{ scale: formData.goal?.trim() ? 1.05 : 1 }}
                    whileTap={{ scale: formData.goal?.trim() ? 0.95 : 1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      formData.goal?.trim()
                        ? 'bg-[#0e0a5c] text-white shadow-md'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp size={15} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      ) : (
        <div className="flex h-full w-full overflow-hidden">
          {/* LEFT: Chat Panel */}
          <div
            className="flex-1 flex flex-col h-full relative bg-[#f4f7fc]/80 backdrop-blur-xl border-r border-slate-200/50"
          >
            {rightPaneState === 'compiling' && (
              <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#f4f8fe] to-[#e9f1fc] flex flex-col h-full animate-fadeIn">
                <HolographicCompiler terminalHistory={terminalHistory} />
              </div>
            )}
            


            {/* Chat Header — translucent glass */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 select-none border-b border-slate-200/60 bg-[#f4f7fc]/50 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3">
                {isSidebarCollapsed && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 mr-1"
                    title="Expand Sidebar"
                  >
                    <PanelLeftOpen size={15} strokeWidth={2.2} />
                  </button>
                )}
                <div className="relative">
                  <CortexLogo size="md" animate={isSaraTyping} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#f4f7fc] shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 leading-tight tracking-tight">
                    {selectedGoal ? selectedGoal.substring(0, 32) + (selectedGoal.length > 32 ? '...' : '') : 'Cortex AI'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium font-mono mt-0.5 tracking-wider">
                    {getActiveModelName()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-md border backdrop-blur-sm ${
                  conversationStage === 'greet' ? 'text-indigo-600 bg-indigo-50 border-indigo-100/50' :
                  conversationStage === 'ground' ? 'text-amber-600 bg-amber-50 border-amber-100/50' :
                  'text-emerald-600 bg-emerald-50 border-emerald-100/50'
                }`}>
                  {conversationStage}
                </span>
                <button
                  onClick={handleClearThread}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Clear Chat Thread"
                >
                  <X size={14} strokeWidth={2.2} />
                </button>
              </div>
            </div>
            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar min-h-0">
              <div className="max-w-2xl mx-auto w-full flex flex-col gap-7">
              {(() => {
                const latestGroundingMsg = [...messages].reverse().find(m => m.type === 'grounding');
                const latestGroundingId = latestGroundingMsg?.id;




                return (
                  <>
                    {messages.map((msg, idx) => {
                      const isModel = msg.role === 'model' || msg.role === 'assistant';
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut', delay: idx === messages.length - 1 ? 0 : 0 }}
                          className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                        >
                          {!isModel ? (
                            <div className="group max-w-[80%]">
                              <div className="bg-[#eef4ff] border border-indigo-100/50 rounded-2xl rounded-tr-sm px-4.5 py-3 text-[14.5px] text-[#0e0a5c] font-medium shadow-[0_2px_12px_rgba(14,10,92,0.02)] leading-relaxed relative overflow-hidden hover:border-indigo-200 transition-colors">
                                {msg.text}
                              </div>
                            </div>
                          ) : (
                            /* AI response — bubbleless, clean like Claude */
                            <div className="w-full flex flex-col gap-0 group/msg relative">
                              {/* Avatar row */}
                              <div className="flex items-center gap-2 mb-3">
                                <CortexLogo size="sm" animate={isSaraTyping && idx === messages.length - 1} />
                                <span className="text-[11px] font-bold text-[#0e0a5c] tracking-wider uppercase font-mono">Cortex</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] text-slate-400 font-medium">Assistant</span>
                              </div>
                              {/* Content — clean, no box, left border rail line */}
                              <div className="pl-4.5 border-l border-[#0e0a5c]/10 hover:border-[#0e0a5c]/25 transition-colors font-sans font-normal text-[14.5px] text-slate-800 leading-[1.8] tracking-[0.01em] relative">
                                <TypewriterMarkdown
                                  text={msg.text}
                                  msgId={msg.id}
                                  isLatest={idx === messages.length - 1 && (msg.role === 'model' || msg.role === 'assistant')}
                                  components={ChatMarkdownComponents}
                                />
                                
                                {/* Hover Action Row */}
                                <div className="absolute right-0 -bottom-8 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 bg-white/95 border border-slate-200/80 rounded-lg p-0.5 shadow-md z-20 backdrop-blur-sm text-slate-500">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.text);
                                      toast.success("Response copied to clipboard! 📋");
                                    }}
                                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Copy Response"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded text-slate-450 hover:text-emerald-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Good response"
                                    onClick={() => toast.success("Feedback recorded! Thank you. ❤️")}
                                  >
                                    <ThumbsUp size={11} />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded text-slate-450 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Bad response"
                                    onClick={() => toast.success("Feedback recorded! Thank you. ❤️")}
                                  >
                                    <ThumbsDown size={11} />
                                  </button>
                                </div>

                                {msg.warning && (
                                  <div className="mt-3.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-800 text-[12px] max-w-md w-full flex flex-col gap-1.5 shadow-sm relative overflow-hidden backdrop-blur-md">
                                    <div className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-amber-400 to-amber-500" />
                                    <div className="flex items-center gap-2 font-bold font-mono text-[10.5px] tracking-wider uppercase text-amber-600">
                                      <span>⚠️ System Warning: {msg.warning.title}</span>
                                    </div>
                                    <p className="font-sans font-medium text-slate-700 leading-relaxed text-[11.5px]">{msg.warning.message}</p>
                                    {msg.warning.code && (
                                      <code className="text-[10px] font-mono bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-600 select-all block mt-1">
                                        {msg.warning.code}
                                      </code>
                                    )}
                                  </div>
                                )}

                                {/* ─── SARA Qualification Flow Block ─── */}
                                {msg.qualificationData && (
                                  <div className="mt-3.5 p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm max-w-md w-full flex flex-col gap-3.5">
                                    <div className="text-[11.5px] font-black tracking-wide font-mono text-[#0e0a5c] uppercase flex items-center gap-1.5">
                                      <Sparkles size={11} className="text-[#0e0a5c]" />
                                      {msg.qualificationData.question}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {msg.qualificationData.choices.map((choice) => {
                                        const isSelected = msg.selectedChoiceId === choice.id;
                                        const isAnySelected = Boolean(msg.selectedChoiceId);
                                        return (
                                          <button
                                            key={choice.id}
                                            disabled={isAnySelected}
                                            onClick={() => handleResolveQualification(msg.id, choice.id, choice.text, idx)}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-[11px] font-bold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                              isSelected
                                                ? 'bg-indigo-50/20 border-indigo-500 text-indigo-700 shadow-sm'
                                                : isAnySelected
                                                ? 'bg-transparent border-slate-100 text-slate-300 cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 hover:translate-x-1'
                                            }`}
                                          >
                                            <span>{choice.text}</span>
                                            {isSelected && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* ─── Swarm Active Agents Workflow Panel ─── */}
                                {msg.activeAgents && msg.activeAgents.length > 0 && msg.isGenerating && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-3.5 p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-sm max-w-md w-full"
                                  >
                                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 flex items-center gap-1.5">
                                        <span className="flex h-2 w-2 relative">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        Swarm Agent Fleet Activity
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400">
                                        {msg.completedAgents?.length || 0} / {msg.activeAgents.length} completed
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {msg.activeAgents.map((agentName) => {
                                        const isCompleted = msg.completedAgents?.includes(agentName);
                                        return (
                                          <div key={agentName} className="flex items-center justify-between text-[11.5px] font-medium py-1">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${
                                                isCompleted 
                                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                                  : 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                                              }`} />
                                              <span className={`font-mono text-[11px] ${
                                                isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                                              }`}>
                                                {agentName}
                                              </span>
                                            </div>
                                            <div>
                                              {isCompleted ? (
                                                <span className="text-emerald-700 font-mono text-[10px] bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded font-bold">
                                                  ✓ Done
                                                </span>
                                              ) : (
                                                <span className="text-indigo-700 font-mono text-[10px] bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded animate-pulse font-bold">
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
                                {!msg.isGenerating && msg.payloadData && (
                                  <AnimatePresence>
                                    <SwarmBentoGrid payload={msg.payloadData} />
                                  </AnimatePresence>
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
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 hover:text-slate-900 text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                                          >
                                            {choice}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {msg.interactive_block.type === 'inline_challenge' && msg.interactive_block.data && (
                                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 max-w-md w-full shadow-sm">
                                        <div className="text-[12px] font-extrabold mb-3 text-[#0e0a5c]">
                                          🧠 Quick Quiz: {msg.interactive_block.data.question}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          {Array.isArray(msg.interactive_block.data.options) && msg.interactive_block.data.options.map((opt: string, optIdx: number) => (
                                            <button
                                              key={optIdx}
                                              onClick={() => handleCustomGoalSubmit(`Answer: ${opt}`)}
                                              className="w-full text-left px-3.5 py-2.5 rounded-lg border bg-white border-slate-250 text-slate-700 hover:bg-[#0e0a5c]/5 hover:text-[#0e0a5c] hover:border-[#0e0a5c]/25 text-[11px] font-semibold transition-all hover:translate-x-1 duration-150 cursor-pointer shadow-sm"
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
                                    className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100 w-full"
                                  >
                                    {suggestionCards.map((card, idx) => (
                                      <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 + idx * 0.05, duration: 0.25 }}
                                        whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                                        onClick={() => handleSelectTemplate(card)}
                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/85 bg-white hover:bg-slate-50 hover:border-slate-300 text-left transition-colors duration-150 cursor-pointer relative overflow-hidden group shadow-sm"
                                        style={{ borderLeft: `2px solid ${card.accentColor}30` }}
                                      >
                                        <div
                                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0"
                                          style={{ background: `${card.accentColor}15`, color: card.accentColor }}
                                        >
                                          {card.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[11px] font-bold text-slate-700 truncate">{card.title}</div>
                                          <div className="text-[9.5px] font-medium text-slate-450 truncate mt-0.5">{card.subtitle}</div>
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
                                    className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100 w-full"
                                  >
                                    <div>
                                      <label className="text-[9.5px] font-bold uppercase tracking-wider block mb-1.5 font-mono text-slate-450">
                                        Custom Guidelines
                                      </label>
                                      <textarea
                                        value={formData.resources}
                                        onChange={e => setFormData(prev => ({ ...prev, resources: e.target.value }))}
                                        placeholder="Optional guidelines, constraints, focus areas..."
                                        className="w-full h-20 bg-white border border-slate-200 rounded-xl p-3 text-[11.5px] font-medium placeholder:text-slate-400 outline-none resize-none focus:border-[#0e0a5c]/35 focus:bg-white text-slate-800 transition-colors shadow-sm"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border text-[11.5px] font-bold cursor-pointer transition-all ${
                                          uploadedFiles.length > 0
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100/60'
                                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-350 shadow-sm'
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
                                        className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-[#0e0a5c] text-white hover:bg-[#0e0a5c]/90 font-mono text-[11.5px] font-bold cursor-pointer transition-all shadow-md active:scale-[0.98] border border-transparent"
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
                        <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(14,10,92,0.03)]">
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff] shadow-[0_0_4px_rgba(78,91,255,0.6)]" />
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff] shadow-[0_0_4px_rgba(78,91,255,0.6)]" />
                          <span className="cortex-typing-dot w-1.5 h-1.5 rounded-full bg-[#4e5bff] shadow-[0_0_4px_rgba(78,91,255,0.6)]" />
                        </div>
                      </motion.div>
                    )}
                  </>
                );
              })()}
              <div ref={chatEndRef} />
              </div>
            </div>
            {/* Bottom Input — frosted glass */}
            <div className="px-4 pb-5 pt-3 shrink-0 relative z-25">
              <div className="max-w-3xl mx-auto w-full flex flex-col gap-2 relative">
                <AnimatePresence>
                  {showSettingsPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl p-4 bg-white border border-slate-200/80 text-slate-800 shadow-2xl z-50 flex flex-col gap-2.5 max-w-[800px] mx-auto"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-slate-500">
                          <Sparkles size={11} className="text-[#4e5bff]" />
                          Compiler Options
                        </span>
                        <button onClick={() => setShowSettingsPopover(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
                          {/* Column 1: Schedule & Target */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600">Schedule & Target</span>
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
                            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-600">Cognitive & Tutor</span>
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
                            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-pink-650">Advanced (Optional)</span>
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
                      className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl p-1 bg-white border border-slate-200/80 text-slate-800 shadow-2xl z-50 flex flex-col max-h-[220px] overflow-y-auto"
                    >
                      <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-slate-400 uppercase border-b border-slate-100 mb-1">
                        {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                      </div>
                      {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                        .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                        .map((item, idx) => {
                          const isSelected = idx === slashSelectedIndex;
                          return (
                            <button
                              key={item.trigger}
                              onClick={() => handleSelectSuggestion(item.trigger)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer border-none ${
                                isSelected ? 'bg-[#0e0a5c]/5 text-[#0e0a5c] font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-[#0e0a5c]/10 border-[#0e0a5c]/25 text-[#0e0a5c]' : 'bg-slate-50 border-slate-150 text-slate-400'
                                }`}>
                                  {item.icon}
                                </div>
                                <div>
                                  <div className="text-[11.5px] font-bold">{item.trigger}</div>
                                  <div className={`text-[9.5px] font-medium ${isSelected ? 'text-[#0e0a5c]/70' : 'text-slate-400'}`}>{item.label}</div>
                                </div>
                              </div>
                              <span className={`text-[9.5px] font-mono pr-1 ${isSelected ? 'text-[#0e0a5c]/50' : 'text-slate-400/70'}`}>{item.desc}</span>
                            </button>
                          );
                        })}
                      {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                        .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                        <div className="p-3 text-center text-slate-400 text-[11px] font-mono">No matching suggestions</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Follow-up input — premium glowing container */}
                <div className="bg-white border border-slate-200/80 rounded-[26px] shadow-[0_10px_30px_rgba(14,10,92,0.04)] transition-all duration-300 focus-within:border-[#0e0a5c]/35 focus-within:shadow-[0_12px_36px_rgba(14,10,92,0.07)] flex flex-col relative overflow-visible">
                  {/* Context tags */}
                  {attachedContexts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4.5 pt-3.5">
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
                  <div className="px-4.5 pt-3.5 pb-1">
                    <textarea
                      ref={followUpTextareaRef}
                      rows={1}
                      value={formData.goal}
                      onChange={e => handleInputChange(e.target.value)}
                      placeholder={compiledPath ? "Refine your learning path..." : "Ask a follow-up..."}
                      className="w-full bg-transparent border-none outline-none text-[15px] font-normal text-slate-800 placeholder:text-slate-400 py-0 font-sans resize-none overflow-hidden leading-relaxed"
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
                  <div className="flex items-center justify-between px-4 pb-3 bg-transparent">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => fileInputRef.current?.click()} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${uploadedFiles.length > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} title="Attach file">
                        <Plus size={15} strokeWidth={2.2} />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                      
                      <div className="h-4.5 w-[1px] bg-slate-200 mx-1" />
                      <ModelSelector
                        byokMode={byokMode}
                        byokConfig={byokConfig}
                        onSelect={handleModelSelectChange}
                        variant="light"
                        compact={true}
                        dropdownPosition="top"
                      />
                      {compiledPath && (
                        <>
                          <div className="h-4.5 w-[1px] bg-slate-200 mx-1" />
                          <span className="text-[9px] font-bold uppercase font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">📎 Blueprint</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} className={`h-8 px-3.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${showSettingsPopover ? 'bg-[#0e0a5c]/10 text-[#0e0a5c] border-[#0e0a5c]/20' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100'}`}>
                        <span>⚙️</span>
                        <span>{formData.depth}</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isListening
                            ? 'text-rose-500 bg-rose-500/10 animate-pulse border border-rose-500/20'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title={isListening ? "Stop dictating" : "Dictate (Speech-to-Text)"}
                      >
                        {isListening ? <MicOff size={15} strokeWidth={2} /> : <Mic size={15} strokeWidth={2} />}
                      </button>
                      <motion.button
                        onClick={() => handleCustomGoalSubmit(formData.goal)}
                        disabled={!formData.goal || !formData.goal.trim()}
                        whileHover={{ scale: formData.goal?.trim() ? 1.05 : 1 }}
                        whileTap={{ scale: formData.goal?.trim() ? 0.95 : 1 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          formData.goal?.trim()
                            ? 'bg-[#0e0a5c] text-white shadow-md'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUp size={15} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between text-[9.5px] text-[#a5b4fc]/40 font-mono px-1 select-none">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Local Workspace</span>
                  {uploadedFiles.length > 0 && <span className="text-emerald-400 font-medium truncate max-w-[150px]">📎 {uploadedFiles.length} file(s)</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePath;
