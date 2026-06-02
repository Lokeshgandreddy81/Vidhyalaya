import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Bookmark, Sparkles, ArrowRight } from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────────────────────────── */
const roleRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'Frontend' }, { label: 'Backend' }, { label: 'Full Stack' },
  { label: 'DevOps' }, { label: 'DevSecOps' }, { label: 'Data Analyst' },
  { label: 'AI Engineer' }, { label: 'AI and Data Scientist' }, { label: 'Data Engineer' },
  { label: 'Android' }, { label: 'Machine Learning' }, { label: 'PostgreSQL' },
  { label: 'iOS' }, { label: 'Blockchain' }, { label: 'QA' },
  { label: 'Software Architect' }, { label: 'Cyber Security' }, { label: 'UX Design' },
  { label: 'Technical Writer' }, { label: 'Game Developer' }, { label: 'Server Side Game Developer' },
  { label: 'MLOps' }, { label: 'Product Manager' }, { label: 'Engineering Manager' },
  { label: 'Developer Relations' }, { label: 'BI Analyst' }, { label: 'Network Engineer', isNew: true },
  { label: 'Cloud Architect', isNew: true }, { label: 'Site Reliability Engineer' },
  { label: 'Platform Engineer', isNew: true }, { label: 'Staff Engineer', isNew: true },
  { label: 'Solutions Architect' }, { label: 'Embedded Systems Engineer' },
  { label: 'Security Engineer' }, { label: 'Penetration Tester' },
  { label: 'AR / VR Developer', isNew: true }, { label: 'Computer Vision Engineer', isNew: true },
  { label: 'NLP Engineer', isNew: true }, { label: 'Web3 Developer', isNew: true },
  { label: 'Open Source Maintainer', isNew: true },
];

const skillRoadmaps: { label: string; isNew?: boolean }[] = [
  { label: 'SQL' }, { label: 'Computer Science' }, { label: 'React' },
  { label: 'Vue' }, { label: 'Angular' }, { label: 'JavaScript' },
  { label: 'TypeScript' }, { label: 'Node.js' }, { label: 'Python' },
  { label: 'System Design' }, { label: 'Java' }, { label: 'ASP.NET Core' },
  { label: 'API Design' }, { label: 'Spring Boot' }, { label: 'Flutter' },
  { label: 'C++' }, { label: 'Rust' }, { label: 'Go' },
  { label: 'GraphQL' }, { label: 'React Native' }, { label: 'Design System' },
  { label: 'Prompt Engineering' }, { label: 'MongoDB' }, { label: 'Linux' },
  { label: 'Kubernetes' }, { label: 'Docker' }, { label: 'AWS' },
  { label: 'Terraform' }, { label: 'Data Structures & Algorithms' }, { label: 'Redis' },
  { label: 'Git and GitHub' }, { label: 'Next.js' }, { label: 'HTML' },
  { label: 'CSS' }, { label: 'Shell / Bash' },
  { label: 'AI Agents', isNew: true }, { label: 'AI Red Teaming', isNew: true },
];

const bestPractices: { label: string; isNew?: boolean }[] = [
  { label: 'AWS' }, { label: 'API Security' }, { label: 'Web Application Security' },
  { label: 'Zero Trust Architecture' }, { label: 'Cloud Security' },
  { label: 'Backend Performance' }, { label: 'Frontend Performance' },
  { label: 'Database Optimization' }, { label: 'Caching Strategies' }, { label: 'Load Testing' },
  { label: 'Code Review' }, { label: 'Testing Strategy' },
  { label: 'Technical Debt Management' }, { label: 'Documentation Standards' },
];

const SECTIONS = [
  { id: 'role',  label: 'Role-based Roadmaps',  data: roleRoadmaps,  track: 'Role Roadmap'   },
  { id: 'skill', label: 'Skill Roadmaps',        data: skillRoadmaps, track: 'Skill Roadmap'  },
  { id: 'best',  label: 'Best Practices',         data: bestPractices, track: 'Best Practices' },
] as const;

/* ─── Skeleton Card ─────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div
    className="h-11 rounded-xl animate-pulse"
    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
  />
);

/* ─── Roadmap Card ──────────────────────────────────────────────────────────── */
const RoadmapCard: React.FC<{
  label: string;
  isNew?: boolean;
  isSelected: boolean;
  multiMode: boolean;
  bookmarked: boolean;
  onClick: () => void;
  onToggle: () => void;
  onBookmark: (e: React.MouseEvent) => void;
}> = ({ label, isNew, isSelected, multiMode, bookmarked, onClick, onToggle, onBookmark }) => {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={multiMode ? onToggle : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="group relative flex items-center justify-between text-left w-full rounded-xl transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4e5bff]/20"
      style={{
        padding: '11px 14px',
        background: isSelected ? 'rgba(78, 91, 255, 0.06)' : hov ? '#fafbfc' : '#ffffff',
        border: `1px solid ${
          isSelected ? 'rgba(78, 91, 255, 0.28)' : hov ? '#cbd5e1' : '#e2e8f0'
        }`,
        boxShadow: isSelected ? '0 0 0 3px rgba(78, 91, 255, 0.08)' : hov ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <span
        className="text-[13px] font-medium leading-snug"
        style={{
          color: isSelected ? '#4e5bff' : hov ? '#0d0d0d' : '#374151',
          letterSpacing: '-0.003em',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {isNew && !multiMode && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
            color: '#4e5bff', background: 'rgba(78, 91, 255, 0.08)',
            border: '1px solid rgba(78, 91, 255, 0.18)', borderRadius: 4, padding: '2px 6px',
          }}>New</span>
        )}

        {multiMode ? (
          <div style={{
            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
            background: isSelected ? '#4e5bff' : 'transparent',
            border: `1.5px solid ${isSelected ? '#4e5bff' : '#d1d5db'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ) : (
          <button
            onClick={onBookmark}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded"
            style={{ color: bookmarked ? '#4e5bff' : '#9ca3af' }}
          >
            <Bookmark size={12} fill={bookmarked ? '#4e5bff' : 'none'} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </button>
  );
};

/* ─── Custom Path Modal ─────────────────────────────────────────────────────── */
const CustomModal: React.FC<{
  open: boolean; onClose: () => void; onSubmit: (v: string) => void;
}> = ({ open, onClose, onSubmit }) => {
  const [value, setValue] = useState('');
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            className="relative w-full max-w-sm overflow-hidden bg-white"
            style={{
              border: '1px solid rgba(13,13,13,0.08)',
              borderRadius: 10,
              padding: '24px',
              boxShadow: '0 20px 48px rgba(13,23,48,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
            >
              <X size={14} />
            </button>
            <h3 className="app-h3 mb-1" style={{ color: '#0d0d0d' }}>
              Create a custom path
            </h3>
            <p className="text-[13px] mb-4 leading-relaxed text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
              Describe your learning goal. Cortex will design a structured path immediately.
            </p>
            <input
              autoFocus value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value.trim()); setValue(''); } }}
              placeholder="e.g. Distributed Systems Engineer..."
              className="w-full h-10 rounded-lg px-3 text-[13px] font-medium outline-none transition-all"
              style={{
                background: '#f7f8fa',
                border: '1px solid rgba(13,13,13,0.08)',
                color: '#0d0d0d',
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#4e5bff'; e.currentTarget.style.background = '#fff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(13,13,13,0.08)'; e.currentTarget.style.background = '#f7f8fa'; }}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="app-btn-ghost h-9 px-4 text-[12px]"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(''); } }}
                disabled={!value.trim()}
                className="app-btn-accent h-9 px-4 text-[12px]"
              >
                Build path
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ═══════════════════════════════ DASHBOARD ═════════════════════════════════ */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 220);
    return () => clearTimeout(t);
  }, []);

  const toggleItem = useCallback((item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);

  const handleMultiBuild = () => {
    if (!selected.size) return;
    const items = Array.from(selected);
    navigate(`/explore?${new URLSearchParams({
      goal: items.length === 1 ? items[0] : `Hybrid Path: ${items.join(' + ')}`,
      track: 'Hybrid Path',
    })}`);
  };

  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim();
    return SECTIONS.map(sec => ({
      ...sec,
      items: q ? sec.data.filter(r => r.label.toLowerCase().includes(q)) : sec.data,
    })).filter(sec => sec.items.length > 0);
  }, [query]);

  const hasAny = filteredSections.length > 0;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto antialiased"
      style={{ background: 'transparent' }}
    >
      <div className="w-full max-w-[1060px] mx-auto px-6 sm:px-10 pt-10 pb-24">

        {/* ── Page Header ── */}
        <div className="mb-10 text-white animate-none">
          <p className="section-label mb-2 text-white/50">Cortex · Learning Engine</p>
          <h1 className="jawdropping-header-title mb-3">Developer Roadmaps</h1>
          <p className="jawdropping-header-subtitle max-w-[560px]">
            Community-driven roadmaps, guides, and educational content to help developers
            navigate their learning journey.
          </p>
        </div>

        {/* ── Search + Controls ── */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center gap-3 flex-1 rounded-xl jawdropping-search-bar" style={{ padding: '10px 16px' }}>
            <Search size={15} strokeWidth={2.2} style={{ color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search roadmaps, skills, best practices..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-white placeholder-light-translucent"
              style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => { setMultiMode(v => !v); if (multiMode) setSelected(new Set()); }}
            className={`jawdropping-btn-glass flex items-center gap-2 ${multiMode ? 'jawdropping-btn-glass-active' : ''}`}
          >
            <Sparkles size={12} />
            {multiMode ? 'Cancel selection' : 'Hybrid select'}
          </button>
        </div>

        {/* ── Sliding White Content Sheet ── */}
        <div 
          className="bg-white rounded-t-[24px] p-8 sm:p-10 -mx-6 sm:-mx-10 border-t border-slate-100 min-h-[60vh] animate-none"
          style={{ boxShadow: '0 -8px 32px rgba(13,23,48,0.03)' }}
        >
          {hasAny ? (
            <div className="space-y-12">
              {filteredSections.map((sec, si) => (
                <motion.div
                  key={sec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: si * 0.04, ease: 'easeOut' }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="section-label whitespace-nowrap">
                      {sec.label}
                      <span
                        className="ml-2.5 font-mono normal-case"
                        style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', fontWeight: 500, letterSpacing: 0 }}
                      >
                        {sec.items.length}
                      </span>
                    </h2>
                    <div className="flex-1" style={{ height: 1, background: '#e2e8f0' }} />
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {isLoading
                      ? Array.from({ length: Math.min(sec.items.length, 12) }).map((_, i) => <SkeletonCard key={i} />)
                      : <>
                          {sec.items.map(item => (
                            <RoadmapCard
                              key={item.label}
                              label={item.label}
                              isNew={item.isNew}
                              isSelected={selected.has(item.label)}
                              multiMode={multiMode}
                              bookmarked={bookmarks.has(item.label)}
                              onClick={() => navigate(`/explore?${new URLSearchParams({ goal: item.label, track: sec.track })}`)}
                              onToggle={() => toggleItem(item.label)}
                              onBookmark={e => toggleBookmark(item.label, e)}
                            />
                          ))}

                          {/* Custom path card — only at end of Role section */}
                          {!multiMode && !query && sec.id === 'role' && (
                            <button
                              onClick={() => setCustomOpen(true)}
                              className="group flex items-center gap-3 w-full rounded-xl transition-all duration-150 cursor-pointer focus:outline-none"
                              style={{
                                padding: '11px 14px',
                                background: 'rgba(78, 91, 255, 0.04)',
                                border: '1px dashed rgba(78, 91, 255, 0.25)',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.08)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.45)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(78, 91, 255, 0.04)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78, 91, 255, 0.25)';
                              }}
                            >
                              <Plus size={13} strokeWidth={2.5} style={{ color: '#4e5bff', flexShrink: 0 }} />
                              <span className="text-[13px] font-medium" style={{ color: '#4e5bff', fontFamily: "'Inter', sans-serif" }}>
                                Create custom path
                              </span>
                            </button>
                          )}
                        </>
                    }
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="flex flex-col items-center py-24 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(78, 91, 255, 0.08)', border: '1px solid rgba(78, 91, 255, 0.16)' }}
              >
                <Search size={20} style={{ color: '#4e5bff' }} />
              </div>
              <p className="text-[16px] font-semibold mb-1.5" style={{ color: '#0d0d0d', fontFamily: "'Inter', sans-serif" }}>
                No matches for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[13px] max-w-xs mb-6" style={{ color: 'rgba(13,13,13,0.5)' }}>
                Cortex can synthesise a custom roadmap for exactly this concept.
              </p>
              <button
                onClick={() => setCustomOpen(true)}
                className="app-btn-accent h-10 px-5 text-[13px]"
              >
                <Sparkles size={13} /> Build custom path
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating multi-select bar ── */}
      <AnimatePresence>
        {multiMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed bottom-8 left-1/2 z-[100]"
          >
            <div
              className="flex items-center gap-4 rounded-2xl"
              style={{
                padding: '11px 18px',
                background: '#0d0d0d',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-lg text-[12px] font-bold"
                  style={{ background: 'rgba(78,91,255,0.3)', border: '1px solid rgba(78,91,255,0.4)', color: '#fff' }}
                >
                  {selected.size}
                </div>
                <p
                  className="text-[13px] font-medium max-w-[220px] truncate"
                  style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', sans-serif" }}
                >
                  {Array.from(selected).join(', ')}
                </p>
              </div>

              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.12)' }} />

              <button onClick={() => setSelected(new Set())} className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors">
                <X size={13} />
              </button>

              <button
                onClick={handleMultiBuild}
                className="app-btn-accent h-9 px-4 text-[13px]"
              >
                <span>Build hybrid path</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CustomModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSubmit={v => { setCustomOpen(false); navigate(`/explore?${new URLSearchParams({ goal: v, track: 'Custom Path' })}`); }}
      />
    </div>
  );
};

export default Dashboard;
