import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { generateLearningPlan, getGeminiProviderErrorMessage, scoutResources } from '../services/geminiService';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';
import { roadmapPreviews, RoadmapPreview, PreviewPhase, PreviewModule } from './roadmapPreviews';
import type { ComplexityLevel, StudyLens, ScholarPersona } from '../features/study/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, Zap, 
  RotateCcw, Check, Brain, 
  Trophy, Rocket, Lightbulb,
  ArrowRight, Maximize2, Minimize2, Loader,
  Target, Info, RefreshCw, X, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';

const FAST_PREVIEW_DELAY_MS = 450;

const findMatchingPreview = (item: string): RoadmapPreview | null => {
  const norm = item.toLowerCase();
  const key = Object.keys(roadmapPreviews).find(k => 
    k.toLowerCase() === norm || 
    roadmapPreviews[k].title.toLowerCase() === norm ||
    norm.includes(k.toLowerCase()) || 
    roadmapPreviews[k].title.toLowerCase().includes(norm)
  );
  return key ? roadmapPreviews[key] : null;
};

const getMergedHybridPreview = (goal: string, track: string): RoadmapPreview => {
  const normalizedGoal = goal.replace(/^Hybrid Path:\s*/i, '').trim();
  const hybridItems = normalizedGoal.split('+').map(item => item.trim()).filter(Boolean);

  const matchedPreviews = hybridItems.map(item => {
    const matched = findMatchingPreview(item);
    if (matched) return matched;
    return {
      title: `${item} Core`,
      description: `Essential mental models and execution habits for ${item}.`,
      metadata: { duration: '40 Hours', level: 'Beginner to Intermediate', modulesCount: 6 },
      phases: [
        {
          title: `Phase 1: ${item} Foundations`,
          description: `Core primitives and terminology of ${item}.`,
          modules: [
            { title: `${item} Orientation & Concepts`, description: `Understand basic blocks and workflow configurations for ${item}.` },
            { title: `${item} Tooling & Environment`, description: `Set up tools, command interfaces, and local development for ${item}.` }
          ]
        },
        {
          title: `Phase 2: ${item} Development`,
          description: `Applied practice and mini builds for ${item}.`,
          modules: [
            { title: `${item} Core Implementation`, description: `Build real-world application components for ${item}.` },
            { title: `${item} Best Practices & Architecture`, description: `Design patterns and modular architecture workflows for ${item}.` }
          ]
        },
        {
          title: `Phase 3: ${item} Production`,
          description: `Optimization and production deployment for ${item}.`,
          modules: [
            { title: `${item} Testing & Optimization`, description: `Run diagnostics, write unit tests, and tune performance for ${item}.` },
            { title: `${item} Scaling & Launch`, description: `Deployment configurations and security hardening checklists for ${item}.` }
          ]
        }
      ]
    };
  });

  const maxPhases = Math.max(...matchedPreviews.map(p => p.phases.length));
  const mergedPhases: PreviewPhase[] = [];

  for (let i = 0; i < maxPhases; i++) {
    const modules: PreviewModule[] = [];
    matchedPreviews.forEach(p => {
      if (p.phases[i]) {
        modules.push(...p.phases[i].modules);
      }
    });

    let phaseTitle = `Phase ${i + 1}: Integrated Specializations`;
    let phaseDesc = `Integrated concept modules from ${hybridItems.join(' and ')}.`;
    if (i === 0) {
      phaseTitle = `Phase 1: Combined Foundations & Core`;
      phaseDesc = `Establish foundational syntax, system setup, and core mental models for ${hybridItems.join(' & ')}.`;
    } else if (i === 1) {
      phaseTitle = `Phase 2: Combined Application & Integration`;
      phaseDesc = `Connect modules together, design backend/frontend services, and build functional systems.`;
    } else if (i === 2) {
      phaseTitle = `Phase 3: Combined Scaling & Production`;
      phaseDesc = `Implement caching, type checking, security controls, optimization and production deployment patterns.`;
    }

    mergedPhases.push({
      title: phaseTitle,
      description: phaseDesc,
      modules
    });
  }

  const totalModules = mergedPhases.reduce((acc, p) => acc + p.modules.length, 0);
  const totalHours = matchedPreviews.reduce((acc, p) => {
    const hrs = parseInt(p.metadata.duration) || 40;
    return acc + hrs;
  }, 0);

  return {
    title: `Hybrid Path: ${hybridItems.join(' + ')}`,
    description: `A customized hybrid roadmap that integrates ${hybridItems.join(', ')} into a single, cohesive training sequence.`,
    metadata: {
      duration: `${totalHours} Hours`,
      level: 'Beginner to Advanced',
      modulesCount: totalModules
    },
    phases: mergedPhases
  };
};

const normalizePlanData = (planData: any) => {
  if (!planData || !planData.phases) return planData;
  
  planData.phases.forEach((phase: any, pIdx: number) => {
    phase.modules = (phase.modules || []).map((mod: any, mIdx: number) => {
      if (!mod.id) {
        mod.id = `mod-${pIdx}-${mIdx}`;
      }
      if (!mod.dependsOnModuleIds || !Array.isArray(mod.dependsOnModuleIds)) {
        const prevMod = mIdx > 0 
          ? phase.modules[mIdx - 1] 
          : (pIdx > 0 ? planData.phases[pIdx - 1].modules[planData.phases[pIdx - 1].modules.length - 1] : null);
        mod.dependsOnModuleIds = prevMod ? [prevMod.id || `mod-${pIdx - (mIdx === 0 ? 1 : 0)}-${mIdx === 0 ? planData.phases[pIdx - 1].modules.length - 1 : mIdx - 1}`] : [];
      }
      return mod;
    });
  });
  
  return planData;
};

const getPreviewSeed = (goal: string, track: string): RoadmapPreview => {
  const exact = roadmapPreviews[goal];
  if (exact) return exact;

  const normalizedGoal = goal.replace(/^Hybrid Path:\s*/i, '').trim();
  const hybridItems = normalizedGoal.split('+').map(item => item.trim()).filter(Boolean);
  const isHybrid = track.toLowerCase().includes('hybrid') && hybridItems.length > 1;

  if (isHybrid) {
    return {
      title: `${normalizedGoal} Roadmap`,
      description: `A practical hybrid path that blends ${hybridItems.join(', ')} into one coherent sequence from fundamentals to portfolio-grade implementation.`,
      metadata: { duration: '120 Hours', level: 'Beginner to Advanced', modulesCount: hybridItems.length * 3 },
      phases: hybridItems.slice(0, 5).map((item, idx) => ({
        title: `Phase ${idx + 1}: ${item} Core`,
        description: `Build the essential mental model and implementation habits for ${item}.`,
        modules: [
          { title: `${item} Fundamentals`, description: `Learn the syntax, concepts, tools, and workflows that matter most for ${item}.` },
          { title: `${item} Applied Lab`, description: `Build a focused project slice that turns theory into usable skill.` },
          { title: `${item} Production Patterns`, description: `Practice debugging, testing, performance, and maintainable architecture for ${item}.` }
        ]
      }))
    };
  }

  return {
    title: `${goal} Roadmap`,
    description: `A fast, structured learning path for mastering ${goal} from foundations to practical execution.`,
    metadata: { duration: '80 Hours', level: 'Beginner to Intermediate', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: Foundations',
        description: `Establish the vocabulary, concepts, and core mechanics behind ${goal}.`,
        modules: [
          { title: `${goal} Orientation`, description: `Understand what ${goal} is, where it is used, and how the pieces fit together.` },
          { title: 'Core Concepts', description: `Learn the essential ideas, primitives, and mental models needed to reason clearly.` },
          { title: 'Tooling Setup', description: `Set up the practical environment, references, and repeatable study workflow.` }
        ]
      },
      {
        title: 'Phase 2: Applied Practice',
        description: `Move from recognition to execution through guided labs and examples.`,
        modules: [
          { title: 'Guided Implementation', description: `Build small working examples and connect the concepts through hands-on repetition.` },
          { title: 'Debugging and Feedback', description: `Practice diagnosing mistakes, interpreting errors, and improving your approach.` },
          { title: 'Mini Project', description: `Create a compact project that proves you can apply the skill independently.` }
        ]
      },
      {
        title: 'Phase 3: Mastery and Production',
        description: `Refine judgment, performance, communication, and real-world readiness.`,
        modules: [
          { title: 'Best Practices', description: `Learn clean structure, tradeoffs, conventions, and maintainable patterns.` },
          { title: 'Performance and Reliability', description: `Identify bottlenecks, harden workflows, and build confidence under constraints.` },
          { title: 'Capstone Review', description: `Synthesize the path into a final deliverable and a targeted review checklist.` }
        ]
      }
    ]
  };
};

const buildPlanFromPreview = (
  preview: RoadmapPreview,
  goal: string,
  intentModifier = '',
  complexity: ComplexityLevel = 'overview',
  studyLens: StudyLens = 'roadmap',
  scholarPersona: ScholarPersona = 'visionary',
  selectedModulesParam?: string | null
) => {
  const intent = intentModifier.trim();
  const intentLabel = intent
    ? intent.replace(/^Adjust the curriculum to be more\s+/i, '').replace(/\.$/, '')
    : '';

  // 1. Flatten all modules from the preview template
  const allModules = preview.phases.flatMap(p => p.modules);

  // 2. Filter modules if selectedModulesParam is provided (Context Wizard filter)
  let selectedSet: Set<string> | null = null;
  if (selectedModulesParam) {
    selectedSet = new Set(selectedModulesParam.split(',').map(s => s.trim().toLowerCase()));
  }

  let filteredMods = allModules.filter(mod => {
    if (!selectedSet) return true;
    return selectedSet.has(mod.title.trim().toLowerCase());
  });

  // Fallback if filtering left us empty
  if (filteredMods.length === 0) {
    filteredMods = allModules;
  }

  // 3. Determine module limit based on Cognitive Density (Complexity)
  let limit = 6;
  if (complexity === 'spark') limit = 2;
  else if (complexity === 'snapshot') limit = 4;
  else if (complexity === 'overview') limit = 6;
  else if (complexity === 'detailed') limit = 9;
  else if (complexity === 'deep') limit = 12;
  else if (complexity === 'mastery') limit = 15;
  else if (complexity === 'infinite') limit = 20;

  // Adapt filtered list to match target complexity limit
  let finalMods = [...filteredMods];
  while (finalMods.length < limit) {
    const extraNum = finalMods.length + 1;
    finalMods.push({
      title: `${goal} Deep Dive ${extraNum}`,
      description: `Advance your knowledge of ${goal} by working on specialized segment ${extraNum}.`
    });
  }
  finalMods = finalMods.slice(0, limit);

  // 4. Group modules into structured phases
  const modulesPerPhase = complexity === 'spark' ? 2 : (complexity === 'snapshot' || complexity === 'overview' ? 2 : (complexity === 'infinite' ? 4 : 3));
  const numPhases = Math.ceil(finalMods.length / modulesPerPhase);
  const phases = [];
  for (let i = 0; i < numPhases; i++) {
    const startIdx = i * modulesPerPhase;
    const phaseMods = finalMods.slice(startIdx, startIdx + modulesPerPhase);
    phases.push({
      title: `Phase ${i + 1}: ${i === 0 ? 'Foundations & Mechanics' : (i === numPhases - 1 ? 'Expertise & Deployments' : 'Applied Development')}`,
      description: `Structured step ${i + 1} of learning curriculum for ${goal}.`,
      modules: phaseMods
    });
  }

  // 5. Apply Study Lens and Scholar Persona styling
  return {
    title: preview.title || `${goal} Roadmap`,
    description: intent
      ? `${preview.description} Calibration applied: ${intentLabel}.`
      : preview.description,
    phases: phases.map((phase, phaseIdx) => ({
      title: phase.title,
      description: phase.description,
      modules: phase.modules.map((mod, moduleIdx) => {
        let title = mod.title;
        let description = mod.description;

        // Apply Study Lens modifications
        if (studyLens === 'foundations') {
          title = `Foundations: ${title}`;
          description = `Establish critical theoretical definitions, terminologies, and baseline mental models for: ${description}`;
        } else if (studyLens === 'practice') {
          title = `Practice Lab: ${title}`;
          description = `Hands-on active construction. Write code, configure environments, and compile modules for: ${description}`;
        } else if (studyLens === 'exam') {
          title = `Exam Prep: ${title}`;
          description = `High-yield diagnostic review. Practice quizzes, mock tests, and certification guidelines for: ${description}`;
        } else if (studyLens === 'pitfalls') {
          title = `Common Pitfalls: ${title}`;
          description = `Diagnostics and anti-patterns. Learn how to debug, trace warnings, and avoid major failures in: ${description}`;
        }

        // Apply Scholar Persona modifications
        if (scholarPersona === 'visionary') {
          description = `[Visionary Lens] Explore future trends and bleeding-edge innovations: ${description}`;
        } else if (scholarPersona === 'analyst') {
          description = `[Analytical Audit] Rigorously deconstruct exact specifications and latency: ${description}`;
        } else if (scholarPersona === 'builder') {
          description = `[Production Builder] Focus on high-performance code quality and scaffolding: ${description}`;
        } else if (scholarPersona === 'challenger') {
          description = `[Challenger Audit] Pressure-test assertions and find architectural weak points: ${description}`;
        } else if (scholarPersona === 'storyteller') {
          description = `[Narrative Study] Relate to practical real-world metaphors and historical cases: ${description}`;
        }

        return {
          id: `mod-${phaseIdx}-${moduleIdx}`,
          title,
          description,
          estimatedMinutes: Math.max(25, Math.round(45 + phaseIdx * 10 + moduleIdx * 5)),
          keyConcepts: [
            mod.title,
            phase.title.replace(/^Phase\s*\d+\s*:\s*/i, ''),
            goal
          ].filter(Boolean),
          suggestedResources: []
        };
      })
    }))
  };
};

const PathExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPath } = useAppStore();
  
  const goal = searchParams.get('goal') || 'New Knowledge Path';
  const track = searchParams.get('track') || 'Custom Roadmap';

  // Compute color-matched dynamic glow variables
  const lbl = goal.toLowerCase();
  let blob1 = 'rgba(139,92,246,0.22)';
  let blob2 = 'rgba(99,102,241,0.18)';
  let blob3 = 'rgba(217,70,239,0.12)';
  if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web')) {
    blob1 = 'rgba(234,88,12,0.22)'; blob2 = 'rgba(255,149,0,0.18)'; blob3 = 'rgba(250,204,21,0.12)';
  } else if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')) {
    blob1 = 'rgba(6,182,212,0.22)'; blob2 = 'rgba(59,130,246,0.18)'; blob3 = 'rgba(99,102,241,0.12)';
  } else if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')) {
    blob1 = 'rgba(236,72,153,0.22)'; blob2 = 'rgba(168,85,247,0.18)'; blob3 = 'rgba(99,102,241,0.12)';
  } else if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp')) {
    blob1 = 'rgba(16,185,129,0.22)'; blob2 = 'rgba(5,150,105,0.18)'; blob3 = 'rgba(132,204,22,0.12)';
  }

  let themeColor = 'rgba(78, 91, 255, 0.03)';
  let themeBorder = 'rgba(78, 91, 255, 0.12)';
  let themeNeon = '#6366f1';
  let cardBgGradient = 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)';
  if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web')) {
    themeColor = 'rgba(234, 88, 12, 0.035)';
    themeBorder = 'rgba(234, 88, 12, 0.15)';
    themeNeon = '#ea580c';
    cardBgGradient = 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)';
  } else if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')) {
    themeColor = 'rgba(6, 182, 212, 0.035)';
    themeBorder = 'rgba(6, 182, 212, 0.15)';
    themeNeon = '#06b6d4';
    cardBgGradient = 'linear-gradient(135deg, #06b6d4 0%, #155e75 100%)';
  } else if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')) {
    themeColor = 'rgba(236, 72, 153, 0.035)';
    themeBorder = 'rgba(236, 72, 153, 0.15)';
    themeNeon = '#ec4899';
    cardBgGradient = 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)';
  } else if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp')) {
    themeColor = 'rgba(16, 185, 129, 0.035)';
    themeBorder = 'rgba(16, 185, 129, 0.15)';
    themeNeon = '#10b981';
    cardBgGradient = 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)';
  }

  const thinkingMessages = [
    "Scouting prerequisite linkages...",
    "Aligning cognitive depth checks...",
    "Weaving neural synapse checkpoints...",
    "Pruning semantic schema hierarchies...",
    "Synthesizing modular study modules...",
    "Calibrating active-recall node clusters...",
    "Optimizing responsive roadmap coordinates...",
    "Handshaking with scholastic graph engine..."
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const finishLoading = (): Promise<void> => {
    return new Promise((resolve) => {
      setProgress(100);
      setIsFinishing(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsFinishing(false);
        resolve();
      }, 2000);
    });
  };
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [pathMap, setPathMap] = useState<ConceptMap | null>(null);
  const [customIntent, setCustomIntent] = useState('');
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showCortexDesk, setShowCortexDesk] = useState(false);
  const [activeComplexity, setActiveComplexity] = useState<ComplexityLevel>('overview');
  const [activeStudyLens, setActiveStudyLens] = useState<StudyLens>('roadmap');
  const [activeScholarPersona, setActiveScholarPersona] = useState<ScholarPersona>('visionary');
  const containerRef = useRef<HTMLDivElement>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('vidyal_sidebar_collapsed') === 'true');

  useEffect(() => {
    const handleSidebarChange = (e: Event) => {
      setIsSidebarCollapsed((e as CustomEvent).detail);
    };
    window.addEventListener('set-sidebar-collapsed', handleSidebarChange);
    return () => {
      window.removeEventListener('set-sidebar-collapsed', handleSidebarChange);
    };
  }, []);

  const handleSidebarToggle = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    localStorage.setItem('vidyal_sidebar_collapsed', String(nextVal));
    document.documentElement.setAttribute('data-sidebar-collapsed', String(nextVal));
    window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: nextVal }));
  };

  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const generationTimeoutRef = useRef<number | null>(null);

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error entering native fullscreen:", err);
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Error exiting native fullscreen:", err);
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
    };
  }, []);

  const simulatedLogs = React.useMemo(() => {
    const logs = [
      { id: 1, tag: 'SYSTEM', msg: 'Loading Cortex roadmap blueprint cache...', type: 'info' as const, progress: 5 },
      { id: 2, tag: 'SYNAPSE', msg: 'Composing local concept graph skeleton...', type: 'info' as const, progress: 15 },
      { id: 3, tag: 'SEMANTIC', msg: `Deconstructing goal semantics: "${goal}"`, type: 'info' as const, progress: 30 },
      { id: 4, tag: 'ACADEMIC', msg: `Applying curriculum mapping parameters & prerequisite guidelines...`, type: 'info' as const, progress: 50 },
      { id: 5, tag: 'STRUCTURE', msg: 'Assembling concept nodes, logical paths, & durations...', type: 'info' as const, progress: 70 },
      { id: 6, tag: 'INTEGRITY', msg: 'Validating type schema mapping & dependency keys...', type: 'info' as const, progress: 85 },
      { id: 7, tag: 'TELEMETRY', msg: 'Generating responsive visual concept map layouts...', type: 'success' as const, progress: 95 }
    ];
    if (progress >= 100 && plan) {
      logs.push({
        id: 8,
        tag: 'SUCCESS',
        msg: `Neural Blueprint successfully calibrated & visual map compiled in ${elapsedTime.toFixed(1)}s!`,
        type: 'success' as const,
        progress: 100
      });
    }
    return logs.filter(log => progress >= log.progress);
  }, [progress, goal, elapsedTime, plan]);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const applyGeneratedPlan = (rawPlanData: any): Promise<void> => {
    const planData = normalizePlanData(rawPlanData);
    setPlan(planData);

    const nodes: ConceptNode[] = [{ id: 'root', label: planData.title || goal, description: planData.description || 'Mastery Path', depth: 0 }];
    const relationships: any[] = [];

    planData.phases.forEach((phase: any, pIdx: number) => {
      const phaseId = `phase-${pIdx}`;
      nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
      relationships.push({ from: 'root', to: phaseId, label: 'phase' });
      phase.modules.forEach((mod: any, mIdx: number) => {
        nodes.push({ id: mod.id, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
        relationships.push({ from: phaseId, to: mod.id, label: 'module' });
        
        if (mod.dependsOnModuleIds && Array.isArray(mod.dependsOnModuleIds)) {
          mod.dependsOnModuleIds.forEach((depId: string) => {
            relationships.push({ from: depId, to: mod.id, label: 'prerequisite' });
          });
        }
      });
    });

    setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
    setProgress(100);

    return new Promise((resolve) => {
      setTimeout(async () => {
        await finishLoading();
        resolve();
      }, 100);
    });
  };

  const performGeneration = async (
    intentModifier: string = '',
    overrideComplexity?: ComplexityLevel,
    overrideStudyLens?: StudyLens,
    overrideScholarPersona?: ScholarPersona
  ) => {
    setIsLoading(true);
    setIsFinishing(false);
    setProgress(0);
    setElapsedTime(0);
    setError(null);
    setSelectedNode(null);
    
    // Clear any previous intervals
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);

    // 1. Tick up real elapsed timer in seconds
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedTime((prev) => Math.round((prev + 0.1) * 10) / 10);
    }, 100);

    // 2. Incremental asymptotic progress calculation
    simIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 2;
        if (prev < 70) return prev + 1;
        if (prev < 90) return prev + 0.5;
        if (prev < 99) return prev + 0.1;
        return prev;
      });
    }, 80);

    const selectedModulesParam = searchParams.get('selectedModules');
    const isCatalogTrack = track === 'Role Roadmap' || track === 'Skill Roadmap' || track === 'Best Practices';
    const normalizedGoal = goal.toLowerCase();

    const cleanNormalizedGoal = goal.replace(/^Hybrid Path:\s*/i, '').trim();
    const hybridItems = cleanNormalizedGoal.split('+').map(item => item.trim()).filter(Boolean);
    const isHybrid = track.toLowerCase().includes('hybrid') && hybridItems.length > 1;

    // Check if it matches a predefined key in roadmapPreviews
    const previewKey = !isHybrid ? Object.keys(roadmapPreviews).find(key => {
      const preview = roadmapPreviews[key];
      return (
        key.toLowerCase() === normalizedGoal ||
        preview.title.toLowerCase() === normalizedGoal ||
        normalizedGoal.includes(key.toLowerCase()) ||
        preview.title.toLowerCase().includes(normalizedGoal)
      );
    }) : null;

    const isCustomCalibration = overrideComplexity !== undefined || overrideStudyLens !== undefined || overrideScholarPersona !== undefined;
    const complexityVal = overrideComplexity || activeComplexity;
    const studyLensVal = overrideStudyLens || activeStudyLens;
    const scholarPersonaVal = overrideScholarPersona || activeScholarPersona;

    const matchingPreview = previewKey ? roadmapPreviews[previewKey] : null;
    const shouldBuildLocally = !isCustomCalibration && (isHybrid || !!matchingPreview || isCatalogTrack || !!selectedModulesParam);

    if (shouldBuildLocally) {
      // Get the preview data, either from predefined templates or construct it dynamically
      const basePreview = isHybrid 
        ? getMergedHybridPreview(goal, track)
        : (matchingPreview || {
        title: goal.endsWith('Roadmap') ? goal : `${goal} Roadmap`,
        description: `Learn how to master ${goal} from absolute prerequisites to production implementation and best practices.`,
        metadata: { duration: '80 Hours', level: 'Beginner to Intermediate', modulesCount: 6 },
        phases: [
          {
            title: 'Phase 1: Core Fundamentals',
            description: `Establish the foundational theories, syntax, and base structures of ${goal}.`,
            modules: [
              { title: `Introduction to ${goal}`, description: `Understand core definitions, history, and basic application domains of ${goal}.` },
              { title: `Key Elements & Structures`, description: `Learn the primary components, standard workflows, and syntactical constructs.` }
            ]
          },
          {
            title: 'Phase 2: Development & Projects',
            description: `Apply your knowledge through hands-on labs and real-world architectures.`,
            modules: [
              { title: `Practical Implementation`, description: `Build real-world application components, configure setups, and execute commands.` },
              { title: `Best Practices & Patterns`, description: `Clean coding structures, design patterns, and standard configurations for ${goal}.` }
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
      });

      const planData = buildPlanFromPreview(
        basePreview,
        goal,
        intentModifier,
        complexityVal,
        studyLensVal,
        scholarPersonaVal,
        selectedModulesParam
      );

      // Simulate a quick loading animation for premium feel
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
          if (simIntervalRef.current) clearInterval(simIntervalRef.current);
          if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
          setProgress(100);
          setPlan(planData);
          
          const nodes: ConceptNode[] = [{ id: 'root', label: planData.title || goal, description: planData.description || 'Mastery Path', depth: 0 }];
          const relationships: any[] = [];

          planData.phases.forEach((phase: any, pIdx: number) => {
            const phaseId = `phase-${pIdx}`;
            nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
            relationships.push({ from: 'root', to: phaseId, label: 'phase' });
            phase.modules.forEach((mod: any, mIdx: number) => {
              const modId = mod.id || `mod-${pIdx}-${mIdx}`;
              nodes.push({ id: modId, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
              relationships.push({ from: phaseId, to: modId, label: 'module' });
            });
          });

          setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
          
          setTimeout(() => {
            finishLoading();
          }, 100);
        } else {
          setProgress(currentProgress);
        }
      }, 80);
      return;
    }

    try {
      // Scout live web resources (Google Search grounding) for this goal context using SARA
      let scoutedText = '';
      try {
        const foundResources = await scoutResources(goal, track);
        if (foundResources && foundResources.length > 0) {
          scoutedText = foundResources
            .map(r => `[Source] Title: ${r.title || ''}\nURL: ${r.content || ''}\n---`)
            .join('\n');
        }
      } catch (scoutErr) {
        console.warn("Pre-scouting grounding resources failed, continuing with general knowledge:", scoutErr);
      }

      const planData = await generateLearningPlan(
        `Goal: ${goal}
Track: ${track}
${intentModifier ? `INTENT: ${intentModifier}` : ''}
CALIBRATION PARAMETERS:
- Cognitive Density (Complexity): ${complexityVal}
- Study Lens: ${studyLensVal}
- Scholar Persona: ${scholarPersonaVal}
Please structure the curriculum phases and modules to match this Study Lens (e.g. emphasize practice exercises if 'practice'), adjust module depth based on the Cognitive Density, and tailor the terminology to fit the Scholar Persona.`,
        scoutedText,
        45,
        'beginner',
        'Mastery',
        new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        'Foundational',
        undefined,
        { 
          mode: 'preview', 
          timeoutMs: 22000,
          studyLens: studyLensVal,
          scholarPersona: scholarPersonaVal,
          cognitiveDensity: complexityVal
        },
      );

      // Clear progress intervals before applying
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      
      // Update local calibration states to stay fully synchronized
      if (overrideComplexity) setActiveComplexity(overrideComplexity);
      if (overrideStudyLens) setActiveStudyLens(overrideStudyLens);
      if (overrideScholarPersona) setActiveScholarPersona(overrideScholarPersona);

      // Use applyGeneratedPlan for consistent normalization and ID generation
      await applyGeneratedPlan(planData);

    } catch (err: any) {
      console.warn("Gemini generation failed, falling back to local preview:", err);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      
      // Fallback
      const localPreview = getPreviewSeed(goal, track);
      const planData: any = buildPlanFromPreview(localPreview, goal, intentModifier, complexityVal, studyLensVal, scholarPersonaVal, selectedModulesParam);
      planData.isFallback = true;
      
      // Update local calibration states
      if (overrideComplexity) setActiveComplexity(overrideComplexity);
      if (overrideStudyLens) setActiveStudyLens(overrideStudyLens);
      if (overrideScholarPersona) setActiveScholarPersona(overrideScholarPersona);
      
      await applyGeneratedPlan(planData);
    }
  };

  useEffect(() => { 
    const selectedModules = searchParams.get('selectedModules');
    const intentModifier = selectedModules 
      ? `Only include the following topics/modules in the path: ${selectedModules}. Adapt the depth, duration, and node hierarchy to focus exclusively on these elements. Exclude unrelated details.`
      : '';
    performGeneration(intentModifier); 
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
    };
  }, [goal, track, searchParams]);

  const handleInitialize = () => {
    if (!plan) return;

    const idMap: Record<string, string> = {};

    // First pass: assign clean unique IDs to all modules
    plan.phases.forEach((phase: any, pIdx: number) => {
      phase.modules.forEach((mod: any, mIdx: number) => {
        const oldId = mod.id || `mod-${pIdx}-${mIdx}`;
        const newId = generateSimpleId();
        idMap[oldId] = newId;
      });
    });

    const phasesWithIds = plan.phases.map((phase: any, pIdx: number) => {
      const phaseId = generateSimpleId();
      return {
        ...phase,
        id: phaseId,
        modules: phase.modules.map((mod: any, mIdx: number) => {
          const oldId = mod.id || `mod-${pIdx}-${mIdx}`;
          const currentNewId = idMap[oldId];
          
          let mappedDeps: string[] = [];
          if (mod.dependsOnModuleIds && Array.isArray(mod.dependsOnModuleIds)) {
            mappedDeps = mod.dependsOnModuleIds
              .map((depId: string) => idMap[depId] || depId)
              .filter(Boolean);
          } else {
            // Default to sequential dependency if none specified
            const prevMod = mIdx > 0 
              ? phase.modules[mIdx - 1] 
              : (pIdx > 0 ? plan.phases[pIdx - 1].modules[plan.phases[pIdx - 1].modules.length - 1] : null);
            if (prevMod) {
              const prevOldId = prevMod.id || `mod-${pIdx - (mIdx === 0 ? 1 : 0)}-${mIdx === 0 ? plan.phases[pIdx - 1].modules.length - 1 : mIdx - 1}`;
              mappedDeps = [idMap[prevOldId]];
            }
          }

          return {
            ...mod,
            id: currentNewId,
            isCompleted: false,
            keyConcepts: mod.keyConcepts || [],
            resources: mod.resources || [],
            dependsOnModuleIds: mappedDeps,
            userNotes: mod.userNotes || '',
            estimatedMinutes: mod.estimatedMinutes || 30
          };
        })
      };
    });

    const newPath: any = {
      id: generateSimpleId(), userId: 'default-user', title: plan.title || goal, goal, expectedOutcome: 'Mastery',
      targetDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(), dailyCommitmentMinutes: 45, status: 'active', progress: 0,
      phases: phasesWithIds.map((p: any, i: number) => ({ id: p.id, title: p.title, description: p.description, order: i + 1, modules: p.modules })),
      sessions: [], preferredStartTime: '09:00',
      studyLens: activeStudyLens,
      scholarPersona: activeScholarPersona,
      cognitiveDensity: activeComplexity
    };
    addPath(newPath);
    navigate(`/path/${newPath.id}`);
  };

  return (
    <div ref={containerRef} className={`flex flex-col bg-transparent overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[1000] bg-transparent' : 'flex-1 h-full'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-layer {
          background: 
            radial-gradient(circle at 50% 35%, ${blob1} 0%, ${blob2} 30%, transparent 60%),
            radial-gradient(circle at 30% 20%, ${blob3} 0%, transparent 50%),
            linear-gradient(180deg, ${
              lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web')
                ? '#0f0b08 0%, #3a1a05 120px, #7c2d12 220px, #c2410c 340px, #fffbf7 450px'
                : lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')
                  ? '#021a0e 0%, #052e16 120px, #166534 220px, #0e7490 340px, #f5fcf9 450px'
                  : lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')
                    ? '#1c020d 0%, #500724 120px, #be185d 220px, #7c3aed 340px, #fcf5f8 450px'
                    : '#021422 0%, #0c4a6e 120px, #0369a1 220px, #4f46e5 340px, #f5fafd 450px'
            }, #fafbfc 100%) fixed !important;
        }
      `}} />
      {isFullscreen && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 50% 35%, ${blob1} 0%, ${blob2} 30%, transparent 60%),
                radial-gradient(circle at 30% 20%, ${blob3} 0%, transparent 50%),
                linear-gradient(180deg, ${
                  lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web')
                    ? '#0f0b08 0%, #3a1a05 120px, #7c2d12 220px, #c2410c 340px, #fffbf7 450px'
                    : lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')
                      ? '#021a0e 0%, #052e16 120px, #166534 220px, #0e7490 340px, #f5fcf9 450px'
                      : lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')
                        ? '#1c020d 0%, #500724 120px, #be185d 220px, #7c3aed 340px, #fcf5f8 450px'
                        : '#021422 0%, #0c4a6e 120px, #0369a1 220px, #4f46e5 340px, #f5fafd 450px'
                }, #fafbfc 100%) fixed`
            }}
          />
        </div>
      )}
      
      <main className="flex-1 relative flex overflow-hidden bg-transparent">
        {/* Floating Sidebar Toggle & Course Name Panel */}
        <div className="absolute top-6 left-6 z-40 flex items-center gap-2.5 bg-white/70 backdrop-blur-xl border border-white/85 px-3.5 py-2.5 rounded-2xl shadow-[0_8px_32px_-8px_rgba(78,91,255,0.08)] pointer-events-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-xl text-slate-400 hover:text-[#4e5bff] hover:bg-[#4e5bff]/5 transition-all duration-200 border border-transparent hover:border-[#4e5bff]/10 cursor-pointer flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="w-px h-3.5 bg-slate-200" />
          <button 
            onClick={handleSidebarToggle}
            className="p-2 rounded-xl text-slate-400 hover:text-[#4e5bff] hover:bg-[#4e5bff]/5 border border-transparent hover:border-[#4e5bff]/10 cursor-pointer flex items-center justify-center"
            title="Toggle Sidebar"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={15} strokeWidth={2.5} /> : <PanelLeftClose size={15} strokeWidth={2.5} />}
          </button>
          <div className="w-px h-3.5 bg-slate-200" />
          <div className="flex items-center gap-2 pr-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500/80 leading-none">Roadmap:</span>
            <h1 className="text-[13px] font-black text-slate-800 tracking-tight leading-none truncate max-w-[200px] sm:max-w-xs">{goal}</h1>
          </div>
        </div>

        {/* Dynamic color-matched ambient flows behind card */}
        <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-40 blur-[130px] -top-24 -left-24" style={{ backgroundColor: blob1 }} />
        <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-35 blur-[120px] -bottom-24 -right-24" style={{ backgroundColor: blob2 }} />
        <div className="absolute w-[450px] h-[450px] rounded-full pointer-events-none opacity-25 blur-[110px] top-[30%] left-[25%]" style={{ backgroundColor: blob3 }} />
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #4e5bff 1.5px, transparent 0)', backgroundSize: '36px 36px' }} />
        
        {/* Main Canvas */}
        <div className="flex-1 relative bg-transparent overflow-hidden">
          {pathMap && (
              <div className={`w-full h-full animate-in fade-in duration-700 relative ${isFullscreen ? 'p-0' : 'p-4 sm:p-6'}`}>



                <div 
                  className={`w-full h-full overflow-hidden relative z-10 transition-all duration-700 ${isFullscreen ? 'rounded-none border-none' : 'backdrop-blur-[32px] rounded-[24px] border'}`}
                  style={isFullscreen ? { background: 'transparent' } : {
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.52) 100%)`,
                    borderColor: themeBorder,
                    boxShadow: `0 24px 70px rgba(0, 0, 0, 0.03), inset 0 0 60px ${themeColor}`,
                  }}
                >
                    <NeuralSynthesizer
                      moduleTitle={goal}
                      moduleContent={""}
                      keyConcepts={[]}
                      initialMap={pathMap}
                      initialComplexity={activeComplexity}
                      initialStudyLens={activeStudyLens}
                      initialScholarPersona={activeScholarPersona}
                      onConfigChange={config => {
                        if (config.complexity) setActiveComplexity(config.complexity);
                        if (config.studyLens) setActiveStudyLens(config.studyLens);
                        if (config.scholarPersona) setActiveScholarPersona(config.scholarPersona);
                      }}
                      onReSynthesize={async (config) => {
                        await performGeneration('', config.complexity, config.studyLens, config.scholarPersona);
                      }}
                      onNodeClick={(n) => setSelectedNode(n)}
                      onTuneRoadmapClick={() => setIsPanelOpen(true)}
                      isFullScreen={isFullscreen}
                      onFullScreenToggle={handleFullscreenToggle}
                      showCortexDesk={showCortexDesk}
                      onToggleCortexDesk={setShowCortexDesk}
                      isReSynthesizing={isLoading}
                      isFinishing={isFinishing}
                    />
                 </div>
                
                {/* Centered Floating Bottom CTA Panel */}
                {!isLoading && !error && plan && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0.3 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md border border-slate-200/50 rounded-[22px] shadow-[0_8px_32px_-8px_rgba(78,91,255,0.12)] pointer-events-auto"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCortexDesk(prev => !prev);
                      }}
                      className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-[14px] text-[9px] font-black uppercase tracking-widest border border-slate-200/30 transition-all duration-300 cursor-pointer"
                      title="Configure Cortex Options"
                    >
                      {/* Cortex Orbital Logo SVG */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[12px] h-[12px] text-indigo-500 group-hover:rotate-[30deg] transition-all duration-500">
                        <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-30" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="opacity-80" />
                        <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" className="opacity-80" />
                        <circle cx="12" cy="12" r="2.2" className="fill-indigo-500 stroke-none" />
                      </svg>
                      <span>Configure Cortex</span>
                    </button>

                    {/* Reset View Button */}
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('reset-cortex-transform'))}
                      className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-[14px] text-[9px] font-black uppercase tracking-widest border border-slate-200/30 transition-all duration-300 cursor-pointer"
                      title="Reset Canvas Zoom & Position"
                    >
                      <RotateCcw size={11} className="text-amber-500 group-hover:rotate-[-45deg] transition-all duration-300" />
                      <span>Reset View</span>
                    </button>

                    {/* Initialize Path Button */}
                    <button 
                      onClick={handleInitialize}
                      className="group relative overflow-hidden flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#4e5bff] to-[#7c3aed] text-white rounded-[14px] text-[9px] font-black uppercase tracking-widest shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-white/5 cursor-pointer"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                        animate={{ left: ['-100%', '100%'] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                        style={{ top: 0, height: '100%', width: '50%' }}
                      />
                      <div className="relative flex items-center gap-1.5">
                        <Check size={12} strokeWidth={3} />
                        <span>Initialize Path</span>
                        <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* ── Premium Re-Synthesis Progress Card Overlay ── */}
                {isLoading && (() => {
                  const activeMessage = thinkingMessages[Math.floor((progress / 100) * thinkingMessages.length) % thinkingMessages.length];
                  return (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/10 dark:bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto" style={{ perspective: '1000px' }}>
                      <div 
                        className="relative w-full max-w-[340px] h-[250px] rounded-[32px] overflow-hidden border border-white/20 shadow-[0_32px_80px_rgba(15,23,42,0.22)] flex flex-col justify-between p-8 text-white"
                        style={{ 
                          background: cardBgGradient,
                          transform: isFinishing 
                            ? 'rotateY(-90deg) rotateX(15deg) scale(0.8) translateY(-40px)' 
                            : 'rotateY(0deg) rotateX(0deg) scale(1) translateY(0px)',
                          opacity: isFinishing ? 0 : 1,
                          transition: 'transform 1.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 1.1s cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                      >
                        {/* self-contained inline styling for luxury keyframes */}
                        <style>{`
                           @keyframes tech-spin-clockwise {
                             from { transform: rotate(0deg); }
                             to { transform: rotate(360deg); }
                           }
                           @keyframes mesh-pulse {
                             0%, 100% { opacity: 0.35; transform: scale(1) translate(0px, 0px); }
                             50% { opacity: 0.6; transform: scale(1.15) translate(-15px, -10px); }
                           }
                        `}</style>

                        {/* Volumetric Glassmorphic Aurora glow spotlights */}
                        <div 
                          className="absolute inset-0 opacity-40 pointer-events-none select-none mix-blend-screen"
                          style={{
                            background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.45) 0%, transparent 60%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 70%)',
                            filter: 'blur(16px)',
                            animation: 'mesh-pulse 7s ease-in-out infinite'
                          }}
                        />

                        {/* Top content - extremely clean and minimalist */}
                        <div className="space-y-1.5 z-10 text-left">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                            Cortex Orchestrator
                          </span>
                          <h3 className="text-[20px] font-black text-white leading-tight">
                            {isFinishing ? "Cortex updated!" : "Redesigning your course"}
                          </h3>
                        </div>

                        {/* Claude-Code style dynamic thinking/success output */}
                        <div className="z-10 text-left flex items-center gap-3">
                          <div className="relative w-2 h-2 shrink-0">
                            {isFinishing ? (
                              <>
                                <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
                                <span className="absolute inset-0 rounded-full bg-emerald-400" />
                              </>
                            ) : (
                              <>
                                <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
                                <span className="absolute inset-0 rounded-full bg-white" />
                              </>
                            )}
                          </div>
                          <span className="text-[12px] font-black tracking-wide leading-tight text-white/95 font-mono">
                            {isFinishing ? (() => {
                              let successMsg = "Curriculum personalized to your academic profile.";
                              const lowerLbl = (goal || "").toLowerCase();
                              if (lowerLbl.includes('front') || lowerLbl.includes('ux') || lowerLbl.includes('design') || lowerLbl.includes('react') || lowerLbl.includes('web')) {
                                successMsg = "Curriculum optimized for modern Web Architecture.";
                              } else if (lowerLbl.includes('back') || lowerLbl.includes('sql') || lowerLbl.includes('mongo') || lowerLbl.includes('node') || lowerLbl.includes('api') || lowerLbl.includes('database')) {
                                successMsg = "Curriculum structured around Backend Engineering.";
                              } else if (lowerLbl.includes('devops') || lowerLbl.includes('cloud') || lowerLbl.includes('platform') || lowerLbl.includes('sre') || lowerLbl.includes('aws') || lowerLbl.includes('docker') || lowerLbl.includes('kubernetes')) {
                                successMsg = "Curriculum configured for Cloud & Platform SRE.";
                              } else if (lowerLbl.includes('ai') || lowerLbl.includes('machine') || lowerLbl.includes('data') || lowerLbl.includes('mlops') || lowerLbl.includes('nlp')) {
                                successMsg = "Curriculum tailored for Machine Learning & Data pipelines.";
                              }
                              return successMsg;
                            })() : activeMessage}
                            {!isFinishing && <span className="inline-block w-1.5 h-3.5 bg-white/90 ml-1 animate-pulse" />}
                          </span>
                        </div>

                        {/* Bottom decorative SVG Sunburst with radiating lines, matching reference image */}
                        <div className="absolute inset-x-0 bottom-0 h-[100px] pointer-events-none select-none overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 340 100" preserveAspectRatio="none">
                            <ellipse cx="170" cy="100" rx="170" ry="80" fill="rgba(255,255,255,0.08)" />

                            {/* Slow-spinning radiating lines extending from bottom center point (170, 100) */}
                            <g 
                              stroke="rgba(255,255,255,0.22)" 
                              strokeWidth="0.8"
                              style={{
                                transformOrigin: '170px 100px',
                                animation: isFinishing ? 'none' : 'tech-spin-clockwise 50s linear infinite',
                                transition: 'transform 2s cubic-bezier(0.25, 1, 0.5, 1)'
                              }}
                            >
                              {Array.from({ length: 31 }, (_, i) => {
                                const angle = Math.PI + (i * Math.PI) / 30;
                                const x2 = 170 + Math.cos(angle) * 300;
                                const y2 = 100 + Math.sin(angle) * 300;
                                return (
                                  <line 
                                    key={i} 
                                    x1="170" 
                                    y1="100" 
                                    x2={x2} 
                                    y2={y2} 
                                    strokeDasharray={i % 3 === 0 ? "2,4" : "none"}
                                    stroke={i % 2 === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}
                                    strokeWidth={i % 5 === 0 ? "1.0" : "0.5"}
                                  />
                                );
                              })}
                            </g>
                          </svg>
                        </div>

                        {/* Small subtle progress indicator bar at the bottom boundary */}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
                          <div 
                            className="h-full bg-white transition-all duration-300" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Floating Node Inspector HUD Card (Bottom-Left) */}
                {selectedNode && (
                  <div 
                    className="absolute bottom-10 left-10 z-30 max-w-sm p-5 rounded-[24px] border pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300 transition-all duration-700"
                    style={{
                      background: `linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.65) 100%)`,
                      borderColor: themeBorder,
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      boxShadow: `0 24px 60px rgba(0, 0, 0, 0.04), inset 0 0 20px ${themeColor}`,
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div 
                        className="p-2.5 rounded-xl border shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          borderColor: themeBorder,
                          color: themeNeon,
                        }}
                      >
                        <Brain size={16} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-slate-800 mb-1.5">{selectedNode.label}</h4>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 font-medium font-sans">{selectedNode.description}</p>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          )}



          {!isLoading && error && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-10 text-center bg-white/90 backdrop-blur-[6px]">
               <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border-2 border-rose-100">
                  <RotateCcw size={32} />
               </div>
               <h2 className="text-xl font-black text-slate-900 mb-2">Synthesis Interrupted</h2>
               <p className="max-w-xs text-[13px] text-slate-500 mb-6 font-medium leading-relaxed">{error}</p>
               <button onClick={() => performGeneration()} className="flex items-center gap-2 px-8 py-3.5 bg-[#4e5bff] text-white rounded-[16px] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] transition-all">
                  <RefreshCw size={14} /> Retry Synthesis
               </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PathExplorer;
