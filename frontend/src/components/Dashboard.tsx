import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../context/Store';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Compass,
  FileUp,
  FlaskConical,
  Layers,
  Pen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const roleRoadmaps = [
  // Original 25
  'Frontend', 'Backend', 'Full Stack', 'DevOps', 'DevSecOps',
  'Data Analyst', 'AI Engineer', 'AI and Data Scientist', 'Data Engineer',
  'Android', 'Machine Learning', 'PostgreSQL', 'iOS', 'Blockchain', 'QA',
  'Software Architect', 'Cyber Security', 'UX Design', 'Technical Writer',
  'Game Developer', 'MLOps', 'Product Manager', 'Engineering Manager',
  'Developer Relations', 'BI Analyst',
  // Added 25
  'Cloud Architect', 'Site Reliability Engineer', 'Platform Engineer',
  'Staff Engineer', 'Principal Engineer', 'Solutions Architect',
  'Embedded Systems Engineer', 'Systems Programmer', 'Compiler Engineer',
  'Database Administrator', 'Network Engineer', 'Security Engineer',
  'Penetration Tester', 'Incident Response Engineer', 'Reverse Engineer',
  'AR / VR Developer', 'Robotics Engineer', 'Computer Vision Engineer',
  'NLP Engineer', 'Quantitative Analyst', 'Fintech Engineer',
  'Healthcare Data Engineer', 'GIS Developer', 'Web3 Developer',
  'Open Source Maintainer',
  // New 50
  'API Engineer', 'Integration Engineer', 'Middleware Engineer',
  'Infrastructure Engineer', 'Release Engineer', 'Build Engineer',
  'Chaos Engineer', 'Observability Engineer', 'Performance Engineer',
  'Accessibility Engineer', 'Internationalization Engineer', 'Localization Engineer',
  'Privacy Engineer', 'Compliance Engineer', 'Trust & Safety Engineer',
  'Search Engineer', 'Recommendation Systems Engineer', 'Ranking Engineer',
  'Distributed Systems Engineer', 'Real-Time Systems Engineer', 'Edge Computing Engineer',
  'Digital Twin Engineer', 'Simulation Engineer', 'Scientific Computing Engineer',
  'Bioinformatics Engineer', 'Climate Tech Engineer', 'Energy Systems Engineer',
  'Smart Contract Developer', 'DeFi Engineer', 'Crypto Infrastructure Engineer',
  'Metaverse Engineer', 'Haptics Engineer', 'Spatial Computing Engineer',
  'Voice Interface Engineer', 'Conversational AI Engineer', 'AI Safety Engineer',
  'Prompt Engineer', 'AI Product Manager', 'AI Operations Engineer',
  'Data Platform Engineer', 'Analytics Engineer', 'Decision Intelligence Engineer',
  'Growth Engineer', 'Revenue Engineer', 'Commerce Engineer',
  'Education Technology Engineer', 'Legal Tech Engineer', 'PropTech Engineer',
  'AgriTech Engineer', 'SpaceTech Engineer',
];

const skillRoadmaps = [
  // Core Languages & Frameworks (original)
  'SQL', 'Computer Science', 'React', 'Vue', 'Angular', 'JavaScript',
  'TypeScript', 'Node.js', 'Python', 'System Design', 'Java', 'ASP.NET Core',
  'API Design', 'Spring Boot', 'Flutter', 'C++', 'Rust', 'Go',
  'GraphQL', 'React Native', 'Design System', 'Prompt Engineering', 'MongoDB',
  'Linux', 'Kubernetes', 'Docker', 'AWS', 'Terraform', 'Data Structures & Algorithms',
  'Redis', 'Git and GitHub', 'PHP', 'Cloudflare', 'AI Red Teaming', 'AI Agents',
  'Next.js', 'Kotlin', 'HTML', 'CSS', 'Swift & Swift UI', 'Shell / Bash',
  'Laravel', 'Elasticsearch', 'Django', 'Ruby on Rails', 'LeetCode',
  // Cloud & Infrastructure
  'Azure', 'Google Cloud Platform', 'DigitalOcean', 'Serverless', 'Pulumi',
  'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD', 'ArgoCD',
  // Databases & Data
  'MySQL', 'PostgreSQL Advanced', 'Cassandra', 'Neo4j', 'DynamoDB',
  'Apache Kafka', 'RabbitMQ', 'Apache Spark', 'Snowflake', 'dbt',
  // AI & ML
  'TensorFlow', 'PyTorch', 'LangChain', 'Hugging Face', 'OpenAI API',
  'RAG Architectures', 'Fine-Tuning LLMs', 'MLflow', 'Vector Databases', 'Computer Vision',
  // Security & Networking
  'OAuth 2.0 & OIDC', 'Web Security', 'Cryptography', 'OWASP Top 10', 'Zero Trust',
  // Testing & Quality
  'Cypress', 'Playwright', 'Jest', 'Vitest', 'Storybook',
  // Mobile & Cross-Platform
  'Jetpack Compose', 'SwiftUI Advanced', 'Expo', 'Tauri', 'Electron',
  // Architecture
  'Microservices', 'Event-Driven Architecture', 'Domain-Driven Design', 'Clean Architecture', 'CQRS',
  // Bonus — rounding to 100
  'WebSockets', 'gRPC', 'WebAssembly', 'Deno',
];

const projectIdeas = [
  // Web Development
  'Frontend', 'Backend', 'Full Stack Web App', 'Landing Page', 'Portfolio Website',
  'E-Commerce Store', 'Blog Platform', 'Social Media Clone', 'SaaS Dashboard',
  'Admin Panel',
  // Mobile & Cross-Platform
  'Android App', 'iOS App', 'React Native App', 'Flutter App', 'Progressive Web App',
  // APIs & Backend
  'REST API', 'GraphQL API', 'Real-Time Chat App', 'Authentication System',
  'Payment Gateway Integration',
  // DevOps & Infrastructure
  'DevOps', 'CI/CD Pipeline', 'Monitoring Dashboard', 'Infrastructure as Code',
  'Container Orchestration',
  // Data & AI
  'Data Pipeline', 'Machine Learning Model', 'AI Chatbot', 'Recommendation Engine',
  'Data Visualization Dashboard',
  // Blockchain & Web3
  'Smart Contract', 'DeFi App', 'NFT Marketplace', 'DAO Platform', 'Token Launchpad',
  // Tools & CLI
  'CLI Tool', 'VS Code Extension', 'Browser Extension', 'Desktop App',
  'Developer SDK',
  // Real-Time & IoT
  'WebSocket Server', 'IoT Dashboard', 'Live Streaming Platform',
  'Multiplayer Game', 'Collaborative Editor',
  // Business & Productivity
  'CRM System', 'Project Management Tool', 'Invoice Generator',
  'Scheduling App', 'Email Automation Platform',
];
const bestPractices = [
  // Security & Compliance
  'AWS', 'API Security', 'Web Application Security', 'Zero Trust Architecture', 'Cloud Security',
  // Performance
  'Backend Performance', 'Frontend Performance', 'Database Optimization', 'Caching Strategies', 'Load Testing',
  // Code Quality
  'Code Review', 'Testing Strategy', 'Technical Debt Management', 'Documentation Standards',
  // Architecture & Ops
  'System Design Patterns', 'Microservices Governance', 'Incident Management', 'Observability',
  'CI/CD Best Practices', 'Accessibility Compliance',
];
const newItems = new Set([
  'AI Agents', 'AI Red Teaming', 'LeetCode',
  'Cloud Architect', 'Platform Engineer', 'Staff Engineer',
  'Computer Vision Engineer', 'NLP Engineer', 'Web3 Developer',
  'AR / VR Developer', 'Open Source Maintainer',
  // New skills
  'LangChain', 'Hugging Face', 'RAG Architectures', 'Fine-Tuning LLMs',
  'Vector Databases', 'Pulumi', 'ArgoCD', 'Playwright', 'Vitest',
  'Tauri', 'CQRS', 'dbt', 'Snowflake', 'GitHub Actions',
  // New projects
  'AI Chatbot', 'DAO Platform', 'Collaborative Editor',
  'NFT Marketplace', 'Token Launchpad', 'Live Streaming Platform',
]);

type RoadmapCategory = 'Role Based Roadmap' | 'Skill Based Roadmap' | 'Project Ideas' | 'Best Practices';

const tabs: { id: RoadmapCategory; label: string; icon: React.ReactNode; items: string[] }[] = [
  { id: 'Role Based Roadmap', label: 'Roles', icon: <Compass size={14} />, items: roleRoadmaps },
  { id: 'Skill Based Roadmap', label: 'Skills', icon: <BrainCircuit size={14} />, items: skillRoadmaps },
  { id: 'Project Ideas', label: 'Projects', icon: <Target size={14} />, items: projectIdeas },
  { id: 'Best Practices', label: 'Best Practices', icon: <ShieldCheck size={14} />, items: bestPractices },
];

const tabMeta: Record<RoadmapCategory, { headline: string; sub: string }> = {
  'Role Based Roadmap': {
    headline: 'Role Blueprints',
    sub: 'Destination-first paths — click one to go, or select multiple to fuse into a hybrid role.',
  },
  'Skill Based Roadmap': {
    headline: 'Skill Mastery',
    sub: 'Technology-first paths that take you from prerequisites to confident expertise.',
  },
  'Project Ideas': {
    headline: 'Build & Ship',
    sub: 'Portfolio-first paths where creating something real is the curriculum.',
  },
  'Best Practices': {
    headline: 'Production Excellence',
    sub: 'Operational habits, security standards, and engineering judgment.',
  },
};

const RoadmapPill: React.FC<{
  label: string;
  isNew?: boolean;
  isSelected?: boolean;
  multiMode: boolean;
  onClick: () => void;
  onToggle: () => void;
  variants?: any;
  progress?: number; // 0 to 100
}> = ({ label, isNew, isSelected, multiMode, onClick, onToggle, variants, progress = 0 }) => (
  <motion.button
    variants={variants}
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={multiMode ? onToggle : onClick}
    className={`group relative flex flex-col justify-center gap-1 rounded-[18px] px-5 py-3.5 text-left text-[13px] font-bold min-h-[64px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
      isSelected
        ? 'vault-active-premium text-white shadow-lg'
        : 'vault-card-premium text-slate-700 hover:text-[#000666] hover:shadow-md'
    } ${multiMode && isSelected ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#000666]' : ''}`}
  >
    {/* Neural Link Glow (only in multi-mode selected) */}
    {multiMode && isSelected && (
      <motion.div 
        className="absolute -inset-1 rounded-[22px] bg-white/10 blur-md z-[-1]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
    )}
    {/* Holographic Shimmer Effect */}
    <div className="absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
    </div>

    <div className="flex items-center gap-3 w-full">
      {/* Checkbox indicator in multi-mode */}
      {multiMode && (
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[6px] border transition-all duration-300 ${
          isSelected
            ? 'border-white/20 bg-white text-[#000666] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
            : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400 group-hover:bg-white'
        }`}>
          {isSelected && <Check size={11} strokeWidth={3.5} />}
        </span>
      )}
      <span className="flex-1 whitespace-normal leading-tight tracking-tight break-words">{label}</span>
      {isNew && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
          isSelected 
            ? 'bg-white/20 text-white border border-white/10' 
            : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50 group-hover:bg-indigo-100 group-hover:border-indigo-200'
        }`}>
          New
        </span>
      )}
      {!multiMode && (
        <ArrowRight
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isSelected 
              ? 'text-white opacity-100 translate-x-1' 
              : 'text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-[#000666] group-hover:translate-x-1'
          }`}
        />
      )}
    </div>

    {/* Mastery Progress Gauge */}
    {progress > 0 && (
      <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-slate-100/10 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}
        />
      </div>
    )}
  </motion.button>
);

/* ─── Skeleton Loader ────────────────────────────────────────────────────────── */
const RoadmapPillSkeleton = () => (
  <div className="flex min-h-[56px] items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50/50 px-5 py-3.5 animate-pulse">
    <div className="h-4 w-3/4 rounded-md bg-slate-200/60" />
    <div className="ml-auto h-3.5 w-3.5 rounded-full bg-slate-200/50" />
  </div>
);

/* ─── Quick-launch card ──────────────────────────────────────────────────────── */
const QuickCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
  onClick?: () => void;
}> = ({ icon, title, body, accent, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col gap-4 rounded-[20px] border border-slate-100 bg-white p-5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-[0_8px_24px_rgba(0,6,102,0.07)]"
  >
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} transition-transform duration-300 group-hover:scale-110`}>
      {icon}
    </div>
    <div>
      <p className="text-[13px] font-black text-slate-800">{title}</p>
      <p className="mt-1 text-[12px] font-medium leading-relaxed text-slate-400">{body}</p>
    </div>
  </button>
);

/* ─── Custom Creation Modal (works for Role, Skill, Project, etc.) ────────── */
const categoryLabels: Record<RoadmapCategory, { singular: string; placeholder: string; hint: string }> = {
  'Role Based Roadmap': {
    singular: 'Role',
    placeholder: 'e.g. Quantum Computing Engineer, AI Ethics Researcher...',
    hint: 'Vidhyalaya will use Gemini AI to synthesize a comprehensive mastery path for any role — even if it\'s brand new.',
  },
  'Skill Based Roadmap': {
    singular: 'Skill',
    placeholder: 'e.g. WebAssembly, Zig, Mojo, Solidity, Three.js...',
    hint: 'Describe any technology or skill — Gemini will build a structured path from fundamentals to mastery.',
  },
  'Project Ideas': {
    singular: 'Project',
    placeholder: 'e.g. SaaS Dashboard, CLI Tool, Real-time Chat App...',
    hint: 'Describe a project idea and Gemini will create a build-oriented learning path around it.',
  },
  'Best Practices': {
    singular: 'Practice',
    placeholder: 'e.g. Microservices Testing, Database Indexing, CI/CD Pipelines...',
    hint: 'Describe a practice area and Gemini will synthesize an excellence-first learning path.',
  },
};

const CustomCreationModal: React.FC<{
  open: boolean;
  category: RoadmapCategory;
  onClose: () => void;
  onSubmit: (value: string) => void;
}> = ({ open, category, onClose, onSubmit }) => {
  const [value, setValue] = useState('');
  const labels = categoryLabels[category];

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all duration-500" 
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-[32px] bg-white p-10 shadow-[0_24px_80px_-12px_rgba(0,6,102,0.15)] ring-1 ring-slate-100/50"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-600 hover:rotate-90">
              <X size={20} />
            </button>

            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-indigo-500 to-[#000666] text-white shadow-[0_8px_16px_-4px_rgba(0,6,102,0.2)]">
                <Pen size={22} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">Create Custom {labels.singular}</h3>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-500">Can't find what you're looking for? Define it yourself and our AI will build the curriculum.</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300 transition-colors group-focus-within:text-indigo-500">
                <Sparkles size={18} />
              </div>
              <input
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value.trim()); setValue(''); } }}
                placeholder={labels.placeholder}
                className="w-full rounded-[20px] border-2 border-slate-100 bg-white py-4 pl-12 pr-5 text-[15px] font-semibold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-[16px] px-6 py-3.5 text-[12px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(''); } }}
                disabled={!value.trim()}
                className="inline-flex items-center gap-2.5 rounded-[16px] bg-[#000666] px-8 py-3.5 text-[12px] font-black uppercase tracking-widest text-white shadow-[0_8px_20px_-4px_rgba(0,6,102,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
              >
                <Zap size={14} className="fill-white" />
                Build {labels.singular}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Animation Variants ────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 24 
    } 
  }
};

const tabColorMap: Record<RoadmapCategory, string> = {
  'Role Based Roadmap': 'rgba(79, 70, 229, 0.03)',
  'Skill Based Roadmap': 'rgba(16, 185, 129, 0.03)',
  'Project Ideas': 'rgba(245, 158, 11, 0.03)',
  'Best Practices': 'rgba(59, 130, 246, 0.03)',
};

const tabGlowMap: Record<RoadmapCategory, string> = {
  'Role Based Roadmap': 'from-indigo-500/5',
  'Skill Based Roadmap': 'from-emerald-500/5',
  'Project Ideas': 'from-amber-500/5',
  'Best Practices': 'from-blue-500/5',
};

/* ─── Dashboard ──────────────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const [activeTab, setActiveTab] = useState<RoadmapCategory>('Role Based Roadmap');
  const [query, setQuery] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customRoleOpen, setCustomRoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mastery Progress calculation per role
  const masteryMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!paths || !Array.isArray(paths)) return map;
    
    paths.forEach(p => {
      if (!p.phases) return;
      const allModules = p.phases.flatMap(ph => ph.modules || []);
      const completed = allModules.filter(m => m.isCompleted).length;
      if (allModules.length > 0) {
        map[p.title] = Math.round((completed / allModules.length) * 100);
      }
    });
    return map;
  }, [paths]);

  // Simulate loading state on mount
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (tabId: RoadmapCategory) => {
    if (activeTab === tabId) return;
    setActiveTab(tabId);
    setQuery('');
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 400);
  };

  const currentTab = tabs.find(t => t.id === activeTab)!;
  const meta = tabMeta[activeTab];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return currentTab.items.map(item => ({ item, tabId: currentTab.id, track: currentTab.label }));
    }
    
    // Global search across all tabs
    const results: { item: string, tabId: string, track: string }[] = [];
    tabs.forEach(tab => {
      tab.items.forEach(item => {
        if (item.toLowerCase().includes(q)) {
          results.push({ item, tabId: tab.id, track: tab.label });
        }
      });
    });
    return results;
  }, [query, currentTab]);

  const toggleItem = useCallback((item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  const handleSingleSelect = (item: string) => {
    let goal = item;
    let track = activeTab as string;
    if (activeTab === 'Project Ideas') { goal = `${item} project portfolio`; track = 'Architectural Build'; }
    if (activeTab === 'Best Practices') { goal = `${item} best practices`; track = 'Deep Dive'; }
    navigate(`/explore?${new URLSearchParams({ goal, track }).toString()}`);
  };

  const currentLabel = categoryLabels[activeTab].singular;

  const handleMultiBuild = () => {
    if (selected.size === 0) return;
    const items = Array.from(selected);
    const goal = items.length === 1
      ? items[0]
      : `Hybrid ${currentLabel}: ${items.join(' + ')}`;
    const track = items.length === 1 ? activeTab : `Hybrid ${currentLabel}`;
    navigate(`/explore?${new URLSearchParams({ goal, track }).toString()}`);
  };

  const handleCustomCreate = (value: string) => {
    setCustomRoleOpen(false);
    navigate(`/explore?${new URLSearchParams({ goal: value, track: `Custom ${currentLabel}` }).toString()}`);
  };

  const handleExitMulti = () => {
    setMultiMode(false);
    setSelected(new Set());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="relative h-full flex-1 overflow-y-auto px-5 pb-24 pt-8 sm:px-8 lg:px-10 xl:px-14 transition-colors duration-1000"
      style={{ backgroundColor: tabColorMap[activeTab] || '#f5f6fa' }}
    >
      {/* Neural Background Noise/Grain */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Background Chromatic Glow */}
      <div className={`absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl ${tabGlowMap[activeTab] || 'from-indigo-500/5'} to-transparent blur-[120px] pointer-events-none transition-all duration-1000 opacity-60`} />
      <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr ${tabGlowMap[activeTab] || 'from-indigo-500/5'} to-transparent blur-[100px] pointer-events-none transition-all duration-1000 opacity-40`} />

      {/* Scholastic Particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.05, 0.15, 0.05],
            y: [-20, 20, -20],
            x: [-10, 10, -10]
          }}
          transition={{ 
            duration: 10 + i * 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 rounded-full bg-indigo-500/20 blur-sm pointer-events-none"
          style={{ 
            top: `${15 + i * 15}%`, 
            left: `${10 + i * 15}%` 
          }}
        />
      ))}

      <div className="relative mx-auto max-w-[1440px] space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
              Vidhyalaya — Place of Wisdom
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Roadmap Library
            </h1>
            <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-slate-500">
              Choose your destination. Click one to begin, or fuse multiple into a hybrid path.
            </p>
          </div>
        </div>

        {/* ── Stat Chips ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tabs.map((tab, i) => {
            const accents = ['#000666', '#065f46', '#7c2d12', '#1e3a5f'];
            return (
              <motion.button
                key={tab.id}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabChange(tab.id)}
                className={`group flex items-center gap-4 rounded-[20px] px-5 py-4 text-left ring-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  activeTab === tab.id
                    ? 'bg-white ring-slate-200 shadow-lg'
                    : 'bg-white ring-slate-100 hover:bg-white hover:ring-slate-200 hover:shadow-md'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white transition-all duration-500 ${
                    activeTab === tab.id ? 'scale-110 shadow-lg' : 'opacity-60 group-hover:opacity-100'
                  }`}
                  style={{ background: accents[i] }}
                >
                  {tab.icon}
                </div>
                <div>
                  <p className="text-[18px] font-black leading-none tracking-tight" style={{ color: activeTab === tab.id ? accents[i] : '#94a3b8' }}>
                    {tab.items.length}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{tab.label}</p>
                </div>
                {/* Micro-Interaction Dot */}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute top-3 right-3 w-1 h-1 rounded-full"
                    style={{ backgroundColor: accents[i] }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Roadmap library ─────────────────────────────────────────────── */}
        <div className={`overflow-hidden rounded-[28px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] ring-1 transition-all duration-500 ${
          multiMode ? 'ring-[#000666]/20 shadow-[0_8px_24px_-6px_rgba(0,6,102,0.1)]' : 'ring-slate-100'
        }`}
        style={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)'
        }}>

          {/* Library header */}
          <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">{meta.headline}</h2>
                <span className="hidden sm:inline rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500">
                  {currentTab.items.length} paths
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <label className="flex h-11 flex-1 items-center gap-2.5 rounded-[18px] border-2 border-slate-100 bg-white px-4 text-slate-400 shadow-sm transition-all focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-500/5 hover:border-slate-200 sm:w-64 sm:flex-none">
                  <Search size={15} className="shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search all paths..."
                    className="w-full bg-transparent text-[13px] font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="shrink-0 rounded-full bg-slate-100 p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600">
                      <Plus size={12} className="rotate-45" />
                    </button>
                  )}
                </label>
                {/* Multi-select toggle */}
                <button
                  onClick={() => multiMode ? handleExitMulti() : setMultiMode(true)}
                  className={`flex h-11 items-center gap-2 rounded-[16px] border-2 px-4 text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                    multiMode
                      ? 'border-[#000666] bg-[#000666] text-white shadow-[0_4px_12px_-2px_rgba(0,6,102,0.25)]'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-[#000666]'
                  }`}
                >
                  <Layers size={13} />
                  {multiMode ? 'Exit Multi' : 'Multi-Select'}
                </button>
                {/* Custom role button */}
                <button
                  onClick={() => setCustomRoleOpen(true)}
                  className="flex h-11 items-center gap-2 rounded-[16px] border-2 border-dashed border-slate-100 bg-white px-4 text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-indigo-200 hover:text-[#000666]"
                >
                  <Pen size={13} />
                  Custom {currentLabel}
                </button>
              </div>
            </div>
            {/* Sub description */}
            <p className="mt-2.5 max-w-2xl text-[13px] font-medium leading-relaxed text-slate-500 font-['Newsreader'] italic">{meta.sub}</p>
          </div>

          {/* Grid */}
          <div className="p-5 sm:p-7">
            {filtered.length > 0 ? (
              query.trim() ? (
                // Grouped view for global search
                <div className="space-y-8 animate-in fade-in duration-500">
                  {tabs.map(tab => {
                    const tabResults = filtered.filter(f => f.tabId === tab.id);
                    if (tabResults.length === 0) return null;
                    return (
                      <div key={tab.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400">{tab.icon}</span>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{tab.label}</h4>
                          <div className="ml-2 h-px flex-1 bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {tabResults.map(({ item, track }) => (
                            <RoadmapPill
                              key={`${track}-${item}`}
                              label={item}
                              isNew={newItems.has(item)}
                              isSelected={selected.has(item)}
                              multiMode={multiMode}
                              onClick={() => navigate(`/explore?${new URLSearchParams({ goal: item, track }).toString()}`)}
                              onToggle={() => toggleItem(item)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Normal view
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                >
                  {isLoading ? (
                    Array.from({ length: 15 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    filtered.map(({ item, track }) => (
                      <RoadmapPill
                        key={`${track}-${item}`}
                        label={item}
                        isNew={newItems.has(item)}
                        isSelected={selected.has(item)}
                        multiMode={multiMode}
                        onClick={() => navigate(`/explore?${new URLSearchParams({ goal: item, track }).toString()}`)}
                        onToggle={() => toggleItem(item)}
                        variants={itemVariants}
                        progress={masteryMap[item] || 0}
                      />
                    ))
                  )}
                </motion.div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Search size={24} />
                </div>
                <p className="text-sm font-black text-slate-400">No results for "{query}"</p>
                <p className="mt-1 text-[12px] text-slate-400 font-medium">Can't find what you need?</p>
                <button
                  onClick={() => setCustomRoleOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-[#000666] hover:underline"
                  type="button"
                >
                  <Pen size={11} /> Create a custom {currentLabel.toLowerCase()}
                </button>
              </div>
            )}
          </div>

          {/* Library footer */}
          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/30 px-6 py-3 sm:px-7">
            <p className="text-[11px] font-medium text-slate-400">
              {query.trim() ? `Found ${filtered.length} results across library` : `Showing ${filtered.length} of ${currentTab.items.length} paths`}
            </p>
            <motion.span 
              animate={query.trim() ? { 
                scale: [1, 1.05, 1],
                color: ['#818cf8', '#6366f1', '#818cf8']
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-400"
            >
              <Zap size={11} className="text-indigo-400" />
              Powered by Gemini AI
            </motion.span>
          </div>
        </div>

      </div>

      {/* ── Floating Multi-Select Action Bar ──────────────────────────────── */}
      {multiMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 rounded-[22px] bg-white px-6 py-3.5 shadow-[0_24px_64px_-12px_rgba(0,6,102,0.2),0_4px_12px_-4px_rgba(0,0,0,0.05)] ring-1 ring-slate-100">
            {/* Selected items preview */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#000666] text-white text-[14px] font-black">
                {selected.size}
              </div>
              <div className="max-w-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected</p>
                <p className="truncate text-[12px] font-semibold text-slate-700">
                  {Array.from(selected).slice(0, 3).join(', ')}
                  {selected.size > 3 && ` +${selected.size - 3} more`}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-100" />

            {/* Clear */}
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-[10px] p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
            >
              <X size={16} />
            </button>

            {/* Build */}
            <motion.button
              onClick={handleMultiBuild}
              animate={{ 
                boxShadow: [
                  '0 8px 20px -4px rgba(0,6,102,0.3)',
                  '0 8px 30px -4px rgba(79,70,229,0.5)',
                  '0 8px 20px -4px rgba(0,6,102,0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="group inline-flex items-center gap-2.5 rounded-[16px] bg-[#000666] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
            >
              <Sparkles size={14} className="transition-transform duration-500 group-hover:rotate-12" />
              {selected.size === 1 ? 'Build Classroom' : `Build Hybrid ${currentLabel}`}
              <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </motion.button>
          </div>
        </div>
      )}

      {/* ── Custom Creation Modal ────────────────────────────────────────── */}
      <CustomCreationModal
        open={customRoleOpen}
        category={activeTab}
        onClose={() => setCustomRoleOpen(false)}
        onSubmit={handleCustomCreate}
      />
    </motion.div>
  );
};

export default Dashboard;
