import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  Plus, 
  GraduationCap, 
  Search, 
  Clock, 
  BookOpen, 
  ArrowRight,
  FolderKanban,
  FileText,
  Sparkles,
  Zap,
  TrendingUp,
  Layout as LayoutIcon
} from 'lucide-react';

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { paths } = useAppStore();
  const [query, setQuery] = useState('');

  const activePaths = paths.filter(path => path.status !== 'archived');
  
  const filteredPaths = activePaths.filter(path => 
    path.title.toLowerCase().includes(query.toLowerCase()) || 
    path.goal.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-[#fdfdfe] px-6 pb-24 pt-12 sm:px-10 lg:px-16 blueprint-grid">
      <div className="mx-auto max-w-[1600px] space-y-12">
        
        {/* Header Section - Micromanaged Spacing & Premium Hierarchy */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-slate-100 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#000666] shadow-sm mb-6 animate-in slide-in-from-left duration-700">
              <Sparkles size={14} className="text-indigo-400" />
              Neural Archive
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#000666] sm:text-6xl font-serif">
              Mastery Classrooms
            </h1>
            <p className="mt-4 text-base sm:text-lg font-medium text-slate-400 leading-relaxed max-w-xl">
              Access your personalized learning universes. Every path is an architected journey towards specialized intelligence.
            </p>
          </div>
          <div className="flex shrink-0">
            <button
              onClick={() => navigate('/create')}
              className="group relative inline-flex items-center gap-4 rounded-2xl bg-[#000666] px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-12px_rgba(0,6,102,0.3)] transition-all hover:scale-[1.05] hover:shadow-[0_25px_50px_-12px_rgba(0,6,102,0.4)] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-white/10 to-indigo-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
              <span>Initialize Path</span>
            </button>
          </div>
        </header>

        {/* Search Architecture */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your knowledge graph..."
              className="w-full h-16 bg-white border border-slate-100 rounded-[22px] pl-14 pr-6 text-[15px] font-bold text-slate-700 outline-none shadow-sm focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 placeholder:font-medium"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"
              >
                <Plus size={16} className="rotate-45" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
             {['All', 'Active', 'Completed'].map((tab) => (
               <button 
                 key={tab}
                 className={`px-6 h-16 rounded-[22px] text-[10px] font-black uppercase tracking-widest border transition-all ${tab === 'All' ? 'bg-[#000666] border-[#000666] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600'}`}
               >
                 {tab}
               </button>
             ))}
          </div>
        </div>

        {/* Course Grid - Micromanaged Layout & Spacing */}
        {filteredPaths.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {filteredPaths.map((path) => {
              const moduleCount = path.phases.reduce((sum, phase) => sum + phase.modules.length, 0);
              const minutes = path.phases.reduce((sum, phase) => sum + phase.modules.reduce((inner, module) => inner + (module.estimatedMinutes || 0), 0), 0);

              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => navigate(`/path/${path.id}`)}
                  className="group relative flex flex-col justify-between rounded-[32px] border border-slate-100 bg-white p-8 text-left shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-indigo-200 hover:shadow-[0_30px_60px_-15px_rgba(0,6,102,0.1)] overflow-hidden"
                >
                  {/* Neural Background Decor */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/5 transition-colors duration-700" />
                  
                  <div className="relative z-10">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="w-14 h-14 bg-slate-50 rounded-[18px] flex items-center justify-center text-[#000666] group-hover:bg-[#000666] group-hover:text-white transition-all duration-500 shadow-inner group-hover:scale-110 group-hover:rotate-3">
                        <LayoutIcon size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                         <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 shadow-sm">
                          {path.progress}% Mastery
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Status: Active</span>
                      </div>
                    </div>
                    
                    <h3 className="line-clamp-2 text-xl font-black leading-[1.3] text-[#000666] mb-3 group-hover:translate-x-1 transition-transform duration-500">{path.title}</h3>
                    <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-slate-400 italic font-serif pr-4">{path.goal}</p>
                  </div>

                  <div className="mt-12 space-y-6 relative z-10">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end mb-1 px-1">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Progress Density</span>
                         <span className="text-[11px] font-black text-[#000666]">{path.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-50 border border-slate-100 p-[2px]">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#000666] to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                          style={{ width: `${Math.max(path.progress, 5)}%` }} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="flex-1 flex items-center gap-2.5 bg-slate-50/80 px-4 py-2.5 rounded-2xl border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                          <BookOpen size={14} className="text-indigo-400"/> 
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{moduleCount} Modules</span>
                       </div>
                       <div className="flex-1 flex items-center gap-2.5 bg-slate-50/80 px-4 py-2.5 rounded-2xl border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                          <Clock size={14} className="text-indigo-400"/> 
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{(minutes / 60).toFixed(1)}h Span</span>
                       </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                       <div className="flex items-center gap-2 text-[9px] font-black text-[#000666] uppercase tracking-[0.3em]">
                          Open Classroom <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-slate-100 bg-white px-10 py-32 text-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-indigo-50 text-[#000666] shadow-inner mx-auto animate-bounce">
                <FolderKanban size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-3xl font-serif font-black text-[#000666]">Universal Void Detected</h3>
              <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-slate-400 mx-auto">
                {query ? 'The neural search found no matching knowledge clusters. Adjust your semantic query.' : 'You haven\'t architected any learning paths yet. Initialize your first classroom to begin.'}
              </p>
              {!query && (
                <button
                  onClick={() => navigate('/create')}
                  className="mt-10 inline-flex items-center gap-4 rounded-2xl bg-[#000666] px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-950/20 transition-all hover:scale-[1.05] active:scale-95"
                >
                  Initialize Path Architecture
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
