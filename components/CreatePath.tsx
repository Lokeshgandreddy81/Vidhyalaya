import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { Loader2, ArrowRight, BrainCircuit, Target, Clock, Book, Globe, Sparkles, Upload, FileText, X, Calendar, Flag } from 'lucide-react';
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
    skillLevel: 'Beginner',
    expectedOutcome: '',
    targetDate: '',
    dailyTime: 60,
    resources: ''
  });

  // Helper to get the actual pdfjs object regardless of how it was bundled/imported
  const getPdfjs = () => {
    const lib = pdfjsLib as any;
    return lib.getDocument ? lib : lib.default || lib;
  };

  useEffect(() => {
    const pdfjs = getPdfjs();
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
        // Use ESM worker from a reliable CDN
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }
  }, []);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const handleSearchWeb = async () => {
    if (!formData.goal) return;
    setSearchLoading(true);
    try {
      const results = await searchWebForResources(formData.goal);
      if (results) {
        setFormData(prev => ({
          ...prev,
          resources: prev.resources + (prev.resources ? "\n\n" : "") + "--- AI Found Resources ---\n" + results
        }));
      }
    } catch (e) {
      console.error("Failed to search", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const pdfjs = getPdfjs();
      if (!pdfjs || !pdfjs.getDocument) throw new Error("PDF library not initialized correctly.");

      const arrayBuffer = await file.arrayBuffer();
      // Use disableWorker: true to bypass the "window.pdfjsWorker" issue
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
      const planData = await generateLearningPlan(
        formData.goal,
        formData.resources,
        formData.dailyTime,
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
        dailyCommitmentMinutes: formData.dailyTime,
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Design Your Journey</h1>
        <p className="text-slate-500 font-bold">Tailor your intelligence path to your goals and deadline.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border-2 border-red-200 text-sm font-black animate-pulse shadow-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200">
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg"><Target size={24} /></div>
                <h2 className="text-xl font-black text-slate-800">What are we learning?</h2>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject or Skill</label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({...formData, goal: e.target.value})}
                  placeholder="e.g. Master React, Learn Python for AI, etc."
                  className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none !bg-white !text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Your Current Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, skillLevel: level})}
                      className={`p-3 rounded-xl border-2 text-sm font-black transition-all ${
                        formData.skillLevel === level ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button disabled={!formData.goal} onClick={() => setStep(2)} className="bg-indigo-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black flex items-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-indigo-100"><ArrowRight size={18} /><span>Continue</span></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-pink-100 text-pink-700 rounded-lg"><Flag size={24} /></div>
                <h2 className="text-xl font-black text-slate-800">Outcome & Timeline</h2>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Expected Outcome (Optional)</label>
                <textarea
                  value={formData.expectedOutcome}
                  onChange={(e) => setFormData({...formData, expectedOutcome: e.target.value})}
                  placeholder="e.g. Build a production SaaS app, Pass the AWS Developer Exam..."
                  className="w-full p-4 h-24 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none !bg-white !text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">By When? (Optional)</label>
                <div className="relative">
                   <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.targetDate}
                    onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none pl-12 !bg-white !text-slate-900 font-black"
                   />
                   <Calendar className="absolute left-4 top-4 text-slate-600" size={20} />
                </div>
              </div>
              <div className="pt-4 flex justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 font-black px-4 hover:text-slate-800">Back</button>
                <button onClick={() => setStep(3)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black flex items-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-indigo-100"><span>Continue</span><ArrowRight size={18} /></button>
              </div>
            </div>
          )}

          {step === 3 && (
             <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><Clock size={24} /></div>
                <h2 className="text-xl font-black text-slate-800">Daily Commitment</h2>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-4">Minutes per day</label>
                <input
                  type="range"
                  min="15"
                  max="300"
                  step="15"
                  value={formData.dailyTime}
                  onChange={(e) => setFormData({...formData, dailyTime: parseInt(e.target.value)})}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="mt-8 text-center">
                  <span className="text-5xl font-black text-indigo-600">{formData.dailyTime}</span>
                  <span className="text-slate-600 ml-3 font-black text-2xl uppercase tracking-widest">min/day</span>
                </div>
                {formData.targetDate && (
                    <div className="mt-8 p-4 bg-indigo-50 text-indigo-900 rounded-xl text-sm font-black text-center border border-indigo-200 shadow-sm">
                        To meet your target of {new Date(formData.targetDate).toLocaleDateString()}, maintain a focused daily habit of {formData.dailyTime} minutes.
                    </div>
                )}
              </div>
              <div className="pt-8 flex justify-between">
                <button onClick={() => setStep(2)} className="text-slate-500 font-black px-4 hover:text-slate-800">Back</button>
                <button onClick={() => setStep(4)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black flex items-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-indigo-100"><span>Continue</span><ArrowRight size={18} /></button>
              </div>
            </div>
          )}

          {step === 4 && (
             <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg"><Book size={24} /></div>
                    <h2 className="text-xl font-black text-slate-800">Resources (Optional)</h2>
                </div>
                <button 
                  type="button"
                  onClick={handleSearchWeb} 
                  disabled={searchLoading} 
                  className="text-indigo-800 hover:text-indigo-900 text-sm font-black flex items-center bg-indigo-50 px-5 py-2.5 rounded-xl transition-all border-2 border-indigo-200 hover:bg-indigo-100 active:scale-95 shadow-sm"
                >
                    {searchLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Globe size={16} className="mr-2" />}
                    {searchLoading ? 'Searching...' : 'AI Web Search'}
                </button>
              </div>
              <textarea
                value={formData.resources}
                onChange={(e) => setFormData({...formData, resources: e.target.value})}
                placeholder="Paste links, text context, or search results here..."
                className="w-full p-4 h-52 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none !bg-white !text-slate-900 font-bold shadow-inner"
              />
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <label className="cursor-pointer bg-slate-100 border-2 border-slate-200 px-6 py-4 rounded-xl text-sm font-black flex items-center transition-all hover:bg-slate-200 text-slate-700 active:scale-95 shadow-sm">
                        <Upload size={20} className="mr-3 text-indigo-600" /> Context Files (PDF/TXT)
                        <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                    </label>
                    {uploadedFiles.length > 0 && <span className="text-xs text-indigo-700 font-black uppercase tracking-widest">{uploadedFiles.length} files attached</span>}
                </div>
                {uploadedFiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {uploadedFiles.map((f, i) => (
                            <div key={i} className="flex items-center text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
                                <FileText size={14} className="mr-2 text-indigo-600" />
                                <span className="max-w-[140px] truncate">{f.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="ml-3 text-slate-400 hover:text-red-600 transition-colors"><X size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
              </div>
              <div className="pt-10 flex justify-between items-center">
                <button onClick={() => setStep(3)} className="text-slate-600 font-black px-4 hover:text-slate-900">Back</button>
                <button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-xl font-black text-xl flex items-center space-x-3 shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all transform active:scale-95">
                  {loading ? <><Loader2 size={26} className="animate-spin" /><span>Building Roadmap...</span></> : <><BrainCircuit size={26} /><span>Build Path</span></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePath;