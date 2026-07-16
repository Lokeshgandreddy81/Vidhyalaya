import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Bookmark, Sparkles, ArrowRight,
  Flame, BookOpen, Compass, Play, Layers, Globe, Terminal,
  Database, Brain, Shield, GitBranch, Target, Check,
  Clock, BarChart2, Cpu, Zap, Lightbulb, ChevronRight, ChevronLeft
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

/* ─── 18 Premium Theme Design Definitions ─── */
const THEME_DEFINITIONS = [
  // 0. Sunset Amber
  {
    gradient: 'linear-gradient(145deg, #7c2d12 0%, #c2410c 40%, #fbbf24 100%)',
    blobs: ['rgba(234,88,12,0.45)', 'rgba(249,115,22,0.35)', 'rgba(251,191,36,0.20)'],
    role: {
      border: 'border-t-2 border-amber-500',
      glow: 'rgba(245, 158, 11, 0.03)',
      textHover: 'group-hover:text-amber-600',
      textHoverColor: '#d97706',
      iconBg: 'bg-amber-50 text-amber-600',
      activeIconBg: 'bg-amber-100 text-amber-700',
      tagColor: 'text-amber-700 bg-amber-50 border-amber-100/50',
      barColor: 'bg-amber-500',
      borderHex: 'rgba(245, 158, 11, 0.35)',
      hoverBorderHex: 'rgba(245, 158, 11, 0.15)'
    }
  },
  // 1. Deep Ocean
  {
    gradient: 'linear-gradient(145deg, #052e16 0%, #0369a1 45%, #0e7490 100%)',
    blobs: ['rgba(2,132,199,0.45)', 'rgba(14,116,144,0.35)', 'rgba(56,189,248,0.20)'],
    role: {
      border: 'border-t-2 border-sky-500',
      glow: 'rgba(2, 132, 199, 0.03)',
      textHover: 'group-hover:text-sky-600',
      textHoverColor: '#0284c7',
      iconBg: 'bg-sky-50 text-sky-600',
      activeIconBg: 'bg-sky-100 text-sky-700',
      tagColor: 'text-sky-700 bg-sky-50 border-sky-100/50',
      barColor: 'bg-sky-500',
      borderHex: 'rgba(2, 132, 199, 0.35)',
      hoverBorderHex: 'rgba(2, 132, 199, 0.15)'
    }
  },
  // 2. Cyber Purple
  {
    gradient: 'linear-gradient(145deg, #4c1d95 0%, #7c3aed 45%, #ec4899 100%)',
    blobs: ['rgba(124,58,237,0.45)', 'rgba(147,51,234,0.35)', 'rgba(236,72,153,0.20)'],
    role: {
      border: 'border-t-2 border-violet-500',
      glow: 'rgba(124, 58, 237, 0.03)',
      textHover: 'group-hover:text-violet-600',
      textHoverColor: '#7c3aed',
      iconBg: 'bg-violet-50 text-violet-600',
      activeIconBg: 'bg-violet-100 text-violet-700',
      tagColor: 'text-violet-700 bg-violet-50 border-violet-100/50',
      barColor: 'bg-violet-500',
      borderHex: 'rgba(124, 58, 237, 0.35)',
      hoverBorderHex: 'rgba(124, 58, 237, 0.15)'
    }
  },
  // 3. Neon Teal
  {
    gradient: 'linear-gradient(145deg, #042f2c 0%, #0d9488 45%, #14b8a6 100%)',
    blobs: ['rgba(13,148,136,0.45)', 'rgba(20,184,166,0.35)', 'rgba(45,212,191,0.20)'],
    role: {
      border: 'border-t-2 border-teal-500',
      glow: 'rgba(13, 148, 136, 0.03)',
      textHover: 'group-hover:text-teal-600',
      textHoverColor: '#0d9488',
      iconBg: 'bg-teal-50 text-teal-600',
      activeIconBg: 'bg-teal-100 text-teal-700',
      tagColor: 'text-teal-700 bg-teal-50 border-teal-100/50',
      barColor: 'bg-teal-500',
      borderHex: 'rgba(13, 148, 136, 0.35)',
      hoverBorderHex: 'rgba(13, 148, 136, 0.15)'
    }
  },
  // 4. Emerald Mint
  {
    gradient: 'linear-gradient(145deg, #022c22 0%, #15803d 45%, #65a30d 100%)',
    blobs: ['rgba(5,150,105,0.45)', 'rgba(21,128,61,0.35)', 'rgba(101,163,13,0.20)'],
    role: {
      border: 'border-t-2 border-emerald-500',
      glow: 'rgba(5, 150, 105, 0.03)',
      textHover: 'group-hover:text-emerald-600',
      textHoverColor: '#059669',
      iconBg: 'bg-emerald-50 text-emerald-600',
      activeIconBg: 'bg-emerald-100 text-emerald-700',
      tagColor: 'text-emerald-700 bg-emerald-50 border-emerald-100/50',
      barColor: 'bg-emerald-500',
      borderHex: 'rgba(5, 150, 105, 0.35)',
      hoverBorderHex: 'rgba(5, 150, 105, 0.15)'
    }
  },
  // 5. Rose Gold / Sakura
  {
    gradient: 'linear-gradient(145deg, #4c0519 0%, #881337 45%, #be123c 100%)',
    blobs: ['rgba(190,18,60,0.45)', 'rgba(225,29,72,0.35)', 'rgba(251,113,133,0.20)'],
    role: {
      border: 'border-t-2 border-rose-500',
      glow: 'rgba(190, 18, 60, 0.03)',
      textHover: 'group-hover:text-rose-600',
      textHoverColor: '#be123c',
      iconBg: 'bg-rose-50 text-rose-600',
      activeIconBg: 'bg-rose-100 text-rose-700',
      tagColor: 'text-rose-700 bg-rose-50 border-rose-100/50',
      barColor: 'bg-rose-500',
      borderHex: 'rgba(190, 18, 60, 0.35)',
      hoverBorderHex: 'rgba(190, 18, 60, 0.15)'
    }
  },
  // 6. Volcanic Rust
  {
    gradient: 'linear-gradient(145deg, #7c2d12 0%, #9a3412 40%, #ea580c 100%)',
    blobs: ['rgba(194,65,12,0.45)', 'rgba(234,88,12,0.35)', 'rgba(249,115,22,0.20)'],
    role: {
      border: 'border-t-2 border-orange-600',
      glow: 'rgba(194, 65, 12, 0.03)',
      textHover: 'group-hover:text-orange-700',
      textHoverColor: '#c2410c',
      iconBg: 'bg-orange-50 text-orange-700',
      activeIconBg: 'bg-orange-100 text-orange-800',
      tagColor: 'text-orange-850 bg-orange-50 border-orange-100/50',
      barColor: 'bg-orange-600',
      borderHex: 'rgba(194, 65, 12, 0.35)',
      hoverBorderHex: 'rgba(194, 65, 12, 0.15)'
    }
  },
  // 7. Interstellar Violet
  {
    gradient: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)',
    blobs: ['rgba(79,70,229,0.45)', 'rgba(99,102,241,0.35)', 'rgba(129,140,248,0.20)'],
    role: {
      border: 'border-t-2 border-indigo-600',
      glow: 'rgba(79, 70, 229, 0.03)',
      textHover: 'group-hover:text-indigo-700',
      textHoverColor: '#4f46e5',
      iconBg: 'bg-indigo-50 text-indigo-700',
      activeIconBg: 'bg-indigo-100 text-indigo-800',
      tagColor: 'text-indigo-700 bg-indigo-50 border-indigo-100/50',
      barColor: 'bg-indigo-600',
      borderHex: 'rgba(79, 70, 229, 0.35)',
      hoverBorderHex: 'rgba(79, 70, 229, 0.15)'
    }
  },
  // 8. Charcoal Zinc
  {
    gradient: 'linear-gradient(145deg, #09090b 0%, #18181b 45%, #3f3f46 100%)',
    blobs: ['rgba(63,63,70,0.45)', 'rgba(82,82,91,0.35)', 'rgba(161,161,170,0.20)'],
    role: {
      border: 'border-t-2 border-zinc-600',
      glow: 'rgba(63, 63, 70, 0.03)',
      textHover: 'group-hover:text-zinc-700',
      textHoverColor: '#3f3f46',
      iconBg: 'bg-zinc-100 text-zinc-700',
      activeIconBg: 'bg-zinc-200 text-zinc-800',
      tagColor: 'text-zinc-700 bg-zinc-50 border-zinc-200/50',
      barColor: 'bg-zinc-650',
      borderHex: 'rgba(63, 63, 70, 0.35)',
      hoverBorderHex: 'rgba(63, 63, 70, 0.15)'
    }
  },
  // 9. Citron Lime
  {
    gradient: 'linear-gradient(145deg, #1f2d05 0%, #3f6212 45%, #84cc16 100%)',
    blobs: ['rgba(101,163,13,0.45)', 'rgba(132,204,22,0.35)', 'rgba(163,230,53,0.20)'],
    role: {
      border: 'border-t-2 border-lime-600',
      glow: 'rgba(101, 163, 13, 0.03)',
      textHover: 'group-hover:text-lime-700',
      textHoverColor: '#65a30d',
      iconBg: 'bg-lime-50 text-lime-700',
      activeIconBg: 'bg-lime-100 text-lime-800',
      tagColor: 'text-lime-750 bg-lime-50 border-lime-100/50',
      barColor: 'bg-lime-600',
      borderHex: 'rgba(101, 163, 13, 0.35)',
      hoverBorderHex: 'rgba(101, 163, 13, 0.15)'
    }
  },
  // 10. Electric Sky
  {
    gradient: 'linear-gradient(145deg, #083344 0%, #0891b2 45%, #06b6d4 100%)',
    blobs: ['rgba(8,145,178,0.45)', 'rgba(6,182,212,0.35)', 'rgba(34,211,238,0.20)'],
    role: {
      border: 'border-t-2 border-cyan-600',
      glow: 'rgba(8, 145, 178, 0.03)',
      textHover: 'group-hover:text-cyan-700',
      textHoverColor: '#0891b2',
      iconBg: 'bg-cyan-50 text-cyan-700',
      activeIconBg: 'bg-cyan-100 text-cyan-800',
      tagColor: 'text-cyan-750 bg-cyan-50 border-cyan-100/50',
      barColor: 'bg-cyan-600',
      borderHex: 'rgba(8, 145, 178, 0.35)',
      hoverBorderHex: 'rgba(8, 145, 178, 0.15)'
    }
  },
  // 11. Cranberry Crimson
  {
    gradient: 'linear-gradient(145deg, #4c0519 0%, #e11d48 45%, #f43f5e 100%)',
    blobs: ['rgba(225,29,72,0.45)', 'rgba(244,63,94,0.35)', 'rgba(251,113,133,0.20)'],
    role: {
      border: 'border-t-2 border-rose-600',
      glow: 'rgba(225, 29, 72, 0.03)',
      textHover: 'group-hover:text-rose-700',
      textHoverColor: '#e11d48',
      iconBg: 'bg-rose-50 text-rose-700',
      activeIconBg: 'bg-rose-100 text-rose-800',
      tagColor: 'text-rose-750 bg-rose-50 border-rose-100/50',
      barColor: 'bg-rose-600',
      borderHex: 'rgba(225, 29, 72, 0.35)',
      hoverBorderHex: 'rgba(225, 29, 72, 0.15)'
    }
  },
  // 12. Espresso Bronze
  {
    gradient: 'linear-gradient(145deg, #451a03 0%, #78350f 45%, #b45309 100%)',
    blobs: ['rgba(120,53,15,0.45)', 'rgba(180,83,9,0.35)', 'rgba(217,119,6,0.20)'],
    role: {
      border: 'border-t-2 border-amber-900',
      glow: 'rgba(120, 53, 15, 0.03)',
      textHover: 'group-hover:text-amber-900',
      textHoverColor: '#78350f',
      iconBg: 'bg-amber-50 text-amber-900',
      activeIconBg: 'bg-amber-100 text-amber-950',
      tagColor: 'text-amber-950 bg-amber-50 border-amber-900/30',
      barColor: 'bg-amber-900',
      borderHex: 'rgba(120, 53, 15, 0.35)',
      hoverBorderHex: 'rgba(120, 53, 15, 0.15)'
    }
  },
  // 13. Neon Magenta
  {
    gradient: 'linear-gradient(145deg, #4d072b 0%, #831843 45%, #d946ef 100%)',
    blobs: ['rgba(236,72,153,0.45)', 'rgba(219,39,119,0.35)', 'rgba(244,114,182,0.20)'],
    role: {
      border: 'border-t-2 border-pink-500',
      glow: 'rgba(236, 72, 153, 0.03)',
      textHover: 'group-hover:text-pink-600',
      textHoverColor: '#db2777',
      iconBg: 'bg-pink-50 text-pink-600',
      activeIconBg: 'bg-pink-100 text-pink-700',
      tagColor: 'text-pink-700 bg-pink-50 border-pink-100/50',
      barColor: 'bg-pink-500',
      borderHex: 'rgba(236, 72, 153, 0.35)',
      hoverBorderHex: 'rgba(236, 72, 153, 0.15)'
    }
  },
  // 14. Midnight Navy
  {
    gradient: 'linear-gradient(145deg, #030712 0%, #172554 45%, #1d4ed8 100%)',
    blobs: ['rgba(30,58,138,0.45)', 'rgba(29,78,216,0.35)', 'rgba(96,165,250,0.20)'],
    role: {
      border: 'border-t-2 border-blue-900',
      glow: 'rgba(30, 58, 138, 0.03)',
      textHover: 'group-hover:text-blue-900',
      textHoverColor: '#1e3a8a',
      iconBg: 'bg-blue-50 text-blue-900',
      activeIconBg: 'bg-blue-100 text-blue-950',
      tagColor: 'text-blue-950 bg-blue-50 border-blue-900/30',
      barColor: 'bg-blue-900',
      borderHex: 'rgba(30, 58, 138, 0.35)',
      hoverBorderHex: 'rgba(30, 58, 138, 0.15)'
    }
  },
  // 15. Forest Moss / Sage
  {
    gradient: 'linear-gradient(145deg, #14532d 0%, #166534 45%, #4d7c0f 100%)',
    blobs: ['rgba(63,98,18,0.45)', 'rgba(77,124,15,0.35)', 'rgba(163,230,53,0.20)'],
    role: {
      border: 'border-t-2 border-lime-800',
      glow: 'rgba(63, 98, 18, 0.03)',
      textHover: 'group-hover:text-lime-800',
      textHoverColor: '#3f6212',
      iconBg: 'bg-lime-50 text-lime-805',
      activeIconBg: 'bg-lime-100 text-lime-900',
      tagColor: 'text-lime-900 bg-lime-50 border-lime-800/30',
      barColor: 'bg-lime-800',
      borderHex: 'rgba(63, 98, 18, 0.35)',
      hoverBorderHex: 'rgba(63, 98, 18, 0.15)'
    }
  },
  // 16. Warm Sand / Sepia
  {
    gradient: 'linear-gradient(145deg, #2e1d0c 0%, #452a0f 45%, #ca8a04 100%)',
    blobs: ['rgba(180,83,9,0.45)', 'rgba(202,138,4,0.35)', 'rgba(250,204,21,0.20)'],
    role: {
      border: 'border-t-2 border-amber-700',
      glow: 'rgba(180, 83, 9, 0.03)',
      textHover: 'group-hover:text-amber-700',
      textHoverColor: '#b45309',
      iconBg: 'bg-amber-50 text-amber-700',
      activeIconBg: 'bg-amber-100 text-amber-800',
      tagColor: 'text-amber-800 bg-amber-50 border-amber-700/50',
      barColor: 'bg-amber-700',
      borderHex: 'rgba(180, 83, 9, 0.35)',
      hoverBorderHex: 'rgba(180, 83, 9, 0.15)'
    }
  },
  // 17. Metallic Platinum / Silver
  {
    gradient: 'linear-gradient(145deg, #1e293b 0%, #334155 45%, #94a3b8 100%)',
    blobs: ['rgba(100,116,139,0.45)', 'rgba(71,85,105,0.35)', 'rgba(148,163,184,0.20)'],
    role: {
      border: 'border-t-2 border-slate-400',
      glow: 'rgba(100, 116, 139, 0.03)',
      textHover: 'group-hover:text-slate-600',
      textHoverColor: '#475569',
      iconBg: 'bg-slate-150 text-slate-600',
      activeIconBg: 'bg-slate-200 text-slate-700',
      tagColor: 'text-slate-700 bg-slate-50 border-slate-300',
      barColor: 'bg-slate-500',
      borderHex: 'rgba(100, 116, 139, 0.35)',
      hoverBorderHex: 'rgba(100, 116, 139, 0.15)'
    }
  }
];

function getThemeIndex(label: string): number {
  const l = (label || '').toLowerCase();

  if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios') || l.includes('writer') || l.includes('game')) return 0;
  if (l.includes('back') || l.includes('sql') || l.includes('postgres') || l.includes('mongo') || l.includes('full stack')) return 1;
  if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network')) return 2;
  if (l.includes('go') || l.includes('systems') || l.includes('compiler') || l.includes('c++')) return 3;
  if (l.includes('architect') || l.includes('solutions') || l.includes('manager') || l.includes('relations') || l.includes('staff')) return 4;
  if (l.includes('secur') || l.includes('audit') || l.includes('crypt') || l.includes('cybersecurity')) return 5;
  if (l.includes('rust') || l.includes('embedded') || l.includes('kernel') || l.includes('driver')) return 6;
  if (l.includes('ai') || l.includes('machine') || l.includes('nlp') || l.includes('vision') || l.includes('prompt') || l.includes('data') || l.includes('analyst') || l.includes('mlops')) return 7;
  if (l.includes('shell') || l.includes('unix') || l.includes('bash') || l.includes('linux') || l.includes('command') || l.includes('terminal')) return 8;
  if (l.includes('blockchain') || l.includes('web3') || l.includes('solidity') || l.includes('smart contract') || l.includes('ethereum')) return 9;
  if (l.includes('socket') || l.includes('realtime') || l.includes('real-time') || l.includes('serverless') || l.includes('websocket')) return 10;
  if (l.includes('qa') || l.includes('test') || l.includes('cypress') || l.includes('ci/cd') || l.includes('pipeline')) return 11;
  if (l.includes('assembly') || l.includes('hardware') || l.includes('verilog') || l.includes('microcontroller') || l.includes('cpu')) return 12;
  if (l.includes('graphics') || l.includes('webgl') || l.includes('opengl') || l.includes('unity') || l.includes('unreal') || l.includes('render')) return 13;
  if (l.includes('distributed') || l.includes('hpc') || l.includes('parallel') || l.includes('cluster')) return 14;
  if (l.includes('writing') || l.includes('documentation') || l.includes('research') || l.includes('academic') || l.includes('scholarly')) return 15;
  if (l.includes('math') || l.includes('statistics') || l.includes('algorithm') || l.includes('discrete')) return 16;
  if (l.includes('quantum') || l.includes('deep tech') || l.includes('physics')) return 17;

  // Fallback to deterministic hash index modulo 18 for equal distribution across all 18 themes
  let hash = 0;
  for (let i = 0; i < l.length; i++) {
    hash = (hash << 5) - hash + l.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 18;
}

const getRoleTheme = (label: string) => {
  return THEME_DEFINITIONS[getThemeIndex(label)].role;
};

const getSkillTheme = (label: string) => {
  return THEME_DEFINITIONS[getThemeIndex(label)].role;
};

const getPreviewGradient = (item: string) => {
  if (item.includes('+') || item.includes(',')) {
    const rawParts = item.replace(/^Hybrid Path:\s*/i, '').split(/[\+,]/).map(s => s.trim()).filter(Boolean);
    if (rawParts.length >= 2) {
      const idx1 = getThemeIndex(rawParts[0]);
      const idx2 = getThemeIndex(rawParts[1]);
      const t1 = THEME_DEFINITIONS[idx1];
      const t2 = THEME_DEFINITIONS[idx2];
      return `linear-gradient(135deg, ${t1.role.borderHex.replace('0.35', '0.9')} 0%, ${t2.role.borderHex.replace('0.35', '0.9')} 100%)`;
    }
  }
  return THEME_DEFINITIONS[getThemeIndex(item)].gradient;
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
  track?: string;
  isNew?: boolean;
  isSelected: boolean;
  multiMode: boolean;
  bookmarked: boolean;
  paths: LearningPath[];
  colorIndex: number;
  onClick: () => void;
  onToggle: () => void;
  onBookmark: (e: React.MouseEvent) => void;

}> = ({ label, track, isNew, isSelected, multiMode, bookmarked, paths, colorIndex, onClick, onToggle, onBookmark }) => {
  const [hov, setHov] = useState(false);
  const matchedProgress = getRoadmapProgress(label, paths);

  // Generate a completely unique premium color for every single card using HSL
  // We use the Golden Angle (137.5 degrees) against the unique colorIndex.
  // This mathematically guarantees that no two colors will ever repeat or be too similar.
  const hue = (colorIndex * 137.508) % 360;
  
  const c = {
    bg: `hsl(${hue}, 45%, 65%)`,
    stroke: `hsl(${hue}, 55%, 25%)`,
    text: `hsl(${hue}, 55%, 15%)`
  };

  const desc = track ? `MASTER THIS PATHWAY IN ${track.toUpperCase()}` : 'CURATED ROADMAP FOR ENGINEERING EXPERTISE';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={multiMode ? onToggle : onClick}
      className="group relative flex flex-col transition-all duration-500 cursor-pointer text-left overflow-hidden bg-white w-[220px] shrink-0 h-[240px] select-none border border-slate-100"
      style={{
        boxShadow: hov ? '0 20px 40px -12px rgba(15, 23, 42, 0.12)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Top Graphic Section (Ruthlessly applied from user's code) */}
      <div 
        className="relative flex flex-col items-center justify-center p-[30px_16px_16px_16px] transition-colors duration-500 flex-1"
        style={{ backgroundColor: c.bg }}
      >
        <div className="relative border-2 border-white/70 p-[24px_12px_16px_12px] text-center w-full max-w-[340px]">
          
          {/* Lightbulb hanging above the card */}
          <div className="absolute -top-[45px] left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-[4px] h-[18px] rounded-[2px]" style={{ backgroundColor: c.stroke }} />
            <div className="w-[28px] h-[10px] rounded-[3px_3px_0_0]" style={{ backgroundColor: c.stroke }} />

            {/* SVG Lightbulb with rays */}
            <svg width="46" height="46" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="35" cy="30" r="18" fill="#f0eede" stroke={c.stroke} strokeWidth="2.5"/>
              <path d="M28 48 Q28 54 35 54 Q42 54 42 48 L40 44 L30 44 Z" fill="#f0eede" stroke={c.stroke} strokeWidth="2.5"/>
              <line x1="30" y1="54" x2="40" y2="54" stroke={c.stroke} strokeWidth="2.5"/>
              <line x1="30" y1="57" x2="40" y2="57" stroke={c.stroke} strokeWidth="2.5"/>
              <line x1="35" y1="8"  x2="35" y2="4"  stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="18" y1="14" x2="15" y2="11" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="52" y1="14" x2="55" y2="11" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="12" y1="30" x2="8"  y2="30" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="58" y1="30" x2="62" y2="30" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="18" y1="46" x2="15" y2="49" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="52" y1="46" x2="55" y2="49" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          <div 
            className="text-[13px] font-extrabold tracking-[2px] mt-2 mb-[8px] leading-snug line-clamp-2 uppercase"
            style={{ color: c.text }}
          >
            {label}
          </div>
          <hr className="border-0 border-t mb-[8px]" style={{ borderColor: `${c.text}40` }} />
          <div 
            className="text-[9px] font-bold tracking-[1.5px] leading-[1.6] uppercase line-clamp-2"
            style={{ color: c.text }}
          >
            {desc}
          </div>
        </div>

        {/* Ghost Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onBookmark(e); }}
            className={`p-1.5 rounded-full transition-all duration-300 ${bookmarked ? 'bg-white text-indigo-600 opacity-100' : 'text-white/40 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
          >
            <Bookmark size={14} fill={bookmarked ? '#4f46e5' : 'none'} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};



/* ─── MAIN DASHBOARD PAGE ─── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { paths, userProfile, byokMode, byokConfig } = useAppStore();
  const promptInputRef = useRef<HTMLInputElement>(null);

  // Engine status banner — disabled as requested
  const [showEngineBanner, setShowEngineBanner] = useState(false);
  const dismissBanner = () => {
    localStorage.setItem('vidyal_engine_banner_dismissed', 'true');
    setShowEngineBanner(false);
  };
  const isCustomMode = byokMode === 'custom' && byokConfig?.apiKey;
  const modelLabel = byokConfig?.preferredModel || byokConfig?.provider?.toUpperCase() || 'Gemini';
  const isSandbox = localStorage.getItem('vidyal_user_id') === 'sandbox-scholar';

  const [query, setQuery] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
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

  const [hybridIntent, setHybridIntent] = useState<'polymath' | 'bridge'>('polymath');

  const handleMultiBuild = () => {
    if (!selected.size) return;
    const items = Array.from(selected);
    const params = new URLSearchParams({
      goal: items.length === 1 ? items[0] : `Hybrid Path: ${items.join(' + ')}`,
      track: 'Hybrid Path',
      intent: hybridIntent,
      selectedModules: items.join(', '),
    });
    navigate(`/explore?${params.toString()}`);
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
      className="flex flex-col h-full overflow-y-auto antialiased relative classrooms-page-bg"
      style={{ background: 'transparent' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-layer {
          /* Removed dark aurora to inherit the global sky-blue ice background */
        }
        
        .jawdropping-search-bar {
          background: #ffffff !important;
          border: 1px solid rgba(78, 91, 255, 0.15) !important;
          box-shadow: 
            0 8px 30px rgba(15, 23, 42, 0.04), 
            inset 0 1px 1px rgba(255, 255, 255, 1) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        
        .jawdropping-search-bar:focus,
        .jawdropping-search-bar:focus-within {
          background: #ffffff !important;
          border-color: #6366f1 !important;
          box-shadow: 
            0 12px 40px rgba(99, 102, 241, 0.12), 
            0 0 0 4px rgba(99, 102, 241, 0.1),
            inset 0 1px 1px rgba(255, 255, 255, 1) !important;
        }

        .jawdropping-btn-glass {
          background: #ffffff !important;
          border: 1px solid rgba(15, 23, 42, 0.08) !important;
          color: #334155 !important;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03) !important;
          transition: all 0.2s ease !important;
        }

        .jawdropping-btn-glass:hover {
          background: #f8fafc !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
          color: #1e293b !important;
        }

        .jawdropping-btn-glass-active {
          background: #4e5bff !important;
          border-color: #4e5bff !important;
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
      <div className="w-full max-w-[1240px] mx-auto px-6 sm:px-10 pt-8 pb-24 z-10 relative">
        <div className="flex justify-end mb-8">
          <button
            onClick={() => { setMultiMode(v => !v); if (multiMode) setSelected(new Set()); }}
            className={`jawdropping-btn-glass flex items-center gap-2 shrink-0 ${multiMode ? 'jawdropping-btn-glass-active' : ''}`}
          >
            <CortexIcon size={12} className={multiMode ? 'text-white' : 'text-indigo-400'} />
            {multiMode ? 'Cancel Selection' : 'Multi Select'}
          </button>
        </div>

        {/* ── DYNAMIC BOOKMARKS SHELF ── */}
        {bookmarkedItems.length > 0 && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 mb-5">
              <Bookmark size={14} className="text-[#4e5bff] fill-[#4e5bff]/10" />
              <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pinned Roadmaps</h2>
              <div className="flex-1 h-px bg-slate-200/60" />
            </div>
            <div className="flex flex-wrap gap-4">
              {bookmarkedItems.map((item, idx) => (
                <RoleRoadmapCard
                  key={item.label}
                  label={item.label}
                  track={item.track}
                  isNew={item.isNew}
                  isSelected={selected.has(item.label)}
                  multiMode={multiMode}
                  bookmarked={bookmarks.has(item.label)}
                  paths={paths}
                  colorIndex={idx + 100}
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

        {/* ── Stacked Directory Mode (Graphic Card Carousel) ── */}
        <div className="space-y-12">
          {SECTIONS.map((sec, si) => (
            <div key={sec.id}>
              <div className="flex flex-col items-center text-center mb-8">
                <h2 className="text-[20px] font-black text-slate-800 leading-tight font-display tracking-tight">
                  {sec.label}
                </h2>
                <p className="text-[13px] text-slate-500 font-medium leading-normal mt-2 max-w-lg font-sans">
                  {getSectionDescription(sec.id)}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 pb-16">
                {sec.data.slice(0, 10).map((item, idx) => (
                  <RoleRoadmapCard
                    key={item.label}
                    label={item.label}
                    track={sec.track}
                    isNew={item.isNew}
                    isSelected={selected.has(item.label)}
                    multiMode={multiMode}
                    bookmarked={bookmarks.has(item.label)}
                    paths={paths}
                    colorIndex={si * 10 + idx}
                    onClick={() => {
                      setPreviewItem(item.label);
                      setPreviewTrack(sec.track);
                    }}
                    onToggle={() => toggleItem(item.label)}
                    onBookmark={e => toggleBookmark(item.label, e)}
                  />
                ))}

                {/* Ghost Card for Creating a Custom Path - Only in first section */}
                {si === 0 && (
                  <button
                    onClick={() => setCustomOpen(true)}
                    className="group flex flex-col items-center justify-center transition-all duration-100 cursor-pointer focus:outline-none overflow-hidden border border-dashed px-4 py-2.5 select-none w-[220px] shrink-0 h-[240px]"
                    style={{
                      borderColor: 'rgba(78, 91, 255, 0.4)',
                      background: 'rgba(78, 91, 255, 0.02)',
                    }}
                  >
                    <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(78, 91, 255, 0.1)' }}>
                      <Plus size={20} style={{ color: '#4e5bff' }} />
                    </div>
                    <span className="text-[13px] font-black tracking-[1.5px] uppercase" style={{ color: '#4e5bff' }}>
                      Create Custom Path
                    </span>
                    <span className="text-[10px] font-medium mt-2 text-center text-slate-500 max-w-[180px]">
                      Describe any role or technology and Cortex will build it
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
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
            className="fixed bottom-8 left-1/2 z-[100] w-full max-w-[680px] px-4"
          >
            <div
              className="flex flex-col gap-3 rounded-2xl border"
              style={{
                padding: '14px 18px',
                background: '#0d0d0d',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
            >
              {/* Top Row: Count, Recipe Pills, and Actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-mono font-black shrink-0"
                    style={{ background: 'rgba(78,91,255,0.25)', border: '1px solid rgba(78,91,255,0.45)', color: '#fff' }}
                  >
                    {selected.size}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider leading-none">Merging Recipe Stack</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 max-h-[48px] overflow-y-auto">
                      {Array.from(selected).map(item => {
                        const theme = getRoleTheme(item);
                        return (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md border text-white"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              borderColor: theme.borderHex,
                            }}
                          >
                            <span>{item}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItem(item);
                              }}
                              className="hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setSelected(new Set())} className="p-1 rounded-lg text-white/40 hover:text-white/70 transition-colors cursor-pointer" title="Clear selection">
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

              {/* Bottom Row: Learning Intent Mode Selector */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-0.5 text-[10px]">
                <span className="text-white/40 font-semibold font-mono">SYNTHESIS STRATEGY:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHybridIntent('polymath')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      hybridIntent === 'polymath'
                        ? 'bg-indigo-600/80 text-white border border-indigo-400/50'
                        : 'text-white/50 hover:text-white bg-white/5 border border-transparent'
                    }`}
                  >
                    Polymath Stack (Full Merge)
                  </button>
                  <button
                    onClick={() => setHybridIntent('bridge')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      hybridIntent === 'bridge'
                        ? 'bg-purple-600/80 text-white border border-purple-400/50'
                        : 'text-white/50 hover:text-white bg-white/5 border border-transparent'
                    }`}
                  >
                    Bridge Overlap Focus (Intersection Only)
                  </button>
                </div>
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
              const [blob1, blob2, blob3] = THEME_DEFINITIONS[getThemeIndex(previewItem || '')].blobs;
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
                      
                      // 1. Sunset Amber
                      if (l.includes('front') || l.includes('ux') || l.includes('design') || l.includes('android') || l.includes('ios') || l.includes('game')) {
                        return { primary: '#ea580c', secondary: '#f97316', bg: 'rgba(234, 88, 12, 0.03)', tint: '#fffcf9', badgeBg: 'rgba(234,88,12,0.06)', badgeBorder: 'rgba(234,88,12,0.12)', text: '#ea580c' };
                      }
                      // 2. Volcanic Rust
                      if (l.includes('rust') || l.includes('embedded') || l.includes('kernel')) {
                        return { primary: '#c2410c', secondary: '#ea580c', bg: 'rgba(194, 65, 12, 0.03)', tint: '#fffcf9', badgeBg: 'rgba(194,65,12,0.06)', badgeBorder: 'rgba(194,65,12,0.12)', text: '#c2410c' };
                      }
                      // 3. Deep Ocean
                      if (l.includes('back') || l.includes('sql') || l.includes('postgres') || l.includes('mongo') || l.includes('full stack')) {
                        return { primary: '#0284c7', secondary: '#0ea5e9', bg: 'rgba(2, 132, 199, 0.03)', tint: '#f9faff', badgeBg: 'rgba(2,132,199,0.06)', badgeBorder: 'rgba(2,132,199,0.12)', text: '#0284c7' };
                      }
                      // 4. Cyber Purple
                      if (l.includes('devops') || l.includes('cloud') || l.includes('sre') || l.includes('platform') || l.includes('network')) {
                        return { primary: '#7c3aed', secondary: '#8b5cf6', bg: 'rgba(124, 58, 237, 0.03)', tint: '#fdf9fb', badgeBg: 'rgba(124,58,237,0.06)', badgeBorder: 'rgba(124,58,237,0.12)', text: '#7c3aed' };
                      }
                      // 5. Interstellar Violet
                      if (l.includes('ai') || l.includes('machine') || l.includes('data') || l.includes('mlops') || l.includes('nlp') || l.includes('vision') || l.includes('analyst')) {
                        return { primary: '#4f46e5', secondary: '#6366f1', bg: 'rgba(79, 70, 229, 0.03)', tint: '#fcfcff', badgeBg: 'rgba(79,70,229,0.06)', badgeBorder: 'rgba(79,70,229,0.12)', text: '#4f46e5' };
                      }
                      // 6. Citron Lime
                      if (l.includes('blockchain') || l.includes('web3') || l.includes('solidity')) {
                        return { primary: '#65a30d', secondary: '#84cc16', bg: 'rgba(101, 163, 13, 0.03)', tint: '#fbfdf8', badgeBg: 'rgba(101,163,13,0.06)', badgeBorder: 'rgba(101,163,13,0.12)', text: '#65a30d' };
                      }
                      // 7. Neon Teal
                      if (l.includes('go') || l.includes('systems') || l.includes('compiler') || l.includes('c++')) {
                        return { primary: '#0d9488', secondary: '#14b8a6', bg: 'rgba(13, 148, 136, 0.03)', tint: '#f8fdfd', badgeBg: 'rgba(13,148,136,0.06)', badgeBorder: 'rgba(13,148,136,0.12)', text: '#0d9488' };
                      }
                      // 8. Emerald Mint
                      if (l.includes('architect') || l.includes('solutions') || l.includes('manager')) {
                        return { primary: '#059669', secondary: '#10b981', bg: 'rgba(5, 150, 105, 0.03)', tint: '#f8fdfb', badgeBg: 'rgba(5,150,105,0.06)', badgeBorder: 'rgba(5,150,105,0.12)', text: '#059669' };
                      }
                      // 9. Rose Gold / Sakura
                      if (l.includes('secur') || l.includes('audit') || l.includes('crypt')) {
                        return { primary: '#be123c', secondary: '#e11d48', bg: 'rgba(190, 18, 60, 0.03)', tint: '#fffbfb', badgeBg: 'rgba(190,18,60,0.06)', badgeBorder: 'rgba(190,18,60,0.12)', text: '#be123c' };
                      }
                      // 10. Charcoal Zinc
                      if (l.includes('shell') || l.includes('unix') || l.includes('linux')) {
                        return { primary: '#3f3f46', secondary: '#52525b', bg: 'rgba(63, 63, 70, 0.03)', tint: '#fafafa', badgeBg: 'rgba(63,63,70,0.06)', badgeBorder: 'rgba(63,63,70,0.12)', text: '#3f3f46' };
                      }
                      // 11. Electric Sky
                      if (l.includes('socket') || l.includes('realtime') || l.includes('serverless')) {
                        return { primary: '#0891b2', secondary: '#06b6d4', bg: 'rgba(8, 145, 178, 0.03)', tint: '#fafdfd', badgeBg: 'rgba(8,145,178,0.06)', badgeBorder: 'rgba(8,145,178,0.12)', text: '#0891b2' };
                      }
                      // 12. Fallback - Cranberry Crimson
                      if (l.includes('qa') || l.includes('test') || l.includes('cypress') || l.includes('ci/cd') || l.includes('pipeline')) {
                        return { primary: '#e11d48', secondary: '#f43f5e', bg: 'rgba(225, 29, 72, 0.03)', tint: '#fffafb', badgeBg: 'rgba(225,29,72,0.06)', badgeBorder: 'rgba(225,29,72,0.12)', text: '#e11d48' };
                      }
                      // 13. Espresso Bronze
                      if (l.includes('assembly') || l.includes('hardware') || l.includes('verilog') || l.includes('microcontroller') || l.includes('cpu')) {
                        return { primary: '#78350f', secondary: '#b45309', bg: 'rgba(120, 53, 15, 0.03)', tint: '#fffefb', badgeBg: 'rgba(120,53,15,0.06)', badgeBorder: 'rgba(120,53,15,0.12)', text: '#78350f' };
                      }
                      // 14. Neon Magenta
                      if (l.includes('graphics') || l.includes('webgl') || l.includes('opengl') || l.includes('unity') || l.includes('unreal') || l.includes('render')) {
                        return { primary: '#db2777', secondary: '#d946ef', bg: 'rgba(236, 72, 153, 0.03)', tint: '#fffbfd', badgeBg: 'rgba(236,72,153,0.06)', badgeBorder: 'rgba(236,72,153,0.12)', text: '#db2777' };
                      }
                      // 15. Midnight Navy
                      if (l.includes('distributed') || l.includes('hpc') || l.includes('parallel') || l.includes('cluster')) {
                        return { primary: '#1e3a8a', secondary: '#3b82f6', bg: 'rgba(30, 58, 138, 0.03)', tint: '#f9faff', badgeBg: 'rgba(30,58,138,0.06)', badgeBorder: 'rgba(30,58,138,0.12)', text: '#1e3a8a' };
                      }
                      // 16. Forest Moss / Sage
                      if (l.includes('writing') || l.includes('documentation') || l.includes('research') || l.includes('academic') || l.includes('scholarly')) {
                        return { primary: '#3f6212', secondary: '#4d7c0f', bg: 'rgba(63, 98, 18, 0.03)', tint: '#fafdfa', badgeBg: 'rgba(63,98,18,0.06)', badgeBorder: 'rgba(63,98,18,0.12)', text: '#3f6212' };
                      }
                      // 17. Warm Sand / Sepia
                      if (l.includes('math') || l.includes('statistics') || l.includes('algorithm') || l.includes('discrete')) {
                        return { primary: '#b45309', secondary: '#d97706', bg: 'rgba(180, 83, 9, 0.03)', tint: '#fffef9', badgeBg: 'rgba(180,83,9,0.06)', badgeBorder: 'rgba(180,83,9,0.12)', text: '#b45309' };
                      }
                      // 18. Metallic Platinum / Silver
                      return { primary: '#475569', secondary: '#64748b', bg: 'rgba(100, 116, 139, 0.03)', tint: '#fafbfc', badgeBg: 'rgba(100,116,139,0.06)', badgeBorder: 'rgba(100,116,139,0.12)', text: '#475569' };
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
                        <div className="px-8 pb-5 pt-3 shrink-0 relative z-10 border-b border-slate-100 mb-2">
                          <div className="flex items-center gap-4 relative z-10">
                            {/* Academic Book icon wrapper */}
                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center text-[#4e5bff]">
                              <BookOpen size={20} />
                            </div>

                            {/* Course identity */}
                            <div className="min-w-0 flex-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-1.5" style={{ background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}>
                                <span className="text-[7.5px] font-black uppercase tracking-[0.2em]" style={{ color: theme.text }}>Curriculum</span>
                              </div>
                              <h2 className="text-[17px] font-serif font-black leading-snug text-slate-900">{previewData.title}</h2>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap font-mono text-[9.5px] text-slate-400">
                                <span>{totalModulesCount} Modules</span>
                                <span>·</span>
                                <span>{previewData.phases.length} Chapters</span>
                                <span>·</span>
                                <span style={{ color: theme.text }} className="font-bold">{selectedCount} Selected</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── MODULE LIST ── */}
                        <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6 custom-scrollbar select-none">
                          {previewData.phases.map((phase, pIdx) => (
                            <div key={pIdx}>
                              {/* Phase header */}
                              <div className="flex items-baseline justify-between border-b border-slate-100 pb-2 mb-4">
                                <h4 className="text-[13px] font-black text-slate-800 tracking-tight font-serif">
                                  Chapter {pIdx + 1}: {phase.title}
                                </h4>
                              </div>

                              {/* Module Contents Listing */}
                              <div className="space-y-2.5 pl-2">
                                {phase.modules.map((m, mIdx) => {
                                  const isChecked = !!selectedPreviewModules[m.title];
                                  const estimateMin = 30 + ((m.title.length * 7) % 6) * 10;

                                  return (
                                    <button
                                      key={mIdx}
                                      type="button"
                                      onClick={() => setSelectedPreviewModules(prev => ({ ...prev, [m.title]: !isChecked }))}
                                      className="w-full flex items-baseline justify-between py-0.5 text-[12.5px] transition-colors text-left focus:outline-none cursor-pointer group"
                                    >
                                      {/* Module Prefix & Title */}
                                      <div className="flex items-baseline gap-2 min-w-0 max-w-[80%] shrink-0">
                                        <span className="text-[10px] font-bold font-mono tracking-tight text-slate-400 shrink-0 font-sans">
                                          {pIdx + 1}.{mIdx + 1}
                                        </span>
                                        <span className={`font-medium truncate transition-colors duration-200 ${
                                          isChecked ? 'text-slate-800' : 'text-slate-350 line-through'
                                        }`}>
                                          {m.title}
                                        </span>
                                      </div>

                                      {/* Dotted Line Leader */}
                                      <div className="flex-1 border-b border-dotted border-slate-200 mx-2.5 min-w-[20px] self-center" />

                                      {/* Duration & Selection Mark */}
                                      <div className="flex items-center gap-3.5 shrink-0 font-mono text-[10px] text-slate-450">
                                        <span>{estimateMin}m</span>
                                        <span className={`font-mono text-[9.5px] font-black uppercase tracking-wider ${
                                          isChecked ? 'text-[#4e5bff]' : 'text-slate-300'
                                        }`}>
                                          {isChecked ? 'Include' : 'Skip'}
                                        </span>
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
                  const panelGradient = getPreviewGradient(previewItem || '');

                  // ── Visual art component per identity ──
                  const renderArt = () => {

                    // ─ ESPRESSO BRONZE → Microprocessor registers visualization ─
                    if (l.includes('assembly') || l.includes('hardware') || l.includes('verilog') || l.includes('microcontroller') || l.includes('cpu')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#1c1007' }}>
                            <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#2c190b' }}>
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-700" />
                              <span className="ml-2 text-[8px] font-mono text-amber-500/80">CPU_Registers.s</span>
                            </div>
                            <div className="px-4 py-4 font-mono text-[8px] leading-[1.8] space-y-2">
                              <div className="flex items-center justify-between border-b border-amber-900/30 pb-1">
                                <span className="text-amber-500 font-bold">REG</span>
                                <span className="text-amber-500/50">VALUE</span>
                              </div>
                              {[
                                { reg: 'RAX', val: '0x002B4FA9' },
                                { reg: 'RBX', val: '0x00000001' },
                                { reg: 'RCX', val: '0x7FFF08C2' },
                                { reg: 'RDX', val: '0x00FF8E1D' }
                              ].map((r, i) => (
                                <div key={i} className="flex justify-between items-center text-[7.5px]">
                                  <span className="text-amber-400 font-bold">{r.reg}</span>
                                  <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                                    className="text-amber-300/80 font-semibold"
                                  >
                                    {r.val}
                                  </motion.span>
                                </div>
                              ))}
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#2c190b' }}>
                                <span className="text-[7px] font-mono text-amber-500/40">SYS_CLOCK</span>
                                <span className="text-[7.5px] font-mono text-amber-400 font-bold animate-pulse">4.20 GHz</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ NEON MAGENTA → Wireframe spinning 3D cube ─
                    if (l.includes('graphics') || l.includes('webgl') || l.includes('opengl') || l.includes('unity') || l.includes('unreal') || l.includes('render')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#190412' }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#29061e' }}>
                              <span className="text-[8px] font-mono text-pink-400 font-black">Renderer · OpenGL</span>
                              <span className="text-[7px] font-mono text-pink-400/50 animate-pulse">60 FPS</span>
                            </div>
                            <div className="h-[145px] flex items-center justify-center relative overflow-hidden">
                              <motion.svg
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                viewBox="0 0 100 100"
                                className="w-24 h-24 stroke-pink-500 stroke-[1.2] fill-none"
                              >
                                <polygon points="30,30 70,30 70,70 30,70" />
                                <polygon points="45,45 85,45 85,85 45,85" />
                                <line x1="30" y1="30" x2="45" y2="45" />
                                <line x1="70" y1="30" x2="85" y2="45" />
                                <line x1="70" y1="70" x2="85" y2="85" />
                                <line x1="30" y1="70" x2="45" y2="85" />
                              </motion.svg>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#29061e' }}>
                                <span className="text-[7px] font-mono text-pink-500/40">VRAM_USED</span>
                                <span className="text-[7.5px] font-mono text-pink-400 font-bold">2.4 / 8.0 GB</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ MIDNIGHT NAVY → Distributed cluster messages flow ─
                    if (l.includes('distributed') || l.includes('hpc') || l.includes('parallel') || l.includes('cluster')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#020718' }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#071131' }}>
                              <span className="text-[8px] font-mono text-blue-400 font-bold">Consensus Shelf · Raft</span>
                              <span className="px-1.5 py-0.5 rounded text-[6px] font-mono font-black bg-blue-500/10 text-blue-400">LEADER</span>
                            </div>
                            <div className="h-[145px] relative">
                              <svg viewBox="0 0 200 120" className="w-full h-full">
                                <line x1="100" y1="20" x2="50" y2="80" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="3 3" />
                                <line x1="100" y1="20" x2="150" y2="80" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="3 3" />
                                
                                <motion.circle
                                  animate={{ cx: [100, 50], cy: [20, 80] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                  r="3"
                                  fill="#60a5fa"
                                />
                                <motion.circle
                                  animate={{ cx: [100, 150], cy: [20, 80] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                  r="3"
                                  fill="#60a5fa"
                                />
                                
                                <rect x="80" y="8" width="40" height="20" rx="4" fill="#1e3a8a" stroke="#3b82f6" />
                                <text x="100" y="20" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold">Leader</text>
                
                                <rect x="30" y="78" width="40" height="20" rx="4" fill="#0c1d4a" stroke="#1d4ed8" />
                                <text x="50" y="90" textAnchor="middle" fill="#93c5fd" fontSize="6">Follower 1</text>
                
                                <rect x="130" y="78" width="40" height="20" rx="4" fill="#0c1d4a" stroke="#1d4ed8" />
                                <text x="150" y="90" textAnchor="middle" fill="#93c5fd" fontSize="6">Follower 2</text>
                              </svg>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#071131' }}>
                                <span className="text-[7px] font-mono text-blue-400/40">TERM_INDEX</span>
                                <span className="text-[7.5px] font-mono text-blue-400 font-bold">Term 204</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ FOREST MOSS / SAGE → Markdown notebook typing line guide ─
                    if (l.includes('writing') || l.includes('documentation') || l.includes('research') || l.includes('academic') || l.includes('scholarly')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#08140a' }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#0f2918' }}>
                              <span className="text-[8px] font-mono text-lime-400 font-bold">Manuscript · Guide.md</span>
                              <span className="text-[7px] font-mono text-lime-400/50">Draft</span>
                            </div>
                            <div className="px-4 py-4 space-y-2">
                              <div className="text-[10px] text-lime-300 font-serif italic border-b border-lime-900/30 pb-1">
                                Chapter I: Foundations
                              </div>
                              <div className="space-y-1.5 py-1">
                                {[85, 95, 60, 80].map((w, idx) => (
                                  <div key={idx} className="h-1 rounded" style={{ background: 'rgba(163,230,53,0.12)', width: `${w}%` }}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: '100%' }}
                                      transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', delay: idx * 0.2 }}
                                      className="h-full bg-lime-500/30 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="text-[7.5px] text-lime-400/40 leading-relaxed font-sans mt-2">
                                "Writing is the mechanism through which complex cognitive schemas are cataloged, organized, and shared."
                              </div>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#0f2918' }}>
                                <span className="text-[7px] font-mono text-lime-500/40">WORD_COUNT</span>
                                <span className="text-[7.5px] font-mono text-lime-400 font-bold">1,824 words</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ WARM SAND / SEPIA → Animated sorting bars ─
                    if (l.includes('math') || l.includes('statistics') || l.includes('algorithm') || l.includes('discrete')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#1c1208' }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#2c1c0c' }}>
                              <span className="text-[8px] font-mono text-amber-500 font-bold">Algorithm · QuickSort</span>
                              <span className="text-[7px] font-mono text-amber-400/50">O(n log n)</span>
                            </div>
                            <div className="h-[135px] flex items-end justify-center gap-2 px-6 pb-4">
                              {[25, 45, 15, 75, 55, 95, 35, 65].map((val, idx) => (
                                <div key={idx} className="flex-1 rounded-t bg-amber-900/30" style={{ height: '100%' }}>
                                  <motion.div
                                    animate={{ height: [`${val}%`, `${(val * 1.5) % 100}%`, `${val}%`] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.15 }}
                                    className="w-full bg-amber-500 rounded-t"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#2c1c0c' }}>
                                <span className="text-[7px] font-mono text-amber-500/40">COMPLEXITY</span>
                                <span className="text-[7.5px] font-mono text-amber-400 font-bold">Stable</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ─ METALLIC PLATINUM / SILVER → Bloch Sphere vector rotation ─
                    if (l.includes('quantum') || l.includes('deep tech') || l.includes('physics')) {
                      return (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                          <div className="absolute w-[255px] h-[285px] rounded-2xl bg-white/10 rotate-3 translate-x-5 translate-y-4 backdrop-blur-sm" />
                          <div className="relative w-[255px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.50)] -rotate-1" style={{ background: '#131924' }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#20293a' }}>
                              <span className="text-[8px] font-mono text-slate-400 font-bold">Qubit Phase · Bloch Sphere</span>
                              <span className="text-[7px] font-mono text-slate-400/50">Ψ State</span>
                            </div>
                            <div className="h-[145px] flex items-center justify-center relative">
                              <div className="w-20 h-20 rounded-full border border-slate-700/50 relative flex items-center justify-center">
                                <div className="absolute w-20 h-5 rounded-full border border-slate-700/40 border-dashed" />
                                <div className="absolute w-5 h-20 rounded-full border border-slate-700/40 border-dashed" />
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                                  className="absolute w-10 h-0.5 bg-gradient-to-r from-slate-400 to-transparent origin-left"
                                  style={{ left: '50%' }}
                                />
                                <span className="absolute top-1 text-[6px] font-mono text-slate-500">|0⟩</span>
                                <span className="absolute bottom-1 text-[6px] font-mono text-slate-500">|1⟩</span>
                              </div>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#20293a' }}>
                                <span className="text-[7px] font-mono text-slate-550">COHERENCE</span>
                                <span className="text-[7.5px] font-mono text-slate-400 font-bold">99.98%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

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
                  const backGradient = getPreviewGradient(previewItem || '');

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

      <CustomModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSubmit={v => { setCustomOpen(false); navigate(`/explore?${new URLSearchParams({ goal: v, track: 'Custom Path' })}`); }}
      />
    </div>
  );
};

export default Dashboard;

const CustomModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (goal: string) => void;
}> = ({ open, onClose, onSubmit }) => {
  const [val, setVal] = useState('');
  
  useEffect(() => {
    if (open) setVal('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl w-full max-w-[440px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">
        <div className="p-8 pb-6 relative text-center">
          <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-slate-50 p-2 rounded-full hover:bg-slate-100">
            <X size={16} />
          </button>
          <h3 className="text-[20px] font-black text-slate-800 tracking-tight">Synthesize Custom Path</h3>
          <p className="text-[13px] text-slate-400 mt-2 font-medium max-w-xs mx-auto">
            Combine any roles, tech stacks, or skills.
          </p>
        </div>
        
        <div className="px-8 pb-8">
          <textarea
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="e.g. Next.js, Node.js, and AWS"
            className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 text-[15px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#4e5bff]/40 focus:ring-4 focus:ring-[#4e5bff]/10 transition-all min-h-[120px] resize-none"
            autoFocus
          />
          
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => val.trim() && onSubmit(val.trim())}
              disabled={!val.trim()}
              className="w-full py-4 rounded-2xl text-[14px] font-bold text-white bg-[#4e5bff] hover:bg-[#3b47db] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              Synthesize
            </button>
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
