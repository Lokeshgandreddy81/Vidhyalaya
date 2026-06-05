import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Brain,
  Cloud, Trash2, Save,
  Zap, Monitor, HardDrive,
  AlertTriangle, Check, Key, LogOut, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { UserProfile } from '../types';
import { toast } from 'sonner';

/* ── Shared SettingCard wrapper ── */
const SettingCard: React.FC<{
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, iconColor, iconBg, title, badge, children }) => (
  <div
    className="rounded-xl p-6"
    style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
  >
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <h2 className="text-[14px] font-semibold text-slate-900" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {badge}
    </div>
    {children}
  </div>
);

/* ── Standard label ── */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
    {children}
  </label>
);

/* ── Standard input ── */
const FieldInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 text-[13px] font-medium text-slate-800 outline-none transition-all"
    onFocus={e => {
      e.currentTarget.style.borderColor = '#4e5bff';
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(78,91,255,0.08)';
      e.currentTarget.style.background = '#fff';
    }}
    onBlur={e => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.background = '#f8fafc';
    }}
  />
);

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile, resetData, setAuthenticated, byokConfig, updateByokConfig } = useAppStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<UserProfile>>(userProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [provider, setProvider] = useState(() => byokConfig?.provider || 'gemini');
  const [apiKey, setApiKey] = useState(() => byokConfig?.apiKey || '');
  const [customEndpoint, setCustomEndpoint] = useState(() => byokConfig?.customEndpoint || '');
  const [preferredModel, setPreferredModel] = useState(() => byokConfig?.preferredModel || '');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    updateUserProfile(formData);
    
    if (apiKey.trim()) {
      updateByokConfig({
        provider: provider as any,
        apiKey: apiKey.trim(),
        customEndpoint: customEndpoint.trim() || undefined,
        preferredModel: preferredModel.trim() || undefined
      });
    } else {
      updateByokConfig(null);
    }

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 700);
  };

  const handleLogout = () => {
    localStorage.removeItem('vidyal_isAuthenticated');
    localStorage.removeItem('vidyal_user_token');
    localStorage.removeItem('vidyal_user_id');
    setAuthenticated(false);
    toast.success('Signed out successfully.');
    navigate('/');
  };

  const roles: UserProfile['role'][] = ['Scholar', 'Researcher', 'Architect', 'CEO', 'CPO'];

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto px-6 pb-24 pt-10 sm:px-10 lg:px-12"
      style={{ background: 'transparent' }}
    >
      <div className="mx-auto max-w-[800px] w-full space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-8 text-white">
          <div>
            <p className="section-label mb-1.5 text-white/50">Cortex · Workspace</p>
            <h1 className="jawdropping-header-title">Settings</h1>
            <p className="jawdropping-header-subtitle mt-1.5">
              Configure your profile and learning preferences.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="jawdropping-btn-glass flex items-center gap-2"
            >
              <LogOut size={14} strokeWidth={2} />
              Sign out
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-brand flex items-center gap-2"
              style={{ minWidth: 130 }}
            >
              {saveSuccess ? <Check size={14} strokeWidth={2.5} /> : <Save size={14} strokeWidth={2} />}
              {isSaving ? 'Saving…' : saveSuccess ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* ── Identity ── */}
        <SettingCard
          icon={<User size={16} strokeWidth={2} />}
          iconColor="#4e5bff"
          iconBg="rgba(78,91,255,0.1)"
          title="Identity Profile"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <FieldInput
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <FieldInput
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel>Scholastic role</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => setFormData({ ...formData, role })}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all"
                  style={
                    formData.role === role
                      ? { background: '#4e5bff', borderColor: '#4e5bff', color: '#fff' }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }
                  }
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </SettingCard>

        {/* ── Intelligence Engine ── */}
        <SettingCard
          icon={<Brain size={16} strokeWidth={2} />}
          iconColor="#4e5bff"
          iconBg="rgba(78,91,255,0.1)"
          title="Intelligence Engine"
        >
          {/* Model selection */}
          <div className="grid gap-3 sm:grid-cols-2 mb-5">
            {[
              { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Fast · Optimized for speed', icon: Zap },
              { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   desc: 'Precise · Superior reasoning', icon: Brain },
            ].map(model => {
              const isActive = formData.preferences?.aiModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => setFormData({
                    ...formData,
                    preferences: { ...(formData.preferences || { theme: 'light', focusMode: false, aiModel: 'gemini-1.5-flash' }), aiModel: model.id },
                  })}
                  className="flex items-center gap-3 p-4 rounded-xl text-left border-2 transition-all"
                  style={{
                    background: isActive ? 'rgba(78,91,255,0.04)' : '#f8fafc',
                    borderColor: isActive ? '#4e5bff' : '#e2e8f0',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? '#4e5bff' : '#e2e8f0', color: isActive ? '#fff' : '#94a3b8' }}
                  >
                    <model.icon size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: isActive ? '#4e5bff' : '#374151' }}>{model.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{model.desc}</p>
                  </div>
                  {isActive && (
                    <div className="ml-auto">
                      <Check size={14} style={{ color: '#4e5bff' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Focus mode toggle */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' }}
              >
                <Monitor size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Focus mode</p>
                <p className="text-[11px] text-slate-400">Simplify the UI during study sessions</p>
              </div>
            </div>
            <button
              onClick={() => setFormData({
                ...formData,
                preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-1.5-flash', focusMode: false }), focusMode: !formData.preferences?.focusMode },
              })}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ background: formData.preferences?.focusMode ? '#4e5bff' : '#d1d5db' }}
            >
              <div
                className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all"
                style={{ left: formData.preferences?.focusMode ? 'calc(100% - 21px)' : '3px' }}
              />
            </button>
          </div>

          {/* Custom BYOK configurations */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div>
              <FieldLabel>AI Provider</FieldLabel>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="openrouter">OpenRouter</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div>
              <FieldLabel>API Key</FieldLabel>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={apiKey}
                  placeholder="Enter your private API key..."
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg pl-9 pr-4 text-[13px] font-mono font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Custom Model (Optional)</FieldLabel>
                <input
                  type="text"
                  value={preferredModel}
                  placeholder="e.g. gpt-4o-mini"
                  onChange={e => setPreferredModel(e.target.value)}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                />
              </div>
              <div>
                <FieldLabel>Custom Endpoint (Optional)</FieldLabel>
                <input
                  type="text"
                  value={customEndpoint}
                  placeholder="https://..."
                  onChange={e => setCustomEndpoint(e.target.value)}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
              Stored locally inside this browser session context. Connection is securely routed directly to the chosen LLM completions endpoint.
            </p>
          </div>
        </SettingCard>

        {/* ── Cloud Sync ── */}
        <SettingCard
          icon={<Cloud size={16} strokeWidth={2} />}
          iconColor="#16a34a"
          iconBg="rgba(22,163,74,0.1)"
          title="Cloud Sync"
          badge={
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </div>
          }
        >
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' }}
              >
                <HardDrive size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Storage usage</p>
                <p className="text-[11px] text-slate-400">Vault capacity (local cache)</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[14px] font-bold text-slate-900">256.0 MB</span>
              <span className="text-[11px] text-slate-400 ml-1">/ 1 GB</span>
            </div>
          </div>
        </SettingCard>

        {/* ── Danger Zone ── */}
        <div
          className="rounded-xl p-6"
          style={{ background: '#fff', border: '1px solid #fecaca' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
            >
              <Shield size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-900">Danger Zone</h2>
          </div>

          {!showResetConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-slate-700">Reset system state</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Permanently erase all paths, sessions, and local data.</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.06)'; }}
              >
                <Trash2 size={13} strokeWidth={2} />
                Reset
              </button>
            </div>
          ) : (
            <div
              className="rounded-xl p-5 text-center space-y-4"
              style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}
            >
              <div
                className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
              >
                <AlertTriangle size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-red-900">Confirm reset?</h3>
                <p className="text-[12px] text-red-600/70 mt-0.5">All paths and sessions will be permanently deleted.</p>
              </div>
              <div className="flex justify-center gap-2.5">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="btn-secondary text-[12px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { resetData(); setShowResetConfirm(false); }}
                  className="btn-danger text-[12px]"
                  style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                >
                  Confirm reset
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Settings;
