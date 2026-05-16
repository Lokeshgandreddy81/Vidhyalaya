import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  BookOpen, Search, Sparkles, HardDrive, ChevronRight,
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
type FilterChip = 'all' | 'inprogress' | 'done' | 'quick' | 'deep';

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

// ── Book Spine ────────────────────────────────────────────────────────────────
const BookSpine: React.FC<{
  item: LibraryItem;
  index: number;
  score?: number;
  isHighlighted?: boolean;
  onOpen: () => void;
}> = ({ item, index, score = 0, isHighlighted = false, onOpen }) => {
  const color = PALETTE[index % PALETTE.length];
  const w = 45 + (index % 4) * 8;
  const h = 210 + (index % 5) * 15;
  const lean = index % 9 === 0 ? (index % 18 === 0 ? 5 : -5) : 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -30, scale: 1.05, transition: { duration: 0.2, ease: 'easeOut' } }}
      onClick={onOpen}
      className={`relative flex-shrink-0 ${color} rounded-sm cursor-pointer will-change-transform group overflow-visible mb-2`}
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
          <div className="absolute bottom-10 left-0 right-0 h-12 z-0">
            <div className="absolute inset-0 bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_-2px_10px_rgba(0,0,0,0.02)] origin-bottom scale-x-[1.04] rounded-sm" style={{ transform: 'rotateX(72deg)' }} />
            <div className="absolute bottom-[-6px] left-[-1%] right-[-1%] h-6 bg-slate-50 border-x border-b border-slate-200 rounded-b-lg shadow-2xl z-10 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" /></div>
            <div className="absolute bottom-[-40px] left-0 right-0 h-20 bg-indigo-900/5 blur-3xl pointer-events-none" />
          </div>
          <div className="absolute bottom-10 left-[-8px] w-4 h-32 bg-slate-900 rounded-r shadow-2xl z-20 border-r border-white/5" />
          <div className="absolute bottom-10 right-[-8px] w-4 h-32 bg-slate-900 rounded-l shadow-2xl z-20 border-l border-white/5" />
          <div className="relative flex justify-start overflow-x-auto pt-16 px-12 scroll-smooth no-scrollbar pb-10 overflow-y-visible">
            <div className="flex gap-[3px] items-end">
              <AnimatePresence mode="popLayout">
                {allItems.map((item, idx) => (
                  <BookSpine key={item.id} item={item} index={idx} score={scores?.get(item.id) ?? 0} isHighlighted={highlightIds?.has(item.id) ?? false} onOpen={() => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`)} />
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
      case 'quick': return allItems.filter(i => i.minutes <= 30);
      case 'deep': return allItems.filter(i => i.minutes >= 120);
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
    <div className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-indigo-100 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-20">{particles.map((p) => <motion.div key={p.id} initial={{ opacity: 0, top: `${p.y}%`, left: `${p.x}%` }} animate={{ opacity: [0, 0.5, 0], y: [0, p.targetY], x: [0, p.targetX] }} transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }} className="absolute w-1 h-1 bg-white rounded-full blur-[1px]" />)}</div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-8 py-20 lg:py-32">
        <motion.div style={{ opacity: headerOpacity, y: headerY }} className="space-y-12 mb-32">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-indigo-600"><div className="h-[1px] w-10 bg-indigo-600" /><span className="text-[12px] font-black uppercase tracking-[0.6em]">Academic Archive</span></div>
              <h1 className="text-[64px] lg:text-[100px] font-black tracking-tighter leading-[0.85] text-slate-900 uppercase italic">Personal <br /><span className="not-italic text-slate-400">Mastery</span></h1>
              <div className="flex items-center gap-10 pt-6">
                <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Cataloged</span><div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-900 leading-none">{allItems.length}</span><span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Units</span></div></div>
                <div className="w-[1px] h-10 bg-slate-200" /><div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Authenticated</span><div className="flex items-end gap-2"><span className="text-3xl font-black text-emerald-600 leading-none">{completedCount}</span><span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Mastered</span></div></div>
                <div className="w-[1px] h-10 bg-slate-200" /><div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Engagement</span><div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-900 leading-none">{Math.round(totalMinutes / 60)}</span><span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Hours</span></div></div>
              </div>
            </div>
            <div className="w-full max-w-xl space-y-6">
               <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input ref={searchRef} type="text" value={rawQuery} onChange={e => setRawQuery(e.target.value)} placeholder="Scan the registry for specific knowledge..." className="w-full bg-white border border-slate-200 rounded-[30px] py-6 pl-16 pr-24 text-[16px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-8 focus:ring-indigo-600/5 transition-all shadow-xl shadow-slate-100" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {rawQuery && <button onClick={clearSearch} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={18} /></button>}
                    <button onClick={() => searchRef.current?.focus()} className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 shadow-sm hover:border-indigo-400 hover:bg-white hover:shadow-md transition-all group/kbd active:scale-95"><span className="text-[12px] font-black text-slate-400 group-hover/kbd:text-indigo-600">/</span></button>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { id: 'all', label: 'All', icon: Layout },
                      { id: 'inprogress', label: 'Active', icon: Layers },
                      { id: 'done', label: 'Mastered', icon: CheckCircle2 },
                      { id: 'quick', label: 'Express', icon: Zap },
                      { id: 'deep', label: 'Profound', icon: Clock },
                    ].map(chip => (
                      <button key={chip.id} onClick={() => setFilter(chip.id as FilterChip)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${filter === chip.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}><chip.icon size={12} className={filter === chip.id ? 'text-white' : 'text-slate-400'} />{chip.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setIsZenMode(!isZenMode)} className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600'}`}><Sparkles size={14} /> {isZenMode ? 'Exit Zen' : 'Zen'}</button>
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

          <LayoutGroup>
            <motion.div layout className="grid grid-cols-1 xl:grid-cols-2 gap-x-20 gap-y-32">
              <AnimatePresence mode="popLayout">
                {shelves.length > 0 ? shelves.map(shelf => (
                  <motion.div key={shelf.title} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                    <ShelfSection shelf={shelf} navigate={navigate} highlightIds={highlightIds} scores={scoreMap} />
                  </motion.div>
                )) : (
                  <motion.div key="empty" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="col-span-full flex flex-col items-center justify-center py-20 px-6">
                    <div className="max-w-xl w-full bg-white rounded-[40px] p-12 border border-slate-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] text-center space-y-10 relative overflow-hidden group">
                       {/* Subtle Background Accent */}
                       <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                       
                       <div className="relative space-y-6">
                          <div className="flex justify-center">
                             <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-3 group-hover:rotate-6 transition-transform">
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
            </motion.div>
          </LayoutGroup>

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
