import React, { useState, useCallback } from 'react';
import { Play, Loader2, ChevronDown } from 'lucide-react';
import { runFreeformCode, FreeformLanguage } from '../../services/sandboxRunner';

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
}

const PracticeCompiler: React.FC<PracticeCompilerProps> = ({
  isZenMode = false,
  initialCode,
  initialLanguage = 'javascript',
}) => {
  const langKey = LANGUAGES.some(l => l.id === initialLanguage) ? initialLanguage : 'javascript';
  const [language, setLanguage] = useState(langKey);
  const [code, setCode] = useState(initialCode || STARTERS[langKey] || STARTERS.javascript);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

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

      if (result.stdout) setOutput(result.stdout);
      if (result.stderr) setOutput(prev => (prev ? `${prev}\n` : '') + result.stderr);
      if (result.errorMessage) setError(result.errorMessage);
      if (result.success && !result.stdout && !result.errorMessage) {
        setOutput('Ran successfully (no output).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  }, [code, language]);

  return (
    <div className={`flex h-full flex-col ${isZenMode ? 'bg-[#05070a] text-slate-200' : 'bg-slate-50'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${isZenMode ? 'border-white/10' : 'border-slate-200 bg-white'}`}>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-[12px] font-semibold border outline-none cursor-pointer ${
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
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4e5bff] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run
        </button>
        <span className={`text-[11px] ml-auto ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Multi-language compiler
        </span>
      </div>

      <div className="flex-1 flex min-h-0">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className={`flex-1 resize-none p-4 font-mono text-[13px] leading-relaxed outline-none ${
            isZenMode ? 'bg-[#0a0c12] text-emerald-300/90' : 'bg-white text-slate-800'
          }`}
        />
        <div className={`w-[42%] min-w-[200px] flex flex-col border-l ${isZenMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-900'}`}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
            Output
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-[12px] text-emerald-400/90 whitespace-pre-wrap">
            {error && <span className="text-rose-400 block mb-2">{error}</span>}
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
      </div>
    </div>
  );
};

export default PracticeCompiler;
