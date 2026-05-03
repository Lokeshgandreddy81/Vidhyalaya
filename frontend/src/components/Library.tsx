import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Clock,
  Database,
  FileText,
  Filter,
  FolderOpen,
  Layers3,
  LibraryBig,
  Link as LinkIcon,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Tags,
  Waypoints,
} from 'lucide-react';

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
  pdf: { label: 'PDF', icon: <FileText size={14} /> },
  pdf_link: { label: 'PDF Link', icon: <FileText size={14} /> },
  url: { label: 'URL', icon: <LinkIcon size={14} /> },
  text: { label: 'Text', icon: <BookOpen size={14} /> },
  youtube: { label: 'YouTube', icon: <PlayCircle size={14} /> },
  video: { label: 'Video', icon: <PlayCircle size={14} /> },
};

const flowLabels = [
  { title: 'Source', detail: 'PDF, link, video, or notes' },
  { title: 'Concepts', detail: 'Key ideas extracted' },
  { title: 'Module', detail: 'Structured learning unit' },
  { title: 'Practice', detail: 'Study and recall loop' },
  { title: 'Proof', detail: 'Exam, notes, completion' },
];

const Library: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const [query, setQuery] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'open' | 'done'>('all');
  const [selectedPathId, setSelectedPathId] = React.useState('all');
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);

  const activePaths = paths.filter(path => path.status !== 'archived');
  const libraryItems: LibraryItem[] = activePaths.flatMap(path =>
    path.phases.flatMap(phase =>
      phase.modules.map(module => {
        const sourceTypes = Array.from(new Set((module.resources || []).map(resource => resource.type)));
        return {
          id: `${path.id}-${phase.id}-${module.id}`,
          pathId: path.id,
          phaseId: phase.id,
          moduleId: module.id,
          courseTitle: path.title,
          phaseTitle: phase.title,
          moduleTitle: module.title,
          description: module.description,
          minutes: module.estimatedMinutes || 0,
          completed: module.isCompleted,
          keyConcepts: module.keyConcepts || [],
          resourceCount: module.resources?.length || 0,
          sourceTypes,
        };
      })
    )
  );

  const totalResources = libraryItems.reduce((sum, item) => sum + item.resourceCount, 0);
  const totalConcepts = libraryItems.reduce((sum, item) => sum + item.keyConcepts.length, 0);
  const totalMinutes = libraryItems.reduce((sum, item) => sum + item.minutes, 0);

  const sourceTypeCounts = libraryItems.reduce((map, item) => {
    item.sourceTypes.forEach(type => map.set(type, (map.get(type) || 0) + 1));
    return map;
  }, new Map<string, number>());
  const sourceTypeEntries = Array.from(sourceTypeCounts.entries())
    .sort((a, b) => b[1] - a[1] || (sourceTypeMeta[a[0]]?.label || a[0]).localeCompare(sourceTypeMeta[b[0]]?.label || b[0]));

  const conceptCloud = Array.from(
    libraryItems.reduce((map, item) => {
      item.keyConcepts.forEach(concept => {
        const key = concept.trim();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 96);

  const filteredItems = libraryItems.filter(item => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [
      item.courseTitle,
      item.phaseTitle,
      item.moduleTitle,
      item.description,
      ...item.keyConcepts,
      ...item.sourceTypes,
    ].some(value => value.toLowerCase().includes(normalized));
    const matchesSource = sourceFilter === 'all' || item.sourceTypes.includes(sourceFilter);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'done' ? item.completed : !item.completed);
    const matchesPath = selectedPathId === 'all' || item.pathId === selectedPathId;
    return matchesQuery && matchesSource && matchesStatus && matchesPath;
  });

  const selectedItem = filteredItems.find(item => item.id === selectedItemId) || filteredItems[0] || null;
  const hasActiveFilters = query.trim() !== '' || sourceFilter !== 'all' || statusFilter !== 'all' || selectedPathId !== 'all';
  const emptyHeroTitle = libraryItems.length > 0 && hasActiveFilters
    ? 'No module matches your filters'
    : 'Create a classroom to begin';
  const emptyHeroBody = libraryItems.length > 0 && hasActiveFilters
    ? 'Clear or loosen the filters to bring matching modules back into the knowledge atlas.'
    : 'Upload a PDF or build a roadmap classroom, and Library will turn it into a searchable atlas.';

  const clearFilters = () => {
    setQuery('');
    setSourceFilter('all');
    setStatusFilter('all');
    setSelectedPathId('all');
  };

  const openStudy = (item: LibraryItem) => {
    navigate(`/study/${item.pathId}/${item.phaseId}/${item.moduleId}`);
  };

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-[#fdfdfe] px-5 pb-24 pt-8 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="parallax-depth-layer mastery-blueprint-grid opacity-75" />
        <div className="parallax-depth-layer scholarly-constellations opacity-35" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1720px] space-y-8">
        <header className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr] 2xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#000666] shadow-sm backdrop-blur-xl">
              <LibraryBig size={14} />
              Library
            </div>
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-[#000666] sm:text-5xl">
                Your PDF knowledge atlas.
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-500">
                A full-width command surface for every source, concept, module, and study artifact created from your classrooms.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Courses', value: activePaths.length, icon: FolderOpen },
              { label: 'Modules', value: libraryItems.length, icon: Layers3 },
              { label: 'Sources', value: totalResources, icon: Database },
              { label: 'Concepts', value: totalConcepts, icon: BrainCircuit },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/70 bg-white/60 p-4 text-center shadow-[0_24px_70px_-48px_rgba(0,6,102,0.45)] backdrop-blur-3xl">
                <stat.icon size={17} className="mx-auto mb-2 text-indigo-500" />
                <p className="text-2xl font-black text-[#000666]">{stat.value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-[38px] border border-white/70 bg-white/50 p-6 shadow-[0_32px_100px_-62px_rgba(0,6,102,0.55)] backdrop-blur-3xl">
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400">
                  <Waypoints size={13} />
                  Knowledge Flow
                </div>
                <h2 className="font-serif text-4xl font-semibold leading-tight text-[#000666]">
                  {selectedItem ? selectedItem.moduleTitle : emptyHeroTitle}
                </h2>
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                  {selectedItem
                    ? selectedItem.description || `${selectedItem.phaseTitle} from ${selectedItem.courseTitle}`
                    : emptyHeroBody}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedItem ? (
                  <button
                    type="button"
                    onClick={() => openStudy(selectedItem)}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_60px_-24px_rgba(0,6,102,0.75)] transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Open module
                    <ArrowRight size={15} />
                  </button>
                ) : libraryItems.length > 0 && hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_60px_-24px_rgba(0,6,102,0.75)] transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Clear filters
                    <Filter size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/create')}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_60px_-24px_rgba(0,6,102,0.75)] transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Create course
                    <Plus size={15} />
                  </button>
                )}

                <div className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white/75 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <Clock size={14} className="text-indigo-400" />
                  {(totalMinutes / 60).toFixed(1)}h indexed
                </div>
              </div>
            </div>

            <div className="relative min-h-[270px] rounded-[32px] border border-indigo-100/70 bg-white/55 p-5">
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(rgba(0,6,102,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,6,102,0.035)_1px,transparent_1px)] bg-[size:54px_54px]" />
              <div className="relative grid h-full gap-4 lg:grid-cols-5">
                {flowLabels.map((step, index) => (
                  <div key={step.title} className="relative flex min-h-[190px] flex-col items-center justify-center text-center">
                    {index < flowLabels.length - 1 && (
                      <div className="absolute left-1/2 top-1/2 hidden h-px w-full translate-x-1/2 bg-indigo-100 lg:block" />
                    )}
                    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-[0_18px_50px_-36px_rgba(0,6,102,0.55)]">
                      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ring-8 ring-white/70 ${
                        selectedItem && index <= Math.min(4, selectedItem.resourceCount + 1)
                          ? 'bg-[#000666] text-white'
                          : 'bg-indigo-50 text-[#000666]'
                      }`}>
                        <span className="text-sm font-black">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="text-sm font-black text-[#000666]">{step.title}</h3>
                      <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/70 bg-white/55 p-5 shadow-[0_28px_90px_-60px_rgba(0,6,102,0.5)] backdrop-blur-3xl">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-indigo-100 bg-white/85 px-4 text-slate-400 shadow-sm">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, concepts, sources, or courses"
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                value={selectedPathId}
                onChange={(event) => setSelectedPathId(event.target.value)}
                className="min-h-14 rounded-2xl border border-indigo-100 bg-white/85 px-4 text-sm font-black text-[#000666] outline-none"
              >
                <option value="all">All courses</option>
                {activePaths.map(path => (
                  <option key={path.id} value={path.id}>{path.title}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'open' | 'done')}
                className="min-h-14 rounded-2xl border border-indigo-100 bg-white/85 px-4 text-sm font-black text-[#000666] outline-none"
              >
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="done">Done</option>
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white/85 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition-all hover:bg-indigo-50 hover:text-[#000666]"
              >
                <Filter size={14} />
                Clear
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`rounded-full border px-4 py-2 text-xs font-black transition-all ${
                sourceFilter === 'all' ? 'border-[#000666] bg-indigo-50 text-[#000666]' : 'border-indigo-100 bg-white/80 text-slate-500 hover:bg-indigo-50'
              }`}
            >
              All sources
            </button>
            {sourceTypeEntries.map(([type, count]) => {
              const meta = sourceTypeMeta[type] || { label: type, icon: <FileText size={14} /> };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSourceFilter(type)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black transition-all ${
                    sourceFilter === type ? 'border-[#000666] bg-indigo-50 text-[#000666]' : 'border-indigo-100 bg-white/80 text-slate-500 hover:bg-indigo-50'
                  }`}
                >
                  {meta.icon}
                  {meta.label}
                  <span className="text-indigo-300">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[34px] border border-white/70 bg-white/55 p-6 shadow-[0_28px_90px_-60px_rgba(0,6,102,0.5)] backdrop-blur-3xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-300">Concept Cloud</p>
                <h2 className="mt-2 text-2xl font-black text-[#000666]">Recurring ideas</h2>
              </div>
              <Tags size={22} className="text-indigo-300" />
            </div>

            {conceptCloud.length > 0 ? (
              <div className="flex content-start flex-wrap gap-2.5">
                {conceptCloud.map(([concept, count]) => (
                  <button
                    key={concept}
                    type="button"
                    onClick={() => setQuery(concept)}
                    className="rounded-full border border-indigo-100 bg-white/80 px-3.5 py-2 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-[#000666]"
                  >
                    {concept}
                    <span className="ml-2 text-indigo-300">{count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<Sparkles size={28} />}
                title="Concepts will collect here"
                body="Generated modules with key concepts become a searchable map for revision."
              />
            )}
          </div>

          <div className="rounded-[34px] border border-white/70 bg-white/55 p-6 shadow-[0_28px_90px_-60px_rgba(0,6,102,0.5)] backdrop-blur-3xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-300">Courses</p>
                <h2 className="mt-2 text-2xl font-black text-[#000666]">Classroom shelves</h2>
              </div>
              <LibraryBig size={22} className="text-indigo-300" />
            </div>

            {activePaths.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {activePaths.map(path => {
                  const modules = path.phases.reduce((sum, phase) => sum + phase.modules.length, 0);
                  return (
                    <button
                      key={path.id}
                      type="button"
                      onClick={() => setSelectedPathId(path.id)}
                      className={`flex min-h-[86px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                        selectedPathId === path.id ? 'border-[#000666] bg-indigo-50' : 'border-indigo-100 bg-white/80 hover:bg-indigo-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-black leading-snug text-[#000666]">{path.title}</span>
                        <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{modules} modules</span>
                      </span>
                      <ArrowRight size={14} className="ml-3 shrink-0 text-indigo-300" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyPanel
                icon={<FolderOpen size={28} />}
                title="No classrooms yet"
                body="Create a course from a PDF or roadmap to populate your shelves."
              />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/60 shadow-[0_28px_90px_-60px_rgba(0,6,102,0.45)] backdrop-blur-3xl">
            <div className="border-b border-indigo-100/70 bg-white/50 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-indigo-300">Module Index</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-[#000666]">Every classroom artifact</h2>
                </div>
                <div className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#000666]">
                  {filteredItems.length} visible
                </div>
              </div>
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid gap-4 p-5 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map(item => (
                  <article
                    key={item.id}
                    className={`group flex min-h-[230px] flex-col justify-between rounded-2xl border bg-white/80 p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5 ${
                      selectedItem?.id === item.id ? 'border-[#000666]' : 'border-indigo-100'
                    }`}
                  >
                    <button type="button" onClick={() => setSelectedItemId(item.id)} className="w-full text-left">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">{item.courseTitle}</p>
                          <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-[#000666]">{item.moduleTitle}</h3>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                          item.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-[#000666]'
                        }`}>
                          {item.completed ? 'Done' : 'Open'}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.description || item.phaseTitle}</p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {item.keyConcepts.slice(0, 4).map((concept, conceptIndex) => (
                          <span key={`${item.id}-${concept}-${conceptIndex}`} className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-400">
                            {concept}
                          </span>
                        ))}
                        {item.keyConcepts.length > 4 && (
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-500">
                            +{item.keyConcepts.length - 4}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {item.minutes}m</span>
                      <span className="flex items-center gap-1.5"><Database size={13} /> {item.resourceCount} sources</span>
                      <button
                        type="button"
                        onClick={() => openStudy(item)}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[#000666] transition-all hover:bg-[#000666] hover:text-white"
                      >
                        Study <ArrowRight size={13} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-[#000666]">
                  <BookOpen size={30} />
                </div>
                <h3 className="text-xl font-black text-slate-900">No matching library items</h3>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Clear the filters or create a course from a PDF to populate the library.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-indigo-100 bg-white px-5 py-3 text-sm font-black text-[#000666] shadow-sm hover:bg-indigo-50"
                >
                  Clear filters
                </button>
              </div>
            )}
        </section>
      </div>
    </div>
  );
};

const EmptyPanel: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-5 py-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
      {icon}
    </div>
    <h3 className="mt-4 text-sm font-black text-slate-900">{title}</h3>
    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{body}</p>
  </div>
);

export default Library;
