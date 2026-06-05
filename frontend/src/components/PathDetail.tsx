import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  CheckCircle2, Lock, Play, Sparkles,
  GraduationCap, ArrowLeft, ChevronDown, ChevronUp,
  Zap, Network, List, Clock, BookOpen, Layers
} from 'lucide-react';
import { StudyModule } from '../types';
import KnowledgeMap, { legacyConceptMapToGraph } from './knowledge-map/KnowledgeMap';

const PathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const path = paths.find(p => p.id === id);

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ '0': true });
  const [viewMode, setViewMode] = useState<'map' | 'curriculum'>('map');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const pathKnowledgeGraph = useMemo(() => {
    if (!path) return null;
    const nodes: Array<{ id: string; label: string; description: string; depth: number; parentId?: string }> = [];
    const relationships: Array<{ from: string; to: string; label: string }> = [];

    nodes.push({ id: 'root', label: path.title, description: path.goal, depth: 0 });

    path.phases.forEach((phase) => {
      const phaseId = `phase-${phase.id}`;
      nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
      relationships.push({ from: 'root', to: phaseId, label: 'contains' });

      phase.modules.forEach((mod) => {
        nodes.push({ id: mod.id, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
        relationships.push({ from: phaseId, to: mod.id, label: 'contains' });
        mod.dependsOnModuleIds?.forEach(depId => {
          relationships.push({ from: depId, to: mod.id, label: 'requires' });
        });
      });
    });

    return legacyConceptMapToGraph(
      { centralConcept: path.title, nodes, relationships },
      path.id,
    );
  }, [path]);

  const togglePhase = (idx: number) => setExpandedPhases(prev => ({ ...prev, [idx]: !prev[idx] }));

  if (!path) return (
    <div className="flex flex-col items-center justify-center h-full bg-[#fafafa] p-10 text-center">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center ring-1 ring-slate-100 shadow-sm mb-4">
        <GraduationCap size={32} className="text-slate-300" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Path not found</h2>
      <button onClick={() => navigate('/dashboard')} className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#000666] hover:underline">
        <ArrowLeft size={14} /> Back to discover
      </button>
    </div>
  );

  const isModuleLocked = (module: StudyModule) => {
    if (!module.dependsOnModuleIds?.length) return false;
    const all = path.phases.flatMap(p => p.modules);
    return module.dependsOnModuleIds.some(depId => {
      const m = all.find(x => x.id === depId);
      return m && !m.isCompleted;
    });
  };

  const totalModules = path.phases.reduce((acc, ph) => acc + ph.modules.length, 0);
  const completedModules = path.phases.reduce((acc, ph) => acc + ph.modules.filter(m => m.isCompleted).length, 0);
  const totalMinutes = path.phases.reduce((acc, ph) => acc + ph.modules.reduce((a, m) => a + (m.estimatedMinutes || 0), 0), 0);

  const handleLaunch = () => {
    const next = path.phases.flatMap(ph => ph.modules).find(m => !m.isCompleted) || path.phases[0]?.modules[0];
    if (!next) return;
    const phase = path.phases.find(p => p.modules.some(m => m.id === next.id));
    if (phase) navigate(`/study/${path.id}/${phase.id}/${next.id}`);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#fafafa] relative">
      
      <div className="fixed inset-0 pointer-events-none z-0 bg-[var(--surface-page)]" />

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="relative z-10 shrink-0 flex items-center justify-between border-b border-slate-100/50 bg-white/60 backdrop-blur-xl px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="ui-eyebrow">Learning path</p>
            <h1 className="text-base font-semibold tracking-tight text-slate-900 truncate max-w-[300px] sm:max-w-[500px]">{path.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[14px] bg-slate-50 p-1 ring-1 ring-slate-100">
          <button onClick={() => setViewMode('map')} className={`flex h-8 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition-colors ${viewMode === 'map' ? 'bg-[#000666] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <Network size={14} /> Map
          </button>
          <button onClick={() => setViewMode('curriculum')} className={`flex h-8 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition-colors ${viewMode === 'curriculum' ? 'bg-[#000666] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <List size={14} /> List
          </button>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative z-10">
        
        {viewMode === 'map' ? (
          <div className={isFullScreen ? "fixed inset-0 z-[200] bg-[#fafafa]/90 backdrop-blur-3xl animate-in zoom-in-95 duration-500" : "w-full h-full relative"}>
             {pathKnowledgeGraph && (
               <KnowledgeMap
                 moduleTitle={path.title}
                 moduleContent={path.goal}
                 keyConcepts={[]}
                 initialGraph={pathKnowledgeGraph}
                 onNavigateModule={(moduleId) => {
                   const m = path.phases.flatMap(p => p.modules).find(x => x.id === moduleId);
                   if (m) {
                     const ph = path.phases.find(p => p.modules.some(mod => mod.id === m.id));
                     if (ph) navigate(`/study/${path.id}/${ph.id}/${m.id}`);
                   }
                 }}
               />
             )}
             {/* Floating Action */}
             {!isFullScreen && (
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
                  <button onClick={handleLaunch} className="pointer-events-auto ui-btn-primary gap-2 rounded-xl px-6 py-3 shadow-sm">
                    <Zap size={14} fill="currentColor" /> Continue learning
                  </button>
               </div>
             )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-5 py-8 sm:px-8 lg:px-12 custom-scrollbar">
            <div className="max-w-[900px] mx-auto space-y-8 pb-20">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: <Clock size={14} />, val: `${(totalMinutes / 60).toFixed(1)}h`, label: 'Total Time' },
                  { icon: <Layers size={14} />, val: path.phases.length, label: 'Phases' },
                  { icon: <BookOpen size={14} />, val: `${completedModules}/${totalModules}`, label: 'Modules' },
                  { icon: <Zap size={14} />, val: `${path.progress}%`, label: 'Mastery' }
                ].map(s => (
                  <div key={s.label} className="bg-white p-4 rounded-2xl ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col items-center">
                    <div className="text-[#000666] mb-2">{s.icon}</div>
                    <p className="text-[15px] font-semibold text-slate-900">{s.val}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Phases */}
              <div className="space-y-4">
                {path.phases.map((phase, pIdx) => (
                  <div key={phase.id} className="bg-white rounded-[20px] ring-1 ring-slate-100 shadow-sm overflow-hidden">
                    <button onClick={() => togglePhase(pIdx)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[12px] font-black ${pIdx === 0 ? 'bg-[#000666] text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {pIdx + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400 leading-none mb-1">Phase {pIdx + 1}</p>
                          <h4 className="text-[14px] font-semibold text-slate-900">{phase.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-slate-400">
                          {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length}
                        </span>
                        {expandedPhases[pIdx] ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                      </div>
                    </button>

                    {expandedPhases[pIdx] && (
                      <div className="px-5 pb-5 pt-0 border-t border-slate-50/50">
                        {phase.description && <p className="text-[13px] text-slate-500 font-medium py-3 text-justify hyphens-auto leading-relaxed">{phase.description}</p>}
                        <div className="space-y-1.5 mt-1">
                          {phase.modules.map((m) => {
                            const locked = isModuleLocked(m);
                            const done = m.isCompleted;
                            const active = !locked && !done;
                            return (
                              <div key={m.id} onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${m.id}`)}
                                className={`flex items-center justify-between p-3 rounded-[14px] border-2 transition-all cursor-pointer ${
                                  locked ? 'opacity-40 grayscale pointer-events-none' :
                                  done ? 'bg-emerald-50/40 border-emerald-50/50' :
                                  active ? 'border-[#000666] bg-slate-50/50' : 'border-slate-50 hover:border-slate-100 hover:bg-slate-50/50'
                                }`}>
                                <div className="flex items-center gap-3">
                                  {locked ? <Lock size={14} className="text-slate-300" /> : 
                                   done ? <CheckCircle2 size={14} className="text-emerald-500" /> : 
                                   <Play size={14} className="text-[#000666]" fill="currentColor" />}
                                  <span className={`text-[13px] font-bold ${done ? 'text-emerald-900' : 'text-slate-700'}`}>{m.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {active && <span className="text-[10px] font-semibold text-[#000666] bg-white px-2 py-0.5 rounded-full ring-1 ring-[#000666]/10">Up next</span>}
                                  <span className="text-[11px] font-medium text-slate-400">{m.estimatedMinutes} min</span>
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

              {/* Launch CTA */}
              <div className="flex flex-col items-center gap-4">
                 <button onClick={handleLaunch} className="ui-btn-primary gap-2 rounded-xl px-8 py-3.5 text-[13px] shadow-sm">
                    <Zap size={16} fill="currentColor" /> Continue learning
                 </button>
                 <p className="text-[12px] font-medium text-slate-400">{completedModules} of {totalModules} modules complete</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDetail;