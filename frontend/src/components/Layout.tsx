import React from 'react';
import { MonitorPlay, GraduationCap, Library, CalendarDays, Settings, FileCheck, PanelLeftClose, PanelLeft, Bot } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const isStudyMode = location.pathname.startsWith('/study/');
  const isSmartStudyMode = location.pathname.startsWith('/smart-study');

  if (isStudyMode || isSmartStudyMode) {
    return (
      <div className="fixed inset-0 flex bg-[#f8f9fa] text-slate-900 font-sans overflow-hidden">
        {children}
      </div>
    );
  }

  const navItems = [
    { icon: MonitorPlay, label: 'Classrooms', to: '/dashboard' },
    { icon: GraduationCap, label: 'Courses', to: '/courses' },
    { icon: Library, label: 'Library', to: '/library' },
    { icon: CalendarDays, label: 'Schedule', to: '/schedule' },
    { icon: FileCheck, label: 'Exam Mode', to: '/exam' },
    { icon: Settings, label: 'Settings', to: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden relative">
      {/* Global Left Navigation Sidebar */}
      <aside 
        className={`h-screen bg-slate-50 border-r border-slate-200 py-6 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col relative z-40 ${isCollapsed ? 'w-[84px]' : 'w-[240px]'}`}
      >
        {/* LOGO AREA */}
        <div className={`px-5 mb-10 transition-all duration-500 ${isCollapsed ? 'text-center' : ''}`}>
          <Link to="/dashboard" className="block group/logo">
            {isCollapsed ? (
              <div className="w-10 h-10 bg-[#000666] rounded-xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-900/20">
                <span className="text-xl font-black">V</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[18px] font-black text-[#000666] tracking-[0.25em] uppercase leading-none">Vidhyalaya</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-[1px] w-4 bg-indigo-500/30" />
                  <span className="text-[8px] font-black text-indigo-500/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap">Learning Platform</span>
                </div>
              </div>
            )}
          </Link>
        </div>
        
        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
                            (item.to === '/courses' && (location.pathname.startsWith('/path/') || location.pathname === '/explore' || location.pathname === '/create'));
            return (
              <button
                key={item.label}
                onClick={() => item.to && navigate(item.to)}
                className={`group flex items-center p-3 rounded-2xl transition-all duration-300 w-full text-left relative
                  ${isActive
                    ? 'text-indigo-700 bg-indigo-50/80 shadow-sm font-semibold'
                    : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`}
                >
                <div className={`flex items-center justify-center transition-all duration-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}>
                  <Icon size={22} />
                </div>
                {!isCollapsed && (
                  <span className="text-[14px] font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-500">{item.label}</span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-3 bottom-3 w-1 bg-indigo-700 rounded-l-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* SARA PREMIUM BUTTON */}
        <div className="px-3 pb-4">
          <button
            onClick={() => navigate('/smart-study')}
            className="group flex items-center p-3 rounded-2xl w-full text-left relative bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/50 text-white font-semibold transform hover:scale-105 hover:shadow-indigo-500/70 transition-all duration-300"
          >
            <div className={`flex items-center justify-center transition-all duration-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}>
              <Bot size={22} className="animate-pulse" />
            </div>
            {!isCollapsed && (
              <span className="text-[14px] font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-500">SARA</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-[#000666] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                SARA
              </div>
            )}
          </button>
        </div>

        {/* COLLAPSE TOGGLE */}
        <div className="px-3 pt-6 border-t border-slate-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-3 rounded-2xl text-slate-400 hover:text-[#000666] hover:bg-white transition-all group"
          >
            {isCollapsed ? <PanelLeft size={20} /> : (
              <div className="flex items-center gap-3 w-full">
                <PanelLeftClose size={20} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Collapse</span>
              </div>
            )}
          </button>
        </div>

        {/* USER ROLE BADGE */}
        {!isCollapsed && (
          <div className="mx-4 mt-8 p-4 rounded-2xl bg-[#000666]/5 border border-indigo-100/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#000666] flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Current Protocol</span>
                <span className="text-[11px] font-black text-[#000666] tracking-tight">Lead Architect</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white h-full">
        {children}
      </main>

    </div>
  );
};

export default Layout;
