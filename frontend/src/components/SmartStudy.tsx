import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SmartStudyProvider, useSmartStudy } from '../context/SmartStudyContext';
import { UploadCloud, FileText, BrainCircuit, X, MessageSquare, Loader2, ChevronLeft, ChevronRight, Trash2, ArrowLeft, Sparkles, Monitor, BookOpen, ListTodo, Layers, GraduationCap, School, Database, Cpu, Globe, Terminal, LogOut, ZoomIn, ZoomOut, RotateCcw, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import FlashcardViewer from '../features/study/FlashcardViewer';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type MockSubject = { id: string; title: string; code: string; icon: React.FC<{size:number}>; color: string; pdfUrl: string };
const MOCK_CURRICULUM: Record<string, MockSubject[]> = {
  '1': [
    { id: 's1-1', title: 'Engineering Mathematics I', code: 'MA-101', icon: BrainCircuit, color: 'from-blue-500 to-indigo-600', pdfUrl: '/sample.pdf' },
    { id: 's1-2', title: 'Engineering Physics', code: 'PH-101', icon: Globe, color: 'from-purple-500 to-pink-600', pdfUrl: '/sample.pdf' },
    { id: 's1-3', title: 'Basic Electronics', code: 'EC-101', icon: Cpu, color: 'from-emerald-500 to-teal-600', pdfUrl: '/sample.pdf' },
  ],
  '2': [
    { id: 's2-1', title: 'Engineering Mathematics II', code: 'MA-201', icon: BrainCircuit, color: 'from-rose-500 to-pink-600', pdfUrl: '/sample.pdf' },
    { id: 's2-2', title: 'Programming in C', code: 'CS-201', icon: Terminal, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
    { id: 's2-3', title: 'Digital Logic Design', code: 'EC-201', icon: Cpu, color: 'from-amber-500 to-orange-600', pdfUrl: '/sample.pdf' },
  ],
  '3': [
    { id: 's3-1', title: 'Data Structures', code: 'CS-301', icon: Database, color: 'from-blue-500 to-indigo-600', pdfUrl: '/sample.pdf' },
    { id: 's3-2', title: 'Discrete Mathematics', code: 'MA-301', icon: BrainCircuit, color: 'from-rose-500 to-pink-600', pdfUrl: '/sample.pdf' },
    { id: 's3-3', title: 'Computer Organization', code: 'CS-302', icon: Cpu, color: 'from-purple-500 to-pink-600', pdfUrl: '/sample.pdf' },
  ],
  '4': [
    { id: 's4-1', title: 'Algorithms', code: 'CS-401', icon: Terminal, color: 'from-emerald-500 to-teal-600', pdfUrl: '/sample.pdf' },
    { id: 's4-2', title: 'Operating Systems', code: 'CS-402', icon: Terminal, color: 'from-emerald-500 to-teal-600', pdfUrl: '/sample.pdf' },
    { id: 's4-3', title: 'Computer Networks I', code: 'CS-403', icon: Globe, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
  ],
  '5': [
    { id: 's5-1', title: 'Database Management Systems', code: 'CS-501', icon: Database, color: 'from-orange-500 to-red-600', pdfUrl: '/sample.pdf' },
    { id: 's5-2', title: 'Computer Architecture', code: 'CS-502', icon: Cpu, color: 'from-purple-500 to-pink-600', pdfUrl: '/sample.pdf' },
    { id: 's5-3', title: 'Software Engineering', code: 'CS-503', icon: Globe, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
  ],
  '6': [
    { id: 's6-1', title: 'Data Structures & Algorithms', code: 'CS-601', icon: Database, color: 'from-blue-500 to-indigo-600', pdfUrl: '/sample.pdf' },
    { id: 's6-2', title: 'Compiler Design', code: 'CS-602', icon: Terminal, color: 'from-emerald-500 to-teal-600', pdfUrl: '/sample.pdf' },
    { id: 's6-3', title: 'Machine Learning', code: 'CS-603', icon: BrainCircuit, color: 'from-violet-500 to-purple-600', pdfUrl: '/sample.pdf' },
    { id: 's6-4', title: 'Web Technologies', code: 'CS-604', icon: Globe, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
  ],
  '7': [
    { id: 's7-1', title: 'Artificial Intelligence', code: 'CS-701', icon: BrainCircuit, color: 'from-violet-500 to-purple-600', pdfUrl: '/sample.pdf' },
    { id: 's7-2', title: 'Cloud Computing', code: 'CS-702', icon: Globe, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
    { id: 's7-3', title: 'Information Security', code: 'CS-703', icon: Database, color: 'from-orange-500 to-red-600', pdfUrl: '/sample.pdf' },
  ],
  '8': [
    { id: 's8-1', title: 'Distributed Systems', code: 'CS-801', icon: Globe, color: 'from-indigo-500 to-cyan-600', pdfUrl: '/sample.pdf' },
    { id: 's8-2', title: 'Big Data Analytics', code: 'CS-802', icon: Database, color: 'from-blue-500 to-indigo-600', pdfUrl: '/sample.pdf' },
    { id: 's8-3', title: 'Project Work', code: 'CS-803', icon: BrainCircuit, color: 'from-rose-500 to-pink-600', pdfUrl: '/sample.pdf' },
  ],
};
const SEMESTERS = ['1','2','3','4','5','6','7','8'];

interface VaultPanelProps {
  isOpen: boolean;
  currentView: 'workspace_personal' | 'workspace_university';
  onDisconnectVault: () => void;
}

const VaultPanel: React.FC<VaultPanelProps> = ({ isOpen, currentView, onDisconnectVault }) => {
  const navigate = useNavigate();
  const { documents, activeDocumentId, setActiveDocument, addDocument, setAnalyzing, removeDocument, refreshRegistry } = useSmartStudy();

  useEffect(() => {
    refreshRegistry();
  }, []);

  // Files uploaded by the user (excludes university curriculum docs)
  const myFiles = documents.filter(doc => doc.isUniversityDoc !== true);
  
  // Group real RAG documents by Course Name
  const universityGroups = useMemo(() => {
    const ragDocs = documents.filter(doc => doc.isUniversityDoc === true);
    const groups: Record<string, typeof ragDocs> = {};
    ragDocs.forEach(doc => {
      const course = doc.courseName || 'Uncategorized';
      if (!groups[course]) groups[course] = [];
      groups[course].push(doc);
    });
    return groups;
  }, [documents]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeDocument(id);
      toast.success('Document deleted successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setAnalyzing(true);
        const dbId = await api.uploadSmartDocument(file);
        await addDocument(file, dbId);
        toast.success('Document analyzed and ready!');
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload document');
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <div className={`shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10 transition-all duration-300 ease-in-out ${isOpen ? 'w-[280px]' : 'w-0 overflow-hidden border-none'}`}>
      <div className="w-[280px] flex flex-col h-full pt-4">

        <AnimatePresence mode="wait">
          {currentView === 'workspace_personal' ? (
            <motion.div
              key="files"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Upload Area */}
              <div className="p-4 border-b border-slate-100 shrink-0">
                <label className="flex flex-row items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors group">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-500 group-hover:scale-105 transition-transform shrink-0">
                    <UploadCloud size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Upload PDF</span>
                    <span className="text-[10px] font-medium text-slate-400">Max size 20MB</span>
                  </div>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {/* File List — university docs are excluded */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {myFiles.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center px-4 py-8 italic font-medium">No documents uploaded yet.</p>
                ) : (
                  myFiles.map(doc => {
                    const isActive = activeDocumentId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        className={`group w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-indigo-50 border-l-4 border-indigo-600'
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                        onClick={() => setActiveDocument(doc.id)}
                      >
                        <FileText size={16} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-600'}`}>{doc.name}</p>
                          <p className={`text-[10px] ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>{(doc.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, doc.id)}
                          className="shrink-0 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="university"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {Object.entries(universityGroups).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Database className="text-slate-200 mb-3" size={32} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vault is Empty</p>
                    <p className="text-[10px] text-slate-300 mt-1 max-w-[140px]">Use the Admin panel to ingest institutional textbooks.</p>
                  </div>
                ) : (
                  Object.entries(universityGroups).map(([course, docs]) => (
                    <div key={course} className="space-y-2">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{course}</h3>
                       <div className="space-y-1">
                          {docs.map(doc => {
                            const isActive = activeDocumentId === doc.id;
                            return (
                              <div
                                key={doc.id}
                                onClick={() => setActiveDocument(doc.id)}
                                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                  isActive
                                    ? 'bg-indigo-50 border-l-4 border-indigo-600 shadow-sm'
                                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                                  <FileText size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{doc.name}</p>
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>Institutional Source</p>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  ))
                )}
              </div>
                  
                  {/* Footer - Disconnect Vault */}
                    <div className="mt-auto p-4 border-t border-slate-100 shrink-0 space-y-1">
                      <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Settings size={14} />
                        ⚙️ Admin / Upload Docs
                      </button>
                      <button
                        onClick={onDisconnectVault}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Disconnect Vault
                      </button>
                    </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


interface AssistantPanelProps {
  isOpen: boolean;
  activeTab: 'chat' | 'flashcards' | 'quiz' | 'notes';
  setActiveTab: (tab: 'chat' | 'flashcards' | 'quiz' | 'notes') => void;
  input: string;
  setInput: (val: string) => void;
  highlightTrigger?: { action: string, text: string, timestamp: number } | null;
  isTestMode?: boolean;
  setIsTestMode?: (val: boolean) => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, activeTab, setActiveTab, input, setInput, highlightTrigger, isTestMode, setIsTestMode }) => {
  const { isAnalyzing, activeDocumentId } = useSmartStudy();
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [documentNotes, setDocumentNotes] = useState('');
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // Ephemeral Memory Architecture: Clear history when document changes
  useEffect(() => {
    setLocalHistory([]);
  }, [activeDocumentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localHistory, isTyping]);

  useEffect(() => {
    if (highlightTrigger && activeDocumentId && isOpen) {
      const userMsg = `Can you ${highlightTrigger.action} this highlighted section?\n\n"${highlightTrigger.text}"`;
      setLocalHistory(prev => [...prev, { id: highlightTrigger.timestamp.toString(), text: userMsg, role: 'user', timestamp: highlightTrigger.timestamp }]);
      setIsTyping(true);
      
      generateChatResponse(localHistory, userMsg, activeDocumentId, highlightTrigger.text)
        .then(response => {
          setLocalHistory(prev => [...prev, { id: highlightTrigger.timestamp.toString() + 'ai', text: response, role: 'model', timestamp: Date.now() }]);
        })
        .catch(err => {
          toast.error(err.message || "Failed to get AI response");
        })
        .finally(() => {
          setIsTyping(false);
        });
    }
  }, [highlightTrigger]);

  const handleChat = async () => {
    if (!input.trim() || !activeDocumentId || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setLocalHistory(prev => [...prev, { id: Date.now().toString(), text: userMessage, role: 'user', timestamp: Date.now() }]);
    setIsTyping(true);

    try {
      const response = await generateChatResponse(localHistory, userMessage, activeDocumentId);
      setLocalHistory(prev => [...prev, { id: Date.now().toString() + 'ai', text: response, role: 'model', timestamp: Date.now() }]);
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI response");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleChat();
    }
  };

  return (
    <div className={`shrink-0 border-l border-slate-200 bg-white flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 transition-all duration-300 ease-in-out ${isOpen ? (isTestMode ? 'w-1/2' : 'w-[420px]') : 'w-0 overflow-hidden border-none'}`}>
      <div className={`${isTestMode ? 'w-full' : 'w-[420px]'} flex flex-col h-full`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-tight text-slate-800">SARA Assistant</h2>
            <p className="text-[9px] font-medium tracking-widest text-slate-400 uppercase">AI Co-Pilot</p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => {
                setActiveTab('flashcards');
                if (!isTestMode) setIsTestMode?.(false);
              }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'flashcards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Flashcards
            </button>
            <button 
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'quiz' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Quiz
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Notes
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'flashcards' && isTestMode && highlightTrigger ? (
            <FlashcardViewer 
              highlightedText={highlightTrigger.text}
              documentId={activeDocumentId!}
              onClose={() => setIsTestMode?.(false)}
            />
          ) : activeTab === 'notes' ? (
            <div className="flex-1 flex flex-col p-4">
              <textarea
                value={documentNotes}
                onChange={(e) => setDocumentNotes(e.target.value)}
                placeholder="Start taking notes about this document..."
                className="flex-1 w-full resize-none bg-transparent text-[13px] text-slate-700 placeholder:text-slate-300 outline-none leading-relaxed focus:ring-0 custom-scrollbar"
              />
              <div className="shrink-0 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">{documentNotes.length} characters</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(documentNotes); toast.success('Notes copied!'); }}
                  className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  Copy All
                </button>
              </div>
            </div>
          ) : !activeDocumentId ? (
            <div className="flex-1 flex items-center justify-center p-8">
               <p className="text-xs text-slate-400 text-center leading-relaxed">Select a document from the vault to begin chatting with SARA.</p>
            </div>
          ) : isAnalyzing ? (
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
               <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
                    <BrainCircuit size={28} className="text-[#000666] relative z-10 animate-pulse" />
                  </div>
                  <div className="absolute -inset-4 border border-dashed border-indigo-200 rounded-full animate-[spin_10s_linear_infinite] opacity-50" />
               </div>
               <h3 className="text-xs font-black uppercase tracking-widest text-[#000666] mb-2">SARA is Analyzing</h3>
               <p className="text-[10px] text-slate-500 text-center font-medium leading-relaxed">Uploading to Google AI servers and mapping semantic vectors...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative h-full">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
                
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-800 p-4 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed max-w-[85%] shadow-sm">
                    I have mapped the document contents. What would you like to explore?
                  </div>
                </div>

                {localHistory.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="markdown-body text-[13px]">
                          <ReactMarkdown>{String(msg.text)}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-medium">SARA is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="shrink-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100">
                 <div className="relative shadow-lg bg-white rounded-full border border-gray-200 flex items-center p-1.5 px-2">
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isTyping}
                      placeholder="Ask SARA anything..."
                      className="flex-1 bg-transparent border-none py-2 px-3 text-[13px] outline-none text-slate-700 placeholder:text-slate-400 disabled:opacity-50"
                    />
                    <button 
                      onClick={handleChat}
                      disabled={isTyping || !input.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-indigo-600 shrink-0"
                    >
                      <MessageSquare size={14} />
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TopNavBarProps {
  viewMode: 'document' | 'media';
  setViewMode: (mode: 'document' | 'media') => void;
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  onBackToHome: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ viewMode, setViewMode, isAssistantOpen, toggleAssistant, onBackToHome }) => {
  const navigate = useNavigate();
  const { documents, activeDocumentId } = useSmartStudy();
  const activeDoc = documents.find(d => d.id === activeDocumentId);

  return (
    <div className="shrink-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-30">
      {/* LEFT: Back + Brand */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onBackToHome}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-px h-6 bg-slate-200 shrink-0" />
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent leading-none">SARA</h1>
            <p className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase mt-1">Smart Study</p>
          </div>
          {activeDoc && (
            <>
              <span className="text-slate-300 text-lg font-light leading-none">/</span>
              <span className="text-sm font-semibold text-slate-600 truncate max-w-[200px] leading-none">{activeDoc.name}</span>
            </>
          )}
        </div>
      </div>

      {/* CENTER: Mode Toggle */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center bg-slate-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setViewMode('media')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === 'media'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Monitor size={13} />
            Media Panel
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === 'document'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen size={13} />
            Document Focus
          </button>
        </div>
      </div>

      {/* RIGHT: SARA Assistant Toggle */}
      <div className="shrink-0">
        <button
          onClick={toggleAssistant}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
            isAssistantOpen
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <Sparkles size={13} />
          SARA Assistant
        </button>
      </div>
    </div>
  );
};

interface MiddlePanelProps {
  isVaultOpen: boolean;
  toggleVault: () => void;
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  viewMode: 'document' | 'media';
  onHighlightAction: (action: 'explain' | 'example' | 'quiz' | 'flashcards', text: string) => void;
  isUniversitySynced: boolean;
  activeSemester: string;
  currentView: 'workspace_personal' | 'workspace_university';
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({ isVaultOpen, toggleVault, isAssistantOpen, toggleAssistant, viewMode, onHighlightAction, isUniversitySynced, activeSemester, currentView }) => {
  const { documents, activeDocumentId, setActiveHighlightContext, setActiveDocument, addMockDocument } = useSmartStudy();
  const activeDoc = documents.find(d => d.id === activeDocumentId);

  const [selectionText, setSelectionText] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = pdfWrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(prev => Math.min(Math.max(prev - e.deltaY * 0.01, 0.5), 3.0));
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  const selectMockSubject = (subject: MockSubject) => {
    addMockDocument(subject.id, subject.title, subject.pdfUrl);
    toast.success(`Loading ${subject.title}...`);
  };

  const semesterSubjectsForGrid = MOCK_CURRICULUM[activeSemester] || [];

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionText(text);
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setMenuPosition(null);
      setSelectionText('');
    }
  };

  const handleMouseDown = () => {
    if (menuPosition) {
      setMenuPosition(null);
    }
  };

  const executeHighlightAction = (action: 'explain' | 'example' | 'quiz' | 'flashcards') => {
    setActiveHighlightContext(selectionText);
    onHighlightAction(action, selectionText);
    setMenuPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div 
      ref={pdfWrapperRef}
      className="flex-1 min-w-0 flex flex-col relative z-0 p-6 transition-all duration-300"
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      {/* Zoom Toolbar */}
      {viewMode === 'document' && activeDoc && (activeDoc.url || activeDoc.file instanceof File) && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-white/50 text-slate-700">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ZoomOut size={16} /></button>
          <div className="w-12 text-center text-[10px] font-black tracking-widest uppercase">{Math.round(scale * 100)}%</div>
          <button onClick={() => setScale(1.0)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-indigo-600"><RotateCcw size={14} /></button>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 3.0))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ZoomIn size={16} /></button>
        </div>
      )}

      {/* Floating Highlight Menu */}
      {menuPosition && (
        <div 
          className="fixed z-50 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center p-1.5 gap-1 animate-in zoom-in-95 duration-200"
          style={{ 
            left: `${menuPosition.x}px`, 
            top: `${menuPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking menu
        >
          <button 
            onClick={() => executeHighlightAction('explain')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Sparkles size={13} className="text-indigo-400" />
            Explain
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button 
            onClick={() => executeHighlightAction('example')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Sparkles size={13} className="text-pink-400" />
            Example
          </button>
          <button 
            onClick={() => executeHighlightAction('testme')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Sparkles size={13} className="text-amber-400 fill-amber-400/20" />
            ⚡ Test Me
          </button>
        </div>
      )}
      
      {/* Toggle Vault (Left) */}
      <button 
        onClick={toggleVault}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center z-20 hover:scale-110 transition-all ${isVaultOpen ? 'left-0 -translate-x-1/2' : 'left-0 rounded-l-none border-l-0'}`}
      >
        {isVaultOpen ? <ChevronLeft size={16} className="text-slate-400 ml-1" /> : <ChevronRight size={16} className="text-slate-600 ml-1" />}
      </button>

      {/* Toggle Assistant (Right) */}
      <button 
        onClick={toggleAssistant}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center z-20 hover:scale-110 transition-all ${isAssistantOpen ? 'right-0 translate-x-1/2' : 'right-0 rounded-r-none border-r-0'}`}
      >
        {isAssistantOpen ? <ChevronRight size={16} className="text-slate-400 mr-1" /> : <ChevronLeft size={16} className="text-slate-600 mr-1" />}
      </button>

      {viewMode === 'media' ? (
        <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
          <div className="text-center text-slate-500 flex flex-col items-center gap-3">
            <Monitor size={40} className="text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Media Panel</p>
            <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">Video player content will appear here.</p>
          </div>
        </div>
      ) : activeDoc?.url ? (
        // URL-based mock document — react-pdf fetches by URL string
        <div className="w-full h-full bg-slate-100 rounded-2xl shadow-sm border border-gray-100 overflow-auto py-8">
          <Document
            file={activeDoc.url}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center gap-8"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                scale={scale}
                className="shadow-2xl"
              />
            ))}
          </Document>
        </div>
      ) : activeDoc?.file instanceof File ? (
        // Custom uploaded document — render from File object
        <div className="w-full h-full bg-slate-100 rounded-2xl shadow-sm border border-gray-100 overflow-auto py-8">
          <Document
            file={activeDoc.file}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center gap-8"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                scale={scale}
                className="shadow-2xl"
              />
            ))}
          </Document>
        </div>
      ) : activeDoc ? (
        // Doc exists in state but has no valid file or url — session expired
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-5 max-w-sm">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl shadow-sm border border-amber-100 flex items-center justify-center">
              <FileText size={32} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-700 tracking-tight">Session Refreshed</h3>
              <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                Your PDF session expired after the page refresh. Please re-select this document from the left panel or re-upload your custom PDF.
              </p>
            </div>
          </div>
        </div>
      ) : currentView === 'workspace_university' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
            <BookOpen size={40} className="text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ready to Study</h2>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">Select a document from the vault to begin.</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
              <FileText size={32} className="text-slate-200" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-600 tracking-tight">Personal Study Session</h3>
              <p className="text-xs text-slate-400 font-medium mt-1.5 max-w-[220px] leading-relaxed">Upload a custom PDF from the left panel to begin your session with SARA AI.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SmartStudyLayout: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'home' | 'workspace_personal' | 'workspace_university'>('home');
  const [isVaultOpen, setIsVaultOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'document' | 'media'>('document');
  const [assistantTab, setAssistantTab] = useState<'chat' | 'flashcards' | 'quiz' | 'notes'>('chat');
  const [isTestMode, setIsTestMode] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [isUniversitySynced, setUniversitySynced] = useState(
    () => localStorage.getItem('isUniversitySynced') === 'true'
  );
  const [activeSemester, setActiveSemesterState] = useState(
    () => localStorage.getItem('activeSemester') || '6'
  );
  const [showUnivModal, setShowUnivModal] = useState(false);
  const [institution, setInstitution] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('6');
  const [highlightTrigger, setHighlightTrigger] = useState<{action: string, text: string, timestamp: number} | null>(null);

  const { addMockDocument, setActiveDocument, documents } = useSmartStudy();

  // When semester changes, inject new semester's docs and remove old ones
  const handleSemesterChange = (sem: string) => {
    setActiveSemesterState(sem);
    localStorage.setItem('activeSemester', sem);
    // Persist flat curriculum for context re-hydration on refresh
    const subjects = MOCK_CURRICULUM[sem] || [];
    localStorage.setItem('mockCurriculumFlat', JSON.stringify(subjects.map(s => ({ id: s.id, title: s.title, pdfUrl: s.pdfUrl }))));
  };

  const handleUniversitySync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution || !rollNumber) { toast.error('Please fill all fields'); return; }
    const sem = selectedSemester;
    setUniversitySynced(true);
    setCurrentView('workspace_university');
    setActiveSemesterState(sem);
    localStorage.setItem('isUniversitySynced', 'true');
    localStorage.setItem('activeSemester', sem);
    const subjects = MOCK_CURRICULUM[sem] || [];
    localStorage.setItem('mockCurriculumFlat', JSON.stringify(subjects.map(s => ({ id: s.id, title: s.title, pdfUrl: s.pdfUrl }))));
    setShowUnivModal(false);
    toast.success(`Semester ${sem} curriculum synced!`);
  };

  const handleDisconnectVault = () => {
    localStorage.removeItem('isUniversitySynced');
    localStorage.removeItem('activeSemester');
    localStorage.removeItem('mockCurriculumFlat');
    setUniversitySynced(false);
    setActiveDocument(null as any);
    setCurrentView('home');
    toast.success('Vault disconnected');
  };

  const handleSelectSubject = (subject: MockSubject) => {
    addMockDocument(subject.id, subject.title, subject.pdfUrl);
  };

  const handleHighlightAction = (action: 'explain' | 'example' | 'quiz' | 'flashcards', text: string) => {
    if (!isAssistantOpen) setIsAssistantOpen(true);
    
    if (action === 'explain' || action === 'example') {
      setAssistantTab('chat');
      setHighlightTrigger({ action, text, timestamp: Date.now() });
    } else if (action === 'testme' as any) {
      setIsTestMode(true);
      setIsAssistantOpen(true);
      setIsVaultOpen(false);
      setAssistantTab('flashcards');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      {currentView !== 'home' && (
        <TopNavBar
          viewMode={viewMode}
          setViewMode={setViewMode}
          isAssistantOpen={isAssistantOpen}
          toggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
          onBackToHome={() => {
            setCurrentView('home');
            setActiveDocument(null as any);
          }}
        />
      )}
      {/* 3-Panel Row or Home Dashboard */}
      {currentView === 'home' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 overflow-y-auto relative">
          <button 
            onClick={() => navigate('/dashboard')}
            className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            Back to Vidhyalaya
          </button>

          <div className="text-center mb-12 mt-8">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Select your Workspace</h1>
            <p className="text-slate-500 font-medium">Choose a dedicated room to begin your study session.</p>
          </div>
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('workspace_personal')}
              className="group relative h-80 rounded-[32px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border border-slate-200 bg-white"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-full p-10 flex flex-col items-center justify-center text-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-inner">
                  <FileText size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Personal Study</h2>
                  <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">Upload and analyze your own PDF documents with SARA AI.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (isUniversitySynced) {
                  setCurrentView('workspace_university');
                } else {
                  setShowUnivModal(true);
                }
              }}
              className="group relative h-80 rounded-[32px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border border-slate-200 bg-white"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-full p-10 flex flex-col items-center justify-center text-center gap-6 text-white">
                <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <School size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">University Vault</h2>
                  <p className="text-sm font-medium text-white/80 mt-2 leading-relaxed">Access your synced semester curriculum and interactive mock documents.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <VaultPanel
            isOpen={isVaultOpen}
            currentView={currentView}
            onDisconnectVault={handleDisconnectVault}
          />
          <MiddlePanel 
            isVaultOpen={isVaultOpen} toggleVault={() => setIsVaultOpen(!isVaultOpen)}
            isAssistantOpen={isAssistantOpen} toggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
            viewMode={viewMode}
            onHighlightAction={handleHighlightAction}
            isUniversitySynced={isUniversitySynced}
            activeSemester={activeSemester}
            currentView={currentView as any}
          />
          <AssistantPanel 
            isOpen={isAssistantOpen}
            activeTab={assistantTab}
            setActiveTab={setAssistantTab}
            input={assistantInput}
            setInput={setAssistantInput}
            highlightTrigger={highlightTrigger}
            isTestMode={isTestMode}
            setIsTestMode={setIsTestMode}
          />
        </div>
      )}

      {/* University Unlock Modal - global so VaultPanel & center can both trigger it */}
      <AnimatePresence>
        {showUnivModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUnivModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl border border-white/20"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">University Sync</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Academic Integrity</p>
                </div>
              </div>
              <form onSubmit={handleUniversitySync} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-1">Institution Name</label>
                  <input autoFocus value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Stanford University" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-1">Roll Number / Branch</label>
                  <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. CS-2024-042" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-1">Current Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={e => setSelectedSemester(e.target.value)}
                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full h-14 bg-indigo-600 text-white rounded-2xl text-sm font-black tracking-tight hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-200">
                  Sync Curriculum
                </button>
              </form>
              <button onClick={() => setShowUnivModal(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SmartStudy: React.FC = () => {
  return (
    <SmartStudyProvider>
      <SmartStudyLayout />
    </SmartStudyProvider>
  );
};

export default SmartStudy;
