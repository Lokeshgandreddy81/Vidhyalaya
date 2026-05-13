import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Compass,
  Layers,
  Pen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
  BookOpen,
  Bookmark,
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const roleRoadmaps = [
  'Frontend', 'Backend', 'Full Stack', 'DevOps', 'DevSecOps',
  'Data Analyst', 'AI Engineer', 'AI and Data Scientist', 'Data Engineer',
  'Android', 'Machine Learning', 'PostgreSQL', 'iOS', 'Blockchain', 'QA',
  'Software Architect', 'Cyber Security', 'UX Design', 'Technical Writer',
  'Game Developer', 'Server Side Game Developer', 'MLOps', 'Product Manager', 'Engineering Manager',
  'Developer Relations', 'BI Analyst', 'Network Engineer',
  'Cloud Architect', 'Site Reliability Engineer', 'Platform Engineer',
  'Staff Engineer', 'Principal Engineer', 'Solutions Architect',
  'Embedded Systems Engineer', 'Systems Programmer', 'Compiler Engineer',
  'Database Administrator', 'Network Engineer', 'Security Engineer',
  'Penetration Tester', 'Incident Response Engineer', 'Reverse Engineer',
  'AR / VR Developer', 'Robotics Engineer', 'Computer Vision Engineer',
  'NLP Engineer', 'Quantitative Analyst', 'Fintech Engineer',
  'Healthcare Data Engineer', 'GIS Developer', 'Web3 Developer',
  'Open Source Maintainer',
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
  'SQL', 'Computer Science', 'React', 'Vue', 'Angular', 'JavaScript',
  'TypeScript', 'Node.js', 'Python', 'System Design', 'Java', 'ASP.NET Core',
  'API Design', 'Spring Boot', 'Flutter', 'C++', 'Rust', 'Go',
  'GraphQL', 'React Native', 'Design System', 'Prompt Engineering', 'MongoDB',
  'Linux', 'Kubernetes', 'Docker', 'AWS', 'Terraform', 'Data Structures & Algorithms',
  'Redis', 'Git and GitHub', 'PHP', 'Cloudflare', 'AI Red Teaming', 'AI Agents',
  'Next.js', 'Kotlin', 'HTML', 'CSS', 'Swift & Swift UI', 'Shell / Bash',
  'Laravel', 'Elasticsearch', 'Django', 'Ruby on Rails', 'LeetCode',
  'Azure', 'Google Cloud Platform', 'DigitalOcean', 'Serverless', 'Pulumi',
  'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD', 'ArgoCD',
  'MySQL', 'PostgreSQL Advanced', 'Cassandra', 'Neo4j', 'DynamoDB',
  'Apache Kafka', 'RabbitMQ', 'Apache Spark', 'Snowflake', 'dbt',
  'TensorFlow', 'PyTorch', 'LangChain', 'Hugging Face', 'OpenAI API',
  'RAG Architectures', 'Fine-Tuning LLMs', 'MLflow', 'Vector Databases', 'Computer Vision',
  'OAuth 2.0 & OIDC', 'Web Security', 'Cryptography', 'OWASP Top 10', 'Zero Trust',
  'Cypress', 'Playwright', 'Jest', 'Vitest', 'Storybook',
  'Jetpack Compose', 'SwiftUI Advanced', 'Expo', 'Tauri', 'Electron',
  'Microservices', 'Event-Driven Architecture', 'Domain-Driven Design', 'Clean Architecture', 'CQRS',
  'WebSockets', 'gRPC', 'WebAssembly', 'Deno',
];

const projectIdeas = [
  'Frontend', 'Backend', 'Full Stack Web App', 'Landing Page', 'Portfolio Website',
  'E-Commerce Store', 'Blog Platform', 'Social Media Clone', 'SaaS Dashboard',
  'Admin Panel',
  'Android App', 'iOS App', 'React Native App', 'Flutter App', 'Progressive Web App',
  'REST API', 'GraphQL API', 'Real-Time Chat App', 'Authentication System',
  'Payment Gateway Integration',
  'DevOps', 'CI/CD Pipeline', 'Monitoring Dashboard', 'Infrastructure as Code',
  'Container Orchestration',
  'Data Pipeline', 'Machine Learning Model', 'AI Chatbot', 'Recommendation Engine',
  'Data Visualization Dashboard',
  'Smart Contract', 'DeFi App', 'NFT Marketplace', 'DAO Platform', 'Token Launchpad',
  'CLI Tool', 'VS Code Extension', 'Browser Extension', 'Desktop App',
  'Developer SDK',
  'WebSocket Server', 'IoT Dashboard', 'Live Streaming Platform',
  'Multiplayer Game', 'Collaborative Editor',
  'CRM System', 'Project Management Tool', 'Invoice Generator',
  'Scheduling App', 'Email Automation Platform',
];

const bestPractices = [
  'AWS', 'API Security', 'Web Application Security', 'Zero Trust Architecture', 'Cloud Security',
  'Backend Performance', 'Frontend Performance', 'Database Optimization', 'Caching Strategies', 'Load Testing',
  'Code Review', 'Testing Strategy', 'Technical Debt Management', 'Documentation Standards',
  'System Design Patterns', 'Microservices Governance', 'Incident Management', 'Observability',
  'CI/CD Best Practices', 'Accessibility Compliance',
];

const newItems = new Set([
  'AI Agents', 'AI Red Teaming', 'LeetCode',
  'Cloud Architect', 'Platform Engineer', 'Staff Engineer',
  'Computer Vision Engineer', 'NLP Engineer', 'Web3 Developer',
  'AR / VR Developer', 'Open Source Maintainer',
  'LangChain', 'Hugging Face', 'RAG Architectures', 'Fine-Tuning LLMs',
  'Vector Databases', 'Pulumi', 'ArgoCD', 'Playwright', 'Vitest',
  'Tauri', 'CQRS', 'dbt', 'Snowflake', 'GitHub Actions',
  'AI Chatbot', 'DAO Platform', 'Collaborative Editor',
  'NFT Marketplace', 'Token Launchpad', 'Live Streaming Platform', 'Network Engineer',
]);

const guides = [
  { id: '1', title: 'Deep Dive into React 19 Compiler and Server Components', isNew: true, topic: 'Frontend' },
  { id: '2', title: 'Modern Backend Architecture: REST vs gRPC and WebSockets', isNew: true, topic: 'Backend' },
  { id: '3', title: 'Securing Microservices: OAuth 2.0 & OpenID Connect Best Practices', isNew: false, topic: 'Security' },
  { id: '4', title: 'LLM Fine-Tuning and RAG Pipeline Optimization for Production', isNew: true, topic: 'AI' },
  { id: '5', title: 'A Pragmatic Guide to Database Sharding and Partitioning in PostgreSQL', isNew: false, topic: 'PostgreSQL' },
  { id: '6', title: 'CSS Container Queries and Modern Responsive Web Layouts', isNew: false, topic: 'CSS' },
];

/* ─── Roadmap Pill Component ────────────────────────────────────────────────── */
const RoadmapPill = React.forwardRef<HTMLButtonElement, {
  label: string;
  isNew?: boolean;
  isSelected?: boolean;
  multiMode: boolean;
  onClick: () => void;
  onToggle: () => void;
}>(({ label, isNew, isSelected, multiMode, onClick, onToggle }, ref) => (
  <motion.button
    ref={ref}
    whileHover={{ y: -4, scale: 1.01, borderColor: "rgba(99, 102, 241, 0.4)" }}
    whileTap={{ scale: 0.98 }}
    onClick={multiMode ? onToggle : onClick}
    className={`group relative flex flex-col justify-center rounded-[10px] p-3 px-4 text-left transition-all duration-500 min-h-[52px] ${
      isSelected
        ? 'bg-indigo-600 text-white border border-indigo-500 shadow-lg'
        : 'bg-white text-slate-800 border border-slate-200 hover:border-indigo-300 shadow-sm'
    }`}
  >
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 overflow-hidden">
        {multiMode && (
          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all duration-500 ${
            isSelected ? 'bg-white border-white shadow-sm' : 'bg-white/10 border-white/20'
          }`}>
            {isSelected && <Check size={10} className="text-[#07090e] font-black" strokeWidth={4} />}
          </div>
        )}
        <span className="text-[13px] font-bold tracking-tight truncate leading-none">{label}</span>
      </div>
      <Bookmark size={13} className={`shrink-0 transition-all duration-500 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-indigo-400'}`} />
    </div>
    
    {isNew && (
      <div className="flex items-center justify-end gap-1.5 mt-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
        <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>New</span>
      </div>
    )}
    
    {isSelected && !multiMode && (
      <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
         <ArrowRight size={10} className="text-white rotate-[-45deg]" />
      </div>
    )}
  </motion.button>
));
RoadmapPill.displayName = 'RoadmapPill';

/* ─── Skeleton Loader ────────────────────────────────────────────────────────── */
const RoadmapPillSkeleton = React.forwardRef<HTMLDivElement, {}>((_, ref) => (
  <motion.div ref={ref} className="flex min-h-[52px] items-center gap-3 rounded-[18px] border border-white/5 bg-white/[0.01] px-5 py-3.5 animate-pulse">
    <div className="h-3.5 w-3/4 rounded-md bg-white/5" />
    <div className="ml-auto h-3 w-3 rounded-full bg-white/5" />
  </motion.div>
));
RoadmapPillSkeleton.displayName = 'RoadmapPillSkeleton';

/* ─── Custom Creation Modal ─────────────────────────────────────────────────── */
const CustomCreationModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}> = ({ open, onClose, onSubmit }) => {
  const [value, setValue] = useState('');

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md" 
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md rounded-[28px] bg-[#0b0f19] p-8 shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <X size={18} />
            </button>

            <h3 className="text-xl font-black tracking-tight text-white mb-2">Create Custom Path</h3>
            <p className="text-[12px] font-medium text-slate-400 mb-6 leading-relaxed">Describe any subject or dynamic hybrid career path. Vidhyalaya will deploy a custom tailored curriculum using Gemini AI.</p>

            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value.trim()); setValue(''); } }}
              placeholder="e.g. Bio-Informatics Systems Analyst..."
              className="w-full rounded-[16px] border border-white/10 bg-white/[0.03] py-3.5 px-4 text-[13px] font-bold text-white shadow-sm outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white/[0.05]"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button 
                onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(''); } }}
                disabled={!value.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none"
              >
                Synthesize
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Dashboard Component ────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isZenMode, setIsZenMode } = useFocus();
  const [query, setQuery] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customRoleOpen, setCustomRoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states to prevent over-crowded viewport initially
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const toggleItem = useCallback((item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  const handleSingleSelect = (item: string, category: string) => {
    let goal = item;
    let track = category;
    if (category === 'Project Ideas') { goal = `${item} project portfolio`; track = 'Architectural Build'; }
    if (category === 'Best Practices') { goal = `${item} best practices`; track = 'Deep Dive'; }
    navigate(`/explore?${new URLSearchParams({ goal, track }).toString()}`);
  };

  const handleMultiBuild = () => {
    if (selected.size === 0) return;
    const items = Array.from(selected);
    const goal = items.length === 1 ? items[0] : `Hybrid Path: ${items.join(' + ')}`;
    navigate(`/explore?${new URLSearchParams({ goal, track: 'Hybrid Path' }).toString()}`);
  };

  const handleCustomCreate = (value: string) => {
    setCustomRoleOpen(false);
    navigate(`/explore?${new URLSearchParams({ goal: value, track: 'Custom Path' }).toString()}`);
  };

  const filteredRoles = useMemo(() => {
    const list = roleRoadmaps.filter(r => r.toLowerCase().includes(query.toLowerCase()));
    return showAllRoles || query ? list : list.slice(0, 15);
  }, [query, showAllRoles]);

  const filteredSkills = useMemo(() => {
    const list = skillRoadmaps.filter(s => s.toLowerCase().includes(query.toLowerCase()));
    return showAllSkills || query ? list : list.slice(0, 15);
  }, [query, showAllSkills]);

  const filteredProjects = useMemo(() => {
    const list = projectIdeas.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    return showAllProjects || query ? list : list.slice(0, 15);
  }, [query, showAllProjects]);

  const filteredPractices = useMemo(() => {
    return bestPractices.filter(b => b.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#fafafa] text-slate-900">
      
      {/* ── Neural Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1.15, 1, 1.15], x: [0, -40, 0], y: [0, -10, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-[120px]" 
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 sm:px-12 py-16">
        <div className="space-y-16">
          
          {/* ── Modern Hero Header ── */}
          <header className="relative pt-24 pb-16 text-center max-w-5xl mx-auto space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <Sparkles size={10} className="text-indigo-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600">Vidhyalaya — Place of Wisdom</p>
              </div>
              
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[0.85] animate-in fade-in slide-in-from-bottom-4 duration-1000">
                Roadmap <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600">Library</span>
              </h1>
              
              {!isZenMode && (
                <p className="text-lg sm:text-xl font-medium text-slate-500 max-w-2xl mx-auto font-serif italic leading-relaxed opacity-80 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  Destination-first learning pathways. Pick one to build your study classroom, or select multiple to fuse a hybrid curriculum.
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                {/* Search Bar */}
                <div className="relative group">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search roadmaps..." 
                    className="pl-11 pr-4 py-3 rounded-[18px] bg-slate-50/50 border border-transparent outline-none text-[13px] font-bold text-slate-900 placeholder:text-slate-400 w-full sm:w-64 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                  />
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-200/60 mx-1" />

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMultiMode(!multiMode)}
                    className={`h-[46px] px-5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${
                      multiMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers size={13} />
                    {multiMode ? 'Exit' : 'Multi-Select'}
                  </button>

                  <button
                    onClick={() => setCustomRoleOpen(true)}
                    className="h-[46px] px-5 rounded-[18px] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <Pen size={13} />
                    Custom
                  </button>

                  <button 
                    onClick={() => setIsZenMode(!isZenMode)}
                    className={`h-[46px] px-5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${
                      isZenMode ? 'bg-black text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles size={13} />
                    {isZenMode ? 'Exit Zen' : 'Zen Mode'}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ── Secondary Navigation Pill ── */}
          <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
             <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/60 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
                <button className="px-7 py-2.5 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all">Personal</button>
                <button className="px-7 py-2.5 rounded-full text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 transition-all">All Roadmaps</button>
                <div className="w-px h-6 bg-slate-100 mx-2" />
                <button className="px-7 py-2.5 rounded-full text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2">
                   <Plus size={14} strokeWidth={3} /> Create Team
                </button>
             </div>
             
             <div className="flex items-center gap-2.5 text-[12px] font-medium text-slate-400">
                <Bookmark size={15} className="opacity-40" />
                No bookmarks found. <button className="text-indigo-600 font-bold hover:underline transition-all">Bookmark a roadmap</button>
             </div>
          </div>

          {/* ── Roadmaps Sections Stack ── */}
          <div className="space-y-16">
            
            {/* Section 1: Role Based Roadmaps */}
            {(filteredRoles.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="px-6 py-1.5 rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-800 tracking-tight">Role Based Roadmaps</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    filteredRoles.map(role => (
                      <RoadmapPill 
                        key={role}
                        label={role}
                        isNew={newItems.has(role)}
                        isSelected={selected.has(role)}
                        multiMode={multiMode}
                        onClick={() => handleSingleSelect(role, 'Role Based Roadmap')}
                        onToggle={() => toggleItem(role)}
                      />
                    ))
                  )}
                </div>

                {!query && roleRoadmaps.length > 15 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={() => setShowAllRoles(!showAllRoles)}
                      className="px-6 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-white/20 hover:text-white transition-all bg-white/[0.02]"
                    >
                      {showAllRoles ? 'Show Less' : `Show All ${roleRoadmaps.length} Roles`}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 2: Skill Based Roadmaps */}
            {(filteredSkills.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="px-6 py-1.5 rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-800 tracking-tight">Skill Based Roadmaps</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    filteredSkills.map(skill => (
                      <RoadmapPill 
                        key={skill}
                        label={skill}
                        isNew={newItems.has(skill)}
                        isSelected={selected.has(skill)}
                        multiMode={multiMode}
                        onClick={() => handleSingleSelect(skill, 'Skill Based Roadmap')}
                        onToggle={() => toggleItem(skill)}
                      />
                    ))
                  )}
                </div>

                {!query && skillRoadmaps.length > 15 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={() => setShowAllSkills(!showAllSkills)}
                      className="px-6 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-white/20 hover:text-white transition-all bg-white/[0.02]"
                    >
                      {showAllSkills ? 'Show Less' : `Show All ${skillRoadmaps.length} Skills`}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 3: Project Ideas */}
            {(filteredProjects.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="px-6 py-1.5 rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-800 tracking-tight">Project Ideas</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    filteredProjects.map(project => (
                      <RoadmapPill 
                        key={project}
                        label={project}
                        isNew={newItems.has(project)}
                        isSelected={selected.has(project)}
                        multiMode={multiMode}
                        onClick={() => handleSingleSelect(project, 'Project Ideas')}
                        onToggle={() => toggleItem(project)}
                      />
                    ))
                  )}
                </div>

                {!query && projectIdeas.length > 15 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      className="px-6 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-white/20 hover:text-white transition-all bg-white/[0.02]"
                    >
                      {showAllProjects ? 'Show Less' : `Show All ${projectIdeas.length} Projects`}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 4: Best Practices */}
            {(filteredPractices.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-indigo-400" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Best Practices</h3>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    filteredPractices.map(practice => (
                      <RoadmapPill 
                        key={practice}
                        label={practice}
                        isNew={newItems.has(practice)}
                        isSelected={selected.has(practice)}
                        multiMode={multiMode}
                        onClick={() => handleSingleSelect(practice, 'Best Practices')}
                        onToggle={() => toggleItem(practice)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {/* ── Guides & Tutorials Section ── */}
            {!isZenMode && (
              <section className="space-y-10 pt-20 border-t border-slate-200">
                <div className="max-w-[1000px] mx-auto space-y-8">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Guides</h2>
                  <div className="space-y-1">
                    {guides.map(guide => (
                      <div 
                        key={guide.id}
                        onClick={() => navigate(`/explore?${new URLSearchParams({ goal: guide.title, track: 'Guide Detail' }).toString()}`)}
                        className="flex items-center justify-between py-4 border-b border-slate-100 hover:bg-slate-50 transition-all px-6 rounded-xl cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[14px] font-bold text-slate-700 group-hover:text-black transition-colors">{guide.title}</span>
                          {guide.isNew && (
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">New</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{guide.topic}</span>
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                    View all guides <ArrowRight size={12} />
                  </button>
                </div>
              </section>
            )}

          </div>

        </div>

        {/* ── Dashboard Footer ── */}
        <footer className="mt-32 pt-16 pb-12 border-t border-slate-200">
          <div className="max-w-[1400px] mx-auto px-8 sm:px-12">
            <div className="flex flex-wrap justify-center gap-12 mb-16">
              {['Roadmaps', 'Guides', 'FAQs', 'YouTube'].map(link => (
                <button key={link} className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors">{link}</button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black shadow-lg">V</div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Vidhyalaya</span>
                  <span className="text-[9px] font-medium text-slate-400">By Jello.ai</span>
                </div>
              </div>

              <div className="flex items-center gap-6 opacity-30">
                {/* Simplified social icon placeholders for standard UI */}
                <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                <div className="w-4 h-4 bg-slate-900 rounded-sm" />
              </div>

              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                © 2026 Vidhyalaya Learning System. Built for the modern scholar.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Multi-Select Build Action Bar ── */}
      {multiMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 rounded-[22px] bg-[#0b0f19] px-6 py-3.5 shadow-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-600 text-white text-[13px] font-black">
                {selected.size}
              </div>
              <div className="max-w-xs">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Selected Paths</p>
                <p className="truncate text-[12px] font-semibold text-slate-200">
                  {Array.from(selected).slice(0, 3).join(', ')}
                  {selected.size > 3 && ` +${selected.size - 3} more`}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <button onClick={() => setSelected(new Set())} className="rounded-[10px] p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all">
              <X size={15} />
            </button>

            <button
              onClick={handleMultiBuild}
              className="px-6 py-3 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              <Sparkles size={12} />
              Build Hybrid Path
            </button>
          </div>
        </div>
      )}

      {/* ── Custom Creation Modal ── */}
      <CustomCreationModal
        open={customRoleOpen}
        onClose={() => setCustomRoleOpen(false)}
        onSubmit={handleCustomCreate}
      />
    </div>
  );
};

export default Dashboard;
