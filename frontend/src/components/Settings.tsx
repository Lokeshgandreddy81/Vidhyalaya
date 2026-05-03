import React, { useState } from 'react';
import { 
  User, Settings as SettingsIcon, Shield, Brain, 
  Cloud, Trash2, Save, Sparkles,
  Zap, Monitor, HardDrive, Layout as LayoutIcon
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { UserProfile } from '../types';

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile, resetData } = useAppStore();
  const [formData, setFormData] = useState<Partial<UserProfile>>(userProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    updateUserProfile(formData);
    setTimeout(() => setIsSaving(false), 800);
  };

  const roles: UserProfile['role'][] = ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'];

  return (
    <div className="flex-1 flex flex-col bg-[#fdfdfe] overflow-y-auto custom-scrollbar blueprint-grid p-8 lg:p-12 animate-in fade-in duration-700 select-none">
      <div className="mx-auto max-w-4xl w-full space-y-12 pb-20">
        
        {/* Header - Micromanaged Alignment */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-10">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#000666] shadow-sm mb-2 animate-in slide-in-from-left duration-700">
                <SettingsIcon size={14} className="text-indigo-400" />
                System Calibration
             </div>
             <h1 className="text-5xl font-serif text-[#000666] tracking-tight">Settings</h1>
             <p className="text-[15px] text-slate-400 font-serif italic leading-relaxed">Configure your neural interface and academic identity.</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="group relative flex items-center gap-3 px-8 py-4 bg-[#000666] text-white rounded-[18px] font-black uppercase tracking-widest text-[11px] shadow-[0_20px_40px_-12px_rgba(0,6,102,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
          >
             <Save size={16} strokeWidth={2.5} />
             <span className="relative z-10">{isSaving ? 'Synchronizing...' : 'Save Architecture'}</span>
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-white/10 to-indigo-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </header>

        <div className="grid gap-12">
          
          {/* Section: Identity Architecture */}
          <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center gap-3.5 px-1">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <User size={20} strokeWidth={2.5} />
               </div>
               <h2 className="text-2xl font-serif font-bold text-[#000666]">Identity Architecture</h2>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/5 transition-colors duration-700" />
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Full Name</label>
                     <input 
                       type="text" 
                       value={formData.name || ''}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300"
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Email Address</label>
                     <input 
                       type="email" 
                       value={formData.email || ''}
                       onChange={(e) => setFormData({...formData, email: e.target.value})}
                       className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300"
                     />
                  </div>
               </div>

               <div className="space-y-5 relative z-10">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Operational Role</label>
                  <div className="flex flex-wrap gap-3">
                     {roles.map(role => (
                       <button
                         key={role}
                         onClick={() => setFormData({...formData, role})}
                         className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.role === role ? 'bg-[#000666] border-[#000666] text-white shadow-xl shadow-indigo-900/20 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200'}`}
                       >
                         {role}
                       </button>
                     ))}
                  </div>
               </div>
            </div>
          </section>

          {/* Section: Neural Intelligence */}
          <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center gap-3.5 px-1">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Brain size={20} strokeWidth={2.5} />
               </div>
               <h2 className="text-2xl font-serif font-bold text-[#000666]">Intelligence Engine</h2>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-8 group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/5 transition-colors duration-700" />
               
               <div className="space-y-5 relative z-10">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Primary LLM Protocol</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {[
                       { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Optimized for speed & efficiency', icon: Zap },
                       { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Superior logic & deep reasoning', icon: Sparkles }
                     ].map(model => (
                       <button
                         key={model.id}
                         onClick={() => setFormData({
                           ...formData, 
                           preferences: { ...(formData.preferences || {theme:'light', focusMode:false, aiModel: 'gemini-1.5-flash'}), aiModel: model.id }
                         })}
                         className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all group/model ${formData.preferences?.aiModel === model.id ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-100'}`}
                       >
                         <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${formData.preferences?.aiModel === model.id ? 'bg-[#000666] text-white shadow-lg' : 'bg-slate-50 text-slate-300 group-hover/model:bg-indigo-50 group-hover/model:text-indigo-400'}`}>
                            <model.icon size={20} strokeWidth={2.5} />
                         </div>
                         <div className="flex flex-col">
                            <span className={`text-[12px] font-black uppercase tracking-widest ${formData.preferences?.aiModel === model.id ? 'text-[#000666]' : 'text-slate-500'}`}>{model.label}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{model.desc}</span>
                         </div>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-indigo-400 shadow-sm border border-white">
                        <Monitor size={20} strokeWidth={2.5} />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-widest text-[#000666]">Focus Spacing</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Auto-hide UI during reading sessions</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => setFormData({
                      ...formData, 
                      preferences: { ...(formData.preferences || {theme:'light', aiModel:'gemini-1.5-flash', focusMode: false}), focusMode: !formData.preferences?.focusMode }
                    })}
                    className={`w-14 h-8 rounded-full transition-all relative ${formData.preferences?.focusMode ? 'bg-[#000666]' : 'bg-slate-200'}`}
                  >
                     <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm ${formData.preferences?.focusMode ? 'left-7 shadow-lg shadow-black/20' : 'left-1'}`} />
                  </button>
               </div>
            </div>
          </section>

          {/* Section: Storage & Sync */}
          <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="flex items-center gap-3.5 px-1">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Cloud size={20} strokeWidth={2.5} />
               </div>
               <h2 className="text-2xl font-serif font-bold text-[#000666]">Vault Synchronization</h2>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6 group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/5 transition-colors duration-700" />
               
               <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 rounded-[20px] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <Shield size={24} strokeWidth={2.5} />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-slate-800">MongoDB Atlas Integrated</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.15em] mt-0.5">Global Intelligence Archive</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700 text-[9px] font-black uppercase tracking-widest">Connected</span>
                  </div>
               </div>
               
               <div className="pt-8 border-t border-slate-50 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center">
                        <HardDrive size={18} strokeWidth={2.5} />
                     </div>
                     <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Neural Cache Capacity</span>
                  </div>
                  <span className="text-sm font-black text-[#000666] tracking-tighter">256.0 MB <span className="opacity-20 ml-1">/ 1 GB</span></span>
               </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="pt-10 animate-in fade-in duration-1000 delay-500">
            {!showResetConfirm ? (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="group flex items-center gap-4 text-red-300 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-[0.25em] px-2"
              >
                <Trash2 size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                Erase Neural Memory
              </button>
            ) : (
              <div className="bg-red-50/50 border border-red-100 rounded-[32px] p-10 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-500">
                 <div className="w-20 h-20 rounded-[24px] bg-red-100 text-red-600 flex items-center justify-center shadow-inner animate-bounce">
                    <Shield size={36} strokeWidth={2.5} />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-2xl font-serif font-black text-red-950">Confirm Neural Wipe?</h3>
                    <p className="text-[14px] text-red-700/60 font-medium max-w-sm leading-relaxed">This action will permanently delete all courses, archives, and mastery logs. The process is irreversible.</p>
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="px-10 py-4 rounded-xl bg-white border border-red-200 text-red-900 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={() => { resetData(); setShowResetConfirm(false); }}
                      className="px-10 py-4 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)] hover:bg-red-700 transition-all"
                    >
                      Confirm Wipe
                    </button>
                 </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default Settings;
