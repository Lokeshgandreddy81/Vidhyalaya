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

const H_GAP = 54;
const V_GAP = 96;
const PAD = 80;

const LEVEL_MIN_WIDTH: Record<number, number> = { 0: 300, 1: 260, 2: 230, 3: 200 };
const LEVEL_MIN_HEIGHT: Record<number, number> = { 0: 88, 1: 72, 2: 64, 3: 56 };

function wrapLabel(label: string, maxChars: number, maxLines = 3): string[] {
  const words = label.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const lines: string[] = [];

  const pushChunkedWord = (word: string) => {
    for (let i = 0; i < word.length; i += maxChars) {
      lines.push(word.slice(i, i + maxChars));
    }
  };

  for (const word of words) {
    if (word.length > maxChars) {
      pushChunkedWord(word);
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

  return lines.length ? lines : [label || 'Concept'];
}

export { wrapLabel };

export function nodeSize(node: KnowledgeNode): { width: number; height: number } {
  const labelLines = wrapLabel(node.label, node.level === 0 ? 24 : 22, node.level === 0 ? 2 : 3);
  const baseW = LEVEL_MIN_WIDTH[node.level] ?? 200;
  const baseH = LEVEL_MIN_HEIGHT[node.level] ?? 56;
  const width = Math.min(390, Math.max(baseW, Math.max(...labelLines.map(l => l.length)) * 9.2 + 52));
  const desc = node.description?.trim() || '';
  const descLines = desc
    ? wrapLabel(desc, Math.max(28, Math.floor((width - 42) / 6.1)), 2)
    : [];
  const labelHeight = labelLines.length * 19;
  const descHeight = descLines.length ? descLines.length * 14 + 12 : 0;
  const height = Math.max(baseH, labelHeight + descHeight + 32);
  return { width, height };
}

function getChildren(graph: KnowledgeGraph, nodeId: string): string[] {
  return graph.edges
    .filter(e => e.from === nodeId && e.type === 'contains')
    .map(e => e.to);
}

function getRoot(graph: KnowledgeGraph): KnowledgeNode {
  return graph.nodes.find(n => n.level === 0) ?? graph.nodes[0];
}

function sortByLearningPath(graph: KnowledgeGraph, nodes: KnowledgeNode[]): KnowledgeNode[] {
  return [...nodes].sort((a, b) => {
    const ia = graph.learningPath.indexOf(a.id);
    const ib = graph.learningPath.indexOf(b.id);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.label.localeCompare(b.label);
  });
}

function getReadableWidth(width: number): number {
  if (!Number.isFinite(width) || width < 640) return 920;
  return Math.max(760, Math.min(width - PAD * 2, 1420));
}

function packRow(
  row: KnowledgeNode[],
  sizeById: Map<string, { width: number; height: number }>,
  availableW: number,
): KnowledgeNode[][] {
  const packed: KnowledgeNode[][] = [];
  let current: KnowledgeNode[] = [];
  let currentW = 0;

  row.forEach(node => {
    const size = sizeById.get(node.id)!;
    const nextW = current.length === 0 ? size.width : currentW + H_GAP + size.width;
    if (current.length > 0 && nextW > availableW) {
      packed.push(current);
      current = [node];
      currentW = size.width;
      return;
    }
    current.push(node);
    currentW = nextW;
  });

  if (current.length > 0) packed.push(current);
  return packed;
}

/** Layered board layout — readable rows with fixed text/card proportions. */
function layoutLayered(graph: KnowledgeGraph, width: number, levelGap = V_GAP): LayoutNode[] {
  const sizeById = new Map(graph.nodes.map(n => [n.id, nodeSize(n)]));
  const result: LayoutNode[] = [];
  const maxLevel = Math.max(0, ...graph.nodes.map(n => n.level));
  const availableW = getReadableWidth(width);
  const canvasCenterX = PAD + availableW / 2;
  let y = PAD;

  for (let level = 0; level <= maxLevel; level += 1) {
    const levelNodes = sortByLearningPath(graph, graph.nodes.filter(n => n.level === level));
    if (!levelNodes.length) continue;

    const rows = packRow(levelNodes, sizeById, availableW);
    rows.forEach((row, rowIndex) => {
      const rowHeight = Math.max(...row.map(n => sizeById.get(n.id)!.height));
      const rowWidth = row.reduce((sum, node, index) => {
        const size = sizeById.get(node.id)!;
        return sum + size.width + (index === 0 ? 0 : H_GAP);
      }, 0);
      let x = canvasCenterX - rowWidth / 2;

      row.forEach(node => {
        const size = sizeById.get(node.id)!;
        result.push({
          ...node,
          x,
          y: y + (rowHeight - size.height) / 2,
          ...size,
        });
        x += size.width + H_GAP;
      });

      y += rowHeight + (rowIndex === rows.length - 1 ? 0 : 44);
    });

    y += levelGap;
  }

  return result;
}

/** Classic top-down tree with layered fallback for broad graphs. */
function layoutHierarchy(graph: KnowledgeGraph, width: number): LayoutNode[] {
  const root = getRoot(graph);
  const sizeById = new Map(graph.nodes.map(n => [n.id, nodeSize(n)]));
  const positions = new Map<string, { x: number; y: number }>();
  let nextLeafX = PAD;

  const walk = (id: string, depth: number): void => {
    const children = getChildren(graph, id);
    const size = sizeById.get(id)!;
    const y = PAD + depth * (V_GAP + 64);

    if (children.length === 0) {
      positions.set(id, { x: nextLeafX, y });
      nextLeafX += size.width + H_GAP;
      return;
    }

    children.forEach(childId => walk(childId, depth + 1));

    const first = positions.get(children[0])!;
    const lastChild = children[children.length - 1];
    const last = positions.get(lastChild)!;
    const lastSize = sizeById.get(lastChild)!;
    const centerX = (first.x + last.x + lastSize.width) / 2 - size.width / 2;
    positions.set(id, { x: Math.max(PAD, centerX), y });
  };

  walk(root.id, 0);

  const result = graph.nodes.map(node => {
    const pos = positions.get(node.id) ?? { x: PAD, y: PAD };
    const size = sizeById.get(node.id)!;
    return { ...node, ...pos, ...size };
  });

  const minX = Math.min(...result.map(n => n.x));
  const maxX = Math.max(...result.map(n => n.x + n.width));
  const readableW = getReadableWidth(width);

  if (maxX - minX > readableW * 1.18) {
    return layoutLayered(graph, width, V_GAP + 12);
  }

  return result;
}

/** Level-based rows — clean vertical progression, no horizontal cramming. */
function layoutPath(graph: KnowledgeGraph, width: number): LayoutNode[] {
  return layoutLayered(graph, width, V_GAP + 20);
}

/** Left-Right horizontally branching Mind Map layout. */
function layoutMindMap(graph: KnowledgeGraph, width: number): LayoutNode[] {
  const root = getRoot(graph);
  const sizeById = new Map(graph.nodes.map(n => [n.id, nodeSize(n)]));
  
  const cx = 950;
  const cy = 600;
  
  const rootSize = sizeById.get(root.id)!;
  const result: LayoutNode[] = [
    {
      ...root,
      x: cx - rootSize.width / 2,
      y: cy - rootSize.height / 2,
      ...rootSize,
    },
  ];

  const l1Nodes = sortByLearningPath(graph, graph.nodes.filter(n => n.level === 1));
  if (l1Nodes.length === 0) {
    return layoutLayered(graph, width, V_GAP);
  }

  const leftL1 = l1Nodes.filter((_, i) => i % 2 === 0);
  const rightL1 = l1Nodes.filter((_, i) => i % 2 !== 0);

  const HORIZONTAL_GAP = 280;

  const layoutSide = (sideNodes: KnowledgeNode[], isLeft: boolean) => {
    if (sideNodes.length === 0) return;
    
    const totalH = sideNodes.reduce((acc, n) => acc + sizeById.get(n.id)!.height + 48, 0) - 48;
    let currentY = cy - totalH / 2;

    sideNodes.forEach(node => {
      const size = sizeById.get(node.id)!;
      const x = isLeft ? cx - HORIZONTAL_GAP - size.width : cx + HORIZONTAL_GAP;
      
      result.push({
        ...node,
        x,
        y: currentY,
        ...size,
      });

      const children = sortByLearningPath(
        graph,
        graph.nodes.filter(n => n.level === 2 && getChildren(graph, node.id).includes(n.id))
      );

      if (children.length > 0) {
        const childTotalH = children.reduce((acc, c) => acc + sizeById.get(c.id)!.height + 24, 0) - 24;
        let childY = currentY + size.height / 2 - childTotalH / 2;
        
        children.forEach(child => {
          const cSize = sizeById.get(child.id)!;
          const cx2 = isLeft ? x - HORIZONTAL_GAP - cSize.width : x + size.width + HORIZONTAL_GAP;
          
          result.push({
            ...child,
            x: cx2,
            y: childY,
            ...cSize,
          });
          childY += cSize.height + 24;
        });
      }

      currentY += size.height + 48;
    });
  };

  layoutSide(leftL1, true);
  layoutSide(rightL1, false);

  const handledIds = new Set(result.map(n => n.id));
  const l3Nodes = graph.nodes.filter(n => n.level === 3);
  l3Nodes.forEach(node => {
    const parentEdge = graph.edges.find(e => e.to === node.id && e.type === 'contains');
    const parentNode = parentEdge ? result.find(n => n.id === parentEdge.from) : null;
    const size = sizeById.get(node.id)!;

    if (parentNode) {
      const isParentOnLeft = parentNode.x < cx;
      result.push({
        ...node,
        x: isParentOnLeft ? parentNode.x - size.width - 60 : parentNode.x + parentNode.width + 60,
        y: parentNode.y + parentNode.height / 2 - size.height / 2,
        ...size,
      });
    } else {
      result.push({
        ...node,
        x: cx - size.width / 2,
        y: cy + 400,
        ...size,
      });
    }
  });

  const finalHandledIds = new Set(result.map(n => n.id));
  const missedNodes = graph.nodes.filter(n => !finalHandledIds.has(n.id));
  missedNodes.forEach((node, i) => {
    const size = sizeById.get(node.id)!;
    result.push({
      ...node,
      x: cx - size.width / 2,
      y: cy + 300 + i * 100,
      ...size,
    });
  });

  return result;
}

/** Radial constellation — root hub with orbiting concept satellites. */
function layoutOrbit(graph: KnowledgeGraph): LayoutNode[] {
  const cx = 900;
  const cy = 620;
  const root = getRoot(graph);
  const rootSize = nodeSize(root);
  const result: LayoutNode[] = [
    {
      ...root,
      x: cx - rootSize.width / 2,
      y: cy - rootSize.height / 2,
      ...rootSize,
    },
  ];

  const ringRadii: Record<number, number> = { 1: 280, 2: 480, 3: 660 };
  const byLevel = new Map<number, KnowledgeNode[]>();

  for (const node of graph.nodes) {
    if (node.level === 0) continue;
    if (!byLevel.has(node.level)) byLevel.set(node.level, []);
    byLevel.get(node.level)!.push(node);
  }

  for (const [level, nodes] of byLevel) {
    const radius = ringRadii[level] ?? 420;
    const sorted = sortByLearningPath(graph, nodes);
    const step = (Math.PI * 2) / Math.max(sorted.length, 1);
    const offset = level % 2 === 0 ? 0 : step / 2;

    sorted.forEach((node, i) => {
      const angle = offset + i * step - Math.PI / 2;
      const size = nodeSize(node);
      result.push({
        ...node,
        x: cx + Math.cos(angle) * radius - size.width / 2,
        y: cy + Math.sin(angle) * radius - size.height / 2,
        ...size,
      });
    });
  }

  return result;
}

/** Pillar columns — root on top, each major branch in its own lane. */
function layoutPillars(graph: KnowledgeGraph, width: number): LayoutNode[] {
  const root = getRoot(graph);
  const rootSize = nodeSize(root);
  const pillars = sortByLearningPath(graph, graph.nodes.filter(n => n.level === 1));
  const result: LayoutNode[] = [];

  const laneWidth = 330;
  const availableW = getReadableWidth(width);
  const lanesPerRow = Math.max(1, Math.floor((availableW + H_GAP) / laneWidth));
  const firstRowLanes = Math.min(Math.max(pillars.length, 1), lanesPerRow);
  const rootX = PAD + (firstRowLanes * laneWidth) / 2 - rootSize.width / 2;

  result.push({ ...root, x: rootX, y: PAD, ...rootSize });

  pillars.forEach((pillar, col) => {
    const pillarSize = nodeSize(pillar);
    const row = Math.floor(col / lanesPerRow);
    const lane = col % lanesPerRow;
    const laneCenter = PAD + lane * laneWidth + laneWidth / 2;
    const pillarX = laneCenter - pillarSize.width / 2;
    const pillarY = PAD + rootSize.height + V_GAP + row * 430;
    result.push({ ...pillar, x: pillarX, y: pillarY, ...pillarSize });

    const descendants = graph.nodes.filter(n => {
      if (n.level <= 1 || n.id === pillar.id) return false;
      let current: string | undefined = n.id;
      const parentMap = new Map(graph.edges.filter(e => e.type === 'contains').map(e => [e.to, e.from]));
      while (current) {
        if (current === pillar.id) return true;
        current = parentMap.get(current);
      }
      return false;
    });

    let dy = pillarY + pillarSize.height + 48;
    sortByLearningPath(graph, descendants).forEach(desc => {
      const size = nodeSize(desc);
      result.push({
        ...desc,
        x: laneCenter - size.width / 2,
        y: dy,
        ...size,
      });
      dy += size.height + 40;
    });
  });

  return result;
}

function anchorPoints(
  from: LayoutNode,
  to: LayoutNode,
  type: EdgeType,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + from.width / 2;
  const toCx = to.x + to.width / 2;

  if (type === 'contains' || to.y > from.y + 8) {
    return {
      x1: fromCx,
      y1: from.y + from.height,
      x2: toCx,
      y2: to.y,
    };
  }

  if (to.x > from.x + from.width) {
    return {
      x1: from.x + from.width,
      y1: from.y + from.height / 2,
      x2: to.x,
      y2: to.y + to.height / 2,
    };
  }

  if (to.x + to.width < from.x) {
    return {
      x1: from.x,
      y1: from.y + from.height / 2,
      x2: to.x + to.width,
      y2: to.y + to.height / 2,
    };
  }

  return {
    x1: fromCx,
    y1: from.y + from.height,
    x2: toCx,
    y2: to.y,
  };
}

function anchorPointsRadial(from: LayoutNode, to: LayoutNode): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const dist = Math.hypot(dx, dy) || 1;
  const fromR = Math.max(from.width, from.height) * 0.42;
  const toR = Math.max(to.width, to.height) * 0.42;

  return {
    x1: fromCx + (dx / dist) * fromR,
    y1: fromCy + (dy / dist) * fromR,
    x2: toCx - (dx / dist) * toR,
    y2: toCy - (dy / dist) * toR,
  };
}

function translateNodesToPositiveSpace(
  nodes: LayoutNode[],
  padding = PAD,
): LayoutNode[] {
  if (!nodes.length) return nodes;

  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const dx = padding - minX;
  const dy = padding - minY;

  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return nodes;

  return nodes.map(n => ({
    ...n,
    x: n.x + dx,
    y: n.y + dy,
  }));
}

export function computeLayout(
  graph: KnowledgeGraph,
  viewMode: MapViewMode,
  width: number,
  height: number,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  let nodes: LayoutNode[];

  switch (viewMode) {
    case 'orbit':
      nodes = layoutOrbit(graph);
      break;
    case 'flow':
      nodes = layoutMindMap(graph, width);
      break;
    case 'timeline':
      nodes = layoutPath(graph, width);
      break;
    case 'compare':
      nodes = layoutPillars(graph, width);
      break;
    default:
      nodes = layoutHierarchy(graph, width);
  }

  nodes = translateNodesToPositiveSpace(nodes);

  const radial = viewMode === 'orbit';
  const posById = new Map(nodes.map(n => [n.id, n]));
  const edges: LayoutEdge[] = graph.edges
    .map(edge => {
      const from = posById.get(edge.from);
      const to = posById.get(edge.to);
      if (!from || !to) return null;
      const anchors = radial
        ? anchorPointsRadial(from, to)
        : anchorPoints(from, to, edge.type);
      return {
        from: edge.from,
        to: edge.to,
        type: edge.type,
        label: edge.label || edge.type,
        ...anchors,
      };
    })
    .filter((e): e is LayoutEdge => e !== null);

  return { nodes, edges };
}

export function getViewBox(
  nodes: LayoutNode[],
  padding: number | { top?: number; right?: number; bottom?: number; left?: number } = 48,
): string {
  if (nodes.length === 0) return '0 0 1200 800';
  const pad = typeof padding === 'number'
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : {
        top: padding.top ?? 48,
        right: padding.right ?? 48,
        bottom: padding.bottom ?? 48,
        left: padding.left ?? 48,
      };
  const minX = Math.min(...nodes.map(n => n.x)) - pad.left;
  const minY = Math.min(...nodes.map(n => n.y)) - pad.top;
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + pad.right;
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + pad.bottom;
  const w = maxX - minX;
  const h = maxY - minY;
  return `${minX} ${minY} ${w} ${h}`;
}
