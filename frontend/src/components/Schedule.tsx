import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  BookOpen, CheckCircle2, Plus, MoreHorizontal,
  Target, Zap, Clock
} from 'lucide-react';
import { useAppStore } from '../context/Store';

const Schedule: React.FC = () => {
  const { paths, updateSessionStatus } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [now, setNow] = useState(new Date());

  // Update current time every minute for the indicator
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Derive sessions from all paths
  const allSessions = useMemo(() => {
    return paths.flatMap(path => path.sessions || []);
  }, [paths]);

  // Helper to get start of week (Monday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1); 
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekStart = getStartOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getSessionsForDay = (day: Date) => {
    return allSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, day);
    });
  };

  const navigateWeek = (direction: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(nextDate);
  };

  const formatDateLabel = (date: Date, type: 'short' | 'day' | 'full') => {
    if (type === 'short') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (type === 'day') return date.toLocaleDateString('en-US', { weekday: 'short' });
    if (type === 'full') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return date.toDateString();
  };

  // Calculate current time indicator position
  const currentTimeTop = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < 6 || h >= 22) return null;
    return (h - 6) * 112 + (m / 60) * 112;
  }, [now]);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in fade-in duration-700 select-none">
      {/* Header - Micromanaged Spacing & Alignment */}
      <header className="h-20 border-b border-slate-100 px-8 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3.5 group cursor-pointer">
             <div className="w-10 h-10 bg-[#000666] rounded-[12px] flex items-center justify-center text-white shadow-xl shadow-indigo-900/10 group-hover:scale-105 transition-all duration-500">
                <CalendarIcon size={20} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
                <h1 className="text-[17px] font-black text-[#000666] tracking-tight leading-tight">Mastery Schedule</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none">Intelligence Engine</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center bg-slate-50/80 p-1 rounded-xl border border-slate-100 shadow-inner">
            <button 
              onClick={() => navigateWeek(-1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-[#000666] hover:shadow-sm rounded-lg transition-all text-slate-400 active:scale-90"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="px-5 text-[11px] font-black text-[#000666] uppercase tracking-[0.15em] whitespace-nowrap min-w-[200px] text-center">
              {formatDateLabel(weekStart, 'short')} <span className="opacity-30 mx-1">—</span> {formatDateLabel(days[6], 'full')}
            </div>
            <button 
              onClick={() => navigateWeek(1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-[#000666] hover:shadow-sm rounded-lg transition-all text-slate-400 active:scale-90"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
           <div className="flex bg-slate-50/80 p-1 rounded-xl border border-slate-100 shadow-inner">
              {[
                { id: 'day' as const, label: 'Day' },
                { id: 'week' as const, label: 'Week' }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${view === item.id ? 'bg-white text-[#000666] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {item.label}
                </button>
              ))}
           </div>
           
           <button className="h-10 px-5 bg-[#000666] text-white rounded-[12px] flex items-center gap-2.5 shadow-xl shadow-indigo-900/20 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative">
              <Plus size={16} strokeWidth={3} className="relative z-10 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10">New Event</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-white/10 to-indigo-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
           </button>
        </div>
      </header>

      {allSessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 bg-[#fdfdfe] blueprint-grid">
           <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
              <div className="w-24 h-24 bg-white border border-slate-100 rounded-[32px] flex items-center justify-center text-indigo-100 mb-8 relative z-10 shadow-sm">
                 <CalendarIcon size={40} strokeWidth={1.5} className="text-indigo-200" />
              </div>
           </div>
           <h2 className="text-2xl font-serif text-[#000666] mb-3">No Neural Paths Scheduled</h2>
           <p className="text-slate-400 text-[13px] max-w-sm text-center leading-relaxed font-medium">
             Your mastery journey awaits. Build a path to materialize your daily learning checkpoints in this workspace.
           </p>
           <button 
             onClick={() => window.location.hash = '#/create'}
             className="mt-8 px-8 py-3.5 bg-[#000666] text-white rounded-[18px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
           >
             <Target size={14} />
             Initialize First Path
           </button>
        </div>
      ) : (
        /* Calendar Content - Micromanaged Grid & Alignment */
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-[#fdfdfe] blueprint-grid relative">
          <div className="min-w-[1200px] flex flex-col h-fit">
            {/* Weekday Labels Sticky Header */}
            <div className="flex border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
              <div className="w-24 shrink-0 border-r border-slate-100" />
              {days.map(day => {
                const isToday = isSameDay(day, now);
                return (
                  <div key={day.toString()} className="flex-1 py-4 flex flex-col items-center gap-1.5 border-r border-slate-100 last:border-r-0 relative">
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {formatDateLabel(day, 'day')}
                    </span>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-[12px] text-[17px] font-serif font-bold transition-all ${isToday ? 'bg-[#000666] text-white shadow-lg shadow-indigo-900/20 scale-105' : 'text-[#000666] hover:bg-slate-50'}`}>
                      {day.getDate()}
                    </div>
                    {isToday && (
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-[#000666]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid with Current Time Indicator */}
            <div className="flex relative">
               {/* Time Column Sticky Left */}
               <div className="w-24 shrink-0 border-r border-slate-100 bg-white/60 backdrop-blur-md sticky left-0 z-20">
                  {hours.map(hour => (
                    <div key={hour} className="h-28 px-4 flex flex-col justify-start pt-4 border-b border-slate-50 last:border-b-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">
                          {hour > 12 ? `${hour - 12}` : `${hour}`}
                        </span>
                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">
                          {hour >= 12 ? 'PM' : 'AM'}
                        </span>
                      </div>
                    </div>
                  ))}
               </div>

               {/* Days Columns */}
               <div className="flex-1 flex relative">
                  {/* Current Time Line Across All Columns */}
                  {currentTimeTop !== null && days.some(day => isSameDay(day, now)) && (
                    <div 
                      className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                      style={{ top: `${currentTimeTop}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <div className="flex-1 h-[1.5px] bg-red-500/30" />
                    </div>
                  )}

                  {days.map(day => {
                    const sessions = getSessionsForDay(day);
                    const isToday = isSameDay(day, now);

                    return (
                      <div key={day.toString()} className={`flex-1 border-r border-slate-100 last:border-r-0 relative group/col min-h-full transition-colors ${isToday ? 'bg-indigo-50/10' : ''}`}>
                        {/* Interactive Grid Slots */}
                        {hours.map(hour => (
                          <div 
                            key={hour} 
                            className="h-28 border-b border-slate-50/50 last:border-b-0 hover:bg-slate-50/30 transition-colors"
                          />
                        ))}

                        {/* Sessions - Micromanaged Layout & Text Overlap Prevention */}
                        {sessions.map(session => {
                          const start = new Date(session.startTime);
                          const end = new Date(session.endTime);
                          
                          const startHour = start.getHours();
                          const startMin = start.getMinutes();
                          const top = (startHour - 6) * 112 + (startMin / 60) * 112;
                          
                          const durationHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                          // Increased min-height to 64px to prevent content overlap in tight slots
                          const height = Math.max(durationHrs * 112, 64); 
                          
                          const isCompleted = session.isCompleted;

                          return (
                            <div 
                              key={session.id}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              onClick={() => updateSessionStatus(session.pathId, session.id, !isCompleted)}
                              className={`absolute inset-x-2 rounded-[18px] p-3.5 shadow-sm hover:shadow-2xl hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/session overflow-hidden flex flex-col border-l-[5px] active:scale-95
                                ${isCompleted 
                                  ? 'bg-emerald-50/40 border-emerald-500/30 border-l-emerald-500 text-emerald-900' 
                                  : 'bg-white border-indigo-50 border-l-[#000666] text-[#000666]'}`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                 <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] leading-none ${isCompleted ? 'text-emerald-500' : 'text-indigo-400'}`}>
                                      {start.getHours() % 12 || 12}:{start.getMinutes().toString().padStart(2, '0')} {start.getHours() >= 12 ? 'PM' : 'AM'}
                                    </span>
                                 </div>
                                 <div className={`transition-all duration-500 ${isCompleted ? 'scale-110' : 'opacity-30 group-hover/session:opacity-100'}`}>
                                   {isCompleted ? <CheckCircle2 size={14} className="text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />}
                                 </div>
                              </div>
                              
                              <h4 className={`text-[12px] font-bold leading-tight mb-2 line-clamp-2 pr-2 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                {session.title}
                              </h4>
                              
                              <div className="mt-auto flex items-center gap-2.5">
                                 <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-500' : 'bg-indigo-50 text-indigo-400 group-hover/session:bg-[#000666] group-hover/session:text-white'}`}>
                                    <BookOpen size={10} />
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                    <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-40">Context Module</span>
                                    <span className="text-[8px] font-bold uppercase truncate opacity-70">Intelligence Protocol</span>
                                 </div>
                              </div>

                              {/* Action Menu (Hidden by default) */}
                              <div className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/session:opacity-100 transition-opacity">
                                 <MoreHorizontal size={14} className="opacity-40 hover:opacity-100" />
                              </div>

                              {/* Decorative Neural Background */}
                              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl group-hover/session:bg-indigo-500/10 transition-colors" />
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
    </div>
  );
};

export default Schedule;
