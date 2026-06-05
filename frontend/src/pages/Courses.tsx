import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  ArrowRight, BookOpen, Clock, Plus, CheckCircle2, Zap, LayoutGrid, 
  Flame, Award, Compass, Sparkles, ChevronRight, Play, Trash2, ArrowUpRight
} from 'lucide-react';

type Path = ReturnType<typeof useAppStore>['paths'][0];

/* ─── Light-Mode Category Tag Helper (Cursor Style) ────────────────────────── */
const getCategoryLabelColor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('front') || t.includes('ui') || t.includes('react') || t.includes('design') || t.includes('js') || t.includes('javascript') || t.includes('css')) {
    return 'text-amber-700 bg-amber-50 border-amber-200/50';
  }
  if (t.includes('back') || t.includes('api') || t.includes('db') || t.includes('sql') || t.includes('node') || t.includes('go') || t.includes('rust') || t.includes('postgresql')) {
    return 'text-blue-700 bg-blue-50 border-blue-200/50';
  }
  if (t.includes('ai') || t.includes('ml') || t.includes('machine') || t.includes('agent') || t.includes('llm') || t.includes('gpt') || t.includes('gemini') || t.includes('neural')) {
    return 'text-rose-700 bg-rose-50 border-rose-200/50';
  }
  if (t.includes('devops') || t.includes('cloud') || t.includes('docker') || t.includes('k8s') || t.includes('kubernetes') || t.includes('sre') || t.includes('aws')) {
    return 'text-purple-700 bg-purple-50 border-purple-200/50';
  }
  return 'text-emerald-700 bg-emerald-50 border-emerald-200/50';
};

/* ─── Light-Mode Minimalist Course Card (Cursor Style) ──────────────────────── */
const PathCard: React.FC<{ path: Path; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }> = ({ 
  path, 
  onOpen, 
  onDelete 
}) => {
  const totalModules    = path.phases.reduce((a, ph) => a + ph.modules.length, 0);
  const completedMods   = path.phases.reduce((a, ph) => a + ph.modules.filter(m => m.isCompleted).length, 0);
  const totalMinutes    = path.phases.reduce((a, ph) => a + ph.modules.reduce((b, m) => b + (m.estimatedMinutes || 0), 0), 0);
  const progress        = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0;
  const isComplete      = progress === 100;

  const tagColorClass = getCategoryLabelColor(path.title);

  return (
    <article
      onClick={onOpen}
      className="group relative flex flex-col justify-between bg-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all duration-200 cursor-pointer select-none"
    >
      <div>
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${tagColorClass}`}>
            {path.title.toLowerCase().includes('ios') ? 'iOS Dev' : 
             path.title.toLowerCase().includes('front') ? 'Frontend' : 
             path.title.toLowerCase().includes('back') ? 'Backend' : 
             path.title.toLowerCase().includes('ai') ? 'AI/ML' : 
             path.title.toLowerCase().includes('devops') ? 'DevOps' : 'Syllabus'}
          </span>
          
          <span className="text-[11px] font-bold text-slate-500 font-mono">
            {progress}%
          </span>
        </div>

        <h3 className="text-[13.5px] font-bold text-slate-800 leading-snug line-clamp-2 font-display group-hover:text-slate-900 transition-colors">
          {path.title}
        </h3>

        <p className="text-[11.5px] text-slate-500 leading-relaxed line-clamp-2 mt-2 font-sans">
          {path.goal}
        </p>
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-100/70 flex flex-col gap-3">
        {/* Flat Progress bar */}
        <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height: 2.5 }}>
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: isComplete ? '#10b981' : '#4e5bff'
            }}
          />
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-450 font-mono">
              <BookOpen size={11} className="text-slate-400" />
              {completedMods}/{totalModules}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-450 font-mono">
              <Clock size={11} className="text-slate-400" />
              {Math.round(totalMinutes / 60)}h
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
              title="Delete Roadmap"
            >
              <Trash2 size={12} />
            </button>
            <div className="p-1 rounded text-slate-400 group-hover:text-slate-700 transition-colors">
              <ArrowUpRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ─── Courses Main Component ────────────────────────────────────────────────── */
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths, userProfile, deletePath } = useAppStore();

  const hasAny = paths.length > 0;

  // Resolve active path
  const activePath = useMemo(() => {
    return paths.find(p => p.progress < 100) || paths[0] || null;
  }, [paths]);

  // Lookup next module info
  const nextModuleInfo = useMemo(() => {
    if (!activePath) return null;
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

  // Advisor advice message
  const motivationalMessage = useMemo(() => {
    if (!activePath) return "Your workspace is empty. Describe your goal to Cortex to synthesize a structured learning path.";
    const title = activePath.title;
    const progress = activePath.progress || 0;

    if (progress === 100) {
      return `Mastery achieved on "${title}"! Define a new goal to initialize another path.`;
    }
    if (progress === 0) {
      return `Complete the first module of "${title}" to start your daily streak!`;
    }
    if (progress > 80) {
      return `Almost completed! Finish the final modules in "${title}" to lock in this skill.`;
    }
    return `Currently working through "${title}" (${progress}% done). Select a module to continue.`;
  }, [activePath]);

  const handleResumeActiveSession = () => {
    if (!activePath || !nextModuleInfo) return;
    navigate(`/study/${activePath.id}/${nextModuleInfo.phase.id}/${nextModuleInfo.module.id}?entry=classroom`);
  };

  const handleDeletePath = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deletePath(id);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'transparent' }}
    >
      <div className="w-full max-w-[1020px] mx-auto px-6 sm:px-8 pt-10 pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 text-white animate-none">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4e5bff]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#a5b4fc]/80 font-mono">Workspace Console</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Classrooms</h1>
            <p className="text-[12.5px] text-[#e0e7ff]/70 mt-1 max-w-[480px]">
              Jump back into active modules, track overall progress, or generate a new path with Cortex.
            </p>
          </div>

          <button
            onClick={() => navigate('/create')}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 h-8.5 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition-all duration-150 shadow-sm border border-slate-200 cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            Generate Path
          </button>
        </div>

        {/* ── Clean Light-Slate Spotlight Banner ── */}
        {activePath && nextModuleInfo && (
          <div 
            className="relative rounded-xl p-5 mb-7 border border-slate-200/60 bg-slate-50/70 text-slate-800 flex flex-col md:flex-row justify-between gap-5"
          >
            <div className="flex-1 flex flex-col justify-between relative z-10">
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                    Active Roadmap
                  </span>
                </div>

                <h2 className="text-[15px] font-bold tracking-tight text-slate-800 font-display">
                  {activePath.title}
                </h2>
                
                <p className="text-[12px] text-slate-500 mt-1.5 font-sans">
                  Next module: <span className="font-bold text-slate-700">{nextModuleInfo.module.title}</span> &bull; {nextModuleInfo.phase.title}
                </p>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleResumeActiveSession}
                  className="inline-flex items-center justify-center gap-1.5 h-7.5 px-4.5 rounded-lg bg-[#4e5bff] hover:bg-[#3b46e6] text-white font-bold text-[11.5px] transition-colors duration-150 cursor-pointer shadow-sm"
                >
                  <Play size={10} fill="currentColor" />
                  Resume Module
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>

            {/* SARA Speech Panel */}
            <div className="w-full md:w-[280px] shrink-0 flex flex-col justify-center relative z-10 border-l border-slate-200/60 pl-5 md:mt-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} className="text-slate-400" />
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                  SARA Advisor
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-500 italic font-mono">
                "{motivationalMessage}"
              </p>
            </div>
          </div>
        )}

        {/* ── Neat White Console Sheet ── */}
        <div 
          className="bg-white/95 backdrop-blur-xl rounded-2xl p-6.5 border border-slate-200/60 shadow-[0_12px_36px_rgba(13,23,48,0.02)] min-h-[50vh] mt-4"
        >
          {hasAny ? (
            <>
              {/* Minimal Stats HUD */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
                {/* Active Paths */}
                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none">
                  <div className="w-9 h-9 rounded-lg bg-white text-slate-450 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800 leading-none font-mono">{paths.length}</h4>
                    <span className="text-[9.5px] font-bold text-slate-450 mt-1 uppercase tracking-wider block font-mono">Roadmaps</span>
                  </div>
                </div>

                {/* Completed */}
                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none">
                  <div className="w-9 h-9 rounded-lg bg-white text-slate-450 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Award size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800 leading-none font-mono">
                      {paths.filter(p => p.progress === 100).length}
                    </h4>
                    <span className="text-[9.5px] font-bold text-slate-450 mt-1 uppercase tracking-wider block font-mono">Completed</span>
                  </div>
                </div>

                {/* Study Hours */}
                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none">
                  <div className="w-9 h-9 rounded-lg bg-white text-slate-450 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800 leading-none font-mono">
                      {Math.round(paths.reduce((acc, p) => acc + p.phases.reduce((a, ph) => a + ph.modules.reduce((b, m) => b + (m.estimatedMinutes || 0), 0), 0), 0) / 60)}h
                    </h4>
                    <span className="text-[9.5px] font-bold text-slate-450 mt-1 uppercase tracking-wider block font-mono">Study Hours</span>
                  </div>
                </div>

                {/* active streak */}
                <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-200/50 flex items-center gap-3.5 select-none">
                  <div className="w-9 h-9 rounded-lg bg-white text-slate-450 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                    <Flame size={16} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-800 leading-none font-mono">{userProfile.streakDays || 1}d</h4>
                    <span className="text-[9.5px] font-bold text-slate-450 mt-1 uppercase tracking-wider block font-mono">Streak</span>
                  </div>
                </div>
              </div>

              {/* Grid of paths */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {paths.map(path => (
                  <PathCard
                    key={path.id}
                    path={path}
                    onOpen={() => navigate(`/path/${path.id}`)}
                    onDelete={(e) => handleDeletePath(path.id, path.title, e)}
                  />
                ))}

                {/* Minimal Add Card */}
                <article
                  onClick={() => navigate('/create')}
                  className="group flex flex-col items-center justify-center bg-slate-50/20 hover:bg-slate-50/55 border border-dashed border-slate-250 hover:border-slate-350 rounded-xl p-5 min-h-[170px] transition-all duration-200 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2.5 text-slate-400 group-hover:text-slate-700 transition-colors border border-slate-200 shadow-sm">
                    <Plus size={15} strokeWidth={2.5} />
                  </div>
                  <span className="text-[12.5px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors font-sans">
                    New Learning Path
                  </span>
                  <p className="text-[10.5px] text-slate-400 text-center mt-1 max-w-[170px] leading-normal font-sans">
                    Ground the compiler with goals and reference materials.
                  </p>
                </article>
              </div>
            </>
          ) : (
            /* ── Zero saved paths empty state ── */
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto">
              <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-5 shadow-sm">
                <LayoutGrid size={18} strokeWidth={1.8} />
              </div>
              <h2 className="text-[16px] font-bold text-slate-800 font-display mb-1.5">
                No active paths
              </h2>
              <p className="text-[12px] text-slate-500 leading-relaxed font-sans mb-6">
                Tell Cortex what skills or topics you want to master. We will compile a custom roadmap schedule and resource guidelines.
              </p>
              <button
                onClick={() => navigate('/create')}
                className="inline-flex items-center justify-center gap-1.5 h-8.5 px-4.5 rounded-lg bg-[#0d0d0d] hover:opacity-90 text-white font-bold text-[12px] transition-all duration-150 cursor-pointer shadow-sm"
              >
                <Zap size={11} fill="currentColor" />
                Initialize Path
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Courses;
