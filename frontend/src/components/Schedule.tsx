import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Clock, Zap, ArrowRight, Sparkles, Circle, MoreHorizontal,
  LayoutGrid, List, Brain, Target, Shield, Trophy, Trash2, AlertTriangle, X
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
    <div className={`h-full rounded-2xl overflow-hidden border-2 transition-all duration-300 relative ${
      done
        ? 'bg-slate-50/80 border-slate-200/50 backdrop-blur-sm'
        : 'bg-white border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 hover:border-indigo-400'
    }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${done ? 'bg-emerald-400' : 'bg-indigo-600'}`} />
      
      <div className="p-3 h-full flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-400' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
              {fmtTime(start)}
            </span>
          </div>
          {done && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
        </div>

        <h4 className={`text-[12px] font-black leading-tight tracking-tight mb-2 transition-colors overflow-hidden ${
          done ? 'line-through text-slate-300' : 'text-slate-900 group-hover/card:text-indigo-600'
        }`} style={{ display: '-webkit-box', WebkitLineClamp: variant === 'list' ? 1 : 2, WebkitBoxOrientation: 'vertical' }}>
          {s.title}
        </h4>

        <div className="mt-auto flex items-center justify-between gap-2 opacity-60 group-hover/card:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{Math.round(durMinutes)}m</span>
          </div>
          {variant === 'list' && (
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-slate-400">
                   <Shield size={10} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Secure</span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{done ? 'Redeem' : 'Synchronize'}</span>
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        onClick={onToggle}
        className="w-full h-24 cursor-pointer mb-4 group/card"
      >
        {content}
      </motion.div>
    );
  }

  const ps = s as PositionedSession;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onToggle}
      className={`absolute cursor-pointer select-none group/card will-change-transform ${ps.isOverflow ? 'z-20' : 'z-10'}`}
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

  const weekDone = weekSessions.filter(s => s.isCompleted).length;
  const timeLine = useMemo(() => {
    const h = now.getHours(), m = now.getMinutes();
    return (h >= 6 && h < 22) ? (h - 6) * ROW_H + (m / 60) * ROW_H : null;
  }, [now]);

  const handleClearCalendar = () => {
    clearAllSessions();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#fafafa] text-slate-900 overflow-hidden relative">
      
      {/* ── Cinematic Atmosphere ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-violet-500/5 blur-[100px] rounded-full" />
      </div>

      {/* ── Confirmation Overlay (Second Call) ── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-3">Clear Entire Archive?</h2>
              <p className="text-slate-500 text-[14px] leading-relaxed mb-8">
                This action will <span className="font-bold text-rose-600">permanently delete all scheduled sessions</span> across every learning path you own. Your roadmaps will remain intact, but your study calendar will be completely wiped.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleClearCalendar}
                  className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95"
                >
                  Confirm Destruction
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Return to Safety
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── High-Fidelity Header ── */}
      <header className="relative z-50 shrink-0 h-24 px-10 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-12">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px w-6 bg-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-indigo-600">Archival Timeline</span>
            </div>
            <h1 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none italic uppercase">
              {fmtMonth(anchor)}
            </h1>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
            <button onClick={() => shiftWeek(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all">
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <span className="px-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700">
              {fmtShort(wStart)} — {fmtShort(days[6])}
            </span>
            <button onClick={() => shiftWeek(1)} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all">
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowClearConfirm(true)}
               className="p-3 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
               title="Clean Calendar"
             >
                <Trash2 size={20} />
             </button>
             
             <div className="h-8 w-px bg-slate-200" />
             
             <div className="flex items-center bg-slate-100 rounded-full p-1.5 border border-slate-200 shadow-inner relative h-14">
                <motion.div
                  layoutId="view-toggle"
                  className="absolute h-11 w-11 bg-white rounded-full shadow-lg border border-slate-100 z-0"
                  initial={false}
                  animate={{ x: viewMode === 'grid' ? 0 : 44 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button onClick={() => setViewMode('grid')} className={`relative z-10 w-11 h-11 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <LayoutGrid size={20} />
                </button>
                <button onClick={() => setViewMode('list')} className={`relative z-10 w-11 h-11 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <List size={20} />
                </button>
             </div>
          </div>

          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`flex items-center gap-3 h-11 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isZenMode ? 'bg-slate-900 text-white shadow-2xl' : 'bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm'
            }`}
          >
            <Sparkles size={14} className={isZenMode ? 'animate-pulse' : ''} /> {isZenMode ? 'Exit Zen' : 'Zen Mode'}
          </button>
        </div>
      </header>

      {/* ── Main Canvas ── */}
      <main className="relative flex-1 overflow-auto no-scrollbar">
        {allSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-10">
             <div className="relative">
                <div className="w-24 h-24 rounded-[32px] bg-white border border-slate-200 shadow-2xl flex items-center justify-center">
                   <Calendar size={40} className="text-slate-200" />
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-4 border-white">
                   <CheckCircle2 size={16} className="text-white" />
                </div>
             </div>
             <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Archive Purged</h2>
                <p className="text-slate-400 max-w-xs mx-auto">The timeline has been cleared. You are now free to redefine your academic path.</p>
             </div>
             <button 
               onClick={() => navigate('/create')}
               className="flex items-center gap-8 pl-10 pr-6 py-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-indigo-600 transition-all group"
             >
                <span className="text-[12px] font-black uppercase tracking-[0.4em]">Begin Sync</span>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                   <ArrowRight size={20} />
                </div>
             </button>
          </div>
        ) : (
          <div className="min-w-[1200px] flex flex-col h-full">
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  <div className="sticky top-0 z-50 flex border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                    <div className="w-20 shrink-0 border-r border-slate-200" />
                    {days.map(day => (
                      <div key={day.toISOString()} className={`flex-1 py-6 flex flex-col items-center border-r border-slate-200 last:border-r-0 ${sameDay(day, now) ? 'bg-indigo-500/[0.04]' : ''}`}>
                        <span className={`text-[11px] font-black uppercase tracking-[0.4em] mb-2 ${sameDay(day, now) ? 'text-indigo-600' : 'text-slate-400'}`}>{fmtWeekday(day)}</span>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[20px] font-black transition-all ${sameDay(day, now) ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-700'}`}>{day.getDate()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex relative flex-1">
                    <div className="sticky left-0 z-40 w-20 shrink-0 bg-[#fafafa]/80 backdrop-blur-sm border-r border-slate-200">
                      {HOURS.map(h => <div key={h} className="border-b border-slate-100 flex flex-col items-center justify-start pt-4" style={{ height: ROW_H }}><span className="text-[12px] font-black text-slate-300 tracking-tighter">{h > 12 ? h-12 : h} <span className="text-[8px] uppercase">{h>=12?'PM':'AM'}</span></span></div>)}
                    </div>
                    <div className="flex-1 flex relative">
                      {timeLine !== null && days.some(d => sameDay(d, now)) && <div className="absolute inset-x-0 z-30 pointer-events-none flex items-center" style={{ top: timeLine }}><div className="w-4 h-4 rounded-full bg-indigo-600 shadow-2xl shadow-indigo-500 ring-4 ring-indigo-500/20 -ml-2" /><div className="h-px flex-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-30" /></div>}
                      {days.map(day => (
                        <div key={day.toISOString()} className={`flex-1 relative border-r border-slate-200 last:border-r-0 ${sameDay(day, now) ? 'bg-indigo-500/[0.01]' : ''}`}>
                          {HOURS.map(h => <div key={h} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" style={{ height: ROW_H }} />)}
                          <AnimatePresence>{sessionsByDay.get(day.toDateString())?.map(s => <SessionCard key={s.id} s={s} variant="grid" onToggle={() => updateSessionStatus(s.pathId, s.id, !s.isCompleted)} />)}</AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="list-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-5xl mx-auto w-full py-20 px-10 space-y-20">
                  {days.map(day => {
                    const daySessions = allSessions.filter(s => sameDay(new Date(s.startTime), day)).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    if (daySessions.length === 0) return null;
                    return (
                      <div key={day.toISOString()} className="space-y-8">
                        <div className="flex items-center gap-6">
                           <div className="h-20 w-20 rounded-3xl bg-white border-2 border-slate-100 shadow-xl flex flex-col items-center justify-center"><span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{fmtWeekday(day)}</span><span className="text-2xl font-black text-slate-900">{day.getDate()}</span></div>
                           <div className="space-y-1"><h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{fmtMonth(day)}</h3><p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">{fmtFull(day)}</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><AnimatePresence mode="popLayout">{daySessions.map(s => <SessionCard key={s.id} s={s} variant="list" onToggle={() => updateSessionStatus(s.pathId, s.id, !s.isCompleted)} />)}</AnimatePresence></div>
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
        <footer className="relative z-50 shrink-0 h-14 px-10 flex items-center justify-between border-t border-slate-200 bg-white">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sync Pipeline Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Authentication Confirmed</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex -space-x-2">{[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /></div>)}</div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Vidhyalaya Chronos Engine v4.0</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Schedule;
