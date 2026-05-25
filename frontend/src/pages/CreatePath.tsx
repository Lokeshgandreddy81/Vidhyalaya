import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateLearningPlan, searchWebForResources, FileAttachment } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { 
  ArrowLeft, ArrowRight, Zap, Loader2, 
  UploadCloud, FileText, X, Globe, Sidebar,
  Layout as LayoutIcon,
  TrendingUp, Heart, BookOpen, Target
} from 'lucide-react';

const SettingChip = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) => {
  return (
    <div 
      className="relative inline-flex h-8 items-center justify-center rounded-full px-3.5 text-[11px] font-semibold cursor-pointer group transition-colors duration-200"
      style={{
        background: '#ffffff',
        border: '1px solid #d8dde8',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        color: '#0f172a',
      }}
    >
      <span className="mr-1.5 font-medium" style={{ color: '#667085' }}>{label}</span>
      <span className="font-bold">{value}</span>
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
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content?: string, attachment?: FileAttachment}[]>([]);
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


  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  // Convert a File to a base64 string for Gemini inline data
  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...Array.from(bytes.slice(i, i + CHUNK)));
    }
    return btoa(binary);
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
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        if (isPdf) {
          // Convert entire PDF to base64 — Gemini reads the full document natively
          const base64 = await fileToBase64(file);
          const attachment: FileAttachment = { name: file.name, base64, mimeType: 'application/pdf' };
          setUploadedFiles(prev => [...prev, { name: file.name, attachment }]);
        } else {
          // Plain text / markdown — put content in the textarea
          const text = await file.text();
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setFormData(prev => ({ ...prev, resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}` }));
        }
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
      // Collect PDF attachments so Gemini can read the full documents inline
      const fileAttachments: FileAttachment[] = uploadedFiles
        .filter(f => f.attachment)
        .map(f => f.attachment!);
      const planData: any = await generateLearningPlan(
        `Goal: ${formData.goal}\nTrack: ${formData.track}\nMotivation: ${formData.motivation}\nLoad: ${formData.cognitiveLoad}`,
        formData.resources, formData.dailyCommitment, formData.proficiency, '', targetDate.toISOString().split('T')[0], formData.depth,
        fileAttachments.length > 0 ? fileAttachments : undefined
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
    { title: 'Corporate Finance', subtitle: 'Valuation, Stocks, Capital', icon: <TrendingUp size={16} />, goal: 'Corporate Finance Specialist' },
    { title: 'Human Anatomy', subtitle: 'Muscles, Organs, Systems', icon: <Heart size={16} />, goal: 'Human Anatomy Mastery' },
    { title: 'Creative Writing', subtitle: 'Novels, Storytelling, Plot', icon: <BookOpen size={16} />, goal: 'Creative Fiction Author' },
    { title: 'Mindset & Motivation', subtitle: 'Habits, Focus, Grit', icon: <Target size={16} />, goal: 'Peak Performance Mastery' }
  ];

  return (
    <div className="fixed inset-0 z-[200] w-full h-full flex items-center justify-center font-inter overflow-hidden bg-[#f7f8fb] px-4 py-4">

      {/* ── Central App Window ── */}
      <div 
        className="relative z-10 w-full max-w-[1120px] h-[calc(100vh-2rem)] max-h-[820px] rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid #dfe3ea',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(15, 23, 42, 0.05)',
        }}
      >
        
        {/* Top Header Row */}
        <div 
          className="h-14 shrink-0 flex items-center justify-between px-5 sm:px-6 bg-white"
          style={{ borderBottom: '1px solid #edf0f4' }}
        >
          <button 
            onClick={() => navigate('/dashboard')} 
            className="transition-all p-1.5 rounded-lg hover:bg-slate-100"
            style={{ color: '#667085' }}
          >
            <Sidebar size={18} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: '#667085' }}>
            <span>Path builder</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Step {step} of 2</span>
          </div>
          <button 
            onClick={() => step === 2 && setStep(1)} 
            className={`transition-all p-1.5 rounded-lg hover:bg-slate-100 ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            style={{ color: '#667085' }}
          >
             <ArrowLeft size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
          
          {/* Scrollable Canvas */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center p-4 sm:p-6 bg-[#fbfcfe]">
            <div className="w-full max-w-3xl flex flex-col justify-start py-6 pb-8 sm:flex-1 sm:justify-center sm:py-10">
              
              {loading ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Building the learning system...</h2>
                  
                  <div className="w-full max-w-sm space-y-4 text-left mt-8">
                    {buildLogs.length > 0 && buildLogs.map(log => (
                      <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-[#4e5bff] animate-pulse'}`} />
                        <span className="text-sm font-medium text-slate-600">{log.message}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : step === 1 ? (
                /* Step 1: Centered Welcome & Suggestions */
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center space-y-6 sm:space-y-8">
                  
                  {/* Perfectly Centered Title */}
                  <div className="flex flex-col items-center text-center">
                    <h1 
                      className="text-2xl sm:text-[40px] font-semibold tracking-tight"
                      style={{ color: '#05060a' }}
                    >
                      What should Cortex build?
                    </h1>
                    <p className="mt-3 text-[14px] font-medium max-w-xl leading-6" style={{ color: '#667085' }}>
                      Choose a starting point or describe the exact learning job. Cortex will plan, scout, synthesize, and verify the path.
                    </p>
                  </div>

                  {/* Suggestion Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl px-1 sm:px-4">
                    {suggestionCards.map((card, idx) => {
                      const buttonEl = (
                        <motion.button 
                          whileHover={{ y: -2, boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({...formData, goal: card.goal})}
                          className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left group w-full h-full"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e3e7ee',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                          }}
                        >
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                            style={{ background: '#f3f5f8', color: '#05060a' }}
                          >
                             {card.icon}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>{card.title}</div>
                            <div className="text-xs font-medium mt-0.5" style={{ color: '#667085' }}>{card.subtitle}</div>
                          </div>
                        </motion.button>
                      );

                      if (idx === 4) {
                        return (
                          <div key={idx} className="sm:col-span-2 flex justify-center w-full">
                            <div className="w-full sm:w-[calc(50%-6px)]">
                              {buttonEl}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="w-full">
                          {buttonEl}
                        </div>
                      );
                    })}
                  </div>
                  
                </motion.div>
              ) : (
                /* Step 2: Context Provision */
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 w-full">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><FileText size={20} className="text-slate-700" /></div>
                     <div>
                       <h2 className="text-xl font-bold text-slate-800">Attach operating context</h2>
                       <p className="text-sm text-slate-500">Add documentation, syllabi, links, notes, or constraints before Cortex builds.</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Source context</span>
                       <button onClick={handleSearchWeb} disabled={searchLoading} className="text-xs font-semibold text-[#4e5bff] bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 border border-indigo-100/50">
                         {searchLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                         AI Web Scout
                       </button>
                     </div>
                     <textarea 
                        value={formData.resources} 
                        onChange={e => setFormData({...formData, resources: e.target.value})} 
                        placeholder="Paste curriculum details, official docs, course links, constraints, or raw notes..."
                        className="w-full h-[250px] bg-white border border-slate-200 rounded-xl p-5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all resize-none" 
                     />
                  </div>

                  <div className="space-y-4">
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Files</span>
                     <label className="flex items-center justify-center w-full h-24 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-500 transition-all duration-200">
                       <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                       <div className="flex items-center gap-3 text-slate-500">
                         <UploadCloud size={20} />
                         <span className="text-sm font-semibold">Upload source file (.pdf, .md, .txt)</span>
                       </div>
                     </label>
                     {uploadedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-2">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700">
                            <FileText size={12} />
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            {f.attachment && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Full PDF ✓</span>
                            )}
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
            <div className="shrink-0 px-4 pb-4 pt-3 sm:p-6 sm:pt-3 w-full max-w-4xl mx-auto bg-white relative z-10 border-t border-slate-100">
              
              <div className="flex flex-col gap-3">
                
                {/* Compact Settings Toolbar */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center gap-2 px-2">
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

                {/* The Input Bar */}
                <div 
                  className="rounded-2xl flex flex-col gap-3 items-stretch px-4 py-4 transition-all duration-200 w-full sm:flex-row sm:items-center sm:px-5 sm:py-3"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d8dde8',
                    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <input 
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                    placeholder={step === 1 ? "Describe the learning job Cortex should build..." : "Context attached. Ready to synthesize?"}
                    readOnly={step === 2}
                    className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-slate-500 disabled:opacity-60 px-1 font-semibold"
                    style={{ color: '#0f172a' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.goal) {
                         if (step === 1) setStep(2);
                         else handleGenerate();
                      }
                    }}
                  />
                  <motion.button 
                    whileHover={formData.goal ? { y: -1 } : {}}
                    whileTap={formData.goal ? { scale: 0.97 } : {}}
                    onClick={() => step === 1 ? setStep(2) : handleGenerate()}
                    disabled={!formData.goal}
                    className="h-10 w-full px-4 shrink-0 rounded-full flex items-center justify-center gap-2 transition-all sm:w-auto sm:px-6 sm:ml-3"
                    style={!formData.goal ? {
                      background: '#eef1f5',
                      color: '#94a3b8',
                      cursor: 'not-allowed',
                    } : {
                      background: '#05060a',
                      color: 'white',
                      boxShadow: '0 8px 18px rgba(5, 6, 10, 0.18)',
                    }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest pl-1">
                      {step === 1 ? 'Continue' : 'Build path'}
                    </span>
                    {step === 1 ? (
                      <ArrowRight size={14} strokeWidth={3} />
                    ) : (
                      <div className="relative">
                        <Zap size={14} fill="currentColor" className="relative z-10" />
                      </div>
                    )}
                  </motion.button>
                </div>
                
                <div className="text-center text-[11px] font-semibold pb-1" style={{ color: '#667085' }}>
                  {step === 1 ? "Press Enter to continue. Tune depth, timeline, level, and purpose above." : "Cortex will generate a reviewable path with modules, resources, and checkpoints."}
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
