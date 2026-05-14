import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-TYPING CODE BLOCK
   Code doesn't just appear — it types itself like a live terminal.
   Each block starts typing when it scrolls into view.
   ═══════════════════════════════════════════════════════════════════════════ */
const AutoTypeCode = ({ code, language = 'typescript' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i < code.length) {
        setDisplayed(code.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
        setDone(true);
      }
    }, 15);
    return () => clearInterval(iv);
  }, [inView, code]);

  return (
    <div ref={ref} className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-zinc-700 mono">{language}</span>
      </div>
      {/* Code content */}
      <div className="p-5 overflow-x-auto">
        <pre className={`text-[12px] leading-[1.8] mono whitespace-pre ${done ? 'text-zinc-400' : 'text-zinc-500 streaming-cursor'}`}>
          {displayed || <span className="text-zinc-800">// loading...</span>}
        </pre>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ARCHITECTURE BLOCK
   ═══════════════════════════════════════════════════════════════════════════ */
const ArchBlock = ({ num, title, content, code, language }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-16 border-b border-white/[0.04] last:border-b-0"
    >
      {/* Text */}
      <div className="flex gap-6">
        <span className="text-[13px] text-zinc-700 mono shrink-0 pt-1">{num}</span>
        <div>
          <h3 className="text-2xl font-semibold text-white tracking-[-0.02em] mb-4">{title}</h3>
          <p className="text-[15px] text-zinc-400 leading-[1.7]">{content}</p>
        </div>
      </div>

      {/* Auto-typing Code */}
      <AutoTypeCode code={code} language={language} />
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ABOUT SECTION — Architecture Documentation
   ═══════════════════════════════════════════════════════════════════════════ */
const AboutSection = () => {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: '-100px' });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ['0%', '100%']);

  const blocks = [
    {
      num: '01',
      title: 'Gemini-Powered Path Synthesis',
      language: 'geminiService.ts',
      content: 'Every path is synthesized by Gemini 2.5 Flash with a 1.5-second request queue for quota management. The AI decomposes goals into phased modules with explicit dependency tracking — no module starts until its prerequisites are met.',
      code: `// geminiService.ts — path synthesis pipeline
const synthesizePath = async (goal: string) => {
  const response = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: goal }]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: PathSchema,
      temperature: 0.7,
    },
    systemInstruction: SCHOLAR_SYSTEM_PROMPT,
  });

  // Parse & validate against types.ts
  const path = JSON.parse(response.text());
  validateModuleDependencies(path.phases);
  return path;
};`,
    },
    {
      num: '02',
      title: 'Type-Safe State Architecture',
      language: 'Store.tsx',
      content: 'The Store is the single source of truth. All data flows through types.ts. Optimistic updates hit the UI instantly while MongoDB syncs in the background. Zero unsafe casts. Zero runtime type errors.',
      code: `// context/Store.tsx — optimistic update pattern
interface AppState {
  paths: LearningPath[];
  activePath: string | null;
  sessions: ScheduledSession[];
}

const updateModule = (
  pathId: string,
  moduleId: string,
  data: Partial<Module>
) => {
  // 1. Optimistic: update UI immediately
  setPaths(prev => prev.map(p =>
    p.id === pathId
      ? { ...p, modules: updateNested(p.modules, moduleId, data) }
      : p
  ));

  // 2. Persist: sync to MongoDB Atlas
  api.updatePath(pathId, { moduleId, ...data })
     .catch(rollback);
};`,
    },
    {
      num: '03',
      title: 'Zero-Hallucination Resource Pipeline',
      language: 'verification.ts',
      content: 'Unlike every other AI tool, Vidhyalaya never fabricates URLs. Google Search grounding is disabled. Every resource is either manually curated or sourced from a verified library with real YouTube video IDs. Dead links are architecturally impossible.',
      code: `// Resource verification — no AI-generated URLs
interface VerifiedResource {
  type: 'youtube' | 'article' | 'paper';
  videoId?: string;        // real, verified
  title: string;
  source: string;
  isVerified: true;        // literal type — always true
  verifiedAt: string;      // ISO timestamp
}

// This function is called BEFORE any resource
// is shown to the user. Period.
const verifyResource = (r: Resource): boolean => {
  if (r.type === 'youtube') {
    return CURATED_VIDEO_IDS.has(r.videoId);
  }
  return VERIFIED_URLS.has(r.url);
};`,
    },
  ];

  return (
    <section id="architecture" ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Scroll progress line */}
      <div className="absolute left-8 top-0 bottom-0 w-px hidden lg:block">
        <div className="absolute inset-0 bg-white/[0.03]" />
        <motion.div
          style={{ height: lineHeight }}
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-indigo-500 to-violet-500"
          layoutId="scroll-progress"
        />
        {/* Glowing dot at the tip */}
        <motion.div
          style={{ top: lineHeight }}
          className="absolute left-[-2.5px] w-[6px] h-[6px] rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="text-[12px] text-indigo-400 mono uppercase tracking-wider mb-4 block">
            Architecture
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-[-0.03em] max-w-3xl mb-6">
            Open-book engineering
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-xl leading-relaxed">
            No black boxes. Here's exactly how Vidhyalaya works — the synthesis pipeline, 
            the state management, and why we never hallucinate URLs.
          </p>
        </motion.div>

        {/* Architecture Blocks */}
        <div>{blocks.map((b, i) => <ArchBlock key={i} {...b} />)}</div>

        {/* Stack Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: 'Frontend', tech: 'React 19 · TypeScript · Vite', icon: '⚡' },
            { label: 'Styling', tech: 'Tailwind CSS v4', icon: '🎨' },
            { label: 'AI Engine', tech: 'Google Gemini GenAI SDK', icon: '🧠' },
            { label: 'Storage', tech: 'MongoDB Atlas · Express.js', icon: '💾' },
          ].map((item, i) => (
            <div key={i} className="bento-card p-4 flex items-start gap-3">
              <span className="text-base">{item.icon}</span>
              <div>
                <span className="text-[10px] text-zinc-600 mono uppercase tracking-wider block mb-1">
                  {item.label}
                </span>
                <span className="text-[12px] text-zinc-400 mono leading-snug">
                  {item.tech}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;