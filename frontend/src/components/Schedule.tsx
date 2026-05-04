import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  BookOpen, CheckCircle2, Clock, Plus, Target, Zap, 
  ArrowRight, Brain, Trophy, Shield
} from 'lucide-react';
import { useAppStore } from '../context/Store';

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

// ── Main ─────────────────────────────────────────────────────────────────────
const Schedule: React.FC = () => {
  const { paths, updateSessionStatus } = useAppStore();
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
  const ROW_H = 88; // Even airier rows for better readability

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
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f6fa]">

      {/* ── Branded Header ── */}
      <header className="shrink-0 h-20 bg-white border-b border-slate-100 px-6 sm:px-10 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-400 leading-none mb-1.5">Academic Calendar</p>
            <h1 className="text-[18px] font-black text-slate-900 tracking-tight">{fmt(currentDate, 'month')}</h1>
          </div>

          <div className="h-6 w-px bg-slate-100 hidden sm:block" />

          <div className="flex items-center gap-2 rounded-[18px] bg-slate-50 p-1.5 ring-1 ring-slate-100 shadow-sm">
            <button onClick={() => navigateWeek(-1)} className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-white transition-all">
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="min-w-[120px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {fmt(weekStart, 'short')} — {fmt(days[6], 'short')}
            </span>
            <button onClick={() => navigateWeek(1)} className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-white transition-all">
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={goToday} className="px-5 py-2.5 rounded-[18px] bg-white text-[9px] font-black uppercase tracking-widest text-[#000666] ring-1 ring-slate-100 shadow-sm hover:bg-slate-50 transition-all">
            Current Day
          </button>
          <div className="h-8 w-px bg-slate-100 mx-2" />
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1.5">{paths.length} Active Paths</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Mastery Orchestration</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        
        {allSessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-white rounded-[28px] border border-slate-100 flex items-center justify-center shadow-xl shadow-indigo-900/5 mb-8 relative">
                <CalendarIcon size={32} className="text-slate-300" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#000666] flex items-center justify-center shadow-lg"><Zap size={14} className="text-white" fill="currentColor" /></div>
             </div>
             <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">The Canvas is Empty</h2>
             <p className="max-w-[320px] text-[13px] font-medium leading-relaxed text-slate-400 font-['Newsreader'] italic mb-8">
               Your learning journey awaits its first scheduled milestone. Initialize a roadmap to begin your path.
             </p>
             <button onClick={() => window.location.hash = '#/create'} className="flex items-center gap-12 rounded-[24px] bg-[#000666] px-12 py-5 text-white shadow-[0_20px_40px_-10px_rgba(0,6,102,0.4)] transition-all hover:scale-[1.03] active:scale-95">
                <div className="text-left"><p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Initialize</p><p className="text-[13px] font-black uppercase tracking-widest">Create Roadmap</p></div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><ArrowRight size={20} /></div>
             </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="min-w-[1000px] flex flex-col">
              
              {/* Sticky Day Row */}
              <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 flex shadow-sm">
                <div className="w-20 shrink-0 border-r border-slate-50" />
                {days.map(day => {
                  const isToday = isSameDay(day, now);
                  return (
                    <div key={day.toString()} className={`flex-1 py-5 flex flex-col items-center border-r border-slate-50 last:border-r-0 ${isToday ? 'bg-indigo-50/20' : ''}`}>
                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1.5 ${isToday ? 'text-[#000666]' : 'text-slate-300'}`}>{fmt(day, 'day')}</span>
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center text-[16px] font-black transition-all ${isToday ? 'bg-[#000666] text-white shadow-lg' : 'text-slate-800'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Canvas */}
              <div className="flex relative">
                {/* Time Scale */}
                <div className="sticky left-0 z-30 w-20 shrink-0 bg-white border-r border-slate-100">
                  {HOURS.map(h => (
                    <div key={h} className="border-b border-slate-50/50 flex flex-col items-center justify-start pt-3" style={{ height: ROW_H }}>
                       <span className="text-[11px] font-black text-slate-300 tracking-tighter">
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
                      <div className="-ml-1 w-2 h-2 rounded-full bg-indigo-500 shadow-lg ring-4 ring-indigo-100" />
                      <div className="h-px flex-1 bg-indigo-200/50" />
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
                      <div key={day.toString()} className={`flex-1 relative border-r border-slate-50 last:border-r-0 ${isToday ? 'bg-indigo-50/5' : ''}`}>
                        {HOURS.map(h => <div key={h} className="border-b border-slate-50/50 hover:bg-slate-50/10 transition-colors" style={{ height: ROW_H }} />)}
                        
                        {/* Session Blocks */}
                        {positionedSessions.map(session => {
                          const isDone = session.isCompleted;
                          const start = new Date(session.startTime);

                          return (
                            <div key={session.id} onClick={() => updateSessionStatus(session.pathId, session.id, !isDone)}
                              style={{ 
                                top: session.top + 2, 
                                height: session.height - 4,
                                left: `${session.left}%`,
                                width: `${session.width}%`,
                                zIndex: 10 + (session.left > 0 ? 1 : 0)
                              }}
                              className={`absolute cursor-pointer rounded-[14px] p-3 transition-all duration-500 group/item border ${
                                isDone 
                                  ? 'bg-slate-50/40 border-slate-100 text-slate-300' 
                                  : 'bg-white border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(0,6,102,0.12)] hover:-translate-y-1 hover:border-[#000666]/10 hover:z-30'
                              }`}>
                              <div className="flex h-full flex-col overflow-hidden">
                                <div className="flex items-center gap-2 mb-1.5 shrink-0">
                                  <div className={`w-1 h-3 rounded-full ${isDone ? 'bg-slate-200' : 'bg-[#000666]'}`} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">{fmtTime(start)}</span>
                                </div>
                                <h4 className={`text-[12px] font-black leading-tight mb-1.5 line-clamp-2 shrink-0 ${isDone ? 'line-through opacity-30' : 'text-slate-900'}`}>
                                  {session.title}
                                </h4>
                                {session.height > 50 && (
                                  <div className="mt-auto flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-1.5">
                                      <Clock size={10} className="text-slate-300" />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{Math.round(session.dur * 60)}m</span>
                                    </div>
                                    {!isDone && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 group-hover/item:opacity-100 transition-all shadow-sm shadow-emerald-200" />}
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
      <footer className="shrink-0 h-14 bg-white border-t border-slate-100 px-10 flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mastered Sessions</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-[#000666]" />
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Active Focus</span>
            </div>
         </div>
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Vidhyalaya Intelligence System v2.0</p>
      </footer>
    </div>
  );
};

export default Schedule;
