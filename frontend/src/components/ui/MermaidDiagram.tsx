import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, Minimize2 } from 'lucide-react';

// Global init is removed, will handle dynamically in useEffect

interface Props {
  chart: string;
  activeConcept?: string;
  isZenMode?: boolean;
}

const MermaidDiagram: React.FC<Props> = ({ chart, activeConcept, isZenMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Handle scroll lock during Fullscreen mode to prevent background shifts
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  useEffect(() => {
    let isMounted = true;
    if (containerRef.current && chart) {
      setIsUpdating(true);
      const renderChart = async () => {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
              primaryColor: 'rgba(99, 102, 241, 0.08)',
              primaryTextColor: '#F1F5F9',
              primaryBorderColor: '#818cf8',
              lineColor: '#6366f1',
              secondaryColor: 'rgba(168, 85, 247, 0.08)',
              tertiaryColor: 'transparent',
              nodeBorder: '#818cf8',
              mainBkg: 'rgba(15, 23, 42, 0.8)',
              edgeLabelBackground: 'rgba(10, 15, 30, 0.95)',
              textColor: '#E2E8F0'
            }
          });
          const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (isMounted && containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error("Mermaid error:", err);
          if (isMounted && containerRef.current) {
            containerRef.current.innerHTML = `<div class="p-4 text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50/10 rounded-xl border border-red-500/20">Error rendering diagram</div>`;
          }
        } finally {
          if (isMounted) setTimeout(() => setIsUpdating(false), 1500); // 1.5s sweep animation
        }
      };
      renderChart();
    }
    return () => { isMounted = false; };
  }, [chart]);

  // Breathing Node Sync
  useEffect(() => {
    if (!containerRef.current || !activeConcept) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    // Reset all nodes
    const allNodes = svgEl.querySelectorAll('.node');
    allNodes.forEach(n => n.classList.remove('mermaid-node-breathing'));

    // Find and highlight matching nodes
    const targetTerms = activeConcept.toLowerCase().split(' ').filter(t => t.length > 3);
    if (targetTerms.length === 0) return;

    allNodes.forEach(node => {
      const textContent = node.textContent?.toLowerCase() || '';
      const matches = targetTerms.some(term => textContent.includes(term));
      if (matches) {
        node.classList.add('mermaid-node-breathing');
      }
    });
  }, [activeConcept, chart, isUpdating]);

  return (
    <div 
      className={`flex flex-col overflow-hidden transition-all duration-300 ${
        isFullScreen 
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#05070a]' 
          : 'relative w-full h-full bg-[#0a0f1d] border border-white/5 rounded-xl shadow-inner'
      } ${isUpdating ? 'aurora-sweep' : ''}`}
      style={{
        backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {isFullScreen && (
              <button 
                onClick={() => setIsFullScreen(false)} 
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white text-[#05070a] hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xl select-none border-none hover:scale-105 active:scale-95"
                title="Exit Fullscreen"
              >
                <Minimize2 size={16} />
              </button>
            )}
            <div className="absolute top-4 right-4 flex rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl z-10 overflow-hidden select-none">
              <button 
                onClick={() => setIsFullScreen(prev => !prev)} 
                className="p-2.5 border-r border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer" 
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullScreen ? <Minimize2 size={14}/> : <Maximize size={14}/>}
              </button>
              <button 
                onClick={() => zoomOut()} 
                className="p-2.5 border-r border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer" 
                title="Zoom Out"
              >
                <ZoomOut size={14}/>
              </button>
              <button 
                onClick={() => resetTransform()} 
                className="px-3 text-[9px] font-mono font-black uppercase tracking-[0.25em] text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
              >
                RESET
              </button>
              <button 
                onClick={() => zoomIn()} 
                className="p-2.5 border-l border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer" 
                title="Zoom In"
              >
                <ZoomIn size={14}/>
              </button>
            </div>
            
            <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing glass-edge-blur">
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div ref={containerRef} className="p-10 min-w-full min-h-full flex items-center justify-center transition-opacity duration-500" style={{ opacity: isUpdating ? 0.5 : 1 }} />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default MermaidDiagram;
