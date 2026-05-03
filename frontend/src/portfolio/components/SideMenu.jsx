import React, { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import ProjectAccessModal from './ProjectAccessModal';

const SideMenu = ({ isOpen, onClose }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  const handleProjectClick = (projectName) => {
    setSelectedProject(projectName);
    setModalOpen(true);
    onClose();
  };

  const mainMenuItems = [
    { label: 'Home', href: '#home', number: '01' },
    { label: "Let's Talk", href: '#contact', number: '02' },
    { label: 'Resume', href: '/resume', external: false, number: '03' }
  ];

  const workMenuItems = [
    { label: 'Sara.ai Platform', projectName: 'Sara.ai', isProject: true },
    { label: 'Autonomous Agent Framework', projectName: 'Autonomous Agent Framework', isProject: true },
    { label: 'Document Intelligence', projectName: 'Document Intelligence', isProject: true },
    { label: 'AI Hiring Platform', projectName: 'AI Hiring Platform', isProject: true },
    { label: 'Technical Blog', href: 'https://lokeshgandreddy.hashnode.dev', external: true }
  ];

  const handleMenuItemClick = (href, isExternal, isInternalRoute) => {
    if (!isExternal && href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(onClose, 800);
    } else if (isInternalRoute) {
      setTimeout(onClose, 800);
    }
  };

  return (
    <>
      <ProjectAccessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectName={selectedProject}
      />

      {/* Cinematic Full-Screen Takeover */}
      <div
        className={`fixed inset-0 z-[100] transition-transform duration-1000 ease-[cubic-bezier(0.85,0,0.15,1)] flex flex-col ${isOpen ? 'translate-y-0' : '-translate-y-full'
          } bg-[#020202] text-white overflow-hidden`}
      >
        {/* Background Ambient Noise */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        />

        {/* Top Header */}
        <div className="w-full flex justify-between items-center p-6 md:p-12 relative z-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">Navigation Sequence</span>

          <button
            onClick={onClose}
            className="group flex items-center gap-4 hover:opacity-70 transition-opacity"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">Close</span>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden group-hover:bg-white group-hover:border-white transition-colors duration-500">
              <X className="w-4 h-4 group-hover:text-black group-hover:rotate-90 transition-all duration-500" />
            </div>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row w-full h-full relative z-10">

          {/* Left Column: Primary Links */}
          <div className="w-full lg:w-[60%] h-full flex flex-col justify-center px-6 md:px-24">
            <nav className="flex flex-col gap-4 md:gap-8">
              {mainMenuItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  onClick={(e) => {
                    const isInternalRoute = !item.external && item.href.startsWith('/');
                    const isAnchorLink = !item.external && item.href.startsWith('#');
                    if (isAnchorLink) {
                      e.preventDefault();
                      handleMenuItemClick(item.href, false, false);
                    } else if (isInternalRoute) {
                      handleMenuItemClick(item.href, false, true);
                    }
                  }}
                  target={item.external ? '_blank' : '_self'}
                  rel={item.external ? 'noopener noreferrer' : ''}
                  className="group flex items-baseline gap-8 hover:translate-x-4 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(40px)',
                    transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + index * 0.1}s`
                  }}
                >
                  <span className="font-mono text-sm opacity-20 group-hover:opacity-100 transition-opacity duration-500">{item.number}</span>
                  <span
                    className="text-5xl md:text-7xl lg:text-8xl font-light text-white/50 group-hover:text-white transition-colors duration-500"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    {item.label}
                  </span>
                </a>
              ))}
            </nav>
          </div>

          {/* Right Column: Work Archives */}
          <div className="w-full lg:w-[40%] h-full flex flex-col justify-center bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-white/5 p-6 md:p-24 mt-12 lg:mt-0">
            <h3
              className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 mb-12"
              style={{
                opacity: isOpen ? 0.4 : 0,
                transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s'
              }}
            >
              The Archives
            </h3>

            <nav className="flex flex-col gap-6">
              {workMenuItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                    transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.6 + index * 0.1}s`
                  }}
                >
                  {item.isProject ? (
                    <button
                      onClick={() => handleProjectClick(item.projectName)}
                      className="group flex items-center justify-between w-full text-left"
                    >
                      <span className="text-xl md:text-2xl font-light text-white/50 group-hover:text-white transition-colors duration-500" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {item.label}
                      </span>
                      <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : '_self'}
                      rel={item.external ? 'noopener noreferrer' : ''}
                      className="group flex items-center justify-between w-full text-left"
                    >
                      <span className="text-xl md:text-2xl font-light text-white/50 group-hover:text-white transition-colors duration-500" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {item.label}
                      </span>
                      <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
                    </a>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideMenu;