import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  CheckCircle2, Lock, Play, Zap,
  GraduationCap, ArrowLeft, ChevronDown, ChevronUp,
  Network, List, Clock, BookOpen, Layers, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { StudyModule } from '../types';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';
import { triggerBackgroundPreGeneration } from '../services/geminiService';

const PathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths, loadPathDetail, saveModuleContent, saveModuleCitations, replaceModuleResources, updatePathCalibration } = useAppStore();
  const path = paths.find(p => p.id === id);

  useEffect(() => {
    if (id) {
      void loadPathDetail(id);
    }
  }, [id]);

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ '0': true });
  const [viewMode, setViewMode] = useState<'map' | 'curriculum'>('map');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (path && path.phases) {
      const next = path.phases.flatMap(ph => ph.modules).find(m => !m.isCompleted) || path.phases[0]?.modules[0];
      if (next && !next.generatedContent) {
        const phase = path.phases.find(p => p.modules.some(m => m.id === next.id));
        if (phase) {
          const timer = setTimeout(() => {
            triggerBackgroundPreGeneration(
              path.id, phase.id, next.id, next.title,
              next.keyConcepts || [], path.goal, next.resources || [],
              saveModuleContent, saveModuleCitations, replaceModuleResources,
              path.studyLens || 'roadmap',
              path.scholarPersona || 'visionary',
              path.cognitiveDensity || 'overview'
            );
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [path?.id, path?.studyLens, path?.scholarPersona, path?.cognitiveDensity]);

  const pathMap = useMemo(() => {
    if (!path) return null;
    const nodes: ConceptNode[] = [];
    const relationships: any[] = [];
    nodes.push({ id: 'root', label: path.title, description: path.goal, depth: 0 });
    (path.phases || []).forEach(phase => {
      const phaseId = `phase-${phase.id}`;
      nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
      relationships.push({ from: 'root', to: phaseId, label: 'phase' });
      phase.modules.forEach(mod => {
        nodes.push({ id: mod.id, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
        relationships.push({ from: phaseId, to: mod.id, label: 'module' });
        mod.dependsOnModuleIds?.forEach(depId => {
          relationships.push({ from: depId, to: mod.id, label: 'prerequisite' });
        });
      });
    });
    return { centralConcept: path.title, nodes, relationships } as ConceptMap;
  }, [path]);

  const togglePhase = (idx: number) => setExpandedPhases(prev => ({ ...prev, [idx]: !prev[idx] }));

  if (!path) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center" style={{ background: 'transparent' }}>
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <GraduationCap size={28} className="text-slate-300" />
      </div>
      <h2 className="text-[18px] font-semibold text-slate-900 mb-1">Path not found</h2>
      <p className="text-[13px] text-slate-500 mb-5">This learning path doesn't exist or was removed.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-[13px] font-medium text-[#4e5bff] hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={14} /> Back to Roadmaps
      </button>
    </div>
  );

  const isModuleLocked = (module: StudyModule) => {
    if (!module.dependsOnModuleIds?.length) return false;
    const all = (path.phases || []).flatMap(p => p.modules);
    return module.dependsOnModuleIds.some(depId => {
      const m = all.find(x => x.id === depId);
      return m && !m.isCompleted;
    });
  };

  const totalModules   = (path.phases || []).reduce((acc, ph) => acc + ph.modules.length, 0);
  const completedMods  = (path.phases || []).reduce((acc, ph) => acc + ph.modules.filter(m => m.isCompleted).length, 0);
  const totalMinutes   = (path.phases || []).reduce((acc, ph) => acc + ph.modules.reduce((a, m) => a + (m.estimatedMinutes || 0), 0), 0);

  const handleLaunch = () => {
    if (!path.phases || path.phases.length === 0) return;
    const next = path.phases.flatMap(ph => ph.modules).find(m => !m.isCompleted) || path.phases[0]?.modules[0];
    if (!next) return;
    const phase = path.phases.find(p => p.modules.some(m => m.id === next.id));
    if (phase) navigate(`/study/${path.id}/${phase.id}/${next.id}?entry=classroom`);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <header
        className="relative z-10 shrink-0 flex items-center justify-between px-5 py-3.5 sm:px-8"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </button>
          <div>
            <p className="section-label mb-0.5">Learning Path</p>
            <h1
              className="text-[15px] font-semibold text-slate-900 truncate max-w-[280px] sm:max-w-[500px]"
              style={{ letterSpacing: '-0.01em' }}
            >
              {path.title}
            </h1>
          </div>
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
        >
          {([
            { mode: 'map', icon: Network, label: 'Map' },
            { mode: 'curriculum', icon: List, label: 'List' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all"
              style={
                viewMode === mode
                  ? { background: '#fff', color: '#4e5bff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: '#94a3b8' }
              }
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative z-10">

        {viewMode === 'map' ? (
          <div className={isFullScreen ? 'fixed inset-0 z-[200] bg-white' : 'w-full h-full relative'}>
            {path?.isFallback && (
              <div className="absolute top-6 left-6 right-6 z-30 p-4 rounded-[16px] bg-[#fff9eb] border border-amber-200/50 shadow-lg text-slate-800 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                    <Layers size={14} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-900 leading-none">Synthesis Fallback Activated</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                      SARA encountered a temporary AI rate-limit or timeout. We've loaded a structured foundational roadmap for <strong>{path.goal}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {pathMap && (
              <NeuralSynthesizer
                moduleTitle={path.title}
                moduleContent={path.goal}
                keyConcepts={[]}
                initialMap={pathMap}
                isFullScreen={isFullScreen}
                onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
                initialComplexity={(path.cognitiveDensity as any) || 'overview'}
                initialStudyLens={(path.studyLens as any) || 'roadmap'}
                initialScholarPersona={(path.scholarPersona as any) || 'visionary'}
                onConfigChange={config => {
                  updatePathCalibration(path.id, {
                    studyLens: config.studyLens,
                    scholarPersona: config.scholarPersona,
                    cognitiveDensity: config.complexity,
                  });
                }}
                onNodeClick={node => {
                  const m = path.phases.flatMap(p => p.modules).find(x => x.id === node.id);
                  if (m) {
                    if (isModuleLocked(m)) {
                      toast.error(`"${m.title}" is locked. Complete the prerequisites first.`);
                      return;
                    }
                    const ph = path.phases.find(p => p.modules.some(mod => mod.id === m.id));
                    if (ph) navigate(`/study/${path.id}/${ph.id}/${m.id}?entry=classroom`);
                  }
                }}
              />
            )}
            {!isFullScreen && (
              <div className="absolute bottom-8 right-8">
                <button
                  onClick={handleLaunch}
                  className="flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#0d0d0d', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                >
                  <Zap size={14} fill="currentColor" />
                  Continue journey
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-5 py-8 sm:px-8 lg:px-10 custom-scrollbar">
            <div className="max-w-[860px] mx-auto space-y-6 pb-20">
              {path?.isFallback && (
                <div className="p-4 rounded-[16px] bg-[#fff9eb] border border-amber-200/50 shadow-sm text-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Layers size={14} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-900 leading-none">Synthesis Fallback Activated</h4>
                      <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                        SARA encountered a temporary AI rate-limit or timeout. We've loaded a structured foundational roadmap for <strong>{path.goal}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Stats ── */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: <Clock size={15} />, value: `${(totalMinutes / 60).toFixed(1)}h`, label: 'Total time' },
                  { icon: <Layers size={15} />, value: (path.phases || []).length, label: 'Phases' },
                  { icon: <BookOpen size={15} />, value: `${completedMods}/${totalModules}`, label: 'Modules' },
                  { icon: <Zap size={15} />, value: `${path.progress || 0}%`, label: 'Mastery' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="p-4 rounded-xl flex flex-col"
                    style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    <div className="mb-2" style={{ color: '#4e5bff' }}>{s.icon}</div>
                    <p className="text-[18px] font-bold text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Phases ── */}
              <div className="space-y-3">
              {(path.phases || []).map((phase, pIdx) => (
                  <div
                    key={phase.id}
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    {/* Phase header */}
                    <button
                      onClick={() => togglePhase(pIdx)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                          style={
                            pIdx === 0
                              ? { background: '#4e5bff', color: '#fff' }
                              : { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }
                          }
                        >
                          {pIdx + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                            Phase {pIdx + 1}
                          </p>
                          <h4 className="text-[14px] font-semibold text-slate-900" style={{ letterSpacing: '-0.01em' }}>
                            {phase.title}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-medium text-slate-400">
                          {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length}
                        </span>
                        {expandedPhases[pIdx]
                          ? <ChevronUp size={16} className="text-slate-400" />
                          : <ChevronDown size={16} className="text-slate-400" />
                        }
                      </div>
                    </button>

                    {/* Phase content */}
                    {expandedPhases[pIdx] && (
                      <div
                        className="px-5 pb-4 pt-0"
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
                        {phase.description && (
                          <p className="text-[13px] text-slate-500 py-3 italic" style={{ fontFamily: "'Newsreader', serif" }}>
                            {phase.description}
                          </p>
                        )}
                        <div className="space-y-1.5 mt-1">
                          {phase.modules.map(m => {
                            const locked = isModuleLocked(m);
                            const done   = m.isCompleted;
                            const active = !locked && !done;

                            return (
                              <div
                                key={m.id}
                                onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${m.id}?entry=classroom`)}
                                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                                style={{
                                  cursor: locked ? 'default' : 'pointer',
                                  opacity: locked ? 0.35 : 1,
                                  background: done ? 'rgba(22,163,74,0.04)' : '#fff',
                                  borderColor: done
                                    ? 'rgba(22,163,74,0.2)'
                                    : active
                                    ? 'rgba(78,91,255,0.25)'
                                    : '#f1f5f9',
                                  borderLeft: active ? '3px solid #4e5bff' : undefined,
                                }}
                                onMouseEnter={e => {
                                  if (!locked) {
                                    (e.currentTarget as HTMLElement).style.background = '#fafbfc';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = done ? 'rgba(22,163,74,0.04)' : '#fff';
                                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {locked
                                    ? <Lock size={13} className="text-slate-300 flex-shrink-0" />
                                    : done
                                    ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                                    : <Play size={13} style={{ color: '#4e5bff' }} fill="#4e5bff" className="flex-shrink-0" />
                                  }
                                  <span
                                    className="text-[13px] font-medium"
                                    style={{ color: done ? '#166534' : '#1e293b' }}
                                  >
                                    {m.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  {active && (
                                    <span
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                      style={{ background: 'rgba(78,91,255,0.08)', color: '#4e5bff' }}
                                    >
                                      Up next
                                    </span>
                                  )}
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {m.estimatedMinutes}m
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── CTA ── */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLaunch}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#0d0d0d', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
                >
                  <Zap size={14} fill="currentColor" />
                  Continue journey
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDetail;