import React, { useEffect, useRef } from 'react';
import { SandboxRunResult } from '../../types';
import { CheckCircle2, XCircle, Clock, Play } from 'lucide-react';

interface SandboxOutputProps {
  result: SandboxRunResult | null;
  isRunning: boolean;
  isZenMode?: boolean;
}

const SandboxOutput: React.FC<SandboxOutputProps> = ({ result, isRunning, isZenMode }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result?.stdout, result?.stderr, isRunning]);

  return (
    <div className={`flex flex-col h-full min-h-0 border-t ${isZenMode ? 'border-white/10 bg-[#07080b]' : 'border-slate-200 bg-slate-50/40'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Console Output
          </span>
        </div>
        {result && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${isZenMode ? 'text-slate-550' : 'text-slate-500'}`}>
            <Clock size={10} className="opacity-70" />
            <span>{result.durationMs}ms</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed custom-scrollbar space-y-2">
        {isRunning && (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Compiling and running code...</span>
          </div>
        )}

        {!isRunning && !result && (
          <p className={isZenMode ? 'text-slate-600' : 'text-slate-400'}>
            Click Run (or press ⌘+Enter) to evaluate the challenge solution.
          </p>
        )}

        {result?.stdout && (
          <pre 
            className={`whitespace-pre-wrap font-mono p-3 rounded-xl border ${
              isZenMode 
                ? 'bg-black/30 border-white/5 text-slate-200' 
                : 'bg-white border-slate-100 text-slate-700 shadow-sm'
            }`}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
          >
            {result.stdout}
          </pre>
        )}

        {result?.stderr && (
          <pre 
            className="whitespace-pre-wrap font-mono p-3 rounded-xl border bg-rose-500/5 border-rose-500/15 text-rose-400"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
          >
            {result.stderr}
          </pre>
        )}

        {result && result.testsTotal !== undefined && result.testsTotal > 0 && (
          <div className={`flex items-center gap-2.5 mt-3 pt-3 border-t ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
            {result.success ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                <CheckCircle2 size={12} />
                <span>Passed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/15">
                <XCircle size={12} />
                <span>Failed</span>
              </span>
            )}
            <span className={`text-[11px] font-bold ${result.success ? 'text-emerald-500' : 'text-rose-400'}`}>
              {result.testsPassed} of {result.testsTotal} challenges solved
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default SandboxOutput;
