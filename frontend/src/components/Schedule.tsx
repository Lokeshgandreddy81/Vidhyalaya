import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  BookOpen, CheckCircle2, Clock, Plus, Target, Zap, 
  ArrowRight, Brain, Trophy, Shield, Sparkles
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmt = (d: Date, t: 'day' | 'short' | 'full' | 'month') => {
  if (t === 'day') return d.toLocaleDateString('en-US', { weekday: 'short' });
  if (t === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (t === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtTime = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ── Main Component ───────────────────────────────────────────────────────────
const Schedule: React.FC = () => {
  const { paths, updateSessionStatus } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const allSessions = useMemo(() => paths.flatMap(p => p.sessions || []), [paths]);

  const weekStart = getStartOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM–9 PM
  const ROW_H = 88; // Airy row sizing

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getSessionsForDay = (day: Date) =>
    allSessions.filter(s => isSameDay(new Date(s.startTime), day));

  const timeTop = useMemo(() => {
    const h = now.getHours(), m = now.getMinutes();
    if (h < 6 || h >= 22) return null;
    return (h - 6) * ROW_H + (m / 60) * ROW_H;
  }, [now]);

  return (
    <div className="relative flex-1 h-full overflow-hidden flex flex-col pt-0 pb-0 bg-[#07090e] text-slate-100">
      
      {/* ── Neural Atmosphere ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, 15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[110px]" 
        />
        <motion.div 
          animate={{ scale: [1.15, 1, 1.15], x: [0, -20, 0], y: [0, -10, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-[110px]" 
        />
      </div>

      {/* ── Branded Glass Header ── */}
      <header className="relative z-50 shrink-0 h-24 flex items-center justify-between px-10 border-b border-white/5">
        <div className="flex items-center gap-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1.5">Academic Chronos</p>
            <h1 className="text-[22px] font-black text-white tracking-tighter leading-none">{fmt(currentDate, 'month')}</h1>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-full shadow-sm">
            <button onClick={() => navigateWeek(-1)} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={14} strokeWidth={3} />
            </button>
            <span className="min-w-[140px] text-center text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
              {fmt(weekStart, 'short')} — {fmt(days[6], 'short')}
            </span>
            <button onClick={() => navigateWeek(1)} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button onClick={goToday} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-white hover:bg-white/10 hover:border-white/20 transition-all">
            Current Day
          </button>
          
          {/* Zen Mode Button */}
          <button 
            onClick={() => setIsZenMode(!isZenMode)}
            className={`flex items-center gap-2 h-9 px-5 rounded-[14px] transition-all border ${
              isZenMode 
                ? 'bg-white border-white text-[#07090e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Sparkles size={14} className={isZenMode ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
          </button>

          {!isZenMode && (
            <>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none mb-1.5">{paths.length} Sync Streams</p>
                <p className="text-[9px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">Neural Orchestration</p>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        
        {allSessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-white/[0.02] rounded-[28px] border border-white/5 flex items-center justify-center shadow-xl mb-8 relative">
                <CalendarIcon size={32} className="text-slate-500" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg"><Zap size={14} className="text-white" fill="currentColor" /></div>
             </div>
             <h2 className="text-2xl font-black text-white mb-3 tracking-tight">The Calendar is Empty</h2>
             <p className="max-w-[320px] text-[13px] font-medium leading-relaxed text-slate-500 font-serif italic mb-8">
               Your learning journey awaits its first scheduled milestone. Initialize a roadmap to begin your path.
             </p>
             <button onClick={() => window.location.hash = '#/'} className="flex items-center gap-12 rounded-[24px] bg-indigo-600 px-12 py-5 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.03] active:scale-95">
                <div className="text-left"><p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Initialize</p><p className="text-[13px] font-black uppercase tracking-widest">Create Roadmap</p></div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><ArrowRight size={20} /></div>
             </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto no-scrollbar">
            <div className="min-w-[1000px] flex flex-col">
              
              {/* Sticky Day Row */}
              <div className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-white/5 flex shadow-sm">
                <div className="w-20 shrink-0 border-r border-white/5" />
                {days.map(day => {
                  const isToday = isSameDay(day, now);
                  return (
                    <div key={day.toString()} className={`flex-1 py-5 flex flex-col items-center border-r border-white/5 last:border-r-0 ${isToday ? 'bg-indigo-500/[0.02]' : ''}`}>
                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1.5 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{fmt(day, 'day')}</span>
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center text-[16px] font-black transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Canvas */}
              <div className="flex relative">
                {/* Time Scale */}
                <div className="sticky left-0 z-30 w-20 shrink-0 bg-[#07090e] border-r border-white/5">
                  {HOURS.map(h => (
                    <div key={h} className="border-b border-white/5 flex flex-col items-center justify-start pt-3" style={{ height: ROW_H }}>
                       <span className="text-[11px] font-black text-slate-500 tracking-tighter">
                         {h > 12 ? h - 12 : h} <span className="text-[8px] uppercase tracking-widest">{h >= 12 ? 'PM' : 'AM'}</span>
                       </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                <div className="flex-1 flex relative">
                  {/* Current Time Line */}
                  {timeTop !== null && days.some(d => isSameDay(d, now)) && (
                    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: timeTop }}>
                      <div className="-ml-1 w-2 h-2 rounded-full bg-indigo-500 shadow-lg ring-4 ring-indigo-500/20" />
                      <div className="h-px flex-1 bg-indigo-500/20" />
                    </div>
                  )}

                  {days.map(day => {
                    const sessions = getSessionsForDay(day);
                    const isToday = isSameDay(day, now);
                    
                    // N-Way Collision Logic
                    const sorted = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    const groups: any[][] = [];
                    
                    sorted.forEach(s => {
                      const sStart = new Date(s.startTime).getTime();
                      const sEnd = new Date(s.endTime).getTime();
                      let foundGroup = false;
                      
                      for (const group of groups) {
                        if (group.some(prev => {
                          const pStart = new Date(prev.startTime).getTime();
                          const pEnd = new Date(prev.endTime).getTime();
                          return sStart < pEnd && sEnd > pStart;
                        })) {
                          group.push(s);
                          foundGroup = true;
                          break;
                        }
                      }
                      if (!foundGroup) groups.push([s]);
                    });

                    const positionedSessions = groups.flatMap(group => {
                      return group.map((s, idx) => {
                        const start = new Date(s.startTime);
                        const end = new Date(s.endTime);
                        const top = (start.getHours() - 6) * ROW_H + (start.getMinutes() / 60) * ROW_H;
                        const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        const width = 100 / group.length;
                        const left = idx * width;
                        
                        return { ...s, top, height: Math.max(dur * ROW_H, 40), left, width: width - 1, dur };
                      });
                    });

                    return (
                      <div key={day.toString()} className={`flex-1 relative border-r border-white/5 last:border-r-0 ${isToday ? 'bg-indigo-500/[0.01]' : ''}`}>
                        {HOURS.map(h => <div key={h} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors" style={{ height: ROW_H }} />)}
                        {/* Session Blocks */}
                        {positionedSessions.map(session => {
                          const isDone = session.isCompleted;
                          const start = new Date(session.startTime);

                          return (
                            <div key={session.id} onClick={() => updateSessionStatus(session.pathId, session.id, !isDone)}
                              style={{ 
                                top: session.top + 3, 
                                height: session.height - 6,
                                left: `${session.left}%`,
                                width: `${session.width}%`,
                                zIndex: 10 + (session.left > 0 ? 1 : 0)
                              }}
                              className={`absolute cursor-pointer rounded-[18px] p-4 transition-all duration-500 group/item overflow-hidden ${
                                isDone 
                                  ? 'bg-white/[0.01] border border-white/5 text-slate-600' 
                                  : 'bg-indigo-600/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:border-indigo-400/40 hover:-translate-y-1 hover:bg-indigo-600/20 text-slate-200'
                              }`}>
                              
                              <div className="flex h-full flex-col overflow-hidden relative z-10">
                                <div className="flex items-center gap-2 mb-1 shrink-0">
                                  <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-slate-700' : 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]'}`} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{fmtTime(start)}</span>
                                </div>
                                <h4 className={`text-[12px] font-black leading-tight mb-1.5 line-clamp-2 shrink-0 ${isDone ? 'line-through opacity-30 text-slate-500' : 'text-slate-200 group-hover/item:text-white transition-colors'}`}>
                                  {session.title}
                                </h4>
                                {session.height > 60 && (
                                  <div className="mt-auto flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-1.5">
                                      <Clock size={11} className="text-slate-500" />
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{Math.round(session.dur * 60)}m</span>
                                    </div>
                                    {!isDone && <Sparkles size={11} className="text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-all duration-500" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Action Footer ── */}
      <footer className="relative z-50 shrink-0 h-16 px-10 flex items-center justify-between bg-[#0b0f19]/40 backdrop-blur-xl border-t border-white/5">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mastered Syncs</span>
            </div>
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Streams</span>
            </div>
         </div>
         <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] opacity-40">Vidhyalaya Intelligence System v2.1</p>
      </footer>
    </div>
  );
};

export default Schedule;
