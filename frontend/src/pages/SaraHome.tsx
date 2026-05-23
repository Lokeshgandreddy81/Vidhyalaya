import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  MessageSquare,
  Sparkles,
  Brain,
  Database,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react';

// ── Floating preview card items ────────────────────────────────────────────────
const VAULT_DOCS = [
  { name: 'Data Structures', tag: 'CS-301' },
  { name: 'Machine Learning', tag: 'CS-603' },
  { name: 'Algorithms', tag: 'CS-401' },
  { name: 'Cloud Computing', tag: 'CS-702' },
];

const CHAT_BUBBLES = [
  { from: 'user', text: 'Explain dynamic programming with an example.' },
  { from: 'sara', text: 'Dynamic programming solves complex problems by breaking them into overlapping sub-problems. Consider Fibonacci: fib(n) = fib(n-1) + fib(n-2)…' },
  { from: 'user', text: 'Generate flashcards for this chapter.' },
];

const FEATURE_CHIPS = [
  { icon: Brain, label: 'AI-Powered RAG' },
  { icon: Database, label: 'Institutional Sync' },
  { icon: Lock, label: 'University-Verified' },
  { icon: Layers, label: 'Semester-Aware' },
];

// ── Component ──────────────────────────────────────────────────────────────────
const SaraHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex items-center justify-center p-8 lg:p-16 overflow-y-auto relative">

      {/* Ambient gradient orbs — matching the soft cyan/indigo palette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-cyan-300/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-400/20 blur-[100px]" />
        <div className="absolute -bottom-16 left-1/3 w-[360px] h-[360px] rounded-full bg-blue-300/15 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* ── LEFT: Brand Statement ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-start gap-6"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/70 backdrop-blur-sm border border-indigo-200/60">
            <Sparkles size={12} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-700">Cortex Campus Vault</span>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
              Your Curriculum.
            </h1>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
              Supercharged.
            </h1>
          </div>

          {/* Description */}
          <p className="text-slate-500 text-lg leading-relaxed max-w-md font-medium">
            University Vault connects your institution's entire semester syllabus directly to SARA's AI engine. Ask anything, generate flashcards, and deeply understand every topic — all grounded in your verified academic materials.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2">
            {FEATURE_CHIPS.map((chip) => (
              <div key={chip.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm">
                <chip.icon size={12} className="text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700">{chip.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/sara/vault')}
            className="mt-2 group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-xl shadow-indigo-500/30 font-bold text-[15px] tracking-tight hover:shadow-indigo-500/50 transition-all duration-300"
          >
            <span>Open University Vault</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight size={16} />
            </div>
          </motion.button>

          {/* Sub-action */}
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors group"
          >
            <span>Not synced yet? Connect your university</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* ── RIGHT: Floating Interface Preview Card ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-indigo-400/30 to-cyan-400/20 blur-2xl scale-105" />

          {/* The preview card */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full max-w-md bg-white/60 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_20px_60px_rgba(79,70,229,0.15)] overflow-hidden"
          >
            {/* Card header bar */}
            <div className="h-10 bg-white/80 border-b border-white/40 flex items-center px-4 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="ml-3 flex-1 h-5 bg-slate-100 rounded-md" />
            </div>

            {/* 3-panel mini preview */}
            <div className="flex h-64">

              {/* Left: Vault doc list */}
              <div className="w-1/3 border-r border-white/30 p-3 space-y-2 bg-white/30">
                <div className="flex items-center gap-1.5 mb-3">
                  <Database size={11} className="text-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Vault</span>
                </div>
                {VAULT_DOCS.map((doc) => (
                  <div key={doc.name} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/50 border border-white/40">
                    <FileText size={10} className="text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-bold text-slate-700 truncate">{doc.name}</div>
                      <div className="text-[7px] text-slate-400">{doc.tag}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center: Document lines */}
              <div className="flex-1 border-r border-white/30 p-3 bg-white/20">
                <div className="space-y-2 mt-2">
                  {[100, 80, 95, 65, 88, 72, 90, 55].map((w, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full bg-slate-200"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  {[75, 90, 60].map((w, i) => (
                    <div key={i} className="h-1.5 rounded-full bg-indigo-100" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>

              {/* Right: Chat bubbles */}
              <div className="w-1/3 p-2.5 space-y-2 bg-white/10">
                <div className="flex items-center gap-1 mb-2">
                  <MessageSquare size={10} className="text-violet-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-violet-600">SARA</span>
                </div>
                {CHAT_BUBBLES.map((b, i) => (
                  <div
                    key={i}
                    className={`text-[7px] font-medium leading-relaxed px-2 py-1.5 rounded-xl max-w-[90%] ${
                      b.from === 'user'
                        ? 'ml-auto bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white/70 text-slate-700 rounded-bl-sm'
                    }`}
                  >
                    {b.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA strip */}
            <div className="h-10 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border-t border-white/30 flex items-center justify-center gap-2">
              <Sparkles size={11} className="text-indigo-600" />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">AI-Powered Study Interface</span>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default SaraHome;
