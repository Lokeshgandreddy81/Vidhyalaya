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
    <div className={`flex flex-col h-full min-h-0 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="min-w-0 flex-1">
          <p className={`text-[9px] font-bold uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Exercise {state.exerciseIndex + 1} of {exercises.length}
            {completedCount > 0 && ` · ${completedCount} complete`}
          </p>
          <h3 className={`text-sm font-bold truncate ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
            {exercise?.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => goToExercise(state.exerciseIndex - 1)}
            disabled={state.exerciseIndex === 0}
            className={`p-2 rounded-lg disabled:opacity-30 ${isZenMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            aria-label="Previous exercise"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => goToExercise(state.exerciseIndex + 1)}
            disabled={state.exerciseIndex >= exercises.length - 1}
            className={`p-2 rounded-lg disabled:opacity-30 ${isZenMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            aria-label="Next exercise"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#000666] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#000888] disabled:opacity-50 transition-colors"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {isRunning ? (runtimeStatus || 'Running…') : 'Run ⌘↵'}
          </button>
        </div>
      </div>

      {/* Brief */}
      <div className={`px-4 py-2.5 border-b shrink-0 ${isZenMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/80'}`}>
        <p className={`text-[12px] text-justify hyphens-auto leading-relaxed ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {exercise?.brief}
        </p>
        {state.completedExerciseIds.includes(exercise?.id ?? '') && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-emerald-500">
            <CheckCircle2 size={12} /> Completed
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
