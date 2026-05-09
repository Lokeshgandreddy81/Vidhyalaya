import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { 
  ArrowLeft, ArrowRight, Zap, Target, Sparkles, Loader2, 
  UploadCloud, FileText, X, CheckCircle, Globe, Wand2, 
  Shield, Brain, Clock, ChevronRight, ChevronLeft,
  Briefcase, GraduationCap, Layout as LayoutIcon, Rocket, Trophy
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath } = useAppStore();
  
  // --- STATE ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buildLogs, setBuildLogs] = useState<{ id: number; message: string; type: 'info' | 'success' }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);
  const [formData, setFormData] = useState<{
    goal: string;
    proficiency: string;
    skillValue: number;
    expectedOutcome: string;
    targetDate: string;
    durationDays: number;
    dailyCommitment: number;
    resources: string;
    track: string;
    motivation: string;
    cognitiveLoad: string;
    outputMode: string;
    preferredStartTime: string;
    depth: 'Foundational' | 'Expert' | 'Advanced';
  }>(() => {
    const params = new URLSearchParams(location.search);
    return {
      goal: params.get('goal') || '',
      proficiency: 'Beginner',
      skillValue: 25,
      expectedOutcome: '',
      targetDate: '',
      durationDays: 30,
      dailyCommitment: 45,
      resources: '',
      track: params.get('track') || 'Architectural Build',
      motivation: 'Project',
      cognitiveLoad: 'Balanced',
      outputMode: 'Mixed',
      preferredStartTime: '09:00',
      depth: 'Expert'
    };
  });

  useEffect(() => {
    const lib = pdfjsLib as any;
    const pdfjs = lib.getDocument ? lib : lib.default || lib;
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }
  }, []);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const lib = pdfjsLib as any;
      const pdfjs = lib.getDocument ? lib : lib.default || lib;
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer, disableWorker: true, useWorkerFetch: false });
      const pdf = await loadingTask.promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 10); 
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += `\n--- Page ${i} ---\n` + textContent.items.map((item: any) => item.str).join(' ');
      }
      return fullText;
    } catch (err) { throw new Error("Could not parse PDF."); }
  };

  const handleSearchWeb = async () => {
    if (!formData.goal) return setError("Please enter a goal first.");
    setSearchLoading(true);
    try {
      const results = await searchWebForResources(formData.goal);
      if (results && !results.includes("No resources found")) {
        setFormData(prev => ({ ...prev, resources: prev.resources + (prev.resources ? "\n\n" : "") + "--- AI Web Search ---\n" + results }));
      } else { setError("Limited resources found."); }
    } catch (err) { console.error(err); } finally { setSearchLoading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const text = (file.type === 'application/pdf' || file.name.endsWith('.pdf')) ? await extractTextFromPdf(file) : await file.text();
        setUploadedFiles([...uploadedFiles, { name: file.name, content: text }]);
        setFormData(prev => ({ ...prev, resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}` }));
      } catch (err: any) { setError(err.message); }
    }
  };

  const handleGenerate = async () => {
    setLoading(true); setError(null); setBuildLogs([]);
    const simulations = [
      { msg: 'Initializing Architectural Agents...', type: 'info' as const },
      { msg: 'Analyzing target goal and timeframe...', type: 'info' as const },
      { msg: 'Structuring modular learning phases...', type: 'success' as const },
      { msg: 'Finalizing schedule generation...', type: 'success' as const }
    ];

    // Performance improvement: Using batched timeouts to avoid sequential await microtask overhead
    let simActive = true;
    const simTimeouts = simulations.map((s, idx) => {
      return setTimeout(() => {
        if (simActive) setBuildLogs(prev => [{ id: Date.now(), message: s.msg, type: s.type }, ...prev]);
      }, (idx + 1) * 1200);
    });

    try {
      const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const planData: any = await generateLearningPlan(
        `Goal: ${formData.goal}\nTrack: ${formData.track}\nMotivation: ${formData.motivation}\nLoad: ${formData.cognitiveLoad}`,
        formData.resources, formData.dailyCommitment, formData.proficiency, '', targetDate.toISOString().split('T')[0], formData.depth
      );

      const phasesWithIds = planData.phases.map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: p.modules.map((m: any) => ({ ...m, id: generateSimpleId() }))
      }));

      const newPath: any = {
        id: generateSimpleId(), userId: 'default-user', title: planData.title || formData.goal, goal: formData.goal, createdAt: new Date().toISOString(),
        status: 'active', progress: 0, dailyCommitmentMinutes: formData.dailyCommitment,
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id, title: p.title, description: p.description, order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id, title: m.title, description: m.description, estimatedMinutes: m.estimatedMinutes, isCompleted: false,
            keyConcepts: m.keyConcepts || [], resources: [], dependsOnModuleIds: [], userNotes: ''
          }))
        })),
        sessions: [], preferredStartTime: formData.preferredStartTime
      };

      addPath(newPath);
      navigate(`/path/${newPath.id}`);
    } catch (err: any) { setError(err.message); } finally {
      setLoading(false);
      simActive = false;
      simTimeouts.forEach(clearTimeout);
    }
  };

  const handleHeroTrackSelect = (track: any) => {
    setFormData(prev => ({ ...prev, goal: track.goal, proficiency: track.proficiency, motivation: track.motivation, dailyCommitment: track.dailyCommitment }));
  };

  return (
    <div className="relative flex-1 h-full flex flex-col overflow-hidden bg-transparent">
      {/* ── Neural Atmosphere: Dynamic Mesh Gradient ────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-200/20 blur-[130px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-rose-100/10 blur-[130px]" 
        />
      </div>
      
      {/* ── Minimalist Navigation ────────────────────────────────────────── */}
      <div className="relative z-50 shrink-0 h-20 flex items-center px-10">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 rounded-full bg-white/40 backdrop-blur-xl border border-white/40 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
            <ArrowLeft size={16} strokeWidth={3} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#000666]">Architecture Wizard</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Phase {step} of 2</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 lg:p-12 relative">
        <div className="max-w-[1200px] mx-auto space-y-12">

          {loading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 max-w-2xl mx-auto">
               <div className="w-full space-y-6">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-[#000666] animate-spin opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#000666]">Synchronizing Neural Blueprint</p>
                  </div>
                  
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-8 min-h-[320px] max-h-[420px] overflow-y-auto no-scrollbar space-y-4">
                    {buildLogs.length > 0 ? buildLogs.map(log => (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-4 items-start"
                      >
                        <div className={`mt-2 h-1 w-1 shrink-0 rounded-full ${log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                        <p className="text-[13px] font-medium text-slate-600 font-['Newsreader'] italic text-left leading-relaxed">{log.message}</p>
                      </motion.div>
                    )) : (
                      <div className="h-[250px] flex flex-col items-center justify-center opacity-10">
                        <Wand2 size={48} className="text-[#000666] mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synthesizing Architecture...</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: Configuration */
            <div className="space-y-10 animate-in fade-in duration-700">
              
              {/* Intent Section */}
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="relative h-10 overflow-hidden min-w-[200px] flex items-center justify-center">
                    <div className="animate-word-reel flex flex-col absolute top-0 font-['Newsreader'] italic text-slate-400 text-2xl font-light">
                      {['I want to Master', 'I want to Architect', 'I want to Conquer', 'I want to Design', 'I want to Pioneer', 'I want to Master'].map((w, i) => (
                        <span key={i} className="h-10 flex items-center justify-center">{w}</span>
                      ))}
                    </div>
                 </div>
                 <textarea 
                   value={formData.goal}
                   onChange={(e) => setFormData({...formData, goal: e.target.value})}
                   placeholder="Enter your mastery vision..."
                   className="w-full max-w-2xl text-center text-3xl sm:text-4xl font-black tracking-tight text-[#000666] bg-transparent border-b-2 border-slate-200 focus:border-[#000666] focus:ring-0 resize-none h-16 leading-tight outline-none transition-all placeholder:text-slate-200"
                 />
              </div>

              {/* Hero Tracks: Slim Capsules */}
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { title: 'Fullstack', goal: 'Fullstack Web Specialist', prof: 'Beginner', icon: <Rocket size={13} />, color: 'text-indigo-500' },
                  { title: 'AI Logic', goal: 'AI & LLM Architecture', prof: 'Novice', icon: <Brain size={13} />, color: 'text-blue-500' },
                  { title: 'Python', goal: 'Python Data Science', prof: 'Beginner', icon: <Zap size={13} />, color: 'text-amber-500' },
                  { title: 'Data Arch', goal: 'Data Systems Architect', prof: 'Competent', icon: <Target size={13} />, color: 'text-emerald-500' },
                  { title: 'Cloud', goal: 'Cloud Orchestration', prof: 'Competent', icon: <Trophy size={13} />, color: 'text-rose-500' }
                ].map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleHeroTrackSelect({ ...t, proficiency: t.prof, motivation: 'Career', dailyCommitment: 45 })}
                    className="flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all"
                  >
                    <div className={`${t.color} shrink-0`}>{t.icon}</div>
                    <span className="text-[11px] font-bold text-slate-900">{t.title}</span>
                  </button>
                ))}
              </div>

              {/* Curriculum Architecture & Depth Selection */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[#000666]">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000666]">Curriculum Architecture</p>
                    <p className="text-[11px] font-medium text-slate-400 font-['Newsreader'] italic mt-0.5">Determine the structural depth of your learning roadmap. Every node is calculated to eliminate wasted internet searching.</p>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { id: 'Foundational' as const, label: 'Foundational', range: '3 - 5 Phases', desc: 'Core Mechanics & Rapid Acquisition', details: 'Streamlined path focused on absolute essentials. Best for hyper-focused speed builds.', icon: Rocket },
                    { id: 'Expert' as const, label: 'Expert Core', range: '5 - 15 Phases', desc: 'Methodological Depth & Systems', details: 'Deep architectural dive exploring advanced methodologies, conceptual models, and robust mechanics.', icon: Brain },
                    { id: 'Advanced' as const, label: 'Advanced Mastery', range: '15 - 20 Phases', desc: 'Full-Spectrum Architectural Design', details: 'Exhaustive academic blueprint. Absolutely nothing is wasted; covers every corner, edge-case, and theory for total dominance.', icon: Trophy }
                  ].map(depth => (
                    <button
                      key={depth.id}
                      onClick={() => setFormData({ ...formData, depth: depth.id })}
                      className={`relative flex flex-col items-start p-5 rounded-[24px] border text-left transition-all hover:scale-[1.01] ${
                        formData.depth === depth.id 
                          ? 'bg-indigo-50/20 border-indigo-200 ring-1 ring-indigo-100' 
                          : 'bg-white border-slate-100 hover:border-indigo-100'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${formData.depth === depth.id ? 'bg-[#000666] text-white' : 'bg-slate-50 text-slate-400'}`}>
                          <depth.icon size={14} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${formData.depth === depth.id ? 'text-[#000666]' : 'text-slate-400'}`}>{depth.range}</span>
                      </div>
                      <p className={`mt-4 text-[12px] font-black uppercase tracking-widest ${formData.depth === depth.id ? 'text-[#000666]' : 'text-slate-800'}`}>{depth.label}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{depth.desc}</p>
                      <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-slate-500 font-['Newsreader'] italic">{depth.details}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Matrix Grid: Minimalist Blocks */}
              <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
                {/* Profile */}
                <div className="bg-white p-6 rounded-[22px] border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Brain size={13} className="text-indigo-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Cognitive Profile</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Novice', 'Beginner', 'Competent', 'Expert'].map(l => (
                      <button key={l} onClick={() => setFormData({...formData, proficiency: l})}
                        className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all ${
                          formData.proficiency === l ? 'bg-[#000666] border-[#000666] text-white' : 'bg-slate-50/50 border-slate-50 text-slate-400 hover:border-slate-200'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                {/* Purpose */}
                <div className="bg-white p-6 rounded-[22px] border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Target size={13} className="text-rose-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Mastery Intent</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Career', 'Project', 'Academic', 'Hobby'].map(m => (
                      <button key={m} onClick={() => setFormData({...formData, motivation: m})}
                        className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all ${
                          formData.motivation === m ? 'bg-[#000666] border-[#000666] text-white' : 'bg-slate-50/50 border-slate-50 text-slate-400 hover:border-slate-200'
                        }`}>{m}</button>
                    ))}
                  </div>
                </div>
                {/* Time */}
                <div className="bg-white p-6 rounded-[22px] border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Clock size={13} className="text-amber-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Temporal Logic</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Span</span><span className="text-[#000666]">{formData.durationDays}d</span></div>
                      <input type="range" min="7" max="90" value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value)})} className="w-full h-1 bg-slate-100 accent-[#000666] cursor-pointer" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Daily Ritual</span><span className="text-[#000666]">{formData.dailyCommitment}m</span></div>
                      <input type="range" min="15" max="120" step="5" value={formData.dailyCommitment} onChange={e => setFormData({...formData, dailyCommitment: parseInt(e.target.value)})} className="w-full h-1 bg-slate-100 accent-[#000666] cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button: Refined */}
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!formData.goal}
                  className="group flex items-center gap-8 rounded-full bg-[#000666] px-10 py-4 text-white shadow-xl transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-20"
                >
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest">Next Phase</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </button>
              </div>

            </div>
          ) : (
            /* Step 2: Resources & Files — Ultra Clean */
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-700 max-w-5xl mx-auto w-full flex flex-col items-center">
               
               <div className="w-full text-center space-y-2 mb-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Resource Synthesis</h3>
                  <p className="text-[12px] font-medium text-slate-500 font-['Newsreader'] italic opacity-70">
                    Inject context to engineer a high-yield architectural learning roadmap.
                  </p>
               </div>

               <div className="w-full grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  {/* Synthesis Input */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Direct Input</span>
                      <button onClick={handleSearchWeb} disabled={searchLoading}
                        className="group/scout relative flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/40 backdrop-blur-2xl border border-white/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-[#000666] transition-all duration-500 shadow-sm overflow-hidden"
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover/scout:opacity-100 transition-opacity duration-700 pointer-events-none">
                          <div className="absolute -inset-x-10 top-0 h-full w-10 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent skew-x-[25deg] animate-[shine_3s_infinite]" />
                        </div>
                        
                        {/* Glow Aura */}
                        <div className="absolute inset-0 rounded-full bg-[#000666]/5 opacity-0 group-hover/scout:opacity-100 transition-opacity duration-500 blur-md" />

                        {searchLoading ? (
                          <Loader2 size={13} className="animate-spin text-[#000666]" />
                        ) : (
                          <div className="relative z-10 flex items-center gap-2">
                            <Globe size={13} className="group-hover/scout:rotate-[20deg] transition-transform duration-500" />
                            <span className="relative">
                              AI Web Scout
                              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-[#000666] transition-all duration-500 group-hover/scout:w-full" />
                            </span>
                          </div>
                        )}
                        
                        {/* Pulsing Sparkle for attention */}
                        {!searchLoading && (
                          <div className="absolute right-2 top-2 w-1 h-1 rounded-full bg-indigo-400 animate-ping opacity-60" />
                        )}
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-[#000666]/5 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                      <textarea 
                        value={formData.resources} 
                        onChange={e => setFormData({...formData, resources: e.target.value})} 
                        placeholder="Paste curriculum details, course links, or raw text..."
                        className="relative z-10 w-full h-[320px] bg-white/60 backdrop-blur-2xl border border-white/50 rounded-[32px] p-8 text-[14px] font-medium text-slate-700 outline-none focus:bg-white/80 transition-all shadow-sm placeholder:text-slate-300 no-scrollbar resize-none" 
                      />
                    </div>
                  </div>

                  {/* Context Files */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-2">Neural Context</span>
                    <label className="flex flex-col items-center justify-center h-44 bg-white/40 backdrop-blur-xl border border-dashed border-slate-300 rounded-[32px] cursor-pointer hover:bg-white/60 hover:border-indigo-300 transition-all group shadow-sm">
                       <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                       <UploadCloud size={28} className="text-slate-400 group-hover:text-[#000666] transition-all mb-2" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#000666]">Upload Blueprint</span>
                    </label>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pt-2">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-white/50 p-4 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-lg bg-[#000666] flex items-center justify-center text-white shadow-lg shadow-indigo-900/10">
                              <FileText size={14} />
                            </div>
                            <span className="text-[11px] font-black text-slate-700 truncate">{f.name}</span>
                          </div>
                          <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="w-full flex items-center justify-between pt-6">
                  <button onClick={() => setStep(1)} className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/40 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                    <ChevronLeft size={16} strokeWidth={3} /> Back
                  </button>
                  <button 
                    onClick={handleGenerate} 
                    className="group flex items-center gap-10 rounded-full bg-[#000666] px-10 py-5 text-white shadow-[0_20px_48px_-12px_rgba(0,6,102,0.4)] transition-all hover:scale-[1.03] active:scale-95"
                  >
                    <div className="text-left">
                      <p className="text-[12px] font-black uppercase tracking-[0.2em]">Build Roadmap</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Zap size={20} fill="currentColor" />
                    </div>
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreatePath;
