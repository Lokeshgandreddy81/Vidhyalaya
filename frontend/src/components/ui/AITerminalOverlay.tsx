import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, BrainCircuit, Sparkles } from 'lucide-react';

export type ActionType = 'refresh' | 'flashcards' | 'quiz';

interface AITerminalOverlayProps {
  isOpen: boolean;
  actionType: ActionType;
  topic: string;
  onComplete: (data: any) => void;
  onClose: () => void;
  executor: () => Promise<any>;
}

const EXECUTION_SCRIPTS: Record<ActionType, string[]> = {
  refresh: [
    '> Initializing SARA Knowledge Engine v3.1...',
    '> Fetching module vector embeddings...',
    '> Mapping concept dependency graph...',
    '> Extracting high-yield knowledge clusters...',
    '> Running semantic compression algorithm...',
    '> Synthesizing academic distillate...',
    '> Applying Academic Modernism formatting...',
    '> Validating mastery coverage: 98.7%...',
    '> QUICK REFRESH compiled successfully ✓',
  ],
  flashcards: [
    '> Initializing SARA Spaced Repetition Module...',
    '> Decomposing concepts into atomic units...',
    '> Applying Leitner System heuristics...',
    '> Generating Socratic question pairs...',
    '> Calibrating cognitive load per card...',
    '> Cross-referencing with Bloom\'s Taxonomy...',
    '> Encoding memory anchors + retrieval cues...',
    '> Quality check: 8/8 cards verified ✓',
    '> FLASHCARD DECK compiled successfully ✓',
  ],
  quiz: [
    '> Initializing SARA Assessment Engine...',
    '> Parsing core concept competencies...',
    '> Generating distractor analysis vectors...',
    '> Applying difficulty calibration model...',
    '> Balancing recall vs. application questions...',
    '> Cross-validating answer correctness...',
    '> Injecting pedagogical explanations...',
    '> Quality check: 5/5 questions verified ✓',
    '> PRACTICE QUIZ compiled successfully ✓',
  ],
};

const ACTION_LABELS: Record<ActionType, { title: string; subtitle: string; color: string; icon: React.ReactNode }> = {
  refresh: {
    title: 'Quick Refresh',
    subtitle: 'Compiling knowledge distillate',
    color: '#10b981',
    icon: <Sparkles size={20} />,
  },
  flashcards: {
    title: 'Flashcard Deck',
    subtitle: 'Engineering memory cards',
    color: '#6366f1',
    icon: <BrainCircuit size={20} />,
  },
  quiz: {
    title: 'Practice Quiz',
    subtitle: 'Calibrating assessment vectors',
    color: '#f59e0b',
    icon: <Zap size={20} />,
  },
};

const AITerminalOverlay: React.FC<AITerminalOverlayProps> = ({
  isOpen,
  actionType,
  topic,
  onComplete,
  onClose,
  executor,
}) => {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(true);
  const [phase, setPhase] = useState<'running' | 'done' | 'error'>('running');
  const [progress, setProgress] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef(false);

  const script = EXECUTION_SCRIPTS[actionType];
  const meta = ACTION_LABELS[actionType];

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Main execution engine
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || executedRef.current) return;
    executedRef.current = true;

    setLines([]);
    setPhase('running');
    setProgress(0);

    let lineIndex = 0;
    let aiResultPromise = executor();

    // Stream the script lines while the AI call runs in background
    const streamNextLine = () => {
      if (lineIndex >= script.length - 1) return; // Hold last line for AI completion
      setLines(prev => [...prev, script[lineIndex]]);
      setProgress(Math.round(((lineIndex + 1) / script.length) * 90));
      lineIndex++;
      const delay = 280 + Math.random() * 180;
      timerRef.current = setTimeout(streamNextLine, delay);
    };
    streamNextLine();

    // When AI finishes, show the final line + complete
    aiResultPromise
      .then((result) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Ensure all script lines shown
        const remainingLines = script.slice(lineIndex);
        let currentDelay = 0;
        
        remainingLines.forEach((line, i) => {
          setTimeout(() => {
            setLines(prev => [...prev, line]);
            const totalShown = lineIndex + i + 1;
            setProgress(Math.round((totalShown / script.length) * 100));
            
            if (i === remainingLines.length - 1) {
              setTimeout(() => {
                setPhase('done');
                setTimeout(() => onComplete(result), 600);
              }, 400);
            }
          }, currentDelay);
          currentDelay += 260;
        });
      })
      .catch((err) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setLines(prev => [...prev, `> ERROR: ${err.message || 'Generation failed'}`, '> Retrying with fallback model...']);
        setPhase('error');
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      executedRef.current = false;
      setLines([]);
      setPhase('running');
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={phase === 'error' ? onClose : undefined}
      />

      {/* Terminal Card */}
      <div className="relative w-full max-w-2xl animate-in zoom-in-95 fade-in duration-300">
        {/* Glow ring */}
        <div
          className="absolute -inset-px rounded-2xl opacity-60 blur-sm"
          style={{ background: `linear-gradient(135deg, ${meta.color}40, transparent, ${meta.color}20)` }}
        />

        <div className="relative bg-[#0a0e1a] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">

          {/* Title Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 bg-slate-900/80">
            <div className="flex items-center gap-3">
              {/* Traffic lights */}
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: meta.color }}
              >
                {meta.icon}
                SARA/{meta.title.replace(' ', '_').toUpperCase()}
              </div>
            </div>
            {phase === 'error' && (
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Topic Header */}
          <div className="px-5 pt-4 pb-2 border-b border-slate-800/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-1">Context Module</p>
            <p className="text-sm font-bold text-slate-200 truncate">{topic}</p>
          </div>

          {/* Terminal Body */}
          <div
            ref={terminalRef}
            className="p-5 font-mono text-xs leading-relaxed min-h-[260px] max-h-[300px] overflow-y-auto space-y-1.5"
          >
            {lines.map((line, i) => {
              const isSuccess = line.includes('successfully ✓') || line.includes('verified ✓');
              const isError = line.includes('ERROR');
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 animate-in slide-in-from-left-2 fade-in duration-200"
                >
                  <span
                    className="shrink-0 mt-0.5"
                    style={{ color: isSuccess ? '#10b981' : isError ? '#ef4444' : meta.color }}
                  >
                    {isSuccess ? '✓' : isError ? '✗' : '▸'}
                  </span>
                  <span
                    className={
                      isSuccess
                        ? 'text-emerald-400 font-bold'
                        : isError
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }
                  >
                    {line.replace('> ', '')}
                  </span>
                </div>
              );
            })}

            {/* Live cursor */}
            {phase === 'running' && (
              <div className="flex items-center gap-2">
                <span style={{ color: meta.color }}>▸</span>
                <span className="text-slate-300">
                  {cursor ? '█' : ' '}
                </span>
              </div>
            )}

            {/* Done state */}
            {phase === 'done' && (
              <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-500">
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-400 font-bold">Execution complete. Rendering results...</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {meta.subtitle}
              </span>
              <span className="text-[9px] font-bold" style={{ color: meta.color }}>
                {progress}%
              </span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${meta.color}80, ${meta.color})`,
                  boxShadow: `0 0 8px ${meta.color}60`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITerminalOverlay;
