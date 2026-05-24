import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { generateLearningPlan } from '../services/geminiService';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from '../features/study/NeuralSynthesizer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, Zap, 
  RotateCcw, Check, Brain, 
  Trophy, Rocket, Lightbulb,
  ArrowRight, Maximize2, Minimize2, Loader,
  Target, Info, RefreshCw, X
} from 'lucide-react';

const PathExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPath } = useAppStore();
  
  const goal = searchParams.get('goal') || 'New Knowledge Path';
  const track = searchParams.get('track') || 'Custom Roadmap';

  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(12.00);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [pathMap, setPathMap] = useState<ConceptMap | null>(null);
  const [agentLogs, setAgentLogs] = useState<{id: number, msg: string, type: 'info' | 'success'}[]>([]);
  const [customIntent, setCustomIntent] = useState('');
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error entering native fullscreen:", err);
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Error exiting native fullscreen:", err);
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.01) {
          clearInterval(interval);
          return 0;
        }
        return Math.round((prev - 0.01) * 100) / 100;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [isLoading]);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const performGeneration = async (intentModifier: string = '') => {
    setIsLoading(true);
    setTimeLeft(12.00);
    setError(null);
    setSelectedNode(null);
    setAgentLogs([]);
    
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
    let timeAccumulator = 0;
    const simTimeouts = simulations.map((sim) => {
      timeAccumulator += 1000 + Math.random() * 500;
      return setTimeout(() => {
        if (simulationActive) {
          setAgentLogs(prev => [{ id: Date.now(), msg: sim.msg, type: sim.type }, ...prev]);
        }
      }, timeAccumulator);
    });

    try {
      const planData = await generateLearningPlan(
        `Goal: ${goal}\nTrack: ${track}${intentModifier ? `\nINTENT: ${intentModifier}` : ''}`,
        '', 45, 'beginner', 'Mastery', new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      );

      if (!planData || !planData.phases) throw new Error("Failed to generate blueprint.");

      setPlan(planData);
      const nodes: ConceptNode[] = [{ id: 'root', label: planData.title || goal, description: planData.description || 'Mastery Path', depth: 0 }];
      const relationships: any[] = [];

      planData.phases.forEach((phase: any, pIdx: number) => {
        const phaseId = `phase-${pIdx}`;
        nodes.push({ id: phaseId, label: phase.title, description: phase.description || '', depth: 1, parentId: 'root' });
        relationships.push({ from: 'root', to: phaseId, label: 'phase' });
        phase.modules.forEach((mod: any, mIdx: number) => {
          const modId = `mod-${pIdx}-${mIdx}`;
          nodes.push({ id: modId, label: mod.title, description: mod.description || '', depth: 2, parentId: phaseId });
          relationships.push({ from: phaseId, to: modId, label: 'module' });
        });
      });

      setPathMap({ centralConcept: planData.title || goal, nodes, relationships });
      simulationActive = false;
      simTimeouts.forEach(clearTimeout);
      setTimeout(() => setIsLoading(false), 500);
    } catch (err: any) {
      simulationActive = false;
      simTimeouts.forEach(clearTimeout);
      setError(err?.message || 'Synthesis failed. Please try again.');
      setIsLoading(false);
    } finally {
      simulationActive = false;
      simTimeouts.forEach(clearTimeout);
    }
  };

  useEffect(() => { performGeneration(); }, [goal, track]);

  const handleInitialize = () => {
    if (!plan) return;
    const phasesWithIds = plan.phases.map((phase: any) => ({
      ...phase,
      id: generateSimpleId(),
      modules: phase.modules.map((mod: any) => ({
        ...mod, id: generateSimpleId(), isCompleted: false, keyConcepts: mod.keyConcepts || [],
        resources: [], dependsOnModuleIds: [], userNotes: '', estimatedMinutes: mod.estimatedMinutes || 30
      }))
    }));
    const newPath: any = {
      id: generateSimpleId(), userId: 'default-user', title: plan.title || goal, goal, expectedOutcome: 'Mastery',
      targetDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(), dailyCommitmentMinutes: 45, status: 'active', progress: 0,
      phases: phasesWithIds.map((p: any, i: number) => ({ id: p.id, title: p.title, description: p.description, order: i + 1, modules: p.modules })),
      sessions: [], preferredStartTime: '09:00'
    };
    addPath(newPath);
    navigate(`/path/${newPath.id}`);
  };

  return (
    <div ref={containerRef} className={`flex flex-col bg-transparent overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white' : 'flex-1 h-full'}`}>
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-16 bg-white/80 backdrop-blur-md border-b border-black/[0.04] px-5 sm:px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-[#4e5bff] hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 leading-none mb-1">Previewing Neural Roadmap</p>
            <h1 className="text-[15px] font-black text-slate-900 truncate max-w-[400px]">{goal}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleFullscreenToggle} className="p-2 rounded-xl border-2 border-slate-50 text-slate-400 hover:text-[#4e5bff] transition-all">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {!isLoading && !error && (
            <button onClick={handleInitialize} className="flex items-center gap-2.5 px-6 py-2.5 bg-[#4e5bff] text-white rounded-[14px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] active:scale-95 transition-all">
              <Check size={14} strokeWidth={3} /> Initialize Path
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        
        {/* Main Canvas */}
        <div className="flex-1 relative bg-transparent overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-transparent backdrop-blur-[6px] animate-in fade-in duration-300">
               <div className="flex flex-col items-center mb-7 text-center">
                 <div className="relative flex items-center justify-center mb-5">
                   {/* Glowing aura background */}
                   <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl animate-pulse" />
                   
                   {/* SVG Circular Loader */}
                   <svg className="w-28 h-28 transform -rotate-90 z-10" viewBox="0 0 100 100">
                     <circle
                       cx="50"
                       cy="50"
                       r="44"
                       stroke="rgba(78, 91, 255, 0.08)"
                       strokeWidth="4.5"
                       fill="transparent"
                     />
                     <motion.circle
                       cx="50"
                       cy="50"
                       r="44"
                       stroke="url(#progress-gradient)"
                       strokeWidth="5.5"
                       fill="transparent"
                       strokeDasharray={2 * Math.PI * 44}
                       strokeDashoffset={2 * Math.PI * 44 - ((12.00 - timeLeft) / 12.00) * 2 * Math.PI * 44}
                       strokeLinecap="round"
                       transition={{ duration: 0.05 }}
                     />
                     <defs>
                       <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor="#4e5bff" />
                         <stop offset="100%" stopColor="#8b5cf6" />
                       </linearGradient>
                     </defs>
                   </svg>

                   {/* Center millisecond timer */}
                   <div className="absolute flex flex-col items-center justify-center z-20">
                     <Sparkles size={14} className="text-[#4e5bff] animate-pulse mb-0.5" />
                     <span className="text-[20px] font-black tracking-tight text-slate-800 font-mono leading-none">
                       {timeLeft.toFixed(2)}
                     </span>
                     <span className="text-[7.5px] font-black uppercase tracking-widest text-[#4e5bff] mt-0.5">
                       Secs
                     </span>
                   </div>
                 </div>

                 <div>
                   <h3 className="text-lg font-black tracking-tight text-slate-800">
                     Synthesizing Neural Path
                   </h3>
                   <p className="text-[11px] font-bold text-slate-400 mt-1 animate-pulse uppercase tracking-[0.2em]">
                     Cortex AI is compiling modular checkpoints
                   </p>
                 </div>
               </div>

               <div className="flex flex-col w-full max-w-[620px] space-y-3 z-10 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between px-3">
                   <p className="text-[9.5px] font-black uppercase tracking-[0.3em] text-[#4e5bff] flex items-center gap-1.5 leading-none">
                     <Brain size={11} /> Agent Activity Logs
                   </p>
                   <div className="flex items-center gap-2">
                     <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                     <span className="text-[9.5px] font-bold text-slate-400">Processing...</span>
                   </div>
                 </div>
                 
                 <div
                   style={{
                     background: 'rgba(255, 255, 255, 0.78)',
                     border: '1.5px solid rgba(26, 115, 232, 0.12)',
                     boxShadow: '0 12px 36px rgba(26, 115, 232, 0.04), 0 4px 12px rgba(0, 0, 0, 0.01)',
                     backdropFilter: 'blur(20px)',
                     WebkitBackdropFilter: 'blur(20px)',
                   }}
                   className="rounded-[24px] p-6 min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-3"
                 >
                   {agentLogs.length > 0 ? agentLogs.map((log) => (
                     <div key={log.id} className="flex gap-3.5 items-start animate-in slide-in-from-left-2 duration-300">
                       <div className={`mt-1.5 h-1.8 w-1.8 shrink-0 rounded-full ${log.type === 'success' ? 'bg-emerald-400 ring-4 ring-emerald-400/10' : 'bg-[#4e5bff] ring-4 ring-[#4e5bff]/10'}`} />
                       <p className="text-[12.5px] font-semibold text-slate-800 leading-snug font-['Newsreader'] italic">
                         {log.msg}
                       </p>
                     </div>
                   )) : (
                     <div className="h-[180px] flex flex-col items-center justify-center opacity-30">
                       <Brain size={36} className="text-[#4e5bff] animate-bounce mb-2" />
                       <p className="text-[9.5px] font-black uppercase tracking-widest text-[#4e5bff]">Waking Neural Agent...</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-10 text-center">
               <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border-2 border-rose-100">
                  <RotateCcw size={32} />
               </div>
               <h2 className="text-xl font-black text-slate-900 mb-2">Synthesis Interrupted</h2>
               <p className="max-w-xs text-[13px] text-slate-500 mb-6 font-medium leading-relaxed">{error}</p>
               <button onClick={() => performGeneration()} className="flex items-center gap-2 px-8 py-3.5 bg-[#4e5bff] text-white rounded-[16px] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] transition-all">
                  <RefreshCw size={14} /> Retry Synthesis
               </button>
            </div>
          ) : (
            <div className="w-full h-full p-4 sm:p-6 animate-in fade-in duration-700 relative">
               <div className="w-full h-full bg-white rounded-[24px] ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  {pathMap && (
                     <NeuralSynthesizer
                       moduleTitle={goal}
                       moduleContent={""}
                       keyConcepts={[]}
                       initialMap={pathMap}
                       onNodeClick={(n) => setSelectedNode(n)}
                       onTuneRoadmapClick={() => setIsPanelOpen(true)}
                       isFullScreen={isFullscreen}
                       onFullScreenToggle={handleFullscreenToggle}
                     />
                   )}
               </div>
               
               {/* Centered Floating Initialize Path CTA */}
               {!isLoading && !error && plan && (
                 <motion.div
                   initial={{ opacity: 0, y: 30, scale: 0.9 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0.3 }}
                   className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50"
                 >
                   <button 
                     onClick={handleInitialize}
                     className="group flex items-center gap-3 px-10 py-4 bg-[#4e5bff] text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_12px_40px_-8px_rgba(78,91,255,0.5)] hover:shadow-[0_16px_50px_-6px_rgba(78,91,255,0.65)] hover:scale-[1.04] active:scale-95 transition-all duration-300 border border-indigo-400/20"
                   >
                     <div className="relative">
                       <Check size={16} strokeWidth={3} className="relative z-10" />
                       <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse" />
                     </div>
                     <span>Initialize Path</span>
                     <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                 </motion.div>
               )}

               {/* Floating Node Inspector HUD Card (Bottom-Left) */}
               {selectedNode && (
                 <div className="absolute bottom-10 left-10 z-30 max-w-sm p-5 rounded-[24px] bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_20px_40px_rgba(78,91,255,0.08)] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                   <div className="flex items-start gap-3.5">
                     <div className="p-2.5 rounded-xl bg-indigo-50/80 text-[#4e5bff] shrink-0">
                       <Brain size={16} />
                     </div>
                     <div>
                       <h4 className="text-[13px] font-black text-slate-900 mb-1.5">{selectedNode.label}</h4>
                       <p className="text-[11px] leading-relaxed text-slate-500 font-medium font-['Newsreader'] italic">{selectedNode.description}</p>
                     </div>
                   </div>
                 </div>
               )}

               {/* Floating Glass Calibration Hub Panel */}
               <AnimatePresence>
                 {isPanelOpen && (
                   <motion.div
                     initial={{ x: 360, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: 360, opacity: 0 }}
                     transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                     className="absolute top-6 right-6 bottom-6 z-40 w-[320px] bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.12)] rounded-[26px] flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar pointer-events-auto"
                   >
                     {/* Header */}
                     <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
                       <div className="flex items-center gap-2">
                         <Sparkles size={14} className="text-[#4e5bff] animate-pulse" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#4e5bff]">Tune Roadmap</p>
                       </div>
                       <button 
                         onClick={() => setIsPanelOpen(false)}
                         className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                       >
                         <X size={15} />
                       </button>
                     </div>

                     {/* Refine Architecture Option Cards */}
                     <div className="space-y-4">
                       <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Refine Architecture</p>
                       <div className="grid gap-2">
                         {[
                           { id: 'fundamental', label: 'More Fundamentals', icon: Lightbulb, color: 'text-amber-500' },
                           { id: 'deep', label: 'Deeper Technicals', icon: Brain, color: 'text-indigo-500' },
                           { id: 'practical', label: 'Project Focused', icon: Rocket, color: 'text-rose-500' },
                           { id: 'exam', label: 'Certification Prep', icon: Trophy, color: 'text-emerald-500' },
                         ].map(opt => (
                           <button key={opt.id} onClick={() => performGeneration(`Adjust the curriculum to be more ${opt.label.toLowerCase()}.`)}
                             className="w-full flex items-center justify-between p-3.5 rounded-[16px] border border-black/[0.04] bg-white/50 hover:border-indigo-100 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all text-left group cursor-pointer animate-in fade-in duration-200">
                             <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg bg-white ring-1 ring-slate-100 shadow-sm ${opt.color}`}><opt.icon size={13} /></div>
                               <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-[#4e5bff]">{opt.label}</span>
                             </div>
                               <ArrowRight size={13} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all animate-pulse" />
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Custom Calibration Section */}
                     <div className="space-y-3">
                       <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Custom Calibration</p>
                       <div className="relative">
                         <textarea value={customIntent} onChange={(e) => setCustomIntent(e.target.value)} placeholder="e.g. Add more hands-on labs..."
                           className="w-full h-24 p-3.5 rounded-[18px] bg-slate-50/50 border border-black/[0.04] text-[10.5px] font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all resize-none placeholder:text-slate-300" />
                         <button onClick={() => customIntent.trim() && performGeneration(customIntent)}
                           className="absolute bottom-2.5 right-2.5 w-7.5 h-7.5 rounded-full bg-[#4e5bff] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all cursor-pointer">
                           <ArrowRight size={13} />
                         </button>
                       </div>
                     </div>

                     {/* Context Wizard Link Footer */}
                     <div className="pt-4 border-t border-black/[0.04] mt-auto">
                        <button onClick={() => navigate(`/create?goal=${encodeURIComponent(goal)}&track=${encodeURIComponent(track)}`)}
                          className="w-full group flex items-center justify-between p-3.5 rounded-[18px] bg-slate-50/50 border border-black/[0.04] hover:border-indigo-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
                           <div className="flex flex-col items-start">
                             <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Context Wizard</span>
                             <span className="text-[10.5px] font-black text-[#4e5bff]">Refine with Files</span>
                           </div>
                           <ArrowRight size={14} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                        </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PathExplorer;
