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
    whileHover={{ y: -2, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08)" }}
    whileTap={{ scale: 0.98 }}
    onClick={multiMode ? onToggle : onClick}
    className={`group relative flex items-center justify-between rounded-xl p-4 text-left transition-all duration-200 border ${
      isSelected
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg !bg-indigo-600'
        : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
    }`}
  >
    <div className="flex items-center gap-3 overflow-hidden">
      {multiMode && (
        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          isSelected ? 'bg-white border-white' : 'bg-white border-slate-300'
        }`}>
          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
        </div>
      )}
      <span className={`text-[14px] tracking-tight truncate leading-none ${isSelected ? 'font-black' : 'font-bold'}`}>{label}</span>
    </div>
    
    <div className="flex items-center gap-2">
      {isNew && (
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'}`}>New</span>
      )}
      <Bookmark size={14} className={`shrink-0 transition-all duration-200 ${isSelected ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-600'}`} />
    </div>
  </motion.button>
));
RoadmapPill.displayName = 'RoadmapPill';

/* ─── Skeleton Loader ────────────────────────────────────────────────────────── */
const RoadmapPillSkeleton = React.forwardRef<HTMLDivElement, {}>((_, ref) => (
  <motion.div ref={ref} className="flex min-h-[52px] items-center gap-3 rounded-md border border-slate-100 bg-slate-50/50 px-5 py-3.5 animate-pulse">
    <div className="h-3.5 w-3/4 rounded-md bg-slate-200/50" />
    <div className="ml-auto h-3 w-3 rounded-full bg-slate-200/50" />
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
            className="relative w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <X size={18} />
            </button>

            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">Create Custom Path</h3>
            <p className="text-[12px] font-medium text-slate-500 mb-6 leading-relaxed">Describe any subject or dynamic hybrid career path. Vidhyalaya will deploy a custom tailored curriculum using Gemini AI.</p>

            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value.trim()); setValue(''); } }}
              placeholder="e.g. Bio-Informatics Systems Analyst..."
              className="w-full rounded-[16px] border border-slate-200 bg-slate-50 py-3.5 px-4 text-[13px] font-bold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
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
    <div className="relative bg-white text-slate-900">
      
      {/* ── Glass Subtle Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-50/50 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="space-y-16">
          
          {/* ── Sub Navigation Pill ── */}
          <div className="flex flex-col items-center gap-6 pt-12">
            <div className="flex flex-col items-center space-y-4 mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-[1px] bg-indigo-600" />
                 <span className="text-[12px] font-black uppercase tracking-[0.6em] text-indigo-600">Cognitive Hub</span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">
                 Learning <span className="not-italic text-slate-400">Architect</span>
              </h1>
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
              <button className="px-6 py-2 rounded-full bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">Discover</button>
              <button onClick={() => navigate('/library')} className="px-6 py-2 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all">My Archive</button>
              <div className="w-px h-4 bg-slate-200 mx-1.5" />
              <button 
                onClick={() => { setMultiMode(!multiMode); if (multiMode) setSelected(new Set()); }}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                  multiMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Plus size={12} strokeWidth={3} className={multiMode ? 'rotate-45 transition-transform' : 'transition-transform'} /> 
                {multiMode ? 'Exit Selection' : 'Create Team'}
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <Bookmark size={12} className="opacity-40" />
              No bookmarks found. <button className="text-indigo-600 font-bold hover:underline">Bookmark a roadmap</button>
            </div>
          </div>

          {/* ── Roadmaps Sections Stack ── */}
          <div className="space-y-12 max-w-5xl mx-auto">
            
            {/* ── Search Bar ── */}
            <div className="flex justify-center pb-12">
              <div className="relative w-full max-w-2xl group">
                <div className="absolute inset-0 bg-indigo-500/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Scan the registry for specific roadmaps or subjects..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[30px] py-6 pl-16 pr-12 text-[16px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-8 focus:ring-indigo-600/5 transition-all outline-none shadow-xl shadow-slate-100"
                />
                {query && (
                  <button 
                    onClick={() => setQuery('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: Role Based Roadmaps */}
            {(filteredRoles.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-[1px] w-12 bg-indigo-600/30" />
                  <h3 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter italic leading-none">Role Based</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => <RoadmapPillSkeleton key={idx} />)
                  ) : (
                    <>
                      {filteredRoles.map(role => (
                        <RoadmapPill 
                          key={role}
                          label={role}
                          isNew={newItems.has(role)}
                          isSelected={selected.has(role)}
                          multiMode={multiMode}
                          onClick={() => handleSingleSelect(role, 'Role Based Roadmap')}
                          onToggle={() => toggleItem(role)}
                        />
                      ))}
                      {!query && (
                        <motion.button
                          whileHover={{ y: -2, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setCustomRoleOpen(true)}
                          className="flex items-center justify-between rounded-xl p-4 text-left transition-all duration-200 border border-dashed border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-50 hover:border-blue-400 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                              <Plus size={10} strokeWidth={4} />
                            </div>
                            <span className="text-[14px] font-black tracking-tight">Create Custom Path</span>
                          </div>
                          <Sparkles size={14} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
                        </motion.button>
                      )}
                    </>
                  )}
                </div>

                {!query && roleRoadmaps.length > 15 && (
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setShowAllRoles(!showAllRoles)}
                      className="group flex items-center gap-2 px-8 py-2.5 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all bg-white shadow-sm hover:shadow-indigo-50"
                    >
                      {showAllRoles ? 'Show Less' : `Show All ${roleRoadmaps.length} Roles`}
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 2: Skill Based Roadmaps */}
            {(filteredSkills.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-[1px] w-12 bg-indigo-600/30" />
                  <h3 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter italic leading-none">Skill Mastery</h3>
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
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setShowAllSkills(!showAllSkills)}
                      className="group flex items-center gap-2 px-8 py-2.5 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all bg-white shadow-sm hover:shadow-blue-50"
                    >
                      {showAllSkills ? 'Show Less' : `Show All ${skillRoadmaps.length} Skills`}
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 3: Project Ideas */}
            {(filteredProjects.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-[1px] w-12 bg-indigo-600/30" />
                  <h3 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter italic leading-none">Project Blueprints</h3>
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
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      className="group flex items-center gap-2 px-8 py-2.5 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all bg-white shadow-sm hover:shadow-blue-50"
                    >
                      {showAllProjects ? 'Show Less' : `Show All ${projectIdeas.length} Projects`}
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Section 4: Best Practices */}
            {(filteredPractices.length > 0 || isLoading) && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-blue-500" size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Best Practices</h3>
                  <div className="flex-1 h-px bg-slate-100" />
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
              <section className="space-y-8 pt-16 border-t border-slate-200">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="flex flex-col items-center">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 mb-2">Guides & Tutorials</h3>
                    <div className="h-1.5 w-10 bg-blue-600 rounded-full" />
                  </div>
                  
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                    {guides.map(guide => (
                      <div 
                        key={guide.id}
                        onClick={() => navigate(`/explore?${new URLSearchParams({ goal: guide.title, track: 'Guide Detail' }).toString()}`)}
                        className="flex items-center justify-between py-4 border-b border-slate-100 hover:bg-white transition-all px-8 cursor-pointer group last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[14px] font-black text-slate-900 group-hover:text-blue-600 transition-colors">{guide.title}</span>
                          {guide.isNew && (
                            <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">New</span>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{guide.topic}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <button className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100 transition-all">
                      View all guides <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}

          </div>

        </div>

      {/* ── Multi-Select Build Action Bar ── */}
      <AnimatePresence>
        {multiMode && selected.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2"
          >
            <div className="flex items-center gap-5 rounded-[24px] bg-white px-7 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-indigo-600 text-white text-[14px] font-black shadow-md shadow-indigo-200">
                  {selected.size}
                </div>
                <div className="max-w-[200px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected</p>
                  <p className="truncate text-[13px] font-bold text-slate-900">
                    {Array.from(selected).join(', ')}
                  </p>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200" />

              <button 
                onClick={() => setSelected(new Set())} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <X size={18} />
              </button>

              <button
                onClick={handleMultiBuild}
                className="px-8 py-3.5 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all flex items-center gap-2.5 shadow-lg active:scale-95"
              >
                <Sparkles size={14} />
                Build Team Path
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Creation Modal ── */}
      <CustomCreationModal
        open={customRoleOpen}
        onClose={() => setCustomRoleOpen(false)}
        onSubmit={handleCustomCreate}
      />
    </div>
  </div>
);
};

export default Dashboard;
