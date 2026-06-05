import React, { useState } from 'react';
import { Target, Lightbulb, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { useAppStore } from '../../context/Store';
import { MISSION_CATALOG, SCENARIO_CATALOG } from '../../utils/cortexCoachEngine';

interface TerminalHUDProps {
  onAskSara?: (contextText: string) => void;
}

export const TerminalHUD: React.FC<TerminalHUDProps> = ({ onAskSara }) => {
  const { activeMission, activeScenario } = useAppStore();
  const [activeHintIndex, setActiveHintIndex] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Retrieve active config and steps
  const mission = activeMission ? MISSION_CATALOG[activeMission.id] : null;
  const scenario = activeScenario ? SCENARIO_CATALOG[activeScenario.scenarioId] : null;

  if (!mission && !scenario) return null;

  const title = mission ? mission.title : (scenario ? scenario.title : '');
  const steps = mission ? mission.steps : (scenario ? scenario.steps : []);
  const currentStepIndex = activeMission ? activeMission.stepIndex : (activeScenario ? activeScenario.stepIndex : 1);
  const currentStep = steps.find(s => s.stepIndex === currentStepIndex) || steps[0];

  if (!currentStep) return null;

  const handleNextHint = () => {
    if (!currentStep.hints || currentStep.hints.length === 0) return;
    setActiveHintIndex((prev) => (prev + 1) % currentStep.hints.length);
    setShowHint(true);
  };

  const handleAskSara = () => {
    if (!onAskSara || !currentStep) return;
    const hintText = currentStep.hints && currentStep.hints[activeHintIndex] 
      ? currentStep.hints[activeHintIndex] 
      : 'No hint available';
    const context = `Help me with this task: "${currentStep.instruction}" in the context of "${title}". Current active hint is: "${hintText}".`;
    onAskSara(context);
  };

  return (
    <div className="cortex-hud-banner flex flex-col w-full text-slate-200 bg-[#1e1e1e] border-b border-white/[0.04]">
      {/* HUD Info Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-white/[0.02]">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-indigo-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300">Active Challenge:</span>
          <span className="text-[11px] font-extrabold text-indigo-300 font-mono">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-slate-500">
            Step {currentStepIndex} of {steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((s) => {
              const isCompleted = s.stepIndex < currentStepIndex;
              const isActive = s.stepIndex === currentStepIndex;
              return (
                <div
                  key={s.stepIndex}
                  className={`w-2.5 h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                      : isActive 
                        ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' 
                        : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Instruction Area */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-medium leading-relaxed text-slate-100">
            {currentStep.instruction}
          </p>
          
          {showHint && currentStep.hints && currentStep.hints[activeHintIndex] && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
              <Lightbulb size={12} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-300 leading-normal font-mono">
                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider mr-1">Hint:</span>
                {currentStep.hints[activeHintIndex]}
              </p>
            </div>
          )}
        </div>

        {/* Buttons / Actions */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {currentStep.hints && currentStep.hints.length > 0 && (
            <button
              onClick={handleNextHint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Lightbulb size={12} className="text-amber-400" />
              {showHint ? 'Next Hint' : 'Get Hint'}
            </button>
          )}

          {onAskSara && (
            <button
              onClick={handleAskSara}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/15 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles size={12} className="text-indigo-200" />
              Ask SARA
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
