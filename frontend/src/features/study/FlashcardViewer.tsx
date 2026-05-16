import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, CheckCircle2, AlertCircle, Loader2, BrainCircuit, ChevronRight, MessageSquare, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardViewerProps {
  highlightedText: string;
  documentId: string;
  onClose: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ highlightedText, documentId, onClose }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await api.generateFlashcards(highlightedText, documentId);
        if (data.success) {
          setFlashcards(data.flashcards);
        } else {
          toast.error(data.error || 'Failed to generate flashcards');
        }
      } catch (err: any) {
        toast.error(err.message || 'Connection error while generating flashcards');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [highlightedText, documentId]);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setGrading(true);
    try {
      const currentCard = flashcards[currentIndex];
      const data = await api.gradeFlashcardAnswer(
        currentCard.question,
        currentCard.answer,
        userAnswer,
        documentId
      );
      if (data.success) {
        setFeedback(data.feedback);
        setIsFlipped(true);
      } else {
        toast.error(data.error || 'Grading failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection error while grading');
    } finally {
      setGrading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setFeedback(null);
      setIsFlipped(false);
    } else {
      toast.success('Session complete! Great work.');
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
        <div className="relative mb-8">
           <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
             <BrainCircuit size={40} className="text-[#000666] relative z-10 animate-pulse" />
           </div>
           <div className="absolute -inset-6 border border-dashed border-indigo-200 rounded-full animate-[spin_15s_linear_infinite] opacity-50" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-widest text-[#000666] mb-3">SARA is crafting your challenge</h3>
        <p className="text-sm text-slate-500 text-center font-medium leading-relaxed max-w-xs">Analyzing vector chunks and building conceptual flashcards for you...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white text-center">
        <AlertCircle size={40} className="text-amber-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">No flashcards generated</h3>
        <p className="text-sm text-slate-500 mb-6">SARA couldn't find enough context to create high-quality conceptual cards for this section.</p>
        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Return to Chat</button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Progress Bar */}
      <div className="shrink-0 h-1 bg-slate-100 w-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          className="h-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-10">
          
          {/* Question Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                Question {currentIndex + 1} of {flashcards.length}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {currentCard.question}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div 
                key="front"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-10 group-focus-within:opacity-20 transition-opacity" />
                  <textarea 
                    autoFocus
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here... (be as detailed as you can)"
                    className="relative w-full h-40 bg-white border border-slate-200 rounded-2xl p-6 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                    onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleSubmitAnswer()}
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-bold tracking-widest uppercase pointer-events-none">
                    ⌘ + Enter to submit
                  </div>
                </div>

                <button 
                  onClick={handleSubmitAnswer}
                  disabled={grading || !userAnswer.trim()}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black tracking-tight shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 transition-all"
                >
                  {grading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      SARA is Evaluating...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Answer
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="back"
                initial={{ opacity: 0, scale: 0.95, rotateY: 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="space-y-8"
              >
                {/* SARA's Feedback */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-[32px] p-8 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                      <Sparkles size={120} className="text-indigo-600" />
                   </div>
                   <div className="flex items-start gap-4 relative z-10">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                         <MessageSquare size={18} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">SARA's Review</h4>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
                          "{feedback}"
                        </p>
                      </div>
                   </div>
                </div>

                {/* The "Back of the Card" - Actual Textbook Definition */}
                <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                         <BookOpen size={18} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Reference Answer</h4>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">
                          {currentCard.answer}
                        </p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={nextCard}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black tracking-tight flex items-center justify-center gap-3 hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  {currentIndex === flashcards.length - 1 ? 'Finish Session' : 'Next Question'}
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default FlashcardViewer;
