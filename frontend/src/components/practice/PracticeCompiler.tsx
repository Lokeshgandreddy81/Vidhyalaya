import React, { useState, useCallback } from 'react';
import { Play, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { runFreeformCode, FreeformLanguage } from '../../services/sandboxRunner';

const LANGUAGES: { id: FreeformLanguage; label: string; serverRuntime?: boolean }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python',     serverRuntime: true },
  { id: 'html',       label: 'HTML' },
  { id: 'java',       label: 'Java',       serverRuntime: true },
  { id: 'cpp',        label: 'C++',        serverRuntime: true },
  { id: 'c',          label: 'C',          serverRuntime: true },
];

// Languages where execution depends on a native runtime installed on the backend server.
// If the backend returns a "not installed" error, we surface a clean notice rather than
// a raw stderr dump.
const SERVER_RUNTIME_LANGS = new Set<FreeformLanguage>(['java', 'c', 'cpp', 'python']);

const RUNTIME_FRIENDLY_NAMES: Partial<Record<FreeformLanguage, string>> = {
  java:   'Java Development Kit (JDK)',
  c:      'GCC C Compiler',
  cpp:    'G++ C++ Compiler',
  python: 'Python 3',
};

/** Returns true when a backend error message signals a missing runtime (not a user code error). */
function isRuntimeMissingError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('not installed') ||
    lower.includes('unable to locate') ||
    lower.includes('no java runtime') ||
    lower.includes('command not found') ||
    lower.includes('cannot find') ||
    lower.includes('visit http') ||
    lower.includes('ensure it is in the system path')
  );
}

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

const PracticeCompiler: React.FC<PracticeCompilerProps> = ({
  isZenMode = false,
  initialCode,
  initialLanguage = 'javascript',
  moduleId,
  pathId,
  moduleTitle,
  learningContext,
}) => {
  const langKey = LANGUAGES.some(l => l.id === initialLanguage)
    ? (initialLanguage as FreeformLanguage)
    : 'javascript';

  const [language, setLanguage] = useState<FreeformLanguage>(langKey);
  const [code, setCode]         = useState(initialCode || STARTERS[langKey] || STARTERS.javascript);
  const [output, setOutput]     = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [runtimeMissing, setRuntimeMissing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const handleLanguageChange = (next: string) => {
    const nextLang = next as FreeformLanguage;
    setLanguage(nextLang);
    setCode(STARTERS[nextLang] || '');
    setOutput('');
    setError(null);
    setRuntimeMissing(false);
    setHtmlPreview(null);
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);
    setRuntimeMissing(false);
    setHtmlPreview(null);

    try {
      if (language === 'html') {
        setHtmlPreview(code);
        setOutput('HTML preview rendered below.');
        return;
      }

      const runLang: FreeformLanguage = language;
      const result = await runFreeformCode(runLang, code, (msg) => setOutput(msg));

      const finalStdout = result.stdout || '';
      const finalStderr = result.stderr || '';
      const finalError  = result.errorMessage || null;

      // Detect a missing-runtime error from the backend.
      // Prefer the structured flag; fall back to heuristic string matching for legacy responses.
      if (SERVER_RUNTIME_LANGS.has(language) && (result.runtimeMissing || (!result.success && isRuntimeMissingError(finalError || finalStderr || '')))) {
        setRuntimeMissing(true);
        return;
      }

      if (finalStdout) setOutput(finalStdout);
      if (finalStderr) setOutput(prev => (prev ? `${prev}\n` : '') + finalStderr);
      if (finalError)  setError(finalError);
      if (result.success && !finalStdout && !finalError) {
        setOutput('Ran successfully (no output).');
      }

      if (finalError || finalStderr) {
        const errorMsg = finalError || finalStderr;
        window.dispatchEvent(new CustomEvent('sara-compiler-error', {
          detail: { error: errorMsg, code, language }
        }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Run failed';
      setError(errorMsg);
      window.dispatchEvent(new CustomEvent('sara-compiler-error', {
        detail: { error: errorMsg, code, language }
      }));
    } finally {
      setIsRunning(false);
    }
  }, [code, language]);

  const friendlyName = RUNTIME_FRIENDLY_NAMES[language] ?? language.toUpperCase();

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-[#05070a] text-slate-200' : 'bg-slate-50'}`}>
      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative flex">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className={`flex-1 resize-none p-4 pr-44 font-mono text-[13px] leading-relaxed outline-none ${
              isZenMode ? 'bg-[#0a0c12] text-white' : 'bg-white text-slate-800'
            }`}
          />
          {/* Floating Compiler Controls */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <div className="relative">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isRunning}
                className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer disabled:opacity-50 transition-all ${
                  isZenMode 
                    ? 'bg-[#1e293b]/90 hover:bg-[#334155]/90 border-white/10 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                }`}
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id} className={isZenMode ? 'bg-[#0a0c12] text-white' : 'bg-white text-slate-800'}>
                    {l.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`} />
            </div>
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4e5bff] text-white text-[11px] font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Run
            </button>
          </div>
        </div>

        {/* ── Output panel ── */}
        <div className={`w-[42%] min-w-[200px] flex flex-col border-l ${isZenMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-900'}`}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
            Output
          </div>

          {runtimeMissing ? (
            /* Clean "runtime not installed" notice — never dump raw shell errors to users */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <p className="text-[12px] font-bold text-slate-300">
                {friendlyName} not available
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                This language requires a native runtime installed on the server.
                Try <strong className="text-slate-400">JavaScript</strong>, <strong className="text-slate-400">TypeScript</strong>, or <strong className="text-slate-400">HTML</strong> — they run instantly in-browser.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3 font-mono text-[12px] text-white whitespace-pre-wrap">
              {error && <span className="text-rose-500 block mb-2">{error}</span>}
              {output || (isRunning ? 'Running…' : '—')}
            </div>
          )}

          {htmlPreview && (
            <iframe
              title="HTML preview"
              srcDoc={htmlPreview}
              className="h-48 border-t border-white/10 bg-white"
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeCompiler;
