import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Lock,
  Settings,
  Save
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
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginUniversityId, setLoginUniversityId] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isKeySaving, setIsKeySaving] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('vidyal_admin_token');
    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    try {
      const data = await api.getAdminMe(token);
      if (data.success) {
        setIsAuthenticated(true);
        setUniversityName(data.universityName);
        setHasApiKey(data.hasApiKey);
        fetchDocs();
      }
    } catch (err) {
      localStorage.removeItem('vidyal_admin_token');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUniversityId || !loginPasscode) return;

    try {
      const data = await api.adminLogin(loginUniversityId, loginPasscode);
      localStorage.setItem('vidyal_admin_token', data.token);
      setIsAuthenticated(true);
      setUniversityName(data.universityName);
      toast.success('Login successful!');
      checkAuth();
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey || geminiApiKey.length < 10) {
      toast.error('Please enter a valid Gemini API Key.');
      return;
    }

    const token = localStorage.getItem('vidyal_admin_token');
    if (!token) return;

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
    if (!file || !title || !courseName) {
      toast.error('Please fill all fields and select a PDF.');
      return;
    }

    if (!hasApiKey) {
      toast.error('You must save a Gemini API Key first.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadRAGDocument(file, title, courseName);
      if (result.success) {
        toast.success(`Successfully ingested ${title}!`);
        setFile(null);
        setTitle('');
        setCourseName('');
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Lock size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">University Admin</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login required</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">University ID</label>
              <input 
                type="text" 
                value={loginUniversityId}
                onChange={(e) => setLoginUniversityId(e.target.value)}
                placeholder="e.g. vidhyal-admin"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Passcode</label>
              <input 
                type="password" 
                value={loginPasscode}
                onChange={(e) => setLoginPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full h-12 mt-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/smart-study')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="text-indigo-600" size={24} />
              Knowledge Base Admin
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{universityName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasApiKey ? (
            <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">API Configured</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">API Key Missing</span>
            </div>
          )}
          <button 
            onClick={() => {
              localStorage.removeItem('vidyal_admin_token');
              setIsAuthenticated(false);
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Settings & Upload */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* API Key Settings Panel */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm overflow-hidden">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={16} className="text-slate-400" />
              Gemini API Config
            </h2>
            {hasApiKey && !isEditingKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <div>
                    <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">✅ API Key Configured</h3>
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Your university is connected to Gemini.</p>
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
                    {hasApiKey ? "Update University Key" : "Set University Key"}
                  </label>
                  <input 
                    type="password" 
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder={hasApiKey ? "••••••••••••••••" : "AIzaSy..."}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-mono"
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
                    className="flex-1 h-10 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isKeySaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Key
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Upload Form */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm overflow-hidden relative opacity-100">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Ingest New Document</h2>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Document Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Algorithms"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Course / Module Name</label>
                <input 
                  type="text" 
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Data Structures (CS-301)"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">PDF File</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-all group overflow-hidden relative">
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={24} className="text-indigo-600" />
                      <span className="text-[10px] font-black text-slate-700 truncate max-w-[180px]">{file.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                        <UploadCloud size={18} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select PDF</span>
                    </div>
                  )}
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isUploading || !hasApiKey}
                className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} />
                    Start RAG Ingestion
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Document List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Knowledge Documents</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Managed RAG Registry</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black text-slate-900">{documents.length}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                </div>
             </div>

             {isLoading ? (
               <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="text-indigo-600 animate-spin mb-4" size={32} />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Registry...</p>
               </div>
             ) : documents.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                  <Database className="text-slate-200 mb-4" size={48} />
                  <p className="text-sm font-bold text-slate-400">Registry is empty</p>
                  <p className="text-[10px] text-slate-300 mt-1 max-w-xs uppercase font-black tracking-widest">Ingest your first textbook to begin</p>
               </div>
             ) : (
               <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.documentId} className="group p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                             <FileText size={20} />
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-slate-800 tracking-tight">{doc.title}</h4>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{doc.courseName}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-400">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <CheckCircle2 size={10} />
                             Indexed
                          </div>
                          <button 
                             onClick={() => handleDelete(doc.documentId, doc.title)}
                             className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                           >
                             <Trash2 size={16} />
                           </button>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
