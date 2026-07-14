import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { SandboxRunResult, SandboxState } from '../../types';
import { buildModuleExercises, createInitialSandboxState, loadExerciseIntoState } from './exercises';
import { runSandboxCode } from '../../services/sandboxRunner';
import SandboxEditor from './SandboxEditor';
import SandboxOutput from './SandboxOutput';
import SandboxFiles from './SandboxFiles';
import ErrorCoach from './ErrorCoach';

interface SandboxProps {
  moduleId: string;
  moduleTitle: string;
  keyConcepts: string[];
  storedState?: SandboxState;
  isZenMode?: boolean;
  onStateChange: (state: SandboxState) => void;
  onExerciseComplete?: () => void;
}

const Sandbox: React.FC<SandboxProps> = ({
  moduleId,
  moduleTitle,
  keyConcepts,
  storedState,
  isZenMode,
  onStateChange,
  onExerciseComplete,
}) => {
  const exercises = useMemo(
    () => buildModuleExercises(moduleTitle, keyConcepts),
    [moduleTitle, keyConcepts],
  );

  const [state, setState] = useState<SandboxState>(
    () => storedState ?? createInitialSandboxState(exercises),
  );
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exercise = exercises[state.exerciseIndex];
  const activeCode = state.files[state.activeFile] ?? '';

  useEffect(() => {
    setState(storedState ?? createInitialSandboxState(exercises));
    setResult(null);
  }, [moduleId]);

  const persistState = useCallback(
    (next: SandboxState) => {
      setState(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onStateChange(next), 500);
    },
    [onStateChange],
  );

  const updateCode = (code: string) => {
    persistState({
      ...state,
      files: { ...state.files, [state.activeFile]: code },
    });
  };

  const handleRun = useCallback(async () => {
    if (!exercise || isRunning) return;
    setIsRunning(true);
    setResult(null);
    setRuntimeStatus(null);

    const attemptId = exercise.id;
    const prevAttempts = state.attempts[attemptId]?.attempts ?? 0;

    try {
      const runResult = await runSandboxCode(
        exercise.language,
        activeCode,
        exercise.testCode,
        setRuntimeStatus,
      );
      setResult(runResult);

      const nextAttempts: SandboxState = {
        ...state,
        attempts: {
          ...state.attempts,
          [attemptId]: {
            exerciseId: attemptId,
            passed: runResult.success,
            attempts: prevAttempts + 1,
            lastRunAt: Date.now(),
          },
        },
      };

      if (runResult.success && !state.completedExerciseIds.includes(attemptId)) {
        nextAttempts.completedExerciseIds = [...state.completedExerciseIds, attemptId];
        onExerciseComplete?.();
      }

      persistState(nextAttempts);
    } finally {
      setIsRunning(false);
      setRuntimeStatus(null);
    }
  }, [exercise, isRunning, activeCode, state, persistState, onExerciseComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRun]);

  const goToExercise = (index: number) => {
    if (index < 0 || index >= exercises.length) return;
    const next = loadExerciseIntoState(state, exercises, index);
    setResult(null);
    persistState(next);
  };

  const showErrorCoach = result && !result.success;
  const completedCount = state.completedExerciseIds.length;

  return (
    <div className={`flex flex-col h-full min-h-0 ${isZenMode ? 'bg-[#07080b]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${isZenMode ? 'border-white/10 bg-[#0c0d12]/45' : 'border-slate-200 bg-slate-50/50'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Traffic light dots for premium desktop feel */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-60" />
          </div>
          <div className="w-px h-4 bg-slate-300/30 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none mb-1.5 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Challenge {state.exerciseIndex + 1} of {exercises.length}
              {completedCount > 0 && ` · ${completedCount} solved`}
            </p>
            <h3 className={`text-[13px] font-extrabold truncate leading-none ${isZenMode ? 'text-white' : 'text-slate-800'}`}>
              {exercise?.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => goToExercise(state.exerciseIndex - 1)}
            disabled={state.exerciseIndex === 0}
            className={`p-2 rounded-xl border transition-all disabled:opacity-20 cursor-pointer ${
              isZenMode 
                ? 'text-slate-400 border-white/5 hover:bg-white/5 hover:text-white' 
                : 'text-slate-550 border-slate-200/60 hover:bg-slate-100 hover:text-slate-800'
            }`}
            aria-label="Previous exercise"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => goToExercise(state.exerciseIndex + 1)}
            disabled={state.exerciseIndex >= exercises.length - 1}
            className={`p-2 rounded-xl border transition-all disabled:opacity-20 cursor-pointer ${
              isZenMode 
                ? 'text-slate-400 border-white/5 hover:bg-white/5 hover:text-white' 
                : 'text-slate-550 border-slate-200/60 hover:bg-slate-100 hover:text-slate-800'
            }`}
            aria-label="Next exercise"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.12em] disabled:opacity-50 transition-all cursor-pointer shadow-[0_4px_14px_rgba(78,91,255,0.3)] hover:shadow-[0_6px_20px_rgba(78,91,255,0.45)] hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #4e5bff 0%, #6366f1 100%)',
            }}
          >
            {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
            {isRunning ? (runtimeStatus || 'Running…') : 'Run ⌘↵'}
          </button>
        </div>
      </div>

      {/* Brief */}
      <div className={`px-5 py-3.5 border-b shrink-0 ${
        isZenMode 
          ? 'border-white/10 bg-[#090b10]/40' 
          : 'border-slate-150 bg-slate-50/50'
      }`}>
        <p className={`text-[12px] text-justify hyphens-auto leading-relaxed ${isZenMode ? 'text-slate-400' : 'text-slate-650'}`}>
          {exercise?.brief}
        </p>
        {state.completedExerciseIds.includes(exercise?.id ?? '') && (
          <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
            <CheckCircle2 size={11} /> 
            <span>Challenge Solved</span>
          </span>
        )}
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0">
        <SandboxFiles
          files={Object.keys(state.files)}
          activeFile={state.activeFile}
          onSelect={(name) => persistState({ ...state, activeFile: name })}
          isZenMode={isZenMode}
        />

        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <SandboxEditor
                value={activeCode}
                onChange={updateCode}
                activeLine={result?.errorLine}
                isZenMode={isZenMode}
                language={exercise?.language}
              />
            </div>

            {showErrorCoach && exercise && (
              <ErrorCoach
                result={result}
                code={activeCode}
                fileName={state.activeFile}
                language={exercise.language}
                exerciseTitle={exercise.title}
                hints={exercise.hints}
                isZenMode={isZenMode}
                onApplyFix={(fixed) => updateCode(fixed)}
              />
            )}
          </div>

          <div className="h-40 shrink-0">
            <SandboxOutput result={result} isRunning={isRunning} isZenMode={isZenMode} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sandbox;
