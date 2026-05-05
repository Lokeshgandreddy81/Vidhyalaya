import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Global init is removed, will handle dynamically in useEffect

interface Props {
  chart: string;
  activeConcept?: string;
  isZenMode?: boolean;
}

const MermaidDiagram: React.FC<Props> = ({ chart, activeConcept, isZenMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (containerRef.current && chart) {
      setIsUpdating(true);
      const renderChart = async () => {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: isZenMode ? 'dark' : 'base',
            themeVariables: isZenMode ? {
              fontFamily: 'inherit',
              primaryColor: 'rgba(99, 102, 241, 0.15)',
              primaryTextColor: '#E2E8F0',
              primaryBorderColor: '#a78bfa',
              lineColor: '#E2E8F0',
              secondaryColor: 'rgba(168, 85, 247, 0.15)',
              tertiaryColor: 'transparent',
              nodeBorder: '#a78bfa',
              mainBkg: 'transparent'
            } : {
              fontFamily: 'inherit',
              primaryColor: '#e0e0ff',
              primaryTextColor: '#000666',
              primaryBorderColor: '#8690ee',
              lineColor: '#00429b',
              secondaryColor: '#f8f9fa',
              tertiaryColor: '#fff',
              nodeBorder: '#8690ee',
              mainBkg: '#e0e0ff'
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
    <div className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-1000 ${isZenMode ? 'bg-black/40 backdrop-blur-[12px]' : 'bg-slate-50/50'} ${isUpdating ? 'aurora-sweep' : ''}`}>
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className={`absolute top-4 right-4 flex rounded-xl shadow-lg border z-10 overflow-hidden transition-colors ${isZenMode ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-white border-slate-200'}`}>
              <button onClick={() => zoomOut()} className={`p-2.5 border-r transition-colors ${isZenMode ? 'text-slate-300 hover:bg-white/10 border-white/10' : 'hover:bg-slate-100 text-[#000666] border-slate-200'}`} title="Zoom Out">
                <ZoomOut size={16}/>
              </button>
              <button onClick={() => resetTransform()} className={`px-3 text-[10px] font-bold transition-colors flex items-center justify-center ${isZenMode ? 'text-slate-300 hover:bg-white/10' : 'text-[#000666] hover:bg-slate-50'}`}>
                RESET
              </button>
              <button onClick={() => zoomIn()} className={`p-2.5 border-l transition-colors ${isZenMode ? 'text-slate-300 hover:bg-white/10 border-white/10' : 'hover:bg-slate-100 text-[#000666] border-slate-200'}`} title="Zoom In">
                <ZoomIn size={16}/>
              </button>
            </div>
            
            <div className={`flex-1 w-full h-full cursor-grab active:cursor-grabbing ${isZenMode ? 'glass-edge-blur' : ''}`}>
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
