import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Brain, BookOpen, Monitor, Target, Zap, Shield, ArrowUpRight } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   BENTO CARD — With cursor-tracking radial glow AND border gradient
   ═══════════════════════════════════════════════════════════════════════════ */
const BentoCard = ({ children, className = '' }) => {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`bento-card p-6 md:p-8 group ${className}`}
    >
      {children}
    </div>
  );
};

/* ── Mini Canvas: Neural Nodes ── */
const MiniNeuralViz = () => {
  const ref = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const nodes = Array.from({ length: 16 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, w, h);

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 80) {
            const pulse = (Math.sin(t * 2 + i + j) + 1) / 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 + pulse * 0.08})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        n.x += Math.sin(t + n.phase) * 0.15;
        n.y += Math.cos(t * 0.8 + n.phase) * 0.15;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, 0.5)`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={ref} className="w-full h-full" style={{ willChange: 'transform' }} />;
};

/* ── Mini: Mastery Progress Bars ── */
const MiniMasteryBars = () => {
  const [values] = useState(() => [72, 45, 89, 31, 67]);
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[9px] text-zinc-600 mono w-8">M{i + 1}</span>
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${v}%` }}
              transition={{ duration: 1.5, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, rgba(99,102,241,0.6), rgba(168,85,247,${0.3 + v / 200}))`,
              }}
            />
          </div>
          <span className="text-[9px] text-zinc-500 mono w-8 text-right">{v}%</span>
        </div>
      ))}
    </div>
  );
};

/* ── Mini: Live Token Stream ── */
const MiniTokenStream = () => {
  const [chars, setChars] = useState(0);
  const text = "Synthesizing path: CAP theorem → Consensus → Raft → Storage patterns → Fault tolerance → Capstone project...";
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % (text.length + 30); // Loop with pause
      setChars(Math.min(i, text.length));
    }, 40);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
      <p className={`text-[11px] text-zinc-500 mono leading-relaxed ${chars < text.length ? 'streaming-cursor' : ''}`}>
        {text.slice(0, chars)}
      </p>
    </div>
  );
};

/* ── Animated Counter ── */
const AnimCounter = ({ value, suffix = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1800, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
};

/* ═══════════════════════════════════════════════════════════════════════════
   BENTO GRID SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
const WorkSection = () => {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  const features = [
    {
      icon: Brain,
      title: 'Neural Map',
      desc: 'Interactive knowledge graphs that visualize every concept relationship. Nodes are explorable, edges show dependency weight.',
      tags: ['Visualization', 'Graph', 'Interactive'],
      span: 'md:col-span-2 md:row-span-2',
      highlight: true,
      visual: 'neural',
    },
    {
      icon: Monitor,
      title: 'Smartboard',
      desc: 'AI synthesis converts video transcripts into actionable timelines with embedded notes.',
      tags: ['Real-time', 'Synthesis'],
      visual: 'stream',
    },
    {
      icon: BookOpen,
      title: 'The Archive',
      desc: 'Every path persists as a searchable, navigable knowledge repository.',
      tags: ['Persistence', 'Search'],
    },
    {
      icon: Target,
      title: 'Adaptive Paths',
      desc: 'Non-linear curricula that adapt to your mastery velocity. AI re-sequences modules based on performance.',
      tags: ['Gemini', 'Adaptive'],
      visual: 'bars',
    },
    {
      icon: Zap,
      title: 'Exam Engine',
      desc: 'AI-generated assessments that probe depth, not memorization. Focus mode eliminates distractions.',
      tags: ['Assessment', 'Focus'],
    },
    {
      icon: Shield,
      title: 'Verified Sources',
      desc: 'Zero hallucinated citations. Every resource is manually verified. Dead links are architecturally impossible.',
      tags: ['Trust', 'Accuracy'],
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <section id="product" ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="text-[12px] text-indigo-400 mono uppercase tracking-wider mb-4 block">
            Product
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-[-0.03em] max-w-2xl mb-6">
            Six systems. One engine.
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-xl leading-relaxed">
            Modular subsystems that handle every dimension of learning — from synthesis to assessment.
          </p>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 py-8 border-y border-white/[0.04]">
          {[
            { label: 'Active Paths', value: 2847, suffix: '+' },
            { label: 'Modules Generated', value: 18400, suffix: '+' },
            { label: 'Mastery Rate', value: 94, suffix: '%' },
            { label: 'P95 Latency', value: 120, suffix: 'ms' },
          ].map((m, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight mono">
                <AnimCounter value={m.value} suffix={m.suffix} />
              </div>
              <div className="text-[11px] text-zinc-600 mt-1.5 uppercase tracking-wider mono">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {features.map((feat, i) => (
            <motion.div key={i} variants={itemVariants} className={feat.span || ''}>
              <BentoCard className="h-full flex flex-col">
                {/* Visual — mini-animation inside the card */}
                {feat.visual && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.01]" style={{ height: feat.span ? '200px' : '120px' }}>
                    {feat.visual === 'neural' && <MiniNeuralViz />}
                    {feat.visual === 'bars' && <div className="p-4 pt-5"><MiniMasteryBars /></div>}
                    {feat.visual === 'stream' && <div className="p-3"><MiniTokenStream /></div>}
                  </div>
                )}

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    feat.highlight
                      ? 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20'
                      : 'bg-white/[0.03] border border-white/[0.06]'
                  }`}>
                    <feat.icon size={16} className={feat.highlight ? 'text-indigo-400' : 'text-zinc-500'} />
                  </div>
                  <h3 className="text-[16px] font-semibold text-white tracking-tight flex items-center gap-2">
                    {feat.title}
                    <ArrowUpRight size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </h3>
                </div>

                <p className="text-[13px] text-zinc-500 leading-relaxed mb-5 flex-1">{feat.desc}</p>

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap">
                  {feat.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/[0.05] text-[10px] text-zinc-600 mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </BentoCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WorkSection;