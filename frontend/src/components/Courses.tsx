import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, BookOpen, Clock, GraduationCap, Plus, Search, CheckCircle2, Sparkles, LayoutGrid, Lightbulb, Hash, Database
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ── Types ────────────────────────────────────────────────────────────────────
type Path = ReturnType<typeof useAppStore>['paths'][0];

// ── Refined Library Themes (Matching PNG Palette) ───────────────────────────
const libraryThemes = [
  { bg: 'bg-[#3b82f6]', text: 'text-white', icon: 'text-white/80', shadow: 'shadow-blue-500/20' },
  { bg: 'bg-[#1e1b4b]', text: 'text-white', icon: 'text-white/80', shadow: 'shadow-indigo-900/20' },
  { bg: 'bg-[#0f766e]', text: 'text-white', icon: 'text-white/80', shadow: 'shadow-teal-700/20' },
  { bg: 'bg-[#2dd4bf]', text: 'text-slate-900', icon: 'text-slate-900/60', shadow: 'shadow-emerald-400/20' },
];

const tags = ['AI Basics', 'Advanced Prompting', 'Ethics', 'Implementation', 'Architecture', 'Strategy', 'Ethics & Safety'];

// ── Vibrant Knowledge Capsule (Card) ─────────────────────────────────────────
const ClassroomCard: React.FC<{ path: Path; index: number; onOpen: () => void }> = ({ path, index, onOpen }) => {
  const theme = libraryThemes[index % libraryThemes.length];
  
  return (
    <motion.div
      onClick={onOpen}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col items-center justify-center h-[160px] p-4 cursor-pointer rounded-xl ${theme.bg} ${theme.shadow} shadow-lg transition-all duration-300 overflow-hidden`}
    >
      {/* Lightbulb Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-t from-white to-transparent transition-opacity duration-500" />
      
      <div className={`mb-4 transition-transform duration-500 group-hover:scale-110 ${theme.icon}`}>
        <Lightbulb size={48} strokeWidth={1} />
      </div>
      
      <h3 className={`text-[11px] font-black uppercase tracking-widest text-center px-2 line-clamp-2 leading-relaxed ${theme.text}`}>
        {path.title}
      </h3>

      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight size={14} className={theme.text} />
      </div>
    </motion.div>
  );
};

// ── Category Section Component ───────────────────────────────────────────────
const CategorySection: React.FC<{ title: string; description: string; paths: Path[]; onOpenPath: (id: string) => void }> = ({ title, description, paths, onOpenPath }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800 max-w-md leading-tight">
          {title}
        </h2>
        <div className="max-w-md text-right md:text-left">
          <p className="text-[10px] font-medium text-slate-400 leading-relaxed mb-1.5">
            {description}
          </p>
          <button className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2">
            Visit Category <ArrowUpRight size={10} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {paths.map((path, idx) => (
          <ClassroomCard key={path.id} path={path} index={idx} onOpen={() => onOpenPath(path.id)} />
        ))}
      </div>
    </div>
  );
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();

  // Group paths by Category (Track)
  const categories = useMemo(() => {
    const groups: Record<string, Path[]> = {};
    paths.forEach(p => {
      const cat = p.goal.split(' ')[0] || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [paths]);

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-white text-slate-900">
      
      {/* ── Luminous Scholarly Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         {/* Vibrant Prism Orbs (Ultra-Subtle) */}
         <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-indigo-200/10 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute top-[20%] -right-[5%] w-[40vw] h-[40vw] bg-emerald-100/10 rounded-full blur-[100px] animate-blob" />
         
         {/* Mesh Gradient Overlay */}
         <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/80 to-indigo-50/20" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-10 py-12">
        <div className="space-y-12">
          
          {/* ── Library Header ── */}
          <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-8">
               <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-1 bg-indigo-600 rounded-full" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Library Archive</span>
                 </div>
                 <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.1] max-w-xl tracking-tight">
                   Learning Realms & Knowledge Architecture
                 </h1>
               </div>
               <div className="max-w-md pt-2">
                 <p className="text-xs font-medium text-slate-500 leading-relaxed mb-5">
                    Preserve your generated path architectures. Redeploy any realm instantly for deep-focus study and modular knowledge mastery.
                 </p>
                 <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/create')} className="h-10 px-6 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">
                      New Synthesis
                    </button>
                    <button onClick={() => setIsZenMode(!isZenMode)} className="h-10 px-6 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                      {isZenMode ? 'Exit' : 'Focus'}
                    </button>
                 </div>
               </div>
            </header>

            {/* ── Tag Navigation Chips ── */}
            <div className="flex flex-wrap gap-1.5 pt-2">
               {tags.map(tag => (
                 <button key={tag} className="px-4 py-1.5 rounded-full border border-slate-100 bg-slate-50/30 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all whitespace-nowrap">
                   {tag}
                 </button>
               ))}
            </div>
          </div>

          {/* ── Categorized Sections ── */}
          {Object.keys(categories).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                <Database size={32} className="text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Archive is Empty</h2>
              <button onClick={() => navigate('/create')} className="px-8 py-3 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                Start Synthesis
              </button>
            </div>
          ) : (
            <div className="space-y-16 pb-32">
              {Object.entries(categories).map(([name, paths]) => (
                <CategorySection 
                  key={name}
                  title={`${name} Core`}
                  description={`Modular path architectures focused on ${name} and related theoretical frameworks.`}
                  paths={paths}
                  onOpenPath={(id) => navigate(`/path/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Courses;
