import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  generateModuleContent, 
  scoutResources, 
  chatWithTutor, 
  generateQuizForModule 
} from '../services/geminiService';
import { ChatMessage, QuizQuestion } from '../types';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader, BookOpen, PenLine, File, ChevronLeft,
  CheckCircle2, Zap, Bold, Italic, List as ListIcon, Send, Eye
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import ContentRenderer from './ContentRenderer';
import NeuralSynthesizer, { NodeDetailPanel, ConceptNode } from './NeuralSynthesizer';
import Smartboard from './Smartboard';
import AITerminalOverlay, { ActionType } from './AITerminalOverlay';
import { mapMasteryTimeline } from '../services/geminiService';
import { VideoSegment } from '../types';

const RichNotesEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== content) editorRef.current.innerHTML = content || ''; }, [content]);
  const exec = (command: string, value: string = '') => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
        <button onMouseDown={e => { e.preventDefault(); exec('bold'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><Bold size={14}/></button>
        <button onMouseDown={e => { e.preventDefault(); exec('italic'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><Italic size={14}/></button>
        <div className="mx-1.5 h-4 w-px bg-slate-200" />
        <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} className="p-2 rounded-[10px] text-slate-400 hover:text-[#000666] hover:bg-white transition-all"><ListIcon size={14}/></button>
      </div>
      <div className="flex-1 min-h-0 bg-white">
        <div ref={editorRef} contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} data-placeholder="Start writing notes..."
          className="rich-editor h-full overflow-y-auto p-6 text-[14px] leading-relaxed text-slate-700 focus:outline-none custom-scrollbar" />
      </div>
    </div>
  );
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { paths, updateModuleStatus, saveModuleNotes, saveModuleContent, saveModuleCitations } = useAppStore();

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz' | 'vault'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'complete'>('idle');
  const [leftPanelMode, setLeftPanelMode] = useState<'smartboard' | 'content' | 'visualizer'>('smartboard');
  const [focusMode, setFocusMode] = useState<'content' | 'split'>('split');
  const [saraOpen, setSaraOpen] = useState(true);
  const [selectedNeuralNode, setSelectedNeuralNode] = useState<ConceptNode | null>(null);
  const [isNeuralFullScreen, setIsNeuralFullScreen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalAction, setTerminalAction] = useState<ActionType>('refresh');
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [videoTimeline, setVideoTimeline] = useState<VideoSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isScouting, setIsScouting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);

  const nextModule = useMemo(() => {
    if (!path || !module) return null;
    const allModules = path.phases.flatMap(p => p.modules);
    const idx = allModules.findIndex(m => m.id === moduleId);
    return (idx !== -1 && idx < allModules.length - 1) ? allModules[idx + 1] : null;
  }, [path, module, moduleId]);

  useEffect(() => {
    if (module) {
      setNotes(module.userNotes || '');
      if (module.generatedContent) {
        setGeneratedContent(module.generatedContent);
        scoutAndMap(module.generatedContent);
      }
      else loadContent();
    }
  }, [module?.id]);

  const loadContent = async () => {
    if (!module) return;
    setIsContentLoading(true);
    try {
      const { content, citations } = await generateModuleContent(module.title, module.keyConcepts, path?.goal || 'General Mastery');
      setGeneratedContent(content);
      if (pathId && phaseId && moduleId) {
        saveModuleContent(pathId, phaseId, moduleId, content);
        if (citations) saveModuleCitations(pathId, phaseId, moduleId, citations);
      }
      
      // Post-content scouting
      scoutAndMap(content);
    } catch (err) { toast.error("Synthesis bottleneck."); } finally { setIsContentLoading(false); }
  };

  const scoutAndMap = async (content: string) => {
    if (!module || !path) return;
    setIsScouting(true);
    try {
      let currentResources = module.resources || [];
      if (currentResources.length === 0) {
        currentResources = await scoutResources(module.title, path.goal);
        // Save resources to store if possible (ignoring for now to focus on UI)
      }
      
      if (currentResources.length > 0) {
        const videoIds = currentResources.filter(r => r.type === 'youtube' && r.videoId).map(r => r.videoId as string);
        if (videoIds.length > 0) {
          const timeline = await mapMasteryTimeline(content, videoIds);
          setVideoTimeline(timeline);
        }
      }
    } catch (err) {
      console.error("Scouting failed:", err);
    } finally {
      setIsScouting(false);
    }
  };

  // Scroll Detection for Progression
  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // 20px threshold for bottom detection
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
      if (isAtBottom && !hasReachedBottom) {
        setHasReachedBottom(true);
      }
    };

    // Also check if content is shorter than viewport
    const checkInitial = () => {
      if (el.scrollHeight <= el.clientHeight && el.clientHeight > 0) {
        setHasReachedBottom(true);
      }
    };

    el.addEventListener('scroll', handleScroll);
    const resizeObserver = new ResizeObserver(checkInitial);
    resizeObserver.observe(el);
    
    checkInitial();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [generatedContent, leftPanelMode, isContentLoading]);

  useEffect(() => {
    setHasReachedBottom(false);
  }, [moduleId]);

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: msg, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const response = await chatWithTutor(chatHistory, msg, `Module: ${module?.title}`);
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
    } finally { setIsTyping(false); }
  };

  const handleTerminalComplete = (result: any) => {
    setTerminalOpen(false);
    if (terminalAction === 'quiz') { setQuizQuestions(result); setQuizState('active'); setIsQuizModalOpen(true); }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden font-sans">
      
      {(!path || !module) ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white animate-in fade-in duration-1000">
          <div className="relative">
            <div className="w-24 h-24 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-[#000666]/5 animate-pulse" />
              <Loader size={32} className="animate-spin text-[#000666] relative z-10" />
            </div>
            <div className="absolute -inset-4 border border-dashed border-slate-200 rounded-full animate-[spin_20s_linear_infinite] opacity-50" />
          </div>
          <div className="mt-12 text-center space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#000666] animate-pulse">Synchronizing Neural Data</h2>
            <p className="text-[12px] font-medium text-slate-400 font-serif italic italic tracking-wide">
              Establishing scholarly context and mapping knowledge dependencies...
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="shrink-0 h-16 bg-white border-b border-slate-100 px-5 sm:px-8 grid grid-cols-3 items-center z-[60]">
            {/* Left Section */}
            <div className="flex items-center gap-4 min-w-0 pr-4">
              <Link to="/dashboard" className="p-2.5 shrink-0 rounded-xl text-slate-400 hover:text-[#000666] hover:bg-slate-50 transition-all">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] truncate">{phase?.title}</span>
                  <div className="w-1 h-1 shrink-0 rounded-full bg-slate-200 hidden xl:block" />
                  <span className="text-[10px] shrink-0 font-black text-slate-400 uppercase tracking-[0.3em] hidden xl:block">Knowledge Module</span>
                </div>
                <h1 className="text-[16px] font-black text-slate-900 tracking-tight leading-none truncate">{module.title}</h1>
              </div>
            </div>

            {/* Center Section: Mode Toggle */}
            <div className="flex justify-center min-w-0">
              <div className="flex bg-slate-50 p-0.5 rounded-[10px] ring-1 ring-slate-100 shadow-sm">
              <button 
                onClick={() => {
                  setLeftPanelMode('smartboard');
                  setSelectedNeuralNode(null);
                }}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'smartboard' ? 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Smartboard
              </button>
              <button 
                onClick={() => {
                  setLeftPanelMode('content');
                  setSelectedNeuralNode(null);
                }}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'content' ? 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Whiteboard
              </button>
              <button 
                onClick={() => setLeftPanelMode('visualizer')}
                className={`px-3 py-1.5 rounded-[8px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${leftPanelMode === 'visualizer' ? 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Neural Map
              </button>
            </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end gap-4 min-w-0">
              <button 
                onClick={() => {
                  const next = !saraOpen;
                  setSaraOpen(next);
                  setFocusMode(next ? 'split' : 'content');
                }}
                className={`flex items-center gap-2 h-7 px-4 rounded-[11px] transition-all ${saraOpen ? 'bg-[#000666] text-white shadow-sm' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:text-slate-600 hover:bg-slate-100'}`}
              >
                <BookOpen size={12} strokeWidth={2.4} />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] hidden sm:block">
                  {saraOpen ? 'Close Panel' : 'Panel Mode'}
                </span>
              </button>
            </div>
          </header>

          <main ref={containerRef} className="flex-1 flex overflow-hidden bg-white relative min-h-0">
            {/* GLOBAL SYNTHESIS OVERLAY (Covers full main area) */}
            {isContentLoading && (
              <div className="absolute inset-0 z-[100] bg-white animate-in fade-in duration-700">
                <ContentRenderer 
                  content={null} 
                  isLoading={true} 
                  moduleTitle={module.title} 
                />
              </div>
            )}
            {/* PANEL 1: CONTENT / VISUALIZER */}
               <div className="flex flex-col relative border-r border-slate-50 transition-all duration-500 flex-1 h-full min-w-0 min-h-0">

                 <div className="flex-1 overflow-hidden relative min-h-0">
                    {leftPanelMode === 'smartboard' ? (
                      <Smartboard 
                        videoId={module.resources?.find(r => r.type === 'youtube')?.videoId || ''}
                        allVideoIds={module.resources?.filter(r => r.type === 'youtube').map(r => ({ id: r.videoId!, title: r.title || '' }))}
                        moduleTitle={module.title}
                        moduleContent={generatedContent}
                        timeline={videoTimeline}
                        activeSegmentId={activeSegmentId || undefined}
                        onTimestampReached={(seg) => setActiveSegmentId(seg.id)}
                        onReSync={() => scoutAndMap(generatedContent || '')}
                        focusMode={focusMode}
                      />
                    ) : leftPanelMode === 'content' ? (
                     <div className="h-full overflow-hidden">
                        <ContentRenderer 
                          content={generatedContent} 
                          isLoading={isContentLoading} 
                          moduleTitle={module.title} 
                          scrollRef={contentScrollRef}
                          onSelectionAction={(action, text) => {
                            setSaraOpen(true);
                            setActiveRightTab('chat');
                            let prompt = '';
                            if (action === 'explain') prompt = `Explain this in depth within the context of ${module.title}: "${text}"`;
                            else if (action === 'summarize') prompt = `Give me a concise scholarly summary of this: "${text}"`;
                            else if (action === 'examples') prompt = `Provide 3 real-world technical examples for this concept: "${text}"`;
                            handleSendMessage(prompt);
                          }}
                        />
                        
                        {hasReachedBottom && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                              <button 
                                onClick={() => updateModuleStatus(pathId!, phaseId!, moduleId!, !module.isCompleted)}
                                className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${module.isCompleted ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-slate-900 border border-slate-200 shadow-md hover:border-[#000666]'}`}
                              >
                                {module.isCompleted ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                                {module.isCompleted ? 'Mastered' : 'Mark Complete'}
                              </button>
                              
                              {nextModule && (
                                <button 
                                  onClick={() => navigate(`/study/${pathId}/${phaseId}/${nextModule.id}`)}
                                  className="px-6 py-3 rounded-full bg-[#000666] text-white text-[9px] font-black uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2.5 group"
                                >
                                  Next Chapter
                                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                          </div>
                        )}
                     </div>
                   ) : (
                      <NeuralSynthesizer 
                        moduleTitle={module.title} 
                        moduleContent={generatedContent} 
                        keyConcepts={module.keyConcepts} 
                        generatedContent={generatedContent || ''} 
                        onNodeClick={(node) => {
                          setSelectedNeuralNode(node);
                          setSaraOpen(true);
                        }}
                        onFullScreenToggle={() => {
                          const nextState = !isNeuralFullScreen;
                          setIsNeuralFullScreen(nextState);
                          if (nextState) setSaraOpen(false);
                          else setSaraOpen(true);
                        }}
                        isFullScreen={isNeuralFullScreen}
                        focusMode={focusMode}
                      />
                   )}
                 </div>
              </div>
            
            {/* PANEL 2: ASSISTANT SIDEBAR */}
            <div className={`shrink-0 bg-white border-l border-slate-100 flex flex-col transition-all duration-500 ease-in-out overflow-hidden ${(saraOpen && !isContentLoading) ? 'w-[420px] min-w-[420px] opacity-100' : 'w-0 min-w-0 opacity-0 pointer-events-none'}`}>
               <div className="flex border-b border-slate-50 bg-slate-50/30 p-1.5 gap-1 shrink-0">
                  {['chat', 'notes', 'quiz', 'vault'].map(t => (
                    <button key={t} onClick={() => setActiveRightTab(t as any)}
                       className={`flex-1 py-2 rounded-[10px] text-[8px] font-black uppercase tracking-[0.2em] transition-all ${activeRightTab === t ? 'bg-white text-[#000666] shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}>{t}</button>
                  ))}
               </div>
               
               <div className="flex-1 overflow-hidden">
                  {leftPanelMode === 'visualizer' ? (
                    selectedNeuralNode ? (
                      <NodeDetailPanel 
                        node={selectedNeuralNode} 
                        moduleTitle={module.title} 
                        onClose={() => setSelectedNeuralNode(null)}
                        isSidebar={true}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                          <Eye size={24} />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2">Neural Observation</h4>
                        <p className="text-[10px] font-medium text-slate-400 max-w-[200px] leading-relaxed">Select a node in the map to expand its scholarly detail.</p>
                      </div>
                    )
                  ) : (
                    <>
                      {activeRightTab === 'chat' && (
                        <div className="flex h-full flex-col bg-white">
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                            {chatHistory.map((m) => (
                              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-[#000666] text-white' : 'bg-slate-50 text-slate-700'}`}>
                                  <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                            {isTyping && <div className="flex justify-start"><div className="bg-slate-50 p-4 rounded-2xl"><Loader size={16} className="animate-spin text-slate-400" /></div></div>}
                          </div>
                          <div className="p-4 border-t border-slate-100">
                             <div className="relative">
                                <input 
                                  ref={chatInputRef}
                                  value={inputMessage}
                                  onChange={(e) => setInputMessage(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                  placeholder="Ask SARA anything..."
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-4 pr-12 text-[13px] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                />
                                <button onClick={() => handleSendMessage()} className="absolute right-2 top-1.5 p-2 bg-[#000666] text-white rounded-lg hover:scale-105 active:scale-95 transition-all"><Send size={14} /></button>
                             </div>
                          </div>
                        </div>
                      )}
                      {activeRightTab === 'notes' && <RichNotesEditor content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />}
                      {activeRightTab === 'quiz' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
                          <button onClick={async () => {
                            setIsTyping(true);
                            try {
                              const questions = await generateQuizForModule(module.title, module.keyConcepts);
                              setQuizQuestions(questions);
                              setQuizState('active');
                              setIsQuizModalOpen(true);
                            } finally { setIsTyping(false); }
                          }} className="px-8 py-4 bg-[#000666] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Start Assessment</button>
                        </div>
                      )}
                      {activeRightTab === 'vault' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
                          <File size={32} className="text-slate-300 mb-4" />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Knowledge Vault Coming Soon</p>
                        </div>
                      )}
                    </>
                  )}
               </div>
            </div>
          </main>
        </>
      )}

      {/* Global Modals */}
      <AITerminalOverlay isOpen={terminalOpen} actionType={terminalAction} topic={module?.title || ''} onClose={() => setTerminalOpen(false)} onComplete={handleTerminalComplete} executor={async () => {}} />
    </div>
  );
};

export default StudySession;
