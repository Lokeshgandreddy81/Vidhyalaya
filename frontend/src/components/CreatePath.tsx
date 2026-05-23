import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPlan, searchWebForResources, FileAttachment } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { 
  ArrowLeft, ArrowRight, Zap, Loader2, 
  UploadCloud, FileText, X, Globe, Sidebar, Search,
  Layout as LayoutIcon, Brain, Rocket, Cloud
} from 'lucide-react';

// Ultra-Compact Setting Chip
const SettingChip = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) => {
  return (
    <div 
      className="relative inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold cursor-pointer group transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
        color: '#1e293b',
      }}
    >
      <span className="mr-1.5 font-medium" style={{ color: 'rgba(30,41,59,0.5)' }}>{label}</span>
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
    { title: 'AI Architecture', subtitle: 'LLMs, Vectors, Agents', icon: <Brain size={16} />, goal: 'AI & LLM Architecture' },
    { title: 'Data Science', subtitle: 'Python, ML, Pandas', icon: <Rocket size={16} />, goal: 'Python Data Science Mastery' },
    { title: 'Cloud Infrastructure', subtitle: 'AWS, Docker, K8s', icon: <Cloud size={16} />, goal: 'Cloud Orchestration & DevOps' }
  ];

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center font-inter overflow-hidden">

      {/* ── Central App Window ── */}
      <div 
        className="relative z-10 w-[95vw] max-w-[1200px] h-[90vh] rounded-[2rem] flex flex-col overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        
        {/* Top Header Row */}
        <div 
          className="h-14 shrink-0 flex items-center justify-between px-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}
        >
          <button 
            onClick={() => navigate('/dashboard')} 
            className="transition-all p-1.5 rounded-lg"
            style={{ color: 'rgba(5,6,10,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.color = '#05060a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(5,6,10,0.5)'; }}
          >
            <Sidebar size={18} strokeWidth={2} />
          </button>
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(5,6,10,0.45)' }}>
            Phase {step} of 2
          </span>
          <button 
            onClick={() => step === 2 && setStep(1)} 
            className={`transition-all p-1.5 rounded-lg ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            style={{ color: 'rgba(5,6,10,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.color = '#05060a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(5,6,10,0.5)'; }}
          >
             <ArrowLeft size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
          
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
                        <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-[#4e5bff] animate-pulse'}`} />
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
                    <h1 
                      className="text-2xl sm:text-4xl font-black tracking-tight"
                      style={{ color: '#05060a' }}
                    >
                      What do you want to learn today?
                    </h1>
                    <p className="mt-3 text-[14px] font-semibold" style={{ color: '#475569' }}>Pick a path or type your goal below</p>
                  </div>

                  {/* Suggestion Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl px-4">
                    {suggestionCards.map((card, idx) => (
                      <motion.button 
                        key={idx}
                        whileHover={{ y: -3, boxShadow: '0 16px 32px rgba(0,0,0,0.12)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({...formData, goal: card.goal})}
                        className="flex items-center gap-3 p-4 rounded-[1.2rem] transition-all duration-300 text-left group"
                        style={{
                          background: 'rgba(255,255,255,0.82)',
                          border: '1px solid rgba(255,255,255,0.7)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 white',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                          style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4e5bff' }}
                        >
                           {card.icon}
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: '#0f172a' }}>{card.title}</div>
                          <div className="text-xs font-semibold mt-0.5" style={{ color: '#475569' }}>{card.subtitle}</div>
                        </div>
                      </motion.button>
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
                       <button onClick={handleSearchWeb} disabled={searchLoading} className="text-xs font-semibold text-[#4e5bff] bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 border border-indigo-100/50">
                         {searchLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                         AI Web Scout
                       </button>
                     </div>
                     <textarea 
                        value={formData.resources} 
                        onChange={e => setFormData({...formData, resources: e.target.value})} 
                        placeholder="Paste curriculum details, course links, or raw text..."
                        className="w-full h-[250px] bg-white/30 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 outline-none focus:border-[#4e5bff] focus:bg-white focus:shadow-[0_12px_24px_rgba(78,91,255,0.05)] transition-all resize-none shadow-inner" 
                     />
                  </div>

                  <div className="space-y-4">
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">File Upload</span>
                     <label className="flex items-center justify-center w-full h-24 bg-white/40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-white hover:border-[#4e5bff]/50 transition-all duration-300">
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
            <div className="shrink-0 p-6 pt-0 w-full max-w-4xl mx-auto bg-transparent relative z-10">
              
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

                {/* The Input Bar */}
                <div 
                  className="rounded-[2rem] flex items-center px-5 py-3 transition-all duration-300 w-full"
                  style={{
                    background: 'rgba(255,255,255,0.88)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 white',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <input 
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                    placeholder={step === 1 ? "Message your architectural agent..." : "Reviewing context. Ready to build?"}
                    readOnly={step === 2}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] placeholder:text-slate-500 disabled:opacity-60 px-1 font-bold"
                    style={{ color: '#0f172a' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.goal) {
                         if (step === 1) setStep(2);
                         else handleGenerate();
                      }
                    }}
                  />
                  <motion.button 
                    whileHover={formData.goal ? { scale: 1.05 } : {}}
                    whileTap={formData.goal ? { scale: 0.97 } : {}}
                    onClick={() => step === 1 ? setStep(2) : handleGenerate()}
                    disabled={!formData.goal}
                    className="h-10 px-6 shrink-0 rounded-full flex items-center justify-center gap-2 ml-3 transition-all"
                    style={!formData.goal ? {
                      background: 'rgba(148,163,184,0.3)',
                      color: '#94a3b8',
                      cursor: 'not-allowed',
                    } : {
                      background: 'linear-gradient(135deg, #4e5bff 0%, #6366f1 60%, #8b5cf6 100%)',
                      color: 'white',
                      boxShadow: '0 8px 20px rgba(78,91,255,0.4), 0 2px 8px rgba(78,91,255,0.2)',
                    }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest pl-1">
                      {step === 1 ? 'Proceed' : 'Synthesize'}
                    </span>
                    {step === 1 ? (
                      <ArrowRight size={14} strokeWidth={3} />
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
                  </motion.button>
                </div>
                
                <div className="text-center text-[11px] font-medium pb-2" style={{ color: 'rgba(5,6,10,0.35)' }}>
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
