import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  ArrowRight, BookOpen, CheckCircle2, Clock, GraduationCap, Grid3X3,
  Layers, List, Plus, Search, Sparkles, Zap,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
type Path = ReturnType<typeof useAppStore>['paths'][0];
const modules = (p: Path) => p.phases.reduce((s, ph) => s + ph.modules.length, 0);
const done = (p: Path) => p.phases.reduce((s, ph) => s + ph.modules.filter(m => m.isCompleted).length, 0);
const hours = (p: Path) => (p.phases.reduce((s, ph) => s + ph.modules.reduce((ss, m) => ss + (m.estimatedMinutes || 0), 0), 0) / 60).toFixed(1);

const phaseTag = (progress: number) => {
  if (progress === 0) return { t: 'Not Started', c: 'text-slate-400 bg-slate-50 border-slate-100' };
  if (progress < 50) return { t: 'In Progress', c: 'text-amber-600 bg-amber-50 border-amber-100' };
  if (progress < 100) return { t: 'Advancing', c: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
  return { t: 'Mastered', c: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
};

// ── Course Card ──────────────────────────────────────────────────────────────
const CourseCard: React.FC<{ path: Path; view: 'grid' | 'list'; onOpen: () => void }> = ({ path, view, onOpen }) => {
  const m = modules(path);
  const d = done(path);
  const h = hours(path);
  const tag = phaseTag(path.progress);

  if (view === 'list') {
    return (
      <button onClick={onOpen} className="group flex w-full items-center gap-5 rounded-[18px] bg-white px-5 py-4 text-left ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(0,6,102,0.08)] hover:ring-slate-200">
        {/* Progress circle */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <svg width={40} height={40} className="-rotate-90">
            <circle cx={20} cy={20} r={16} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={3} />
            <circle cx={20} cy={20} r={16} fill="none" stroke="#000666" strokeWidth={3}
              strokeDasharray={100.5} strokeDashoffset={100.5 - (path.progress / 100) * 100.5}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <span className="absolute text-[10px] font-black text-[#000666]">{path.progress}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-black tracking-tight text-slate-900">{path.title}</h3>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{path.goal}</p>
        </div>
        <span className={`hidden sm:inline rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${tag.c}`}>{tag.t}</span>
        <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400"><BookOpen size={11} /> {d}/{m}</span>
        <span className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Clock size={11} /> {h}h</span>
        <ArrowRight size={14} className="shrink-0 text-slate-300 transition-all group-hover:text-[#000666] group-hover:translate-x-0.5 duration-300" />
      </button>
    );
  }

  return (
    <button onClick={onOpen} className="group flex flex-col rounded-[20px] bg-white text-left ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,6,102,0.08)] hover:ring-slate-200">
      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#000666] text-white">
            <GraduationCap size={18} strokeWidth={2} />
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tag.c}`}>
            {path.progress === 100 && <CheckCircle2 size={9} />}
            {tag.t}
          </span>
        </div>

        <div className="mt-4 flex-1">
          <h3 className="line-clamp-2 text-[14px] font-black leading-snug tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-[#000666]">
            {path.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-500 font-['Newsreader'] italic">
            {path.goal}
          </p>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400">{d}/{m} modules</span>
            <span className="text-[10px] font-black text-[#000666]">{path.progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#000666] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${Math.max(path.progress, path.progress > 0 ? 3 : 0)}%` }} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Clock size={11} /> {h}h</span>
            <span className="h-2.5 w-px bg-slate-100" />
            <span className="flex items-center gap-1"><Layers size={11} /> {path.phases.length} phases</span>
          </div>
          <ArrowRight size={12} className="text-slate-300 transition-all duration-300 group-hover:text-[#000666] group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths, userProfile } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const active = paths.filter(p => p.status !== 'archived');
  const inProgress = active.filter(p => p.progress > 0 && p.progress < 100).length;
  const mastered = active.filter(p => p.progress === 100).length;
  const totalMods = active.reduce((s, p) => s + modules(p), 0);
  const doneMods = active.reduce((s, p) => s + done(p), 0);
  const totalH = (active.reduce((s, p) => s + p.phases.reduce((ss, ph) => ss + ph.modules.reduce((sss, m) => sss + (m.estimatedMinutes || 0), 0), 0), 0) / 60).toFixed(0);

  const filtered = useMemo(() => {
    let list = active;
    if (filter === 'active') list = list.filter(p => p.progress > 0 && p.progress < 100);
    if (filter === 'completed') list = list.filter(p => p.progress === 100);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.goal.toLowerCase().includes(q));
    }
    return list;
  }, [active, filter, query]);

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-[#f5f6fa] px-5 pb-24 pt-8 sm:px-8 lg:px-10 xl:px-14">
      <div className="mx-auto max-w-[1440px] space-y-6">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
              Vidhyalaya — Place of Wisdom
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Courses</h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              {active.length === 0
                ? 'Begin your journey. Create your first learning path.'
                : `${active.length} ${active.length === 1 ? 'classroom' : 'classrooms'} in progress.`}
            </p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-[18px] bg-[#000666] px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_8px_20px_-4px_rgba(0,6,102,0.3)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
          >
            <Plus size={14} strokeWidth={3} className="transition-transform duration-500 group-hover:rotate-90" />
            New Course
          </button>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        {active.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: <BookOpen size={14} />, val: active.length, label: 'Courses', accent: '#000666' },
              { icon: <CheckCircle2 size={14} />, val: `${doneMods}/${totalMods}`, label: 'Modules', accent: '#065f46' },
              { icon: <Clock size={14} />, val: `${totalH}h`, label: 'Study Time', accent: '#1e3a5f' },
              { icon: <Sparkles size={14} />, val: mastered, label: 'Mastered', accent: '#7c2d12' },
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

        {/* ── Controls ──────────────────────────────────────────────── */}
        {active.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 rounded-[16px] bg-white p-1 ring-1 ring-slate-100">
              {([
                { key: 'all' as const, label: 'All', count: active.length },
                { key: 'active' as const, label: 'In Progress', count: inProgress },
                { key: 'completed' as const, label: 'Mastered', count: mastered },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                    filter === f.key
                      ? 'bg-[#000666] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {f.label}
                  <span className={`text-[9px] ${filter === f.key ? 'text-white/50' : 'text-slate-300'}`}>{f.count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <label className="flex h-10 flex-1 items-center gap-2 rounded-[14px] border-2 border-slate-100 bg-white px-3.5 text-slate-400 transition-all focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-500/5 sm:w-56 sm:flex-none">
                <Search size={14} className="shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full bg-transparent text-[12px] font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="shrink-0 rounded-full bg-slate-100 p-0.5 text-slate-400 hover:bg-slate-200">
                    <Plus size={11} className="rotate-45" />
                  </button>
                )}
              </label>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 rounded-[12px] bg-white p-0.5 ring-1 ring-slate-100">
                <button onClick={() => setView('grid')} className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-300 ${view === 'grid' ? 'bg-[#000666] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Grid3X3 size={13} />
                </button>
                <button onClick={() => setView('list')} className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-300 ${view === 'list' ? 'bg-[#000666] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Cards ─────────────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className={`animate-in fade-in duration-500 ${
            view === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
              : 'flex flex-col gap-2.5'
          }`}>
            {filtered.map(path => (
              <CourseCard key={path.id} path={path} view={view} onOpen={() => navigate(`/path/${path.id}`)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-white px-8 py-20 text-center ring-1 ring-slate-100">
            <div className="relative mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-indigo-50 text-[#000666]">
                <GraduationCap size={28} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#000666] text-white">
                <Sparkles size={10} />
              </div>
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {query ? 'No courses found' : 'Start your first course'}
            </h3>
            <p className="mt-2 max-w-xs text-[13px] font-medium leading-relaxed text-slate-500">
              {query
                ? `Nothing matches "${query}".`
                : 'Create a learning path and your courses will appear here.'}
            </p>
            {!query && (
              <button
                onClick={() => navigate('/create')}
                className="group mt-5 inline-flex items-center gap-2.5 rounded-[16px] bg-[#000666] px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_8px_20px_-4px_rgba(0,6,102,0.3)] transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <Zap size={13} className="fill-white" />
                Create Course
              </button>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-400">
            <span>Showing {filtered.length} of {active.length} courses</span>
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

export default Courses;
