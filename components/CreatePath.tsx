import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { Loader2, ArrowRight, BrainCircuit, Clock, Globe, Sparkles, UploadCloud, FileText, X, Zap, Layout, CheckCircle, Wand2, TrendingUp, BadgeCheck, Lightbulb, Link as LinkIcon, History, ArrowLeft, Target, Route, BookOpen, PenTool } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const { addPath } = useAppStore();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);

  const [formData, setFormData] = useState({
    goal: '',
    skillLevel: 'Intermediate',
    skillValue: 60,
    expectedOutcome: '',
    targetDate: '',
    dailyTimeHours: 3.5,
    resources: '',
    track: 'Deep Dive'
  });

  const getPdfjs = () => {
    const lib = pdfjsLib as any;
    return lib.getDocument ? lib : lib.default || lib;
  };

  useEffect(() => {
    const pdfjs = getPdfjs();
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }
  }, []);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const handleSearchWeb = async () => {
    if (!formData.goal) {
      setError("Please enter a goal first so Vidhyalaya knows what to search for.");
      return;
    }
    setSearchLoading(true);
    setError(null);
    try {
      const results = await searchWebForResources(formData.goal);
      if (results && !results.includes("No resources found")) {
        setFormData(prev => ({
          ...prev,
          resources: prev.resources + (prev.resources ? "\n\n" : "") + "--- AI Web Search Results ---\n" + results
        }));
      } else {
        setError("Vidhyalaya couldn't find specific web resources for this topic. Try rephrasing your goal.");
      }
    } catch (e: any) {
      console.error("Failed to search", e);
      setError(`AI Web Search failed: ${e.message || "Unknown error"}. Check console for details.`);
    } finally {
      setSearchLoading(false);
    }
  };

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
    try {
      const dailyTimeMinutes = Math.round(formData.dailyTimeHours * 60);
      const planData = await generateLearningPlan(
        formData.goal + ` (Track: ${formData.track})`,
        formData.resources,
        dailyTimeMinutes,
        formData.skillLevel,
        formData.expectedOutcome,
        formData.targetDate
      );

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
        targetDate: formData.targetDate,
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

      addPath(newPath);
      navigate(`/path/${newPath.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while building your roadmap. Please check your connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillChange = (e: any) => {
    const val = parseInt(e.target.value);
    let level = 'Beginner';
    if (val > 33 && val <= 66) level = 'Intermediate';
    if (val > 66) level = 'Advanced';
    setFormData({...formData, skillValue: val, skillLevel: level});
  };

  return (
    <>
      {/* Main Content Canvas */}
      <main className="flex-1 overflow-y-auto p-10 h-full bg-[#f8f9fa]">
        
        {error && (
            <div className="max-w-[1200px] mx-auto mb-6 p-4 bg-red-50 text-red-700 rounded-xl border-2 border-red-200 text-sm font-black animate-pulse shadow-sm">
            {error}
            </div>
        )}

        {step === 1 && (
          <div className="max-w-[1200px] mx-auto space-y-8 animate-fade-in">
            {/* Header Section */}
            <header className="space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">STEP 1 OF 2</span>
              <h1 className="text-4xl font-serif font-medium text-[#000666] tracking-tight">Configure Your Path</h1>
              <p className="text-base text-slate-600 max-w-[600px] leading-relaxed">Tailor your learning trajectory with Vidhyalaya's accelerated frameworks. Choose your intensity and depth.</p>
            </header>

            {/* Goal Input - Required for generation */}
            <div className="bg-white p-6 rounded-xl border border-indigo-50 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">What are we learning?</label>
                <input
                    type="text"
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                    placeholder="e.g. Master React, Quantum Mechanics, Python DSA..."
                    className="w-full text-lg p-3 border-b-2 border-slate-200 focus:border-indigo-600 outline-none bg-transparent transition-colors text-slate-800 font-semibold"
                />
            </div>

            <div className="space-y-8">
              {/* Central Area: Tracks and Sliders */}
              <div className="space-y-8">
                
                {/* Accelerated Hero Tracks */}
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Accelerated Hero Tracks</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setFormData({...formData, track: 'Blitz Mastery'})}
                        className={`group relative flex flex-col text-left p-6 rounded-xl transition-all duration-200 border ${formData.track === 'Blitz Mastery' ? 'bg-[#000666] text-white border-[#000666] shadow-lg' : 'bg-white border-slate-200 hover:border-[#000666]'}`}
                    >
                      <div className={`p-2 rounded-lg w-fit mb-4 ${formData.track === 'Blitz Mastery' ? 'bg-white/10' : 'bg-indigo-50'}`}>
                        <Zap size={20} className={formData.track === 'Blitz Mastery' ? 'text-white' : 'text-[#000666]'} />
                      </div>
                      <h4 className="text-lg font-semibold mb-1">Blitz Mastery</h4>
                      <p className={`text-xs ${formData.track === 'Blitz Mastery' ? 'text-indigo-200' : 'text-slate-500'}`}>Focus on high-yield concepts for rapid exam preparation.</p>
                      {formData.track === 'Blitz Mastery' && <CheckCircle size={20} className="absolute bottom-4 right-4 text-emerald-400" />}
                    </button>

                    <button 
                        onClick={() => setFormData({...formData, track: 'Deep Dive'})}
                        className={`group relative flex flex-col text-left p-6 rounded-xl transition-all duration-200 border ${formData.track === 'Deep Dive' ? 'bg-[#000666] text-white border-[#000666] shadow-lg' : 'bg-white border-slate-200 hover:border-[#000666]'}`}
                    >
                      <div className={`p-2 rounded-lg w-fit mb-4 ${formData.track === 'Deep Dive' ? 'bg-white/10' : 'bg-indigo-50'}`}>
                        <Sparkles size={20} className={formData.track === 'Deep Dive' ? 'text-white' : 'text-[#000666]'} />
                      </div>
                      <h4 className="text-lg font-semibold mb-1">Deep Dive</h4>
                      <p className={`text-xs ${formData.track === 'Deep Dive' ? 'text-indigo-200' : 'text-slate-500'}`}>Comprehensive exploration of foundational principles and theory.</p>
                      {formData.track === 'Deep Dive' && <CheckCircle size={20} className="absolute bottom-4 right-4 text-emerald-400" />}
                    </button>

                    <button 
                        onClick={() => setFormData({...formData, track: 'Architectural Build'})}
                        className={`col-span-2 group relative flex flex-row items-center gap-6 text-left p-6 rounded-xl transition-all duration-200 border ${formData.track === 'Architectural Build' ? 'bg-[#000666] text-white border-[#000666] shadow-lg' : 'bg-white border-slate-200 hover:border-[#000666]'}`}
                    >
                      <div className={`p-4 rounded-xl ${formData.track === 'Architectural Build' ? 'bg-white/10' : 'bg-indigo-50'}`}>
                        <Layout size={24} className={formData.track === 'Architectural Build' ? 'text-white' : 'text-[#000666]'} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold mb-1">Architectural Build</h4>
                        <p className={`text-xs ${formData.track === 'Architectural Build' ? 'text-indigo-200' : 'text-slate-500'}`}>Project-based learning designed to build a portfolio while studying.</p>
                      </div>
                      {formData.track === 'Architectural Build' && <CheckCircle size={20} className="text-emerald-400" />}
                    </button>
                  </div>
                </section>

                {/* Sliders Section */}
                <section className="space-y-6 bg-white p-8 rounded-xl border border-indigo-50">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#000666]">Proficiency Level</h3>
                        <p className="text-sm text-slate-500">Your current understanding of the material.</p>
                      </div>
                      <span className="text-[#000666] font-bold bg-indigo-50 px-3 py-1 rounded-full text-xs">{formData.skillLevel}</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" value={formData.skillValue} onChange={handleSkillChange}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#000666]" 
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span>Novice</span>
                      <span>Expert</span>
                    </div>
                  </div>
                  <hr className="border-slate-100" />
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#000666]">Commitment Timeline</h3>
                        <p className="text-sm text-slate-500">Hours per day you can dedicate to focus mode.</p>
                      </div>
                      <span className="text-[#000666] font-bold bg-indigo-50 px-3 py-1 rounded-full text-xs">{formData.dailyTimeHours.toFixed(1)} hrs / Day</span>
                    </div>
                    <input 
                        type="range" min="0.5" max="12" step="0.5" value={formData.dailyTimeHours} onChange={(e) => setFormData({...formData, dailyTimeHours: parseFloat(e.target.value)})}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#000666]" 
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span>Casual</span>
                      <span>Immersion</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer Actions */}
            <footer className="pt-8 pb-4 flex justify-between items-center border-t border-slate-200 mt-8">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-6 py-2 text-slate-500 font-medium hover:text-[#000666] transition-colors">
                <ArrowLeft size={18} /> Back
              </button>
              <button 
                onClick={() => setStep(2)} 
                disabled={!formData.goal}
                className="flex items-center gap-2 px-10 py-3.5 bg-[#000666] text-white rounded-full font-bold shadow-lg shadow-indigo-200/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Design Context <ArrowRight size={18} />
              </button>
            </footer>
          </div>
        )}

        {step === 2 && (
            <div className="max-w-[1200px] mx-auto space-y-8 animate-fade-in flex flex-col lg:flex-row gap-8">
                
                {/* Main Content Area */}
                <div className="flex-1 space-y-8">
                    {/* Progress Header */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">STEP 2 OF 2</span>
                                <h1 className="text-4xl font-serif font-medium text-[#000666] tracking-tight">Design Your Journey</h1>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">75% COMPLETE</span>
                                <div className="w-32 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                    <div className="w-3/4 h-full bg-[#000666] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed">Gather your materials. Providing context helps Vidhyalaya personalize your study plan and generate relevant quiz questions.</p>
                    </div>

                    <div className="space-y-6">
                        {/* Resources Input */}
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">RESOURCES (OPTIONAL)</label>
                            <button 
                                type="button"
                                onClick={handleSearchWeb} 
                                disabled={searchLoading} 
                                className="absolute top-4 right-4 text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                                {searchLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Globe size={14} className="mr-1.5" />}
                                {searchLoading ? 'Searching...' : 'AI Web Search'}
                            </button>
                            <textarea 
                                value={formData.resources}
                                onChange={(e) => setFormData({...formData, resources: e.target.value})}
                                className="w-full h-40 bg-transparent border-0 border-b-2 border-slate-100 focus:border-[#000666] focus:ring-0 text-base font-serif resize-none placeholder:text-slate-300 transition-all outline-none" 
                                placeholder="Paste links to articles, course syllabi, or specific topics you want to prioritize..."
                            ></textarea>
                            <div className="mt-3 flex justify-end">
                                <span className="text-xs text-slate-400">Vidhyalaya can index external URLs to supplement your learning.</span>
                            </div>
                        </div>

                        {/* Upload Zone */}
                        <div className="relative group">
                            <label className="cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 transition-all hover:bg-white hover:border-[#000666]">
                                <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud size={28} className="text-[#000666]" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">Upload Context Files</h3>
                                <p className="text-sm text-slate-500 text-center max-w-sm mb-6">Drag and drop PDFs, lecture notes, or textbook chapters here. (Max 50MB per file)</p>
                                <span className="px-6 py-2 border border-[#000666] text-[#000666] font-semibold rounded-full bg-transparent">Browse Files</span>
                            </label>
                            {uploadedFiles.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {uploadedFiles.map((f, i) => (
                                        <div key={i} className="flex items-center text-xs font-bold text-slate-700 bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
                                            <FileText size={14} className="mr-2 text-[#000666]" />
                                            <span className="max-w-[140px] truncate">{f.name}</span>
                                            <button type="button" onClick={() => removeFile(i)} className="ml-3 text-slate-400 hover:text-red-600"><X size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-6 border-t border-slate-200 mt-8">
                            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-800 transition-colors">
                                <ArrowLeft size={18} /> Back
                            </button>
                            <button 
                                onClick={handleGenerate} 
                                disabled={loading} 
                                className="px-8 py-3.5 bg-[#000666] text-white font-bold rounded-xl shadow-lg shadow-indigo-200/50 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Building...</> : <>Generate Curriculum <Sparkles size={18} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </>
  );
};

export default CreatePath;