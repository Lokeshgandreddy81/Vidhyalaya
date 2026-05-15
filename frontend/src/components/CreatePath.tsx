import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPlan, searchWebForResources } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import { Loader2, FileText, X, Layout as LayoutIcon, Brain, Rocket, Cloud, Paperclip } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [buildLogs, setBuildLogs] = useState<{ id: number; message: string; type: 'info' | 'success' }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [goal, setGoal] = useState(() => new URLSearchParams(location.search).get('goal') || '');

  useEffect(() => {
    const lib = pdfjsLib as any;
    const pdfjs = lib.getDocument ? lib : lib.default || lib;
    if (pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }
  }, []);

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const lib = pdfjsLib as any;
    const pdfjs = lib.getDocument ? lib : lib.default || lib;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `\n--- Page ${i} ---\n` + content.items.map((it: any) => it.str).join(' ');
    }
    return text;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = (file.type === 'application/pdf' || file.name.endsWith('.pdf'))
        ? await extractTextFromPdf(file)
        : await file.text();
      setUploadedFiles(p => [...p, { name: file.name, content: text }]);
    } catch (err: any) { setError(err.message); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSynthesize = async () => {
    if (!goal.trim()) return;
    setLoading(true); setError(null); setBuildLogs([]);
    const sims = [
      { msg: 'Initializing agents...', type: 'info' as const },
      { msg: 'Scouting web for high-fidelity resources...', type: 'info' as const },
      { msg: 'Analyzing goal and context...', type: 'info' as const },
      { msg: 'Structuring phases...', type: 'success' as const },
      { msg: 'Generating schedule...', type: 'success' as const },
    ];
    let simActive = true;
    const timers = sims.map((s, i) => setTimeout(() => {
      if (simActive) setBuildLogs(p => [{ id: Date.now(), message: s.msg, type: s.type }, ...p]);
    }, (i + 1) * 1200));

    try {
      // 1. Automatic Web Scout
      let combinedResources = uploadedFiles.map(f => f.content).join('\n\n');
      try {
        const webResults = await searchWebForResources(goal);
        if (webResults && !webResults.includes("No resources found")) {
          combinedResources += (combinedResources ? "\n\n" : "") + "--- AI Web Scout ---\n" + webResults;
        }
      } catch (e) { console.error("Web scout failed", e); }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      
      const planData: any = await generateLearningPlan(
        `Goal: ${goal}`, combinedResources, 45, 'Beginner', '', targetDate.toISOString().split('T')[0], 'Expert'
      );
      const phasesWithIds = (planData.phases || []).map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: (p.modules || []).map((m: any) => ({ ...m, id: generateSimpleId() }))
      }));
      const newPath: any = {
        id: generateSimpleId(), userId: 'default-user',
        title: planData.title || goal, goal,
        createdAt: new Date().toISOString(), status: 'active', progress: 0,
        dailyCommitmentMinutes: 45,
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id, title: p.title, description: p.description, order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id, title: m.title, description: m.description,
            estimatedMinutes: m.estimatedMinutes, isCompleted: false,
            keyConcepts: m.keyConcepts || [],
            resources: (m.suggestedResources || []).map((sr: any) => {
              if (!sr?.url) return null;
              const isYt = sr.url.includes('youtube.com') || sr.url.includes('youtu.be');
              const videoId = isYt
                ? (sr.url.includes('v=') ? sr.url.split('v=')[1]?.split('&')[0] : sr.url.split('/').pop())
                : undefined;
              return { id: generateSimpleId(), type: isYt ? 'youtube' : 'url', content: sr.url, title: sr.title || 'Untitled', videoId };
            }).filter(Boolean),
            dependsOnModuleIds: [], userNotes: ''
          }))
        })),
        sessions: [], preferredStartTime: '09:00'
      };
      addPath(newPath);
      navigate(`/path/${newPath.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false); simActive = false; timers.forEach(clearTimeout);
    }
  };

  const suggestions = [
    { icon: <LayoutIcon size={14} />, label: 'Fullstack Systems' },
    { icon: <Brain size={14} />, label: 'AI Architecture' },
    { icon: <Rocket size={14} />, label: 'Data Science' },
    { icon: <Cloud size={14} />, label: 'Cloud & DevOps' },
  ];

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center px-6">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">Building your path</p>
            <p className="text-gray-400 text-sm mt-1">"{goal}"</p>
          </div>
          <div className="w-full text-left space-y-2.5">
            {buildLogs.map(log => (
              <motion.div key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-400 animate-pulse'}`} />
                <span className="text-sm text-gray-500">{log.message}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-6">

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-[28px] sm:text-[34px] font-semibold text-gray-900 text-center mb-8 tracking-tight"
      >
        What will you master today?
      </motion.h1>

      {/* Input bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-3.5 shadow-sm focus-within:border-gray-400 transition-colors">
          <input
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && goal.trim()) handleSynthesize(); }}
            placeholder="Ask anything"
            className="flex-1 bg-transparent outline-none text-gray-800 text-[15px] placeholder:text-gray-400"
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0">
            {/* Attach */}
            <label className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400">
              <Paperclip size={16} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
            </label>
          </div>
        </div>

        {/* Uploaded file tags */}
        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mt-3 px-2">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full text-[12px] font-medium text-gray-600">
                  <FileText size={12} className="text-gray-400" />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400 ml-0.5">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-2 mt-5"
      >
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setGoal(s.label)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <span className="text-gray-400">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-red-500 text-sm mt-4 text-center">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatePath;
