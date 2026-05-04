import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Clock, Database,
  FileText, FolderOpen, Layers, Link as LinkIcon, PlayCircle, Plus,
  Search, Sparkles, Tags, X, Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
type LibraryItem = {
  id: string;
  pathId: string;
  phaseId: string;
  moduleId: string;
  courseTitle: string;
  phaseTitle: string;
  moduleTitle: string;
  description: string;
  minutes: number;
  completed: boolean;
  keyConcepts: string[];
  resourceCount: number;
  sourceTypes: string[];
};

const sourceTypeMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  pdf: { label: 'PDF', icon: <FileText size={13} /> },
  pdf_link: { label: 'PDF', icon: <FileText size={13} /> },
  url: { label: 'URL', icon: <LinkIcon size={13} /> },
  text: { label: 'Text', icon: <BookOpen size={13} /> },
  youtube: { label: 'YouTube', icon: <PlayCircle size={13} /> },
  video: { label: 'Video', icon: <PlayCircle size={13} /> },
};

// ── Main Component ───────────────────────────────────────────────────────────
const Library: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const [query, setQuery] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'open' | 'done'>('all');
  const [selectedPathId, setSelectedPathId] = React.useState('all');

  const activePaths = paths.filter(p => p.status !== 'archived');

  // Flatten all modules into searchable items
  const libraryItems: LibraryItem[] = activePaths.flatMap(path =>
    path.phases.flatMap(phase =>
      phase.modules.map(mod => ({
        id: `${path.id}-${phase.id}-${mod.id}`,
        pathId: path.id,
        phaseId: phase.id,
        moduleId: mod.id,
        courseTitle: path.title,
        phaseTitle: phase.title,
        moduleTitle: mod.title,
        description: mod.description,
        minutes: mod.estimatedMinutes || 0,
        completed: mod.isCompleted,
        keyConcepts: mod.keyConcepts || [],
        resourceCount: mod.resources?.length || 0,
        sourceTypes: Array.from(new Set((mod.resources || []).map(r => r.type))),
      }))
    )
  );

  const totalModules = libraryItems.length;
  const completedModules = libraryItems.filter(i => i.completed).length;
  const totalResources = libraryItems.reduce((s, i) => s + i.resourceCount, 0);
  const totalConcepts = libraryItems.reduce((s, i) => s + i.keyConcepts.length, 0);
  const totalHours = (libraryItems.reduce((s, i) => s + i.minutes, 0) / 60).toFixed(0);

  // Source type counts for filter pills
  const sourceTypeCounts = libraryItems.reduce((map, item) => {
    item.sourceTypes.forEach(t => map.set(t, (map.get(t) || 0) + 1));
    return map;
  }, new Map<string, number>());
  const sourceEntries = Array.from(sourceTypeCounts.entries()).sort((a, b) => b[1] - a[1]);

  // Concept cloud (top 40)
  const conceptCloud = Array.from(
    libraryItems.reduce((map, item) => {
      item.keyConcepts.forEach(c => {
        const k = c.trim();
        if (k) map.set(k, (map.get(k) || 0) + 1);
      });
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 40);

  // Filter
  const filtered = libraryItems.filter(item => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || [item.courseTitle, item.phaseTitle, item.moduleTitle, item.description, ...item.keyConcepts].some(v => v.toLowerCase().includes(q));
    const matchSrc = sourceFilter === 'all' || item.sourceTypes.includes(sourceFilter);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'done' ? item.completed : !item.completed);
    const matchPath = selectedPathId === 'all' || item.pathId === selectedPathId;
    return matchQ && matchSrc && matchStatus && matchPath;
  });

  const hasFilters = query.trim() !== '' || sourceFilter !== 'all' || statusFilter !== 'all' || selectedPathId !== 'all';
  const clearFilters = () => { setQuery(''); setSourceFilter('all'); setStatusFilter('all'); setSelectedPathId('all'); };
  const openStudy = (item: LibraryItem) => navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`);

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-[#f5f6fa] px-5 pb-24 pt-8 sm:px-8 lg:px-10 xl:px-14">
      <div className="mx-auto max-w-[1440px] space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
              Vidhyalaya — Place of Wisdom
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Library</h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              {totalModules > 0
                ? `${totalModules} modules across ${activePaths.length} classrooms.`
                : 'Your knowledge atlas — create a classroom to begin.'}
            </p>
          </div>
          {totalModules === 0 && (
            <button
              onClick={() => navigate('/create')}
              className="group inline-flex shrink-0 items-center gap-3 rounded-[20px] bg-[#000666] px-7 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_12px_28px_-8px_rgba(0,6,102,0.35)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
            >
              <Plus size={16} strokeWidth={3} className="transition-transform duration-500 group-hover:rotate-90" />
              Create Classroom
            </button>
          )}
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        {totalModules > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { icon: <Layers size={14} />, val: activePaths.length, label: 'Classrooms', accent: '#000666' },
              { icon: <BookOpen size={14} />, val: `${completedModules}/${totalModules}`, label: 'Modules', accent: '#065f46' },
              { icon: <Database size={14} />, val: totalResources, label: 'Sources', accent: '#7c2d12' },
              { icon: <BrainCircuit size={14} />, val: totalConcepts, label: 'Concepts', accent: '#4c1d95' },
              { icon: <Clock size={14} />, val: `${totalHours}h`, label: 'Study Time', accent: '#1e3a5f' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4 rounded-[20px] bg-white px-5 py-4 ring-1 ring-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: s.accent }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[18px] font-black leading-none tracking-tight" style={{ color: s.accent }}>{s.val}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search + Filters ───────────────────────────────────────────── */}
        {totalModules > 0 && (
          <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:gap-3">
              {/* Search bar */}
              <label className="flex h-10 flex-1 items-center gap-2.5 rounded-[14px] border-2 border-slate-100 bg-white px-3.5 text-slate-400 transition-all focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-500/5">
                <Search size={15} className="shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search modules, concepts, sources..."
                  className="w-full bg-transparent text-[13px] font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="shrink-0 rounded-full bg-slate-100 p-0.5 text-slate-400 hover:bg-slate-200">
                    <Plus size={11} className="rotate-45" />
                  </button>
                )}
              </label>

              {/* Dropdowns */}
              <select
                value={selectedPathId}
                onChange={e => setSelectedPathId(e.target.value)}
                className="h-10 rounded-[14px] border-2 border-slate-100 bg-white px-3 text-[12px] font-black text-slate-600 outline-none transition-all focus:border-indigo-200"
              >
                <option value="all">All classrooms</option>
                {activePaths.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'open' | 'done')}
                className="h-10 rounded-[14px] border-2 border-slate-100 bg-white px-3 text-[12px] font-black text-slate-600 outline-none transition-all focus:border-indigo-200"
              >
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="done">Completed</option>
              </select>

              {hasFilters && (
                <button onClick={clearFilters} className="flex h-10 items-center gap-1.5 rounded-[14px] bg-slate-50 px-3.5 text-[11px] font-black text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700">
                  <X size={13} /> Clear
                </button>
              )}
            </div>

            {/* Source type pills */}
            {sourceEntries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-all ${
                    sourceFilter === 'all'
                      ? 'bg-[#000666] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >All</button>
                {sourceEntries.map(([type, count]) => {
                  const meta = sourceTypeMeta[type] || { label: type, icon: <FileText size={13} /> };
                  return (
                    <button
                      key={type}
                      onClick={() => setSourceFilter(type)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition-all ${
                        sourceFilter === type
                          ? 'bg-[#000666] text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {meta.icon} {meta.label}
                      <span className={sourceFilter === type ? 'text-white/60' : 'text-slate-300'}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Content Grid ───────────────────────────────────────────────── */}
        {totalModules > 0 && (
          <div className="grid gap-5 xl:grid-cols-[280px_1fr]">

            {/* Left sidebar — Concept Cloud + Classrooms */}
            <div className="flex flex-col gap-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto xl:scrollbar-none">

              {/* Concept Cloud */}
              {conceptCloud.length > 0 && (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Concepts</h3>
                    <Tags size={14} className="text-slate-300" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {conceptCloud.map(([concept, count]) => (
                      <button
                        key={concept}
                        onClick={() => setQuery(concept)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                          query === concept
                            ? 'bg-[#000666] text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-[#000666]'
                        }`}
                      >
                        {concept}
                        {count > 1 && <span className={`ml-1 ${query === concept ? 'text-white/50' : 'text-slate-300'}`}>{count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Classroom list */}
              {activePaths.length > 0 && (
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Classrooms</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedPathId('all')}
                      className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[12px] font-bold transition-all ${
                        selectedPathId === 'all' ? 'bg-[#000666] text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All classrooms
                      <span className={`text-[10px] ${selectedPathId === 'all' ? 'text-white/50' : 'text-slate-300'}`}>{totalModules}</span>
                    </button>
                    {activePaths.map(path => {
                      const count = path.phases.reduce((s, p) => s + p.modules.length, 0);
                      return (
                        <button
                          key={path.id}
                          onClick={() => setSelectedPathId(path.id)}
                          className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[12px] font-bold transition-all ${
                            selectedPathId === path.id ? 'bg-[#000666] text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate pr-2">{path.title}</span>
                          <span className={`shrink-0 text-[10px] ${selectedPathId === path.id ? 'text-white/50' : 'text-slate-300'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right — Module cards */}
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold text-slate-400">
                  {hasFilters ? `${filtered.length} results` : `${totalModules} modules`}
                </p>
              </div>

              {filtered.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 animate-in fade-in duration-500">
                  {filtered.map(item => (
                    <article
                      key={item.id}
                      className="group flex flex-col justify-between rounded-[20px] bg-white p-5 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[0_12px_32px_-8px_rgba(0,6,102,0.08)] hover:ring-slate-200"
                    >
                      {/* Top */}
                      <button type="button" onClick={() => openStudy(item)} className="w-full text-left">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-indigo-400">{item.courseTitle}</p>
                          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            item.completed
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}>
                            {item.completed ? <><CheckCircle2 size={9} /> Done</> : 'Open'}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-[14px] font-black leading-snug tracking-tight text-slate-900 group-hover:text-[#000666] transition-colors duration-300">
                          {item.moduleTitle}
                        </h3>
                        {item.description && (
                          <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-500 font-['Newsreader'] italic">
                            {item.description}
                          </p>
                        )}
                      </button>

                      {/* Concepts */}
                      {item.keyConcepts.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {item.keyConcepts.slice(0, 3).map((c, ci) => (
                            <span key={`${item.id}-${ci}`} className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{c}</span>
                          ))}
                          {item.keyConcepts.length > 3 && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-500">+{item.keyConcepts.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={11} /> {item.minutes}m</span>
                          <span className="flex items-center gap-1"><Database size={11} /> {item.resourceCount}</span>
                          {item.sourceTypes.slice(0, 2).map(t => {
                            const m = sourceTypeMeta[t];
                            return m ? <span key={t} className="flex items-center gap-0.5">{m.icon}</span> : null;
                          })}
                        </div>
                        <button
                          onClick={() => openStudy(item)}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all duration-300 group-hover:text-[#000666]"
                        >
                          Study <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[24px] bg-white px-8 py-16 text-center ring-1 ring-slate-100">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-50 text-slate-300">
                    <Search size={24} />
                  </div>
                  <h3 className="text-[15px] font-black text-slate-900">No matching modules</h3>
                  <p className="mt-1.5 max-w-xs text-[13px] font-medium text-slate-500">
                    {hasFilters ? 'Try adjusting your filters or search term.' : 'Create a classroom to populate your library.'}
                  </p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-4 text-[11px] font-black text-[#000666] hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Empty state (no modules at all) ────────────────────────────── */}
        {totalModules === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[36px] bg-white px-10 py-24 text-center ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-[#000666]">
                <FolderOpen size={36} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#000666] text-white">
                <Sparkles size={12} />
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">Your library is empty</h3>
            <p className="mt-2.5 max-w-sm text-[14px] font-medium leading-relaxed text-slate-500">
              Create a classroom from a PDF or roadmap and your modules, sources, and concepts will appear here.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="group mt-6 inline-flex items-center gap-3 rounded-[18px] bg-[#000666] px-8 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_12px_28px_-8px_rgba(0,6,102,0.3)] transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              <Zap size={14} className="fill-white" />
              Create First Classroom
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 duration-300" />
            </button>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {totalModules > 0 && (
          <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-400">
            <span>Showing {filtered.length} of {totalModules} modules</span>
            <span className="flex items-center gap-1.5">
              <Zap size={11} className="text-indigo-400" />
              Powered by Gemini AI
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
