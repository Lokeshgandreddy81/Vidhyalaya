import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { 
  MonitorPlay, GraduationCap, Library, CalendarDays, Settings, 
  FileCheck, PanelLeftClose, PanelLeft, ChevronRight,
  TrendingUp, Zap, BadgeCheck, Target, 
  Briefcase, Layout as LayoutIcon, Sparkles, ArrowRight, ArrowLeft,
  Loader2, BrainCircuit, Clock, Globe, UploadCloud, FileText, X, CheckCircle, Wand2, Lightbulb, History, Route, BookOpen, PenTool, EyeOff, ChevronDown
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath } = useAppStore();
  
  // --- STATE DEFINITIONS ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generationCountdown, setGenerationCountdown] = useState(30);
  const [buildLogs, setBuildLogs] = useState<{ id: number; message: string; type: 'info' | 'success' | 'warning' }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);
  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
    goal: params.get('goal') || '',
    proficiency: 'Beginner', // Novice, Beginner, Competent, Expert
    skillValue: 25,
    expectedOutcome: '',
    targetDate: '',
    durationDays: 30,
    dailyCommitment: 45, // minutes
    resources: '',
    track: params.get('track') || 'Architectural Build',
    motivation: 'Project', // Career, Project, Academic, Hobby
    cognitiveLoad: 'Balanced', // Agile, Balanced, Intensive
    outputMode: 'Mixed', // Theoretical, Practical, Mixed
    preferredStartTime: '09:00'
  };
  });
  const [scoutLogs, setScoutLogs] = useState<{ id: number; message: string; type: 'info' | 'success' | 'warning' }[]>([]);
  const [showScoutPanel, setShowScoutPanel] = useState(false);
  const words = ['Master', 'Architect', 'Conquer', 'Design', 'Pioneer'];

  // --- EFFECTS ---

  useEffect(() => {
    const lib = pdfjsLib as any;
    const pdfjs = lib.getDocument ? lib : lib.default || lib;
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }
  }, []);

  // --- HELPERS ---
  const addScoutLog = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setScoutLogs(prev => [{ id: Date.now(), message, type }, ...prev].slice(0, 5));
  };

  const getPdfjs = () => {
    const lib = pdfjsLib as any;
    return lib.getDocument ? lib : lib.default || lib;
  };

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const pdfjs = getPdfjs();
      if (!pdfjs || !pdfjs.getDocument) throw new Error("PDF library not initialized correctly.");
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ 
        data: arrayBuffer,
        disableWorker: true,
        useWorkerFetch: false,
      });
      const pdf = await loadingTask.promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 10); 
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}`;
      }
      return fullText;
    } catch (error: any) {
      console.error("PDF Parsing Error", error);
      throw new Error(`Could not parse PDF: ${error.message || "Unknown error"}`);
    }
  };

  // --- HANDLERS ---


  const handleSearchWeb = async () => {
    if (!formData.goal) {
      setError("Please enter a goal first so Vidhyalaya knows what to search for.");
      return;
    }
    setSearchLoading(true);
    setScoutLogs([]);
    
    const simulations = [
      { msg: 'Initializing Neural Scout Agent...', type: 'info' as const },
      { msg: 'Scanning official documentation (Scholastic Realm)...', type: 'info' as const },
      { msg: 'Connecting to technical repositories (GitHub/GitHub API)...', type: 'info' as const },
      { msg: 'Scouting verified official websites for anchors...', type: 'success' as const },
      { msg: 'Extracting semantic metadata from YouTube tutorials...', type: 'info' as const },
      { msg: 'Founding core educational blueprints...', type: 'success' as const },
      { msg: 'Synthesizing neural anchors for your journey...', type: 'info' as const },
      { msg: 'Discovery complete. Neural port synchronized.', type: 'success' as const }
    ];

    for (let i = 0; i < simulations.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setScoutLogs(prev => [{ id: Date.now(), message: simulations[i].msg, type: simulations[i].type }, ...prev]);
    }

    try {
      const results = await searchWebForResources(formData.goal);
      if (results && !results.includes("No resources found")) {
        setFormData(prev => ({
          ...prev,
          resources: prev.resources + (prev.resources ? "\n\n" : "") + "--- AI Web Search Results ---\n" + results
        }));
      } else {
        addScoutLog("Scout found limited data.", "warning");
        setError("Vidhyalaya couldn't find specific web resources for this topic. Try rephrasing your goal.");
      }
    } catch (e: any) {
      addScoutLog("Scout encountered a barrier.", "warning");
      console.error("Failed to search", e);
      setError(`AI Web Search failed: ${e.message || "Unknown error"}. Check console for details.`);
    } finally {
      setSearchLoading(false);
      // AUTONOMOUS DEACTIVATION: Close panel after brief review period
      setTimeout(() => {
        setShowScoutPanel(false);
      }, 1500);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
            let text = '';
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                text = await extractTextFromPdf(file);
            } else {
                text = await file.text();
            }
            setUploadedFiles([...uploadedFiles, { name: file.name, content: text }]);
            setFormData(prev => ({
                ...prev,
                resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}`
            }));
        } catch (err: any) {
            setError(`Failed to read file: ${err.message}`);
        }
    }
  };

  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setBuildLogs([]);
    setGenerationCountdown(30);

    const simulations = [
      { msg: 'Initializing Architectural Agents...', type: 'info' as const },
      { msg: 'Analyzing target goal and timeframe...', type: 'info' as const },
      { msg: 'Structuring modular learning phases...', type: 'success' as const },
      { msg: 'Fetching cross-domain references...', type: 'info' as const },
      { msg: 'Aligning with designated skill levels...', type: 'info' as const },
      { msg: 'Finalizing schedule generation...', type: 'success' as const }
    ];

    let simulationActive = true;
    const runSim = async () => {
      let seconds = 30;
      const timer = setInterval(() => {
        if (!simulationActive || seconds <= 0) {
          clearInterval(timer);
          return;
        }
        seconds--;
        setGenerationCountdown(seconds);
      }, 1000);

      for (let i = 0; i < simulations.length; i++) {
        if (!simulationActive) break;
        if (i > 0) await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        if (simulationActive) {
          setBuildLogs(prev => [{ id: Date.now(), message: simulations[i].msg, type: simulations[i].type }, ...prev]);
        }
      }
      
      // Keep logs active if API takes a long time
      let cycle = 0;
      const waitingMsgs = [
        "Calibrating complexity parameters...",
        "Validating conceptual prerequisites...",
        "Cross-referencing neural models...",
        "Structuring learning modules..."
      ];
      while (simulationActive) {
        await new Promise(r => setTimeout(r, 2000));
        if (!simulationActive) break;
        setBuildLogs(prev => [{ id: Date.now(), message: waitingMsgs[cycle % waitingMsgs.length], type: 'info' }, ...prev]);
        cycle++;
      }
    };
    runSim();

    try {
      const dailyTimeMinutes = formData.dailyCommitment;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const fullContext = `
        Goal: ${formData.goal}
        Track: ${formData.track}
        Motivation: ${formData.motivation}
        Cognitive Load: ${formData.cognitiveLoad}
        Output Mode: ${formData.outputMode}
      `;

      const planData: any = await Promise.race([
        generateLearningPlan(
          fullContext,
          formData.resources,
          dailyTimeMinutes,
          formData.proficiency,
          formData.expectedOutcome,
          targetDateStr
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Agent Timeout: The neural architecture synthesis exceeded the strict 30-second deadline. Please try again.")), 30000))
      ]);

      if (!planData || !planData.phases) throw new Error("Failed to generate a valid plan.");

      const phasesWithIds = planData.phases.map((phase: any) => ({
        ...phase,
        id: generateSimpleId(),
        modules: phase.modules.map((mod: any) => ({
          ...mod,
          id: generateSimpleId()
        }))
      }));

      const titleToIdMap: Record<string, string> = {};
      phasesWithIds.forEach((p: any) => {
        p.modules.forEach((m: any) => {
          titleToIdMap[m.title] = m.id;
        });
      });

      const newPath: any = {
        id: generateSimpleId(),
        title: planData.title || formData.goal,
        goal: formData.goal,
        expectedOutcome: formData.expectedOutcome,
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
          modules: phase.modules.map((mod: any) => {
            const dependsOn = (mod.prerequisites || [])
              .map((title: string) => titleToIdMap[title])
              .filter((id: string) => !!id);

            return {
              id: mod.id,
              title: mod.title,
              description: mod.description,
              estimatedMinutes: mod.estimatedMinutes,
              isCompleted: false,
              keyConcepts: mod.keyConcepts || [],
              resources: [], 
              dependsOnModuleIds: dependsOn,
              userNotes: ''
            };
          })
        }))
      };

      // Generate Scheduled Sessions
      const sessions: any[] = [];
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // Distribute modules over the duration
      const allModules = newPath.phases.flatMap((p: any) => p.modules);
      const modulesPerDay = Math.ceil(allModules.length / formData.durationDays);

      for (let day = 0; day < formData.durationDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        
        const [hours, minutes] = formData.preferredStartTime.split(':').map(Number);
        const sessionStart = new Date(currentDate);
        sessionStart.setHours(hours, minutes, 0, 0);
        
        const sessionEnd = new Date(sessionStart);
        sessionEnd.setMinutes(sessionStart.getMinutes() + formData.dailyCommitment);

        // Pick modules for this day
        const dayModules = allModules.slice(day * modulesPerDay, (day + 1) * modulesPerDay);
        
        if (dayModules.length > 0) {
          sessions.push({
            id: generateSimpleId(),
            pathId: newPath.id,
            moduleId: dayModules[0].id,
            title: `Session: ${dayModules[0].title}`,
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            isCompleted: false
          });
        }
      }

      newPath.sessions = sessions;
      newPath.preferredStartTime = formData.preferredStartTime;

      addPath(newPath);
      navigate(`/path/${newPath.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while building your roadmap. Please check your connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProficiencyChange = (level: string, value: number) => {
    setFormData({...formData, proficiency: level, skillValue: value});
  };

  const handleHeroTrackSelect = (track: {
    goal: string;
    proficiency: string;
    motivation: string;
    dailyCommitment: number;
  }) => {
    const skillValueByLevel: Record<string, number> = {
      Novice: 5,
      Beginner: 25,
      Competent: 60,
      Expert: 90,
    };

    setFormData(prev => ({
      ...prev,
      goal: track.goal,
      proficiency: track.proficiency,
      skillValue: skillValueByLevel[track.proficiency] ?? prev.skillValue,
      motivation: track.motivation,
      dailyCommitment: track.dailyCommitment,
      track: 'Architectural Build',
    }));
  };



  return (
    <div className="oracle-canvas fixed inset-0 w-screen h-screen bg-[#fdfdfe] flex flex-col overflow-hidden select-none">
        <div className="oracle-spotlight" />
        
        {/* MASTERY TOPOGRAPHY - THREE-LAYER DEPTH */}
        <div className="parallax-depth-layer mastery-blueprint-grid" />
        <div className="parallax-depth-layer scholarly-constellations" />
        <div className="parallax-depth-layer neural-synapse-overlay" />
        
        {/* GLOBAL PROGRESSIVE INDICATOR - ARCHITECTURAL ANCHOR */}
        <div className="fixed top-10 right-10 z-[60] flex flex-col items-end gap-3 pointer-events-none">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] leading-none mb-1 animate-in slide-in-from-right duration-700">Scholastic Phase I</span>
          <div className="flex items-center gap-6 bg-white/40 backdrop-blur-md px-6 py-4 rounded-[20px] border border-slate-100 shadow-sm animate-in slide-in-from-right duration-1000">
            <span className="text-[13px] font-black text-[#000666] tracking-[0.2em] uppercase whitespace-nowrap">Step {step} of 4</span>
            <div className="w-48 h-1.5 bg-slate-100/50 rounded-full overflow-hidden shadow-inner border border-white/50">
              <div 
                className="h-full bg-[#000666] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* PROGRESSIVE NAVIGATION */}

      {/* COMPACT ORACLE NAVIGATOR - TOP LEFT */}


      {/* THE SLIDING UNIVERSE */}
      <div 
        className="step-transition-container h-full"
        style={{ transform: `translateX(${(step - 1) * -50}%)` }}
      >
        {/* STEP 1: INTENT & CALIBRATION WIZARD */}
        <div className="step-slide h-screen overflow-y-auto custom-scrollbar flex flex-col items-center">
          <div className={`w-full max-w-[1550px] px-12 py-8 flex flex-col min-h-full transition-all duration-1000 ${loading ? 'blur-2xl scale-95 opacity-0' : 'opacity-100'}`}>
            
            {/* WIZARD HEADER & PROGRESS */}
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-end justify-between border-b border-slate-100 pb-10">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.6em] mb-2 block">Instructional Architecture</span>
                  <h2 className="text-5xl font-serif text-[#000666]">Configure Your Path</h2>
                  <p className="text-sm text-slate-400 font-serif italic">Fine-tune the complexity and pacing of your academic journey.</p>
                </div>
                
                <div className="hidden absolute top-0 right-0 h-full flex flex-col justify-center translate-x-12">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-3">Scholastic Phase I</span>
                    <div className="flex items-center gap-6">
                      <span className="text-[14px] font-black text-[#000666] tracking-[0.2em] uppercase whitespace-nowrap">Step {step} of 4</span>
                      <div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-[#000666] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                          style={{ width: `${(step / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="flex-1 flex flex-col gap-6">
              
              {/* HERO TRACKS (QUICK START) */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    <Sparkles size={14} className="text-indigo-400" />
                    Hero Tracks
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { title: 'MERN Specialist', tag: 'AI Curated', desc: 'Master full-stack in 21 days with 45min daily focus.', goal: 'MERN Stack Specialist', proficiency: 'Beginner', motivation: 'Career', dailyCommitment: 45, color: 'text-indigo-600' },
                  { title: 'AI for Managers', tag: 'High Speed', desc: 'Executive summary of LLMs and prompt engineering.', goal: 'AI for Managers & Executives', proficiency: 'Novice', motivation: 'Project', dailyCommitment: 30, color: 'text-blue-600' },
                  { title: 'Python Wizard', tag: 'Foundational', desc: 'From syntax to visualization in 30 days.', goal: 'Python Wizardry & Automation', proficiency: 'Beginner', motivation: 'Hobby', dailyCommitment: 60, color: 'text-indigo-500' },
                  { title: 'Data Architect', tag: 'Strategic', desc: 'Master Big Data & Neural Systems architecture.', goal: 'Data Systems Architect', proficiency: 'Competent', motivation: 'Career', dailyCommitment: 90, color: 'text-emerald-600' },
                  { title: 'Cloud Architect', tag: 'High Scale', desc: 'Master AWS, Docker, and K8s orchestration.', goal: 'Cloud Systems Architect', proficiency: 'Competent', motivation: 'Career', dailyCommitment: 75, color: 'text-sky-600' }
                ].map((track, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleHeroTrackSelect(track)}
                    className="p-6 rounded-[24px] text-left bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${track.color}`}>{track.tag}</span>
                        <h4 className="text-base font-serif font-bold text-[#000666] group-hover:text-indigo-600 transition-colors leading-tight">{track.title}</h4>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed line-clamp-2">{track.desc}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Blueprint</span>
                        <ArrowRight size={10} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              </div>

              {/* CORE CONFIGURATION CANVAS */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* FLOATING DOWNWARD FLUX INDICATOR - MOVED TO BOTTOM RIGHT TO AVOID OVERLAP */}
                <div className="fixed right-10 bottom-12 flex flex-col items-center gap-6 text-indigo-600 animate-bounce pointer-events-none z-50">
                  <span className="text-[10px] font-black uppercase tracking-[0.6em] rotate-180 [writing-mode:vertical-lr] text-[#000666]/30">Downward Flux</span>
                  <ChevronDown size={48} className="stroke-[2.5px] opacity-20" />
                </div>
                {/* INTENT AREA */}
                {/* CENTRAL MASTERY ANCHOR - STABILIZED */}
                <div className="flex-1 flex flex-col items-center justify-center relative py-12">
                  <div className="text-center flex flex-col items-center gap-6 w-full">
                    <h1 className="flex items-center justify-center gap-3 text-3xl font-serif text-[#000666]">
                      <span className="text-slate-400 italic font-light whitespace-nowrap">I want to</span>
                      <div className="relative h-[40px] overflow-hidden min-w-[160px] flex items-center">
                        <div className="animate-word-reel flex flex-col absolute top-0 left-0 font-bold">
                          {['Master', 'Architect', 'Conquer', 'Design', 'Pioneer', 'Master'].map((word, i) => (
                            <span key={`${word}-${i}`} className="h-[40px] flex items-center justify-start">{word}</span>
                          ))}
                        </div>
                      </div>
                    </h1>

                    <div className="w-full max-w-3xl relative group">
                       <textarea 
                         value={formData.goal}
                         onChange={(e) => setFormData({...formData, goal: e.target.value})}
                         placeholder="Enter your mastery vision..."
                         className="w-full text-center text-4xl font-serif text-[#000666] bg-transparent border-b-2 border-slate-200 focus:border-[#000666] focus:ring-0 resize-none h-20 leading-tight p-4 outline-none transition-colors placeholder:text-slate-300"
                       />
                    </div>
                  </div>
                </div>

              <div className="mt-auto space-y-8 pb-10">
                <div className="relative">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch">
                    {/* LEFT WING: COGNITIVE PROFILE */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Intelligence Matrix</span>
                        <h3 className="text-2xl font-serif italic text-[#000666]">Cognitive Profile</h3>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between gap-8">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'Novice', icon: TrendingUp, val: 5 },
                            { id: 'Beginner', icon: Zap, val: 25 },
                            { id: 'Competent', icon: BadgeCheck, val: 60 },
                            { id: 'Expert', icon: Target, val: 90 }
                          ].map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleProficiencyChange(p.id, p.val)}
                              className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300 ${
                                formData.proficiency === p.id 
                                  ? 'bg-[#000666] border-[#000666] text-white shadow-md' 
                                  : 'bg-slate-50 border-slate-100 text-slate-500 font-bold hover:border-slate-300 hover:text-[#000666]'
                              }`}
                            >
                              <p.icon size={18} />
                              <span className="text-[9px] font-black uppercase tracking-widest">{p.id}</span>
                            </button>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                          <div className="flex bg-slate-50 p-1.5 rounded-[16px] gap-1 border border-slate-100">
                            {['Agile', 'Balanced', 'Intensive'].map((load) => (
                              <button
                                key={load}
                                onClick={() => setFormData({...formData, cognitiveLoad: load})}
                                className={`flex-1 py-2.5 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all ${
                                  formData.cognitiveLoad === load 
                                    ? 'bg-[#000666] text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-[#000666] hover:bg-slate-100'
                                }`}
                              >
                                {load}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CENTER CORE: STRATEGIC INTENT */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Strategic Nucleus</span>
                        <h3 className="text-2xl font-serif italic text-[#000666]">Purpose Architecture</h3>
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-8">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'Career', icon: Briefcase, label: 'Prof' },
                            { id: 'Project', icon: LayoutIcon, label: 'Exec' },
                            { id: 'Academic', icon: GraduationCap, label: 'Sci' },
                            { id: 'Hobby', icon: Sparkles, label: 'Cre' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setFormData({...formData, motivation: m.id})}
                              className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300 ${
                                formData.motivation === m.id 
                                  ? 'bg-[#000666] border-[#000666] text-white shadow-md' 
                                  : 'bg-slate-50 border-slate-100 text-slate-500 font-bold hover:border-slate-300 hover:text-[#000666]'
                              }`}
                            >
                              <m.icon size={18} />
                              <span className="text-[9px] font-black uppercase tracking-widest">{m.id}</span>
                            </button>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                          <div className="flex bg-slate-50 p-1.5 rounded-[16px] gap-1 border border-slate-100">
                            {['Theoretical', 'Mixed', 'Practical'].map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setFormData({...formData, outputMode: mode})}
                                className={`flex-1 py-2.5 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all ${
                                  formData.outputMode === mode 
                                    ? 'bg-[#000666] text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-[#000666] hover:bg-slate-100'
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT WING: TEMPORAL CALIBRATION */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Temporal Logic</span>
                        <h3 className="text-2xl font-serif italic text-[#000666]">Time Calibration</h3>
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-6">
                        <div className="space-y-8">
                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mastery Span</span>
                              <div className="text-3xl font-serif text-[#000666] tabular-nums">{formData.durationDays}<span className="text-[10px] font-black ml-1 opacity-40 italic text-[#000666]">d</span></div>
                            </div>
                            <input 
                              type="range" min="7" max="90" step="1"
                              value={formData.durationDays}
                              onChange={(e) => setFormData({...formData, durationDays: parseInt(e.target.value)})}
                              className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#000666]"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Ritual</span>
                              <div className="text-3xl font-serif text-[#000666] tabular-nums">{formData.dailyCommitment}<span className="text-[10px] font-black ml-1 opacity-40 italic text-[#000666]">m</span></div>
                            </div>
                            <input 
                              type="range" min="15" max="120" step="5"
                              value={formData.dailyCommitment}
                              onChange={(e) => setFormData({...formData, dailyCommitment: parseInt(e.target.value)})}
                              className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#000666]"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Time</span>
                              <div className="text-xl font-serif text-[#000666] tabular-nums">{formData.preferredStartTime}</div>
                            </div>
                            <input 
                              type="time"
                              value={formData.preferredStartTime}
                              onChange={(e) => setFormData({...formData, preferredStartTime: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-sm font-bold text-[#000666] focus:outline-none focus:border-indigo-300 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#000666] flex items-center justify-center text-white shadow-lg">
                              <BadgeCheck size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#000666]">Validated</span>
                          </div>
                          <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-widest">{formData.cognitiveLoad}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                {/* ACTION BAR (FOOTER) - CENTERED */}
                <div className="mt-auto relative flex flex-col items-center py-12 border-t border-slate-100/60">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <button className="group flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] hover:text-[#000666] transition-all">
                      <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform" />
                      Reset Vision
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setStep(2)} 
                    disabled={!formData.goal}
                    className="group relative flex items-center gap-12 px-20 py-7 bg-[#000666] text-white rounded-[32px] font-black uppercase tracking-[0.6em] text-[13px] shadow-[0_40px_80px_-20px_rgba(0,6,102,0.4)] hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-20"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] opacity-40 tracking-[0.3em] mb-1">Neural Assembly</span>
                      <span>Build Universe</span>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                       <Wand2 size={20} />
                    </div>
                  </button>

                </div>

            </section>
          </div>
        </div>

        {/* STEP 2: CONTEXT & ANCHORING */}
        <div className="step-slide h-screen overflow-y-auto custom-scrollbar flex flex-col items-center bg-[#fdfdfe]">
          <div className={`w-full max-w-5xl py-20 px-12 transition-all duration-1000 ${loading ? 'blur-2xl scale-95 opacity-0' : 'opacity-100'}`}>
            <section className="space-y-16">
              <div className="flex flex-col gap-6">
                <div className="flex items-end justify-between border-b border-slate-100 pb-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="bg-[#000666] text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">Step 2 of 4</span>
                    </div>
                    <h2 className="text-6xl font-serif text-[#000666] tracking-tight">Design Your Journey</h2>
                    <p className="text-lg text-slate-400 font-serif italic leading-relaxed">Tailor your intelligence path to your goals and deadline.</p>
                  </div>
                </div>
              </div>

              {/* CENTRAL CONFIGURATION PANEL */}
              <div className="refractive-glass-premium rounded-[48px] p-12 border border-slate-100/50 shadow-sm space-y-12">
                
                {/* RESOURCES SECTION */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#000666]">
                      <Globe size={24} className="opacity-80" />
                      <h3 className="text-2xl font-serif font-bold">Resources (Optional)</h3>
                    </div>
                    <button 
                      onClick={() => { setShowScoutPanel(true); handleSearchWeb(); }}
                      className="group/scout refractive-glass px-10 py-4 rounded-[20px] flex items-center gap-4 border border-[#000666]/10 text-[#000666] transition-all hover:bg-[#000666] hover:text-white hover:shadow-xl active:scale-95"
                    >
                      <Globe size={18} className="group-hover/scout:rotate-12 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em]">Web Search</span>
                    </button>
                  </div>

                  <div className="relative group">
                    <textarea 
                      value={formData.resources}
                      onChange={(e) => setFormData({...formData, resources: e.target.value})}
                      className="w-full h-80 bg-white/40 border-2 border-slate-50 rounded-[32px] p-10 text-xl font-serif resize-none placeholder:text-slate-200 focus:ring-0 focus:border-[#000666]/10 outline-none leading-relaxed transition-all" 
                      placeholder="Paste relevant course links, syllabus details, or raw text content here..."
                    />
                    <div className="absolute bottom-6 right-8">
                       <span className="bg-slate-100/80 backdrop-blur-md text-[9px] font-black text-slate-400 px-4 py-2 rounded-xl uppercase tracking-widest border border-white">Max 10k tokens</span>
                    </div>
                  </div>
                </div>

                {/* UPLOAD SECTION */}
                <div className="space-y-6">
                   <div className="flex items-center gap-4 text-[#000666]">
                      <FileText size={24} className="opacity-80" />
                      <h3 className="text-2xl font-serif font-bold">Upload Context Files</h3>
                    </div>
                    
                    <label className="cursor-pointer group relative block h-64 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[40px] hover:bg-white/80 transition-all overflow-hidden">
                      <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                        <div className="w-20 h-20 rounded-[28px] bg-white border border-slate-100 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                          <UploadCloud size={32} className="text-[#000666]" />
                        </div>
                        <div className="text-center">
                          <h4 className="text-xl font-serif font-bold text-[#000666]">Drag and drop or click to upload</h4>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">PDF or TXT files supported (up to 25MB each)</p>
                        </div>
                      </div>
                    </label>

                    {uploadedFiles.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[24px] group/file hover:shadow-xl transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <FileText size={16} className="text-[#000666]" />
                              </div>
                              <span className="text-[12px] font-bold text-slate-600 truncate max-w-[200px]">{f.name}</span>
                            </div>
                            <button onClick={() => removeFile(i)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* SARA SUGGESTION BOX */}
                <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-[32px] p-8 flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Sparkles size={20} className="text-indigo-400" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">SARA Suggestion</span>
                    <p className="text-sm text-slate-600 font-serif italic">Adding a syllabus helps me map your study milestones more accurately to your academic calendar.</p>
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="group flex items-center gap-4 text-slate-300 font-black uppercase tracking-[0.5em] text-[10px] hover:text-[#000666] transition-all">
                  <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform" />
                  Back
                </button>
                
                <button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="group relative flex items-center gap-12 px-16 py-6 bg-[#000666] text-white rounded-[32px] font-black uppercase tracking-[0.5em] text-[12px] shadow-[0_40px_80px_-20px_rgba(0,6,102,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    Build Path
                    <Wand2 size={18} className="text-indigo-300 group-hover:rotate-12 transition-transform" />
                  </span>
                  <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-indigo-500 to-[#000666] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </button>
              </div>

              {/* FOCUS BUTTON */}
              <div className="flex justify-center pb-20">
                 <button className="flex items-center gap-4 px-10 py-4 bg-white border border-slate-100 rounded-full shadow-sm hover:shadow-lg transition-all text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <EyeOff size={16} className="opacity-40" />
                    Enable Focus Spacing for Content Setup
                 </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* NEURAL SCOUT SIDE PANEL */}
      <div className={`fixed inset-y-0 right-0 z-[100] w-[450px] bg-white/80 backdrop-blur-3xl border-l border-slate-100 shadow-[-40px_0_80px_rgba(0,6,102,0.05)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showScoutPanel ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="h-full flex flex-col p-10">
            <div className="flex items-center justify-between mb-12">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Neural Discovery</span>
                  <h3 className="text-3xl font-serif text-[#000666]">AI Scout Console</h3>
               </div>
               <button 
                  onClick={() => setShowScoutPanel(false)}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
               >
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 flex flex-col gap-8 overflow-hidden">
               {/* AGENT MOTION CAPTURE (VISUAL FEED) */}
               <div className="refractive-glass p-8 rounded-[32px] border border-slate-100/50 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${searchLoading ? 'bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'bg-slate-200'}`} />
                        <span className="text-[11px] font-black text-[#000666] uppercase tracking-[0.3em]">{searchLoading ? 'Agent Motion Capture' : 'Port Standby'}</span>
                     </div>
                     {searchLoading && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>Scholastic Range</span>
                        <span>{searchLoading ? 'Active' : 'Offline'}</span>
                     </div>
                     <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-indigo-500 transition-all duration-[2000ms] ${searchLoading ? 'w-full' : 'w-0'}`} 
                        />
                     </div>
                  </div>
               </div>

               {/* DISCOVERY FEED */}
               <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4 px-2">
                     <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Real-time Scholastic Simulation</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                     {scoutLogs.length > 0 ? (
                        scoutLogs.map((log) => (
                          <div key={log.id} className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm flex gap-4 animate-in slide-in-from-right-4 duration-500">
                             <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${
                               log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'
                             }`} />
                             <div className="space-y-1">
                                <p className="text-[14px] font-bold text-slate-800 font-serif leading-relaxed italic">{log.message}</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Agent Verified</span>
                                   <div className="w-1 h-1 rounded-full bg-slate-200" />
                                   <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Neural Link</span>
                                </div>
                             </div>
                          </div>
                        ))
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                           <Globe size={64} className="text-[#000666] mb-6" />
                           <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Ready for Initialization</span>
                        </div>
                     )}
                  </div>
               </div>

               {/* SYNCHRONIZATION ACTION */}
               <button 
                  onClick={() => setShowScoutPanel(false)}
                  className="w-full py-6 bg-[#000666] text-white rounded-[32px] font-black uppercase tracking-[0.5em] text-[11px] shadow-[0_20px_40px_-10px_rgba(0,6,102,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
               >
                  Sync Discovery to Journey
               </button>
            </div>
         </div>
      </div>

      {/* THE SINGULARITY LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[500] bg-[#f8f9fa] flex flex-col items-center justify-center animate-fade-in p-10">
           <div className="max-w-3xl w-full">
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm h-[450px] flex flex-col">
                 <div className="flex items-center justify-between mb-6 px-4">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                       <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Neural Architect Log</span>
                    </div>
                    <div className="flex items-center gap-4">
                       {generationCountdown > 0 ? (
                         <span className="text-[12px] font-black text-[#000666] tabular-nums tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">00:{generationCountdown.toString().padStart(2, '0')}</span>
                       ) : (
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finalizing</span>
                       )}
                       <Loader2 size={16} className="text-indigo-400 animate-spin" />
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-4 pl-2 pb-4">
                    {buildLogs.length > 0 ? (
                       buildLogs.map((log) => (
                         <div key={log.id} className="bg-slate-50 border border-slate-100/60 p-5 rounded-[24px] shadow-sm flex gap-4 animate-in slide-in-from-right-4 duration-500">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              log.type === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'
                            }`} />
                            <div className="space-y-1">
                               <p className="text-[13px] font-bold text-slate-800 font-serif leading-relaxed italic">{log.message}</p>
                               <div className="flex items-center gap-3">
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Architect Agent</span>
                               </div>
                            </div>
                         </div>
                       ))
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-40">
                          <BrainCircuit size={48} className="text-[#000666] mb-4" />
                          <span className="text-[10px] font-black text-[#000666] uppercase tracking-[0.4em]">Initializing...</span>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreatePath;
