import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SmartStudyProvider, useSmartStudy } from '../context/SmartStudyContext';
import { UploadCloud, FileText, BrainCircuit, X, MessageSquare, Loader2, ChevronLeft, ChevronRight, Trash2, ArrowLeft, Sparkles, Monitor, BookOpen, ListTodo, Layers, GraduationCap, School, Database, Cpu, Globe, Terminal, LogOut, ZoomIn, ZoomOut, RotateCcw, Settings, ChevronDown, ChevronUp, User, BookMarked, Lock } from 'lucide-react';
import { StudyDocCitation } from '../components/study/StudyDocCitation';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import FlashcardViewer from '../features/study/FlashcardViewer';
import QuizViewer from '../features/study/QuizViewer';
import { SaraMediaPanel } from '../components/SaraMediaPanel';
import { api, SERVER_BASE_URL } from '../services/api';
import { toast } from 'sonner';
import { Document, Page, pdfjs } from 'react-pdf';
import TypewriterMarkdown from '../components/ui/TypewriterMarkdown';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type MockSubject = { id: string; title: string; code: string; icon: React.ComponentType<any>; color: string; pdfUrl: string };
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
// ── Student Auth Helpers ─────────────────────────────────────────────────────
interface StudentInfo { rollNumber: string; name: string; branch: string; semester: string; universityId: string; }

const UNIVERSITY_LIST = [
  { id: 'shesheer_16', name: 'Test University' },
  { id: 'vidhyal', name: 'Cortex Institute of Technology' },
  { id: 'anna', name: 'Anna University' },
  { id: 'iitm', name: 'IIT Madras' },
  { id: 'vit', name: 'VIT University' },
  { id: 'srm', name: 'SRM Institute' },
];
const BRANCH_LIST = [
  { id: 'cse', label: 'Computer Science (CSE)' },
  { id: 'cs-ai', label: 'CS — Artificial Intelligence' },
  { id: 'cs-ds', label: 'CS — Data Science' },
  { id: 'ece', label: 'Electronics (ECE)' },
  { id: 'eee', label: 'Electrical (EEE)' },
  { id: 'it', label: 'Information Technology' },
  { id: 'mech', label: 'Mechanical' },
  { id: 'civil', label: 'Civil' },
];

// ── Student Login Modal ───────────────────────────────────────────────────────


// ── VaultPanel ────────────────────────────────────────────────────────────────
interface VaultPanelProps { isOpen: boolean; onDisconnectVault: () => void; }

const VaultPanel: React.FC<VaultPanelProps> = ({ isOpen, onDisconnectVault }) => {
  const navigate = useNavigate();
  const { setActiveDocument, addMockDocument } = useSmartStudy();

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [selectedSemester, setSelectedSemester] = useState('');

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('vidyal_student_token');
    if (!token) return;
    api.getStudentMe(token)
      .then(data => { setStudent(data.student); setSelectedSemester(data.student.semester); })
      .catch(() => localStorage.removeItem('vidyal_student_token'));
  }, []);

  // Fetch documents when student + semester known
  const fetchDocs = useCallback(async (info: StudentInfo, sem: string) => {
    setIsFetching(true);
    try {
      const data = await api.fetchDocumentsByStudent(info.universityId, info.branch, sem);
      setDocs(data.documents || []);
    } catch { setDocs([]); }
    finally { setIsFetching(false); }
  }, []);

  useEffect(() => {
    if (student && selectedSemester) fetchDocs(student, selectedSemester);
  }, [student, selectedSemester]);

  // Group docs by subjectName
  const subjectGroups = useMemo(() => {
    const groups: Record<string, { subjectCode: string; chapters: any[] }> = {};
    docs.forEach(doc => {
      const key = doc.subjectName || doc.courseName || 'General';
      if (!groups[key]) groups[key] = { subjectCode: doc.subjectCode || '', chapters: [] };
      groups[key].chapters.push(doc);
    });
    // Sort chapters by chapterNumber
    Object.values(groups).forEach(g => g.chapters.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0)));
    return groups;
  }, [docs]);

  const toggleSubject = (key: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('vidyal_student_token');
    setStudent(null); setDocs([]);
  };

  const SUBJECT_COLORS = [
    { bg: 'bg-teal-50/80', border: 'border-l-teal-400', text: 'text-teal-800', icon: 'text-teal-600', activeBg: 'bg-teal-600', iconBg: 'bg-teal-100/50' },
    { bg: 'bg-indigo-50/80', border: 'border-l-indigo-400', text: 'text-indigo-800', icon: 'text-indigo-600', activeBg: 'bg-indigo-600', iconBg: 'bg-indigo-100/50' },
    { bg: 'bg-rose-50/80', border: 'border-l-rose-400', text: 'text-rose-800', icon: 'text-rose-600', activeBg: 'bg-rose-600', iconBg: 'bg-rose-100/50' },
    { bg: 'bg-amber-50/80', border: 'border-l-amber-400', text: 'text-amber-800', icon: 'text-amber-600', activeBg: 'bg-amber-600', iconBg: 'bg-amber-100/50' },
    { bg: 'bg-purple-50/80', border: 'border-l-purple-400', text: 'text-purple-800', icon: 'text-purple-600', activeBg: 'bg-purple-600', iconBg: 'bg-purple-100/50' },
  ];

  return (
    <div className={`shrink-0 flex flex-col h-full z-10 transition-all duration-300 ease-in-out relative ${isOpen ? 'w-[280px] rounded-[32px] overflow-hidden border border-white/50 shadow-xl bg-white/70 backdrop-blur-3xl' : 'w-0 overflow-hidden border-none'}`}>
      <div className="w-[280px] flex flex-col h-full">
        {/* Loading spinner while session resolves */}
        {!student && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
             <Loader2 className="animate-spin text-indigo-600" size={24} />
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
               Syncing Vault...
             </p>
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookMarked size={14} className="text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">University Vault</span>
            </div>
          </div>
          {/* Semester selector */}
          {student && (
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              className="w-full h-9 bg-white/60 border border-white/40 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all"
            >
              {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          )}
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-500 animate-spin mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading vault...</p>
            </div>
          ) : Object.keys(subjectGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Database size={28} className="text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No documents</p>
              <p className="text-[10px] text-slate-300 mt-1">Admin hasn't uploaded docs for this semester yet.</p>
            </div>
          ) : (
            Object.entries(subjectGroups).map(([subject, { subjectCode, chapters }], index) => {
              const isOpen2 = expandedSubjects.has(subject);
              const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
              return (
                <div key={subject} className="rounded-2xl overflow-hidden mb-2 shadow-sm border border-white/50">
                  {/* Subject Bar */}
                  <button
                    onClick={() => toggleSubject(subject)}
                    className={`w-full flex items-center justify-between px-3 py-3 transition-all group border-l-4 ${
                      isOpen2 ? `${color.activeBg} text-white border-transparent` : `${color.bg} hover:brightness-95 ${color.border}`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isOpen2 ? 'bg-white/20' : color.iconBg
                      }`}>
                        <BookOpen size={14} className={isOpen2 ? 'text-white' : color.icon} />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className={`text-[11px] font-black tracking-tight truncate ${isOpen2 ? 'text-white' : color.text}`}>{subject}</p>
                        {subjectCode && <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isOpen2 ? 'text-white/70' : 'text-slate-400'}`}>{subjectCode}</p>}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 shrink-0 ${isOpen2 ? 'text-white/80' : 'text-slate-400'}`}>
                      <span className="text-[10px] font-black">{chapters.length}</span>
                      {isOpen2 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {/* Chapters */}
                  <AnimatePresence initial={false}>
                    {isOpen2 && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="pt-1 pb-2 pl-2 space-y-0.5">
                          {chapters.map(doc => (
                            <button
                              key={doc.documentId}
                              onClick={() => addMockDocument(doc.documentId, doc.chapterTitle || doc.title, doc.fileUrl)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors group text-left"
                            >
                              <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                <FileText size={10} className="text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-700 truncate group-hover:text-indigo-700">
                                  {doc.chapterTitle || `Chapter ${doc.chapterNumber || 1}`}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Chapter {doc.chapterNumber || 1}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

type SessionTrigger = { text: string; timestamp: number } | null;

interface AssistantPanelProps {
  isOpen: boolean;
  activeTab: 'chat' | 'flashcards' | 'quiz' | 'notes';
  setActiveTab: (tab: 'chat' | 'flashcards' | 'quiz' | 'notes') => void;
  input: string;
  setInput: (val: string) => void;
  // Chat-only trigger (explain / example)
  highlightTrigger?: { action: string, text: string, timestamp: number } | null;
  // Independent sessions per tab
  flashcardSession: SessionTrigger;
  quizSession: SessionTrigger;
  onCloseFlashcards: () => void;
  onCloseQuiz: () => void;
  flashcardsData?: any[] | null;
  quizData?: any[] | null;
  onFlashcardsDataFetched?: (data: any[]) => void;
  onQuizDataFetched?: (data: any[]) => void;
  onJumpToPage: (pageNumber: number) => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({
  isOpen, activeTab, setActiveTab, input, setInput,
  highlightTrigger, flashcardSession, quizSession,
  onCloseFlashcards, onCloseQuiz,
  flashcardsData, quizData,
  onFlashcardsDataFetched, onQuizDataFetched,
  onJumpToPage
}) => {
  const { isAnalyzing, activeDocumentId } = useSmartStudy();
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [documentNotes, setDocumentNotes] = useState('');
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // 1. Dual-mode citation parser
  const parseCitations = useCallback((text: string) => {
    const citations: { page: number; snippetText: string }[] = [];
    const fullRegex = /\[Page\s*(\d+):\s*"([^"]+)"\]/gi;
    let match;
    let cleanText = text;

    while ((match = fullRegex.exec(text)) !== null) {
      citations.push({
        page: parseInt(match[1], 10),
        snippetText: match[2]
      });
    }
    cleanText = cleanText.replace(fullRegex, '');

    const simpleRegex = /\[Page\s*(\d+)\]/gi;
    while ((match = simpleRegex.exec(cleanText)) !== null) {
      const pageNum = parseInt(match[1], 10);
      if (!citations.some(c => c.page === pageNum)) {
        citations.push({
          page: pageNum,
          snippetText: `Refer to Page ${pageNum} of the source document.`
        });
      }
    }
    cleanText = cleanText.replace(simpleRegex, (m, p1) => `[Page ${p1}](#pdf-page-${p1})`);

    return { cleanText, citations };
  }, []);

  // 2. Custom link/citation component for inline [Page X] links
  const markdownComponents = useMemo(() => ({
    a: ({ href, children, ...props }: any) => {
      if (href && href.startsWith('#pdf-page-')) {
        const pageNum = parseInt(href.replace('#pdf-page-', ''), 10);
        return (
          <button
            onClick={(e) => {
              e.preventDefault();
              onJumpToPage(pageNum);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-indigo-600 hover:text-indigo-500 bg-indigo-50/50 hover:bg-indigo-100 px-1.5 py-0.5 rounded cursor-pointer transition-all border border-indigo-200/30"
          >
            <FileText size={10} />
            {children || `Page ${pageNum}`}
          </button>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    }
  }), [onJumpToPage]);

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
      if (highlightTrigger.action === 'explain' || highlightTrigger.action === 'example') {
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

  const isSessionActive = !!(flashcardSession || quizSession);

  return (
    <div className={`shrink-0 flex flex-col h-full z-10 transition-all duration-300 ease-in-out relative ${isOpen ? (isSessionActive ? 'w-1/2 rounded-[32px] overflow-hidden border border-white/50 shadow-xl bg-white/70 backdrop-blur-3xl' : 'w-[380px] rounded-[32px] overflow-hidden border border-white/50 shadow-xl bg-white/70 backdrop-blur-3xl') : 'w-0 overflow-hidden border-none'}`}>
      <div className={`${isSessionActive ? 'w-full' : 'w-[380px]'} flex flex-col h-full`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/20 flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-tight text-slate-800">SARA Assistant</h2>
            <p className="text-[9px] font-medium tracking-widest text-slate-400 uppercase">AI Co-Pilot</p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="px-4 py-3 border-b border-white/20 shrink-0">
          <div className="flex bg-white/30 backdrop-blur-md border border-white/20 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-indigo-800'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('flashcards')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'flashcards' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-indigo-800'}`}
            >
              Flashcards
            </button>
            <button 
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'quiz' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-indigo-800'}`}
            >
              Quiz
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-indigo-800'}`}
            >
              Notes
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'flashcards' ? (
            flashcardSession ? (
              <FlashcardViewer 
                highlightedText={flashcardSession.text}
                documentId={activeDocumentId!}
                onClose={onCloseFlashcards}
                prefetchedCards={flashcardsData}
                onDataFetched={onFlashcardsDataFetched}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <Sparkles size={24} className="text-slate-400" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-slate-700">Waiting for context...</h3>
                  <p className="text-[11px] text-slate-500 max-w-[200px] mt-1.5 leading-relaxed">
                    Select or highlight a topic in the document to generate Flashcards.
                  </p>
                </div>
              </div>
            )
          ) : activeTab === 'quiz' ? (
            quizSession ? (
              <QuizViewer
                highlightedText={quizSession.text}
                documentId={activeDocumentId!}
                onClose={onCloseQuiz}
                prefetchedData={quizData}
                onDataFetched={onQuizDataFetched}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <Sparkles size={24} className="text-slate-400" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-slate-700">Waiting for context...</h3>
                  <p className="text-[11px] text-slate-500 max-w-[200px] mt-1.5 leading-relaxed">
                    Select or highlight a topic in the document to generate a Quiz.
                  </p>
                </div>
              </div>
            )
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
                    <BrainCircuit size={28} className="text-[#4e5bff] relative z-10 animate-pulse" />
                  </div>
                  <div className="absolute -inset-4 border border-dashed border-indigo-200 rounded-full animate-[spin_10s_linear_infinite] opacity-50" />
               </div>
               <h3 className="text-xs font-black uppercase tracking-widest text-[#4e5bff] mb-2">SARA is Analyzing</h3>
               <p className="text-[10px] text-slate-500 text-center font-medium leading-relaxed">Uploading to Google AI servers and mapping semantic vectors...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative h-full">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
                
                <div className="flex justify-start">
                  <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm text-slate-800 p-4 rounded-3xl rounded-tl-md text-[13px] leading-relaxed max-w-[85%]">
                    I have mapped the document contents. What would you like to explore?
                  </div>
                </div>

                {localHistory.map((msg, idx) => {
                  const isModel = msg.role === 'model';
                  const { cleanText, citations } = isModel ? parseCitations(msg.text) : { cleanText: msg.text, citations: [] };
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-3xl text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-md border border-indigo-400 shadow-indigo-200' 
                          : 'bg-white/80 backdrop-blur-xl border border-white text-slate-800 rounded-tl-md'
                      }`}>
                        {isModel ? (
                          <div className="markdown-body text-[13px]">
                            <TypewriterMarkdown
                              text={cleanText}
                              msgId={msg.id}
                              isLatest={idx === localHistory.length - 1 && msg.role === 'model'}
                              components={markdownComponents}
                            />
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                      
                      {isModel && citations.length > 0 && (
                        <div className="w-[85%] mt-2 space-y-1.5 pl-2">
                          {citations.map((c, cIdx) => (
                            <StudyDocCitation
                              key={cIdx}
                              page={c.page}
                              snippetText={c.snippetText}
                              onJumpToPage={onJumpToPage}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/80 backdrop-blur-xl border border-white text-slate-500 p-4 rounded-3xl rounded-tl-md flex items-center gap-2 shadow-sm">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      <span className="text-xs font-medium text-slate-600">SARA is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="shrink-0 p-4 bg-transparent border-t border-white/20">
                 <div className="relative shadow-xl bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white flex items-center p-1.5 px-2">
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isTyping}
                      placeholder="Ask SARA anything..."
                      className="flex-1 bg-transparent border-none py-2.5 px-4 text-[13px] font-medium outline-none text-slate-800 placeholder:text-slate-400 disabled:opacity-50"
                    />
                    <button 
                      onClick={handleChat}
                      disabled={isTyping || !input.trim()}
                      className="p-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md shrink-0"
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
  onToggleSettings: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ viewMode, setViewMode, isAssistantOpen, toggleAssistant, onBackToHome, onToggleSettings }) => {
  const { documents, activeDocumentId } = useSmartStudy();
  const activeDoc = documents.find(d => d.id === activeDocumentId);

  return (
    <div className="h-14 bg-white/80 backdrop-blur-xl border border-white/50 rounded-[32px] flex items-center px-4 gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full transition-all">
      {/* LEFT: Back + Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBackToHome}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex flex-col justify-center">
            <h1 className="text-[15px] font-black tracking-tight text-indigo-950 leading-none">Cortex</h1>
            <p className="text-[7px] font-black tracking-[0.2em] text-indigo-600 uppercase mt-1 leading-none">Campus</p>
          </div>
          {activeDoc && (
            <>
              <span className="text-slate-300 text-lg font-light leading-none">/</span>
              <span className="text-xs font-bold text-slate-600 truncate max-w-[150px] leading-none">{activeDoc.name}</span>
            </>
          )}
        </div>
      </div>

      {/* CENTER: Mode Toggle */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center bg-slate-100/50 backdrop-blur-md rounded-full p-1 gap-1 border border-slate-200/50">
          <button
            onClick={() => setViewMode('media')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
              viewMode === 'media'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Monitor size={12} />
            Media
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
              viewMode === 'document'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen size={12} />
            Document
          </button>
        </div>
      </div>

      {/* RIGHT: Assistant Toggle + Settings */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleAssistant}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${
            isAssistantOpen
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
              : 'bg-white/80 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <Sparkles size={12} />
          Assistant
        </button>
        <div className="w-px h-4 bg-slate-200 shrink-0" />
        <button
          onClick={onToggleSettings}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
          title="Student Profile"
        >
          <User size={14} />
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
  scoutedVideos: any[];
  activeVideo: any | null;
  setActiveVideo: (video: any) => void;
  isVideoLoading: boolean;
  topicName: string;
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({ 
  isVaultOpen, 
  toggleVault, 
  isAssistantOpen, 
  toggleAssistant, 
  viewMode, 
  onHighlightAction, 
  isUniversitySynced, 
  activeSemester,
  scoutedVideos,
  activeVideo,
  setActiveVideo,
  isVideoLoading,
  topicName
}) => {
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
      className="flex-1 min-w-0 flex flex-col relative z-0 px-2 transition-all duration-300"
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
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button 
            onClick={() => executeHighlightAction('flashcards')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Sparkles size={13} className="text-amber-400 fill-amber-400/20" />
            ⚡ Flashcards
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button 
            onClick={() => executeHighlightAction('quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Sparkles size={13} className="text-emerald-400 fill-emerald-400/20" />
            ⚡ Quiz
          </button>
        </div>
      )}
      
      {/* Toggle Vault (Left) */}
      <button 
        onClick={toggleVault}
        className="absolute top-1/2 -translate-y-1/2 left-0 w-6 h-16 bg-white/80 backdrop-blur-md border border-white/60 shadow-[4px_0_12px_rgba(0,0,0,0.08)] rounded-r-2xl border-l-0 flex items-center justify-center z-20 hover:bg-white hover:w-7 transition-all"
        title="Toggle Vault"
      >
        {isVaultOpen ? <ChevronLeft size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-600" />}
      </button>

      {/* Toggle Assistant (Right) */}
      <button 
        onClick={toggleAssistant}
        className="absolute top-1/2 -translate-y-1/2 right-0 w-6 h-16 bg-white/80 backdrop-blur-md border border-white/60 shadow-[-4px_0_12px_rgba(0,0,0,0.08)] rounded-l-2xl border-r-0 flex items-center justify-center z-20 hover:bg-white hover:w-7 transition-all"
        title="Toggle Assistant"
      >
        {isAssistantOpen ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronLeft size={16} className="text-slate-600" />}
      </button>

      {viewMode === 'media' ? (
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-1">
          <SaraMediaPanel
            videos={scoutedVideos}
            activeVideo={activeVideo}
            onSelectVideo={setActiveVideo}
            isLoading={isVideoLoading}
            topicName={activeDoc?.name || topicName}
          />
        </div>
      ) : activeDoc?.url ? (
        // URL-based mock document — react-pdf fetches by URL string
        <div className="w-full h-full bg-white/60 backdrop-blur-md rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-auto py-4">
          <Document
            file={`${SERVER_BASE_URL}${activeDoc.url}`}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center gap-4"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_wrap_${index + 1}`} id={`pdf-page-${index + 1}`} className="shadow-2xl">
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  scale={scale}
                />
              </div>
            ))}
          </Document>
        </div>
      ) : activeDoc?.file instanceof File ? (
        // Custom uploaded document — render from File object
        <div className="w-full h-full bg-white/60 backdrop-blur-md rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-auto py-4">
          <Document
            file={activeDoc.file}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center gap-4"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_wrap_${index + 1}`} id={`pdf-page-${index + 1}`} className="shadow-2xl">
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  scale={scale}
                />
              </div>
            ))}
          </Document>
        </div>
      ) : activeDoc ? (
        // Doc exists in state but has no valid file or url — session expired
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-5 max-w-sm">
            <div className="w-20 h-20 bg-amber-50/80 backdrop-blur-sm rounded-3xl shadow-sm border border-amber-200 flex items-center justify-center">
              <FileText size={32} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Session Refreshed</h3>
              <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                Your PDF session expired after the page refresh. Please re-select this document from the left panel.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px] animate-pulse" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative">
              <div className="absolute inset-0 border-[4px] border-white/30 rounded-full animate-[spin_4s_linear_infinite]" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
              <BookOpen size={40} className="text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ready to Study</h2>
            <p className="text-slate-500 font-medium mt-2 max-w-sm">Select a document from your vault to begin the flow state.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const SmartStudyLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isVaultOpen, setIsVaultOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isStudentSettingsOpen, setIsStudentSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'document' | 'media'>('document');
  const [assistantTab, setAssistantTab] = useState<'chat' | 'flashcards' | 'quiz' | 'notes'>('chat');
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
  // Chat-only explain/example trigger
  const [highlightTrigger, setHighlightTrigger] = useState<{action: string, text: string, timestamp: number} | null>(null);
  // Independent persistent sessions per tab
  const [flashcardSession, setFlashcardSession] = useState<{text: string; timestamp: number} | null>(null);
  const [quizSession, setQuizSession] = useState<{text: string; timestamp: number} | null>(null);
  // Cached fetched data — survives tab switches
  const [flashcardsData, setFlashcardsData] = useState<any[] | null>(null);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const { addMockDocument, setActiveDocument, documents, activeDocumentId } = useSmartStudy();

  const [scoutedVideos, setScoutedVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const handleJumpToPage = useCallback((pageNumber: number) => {
    const element = document.getElementById(`pdf-page-${pageNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast.success(`Jumping to page ${pageNumber}`);
    } else {
      toast.error(`Page ${pageNumber} not found or loaded yet.`);
    }
  }, []);

  useEffect(() => {
    if (!activeDocumentId) {
      setScoutedVideos([]);
      setActiveVideo(null);
      return;
    }

    const activeDoc = documents.find(d => d.id === activeDocumentId);
    if (!activeDoc) return;

    let isMounted = true;
    setIsVideoLoading(true);

    // Dynamically import scoutResources to ensure clean module boundary
    import('../services/geminiService').then(({ scoutResources }) => {
      if (!isMounted) return;
      scoutResources(activeDoc.name, 'Educational Coursework')
        .then(verifiedVideos => {
          if (!isMounted) return;
          setScoutedVideos(verifiedVideos || []);
          setActiveVideo(verifiedVideos && verifiedVideos.length > 0 ? verifiedVideos[0] : null);
        })
        .catch(err => {
          console.error('Error scouting resources:', err);
          if (isMounted) {
            setScoutedVideos([]);
            setActiveVideo(null);
          }
        })
        .finally(() => {
          if (isMounted) setIsVideoLoading(false);
        });
    }).catch(err => {
      console.error('Failed to import geminiService:', err);
      if (isMounted) setIsVideoLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeDocumentId, documents]);

  // Restore student session if token exists, gate access if missing
  useEffect(() => {
    const token = localStorage.getItem('vidyal_student_token');
    if (!token) {
      navigate('/sara/vault/login');
      return;
    }
    api.getStudentMe(token)
      .then(data => {
        setStudentInfo(data.student);
        setInstitution(data.student.universityId); // or a name lookup if available
        setRollNumber(data.student.rollNumber);
        setActiveSemesterState(data.student.semester);
      })
      .catch(() => {
        localStorage.removeItem('vidyal_student_token');
        navigate('/sara/vault/login');
      });
  }, [navigate]);

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
    } else if (action === 'flashcards') {
      setFlashcardSession({ text, timestamp: Date.now() });
      setFlashcardsData(null); // Clear stale cache so new text gets fresh cards
      setIsAssistantOpen(true);
      setIsVaultOpen(false);
      setAssistantTab('flashcards');
    } else if (action === 'quiz') {
      setQuizSession({ text, timestamp: Date.now() });
      setQuizData(null); // Clear stale cache so new text gets fresh quiz
      setIsAssistantOpen(true);
      setIsVaultOpen(false);
      setAssistantTab('quiz');
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden font-sans aurora-silk relative">
      {/* Ambient Healing Orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-300/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full bg-rose-400/15 blur-[100px]" />
      </div>

      {/* Floating Pill Top Nav */}
      <div className="absolute top-2.5 left-0 z-40 w-full px-2.5 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full">
           <TopNavBar
             viewMode={viewMode}
             setViewMode={setViewMode}
             isAssistantOpen={isAssistantOpen}
             toggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
             onBackToHome={() => navigate('/sara')}
             onToggleSettings={() => setIsStudentSettingsOpen(true)}
           />
        </div>
      </div>

      {/* 3-Panel Row */}
      <div className="flex flex-1 min-h-0 pt-[76px] relative z-10 p-2.5 gap-2.5">
        <VaultPanel
          isOpen={isVaultOpen}
          onDisconnectVault={handleDisconnectVault}
        />
        <MiddlePanel 
          isVaultOpen={isVaultOpen} toggleVault={() => setIsVaultOpen(!isVaultOpen)}
          isAssistantOpen={isAssistantOpen} toggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
          viewMode={viewMode}
          onHighlightAction={handleHighlightAction}
          isUniversitySynced={isUniversitySynced}
          activeSemester={activeSemester}
          scoutedVideos={scoutedVideos}
          activeVideo={activeVideo}
          setActiveVideo={setActiveVideo}
          isVideoLoading={isVideoLoading}
          topicName={documents.find(d => d.id === activeDocumentId)?.name || 'General Mastery'}
        />
        <AssistantPanel 
          isOpen={isAssistantOpen}
          activeTab={assistantTab}
          setActiveTab={setAssistantTab}
          input={assistantInput}
          setInput={setAssistantInput}
          highlightTrigger={highlightTrigger}
          flashcardSession={flashcardSession}
          quizSession={quizSession}
          onCloseFlashcards={() => { setFlashcardSession(null); setFlashcardsData(null); }}
          onCloseQuiz={() => { setQuizSession(null); setQuizData(null); }}
          flashcardsData={flashcardsData}
          quizData={quizData}
          onFlashcardsDataFetched={setFlashcardsData}
          onQuizDataFetched={setQuizData}
          onJumpToPage={handleJumpToPage}
        />
      </div>

      {/* Student Settings Slide-out */}
      <AnimatePresence>
        {isStudentSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsStudentSettingsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[360px] bg-white/90 backdrop-blur-2xl border-l border-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Student Profile</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{institution || 'Not Synced'}</p>
                  </div>
                </div>
                <button onClick={() => setIsStudentSettingsOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 space-y-6">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Academic Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Roll Number</span>
                      <span className="text-xs font-black text-slate-800">{rollNumber || studentInfo?.rollNumber || '--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Semester</span>
                      <span className="text-xs font-black text-slate-800">{activeSemester}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      navigate('/admin');
                      setIsStudentSettingsOpen(false);
                    }}
                    className="w-full h-12 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Settings size={16} />
                    University Admin Portal
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('vidyal_student_token');
                      window.location.reload();
                    }}
                    className="w-full h-12 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
