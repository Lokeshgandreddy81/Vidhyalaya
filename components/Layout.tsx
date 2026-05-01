import React from 'react';
import { MonitorPlay, GraduationCap, Library, CalendarDays, Settings, FileCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isStudyMode = location.pathname.startsWith('/study/');

  if (isStudyMode) {
    return (
      <div className="flex h-screen bg-[#f8f9fa] text-slate-900 font-sans overflow-hidden">
        {children}
      </div>
    );
  }

  const navItems = [
    { icon: <MonitorPlay size={22} />, label: 'ClassRoom', to: '/' },
    { icon: <GraduationCap size={22} />, label: 'Courses', to: '/courses' },
    { icon: <Library size={22} />, label: 'Library', to: '/library' },
    { icon: <CalendarDays size={22} />, label: 'Schedule', to: '/schedule' },
    { icon: <FileCheck size={22} />, label: 'Exam Mode', to: '/exam' },
    { icon: <Settings size={22} />, label: 'Settings', to: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden relative">
      {/* Global Left Navigation Sidebar - Hover Trigger Container */}
      <div className="group fixed left-0 top-0 bottom-0 z-40 flex">
        <aside className="h-screen w-1 group-hover:w-[200px] bg-slate-50 group-hover:bg-white py-5 shrink-0 transition-all duration-300 ease-in-out overflow-hidden relative before:content-[''] before:absolute before:right-0 before:top-5 before:bottom-5 before:w-px before:bg-slate-200 group-hover:shadow-2xl">
          <div className="px-4 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <Link to="/" className="block group/logo">
              <div className="flex flex-col">
                <span className="text-[16px] font-black text-[#000666] tracking-[0.25em] uppercase leading-none">Vidhyalaya</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-[1px] w-4 bg-indigo-500/30" />
                  <span className="text-[8px] font-black text-indigo-500/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap">Learning Platform</span>
                </div>
              </div>
            </Link>
          </div>
          
          <nav className="flex-1 space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || 
                              (item.to === '/courses' && location.pathname.startsWith('/path/')) ||
                              (item.to === '/courses' && location.pathname === '/create');
              return (
                <button
                  key={item.label}
                  onClick={() => item.to && navigate(item.to)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 w-full text-left
                    ${isActive
                      ? 'text-indigo-700 bg-indigo-50/50 border-r-[3px] border-indigo-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                >
                  {item.icon}
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white ml-1">
        {children}
      </main>

      {/* Global Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-100 flex items-center justify-around z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <button key={item.label} onClick={() => navigate(item.to)} className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
              {item.icon}
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;