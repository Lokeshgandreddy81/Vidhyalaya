import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { chatWithTutor, generateQuizForModule, generateModuleContent, generateAudioOverview, visualizeConcept, scoutResources } from '../services/geminiService';
import { ChatMessage, QuizQuestion, StudyModule, Resource } from '../types';
import { 
  ArrowLeft, Send, Sparkles, CheckCircle, BrainCircuit, X, HelpCircle, 
  Loader, BookOpen, PenLine, MessageSquare, Lightbulb, Volume2, 
  Image as ImageIcon, Clock, Play, Pause, ExternalLink, File, Upload,
  ChevronRight, Map, ChevronDown, CheckCircle2, Lock, Link as LinkIcon,
  Zap, Highlighter, Bold, Italic, List as ListIcon, ListOrdered, Search
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const RichNotesEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== content) editorRef.current.innerHTML = content || ''; }, []);
  const exec = (command: string, value: string = '') => { document.execCommand(command, false, value); if (editorRef.current) onChange(editorRef.current.innerHTML); };
  return (
    <div className="flex flex-col h-full bg-[#fdfdff]">
      <div className="flex items-center space-x-1 p-3 border-b border-indigo-50 bg-indigo-50/10">
        <button onClick={() => exec('bold')} className="p-2.5 hover:bg-white hover:text-indigo-600 rounded-xl text-slate-600 transition-all shadow-sm"><Bold size={16}/></button>
        <button onClick={() => exec('italic')} className="p-2.5 hover:bg-white hover:text-indigo-600 rounded-xl text-slate-600 transition-all shadow-sm"><Italic size={16}/></button>
        <div className="w-px h-4 bg-indigo-100 mx-1.5"></div>
        <button onClick={() => exec('insertUnorderedList')} className="p-2.5 hover:bg-white hover:text-indigo-600 rounded-xl text-slate-600 transition-all shadow-sm"><ListIcon size={16}/></button>
        <button onClick={() => exec('insertOrderedList')} className="p-2.5 hover:bg-white hover:text-indigo-600 rounded-xl text-slate-600 transition-all shadow-sm"><ListOrdered size={16}/></button>
      </div>
      <div ref={editorRef} contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} data-placeholder="Capture your brilliance here..." className="rich-editor flex-1 p-10 focus:outline-none text-slate-800 leading-relaxed text-lg overflow-y-auto selection:bg-indigo-100" />
    </div>
  );
};

const StudySession: React.FC = () => {
  const { pathId, phaseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { paths, updateModuleStatus, saveModuleNotes, addModuleResource, saveModuleContent } = useAppStore();

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'chat' | 'quiz' | 'resources'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [selection, setSelection] = useState<{x: number, y: number, text: string} | null>(null);
  const [notes, setNotes] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isScouting, setIsScouting] = useState(false);

  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const path = paths.find(p => p.id === pathId);
  const phase = path?.phases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);

  useEffect(() => {
    if (module) {
      setNotes(module.userNotes || '');
      if (module.generatedContent) {
        setGeneratedContent(module.generatedContent);
      } else {
        checkCloudCache();
      }
    }
  }, [moduleId, module?.id]);

  const checkCloudCache = async () => {
    if (!module) return;
    const puter = (window as any).puter;
    if (puter) {
      const cached = await puter.kv.get(`content_${module.id}`);
      if (cached) {
        setGeneratedContent(cached);
        if (pathId && phaseId && moduleId) saveModuleContent(pathId, phaseId, moduleId, cached);
        return;
      }
    }
    loadContent();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current?.contains(sel.anchorNode)) { setSelection(null); return; }
      const text = sel.toString().trim();
      if (text.length < 3) { setSelection(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({ x: rect.left + rect.width / 2, y: rect.top, text: text });
    };
    const handleScroll = () => setSelection(null);
    document.addEventListener('mouseup', handleSelectionChange);
    contentRef.current?.addEventListener('scroll', handleScroll);
    return () => { document.removeEventListener('mouseup', handleSelectionChange); contentRef.current?.removeEventListener('scroll', handleScroll); };
  }, []);

  const loadContent = async () => {
    if (!module) return;
    setIsContentLoading(true);
    try {
      const content = await generateModuleContent(module.title, module.keyConcepts, path?.goal || 'General Mastery');
      setGeneratedContent(content);
      if (pathId && phaseId && moduleId) saveModuleContent(pathId, phaseId, moduleId, content);
      const puter = (window as any).puter;
      if (puter) await puter.kv.set(`content_${module.id}`, content);
    } finally { setIsContentLoading(false); }
  };

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim()) return;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: msg, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const response = await chatWithTutor(chatHistory, userMsg.text, `Module: ${module?.title}. Concepts: ${module?.keyConcepts.join(", ")}`);
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
    } finally { setIsTyping(false); }
  };

  const parseMarkdown = (text: string) => {
    const cleanLine = (line: string) => {
      let f = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-700 font-extrabold">$1</strong>');
      f = f.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800">$1</em>');
      f = f.replace(/`(.*?)`/g, '<code class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-lg font-mono text-sm">$1</code>');
      return <span dangerouslySetInnerHTML={{ __html: f }} />;
    };
    return text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-4" />;
      if (t.startsWith('# ')) return <h1 key={i} className="text-4xl font-black mb-8 mt-12 blue-purple-text">{t.slice(2).replace(/[#*]/g, '')}</h1>;
      if (t.startsWith('## ')) return <h2 key={i} className="text-2xl font-black mb-6 mt-10 text-slate-900">{t.slice(3).replace(/[#*]/g, '')}</h2>;
      if (t.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mb-4 mt-8 text-indigo-600">{t.slice(4).replace(/[#*]/g, '')}</h3>;
      if (t.startsWith('- ') || t.startsWith('* ')) return <li key={i} className="ml-8 mb-4 list-disc text-slate-700 leading-relaxed text-lg">{cleanLine(t.slice(2))}</li>;
      return <p key={i} className="mb-6 text-slate-700 leading-relaxed text-lg">{cleanLine(line)}</p>;
    });
  };

  const handleScoutResources = async () => {
    if (!module) return;
    setIsScouting(true);
    try {
      const results = await scoutResources(module.title);
      results.forEach(res => {
        if (pathId && phaseId && moduleId) addModuleResource(pathId, phaseId, moduleId, res);
      });
    } finally { setIsScouting(false); }
  };

  const handleStartQuiz = async () => {
    if (!module) return;
    setQuizLoading(true);
    try {
      const questions = await generateQuizForModule(module.title, module.keyConcepts);
      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setQuizScore(0);
    } finally { setQuizLoading(false); }
  };

  if (!module) return <div className="p-20 text-center font-black text-slate-400">Loading Journey...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      {/* Selection Tooltip */}
      {selection && (
        <div className="fixed z-[70] flex items-center bg-slate-900 text-white rounded-2xl shadow-2xl py-2 px-3 transform -translate-x-1/2 -translate-y-[120%] border border-slate-700" style={{ left: selection.x, top: selection.y }}>
          <button onMouseDown={e => e.preventDefault()} onClick={async () => {
            setActiveRightTab('chat');
            setSelection(null);
            const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: `Explain this clearly: "${selection.text}"`, timestamp: Date.now() };
            setChatHistory(prev => [...prev, userMsg]);
            setIsTyping(true);
            try {
              const response = await chatWithTutor([], userMsg.text, `Module: ${module?.title}. Selected text: "${selection.text}"`);
              setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
            } finally { setIsTyping(false); }
          }} className="px-3 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2"><Lightbulb size={14} className="text-amber-400" /><span>Explain</span></button>
          <div className="w-px h-5 bg-slate-700 mx-1"></div>
          <button onMouseDown={e => e.preventDefault()} onClick={async () => {
            setActiveRightTab('chat');
            setSelection(null);
            const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: `Give me a practical example of: "${selection.text}"`, timestamp: Date.now() };
            setChatHistory(prev => [...prev, userMsg]);
            setIsTyping(true);
            try {
              const response = await chatWithTutor([], userMsg.text, `Module: ${module?.title}. Topic: "${selection.text}"`);
              setChatHistory(prev => [...prev, { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() }]);
            } finally { setIsTyping(false); }
          }} className="px-3 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2"><Sparkles size={14} className="text-blue-400" /><span>Example</span></button>
          <div className="w-px h-5 bg-slate-700 mx-1"></div>
          <button onMouseDown={e => e.preventDefault()} onClick={async () => {
            setActiveRightTab('quiz');
            setSelection(null);
            setQuizLoading(true);
            try {
              const questions = await generateQuizForModule(selection.text, module?.keyConcepts || []);
              setQuizQuestions(questions.slice(0, 3));
              setCurrentQuizIndex(0);
              setQuizScore(0);
            } finally { setQuizLoading(false); }
          }} className="px-3 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2"><HelpCircle size={14} className="text-pink-400" /><span>Quiz</span></button>
          <div className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-slate-900 transform rotate-45 border-r border-b border-slate-700"></div>
        </div>
      )}

      <header className="h-20 bg-white border-b border-indigo-50 flex items-center justify-between px-8 z-30 shadow-md">
         <div className="flex items-center space-x-6">
            <button onClick={() => navigate(`/path/${pathId}`)} className="text-slate-400 hover:text-indigo-600 p-2.5 rounded-2xl"><ArrowLeft size={22} /></button>
            <div className="flex flex-col"><h1 className="text-xl font-black text-slate-900 leading-none mb-1">{module.title}</h1><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{module.estimatedMinutes} Mins Session</div></div>
         </div>
         <div className="flex items-center space-x-4">
            <button onClick={() => { if(pathId && phaseId && moduleId) updateModuleStatus(pathId, phaseId, moduleId, !module.isCompleted); }} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${module.isCompleted ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-indigo-600 text-white shadow-indigo-100'} shadow-xl`}>
                {module.isCompleted ? 'Mastered' : 'Finish Task'}
            </button>
         </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Main Content Pane */}
        <section className="flex-1 overflow-y-auto bg-white border-r border-indigo-50 relative pb-32" ref={contentRef}>
          <div className="max-w-4xl mx-auto px-10 md:px-20 py-16 animate-fade-in">
             {isContentLoading ? (
               <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400"><Loader className="animate-spin text-indigo-600 mb-8" size={64} /><h3 className="text-2xl font-black text-slate-800">Synthesizing lesson...</h3></div>
             ) : (
               <article className="prose max-w-none">
                  <div className="mb-12 flex items-center space-x-3 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 text-indigo-700"><Highlighter size={20} className="shrink-0" /><p className="text-sm font-bold">Highlight text to ask AI Tutor for help.</p></div>
                  <div className="guide-content selection:bg-indigo-100 text-slate-800">
                    {generatedContent ? parseMarkdown(generatedContent) : (
                      <div className="text-center py-32"><button onClick={loadContent} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl">Start Lesson</button></div>
                    )}
                  </div>
               </article>
             )}
          </div>
        </section>

        {/* Right Tabbed Panel */}
        <section className="w-[450px] flex flex-col bg-white border-l border-indigo-50 shadow-2xl z-20">
           <div className="flex p-4 bg-slate-50/50 border-b border-indigo-50 gap-2">
              {[
                { id: 'chat', label: 'Tutor', icon: MessageSquare },
                { id: 'notes', label: 'Notes', icon: PenLine },
                { id: 'resources', label: 'Vault', icon: BookOpen },
                { id: 'quiz', label: 'Quiz', icon: HelpCircle }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveRightTab(tab.id as any)} className={`flex-1 flex flex-col items-center py-4 rounded-2xl transition-all border ${activeRightTab === tab.id ? 'bg-white text-indigo-600 shadow-xl border-indigo-100' : 'text-slate-400 border-transparent hover:bg-white/50'}`}>
                  <tab.icon size={22} className="mb-1.5" /><span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
           </div>

           <div className="flex-1 overflow-hidden relative">
              {activeRightTab === 'notes' && <RichNotesEditor content={notes} onChange={v => { setNotes(v); if(pathId && phaseId && moduleId) saveModuleNotes(pathId, phaseId, moduleId, v); }} />}
              
              {activeRightTab === 'chat' && (
                <div className="flex flex-col h-full bg-slate-50/30">
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {chatHistory.map(m => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-5 rounded-3xl text-sm leading-relaxed max-w-[90%] shadow-lg ${m.role === 'user' ? 'blue-purple-gradient text-white rounded-br-none' : 'bg-white border border-indigo-100 text-slate-800 rounded-bl-none'}`}>{m.text}</div>
                      </div>
                    ))}
                    {isTyping && <div className="flex justify-start"><div className="bg-white px-5 py-3 rounded-3xl border border-indigo-50 animate-pulse text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Thinking...</div></div>}
                  </div>
                  <div className="p-6 border-t border-indigo-50 bg-white">
                      <div className="relative"><input value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="w-full pl-6 pr-12 py-5 rounded-3xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50 text-sm font-bold shadow-inner" placeholder="Ask Tutor..." /><button onClick={() => handleSendMessage()} disabled={!inputMessage.trim()} className="absolute right-3 top-2.5 blue-purple-gradient text-white p-3 rounded-2xl shadow-xl disabled:opacity-30"><Send size={18}/></button></div>
                  </div>
                </div>
              )}

              {activeRightTab === 'resources' && (
                <div className="h-full overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Module Assets</h3>
                      <button onClick={handleScoutResources} disabled={isScouting} className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg disabled:opacity-50">
                        {isScouting ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                        <span>Scout AI</span>
                      </button>
                   </div>
                   {module.resources.map(res => (
                     <div key={res.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
                        {res.type === 'youtube' && res.videoId ? (
                          <div>
                            <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${res.videoId}`} frameBorder="0" allowFullScreen title={res.title} />
                            <div className="p-4"><h4 className="font-black text-xs text-slate-800 truncate">{res.title}</h4></div>
                          </div>
                        ) : (
                          <a href={res.content} target="_blank" rel="noreferrer" className="p-6 flex items-center space-x-4">
                             <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><File size={20}/></div>
                             <div className="flex-1 truncate"><h4 className="font-black text-xs text-slate-800 mb-1 truncate">{res.title || 'Resource'}</h4><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">View Source</span></div>
                          </a>
                        )}
                     </div>
                   ))}
                   {module.resources.length === 0 && !isScouting && <div className="text-center py-20 text-slate-400 font-bold text-sm">No assets yet. Hit "Scout AI" to find curated resources.</div>}
                </div>
              )}

              {activeRightTab === 'quiz' && (
                <div className="h-full bg-slate-50/30 p-8">
                   {quizLoading ? (
                      <div className="flex flex-col items-center justify-center h-full"><Loader size={48} className="animate-spin text-indigo-600 mb-4" /><p className="font-black text-slate-800">Generating Quiz...</p></div>
                   ) : quizQuestions.length > 0 ? (
                      <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {currentQuizIndex + 1}/{quizQuestions.length}</span><span className="text-xs font-black text-indigo-600">Score: {quizScore}</span></div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight">{quizQuestions[currentQuizIndex].question}</h4>
                        <div className="space-y-3">
                           {quizQuestions[currentQuizIndex].options.map((opt, i) => (
                             <button key={i} onClick={() => {
                                if (i === quizQuestions[currentQuizIndex].correctAnswerIndex) setQuizScore(s => s + 10);
                                if (currentQuizIndex < quizQuestions.length - 1) setCurrentQuizIndex(c => c + 1);
                                else { alert(`Quiz Complete! Final Score: ${quizScore + (i === quizQuestions[currentQuizIndex].correctAnswerIndex ? 10 : 0)}`); setQuizQuestions([]); }
                             }} className="w-full text-left p-5 rounded-2xl border-2 border-white bg-white shadow-sm hover:border-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm text-slate-700">{opt}</button>
                           ))}
                        </div>
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border-2 border-indigo-50 shadow-xl"><HelpCircle size={40} className="text-indigo-400" /></div>
                        <h3 className="text-2xl font-black text-slate-800">Ready for a Duel?</h3>
                        <p className="text-slate-500 font-medium max-w-[250px]">Test your mastery of this module with 5 AI-generated questions.</p>
                        <button onClick={handleStartQuiz} className="px-10 py-4 blue-purple-gradient text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">Start AI Quiz</button>
                      </div>
                   )}
                </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
};

export default StudySession;
