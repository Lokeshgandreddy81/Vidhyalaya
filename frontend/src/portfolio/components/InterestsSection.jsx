import React, { useRef, useState, useEffect } from 'react';
import siteConfig from '../config/siteConfig';
import useScrollReveal from '../hooks/useScrollReveal';

const FloatingItem = ({ item, index, total, mousePos }) => {
  const isBuilding = siteConfig.interests.building.includes(item);
  const isLearning = siteConfig.interests.learning.includes(item);

  // Distribute items pseudo-randomly but deterministically
  const seed = index * 137.5;
  const radius = 30 + (index % 3) * 20; // 30% to 70%
  const xPos = 50 + radius * Math.cos(seed * Math.PI / 180);
  const yPos = 50 + radius * Math.sin(seed * Math.PI / 180);

  // Parallax logic based on "depth"
  const depth = 1 + (index % 3); // 1, 2, or 3
  const moveX = mousePos.x * depth * 2;
  const moveY = mousePos.y * depth * 2;

  // Font size varies by depth
  const fontSize = depth === 3 ? 'text-3xl md:text-5xl' : depth === 2 ? 'text-xl md:text-3xl' : 'text-sm md:text-xl';
  const opacity = depth === 3 ? 'opacity-100' : depth === 2 ? 'opacity-60' : 'opacity-30';

  const color = isBuilding ? 'text-blue-200' : isLearning ? 'text-purple-200' : 'text-orange-200';

  return (
    <div
      className={`absolute whitespace-nowrap font-light ${fontSize} ${opacity} pointer-events-none transition-transform duration-[2s] ease-out`}
      style={{
        left: `${xPos}%`,
        top: `${yPos}%`,
        transform: `translate(-50%, -50%) translate3d(${moveX}px, ${moveY}px, 0)`,
        fontFamily: depth > 1 ? 'Cormorant Garamond, serif' : 'system-ui, sans-serif'
      }}
    >
      {item}
    </div>
  );
};

const InterestsSection = () => {
  const [ref, visible] = useScrollReveal({ threshold: 0.1 });
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const allInterests = [
    ...siteConfig.interests.building,
    ...siteConfig.interests.learning,
    ...siteConfig.interests.reading
  ];

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normalize to -1 to 1
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x, y });
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[80vh] w-full border-b section-border overflow-hidden bg-background flex flex-col items-center justify-center p-6"
    >
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] mix-blend-screen transition-transform duration-[3s] ease-out"
          style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] mix-blend-screen transition-transform duration-[3s] ease-out"
          style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}
        />
      </div>

      <div
        ref={ref}
        className="text-center z-10 mb-12 pointer-events-none"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1s cubic-bezier(0.16,1,0.3,1)'
        }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4 block">The Subconscious</span>
        <h2 className="text-4xl md:text-5xl font-light text-foreground" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Nodes of Interest
        </h2>
      </div>

      {/* The Cloud */}
      <div
        className="relative w-full max-w-[1200px] h-[60vh] mx-auto opacity-0 transition-opacity duration-1000 delay-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {allInterests.map((item, index) => (
          <FloatingItem
            key={index}
            item={item}
            index={index}
            total={allInterests.length}
            mousePos={mousePos}
          />
        ))}
      </div>
    </section>
  );
};

export default InterestsSection;