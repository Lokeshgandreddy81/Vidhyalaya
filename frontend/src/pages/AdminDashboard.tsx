import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  BrainCircuit, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  Database,
  Sparkles,
  Trash2,
  Settings,
  Save,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

interface DocumentMetadata {
  documentId: string;
  title: string;
  courseName: string;
  uploadDate: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Auth bypassed — direct access
  const [universityName] = useState('Local Dev');
  const [hasApiKey, setHasApiKey] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isKeySaving, setIsKeySaving] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Layout State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);



  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey || geminiApiKey.length < 10) {
      toast.error('Please enter a valid Gemini API Key.');
      return;
    }

    const token = localStorage.getItem('vidyal_admin_token') || '';


    setIsKeySaving(true);
    try {
      await api.updateAdminKey(token, geminiApiKey);
      toast.success('API Key saved securely.');
      setGeminiApiKey('');
      setHasApiKey(true);
      setIsEditingKey(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save API key');
    } finally {
      setIsKeySaving(false);
    }
  };

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchDocuments();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !domain || !branch || !semester || !subjectName) {
      toast.error('Please fill Domain, Branch, Semester, Subject and select a PDF.');
      return;
    }
    if (!hasApiKey) {
      toast.error('You must save a Gemini API Key first.');
      return;
    }
    const title = chapterTitle || `Ch.${chapterNumber} — ${subjectName}`;
    setIsUploading(true);
    try {
      const result = await api.uploadRAGDocument(file, {
        title,
        domain,
        branch,
        semester,
        subjectName,
        subjectCode,
        chapterNumber,
        chapterTitle,
      });
      if (result.success) {
        toast.success(`Ingested: ${title}`);
        setFile(null);
        setChapterTitle('');
        setChapterNumber(prev => prev + 1);
        fetchDocs();
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove it from the vector index and the registry.`)) {
      return;
    }

    try {
      await api.deleteRAGDocument(documentId);
      toast.success(`Deleted ${title}`);
      fetchDocs();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };



  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen aurora-silk font-sans relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-300/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full bg-violet-400/15 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/40 backdrop-blur-md border-b border-white/40 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/sara')}
            className="p-2 bg-white/60 hover:bg-white rounded-full transition-all text-slate-600 shadow-sm border border-white/50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="text-indigo-600" size={24} />
              Cortex Campus Admin
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{universityName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasApiKey ? (
            <div className="px-3 py-1.5 bg-emerald-100/50 backdrop-blur-sm border border-emerald-200 rounded-full flex items-center gap-2 shadow-sm">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">API Configured</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-amber-100/50 backdrop-blur-sm border border-amber-200 rounded-full flex items-center gap-2 shadow-sm">
               <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">API Key Missing</span>
            </div>
          )}
          <button 
            onClick={() => setIsRegistryOpen(true)}
            className="p-2 bg-white/60 hover:bg-white rounded-full transition-all text-slate-600 shadow-sm border border-white/50 relative"
          >
            <Database size={20} />
            {documents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {documents.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white/60 hover:bg-white rounded-full transition-all text-slate-600 shadow-sm border border-white/50"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content (Centered Form) */}
      <main className="relative z-10 max-w-2xl mx-auto p-8 pt-12 flex flex-col items-center">
        <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[32px] p-8 shadow-[0_20px_60px_rgba(79,70,229,0.15)] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Ingest New Document</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Add to RAG Registry</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <UploadCloud size={24} />
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Domain & Branch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Domain</label>
                <select value={domain} onChange={e => { setDomain(e.target.value); setBranch(''); }} className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" required>
                  <option value="">Select domain...</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics">Electronics & Communication</option>
                  <option value="Mechanical">Mechanical Engineering</option>
                  <option value="Civil">Civil Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Branch</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" required>
                  <option value="">Select branch...</option>
                  {domain === 'Computer Science' && <><option value="cse">CSE</option><option value="cs-ai">CS (AI)</option><option value="cs-ds">CS (Data Science)</option></>}
                  {domain === 'Electronics' && <><option value="ece">ECE</option><option value="eee">EEE</option></>}
                  {domain === 'Mechanical' && <option value="mech">Mechanical</option>}
                  {domain === 'Civil' && <option value="civil">Civil</option>}
                  {domain === 'Information Technology' && <option value="it">IT</option>}
                </select>
              </div>
            </div>
            
            {/* Semester */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Semester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" required>
                <option value="">Select semester...</option>
                {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            
            {/* Subject */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Subject Name</label>
                <input type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Data Structures" className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Subject Code</label>
                <input type="text" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} placeholder="CS-301" className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
              </div>
            </div>
            
            {/* Chapter */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Ch. #</label>
                <input type="number" min={1} value={chapterNumber} onChange={e => setChapterNumber(parseInt(e.target.value)||1)} className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Chapter Title</label>
                <input type="text" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="e.g. Arrays & Linked Lists" className="w-full h-12 bg-white/60 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
              </div>
            </div>
            
            {/* PDF Upload */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">PDF File</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl bg-white/40 hover:bg-white/80 hover:border-indigo-400 cursor-pointer transition-all shadow-sm group">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <FileText size={24} />
                    </div>
                    <span className="text-xs font-black text-slate-800 truncate max-w-[250px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <UploadCloud size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select or Drag PDF</span>
                  </div>
                )}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            
            <button type="submit" disabled={isUploading || !hasApiKey} className="w-full h-14 mt-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-indigo-600">
              {isUploading ? <><Loader2 size={18} className="animate-spin" />Ingesting...</> : <><BrainCircuit size={18} />Start RAG Ingestion</>}
            </button>
          </form>
        </div>
      </main>

      {/* Settings Slide-out */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-white/90 backdrop-blur-2xl border-l border-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Admin Settings</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{universityName}</p>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {/* Gemini Key Config */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-500" />
                      Gemini API Config
                    </h3>
                    {hasApiKey && !isEditingKey ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                          <CheckCircle2 className="text-emerald-500" size={20} />
                          <div>
                            <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">✅ Configured</h4>
                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Connected to Gemini API.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsEditingKey(true)}
                          className="w-full h-10 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Settings size={14} />
                          Update Key
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveKey} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                            {hasApiKey ? "Update API Key" : "Set API Key"}
                          </label>
                          <input 
                            type="password" 
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          {hasApiKey && (
                            <button 
                              type="button"
                              onClick={() => setIsEditingKey(false)}
                              className="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            type="submit" 
                            disabled={isKeySaving || !geminiApiKey}
                            className="flex-1 h-10 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isKeySaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Key
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>


            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Active Knowledge Documents Slide-out */}
      <AnimatePresence>
        {isRegistryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRegistryOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-white/90 backdrop-blur-2xl border-l border-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 lg:p-8 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Documents</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Managed RAG Registry • {documents.length} Files</p>
                  </div>
                </div>
                <button onClick={() => setIsRegistryOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 lg:p-8 flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="text-indigo-600 animate-spin mb-4" size={32} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Registry...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white/50">
                    <Database className="text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-500">Registry is empty</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs uppercase font-black tracking-widest">Ingest your first document to begin</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.documentId} className="group p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                               <FileText size={24} />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-800 tracking-tight">{doc.title}</h4>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-md">{doc.courseName}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="hidden sm:flex px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <CheckCircle2 size={12} />
                               Indexed
                            </div>
                            <button 
                               onClick={() => handleDelete(doc.documentId, doc.title)}
                               className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                             >
                               <Trash2 size={18} />
                             </button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
