import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { generateLearningPlan } from '../services/geminiService';
import NeuralSynthesizer, { ConceptMap, ConceptNode } from './NeuralSynthesizer';
import { 
  ArrowLeft, Sparkles, Zap, 
  RotateCcw, Check, Brain, 
  Trophy, Rocket, Lightbulb,
  ArrowRight, Maximize2, Minimize2, Loader,
  Target, Info, RefreshCw
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

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const performGeneration = async (intentModifier: string = '') => {
    setIsLoading(true);
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
    <div className={`flex flex-col bg-[#f5f6fa] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[1000]' : 'flex-1 h-full'}`}>
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-16 bg-white border-b border-slate-100 px-5 sm:px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 leading-none mb-1">Previewing Neural Roadmap</p>
            <h1 className="text-[15px] font-black text-slate-900 truncate max-w-[400px]">{goal}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-xl border-2 border-slate-50 text-slate-400 hover:text-[#000666] transition-all">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {!isLoading && !error && (
            <button onClick={handleInitialize} className="flex items-center gap-2.5 px-6 py-2.5 bg-[#000666] text-white rounded-[14px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] active:scale-95 transition-all">
              <Check size={14} strokeWidth={3} /> Initialize Path
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        
        {/* Left Sidebar: Controls */}
        <aside className={`w-[320px] shrink-0 border-r border-slate-100 bg-white overflow-y-auto custom-scrollbar p-6 space-y-8 hidden xl:block transition-all ${isFullscreen ? 'ml-[-320px]' : ''}`}>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Refine Architecture</p>
            <div className="grid gap-2">
              {[
                { id: 'fundamental', label: 'More Fundamentals', icon: Lightbulb, color: 'text-amber-500' },
                { id: 'deep', label: 'Deeper Technicals', icon: Brain, color: 'text-indigo-500' },
                { id: 'practical', label: 'Project Focused', icon: Rocket, color: 'text-rose-500' },
                { id: 'exam', label: 'Certification Prep', icon: Trophy, color: 'text-emerald-500' },
              ].map(opt => (
                <button key={opt.id} onClick={() => performGeneration(`Adjust the curriculum to be more ${opt.label.toLowerCase()}.`)}
                  className="w-full flex items-center justify-between p-3.5 rounded-[16px] border-2 border-slate-50 hover:border-indigo-100 hover:bg-slate-50/50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white ring-1 ring-slate-100 shadow-sm ${opt.color}`}><opt.icon size={14} /></div>
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#000666]">{opt.label}</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Custom Calibration</p>
            <div className="relative">
              <textarea value={customIntent} onChange={(e) => setCustomIntent(e.target.value)} placeholder="e.g. Add more hands-on labs..."
                className="w-full h-28 p-4 rounded-[18px] bg-slate-50 border-2 border-slate-100 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all resize-none placeholder:text-slate-300" />
              <button onClick={() => customIntent.trim() && performGeneration(customIntent)}
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#000666] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {selectedNode && (
            <div className="p-4 rounded-[18px] bg-indigo-50/40 border-2 border-indigo-100/50 animate-in slide-in-from-bottom-2">
              <h4 className="text-[12px] font-black text-[#000666] mb-1.5">{selectedNode.label}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium font-['Newsreader'] italic">{selectedNode.description}</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
             <button onClick={() => navigate(`/create?goal=${encodeURIComponent(goal)}&track=${encodeURIComponent(track)}`)}
               className="w-full group flex items-center justify-between p-4 rounded-[18px] bg-slate-50 border-2 border-slate-100 hover:border-indigo-200 transition-all">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Context Wizard</span>
                  <span className="text-[11px] font-black text-[#000666]">Refine with Files</span>
                </div>
                <ArrowRight size={16} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
             </button>
          </div>
        </aside>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-[#f5f6fa]">
          {isLoading ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#f5f6fa]/80 backdrop-blur-sm">
               <div className="w-full max-w-[600px] space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#000666] animate-pulse">Neural Synthesis Active</p>
                    <Loader size={16} className="text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-white rounded-[24px] border-2 border-slate-100 shadow-sm p-6 min-h-[300px] max-h-[400px] overflow-y-auto custom-scrollbar space-y-3">
                    {agentLogs.length > 0 ? agentLogs.map(log => (
                      <div key={log.id} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-300">
                        <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                        <p className="text-[12px] font-bold text-slate-700 font-['Newsreader'] italic">{log.msg}</p>
                      </div>
                    )) : (
                      <div className="h-[250px] flex flex-col items-center justify-center opacity-20">
                        <Brain size={48} className="text-[#000666] mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Waking Agent...</p>
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
               <button onClick={() => performGeneration()} className="flex items-center gap-2 px-8 py-3.5 bg-[#000666] text-white rounded-[16px] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:scale-[1.02] transition-all">
                  <RefreshCw size={14} /> Retry Synthesis
               </button>
            </div>
          ) : (
            <div className="w-full h-full p-4 sm:p-6 animate-in fade-in duration-700">
               <div className="w-full h-full bg-white rounded-[24px] ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  {pathMap && <NeuralSynthesizer moduleTitle={goal} moduleContent={""} keyConcepts={[]} initialMap={pathMap} onNodeClick={(n) => setSelectedNode(n)} />}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PathExplorer;
