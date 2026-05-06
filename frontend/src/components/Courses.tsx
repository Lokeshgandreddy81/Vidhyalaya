import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, BookOpen, Clock, GraduationCap, Plus, Search, CheckCircle2, Sparkles
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ── Types ────────────────────────────────────────────────────────────────────
type Path = ReturnType<typeof useAppStore>['paths'][0];
// ── Course Card: Floating Minimalist Dark Capsule ─────────────────────────────
const CourseCard = React.forwardRef<HTMLDivElement, { path: Path; onOpen: () => void }>(({ path, onOpen }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onOpen}
      className="group cursor-pointer bg-white/[0.02] rounded-[20px] p-5 border border-white/5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] hover:border-indigo-500/20 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[145px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{path.goal || 'Roadmap'}</p>
            <h3 className="text-[14px] font-black text-slate-200 group-hover:text-white leading-snug tracking-tight transition-colors line-clamp-2">
              {path.title}
            </h3>
          </div>
          
          <div className="w-7 h-7 shrink-0 rounded-full bg-white/5 text-slate-500 flex items-center justify-center transition-all duration-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-45">
            <ArrowUpRight size={13} />
          </div>
        </div>
        
        <div>
          {/* Progress Metrics */}
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
            <span>{path.progress}% Mastery</span>
            {path.progress === 100 && (
              <span className="flex items-center gap-1 text-indigo-400"><CheckCircle2 size={10} /> Mastered</span>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1 w-full bg-white/10 overflow-hidden rounded-full relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${path.progress}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

CourseCard.displayName = 'CourseCard';

// ── Main Component ───────────────────────────────────────────────────────────
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const activePaths = paths.filter(p => p.status !== 'archived');

  const filtered = useMemo(() => {
    let list = activePaths;
    if (filter === 'active') list = list.filter(p => p.progress > 0 && p.progress < 100);
    if (filter === 'completed') list = list.filter(p => p.progress === 100);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.goal && p.goal.toLowerCase().includes(q)));
    }
    return list;
  }, [activePaths, filter, query]);

  const totalClassrooms = activePaths.length;
  const completedClassrooms = activePaths.filter(p => p.progress === 100).length;
  const averageMastery = activePaths.length > 0 
    ? Math.round(activePaths.reduce((s, p) => s + (p.progress || 0), 0) / activePaths.length) 
    : 0;

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#07090e] text-slate-100">
      
      {/* ── Neural Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[130px]" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, -10, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[130px]" 
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 sm:px-12 py-16">
        
        {totalClassrooms === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-700">
            <GraduationCap size={48} className="text-slate-600 mb-8" strokeWidth={1} />
            <h2 className="text-3xl font-black text-white tracking-tighter mb-2">No Active Classrooms</h2>
            <p className="text-[13px] font-medium text-slate-500 max-w-sm mb-10">Deploy a learning path from the Roadmap Library to initialize your classrooms.</p>
            <button onClick={() => navigate('/library')} className="px-10 py-4 bg-indigo-600 text-white rounded-full text-[10px] uppercase font-black tracking-[0.2em] shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 transition-transform">
              Explore Library
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Deployed Classrooms</p>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-none mb-4">My Classrooms</h1>
                {!isZenMode && (
                  <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <span className="flex items-center gap-2"><BookOpen size={13} className="text-indigo-400" /> {totalClassrooms} Active</span>
                    <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> {completedClassrooms} Mastered</span>
                    <span className="flex items-center gap-2"><Clock size={13} className="text-rose-400" /> {averageMastery}% Avg Mastery</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!isZenMode && (
                  <button 
                    onClick={() => navigate('/create')} 
                    className="px-6 py-3.5 bg-indigo-600 text-white rounded-full text-[10px] uppercase font-black tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center gap-2"
                  >
                    <Plus size={12} strokeWidth={3} />
                    Deploy New Path
                  </button>
                )}
                {/* Zen Mode Button */}
                <button 
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={`flex items-center gap-2 h-9 px-5 rounded-[14px] transition-all border ${
                    isZenMode 
                      ? 'bg-white border-white text-[#07090e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Sparkles size={14} className={isZenMode ? 'animate-pulse' : ''} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
                </button>
              </div>
            </header>

            {/* ── Controls ── */}
            {!isZenMode && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`text-[11px] font-black uppercase tracking-widest transition-colors ${filter === 'all' ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-slate-400 hover:text-slate-200 pb-1'}`}
                  >
                    All Realms
                  </button>
                  <button 
                    onClick={() => setFilter('active')}
                    className={`text-[11px] font-black uppercase tracking-widest transition-colors ${filter === 'active' ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-slate-400 hover:text-slate-200 pb-1'}`}
                  >
                    In Progress
                  </button>
                  <button 
                    onClick={() => setFilter('completed')}
                    className={`text-[11px] font-black uppercase tracking-widest transition-colors ${filter === 'completed' ? 'text-white border-b-2 border-indigo-500 pb-1' : 'text-slate-400 hover:text-slate-200 pb-1'}`}
                  >
                    Mastered
                  </button>
                </div>

                <div className="relative group">
                  <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search classrooms..." 
                    className="pl-7 bg-transparent outline-none text-[13px] font-bold text-white placeholder:text-slate-500 w-full sm:w-64 border-b border-transparent focus:border-indigo-500 pb-1 transition-all" 
                  />
                </div>
              </div>
            )}

            {/* ── Grid ── */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-[12px] font-bold uppercase tracking-widest text-slate-500">
                No matching classrooms found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-700">
                <AnimatePresence mode="popLayout">
                  {filtered.map(path => (
                    <CourseCard 
                      key={path.id} 
                      path={path} 
                      onOpen={() => navigate(`/path/${path.id}`)} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
