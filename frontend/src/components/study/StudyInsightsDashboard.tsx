import React, { useMemo } from 'react';
import { Sparkles, Brain, Clock, Zap, Target, ShieldCheck } from 'lucide-react';
import { MasteryStatus } from '../../types';

interface StruggleMetric {
  type: string;
  value: number;
  color: string;
}

interface StudyInsightsDashboardProps {
  isZenMode: boolean;
  keyConcepts: string[];
  nodeMastery?: Record<string, MasteryStatus>;
  struggleData?: StruggleMetric[];
  totalStudyMins?: number;
}

export const StudyInsightsDashboard: React.FC<StudyInsightsDashboardProps> = ({
  isZenMode,
  keyConcepts = [],
  nodeMastery = {},
  struggleData: propStruggleData,
  totalStudyMins
}) => {
  // Calculate stats
  const totalConcepts = keyConcepts.length;
  const masteredCount = Object.values(nodeMastery).filter(m => m === 'mastered').length;
  const understoodCount = Object.values(nodeMastery).filter(m => m === 'understood').length;
  const learningCount = Object.values(nodeMastery).filter(m => m === 'learning').length;

  const progressPercent = totalConcepts > 0 
    ? Math.round(((masteredCount * 1.0 + understoodCount * 0.6 + learningCount * 0.2) / totalConcepts) * 100)
    : 0;

  // Dynamically calculate struggle time distribution (mins) based on mastery evidence
  const struggleData = useMemo(() => {
    if (propStruggleData && propStruggleData.length > 0) return propStruggleData;

    let conceptualMins = 0;
    let sandboxMins = 0;
    let debuggingMins = 0;

    Object.entries(nodeMastery || {}).forEach(([_, status]) => {
      if (status === 'learning') {
        conceptualMins += 15;
        sandboxMins += 5;
      } else if (status === 'understood') {
        conceptualMins += 5;
        sandboxMins += 20;
        debuggingMins += 5;
      } else if (status === 'mastered') {
        sandboxMins += 10;
        debuggingMins += 25;
      }
    });

    // Provide scaled baseline values if no nodes have progress yet
    if (conceptualMins === 0 && sandboxMins === 0 && debuggingMins === 0) {
      const baseCount = keyConcepts.length || 3;
      conceptualMins = baseCount * 8;
      sandboxMins = baseCount * 5;
      debuggingMins = baseCount * 4;
    }

    return [
      { type: 'Conceptual Breakdown', value: conceptualMins, color: '#4e5bff' },
      { type: 'Sandbox Execution', value: sandboxMins, color: '#10b981' },
      { type: 'Terminal Debugging', value: debuggingMins, color: '#f59e0b' }
    ];
  }, [nodeMastery, keyConcepts, propStruggleData]);

  const totalStudyMinutesDisplay = useMemo(() => {
    if (totalStudyMins !== undefined) return totalStudyMins;
    return struggleData.reduce((acc, curr) => acc + curr.value, 0);
  }, [struggleData, totalStudyMins]);

  return (
    <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6 select-none ${
      isZenMode ? 'bg-[#05070a]/30 text-white' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Header Widget */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isZenMode ? 'bg-white/[0.02] border-white/5 shadow-xl' : 'bg-white border-slate-150 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Brain size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mastery Index</span>
            <span className={`text-[15px] font-black tracking-tight ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
              {progressPercent}% Capable
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
            calibrated
          </span>
          <span className="text-[9px] text-slate-400 mt-1">Help: Low</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Evidence Validation</span>
          <span>{masteredCount} / {totalConcepts} mastered</span>
        </div>
        <div className={`h-2.5 w-full rounded-full overflow-hidden relative ${isZenMode ? 'bg-white/5' : 'bg-slate-200'}`}>
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-705"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Concept Mastery Strength Matrix */}
      <div className="space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Concept Mastery Matrix
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {keyConcepts.map(concept => {
            const nodeId = concept.toLowerCase().replace(/\s+/g, '-');
            const mastery = nodeMastery[nodeId] || 'unknown';
            return (
              <div
                key={concept}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isZenMode 
                    ? 'bg-white/[0.01] border-white/5' 
                    : 'bg-white border-slate-150 shadow-sm'
                }`}
              >
                <h4 className={`text-[12px] font-bold leading-tight line-clamp-1 mb-2 ${isZenMode ? 'text-white' : 'text-slate-800'}`}>
                  {concept}
                </h4>
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                    mastery === 'mastered'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                      : mastery === 'understood'
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15'
                      : mastery === 'learning'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/15'
                  }`}>
                    {mastery}
                  </span>
                  {mastery === 'mastered' && <ShieldCheck size={11} className="text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SARA Help Scaffolding Curve (SVG Line Chart) */}
      <div className="space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          SARA Help Scaffolding Curve
        </div>
        <div className={`p-4 rounded-xl border flex flex-col ${
          isZenMode ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-150 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>AI Guidance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Independence</span>
            </div>
          </div>

          <div className="relative h-28 w-full">
            <svg viewBox="0 0 400 110" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="0" y1="10" x2="400" y2="10" stroke={isZenMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} strokeWidth="1" />
              <line x1="0" y1="55" x2="400" y2="55" stroke={isZenMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} strokeWidth="1" />
              <line x1="0" y1="100" x2="400" y2="100" stroke={isZenMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} strokeWidth="1" />
              
              {/* Area Under Guidance Curve */}
              <path
                d="M 10 100 L 10 20 L 100 45 L 200 30 L 300 65 L 390 85 L 390 100 Z"
                fill="url(#guidanceGrad)"
                opacity="0.15"
              />

              {/* Area Under Independence Curve */}
              <path
                d="M 10 100 L 10 85 L 100 60 L 200 75 L 300 40 L 390 20 L 390 100 Z"
                fill="url(#independenceGrad)"
                opacity="0.15"
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="guidanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4e5bff" />
                  <stop offset="100%" stopColor="#4e5bff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="independenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Guidance Line */}
              <path
                d="M 10 20 L 100 45 L 200 30 L 300 65 L 390 85"
                fill="none"
                stroke="#4e5bff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Independence Line */}
              <path
                d="M 10 85 L 100 60 L 200 75 L 300 40 L 390 20"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Dots */}
              {[{x: 10, y: 20}, {x: 100, y: 45}, {x: 200, y: 30}, {x: 300, y: 65}, {x: 390, y: 85}].map((pt, i) => (
                <circle key={`g-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#4e5bff" stroke={isZenMode ? "#05070a" : "#ffffff"} strokeWidth="1.5" />
              ))}
              {[{x: 10, y: 85}, {x: 100, y: 60}, {x: 200, y: 75}, {x: 300, y: 40}, {x: 390, y: 20}].map((pt, i) => (
                <circle key={`i-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#10b981" stroke={isZenMode ? "#05070a" : "#ffffff"} strokeWidth="1.5" />
              ))}
            </svg>
          </div>
          
          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold font-mono tracking-widest px-1 mt-1">
            <span>START</span>
            <span>HALF-WAY</span>
            <span>CURRENT</span>
          </div>
        </div>
      </div>

      {/* Active Struggle Time breakdown (Bar Chart) */}
      <div className="space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Struggle Time Distribution
        </div>
        <div className={`p-4 rounded-xl border flex flex-col ${
          isZenMode ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-150 shadow-sm'
        }`}>
          <div className="flex items-center gap-1.5 mb-4 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
            <Clock size={12} className="text-[#4e5bff]" />
            <span>Total Study: {totalStudyMinutesDisplay} Mins</span>
          </div>

          <div className="space-y-3">
            {struggleData.map((bar) => {
              const totalMins = struggleData.reduce((acc, curr) => acc + curr.value, 0);
              const pct = totalMins > 0 ? (bar.value / totalMins) * 100 : 0;
              return (
                <div key={bar.type} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={isZenMode ? 'text-slate-300' : 'text-slate-700'}>{bar.type}</span>
                    <span className="text-slate-400">{bar.value} mins ({Math.round(pct)}%)</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isZenMode ? 'bg-white/5' : 'bg-slate-150'}`}>
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
