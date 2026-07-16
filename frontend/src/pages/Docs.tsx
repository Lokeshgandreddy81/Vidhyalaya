import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Moon, Sun, ArrowLeft, BookOpen, Terminal, Cpu, Layers,
  ShieldCheck, Code, Sparkles, Play, Check, Copy, ExternalLink, Menu, X,
  ChevronRight, Info, AlertTriangle, Lightbulb, CheckCircle, Keyboard
} from 'lucide-react';
import { useAppStore } from '../context/Store';

// Define structures for section content
interface DocSubheading {
  id: string;
  text: string;
}

interface DocSection {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  subheadings: DocSubheading[];
  content: React.ReactNode;
}

export const Docs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('welcome');
  const [isDarkMode, setIsDarkMode] = useState(true); // Premium Dark Theme by default
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync TOC scroll highlight
  useEffect(() => {
    const handleScroll = () => {
      const container = contentContainerRef.current;
      if (!container) return;

      const scrollPosition = container.scrollTop + 140;
      let currentActiveId = '';

      for (const subheading of activeSection.subheadings) {
        const element = document.getElementById(subheading.id);
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            currentActiveId = subheading.id;
          }
        }
      }

      if (currentActiveId) {
        setActiveHeadingId(currentActiveId);
      }
    };

    const container = contentContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [selectedSectionId]);

  // Reset scroll on article change
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
    if (activeSection.subheadings.length > 0) {
      setActiveHeadingId(activeSection.subheadings[0].id);
    } else {
      setActiveHeadingId('');
    }
  }, [selectedSectionId]);

  // Keyboard shortcut listener for Cmd+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when open
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    const container = contentContainerRef.current;
    if (element && container) {
      container.scrollTo({
        top: element.offsetTop - 40,
        behavior: 'smooth'
      });
      setActiveHeadingId(id);
    }
  };

  // Custom Code Block component
  const CodeBlock: React.FC<{ filename: string; code: string; language: string }> = ({ filename, code, language }) => {
    const blockId = useMemo(() => Math.random().toString(36).substring(7), []);
    return (
      <div className="my-5 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-[#09090b] font-mono shadow-md">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-450 select-none">
          <span className="flex items-center gap-1.5 font-bold font-mono">
            <Code className="w-3.5 h-3.5 text-blue-500" />
            {filename}
          </span>
          <div className="flex items-center gap-3">
            <span className="uppercase text-[9px] font-black text-neutral-450 dark:text-neutral-500 font-mono">{language}</span>
            <button
              onClick={() => handleCopyCode(blockId, code)}
              className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {copiedId === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10px] font-bold font-mono">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
        <pre className="p-4 overflow-x-auto text-[11.5px] leading-relaxed text-neutral-700 dark:text-neutral-300 font-mono bg-[#09090b]">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  // Callout Component
  const Callout: React.FC<{ type: 'note' | 'warning' | 'tip' | 'important'; title?: string; children: React.ReactNode }> = ({ type, title, children }) => {
    let borderColor = 'border-[#4e5bff]';
    let bgColor = 'bg-[#4e5bff]/5';
    let iconColor = 'text-[#4e5bff]';
    let Icon = Info;
    let label = 'Note';

    if (type === 'warning') {
      borderColor = 'border-amber-500';
      bgColor = 'bg-amber-50/50';
      iconColor = 'text-amber-600';
      Icon = AlertTriangle;
      label = 'Warning';
    } else if (type === 'tip') {
      borderColor = 'border-emerald-500';
      bgColor = 'bg-emerald-50/50';
      iconColor = 'text-emerald-600';
      Icon = Lightbulb;
      label = 'Tip';
    } else if (type === 'important') {
      borderColor = 'border-indigo-500';
      bgColor = 'bg-indigo-50/50';
      iconColor = 'text-indigo-600';
      Icon = CheckCircle;
      label = 'Important';
    }

    return (
      <div className={`my-6 p-4 border-l-[3px] rounded-r-lg ${borderColor} ${bgColor} flex gap-3 text-left`}>
        <Icon className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
        <div>
          <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${iconColor}`}>
            {title || label}
          </span>
          <div className="text-[12px] text-slate-600 leading-relaxed font-normal">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Structured documentation sections following the sidebar tree in screenshot
  const sections: DocSection[] = useMemo(() => [
    // --- Get Started ---
    {
      id: 'welcome',
      category: 'Get Started',
      title: 'Welcome to Vidhyalaya',
      keywords: ['welcome', 'introduction', 'home', 'identity', 'cortex'],
      subheadings: [
        { id: 'project-identity', text: 'Project Identity' },
        { id: 'why-vidhyalaya', text: 'Why Vidhyalaya?' },
        { id: 'academic-modernism', text: 'Academic Modernism' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Welcome</h1>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Vidhyalaya is an adaptive orchestration engine for personalized education. It transforms unstructured cognitive payloads (PDFs, YouTube videos, raw notes) into high-fidelity academic schemas (curriculum roadmaps, interactive neural maps) using Google's Gemini AI. It is built to provide a seamless, distraction-free, AI-driven learning experience.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/hero-discovery.png" 
              alt="Developer Roadmaps Dashboard" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 1.1: The primary dashboard interface displaying generated roadmaps and study milestones.
            </div>
          </div>

          <h2 id="project-identity" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Project Identity</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            As a core orchestration engine, Vidhyalaya compiles materials into structured paths. The welcome page serves as the entry point to discover roles, custom pathways, and active schedules.
          </p>

          <h2 id="why-vidhyalaya" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Why Vidhyalaya?</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Traditional online platforms lack structured active recall exercises. Vidhyalaya bridges this gap by merging text lectures with 
            synchronized YouTube feeds and a simulated code compilation sandbox, tracking knowledge checkpoints.
          </p>

          <h2 id="academic-modernism" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Academic Modernism</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            We adhere strictly to our design philosophy. The layout uses high-contrast surfaces, a Sky-Blue Ice layout gradient 
            (or deep Cinematic Zen Mode for active study sessions), and justified typography alignment (<code>text-justify</code> and <code>hyphens-auto</code>) 
            to provide textbook-level readability.
          </p>
        </div>
      )
    },
    {
      id: 'quickstart',
      category: 'Get Started',
      title: 'Quickstart Guide',
      keywords: ['quickstart', 'setup', 'installation', 'dev', 'run'],
      subheadings: [
        { id: 'initial-setup', text: 'Initial Setup' },
        { id: 'running-locally', text: 'Running Locally' },
        { id: 'creating-first-path', text: 'Creating your First Path' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Quickstart</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
            Get your developer workspace running locally and initialize your first course roadmap.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/quickstart.png" 
              alt="Cortex Setup Onboarding" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 2.1: Developer workspace onboarding and API key configuration console.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="initial-setup" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Initial Setup</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Clone the repository and install the dependencies for both layers:
          </p>
          <CodeBlock
            filename="Terminal Setup"
            language="bash"
            code={`# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install`}
          />

          <h2 id="running-locally" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Running Locally</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            To start the application, launch both local development servers in separate terminals:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><strong>Frontend Server (Port 3000)</strong>: Run <code>npm run dev</code> inside <code>/frontend</code>.</li>
            <li><strong>Backend Server (Port 5000)</strong>: Run <code>npm run dev</code> inside <code>/backend</code>.</li>
          </ul>

          <h2 id="creating-first-path" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Creating your First Path</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Log into the application, navigate to the **Create Path** tab, enter your learning objectives or upload a syllabus PDF, 
            and click Generate. SARA will scout references and render your study path.
          </p>
        </div>
      )
    },
    {
      id: 'models-pricing',
      category: 'Get Started',
      title: 'Models & Pricing',
      keywords: ['models', 'pricing', 'api', 'keys', 'claude', 'gpt', 'grok', 'openrouter', 'byok'],
      subheadings: [
        { id: 'byok-architecture', text: 'Bring Your Own Key' },
        { id: 'supported-providers', text: 'Supported Providers' },
        { id: 'key-config-safety', text: 'Configuration & Safety' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Models & Pricing</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
            Vidhyalaya/Cortex is designed as an open-orchestration, zero-markup learning environment. We do not charge subscriptions or lock learning features behind paywalls. Instead, you plug in your own API keys to directly power generative tutor responses and roadmap compilations.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/model-pricing.png" 
              alt="Model Configuration Console" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 3.1: The Model Provider Configuration panel showing active key integrations.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="byok-architecture" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Bring Your Own Key (BYOK)</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            By shifting to a Bring Your Own Key architecture, Vidhyalaya keeps the platform completely free to use. Rather than paying a markup on AI generation costs, you pay providers (like Anthropic or OpenAI) directly at cost. This model grants you complete transparency and ensures you only pay for the exact volume of prompt tokens you consume.
          </p>

          <Callout type="tip" title="Cost Control">
            Since there are no platform margins added by Vidhyalaya, a full 10-module study path generation costs only a few cents when billed directly through your model provider.
          </Callout>

          <h2 id="supported-providers" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Supported Providers</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            You can integrate multiple API keys simultaneously and swap models on the fly during study sessions:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>Claude (Anthropic)</strong>: Unlocks models like <code>Claude 3.5 Sonnet</code> or <code>Claude 3 Opus</code>, which are highly recommended for advanced Socratic guidance, codebase layout reasoning, and explaining programming concepts.</li>
            <li><strong>ChatGPT (OpenAI)</strong>: Grants access to <code>GPT-4o</code> and <code>GPT-4-turbo</code>, offering fast, balanced instruction delivery and solid code correction speed.</li>
            <li><strong>Grok (xAI)</strong>: Connects to <code>Grok 2</code>, enabling real-time academic information retrieval and conversational tutoring styles.</li>
            <li><strong>OpenRouter</strong>: A unified gateway that lets you access hundreds of open-source and specialized models (such as <code>Llama 3</code>, <code>Qwen 2.5</code>, or <code>Mistral Large</code>) through a single API key configuration.</li>
          </ul>

          <h2 id="key-config-safety" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Configuration & Safety</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            API keys can be configured in two ways:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Developer Mode (.env)</strong>: Save your credentials directly in your local <code>/backend/.env</code> file for automatic system-wide loading.</li>
            <li><strong>UI Settings Dashboard</strong>: Navigate to the **Model Settings** tab, paste the API keys in the respective provider inputs, and click **Save**.</li>
          </ol>

          <Callout type="important" title="Key Encryption & Privacy">
            We value your security. API keys are encrypted and stored locally in your browser's secure context or local configuration databases. They are never sent to external servers other than the direct API endpoints of the respective AI providers.
          </Callout>
        </div>
      )
    },
    {
      id: 'changelog',
      category: 'Get Started',
      title: 'Changelog',
      keywords: ['changelog', 'releases', 'versions', 'updates', 'sara', 'history'],
      subheadings: [
        { id: 'v1-2-0', text: 'v1.2.0 (Third Release)' },
        { id: 'v1-1-0', text: 'v1.1.0 (Second Release)' },
        { id: 'v1-0-0', text: 'v1.0.0 (First Release)' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Changelog</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            Follow the architectural evolution from SARA-AI to the Vidhyalaya portal and the Cortex learning engine.
          </p>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          {/* v1.2.0 */}
          <h2 id="v1-2-0" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">v1.2.0 &mdash; Cortex Active Recall (Third Release)</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Preparing for the third release of the platform. This release pivots the application into the <strong>Cortex Learning Engine</strong>, transitioning from passive content consumption to an active recall sandbox environment.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Cortex Code Sandbox Drawer</strong>: Floating editor and compiler terminal drawer enabling side-by-side Javascript, HTML, and CSS practices with live output.</li>
            <li><strong>Interactive Media Sync</strong>: Synchronizes lesson worksheets with scouted YouTube videos, enabling scroll-aligned transcript matching and video jump markers.</li>
            <li><strong>Zustand State Store Revamp</strong>: Converted store managers to Zustand with optimistic mutations, ensuring 0ms responsiveness on learning path checkpoint updates.</li>
            <li><strong>Academic Modernism Styling</strong>: Unified interface aesthetics using the standard Sky-Blue Ice layout gradient, solid high-contrast card structures, and a distraction-free Cinematic Dark Zen Mode.</li>
          </ul>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          {/* v1.1.0 */}
          <h2 id="v1-1-0" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">v1.1.0 &mdash; Vidhyalaya Platform Migration (Second Release)</h2>
          <p className="text-neutral-650 dark:text-neutral-350 leading-relaxed">
            The second release moved the platform architecture from serverless Firebase to a dedicated Node/Express backend and MongoDB Atlas cluster to store custom learning roadmaps.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Express Backend &amp; MongoDB Atlas</strong>: Migrated profile metadata and path progress weights to mongoose schemas for persistent, cross-device consistency.</li>
            <li><strong>JWT Router Security Guards</strong>: Implemented router middlewares that verify authenticated JWT payloads against model ownership properties before mutating resources.</li>
            <li><strong>D3.js Force-Directed Prerequisite Graphs</strong>: Implemented dynamic graph structures using a force-directed layout visualizer to map prerequiste topic chains.</li>
          </ul>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/sara-module-viewer.png" 
              alt="Vidhyalaya Course Module Dashboard" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 4.1: Vidhyalaya module viewer dashboard compiling customized syllabus paths.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          {/* v1.0.0 */}
          <h2 id="v1-0-0" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">v1.0.0 &mdash; SARA-AI Launch (First Release)</h2>
          <p className="text-neutral-650 dark:text-neutral-300 leading-relaxed">
            The initial release hosted at <code>sara-ai.in</code> built using React + Firebase to deliver socratic tutoring and study resources.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>SARA Socratic Tutor</strong>: Initial prompting agent leveraging Google Gemini SDK to direct students Socratically.</li>
            <li><strong>Smart Summarizer &amp; PDF Explanations</strong>: PDF viewer that breaking down chapters page-by-page, providing inline summary breakdowns.</li>
          </ul>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/sara-summarizer.png" 
              alt="SARA-AI Smart Summarizer" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 4.2: SARA-AI PDF reader summarizing syllabus topics.
            </div>
          </div>

          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Mohan Babu University Email Lock</strong>: Restricted authentication registration to verified university domains for campus compliance.</li>
            <li><strong>Mental AI Support Companion</strong>: Conversational agent specialized in offering wellness suggestions and study pacing checks to alleviate academic fatigue.</li>
          </ul>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/sara-mental-health.png" 
              alt="Mental AI Support Widget" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 4.3: Mental AI Support providing wellness and pacing prompts.
            </div>
          </div>
        </div>
      )
    },

    // --- Agent ---
    {
      id: 'agent-overview',
      category: 'Agent',
      title: 'Agent Overview',
      keywords: ['agent', 'overview', 'sara', 'antigravity', 'thinking', 'cortex', 'orchestrator', 'queue', 'dag'],
      subheadings: [
        { id: 'agentic-architecture', text: 'Agentic Architecture' },
        { id: 'cognitive-routing', text: 'Cognitive Orchestration & Scheduling' },
        { id: 'visual-neural-synthesizer', text: 'Visual Prerequisite DAG Compilation' },
        { id: 'sandbox-execution-loop', text: 'Sandbox Verification & Security' },
        { id: 'socratic-feedback-engine', text: 'Socratic Error Feedback Loops' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Agent Overview</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            At the heart of Vidhyalaya is the **Cortex Orchestration Engine**&mdash;a multi-agent system designed to transform raw pedagogical payloads into personalized, interactive academic courses. Rather than relying on simple linear LLM text generation, Cortex coordinates autonomous Socratic tutors, filesystem workers, and sandboxed compilers to build a structured active recall workspace.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-overview-1.png" 
              alt="Cortex Agent Planning Phase" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 5.1: Cortex Agent planning phase mapping out custom user objectives.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="agentic-architecture" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Agentic Architecture</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Cortex splits tutor intelligence into distinct, specialized role components to limit latency and maximize accuracy:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>SARA (Socratic Academic Research Assistant)</strong>: The primary coordinator agent. SARA analyzes user inputs, parses PDFs or lecture files, handles socratic chat guidance, and structures the curriculum path milestones.</li>
            <li><strong>Antigravity Compiler Worker</strong>: The active recall agent. It runs compile validation checks, generates sandboxed workspace tasks, and evaluates student code submissions.</li>
          </ul>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            These specialized sub-agents coordinate via message-passing interfaces, resolving tasks in parallel. This role-based segregation ensures that conceptual explanations, source validations, and code verification procedures are isolated from one another, boosting runtime reliability.
          </p>

          <h2 id="cognitive-routing" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Cognitive Orchestration &amp; Scheduling</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            During course compilation, SARA acts as the master routing orchestrator, delegating resource-gathering and verification sub-routines to specialized background workers. SARA manages a prioritized task execution queue that schedules prompt generations, vector searches, and API validation in a structured pipeline.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-overview-2.png" 
              alt="Background Resource Scraping and Verification" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 5.2: Background SARA sub-agents verifying referenced YouTube IDs and scouted materials.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            By offloading web crawling, citation indexing, and YouTube API validation to secondary threads, SARA avoids hitting request rate limits and guarantees zero UI lock-ups.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            To prevent request quota exhaustion and ensure continuous execution, all API prompts flow through SARA's execution scheduler, which enforces a strict 1.5-second task delay throttle and a 120-second per-task execution boundary. If an API endpoint stalls, the scheduler cancels the task and switches to cached fallback values.
          </p>

          <h2 id="visual-neural-synthesizer" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Visual Prerequisite DAG Compilation</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            To prevent students from getting overwhelmed, the agent structures modules topographically. The <strong>Neural Synthesizer</strong> visualizes these dependencies dynamically, mapping prerequisite linkages so students understand the optimal learning sequence.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-overview-3.png" 
              alt="Neural Graph and Prerequisite Mapping" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 5.3: Interactive prerequisite graph mapping curriculum relationships in real-time.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            SARA compiles course timelines by running a topological sort across all extracted concept nodes. This sorting constructs a Directed Acyclic Graph (DAG) representing learning dependencies. The frontend Neural Board renders this DAG using D3.js force-directed physics, preventing node collision with dynamic repulsion constraints.
          </p>

          <h2 id="sandbox-execution-loop" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Sandbox Verification &amp; Security</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            When a student writes code to complete a worksheet checkpoint, the Antigravity agent intercepts the execution, mounts the code inside the local sandboxed iframe environment, and runs automated tests.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-overview-4.png" 
              alt="Cortex Sandbox and Local Code Execution Drawer" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 5.4: The Cortex Code Sandbox terminal executing client code checks.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            To prevent security risks during code execution, compiler instances run in isolated frames with strict browser policies. Student files are restricted to their local directories, and server endpoints are secured behind ownership filters comparing JWT claims with database ownership definitions.
          </p>

          <h2 id="socratic-feedback-engine" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Socratic Error Feedback Loops</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            If a compilation fails, the Antigravity compiler logs the errors and routes the output back to SARA's prompt pipelines. SARA processes the warning trace and injects context-specific socratic hints directly onto the user's worksheet:
          </p>
          <CodeBlock
            filename="socratic-loop.ts"
            language="typescript"
            code={`// Route compiler error logs to SARA socratic prompt builders
export const buildSocraticErrorPrompt = (errorLog: string, codeSnippet: string) => {
  return \`
    The student's compile failed with this log:
    "\${errorLog}"
    For their active exercise snippet:
    \`\${codeSnippet}\`
    
    Do not rewrite the code for the student. Formulate two leading questions 
    focusing on the syntax error location without revealing the solution.
  \`;
};`}
          />
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            This automated loop provides immediate feedback, helping students master debugging skills independently.
          </p>
        </div>
      )
    },
    {
      id: 'agents-window',
      category: 'Agent',
      title: 'Agents Window',
      keywords: ['window', 'drawer', 'terminal', 'logs', 'sara', 'chat', 'assistant'],
      subheadings: [
        { id: 'socratic-chat-interface', text: 'Socratic Chat Interface' },
        { id: 'tool-execution-tracking', text: 'Real-time Execution Logs' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Agents Window</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            The **Agents Window** (SARA Chat Panel) is the primary interactive command center for students. Located as a collapsable sidebar drawer, it allows you to query concepts, inspect active code blocks, and monitor the underlying AI execution logs.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-window.png" 
              alt="SARA Agents Window Chat Panel" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 6.1: The active SARA Chat Panel showing Socratic discussions and context-aware file injections.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="socratic-chat-interface" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Socratic Chat Interface</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Rather than serving plain answers, SARA is hard-prompted to act as a Socratic tutor. It guides you to solutions by:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Context Injection (@)</strong>: Type <code>@</code> in the prompt field to reference specific files from your workspace (e.g. <code>@Store.tsx</code>). SARA immediately reads the file contents to tailor explanations.</li>
            <li><strong>Incremental Guidance</strong>: SARA breaks down complex bugs or concepts into logical chunks, posing leading questions to test your comprehension.</li>
          </ul>

          <h2 id="tool-execution-tracking" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Real-time Execution Logs</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Every prompt sent triggers a cascade of sub-agent actions. The Agents Window exposes these operations in real-time, detailing:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Agent Thoughts</strong>: The core reasoning path SARA is pursuing before executing any filesystem commands.</li>
            <li><strong>Tool Calls &amp; Arguments</strong>: Raw JSON inputs/outputs showing exact parameters sent to APIs (e.g. YouTube queries or compiler runs).</li>
            <li><strong>Security States</strong>: Confirmations that files accessed are restricted to the student's personal directories.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'agent-review',
      category: 'Agent',
      title: 'Agent Review',
      keywords: ['review', 'checks', 'validate', 'diff', 'compiler', 'syntax'],
      subheadings: [
        { id: 'synthesis-validation-pipeline', text: 'Synthesis Validation' },
        { id: 'diff-reviews-console', text: 'Interactive Diff Reviews' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Agent Review</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            To guarantee academic rigor and code execution safety, Cortex subjects all generative outputs to a multi-stage review loop. Before any roadmap updates, SARA runs syntax checks, link verifications, and diff-comparison reviews to ensure the student receives verified material.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-review-1.png" 
              alt="Cortex Synthesis Validation Queue" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 7.1: The task verification panel compiling roadmaps and checking prerequisite nodes.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="synthesis-validation-pipeline" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Synthesis Validation</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            All generated guides undergo automated sanity checks before they are written to the database:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>YouTube Verification</strong>: Background pings to double-check that scouted video IDs are not deleted, private, or age-locked.</li>
            <li><strong>Scholarly Grounding</strong>: Verifies that every step header (H2) has a matching <code>&gt; Source: [index]</code> referencing verified course syllabus attachments.</li>
            <li><strong>Syntax Parsing</strong>: Runs dry compiler parsing on suggested sandbox exercises to make sure they do not ship with code typos or missing closing brackets.</li>
          </ul>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="diff-reviews-console" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Interactive Diff Reviews</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            When SARA proposes updates to your workspace code files, the system displays an interactive diff review console rather than silently overwriting your work.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-review-2.png" 
              alt="Interactive Side-by-Side Diff Review" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 7.2: Side-by-side workspace comparison card showing proposed changes and accept/reject triggers.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            This card highlights lines to be deleted in red and lines to be added in green. You can inspect imports, verify syntax modifications, and accept or reject the proposal with a single click.
          </p>
        </div>
      )
    },
    {
      id: 'planning',
      category: 'Agent',
      title: 'Planning',
      keywords: ['planning', 'design', 'roadmap', 'compilation', 'cortex', 'mindmap', 'heatmap', 'soundroom'],
      subheadings: [
        { id: 'curriculum-generation', text: 'Curriculum & Path Mappings' },
        { id: 'visualization-mindmap-heated', text: 'Mindmaps & Heatmaps' },
        { id: 'cortex-configuration-soundscape', text: 'Configuration & Sound Room' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Planning</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            The **Cortex Curriculum Planner** compiles complex materials into structured, multi-phase learning pathways. It leverages topological sorting and dependency resolution to ensure concepts flow logically, guiding the student from basic principles to advanced deployment steps.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/agent-planning.png" 
              alt="Cortex Curriculum Planner Board" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 8.1: The Cortex Curriculum Planning interface displaying pathway nodes, study statistics, and navigation settings.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="curriculum-generation" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Curriculum &amp; Path Mappings</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Upon uploading a syllabus or prompt query, SARA parses the objectives and compiles a roadmap tree. This curriculum structure outlines milestones, checks, and code sandbox assignments.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
            To assist first-time users, Cortex includes an interactive <strong>Guided Tour</strong>. The tour walks students through the learning workspace, highlighting active sheet pages, SARA's sidebar control drawer, and compilation buttons to eliminate onboarding friction.
          </p>

          <h2 id="visualization-mindmap-heated" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Mindmaps &amp; Heatmaps</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Visualization is key to understanding complex linkages. Cortex provides multiple visualization layouts:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>Mindmap Options</strong>: Swap between layout styles like force-directed networks, collapsible tree trees, and clean block grids to navigate your milestones.</li>
            <li><strong>Heated Map (Progress Tracker)</strong>: Colors the nodes based on heat signatures of user metrics. Deep orange zones highlight modules where the student spent the most time or struggled with quiz checks, pointing out exactly where to review.</li>
          </ul>

          <h2 id="cortex-configuration-soundscape" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Configuration &amp; Sound Room</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Cortex adapts to the student's study habits and preferences, integrating environmental settings:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>Configure Cortex</strong>: Adjust SARA's tutoring style (e.g. Socratic guiding, code coaching, theoretical review) and path density parameters (depth of details, frequency of quiz verification checks).</li>
            <li><strong>Sound Room (Binaural Focus)</strong>: Integrated audio panel offering custom auditory soundscapes like binaural beats, deep rainfall, or study lo-fi tracks designed to lock the student into deep work.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'prompting',
      category: 'Agent',
      title: 'Prompting',
      keywords: ['prompting', 'socratic', 'instructions', 'variables', 'parameters', 'temperature', 'cortex'],
      subheadings: [
        { id: 'agent-prompting-engineering', text: 'Prompt Engineering Guidelines' },
        { id: 'configuration-options-parameters', text: 'Model Options & Parameters' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Prompting</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            To unlock the full potential of SARA and the Cortex multi-agent stack, you can write context-rich prompts and customize execution parameters. Cortex supports fine-grained prompt configuration settings, letting you manage SARA's reasoning boundaries, context constraints, and model behaviors.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/prompting-1.png" 
              alt="Cortex Prompt Configuration Panel" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 9.1: SARA Prompt configuration console showing rules setup and prompt templates.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="agent-prompting-engineering" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Prompt Engineering Guidelines</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            SARA reacts best when provided with architectural goals rather than simple commands. Follow these guidelines to extract high-fidelity socratic responses:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>Inject Local Files (@)</strong>: Always reference workspace files using the <code>@</code> operator (e.g. <code>@Store.tsx</code>). SARA parses the code block context and understands import scopes.</li>
            <li><strong>Socratic Scopes</strong>: If you want guide explanations rather than copy-paste solutions, explicitly instruct SARA: <em>"Walk me through the validation logic of this routing schema Socratically."</em></li>
            <li><strong>Grounding Prompts</strong>: Inject module resources directly into prompts (e.g. referencing specific bibliography sources) to prevent agent hallucination.</li>
          </ul>

          <h2 id="configuration-options-parameters" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Model Options &amp; Parameters</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            The **Prompt Settings Drawer** lets you fine-tune the generative model parameters to customize the tutor's cognitive behaviors:
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/prompting-2.png" 
              alt="Model Parameters Configuration Console" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 9.2: Model parameters and target context selection console.
            </div>
          </div>

          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>System Rules (.cortexrules)</strong>: Define global custom guidelines (e.g. coding styles, library exclusions) that act as permanent system prompts for SARA.</li>
            <li><strong>Temperature (Creativity Control)</strong>: Scale down temperature (e.g., <code>0.1</code>) for highly structured code compilation tasks, and scale it up (e.g., <code>0.7</code>) for conceptual, Socratic discussions.</li>
            <li><strong>Context Window Allocation</strong>: Restrict the size of the history and file content sent to SARA. Minimizing the context footprint yields quicker responses and reduces API billing token costs.</li>
            <li><strong>Socratic Rigor Scales</strong>: Set SARA's socratic level (e.g., strict socratic, code coach, theoretical guide) to change how quickly it suggests corrections or reveals answers.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'debugging',
      category: 'Agent',
      title: 'Debugging',
      keywords: ['debugging', 'errors', 'sandbox', 'coach', 'compiler', 'sara', 'cortex'],
      subheadings: [
        { id: 'compiler-integration-sandbox', text: 'Sandbox Error Compilations' },
        { id: 'socratic-inline-debugging', text: 'On-the-Spot Socratic Debugging' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Debugging</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            Debugging is a core element of active recall. Cortex replaces static compiler listings with an **Interactive Debugging Loop**. When your sandbox scripts hit syntax or runtime exceptions, SARA intercepts the logs to guide you through code fixes on-the-spot.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/debugging.png" 
              alt="Cortex SARA Debugging Console" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.1: SARA Debugging console providing on-the-spot compiler error breakdowns and visual hints.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="compiler-integration-sandbox" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Sandbox Error Compilations</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            As you compile scripts in the **Cortex Code Sandbox**, any exceptions (e.g. reference errors, undefined properties, scope collisions) are outputted directly to the sandbox console. Rather than leaving you to decode cryptic traces, the sandbox console links directly to the Cortex reasoning pipelines.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
            By clicking the **Fix with Cortex** button next to any compiler error, you immediately forward the code context, error logs, and compilation scope to SARA.
          </p>

          <h2 id="socratic-inline-debugging" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">On-the-Spot Socratic Debugging</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Once SARA receives the error payload, it doesn't simply rewrite the code for you. In line with Socratic pedagogy, SARA explains the core problem and guides you to the fix:
          </p>
          <ul className="list-disc pl-5 space-y-3 text-neutral-600 dark:text-neutral-300">
            <li><strong>Immediate Code Breakdown</strong>: SARA isolates the failing line and explains *why* the browser or runtime threw the error (e.g., explaining synchronous vs asynchronous bounds or type mismatches).</li>
            <li><strong>Interactive Clarification</strong>: SARA asks guiding questions, such as: <em>"We are trying to access a property on an object that hasn't loaded yet. How can we check if the object exists first?"</em></li>
            <li><strong>On-the-Spot Proposing</strong>: SARA can suggest code fragments or guide you to refactor imports right above the active terminal drawer, helping you learn the concepts as you debug.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tools',
      category: 'Agent',
      title: 'Tools',
      keywords: ['tools', 'sandbox', 'compiler', 'smartboard', 'neuralboard', 'd3', 'canvas', 'cortex'],
      subheadings: [
        { id: 'cortex-code-sandbox', text: 'Cortex Code Sandbox' },
        { id: 'cortex-smartboard', text: 'Cortex Smartboard' },
        { id: 'cortex-neuralboard', text: 'Cortex Neuralboard' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Tools</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            Vidhyalaya equips students with a suite of integrated workspace utilities called the **Cortex Toolkit**. By unifying code editors, vector drawing canvases, and interactive dependency graphs inside a single screen, the platform eliminates app-switching overhead and helps you lock into deep focus.
          </p>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          {/* Code Sandbox */}
          <h2 id="cortex-code-sandbox" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Cortex Code Sandbox</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            The **Cortex Code Sandbox** is an interactive, sandboxed coding workspace embedded directly within your lesson worksheets.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/tools-2.png" 
              alt="Cortex Code Sandbox Compiler Drawer" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 10.1: The Cortex Code Sandbox editor and sandboxed runtime terminal.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Rather than jumping to external editors, students write code (JavaScript, HTML, CSS) directly inside their browser context. The sandbox features an integrated console and terminal that captures logs, renders layouts inside an isolated iframe, and calls the Antigravity agent to debug compiler errors Socratically.
          </p>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          {/* Smartboard */}
          <h2 id="cortex-smartboard" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Cortex Smartboard</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            The **Cortex Smartboard** is a vector-based digital canvas that helps students map out algorithm steps, draft system architectures, and visually organize their ideas.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/tools-1.png" 
              alt="Cortex Smartboard Drawing Canvas" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 10.2: The Cortex Smartboard vector drawing console with shape options.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            It integrates visual annotation tools, freehand drawing widgets, and vector shape compilers. SARA can inspect your drawings, identify shapes and flow charts, and offer Socratic feedback over your algorithm blueprints.
          </p>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          {/* Neuralboard */}
          <h2 id="cortex-neuralboard" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Cortex Neuralboard</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The **Cortex Neuralboard** is a force-directed prerequisite graph built in D3.js. It maps the student's study roadmap as an interactive neural network, representing concepts as connected nodes.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/tools-3.png" 
              alt="Cortex Neuralboard D3 Prerequisite Graph" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 10.3: The D3.js force-directed Neuralboard displaying course prerequisite routes.
            </div>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            As students complete quizzes, check worksheets, and run sandbox compiles, nodes dynamically light up to reflect progress. The visual linkages ensure students always know the optimal path prerequisites before jumping to complex modules.
          </p>
        </div>
      )
    },
    {
      id: 'security',
      category: 'Agent',
      title: 'Security',
      keywords: ['security', 'lock', 'owner', 'jwt', 'auth', 'keys', 'encryption', 'cortex'],
      subheadings: [
        { id: 'jwt-auth-locks', text: 'JWT Auth Locks & Domain Locks' },
        { id: 'owner-lock-verification', text: 'Owner Lock Verification' },
        { id: 'api-credential-encryption', text: 'API Key Security & Privacy' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Security</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            Vidhyalaya enforces a zero-trust architecture across all client actions and backend routers. By combining domain-locked authentication, JSON Web Token (JWT) validation guards, and controller-level data filters, the system ensures that user profiles, learning pathways, and API credentials remain isolated and secure.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/security.png" 
              alt="Cortex Security Configuration Console" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 12.1: SARA Security controls showing JWT session guards, domain locks, and request audit logs.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850 my-6" />

          <h2 id="jwt-auth-locks" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">JWT Auth Locks &amp; Domain Locks</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            All backend API communications require a valid JSON Web Token (JWT) in the HTTP Authorization header. When a user authenticates, the Express server grants a short-lived cryptographically signed token containing user identifiers.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Furthermore, to ensure compliance with partnering educational institutions, the authentication gateway implements <strong>Domain-Locks</strong>. Registration loops are hardcoded to accept only verified emails matching specific domains (e.g. <code>@mbu.asia</code> for Mohan Babu University), blocking external public signups.
          </p>

          <h2 id="owner-lock-verification" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Owner Lock Verification</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            To prevent cross-tenant parameter tampering, controllers implement deep ownership validation filters. When SARA attempts to read, mutate, or compile custom learning paths, the Express router extracts <code>req.user.id</code> from the JWT and compares it against the database model's target owner field:
          </p>
          
          <CodeBlock
            filename="authLock.js"
            language="javascript"
            code={`// Verify resource ownership in controllers
const verifyResourceOwner = async (req, res, next) => {
  const resource = await LearningPath.findById(req.params.id);
  if (!resource) return res.status(404).json({ error: "Path not found" });
  
  if (resource.userId.toString() !== req.user.id) {
    return res.status(403).json({ error: "Unauthorized access lock" });
  }
  next();
};`}
          />

          <h2 id="api-credential-encryption" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">API Key Security &amp; Privacy</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Since Vidhyalaya runs a Bring Your Own Key (BYOK) architecture, user keys (Anthropic Claude, OpenAI ChatGPT, xAI Grok) are handled with high encryption protocols:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-300">
            <li><strong>Local Scope Storing</strong>: Keys are stored exclusively inside your browser's local sandbox context. We never save your API keys on our servers.</li>
            <li><strong>Transit Encryption</strong>: Prompts sent to model providers are forwarded directly from the client or through secure, SSL-encrypted stateless proxies that discard payloads immediately after completion.</li>
          </ul>
        </div>
      )
    },

    // --- Session Window ---
    {
      id: 'whiteboard',
      category: 'Session Window',
      title: 'Whiteboard',
      keywords: ['whiteboard', 'canvas', 'sketching', 'drawing', 'vector', 'notes', 'low-latency', 'canvas'],
      subheadings: [
        { id: 'whiteboard-architecture', text: 'Low-Latency Drawing Architecture' },
        { id: 'whiteboard-tools', text: 'Vector Drawing & Editing Toolkit' },
        { id: 'whiteboard-serialization', text: 'State Serialization & MongoDB Sync' },
        { id: 'whiteboard-pedagogy', text: 'Active Recall Sketching Pedagogy' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Whiteboard</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            The Whiteboard offers a high-fidelity vector canvas to sketch out architecture diagrams, draft conceptual block maps, and take hand-drawn study notes directly inside your learning session workspace.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/whiteboard.png" 
              alt="Cortex Whiteboard Drawing Canvas" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.1: The vector-based Whiteboard canvas featuring sketching markers and architectural layout presets.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="whiteboard-architecture" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Low-Latency Drawing Architecture</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The Whiteboard is built on a highly optimized HTML5 Canvas render loop combined with standard PointerEvents APIs. To minimize latency on high-refresh-rate displays, the canvas captures sub-pixel coordinates and applies quadratic Bezier curve interpolation to freehand strokes. This math-based smoothing prevents jagged lines even when drawing quickly with pressure-sensitive styluses like the Apple Pencil.
          </p>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Unlike traditional raster drawing programs that save canvases as raw pixel arrays (such as PNG or JPEG), the Whiteboard stores every stroke as a discrete coordinate vector object. This vector model ensures that drawings scale infinitely, maintaining razor-sharp edges whether displayed on a standard phone screen or projected onto a 4K display.
          </p>

          <Callout type="tip" title="Symmetric Canvas Layout">
            The whiteboard sidebar can be toggled to sit side-by-side with reading documents and video panels, making it an ideal companion for active recall note-taking during synchronous video lectures.
          </Callout>

          <h2 id="whiteboard-tools" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Vector Drawing &amp; Editing Toolkit</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The whiteboard toolbar exposes a professional suite of tools designed to structure complex ideas quickly:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-305">
            <li><strong>Freehand Marker &amp; Highlighter</strong>: Transparent opacity channels for marking up text or drawing structural components.</li>
            <li><strong>Geometric Shape Presets</strong>: Snap-to-shape rectangles, circles, lines, and directional arrows that speed up flowchart drafting.</li>
            <li><strong>Eraser &amp; Stroke Selection</strong>: A smart stroke-based eraser that deletes entire vector curves upon intersection, eliminating messy partial cleanup.</li>
            <li><strong>Color Palette</strong>: A curated selection of high-contrast HSL tokens designed to preserve readability across light and dark interfaces.</li>
          </ul>

          <h2 id="whiteboard-serialization" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">State Serialization &amp; MongoDB Sync</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            To support seamless cross-device learning, the drawing state is serialized into a lightweight JSON schema:
          </p>
          <CodeBlock
            filename="whiteboard-payload.json"
            language="json"
            code={`{
  "strokeId": "str_8f9a2",
  "tool": "pen",
  "color": "hsl(210, 100%, 50%)",
  "width": 3,
  "points": [
    {"x": 120.5, "y": 80.2, "pressure": 0.4},
    {"x": 122.1, "y": 82.5, "pressure": 0.6}
  ]
}`}
          />
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Mutations in the drawing stack are pushed optimistically into the local Zustand store. A debounced synchronization callback pipes the vector array to the Express backend every 1.5 seconds, storing it in the user's study path record in MongoDB Atlas. If a connection drops, updates queue locally and sync automatically when connectivity is restored.
          </p>

          <h2 id="whiteboard-pedagogy" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Active Recall Sketching Pedagogy</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Cognitive science shows that visual translation vastly improves information retention. The Whiteboard sidebar is integrated side-by-side with your active lecture slides and video players. By forcing students to translate text concepts into structural diagrams (such as sketching a database index tree while reading about database internals), the system triggers dual-coding learning, converting abstract logic into concrete visual memories.
          </p>
        </div>
      )
    },
    {
      id: 'smartboard',
      category: 'Session Window',
      title: 'Smartboard',
      keywords: ['smartboard', 'annotations', 'vector', 'ai', 'collaboration', 'shape-detection'],
      subheadings: [
        { id: 'smartboard-annotation-layer', text: 'AI-Powered Annotation Layers' },
        { id: 'smartboard-vector-snapping', text: 'Vector Shape Recognition & Snapping' },
        { id: 'smartboard-collaboration', text: 'Real-time AI Co-drawing' },
        { id: 'smartboard-data-flow', text: 'Generative Pipeline Architecture' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Smartboard</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            The Smartboard introduces collaborative vector layout capabilities, bridging user freehand sketch maps with generative AI design engines.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/tools-1.png" 
              alt="Cortex Smartboard Annotations" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.2: The Smartboard workspace layering AI structural templates over drawing grids.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="smartboard-annotation-layer" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">AI-Powered Annotation Layers</h2>
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            The Smartboard takes simple canvas sketching and connects it directly with SARA's intelligence models. When you draw a diagram, SARA analyzes your layout structure in the background. She maps the relative positions of your shapes and overlays context-aware text labels, code definitions, and academic explanations directly over your drawings.
          </p>
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            For instance, if you sketch a basic system architecture with web servers and databases, SARA identifies the nodes and annotates them with performance guidelines, caching strategies, and data synchronization schemas, matching the topics covered in your active course lessons.
          </p>

          <h2 id="smartboard-vector-snapping" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Vector Shape Recognition &amp; Snapping</h2>
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            The whiteboard features a vector cleanup engine that runs on the client. As you draw rough squares, circles, or triangles, the system calculates bounding boxes, measures path angles, and snaps your sketches into symmetrical shapes:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-350">
            <li><strong>Box snapping</strong>: Converts rough four-sided doodles into perfectly aligned rectangles.</li>
            <li><strong>Circle snapping</strong>: Smooths out elliptical strokes into geometrically perfect circles.</li>
            <li><strong>Arrow snapping</strong>: Identifies lines connecting shapes and attaches logical connection endpoints that slide as you move the shapes.</li>
          </ul>

          <h2 id="smartboard-collaboration" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Real-time AI Co-drawing</h2>
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            SARA acts as a collaborative partner on your drawing board. By prompting SARA from the session chat, you can ask her to draw complex components (e.g. "illustrate the TCP handshake flow"). SARA calculates the nodes and connection arrows and draws them as editable vectors on your whiteboard. You can drag, resize, recolor, and edit her drawings just like your own canvas shapes.
          </p>

          <h2 id="smartboard-data-flow" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Generative Pipeline Architecture</h2>
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            SARA's drawing engine translates natural language prompts into structural JSON components:
          </p>
          <CodeBlock
            filename="smartboard-diagram.json"
            language="json"
            code={`{
  "type": "flowchart",
  "nodes": [
    {"id": "n1", "label": "Client", "x": 100, "y": 150},
    {"id": "n2", "label": "API Gateway", "x": 300, "y": 150}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "label": "HTTPS Request"}
  ]
}`}
          />
          <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
            This data structure is processed in the client, which runs a force-directed layout helper to position nodes before rendering them on the canvas coordinate stack.
          </p>
        </div>
      )
    },
    {
      id: 'neuralboard',
      category: 'Session Window',
      title: 'Neural Board',
      keywords: ['neuralboard', 'd3', 'prerequisites', 'mindmap', 'neural', 'graph', 'dag'],
      subheadings: [
        { id: 'prerequisite-node-mapping', text: 'Prerequisite Node Mapping' },
        { id: 'd3-force-directed-graph', text: 'D3.js Force-Directed Graph' },
        { id: 'progress-state-propagation', text: 'Progress State Propagation' },
        { id: 'overlap-prevention-physics', text: 'Physics-Based Overlap Prevention' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Neural Board</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            Interact with your academic milestones through a force-directed neural knowledge graph.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/neuralboard.png" 
              alt="Cortex Neural Knowledge Graph" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.3: The D3-powered Neural Board displaying topological subject dependencies and lock states.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="prerequisite-node-mapping" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Prerequisite Node Mapping</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The Neural Board structures your learning journey as a directed acyclic graph (DAG). Rather than offering an overwhelming list of linear items, it highlights the clear learning paths connecting concepts. Topics remain locked (represented by gray status rings) until their prerequisite modules are fully cleared.
          </p>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            This design enforces optimal learning progressions. SARA maps the prerequisites mathematically, ensuring you master foundational concepts (such as variables and controls) before the graph unlocks advanced segments (like recursion or asynchronous channels).
          </p>

          <h2 id="d3-force-directed-graph" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">D3.js Force-Directed Graph</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The layout runs a dynamic force simulation using D3.js:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-305">
            <li><strong>Many-Body Repulsion Forces</strong>: Nodes push away from one another, maintaining a `min-w-[900px]` node distance constraint to completely prevent overlapping titles.</li>
            <li><strong>Link Constraints</strong>: Link strengths dynamically adjust to represent the closeness of conceptual dependencies.</li>
            <li><strong>Interactive Center Gravity</strong>: Smooth camera panning and mouse wheel zoom, automatically centering on your active study node.</li>
          </ul>

          <h2 id="progress-state-propagation" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Progress State Propagation</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            When you complete a module or solve a sandbox challenge, the graph updates dynamically. The Zustand store registers the completion event and propagates the update down the dependency tree. Unlocked paths transition visually from locked gray states to active orange outlines, providing clear visual encouragement.
          </p>

          <h2 id="overlap-prevention-physics" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Physics-Based Overlap Prevention</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            To keep complex curriculums legible, the layout runs a collision detection loop inside the D3 tick handler:
          </p>
          <CodeBlock
            filename="collision-loop.js"
            language="javascript"
            code={`// Prevent node collisions in force-directed simulation
const forceCollide = () => {
  const radius = 60;
  return d3.forceCollide()
    .radius(d => d.type === 'core' ? radius * 1.5 : radius)
    .iterations(4);
};`}
          />
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            By running this check multiple times per tick, the layout recalculates node positions dynamically, preventing visual clutter even when displaying massive subjects with hundreds of interconnected components.
          </p>
        </div>
      )
    },
    {
      id: 'compiler',
      category: 'Session Window',
      title: 'Compiler',
      keywords: ['compiler', 'sandbox', 'editor', 'terminal', 'javascript', 'python', 'execution', 'sandbox'],
      subheadings: [
        { id: 'code-sandbox-editor', text: 'Cortex Code Sandbox Editor' },
        { id: 'terminal-console-execution', text: 'Terminal Console Execution' },
        { id: 'language-runtimes', text: 'Isolated Multi-Language Runtimes' },
        { id: 'active-recall-triggers', text: 'Sandbox Active Recall Loops' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Compiler</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            The Compiler sandbox provides a secure development playground allowing students to run code snippets instantly.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/compiler.png" 
              alt="Cortex Code Sandbox Compiler Interface" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 11.4: The Cortex Compiler drawer interface rendering live code run and terminal checks.
            </div>
          </div>

          <hr className="border-slate-200 my-6" />

          <h2 id="code-sandbox-editor" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Cortex Code Sandbox Editor</h2>
          <p className="text-slate-700 leading-relaxed">
            The editor includes syntax highlighting, clean line counts, and automatic bracket closing. It supports multiple learning tracks including JavaScript, TypeScript, HTML/CSS, Python, Go, and Rust.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/practice.png" 
              alt="Cortex Code Sandbox Editor Practice" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 11.4.1: Cortex Code Sandbox editor pane practicing interactive programming tasks.
            </div>
          </div>

          <p className="text-slate-700 leading-relaxed">
            Built using optimized Monaco or CodeMirror modules, the editor is customized to provide visual responsiveness. Autocomplete triggers assist students with API functions, while structural indentations prevent syntax issues during practice.
          </p>

          <h2 id="terminal-console-execution" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Terminal Console Execution</h2>
          <p className="text-slate-700 leading-relaxed">
            Running exercises pipes stdout and stderr logs directly to the integrated console pane. The system parses syntax warnings and offers interactive "Fix with SARA" triggers to explain error callstacks on the spot.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Cortex's terminal emulator captures standard input streams, enabling interactive script execution (such as Python `input()` or Node.js `readline`) inside a simulated TTY layer. The terminal is responsive to standard shell shortcut controls, providing a familiar Unix-like environment. Log records are formatted with high legibility using colored ANSI themes for errors, warning codes, and execution success tags.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/debugging.png" 
              alt="Cortex Compiler Sandbox Terminal Debugging" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 11.4.2: Cortex Compiler Sandbox console detailing intercepted compile exceptions and active debugging workflows.
            </div>
          </div>

          <p className="text-slate-700 leading-relaxed">
            The error parsing agent dissects compile exceptions in real time. It maps stack trace indices back to active code line numbers, drawing subtle visual indicators on the code editor margins. This feedback loop is designed to emulate an on-the-spot code review session. Rather than leaving students to browse online forums, SARA injects context-specific socratic hints directly onto the worksheet layout, prompting students to deduce the correct fixes themselves.
          </p>

          <h2 id="language-runtimes" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Isolated Multi-Language Runtimes</h2>
          <p className="text-slate-700 leading-relaxed">
            To ensure client safety and performance, code execution runs in isolated contexts:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>JavaScript &amp; TypeScript</strong>: Executed directly within an isolated Web Worker sandbox using custom `console.log` interceptors. Web Worker environments are instantiated dynamically upon compile triggers, isolating user script loops from blocking the main DOM thread.</li>
            <li><strong>HTML &amp; CSS</strong>: Rendered inside a stateless iframe sandboxed with `allow-scripts` policies to prevent cross-site scripting vulnerabilities. The rendering frame utilizes a real-time hot-reload listener, matching keystroke updates to live page changes.</li>
            <li><strong>Python, Go, &amp; Rust</strong>: Executed in secure backend Docker containers with restricted memory boundaries and a strict 5-second timeout window. Backend workers compile and run the scripts in ephemeral sandboxes, preventing memory leaks, system exploits, or network calls from running wild.</li>
          </ul>

          <h2 id="active-recall-triggers" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Sandbox Active Recall Loops</h2>
          <p className="text-slate-700 leading-relaxed">
            The sandbox is tightly integrated with SARA's active recall checkpoints. When you read a programming concept, the system provides inline coding challenges. Clicking "Run in Sandbox" moves the template code directly into your editor drawer, letting you execute and test solutions immediately.
          </p>
          <p className="text-slate-700 leading-relaxed">
            The compile checks verify the correctness of the code against predefined testing matrices generated on-the-fly by the Antigravity AI. It checks bounds, input constraints, and logical edge cases. Upon successful evaluation, the Zustand store registers the task as complete, lighting up corresponding progress nodes on the primary learning path dashboard.
          </p>
          <Callout type="important" title="Terminal Access Action Buttons">
            The floating "Run" button in the Cortex Code Sandbox drawer/terminal, as well as the "Run in Sandbox" option rendered over markdown code blocks in ContentRenderer.tsx, are critical for active recall and interactive feedback. They must always remain highly visible, z-indexed above writing sheets, and never be removed, hidden, disabled, or missed under any circumstances.
          </Callout>
        </div>
      )
    },
    {
      id: 'sara-intelligence',
      category: 'Session Window',
      title: 'SARA Intelligence',
      keywords: ['sara', 'intelligence', 'socratic', 'assistant', 'tutoring', 'chat', 'parameters', 'queue'],
      subheadings: [
        { id: 'socratic-tutoring-model', text: 'Socratic Tutor Tuning' },
        { id: 'agent-parameters-behavior', text: 'Parameters & Behaviors' },
        { id: 'api-queue-management', text: 'AI Safety & Queue Management' },
        { id: 'security-context-locking', text: 'Security Locks & Authorization' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">SARA Intelligence</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            Tune SARA's behavioral parameters, socratic rigor thresholds, and data retrieval scopes to customize your academic assistant.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/sara.png" 
              alt="SARA Tutor Agent Panel" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.5: SARA interactive workspace chat drawer providing contextual explanations.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="socratic-tutoring-model" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Socratic Tutor Tuning</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            SARA acts as a strict Socratic tutor, designed to foster deep comprehension. Instead of simply rewriting broken code or giving direct answers, SARA asks probing, guide-style questions that help you track down bugs and conceptual flaws yourself.
          </p>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            By guiding learners through conceptual debug loops, SARA prevents passive answers copy-pasting. The AI tutor evaluates your code inputs, highlights syntax issues, and suggests reference document chapters to build strong recall.
          </p>

          <h2 id="agent-parameters-behavior" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Parameters &amp; Behaviors</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Tune SARA's behavior to match your pace:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-305">
            <li><strong>Socratic Rigor Dials</strong>: Adjust the ratio of hints versus clarifying questions.</li>
            <li><strong>Response Detail Levels</strong>: Set SARA to output brief summaries or elaborate, textbook-style conceptual deep dives.</li>
            <li><strong>Scout Scope Restrictions</strong>: Force SARA to ground responses exclusively in uploaded course documents, avoiding generic web hallucinations.</li>
          </ul>

          <h2 id="api-queue-management" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">AI Safety &amp; Queue Management</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            To prevent rate limit exhaustion and system freezes, SARA gates all LLM requests through a client-side scheduling queue:
          </p>
          <CodeBlock
            filename="apiQueue.js"
            language="javascript"
            code={`// SARA rate limit safety queue configuration
class APIQueue {
  constructor() {
    this.delay = 1500; // 1.5s queue delay throttle
    this.timeout = 120000; // 120s task timeout boundary
  }
  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }
}`}
          />
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            This throttling preserves system stability and ensures all AI prompts run reliably during long study sessions.
          </p>

          <h2 id="security-context-locking" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Security Locks &amp; Authorization</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            All SARA session histories require a valid JWT in the request header. The Express routing stack validates ownership filters, comparing <code>req.user.id</code> against the database model's target owner field to prevent unauthorized cross-tenant parameter tampering.
          </p>
        </div>
      )
    },
    {
      id: 'curriculum',
      category: 'Session Window',
      title: 'Curriculum',
      keywords: ['curriculum', 'syllabus', 'roadmap', 'modules', 'timeline', 'grounding'],
      subheadings: [
        { id: 'syllabus-structure', text: 'Custom Syllabus Structure' },
        { id: 'topological-roadmap-tree', text: 'Topological Roadmap Trees' },
        { id: 'scholarly-grounding', text: 'Scholarly Grounding & Bibliography' },
        { id: 'state-synchronization', text: 'Store Synchronization & Fallbacks' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Curriculum</h1>
          <p className="text-[14.5px] text-neutral-600 dark:text-neutral-305 leading-relaxed font-normal">
            The Curriculum provides structured study paths, compiling unstructured reference texts and files into clear milestones.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/circulum.png" 
              alt="Cortex Curriculum Roadmap Tree" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-850 text-center">
              Figure 11.6: The custom Curriculum syllabus builder displaying phase structures and grounding citations.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="syllabus-structure" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Custom Syllabus Structure</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            By running uploads through Gemini's multi-modal processing pipelines, Vidhyalaya outlines a detailed curriculum structure. Raw lectures, YouTube indexes, and PDFs are mapped into chronological phases, modules, and individual study units, tracking timelines and milestones.
          </p>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            SARA analyzes your uploaded text files, extracts key subjects, and compiles them into separate study milestones. This structure ensures you cover all core topics without redundant lessons.
          </p>

          <h2 id="topological-roadmap-tree" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Topological Roadmap Trees</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The curriculum tree displays path progressions. SARA sequences subjects using topological dependencies, rendering them in a collapsible nested structure. Clicking modules expands lessons and active checkmarks, letting you navigate your course history easily.
          </p>

          <h2 id="scholarly-grounding" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Scholarly Grounding &amp; Bibliography</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            To guarantee academic accuracy and prevent generic hallucinations, all generated headings and study slides are grounded in your uploaded documents. Every topic features a clickable citation node tracing back to the verified source index:
          </p>
          <CodeBlock
            filename="curriculum-grounding.md"
            language="markdown"
            code={`## Introduction to Neural Networks
> Source: [Textbook Chapter 1, Page 12]

This module introduces structural weight matrices and active neuron behaviors.`}
          />
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            This strict bibliography ensures SARA only references verified concepts. It also makes it easy for students to check the original documents whenever they need deep clarification.
          </p>

          <h2 id="state-synchronization" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">State Synchronization &amp; Fallbacks</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Curriculum data syncs with the database using Zustand store hooks. During application load, the system runs a 5-second failsafe timer to forcefully unblock the interface if the cloud fetch is delayed, preserving responsive dashboard access.
          </p>
        </div>
      )
    },
    {
      id: 'developer-roadmaps',
      category: 'Features',
      title: 'Developer Roadmaps',
      keywords: ['roadmap', 'developer', 'pathway', 'journey', 'milestones', 'constellation', 'flow', 'career'],
      subheadings: [
        { id: 'career-goals', text: 'Career Goal Alignment' },
        { id: 'neural-constellation', text: 'Neural Constellation Visualizer' },
        { id: 'timeline-list-structure', text: 'Timeline List Structure' },
        { id: 'neural-flow-dependencies', text: 'Neural Flow & Progress Mapping' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Developer Roadmaps</h1>
          <p className="text-[14.5px] text-neutral-605 dark:text-neutral-300 leading-relaxed font-normal">
            Generate custom learning paths tailored to your career goals, converting unstructured reference materials into sequential modules.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/developer-1.png" 
              alt="Neural Constellation Visualization" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-855 text-center">
              Figure 12.1: The interactive Neural Constellation map displaying stellar clusters of knowledge nodes.
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800 my-6" />

          <h2 id="career-goals" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Career Goal Alignment</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            Vidhyalaya converts raw textbook files or YouTube lists into structured study roadmaps aligned with career objectives (e.g. Frontend Engineer, Database Administrator, Systems Architect). This targeting filters out irrelevant topics, ensuring you only study concepts necessary to clear your career goals.
          </p>

          <h2 id="neural-constellation" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Neural Constellation Visualizer</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The Neural Constellation represents the high-level topological view of your learning pathways, rendered as stellar clusters of knowledge nodes. In this interface, subjects are represented as central anchors, and sub-topics branch outward like celestial constellations. Clicking an anchor expands the constellation, projecting connection lines that represent dependency vectors. This interface helps developers see their learning path in a 3D-like, spatial layout.
          </p>

          <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-850 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/developer-2.png" 
              alt="Timeline List Structure" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-500 font-mono border-t border-neutral-200 dark:border-neutral-855 text-center">
              Figure 12.2: The chronological Timeline List displaying milestone modules and study objectives.
            </div>
          </div>

          <h2 id="timeline-list-structure" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Timeline List Structure</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            For students who prefer a structured, chronological sequence, the Timeline List translates the spatial neural nodes into a clean, Vercel-style vertical roadmap card list. Each card represents a milestone module detailing study objectives, estimated completion hours, and grounding reference texts. The timeline handles real-time expand/collapse states, letting students zoom from an entire semester schedule straight into a 15-minute lesson sheet.
          </p>

          <h2 id="neural-flow-dependencies" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight scroll-mt-24">Neural Flow &amp; Progress Mapping</h2>
          <p className="text-neutral-600 dark:text-neutral-305 leading-relaxed">
            The Neural Flow is the underlying data structure and directional layout algorithm that sequences modules based on topological dependency sorting. As you mark nodes complete, progress flows dynamically downstream, updating locks and weights across all connected constellations. SARA's routing pipelines calculate zero-latency updates to your timeline whenever study schedules are adjusted.
          </p>
        </div>
      )
    },
    {
      id: 'calendar',
      category: 'Features',
      title: 'Calendar',
      keywords: ['calendar', 'scheduler', 'timelines', 'study', 'events', 'scheduling', 'timeblocks'],
      subheadings: [
        { id: 'academic-calendar-grid', text: 'Academic Calendar Grid' },
        { id: 'academic-calendar-gridview', text: 'Weekly Gridview' },
        { id: 'automated-time-blocking', text: 'Automated Time Blocking' },
        { id: 'rescheduling-milestones', text: 'Rescheduling Milestones & Progress Sync' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 mb-2">Calendar</h1>
          <p className="text-[14.5px] text-slate-600 leading-relaxed font-normal">
            Manage your study milestones and plan your week with the integrated Academic Calendar scheduler.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/calendar.png" 
              alt="Academic Calendar Grid" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 13.1: The Academic Calendar panel displaying weekly schedules and class tasks.
            </div>
          </div>

          <hr className="border-slate-200 my-6" />

          <h2 id="academic-calendar-grid" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Academic Calendar Grid</h2>
          <p className="text-slate-700 leading-relaxed">
            The Academic Calendar aggregates all your generated study paths into a single interactive scheduler. Designed under Academic Modernism guidelines with a clean solid-white card interface in light mode and deep Cinematic tones in dark mode, the grid provides a clear visual hierarchy of your upcoming lectures, study blocks, and quizzes.
          </p>
          <p className="text-slate-700 leading-relaxed">
            The calendar layout dynamically displays lesson cards. Color-coded blocks help you distinguish between upcoming reading, active sandboxes, and scheduled review checkpoints across different paths.
          </p>

          <h2 id="academic-calendar-gridview" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Weekly Gridview</h2>
          <p className="text-slate-700 leading-relaxed">
            The Weekly Gridview offers a comprehensive, Vercel-style scheduling matrix. It displays your complete academic roadmap partitioned into daily tracks, showing modules, quizzes, and project checkpoints. This view enables direct drag-and-drop rescheduling, permitting you to dynamically change your study periods while preserving structural prerequisites.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/gridview.png" 
              alt="Academic Calendar Gridview Panel" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 13.2: The Academic Calendar Gridview rendering weekly pathways and module tasks.
            </div>
          </div>

          <Callout type="tip" title="Sync Reminders">
            Calendar alerts sync directly with external channels (such as Slack) to send you automated notifications before your scheduled study sessions begin.
          </Callout>

          <h2 id="automated-time-blocking" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Automated Time Blocking</h2>
          <p className="text-slate-700 leading-relaxed">
            By inputting your daily learning commitment constraints (e.g. 2 hours on weekdays, 4 hours on weekends), the Cortex engine allocates study blocks across your calendar grid. The algorithm sequences your modules mathematically, placing prerequisites first to build a solid topological foundation.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/schedule.png" 
              alt="Automated Scheduling & Time Blocks" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 13.3: Automated time block scheduler sequencing study milestones chronologically.
            </div>
          </div>

          <h2 id="rescheduling-milestones" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Rescheduling Milestones &amp; Progress Sync</h2>
          <p className="text-slate-700 leading-relaxed">
            If you fall behind or miss a deadline, the scheduler automatically recalculates your path. SARA shifts remaining lessons and quizzes downstream to accommodate your calendar changes without resetting your progress markers or grading weights. All updates sync directly with MongoDB Atlas to preserve cross-device consistency.
          </p>
          <p className="text-slate-700 leading-relaxed">
            By mathematically analyzing the completion rates of daily worksheets and code sandbox compile runs, the scheduler dynamically adjusts future durations. This ensures that you are never overwhelmed with too much catch-up material.
          </p>
        </div>
      )
    },
    {
      id: 'zenmode',
      category: 'Features',
      title: 'Zen Mode',
      keywords: ['zenmode', 'zen', 'focus', 'immersive', 'cinematic', 'sounds', 'binaural'],
      subheadings: [
        { id: 'immersive-zen-canvas', text: 'Immersive Focused Canvas' },
        { id: 'cinematic-dark-mode', text: 'Cinematic Dark Mode UI' },
        { id: 'binaural-audio-ambience', text: 'Binaural Audio & Ambient Sound Room' },
        { id: 'pedagogy-flow-states', text: 'Pedagogy of Distraction-Free Flow' }
      ],
      content: (
        <div className="space-y-6 text-justify hyphens-auto">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 mb-2">Zen Mode</h1>
          <p className="text-[14.5px] text-slate-600 leading-relaxed font-normal">
            Immerse yourself in a distraction-free cinematic workspace tuned for active recall and deep cognitive work.
          </p>

          <div className="my-6 rounded-lg border border-slate-200 bg-neutral-950 overflow-hidden shadow-lg select-none">
            <img 
              src="/images/zen.png" 
              alt="Immersive Zen Mode Canvas" 
              className="w-full h-auto block select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
            />
            <div className="px-4 py-2 bg-neutral-50 text-[10px] text-slate-500 font-mono border-t border-slate-200 text-center">
              Figure 14.1: The Cinematic Zen Mode interface featuring clean study pages and floating tool panels.
            </div>
          </div>

          <hr className="border-slate-200 my-6" />

          <h2 id="immersive-zen-canvas" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Immersive Focused Canvas</h2>
          <p className="text-slate-700 leading-relaxed">
            Zen Mode reorganizes your learning session. Clicking the Zen trigger activates the layout engine to hide all sidebars, collapse dashboard shortcuts, and hide secondary navigation elements. The interface removes visual noise, centering your reading sheet, video panel, and sandboxes in a balanced, side-by-side workspace.
          </p>
          <p className="text-slate-700 leading-relaxed">
            This spatial configuration puts your study materials at the center. By removing sidebars and notification drawers, it helps students maintain attention on active code editor consoles or text guides. It repositions the learnable worksheet canvas into a dual-column split view, keeping the user's attention anchored on the core text and the interactive compiler elements.
          </p>

          <h2 id="cinematic-dark-mode" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Cinematic Dark Mode UI</h2>
          <p className="text-slate-700 leading-relaxed">
            To prevent visual fatigue during long study sessions, Zen Mode switches your layout to a deeply focused cinematic dark styling (`bg-[#05070a]`). High-contrast borders are smoothed out, and card surface colors are dimmed to prioritize video feeds, code blocks, and canvas highlights.
          </p>
          <p className="text-slate-700 leading-relaxed">
            This UI transition reduces visual fatigue (astigmatism triggers, high-frequency white-blue light) by shifting to a monochromatic palette with `#05070a` as the anchor. Contrast ratios are carefully set so that compile errors and key learning prompts are the only items that glow, ensuring maximum legibility and zero distraction.
          </p>

          <h2 id="binaural-audio-ambience" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Binaural Audio &amp; Ambient Sound Room</h2>
          <p className="text-slate-700 leading-relaxed">
            The integrated focus Sound Room helps you block out ambient noise:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Binaural Beats</strong>: Alpha and Theta frequency options tuned to promote focus and recall. Binaural beats sync the brain to Alpha (8-12 Hz for processing) and Theta (4-8 Hz for deep memory encoding) waves.</li>
            <li><strong>Ambient Textures</strong>: Curated audio loops (soft rain, white noise, coffee shop hums) that run directly in your browser.</li>
            <li><strong>Volume Balance Controllers</strong>: Easily adjust background volume directly inside the session navbar without opening other apps.</li>
          </ul>

          <h2 id="pedagogy-flow-states" className="text-lg font-bold text-slate-900 tracking-tight scroll-mt-24">Pedagogy of Distraction-Free Flow</h2>
          <p className="text-slate-700 leading-relaxed">
            In online learning, distraction is the primary obstacle to progress. Zen Mode leverages cognitive load reduction principles to help students enter flow states faster. By combining minimalist layouts with focused binaural beats, it keeps working memory clear, making it easier to digest advanced technical concepts.
          </p>
        </div>
      )
    },
  ], [copiedId]);

  // Fuzzy matching for doc search
  const filteredSearchSections = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    const matches: { section: DocSection; matchedSub?: DocSubheading }[] = [];
    
    sections.forEach(sec => {
      const titleMatch = sec.title.toLowerCase().includes(query);
      const catMatch = sec.category.toLowerCase().includes(query);
      const keywordMatch = sec.keywords.some(k => k.includes(query));
      
      if (titleMatch || catMatch || keywordMatch) {
        matches.push({ section: sec });
      } else {
        const subMatch = sec.subheadings.find(sub => sub.text.toLowerCase().includes(query));
        if (subMatch) {
          matches.push({ section: sec, matchedSub: subMatch });
        }
      }
    });
    
    return matches.slice(0, 8);
  }, [sections, searchQuery]);

  // Group sections by category for the sidebar layout
  const groupedSections = useMemo(() => {
    const groups: Record<string, DocSection[]> = {};
    sections.forEach(sec => {
      if (!groups[sec.category]) {
        groups[sec.category] = [];
      }
      groups[sec.category].push(sec);
    });
    return groups;
  }, [sections]);

  const activeSection = useMemo(() => {
    return sections.find(sec => sec.id === selectedSectionId) || sections[0];
  }, [sections, selectedSectionId]);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-transparent text-slate-800 overflow-hidden relative">
      
      {/* ── AURORA ATMOSPHERE — Exact Landing Page Replica ── */}
      <div className="app-aurora-root">
        <div className="app-aurora-layer" />
        <div className="app-aurora-noise" />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(78, 91, 255, 0.15);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(78, 91, 255, 0.28);
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          letter-spacing: -0.02em;
          color: #0f172a !important;
        }
        .prose p {
          margin-bottom: 1.35rem !important;
          line-height: 1.75 !important;
          color: #334155 !important;
        }
        .prose li {
          line-height: 1.65 !important;
          color: #334155 !important;
          margin-bottom: 0.5rem !important;
        }
        .prose strong {
          color: #0f172a !important;
        }
        .prose code {
          background: rgba(78, 91, 255, 0.05) !important;
          border: 1px solid rgba(78, 91, 255, 0.12) !important;
          padding: 0.15rem 0.35rem !important;
          border-radius: 4px !important;
          color: #4e5bff !important;
        }
      `}} />
      
      {/* ── Top Header Navbar ── */}
      <header className="sticky top-0 z-[100] w-full border-b backdrop-blur-md transition-all duration-300 border-slate-200/80 bg-white/80 select-none shadow-sm text-slate-800">
        <div className="max-w-8xl w-full mx-auto flex items-center justify-between px-6 md:px-8 py-3.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const isFromApp = (location.state as { fromApp?: boolean })?.fromApp ?? (sessionStorage.getItem('fromApp') === 'true');
                if (isFromApp || isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {((location.state as { fromApp?: boolean })?.fromApp ?? (sessionStorage.getItem('fromApp') === 'true') ?? isAuthenticated) ? 'Back to Roadmaps' : 'Back to Home'}
            </button>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-[#4e5bff]/10 border border-[#4e5bff]/20 shadow-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[18px] h-[18px] text-[#4e5bff]">
                  <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
                  <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="text-[12px] font-black uppercase tracking-widest text-[#4e5bff]">Cortex Docs</span>
            </div>
          </div>

          {/* Minimal Search Button (DocSearch style trigger) */}
          <div className="hidden md:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between w-64 px-3 py-1.5 rounded-lg border text-xs text-left transition-all bg-slate-50/80 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                Search docs...
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white rounded border border-slate-200 text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border transition-all bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ── */}
      <div className="flex-1 flex max-w-8xl w-full mx-auto relative px-6 md:px-8 py-6 gap-8 overflow-hidden h-[calc(100vh-57px)]">
        
        {/* 1. Left Sidebar Navigation */}
        <aside className={`fixed md:sticky top-0 z-40 w-[240px] shrink-0 h-full flex flex-col md:translate-x-0 transition-transform duration-300 md:block single-sidebar-bg sidebar-grid-canvas text-[#202124] ${
          isMobileMenuOpen ? 'translate-x-0 left-4 p-4 rounded-2xl shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}>
          
          <div className="md:hidden mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5F6368]" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-[36px] rounded-[18px] text-[13px] outline-none border bg-[#FFFFFF] border-[#DADCE0] text-[#202124] placeholder-[#5F6368]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar select-none pb-12 mt-4">
            {Object.keys(groupedSections).length > 0 ? (
              Object.entries(groupedSections).map(([category, items]) => (
                <div key={category} className="space-y-1 mt-6 first:mt-0">
                  <h4 className="text-[10px] font-bold tracking-widest text-[#5F6368] uppercase px-3 mb-2.5">
                    {category}
                  </h4>
                  <div className="space-y-0.5">
                    {items.map((sec) => {
                      const isActive = selectedSectionId === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => {
                            setSelectedSectionId(sec.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-[13px] transition-all duration-200 border-l-2 pl-2.5 ${
                            isActive
                              ? 'text-[#202124] font-semibold bg-[#E8EAED] border-[#4e5bff]'
                              : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED] border-transparent'
                          }`}
                        >
                          <span className="truncate">{sec.title.replace('Welcome to Vidhyalaya', 'Welcome').replace('Quickstart Guide', 'Quickstart').replace('TypeScript SDK', 'TypeScript').replace('Python SDK', 'Python').replace('Rules (.cortexrules)', 'Rules').replace('Cloud Agents Overview', 'Overview')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-medium italic">
                No matching topics found
              </div>
            )}
          </div>
        </aside>

        {/* 2. Middle Article Viewer Area */}
        <main
          ref={contentContainerRef}
          className="flex-1 min-w-0 h-full overflow-y-auto px-2 md:px-6 scroll-smooth custom-scrollbar pb-20"
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-8 md:p-10 shadow-sm">
              <article className="prose max-w-none text-justify hyphens-auto">
                {activeSection.content}
              </article>
            </div>
          </div>
        </main>

        {/* 3. Right Sidebar: Table of Contents ("On this page") */}
        <aside className="hidden lg:block w-[180px] shrink-0 h-full overflow-y-auto sticky top-0 select-none pb-12 pr-2 custom-scrollbar">
          {activeSection.subheadings.length > 0 && (
            <div className="space-y-3 pl-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono block mb-3 pl-1">
                On this page
              </span>
              <div className="flex flex-col relative border-l border-slate-200/80">
                {activeSection.subheadings.map((sub) => {
                  const isActive = activeHeadingId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => scrollToHeading(sub.id)}
                      className={`text-[12px] leading-relaxed text-left transition-all duration-150 pl-4 py-1 -ml-[1px] border-l ${
                        isActive
                          ? 'text-[#4e5bff] font-semibold border-[#4e5bff]'
                          : 'text-slate-500 hover:text-slate-900 border-transparent hover:border-slate-350'
                      }`}
                    >
                      {sub.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

      </div>

      {/* ── Command Palette DocSearch Modal ── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-24 px-4 select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setIsSearchOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Search Dialog Box */}
          <div className="relative w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl bg-white border-slate-200 text-slate-800">
            {/* Search Input */}
            <div className="flex items-center px-4 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search documentation topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-4 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
              />
              <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-50 rounded border border-slate-200 text-slate-400 font-mono shrink-0">
                ESC
              </kbd>
            </div>

            {/* Results list */}
            <div className="max-h-[320px] overflow-y-auto p-3 custom-scrollbar">
              {searchQuery.trim() ? (
                filteredSearchSections.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-2 block mb-1">
                      Search Results
                    </span>
                    {filteredSearchSections.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSectionId(item.section.id);
                          if (item.matchedSub) {
                            setTimeout(() => scrollToHeading(item.matchedSub!.id), 100);
                          }
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-slate-50 text-slate-700 hover:text-[#4e5bff]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold">{item.section.title}</span>
                          <span className="text-[10px] opacity-60">
                            {item.matchedSub ? `Section: ${item.matchedSub.text}` : item.section.category}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 italic">
                    No documentation matched "{searchQuery}"
                  </div>
                )
              ) : (
                <div className="text-center py-8 space-y-1.5 select-none">
                  <Keyboard className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Search for roadmap tools, classes, SARA chat features, or sandboxes</p>
                  <p className="text-[10px] text-slate-400 font-mono">Type query above to filter contents instantly</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Docs;


