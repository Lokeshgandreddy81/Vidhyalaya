import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  Clock,
  Compass,
  FileCheck,
  FileText,
  FolderKanban,
  GraduationCap,
  Layers3,
  LibraryBig,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Waypoints,
} from 'lucide-react';

const roleRoadmaps = [
  'Frontend', 'Backend', 'Full Stack',
  'DevOps', 'DevSecOps', 'Data Analyst',
  'AI Engineer', 'AI and Data Scientist', 'Data Engineer',
  'Android', 'Machine Learning', 'PostgreSQL',
  'iOS', 'Blockchain', 'QA',
  'Software Architect', 'Cyber Security', 'UX Design',
  'Technical Writer', 'Game Developer', 'Server Side Game Developer',
  'MLOps', 'Product Manager', 'Engineering Manager',
  'Developer Relations', 'BI Analyst',
];

const skillRoadmaps = [
  'SQL', 'Computer Science', 'React',
  'Vue', 'Angular', 'JavaScript',
  'TypeScript', 'Node.js', 'Python',
  'System Design', 'Java', 'ASP.NET Core',
  'API Design', 'Spring Boot', 'Flutter',
  'C++', 'Rust', 'Go',
  'Software Design and Architecture', 'GraphQL', 'React Native',
  'Design System', 'Prompt Engineering', 'MongoDB',
  'Linux', 'Kubernetes', 'Docker',
  'AWS', 'Terraform', 'Data Structures & Algorithms',
  'Redis', 'Git and GitHub', 'PHP',
  'Cloudflare', 'AI Red Teaming', 'AI Agents',
  'Next.js', 'Code Review', 'Kotlin',
  'HTML', 'CSS', 'Swift & Swift UI',
  'Shell / Bash', 'Laravel', 'Elasticsearch',
  'WordPress', 'Django', 'Ruby',
  'Ruby on Rails', 'Claude Code', 'Vibe Coding',
  'Scala', 'OpenClaw', 'LeetCode',
];

const projectIdeas = ['Frontend', 'Backend', 'DevOps'];
const bestPractices = ['AWS', 'API Security', 'Backend Performance', 'Frontend Performance', 'Code Review'];
const newItems = new Set(['OpenClaw', 'LeetCode']);

const featuredRoadmaps = [
  {
    tag: 'AI Curated',
    title: 'MERN Specialist',
    description: 'Master full-stack in 21 days with 45 min daily focus.',
    goal: 'MERN Specialist',
    track: 'Role Based Roadmap',
  },
  {
    tag: 'High Speed',
    title: 'AI for Managers',
    description: 'Executive summary of LLMs and prompt engineering.',
    goal: 'AI for Managers',
    track: 'Skill Based Roadmap',
  },
  {
    tag: 'Foundational',
    title: 'Python Wizard',
    description: 'From syntax to visualization in 30 days.',
    goal: 'Python Wizard',
    track: 'Skill Based Roadmap',
  },
];

type RoadmapSectionProps = {
  title: string;
  caption: string;
  items: string[];
  icon: React.ReactNode;
  columns?: string;
  selectedTitle?: string;
  onSelect: (item: string) => void;
};

const RoadmapSection: React.FC<RoadmapSectionProps> = ({
  title,
  caption,
  items,
  icon,
  columns = 'xl:grid-cols-3',
  selectedTitle,
  onSelect,
}) => (
  <section className="relative border-t border-slate-100 px-4 py-8 sm:px-6">
    <div className="absolute left-6 top-0 -translate-y-1/2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#000666]">
        {icon}
        <span>{title}</span>
      </div>
    </div>

    <p className="mb-5 max-w-[720px] text-[11px] font-medium leading-relaxed text-slate-400 pl-1">
      {caption}
    </p>

    <div className={`grid max-w-full grid-cols-1 gap-2.5 sm:grid-cols-2 ${columns}`}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={`group flex min-h-[44px] items-center justify-between rounded-xl border px-4 py-2.5 text-left text-[13px] font-bold transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-[#000666] ${
            selectedTitle === item
              ? 'border-[#000666]/20 bg-indigo-50/60 text-[#000666] shadow-sm'
              : 'border-slate-100 bg-white text-slate-600 hover:shadow-sm'
          }`}
        >
          <span className="min-w-0 truncate">{item}</span>
          <span className="ml-3 flex shrink-0 items-center gap-2">
            {newItems.has(item) && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-700">
                New
              </span>
            )}
            <ArrowRight size={13} className="text-slate-200 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
          </span>
        </button>
      ))}
    </div>
  </section>
);

type RoadmapCategory = 'Role Based Roadmap' | 'Skill Based Roadmap' | 'Project Ideas' | 'Best Practices';

type SelectedRoadmap = {
  title: string;
  category: RoadmapCategory;
  goal: string;
  track: string;
};

const categoryCopy: Record<RoadmapCategory, { label: string; summary: string; action: string }> = {
  'Role Based Roadmap': {
    label: 'Role Blueprint',
    summary: 'A destination-first path that organizes fundamentals, daily practice, portfolio proof, and interview readiness.',
    action: 'Build Role Classroom',
  },
  'Skill Based Roadmap': {
    label: 'Skill Blueprint',
    summary: 'A mastery-first path that moves from prerequisites into core concepts, applied projects, and confident recall.',
    action: 'Build Skill Classroom',
  },
  'Project Ideas': {
    label: 'Project Blueprint',
    summary: 'A shipping-first path that turns learning into a portfolio artifact with architecture, implementation, and review.',
    action: 'Build Project Classroom',
  },
  'Best Practices': {
    label: 'Practice Blueprint',
    summary: 'An excellence-first path for production habits, checklists, benchmarks, and repeatable engineering judgment.',
    action: 'Build Practice Classroom',
  },
};

const getRoadmapFlow = (roadmap: SelectedRoadmap) => {
  if (roadmap.category === 'Project Ideas') {
    return [
      { title: 'Scope', detail: `${roadmap.title.replace(' project portfolio', '')} idea, user story, constraints` },
      { title: 'Architecture', detail: 'Data model, screens, APIs, deployment surface' },
      { title: 'Build', detail: 'Core implementation with checkpoints and demos' },
      { title: 'Polish', detail: 'Performance, accessibility, reliability, edge cases' },
      { title: 'Ship', detail: 'Portfolio write-up, review, next iteration' },
    ];
  }

  if (roadmap.category === 'Best Practices') {
    return [
      { title: 'Baseline', detail: `${roadmap.title.replace(' best practices', '')} principles and failure modes` },
      { title: 'Checklist', detail: 'Production standards, review prompts, operating rules' },
      { title: 'Drills', detail: 'Scenario practice with examples and counterexamples' },
      { title: 'Audit', detail: 'Measure quality, performance, security, maintainability' },
      { title: 'Habit', detail: 'Repeatable playbook for real work' },
    ];
  }

  return [
    { title: 'Orientation', detail: `${roadmap.title} role context, outcomes, and mental model` },
    { title: 'Foundations', detail: 'Core concepts, vocabulary, tools, and prerequisites' },
    { title: 'Core Map', detail: 'Main technologies, patterns, tradeoffs, and workflows' },
    { title: 'Projects', detail: 'Applied builds with feedback and references' },
    { title: 'Proof', detail: 'Interview readiness, portfolio, exam mode, revision loop' },
  ];
};

const RoadmapFlowPreview: React.FC<{
  roadmap: SelectedRoadmap;
}> = ({ roadmap }) => {
  const meta = categoryCopy[roadmap.category];
  const flow = getRoadmapFlow(roadmap);

  return (
    <section className="overflow-hidden rounded-[36px] border border-indigo-100/70 bg-white/70 shadow-[0_32px_100px_-64px_rgba(0,6,102,0.5)] backdrop-blur-3xl">
      <div className="grid gap-7 p-6 xl:grid-cols-[0.42fr_0.58fr] xl:p-7">
        <div className="flex min-h-[260px] flex-col justify-between gap-6 rounded-[28px] border border-white/80 bg-white/65 p-6 shadow-sm">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400">
              <Waypoints size={13} />
              {meta.label}
            </div>
            <h2 className="font-serif text-4xl font-semibold leading-tight text-[#000666] xl:text-5xl">
              {roadmap.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-slate-500">
              {meta.summary}
            </p>
          </div>

          <div
            className="inline-flex w-fit items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#000666] shadow-sm"
          >
            {meta.action}
            <Sparkles size={14} className="text-indigo-400" />
          </div>
        </div>

        <div className="relative min-h-[260px] rounded-[28px] border border-indigo-100/70 bg-white/55 p-5">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(rgba(0,6,102,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,6,102,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="relative grid h-full gap-3 lg:grid-cols-5">
            {flow.map((step, index) => (
              <div key={step.title} className="relative flex min-h-[172px] flex-col justify-center text-center">
                {index < flow.length - 1 && (
                  <div className="absolute left-1/2 top-[3.1rem] hidden h-px w-full translate-x-1/2 bg-indigo-100 lg:block" />
                )}
                <div className="relative z-10 flex h-full w-full flex-col items-center rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[0_18px_50px_-38px_rgba(0,6,102,0.55)]">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-[#000666] ring-8 ring-white/80">
                    <span className="text-sm font-black">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-sm font-black text-[#000666]">{step.title}</h3>
                  <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-400 line-clamp-3">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const [query, setQuery] = React.useState('');
  const flowRef = React.useRef<HTMLDivElement | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = React.useState<SelectedRoadmap>({
    title: 'Frontend',
    category: 'Role Based Roadmap',
    goal: 'Frontend',
    track: 'Role Based Roadmap',
  });

  const activePaths = paths.filter(path => path.status !== 'archived');
  const recentPaths = [...activePaths]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);
  const totalModules = activePaths.reduce((sum, path) => sum + path.phases.reduce((phaseSum, phase) => phaseSum + phase.modules.length, 0), 0);
  const completedModules = activePaths.reduce((sum, path) => sum + path.phases.reduce((phaseSum, phase) => phaseSum + phase.modules.filter(module => module.isCompleted).length, 0), 0);

  const filterItems = (items: string[]) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => item.toLowerCase().includes(normalized));
  };

  const selectRoadmap = (title: string, category: RoadmapCategory, goal: string = title, track: string = category) => {
    setSelectedRoadmap({ title, category, goal, track });
    const params = new URLSearchParams({ goal, track });
    navigate(`/explore?${params.toString()}`);
  };

  const buildSelectedRoadmap = () => {
    const params = new URLSearchParams({ goal: selectedRoadmap.goal, track: selectedRoadmap.track });
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-[#f8f9fa] px-5 pb-24 pt-8 text-slate-900 sm:px-8 lg:px-10 xl:px-12">

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-8">
        <header className="relative overflow-hidden rounded-[32px] border border-slate-100/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Subtle grid texture */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,6,102,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,6,102,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-indigo-50/60 blur-[100px]" />

          <div className="relative z-10 grid gap-6 p-8 xl:grid-cols-[1fr_380px] xl:items-center xl:p-10">
            {/* Left — Copy */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[#000666]">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#000666] opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#000666]" /></span>
                Classrooms
              </div>

              <h1 className="max-w-2xl text-[2.6rem] font-black leading-[1.1] tracking-tight text-slate-900 xl:text-5xl">
                Every roadmap becomes a <span className="text-[#000666]">classroom.</span>
              </h1>

              <p className="max-w-xl text-[15px] font-medium leading-relaxed text-slate-400">
                Select a blueprint, inspect the architecture, then let Vidhyalaya synthesize a personalized mastery environment.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/create')}
                  className="group inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-indigo-900/15 transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95"
                >
                  <Plus size={16} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
                  Create Course
                </button>
                <button
                  onClick={() => navigate('/exam')}
                  className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-all hover:border-indigo-200 hover:text-[#000666]"
                >
                  <FileCheck size={15} />
                  Exam Mode
                </button>
              </div>
            </div>

            {/* Right — Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Courses', value: activePaths.length, icon: GraduationCap, accent: 'from-indigo-50 to-indigo-100/40' },
                { label: 'Modules', value: totalModules, icon: Layers3, accent: 'from-sky-50 to-sky-100/40' },
                { label: 'Mastered', value: completedModules, icon: BadgeCheck, accent: 'from-emerald-50 to-emerald-100/40' },
              ].map((stat) => (
                <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b p-5 text-center transition-all hover:border-indigo-100 hover:shadow-md" style={{ backgroundImage: `linear-gradient(to bottom, var(--tw-gradient-stops))` }}>
                  <div className={`absolute inset-0 bg-gradient-to-b ${stat.accent} opacity-60`} />
                  <div className="relative z-10">
                    <stat.icon size={18} className="mx-auto mb-3 text-[#000666] opacity-50" />
                    <p className="text-3xl font-black text-[#000666]">{stat.value}</p>
                    <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Featured Roadmap Flow Preview */}
        <div ref={flowRef} className="rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <RoadmapFlowPreview roadmap={selectedRoadmap} />
          <div className="flex justify-center border-t border-slate-50 py-5">
            <button
              type="button"
              onClick={buildSelectedRoadmap}
              className="group inline-flex items-center gap-3 rounded-2xl bg-[#000666] px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-900/15 transition-all hover:scale-[1.02] active:scale-95"
            >
              Build selected blueprint
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">Your Courses</p>
              <h2 className="text-2xl font-black text-slate-900">Active Learning Paths</h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate('/create')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#000666] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-md shadow-indigo-950/10 transition-transform hover:scale-[1.02] active:scale-95"
              >
                <Plus size={15} />
                New Course
              </button>
            </div>
          </div>

          {recentPaths.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recentPaths.map((path) => {
                const moduleCount = path.phases.reduce((sum, phase) => sum + phase.modules.length, 0);
                const minutes = path.phases.reduce((sum, phase) => sum + phase.modules.reduce((inner, module) => inner + (module.estimatedMinutes || 0), 0), 0);

                return (
                  <button
                    key={path.id}
                    type="button"
                    onClick={() => navigate(`/path/${path.id}`)}
                    className="group flex min-h-[200px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-950/[0.04]"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#000666] group-hover:bg-[#000666] group-hover:text-white transition-all duration-300">
                          <FileText size={18} />
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                          {path.progress}%
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-800 group-hover:text-[#000666] transition-colors">{path.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-400">{path.goal}</p>
                    </div>
                    <div className="mt-5 space-y-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-50 border border-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#000666] to-indigo-400 transition-all duration-1000" style={{ width: `${Math.max(path.progress, 4)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1.5"><BookOpen size={12} /> {moduleCount}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {(minutes / 60).toFixed(1)}h</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-100 text-[#000666] shadow-sm">
                <FolderKanban size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800">No classrooms yet</h3>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-400">
                Pick a roadmap below or upload a PDF to create your first classroom.
              </p>
              <button
                onClick={() => navigate('/create')}
                className="mt-6 inline-flex items-center gap-2.5 rounded-xl bg-[#000666] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                Create Your First Course <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 bg-white px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">Roadmap Library</p>
                <h2 className="text-2xl font-black leading-tight text-slate-900">Choose a role, skill, or project</h2>
              </div>
              <label className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-400 transition-all focus-within:border-indigo-200 focus-within:bg-white focus-within:shadow-sm sm:w-[300px]">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search roadmaps..."
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                />
              </label>
            </div>
          </div>

          <RoadmapSection
            title="Role Based Roadmaps"
            caption="Use these when the learner wants a destination: a job role, discipline, or professional identity."
            items={filterItems(roleRoadmaps)}
            icon={<Compass size={14} />}
            selectedTitle={selectedRoadmap.category === 'Role Based Roadmap' ? selectedRoadmap.title : undefined}
            onSelect={(item) => selectRoadmap(item, 'Role Based Roadmap')}
          />
          <RoadmapSection
            title="Skill Based Roadmaps"
            caption="Use these when the learner wants to master a specific technology, system, or technical foundation."
            items={filterItems(skillRoadmaps)}
            icon={<BrainCircuit size={14} />}
            selectedTitle={selectedRoadmap.category === 'Skill Based Roadmap' ? selectedRoadmap.title : undefined}
            onSelect={(item) => selectRoadmap(item, 'Skill Based Roadmap')}
          />
          <RoadmapSection
            title="Project Ideas"
            caption="Use these for portfolio-first paths where shipping matters as much as studying."
            items={filterItems(projectIdeas)}
            icon={<Target size={14} />}
            selectedTitle={selectedRoadmap.category === 'Project Ideas' ? selectedRoadmap.title : undefined}
            onSelect={(item) => selectRoadmap(item, 'Project Ideas', `${item} project portfolio`, 'Architectural Build')}
          />
          <RoadmapSection
            title="Best Practices"
            caption="Use these for operational excellence, architecture habits, security, and performance."
            items={filterItems(bestPractices)}
            icon={<ShieldCheck size={14} />}
            selectedTitle={selectedRoadmap.category === 'Best Practices' ? selectedRoadmap.title : undefined}
            onSelect={(item) => selectRoadmap(item, 'Best Practices', `${item} best practices`, 'Deep Dive')}
          />
        </section>

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {[
            { title: 'PDF to Course', body: 'Upload a PDF — Vidhyalaya extracts structure, chapters, and citations into a living classroom.', icon: LibraryBig, accent: 'text-violet-500' },
            { title: 'Roadmap to Course', body: 'Pick any role or skill map. Gemini adapts it to your time, proficiency, and goals.', icon: Sparkles, accent: 'text-amber-500' },
            { title: 'Course to Exam', body: 'Once mastered, switch to exam mode for timed recall, quizzes, and proof of competency.', icon: ArrowRight, accent: 'text-emerald-500' },
          ].map((item) => (
            <div key={item.title} className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-indigo-100 hover:shadow-md shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${item.accent} group-hover:bg-indigo-50 transition-colors`}>
                <item.icon size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800">{item.title}</h3>
              <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
