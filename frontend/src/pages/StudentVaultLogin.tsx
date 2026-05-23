import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, BookMarked, User, GraduationCap } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

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

const StudentVaultLogin: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [universityId, setUniversityId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId || !rollNumber || !passcode) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    try {
      if (mode === 'register') {
        if (!name || !branch || !semester) { 
          toast.error('Please fill in all registration fields.'); 
          setIsLoading(false); 
          return; 
        }
        await api.studentRegister({ rollNumber, universityId, name, branch, semester, passcode });
        toast.success('Registration successful! Please login.');
        setMode('login');
      } else {
        const data = await api.studentLogin(rollNumber, universityId, passcode);
        localStorage.setItem('vidyal_student_token', data.token);
        toast.success(`Welcome back, ${data.student.name}!`);
        navigate('/sara/vault');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Immersive Cyber Ambient Orbs (Dark Obsidian theme) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[130px]" />
        <div className="absolute -bottom-16 -right-16 w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[160px]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 bg-slate-950/45 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 via-indigo-600 to-transparent" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-950/40 rounded-2xl flex items-center justify-center text-violet-400 shadow-inner border border-violet-500/20">
              <Lock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Cortex Academy</span>
                <span className="text-[10px] font-light text-slate-600">/</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Campus</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">University Vault</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{mode === 'login' ? 'Student Access Control' : 'Initialize New Account'}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/sara')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white border border-white/10 shadow-sm"
            title="Back to Cortex Campus"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">University / Institution</label>
            <select 
              value={universityId} 
              onChange={e => setUniversityId(e.target.value)} 
              className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm cursor-pointer" 
              required
            >
              <option value="" className="bg-[#0c1220] text-slate-400">Select university...</option>
              {UNIVERSITY_LIST.map(u => <option key={u.id} value={u.id} className="bg-[#0c1220] text-white">{u.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Roll Number / Student ID</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></span>
              <input 
                value={rollNumber} 
                onChange={e => setRollNumber(e.target.value)} 
                placeholder="e.g. 21CS001" 
                className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm" 
                required 
              />
            </div>
          </div>

          {mode === 'register' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><GraduationCap size={18} /></span>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Enter your full name" 
                    className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm" 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Branch</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm" required>
                    <option value="" className="bg-[#0c1220] text-slate-400">Branch...</option>
                    {BRANCH_LIST.map(b => <option key={b.id} value={b.id} className="bg-[#0c1220] text-white">{b.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Semester</label>
                  <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm" required>
                    <option value="" className="bg-[#0c1220] text-slate-400">Semester...</option>
                    {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s} className="bg-[#0c1220] text-white">Sem {s}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Passcode</label>
            <input 
              type="password" 
              value={passcode} 
              onChange={e => setPasscode(e.target.value)} 
              placeholder="••••••••" 
              className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-violet-500 focus:bg-slate-950 transition-all shadow-sm font-mono" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-14 mt-6 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-lg shadow-violet-950/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 border border-white/5"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin text-white" /> : <BookMarked size={20} />}
            {mode === 'login' ? 'Enter University Vault' : 'Initialize Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-violet-400 transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Register Now" : 'Already have an account? Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentVaultLogin;
