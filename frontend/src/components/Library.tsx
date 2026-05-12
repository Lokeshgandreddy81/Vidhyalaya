import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  BookOpen, Clock, Database, Search, Sparkles, Bookmark, ChevronRight, Hash, ShieldCheck, GraduationCap, HardDrive
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ── Types ────────────────────────────────────────────────────────────────────
type LibraryItem = {
  id: string;
  pathId: string;
  phaseId: string;
  moduleId: string;
  courseTitle: string;
  phaseTitle: string;
  moduleTitle: string;
  minutes: number;
  completed: boolean;
  resourceCount: number;
  searchTags: string;
  pathGoal: string;
};

// ── Assets & Constants ───────────────────────────────────────────────────────
const DEPT_COVERS: Record<string, string> = {
  'Full Stack Systems Architect': '/Users/lokeshgandreddy/.gemini/antigravity/brain/dc872753-0d04-4a57-b177-ca71220b4de8/fullstack_book_cover_1778513219610.png',
  'AI & LLM Architecture': '/Users/lokeshgandreddy/.gemini/antigravity/brain/dc872753-0d04-4a57-b177-ca71220b4de8/ai_book_cover_1778511500636.png',
  'Mathematics': '/Users/lokeshgandreddy/.gemini/antigravity/brain/dc872753-0d04-4a57-b177-ca71220b4de8/math_book_cover_1778511536095.png'
};

const SPINE_COLORS: Record<string, string> = {
  'frontend': 'bg-indigo-600',
  'backend': 'bg-emerald-600',
  'infrastructure': 'bg-slate-700',
  'deep learning': 'bg-purple-600',
  'physics': 'bg-blue-700',
  'mathematics': 'bg-amber-600',
  'default': 'bg-[#000666]'
};

const ZEN_BG = '/Users/lokeshgandreddy/.gemini/antigravity/brain/dc872753-0d04-4a57-b177-ca71220b4de8/academic_library_hall_zen_mode_1778516263448.png';

// ── Folio Card: The Supreme 3D Archive Entity ──────────────────────────────
const FolioCard: React.FC<{ item: LibraryItem; onOpen: () => void; index: number }> = ({ item, onOpen, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const coverUrl = DEPT_COVERS[item.courseTitle] || DEPT_COVERS[item.pathGoal] || '';
  
  const isStacked = index > 0 && index % 10 === 0;
  const isLeaning = !isStacked && index % 6 === 0;
  const leanAngle = isLeaning ? (index % 12 === 0 ? 8 : -8) : 0;
  
  const lowerPhase = item.phaseTitle.toLowerCase();
  const spineColor = Object.entries(SPINE_COLORS).find(([k]) => lowerPhase.includes(k))?.[1] || SPINE_COLORS.default;

  // Archival Call Number (Procedural)
  const callNumber = useMemo(() => `${item.courseTitle.slice(0, 2).toUpperCase()}-${index + 100}`, [item.courseTitle, index]);

  return (
    <div 
      className={`relative flex items-end justify-center transition-all duration-700 ${
        isStacked ? 'h-[60px] w-[180px] -mb-1' : 'h-[260px] w-[60px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Shelf View (Spine with Archival Details) ── */}
      <motion.div
        animate={{ 
          rotateZ: leanAngle, 
          rotateX: isStacked ? 80 : 0,
          opacity: isHovered ? 0 : 1,
          scale: isHovered ? 0.8 : 1,
          z: isHovered ? 0 : 10
        }}
        className={`relative preserve-3d shadow-xl rounded-sm overflow-hidden bg-white origin-bottom ${
          isStacked ? 'w-[160px] h-[45px]' : 'w-[50px] h-[220px]'
        }`}
      >
        <div className={`absolute inset-0 ${spineColor} border-white/10 flex flex-col items-center justify-between p-2 shadow-[inset_-4px_0_10px_rgba(0,0,0,0.3)]`}>
           {!isStacked && (
             <>
               {/* Top Archival Tag */}
               <div className="flex flex-col items-center gap-1">
                 <div className="w-4 h-[1px] bg-white/20" />
                 <p className="text-[5px] font-bold text-white/40 uppercase tracking-widest">{item.completed ? 'PROOF' : 'STUDY'}</p>
               </div>

               {/* Title Internals */}
               <div className="flex-1 flex flex-col items-center justify-center gap-4">
                 <div className="w-0.5 h-12 bg-white/10 rounded-full" />
                 <p className="text-[7px] font-black text-white/60 uppercase vertical-text tracking-[0.25em] whitespace-nowrap leading-none">
                   {item.moduleTitle.slice(0, 24)}
                 </p>
                 <div className="w-0.5 h-8 bg-white/10 rounded-full" />
               </div>

               {/* Bottom Call Number & Mastery Indicator */}
               <div className="flex flex-col items-center gap-2 pb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.completed ? 'bg-emerald-400' : 'bg-white/20'} shadow-sm`} />
                  <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">{callNumber}</p>
                  <div className="w-6 h-4 bg-white/5 rounded-sm flex items-center justify-center text-white/20 text-[5px] font-black border border-white/5">
                    2026
                  </div>
               </div>
             </>
           )}
           {isStacked && (
             <div className="w-full h-full flex items-center justify-between px-6">
                <p className="text-[6px] font-black text-white/20 uppercase tracking-[0.5em]">{callNumber}</p>
                <div className="w-0.5 h-6 bg-white/10" />
                <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">{item.moduleTitle.slice(0, 20)}</p>
             </div>
           )}
        </div>
        {/* Spine Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-[0.1] pointer-events-none" />
      </motion.div>

      {/* ── Cinematic Center Focus View (Triggered on Hover) ── */}
      <AnimatePresence>
        {isHovered && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none">
            {/* Supreme Cinematic Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000666]/10 backdrop-blur-[60px]"
            />

            {/* Magnified Centered Folio (Supreme 3D Realism) */}
            <motion.div
              layoutId={item.id}
              initial={{ scale: 0.8, y: 100, rotateY: -15, rotateX: 5, opacity: 0 }}
              animate={{ scale: 1, y: 0, rotateY: -8, rotateX: 2, opacity: 1 }}
              exit={{ scale: 0.8, y: 100, rotateY: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 1 }}
              className="relative w-[440px] h-[620px] bg-[#fdfdfd] overflow-visible pointer-events-auto cursor-pointer group"
              onClick={onOpen}
              style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
            >
              {/* ── Dynamic Contact Shadow ── */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[90%] h-12 bg-black/40 blur-[40px] rounded-[100%] opacity-60 group-hover:scale-105 transition-transform duration-700" />
              
              {/* ── 3D Page Stack (Physical Depth) ── */}
              <div className="absolute right-[-14px] top-[4px] bottom-[4px] w-[18px] bg-[#f0f0f0] border-y border-r border-slate-300/40 shadow-[inset_4px_0_10px_rgba(0,0,0,0.05)] flex flex-col justify-between py-1 z-0">
                 {[...Array(35)].map((_, i) => (
                    <div key={i} className="w-full h-[1px] bg-black/[0.04]" />
                 ))}
              </div>

              {/* ── Main Cover Architecture ── */}
              <div className="absolute inset-0 bg-[#fdfdfd] shadow-[20px_40px_80px_rgba(0,0,0,0.35),0_10px_20px_rgba(0,0,0,0.15)] z-10 border-l border-white/40 overflow-hidden">
                {coverUrl && !imgError ? (
                  <img src={coverUrl} alt="cover" onError={() => setImgError(true)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full p-16 flex flex-col justify-between overflow-hidden relative">
                    {/* High-Intensity Linen-Leather Texture Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/linen.png')] opacity-[0.35] pointer-events-none mix-blend-multiply" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-black/10 pointer-events-none" />
                    
                    {/* Spine Hinge Detail */}
                    <div className="absolute left-[60px] top-0 bottom-0 w-[1.5px] bg-black/[0.08] z-20" />
                    <div className="absolute left-0 top-0 bottom-0 w-[60px] bg-gradient-to-r from-black/25 via-black/5 to-transparent z-20" />
                    
                    <div className="space-y-12 pt-8 relative z-10 ml-12">
                      <div className="flex items-start gap-6">
                         <div className={`w-6 h-6 rounded-full ${spineColor} shadow-2xl brightness-110 relative`}>
                            <div className="absolute inset-0 rounded-full bg-white/30 blur-[2px]" />
                         </div>
                         <div className="flex flex-col gap-1.5">
                            <p className="text-[13px] font-black uppercase tracking-[0.6em] text-slate-500 leading-none">
                              {item.phaseTitle.replace(' -', '').replace(/-/g, ' ')}
                            </p>
                            <span className="text-[10px] font-black text-indigo-500/80 uppercase tracking-[0.4em] bg-indigo-50 px-3 py-1 w-fit rounded-sm border border-indigo-100/50">
                               Call No. {callNumber}
                            </span>
                         </div>
                      </div>

                      <h3 className="text-[46px] font-black text-[#000666] leading-[0.9] tracking-tighter uppercase italic drop-shadow-[0_2px_4px_rgba(0,6,102,0.1)]">
                        {item.moduleTitle}
                      </h3>

                      <div className="flex items-center gap-5 py-3 border-y border-black/[0.05] w-fit pr-12">
                         <Hash size={18} className="text-slate-300" />
                         <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.7em]">Index {index + 100}</p>
                      </div>
                    </div>

                    <div className="relative z-10 ml-12 mb-8 flex items-end justify-between">
                       <div className="space-y-8">
                          <div className="w-20 h-[1.5px] bg-gradient-to-r from-indigo-500/40 to-transparent" />
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 rounded-2xl bg-[#000666] flex items-center justify-center text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                <GraduationCap size={28} />
                             </div>
                             <div className="flex flex-col gap-1">
                                <p className="text-[12px] font-black text-[#000666] uppercase tracking-[0.5em]">Vidyal.ai</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Institutional Repository</p>
                             </div>
                          </div>
                       </div>

                       {/* Prismatic Institutional Seal */}
                       <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-100 via-indigo-50 to-slate-200 border border-white shadow-[inner_0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center relative overflow-hidden mr-6 scale-110">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.15]" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/90 to-transparent animate-pulse" />
                          <Sparkles size={32} className="text-slate-300/80 relative z-10" />
                       </div>
                    </div>
                  </div>
                )}
                
                {/* Cinema-Grade Material Lighting */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-white/[0.2] pointer-events-none z-10" />
                <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.15)] pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-white/15 to-transparent pointer-events-none z-10" />
              </div>

              {/* ── Binding Ribbons / Headbands (Archive Detail) ── */}
              <div className="absolute top-0 left-[20px] w-[8px] h-3 bg-indigo-900/40 rounded-b-sm z-20 shadow-sm" />
              <div className="absolute bottom-0 left-[20px] w-[8px] h-3 bg-indigo-900/40 rounded-t-sm z-20 shadow-sm" />


              {/* Interaction Overlay (Thematic Mastery Color) */}
              <div className={`absolute inset-0 z-40 bg-gradient-to-t ${spineColor.replace('bg-', 'from-').replace('600', '900/95')} via-transparent to-transparent flex flex-col items-center justify-end pb-16 gap-12 px-14 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
                 <div className="flex items-center gap-16 text-[13px] font-black text-white uppercase tracking-[0.6em]">
                    <div className="flex flex-col items-center gap-4">
                       <Clock size={24} className="text-white/40" />
                       <span className="opacity-90">{item.minutes}M</span>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                       <Database size={24} className="text-white/40" />
                       <span className="opacity-90">{item.resourceCount}</span>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                       <ShieldCheck size={24} className={item.completed ? 'text-emerald-400' : 'text-white/40'} />
                       <span className="opacity-90">{item.completed ? 'PROOF' : 'UNIT'}</span>
                    </div>
                 </div>
                 <motion.button 
                   whileHover={{ scale: 1.05, backgroundColor: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                   whileTap={{ scale: 0.95 }}
                   className="w-full h-18 bg-white/95 rounded-full text-[#000666] text-[14px] font-black uppercase tracking-[0.6em] shadow-4xl flex items-center justify-center transition-all duration-300"
                 >
                    Synthesize Folio
                 </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Surface Shadow */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[50px] h-3 bg-black/15 blur-xl transition-all duration-700 ${isHovered ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`} />
    </div>
  );
};

// ── Virtual Shelf: The Supreme Archive Rack ────────────────────────────────
const VirtualShelf: React.FC<{ title: string; phases: Record<string, LibraryItem[]>; navigate: any }> = ({ title, phases, navigate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const allItems = useMemo(() => Object.values(phases).flat(), [phases]);
  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 100, damping: 20 });

  return (
    <div 
      className="relative group/shelf mb-24"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
      }}
    >
      <div className="space-y-8 relative z-10">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-8 group text-left border-b border-black/5 w-full pb-6"
        >
          <div className={`w-10 h-10 rounded-full border border-black/5 flex items-center justify-center transition-all duration-500 ${isExpanded ? 'rotate-90 bg-black text-white' : 'text-slate-300 bg-white shadow-sm'}`}>
            <ChevronRight size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-indigo-500/60">Archive Section</p>
            <h3 className="text-[24px] font-black text-black uppercase tracking-tighter group-hover:text-indigo-900 transition-colors">{title}</h3>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative pt-6 pb-20 overflow-visible"
            >
              {/* Dynamic Shelf Spotlight */}
              <motion.div 
                style={{ left: smoothMouseX }}
                className="absolute top-0 bottom-0 w-[400px] -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent z-0 pointer-events-none"
              />

              {/* Minimalist 3D Shelf Surface */}
              <div className="absolute bottom-16 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0" />
              <div className="absolute bottom-14 left-0 right-0 h-[1px] bg-black/5 z-0" />
              
              <div className="flex-1 overflow-x-auto no-scrollbar relative">
                <div className="flex gap-1.5 items-end min-w-max px-4">
                  {allItems.map((item, idx) => (
                    <FolioCard 
                      key={item.id}
                      item={item} 
                      index={idx}
                      onOpen={() => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_PATHS: any[] = [
  {
    id: 'sample-1',
    title: 'Full Stack Systems Architect',
    goal: 'Role-Based Roadmaps',
    status: 'active',
    phases: [
      {
        id: 'p1', title: 'Frontend Mastery', modules: [
          { id: 'm1', title: 'High-Performance React 19', estimatedMinutes: 120, isCompleted: true, resources: [{}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm2', title: 'Advanced State Management', estimatedMinutes: 90, isCompleted: false, resources: [{}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3', title: 'CSS Precision Engineering', estimatedMinutes: 150, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3b', title: 'Next.js 15 Server Components', estimatedMinutes: 180, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3c', title: 'Web Vitals Optimization', estimatedMinutes: 120, isCompleted: false, resources: [{}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3d', title: 'Zustand & State Orchestration', estimatedMinutes: 90, isCompleted: false, resources: [{}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3e', title: 'Micro-Frontend Architecture', estimatedMinutes: 180, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3f', title: 'Web Workers & Off-Main-Thread', estimatedMinutes: 120, isCompleted: false, resources: [{}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3g', title: 'WASM & High-Perf Graphics', estimatedMinutes: 240, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Frontend Mastery' },
          { id: 'm3h', title: 'Three.js & WebGL Systems', estimatedMinutes: 300, isCompleted: false, resources: [{}, {}, {}, {}], phaseTitle: 'Frontend Mastery' }
        ]
      },
      {
        id: 'p2', title: 'Backend Systems', modules: [
          { id: 'm4', title: 'Node.js Runtime Internals', estimatedMinutes: 180, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Backend Systems' },
          { id: 'm5', title: 'PostgreSQL & SQL Performance', estimatedMinutes: 240, isCompleted: false, resources: [{}, {}, {}, {}], phaseTitle: 'Backend Systems' },
          { id: 'm6', title: 'Distributed Redis Caching', estimatedMinutes: 150, isCompleted: false, resources: [{}, {}], phaseTitle: 'Backend Systems' },
          { id: 'm6b', title: 'Kafka & Event Streaming', estimatedMinutes: 300, isCompleted: false, resources: [{}, {}, {}, {}], phaseTitle: 'Backend Systems' },
          { id: 'm6c', title: 'gRPC & Protocol Buffers', estimatedMinutes: 180, isCompleted: false, resources: [{}, {}, {}], phaseTitle: 'Backend Systems' }
        ]
      }
    ]
  }
];

const Library: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();
  const [query, setQuery] = useState('');

  const activePaths = useMemo(() => {
    const userPaths = paths.filter(p => p.status !== 'archived');
    return userPaths.length > 0 ? userPaths : SAMPLE_PATHS;
  }, [paths]);

  const libraryItems: LibraryItem[] = useMemo(() => activePaths.flatMap(path => {
    let category = 'Academic Realm';
    const lowerGoal = (path.goal || '').toLowerCase();
    const lowerTitle = (path.title || '').toLowerCase();
    
    if (lowerGoal.includes('role') || lowerTitle.includes('engineer') || lowerTitle.includes('developer') || lowerTitle.includes('manager')) {
      category = 'Role-Based Roadmaps';
    } else if (lowerGoal.includes('skill') || lowerTitle.includes('mastery') || lowerTitle.includes('learning')) {
      category = 'Skill-Based Roadmaps';
    } else if (lowerGoal.includes('project') || lowerTitle.includes('build')) {
      category = 'Project-Based Roadmaps';
    } else {
      category = path.goal || 'Academic Realm';
    }

    return path.phases.flatMap(phase =>
      phase.modules.map(mod => ({
        id: `${path.id}-${phase.id}-${mod.id}`,
        pathId: path.id,
        phaseId: phase.id,
        moduleId: mod.id,
        courseTitle: path.title,
        phaseTitle: phase.title || 'General',
        moduleTitle: mod.title,
        minutes: mod.estimatedMinutes || 0,
        completed: mod.isCompleted,
        resourceCount: mod.resources?.length || 0,
        pathGoal: category,
        searchTags: [path.title, phase.title, mod.title, mod.description, ...(mod.keyConcepts || [])].join(' ').toLowerCase()
      }))
    );
  }), [activePaths]);

  const flattenedShelves = useMemo(() => {
    const shelves: Record<string, Record<string, LibraryItem[]>> = {};
    libraryItems.forEach(item => {
      const q = query.trim().toLowerCase();
      if (!q || item.searchTags.includes(q)) {
        if (!shelves[item.courseTitle]) shelves[item.courseTitle] = {};
        if (!shelves[item.courseTitle][item.phaseTitle]) shelves[item.courseTitle][item.phaseTitle] = [];
        shelves[item.courseTitle][item.phaseTitle].push(item);
      }
    });
    return Object.entries(shelves).map(([title, phases]) => ({ title, phases }));
  }, [libraryItems, query]);

  return (
    <div className="relative h-full flex-1 overflow-y-auto no-scrollbar bg-[#fafafa] text-slate-900">
      
      {/* ── Supreme Cinematic Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Dynamic Hall (Zen Mode Only) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isZenMode ? 1 : 0 }}
          className="absolute inset-0 z-0"
        >
          <img src={ZEN_BG} className="w-full h-full object-cover blur-[5px] opacity-40" alt="library hall" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa]/80 via-transparent to-black/60" />
        </motion.div>

        {/* Neural Gradients (Standard Mode) */}
        {!isZenMode && (
          <>
            <motion.div 
              animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[140px]" 
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, -20, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" 
            />
          </>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.04] pointer-events-none" />
      </div>

      <div className={`relative z-10 mx-auto px-8 sm:px-24 py-12 transition-all duration-1000 ${
        isZenMode ? 'max-w-[1400px]' : 'max-w-[1800px]'
      }`}>
        <div className="space-y-20">
          
          {/* ── Surgical Top-Bar HUD ── */}
          <header className={`flex items-center justify-between transition-all duration-700 ${isZenMode ? 'flex-col gap-8 text-center pt-10' : ''}`}>
            <div className="space-y-2">
              <div className={`flex items-center gap-4 ${isZenMode ? 'justify-center' : ''}`}>
                 <div className="w-10 h-[1px] bg-indigo-500/30" />
                 <p className="text-[10px] font-black uppercase tracking-[0.6em] text-indigo-600/60">Vidyal Intelligence Archive</p>
              </div>
              <h1 className={`${isZenMode ? 'text-6xl text-white' : 'text-5xl sm:text-7xl text-black'} font-black tracking-tighter leading-none uppercase italic transition-colors duration-700`}>
                Roadmap
                <span className={`inline-block ml-4 ${isZenMode ? 'text-indigo-400' : 'text-indigo-600/90'} not-italic`}>Library</span>
              </h1>
            </div>

            <div className={`flex items-center gap-6 ${isZenMode ? '' : 'fixed top-12 right-24 z-[100]'}`}>
               <button 
                 onClick={() => setIsZenMode(!isZenMode)}
                 className={`flex items-center gap-3 h-11 px-8 rounded-full transition-all border ${
                   isZenMode 
                     ? 'bg-white border-white text-black shadow-3xl scale-110' 
                     : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                 }`}
               >
                 <Sparkles size={16} className={isZenMode ? 'animate-pulse text-indigo-500' : ''} />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
               </button>
            </div>
          </header>

          <div className={`space-y-32 pb-96 transition-all duration-1000 ${isZenMode ? 'max-w-[1400px] mx-auto' : ''}`}>
            {flattenedShelves.map((shelf) => (
              <VirtualShelf key={shelf.title} title={shelf.title} phases={shelf.phases} navigate={navigate} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Library;
