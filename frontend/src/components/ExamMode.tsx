import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileCheck,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { generateQuizForModule } from '../services/geminiService';
import { QuizQuestion } from '../types';

type ExamModeType = 'recall' | 'mixed' | 'mock';

type ExamModule = {
  id: string;
  pathId: string;
  phaseId: string;
  moduleId: string;
  courseTitle: string;
  phaseTitle: string;
  moduleTitle: string;
  description: string;
  minutes: number;
  completed: boolean;
  keyConcepts: string[];
  resourceCount: number;
};

const examModes: Array<{
  id: ExamModeType;
  label: string;
  title: string;
  detail: string;
  minutes: number;
}> = [
  {
    id: 'recall',
    label: 'Recall Sprint',
    title: 'Fast memory proof',
    detail: 'Short, sharp questions for concepts you must retrieve without notes.',
    minutes: 10,
  },
  {
    id: 'mixed',
    label: 'Mixed Check',
    title: 'Concept and application',
    detail: 'Balanced questions across definitions, traps, examples, and tradeoffs.',
    minutes: 18,
  },
  {
    id: 'mock',
    label: 'Mock Exam',
    title: 'Pressure rehearsal',
    detail: 'A more formal pass with timing, review, and a clean score summary.',
    minutes: 30,
  },
];

const flowSteps = [
  { title: 'Select', detail: 'Choose one module from the current PDF classroom.' },
  { title: 'Generate', detail: 'Build a focused assessment from its concepts.' },
  { title: 'Answer', detail: 'Move question by question without losing context.' },
  { title: 'Review', detail: 'See exact misses, answers, and explanations.' },
  { title: 'Repeat', detail: 'Restart or open study for weak areas.' },
];

const normalize = (value: string) => value.trim().toLowerCase();

const fallbackQuestions = (moduleTitle: string, concepts: string[]): QuizQuestion[] => {
  const cleanConcepts = concepts.map(concept => concept.trim()).filter(Boolean);
  const seeds = cleanConcepts.length > 0 ? cleanConcepts : [moduleTitle, 'core concept', 'practical application', 'common mistake', 'review strategy'];

  return seeds.slice(0, 5).map((concept, index) => ({
    question: `In "${moduleTitle}", what is the strongest exam-ready understanding of ${concept}?`,
    options: [
      `Explain ${concept} in context, connect it to the module goal, and identify when to use it.`,
      `Memorize the term ${concept} without connecting it to examples or constraints.`,
      `Skip ${concept} until the final review because it is only background knowledge.`,
      `Treat ${concept} as unrelated to the rest of ${moduleTitle}.`,
    ],
    correctAnswerIndex: 0,
    explanation: `${concept} becomes exam-ready when you can define it, apply it, and recognize the mistake it prevents.`,
  })).concat(
    Array.from({ length: Math.max(0, 5 - Math.min(seeds.length, 5)) }, (_, extraIndex) => ({
      question: `What should you do first when a question from "${moduleTitle}" feels unfamiliar?`,
      options: [
        'Identify the concept family, remove impossible answers, then test the remaining options against the module goal.',
        'Choose the longest answer because it usually contains more detail.',
        'Ignore the wording and answer from memory only.',
        'Stop the attempt and return to passive reading.',
      ],
      correctAnswerIndex: 0,
      explanation: 'Good exam behavior starts by classifying the question before chasing details.',
    }))
  ).slice(0, 5);
};

const ExamMode: React.FC = () => {
  const navigate = useNavigate();
  const { paths, updateModuleStatus } = useAppStore();
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

  const activePaths = paths.filter(path => path.status !== 'archived');
  const examModules: ExamModule[] = activePaths.flatMap(path =>
    path.phases.flatMap(phase =>
      phase.modules.map(module => ({
        id: `${path.id}-${phase.id}-${module.id}`,
        pathId: path.id,
        phaseId: phase.id,
        moduleId: module.id,
        courseTitle: path.title,
        phaseTitle: phase.title,
        moduleTitle: module.title,
        description: module.description,
        minutes: module.estimatedMinutes || 0,
        completed: module.isCompleted,
        keyConcepts: module.keyConcepts || [],
        resourceCount: module.resources?.length || 0,
      }))
    )
  );

  const totalMinutes = examModules.reduce((sum, item) => sum + item.minutes, 0);
  const completedModules = examModules.filter(item => item.completed).length;
  const readyModules = examModules.filter(item => item.keyConcepts.length > 0 || item.description).length;
  const conceptCount = examModules.reduce((sum, item) => sum + item.keyConcepts.length, 0);

  const filteredModules = examModules.filter(item => {
    const term = normalize(query);
    const matchesQuery = !term || [
      item.courseTitle,
      item.phaseTitle,
      item.moduleTitle,
      item.description,
      ...item.keyConcepts,
    ].some(value => normalize(value).includes(term));
    const matchesPath = selectedPathId === 'all' || item.pathId === selectedPathId;
    return matchesQuery && matchesPath;
  });

  const selectedModule = filteredModules.find(item => item.id === selectedModuleId)
    || filteredModules[0]
    || null;
  const activeMode = examModes.find(mode => mode.id === selectedMode) || examModes[1];
  const answeredCount = Object.keys(answers).length;
  const score = questions.reduce((sum, question, index) => (
    answers[index] === question.correctAnswerIndex ? sum + 1 : sum
  ), 0);
  const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const hasFilters = query.trim() !== '' || selectedPathId !== 'all';

  React.useEffect(() => {
    if (!selectedModuleId && filteredModules.length > 0) {
      setSelectedModuleId(filteredModules[0].id);
    }
  }, [filteredModules, selectedModuleId]);

  const resetAttempt = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setIsStarted(false);
    setShowResults(false);
    setError(null);
  };

  const selectModule = (module: ExamModule) => {
    setSelectedModuleId(module.id);
    resetAttempt();
  };

  const startExam = async (moduleOverride?: ExamModule) => {
    const examTarget = moduleOverride || selectedModule;
    if (!examTarget) return;
    setSelectedModuleId(examTarget.id);
    setIsLoading(true);
    setIsStarted(true);
    setShowResults(false);
    setAnswers({});
    setCurrentIndex(0);
    setError(null);

    try {
      const generated = await generateQuizForModule(examTarget.moduleTitle, examTarget.keyConcepts);
      const validQuestions = generated.filter(question =>
        question.question && question.options?.length >= 4 && Number.isInteger(question.correctAnswerIndex)
      ).slice(0, 5);
      setQuestions(validQuestions.length > 0 ? validQuestions : fallbackQuestions(examTarget.moduleTitle, examTarget.keyConcepts));
    } catch (err) {
      console.error('Exam generation failed, using local fallback:', err);
      setError('AI generation paused, so a local exam was built from this module instead.');
      setQuestions(fallbackQuestions(examTarget.moduleTitle, examTarget.keyConcepts));
    } finally {
      setIsLoading(false);
    }
  };

  const finishExam = () => {
    setShowResults(true);
    if (selectedModule && questions.length > 0) {
      updateModuleStatus(selectedModule.pathId, selectedModule.phaseId, selectedModule.moduleId, scorePercent >= 80);
    }
  };

  const openStudy = () => {
    if (!selectedModule) return;
    navigate(`/study/${selectedModule.pathId}/${selectedModule.phaseId}/${selectedModule.moduleId}`);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedPathId('all');
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[#f8f9fa]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#000666]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Assessment Studio</p>
            <h1 className="truncate text-sm font-black uppercase tracking-widest text-[#000666]">Exam Mode</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666] shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 sm:inline-flex"
        >
          <Sparkles size={14} />
          New classroom
        </button>
      </header>

      <main className="relative flex-1 overflow-y-auto px-5 pb-24 pt-8 text-slate-900 sm:px-8 lg:px-10 xl:px-12">
        <div className="relative z-10 mx-auto max-w-[1500px] space-y-8">
          <section className="grid gap-6 2xl:grid-cols-[1.04fr_0.96fr] 2xl:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#000666]">
                <FileCheck size={14} />
                Exam Mode
              </div>
              <div>
                <h2 className="max-w-5xl text-3xl font-black tracking-tight text-[#000666] sm:text-5xl">
                  Turn classrooms into proof.
                </h2>
                <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-500">
                  Every PDF module becomes a clean exam loop: choose the concept, generate questions, answer under structure, then review the exact gaps.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Courses', value: activePaths.length, icon: GraduationCap },
                { label: 'Ready', value: readyModules, icon: ShieldCheck },
                { label: 'Modules', value: examModules.length, icon: Layers3 },
                { label: 'Done', value: completedModules, icon: Award },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <stat.icon size={18} className="mx-auto mb-3 text-indigo-500 opacity-80" />
                  <p className="text-3xl font-black text-[#000666]">{stat.value}</p>
                  <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 2xl:grid-cols-[0.84fr_1.16fr]">
              <div className="rounded-[28px] border border-slate-100 bg-slate-50/50 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-300">Selected Exam</p>
                    <h3 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#000666] sm:text-4xl">
                      {selectedModule?.moduleTitle || 'No classroom module yet'}
                    </h3>
                  </div>
                  {selectedModule && (
                    <span className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                      {activeMode.label}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                  {selectedModule
                    ? selectedModule.description || `${selectedModule.phaseTitle} from ${selectedModule.courseTitle}`
                    : 'Create or import a classroom first, then Exam Mode will convert its modules into structured checks.'}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {examModes.map(mode => {
                    const isActive = mode.id === selectedMode;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setSelectedMode(mode.id);
                          resetAttempt();
                        }}
                        className={`rounded-[24px] border p-5 text-left transition-all ${
                          isActive
                            ? 'border-[#000666] bg-[#000666] text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm'
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-indigo-100' : 'text-indigo-300'}`}>
                          {mode.label}
                        </p>
                        <p className="mt-2 text-sm font-black">{mode.title}</p>
                        <p className={`mt-2 text-xs font-semibold leading-5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {mode.minutes} min target
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void startExam()}
                    disabled={!selectedModule || isLoading}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_24px_60px_-24px_rgba(0,6,102,0.75)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
                    {isStarted ? 'Restart exam' : 'Start exam'}
                  </button>
                  <button
                    type="button"
                    onClick={openStudy}
                    disabled={!selectedModule}
                    className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-[#000666] shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Open study
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-slate-50/50 p-6 sm:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-300">Exam Flow</p>
                    <h3 className="mt-2 text-2xl font-black text-[#000666]">Clean pressure, then clean review.</h3>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                    {conceptCount} concepts
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  {flowSteps.map((step, index) => (
                    <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      {index < flowSteps.length - 1 && (
                        <div className="absolute left-[calc(50%+46px)] top-10 hidden h-px w-[calc(100%-40px)] bg-indigo-100 md:block" />
                      )}
                      <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-[#000666]">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <p className="mt-4 text-sm font-black text-[#000666]">{step.title}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">{step.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Source minutes', value: `${Math.round(totalMinutes / 60)}h`, icon: Clock },
                    { label: 'Current deck', value: questions.length || 5, icon: HelpCircle },
                    { label: 'Answered', value: answeredCount, icon: CheckCircle2 },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <item.icon size={15} />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">{item.label}</p>
                      </div>
                      <p className="mt-2 text-2xl font-black text-[#000666]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px_160px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search exams, modules, concepts, or courses"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-5 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:shadow-sm"
                />
              </label>
              <select
                value={selectedPathId}
                onChange={(event) => {
                  setSelectedPathId(event.target.value);
                  resetAttempt();
                }}
                className="h-14 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:shadow-sm"
              >
                <option value="all">All classrooms</option>
                {activePaths.map(path => (
                  <option key={path.id} value={path.id}>{path.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-[#000666]"
              >
                <Filter size={15} />
                Clear
              </button>
            </div>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-300">Module Bank</p>
                  <h3 className="mt-2 text-3xl font-black text-[#000666]">Choose the exam source</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                  {filteredModules.length} visible
                </span>
              </div>

              {filteredModules.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <BrainCircuit size={36} className="mx-auto text-indigo-300" />
                  <h4 className="mt-4 text-2xl font-black text-[#000666]">
                    {examModules.length > 0 && hasFilters ? 'No module matches this search' : 'No classroom modules yet'}
                  </h4>
                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
                    {examModules.length > 0 && hasFilters
                      ? 'Clear the filters or search for another course, phase, concept, or source module.'
                      : 'Build a classroom from your PDF, then Exam Mode will create the assessment layer automatically.'}
                  </p>
                  <button
                    type="button"
                    onClick={examModules.length > 0 && hasFilters ? clearFilters : () => navigate('/create')}
                    className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white"
                  >
                    {examModules.length > 0 && hasFilters ? 'Clear filters' : 'Create classroom'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  {filteredModules.map(item => {
                    const isSelected = item.id === selectedModule?.id;
                    return (
                      <article
                        key={item.id}
                        className={`rounded-3xl border bg-white p-5 shadow-sm transition-all ${
                          isSelected ? 'border-[#000666] ring-4 ring-indigo-50/50' : 'border-slate-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md'
                        }`}
                      >
                        <button type="button" onClick={() => selectModule(item)} className="w-full text-left">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 flex-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-indigo-300">
                              {item.courseTitle}
                            </p>
                            <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#000666]">
                              {item.completed ? 'Done' : 'Open'}
                            </span>
                          </div>
                          <h4 className="mt-3 line-clamp-2 min-h-[56px] text-xl font-black leading-7 text-[#000666]">
                            {item.moduleTitle}
                          </h4>
                          <p className="mt-3 line-clamp-3 min-h-[72px] text-sm font-semibold leading-6 text-slate-500">
                            {item.description || item.phaseTitle}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.keyConcepts.slice(0, 3).map(concept => (
                              <span key={`${item.id}-${concept}`} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-400">
                                {concept}
                              </span>
                            ))}
                            {item.keyConcepts.length > 3 && (
                              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-500">
                                +{item.keyConcepts.length - 3}
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wide text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {item.minutes || activeMode.minutes}m</span>
                            <span className="inline-flex items-center gap-1.5"><BookOpen size={14} /> {item.resourceCount}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              selectModule(item);
                              void startExam(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-black text-[#000666] transition hover:bg-[#000666] hover:text-white"
                          >
                            Exam
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-300">Question Console</p>
                  <h3 className="mt-2 text-3xl font-black text-[#000666]">Prove what stuck</h3>
                </div>
                {questions.length > 0 && (
                  <span className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                    {answeredCount}/{questions.length} answered
                  </span>
                )}
              </div>

              {!isStarted && (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/50 p-10 text-center">
                  <Target size={42} className="mx-auto text-indigo-400" />
                  <h4 className="mt-5 text-3xl font-black text-[#000666]">Ready for a clean attempt.</h4>
                  <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                    Select any module, choose the exam style, and start. The console will generate questions from the PDF classroom concepts and keep the review in one place.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startExam()}
                    disabled={!selectedModule}
                    className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_24px_60px_-24px_rgba(0,6,102,0.75)] disabled:opacity-45"
                  >
                    Start selected exam
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {isStarted && isLoading && (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/50 p-12 text-center">
                  <Loader2 size={42} className="mx-auto animate-spin text-indigo-400" />
                  <h4 className="mt-5 text-3xl font-black text-[#000666]">Building your exam...</h4>
                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
                    Pulling the module concepts into a focused question set.
                  </p>
                </div>
              )}

              {isStarted && !isLoading && !showResults && currentQuestion && (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/50 p-6 sm:p-8">
                  {error && (
                    <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      {error}
                    </div>
                  )}

                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-300">
                        Question {currentIndex + 1} of {questions.length}
                      </p>
                      <h4 className="mt-3 text-2xl font-black leading-tight text-[#000666]">{currentQuestion.question}</h4>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                      {activeMode.minutes} min
                    </span>
                  </div>

                  <div className="mb-6 h-2 overflow-hidden rounded-full bg-indigo-50">
                    <div
                      className="h-full rounded-full bg-[#000666] transition-all"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  <div className="grid gap-3">
                    {currentQuestion.options.slice(0, 4).map((option, optionIndex) => {
                      const isChosen = answers[currentIndex] === optionIndex;
                      return (
                        <button
                          key={`${currentIndex}-${option}`}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }))}
                          className={`group rounded-2xl border p-5 text-left text-[14px] font-bold leading-relaxed transition-all ${
                            isChosen
                              ? 'border-[#000666] bg-[#000666] text-white shadow-md'
                              : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        >
                          <span className={`mr-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                            isChosen ? 'bg-white/15 text-white' : 'bg-indigo-50 text-[#000666]'
                          }`}>
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(index => Math.max(0, index - 1))}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-[#000666] hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    {currentIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(index => Math.min(questions.length - 1, index + 1))}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#000666] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white"
                      >
                        Next
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={finishExam}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#000666] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white"
                      >
                        Finish review
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showResults && (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/50 p-8">
                    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
                      <div className="rounded-[28px] bg-indigo-50 p-6 text-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-300">Score</p>
                        <p className="mt-2 text-5xl font-black text-[#000666]">{scorePercent}%</p>
                        <p className="mt-2 text-sm font-black text-slate-400">{score}/{questions.length} correct</p>
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-[#000666]">
                          {scorePercent >= 80 ? 'Strong enough to mark as proof.' : 'Good signal. Review the misses.'}
                        </h4>
                        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                          {scorePercent >= 80
                            ? 'This module has been marked complete because your attempt crossed the proof threshold.'
                            : 'The review below shows what to fix before marking this module complete.'}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void startExam()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#000666] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white"
                          >
                            <RotateCcw size={14} />
                            Retake
                          </button>
                          <button
                            type="button"
                            onClick={openStudy}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-[#000666] hover:bg-slate-50"
                          >
                            Study weak spots
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {questions.map((question, index) => {
                      const chosen = answers[index];
                      const correct = chosen === question.correctAnswerIndex;
                      return (
                        <article key={`${question.question}-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex items-start gap-3">
                            {correct ? (
                              <CheckCircle2 className="mt-1 shrink-0 text-emerald-500" size={20} />
                            ) : (
                              <XCircle className="mt-1 shrink-0 text-rose-500" size={20} />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-black leading-6 text-[#000666]">{question.question}</p>
                              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                                Your answer: {chosen === undefined ? 'Not answered' : question.options[chosen]}
                              </p>
                              {!correct && (
                                <p className="mt-1 text-xs font-bold leading-5 text-emerald-600">
                                  Correct: {question.options[question.correctAnswerIndex]}
                                </p>
                              )}
                              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{question.explanation}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ExamMode;
