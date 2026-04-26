import React from 'react';
import { BookOpen, LayoutDashboard, PlusCircle, Settings, LogOut, GraduationCap, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isStudyMode = location.pathname.startsWith('/study/');

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar - Enhanced with deep blue/purple accents */}
      <aside className={`w-72 bg-white border-r border-indigo-50 flex-col hidden md:flex z-10 shadow-xl shadow-slate-200/50`}>
        <Link to="/" className="p-8 pb-10 flex items-center space-x-4 group cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
            <GraduationCap size={28} />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-transparent">
            Vidyal.ai
          </span>
        </Link>

        <nav className="flex-1 px-5 space-y-2 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all duration-300 font-bold ${
              isActive('/') 
                ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={20} className={isActive('/') ? "text-indigo-600" : "text-slate-300"} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/create"
            className={`flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all duration-300 font-bold ${
              isActive('/create') 
                ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <PlusCircle size={20} className={isActive('/create') ? "text-indigo-600" : "text-slate-300"} />
            <span>New Path</span>
          </Link>

          <div className="pt-10 pb-4 px-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">
            Your Library
          </div>
          
          <div className="space-y-1">
             <div className="flex items-center space-x-4 px-5 py-3 text-sm font-bold text-slate-500 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-xl cursor-pointer transition-all group">
                <div className="w-2 h-2 rounded-full bg-indigo-100 group-hover:bg-indigo-400 group-hover:scale-125 transition-all"></div>
                <span className="truncate">Python for Data Science</span>
             </div>
             <div className="flex items-center space-x-4 px-5 py-3 text-sm font-bold text-slate-500 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-xl cursor-pointer transition-all group">
                <div className="w-2 h-2 rounded-full bg-indigo-100 group-hover:bg-indigo-400 group-hover:scale-125 transition-all"></div>
                <span className="truncate">React Advanced Patterns</span>
             </div>
          </div>
        </nav>

        <div className="p-5 border-t border-slate-50">
          <Link to="/settings" className={`flex items-center space-x-3 px-5 py-4 w-full rounded-2xl transition-all duration-300 font-bold ${isActive('/settings') ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Settings size={20} className={isActive('/settings') ? "text-indigo-600" : "text-slate-300"} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white">
        {!isStudyMode && (
            <header className="md:hidden bg-white border-b border-indigo-50 p-5 flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <GraduationCap size={22} />
                </div>
                <span className="font-black text-slate-900 text-xl tracking-tighter">Vidyal.ai</span>
            </Link>
            </header>
        )}

        <div className={`flex-1 ${isStudyMode ? 'overflow-hidden' : 'overflow-y-auto scroll-smooth bg-[#F8FAFC]'}`}>
          <div className={isStudyMode ? 'h-full' : 'max-w-[1400px] mx-auto p-5 md:p-10 pb-24'}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;