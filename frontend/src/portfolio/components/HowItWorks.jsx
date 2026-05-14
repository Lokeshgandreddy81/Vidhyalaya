import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageSquare, Cpu, Map, CheckCircle2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — Scroll-Driven Morphing Section
   As the user scrolls, the UI morphs through 3 steps showing exactly 
   how Vidhyalaya processes a request. Not just text — the visual state 
   of a demo card TRANSFORMS at each step.
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  {
    num: '01',
    icon: MessageSquare,
    title: 'Describe your goal',
    desc: 'Type what you want to learn in plain language. No structure needed — the AI handles decomposition.',
    visual: 'input',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'AI architects your path',
    desc: 'Gemini 2.5 Flash analyzes your goal, decomposes it into phases, and maps module dependencies.',
    visual: 'processing',
  },
  {
    num: '03',
    icon: Map,
    title: 'Learn with precision',
    desc: 'Your personalized path is ready — with neural maps, smartboards, verified resources, and mastery tracking.',
    visual: 'output',
  },
];

/* ── Mini visualizations for each step ── */
const StepVisual = ({ type, progress }) => {
  if (type === 'input') {
    return (
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[8px] text-white font-bold">U</div>
          <span className="text-[11px] text-zinc-500 mono">user prompt</span>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <motion.p 
            className="text-[13px] text-zinc-300 mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            "I want to deeply understand how databases work, from B-trees to query optimization"
          </motion.p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-400/70 mono">Natural language parsed</span>
        </div>
      </div>
    );
  }

  if (type === 'processing') {
    return (
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={14} className="text-indigo-400" />
          <span className="text-[11px] text-zinc-500 mono">gemini-2.5-flash processing</span>
        </div>
        {[
          { label: 'Decomposing subject graph', done: true },
          { label: 'Mapping prerequisite chains', done: true },
          { label: 'Generating 4-phase curriculum', done: progress > 0.3 },
          { label: 'Scouting verified resources', done: progress > 0.6 },
          { label: 'Building neural map nodes', active: progress > 0.5 && progress < 0.9 },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              step.done ? 'bg-emerald-500/20 border border-emerald-500/40' :
              step.active ? 'bg-indigo-500/20 border border-indigo-500/40' :
              'bg-white/[0.03] border border-white/[0.06]'
            }`}>
              {step.done ? (
                <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#34d399" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
              ) : step.active ? (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              ) : (
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
              )}
            </div>
            <span className={`text-[12px] mono ${step.done ? 'text-zinc-400' : step.active ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // output
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-zinc-500 mono">Generated Path</span>
        <span className="text-[10px] text-emerald-400/70 mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ready
        </span>
      </div>
      {[
        { phase: 'Foundations', modules: 4, color: 'from-blue-500/20 to-blue-500/5' },
        { phase: 'Core Systems', modules: 6, color: 'from-violet-500/20 to-violet-500/5' },
        { phase: 'Optimization', modules: 5, color: 'from-purple-500/20 to-purple-500/5' },
        { phase: 'Capstone', modules: 2, color: 'from-emerald-500/20 to-emerald-500/5' },
      ].map((p, i) => (
        <div key={i} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${p.color} border border-white/[0.04]`}>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-zinc-600 mono">P{i + 1}</span>
            <span className="text-[13px] text-zinc-300 font-medium">{p.phase}</span>
          </div>
          <span className="text-[11px] text-zinc-500 mono">{p.modules} modules</span>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
        <span className="text-[10px] text-zinc-600 mono">17 modules</span>
        <span className="text-zinc-800">·</span>
        <span className="text-[10px] text-zinc-600 mono">12 neural nodes</span>
        <span className="text-zinc-800">·</span>
        <span className="text-[10px] text-zinc-600 mono">~4 weeks</span>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Map scroll to active step (0, 1, 2)
  const rawStep = useTransform(scrollYProgress, [0.15, 0.35, 0.5, 0.65, 0.75, 0.85], [0, 0, 1, 1, 2, 2]);
  const stepProgress = useTransform(scrollYProgress, [0.15, 0.85], [0, 1]);

  return (
    <section id="how-it-works" ref={containerRef} className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="mb-20">
          <span className="text-[12px] text-indigo-400 mono uppercase tracking-wider mb-4 block">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-[-0.03em] max-w-2xl mb-6">
            From question to mastery in three steps
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-xl leading-relaxed">
            No manual curriculum building. No searching for resources. Just describe your goal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Steps */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                style={{
                  opacity: useTransform(rawStep, v => {
                    const dist = Math.abs(v - i);
                    return dist < 0.5 ? 1 : 0.3;
                  }),
                }}
                className="p-6 rounded-2xl border border-transparent transition-colors duration-500"
              >
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <step.icon size={18} className="text-zinc-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] text-indigo-400 mono">{step.num}</span>
                      <h3 className="text-xl font-semibold text-white tracking-tight">{step.title}</h3>
                    </div>
                    <p className="text-[14px] text-zinc-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Progress bar */}
            <div className="ml-5 mt-6">
              <div className="w-full h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  style={{ scaleX: stepProgress }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 origin-left"
                />
              </div>
            </div>
          </div>

          {/* Right: Morphing Visual Card */}
          <div className="lg:sticky lg:top-32">
            <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-2xl overflow-hidden min-h-[380px]">
              {/* Tab bar */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04]">
                {steps.map((s, i) => (
                  <motion.button
                    key={i}
                    style={{
                      color: useTransform(rawStep, v => Math.abs(v - i) < 0.5 ? '#e4e4e7' : '#3f3f46'),
                    }}
                    className="text-[11px] mono cursor-default bg-transparent border-none"
                  >
                    Step {s.num}
                  </motion.button>
                ))}
              </div>

              {/* Visual Content — morphs per step */}
              <motion.div className="relative">
                {steps.map((s, i) => (
                  <motion.div
                    key={i}
                    style={{
                      opacity: useTransform(rawStep, v => Math.abs(v - i) < 0.5 ? 1 : 0),
                      display: useTransform(rawStep, v => Math.abs(v - i) < 0.5 ? 'block' : 'none'),
                    }}
                  >
                    <StepVisual type={s.visual} progress={useTransform(scrollYProgress, [0.3 + i * 0.2, 0.5 + i * 0.2], [0, 1])} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
