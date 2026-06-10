import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { generateLearningPlan, getGeminiProviderErrorMessage } from '../services/geminiService';
import { roadmapPreviews } from './roadmapPreviews';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';
import type { ComplexityLevel, StudyLens, ScholarPersona } from '../features/study/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, Zap, 
  RotateCcw, Check, Brain, 
  Trophy, Rocket, Lightbulb,
  ArrowRight, Maximize2, Minimize2, Loader,
  Target, Info, RefreshCw, X
} from 'lucide-react';

const PathExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPath } = useAppStore();
  
  const goal = searchParams.get('goal') || 'New Knowledge Path';
  const track = searchParams.get('track') || 'Custom Roadmap';

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [pathMap, setPathMap] = useState<ConceptMap | null>(null);
  const [customIntent, setCustomIntent] = useState('');
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeComplexity, setActiveComplexity] = useState<ComplexityLevel>('overview');
  const [activeStudyLens, setActiveStudyLens] = useState<StudyLens>('roadmap');
  const [activeScholarPersona, setActiveScholarPersona] = useState<ScholarPersona>('visionary');
  const containerRef = useRef<HTMLDivElement>(null);

  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    };
  }, []);

  const simulatedLogs = React.useMemo(() => {
    const logs = [
      { id: 1, tag: 'SYSTEM', msg: 'Waking Cortex-3-Flash neural agent instance...', type: 'info' as const, progress: 5 },
      { id: 2, tag: 'SYNAPSE', msg: 'Establishing high-fidelity synaptic network handshake...', type: 'info' as const, progress: 15 },
      { id: 3, tag: 'SEMANTIC', msg: `Deconstructing goal semantics: "${goal}"`, type: 'info' as const, progress: 30 },
      { id: 4, tag: 'ACADEMIC', msg: `Ingesting curriculum mapping parameters & prerequisite guidelines...`, type: 'info' as const, progress: 50 },
      { id: 5, tag: 'STRUCTURE', msg: 'Synthesizing dynamic concept nodes, logical paths, & durations...', type: 'info' as const, progress: 70 },
      { id: 6, tag: 'INTEGRITY', msg: 'Validating type schema mapping & dependency safety keys...', type: 'info' as const, progress: 85 },
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

  const performGeneration = async (
    intentModifier: string = '',
    overrideComplexity?: ComplexityLevel,
    overrideStudyLens?: StudyLens,
    overrideScholarPersona?: ScholarPersona
  ) => {
    setIsLoading(true);
    setProgress(0);
    setElapsedTime(0);
    setError(null);
    setSelectedNode(null);
    
    // Clear any previous intervals
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

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

    // Check if it matches a predefined key in roadmapPreviews
    const previewKey = Object.keys(roadmapPreviews).find(key => {
      const preview = roadmapPreviews[key];
      return (
        key.toLowerCase() === normalizedGoal ||
        preview.title.toLowerCase() === normalizedGoal ||
        normalizedGoal.includes(key.toLowerCase()) ||
        preview.title.toLowerCase().includes(normalizedGoal)
      );
    });

    const isCustomCalibration = overrideComplexity !== undefined || overrideStudyLens !== undefined || overrideScholarPersona !== undefined;
    const complexityVal = overrideComplexity || activeComplexity;
    const studyLensVal = overrideStudyLens || activeStudyLens;
    const scholarPersonaVal = overrideScholarPersona || activeScholarPersona;

    const matchingPreview = previewKey ? roadmapPreviews[previewKey] : null;
    const shouldBuildLocally = !isCustomCalibration && (!!matchingPreview || isCatalogTrack || !!selectedModulesParam);

    if (shouldBuildLocally) {
      // Get the preview data, either from predefined templates or construct it dynamically
      const basePreview = matchingPreview || {
        title: goal.endsWith('Roadmap') ? goal : `${goal} Roadmap`,
        description: `Learn how to master ${goal} from absolute prerequisites to production implementation and best practices.`,
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
      };

      const selectedSet = selectedModulesParam 
        ? new Set(selectedModulesParam.split(',').map(s => s.trim().toLowerCase()))
        : null;

      const filteredPhases = basePreview.phases.map(phase => {
        const filteredModules = phase.modules.filter(mod => {
          if (!selectedSet) return true;
          return selectedSet.has(mod.title.trim().toLowerCase());
        });
        return {
          title: phase.title,
          description: phase.description,
          modules: filteredModules.map(mod => ({
            title: mod.title,
            description: mod.description,
            estimatedMinutes: 30 + ((mod.title.length * 7) % 6) * 10,
            keyConcepts: [
              mod.title,
              ...mod.description.split(/[,.;]/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 35).slice(0, 3)
            ]
          }))
        };
      }).filter(phase => phase.modules.length > 0);

      const planData = {
        title: basePreview.title,
        description: basePreview.description,
        phases: filteredPhases
      };

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
              const modId = `mod-${pIdx}-${mIdx}`;
              nodes.push({ id: modId, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
              relationships.push({ from: phaseId, to: modId, label: 'module' });
            });
          });

          setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
          
          setTimeout(() => {
            setIsLoading(false);
          }, 600);
        } else {
          setProgress(currentProgress);
        }
      }, 80);
      return;
    }

    try {
      const usePreview = !isCustomCalibration || ['spark', 'snapshot', 'overview'].includes(complexityVal);

      const planData = await generateLearningPlan(
        `Goal: ${goal}
Track: ${track}
${intentModifier ? `INTENT: ${intentModifier}` : ''}
CALIBRATION PARAMETERS:
- Cognitive Density (Complexity): ${complexityVal}
- Study Lens: ${studyLensVal}
- Scholar Persona: ${scholarPersonaVal}
Please structure the curriculum phases and modules to match this Study Lens (e.g. emphasize practice exercises if 'practice'), adjust module depth based on the Cognitive Density, and tailor the terminology to fit the Scholar Persona.`,
        '',
        45,
        'beginner',
        'Mastery',
        new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        'Foundational',
        undefined,
        { 
          mode: usePreview ? 'preview' : 'full', 
          timeoutMs: usePreview ? 28_000 : 75_000,
          studyLens: studyLensVal,
          scholarPersona: scholarPersonaVal,
          cognitiveDensity: complexityVal
        },
      );

      if (!planData || !planData.phases) throw new Error("Failed to generate blueprint.");

      // Stop normal ticking
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

      setPlan(planData);
      const nodes: ConceptNode[] = [{ id: 'root', label: planData.title || goal, description: planData.description || 'Mastery Path', depth: 0 }];
      const relationships: any[] = [];

      planData.phases.forEach((phase: any, pIdx: number) => {
        const phaseId = `phase-${pIdx}`;
        nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
        relationships.push({ from: 'root', to: phaseId, label: 'phase' });
        phase.modules.forEach((mod: any, mIdx: number) => {
          const modId = `mod-${pIdx}-${mIdx}`;
          nodes.push({ id: modId, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
          relationships.push({ from: phaseId, to: modId, label: 'module' });
        });
      });

      setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
      
      // Update local calibration states to stay fully synchronized
      if (overrideComplexity) setActiveComplexity(overrideComplexity);
      if (overrideStudyLens) setActiveStudyLens(overrideStudyLens);
      if (overrideScholarPersona) setActiveScholarPersona(overrideScholarPersona);

      // Flash to 100%
      setProgress(100);

      // Immersive completion delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1200);

    } catch (err: any) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setError(getGeminiProviderErrorMessage(err) || 'Synthesis failed. Please try again.');
      setIsLoading(false);
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
    };
  }, [goal, track, searchParams]);

  const handleInitialize = () => {
    if (!plan) return;
    const phasesWithIds = plan.phases.map((phase: any) => ({
      ...phase,
      id: generateSimpleId(),
      modules: phase.modules.map((mod: any) => ({
        ...mod, id: generateSimpleId(), isCompleted: false, keyConcepts: mod.keyConcepts || [],
        resources: [], dependsOnModuleIds: [], userNotes: '', estimatedMinutes: mod.estimatedMinutes || 30
      }))
    }));
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
    <div ref={containerRef} className={`flex flex-col bg-transparent overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white' : 'flex-1 h-full'}`}>
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-16 bg-white/80 backdrop-blur-md border-b border-black/[0.04] px-5 sm:px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-[#4e5bff] hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 leading-none mb-1">Previewing Neural Roadmap</p>
            <h1 className="text-[15px] font-black text-slate-900 truncate max-w-[400px]">{goal}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleFullscreenToggle} className="p-2 rounded-xl border-2 border-slate-50 text-slate-400 hover:text-[#4e5bff] transition-all">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {!isLoading && !error && (
            <button onClick={handleInitialize} className="flex items-center gap-2.5 px-6 py-2.5 bg-[#4e5bff] text-white rounded-[14px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] active:scale-95 transition-all">
              <Check size={14} strokeWidth={3} /> Initialize Path
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        
        {/* Main Canvas */}
        <div className="flex-1 relative bg-transparent overflow-hidden">
          {pathMap && (
             <div className="w-full h-full p-4 sm:p-6 animate-in fade-in duration-700 relative">
                {/* Fallback Warning Banner */}
                {plan?.isFallback && (
                  <div className="absolute top-8 left-8 right-8 z-30 p-4 rounded-[16px] bg-[#fff9eb] border border-amber-200/50 shadow-lg text-slate-800 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                        <Info size={14} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-900 leading-none">Synthesis Fallback Activated</h4>
                        <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                          SARA encountered a temporary AI rate-limit or timeout. We've loaded a structured foundational roadmap for <strong>{goal}</strong>. You can customize the modules on the fly or try re-synthesizing in the Tune panel on the right.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="w-full h-full bg-white rounded-[24px] ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
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
                   />
                </div>
                
                {/* Centered Floating Initialize Path CTA */}
                {!isLoading && !error && plan && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0.3 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50"
                  >
                    <button 
                      onClick={handleInitialize}
                      className="group flex items-center gap-3 px-10 py-4 bg-[#4e5bff] text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_12px_40px_-8px_rgba(78,91,255,0.5)] hover:shadow-[0_16px_50px_-6px_rgba(78,91,255,0.65)] hover:scale-[1.04] active:scale-95 transition-all duration-300 border border-indigo-400/20"
                    >
                      <div className="relative">
                        <Check size={16} strokeWidth={3} className="relative z-10" />
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse" />
                      </div>
                      <span>Initialize Path</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}

                {/* Floating Node Inspector HUD Card (Bottom-Left) */}
                {selectedNode && (
                  <div className="absolute bottom-10 left-10 z-30 max-w-sm p-5 rounded-[24px] bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_20px_40px_rgba(78,91,255,0.08)] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-indigo-50/80 text-[#4e5bff] shrink-0">
                        <Brain size={16} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-slate-900 mb-1.5">{selectedNode.label}</h4>
                        <p className="text-[11px] leading-relaxed text-slate-500 font-medium font-['Newsreader'] italic">{selectedNode.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating Glass Calibration Hub Panel */}
                <AnimatePresence>
                  {isPanelOpen && (
                    <motion.div
                      initial={{ x: 360, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 360, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      className="absolute top-6 right-6 bottom-6 z-40 w-[320px] bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.12)] rounded-[26px] flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar pointer-events-auto"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-[#4e5bff] animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#4e5bff]">Tune Roadmap</p>
                        </div>
                        <button 
                          onClick={() => setIsPanelOpen(false)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Refine Architecture Option Cards */}
                      <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Refine Architecture</p>
                        <div className="grid gap-2">
                          {[
                            { id: 'fundamental', label: 'More Fundamentals', icon: Lightbulb, color: 'text-amber-500' },
                            { id: 'deep', label: 'Deeper Technicals', icon: Brain, color: 'text-indigo-500' },
                            { id: 'practical', label: 'Project Focused', icon: Rocket, color: 'text-rose-500' },
                            { id: 'exam', label: 'Certification Prep', icon: Trophy, color: 'text-emerald-500' },
                          ].map(opt => (
                            <button key={opt.id} onClick={() => performGeneration(`Adjust the curriculum to be more ${opt.label.toLowerCase()}.`)}
                              className="w-full flex items-center justify-between p-3.5 rounded-[16px] border border-black/[0.04] bg-white/50 hover:border-indigo-100 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all text-left group cursor-pointer animate-in fade-in duration-200">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-white ring-1 ring-slate-100 shadow-sm ${opt.color}`}><opt.icon size={13} /></div>
                                <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-[#4e5bff]">{opt.label}</span>
                              </div>
                                <ArrowRight size={13} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all animate-pulse" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Calibration Section */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Custom Calibration</p>
                        <div className="relative">
                          <textarea value={customIntent} onChange={(e) => setCustomIntent(e.target.value)} placeholder="e.g. Add more hands-on labs..."
                            className="w-full h-24 p-3.5 rounded-[18px] bg-slate-50/50 border border-black/[0.04] text-[10.5px] font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all resize-none placeholder:text-slate-300" />
                          <button onClick={() => customIntent.trim() && performGeneration(customIntent)}
                            className="absolute bottom-2.5 right-2.5 w-7.5 h-7.5 rounded-full bg-[#4e5bff] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all cursor-pointer">
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Context Wizard Link Footer */}
                      <div className="pt-4 border-t border-black/[0.04] mt-auto">
                         <button onClick={() => navigate(`/create?goal=${encodeURIComponent(goal)}&track=${encodeURIComponent(track)}`)}
                           className="w-full group flex items-center justify-between p-3.5 rounded-[18px] bg-slate-50/50 border border-black/[0.04] hover:border-indigo-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
                            <div className="flex flex-col items-start">
                              <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Context Wizard</span>
                              <span className="text-[10.5px] font-black text-[#4e5bff]">Refine with Files</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          )}

          {/* Overlays */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-[8px] animate-in fade-in duration-300">
               <div className="flex flex-col items-center mb-8 text-center">
                 <div className="relative flex items-center justify-center mb-6">
                   {/* Glowing aura background */}
                   <div className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-500 ${progress >= 100 ? 'bg-emerald-500/10' : 'bg-indigo-500/10'} animate-pulse`} />
                   
                   {/* SVG Circular Loader */}
                   <svg className="w-32 h-32 transform -rotate-90 z-10" viewBox="0 0 100 100">
                     <circle
                       cx="50"
                       cy="50"
                       r="44"
                       stroke="rgba(78, 91, 255, 0.08)"
                       strokeWidth="4.5"
                       fill="transparent"
                     />
                     <motion.circle
                       cx="50"
                       cy="50"
                       r="44"
                       stroke={progress >= 100 ? '#10b981' : 'url(#progress-gradient)'}
                       strokeWidth="5.5"
                       fill="transparent"
                       strokeDasharray={2 * Math.PI * 44}
                       strokeDashoffset={2 * Math.PI * 44 - (progress / 100) * 2 * Math.PI * 44}
                       strokeLinecap="round"
                       transition={{ duration: 0.15, ease: 'easeOut' }}
                     />
                     <defs>
                       <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor="#4e5bff" />
                         <stop offset="100%" stopColor="#8b5cf6" />
                       </linearGradient>
                     </defs>
                   </svg>

                   {/* Center Millisecond / Progress Counter */}
                   <div className="absolute flex flex-col items-center justify-center z-20">
                     {progress >= 100 ? (
                       <motion.div
                         initial={{ scale: 0.5, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                         className="flex items-center justify-center"
                       >
                         <Check size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" strokeWidth={3.5} />
                       </motion.div>
                     ) : (
                       <>
                         <span className="text-[24px] font-black tracking-tight text-slate-800 font-mono leading-none">
                           {progress.toFixed(0)}%
                         </span>
                         <span className="text-[9px] font-black uppercase tracking-wider text-[#4e5bff] mt-1.5 font-mono">
                           {elapsedTime.toFixed(1)}s
                         </span>
                       </>
                     )}
                   </div>
                 </div>

                 <div className="space-y-1">
                   <h3 className="text-xl sm:text-[22px] font-black tracking-tight text-slate-900 leading-none">
                     {progress >= 100 ? 'Neural Path Calibrated' : 'Synthesizing Neural Path'}
                   </h3>
                   <div className="mt-3 flex items-center justify-center">
                     <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.22em] border shadow-sm ${progress >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100/60 animate-pulse'}`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
                       {progress >= 100 ? 'Cortex blueprint fully structured' : 'Cortex AI is compiling modular checkpoints'}
                     </span>
                   </div>
                 </div>
               </div>

               {/* Futuristic Cyber Command Terminal */}
               <div className="flex flex-col w-full max-w-[620px] space-y-3 z-10 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between px-3">
                   <p className="text-[9.5px] font-black uppercase tracking-[0.3em] text-[#4e5bff] flex items-center gap-1.5 leading-none">
                     <Brain size={11} className="animate-pulse" /> Agent Activity Terminal
                   </p>
                   <div className="flex items-center gap-2">
                     {progress >= 100 ? (
                       <>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-500">Ready</span>
                       </>
                     ) : (
                       <>
                         <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                         <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Processing...</span>
                       </>
                     )}
                   </div>
                 </div>
                 
                 <div
                   style={{
                     background: 'rgba(255, 255, 255, 0.88)',
                     border: '1.5px solid rgba(26, 115, 232, 0.12)',
                     boxShadow: '0 24px 64px -16px rgba(26, 115, 232, 0.06), 0 8px 24px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                     backdropFilter: 'blur(20px)',
                     WebkitBackdropFilter: 'blur(20px)',
                   }}
                   className="rounded-[24px] p-6 min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-3"
                 >
                   {simulatedLogs.map((log) => (
                     <div key={log.id} className="flex gap-2.5 items-start font-mono text-[11.5px] leading-relaxed animate-in slide-in-from-left-2 duration-300">
                       <span className="text-indigo-600 font-bold select-none shrink-0">[{log.tag}]</span>
                       <p className={`font-mono ${log.type === 'success' ? 'text-emerald-600 font-extrabold' : 'text-slate-700 font-medium'}`}>
                         {log.msg}
                       </p>
                     </div>
                   ))}
                   {progress < 100 && (
                     <div className="flex gap-2 items-start font-mono text-[11.5px] leading-relaxed text-slate-500 animate-pulse">
                       <span className="text-indigo-500 font-bold select-none shrink-0">&gt;_</span>
                       <span>Awaiting synaptic response...</span>
                       <span className="inline-block w-1.5 h-3.5 bg-indigo-500 animate-[ping_1.2s_infinite] ml-1" />
                     </div>
                   )}
                 </div>
               </div>
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
