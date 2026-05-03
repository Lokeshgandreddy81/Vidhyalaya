import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  CheckCircle2, Lock, Play, Sparkles,
  GraduationCap, ArrowLeft, LayoutDashboard,
  Library, CalendarDays, Settings, ChevronDown, ChevronUp,
  Zap, Gauge
} from 'lucide-react';
import { StudyModule, LearningPath } from '../types';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from './NeuralSynthesizer';
import { Network, List, Layout, Maximize2 } from 'lucide-react';

const PathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const path = paths.find(p => p.id === id);

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ '0': true });
  const [viewMode, setViewMode] = useState<'map' | 'curriculum'>('map');

  // Generate a path-wide concept map for the NeuralSynthesizer
  const pathMap = React.useMemo(() => {
    if (!path) return null;
    const nodes: ConceptNode[] = [];
    const relationships: any[] = [];

    nodes.push({
      id: 'root',
      label: path.title,
      description: path.goal,
      depth: 0
    });

    path.phases.forEach((phase) => {
      const phaseId = `phase-${phase.id}`;
      nodes.push({
        id: phaseId,
        label: phase.title,
        description: phase.description || '',
        depth: 1,
        parentId: 'root'
      });
      relationships.push({ from: 'root', to: phaseId, label: 'phase' });

      phase.modules.forEach((mod) => {
        nodes.push({
          id: mod.id,
          label: mod.title,
          description: mod.description || '',
          depth: 2,
          parentId: phaseId
        });
        relationships.push({ from: phaseId, to: mod.id, label: 'module' });
        
        mod.dependsOnModuleIds?.forEach(depId => {
          relationships.push({ from: depId, to: mod.id, label: 'prerequisite' });
        });
      });
    });

    return { centralConcept: path.title, nodes, relationships } as ConceptMap;
  }, [path]);

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!path) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-[#f8f9fa]">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100">
        <GraduationCap size={40} className="text-slate-300" />
      </div>
      <p className="text-slate-500 font-bold text-xl">Journey not found</p>
      <Link to="/" className="text-indigo-600 font-bold flex items-center hover:underline">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>
    </div>
  );

  const isModuleLocked = (module: StudyModule) => {
    if (!module.dependsOnModuleIds || module.dependsOnModuleIds.length === 0) return false;
    const allModules = path.phases.flatMap(p => p.modules);
    return module.dependsOnModuleIds.some(depId => {
      const depModule = allModules.find(m => m.id === depId);
      return depModule && !depModule.isCompleted;
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

  const handleNodeClick = (node: ConceptNode) => {
    // If it's a module node (depth 2), navigate to its study session
    const allModules = path.phases.flatMap(p => p.modules);
    const targetModule = allModules.find(m => m.id === node.id);
    if (targetModule) {
      const phase = path.phases.find(p => p.modules.some(m => m.id === targetModule.id));
      if (phase) navigate(`/study/${path.id}/${phase.id}/${targetModule.id}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">

      {/* Main Content Area - Board Architecture */}
      <section className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa] relative">
        
        {/* Navigation Bar & Board Switcher */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-white/80 backdrop-blur-xl px-2 py-2 rounded-2xl border border-slate-100 shadow-2xl">
           <button 
             onClick={() => setViewMode('map')}
             className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-[#000666] text-white shadow-lg' : 'text-slate-400 hover:text-[#000666] hover:bg-slate-50'}`}
           >
             <Network size={16} />
             Neural Map
           </button>
           <button 
             onClick={() => setViewMode('curriculum')}
             className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'curriculum' ? 'bg-[#000666] text-white shadow-lg' : 'text-slate-400 hover:text-[#000666] hover:bg-slate-50'}`}
           >
             <List size={16} />
             Curriculum
           </button>
        </div>

        {viewMode === 'map' ? (
          <div className="flex-1 w-full h-full min-h-0 animate-in fade-in zoom-in-95 duration-1000">
            {pathMap && (
              <div className="w-full h-full relative">
                 <div className="absolute top-10 left-10 z-50">
                    <button 
                      onClick={() => navigate('/')}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#000666] shadow-sm hover:shadow-md transition-all"
                    >
                      <ArrowLeft size={20} />
                    </button>
                 </div>
                 
                 <div className="absolute top-10 right-10 z-50 text-right">
                    <div className="inline-flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Architecture Active</span>
                       <h2 className="text-2xl font-serif text-[#000666] font-bold">{path.title}</h2>
                    </div>
                 </div>

                 {/* Neural Synthesizer Container */}
                 <div className="w-full h-full pt-20">
                    {/* Mock component integration or direct mapping logic */}
                    {/* Since NeuralSynthesizer is local and exported, we can use it */}
                    {/* We need to provide a way for NeuralSynthesizer to accept a pre-generated map */}
                    <div className="w-full h-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                       <NeuralSynthesizer 
                          moduleTitle={path.title}
                          moduleContent={path.goal}
                          keyConcepts={[]}
                          initialMap={pathMap}
                          onNodeClick={handleNodeClick}
                       />
                    </div>
                 </div>

                 {/* Floating Start Journey CTA */}
                 <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                    <button
                      onClick={handleLaunch}
                      className="group flex items-center gap-12 px-12 py-5 bg-[#000666] text-white rounded-[24px] font-black uppercase tracking-[0.6em] text-[11px] shadow-[0_40px_80px_-20px_rgba(0,6,102,0.4)] hover:scale-[1.05] active:scale-95 transition-all"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] opacity-40 tracking-[0.3em] mb-1">Deployment</span>
                        <span>Continue Journey</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                        <Zap size={20} fill="currentColor" />
                      </div>
                    </button>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-10 py-24 custom-scrollbar">
            {/* Curriculum Breakdown */}
            <header className="max-w-[960px] mx-auto mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 rounded-lg text-slate-400 hover:text-[#000666] hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="px-3 py-1 bg-[#a0f399] text-[#217128] text-xs font-bold rounded-full uppercase tracking-wider">
                  Roadmap
                </span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  • {totalModules} Modules
                </span>
              </div>
              <h2 className="text-4xl font-bold text-[#000666] mb-3 tracking-tight leading-tight">{path.title}</h2>
              <p className="text-lg font-serif text-slate-500 leading-relaxed max-w-2xl mx-auto">{path.goal}</p>
            </header>

            <div className="max-w-[960px] mx-auto space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-sm font-bold text-[#000666]">{(totalMinutes / 60).toFixed(1)}h</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phases</p>
                  <p className="text-sm font-bold text-[#000666]">{path.phases.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-bold text-[#217128]">{completedModules}/{totalModules}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mastery</p>
                  <p className="text-sm font-bold text-[#000666]">{path.progress}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Curriculum</h3>
                <button
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    path.phases.forEach((_, i) => { allOpen[i] = true; });
                    setExpandedPhases(allOpen);
                  }}
                  className="text-xs text-slate-500 flex items-center gap-1 hover:text-[#000666] transition-colors font-medium"
                >
                  <ChevronDown size={16} /> Expand All
                </button>
              </div>

              {/* Phase Modules */}
              {path.phases.map((phase, pIdx) => (
                <div key={phase.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="h-[3px] bg-gradient-to-r from-[#000666] via-indigo-500 to-indigo-400" />
                  <button
                    onClick={() => togglePhase(pIdx)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${pIdx === 0 ? 'bg-[#e0e0ff] text-[#000666]' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {String(pIdx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phase {pIdx + 1}</p>
                        <h4 className="text-sm font-semibold text-[#000666]">{phase.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length}
                      </span>
                      {expandedPhases[pIdx] ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>

                  {expandedPhases[pIdx] && (
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                      {phase.description && (
                        <p className="text-xs text-slate-500 pt-4 pb-3 font-medium">{phase.description}</p>
                      )}
                      <div className="space-y-2 mt-2">
                        {phase.modules.map((module) => {
                          const locked = isModuleLocked(module);
                          const isNext = !locked && !module.isCompleted;
                          const isCompleted = module.isCompleted;

                          return (
                            <div
                              key={module.id}
                              onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${module.id}`)}
                              className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer
                                ${locked ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                                  isCompleted ? 'bg-emerald-50 border border-emerald-100' :
                                  isNext ? 'bg-[#f0f0ff] border-l-2 border-l-[#00429b]' :
                                  'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                {locked ? (
                                  <Lock size={18} className="text-slate-400 shrink-0" />
                                ) : isCompleted ? (
                                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <Play size={18} className="text-[#00429b] shrink-0" fill="currentColor" />
                                )}
                                <span className="text-sm font-medium text-slate-800">{module.title}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {isNext && (
                                  <span className="text-[9px] font-black text-[#000666] bg-[#e0e0ff] px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    Start
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                  {module.estimatedMinutes}m
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

              {/* Launch CTA */}
              <div className="pt-8 text-center pb-20">
                <button
                  onClick={handleLaunch}
                  className="px-12 py-4 bg-[#000666] text-white rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/10 hover:scale-[1.01] active:scale-95 transition-all mx-auto"
                >
                  <Zap size={20} fill="currentColor" />
                  <span className="font-semibold text-lg">Continue Journey</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                  Powered by Vidhyalaya Intelligence
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default PathDetail;