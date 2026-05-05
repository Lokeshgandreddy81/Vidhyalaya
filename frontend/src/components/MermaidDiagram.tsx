import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
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
    <div className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-1000 ${isZenMode ? 'bg-[#05070a]/40' : 'bg-slate-50/50'} ${isUpdating ? 'aurora-sweep' : ''}`}>
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 right-4 flex bg-white rounded-xl shadow-lg border border-slate-200 z-10 overflow-hidden">
              <button onClick={() => zoomOut()} className="p-2.5 hover:bg-slate-100 text-[#000666] border-r border-slate-200 transition-colors" title="Zoom Out">
                <ZoomOut size={16}/>
              </button>
              <button onClick={() => resetTransform()} className="px-3 text-[10px] font-bold text-[#000666] hover:bg-slate-50 transition-colors flex items-center justify-center">
                RESET
              </button>
              <button onClick={() => zoomIn()} className="p-2.5 hover:bg-slate-100 text-[#000666] border-l border-slate-200 transition-colors" title="Zoom In">
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
