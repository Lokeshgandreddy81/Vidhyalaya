import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Zap } from 'lucide-react';

interface SARAQuizPanelProps {
  questions: QuizQuestion[];
  isZenMode?: boolean;
  onRestart: () => void;
}

const SARAQuizPanel: React.FC<SARAQuizPanelProps> = ({ questions, isZenMode, onRestart }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);
    if (idx === currentQuestion.correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-8">
           <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isZenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}>
              <Award size={48} />
           </div>
           <div className="absolute -inset-4 border border-indigo-500/20 rounded-full animate-ping" />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-widest mb-2 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Assessment Complete</h3>
        <p className="text-sm font-medium text-slate-500 mb-6">Mastery Level: {percentage}%</p>
        
        <div className={`w-full p-6 rounded-2xl mb-8 border ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</span>
              <span className={`text-lg font-black ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>{score} / {questions.length}</span>
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

        <button 
          onClick={onRestart}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'bg-white text-slate-900' : 'bg-[#000666] text-white'} hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/10`}
        >
          <RotateCcw size={16} />
          New Assessment
        </button>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
         <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Knowledge Pulse</span>
            <span className={`text-[12px] font-black uppercase tracking-widest ${isZenMode ? 'text-white' : 'text-slate-900'}`}>Question {currentIdx + 1} of {questions.length}</span>
         </div>
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isZenMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <Zap size={18} className="text-indigo-500" />
         </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-slate-100 rounded-full mb-10 overflow-hidden shrink-0">
         <motion.div 
            animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            className="h-full bg-indigo-500"
         />
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col"
        >
           <h4 className={`text-base font-black leading-tight mb-8 ${isZenMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentQuestion.question}
           </h4>

           <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                const showFeedback = isAnswered;
                
                let borderColor = isZenMode ? 'border-white/5' : 'border-slate-100';
                let bgColor = isZenMode ? 'bg-white/5' : 'bg-slate-50';
                let textColor = isZenMode ? 'text-slate-400' : 'text-slate-600';

                if (showFeedback) {
                  if (isCorrect) {
                    borderColor = 'border-emerald-500/50';
                    bgColor = 'bg-emerald-500/10';
                    textColor = 'text-emerald-500';
                  } else if (isSelected) {
                    borderColor = 'border-rose-500/50';
                    bgColor = 'bg-rose-500/10';
                    textColor = 'text-rose-500';
                  }
                } else if (isSelected) {
                  borderColor = 'border-indigo-500';
                  bgColor = 'bg-indigo-500/5';
                  textColor = 'text-indigo-500';
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!isAnswered ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                    onClick={() => handleSelect(idx)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left text-sm font-medium ${borderColor} ${bgColor} ${textColor}`}
                  >
                    <span>{option}</span>
                    {showFeedback && isCorrect && <CheckCircle2 size={16} />}
                    {showFeedback && isSelected && !isCorrect && <XCircle size={16} />}
                  </motion.button>
                );
              })}
           </div>

           {isAnswered && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={`p-5 rounded-2xl mb-8 border ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}
             >
                <div className="flex items-center gap-2 mb-2">
                   <div className={`w-1.5 h-4 rounded-full ${selectedIdx === currentQuestion.correctAnswerIndex ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mastery Insight</span>
                </div>
                <p className={`text-[12px] leading-relaxed font-medium ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>{currentQuestion.explanation}</p>
             </motion.div>
           )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pt-6 shrink-0">
         <button 
           disabled={!isAnswered}
           onClick={handleNext}
           className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${!isAnswered ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : (isZenMode ? 'bg-white text-slate-950' : 'bg-[#000666] text-white')}`}
         >
           {currentIdx < questions.length - 1 ? 'Next Pulse' : 'Finalize Result'}
           <ArrowRight size={14} />
         </button>
      </div>
    </div>
  );
};

export default SARAQuizPanel;
