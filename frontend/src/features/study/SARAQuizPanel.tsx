import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestion } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Zap, Clock, Gauge, ClipboardCheck } from 'lucide-react';
import { soundscape } from '../../services/soundscapeService';
import { toast } from 'sonner';

interface SARAQuizPanelProps {
  questions: QuizQuestion[];
  isZenMode?: boolean;
  onRestart: () => void;
}

const SARAQuizPanel: React.FC<SARAQuizPanelProps> = ({ questions, isZenMode, onRestart }) => {
  const [started, setStarted] = useState(false);
  const [quizMode, setQuizMode] = useState<'standard' | 'speedrun'>('standard');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [successIdx, setSuccessIdx] = useState<number | null>(null);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);

  // Timed recall states
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bug 4 fix: use ref for currentIdx to avoid stale closure in timer callback
  const currentIdxRef = useRef(currentIdx);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const currentQuestion = questions[currentIdx];

  // Bug 4 fix: handleNext defined with useCallback so handleTimeOut always has fresh version
  const handleNext = useCallback(() => {
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    const idx = currentIdxRef.current;
    setShakeIdx(null);
    setSuccessIdx(null);
    if (idx < questionsRef.current.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  }, []);

  const handleNextRef = useRef(handleNext);
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // ── Speedrun Real-Time Countdown Timer ──
  useEffect(() => {
    if (!started || quizMode !== 'speedrun' || showResult || isAnswered) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    setTimeLeft(15);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          // Bug 4 fix: call via ref — always fresh, never stale
          handleTimeOutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [started, quizMode, currentIdx, isAnswered, showResult]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    };
  }, []);

  const handleTimeOut = useCallback(() => {
    setSelectedIdx(null);
    setIsAnswered(true);
    setStreak(0);
    soundscape.playSpeedrunSound('wrong');
    toast.error("Time elapsed. SARA marked this concept for review.");
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    autoNextTimeoutRef.current = setTimeout(() => {
      handleNextRef.current();
    }, 1500);
  }, []);

  // Keep handleTimeOut ref fresh
  const handleTimeOutRef = useRef(handleTimeOut);
  useEffect(() => { handleTimeOutRef.current = handleTimeOut; }, [handleTimeOut]);

  const handleSelect = (idx: number) => {
    if (isAnswered) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQuestion.correctAnswerIndex;

    if (isCorrect) {
      setSuccessIdx(idx);
      setScore(s => s + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) {
        setMaxStreak(nextStreak);
      }
      if (nextStreak % 3 === 0) {
        soundscape.playSpeedrunSound('streak');
        toast.success(`Rapid recall run: ${nextStreak} correct. Strong retrieval signal captured.`);
      } else {
        soundscape.playSpeedrunSound('correct');
      }
    } else {
      setShakeIdx(idx);
      setStreak(0);
      soundscape.playSpeedrunSound('wrong');
    }

    if (quizMode === 'speedrun') {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = setTimeout(() => {
        handleNextRef.current();
      }, isCorrect ? 1000 : 1500);
    }
  };

  const handleRestartQuiz = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
    setStarted(false);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setScore(0);
    setShowResult(false);
    setStreak(0);
    setMaxStreak(0);
    setShakeIdx(null);
    setSuccessIdx(null);
    onRestart();
  };

  // ── MODE SELECTION SCREEN ──
  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-6">
           <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-50 text-[#4e5bff]'}`}>
              <ClipboardCheck size={36} className="text-indigo-400" />
           </div>
           <div className="absolute -inset-4 border border-dashed border-indigo-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
        </div>

        <h3 className={`text-[12px] font-black uppercase tracking-[0.4em] mb-2 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Calibration Choice</h3>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-8 max-w-[280px]">
          Choose the cognitive calibration protocol to validate your modular mastery checklist.
        </p>

        <div className="w-full space-y-4 max-w-sm">
          {/* Card 1: Standard */}
          <button
            onClick={() => { setQuizMode('standard'); setStarted(true); }}
            className={`w-full flex items-center gap-5 p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
              isZenMode
                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30'
                : 'bg-white border-slate-200 hover:border-[#4e5bff] shadow-sm'
            }`}
          >
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h4 className={`text-[12px] font-black uppercase tracking-widest ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Standard Assessment</h4>
              <p className="text-[10px] font-medium text-slate-400 mt-1">Reflective multiple choice quiz with detailed mastery feedback.</p>
            </div>
          </button>

          {/* Card 2: Timed recall */}
          <button
            onClick={() => { setQuizMode('speedrun'); setStarted(true); }}
            className={`w-full flex items-center gap-5 p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] cursor-pointer bg-gradient-to-r relative overflow-hidden ${
              isZenMode
                ? 'from-indigo-600/10 to-purple-600/10 border-indigo-500/30 hover:from-indigo-600/20 hover:to-purple-600/20'
                : 'from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-400'
            }`}
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="p-3 rounded-xl bg-indigo-600 text-white shrink-0 shadow-lg shadow-indigo-500/30">
              <Gauge size={20} />
            </div>
            <div className="relative z-10">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                Timed Recall <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[7px] font-black tracking-normal">FOCUS</span>
              </h4>
              <p className="text-[10px] font-medium text-slate-400 mt-1">15-second retrieval checks that reveal what is fluent under pressure.</p>
            </div>
          </button>
        </div>
      </motion.div>
    );
  }

  // ── COMPLETION RESULT SCREEN ──
  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const strongEvidence = percentage >= 80 && quizMode === 'speedrun';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-8">
           {strongEvidence ? (
             <div className="relative flex items-center justify-center w-28 h-28">
               <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-indigo-500 rounded-full animate-[spin_10s_linear_infinite] blur-md opacity-50" />
               <svg className="w-full h-full text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" className="animate-[spin_40s_linear_infinite]" />
                 <circle cx="50" cy="50" r="38" fill="#0c0d10" stroke="currentColor" strokeWidth="1.5" />
                 <path d="M31 52 L44 65 L71 36" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
               <div className="absolute text-[8px] font-black uppercase tracking-widest text-white mt-12">EVIDENCE</div>
             </div>
           ) : (
             <>
               <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isZenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}>
                  <Award size={48} />
               </div>
               <div className="absolute -inset-4 border border-indigo-500/20 rounded-full animate-ping" />
             </>
           )}
        </div>

        <h3 className={`text-xl font-black uppercase tracking-widest mb-1 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
          {strongEvidence ? 'Strong Recall Evidence' : 'Assessment Complete'}
        </h3>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Accuracy Evidence: {percentage}%</p>

        {quizMode === 'speedrun' && (
          <div className="flex gap-4 items-center justify-center mb-6 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <span>LONGEST RUN: {maxStreak}</span>
            <span>•</span>
            <span className="text-emerald-400">SIGNAL: {percentage >= 80 ? 'READY FOR TRANSFER' : 'REVIEW NEEDED'}</span>
          </div>
        )}

        <div className={`w-full p-6 rounded-2xl mb-8 border ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correct Answers</span>
              <span className={`text-lg font-black ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>{score} / {questions.length}</span>
           </div>
           <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-indigo-500"
              />
           </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleRestartQuiz}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} cursor-pointer`}
          >
            <RotateCcw size={14} />
            Run Another Check
          </button>
        </div>
      </motion.div>
    );
  }

  // ── ACTIVE ASSESSMENT VIEW ──
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0 z-10">
         <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">
              {quizMode === 'speedrun' ? 'TIMED RECALL CHECK' : 'Knowledge Check'}
            </span>
            <span className={`text-[12px] font-black uppercase tracking-widest ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
              Question {currentIdx + 1} of {questions.length}
            </span>
         </div>

         {quizMode === 'speedrun' ? (
           <div className="flex items-center gap-3">
             {streak > 0 && (
                <motion.div
                  key={streak}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [1, 1.35, 1] }}
                  className="relative flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-full px-3 py-1 text-[9px] font-black tracking-widest shadow-md shadow-indigo-500/25"
                >
                  <Gauge size={10} />
                  <span>RUN {streak}</span>

                  {/* Retrieval signal particles */}
                  {[...Array(6)].map((_, i) => {
                    const angle = (i * 360) / 6;
                    const rad = (angle * Math.PI) / 180;
                    const xTarget = Math.cos(rad) * 40;
                    const yTarget = Math.sin(rad) * 40;
                    return (
                      <motion.span
                        key={i}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ x: xTarget, y: yTarget, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-sky-300 to-indigo-500 pointer-events-none"
                        style={{ left: '50%', top: '50%', marginLeft: '-3px', marginTop: '-3px' }}
                      />
                    );
                  })}
                </motion.div>
             )}
             <div className="flex items-center gap-1.5 font-mono text-[11px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-full px-3 py-1">
               <Clock size={11} className="animate-pulse" />
               <span>{timeLeft}s</span>
             </div>
           </div>
         ) : (
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isZenMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <Zap size={18} className="text-indigo-500" />
           </div>
         )}
      </div>

      {/* Progress bar */}
      {quizMode === 'speedrun' ? (
        <div className="h-1.5 w-full bg-slate-800 rounded-full mb-8 overflow-hidden shrink-0 z-10">
          <motion.div
            animate={{ width: `${(timeLeft / 15) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className={`h-full ${timeLeft <= 5 ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]' : 'bg-indigo-500'}`}
          />
        </div>
      ) : (
        <div className="h-1 w-full bg-slate-100 rounded-full mb-8 overflow-hidden shrink-0 z-10">
           <motion.div
              animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              className="h-full bg-indigo-500"
           />
        </div>
      )}

      {/* Questions Canvas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col min-h-0 z-10 select-none"
        >
           <h4 className={`text-[15px] font-black leading-snug mb-8 shrink-0 ${isZenMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentQuestion.question}
           </h4>

           <div className={`flex-1 relative min-h-0 ${quizMode === 'speedrun' ? 'flex flex-col justify-center gap-3 overflow-visible pb-4' : 'space-y-3 overflow-y-auto custom-scrollbar'}`}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                const showFeedback = isAnswered;
                let borderColor = isZenMode ? 'border-white/5' : 'border-slate-200';
                let bgColor = isZenMode ? 'bg-white/[0.03]' : 'bg-white';
                let textColor = isZenMode ? 'text-slate-350' : 'text-slate-750';

                if (showFeedback) {
                  if (isCorrect) {
                    borderColor = isZenMode ? 'border-emerald-500/40' : 'border-emerald-300';
                    bgColor = isZenMode ? 'bg-emerald-500/20' : 'bg-emerald-50/80';
                    textColor = isZenMode ? 'text-emerald-400' : 'text-emerald-800';
                  } else if (isSelected) {
                    borderColor = isZenMode ? 'border-rose-500/40' : 'border-rose-300';
                    bgColor = isZenMode ? 'bg-rose-500/20' : 'bg-rose-50/80';
                    textColor = isZenMode ? 'text-rose-400' : 'text-rose-800';
                  }
                } else if (isSelected) {
                  borderColor = isZenMode ? 'border-indigo-500/40' : 'border-indigo-300';
                  bgColor = isZenMode ? 'bg-indigo-500/20' : 'bg-indigo-50/80';
                  textColor = isZenMode ? 'text-indigo-400' : 'text-indigo-800';
                }

                // Bug 14: speedrun-node class is defined in AssistantGlass.css
                const floatClass = quizMode === 'speedrun' && !isAnswered ? 'speedrun-node' : '';

                return (
                  <motion.button
                    key={idx}
                    whileHover={!isAnswered ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                    animate={shakeIdx === idx ? { x: [-6, 6, -6, 6, -3, 3, 0] } : (successIdx === idx ? { scale: [1, 1.03, 1] } : {})}
                    transition={shakeIdx === idx ? { duration: 0.4 } : (successIdx === idx ? { duration: 0.4 } : {})}
                    onClick={() => handleSelect(idx)}
                    disabled={isAnswered}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left text-xs font-medium cursor-pointer relative overflow-hidden ${
                      isZenMode ? '' : 'shadow-sm hover:shadow-md'
                    } ${borderColor} ${bgColor} ${textColor} ${floatClass}`}
                    style={
                      quizMode === 'speedrun' && !isAnswered
                        ? ({
                            animationDelay: `${idx * 0.4}s`,
                            animationDuration: `${3.5 + idx * 0.6}s`,
                            animationIterationCount: 'infinite',
                          } as any)
                        : undefined
                    }
                  >
                    {successIdx === idx && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-0 bg-emerald-500/20 rounded-xl pointer-events-none"
                      />
                    )}
                    <span className="relative z-10">{option}</span>
                    <div className="relative z-10 flex items-center shrink-0">
                      {showFeedback && isCorrect && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {showFeedback && isSelected && !isCorrect && <XCircle size={14} className="text-rose-500" />}
                    </div>
                  </motion.button>
                );
              })}
           </div>

           {/* Bug 3 fix: show explanation in standard mode after answering */}
           {isAnswered && quizMode === 'standard' && (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={`p-4 rounded-2xl mb-4 border shrink-0 ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}
             >
                <div className="flex items-center gap-2 mb-1.5">
                   <div className={`w-1.5 h-3 rounded-full ${selectedIdx === currentQuestion.correctAnswerIndex ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mastery Insight</span>
                </div>
                <p className={`text-[11px] leading-relaxed font-medium line-clamp-3 text-justify hyphens-auto ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentQuestion.explanation}
                </p>
             </motion.div>
           )}
        </motion.div>
      </AnimatePresence>

      {/* Manual progression controls — standard mode only */}
      {quizMode === 'standard' && (
        <div className="mt-auto pt-6 shrink-0 z-10">
           <button
             disabled={!isAnswered}
             onClick={handleNext}
             className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${!isAnswered ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : (isZenMode ? 'bg-white text-slate-950' : 'bg-[#4e5bff] text-white')}`}
           >
             {currentIdx < questions.length - 1 ? 'Next Check' : 'Finish Assessment'}
             <ArrowRight size={14} />
           </button>
        </div>
      )}
    </div>
  );
};

export default SARAQuizPanel;
