import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { 
  CheckCircle2, Clock, ChevronRight, Lock, BookOpen, Award, 
  Play, Sparkles, Layout, GraduationCap, ArrowLeft,
  Zap, Flag, Target
} from 'lucide-react';
import { StudyModule } from '../types';

const PathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths } = useAppStore();
  
  const path = paths.find(p => p.id === id);

  if (!path) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 shadow-inner">
        <Layout size={40} className="text-slate-300" />
      </div>
      <p className="text-slate-500 font-bold text-xl">Journey not found</p>
      <Link to="/" className="text-indigo-600 font-black flex items-center hover:underline">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>
    </div>
  );

  const isModuleLocked = (module: StudyModule) => {
    if (!module.dependsOnModuleIds || module.dependsOnModuleIds.length === 0) return false;
    const allModules = path.phases.flatMap(p => p.modules);
    return module.dependsOnModuleIds.some(depId => {
      const depModule = allModules.find(m => m.id === depId);
      return depModule && !depModule.isCompleted;
    });
  };

  const completedModules = path.phases.reduce((acc, ph) => acc + ph.modules.filter(m => m.isCompleted).length, 0);
  const totalModules = path.phases.reduce((acc, ph) => acc + ph.modules.length, 0);

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-fade-in px-4">
      {/* Header Card */}
      <div className="relative mb-16">
        <div className="absolute inset-0 blue-purple-gradient blur-3xl opacity-[0.05] rounded-full"></div>
        <div className="relative bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl shadow-indigo-100/30 border border-white/50">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-32 h-32 blue-purple-gradient rounded-[2rem] flex items-center justify-center text-white shadow-2xl shrink-0">
               <GraduationCap size={64} strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                <Link to="/" className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-slate-50 rounded-xl">
                  <ArrowLeft size={20} />
                </Link>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  <Sparkles size={14} className="inline mr-2" /> Intelligence Path
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{path.title}</h1>
              <p className="text-slate-500 text-lg font-medium max-w-2xl">{path.goal}</p>
            </div>
            <div className="shrink-0 flex flex-col items-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
               <div className="text-4xl font-black text-indigo-600 mb-2">{path.progress}%</div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Mastery Level</div>
               <button 
                onClick={() => {
                  const next = path.phases.flatMap(ph => ph.modules).find(m => !m.isCompleted) || path.phases[0].modules[0];
                  const phase = path.phases.find(p => p.modules.some(m => m.id === next.id));
                  if (phase) navigate(`/study/${path.id}/${phase.id}/${next.id}`);
                }}
                className="px-8 py-3 blue-purple-gradient text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
               >
                 Resume Learning
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-20 relative px-4">
        <div className="absolute left-12 top-0 bottom-0 w-1 bg-indigo-50 rounded-full"></div>
        {path.phases.map((phase, pIdx) => (
          <div key={phase.id} className="relative pl-24 animate-fade-in">
            <div className="absolute left-0 top-0 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-indigo-50 z-10 text-indigo-600 font-black text-xl">
              {pIdx + 1}
            </div>
            <div className="mb-10">
               <h2 className="text-2xl font-black text-slate-900 mb-1">{phase.title}</h2>
               <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">{phase.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {phase.modules.map((module) => {
                 const locked = isModuleLocked(module);
                 const isNext = !locked && !module.isCompleted;
                 return (
                   <div
                    key={module.id}
                    onClick={() => !locked && navigate(`/study/${path.id}/${phase.id}/${module.id}`)}
                    className={`p-6 rounded-[2.5rem] border-2 transition-all group flex flex-col cursor-pointer ${
                      locked ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' :
                      module.isCompleted ? 'bg-emerald-50/20 border-emerald-100' :
                      isNext ? 'bg-white border-indigo-600 shadow-xl scale-[1.02]' : 'bg-white border-slate-100'
                    }`}
                   >
                     <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          locked ? 'bg-slate-200 text-slate-400' :
                          module.isCompleted ? 'bg-emerald-500 text-white shadow-lg' :
                          isNext ? 'blue-purple-gradient text-white shadow-xl' : 'bg-indigo-50 text-indigo-400'
                        }`}>
                          {locked ? <Lock size={20}/> : module.isCompleted ? <CheckCircle2 size={24}/> : <Play size={24} fill="currentColor"/>}
                        </div>
                        {isNext && <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Up Next</span>}
                     </div>
                     <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-4">{module.title}</h3>
                     <div className="mt-auto pt-4 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest space-x-4">
                        <span className="flex items-center"><Clock size={14} className="mr-1.5 text-indigo-400" /> {module.estimatedMinutes}m</span>
                        <span className="flex items-center"><BookOpen size={14} className="mr-1.5 text-indigo-400" /> {module.keyConcepts.length} concepts</span>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PathDetail;