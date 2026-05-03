import React, { useState } from 'react';
import { X, RotateCcw, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle, BookOpen, Zap, BrainCircuit, Lightbulb, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Flashcard } from '../services/geminiService';
import { QuizQuestion } from '../types';

// ── Shared Close Button ──────────────────────────────────────────────────────
const ModalShell: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; accentColor: string; onClose: () => void; children: React.ReactNode }> = ({
  title, subtitle, icon, accentColor, onClose, children
}) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: accentColor }}>
            {icon}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all">
          <X size={18} />
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

// ── 1. QUICK REFRESH MODAL ───────────────────────────────────────────────────
interface QuickRefreshModalProps {
  isOpen: boolean;
  topic: string;
  content: string;
  onClose: () => void;
}

export const QuickRefreshModal: React.FC<QuickRefreshModalProps> = ({ isOpen, topic, content, onClose }) => {
  if (!isOpen) return null;
  return (
    <ModalShell
      title="Quick Refresh"
      subtitle={`Cheat Sheet · ${topic}`}
      icon={<Zap size={18} />}
      accentColor="#10b981"
      onClose={onClose}
    >
      <div className="p-6 prose prose-slate max-w-none
        prose-h1:text-xl prose-h1:font-black prose-h1:text-[#000666] prose-h1:tracking-tight prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-3
        prose-h2:text-sm prose-h2:font-black prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-slate-500 prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-sm prose-h3:font-bold prose-h3:text-[#000666]
        prose-p:text-sm prose-p:text-slate-600 prose-p:leading-relaxed
        prose-strong:text-[#000666] prose-strong:font-bold
        prose-code:bg-indigo-50 prose-code:text-indigo-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:text-xs
        prose-li:text-sm prose-li:text-slate-600 prose-li:my-0.5
        prose-ul:space-y-1
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </ModalShell>
  );
};

// ── 2. FLASHCARDS MODAL ──────────────────────────────────────────────────────
interface FlashcardsModalProps {
  isOpen: boolean;
  topic: string;
  cards: Flashcard[];
  onClose: () => void;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ isOpen, topic, cards, onClose }) => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());

  if (!isOpen || cards.length === 0) return null;

  const card = cards[index];
  const progress = (mastered.size / cards.length) * 100;

  const goNext = () => { setIndex(i => Math.min(i + 1, cards.length - 1)); setFlipped(false); };
  const goPrev = () => { setIndex(i => Math.max(i - 1, 0)); setFlipped(false); };
  const toggleMastered = () => {
    setMastered(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  return (
    <ModalShell
      title="Flashcard Deck"
      subtitle={`${cards.length} Cards · ${topic}`}
      icon={<BrainCircuit size={18} />}
      accentColor="#6366f1"
      onClose={onClose}
    >
      <div className="p-6 flex flex-col items-center gap-6">
        {/* Progress */}
        <div className="w-full">
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            <span>Card {index + 1} of {cards.length}</span>
            <span className="text-indigo-600">{mastered.size} Mastered</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="w-full" style={{ perspective: '1200px' }}>
          <div
            className="relative w-full cursor-pointer transition-transform duration-500 ease-in-out"
            style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '260px' }}
            onClick={() => setFlipped(f => !f)}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-[#000666] to-indigo-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-indigo-900/20" style={{ backfaceVisibility: 'hidden' }}>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-4">QUESTION</div>
              <h3 className="text-xl font-bold text-white leading-tight">{card.front}</h3>
              {card.hint && (
                <div className="mt-6 flex items-center gap-1.5 text-indigo-300 text-xs font-medium">
                  <Lightbulb size={12} />
                  <span className="italic">{card.hint}</span>
                </div>
              )}
              <div className="absolute bottom-5 flex items-center gap-1.5 text-indigo-400 text-[10px] font-bold">
                <Eye size={12} />
                Tap to reveal
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-4">ANSWER</div>
              <p className="text-slate-700 text-base leading-relaxed font-medium">{card.back}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <button
            onClick={toggleMastered}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${mastered.has(card.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
          >
            <CheckCircle2 size={16} />
            {mastered.has(card.id) ? 'Mastered!' : 'Mark Mastered'}
          </button>

          <button
            onClick={goNext}
            disabled={index === cards.length - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        {/* All cards mini nav */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { setIndex(i); setFlipped(false); }}
              className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all ${i === index ? 'bg-indigo-600 text-white scale-110' : mastered.has(c.id) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

// ── 3. PRACTICE QUIZ MODAL ───────────────────────────────────────────────────
interface PracticeQuizModalProps {
  isOpen: boolean;
  topic: string;
  questions: QuizQuestion[];
  onClose: () => void;
}

export const PracticeQuizModal: React.FC<PracticeQuizModalProps> = ({ isOpen, topic, questions, onClose }) => {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  if (!isOpen || questions.length === 0) return null;

  const question = questions[qIndex];
  const hasAnswered = selected !== null;
  const isCorrect = selected === question.correctAnswerIndex;
  const totalCorrect = Object.entries(answers).filter(([qi, ai]) => questions[Number(qi)]?.correctAnswerIndex === ai).length;

  const handleSelect = (optIndex: number) => {
    if (selected !== null) return; // Already answered
    setSelected(optIndex);
    setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const goNext = () => {
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
      setSelected(answers[qIndex + 1] ?? null);
    } else {
      setShowResults(true);
    }
  };

  const restart = () => {
    setQIndex(0);
    setSelected(null);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const pct = Math.round((totalCorrect / questions.length) * 100);
    return (
      <ModalShell title="Quiz Results" subtitle={topic} icon={<Award size={18} />} accentColor="#f59e0b" onClose={onClose}>
        <div className="p-8 flex flex-col items-center text-center gap-6">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-200">
            <span className="text-3xl font-black text-white">{pct}%</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">
              {pct >= 80 ? '🎯 Excellent!' : pct >= 60 ? '📚 Good Progress' : '💪 Keep Studying'}
            </h3>
            <p className="text-slate-500 font-serif">{totalCorrect} of {questions.length} correct</p>
          </div>
          <div className="w-full space-y-2">
            {questions.map((q, i) => {
              const answered = answers[i];
              const correct = answered === q.correctAnswerIndex;
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {correct ? <CheckCircle2 size={16} className="shrink-0 text-emerald-500" /> : <XCircle size={16} className="shrink-0 text-red-400" />}
                  <span className="text-left line-clamp-1">{q.question}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={restart} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all">
              <RotateCcw size={15} /> Retry Quiz
            </button>
            <button onClick={onClose} className="flex-1 py-3 bg-[#000666] hover:bg-indigo-900 text-white font-bold rounded-xl text-sm transition-all">
              Back to Dashboard
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Practice Quiz"
      subtitle={`Question ${qIndex + 1} of ${questions.length} · ${topic}`}
      icon={<BookOpen size={18} />}
      accentColor="#f59e0b"
      onClose={onClose}
    >
      <div className="p-6 flex flex-col gap-6">
        {/* Progress */}
        <div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700" style={{ width: `${((qIndex + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Question {qIndex + 1}</p>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">{question.question}</h3>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((opt, i) => {
            let style = 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50';
            if (hasAnswered) {
              if (i === question.correctAnswerIndex) style = 'bg-emerald-50 border-emerald-400 text-emerald-800';
              else if (i === selected) style = 'bg-red-50 border-red-400 text-red-700';
              else style = 'bg-white border-slate-200 text-slate-400 opacity-60';
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={hasAnswered}
                className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left font-semibold text-sm transition-all duration-200 ${style} disabled:cursor-default`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${hasAnswered && i === question.correctAnswerIndex ? 'bg-emerald-500 text-white' : hasAnswered && i === selected && i !== question.correctAnswerIndex ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {hasAnswered && (
          <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-4 duration-400 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: isCorrect ? '#059669' : '#6366f1' }}>
              {isCorrect ? '✓ Correct!' : 'Not quite — here\'s why:'}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed font-serif">{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {hasAnswered && (
          <button
            onClick={goNext}
            className="w-full py-3.5 bg-[#000666] hover:bg-indigo-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 animate-in fade-in duration-300"
          >
            {qIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </ModalShell>
  );
};
