import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Check, ChevronRight } from 'lucide-react';

interface NeuralSynthesisSimulatorProps {
  isZenMode: boolean;
  isCompleted: boolean;
  onFinished: () => void;
  goal: string;
}

const NeuralSynthesisSimulator: React.FC<NeuralSynthesisSimulatorProps> = ({
  isZenMode,
  isCompleted,
  onFinished,
  goal
}) => {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onFinishedCalledRef = useRef(false);

  useEffect(() => {
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedTime((prev) => Math.round((prev + 0.1) * 10) / 10);
    }, 100);

    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    simIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 2;
        if (prev < 70) return prev + 1;
        if (prev < 90) return prev + 0.5;
        if (prev < 99) return prev + 0.1;
        return prev;
      });
    }, 80);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isCompleted) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setProgress(100);

      const timeout = setTimeout(() => {
        if (!onFinishedCalledRef.current) {
          onFinishedCalledRef.current = true;
          onFinished();
        }
      }, 1200);

      return () => clearTimeout(timeout);
    }
  }, [isCompleted, onFinished]);

  const simulatedLogs = useMemo(() => {
    const logs = [
      { id: 1, tag: 'SYSTEM', msg: 'Waking Cortex-3-Flash neural agent instance...', type: 'info' as const, progress: 5 },
      { id: 2, tag: 'SYNAPSE', msg: 'Establishing high-fidelity synaptic network handshake...', type: 'info' as const, progress: 15 },
      { id: 3, tag: 'SEMANTIC', msg: `Deconstructing goal semantics: "${goal}"`, type: 'info' as const, progress: 30 },
      { id: 4, tag: 'ACADEMIC', msg: 'Ingesting curriculum mapping parameters & prerequisite guidelines...', type: 'info' as const, progress: 50 },
      { id: 5, tag: 'STRUCTURE', msg: 'Synthesizing dynamic concept nodes, logical paths, & durations...', type: 'info' as const, progress: 70 },
      { id: 6, tag: 'INTEGRITY', msg: 'Validating type schema mapping & dependency safety keys...', type: 'info' as const, progress: 85 },
      { id: 7, tag: 'TELEMETRY', msg: 'Generating responsive visual concept map layouts...', type: 'success' as const, progress: 95 }
    ];
    if (progress >= 100) {
      logs.push({
        id: 8,
        tag: 'SUCCESS',
        msg: `Neural Blueprint successfully calibrated & visual map compiled in ${elapsedTime.toFixed(1)}s!`,
        type: 'success' as const,
        progress: 100
      });
    }
    return logs.filter(log => progress >= log.progress);
  }, [progress, goal, elapsedTime]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-1000 p-8">
      <div className="flex flex-col items-center mb-8 text-center w-full max-w-[620px]">
        <div className="relative flex items-center justify-center mb-6">
          <div className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-500 ${progress >= 100 ? 'bg-emerald-500/10' : 'bg-indigo-500/10'} animate-pulse`} />

          <svg className="w-32 h-32 transform -rotate-90 z-10" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="rgba(78, 91, 255, 0.08)"
              strokeWidth="4.5"
              fill="transparent"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              stroke={progress >= 100 ? '#10b981' : 'url(#progress-gradient-neural)'}
              strokeWidth="5.5"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 - (progress / 100) * 2 * Math.PI * 44}
              strokeLinecap="round"
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="progress-gradient-neural" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4e5bff" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute flex flex-col items-center justify-center z-20">
            {progress >= 100 ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="flex items-center justify-center"
              >
                <Check size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" strokeWidth={3.5} />
              </motion.div>
            ) : (
              <>
                <span className="text-[24px] font-black tracking-tight text-slate-800 font-mono leading-none">
                  {progress.toFixed(0)}%
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#4e5bff] mt-1.5 font-mono">
                  {elapsedTime.toFixed(1)}s
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl sm:text-[22px] font-black tracking-tight text-slate-900 leading-none">
            {progress >= 100 ? 'Neural Map Calibrated' : 'Synthesizing Neural Map'}
          </h3>
          <div className="mt-3 flex items-center justify-center">
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.22em] border shadow-sm ${progress >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100/60 animate-pulse'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
              {progress >= 100 ? 'Cortex blueprint fully structured' : 'Cortex AI is compiling modular checkpoints'}
            </span>
          </div>
        </div>
      </div>

      {progress >= 100 && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          onClick={onFinished}
          className="mb-8 group relative px-10 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] text-white shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer pointer-events-auto bg-gradient-to-r from-emerald-500 to-indigo-600 shadow-emerald-500/20 z-30"
        >
          <span className="relative z-10 flex items-center gap-2">
            Enter Neural Environment <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      )}

      <div className="flex flex-col w-full max-w-[620px] space-y-3 z-10 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between px-3">
          <p className="text-[9.5px] font-black uppercase tracking-[0.3em] text-[#4e5bff] flex items-center gap-1.5 leading-none">
            <BrainCircuit size={11} className="animate-pulse" /> Agent Activity Terminal
          </p>
          <div className="flex items-center gap-2">
            {progress >= 100 ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-500">Ready</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Processing...</span>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            border: '1.5px solid rgba(26, 115, 232, 0.12)',
            boxShadow: '0 24px 64px -16px rgba(26, 115, 232, 0.06), 0 8px 24px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          className="rounded-[24px] p-6 min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 text-left animate-in fade-in duration-300"
        >
          {simulatedLogs.map((log) => (
            <div key={log.id} className="flex gap-2.5 items-start font-mono text-[11.5px] leading-relaxed animate-in slide-in-from-left-2 duration-300">
              <span className="text-indigo-600 font-bold select-none shrink-0">[{log.tag}]</span>
              <p className={`font-mono ${log.type === 'success' ? 'text-emerald-600 font-extrabold' : 'text-slate-700 font-medium'}`}>
                {log.msg}
              </p>
            </div>
          ))}
          {progress < 100 && (
            <div className="flex gap-2 items-start font-mono text-[11.5px] leading-relaxed text-slate-500 animate-pulse text-left">
              <span className="text-indigo-500 font-bold select-none shrink-0">&gt;_</span>
              <span>Awaiting synaptic response...</span>
              <span className="inline-block w-1.5 h-3.5 bg-indigo-500 animate-[ping_1.2s_infinite] ml-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeuralSynthesisSimulator;
