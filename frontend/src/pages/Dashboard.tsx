import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Bookmark, Sparkles, ArrowRight,
  Flame, BookOpen, Compass, Play, Layers, Globe, Terminal,
  Database, Brain, Shield, GitBranch, Target, Check,
  Clock, BarChart2, Cpu
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { LearningPath } from '../types';
import { roadmapPreviews, RoadmapPreview } from './roadmapPreviews';

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
  { label: 'Frontend' }, { label: 'Backend' }, { label: 'Full Stack' },
  { label: 'DevOps' }, { label: 'DevSecOps' }, { label: 'Data Analyst' },
  { label: 'AI Engineer' }, { label: 'AI and Data Scientist' }, { label: 'Data Engineer' },
  { label: 'Android' }, { label: 'Machine Learning' }, { label: 'PostgreSQL' },
  { label: 'iOS' }, { label: 'Blockchain' }, { label: 'QA' },
  { label: 'Software Architect' }, { label: 'Cyber Security' }, { label: 'UX Design' },
  { label: 'Technical Writer' }, { label: 'Game Developer' }, { label: 'Server Side Game Developer' },
  { label: 'MLOps' }, { label: 'Product Manager' }, { label: 'Engineering Manager' },
  { label: 'Developer Relations' }, { label: 'BI Analyst' }, { label: 'Network Engineer', isNew: true },
  { label: 'Cloud Architect', isNew: true }, { label: 'Site Reliability Engineer' },
  { label: 'Platform Engineer', isNew: true }, { label: 'Staff Engineer', isNew: true },
  { label: 'Solutions Architect' }, { label: 'Embedded Systems Engineer' },
  { label: 'Security Engineer' }, { label: 'Penetration Tester' },
  { label: 'AR / VR Developer', isNew: true }, { label: 'Computer Vision Engineer', isNew: true },
  { label: 'NLP Engineer', isNew: true }, { label: 'Web3 Developer', isNew: true },
  { label: 'Open Source Maintainer', isNew: true },
];

const skillRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'SQL' }, { label: 'Computer Science' }, { label: 'React' },
  { label: 'Vue' }, { label: 'Angular' }, { label: 'JavaScript' },
  { label: 'TypeScript' }, { label: 'Node.js' }, { label: 'Python' },
  { label: 'System Design' }, { label: 'Java' }, { label: 'ASP.NET Core' },
  { label: 'API Design' }, { label: 'Spring Boot' }, { label: 'Flutter' },
  { label: 'C++' }, { label: 'Rust' }, { label: 'Go' },
  { label: 'GraphQL' }, { label: 'React Native' }, { label: 'Design System' },
  { label: 'Prompt Engineering' }, { label: 'MongoDB' }, { label: 'Linux' },
  { label: 'Kubernetes' }, { label: 'Docker' }, { label: 'AWS' },
  { label: 'Terraform' }, { label: 'Data Structures & Algorithms' }, { label: 'Redis' },
  { label: 'Git and GitHub' }, { label: 'Next.js' }, { label: 'HTML' },
  { label: 'CSS' }, { label: 'Shell / Bash' },
  { label: 'AI Agents', isNew: true }, { label: 'AI Red Teaming', isNew: true },
];

const bestPractices: { label: string; isNew?: boolean }[] = [
  { label: 'AWS' }, { label: 'API Security' }, { label: 'Web Application Security' },
  { label: 'Zero Trust Architecture' }, { label: 'Cloud Security' },
  { label: 'Backend Performance' }, { label: 'Frontend Performance' },
  { label: 'Database Optimization' }, { label: 'Caching Strategies' }, { label: 'Load Testing' },
  { label: 'Code Review' }, { label: 'Testing Strategy' },
  { label: 'Technical Debt Management' }, { label: 'Documentation Standards' },
];

const SECTIONS = [
  { id: 'role',  label: 'Role Roadmaps',         data: roleRoadmaps,  track: 'Role Roadmap'   },
  { id: 'skill', label: 'Skill Roadmaps',        data: skillRoadmaps, track: 'Skill Roadmap'  },
  { id: 'best',  label: 'Best Practices',         data: bestPractices, track: 'Best Practices' },
] as const;

/* ─── Interactive Neural Constellation HUD ─── */
const MiniNeuralMap: React.FC<{
  paths: LearningPath[];
  onNavigate: (pathId: string, phaseId: string, moduleId: string) => void
}> = ({ paths, onNavigate }) => {
  const path = paths[0];
  if (!path) return null;

  // Flatten and filter up to 4 nodes
  const nodes: { id: string; phaseId: string; title: string; status: 'completed' | 'active' | 'locked'; x: number; y: number }[] = [];
  let activeFound = false;

  let totalIndex = 0;
  for (const phase of (path.phases || [])) {
    for (const mod of phase.modules) {
      if (totalIndex >= 4) break;

      let status: 'completed' | 'active' | 'locked' = 'locked';
      if (mod.isCompleted) {
        status = 'completed';
      } else if (!activeFound) {
        status = 'active';
        activeFound = true;
      }

      const x = 70 + totalIndex * 140;
      const y = 50 + (totalIndex % 2 === 0 ? -16 : 16);

      nodes.push({
        id: mod.id,
        phaseId: phase.id,
        title: mod.title,
        status,
        x,
        y
      });
      totalIndex++;
    }
  }

  if (nodes.length === 0) return null;
  const activeNode = nodes.find(n => n.status === 'active') || nodes.find(n => n.status === 'completed');

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-slate-900 shadow-inner p-4.5 relative mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[#4e5bff] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Interactive Mind Map &middot; {path.title}
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Constellation Sync</span>
      </div>

      <div className="relative overflow-x-auto scrollbar-none py-2">
        <div className="relative min-w-[620px] h-[100px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="neuralLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4e5bff" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#886cff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4e5bff" stopOpacity="0.15" />
              </linearGradient>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4e5bff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4e5bff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Faint blueprint Grid lines */}
            <g opacity="0.06">
              <line x1="0" y1="20" x2="100%" y2="20" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="0" y1="50" x2="100%" y2="50" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="0" y1="80" x2="100%" y2="80" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="100" y1="0" x2="100" y2="100%" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="240" y1="0" x2="240" y2="100%" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="380" y1="0" x2="380" y2="100%" stroke="#4e5bff" strokeWidth="0.8" />
              <line x1="520" y1="0" x2="520" y2="100%" stroke="#4e5bff" strokeWidth="0.8" />
            </g>

            {/* Ambient Starfield nodes scattered in background */}
            {[
              { cx: 30, cy: 20, r: 1 },
              { cx: 120, cy: 80, r: 1.5 },
              { cx: 220, cy: 15, r: 1 },
              { cx: 280, cy: 85, r: 2 },
              { cx: 380, cy: 25, r: 1 },
              { cx: 420, cy: 75, r: 1.5 },
              { cx: 520, cy: 30, r: 1 },
              { cx: 580, cy: 80, r: 1.2 },
            ].map((star, sidx) => (
              <circle
                key={sidx}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="#ffffff"
                className="constellation-star"
                style={{ animationDelay: `${sidx * 0.4}s` }}
              />
            ))}

            {/* Glowing orbits centered on active node */}
            {activeNode && (
              <g>
                <circle
                  cx={activeNode.x}
                  cy={activeNode.y}
                  r="22"
                  fill="none"
                  stroke="#4e5bff"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  className="rotating-orbit-border opacity-50"
                />
                <circle
                  cx={activeNode.x}
                  cy={activeNode.y}
                  r="32"
                  fill="none"
                  stroke="#886cff"
                  strokeWidth="0.8"
                  strokeDasharray="6 3"
                  className="rotating-orbit-reverse opacity-35"
                />
                <circle
                  cx={activeNode.x}
                  cy={activeNode.y}
                  r="45"
                  fill="url(#nodeGlow)"
                  className="animate-pulse-slow"
                />
              </g>
            )}

            {/* Draw connection lines dynamically using Framer Motion */}
            {nodes.map((node, idx) => {
              if (idx === 0) return null;
              const prev = nodes[idx - 1];
              const isGlowingLink = (node.status === 'completed' || node.status === 'active') && (prev.status === 'completed');
              return (
                <motion.line
                  key={idx}
                  x1={prev.x}
                  y1={prev.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={isGlowingLink ? 'url(#neuralLineGrad)' : '#1e293b'}
                  strokeWidth={2.4}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isGlowingLink ? 1.0 : 0.4 }}
                  transition={{ duration: 0.9, delay: idx * 0.12, ease: 'easeInOut' }}
                  strokeDasharray={node.status === 'locked' ? '4 4' : 'none'}
                />
              );
            })}
          </svg>

          {/* Node Dot Nodes */}
          {nodes.map((node) => {
            const isCompleted = node.status === 'completed';
            const isActive = node.status === 'active';

            return (
              <div
                key={node.id}
                onClick={() => onNavigate(path.id, node.phaseId, node.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center group"
                style={{ left: node.x, top: node.y }}
              >
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <span className="absolute w-8 h-8 rounded-full bg-[#4e5bff]/25 animate-ping" />
                  )}
                  {isCompleted && (
                    <span className="absolute w-7 h-7 rounded-full bg-emerald-500/10" />
                  )}

                  <div
                    className={`w-4 h-4 rounded-full border-[2.5px] transition-all duration-200 flex items-center justify-center shadow ${
                      isCompleted
                        ? 'bg-emerald-500 border-white text-white'
                        : isActive
                          ? 'bg-[#4e5bff] border-white text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                    } group-hover:scale-110`}
                  >
                    {isCompleted && <Check size={8} strokeWidth={4} />}
                  </div>
                </div>

                <div className="absolute top-5 w-[130px] text-center flex flex-col items-center pointer-events-none">
                  <p className={`text-[10px] font-black leading-tight tracking-tight truncate max-w-[120px] transition-colors ${
                    isActive ? 'text-[#4e5bff] font-black' : isCompleted ? 'text-slate-350' : 'text-slate-500'
                  }`}>
                    {node.title}
                  </p>
                  <span className={`text-[7.5px] font-extrabold uppercase tracking-widest mt-0.5 px-1 py-0.25 rounded font-mono ${
                    isCompleted
                      ? 'text-emerald-500 bg-emerald-500/5'
                      : isActive
                        ? 'text-[#4e5bff] bg-[#4e5bff]/5 animate-pulse'
                        : 'text-slate-600'
                  }`}>
                    {node.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Rich descriptive Role-based Roadmap Card (roadmap.sh style) ─── */
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
  const Icon = getRoadmapIcon(label);
  const matchedProgress = getRoadmapProgress(label, paths);
  const desc = ROLE_DESCRIPTIONS[label] || `Comprehensive guide to mastering the fundamentals and advanced topics of ${label}.`;
  const theme = getRoleTheme(label);

  return (
    <motion.div
      whileHover={{ y: -3.5 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={multiMode ? onToggle : onClick}
      className={`group relative flex flex-col justify-between p-4.5 rounded-xl border transition-all duration-200 cursor-pointer text-left h-full shimmer-sweep-wrapper ${theme.border}`}
      style={{
        background: isSelected ? 'rgba(78, 91, 255, 0.04)' : hov ? theme.glow : '#ffffff',
        borderColor: isSelected ? theme.borderHex : hov ? theme.hoverBorderHex : '#e2e8f0',
        boxShadow: hov ? `0 12px 28px -6px ${theme.glow}` : 'none',
      }}
    >
      <div className="shimmer-sweep" />
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className={`p-2 rounded-xl transition-all duration-300 shrink-0 ${
            isSelected ? theme.activeIconBg : hov ? theme.activeIconBg : theme.iconBg
          } ${hov ? 'scale-110 rotate-3 shadow-sm' : 'scale-100'}`}>
            <Icon size={16} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isNew && !multiMode && (
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${theme.tagColor}`}>
                New
              </span>
            )}

            {multiMode ? (
              <div style={{
                width: 14, height: 14, borderRadius: 4,
                background: isSelected ? '#4e5bff' : 'transparent',
                border: `1.5px solid ${isSelected ? '#4e5bff' : '#cbd5e1'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ) : (
              <button
                onClick={onBookmark}
                className={`transition-opacity duration-150 p-1 rounded-md hover:bg-slate-100 ${
                  bookmarked ? 'opacity-100 text-[#4e5bff]' : 'opacity-0 group-hover:opacity-100 text-slate-400'
                }`}
              >
                <Bookmark size={12} fill={bookmarked ? '#4e5bff' : 'none'} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        <h3
          className="text-[13.5px] font-black text-slate-800 leading-snug transition-colors font-display"
          style={{ color: hov ? theme.textHoverColor : '#1e293b' }}
        >
          {label}
        </h3>

        <p className="text-[11px] text-slate-455 font-medium leading-relaxed mt-1.5 mb-3.5 font-sans">
          {desc}
        </p>
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100/50 flex items-center justify-between">
        {matchedProgress !== null ? (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${theme.barColor}`} style={{ width: `${matchedProgress}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-700 font-mono shrink-0">{matchedProgress}%</span>
          </div>
        ) : (
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1"
            style={{ color: hov ? theme.textHoverColor : '#475569' }}
          >
            Explore Path <ArrowRight size={10} strokeWidth={2.5} />
          </span>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Compact Roadmap Card Component (for Skills & Best Practices) ─── */
const CompactRoadmapCard: React.FC<{
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
  const Icon = getRoadmapIcon(label);
  const matchedProgress = getRoadmapProgress(label, paths);
  const theme = getSkillTheme(label);

  return (
    <motion.button
      onClick={multiMode ? onToggle : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileHover={{ y: -1.5 }}
      className="group relative flex items-center justify-between text-left w-full rounded-xl transition-all duration-200 cursor-pointer focus:outline-none shimmer-sweep-wrapper"
      style={{
        padding: '10px 12px',
        background: isSelected ? 'rgba(78, 91, 255, 0.04)' : hov ? theme.glow : '#ffffff',
        border: `1px solid ${
          isSelected ? theme.borderHex : hov ? theme.hoverBorderHex : '#e2e8f0'
        }`,
        boxShadow: isSelected ? '0 2px 8px rgba(78, 91, 255, 0.04)' : hov ? `0 6px 16px ${theme.glow}` : 'none',
      }}
    >
      <div className="shimmer-sweep" />
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-1.5 rounded-lg transition-all duration-300 shrink-0 ${
          isSelected ? 'bg-[#4e5bff]/10 text-[#4e5bff]' : hov ? theme.iconBg : 'bg-slate-50 text-slate-400'
        } ${hov ? 'scale-110 rotate-2' : ''}`}>
          <Icon size={14} />
        </div>

        <div className="min-w-0">
          <span
            className="text-[12.5px] font-bold leading-none tracking-tight block truncate transition-colors duration-200"
            style={{
              color: isSelected ? '#4e5bff' : hov ? theme.textHoverColor : '#475569',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {label}
          </span>

          {matchedProgress !== null && (
            <span className={`text-[9.5px] font-bold mt-0.5 inline-flex items-center gap-1 ${
              matchedProgress === 100 ? 'text-emerald-600' : 'text-[#4e5bff]'
            }`}>
              {matchedProgress === 100 ? (
                <>
                  <Check size={9} strokeWidth={3} />
                  <span>Mastered</span>
                </>
              ) : (
                <span>{matchedProgress}% Complete</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {isNew && !multiMode && (
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
            color: '#4e5bff', background: 'rgba(78, 91, 255, 0.08)',
            border: '1px solid rgba(78, 91, 255, 0.15)', borderRadius: 4, padding: '1px 4px',
          }}>New</span>
        )}

        {multiMode ? (
          <div style={{
            width: 14, height: 14, borderRadius: 4, flexShrink: 0,
            background: isSelected ? '#4e5bff' : 'transparent',
            border: `1.5px solid ${isSelected ? '#4e5bff' : '#cbd5e1'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ) : (
          <button
            onClick={onBookmark}
            className={`transition-opacity duration-150 p-0.5 rounded ${
              bookmarked ? 'opacity-100 text-[#4e5bff]' : 'opacity-0 group-hover:opacity-100 text-slate-400'
            }`}
          >
            <Bookmark size={11} fill={bookmarked ? '#4e5bff' : 'none'} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </motion.button>
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
    skillRoadmaps.forEach(item => {
      if (bookmarks.has(item.label)) {
        list.push({ ...item, track: 'Skill Roadmap' });
      }
    });
    bestPractices.forEach(item => {
      if (bookmarks.has(item.label)) {
        list.push({ ...item, track: 'Best Practices' });
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
      {/* ── Engine Status Banner ── */}
      {showEngineBanner && (
        <div
          className="w-full max-w-[1060px] mx-auto px-6 sm:px-10 pt-4 z-20 relative"
          style={{ animationFillMode: 'both' }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-[11.5px] font-semibold"
            style={{
              background: isSandbox
                ? 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)'
                : isCustomMode
                  ? 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)'
                  : 'linear-gradient(90deg, rgba(78,91,255,0.08) 0%, rgba(139,92,246,0.06) 100%)',
              border: isSandbox
                ? '1px solid rgba(124,58,237,0.2)'
                : isCustomMode ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(78,91,255,0.18)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px]">{isSandbox ? '🛠️' : isCustomMode ? '🔓' : '⚡'}</span>
              {isSandbox ? (
                <span className="text-violet-700">
                  Running in Developer Sandbox · Connected to system API key — all synthesis operations fully unlocked
                </span>
              ) : isCustomMode ? (
                <span className="text-emerald-700">
                  Running on your personal key · <span className="font-black">{modelLabel}</span>
                  <span className="text-emerald-600/60 font-normal ml-1">— full quota, private usage</span>
                </span>
              ) : (
                <span className="text-indigo-700">
                  Running on shared system key · <span className="font-black">Gemini 1.5 Flash</span>
                  <span className="text-indigo-600/60 font-normal ml-1">— add your own key for unlimited access</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!isSandbox && !isCustomMode && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
                >
                  Add my key →
                </button>
              )}
              <button
                onClick={dismissBanner}
                className="text-slate-400 hover:text-slate-600 transition-colors text-[15px] leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Stardust Nebulas Overlay ── */}
      <div className="absolute top-0 left-0 right-0 h-[450px] overflow-hidden pointer-events-none z-0">
        <div className="stardust-glow-blob stardust-blob-1 -top-16 -left-12" />
        <div className="stardust-glow-blob stardust-blob-2 -top-28 -right-16" />
      </div>

      <div className="w-full max-w-[1060px] mx-auto px-6 sm:px-10 pt-12 pb-24 z-10 relative">

        <div className="text-center mb-10 text-white">
          <div className="flex items-center justify-center gap-2 text-white/55 text-[11px] font-bold uppercase tracking-widest mb-3">
            <span>Cortex</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff]" />
            <span>Learning Engine</span>
          </div>

          <h1 className="jawdropping-header-title text-3xl sm:text-4xl">
            Developer Roadmaps
          </h1>

          <p className="jawdropping-header-subtitle max-w-[580px] mx-auto mt-2.5">
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
                className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-white placeholder-light-translucent"
                style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
              />

              {!query && (
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] font-bold text-white/40 font-mono select-none pointer-events-none shrink-0">
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
                    <button onClick={() => { setQuery(''); setPromptInput(''); }} className="text-white/40 hover:text-white/70 p-1 rounded-lg">
                      <X size={13} />
                    </button>
                    <button
                      onClick={handlePromptSubmit}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4e5bff] hover:bg-[#5c68ff] text-white rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles size={9} /> Build Path
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { setMultiMode(v => !v); if (multiMode) setSelected(new Set()); }}
              className={`jawdropping-btn-glass flex items-center gap-2 shrink-0 ${multiMode ? 'jawdropping-btn-glass-active' : ''}`}
            >
              <Sparkles size={12} />
              {multiMode ? 'Cancel Selection' : 'Hybrid Select'}
            </button>
          </div>

          {!query && (
            <div className="flex flex-wrap gap-2 items-center justify-center mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.14em] mr-0.5">Suggestions:</span>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setPromptInput(s); promptInputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full bg-white/10 border border-white/28 hover:border-white/45 hover:bg-white/18 text-[10.5px] font-semibold text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-sm"
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
          {/* 1. INTERACTIVE NEURAL CONSTELLATION HUD */}
          {activePaths.length > 0 && !query && (
            <div className="mb-10">
              <MiniNeuralMap paths={activePaths} onNavigate={handleSvgNavigation} />
            </div>
          )}

          {/* 2. DYNAMIC BOOKMARKS SHELF (Top of catalog) */}
          {bookmarkedItems.length > 0 && !query && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <Bookmark size={14} className="text-[#4e5bff] fill-[#4e5bff]/10" />
                <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pinned Roadmaps</h2>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {bookmarkedItems.map(item => {
                  const isRole = item.track === 'Role Roadmap';
                  return isRole ? (
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
                  ) : (
                    <CompactRoadmapCard
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
                  );
                })}
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

                    {sec.id === 'role' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {sec.items.map(item => (
                          <CompactRoadmapCard
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
                    )}
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
                  <Sparkles size={11} /> Build custom path
                </button>
              </div>
            )
          ) : (
            // Stacked Directory Mode (roadmap.sh style)
            <div className="space-y-12">

              {/* SECTION 1: ROLE ROADMAPS */}
              <div>
                <div className="mb-5">
                  <h2 className="text-[17px] font-black text-slate-800 leading-none font-display">
                    Role Roadmaps
                  </h2>
                  <p className="text-[11.5px] text-slate-450 font-medium leading-normal mt-1.5 font-sans">
                    Structured, step-by-step career path guides for Frontend, Backend, DevOps, and specialized domains.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5">
                  {roleRoadmaps.map(item => (
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
                        setPreviewTrack('Role Roadmap');
                      }}
                      onToggle={() => toggleItem(item.label)}
                      onBookmark={e => toggleBookmark(item.label, e)}
                    />
                  ))}

                  {/* Custom pathway generator card */}
                  {!multiMode && (
                    <button
                      onClick={() => {
                        promptInputRef.current?.focus();
                        promptInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="group flex flex-col items-center justify-center p-5 rounded-xl transition-all duration-155 cursor-pointer focus:outline-none min-h-[145px]"
                      style={{
                        background: 'rgba(78, 91, 255, 0.01)',
                        border: '1px dashed rgba(78, 91, 255, 0.2)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.35)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.01)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.2)';
                      }}
                    >
                      <Plus size={15} strokeWidth={2.5} style={{ color: '#4e5bff', flexShrink: 0 }} />
                      <span className="text-[12.5px] font-black mt-2" style={{ color: '#4e5bff', fontFamily: "'Inter', sans-serif" }}>
                        Synthesize Custom Path
                      </span>
                      <span className="text-[9.5px] text-slate-400 mt-1 text-center font-medium max-w-[150px] leading-normal font-sans">
                        Describe any technical stack in the command input above
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 2: SKILL ROADMAPS */}
              <div>
                <div className="mb-5 border-t border-slate-100 pt-8">
                  <h2 className="text-[17px] font-black text-slate-800 leading-none font-display">
                    Skill Roadmaps
                  </h2>
                  <p className="text-[11.5px] text-slate-450 font-medium leading-normal mt-1.5 font-sans">
                    Focused mini-guides covering specific programming languages, tooling suites, and runtimes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {skillRoadmaps.map(item => (
                    <CompactRoadmapCard
                      key={item.label}
                      label={item.label}
                      isNew={item.isNew}
                      isSelected={selected.has(item.label)}
                      multiMode={multiMode}
                      bookmarked={bookmarks.has(item.label)}
                      paths={paths}
                      onClick={() => {
                        setPreviewItem(item.label);
                        setPreviewTrack('Skill Roadmap');
                      }}
                      onToggle={() => toggleItem(item.label)}
                      onBookmark={e => toggleBookmark(item.label, e)}
                    />
                  ))}
                </div>
              </div>

              {/* SECTION 3: BEST PRACTICES */}
              <div>
                <div className="mb-5 border-t border-slate-100 pt-8">
                  <h2 className="text-[17px] font-black text-slate-800 leading-none font-display">
                    Best Practices
                  </h2>
                  <p className="text-[11.5px] text-slate-450 font-medium leading-normal mt-1.5 font-sans">
                    Core guidelines, database design checks, and cloud zero-trust security layouts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {bestPractices.map(item => (
                    <CompactRoadmapCard
                      key={item.label}
                      label={item.label}
                      isNew={item.isNew}
                      isSelected={selected.has(item.label)}
                      multiMode={multiMode}
                      bookmarked={bookmarks.has(item.label)}
                      paths={paths}
                      onClick={() => {
                        setPreviewItem(item.label);
                        setPreviewTrack('Best Practices');
                      }}
                      onToggle={() => toggleItem(item.label)}
                      onBookmark={e => toggleBookmark(item.label, e)}
                    />
                  ))}
                </div>
              </div>

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

      {/* ── Curriculum Outline Preview Drawer ── */}
      <AnimatePresence>
        {previewItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-slate-950/20 backdrop-blur-sm"
              onClick={() => setPreviewItem(null)}
            />

            <motion.div
              initial={{ x: '100%', opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.98 }}
              transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-[1001] w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200/40 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100/60 flex items-center justify-between shrink-0 bg-white/50">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-pulse" />
                  <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-[#4e5bff] font-mono">✦ Orchestration Engine</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-200/40"
                >
                  <X size={14} />
                </motion.button>
              </div>

              {(() => {
                const previewData = getPreviewData(previewItem);
                const theme = getRoleTheme(previewItem);
                
                // Calculate dynamic statistics
                const totalModulesCount = previewData.phases.reduce((acc, p) => acc + p.modules.length, 0);
                const selectedCount = Object.values(selectedPreviewModules).filter(Boolean).length;
                const baseHours = parseInt(previewData.metadata.duration) || 80;
                const calculatedHours = Math.round((selectedCount / totalModulesCount) * baseHours);

                return (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <div>
                        <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-snug font-display">{previewData.title}</h2>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-450 font-medium font-sans italic">{previewData.description}</p>
                      </div>

                      {/* Premium Stats Grid */}
                      <div className="bg-slate-50/50 border border-slate-200/40 p-3.5 rounded-2xl space-y-3.5">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 rounded-xl bg-white border border-slate-100/80 text-center flex flex-col items-center justify-center transition-all duration-200 hover:shadow-[0_4px_12px_rgba(13,23,48,0.04)] hover:scale-[1.02] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                            <div className={`p-1.5 rounded-lg mb-1.5 ${theme.iconBg} text-[#4e5bff]`}>
                              <Clock size={14} className="animate-spin-slow" style={{ animationDuration: '10s' }} />
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Duration</p>
                            <p className="text-[12px] font-black text-slate-800 leading-none font-mono">
                              {calculatedHours} Hrs
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-100/80 text-center flex flex-col items-center justify-center transition-all duration-200 hover:shadow-[0_4px_12px_rgba(13,23,48,0.04)] hover:scale-[1.02] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                            <div className={`p-1.5 rounded-lg mb-1.5 ${theme.iconBg} text-[#4e5bff]`}>
                              <BarChart2 size={14} />
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Level</p>
                            <p className="text-[11px] font-black text-slate-800 leading-none truncate w-full">
                              {previewData.metadata.level.split(' ')[0]}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-100/80 text-center flex flex-col items-center justify-center transition-all duration-200 hover:shadow-[0_4px_12px_rgba(13,23,48,0.04)] hover:scale-[1.02] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                            <div className={`p-1.5 rounded-lg mb-1.5 ${theme.iconBg} text-[#4e5bff]`}>
                              <Cpu size={14} className="animate-pulse" />
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Selected</p>
                            <p className="text-[12px] font-black text-slate-800 leading-none font-mono">
                              {selectedCount} / {totalModulesCount}
                            </p>
                          </div>
                        </div>

                        {/* Syllabus Selection progress bar */}
                        {(() => {
                          const progressPercent = totalModulesCount > 0 ? Math.round((selectedCount / totalModulesCount) * 100) : 0;
                          return (
                            <div className="px-1 space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <span>Syllabus Coverage</span>
                                <span className="font-mono text-[#4e5bff] font-black">{progressPercent}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-150 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-[#4e5bff] to-[#886cff]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Dual-View Tabs */}
                      <div className="relative flex rounded-xl p-1 bg-slate-100/70 border border-slate-200/40">
                        <button
                          type="button"
                          onClick={() => setPreviewViewTab('list')}
                          className="relative flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer z-10 flex items-center justify-center gap-1.5"
                          style={{ color: previewViewTab === 'list' ? '#1e293b' : '#64748b' }}
                        >
                          📋 Timeline List
                          {previewViewTab === 'list' && (
                            <motion.div
                              layoutId="activePreviewTab"
                              className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/30 z-[-1]"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewTab('flow')}
                          className="relative flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer z-10 flex items-center justify-center gap-1.5"
                          style={{ color: previewViewTab === 'flow' ? '#4e5bff' : '#64748b' }}
                        >
                          🧠 Neural Flow
                          {previewViewTab === 'flow' && (
                            <motion.div
                              layoutId="activePreviewTab"
                              className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/30 z-[-1]"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>
                      </div>

                      {/* Syllabus View Container */}
                      <div className="space-y-4 pt-2">
                        <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.25em]">Syllabus Breakdown</h4>
                        
                        {previewViewTab === 'list' ? (
                          /* Structured Checklist Timeline */
                          <div className="space-y-4">
                            {previewData.phases.map((phase, pIdx) => (
                              <div key={pIdx} className="space-y-3 border-l border-slate-200/80 pl-5 relative pb-3 last:pb-0">
                                {/* Timeline Dot */}
                                <div className={`absolute w-3 h-3 rounded-full ${theme.barColor} -left-[6px] top-1 border-2 border-white shadow-sm`} />
                                <div className="mb-2">
                                  <span className="text-[9px] font-bold text-[#4e5bff] uppercase tracking-wider font-mono">Phase {pIdx + 1}</span>
                                  <h5 className="text-[13px] font-black text-slate-800 leading-tight font-display">{phase.title}</h5>
                                  <p className="text-[10.5px] text-slate-400 leading-normal font-medium mt-0.5">{phase.description}</p>
                                </div>
                                <div className="grid gap-2.5 mt-2.5">
                                  {phase.modules.map((m, mIdx) => {
                                    const isChecked = !!selectedPreviewModules[m.title];
                                    // Calculate dynamic mock details
                                    const estimateMin = 30 + ((m.title.length * 7) % 6) * 10;
                                    const mockConcepts = [m.title.split(' ')[0].toLowerCase(), m.title.split(' ').slice(-1)[0].toLowerCase()]
                                      .filter((v, i, a) => a.indexOf(v) === i && v.length > 2)
                                      .map(c => c.replace(/[^a-zA-Z]/g, ''))
                                      .slice(0, 2);

                                    return (
                                      <motion.button
                                        key={mIdx}
                                        type="button"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => {
                                          setSelectedPreviewModules(prev => ({
                                            ...prev,
                                            [m.title]: !isChecked
                                          }));
                                        }}
                                        className="w-full p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative overflow-hidden"
                                        style={{
                                          background: isChecked ? 'rgba(255, 255, 255, 1)' : 'rgba(248, 250, 252, 0.4)',
                                          borderColor: isChecked ? 'rgba(78, 91, 255, 0.16)' : 'rgba(226, 232, 240, 0.8)',
                                          boxShadow: isChecked ? '0 4px 16px rgba(78, 91, 255, 0.04)' : 'none'
                                        }}
                                      >
                                        {/* Checked Background Glow Highlight */}
                                        {isChecked && (
                                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#4e5bff]/5 to-transparent rounded-full -mr-6 -mt-6 pointer-events-none" />
                                        )}

                                        {/* Custom Premium Checkbox */}
                                        <div
                                          className="mt-0.5 shrink-0 transition-all duration-200 flex items-center justify-center"
                                          style={{
                                            width: 16, height: 16, borderRadius: 5,
                                            background: isChecked ? '#4e5bff' : 'transparent',
                                            border: `1.5px solid ${isChecked ? '#4e5bff' : '#cbd5e1'}`,
                                            boxShadow: isChecked ? '0 2px 6px rgba(78, 91, 255, 0.3)' : 'none'
                                          }}
                                        >
                                          {isChecked && (
                                            <Check size={10} strokeWidth={4} className="text-white" />
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-[12.5px] font-black leading-snug transition-all ${
                                              isChecked ? 'text-slate-800' : 'text-slate-400 line-through'
                                            }`}>{m.title}</p>
                                            
                                            {/* Estimate tag */}
                                            {isChecked && (
                                              <span className="text-[8.5px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                                ⏱️ {estimateMin}m
                                              </span>
                                            )}
                                          </div>
                                          <p className={`text-[10px] leading-normal mt-1 font-medium transition-all ${
                                            isChecked ? 'text-slate-550' : 'text-slate-350'
                                          }`}>{m.description}</p>

                                          {/* Concept Badges */}
                                          {isChecked && mockConcepts.length > 0 && (
                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                              {mockConcepts.map((tag, tIdx) => (
                                                <span key={tIdx} className="text-[8.5px] font-black text-[#4e5bff] bg-[#4e5bff]/5 border border-[#4e5bff]/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                                                  #{tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Interactive Neural Flow Tree */
                          (() => {
                            const flatNodes: { title: string; description: string; phaseIndex: number }[] = [];
                            previewData.phases.forEach((phase, pIdx) => {
                              phase.modules.forEach(mod => {
                                flatNodes.push({ ...mod, phaseIndex: pIdx });
                              });
                            });

                            const canvasWidth = 352;
                            const nodeSpacing = 90;
                            const canvasHeight = Math.max(180, (flatNodes.length - 1) * nodeSpacing + 60);

                            const positions = flatNodes.map((node, idx) => {
                              const y = 30 + idx * nodeSpacing;
                              const x = 176 + (idx % 2 === 0 ? -48 : 48);
                              return { x, y };
                            });

                            let pathD = '';
                            if (positions.length > 0) {
                              pathD = `M ${positions[0].x} ${positions[0].y}`;
                              for (let i = 1; i < positions.length; i++) {
                                const prev = positions[i - 1];
                                const curr = positions[i];
                                const cpY1 = prev.y + nodeSpacing / 2;
                                const cpY2 = curr.y - nodeSpacing / 2;
                                pathD += ` C ${prev.x} ${cpY1}, ${curr.x} ${cpY2}, ${curr.x} ${curr.y}`;
                              }
                            }

                            return (
                              <div className="relative border border-slate-900 rounded-2xl bg-[#05070a] p-4 shadow-2xl overflow-hidden flex flex-col items-center select-none">
                                {/* Signal stream keyframes */}
                                <style>{`
                                  @keyframes flowDash {
                                    to {
                                      stroke-dashoffset: -20;
                                    }
                                  }
                                  .animate-flow-dash {
                                    animation: flowDash 1.8s linear infinite;
                                  }
                                `}</style>

                                <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[8.5px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-ping" />
                                  Interactive Sandbox Blueprint
                                </div>

                                <svg width={canvasWidth} height={canvasHeight} className="relative z-10">
                                  <defs>
                                    <pattern id="flowGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                      <circle cx="2" cy="2" r="0.75" fill="rgba(255,255,255,0.06)" />
                                    </pattern>
                                    <linearGradient id="flowPathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor="#4e5bff" stopOpacity="0.8" />
                                      <stop offset="100%" stopColor="#886cff" stopOpacity="0.8" />
                                    </linearGradient>
                                    <radialGradient id="nodeActiveGlow" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#4e5bff" stopOpacity="0.45" />
                                      <stop offset="100%" stopColor="#4e5bff" stopOpacity="0" />
                                    </radialGradient>
                                  </defs>
                                  
                                  <rect width="100%" height="100%" fill="url(#flowGrid)" />

                                  {/* Static dark path */}
                                  {pathD && (
                                    <path
                                      d={pathD}
                                      fill="none"
                                      stroke="#1e293b"
                                      strokeWidth="2.5"
                                    />
                                  )}

                                  {/* Glowing animated path */}
                                  {pathD && (
                                    <path
                                      d={pathD}
                                      fill="none"
                                      stroke="url(#flowPathGrad)"
                                      strokeWidth="2.5"
                                      strokeDasharray="5 10"
                                      className="animate-flow-dash"
                                    />
                                  )}

                                  {positions.map((pos, idx) => {
                                    const node = flatNodes[idx];
                                    const isChecked = !!selectedPreviewModules[node.title];
                                    return (
                                      <g key={idx}>
                                        {/* Glow Halo */}
                                        {isChecked && (
                                          <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r="16"
                                            fill="url(#nodeActiveGlow)"
                                            className="animate-pulse"
                                            style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                                          />
                                        )}
                                        {/* Outer Circle Ring */}
                                        <circle
                                          cx={pos.x}
                                          cy={pos.y}
                                          r="7.5"
                                          fill={isChecked ? '#4e5bff' : '#111827'}
                                          stroke={isChecked ? '#ffffff' : '#374151'}
                                          strokeWidth="2"
                                          className="transition-all duration-200 cursor-pointer hover:scale-125"
                                          style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                                          onClick={() => {
                                            setSelectedPreviewModules(prev => ({
                                              ...prev,
                                              [node.title]: !isChecked
                                            }));
                                          }}
                                        />
                                        {/* Inner White Dot */}
                                        {isChecked && (
                                          <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r="2"
                                            fill="#ffffff"
                                            pointerEvents="none"
                                          />
                                        )}
                                      </g>
                                    );
                                  })}
                                </svg>

                                {/* Labels positioned adjacent to nodes without overlap */}
                                {positions.map((pos, idx) => {
                                  const node = flatNodes[idx];
                                  const isChecked = !!selectedPreviewModules[node.title];
                                  const isLeft = idx % 2 === 0;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setSelectedPreviewModules(prev => ({
                                          ...prev,
                                          [node.title]: !isChecked
                                        }));
                                      }}
                                      className={`absolute flex items-center group cursor-pointer transition-all duration-200 ${
                                        isLeft ? 'justify-start' : 'justify-end translate-x-[-100%]'
                                      }`}
                                      style={{ 
                                        left: isLeft ? pos.x + 14 : pos.x - 14, 
                                        top: pos.y + 16,
                                      }}
                                    >
                                      {/* Indicator check icon dot */}
                                      <div
                                        className={`absolute flex items-center justify-center transition-all duration-250 ${
                                          isLeft 
                                            ? 'right-full mr-2' 
                                            : 'left-full ml-2'
                                        } w-5 h-5 rounded-full border border-slate-700/80 shadow ${
                                          isChecked
                                            ? 'bg-[#4e5bff] border-white text-white scale-110 shadow-indigo-900/50'
                                            : 'bg-slate-900 text-slate-500 scale-95 hover:border-slate-500'
                                        }`}
                                      >
                                        {isChecked ? (
                                          <Check size={9} strokeWidth={4} />
                                        ) : (
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                        )}
                                      </div>

                                      {/* Label glassmorphic container */}
                                      <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-md py-1.5 px-3 rounded-xl max-w-[130px] shadow-lg pointer-events-none group-hover:border-slate-700 transition-colors">
                                        <p className={`text-[10px] font-black leading-tight truncate font-mono tracking-tight ${
                                          isChecked ? 'text-white font-extrabold' : 'text-slate-500 line-through'
                                        }`}>
                                          {node.title}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-150 bg-slate-50/50 backdrop-blur-sm shrink-0 flex flex-col gap-2.5">
                      <button
                        onClick={() => {
                          const trackVal = previewTrack;
                          const selectedList = Object.entries(selectedPreviewModules)
                            .filter(([_, checked]) => checked)
                            .map(([title]) => title)
                            .join(', ');
                          setPreviewItem(null);
                          const params: Record<string, string> = { goal: previewItem || '', track: trackVal };
                          if (selectedList) {
                            params.selectedModules = selectedList;
                          }
                          navigate(`/explore?${new URLSearchParams(params)}`);
                        }}
                        disabled={selectedCount === 0}
                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#4e5bff] to-[#6c5ce7] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.18em] shadow-lg shadow-indigo-900/15 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                        <Sparkles size={13} className="group-hover:rotate-12 transition-transform duration-300" /> 
                        Compile Custom Path
                      </button>
                      <p className="text-[9.5px] text-slate-450 leading-relaxed text-center font-medium font-sans">
                        Gemini will orchestrate a personalized path focusing strictly on the checked nodes.
                      </p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
