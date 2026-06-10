import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Clock, ArrowRight, Sparkles, Trash2, AlertTriangle,
  LayoutGrid, List, Shield, HelpCircle, X, Plus, CalendarDays,
  Edit, Save, ArrowUpRight, ArrowRightLeft
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { useFocus } from '../context/FocusContext';
import type { ScheduledSession } from '../types';
import { rebalanceCalendarSessions } from '../services/geminiService';
import { toast } from 'sonner';

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
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 24 hours: 0 (12 AM) → 23 (11 PM)
const ROW_H = 85;

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
        top: start.getHours() * ROW_H + (start.getMinutes() / 60) * ROW_H + rowOffset,
        height: Math.max(dur * ROW_H, 80),
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
  onClick: () => void;
  variant: 'grid' | 'list';
}> = ({ s, onClick, variant }) => {
  const done  = s.isCompleted;
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const durMinutes = (end.getTime() - start.getTime()) / 60000;

  const content = (
    <div 
      className="h-full border transition-all duration-300 relative group/card flex flex-col justify-between overflow-hidden shadow-sm"
      style={{
        background: done ? '#f8fafc' : '#ffffff',
        borderColor: done ? 'rgba(0,0,0,0.04)' : 'rgba(78,91,255,0.08)',
        borderRadius: 12,
      }}
      onMouseEnter={e => {
        if (!done) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(78,91,255,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-0.5px)';
        }
      }}
      onMouseLeave={e => {
        if (!done) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(13,23,48,0.02)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(78,91,255,0.08)';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }
      }}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-[4px]" 
        style={{ background: done ? '#10b981' : '#4e5bff' }} 
      />
      
      <div className="p-3 h-full flex flex-col justify-between min-w-0">
        <div>
          {/* Header metadata row */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 font-mono">
              {fmtTime(start)}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 font-mono border border-slate-100/80 shrink-0">
              {Math.round(durMinutes)}m
            </span>
          </div>

          <h4 
            className="text-[12px] font-bold leading-snug font-sans text-slate-800 line-clamp-2"
            style={{ 
              textDecoration: done ? 'line-through' : 'none',
              opacity: done ? 0.45 : 1
            }}
          >
            {s.title}
          </h4>
        </div>

        {/* Footer info only shown if enough space (list view or large blocks) */}
        {variant === 'list' && (
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 mt-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: done ? '#10b981' : '#4e5bff' }}>
              {done ? 'Completed' : 'Study Now'}
            </span>
            {done && <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />}
          </div>
        )}
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
        onClick={onClick}
        className="w-full h-[95px] cursor-pointer mb-3 shrink-0"
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
      onClick={onClick}
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
  const { paths, updateSessionStatus, updateSessionDateTime, deleteSession, addCustomSession, clearAllSessions } = useAppStore();
  const { isZenMode, setIsZenMode } = useFocus();

  const [anchor, setAnchor]   = useState(() => new Date());
  const [now, setNow]         = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Overhaul states
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Reschedule Form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleDuration, setRescheduleDuration] = useState(45);

  // Add Custom Event Form state
  const [addPathId, setAddPathId] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('09:00');
  const [addDuration, setAddDuration] = useState(45);

  // Initialize addPathId when paths load
  useEffect(() => {
    if (paths.length > 0 && !addPathId) {
      setAddPathId(paths[0].id);
    }
  }, [paths, addPathId]);

  // Sync edit form fields when selecting a session
  useEffect(() => {
    if (selectedSession) {
      const d = new Date(selectedSession.startTime);
      const endD = new Date(selectedSession.endTime);
      
      // format YYYY-MM-DD
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setRescheduleDate(`${yyyy}-${mm}-${dd}`);

      // format HH:MM
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setRescheduleTime(`${hh}:${min}`);

      // duration in mins
      const durMins = Math.round((endD.getTime() - d.getTime()) / 60000);
      setRescheduleDuration(durMins || 45);
    }
  }, [selectedSession]);

  // Initialize addDate to today
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setAddDate(`${yyyy}-${mm}-${dd}`);
  }, [showAddModal]);

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

  // Overdue calculation
  const overdueSessions = useMemo(() => {
    return allSessions.filter(s => {
      return !s.isCompleted && new Date(s.endTime).getTime() < now.getTime();
    });
  }, [allSessions, now]);

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

  // 24 hours timeline marker
  const timeLine = useMemo(() => {
    const h = now.getHours(), m = now.getMinutes();
    return h * ROW_H + (m / 60) * ROW_H;
  }, [now]);

  const handleClearCalendar = () => {
    clearAllSessions();
    setShowClearConfirm(false);
    toast.success("Calendar timeline cleared.");
  };

  const handleSaveReschedule = () => {
    if (!selectedSession) return;
    
    // Parse time
    const [hStr, mStr] = rescheduleTime.split(':');
    const hours = parseInt(hStr, 10) || 0;
    const minutes = parseInt(mStr, 10) || 0;

    const start = new Date(rescheduleDate);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start.getTime() + rescheduleDuration * 60000);

    updateSessionDateTime(selectedSession.pathId, selectedSession.id, start.toISOString(), end.toISOString());
    setSelectedSession(null);
    toast.success("Session rescheduled successfully.");
  };

  const handleDeleteSession = () => {
    if (!selectedSession) return;
    deleteSession(selectedSession.pathId, selectedSession.id);
    setSelectedSession(null);
    toast.success("Session deleted.");
  };

  const handleAddCustomSession = () => {
    if (!addPathId || !addTitle.trim()) {
      toast.error("Please enter a title and select a roadmap.");
      return;
    }

    const [hStr, mStr] = addTime.split(':');
    const hours = parseInt(hStr, 10) || 0;
    const minutes = parseInt(mStr, 10) || 0;

    const start = new Date(addDate);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start.getTime() + addDuration * 60000);

    addCustomSession(addPathId, addTitle.trim(), start.toISOString(), end.toISOString());
    setShowAddModal(false);
    setAddTitle('');
    toast.success("Custom study block added to calendar.");
  };

  const handleAiRebalance = async () => {
    if (overdueSessions.length === 0 || paths.length === 0) return;
    setIsRebalancing(true);
    
    // Group overdue sessions by path, and rebalance the path with the most overdue items
    const overdueCountsByPath = overdueSessions.reduce((acc, s) => {
      acc[s.pathId] = (acc[s.pathId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const targetPathId = Object.keys(overdueCountsByPath).reduce((a, b) => overdueCountsByPath[a] > overdueCountsByPath[b] ? a : b);
    const targetPath = paths.find(p => p.id === targetPathId) || paths[0];

    toast.promise(
      rebalanceCalendarSessions(
        targetPath.sessions || [],
        targetPath.dailyCommitmentMinutes || 45,
        targetPath.preferredStartTime || "09:00",
        targetPath.goal
      ),
      {
        loading: 'SARA is re-balancing your study timeline...',
        success: (data) => {
          setIsRebalancing(false);
          if (data && data.length > 0) {
            data.forEach(item => {
              updateSessionDateTime(targetPath.id, item.id, item.startTime, item.endTime);
            });
            return 'Timeline successfully re-balanced by AI Coach!';
          }
          return 'No adjustments needed.';
        },
        error: (err) => {
          setIsRebalancing(false);
          console.error(err);
          return 'Failed to re-balance timeline. Try again later.';
        }
      }
    );
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

      {/* ── Add Custom Session Modal ── */}
      <AnimatePresence>
        {showAddModal && (
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
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border"
              style={{ borderColor: 'rgba(13,13,13,0.08)' }}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100">
                <h3 className="text-[15px] font-bold text-[#0d0d0d] font-sans flex items-center gap-1.5">
                  <CalendarDays size={18} className="text-[#4e5bff]" />
                  <span>Schedule Study Block</span>
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Revision & Exam Prep"
                    value={addTitle}
                    onChange={e => setAddTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>

                {/* Roadmaps Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Associate with Developer Roadmap</label>
                  <select
                    value={addPathId}
                    onChange={e => setAddPathId(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {paths.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                {/* Date and Time Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Date</label>
                    <input 
                      type="date" 
                      value={addDate}
                      onChange={e => setAddDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Start Time</label>
                    <input 
                      type="time" 
                      value={addTime}
                      onChange={e => setAddTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                </div>

                {/* Duration Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Duration</label>
                  <select
                    value={addDuration}
                    onChange={e => setAddDuration(Number(e.target.value))}
                    className="w-full h-10 px-2.5 rounded-lg border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[15, 30, 45, 60, 90, 120].map(mins => (
                      <option key={mins} value={mins}>{mins} minutes</option>
                    ))}
                  </select>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleAddCustomSession}
                  className="w-full h-11 rounded-full font-semibold text-[13px] text-white flex items-center justify-center gap-1.5 bg-[#4e5bff] hover:bg-[#3d4acc] transition-all shadow-md mt-6 active:scale-98"
                >
                  <Plus size={16} />
                  <span>Add to Timeline</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Session Details & Reschedule Modal ── */}
      <AnimatePresence>
        {selectedSession && (() => {
          const done = selectedSession.isCompleted;
          const start = new Date(selectedSession.startTime);
          const end = new Date(selectedSession.endTime);
          
          // Find associated path
          const assocPath = paths.find(p => p.id === selectedSession.pathId);
          
          // Find phase ID and module details
          let phaseId = '';
          let targetModule: any = null;
          if (assocPath && selectedSession.moduleId) {
            for (const phase of (assocPath.phases || [])) {
              const mod = phase.modules.find(m => m.id === selectedSession.moduleId);
              if (mod) {
                phaseId = phase.id;
                targetModule = mod;
                break;
              }
            }
          }

          return (
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
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border"
                style={{ borderColor: 'rgba(13,13,13,0.08)' }}
              >
                <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="app-label text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-full" style={{ background: 'rgba(78,91,255,0.08)', color: '#4e5bff' }}>
                      {assocPath ? assocPath.title : 'Study Block'}
                    </span>
                    <span className={`text-[10px] font-semibold py-0.5 px-2 rounded ${done ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      {done ? 'Completed' : 'Scheduled'}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedSession(null)} 
                    className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0d0d0d] leading-snug mb-1 font-sans">
                      {selectedSession.title}
                    </h3>
                    {targetModule && (
                      <p className="text-[12px] text-slate-500 leading-relaxed font-sans mt-1">
                        {targetModule.description}
                      </p>
                    )}
                  </div>

                  {/* Time Display */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2.5">
                    <CalendarDays className="text-[#4e5bff] shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800 leading-none">
                        {fmtFull(start)}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock size={11} />
                        {fmtTime(start)} — {fmtTime(end)} ({rescheduleDuration} mins)
                      </p>
                    </div>
                  </div>

                  {/* Study CTA */}
                  {selectedSession.moduleId && phaseId && (
                    <button
                      onClick={() => {
                        setSelectedSession(null);
                        navigate(`/study/${selectedSession.pathId}/${phaseId}/${selectedSession.moduleId}`);
                      }}
                      className="w-full h-11 rounded-full font-semibold text-[13px] text-white flex items-center justify-center gap-2 bg-[#4e5bff] hover:bg-[#3d4acc] transition-all shadow-md active:scale-98"
                    >
                      <span>Start Study Session</span>
                      <ArrowUpRight size={14} />
                    </button>
                  )}

                  {/* Toggle Status & Delete */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateSessionStatus(selectedSession.pathId, selectedSession.id, !done);
                        setSelectedSession(prev => prev ? { ...prev, isCompleted: !done } : null);
                        toast.success(done ? "Session marked incomplete." : "Session completed!");
                      }}
                      className={`flex-1 h-9 rounded-full font-semibold text-[12px] border flex items-center justify-center transition-all ${
                        done 
                          ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {done ? 'Mark as Incomplete' : 'Mark as Completed'}
                    </button>
                    <button
                      onClick={handleDeleteSession}
                      className="w-9 h-9 rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all"
                      title="Delete Session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Reschedule Section */}
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <h4 className="text-[12px] font-bold text-slate-700 mb-2 font-sans flex items-center gap-1">
                      <Edit size={12} />
                      <span>Reschedule Session</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">Date</label>
                        <input 
                          type="date" 
                          value={rescheduleDate}
                          onChange={e => setRescheduleDate(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">Start Time</label>
                        <input 
                          type="time" 
                          value={rescheduleTime}
                          onChange={e => setRescheduleTime(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400">Duration</span>
                        <select
                          value={rescheduleDuration}
                          onChange={e => setRescheduleDuration(Number(e.target.value))}
                          className="h-8 px-1.5 rounded-lg border border-slate-200 text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {[15, 30, 45, 60, 90, 120].map(mins => (
                            <option key={mins} value={mins}>{mins} mins</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleSaveReschedule}
                        className="h-8 px-4 rounded-full font-semibold text-[11px] text-white flex items-center justify-center gap-1 bg-[#4e5bff] hover:bg-[#3d4acc] transition-all"
                      >
                        <Save size={11} />
                        <span>Save Reschedule</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <header className="relative z-50 shrink-0 h-20 px-8 flex items-center justify-between bg-transparent text-white animate-none">
        <div className="flex items-center gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="app-label text-white/50">Study Timeline</span>
            </div>
            <h1 className="jawdropping-header-title text-[22px] lg:text-[24px]">
              {fmtMonth(anchor)}
            </h1>
          </div>

          {/* Week Nav controls & Today */}
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => setAnchor(new Date())}
              className="px-3 h-9 rounded-full text-[11px] font-semibold tracking-wide border transition-all text-white/80 hover:text-white border-white/10 hover:bg-white/5 active:scale-95"
            >
              Today
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             {paths.length > 0 && (
               <button
                 onClick={() => setShowAddModal(true)}
                 className="h-9 px-3.5 rounded-full text-[11px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 flex items-center gap-1.5 transition-all"
                 title="Add Custom Study Block"
               >
                 <Plus size={13} />
                 <span>Schedule Block</span>
               </button>
             )}
             
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
        className="relative flex-1 overflow-auto no-scrollbar bg-white rounded-t-[24px] border-t border-slate-100 animate-none flex flex-col"
        style={{ boxShadow: '0 -8px 32px rgba(13,23,48,0.03)' }}
      >
        {/* ── AI Catch-Up Advisor Banner ── */}
        {overdueSessions.length > 0 && !isZenMode && (
          <div 
            className="mx-8 mt-6 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all bg-gradient-to-r from-indigo-50/50 to-indigo-100/30"
            style={{ borderColor: 'rgba(78,91,255,0.12)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4e5bff] border border-indigo-100 shrink-0">
                <Sparkles size={20} className={isRebalancing ? "animate-spin" : ""} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800 font-sans">AI Study Rebalancing</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                  SARA detected {overdueSessions.length} missed study blocks. Let's re-distribute them to get your roadmap back on schedule.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleAiRebalance}
              disabled={isRebalancing}
              className="h-9 px-4 rounded-full font-semibold text-[12px] text-white flex items-center justify-center gap-1.5 bg-[#4e5bff] hover:bg-[#3d4acc] transition-all disabled:opacity-50"
            >
              <ArrowRightLeft size={13} />
              <span>{isRebalancing ? 'Rebalancing...' : 'Re-balance Study Plan'}</span>
            </button>
          </div>
        )}

        {allSessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-6">
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
          <div className="min-w-[1000px] flex flex-col flex-1">
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
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
                          <span className="text-[11px] font-semibold tracking-tighter" style={{ color: 'rgba(13,13,13,0.36)' }}>
                            {h % 12 || 12} <span className="text-[9px] font-normal uppercase">{h >= 12 ? 'PM' : 'AM'}</span>
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
                                onClick={() => setSelectedSession(s)} 
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
                                onClick={() => setSelectedSession(s)} 
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
