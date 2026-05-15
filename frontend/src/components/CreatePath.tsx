import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { 
  ArrowLeft, ArrowRight, Zap, Loader2, 
  UploadCloud, FileText, X, Globe, Sidebar, Search,
  Layout as LayoutIcon, Brain, Rocket, Cloud
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Ultra-Compact Setting Chip
const SettingChip = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) => {
  return (
    <div className="relative inline-flex items-center justify-center bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all cursor-pointer shadow-sm group">
      <span className="text-slate-400 mr-1.5 font-medium">{label}</span>
      <span className="text-slate-700">{value}</span>
      <select 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
};

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

      const phasesWithIds = (planData.phases || []).map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: (p.modules || []).map((m: any) => ({ ...m, id: generateSimpleId() }))
      }));

      const newPath: any = {
        id: generateSimpleId(), userId: 'default-user', title: planData.title || formData.goal, goal: formData.goal, createdAt: new Date().toISOString(),
        status: 'active', progress: 0, dailyCommitmentMinutes: formData.dailyCommitment,
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id, title: p.title, description: p.description, order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id, title: m.title, description: m.description, estimatedMinutes: m.estimatedMinutes, isCompleted: false,
            keyConcepts: m.keyConcepts || [], 
            resources: (m.suggestedResources || []).map((sr: any) => {
              if (!sr || !sr.url) return null;
              const isYoutube = sr.url.includes('youtube.com') || sr.url.includes('youtu.be');
              let videoId = undefined;
              if (isYoutube) {
                if (sr.url.includes('v=')) videoId = sr.url.split('v=')[1]?.split('&')[0];
                else videoId = sr.url.split('/').pop();
              }
              return {
                id: generateSimpleId(),
                type: isYoutube ? 'youtube' : 'url',
                content: sr.url,
                title: sr.title || 'Untitled Resource',
                videoId
              };
            }).filter(Boolean),
            dependsOnModuleIds: [], userNotes: ''
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

  const suggestionCards = [
    { title: 'Fullstack Systems', subtitle: 'React, Node, DBs', icon: <LayoutIcon size={16} />, goal: 'Fullstack Web Specialist' },
    { title: 'AI Architecture', subtitle: 'LLMs, Vectors, Agents', icon: <Brain size={16} />, goal: 'AI & LLM Architecture' },
    { title: 'Data Science', subtitle: 'Python, ML, Pandas', icon: <Rocket size={16} />, goal: 'Python Data Science Mastery' },
    { title: 'Cloud Infrastructure', subtitle: 'AWS, Docker, K8s', icon: <Cloud size={16} />, goal: 'Cloud Orchestration & DevOps' }
  ];

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center font-inter bg-[#eff6ff] overflow-hidden">
      {/* ── Vibrant Fluid Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute -top-40 -left-40 w-[80vw] h-[80vw] bg-[#a5f3fc] rounded-full mix-blend-multiply filter blur-[150px] opacity-80 animate-blob"></div>
         <div className="absolute top-20 -right-40 w-[70vw] h-[70vw] bg-[#93c5fd] rounded-full mix-blend-multiply filter blur-[150px] opacity-80 animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-40 left-20 w-[80vw] h-[80vw] bg-[#6ee7b7] rounded-full mix-blend-multiply filter blur-[150px] opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* ── Central App Window ── */}
      <div className="relative z-10 w-[95vw] max-w-[1200px] h-[90vh] bg-white/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-white/40">
        
        {/* Top Header Row (Mimics App Topbar) */}
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-100 bg-white/50">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50">
            <Sidebar size={18} strokeWidth={2} />
          </button>
          <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Phase {step} of 2
          </span>
          <button onClick={() => step === 2 && setStep(1)} className={`text-slate-500 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50 ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
             <ArrowLeft size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
          
          {/* Scrollable Canvas */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center p-6">
            <div className="w-full max-w-3xl flex-1 flex flex-col justify-center py-10">
              
              {loading ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Synthesizing Architecture...</h2>
                  
                  <div className="w-full max-w-sm space-y-4 text-left mt-8">
                    {buildLogs.length > 0 && buildLogs.map(log => (
                      <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                        <span className="text-sm font-medium text-slate-600">{log.message}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : step === 1 ? (
                /* Step 1: Centered Welcome & Suggestions */
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center space-y-8">
                  
                  {/* Perfectly Centered Title */}
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">What do you want to learn today?</h1>
                  </div>

                  {/* Functional Suggestion Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl px-4">
                    {suggestionCards.map((card, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setFormData({...formData, goal: card.goal})}
                        className="flex items-center gap-3 p-3 rounded-[1rem] border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left group shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all shrink-0">
                           {card.icon}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{card.title}</div>
                          <div className="text-xs font-medium text-slate-500">{card.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                </motion.div>
              ) : (
                /* Step 2: Context Provision */
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 w-full">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><FileText size={20} className="text-slate-700" /></div>
                     <div>
                       <h2 className="text-xl font-bold text-slate-800">Resource Synthesis</h2>
                       <p className="text-sm text-slate-500">Provide documentation, syllabi, or specific links.</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Context Window</span>
                       <button onClick={handleSearchWeb} disabled={searchLoading} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50">
                         {searchLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                         AI Web Scout
                       </button>
                     </div>
                     <textarea 
                        value={formData.resources} 
                        onChange={e => setFormData({...formData, resources: e.target.value})} 
                        placeholder="Paste curriculum details, course links, or raw text..."
                        className="w-full h-[250px] bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-all resize-none shadow-inner" 
                     />
                  </div>

                  <div className="space-y-4">
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">File Upload</span>
                     <label className="flex items-center justify-center w-full h-24 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                       <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                       <div className="flex items-center gap-3 text-slate-500">
                         <UploadCloud size={20} />
                         <span className="text-sm font-semibold">Upload Blueprint (.pdf, .md, .txt)</span>
                       </div>
                     </label>
                     {uploadedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-2">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700">
                            <FileText size={12} /> <span className="truncate max-w-[100px]">{f.name}</span>
                            <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 ml-1"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                     )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Bottom Chat Input & Compact Toolbar */}
          {!loading && (
            <div className="shrink-0 p-6 pt-0 w-full max-w-4xl mx-auto bg-gradient-to-t from-white via-white to-white/0 relative z-10">
              
              <div className="flex flex-col gap-3">
                
                {/* Compact Settings Toolbar */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center gap-2 px-2">
                    <SettingChip 
                      label="Depth" 
                      value={formData.depth} 
                      options={['Foundational', 'Expert', 'Advanced']} 
                      onChange={v => setFormData({...formData, depth: v as any})} 
                    />
                    <SettingChip 
                      label="Timeline" 
                      value={`${formData.durationDays}d at ${formData.dailyCommitment}m/day`} 
                      options={['14d at 30m/day', '30d at 45m/day', '60d at 60m/day', '90d at 90m/day']} 
                      onChange={v => {
                        const days = parseInt(v.split('d')[0]);
                        const mins = parseInt(v.split('at ')[1].split('m')[0]);
                        setFormData({...formData, durationDays: days, dailyCommitment: mins});
                      }} 
                    />
                    <SettingChip 
                      label="Level" 
                      value={formData.proficiency} 
                      options={['Novice', 'Beginner', 'Competent', 'Expert']} 
                      onChange={v => setFormData({...formData, proficiency: v})} 
                    />
                    <SettingChip 
                      label="For" 
                      value={formData.motivation} 
                      options={['Career', 'Project', 'Academic', 'Hobby']} 
                      onChange={v => setFormData({...formData, motivation: v})} 
                    />
                  </motion.div>
                )}

                {/* The Input Pill */}
                <div className="bg-[#f4f4f4] rounded-[2rem] flex items-center px-5 py-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100 transition-all group w-full">
                  <input 
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                    placeholder={step === 1 ? "Message your architectural agent..." : "Reviewing context. Ready to build?"}
                    readOnly={step === 2}
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 text-[14px] placeholder:text-slate-400 disabled:opacity-60 px-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.goal) {
                         if (step === 1) setStep(2);
                         else handleGenerate();
                      }
                    }}
                  />
                  <button 
                    onClick={() => step === 1 ? setStep(2) : handleGenerate()}
                    disabled={!formData.goal}
                    className={`h-10 px-6 shrink-0 rounded-full flex items-center justify-center gap-2 transition-all ml-3 shadow-lg ${
                      !formData.goal 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-black hover:scale-105 active:scale-95 shadow-slate-900/20'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest pl-1">
                      {step === 1 ? 'Proceed' : 'Synthesize'}
                    </span>
                    {step === 1 ? (
                      <ArrowRight size={14} strokeWidth={3} className="animate-pulse" />
                    ) : (
                      <div className="relative">
                        <Zap size={14} fill="currentColor" className="relative z-10" />
                        <motion.div 
                          animate={{ scale: [1, 1.6, 1], opacity: [0, 0.4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 bg-white rounded-full blur-md"
                        />
                      </div>
                    )}
                  </button>
                </div>
                
                <div className="text-center text-[11px] text-slate-400 font-medium pb-2">
                  {step === 1 ? "Press Enter to proceed. You can adjust your parameters above." : "AI architecture process may take 15-30 seconds."}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreatePath;
