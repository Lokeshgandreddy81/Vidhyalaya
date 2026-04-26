import React, { useState } from 'react';
import { useAppStore } from '../context/Store';
import { User, Award, Database, RefreshCw, Save, LogOut } from 'lucide-react';

const Settings: React.FC = () => {
  const { userProfile, achievements, updateUserProfile, resetData } = useAppStore();
  const [name, setName] = useState(userProfile.name);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUserProfile({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = JSON.stringify(localStorage);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidyal_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-900">Settings & Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold">
              {name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{name}</h2>
              <p className="text-slate-500 text-sm">Level {userProfile.level} Scholar • {userProfile.xp} XP</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button 
              onClick={handleSave} 
              className="flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              {saved ? <span className="flex items-center"><Save size={18} className="mr-2"/> Saved!</span> : 'Update Profile'}
            </button>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Award size={20} className="mr-2 text-amber-500"/>Achievements</h2>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map(ach => (
              <div key={ach.id} className={`p-3 rounded-xl border flex flex-col items-center text-center ${ach.unlockedAt ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                 <span className="text-3xl mb-2">{ach.icon}</span>
                 <span className="text-xs font-bold text-slate-900">{ach.title}</span>
                 <span className="text-[10px] text-slate-500 leading-tight mt-1">{ach.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Database size={20} className="mr-2 text-slate-500"/>Data Management</h2>
         <div className="flex flex-col sm:flex-row gap-4">
           <button onClick={handleExport} className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
             <Save size={18} className="mr-2"/> Export Data
           </button>
           <button onClick={() => { if(confirm('Are you sure? This cannot be undone.')) resetData(); }} className="flex items-center justify-center px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium">
             <RefreshCw size={18} className="mr-2"/> Reset All Progress
           </button>
         </div>
      </div>
    </div>
  );
};

export default Settings;
