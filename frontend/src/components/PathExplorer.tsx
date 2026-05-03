import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { generateLearningPlan } from '../services/geminiService';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from './NeuralSynthesizer';
import { 
  ArrowLeft, Sparkles, Zap, 
  RotateCcw, Check, Brain, 
  Trophy, Rocket, Lightbulb,
  ArrowRight, Maximize2, Minimize2, PanelLeftClose, Loader
} from 'lucide-react';

const PathExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPath } = useAppStore();
  
  const goal = searchParams.get('goal') || 'New Knowledge Path';
  const track = searchParams.get('track') || 'Custom Roadmap';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [pathMap, setPathMap] = useState<ConceptMap | null>(null);
  const [agentLogs, setAgentLogs] = useState<{id: number, msg: string, type: 'info' | 'success'}[]>([]);
  const [customIntent, setCustomIntent] = useState('');
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard shortcut: F = toggle fullscreen
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!['INPUT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          setIsFullscreen(prev => !prev);
        }
      }
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const performGeneration = async (intentModifier: string = '') => {
    setIsLoading(true);
    setError(null);
    setSelectedNode(null); // reset stale node selection
    setAgentLogs([]);
    
    // Start simulation concurrently
    const simulations = [
      { msg: 'Initializing Neural Architect...', type: 'info' as const },
      { msg: 'Analyzing target goal and track prerequisites...', type: 'info' as const },
      { msg: 'Synthesizing comprehensive syllabus...', type: 'info' as const },
      { msg: 'Cross-referencing industry standards...', type: 'success' as const },
      { msg: 'Drafting modular checkpoints...', type: 'info' as const },
      { msg: 'Finalizing neural mapping...', type: 'success' as const },
      { msg: 'Roadmap generated successfully.', type: 'success' as const }
    ];

    let simulationActive = true;
    (async () => {
      for (let i = 0; i < simulations.length; i++) {
        if (!simulationActive) break;
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        if (simulationActive) {
          setAgentLogs(prev => [{ id: Date.now(), msg: simulations[i].msg, type: simulations[i].type }, ...prev]);
        }
      }
    })();

    try {
      const dailyTimeMinutes = 45; // Default for preview
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14); // 2 weeks default
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const fullContext = `
        Goal: ${goal}
        Track: ${track}
        ${intentModifier ? `USER INTENT MODIFICATION: ${intentModifier}` : ''}
      `;


      const planData = await generateLearningPlan(
        fullContext,
        '', // No extra resources for preview
        dailyTimeMinutes,
        'beginner',
        'Mastery',
        targetDateStr
      );

      if (!planData || !planData.phases) throw new Error("Failed to generate blueprint.");

      setPlan(planData);

      // Map to ConceptMap for NeuralSynthesizer
      const nodes: ConceptNode[] = [];
      const relationships: any[] = [];

      nodes.push({
        id: 'root',
        label: planData.title || goal,
        description: planData.description || 'Mastery Path',
        depth: 0
      });

      planData.phases.forEach((phase: any, pIdx: number) => {
        const phaseId = `phase-${pIdx}`;
        nodes.push({
          id: phaseId,
          label: phase.title,
          description: phase.description || '',
          depth: 1,
          parentId: 'root'
        });
        relationships.push({ from: 'root', to: phaseId, label: 'phase' });

        phase.modules.forEach((mod: any, mIdx: number) => {
          const modId = `mod-${pIdx}-${mIdx}`;
          nodes.push({
            id: modId,
            label: mod.title,
            description: mod.description || '',
            depth: 2,
            parentId: phaseId
          });
          relationships.push({ from: phaseId, to: modId, label: 'module' });
        });
      });

      setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
      simulationActive = false;
      setTimeout(() => setIsLoading(false), 500);
    } catch (err: any) {
      simulationActive = false;
      console.error("Generation failed:", err);
      const msg = String(err?.message ?? '');
      const isTimeout = msg.includes('AI_TIMEOUT');
      const isBusy = msg.includes('503') || msg.toLowerCase().includes('demand') || msg.toLowerCase().includes('unavailable');
      setError(
        isTimeout 
          ? 'The Neural Link timed out. The Gemini API is under high load. Please wait a moment and retry.'
          : isBusy
          ? 'The Neural Archive is experiencing high demand. Retrying automatically...'
          : (msg || 'The Neural Link was severed. Please try again.')
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performGeneration();
  }, [goal, track]);

  const handleInitialize = () => {
    if (!plan) return;

    // Convert preview plan to full LearningPath and add to store
    const dailyTimeMinutes = 45;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const phasesWithIds = plan.phases.map((phase: any) => ({
      ...phase,
      id: generateSimpleId(),
      modules: phase.modules.map((mod: any) => ({
        ...mod,
        id: generateSimpleId(),
        isCompleted: false,
        keyConcepts: mod.keyConcepts || [],
        resources: [],
        dependsOnModuleIds: [],
        userNotes: '',
        estimatedMinutes: mod.estimatedMinutes || 30
      }))
    }));

    const newPath: any = {
      id: generateSimpleId(),
      title: plan.title || goal,
      goal: goal,
      expectedOutcome: 'Mastery',
      targetDate: targetDateStr,
      createdAt: new Date().toISOString(),
      dailyCommitmentMinutes: dailyTimeMinutes,
      status: 'active',
      progress: 0,
      phases: phasesWithIds.map((phase: any, pIndex: number) => ({
        id: phase.id,
        title: phase.title,
        description: phase.description,
        order: pIndex + 1,
        modules: phase.modules
      })),
      sessions: [],
      preferredStartTime: '09:00'
    };

    addPath(newPath);
    navigate(`/path/${newPath.id}`);
  };

  return (
    <div className={`flex flex-col bg-[#f8f9fa] overflow-hidden transition-all duration-500 ${
      isFullscreen ? 'fixed inset-0 z-[9999]' : 'flex-1 h-full'
    }`}>
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Neural Explorer</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{track}</span>
            </div>
            <h1 className="text-lg font-bold text-[#000666]">{goal}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && !error && (
            <button
              onClick={handleInitialize}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#000666] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Check size={14} />
              Initialize Classroom
            </button>
          )}
          {/* Fullscreen Toggle */}
          {!isLoading && !error && (
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#000666] hover:border-indigo-200 hover:bg-indigo-50 text-xs font-black uppercase tracking-widest transition-all"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Studio */}
      <main className="flex-1 relative min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f9fa] z-40 p-8">
             <div className="max-w-3xl w-full mx-auto mt-10">
                <div className="bg-white rounded-[32px] p-8 border border-slate-100/50 shadow-sm h-[400px] flex flex-col">
                   <div className="flex items-center justify-between mb-6 px-4">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                         <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Neural Architect Log</span>
                      </div>
                      <Loader size={16} className="text-indigo-400 animate-spin" />
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-4 pl-2 pb-4">
                      {agentLogs.length > 0 ? (
                         agentLogs.map((log) => (
                           <div key={log.id} className="bg-slate-50 border border-slate-100/60 p-5 rounded-[24px] shadow-sm flex gap-4 animate-in slide-in-from-right-4 duration-500">
                              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'
                              }`} />
                              <div className="space-y-1">
                                 <p className="text-[13px] font-bold text-slate-800 font-serif leading-relaxed italic">{log.msg}</p>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Architect Agent</span>
                                 </div>
                              </div>
                           </div>
                         ))
                      ) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <Brain size={48} className="text-[#000666] mb-4" />
                            <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Initializing...</span>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-white z-40">
             <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
                <RotateCcw size={40} />
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-4">Neural Link Busy</h2>
             <p className="max-w-md text-slate-500 mb-8 font-medium">
               {error.includes('503') || error.toLowerCase().includes('demand') 
                 ? "The Neural Archive is currently experiencing a high volume of requests. Our architects are scaling the synthesis engine." 
                 : "The uplink was severed by a semantic mismatch. This usually happens with extremely complex intent."}
             </p>
             <button 
               onClick={() => performGeneration()}
               className="px-8 py-4 bg-[#000666] text-white rounded-2xl font-black uppercase tracking-widest text-xs"
             >
               Re-Attempt Synthesis
             </button>
          </div>
        ) : (
          <div className="w-full h-full flex">
            {/* Left Control Panel — hidden in fullscreen */}
            <aside className={`border-r border-slate-100 bg-white overflow-y-auto transition-all duration-500 ${
              isFullscreen ? 'w-0 p-0 opacity-0 overflow-hidden' : 'w-[320px] p-6 hidden xl:block'
            }`}>
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Intent Modifiers</h3>
                <div className="space-y-3">
                  {[
                    { id: 'fundamental', label: 'More Fundamentals', icon: Lightbulb, color: 'text-amber-500' },
                    { id: 'deep', label: 'Deeper Technicals', icon: Brain, color: 'text-indigo-500' },
                    { id: 'practical', label: 'Project Focused', icon: Rocket, color: 'text-rose-500' },
                    { id: 'exam', label: 'Certification Prep', icon: Trophy, color: 'text-emerald-500' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => performGeneration(`Adjust the curriculum to be more ${opt.label.toLowerCase()}.`)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-indigo-100 hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-white shadow-sm ${opt.color}`}>
                          <opt.icon size={18} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 group-hover:text-[#000666]">{opt.label}</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Custom Calibration</h3>
                <div className="relative">
                  <textarea
                    value={customIntent}
                    onChange={(e) => setCustomIntent(e.target.value)}
                    placeholder="e.g. Focus more on architectural patterns or add more hands-on labs..."
                    className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => {
                      if (customIntent.trim()) performGeneration(customIntent);
                    }}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#000666] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {selectedNode && (
                <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Module Analysis</h3>
                   <div className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100">
                      <h4 className="text-sm font-bold text-[#000666] mb-2">{selectedNode.label}</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{selectedNode.description}</p>
                   </div>
                </div>
              )}

              <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 mb-6">
                <p className="text-[10px] leading-relaxed font-bold text-slate-400 uppercase tracking-widest mb-3">Live Analysis</p>
                <p className="text-xs leading-relaxed text-slate-600 italic font-serif">
                  The architecture spans <strong className="text-[#000666] not-italic">{plan?.phases?.length ?? '—'} phases</strong> with a focus on progressive complexity. Click any node to inspect the modular intent before initializing.
                </p>
              </div>

              {/* Bridging to Architect Wizard if Neural isn't enough */}
              <div className="pt-6 border-t border-slate-100">
                 <button 
                   onClick={() => navigate(`/create?goal=${encodeURIComponent(goal)}&track=${encodeURIComponent(track)}`)}
                   className="w-full group flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 transition-all shadow-sm"
                 >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Architecture Wizard</span>
                      <span className="text-[11px] font-black text-[#000666]">Refine with Context</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                 </button>
                 <p className="mt-3 px-2 text-[9px] text-slate-400 italic leading-relaxed">
                   Bridge to the 4-step wizard if you have a PDF syllabus or complex temporal requirements.
                 </p>
              </div>
            </aside>

            {/* Neural Canvas */}
            <div className="flex-1 relative bg-slate-50" style={{ minHeight: 0, height: '100%' }}>
               {pathMap && (
                 <NeuralSynthesizer 
                   moduleTitle={goal}
                   moduleContent={""}
                   keyConcepts={[]}
                   initialMap={pathMap}
                   onNodeClick={(node) => setSelectedNode(node)}
                 />
               )}
               
               {/* Mobile/Small Screen Bottom Actions */}
               <div className="xl:hidden absolute bottom-8 inset-x-8 flex flex-col gap-3">
                  <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-100 shadow-2xl flex items-center justify-around">
                     <button onClick={() => performGeneration('More fundamentals')} className="flex flex-col items-center gap-1">
                        <Lightbulb size={20} className="text-amber-500" />
                        <span className="text-[8px] font-black uppercase text-slate-400">Basics</span>
                     </button>
                     <button onClick={() => performGeneration('More technical')} className="flex flex-col items-center gap-1">
                        <Brain size={20} className="text-indigo-500" />
                        <span className="text-[8px] font-black uppercase text-slate-400">Deep</span>
                     </button>
                     <button onClick={() => performGeneration('More projects')} className="flex flex-col items-center gap-1">
                        <Rocket size={20} className="text-rose-500" />
                        <span className="text-[8px] font-black uppercase text-slate-400">Build</span>
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PathExplorer;
