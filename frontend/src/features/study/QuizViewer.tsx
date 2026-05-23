import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

import { api } from '../../services/api';
import { toast } from 'sonner';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface QuizViewerProps {
  highlightedText: string;
  documentId: string;
  onClose: () => void;
  prefetchedData?: QuizQuestion[] | null;
  onDataFetched?: (data: QuizQuestion[]) => void;
}

const QuizViewer: React.FC<QuizViewerProps> = ({ highlightedText, documentId, onClose, prefetchedData, onDataFetched }) => {
  const [quizData, setQuizData] = useState<QuizQuestion[]>(prefetchedData || []);
  const [loading, setLoading] = useState(!prefetchedData || prefetchedData.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // If data was pre-fetched by the parent, do not make another API call
    if (prefetchedData && prefetchedData.length > 0) return;

    const fetchQuiz = async () => {
      try {
        const data = await api.generateQuiz(highlightedText, documentId);
        if (data && data.length > 0) {
          setQuizData(data);
          onDataFetched?.(data); // Bubble up so parent can persist
        } else {
          toast.error('Failed to generate quiz');
        }
      } catch (err: any) {
        toast.error(err.message || 'Connection error while generating quiz');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [highlightedText, documentId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
        <div className="relative mb-8">
           <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
             <div className="text-[#000666] relative z-10 animate-pulse font-bold text-2xl">⚡</div>
           </div>
           <div className="absolute -inset-6 border border-dashed border-indigo-200 rounded-full animate-[spin_15s_linear_infinite] opacity-50" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-widest text-[#000666] mb-3">SARA is building your quiz</h3>
        <p className="text-sm text-slate-500 text-center font-medium leading-relaxed max-w-xs">Extracting key concepts and generating multiple choice questions...</p>
      </div>
    );
  }

  if (!quizData || quizData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white text-center">
        <XCircle size={40} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">No quiz generated</h3>
        <p className="text-sm text-slate-500 mb-6">SARA couldn't find enough context to create a high-quality quiz for this section.</p>
        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Return to Chat</button>
      </div>
    );
  }

  const currentQuestion = quizData[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (selectedOptionIndex !== null) return; // Prevent changing answer
    setSelectedOptionIndex(index);
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOptionIndex(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
          <CheckCircle2 size={40} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Quiz Complete!</h2>
        <p className="text-slate-500 mt-2 font-medium">
          You scored <span className="text-indigo-600 font-bold">{score}</span> out of {quizData.length}.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-white/40">
      {/* Progress Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/60 backdrop-blur-sm">
        <h3 className="font-bold text-slate-800 tracking-tight">Practice Quiz</h3>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          Question {currentIndex + 1} of {quizData.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300" 
          style={{ width: `${((currentIndex + (selectedOptionIndex !== null ? 1 : 0)) / quizData.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-xl mx-auto">
          {/* Question */}
          <h2 className="text-lg font-bold text-slate-800 leading-snug mb-6">
            {currentQuestion.question}
          </h2>

          {/* Options List */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              const hasAnswered = selectedOptionIndex !== null;

              let buttonStyle = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 bg-white";
              
              if (hasAnswered) {
                if (isCorrect) {
                  buttonStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                } else if (isSelected) {
                  buttonStyle = "border-red-400 bg-red-50 text-red-900";
                } else {
                  buttonStyle = "border-slate-200 bg-white text-slate-400 opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={hasAnswered}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${buttonStyle}`}
                >
                  <span className="font-medium text-[15px] pr-4">{option}</span>
                  {hasAnswered && isCorrect && (
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0 animate-in zoom-in" />
                  )}
                  {hasAnswered && isSelected && !isCorrect && (
                    <XCircle size={20} className="text-red-500 shrink-0 animate-in zoom-in" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Area */}
          {selectedOptionIndex !== null && (
            <div className="mt-8 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-4 fade-in">
              <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Explanation</h4>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-slate-100 bg-white/80 backdrop-blur-md flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedOptionIndex === null}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm
            ${selectedOptionIndex !== null 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          {currentIndex === quizData.length - 1 ? 'Finish Quiz' : 'Next Question'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default QuizViewer;
