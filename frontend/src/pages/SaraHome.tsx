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

const SaraHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="w-full h-full flex items-center justify-center p-8 lg:p-16 overflow-y-auto"
      style={{ background: 'transparent' }}
    >
      <div className="relative z-10 w-full max-w-[1060px] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* ── LEFT: Brand Statement ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start gap-6"
        >
          {/* Eyebrow */}
          <p className="app-label">Cortex · Campus Vault</p>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="app-h1 text-[36px] lg:text-[44px] leading-tight">
              Your Curriculum.<br />
              <span style={{ color: '#4e5bff' }}>Supercharged.</span>
            </h1>
          </div>

          {/* Description */}
          <p 
            className="text-[15px] leading-relaxed"
            style={{ color: 'rgba(13,13,13,0.62)', fontFamily: "'Inter', sans-serif" }}
          >
            University Vault connects your institution's entire semester syllabus directly to SARA's AI engine. Ask anything, generate flashcards, and deeply understand every topic — all grounded in your verified academic materials.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2">
            {FEATURE_CHIPS.map((chip) => (
              <div 
                key={chip.label} 
                className="flex items-center gap-1.5 px-3 py-1.5"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(13,13,13,0.08)',
                  borderRadius: 999,
                }}
              >
                <chip.icon size={12} className="shrink-0" style={{ color: '#4e5bff' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'rgba(13,13,13,0.72)' }}>{chip.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => navigate('/sara/vault')}
              className="app-btn-accent h-11 px-6 text-[14px]"
            >
              <span>Open University Vault</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="app-btn-ghost h-11 px-6 text-[14px] flex items-center gap-2"
            >
              <span>Connect your university</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                In Dev
              </span>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* ── RIGHT: Floating Interface Preview Card ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Subtle outer shadow ring */}
          <div 
            className="absolute inset-0 rounded-[12px] blur-2xl opacity-40 scale-105" 
            style={{ background: 'rgba(78,91,255,0.15)' }}
          />

          {/* The preview card */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full max-w-md overflow-hidden"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(13,13,13,0.08)',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(13,23,48,0.08)',
            }}
          >
            {/* Card header bar */}
            <div 
              className="h-10 border-b flex items-center px-4 gap-1.5 bg-[#f7f8fa]"
              style={{ borderColor: 'rgba(13,13,13,0.08)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(13,13,13,0.16)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(13,13,13,0.12)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(13,13,13,0.08)' }} />
              <div className="ml-3 flex-1 h-5 rounded-md" style={{ background: 'rgba(13,13,13,0.04)' }} />
            </div>

            {/* 3-panel mini preview */}
            <div className="flex h-64">

              {/* Left: Vault doc list */}
              <div 
                className="w-1/3 border-r p-3 space-y-2"
                style={{ borderColor: 'rgba(13,13,13,0.08)', background: '#f7f8fa' }}
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Database size={11} style={{ color: '#4e5bff' }} />
                  <span className="app-label text-[10px] tracking-wide" style={{ color: 'rgba(13,13,13,0.6)' }}>Vault</span>
                </div>
                {VAULT_DOCS.map((doc) => (
                  <div 
                    key={doc.name} 
                    className="flex items-center gap-1.5 p-1.5"
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(13,13,13,0.08)',
                      borderRadius: 6,
                    }}
                  >
                    <FileText size={10} className="shrink-0" style={{ color: 'rgba(13,13,13,0.48)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold truncate" style={{ color: '#0d0d0d' }}>{doc.name}</div>
                      <div className="text-[9px]" style={{ color: 'rgba(13,13,13,0.4)' }}>{doc.tag}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center: Document lines */}
              <div className="flex-1 border-r p-3 bg-white" style={{ borderColor: 'rgba(13,13,13,0.08)' }}>
                <div className="space-y-2 mt-2">
                  {[100, 80, 95, 65, 88, 72, 90, 55].map((w, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full"
                      style={{ width: `${w}%`, background: 'rgba(13,13,13,0.06)' }}
                    />
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  {[75, 90, 60].map((w, i) => (
                    <div 
                      key={i} 
                      className="h-1.5 rounded-full" 
                      style={{ width: `${w}%`, background: 'rgba(78,91,255,0.08)' }} 
                    />
                  ))}
                </div>
              </div>

              {/* Right: Chat bubbles */}
              <div className="w-1/3 p-2.5 space-y-2 bg-[#f7f8fa]">
                <div className="flex items-center gap-1 mb-2">
                  <MessageSquare size={10} style={{ color: '#4e5bff' }} />
                  <span className="app-label text-[10px] tracking-wide" style={{ color: 'rgba(13,13,13,0.6)' }}>SARA</span>
                </div>
                {CHAT_BUBBLES.map((b, i) => (
                  <div
                    key={i}
                    className="text-[10px] leading-relaxed px-2 py-1.5 rounded-lg max-w-[90%]"
                    style={{
                      background: b.from === 'user' ? '#0d0d0d' : '#ffffff',
                      color: b.from === 'user' ? '#ffffff' : '#0d0d0d',
                      border: b.from === 'user' ? 'none' : '1px solid rgba(13,13,13,0.06)',
                      borderRadius: b.from === 'user' ? '8px 8px 0 8px' : '8px 8px 8px 0',
                    }}
                  >
                    {b.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA strip */}
            <div 
              className="h-10 border-t flex items-center justify-center gap-2 bg-[#f7f8fa]"
              style={{ borderColor: 'rgba(13,13,13,0.08)' }}
            >
              <Sparkles size={11} style={{ color: '#4e5bff' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(13,13,13,0.6)' }}>AI-Powered Study Workspace</span>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default SaraHome;
