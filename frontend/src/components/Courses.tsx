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

// ── Supreme Classroom Themes ────────────────────────────────────────────────
const classroomThemes = [
  { bg: 'from-blue-600 to-indigo-700', accent: 'text-blue-100', glow: 'shadow-blue-500/20' },
  { bg: 'from-emerald-600 to-teal-700', accent: 'text-emerald-100', glow: 'shadow-emerald-500/20' },
  { bg: 'from-indigo-600 to-purple-700', accent: 'text-indigo-100', glow: 'shadow-indigo-500/20' },
  { bg: 'from-slate-700 to-slate-900', accent: 'text-slate-100', glow: 'shadow-slate-500/20' },
  { bg: 'from-rose-600 to-pink-700', accent: 'text-rose-100', glow: 'shadow-rose-500/20' },
  { bg: 'from-[#000666] to-indigo-900', accent: 'text-blue-100', glow: 'shadow-indigo-900/20' },
];

const ZEN_BG = '/Users/lokeshgandreddy/.gemini/antigravity/brain/dc872753-0d04-4a57-b177-ca71220b4de8/academic_library_hall_zen_mode_1778516263448.png';

// ── Classroom Square Entity: Precision Institutional Card ──────────────────
const ClassroomCard: React.FC<{ path: Path; index: number; onOpen: () => void }> = ({ path, index, onOpen }) => {
  const theme = classroomThemes[index % classroomThemes.length];
  
  return (
    <motion.div
      onClick={onOpen}
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative aspect-square cursor-pointer rounded-none overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.2)] transition-all duration-500 bg-gradient-to-br ${theme.bg} ${theme.glow}`}
    >
      {/* ── Institutional Watermark (Fills the Void) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        <GraduationCap size={300} className="text-white" strokeWidth={0.5} />
      </div>

      {/* ── Cinema-Grade Atmosphere ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)] pointer-events-none" />
      
      {/* ── Institutional Hanging Icon ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className="w-[1px] h-12 bg-white/30" />
        <div className="relative group-hover:scale-110 transition-transform duration-500">
           <Lightbulb size={24} className="text-white fill-white/10" strokeWidth={1.5} />
           <div className="absolute inset-0 blur-[15px] bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* ── Central Precision Box (Surgical Re-balance) ── */}
      <div className="absolute inset-6 flex items-center justify-center z-10">
        <div className="w-full border border-white/15 rounded-[24px] p-8 backdrop-blur-xl bg-white/[0.03] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center text-center group-hover:border-white/30 transition-colors duration-500">
           <h3 className="text-[16px] sm:text-[19px] font-black text-white leading-[1.2] tracking-wider uppercase italic drop-shadow-md">
             {path.title.replace(/mastery|roadmap|path|learning/gi, '').trim()}
           </h3>
        </div>
      </div>

      {/* ── Silent Mastery Indicator (Subtle Base Accent) ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/5 overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${path.progress}%` }}
           transition={{ duration: 1.5, ease: "circOut" }}
           className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)]" 
         />
      </div>

      {/* High-Contrast Hover Shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </motion.div>
  );
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();

  const allPaths = useMemo(() => paths, [paths]);

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#fafafa] text-slate-900">
      
      {/* ── Supreme Cinematic Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isZenMode ? 1 : 0 }}
          className="absolute inset-0 z-0"
        >
          <img src={ZEN_BG} className="w-full h-full object-cover blur-[5px] opacity-40" alt="library hall" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa]/80 via-transparent to-black/60" />
        </motion.div>

        {!isZenMode && (
          <>
            <motion.div 
              animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[140px]" 
            />
          </>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.04] pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto px-8 sm:px-24 py-12 transition-all duration-1000">
        <div className="space-y-20">
          
          {/* ── Surgical Top-Bar HUD ── */}
          <header className={`flex items-center justify-between transition-all duration-700 ${isZenMode ? 'flex-col gap-8 text-center pt-10' : ''}`}>
            <div className="space-y-2">
              <div className={`flex items-center gap-4 ${isZenMode ? 'justify-center' : ''}`}>
                 <div className="w-10 h-[1px] bg-emerald-500/30" />
                 <p className="text-[10px] font-black uppercase tracking-[0.6em] text-emerald-600/60">Classroom Archive</p>
              </div>
              <h1 className={`${isZenMode ? 'text-6xl' : 'text-5xl sm:text-7xl'} font-black tracking-tighter leading-none uppercase italic transition-all duration-700`}>
                <span className={isZenMode ? 'text-[#000666]' : 'text-slate-300'}>
                  {isZenMode ? 'Mastery' : 'The'}
                </span>
                <span className={`inline-block ml-4 ${isZenMode ? 'text-emerald-400' : 'text-emerald-600/90'} not-italic`}>Archive</span>
              </h1>
            </div>

            <div className={`flex items-center gap-6 ${isZenMode ? '' : 'fixed top-12 right-24 z-[100]'}`}>
               <button 
                 onClick={() => navigate('/create')} 
                 className="h-11 px-8 bg-[#000666] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
               >
                 <Plus size={14} strokeWidth={3} />
                 Architect
               </button>
               <button onClick={() => setIsZenMode(!isZenMode)} className={`flex items-center gap-3 h-11 px-8 rounded-full transition-all border ${isZenMode ? 'bg-white border-white text-black shadow-3xl scale-110' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'}`}>
                 <Sparkles size={16} className={isZenMode ? 'animate-pulse text-emerald-500' : ''} />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isZenMode ? 'Exit' : 'Scholar Focus'}</span>
               </button>
            </div>
          </header>

          {allPaths.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center">
              <LayoutGrid size={60} className="text-slate-200 mb-12" strokeWidth={1} />
              <h2 className="text-4xl font-black text-[#000666] tracking-tighter mb-4 uppercase">Archive Empty</h2>
              <p className="text-[14px] font-medium text-slate-400 max-w-sm mb-12 italic">Your intellectual history will appear here. Deploy a path from the library to begin building your classrooms.</p>
              <button onClick={() => navigate('/library')} className="px-12 py-5 bg-[#000666] text-white rounded-full text-[12px] uppercase font-black tracking-[0.3em] shadow-2xl hover:scale-105 transition-transform">
                Access Roadmap Library
              </button>
            </div>
          ) : (
            <div className="pb-80">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-10">
                {allPaths.map((path, idx) => (
                  <ClassroomCard 
                    key={path.id} 
                    path={path} 
                    index={idx} 
                    onOpen={() => navigate(`/path/${path.id}`)} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Courses;
