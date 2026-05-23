import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  BookOpen, Search, Sparkles, HardDrive, ChevronRight, ChevronLeft,
  Clock, CheckCircle2, Circle, X, Zap, ArrowRight,
  Filter, Layers, Layout, Brain, Sparkle
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ── Types ─────────────────────────────────────────────────────────────────────
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
  titleLower: string;
  phaseLower: string;
  courseLower: string;
};

type Shelf = { title: string; phases: Record<string, LibraryItem[]> };
type FilterChip = 'all' | 'inprogress' | 'done';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const PALETTE = [
  'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-amber-600',  'bg-sky-600',    'bg-teal-600',    'bg-fuchsia-600',
  'bg-orange-600',
];

// ── Search Engine ─────────────────────────────────────────────────────────────
function scoreItem(item: LibraryItem, terms: string[]): number {
  if (terms.length === 0) return 1;
  let score = 0;
  for (const term of terms) {
    if (item.titleLower.startsWith(term)) score += 20;
    else if (item.titleLower.includes(term)) score += 10;
    if (item.phaseLower.includes(term)) score += 5;
    if (item.courseLower.includes(term)) score += 3;
    if (item.titleLower.includes(' ' + term)) score += 15;
  }
  const allMatch = terms.every(t =>
    item.titleLower.includes(t) || item.phaseLower.includes(t) || item.courseLower.includes(t)
  );
  return allMatch ? score : 0;
}

const BookSpine: React.FC<{
  item: LibraryItem;
  index: number;
  score?: number;
  isHighlighted?: boolean;
  onHover?: (item: LibraryItem, element: HTMLButtonElement) => void;
  onLeave?: () => void;
  onOpen: () => void;
}> = ({ item, index, score = 0, isHighlighted = false, onHover, onLeave, onOpen }) => {
  const color = PALETTE[index % PALETTE.length];
  const w = 45 + (index % 4) * 8;
  const h = 210 + (index % 5) * 15;
  const lean = index % 9 === 0 ? (index % 18 === 0 ? 5 : -5) : 0;

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        layout="position"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ y: -24, scale: 1.03, transition: { duration: 0.2, ease: 'easeOut' } }}
        onMouseEnter={e => onHover?.(item, e.currentTarget)}
        onMouseLeave={onLeave}
        onClick={onOpen}
        className={`relative ${color} rounded-sm cursor-pointer will-change-transform group overflow-visible mb-2`}
        style={{
          width: w, height: h,
          rotate: `${lean}deg`,
          boxShadow: isHighlighted
            ? '0 20px 40px rgba(99, 102, 241, 0.4), inset -4px 0 10px rgba(0,0,0,0.3)'
            : '0 10px 30px rgba(0,0,0,0.15), inset -4px 0 10px rgba(0,0,0,0.3)',
        }}
      >
        <div className="absolute right-[-10px] top-[4px] bottom-[4px] w-[10px] bg-slate-100 border-y border-r border-slate-300 flex flex-col justify-between py-1 z-0 shadow-inner">
           {[...Array(10)].map((_, i) => <div key={i} className="w-full h-[1px] bg-black/[0.03]" />)}
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-[0.05] mix-blend-overlay z-10" />
        <div className="absolute inset-y-0 left-0 w-[1px] bg-white/20 z-10" />
        <div className="absolute inset-y-0 right-0 w-[1px] bg-black/20 z-10" />
        <div className="absolute top-0 inset-x-0 h-8 flex flex-col items-center justify-center gap-[2px] border-b border-white/5 bg-black/10 z-10">
          <div className="w-6 h-[1px] bg-white/20" />
          <div className="w-3 h-[1px] bg-white/10" />
          {item.completed && <CheckCircle2 size={10} className="text-emerald-400 mt-1" />}
        </div>
        <div className="absolute inset-0 top-8 bottom-12 flex items-center justify-center overflow-hidden px-1.5 z-10">
          <span className="text-[9px] font-black text-white/95 uppercase tracking-[0.3em] select-none italic drop-shadow-lg whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            {item.moduleTitle}
          </span>
        </div>
        <div className="absolute bottom-2 inset-x-0 flex flex-col items-center gap-1.5 z-10">
          <div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]' : 'bg-white/20'}`} />
          <div className="px-2 py-0.5 bg-black/20 rounded-sm border border-white/5">
            <span className="text-[7px] font-black text-white/60 tracking-tighter uppercase">{item.moduleId.slice(0, 3)}</span>
          </div>
        </div>
      </motion.button>
    </div>
  );
};

// ── Shelf Section ─────────────────────────────────────────────────────────────
const ShelfSection: React.FC<{
  shelf: Shelf;
  navigate: ReturnType<typeof useNavigate>;
  highlightIds?: Set<string>;
  scores?: Map<string, number>;
}> = ({ shelf, navigate, highlightIds, scores }) => {
  const allItems = useMemo(() => Object.values(shelf.phases).flat(), [shelf.phases]);
  const completed = allItems.filter(i => i.completed).length;
  const progress = (completed / (allItems.length || 1)) * 100;
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredData, setHoveredData] = useState<{ item: LibraryItem; x: number; y: number } | null>(null);

  const handleBookHover = (item: LibraryItem, element: HTMLButtonElement) => {
    const hallContainer = element.closest('.group\\/hall');
    if (!hallContainer) return;
    const containerRect = hallContainer.getBoundingClientRect();
    const bookRect = element.getBoundingClientRect();
    
    // Compute exact position centered horizontally, and at the top edge vertically
    const x = bookRect.left - containerRect.left + bookRect.width / 2;
    const y = bookRect.top - containerRect.top;
    
    setHoveredData({ item, x, y });
  };

  const handleBookLeave = () => {
    setHoveredData(null);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    setHoveredData(null);
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -480 : 480;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/shelf mb-32">
      <div className="flex flex-col mb-10 px-2 space-y-4">
        <div className="flex items-center gap-4">
           <div className="h-[1px] w-12 bg-indigo-500/30" />
           <h3 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter italic leading-none group-hover/shelf:text-indigo-600 transition-colors">{shelf.title}</h3>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Capacity</span><span className="text-[12px] font-bold text-slate-900">{allItems.length} Units</span></div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Mastery</span><span className="text-[12px] font-bold text-indigo-600">{Math.round(progress)}%</span></div>
           </div>
           <motion.button whileHover={{ x: 5, scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => allItems[0] && navigate(`/path/${allItems[0].pathId}`)} className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all">
             Access Archive <ArrowRight size={14} />
           </motion.button>
        </div>
      </div>

      <div className="relative pt-12 pb-24 overflow-visible group/hall perspective-[1500px]">
          {/* Scroll Left Button */}
          <button 
            onClick={() => handleScroll('left')}
            className="absolute left-[-16px] top-[calc(50%-12px)] z-30 w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-2xl flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 scale-90 group-hover/shelf:scale-100 active:scale-95"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Scroll Right Button */}
          <button 
            onClick={() => handleScroll('right')}
            className="absolute right-[-16px] top-[calc(50%-12px)] z-30 w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-2xl flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 scale-90 group-hover/shelf:scale-100 active:scale-95"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          {/* Bounds-Protected Floating Preview Card */}
          <AnimatePresence>
            {hoveredData && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute z-50 pointer-events-none"
                style={{
                  left: hoveredData.x,
                  top: hoveredData.y - 12,
                  transform: 'translateX(-50%) translateY(-100%)',
                }}
              >
                <div 
                  className="w-64 p-4 rounded-2xl text-left relative"
                  style={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 20px 40px rgba(15,23,42,0.14), 0 8px 16px rgba(15,23,42,0.05)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Header / Meta */}
                  <div className="text-[9px] font-black text-[#4e5bff] uppercase tracking-[0.2em] mb-1 line-clamp-1">
                    {hoveredData.item.phaseTitle}
                  </div>
                  {/* Title */}
                  <div className="text-[13px] font-extrabold text-[#0f172a] leading-snug mb-3">
                    {hoveredData.item.moduleTitle}
                  </div>
                  {/* Horizontal Rule */}
                  <div className="h-px bg-slate-100 w-full mb-3" />
                  {/* Meta Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <Clock size={12} className="text-slate-400" />
                      {hoveredData.item.minutes} mins
                    </div>
                    <div className="flex items-center gap-1">
                      {hoveredData.item.completed ? (
                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          <CheckCircle2 size={10} className="text-emerald-500" /> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Mini Pointer Arrow */}
                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-black/[0.08] rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-10 left-0 right-0 h-12 z-0">
            <div className="absolute inset-0 bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_-2px_10px_rgba(0,0,0,0.02)] origin-bottom scale-x-[1.04] rounded-sm" style={{ transform: 'rotateX(72deg)' }} />
            <div className="absolute bottom-[-6px] left-[-1%] right-[-1%] h-6 bg-slate-50 border-x border-b border-slate-200 rounded-b-lg shadow-2xl z-10 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" /></div>
            <div className="absolute bottom-[-40px] left-0 right-0 h-20 bg-indigo-900/5 blur-3xl pointer-events-none" />
          </div>
          <div className="absolute bottom-10 left-[-8px] w-4 h-32 bg-slate-900 rounded-r shadow-2xl z-20 border-r border-white/5" />
          <div className="absolute bottom-10 right-[-8px] w-4 h-32 bg-slate-900 rounded-l shadow-2xl z-20 border-l border-white/5" />
          
          <div 
            ref={scrollContainerRef}
            onScroll={() => setHoveredData(null)}
            className="relative flex justify-start overflow-x-auto pt-16 px-12 scroll-smooth no-scrollbar pb-10 overflow-y-visible"
          >
            <div className="flex gap-[3px] items-end">
              <AnimatePresence mode="popLayout">
                {allItems.map((item, idx) => (
                  <BookSpine 
                    key={item.id} 
                    item={item} 
                    index={idx} 
                    score={scores?.get(item.id) ?? 0} 
                    isHighlighted={highlightIds?.has(item.id) ?? false} 
                    onHover={handleBookHover}
                    onLeave={handleBookLeave}
                    onOpen={() => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
      </div>
    </div>
  );
};

// ── Sample Paths ───────────────────────────────────────────────────────────────
const SAMPLE_PATHS: any[] = [
  { id: 'sample-1', title: 'Full Stack Systems Architect', goal: 'Role-Based', status: 'active', phases: [{ id: 'p1', title: 'Frontend Mastery', modules: [{ id: 'm1', title: 'High-Performance React 19', estimatedMinutes: 120, isCompleted: true, resources: [{},{}] }, { id: 'm2', title: 'Advanced State Management', estimatedMinutes: 90, isCompleted: true, resources: [{},{}] }, { id: 'm3', title: 'CSS Precision Engineering', estimatedMinutes: 150, isCompleted: false, resources: [{},{},{}] }, { id: 'm4', title: 'Next.js 15 Server Components', estimatedMinutes: 180, isCompleted: false, resources: [{},{},{}] }, { id: 'm5', title: 'Web Vitals Optimization', estimatedMinutes: 120, isCompleted: false, resources: [{},{}] }, { id: 'm6', title: 'Zustand & State Orchestration', estimatedMinutes: 90, isCompleted: false, resources: [{},{}] }, { id: 'm7', title: 'Micro-Frontend Architecture', estimatedMinutes: 180, isCompleted: false, resources: [{},{},{}] }, { id: 'm8', title: 'WebGL & Three.js Systems', estimatedMinutes: 300, isCompleted: false, resources: [{},{},{},{}] }] }] },
  { id: 'sample-2', title: 'AI & Machine Learning', goal: 'Skill-Based', status: 'active', phases: [{ id: 'p3', title: 'Foundations', modules: [{ id: 'm13', title: 'Linear Algebra for ML', estimatedMinutes: 200, isCompleted: true, resources: [{},{}] }, { id: 'm14', title: 'Statistics & Probability', estimatedMinutes: 180, isCompleted: true, resources: [{},{}] }, { id: 'm15', title: 'Python Data Science', estimatedMinutes: 150, isCompleted: false, resources: [{},{},{}] }, { id: 'm16', title: 'Neural Network Fundamentals', estimatedMinutes: 240, isCompleted: false, resources: [{},{},{}] }, { id: 'm17', title: 'PyTorch Deep Dive', estimatedMinutes: 300, isCompleted: false, resources: [{},{},{},{}] }, { id: 'm18', title: 'Transformer Architecture', estimatedMinutes: 360, isCompleted: false, resources: [{},{},{},{}] }] }] },
];

// ── Library Main Component ───────────────────────────────────────────────────
const Library: React.FC = () => {
  const navigate = useNavigate();
  const { paths = [] } = useAppStore();
  const focusContext = useFocus();
  const isZenMode = focusContext?.isZenMode ?? false;
  const setIsZenMode = focusContext?.setIsZenMode ?? (() => {});

  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterChip>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), 120);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const headerY = useTransform(scrollYProgress, [0, 0.1], [0, -50]);

  const particles = useMemo(() => [...Array(20)].map((_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, targetY: Math.random() * -200, targetX: (Math.random() - 0.5) * 100, duration: 15 + Math.random() * 20, delay: Math.random() * 10 })), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setRawQuery(''); searchRef.current?.blur(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const activePaths = useMemo(() => {
    const live = (paths || []).filter(p => p && p.status !== 'archived');
    return live.length > 0 ? live : SAMPLE_PATHS;
  }, [paths]);

  const allItems: LibraryItem[] = useMemo(() => {
    try {
      return activePaths.flatMap(path => 
        (path.phases || []).flatMap((phase: any) => 
          (phase.modules || []).map((mod: any) => ({
            id: `${path.id}-${phase.id}-${mod.id}`,
            pathId: path.id, phaseId: phase.id, moduleId: mod.id,
            courseTitle: path.title || 'Untitled Archive',
            phaseTitle: phase.title || 'General',
            moduleTitle: mod.title || 'Untitled Unit',
            minutes: mod.estimatedMinutes || 0,
            completed: mod.isCompleted ?? false,
            resourceCount: mod.resources?.length || 0,
            titleLower: (mod.title || '').toLowerCase(),
            phaseLower: (phase.title || '').toLowerCase(),
            courseLower: (path.title || '').toLowerCase(),
          }))
        )
      );
    } catch (e) { return []; }
  }, [activePaths]);

  const chipFiltered = useMemo(() => {
    switch (filter) {
      case 'inprogress': return allItems.filter(i => !i.completed);
      case 'done': return allItems.filter(i => i.completed);
      default: return allItems;
    }
  }, [allItems, filter]);

  const terms = useMemo(() => (debouncedQuery || '').trim().toLowerCase().split(/\s+/).filter(Boolean), [debouncedQuery]);
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (terms.length === 0) return map;
    chipFiltered.forEach(item => { const s = scoreItem(item, terms); if (s > 0) map.set(item.id, s); });
    return map;
  }, [chipFiltered, terms]);

  const matchedItems = useMemo(() => terms.length > 0 ? chipFiltered.filter(i => scoreMap.has(i.id)) : chipFiltered, [chipFiltered, terms, scoreMap]);
  const highlightIds = useMemo(() => new Set(scoreMap.keys()), [scoreMap]);

  const bestMatches = useMemo(() => {
    if (terms.length === 0) return [];
    return [...matchedItems].sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)).slice(0, 8);
  }, [matchedItems, terms, scoreMap]);

  const shelves: Shelf[] = useMemo(() => {
    const map: Record<string, Record<string, LibraryItem[]>> = {};
    matchedItems.forEach(item => {
      if (!map[item.courseTitle]) map[item.courseTitle] = {};
      if (!map[item.courseTitle][item.phaseTitle]) map[item.courseTitle][item.phaseTitle] = [];
      map[item.courseTitle][item.phaseTitle].push(item);
    });
    let result = Object.entries(map).map(([title, phases]) => ({ title, phases })).reverse();
    if (terms.length === 0 && filter === 'all') result = result.slice(0, 4);
    return result;
  }, [matchedItems, terms, filter]);

  const totalMinutes = useMemo(() => allItems.reduce((a, i) => a + i.minutes, 0), [allItems]);
  const completedCount = useMemo(() => allItems.filter(i => i.completed).length, [allItems]);
  const clearSearch = useCallback(() => { setRawQuery(''); setFilter('all'); }, []);

  const handleManifest = () => {
    navigate(`/create?goal=${encodeURIComponent(rawQuery)}`);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 selection:bg-[#4e5bff]/10 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20">{particles.map((p) => <motion.div key={p.id} initial={{ opacity: 0, top: `${p.y}%`, left: `${p.x}%` }} animate={{ opacity: [0, 0.5, 0], y: [0, p.targetY], x: [0, p.targetX] }} transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }} className="absolute w-1 h-1 bg-white rounded-full blur-[1px]" />)}</div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-8 py-20 lg:py-32">
        <motion.div style={{ opacity: headerOpacity, y: headerY }} className="space-y-6 mb-24">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#4e5bff]">
                <div className="h-[1px] w-8 bg-[#4e5bff]/50" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600">Academic Archive</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-none">
                Personal Mastery
              </h1>
              <div className="flex items-center gap-6 pt-2 text-[12px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><HardDrive size={13} className="text-slate-400" /> {allItems.length} Units</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> {completedCount} Mastered</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> {Math.round(totalMinutes / 60)} Hours</span>
              </div>
            </div>
            <div className="w-full max-w-xl space-y-4">
               {/* Search Box */}
               <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#4e5bff] transition-colors" />
                  <input ref={searchRef} type="text" value={rawQuery} onChange={e => setRawQuery(e.target.value)} placeholder="search here any book you want from your learning" className="w-full bg-white border border-slate-200/80 rounded-[30px] py-6 pl-16 pr-16 text-[16px] font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#4e5bff] focus:bg-white focus:shadow-[0_12px_32px_rgba(78,91,255,0.08)] transition-all duration-300 shadow-xl shadow-slate-100/50" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {rawQuery && <button onClick={clearSearch} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={18} /></button>}
                  </div>
               </div>
               {/* Simplified Premium Segmented Control */}
               <div className="flex justify-center pt-2">
                  <div 
                    className="flex p-1 rounded-full w-full"
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    {[
                      { id: 'all', label: 'All', icon: Layout },
                      { id: 'inprogress', label: 'Active', icon: Layers },
                      { id: 'done', label: 'Mastered', icon: CheckCircle2 },
                    ].map(chip => {
                      const isActive = filter === chip.id;
                      return (
                        <button 
                          key={chip.id} 
                          onClick={() => setFilter(chip.id as FilterChip)} 
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-200"
                          style={{
                            background: isActive ? '#0f172a' : 'transparent',
                            color: isActive ? '#ffffff' : '#475569',
                            boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.15)' : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.color = '#0f172a';
                          }}
                          onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.color = '#475569';
                          }}
                        >
                          <chip.icon size={13} style={{ color: isActive ? '#ffffff' : '#64748b' }} />
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
               </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-40 pb-60">
          <AnimatePresence>
            {bestMatches.length > 0 && (
              <motion.div key="best-match" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} className="relative">
                <div className="flex items-center gap-4 mb-10"><div className="flex items-center gap-3 px-4 py-2 bg-indigo-600 rounded-full shadow-xl shadow-indigo-100"><Zap size={16} className="text-white" /><span className="text-[12px] font-black text-white uppercase tracking-[0.3em]">High Precision Matches</span></div><div className="h-[1px] flex-1 bg-slate-200" /></div>
                <div className="relative pt-12 pb-24 overflow-visible perspective-[1500px]">
                   <div className="absolute bottom-10 left-0 right-0 h-14 bg-indigo-50 border border-indigo-100 shadow-[0_30px_60px_rgba(99,102,241,0.1),inset_0_-2px_10px_rgba(255,255,255,0.8)] origin-bottom scale-x-[1.05] rounded-sm" style={{ transform: 'rotateX(75deg)' }} />
                   <div className="relative flex justify-start overflow-x-auto pt-16 px-12 scroll-smooth no-scrollbar pb-10 overflow-y-visible"><div className="flex gap-[6px] items-end">{bestMatches.map((item, idx) => <BookSpine key={item.id} item={item} index={idx} score={scoreMap.get(item.id) ?? 0} isHighlighted onOpen={() => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`)} />)}</div></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-20 gap-y-32">
            <AnimatePresence mode="popLayout">
              {shelves.length > 0 ? shelves.map(shelf => (
                <motion.div key={shelf.title} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <ShelfSection shelf={shelf} navigate={navigate} highlightIds={highlightIds} scores={scoreMap} />
                </motion.div>
              )) : (
                  <motion.div key="empty" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="col-span-full flex flex-col items-center justify-center py-20 px-6">
                    <div className="max-w-xl w-full bg-white/75 backdrop-blur-xl rounded-[40px] p-12 border border-slate-200/50 shadow-[0_40px_80px_-20px_rgba(78,91,255,0.06)] text-center space-y-10 relative overflow-hidden group">
                       {/* Subtle Background Accent */}
                       <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#4e5bff]/5 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                       
                       <div className="relative space-y-6">
                          <div className="flex justify-center">
                             <div className="w-20 h-20 rounded-3xl bg-[#4e5bff] flex items-center justify-center shadow-2xl shadow-[#4e5bff]/25 rotate-3 group-hover:rotate-6 transition-transform">
                                <Brain size={36} className="text-white" />
                             </div>
                          </div>
                          
                          <div className="space-y-2">
                             <h2 className="text-[28px] font-black text-slate-900 tracking-tighter uppercase italic leading-tight">
                                Registry Entry <br /> Not Found
                             </h2>
                             <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">
                                "{rawQuery || 'Your Query'}" does not exist in your archive yet.
                             </p>
                          </div>
                       </div>

                       <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

                       <div className="space-y-6">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] leading-relaxed">
                             Shall we architect this new <br /> domain of knowledge?
                          </p>
                          
                          <motion.button 
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleManifest}
                            className="w-full h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-between px-8 shadow-2xl shadow-slate-200 group/btn overflow-hidden relative"
                          >
                             <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                             <span className="relative z-10 text-[12px] font-black uppercase tracking-[0.4em]">Manifest Archive</span>
                             <div className="relative z-10 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover/btn:bg-white/20 transition-colors">
                                <ArrowRight size={20} />
                             </div>
                          </motion.button>

                          <button 
                            onClick={clearSearch}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                          >
                             Reset Archive Scan
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          {!debouncedQuery && filter === 'all' && (
            <div className="flex flex-col items-center gap-6 pt-20 border-t border-slate-100">
              <div className="h-px w-20 bg-indigo-500/30" /><p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.6em] text-center max-w-lg leading-relaxed">Viewing the most recent archival acquisitions. <br />Perform a global scan to reveal historical data.</p>
            </div>
          )}
        </div>
      </div>
      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </div>
  );
};

export default Library;
