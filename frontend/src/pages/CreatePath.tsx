import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateLearningPlan, scoutWebForResourcesJSON, FileAttachment } from '../services/geminiService';
import { useAppStore } from '../context/Store';
import {
  ArrowLeft, ArrowRight, Zap, Loader2,
  UploadCloud, FileText, X, Globe, Video,
  TrendingUp, Heart, BookOpen, Target, Layout as LayoutIcon,
  ChevronDown, CheckCircle2, Search
} from 'lucide-react';

/* ── Setting chip (Premium custom white capsule) ── */
const SettingChip = ({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div
    className="relative inline-flex h-8 items-center rounded-full px-3.5 text-[11px] font-semibold cursor-pointer border transition-all duration-200"
    style={{
      background: '#ffffff',
      borderColor: 'rgba(13, 13, 13, 0.08)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      color: '#0d0d0d',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(13, 13, 13, 0.16)';
      e.currentTarget.style.background = '#f7f8fa';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'rgba(13, 13, 13, 0.08)';
      e.currentTarget.style.background = '#ffffff';
    }}
  >
    <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-2">{label}</span>
    <span className="font-bold text-[#4e5bff]">{value}</span>
    <ChevronDown size={10} className="text-slate-400 ml-1.5 shrink-0" />
    <select
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => (
        <option key={opt} value={opt} style={{ color: '#0d0d0d', background: '#ffffff' }}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

/* ── Main Component ── */
const CreatePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPath } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buildLogs, setBuildLogs] = useState<{ id: number; message: string; type: 'info' | 'success' }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scoutStep, setScoutStep] = useState<string>('');
  const [scoutedResources, setScoutedResources] = useState<Array<{ id: string; title: string; url: string; snippet: string; selected: boolean; type: 'doc' | 'video' }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content?: string; attachment?: FileAttachment }[]>([]);
  const [formData, setFormData] = useState<{
    goal: string; proficiency: string; skillValue: number; expectedOutcome: string;
    targetDate: string; durationDays: number; dailyCommitment: number; resources: string;
    track: string; motivation: string; cognitiveLoad: string; outputMode: string;
    preferredStartTime: string; depth: 'Foundational' | 'Expert' | 'Advanced';
  }>(() => {
    const params = new URLSearchParams(location.search);
    return {
      goal: params.get('goal') || '',
      proficiency: 'Beginner', skillValue: 25, expectedOutcome: '',
      targetDate: '', durationDays: 30, dailyCommitment: 45, resources: '',
      track: params.get('track') || 'Architectural Build', motivation: 'Project',
      cognitiveLoad: 'Balanced', outputMode: 'Mixed', preferredStartTime: '09:00', depth: 'Expert',
    };
  });

  const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...Array.from(bytes.slice(i, i + CHUNK)));
    return btoa(binary);
  };

  const handleSearchWeb = async () => {
    if (!formData.goal) return setError('Please enter a goal first.');
    setSearchLoading(true);
    setScoutStep('Deploying SARA intelligence agents...');
    
    const logSteps = [
      { step: '[System] Cortex Scout-Sphere initialized...', delay: 100 },
      { step: '[Decomposition] Goal decomposed into 3 sub-queries...', delay: 800 },
      { step: '[Scout-Agent: Doc-Scout] Searching official documentation manuals...', delay: 1800 },
      { step: '[Scout-Agent: Video-Scout] Searching YouTube & freeCodeCamp deep-dives...', delay: 2800 },
      { step: '[Scout-Agent: Community-Scout] Traversing consensus recommendations...', delay: 3800 },
      { step: '[Curation-Jury] Scoring resources for pedagogical density...', delay: 4800 },
      { step: '[Consensus] Betting engine finalized choice resources...', delay: 5800 },
    ];
    
    const timers = logSteps.map(item => 
      setTimeout(() => setScoutStep(item.step), item.delay)
    );

    try {
      const results = await scoutWebForResourcesJSON(formData.goal);
      if (Array.isArray(results) && results.length > 0) {
        const formatted = results.map((r: any, idx: number) => ({
          id: `scout-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          title: r.title || 'Untitled Resource',
          url: r.url || '#',
          snippet: r.snippet || 'Authoritative learning guide.',
          selected: true,
          type: r.type === 'video' ? 'video' as const : 'doc' as const
        }));
        setScoutedResources(formatted);
        setError(null);
        setScoutStep('');
        // Smooth scroll to the bottom build button
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 150);
      } else {
        setError('Limited live resources discovered.');
        setScoutStep('');
      }
    } catch (err) {
      console.error(err);
      setError('Crawler encountered a live search timeout.');
      setScoutStep('');
    } finally {
      setSearchLoading(false);
      timers.forEach(clearTimeout);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        if (isPdf) {
          const base64 = await fileToBase64(file);
          const attachment: FileAttachment = { name: file.name, base64, mimeType: 'application/pdf' };
          setUploadedFiles(prev => [...prev, { name: file.name, attachment }]);
        } else {
          const text = await file.text();
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setFormData(prev => ({ ...prev, resources: prev.resources + `\n\n--- File: ${file.name} ---\n${text}` }));
        }
        setError(null);
      } catch (err: any) { setError(err.message); }
    }
  };

  const handleGenerate = async () => {
    setLoading(true); setError(null); setBuildLogs([]);
    const simulations = [
      { msg: 'Initializing Architectural Agents...', type: 'info' as const },
      { msg: 'Analyzing target goal and timeframe...', type: 'info' as const },
      { msg: 'Structuring modular learning phases...', type: 'success' as const },
      { msg: 'Finalizing schedule generation...', type: 'success' as const },
    ];
    let simActive = true;
    const simTimeouts = simulations.map((s, idx) =>
      setTimeout(() => { if (simActive) setBuildLogs(prev => [{ id: Date.now(), message: s.msg, type: s.type }, ...prev]); }, (idx + 1) * 1200)
    );
    try {
      const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + formData.durationDays);
      const fileAttachments: FileAttachment[] = uploadedFiles.filter(f => f.attachment).map(f => f.attachment!);
      
      const selectedScoutedText = scoutedResources
        .filter(r => r.selected)
        .map(r => `[${r.type.toUpperCase()}] ${r.title} — ${r.url}\nRelevance: ${r.snippet}`)
        .join('\n\n');

      const compiledResources = [
        formData.resources,
        selectedScoutedText ? `--- AI Web Search Grounding ---\n${selectedScoutedText}` : ''
      ].filter(Boolean).join('\n\n');

      const planData: any = await generateLearningPlan(
        `Goal: ${formData.goal}\nTrack: ${formData.track}\nMotivation: ${formData.motivation}\nLoad: ${formData.cognitiveLoad}`,
        compiledResources, formData.dailyCommitment, formData.proficiency, '',
        targetDate.toISOString().split('T')[0], formData.depth,
        fileAttachments.length > 0 ? fileAttachments : undefined
      );
      const phasesWithIds = (planData.phases || []).map((p: any) => ({
        ...p, id: generateSimpleId(),
        modules: (p.modules || []).map((m: any) => ({ ...m, id: generateSimpleId() })),
      }));
      const newPath: any = {
        id: generateSimpleId(), userId: 'default-user', title: planData.title || formData.goal,
        goal: formData.goal, createdAt: new Date().toISOString(), status: 'active', progress: 0,
        dailyCommitmentMinutes: formData.dailyCommitment,
        phases: phasesWithIds.map((p: any, i: number) => ({
          id: p.id, title: p.title, description: p.description, order: i + 1,
          modules: p.modules.map((m: any) => ({
            id: m.id, title: m.title, description: m.description,
            estimatedMinutes: m.estimatedMinutes, isCompleted: false,
            keyConcepts: m.keyConcepts || [],
            resources: (m.suggestedResources || []).map((sr: any) => {
              if (!sr?.url) return null;
              const isYoutube = sr.url.includes('youtube.com') || sr.url.includes('youtu.be');
              let videoId = undefined;
              if (isYoutube) videoId = sr.url.includes('v=') ? sr.url.split('v=')[1]?.split('&')[0] : sr.url.split('/').pop();
              return { id: generateSimpleId(), type: isYoutube ? 'youtube' : 'url', content: sr.url, title: sr.title || 'Untitled Resource', videoId };
            }).filter(Boolean),
            dependsOnModuleIds: [], userNotes: '',
          })),
        })),
        sessions: [], preferredStartTime: formData.preferredStartTime,
      };
      addPath(newPath);
      navigate(`/path/${newPath.id}`);
    } catch (err: any) { setError(err.message); } finally {
      setLoading(false); simActive = false; simTimeouts.forEach(clearTimeout);
    }
  };

  const suggestionCards = [
    { title: 'Fullstack Systems',     subtitle: 'React, Node, DBs',            icon: <LayoutIcon size={16} />,  goal: 'Fullstack Web Specialist' },
    { title: 'AI & Machine Learning', subtitle: 'Neural Networks, LLMs',       icon: <Zap size={16} />,         goal: 'AI & Machine Learning Engineer' },
    { title: 'Corporate Finance',     subtitle: 'Valuation, Stocks, Capital',   icon: <TrendingUp size={16} />,  goal: 'Corporate Finance Specialist' },
    { title: 'Human Anatomy',         subtitle: 'Muscles, Organs, Systems',     icon: <Heart size={16} />,       goal: 'Human Anatomy Mastery' },
    { title: 'Creative Writing',      subtitle: 'Novels, Storytelling, Plot',   icon: <BookOpen size={16} />,    goal: 'Creative Fiction Author' },
    { title: 'Mindset & Motivation',  subtitle: 'Habits, Focus, Grit',          icon: <Target size={16} />,      goal: 'Peak Performance Mastery' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto antialiased bg-transparent">
      <div className="w-full max-w-[1020px] mx-auto px-6 sm:px-8 pt-12 pb-24">
        
        {/* ── Page Header (Directly in Navy Background Zone) ── */}
        <div className="mb-10 text-white flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a5b4fc]/80 bg-[#4e5bff]/20 border border-[#4e5bff]/30 px-2 py-0.5 rounded-md">
                SARA Engine v2
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                · Path Wizard
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What should <span className="italic font-serif text-[#c7d2fe]">Cortex</span> build?
            </h1>
            <p className="mt-2 text-sm text-[#e0e7ff]/70 max-w-[520px] leading-relaxed">
              Enter your learning goal, choose a template, and customize depth, timeline, level, or focus filters. Optional: inject custom reference syllabus or files below to ground the builder.
            </p>
          </div>
        </div>

        {/* ── Sliding White Content Sheet ── */}
        <div 
          className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-100 shadow-[0_12px_40px_rgba(13,23,48,0.04)] min-h-[56vh] flex flex-col justify-between animate-none"
        >
          {/* Roadmap Suite Top Bar */}
          <div className="flex items-center gap-2 mb-8 justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4e5bff] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roadmap Customization Suite</span>
            </div>
            <span className="text-[10px] font-bold text-[#4e5bff] uppercase tracking-wider">PRESET ACTIVE</span>
          </div>

          <div className="w-full flex-1 flex flex-col justify-center">
            {loading ? (
              /* Loading Build State */
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-[#4e5bff]/5 border border-[#4e5bff]/10 shadow-[0_0_24px_rgba(78,91,255,0.06)]"
                >
                  <Loader2 size={24} className="animate-spin text-[#4e5bff]" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-[#0d0d0d]">Building learning path...</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Generating modules, schedules, and curating reference guides.</p>
                </div>
                <div className="w-full max-w-sm space-y-3 pt-4 border-t border-slate-100 mt-6">
                  {buildLogs.map(log => (
                    <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${log.type === 'success' ? 'bg-emerald-500' : 'bg-[#4e5bff] animate-pulse'}`}
                      />
                      <span className="text-xs font-semibold text-slate-600">{log.message}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

            ) : (
              /* Consolidated Flat Layout */
              <div className="space-y-6 w-full py-2">
                {/* 1. Template Suggestions */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">Choose a starting template</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                    {suggestionCards.map((card, idx) => {
                      const isSelected = formData.goal === card.goal;
                      return (
                        <button
                          key={idx}
                          onClick={() => setFormData({ ...formData, goal: card.goal })}
                          className="flex flex-col p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group w-full"
                          style={{
                            background: isSelected ? 'rgba(78, 91, 255, 0.02)' : '#ffffff',
                            borderColor: isSelected ? '#4e5bff' : 'rgba(13, 13, 13, 0.08)',
                            boxShadow: isSelected ? '0 4px 16px rgba(78, 91, 255, 0.04)' : 'none',
                          }}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 text-xs"
                              style={{
                                background: isSelected ? '#4e5bff' : 'rgba(13, 13, 13, 0.04)',
                                color: isSelected ? '#ffffff' : '#0d0d0d',
                              }}
                            >
                              {card.icon}
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={14} className="text-[#4e5bff]" fill="currentColor" style={{ color: '#4e5bff', fill: 'rgba(78,91,255,0.1)' }} />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0d0d0d]">{card.title}</div>
                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">{card.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Paste Area & Web Scout */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Reference guidelines & syllabus (Optional)</span>
                    {!searchLoading && scoutedResources.length === 0 && (
                      <button
                        onClick={handleSearchWeb}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-[#0d0d0d]"
                      >
                        <Globe size={11} className="text-slate-400" />
                        AI Web Scout
                      </button>
                    )}
                  </div>
                  
                  {searchLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center space-y-2 shadow-[0_4px_12px_rgba(0,0,0,0.01)] animate-none">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#4e5bff] animate-ping" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#0d0d0d]">SARA Web Intelligence</span>
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 py-1">
                        <div className="flex items-center gap-2">
                          <Loader2 size={11} className="animate-spin text-[#4e5bff]" />
                          <span>{scoutStep}</span>
                        </div>
                      </div>
                    </div>
                  ) : scoutedResources.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Scouted reference resources</span>
                        <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {scoutedResources.filter(r => r.selected).length} selected for grounding
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {scoutedResources.map(res => (
                          <div
                            key={res.id}
                            onClick={() => setScoutedResources(prev => prev.map(item => item.id === res.id ? { ...item, selected: !item.selected } : item))}
                            className="p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-2 relative overflow-hidden"
                            style={{
                              background: res.selected ? 'rgba(78, 91, 255, 0.02)' : '#ffffff',
                              borderColor: res.selected ? '#4e5bff' : 'rgba(13, 13, 13, 0.08)',
                            }}
                          >
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-[10px]"
                              style={{
                                background: res.selected ? '#4e5bff' : '#f7f8fa',
                                borderColor: res.selected ? '#4e5bff' : 'rgba(13, 13, 13, 0.08)',
                                color: res.selected ? '#ffffff' : '#64748b',
                              }}
                            >
                              {res.type === 'video' ? <Video size={10} /> : <Globe size={10} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-slate-900 truncate block leading-tight">{res.title}</span>
                              <p className="text-[10px] text-slate-400 leading-snug truncate mt-0.5">{res.snippet}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <textarea
                    value={formData.resources}
                    onChange={e => setFormData({ ...formData, resources: e.target.value })}
                    placeholder="Paste learning schedules, custom syllabus docs, core topics, constraints, or notes to instruct SARA..."
                    className="w-full h-[95px] rounded-xl p-3.5 text-xs font-medium outline-none transition-all resize-none bg-slate-50 border border-slate-200/60 text-[#0d0d0d] placeholder:text-slate-400 focus:border-[#4e5bff] focus:bg-white focus:ring-2 focus:ring-[#4e5bff]/5"
                  />
                </div>

                {/* 3. File Upload Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Upload reference materials (Optional)</span>
                    <label
                      className="flex items-center justify-center w-full h-[56px] rounded-xl border border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-[#4e5bff] cursor-pointer transition-all duration-200"
                    >
                      <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf" />
                      <div className="flex items-center gap-2 text-slate-400">
                        <UploadCloud size={14} />
                        <span className="text-xs font-semibold">Upload document (.pdf, .md, .txt)</span>
                      </div>
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Uploaded items</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[56px] overflow-y-auto pr-1">
                        {uploadedFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium bg-slate-50 border-slate-200 text-[#0d0d0d]"
                          >
                            <FileText size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[100px] text-[11px]">{f.name}</span>
                            {f.attachment && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded shrink-0">PDF</span>}
                            <button 
                              onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))} 
                              className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0 ml-0.5"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error alerts */}
            {error && (
              <div className="mt-4 text-xs font-bold px-4 py-2.5 rounded-xl text-red-600 bg-red-50 border border-red-100 shrink-0">
                {error}
              </div>
            )}
          </div>

          {/* ── Bottom Input & Settings Bar ── */}
          {!loading && (
            <div ref={bottomRef} className="shrink-0 pt-6 mt-6 border-t border-slate-100 w-full max-w-3xl mx-auto z-10">
              <div className="flex flex-col gap-4">
                
                {/* Settings Chips (Unconditional / Persistent) */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap justify-center gap-2 px-2"
                >
                  <SettingChip
                    label="Depth" value={formData.depth}
                    options={['Foundational', 'Expert', 'Advanced']}
                    onChange={v => setFormData({ ...formData, depth: v as any })}
                  />
                  <SettingChip
                    label="Timeline" value={`${formData.durationDays}d at ${formData.dailyCommitment}m/day`}
                    options={['14d at 30m/day', '30d at 45m/day', '60d at 60m/day', '90d at 90m/day']}
                    onChange={v => {
                      const days = parseInt(v.split('d')[0]);
                      const mins = parseInt(v.split('at ')[1].split('m')[0]);
                      setFormData({ ...formData, durationDays: days, dailyCommitment: mins });
                    }}
                  />
                  <SettingChip
                    label="Level" value={formData.proficiency}
                    options={['Novice', 'Beginner', 'Competent', 'Expert']}
                    onChange={v => setFormData({ ...formData, proficiency: v })}
                  />
                  <SettingChip
                    label="For" value={formData.motivation}
                    options={['Career', 'Project', 'Academic', 'Hobby']}
                    onChange={v => setFormData({ ...formData, motivation: v })}
                  />
                  <SettingChip
                    label="Load" value={formData.cognitiveLoad}
                    options={['Balanced', 'Spaced', 'Intense']}
                    onChange={v => setFormData({ ...formData, cognitiveLoad: v })}
                  />
                  <SettingChip
                    label="Mode" value={formData.outputMode}
                    options={['Mixed', 'Textbook', 'Interactive', 'Video-First']}
                    onChange={v => setFormData({ ...formData, outputMode: v })}
                  />
                  <SettingChip
                    label="Time" value={formData.preferredStartTime}
                    options={['06:00', '09:00', '14:00', '19:00', '22:00']}
                    onChange={v => setFormData({ ...formData, preferredStartTime: v })}
                  />
                  <SettingChip
                    label="Focus" value={formData.track}
                    options={['Architectural Build', 'Technical Deep-dive', 'Academic Exam Prep', 'Rapid Skill Sprint']}
                    onChange={v => setFormData({ ...formData, track: v })}
                  />
                </motion.div>

                {/* Primary Input CLI Pill Wrapper */}
                <div
                  className="rounded-full flex flex-col gap-3 items-stretch px-4 py-2 w-full sm:flex-row sm:items-center sm:px-5 transition-all duration-200 bg-slate-50 border border-slate-200/60 focus-within:border-[#4e5bff] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4e5bff]/5"
                >
                  <Search size={16} className="text-slate-400 shrink-0 ml-1 hidden sm:block" />
                  <input
                    value={formData.goal}
                    onChange={e => setFormData({ ...formData, goal: e.target.value })}
                    placeholder="Describe the target concept or course job to build..."
                    className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-400 px-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && formData.goal) {
                        handleGenerate();
                      }
                    }}
                  />
                  <motion.button
                    whileHover={formData.goal ? { scale: 1.01 } : {}}
                    whileTap={formData.goal ? { scale: 0.98 } : {}}
                    onClick={() => handleGenerate()}
                    disabled={!formData.goal}
                    className="h-9 w-full px-5 shrink-0 rounded-full flex items-center justify-center gap-1.5 transition-all sm:w-auto cursor-pointer"
                    style={!formData.goal ? {
                      background: 'rgba(13, 13, 13, 0.04)', color: 'rgba(13, 13, 13, 0.25)', cursor: 'not-allowed',
                    } : {
                      background: '#0f0b6b',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(15, 11, 107, 0.15)',
                    }}
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider pl-0.5">
                      Build path
                    </span>
                    <Zap size={12} fill="currentColor" />
                  </motion.button>
                </div>

                <div className="text-center text-[10px] font-semibold text-slate-400 shrink-0 pb-1">
                  Cortex will build a personalized syllabus, timelines, resource archives and modular checkpoints.
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
