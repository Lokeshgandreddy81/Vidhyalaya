import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  BookOpen, Clock, Database, FolderOpen, Search, CheckCircle2, ArrowUpRight, Sparkles
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ── Types ────────────────────────────────────────────────────────────────────
type LibraryItem = {
  id: string;
  pathId: string;
  phaseId: string;
  moduleId: string;
  courseTitle: string;
  moduleTitle: string;
  minutes: number;
  completed: boolean;
  resourceCount: number;
  searchTags: string;
};

// ── Main Component ───────────────────────────────────────────────────────────
const Library: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();
  const [query, setQuery] = useState('');
  const [selectedPathId, setSelectedPathId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');

  const activePaths = paths.filter(p => p.status !== 'archived');

  // Flatten & Map Data
  const libraryItems: LibraryItem[] = activePaths.flatMap(path =>
    path.phases.flatMap(phase =>
      phase.modules.map(mod => ({
        id: `${path.id}-${phase.id}-${mod.id}`,
        pathId: path.id,
        phaseId: phase.id,
        moduleId: mod.id,
        courseTitle: path.title,
        moduleTitle: mod.title,
        minutes: mod.estimatedMinutes || 0,
        completed: mod.isCompleted,
        resourceCount: mod.resources?.length || 0,
        searchTags: [path.title, phase.title, mod.title, mod.description, ...(mod.keyConcepts || [])].join(' ').toLowerCase()
      }))
    )
  );

  const totalModules = libraryItems.length;
  const totalHours = (libraryItems.reduce((s, i) => s + i.minutes, 0) / 60).toFixed(0);
  const totalResources = libraryItems.reduce((s, i) => s + i.resourceCount, 0);

  // Filter Logic
  const filtered = libraryItems.filter(item => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || item.searchTags.includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'done' ? item.completed : !item.completed);
    const matchPath = selectedPathId === 'all' || item.pathId === selectedPathId;
    return matchQ && matchStatus && matchPath;
  });

  const openStudy = (item: LibraryItem) => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`);

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#030509] text-slate-100">
      
      {/* ── Sacred Ambiance (Dynamic Void Gradients) ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.25, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-500/10 blur-[140px]" 
        />
        <motion.div 
          animate={{ scale: [1.25, 1, 1.25], x: [0, -50, 0], y: [0, -20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-600/10 blur-[140px]" 
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 sm:px-12 py-16">
        
        {totalModules === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-700">
            <FolderOpen size={48} className="text-indigo-400 mb-8 animate-pulse" strokeWidth={1} />
            <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Sanctuary is Vacant</h2>
            <p className="text-[13px] font-medium text-slate-500 max-w-sm mb-10">Deploy a synthesis roadmap to construct your knowledge vaults.</p>
            <button onClick={() => navigate('/create')} className="px-10 py-4 bg-indigo-600 text-white rounded-full text-[10px] uppercase font-black tracking-[0.2em] shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-105 transition-transform">
              Deploy Roadmap
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* ── Sacred Header ── */}
            <header className="space-y-8 pb-10 border-b border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="text-center sm:text-left space-y-2">
                  {!isZenMode && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">
                      <Sparkles size={10} /> Sanctuary of Knowledge
                    </div>
                  )}
                  <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-white via-indigo-200 to-indigo-500 bg-clip-text text-transparent leading-none">
                    SARA's Vault
                  </h1>
                  {!isZenMode && (
                    <p className="text-[13px] font-medium text-slate-400 max-w-xl font-serif italic">
                      Your synthesized neural vaults, conceptual modules, and vetted resources — indexed forever.
                    </p>
                  )}
                </div>

                <button 
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={`flex items-center gap-2 h-9 px-5 rounded-[14px] transition-all border self-center sm:self-start ${
                    isZenMode 
                      ? 'bg-white border-white text-[#07090e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Sparkles size={14} className={isZenMode ? 'animate-pulse' : ''} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
                </button>
              </div>

              {/* Glowing Pod Stats */}
              {!isZenMode && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  <div className="group relative bg-white/[0.01] rounded-[24px] p-6 border border-white/5 shadow-2xl flex items-center gap-5 hover:border-indigo-500/20 hover:bg-white/[0.02] transition-all duration-500">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-0.5">Modules</p>
                      <p className="text-2xl font-black text-white">{totalModules}</p>
                    </div>
                  </div>

                  <div className="group relative bg-white/[0.01] rounded-[24px] p-6 border border-white/5 shadow-2xl flex items-center gap-5 hover:border-indigo-500/20 hover:bg-white/[0.02] transition-all duration-500">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform duration-500 animate-pulse">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-0.5">Study Duration</p>
                      <p className="text-2xl font-black text-white">{totalHours} Hours</p>
                    </div>
                  </div>

                  <div className="group relative bg-white/[0.01] rounded-[24px] p-6 border border-white/5 shadow-2xl flex items-center gap-5 hover:border-indigo-500/20 hover:bg-white/[0.02] transition-all duration-500">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                      <Database size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-0.5">Vetted Sources</p>
                      <p className="text-2xl font-black text-white">{totalResources}</p>
                    </div>
                  </div>
                </div>
              )}
            </header>

            {/* ── Controls ── */}
            {!isZenMode && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex flex-wrap gap-6">
                  <select 
                    value={selectedPathId} onChange={e => setSelectedPathId(e.target.value)}
                    className="bg-transparent text-[11px] font-black text-slate-300 uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-colors"
                  >
                    <option value="all">All Realms</option>
                    {activePaths.map(p => <option key={p.id} value={p.id} className="bg-[#030509]">{p.title}</option>)}
                  </select>
                  <select 
                    value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-transparent text-[11px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <option value="all" className="bg-[#030509]">Status: All</option>
                    <option value="open" className="bg-[#030509]">Open</option>
                    <option value="done" className="bg-[#030509]">Mastered</option>
                  </select>
                </div>

                <div className="relative group">
                  <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search architecture..." 
                    className="pl-7 bg-transparent outline-none text-[13px] font-bold text-white placeholder:text-slate-500 w-full sm:w-64 border-b border-transparent focus:border-indigo-500 pb-1 transition-all" 
                  />
                </div>
              </div>
            )}

            {/* ── Grid ── */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-[12px] font-bold uppercase tracking-widest text-slate-500">
                No matching modules found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-700">
                <AnimatePresence mode="popLayout">
                  {filtered.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => openStudy(item)} 
                      className={`group cursor-pointer rounded-[24px] p-6 border transition-all duration-500 relative overflow-hidden flex flex-col min-h-[210px] ${
                        item.completed 
                          ? 'border-emerald-500/10 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] hover:border-emerald-500/20' 
                          : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/20 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.3)] hover:-translate-y-1'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10 flex-1 flex flex-col justify-between">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 line-clamp-1 ${item.completed ? 'text-emerald-400/80' : 'text-indigo-400/80'}`}>{item.courseTitle}</p>
                          <h3 className="text-[15px] font-black text-slate-200 group-hover:text-white leading-snug tracking-tight transition-colors line-clamp-3">
                            {item.moduleTitle}
                          </h3>
                        </div>
                        
                        <div className="mt-8 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock size={12} className="opacity-60 text-indigo-400"/>{item.minutes}m</span>
                            <span className="flex items-center gap-1.5"><Database size={12} className="opacity-60 text-indigo-400"/>{item.resourceCount} Sources</span>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${item.completed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-45'}`}>
                            {item.completed ? <CheckCircle2 size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                        </div>
                      </div>
                    </div>
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

export default Library;
