import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { Sparkles, Mail, Lock, User, GraduationCap, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage: React.FC = () => {
  const { setAuthenticated, updateUserProfile } = useAppStore();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Scholar' | 'Researcher' | 'Architect' | 'CEO' | 'CPO'>('Architect');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setAuthenticated(true);
      
      if (isSignUp) {
        updateUserProfile({
          name,
          email,
          role,
          joinedAt: new Date().toISOString(),
        });
        toast.success(`Welcome, ${name}! Your scholastic profile has been initialized.`);
      } else {
        updateUserProfile({
          email,
        });
        toast.success('Welcome back to your scholastic dashboard.');
      }

      // Check if custom API key is present; if not, suggest entering one, or navigate directly to dashboard
      const hasCustomKey = localStorage.getItem('vidyal_custom_gemini_api_key');
      if (!hasCustomKey) {
        navigate('/api-setup');
      } else {
        navigate('/dashboard');
      }
    }, 1200);
  };

  const roles: Array<'Scholar' | 'Researcher' | 'Architect' | 'CEO' | 'CPO'> = ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'];

  return (
    <div className="min-h-screen w-full bg-[#05070a] text-white flex items-center justify-center relative overflow-hidden font-sans p-4">
      {/* Dynamic Aurora Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#312e81_0%,transparent_40%)]" />
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[15%] right-[15%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-[#000666] to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <GraduationCap size={28} className="text-indigo-300 relative z-10 transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div className="space-y-1 mt-4">
            <h1 className="text-2xl font-black uppercase tracking-[0.25em] bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Vidyal.ai
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              Student Intelligence System
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />

          <div className="flex border-b border-white/5 pb-5 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all relative ${!isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign In
              {!isSignUp && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all relative ${isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign Up
              {isSignUp && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-3 duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><User size={16} /></span>
                  <input
                    type="text"
                    required={isSignUp}
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-[14px] pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Mail size={16} /></span>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-[14px] pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Lock size={16} /></span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-[14px] pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Scholastic Role</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {roles.map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${role === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Processing...' : isSignUp ? 'Initialize Profile' : 'Access System'}</span>
              {!isLoading && <ArrowRight size={14} />}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-center text-[10px] font-bold text-slate-500">
          <ShieldCheck size={14} className="text-indigo-400/50" />
          <span>Vidyal secure context — end-to-end local data synchronization.</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
