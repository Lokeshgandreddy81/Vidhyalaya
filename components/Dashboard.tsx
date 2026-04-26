import React from 'react';
import { useAppStore } from '../context/Store';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Clock, Award, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { paths, setActivePath } = useAppStore();
  const navigate = useNavigate();

  const activePaths = paths.filter(p => p.status === 'active');
  const completedPaths = paths.filter(p => p.status === 'completed');
  
  const handleContinue = (id: string) => {
    setActivePath(id);
    navigate(`/path/${id}`);
  };

  // Mock data for chart
  const chartData = [
    { name: 'Mon', hours: 1.5 },
    { name: 'Tue', hours: 2.0 },
    { name: 'Wed', hours: 0.5 },
    { name: 'Thu', hours: 3.0 },
    { name: 'Fri', hours: 1.0 },
    { name: 'Sat', hours: 4.0 },
    { name: 'Sun', hours: 2.5 },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, Scholar</h1>
          <p className="text-slate-500 mt-1 font-medium">You're on a 5-day learning streak. Keep it up!</p>
        </div>
        <Link 
          to="/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 flex items-center justify-center space-x-2"
        >
          <Plus size={20} />
          <span>Start New Journey</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center space-x-5 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Velocity</p>
            <p className="text-2xl font-bold text-slate-800 flex items-baseline">
              +12% <span className="text-xs text-emerald-600 font-medium ml-2 bg-emerald-50 px-2 py-0.5 rounded-full">↑ vs last week</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center space-x-5 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Time Spent</p>
            <p className="text-2xl font-bold text-slate-800 flex items-baseline">
              14.5 <span className="text-sm text-slate-400 font-medium ml-1">hours</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center space-x-5 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
            <Award size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-slate-800 flex items-baseline">
              23 <span className="text-sm text-slate-400 font-medium ml-1">modules</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Courses */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            Active Learning Paths
          </h2>
          <div className="grid gap-6">
            {activePaths.length === 0 ? (
               <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Plus size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 mb-6 font-medium">You don't have any active learning paths.</p>
                  <Link to="/create" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">Create your first path</Link>
               </div>
            ) : (
              activePaths.map(path => (
                <div key={path.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{path.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{path.goal}</p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                      {path.phases.length} Phases
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Progress</span>
                      <span className="text-indigo-600">{path.progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex -space-x-2">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">AI</div>
                       <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">ME</div>
                    </div>
                    <button 
                      onClick={() => handleContinue(path.id)}
                      className="flex items-center space-x-2 text-sm font-bold text-slate-700 group-hover:text-indigo-600 px-4 py-2 rounded-lg transition-colors bg-slate-50 group-hover:bg-indigo-50"
                    >
                      <span>Continue Learning</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-80 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Study Activity</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }} 
                />
                <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
