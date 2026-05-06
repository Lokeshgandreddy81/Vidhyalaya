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
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const roleRoadmaps = [
  'Frontend', 'Backend', 'Full Stack', 'DevOps', 'DevSecOps',
  'Data Analyst', 'AI Engineer', 'AI and Data Scientist', 'Data Engineer',
  'Android', 'Machine Learning', 'PostgreSQL', 'iOS', 'Blockchain', 'QA',
  'Software Architect', 'Cyber Security', 'UX Design', 'Technical Writer',
  'Game Developer', 'MLOps', 'Product Manager', 'Engineering Manager',
  'Developer Relations', 'BI Analyst',
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
  'NFT Marketplace', 'Token Launchpad', 'Live Streaming Platform',
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
    whileHover={{ y: -4, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.06)" }}
    whileTap={{ scale: 0.98 }}
    onClick={multiMode ? onToggle : onClick}
    className={`group relative flex items-center justify-between gap-4 rounded-[18px] px-5 py-4 text-left transition-all duration-500 overflow-hidden ${
      isSelected
        ? 'bg-indigo-600 text-white border border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.4)]'
        : 'bg-white/[0.02] text-slate-300 border border-white/5 hover:border-white/15 hover:bg-white/[0.04] shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
    }`}
  >
    <div className="flex items-center gap-3 overflow-hidden relative z-10">
      {multiMode && (
        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all duration-500 ${
          isSelected ? 'bg-white border-white shadow-sm' : 'bg-white/10 border-white/20'
        }`}>
          {isSelected && <Check size={10} className="text-[#07090e] font-black" strokeWidth={4} />}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-black tracking-tight truncate leading-none mb-1">{label}</span>
        {isNew && (
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-indigo-400">NEW</span>
        )}
      </div>
    </div>
    
    <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-500 relative z-10 ${isSelected ? 'bg-white/10' : 'bg-white/5 group-hover:bg-indigo-500/20 shadow-inner'}`}>
      <ArrowRight size={12} className={`shrink-0 transition-all duration-500 ${isSelected ? 'text-white rotate-[-45deg]' : 'text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5'}`} />
    </div>
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
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#07090e] text-slate-100">
      
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
          
          {/* ── Minimalist Header ── */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Vidhyalaya — Place of Wisdom</p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-none mb-4">Roadmap Library</h1>
              {!isZenMode && (
                <p className="text-[13px] font-medium text-slate-400 max-w-lg font-serif italic">
                  Destination-first learning pathways. Pick one to build your study classroom, or select multiple to fuse a hybrid curriculum.
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {!isZenMode && (
                <>
                  {/* Search Bar */}
                  <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Search roadmaps..." 
                      className="pl-9 pr-4 py-2.5 rounded-full bg-white/[0.03] border border-white/10 shadow-sm outline-none text-[12px] font-bold text-white placeholder:text-slate-500 w-full sm:w-64 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                    />
                  </div>

                  {/* Multi-Select Toggle */}
                  <button
                    onClick={() => multiMode ? setMultiMode(false) : setMultiMode(true)}
                    className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 border ${
                      multiMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/[0.03] text-slate-300 border-white/10 shadow-sm hover:text-white hover:border-white/20'
                    }`}
                  >
                    <Layers size={11} />
                    {multiMode ? 'Exit' : 'Multi-Select'}
                  </button>

                  {/* Custom Path Button */}
                  <button
                    onClick={() => setCustomRoleOpen(true)}
                    className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 bg-white/[0.03] border border-dashed border-white/10 hover:border-white/20 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Pen size={11} />
                    Custom Path
                  </button>
                </>
              )}

              {/* Zen Mode Button */}
              <button 
                onClick={() => setIsZenMode(!isZenMode)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 border ${
                  isZenMode 
                    ? 'bg-white text-[#07090e] border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Sparkles size={11} className={isZenMode ? 'animate-pulse' : ''} />
                {isZenMode ? 'Exit Zen' : 'Zen Mode'}
              </button>
            </div>
          </header>

          {/* ── Roadmaps Sections Stack ── */}
          <div className="space-y-16">
            
            {/* Section 1: Role Based Roadmaps */}
            {(filteredRoles.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <Compass className="text-indigo-400" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200">Role Based Roadmaps</h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                <div className="flex items-center gap-3">
                  <BrainCircuit className="text-indigo-400" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200">Skill Based Roadmaps</h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                <div className="flex items-center gap-3">
                  <Target className="text-indigo-400" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200">Project Ideas</h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200">Best Practices</h3>
                  <div className="flex-1 h-px bg-white/10" />
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
              <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-indigo-400" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200">Guides & Tutorials</h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guides.map(guide => (
                    <div 
                      key={guide.id}
                      onClick={() => navigate(`/explore?${new URLSearchParams({ goal: guide.title, track: 'Guide Detail' }).toString()}`)}
                      className="group cursor-pointer bg-white/[0.02] rounded-[20px] p-5 border border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-wider text-indigo-400/70">
                          <span>{guide.topic}</span>
                          {guide.isNew && <span className="text-indigo-400 font-bold">New</span>}
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-200 leading-snug group-hover:text-white transition-colors">{guide.title}</h4>
                      </div>
                      <div className="mt-4 flex items-center justify-end text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400 transition-colors gap-1.5">
                        Launch Guide <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

        </div>
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
