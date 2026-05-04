import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [formData, setFormData] = useState(() => {
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
      preferredStartTime: '09:00'
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
    let simActive = true;
    (async () => {
      for (let s of simulations) {
        if (!simActive) break;
        await new Promise(r => setTimeout(r, 1200));
        if (simActive) setBuildLogs(prev => [{ id: Date.now(), message: s.msg, type: s.type }, ...prev]);
      }
    })();

    try {
      const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const planData: any = await generateLearningPlan(
        `Goal: ${formData.goal}\nTrack: ${formData.track}\nMotivation: ${formData.motivation}\nLoad: ${formData.cognitiveLoad}`,
        formData.resources, formData.dailyCommitment, formData.proficiency, '', targetDate.toISOString().split('T')[0]
      );

      const phasesWithIds = planData.phases.map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: p.modules.map((m: any) => ({ ...m, id: generateSimpleId() }))
      }));

      const newPath: any = {
        id: generateSimpleId(), title: planData.title || formData.goal, goal: formData.goal, createdAt: new Date().toISOString(),
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
    } catch (err: any) { setError(err.message); } finally { setLoading(false); simActive = false; }
  };

  const handleHeroTrackSelect = (track: any) => {
    setFormData(prev => ({ ...prev, goal: track.goal, proficiency: track.proficiency, motivation: track.motivation, dailyCommitment: track.dailyCommitment }));
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#f5f6fa] overflow-hidden">
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-20 bg-white border-b border-slate-100 px-6 sm:px-10 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-400 leading-none mb-1.5">Architecture Wizard</p>
            <h1 className="text-[18px] font-black text-slate-900 tracking-tight">Configure Path</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Step {step} of 2</span>
            <div className="w-32 h-1.5 bg-slate-50 rounded-full overflow-hidden ring-1 ring-slate-100">
              <div className="h-full bg-[#000666] transition-all duration-700" style={{ width: `${(step / 2) * 100}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 lg:p-12 relative">
        <div className="max-w-[1200px] mx-auto space-y-12">

          {loading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6">
               <div className="w-full max-w-[500px] space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#000666] animate-pulse">Building Neural Universe</p>
                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-white rounded-[24px] border-2 border-slate-100 shadow-sm p-6 min-h-[300px] max-h-[400px] overflow-y-auto custom-scrollbar space-y-3">
                    {buildLogs.length > 0 ? buildLogs.map(log => (
                      <div key={log.id} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-300">
                        <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                        <p className="text-[12px] font-bold text-slate-700 font-['Newsreader'] italic">{log.message}</p>
                      </div>
                    )) : (
                      <div className="h-[250px] flex flex-col items-center justify-center opacity-20">
                        <Wand2 size={48} className="text-[#000666] mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Synthesizing...</p>
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

              {/* Hero Tracks */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: 'Fullstack', goal: 'Fullstack Web Specialist', prof: 'Beginner', icon: <Rocket size={16} />, color: 'text-indigo-500' },
                  { title: 'AI Logic', goal: 'AI & LLM Architecture', prof: 'Novice', icon: <Brain size={16} />, color: 'text-blue-500' },
                  { title: 'Python', goal: 'Python Data Science', prof: 'Beginner', icon: <Zap size={16} />, color: 'text-amber-500' },
                  { title: 'Data Arch', goal: 'Data Systems Architect', prof: 'Competent', icon: <Target size={16} />, color: 'text-emerald-500' },
                  { title: 'Cloud', goal: 'Cloud Orchestration', prof: 'Competent', icon: <Trophy size={16} />, color: 'text-rose-500' }
                ].map((t, i) => (
                  <button key={i} onClick={() => handleHeroTrackSelect({ ...t, proficiency: t.prof, motivation: 'Career', dailyCommitment: 45 })}
                    className="p-5 rounded-[24px] bg-white border-2 border-slate-50 hover:border-indigo-100 hover:shadow-sm transition-all text-left group">
                    <div className={`${t.color} mb-3`}>{t.icon}</div>
                    <p className="text-[13px] font-black text-slate-900 leading-tight">{t.title}</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Blueprint</p>
                  </button>
                ))}
              </div>

              {/* Matrix Grid */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Profile */}
                <div className="bg-white p-7 rounded-[24px] border-2 border-slate-50 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <Brain size={16} className="text-indigo-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Cognitive Profile</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Novice', 'Beginner', 'Competent', 'Expert'].map(l => (
                      <button key={l} onClick={() => setFormData({...formData, proficiency: l})}
                        className={`py-3 rounded-[14px] text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all ${
                          formData.proficiency === l ? 'bg-[#000666] border-[#000666] text-white shadow-sm' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                {/* Purpose */}
                <div className="bg-white p-7 rounded-[24px] border-2 border-slate-50 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <Target size={16} className="text-rose-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Purpose</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Career', 'Project', 'Academic', 'Hobby'].map(m => (
                      <button key={m} onClick={() => setFormData({...formData, motivation: m})}
                        className={`py-3 rounded-[14px] text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all ${
                          formData.motivation === m ? 'bg-[#000666] border-[#000666] text-white shadow-sm' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'
                        }`}>{m}</button>
                    ))}
                  </div>
                </div>
                {/* Time */}
                <div className="bg-white p-7 rounded-[24px] border-2 border-slate-50 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-amber-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000666]">Temporal Logic</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"><span>Span</span><span className="text-[#000666]">{formData.durationDays}d</span></div>
                      <input type="range" min="7" max="90" value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value)})} className="w-full h-1 bg-slate-100 accent-[#000666] cursor-pointer" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"><span>Daily Ritual</span><span className="text-[#000666]">{formData.dailyCommitment}m</span></div>
                      <input type="range" min="15" max="120" step="5" value={formData.dailyCommitment} onChange={e => setFormData({...formData, dailyCommitment: parseInt(e.target.value)})} className="w-full h-1 bg-slate-100 accent-[#000666] cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-center pt-6">
                <button onClick={() => setStep(2)} disabled={!formData.goal}
                  className="group flex items-center gap-12 rounded-[24px] bg-[#000666] px-12 py-5 text-white shadow-[0_20px_40px_-10px_rgba(0,6,102,0.4)] transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-30">
                  <div className="text-left"><p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Neural Assembly</p><p className="text-[13px] font-black uppercase tracking-widest">Next Phase</p></div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20"><ChevronRight size={20} /></div>
                </button>
              </div>

            </div>
          ) : (
            /* Step 2: Resources & Files */
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-700">
               <div className="bg-white p-8 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Resource Context</h3>
                      <p className="text-[12px] font-medium text-slate-400 font-['Newsreader'] italic mt-1">Provide background data for the synthesis engine.</p>
                    </div>
                    <button onClick={handleSearchWeb} disabled={searchLoading}
                      className="flex items-center gap-2 px-6 py-3 rounded-[16px] border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest text-[#000666] hover:bg-slate-50 transition-all">
                      {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} AI Web Scout
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <textarea value={formData.resources} onChange={e => setFormData({...formData, resources: e.target.value})} placeholder="Paste curriculum details, course links, or raw text..."
                      className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-[20px] p-6 text-[13px] font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-100 transition-all resize-none placeholder:text-slate-200" />
                    <div className="space-y-4">
                      <label className="flex flex-col items-center justify-center h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] cursor-pointer hover:bg-white hover:border-indigo-200 transition-all group">
                         <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                         <UploadCloud size={32} className="text-slate-300 group-hover:text-indigo-400 transition-all mb-2" />
                         <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Context Files</span>
                      </label>
                      <div className="space-y-2 max-h-[110px] overflow-y-auto scrollbar-none">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-white border-2 border-slate-50 p-3 rounded-[14px]">
                            <div className="flex items-center gap-2 truncate"><FileText size={14} className="text-indigo-400" /><span className="text-[11px] font-bold text-slate-600 truncate">{f.name}</span></div>
                            <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>

               <div className="flex items-center justify-between">
                  <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button onClick={handleGenerate} className="group flex items-center gap-12 rounded-[24px] bg-[#000666] px-12 py-5 text-white shadow-[0_20px_40px_-10px_rgba(0,6,102,0.4)] transition-all hover:scale-[1.03] active:scale-95">
                    <div className="text-left"><p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Deployment</p><p className="text-[13px] font-black uppercase tracking-widest">Build Roadmap</p></div>
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20"><Zap size={20} fill="currentColor" /></div>
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
