import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, GraduationCap, Zap, Loader, AlertTriangle, X, ShieldQuestion,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithTutor, generateSocraticCheckpoint, listModels } from '../../../services/geminiService';
import type { SocraticQuestion } from '../../../services/geminiService';
import type { ConceptNode } from '../types';

const getLocalSocraticFallback = (conceptLabel: string): SocraticQuestion => {
  return {
    question: `What is the primary role of the concept "${conceptLabel}" in this learning roadmap?`,
    options: [
      `It serves as an essential building block to manage structure and logic flow.`,
      `It is an optional feature that has no impact on downstream nodes.`,
      `It is used solely for visual presentation in the Cortex map.`,
      `It acts as a temporary placeholder that will be deleted later.`
    ],
    correctAnswerIndex: 0,
    explanation: `"${conceptLabel}" is a critical conceptual node in this module. Clear recall here strengthens downstream dependencies and makes the next concept easier to learn.`
  };
};

export const NodeDetailPanel: React.FC<{
  node: ConceptNode | null;
  moduleTitle: string;
  onClose: () => void;
  isSidebar?: boolean;
  onMastered?: (nodeId: string) => void;
  isZenMode?: boolean;
}> = ({ node, moduleTitle, onClose, isSidebar = false, onMastered, isZenMode = false }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(380);
  const [detailLens, setDetailLens] = useState<'standard' | 'feynman' | 'hacker'>('standard');

  const [quizQuestion, setQuizQuestion] = useState<string | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<number | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizExplanation, setQuizExplanation] = useState<string>('');
  const isResizingRef = useRef(false);

  const scanSignal = async () => {
    if (!node) return;
    setIsLoading(true);
    setError(null);
    setExplanation('');

    try {
      let lensPrompt = '';
      if (detailLens === 'standard') {
        lensPrompt = `ARCHITECTURAL DEEP-DIVE: Explain the concept of "${node.label}" within the framework of "${moduleTitle}". Focus on structural logic, technical implementation patterns, and core utility.`;
      } else if (detailLens === 'feynman') {
        lensPrompt = `FEYNMAN DECODE: Explain the concept of "${node.label}" inside "${moduleTitle}" as if I am 10 years old. Use a clever real-world analogy and extremely simple words. Avoid technical jargon.`;
      } else if (detailLens === 'hacker') {
        lensPrompt = `HACKER LEVERAGE: Explain the concept of "${node.label}" inside "${moduleTitle}" focusing on maximum leverage. Show the absolute shortest code template/snippet, real-world utility, and what to watch out for.`;
      }

      const responseObj = await chatWithTutor([],
        `${lensPrompt} Structure your response as a professional technical report with sharp headings, concise bullets, and micro-code blocks where applicable.`,
        `NEURAL OBSERVATORY // SYSTEM_AUTH: EXPERT // MODULE: ${moduleTitle} // LENS: ${detailLens}`
      );
      setExplanation(responseObj.text || '');
    } catch (err) {
      console.error("Signal Lost:", err);
      let availableModels = "Unknown";
      try {
        const models = await listModels();
        availableModels = models.join(", ");
      } catch (listErr) {
        console.error("Failed to list models:", listErr);
      }
      setError(`UPLINK FAILED: ${err instanceof Error ? err.message : String(err)} | AVAILABLE MODELS: ${availableModels}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (node) {
      scanSignal();
    }
  }, [node, moduleTitle, detailLens]);

  useEffect(() => {
    if (node) {
      setDetailLens('standard');
      setQuizQuestion(null);
      setQuizOptions([]);
      setQuizAnswer(null);
      setQuizCorrect(null);
      setQuizResult(null);
      setQuizExplanation('');
    }
  }, [node, moduleTitle]);

  const fetchQuiz = async () => {
    if (!node) return;
    setIsLoadingQuiz(true);
    setQuizQuestion(null);
    setQuizOptions([]);
    setQuizAnswer(null);
    setQuizCorrect(null);
    setQuizResult(null);
    setQuizExplanation('');
    try {
      const q = await generateSocraticCheckpoint(node.label, node.description || '', moduleTitle);
      setQuizQuestion(q.question);
      setQuizOptions(q.options || []);
      setQuizCorrect(q.correctAnswerIndex ?? 0);
      setQuizExplanation(q.explanation || '');
    } catch (e) {
      console.error('Quiz fetch failed, falling back:', e);
      const fallback = getLocalSocraticFallback(node.label);
      setQuizQuestion(fallback.question);
      setQuizOptions(fallback.options || []);
      setQuizCorrect(fallback.correctAnswerIndex ?? 0);
      setQuizExplanation(fallback.explanation || '');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const answerQuiz = (idx: number) => {
    setQuizAnswer(idx);
    if (idx === quizCorrect) {
      setQuizResult('correct');
      if (onMastered && node) onMastered(node.id);
    } else {
      setQuizResult('wrong');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newHeight = window.innerHeight - e.clientY - 20;
      setHeight(Math.min(Math.max(newHeight, 200), window.innerHeight * 0.8));
    };
    const handleMouseUp = () => { isResizingRef.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!node) return null;

  if (isSidebar) {
    return (
      <div className={`flex flex-col h-full overflow-hidden transition-colors ${isZenMode ? 'bg-[#0b0f19] text-white' : 'bg-white text-slate-800'}`}>
        <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#4e5bff] flex items-center justify-center shrink-0 relative">
              <Eye size={14} className="text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-[#4e5bff]/50 uppercase tracking-[0.3em] leading-none mb-0.5">Observation</p>
              <p className={`text-[12px] font-black uppercase tracking-tight truncate ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{node.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              isZenMode
                ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                : 'bg-slate-100 text-slate-400 hover:text-slate-700'
            }`}
          >
            <X size={13} />
          </button>
        </div>

        <div className={`shrink-0 flex p-1.5 gap-1 select-none border-b ${isZenMode ? 'bg-[#0e1422] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
          {[
            { id: 'standard' as const, label: 'Deep Dive', icon: <Eye size={11} /> },
            { id: 'feynman' as const, label: 'Feynman', icon: <GraduationCap size={11} /> },
            { id: 'hacker' as const, label: 'Hacker', icon: <Zap size={11} /> }
          ].map(tab => {
            const isActive = detailLens === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailLens(tab.id)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                  isActive
                    ? (isZenMode
                        ? 'bg-white/10 text-white border-white/10 shadow-sm'
                        : 'bg-white text-[#4e5bff] border-slate-200/50 shadow-sm')
                    : (isZenMode
                        ? 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                        : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700')
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader size={28} className="animate-spin text-[#4e5bff] opacity-60" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] animate-pulse">Scanning Signal...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <AlertTriangle size={28} className="text-amber-500" />
              <p className="text-[11px] text-slate-400 font-medium">Neural uplink interrupted.</p>
              <button onClick={scanSignal} className="px-5 py-2 bg-[#4e5bff] text-white rounded-xl font-black text-[9px] uppercase tracking-widest">
                Retry Scan
              </button>
            </div>
          ) : (
            <div className={`prose prose-sm max-w-none text-justify hyphens-auto break-words
              prose-p:leading-relaxed prose-p:text-[13px]
              prose-strong:text-[#4e5bff] prose-strong:font-black
              prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
              prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-[11px]
              prose-li:text-[13px]
              prose-blockquote:border-l-2 prose-blockquote:border-[#4e5bff]/20 prose-blockquote:p-3 prose-blockquote:rounded-r-lg
              ${
                isZenMode
                  ? 'prose-invert text-slate-200 prose-p:text-slate-300 prose-headings:text-white prose-li:text-slate-300 prose-code:bg-white/10 prose-code:text-white prose-blockquote:bg-white/[0.02]'
                  : 'prose-slate text-slate-800 prose-p:text-slate-600 prose-headings:text-black prose-li:text-slate-600 prose-code:bg-slate-100 prose-code:text-[#4e5bff] prose-blockquote:bg-slate-50'
              }
            `}>
              <ReactMarkdown>{explanation || node.description}</ReactMarkdown>
            </div>
          )}

          <div className={`shrink-0 border-t p-4 mt-6 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
            {!quizQuestion ? (
              <button
                onClick={fetchQuiz}
                disabled={isLoadingQuiz}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                  isZenMode
                    ? 'bg-white/5 text-indigo-300 hover:bg-white/10 border border-white/5'
                    : 'bg-indigo-50 text-[#4e5bff] hover:bg-indigo-100'
                }`}
              >
                {isLoadingQuiz ? <Loader size={12} className="animate-spin" /> : <ShieldQuestion size={12} />}
                {isLoadingQuiz ? 'Generating Check...' : 'Check My Understanding'}
              </button>
            ) : (
              <div className="space-y-2">
                <p className={`text-[11px] font-bold leading-relaxed ${isZenMode ? 'text-slate-200' : 'text-slate-700'}`}>{quizQuestion}</p>
                <div className="space-y-1">
                  {quizOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(i)}
                      disabled={quizAnswer !== null}
                      className={`w-full text-left text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all border ${
                        quizAnswer === null
                          ? (isZenMode
                              ? 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5 text-slate-300'
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600')
                          : i === quizCorrect
                            ? (isZenMode
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold'
                                : 'border-emerald-400 bg-emerald-50 text-emerald-700 font-bold')
                            : quizAnswer === i
                              ? (isZenMode
                                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                  : 'border-red-300 bg-red-50 text-red-600')
                              : (isZenMode
                                  ? 'border-white/5 text-slate-500'
                                  : 'border-slate-100 text-slate-400')
                      }`}
                    >{opt}</button>
                  ))}
                </div>
                {quizResult && (
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-wider text-center py-1 rounded ${
                      quizResult === 'correct'
                        ? (isZenMode ? 'text-emerald-400 bg-emerald-950/20' : 'text-emerald-600 bg-emerald-50')
                        : (isZenMode ? 'text-red-400 bg-red-950/20' : 'text-red-500 bg-red-50')
                    }`}>
                      {quizResult === 'correct' ? 'Correct - evidence captured' : 'Not yet - review and retry'}
                    </p>
                    {quizExplanation && (
                      <p className={`text-[9.5px] leading-relaxed p-2.5 rounded-lg border text-justify font-mono ${
                        isZenMode
                          ? 'bg-white/[0.02] border-white/5 text-slate-400'
                          : 'bg-slate-50 border-slate-150 text-slate-500'
                      }`}>
                        <span className="font-extrabold text-[#4e5bff]">SARA Feedback:</span> {quizExplanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ height: `${height}px` }}
      className={`absolute inset-x-4 bottom-4 backdrop-blur-2xl border rounded-3xl p-8 animate-in slide-in-from-bottom-8 duration-700 z-50 flex flex-col transition-colors ${
        isZenMode
          ? 'bg-[#0b0f19]/98 border-white/10 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.5)] text-white'
          : 'bg-white/98 border-slate-200/60 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.12)] text-slate-800'
      }`}
    >
      <div
        onMouseDown={() => { isResizingRef.current = true; }}
        className="absolute top-0 inset-x-0 h-4 cursor-ns-resize flex items-center justify-center group"
      >
        <div className={`w-16 h-1 rounded-full group-hover:bg-[#4e5bff]/30 transition-colors ${isZenMode ? 'bg-white/10' : 'bg-slate-100'}`} />
      </div>

      <div className="flex items-start justify-between mb-8 shrink-0 mt-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#4e5bff] flex items-center justify-center shadow-2xl shadow-indigo-900/20 relative">
            <Eye size={28} className="text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isZenMode ? 'text-[#4e5bff]/80' : 'text-[#4e5bff]/60'}`}>Observation Room</h2>
              <div className={`h-px w-8 ${isZenMode ? 'bg-white/10' : 'bg-[#4e5bff]/10'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                isZenMode
                  ? 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30'
                  : 'text-emerald-600 bg-emerald-50 border-emerald-100'
              }`}>Signal: Secure</span>
            </div>
            <h3 className={`text-2xl font-black tracking-tight leading-none mb-3 uppercase ${isZenMode ? 'text-white' : 'text-black'}`}>{node.label}</h3>
            <div className="flex items-center gap-4">
               <span className="px-2.5 py-1 bg-[#4e5bff] text-white rounded-md text-[9px] font-black uppercase tracking-[0.2em]">
                 {node.depth === 0 ? 'Foundation' : `Derivative · L${node.depth}`}
               </span>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">CID: {node.id.slice(0,6)}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all border ${
            isZenMode
              ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10'
              : 'bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 border-slate-100'
          }`}
        >
          <X size={20} />
        </button>
      </div>

      <div className={`rounded-2xl p-8 border flex-1 overflow-y-auto custom-scrollbar relative flex flex-col gap-6 transition-colors ${
        isZenMode
          ? 'bg-white/[0.02] border-white/5'
          : 'bg-slate-50/50 border-slate-200/40'
      }`}>
        <div className={`shrink-0 flex p-1.5 gap-1.5 rounded-2xl border select-none max-w-md ${
          isZenMode ? 'bg-white/5 border-white/10' : 'bg-slate-100/60 border-slate-200/40'
        }`}>
          {[
            { id: 'standard' as const, label: 'Deep Dive (Standard)', icon: <Eye size={12} /> },
            { id: 'feynman' as const, label: 'Feynman Decode (Analogies)', icon: <GraduationCap size={12} /> },
            { id: 'hacker' as const, label: 'Hacker Leverage (Code)', icon: <Zap size={12} /> }
          ].map(tab => {
            const isActive = detailLens === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailLens(tab.id)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                  isActive
                    ? (isZenMode
                        ? 'bg-white/10 text-white border-white/10 shadow-md shadow-black/20'
                        : 'bg-white text-[#4e5bff] border-slate-200 shadow-md shadow-slate-250/20')
                    : (isZenMode
                        ? 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                        : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-200/50 hover:text-slate-700')
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-10 gap-6">
            <Loader size={40} className="animate-spin text-[#4e5bff] opacity-60" />
            <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse block">Observing Neural Signals...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center py-10 gap-6">
            <AlertTriangle size={48} className="text-amber-500" />
            <div className="text-center max-w-md">
              <h4 className="text-[14px] font-black text-black uppercase tracking-[0.2em] mb-2">{error}</h4>
              <button onClick={scanSignal} className="px-8 py-3 bg-[#4e5bff] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">
                Re-Scan Signal
              </button>
            </div>
          </div>
        ) : (
          <div className={`prose prose-md max-w-none text-justify hyphens-auto break-words
            prose-p:leading-relaxed prose-p:text-[16px]
            prose-strong:text-[#4e5bff] prose-strong:font-black
            prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
            prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter
            prose-blockquote:border-l-4 prose-blockquote:border-[#4e5bff]/20 prose-blockquote:p-4 prose-blockquote:rounded-r-xl
            ${
              isZenMode
                ? 'prose-invert text-slate-200 prose-p:text-slate-300 prose-headings:text-white prose-li:text-slate-300 prose-code:bg-white/10 prose-code:text-white prose-blockquote:bg-white/[0.02]'
                : 'prose-slate text-slate-800 prose-p:text-slate-600 prose-headings:text-black prose-li:text-slate-600 prose-code:bg-slate-200/50 prose-code:text-[#4e5bff] prose-blockquote:bg-slate-100/50'
            }
          `}>
            <ReactMarkdown>{explanation || node.description}</ReactMarkdown>
          </div>
        )}

        <div className={`shrink-0 mt-4 pt-4 border-t ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>Socratic Check</h4>
            {!quizQuestion && !isLoadingQuiz && (
              <button
                onClick={fetchQuiz}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
              >
                <ShieldQuestion size={11} /> Check Understanding
              </button>
            )}
          </div>
          {isLoadingQuiz && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 animate-pulse">
              <Loader size={12} className="animate-spin" />
              <span>Generating Socratic Check...</span>
            </div>
          )}
          {quizQuestion && (
            <div className="space-y-3">
              <p className={`text-[13px] font-bold leading-relaxed ${isZenMode ? 'text-slate-200' : 'text-slate-700'}`}>{quizQuestion}</p>
              <div className="grid grid-cols-2 gap-2">
                {quizOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => answerQuiz(i)}
                    disabled={quizAnswer !== null}
                    className={`text-left text-[11px] px-3 py-2 rounded-xl font-medium transition-all border ${
                      quizAnswer === null
                        ? (isZenMode
                            ? 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5 text-slate-300'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600')
                        : i === quizCorrect
                          ? (isZenMode
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold'
                              : 'border-emerald-400 bg-emerald-50 text-emerald-700 font-bold')
                          : quizAnswer === i
                            ? (isZenMode
                                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                : 'border-red-300 bg-red-50 text-red-600')
                            : (isZenMode
                                ? 'border-white/5 text-slate-500'
                                : 'border-slate-100 text-slate-400')
                    }`}
                  >{opt}</button>
                ))}
              </div>
              {quizResult && (
                <div className="space-y-2">
                  <p className={`text-[11px] font-black uppercase tracking-widest text-center py-2 rounded-xl border ${
                    quizResult === 'correct'
                      ? (isZenMode ? 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30' : 'text-emerald-600 bg-emerald-50 border border-emerald-100')
                      : (isZenMode ? 'text-red-400 bg-red-950/20 border-red-500/30' : 'text-red-500 bg-red-50 border border-red-100')
                  }`}>
                    {quizResult === 'correct' ? 'Correct - evidence captured' : 'Not yet - review and retry'}
                  </p>
                  {quizExplanation && (
                    <p className={`text-[10.5px] leading-relaxed p-3.5 rounded-xl border text-justify font-mono ${
                      isZenMode
                        ? 'bg-white/[0.02] border-white/5 text-slate-400'
                        : 'bg-slate-50 border-slate-150 text-slate-500'
                    }`}>
                      <span className="font-extrabold text-[#4e5bff]">SARA Feedback:</span> {quizExplanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
