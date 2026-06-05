import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Bookmark, Sparkles, ArrowRight,
  Flame, BookOpen, Compass, Play, Layers, Globe, Terminal,
  Database, Brain, Shield, GitBranch, Target, Check
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
  for (const phase of path.phases) {
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
  const { paths, userProfile } = useAppStore();
  const promptInputRef = useRef<HTMLInputElement>(null);

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
              className="fixed inset-0 z-[1000] bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setPreviewItem(null)}
            />

            <motion.div
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 z-[1001] w-full max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Compass size={15} className="text-[#4e5bff]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4e5bff]">Roadmap Preview</span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {(() => {
                const previewData = getPreviewData(previewItem);
                return (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <div>
                        <h2 className="text-[18px] font-black text-slate-900 tracking-tight leading-snug font-display">{previewData.title}</h2>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-450 font-medium font-sans italic">{previewData.description}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50 text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time</p>
                          <p className="text-[11px] font-black text-slate-700 leading-none">{previewData.metadata.duration}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50 text-center">
                          <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest leading-none mb-1">Level</p>
                          <p className="text-[11px] font-black text-slate-700 leading-none truncate">{previewData.metadata.level.split(' ')[0]}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50 text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Modules</p>
                          <p className="text-[11px] font-black text-slate-700 leading-none">{previewData.metadata.modulesCount} Nodes</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.25em]">Syllabus Breakdown</h4>
                        <div className="space-y-4">
                          {previewData.phases.map((phase, pIdx) => (
                            <div key={pIdx} className="space-y-2 border-l border-slate-100 pl-4 relative">
                              <div className="absolute w-2 h-2 rounded-full bg-[#4e5bff] -left-[5px] top-1 border border-white" />
                              <h5 className="text-[12px] font-black text-slate-800 leading-none font-display">{phase.title}</h5>
                              <p className="text-[10px] text-slate-450 leading-normal font-medium">{phase.description}</p>
                              <div className="grid gap-1 mt-2.5">
                                {phase.modules.map((m, mIdx) => (
                                  <div key={mIdx} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100/30 text-left">
                                    <p className="text-[11.5px] font-black text-slate-700 leading-snug">{m.title}</p>
                                    <p className="text-[10px] text-slate-450 leading-normal mt-0.5 font-medium">{m.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/40 shrink-0">
                      <button
                        onClick={() => {
                          const trackVal = previewTrack;
                          setPreviewItem(null);
                          navigate(`/explore?${new URLSearchParams({ goal: previewItem, track: trackVal })}`);
                        }}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-[#4e5bff] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-900/10 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles size={13} /> Compile Custom Path
                      </button>
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
