import React, { useState } from 'react';
import { 
  User, Settings as SettingsIcon, Shield, Brain, 
  Cloud, Trash2, Save, Sparkles,
  Zap, Monitor, HardDrive, Layout as LayoutIcon,
  ChevronRight, AlertTriangle, Check
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { UserProfile } from '../types';

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile, resetData } = useAppStore();
  const [formData, setFormData] = useState<Partial<UserProfile>>(userProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    updateUserProfile(formData);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const roles: UserProfile['role'][] = ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'];

  return (
    <div className="flex-1 flex flex-col bg-[#f5f6fa] overflow-y-auto px-5 pb-24 pt-8 sm:px-8 lg:px-10 xl:px-14">
      <div className="mx-auto max-w-[1000px] w-full space-y-8">
        
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
              Vidhyalaya — Place of Wisdom
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Settings</h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              Configure your learning interface and academic profile.
            </p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`group inline-flex shrink-0 items-center gap-2.5 rounded-[18px] px-7 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_8px_20px_-4px_rgba(0,6,102,0.3)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 ${saveSuccess ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-[#000666]'}`}
          >
             {saveSuccess ? <Check size={16} strokeWidth={3} /> : <Save size={16} strokeWidth={2.5} />}
             <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>

        <div className="grid gap-6">
          
          {/* Identity Section */}
          <div className="rounded-[24px] bg-white p-6 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
                <User size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-black tracking-tight text-slate-900 uppercase tracking-[0.1em]">Identity Profile</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-[14px] px-4 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-[14px] px-4 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scholastic Role</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role}
                    onClick={() => setFormData({...formData, role})}
                    className={`px-5 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      formData.role === role 
                        ? 'bg-[#000666] border-[#000666] text-white shadow-sm' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Intelligence Section */}
          <div className="rounded-[24px] bg-white p-6 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
                <Brain size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-black tracking-tight text-slate-900 uppercase tracking-[0.1em]">Intelligence Engine</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Optimized for speed', icon: Zap },
                { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Superior reasoning', icon: Sparkles }
              ].map(model => (
                <button
                  key={model.id}
                  onClick={() => setFormData({
                    ...formData, 
                    preferences: { ...(formData.preferences || {theme:'light', focusMode:false, aiModel: 'gemini-1.5-flash'}), aiModel: model.id }
                  })}
                  className={`flex items-start gap-3.5 p-4 rounded-[18px] border-2 text-left transition-all ${
                    formData.preferences?.aiModel === model.id 
                      ? 'bg-indigo-50/30 border-indigo-200' 
                      : 'bg-white border-slate-100 hover:border-indigo-100'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${formData.preferences?.aiModel === model.id ? 'bg-[#000666] text-white' : 'bg-slate-50 text-slate-300'}`}>
                    <model.icon size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-black uppercase tracking-widest ${formData.preferences?.aiModel === model.id ? 'text-[#000666]' : 'text-slate-500'}`}>{model.label}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{model.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[18px] bg-slate-50/50 p-5 ring-1 ring-slate-100/50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-indigo-400 shadow-sm">
                  <Monitor size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-slate-700">Focus Mode</p>
                  <p className="text-[10px] font-medium text-slate-400">Simplify UI during sessions</p>
                </div>
              </div>
              <button 
                onClick={() => setFormData({
                  ...formData, 
                  preferences: { ...(formData.preferences || {theme:'light', aiModel:'gemini-1.5-flash', focusMode: false}), focusMode: !formData.preferences?.focusMode }
                })}
                className={`relative h-7 w-12 rounded-full transition-all ${formData.preferences?.focusMode ? 'bg-[#000666]' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm ${formData.preferences?.focusMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Sync Section */}
          <div className="rounded-[24px] bg-white p-6 ring-1 ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-600">
                  <Cloud size={18} strokeWidth={2.5} />
                </div>
                <h2 className="text-[15px] font-black tracking-tight text-slate-900 uppercase tracking-[0.1em]">Cloud Sync</h2>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[18px] bg-slate-50/50 p-5 ring-1 ring-slate-100/50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-emerald-400 shadow-sm">
                  <HardDrive size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-slate-700">Storage Usage</p>
                  <p className="text-[10px] font-medium text-slate-400">Vault capacity (local cache)</p>
                </div>
              </div>
              <p className="text-[13px] font-black text-slate-900">256.0 MB <span className="opacity-30 ml-0.5 text-[10px]">/ 1 GB</span></p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 px-2">
            {!showResetConfirm ? (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="group flex items-center gap-2 text-red-400 hover:text-red-600 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Trash2 size={14} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                Reset System State
              </button>
            ) : (
              <div className="bg-red-50/50 border border-red-100 rounded-[20px] p-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
                 <div className="mx-auto w-12 h-12 rounded-[14px] bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle size={24} strokeWidth={2.5} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-[15px] font-black text-red-950">Confirm Reset?</h3>
                    <p className="text-[12px] text-red-700/60 font-medium">All courses and logs will be permanently erased.</p>
                 </div>
                 <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="px-6 py-2 rounded-[12px] bg-white border border-red-100 text-[10px] font-black uppercase tracking-widest text-red-900"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => { resetData(); setShowResetConfirm(false); }}
                      className="px-6 py-2 rounded-[12px] bg-red-600 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Confirm
                    </button>
                 </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
