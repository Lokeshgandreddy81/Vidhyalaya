import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { Terminal, X, Play, Code, Trash2, Plus, TerminalSquare, AlertTriangle, ArrowRight, ArrowDown, Settings, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  checkSafety,
  findClosestCommand,
  detectIntent,
  trackCommandUsage,
  getExpertiseLevel,
  generateWelcomeMessage,
  formatMistakeResponse,
  formatSafetyResponse,
  formatCommandExplanation,
  getContextualSuggestions,
  KNOWN_COMMANDS,
  GIT_SUBCOMMANDS,
  NPM_SUBCOMMANDS,
  ExpertiseLevel
} from '../../utils/terminalIntelligence';
import {
  executeGitCommand,
  createInitialGitRepo,
  createPrePopulatedRepo,
  GitRepo
} from '../../utils/virtualGit';
import { useAppStore } from '../../context/Store';
import { verifyStepState, detectMistakeScaffolding, MISSION_CATALOG, SCENARIO_CATALOG } from '../../utils/cortexCoachEngine';
import { TerminalCoachMistakeContext, TerminalSaraContext } from '../../types';


export interface VFSFile {
  name: string;
  type: 'file' | 'dir';
  content?: string;
}

export const createDefaultVirtualFS = (): Record<string, VFSFile> => ({
  'README.md': { name: 'README.md', type: 'file', content: '# Vidyal.ai Workspace\n\nWelcome to your learning terminal sandbox!' },
  'package.json': { name: 'package.json', type: 'file', content: '{\n  "name": "vidyalai-workspace",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}' },
  'exercises': { name: 'exercises', type: 'dir' },
  'exercises/exercises.ts': { name: 'exercises.ts', type: 'file', content: 'export function fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}' },
  'exercises/quiz.test.ts': { name: 'quiz.test.ts', type: 'file', content: 'import { fibonacci } from "./exercises";\n// test cases...' },
  'backend': { name: 'backend', type: 'dir' },
  'frontend': { name: 'frontend', type: 'dir' },
});

export const createFSFromGit = (gitFiles: Array<{ name: string; content: string }>): Record<string, VFSFile> => {
  const fs = createDefaultVirtualFS();
  gitFiles.forEach(f => {
    fs[f.name] = {
      name: f.name.split('/').pop() || f.name,
      type: 'file',
      content: f.content
    };
    const parts = f.name.split('/');
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        fs[dirPath] = {
          name: parts[i - 1],
          type: 'dir'
        };
      }
    }
  });
  return fs;
};

export const resolvePath = (currentDir: string, arg: string): string => {
  const cleanArg = arg.trim();
  if (!cleanArg) return currentDir;

  if (cleanArg === '/' || cleanArg === '~') return 'Vidhyalaya';

  let fullPath = '';
  if (cleanArg.startsWith('/')) {
    fullPath = cleanArg.substring(1);
  } else {
    fullPath = currentDir === 'Vidhyalaya' ? cleanArg : `${currentDir}/${cleanArg}`;
  }

  const parts = fullPath.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.length === 0 ? 'Vidhyalaya' : stack.join('/');
};

export const syncFSWithGit = (fs: Record<string, VFSFile>, git: GitRepo): GitRepo => {
  if (!git.initialized) return git;

  const newGitFiles = [...git.files];

  Object.entries(fs).forEach(([path, node]) => {
    if (node.type === 'file') {
      const idx = newGitFiles.findIndex(f => f.name === path);
      if (idx < 0) {
        newGitFiles.push({
          name: path,
          status: 'untracked',
          content: node.content || '',
        });
      } else {
        const gitFile = newGitFiles[idx];
        if (gitFile.content !== node.content) {
          if (gitFile.status === 'committed') {
            newGitFiles[idx] = {
              ...gitFile,
              status: 'modified',
              content: node.content || '',
            };
          } else {
            newGitFiles[idx] = {
              ...gitFile,
              content: node.content || '',
            };
          }
        }
      }
    }
  });

  return { ...git, files: newGitFiles };
};

export const syncGitWithFS = (git: GitRepo, fs: Record<string, VFSFile>): Record<string, VFSFile> => {
  const newFS = { ...fs };
  git.files.forEach(gitFile => {
    if (gitFile.status === 'committed' || gitFile.status === 'staged' || gitFile.status === 'modified') {
      newFS[gitFile.name] = {
        name: gitFile.name.split('/').pop() || gitFile.name,
        type: 'file',
        content: gitFile.content,
      };
    }
  });
  return newFS;
};

interface ShellTerminalProps {
  terminalHistory: string[];
  setTerminalHistory: React.Dispatch<React.SetStateAction<string[]>>;
  isReadOnly?: boolean;
  editorFiles: any[];
  setEditorFiles: React.Dispatch<React.SetStateAction<any[]>>;
  selectedEditorFile: string;
  setSelectedEditorFile: React.Dispatch<React.SetStateAction<string>>;
  isServerRunning: boolean;
  setIsServerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkspaceTab: React.Dispatch<React.SetStateAction<any>>;
  setRightPaneState: React.Dispatch<React.SetStateAction<any>>;
  setBrowserUrl: React.Dispatch<React.SetStateAction<string>>;
  setBrowserHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setBrowserHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  loading?: boolean;
  moduleTopic?: string;
  keyConcepts?: string[];
  onAskSara?: (context: TerminalSaraContext) => void;
}

interface TerminalSession {
  id: string;
  name: string;
  history: string[];
  currentDir: string; // e.g. "Vidhyalaya" or "exercises"
  historyStack: string[];
  historyIndex: number;
  activeProcess: 'none' | 'dev' | 'test' | 'nano' | 'top' | 'compile';
  nanoFile?: string;
  nanoBuffer?: string;
  inputBuffer: string;       // F-005: per-session input buffer
  inputCursorOffset: number; // F-005: per-session cursor position
  dirtyInputBuffer: string;  // F-003: dirty buffer for history navigation
  gitState: GitRepo;
  virtualFS: Record<string, VFSFile>;
}

// F-015: Collision-safe session ID generator
let sessionCounter = 0;
const generateSessionId = (): string => {
  sessionCounter++;
  return `bash-${Date.now()}-${sessionCounter}`;
};

const renderAnsiLine = (line: string) => {
  const parts = line.split(/\x1b\[([0-9;]*)m/);
  if (parts.length === 1) {
    return <span>{line}</span>;
  }

  const elements: React.ReactNode[] = [];
  let currentStyles: {
    color?: string;
    bold?: boolean;
    dim?: boolean;
    italic?: boolean;
    underline?: boolean;
  } = {};

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const codes = parts[i].split(';');
      for (const codeStr of codes) {
        const code = parseInt(codeStr, 10);
        if (isNaN(code) || code === 0) {
          currentStyles = {};
        } else if (code === 1) {
          currentStyles.bold = true;
        } else if (code === 2) {
          currentStyles.dim = true;
        } else if (code === 3) {
          currentStyles.italic = true;
        } else if (code === 4) {
          currentStyles.underline = true;
        } else if (code === 22) {
          currentStyles.bold = false;
          currentStyles.dim = false;
        } else if (code === 23) {
          currentStyles.italic = false;
        } else if (code === 24) {
          currentStyles.underline = false;
        } else if (code >= 30 && code <= 37) {
          const colors = [
            'text-[#282c34]',    // 30 black
            'text-rose-400',     // 31 red
            'text-emerald-400',  // 32 green
            'text-amber-400',    // 33 yellow
            'text-blue-400',     // 34 blue
            'text-purple-400',   // 35 magenta
            'text-cyan-400',     // 36 cyan
            'text-slate-200'     // 37 white
          ];
          currentStyles.color = colors[code - 30];
        } else if (code === 39) {
          delete currentStyles.color;
        } else if (code >= 90 && code <= 97) {
          const brightColors = [
            'text-neutral-500',  // 90 bright black / gray
            'text-rose-300',     // 91 bright red
            'text-emerald-300',  // 92 bright green
            'text-amber-300',    // 93 bright yellow
            'text-blue-300',     // 94 bright blue
            'text-purple-300',   // 95 bright magenta
            'text-cyan-300',     // 96 bright cyan
            'text-white'         // 97 bright white
          ];
          currentStyles.color = brightColors[code - 90];
        }
      }
    } else {
      const text = parts[i];
      if (text) {
        const classes: string[] = [];
        if (currentStyles.color) classes.push(currentStyles.color);
        if (currentStyles.bold) classes.push('font-bold');
        if (currentStyles.dim) classes.push('opacity-50');
        if (currentStyles.italic) classes.push('italic');
        if (currentStyles.underline) classes.push('underline');

        elements.push(
          <span key={i} className={classes.join(' ')}>
            {text}
          </span>
        );
      }
    }
  }

  return <>{elements}</>;
};

const findStartIndex = (offsets: number[], scrollTop: number): number => {
  let low = 0;
  let high = offsets.length - 1;
  let ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= scrollTop) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, ans - 10);
};

const findEndIndex = (offsets: number[], targetY: number): number => {
  let low = 0;
  let high = offsets.length - 1;
  let ans = offsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] >= targetY) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return Math.min(offsets.length - 1, ans + 10);
};

// F-010: LocalStorage persistence helpers
const STORAGE_KEY = 'vidyalai-terminal-sessions';
const persistSessions = (sessions: TerminalSession[], activeId: string) => {
  try {
    const toSave = sessions.map(s => ({
      id: s.id,
      name: s.name,
      history: s.history.slice(-500), // persist last 500 lines per session
      currentDir: s.currentDir,
      historyStack: s.historyStack,
      historyIndex: -1,
      activeProcess: 'none' as const, // never persist running processes
      inputBuffer: '',
      inputCursorOffset: 0,
      dirtyInputBuffer: '',
      gitState: s.gitState,
      virtualFS: s.virtualFS,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: toSave, activeId }));
  } catch (_e) {
    // localStorage full or blocked — silently fail
  }
};

const loadPersistedSessions = (): { sessions: TerminalSession[]; activeId: string } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.sessions?.length > 0) {
      // Re-hydrate sessions with defaults for any missing fields
      const sessions: TerminalSession[] = parsed.sessions.map((s: any) => ({
        id: s.id || generateSessionId(),
        name: s.name || 'bash',
        history: s.history || [],
        currentDir: s.currentDir || 'Vidhyalaya',
        historyStack: s.historyStack || [],
        historyIndex: -1,
        activeProcess: 'none' as const,
        inputBuffer: '',
        inputCursorOffset: 0,
        dirtyInputBuffer: '',
        gitState: s.gitState || createInitialGitRepo(),
        virtualFS: s.virtualFS || createDefaultVirtualFS(),
      }));
      return { sessions, activeId: parsed.activeId || sessions[0].id };
    }
  } catch (_e) {
    // Corrupted data — start fresh
  }
  return null;
};

// F-008: Output line classification for color hierarchy
const classifyOutputLine = (log: string): 'prompt-command' | 'prompt-empty' | 'error' | 'warning' | 'success' | 'info' | 'exit-status' | 'neutral' => {
  const isPromptLine = log.startsWith('lokeshgandreddy@MacBook-Pro');
  if (isPromptLine && log.includes('% ') && log.split('% ')[1]?.trim()) return 'prompt-command';
  if (isPromptLine) return 'prompt-empty';
  if (log.startsWith('ERROR:') || log.includes('zsh: command not found') || log.includes('error:') || log.includes('error TS') || log.startsWith('cat:') || log.startsWith('cd:') || log.startsWith('nano:') || log.startsWith('ts-node: error')) return 'error';
  if (log.includes('warning') || log.includes('WARN') || log.includes('⚠')) return 'warning';
  if (log.includes('✓') || log.includes('success') || log.includes('passed') || log.startsWith('✓')) return 'success';
  if (log.startsWith('✓ ') || log.startsWith('⏱') || log.match(/^(Exit Code:|Completed in )/)) return 'exit-status';
  if (log.startsWith('>') || log.startsWith('  ➜') || log.startsWith('RUN') || log.startsWith('  VITE')) return 'info';
  return 'neutral';
};

const getLineClasses = (classification: ReturnType<typeof classifyOutputLine>): string => {
  switch (classification) {
    case 'error': return 'text-rose-400 font-bold';
    case 'warning': return 'text-amber-400 font-medium';
    case 'success': return 'text-emerald-400 font-medium';
    case 'exit-status': return 'text-white/50 text-[10px]';
    case 'info': return 'text-blue-300/80';
    case 'neutral': return 'text-slate-300'; // F-008: neutral white/gray instead of emerald
    default: return 'text-slate-300';
  }
};

export const ShellTerminal: React.FC<ShellTerminalProps> = ({
  terminalHistory,
  setTerminalHistory,
  isReadOnly = false,
  editorFiles,
  setEditorFiles,
  selectedEditorFile,
  setSelectedEditorFile,
  isServerRunning,
  setIsServerRunning,
  setWorkspaceTab,
  setRightPaneState,
  setBrowserUrl,
  setBrowserHistory,
  setBrowserHistoryIndex,
  loading = false,
  moduleTopic,
  keyConcepts,
  onAskSara,
}) => {
  const {
    activeMission,
    activeScenario,
    logCommandExecution,
    logMistake,
    startMission,
    updateMissionStep,
    completeActiveMission,
    startScenario,
    updateScenarioStep,
    exitScenario
  } = useAppStore();

  // F-010: Load persisted sessions on mount
  const [sessions, setSessions] = useState<TerminalSession[]>(() => {
    const persisted = loadPersistedSessions();
    if (persisted) return persisted.sessions;
    return [{
      id: 'bash-1',
      name: 'bash (1)',
      history: [
        'Last login: ' + new Date().toDateString() + ' on ttys002',
        ...generateWelcomeMessage(moduleTopic),
        'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
      ],
      currentDir: 'Vidhyalaya',
      historyStack: [],
      historyIndex: -1,
      activeProcess: 'none',
      inputBuffer: '',
      inputCursorOffset: 0,
      dirtyInputBuffer: '',
      gitState: createInitialGitRepo(),
      virtualFS: createDefaultVirtualFS(),
    }];
  });

  // Effect to handle welcome message and pre-populating FS / gitState on moduleTopic updates
  useEffect(() => {
    if (moduleTopic && sessions.length === 1 && (sessions[0].history.length <= 2 || sessions[0].history.some(line => line.includes('Welcome back')))) {
      setSessions(prev => prev.map(s => {
        if (s.id === 'bash-1') {
          const isGitModule = moduleTopic.toLowerCase().includes('git') || moduleTopic.toLowerCase().includes('version control');
          const initialGit = isGitModule ? createPrePopulatedRepo(moduleTopic) : createInitialGitRepo();
          const initialFS = isGitModule ? createFSFromGit(initialGit.files) : createDefaultVirtualFS();

          return {
            ...s,
            history: [
              'Last login: ' + new Date().toDateString() + ' on ttys002',
              ...generateWelcomeMessage(moduleTopic),
              `lokeshgandreddy@MacBook-Pro ${s.currentDir} % `
            ],
            gitState: initialGit,
            virtualFS: initialFS
          };
        }
        return s;
      }));
    }
  }, [moduleTopic]);

  // Effect to load active scenario state into the terminal session
  useEffect(() => {
    if (activeScenario && activeScenario.currentStepIndex === 0) {
      const config = SCENARIO_CATALOG[activeScenario.scenarioId];
      if (config) {
        // Backup current VFS and Git states
        const activeSess = sessions.find(s => s.id === activeSessionId);
        if (activeSess) {
          localStorage.setItem('cortex-backup-vfs', JSON.stringify(activeSess.virtualFS));
          localStorage.setItem('cortex-backup-git', JSON.stringify(activeSess.gitState));
        }

        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;

          // Switch to sandbox state. Scenarios are intentionally isolated from
          // the default learning workspace so Git status only reflects the drill.
          const scenFS: Record<string, VFSFile> = {};
          Object.entries(config.vfsState).forEach(([path, node]: [string, any]) => {
            const pathParts = path.split('/');
            if (pathParts.length > 1) {
              for (let i = 1; i < pathParts.length; i++) {
                const dirPath = pathParts.slice(0, i).join('/');
                if (!scenFS[dirPath]) {
                  scenFS[dirPath] = {
                    name: pathParts[i - 1],
                    type: 'dir'
                  };
                }
              }
            }
            scenFS[path] = {
              name: path.split('/').pop() || path,
              type: node.type,
              content: node.content || ''
            };
          });

          return {
            ...s,
            currentDir: config.startingDir || 'Vidhyalaya',
            gitState: { ...config.gitState },
            virtualFS: scenFS,
            history: [
              ...s.history,
              '',
              `\x1b[1m\x1b[33m⚠️ ENTERING SANDBOX MODE: ${config.title}\x1b[0m`,
              `Description: ${config.description}`,
              `Folder: /Users/lokeshgandreddy/Sara/Vidhyalaya/${config.startingDir}`,
              '',
              `lokeshgandreddy@MacBook-Pro ${config.startingDir} % `
            ]
          };
        }));
      }
    }
  }, [activeScenario?.scenarioId]);

  // Effect to restore backup state when exiting a scenario
  const prevScenarioRef = useRef<string | null>(null);
  useEffect(() => {
    const prevScenarioId = prevScenarioRef.current;
    const currentScenarioId = activeScenario?.scenarioId || null;

    if (prevScenarioId && !currentScenarioId) {
      // Restore VFS and Git state from activeScenario backup
      const savedBackupVFS = localStorage.getItem('cortex-backup-vfs');
      const savedBackupGit = localStorage.getItem('cortex-backup-git');
      if (savedBackupVFS && savedBackupGit) {
        try {
          const restoredVFS = JSON.parse(savedBackupVFS);
          const restoredGit = JSON.parse(savedBackupGit);
          setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              virtualFS: restoredVFS,
              gitState: restoredGit,
              currentDir: 'Vidhyalaya',
              history: [
                ...s.history,
                '',
                `\x1b[1m\x1b[32m✓ Sandbox exited. Files and Git state successfully restored.\x1b[0m`,
                `lokeshgandreddy@MacBook-Pro Vidhyalaya % `
              ]
            };
          }));
        } catch (e) {
          console.error('Failed to restore backup states:', e);
        }
      }
    }
    prevScenarioRef.current = currentScenarioId;
  }, [activeScenario?.scenarioId]);


  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const persisted = loadPersistedSessions();
    return persisted?.activeId || 'bash-1';
  });
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [cursorOffset, setCursorOffset] = useState<number>(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [lastErrorCommand, setLastErrorCommand] = useState<string>('');
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composingText, setComposingText] = useState<string>('');
  const [suggestion, setSuggestion] = useState<string>('');
  const [isBellActive, setIsBellActive] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({ cpu: 1.5, ram: 482 });

  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const [dragStartRowIndex, setDragStartRowIndex] = useState<number | null>(null);
  const [dragEndRowIndex, setDragEndRowIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [tabBypass, setTabBypass] = useState<boolean>(false);

  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(400);
  const [viewportWidth, setViewportWidth] = useState<number>(800);
  const [hasNewLogs, setHasNewLogs] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const lastHistoryLenRef = useRef<number>(0);

  // F-002: Bracketed paste state
  const [pasteBuffer, setPasteBuffer] = useState<string[] | null>(null);

  // F-006: Multi-match autocomplete state
  const [autocompleteMatches, setAutocompleteMatches] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState<number>(-1);

  const syncCursorOffset = () => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart ?? 0;
      const end = inputRef.current.selectionEnd ?? 0;
      setSelectionStart(start);
      setSelectionEnd(end);
      setCursorOffset(inputRef.current.selectionDirection === 'backward' ? start : end);
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const start = e.currentTarget.selectionStart ?? 0;
    const end = e.currentTarget.selectionEnd ?? 0;
    setSelectionStart(start);
    setSelectionEnd(end);
    setCursorOffset(e.currentTarget.selectionDirection === 'backward' ? start : end);
  };

  // Nano Editor Specific UI states
  const [nanoFile, setNanoFile] = useState<string>('');
  const [nanoBuffer, setNanoBuffer] = useState<string>('');
  const [nanoExitPrompt, setNanoExitPrompt] = useState<'none' | 'save_ask' | 'filename_ask'>('none');
  const [nanoTempFilename, setNanoTempFilename] = useState<string>('');

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nanoTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const lastSaraInterventionRef = useRef<{ key: string; timestamp: number } | null>(null);

  const requestSaraCoachIntervention = useCallback((context: TerminalCoachMistakeContext) => {
    if (!onAskSara) return;

    const key = `${context.command}|${context.mistakeTitle}|${context.currentStepInstruction || ''}`;
    const now = Date.now();
    const previous = lastSaraInterventionRef.current;
    if (previous?.key === key && now - previous.timestamp < 5000) return;

    lastSaraInterventionRef.current = { key, timestamp: now };
    window.setTimeout(() => onAskSara(context), 0);
  }, [onAskSara]);

  // List of autocomplete candidates
  const autocompleteCandidates = [
    'help',
    'cortex help',
    'cortex missions',
    'cortex scenarios',
    'cortex start git_init_commit',
    'cortex scenario broken_repo_sync',
    'ls',
    'npm run dev',
    'npm run test',
    'npm test',
    'clear',
    'ts-node exercises.ts',
    'cat App.tsx',
    'cat Store.tsx',
    'cat notes.md',
    'cat exercises.ts',
    'nano App.tsx',
    'nano Store.tsx',
    'nano notes.md',
    'nano exercises.ts',
    'top',
    'history',
    'pwd',
    'whoami',
    'date',
    'cd exercises',
    'cd ..',
    'echo',
  ];

  // Sync session 1 history with parent terminalHistory when it changes externally (e.g. from chatbot compile)
  useEffect(() => {
    if (activeSessionId === 'bash-1') {
      setSessions(prev =>
        prev.map(s => (s.id === 'bash-1' ? { ...s, history: terminalHistory } : s))
      );
    }
  }, [terminalHistory, activeSessionId]);

  // F-010: Persist sessions to localStorage on changes
  useEffect(() => {
    persistSessions(sessions, activeSessionId);
  }, [sessions, activeSessionId]);

  // F-005: Save current input buffer to session when switching away, restore when switching to
  const prevActiveSessionRef = useRef<string>(activeSessionId);
  useEffect(() => {
    const prevId = prevActiveSessionRef.current;
    if (prevId !== activeSessionId) {
      // Save current input to the session being left
      setSessions(prev => prev.map(s =>
        s.id === prevId ? { ...s, inputBuffer: terminalInput, inputCursorOffset: cursorOffset } : s
      ));
      // Restore input from the session being entered
      const targetSession = sessions.find(s => s.id === activeSessionId);
      if (targetSession) {
        setTerminalInput(targetSession.inputBuffer || '');
        setCursorOffset(targetSession.inputCursorOffset || 0);
        setSelectionStart(targetSession.inputCursorOffset || 0);
        setSelectionEnd(targetSession.inputCursorOffset || 0);
      } else {
        setTerminalInput('');
        setCursorOffset(0);
        setSelectionStart(0);
        setSelectionEnd(0);
      }
      setSuggestion('');
      setAutocompleteMatches([]);
      setAutocompleteIndex(-1);
      setPasteBuffer(null);
      prevActiveSessionRef.current = activeSessionId;
    }
  }, [activeSessionId]);

  // Estimate Row Height based on character wrapping and layout width
  const estimateRowHeight = (lineText: string, widthVal: number): number => {
    if (!lineText) return 22;
    const cleanText = lineText.replace(/\x1b\[[0-9;]*m/g, '');
    const charWidth = 7.2;
    const padding = 32;
    const availableWidth = Math.max(100, widthVal - padding);
    const charsPerLine = Math.floor(availableWidth / charWidth);

    const subLines = cleanText.split('\n');
    let totalHeight = 0;
    for (const subLine of subLines) {
      const len = subLine.length || 1;
      const linesCount = Math.ceil(len / charsPerLine);
      totalHeight += linesCount * 22;
    }
    return totalHeight;
  };

  // F-012: Use incremental computation with cached heights
  const prevHeightsRef = useRef<{ heights: number[]; offsets: number[]; total: number; len: number; width: number }>({ heights: [], offsets: [], total: 0, len: 0, width: 0 });

  const { rowHeights, rowOffsets, totalHeight } = React.useMemo(() => {
    const history = activeSession.history;
    const cached = prevHeightsRef.current;

    // If width changed, recalculate everything
    if (cached.width !== viewportWidth || history.length < cached.len) {
      const heights: number[] = [];
      const offsets: number[] = [];
      let accumulated = 0;

      for (let i = 0; i < history.length; i++) {
        const h = estimateRowHeight(history[i], viewportWidth);
        heights.push(h);
        offsets.push(accumulated);
        accumulated += h;
      }
      prevHeightsRef.current = { heights, offsets, total: accumulated, len: history.length, width: viewportWidth };
      return { rowHeights: heights, rowOffsets: offsets, totalHeight: accumulated };
    }

    // Incremental: only compute new rows appended since last calculation
    if (history.length > cached.len) {
      const heights = [...cached.heights];
      const offsets = [...cached.offsets];
      let accumulated = cached.total;

      for (let i = cached.len; i < history.length; i++) {
        const h = estimateRowHeight(history[i], viewportWidth);
        heights.push(h);
        offsets.push(accumulated);
        accumulated += h;
      }
      prevHeightsRef.current = { heights, offsets, total: accumulated, len: history.length, width: viewportWidth };
      return { rowHeights: heights, rowOffsets: offsets, totalHeight: accumulated };
    }

    // No change
    return { rowHeights: cached.heights, rowOffsets: cached.offsets, totalHeight: cached.total };
  }, [activeSession.history, viewportWidth]);

  // Keep bottom auto-scroll active on new outputs if user is already at the bottom
  useEffect(() => {
    if (terminalBodyRef.current) {
      const el = terminalBodyRef.current;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;

      const currentLen = activeSession.history.length;
      const prevLen = lastHistoryLenRef.current;
      lastHistoryLenRef.current = currentLen;

      if (currentLen > prevLen) {
        if (isAtBottom || prevLen === 0) {
          setTimeout(() => {
            el.scrollTop = el.scrollHeight;
          }, 0);
          setHasNewLogs(false);
        } else {
          setHasNewLogs(true);
        }
      } else {
        // Scroll to bottom on process changes or initial loads
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 0);
      }
    }
  }, [activeSession.history.length, activeSession.activeProcess, loading, totalHeight]);

  // Monitor terminal element client dimensions to keep viewportHeight/Width states updated
  useEffect(() => {
    if (!terminalBodyRef.current) return;
    const el = terminalBodyRef.current;
    setViewportHeight(el.clientHeight);
    setViewportWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
        setViewportWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeSession.activeProcess]);

  // Auto focus input when active session changes, loading finishes, or process completes/exits
  useEffect(() => {
    if (!loading && activeSession.activeProcess === 'none') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [loading, activeSessionId, activeSession.activeProcess]);

  // Restore focus on window/tab activation
  useEffect(() => {
    const handleWindowFocus = () => {
      if (activeSession.activeProcess === 'none' && document.activeElement === document.body) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [activeSession.activeProcess]);

  // Focus toggler via Ctrl+`
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        const terminalInputEl = inputRef.current;
        const editorTextareaEl = document.querySelector('textarea.cortex-editor-scroll') as HTMLTextAreaElement | null;

        if (document.activeElement === terminalInputEl) {
          if (editorTextareaEl) {
            editorTextareaEl.focus();
          }
        } else {
          setWorkspaceTab('terminal');
          setTimeout(() => {
            terminalInputEl?.focus();
          }, 50);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown as any);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown as any);
  }, [setWorkspaceTab]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setViewportHeight(target.clientHeight);
    setViewportWidth(target.clientWidth);

    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 40;
    if (isAtBottom) {
      setHasNewLogs(false);
    }
  };

  const scrollToBottom = () => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
      setHasNewLogs(false);
    }
  };

  // Mouse down on log row starts custom drag selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    const rowEl = target.closest('[data-row-index]');
    if (rowEl) {
      const idx = parseInt(rowEl.getAttribute('data-row-index') ?? '', 10);
      if (!isNaN(idx)) {
        setIsDragging(true);
        setDragStartRowIndex(idx);
        setDragEndRowIndex(idx);
      }
    } else {
      setDragStartRowIndex(null);
      setDragEndRowIndex(null);
    }
  };

  // Mouse move updates selection dragEndRowIndex and handles auto-scrolling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartRowIndex === null) return;

    if (terminalBodyRef.current) {
      const rect = terminalBodyRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const threshold = 30;
      if (relativeY < threshold) {
        terminalBodyRef.current.scrollTop -= 15;
      } else if (relativeY > rect.height - threshold) {
        terminalBodyRef.current.scrollTop += 15;
      }
    }

    const target = e.target as HTMLElement;
    const rowEl = target.closest('[data-row-index]');
    if (rowEl) {
      const idx = parseInt(rowEl.getAttribute('data-row-index') ?? '', 10);
      if (!isNaN(idx) && idx !== dragEndRowIndex) {
        setDragEndRowIndex(idx);
      }
    }
  };

  // Global mouseup to release log drag selections
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Ticking metrics simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => {
        let baseCpu = 1.2;
        let baseRam = 482;

        if (isServerRunning) {
          baseCpu += 8.5;
          baseRam += 124;
        }
        if (loading || activeSession.activeProcess === 'compile' || activeSession.activeProcess === 'test') {
          baseCpu += 62.0;
          baseRam += 280;
        }
        if (activeSession.activeProcess === 'top') {
          baseCpu += 3.0;
        }

        const nextCpu = Math.max(1.0, Math.min(99.0, baseCpu + (Math.random() - 0.5) * 4));
        const nextRam = Math.max(256, Math.min(2048, baseRam + Math.floor((Math.random() - 0.5) * 16)));
        return { cpu: parseFloat(nextCpu.toFixed(1)), ram: nextRam };
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isServerRunning, loading, activeSession.activeProcess]);

  // Synthesize terminal beep using Web Audio API
  const playBeepSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio blocked by browser policy
    }
  };

  // Trigger brief visual bell flash
  const triggerVisualBell = () => {
    setIsBellActive(true);
    playBeepSound();
    setTimeout(() => setIsBellActive(false), 150);
  };

  // Suggestion engine
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTerminalInput(val);
    const start = e.target.selectionStart ?? val.length;
    const end = e.target.selectionEnd ?? val.length;
    setSelectionStart(start);
    setSelectionEnd(end);
    setCursorOffset(start);

    // Close autocomplete dropdown on input change
    setAutocompleteIndex(-1);

    if (!val.trim()) {
      setSuggestion('');
      setAutocompleteMatches([]);
      return;
    }

    // F-006: Find ALL matches, not just first
    const allMatches = autocompleteCandidates.filter(
      c => c.startsWith(val.toLowerCase()) && c !== val.toLowerCase()
    );

    setAutocompleteMatches(allMatches);

    if (allMatches.length === 1) {
      setSuggestion(allMatches[0].substring(val.length));
    } else if (allMatches.length > 1) {
      // Show first match as ghost suggestion
      setSuggestion(allMatches[0].substring(val.length));
    } else {
      setSuggestion('');
    }
  };

  // F-002: Bracketed paste protection
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');

    if (pastedText.includes('\n') || pastedText.includes('\r')) {
      const lines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        // F-002: Buffer lines for user review instead of auto-executing
        setPasteBuffer(lines);
        return;
      }
    }

    const textToInsert = pastedText.replace(/\r?\n/g, ' ');
    const prevVal = terminalInput;
    const newVal = prevVal.slice(0, cursorOffset) + textToInsert + prevVal.slice(cursorOffset);
    setTerminalInput(newVal);
    const newOffset = cursorOffset + textToInsert.length;
    setCursorOffset(newOffset);
    setSelectionStart(newOffset);
    setSelectionEnd(newOffset);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newOffset, newOffset);
      }
    }, 0);
  };

  // F-002: Execute buffered paste lines
  const executePasteBuffer = () => {
    if (pasteBuffer) {
      executeCommand(pasteBuffer.join('\n'));
      setPasteBuffer(null);
    }
  };

  const cancelPasteBuffer = () => {
    setPasteBuffer(null);
    toast.info('Paste cancelled.');
  };

  // Click panel to focus input focus
  const focusInput = () => {
    if (activeSession.activeProcess === 'nano') {
      nanoTextareaRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  // Abort running processes (equivalent to Ctrl+C)
  const handleAbort = (sessId: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === sessId) {
          const appendedLogs = [...s.history];
          // Remove trailing empty prompt if it exists
          if (appendedLogs[appendedLogs.length - 1] === `lokeshgandreddy@MacBook-Pro ${s.currentDir} % `) {
            appendedLogs.pop();
          }
          appendedLogs.push(`lokeshgandreddy@MacBook-Pro ${s.currentDir} % ^C`);
          appendedLogs.push(`lokeshgandreddy@MacBook-Pro ${s.currentDir} % `);

          if (s.activeProcess === 'dev') {
            setIsServerRunning(false);
            appendedLogs.splice(appendedLogs.length - 1, 0, '[Vite Dev Server] Process terminated.');
          }

          return {
            ...s,
            history: appendedLogs.slice(-50000),
            activeProcess: 'none',
          };
        }
        return s;
      })
    );

    if (sessId === 'bash-1') {
      setTerminalHistory(prev => {
        const clean = [...prev];
        if (clean[clean.length - 1] === 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ') {
          clean.pop();
        }
        clean.push('lokeshgandreddy@MacBook-Pro Vidhyalaya % ^C');
        clean.push('lokeshgandreddy@MacBook-Pro Vidhyalaya % ');
        return clean.slice(-50000);
      });
    }

    setTerminalInput('');
    setCursorOffset(0);
    setSuggestion('');
    setAutocompleteMatches([]);
    setAutocompleteIndex(-1);
    setPasteBuffer(null);
  };

  // F-016: Handle top exit via q key
  const handleTopExit = () => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSessionId && s.activeProcess === 'top') {
          return {
            ...s,
            activeProcess: 'none',
            history: [...s.history, `[top] Process monitor exited.`, `lokeshgandreddy@MacBook-Pro ${s.currentDir} % `].slice(-50000),
          };
        }
        return s;
      })
    );
  };

  // Interactive Command Executor
  const executeCommand = (cmdText: string) => {
    // F-001: Handle empty enter — just append a new prompt line
    const lines = cmdText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      // Empty enter: append new prompt line
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== activeSessionId) return s;
          const currentLogs = [...s.history];
          // Don't duplicate the trailing prompt — just push a new one
          if (!currentLogs[currentLogs.length - 1]?.endsWith('% ')) {
            currentLogs.push(`lokeshgandreddy@MacBook-Pro ${s.currentDir} % `);
          }
          // Push the empty command echo and new prompt
          currentLogs.push(`lokeshgandreddy@MacBook-Pro ${s.currentDir} % `);
          const finalHistory = currentLogs.slice(-50000);
          if (s.id === 'bash-1') {
            setTerminalHistory(finalHistory);
          }
          return { ...s, history: finalHistory };
        })
      );
      setTerminalInput('');
      setCursorOffset(0);
      setSuggestion('');
      setAutocompleteMatches([]);
      setAutocompleteIndex(-1);
      return;
    }

    // F-011: Track execution start time
    const execStartTime = performance.now();

    setSessions(prev => {
      return prev.map(s => {
        if (s.id !== activeSessionId) return s;

        let currentLogs = [...s.history];
        let currentDir = s.currentDir;
        let currentProcess = s.activeProcess;
        let historyStack = [...s.historyStack];
        let isError = false;
        let gitState = { ...s.gitState };
        let virtualFS = { ...s.virtualFS };

        for (const lineText of lines) {
          const trimmed = lineText.trim();

          // F-004: Prevent adjacent duplicate history entries
          if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== trimmed) {
            historyStack = [...historyStack, trimmed].slice(-50);
          }

          if (currentLogs[currentLogs.length - 1]?.endsWith('% ')) {
            currentLogs.pop();
          }
          currentLogs.push(`lokeshgandreddy@MacBook-Pro ${currentDir} % ${lineText}`);

          // 1. Safety Shield Check
          const safetyAlert = checkSafety(trimmed);
          if (safetyAlert) {
            const safetyLogs = formatSafetyResponse(safetyAlert);
            isError = true;
            currentLogs = [...currentLogs, ...safetyLogs];
            currentLogs.push(`lokeshgandreddy@MacBook-Pro ${currentDir} % `);
            continue;
          }

          const commandParts = trimmed.split(/\s+/);
          const mainCommand = commandParts[0].toLowerCase();
          const commandArg = commandParts.slice(1).join(' ').trim();

          let outputs: string[] = [];
          let nextProcess: TerminalSession['activeProcess'] = 'none';
          let nextDir = currentDir;

          switch (mainCommand) {
            case 'clear':
              currentLogs = [`lokeshgandreddy@MacBook-Pro ${currentDir} % `];
              break;

            case 'help':
              outputs = [
                'Vidyal.ai Learning Shell v2.0.0',
                'Simulated local learning workspace command suite:',
                '  ls               List files and folders in current directory',
                '  pwd              Print active directory path',
                '  mkdir [folder]   Create a new virtual directory',
                '  touch [file]     Create a new virtual file',
                '  cat [file]       Print contents of a virtual file',
                '  nano [file]      Open interactive text editor',
                '  cp [src] [dest]  Copy a file to another location',
                '  mv [src] [dest]  Move or rename a file',
                '  git init         Initialize virtual Git repo tracking',
                '  git status       Check staged/untracked changes',
                '  git add [path]   Stage file changes for commit',
                '  git commit -m    Commit snapshot of staged changes',
                '  git log          Display commit timeline history',
                '  git branch       Manage branches (checkout -b to branch)',
                '  cortex missions  List available coach missions',
                '  cortex scenarios List isolated repair sandboxes',
                '  cortex start [id] Start a mission (try git_init_commit)',
                '  cortex scenario [id] Start a sandbox scenario',
                '  npm run dev      Start development preview server',
                '  npm run test     Run Vitest diagnostic verification checks',
                '  clear            Clear shell display buffer',
                '  whoami / date    Display system environment info',
                ''
              ];
              break;

            case 'pwd':
              outputs = [`/Users/lokeshgandreddy/Sara/Vidhyalaya${currentDir === 'Vidhyalaya' ? '' : '/' + currentDir}`, ''];
              break;

            case 'whoami':
              outputs = ['lokeshgandreddy', ''];
              break;

            case 'date':
              outputs = [new Date().toString(), ''];
              break;

            case 'history':
              outputs = historyStack.map((h, i) => `  ${i + 1}  ${h}`);
              outputs.push('');
              break;

            case 'echo':
              outputs = [commandArg || '', ''];
              break;

            case 'ls': {
              const cleanDir = currentDir === 'Vidhyalaya' ? '' : currentDir + '/';
              const contents: string[] = [];

              Object.entries(virtualFS).forEach(([path, node]) => {
                if (path.startsWith(cleanDir)) {
                  const relPath = path.substring(cleanDir.length);
                  if (relPath && !relPath.includes('/')) {
                    const displayName = node.type === 'dir' ? `\x1b[1m\x1b[34m${relPath}/\x1b[0m` : relPath;
                    contents.push(displayName);
                  }
                }
              });

              outputs = contents.length > 0 ? [contents.join('   '), ''] : [''];
              break;
            }

            case 'cd':
              if (!commandArg || commandArg === '~' || commandArg === '/') {
                nextDir = 'Vidhyalaya';
              } else {
                const targetPath = resolvePath(currentDir, commandArg);
                if (targetPath === 'Vidhyalaya') {
                  nextDir = 'Vidhyalaya';
                } else if (virtualFS[targetPath] && virtualFS[targetPath].type === 'dir') {
                  if (targetPath === 'frontend' || targetPath === 'backend') {
                    outputs = [`cd: permission denied: accessing folders outside study workspace sandbox`, ''];
                    isError = true;
                  } else {
                    nextDir = targetPath;
                  }
                } else {
                  outputs = [`cd: no such file or directory: ${commandArg}`, ''];
                  isError = true;
                }
              }
              break;

            case 'mkdir':
              if (!commandArg) {
                outputs = ['mkdir: missing operand', ''];
                isError = true;
              } else {
                const targetPath = resolvePath(currentDir, commandArg);
                if (virtualFS[targetPath]) {
                  outputs = [`mkdir: ${commandArg}: File exists`, ''];
                  isError = true;
                } else {
                  const folderName = commandArg.split('/').pop() || commandArg;
                  virtualFS[targetPath] = {
                    name: folderName,
                    type: 'dir',
                  };
                  outputs = [''];
                }
              }
              break;

            case 'touch':
              if (!commandArg) {
                outputs = ['touch: missing file operand', ''];
                isError = true;
              } else {
                const targetPath = resolvePath(currentDir, commandArg);
                const fileName = commandArg.split('/').pop() || commandArg;
                const parts = targetPath.split('/');
                let parentExists = true;
                if (parts.length > 1) {
                  const parentPath = parts.slice(0, -1).join('/');
                  if (parentPath !== 'Vidhyalaya' && (!virtualFS[parentPath] || virtualFS[parentPath].type !== 'dir')) {
                    parentExists = false;
                  }
                }

                if (!parentExists) {
                  outputs = [`touch: ${commandArg}: No such file or directory`, ''];
                  isError = true;
                } else {
                  if (!virtualFS[targetPath]) {
                    virtualFS[targetPath] = {
                      name: fileName,
                      type: 'file',
                      content: '',
                    };
                  }
                  outputs = [''];
                }
              }
              break;

            case 'cat':
              if (!commandArg) {
                outputs = ['cat: missing filename', ''];
                isError = true;
              } else {
                const targetPath = resolvePath(currentDir, commandArg);
                const node = virtualFS[targetPath];
                if (node && node.type === 'file') {
                  outputs = (node.content || '').split('\n');
                  outputs.push('');
                } else if (node && node.type === 'dir') {
                  outputs = [`cat: ${commandArg}: Is a directory`, ''];
                  isError = true;
                } else {
                  outputs = [`cat: ${commandArg}: No such file or directory`, ''];
                  isError = true;
                }
              }
              break;

            case 'nano':
              if (!commandArg) {
                outputs = ['nano: missing filename specification', ''];
                isError = true;
              } else {
                const targetPath = resolvePath(currentDir, commandArg);
                const node = virtualFS[targetPath];
                setNanoFile(targetPath);
                setNanoBuffer(node ? (node.content || '') : '');
                setNanoExitPrompt('none');
                nextProcess = 'nano';
              }
              break;

            case 'cp':
              if (!commandArg) {
                outputs = ['cp: missing file operand', ''];
                isError = true;
              } else {
                const argsParts = commandArg.split(/\s+/);
                if (argsParts.length < 2) {
                  outputs = ['cp: missing destination file operand', ''];
                  isError = true;
                } else {
                  const srcPath = resolvePath(currentDir, argsParts[0]);
                  const destPath = resolvePath(currentDir, argsParts[1]);
                  const srcNode = virtualFS[srcPath];

                  if (!srcNode || srcNode.type !== 'file') {
                    outputs = [`cp: ${argsParts[0]}: No such file`, ''];
                    isError = true;
                  } else {
                    virtualFS[destPath] = {
                      name: destPath.split('/').pop() || destPath,
                      type: 'file',
                      content: srcNode.content || '',
                    };
                    outputs = [''];
                  }
                }
              }
              break;

            case 'mv':
              if (!commandArg) {
                outputs = ['mv: missing file operand', ''];
                isError = true;
              } else {
                const argsParts = commandArg.split(/\s+/);
                if (argsParts.length < 2) {
                  outputs = ['mv: missing destination file operand', ''];
                  isError = true;
                } else {
                  const srcPath = resolvePath(currentDir, argsParts[0]);
                  const destPath = resolvePath(currentDir, argsParts[1]);
                  const srcNode = virtualFS[srcPath];

                  if (!srcNode) {
                    outputs = [`mv: ${argsParts[0]}: No such file or directory`, ''];
                    isError = true;
                  } else {
                    virtualFS[destPath] = {
                      name: destPath.split('/').pop() || destPath,
                      type: srcNode.type,
                      content: srcNode.content,
                    };
                    delete virtualFS[srcPath];
                    outputs = [''];
                  }
                }
              }
              break;

            case 'top':
              nextProcess = 'top';
              break;

            case 'cortex': {
              const args = commandArg.split(/\s+/).filter(Boolean);
              const action = args[0]?.toLowerCase();
              const targetId = args[1];

              if (!action || action === 'help') {
                outputs = [
                  'Cortex Coach controls:',
                  '  cortex missions                 List available missions',
                  '  cortex scenarios                List isolated repair sandboxes',
                  '  cortex start git_init_commit    Start the first Git mission',
                  '  cortex scenario broken_repo_sync Start the merge-conflict sandbox',
                  '  cortex exit                     Leave the active mission or sandbox',
                  ''
                ];
              } else if (action === 'missions') {
                outputs = [
                  'Available missions:',
                  ...Object.values(MISSION_CATALOG).map(m => `  ${m.id.padEnd(20)} ${m.title} — ${m.track} (${m.difficulty})`),
                  ''
                ];
              } else if (action === 'scenarios') {
                outputs = [
                  'Available sandbox scenarios:',
                  ...Object.values(SCENARIO_CATALOG).map(scenario => `  ${scenario.scenarioId.padEnd(20)} ${scenario.title} — ${scenario.estimatedMinutes} min (${scenario.difficulty})`),
                  ''
                ];
              } else if (action === 'start' || action === 'mission') {
                if (!targetId) {
                  outputs = ['cortex: missing mission id. Try "cortex missions".', ''];
                  isError = true;
                } else if (MISSION_CATALOG[targetId]) {
                  startMission(targetId);
                  outputs = [
                    `Cortex mission started: ${MISSION_CATALOG[targetId].title}`,
                    `Next step: ${MISSION_CATALOG[targetId].steps[0]?.instruction || 'Follow the HUD.'}`,
                    ''
                  ];
                } else if (SCENARIO_CATALOG[targetId]) {
                  startScenario(targetId, JSON.stringify(virtualFS), JSON.stringify(gitState));
                  outputs = [
                    `Cortex sandbox starting: ${SCENARIO_CATALOG[targetId].title}`,
                    `Next step: ${SCENARIO_CATALOG[targetId].steps[0]?.instruction || 'Follow the HUD.'}`,
                    ''
                  ];
                } else {
                  outputs = [`cortex: unknown mission or scenario "${targetId}". Try "cortex missions" or "cortex scenarios".`, ''];
                  isError = true;
                }
              } else if (action === 'scenario' || action === 'sandbox') {
                if (!targetId) {
                  outputs = ['cortex: missing scenario id. Try "cortex scenarios".', ''];
                  isError = true;
                } else if (SCENARIO_CATALOG[targetId]) {
                  startScenario(targetId, JSON.stringify(virtualFS), JSON.stringify(gitState));
                  outputs = [
                    `Cortex sandbox starting: ${SCENARIO_CATALOG[targetId].title}`,
                    `Next step: ${SCENARIO_CATALOG[targetId].steps[0]?.instruction || 'Follow the HUD.'}`,
                    ''
                  ];
                } else {
                  outputs = [`cortex: unknown scenario "${targetId}". Try "cortex scenarios".`, ''];
                  isError = true;
                }
              } else if (action === 'exit') {
                if (activeScenario) {
                  exitScenario();
                  outputs = ['Cortex sandbox exit requested. Restoring your previous workspace state...', ''];
                } else if (activeMission) {
                  completeActiveMission();
                  outputs = ['Cortex mission stopped.', ''];
                } else {
                  outputs = ['No active Cortex mission or sandbox is running.', ''];
                }
              } else {
                outputs = [`cortex: unknown action "${action}". Try "cortex help".`, ''];
                isError = true;
              }
              break;
            }

            case 'npm':
              if (commandArg === 'run dev') {
                if (isServerRunning) {
                  outputs = ['[Vite] Server is already running on http://localhost:3000/', ''];
                } else {
                  nextProcess = 'dev';
                  setIsServerRunning(true);
                  setBrowserUrl('https://127.0.0.1:3003/dashboard');
                  outputs = [
                    '> vidyal.ai@0.0.0 dev',
                    '> vite --port 3000 --host',
                    '',
                    '  VITE v6.0.2  ready in 180 ms',
                    '  ➜  Local:   http://localhost:3000/',
                    '  ➜  Press Ctrl+C to stop dev server process preview',
                    ''
                  ];
                }
              } else if (commandArg === 'run test' || commandArg === 'test') {
                nextProcess = 'test';
                outputs = [
                  '> vidyal.ai@0.0.0 test',
                  '> vitest run --root=exercises',
                  '',
                  'RUN  v1.3.1 /Users/lokeshgandreddy/Sara/Vidhyalaya/exercises',
                  ' ✓ exercises/quiz.test.ts (3 tests passed)',
                  '',
                  'Test Files  1 passed (1)',
                  '     Tests  3 passed (3)',
                  `  Start at  ${new Date().toLocaleTimeString()}`,
                  '  Duration  380ms',
                  '[Vitest] Diagnostic complete. Exit code: 0',
                  ''
                ];
                nextProcess = 'none';
              } else {
                outputs = [`npm: command run-arguments not supported inside sandbox. Try "npm run dev" or "npm run test".`, ''];
                isError = true;
              }
              break;

            case 'ts-node':
              if (!commandArg) {
                outputs = ['ts-node: missing TS entry script module', ''];
                isError = true;
              } else {
                const baseFile = commandArg.replace('exercises/', '');
                const fileObj = virtualFS[resolvePath(currentDir, commandArg)];
                if (fileObj) {
                  outputs = [
                    `[Sandbox] Executing node-tsc compilation context...`,
                    `--- stdout ---`,
                    baseFile === 'exercises.ts'
                      ? `Fibonacci(10) = 55`
                      : baseFile === 'syllabus.json'
                      ? `Parsed syllabus AST structure successfully.`
                      : `Successfully parsed and executed ${baseFile}.`,
                    `--- exit code: 0 ---`,
                    ''
                  ];
                } else {
                  outputs = [`ts-node: error: ${commandArg} module not found.`, ''];
                  isError = true;
                }
              }
              break;

            case 'git': {
              gitState = syncFSWithGit(virtualFS, gitState);
              const gitResult = executeGitCommand(commandArg, gitState);
              outputs = gitResult.output;
              gitState = gitResult.newState;
              isError = gitResult.isError;
              virtualFS = syncGitWithFS(gitState, virtualFS);

              if (gitResult.teachingLines && gitResult.teachingLines.length > 0) {
                outputs = [...outputs, ...gitResult.teachingLines];
              }

              // Subcommand typo assistance
              if (gitResult.isError && commandArg) {
                const gitSubArgs = commandArg.split(/\s+/);
                const gitSub = gitSubArgs[0]?.toLowerCase();
                const closestGitSub = findClosestCommand(gitSub, GIT_SUBCOMMANDS);
                if (closestGitSub && !closestGitSub.isExact) {
                  outputs = [
                    ...outputs,
                    `💡 Did you mean: git ${closestGitSub.command}?`,
                    ''
                  ];
                }
              }
              break;
            }

            default: {
              const closest = findClosestCommand(mainCommand, KNOWN_COMMANDS);
              const intent = detectIntent(trimmed);

              if (closest && !closest.isExact) {
                outputs = formatMistakeResponse(trimmed, closest, intent);
                isError = true;
              } else if (intent) {
                outputs = formatMistakeResponse(trimmed, null, intent);
                isError = true;
              } else {
                outputs = [
                  `zsh: command not found: ${lineText}`,
                  'Type "help" to see available terminal sandbox commands.',
                  ''
                ];
                isError = true;
              }
            }
          }

          // AI Mentor Intercept Check
          if (isError || mainCommand === 'git' || mainCommand === 'cd' || mainCommand === 'npm') {
            const nextErrorCount = trimmed.toLowerCase() === lastErrorCommand.toLowerCase() ? consecutiveErrors + 1 : 1;
            setConsecutiveErrors(nextErrorCount);
            setLastErrorCommand(trimmed);

            const scaffold = detectMistakeScaffolding(trimmed, gitState, nextErrorCount);
            if (scaffold) {
              outputs = [
                '',
                `╭──────────────────────────────────────────────────╮`,
                `│ 🧠 AI MENTOR: ${scaffold.title.toUpperCase().padEnd(35)}│`,
                `├──────────────────────────────────────────────────┤`,
                ...scaffold.explanation.map(line => `│  ${line.padEnd(48)}│`),
                `╰──────────────────────────────────────────────────╯`,
                ''
              ];
              isError = true;

              // Log mistake to skill profile
              const category: TerminalCoachMistakeContext['category'] = trimmed.toLowerCase().startsWith('git ')
                ? 'git'
                : trimmed.toLowerCase().startsWith('npm ')
                ? 'npm'
                : trimmed.toLowerCase().startsWith('cd ')
                ? 'linux'
                : 'terminal';
              logMistake(category, scaffold.title.toLowerCase().replace(/\s+/g, '_'));

              const activeMissionConfig = activeMission ? MISSION_CATALOG[activeMission.missionId] : null;
              const activeScenarioConfig = activeScenario ? SCENARIO_CATALOG[activeScenario.scenarioId] : null;
              const activeTrack = activeMissionConfig || activeScenarioConfig;
              const activeStepIndex = activeMission ? activeMission.currentStepIndex : (activeScenario?.currentStepIndex || 0);
              const activeStep = activeTrack?.steps[activeStepIndex];
              requestSaraCoachIntervention({
                type: 'coach_mistake',
                command: trimmed,
                category,
                mistakeTitle: scaffold.title,
                mistakeLevel: scaffold.level,
                explanation: scaffold.explanation,
                currentDir,
                activeTrackTitle: activeTrack?.title,
                activeTrackKind: activeMissionConfig ? 'mission' : activeScenarioConfig ? 'scenario' : undefined,
                currentStepInstruction: activeStep?.instruction,
                currentStepHint: activeStep?.hints[0]
              });
            }
          } else {
            setConsecutiveErrors(0);
            setLastErrorCommand('');
          }

          currentLogs = [...currentLogs, ...outputs];
          currentDir = nextDir;
          currentProcess = nextProcess;

          // Cortex Step Verification Checks
          const activeMissionId = activeMission?.missionId;
          const activeScenarioId = activeScenario?.scenarioId;
          const missionConfig = activeMissionId ? MISSION_CATALOG[activeMissionId] : null;
          const scenarioConfig = activeScenarioId ? SCENARIO_CATALOG[activeScenarioId] : null;
          const currentConfig = missionConfig || scenarioConfig;
          const currentStepIdx = activeMission ? activeMission.currentStepIndex : (activeScenario?.currentStepIndex || 0);

          if (currentConfig && currentStepIdx < currentConfig.steps.length) {
            const step = currentConfig.steps[currentStepIdx];
            const isStepCompleted = verifyStepState(step, virtualFS as any, gitState, currentDir, trimmed);

            if (isStepCompleted) {
              const nextStepIdx = currentStepIdx + 1;
              currentLogs.push('');
              currentLogs.push(`\x1b[1m\x1b[32m✅ STEP COMPLETED: ${step.instruction}\x1b[0m`);

              if (nextStepIdx >= currentConfig.steps.length) {
                currentLogs.push('');
                currentLogs.push(`\x1b[1m\x1b[32m🎉 Congratulations! You have successfully completed "${currentConfig.title}".\x1b[0m`);
                currentLogs.push('');

                if (activeMission) {
                  setTimeout(() => {
                    completeActiveMission();
                  }, 100);
                } else if (activeScenario) {
                  setTimeout(() => {
                    exitScenario();
                  }, 100);
                }
              } else {
                currentLogs.push(`👉 Next step: ${currentConfig.steps[nextStepIdx].instruction}`);
                currentLogs.push('');

                if (activeMission) {
                  setTimeout(() => {
                    updateMissionStep(nextStepIdx);
                  }, 100);
                } else if (activeScenario) {
                  setTimeout(() => {
                    updateScenarioStep(nextStepIdx);
                  }, 100);
                }
              }

              logCommandExecution(trimmed, true);
            } else {
              logCommandExecution(trimmed, false);
            }
          } else {
            logCommandExecution(trimmed, !isError);
          }


          // Post-command explanation & progress feedback (Teaching Engine)
          if (nextProcess !== 'nano' && nextProcess !== 'top') {
            const expertise = getExpertiseLevel(trimmed);
            const explanation = formatCommandExplanation(trimmed, expertise);
            if (explanation && explanation.length > 0) {
              currentLogs = [...currentLogs, ...explanation];
            }
            trackCommandUsage(trimmed, isError);
          }

          // F-011: Append exit status and execution duration for non-interactive commands
          if (nextProcess !== 'nano' && nextProcess !== 'top' && nextProcess !== 'dev') {
            const execDuration = ((performance.now() - execStartTime) / 1000).toFixed(2);
            const exitCode = isError ? 1 : 0;
            currentLogs.push(`✓ Exit Code: ${exitCode} | Completed in ${execDuration}s`);
            currentLogs.push(`lokeshgandreddy@MacBook-Pro ${currentDir} % `);
          } else if (nextProcess === 'dev') {
            // Dev server stays running, no exit status
          }
        }

        const finalHistory = currentLogs.slice(-50000);
        if (activeSessionId === 'bash-1') {
          setTerminalHistory(finalHistory);
        }

        return {
          ...s,
          history: finalHistory,
          currentDir,
          historyStack,
          historyIndex: -1,
          activeProcess: currentProcess,
          gitState,
          virtualFS,
          dirtyInputBuffer: '', // F-003: Clear dirty buffer on command execution
        };
      });
    });

    setTerminalInput('');
    setCursorOffset(0);
    setSuggestion('');
    setAutocompleteMatches([]);
    setAutocompleteIndex(-1);
  };

  // Keyboard navigation & control keys listener
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // F-014: Handle backspace bell check here instead of deprecated onKeyPress
    if (e.key === 'Backspace' && !terminalInput) {
      triggerVisualBell();
    }

    // Esc key to escape the terminal tab trap
    if (e.key === 'Escape') {
      // Also dismiss paste buffer and autocomplete
      if (pasteBuffer) {
        cancelPasteBuffer();
        return;
      }
      if (autocompleteMatches.length > 1) {
        setAutocompleteMatches([]);
        setAutocompleteIndex(-1);
        return;
      }
      setTabBypass(true);
      toast.info('Press Tab to exit terminal focus.');
      return;
    }

    // Reset tabBypass on any other key
    if (e.key !== 'Escape' && e.key !== 'Tab') {
      setTabBypass(false);
    }

    // Delete key Down - delete character in front of cursor
    if (e.key === 'Delete') {
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const left = terminalInput.slice(0, selectionStart);
        const right = terminalInput.slice(selectionEnd);
        const newVal = left + right;
        setTerminalInput(newVal);
        setCursorOffset(selectionStart);
        setSelectionStart(selectionStart);
        setSelectionEnd(selectionStart);
        if (inputRef.current) {
          inputRef.current.value = newVal;
          inputRef.current.setSelectionRange(selectionStart, selectionStart);
        }
      } else {
        if (cursorOffset < terminalInput.length) {
          e.preventDefault();
          const left = terminalInput.slice(0, cursorOffset);
          const right = terminalInput.slice(cursorOffset + 1);
          const newVal = left + right;
          setTerminalInput(newVal);
          if (inputRef.current) {
            inputRef.current.value = newVal;
            inputRef.current.setSelectionRange(cursorOffset, cursorOffset);
          }
        }
      }
      return;
    }

    // 0. Developer Shortcut Keys
    // Ctrl+A / Home - Move cursor to start of input
    if ((e.ctrlKey && e.key === 'a') || e.key === 'Home') {
      e.preventDefault();
      setCursorOffset(0);
      setSelectionStart(0);
      setSelectionEnd(0);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(0, 0);
      }
      return;
    }

    // Ctrl+E / End - Move cursor to end of input
    if ((e.ctrlKey && e.key === 'e') || e.key === 'End') {
      e.preventDefault();
      const len = terminalInput.length;
      setCursorOffset(len);
      setSelectionStart(len);
      setSelectionEnd(len);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(len, len);
      }
      return;
    }

    // Ctrl+U - Clear line before cursor
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      const right = terminalInput.slice(cursorOffset);
      setTerminalInput(right);
      setCursorOffset(0);
      setSelectionStart(0);
      setSelectionEnd(0);
      if (inputRef.current) {
        inputRef.current.value = right;
        inputRef.current.setSelectionRange(0, 0);
      }
      return;
    }

    // Ctrl+K - Clear line after cursor
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const left = terminalInput.slice(0, cursorOffset);
      setTerminalInput(left);
      setSelectionStart(cursorOffset);
      setSelectionEnd(cursorOffset);
      if (inputRef.current) {
        inputRef.current.value = left;
        inputRef.current.setSelectionRange(cursorOffset, cursorOffset);
      }
      return;
    }

    // Ctrl+W / Alt+Backspace - Delete word before cursor
    if ((e.ctrlKey && e.key === 'w') || (e.altKey && e.key === 'Backspace')) {
      e.preventDefault();
      const leftText = terminalInput.slice(0, cursorOffset);
      const rightText = terminalInput.slice(cursorOffset);
      const match = leftText.match(/(\s*\S+)\s*$/);
      const deleteLen = match ? match[0].length : leftText.length;
      const newLeft = leftText.slice(0, -deleteLen);
      const newOffset = newLeft.length;
      const newVal = newLeft + rightText;
      setTerminalInput(newVal);
      setCursorOffset(newOffset);
      setSelectionStart(newOffset);
      setSelectionEnd(newOffset);
      if (inputRef.current) {
        inputRef.current.value = newVal;
        inputRef.current.setSelectionRange(newOffset, newOffset);
      }
      return;
    }

    // Alt+ArrowLeft - Skip left by word boundary
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      const leftText = terminalInput.slice(0, cursorOffset);
      const match = leftText.match(/(\s*\S+)\s*$/);
      const skipLen = match ? match[0].length : leftText.length;
      const newOffset = cursorOffset - skipLen;
      setCursorOffset(newOffset);
      setSelectionStart(newOffset);
      setSelectionEnd(newOffset);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newOffset, newOffset);
      }
      return;
    }

    // Alt+ArrowRight - Skip right by word boundary
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      const rightText = terminalInput.slice(cursorOffset);
      const matchSkip = rightText.match(/^\s*\S+/);
      const skipLen = matchSkip ? matchSkip[0].length : rightText.length;
      const newOffset = cursorOffset + skipLen;
      setCursorOffset(newOffset);
      setSelectionStart(newOffset);
      setSelectionEnd(newOffset);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newOffset, newOffset);
      }
      return;
    }

    // Ctrl+D - Exit current session if input is empty
    if (e.ctrlKey && e.key === 'd') {
      if (!terminalInput) {
        e.preventDefault();
        closeSessionTab(activeSessionId, e as any);
        return;
      }
    }

    // 1. Tab autocompletion
    if (e.key === 'Tab') {
      if (tabBypass) {
        setTabBypass(false);
        return;
      }
      e.preventDefault();

      // F-006: Multi-match autocomplete navigation
      if (autocompleteMatches.length > 1) {
        // Navigate dropdown
        const nextIdx = e.shiftKey
          ? (autocompleteIndex <= 0 ? autocompleteMatches.length - 1 : autocompleteIndex - 1)
          : (autocompleteIndex + 1) % autocompleteMatches.length;
        setAutocompleteIndex(nextIdx);
        const selected = autocompleteMatches[nextIdx];
        setTerminalInput(selected);
        setSuggestion('');
        setCursorOffset(selected.length);
        setSelectionStart(selected.length);
        setSelectionEnd(selected.length);
        if (inputRef.current) {
          inputRef.current.value = selected;
          setTimeout(() => {
            inputRef.current?.setSelectionRange(selected.length, selected.length);
          }, 0);
        }
        return;
      }

      if (suggestion) {
        const newVal = terminalInput + suggestion;
        setTerminalInput(newVal);
        setSuggestion('');
        setCursorOffset(newVal.length);
        setSelectionStart(newVal.length);
        setSelectionEnd(newVal.length);
        setAutocompleteMatches([]);
        setAutocompleteIndex(-1);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newVal.length, newVal.length);
          }
        }, 0);
      } else {
        triggerVisualBell();
      }
      return;
    }

    // 2. Command history Up/Down
    if (e.key === 'ArrowUp') {
      // F-006: If autocomplete dropdown is open, navigate it
      if (autocompleteMatches.length > 1) {
        e.preventDefault();
        const nextIdx = autocompleteIndex <= 0 ? autocompleteMatches.length - 1 : autocompleteIndex - 1;
        setAutocompleteIndex(nextIdx);
        const selected = autocompleteMatches[nextIdx];
        setTerminalInput(selected);
        setSuggestion('');
        setCursorOffset(selected.length);
        setSelectionStart(selected.length);
        setSelectionEnd(selected.length);
        return;
      }

      e.preventDefault();
      const stack = activeSession.historyStack;
      if (stack.length === 0) {
        triggerVisualBell();
        return;
      }

      // F-003: Save dirty buffer on first ArrowUp
      if (activeSession.historyIndex === -1) {
        setSessions(prev =>
          prev.map(s => (s.id === activeSessionId ? { ...s, dirtyInputBuffer: terminalInput } : s))
        );
      }

      let newIdx = activeSession.historyIndex + 1;
      if (newIdx >= stack.length) {
        newIdx = stack.length - 1;
        triggerVisualBell();
      }

      setSessions(prev =>
        prev.map(s => (s.id === activeSessionId ? { ...s, historyIndex: newIdx } : s))
      );
      const val = stack[stack.length - 1 - newIdx];
      setTerminalInput(val);
      setCursorOffset(val.length);
      setSelectionStart(val.length);
      setSelectionEnd(val.length);
      setSuggestion('');
      setAutocompleteMatches([]);
      if (inputRef.current) {
        inputRef.current.value = val;
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(val.length, val.length);
          }
        }, 0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      // F-006: If autocomplete dropdown is open, navigate it
      if (autocompleteMatches.length > 1) {
        e.preventDefault();
        const nextIdx = (autocompleteIndex + 1) % autocompleteMatches.length;
        setAutocompleteIndex(nextIdx);
        const selected = autocompleteMatches[nextIdx];
        setTerminalInput(selected);
        setSuggestion('');
        setCursorOffset(selected.length);
        setSelectionStart(selected.length);
        setSelectionEnd(selected.length);
        return;
      }

      e.preventDefault();
      const stack = activeSession.historyStack;
      let newIdx = activeSession.historyIndex - 1;

      if (newIdx < -1) {
        newIdx = -1;
        triggerVisualBell();
      }

      setSessions(prev =>
        prev.map(s => (s.id === activeSessionId ? { ...s, historyIndex: newIdx } : s))
      );

      // F-003: Restore dirty buffer when returning to index -1
      const val = newIdx === -1 ? activeSession.dirtyInputBuffer : stack[stack.length - 1 - newIdx];
      setTerminalInput(val);
      setCursorOffset(val.length);
      setSelectionStart(val.length);
      setSelectionEnd(val.length);
      setSuggestion('');
      setAutocompleteMatches([]);
      if (inputRef.current) {
        inputRef.current.value = val;
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(val.length, val.length);
          }
        }, 0);
      }
      return;
    }

    // 3. Right arrow to accept suggestions or update cursor position
    if (e.key === 'ArrowRight' && suggestion && inputRef.current?.selectionStart === terminalInput.length) {
      const newVal = terminalInput + suggestion;
      setTerminalInput(newVal);
      setSuggestion('');
      setCursorOffset(newVal.length);
      setSelectionStart(newVal.length);
      setSelectionEnd(newVal.length);
      setAutocompleteMatches([]);
      setAutocompleteIndex(-1);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newVal.length, newVal.length);
        }
      }, 0);
      return;
    }

    // Sync offset on single cursor navigation keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setTimeout(syncCursorOffset, 0);
    }

    // 4. Ctrl+C Process Interrupt
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (pasteBuffer) {
        cancelPasteBuffer();
        return;
      }
      handleAbort(activeSessionId);
      return;
    }

    // 5. Ctrl+L Screen Clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? { ...s, history: [`lokeshgandreddy@MacBook-Pro ${s.currentDir} % `] }
            : s
        )
      );
      if (activeSessionId === 'bash-1') {
        setTerminalHistory([`lokeshgandreddy@MacBook-Pro Vidhyalaya % `]);
      }
      setCursorOffset(0);
      setSelectionStart(0);
      setSelectionEnd(0);
      return;
    }

    // F-002: Enter to execute paste buffer if active
    if (e.key === 'Enter') {
      e.preventDefault();
      if (pasteBuffer) {
        executePasteBuffer();
        return;
      }
      executeCommand(terminalInput);
    }
  };

  // Add Session tab
  const addSessionTab = () => {
    // F-015: Use collision-safe ID generation
    const nextId = generateSessionId();
    const nextNum = sessions.length + 1;
    const nextName = `bash (${nextNum})`;

    setSessions(prev => [
      ...prev,
      {
        id: nextId,
        name: nextName,
        history: [
          'Terminal Session initialized successfully.',
          `lokeshgandreddy@MacBook-Pro Vidhyalaya % `
        ],
        currentDir: 'Vidhyalaya',
        historyStack: [],
        historyIndex: -1,
        activeProcess: 'none',
        inputBuffer: '',
        inputCursorOffset: 0,
        dirtyInputBuffer: '',
        gitState: createInitialGitRepo(),
        virtualFS: createDefaultVirtualFS(),
      }
    ]);
    setActiveSessionId(nextId);
    setTerminalInput('');
    setCursorOffset(0);
    setSelectionStart(0);
    setSelectionEnd(0);
    setSuggestion('');
    setAutocompleteMatches([]);
    setAutocompleteIndex(-1);
    toast.success(`Session ${nextName} initialized.`);
  };

  // Remove Session tab
  const closeSessionTab = (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      toast.error('Must keep at least one terminal session open.');
      return;
    }

    const updated = sessions.filter(s => s.id !== sessId);
    setSessions(updated);
    if (activeSessionId === sessId) {
      setActiveSessionId(updated[updated.length - 1].id);
    }
    toast.info('Terminal Session terminated.');
  };

  // Nano Key Events Handler
  const handleNanoKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Ctrl+O to WriteOut
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      setNanoExitPrompt('filename_ask');
      setNanoTempFilename(nanoFile);
      return;
    }

    // 2. Ctrl+X to Exit
    if (e.ctrlKey && e.key === 'x') {
      e.preventDefault();
      const originalFile = editorFiles.find(f => f.name.toLowerCase() === nanoFile.toLowerCase());
      const isModified = originalFile ? originalFile.content !== nanoBuffer : !!nanoBuffer;

      if (isModified) {
        setNanoExitPrompt('save_ask');
      } else {
        exitNano(false);
      }
      return;
    }

    // 3. Ctrl+C to Cancel any exit prompt
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (nanoExitPrompt !== 'none') {
        setNanoExitPrompt('none');
      }
    }
  };

  const exitNano = (saveChanges: boolean) => {
    if (saveChanges) {
      const fileToSave = nanoFile.trim() || 'untitled.txt';
      const fileName = fileToSave.split('/').pop() || fileToSave;

      setSessions(prev =>
        prev.map(s => {
          if (s.id === activeSessionId) {
            const updatedFS = { ...s.virtualFS };
            updatedFS[fileToSave] = {
              name: fileName,
              type: 'file',
              content: nanoBuffer
            };
            return {
              ...s,
              virtualFS: updatedFS,
              activeProcess: 'none',
              history: [...s.history, `[Nano] Editor exited. Wrote file to VFS: ${fileToSave}`, `lokeshgandreddy@MacBook-Pro ${s.currentDir} % `].slice(-50000),
            };
          }
          return s;
        })
      );

      setEditorFiles(prev => {
        const fileExists = prev.some(f => f.name.toLowerCase() === fileName.toLowerCase());
        const newFile = {
          name: fileName,
          path: fileToSave.includes('/') ? fileToSave : `exercises/${fileToSave}`,
          language: fileName.endsWith('.json') ? 'json' : fileName.endsWith('.ts') ? 'typescript' : fileName.endsWith('.md') ? 'markdown' : 'tsx',
          content: nanoBuffer
        };

        if (fileExists) {
          return prev.map(f => f.name.toLowerCase() === fileName.toLowerCase() ? newFile : f);
        }
        return [...prev, newFile];
      });

      setSelectedEditorFile(fileName);
      toast.success(`[Nano] Wrote file buffer to workspace: ${fileName}`);
    } else {
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? {
                ...s,
                activeProcess: 'none',
                history: [...s.history, `[Nano] Editor exited. Buffer discarded.`, `lokeshgandreddy@MacBook-Pro ${s.currentDir} % `].slice(-50000),
              }
            : s
        )
      );
    }

    setNanoExitPrompt('none');
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (dragStartRowIndex !== null && dragEndRowIndex !== null && dragStartRowIndex !== dragEndRowIndex) {
      e.preventDefault();
      const start = Math.min(dragStartRowIndex, dragEndRowIndex);
      const end = Math.max(dragStartRowIndex, dragEndRowIndex);
      const selectedLines = activeSession.history.slice(start, end + 1);

      const cleanLines = selectedLines.map(line => {
        return line.replace(/\x1b\[[0-9;]*m/g, '');
      });

      e.clipboardData.setData('text/plain', cleanLines.join('\n'));
      toast.success('Selected terminal lines copied.');
    }
  };

  return (
    <div
      onClick={focusInput}
      onCopy={handleCopy}
      className={`flex-1 flex flex-col justify-between h-full overflow-hidden font-mono text-white/80 bg-[#161616] border-l relative select-text cursor-text transition-all duration-200 ${
        isFocused
          ? 'border-emerald-500/35 ring-1 ring-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.04)]'
          : 'border-white/[0.04]'
      } ${
        isBellActive ? 'cortex-terminal-bell-flash' : ''
      }`}
    >
      {/* 1. Terminal Chrome Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#1a1a1a] px-3.5 py-2 select-none shrink-0 text-white/40 text-[10px]">
        {/* Chrome Traffic lights & Sessions */}
        <div className="flex items-center gap-3">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full cortex-dot-red hover:opacity-85" />
            <span className="w-3 h-3 rounded-full cortex-dot-yellow hover:opacity-85" />
            <span className="w-3 h-3 rounded-full cortex-dot-green hover:opacity-85" />
          </div>

          {/* Session Tab buttons */}
          <div className="flex items-center gap-1" role="tablist" aria-label="Terminal sessions tabs">
            {sessions.map(s => (
              <div
                key={s.id}
                tabIndex={0}
                role="tab"
                aria-selected={activeSessionId === s.id}
                aria-label={`Terminal session: ${s.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSessionId(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSessionId(s.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                  activeSessionId === s.id
                    ? 'bg-[#161616] border border-white/[0.06] text-white'
                    : 'hover:bg-white/[0.03] text-neutral-400 hover:text-white'
                }`}
              >
                <Terminal size={10} className={activeSessionId === s.id ? 'text-emerald-400' : ''} />
                <span className="font-bold text-[9px]">{s.name}</span>
                {sessions.length > 1 && (
                  <button
                    tabIndex={0}
                    onClick={(e) => closeSessionTab(s.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        closeSessionTab(s.id, e as any);
                      }
                    }}
                    className="p-[1px] rounded hover:bg-white/10 hover:text-rose-400 outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    aria-label={`Close session: ${s.name}`}
                  >
                    <X size={8} />
                  </button>
                )}
              </div>
            ))}
            <button
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                addSessionTab();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  addSessionTab();
                }
              }}
              className="p-1 rounded hover:bg-white/5 text-neutral-400 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
              title="Add Session Tab"
              aria-label="Add session tab"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>

        {/* Visualized metrics widget & active port status */}
        <div className="flex items-center gap-4 text-[9.5px]">
          {isServerRunning && (
            <div className="flex items-center gap-1.5 text-emerald-400/90 font-bold bg-emerald-500/[0.03] border border-emerald-500/10 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>localhost:3000</span>
            </div>
          )}
          {activeSession.activeProcess !== 'none' && (
            <button
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleAbort(activeSessionId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAbort(activeSessionId);
                }
              }}
              className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-bold tracking-wider uppercase text-[8px] outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
              aria-label="Stop running process"
            >
              Stop Process
            </button>
          )}
          <div className="flex items-center gap-3 font-mono border-l border-white/[0.04] pl-3">
            <span className="flex items-center gap-1">
              <span className="text-neutral-400">CPU:</span>
              <span className={`tabular-nums font-semibold ${metrics.cpu > 50 ? 'text-amber-400' : 'text-neutral-300'}`}>
                {metrics.cpu}%
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-neutral-400">MEM:</span>
              <span className="tabular-nums font-semibold text-neutral-300">{metrics.ram}MB</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Body View Panel */}
      <div className="flex-1 overflow-hidden relative p-4">
        {/* Case A: Nano Editor */}
        {activeSession.activeProcess === 'nano' && (
          <div className="nano-editor-container rounded-lg border border-white/[0.06] shadow-xl absolute inset-4" role="application" aria-label="GNU Nano Editor Sandbox">
            <div className="nano-editor-header select-none">
              GNU nano 5.4 - File: {nanoFile || 'untitled.txt'}
            </div>

            <textarea
              ref={nanoTextareaRef}
              className="nano-editor-body"
              value={nanoBuffer}
              onChange={e => setNanoBuffer(e.target.value)}
              onKeyDown={handleNanoKeyDown}
              autoFocus
              aria-label="Nano editor text area input"
            />

            {/* Nano footer with exit states */}
            <div className="nano-editor-footer select-none font-mono">
              {nanoExitPrompt === 'save_ask' ? (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/25 p-2 rounded text-amber-400 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={13} />
                    <span>Save modified buffer? (Answering "No" will DISCARD changes.)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => exitNano(true)}
                      className="px-2.5 py-0.5 bg-amber-500 text-black hover:bg-amber-400 font-bold rounded cursor-pointer text-[10.5px]"
                    >
                      Y - Yes
                    </button>
                    <button
                      onClick={() => exitNano(false)}
                      className="px-2.5 py-0.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded cursor-pointer text-[10.5px]"
                    >
                      N - No
                    </button>
                    <button
                      onClick={() => setNanoExitPrompt('none')}
                      className="px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded cursor-pointer text-[10.5px]"
                    >
                      Ctrl+C - Cancel
                    </button>
                  </div>
                </div>
              ) : nanoExitPrompt === 'filename_ask' ? (
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/25 p-2 rounded text-blue-400 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span>File Name to Write:</span>
                    <input
                      type="text"
                      className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none w-48 font-mono text-[11px]"
                      value={nanoTempFilename}
                      onChange={e => setNanoTempFilename(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setNanoFile(nanoTempFilename);
                          exitNano(true);
                        } else if (e.key === 'Escape') {
                          setNanoExitPrompt('none');
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <span className="text-[10px] text-white/40">Press Enter to Confirm, Esc to Cancel</span>
                </div>
              ) : (
                <div className="nano-shortcut-grid text-[9px]">
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^G</span> <span className="nano-shortcut-label">Get Help</span></div>
                  <div className="nano-shortcut-item" onClick={() => { setNanoExitPrompt('filename_ask'); setNanoTempFilename(nanoFile); }}><span className="nano-shortcut-key">^O</span> <span className="nano-shortcut-label">WriteOut</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^W</span> <span className="nano-shortcut-label">Where Is</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^K</span> <span className="nano-shortcut-label">Cut Text</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^J</span> <span className="nano-shortcut-label">Justify</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^C</span> <span className="nano-shortcut-label">Cur Pos</span></div>
                  <div className="nano-shortcut-item" onClick={() => handleNanoKeyDown({ ctrlKey: true, key: 'x', preventDefault: () => {} } as any)}><span className="nano-shortcut-key">^X</span> <span className="nano-shortcut-label">Exit Editor</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^R</span> <span className="nano-shortcut-label">Read File</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^\</span> <span className="nano-shortcut-label">Replace</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^U</span> <span className="nano-shortcut-label">Uncut Text</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^T</span> <span className="nano-shortcut-label">To Spell</span></div>
                  <div className="nano-shortcut-item"><span className="nano-shortcut-key">^_</span> <span className="nano-shortcut-label">Go To Line</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Case B: System Top process view */}
        {activeSession.activeProcess === 'top' && (
          <div className="w-full h-full bg-[#0d0f12] p-4 text-[11px] leading-relaxed rounded-lg border border-white/[0.06] overflow-y-auto select-none" role="application" aria-label="Process Monitor Top Sandbox">
            <div className="text-white/60 font-mono mb-4 border-b border-white/[0.04] pb-2">
              <div>Processes: 104 total, 3 running, 101 sleeping, 412 threads</div>
              <div className="mt-1">CPU usage: {metrics.cpu}% user, 2.8% sys, {(97.2 - metrics.cpu).toFixed(1)}% idle</div>
              <div className="mt-1">PhysMem: {metrics.ram}M used, {(2048 - metrics.ram)}M free. (2048M total sandboxed limit)</div>
            </div>

            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.04] text-[9.5px]">
                  <th className="py-1">PID</th>
                  <th className="py-1">COMMAND</th>
                  <th className="py-1">%CPU</th>
                  <th className="py-1">%MEM</th>
                  {viewportWidth >= 500 && <th className="py-1">TIME</th>}
                  {viewportWidth >= 500 && <th className="py-1">STATE</th>}
                </tr>
              </thead>
              <tbody className="text-white/80 text-[10.5px]">
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-1 font-bold text-blue-400">1001</td>
                  <td className="py-1 truncate max-w-[100px]" title="zsh (bash)">zsh (bash)</td>
                  <td className="py-1">0.1</td>
                  <td className="py-1">1.2</td>
                  {viewportWidth >= 500 && <td className="py-1">0:01.42</td>}
                  {viewportWidth >= 500 && <td className="py-1 text-emerald-400 font-semibold">sleeping</td>}
                </tr>
                {isServerRunning && (
                  <tr className="hover:bg-white/[0.02] bg-emerald-500/[0.02]">
                    <td className="py-1 font-bold text-blue-400">1002</td>
                    <td className="py-1 truncate max-w-[100px]" title="node (vite-dev-server)">node (vite-dev-server)</td>
                    <td className="py-1">4.5</td>
                    <td className="py-1">8.2</td>
                    {viewportWidth >= 500 && <td className="py-1">0:12.80</td>}
                    {viewportWidth >= 500 && <td className="py-1 text-emerald-400 font-semibold">running</td>}
                  </tr>
                )}
                {loading && (
                  <tr className="hover:bg-white/[0.02] bg-blue-500/[0.02]">
                    <td className="py-1 font-bold text-blue-400">1003</td>
                    <td className="py-1 truncate max-w-[100px]" title="sara-compiler-agent">sara-compiler-agent</td>
                    <td className="py-1">54.2</td>
                    <td className="py-1">14.5</td>
                    {viewportWidth >= 500 && <td className="py-1">0:04.15</td>}
                    {viewportWidth >= 500 && <td className="py-1 text-emerald-400 font-semibold">running</td>}
                  </tr>
                )}
                <tr className="hover:bg-white/[0.02] bg-white/[0.04]">
                  <td className="py-1 font-bold text-blue-400">1005</td>
                  <td className="py-1 truncate max-w-[100px]" title="top -monitor">top -monitor</td>
                  <td className="py-1">2.4</td>
                  <td className="py-1">2.1</td>
                  {viewportWidth >= 500 && <td className="py-1">0:00.82</td>}
                  {viewportWidth >= 500 && <td className="py-1 text-emerald-400 font-semibold">running</td>}
                </tr>
              </tbody>
            </table>

            {/* F-016: Fixed q exit — calls handleTopExit instead of executeCommand */}
            <div className="mt-8 text-white/35 font-mono text-[9px] select-none text-center">
              Press <span className="bg-white/10 px-1 py-0.5 rounded text-white font-bold select-none cursor-pointer hover:bg-white/20" onClick={handleTopExit}>q</span> or <span className="font-bold">Ctrl+C</span> to exit process monitor.
            </div>
          </div>
        )}

        {/* Case C: Standard bash console lines scrollback */}
        {activeSession.activeProcess !== 'nano' && activeSession.activeProcess !== 'top' && (
          <div
            ref={terminalBodyRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            className="w-full h-full overflow-y-auto space-y-1.5 text-[11.5px] leading-relaxed custom-scrollbar font-mono text-white/95 pr-1 relative"
            role="log"
            aria-live="polite"
            aria-label="Terminal scrollback history"
          >
            {/* Floating scroll-to-bottom notification badge */}
            {hasNewLogs && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToBottom();
                }}
                className="absolute bottom-4 right-6 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-blue-400/30 flex items-center gap-1.5 animate-bounce select-none cursor-pointer z-50"
              >
                <ArrowDown size={11} strokeWidth={3} />
                <span>New Output</span>
              </button>
            )}

            {/* Virtualized scroll container spacer */}
            <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
              {/* Visible viewport window translation */}
              {(() => {
                const totalLines = activeSession.history.length;
                const startIndex = findStartIndex(rowOffsets, scrollTop);
                const endIndex = findEndIndex(rowOffsets, scrollTop + viewportHeight);
                const visibleHistory = activeSession.history.slice(startIndex, endIndex + 1);

                return visibleHistory.map((log, offsetIdx) => {
                  const idx = startIndex + offsetIdx;
                  const classification = classifyOutputLine(log);

                  const isSelected = dragStartRowIndex !== null && dragEndRowIndex !== null &&
                    dragStartRowIndex !== dragEndRowIndex &&
                    idx >= Math.min(dragStartRowIndex, dragEndRowIndex) &&
                    idx <= Math.max(dragStartRowIndex, dragEndRowIndex);

                  return (
                    <div
                      key={idx}
                      data-row-index={idx}
                      style={{
                        position: 'absolute',
                        top: `${rowOffsets[idx]}px`,
                        height: `${rowHeights[idx]}px`,
                        left: 0,
                        right: 0
                      }}
                      className={`whitespace-pre-wrap select-text px-1 rounded transition-colors ${
                        isSelected ? 'bg-emerald-500/15 text-white' : ''
                      }`}
                    >
                      {/* F-008: Proper color hierarchy for all line types */}
                      {classification === 'prompt-command' ? (
                        <span>
                          <span className="text-emerald-500 font-bold select-none">lokeshgandreddy@MacBook-Pro</span>
                          <span className="text-white/60 select-none"> {log.split(' % ')[0].split(' ').pop()} % </span>
                          <span className="text-white font-semibold">{renderAnsiLine(log.split(' % ')[1])}</span>
                        </span>
                      ) : classification === 'prompt-empty' ? (
                        <span>
                          <span className="text-emerald-500 font-bold select-none">lokeshgandreddy@MacBook-Pro</span>
                          <span className="text-white/60 select-none"> {log.split(' % ')[0].split(' ').pop()} % </span>
                        </span>
                      ) : (
                        <span className={getLineClasses(classification)}>{renderAnsiLine(log)}</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Inline execution loading indicator (e.g. while API fetching) */}
            {loading && (
              <div
                style={{
                  position: 'absolute',
                  top: `${totalHeight + 10}px`,
                  left: 0,
                  right: 0
                }}
                className="flex items-center gap-2 text-white/40 animate-pulse mt-2 pl-1 font-mono"
              >
                <span className="w-1.5 h-3 bg-emerald-400 animate-blink" />
                <span>compiling blueprint graph...</span>
              </div>
            )}

            {/* F-002: Bracketed paste confirmation banner */}
            {pasteBuffer && (
              <div
                style={{
                  position: 'absolute',
                  top: `${totalHeight + 10}px`,
                  left: 0,
                  right: 0
                }}
                className="mx-1 mt-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold">
                    <AlertTriangle size={13} />
                    <span>{pasteBuffer.length} lines pasted. Press Enter to execute or Esc to cancel.</span>
                  </div>
                </div>
                <div className="max-h-[120px] overflow-y-auto bg-black/30 rounded p-2 text-[10px] text-slate-300 font-mono space-y-0.5">
                  {pasteBuffer.slice(0, 20).map((line, i) => (
                    <div key={i} className="truncate">{line}</div>
                  ))}
                  {pasteBuffer.length > 20 && (
                    <div className="text-white/30 italic">... and {pasteBuffer.length - 20} more lines</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={executePasteBuffer}
                    className="px-3 py-1 bg-amber-500 text-black font-bold rounded text-[10px] hover:bg-amber-400"
                  >
                    Execute ({pasteBuffer.length} lines)
                  </button>
                  <button
                    onClick={cancelPasteBuffer}
                    className="px-3 py-1 bg-white/10 text-white/60 font-bold rounded text-[10px] hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bash Shell Typing Line Input */}
            {!isReadOnly && !loading && !pasteBuffer && (
              <div
                style={{
                  position: 'absolute',
                  top: `${totalHeight + (loading ? 40 : 10)}px`,
                  left: 0,
                  right: 0
                }}
                className="flex items-start flex-wrap font-mono text-[11.5px] leading-relaxed mt-2 pt-1 border-t border-white/[0.02]"
              >
                <span className="text-emerald-500 font-bold shrink-0 select-none">lokeshgandreddy@MacBook-Pro</span>
                <span className="text-white/60 shrink-0 font-mono select-none px-1">{activeSession.currentDir} %</span>
                <span className="relative flex-1 min-w-[200px] inline-flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className="absolute inset-0 w-full opacity-0 bg-transparent text-transparent border-none outline-none caret-transparent z-10 font-mono text-[11.5px]"
                    value={terminalInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={syncCursorOffset}
                    onClick={syncCursorOffset}
                    onSelect={handleSelect}
                    onPaste={handlePaste}
                    onCompositionStart={() => { setIsComposing(true); setComposingText(''); }}
                    onCompositionUpdate={(e) => setComposingText(e.data)}
                    onCompositionEnd={() => {
                      setIsComposing(false);
                      setComposingText('');
                      if (inputRef.current) {
                        const start = inputRef.current.selectionStart ?? 0;
                        const end = inputRef.current.selectionEnd ?? 0;
                        setSelectionStart(start);
                        setSelectionEnd(end);
                        setCursorOffset(start);
                      }
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoFocus
                    aria-label="Terminal Input"
                  />
                  <span className="font-mono text-[11.5px] text-white flex items-center whitespace-pre-wrap break-all pr-4 select-text">
                    {(() => {
                      const left = terminalInput.slice(0, cursorOffset);
                      const right = terminalInput.slice(cursorOffset);

                      if (isComposing && composingText) {
                        return (
                          <>
                            <span>{left}</span>
                            <span className="underline decoration-emerald-400 decoration-wavy text-slate-300">
                              {composingText}
                            </span>
                            <span className="inline-block w-[7.5px] h-[13px] bg-emerald-400 animate-blink-block shrink-0 align-middle" />
                            <span>{right}</span>
                          </>
                        );
                      }

                      if (selectionStart !== selectionEnd) {
                        const beforeSelection = terminalInput.slice(0, selectionStart);
                        const selectedText = terminalInput.slice(selectionStart, selectionEnd);
                        const afterSelection = terminalInput.slice(selectionEnd);
                        return (
                          <>
                            <span>{beforeSelection}</span>
                            <span className="bg-emerald-500/35 text-white rounded-[2px] selection-highlight">
                              {selectedText}
                            </span>
                            <span>{afterSelection}</span>
                          </>
                        );
                      }

                      return (
                        <>
                          {left.length > 0 ? (
                            <>
                              <span>{left.slice(0, -1)}</span>
                              <span className="whitespace-nowrap">
                                {left.slice(-1)}
                                {right ? (
                                  <span className="bg-emerald-400 text-[#161616] animate-blink-block font-bold">
                                    {right[0]}
                                  </span>
                                ) : (
                                  <span className="inline-block w-[7.5px] h-[13px] bg-emerald-400 animate-blink-block shrink-0 align-middle" />
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              {right ? (
                                <span className="bg-emerald-400 text-[#161616] animate-blink-block font-bold">
                                  {right[0]}
                                </span>
                              ) : (
                                <span className="inline-block w-[7.5px] h-[13px] bg-emerald-400 animate-blink-block shrink-0 align-middle" />
                              )}
                            </>
                          )}
                          {right.length > 0 && <span>{right.slice(1)}</span>}
                        </>
                      );
                    })()}
                    {suggestion && (
                      <span className="text-white/20 select-none pointer-events-none whitespace-pre">
                        {suggestion}
                      </span>
                    )}
                  </span>

                  {/* F-006: Multi-match autocomplete dropdown */}
                  {autocompleteMatches.length > 1 && (
                    <div className="absolute bottom-full left-0 mb-1 bg-[#1e1e2e] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[200px] max-h-[180px] overflow-y-auto z-50">
                      {autocompleteMatches.map((match, i) => (
                        <div
                          key={match}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTerminalInput(match);
                            setSuggestion('');
                            setCursorOffset(match.length);
                            setSelectionStart(match.length);
                            setSelectionEnd(match.length);
                            setAutocompleteMatches([]);
                            setAutocompleteIndex(-1);
                            inputRef.current?.focus();
                          }}
                          className={`px-3 py-1.5 text-[11px] font-mono cursor-pointer transition-colors ${
                            i === autocompleteIndex
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'text-slate-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          {match}
                        </div>
                      ))}
                      <div className="px-3 py-1 text-[9px] text-white/25 border-t border-white/[0.04] mt-1">
                        Tab/↑↓ to navigate • Enter to select
                      </div>
                    </div>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive prompt warning when readOnly */}
      {isReadOnly && (
        <div className="px-4 py-2 border-t border-white/[0.04] bg-[#1a1a1a]/50 text-white/30 text-[9px] select-none flex items-center gap-1.5">
          <Settings size={10} className="animate-spin text-white/20" />
          <span>Interactive inputs paused. Shell is locked during active path compilation tasks.</span>
        </div>
      )}
    </div>
  );
};
