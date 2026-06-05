import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  BookOpen, Search, Sparkles, HardDrive, ChevronRight, ChevronLeft,
  Clock, CheckCircle2, X, Zap, ArrowRight,
  Layers, Layout, Brain
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

// ── Design Tokens — Editorial & Premium Library Palette ─────────────────────
const PALETTE = [
  'bg-[#0f0b6b]', // deep navy
  'bg-[#1a1c24]', // slate charcoal
  'bg-[#2c3d30]', // vintage moss green
  'bg-[#4c2a22]', // dark mahogany
  'bg-[#521c2c]', // premium burgundy
  'bg-[#16333c]', // deep pine teal
  'bg-[#4e5bff]', // cortex brand blue
  'bg-[#2e233c]', // dark royal purple
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
  const w = 48 + (index % 4) * 8;
  const h = 220 + (index % 5) * 15;
  const lean = index % 9 === 0 ? (index % 18 === 0 ? 4 : -4) : 0;

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        layout="position"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -20, scale: 1.02, transition: { duration: 0.15, ease: 'easeOut' } }}
        onMouseEnter={e => onHover?.(item, e.currentTarget)}
        onMouseLeave={onLeave}
        onClick={onOpen}
        className={`relative ${color} rounded-sm cursor-pointer will-change-transform group overflow-visible mb-2`}
        style={{
          width: w, height: h,
          rotate: `${lean}deg`,
          boxShadow: isHighlighted
            ? '0 16px 36px rgba(78, 91, 255, 0.28), inset -4px 0 10px rgba(0,0,0,0.3)'
            : '0 8px 24px rgba(13,23,48,0.12), inset -4px 0 10px rgba(0,0,0,0.25)',
        }}
      >
        {/* Spine lines */}
        <div className="absolute right-[-10px] top-[4px] bottom-[4px] w-[10px] bg-slate-100 border-y border-r border-slate-200 flex flex-col justify-between py-1 z-0 shadow-inner">
           {[...Array(8)].map((_, i) => <div key={i} className="w-full h-[1px] bg-black/[0.02]" />)}
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-[0.04] mix-blend-overlay z-10" />
        <div className="absolute inset-y-0 left-0 w-[1px] bg-white/10 z-10" />
        <div className="absolute inset-y-0 right-0 w-[1px] bg-black/15 z-10" />
        
        {/* Top gold/silver leaf details */}
        <div className="absolute top-0 inset-x-0 h-8 flex flex-col items-center justify-center gap-[2px] border-b border-white/5 bg-black/5 z-10">
          <div className="w-6 h-[1px] bg-white/15" />
          <div className="w-3 h-[1px] bg-white/10" />
          {item.completed && <CheckCircle2 size={11} className="text-emerald-400 mt-1" />}
        </div>

        {/* Title — Elegant Newsreader Serif */}
        <div className="absolute inset-0 top-8 bottom-12 flex items-center justify-center overflow-hidden px-1.5 z-10">
          <span 
            className="text-[12px] font-medium text-white/90 uppercase tracking-wide select-none italic drop-shadow-md whitespace-nowrap" 
            style={{ 
              writingMode: 'vertical-rl', 
              transform: 'rotate(180deg)',
              fontFamily: "'Newsreader', serif"
            }}
          >
            {item.moduleTitle}
          </span>
        </div>

        {/* Bottom spine detail */}
        <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1.5 z-10">
          <div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-white/20'}`} />
          <div className="px-2 py-0.5 bg-black/25 rounded border border-white/5">
            <span className="text-[10px] font-semibold text-white/60 tracking-wider uppercase">{item.moduleId.slice(0, 3)}</span>
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
    <div className="relative group/shelf mb-28">
      {/* Shelf Header */}
      <div className="flex flex-col mb-8 px-2 space-y-3">
        <div className="flex items-center gap-3">
           <div className="h-[1px] w-8 bg-slate-200" />
           <h2 className="app-h2" style={{ color: '#0d0d0d' }}>{shelf.title}</h2>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="app-label text-[10px]">Capacity</span>
                <span className="text-[13px] font-semibold text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>{allItems.length} Modules</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col">
                <span className="app-label text-[10px]">Mastery</span>
                <span className="text-[13px] font-semibold text-[#4e5bff]" style={{ fontFamily: "'Inter', sans-serif" }}>{Math.round(progress)}% Complete</span>
              </div>
           </div>
           <button 
             onClick={() => allItems[0] && navigate(`/path/${allItems[0].pathId}`)} 
             className="app-btn-ghost h-9 px-4 text-[12px]"
           >
             <span>Access Archive</span> 
             <ArrowRight size={12} />
           </button>
        </div>
      </div>

      {/* Book Shelf Visual Container */}
      <div className="relative pt-10 pb-20 overflow-visible group/hall perspective-[1500px]">
          {/* Scroll Left Button */}
          <button 
            onClick={() => handleScroll('left')}
            className="absolute left-[-16px] top-[calc(50%-10px)] z-30 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-[#0d0d0d] hover:text-white hover:border-[#0d0d0d] transition-all opacity-0 group-hover/shelf:opacity-100 scale-95 group-hover/shelf:scale-100"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Scroll Right Button */}
          <button 
            onClick={() => handleScroll('right')}
            className="absolute right-[-16px] top-[calc(50%-10px)] z-30 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-[#0d0d0d] hover:text-white hover:border-[#0d0d0d] transition-all opacity-0 group-hover/shelf:opacity-100 scale-95 group-hover/shelf:scale-100"
          >
            <ChevronRight size={16} />
          </button>

          {/* Bounds-Protected Floating Preview Card */}
          <AnimatePresence>
            {hoveredData && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute z-50 pointer-events-none"
                style={{
                  left: hoveredData.x,
                  top: hoveredData.y - 8,
                  transform: 'translateX(-50%) translateY(-100%)',
                }}
              >
                <div 
                  className="w-60 p-4 rounded-xl text-left relative bg-white"
                  style={{
                    border: '1px solid rgba(13, 13, 13, 0.08)',
                    boxShadow: '0 12px 32px rgba(13, 23, 48, 0.08)',
                  }}
                >
                  {/* Header / Meta */}
                  <div className="app-label text-[10px] text-[#4e5bff] mb-1 line-clamp-1">
                    {hoveredData.item.phaseTitle}
                  </div>
                  {/* Title */}
                  <div className="text-[13px] font-semibold text-[#0d0d0d] leading-snug mb-3">
                    {hoveredData.item.moduleTitle}
                  </div>
                  {/* Horizontal Rule */}
                  <div className="h-px bg-slate-100 w-full mb-3" />
                  {/* Meta Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Clock size={11} className="text-slate-400" />
                      {hoveredData.item.minutes} mins
                    </div>
                    <div>
                      {hoveredData.item.completed ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} className="text-emerald-500" /> Mastered
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4e5bff] bg-indigo-50 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Mini Pointer Arrow */}
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-black/[0.08] rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wooden/Glass Shelf Ledger Plank */}
          <div className="absolute bottom-10 left-0 right-0 h-10 z-0">
            <div className="absolute inset-0 bg-white border border-slate-200 shadow-sm origin-bottom scale-x-[1.02] rounded-sm" style={{ transform: 'rotateX(72deg)' }} />
            <div className="absolute bottom-[-4px] left-0 right-0 h-4 bg-slate-50 border-x border-b border-slate-200 rounded-b-md shadow-md z-10" />
          </div>
          
          <div 
            ref={scrollContainerRef}
            onScroll={() => setHoveredData(null)}
            className="relative flex justify-start overflow-x-auto pt-12 px-8 scroll-smooth no-scrollbar pb-10 overflow-y-visible"
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
  const headerY = useTransform(scrollYProgress, [0, 0.1], [0, -40]);

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
    <div className="min-h-screen bg-transparent text-[#0d0d0d] overflow-x-hidden">
      <div className="relative z-10 w-full max-w-[1060px] mx-auto px-6 sm:px-10 pt-10 pb-24">
        
        {/* ── Page Header ── */}
        <motion.div style={{ opacity: headerOpacity, y: headerY }} className="space-y-6 mb-16 text-white animate-none">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-2">
              <p className="app-label text-white/50">Cortex · Personal Mastery</p>
              <h1 className="jawdropping-header-title text-[28px] lg:text-[34px]">Academic Archive</h1>
              
              {/* Meta information */}
              <div 
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[13px] font-medium"
                style={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'Inter', sans-serif" }}
              >
                <span className="flex items-center gap-1.5"><HardDrive size={13} /> {allItems.length} Units</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5" style={{ color: '#34d399' }}><CheckCircle2 size={13} /> {completedCount} Mastered</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5"><Clock size={13} /> {Math.round(totalMinutes / 60)} Hours</span>
              </div>
            </div>
            
            {/* Search Box */}
            <div className="w-full max-w-md space-y-3">
               <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  <input 
                    ref={searchRef} 
                    type="text" 
                    value={rawQuery} 
                    onChange={e => setRawQuery(e.target.value)} 
                    placeholder="Search in your personal learning archives..." 
                    className="w-full h-10 border rounded-full py-2.5 pl-10 pr-10 text-[14px] focus:outline-none transition-all placeholder-light-translucent jawdropping-search-bar"
                    style={{ 
                      color: '#ffffff'
                    }}
                  />
                  {rawQuery && (
                    <button 
                      onClick={clearSearch} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-white transition-colors"
                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
               </div>

               {/* Segmented Filter Control */}
               <div className="flex p-0.5 rounded-full jawdropping-glass-container">
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all"
                      style={{
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#0f0b6b' : 'rgba(255, 255, 255, 0.6)',
                        boxShadow: isActive ? '0 4px 12px rgba(78,91,255,0.18)' : 'none',
                      }}
                    >
                      <chip.icon size={11} />
                      {chip.label}
                    </button>
                  );
                })}
               </div>
            </div>
          </div>
        </motion.div>

        {/* ── Sliding White Content Sheet ── */}
        <div 
          className="bg-white rounded-t-[24px] p-8 sm:p-10 -mx-6 sm:-mx-10 border-t border-slate-100 min-h-[60vh] mt-8 animate-none"
          style={{ boxShadow: '0 -8px 32px rgba(13,23,48,0.03)' }}
        >
          <AnimatePresence>
            {bestMatches.length > 0 && (
              <motion.div 
                key="best-match" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                className="relative mb-16"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0d0d0d] text-white rounded-full">
                    <Zap size={11} className="text-amber-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Search Matches</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="relative pt-10 pb-20 overflow-visible perspective-[1500px]">
                   <div className="absolute bottom-10 left-0 right-0 h-10 bg-slate-50 border border-slate-200 shadow-sm origin-bottom scale-x-[1.02] rounded-sm" style={{ transform: 'rotateX(72deg)' }} />
                   <div className="relative flex justify-start overflow-x-auto pt-12 px-8 scroll-smooth no-scrollbar pb-10 overflow-y-visible">
                     <div className="flex gap-[3px] items-end">
                       {bestMatches.map((item, idx) => (
                         <BookSpine 
                           key={item.id} 
                           item={item} 
                           index={idx} 
                           score={scoreMap.get(item.id) ?? 0} 
                           isHighlighted 
                           onOpen={() => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`)} 
                         />
                       ))}
                     </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-y-16">
            <AnimatePresence mode="popLayout">
              {shelves.length > 0 ? shelves.map(shelf => (
                <motion.div 
                  key={shelf.title} 
                  initial={{ opacity: 0, scale: 0.99 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }} 
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <ShelfSection shelf={shelf} navigate={navigate} highlightIds={highlightIds} scores={scoreMap} />
                </motion.div>
              )) : (
                  <motion.div 
                    key="empty" 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex flex-col items-center justify-center py-16 px-6"
                  >
                    <div 
                      className="max-w-md w-full rounded-2xl p-10 text-center space-y-8 bg-white"
                      style={{
                        border: '1px solid rgba(13, 13, 13, 0.08)',
                        boxShadow: '0 12px 32px rgba(13, 23, 48, 0.06)',
                      }}
                    >
                      <div className="flex justify-center">
                         <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#f7f8fa', border: '1px solid rgba(13,13,13,0.08)' }}>
                            <Brain size={28} style={{ color: '#4e5bff' }} />
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                         <h2 className="app-h2">No Modules Found</h2>
                         <p className="text-[13px]" style={{ color: 'rgba(13,13,13,0.48)' }}>
                            "{rawQuery || 'Your Query'}" does not exist in your personal study archives.
                         </p>
                      </div>

                      <div className="h-px w-full bg-slate-100" />

                      <div className="space-y-4">
                         <p className="text-[12px] font-medium leading-relaxed" style={{ color: 'rgba(13,13,13,0.56)' }}>
                            Generate a new customized learning path to explore this topic.
                         </p>
                         
                         <button 
                           onClick={handleManifest}
                           className="app-btn-accent w-full h-11"
                         >
                           <span>Manifest Learning Path</span>
                           <ArrowRight size={14} />
                         </button>

                         <button 
                           onClick={clearSearch}
                           className="text-[12px] font-semibold hover:text-[#4e5bff] transition-colors"
                           style={{ color: 'rgba(13,13,13,0.4)' }}
                         >
                           Reset Search Scan
                         </button>
                      </div>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          {!debouncedQuery && filter === 'all' && (
            <div className="flex flex-col items-center gap-4 pt-12 border-t border-slate-100">
              <div className="h-px w-12 bg-slate-200" />
              <p 
                className="text-[12px] font-medium text-center max-w-sm leading-relaxed"
                style={{ color: 'rgba(13,13,13,0.48)' }}
              >
                Viewing your primary archives. Type a query above to scan the global registry of your completed and active knowledge bases.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
