import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import siteConfig from '../config/siteConfig';
import ProjectAccessModal from './ProjectAccessModal';

const ExpandingCard = ({ project, index, isHovered, onHover, onLeave, onOpen }) => {
  return (
    <div
      className={`relative h-[60vh] md:h-[75vh] overflow-hidden rounded-[2rem] md:rounded-[3rem] transition-all duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group bg-[#fdfdfd] dark:bg-black border border-black/5 dark:border-[rgba(255,255,255,0.08)] ${isHovered ? 'flex-[4] md:flex-[5]' : 'flex-[1]'
        }`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      onClick={() => onOpen(project.company)}
    >
      {/* Persistent idle ambient — very subtle indigo tint on dark */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-100 block"
        style={{
          background: 'radial-gradient(ellipse at 50% 120%, rgba(79,70,229,0.15) 0%, rgba(67,56,202,0.06) 50%, transparent 75%)',
        }}
      />
      {/* Dynamic Background Spinning Aura (hover) */}
      <div
        className="absolute inset-[-50%] z-0 rounded-full blur-[50px] opacity-0 transition-opacity duration-1000 mix-blend-screen pointer-events-none group-hover:opacity-[0.35]"
        style={{
          background: 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
          animation: 'spin 15s linear infinite'
        }}
      />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10 pointer-events-none" />

      {/* Massive Vertical Watermark (Visible when collapsed) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 delay-300 ${isHovered ? 'opacity-0' : 'opacity-20'}`}
      >
        <span
          className="text-6xl md:text-8xl font-bold text-black dark:text-white whitespace-nowrap rotate-[-90deg] tracking-tighter mix-blend-difference"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          0{index + 1}
        </span>
      </div>

      {/* Expanded Content overlay */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-12 lg:p-16 w-full h-full bg-gradient-to-t from-white via-white/60 dark:from-black dark:via-black/40 to-transparent transition-opacity duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHovered ? 'opacity-100 delay-300' : 'opacity-0 delay-0 pointer-events-none'}`}
      >
        {/* Top Header Row */}
        <div className="flex justify-between items-start w-full transform transition-transform duration-1000">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase text-black/70 dark:text-white/70">
              System 0{index + 1}
            </span>
            <span className="font-mono text-[10px] md:text-xs tracking-[0.2em] uppercase text-blue-500">
              {project.duration}
            </span>
          </div>

          <div className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase text-black/50 dark:text-white/50 text-right hidden md:block">
            Deployed <br /> Infrastructure
          </div>
        </div>

        {/* Bottom Content Row */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 w-full">

          <div className="flex flex-col max-w-2xl transform transition-transform duration-1000 delay-100 translate-y-0">
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-light text-black dark:text-white tracking-tighter leading-[1.1] mb-6 transition-colors duration-500 hover:text-blue-500 dark:hover:text-blue-200 line-clamp-2"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              {project.title}
            </h2>

            <div className="space-y-4 font-mono text-[10px] md:text-xs leading-relaxed text-black/70 dark:text-white/70 hidden md:block">
              {project.descriptions?.slice(0, 2).map((desc, i) => (
                <p key={i} className="line-clamp-2">{desc}</p>
              ))}
            </div>
          </div>

          <div
            className="shrink-0 flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-full border border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 backdrop-blur-md hover:bg-black dark:hover:bg-white transition-all duration-700"
          >
            <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8 text-black dark:text-white group-hover:text-white dark:group-hover:text-black group-hover:rotate-45 transition-all duration-500" />
          </div>

        </div>
      </div>
    </div>
  );
};

const WorkSection = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleProjectClick = (projectName) => {
    setSelectedProject(projectName);
    setModalOpen(true);
  };

  return (
    <>
      <ProjectAccessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectName={selectedProject}
      />

      <section
        id="work"
        className="w-full bg-white dark:bg-black relative z-40 section-border border-t pt-32 pb-48 transition-colors duration-500 overflow-hidden"
      >
        {/* Dark mode ambient light source at top of section */}
        <div className="absolute inset-x-0 top-0 h-[50vh] pointer-events-none hidden dark:block"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
          }}
        />

        <div className="container mx-auto px-6 md:px-12 max-w-[1600px] mb-16 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div>
              <span className="font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase text-black/40 dark:text-white/40 mb-6 block">
                Selected Works
              </span>
              {/* "The Archive" — crisp white with luminous glow in dark mode */}
              <h2
                className="text-7xl md:text-9xl font-light tracking-tighter leading-none"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                {/* Light mode: crisp black */}
                <span className="block dark:hidden text-black">The Archive</span>
                {/* Dark mode: luminous white with purple glow */}
                <span
                  className="hidden dark:block text-white"
                  style={{
                    textShadow: '0 0 80px rgba(168,85,247,0.4), 0 0 160px rgba(99,102,241,0.2)',
                  }}
                >
                  The Archive
                </span>
              </h2>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-black/40 dark:text-white/40 mb-4 max-w-xs text-right hidden md:block">
              Interact to expand sub-systems.
            </div>
          </div>
        </div>

        {/* Expanding Flex Gallery */}
        <div className="container mx-auto px-4 md:px-12 max-w-[1600px]">
          <div className="flex flex-col md:flex-row w-full gap-4 md:gap-6">
            {siteConfig.workExperiences.map((project, index) => (
              <ExpandingCard
                key={index}
                project={project}
                index={index}
                isHovered={hoveredIndex === index || (hoveredIndex === null && index === 0 && window.innerWidth > 768)} // Default expand first on desktop
                onHover={setHoveredIndex}
                onLeave={() => setHoveredIndex(null)}
                onOpen={handleProjectClick}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default WorkSection;