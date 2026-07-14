import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Brain,
  Cloud, Trash2, Save,
  Zap, Monitor, HardDrive,
  AlertTriangle, Check, Key, LogOut, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { api } from '../services/api';
import { UserProfile } from '../types';
import { toast } from 'sonner';
import { isValidGeminiApiKeyFormat, validateGeminiAccess } from '../services/geminiService';

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
  const { userProfile, updateUserProfile, resetData, setAuthenticated, byokConfig, updateByokConfig, updateByokMode } = useAppStore();
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
    try {
      const trimmedKey = apiKey.trim();
      if (trimmedKey && provider === 'gemini') {
        if (!isValidGeminiApiKeyFormat(trimmedKey)) {
          throw new Error('Invalid Gemini key format. Paste the full key from Google AI Studio or Google Cloud.');
        }
        await validateGeminiAccess(trimmedKey);
      }

      updateUserProfile(formData);
      
      if (trimmedKey) {
        updateByokMode('custom');
        try {
          const cachedKeysRaw = localStorage.getItem('vidyal_byok_keys_cache') || '{}';
          const cachedKeys = JSON.parse(cachedKeysRaw);
          cachedKeys[provider] = trimmedKey;
          localStorage.setItem('vidyal_byok_keys_cache', JSON.stringify(cachedKeys));

          // Set unified per-provider keys
          localStorage.setItem(`vidyal_byok_key_${provider}`, trimmedKey);
          localStorage.setItem('vidyal_byok_provider', provider);
          if (provider === 'gemini') {
            localStorage.setItem('vidyal_sandbox_api_key', trimmedKey);
          }
          if (preferredModel.trim()) {
            localStorage.setItem(`vidyal_byok_model_${provider}`, preferredModel.trim());
          } else {
            localStorage.removeItem(`vidyal_byok_model_${provider}`);
          }
          if (customEndpoint.trim()) {
            localStorage.setItem(`vidyal_byok_endpoint_${provider}`, customEndpoint.trim());
          } else {
            localStorage.removeItem(`vidyal_byok_endpoint_${provider}`);
          }
        } catch (e) {
          console.warn('Failed to cache BYOK key:', e);
        }

        updateByokConfig({
          provider: provider as any,
          apiKey: trimmedKey,
          customEndpoint: customEndpoint.trim() || undefined,
          preferredModel: preferredModel.trim() || undefined
        });
      } else {
        updateByokConfig(null);
        localStorage.removeItem(`vidyal_byok_key_${provider}`);
        localStorage.removeItem(`vidyal_byok_model_${provider}`);
        localStorage.removeItem(`vidyal_byok_endpoint_${provider}`);
        try {
          const cachedKeysRaw = localStorage.getItem('vidyal_byok_keys_cache') || '{}';
          const cachedKeys = JSON.parse(cachedKeysRaw);
          delete cachedKeys[provider];
          localStorage.setItem('vidyal_byok_keys_cache', JSON.stringify(cachedKeys));
        } catch {}
      }

      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }, 700);
    } catch (err) {
      setIsSaving(false);
      const message = err instanceof Error ? err.message : 'Failed to validate API key.';
      toast.error(message);
    }
  };

  const handleLogout = () => {
    // Trigger server-side token cleanup
    void api.logout().catch(err => console.warn('Failed server-side logout cleanup:', err));

    localStorage.removeItem('vidyal_isAuthenticated');
    localStorage.removeItem('vidyal_user_token');
    localStorage.removeItem('vidyal_user_id');
    localStorage.removeItem('vidyal_is_first_login');
    localStorage.removeItem('vidyal_user_profile');
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
              { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast · Optimized for speed', icon: Zap },
              { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   desc: 'Precise · Superior reasoning', icon: Brain },
            ].map(model => {
              const isActive = formData.preferences?.aiModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => setFormData({
                    ...formData,
                    preferences: { ...(formData.preferences || { theme: 'light', focusMode: false, aiModel: 'gemini-2.5-flash' }), aiModel: model.id },
                  })}
                  className="flex items-center gap-3 p-4 rounded-xl text-left border-2 transition-all cursor-pointer"
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
            className="flex items-center justify-between p-4 rounded-xl mb-6"
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
                preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-2.5-flash', focusMode: false }), focusMode: !formData.preferences?.focusMode },
              })}
              className="relative h-6 w-11 rounded-full transition-colors cursor-pointer"
              style={{ background: formData.preferences?.focusMode ? '#4e5bff' : '#d1d5db' }}
            >
              <div
                className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all"
                style={{ left: formData.preferences?.focusMode ? 'calc(100% - 21px)' : '3px' }}
              />
            </button>
          </div>

          {/* ── Personalization Settings ── */}
          <div className="border-t border-slate-100 pt-5 mb-5 space-y-4">
            <h3 className="text-[13px] font-bold text-slate-800 mb-1" style={{ letterSpacing: '-0.01em' }}>
              Study Personalization
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Cognitive Pace</FieldLabel>
                <select
                  value={formData.preferences?.cognitivePace || 'Balanced'}
                  onChange={e => setFormData({
                    ...formData,
                    preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-2.5-flash', focusMode: false }), cognitivePace: e.target.value as any }
                  })}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                >
                  <option value="Balanced">Balanced (Standard recall)</option>
                  <option value="Spaced">Spaced (Slow deep focus)</option>
                  <option value="Sprint">Sprint (Fast concept digest)</option>
                </select>
              </div>

              <div>
                <FieldLabel>Pedagogical Persona</FieldLabel>
                <select
                  value={formData.preferences?.pedagogicalMode || 'Coach'}
                  onChange={e => setFormData({
                    ...formData,
                    preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-2.5-flash', focusMode: false }), pedagogicalMode: e.target.value as any }
                  })}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                >
                  <option value="Coach">Coach (Supportive companion)</option>
                  <option value="Socratic">Socratic (Guide with questions)</option>
                  <option value="Debugger">Debugger (Code logic expert)</option>
                  <option value="Teacher">Teacher (Structured breakdown)</option>
                  <option value="PairProgrammer">PairProgrammer (Interactive coder)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Analogy Domain</FieldLabel>
                <select
                  value={formData.preferences?.analogyDomain || 'Tech'}
                  onChange={e => setFormData({
                    ...formData,
                    preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-2.5-flash', focusMode: false }), analogyDomain: e.target.value as any }
                  })}
                  className="w-full h-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 text-[13px] font-medium text-slate-800 outline-none transition-all focus:border-[#4e5bff]"
                >
                  <option value="Tech">Tech (Software & servers)</option>
                  <option value="Daily Life">Daily Life (Cooking & simple tasks)</option>
                  <option value="Sports">Sports (Athletics & gameplay)</option>
                  <option value="Space">Space (Planets & gravity)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <FieldLabel>Model Temperature</FieldLabel>
                  <span className="text-[11px] font-mono text-[#4e5bff] font-bold">
                    {formData.preferences?.temperature ?? 0.3}
                  </span>
                </div>
                <div className="flex items-center h-10 gap-3">
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={formData.preferences?.temperature ?? 0.3}
                    onChange={e => setFormData({
                      ...formData,
                      preferences: { ...(formData.preferences || { theme: 'light', aiModel: 'gemini-2.5-flash', focusMode: false }), temperature: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-[#4e5bff] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom BYOK configurations */}
          <div className="mt-4 pt-5 border-t border-slate-100 space-y-4">
            <h3 className="text-[13px] font-bold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
              Custom Keys & BYOK Routing
            </h3>

            {localStorage.getItem('vidyal_user_id') === 'sandbox-scholar' && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-[12px] font-semibold text-violet-700 shadow-sm flex items-start gap-2.5">
                <span className="text-[14px] mt-0.5">🛠️</span>
                <div className="leading-relaxed">
                  <strong>Developer Sandbox mode active:</strong> Gemini API key is auto-scouted from the backend server. No key setup required.
                </div>
              </div>
            )}

            <div>
              <FieldLabel>AI Provider</FieldLabel>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as any)}
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
