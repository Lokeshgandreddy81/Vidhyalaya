import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';
import {
  ArrowRight,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  BookOpen,
  Layers,
  Briefcase,
  GraduationCap,
  Wrench,
  Check,
  Compass,
  Cpu,
  Globe,
  Database,
  Shield,
  Workflow,
  Atom,
  Cloud,
  Terminal,
  Brain,
  Bot,
  Activity,
  CheckCircle2,
  Server,
  Code2,
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

/* ─── Premium Icon Resolver ─────────────────────────────────────────────────── */
const getIconForLabel = (label: string): React.ElementType => {
  const lowercase = label.toLowerCase();
  
  if (lowercase.includes('ai ') || lowercase.includes(' ml') || lowercase.includes('machine learning') || lowercase.includes('prompt') || lowercase.includes('vector') || lowercase.includes('rag ') || lowercase.includes('llm') || lowercase.includes('chatbot') || lowercase.includes('nlp') || lowercase.includes('vision') || lowercase.includes('langchain') || lowercase.includes('hugging') || lowercase.includes('openai') || lowercase.includes('cortex') || lowercase.includes('intelligence')) {
    return Brain;
  }
  
  if (lowercase.includes('security') || lowercase.includes('cyber') || lowercase.includes('cryptography') || lowercase.includes('owasp') || lowercase.includes('zero trust') || lowercase.includes('pentest') || lowercase.includes('threat') || lowercase.includes('auth')) {
    return Shield;
  }

  if (lowercase.includes('database') || lowercase.includes('sql') || lowercase.includes('postgres') || lowercase.includes('mongo') || lowercase.includes('redis') || lowercase.includes('cassandra') || lowercase.includes('db') || lowercase.includes('dbt') || lowercase.includes('snowflake') || lowercase.includes('data platform') || lowercase.includes('analytics engineer')) {
    return Database;
  }

  if (lowercase.includes('devops') || lowercase.includes('ci/cd') || lowercase.includes('kubernetes') || lowercase.includes('docker') || lowercase.includes('aws') || lowercase.includes('terraform') || lowercase.includes('cloudflare') || lowercase.includes('azure') || lowercase.includes('gcp') || lowercase.includes('cloud') || lowercase.includes('serverless') || lowercase.includes('pulumi') || lowercase.includes('ansible') || lowercase.includes('jenkins') || lowercase.includes('github actions') || lowercase.includes('argocd') || lowercase.includes('platform engineer') || lowercase.includes('sre') || lowercase.includes('site reliability')) {
    return Cloud;
  }

  if (lowercase.includes('frontend') || lowercase.includes('react') || lowercase.includes('vue') || lowercase.includes('angular') || lowercase.includes('html') || lowercase.includes('css') || lowercase.includes('next.js') || lowercase.includes('expo') || lowercase.includes('storybook') || lowercase.includes('tauri') || lowercase.includes('electron') || lowercase.includes('web3') || lowercase.includes('landing page') || lowercase.includes('portfolio') || lowercase.includes('design system')) {
    return Globe;
  }

  if (lowercase.includes('backend') || lowercase.includes('node.js') || lowercase.includes('python') || lowercase.includes('java') || lowercase.includes('asp.net') || lowercase.includes('spring boot') || lowercase.includes('c++') || lowercase.includes('rust') || lowercase.includes('go') || lowercase.includes('php') || lowercase.includes('laravel') || lowercase.includes('django') || lowercase.includes('ruby') || lowercase.includes('api design') || lowercase.includes('api engineer') || lowercase.includes('integration') || lowercase.includes('distributed systems') || lowercase.includes('grpc') || lowercase.includes('websocket')) {
    return Server;
  }

  if (lowercase.includes('qa') || lowercase.includes('testing') || lowercase.includes('cypress') || lowercase.includes('playwright') || lowercase.includes('jest') || lowercase.includes('vitest') || lowercase.includes('benchmark')) {
    return CheckCircle2;
  }

  if (lowercase.includes('product') || lowercase.includes('manager') || lowercase.includes('relations') || lowercase.includes('analyst') || lowercase.includes('growth') || lowercase.includes('ux') || lowercase.includes('design') || lowercase.includes('writer') || lowercase.includes('business') || lowercase.includes('marketing')) {
    return Briefcase;
  }

  const code = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  if (code % 3 === 0) return Cpu;
  if (code % 3 === 1) return Code2;
  return Wrench;
};

/* ─── Premium Google-Style Pastel Themes ─────────────────────────────────────── */
const cardColors = [
  { color: 'hsl(238, 80%, 60%)', bg: 'hsla(238, 80%, 60%, 0.08)', border: 'hsla(238, 80%, 60%, 0.2)', glow: 'hsla(238, 80%, 60%, 0.1)', text: 'hsl(238, 80%, 60%)', iconBg: 'hsla(238, 80%, 60%, 0.1)' },
  { color: 'hsl(265, 80%, 65%)', bg: 'hsla(265, 80%, 65%, 0.08)', border: 'hsla(265, 80%, 65%, 0.2)', glow: 'hsla(265, 80%, 65%, 0.1)', text: 'hsl(265, 80%, 65%)', iconBg: 'hsla(265, 80%, 65%, 0.1)' },
  { color: 'hsl(175, 80%, 45%)', bg: 'hsla(175, 80%, 45%, 0.08)', border: 'hsla(175, 80%, 45%, 0.2)', glow: 'hsla(175, 80%, 45%, 0.1)', text: 'hsl(175, 80%, 45%)', iconBg: 'hsla(175, 80%, 45%, 0.1)' },
  { color: 'hsl(35, 90%, 55%)', bg: 'hsla(35, 90%, 55%, 0.08)', border: 'hsla(35, 90%, 55%, 0.2)', glow: 'hsla(35, 90%, 55%, 0.1)', text: 'hsl(35, 90%, 50%)', iconBg: 'hsla(35, 90%, 55%, 0.1)' },
  { color: 'hsl(330, 80%, 60%)', bg: 'hsla(330, 80%, 60%, 0.08)', border: 'hsla(330, 80%, 60%, 0.2)', glow: 'hsla(330, 80%, 60%, 0.1)', text: 'hsl(330, 80%, 60%)', iconBg: 'hsla(330, 80%, 60%, 0.1)' },
  { color: 'hsl(215, 85%, 60%)', bg: 'hsla(215, 85%, 60%, 0.08)', border: 'hsla(215, 85%, 60%, 0.2)', glow: 'hsla(215, 85%, 60%, 0.1)', text: 'hsl(215, 85%, 60%)', iconBg: 'hsla(215, 85%, 60%, 0.1)' },
];

/* ─── Google/Gemini Minimalist Card Component ───────────────────────────────── */
const RoadmapCard: React.FC<{
  label: string;
  index: number;
  isNew?: boolean;
  isSelected?: boolean;
  multiMode: boolean;
  onClick: () => void;
  onToggle: () => void;
}> = ({ label, index, isNew, isSelected, multiMode, onClick, onToggle }) => {
  const Icon = getIconForLabel(label);
  const theme = cardColors[index % cardColors.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.02, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -4,
        scale: 1.02,
        borderColor: isSelected ? '#4e5bff' : 'rgba(79, 70, 229, 0.22)',
        boxShadow: isSelected
          ? '0 12px 28px -6px rgba(78,91,255,0.22), 0 4px 12px -2px rgba(78,91,255,0.1)'
          : '0 12px 24px -6px rgba(78,91,255,0.06), 0 4px 10px -2px rgba(0,0,0,0.02)',
      }}
      whileTap={{ scale: 0.98 }}
      onClick={multiMode ? onToggle : onClick}
      className="group relative flex flex-col items-start justify-between rounded-[20px] p-5 min-h-[96px] text-left transition-all duration-300 overflow-hidden cursor-pointer w-full"
      style={{
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(78, 91, 255, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)' 
          : 'rgba(255, 255, 255, 0.45)',
        border: isSelected ? '1.5px solid #4e5bff' : '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: isSelected
          ? '0 8px 24px rgba(78,91,255,0.08), inset 0 1px 1px rgba(255,255,255,0.6)'
          : '0 6px 16px rgba(0,0,0,0.015), inset 0 1px 0.5px rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="w-full flex items-center justify-between z-10 mb-3.5 pointer-events-none">
        <div
          className="flex h-7.5 w-7.5 items-center justify-center rounded-[10px] transition-all duration-300"
          style={{
            background: isSelected ? 'rgba(255,255,255,0.7)' : theme.bg,
            border: isSelected ? '1px solid rgba(255,255,255,0.8)' : `1px solid ${theme.border}`,
          }}
        >
          <Icon
            size={13.5}
            strokeWidth={2.4}
            style={{
              color: isSelected ? '#4e5bff' : theme.color,
            }}
          />
        </div>

        {multiMode ? (
          <div
            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200"
            style={{
              background: isSelected ? '#4e5bff' : 'rgba(255,255,255,0.8)',
              borderColor: isSelected ? '#4e5bff' : 'rgba(0,0,0,0.12)',
            }}
          >
            {isSelected && <Check size={10} strokeWidth={3.5} className="text-white" />}
          </div>
        ) : isNew ? (
          <span
            className="text-[6.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] shrink-0"
            style={
              isSelected
                ? { background: 'rgba(255,255,255,0.7)', color: '#4e5bff' }
                : { background: 'linear-gradient(135deg, #4e5bff, #8b5cf6)', color: '#ffffff', boxShadow: '0 2px 4px rgba(78,91,255,0.15)' }
            }
          >
            New
          </span>
        ) : null}
      </div>

      <span
        className={`relative z-10 w-full min-w-0 max-w-full text-[13px] tracking-tight leading-snug break-words whitespace-normal [overflow-wrap:anywhere] ${isSelected ? 'font-black' : 'font-bold'}`}
        style={{ color: isSelected ? '#312e81' : '#1e293b' }}
      >
        {label}
      </span>

      {!multiMode && (
        <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 pointer-events-none">
          <ArrowRight
            size={12}
            strokeWidth={2.5}
            style={{ color: isSelected ? '#4e5bff' : theme.color }}
          />
        </div>
      )}
    </motion.button>
  );
};

/* ─── Skeleton Loader with Shimmer ────────────────────────────────────────────── */
const CardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.03 }}
    className="relative flex flex-col justify-between min-h-[96px] rounded-[20px] p-5 overflow-hidden"
    style={{
      background: 'rgba(255, 255, 255, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      boxShadow: '0 6px 16px rgba(0,0,0,0.01)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
  >
    <div className="flex justify-between items-center w-full">
      <div className="h-7.5 w-7.5 rounded-[10px] bg-slate-200/40" />
      <div className="h-4 w-10 rounded-full bg-slate-200/30" />
    </div>
    <div className="space-y-1.5 mt-auto">
      <div className="h-3.5 w-4/5 rounded-md bg-slate-200/40" />
      <div className="h-3 w-1/2 rounded-md bg-slate-200/25" />
    </div>
    {/* Shimmer */}
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite]"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      }}
    />
  </motion.div>
);

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
            <p className="text-[12px] font-medium text-slate-500 mb-6 leading-relaxed">Describe the outcome, constraints, and source context. Cortex will turn it into a reviewable learning path.</p>

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

/* ─── Tab Definition ─────────────────────────────────────────────────────────── */
type TabKey = 'roles' | 'skills' | 'projects' | 'practices' | 'guides';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'roles', label: 'Roadmaps', icon: Compass },
  { key: 'skills', label: 'Skills', icon: Wrench },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'practices', label: 'Best Practices', icon: ShieldCheck },
  { key: 'guides', label: 'Guides', icon: BookOpen },
];

/* ─── Dashboard Component ────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAppStore();
  const { isZenMode } = useFocus();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('roles');
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customRoleOpen, setCustomRoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);

  // Pagination states
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
    return showAllRoles || query ? list : list.slice(0, 7);
  }, [query, showAllRoles]);

  const filteredSkills = useMemo(() => {
    const list = skillRoadmaps.filter(s => s.toLowerCase().includes(query.toLowerCase()));
    return showAllSkills || query ? list : list.slice(0, 8);
  }, [query, showAllSkills]);

  const filteredProjects = useMemo(() => {
    const list = projectIdeas.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    return showAllProjects || query ? list : list.slice(0, 8);
  }, [query, showAllProjects]);

  const filteredPractices = useMemo(() => {
    const list = bestPractices.filter(b => b.toLowerCase().includes(query.toLowerCase()));
    return query ? list : list.slice(0, 8);
  }, [query]);

  // When searching, show results from ALL categories
  const isSearching = query.trim().length > 0;
  const hasSearchResults = isSearching && (filteredRoles.length > 0 || filteredSkills.length > 0 || filteredProjects.length > 0 || filteredPractices.length > 0);

  /* ─── Render Helpers ───────────────────────────────────────────────── */

  const renderCardGrid = (
    items: string[],
    category: string,
    showExtra?: React.ReactNode,
  ) => (
    <motion.div
      key={category}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, idx) => <CardSkeleton key={idx} index={idx} />)
          : (
            <>
              {items.map((item, idx) => (
                <RoadmapCard
                  key={item}
                  label={item}
                  index={idx}
                  isNew={newItems.has(item)}
                  isSelected={selected.has(item)}
                  multiMode={multiMode}
                  onClick={() => handleSingleSelect(item, category)}
                  onToggle={() => toggleItem(item)}
                />
              ))}
              {showExtra}
            </>
          )
        }
      </div>
    </motion.div>
  );

  const renderShowAllButton = (
    isShowingAll: boolean,
    totalCount: number,
    label: string,
    onToggle: () => void,
  ) => {
    if (query || totalCount <= 15) return null;
    return (
      <div className="flex justify-center pt-6">
        <button
          onClick={onToggle}
          className="group flex items-center gap-2 px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all"
          style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.06)',
            color: 'rgba(5,6,10,0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {isShowingAll ? 'Show Less' : `Show All ${totalCount} ${label}`}
          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  };

  /* ─── Search Results (cross-category) ──────────────────────────────── */
  const renderSearchResults = () => (
    <motion.div
      key="search-results"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {filteredRoles.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
            <Compass size={14} /> Roadmaps
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredRoles.map((item, idx) => (
              <RoadmapCard key={item} label={item} index={idx} isNew={newItems.has(item)} isSelected={selected.has(item)} multiMode={multiMode} onClick={() => handleSingleSelect(item, 'Role Based Roadmap')} onToggle={() => toggleItem(item)} />
            ))}
          </div>
        </div>
      )}
      {filteredSkills.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
            <Wrench size={14} /> Skills
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredSkills.map((item, idx) => (
              <RoadmapCard key={item} label={item} index={idx + 2} isNew={newItems.has(item)} isSelected={selected.has(item)} multiMode={multiMode} onClick={() => handleSingleSelect(item, 'Skill Based Roadmap')} onToggle={() => toggleItem(item)} />
            ))}
          </div>
        </div>
      )}
      {filteredProjects.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
            <Briefcase size={14} /> Projects
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProjects.map((item, idx) => (
              <RoadmapCard key={item} label={item} index={idx + 4} isNew={newItems.has(item)} isSelected={selected.has(item)} multiMode={multiMode} onClick={() => handleSingleSelect(item, 'Project Ideas')} onToggle={() => toggleItem(item)} />
            ))}
          </div>
        </div>
      )}
      {filteredPractices.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
            <ShieldCheck size={14} /> Best Practices
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredPractices.map((item, idx) => (
              <RoadmapCard key={item} label={item} index={idx + 6} isNew={newItems.has(item)} isSelected={selected.has(item)} multiMode={multiMode} onClick={() => handleSingleSelect(item, 'Best Practices')} onToggle={() => toggleItem(item)} />
            ))}
          </div>
        </div>
      )}
      {!hasSearchResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4 text-center"
        >
          <div className="h-14 w-14 rounded-full bg-white/40 flex items-center justify-center mb-4 text-slate-400 border border-white/60 shadow-sm backdrop-blur-md">
            <Search size={22} />
          </div>
          <p className="text-[15px] font-extrabold text-slate-800 mb-1">No matches found for "{query}"</p>
          <p className="text-[12px] font-bold text-slate-400 max-w-sm mb-6 leading-relaxed">
            We couldn't find any pre-built paths matching your search. Let Cortex generate a custom path for you using Gemini.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setCustomRoleOpen(true);
            }}
            className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#4e5bff] to-[#6366f1] text-white rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Sparkles size={13} />
            Generate Custom "{query}" Path
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );

  /* ─── Tab Content Renderers ────────────────────────────────────────── */
  const renderActiveTab = () => {
    if (isSearching) return renderSearchResults();

    switch (activeTab) {
      case 'roles':
        return (
          <>
            {renderCardGrid(
              filteredRoles,
              'Role Based Roadmap',
              !query && (
                <motion.button
                  whileHover={{
                    y: -4,
                    scale: 1.02,
                    borderColor: '#4e5bff',
                    background: 'linear-gradient(135deg, rgba(78, 91, 255, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)',
                    boxShadow: '0 12px 24px -6px rgba(78,91,255,0.12), 0 4px 10px -2px rgba(78,91,255,0.05)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCustomRoleOpen(true)}
                  className="flex flex-col items-center justify-center rounded-[20px] p-5 min-h-[96px] text-center transition-all duration-300 group cursor-pointer w-full"
                  style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: '1.5px dashed rgba(78,91,255,0.3)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.01)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <div
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-full text-white mb-2.5 group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #4e5bff, #8b5cf6)', boxShadow: '0 2px 8px rgba(78,91,255,0.2)' }}
                  >
                    <Plus size={13.5} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-bold tracking-tight text-[#4e5bff] group-hover:text-[#3b46ff] transition-colors">Create Custom Path</span>
                  <Sparkles size={11} className="mt-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: '#818cf8' }} />
                </motion.button>
              ),
            )}
            {renderShowAllButton(showAllRoles, roleRoadmaps.length, 'Roadmaps', () => setShowAllRoles(!showAllRoles))}
          </>
        );

      case 'skills':
        return (
          <>
            {renderCardGrid(filteredSkills, 'Skill Based Roadmap')}
            {renderShowAllButton(showAllSkills, skillRoadmaps.length, 'Skills', () => setShowAllSkills(!showAllSkills))}
          </>
        );

      case 'projects':
        return (
          <>
            {renderCardGrid(filteredProjects, 'Project Ideas')}
            {renderShowAllButton(showAllProjects, projectIdeas.length, 'Projects', () => setShowAllProjects(!showAllProjects))}
          </>
        );

      case 'practices':
        return renderCardGrid(filteredPractices, 'Best Practices');

      case 'guides':
        return (
          <motion.div
            key="guides"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((guide, idx) => {
                const palette = cardColors[idx % cardColors.length];
                return (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{
                      y: -3,
                      scale: 1.015,
                      boxShadow: `0 12px 24px -10px ${palette.glow}, 0 4px 12px -4px rgba(0,0,0,0.02)`,
                      borderColor: palette.text + '25',
                    }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/explore?${new URLSearchParams({ goal: guide.title, track: 'Guide Detail' }).toString()}`)}
                    className="group relative flex flex-col justify-between rounded-[16px] p-4.5 text-left transition-all duration-300 overflow-hidden cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: `1px solid rgba(255, 255, 255, 0.6)`,
                      boxShadow: '0 3px 12px rgba(0,0,0,0.01), inset 0 1px 0 rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                    }}
                  >
                    {/* Corner glow */}
                    <div
                      className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-xl"
                      style={{ background: palette.text }}
                    />
                    
                    <div className="flex items-center justify-between w-full mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{
                            background: palette.iconBg,
                            color: palette.text,
                            border: `1px solid ${palette.border}`,
                          }}
                        >
                          {guide.topic}
                        </span>
                        {guide.isNew && (
                          <span className="bg-[#4e5bff] text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0 shadow-sm">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {6 + (idx * 2)} min read
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-auto">
                      <h4 className="text-[14px] font-headline-sm italic leading-[1.3] text-slate-800 group-hover:text-[#4e5bff] transition-colors">
                        {guide.title}
                      </h4>
                      <p className="text-[11.5px] font-medium text-slate-400 line-clamp-2 leading-relaxed">
                        Master the core components, design trade-offs, and micro-architectures of modern high-performance system stacks.
                      </p>
                    </div>

                    {/* Arrow action indicator */}
                    <div className="absolute bottom-4.5 right-4.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 pointer-events-none">
                      <ArrowRight size={13} style={{ color: '#4e5bff' }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex justify-center pt-4">
              <button
                onClick={() => navigate(`/explore?${new URLSearchParams({ goal: 'Software Engineering Best Practices', track: 'Guides Collection' }).toString()}`)}
                className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-[#4e5bff] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                View all guides <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative text-slate-900 min-h-full flex flex-col justify-center py-12 overflow-hidden">
      
      {/* ── Dashboard Ambient Atmospheric Glows ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[20%] w-[45vw] h-[45vw] bg-indigo-200/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] bg-purple-100/10 rounded-full blur-[120px] animate-blob" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 sm:px-10">

        {/* ── Center Gemini-Style Sparkle Header ── */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ rotate: 15, scale: 1.05 }}
            className="relative flex items-center justify-center w-11 h-11 rounded-[14px] bg-white/40 border border-white/80 shadow-md backdrop-blur-md cursor-pointer group"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="url(#cortex-logo-grad)" strokeWidth="2.2" strokeLinecap="round" className="w-6 h-6 transition-transform group-hover:rotate-45 duration-500">
              <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
              <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
              <circle cx="12" cy="12" r="2.2" className="fill-[url(#cortex-logo-grad)] stroke-none" />
              <defs>
                <linearGradient id="cortex-logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4e5bff" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </div>

        {/* ── Centered Minimalist Typography ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-10 text-center"
        >
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-[11px] font-bold text-[#4e5bff] bg-white border border-indigo-100 px-3.5 py-1.5 rounded-xl shadow-sm shadow-[#4e5bff]/5">
              Cortex command center
            </span>
          </div>
          <h1 className="text-4xl sm:text-[2.8rem] font-black tracking-tight text-[#1e1b4b] leading-tight">
            Hi {userProfile.name},
          </h1>
          <h2 className="text-4xl sm:text-[2.8rem] font-black tracking-tight leading-tight mt-1.5 text-slate-900 pb-1">
            Choose the next learning job.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-500">
            Start from a role, skill, project, practice, or guide. Cortex turns the request into a path you can inspect, study, and verify.
          </p>
        </motion.div>

        {/* ── Search Bar (Gemini Style, Centered Above Components) ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl mx-auto mb-10"
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 20px 40px -18px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.04)',
            }}
            className="flex items-center gap-4.5 rounded-2xl px-6 py-4.5 transition-all duration-300 group focus-within:shadow-[0_20px_44px_rgba(78,91,255,0.14)] focus-within:border-indigo-200"
          >
            {/* Search/Plus Icon */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 group-focus-within:text-[#4e5bff] transition-colors">
              <Search size={17} strokeWidth={2.2} />
            </div>

            {/* Input */}
            <input
              type="text"
              placeholder="Search a track or describe the job Cortex should build..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 text-[15px] font-bold placeholder:text-slate-400 w-full"
            />

            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-all cursor-pointer mr-1"
              >
                <X size={14} />
              </button>
            )}

            {/* Model Indicator / Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4e5bff] bg-[#4e5bff]/8 px-3 py-1.5 rounded-lg select-none pointer-events-none">
                Agent
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4e5bff] bg-white shadow-sm border border-slate-100/80 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                <Sparkles size={13} />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            {['Plan', 'Scout', 'Synthesize', 'Verify'].map(step => (
              <div key={step} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-bold text-slate-600 shadow-sm">
                {step}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Tab Bar + Multi-Select Toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative flex items-center justify-center mb-8 pb-3 border-b border-slate-100 w-full"
        >
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 border border-slate-200/40 rounded-full flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key && !isSearching;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setQuery(''); }}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className="relative flex items-center gap-2 px-5 py-2 rounded-full text-[12.5px] font-semibold tracking-tight transition-all duration-200 z-10"
                  style={{
                    color: isActive ? '#1f1f1f' : '#5f6368',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 rounded-full z-[-1]"
                      style={{
                        background: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02)',
                        border: '1px solid rgba(0,0,0,0.03)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === tab.key && !isActive && (
                    <motion.div
                      layoutId="hover-tab-pill"
                      className="absolute inset-0 rounded-full bg-slate-200/40 z-[-1]"
                      style={{
                        border: '1px solid rgba(0,0,0,0.01)',
                      }}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon size={13.5} strokeWidth={isActive ? 2.3 : 1.8} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Multi-select toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setMultiMode(!multiMode); if (multiMode) setSelected(new Set()); }}
            className="absolute right-0 top-[2px] flex items-center gap-1.5 px-4.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: multiMode ? '#1e293b' : 'rgba(255,255,255,0.7)',
              color: multiMode ? '#ffffff' : '#5f6368',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: multiMode ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.01)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Layers size={12} strokeWidth={2.3} />
            {multiMode ? 'Done' : 'Select'}
          </motion.button>
        </motion.div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {renderActiveTab()}
        </AnimatePresence>

      </div>



      {/* ── Multi-Select Build Action Bar ── */}
      <AnimatePresence>
        {multiMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-28 left-1/2 z-[100] -translate-x-1/2"
          >
            <div
              className="flex items-center gap-5 rounded-[24px] px-7 py-4"
              style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#1a73e8] text-white text-[14px] font-black shadow-md shadow-blue-100">
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
                className="px-8 py-3.5 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#1a73e8] transition-all flex items-center gap-2.5 shadow-lg active:scale-95 cursor-pointer"
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
  );
};

export default Dashboard;
