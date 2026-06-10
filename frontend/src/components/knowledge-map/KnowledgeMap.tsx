import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { generateKnowledgeGraph } from '../../services/geminiService';
import {
  KnowledgeGraph,
  KnowledgeNode,
  MapViewMode,
  MasteryStatus,
} from '../../types';
import {
  validateAndNormalizeGraph,
  legacyConceptMapToGraph,
  buildFallbackGraph,
  isWeakKnowledgeGraph,
} from './graphValidator';
import { computeLayout, getViewBox } from './computeLayout';
import { MapCanvas } from './MapCanvas';
import { MapInspector } from './MapInspector';
import { MapControls } from './MapControls';
import './NeuralMap.css';

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
  studyLens?: string;
  scholarPersona?: string;
  cognitiveDensity?: string;
  goalContext?: string;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({
  moduleTitle,
  moduleContent,
  keyConcepts = [],
  initialGraph,
  storedGraph,
  nodeMastery: externalMastery = {},
  moduleId,
  isZenMode = false,
  onGraphGenerated,
  onMasteryChange,
  onAskAI,
  onNavigateModule,
  studyLens = 'roadmap',
  scholarPersona = 'visionary',
  cognitiveDensity = 'overview',
  goalContext = '',
}) => {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(
    storedGraph || initialGraph || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>('tree');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [localMastery, setLocalMastery] = useState<Record<string, MasteryStatus>>(externalMastery);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const generationRef = useRef(0);

  const [showCommandStrip, setShowCommandStrip] = useState(true);
  const stripTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetStripTimeout = useCallback(() => {
    setShowCommandStrip(true);
    if (stripTimeoutRef.current) {
      clearTimeout(stripTimeoutRef.current);
    }
    stripTimeoutRef.current = setTimeout(() => {
      setShowCommandStrip(false);
    }, 3000);
  }, []);

  const handleCanvasPointerLeave = useCallback(() => {
    if (stripTimeoutRef.current) {
      clearTimeout(stripTimeoutRef.current);
    }
    stripTimeoutRef.current = setTimeout(() => {
      setShowCommandStrip(false);
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (stripTimeoutRef.current) {
        clearTimeout(stripTimeoutRef.current);
      }
    };
  }, []);

  const nodeMastery = { ...externalMastery, ...localMastery };

  useEffect(() => {
    setLocalMastery(externalMastery);
  }, [externalMastery, moduleId]);

  useEffect(() => {
    if (storedGraph && !isWeakKnowledgeGraph(storedGraph)) {
      setGraph(storedGraph);
      return;
    }
    if (initialGraph && !isWeakKnowledgeGraph(initialGraph)) {
      setGraph(initialGraph);
      return;
    }
    if (storedGraph || initialGraph) {
      setGraph(storedGraph || initialGraph || null);
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
    const existing = storedGraph || initialGraph || graph;
    const shouldUpgrade = force || !existing || isWeakKnowledgeGraph(existing);
    if (!shouldUpgrade && graph && !moduleContent) return;

    const gen = ++generationRef.current;
    setIsLoading(true);

    try {
      const next = await generateKnowledgeGraph(
        moduleTitle,
        keyConcepts,
        moduleContent || '',
        moduleId,
        studyLens,
        scholarPersona,
        cognitiveDensity,
        goalContext
      );
      if (gen !== generationRef.current) return;
      const normalized = validateAndNormalizeGraph(next, moduleTitle, moduleId);
      if (!isWeakKnowledgeGraph(normalized)) {
        setGraph(normalized);
        onGraphGenerated?.(normalized);
      } else if (!graph) {
        setGraph(buildFallbackGraph(
          moduleTitle,
          keyConcepts.length ? keyConcepts : [moduleTitle],
          moduleId,
        ));
      }
    } catch (err) {
      console.error('[KnowledgeMap] build failed:', err);
      if (gen === generationRef.current && !graph) {
        setGraph(buildFallbackGraph(
          moduleTitle,
          keyConcepts.length ? keyConcepts : [moduleTitle],
          moduleId,
        ));
      }
    } finally {
      if (gen === generationRef.current) setIsLoading(false);
    }
  }, [moduleTitle, keyConcepts, moduleContent, moduleId, initialGraph, graph, storedGraph, onGraphGenerated]);

  useEffect(() => {
    const existing = storedGraph || initialGraph;
    const isLegacy = existing && keyConcepts.length > 0 && !keyConcepts.some(concept =>
      existing.nodes.some(n => n.level === 1 && (n.label.toLowerCase().includes(concept.toLowerCase()) || concept.toLowerCase().includes(n.label.toLowerCase())))
    );
    const needsUpgrade = !existing || isWeakKnowledgeGraph(existing) || !!isLegacy;
    if (!needsUpgrade) return;
    if (moduleContent || keyConcepts.length > 0) {
      buildGraph(!!existing);
    }
  }, [moduleId, moduleTitle]);

  const selectedNode = useMemo(
    () => graph?.nodes.find(n => n.id === selectedId) ?? null,
    [graph, selectedId],
  );

  const layout = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return computeLayout(graph, viewMode, dimensions.width, dimensions.height);
  }, [graph, viewMode, dimensions]);

  const masteryPct = useMemo(() => {
    if (!graph) return 0;
    const learnable = graph.nodes.filter(n => n.level > 0);
    if (!learnable.length) return 0;
    const done = learnable.filter(
      n => nodeMastery[n.id] === 'mastered' || nodeMastery[n.id] === 'understood',
    ).length;
    return Math.round((done / learnable.length) * 100);
  }, [graph, nodeMastery]);

  const pathNodes = useMemo(() => {
    if (!graph) return [];
    return graph.learningPath
      .map(id => graph.nodes.find(n => n.id === id))
      .filter((n): n is KnowledgeNode => Boolean(n && n.level > 0));
  }, [graph]);

  const viewBox = useMemo(() => getViewBox(layout.nodes, {
    top: 132,
    right: 92,
    bottom: pathNodes.length > 1 ? 218 : 142,
    left: 92,
  }), [layout.nodes, pathNodes.length]);

  const graphStats = useMemo(() => ({
    nodes: graph?.nodes.length ?? 0,
    links: graph?.edges.length ?? 0,
    path: pathNodes.length,
  }), [graph, pathNodes.length]);

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

  const rootClass = isZenMode ? 'nm-root' : 'nm-root nm-root--light';

  return (
    <div className={rootClass}>
      <div 
        ref={containerRef} 
        className="nm-canvas"
        onPointerMove={resetStripTimeout}
        onPointerLeave={handleCanvasPointerLeave}
      >
        <div className="nm-stars" aria-hidden />
        <div className="nm-aurora-blob nm-aurora-blob--1" aria-hidden />
        <div className="nm-aurora-blob nm-aurora-blob--2" aria-hidden />
        <div className="nm-aurora-blob nm-aurora-blob--3" aria-hidden />

        <header className={`nm-command-strip ${showCommandStrip ? '' : 'nm-command-strip--hidden'}`}>
          <div className="nm-command-copy">
            <span>Neural Board</span>
            <strong>{graph?.topic || moduleTitle}</strong>
          </div>
          <div className="nm-command-stats" aria-label="Knowledge map status">
            <span>{graphStats.nodes} concepts</span>
            <span>{graphStats.links} links</span>
            <span>{masteryPct}% mastery</span>
          </div>
        </header>

        {isLoading && !graph ? (
          <div className="nm-center">
            <div className="nm-orbit-loader" />
          </div>
        ) : !graph ? (
          <div className="nm-center">
            <button type="button" onClick={() => buildGraph(true)} disabled={isLoading} className="nm-gen-btn">
              Build knowledge map
            </button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="nm-updating">
                <div className="nm-orbit-loader" style={{ width: 14, height: 14 }} />
                Syncing
              </div>
            )}

            {masteryPct > 0 && (
              <div className="nm-mastery-badge" aria-label={`${masteryPct}% mastered`}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${(masteryPct / 100) * 50} 50`} transform="rotate(-90 10 10)" />
                </svg>
                {masteryPct}%
              </div>
            )}

            <TransformWrapper
              initialScale={1.05}
              minScale={0.35}
              maxScale={3.2}
              centerOnInit
              limitToBounds={false}
              wheel={{ step: 0.06 }}
              doubleClick={{ mode: 'zoomIn', step: 0.65 }}
            >
              <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
                <MapCanvas
                  nodes={layout.nodes}
                  edges={layout.edges}
                  viewBox={viewBox}
                  viewMode={viewMode}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  isZenMode={isZenMode}
                  nodeMastery={nodeMastery}
                  onNodeClick={handleNodeClick}
                />
              </TransformComponent>
            </TransformWrapper>

            {pathNodes.length > 1 && !selectedNode && (
              <div className="nm-path-rail">
                {pathNodes.map(node => {
                  const m = nodeMastery[node.id];
                  const isDone = m === 'mastered' || m === 'understood';
                  const isActive = selectedId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleNodeClick(node.id)}
                      className={`nm-path-pill ${isActive ? 'nm-path-pill--active' : ''} ${isDone ? 'nm-path-pill--done' : ''}`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            )}

            <MapControls
              viewMode={viewMode}
              isLoading={isLoading}
              onViewModeChange={setViewMode}
              onRegenerate={() => buildGraph(true)}
            />
          </>
        )}

        {selectedNode && graph && (
          <MapInspector
            node={selectedNode}
            graph={graph}
            isZenMode={isZenMode}
            nodeMastery={nodeMastery}
            onClose={() => setSelectedId(null)}
            onMasteryChange={handleMasteryChange}
            onAskAI={onAskAI}
          />
        )}
      </div>
    </div>
  );
};

export { legacyConceptMapToGraph };
export default KnowledgeMap;
