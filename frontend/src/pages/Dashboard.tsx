import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Bookmark, Sparkles, ArrowRight,
  Flame, BookOpen, Compass, Play, Layers, Globe, Terminal,
  Database, Brain, Shield, GitBranch, Target, Check,
  Clock, BarChart2, Cpu, Zap
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { LearningPath } from '../types';
import { roadmapPreviews, RoadmapPreview } from './roadmapPreviews';

const BrandLogo: React.FC = () => (
  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/8 border border-[#4e5bff]/30 transition-all duration-300 shadow-none group-hover:border-[#4e5bff]/55 group-hover:bg-[#4e5bff]/10">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[18px] h-[18px] text-indigo-300 group-hover:text-indigo-200 transition-all group-hover:rotate-[30deg] duration-500">
      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-40" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
      <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
      <circle cx="12" cy="12" r="2.2" className="fill-indigo-300 group-hover:fill-indigo-200 stroke-none transition-colors" />
    </svg>
  </div>
);

const CortexIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 12, className = '', style = {} }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-45" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-90" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-90" />
    <circle cx="12" cy="12" r="2" className="fill-current stroke-none" />
  </svg>
);

/* ─── Suggestion Chips ─── */
const SUGGESTIONS = [
  'Distributed Systems',
  'Full Stack Go Developer',
  'AI Agents & Tool Calling',
  'Kubernetes Operator Patterns',
  'Solidity Smart Contracts'
];

/* ─── Role Pathway Descriptions (roadmap.sh style) ─── */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Frontend': 'Build modern, interactive, and responsive web user interfaces.',
  'Backend': 'Design server-side logic, APIs, database models, and microservices.',
  'Full Stack': 'Master both client-side and server-side engineering.',
  'DevOps': 'Automate build, deployment, monitoring, and cloud infrastructure.',
  'DevSecOps': 'Integrate security compliance into continuous integration pipelines.',
  'Data Analyst': 'Clean, analyze, and visualize data to drive business decisions.',
  'AI Engineer': 'Integrate Large Language Models, agentic workflows, and prompt engineering.',
  'AI and Data Scientist': 'Build predictive models and train machine learning systems.',
  'Data Engineer': 'Build data pipelines, data warehouses, and ETL flows.',
  'Android': 'Develop native mobile apps for Google Android devices.',
  'Machine Learning': 'Understand statistical learning algorithms and neural networks.',
  'PostgreSQL': 'Master advanced query optimization and relational database design.',
  'iOS': 'Build high-performance native apps for Apple iOS devices.',
  'Blockchain': 'Develop decentralized applications and smart contracts.',
  'QA': 'Implement test suites, automation scripts, and quality processes.',
  'Software Architect': 'Design scalable, distributed, and fault-tolerant software systems.',
  'Cyber Security': 'Secure networks, assess vulnerabilities, and mitigate attacks.',
  'UX Design': 'Create intuitive, user-centric wireframes, flows, and interfaces.',
  'Technical Writer': 'Write clear documentation, guides, and API references.',
  'Game Developer': 'Design interactive 2D/3D games and real-time physics engines.',
  'Server Side Game Developer': 'Build scalable multiplayer matchmaking and game state backends.',
  'MLOps': 'Deploy, version, and monitor machine learning models in production.',
  'Product Manager': 'Define product roadmaps, user stories, and execution strategies.',
  'Engineering Manager': 'Lead engineering teams, align processes, and mentor developers.',
  'Developer Relations': 'Engage developer communities and advocate for technical products.',
  'BI Analyst': 'Build dashboard reporting and data warehouse integrations.',
  'Network Engineer': 'Configure routing, switching, firewalls, and network topologies.',
  'Cloud Architect': 'Design enterprise cloud architecture on AWS, GCP, and Azure.',
  'Site Reliability Engineer': 'Maintain system uptime, scale deployments, and run post-mortems.',
  'Platform Engineer': 'Build internal developer platforms and CLI tooling.',
  'Staff Engineer': 'Define technical directions, align systems, and guide engineering culture.',
  'Solutions Architect': 'Translate business problems into reliable cloud system designs.',
  'Embedded Systems Engineer': 'Program microcontrollers, firmware, and real-time operating systems.',
  'Security Engineer': 'Audit IAM rules, source code, and protect infrastructure.',
  'Penetration Tester': 'Conduct ethical hacking, exploit analysis, and red-teaming exercises.',
  'AR / VR Developer': 'Create immersive augmented and virtual reality spatial experiences.',
  'Computer Vision Engineer': 'Train models to recognize, track, and segment visual elements.',
  'NLP Engineer': 'Build text classification, language translations, and generation systems.',
  'Web3 Developer': 'Develop smart contracts, solidity code, and web3 connectors.',
  'Open Source Maintainer': 'Manage repository issues, review PRs, and build developer ecosystems.',
};

/* ─── Role Group Theme Colors (roadmap.sh inspired) ─── */
const getRoleTheme = (label: string) => {
  const l = label.toLowerCase();

  // Client-Side/Web/Mobile - Amber Theme
  if (l.includes('front') || l.includes('ux') || l.includes('android') || l.includes('ios') || l.includes('writer') || l.includes('design') || l.includes('game')) {
    return {
      border: 'border-t-2 border-amber-500',
      glow: 'rgba(245, 158, 11, 0.03)',
      textHover: 'group-hover:text-amber-500',
      textHoverColor: '#d97706',
      iconBg: 'bg-amber-50 text-amber-500',
      activeIconBg: 'bg-amber-100 text-amber-600',
      tagColor: 'text-amber-600 bg-amber-50 border-amber-100',
      barColor: 'bg-amber-500',
      borderHex: 'rgba(245, 158, 11, 0.45)',
      hoverBorderHex: 'rgba(245, 158, 11, 0.22)'
    };
  }
  // Systems/Backend/Database - Blue Theme
  if (l.includes('back') || l.includes('sql') || l.includes('postgres') || l.includes('mongo') || l.includes('full stack') || l.includes('blockchain') || l.includes('web3')) {
    return {
      border: 'border-t-2 border-blue-500',
      glow: 'rgba(59, 130, 246, 0.03)',
      textHover: 'group-hover:text-blue-500',
      textHoverColor: '#2563eb',
      iconBg: 'bg-blue-50 text-blue-500',
      activeIconBg: 'bg-blue-100 text-blue-600',
      tagColor: 'text-blue-600 bg-blue-50 border-blue-100',
      barColor: 'bg-blue-500',
      borderHex: 'rgba(59, 130, 246, 0.45)',
      hoverBorderHex: 'rgba(59, 130, 246, 0.22)'
    };
  }
  // Infrastructure/DevOps/SRE - Purple Theme
  if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network')) {
    return {
      border: 'border-t-2 border-purple-500',
      glow: 'rgba(168, 85, 247, 0.03)',
      textHover: 'group-hover:text-purple-500',
      textHoverColor: '#9333ea',
      iconBg: 'bg-purple-50 text-purple-500',
      activeIconBg: 'bg-purple-100 text-purple-600',
      tagColor: 'text-purple-600 bg-purple-50 border-purple-100',
      barColor: 'bg-purple-500',
      borderHex: 'rgba(168, 85, 247, 0.45)',
      hoverBorderHex: 'rgba(168, 85, 247, 0.22)'
    };
  }
  // AI/Intelligence/Data - Indigo Theme
  if (l.includes('ai') || l.includes('machine') || l.includes('nlp') || l.includes('vision') || l.includes('prompt') || l.includes('data') || l.includes('analyst') || l.includes('mlops') || l.includes('bi')) {
    return {
      border: 'border-t-2 border-indigo-500',
      glow: 'rgba(99, 102, 241, 0.03)',
      textHover: 'group-hover:text-indigo-500',
      textHoverColor: '#4f46e5',
      iconBg: 'bg-indigo-50 text-indigo-500',
      activeIconBg: 'bg-indigo-100 text-indigo-600',
      tagColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      barColor: 'bg-indigo-500',
      borderHex: 'rgba(99, 102, 241, 0.45)',
      hoverBorderHex: 'rgba(99, 102, 241, 0.22)'
    };
  }
  // Management/Architecture/Leadership - Emerald Theme
  if (l.includes('architect') || l.includes('solutions') || l.includes('manager') || l.includes('relations') || l.includes('staff')) {
    return {
      border: 'border-t-2 border-emerald-500',
      glow: 'rgba(16, 185, 129, 0.03)',
      textHover: 'group-hover:text-emerald-500',
      textHoverColor: '#059669',
      iconBg: 'bg-emerald-50 text-emerald-500',
      activeIconBg: 'bg-emerald-100 text-emerald-600',
      tagColor: 'text-emerald-650 bg-emerald-50 border-emerald-100',
      barColor: 'bg-emerald-500',
      borderHex: 'rgba(16, 185, 129, 0.45)',
      hoverBorderHex: 'rgba(16, 185, 129, 0.22)'
    };
  }
  // Security/Auditing - Red/Rose Theme
  return {
    border: 'border-t-2 border-rose-500',
    glow: 'rgba(244, 63, 94, 0.03)',
    textHover: 'group-hover:text-rose-500',
    textHoverColor: '#e11d48',
    iconBg: 'bg-rose-50 text-rose-500',
    activeIconBg: 'bg-rose-100 text-rose-600',
    tagColor: 'text-rose-600 bg-rose-50 border-rose-100',
    barColor: 'bg-rose-500',
    borderHex: 'rgba(244, 63, 94, 0.45)',
    hoverBorderHex: 'rgba(244, 63, 94, 0.22)'
  };
};

/* ─── Skill Group Theme Colors (roadmap.sh inspired) ─── */
const getSkillTheme = (label: string) => {
  const l = label.toLowerCase();
  // Database / Storage - Blue
  if (l.includes('sql') || l.includes('postgres') || l.includes('mongo') || l.includes('redis') || l.includes('graphql')) {
    return {
      glow: 'rgba(59, 130, 246, 0.03)',
      textHover: 'group-hover:text-blue-500',
      textHoverColor: '#2563eb',
      iconBg: 'bg-blue-50 text-blue-500',
      activeIconBg: 'bg-blue-50 text-blue-600',
      borderHex: 'rgba(59, 130, 246, 0.35)',
      hoverBorderHex: 'rgba(59, 130, 246, 0.18)'
    };
  }
  // Front-End / Web - Amber
  if (l.includes('react') || l.includes('vue') || l.includes('angular') || l.includes('javascript') || l.includes('typescript') || l.includes('html') || l.includes('css') || l.includes('next.js') || l.includes('design system') || l.includes('flutter')) {
    return {
      glow: 'rgba(245, 158, 11, 0.03)',
      textHover: 'group-hover:text-amber-500',
      textHoverColor: '#d97706',
      iconBg: 'bg-amber-50 text-amber-500',
      activeIconBg: 'bg-amber-50 text-amber-600',
      borderHex: 'rgba(245, 158, 11, 0.35)',
      hoverBorderHex: 'rgba(245, 158, 11, 0.18)'
    };
  }
  // DevOps / Cloud / System - Purple
  if (l.includes('kubernetes') || l.includes('docker') || l.includes('aws') || l.includes('terraform') || l.includes('linux') || l.includes('shell') || l.includes('bash') || l.includes('git')) {
    return {
      glow: 'rgba(168, 85, 247, 0.03)',
      textHover: 'group-hover:text-purple-500',
      textHoverColor: '#9333ea',
      iconBg: 'bg-purple-50 text-purple-500',
      activeIconBg: 'bg-purple-50 text-purple-600',
      borderHex: 'rgba(168, 85, 247, 0.35)',
      hoverBorderHex: 'rgba(168, 85, 247, 0.18)'
    };
  }
  // AI - Indigo
  if (l.includes('ai') || l.includes('prompt')) {
    return {
      glow: 'rgba(99, 102, 241, 0.03)',
      textHover: 'group-hover:text-indigo-500',
      textHoverColor: '#4f46e5',
      iconBg: 'bg-indigo-50 text-indigo-500',
      activeIconBg: 'bg-indigo-50 text-indigo-600',
      borderHex: 'rgba(99, 102, 241, 0.35)',
      hoverBorderHex: 'rgba(99, 102, 241, 0.18)'
    };
  }
  // General / Core CS / Best Practices - Emerald
  return {
    glow: 'rgba(16, 185, 129, 0.03)',
    textHover: 'group-hover:text-emerald-500',
    textHoverColor: '#059669',
    iconBg: 'bg-emerald-50 text-emerald-500',
    activeIconBg: 'bg-emerald-50 text-emerald-600',
    borderHex: 'rgba(16, 185, 129, 0.35)',
    hoverBorderHex: 'rgba(16, 185, 129, 0.18)'
  };
};

/* ─── Categorized Icon Helper ─── */
const getRoadmapIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('front') || l.includes('react') || l.includes('vue') || l.includes('angular') || l.includes('html') || l.includes('css')) {
    return Globe;
  }
  if (l.includes('back') || l.includes('node') || l.includes('go') || l.includes('python') || l.includes('java') || l.includes('rust') || l.includes('api design') || l.includes('c++') || l.includes('spring')) {
    return Terminal;
  }
  if (l.includes('sql') || l.includes('mongo') || l.includes('postgres') || l.includes('redis') || l.includes('data')) {
    return Database;
  }
  if (l.includes('devops') || l.includes('kubernetes') || l.includes('docker') || l.includes('aws') || l.includes('terraform') || l.includes('cloud') || l.includes('sre') || l.includes('platform')) {
    return Layers;
  }
  if (l.includes('ai') || l.includes('machine learning') || l.includes('nlp') || l.includes('computer vision') || l.includes('prompt')) {
    return Brain;
  }
  if (l.includes('security') || l.includes('sec') || l.includes('penetration') || l.includes('trust')) {
    return Shield;
  }
  if (l.includes('design') || l.includes('architecture') || l.includes('solutions') || l.includes('network')) {
    return GitBranch;
  }
  return Target;
};

/* ─── Syllabus Preview Fetcher ─── */
const getPreviewData = (label: string): RoadmapPreview => {
  if (roadmapPreviews[label]) {
    return roadmapPreviews[label];
  }
  return {
    title: `${label} Roadmap`,
    description: `Learn how to master ${label} from absolute prerequisites to production implementation and best practices.`,
    metadata: { duration: '80 Hours', level: 'Beginner to Intermediate', modulesCount: 6 },
    phases: [
      {
        title: 'Phase 1: Core Fundamentals',
        description: `Establish the foundational theories, syntax, and base structures of ${label}.`,
        modules: [
          { title: `Introduction to ${label}`, description: `Understand core definitions, history, and basic application domains of ${label}.` },
          { title: `Key Elements & Structures`, description: `Learn the primary components, standard workflows, and syntactical constructs.` }
        ]
      },
      {
        title: 'Phase 2: Development & Projects',
        description: `Apply your knowledge through hands-on labs and real-world architectures.`,
        modules: [
          { title: `Practical Implementation`, description: `Build real-world application components, configure setups, and execute commands.` },
          { title: `Best Practices & Patterns`, description: `Clean coding structures, design patterns, and standard configurations for ${label}.` }
        ]
      },
      {
        title: 'Phase 3: Scaling & Deployments',
        description: `Perform optimization, profiling, and enterprise deployment strategies.`,
        modules: [
          { title: `Performance Tuning`, description: `Query analysis, profiling bottlenecks, memory management, and scaling constraints.` },
          { title: `Production Launch`, description: `Continuous integration pipelines, deployment configurations, security hardening, and monitoring.` }
        ]
      }
    ]
  };
};

/* ─── Active Path Progress Helper ─── */
const getRoadmapProgress = (label: string, paths: LearningPath[]) => {
  const match = paths.find(p => p.goal.toLowerCase() === label.toLowerCase() || p.title.toLowerCase() === label.toLowerCase());
  if (!match) return null;
  return match.progress;
};

/* ─── Active Path Next Module Helper ─── */
const getNextModuleInfo = (path: LearningPath) => {
  if (!path.phases) return null;
  for (const phase of path.phases) {
    for (const mod of phase.modules) {
      if (!mod.isCompleted) {
        return { phaseId: phase.id, moduleId: mod.id, title: mod.title };
      }
    }
  }
  if (path.phases.length > 0 && path.phases[0].modules.length > 0) {
    return { phaseId: path.phases[0].id, moduleId: path.phases[0].modules[0].id, title: 'Review Path' };
  }
  return null;
};

/* ─── Pre-configured Sections ─── */
const roleRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'Frontend' }, { label: 'Backend' }, { label: 'DevOps' },
  { label: 'Full Stack' }, { label: 'AI Engineer' }, { label: 'Data Analyst' },
  { label: 'AI and Data Scientist' }, { label: 'Software Architect' }, { label: 'Cyber Security' },
  { label: 'System Design' }, { label: 'UX Design' }, { label: 'QA' },
  { label: 'Software Design & Architecture' }, { label: 'Game Developer' }, { label: 'Technical Writer' },
  { label: 'Product Manager' }, { label: 'Developer Relations' }, { label: 'Android' },
  { label: 'iOS' }, { label: 'PostgreSQL' }, { label: 'DBA' },
  { label: 'Database' }, { label: 'Server' }, { label: 'Blockchain' },
  { label: 'Software Engineering' }, { label: 'Computer Science' }
];

const skillRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'Clean Code' }, { label: 'Design Patterns' }, { label: 'Basic Git' },
  { label: 'Data Structures' }, { label: 'Python' }, { label: 'TypeScript' },
  { label: 'Computer Network' }, { label: 'SQL' }, { label: 'Linux' },
  { label: 'Java' }, { label: 'Go' }, { label: 'Rust' },
  { label: 'Docker' }, { label: 'Kubernetes' }, { label: 'AWS' },
  { label: 'C++' }, { label: 'C#' }, { label: 'ASP.NET' },
  { label: 'PHP' }, { label: 'Laravel' }, { label: 'Ruby' },
  { label: 'Ruby on Rails' }, { label: 'Clojure' }, { label: 'Elixir' },
  { label: 'Node.js' }, { label: 'Deno' }, { label: 'Bun' },
  { label: 'HTML' }, { label: 'CSS' }, { label: 'JavaScript' },
  { label: 'Tailwind CSS' }, { label: 'React' }, { label: 'Angular' },
  { label: 'Vue' }, { label: 'Svelte' }, { label: 'SolidJS' },
  { label: 'Preact' }, { label: 'Flutter' }, { label: 'React Native' },
  { label: 'Swift' }, { label: 'Kotlin' }, { label: 'Objective-C' },
  { label: 'Ansible' }, { label: 'Terraform' }, { label: 'Helm' },
  { label: 'PromQL' }, { label: 'Prometheus' }, { label: 'Grafana' },
  { label: 'OpenTelemetry' }, { label: 'Logstash' }, { label: 'Kibana' },
  { label: 'Elasticsearch' }
];

const bestPractices: { label: string; isNew?: boolean }[] = [
  { label: 'Frontend Best Practices' }, { label: 'Backend Best Practices' }, { label: 'DevOps Best Practices' },
  { label: 'Web Security' }, { label: 'API Security' }, { label: 'Database Security' }
];

const apiRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'API' }, { label: 'GraphQL' }, { label: 'REST API' },
  { label: 'OpenAPI' }, { label: 'gRPC' }
];

const SECTIONS = [
  { id: 'role',       label: 'Role Roadmaps',    data: roleRoadmaps,    track: 'Role Roadmap'    },
  { id: 'skill',      label: 'Skill Roadmaps',   data: skillRoadmaps,   track: 'Skill Roadmap'   },
  { id: 'best-prac',  label: 'Best Practices',   data: bestPractices,   track: 'Best Practices'  },
  { id: 'api-road',   label: 'API Roadmaps',     data: apiRoadmaps,     track: 'API Roadmap'     },
] as const;

const getSectionDescription = (sectionId: string) => {
  switch (sectionId) {
    case 'role':
      return 'Structured, step-by-step career path guides for Frontend, Backend, DevOps, and specialized domains.';
    case 'skill':
      return 'Targeted guides to master specific languages, libraries, platforms, and orchestration tools.';
    case 'best-prac':
      return 'Industry standard design methodologies, security checklists, and implementation execution practices.';
    case 'api-road':
      return 'Protocols, interface schemas, definitions, and communication channels for service integrations.';
    default:
      return 'Comprehensive roadmaps and learning paths curated for modern software engineering.';
  }
};


/* ─── Compact horizontal Role-based Roadmap Card (roadmap.sh catalog style) ─── */
const RoleRoadmapCard: React.FC<{
  label: string;
  isNew?: boolean;
  isSelected: boolean;
  multiMode: boolean;
  bookmarked: boolean;
  paths: LearningPath[];
  onClick: () => void;
  onToggle: () => void;
  onBookmark: (e: React.MouseEvent) => void;
}> = ({ label, isNew, isSelected, multiMode, bookmarked, paths, onClick, onToggle, onBookmark }) => {
  const [hov, setHov] = useState(false);
  const matchedProgress = getRoadmapProgress(label, paths);
  const theme = getRoleTheme(label);

  return (
    <motion.div
      whileHover={{ y: -1.5 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={multiMode ? onToggle : onClick}
      className="group relative flex items-center justify-between rounded-lg border transition-all duration-100 cursor-pointer text-left overflow-hidden border-slate-200/40 px-4 py-2.5 select-none"
      style={{
        background: isSelected 
          ? 'rgba(78, 91, 255, 0.03)' 
          : hov 
            ? theme.glow 
            : '#ffffff',
        borderColor: isSelected ? theme.borderHex : hov ? theme.hoverBorderHex : '#f1f5f9',
        boxShadow: hov 
          ? '0 2px 6px rgba(13, 23, 48, 0.03)' 
          : 'none',
      }}
    >
      <div className="flex items-center min-w-0">
        <h3
          className="text-[13.2px] font-bold text-slate-700 leading-snug transition-colors font-sans truncate"
          style={{ color: hov ? theme.textHoverColor : '#334155' }}
        >
          {label}
        </h3>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {isNew && !multiMode && (
          <span className={`text-[7px] font-black uppercase tracking-wider px-1.2 py-0.25 rounded border shrink-0 ${theme.tagColor}`}>
            New
          </span>
        )}

        {matchedProgress !== null ? (
          <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100 rounded px-1.2 py-0.25">
            <span className="text-[8.5px] font-black text-slate-500 font-mono leading-none">{matchedProgress}%</span>
          </div>
        ) : null}

        {multiMode ? (
          <div style={{
            width: 12, height: 12, borderRadius: 3,
            background: isSelected ? '#4e5bff' : 'transparent',
            border: `1.5px solid ${isSelected ? '#4e5bff' : '#cbd5e1'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected && (
              <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ) : (
          <button
            onClick={onBookmark}
            className={`transition-opacity duration-100 p-0.5 rounded text-slate-400 hover:bg-slate-50 ${
              bookmarked ? 'opacity-100 text-[#4e5bff]' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Bookmark size={11} fill={bookmarked ? '#4e5bff' : 'none'} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </motion.div>
  );
};



/* ─── MAIN DASHBOARD PAGE ─── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { paths, userProfile, byokMode, byokConfig } = useAppStore();
  const promptInputRef = useRef<HTMLInputElement>(null);

  // Engine status banner — shown once per session, dismissable
  const [showEngineBanner, setShowEngineBanner] = useState(() => {
    return localStorage.getItem('vidyal_engine_banner_dismissed') !== 'true';
  });
  const dismissBanner = () => {
    localStorage.setItem('vidyal_engine_banner_dismissed', 'true');
    setShowEngineBanner(false);
  };
  const isCustomMode = byokMode === 'custom' && byokConfig?.apiKey;
  const modelLabel = byokConfig?.preferredModel || byokConfig?.provider?.toUpperCase() || 'Gemini';
  const isSandbox = localStorage.getItem('vidyal_user_id') === 'sandbox-scholar';

  const [query, setQuery] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('vidyal_bookmarked_roadmaps');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [promptInput, setPromptInput] = useState('');
  const [previewItem, setPreviewItem] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<string>('Custom Roadmap');
  const [selectedPreviewModules, setSelectedPreviewModules] = useState<Record<string, boolean>>({});
  const [previewViewTab, setPreviewViewTab] = useState<'list' | 'flow'>('list');
  const [isCardFlipping, setIsCardFlipping] = useState(false);

  useEffect(() => {
    if (previewItem) {
      const data = getPreviewData(previewItem);
      const initial: Record<string, boolean> = {};
      data.phases.forEach(phase => {
        phase.modules.forEach(mod => {
          initial[mod.title] = true;
        });
      });
      setSelectedPreviewModules(initial);
      setPreviewViewTab('list');
    } else {
      setSelectedPreviewModules({});
    }
  }, [previewItem]);

  useEffect(() => {
    localStorage.setItem('vidyal_bookmarked_roadmaps', JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        promptInputRef.current?.focus();
        promptInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleItem = useCallback((item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);

  const handleMultiBuild = () => {
    if (!selected.size) return;
    const items = Array.from(selected);
    navigate(`/explore?${new URLSearchParams({
      goal: items.length === 1 ? items[0] : `Hybrid Path: ${items.join(' + ')}`,
      track: 'Hybrid Path',
    })}`);
  };

  const handlePromptSubmit = () => {
    const prompt = promptInput.trim() || query.trim();
    if (!prompt) return;
    navigate(`/explore?${new URLSearchParams({
      goal: prompt,
      track: 'Custom Path'
    })}`);
  };

  const handleSvgNavigation = useCallback((pathId: string, phaseId: string, moduleId: string) => {
    navigate(`/study/${pathId}/${phaseId}/${moduleId}`);
  }, [navigate]);

  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim();
    return SECTIONS.map(sec => ({
      ...sec,
      items: q ? sec.data.filter(r => r.label.toLowerCase().includes(q)) : sec.data,
    })).filter(sec => sec.items.length > 0);
  }, [query]);

  const hasAny = filteredSections.length > 0;

  const activePaths = useMemo(() => {
    return paths.filter(p => p.status === 'active').slice(0, 2);
  }, [paths]);

  // Bookmarked items mapped by roadmap type
  const bookmarkedItems = useMemo(() => {
    const list: { label: string; isNew?: boolean; track: string }[] = [];
    roleRoadmaps.forEach(item => {
      if (bookmarks.has(item.label)) {
        list.push({ ...item, track: 'Role Roadmap' });
      }
    });
    // Add custom bookmarks
    bookmarks.forEach(label => {
      if (!list.some(x => x.label === label)) {
        list.push({ label, track: 'Custom Path' });
      }
    });
    return list;
  }, [bookmarks]);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto antialiased relative"
      style={{ background: 'transparent' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-layer {
          background: 
            radial-gradient(circle at 50% 35%, rgba(99, 102, 241, 0.85) 0%, rgba(79, 70, 229, 0.4) 30%, transparent 60%),
            radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 70% 40%, rgba(124, 58, 237, 0.25) 0%, transparent 55%),
            linear-gradient(180deg, #020208 0%, #05041a 25%, #0e0a5c 48%, #818cf8 68%, #ffffff 90%) fixed !important;
        }
        
        .jawdropping-search-bar {
          background: rgba(13, 10, 50, 0.45) !important;
          backdrop-filter: blur(32px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(32px) saturate(200%) !important;
          border: 1px solid rgba(99, 102, 241, 0.3) !important;
          box-shadow: 
            0 4px 30px rgba(0, 0, 0, 0.2), 
            inset 0 1px 1px rgba(255, 255, 255, 0.1) !important;
        }
        
        .jawdropping-search-bar:focus,
        .jawdropping-search-bar:focus-within {
          background: rgba(13, 10, 50, 0.6) !important;
          border-color: #6366f1 !important;
          box-shadow: 
            0 8px 32px rgba(99, 102, 241, 0.25), 
            0 0 0 3px rgba(99, 102, 241, 0.15),
            inset 0 1px 1px rgba(255, 255, 255, 0.2) !important;
        }

        .jawdropping-btn-glass {
          background: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(15px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(15px) saturate(150%) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 2px 12px rgba(0, 0, 0, 0.15) !important;
        }

        .jawdropping-btn-glass:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
          color: #ffffff !important;
        }

        .jawdropping-btn-glass-active {
          background: rgba(99, 102, 241, 0.25) !important;
          border-color: rgba(99, 102, 241, 0.4) !important;
          color: #ffffff !important;
        }
      `}} />
      {/* ── Engine Status Banner ── */}
      {showEngineBanner && (
        <div
          className="w-full max-w-[1240px] mx-auto px-6 sm:px-10 pt-4 z-20 relative"
          style={{ animationFillMode: 'both' }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-[11.5px] font-semibold"
            style={{
              background: isSandbox
                ? 'linear-gradient(90deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%)'
                : isCustomMode
                  ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)'
                  : 'linear-gradient(90deg, rgba(78, 91, 255, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: isSandbox
                ? '1px solid rgba(124, 58, 237, 0.3)'
                : isCustomMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(78, 91, 255, 0.28)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px]">{isSandbox ? '🛠️' : isCustomMode ? '🔓' : '⚡'}</span>
              {isSandbox ? (
                <span className="text-violet-300">
                  Running in Developer Sandbox · Connected to system API key — all synthesis operations fully unlocked
                </span>
              ) : isCustomMode ? (
                <span className="text-emerald-300">
                  Running on your personal key · <span className="font-black text-white">{modelLabel}</span>
                  <span className="text-emerald-400/65 font-normal ml-1">— full quota, private usage</span>
                </span>
              ) : (
                <span className="text-indigo-300">
                  Running on shared system key · <span className="font-black text-white">Gemini 1.5 Flash</span>
                  <span className="text-indigo-400/65 font-normal ml-1">— add your own key for unlimited access</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!isSandbox && !isCustomMode && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                >
                  Add my key →
                </button>
              )}
              <button
                onClick={dismissBanner}
                className="text-slate-400 hover:text-white transition-colors text-[15px] leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1240px] mx-auto px-6 sm:px-10 pt-12 pb-24 z-10 relative">

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-indigo-200/60 text-[11px] font-bold uppercase tracking-widest mb-3">
            <span>Cortex</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span>Learning Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight select-none">
            <span className="text-white">Developer </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-200 filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.35)]">Roadmaps</span>
          </h1>

          <p className="max-w-[580px] mx-auto mt-2.5 text-[14.5px] font-medium text-indigo-100/70 sm:text-center leading-relaxed">
            Step-by-step career path guides, technical skill maps, and reference guidelines to help you navigate your learning journey.
          </p>

        </div>

        {/* ── Centered Search/Command Box ── */}
        <div className="mb-10 max-w-[760px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1 rounded-xl jawdropping-search-bar relative" style={{ padding: '12px 18px' }}>
              <Search size={16} strokeWidth={2.2} style={{ color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0 }} />
              <input
                ref={promptInputRef}
                type="text"
                placeholder="Search roadmaps, skills... or describe a custom path to build"
                value={query}
                onChange={e => { setQuery(e.target.value); setPromptInput(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') handlePromptSubmit(); }}
                className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-white placeholder-indigo-200/50"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />

              {!query && (
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] font-bold text-slate-300 font-mono select-none pointer-events-none shrink-0">
                  /
                </div>
              )}

              <AnimatePresence>
                {query.trim().length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <button onClick={() => { setQuery(''); setPromptInput(''); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                      <X size={13} />
                    </button>
                    <button
                      onClick={handlePromptSubmit}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4e5bff] hover:bg-[#5c68ff] text-white rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                      <CortexIcon size={10} className="text-white" /> Build Path
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { setMultiMode(v => !v); if (multiMode) setSelected(new Set()); }}
              className={`jawdropping-btn-glass flex items-center gap-2 shrink-0 ${multiMode ? 'jawdropping-btn-glass-active' : ''}`}
            >
              <CortexIcon size={12} className={multiMode ? 'text-white' : 'text-indigo-400'} />
              {multiMode ? 'Cancel Selection' : 'Hybrid Select'}
            </button>
          </div>

          {!query && (
            <div className="flex flex-wrap gap-2 items-center justify-center mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[10px] font-bold text-indigo-200/60 uppercase tracking-[0.14em] mr-0.5">Suggestions:</span>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setPromptInput(s); promptInputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10 text-[10.5px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm backdrop-blur-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Center-Aligned Stacked Content Sheet ── */}
        <div
          className="rounded-2xl p-6 sm:p-10 border relative shadow-lg shadow-indigo-950/5 cortex-grid-canvas"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.95) 100%)',
            borderColor: 'rgba(78, 91, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            minHeight: '60vh'
          }}
        >


          {/* 2. DYNAMIC BOOKMARKS SHELF (Top of catalog) */}
          {bookmarkedItems.length > 0 && !query && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <Bookmark size={14} className="text-[#4e5bff] fill-[#4e5bff]/10" />
                <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pinned Roadmaps</h2>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {bookmarkedItems.map(item => (
                  <RoleRoadmapCard
                    key={item.label}
                    label={item.label}
                    isNew={item.isNew}
                    isSelected={selected.has(item.label)}
                    multiMode={multiMode}
                    bookmarked={bookmarks.has(item.label)}
                    paths={paths}
                    onClick={() => {
                      setPreviewItem(item.label);
                      setPreviewTrack(item.track);
                    }}
                    onToggle={() => toggleItem(item.label)}
                    onBookmark={e => toggleBookmark(item.label, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. CATALOG LISTINGS */}
          {query ? (
            // Search Mode Results
            hasAny ? (
              <div className="space-y-10">
                {filteredSections.map((sec, si) => (
                  <motion.div
                    key={sec.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: si * 0.04, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {sec.label} ({sec.items.length})
                      </h2>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sec.items.map(item => (
                        <RoleRoadmapCard
                          key={item.label}
                          label={item.label}
                          isNew={item.isNew}
                          isSelected={selected.has(item.label)}
                          multiMode={multiMode}
                          bookmarked={bookmarks.has(item.label)}
                          paths={paths}
                          onClick={() => {
                            setPreviewItem(item.label);
                            setPreviewTrack(sec.track);
                          }}
                          onToggle={() => toggleItem(item.label)}
                          onBookmark={e => toggleBookmark(item.label, e)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Search Empty State */
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#4e5bff]/5 border border-[#4e5bff]/10">
                  <Search size={16} className="text-[#4e5bff]" />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">
                  No matches found
                </p>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Describe what you want to learn, and Cortex will build a custom pathway map.
                </p>
                <button
                  onClick={handlePromptSubmit}
                  className="app-btn-accent h-9 px-4 text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CortexIcon size={12} className="text-white animate-spin" style={{ animationDuration: '4s' }} /> Build custom path
                </button>
              </div>
            )
          ) : (
            // Stacked Directory Mode (roadmap.sh style)
            <div className="space-y-12">
              {SECTIONS.map((sec, si) => (
                <div key={sec.id}>
                  <div className="mb-5">
                    <h2 className="text-[17px] font-black text-slate-800 leading-none font-display">
                      {sec.label}
                    </h2>
                    <p className="text-[11.5px] text-slate-450 font-medium leading-normal mt-1.5 font-sans">
                      {getSectionDescription(sec.id)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sec.data.map(item => (
                      <RoleRoadmapCard
                        key={item.label}
                        label={item.label}
                        isNew={item.isNew}
                        isSelected={selected.has(item.label)}
                        multiMode={multiMode}
                        bookmarked={bookmarks.has(item.label)}
                        paths={paths}
                        onClick={() => {
                          setPreviewItem(item.label);
                          setPreviewTrack(sec.track);
                        }}
                        onToggle={() => toggleItem(item.label)}
                        onBookmark={e => toggleBookmark(item.label, e)}
                      />
                    ))}

                    {/* Custom pathway generator card rendered only at the end of the first section (Role Roadmaps) */}
                    {sec.id === 'role' && !multiMode && (
                      <button
                        onClick={() => {
                          promptInputRef.current?.focus();
                          promptInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="group flex items-center justify-center rounded-lg transition-all duration-100 cursor-pointer focus:outline-none overflow-hidden border px-4 py-2.5 select-none"
                        style={{
                          background: 'rgba(78, 91, 255, 0.005)',
                          border: '1px dashed rgba(78, 91, 255, 0.25)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.02)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.45)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.005)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.25)';
                        }}
                      >
                        <span className="text-[13.2px] font-bold text-[#4e5bff] font-sans truncate">
                          Synthesize Custom Path
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hybrid Selection Drawer (Slide-up) ── */}
      <AnimatePresence>
        {multiMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-8 left-1/2 z-[100] w-full max-w-[620px] px-4"
          >
            <div
              className="flex items-center justify-between gap-4 rounded-2xl border"
              style={{
                padding: '12px 18px',
                background: '#0d0d0d',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-mono font-black shrink-0"
                  style={{ background: 'rgba(78,91,255,0.25)', border: '1px solid rgba(78,91,255,0.45)', color: '#fff' }}
                >
                  {selected.size}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider leading-none">Merging Recipe</p>
                  <p
                    className="text-[12.5px] font-bold truncate text-white mt-1"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {Array.from(selected).join(' + ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => setSelected(new Set())} className="p-1 rounded-lg text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <X size={14} />
                </button>
                <div className="w-px h-5 bg-white/12" />
                <button
                  onClick={handleMultiBuild}
                  className="app-btn-accent h-9.5 px-4.5 text-[12px] cursor-pointer flex items-center gap-1.5"
                >
                  <span>Compile Hybrid Path</span>
                  <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Split-Screen Onboarding Dialog ── */}
      <AnimatePresence>
        {previewItem && (
          <>
            {/* Backdrop — dynamically colored to match selected card */}
            {(() => {
              const lbl = (previewItem || '').toLowerCase();
              // Default: purple/violet (full stack)
              let blob1 = 'rgba(139,92,246,0.55)';   
              let blob2 = 'rgba(99,102,241,0.45)';   
              let blob3 = 'rgba(217,70,239,0.25)';  
              if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design')) {
                // Sunset orange/red/amber
                blob1 = 'rgba(234,88,12,0.55)'; blob2 = 'rgba(255,149,0,0.45)'; blob3 = 'rgba(250,204,21,0.25)';
              } else if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('full stack') || lbl.includes('blockchain')) {
                // Cyan / blue
                blob1 = 'rgba(0,188,212,0.50)'; blob2 = 'rgba(34,211,238,0.40)'; blob3 = 'rgba(59,130,246,0.30)';
              } else if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre')) {
                // Hot pink / magenta
                blob1 = 'rgba(236,72,153,0.55)'; blob2 = 'rgba(168,85,247,0.45)'; blob3 = 'rgba(99,102,241,0.25)';
              } else if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp')) {
                // Cyan / indigo
                blob1 = 'rgba(6,182,212,0.55)'; blob2 = 'rgba(59,130,246,0.45)'; blob3 = 'rgba(99,102,241,0.25)';
              } else if (lbl.includes('architect') || lbl.includes('solutions') || lbl.includes('manager') || lbl.includes('staff')) {
                // Emerald green
                blob1 = 'rgba(16,185,129,0.55)'; blob2 = 'rgba(5,150,105,0.45)'; blob3 = 'rgba(132,204,22,0.25)';
              }
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[1000] backdrop-blur-[20px] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
                  style={{ backgroundColor: 'rgba(2,4,15,0.78)' }}
                  onClick={() => setPreviewItem(null)}
                >
                  {/* Large color-matched glow blob — top-left */}
                  <div className="absolute w-[700px] h-[700px] rounded-full pointer-events-none" style={{ backgroundColor: blob1, filter: 'blur(140px)', top: '-25%', left: '-20%', mixBlendMode: 'screen' }} />
                  {/* Large color-matched glow blob — bottom-right */}
                  <div className="absolute w-[700px] h-[700px] rounded-full pointer-events-none" style={{ backgroundColor: blob2, filter: 'blur(150px)', bottom: '-25%', right: '-20%', mixBlendMode: 'screen' }} />
                  {/* Mid accent blob — center */}
                  <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none" style={{ backgroundColor: blob3, filter: 'blur(110px)', top: '20%', left: '25%', mixBlendMode: 'screen' }} />
                  {/* Fine dot matrix */}
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)', backgroundSize: '28px 28px' }} />

              {/* ── SPLIT-FLIP CARD STAGE ── */}
              <div style={{ perspective: '1400px', width: '100%', maxWidth: 1020, position: 'relative', height: 640 }}>

                {/* ══ FRONT CARD — rotates out ══ */}
                <motion.div
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{
                    scale: 1, y: 0, opacity: 1,
                    rotateY: isCardFlipping ? 90 : 0,
                  }}
                  exit={{ scale: 0.95, y: 20, opacity: 0 }}
                  transition={isCardFlipping
                    ? { rotateY: { duration: 0.65, ease: [0.25, 1, 0.5, 1] } }
                    : { type: 'spring', damping: 28, stiffness: 220 }
                  }
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 24, overflow: 'hidden',
                    display: 'flex', flexDirection: 'row',
                    background: 'white',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    transformOrigin: 'center center',
                    pointerEvents: isCardFlipping ? 'none' : 'auto',
                  }}
                >
                  {/* LEFT COLUMN */}
                  {(() => {
                    const previewData = getPreviewData(previewItem);
                    const getThemeColor = (item: string) => {
                      const l = (item || '').toLowerCase();
                      if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios')) {
                        return { primary: '#ea580c', secondary: '#f97316', bg: 'rgba(234, 88, 12, 0.03)', tint: '#fffcf9', badgeBg: 'rgba(234,88,12,0.06)', badgeBorder: 'rgba(234,88,12,0.12)', text: '#ea580c' };
                      }
                      if (l.includes('back') || l.includes('sql') || l.includes('mongo') || l.includes('full stack') || l.includes('blockchain') || l.includes('web3')) {
                        return { primary: '#16a34a', secondary: '#22c55e', bg: 'rgba(22, 163, 74, 0.03)', tint: '#f9fdfa', badgeBg: 'rgba(22,163,74,0.06)', badgeBorder: 'rgba(22,163,74,0.12)', text: '#16a34a' };
                      }
                      if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network')) {
                        return { primary: '#db2777', secondary: '#ec4899', bg: 'rgba(219, 39, 119, 0.03)', tint: '#fdf9fb', badgeBg: 'rgba(219,39,119,0.06)', badgeBorder: 'rgba(219,39,119,0.12)', text: '#db2777' };
                      }
                      if (l.includes('ai') || l.includes('machine') || l.includes('data') || l.includes('mlops') || l.includes('nlp') || l.includes('vision') || l.includes('analyst')) {
                        return { primary: '#0284c7', secondary: '#0ea5e9', bg: 'rgba(2, 132, 199, 0.03)', tint: '#f9faff', badgeBg: 'rgba(2,132,199,0.06)', badgeBorder: 'rgba(2,132,199,0.12)', text: '#0284c7' };
                      }
                      return { primary: '#4e5bff', secondary: '#6366f1', bg: 'rgba(78, 91, 255, 0.03)', tint: '#fafbff', badgeBg: 'rgba(78,91,255,0.06)', badgeBorder: 'rgba(78,91,255,0.12)', text: '#4e5bff' };
                    };
                    const theme = getThemeColor(previewItem || '');
                    const totalModulesCount = previewData.phases.reduce((acc, p) => acc + p.modules.length, 0);
                    const selectedCount = Object.values(selectedPreviewModules).filter(Boolean).length;
                    const progressPercent = totalModulesCount > 0 ? Math.round((selectedCount / totalModulesCount) * 100) : 0;
                    const radius = 28;
                    const circ = 2 * Math.PI * radius;
                    const dash = (progressPercent / 100) * circ;

                    return (
                      <div className="w-full md:w-[58%] flex flex-col overflow-hidden relative" style={{ background: 'radial-gradient(circle at 10% 10%, rgba(99,102,241,0.015) 0%, transparent 60%), #ffffff', borderRight: '1px solid #f1f5f9' }}>
                        {/* Blueprint tech grid overlay */}
                        <div 
                          className="absolute inset-0 opacity-[0.01] pointer-events-none select-none" 
                          style={{ 
                            backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)', 
                            backgroundSize: '24px 24px' 
                          }} 
                        />
                        {/* ── TOP NAV ── */}
                        <div className="flex items-center justify-between px-8 pt-6 pb-2 shrink-0 relative z-10">
                           <div className="flex items-center gap-2.5">
                             <BrandLogo />
                             <span className="text-[12px] font-black tracking-tight text-[#0f172a]">Cortex</span>
                           </div>
                           <button
                             onClick={() => setPreviewItem(null)}
                             className="flex items-center gap-1.5 cursor-pointer transition-all group"
                           >
                             <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                               <path d="M9 11L5 7l4-4" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                             </svg>
                             <span className="text-[10.5px] font-bold text-slate-400 group-hover:text-slate-700 transition-colors">Back</span>
                           </button>
                        </div>

                        {/* ── HERO CONTAINER ── */}
                        <div className="px-8 pb-5 pt-3 shrink-0 relative z-10">
                          <div className="flex items-center gap-6 relative z-10">
                            {/* Oversized animated ring */}
                            <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
                              <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'relative', zIndex: 1 }}>
                                {/* Track */}
                                <circle cx="36" cy="36" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
                                {/* Progress */}
                                <circle
                                  cx="36" cy="36" r={radius} fill="none"
                                  stroke="#4f46e5" strokeWidth="4.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${dash} ${circ}`}
                                  strokeDashoffset={circ / 4}
                                  style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 2 }}>
                                <span className="text-[14px] font-black leading-none text-[#0f172a]">{progressPercent}</span>
                                <span className="text-[7.5px] font-extrabold text-indigo-500 mt-0.5">%</span>
                              </div>
                            </div>

                              {/* Course identity */}
                              <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2" style={{ background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
                                  <span className="text-[7.5px] font-black uppercase tracking-[0.2em]" style={{ color: theme.text }}>Curriculum</span>
                                </div>
                                <h2 className="text-[18px] font-black leading-snug text-[#0f172a]">{previewData.title}</h2>
                                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                  <span className="text-[9.5px] font-bold text-slate-400">{totalModulesCount} modules</span>
                                  <span className="text-slate-200">·</span>
                                  <span className="text-[9.5px] font-bold text-slate-400">{previewData.phases.length} phases</span>
                                  <span className="text-slate-200">·</span>
                                  <span className="text-[9.5px] font-black" style={{ color: theme.text }}>{selectedCount} selected</span>
                                </div>
                              </div>
                            </div>

                            {/* Thin progress track below hero */}
                            <div className="mt-4 h-[3px] rounded-full relative z-10" style={{ background: '#f1f5f9' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}
                              />
                            </div>
                          </div>

                        {/* ── MODULE LIST ── */}
                        <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-5 custom-scrollbar">
                          {previewData.phases.map((phase, pIdx) => (
                            <div key={pIdx}>
                              {/* Phase header */}
                              <div className="flex items-center gap-3 mb-3">
                                <div
                                  className="flex items-center justify-center w-5 h-5 rounded-lg text-[9px] font-black text-white shrink-0"
                                  style={{ background: '#0f172a', boxShadow: '0 2px 8px rgba(15,23,42,0.1)' }}
                                >
                                  {pIdx + 1}
                                </div>
                                <div className="flex-1 flex items-center gap-2.5">
                                  <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>{phase.title}</span>
                                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #e2e8f0 0%, transparent 100%)' }} />
                                </div>
                              </div>

                              {/* Module cards */}
                              <div className="space-y-2">
                                {phase.modules.map((m, mIdx) => {
                                  const isChecked = !!selectedPreviewModules[m.title];
                                  const estimateMin = 30 + ((m.title.length * 7) % 6) * 10;
                                  // Smart keyword-based vector icon — semantically matched to module topic
                                  const resolveIcon = (title: string): React.ReactNode => {
                                    const t = title.toLowerCase();
                                    const p = { size: 14, className: isChecked ? 'text-[#4e5bff]' : 'text-slate-400' };
                                    if (t.includes('auth') || t.includes('oauth') || t.includes('jwt') || t.includes('login') || t.includes('session')) return <Shield {...p} />;
                                    if (t.includes('secur') || t.includes('encrypt') || t.includes('ssl') || t.includes('https') || t.includes('firewall')) return <Shield {...p} />;
                                    if (t.includes('permission') || t.includes('role') || t.includes('access') || t.includes('rbac')) return <Shield {...p} />;
                                    if (t.includes('sql') || t.includes('postgres') || t.includes('mysql') || t.includes('relational') || t.includes('schema')) return <Database {...p} />;
                                    if (t.includes('mongo') || t.includes('nosql') || t.includes('document') || t.includes('collection')) return <Database {...p} />;
                                    if (t.includes('redis') || t.includes('cache') || t.includes('memcach')) return <Zap {...p} />;
                                    if (t.includes('index') || t.includes('query') || t.includes('optimiz')) return <Search {...p} />;
                                    if (t.includes('migrat') || t.includes('seed') || t.includes('backup')) return <GitBranch {...p} />;
                                    if (t.includes('transaction') || t.includes('acid') || t.includes('locking')) return <Shield {...p} />;
                                    if (t.includes('rest') || t.includes('api') || t.includes('endpoint') || t.includes('route') || t.includes('routing')) return <Globe {...p} />;
                                    if (t.includes('graphql')) return <Layers {...p} />;
                                    if (t.includes('websocket') || t.includes('socket') || t.includes('real-time') || t.includes('realtime')) return <Globe {...p} />;
                                    if (t.includes('grpc') || t.includes('rpc') || t.includes('proto')) return <Cpu {...p} />;
                                    if (t.includes('webhook') || t.includes('event') || t.includes('message') || t.includes('queue') || t.includes('kafka') || t.includes('rabbit')) return <GitBranch {...p} />;
                                    if (t.includes('http') || t.includes('request') || t.includes('response') || t.includes('header')) return <Globe {...p} />;
                                    if (t.includes('architect') || t.includes('system design') || t.includes('design pattern') || t.includes('solid')) return <Layers {...p} />;
                                    if (t.includes('microservice') || t.includes('service mesh') || t.includes('monolith')) return <Layers {...p} />;
                                    if (t.includes('concurrent') || t.includes('parallel') || t.includes('thread') || t.includes('async') || t.includes('promise')) return <Zap {...p} />;
                                    if (t.includes('clean') || t.includes('refactor') || t.includes('pattern')) return <Sparkles {...p} />;
                                    if (t.includes('scalab') || t.includes('load balanc') || t.includes('horizontal')) return <BarChart2 {...p} />;
                                    if (t.includes('fault') || t.includes('resilient') || t.includes('circuit') || t.includes('retry')) return <Shield {...p} />;
                                    if (t.includes('docker') || t.includes('container') || t.includes('image') || t.includes('compose')) return <Layers {...p} />;
                                    if (t.includes('kubernetes') || t.includes('k8s') || t.includes('helm') || t.includes('pod') || t.includes('cluster')) return <Cpu {...p} />;
                                    if (t.includes('aws') || t.includes('gcp') || t.includes('azure') || t.includes('cloud')) return <Globe {...p} />;
                                    if (t.includes('terraform') || t.includes('infra') || t.includes('iac') || t.includes('pulumi')) return <Layers {...p} />;
                                    if (t.includes('ci') || t.includes('cd') || t.includes('pipeline') || t.includes('deploy') || t.includes('release')) return <Zap {...p} />;
                                    if (t.includes('monitor') || t.includes('observ') || t.includes('metric') || t.includes('log') || t.includes('trace')) return <BarChart2 {...p} />;
                                    if (t.includes('serverless') || t.includes('lambda') || t.includes('function')) return <Zap {...p} />;
                                    if (t.includes('react') || t.includes('next') || t.includes('vue') || t.includes('angular') || t.includes('svelte')) return <Brain {...p} />;
                                    if (t.includes('css') || t.includes('style') || t.includes('tailwind') || t.includes('sass')) return <BookOpen {...p} />;
                                    if (t.includes('animation') || t.includes('motion') || t.includes('transition') || t.includes('framer')) return <Sparkles {...p} />;
                                    if (t.includes('component') || t.includes('ui') || t.includes('interface') || t.includes('layout')) return <Layers {...p} />;
                                    if (t.includes('accessib') || t.includes('aria') || t.includes('a11y') || t.includes('semantic')) return <Shield {...p} />;
                                    if (t.includes('performance') || t.includes('optimiz') || t.includes('bundle') || t.includes('lazy')) return <Zap {...p} />;
                                    if (t.includes('responsive') || t.includes('mobile') || t.includes('viewport') || t.includes('breakpoint')) return <Globe {...p} />;
                                    if (t.includes('form') || t.includes('input') || t.includes('validat')) return <Check {...p} />;
                                    if (t.includes('state') || t.includes('redux') || t.includes('zustand') || t.includes('context') || t.includes('store')) return <Brain {...p} />;
                                    if (t.includes('hook') || t.includes('lifecycle') || t.includes('effect')) return <Zap {...p} />;
                                    if (t.includes('test') || t.includes('jest') || t.includes('cypress') || t.includes('playwright') || t.includes('vitest')) return <Check {...p} />;
                                    if (t.includes('neural') || t.includes('deep learn') || t.includes('backprop') || t.includes('gradient')) return <Brain {...p} />;
                                    if (t.includes('llm') || t.includes('gpt') || t.includes('language model') || t.includes('transformer')) return <Cpu {...p} />;
                                    if (t.includes('prompt') || t.includes('rag') || t.includes('embedding') || t.includes('vector')) return <Terminal {...p} />;
                                    if (t.includes('train') || t.includes('fine-tun') || t.includes('finetun')) return <Target {...p} />;
                                    if (t.includes('classif') || t.includes('cluster') || t.includes('regression') || t.includes('predict')) return <BarChart2 {...p} />;
                                    if (t.includes('data') || t.includes('dataset') || t.includes('pipeline') || t.includes('etl')) return <Database {...p} />;
                                    if (t.includes('vision') || t.includes('image') || t.includes('cnn') || t.includes('object detect')) return <Layers {...p} />;
                                    if (t.includes('nlp') || t.includes('text') || t.includes('tokeniz') || t.includes('sentiment')) return <BookOpen {...p} />;
                                    if (t.includes('mlops') || t.includes('model') || t.includes('deploy') || t.includes('experiment')) return <Cpu {...p} />;
                                    if (t.includes('git') || t.includes('version') || t.includes('branch') || t.includes('merge')) return <GitBranch {...p} />;
                                    if (t.includes('debug') || t.includes('profil') || t.includes('trace')) return <Terminal {...p} />;
                                    if (t.includes('docum') || t.includes('readme') || t.includes('swagger') || t.includes('openapi')) return <BookOpen {...p} />;
                                    if (t.includes('runtime') || t.includes('node') || t.includes('deno') || t.includes('bun')) return <Cpu {...p} />;
                                    if (t.includes('type') || t.includes('typescript') || t.includes('interface') || t.includes('generic')) return <Cpu {...p} />;
                                    if (t.includes('function') || t.includes('closure') || t.includes('scope') || t.includes('hof')) return <Terminal {...p} />;
                                    if (t.includes('algorithm') || t.includes('sort') || t.includes('search') || t.includes('complexity')) return <Target {...p} />;
                                    if (t.includes('struct') || t.includes('tree') || t.includes('graph') || t.includes('linked')) return <Layers {...p} />;
                                    if (t.includes('memory') || t.includes('gc') || t.includes('heap') || t.includes('stack')) return <Database {...p} />;
                                    if (t.includes('network') || t.includes('tcp') || t.includes('dns') || t.includes('ip')) return <Globe {...p} />;
                                    return <Layers {...p} />;
                                  };
                                  const icon = resolveIcon(m.title);

                                  return (
                                    <button
                                      key={mIdx}
                                      type="button"
                                      onClick={() => setSelectedPreviewModules(prev => ({ ...prev, [m.title]: !isChecked }))}
                                      className="w-full text-left flex items-center gap-4 rounded-[20px] transition-all duration-300 cursor-pointer relative overflow-hidden hover:scale-[1.01] hover:border-slate-300 group/item"
                                      style={{
                                        padding: '13px 18px 13px 16px',
                                        background: isChecked ? theme.bg : '#ffffff',
                                        border: isChecked 
                                          ? `1.5px solid ${theme.primary}` 
                                          : '1.5px solid #f1f5f9',
                                        boxShadow: isChecked 
                                          ? `0 10px 25px -5px ${theme.bg}, 0 2px 4px rgba(15,23,42,0.01)` 
                                          : '0 1px 3px rgba(0,0,0,0.01), 0 4px 12px -4px rgba(15,23,42,0.02)',
                                      }}
                                    >
                                      {/* Icon wrapper */}
                                      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300" style={{ background: '#f8fafc' }}>
                                        {icon}
                                      </div>
                                      {/* Title */}
                                      <span className="flex-1 text-[12px] font-bold leading-tight truncate transition-colors duration-300" style={{ color: isChecked ? '#0f172a' : '#475569' }}>
                                        {m.title}
                                      </span>
                                      {/* Time badge */}
                                      <div className="shrink-0 flex items-center gap-1">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md transition-all duration-300" style={{ background: isChecked ? 'rgba(255,255,255,0.8)' : '#f8fafc', color: isChecked ? theme.primary : '#64748b' }}>
                                          {estimateMin}m
                                        </span>
                                      </div>
                                      {/* Checkbox (Circular Task Node) */}
                                      <div
                                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                                        style={{
                                          background: isChecked ? theme.primary : 'white',
                                          border: isChecked ? 'none' : '1.5px solid #cbd5e1',
                                          boxShadow: isChecked ? `0 2px 8px ${theme.bg}` : 'none',
                                        }}
                                      >
                                        {isChecked ? (
                                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        ) : (
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 transition-all group-hover/item:bg-slate-500" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ── PREMIUM CTA BAR ── */}
                        <div className="shrink-0 px-8 py-5 relative z-10" style={{ borderTop: '1px solid #f1f5f9', background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const trackVal = previewTrack;
                              const selectedList = Object.entries(selectedPreviewModules)
                                .filter(([_, checked]) => checked)
                                .map(([title]) => title)
                                .join(', ');
                              const params: Record<string, string> = { goal: previewItem || '', track: trackVal };
                              if (selectedList) params.selectedModules = selectedList;
                              setIsCardFlipping(true);
                              setTimeout(() => {
                                setPreviewItem(null);
                                setIsCardFlipping(false);
                                navigate(`/explore?${new URLSearchParams(params)}`);
                              }, 2500);
                            }}
                            disabled={selectedCount === 0}
                            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-white font-black text-[12px] uppercase tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800"
                            style={{
                              background: '#0f172a',
                              boxShadow: selectedCount > 0 ? '0 4px 14px rgba(15,23,42,0.15)' : 'none',
                            }}
                          >
                            <span>Compile Path</span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <p className="text-center text-[9px] font-bold mt-2.5" style={{ color: '#94a3b8' }}>
                            SARA will build your personalized roadmap
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                {/* RIGHT COLUMN: Purely aesthetic visual art panel — zero info, only jaw-dropping */}
                {(() => {
                  const l = (previewItem || '').toLowerCase();

                  // ── Gradient per course identity ──
                  let panelGradient = 'linear-gradient(145deg, #4c1d95 0%, #7c3aed 45%, #1d4ed8 100%)';
                  if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios'))
                    panelGradient = 'linear-gradient(145deg, #7c2d12 0%, #c2410c 40%, #fbbf24 100%)';
                  else if (l.includes('back') || l.includes('sql') || l.includes('mongo') || l.includes('full stack') || l.includes('blockchain') || l.includes('web3'))
                    panelGradient = 'linear-gradient(145deg, #052e16 0%, #166534 45%, #0e7490 100%)';
                  else if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network'))
                    panelGradient = 'linear-gradient(145deg, #500724 0%, #be185d 40%, #7c3aed 100%)';
                  else if (l.includes('ai') || l.includes('machine') || l.includes('data') || l.includes('mlops') || l.includes('nlp') || l.includes('vision') || l.includes('analyst'))
                    panelGradient = 'linear-gradient(145deg, #0c4a6e 0%, #0369a1 40%, #4f46e5 100%)';
                  else if (l.includes('architect') || l.includes('solutions') || l.includes('manager') || l.includes('staff'))
                    panelGradient = 'linear-gradient(145deg, #022c22 0%, #15803d 45%, #65a30d 100%)';

                  // ── Visual art component per identity ──
                  const renderArt = () => {

                    // ─ FRONTEND / UX → Dark code editor with live preview ─
                    if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[260px] h-[300px] rounded-2xl bg-white/10 rotate-3 translate-x-6 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[260px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] -rotate-1" style={{ background: '#0d1117' }}>
                            <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#161b22' }}>
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="ml-2 text-[8px] font-mono text-white/30">App.tsx</span>
                            </div>
                            <div className="px-3 py-3 font-mono text-[8.5px] leading-[1.7]">
                              <div><span style={{color:'#7ee787'}}>function</span> <span style={{color:'#79c0ff'}}>HeroSection</span><span style={{color:'#e6edf3'}}>{`() {`}</span></div>
                              <div><span style={{color:'#e6edf3'}}>  </span><span style={{color:'#7ee787'}}>return</span><span style={{color:'#e6edf3'}}> (</span></div>
                              <div><span style={{color:'#e6edf3'}}>    &lt;</span><span style={{color:'#7ee787'}}>div</span> <span style={{color:'#79c0ff'}}>className</span><span style={{color:'#e6edf3'}}>=</span><span style={{color:'#a5d6ff'}}>&quot;hero&quot;</span><span style={{color:'#e6edf3'}}>&gt;</span></div>
                              <div><span style={{color:'#e6edf3'}}>      &lt;</span><span style={{color:'#7ee787'}}>h1</span><span style={{color:'#e6edf3'}}>&gt;</span><span style={{color:'#a5d6ff'}}>Build the</span><span style={{color:'#e6edf3'}}>&lt;/</span><span style={{color:'#7ee787'}}>h1</span><span style={{color:'#e6edf3'}}>&gt;</span></div>
                              <div><span style={{color:'#e6edf3'}}>      &lt;</span><span style={{color:'#7ee787'}}>Button</span> <span style={{color:'#79c0ff'}}>onClick</span><span style={{color:'#e6edf3'}}>=</span><span style={{color:'#e6edf3'}}>{`{launch}`}</span><span style={{color:'#e6edf3'}}> /&gt;</span></div>
                              <div><span style={{color:'#e6edf3'}}>    &lt;/</span><span style={{color:'#7ee787'}}>div</span><span style={{color:'#e6edf3'}}>&gt;</span></div>
                              <div><span style={{color:'#e6edf3'}}>  );</span></div>
                              <div><span style={{color:'#e6edf3'}}>{`}`}</span></div>
                            </div>
                            <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ background: '#21262d' }}>
                              <div className="px-3 py-2">
                                <div className="text-[7px] text-white/30 font-mono mb-2">PREVIEW</div>
                                <div className="h-6 rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center">
                                  <span className="text-white font-black text-[8px]">Build the Future →</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-8 right-4 bg-amber-400 rounded-xl px-2.5 py-1.5 shadow-xl rotate-6">
                            <span className="text-[8px] font-black text-amber-900">✦ Live</span>
                          </div>
                        </div>
                      );
                    }

                    // ─ BACKEND / DATABASE → Dark terminal + JSON API response ─
                    if (l.includes('back') || l.includes('sql') || l.includes('mongo') || l.includes('full stack') || l.includes('blockchain') || l.includes('web3')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[280px] rounded-2xl bg-white/10 rotate-4 translate-x-5 translate-y-5 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#0f0f13' }}>
                            <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#1a1a22' }}>
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="ml-2 text-[8px] font-mono text-white/30">GET /api/users/42</span>
                            </div>
                            <div className="px-3 py-3 font-mono text-[8px] leading-[1.8]">
                              <div><span style={{color:'#58a6ff'}}>{`{`}</span></div>
                              <div><span style={{color:'#a5d6ff'}}>  &quot;id&quot;</span><span style={{color:'#79c0ff'}}>: </span><span style={{color:'#ffa657'}}>42</span><span style={{color:'#e6edf3'}}>,</span></div>
                              <div><span style={{color:'#a5d6ff'}}>  &quot;name&quot;</span><span style={{color:'#79c0ff'}}>: </span><span style={{color:'#a5d6ff'}}>&quot;Lokesh G&quot;</span><span style={{color:'#e6edf3'}}>,</span></div>
                              <div><span style={{color:'#a5d6ff'}}>  &quot;role&quot;</span><span style={{color:'#79c0ff'}}>: </span><span style={{color:'#a5d6ff'}}>&quot;engineer&quot;</span><span style={{color:'#e6edf3'}}>,</span></div>
                              <div><span style={{color:'#a5d6ff'}}>  &quot;skills&quot;</span><span style={{color:'#79c0ff'}}>: </span><span style={{color:'#58a6ff'}}>[</span></div>
                              <div><span style={{color:'#a5d6ff'}}>    &quot;Node.js&quot;</span><span style={{color:'#e6edf3'}}>, </span><span style={{color:'#a5d6ff'}}>&quot;PostgreSQL&quot;</span></div>
                              <div><span style={{color:'#58a6ff'}}>  ]</span></div>
                              <div><span style={{color:'#58a6ff'}}>{`}`}</span></div>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: '#1a1a22' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[7.5px] font-mono text-emerald-400">200 OK · 12ms · 1.2 KB</span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute bottom-7 right-3 bg-emerald-400 rounded-xl px-2 py-1 shadow-xl -rotate-3">
                            <span className="text-[7.5px] font-black text-emerald-900">REST API</span>
                          </div>
                        </div>
                      );
                    }

                    // ─ DEVOPS / CLOUD → Live Kubernetes pod dashboard ─
                    if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[290px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#0d0d14' }}>
                            <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-white/80">Cluster · prod-k8s</span>
                                <span className="px-1.5 py-0.5 rounded text-[6.5px] font-black" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>● LIVE</span>
                              </div>
                            </div>
                            <div className="px-3 py-2 space-y-1.5">
                              {[
                                { name: 'api-server', rep: 3, status: 'running', cpu: 62 },
                                { name: 'auth-svc', rep: 2, status: 'running', cpu: 31 },
                                { name: 'db-proxy', rep: 1, status: 'running', cpu: 47 },
                                { name: 'cache-layer', rep: 2, status: 'pending', cpu: 0 },
                              ].map((pod, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: '#1a1a28' }}>
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pod.status === 'running' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                  <span className="text-[7.5px] font-mono flex-1 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{pod.name}</span>
                                  <span className="text-[6.5px] font-mono w-4 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>{pod.rep}x</span>
                                  <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className={`h-full rounded-full ${pod.cpu > 50 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${pod.cpu}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg px-2 py-2" style={{ background: '#1a1a28' }}>
                                <div className="text-[7px] font-mono mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>CPU %</div>
                                <svg viewBox="0 0 200 28" className="w-full">
                                  <defs><linearGradient id="pkgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" /><stop offset="100%" stopColor="#f472b6" stopOpacity="0" /></linearGradient></defs>
                                  <polyline points="0,22 25,18 50,20 75,13 100,15 125,9 150,11 175,7 200,5" fill="none" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" />
                                  <polyline points="0,22 25,18 50,20 75,13 100,15 125,9 150,11 175,7 200,5 200,28 0,28" fill="url(#pkgrad)" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ AI / ML / DATA → AI chat interface ─
                    if (l.includes('ai') || l.includes('machine') || l.includes('data') || l.includes('mlops') || l.includes('nlp') || l.includes('vision') || l.includes('analyst')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[295px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#080c14' }}>
                            <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#0f1623' }}>
                              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }}>
                                <span className="text-[8px] text-white font-black">✦</span>
                              </div>
                              <span className="text-[8px] font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>SARA · AI Engine</span>
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[6px] font-black" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>● thinking</span>
                            </div>
                            <div className="px-3 py-3 space-y-2.5">
                              <div className="flex justify-end">
                                <div className="max-w-[72%] rounded-2xl rounded-tr-sm px-2.5 py-1.5 text-[8px] text-white font-semibold" style={{ background: '#1d4ed8' }}>
                                  Explain backpropagation briefly.
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-2.5 py-1.5 text-[8px] font-semibold leading-relaxed" style={{ background: '#1a2035', color: 'rgba(255,255,255,0.75)' }}>
                                  Compute error, chain-rule backwards through each layer to update weights via gradient descent.
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <div className="max-w-[65%] rounded-2xl rounded-tr-sm px-2.5 py-1.5 text-[8px] text-white font-semibold" style={{ background: '#1d4ed8' }}>
                                  Show me a PyTorch snippet.
                                </div>
                              </div>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 w-fit" style={{ background: '#1a2035' }}>
                                {[0,1,2].map(i => (
                                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-6 right-3 bg-cyan-400 rounded-xl px-2 py-1 shadow-xl rotate-6">
                            <span className="text-[7.5px] font-black text-cyan-900">GPT-4o</span>
                          </div>
                        </div>
                      );
                    }

                    // ─ ARCHITECT / SOLUTIONS → Glowing dark system topology ─
                    if (l.includes('architect') || l.includes('solutions') || l.includes('manager') || l.includes('staff')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#070f0a' }}>
                            <div className="flex items-center justify-between px-3 py-2.5" style={{ background: '#0e1a12' }}>
                              <span className="text-[8px] font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>System · v3 Architecture</span>
                              <span className="px-1.5 py-0.5 rounded text-[6px] font-black" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>● healthy</span>
                            </div>
                            <div className="relative px-3 py-2" style={{ height: '175px' }}>
                              <svg viewBox="0 0 220 155" className="w-full h-full">
                                <defs>
                                  <filter id="eglow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                </defs>
                                <line x1="45" y1="28" x2="110" y2="75" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"/>
                                <line x1="175" y1="28" x2="110" y2="75" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"/>
                                <line x1="110" y1="75" x2="45" y2="125" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"/>
                                <line x1="110" y1="75" x2="175" y2="125" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"/>
                                <line x1="110" y1="75" x2="110" y2="125" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3"/>
                                {[
                                  { x:45, y:20, label:'CDN', color:'#6ee7b7', main:false },
                                  { x:175, y:20, label:'WAF', color:'#6ee7b7', main:false },
                                  { x:110, y:68, label:'API', color:'#4ade80', main:true },
                                  { x:20, y:118, label:'DB', color:'#a7f3d0', main:false },
                                  { x:110, y:118, label:'Cache', color:'#a7f3d0', main:false },
                                  { x:200, y:118, label:'Queue', color:'#a7f3d0', main:false },
                                ].map((n, i) => (
                                  <g key={i} filter={n.main ? 'url(#eglow)' : undefined}>
                                    <rect x={n.x - 20} y={n.y - 9} width={n.label.length > 3 ? 44 : 40} height="18" rx="5" fill={n.main ? '#065f46' : '#0f2918'} stroke={n.color} strokeWidth={n.main ? 1.5 : 1} strokeOpacity="0.8" />
                                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill={n.color} fontSize="7" fontWeight="700">{n.label}</text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: '#0e1a12' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[7.5px] font-mono" style={{ color: 'rgba(110,231,183,0.75)' }}>Latency p99 · 4.2ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ DEFAULT / FULL STACK → Dark feature showcase glassmorphism ─
                    return (
                      <div className="relative w-full h-full flex items-center justify-center p-6">
                        <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                        <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#0a0516' }}>
                          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#120929' }}>
                            <div className="w-4 h-4 rounded-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }} />
                            <span className="text-[8px] font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>Cortex · Learning OS</span>
                          </div>
                          <div className="px-3 py-3 space-y-2">
                            {[
                              { icon: '⚡', title: 'AI Synthesis', desc: 'Dynamic curriculum from PDFs & videos', color: '#a78bfa' },
                              { icon: '🧠', title: 'Active Recall', desc: 'Spaced repetition & Socratic testing', color: '#818cf8' },
                              { icon: '🗺️', title: 'Neural Maps', desc: 'D3.js knowledge graph explorer', color: '#6ee7b7' },
                            ].map((f, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="text-[16px]">{f.icon}</span>
                                <div className="min-w-0">
                                  <div className="text-[8.5px] font-black" style={{ color: f.color }}>{f.title}</div>
                                  <div className="text-[7.5px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-3 pb-3">
                            <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="flex justify-between mb-1.5">
                                <span className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>MASTERY</span>
                                <span className="text-[7px] font-mono font-black" style={{ color: '#a78bfa' }}>74%</span>
                              </div>
                              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-full rounded-full w-[74%]" style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div
                      className="hidden md:flex md:w-[42%] relative overflow-hidden items-center justify-center select-none"
                      style={{ background: panelGradient }}
                    >
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.10) 0%, transparent 65%)' }} />
                      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)', backgroundSize: '24px 24px' }} />
                      <div className="relative z-10 w-full h-full">
                        {renderArt()}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>{/* end FRONT CARD */}

                {/* ══ BACK CARD — rotates in ══ */}
                {(() => {
                  const l = (previewItem || '').toLowerCase();
                  let backGradient = 'linear-gradient(145deg, #4c1d95 0%, #7c3aed 45%, #1d4ed8 100%)';
                  if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios'))
                    backGradient = 'linear-gradient(145deg, #7c2d12 0%, #c2410c 40%, #fbbf24 100%)';
                  else if (l.includes('back') || l.includes('sql') || l.includes('mongo') || l.includes('full stack') || l.includes('blockchain') || l.includes('web3'))
                    backGradient = 'linear-gradient(145deg, #052e16 0%, #166534 45%, #0e7490 100%)';
                  else if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network'))
                    backGradient = 'linear-gradient(145deg, #500724 0%, #be185d 40%, #7c3aed 100%)';
                  else if (l.includes('ai') || l.includes('machine') || l.includes('data') || l.includes('mlops') || l.includes('nlp') || l.includes('vision') || l.includes('analyst'))
                    backGradient = 'linear-gradient(145deg, #0c4a6e 0%, #0369a1 40%, #4f46e5 100%)';
                  else if (l.includes('architect') || l.includes('solutions') || l.includes('manager') || l.includes('staff'))
                    backGradient = 'linear-gradient(145deg, #022c22 0%, #15803d 45%, #65a30d 100%)';

                  return (
                    <motion.div
                      onClick={e => e.stopPropagation()}
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{
                        rotateY: isCardFlipping ? 0 : -90,
                        opacity: isCardFlipping ? 1 : 0,
                      }}
                      transition={{
                        rotateY: { duration: 0.65, ease: [0.25, 1, 0.5, 1], delay: isCardFlipping ? 0.65 : 0 },
                        opacity: { duration: 0.01, delay: isCardFlipping ? 0.65 : 0 },
                      }}
                      style={{
                        position: 'absolute', inset: 0,
                        borderRadius: 24, overflow: 'hidden',
                        background: backGradient,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        transformOrigin: 'center center',
                        pointerEvents: isCardFlipping ? 'auto' : 'none',
                      }}
                    >
                      {/* Vignette Overlay for Depth & Contrast */}
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />

                      {/* Ambient glows inside overlay */}
                      <div style={{ position: 'absolute', width: 450, height: 450, top: '-20%', left: '-15%', borderRadius: '50%', background: `radial-gradient(circle, ${blob1} 0%, transparent 65%)`, filter: 'blur(90px)', opacity: 0.4, mixBlendMode: 'screen', zIndex: 1 }} />
                      <div style={{ position: 'absolute', width: 400, height: 400, bottom: '-20%', right: '-15%', borderRadius: '50%', background: `radial-gradient(circle, ${blob2} 0%, transparent 65%)`, filter: 'blur(80px)', opacity: 0.35, mixBlendMode: 'screen', zIndex: 1 }} />
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)', backgroundSize: '24px 24px', zIndex: 1 }} />

                      {/* Elegant Glassmorphic Container */}
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: isCardFlipping ? 1 : 0.9, opacity: isCardFlipping ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.75 }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          backdropFilter: 'blur(25px)',
                          WebkitBackdropFilter: 'blur(25px)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '28px',
                          padding: '52px 64px',
                          maxWidth: '620px',
                          width: '88%',
                          textAlign: 'center',
                          zIndex: 2,
                          boxShadow: '0 40px 90px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                          position: 'relative',
                        }}
                      >
                        {/* Corner accents */}
                        <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-white/30 rounded-tl-sm" />
                        <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-white/30 rounded-tr-sm" />
                        <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-white/30 rounded-bl-sm" />
                        <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-white/30 rounded-br-sm" />

                        {/* Dynamic pulse badge */}
                        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/20 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/90 mb-6 w-fit mx-auto shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          COGNITIVE SYNAPSE ACTIVE
                        </div>

                        {/* Cinema title welcome text */}
                        <motion.p
                          initial={{ letterSpacing: '0.15em', opacity: 0, filter: 'blur(4px)' }}
                          animate={{
                            letterSpacing: isCardFlipping ? '0.45em' : '0.15em',
                            opacity: isCardFlipping ? 0.85 : 0,
                            filter: isCardFlipping ? 'blur(0px)' : 'blur(4px)'
                          }}
                          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.75 }}
                          style={{ fontSize: '11px', fontWeight: 900, color: 'white', textTransform: 'uppercase', marginBottom: 16 }}
                        >
                          Welcome to
                        </motion.p>

                        {/* Cinematic zoom/blur course name */}
                        <motion.h2
                          initial={{ scale: 0.82, filter: 'blur(12px)', opacity: 0 }}
                          animate={{
                            scale: isCardFlipping ? 1 : 0.82,
                            filter: isCardFlipping ? 'blur(0px)' : 'blur(12px)',
                            opacity: isCardFlipping ? 1 : 0
                          }}
                          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}
                          style={{
                            fontSize: '38px',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                            color: 'white',
                            marginBottom: '28px',
                            textShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                        >
                          {previewItem}
                        </motion.h2>

                        {/* Premium Scanner Line */}
                        <div style={{ position: 'relative', width: '220px', height: '1px', margin: '0 auto', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                          <motion.div
                            animate={{ left: ['-100%', '100%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              width: '80px',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            }}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })()}

              </div>{/* end perspective stage */}
                </motion.div>
              );
            })()}

          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
