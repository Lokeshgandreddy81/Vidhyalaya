import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Code, Terminal, Copy, CheckCircle2,
  ChevronRight, ChevronDown, AlertTriangle, Info,
  ArrowDown, Trash2, Zap, FileCode2, Globe, Sparkles, Plus
} from 'lucide-react';
import { toast } from 'sonner';
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
  onClose: () => void;
  isZenMode?: boolean;
  onAskSara?: (prompt: string) => void;
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

// ══════════════════════════════════════════════════════════════
// CONSOLE LOG ITEM — Single rendered console entry
// ══════════════════════════════════════════════════════════════

const ConsoleLogItem: React.FC<{
  entry: ConsoleEntry;
  onAskSara?: (prompt: string) => void;
  codeContext?: string;
  language?: string;
}> = ({ entry, onAskSara, codeContext, language }) => {
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
    log: 'border-l-indigo-500',
    info: 'border-l-blue-400',
    warn: 'border-l-amber-400',
    error: 'border-l-red-500',
    return: 'border-l-emerald-400',
  };

  const iconMap: Record<string, React.ReactNode> = {
    error: <AlertTriangle size={11} className="text-red-400 shrink-0 mt-0.5" />,
    warn: <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />,
    info: <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />,
    return: <ChevronRight size={11} className="text-emerald-400 shrink-0 mt-0.5" />,
  };

  const animClass = entry.type === 'error' ? 'cortex-log-error' : entry.type === 'warn' ? 'cortex-log-warn' : 'cortex-log-entry';

  const bgMap: Record<string, string> = {
    log: 'bg-transparent',
    info: 'bg-blue-500/[0.03]',
    warn: 'bg-amber-500/[0.03]',
    error: 'bg-red-500/[0.04]',
    return: 'bg-emerald-500/[0.03]',
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

  return (
    <div className={`${animClass} flex items-start gap-2.5 py-2 px-3 border-l-[3px] ${accentColorMap[entry.type] || 'border-l-indigo-500'} ${bgMap[entry.type] || ''} rounded-r-lg group`}>
      {iconMap[entry.type] && iconMap[entry.type]}
      <div className="flex-1 min-w-0 font-mono text-[11.5px] leading-relaxed">
        {entry.type === 'return' && <span className="text-emerald-500 text-[9px] font-black uppercase tracking-wider mr-2">← return</span>}
        {(() => {
          const firstArg = entry.args[0];
          if (typeof firstArg === 'string' && firstArg.includes('%c')) {
            const styleCount = (firstArg.match(/%c/g) || []).length;
            const styleArgs = entry.args.slice(1, 1 + styleCount);
            const remainingArgs = entry.args.slice(1 + styleCount);
            const styledNode = parseStyledLog(firstArg, styleArgs);
            return (
              <>
                <span className="text-slate-200">{styledNode}</span>
                {remainingArgs.map((arg, idx) => {
                  if (typeof arg === 'object' && arg !== null) {
                    return <React.Fragment key={idx}> <ObjectInspector data={arg} /></React.Fragment>;
                  }
                  const colorClass =
                    typeof arg === 'string' ? 'text-slate-200' :
                    typeof arg === 'number' ? 'cortex-obj-number' :
                    typeof arg === 'boolean' ? 'cortex-obj-boolean' :
                    arg === null ? 'cortex-obj-null' :
                    arg === undefined ? 'cortex-obj-undefined' :
                    'text-slate-300';
                  return <span key={idx} className={colorClass}> {String(arg)}</span>;
                })}
              </>
            );
          }
          return entry.args.map((arg, i) => {
            if (typeof arg === 'object' && arg !== null) {
              return <ObjectInspector key={i} data={arg} />;
            }
            const colorClass =
              typeof arg === 'string' ? 'text-slate-200' :
              typeof arg === 'number' ? 'cortex-obj-number' :
              typeof arg === 'boolean' ? 'cortex-obj-boolean' :
              arg === null ? 'cortex-obj-null' :
              arg === undefined ? 'cortex-obj-undefined' :
              'text-slate-300';
            return <span key={i} className={colorClass}>{i > 0 ? ' ' : ''}{String(arg)}</span>;
          });
        })()}
      </div>
      {entry.type === 'error' && onAskSara && (
        <button
          onClick={handleAutofix}
          className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-mono text-[9.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 border border-red-500/25 shadow-sm cursor-pointer z-10"
        >
          <Sparkles size={10} className="animate-pulse text-red-400" /> Autofix with SARA
        </button>
      )}
      <span className="text-[8px] font-mono font-medium text-slate-600 tabular-nums shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
    // Template literal
    if (jsCode[i] === '`') {
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
      if (i < len) {
        output += '`';
        i++;
      }
      continue;
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

      trimmedCode = trimmedCode.replace(/\bis\b/g, '===');
      trimmedCode = trimmedCode.replace(/\bis\s+not\b/g, '!==');

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

      // 7.2. List/string multiplication: [0] * 5 or 5 * [0]
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

    window.addEventListener('error', function(e) {
      sendLog('error', [e.message]);
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
  onClose,
  isZenMode = false,
  onAskSara,
}) => {
  // ── State ──
  const initialFiles = useMemo<SandboxFile[]>(() => {
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
  <h3 style="color: #4e5bff;">Cortex Workspace Sandbox</h3>
  <p>Piped elements active. Render output below:</p>
  <div id="output"></div>

  <script src="index.js"></script>
</body>
</html>`,
        language: 'html'
      }
    ];
  }, [initialCode, initialLanguage]);

  const [files, setFiles] = useState<SandboxFile[]>(initialFiles);
  const [activeFileName, setActiveFileName] = useState(() => {
    const lang = initialLanguage?.toLowerCase();
    if (lang === 'python' || lang === 'py') return 'main.py';
    if (lang === 'go' || lang === 'golang') return 'main.go';
    if (lang === 'rust' || lang === 'rs') return 'main.rs';
    return lang === 'css' ? 'styles.css' : (lang === 'html' || lang === 'xml' ? 'index.html' : 'index.js');
  });

  // Active file binding (moved up to avoid TDZ compile errors)
  const activeFile = useMemo(() => {
    return files.find(f => f.name === activeFileName) || files[0];
  }, [files, activeFileName]);

  const code = activeFile.code;
  const language = activeFile.language;

  const [copied, setCopied] = useState(false);
  const [activeLine, setActiveLine] = useState(1);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [runCount, setRunCount] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [lastExecTime, setLastExecTime] = useState<number | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
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
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [htmlSrcDoc, setHtmlSrcDoc] = useState('');

  const [tabSize, setTabSize] = useState<2 | 4>(2);
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

  // ── Sync initial code ──
  const lastPropsRef = useRef({ code: initialCode, language: initialLanguage });
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only perform initialization on mount, or when parent props change explicitly
    const isNewSession = !hasInitialized.current;

    if (isNewSession) {
      hasInitialized.current = true;
      lastPropsRef.current = { code: initialCode, language: initialLanguage };

      const lang = initialLanguage?.toLowerCase();
      const isHtml = lang === 'html' || lang === 'xml';
      const isCss = lang === 'css';
      const isPython = lang === 'python' || lang === 'py';
      const isGo = lang === 'go' || lang === 'golang';
      const isRust = lang === 'rust' || lang === 'rs';

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
  <h3 style="color: #4e5bff;">Cortex Workspace Sandbox</h3>
  <p>Piped elements active. Render output below:</p>
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
          const fileLang = ext === 'py' ? 'python' : ext === 'go' ? 'go' : ext === 'rs' ? 'rust' : ext === 'js' ? 'javascript' : ext === 'css' ? 'css' : 'html';
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
        const ext = currentLang === 'python' ? 'py' : currentLang === 'go' ? 'go' : currentLang === 'rust' ? 'rs' : currentLang === 'javascript' ? 'js' : currentLang === 'css' ? 'css' : 'html';

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

  const addNewScratchFile = () => {
    const currentLang = activeFile?.language || 'python';
    const ext = currentLang === 'python' ? 'py' : currentLang === 'go' ? 'go' : currentLang === 'rust' ? 'rs' : currentLang === 'javascript' ? 'js' : currentLang === 'css' ? 'css' : 'html';

    let num = 1;
    while (files.some(f => f.name === `scratch_${num}.${ext}`)) {
      num++;
    }
    const newFileName = `scratch_${num}.${ext}`;
    const newFile: SandboxFile = {
      name: newFileName,
      code: currentLang === 'python'
        ? '# Write your python tests here\n'
        : currentLang === 'go'
          ? '// Write your go tests here\n'
          : currentLang === 'rust'
            ? '// Write your rust tests here\n'
            : currentLang === 'javascript'
              ? '// Write your javascript tests here\n'
              : '// Write your tests here\n',
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
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      // Security audit verification: only accept logs originating from our active sandboxed preview iframe window
      if (e.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (e.data && e.data.type === 'cortex-sandbox-console') {
        const { logType, args } = e.data;
        setConsoleEntries(prev => [
          ...prev,
          {
            id: makeId(),
            type: logType,
            args: args,
            timestamp: 0,
            runIndex: runCount,
          }
        ]);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [runCount, makeId]);

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

    setTimeout(() => {
      // Check if running a non-web file (Python, Go, Rust)
      const activeFileObj = files.find(f => f.name === activeFileName) || files[0];
      const isPython = activeFileObj?.language === 'python';
      const isGo = activeFileObj?.language === 'go';
      const isRust = activeFileObj?.language === 'rust';

      if (isPython || isGo || isRust) {
        setShowHtmlPreview(false);
        const newEntries: ConsoleEntry[] = [separator];

        const makeEntry = (type: ConsoleEntry['type'], args: unknown[]): ConsoleEntry => ({
          id: makeId(),
          type,
          args,
          timestamp: Math.round(performance.now() - startTime),
          runIndex: currentRun,
        });

        const fakeConsole = {
          log: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
          error: (...args: unknown[]) => newEntries.push(makeEntry('error', args)),
          warn: (...args: unknown[]) => newEntries.push(makeEntry('warn', args)),
          info: (...args: unknown[]) => newEntries.push(makeEntry('info', args)),
          dir: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
          table: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
          clear: () => { /* no-op in sandbox */ },
        };

        try {
          const transpiledCode = transpileToJs(activeFileObj.code, activeFileObj.language);
          const guardedCode = injectLoopGuards(transpiledCode);
          const wrappedCode = `
            const console = arguments[0];
            ${guardedCode}
          `;
          const fn = new Function(wrappedCode);
          const result = fn(fakeConsole);

          if (result !== undefined) {
            newEntries.push(makeEntry('return', [result]));
          }

          const execTime = Math.round(performance.now() - startTime);
          setLastExecTime(execTime);
          setConsoleEntries(prev => {
            const combined = [...prev, ...newEntries];
            return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
          });
          setExecutionState('success');
          setTimeout(() => setExecutionState('idle'), 1500);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          newEntries.push(makeEntry('error', [errorMessage]));

          const execTime = Math.round(performance.now() - startTime);
          setLastExecTime(execTime);
          setConsoleEntries(prev => {
            const combined = [...prev, ...newEntries];
            return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
          });
          setExecutionState('error');
          setTimeout(() => setExecutionState('idle'), 1500);
        }
        return;
      }

      // Get active codes for web languages
      const jsFile = files.find(f => f.name === 'index.js')?.code || '';
      const cssFile = files.find(f => f.name === 'styles.css')?.code || '';
      const htmlFile = files.find(f => f.name === 'index.html')?.code || '';

      // Stitch files for preview
      let stitchedDoc = htmlFile;
      const styleTag = `<style>\n${cssFile}\n</style>`;
      if (stitchedDoc.includes('<link rel="stylesheet" href="styles.css">')) {
        stitchedDoc = stitchedDoc.replace('<link rel="stylesheet" href="styles.css">', styleTag);
      } else if (stitchedDoc.includes('</head>')) {
        stitchedDoc = stitchedDoc.replace('</head>', `${styleTag}\n</head>`);
      } else {
        stitchedDoc = `${styleTag}\n${stitchedDoc}`;
      }



      const guardedJs = injectLoopGuards(jsFile);
      const scriptTag = `${consoleInterceptScript}\n<script>\n${guardedJs}\n</script>`;
      if (stitchedDoc.includes('<script src="index.js"></script>')) {
        stitchedDoc = stitchedDoc.replace('<script src="index.js"></script>', scriptTag);
      } else if (stitchedDoc.includes('</body>')) {
        stitchedDoc = stitchedDoc.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        stitchedDoc = `${stitchedDoc}\n${scriptTag}`;
      }

      setHtmlSrcDoc(stitchedDoc);

      if (activeFileName === 'index.html' || activeFileName === 'styles.css') {
        // Show HTML Live Preview
        setShowHtmlPreview(true);
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
        setExecutionState('success');
        setLastExecTime(Math.round(performance.now() - startTime));
        setTimeout(() => setExecutionState('idle'), 1500);
        return;
      }

      // JavaScript: native execution with intercepted console
      setShowHtmlPreview(false);
      const newEntries: ConsoleEntry[] = [separator];

      const makeEntry = (type: ConsoleEntry['type'], args: unknown[]): ConsoleEntry => ({
        id: makeId(),
        type,
        args,
        timestamp: Math.round(performance.now() - startTime),
        runIndex: currentRun,
      });

      const fakeConsole = {
        log: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
        error: (...args: unknown[]) => newEntries.push(makeEntry('error', args)),
        warn: (...args: unknown[]) => newEntries.push(makeEntry('warn', args)),
        info: (...args: unknown[]) => newEntries.push(makeEntry('info', args)),
        dir: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
        table: (...args: unknown[]) => newEntries.push(makeEntry('log', args)),
        clear: () => { /* no-op in sandbox */ },
      };

      try {
        const guardedJs = injectLoopGuards(jsFile);
        const wrappedCode = `
          "use strict";
          const console = arguments[0];
          ${guardedJs}
        `;
        const fn = new Function(wrappedCode);
        const result = fn(fakeConsole);

        if (result !== undefined) {
          newEntries.push(makeEntry('return', [result]));
        }

        const execTime = Math.round(performance.now() - startTime);
        setLastExecTime(execTime);
        setConsoleEntries(prev => {
          const combined = [...prev, ...newEntries];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });
        setExecutionState('success');
        setTimeout(() => setExecutionState('idle'), 1500);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        newEntries.push(makeEntry('error', [errorMessage]));

        const execTime = Math.round(performance.now() - startTime);
        setLastExecTime(execTime);
        setConsoleEntries(prev => {
          const combined = [...prev, ...newEntries];
          return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
        });
        setExecutionState('error');
        setTimeout(() => setExecutionState('idle'), 1500);
      }
    }, 60);
  }, [files, activeFileName, runCount, makeId]);

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

    const startY = e.clientY;
    const startHeight = editorHeight;
    const container = containerRef.current;
    if (!container) return;

    const containerHeight = container.getBoundingClientRect().height;

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
  }, [editorHeight]);

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
        '(//.*|/\\*[\\s\\S]*?\\*/)',
        '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)',
        '\\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|export|import|from|default|new|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|yield|true|false|null|undefined|void|delete|with|super|implements|interface|type|enum|abstract|static|public|private|protected|readonly|declare|module|namespace|require|as)\\b',
        '\\b(\\d+(?:\\.\\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\\b',
        '\\b(console|log|error|warn|info|window|document|Math|JSON|Object|Array|String|Number|Boolean|Promise|Map|Set|Error|setTimeout|setInterval|clearTimeout|clearInterval|parseInt|parseFloat|isNaN|Infinity|NaN|RegExp|Date|Symbol|Proxy|Reflect|WeakMap|WeakSet|globalThis)\\b',
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

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  return (
    <div
      className={`flex flex-col h-full overflow-hidden border-l ${
        isZenMode
          ? 'bg-[#07080c] border-white/5'
          : 'bg-[#0c0e14] border-slate-200/50 shadow-2xl'
      }`}
    >
      {/* ── CINEMATIC HEADER ── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
        isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 bg-[#0a0c10]'
      }`}>
        <div className="flex items-center gap-3">
          {/* Traffic light dots */}
          <div className={`flex items-center gap-1.5 cortex-dots-idle`}>
            <button onClick={onClose} className="w-[10px] h-[10px] rounded-full cortex-dot-red cursor-pointer hover:brightness-125 transition-all" title="Close" />
            <div className="w-[10px] h-[10px] rounded-full cortex-dot-yellow" />
            <div className="w-[10px] h-[10px] rounded-full cortex-dot-green" />
          </div>

          <div className="w-px h-4 bg-white/5" />

          {/* Title + Status */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-[#4e5bff]/10 text-[#4e5bff]">
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
                  <span className="text-[8px] font-mono font-medium text-slate-600 ml-1">
                    {lastExecTime}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Run counter */}
          {runCount > 0 && (
            <span className="text-[8px] font-mono font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
              #{runCount}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* ── EDITOR + CONSOLE SPLIT ── */}
      <div ref={containerRef} className={`flex-1 flex flex-col min-h-0 ${isDragging ? 'select-none' : ''}`}>

        {/* ═══ TOP: EDITOR PANEL ═══ */}
        <div className="flex flex-col min-h-[150px] bg-[#0a0c10] relative" style={{ height: `${editorHeight}%` }}>

          {/* File tab bar */}
          <div className="flex items-center justify-between px-3 bg-[#07080b] border-b border-white/5 shrink-0 z-10 select-none h-10 overflow-hidden relative">
            {/* Scrollable file tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-8 py-1 custom-scrollbar">
              {files.map((f) => {
                const isActive = f.name === activeFileName;
                const isJs = f.language === 'javascript';
                const isCss = f.language === 'css';
                const isPython = f.language === 'python';
                const isGo = f.language === 'go';
                const isRust = f.language === 'rust';

                const tabColor = isJs
                  ? 'bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.5)]'
                  : isCss
                    ? 'bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.5)]'
                    : isPython
                      ? 'bg-blue-400 shadow-[0_0_4px_rgba(56,189,248,0.5)]'
                      : isGo
                        ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                        : isRust
                          ? 'bg-red-450 shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                          : 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.5)]';

                const isCore = f.name === 'main.py' ||
                               f.name === 'main.go' ||
                               f.name === 'main.rs' ||
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
                      className={`relative flex items-center gap-2 pl-3 py-1 rounded-md border text-[10px] font-mono transition-all duration-200 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'border-white/10 text-white font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                      } ${!isCore ? 'pr-7 animate-in fade-in zoom-in-95 duration-250' : 'pr-3'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSandboxTab"
                          className="absolute inset-0 bg-[#0c0e14] rounded-md -z-10 shadow-[0_0_8px_rgba(99,102,241,0.08)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <div className={`w-1.5 h-1.5 rounded-full ${tabColor}`} />
                      <span className="relative z-20">{f.name}</span>
                    </button>

                    {!isCore && (
                      <button
                        onClick={(e) => deleteScratchFile(f.name, e)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all z-30 cursor-pointer border-none bg-transparent"
                        title="Delete Scratch File"
                      >
                        <X size={8} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add New Scratch File Button */}
              <button
                onClick={addNewScratchFile}
                className="p-1 rounded-md border border-dashed border-white/10 hover:border-white/30 text-slate-500 hover:text-white hover:bg-white/[0.02] flex items-center justify-center cursor-pointer transition-colors z-20 bg-transparent flex-shrink-0"
                title="Create Scratch File"
              >
                <Plus size={11} />
              </button>
            </div>

            {/* Pinned action buttons on the right */}
            <div className="flex items-center gap-2 flex-shrink-0 pl-4 bg-gradient-to-l from-[#07080b] via-[#07080b] to-transparent relative z-20 h-full py-1">
              {onAskSara && (
                <button
                  onClick={explainActiveCode}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 active:scale-95 transition-all text-[9.5px] uppercase font-black tracking-wider cursor-pointer bg-indigo-500/5 border border-indigo-500/15 py-1 px-2 rounded-lg flex-shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(99,102,241,0.06)]"
                >
                  <Sparkles size={11} className="animate-pulse" /> Explain
                </button>
              )}
              <span className={`${langConfig.cssClass} cortex-lang-badge whitespace-nowrap flex-shrink-0 py-1 px-2.5 rounded-lg border text-[9px]`}>
                {langConfig.icon}
                {langConfig.label}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all text-[9.5px] uppercase font-bold tracking-wider cursor-pointer border border-white/5 py-1 px-2.5 rounded-lg flex-shrink-0 whitespace-nowrap"
              >
                {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Code Editor Container */}
          <div className="flex-1 relative flex min-h-0 overflow-hidden">
            {/* Line numbers gutter */}
            <div
              ref={lineGutterRef}
              className="w-12 border-r border-white/5 bg-[#07080b]/80 flex flex-col items-end select-none font-mono overflow-hidden shrink-0"
              style={{
                paddingTop: '16px',
                lineHeight: '20px',
                fontSize: `${fontSize}px`
              }}
            >
              {lines.map((_, i) => {
                const isActive = activeLine === i + 1;
                const distance = Math.abs(activeLine - (i + 1));
                const opacity = isActive ? 1 : Math.max(0.2, 1 - distance * 0.08);
                return (
                  <div
                    key={i}
                    className={`h-[20px] flex items-center justify-end w-full pr-3 transition-all duration-150 relative ${
                      isActive
                        ? 'text-indigo-400 font-black cortex-active-line'
                        : 'text-slate-600 font-medium'
                    }`}
                    style={{ opacity }}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)] rounded-r" />
                    )}
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {/* Highlighting & Input Wrapper */}
            <div className="relative flex-1 h-full min-w-0 bg-[#0a0c10]">
              {/* Active line background highlight */}
              <div
                className="absolute left-0 right-0 h-[20px] pointer-events-none z-[1] transition-all duration-100"
                style={{
                  top: `${(activeLine - 1) * 20 + 16}px`,
                  background: isZenMode
                    ? 'linear-gradient(to right, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0.01) 50%, transparent 100%)'
                    : 'linear-gradient(to right, rgba(78, 91, 255, 0.04) 0%, rgba(78, 91, 255, 0.01) 50%, transparent 100%)',
                  borderLeft: '2px solid #4e5bff',
                  boxShadow: 'inset 4px 0 8px -4px rgba(78, 91, 255, 0.3)'
                }}
              />

              {/* Highlight layer */}
              <pre
                ref={highlightRef}
                className="absolute top-0 left-0 w-full h-full px-5 pt-4 bg-transparent text-[#e2e8f0] font-mono overflow-hidden pointer-events-none leading-relaxed m-0 z-[2]"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: '20px',
                  fontSize: `${fontSize}px`,
                  tabSize: tabSize,
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />

              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => updateActiveFileCode(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                onClick={handleSelect}
                className="absolute top-0 left-0 w-full h-full px-5 pt-4 bg-transparent text-transparent caret-[#a5b4fc] font-mono outline-none resize-none overflow-y-auto leading-relaxed border-none cortex-editor-scroll z-[3]"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: '20px',
                  fontSize: `${fontSize}px`,
                  tabSize: tabSize,
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />

              {/* Floating Run Button */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest font-mono bg-[#0a0c10]/90 px-2 py-1 rounded-md border border-white/5 backdrop-blur-md">
                  ⌘+Enter
                </span>
                <div className="relative">
                  <motion.button
                    ref={runButtonRef}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={runCode}
                    disabled={executionState === 'executing'}
                    className={`relative h-10 px-5 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 cursor-pointer transition-all ${
                      executionState === 'executing'
                        ? 'bg-indigo-600 cortex-run-executing'
                        : executionState === 'success'
                          ? 'bg-emerald-600 cortex-run-success'
                          : executionState === 'error'
                            ? 'bg-red-600'
                            : 'bg-[#4e5bff] hover:bg-[#5f6cff] cortex-run-idle'
                    }`}
                  >
                    {executionState === 'executing' ? (
                      <div className="cortex-spinner" />
                    ) : executionState === 'success' ? (
                      <CheckCircle2 size={12} />
                    ) : executionState === 'error' ? (
                      <AlertTriangle size={12} />
                    ) : (
                      <Play size={11} fill="currentColor" />
                    )}
                    {executionState === 'executing' ? 'Running' : executionState === 'success' ? 'Done' : executionState === 'error' ? 'Failed' : 'Run'}
                  </motion.button>
                </div>
              </div>
            </div> {/* <-- Closes Highlighting & Input Wrapper */}
          </div> {/* <-- Closes Code Editor Container */}

          {/* IDE STATUS BAR - positioned full width at bottom of editor panel */}
          <div className="relative z-10 shrink-0">
            {executionState === 'executing' && (
              <motion.div
                initial={{ left: '0%', width: '0%' }}
                animate={{ left: ['0%', '20%', '100%'], width: ['0%', '40%', '0%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-pink-500 to-indigo-500 z-20 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              />
            )}
            <div className="h-6 px-4 bg-[#07080b] border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500 shrink-0 select-none relative">
              <div className="flex items-center gap-4 font-mono">
                <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
                <span className="w-px h-2.5 bg-white/5" />
                <button
                  onClick={() => setTabSize(prev => prev === 2 ? 4 : 2)}
                  className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 font-mono text-[9.5px]"
                  title="Toggle Indentation Spaces (2 / 4)"
                >
                  Spaces: {tabSize}
                </button>
                <span className="w-px h-2.5 bg-white/5" />
                <span>UTF-8</span>
                <span className="w-px h-2.5 bg-white/5" />
                <div className="flex items-center gap-1.5">
                  <span>Font: {fontSize}px</span>
                  <button
                    onClick={() => updateFontSize(fontSize - 1)}
                    disabled={fontSize <= 10}
                    className="w-3.5 h-3.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer text-[8px] border-none text-slate-350 hover:text-white"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <button
                    onClick={() => updateFontSize(fontSize + 1)}
                    disabled={fontSize >= 20}
                    className="w-3.5 h-3.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer text-[8px] border-none text-slate-350 hover:text-white"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-row">
                {executionState === 'executing' && (
                  <div className="w-2.5 h-2.5 rounded-full border border-indigo-500/30 border-t-indigo-400 animate-spin shrink-0 mr-1.5" />
                )}
                <span className="uppercase text-slate-450 font-bold">
                  {language === 'javascript' ? 'JavaScript ES6' :
                   language === 'css' ? 'CSS3' :
                   language === 'html' ? 'HTML5' :
                   language === 'python' ? 'Python 3' :
                   language === 'go' ? 'Go 1.22' :
                   language === 'rust' ? 'Rust Stable' : language}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RESIZABLE DIVIDER ═══ */}
        <div
          className={`cortex-panel-divider ${isZenMode ? '' : 'cortex-panel-divider-light'} bg-[#07080b] border-t border-b border-white/5`}
          onMouseDown={handleDividerMouseDown}
        />

        {/* ═══ BOTTOM: CONSOLE OUTPUT PANEL ═══ */}
        <div
          className={`flex flex-col bg-[#0a0b0f] relative overflow-hidden min-h-[100px] ${executionState === 'error' ? 'cortex-error-shake' : ''}`}
          style={{ height: `${100 - editorHeight}%` }}
        >
          {/* Console header */}
          <div className="px-3 py-2 shrink-0 flex items-center justify-between bg-[#07080b] border-b border-white/5 select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHtmlPreview(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  !showHtmlPreview
                    ? 'bg-[#0c0e14] border-white/5 text-indigo-400 font-bold'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350'
                }`}
              >
                <Terminal size={11} />
                <span>Console</span>
                {consoleEntries.filter(e => e.type !== 'separator' && e.type !== 'system').length > 0 && (
                  <span className="text-[8px] font-mono font-bold text-slate-600 bg-white/5 px-1.5 py-0.5 rounded ml-1">
                    {consoleEntries.filter(e => e.type !== 'separator' && e.type !== 'system').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowHtmlPreview(true);
                  if (htmlSrcDoc === '') {
                    // pre-load stitched preview
                    const jsFile = files.find(f => f.name === 'index.js')?.code || '';
                    const cssFile = files.find(f => f.name === 'styles.css')?.code || '';
                    const htmlFile = files.find(f => f.name === 'index.html')?.code || '';
                    let stitchedDoc = htmlFile;
                    const styleTag = `<style>\n${cssFile}\n</style>`;
                    if (stitchedDoc.includes('<link rel="stylesheet" href="styles.css">')) {
                      stitchedDoc = stitchedDoc.replace('<link rel="stylesheet" href="styles.css">', styleTag);
                    } else if (stitchedDoc.includes('</head>')) {
                      stitchedDoc = stitchedDoc.replace('</head>', `${styleTag}\n</head>`);
                    } else {
                      stitchedDoc = `${styleTag}\n${stitchedDoc}`;
                    }
                    const guardedJs = injectLoopGuards(jsFile);
                    const scriptTag = `${consoleInterceptScript}\n<script>\n${guardedJs}\n</script>`;
                    if (stitchedDoc.includes('<script src="index.js"></script>')) {
                      stitchedDoc = stitchedDoc.replace('<script src="index.js"></script>', scriptTag);
                    } else if (stitchedDoc.includes('</body>')) {
                      stitchedDoc = stitchedDoc.replace('</body>', `${scriptTag}\n</body>`);
                    } else {
                      stitchedDoc = `${stitchedDoc}\n${scriptTag}`;
                    }
                    setHtmlSrcDoc(stitchedDoc);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  showHtmlPreview
                    ? 'bg-[#0c0e14] border-white/5 text-pink-400 font-bold'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350'
                }`}
              >
                <Globe size={11} />
                <span>Live Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Keyboard shortcut hint */}
              <span className="text-[7px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                ⌘L clear
              </span>
              <button
                onClick={clearConsole}
                className="p-1 rounded hover:bg-white/5 text-slate-600 hover:text-slate-300 transition-all cursor-pointer"
                title="Clear Console (⌘+L)"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {/* Console entries */}
          {/* Console entries container */}
          <div
            ref={consoleRef}
            onScroll={handleConsoleScroll}
            className={`flex-1 min-h-0 overflow-y-auto cortex-console-scroll relative ${showHtmlPreview ? 'hidden' : ''}`}
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
                        codeContext={code}
                        language={language}
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
                className="cortex-scroll-fab fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c0e14]/90 border border-white/10 text-slate-300 text-[8px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[#0c0e14] hover:border-indigo-500/30 transition-all shadow-lg"
              >
                <ArrowDown size={10} />
                New output
              </button>
            )}
          </div>

          {/* HTML iframe preview container */}
          <div className={`flex-1 min-h-0 bg-white relative ${!showHtmlPreview ? 'hidden' : ''}`}>
            <iframe
              ref={iframeRef}
              srcDoc={htmlSrcDoc}
              title="cortex-html-preview"
              sandbox="allow-scripts"
              className="w-full h-full border-none"
            />

            {/* CRT compile overlay scanlines */}
            {executionState === 'executing' && (
              <div className="absolute inset-0 pointer-events-none z-30 bg-black/10 overflow-hidden flex flex-col justify-between">
                {/* Shifting Horizontal Sweep line */}
                <motion.div
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="w-full h-[3px] bg-indigo-500/35 filter blur-[0.5px]"
                />
                {/* CRT Scanline grid */}
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
          {/* Glowing REPL input box pinned at bottom */}
          <form onSubmit={handleReplSubmit} className="shrink-0 flex items-center gap-2.5 px-3 py-2 border-t border-white/5 bg-[#08090d] relative z-10">
            <span className="text-[10px] font-black font-mono text-[#4e5bff] select-none">&gt;</span>
            <input
              type="text"
              value={replInput}
              onChange={e => setReplInput(e.target.value)}
              onKeyDown={handleReplKeyDown}
              placeholder={replPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-[#cbd5e1] outline-none border-none caret-indigo-400 placeholder-slate-600"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-indigo-400 border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95 transition-all cursor-pointer shadow-sm shadow-indigo-500/5"
            >
              Run
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CodeSandbox;
