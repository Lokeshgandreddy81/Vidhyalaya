import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Editor, { Monaco } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Code, Terminal, Copy, CheckCircle2,
  ChevronRight, ChevronDown, AlertTriangle, Info,
  ArrowDown, Trash2, Zap, FileCode2, Globe, Sparkles, Plus, Library, Columns,
  Maximize2, Minimize2, ChevronLeft, RotateCw, SquareTerminal
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { SandboxState } from '../../types';
import { transpileTypeScriptToJs } from '../../utils/typescriptTranspiler';
import '../../styles/CodeSandbox.css';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface ConsoleEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'return' | 'system' | 'separator';
  args: unknown[];
  timestamp: number; // relative ms from execution start
  runIndex: number;
}

type ExecutionState = 'idle' | 'executing' | 'success' | 'error';

interface CodeSandboxProps {
  initialCode: string;
  initialLanguage?: string;
  forceInitialCode?: boolean;
  runTrigger?: number;
  onClose: () => void;
  isZenMode?: boolean;
  onAskSara?: (prompt: string) => void;
  onOpenWorkbench?: (code: string, language: string, title?: string) => void;
  initialSandboxState?: SandboxState;
  onStateChange?: (state: SandboxState) => void;
  hideCloseButton?: boolean;
  saraOpen?: boolean;
  onToggleSara?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  sourceMsgId?: string;
  onExecutionOutput?: (output: { stdout: string; stderr: string; success: boolean; sourceMsgId?: string }) => void;
}

// ══════════════════════════════════════════════════════════════
// OBJECT INSPECTOR — Recursive collapsible tree (like DevTools)
// ══════════════════════════════════════════════════════════════

const ObjectInspector: React.FC<{ data: unknown; depth?: number; maxDepth?: number; label?: string }> = ({
  data,
  depth = 0,
  maxDepth = 4,
  label,
}) => {
  const [expanded, setExpanded] = useState(depth < 1);

  // Primitives
  if (data === null) return <span className="cortex-obj-null">{label ? <><span className="cortex-obj-key">{label}: </span></> : null}null</span>;
  if (data === undefined) return <span className="cortex-obj-undefined">{label ? <><span className="cortex-obj-key">{label}: </span></> : null}undefined</span>;
  if (typeof data === 'string') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-string">"{data}"</span></span>;
  if (typeof data === 'number') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-number">{String(data)}</span></span>;
  if (typeof data === 'boolean') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-boolean">{String(data)}</span></span>;
  if (typeof data === 'function') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-function">ƒ {(data as Function).name || 'anonymous'}()</span></span>;
  if (typeof data === 'symbol') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-null">{String(data)}</span></span>;
  if (typeof data === 'bigint') return <span>{label ? <><span className="cortex-obj-key">{label}: </span></> : null}<span className="cortex-obj-number">{String(data)}n</span></span>;

  // Objects & Arrays
  if (typeof data === 'object') {
    const isArray = Array.isArray(data);
    const entries = Object.entries(data as Record<string, unknown>);
    const preview = isArray
      ? `Array(${(data as unknown[]).length})`
      : `{${entries.slice(0, 3).map(([k]) => k).join(', ')}${entries.length > 3 ? ', …' : ''}}`;

    if (depth >= maxDepth) {
      return (
        <span>
          {label ? <><span className="cortex-obj-key">{label}: </span></> : null}
          <span className="text-slate-500 italic">{preview}</span>
        </span>
      );
    }

    return (
      <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
        <span
          className="cortex-obj-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={expanded ? 'cortex-obj-toggle-open inline-block' : 'inline-block'}>▶</span>
        </span>
        {' '}
        {label ? <><span className="cortex-obj-key">{label}: </span></> : null}
        {!expanded && <span className="text-slate-500">{preview}</span>}
        {expanded && (
          <div className="ml-1 border-l border-white/5 pl-2 mt-0.5">
            {entries.map(([key, val]) => (
              <div key={key} className="py-[1px]">
                <ObjectInspector data={val} depth={depth + 1} maxDepth={maxDepth} label={key} />
              </div>
            ))}
            {entries.length === 0 && <span className="text-slate-600 italic text-[10px]">empty</span>}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-slate-400">{String(data)}</span>;
};

const parseStyledLog = (text: string, styles: unknown[]): React.ReactNode => {
  const parts = text.split('%c');
  const elements: React.ReactNode[] = [];

  if (parts[0]) {
    elements.push(<span key="part-0">{parts[0]}</span>);
  }

  let styleIndex = 0;
  for (let i = 1; i < parts.length; i++) {
    const partText = parts[i];
    const styleStr = typeof styles[styleIndex] === 'string' ? (styles[styleIndex] as string) : '';
    styleIndex++;

    const styleObj: React.CSSProperties = {};
    if (styleStr) {
      const rules = styleStr.split(';');
      for (const rule of rules) {
        const colonIdx = rule.indexOf(':');
        if (colonIdx !== -1) {
          const key = rule.substring(0, colonIdx).trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          const val = rule.substring(colonIdx + 1).trim();
          if (key && val) {
            (styleObj as any)[key] = val;
          }
        }
      }
    }

    elements.push(
      <span key={`part-${i}`} style={styleObj}>
        {partText}
      </span>
    );
  }

  return <>{elements}</>;
};

interface CompilerDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

function parseCompilerErrors(errorText: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = errorText.split('\n');

  // Regex patterns:
  // 1. GCC / G++ / Go / Java: main.c:12:5: error: ...
  const stdPattern = /^([\w-]+\.(?:c|cpp|go|java|py|rs)):(\d+):(?:(\d+):)?\s*(error|warning|info)?\s*:\s*(.*)/i;
  
  // 2. Rust: --> main.rs:12:15
  const rustPattern = /-->\s*([\w-]+\.rs):(\d+):(\d+)/i;

  // 3. Python: File "main.py", line 12
  const pythonPattern = /File\s+"([\w-]+\.py)",\s+line\s+(\d+)/i;

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].trim();

    // Check standard GCC/Go/Java pattern
    const stdMatch = stdPattern.exec(lineText);
    if (stdMatch) {
      const lineNum = parseInt(stdMatch[2], 10);
      const colNum = stdMatch[3] ? parseInt(stdMatch[3], 10) : 1;
      const severityStr = stdMatch[4]?.toLowerCase() || 'error';
      const severity = severityStr.includes('warning') ? 'warning' : 'error';
      const message = stdMatch[5] || lineText;

      diagnostics.push({
        line: lineNum,
        column: colNum,
        message,
        severity
      });
      continue;
    }

    // Check Rust pattern
    const rustMatch = rustPattern.exec(lineText);
    if (rustMatch) {
      const lineNum = parseInt(rustMatch[2], 10);
      const colNum = parseInt(rustMatch[3], 10);
      let message = 'Rust compilation error';
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (lines[j].startsWith('error') || lines[j].startsWith('warning')) {
          message = lines[j];
          break;
        }
      }
      const severity = message.startsWith('warning') ? 'warning' : 'error';

      diagnostics.push({
        line: lineNum,
        column: colNum,
        message,
        severity
      });
      continue;
    }

    // Check Python pattern
    const pyMatch = pythonPattern.exec(lineText);
    if (pyMatch) {
      const lineNum = parseInt(pyMatch[2], 10);
      let message = 'Python execution error';
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        if (lines[j] && !lines[j].startsWith(' ') && lines[j].includes('Error:')) {
          message = lines[j];
          break;
        }
        if (lines[j] && !lines[j].startsWith(' ') && (lines[j].endsWith('Error') || lines[j].includes('Error'))) {
          message = lines[j];
        }
      }
      diagnostics.push({
        line: lineNum,
        column: 1,
        message,
        severity: 'error'
      });
      continue;
    }
  }

  return diagnostics;
}

// ══════════════════════════════════════════════════════════════
// CONSOLE LOG ITEM — Single rendered console entry
// ══════════════════════════════════════════════════════════════

const renderStringWithJumpBadges = (
  text: string,
  onJumpToLine?: (fileName: string, line: number, column?: number) => void
) => {
  let textClass = '';
  const textLower = text.toLowerCase();
  if (textLower.includes('error:')) {
    textClass = 'text-red-400 font-semibold';
  } else if (textLower.includes('warning:')) {
    textClass = 'text-amber-400 font-semibold';
  } else if (textLower.includes('note:')) {
    textClass = 'text-blue-400';
  }

  if (!onJumpToLine) return <span className={textClass}>{text}</span>;

  // Matches file names with line and optional column offsets, e.g., index.js:14:5 or index.js:14
  const regex = /\b([\w-]+\.(?:js|ts|py|go|rs|c|cpp|java|html|css)):(\d+)(?::(\d+))?\b/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0];
    const fileName = match[1];
    const lineNumber = parseInt(match[2], 10);
    const colNumber = match[3] ? parseInt(match[3], 10) : undefined;

    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`text-${matchIndex}`} className={textClass}>
          {text.slice(lastIndex, matchIndex)}
        </span>
      );
    }

    parts.push(
      <button
        key={matchIndex}
        onClick={(e) => {
          e.preventDefault();
          onJumpToLine(fileName, lineNumber, colNumber);
        }}
        className="px-1 py-0.5 mx-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] hover:bg-red-500/25 active:scale-95 transition-all inline-flex items-center gap-0.5 cursor-pointer font-bold select-text"
        title={`Jump to ${fileName} line ${lineNumber}`}
      >
        {fullMatch}
      </button>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end" className={textClass}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <span className={textClass}>{parts.length > 0 ? parts : text}</span>;
};

const ConsoleLogItem: React.FC<{
  entry: ConsoleEntry;
  onAskSara?: (prompt: string) => void;
  onJumpToLine?: (fileName: string, line: number, column?: number) => void;
  codeContext?: string;
  language?: string;
  isZenMode?: boolean;
}> = ({ entry, onAskSara, onJumpToLine, codeContext, language, isZenMode }) => {
  const [copiedObj, setCopiedObj] = useState(false);

  if (entry.type === 'separator') {
    return (
      <div className="cortex-run-separator">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400/60 font-mono whitespace-nowrap">
          Run #{entry.runIndex}
        </span>
      </div>
    );
  }

  if (entry.type === 'system') {
    return (
      <div className="cortex-log-entry py-1.5 px-3">
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-slate-600">
          {entry.args.map(a => String(a)).join(' ')}
        </span>
      </div>
    );
  }

  const accentColorMap: Record<string, string> = {
    log: 'border-l-indigo-500/40',
    info: 'border-l-blue-400/40',
    warn: 'border-l-amber-400/40',
    error: 'border-l-red-500/40',
    return: 'border-l-emerald-400/40',
  };

  const badgeMap: Record<string, React.ReactNode> = {
    log: <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono select-none">LOG</span>,
    info: <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono select-none">INFO</span>,
    warn: <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono select-none">WARN</span>,
    error: <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 font-mono select-none">ERROR</span>,
    return: <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono select-none">RETURN</span>,
  };

  const animClass = entry.type === 'error' ? 'cortex-log-error' : entry.type === 'warn' ? 'cortex-log-warn' : 'cortex-log-entry';

  const bgMap: Record<string, string> = {
    log: 'bg-transparent',
    info: 'bg-blue-500/[0.02]',
    warn: 'bg-amber-500/[0.02]',
    error: 'bg-red-500/[0.03]',
    return: 'bg-emerald-500/[0.02]',
  };

  const handleAutofix = () => {
    if (!onAskSara) return;
    const errorMsg = entry.args.map(a => String(a)).join(' ');
    const prompt = `I ran my ${language || 'code'} in the Cortex Sandbox and got this error:
\`\`\`
${errorMsg}
\`\`\`

Here is my code:
\`\`\`${language || ''}
${codeContext || ''}
\`\`\`

Provide your response in this exact strict format (no preface, introductions, or greetings):
First, output the corrected code block.
Immediately under it, provide exactly 2 concise bullet points explaining what went wrong and how it was fixed.
Do not write any other conversational text.`;
    onAskSara(prompt);
  };

  const copyObjectData = (obj: unknown) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      setCopiedObj(true);
      setTimeout(() => setCopiedObj(false), 1200);
    } catch (_) {}
  };

  const textStyle = isZenMode ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className={`${animClass} flex items-start gap-3 py-2 px-3 border-l-2 ${accentColorMap[entry.type] || 'border-l-indigo-500/40'} ${bgMap[entry.type] || ''} rounded-r-lg group transition-all duration-200 ${isZenMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50/80'}`}>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {badgeMap[entry.type]}
      </div>
      <div className={`flex-1 min-w-0 font-mono text-[11.5px] leading-relaxed ${textStyle}`}>
        {(() => {
          const firstArg = entry.args[0];
          if (typeof firstArg === 'string' && firstArg.includes('%c')) {
            const styleCount = (firstArg.match(/%c/g) || []).length;
            const styleArgs = entry.args.slice(1, 1 + styleCount);
            const remainingArgs = entry.args.slice(1 + styleCount);
            const styledNode = parseStyledLog(firstArg, styleArgs);
            return (
              <>
                <span className={textStyle}>{styledNode}</span>
                {remainingArgs.map((arg, idx) => {
                  if (typeof arg === 'object' && arg !== null) {
                    return (
                      <React.Fragment key={idx}>
                        <div className="inline-flex items-center gap-1.5 group/obj">
                          <ObjectInspector data={arg} />
                          <button
                            onClick={() => copyObjectData(arg)}
                            className="opacity-0 group-hover/obj:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer border-none bg-transparent"
                            title="Copy JSON"
                          >
                            {copiedObj ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={9} />}
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  }
                  const colorClass =
                    typeof arg === 'string' ? textStyle :
                    typeof arg === 'number' ? 'cortex-obj-number' :
                    typeof arg === 'boolean' ? 'cortex-obj-boolean' :
                    arg === null ? 'cortex-obj-null' :
                    arg === undefined ? 'cortex-obj-undefined' :
                    (isZenMode ? 'text-slate-300' : 'text-slate-600');
                  return (
                    <span key={idx} className={colorClass}>
                      {" "}
                      {typeof arg === 'string' ? renderStringWithJumpBadges(arg, onJumpToLine) : String(arg)}
                    </span>
                  );
                })}
              </>
            );
          }
          return entry.args.map((arg, i) => {
            if (typeof arg === 'object' && arg !== null) {
              return (
                <div key={i} className="inline-flex items-center gap-1.5 group/obj">
                  <ObjectInspector data={arg} />
                  <button
                    onClick={() => copyObjectData(arg)}
                    className="opacity-0 group-hover/obj:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer border-none bg-transparent"
                    title="Copy JSON"
                  >
                    {copiedObj ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={9} />}
                  </button>
                </div>
              );
            }
            const colorClass =
              typeof arg === 'string' ? textStyle :
              typeof arg === 'number' ? 'cortex-obj-number' :
              typeof arg === 'boolean' ? 'cortex-obj-boolean' :
              arg === null ? 'cortex-obj-null' :
              arg === undefined ? 'cortex-obj-undefined' :
              (isZenMode ? 'text-slate-350' : 'text-slate-550');
            return (
              <span key={i} className={colorClass}>
                {i > 0 ? ' ' : ''}
                {typeof arg === 'string' ? renderStringWithJumpBadges(arg, onJumpToLine) : String(arg)}
              </span>
            );
          });
        })()}
      </div>
      {entry.type === 'error' && onAskSara && (
        <button
          onClick={handleAutofix}
          className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-mono text-[9px] font-semibold tracking-wide transition-all flex items-center gap-1.5 shrink-0 border border-red-500/20 shadow-xs cursor-pointer z-10 opacity-80 hover:opacity-100"
          title="Ask SARA to suggest a fix for this line"
        >
          <Sparkles size={9} className="text-red-400" /> SARA Fix
        </button>
      )}
      <span className={`text-[8px] font-mono font-medium tabular-nums shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isZenMode ? 'text-slate-650' : 'text-slate-450'}`}>
        +{entry.timestamp}ms
      </span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// BOOT TEXT — Matrix-style cascade animation
// ══════════════════════════════════════════════════════════════

const BootText: React.FC<{ text: string }> = ({ text }) => (
  <div
    role="img"
    aria-label={text}
    className="cortex-boot-text text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-slate-600 py-2 px-3"
  >
    {text.split('').map((char, i) => (
      <span key={i} aria-hidden="true" style={{ animationDelay: `${i * 0.025}s` }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))}
  </div>
);


// ══════════════════════════════════════════════════════════════
// LOOP GUARD WATCHDOG INJECTOR
// ══════════════════════════════════════════════════════════════

const injectLoopGuards = (jsCode: string): string => {
  let output = '';
  let i = 0;
  const len = jsCode.length;
  let guardCounter = 0;

  while (i < len) {
    // Single line comment
    if (jsCode.startsWith('//', i)) {
      const nextNewline = jsCode.indexOf('\n', i);
      const end = nextNewline === -1 ? len : nextNewline;
      output += jsCode.slice(i, end);
      i = end;
      continue;
    }
    // Multi-line comment
    if (jsCode.startsWith('/*', i)) {
      const endComment = jsCode.indexOf('*/', i);
      const end = endComment === -1 ? len : endComment + 2;
      output += jsCode.slice(i, end);
      i = end;
      continue;
    }
    // String double quote
    if (jsCode[i] === '"') {
      output += '"';
      i++;
      while (i < len && jsCode[i] !== '"') {
        if (jsCode[i] === '\\') {
          output += '\\' + (jsCode[i + 1] || '');
          i += 2;
        } else {
          output += jsCode[i];
          i++;
        }
      }
      if (i < len) {
        output += '"';
        i++;
      }
      continue;
    }
    // String single quote
    if (jsCode[i] === "'") {
      output += "'";
      i++;
      while (i < len && jsCode[i] !== "'") {
        if (jsCode[i] === '\\') {
          output += '\\' + (jsCode[i + 1] || '');
          i += 2;
        } else {
          output += jsCode[i];
          i++;
        }
      }
      if (i < len) {
        output += "'";
        i++;
      }
      continue;
    }
    // Template literal — must handle ${...} interpolation blocks
    if (jsCode[i] === '`') {
      output += '`';
      i++;
      while (i < len && jsCode[i] !== '`') {
        if (jsCode[i] === '\\') {
          output += '\\' + (jsCode[i + 1] || '');
          i += 2;
        } else if (jsCode[i] === '$' && i + 1 < len && jsCode[i + 1] === '{') {
          // Skip ${...} expression block — track brace depth
          output += '${';
          i += 2;
          let braceDepth = 1;
          while (i < len && braceDepth > 0) {
            if (jsCode[i] === '{') {
              braceDepth++;
            } else if (jsCode[i] === '}') {
              braceDepth--;
              if (braceDepth === 0) break;
            } else if (jsCode[i] === '`') {
              // Nested template literal inside expression — skip recursively
              output += '`';
              i++;
              while (i < len && jsCode[i] !== '`') {
                if (jsCode[i] === '\\') {
                  output += '\\' + (jsCode[i + 1] || '');
                  i += 2;
                } else {
                  output += jsCode[i];
                  i++;
                }
              }
              if (i < len) { output += '`'; i++; }
              continue;
            } else if (jsCode[i] === '\'' || jsCode[i] === '"') {
              // String inside expression — skip
              const q = jsCode[i];
              output += q;
              i++;
              while (i < len && jsCode[i] !== q) {
                if (jsCode[i] === '\\') { output += '\\' + (jsCode[i + 1] || ''); i += 2; }
                else { output += jsCode[i]; i++; }
              }
              if (i < len) { output += q; i++; }
              continue;
            }
            output += jsCode[i];
            i++;
          }
          if (i < len) { output += '}'; i++; }
        } else {
          output += jsCode[i];
          i++;
        }
      }
      if (i < len) {
        output += '`';
        i++;
      }
      continue;
    }

    // Regex literal — skip /pattern/flags to prevent false loop keyword matches
    if (jsCode[i] === '/' && i + 1 < len && jsCode[i + 1] !== '/' && jsCode[i + 1] !== '*') {
      const prevChar = i > 0 ? jsCode[i - 1] : '\n';
      const isRegexContext = /[=(!:,;{&|?+\-~^%\n]/.test(prevChar);
      if (isRegexContext) {
        output += '/';
        i++;
        while (i < len && jsCode[i] !== '/' && jsCode[i] !== '\n') {
          if (jsCode[i] === '\\') { output += '\\' + (jsCode[i + 1] || ''); i += 2; }
          else { output += jsCode[i]; i++; }
        }
        if (i < len && jsCode[i] === '/') {
          output += '/';
          i++;
          while (i < len && /[gimsuvy]/.test(jsCode[i])) { output += jsCode[i]; i++; }
        }
        continue;
      }
    }

    const isWordAt = (word: string, index: number) => {
      if (!jsCode.startsWith(word, index)) return false;
      if (index > 0 && /[a-zA-Z0-9_$]/.test(jsCode[index - 1])) return false;
      const afterIndex = index + word.length;
      if (afterIndex < len && /[a-zA-Z0-9_$]/.test(jsCode[afterIndex])) return false;
      return true;
    };

    if (isWordAt('while', i)) {
      let scan = i + 5;
      while (scan < len && /\s/.test(jsCode[scan])) scan++;
      if (scan < len && jsCode[scan] === '(') {
        let parenDepth = 1;
        scan++;
        while (scan < len && parenDepth > 0) {
          if (jsCode[scan] === '(') parenDepth++;
          else if (jsCode[scan] === ')') parenDepth--;
          scan++;
        }
        const condEnd = scan;
        let bodyScan = condEnd;
        while (bodyScan < len && /\s/.test(jsCode[bodyScan])) bodyScan++;

        const guardVar = `__loop_guard_${++guardCounter}`;
        output += `let ${guardVar} = 0; `;
        output += jsCode.slice(i, condEnd);

        if (bodyScan < len && jsCode[bodyScan] === '{') {
          output += ' {';
          output += ` if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!");`;
          i = bodyScan + 1;
        } else {
          output += ` { if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!"); `;
          let stmtScan = bodyScan;
          while (stmtScan < len && jsCode[stmtScan] !== ';' && jsCode[stmtScan] !== '\n') {
            stmtScan++;
          }
          if (stmtScan < len && jsCode[stmtScan] === ';') stmtScan++;
          output += jsCode.slice(bodyScan, stmtScan) + ' }';
          i = stmtScan;
        }
        continue;
      }
    }

    if (isWordAt('for', i)) {
      let scan = i + 3;
      while (scan < len && /\s/.test(jsCode[scan])) scan++;
      if (scan < len && jsCode[scan] === '(') {
        let parenDepth = 1;
        scan++;
        while (scan < len && parenDepth > 0) {
          if (jsCode[scan] === '(') parenDepth++;
          else if (jsCode[scan] === ')') parenDepth--;
          scan++;
        }
        const condEnd = scan;
        let bodyScan = condEnd;
        while (bodyScan < len && /\s/.test(jsCode[bodyScan])) bodyScan++;

        const guardVar = `__loop_guard_${++guardCounter}`;
        output += `let ${guardVar} = 0; `;
        output += jsCode.slice(i, condEnd);

        if (bodyScan < len && jsCode[bodyScan] === '{') {
          output += ' {';
          output += ` if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!");`;
          i = bodyScan + 1;
        } else {
          output += ` { if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!"); `;
          let stmtScan = bodyScan;
          while (stmtScan < len && jsCode[stmtScan] !== ';' && jsCode[stmtScan] !== '\n') {
            stmtScan++;
          }
          if (stmtScan < len && jsCode[stmtScan] === ';') stmtScan++;
          output += jsCode.slice(bodyScan, stmtScan) + ' }';
          i = stmtScan;
        }
        continue;
      }
    }

    if (isWordAt('do', i)) {
      let scan = i + 2;
      while (scan < len && /\s/.test(jsCode[scan])) scan++;

      const guardVar = `__loop_guard_${++guardCounter}`;
      output += `let ${guardVar} = 0; `;
      output += 'do';

      if (scan < len && jsCode[scan] === '{') {
        output += ' {';
        output += ` if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!");`;
        i = scan + 1;
      } else {
        output += ` { if (++${guardVar} > 250000) throw new Error("Potential infinite loop detected!"); `;
        let stmtScan = scan;
        while (stmtScan < len && jsCode[stmtScan] !== ';' && jsCode[stmtScan] !== '\n') {
          stmtScan++;
        }
        if (stmtScan < len && jsCode[stmtScan] === ';') stmtScan++;
        output += jsCode.slice(scan, stmtScan) + ' }';
        i = stmtScan;
      }
      continue;
    }

    output += jsCode[i];
    i++;
  }

  return output;
};

const getPythonPolyfills = (): string => `
  if (!window.createUniversalProxy) {
    window.createUniversalProxy = function(name) {
      const handler = {
        get: function(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
            return () => "[Proxy " + name + "]";
          }
          const dummyFunc = function(...args) {
            console.warn("[Cortex Sandbox] Called placeholder method " + name + "." + String(prop) + "()");
            return window.createUniversalProxy(name + "." + String(prop) + "()");
          };
          return new Proxy(dummyFunc, handler);
        }
      };
      const targetObj = function() {};
      return new Proxy(targetObj, handler);
    };
  }

  if (!window.createModuleMock) {
    window.createModuleMock = function(name, spec) {
      const handler = {
        get: function(target, prop) {
          if (prop in target) {
            return target[prop];
          }
          if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
            return () => "[Module " + name + "]";
          }
          const dummyFunc = function(...args) {
            console.warn("[Cortex Sandbox] Called placeholder method " + name + "." + String(prop) + "()");
            return window.createUniversalProxy(name + "." + String(prop) + "()");
          };
          return new Proxy(dummyFunc, this);
        }
      };
      return new Proxy(spec, handler);
    };
  }

  window.getPythonModuleOrProxy = function(name) {
    const lowercaseName = name.toLowerCase();

    if (!window.sysMock) {
      window.sysMock = window.createModuleMock('sys', {
        argv: ['main.py'],
        version: '3.10.0 (Cortex Sandbox)',
        path: ['.'],
        getrefcount: function(x) { return 2; },
        exit: function(code) { throw new Error("SystemExit: " + (code !== undefined ? code : "")); },
        stdout: {
          write: function(text) { console.log(text); },
          flush: function() {}
        },
        stderr: {
          write: function(text) { console.error(text); },
          flush: function() {}
        }
      });
    }

    if (!window.osMock) {
      window.osMock = window.createModuleMock('os', {
        name: 'posix',
        environ: { PATH: '/usr/bin', HOME: '/user' },
        getcwd: function() { return '/'; },
        listdir: function() { return []; },
        path: window.createModuleMock('os.path', {
          join: function(...parts) { return parts.join('/'); },
          exists: function(path) { return true; },
          basename: function(path) { return path.split('/').pop() || ''; },
          dirname: function(path) { return path.split('/').slice(0, -1).join('/') || '.'; }
        })
      });
    }

    if (!window.collectionsMock) {
      window.collectionsMock = window.createModuleMock('collections', {
        defaultdict: function(defaultFactory) {
          return new Proxy({}, {
            get: function(target, prop) {
              if (prop in target) return target[prop];
              if (prop === 'toString' || prop === 'valueOf') return () => '[object defaultdict]';
              const val = defaultFactory();
              target[prop] = val;
              return val;
            }
          });
        },
        Counter: function(iterable) {
          const counts = {};
          if (iterable) {
            for (const item of iterable) {
              counts[item] = (counts[item] || 0) + 1;
            }
          }
          return new Proxy(counts, {
            get: function(target, prop) {
              if (prop in target) return target[prop];
              if (prop === 'most_common') {
                return function(n) {
                  const sorted = Object.entries(target).sort((a,b) => b[1] - a[1]);
                  return n === undefined ? sorted : sorted.slice(0, n);
                };
              }
              return 0;
            }
          });
        }
      });
    }

    if (lowercaseName === 'sys') return window.sysMock;
    if (lowercaseName === 'os') return window.osMock;
    if (lowercaseName === 'collections') return window.collectionsMock;
    if (lowercaseName === 'defaultdict') return window.collectionsMock.defaultdict;
    if (lowercaseName === 'counter') return window.collectionsMock.Counter;
    if (lowercaseName === 'math') return math;
    if (lowercaseName === 'random') return random;
    if (lowercaseName === 'time') return time;
    if (lowercaseName === 'json') return json;
    return window.createUniversalProxy(name);
  };

  // Python Polyfills & Prototype extensions
  (function() {
    if (!Array.prototype.append) {
      Object.defineProperty(Array.prototype, 'append', {
        value: Array.prototype.push,
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.insert) {
      Object.defineProperty(Array.prototype, 'insert', {
        value: function(index, item) {
          this.splice(index, 0, item);
          return this;
        },
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.remove) {
      Object.defineProperty(Array.prototype, 'remove', {
        value: function(item) {
          const idx = this.indexOf(item);
          if (idx !== -1) this.splice(idx, 1);
          return this;
        },
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.extend) {
      Object.defineProperty(Array.prototype, 'extend', {
        value: function(iterable) {
          if (Array.isArray(iterable)) this.push(...iterable);
          return this;
        },
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.clear) {
      Object.defineProperty(Array.prototype, 'clear', {
        value: function() {
          this.length = 0;
        },
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.count) {
      Object.defineProperty(Array.prototype, 'count', {
        value: function(item) {
          return this.filter(x => x === item).length;
        },
        writable: true,
        configurable: true
      });
    }
    if (!Array.prototype.index) {
      Object.defineProperty(Array.prototype, 'index', {
        value: function(item) {
          const idx = this.indexOf(item);
          if (idx === -1) throw new Error("ValueError: '" + item + "' is not in list");
          return idx;
        },
        writable: true,
        configurable: true
      });
    }
    const originalPop = Array.prototype.pop;
    Object.defineProperty(Array.prototype, 'pop', {
      value: function(index) {
        if (index === undefined) {
          return originalPop.call(this);
        }
        const val = this[index];
        this.splice(index, 1);
        return val;
      },
      writable: true,
      configurable: true
    });
    const originalSort = Array.prototype.sort;
    Object.defineProperty(Array.prototype, 'sort', {
      value: function(compareFn) {
        if (compareFn !== undefined) {
          return originalSort.call(this, compareFn);
        }
        const allNumbers = this.every(x => typeof x === 'number');
        if (allNumbers) {
          return originalSort.call(this, (a, b) => a - b);
        }
        return originalSort.call(this);
      },
      writable: true,
      configurable: true
    });

    // String prototype extensions
    if (!String.prototype.find) {
      Object.defineProperty(String.prototype, 'find', {
        value: String.prototype.indexOf,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.lower) {
      Object.defineProperty(String.prototype, 'lower', {
        value: String.prototype.toLowerCase,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.upper) {
      Object.defineProperty(String.prototype, 'upper', {
        value: String.prototype.toUpperCase,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.strip) {
      Object.defineProperty(String.prototype, 'strip', {
        value: String.prototype.trim,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.lstrip) {
      Object.defineProperty(String.prototype, 'lstrip', {
        value: String.prototype.trimStart,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.rstrip) {
      Object.defineProperty(String.prototype, 'rstrip', {
        value: String.prototype.trimEnd,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.startswith) {
      Object.defineProperty(String.prototype, 'startswith', {
        value: String.prototype.startsWith,
        writable: true,
        configurable: true
      });
    }
    if (!String.prototype.endswith) {
      Object.defineProperty(String.prototype, 'endswith', {
        value: String.prototype.endsWith,
        writable: true,
        configurable: true
      });
    }

    // Set prototype extensions
    if (!Set.prototype.remove) {
      Object.defineProperty(Set.prototype, 'remove', {
        value: function(item) {
          const deleted = this.delete(item);
          if (!deleted) throw new Error("KeyError: " + item);
        },
        writable: true,
        configurable: true
      });
    }
    if (!Set.prototype.discard) {
      Object.defineProperty(Set.prototype, 'discard', {
        value: Set.prototype.delete,
        writable: true,
        configurable: true
      });
    }
  })();

  // Global helpers
  function pyGet(obj, key, defaultValue) {
    if (obj === null || obj === undefined) return defaultValue;
    if (typeof obj.get === 'function') return obj.get(key, defaultValue);
    return obj[key] !== undefined ? obj[key] : defaultValue;
  }
  function pyKeys(obj) {
    if (obj === null || obj === undefined) return [];
    if (typeof obj.keys === 'function') return Array.from(obj.keys());
    return Object.keys(obj);
  }
  function pyValues(obj) {
    if (obj === null || obj === undefined) return [];
    if (typeof obj.values === 'function') return Array.from(obj.values());
    return Object.values(obj);
  }
  function pyItems(obj) {
    if (obj === null || obj === undefined) return [];
    if (typeof obj.items === 'function') return Array.from(obj.items());
    return Object.entries(obj);
  }
  var math = Math;
  var random = {
    random: Math.random,
    randint: function(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
    choice: function(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle: function(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    }
  };
  var time = {
    time: function() { return Date.now() / 1000; },
    sleep: function(s) {
      const start = Date.now();
      while (Date.now() - start < s * 1000) {}
    }
  };
  var json = {
    dumps: JSON.stringify,
    loads: JSON.parse
  };
  function len(x) {
    if (x === null || x === undefined) return 0;
    if (typeof x.length === 'number') return x.length;
    if (x instanceof Set || x instanceof Map) return x.size;
    if (typeof x === 'object') return Object.keys(x).length;
    return 0;
  }
  function sum(x) {
    if (!Array.isArray(x)) return 0;
    return x.reduce(function(a, b) { return a + Number(b); }, 0);
  }
  function range(start, stop, step) {
    if (step === undefined) step = 1;
    if (stop === undefined) {
      stop = start;
      start = 0;
    }
    const arr = [];
    if (step > 0) {
      for (let i = start; i < stop; i += step) arr.push(i);
    } else if (step < 0) {
      for (let i = start; i > stop; i += step) arr.push(i);
    }
    return arr;
  }
  function str(x) {
    if (x === null) return 'None';
    if (x === true) return 'True';
    if (x === false) return 'False';
    if (Array.isArray(x)) return '[' + x.map(str).join(', ') + ']';
    if (typeof x === 'object') {
      return '{' + Object.entries(x).map(function(e) { return "\'" + e[0] + "\': " + str(e[1]); }).join(', ') + '}';
    }
    return String(x);
  }
  function int(x) {
    const res = parseInt(x, 10);
    if (isNaN(res)) throw new Error("ValueError: invalid literal for int()");
    return res;
  }
  function float(x) {
    const res = parseFloat(x);
    if (isNaN(res)) throw new Error("ValueError: invalid literal for float()");
    return res;
  }
  var abs = Math.abs;
  function min(...args) {
    if (args.length === 1 && Array.isArray(args[0])) return Math.min(...args[0]);
    return Math.min(...args);
  }
  function max(...args) {
    if (args.length === 1 && Array.isArray(args[0])) return Math.max(...args[0]);
    return Math.max(...args);
  }
  function type(x) {
    if (x === null) return "<class 'NoneType'>";
    if (Array.isArray(x)) return "<class 'list'>";
    if (typeof x === 'object') return "<class 'dict'>";
    return "<class '" + typeof x + "'>";
  }
  function any(x) {
    if (!Array.isArray(x)) return Boolean(x);
    return x.some(Boolean);
  }
  function all(x) {
    if (!Array.isArray(x)) return Boolean(x);
    return x.every(Boolean);
  }

  function pyEquals(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every(function(v, i) { return pyEquals(v, b[i]); });
    }
    return a == b;
  }

  function pyIn(item, list) {
    if (list === null || list === undefined) return false;
    if (Array.isArray(list) || typeof list === 'string') return list.indexOf(item) !== -1;
    if (typeof list === 'object') return item in list;
    return false;
  }

  function pyIterable(x) {
    if (x === null || x === undefined) return [];
    if (typeof x[Symbol.iterator] === 'function') return x;
    if (typeof x === 'object') return Object.keys(x);
    return [];
  }

  function enumerate(iterable) {
    let arr = Array.isArray(iterable) ? iterable : Array.from(iterable);
    return arr.map((val, idx) => [idx, val]);
  }

  function zip(...iterables) {
    let arrays = iterables.map(it => Array.isArray(it) ? it : Array.from(it));
    let minLen = Math.min(...arrays.map(a => a.length));
    let res = [];
    for (let i = 0; i < minLen; i++) {
      res.push(arrays.map(a => a[i]));
    }
    return res;
  }

  function pyMultiply(a, b) {
    if (Array.isArray(a) && typeof b === 'number') {
      let res = [];
      for (let i = 0; i < b; i++) res.push(...a);
      return res;
    }
    if (typeof a === 'string' && typeof b === 'number') {
      return a.repeat(b);
    }
    if (typeof a === 'number' && Array.isArray(b)) {
      let res = [];
      for (let i = 0; i < a; i++) res.push(...b);
      return res;
    }
    if (typeof a === 'number' && typeof b === 'string') {
      return b.repeat(a);
    }
    return a * b;
  }
`;

const getGoPolyfills = (): string => `
  if (!window.createUniversalProxy) {
    window.createUniversalProxy = function(name) {
      const handler = {
        get: function(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
            return () => "[Proxy " + name + "]";
          }
          const dummyFunc = function(...args) {
            console.warn("[Cortex Sandbox] Called placeholder method " + name + "." + String(prop) + "()");
            return window.createUniversalProxy(name + "." + String(prop) + "()");
          };
          return new Proxy(dummyFunc, handler);
        }
      };
      const targetObj = function() {};
      return new Proxy(targetObj, handler);
    };
  }

  if (!window.createModuleMock) {
    window.createModuleMock = function(name, spec) {
      const handler = {
        get: function(target, prop) {
          if (prop in target) {
            return target[prop];
          }
          if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
            return () => "[Module " + name + "]";
          }
          const dummyFunc = function(...args) {
            console.warn("[Cortex Sandbox] Called placeholder method " + name + "." + String(prop) + "()");
            return window.createUniversalProxy(name + "." + String(prop) + "()");
          };
          return new Proxy(dummyFunc, this);
        }
      };
      return new Proxy(spec, handler);
    };
  }

  window.getGoModuleOrProxy = function(name) {
    const lowercaseName = name.toLowerCase();

    if (!window.stringsMock) {
      window.stringsMock = window.createModuleMock('strings', {
        Contains: function(s, substr) { return s.indexOf(substr) !== -1; },
        HasPrefix: function(s, prefix) { return s.startsWith(prefix); },
        HasSuffix: function(s, suffix) { return s.endsWith(suffix); },
        ToLower: function(s) { return s.toLowerCase(); },
        ToUpper: function(s) { return s.toUpperCase(); },
        Split: function(s, sep) { return s.split(sep); },
        Join: function(elems, sep) { return elems.join(sep); },
        Replace: function(s, old, newVal, n) {
          if (n < 0) return s.replaceAll(old, newVal);
          let res = s;
          for (let i = 0; i < n; i++) res = res.replace(old, newVal);
          return res;
        },
        TrimSpace: function(s) { return s.trim(); }
      });
    }

    if (!window.strconvMock) {
      window.strconvMock = window.createModuleMock('strconv', {
        Itoa: function(i) { return String(i); },
        Atoi: function(s) {
          const res = parseInt(s, 10);
          if (isNaN(res)) return [0, new Error("strconv.Atoi: parsing \\\"" + s + "\\\": invalid syntax")];
          return [res, null];
        },
        ParseFloat: function(s, bitSize) {
          const res = parseFloat(s);
          if (isNaN(res)) return [0, new Error("strconv.ParseFloat: parsing \\\"" + s + "\\\": invalid syntax")];
          return [res, null];
        }
      });
    }

    if (lowercaseName === 'fmt') return fmt;
    if (lowercaseName === 'math') return Math;
    if (lowercaseName === 'strings') return window.stringsMock;
    if (lowercaseName === 'strconv') return window.strconvMock;
    return window.createUniversalProxy(name);
  };

  // Go Polyfills & helpers
  var fmt = {
    Println: function(...args) { console.log(...args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))); },
    Print: function(...args) { console.log(...args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))); },
    Printf: function(formatStr, ...args) {
      if (typeof formatStr !== 'string') {
        console.log(formatStr, ...args);
        return;
      }
      let res = formatStr;
      for (let arg of args) {
        res = res.replace(/%[vdsft]/, String(arg));
      }
      console.log(res);
    }
  };

  function pyIterable(x) {
    if (x === null || x === undefined) return [];
    if (typeof x[Symbol.iterator] === 'function') return x;
    if (typeof x === 'object') return Object.keys(x);
    return [];
  }

  function goRange(x) {
    if (Array.isArray(x)) return x.map((val, idx) => [idx, val]);
    if (typeof x === 'string') return Array.from(x).map((val, idx) => [idx, val]);
    if (typeof x === 'object' && x !== null) return Object.entries(x);
    return [];
  }

  function len(x) {
    if (x === null || x === undefined) return 0;
    if (typeof x.length === 'number') return x.length;
    if (x instanceof Set || x instanceof Map) return x.size;
    if (typeof x === 'object') return Object.keys(x).length;
    return 0;
  }

  function append(slice, ...elems) {
    if (!Array.isArray(slice)) return slice;
    return [...slice, ...elems];
  }
`;

const getRustPolyfills = (): string => `
  if (!window.createUniversalProxy) {
    window.createUniversalProxy = function(name) {
      const handler = {
        get: function(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
            return () => "[Proxy " + name + "]";
          }
          const dummyFunc = function(...args) {
            console.warn("[Cortex Sandbox] Called placeholder method " + name + "." + String(prop) + "()");
            return window.createUniversalProxy(name + "." + String(prop) + "()");
          };
          return new Proxy(dummyFunc, handler);
        }
      };
      const targetObj = function() {};
      return new Proxy(targetObj, handler);
    };
  }

  window.getRustModuleOrProxy = function(name) {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName === 'hashmap') {
      return {
        new: function() { return new Map(); }
      };
    }
    if (lowercaseName === 'hashset') {
      return {
        new: function() { return new Set(); }
      };
    }
    if (lowercaseName === 'vec') return Vec;
    if (lowercaseName === 'string') return String;
    return window.createUniversalProxy(name);
  };

  // Rust Polyfills & helpers
  function rustPrintln(formatStr, ...args) {
    if (typeof formatStr !== 'string') {
      console.log(formatStr, ...args);
      return;
    }
    let res = formatStr;
    for (let arg of args) {
      res = res.replace('{}', typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg));
    }
    console.log(res);
  }

  function pyIterable(x) {
    if (x === null || x === undefined) return [];
    if (typeof x[Symbol.iterator] === 'function') return x;
    if (typeof x === 'object') return Object.keys(x);
    return [];
  }

  // Rust Range Polyfills
  function rustRange(start, end) {
    let res = [];
    for (let i = start; i < end; i++) res.push(i);
    return res;
  }

  function rustRangeInclusive(start, end) {
    let res = [];
    for (let i = start; i <= end; i++) res.push(i);
    return res;
  }

  var Vec = {
    new: function() { return []; }
  };

  var String = {
    from: function(x) { return globalThis.String(x); }
  };

  if (!String.prototype.to_string) {
    Object.defineProperty(String.prototype, 'to_string', {
      value: function() { return this.toString(); },
      writable: true,
      configurable: true
    });
  }
`;

const registerGlobalPolyfills = (language: string) => {
  const lang = language.toLowerCase();
  try {
    if (lang === 'python' || lang === 'py') {
      (window as any).eval(getPythonPolyfills());
      if ((window as any).getPythonModuleOrProxy) {
        (window as any).sys = (window as any).getPythonModuleOrProxy("sys");
        (window as any).os = (window as any).getPythonModuleOrProxy("os");
        (window as any).collections = (window as any).getPythonModuleOrProxy("collections");
        (window as any).defaultdict = (window as any).getPythonModuleOrProxy("defaultdict");
        (window as any).Counter = (window as any).getPythonModuleOrProxy("Counter");
      }
    } else if (lang === 'go' || lang === 'golang') {
      (window as any).eval(getGoPolyfills());
      if ((window as any).getGoModuleOrProxy) {
        (window as any).fmt = (window as any).getGoModuleOrProxy("fmt");
        (window as any).strings = (window as any).getGoModuleOrProxy("strings");
        (window as any).strconv = (window as any).getGoModuleOrProxy("strconv");
      }
    } else if (lang === 'rust' || lang === 'rs') {
      (window as any).eval(getRustPolyfills());
    }
  } catch (err) {
    console.error("Failed to register global polyfills for", language, err);
  }
};

// ══════════════════════════════════════════════════════════════
// POLYGLOT RUNTIME COMPILER
// ══════════════════════════════════════════════════════════════

const extractPythonImports = (code: string): string[] => {
  const importedNames: string[] = [];
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ')) {
      const parts = trimmed.substring(7).split(',');
      for (const part of parts) {
        const subParts = part.trim().split(/\s+/);
        if (subParts.length === 3 && subParts[1] === 'as') {
          importedNames.push(subParts[2]);
        } else if (subParts[0]) {
          importedNames.push(subParts[0]);
        }
      }
    } else if (trimmed.startsWith('from ')) {
      const importIndex = trimmed.indexOf(' import ');
      if (importIndex !== -1) {
        const importPart = trimmed.substring(importIndex + 8);
        const parts = importPart.split(',');
        for (const part of parts) {
          const subParts = part.trim().split(/\s+/);
          if (subParts.length === 3 && subParts[1] === 'as') {
            importedNames.push(subParts[2]);
          } else if (subParts[0]) {
            importedNames.push(subParts[0]);
          }
        }
      }
    }
  }
  return Array.from(new Set(importedNames));
};

const extractGoImports = (code: string): string[] => {
  const importedNames: string[] = [];
  const lines = code.split('\n');
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import (')) {
      inBlock = true;
      continue;
    }
    if (inBlock && trimmed === ')') {
      inBlock = false;
      continue;
    }
    if (inBlock) {
      const match = trimmed.match(/"([^"]+)"/);
      if (match) {
        const parts = match[1].split('/');
        importedNames.push(parts[parts.length - 1]);
      }
    } else if (trimmed.startsWith('import ')) {
      const match = trimmed.match(/"([^"]+)"/);
      if (match) {
        const parts = match[1].split('/');
        importedNames.push(parts[parts.length - 1]);
      }
    }
  }
  return Array.from(new Set(importedNames));
};

const extractRustUses = (code: string): string[] => {
  const importedNames: string[] = [];
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('use ')) {
      const clean = trimmed.replace(/^use\s+/, '').replace(/;$/, '');
      if (clean.includes('{')) {
        const match = clean.match(/\{([^}]+)\}/);
        if (match) {
          const names = match[1].split(',');
          for (const name of names) {
            importedNames.push(name.trim());
          }
        }
      } else {
        const parts = clean.split('::');
        const name = parts[parts.length - 1];
        if (name && name !== '*') {
          importedNames.push(name);
        }
      }
    }
  }
  return Array.from(new Set(importedNames));
};

const transpileToJs = (code: string, language: string): string => {
  const lang = language.toLowerCase();

  if (lang !== 'python' && lang !== 'py' && lang !== 'go' && lang !== 'golang' && lang !== 'rust' && lang !== 'rs') {
    return code;
  }

  // Tokenize and protect strings/comments
  const placeholders: { token: string; value: string }[] = [];
  let tokenIndex = 0;
  let tokenizedCode = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    // Python triple quote multi-line strings
    if ((lang === 'python' || lang === 'py') && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const quoteChar = code.startsWith('"""', i) ? '"""' : "'''";
      const start = i;
      i += 3;
      while (i < len && !code.startsWith(quoteChar, i)) {
        if (code[i] === '\\') i += 2;
        else i++;
      }
      i += 3;
      const val = code.slice(start, i);
      const token = `__STR_LIT_TOKEN_${tokenIndex++}__`;
      placeholders.push({ token, value: val });
      tokenizedCode += token;
      continue;
    }

    // Python comments
    if ((lang === 'python' || lang === 'py') && code[i] === '#') {
      const start = i;
      while (i < len && code[i] !== '\n') {
        i++;
      }
      const val = '//' + code.slice(start + 1, i);
      const token = `__COMMENT_TOKEN_${tokenIndex++}__`;
      placeholders.push({ token, value: val });
      tokenizedCode += token;
      continue;
    }

    // Go/Rust comments
    if ((lang === 'go' || lang === 'golang' || lang === 'rust' || lang === 'rs') && code.startsWith('//', i)) {
      const start = i;
      while (i < len && code[i] !== '\n') {
        i++;
      }
      const val = code.slice(start, i);
      const token = `__COMMENT_TOKEN_${tokenIndex++}__`;
      placeholders.push({ token, value: val });
      tokenizedCode += token;
      continue;
    }

    if ((lang === 'go' || lang === 'golang' || lang === 'rust' || lang === 'rs') && code.startsWith('/*', i)) {
      const start = i;
      i += 2;
      while (i < len && !code.startsWith('*/', i)) {
        i++;
      }
      i += 2;
      const val = code.slice(start, i);
      const token = `__COMMENT_TOKEN_${tokenIndex++}__`;
      placeholders.push({ token, value: val });
      tokenizedCode += token;
      continue;
    }

    // Strings
    if (code[i] === '"' || code[i] === "'") {
      const quoteChar = code[i];
      const start = i;
      i++;
      while (i < len && code[i] !== quoteChar) {
        if (code[i] === '\\') i += 2;
        else i++;
      }
      i++;
      const val = code.slice(start, i);
      const token = `__STR_LIT_TOKEN_${tokenIndex++}__`;
      placeholders.push({ token, value: val });
      tokenizedCode += token;
      continue;
    }

    tokenizedCode += code[i];
    i++;
  }

  const restore = (transpiled: string): string => {
    let restored = transpiled;
    for (let j = placeholders.length - 1; j >= 0; j--) {
      const { token, value } = placeholders[j];
      restored = restored.replaceAll(token, value);
    }
    return restored;
  };

  if (lang === 'python' || lang === 'py') {
    let lines = tokenizedCode.replace(/\t/g, '    ').split('\n');
    let indentStack: number[] = [];
    let jsLines: string[] = [];
    let inClass = false;
    let classIndent = -1;
    let definedClasses = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      if (trimmed === '') {
        jsLines.push('');
        continue;
      }

      let leadingSpaces = line.match(/^ */)?.[0].length || 0;

      // Skip nonlocal/global variable declarations in JS simulation since scoping is lexical
      if (trimmed.startsWith('nonlocal ') || trimmed.startsWith('global ')) {
        jsLines.push(' '.repeat(leadingSpaces) + '// ' + trimmed);
        continue;
      }

      // Skip import/from statements and let polyfills resolve common standard libraries
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        jsLines.push(' '.repeat(leadingSpaces) + '// ' + trimmed);
        continue;
      }

      // Class indentation state check
      if (inClass && leadingSpaces <= classIndent && trimmed !== '') {
        inClass = false;
        classIndent = -1;
      }

      while (indentStack.length > 0 && leadingSpaces < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        let indentStr = ' '.repeat(indentStack.length > 0 ? indentStack[indentStack.length - 1] : 0);
        jsLines.push(indentStr + '}');
      }

      if (trimmed.startsWith('#')) {
        jsLines.push(' '.repeat(leadingSpaces) + '//' + trimmed.substring(1));
        continue;
      }

      let commentIndex = line.indexOf('#');
      let codePart = commentIndex !== -1 ? line.substring(0, commentIndex) : line;
      let commentPart = commentIndex !== -1 ? line.substring(commentIndex).replace('#', '//') : '';

      let trimmedCode = codePart.trim();
      if (trimmedCode === 'pass') {
        trimmedCode = '// pass';
      }

      // 1. Primitive and is/is not replacements
      trimmedCode = trimmedCode
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');

      trimmedCode = trimmedCode.replace(/\bis\s+not\b/g, '!==');
      trimmedCode = trimmedCode.replace(/\bis\b/g, '===');

      // 2. Class instance variable replacement: self. -> this.
      trimmedCode = trimmedCode.replace(/\bself\./g, 'this.');

      // Prepend 'new' to class constructor calls (track defined classes)
      let classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        definedClasses.add(classMatch[1]);
      }
      if (!trimmed.startsWith('class ')) {
        definedClasses.forEach(className => {
          const classCallRegex = new RegExp(`\\b(${className})\\(`, 'g');
          trimmedCode = trimmedCode.replace(classCallRegex, 'new $1(');
        });
      }

      // 3. Integer Floor Division: a // b -> Math.floor(a / b)
      trimmedCode = trimmedCode.replace(/(\w+\([^)]+\))\s*\/\/\s*(\S+)/g, 'Math.floor($1 / $2)');
      trimmedCode = trimmedCode.replace(/\(([^)]+)\)\s*\/\/\s*(\S+)/g, 'Math.floor(($1) / $2)');
      trimmedCode = trimmedCode.replace(/(\w+)\s*\/\/\s*(\S+)/g, 'Math.floor($1 / $2)');

      // 4. Slicing Operations: arr[start:stop] -> arr.slice(start, stop)
      const sliceRegex = /(\b\w+)\s*\[\s*([^:\]]*)\s*:\s*([^:\]]*)\s*\]/g;
      trimmedCode = trimmedCode.replace(sliceRegex, (match, listName, start, stop) => {
        const startVal = start.trim() ? start.trim() : '0';
        const stopVal = stop.trim() ? `, ${stop.trim()}` : '';
        return `${listName}.slice(${startVal}${stopVal})`;
      });

      // 5. List Comprehension Mapping
      let listCompRegex = /\[\s*(.+?)\s+for\s+(\w+)\s+in\s+(.+?)\s*\]/g;
      trimmedCode = trimmedCode.replace(listCompRegex, '($3).map($2 => $1)');

      // 6. Logical Operator mappings: not, and, or -> !, &&, ||
      trimmedCode = trimmedCode.replace(/\bnot\s+/g, '!');
      trimmedCode = trimmedCode.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');

      // 7. Value Inclusion operator: item in list -> pyIn(item, list) (excluding 'for ' loops)
      if (!trimmedCode.startsWith('for ')) {
        const notInRegex = /([a-zA-Z0-9_\(\)\[\]\.\'\"]+)\s+not\s+in\s+([a-zA-Z0-9_\(\)\[\]\.\'\"]+)/g;
        trimmedCode = trimmedCode.replace(notInRegex, '!pyIn($1, $2)');

        const inRegex = /([a-zA-Z0-9_\(\)\[\]\.\'\"]+)\s+in\s+([a-zA-Z0-9_\(\)\[\]\.\'\"]+)/g;
        trimmedCode = trimmedCode.replace(inRegex, 'pyIn($1, $2)');
      }

      // 7.2. Exponentiation: ** -> Math.pow() (must come before * multiplication)
      trimmedCode = trimmedCode.replace(/([a-zA-Z0-9_\(\)\[\]\.\'\"]+)\s*\*\*\s*([a-zA-Z0-9_\(\)\[\]\.\'\"]+)/g, 'Math.pow($1, $2)');

      // 7.3. List/string multiplication: [0] * 5 or 5 * [0]
      trimmedCode = trimmedCode.replace(/([a-zA-Z0-9_\(\)\[\]\.\'\"]+)\s*\*\s*([a-zA-Z0-9_\(\)\[\]\.\'\"]+)/g, 'pyMultiply($1, $2)');

      // 7.3. Dict method translations: dict.get(key) -> pyGet(dict, key)
      trimmedCode = trimmedCode
        .replace(/([\w\[\]\(\)\.\'\"\-]+)\.get\(([^)]+)\)/g, 'pyGet($1, $2)')
        .replace(/([\w\[\]\(\)\.\'\"\-]+)\.keys\(\)/g, 'pyKeys($1)')
        .replace(/([\w\[\]\(\)\.\'\"\-]+)\.values\(\)/g, 'pyValues($1)')
        .replace(/([\w\[\]\(\)\.\'\"\-]+)\.items\(\)/g, 'pyItems($1)');

      // 7.5. Python F-Strings: f"Hello {name}" -> `Hello ${name}`
      trimmedCode = trimmedCode.replace(/\bf"([^"]*)"/g, (match, content) => {
        return '`' + content.replace(/\{([^}]+)\}/g, '${$1}') + '`';
      }).replace(/\bf'([^']*)'/g, (match, content) => {
        return '`' + content.replace(/\{([^}]+)\}/g, '${$1}') + '`';
      });

      // 7.8. Lambda Translation: lambda x: x + 1 -> (x => x + 1)
      trimmedCode = trimmedCode.replace(/\blambda\s+([a-zA-Z0-9_,\s]+)\s*:\s*(.+)$/g, '($1 => $2)');

      // 8. Standard Print translation
      if (trimmedCode.includes('print(')) {
        let printMatch = trimmedCode.match(/print\((.*)\)/);
        if (printMatch) {
          let insidePrint = printMatch[1];
          if (insidePrint.includes('==') && !insidePrint.includes('===') && !insidePrint.includes('!==')) {
            let parts = insidePrint.split('==');
            insidePrint = `pyEquals(${parts[0].trim()}, ${parts[1].trim()})`;
          }
          trimmedCode = trimmedCode.replace(/print\(.*\)/, `console.log(${insidePrint})`);
        }
      }

      // 9. Block Headers mapping (ending with ':')
      if (trimmedCode.endsWith(':')) {
        let blockHeader = trimmedCode.substring(0, trimmedCode.length - 1).trim();
        let blockTranspiled = blockHeader;

        if (blockHeader.startsWith('class ')) {
          inClass = true;
          classIndent = leadingSpaces;
          blockTranspiled = `class ${blockHeader.substring(6).trim()}`;
        } else if (blockHeader.startsWith('def ')) {
          if (inClass) {
            // Class method or constructor
            if (blockHeader.startsWith('def __init__')) {
              let initMatch = blockHeader.match(/^def\s+__init__\((.*)\)$/);
              if (initMatch) {
                let args = initMatch[1].replace(/\bself,?\s*/, '').trim();
                blockTranspiled = `constructor(${args})`;
              }
            } else {
              let methodMatch = blockHeader.match(/^def\s+(\w+)\((.*)\)$/);
              if (methodMatch) {
                let args = methodMatch[2].replace(/\bself,?\s*/, '').trim();
                blockTranspiled = `${methodMatch[1]}(${args})`;
              }
            }
          } else {
            // Global function
            let defMatch = blockHeader.match(/^def\s+(\w+)\((.*)\)$/);
            if (defMatch) {
              blockTranspiled = `function ${defMatch[1]}(${defMatch[2]})`;
            }
          }
        } else if (blockHeader.startsWith('for ')) {
          let forMatch = blockHeader.match(/^for\s+(.+?)\s+in\s+(.+)$/);
          if (forMatch) {
            let vars = forMatch[1].trim();
            let expr = forMatch[2].trim();
            if (vars.includes(',')) {
              if (!vars.startsWith('[') && !vars.startsWith('(')) {
                vars = `[${vars}]`;
              }
            }
            blockTranspiled = `for (let ${vars} of pyIterable(${expr}))`;
          }
        } else if (blockHeader.startsWith('if ')) {
          blockTranspiled = `if (${blockHeader.substring(3).trim()})`;
        } else if (blockHeader.startsWith('elif ')) {
          blockTranspiled = `else if (${blockHeader.substring(5).trim()})`;
        } else if (blockHeader === 'else') {
          blockTranspiled = 'else';
        } else if (blockHeader.startsWith('while ')) {
          blockTranspiled = `while (${blockHeader.substring(6).trim()})`;
        } else if (blockHeader === 'try') {
          blockTranspiled = 'try';
        } else if (blockHeader.startsWith('except')) {
          let errVar = 'err';
          const match = blockHeader.match(/except\s+\w+\s+as\s+(\w+)/);
          if (match) errVar = match[1];
          blockTranspiled = `catch (${errVar})`;
        } else if (blockHeader === 'finally') {
          blockTranspiled = 'finally';
        }

        trimmedCode = blockTranspiled + ' {';
        indentStack.push(leadingSpaces + 4);
      }

      jsLines.push(' '.repeat(leadingSpaces) + trimmedCode + (commentPart ? ' ' + commentPart : ''));
    }

    while (indentStack.length > 0) {
      indentStack.pop();
      let indentStr = ' '.repeat(indentStack.length > 0 ? indentStack[indentStack.length - 1] : 0);
      jsLines.push(indentStr + '}');
    }

    const importedNames = extractPythonImports(code);
    const declarations = importedNames.map(name => `const ${name} = window.getPythonModuleOrProxy ? window.getPythonModuleOrProxy("${name}") : undefined;`).join('\n');

    const transpiledPython = `
      ${getPythonPolyfills()}
      ${declarations}
      ${jsLines.join('\n')}
    `;
    return restore(transpiledPython);
  }

  if (lang === 'go' || lang === 'golang') {
    let lines = tokenizedCode.split('\n');
    let jsLines: string[] = [];
    let hasMain = false;

    // Helper functions for parameter cleanup
    const cleanGoParams = (paramStr: string): string => {
      if (!paramStr.trim()) return '';
      return paramStr.split(',').map(p => {
        let parts = p.trim().split(/\s+/);
        if (parts.length > 1) {
          return parts.slice(0, -1).join(' ');
        }
        return p.trim();
      }).join(', ');
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      if (trimmed.startsWith('package ') || trimmed.startsWith('import ')) {
        jsLines.push('// ' + trimmed);
        continue;
      }

      let codePart = line;

      // Track if func main exists
      if (trimmed.startsWith('func main(')) {
        hasMain = true;
      }

      // 1. Function definition signatures: func name(a type, b type) returnType {
      let funcMatch = codePart.match(/func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*)/);
      if (funcMatch) {
        let name = funcMatch[1];
        let params = funcMatch[2];
        let cleanedParams = cleanGoParams(params);
        codePart = codePart.replace(/func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*)/, `function ${name}(${cleanedParams}) `);
      }

      // 2. Variable declarations: var x int = 5 or var x, y int
      codePart = codePart.replace(/var\s+([a-zA-Z0-9_,\s]+)\s+([a-zA-Z0-9_\[\]\*]+)\s*=\s*(.*)/g, 'var $1 = $3');
      codePart = codePart.replace(/var\s+([a-zA-Z0-9_,\s]+)\s+([a-zA-Z0-9_\[\]\*]+)/g, 'var $1');

      // 3. Short variable assignment: x := 5 -> var x = 5
      codePart = codePart.replace(/(\w+)\s*:=\s*/g, 'var $1 = ');

      // 4. Go array/slice literals: []int{1, 2, 3} -> [1, 2, 3]
      codePart = codePart.replace(/\[\d*\][a-zA-Z0-9_]+\{([^}]*)\}/g, '[$1]');
      // 5. Go map literals: map[string]int{"a": 1} -> {"a": 1}
      codePart = codePart.replace(/map\[[a-zA-Z0-9_]+\][a-zA-Z0-9_]+\{([^}]*)\}/g, '{$1}');

      // 6. Go range loop: for i, val := range array {
      let rangeMatch = codePart.match(/for\s+([a-zA-Z0-9_,\s]+)\s*:=\s*range\s+([a-zA-Z0-9_\(\)\[\]\.]+)\s*\{/);
      if (rangeMatch) {
        let vars = rangeMatch[1].trim();
        let expr = rangeMatch[2].trim();
        if (vars.includes(',')) {
          if (!vars.startsWith('[') && !vars.startsWith('(')) {
            vars = `[${vars}]`;
          }
        }
        codePart = codePart.replace(/for\s+([a-zA-Z0-9_,\s]+)\s*:=\s*range\s+([a-zA-Z0-9_\(\)\[\]\.]+)\s*\{/, `for (let ${vars} of goRange(${expr})) {`);
      } else {
        // Go range-over-index loop: for i := range array {
        let rangeIdxMatch = codePart.match(/for\s+(\w+)\s*:=\s*range\s+([a-zA-Z0-9_\(\)\[\]\.]+)\s*\{/);
        if (rangeIdxMatch) {
          let varName = rangeIdxMatch[1];
          let expr = rangeIdxMatch[2];
          codePart = codePart.replace(/for\s+(\w+)\s*:=\s*range\s+([a-zA-Z0-9_\(\)\[\]\.]+)\s*\{/, `for (let ${varName} of pyIterable(${expr})) {`);
        }
      }

      // 7. Go standard loop forms:
      if (trimmed.startsWith('for ') && trimmed.includes(';') && !trimmed.includes('range')) {
        let loopMatch = codePart.match(/for\s+([^;]+;[^;]+;[^;{]+)\s*\{/);
        if (loopMatch) {
          let loopExpr = loopMatch[1];
          loopExpr = loopExpr.replace(/(\w+)\s*:=\s*/g, 'let $1 = ');
          codePart = codePart.replace(/for\s+([^;]+;[^;]+;[^;{]+)\s*\{/, `for (${loopExpr}) {`);
        }
      } else if (trimmed.startsWith('for ') && !trimmed.includes(';') && !trimmed.includes('range') && trimmed.endsWith('{')) {
        if (trimmed === 'for {') {
          codePart = codePart.replace('for {', 'while (true) {');
        } else {
          let condMatch = codePart.match(/for\s+([^{]+)\s*\{/);
          if (condMatch) {
            codePart = codePart.replace(/for\s+([^{]+)\s*\{/, `while (${condMatch[1].trim()}) {`);
          }
        }
      }

      jsLines.push(codePart);
    }

    let finalJs = jsLines.join('\n');
    if (hasMain) {
      finalJs += '\n\nmain();';
    }

    const importedNames = extractGoImports(code);
    const declarations = importedNames.map(name => `const ${name} = window.getGoModuleOrProxy ? window.getGoModuleOrProxy("${name}") : undefined;`).join('\n');

    const transpiledGo = `
      ${getGoPolyfills()}
      ${declarations}
      ${finalJs}
    `;
    return restore(transpiledGo);
  }

  if (lang === 'rust' || lang === 'rs') {
    let lines = tokenizedCode.split('\n');
    let jsLines: string[] = [];
    let hasMain = false;

    // Helper functions for parameter cleanup
    const cleanRustParams = (paramStr: string): string => {
      if (!paramStr.trim()) return '';
      return paramStr.split(',').map(p => {
        let parts = p.trim().split(':');
        return parts[0].trim();
      }).join(', ');
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      let codePart = line;

      // Track if fn main exists
      if (trimmed.startsWith('fn main(')) {
        hasMain = true;
      }

      // 1. Function definition signatures: fn name(a: type, b: type) -> returnType {
      let funcMatch = codePart.match(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*[^{]+)?\s*\{?/);
      if (funcMatch) {
        let name = funcMatch[1];
        let params = funcMatch[2];
        let cleanedParams = cleanRustParams(params);
        let hasBrace = codePart.includes('{');
        codePart = codePart.replace(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*[^{]+)?\s*\{?/, `function ${name}(${cleanedParams})${hasBrace ? ' {' : ''}`);
      }

      // 2. Variable declarations: let mut x: i32 = 5; or let x: i32 = 5;
      codePart = codePart.replace(/let\s+(?:mut\s+)?(\w+)(?:\s*:\s*[^=;]+)?\s*=\s*([^;]+);?/g, 'var $1 = $2');

      // 3. Rust macros:
      codePart = codePart.replace(/println!\((.*)\);?/g, 'rustPrintln($1)');
      codePart = codePart.replace(/print!\((.*)\);?/g, 'rustPrintln($1)');
      codePart = codePart.replace(/vec!\[([^\]]*)\]/g, '[$1]');

      // 4. Rust Iterator cleanup: .iter(), .iter_mut(), .into_iter()
      codePart = codePart.replace(/\.iter\(\)/g, '')
                         .replace(/\.iter_mut\(\)/g, '')
                         .replace(/\.into_iter\(\)/g, '');

      // 5. Rust Range Loop replacements:
      codePart = codePart.replace(/for\s+(\w+)\s+in\s+([^\s{]+)\.\.=([^\s{]+)\s*\{/g, 'for (let $1 of pyIterable(rustRangeInclusive($2, $3))) {');
      codePart = codePart.replace(/for\s+(\w+)\s+in\s+([^\s{]+)\.\.([^\s{]+)\s*\{/g, 'for (let $1 of pyIterable(rustRange($2, $3))) {');

      // 6. Rust general iterator loop: for x in iterable {
      if (trimmed.startsWith('for ') && !trimmed.includes('rustRange') && !trimmed.includes('rustRangeInclusive') && trimmed.endsWith('{')) {
        let forMatch = codePart.match(/for\s+(\w+)\s+in\s+([^\s{]+)\s*\{/);
        if (forMatch) {
          codePart = codePart.replace(/for\s+(\w+)\s+in\s+([^\s{]+)\s*\{/, `for (let ${forMatch[1]} of pyIterable(${forMatch[2]})) {`);
        }
      }

      jsLines.push(codePart);
    }

    let finalJs = jsLines.join('\n');
    if (hasMain) {
      finalJs += '\n\nmain();';
    }

    const importedNames = extractRustUses(code);
    const declarations = importedNames.map(name => `const ${name} = window.getRustModuleOrProxy ? window.getRustModuleOrProxy("${name}") : undefined;`).join('\n');

    const transpiledRust = `
      ${getRustPolyfills()}
      ${declarations}
      ${finalJs}
    `;
    return restore(transpiledRust);
  }
  return code;
};

const detectLanguage = (code: string): string | null => {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // HTML
  if (/^\s*<!DOCTYPE html/i.test(trimmed) || /^\s*<html/i.test(trimmed) || (/^\s*<div/i.test(trimmed) && trimmed.includes('</div>'))) {
    return 'html';
  }

  // CSS
  if (/^\s*[\.#a-zA-Z[\]:]+\s*\{\s*[a-zA-Z-]+\s*:/m.test(trimmed) || /^\s*\/\*[\s\S]*?\*\/\s*[\.#a-zA-Z]/m.test(trimmed)) {
    return 'css';
  }

  // Go
  if (/^\s*package\s+main/m.test(trimmed) || /^\s*func\s+main\(\)/m.test(trimmed) || /import\s+\(\s*"fmt"/m.test(trimmed) || trimmed.includes('fmt.Println')) {
    return 'go';
  }

  // Rust
  if (/^\s*fn\s+main\(\)/m.test(trimmed) || /println!\(/m.test(trimmed) || /\blet\s+mut\b/m.test(trimmed) || /\bimpl\b/m.test(trimmed)) {
    return 'rust';
  }

  // Python
  if (/^\s*def\s+\w+\(.*\):/m.test(trimmed) || /^\s*for\s+\w+\s+in\s+range/m.test(trimmed) || /^\s*import\s+(sys|os|math)\b/m.test(trimmed) || /^\s*#\s+/m.test(trimmed) || trimmed.endsWith(':')) {
    return 'python';
  }

  // JavaScript
  if (/^\s*const\s+\w+\s*=/m.test(trimmed) || /^\s*let\s+\w+\s*=/m.test(trimmed) || /^\s*function\s+\w+\(/m.test(trimmed) || /console\.log\(/m.test(trimmed)) {
    return 'javascript';
  }

  return null;
};

const consoleInterceptScript = `
<script>
  (function() {
    const _log = console.log;
    const _error = console.error;
    const _warn = console.warn;
    const _info = console.info;

    function safeStringify(obj) {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(obj, function(key, value) {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }));
    }

    let inSendLog = false;
    function sendLog(type, args) {
      if (inSendLog) return;
      inSendLog = true;
      try {
        window.parent.postMessage({
          type: 'cortex-sandbox-console',
          logType: type,
          args: args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try { return safeStringify(arg); } catch(e) { return String(arg); }
            }
            return arg;
          })
        }, '*');
      } catch (err) {
        _error.apply(console, ['[Sandbox Console Error]', err]);
      } finally {
        inSendLog = false;
      }
    }

    console.log = function(...args) {
      _log.apply(console, args);
      sendLog('log', args);
    };
    console.error = function(...args) {
      _error.apply(console, args);
      sendLog('error', args);
    };
    console.warn = function(...args) {
      _warn.apply(console, args);
      sendLog('warn', args);
    };
    console.info = function(...args) {
      _info.apply(console, args);
      sendLog('info', args);
    };

    function isExtensionError(msg, filename, stack) {
      const extensionPattern = /chrome-extension|moz-extension|safari-extension|extension/i;
      if (filename && extensionPattern.test(filename)) return true;
      if (msg && (
        extensionPattern.test(msg) ||
        msg.indexOf('Extension context invalidated') !== -1 ||
        msg.indexOf('ResizeObserver loop completed') !== -1 ||
        msg.indexOf('ResizeObserver loop limit exceeded') !== -1
      )) return true;
      if (stack && extensionPattern.test(stack)) return true;
      return false;
    }

    window.addEventListener('error', function(e) {
      const msg = e.message || '';
      const file = e.filename || '';
      const stack = (e.error && e.error.stack) ? e.error.stack : '';

      if (msg === 'Script error.' || msg === 'Script error' || isExtensionError(msg, file, stack)) {
        e.preventDefault();
        return;
      }
      if (msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
        e.preventDefault();
        return;
      }
      sendLog('error', [msg]);
      e.preventDefault();
    });

    window.addEventListener('unhandledrejection', function(e) {
      const reason = e.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = (reason instanceof Error && reason.stack) ? reason.stack : '';

      if (msg === 'Script error.' || msg === 'Script error' || isExtensionError(msg, '', stack)) {
        e.preventDefault();
        return;
      }
      if (msg.indexOf('Failed to fetch dynamically imported module') !== -1 || msg.indexOf('dynamically imported module') !== -1) {
        e.preventDefault();
        return;
      }
      sendLog('error', ['Unhandled Promise Rejection: ' + msg]);
      e.preventDefault();
    });

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'cortex-eval') {
        const query = e.data.query;
        try {
          const result = window.eval(query);
          sendLog('return', [result]);
        } catch (err) {
          sendLog('error', [err instanceof Error ? err.message : String(err)]);
        }
      }
    });

    document.addEventListener('click', function(e) {
      const anchor = e.target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href) {
          if (href.startsWith('http://') || href.startsWith('https://')) {
            e.preventDefault();
            window.open(href, '_blank');
            sendLog('info', ['[Preview Navigation] Opened external link in new tab: ' + href]);
            return;
          }
          if (href.startsWith('#')) {
            return;
          }
          e.preventDefault();
          sendLog('info', ['[Preview Navigation] Simulated navigation to relative link: ' + href]);
          window.parent.postMessage({
            type: 'cortex-sandbox-link-click',
            href: href
          }, '*');
        }
      }
    });
  })();
</script>
`;

interface SandboxFile {
  name: string;
  code: string;
  language: string;
}

const CodeSandbox: React.FC<CodeSandboxProps> = ({
  initialCode,
  initialLanguage = 'javascript',
  forceInitialCode = false,
  runTrigger = 0,
  onClose,
  isZenMode = false,
  onAskSara,
  initialSandboxState,
  onStateChange,
  hideCloseButton = false,
  saraOpen = false,
  onToggleSara,
  onFullscreenChange,
  onOpenWorkbench,
  sourceMsgId,
  onExecutionOutput,
}) => {
  // ── State ──
  const initialFiles = useMemo<SandboxFile[]>(() => {
    if (initialSandboxState && initialSandboxState.files && Object.keys(initialSandboxState.files).length > 0) {
      return Object.entries(initialSandboxState.files).map(([name, code]) => {
        const ext = name.split('.').pop() || '';
        const fileLang =
          ext === 'py' ? 'python' :
          ext === 'go' ? 'go' :
          ext === 'rs' ? 'rust' :
          ext === 'c' ? 'c' :
          ext === 'cpp' || ext === 'cc' || ext === 'cxx' ? 'cpp' :
          ext === 'java' ? 'java' :
          ext === 'js' ? 'javascript' :
          ext === 'css' ? 'css' : 'html';
        return { name, code, language: fileLang };
      });
    }
    const lang = initialLanguage?.toLowerCase();
    const isHtml = lang === 'html' || lang === 'xml';
    const isCss = lang === 'css';
    const isPython = lang === 'python' || lang === 'py';
    const isGo = lang === 'go' || lang === 'golang';
    const isRust = lang === 'rust' || lang === 'rs';

    if (isPython) {
      return [
        {
          name: 'main.py',
          code: initialCode || '# Write Python here\n',
          language: 'python'
        }
      ];
    }
    if (isGo) {
      return [
        {
          name: 'main.go',
          code: initialCode || '// Write Go here\n',
          language: 'go'
        }
      ];
    }
    if (isRust) {
      return [
        {
          name: 'main.rs',
          code: initialCode || '// Write Rust here\n',
          language: 'rust'
        }
      ];
    }
    if (lang === 'c') {
      return [
        {
          name: 'main.c',
          code: initialCode || '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
          language: 'c'
        }
      ];
    }
    if (lang === 'cpp') {
      return [
        {
          name: 'main.cpp',
          code: initialCode || '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
          language: 'cpp'
        }
      ];
    }
    if (lang === 'java') {
      return [
        {
          name: 'Main.java',
          code: initialCode || 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
          language: 'java'
        }
      ];
    }

    return [
      {
        name: 'index.js',
        code: isHtml || isCss ? '// Write JavaScript here\nconsole.log("JavaScript running");\n' : (initialCode || ''),
        language: 'javascript'
      },
      {
        name: 'styles.css',
        code: isCss ? (initialCode || '') : '/* Write CSS here */\nbody {\n  font-family: sans-serif;\n  padding: 20px;\n  background: #0f172a;\n  color: white;\n}',
        language: 'css'
      },
      {
        name: 'index.html',
        code: isHtml ? (initialCode || '') : `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
  <style>
    body {
      background: #05070a;
      color: #cbd5e1;
      padding: 20px;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <div id="output"></div>
  <script src="index.js"></script>
</body>
</html>`,
        language: 'html'
      }
    ];
  }, [initialCode, initialLanguage, initialSandboxState]);

  const [files, setFiles] = useState<SandboxFile[]>(initialFiles);
  const [activeFileName, setActiveFileName] = useState(() => {
    if (initialSandboxState && initialSandboxState.activeFile) {
      return initialSandboxState.activeFile;
    }
    const lang = initialLanguage?.toLowerCase();
    if (lang === 'python' || lang === 'py') return 'main.py';
    if (lang === 'go' || lang === 'golang') return 'main.go';
    if (lang === 'rust' || lang === 'rs') return 'main.rs';
    if (lang === 'c') return 'main.c';
    if (lang === 'cpp') return 'main.cpp';
    if (lang === 'java') return 'Main.java';
    return lang === 'css' ? 'styles.css' : (lang === 'html' || lang === 'xml' ? 'index.html' : 'index.js');
  });

  // Active file binding (moved up to avoid TDZ compile errors)
  const activeFile = useMemo(() => {
    return files.find(f => f.name === activeFileName) || files[0];
  }, [files, activeFileName]);

  const [copied, setCopied] = useState(false);
  const [activeLine, setActiveLine] = useState(1);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');

  // Notify parent of sandbox state updates
  useEffect(() => {
    if (onStateChange) {
      const filesRecord: Record<string, string> = {};
      files.forEach(f => {
        filesRecord[f.name] = f.code;
      });
      onStateChange({
        files: filesRecord,
        activeFile: activeFileName,
        language: (activeFile?.language || 'javascript') as any,
        exerciseIndex: 0,
        attempts: {},
        completedExerciseIds: [],
        cursorLine: cursorPos.line
      });
    }
  }, [files, activeFileName, activeFile?.language, onStateChange, cursorPos.line]);

  const code = activeFile.code;
  const language = activeFile.language;
  const [runCount, setRunCount] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [previewHtmlFileName, setPreviewHtmlFileName] = useState('index.html');
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const [lastExecTime, setLastExecTime] = useState<number | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddFileDropdown, setShowAddFileDropdown] = useState(false);
  const [addFileMenuPos, setAddFileMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [cdnMenuPos, setCdnMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  const [editorWidth, setEditorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_editor_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= 20 && parsed <= 90) return parsed;
      }
    } catch (_) {}
    return 50;
  }); // percentage
  const [editorHeight, setEditorHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_editor_height');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= 20 && parsed <= 90) return parsed;
      }
    } catch (_) {}
    return 60;
  }); // percentage
  const [replInput, setReplInput] = useState('');
  const [replHistory, setReplHistory] = useState<string[]>([]);
  const [replHistoryIndex, setReplHistoryIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'console' | 'terminal' | 'preview'>('console');
  const showHtmlPreview = activeOutputTab === 'preview';
  const setShowHtmlPreview = useCallback((val: boolean) => {
    setActiveOutputTab(val ? 'preview' : 'console');
  }, []);
  const showHtmlPreviewRef = useRef(false);
  useEffect(() => { showHtmlPreviewRef.current = showHtmlPreview; }, [showHtmlPreview]);
  const [terminalOutput, setTerminalOutput] = useState<{
    text: string;
    type: 'stdout' | 'stderr' | 'system';
  }[]>([]);
  const [showCdnDropdown, setShowCdnDropdown] = useState(false);
  const [htmlSrcDoc, setHtmlSrcDoc] = useState('');

  const [tabSize, setTabSize] = useState<2 | 4>(2);
  const [shouldAutoRun, setShouldAutoRun] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const clearEditorMarkers = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) {
      monacoRef.current.editor.setModelMarkers(model, 'compiler', []);
    }
  }, []);

  const updateEditorMarkers = useCallback((diagnostics: CompilerDiagnostic[]) => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const monaco = monacoRef.current;
    const markers = diagnostics.map(d => ({
      startLineNumber: d.line,
      startColumn: d.column,
      endLineNumber: d.line,
      endColumn: d.column + 5,
      message: d.message,
      severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
    }));

    monaco.editor.setModelMarkers(model, 'compiler', markers);
  }, []);

  const [isSplitOutputView, setIsSplitOutputView] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_split_output');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_auto_run');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  const [activeCdns, setActiveCdns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_active_cdns');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const toggleSplitOutputView = () => {
    setIsSplitOutputView(prev => {
      const newVal = !prev;
      try { localStorage.setItem('vidyal_sandbox_split_output', String(newVal)); } catch (_) {}
      return newVal;
    });
  };

  const toggleAutoRun = () => {
    setIsAutoRunEnabled(prev => {
      const newVal = !prev;
      try { localStorage.setItem('vidyal_sandbox_auto_run', String(newVal)); } catch (_) {}
      return newVal;
    });
  };

  const toggleCdn = (cdnId: string) => {
    setActiveCdns(prev => {
      const next = prev.includes(cdnId) ? prev.filter(c => c !== cdnId) : [...prev, cdnId];
      try { localStorage.setItem('vidyal_sandbox_active_cdns', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const handleJumpToLine = useCallback((fileName: string, line: number, column?: number) => {
    setActiveFileName(fileName);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: column || 1 });
        editorRef.current.focus();
      }
    }, 100);
  }, []);

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vidyal_sandbox_font_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 10 && parsed <= 20) return parsed;
      }
    } catch (_) {}
    return 12;
  });

  const updateFontSize = (newSize: number) => {
    const size = Math.max(10, Math.min(20, newSize));
    setFontSize(size);
    try {
      localStorage.setItem('vidyal_sandbox_font_size', String(size));
    } catch (_) {}
  };

  // Sync tab size with active file language, default 4 for Python, 2 otherwise
  useEffect(() => {
    const lang = activeFile.language.toLowerCase();
    if (lang === 'python' || lang === 'py') {
      setTabSize(4);
    } else {
      setTabSize(2);
    }
  }, [activeFile.language]);

  // Register global polyfills when active language changes
  useEffect(() => {
    registerGlobalPolyfills(activeFile.language);
  }, [activeFile.language]);

  const replPlaceholder = useMemo(() => {
    const lang = activeFile.language.toLowerCase();
    if (lang === 'python' || lang === 'py') return "Run quick Python... (e.g. len([1, 2, 3]) or print('hello'))";
    if (lang === 'go' || lang === 'golang') return "Run quick Go... (e.g. fmt.Println(42))";
    if (lang === 'rust' || lang === 'rs') return "Run quick Rust... (e.g. println!(\"Hello\"))";
    return "Run quick JavaScript... (e.g. Math.PI * 4)";
  }, [activeFile.language]);

  // Active file binding references declared above

  const updateActiveFileCode = (newCode: string) => {
    localStorage.setItem(`vidyal_sandbox_code_${activeFile.name}`, newCode);
    // Audit check: Only perform dynamic language detection if it is a paste or block drop event.
    // Typing single characters has a length difference of 1, which will not trigger this block,
    // avoiding disruptive, mid-typing language and panel reloads.
    const lengthDiff = Math.abs(newCode.length - activeFile.code.length);
    if (newCode.length > 15 && lengthDiff > 15) {
      const detected = detectLanguage(newCode);
      if (detected && detected !== activeFile.language) {
        let newName = activeFile.name;
        if (detected === 'python') newName = 'main.py';
        else if (detected === 'go') newName = 'main.go';
        else if (detected === 'rust') newName = 'main.rs';
        else if (detected === 'javascript') newName = 'index.js';
        else if (detected === 'css') newName = 'styles.css';
        else if (detected === 'html') newName = 'index.html';

        localStorage.setItem(`vidyal_sandbox_code_${newName}`, newCode);

        setFiles(prev => {
          const exists = prev.some(f => f.name === newName);
          if (exists) {
            return prev.map(f => f.name === newName ? { ...f, code: newCode } : f);
          }
          return prev.map(f => f.name === activeFileName ? { name: newName, code: newCode, language: detected } : f);
        });
        setActiveFileName(newName);
        toast.success("Cortex AI detected " + (detected === 'javascript' ? 'JavaScript' : detected === 'python' ? 'Python' : detected === 'html' ? 'HTML' : detected === 'css' ? 'CSS' : detected === 'go' ? 'Go' : 'Rust') + ". Workspace adapted dynamically!");
        return;
      }
    }
    setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, code: newCode } : f));
  };

  // ── Refs ──
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const entryIdCounter = useRef(0);
  const runButtonRef = useRef<HTMLButtonElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Shared HTML stitching helper for Live Preview ──
  const buildStitchedPreview = useCallback((currentFiles: SandboxFile[], htmlOverride?: string): string => {
    // 1. Revoke previous blob URLs to prevent memory leaks
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];

    // 2. Build Blob URLs and Import Map for JS/TS files
    const imports: Record<string, string> = {};
    const blobMap: Record<string, string> = {};

    currentFiles.forEach(file => {
      const isJs = file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.jsx') || file.name.endsWith('.tsx');
      if (isJs) {
        let code = file.code;
        if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
          try {
            code = transpileTypeScriptToJs(code);
          } catch (e) {
            console.warn("TypeScript transpilation failed for " + file.name, e);
          }
        }
        const guardedCode = injectLoopGuards(code);
        const blob = new Blob([guardedCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.push(blobUrl);

        // Map relative references
        imports[`./${file.name}`] = blobUrl;
        imports[`/${file.name}`] = blobUrl;
        
        // Map extension-less references
        const nameNoExt = file.name.replace(/\.[jt]sx?$/, '');
        imports[`./${nameNoExt}`] = blobUrl;
        imports[`/${nameNoExt}`] = blobUrl;

        blobMap[blobUrl] = file.name;
      }
    });

    // Make blob mapping globally accessible on window so that error stack translator can translate filenames
    (window as any).__cortex_blob_map__ = blobMap;

    const importMapScript = `
      <script type="importmap">
        {
          "imports": ${JSON.stringify(imports, null, 2)}
        }
      </script>
    `;

    const targetHtmlName = htmlOverride || previewHtmlFileName;
    const htmlFile = currentFiles.find(f => f.name === targetHtmlName)?.code || 
                     currentFiles.find(f => f.name === 'index.html')?.code || '';

    let stitchedDoc = htmlFile;

    // Build CDN script/link tags
    let cdnTags = '';
    if (activeCdns.includes('tailwind')) {
      cdnTags += '<script src="https://cdn.tailwindcss.com"></script>\n';
    }
    if (activeCdns.includes('lucide')) {
      cdnTags += '<script src="https://unpkg.com/lucide@latest"></script>\n';
    }
    if (activeCdns.includes('confetti')) {
      cdnTags += '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>\n';
    }
    if (activeCdns.includes('lodash')) {
      cdnTags += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n';
    }

    // Prepend CDNs inside head or at top
    if (cdnTags) {
      if (stitchedDoc.includes('</head>')) {
        stitchedDoc = stitchedDoc.replace('</head>', `${cdnTags}</head>`);
      } else {
        stitchedDoc = cdnTags + stitchedDoc;
      }
    }

    // Intercept CSS link tags in workspace
    currentFiles.forEach(file => {
      if (file.name.endsWith('.css')) {
        const styleTag = `<style>\n/* ${file.name} */\n${file.code}\n</style>`;
        const escapedName = file.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`<link[^>]*href=["'](?:\\.\\/)?${escapedName}["'][^>]*>`, 'gi');
        stitchedDoc = stitchedDoc.replace(regex, styleTag);
      }
    });

    // Default styles.css fallback if not linked
    const stylesCss = currentFiles.find(f => f.name === 'styles.css')?.code || '';
    if (stylesCss && !stitchedDoc.includes(stylesCss)) {
      const styleTag = `<style>\n${stylesCss}\n</style>`;
      if (stitchedDoc.includes('</head>')) {
        stitchedDoc = stitchedDoc.replace('</head>', `${styleTag}\n</head>`);
      } else {
        stitchedDoc = `${styleTag}\n${stitchedDoc}`;
      }
    }

    // Intercept script tags referencing workspace script files
    currentFiles.forEach(file => {
      if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.jsx') || file.name.endsWith('.tsx')) {
        const blobUrl = imports[`./${file.name}`];
        if (blobUrl) {
          const escapedName = file.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regexSrc = new RegExp(`src=["'](?:\\.\\/)?${escapedName}["']`, 'gi');
          stitchedDoc = stitchedDoc.replace(regexSrc, `src="${blobUrl}"`);
          // Force script tags of workspace script files to be loaded as type="module" to enable import maps
          const escapedBlobUrl = blobUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regexScriptTag = new RegExp(`(<script[^>]*)(?:type=["'][^"']*["'])?([^>]*src=["']${escapedBlobUrl}["'])`, 'gi');
          stitchedDoc = stitchedDoc.replace(regexScriptTag, `$1 type="module"$2`);
        }
      }
    });

    // Default module execution for index.js if not linked in HTML
    const hasLinkedIndexJs = stitchedDoc.includes('index.js') || (imports['./index.js'] && stitchedDoc.includes(imports['./index.js']));
    if (!hasLinkedIndexJs && imports['./index.js']) {
      const moduleLoader = `
        <script type="module">
          import("./index.js").catch(err => console.error(err));
        </script>
      `;
      if (stitchedDoc.includes('</body>')) {
        stitchedDoc = stitchedDoc.replace('</body>', `${moduleLoader}\n</body>`);
      } else {
        stitchedDoc = `${stitchedDoc}\n${moduleLoader}`;
      }
    }

    // Prepend console intercept script (normal script block) and Import Map script block to the document head
    const interceptScriptBlock = `
      \n${consoleInterceptScript}\n
      ${importMapScript}\n
    `;
    if (stitchedDoc.includes('<head>')) {
      stitchedDoc = stitchedDoc.replace('<head>', `<head>\n${interceptScriptBlock}`);
    } else {
      stitchedDoc = `${interceptScriptBlock}\n${stitchedDoc}`;
    }

    return stitchedDoc;
  }, [activeCdns, previewHtmlFileName]);

  // ── Sync initial code ──
  const lastPropsRef = useRef({ code: initialCode, language: initialLanguage });
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only perform initialization on mount, or when parent props change explicitly
    const isNewSession = !hasInitialized.current;

    if (isNewSession) {
      hasInitialized.current = true;
      lastPropsRef.current = { code: initialCode, language: initialLanguage };

      if (initialSandboxState && initialSandboxState.files && Object.keys(initialSandboxState.files).length > 0) {
        const loadedFiles = Object.entries(initialSandboxState.files).map(([name, code]) => {
          const ext = name.split('.').pop() || '';
          const fileLang =
            ext === 'py' ? 'python' :
            ext === 'go' ? 'go' :
            ext === 'rs' ? 'rust' :
            ext === 'c' ? 'c' :
            ext === 'cpp' || ext === 'cc' || ext === 'cxx' ? 'cpp' :
            ext === 'java' ? 'java' :
            ext === 'js' ? 'javascript' :
            ext === 'css' ? 'css' : 'html';
          return { name, code, language: fileLang };
        });
        setFiles(loadedFiles);
        setActiveFileName(initialSandboxState.activeFile || loadedFiles[0]?.name || 'index.js');
        return;
      }

      const lang = initialLanguage?.toLowerCase();
      const isHtml = lang === 'html' || lang === 'xml';
      const isCss = lang === 'css';
      const isPython = lang === 'python' || lang === 'py';
      const isGo = lang === 'go' || lang === 'golang';
      const isRust = lang === 'rust' || lang === 'rs';
      const isC = lang === 'c';
      const isCpp = lang === 'cpp';
      const isJava = lang === 'java';

      let newFiles: SandboxFile[] = [];
      let newActiveFile = 'index.js';

      if (isPython) {
        newFiles = [
          {
            name: 'main.py',
            code: initialCode || '# Write Python here\n',
            language: 'python'
          }
        ];
        newActiveFile = 'main.py';
      } else if (isC) {
        newFiles = [
          {
            name: 'main.c',
            code: initialCode || '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
            language: 'c'
          }
        ];
        newActiveFile = 'main.c';
      } else if (isCpp) {
        newFiles = [
          {
            name: 'main.cpp',
            code: initialCode || '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
            language: 'cpp'
          }
        ];
        newActiveFile = 'main.cpp';
      } else if (isJava) {
        newFiles = [
          {
            name: 'Main.java',
            code: initialCode || 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
            language: 'java'
          }
        ];
        newActiveFile = 'Main.java';
      } else if (isGo) {
        newFiles = [
          {
            name: 'main.go',
            code: initialCode || '// Write Go here\n',
            language: 'go'
          }
        ];
        newActiveFile = 'main.go';
      } else if (isRust) {
        newFiles = [
          {
            name: 'main.rs',
            code: initialCode || '// Write Rust here\n',
            language: 'rust'
          }
        ];
        newActiveFile = 'main.rs';
      } else {
        newFiles = [
          {
            name: 'index.js',
            code: isHtml || isCss ? '// Write JavaScript here\nconsole.log("JavaScript running");\n' : (initialCode || ''),
            language: 'javascript'
          },
          {
            name: 'styles.css',
            code: isCss ? (initialCode || '') : '/* Write CSS here */\nbody {\n  font-family: sans-serif;\n  padding: 20px;\n  background: #0f172a;\n  color: white;\n}',
            language: 'css'
          },
          {
            name: 'index.html',
            code: isHtml ? (initialCode || '') : `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
  <style>
    body {
      background: #05070a;
      color: #cbd5e1;
      padding: 20px;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <div id="output"></div>
  <script src="index.js"></script>
</body>
</html>`,
            language: 'html'
          }
        ];
        newActiveFile = isCss ? 'styles.css' : (isHtml ? 'index.html' : 'index.js');
      }

      // Check manifest of file names for this language to support custom scratch files
      const langKey = initialLanguage?.toLowerCase() || 'python';
      const manifestKey = `vidyal_sandbox_manifest_${langKey}`;
      const savedManifestStr = localStorage.getItem(manifestKey);
      let manifest: string[] = [];
      if (savedManifestStr) {
        try {
          manifest = JSON.parse(savedManifestStr);
        } catch (e) {
          manifest = [];
        }
      }

      // Merge defaults and manifest, keeping order
      const defaultNames = newFiles.map(f => f.name);
      const allNames = Array.from(new Set([...defaultNames, ...manifest]));

      const restoredFiles = allNames.map(name => {
        const defaultFile = newFiles.find(f => f.name === name);
        const savedCode = localStorage.getItem(`vidyal_sandbox_code_${name}`);

        if (defaultFile) {
          return {
            ...defaultFile,
            code: forceInitialCode && name === newActiveFile ? defaultFile.code : (savedCode || defaultFile.code)
          };
        } else {
          const ext = name.split('.').pop() || '';
          const fileLang =
            ext === 'py' ? 'python' :
            ext === 'go' ? 'go' :
            ext === 'rs' ? 'rust' :
            ext === 'c' ? 'c' :
            ext === 'cpp' || ext === 'cc' || ext === 'cxx' ? 'cpp' :
            ext === 'java' ? 'java' :
            ext === 'js' ? 'javascript' :
            ext === 'css' ? 'css' : 'html';
          return {
            name,
            code: savedCode || '# Write your scratch code here\n',
            language: fileLang
          };
        }
      });

      setFiles(restoredFiles);

      const savedActive = localStorage.getItem(`vidyal_sandbox_active_${langKey}`);
      const validActive = restoredFiles.some(f => f.name === savedActive) ? savedActive : newActiveFile;
      setActiveFileName(forceInitialCode ? newActiveFile : (validActive || newActiveFile));
    } else {
      // Subsequent prop changes represent whiteboard snippet click -> append dynamic snippet instead of resetting files list
      if (initialCode && (initialCode !== lastPropsRef.current.code || initialLanguage !== lastPropsRef.current.language)) {
        lastPropsRef.current = { code: initialCode, language: initialLanguage };

        // Check if we already have this snippet code in any file to avoid redundant file creation
        const existing = files.find(f => f.code.trim() === initialCode.trim());
        if (existing) {
          setActiveFileName(existing.name);
          return;
        }

        const currentLang = initialLanguage?.toLowerCase() || 'python';
        const ext =
          currentLang === 'python' ? 'py' :
          currentLang === 'go' ? 'go' :
          currentLang === 'rust' ? 'rs' :
          currentLang === 'c' ? 'c' :
          currentLang === 'cpp' ? 'cpp' :
          currentLang === 'java' ? 'java' :
          currentLang === 'javascript' ? 'js' :
          currentLang === 'css' ? 'css' : 'html';

        let num = 1;
        while (files.some(f => f.name === `snippet_${num}.${ext}`)) {
          num++;
        }
        const newFileName = `snippet_${num}.${ext}`;
        const newFile: SandboxFile = {
          name: newFileName,
          code: initialCode,
          language: currentLang
        };

        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        setActiveFileName(newFileName);

        const langKey = initialLanguage?.toLowerCase() || 'python';
        localStorage.setItem(`vidyal_sandbox_manifest_${langKey}`, JSON.stringify(updatedFiles.map(f => f.name)));
        localStorage.setItem(`vidyal_sandbox_active_${langKey}`, newFileName);

        toast.info(`Added whiteboard snippet as new file: ${newFileName}`);
      }
    }
  }, [initialCode, initialLanguage, forceInitialCode, files]);

  const addNewScratchFile = (forcedLanguage?: string) => {
    const currentLang = forcedLanguage || activeFile?.language || 'python';
    const ext =
      currentLang === 'python' ? 'py' :
      currentLang === 'go' ? 'go' :
      currentLang === 'rust' ? 'rs' :
      currentLang === 'c' ? 'c' :
      currentLang === 'cpp' ? 'cpp' :
      currentLang === 'java' ? 'java' :
      currentLang === 'typescript' ? 'ts' :
      currentLang === 'javascript' ? 'js' :
      currentLang === 'css' ? 'css' : 'html';

    let num = 1;
    while (files.some(f => f.name === `scratch_${num}.${ext}`)) {
      num++;
    }
    const newFileName = `scratch_${num}.${ext}`;
    const newFile: SandboxFile = {
      name: newFileName,
      code: currentLang === 'python'
        ? '# Write your Python tests here\n'
        : currentLang === 'go'
          ? '// Write your Go tests here\n'
          : currentLang === 'rust'
            ? '// Write your Rust tests here\n'
            : currentLang === 'c'
              ? '// Write your C tests here\n'
              : currentLang === 'cpp'
                ? '// Write your C++ tests here\n'
                : currentLang === 'java'
                  ? '// Write your Java tests here\n'
                  : currentLang === 'typescript'
                    ? '// Write your TypeScript tests here\n'
                    : currentLang === 'javascript'
                      ? '// Write your JavaScript tests here\n'
                      : currentLang === 'css'
                        ? '/* Write your CSS styles here */\n'
                        : '<!-- Write your HTML content here -->\n',
      language: currentLang
    };

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setActiveFileName(newFileName);

    const langKey = initialLanguage?.toLowerCase() || 'python';
    localStorage.setItem(`vidyal_sandbox_code_${newFileName}`, newFile.code);
    localStorage.setItem(`vidyal_sandbox_manifest_${langKey}`, JSON.stringify(updatedFiles.map(f => f.name)));
    localStorage.setItem(`vidyal_sandbox_active_${langKey}`, newFileName);

    toast.success(`Created scratch file ${newFileName}!`);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 80);
  };

  const deleteScratchFile = (fileNameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isCore = fileNameToDelete === 'main.py' ||
                   fileNameToDelete === 'main.go' ||
                   fileNameToDelete === 'main.rs' ||
                   fileNameToDelete === 'index.js' ||
                   fileNameToDelete === 'styles.css' ||
                   fileNameToDelete === 'index.html';

    if (isCore) {
      toast.error("Core workspace files cannot be deleted.");
      return;
    }

    const updatedFiles = files.filter(f => f.name !== fileNameToDelete);
    setFiles(updatedFiles);

    const langKey = initialLanguage?.toLowerCase() || 'python';

    if (activeFileName === fileNameToDelete) {
      const remainingNames = updatedFiles.map(f => f.name);
      const nextActive = remainingNames[0] || 'index.js';
      setActiveFileName(nextActive);
      localStorage.setItem(`vidyal_sandbox_active_${langKey}`, nextActive);
    }

    localStorage.removeItem(`vidyal_sandbox_code_${fileNameToDelete}`);
    localStorage.setItem(`vidyal_sandbox_manifest_${langKey}`, JSON.stringify(updatedFiles.map(f => f.name)));

    toast.info(`Removed scratch file ${fileNameToDelete}`);
  };

  // ── Listen for SARA Code Injections ──
  useEffect(() => {
    const handleInject = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string; language: string }>;
      const { code: newCode } = customEvent.detail;

      updateActiveFileCode(newCode);
      toast.success("SARA's code successfully injected into active file!");

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 80);
    };
    window.addEventListener('vidyal_inject_code', handleInject);
    return () => window.removeEventListener('vidyal_inject_code', handleInject);
  }, [activeFileName, updateActiveFileCode]);



  // ── Helpers ──
  const makeId = useCallback(() => {
    entryIdCounter.current += 1;
    return `entry-${entryIdCounter.current}`;
  }, []);

  // ── Listen for iframe logs ──
  const latestRef = useRef({
    files,
    previewHtmlFileName,
    buildStitchedPreview,
    runCount,
    makeId
  });

  useEffect(() => {
    latestRef.current = {
      files,
      previewHtmlFileName,
      buildStitchedPreview,
      runCount,
      makeId
    };
  });

  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      // Security: only accept logs from our sandbox iframe
      if (e.source !== iframeRef.current?.contentWindow) {
        return;
      }
      // Only process iframe console messages when preview is actively shown
      // This prevents stale iframe errors from polluting the console when running JS natively
      if (!showHtmlPreviewRef.current) {
        return;
      }

      const { files: currentFiles, buildStitchedPreview: currentStitch, makeId: currentMakeId, runCount: currentRunCount } = latestRef.current;

      if (e.data && e.data.type === 'cortex-sandbox-console') {
        const { logType, args } = e.data;
        const blobMap = (window as any).__cortex_blob_map__ || {};
        const cleanArgs = args.map((arg: any) => {
          if (typeof arg === 'string') {
            let cleaned = arg;
            Object.entries(blobMap).forEach(([blobUrl, fileName]) => {
              cleaned = cleaned.replaceAll(blobUrl, fileName as string);
            });
            return cleaned;
          }
          return arg;
        });

        setConsoleEntries(prev => {
          const entry = {
            id: currentMakeId(),
            type: logType as ConsoleEntry['type'],
            args: cleanArgs,
            timestamp: 0,
            runIndex: currentRunCount,
          };
          const combined = [...prev, entry];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });
      }

      if (e.data && e.data.type === 'cortex-sandbox-link-click') {
        const { href } = e.data;
        const cleanHref = href.replace(/^\/+/, '').trim();
        const cleanHrefLower = cleanHref.toLowerCase();

        // Check if any file matches this route
        const matchingFile = currentFiles.find(f => {
          const nameLower = f.name.toLowerCase();
          return nameLower === cleanHrefLower ||
                 nameLower === `${cleanHrefLower}.html` ||
                 nameLower === `${cleanHrefLower}.js` ||
                 nameLower.replace(/\.\w+$/, '') === cleanHrefLower;
        });

        if (matchingFile) {
          // If matching file is found, navigate to it in editor and load in preview!
          setActiveFileName(matchingFile.name);
          if (matchingFile.language === 'html' || matchingFile.name.endsWith('.html')) {
            setPreviewHtmlFileName(matchingFile.name);
            const freshDoc = currentStitch(currentFiles, matchingFile.name);
            setHtmlSrcDoc(freshDoc);
            toast.success(`Navigated to page: "${matchingFile.name}"`);
          } else {
            toast.success(`Opened code file: "${matchingFile.name}"`);
          }
        } else {
          // Fallback warning toast
          toast.info(`Simulated route: "${href}"`, {
            description: "Relative link navigation intercepted to prevent blank sandbox screens.",
            duration: 4500
          });
        }
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // ── Auto-scroll console ──
  useEffect(() => {
    if (!isUserScrolledUp && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleEntries, isUserScrolledUp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explainActiveCode = () => {
    if (!onAskSara) return;
    const prompt = `Please review my ${language || 'code'} in the Cortex Sandbox and explain how it works under the hood. Keep your response extremely brief:
1. Provide exactly 2 bullet points explaining the core execution logic.
2. Provide exactly 1 bullet point highlighting any efficiency bottlenecks or best practices.
Do not include any greeting, preface, or conversational filler. Start directly with the explanation.

\`\`\`${language || ''}
${code || ''}
\`\`\``;
    onAskSara(prompt);
  };

  const getActiveLineNumber = (text: string, selectionStart: number): number => {
    return text.substring(0, selectionStart).split('\n').length;
  };

  const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const linesBefore = textBeforeCursor.split('\n');
    setCursorPos({
      line: linesBefore.length,
      column: linesBefore[linesBefore.length - 1].length + 1
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollLeft = target.scrollLeft;
    requestAnimationFrame(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
      if (lineGutterRef.current) {
        lineGutterRef.current.scrollTop = scrollTop;
      }
    });
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setActiveLine(getActiveLineNumber(target.value, target.selectionStart));
    updateCursorPosition(target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const start = e.currentTarget.selectionStart;
    const end = e.currentTarget.selectionEnd;
    const val = e.currentTarget.value;

    // Smart auto-close skip
    const closingChars = [')', '}', ']', '"', "'", '`'];
    if (closingChars.includes(e.key) && start === end && val[start] === e.key) {
      e.preventDefault();
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, ' '.repeat(tabSize));
      return;
    }

    // Auto-close pairs
    const pairs: Record<string, string> = {
      '(': ')',
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    if (pairs[e.key] !== undefined) {
      e.preventDefault();
      const closeChar = pairs[e.key];
      document.execCommand('insertText', false, e.key + closeChar);
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
      return;
    }

    // Smart Indent on Enter
    if (e.key === 'Enter') {
      if (start > 0 && val[start - 1] === '{') {
        e.preventDefault();
        const indentStr = '\n' + ' '.repeat(tabSize) + '\n';
        document.execCommand('insertText', false, indentStr);
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1 + tabSize;
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runCode();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }

    // ⌘+L to clear console
    if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      clearConsole();
    }
  };

  // ── Clear console ──
  const clearConsole = () => {
    setConsoleEntries([{
      id: makeId(),
      type: 'system',
      args: ['Console cleared'],
      timestamp: 0,
      runIndex: runCount,
    }]);
  };

  // ── Console scroll detection ──
  const handleConsoleScroll = () => {
    if (!consoleRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsUserScrolledUp(!isAtBottom);
  };

  const scrollConsoleToBottom = () => {
    if (consoleRef.current) {
      consoleRef.current.scrollTo({ top: consoleRef.current.scrollHeight, behavior: 'smooth' });
      setIsUserScrolledUp(false);
    }
  };

  // ══════════════════════════════════════════════════════
  // CODE EXECUTION — Native for JS, iframe for HTML
  // ══════════════════════════════════════════════════════

  const runCode = useCallback(() => {
    clearEditorMarkers();
    setTerminalOutput([]);
    const currentRun = runCount + 1;
    setRunCount(currentRun);
    setExecutionState('executing');

    const startTime = performance.now();

    // Register global polyfills for execution context
    registerGlobalPolyfills(activeFile.language);

    // Add separator
    const separator: ConsoleEntry = {
      id: makeId(),
      type: 'separator',
      args: [],
      timestamp: 0,
      runIndex: currentRun,
    };

    setTimeout(async () => {
      // Check if running a non-web file (Python, Go, Rust, C, C++, Java)
      const activeFileObj = files.find(f => f.name === activeFileName) || files[0];
      const lang = activeFileObj?.language?.toLowerCase();
      const isCompiledBackend = lang === 'python' || lang === 'c' || lang === 'cpp' || lang === 'java' || lang === 'go' || lang === 'rust';
      const isGo = false;
      const isRust = false;

      if (isCompiledBackend) {
        setShowHtmlPreview(false);

        const runLang = 
          lang === 'python' ? 'python' : 
          lang === 'cpp' ? 'cpp' : 
          lang === 'java' ? 'java' : 
          lang === 'go' ? 'go' : 
          lang === 'rust' ? 'rust' : 
          'c';

        api.runCompiledCode(runLang, activeFileObj.code)
          .then((result) => {
            const execTime = Math.round(performance.now() - startTime);
            setLastExecTime(execTime);

            if (result.success) {
              const tempOutput: { text: string; type: 'stdout' | 'stderr' | 'system' }[] = [];
              if (result.stdout) {
                tempOutput.push({ text: result.stdout, type: 'stdout' });
              }
              if (result.stderr) {
                tempOutput.push({ text: result.stderr, type: 'stderr' });
              }
              if (result.testsTotal && result.testsTotal > 0) {
                tempOutput.push({ text: `Tests Passed: ${result.testsPassed}/${result.testsTotal}`, type: 'system' });
              }
              tempOutput.push({ text: `\nProcess finished with exit code 0 (execution time: ${execTime}ms)`, type: 'system' });
              setTerminalOutput(tempOutput);
              setActiveOutputTab('terminal');
              setExecutionState('success');
              if (onExecutionOutput) {
                onExecutionOutput({ stdout: result.stdout || '', stderr: result.stderr || '', success: true, sourceMsgId: sourceMsgId });
              }
            } else {
              const errorMsg = result.errorMessage || result.stderr || 'Execution failed';
              const diagnostics = parseCompilerErrors(errorMsg);
              updateEditorMarkers(diagnostics);

              const tempOutput: { text: string; type: 'stdout' | 'stderr' | 'system' }[] = [];
              if (result.stdout) {
                tempOutput.push({ text: result.stdout, type: 'stdout' });
              }
              tempOutput.push({ text: errorMsg, type: 'stderr' });
              tempOutput.push({ text: `\nProcess exited with compilation/runtime errors (execution time: ${execTime}ms)`, type: 'system' });
              setTerminalOutput(tempOutput);
              setActiveOutputTab('terminal');
              if (onExecutionOutput) {
                onExecutionOutput({ stdout: result.stdout || '', stderr: errorMsg, success: false, sourceMsgId: sourceMsgId });
              }

              const event = new CustomEvent('sara-compiler-error', {
                detail: {
                  error: errorMsg,
                  code: activeFileObj?.code || '',
                  language: lang || 'javascript'
                }
              });
              window.dispatchEvent(event);
              setExecutionState('error');
            }
            setTimeout(scrollConsoleToBottom, 80);
            setTimeout(() => setExecutionState('idle'), 1500);
          })
          .catch((err) => {
            const execTime = Math.round(performance.now() - startTime);
            setLastExecTime(execTime);
            const errMsg = err instanceof Error ? err.message : String(err);
            
            setTerminalOutput([
              { text: errMsg, type: 'stderr' },
              { text: `\nProcess failed to execute (execution time: ${execTime}ms)`, type: 'system' }
            ]);
            setActiveOutputTab('terminal');

            const event = new CustomEvent('sara-compiler-error', {
              detail: {
                error: errMsg,
                code: activeFileObj?.code || '',
                language: lang || 'javascript'
              }
            });
            window.dispatchEvent(event);

            setTimeout(scrollConsoleToBottom, 80);
            setExecutionState('error');
            setTimeout(() => setExecutionState('idle'), 1500);
          });

        return;
      }

      if (isGo || isRust) {
        setShowHtmlPreview(false);

        const makeEntry = (type: ConsoleEntry['type'], args: unknown[]): ConsoleEntry => ({
          id: makeId(),
          type,
          args,
          timestamp: Math.round(performance.now() - startTime),
          runIndex: currentRun,
        });

        // Initialize with separator immediately
        setConsoleEntries(prev => {
          const combined = [...prev, separator];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });

        const addEntry = (type: ConsoleEntry['type'], args: unknown[]) => {
          setConsoleEntries(prev => {
            const combined = [...prev, makeEntry(type, args)];
            return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
          });
          setTimeout(scrollConsoleToBottom, 10);
        };

        const fakeConsole = {
          log: (...args: unknown[]) => addEntry('log', args),
          error: (...args: unknown[]) => addEntry('error', args),
          warn: (...args: unknown[]) => addEntry('warn', args),
          info: (...args: unknown[]) => addEntry('info', args),
          dir: (...args: unknown[]) => addEntry('log', args),
          table: (...args: unknown[]) => addEntry('log', args),
          clear: () => { /* no-op in sandbox */ },
          count: () => { /* stub */ },
          countReset: () => { /* stub */ },
          time: () => { /* stub */ },
          timeEnd: () => { /* stub */ },
          timeLog: () => { /* stub */ },
          group: () => { /* stub */ },
          groupCollapsed: () => { /* stub */ },
          groupEnd: () => { /* stub */ },
          assert: (condition: unknown, ...args: unknown[]) => {
            if (!condition) addEntry('error', ['Assertion failed:', ...args]);
          },
          trace: (...args: unknown[]) => addEntry('log', ['Trace:', ...args]),
        };

        // Inline polyfills for Go/Rust so they use the fakeConsole via `console` shadowing
        const inlineGoHelpers = `
          var fmt = {
            Println: function() { var a = Array.from(arguments); console.log.apply(console, a.map(function(x) { return typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x); })); },
            Print: function() { var a = Array.from(arguments); console.log.apply(console, a.map(function(x) { return typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x); })); },
            Printf: function(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/%[vdsft]/, String(a[i])); console.log(r); },
            Sprintf: function(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/%[vdsft]/, String(a[i])); return r; },
            Errorf: function(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/%[vdsft]/, String(a[i])); return new Error(r); }
          };
          function pyIterable(x) { if (x == null) return []; if (typeof x[Symbol.iterator] === 'function') return x; if (typeof x === 'object') return Object.keys(x); return []; }
          function goRange(x) { if (Array.isArray(x)) return x.map(function(v,i){return[i,v]}); if (typeof x === 'string') return Array.from(x).map(function(v,i){return[i,v]}); if (typeof x === 'object' && x !== null) return Object.entries(x); return []; }
          function len(x) { if (x == null) return 0; if (typeof x.length === 'number') return x.length; if (x instanceof Set || x instanceof Map) return x.size; if (typeof x === 'object') return Object.keys(x).length; return 0; }
          function append(s) { if (!Array.isArray(s)) return s; var a = Array.from(arguments).slice(1); return s.concat(a); }
        `;

        const inlineRustHelpers = `
          function rustPrintln(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/\\{\\}/, typeof a[i] === 'object' && a[i] !== null ? JSON.stringify(a[i]) : String(a[i])); console.log(r); }
          function rustPrint(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/\\{\\}/, typeof a[i] === 'object' && a[i] !== null ? JSON.stringify(a[i]) : String(a[i])); console.log(r); }
          function rustEprintln(f) { var a = Array.from(arguments).slice(1); var r = String(f); for (var i = 0; i < a.length; i++) r = r.replace(/\\{\\}/, String(a[i])); console.error(r); }
          var Vec = { new: function() { return []; }, from: function(a) { return Array.from(a); } };
          var HashMap = { new: function() { return {}; } };
          function len(x) { if (x == null) return 0; if (typeof x.length === 'number') return x.length; if (x instanceof Set || x instanceof Map) return x.size; if (typeof x === 'object') return Object.keys(x).length; return 0; }
        `;

        try {
          const transpiledCode = transpileToJs(activeFileObj.code, activeFileObj.language);
          const guardedCode = injectLoopGuards(transpiledCode);
          const inlineHelpers = isGo ? inlineGoHelpers : inlineRustHelpers;
          const wrappedCode = `
            const console = arguments[0];
            ${inlineHelpers}
            ${guardedCode}
          `;
          const fn = new Function(wrappedCode);
          const result = fn(fakeConsole);

          if (result !== undefined) {
            addEntry('return', [result]);
          }

          const execTime = Math.round(performance.now() - startTime);
          setLastExecTime(execTime);
          setTimeout(scrollConsoleToBottom, 80);
          setExecutionState('success');
          setTimeout(() => setExecutionState('idle'), 1500);
          if (onExecutionOutput) {
            onExecutionOutput({ stdout: 'Executed via WebAssembly fallback', stderr: '', success: true, sourceMsgId: sourceMsgId });
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          addEntry('error', [errorMessage]);

          const event = new CustomEvent('sara-compiler-error', {
            detail: {
              error: errorMessage,
              code: activeFileObj.code || '',
              language: lang || 'go'
            }
          });
          window.dispatchEvent(event);

          const execTime = Math.round(performance.now() - startTime);
          setLastExecTime(execTime);
          setTimeout(scrollConsoleToBottom, 80);
          setExecutionState('error');
          setTimeout(() => setExecutionState('idle'), 1500);
          if (onExecutionOutput) {
            onExecutionOutput({ stdout: '', stderr: 'Script execution timed out', success: false, sourceMsgId: sourceMsgId });
          }
        }
        return;
      }

      // Web languages execution path (HTML/CSS preview or JS/TS native execution)
      if (activeFileName === 'index.html' || activeFileName === 'styles.css') {
        // Show HTML Live Preview — build stitched preview
        const stitchedDoc = buildStitchedPreview(files);
        setHtmlSrcDoc(stitchedDoc);
        // Show HTML Live Preview and auto-switch active tab
        setShowHtmlPreview(true);
        setActiveOutputTab('preview');
        setConsoleEntries(prev => {
          const systemEntry: ConsoleEntry = {
            id: makeId(),
            type: 'system',
            args: ['HTML & CSS rendered in live preview pane'],
            timestamp: Math.round(performance.now() - startTime),
            runIndex: currentRun,
          };
          const combined = [...prev, separator, systemEntry];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });
        setTimeout(scrollConsoleToBottom, 80);
        setExecutionState('success');
        setLastExecTime(Math.round(performance.now() - startTime));
        setTimeout(() => setExecutionState('idle'), 1500);
        return;
      }

      // JavaScript/TypeScript: native execution with intercepted console
      setShowHtmlPreview(false);
      setActiveOutputTab('console');

      const makeEntry = (type: ConsoleEntry['type'], args: unknown[]): ConsoleEntry => ({
        id: makeId(),
        type,
        args,
        timestamp: Math.round(performance.now() - startTime),
        runIndex: currentRun,
      });
      
      // Initialize with separator immediately
      setConsoleEntries(prev => {
        const combined = [...prev, separator];
        return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
      });

      const addEntry = (type: ConsoleEntry['type'], args: unknown[]) => {
        setConsoleEntries(prev => {
          const combined = [...prev, makeEntry(type, args)];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });
        setTimeout(scrollConsoleToBottom, 10);
      };

      const fakeConsole = {
        log: (...args: unknown[]) => addEntry('log', args),
        error: (...args: unknown[]) => addEntry('error', args),
        warn: (...args: unknown[]) => addEntry('warn', args),
        info: (...args: unknown[]) => addEntry('info', args),
        dir: (...args: unknown[]) => addEntry('log', args),
        table: (...args: unknown[]) => addEntry('log', args),
        clear: () => { /* no-op in sandbox */ },
        count: () => { /* stub */ },
        countReset: () => { /* stub */ },
        time: () => { /* stub */ },
        timeEnd: () => { /* stub */ },
        timeLog: () => { /* stub */ },
        group: () => { /* stub */ },
        groupCollapsed: () => { /* stub */ },
        groupEnd: () => { /* stub */ },
        assert: (condition: unknown, ...args: unknown[]) => {
          if (!condition) addEntry('error', ['Assertion failed:', ...args]);
        },
        trace: (...args: unknown[]) => addEntry('log', ['Trace:', ...args]),
      };

      try {
        // Use the active file's code, not hardcoded index.js
        let codeToRun = activeFileObj.code;

        // Transpile TypeScript if needed
        const activeLang = activeFileObj.language?.toLowerCase();
        if (activeLang === 'typescript' || activeLang === 'ts' || activeFileName.endsWith('.ts')) {
          const { transpileTypeScriptToJs } = await import('../../utils/typescriptTranspiler');
          codeToRun = transpileTypeScriptToJs(codeToRun);
        }

        const guardedJs = injectLoopGuards(codeToRun);
        const wrappedCode = `
          "use strict";
          const console = arguments[0];
          ${guardedJs}
        `;
        const fn = new Function(wrappedCode);
        const result = fn(fakeConsole);

        if (result !== undefined) {
          addEntry('return', [result]);
        }

        const execTime = Math.round(performance.now() - startTime);
        setLastExecTime(execTime);
        setTimeout(scrollConsoleToBottom, 80);
        setExecutionState('success');
        setTimeout(() => setExecutionState('idle'), 1500);
        if (onExecutionOutput) {
          onExecutionOutput({ stdout: 'Interactive preview loaded in split pane', stderr: '', success: true, sourceMsgId: sourceMsgId });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addEntry('error', [errorMessage]);

        const event = new CustomEvent('sara-compiler-error', {
          detail: {
            error: errorMessage,
            code: activeFileObj.code || '',
            language: activeFileObj.language || 'javascript'
          }
        });
        window.dispatchEvent(event);

        const execTime = Math.round(performance.now() - startTime);
        setLastExecTime(execTime);
        setTimeout(scrollConsoleToBottom, 80);
        setExecutionState('error');
        setTimeout(() => setExecutionState('idle'), 1500);
        if (onExecutionOutput) {
          onExecutionOutput({ stdout: '', stderr: 'Frame preview initialization failed', success: false, sourceMsgId: sourceMsgId });
        }
      }
    }, 60);
  }, [files, activeFileName, runCount, makeId]);

  const runCodeRef = useRef<() => void>(() => {});
  useEffect(() => {
    runCodeRef.current = runCode;
  }, [runCode]);

  // ── Listen to whiteboard run triggers to auto-run code ──
  useEffect(() => {
    if (runTrigger && runTrigger > 0) {
      setShouldAutoRun(true);
    }
  }, [runTrigger]);

  // ── Auto-run code when files and activeFile are ready ──
  useEffect(() => {
    if (shouldAutoRun && activeFile) {
      const activeFileObj = files.find(f => f.name === activeFileName);
      if (activeFileObj) {
        const codeMatches = activeFileObj.code.trim() === initialCode.trim();
        const isSnippetFile = activeFileObj.name.startsWith('snippet_') ||
                              activeFileObj.name === 'main.py' ||
                              activeFileObj.name === 'main.go' ||
                              activeFileObj.name === 'main.rs';
        const isWebDefault = activeFileObj.name === 'index.js' ||
                             activeFileObj.name === 'styles.css' ||
                             activeFileObj.name === 'index.html';

        if (codeMatches || isSnippetFile || isWebDefault) {
          setShouldAutoRun(false);
          runCode();
        }
      }
    }
  }, [files, activeFileName, activeFile, shouldAutoRun, initialCode, runCode]);


  const handleReplSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = replInput.trim();
    if (!query) return;

    setReplInput('');
    setReplHistory(prev => [...prev, query]);
    setReplHistoryIndex(-1);

    const queryEntry: ConsoleEntry = {
      id: makeId(),
      type: 'info',
      args: ['>', query],
      timestamp: 0,
      runIndex: runCount,
    };

    setConsoleEntries(prev => [...prev, queryEntry]);

    if (showHtmlPreview && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'cortex-eval', query }, '*');
      setTimeout(() => {
        if (consoleRef.current) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      }, 50);
      return;
    }

    // Ensure active language polyfills are globally registered
    registerGlobalPolyfills(activeFile.language);

    const startTime = performance.now();
    const makeEntry = (type: ConsoleEntry['type'], args: unknown[]): ConsoleEntry => ({
      id: makeId(),
      type,
      args,
      timestamp: Math.round(performance.now() - startTime),
      runIndex: runCount,
    });

    const fakeConsole = {
      log: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('log', args)]);
      },
      error: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('error', args)]);
      },
      warn: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('warn', args)]);
      },
      info: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('info', args)]);
      },
      dir: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('log', args)]);
      },
      table: (...args: unknown[]) => {
        setConsoleEntries(prev => [...prev, makeEntry('log', args)]);
      },
      clear: () => { /* no-op in sandbox */ },
    };

    try {
      const transpiledQuery = transpileToJs(query, activeFile.language);
      const guardedQuery = injectLoopGuards(transpiledQuery);

      const wrapped = `
        const console = arguments[0];
        try {
          return eval(${JSON.stringify(guardedQuery)});
        } catch (e) {
          return (new Function("console", "return (" + ${JSON.stringify(guardedQuery)} + ")"))(console);
        }
      `;
      const fn = new Function(wrapped);
      const res = fn(fakeConsole);

      if (res !== undefined) {
        const resultEntry = makeEntry('return', [res]);
        setConsoleEntries(prev => [...prev, resultEntry]);
      }
    } catch (err: any) {
      const errorEntry = makeEntry('error', [err instanceof Error ? err.message : String(err)]);
      setConsoleEntries(prev => [...prev, errorEntry]);
    }

    setTimeout(() => {
      if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleReplKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (replHistory.length === 0) return;
      const nextIndex = replHistoryIndex === -1 ? replHistory.length - 1 : Math.max(0, replHistoryIndex - 1);
      setReplHistoryIndex(nextIndex);
      setReplInput(replHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (replHistoryIndex === -1) return;
      const nextIndex = replHistoryIndex + 1;
      if (nextIndex >= replHistory.length) {
        setReplHistoryIndex(-1);
        setReplInput('');
      } else {
        setReplHistoryIndex(nextIndex);
        setReplInput(replHistory[nextIndex]);
      }
    }
  };

  // ══════════════════════════════════════════════════════
  // RESIZABLE PANEL DRAG
  // ══════════════════════════════════════════════════════

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    if (isFullscreen) {
      const startX = e.clientX;
      const startWidth = editorWidth;
      const containerWidth = containerRect.width;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const deltaPercent = (delta / containerWidth) * 100;
        const newWidth = Math.min(85, Math.max(25, startWidth + deltaPercent));
        setEditorWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        setEditorWidth(currentWidth => {
          try {
            localStorage.setItem('vidyal_sandbox_editor_width', String(currentWidth));
          } catch (_) {}
          return currentWidth;
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      const startY = e.clientY;
      const startHeight = editorHeight;
      const containerHeight = containerRect.height;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startY;
        const deltaPercent = (delta / containerHeight) * 100;
        const newHeight = Math.min(85, Math.max(25, startHeight + deltaPercent));
        setEditorHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        setEditorHeight(currentHeight => {
          try {
            localStorage.setItem('vidyal_sandbox_editor_height', String(currentHeight));
          } catch (_) {}
          return currentHeight;
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [editorHeight, editorWidth, isFullscreen]);

  // ══════════════════════════════════════════════════════
  // SYNTAX HIGHLIGHTER
  // ══════════════════════════════════════════════════════

  const highlightCode = (src: string, lang: string): string => {
    if (!src) return '';
    let html = src
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (lang === 'html' || lang === 'xml') {
      return html
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-slate-500 italic">$1</span>')
        .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="text-[#f472b6] font-bold">$2</span>')
        .replace(/(\s)([\w:-]+)(=)/g, '$1<span class="text-[#38bdf8]">$2</span>$3')
        .replace(/(=&quot;[\s\S]*?&quot;)/g, '<span class="text-[#4ade80]">$1</span>')
        .replace(/(=&#x27;[\s\S]*?&#x27;)/g, '<span class="text-[#4ade80]">$1</span>');
    }

    if (lang === 'css') {
      return html
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 italic">$1</span>')
        .replace(/([.#][\w-]+)/g, '<span class="text-[#f472b6] font-bold">$1</span>')
        .replace(/(:[\w-]+)/g, '<span class="text-[#38bdf8]">$1</span>')
        .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-[#fbbf24]">$1</span>')
        .replace(/(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms))/g, '<span class="text-[#fbbf24]">$1</span>');
    }

    const tokenRegex = new RegExp(
      [
        '(//.*|/\\*[\\s\\S]*?\\*/|#.*)',
        '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)',
        '\\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|export|import|from|default|new|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|yield|true|false|null|undefined|void|delete|with|super|implements|interface|type|enum|abstract|static|public|private|protected|readonly|declare|module|namespace|require|as|def|elif|except|raise|lambda|None|True|False|and|or|not|is|int|double|float|char|include|define|struct|final|package|throws)\\b',
        '\\b(\\d+(?:\\.\\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\\b',
        '\\b(console|log|error|warn|info|window|document|Math|JSON|Object|Array|String|Number|Boolean|Promise|Map|Set|Error|setTimeout|setInterval|clearTimeout|clearInterval|parseInt|parseFloat|isNaN|Infinity|NaN|RegExp|Date|Symbol|Proxy|Reflect|WeakMap|WeakSet|globalThis|print|System|out|println)\\b',
        '(=>)',
        '(\\(|\\)|\\{|\\}|\\[|\\])',
      ].join('|'),
      'g'
    );

    return html.replace(tokenRegex, (match, comment, str, keyword, num, builtin, arrow, bracket) => {
      if (comment) return `<span class="text-slate-500/70 italic">${comment}</span>`;
      if (str) return `<span class="text-emerald-400">${str}</span>`;
      if (keyword) return `<span class="text-violet-400 font-semibold">${keyword}</span>`;
      if (num) return `<span class="text-amber-300">${num}</span>`;
      if (builtin) return `<span class="text-sky-400">${builtin}</span>`;
      if (arrow) return `<span class="text-violet-400 font-bold">${arrow}</span>`;
      if (bracket) return `<span class="text-slate-400/70">${bracket}</span>`;
      return match;
    });
  };

  // ══════════════════════════════════════════════════════
  // MEMOIZED VALUES
  // ══════════════════════════════════════════════════════

  const highlightedHtml = useMemo(() => highlightCode(code, language), [code, language]);
  const lines = useMemo(() => Array.from({ length: code.split('\n').length }), [code]);

  const langConfig = useMemo(() => {
    const lang = language?.toLowerCase();
    if (lang === 'html' || lang === 'xml') return { label: 'HTML', icon: <Globe size={10} />, cssClass: 'cortex-lang-html', ext: 'html' };
    if (lang === 'css') return { label: 'CSS', icon: <FileCode2 size={10} />, cssClass: 'cortex-lang-css', ext: 'css' };
    if (lang === 'python' || lang === 'py') return { label: 'Python', icon: <Terminal size={10} />, cssClass: 'cortex-lang-python', ext: 'py' };
    if (lang === 'c') return { label: 'C', icon: <Terminal size={10} />, cssClass: 'cortex-lang-c', ext: 'c' };
    if (lang === 'cpp') return { label: 'C++', icon: <Terminal size={10} />, cssClass: 'cortex-lang-cpp', ext: 'cpp' };
    if (lang === 'java') return { label: 'Java', icon: <Terminal size={10} />, cssClass: 'cortex-lang-java', ext: 'java' };
    if (lang === 'go' || lang === 'golang') return { label: 'Go', icon: <Terminal size={10} />, cssClass: 'cortex-lang-go', ext: 'go' };
    if (lang === 'rust' || lang === 'rs') return { label: 'Rust', icon: <Terminal size={10} />, cssClass: 'cortex-lang-rust', ext: 'rs' };
    return { label: 'JS', icon: <Zap size={10} />, cssClass: 'cortex-lang-js', ext: 'js' };
  }, [language]);

  const statusConfig = useMemo(() => {
    switch (executionState) {
      case 'idle': return { label: 'Ready', color: 'text-slate-500', dotColor: 'bg-slate-500' };
      case 'executing': return { label: 'Executing...', color: 'text-indigo-400', dotColor: 'bg-indigo-400 animate-pulse' };
      case 'success': return { label: 'Success', color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
      case 'error': return { label: 'Error', color: 'text-red-400', dotColor: 'bg-red-400' };
    }
  }, [executionState]);

  const activeFileObjForRender = files.find(f => f.name === activeFileName) || files[0];
  const activeFileLangForRender = activeFileObjForRender?.language?.toLowerCase();
  const isCompiledBackend = activeFileLangForRender === 'python' || activeFileLangForRender === 'c' || activeFileLangForRender === 'cpp' || activeFileLangForRender === 'java' || activeFileLangForRender === 'go' || activeFileLangForRender === 'rust';

  const sandboxElement = (
    <div
      className={`relative flex flex-col h-full overflow-hidden border-l shadow-2xl transition-all duration-500 ease-in-out ${
        isZenMode
          ? 'border-white/10 bg-[#07080c]'
          : 'border-slate-200/80 bg-[#0c0e14] ring-1 ring-black/5'
      } ${
        isFullscreen
          ? (saraOpen
              ? 'fixed top-0 bottom-0 left-0 right-[580px] xl:right-[620px] z-[9999]'
              : 'fixed inset-0 w-screen h-screen z-[9999]')
          : ''
      }`}
    >
      {/* ── CINEMATIC HEADER ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 select-none ${
        isZenMode ? 'border-white/5 bg-[#07080b]' : 'border-white/10 bg-[#0f1117]'
      }`}>
        <div className="flex items-center gap-3">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5 cortex-dots-idle">
            {hideCloseButton ? (
              <div className="w-[10px] h-[10px] rounded-full cortex-dot-red opacity-60" />
            ) : (
              <button
                onClick={onClose}
                className="w-[10px] h-[10px] rounded-full cortex-dot-red cursor-pointer hover:brightness-125 transition-all border-none bg-[#ef4444]"
                title="Close"
              />
            )}
            <div className="w-[10px] h-[10px] rounded-full cortex-dot-yellow bg-[#f59e0b] opacity-60" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-[10px] h-[10px] rounded-full cortex-dot-green cursor-pointer hover:brightness-125 transition-all border-none bg-[#10b981]"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
            />
          </div>

          <div className="w-px h-4 shrink-0 bg-white/5" />

          {/* Title + Status */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-[#4e5bff]/10 text-indigo-400">
              <Code size={12} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-white/90">
                Cortex Playground
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} transition-colors`} />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${statusConfig.color} transition-colors`}>
                  {statusConfig.label}
                </span>
                {lastExecTime !== null && executionState !== 'executing' && (
                  <span className="text-[8px] font-mono font-medium ml-1 text-slate-600">
                    {lastExecTime}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Action buttons moved from file-tab bar to prevent tab squishing */}
          <div className="flex items-center gap-1.5 mr-2">
            {onAskSara && (
              <button
                onClick={explainActiveCode}
                className="flex items-center gap-1 active:scale-95 transition-all text-[9.5px] uppercase font-black tracking-wider cursor-pointer py-1 px-2.5 rounded-lg border text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 border-indigo-500/15 hover:bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.06)]"
                title="Explain code structure with SARA"
              >
                Explain
              </button>
            )}

            {isFullscreen && onToggleSara && (
              <button
                onClick={onToggleSara}
                className={`flex items-center gap-1 active:scale-95 transition-all text-[9.5px] uppercase font-black tracking-wider cursor-pointer py-1 px-2.5 rounded-lg border transition-colors ${
                  saraOpen
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold shadow-[0_0_8px_rgba(99,102,241,0.08)]'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-white'
                }`}
                title={saraOpen ? "Hide SARA Assistant" : "Show SARA Assistant"}
              >
                <span>SARA</span>
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 active:scale-95 transition-all text-[9.5px] uppercase font-bold tracking-wider cursor-pointer py-1 px-2.5 rounded-lg border text-slate-400 hover:text-white bg-transparent border-white/5 hover:bg-white/5"
              title="Copy code to clipboard"
            >
              {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy'}
            </button>


            <button
              onClick={runCode}
              disabled={executionState === 'executing'}
              className={`flex items-center gap-1.5 active:scale-95 transition-all text-[10px] uppercase font-mono font-black tracking-wider cursor-pointer py-1.5 px-3.5 rounded-lg border text-white shadow-md transition-all ${
                executionState === 'executing'
                  ? 'bg-indigo-600/90 border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                  : executionState === 'success'
                    ? 'bg-emerald-600 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : executionState === 'error'
                      ? 'bg-red-600 border-red-400/40 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                      : 'bg-gradient-to-r from-[#4e5bff] to-[#6366f1] hover:from-[#434fe6] hover:to-[#5558e6] border-indigo-400/30 shadow-[0_2px_12px_rgba(78,91,255,0.35)] hover:shadow-[0_4px_16px_rgba(78,91,255,0.5)]'
              }`}
              title="Compile and run (⌘+Enter)"
            >
              {executionState === 'executing' ? (
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : executionState === 'success' ? (
                <CheckCircle2 size={12} className="text-white" />
              ) : executionState === 'error' ? (
                <AlertTriangle size={12} className="text-white" />
              ) : (
                <Play size={11} fill="currentColor" />
              )}
              <span>{executionState === 'executing' ? 'Running…' : executionState === 'success' ? 'Success' : executionState === 'error' ? 'Failed' : 'Run ⌘↵'}</span>
            </button>
          </div>

          {/* Run counter */}
          {runCount > 0 && (
            <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-md border text-slate-400 bg-white/5 border-white/10 mr-1 select-none">
              #{runCount}
            </span>
          )}

          {/* Expand Workbench Button */}
          {onOpenWorkbench && (
            <button
              onClick={() => onOpenWorkbench(code, language, activeFileName)}
              className="flex items-center gap-1.5 active:scale-95 transition-all text-[9.5px] uppercase font-mono font-bold tracking-wider cursor-pointer py-1 px-2.5 rounded-lg border text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25"
              title="Expand into side-by-side Split Workbench"
            >
              <Columns size={11} className="text-indigo-400" />
              <span>Expand Workbench</span>
            </button>
          )}

          {/* Full Stretch (Fullscreen) Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg transition-all cursor-pointer border border-white/5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {/* Exit (Close) Button */}
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all cursor-pointer border border-white/5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-[#ef4444] flex items-center justify-center"
              title="Close Playground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── EDITOR + CONSOLE SPLIT ── */}
      <div
        ref={containerRef}
        className={`flex-1 flex min-h-0 ${isFullscreen ? 'flex-row' : 'flex-col'} ${isDragging ? 'select-none' : ''}`}
      >

        {/* ═══ TOP/LEFT: EDITOR PANEL ═══ */}
        <div
          className="flex-1 flex flex-col bg-[#0a0b0d] relative min-w-0 min-h-0"
        >

          {/* File tab bar */}
          <div className="flex items-center justify-between px-3 border-b shrink-0 z-10 select-none h-9 overflow-hidden relative bg-[#121317] border-white/5">
            {/* Scrollable file tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-8 py-1 custom-scrollbar">
              {files.map((f) => {
                const isActive = f.name === activeFileName;
                const isJs = f.language === 'javascript';
                const isCss = f.language === 'css';
                const isPython = f.language === 'python';
                const isGo = f.language === 'go';
                const isRust = f.language === 'rust';
                const isC = f.language === 'c';
                const isCpp = f.language === 'cpp';
                const isJava = f.language === 'java';

                const tabColor = isJs
                  ? 'bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.5)]'
                  : isCss
                    ? 'bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.5)]'
                    : isPython
                      ? 'bg-blue-400 shadow-[0_0_4px_rgba(56,189,248,0.5)]'
                      : isGo
                        ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                        : isRust
                          ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                          : isC
                            ? 'bg-slate-400 shadow-[0_0_4px_rgba(148,163,184,0.5)]'
                            : isCpp
                              ? 'bg-sky-500 shadow-[0_0_4px_rgba(14,165,233,0.5)]'
                              : isJava
                                ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.5)]'
                                : 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.5)]';

                const isCore = f.name === 'main.py' ||
                               f.name === 'main.go' ||
                               f.name === 'main.rs' ||
                               f.name === 'main.c' ||
                               f.name === 'main.cpp' ||
                               f.name === 'Main.java' ||
                               f.name === 'index.js' ||
                               f.name === 'styles.css' ||
                               f.name === 'index.html';

                return (
                  <div key={f.name} className="relative flex items-center group/tab z-10 flex-shrink-0">
                    <button
                      onClick={() => {
                        setActiveFileName(f.name);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                          }
                        }, 55);
                      }}
                      className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-mono transition-all duration-200 cursor-pointer whitespace-nowrap border border-transparent ${
                        isActive
                          ? 'text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.015]'
                      } ${!isCore ? 'pr-7 animate-in fade-in zoom-in-95 duration-250' : 'pr-3'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSandboxTab"
                          className="absolute inset-0 rounded-md -z-10 border bg-[#0a0b0d] border-white/5 shadow-[0_-1px_3px_rgba(0,0,0,0.15)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <div className={`w-1.5 h-1.5 rounded-full ${tabColor}`} />
                      <span className="relative z-20">{f.name}</span>
                    </button>

                    {!isCore && (
                      <button
                        onClick={(e) => deleteScratchFile(f.name, e)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all z-30 cursor-pointer border-none bg-transparent text-slate-500 hover:text-red-400 hover:bg-white/5"
                        title="Delete Scratch File"
                      >
                        <X size={8} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add New Scratch File Button with Language Selector */}
              <div className="relative flex items-center z-30">
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setAddFileMenuPos({ top: rect.bottom, left: rect.left });
                    setShowAddFileDropdown(!showAddFileDropdown);
                  }}
                  className={`p-1 rounded-md border flex items-center justify-center cursor-pointer transition-all flex-shrink-0 relative ${
                    showAddFileDropdown
                      ? 'border-indigo-500 bg-indigo-500/10 text-white animate-pulse'
                      : 'border-white/10 hover:bg-white/[0.02] text-slate-500 hover:text-white'
                  }`}
                  title="Create Scratch File"
                >
                  <Plus size={11} />
                </button>

                {showAddFileDropdown && addFileMenuPos && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[10000] cursor-default bg-transparent"
                      onClick={() => setShowAddFileDropdown(false)}
                    />
                    <div 
                      className="fixed w-44 rounded-lg border border-white/5 bg-[#0b0c10] p-2 shadow-2xl z-[10001] animate-in fade-in slide-in-from-top-1 duration-150"
                      style={{ top: addFileMenuPos.top + 6, left: addFileMenuPos.left }}
                    >
                      <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-white/5 mb-1 select-none">
                        Create Scratch File
                      </div>
                      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                        {[
                          { id: 'javascript', label: 'JavaScript (.js)' },
                          { id: 'typescript', label: 'TypeScript (.ts)' },
                          { id: 'python', label: 'Python (.py)' },
                          { id: 'html', label: 'HTML (.html)' },
                          { id: 'css', label: 'CSS (.css)' },
                          { id: 'go', label: 'Go (.go)' },
                          { id: 'rust', label: 'Rust (.rs)' },
                          { id: 'c', label: 'C (.c)' },
                          { id: 'cpp', label: 'C++ (.cpp)' },
                          { id: 'java', label: 'Java (.java)' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              addNewScratchFile(item.id);
                              setShowAddFileDropdown(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-md cursor-pointer transition-colors border-none text-[10px] bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.02] flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>

              {/* CDN Package Autoloader (Libraries) Dropdown */}
              <div className="relative flex items-center z-25">
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCdnMenuPos({ top: rect.bottom, left: rect.left });
                    setShowCdnDropdown(!showCdnDropdown);
                  }}
                  className={`p-1 rounded-md border flex items-center justify-center cursor-pointer transition-all flex-shrink-0 relative ${
                    showCdnDropdown || activeCdns.length > 0
                      ? 'border-indigo-500/35 bg-indigo-500/5 text-indigo-400'
                      : 'border-white/10 hover:bg-white/[0.02] text-slate-500 hover:text-white'
                  }`}
                  title="Import CDN Libraries (Tailwind, Lucide, Confetti, Lodash)"
                >
                  <Library size={11} />
                  {activeCdns.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                  )}
                </button>

                {showCdnDropdown && cdnMenuPos && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[10000] cursor-default bg-transparent"
                      onClick={() => setShowCdnDropdown(false)}
                    />
                    <div 
                      className="fixed w-44 rounded-lg border border-white/5 bg-[#0b0c10] p-2 shadow-2xl z-[10001] animate-in fade-in slide-in-from-top-1 duration-150"
                      style={{ top: cdnMenuPos.top + 6, left: cdnMenuPos.left }}
                    >
                      <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-white/5 mb-1 select-none">
                        CDN Libraries
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {[
                          { id: 'tailwind', label: 'Tailwind CSS', desc: 'Utility styles' },
                          { id: 'lucide', label: 'Lucide Icons', desc: 'Vector icons' },
                          { id: 'confetti', label: 'Canvas Confetti', desc: 'Effects' },
                          { id: 'lodash', label: 'Lodash', desc: 'Utility helpers' },
                        ].map((pkg) => {
                          const isActive = activeCdns.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => toggleCdn(pkg.id)}
                              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-md cursor-pointer transition-colors border-none text-[10px] ${
                                isActive
                                  ? 'bg-indigo-500/10 text-white font-bold'
                                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span>{pkg.label}</span>
                                <span className="text-[7.5px] text-slate-500 font-normal leading-none mt-0.5">{pkg.desc}</span>
                              </div>
                              {isActive && <CheckCircle2 size={10} className="text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>
          </div>

          {/* Progress loader line directly below tab bar */}
          {executionState === 'executing' && (
            <div className="h-[2px] w-full bg-white/5 relative z-30 overflow-hidden shrink-0">
              <motion.div
                initial={{ left: '0%', width: '0%' }}
                animate={{ left: ['0%', '20%', '100%'], width: ['0%', '40%', '0%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 h-[2px] bg-gradient-to-r from-indigo-500 via-pink-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              />
            </div>
          )}

          {/* Code Editor Container */}
          <div className="flex-1 relative flex min-h-0 overflow-hidden bg-[#0a0b0d]">
            <Editor
              height="100%"
              language={activeFile.language}
              theme="vs-dark"
              value={code}
              onChange={(val) => updateActiveFileCode(val || '')}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                editor.onDidChangeCursorPosition((e: any) => {
                  setCursorPos({
                    line: e.position.lineNumber,
                    column: e.position.column,
                  });
                });
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  runCodeRef.current();
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: fontSize,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                tabSize: tabSize,
                automaticLayout: true,
                wordWrap: 'on',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: 20,
                folding: true,
              }}
            />

          </div>
        </div>

        {/* ═══ STANDARAD DIVIDER ═══ */}
        <div
          className={`shrink-0 z-20 border-none ${
            isFullscreen
              ? `w-[1px] h-full ${isZenMode ? 'bg-white/5' : 'bg-slate-200'}`
              : `h-[1px] w-full ${isZenMode ? 'bg-white/5' : 'bg-slate-200'}`
          }`}
        />

        {/* ═══ BOTTOM/RIGHT: CONSOLE OUTPUT PANEL ═══ */}
        <div
          className={`flex-1 flex flex-col relative overflow-hidden min-w-0 min-h-0 ${executionState === 'error' ? 'cortex-error-shake' : ''} bg-[#0a0b0d]`}
        >
          {/* Console header */}
          <div className="flex items-center justify-between border-b select-none bg-[#121317] border-white/5 h-9 shrink-0 relative px-3">
            <div className="flex items-center gap-1.5 h-full">
              <button
                onClick={() => {
                  if (isSplitOutputView) toggleSplitOutputView();
                  setActiveOutputTab('console');
                }}
                className={`relative flex items-center gap-1.5 px-3 h-full text-[9.5px] font-mono transition-all duration-200 cursor-pointer border-none bg-transparent ${
                  activeOutputTab === 'console' && !isSplitOutputView
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal size={11} />
                <span>Console</span>
                {consoleEntries.filter(e => e.type !== 'separator' && e.type !== 'system').length > 0 && (
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ml-1 bg-white/5 text-slate-400">
                    {consoleEntries.filter(e => e.type !== 'separator' && e.type !== 'system').length}
                  </span>
                )}
                {activeOutputTab === 'console' && !isSplitOutputView && (
                  <motion.div
                    layoutId="activeConsoleTab"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => {
                  if (isSplitOutputView) toggleSplitOutputView();
                  setActiveOutputTab('terminal');
                }}
                className={`relative flex items-center gap-1.5 px-3 h-full text-[9.5px] font-mono transition-all duration-200 cursor-pointer border-none bg-transparent ${
                  activeOutputTab === 'terminal' && !isSplitOutputView
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SquareTerminal size={11} />
                <span>Terminal</span>
                {activeOutputTab === 'terminal' && !isSplitOutputView && (
                  <motion.div
                    layoutId="activeConsoleTab"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => {
                  if (isSplitOutputView) toggleSplitOutputView();
                  setActiveOutputTab('preview');
                  const freshDoc = buildStitchedPreview(files);
                  setHtmlSrcDoc(freshDoc);
                }}
                className={`relative flex items-center gap-1.5 px-3 h-full text-[9.5px] font-mono transition-all duration-200 cursor-pointer border-none bg-transparent ${
                  activeOutputTab === 'preview' && !isSplitOutputView
                    ? 'text-pink-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe size={11} />
                <span>Live Preview</span>
                {activeOutputTab === 'preview' && !isSplitOutputView && (
                  <motion.div
                    layoutId="activeConsoleTab"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-pink-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSplitOutputView}
                className={`p-1 rounded transition-all cursor-pointer border ${
                  isSplitOutputView
                    ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400 font-bold shadow-[0_0_8px_rgba(99,102,241,0.08)]'
                    : 'border-white/5 bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-350'
                }`}
                title="Split screen: show Console and Preview side-by-side"
              >
                <Columns size={11} />
              </button>

              <span className="text-[7.5px] font-bold uppercase tracking-wider font-mono text-slate-655 select-none mr-0.5">
                ⌘L clear
              </span>
              <button
                onClick={clearConsole}
                className="p-1 rounded transition-all cursor-pointer border-none bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-350"
                title="Clear Console (⌘+L)"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {/* Console & Live Preview body */}
          {isSplitOutputView ? (
            <div className={`flex-1 flex min-h-0 relative ${isFullscreen ? 'flex-row' : 'flex-col md:flex-row'} divide-y md:divide-y-0 md:divide-x divide-white/5`}>
              {/* Left Column: Console */}
              <div
                ref={consoleRef}
                onScroll={handleConsoleScroll}
                className="flex-1 flex flex-col min-h-0 overflow-y-auto cortex-console-scroll relative"
              >
                <div className="flex flex-col py-1.5 px-1">
                  {consoleEntries.length === 0 ? (
                    <BootText text="Cortex Console v2 — Ready" />
                  ) : (
                    <AnimatePresence initial={false}>
                      {consoleEntries.map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <ConsoleLogItem
                            entry={entry}
                            onAskSara={onAskSara}
                            onJumpToLine={handleJumpToLine}
                            codeContext={code}
                            language={language}
                            isZenMode={isZenMode}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Scroll to bottom FAB */}
                {isUserScrolledUp && (
                  <button
                    onClick={scrollConsoleToBottom}
                    className={`cortex-scroll-fab fixed bottom-4 left-1/4 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-wider cursor-pointer transition-all shadow-lg border ${
                      isZenMode
                        ? 'bg-[#0c0e14]/90 border-white/10 text-slate-300 hover:bg-[#0c0e14] hover:border-indigo-500/30'
                        : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-650/45'
                    }`}
                  >
                    <ArrowDown size={10} />
                    New output
                  </button>
                )}
              </div>

              {/* Right Column: HTML Live Preview or Terminal depending on file type */}
              {isCompiledBackend ? (
                <div className="flex-1 flex flex-col min-h-0 bg-[#05070a] p-4 text-slate-100 font-mono text-[11px] leading-relaxed relative border-l border-white/5 overflow-y-auto">
                  {terminalOutput.length === 0 ? (
                    <div className="text-slate-500 italic select-none">No terminal output yet. Run the program to see output.</div>
                  ) : (
                    <div className="space-y-1 whitespace-pre-wrap selection:bg-indigo-500/30">
                      {terminalOutput.map((item, idx) => {
                        let colorClass = 'text-slate-200';
                        if (item.type === 'stderr') {
                          colorClass = 'text-red-400 font-semibold';
                        } else if (item.type === 'system') {
                          colorClass = 'text-slate-500 border-t border-white/5 pt-2 mt-2 font-semibold text-[10px] uppercase tracking-wider';
                        }
                        return (
                          <div key={idx} className={colorClass}>
                            {renderStringWithJumpBadges(item.text, handleJumpToLine)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] relative overflow-hidden select-none border-l border-white/5">
                  {/* Mock Browser Address Bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f111a] border-b border-white/[0.04] shrink-0">
                    {/* Browser window controls */}
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                    </div>
                    {/* Navigation controls */}
                    <div className="flex items-center gap-1 ml-1 text-slate-500">
                      <ChevronLeft size={10} className="opacity-50" />
                      <ChevronRight size={10} className="opacity-50" />
                      <RotateCw size={8} className="cursor-pointer hover:text-white transition-colors" onClick={() => {
                        if (iframeRef.current) {
                          iframeRef.current.srcdoc = buildStitchedPreview(files);
                        }
                      }} />
                    </div>
                    {/* Address Box */}
                    <div className="flex-1 flex items-center bg-[#07080c] border border-white/[0.05] rounded py-0.5 px-2 text-[8px] font-mono text-slate-400 select-all mx-1.5 truncate max-w-[200px]">
                      <Globe size={8} className="text-slate-600 mr-1 shrink-0" />
                      <span className="truncate">cortex-sandbox.local/index.html</span>
                    </div>
                  </div>

                  {/* Actual Frame */}
                  <div className="flex-1 min-h-0 bg-white relative">
                    <iframe
                      ref={iframeRef}
                      srcDoc={htmlSrcDoc}
                      title="cortex-html-preview"
                      sandbox="allow-scripts"
                      className="w-full h-full border-none bg-white"
                    />

                    {executionState === 'executing' && (
                      <div className="absolute inset-0 pointer-events-none z-30 bg-black/10 overflow-hidden flex flex-col justify-between">
                        <motion.div
                          animate={{ y: ["-100%", "100%"] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                          className="w-full h-[3px] bg-indigo-500/35 filter blur-[0.5px]"
                        />
                        <div
                          className="absolute inset-0 opacity-15 pointer-events-none"
                          style={{
                            backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                            backgroundSize: '100% 4px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Console entries container */}
              <div
                ref={consoleRef}
                onScroll={handleConsoleScroll}
                className={`flex-1 min-h-0 overflow-y-auto cortex-console-scroll relative ${activeOutputTab !== 'console' ? 'hidden' : ''}`}
              >
                <div className="flex flex-col py-1.5 px-1">
                  {consoleEntries.length === 0 ? (
                    <BootText text="Cortex Console v2 — Ready" />
                  ) : (
                    <AnimatePresence initial={false}>
                      {consoleEntries.map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <ConsoleLogItem
                            entry={entry}
                            onAskSara={onAskSara}
                            onJumpToLine={handleJumpToLine}
                            codeContext={code}
                            language={language}
                            isZenMode={isZenMode}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Scroll to bottom FAB */}
                {isUserScrolledUp && (
                  <button
                    onClick={scrollConsoleToBottom}
                    className={`cortex-scroll-fab fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-wider cursor-pointer transition-all shadow-lg border ${
                      isZenMode
                        ? 'bg-[#0c0e14]/90 border-white/10 text-slate-300 hover:bg-[#0c0e14] hover:border-indigo-500/30'
                        : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-650/45'
                    }`}
                  >
                    <ArrowDown size={10} />
                    New output
                  </button>
                )}
              </div>

              {/* Terminal entries container */}
              <div
                className={`flex-1 min-h-0 overflow-y-auto p-4 bg-[#05070a] text-slate-100 font-mono text-[11px] leading-relaxed relative ${
                  activeOutputTab !== 'terminal' ? 'hidden' : ''
                }`}
              >
                {terminalOutput.length === 0 ? (
                  <div className="text-slate-500 italic select-none">No terminal output yet. Run the program to see output.</div>
                ) : (
                  <div className="space-y-1 whitespace-pre-wrap selection:bg-indigo-500/30">
                    {terminalOutput.map((item, idx) => {
                      let colorClass = 'text-slate-200';
                      if (item.type === 'stderr') {
                        colorClass = 'text-red-400 font-semibold';
                      } else if (item.type === 'system') {
                        colorClass = 'text-slate-500 border-t border-white/5 pt-2 mt-2 font-semibold text-[10px] uppercase tracking-wider';
                      }
                      return (
                        <div key={idx} className={colorClass}>
                          {renderStringWithJumpBadges(item.text, handleJumpToLine)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* HTML iframe preview container Mock Browser */}
              <div className={`flex-1 flex flex-col min-h-0 bg-[#0d0e12] relative overflow-hidden select-none border-t border-white/5 ${activeOutputTab !== 'preview' ? 'hidden' : ''}`}>
                {/* Mock Browser Address Bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f111a] border-b border-white/[0.04] shrink-0">
                  {/* Browser window controls */}
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                  </div>
                  {/* Navigation controls */}
                  <div className="flex items-center gap-1 ml-1 text-slate-500">
                    <ChevronLeft size={10} className="opacity-50" />
                    <ChevronRight size={10} className="opacity-50" />
                    <RotateCw size={8} className="cursor-pointer hover:text-white transition-colors" onClick={() => {
                      if (iframeRef.current) {
                        iframeRef.current.srcdoc = buildStitchedPreview(files);
                      }
                    }} />
                  </div>
                  {/* Address Box */}
                  <div className="flex-1 flex items-center bg-[#07080c] border border-white/[0.05] rounded py-0.5 px-2 text-[8px] font-mono text-slate-400 select-all mx-1.5 truncate max-w-[240px]">
                    <Globe size={8} className="text-slate-600 mr-1 shrink-0" />
                    <span className="truncate">cortex-sandbox.local/index.html</span>
                  </div>
                </div>

                {/* Actual Frame */}
                <div className="flex-1 min-h-0 bg-white relative">
                  <iframe
                    ref={iframeRef}
                    srcDoc={htmlSrcDoc}
                    title="cortex-html-preview"
                    sandbox="allow-scripts"
                    className="w-full h-full border-none bg-white"
                  />

                  {executionState === 'executing' && (
                    <div className="absolute inset-0 pointer-events-none z-30 bg-black/10 overflow-hidden flex flex-col justify-between">
                      <motion.div
                        animate={{ y: ["-100%", "100%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                        className="w-full h-[3px] bg-indigo-500/35 filter blur-[0.5px]"
                      />
                      <div
                        className="absolute inset-0 opacity-15 pointer-events-none"
                        style={{
                          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                          backgroundSize: '100% 4px'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {/* Glowing REPL input box pinned at bottom */}
          <form
            onSubmit={handleReplSubmit}
            className="shrink-0 flex items-center gap-2.5 px-3 py-2 border-t relative z-10 border-white/5 bg-[#08090d]"
          >
            <span className="text-[10px] font-black font-mono text-[#4e5bff] select-none">&gt;</span>
            <input
              type="text"
              value={replInput}
              onChange={e => setReplInput(e.target.value)}
              onKeyDown={handleReplKeyDown}
              placeholder={replPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-[11px] font-mono outline-none border-none text-[#cbd5e1] caret-indigo-400 placeholder-slate-650"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="repl-input-field"
              id="repl-input-field"
            />
            <span className="text-[7.5px] font-bold text-slate-600 border border-white/5 bg-[#0a0c10]/95 px-1.5 py-0.5 rounded-md font-mono select-none">
              ENTER
            </span>
          </form>
        </div>
      </div>
    </div>
  );

  return isFullscreen ? createPortal(sandboxElement, document.body) : sandboxElement;
};

export default CodeSandbox;
