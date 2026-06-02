import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { ArrowRight, BookOpen, Clock, Plus, CheckCircle2, Zap, LayoutGrid } from 'lucide-react';

type Path = ReturnType<typeof useAppStore>['paths'][0];

/* ─── Path Card ─────────────────────────────────────────────────────────────── */
const PathCard: React.FC<{ path: Path; onOpen: () => void }> = ({ path, onOpen }) => {
  const totalModules    = path.phases.reduce((a, ph) => a + ph.modules.length, 0);
  const completedMods   = path.phases.reduce((a, ph) => a + ph.modules.filter(m => m.isCompleted).length, 0);
  const totalMinutes    = path.phases.reduce((a, ph) => a + ph.modules.reduce((b, m) => b + (m.estimatedMinutes || 0), 0), 0);
  const progress        = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0;
  const isComplete      = progress === 100;

  return (
    <article
      onClick={onOpen}
      className="group flex flex-col cursor-pointer"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(13,13,13,0.08)',
        borderRadius: 10,
        padding: 20,
        transition: 'box-shadow 180ms ease, transform 180ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(13,23,48,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {/* Title */}
      <h3
        className="text-[15px] font-semibold leading-snug mb-2 line-clamp-2"
        style={{ color: '#0d0d0d', letterSpacing: '-0.01em', fontFamily: "'Inter', sans-serif" }}
      >
        {path.title}
      </h3>

      {/* Goal / description */}
      <p
        className="text-[13px] leading-relaxed line-clamp-2 mb-4"
        style={{ color: 'rgba(13,13,13,0.56)', fontFamily: "'Inter', sans-serif" }}
      >
        {path.goal}
      </p>

      {/* Progress bar */}
      <div className="mt-auto">
        <div
          className="w-full rounded-full overflow-hidden mb-3"
          style={{ height: 3, background: 'rgba(13,13,13,0.07)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: isComplete ? '#16a34a' : '#4e5bff',
            }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1 text-[12px]"
              style={{ color: 'rgba(13,13,13,0.48)', fontFamily: "'Inter', sans-serif" }}
            >
              <BookOpen size={11} />
              {completedMods}/{totalModules}
            </span>
            <span
              className="flex items-center gap-1 text-[12px]"
              style={{ color: 'rgba(13,13,13,0.48)', fontFamily: "'Inter', sans-serif" }}
            >
              <Clock size={11} />
              {Math.round(totalMinutes / 60)}h
            </span>
          </div>

          {isComplete ? (
            <span
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: '#16a34a' }}
            >
              <CheckCircle2 size={11} />
              Done
            </span>
          ) : (
            <span
              className="text-[12px] font-semibold"
              style={{ color: 'rgba(13,13,13,0.4)' }}
            >
              {progress}%
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

/* ═══════════════════════════════ COURSES ═══════════════════════════════════ */
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();

  const hasAny = paths.length > 0;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'transparent' }}
    >
      <div className="w-full max-w-[1060px] mx-auto px-6 sm:px-10 pt-10 pb-24">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-10 text-white animate-none">
          <div>
            <p className="app-label mb-2 text-white/50">Cortex · Classrooms</p>
            <h1 className="jawdropping-header-title mb-2">My Learning Paths</h1>
            <p className="jawdropping-header-subtitle max-w-[480px]">
              Paths generated and saved by Cortex. Pick up where you left off or start a new one.
            </p>
          </div>

          <button
            onClick={() => navigate('/create')}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 transition-all"
            style={{
              height: 36, padding: '0 16px', borderRadius: 999,
              background: '#ffffff', color: '#0d0d0d',
              fontSize: 13, fontWeight: 600, border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <Plus size={14} />
            New path
          </button>
        </div>

        {/* ── Sliding White Content Sheet ── */}
        <div 
          className="bg-white rounded-t-[24px] p-8 sm:p-10 -mx-6 sm:-mx-10 border-t border-slate-100 min-h-[60vh] mt-4 animate-none"
          style={{ boxShadow: '0 -8px 32px rgba(13,23,48,0.03)' }}
        >
          {hasAny ? (
            <>
              {/* Stats bar */}
              <div
                className="flex items-center gap-6 mb-8 pb-6"
                style={{ borderBottom: '1px solid rgba(13,13,13,0.08)' }}
              >
                <div>
                  <span
                    className="text-[22px] font-bold"
                    style={{ color: '#0d0d0d', letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}
                  >
                    {paths.length}
                  </span>
                  <span
                    className="text-[13px] ml-1.5"
                    style={{ color: 'rgba(13,13,13,0.5)' }}
                  >
                    {paths.length === 1 ? 'path' : 'paths'}
                  </span>
                </div>
                <div
                  className="w-px self-stretch"
                  style={{ background: 'rgba(13,13,13,0.08)' }}
                />
                <div>
                  <span
                    className="text-[22px] font-bold"
                    style={{ color: '#0d0d0d', letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}
                  >
                    {paths.filter(p => (p.progress || 0) === 100).length}
                  </span>
                  <span
                    className="text-[13px] ml-1.5"
                    style={{ color: 'rgba(13,13,13,0.5)' }}
                  >
                    completed
                  </span>
                </div>
                <div
                  className="w-px self-stretch"
                  style={{ background: 'rgba(13,13,13,0.08)' }}
                />
                <div>
                  <span
                    className="text-[22px] font-bold"
                    style={{ color: '#0d0d0d', letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}
                  >
                    {paths.reduce((a, p) => a + p.phases.reduce((b, ph) => b + ph.modules.filter(m => m.isCompleted).length, 0), 0)}
                  </span>
                  <span
                    className="text-[13px] ml-1.5"
                    style={{ color: 'rgba(13,13,13,0.5)' }}
                  >
                    modules done
                  </span>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paths.map(path => (
                  <PathCard
                    key={path.id}
                    path={path}
                    onOpen={() => navigate(`/path/${path.id}`)}
                  />
                ))}

                {/* Add new card */}
                <article
                  onClick={() => navigate('/create')}
                  className="group flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    background: 'transparent',
                    border: '1px dashed rgba(13,13,13,0.16)',
                    borderRadius: 10,
                    padding: 20,
                    minHeight: 160,
                    transition: 'border-color 180ms ease, background 180ms ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.4)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(78,91,255,0.03)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,13,13,0.16)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Plus
                    size={20}
                    style={{ color: 'rgba(13,13,13,0.28)', marginBottom: 8 }}
                  />
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: 'rgba(13,13,13,0.4)', fontFamily: "'Inter', sans-serif" }}
                  >
                    New path
                  </span>
                </article>
              </div>
            </>
          ) : (
            /* ── Empty state ── */
            <div
              className="flex flex-col items-start py-16 px-8 max-w-md bg-white border border-slate-100 rounded-xl"
              style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(13,13,13,0.04)', color: 'rgba(13,13,13,0.4)' }}
              >
                <LayoutGrid size={18} strokeWidth={1.5} />
              </div>
              <h2
                className="text-[18px] font-semibold mb-2"
                style={{ color: '#0d0d0d', letterSpacing: '-0.015em', fontFamily: "'Inter', sans-serif" }}
              >
                No paths yet
              </h2>
              <p
                className="text-[14px] leading-relaxed mb-6"
                style={{ color: 'rgba(13,13,13,0.56)', fontFamily: "'Inter', sans-serif" }}
              >
                Tell Cortex what you want to learn. It will build a structured path with phases, modules, and resources.
              </p>
              <button
                onClick={() => navigate('/create')}
                className="inline-flex items-center gap-1.5 justify-center transition-all cursor-pointer"
                style={{
                  height: 36, padding: '0 16px', borderRadius: 999,
                  background: '#0d0d0d', color: '#ffffff',
                  fontSize: 13, fontWeight: 600, border: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.84'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                <Zap size={13} fill="currentColor" />
                Start with Cortex
                <ArrowRight size={13} style={{ marginLeft: 2 }} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Courses;
