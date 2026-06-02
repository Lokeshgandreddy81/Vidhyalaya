import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Clock, ArrowRight, Sparkles, Trash2, AlertTriangle,
  LayoutGrid, List, Shield, HelpCircle
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';
import type { ScheduledSession } from '../types';

// ─── Date Helpers ──────────────────────────────────────────────────────────────
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const weekStart = (d: Date): Date => {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
};

const fmtWeekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const fmtShort   = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtMonth   = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const fmtFull    = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtTime    = (d: Date) => {
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM → 9 PM
const ROW_H = 100;

// ─── Positioned session type ───────────────────────────────────────────────────
type PositionedSession = ScheduledSession & {
  top: number;
  height: number;
  left: number; 
  width: number;
  dur: number;
  isOverflow?: boolean;
};

// ─── Layout engine: overlap groups with Max-3 Column constraint ───────────────
function positionSessions(sessions: ScheduledSession[]): PositionedSession[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const groups: ScheduledSession[][] = [];
  sorted.forEach(s => {
    const sS = new Date(s.startTime).getTime();
    const sE = new Date(s.endTime).getTime();
    let placed = false;
    for (const g of groups) {
      if (g.some(p => sS < new Date(p.endTime).getTime() && sE > new Date(p.startTime).getTime())) {
        g.push(s);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([s]);
  });

  return groups.flatMap(g => {
    const maxCols = 3;
    const count = g.length;
    const cols = Math.min(count, maxCols);
    
    return g.map((s, i) => {
      const start = new Date(s.startTime);
      const end   = new Date(s.endTime);
      const dur   = (end.getTime() - start.getTime()) / 3_600_000;
      const colIndex = i % maxCols;
      const rowOffset = Math.floor(i / maxCols) * 12;
      
      return {
        ...s,
        top: (start.getHours() - 6) * ROW_H + (start.getMinutes() / 60) * ROW_H + rowOffset,
        height: Math.max(dur * ROW_H, 50),
        left: (colIndex / cols) * 100,
        width: 100 / cols - 1,
        dur,
        isOverflow: i >= maxCols
      };
    });
  });
}

// ─── Session Card ─────────────────────────────────────────────────────────────
const SessionCard: React.FC<{
  s: PositionedSession | ScheduledSession;
  onToggle: () => void;
  variant: 'grid' | 'list';
}> = ({ s, onToggle, variant }) => {
  const done  = s.isCompleted;
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const durMinutes = (end.getTime() - start.getTime()) / 60000;

  const content = (
    <div 
      className="h-full border transition-all duration-200 relative group/card"
      style={{
        background: done ? '#f7f8fa' : '#ffffff',
        borderColor: done ? 'rgba(13,13,13,0.06)' : 'rgba(13,13,13,0.08)',
        borderRadius: 10,
        boxShadow: done ? 'none' : '0 2px 8px rgba(13,23,48,0.03)',
      }}
      onMouseEnter={e => {
        if (!done) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px rgba(13,23,48,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.2)';
        }
      }}
      onMouseLeave={e => {
        if (!done) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(13,23,48,0.03)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,13,13,0.08)';
        }
      }}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px]" 
        style={{ background: done ? '#16a34a' : '#4e5bff' }} 
      />
      
      <div className="p-3.5 h-full flex flex-col min-w-0 justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div 
                className="w-1.5 h-1.5 rounded-full shrink-0" 
                style={{ background: done ? '#16a34a' : '#4e5bff' }} 
              />
              <span className="app-label text-[10px] tracking-wide" style={{ color: 'rgba(13,13,13,0.48)' }}>
                {fmtTime(start)}
              </span>
            </div>
            {done && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
          </div>

          <h4 
            className="text-[13px] font-semibold leading-snug transition-colors line-clamp-2"
            style={{ 
              color: done ? 'rgba(13,13,13,0.36)' : '#0d0d0d', 
              textDecoration: done ? 'line-through' : 'none',
              fontFamily: "'Inter', sans-serif" 
            }}
          >
            {s.title}
          </h4>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-50 mt-2">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-slate-400" />
            <span className="text-[11px] font-medium" style={{ color: 'rgba(13,13,13,0.4)' }}>{Math.round(durMinutes)} mins</span>
          </div>
          {variant === 'list' && (
             <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold" style={{ color: done ? '#16a34a' : '#4e5bff' }}>
                  {done ? 'Completed' : 'Study Now'}
                </span>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={onToggle}
        className="w-full h-[110px] cursor-pointer mb-4 shrink-0"
      >
        {content}
      </motion.div>
    );
  }

  const ps = s as PositionedSession;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onToggle}
      className={`absolute cursor-pointer select-none ${ps.isOverflow ? 'z-20' : 'z-10'}`}
      style={{
        top: ps.top + 4,
        height: ps.height - 8,
        left: `${ps.left}%`,
        width: `${ps.width}%`,
      }}
    >
      {content}
    </motion.div>
  );
};

// ─── Main Schedule Component ───────────────────────────────────────────────────
const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const { paths, updateSessionStatus, clearAllSessions } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();

  const [anchor, setAnchor]   = useState(() => new Date());
  const [now, setNow]         = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const wStart = useMemo(() => weekStart(anchor), [anchor]);
  const days   = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(wStart);
      d.setDate(wStart.getDate() + i);
      return d;
    }),
  [wStart]);

  const shiftWeek = (dir: 1 | -1) => {
    setAnchor(a => {
      const r = new Date(a);
      r.setDate(r.getDate() + dir * 7);
      return r;
    });
  };

  const allSessions = useMemo(() => paths.flatMap(p => p.sessions ?? []), [paths]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, PositionedSession[]>();
    days.forEach(d => {
      const key  = d.toDateString();
      const mine = allSessions.filter(s => sameDay(new Date(s.startTime), d));
      map.set(key, positionSessions(mine));
    });
    return map;
  }, [days, allSessions]);

  const weekSessions = useMemo(() =>
    allSessions.filter(s => {
      const t = new Date(s.startTime).getTime();
      return t >= wStart.getTime() && t < wStart.getTime() + 7 * 86_400_000;
    }),
  [allSessions, wStart]);

  const timeLine = useMemo(() => {
    const h = now.getHours(), m = now.getMinutes();
    return (h >= 6 && h < 22) ? (h - 6) * ROW_H + (m / 60) * ROW_H : null;
  }, [now]);

  const handleClearCalendar = () => {
    clearAllSessions();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-transparent text-[#0d0d0d] overflow-hidden relative">
      
      {/* ── Confirmation Overlay ── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="bg-white rounded-xl p-8 max-w-sm w-full shadow-xl border"
              style={{ borderColor: 'rgba(13,13,13,0.08)' }}
            >
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-5 bg-rose-50"
                style={{ border: '1px solid rgba(220,38,38,0.1)' }}
              >
                <AlertTriangle size={24} className="text-rose-500" />
              </div>
              
              <h2 className="app-h2 mb-2" style={{ color: '#0d0d0d' }}>Clear Calendar</h2>
              
              <p 
                className="text-[13px] leading-relaxed mb-6"
                style={{ color: 'rgba(13,13,13,0.56)' }}
              >
                This will <strong className="text-rose-600 font-semibold">permanently delete all scheduled sessions</strong>. Your paths will remain intact, but the calendar timeline will be completely cleared.
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleClearCalendar}
                  className="w-full h-10 rounded-full font-semibold text-[13px] text-white flex items-center justify-center bg-rose-600 hover:bg-rose-700 transition-all shadow-sm"
                >
                  Clear All Sessions
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="app-btn-ghost w-full h-10 text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <header className="relative z-50 shrink-0 h-20 px-8 flex items-center justify-between bg-transparent text-white animate-none">
        <div className="flex items-center gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="app-label text-white/50">Archival Timeline</span>
            </div>
            <h1 className="jawdropping-header-title text-[22px] lg:text-[24px]">
              {fmtMonth(anchor)}
            </h1>
          </div>

          {/* Week Nav controls */}
          <div className="flex items-center rounded-full p-0.5 jawdropping-glass-container">
            <button 
              onClick={() => shiftWeek(-1)} 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-4 text-[11px] font-semibold uppercase tracking-wider text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>
              {fmtShort(wStart)} — {fmtShort(days[6])}
            </span>
            <button 
              onClick={() => shiftWeek(1)} 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setShowClearConfirm(true)}
               className="w-9 h-9 rounded-full text-white/50 hover:text-rose-400 hover:bg-white/5 flex items-center justify-center transition-all"
               title="Clear All Sessions"
             >
                <Trash2 size={16} />
             </button>
             
             <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
             
             <div className="flex rounded-full p-0.5 jawdropping-glass-container">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className="px-3 py-1 rounded-full flex items-center justify-center gap-1 text-[11px] font-semibold transition-all"
                  style={{
                    background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                    color: viewMode === 'grid' ? '#0f0b6b' : 'rgba(255,255,255,0.6)',
                    boxShadow: viewMode === 'grid' ? '0 4px 12px rgba(78,91,255,0.18)' : 'none',
                  }}
                >
                  <LayoutGrid size={12} />
                  Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className="px-3 py-1 rounded-full flex items-center justify-center gap-1 text-[11px] font-semibold transition-all"
                  style={{
                    background: viewMode === 'list' ? '#ffffff' : 'transparent',
                    color: viewMode === 'list' ? '#0f0b6b' : 'rgba(255,255,255,0.6)',
                    boxShadow: viewMode === 'list' ? '0 4px 12px rgba(78,91,255,0.18)' : 'none',
                  }}
                >
                  <List size={12} />
                  List
                </button>
             </div>
          </div>

          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className="jawdropping-btn-glass flex items-center gap-1.5"
            style={{ height: 36 }}
          >
            <Sparkles size={12} /> 
            <span>{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
          </button>
        </div>
      </header>

      {/* ── Sliding White Content Sheet ── */}
      <main 
        className="relative flex-1 overflow-auto no-scrollbar bg-white rounded-t-[24px] border-t border-slate-100 animate-none"
        style={{ boxShadow: '0 -8px 32px rgba(13,23,48,0.03)' }}
      >
        {allSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 p-6">
             <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-white border flex items-center justify-center shadow-sm" style={{ borderColor: 'rgba(13,13,13,0.08)' }}>
                   <Calendar size={28} className="text-slate-300" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md border-2 border-white">
                   <CheckCircle2 size={12} className="text-white" />
                </div>
             </div>
             <div className="text-center space-y-2">
                <h2 className="app-h2">Timeline Empty</h2>
                <p className="text-[13px] max-w-xs mx-auto" style={{ color: 'rgba(13,13,13,0.48)' }}>
                  All scheduled timeline events completed or cleared. Time to plan the next module block.
                </p>
             </div>
             <button 
               onClick={() => navigate('/create')}
               className="app-btn-accent h-10 px-5"
             >
                <span>Synchronize Path</span>
                <ArrowRight size={14} />
             </button>
          </div>
        ) : (
          <div className="min-w-[1000px] flex flex-col h-full">
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  {/* Grid weekdays header */}
                  <div className="sticky top-0 z-40 flex border-b bg-white border-slate-200/50">
                    <div className="w-16 shrink-0 border-r border-slate-200/50" />
                    {days.map(day => (
                      <div 
                        key={day.toISOString()} 
                        className="flex-1 py-4 flex flex-col items-center border-r last:border-r-0 border-slate-200/50"
                        style={{ background: sameDay(day, now) ? 'rgba(78,91,255,0.02)' : 'transparent' }}
                      >
                        <span className="app-label text-[10px] mb-1" style={{ color: sameDay(day, now) ? '#4e5bff' : 'rgba(13,13,13,0.48)' }}>{fmtWeekday(day)}</span>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-semibold"
                          style={{
                            background: sameDay(day, now) ? '#4e5bff' : 'transparent',
                            color: sameDay(day, now) ? '#ffffff' : '#0d0d0d',
                          }}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grid Hours display */}
                  <div className="flex relative flex-1">
                    <div className="sticky left-0 z-30 w-16 shrink-0 bg-white border-r border-slate-200/50">
                      {HOURS.map(h => (
                        <div 
                          key={h} 
                          className="border-b border-slate-100 flex flex-col items-center justify-start pt-3" 
                          style={{ height: ROW_H }}
                        >
                          <span className="text-[12px] font-semibold tracking-tighter" style={{ color: 'rgba(13,13,13,0.28)' }}>
                            {h > 12 ? h-12 : h} <span className="text-[9px] font-normal uppercase">{h>=12?'PM':'AM'}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Columns grids */}
                    <div className="flex-1 flex relative">
                      {timeLine !== null && days.some(d => sameDay(d, now)) && (
                        <div className="absolute inset-x-0 z-30 pointer-events-none flex items-center" style={{ top: timeLine }}>
                          <div className="w-3 h-3 rounded-full bg-[#4e5bff] shadow ring-4 ring-indigo-500/10 -ml-1.5" />
                          <div className="h-px flex-1 bg-gradient-to-r from-[#4e5bff] to-transparent opacity-20" />
                        </div>
                      )}
                      
                      {days.map(day => (
                        <div 
                          key={day.toISOString()} 
                          className="flex-1 relative border-r border-slate-200/50 last:border-r-0"
                          style={{ background: sameDay(day, now) ? 'rgba(78,91,255,0.005)' : 'transparent' }}
                        >
                          {HOURS.map(h => <div key={h} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors" style={{ height: ROW_H }} />)}
                          <AnimatePresence>
                            {sessionsByDay.get(day.toDateString())?.map(s => (
                              <SessionCard 
                                key={s.id} 
                                s={s} 
                                variant="grid" 
                                onToggle={() => updateSessionStatus(s.pathId, s.id, !s.isCompleted)} 
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="list-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-[720px] mx-auto w-full py-16 px-6">
                  {days.map(day => {
                    const daySessions = allSessions.filter(s => sameDay(new Date(s.startTime), day)).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    if (daySessions.length === 0) return null;
                    return (
                      <div key={day.toISOString()} className="space-y-6 mb-12">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-white border shadow-sm flex flex-col items-center justify-center" style={{ borderColor: 'rgba(13,13,13,0.08)' }}>
                              <span className="text-[10px] font-semibold text-[#4e5bff] uppercase tracking-wider">{fmtWeekday(day)}</span>
                              <span className="text-[16px] font-bold text-slate-800 leading-none mt-0.5">{day.getDate()}</span>
                           </div>
                           <div className="space-y-0.5">
                              <h3 className="text-[15px] font-semibold text-slate-900">{fmtMonth(day)}</h3>
                              <p className="app-label text-[10px]">{fmtFull(day)}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AnimatePresence mode="popLayout">
                            {daySessions.map(s => (
                              <SessionCard 
                                key={s.id} 
                                s={s} 
                                variant="list" 
                                onToggle={() => updateSessionStatus(s.pathId, s.id, !s.isCompleted)} 
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── Status Footer ── */}
      {!isZenMode && (
        <footer className="relative z-40 shrink-0 h-12 px-8 flex items-center justify-between border-t bg-white border-slate-200/50">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4e5bff]" />
              <span className="text-[11px] font-medium" style={{ color: 'rgba(13,13,13,0.48)' }}>Sync Pipeline Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium" style={{ color: 'rgba(13,13,13,0.48)' }}>Timeline Calibrated</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="app-label text-[10px]" style={{ color: 'rgba(13,13,13,0.36)' }}>Cortex Chronos Engine v4.0</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Schedule;
