import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPlan, scoutWebForResourcesJSON, FileAttachment } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import {
  ArrowLeft, ArrowRight, Zap, Loader2,
  UploadCloud, FileText, X, Globe, Video,
  TrendingUp, Heart, BookOpen, Target, Layout as LayoutIcon,
  ChevronDown, CheckCircle2, Search, Sparkles, Plus, Terminal, Code,
  AlertTriangle
} from 'lucide-react';
import { ShellTerminal } from '../components/ui/ShellTerminal';

/* ── Option Color Tag Classifier ── */
const getChipBadgeClass = (label: string, value: string) => {
  const v = value.toLowerCase();
  const l = label.toLowerCase();

  if (l === 'depth') {
    if (v.includes('expert')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('advanced')) return 'text-purple-700 bg-purple-50 border-purple-200/50';
    return 'text-blue-700 bg-blue-50 border-blue-200/50';
  }
  if (l === 'level') {
    if (v.includes('expert')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('competent')) return 'text-emerald-700 bg-emerald-50 border-emerald-200/50';
    if (v.includes('beginner')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    return 'text-slate-650 bg-slate-50 border-slate-200/50';
  }
  if (l === 'for') {
    if (v.includes('career')) return 'text-blue-700 bg-blue-50 border-blue-200/50';
    if (v.includes('project')) return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
    if (v.includes('academic')) return 'text-violet-700 bg-violet-50 border-violet-200/50';
    return 'text-slate-650 bg-slate-50 border-slate-200/50';
  }
  if (l === 'load') {
    if (v.includes('balanced')) return 'text-emerald-700 bg-emerald-50 border-emerald-200/50';
    if (v.includes('spaced')) return 'text-blue-700 bg-blue-50 border-blue-200/50';
    return 'text-rose-700 bg-rose-50 border-rose-200/50';
  }
  if (l === 'mode') {
    if (v.includes('mixed')) return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
    if (v.includes('interactive')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    if (v.includes('video')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    return 'text-slate-655 bg-slate-50 border-slate-200/50';
  }
  if (l === 'focus') {
    if (v.includes('deep')) return 'text-rose-700 bg-rose-50 border-rose-200/50';
    if (v.includes('exam')) return 'text-violet-700 bg-violet-50 border-violet-200/50';
    if (v.includes('sprint')) return 'text-amber-700 bg-amber-50 border-amber-200/50';
    return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
  }
  return 'text-indigo-700 bg-indigo-50 border-indigo-200/50';
};

/* ── Popover Selector Dropdown ── */
const PopoverSelector = ({
  label, value, options, onChange, isDark
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; isDark?: boolean }) => {
  const badgeClass = getChipBadgeClass(label, value);
  return (
    <div className={`flex items-center justify-between gap-3 py-1 border-b last:border-b-0 ${
      isDark ? 'border-white/[0.04]' : 'border-slate-150'
    }`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
        isDark ? 'text-white/40' : 'text-slate-450'
      }`}>{label}</span>
      <div className="relative inline-flex items-center">
        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold font-mono ${
          isDark
            ? 'text-white bg-white/[0.03] border-white/10'
            : badgeClass
        }`}>
          {value}
        </span>
        <ChevronDown size={10} className={`${isDark ? 'text-white/30' : 'text-slate-450'} ml-1 shrink-0`} />
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt} style={{ color: '#0d0d0d', background: '#ffffff' }}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* ── Conversation Message Interface ── */
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  type?: 'greeting' | 'grounding' | 'text';
}

/* ── Autocomplete Suggestion Configs ── */
const CONTEXT_SUGGESTIONS = [
  { trigger: '@file', label: 'Reference PDF / Syllabus', desc: 'Ground with study documents', icon: <FileText size={11} /> },
  { trigger: '@codebase', label: 'Current Workspace Files', desc: 'Scan local codebase paths', icon: <Code size={11} /> },
  { trigger: '@web', label: 'Auto WebScout Search', desc: 'Crawl live reference documentations', icon: <Globe size={11} /> },
  { trigger: '@terminal', label: 'Attach Compiler Logs', desc: 'Include active console outputs', icon: <Terminal size={11} /> },
];

const COMMAND_SUGGESTIONS = [
  { trigger: '/compile', label: 'Compile Syllabus Plan', desc: 'Synthesize path from inputs', icon: <Zap size={11} /> },
  { trigger: '/refine', label: 'Refine Curriculum Blueprint', desc: 'Provide follow-up constraints', icon: <Sparkles size={11} /> },
  { trigger: '/test', label: 'Generate Skills Quiz', desc: 'Start quick simulated exam', icon: <Target size={11} /> },
  { trigger: '/code', label: 'Boilerplate Code Templates', desc: 'Render coding exercises & files', icon: <BookOpen size={11} /> },
];

/* ── Main Component ── */
const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content?: string; attachment?: FileAttachment }[]>([]);
  const [webScoutActive, setWebScoutActive] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const [conversationStage, setConversationStage] = useState<'greet' | 'ground' | 'compiling'>('greet');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('goal') || '';
  });

  const [compiledPath, setCompiledPath] = useState<any | null>(null);
  const [rightPaneState, setRightPaneState] = useState<'idle' | 'compiling' | 'completed'>('idle');

  // Workspace Dynamic Tabs & Editor/Browser states
  const [workspaceTab, setWorkspaceTab] = useState<'roadmap' | 'terminal' | 'editor' | 'browser'>('roadmap');
  const [activeSuggestionType, setActiveSuggestionType] = useState<'context' | 'command' | null>(null);
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState<string>('');
  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);
  const [selectedEditorFile, setSelectedEditorFile] = useState<string>('App.tsx');
  const [browserUrl, setBrowserUrl] = useState<string>('https://127.0.0.1:3003/dashboard');
  const [browserHistory, setBrowserHistory] = useState<string[]>(['https://127.0.0.1:3003/dashboard']);
  const [browserHistoryIndex, setBrowserHistoryIndex] = useState<number>(0);

  // Terminal interactive state hooks
  const [terminalHistory, setTerminalHistory] = useState<string[]>(() => [
    'Last login: ' + new Date().toDateString() + ' on ttys002',
    'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
  ]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);

  const [editorFiles, setEditorFiles] = useState<any[]>(() => [
    {
      name: 'App.tsx',
      path: 'src/App.tsx',
      language: 'tsx',
      content: `import React from 'react';
import Dashboard from './pages/Dashboard';
import CreatePath from './pages/CreatePath';

export default function App() {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">
      <header className="p-4 border-b border-white/[0.04]">
        <h1 className="text-sm font-mono font-bold">Vidyal.ai Workspace</h1>
      </header>
      <main className="p-6">
        <CreatePath />
      </main>
    </div>
  );
}`
    },
    {
      name: 'Store.tsx',
      path: 'src/context/Store.tsx',
      language: 'typescript',
      content: `import React, { createContext, useContext, useState } from 'react';

interface StoreState {
  paths: any[];
  addPath: (path: any) => void;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export const AppProvider: React.FC = ({ children }) => {
  const [paths, setPaths] = useState([]);
  const addPath = (path) => setPaths(prev => [path, ...prev]);

  return (
    <StoreContext.Provider value={{ paths, addPath }}>
      {children}
    </StoreContext.Provider>
  );
};`
    },
    {
      name: 'notes.md',
      path: 'docs/notes.md',
      language: 'markdown',
      content: `# Personal Learning Notes

* Focus: Expert Software Architect blueprint.
* Study Pace: 45 minutes / day.
* Target: High-performance systems and backend compilation logs.

## Quick References:
- SARA agent compile pipeline: Auto 🔓
- Port binding mappings: localhost:3003
`
    },
    {
      name: 'exercises.ts',
      path: 'exercises/exercises.ts',
      language: 'typescript',
      content: `// Vidyal.ai Coding Sandbox Exercises
// Run, edit, and explore live concepts here.

export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Compile & Test runner
console.log("Fibonacci(10) =", fibonacci(10));
`
    }
  ]);

  const [formData, setFormData] = useState<{
    goal: string; proficiency: string; skillValue: number; expectedOutcome: string;
    targetDate: string; durationDays: number; dailyCommitment: number; resources: string;
    track: string; motivation: string; cognitiveLoad: string; outputMode: string;
    preferredStartTime: string; depth: 'Foundational' | 'Expert' | 'Advanced';
  }>(() => {
    const params = new URLSearchParams(location.search);
    return {
      goal: params.get('goal') || '',
      proficiency: 'Beginner', skillValue: 25, expectedOutcome: '',
      targetDate: '', durationDays: 30, dailyCommitment: 45, resources: '',
      track: params.get('track') || 'Architectural Build', motivation: 'Project',
      cognitiveLoad: 'Balanced', outputMode: 'Mixed', preferredStartTime: '09:00', depth: 'Expert',
    };
  });

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  // Enforce dark mode layout style on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-generation-active', 'true');
    return () => {
      document.documentElement.removeAttribute('data-generation-active');
    };
  }, []);

  // Scroll chat feed automatically
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...Array.from(bytes.slice(i, i + CHUNK)));
    return btoa(binary);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        if (isPdf) {
          const base64 = await fileToBase64(file);
          const attachment: FileAttachment = { name: file.name, base64, mimeType: 'application/pdf' };
          setUploadedFiles(prev => [...prev, { name: file.name, attachment }]);
        } else {
          const text = await file.text();
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setFormData(prev => ({ ...prev, resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}` }));
        }
        setAttachedContexts(prev => prev.includes('@file') ? prev : [...prev, '@file']);
        setError(null);
      } catch (err: any) { setError(err.message); }
    }
  };

  const handleInputChange = (val: string) => {
    setFormData(prev => ({ ...prev, goal: val }));

    // Check for trigger symbols
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setActiveSuggestionType('context');
      setSuggestionSearchQuery(lastWord.slice(1).toLowerCase());
    } else if (lastWord.startsWith('/')) {
      setActiveSuggestionType('command');
      setSuggestionSearchQuery(lastWord.slice(1).toLowerCase());
    } else {
      setActiveSuggestionType(null);
      setSuggestionSearchQuery('');
    }
  };

  const handleSelectSuggestion = (trigger: string) => {
    const words = formData.goal.split(' ');
    words.pop();
    const baseText = words.join(' ');

    if (trigger.startsWith('@')) {
      if (!attachedContexts.includes(trigger)) {
        setAttachedContexts(prev => [...prev, trigger]);
      }
      if (trigger === '@file') {
        fileInputRef.current?.click();
      }
      if (trigger === '@web') {
        setWebScoutActive(true);
      }
      setFormData(prev => ({
        ...prev,
        goal: baseText ? baseText + ' ' : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        goal: baseText ? `${baseText} ${trigger} ` : `${trigger} `
      }));
    }
    setActiveSuggestionType(null);
    setSuggestionSearchQuery('');
  };

  const handleOpenBrowserUrl = (url: string) => {
    setBrowserUrl(url);
    setBrowserHistory(prev => {
      const nextHistory = prev.slice(0, browserHistoryIndex + 1);
      return [...nextHistory, url];
    });
    setBrowserHistoryIndex(prev => prev + 1);
    setWorkspaceTab('browser');
  };

  const handleSelectTemplate = (card: typeof suggestionCards[0]) => {
    setSelectedGoal(card.goal);
    const userMsgId = 'user-' + Date.now();
    const modelMsgId = 'model-' + Date.now();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: `I choose the "${card.title}" preset template.` },
      {
        id: modelMsgId,
        role: 'model',
        text: `Excellent. I will compile a personalized curriculum for "${card.goal}". Before I begin compiling, would you like to ground this path with any custom text guidelines or syllabus reference documents?`,
        type: 'grounding'
      }
    ]);
    setConversationStage('ground');
  };

  const handleCustomGoalSubmit = (goalText: string) => {
    if (!goalText || !goalText.trim()) return;

    setActiveSuggestionType(null);
    setSuggestionSearchQuery('');

    const userMsgId = 'user-' + Date.now();
    const modelMsgId = 'model-' + Date.now();

    const isCommand = goalText.startsWith('/');
    if (isCommand) {
      const parts = goalText.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1).join(' ');

      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: 'user', text: goalText }
      ]);

      if (cmd === '/compile') {
        if (args) {
          setSelectedGoal(args);
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(args), 100);
        } else if (selectedGoal) {
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(), 100);
        } else {
          setMessages(prev => [
            ...prev,
            { id: modelMsgId, role: 'model', text: "Please specify a goal to compile, e.g., `/compile Machine Learning`" }
          ]);
        }
      } else if (cmd === '/refine') {
        if (!compiledPath) {
          setMessages(prev => [
            ...prev,
            { id: modelMsgId, role: 'model', text: "No active syllabus compiled yet. Please compile a path first before refining." }
          ]);
        } else {
          setFormData(prev => ({ ...prev, goal: '' }));
          setTimeout(() => handleBuild(args || "Refine curriculum blueprint"), 100);
        }
      } else if (cmd === '/test') {
        setFormData(prev => ({ ...prev, goal: '' }));
        setWorkspaceTab('terminal');
        setRightPaneState('compiling');

        setTerminalHistory(prev => {
          const clean = prev.slice(0, prev.length - 1);
          return [
            ...clean,
            'lokeshgandreddy@MacBook-Pro Vidhyalaya % npm run test',
            `[${new Date().toLocaleTimeString()}] Starting diagnostic quiz...`,
          ];
        });

        let logSteps = [
          '● Releasing quizzer subagent...',
          '● Generating skills diagnostic questions...',
          'Question 1: What is the primary difference between a system process and a thread?',
          '  [A] Threads share memory space; processes do not',
          '  [B] Processes are lighter than threads',
          '  [C] Processes share file handles',
          '  [D] None of the above',
          'Ready to test. Answer in the chat window!'
        ];
        let currentLogIndex = 0;
        const logInterval = setInterval(() => {
          if (currentLogIndex < logSteps.length) {
            setTerminalHistory(prev => [...prev, logSteps[currentLogIndex]]);
            currentLogIndex++;
          } else {
            clearInterval(logInterval);
            setTerminalHistory(prev => [...prev, 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ']);
            setRightPaneState('completed');
          }
        }, 250);

        setMessages(prev => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: "I have initialized a skills diagnostics terminal in the right pane. Let me know your answers directly in the chat window."
          }
        ]);
      } else if (cmd === '/code') {
        setFormData(prev => ({ ...prev, goal: '' }));
        setSelectedEditorFile('exercises.ts');
        setWorkspaceTab('editor');
        setMessages(prev => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: "I have generated coding exercises and template scripts. You can inspect and run them under the Editor tab in the right pane."
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { id: modelMsgId, role: 'model', text: `Unknown command: ${cmd}. Supported commands are: /compile, /refine, /test, /code` }
        ]);
      }
      return;
    }

    // If a path is already compiled, user inputs refine it!
    if (compiledPath) {
      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: 'user', text: goalText }
      ]);
      setFormData(prev => ({ ...prev, goal: '' }));
      handleBuild(goalText);
      return;
    }

    const isGreeting = ['hi', 'hello', 'hey', 'greetings', 'start', 'help', 'yo', 'hi cortex', 'hello cortex'].includes(goalText.toLowerCase().trim());

    if (isGreeting) {
      setMessages(prev => [
        ...prev,
        { id: userMsgId, role: 'user', text: goalText },
        {
          id: modelMsgId,
          role: 'model',
          text: "Hi, I'm Cortex, your SARA-powered learning path compiler. What subject or skill would you like to master? You can choose one of the templates below or type a custom goal in the prompt bar.",
          type: 'greeting'
        }
      ]);
      setConversationStage('greet');
    } else {
      if (selectedGoal) {
        setMessages(prev => [
          ...prev,
          { id: userMsgId, role: 'user', text: goalText },
          {
            id: modelMsgId,
            role: 'model',
            text: `Understood. Adding constraint: "${goalText}". SARA will integrate this custom guideline into your learning syllabus compilation logs.`,
            type: 'grounding'
          }
        ]);
        setFormData(prev => ({
          ...prev,
          resources: prev.resources ? `${prev.resources}\n- Constraint: ${goalText}` : `- Constraint: ${goalText}`
        }));
      } else {
        setSelectedGoal(goalText);
        setMessages(prev => [
          ...prev,
          { id: userMsgId, role: 'user', text: goalText },
          {
            id: modelMsgId,
            role: 'model',
            text: `Got it. SARA will customize a curriculum for "${goalText}". Before compiling, would you like to ground this path with custom text guidelines or upload syllabus reference files?`,
            type: 'grounding'
          }
        ]);
        setConversationStage('ground');
      }
    }
    setFormData(prev => ({ ...prev, goal: '' }));
  };

  const handleBuild = async (customPromptFeedback?: string) => {
    const activeGoal = selectedGoal || formData.goal;
    if (!activeGoal) return setError('Please specify a goal first.');
    setLoading(true); setError(null);
    setRightPaneState('compiling');
    setWorkspaceTab('terminal');
    setTerminalHistory(prev => {
      const clean = prev.slice(0, prev.length - 1);
      return [
        ...clean,
        `lokeshgandreddy@MacBook-Pro Vidhyalaya % npx sara compile --goal="${activeGoal}" --depth=${formData.depth} --scout=${webScoutActive}`,
        `[${new Date().toLocaleTimeString()}] ● Starting compilation pipeline...`,
      ];
    });

    const logSteps = [
      'Releasing Cortex Compiler Agent...',
      webScoutActive ? 'Releasing WebScout subagent...' : null,
      webScoutActive ? 'WebScout: Scouting live docs & references...' : null,
      'Releasing CurriculumSynthesizer subagent...',
      'Cortex: Synthesizing phases and weekly layout...',
      'SARA: Formatting dependency modules...',
      'Compiler: Linking recommended resources...'
    ].filter(Boolean) as string[];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logSteps.length) {
        setTerminalHistory(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logSteps[currentLogIndex]}`]);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 400);

    try {
      let scoutedText = '';
      if (webScoutActive) {
        const results = await scoutWebForResourcesJSON(activeGoal);
        if (Array.isArray(results) && results.length > 0) {
          scoutedText = results.map(r => `[${r.type?.toUpperCase() || 'URL'}] ${r.title} — ${r.url}\nRelevance: ${r.snippet}`).join('\n\n');
        }
      }

      const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const fileAttachments: FileAttachment[] = uploadedFiles.filter(f => f.attachment).map(f => f.attachment!);

      const compiledResources = [
        formData.resources,
        scoutedText ? `--- AI Web Search Grounding ---\n${scoutedText}` : ''
      ].filter(Boolean).join('\n\n');

      let compilationInstructions = `Goal: ${activeGoal}\nTrack: ${formData.track}\nMotivation: ${formData.motivation}\nLoad: ${formData.cognitiveLoad}`;
      if (customPromptFeedback && compiledPath) {
        compilationInstructions += `\n\n--- REFINEMENT INSTRUCTIONS ---\nUser request: "${customPromptFeedback}"\nPrevious outline to modify: ${JSON.stringify(compiledPath.phases.map((p: any) => ({
          title: p.title,
          modules: p.modules.map((m: any) => ({ title: m.title, description: m.description, estimatedMinutes: m.estimatedMinutes }))
        })))}`;
      }

      const planData: any = await generateLearningPlan(
        compilationInstructions,
        compiledResources, formData.dailyCommitment, formData.proficiency, '',
        targetDate.toISOString().split('T')[0], formData.depth,
        fileAttachments.length > 0 ? fileAttachments : undefined,
        { mode: 'full', timeoutMs: formData.depth === 'Advanced' ? 90_000 : 70_000 },
      );

      const phasesWithIds = (planData.phases || []).map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: (p.modules || []).map((m: any) => ({ ...m, id: generateSimpleId() })),
      }));

      const newPath: any = {
        id: generateSimpleId(), userId: 'default-user', title: planData.title || activeGoal,
        goal: activeGoal, createdAt: new Date().toISOString(), status: 'active', progress: 0,
        dailyCommitmentMinutes: formData.dailyCommitment,
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id, title: p.title, description: p.description, order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id, title: m.title, description: m.description,
            estimatedMinutes: m.estimatedMinutes, isCompleted: false,
            keyConcepts: m.keyConcepts || [],
            resources: (m.suggestedResources || []).map((sr: any) => {
              if (!sr?.url) return null;
              const isYoutube = sr.url.includes('youtube.com') || sr.url.includes('youtu.be');
              let videoId = undefined;
              if (isYoutube) videoId = sr.url.includes('v=') ? sr.url.split('v=')[1]?.split('&')[0] : sr.url.split('/').pop();
              return { id: generateSimpleId(), type: isYoutube ? 'youtube' : 'url', content: sr.url, title: sr.title || 'Untitled Resource', videoId };
            }).filter(Boolean),
            dependsOnModuleIds: [], userNotes: '',
          })),
        })),
        sessions: [], preferredStartTime: formData.preferredStartTime,
      };

      clearInterval(logInterval);
      setTerminalHistory(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SARA: Curriculum compiled successfully!`,
        `[${new Date().toLocaleTimeString()}] Cortex: Releasing final blueprint context...`,
        'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
      ]);

      await new Promise(r => setTimeout(r, 500));

      setCompiledPath(newPath);
      setRightPaneState('completed');
      setWorkspaceTab('roadmap');

      // Inject compiled path as an editable JSON file in the mock editor
      setEditorFiles(prev => {
        const hasSyllabus = prev.some(f => f.name === 'syllabus.json');
        const syllabusFile = {
          name: 'syllabus.json',
          path: 'src/syllabus.json',
          language: 'json',
          content: JSON.stringify(newPath, null, 2)
        };
        if (hasSyllabus) {
          return prev.map(f => f.name === 'syllabus.json' ? syllabusFile : f);
        }
        return [...prev, syllabusFile];
      });

      const confirmMsgId = 'confirm-' + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: confirmMsgId,
          role: 'model',
          text: customPromptFeedback
            ? `I have successfully updated the learning path syllabus based on your feedback: "${customPromptFeedback}". You can inspect the revised blueprint in the right pane.`
            : `Path generated! I've released the SARA curriculum architect and rendered the compiled blueprint in the right pane. If you'd like to adjust the scheduling or topics, type your request here. The active syllabus context is automatically attached.`,
          type: 'text'
        }
      ]);
    } catch (err: any) {
      clearInterval(logInterval);
      setError(err.message || 'Compiler failed.');
      setTerminalHistory(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err.message || 'Compiler failed.'}`,
        'lokeshgandreddy@MacBook-Pro Vidhyalaya % '
      ]);
      setRightPaneState('completed');
    } finally {
      setLoading(false);
    }
  };

  const suggestionCards = [
    { title: 'Fullstack Systems', subtitle: 'React, Node, DBs', icon: <LayoutIcon size={14} />, goal: 'Fullstack Web Specialist', accentColor: '#3b82f6', iconBg: 'text-blue-700 bg-blue-50 border-blue-200/50', },
    { title: 'AI & Machine Learning', subtitle: 'Neural Networks, LLMs', icon: <Zap size={14} />, goal: 'AI & Machine Learning Engineer', accentColor: '#e11d48', iconBg: 'text-rose-700 bg-rose-50 border-rose-200/50', },
    { title: 'Corporate Finance', subtitle: 'Valuation, Stocks, Capital', icon: <TrendingUp size={14} />, goal: 'Corporate Finance Specialist', accentColor: '#d97706', iconBg: 'text-amber-700 bg-amber-50 border-amber-200/50', },
    { title: 'Human Anatomy', subtitle: 'Muscles, Organs, Systems', icon: <Heart size={14} />, goal: 'Human Anatomy Mastery', accentColor: '#059669', iconBg: 'text-emerald-700 bg-emerald-50 border-emerald-200/50', },
    { title: 'Creative Writing', subtitle: 'Novels, Storytelling, Plot', icon: <BookOpen size={14} />, goal: 'Creative Fiction Author', accentColor: '#7c3aed', iconBg: 'text-purple-700 bg-purple-50 border-purple-200/50', },
    { title: 'Mindset & Motivation', subtitle: 'Habits, Focus, Grit', icon: <Target size={14} />, goal: 'Peak Performance Mastery', accentColor: '#ec4899', iconBg: 'text-pink-700 bg-pink-50 border-pink-200/50', },
  ];

  return (
    <div className="flex h-screen w-screen antialiased text-white select-text overflow-hidden bg-[#1c1c1c]">
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-root { display: none !important; }
        body { background-color: #1c1c1c !important; }
        aside { background-color: #181818 !important; border-right: 1px solid rgba(255,255,255,0.04) !important; }
        main { background-color: #1c1c1c !important; }
      `}} />

      {messages.length === 0 ? (
        <div className="w-full max-w-[640px] mx-auto px-4 flex-1 flex flex-col items-center justify-center min-h-[85vh] h-full gap-5 select-none">
          <div className="flex items-center justify-center gap-1.5 text-white/30 text-[11.5px] font-mono">
            <span className="hover:text-white/50 cursor-pointer">~/Vidhyalaya</span>
            <span className="text-white/15">˅</span>
            <span className="hover:text-white/50 cursor-pointer">main</span>
            <span className="text-white/15">˅</span>
            <span className="hover:text-white/50 cursor-pointer flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Local
            </span>
            <span className="text-white/15">˅</span>
          </div>

          <div className="w-full bg-[#1e1e1e] border border-white/[0.06] rounded-xl px-4 py-3 flex flex-col gap-3 focus-within:border-white/15 focus-within:bg-[#202020] focus-within:ring-1 focus-within:ring-white/[0.02] relative">
            {activeSuggestionType && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#222222] border border-white/[0.08] rounded-xl shadow-2xl p-1 z-35 flex flex-col max-h-[220px] overflow-y-auto">
                <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-white/30 uppercase border-b border-white/[0.04] mb-1">
                  {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                </div>
                {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                  .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                  .map((item) => (
                    <button
                      key={item.trigger}
                      onClick={() => handleSelectSuggestion(item.trigger)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-[11.5px] font-bold text-white">{item.trigger}</div>
                          <div className="text-[9.5px] font-semibold text-white/40">{item.label}</div>
                        </div>
                      </div>
                      <span className="text-[9.5px] text-white/20 font-mono pr-1">{item.desc}</span>
                    </button>
                  ))}
                {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                  .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                  <div className="p-3 text-center text-white/30 text-[11px] font-mono">No matching suggestions</div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {attachedContexts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-white/[0.04] pb-2">
                  {attachedContexts.map(ctx => (
                    <span
                      key={ctx}
                      className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>{ctx}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedContexts(prev => prev.filter(c => c !== ctx));
                          if (ctx === '@web') setWebScoutActive(false);
                        }}
                        className="hover:text-blue-200 cursor-pointer p-0 bg-transparent border-none font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={formData.goal}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Plan, Build, / for skills, @ for context"
                className="w-full bg-transparent border-none outline-none text-white text-[13px] placeholder:text-white/20 py-1 font-sans font-semibold"
                onKeyDown={e => {
                  if (e.key === 'Enter' && formData.goal) {
                    handleCustomGoalSubmit(formData.goal);
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[13px] font-extrabold cursor-pointer transition-colors ${
                    uploadedFiles.length > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white'
                  }`}
                  title="Attach Guidelines"
                >
                  <Plus size={11} strokeWidth={3} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />

                <button
                  onClick={() => setWebScoutActive(!webScoutActive)}
                  className={`px-2.5 py-0.5 h-6 rounded text-[10px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer border ${
                    webScoutActive
                      ? 'bg-[#2563eb]/10 text-blue-400 border-[#2563eb]/20'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white border-transparent'
                  }`}
                >
                  <span>Auto {webScoutActive ? '🔓' : '🔒'}</span>
                </button>
              </div>
              <div className="text-white/35 hover:text-white cursor-pointer transition-colors p-1 hover:bg-white/5 rounded">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <button
              onClick={() => handleCustomGoalSubmit("Plan New Idea")}
              className="px-3.5 py-1 rounded-full border border-white/[0.06] bg-[#1e1e1e] hover:bg-[#222222] text-white/45 hover:text-white text-[10.5px] font-bold transition-all cursor-pointer font-mono"
            >
              Plan New Idea <span className="opacity-30 font-normal">⇧Tab</span>
            </button>
            <button
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              className={`px-3.5 py-1 rounded-full border text-[10.5px] font-bold font-mono transition-all cursor-pointer ${
                showSettingsPopover
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/[0.06] bg-[#1e1e1e] hover:bg-[#222222] text-white/45 hover:text-white'
              }`}
            >
              ⚙️ Settings ({formData.depth})
            </button>
          </div>

          <div className="text-center text-white/15 text-[10px] font-mono select-none leading-relaxed max-w-sm mt-1">
            Use <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/30">/review</span> to have Cortex find bugs, regressions, security issues, and missing tests
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full overflow-hidden">
          <div className="w-[430px] shrink-0 border-r border-white/[0.04] bg-[#181818] flex flex-col justify-between p-5 h-full relative">
            <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 mb-5 shrink-0 select-none text-[10.5px] text-white/40 font-mono">
                <span className="flex items-center gap-1.5 truncate pr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-pulse shrink-0" />
                  {selectedGoal ? `${selectedGoal.substring(0, 24)}...` : 'General chat'} ⌸
                </span>
                <span className="shrink-0">Stage: {conversationStage.toUpperCase()}</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-5 pb-5 custom-scrollbar min-h-0">
                {messages.map((msg) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                      {!isModel ? (
                        <div className="bg-[#222222] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[12.5px] text-white max-w-[85%] font-semibold shadow-sm animate-none">
                          {msg.text}
                        </div>
                      ) : (
                        <div className="text-white/90 text-[12.5px] leading-relaxed max-w-[100%] py-1 pl-1">
                          <div className="flex items-center gap-2 mb-2 text-white/30 text-[10px] font-mono">
                            <Sparkles size={11} className="text-[#4e5bff]" />
                            <span>Cortex</span>
                          </div>
                          <p className="font-sans font-medium whitespace-pre-wrap">{msg.text}</p>
                          {msg.type === 'greeting' && (
                            <div className="grid grid-cols-1 gap-2 mt-4 pt-3.5 border-t border-white/[0.06] w-full">
                              {suggestionCards.map((card, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectTemplate(card)}
                                  className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-[#1e1e1e] hover:border-white/15 hover:bg-[#222222] text-left transition-all duration-150 cursor-pointer"
                                >
                                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] shrink-0 text-white/80 bg-white/[0.04] border border-white/[0.06]">
                                    {card.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11.5px] font-bold text-white truncate">{card.title}</div>
                                    <div className="text-[9.5px] font-semibold text-white/40 truncate">{card.subtitle}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {msg.type === 'grounding' && (
                            <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-white/[0.06] w-full">
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-wider block mb-1.5 font-mono text-white/40">
                                  Custom Guidelines notes
                                </label>
                                <textarea
                                  value={formData.resources}
                                  onChange={e => setFormData(prev => ({ ...prev, resources: e.target.value }))}
                                  placeholder="Optional guidelines..."
                                  className="w-full h-20 bg-[#1e1e1e] border border-white/[0.06] rounded-lg p-3 text-xs font-semibold placeholder:text-white/20 outline-none resize-none focus:border-white/15 focus:bg-[#202020] text-white"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className={`flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                                    uploadedFiles.length > 0
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                                      : 'bg-[#1e1e1e] border-white/[0.06] text-white/80 hover:bg-[#222222]'
                                  }`}
                                >
                                  <UploadCloud size={13} />
                                  <span>Upload Syllabus File</span>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                                <button
                                  onClick={() => handleBuild()}
                                  className="flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg bg-[#2563eb]/20 border border-blue-500/30 text-blue-400 hover:bg-[#2563eb]/30 hover:border-blue-400/40 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  <Zap size={11} fill="currentColor" className="animate-pulse" />
                                  <span>Compile Learning Path</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="pt-3 border-t border-white/[0.04] w-full shrink-0 relative z-25">
                <div className="flex flex-col gap-2 relative">
                  <AnimatePresence>
                    {showSettingsPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-16 left-0 right-0 rounded-xl p-4 bg-[#222222] border border-white/[0.1] text-white shadow-2xl z-50 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-white/60">
                            <Sparkles size={11} className="text-[#4e5bff]" />
                            Compiler Options
                          </span>
                          <button onClick={() => setShowSettingsPopover(false)} className="p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col gap-1 pr-0.5">
                          <PopoverSelector label="Depth" value={formData.depth} options={['Foundational', 'Expert', 'Advanced']} onChange={v => setFormData({ ...formData, depth: v as any })} isDark={true} />
                          <PopoverSelector label="Timeline" value={`${formData.durationDays}d at ${formData.dailyCommitment}m/day`} options={['14d at 30m/day', '30d at 45m/day', '60d at 60m/day', '90d at 90m/day']} onChange={v => { const days = parseInt(v.split('d')[0]); const mins = parseInt(v.split('at ')[1].split('m')[0]); setFormData({ ...formData, durationDays: days, dailyCommitment: mins }); }} isDark={true} />
                          <PopoverSelector label="Level" value={formData.proficiency} options={['Novice', 'Beginner', 'Competent', 'Expert']} onChange={v => setFormData({ ...formData, proficiency: v })} isDark={true} />
                          <PopoverSelector label="For" value={formData.motivation} options={['Career', 'Project', 'Academic', 'Hobby']} onChange={v => setFormData({ ...formData, motivation: v })} isDark={true} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {activeSuggestionType && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-20 left-0 right-0 rounded-xl p-1 bg-[#222222] border border-white/[0.08] text-white shadow-2xl z-50 flex flex-col max-h-[220px] overflow-y-auto"
                      >
                        <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold text-white/30 uppercase border-b border-white/[0.04] mb-1">
                          {activeSuggestionType === 'context' ? 'Attach Context Reference' : 'Run Agent Command'}
                        </div>
                        {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                          .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery))
                          .map((item) => (
                            <button
                              key={item.trigger}
                              onClick={() => handleSelectSuggestion(item.trigger)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50">
                                  {item.icon}
                                </div>
                                <div>
                                  <div className="text-[11.5px] font-bold text-white">{item.trigger}</div>
                                  <div className="text-[9.5px] font-semibold text-white/40">{item.label}</div>
                                </div>
                              </div>
                              <span className="text-[9.5px] text-white/20 font-mono pr-1">{item.desc}</span>
                            </button>
                          ))}
                        {(activeSuggestionType === 'context' ? CONTEXT_SUGGESTIONS : COMMAND_SUGGESTIONS)
                          .filter(item => item.trigger.toLowerCase().includes(suggestionSearchQuery)).length === 0 && (
                          <div className="p-3 text-center text-white/30 text-[11px] font-mono">No matching suggestions</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="rounded-lg flex flex-col gap-2.5 items-stretch p-2.5 transition-all bg-[#1e1e1e] border border-white/[0.06] focus-within:border-white/15 focus-within:bg-[#202020]">
                    {attachedContexts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-b border-white/[0.04] pb-2 px-1">
                        {attachedContexts.map(ctx => (
                          <span
                            key={ctx}
                            className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9.5px] font-mono font-bold flex items-center gap-1 shrink-0"
                          >
                            <span>{ctx}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachedContexts(prev => prev.filter(c => c !== ctx));
                                if (ctx === '@web') setWebScoutActive(false);
                              }}
                              className="hover:text-blue-200 cursor-pointer p-0 bg-transparent border-none font-bold"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className={`p-1.5 rounded-lg transition-colors shrink-0 ${uploadedFiles.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Attach Guidelines">
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setWebScoutActive(!webScoutActive)} className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold transition-all shrink-0 font-mono ${webScoutActive ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/[0.03] border-white/[0.05] text-white/50 hover:text-white'}`}>
                          Auto {webScoutActive ? '🔓' : '🔒'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {compiledPath && (
                          <span className="text-[9px] font-bold uppercase font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">📎 Active context attached</span>
                        )}
                        <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} className="text-white/40 hover:text-white text-[10px] font-mono hover:bg-white/5 px-2 py-0.5 rounded border border-white/[0.04]">⚙️ Settings</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input value={formData.goal} onChange={e => handleInputChange(e.target.value)} placeholder={compiledPath ? "Refine syllabus blueprint..." : "Send follow-up..."} className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-[12px] font-semibold text-white placeholder:text-white/20 py-1" onKeyDown={e => { if (e.key === 'Enter' && formData.goal) { handleCustomGoalSubmit(formData.goal); } }} />
                      <button onClick={() => handleCustomGoalSubmit(formData.goal)} disabled={!formData.goal} className="h-7 px-3 shrink-0 rounded bg-[#4e5bff] hover:bg-[#3b46e6] disabled:bg-white/2 disabled:text-white/15 disabled:border disabled:border-white/4 disabled:cursor-not-allowed text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer">
                        <span>Send</span>
                        <Zap size={10} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/20 font-mono px-1 select-none mt-1">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Local Workspace</span>
                    {uploadedFiles.length > 0 && <span className="text-emerald-400 font-semibold truncate max-w-[150px]">📎 {uploadedFiles.length} file(s) attached</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-[#1c1c1c] flex flex-col h-full overflow-hidden relative">
            {/* Tab selector bar */}
            <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#1a1a1a] shrink-0 select-none px-4">
              <div className="flex items-center gap-1 pt-1.5 font-mono">
                {[
                  { id: 'roadmap', label: 'Roadmap', icon: <Sparkles size={11} /> },
                  { id: 'terminal', label: 'Terminal', icon: <Terminal size={11} /> },
                  { id: 'editor', label: 'Code Editor', icon: <Code size={11} /> },
                  { id: 'browser', label: 'Web Browser', icon: <Globe size={11} /> },
                ].map(tab => {
                  const isActive = workspaceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-[10.5px] font-bold border-t border-x rounded-t-md transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1c1c1c] border-white/[0.04] text-white z-10 -mb-[1px]'
                          : 'bg-[#181818] border-transparent text-white/40 hover:text-white hover:bg-white/[0.01]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-white/20 font-mono flex items-center gap-1.5">
                <span>cortex-env</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Tab content viewer */}
            {workspaceTab === 'terminal' && (
              <ShellTerminal
                terminalHistory={terminalHistory}
                setTerminalHistory={setTerminalHistory}
                editorFiles={editorFiles}
                setEditorFiles={setEditorFiles}
                selectedEditorFile={selectedEditorFile}
                setSelectedEditorFile={setSelectedEditorFile}
                isServerRunning={isServerRunning}
                setIsServerRunning={setIsServerRunning}
                setWorkspaceTab={setWorkspaceTab}
                setRightPaneState={setRightPaneState}
                setBrowserUrl={setBrowserUrl}
                setBrowserHistory={setBrowserHistory}
                setBrowserHistoryIndex={setBrowserHistoryIndex}
                loading={loading}
              />
            )}

            {workspaceTab === 'roadmap' && (
              rightPaneState === 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/20 select-none bg-[#1c1c1c]">
                  <Terminal size={28} className="stroke-[1.5] mb-3 text-white/10 animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-wider">Cortex Workspace Terminal</span>
                  <span className="text-[11.5px] mt-1 font-sans text-white/40">Submit your path compilation requests in the chat.</span>
                </div>
              ) : rightPaneState === 'compiling' ? (
                <ShellTerminal
                  terminalHistory={terminalHistory}
                  setTerminalHistory={setTerminalHistory}
                  isReadOnly={true}
                  editorFiles={editorFiles}
                  setEditorFiles={setEditorFiles}
                  selectedEditorFile={selectedEditorFile}
                  setSelectedEditorFile={setSelectedEditorFile}
                  isServerRunning={isServerRunning}
                  setIsServerRunning={setIsServerRunning}
                  setWorkspaceTab={setWorkspaceTab}
                  setRightPaneState={setRightPaneState}
                  setBrowserUrl={setBrowserUrl}
                  setBrowserHistory={setBrowserHistory}
                  setBrowserHistoryIndex={setBrowserHistoryIndex}
                  loading={loading}
                />
              ) : (
                <div className="flex-1 flex flex-col justify-between h-full overflow-hidden bg-[#1c1c1c] border-l border-white/[0.04]">
                  {/* Header overview bar */}
                  <div className="p-5 border-b border-white/[0.04] bg-[#1a1a1a] flex items-center justify-between shrink-0 select-none">
                    <div>
                      <h2 className="text-sm font-bold text-white truncate max-w-[280px]">
                        {compiledPath?.title || 'Compiled Blueprint'}
                      </h2>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-white/40">
                        <span>{compiledPath?.phases?.length || 0} Phases</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span>{compiledPath?.phases?.reduce((acc: number, p: any) => acc + (p.modules?.length || 0), 0) || 0} Modules</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span>{formData.durationDays} Days</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-blue-400">{formData.depth}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (compiledPath) {
                          addPath(compiledPath);
                          navigate(`/path/${compiledPath.id}`);
                        }
                      }}
                      className="h-8 px-4 bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={12} />
                      <span>Accept & Save</span>
                    </button>
                  </div>

                  {/* Syllabus content view */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {compiledPath?.phases?.map((phase: any, pIdx: number) => (
                      <div key={phase.id || pIdx} className="space-y-3">
                        <div className="flex items-start justify-between border-b border-white/[0.06] pb-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-wider block">Phase {pIdx + 1}</span>
                            <h3 className="text-xs font-bold text-white mt-0.5">{phase.title}</h3>
                          </div>
                          {phase.description && (
                            <span className="text-[10px] text-white/45 font-medium max-w-[200px] text-right truncate" title={phase.description}>
                              {phase.description}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {phase.modules?.map((mod: any, mIdx: number) => (
                            <div
                              key={mod.id || mIdx}
                              className="p-3 rounded-lg border border-white/[0.04] bg-[#1f1f1f]/50 hover:bg-[#1f1f1f] hover:border-white/[0.08] transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-xs font-semibold text-white/90 leading-snug">
                                  {mod.title}
                                </h4>
                                <span className="text-[10px] font-mono font-bold text-[#4e5bff] shrink-0 bg-[#4e5bff]/5 border border-[#4e5bff]/10 px-1.5 py-0.5 rounded">
                                  {mod.estimatedMinutes}m
                                </span>
                              </div>
                              {mod.description && (
                                <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed font-sans font-medium">
                                  {mod.description}
                                </p>
                              )}

                              {mod.keyConcepts && mod.keyConcepts.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {mod.keyConcepts.map((concept: string, cIdx: number) => (
                                    <span
                                      key={cIdx}
                                      className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] font-mono text-white/50"
                                    >
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {mod.resources && mod.resources.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-white/[0.03] space-y-1 font-mono">
                                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider block">Recommended Resources</span>
                                  {mod.resources.map((res: any, rIdx: number) => (
                                    <button
                                      key={res.id || rIdx}
                                      onClick={() => handleOpenBrowserUrl(res.content)}
                                      className="w-full flex items-center gap-1.5 text-[10.5px] text-blue-400/80 hover:text-blue-300 transition-colors truncate max-w-full text-left bg-transparent border-none cursor-pointer p-0"
                                    >
                                      <Globe size={10} className="shrink-0" />
                                      <span className="truncate">{res.title || res.content}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {workspaceTab === 'editor' && (
              <div className="flex-1 flex h-full overflow-hidden bg-[#1c1c1c] border-l border-white/[0.04]">
                {/* File list sidebar */}
                <div className="w-44 shrink-0 bg-[#161616] border-r border-white/[0.04] flex flex-col justify-between p-3 select-none font-mono">
                  <div className="space-y-4">
                    <span className="text-[9.5px] font-bold text-white/20 uppercase tracking-wider block">Workspace Files</span>
                    <div className="space-y-1">
                      {editorFiles.map(file => (
                        <button
                          key={file.name}
                          onClick={() => setSelectedEditorFile(file.name)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                            selectedEditorFile === file.name
                              ? 'bg-white/[0.04] text-white font-bold'
                              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.01]'
                          }`}
                        >
                          <FileText size={11} className={selectedEditorFile === file.name ? 'text-blue-400' : 'text-white/30'} />
                          <span className="truncate">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[9px] text-white/20">
                    {editorFiles.length} files sandbox
                  </div>
                </div>

                {/* Editor Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
                  <div className="p-2 border-b border-white/[0.04] bg-[#1a1a1a] flex items-center justify-between shrink-0 select-none">
                    <span className="text-[10px] font-mono text-white/40 px-2">
                      exercises/{selectedEditorFile}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setWorkspaceTab('terminal');
                          setRightPaneState('compiling');

                          setTerminalHistory(prev => {
                            const clean = prev.slice(0, prev.length - 1);
                            return [
                              ...clean,
                              `lokeshgandreddy@MacBook-Pro Vidhyalaya % ts-node exercises/${selectedEditorFile}`,
                              `[Sandbox] Executing exercises/${selectedEditorFile}...`
                            ];
                          });

                          let logSteps = [
                            `[Sandbox] Loaded typescript compiler (tsc)...`,
                            `[Sandbox] Output:`,
                            `--- stdout ---`,
                            selectedEditorFile === 'exercises.ts'
                              ? `Fibonacci(10) = 55\n`
                              : selectedEditorFile === 'syllabus.json'
                              ? `Parsed syllabus AST structure successfully.\n`
                              : `Successfully parsed and executed ${selectedEditorFile}.\n`,
                            `--- exit code: 0 ---`,
                            ''
                          ];

                          let currentLogIndex = 0;
                          const logInterval = setInterval(() => {
                            if (currentLogIndex < logSteps.length) {
                              setTerminalHistory(prev => [...prev, logSteps[currentLogIndex]]);
                              currentLogIndex++;
                            } else {
                              clearInterval(logInterval);
                              setTerminalHistory(prev => [...prev, 'lokeshgandreddy@MacBook-Pro Vidhyalaya % ']);
                              setRightPaneState('completed');
                            }
                          }, 250);
                        }}
                        className="h-6 px-2.5 bg-[#2563eb]/20 border border-blue-500/30 text-blue-400 hover:bg-[#2563eb]/30 hover:border-blue-400/40 text-[9.5px] font-mono font-bold rounded cursor-pointer transition-all"
                      >
                        ▶ Run Code
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden relative">
                    <textarea
                      value={editorFiles.find(f => f.name === selectedEditorFile)?.content || ''}
                      onChange={e => {
                        const newContent = e.target.value;
                        setEditorFiles(prev => prev.map(f => f.name === selectedEditorFile ? { ...f, content: newContent } : f));
                      }}
                      className="w-full h-full bg-[#1e1e1e] text-emerald-400 font-mono text-[11.5px] p-4 outline-none resize-none border-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {workspaceTab === 'browser' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1c1c1c] border-l border-white/[0.04]">
                {/* Browser bar */}
                <div className="p-2 border-b border-white/[0.04] bg-[#1a1a1a] flex items-center gap-3 shrink-0 select-none px-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={browserHistoryIndex <= 0}
                      onClick={() => {
                        if (browserHistoryIndex > 0) {
                          const idx = browserHistoryIndex - 1;
                          setBrowserHistoryIndex(idx);
                          setBrowserUrl(browserHistory[idx]);
                        }
                      }}
                      className="p-1 rounded hover:bg-white/5 text-white/35 disabled:text-white/10 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      disabled={browserHistoryIndex >= browserHistory.length - 1}
                      onClick={() => {
                        if (browserHistoryIndex < browserHistory.length - 1) {
                          const idx = browserHistoryIndex + 1;
                          setBrowserHistoryIndex(idx);
                          setBrowserUrl(browserHistory[idx]);
                        }
                      }}
                      className="p-1 rounded hover:bg-white/5 text-white/35 disabled:text-white/10 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded bg-black/25 border border-white/[0.04] text-[10.5px] font-mono text-white/50">
                    <Globe size={10} className="text-white/30 shrink-0" />
                    <input
                      value={browserUrl}
                      onChange={e => setBrowserUrl(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-white/60 selection:bg-blue-500/30"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setBrowserHistory(prev => {
                            const next = prev.slice(0, browserHistoryIndex + 1);
                            return [...next, browserUrl];
                          });
                          setBrowserHistoryIndex(prev => prev + 1);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Viewport content */}
                <div className="flex-1 bg-[#141414] overflow-hidden">
                  {(() => {
                    if (browserUrl.includes('youtube.com') || browserUrl.includes('youtu.be')) {
                      const isYoutube = browserUrl.includes('youtube.com') || browserUrl.includes('youtu.be');
                      let videoId = '';
                      if (isYoutube) {
                        videoId = browserUrl.includes('v=') ? browserUrl.split('v=')[1]?.split('&')[0] : browserUrl.split('/').pop() || '';
                      }
                      return (
                        <div className="w-full h-full bg-[#0d0d0d] flex items-center justify-center p-4">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="w-full h-full max-h-[380px] aspect-video border-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="YouTube Video Embed"
                          />
                        </div>
                      );
                    }

                    if (browserUrl.includes('127.0.0.1:3003') || browserUrl.includes('localhost:3003')) {
                      if (!isServerRunning) {
                        return (
                          <div className="p-8 h-full bg-[#141414] flex flex-col items-center justify-center text-center font-sans">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-450 animate-pulse">
                              <AlertTriangle size={18} />
                            </div>
                            <h3 className="text-sm font-bold text-white">This site can’t be reached</h3>
                            <p className="text-[11px] text-white/45 mt-2 max-w-[280px] leading-relaxed font-medium">
                              localhost:3000 refused to connect. The local Vite development server is offline.
                            </p>

                            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-left w-full max-w-xs font-mono text-[10.5px] leading-relaxed">
                              <span className="text-white/30 block mb-1.5 uppercase font-bold text-[9px] tracking-wider">To start the local preview:</span>
                              <div className="space-y-1 font-semibold">
                                <span className="text-white/80 block">1. Open the <strong className="text-[#4e5bff]">Terminal</strong> tab</span>
                                <span className="text-white/80 block">2. Type command: <code className="bg-white/5 px-1 py-0.5 rounded text-emerald-400 font-bold">npm run dev</code></span>
                              </div>
                            </div>

                            <button
                              onClick={() => setWorkspaceTab('terminal')}
                              className="mt-6 h-8 px-4 bg-[#4e5bff]/15 hover:bg-[#4e5bff]/25 border border-[#4e5bff]/35 text-[#4e5bff] hover:text-white text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <Terminal size={11} />
                              <span>Go to Terminal</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="p-6 space-y-5 text-sans text-white/90 bg-[#141414] h-full overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <div>
                              <h1 className="text-sm font-bold text-white">Vidyal.ai Localhost</h1>
                              <p className="text-[10px] text-white/40 mt-0.5">Development Server Dashboard</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold">online</span>
                          </div>

                          {compiledPath ? (
                            <div className="space-y-4">
                              <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] flex items-center justify-between">
                                <div>
                                  <h3 className="text-xs font-bold text-white">{compiledPath.title}</h3>
                                  <p className="text-[10px] text-white/45 mt-1 font-mono">{compiledPath.phases.length} Phases Active</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-bold text-[#4e5bff]">{compiledPath.progress}%</span>
                                  <p className="text-[9px] text-white/30 uppercase tracking-wider font-mono">Overall Progress</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2.5">
                                <h4 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-wider">Active Modules</h4>
                                {compiledPath.phases[0]?.modules?.slice(0, 3).map((m: any, idx: number) => (
                                  <div key={m.id || idx} className="p-3 rounded-lg border border-white/[0.04] bg-[#1e1e1e] flex items-center justify-between">
                                    <div className="min-w-0 flex-1 pr-4">
                                      <span className="text-[11px] font-semibold text-white truncate block">{m.title}</span>
                                      <span className="text-[9.5px] text-white/40 truncate block font-sans font-medium">{m.description}</span>
                                    </div>
                                    <button className="h-6 px-2.5 bg-[#4e5bff]/10 border border-[#4e5bff]/20 text-[#4e5bff] hover:bg-[#4e5bff]/20 text-[9.5px] font-mono font-bold rounded cursor-pointer transition-all shrink-0">Study</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-white/20 select-none">
                              <LayoutIcon size={32} className="stroke-[1.2] text-white/10 mb-2" />
                              <span className="text-[10.5px] font-mono uppercase tracking-wider">No Compiled Blueprint Active</span>
                              <span className="text-[11px] mt-1 max-w-[200px]">Compile a new learning path in the compiler workspace to see it previewed here.</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="p-8 h-full bg-[#141414] flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                          <Globe size={18} className="text-white/40" />
                        </div>
                        <h3 className="text-xs font-bold text-white truncate max-w-[320px]">{browserUrl}</h3>
                        <p className="text-[11px] text-white/45 mt-2 max-w-[280px] leading-relaxed">
                          This resource is opened locally inside the workspace's sandbox. Tapping below will launch the full browser viewport.
                        </p>
                        <a
                          href={browserUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 h-8 px-4 bg-[#2563eb]/20 border border-blue-500/30 hover:border-blue-400/50 text-blue-400 hover:bg-[#2563eb]/30 text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer inline-flex"
                        >
                          <span>Open Link in New Tab</span>
                          <ArrowRight size={11} />
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePath;
