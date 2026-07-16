import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../context/Store';
import {
  ArrowRight, BookOpen, Clock, Plus, Zap, LayoutGrid,
  BrainCircuit, ClipboardCheck, Compass, FileText, Gauge, Play, ShieldCheck, Sparkles, Target, Trash2, ArrowUpRight, HardDrive
} from 'lucide-react';
import { MISSION_CATALOG, SCENARIO_CATALOG } from '../utils/cortexCoachEngine';

type Path = ReturnType<typeof useAppStore>['paths'][0];

const formatSignalLabel = (value?: string) => {
  if (!value) return 'No signal yet';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

/* ─── Light-Mode Category Tag Helper (Cursor Style) ────────────────────────── */
const getCategoryLabelColor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('front') || t.includes('ui') || t.includes('react') || t.includes('design') || t.includes('js') || t.includes('javascript') || t.includes('css')) {
    return 'text-amber-700 bg-amber-50/70 border-amber-200/60';
  }
  if (t.includes('back') || t.includes('api') || t.includes('db') || t.includes('sql') || t.includes('node') || t.includes('go') || t.includes('rust') || t.includes('postgresql')) {
    return 'text-blue-700 bg-blue-50/70 border-blue-200/60';
  }
  if (t.includes('ai') || t.includes('ml') || t.includes('machine') || t.includes('agent') || t.includes('llm') || t.includes('gpt') || t.includes('gemini') || t.includes('neural')) {
    return 'text-rose-700 bg-rose-50/70 border-rose-200/60';
  }
  if (t.includes('devops') || t.includes('cloud') || t.includes('docker') || t.includes('k8s') || t.includes('kubernetes') || t.includes('sre') || t.includes('aws')) {
    return 'text-purple-700 bg-purple-50/70 border-purple-200/60';
  }
  return 'text-emerald-700 bg-emerald-50/70 border-emerald-200/60';
};

/* ─── Interactive Binder Spine for the shelf rack ─────────────────────────── */
const BinderSpine: React.FC<{
  path: Path;
  index: number;
  onOpen: () => void;
  onHover?: (path: Path, element: HTMLButtonElement) => void;
  onLeave?: () => void;
}> = ({ path, index, onOpen, onHover, onLeave }) => {
  const totalModules = (path.phases || []).reduce((a, ph) => a + ph.modules.length, 0);
  const completedMods = (path.phases || []).reduce((a, ph) => a + ph.modules.filter(m => m.isCompleted).length, 0);
  const progress = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0;
  
  // Custom theme background color based on title keywords
  const t = path.title.toLowerCase();
  let color = 'bg-[#0f0b6b]'; // default deep navy
  if (t.includes('front') || t.includes('ui') || t.includes('react') || t.includes('design') || t.includes('js') || t.includes('javascript') || t.includes('css')) {
    color = 'bg-[#d97706]'; // amber
  } else if (t.includes('back') || t.includes('api') || t.includes('db') || t.includes('sql') || t.includes('node') || t.includes('go') || t.includes('rust') || t.includes('postgresql')) {
    color = 'bg-[#1e40af]'; // blue
  } else if (t.includes('ai') || t.includes('ml') || t.includes('machine') || t.includes('agent') || t.includes('llm') || t.includes('gpt') || t.includes('gemini') || t.includes('neural')) {
    color = 'bg-[#be123c]'; // rose
  } else if (t.includes('devops') || t.includes('cloud') || t.includes('docker') || t.includes('k8s') || t.includes('kubernetes') || t.includes('sre') || t.includes('aws')) {
    color = 'bg-[#6d28d9]'; // purple
  }

  const lean = index % 4 === 0 ? 3 : index % 3 === 0 ? -3 : 0;

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        layout="position"
        whileHover={{ y: -15, scale: 1.02, transition: { duration: 0.15 } }}
        onMouseEnter={e => onHover?.(path, e.currentTarget)}
        onMouseLeave={onLeave}
        onClick={onOpen}
        className={`relative ${color} rounded-md cursor-pointer overflow-visible mb-2`}
        style={{
          width: 54,
          height: 200,
          rotate: `${lean}deg`,
          boxShadow: '0 8px 20px rgba(13,23,48,0.15), inset -4px 0 8px rgba(0,0,0,0.2)'
        }}
      >
        {/* Spine line details */}
        <div className="absolute right-[-8px] top-[4px] bottom-[4px] w-[8px] bg-slate-100 border-y border-r border-slate-200 py-1 z-0 shadow-inner rounded-r">
          {[...Array(6)].map((_, i) => <div key={i} className="w-full h-[1px] bg-black/[0.04] my-2" />)}
        </div>
        <div className="absolute inset-y-0 left-0 w-[1px] bg-white/10 z-10" />
        <div className="absolute inset-y-0 right-0 w-[1px] bg-black/15 z-10" />

        {/* Top binder tag hole */}
        <div className="absolute top-2 inset-x-0 h-6 flex items-center justify-center border-b border-white/5 bg-black/10 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-white/20 border border-black/10" />
        </div>

        {/* Title */}
        <div className="absolute inset-0 top-8 bottom-12 flex items-center justify-center overflow-hidden px-1 z-10">
          <span 
            className="text-[9.5px] font-black text-white/95 uppercase tracking-wider select-none truncate whitespace-nowrap" 
            style={{ 
              writingMode: 'vertical-rl', 
              transform: 'rotate(180deg)',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {path.title}
          </span>
        </div>

        {/* Progress percent badge */}
        <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1 z-10 font-mono">
          <div className="px-1 py-0.5 bg-black/30 rounded border border-white/10">
            <span className="text-[8px] font-bold text-white/90">{progress}%</span>
          </div>
        </div>
      </motion.button>
    </div>
  );
};

/* ─── Courses Main Component ────────────────────────────────────────────────── */
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const {
    paths,
    deletePath,
    skills,
    memory,
    activeMission,
    activeScenario,
    startMission
  } = useAppStore();

  const hasAny = paths.length > 0;
  const evidenceLog = memory.evidenceLog || [];
  const openReflections = (memory.reflectionQueue || []).filter(prompt => prompt.status === 'open');
  const recentEvidence = evidenceLog[0] || null;

  // Resolve active path
  const activePath = useMemo(() => {
    return paths.find(p => p.progress < 100) || paths[0] || null;
  }, [paths]);

  const activeMissionConfig = activeMission ? MISSION_CATALOG[activeMission.missionId] : null;
  const activeScenarioConfig = activeScenario ? SCENARIO_CATALOG[activeScenario.scenarioId] : null;
  const activeTrack = activeMissionConfig || activeScenarioConfig;
  const activeTrackKind = activeMissionConfig ? 'Mission' : activeScenarioConfig ? 'Scenario' : null;
  const activeTrackStepIndex = activeMission ? activeMission.currentStepIndex : (activeScenario?.currentStepIndex || 0);
  const activeTrackStep = activeTrack?.steps[activeTrackStepIndex] || null;

  const strongestSkill = useMemo(() => {
    return Object.values(skills)
      .sort((a, b) => b.overallScore - a.overallScore)[0] || null;
  }, [skills]);

  const weakestConcept = useMemo(() => {
    return Object.values(memory.concepts || {})
      .sort((a, b) => {
        if (b.failureCount !== a.failureCount) return b.failureCount - a.failureCount;
        return a.strength - b.strength;
      })[0] || null;
  }, [memory.concepts]);

  // Lookup next module info
  const nextModuleInfo = useMemo(() => {
    if (!activePath || !activePath.phases) return null;
    for (const phase of activePath.phases) {
      for (const mod of phase.modules) {
        if (!mod.isCompleted) {
          return { phase, module: mod };
        }
      }
    }
    const lastPhase = activePath.phases[activePath.phases.length - 1];
    const lastMod = lastPhase?.modules[lastPhase.modules.length - 1];
    return lastMod ? { phase: lastPhase, module: lastMod } : null;
  }, [activePath]);

  // Mentor signal message
  const mentorSignal = useMemo(() => {
    if (activeTrack && activeTrackStep) {
      return `${activeTrackKind} is live. Focus on the current check: ${activeTrackStep.instruction}`;
    }
    if (openReflections.length > 0) {
      return `${openReflections.length} reflection ${openReflections.length === 1 ? 'prompt is' : 'prompts are'} open. Convert fresh work into memory before starting the next proof.`;
    }
    if (weakestConcept && weakestConcept.failureCount > 0) {
      return `${formatSignalLabel(weakestConcept.conceptId)} is the weakest signal. Run a recovery mission before adding more content.`;
    }
    if (!activePath) return "Your workspace is empty. Describe your goal to Cortex so the mentor can build a first mission around it.";
    const title = activePath.title;
    const progress = activePath.progress || 0;

    if (progress === 100) {
      return `"${title}" is complete. Start a new goal or run a transfer check to prove the skill in a fresh context.`;
    }
    if (progress === 0) {
      return `Start "${title}" with evidence capture so SARA can establish your baseline and recommend the next check.`;
    }
    if (progress > 80) {
      return `You are close on "${title}". Finish the final proof and run a transfer check before calling it durable.`;
    }
    return `Continue "${title}" (${progress}% done). The next useful step is proof, reflection, then progression.`;
  }, [activePath, activeTrack, activeTrackKind, activeTrackStep, openReflections.length, weakestConcept]);

  const handleResumeActiveSession = () => {
    if (!activePath || !nextModuleInfo) return;
    navigate(`/study/${activePath.id}/${nextModuleInfo.phase.id}/${nextModuleInfo.module.id}?entry=classroom`);
  };

  const handleStartMentorMission = () => {
    startMission('git_init_commit');
    if (activePath && nextModuleInfo) {
      navigate(`/study/${activePath.id}/${nextModuleInfo.phase.id}/${nextModuleInfo.module.id}?entry=mission`);
    }
  };

  const handleDeletePath = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deletePath(id);
    }
  };

  // Divide paths into latest 4 and legacy archive
  const sortedPaths = useMemo(() => {
    return [...paths].reverse(); // latest first
  }, [paths]);

  const latestPaths = useMemo(() => {
    return sortedPaths.slice(0, 4);
  }, [sortedPaths]);

  const archivePaths = useMemo(() => {
    return sortedPaths.slice(4);
  }, [sortedPaths]);

  // States for the Visual Shelf Tooltip
  const [hoveredPathData, setHoveredPathData] = useState<{ path: Path; x: number; y: number } | null>(null);

  const handleBinderHover = (path: Path, element: HTMLButtonElement) => {
    const shelfContainer = element.closest('.group\\/shelf');
    if (!shelfContainer) return;
    const containerRect = shelfContainer.getBoundingClientRect();
    const binderRect = element.getBoundingClientRect();
    
    const x = binderRect.left - containerRect.left + binderRect.width / 2;
    const y = binderRect.top - containerRect.top;
    
    setHoveredPathData({ path, x, y });
  };

  const handleBinderLeave = () => {
    setHoveredPathData(null);
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto classrooms-page-bg"
      style={{ background: 'transparent' }}
    >
      <div className="w-full max-w-[1020px] mx-auto px-6 sm:px-8 pt-10 pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 text-white animate-none">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#a5b4fc]/80 font-mono">Workspace Console</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Classrooms</h1>
            <p className="text-[12.5px] text-[#e0e7ff]/70 mt-1 max-w-[480px]">
              Mentor-led learning paths, evidence capture, and reflection loops for durable skill growth.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create')}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 h-9.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-[11.5px] font-black uppercase tracking-wider transition-all duration-150 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 cursor-pointer"
          >
            <Plus size={14} strokeWidth={3} />
            Generate Path
          </motion.button>
        </div>

        {/* ── Mentor Command Center Banner ── */}
        {(activeTrack || (activePath && nextModuleInfo)) && (
          <div
            className="relative rounded-2xl p-6 mb-8 border border-slate-200/50 bg-white text-slate-800 flex flex-col md:flex-row justify-between gap-6 shadow-[0_8px_30px_rgba(78,91,255,0.04)] overflow-hidden animate-none"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4e5bff] to-[#886cff]" />

            <div className="flex-1 flex flex-col justify-between relative z-10 pl-2">
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">
                    {activeTrack ? 'Active Mentor Track' : 'Next Evidence Target'}
                  </span>
                </div>

                <h2 className="text-[17px] font-black tracking-tight text-slate-850 font-display">
                  {activeTrack?.title || activePath?.title}
                </h2>

                <p className="text-[12px] text-slate-500 mt-1.5 font-sans font-medium">
                  {activeTrack && activeTrackStep ? (
                    <>
                      Current check: <span className="font-extrabold text-slate-700">{activeTrackStep.instruction}</span>
                    </>
                  ) : (
                    <>
                      Next proof: <span className="font-extrabold text-slate-700">{nextModuleInfo?.module.title}</span> &bull; <span className="text-slate-450 font-semibold">{nextModuleInfo?.phase.title}</span>
                    </>
                  )}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {activeTrack && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/40 text-[10px] font-bold text-slate-500 font-mono">
                      <Target size={11} className="text-[#4e5bff]" />
                      {activeTrackKind} step {activeTrackStepIndex + 1}/{activeTrack.steps.length}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/40 text-[10px] font-bold text-slate-500 font-mono">
                    <ClipboardCheck size={11} className="text-emerald-500" />
                    {evidenceLog.length} evidence records
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/40 text-[10px] font-bold text-slate-500 font-mono">
                    <FileText size={11} className="text-amber-500" />
                    {openReflections.length} open reflections
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {activePath && nextModuleInfo && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResumeActiveSession}
                    className="inline-flex items-center justify-center gap-2 h-8.5 px-5 rounded-xl bg-gradient-to-r from-[#4e5bff] to-[#6c5ce7] text-white font-black text-[11px] uppercase tracking-wider transition-colors duration-150 cursor-pointer shadow-md shadow-indigo-900/10"
                  >
                    <Play size={10} fill="currentColor" />
                    Resume Workspace
                    <ArrowRight size={11} />
                  </motion.button>
                )}
                {!activeTrack && activePath && nextModuleInfo && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartMentorMission}
                    className="inline-flex items-center justify-center gap-1.5 h-8.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-black text-[11px] uppercase tracking-wider transition-colors duration-150 cursor-pointer border border-slate-200/80 shadow-sm"
                  >
                    <Target size={11} />
                    Start Git Mission
                  </motion.button>
                )}
              </div>
            </div>

            {/* SARA Speech Panel */}
            <div className="w-full md:w-[300px] shrink-0 flex flex-col justify-between relative z-10 border-l border-slate-100 pl-5 md:pl-6">
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles size={12} className="text-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">
                    Mentor Signal
                  </span>
                </div>
                <div className="bg-[#05070a] border border-slate-900 p-4 rounded-xl shadow-inner min-h-[85px] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[8.5px] font-black text-[#10b981] uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                    Live
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-350 italic font-mono pr-4 select-none">
                    "{mentorSignal}"
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[9px] uppercase tracking-wider font-black text-slate-450 font-mono">Weak Signal</span>
                <span className="text-[10.5px] font-bold text-slate-655 font-mono truncate max-w-[170px]">
                  {weakestConcept ? formatSignalLabel(weakestConcept.conceptId) : 'No signal'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Neat White Console Sheet ── */}
        <div
          className="bg-white rounded-3xl p-6.5 sm:p-8 border border-slate-200/60 shadow-[0_12px_36px_rgba(13,23,48,0.02)] min-h-[50vh] mt-4"
        >
          {hasAny ? (
            <>
              {/* Learning OS Signals */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none transition-all hover:scale-[1.02] hover:bg-white hover:shadow-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                  <div className="w-9 h-9 rounded-lg bg-white text-[#4e5bff] flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-black text-slate-800 leading-none font-mono">
                      {paths.filter(p => p.progress < 100).length}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider block font-mono">Active Paths</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none transition-all hover:scale-[1.02] hover:bg-white hover:shadow-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                  <div className="w-9 h-9 rounded-lg bg-white text-emerald-500 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <ClipboardCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-black text-slate-800 leading-none font-mono">
                      {evidenceLog.length}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider block font-mono">Evidence</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none transition-all hover:scale-[1.02] hover:bg-white hover:shadow-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                  <div className="w-9 h-9 rounded-lg bg-white text-amber-500 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-black text-slate-800 leading-none font-mono">
                      {openReflections.length}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider block font-mono">Reflections</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none transition-all hover:scale-[1.02] hover:bg-white hover:shadow-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                  <div className="w-9 h-9 rounded-lg bg-white text-rose-500 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Gauge size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-black text-slate-800 leading-none font-mono">
                      {strongestSkill ? `${strongestSkill.overallScore}%` : '0%'}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider block font-mono">Top Skill</span>
                  </div>
                </div>
              </div>

              {/* Feedback Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">
                <div className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-[0_1px_3px_rgba(13,23,48,0.01)] transition-all duration-205 hover:shadow-[0_4px_16px_rgba(13,23,48,0.04)]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">Latest Evidence</span>
                  </div>
                  <h3 className="text-[12.5px] font-extrabold text-slate-850 font-display line-clamp-1">
                    {recentEvidence ? recentEvidence.title.replace(/^Module Evidence:\s*/, '').replace(/^Mission Evidence:\s*/, '') : 'No evidence captured'}
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-1.5 line-clamp-2">
                    {recentEvidence ? recentEvidence.summary : 'Complete a workspace session or trigger a milestone proof to populate SARA\'s validation board.'}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-[0_1px_3px_rgba(13,23,48,0.01)] transition-all duration-205 hover:shadow-[0_4px_16px_rgba(13,23,48,0.04)]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <BrainCircuit size={14} className="text-[#4e5bff]" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 font-mono">Weak Signal</span>
                  </div>
                  <h3 className="text-[12.5px] font-extrabold text-slate-850 font-display line-clamp-1">
                    {weakestConcept ? formatSignalLabel(weakestConcept.conceptId) : 'No weak concept'}
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-1.5 line-clamp-2">
                    {weakestConcept
                      ? `${weakestConcept.failureCount} error signals logged. Estimated memory retention: ${Math.round(weakestConcept.strength)}h.`
                      : 'Retention indicators look stable. Core checks are registered and validated.'}
                  </p>
                  {weakestConcept && weakestConcept.failureCount > 0 && (
                    <div className="mt-2.5 flex items-center">
                      <span className="text-[8.5px] font-black text-rose-700 bg-rose-50/70 border border-rose-100 rounded px-1.5 py-0.5 uppercase tracking-wider font-mono">
                        ⚠️ Recovery Priority
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-[0_1px_3px_rgba(13,23,48,0.01)] transition-all duration-205 hover:shadow-[0_4px_16px_rgba(13,23,48,0.04)]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Target size={14} className="text-rose-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">Next Mentor Move</span>
                  </div>
                  <h3 className="text-[12.5px] font-extrabold text-slate-850 font-display line-clamp-1">
                    {activeTrack ? `${activeTrackKind} Check` : openReflections.length > 0 ? 'Reflection Challenge' : 'Proof Capture'}
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-1.5 line-clamp-2">
                    {activeTrackStep?.instruction || openReflections[0]?.prompt || 'Resume the current roadmap focus node and write evidence validation.'}
                  </p>
                </div>
              </div>

              {/* ── Active Curriculum Shelf ── */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff]" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Active Curriculum Shelf (Last 4 Paths)</span>
                </div>
                
                <div className="relative pt-6 pb-16 overflow-visible group/shelf perspective-[1200px] mb-4">
                  <style>{`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                  `}</style>

                  {/* Bounds-Protected Floating Preview Card */}
                  <AnimatePresence>
                    {hoveredPathData && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                          left: hoveredPathData.x,
                          top: hoveredPathData.y - 8,
                          transform: 'translateX(-50%) translateY(-100%)',
                        }}
                      >
                        <div 
                          className="w-64 p-4.5 rounded-xl text-left relative bg-white border border-slate-200/80 shadow-[0_12px_36px_rgba(13,23,48,0.08)]"
                        >
                          {/* Title */}
                          <div className="text-[13px] font-black text-slate-850 leading-snug mb-1 font-display">
                            {hoveredPathData.path.title}
                          </div>
                          {/* Goal description */}
                          <div className="text-[10.5px] text-slate-450 line-clamp-2 mb-3 leading-relaxed">
                            {hoveredPathData.path.goal}
                          </div>
                          {/* Horizontal Rule */}
                          <div className="h-px bg-slate-100 w-full mb-3" />
                          
                          {/* Meta stats */}
                          {(() => {
                            const path = hoveredPathData.path;
                            const totalModules = (path.phases || []).reduce((a, ph) => a + ph.modules.length, 0);
                            const completedMods = (path.phases || []).reduce((a, ph) => a + ph.modules.filter(m => m.isCompleted).length, 0);
                            const progress = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0;
                            return (
                              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 font-mono">
                                <span>{completedMods}/{totalModules} Modules</span>
                                <span className="text-[#4e5bff]">{progress}% Complete</span>
                              </div>
                            );
                          })()}
                          {/* Mini Pointer Arrow */}
                          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Wooden ledger shelf */}
                  <div className="absolute bottom-10 left-0 right-0 h-8 z-0">
                    <div className="absolute inset-0 bg-white border border-slate-200 shadow-sm origin-bottom scale-x-[1.01] rounded-sm" style={{ transform: 'rotateX(72deg)' }} />
                    <div className="absolute bottom-[-3px] left-0 right-0 h-3 bg-slate-50 border-x border-b border-slate-250 rounded-b shadow-md z-10" />
                  </div>

                  {/* Horizontal Scroll container */}
                  <div className="relative flex justify-start overflow-x-auto pt-8 px-6 scroll-smooth no-scrollbar pb-8 overflow-y-visible">
                    <div className="flex gap-[6px] items-end">
                      {latestPaths.map((path, idx) => (
                        <BinderSpine
                          key={path.id}
                          path={path}
                          index={idx}
                          onOpen={() => navigate(`/path/${path.id}`)}
                          onHover={handleBinderHover}
                          onLeave={handleBinderLeave}
                        />
                      ))}

                      {/* Add card as a binder style placeholder */}
                      <motion.button
                        onClick={() => navigate('/create')}
                        whileHover={{ y: -8, transition: { duration: 0.15 } }}
                        className="flex-shrink-0 relative border-2 border-dashed border-slate-250 hover:border-[#4e5bff]/30 bg-slate-50/50 hover:bg-slate-50 rounded-md cursor-pointer flex flex-col items-center justify-center mb-2 text-slate-400 hover:text-[#4e5bff] transition-colors duration-200"
                        style={{
                          width: 54,
                          height: 200,
                          boxShadow: '0 4px 12px rgba(13,23,48,0.03)'
                        }}
                      >
                        <Plus size={16} strokeWidth={3} className="hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-wider font-mono mt-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Add Path</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Archive List (for legacy paths beyond the last 4) */}
              {archivePaths.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <HardDrive size={13} className="text-slate-450 animate-pulse" />
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Legacy Archives ({archivePaths.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {archivePaths.map(path => {
                      const totalModules = (path.phases || []).reduce((a, ph) => a + ph.modules.length, 0);
                      const completedMods = (path.phases || []).reduce((a, ph) => a + ph.modules.filter(m => m.isCompleted).length, 0);
                      const progress = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0;

                      return (
                        <div
                          key={path.id}
                          onClick={() => navigate(`/path/${path.id}`)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200/70 bg-slate-50/20 hover:bg-slate-50/60 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[12px] font-black text-slate-750 truncate font-display group-hover:text-[#4e5bff] transition-colors">{path.title}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono px-1.5 py-0.5 rounded bg-white border border-slate-150 shrink-0">{progress}%</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-450 font-mono">{completedMods}/{totalModules} Units</span>
                            <button
                              onClick={(e) => handleDeletePath(path.id, path.title, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Delete Legacy Path"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Zero saved paths empty state ── */
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-455 flex items-center justify-center mb-5 shadow-sm">
                <LayoutGrid size={20} strokeWidth={2.0} />
              </div>
              <h2 className="text-[16px] font-black text-slate-800 font-display mb-1.5">
                No active paths
              </h2>
              <p className="text-[12px] text-slate-455 leading-relaxed font-sans font-medium mb-6">
                Tell Cortex what skills or topics you want to master. We will compile a custom roadmap schedule and resource guidelines.
              </p>
              <motion.button
                onClick={() => navigate('/create')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-xl bg-[#0d0d0d] hover:opacity-90 text-white font-black text-[11.5px] uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md"
              >
                <Zap size={11} fill="currentColor" />
                Initialize Path
              </motion.button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Courses;
