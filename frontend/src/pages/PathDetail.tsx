import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  CheckCircle2, Lock, Play, Zap,
  GraduationCap, ArrowLeft, ChevronDown, ChevronUp,
  Network, List, Clock, BookOpen, Layers, ArrowRight,
  PanelLeftOpen, PanelLeftClose, Maximize, Minimize,
  Video, FileText, Terminal, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { StudyModule } from '../types';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';
import { triggerBackgroundPreGeneration } from '../services/geminiService';

const MiniProgressRing: React.FC<{ value: number; max: number; color: string; size?: number; strokeWidth?: number }> = ({ value, max, color, size = 36, strokeWidth = 3 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={radius} 
        fill="none" 
        stroke={color} 
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
};

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
  const [viewMode, setViewMode] = useState<'map' | 'curriculum'>('curriculum');
  const [isFullScreen, setIsFullScreen] = useState(false);
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

  const hasResourceType = (m: StudyModule, type: 'video' | 'pdf' | 'url') => {
    if (!m.resources || !Array.isArray(m.resources)) return false;
    if (type === 'video') {
      return m.resources.some(r => r.type === 'video' || r.type === 'youtube');
    }
    if (type === 'pdf') {
      return m.resources.some(r => r.type === 'pdf' || r.type === 'pdf_link');
    }
    if (type === 'url') {
      return m.resources.some(r => r.type === 'url' || r.type === 'article');
    }
    return false;
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

  const lbl = (path.title || '').toLowerCase();
  const getThemeColors = () => {
    if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web') || lbl.includes('ios') || lbl.includes('android')) {
      return {
        primary: '#ea580c',
        bg: 'rgba(234, 88, 12, 0.08)',
        secondaryBg: 'rgba(251, 146, 60, 0.06)',
        text: '#ea580c'
      };
    }
    if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')) {
      return {
        primary: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.08)',
        secondaryBg: 'rgba(74, 222, 128, 0.06)',
        text: '#16a34a'
      };
    }
    if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')) {
      return {
        primary: '#db2777',
        bg: 'rgba(219, 39, 119, 0.08)',
        secondaryBg: 'rgba(244, 114, 182, 0.06)',
        text: '#db2777'
      };
    }
    if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp') || lbl.includes('vision') || lbl.includes('analyst')) {
      return {
        primary: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.08)',
        secondaryBg: 'rgba(14, 165, 233, 0.06)',
        text: '#0284c7'
      };
    }
    return {
      primary: '#4e5bff',
      bg: 'rgba(78, 91, 255, 0.1)',
      secondaryBg: 'rgba(129, 140, 248, 0.06)',
      text: '#4e5bff'
    };
  };
  const theme = getThemeColors();

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative" style={{ background: 'transparent' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .app-aurora-layer {
          background: 
            radial-gradient(circle at 50% 0%, ${theme.bg} 0%, transparent 60%),
            radial-gradient(circle at 100% 50%, ${theme.secondaryBg} 0%, transparent 50%),
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

      {/* Floating Header Panel (Left: Title, Back, Sidebar) */}
      <div 
        className="absolute top-6 left-6 z-[210] flex items-center gap-2.5 bg-white/80 backdrop-blur-xl border border-white/90 px-3.5 py-2.5 rounded-2xl shadow-[0_8px_32px_-8px_rgba(78,91,255,0.08)] pointer-events-auto transition-all duration-300"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl text-slate-400 hover:bg-[#f1f5f9] transition-all cursor-pointer flex items-center justify-center animate-in fade-in"
          title="Back to Dashboard"
          onMouseEnter={e => {
            e.currentTarget.style.color = theme.primary;
            e.currentTarget.style.backgroundColor = theme.bg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '';
            e.currentTarget.style.backgroundColor = '';
          }}
        >
          <ArrowLeft size={15} />
        </button>
        <div className="w-px h-3.5 bg-slate-200" />
        <button
          onClick={handleSidebarToggle}
          className="p-2 rounded-xl text-slate-400 hover:bg-[#f1f5f9] transition-all cursor-pointer flex items-center justify-center"
          title="Toggle Sidebar"
          onMouseEnter={e => {
            e.currentTarget.style.color = theme.primary;
            e.currentTarget.style.backgroundColor = theme.bg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '';
            e.currentTarget.style.backgroundColor = '';
          }}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={15} strokeWidth={2.5} /> : <PanelLeftClose size={15} strokeWidth={2.5} />}
        </button>
        <div className="w-px h-3.5 bg-slate-200" />
        <div className="flex flex-col min-w-0 pr-1.5 pl-0.5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 opacity-80" style={{ color: theme.primary }}>Learning Path</span>
          <h1 className="text-[13px] font-bold text-slate-800 tracking-tight leading-none truncate max-w-[200px] sm:max-w-xs">{path.title}</h1>
        </div>
      </div>

      {/* Floating Header Panel (Right: View Mode & Fullscreen) */}
      <div className="absolute top-6 right-6 z-[210] flex items-center gap-2.5 pointer-events-auto">
        <div
          className="flex items-center gap-1 p-1 bg-white/80 backdrop-blur-xl border border-white/90 rounded-2xl shadow-[0_8px_32px_-8px_rgba(78,91,255,0.08)]"
        >
          {([
            { mode: 'map', icon: Network, label: 'Map' },
            { mode: 'curriculum', icon: List, label: 'List' },
          ] as const).map(({ mode, icon: Icon, label }) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                style={
                  isActive
                    ? { background: theme.primary, color: '#fff', boxShadow: `0 4px 12px ${theme.primary}35` }
                    : { color: '#64748b' }
                }
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = theme.primary;
                    e.currentTarget.style.backgroundColor = theme.bg;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '';
                    e.currentTarget.style.backgroundColor = '';
                  }
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Fullscreen Button (only in Map view) */}
        {viewMode === 'map' && (
          <div className="flex items-center p-1 bg-white/80 backdrop-blur-xl border border-white/90 rounded-2xl shadow-[0_8px_32px_-8px_rgba(78,91,255,0.08)]">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[11px] font-semibold text-slate-600 transition-all cursor-pointer"
              onMouseEnter={e => {
                e.currentTarget.style.color = theme.primary;
                e.currentTarget.style.backgroundColor = theme.bg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '';
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              {isFullScreen ? <Minimize size={13} /> : <Maximize size={13} />}
              <span>{isFullScreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative z-10">

        {viewMode === 'map' ? (
          <div 
            className={isFullScreen ? 'fixed inset-0 z-[200]' : 'w-full h-full relative p-4 sm:p-6'}
            style={isFullScreen ? {
              background: `
                radial-gradient(circle at 50% 0%, ${theme.bg} 0%, transparent 60%),
                radial-gradient(circle at 100% 50%, ${theme.secondaryBg} 0%, transparent 50%),
                linear-gradient(180deg, ${
                  lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web') || lbl.includes('ios') || lbl.includes('android')
                    ? '#0f0b08 0%, #3a1a05 120px, #7c2d12 220px, #c2410c 340px, #fffbf7 450px'
                    : lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')
                      ? '#021a0e 0%, #052e16 120px, #166534 220px, #0e7490 340px, #f5fcf9 450px'
                      : lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')
                        ? '#1c020d 0%, #500724 120px, #be185d 220px, #7c3aed 340px, #fcf5f8 450px'
                        : '#021422 0%, #0c4a6e 120px, #0369a1 220px, #4f46e5 340px, #f5fafd 450px'
                }, #fafbfc 100%)`
            } : undefined}
          >
            <div 
              className={`w-full h-full overflow-hidden relative z-10 transition-all duration-700 ${isFullScreen ? 'rounded-none border-none' : 'backdrop-blur-[32px] rounded-[24px] border'}`}
              style={isFullScreen ? { background: 'transparent' } : {
                background: `linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.52) 100%)`,
                borderColor: `${theme.primary}25`,
                boxShadow: `0 24px 70px rgba(0, 0, 0, 0.03), inset 0 0 60px ${theme.primary}0a`,
              }}
            >

            {pathMap && (
              <NeuralSynthesizer
                moduleTitle={path.title}
                moduleContent={path.goal}
                keyConcepts={[]}
                initialMap={pathMap}
                isFullScreen={isFullScreen}
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
              <div className="absolute bottom-8 right-8 z-30">
                <button
                  onClick={handleLaunch}
                  className="flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                  style={{ background: '#0d0d0d', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                >
                  <Zap size={14} fill="currentColor" />
                  Continue journey
                </button>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-5 pt-28 pb-24 sm:px-8 lg:px-12 custom-scrollbar">
            <div className="max-w-[900px] mx-auto space-y-8 pb-20">



              {/* ── Syllabus / Table of Contents ── */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.03)] p-8 lg:p-10 select-none">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 font-mono pb-4 border-b border-slate-100/80 mb-10 flex items-center justify-between">
                  <span>Course Contents</span>
                  <span>{path.title}</span>
                </div>

                {(path.phases || []).map((phase, pIdx) => {
                  const isPhaseDone = phase.modules.every(m => m.isCompleted);

                  return (
                    <div key={phase.id} className="mb-10 last:mb-0">
                      {/* Chapter Title */}
                      <div className="flex items-baseline justify-between border-b border-slate-100 pb-2 mb-4">
                        <h4 className="text-[15px] font-black text-slate-900 tracking-tight font-serif">
                          Chapter {pIdx + 1}: {phase.title}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                          {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length} Completed
                        </span>
                      </div>

                      {/* Chapter Description */}
                      {phase.description && (
                        <p className="text-[12px] leading-relaxed text-slate-500 mb-5 font-serif italic text-justify pl-3 border-l border-slate-200">
                          {phase.description}
                        </p>
                      )}

                      {/* Chapter Modules (TOC Items) */}
                      <div className="space-y-3 pl-3">
                        {phase.modules.map((m, mIdx) => {
                          const locked = isModuleLocked(m);
                          const done   = m.isCompleted;
                          const active = !locked && !done;

                          return (
                            <div
                              key={m.id}
                              onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${m.id}?entry=classroom`)}
                              className={`group flex items-baseline justify-between py-1 text-[13px] transition-colors ${
                                locked 
                                  ? 'text-slate-350 cursor-default' 
                                  : 'text-slate-700 hover:text-[#4e5bff] cursor-pointer'
                              }`}
                            >
                              {/* Module Prefix & Title */}
                              <div className="flex items-baseline gap-2 min-w-0 max-w-[70%]">
                                <span className="text-[11px] font-bold font-mono tracking-tight text-slate-400 select-none shrink-0">
                                  {pIdx + 1}.{mIdx + 1}
                                </span>
                                {(() => {
                                  const match = m.title.match(/^\[(.*?)\]\s*(.*)/);
                                  const tag = match ? match[1] : null;
                                  const cleanTitle = match ? match[2] : m.title;
                                  
                                  let tagColor = 'bg-slate-100 text-slate-700 border-slate-200';
                                  if (tag) {
                                    const tl = tag.toLowerCase();
                                    if (tl.includes('front') || tl.includes('ux') || tl.includes('react')) tagColor = 'bg-amber-50 text-amber-700 border-amber-200/60';
                                    else if (tl.includes('back') || tl.includes('sql') || tl.includes('mongo')) tagColor = 'bg-sky-50 text-sky-700 border-sky-200/60';
                                    else if (tl.includes('devops') || tl.includes('cloud') || tl.includes('docker')) tagColor = 'bg-violet-50 text-violet-700 border-violet-200/60';
                                    else if (tl.includes('hybrid') || tl.includes('capstone') || tl.includes('synth')) tagColor = 'bg-purple-100 text-purple-800 border-purple-300/80 font-black';
                                  }

                                  return (
                                    <>
                                      {tag && (
                                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider border select-none shrink-0 ${tagColor}`}>
                                          {tag}
                                        </span>
                                      )}
                                      <span className={`font-medium truncate ${done ? 'line-through text-slate-400' : ''}`}>
                                        {cleanTitle}
                                      </span>
                                    </>
                                  );
                                })()}
                                {active && (
                                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-[#4e5bff] select-none scale-90 origin-left shrink-0">
                                    Next Up
                                  </span>
                                )}
                              </div>

                              {/* Dotted Line Leader */}
                              <div className="flex-1 border-b border-dotted border-slate-200/80 mx-2.5 min-w-[20px] self-center group-hover:border-indigo-200 transition-colors" />

                              {/* Status & Duration */}
                              <div className="flex items-center gap-4 shrink-0 font-mono text-[10.5px]">
                                <span className="text-slate-400 select-none">{m.estimatedMinutes}m</span>
                                {locked ? (
                                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] select-none flex items-center gap-1">
                                    <Lock size={9} /> Locked
                                  </span>
                                ) : done ? (
                                  <span className="text-[#22c55e] font-extrabold uppercase tracking-wider text-[9px] select-none">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="text-[#4e5bff] font-extrabold uppercase tracking-wider text-[9px] opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                    Start &rarr;
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Bottom CTA ── */}
              <div className="flex justify-center pt-8">
                <motion.button
                  whileHover={{ scale: 1.025, boxShadow: `0 12px 32px ${theme.primary}25` }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleLaunch}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[13px] font-bold text-white transition-all cursor-pointer"
                  style={{ background: '#0a0b0d', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Zap size={14} fill="currentColor" />
                  <span>Resume Learning Journey</span>
                  <ArrowRight size={14} />
                </motion.button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDetail;