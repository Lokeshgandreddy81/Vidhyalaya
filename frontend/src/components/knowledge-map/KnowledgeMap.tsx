import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader, Map as MapIcon } from 'lucide-react';
import { generateKnowledgeGraph } from '../../services/geminiService';
import {
  KnowledgeGraph,
  KnowledgeNode,
  MapViewMode,
  MasteryStatus,
} from '../../types';
import { validateAndNormalizeGraph, legacyConceptMapToGraph } from './graphValidator';
import { computeLayout, getViewBox } from './computeLayout';
import { MapCanvas } from './MapCanvas';
import { MapInspector } from './MapInspector';
import { MapControls } from './MapControls';

export interface KnowledgeMapProps {
  moduleTitle: string;
  moduleContent?: string | null;
  keyConcepts?: string[];
  initialGraph?: KnowledgeGraph;
  storedGraph?: KnowledgeGraph;
  nodeMastery?: Record<string, MasteryStatus>;
  pathId?: string;
  phaseId?: string;
  moduleId?: string;
  isZenMode?: boolean;
  onGraphGenerated?: (graph: KnowledgeGraph) => void;
  onMasteryChange?: (nodeId: string, status: MasteryStatus) => void;
  onAskAI?: (node: KnowledgeNode) => void;
  onNavigateModule?: (moduleId: string) => void;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({
  moduleTitle,
  moduleContent,
  keyConcepts = [],
  initialGraph,
  storedGraph,
  nodeMastery: externalMastery = {},
  pathId,
  phaseId,
  moduleId,
  isZenMode = false,
  onGraphGenerated,
  onMasteryChange,
  onAskAI,
  onNavigateModule,
}) => {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(
    storedGraph || initialGraph || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>('tree');
  const [search, setSearch] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localMastery, setLocalMastery] = useState<Record<string, MasteryStatus>>(externalMastery);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const generationRef = useRef(0);

  const nodeMastery = { ...externalMastery, ...localMastery };

  useEffect(() => {
    setLocalMastery(externalMastery);
  }, [externalMastery, moduleId]);

  useEffect(() => {
    if (storedGraph) {
      setGraph(storedGraph);
      return;
    }
    if (initialGraph) {
      setGraph(initialGraph);
      return;
    }
    setGraph(null);
  }, [storedGraph, initialGraph, moduleId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buildGraph = useCallback(async (force = false) => {
    if (!force && graph && !moduleContent) return;
    const gen = ++generationRef.current;
    setIsLoading(true);
    try {
      let next: KnowledgeGraph;
      if (initialGraph && !moduleContent && !force) {
        next = initialGraph;
      } else {
        next = await generateKnowledgeGraph(
          moduleTitle,
          keyConcepts,
          moduleContent || '',
          moduleId,
        );
      }
      if (gen !== generationRef.current) return;
      const normalized = validateAndNormalizeGraph(next, moduleTitle, moduleId);
      setGraph(normalized);
      onGraphGenerated?.(normalized);
    } catch (err) {
      console.error('[KnowledgeMap] build failed:', err);
    } finally {
      if (gen === generationRef.current) setIsLoading(false);
    }
  }, [moduleTitle, keyConcepts, moduleContent, moduleId, initialGraph, graph, onGraphGenerated]);

  useEffect(() => {
    if (storedGraph || initialGraph) return;
    if (moduleContent || keyConcepts.length > 0) {
      buildGraph();
    }
  }, [moduleId, moduleTitle]);

  const selectedNode = useMemo(
    () => graph?.nodes.find(n => n.id === selectedId) ?? null,
    [graph, selectedId],
  );

  const highlightedId = useMemo(() => {
    if (!search.trim() || !graph) return null;
    const q = search.toLowerCase();
    const match = graph.nodes.find(n =>
      n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    );
    return match?.id ?? null;
  }, [search, graph]);

  const layout = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return computeLayout(graph, viewMode, dimensions.width, dimensions.height);
  }, [graph, viewMode, dimensions]);

  const viewBox = useMemo(() => getViewBox(layout.nodes), [layout.nodes]);

  const learningSpine = useMemo(() => {
    if (!graph || graph.learningPath.length === 0) return null;
    const nextId = graph.learningPath.find(id => nodeMastery[id] !== 'mastered' && nodeMastery[id] !== 'understood') || graph.learningPath[0];
    const nextNode = graph.nodes.find(n => n.id === nextId);
    const masteredCount = graph.nodes.filter(n => n.level > 0 && (nodeMastery[n.id] === 'mastered' || nodeMastery[n.id] === 'understood')).length;
    const total = graph.nodes.filter(n => n.level > 0).length;
    const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    return { nextNode, pct };
  }, [graph, nodeMastery]);

  const handleMasteryChange = (nodeId: string, status: MasteryStatus) => {
    setLocalMastery(prev => ({ ...prev, [nodeId]: status }));
    onMasteryChange?.(nodeId, status);
  };

  const handleNodeClick = (nodeId: string) => {
    if (graph && initialGraph && onNavigateModule) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node && node.level === 2 && nodeId !== 'root') {
        onNavigateModule(nodeId);
        return;
      }
    }
    setSelectedId(prev => (prev === nodeId ? null : nodeId));
  };

  const surface = isZenMode ? 'bg-[#05070a] text-white' : 'bg-white text-slate-950';
  const muted = isZenMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden ${surface}`}>
      {/* Learning spine */}
      {graph && learningSpine && (
        <div className={`shrink-0 border-b px-4 py-2.5 ${isZenMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/80'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>
                {graph.topic}
              </p>
              {learningSpine.nextNode && (
                <p className={`mt-0.5 truncate text-[11px] font-semibold ${muted}`}>
                  Next: {learningSpine.nextNode.label}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-20 overflow-hidden rounded-full ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${learningSpine.pct}%` }} />
              </div>
              <span className={`text-[10px] font-black ${isZenMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {learningSpine.pct}%
              </span>
            </div>
          </div>
        </div>
      )}

      <MapControls
        search={search}
        viewMode={viewMode}
        showDetails={showDetails}
        isZenMode={isZenMode}
        isLoading={isLoading}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        onToggleDetails={() => setShowDetails(v => !v)}
        onRegenerate={() => buildGraph(true)}
      />

      <div ref={containerRef} className="relative min-h-0 flex-1">
        {isLoading && !graph ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader size={22} className="animate-spin text-indigo-500" />
            <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>
              Building concept map…
            </p>
            <p className={`text-[11px] ${muted}`}>Extracting concepts from your lesson</p>
          </div>
        ) : !graph ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <MapIcon size={32} className={muted} />
            <p className={`text-sm font-black ${isZenMode ? 'text-white' : 'text-slate-900'}`}>No map yet</p>
            <p className={`max-w-xs text-[12px] ${muted}`}>
              Generate a concept map from this module&apos;s content to see how ideas connect.
            </p>
            <button
              onClick={() => buildGraph(true)}
              disabled={isLoading}
              className="rounded-full bg-[#000666] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              Build map
            </button>
          </div>
        ) : (
          <TransformWrapper initialScale={1} minScale={0.4} maxScale={2.5} centerOnInit>
            <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
              <MapCanvas
                nodes={layout.nodes}
                edges={layout.edges}
                viewBox={viewBox}
                selectedId={selectedId}
                highlightedId={highlightedId}
                showDetails={showDetails}
                isZenMode={isZenMode}
                nodeMastery={nodeMastery}
                onNodeClick={handleNodeClick}
              />
            </TransformComponent>
          </TransformWrapper>
        )}

        {selectedNode && graph && (
          <MapInspector
            node={selectedNode}
            graph={graph}
            isZenMode={isZenMode}
            nodeMastery={nodeMastery}
            onClose={() => setSelectedId(null)}
            onMasteryChange={handleMasteryChange}
            onLearnNext={id => setSelectedId(id)}
            onAskAI={onAskAI}
          />
        )}
      </div>
    </div>
  );
};

export { legacyConceptMapToGraph };
export default KnowledgeMap;
