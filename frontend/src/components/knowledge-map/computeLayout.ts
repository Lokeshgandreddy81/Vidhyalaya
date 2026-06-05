import { KnowledgeGraph, KnowledgeNode, MapViewMode, EdgeType } from '../../types';

export interface LayoutNode extends KnowledgeNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  type: EdgeType;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LEVEL_WIDTH: Record<number, number> = { 0: 220, 1: 190, 2: 160, 3: 140 };
const LEVEL_HEIGHT: Record<number, number> = { 0: 56, 1: 44, 2: 40, 3: 36 };

function nodeSize(node: KnowledgeNode) {
  return { width: LEVEL_WIDTH[node.level] ?? 140, height: LEVEL_HEIGHT[node.level] ?? 36 };
}

function getChildren(graph: KnowledgeGraph, nodeId: string): string[] {
  return graph.edges
    .filter(e => e.from === nodeId && e.type === 'contains')
    .map(e => e.to);
}

function getRoot(graph: KnowledgeGraph): KnowledgeNode {
  return graph.nodes.find(n => n.level === 0) ?? graph.nodes[0];
}

function layoutTree(graph: KnowledgeGraph, width: number, height: number): LayoutNode[] {
  const root = getRoot(graph);
  const positions = new Map<string, { x: number; y: number }>();
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));

  let leafIndex = 0;
  const assign = (id: string, depth: number): number => {
    const children = getChildren(graph, id);
    if (children.length === 0) {
      const x = 120 + leafIndex * 200;
      leafIndex += 1;
      positions.set(id, { x, y: 80 + depth * 120 });
      return 1;
    }
    let start = leafIndex;
    children.forEach(childId => assign(childId, depth + 1));
    const end = leafIndex - 1;
    const midLeaf = (start + end) / 2;
    positions.set(id, { x: 120 + midLeaf * 200, y: 80 + depth * 120 });
    return leafIndex - start;
  };

  assign(root.id, 0);

  const xs = [...positions.values()].map(p => p.x);
  const ys = [...positions.values()].map(p => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, width);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, height);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const pad = 80;

  return graph.nodes.map(node => {
    const pos = positions.get(node.id) ?? { x: width / 2, y: height / 2 };
    const size = nodeSize(node);
    const x = pad + ((pos.x - minX) / spanX) * Math.max(width - pad * 2 - size.width, 200);
    const y = pad + ((pos.y - minY) / spanY) * Math.max(height - pad * 2 - size.height, 200);
    return { ...node, x, y, ...size };
  });
}

function layoutFlow(graph: KnowledgeGraph, width: number, height: number): LayoutNode[] {
  const sorted = [...graph.nodes].sort((a, b) => {
    const pathA = graph.learningPath.indexOf(a.id);
    const pathB = graph.learningPath.indexOf(b.id);
    if (pathA !== -1 && pathB !== -1) return pathA - pathB;
    return a.level - b.level;
  });

  const gap = Math.min(220, (width - 160) / Math.max(sorted.length, 1));
  return sorted.map((node, i) => {
    const size = nodeSize(node);
    const row = i % 2;
    return {
      ...node,
      x: 80 + i * gap,
      y: height / 2 + (row === 0 ? -80 : 80) - size.height / 2,
      ...size,
    };
  });
}

function layoutTimeline(graph: KnowledgeGraph, width: number, height: number): LayoutNode[] {
  const sorted = [...graph.nodes].sort((a, b) => a.level - b.level);
  const gap = Math.min(180, (width - 120) / Math.max(sorted.length, 1));
  return sorted.map((node, i) => {
    const size = nodeSize(node);
    return {
      ...node,
      x: 60 + i * gap,
      y: height / 2 - size.height / 2,
      ...size,
    };
  });
}

function layoutCompare(graph: KnowledgeGraph, width: number, height: number): LayoutNode[] {
  const root = getRoot(graph);
  const others = graph.nodes.filter(n => n.id !== root.id);
  const cols = 2;
  const cellW = (width - 120) / cols;
  const cellH = (height - 160) / Math.ceil(others.length / cols);

  const layout: LayoutNode[] = [];
  const rootSize = nodeSize(root);
  layout.push({
    ...root,
    x: width / 2 - rootSize.width / 2,
    y: 40,
    ...rootSize,
  });

  others.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const size = nodeSize(node);
    layout.push({
      ...node,
      x: 60 + col * cellW + cellW / 2 - size.width / 2,
      y: 120 + row * cellH,
      ...size,
    });
  });

  return layout;
}

export function computeLayout(
  graph: KnowledgeGraph,
  viewMode: MapViewMode,
  width: number,
  height: number,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const effectiveMode: MapViewMode =
    viewMode === 'tree' && graph.diagramType === 'timeline' ? 'timeline'
    : viewMode === 'tree' && graph.diagramType === 'process_flow' ? 'flow'
    : viewMode;

  let nodes: LayoutNode[];
  switch (effectiveMode) {
    case 'flow':
      nodes = layoutFlow(graph, width, height);
      break;
    case 'timeline':
      nodes = layoutTimeline(graph, width, height);
      break;
    case 'compare':
      nodes = layoutCompare(graph, width, height);
      break;
    default:
      nodes = layoutTree(graph, width, height);
  }

  const posById = new Map(nodes.map(n => [n.id, n]));
  const edges: LayoutEdge[] = graph.edges
    .map(edge => {
      const from = posById.get(edge.from);
      const to = posById.get(edge.to);
      if (!from || !to) return null;
      return {
        from: edge.from,
        to: edge.to,
        type: edge.type,
        label: edge.label || edge.type,
        x1: from.x + from.width / 2,
        y1: from.y + from.height,
        x2: to.x + to.width / 2,
        y2: to.y,
      };
    })
    .filter((e): e is LayoutEdge => e !== null);

  return { nodes, edges };
}

export function getViewBox(nodes: LayoutNode[], padding = 80): string {
  if (nodes.length === 0) return '0 0 800 600';
  const minX = Math.min(...nodes.map(n => n.x)) - padding;
  const minY = Math.min(...nodes.map(n => n.y)) - padding;
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + padding;
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + padding;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}
