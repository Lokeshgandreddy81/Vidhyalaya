import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  CheckCircle2, Lock, Play, Sparkles,
  GraduationCap, ArrowLeft, ChevronDown, ChevronUp,
  Zap, Network, List, Clock, BookOpen, Layers
} from 'lucide-react';
import { StudyModule } from '../types';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';

const PathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const path = paths.find(p => p.id === id);

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ '0': true });
  const [viewMode, setViewMode] = useState<'map' | 'curriculum'>('map');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const pathMap = useMemo(() => {
    if (!path) return null;
    const nodes: ConceptNode[] = [];
    const relationships: any[] = [];

    nodes.push({ id: 'root', label: path.title, description: path.goal, depth: 0 });

    path.phases.forEach((phase) => {
      const phaseId = `phase-${phase.id}`;
      nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
      relationships.push({ from: 'root', to: phaseId, label: 'phase' });

      phase.modules.forEach((mod) => {
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
    <div className="flex flex-col items-center justify-center h-full bg-[#fafafa] p-10 text-center">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center ring-1 ring-slate-100 shadow-sm mb-4">
        <GraduationCap size={32} className="text-slate-300" />
      </div>
      <h2 className="text-xl font-black text-slate-900">Journey not found</h2>
      <button onClick={() => navigate('/dashboard')} className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#4e5bff]">
        <ArrowLeft size={14} /> Back to Classrooms
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
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-transparent relative">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="relative z-10 shrink-0 flex items-center justify-between border-b border-slate-200/50 bg-white/45 backdrop-blur-md px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl text-slate-400 hover:text-[#4e5bff] hover:bg-white transition-all border border-transparent hover:border-slate-200/50">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">Classroom Path</p>
            <h1 className="text-[16px] font-black tracking-tight text-slate-900 truncate max-w-[300px] sm:max-w-[500px]">{path.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-[14px] bg-slate-100/60 backdrop-blur-md p-1 border border-slate-200/50 shadow-sm">
          <button onClick={() => setViewMode('map')} className={`flex h-8 items-center gap-2 rounded-[10px] px-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'map' ? 'bg-[#4e5bff] text-white shadow-[0_2px_8px_rgba(78,91,255,0.25)]' : 'text-slate-400 hover:text-slate-600'}`}>
            <Network size={14} /> Map
          </button>
          <button onClick={() => setViewMode('curriculum')} className={`flex h-8 items-center gap-2 rounded-[10px] px-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'curriculum' ? 'bg-[#4e5bff] text-white shadow-[0_2px_8px_rgba(78,91,255,0.25)]' : 'text-slate-400 hover:text-slate-600'}`}>
            <List size={14} /> List
          </button>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative z-10">
        
        {viewMode === 'map' ? (
          <div className={isFullScreen ? "fixed inset-0 z-[200] bg-white/90 backdrop-blur-3xl animate-in zoom-in-95 duration-500" : "w-full h-full relative"}>
             {pathMap && (
               <NeuralSynthesizer 
                 moduleTitle={path.title}
                 moduleContent={path.goal}
                 keyConcepts={[]}
                 initialMap={pathMap}
                 isFullScreen={isFullScreen}
                 onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
                 onNodeClick={(node) => {
                    const m = path.phases.flatMap(p => p.modules).find(x => x.id === node.id);
                    if (m) {
                       const ph = path.phases.find(p => p.modules.some(mod => mod.id === m.id));
                       if (ph) navigate(`/study/${path.id}/${ph.id}/${m.id}`);
                    }
                 }}
               />
             )}
             {/* Floating Action */}
              {!isFullScreen && (
                <div className="absolute bottom-8 right-8 pointer-events-none">
                   <button onClick={handleLaunch} className="pointer-events-auto flex items-center gap-3 rounded-[18px] bg-[#4e5bff] px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_20px_40px_-10px_rgba(78, 91, 255,0.4)] transition-all hover:scale-[1.03] active:scale-95">
                     <Zap size={14} fill="currentColor" /> Continue Journey
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
                  <div key={s.label} className="bg-white/45 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-center hover:bg-white/80 transition-all duration-300">
                    <div className="text-[#4e5bff] mb-2 scale-110">{s.icon}</div>
                    <p className="text-[16px] font-black text-slate-900 leading-none mt-1">{s.val}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mt-2">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Phases */}
              <div className="space-y-4">
                {path.phases.map((phase, pIdx) => (
                  <div key={phase.id} className="bg-white/45 backdrop-blur-md rounded-[20px] border border-slate-200/60 shadow-sm overflow-hidden hover:border-[#4e5bff]/30 transition-colors duration-300">
                    <button onClick={() => togglePhase(pIdx)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/80 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[12px] font-black ${pIdx === 0 ? 'bg-[#4e5bff] text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                          {pIdx + 1}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Phase {pIdx + 1}</p>
                          <h4 className="text-[14px] font-black text-slate-900">{phase.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length}
                        </span>
                        {expandedPhases[pIdx] ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                      </div>
                    </button>

                    {expandedPhases[pIdx] && (
                      <div className="px-5 pb-5 pt-0 border-t border-slate-200/30">
                        {phase.description && <p className="text-[12px] text-slate-400 font-medium py-3 font-['Newsreader'] italic">{phase.description}</p>}
                        <div className="space-y-1.5 mt-1">
                          {phase.modules.map((m) => {
                            const locked = isModuleLocked(m);
                            const done = m.isCompleted;
                            const active = !locked && !done;
                            return (
                              <div key={m.id} onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${m.id}`)}
                                className={`flex items-center justify-between p-4 rounded-[14px] border transition-all duration-300 cursor-pointer ${
                                  locked ? 'opacity-30 grayscale pointer-events-none' :
                                  done ? 'bg-emerald-50/20 border-emerald-200/40 hover:bg-emerald-50/30' :
                                  active ? 'border-[#4e5bff]/70 bg-white shadow-sm shadow-[#4e5bff]/5 hover:border-[#4e5bff]' : 'border-slate-200/40 bg-white/40 hover:border-slate-200 hover:bg-white/70'
                                }`}>
                                <div className="flex items-center gap-3">
                                  {locked ? <Lock size={14} className="text-slate-300" /> : 
                                   done ? <CheckCircle2 size={14} className="text-emerald-500" /> : 
                                   <Play size={14} className="text-[#4e5bff]" fill="currentColor" />}
                                  <span className={`text-[13px] font-bold ${done ? 'text-emerald-900' : 'text-slate-700'}`}>{m.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {active && <span className="text-[9px] font-black text-[#4e5bff] bg-white px-2 py-0.5 rounded-full uppercase tracking-widest ring-1 ring-[#4e5bff]/10 shadow-sm">Active</span>}
                                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{m.estimatedMinutes}m</span>
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
                 <button onClick={handleLaunch} className="group flex items-center gap-4 rounded-[18px] bg-[#4e5bff] px-10 py-5 text-[12px] font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-10px_rgba(78, 91, 255,0.4)] transition-all hover:scale-[1.03] active:scale-95">
                    <Zap size={16} fill="currentColor" /> Continue Journey
                 </button>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Cortex Intelligence</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDetail;