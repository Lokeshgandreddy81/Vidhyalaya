import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  BrainCircuit, Network, GitBranch, Map as MapIcon, Layers,
  Target, Lightbulb, ChevronDown, Plus, Minus, RotateCcw, RefreshCw, Check,
  Sparkles, Loader, Eye, X, Activity, Compass, Clock, AlertTriangle,
  Route, Workflow, Columns3, ListChecks, PanelLeftClose
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { chatWithTutor, generateConceptMap, listModels } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../context/Store';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ConceptNode {
  id: string;
  label: string;
  description: string;
  depth: number;
  parentId?: string;
  children?: string[];
  connections?: string[];
}

export interface ConceptMap {
  centralConcept: string;
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
}

export type VisualMode = 'mindmap' | 'hierarchy' | 'network' | 'flow' | 'tree' | 'radial' | 'nexus' | 'architect' | 'chronos' | 'ladder' | 'matrix' | 'checklist';
export type ComplexityLevel = 'snapshot' | 'overview' | 'detailed' | 'deep' | 'mastery';
export type StudyLens = 'roadmap' | 'foundations' | 'practice' | 'exam' | 'pitfalls';

interface NeuralSynthesizerProps {
  moduleTitle: string;
  moduleContent: string | null;
  keyConcepts: string[];
  generatedContent?: string;
  initialMap?: ConceptMap;
  onNodeClick?: (node: ConceptNode) => void;
  onFullScreenToggle?: () => void;
  isFullScreen?: boolean;
  focusMode?: 'content' | 'split';
  isZenMode?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

const VISUAL_MODES: Array<{ id: VisualMode; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'mindmap', label: 'Mind Map', icon: <BrainCircuit size={15} />, description: 'Radial concept mapping' },
  { id: 'hierarchy', label: 'Hierarchy', icon: <Layers size={15} />, description: 'Tree structure' },
  { id: 'network', label: 'Network', icon: <Network size={15} />, description: 'Interconnected web' },
  { id: 'flow', label: 'Flow', icon: <GitBranch size={15} />, description: 'Sequential process' },
  { id: 'tree', label: 'Tree', icon: <MapIcon size={15} />, description: 'Branching knowledge' },
  { id: 'radial', label: 'Radial', icon: <Target size={15} />, description: 'Concentric circles' },
  { id: 'nexus', label: 'Nexus', icon: <Activity size={15} />, description: 'High-density web' },
  { id: 'architect', label: 'Architect', icon: <Compass size={15} />, description: 'Structural blueprint' },
  { id: 'chronos', label: 'Chronos', icon: <Clock size={15} />, description: 'Timeline sequence' },
  { id: 'ladder', label: 'Ladder', icon: <Route size={15} />, description: 'Step-by-step climb' },
  { id: 'matrix', label: 'Matrix', icon: <Columns3 size={15} />, description: 'Concept comparison grid' },
  { id: 'checklist', label: 'Checklist', icon: <ListChecks size={15} />, description: 'Mastery checkpoints' },
];

const COMPLEXITY_LEVELS: Array<{ id: ComplexityLevel; label: string; nodes: string }> = [
  { id: 'snapshot', label: 'Snapshot', nodes: '3-5 concepts' },
  { id: 'overview', label: 'Overview', nodes: '6-8 concepts' },
  { id: 'detailed', label: 'Detailed', nodes: '12-16 concepts' },
  { id: 'deep', label: 'Deep Dive', nodes: '20-26 concepts' },
  { id: 'mastery', label: 'Mastery', nodes: '28-34 concepts' },
];

const STUDY_LENSES: Array<{ id: StudyLens; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'roadmap', label: 'Roadmap', icon: <Compass size={15} />, description: 'Learn in sequence' },
  { id: 'foundations', label: 'Foundations', icon: <Lightbulb size={15} />, description: 'Strengthen basics' },
  { id: 'practice', label: 'Practice', icon: <Activity size={15} />, description: 'Build through drills' },
  { id: 'exam', label: 'Exam Prep', icon: <Target size={15} />, description: 'Revise high-yield ideas' },
  { id: 'pitfalls', label: 'Pitfalls', icon: <AlertTriangle size={15} />, description: 'Avoid common traps' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT MAP RENDERER
// ─────────────────────────────────────────────────────────────────────────────

const NODE_COLORS = [
  { fill: '#000666', stroke: '#000666', text: '#fff' },     // Level 0: Foundation
  { fill: '#f8fafc', stroke: '#cbd5e1', text: '#0f172a' }, // Level 1: Core Concepts
  { fill: '#ffffff', stroke: '#e2e8f0', text: '#64748b' }, // Level 2: Derivatives
  { fill: '#ffffff', stroke: '#f1f5f9', text: '#94a3b8' }, // Level 3: Details
  { fill: '#ffffff', stroke: '#f8fafc', text: '#cbd5e1' }, // Level 4+: Nuance
];

const ZEN_NODE_COLORS = [
  { fill: '#6366f1', stroke: '#6366f1', text: '#fff' },     // Level 0: Foundation
  { fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(99,102,241,0.3)', text: '#e2e8f0' }, // Level 1: Core Concepts
  { fill: 'transparent', stroke: 'rgba(255,255,255,0.1)', text: '#94a3b8' }, // Level 2: Derivatives
  { fill: 'transparent', stroke: 'rgba(255,255,255,0.05)', text: '#64748b' }, // Level 3: Details
  { fill: 'transparent', stroke: 'rgba(255,255,255,0.03)', text: '#475569' }, // Level 4+: Nuance
];

type Point = { x: number; y: number };
type NodeMetrics = { width: number; height: number; radius: number; fontSize: number; lineHeight: number; lines: string[] };
type LayoutGraph = {
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
  rootId: string;
  childMap: Map<string, string[]>;
};

const MAP_PADDING = 140;

function wrapLabel(label: string, maxChars: number, maxLines: number): string[] {
  const words = label.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const lines: string[] = [];

  const pushWordChunks = (word: string) => {
    for (let i = 0; i < word.length; i += maxChars) {
      lines.push(word.slice(i, i + maxChars));
    }
  };

  for (const word of words) {
    if (word.length > maxChars) {
      pushWordChunks(word);
      continue;
    }

    const current = lines[lines.length - 1];
    if (!current || `${current} ${word}`.length > maxChars) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = `${visible[maxLines - 1].replace(/\.*$/, '')}...`;
    return visible;
  }

  return lines.length > 0 ? lines : ['CONCEPT'];
}

function getNodeMetrics(node: ConceptNode): NodeMetrics {
  const isCentral = node.depth === 0;
  const label = (node.label || 'Concept').toUpperCase();
  const lines = wrapLabel(label, isCentral ? 22 : 18, isCentral ? 4 : 3);
  const longest = Math.max(...lines.map(line => line.length));
  const fontSize = isCentral ? 18 : 13;
  const lineHeight = isCentral ? 22 : 17;
  const width = Math.min(
    Math.max(longest * (isCentral ? 12 : 9) + (isCentral ? 90 : 60), isCentral ? 320 : 180),
    isCentral ? 580 : 420
  );
  const height = Math.max(lines.length * lineHeight + (isCentral ? 42 : 32), isCentral ? 84 : 58);

  return { width, height, radius: height / 2, fontSize, lineHeight, lines };
}

function buildLayoutGraph(conceptMap: ConceptMap): LayoutGraph {
  const rawNodes = conceptMap.nodes?.length
    ? conceptMap.nodes
    : [{ id: 'root', label: conceptMap.centralConcept || 'Concept Map', description: '', depth: 0 }];

  const seen = new Set<string>();
  const nodes = rawNodes.map((node, index) => {
    const rawId = String(node.id || `node-${index}`);
    const id = seen.has(rawId) ? `${rawId}-${index}` : rawId;
    seen.add(id);

    return {
      ...node,
      id,
      label: node.label || node.description || `Concept ${index + 1}`,
      depth: Number.isFinite(node.depth) ? Math.max(0, Math.round(node.depth)) : index === 0 ? 0 : 1,
    };
  });

  const root = nodes.find(node => node.depth === 0) ?? nodes[0];
  root.depth = 0;

  const nodeIds = new Set(nodes.map(node => node.id));
  const parentById = new Map<string, string>();

  (conceptMap.relationships || []).forEach(rel => {
    if (nodeIds.has(rel.from) && nodeIds.has(rel.to) && rel.to !== root.id && rel.from !== rel.to) {
      parentById.set(rel.to, rel.from);
    }
  });

  nodes
    .filter(node => node.id !== root.id)
    .sort((a, b) => a.depth - b.depth)
    .forEach(node => {
      const explicitParent = node.parentId && nodeIds.has(node.parentId) ? node.parentId : undefined;
      const relationshipParent = parentById.get(node.id);
      parentById.set(node.id, explicitParent || relationshipParent || root.id);
    });

  const childMap = new Map<string, string[]>();
  nodes.forEach(node => childMap.set(node.id, []));
  parentById.forEach((parentId, childId) => childMap.get(parentId)?.push(childId));

  const depthById = new Map<string, number>([[root.id, 0]]);
  const queue = [root.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depthById.get(id) ?? 0;
    (childMap.get(id) || []).forEach(childId => {
      depthById.set(childId, depth + 1);
      queue.push(childId);
    });
  }

  const normalizedNodes = nodes.map(node => ({
    ...node,
    depth: depthById.get(node.id) ?? node.depth,
    parentId: node.id === root.id ? undefined : parentById.get(node.id) || root.id,
  }));

  const validRelationships = (conceptMap.relationships || []).filter(
    rel => nodeIds.has(rel.from) && nodeIds.has(rel.to) && rel.from !== rel.to
  );
  const generatedTreeRelationships = normalizedNodes
    .filter(node => node.id !== root.id && node.parentId)
    .map(node => ({ from: node.parentId!, to: node.id, label: 'includes' }));

  const relKeys = new Set<string>();
  const relationships = [...generatedTreeRelationships, ...validRelationships].filter(rel => {
    const key = `${rel.from}->${rel.to}`;
    if (relKeys.has(key)) return false;
    relKeys.add(key);
    return true;
  });

  return { nodes: normalizedNodes, relationships, rootId: root.id, childMap };
}

function centerPositions(positions: Map<string, Point>) {
  if (positions.size === 0) return;
  const coords = Array.from(positions.values());
  const minX = Math.min(...coords.map(point => point.x));
  const maxX = Math.max(...coords.map(point => point.x));
  const minY = Math.min(...coords.map(point => point.y));
  const maxY = Math.max(...coords.map(point => point.y));
  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;

  positions.forEach(point => {
    point.x -= offsetX;
    point.y -= offsetY;
  });
}

function resolveNodeOverlaps(
  nodes: ConceptNode[],
  positions: Map<string, Point>,
  mode: string,
  rootId: string
) {
  const horizontalModes = ['flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist'];
  const verticalModes = ['hierarchy', 'tree'];
  const horizontal = horizontalModes.includes(mode);
  const vertical = verticalModes.includes(mode);
  const gap = mode === 'checklist' ? 18 : mode === 'matrix' ? 24 : horizontal || vertical ? 34 : 28;

  for (let pass = 0; pass < 14; pass += 1) {
    let moved = false;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const pointA = positions.get(nodeA.id);
        const pointB = positions.get(nodeB.id);
        if (!pointA || !pointB) continue;

        const metricsA = getNodeMetrics(nodeA);
        const metricsB = getNodeMetrics(nodeB);
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const requiredX = metricsA.width / 2 + metricsB.width / 2 + gap;
        const requiredY = metricsA.height / 2 + metricsB.height / 2 + gap;
        const overlapX = requiredX - Math.abs(dx);
        const overlapY = requiredY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        const differentDepth = nodeA.depth !== nodeB.depth;
        let separateOnX = overlapX <= overlapY;
        if (horizontal && differentDepth) separateOnX = true;
        if (vertical && differentDepth) separateOnX = false;

        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const push = (separateOnX ? overlapX : overlapY) + 4;
        const xPush = separateOnX ? signX * push : 0;
        const yPush = separateOnX ? 0 : signY * push;
        const aIsRoot = nodeA.id === rootId;
        const bIsRoot = nodeB.id === rootId;

        if (aIsRoot && !bIsRoot) {
          pointB.x += xPush;
          pointB.y += yPush;
        } else if (bIsRoot && !aIsRoot) {
          pointA.x -= xPush;
          pointA.y -= yPush;
        } else {
          pointA.x -= xPush / 2;
          pointA.y -= yPush / 2;
          pointB.x += xPush / 2;
          pointB.y += yPush / 2;
        }

        moved = true;
      }
    }

    if (!moved) break;
  }
}

function getViewBox(nodes: ConceptNode[], positions: Map<string, Point>) {
  if (positions.size === 0) return { minX: -600, minY: -400, width: 1200, height: 800 };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach(node => {
    const position = positions.get(node.id);
    if (!position) return;
    const metrics = getNodeMetrics(node);
    minX = Math.min(minX, position.x - metrics.width / 2);
    maxX = Math.max(maxX, position.x + metrics.width / 2);
    minY = Math.min(minY, position.y - metrics.height / 2);
    maxY = Math.max(maxY, position.y + metrics.height / 2);
  });

  const width = Math.max(maxX - minX + MAP_PADDING * 2, 900);
  const height = Math.max(maxY - minY + MAP_PADDING * 2, 620);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    minX: centerX - width / 2,
    minY: centerY - height / 2,
    width,
    height,
  };
}

function getEdgePoint(from: Point, to: Point, metrics: NodeMetrics): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return from;

  const xScale = Math.abs(dx) > 0 ? metrics.width / 2 / Math.abs(dx) : Infinity;
  const yScale = Math.abs(dy) > 0 ? metrics.height / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(xScale, yScale, 1);

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale,
  };
}

const ConceptMapRenderer: React.FC<{
  conceptMap: ConceptMap;
  mode: VisualMode;
  onNodeClick: (node: ConceptNode) => void;
  highlightedNode?: string | null;
  isZenMode?: boolean;
}> = ({ conceptMap, mode: _mode, onNodeClick, highlightedNode, isZenMode = false }) => {
  const mode = _mode as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const layoutGraph = React.useMemo(() => buildLayoutGraph(conceptMap), [conceptMap]);

  // Reactive dimension tracking
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
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setDimensions({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!layoutGraph.nodes.length) return;

    const newPositions = new Map<string, { x: number; y: number }>();

    const childMap = layoutGraph.childMap;
    const rootId = layoutGraph.rootId;
    const nodeCount = layoutGraph.nodes.length;
    const isLinearMode = ['hierarchy', 'tree', 'flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist'].includes(mode);

    const leafCountCache = new Map<string, number>();
    const getLeafCount = (id: string): number => {
      if (leafCountCache.has(id)) return leafCountCache.get(id)!;
      const children = childMap.get(id) || [];
      const count = children.length === 0 ? 1 : children.reduce((sum, childId) => sum + getLeafCount(childId), 0);
      leafCountCache.set(id, count);
      return count;
    };

    if (isLinearMode) {
      let nextLeaf = 0;
      const rootMetrics = getNodeMetrics(layoutGraph.nodes.find(node => node.id === rootId) || layoutGraph.nodes[0]);
      const crossGap = mode === 'checklist' ? 86 : mode === 'matrix' ? 140 : nodeCount > 22 ? 140 : 170;
      const layerGap = mode === 'chronos' || mode === 'ladder'
        ? Math.max(340, rootMetrics.width / 2 + 180)
        : mode === 'flow' || mode === 'architect'
          ? Math.max(380, rootMetrics.width / 2 + 230)
          : mode === 'matrix'
            ? Math.max(320, rootMetrics.width / 2 + 160)
            : mode === 'checklist'
              ? Math.max(260, rootMetrics.width / 2 + 140)
              : Math.max(250, rootMetrics.height / 2 + 190);
      const horizontal = ['flow', 'architect', 'chronos', 'ladder', 'matrix'].includes(mode);

      const placeTree = (id: string, depth: number): number => {
        const children = childMap.get(id) || [];
        let cross: number;

        if (children.length === 0) {
          cross = nextLeaf * crossGap;
          nextLeaf += 1;
        } else {
          const childCrosses = children.map(childId => placeTree(childId, depth + 1));
          cross = childCrosses.reduce((sum, value) => sum + value, 0) / childCrosses.length;
        }

        let point = horizontal ? { x: depth * layerGap, y: cross } : { x: cross, y: depth * layerGap };

        if (mode === 'ladder') {
          // Stairs effect: Each depth level is offset both X and Y
          point = { x: depth * layerGap, y: depth * (crossGap * 0.7) + (cross * 0.3) };
        } else if (mode === 'matrix') {
          // Snap to clean rows
          const row = Math.round(cross / crossGap);
          point = { x: depth * layerGap, y: row * crossGap };
        } else if (mode === 'checklist') {
          // Vertical list style
          point = { x: depth * 60, y: cross };
        } else if (mode === 'chronos') {
          // Strict timeline alignment
          point = { x: depth * layerGap, y: 0 + (cross * 0.1) };
        }

        newPositions.set(id, point);
        return cross;
      };

      placeTree(rootId, 0);
      centerPositions(newPositions);
    } else {
      newPositions.set(rootId, { x: 0, y: 0 });
      const primaryChildren = childMap.get(rootId) || [];
      const totalLeaves = Math.max(getLeafCount(rootId), primaryChildren.length, 1);
      const layerGap = mode === 'nexus'
        ? nodeCount > 24 ? 205 : 235
        : nodeCount > 24 ? 230 : nodeCount > 14 ? 255 : 290;

      const placeRadial = (id: string, startAngle: number, endAngle: number, depth: number) => {
        const children = childMap.get(id) || [];
        if (children.length === 0) return;

        const parentAngle = (startAngle + endAngle) / 2;
        let cursor = startAngle;
        const childLeafTotal = children.reduce((sum, childId) => sum + getLeafCount(childId), 0);

        children.forEach(childId => {
          const leafShare = getLeafCount(childId) / Math.max(childLeafTotal, 1);
          const span = (endAngle - startAngle) * leafShare;
          const childAngle = children.length === 1 ? parentAngle : cursor + span / 2;
          const radius = Math.max(depth, 1) * layerGap;

          newPositions.set(childId, {
            x: Math.cos(childAngle) * radius,
            y: Math.sin(childAngle) * radius,
          });

          placeRadial(childId, cursor, cursor + span, depth + 1);
          cursor += span;
        });
      };

      const firstSpan = (2 * Math.PI) / Math.max(totalLeaves, 1);
      placeRadial(rootId, -Math.PI / 2 - firstSpan / 2, (3 * Math.PI) / 2 - firstSpan / 2, 1);

      layoutGraph.nodes.forEach(node => {
        if (!newPositions.has(node.id)) {
          const index = layoutGraph.nodes.findIndex(candidate => candidate.id === node.id);
          const angle = (index / Math.max(layoutGraph.nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          newPositions.set(node.id, {
            x: Math.cos(angle) * layerGap,
            y: Math.sin(angle) * layerGap,
          });
        }
      });
    }

    if (!isLinearMode && mode !== 'radial') {
      const posArray = Array.from(newPositions.entries());
      const minDist = mode === 'nexus' ? 130 : 155;
      for (let pass = 0; pass < 8; pass++) {
        for (let j = 0; j < posArray.length; j++) {
          for (let k = j + 1; k < posArray.length; k++) {
            const [, p1] = posArray[j];
            const [, p2] = posArray[k];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            if (dist < minDist) {
              const force = (minDist - dist) / (2 * dist);
              p1.x += dx * force;
              p1.y += dy * force;
              p2.x -= dx * force;
              p2.y -= dy * force;
            }
          }
        }
      }
    }

    resolveNodeOverlaps(layoutGraph.nodes, newPositions, mode, rootId);
    centerPositions(newPositions);
    setPositions(newPositions);
  }, [layoutGraph, mode]);

  const getNodeStyle = (node: ConceptNode, isHighlighted: boolean) => {
    const colors = isZenMode ? ZEN_NODE_COLORS : NODE_COLORS;
    const color = colors[Math.min(node.depth, colors.length - 1)];
    const isCentral = node.depth === 0;
    
    if (isZenMode) {
      if (isCentral) return { fill: '#6366f1', stroke: '#6366f1', text: '#fff', strokeWidth: 2 };
      if (isHighlighted) return { fill: 'rgba(99,102,241,0.2)', stroke: '#6366f1', text: '#fff', strokeWidth: 3 };
      return { ...color, strokeWidth: 1.5 };
    }

    if (isCentral) return { fill: '#000666', stroke: '#000666', text: '#fff', strokeWidth: 1.5 };
    if (isHighlighted) return { fill: '#f8fafc', stroke: '#000666', text: '#000666', strokeWidth: 2.5 };
    return { ...color, strokeWidth: 1.5 };
  };

  const renderConnections = () => {
    if (!layoutGraph.relationships.length || positions.size === 0) return null;
    return layoutGraph.relationships.map((rel, idx) => {
      const from = positions.get(rel.from);
      const to = positions.get(rel.to);
      const fromNode = layoutGraph.nodes.find(n => n.id === rel.from);
      const toNode = layoutGraph.nodes.find(n => n.id === rel.to);
      
      if (!from || !to) return null;

      const start = fromNode ? getEdgePoint(from, to, getNodeMetrics(fromNode)) : from;
      const end = toNode ? getEdgePoint(to, from, getNodeMetrics(toNode)) : to;
      const isHighlighted = highlightedNode === rel.from || highlightedNode === rel.to;
      let d = '';

      if (mode === 'hierarchy' || mode === 'tree') {
        const midY = (start.y + end.y) / 2;
        d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
      } else if (mode === 'ladder') {
        // Stepped line for ladder
        d = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (mode === 'matrix' || mode === 'checklist') {
        // Orthogonal for grid modes
        const midX = (start.x + end.x) / 2;
        d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      } else if (mode === 'flow' || mode === 'architect') {
        const midX = (start.x + end.x) / 2;
        d = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
      } else if (mode === 'chronos') {
        d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (mode === 'radial') {
        d = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${(start.y + end.y) / 2}, ${end.x} ${end.y}`;
      } else {
        const hashOffset = ((rel.from.charCodeAt(0) + rel.to.charCodeAt(0)) % 40) - 20;
        const mx = (start.x + end.x) / 2 + hashOffset;
        const my = (start.y + end.y) / 2 + hashOffset * 0.5;
        d = `M ${start.x} ${start.y} Q ${mx} ${my}, ${end.x} ${end.y}`;
      }

      const isLateral = rel.from !== toNode?.parentId && rel.to !== fromNode?.parentId;
      const strokeColor = isHighlighted
        ? (isZenMode ? '#6366f1' : '#000666')
        : isZenMode 
          ? (isLateral ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)')
          : (isLateral ? '#e2e8f0' : '#cbd5e1');

      return (
        <g key={`${rel.from}-${rel.to}-${idx}`}>
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isHighlighted ? 2.5 : 1.25}
            strokeDasharray={isLateral ? '6,8' : 'none'}
            strokeLinecap="round"
            markerEnd={(mode === 'flow' || mode === 'architect' || mode === 'chronos' || mode === 'ladder' || mode === 'matrix' || mode === 'checklist' || (mode === 'nexus' && isHighlighted)) ? 'url(#arrowhead)' : undefined}
            className="transition-all duration-700"
          />
        </g>
      );
    });
  };

  // Chronos timeline rail (Focus-Aware)
  const renderChronosRail = () => {
    if (mode !== 'chronos' || positions.size === 0) return null;
    const coords = Array.from(positions.values());
    const minX = Math.min(...coords.map(p => p.x)) - 200;
    const maxX = Math.max(...coords.map(p => p.x)) + 200;
    
    const depths = Array.from(new Set(layoutGraph.nodes.map(n => n.depth))).sort((a,b) => a-b);

    return (
      <g opacity="0.15">
        <line x1={minX} y1="0" x2={maxX} y2="0" stroke="#000666" strokeWidth="4" strokeDasharray="10,15" />
        {depths.map(d => {
          const nodeAtDepth = layoutGraph.nodes.find(n => n.depth === d);
          if (!nodeAtDepth) return null;
          const pos = positions.get(nodeAtDepth.id);
          if (!pos) return null;
          return (
            <g key={d} transform={`translate(${pos.x}, 0)`}>
              <line y1="-40" y2="40" stroke="#000666" strokeWidth="2" />
              <text y="60" textAnchor="middle" className="fill-[#000666] font-black text-[14px]">PHASE {d}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderHUD = (minX: number, minY: number, vW: number, vH: number) => {
    const nodeCount = layoutGraph.nodes.length || 0;
    const maxDepth = Math.max(...(layoutGraph.nodes.map(n => n.depth) || [0]));

    return (
      <g className="pointer-events-none select-none uppercase font-mono fill-[#000666]" opacity="0.35">
        <text x={minX + 40} y={minY + 52} fontSize="12" fontWeight="900">
          NODES {nodeCount} / DEPTH {maxDepth}
        </text>
      </g>
    );
  };

  const renderMatrixHeaders = () => {
    if (mode !== 'matrix' || positions.size === 0) return null;
    const coords = Array.from(positions.values());
    const minY = Math.min(...coords.map(p => p.y)) - 100;
    const depths = Array.from(new Set(layoutGraph.nodes.map(n => n.depth))).sort((a,b) => a-b);
    
    return (
      <g opacity="0.12">
        {depths.map(d => {
          const nodeAtDepth = layoutGraph.nodes.find(n => n.depth === d);
          if (!nodeAtDepth) return null;
          const pos = positions.get(nodeAtDepth.id);
          if (!pos) return null;
          return (
            <g key={d} transform={`translate(${pos.x}, ${minY})`}>
               <text textAnchor="middle" className="fill-[#000666] font-black text-[28px] uppercase tracking-tighter">PHASE {d}</text>
               <line y1="40" y2="4000" stroke="#000666" strokeWidth="1" strokeDasharray="5,10" />
            </g>
          );
        })}
      </g>
    );
  };

  const renderNodes = () => {
    if (!layoutGraph.nodes.length || positions.size === 0) return null;
    return layoutGraph.nodes.map(node => {
      const pos = positions.get(node.id);
      if (!pos) return null;

      const isCentral = node.depth === 0;
      const isHighlighted = highlightedNode === node.id;
      const style = getNodeStyle(node, isHighlighted);
      const metrics = getNodeMetrics(node);
      const { width: w, height: h, radius: rx, lines, fontSize, lineHeight } = metrics;

      const shadow = isHighlighted
        ? 'drop-shadow(0 12px 24px rgba(0,6,102,0.24))'
        : 'drop-shadow(0 6px 16px rgba(15,23,42,0.10))';

      return (
        <g key={node.id} onClick={() => onNodeClick(node)} className="cursor-pointer group">
          {isHighlighted && (
            <rect x={pos.x - w / 2 - 8} y={pos.y - h / 2 - 8} width={w + 16} height={h + 16} rx={rx + 8} className="fill-none stroke-[#000666]/25 stroke-[4px]" />
          )}
          <rect
            x={pos.x - w / 2}
            y={pos.y - h / 2}
            width={w} height={h} rx={rx}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            style={{ filter: shadow, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)' }}
          />
          <rect
            x={pos.x - w / 2 + 3}
            y={pos.y - h / 2 + 3}
            width={w - 6} height={h - 6} rx={Math.max(rx - 3, 0)}
            fill="none"
            stroke={isCentral ? 'rgba(255,255,255,0.15)' : 'rgba(0,6,102,0.05)'}
            strokeWidth={1}
            className="pointer-events-none"
          />
          <text
            x={pos.x}
            y={pos.y - ((lines.length - 1) * lineHeight) / 2}
            textAnchor="middle"
            alignmentBaseline="middle"
            dominantBaseline="central"
            fill={style.text}
            fontSize={fontSize}
            fontWeight={900}
            letterSpacing={0}
            className="select-none pointer-events-none"
          >
            {lines.map((line, index) => (
              <tspan key={line + index} x={pos.x + (mode === 'checklist' ? 14 : 0)} dy={index === 0 ? 0 : lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
          {mode === 'checklist' && !isCentral && (
            <g transform={`translate(${pos.x - w/2 + 20}, ${pos.y})`}>
               <circle r="8" fill="none" stroke={style.stroke} strokeWidth="1.5" />
               <path d="M -4 0 L -1 3 L 4 -3" fill="none" stroke={style.stroke} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
        </g>
      );
    });
  };

  const { minX, minY, width: vW, height: vH } = getViewBox(layoutGraph.nodes, positions);

  return (
    <div ref={containerRef} className={`w-full h-full min-h-0 ${mode === 'architecture' ? 'bg-[#0a0a0f]' : 'bg-transparent'}`}>
      <svg
        width="100%" height="100%"
        viewBox={`${minX} ${minY} ${vW} ${vH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#f1f5f9" strokeWidth="2" />
            <circle cx="0" cy="0" r="2" fill="#e2e8f0" />
          </pattern>
          <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto">
            <polygon points="0 0, 12 4, 0 8" fill="#000666" />
          </marker>
        </defs>
        <rect x={minX} y={minY} width={vW} height={vH} fill="url(#grid)" />
        
        {/* BACKGROUND WATERMARK */}
        <text
          x={0} y={0}
          textAnchor="middle"
          className="fill-[#000666] opacity-[0.025] font-black pointer-events-none uppercase"
          fontSize="96"
          letterSpacing={0}
          transform="rotate(-25)"
        >
          VIDHYALAYA
        </text>

        {renderHUD(minX, minY, vW, vH)}
        {renderChronosRail()}
        {renderMatrixHeaders()}
        {renderConnections()}
        {renderNodes()}
      </svg>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// NODE DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVATION ROOM (Node Detail Panel)
// ─────────────────────────────────────────────────────────────────────────────

export const NodeDetailPanel: React.FC<{
  node: ConceptNode | null;
  moduleTitle: string;
  onClose: () => void;
  isSidebar?: boolean;
}> = ({ node, moduleTitle, onClose, isSidebar = false }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(380);
  const isResizingRef = useRef(false);

  const scanSignal = async () => {
    if (!node) return;
    setIsLoading(true);
    setError(null);
    setExplanation('');
    
    try {
      // DIRECT NEURAL SCAN: High-fidelity concept extraction
      const response = await chatWithTutor([], 
        `ARCHITECTURAL DEEP-DIVE: Explain the concept of "${node.label}" within the framework of "${moduleTitle}". 
        Focus on structural logic, technical implementation patterns, and core utility. 
        Structure your response as a professional technical report with sharp headings and concise bullets.`, 
        `NEURAL OBSERVATORY // SYSTEM_AUTH: EXPERT // MODULE: ${moduleTitle}`
      );
      setExplanation(response);
    } catch (err) {
      console.error("Signal Lost:", err);
      let availableModels = "Unknown";
      try {
        const models = await listModels();
        availableModels = models.join(", ");
      } catch (listErr) {
        console.error("Failed to list models:", listErr);
      }
      setError(`UPLINK FAILED: ${err instanceof Error ? err.message : String(err)} | AVAILABLE MODELS: ${availableModels}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (node) scanSignal();
  }, [node, moduleTitle]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newHeight = window.innerHeight - e.clientY - 20;
      setHeight(Math.min(Math.max(newHeight, 200), window.innerHeight * 0.8));
    };
    const handleMouseUp = () => { isResizingRef.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!node) return null;

  // SIDEBAR MODE: renders as normal flow element inside the sidebar panel
  if (isSidebar) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#000666] flex items-center justify-center shrink-0 relative">
              <Eye size={14} className="text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-[#000666]/50 uppercase tracking-[0.3em] leading-none mb-0.5">Observation</p>
              <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate">{node.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader size={28} className="animate-spin text-[#000666] opacity-60" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] animate-pulse">Scanning Signal...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <AlertTriangle size={28} className="text-amber-500" />
              <p className="text-[11px] text-slate-400 font-medium">Neural uplink interrupted.</p>
              <button onClick={scanSignal} className="px-5 py-2 bg-[#000666] text-white rounded-xl font-black text-[9px] uppercase tracking-widest">
                Retry Scan
              </button>
            </div>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none
              prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[13px]
              prose-strong:text-[#000666] prose-strong:font-black
              prose-code:bg-slate-100 prose-code:text-[#000666] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
              prose-headings:text-black prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-[11px]
              prose-li:text-slate-600 prose-li:text-[13px]
              prose-blockquote:border-l-2 prose-blockquote:border-[#000666]/20 prose-blockquote:bg-slate-50 prose-blockquote:p-3 prose-blockquote:rounded-r-lg
            ">
              <ReactMarkdown>{explanation || node.description}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  // OVERLAY MODE: renders as absolute overlay on top of the map (standalone use)
  return (
    <div 
      style={{ height: `${height}px` }}
      className="absolute inset-x-4 bottom-4 bg-white/98 backdrop-blur-2xl border border-slate-200/60 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.12)] rounded-3xl p-8 animate-in slide-in-from-bottom-8 duration-700 z-50 flex flex-col"
    >
      {/* RESIZE HANDLE */}
      <div 
        onMouseDown={() => { isResizingRef.current = true; }}
        className="absolute top-0 inset-x-0 h-4 cursor-ns-resize flex items-center justify-center group"
      >
        <div className="w-16 h-1 bg-slate-100 rounded-full group-hover:bg-[#000666]/30 transition-colors" />
      </div>

      <div className="flex items-start justify-between mb-8 shrink-0 mt-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#000666] flex items-center justify-center shadow-2xl shadow-indigo-900/20 relative">
            <Eye size={28} className="text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[10px] font-black text-[#000666]/60 uppercase tracking-[0.4em]">Observation Room</h2>
              <div className="h-px w-8 bg-[#000666]/10" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Signal: Secure</span>
            </div>
            <h3 className="text-2xl font-black text-black tracking-tight leading-none mb-3 uppercase">{node.label}</h3>
            <div className="flex items-center gap-4">
               <span className="px-2.5 py-1 bg-[#000666] text-white rounded-md text-[9px] font-black uppercase tracking-[0.2em]">
                 {node.depth === 0 ? 'Foundation' : `Derivative · L${node.depth}`}
               </span>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">CID: {node.id.slice(0,6)}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 rounded-full transition-all border border-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="bg-slate-50/50 rounded-2xl p-8 border border-slate-200/40 flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-10 gap-6">
            <Loader size={40} className="animate-spin text-[#000666] opacity-60" />
            <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse block">Observing Neural Signals...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center py-10 gap-6">
            <AlertTriangle size={48} className="text-amber-500" />
            <div className="text-center max-w-md">
              <h4 className="text-[14px] font-black text-black uppercase tracking-[0.2em] mb-2">{error}</h4>
              <button onClick={scanSignal} className="px-8 py-3 bg-[#000666] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">
                Re-Scan Signal
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-md prose-slate max-w-none
            prose-p:leading-relaxed prose-p:text-slate-600 prose-p:text-[16px]
            prose-strong:text-[#000666] prose-strong:font-black
            prose-code:bg-slate-200/50 prose-code:text-[#000666] prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
            prose-headings:text-black prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter
            prose-li:text-slate-600 prose-li:text-[15px]
            prose-blockquote:border-l-4 prose-blockquote:border-[#000666]/20 prose-blockquote:bg-slate-100/50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl
          ">
            <ReactMarkdown>{explanation || node.description}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const NeuralSynthesizer: React.FC<NeuralSynthesizerProps> = ({
  moduleTitle,
  moduleContent,
  keyConcepts,
  generatedContent,
  initialMap,
  onNodeClick,
  isFullScreen = false,
  onFullScreenToggle,
  focusMode = 'split',
  isZenMode = false,
}) => {
  const [visualMode, setVisualMode] = useState<VisualMode>('mindmap');
  const [complexity, setComplexity] = useState<ComplexityLevel>('overview');
  const [studyLens, setStudyLens] = useState<StudyLens>('roadmap');
  const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showLensSelector, setShowLensSelector] = useState(false);
  const [showComplexitySelector, setShowComplexitySelector] = useState(false);

  const transformRef = useRef<any>(null);
  const { geometryAnchors } = useAppStore();

  const anchoredConceptMap = React.useMemo(() => {
    if (!conceptMap) return conceptMap;
    const moduleAnchors = geometryAnchors.filter(anchor => anchor.moduleTitle === moduleTitle).slice(0, 10);
    if (moduleAnchors.length === 0) return conceptMap;

    const nodes = conceptMap.nodes || [];
    const relationships = conceptMap.relationships || [];
    const rootNode = nodes.find(node => node.depth === 0) || nodes[0];
    const rootId = rootNode?.id || 'root';
    const existingIds = new Set(nodes.map(node => node.id));
    
    const anchorNodes: ConceptNode[] = moduleAnchors.map((anchor, index) => {
      const idBase = `anchor-${anchor.kind}-${index}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const id = existingIds.has(idBase) ? `${idBase}-${anchor.id.slice(0, 6)}` : idBase;
      existingIds.add(id);
      return {
        id,
        label: anchor.label,
        description: `${anchor.kind.replace('-', ' ')}: ${anchor.detail}`,
        depth: 1,
        parentId: rootId,
        connections: [rootId],
      };
    });

    return {
      ...conceptMap,
      nodes: [...nodes, ...anchorNodes],
      relationships: [
        ...relationships,
        ...anchorNodes.map(node => ({ from: rootId, to: node.id, label: 'anchored' })),
      ],
    };
  }, [conceptMap, geometryAnchors, moduleTitle]);

  const closeSelectors = () => {
    setShowModeSelector(false);
    setShowLensSelector(false);
    setShowComplexitySelector(false);
  };

  const synthesizeConceptMap = async () => {
    setIsSynthesizing(true);
    setSelectedNode(null);
    try {
      const result = await generateConceptMap(moduleTitle, keyConcepts, generatedContent || '', complexity, studyLens);
      setConceptMap(result);
      setTimeout(() => transformRef.current?.resetTransform(0), 100);
    } catch (error) {
      console.error('Failed to synthesize:', error);
      const nodes: ConceptNode[] = [
        { id: 'central', label: moduleTitle, description: `Master ${moduleTitle}`, depth: 0 },
        ...keyConcepts.map((c, i) => ({ id: `c-${i}`, label: c, description: c, depth: 1, parentId: 'central', connections: ['central'] })),
      ];
      setConceptMap({ centralConcept: moduleTitle, nodes, relationships: keyConcepts.map((_, i) => ({ from: 'central', to: `c-${i}`, label: 'includes' })) });
      setTimeout(() => transformRef.current?.resetTransform(0), 100);
    } finally {
      setIsSynthesizing(false);
    }
  };

  useEffect(() => {
    if (initialMap) {
      setConceptMap(initialMap);
    } else if (moduleTitle && moduleContent && !conceptMap) {
      synthesizeConceptMap();
    }
  }, [moduleTitle, moduleContent, initialMap]);

  useEffect(() => { 
    if (conceptMap) {
      synthesizeConceptMap();
    }
  }, [complexity, studyLens]);

  useEffect(() => {
    if (conceptMap) {
      setTimeout(() => transformRef.current?.resetTransform(0), 100);
    }
  }, [visualMode]);

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden relative min-h-0 transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>

      {/* ── Neural Canvas Header (Unified Control Bar) ── */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Unified Left Controls */}
          <div className={`flex items-center gap-1.5 p-1.5 rounded-[22px] backdrop-blur-md border shadow-[0_8px_32px_-8px_rgba(0,6,102,0.12)] transition-all ${isZenMode ? 'bg-white/5 border-white/10' : 'bg-white/90 border-slate-200/50'}`}>
            {/* View Mode Selector */}
            <div className="group relative">
              <button className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-[#000666]'}`}>
                <MapIcon size={14} className={isZenMode ? 'text-indigo-400' : 'text-indigo-500'} />
                {VISUAL_MODES.find(m => m.id === visualMode)?.label}
                <ChevronDown size={12} className="opacity-30" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                <div className={`p-2 rounded-2xl border shadow-2xl transition-all ${isZenMode ? 'bg-[#0f111a] border-white/10' : 'bg-white border-slate-100'}`}>
                  {VISUAL_MODES.map(m => (
                    <button key={m.id} onClick={() => setVisualMode(m.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${visualMode === m.id ? (isZenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-[#000666]') : (isZenMode ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700')}`}>
                      {m.label} {visualMode === m.id && <Check size={12} className={isZenMode ? 'text-indigo-400' : 'text-[#000666]'} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Lens Selector */}
            <div className="group relative">
              <button className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}>
                <Target size={14} className={isZenMode ? 'text-indigo-400' : 'text-indigo-400'} />
                {STUDY_LENSES.find(l => l.id === studyLens)?.label}
                <ChevronDown size={12} className="opacity-30" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                <div className={`p-2 rounded-2xl border shadow-2xl transition-all ${isZenMode ? 'bg-[#0f111a] border-white/10' : 'bg-white border-slate-100'}`}>
                  {STUDY_LENSES.map(l => (
                    <button key={l.id} onClick={() => setStudyLens(l.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${studyLens === l.id ? (isZenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-[#000666]') : (isZenMode ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700')}`}>
                      {l.label} {studyLens === l.id && <Check size={12} className={isZenMode ? 'text-indigo-400' : 'text-[#000666]'} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`w-px h-4 transition-colors ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            {/* Complexity Selector */}
            <div className="group relative">
              <button className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}>
                <Layers size={14} className={isZenMode ? 'text-indigo-400' : 'text-indigo-400'} />
                {COMPLEXITY_LEVELS.find(c => c.id === complexity)?.label}
                <ChevronDown size={12} className="opacity-30" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                <div className={`p-2 rounded-2xl border shadow-2xl transition-all ${isZenMode ? 'bg-[#0f111a] border-white/10' : 'bg-white border-slate-100'}`}>
                  {COMPLEXITY_LEVELS.map(c => (
                    <button key={c.id} onClick={() => setComplexity(c.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${complexity === c.id ? (isZenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-[#000666]') : (isZenMode ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700')}`}>
                      {c.label} {complexity === c.id && <Check size={12} className={isZenMode ? 'text-indigo-400' : 'text-[#000666]'} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Right Controls */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-[22px] bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-[0_8px_32px_-8px_rgba(0,6,102,0.12)]">
            <button
              onClick={synthesizeConceptMap}
              disabled={isSynthesizing}
              className="group flex items-center gap-2.5 px-5 py-2.5 rounded-[16px] bg-indigo-50/50 text-[10px] font-black uppercase tracking-widest text-[#000666] hover:bg-[#000666] hover:text-white transition-all duration-500 disabled:opacity-40"
            >
              <RefreshCw size={14} className={isSynthesizing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              Resync Map
            </button>
            {onFullScreenToggle && (
              <>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  onClick={onFullScreenToggle}
                  className="p-2.5 rounded-[16px] text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"
                  title="Toggle Display"
                >
                  <Eye size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading & Initialization Overlays ── */}
      {(isSynthesizing || !conceptMap) && (
        <div className={`absolute inset-0 z-[200] flex flex-col items-center justify-center p-12 backdrop-blur-md animate-in fade-in duration-500 transition-colors ${isZenMode ? 'bg-[#05070a]/95' : 'bg-white/95'}`}>
          {isSynthesizing ? (
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <div className={`w-24 h-24 rounded-[32px] border shadow-2xl flex items-center justify-center relative overflow-hidden group transition-colors ${isZenMode ? 'bg-[#05070a] border-white/5' : 'bg-white border-slate-100'}`}>
                   <div className={`absolute inset-0 animate-pulse ${isZenMode ? 'bg-indigo-500/10' : 'bg-gradient-to-br from-indigo-500/10 to-[#000666]/5'}`} />
                   <BrainCircuit size={40} className={`relative z-10 animate-float ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`} />
                </div>
                <div className={`absolute -inset-4 border-2 border-dashed rounded-full animate-[spin_20s_linear_infinite] opacity-50 ${isZenMode ? 'border-indigo-500/30' : 'border-indigo-100'}`} />
              </div>
              <div className="text-center space-y-2">
                <h3 className={`text-[11px] font-black uppercase tracking-[0.4em] animate-pulse transition-colors ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>
                  Synthesizing Neural Mesh...
                </h3>
                <p className={`text-[13px] font-medium font-['Newsreader'] italic transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Mapping conceptual dependencies across the knowledge graph.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-sm text-center">
              <div className={`w-20 h-20 border rounded-[2rem] flex items-center justify-center mb-8 shadow-inner transition-colors ${isZenMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                <Network size={32} />
              </div>
              <h3 className={`text-base font-black uppercase tracking-[0.3em] mb-3 transition-colors ${isZenMode ? 'text-white' : 'text-black'}`}>Neural Synthesizer</h3>
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed mb-10 transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Map the underlying knowledge structure of this module into a technical roadmap.
              </p>
              <button 
                onClick={synthesizeConceptMap} 
                className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl hover:-translate-y-1 transition-all active:scale-95 overflow-hidden ${isZenMode ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-[#000666] text-white shadow-indigo-900/20'}`}
              >
                <span className="relative z-10">Initialize Synthesis</span>
                <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${isZenMode ? 'from-indigo-500 to-purple-600' : 'from-indigo-600 to-[#000666]'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CANVAS */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {conceptMap && !isSynthesizing && (
          <div className="w-full h-full relative">
            <TransformWrapper ref={transformRef} initialScale={1} minScale={0.3} maxScale={3} centerOnInit wheel={{ step: 0.1 }}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-6 right-6 flex bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.1)] border border-slate-200/60 z-[100] overflow-hidden">
                    <button aria-label="Zoom out" title="Zoom out" onClick={() => zoomOut()} className="p-3 hover:bg-slate-50 text-[#000666] border-r border-slate-100 transition-colors"><Minus size={16} /></button>
                    <button aria-label="Reset view" title="Reset view" onClick={() => resetTransform()} className="px-5 text-[10px] font-black text-[#000666] uppercase tracking-widest hover:bg-slate-50 transition-colors">Reset View</button>
                    <button aria-label="Zoom in" title="Zoom in" onClick={() => zoomIn()} className="p-3 hover:bg-slate-50 text-[#000666] border-l border-slate-100 transition-colors"><Plus size={16} /></button>
                  </div>

                  <div className="w-full h-full cursor-grab active:cursor-grabbing">
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                      <div className="w-full h-full">
                        <ConceptMapRenderer
                          conceptMap={anchoredConceptMap || conceptMap}
                          mode={visualMode}
                          onNodeClick={(node) => {
                            setSelectedNode(node);
                            if (onNodeClick) onNodeClick(node);
                          }}
                          highlightedNode={selectedNode?.id || null}
                          isZenMode={isZenMode}
                        />
                      </div>
                    </TransformComponent>
                  </div>
                </>
              )}
            </TransformWrapper>

            {!onNodeClick && selectedNode && (
              <NodeDetailPanel 
                node={selectedNode} 
                moduleTitle={moduleTitle} 
                onClose={() => setSelectedNode(null)} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeuralSynthesizer;
