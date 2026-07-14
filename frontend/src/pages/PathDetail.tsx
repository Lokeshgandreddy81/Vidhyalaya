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

              {/* ── Path Hero Banner ── */}
              <div 
                className="relative overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.05)] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Visual Accent Top-Right Radial Glow */}
                <div 
                  className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-[0.12] pointer-events-none"
                  style={{ backgroundColor: theme.primary }}
                />
                <div 
                  className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-[80px] opacity-[0.06] pointer-events-none"
                  style={{ backgroundColor: theme.primary }}
                />

                <div className="relative z-10 space-y-3.5 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: theme.bg, color: theme.primary }}>
                    <GraduationCap size={12} />
                    <span>Orchestrated Roadmap</span>
                  </div>
                  <h2 className="text-[24px] sm:text-[28px] font-black text-slate-800 tracking-tight leading-tight">
                    {path.title}
                  </h2>
                  <p className="text-[13px] text-slate-550 text-justify leading-relaxed font-normal">
                    {path.goal}
                  </p>
                </div>

                {/* Circular Hero Progress Ring */}
                <div className="relative z-10 shrink-0 flex items-center gap-4 bg-slate-50/50 border border-slate-100/60 p-4 rounded-2xl">
                  <div className="relative flex items-center justify-center">
                    <MiniProgressRing value={path.progress || 0} max={100} color={theme.primary} size={64} strokeWidth={5} />
                    <span className="absolute text-[13px] font-black text-slate-800">{path.progress || 0}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Path Mastery</span>
                    <span className="text-[13px] font-bold text-slate-700">{completedMods} of {totalModules} modules</span>
                  </div>
                </div>
              </div>

              {/* ── Premium Stats Strip ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Clock size={16} />, value: `${(totalMinutes / 60).toFixed(1)}h`, label: 'Estimated study time' },
                  { icon: <Layers size={16} />, value: `${(path.phases || []).length} Phases`, label: 'Academic phases' },
                  { 
                    icon: <BookOpen size={16} />, 
                    value: `${completedMods}/${totalModules}`, 
                    label: 'Completed modules',
                    ring: <MiniProgressRing value={completedMods} max={totalModules} color="#22c55e" size={28} strokeWidth={2.5} />
                  },
                  { 
                    icon: <Zap size={16} />, 
                    value: `${path.progress || 0}%`, 
                    label: 'Total path progress',
                    ring: <MiniProgressRing value={path.progress || 0} max={100} color={theme.primary} size={28} strokeWidth={2.5} />
                  },
                ].map((s, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -3, scale: 1.01, boxShadow: `0_12px_24px_-10px_${theme.primary}12` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="p-4.5 rounded-2xl flex flex-col justify-between bg-white border border-slate-100/90 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.02)] min-h-[96px]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">{s.label}</p>
                      {!s.ring && (
                        <div 
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: theme.bg, color: theme.primary }}
                        >
                          {s.icon}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-[18px] font-black text-slate-800 tracking-tight leading-none">{s.value}</p>
                      {s.ring && (
                        <div className="shrink-0 flex items-center justify-center">
                          {s.ring}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ── Phases Timeline ── */}
              <div className="relative space-y-6">
                {/* Continuous Timeline connection track */}
                <div 
                  className="absolute left-[35px] top-8 bottom-8 w-[2px] z-0 pointer-events-none rounded-full" 
                  style={{ 
                    background: `linear-gradient(to bottom, #22c55e 0%, ${theme.primary} 60%, #e2e8f0 100%)`
                  }}
                />

                {(path.phases || []).map((phase, pIdx) => {
                  const isPhaseDone = phase.modules.every(m => m.isCompleted);
                  const isPhaseActive = phase.modules.some(m => !isModuleLocked(m) && !m.isCompleted);

                  return (
                    <div key={phase.id} className="relative pl-16 pb-2">
                      
                      {/* Phase Marker Timeline Node */}
                      <div className="absolute left-[17px] top-[20px] z-10">
                        {isPhaseDone ? (
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-green-500 shadow-md shadow-green-500/25 border border-green-400"
                          >
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                          </div>
                        ) : isPhaseActive ? (
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black font-mono tracking-tight shadow-lg border relative"
                            style={{ 
                              background: theme.primary, 
                              borderColor: theme.primary, 
                              boxShadow: `0 0 14px ${theme.primary}40` 
                            }}
                          >
                            <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: theme.primary }} />
                            <span className="relative z-10 text-[13px]">{pIdx + 1}</span>
                          </div>
                        ) : (
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 font-black font-mono tracking-tight bg-slate-50 border border-slate-200"
                          >
                            <span className="text-[13px]">{pIdx + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Phase Card Container */}
                      <div
                        className="rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.03)]"
                      >
                        {/* Phase header */}
                        <button
                          onClick={() => togglePhase(pIdx)}
                          className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-50/40 cursor-pointer"
                        >
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              PHASE {String(pIdx + 1).padStart(2, '0')}
                            </p>
                            <h4 className="text-[16px] font-extrabold text-slate-800 tracking-tight" style={{ letterSpacing: '-0.01em' }}>
                              {phase.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <span 
                              className="text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider border transition-all"
                              style={{ 
                                background: isPhaseDone ? 'rgba(22, 163, 74, 0.04)' : theme.bg, 
                                color: isPhaseDone ? '#166534' : theme.primary,
                                borderColor: isPhaseDone ? 'rgba(22, 163, 74, 0.12)' : `${theme.primary}15`
                              }}
                            >
                              {phase.modules.filter(m => m.isCompleted).length}/{phase.modules.length} Completed
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                              {expandedPhases[pIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </button>

                        {/* Chapter Progress bar track */}
                        <div className="w-full h-[3px] bg-slate-50 relative">
                          <div 
                            className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out"
                            style={{ 
                              width: `${(phase.modules.filter(m => m.isCompleted).length / phase.modules.length) * 100}%`,
                              backgroundColor: isPhaseDone ? '#22c55e' : theme.primary 
                            }}
                          />
                        </div>

                        {/* Phase Content (Smooth collapse with AnimatePresence) */}
                        <AnimatePresence initial={false}>
                          {expandedPhases[pIdx] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-6 pb-6 pt-0"
                                style={{ borderTop: '1px solid #f8fafc' }}
                              >
                                {phase.description && (
                                  <div 
                                    className="relative pl-6 py-4 my-5 italic text-slate-600 text-[13px] text-justify leading-relaxed font-serif bg-slate-50/50 rounded-2xl border border-slate-100/50"
                                  >
                                    <span className="absolute left-2 text-[26px] font-serif text-slate-350 leading-none select-none">“</span>
                                    <p className="relative z-10 pr-2">{phase.description}</p>
                                  </div>
                                )}
                                
                                <div className="relative space-y-3 mt-2">
                                  {/* Minor timeline track for modules */}
                                  <div className="absolute left-[19px] top-4 bottom-4 w-[1px] bg-slate-100 z-0 pointer-events-none" />

                                  {phase.modules.map(m => {
                                    const locked = isModuleLocked(m);
                                    const done   = m.isCompleted;
                                    const active = !locked && !done;

                                    return (
                                      <motion.div
                                        key={m.id}
                                        whileHover={locked ? undefined : { y: -2, x: 2, scale: 1.005, boxShadow: `0 8px 24px -12px ${theme.primary}20` }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${m.id}?entry=classroom`)}
                                        className="relative flex flex-col md:flex-row md:items-center justify-between pl-12 pr-5 py-4 rounded-2xl border transition-all duration-300"
                                        style={{
                                          cursor: locked ? 'default' : 'pointer',
                                          opacity: locked ? 0.5 : 1,
                                          background: done 
                                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.005) 0%, rgba(34, 197, 94, 0.02) 100%)' 
                                            : active
                                            ? `linear-gradient(135deg, #fff 0%, ${theme.bg}20 100%)`
                                            : '#fff',
                                          borderColor: done
                                            ? 'rgba(22, 163, 74, 0.12)'
                                            : active
                                            ? `${theme.primary}35`
                                            : '#f1f5f9',
                                        }}
                                      >
                                        {/* Timeline Node Checkpoint Indicator */}
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                                          {locked ? (
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
                                              <Lock size={8} className="text-slate-300" />
                                            </div>
                                          ) : done ? (
                                            <div className="w-4.5 h-4.5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm shadow-green-500/10 border border-green-400">
                                              <CheckCircle2 size={11} strokeWidth={3} />
                                            </div>
                                          ) : (
                                            <div className="relative flex items-center justify-center w-4.5 h-4.5">
                                              <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: theme.primary }} />
                                              <div className="relative w-4 h-4 rounded-full text-white flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
                                                <Play size={8} fill="currentColor" className="ml-[1.5px]" />
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Module Info */}
                                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <span
                                              className="text-[14px] font-bold tracking-tight text-slate-800"
                                              style={{ color: done ? '#166534' : '#1e293b' }}
                                            >
                                              {m.title}
                                            </span>
                                            {active && (
                                              <span
                                                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                style={{ background: theme.bg, color: theme.primary }}
                                              >
                                                Next Up
                                              </span>
                                            )}
                                          </div>

                                          {/* Concept Badge pills & scouted resources */}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {(m.keyConcepts || []).slice(0, 3).map((concept, cIdx) => (
                                              <span 
                                                key={cIdx}
                                                className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500"
                                              >
                                                {concept}
                                              </span>
                                            ))}

                                            {/* Resource type classification tags */}
                                            {hasResourceType(m, 'video') && (
                                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-rose-50/30 border border-rose-100/30 text-rose-600 flex items-center gap-1">
                                                <Video size={10} /> Video
                                              </span>
                                            )}
                                            {hasResourceType(m, 'pdf') && (
                                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-blue-50/30 border border-blue-100/30 text-blue-600 flex items-center gap-1">
                                                <FileText size={10} /> Reading
                                              </span>
                                            )}
                                            {hasResourceType(m, 'url') && (
                                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-amber-50/30 border border-amber-100/30 text-amber-600 flex items-center gap-1">
                                                <Link size={10} /> Reference
                                              </span>
                                            )}
                                            {(m.title.toLowerCase().includes('code') || m.title.toLowerCase().includes('react') || m.title.toLowerCase().includes('script') || m.title.toLowerCase().includes('sandbox')) && (
                                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50/30 border border-emerald-100/30 text-emerald-600 flex items-center gap-1">
                                                <Terminal size={10} /> Cortex Lab
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Duration & Launch Action */}
                                        <div className="flex items-center gap-3.5 mt-3.5 md:mt-0 ml-12 md:ml-0 shrink-0">
                                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100/60 px-2 py-1 rounded-lg">
                                            <Clock size={11} />
                                            <span>{m.estimatedMinutes} min</span>
                                          </div>
                                          {!locked && (
                                            <div 
                                              className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all duration-350"
                                              onMouseEnter={e => {
                                                e.currentTarget.style.color = theme.primary;
                                                e.currentTarget.style.backgroundColor = theme.bg;
                                                e.currentTarget.style.borderColor = `${theme.primary}20`;
                                                e.currentTarget.style.transform = 'translateX(2px)';
                                              }}
                                              onMouseLeave={e => {
                                                e.currentTarget.style.color = '';
                                                e.currentTarget.style.backgroundColor = '';
                                                e.currentTarget.style.borderColor = '';
                                                e.currentTarget.style.transform = '';
                                              }}
                                            >
                                              <ArrowRight size={14} />
                                            </div>
                                          )}
                                        </div>

                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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