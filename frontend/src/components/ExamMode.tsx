import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Award, BookOpen, BrainCircuit, CheckCircle2,
  Clock, GraduationCap, Loader2, Play, RotateCcw, Search, Sparkles,
  Target, XCircle, Zap,
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { generateQuizForModule } from '../services/geminiService';
import { QuizQuestion } from '../types';
import { useFocus } from '../context/FocusContext';

// ── Types & Data ─────────────────────────────────────────────────────────────
type ExamModeType = 'recall' | 'mixed' | 'mock';
type ExamModule = {
  id: string; pathId: string; phaseId: string; moduleId: string;
  courseTitle: string; phaseTitle: string; moduleTitle: string;
  description: string; minutes: number; completed: boolean;
  keyConcepts: string[]; resourceCount: number;
};

const examModes: { id: ExamModeType; label: string; mins: number }[] = [
  { id: 'recall', label: 'Recall Sprint', mins: 10 },
  { id: 'mixed', label: 'Mixed Check', mins: 18 },
  { id: 'mock', label: 'Mock Exam', mins: 30 },
];

const fallbackQuestions = (title: string, concepts: string[]): QuizQuestion[] => {
  const seeds = concepts.length > 0 ? concepts : [title, 'core concept', 'application', 'common mistake', 'review'];
  return seeds.slice(0, 5).map((c, i) => ({
    question: `In "${title}", what is the strongest understanding of ${c}?`,
    options: [
      `Explain ${c} in context, connect it to the module goal, and identify when to use it.`,
      `Memorize ${c} without connecting it to examples.`,
      `Skip ${c} until final review.`,
      `Treat ${c} as unrelated to ${title}.`,
    ],
    correctAnswerIndex: 0,
    explanation: `${c} is exam-ready when you can define, apply, and recognize errors it prevents.`,
  }));
};

// ── Component ────────────────────────────────────────────────────────────────
const ExamMode: React.FC = () => {
  const navigate = useNavigate();
  const { paths, updateModuleStatus } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();
  const [query, setQuery] = React.useState('');
  const [selectedPathId, setSelectedPathId] = React.useState('all');
  const [selectedMode, setSelectedMode] = React.useState<ExamModeType>('mixed');
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isStarted, setIsStarted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showResults, setShowResults] = React.useState(false);

  const activePaths = paths.filter(p => p.status !== 'archived');
  const examModules: ExamModule[] = activePaths.flatMap(path =>
    path.phases.flatMap(phase =>
      phase.modules.map(mod => ({
        id: `${path.id}-${phase.id}-${mod.id}`, pathId: path.id, phaseId: phase.id, moduleId: mod.id,
        courseTitle: path.title, phaseTitle: phase.title, moduleTitle: mod.title,
        description: mod.description, minutes: mod.estimatedMinutes || 0,
        completed: mod.isCompleted, keyConcepts: mod.keyConcepts || [],
        resourceCount: mod.resources?.length || 0,
      }))
    )
  );

  const readyCount = examModules.filter(m => m.keyConcepts.length > 0 || m.description).length;
  const doneCount = examModules.filter(m => m.completed).length;

  const filtered = examModules.filter(item => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || [item.courseTitle, item.phaseTitle, item.moduleTitle, item.description, ...item.keyConcepts].some(v => v.toLowerCase().includes(q));
    const matchP = selectedPathId === 'all' || item.pathId === selectedPathId;
    return matchQ && matchP;
  });

  const selectedModule = filtered.find(i => i.id === selectedModuleId) || filtered[0] || null;
  const activeMode = examModes.find(m => m.id === selectedMode) || examModes[1];
  const answeredCount = Object.keys(answers).length;
  const score = questions.reduce((s, q, i) => answers[i] === q.correctAnswerIndex ? s + 1 : s, 0);
  const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];

  React.useEffect(() => {
    if (!selectedModuleId && filtered.length > 0) setSelectedModuleId(filtered[0].id);
  }, [filtered, selectedModuleId]);

  const reset = () => { setQuestions([]); setAnswers({}); setCurrentIndex(0); setIsStarted(false); setShowResults(false); setError(null); };
  const selectModule = (m: ExamModule) => { setSelectedModuleId(m.id); reset(); };

  const startExam = async (override?: ExamModule) => {
    const target = override || selectedModule;
    if (!target) return;
    setSelectedModuleId(target.id);
    setIsLoading(true); setIsStarted(true); setShowResults(false); setAnswers({}); setCurrentIndex(0); setError(null);
    try {
      const gen = await generateQuizForModule(target.moduleTitle, target.keyConcepts);
      const valid = gen.filter(q => q.question && q.options?.length >= 4 && Number.isInteger(q.correctAnswerIndex)).slice(0, 5);
      setQuestions(valid.length > 0 ? valid : fallbackQuestions(target.moduleTitle, target.keyConcepts));
    } catch {
      setError('AI paused — using local questions.');
      setQuestions(fallbackQuestions(target.moduleTitle, target.keyConcepts));
    } finally { setIsLoading(false); }
  };

  const finishExam = () => {
    setShowResults(true);
    if (selectedModule && questions.length > 0) updateModuleStatus(selectedModule.pathId, selectedModule.phaseId, selectedModule.moduleId, scorePercent >= 80);
  };

  const openStudy = () => {
    if (selectedModule) navigate(`/study/${selectedModule.pathId}/${selectedModule.phaseId}/${selectedModule.moduleId}`);
  };

  return (
    <div className="relative h-full flex-1 overflow-y-auto px-5 pb-24 pt-8 sm:px-8 lg:px-10 xl:px-14 bg-[#07090e] text-slate-100">
      
      {/* Neural Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 relative z-10">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-white/5">
          <div>
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400">Vidhyalaya — Place of Wisdom</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">Exam Mode</h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              {examModules.length > 0 ? `${readyCount} modules ready for assessment.` : 'Create a classroom to unlock exams.'}
            </p>
          </div>
          
          <button 
            onClick={() => setIsZenMode(!isZenMode)}
            className={`flex items-center gap-2 h-9 px-5 rounded-[14px] transition-all border ${
              isZenMode 
                ? 'bg-white border-white text-[#07090e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Sparkles size={14} className={isZenMode ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        {examModules.length > 0 && !isZenMode && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: <GraduationCap size={14} />, val: activePaths.length, label: 'Courses' },
              { icon: <Target size={14} />, val: readyCount, label: 'Ready' },
              { icon: <BookOpen size={14} />, val: examModules.length, label: 'Modules' },
              { icon: <Award size={14} />, val: doneCount, label: 'Completed' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4 rounded-[20px] px-5 py-4 bg-white/[0.01] border border-white/5 transition-all hover:bg-white/[0.02] hover:border-indigo-500/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-indigo-500/10 text-indigo-400">{s.icon}</div>
                <div>
                  <p className="text-[18px] font-black leading-none tracking-tight text-white">{s.val}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Exam Setup + Question Console ───────────────────────── */}
        {examModules.length > 0 && (
          <div className={`grid gap-5 ${isZenMode ? 'grid-cols-1 max-w-2xl mx-auto' : 'xl:grid-cols-[320px_1fr]'}`}>

            {/* Left: Module selector + Mode picker */}
            {!isZenMode && (
              <div className="flex flex-col gap-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto no-scrollbar">

                {/* Search + filter */}
                <div className="rounded-[20px] p-4 bg-white/[0.01] border border-white/5">
                  <label className="flex h-9 items-center gap-2 rounded-[12px] bg-white/[0.03] border border-white/10 px-3 focus-within:border-indigo-500/50 transition-colors">
                    <Search size={13} className="shrink-0 text-slate-500" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules..."
                      className="w-full bg-transparent text-[12px] font-semibold outline-none text-white placeholder:text-slate-500" />
                  </label>
                  <select value={selectedPathId} onChange={e => { setSelectedPathId(e.target.value); reset(); }}
                    className="mt-2 h-9 w-full rounded-[12px] border border-white/10 bg-[#07090e] px-3 text-[11px] font-bold outline-none text-slate-300 focus:border-indigo-500 transition-colors">
                    <option value="all">All classrooms</option>
                    {activePaths.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                {/* Exam mode picker */}
                <div className="rounded-[20px] p-4 bg-white/[0.01] border border-white/5">
                  <h3 className="mb-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Exam Type</h3>
                  <div className="space-y-1.5">
                    {examModes.map(mode => (
                      <button key={mode.id} onClick={() => { setSelectedMode(mode.id); reset(); }}
                        className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[12px] font-bold transition-all ${
                          selectedMode === mode.id 
                            ? 'bg-indigo-600 text-white border border-indigo-500 shadow-lg' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}>
                        {mode.label}
                        <span className={`text-[10px] ${selectedMode === mode.id ? 'text-white/50' : 'text-slate-500'}`}>{mode.mins}m</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module list */}
                <div className="rounded-[20px] p-4 bg-white/[0.01] border border-white/5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Modules</h3>
                    <span className="text-[9px] font-bold text-indigo-400">{filtered.length}</span>
                  </div>
                  <div className="max-h-[300px] space-y-1 overflow-y-auto no-scrollbar">
                    {filtered.length > 0 ? filtered.map(item => (
                      <button key={item.id} onClick={() => selectModule(item)}
                        className={`flex w-full items-start gap-2 rounded-[12px] px-3 py-2.5 text-left transition-all ${
                          item.id === selectedModule?.id 
                            ? 'bg-indigo-600 text-white shadow-md border border-indigo-500' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold">{item.moduleTitle}</p>
                          <p className={`truncate text-[9px] ${item.id === selectedModule?.id ? 'text-white/50' : 'text-slate-500'}`}>{item.courseTitle}</p>
                        </div>
                        {item.completed && <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${item.id === selectedModule?.id ? 'text-white/60' : 'text-emerald-400'}`} />}
                      </button>
                    )) : (
                      <p className="py-4 text-center text-[11px] font-medium text-slate-500">No modules match.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Right: Question console */}
            <div className="space-y-4">
              {!isStarted && (
                <div className="flex flex-col items-center justify-center rounded-[24px] px-8 py-16 text-center bg-white/[0.01] border border-white/5 shadow-2xl shadow-indigo-500/5">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-500/10 text-indigo-400">
                    <Target size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[15px] font-black text-white">
                    {selectedModule ? selectedModule.moduleTitle : 'Select a module'}
                  </h3>
                  {selectedModule && (
                    <p className="mt-1.5 max-w-md text-[12px] font-medium font-serif italic text-slate-400">
                      {selectedModule.description || selectedModule.phaseTitle}
                    </p>
                  )}
                  <button onClick={() => void startExam()} disabled={!selectedModule}
                    className="mt-5 inline-flex items-center gap-2.5 rounded-[16px] px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl bg-indigo-600 shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none">
                    <Play size={13} /> Start {activeMode.label}
                  </button>
                </div>
              )}

              {/* Loading */}
              {isStarted && isLoading && (
                <div className="flex flex-col items-center justify-center rounded-[24px] px-8 py-16 text-center bg-white/[0.01] border border-white/5 shadow-2xl">
                  <Loader2 size={28} className="mb-4 animate-spin text-indigo-400" />
                  <h3 className="text-[15px] font-black text-white">Generating questions...</h3>
                  <p className="mt-1.5 text-[12px] font-medium text-slate-500">Pulling concepts into a focused exam.</p>
                </div>
              )}

              {/* Active question */}
              {isStarted && !isLoading && !showResults && currentQuestion && (
                <div className="rounded-[24px] p-6 bg-white/[0.01] border border-white/5 shadow-xl">
                  {error && <div className="mb-4 rounded-[12px] bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-400 border border-amber-500/20">{error}</div>}

                  {/* Progress */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-[10px] font-black text-indigo-400">{answeredCount}/{questions.length} answered</span>
                  </div>
                  <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
                  </div>

                  {/* Question */}
                  <h3 className="mb-5 text-[15px] font-black leading-snug tracking-tight text-white">{currentQuestion.question}</h3>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentQuestion.options.slice(0, 4).map((opt, oi) => {
                      const chosen = answers[currentIndex] === oi;
                      return (
                        <button key={`${currentIndex}-${oi}`} onClick={() => setAnswers(p => ({ ...p, [currentIndex]: oi }))}
                          className={`flex w-full items-start gap-3 rounded-[14px] border-2 p-4 text-left text-[13px] font-semibold leading-relaxed transition-all ${
                            chosen
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                              : 'border-white/5 bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10'
                          }`}>
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-[10px] font-black transition-colors ${chosen ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nav */}
                  <div className="mt-5 flex items-center justify-between">
                    <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
                      className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-30 text-slate-500 hover:bg-white/5 hover:text-slate-300">
                      <ArrowLeft size={13} /> Back
                    </button>
                    {currentIndex < questions.length - 1 ? (
                      <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                        className="inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] bg-indigo-600 shadow-indigo-500/20">
                        Next <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button onClick={finishExam}
                        className="inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] bg-indigo-600 shadow-indigo-500/20">
                        Finish <CheckCircle2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Results */}
              {showResults && (
                <div className="space-y-4">
                  {/* Score card */}
                  <div className="flex items-center gap-6 rounded-[24px] p-6 bg-white/[0.01] border border-white/5 shadow-2xl shadow-indigo-500/5">
                    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[20px] bg-indigo-500/10 text-indigo-400">
                      <span className="text-[28px] font-black">{scorePercent}%</span>
                      <span className="text-[9px] font-black text-slate-500">{score}/{questions.length}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-black text-white">
                        {scorePercent >= 80 ? 'Strong — marked as proof.' : 'Review the misses below.'}
                      </h3>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">
                        {scorePercent >= 80 ? 'Module marked complete.' : 'Fix gaps before marking complete.'}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => void startExam()}
                          className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] bg-indigo-600 shadow-indigo-500/20">
                          <RotateCcw size={11} /> Retake
                        </button>
                        <button onClick={openStudy}
                          className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/20 bg-white/10 text-slate-300 ring-1 ring-white/10">
                          Study <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Question review */}
                  {questions.map((q, qi) => {
                    const chosen = answers[qi];
                    const correct = chosen === q.correctAnswerIndex;
                    return (
                      <div key={qi} className="rounded-[18px] p-5 bg-white/[0.01] border border-white/5">
                        <div className="flex items-start gap-3">
                          {correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white">{q.question}</p>
                            <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                              Your answer: {chosen !== undefined ? q.options[chosen] : 'Skipped'}
                            </p>
                            {!correct && <p className="mt-1 text-[11px] font-semibold text-emerald-400">Correct: {q.options[q.correctAnswerIndex]}</p>}
                            <p className="mt-2 text-[11px] font-medium font-serif italic text-slate-500">{q.explanation}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {examModules.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[36px] px-10 py-24 text-center bg-white/[0.01] border border-white/5 shadow-2xl">
            <div className="relative mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-indigo-500/10 text-indigo-400">
                <BrainCircuit size={28} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white bg-indigo-600">
                <Sparkles size={10} />
              </div>
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">No modules to examine</h3>
            <p className="mt-2 max-w-xs text-[13px] font-medium leading-relaxed text-slate-500">
              Create a classroom and your modules will become exam-ready assessments.
            </p>
            <button onClick={() => navigate('/create')}
              className="group mt-5 inline-flex items-center gap-2.5 rounded-[16px] px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl bg-indigo-600 shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97]">
              <Zap size={13} className="fill-white" /> Deploy Classroom
            </button>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        {examModules.length > 0 && (
          <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-500">
            <span>{filtered.length} of {examModules.length} modules</span>
            <span className="flex items-center gap-1.5"><Zap size={11} className="text-indigo-400" /> Powered by Gemini AI</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamMode;
