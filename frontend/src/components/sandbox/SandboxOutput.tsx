import React, { useEffect, useRef } from 'react';
import { SandboxRunResult } from '../../types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

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
    <div className={`flex flex-col h-full min-h-0 border-t ${isZenMode ? 'border-white/10 bg-[#0a0e14]' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Output
        </span>
        {result && (
          <span className={`flex items-center gap-1.5 text-[10px] font-medium ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Clock size={10} />
            {result.durationMs}ms
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed custom-scrollbar">
        {isRunning && (
          <p className={isZenMode ? 'text-slate-400' : 'text-slate-500'}>Running…</p>
        )}

        {!isRunning && !result && (
          <p className={isZenMode ? 'text-slate-600' : 'text-slate-400'}>
            Press Run or ⌘↵ to execute your code.
          </p>
        )}

        {result?.stdout && (
          <pre className={`whitespace-pre-wrap mb-2 ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {result.stdout}
          </pre>
        )}

        {result?.stderr && (
          <pre className="whitespace-pre-wrap text-red-400 mb-2">{result.stderr}</pre>
        )}

        {result && result.testsTotal !== undefined && result.testsTotal > 0 && (
          <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
            {result.success ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <XCircle size={14} className="text-red-400" />
            )}
            <span className={result.success ? 'text-emerald-500' : 'text-red-400'}>
              {result.testsPassed}/{result.testsTotal} tests passing
            </span>
          </div>
        )}

        {result?.success && (
          <p className="text-emerald-500 mt-2 font-medium">All tests passed.</p>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default SandboxOutput;
