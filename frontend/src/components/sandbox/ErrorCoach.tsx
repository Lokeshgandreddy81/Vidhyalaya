import React, { useState } from 'react';
import { SandboxErrorExplanation, SandboxFixProposal, SandboxRunResult } from '../../types';
import { explainSandboxError, proposeSandboxFix } from '../../services/geminiService';
import { Lightbulb, Wand2, Loader2, X } from 'lucide-react';

interface ErrorCoachProps {
  result: SandboxRunResult;
  code: string;
  fileName: string;
  language: string;
  exerciseTitle: string;
  hints: string[];
  isZenMode?: boolean;
  onApplyFix: (fixed: string) => void;
}

const ErrorCoach: React.FC<ErrorCoachProps> = ({
  result,
  code,
  fileName,
  language,
  exerciseTitle,
  hints,
  isZenMode,
  onApplyFix,
}) => {
  const [explanation, setExplanation] = useState<SandboxErrorExplanation | null>(null);
  const [fix, setFix] = useState<SandboxFixProposal | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);

  const errorText = result.errorMessage || result.stderr || 'Tests failed';

  const handleExplain = async () => {
    setLoadingExplain(true);
    try {
      const exp = await explainSandboxError({
        code,
        error: errorText,
        language,
        exerciseTitle,
        line: result.errorLine,
      });
      setExplanation(exp);
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleFix = async () => {
    setLoadingFix(true);
    try {
      const proposal = await proposeSandboxFix({
        code,
        error: errorText,
        language,
        exerciseTitle,
        fileName,
      });
      setFix(proposal);
      setShowDiff(true);
    } finally {
      setLoadingFix(false);
    }
  };

  const staticExplanation = (): SandboxErrorExplanation => {
    const lower = errorText.toLowerCase();
    if (lower.includes('is not defined') || lower.includes('not defined')) {
      return {
        what: 'Your code references something that does not exist yet.',
        why: 'This usually means a typo in a variable or function name, or you forgot to define it.',
        howToFix: 'Check spelling and make sure every function you call is defined above the call.',
      };
    }
    if (lower.includes('should return') || lower.includes('should be')) {
      return {
        what: 'Your code runs but produces the wrong result.',
        why: 'The logic is close, but the output does not match what the exercise expects.',
        howToFix: 'Re-read the exercise brief and trace through your code with the example input.',
      };
    }
    return {
      what: errorText,
      why: 'The runtime could not complete your code successfully.',
      howToFix: 'Read the error message carefully and check the highlighted line.',
    };
  };

  const display = explanation || staticExplanation();

  return (
    <div className={`shrink-0 border-l flex flex-col w-72 min-h-0 ${isZenMode ? 'border-white/10 bg-[#0d1117]' : 'border-slate-200 bg-white'}`}>
      <div className={`px-4 py-3 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isZenMode ? 'text-red-400' : 'text-red-500'}`}>
          Error
        </span>
        {result.errorLine && (
          <p className={`text-[11px] mt-1 font-mono ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Line {result.errorLine}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-[12px]">
        <section>
          <h4 className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            What happened
          </h4>
          <p className={`text-justify hyphens-auto leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {display.what}
          </p>
        </section>

        <section>
          <h4 className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Why
          </h4>
          <p className={`text-justify hyphens-auto leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {display.why}
          </p>
        </section>

        <section>
          <h4 className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            How to fix
          </h4>
          <p className={`text-justify hyphens-auto leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {display.howToFix}
          </p>
        </section>

        {hints.length > 0 && hintIndex < hints.length && (
          <section className={`p-3 rounded-lg ${isZenMode ? 'bg-white/5' : 'bg-amber-50 border border-amber-100'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb size={12} className="text-amber-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Hint</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-amber-900'}`}>
              {hints[hintIndex]}
            </p>
            {hintIndex < hints.length - 1 && (
              <button
                onClick={() => setHintIndex((i) => i + 1)}
                className="mt-2 text-[10px] font-bold text-amber-600 hover:underline"
              >
                Next hint
              </button>
            )}
          </section>
        )}

        {showDiff && fix && (
          <section className={`p-3 rounded-lg border ${isZenMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-[11px] mb-2 ${isZenMode ? 'text-slate-300' : 'text-slate-600'}`}>{fix.description}</p>
            <pre className={`text-[10px] overflow-x-auto p-2 rounded ${isZenMode ? 'bg-black/30 text-emerald-400' : 'bg-white text-emerald-700 border border-slate-100'}`}>
              {fix.fixed}
            </pre>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { onApplyFix(fix.fixed); setShowDiff(false); setFix(null); }}
                className="flex-1 py-2 rounded-lg bg-[#000666] text-white text-[10px] font-bold uppercase tracking-wider"
              >
                Apply fix
              </button>
              <button
                onClick={() => { setShowDiff(false); setFix(null); }}
                className={`p-2 rounded-lg ${isZenMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
              >
                <X size={14} />
              </button>
            </div>
          </section>
        )}
      </div>

      <div className={`p-3 border-t space-y-2 shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          onClick={handleExplain}
          disabled={loadingExplain}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
            isZenMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          } disabled:opacity-50`}
        >
          {loadingExplain ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
          Explain more
        </button>
        <button
          onClick={handleFix}
          disabled={loadingFix}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#000666] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#000888] disabled:opacity-50"
        >
          {loadingFix ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          Suggest fix
        </button>
      </div>
    </div>
  );
};

export default ErrorCoach;
