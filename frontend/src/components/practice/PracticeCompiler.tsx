import React, { useState, useCallback, useEffect } from 'react';
import { Play, Loader2, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react';
import { runFreeformCode, FreeformLanguage } from '../../services/sandboxRunner';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useClassroomPlayback } from '../../context/ClassroomPlaybackContext';

const LANGUAGES: { id: FreeformLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
];

const STARTERS: Record<FreeformLanguage, string> = {
  javascript: `// Write and run JavaScript\nconsole.log("Hello from Practice");\n`,
  typescript: `// TypeScript (compiled as JS)\nconst greet = (name: string) => \`Hello, \${name}\`;\nconsole.log(greet("Cortex"));\n`,
  python: `# Write and run Python\nprint("Hello from Practice")\n`,
  html: `<!DOCTYPE html>\n<html>\n<head><title>Preview</title></head>\n<body>\n  <h1>Hello from Practice</h1>\n</body>\n</html>\n`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Practice");\n  }\n}\n`,
  cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello from Practice" << std::endl;\n  return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n  printf("Hello from Practice\\n");\n  return 0;\n}\n`,
};

interface PracticeCompilerProps {
  isZenMode?: boolean;
  initialCode?: string;
  initialLanguage?: string;
  moduleId?: string;
  pathId?: string;
  moduleTitle?: string;
  learningContext?: string;
}

const renderMarkdown = (md: string) => {
  return md.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      return <h4 key={idx} className="text-[12px] font-bold text-slate-200 mt-3 mb-1.5">{trimmed.substring(4)}</h4>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={idx} className="text-[13px] font-bold text-slate-50 mt-4 mb-2">{trimmed.substring(3)}</h3>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={idx} className="text-[15px] font-extrabold text-white mt-4 mb-2">{trimmed.substring(2)}</h2>;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return <li key={idx} className="text-[11.5px] ml-4 list-disc my-1 leading-relaxed text-slate-300">{trimmed.substring(2)}</li>;
    }
    if (trimmed.startsWith('> ')) {
      return <blockquote key={idx} className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-400 italic font-mono text-[11px]">{trimmed.substring(2)}</blockquote>;
    }
    if (trimmed === '') return <div key={idx} className="h-2" />;
    return <p key={idx} className="text-[11.5px] my-1 leading-relaxed text-slate-350">{trimmed}</p>;
  });
};

const PracticeCompiler: React.FC<PracticeCompilerProps> = ({
  isZenMode = false,
  initialCode,
  initialLanguage = 'javascript',
  moduleId,
  pathId,
  moduleTitle,
  learningContext,
}) => {
  let activeChapter = '';
  try {
    const playback = useClassroomPlayback();
    activeChapter = playback.activeChapter;
  } catch (err) {
    // Not wrapped in ClassroomPlaybackProvider
  }
  const langKey = LANGUAGES.some(l => l.id === initialLanguage) ? initialLanguage : 'javascript';
  const [language, setLanguage] = useState(langKey);
  const [code, setCode] = useState(initialCode || STARTERS[langKey] || STARTERS.javascript);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const handleSyncFromMoment = async () => {
    if (!pathId || !moduleId || !activeChapter) return;
    setIsLoadingExercise(true);
    setTaskPassed(false);
    try {
      const res = await api.getHydratedSandboxFromMoment(
        pathId,
        moduleId,
        activeChapter,
        learningContext || ''
      );
      if (res && res.hydrated) {
        setInstructions(res.instructionsMarkdown);
        setRegexPattern(res.solutionCheckRegex);
        setCode(res.initialCode);
        setLanguage('javascript'); // Dynamic recall exercises run Javascript
        toast.success(`Coding lab synced to video chapter: "${activeChapter}"!`);
      } else {
        toast.error("Failed to generate a custom exercise from this moment.");
      }
    } catch (err) {
      console.warn('[PracticeCompiler] Sync to moment failed:', err);
      toast.error("Could not coordinate coding sandbox with video moment.");
    } finally {
      setIsLoadingExercise(false);
    }
  };

  // Hydration state
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [regexPattern, setRegexPattern] = useState<string | null>(null);
  const [taskPassed, setTaskPassed] = useState(false);

  useEffect(() => {
    if (pathId && moduleId) {
      setIsLoadingExercise(true);
      setInstructions(null);
      setRegexPattern(null);
      setTaskPassed(false);
      api.getHydratedSandbox(pathId, moduleId)
        .then(res => {
          if (res && res.hydrated) {
            setInstructions(res.instructionsMarkdown);
            setRegexPattern(res.solutionCheckRegex);
            setCode(res.initialCode);
            setLanguage('javascript'); // Hydrated tasks run JavaScript currently
          }
        })
        .catch(err => {
          console.warn('[PracticeCompiler] Hydration failed:', err);
        })
        .finally(() => {
          setIsLoadingExercise(false);
        });
    }
  }, [pathId, moduleId]);

  const handleLanguageChange = (next: string) => {
    setLanguage(next);
    setCode(STARTERS[next] || '');
    setOutput('');
    setError(null);
    setHtmlPreview(null);
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);
    setHtmlPreview(null);

    try {
      if (language === 'html') {
        setHtmlPreview(code);
        setOutput('HTML preview rendered below.');
        return;
      }

      const runLang: FreeformLanguage =
        language === 'typescript' ? 'javascript' : (language as FreeformLanguage);

      const result = await runFreeformCode(runLang, code, (msg) => setOutput(msg));

      let finalStdout = result.stdout || '';
      let finalStderr = result.stderr || '';
      let finalError = result.errorMessage || null;

      // Check task solution
      if (regexPattern && result.success) {
        const testTarget = finalStdout || code;
        const matches = new RegExp(regexPattern, 'i').test(testTarget);
        if (matches) {
          setTaskPassed(true);
          finalStdout += '\n\n🎉 SUCCESS: Code validation check passed!';
          toast.success('Active recall checkpoint cleared successfully!');
        } else {
          setTaskPassed(false);
          finalStdout += '\n\n⚠️ CHECKPOINT FAILED: The output does not match the validation pattern. Please refactor and try again.';
        }
      }

      if (finalStdout) setOutput(finalStdout);
      if (finalStderr) setOutput(prev => (prev ? `${prev}\n` : '') + finalStderr);
      if (finalError) setError(finalError);
      if (result.success && !finalStdout && !finalError) {
        setOutput('Ran successfully (no output).');
      }

      if (finalError || finalStderr) {
        const errorMsg = finalError || finalStderr;
        const event = new CustomEvent('sara-compiler-error', {
          detail: {
            error: errorMsg,
            code,
            language
          }
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Run failed';
      setError(errorMsg);
      const event = new CustomEvent('sara-compiler-error', {
        detail: {
          error: errorMsg,
          code,
          language
        }
      });
      window.dispatchEvent(event);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, regexPattern]);

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-[#05070a] text-slate-200' : 'bg-slate-50'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200 bg-white'}`}>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={!!instructions}
            className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-[12px] font-semibold border outline-none cursor-pointer disabled:opacity-50 ${
              isZenMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`} />
        </div>
      <button
        type="button"
        onClick={handleRun}
        disabled={isRunning || isLoadingExercise}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4e5bff] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        Run
      </button>
      {pathId && moduleId && activeChapter && (
        <button
          type="button"
          onClick={handleSyncFromMoment}
          disabled={isRunning || isLoadingExercise}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm animate-in fade-in duration-300"
          title={`Sync coding lab to: "${activeChapter}"`}
        >
          <Sparkles size={13} className="animate-pulse" />
          <span>Sync to Video Moment</span>
        </button>
      )}
        {taskPassed && (
          <div className="flex items-center gap-1.5 text-emerald-450 text-[11px] font-black uppercase tracking-wider animate-pulse ml-2">
            <CheckCircle2 size={14} /> Completed
          </div>
        )}
        <span className={`text-[11px] ml-auto ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {instructions ? 'Target recall lab' : 'Multi-language compiler'}
        </span>
      </div>

      <div className="flex-1 flex min-h-0">
        {isLoadingExercise ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-black/15">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hydrating code exercise...</span>
          </div>
        ) : (
          <>
            {instructions && (
              <div className={`w-[35%] min-w-[260px] flex flex-col border-r overflow-y-auto p-5 custom-scrollbar ${
                isZenMode ? 'border-white/10 bg-[#080a0f] text-slate-350' : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-indigo-400 animate-pulse animate-duration-1000" />
                  <div className={`text-[10px] font-black uppercase tracking-wider ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    Active Recall Challenge
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-slate-300">
                  {renderMarkdown(instructions)}
                </div>
              </div>
            )}
            <textarea
              value={code}
              onChange={(e) => !taskPassed && setCode(e.target.value)}
              spellCheck={false}
              readOnly={taskPassed}
              className={`flex-1 resize-none p-4 font-mono text-[13px] leading-relaxed outline-none ${
                isZenMode ? 'bg-[#0a0c12] text-emerald-300/90' : 'bg-white text-slate-800'
              }`}
            />
            <div className={`w-[42%] min-w-[200px] flex flex-col border-l ${isZenMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-900'}`}>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                Output
              </div>
              <div className="flex-1 overflow-auto p-3 font-mono text-[12px] text-emerald-450/90 whitespace-pre-wrap">
                {error && <span className="text-rose-455 block mb-2">{error}</span>}
                {output || (isRunning ? 'Running…' : '—')}
              </div>
              {htmlPreview && (
                <iframe
                  title="HTML preview"
                  srcDoc={htmlPreview}
                  className="h-48 border-t border-white/10 bg-white"
                  sandbox="allow-scripts"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PracticeCompiler;
