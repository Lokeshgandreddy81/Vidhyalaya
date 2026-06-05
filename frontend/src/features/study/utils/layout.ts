import type { ConceptNode, ConceptMap, Point, NodeMetrics, LayoutGraph } from '../types';
import { NODE_COLORS, ZEN_NODE_COLORS, MAP_PADDING } from '../types';

export function wrapLabel(label: string, maxChars: number, maxLines: number): string[] {
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

export function getNodeMetrics(node: ConceptNode): NodeMetrics {
  const isCentral = node.depth === 0;
  const label = node.label || 'Concept';
  const lines = wrapLabel(label, isCentral ? 22 : 18, isCentral ? 4 : 3);
  const longest = Math.max(...lines.map(line => line.length));
  const fontSize = isCentral ? 19.5 : 14.5;
  const lineHeight = isCentral ? 26 : 20;
  const width = Math.min(
    Math.max(longest * (isCentral ? 14 : 11.5) + (isCentral ? 120 : 100), isCentral ? 380 : 260),
    isCentral ? 700 : 550
  );
  const height = Math.max(lines.length * lineHeight + (isCentral ? 60 : 48), isCentral ? 110 : 80);

  return { width, height, radius: height / 2, fontSize, lineHeight, lines };
}

export function buildLayoutGraph(conceptMap: ConceptMap): LayoutGraph {
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

export function centerPositions(positions: Map<string, Point>) {
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

export function resolveNodeOverlaps(
  nodes: ConceptNode[],
  positions: Map<string, Point>,
  mode: string,
  rootId: string
) {
  const horizontalModes = ['flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist', 'cascade', 'pulse', 'mosaic'];
  const verticalModes = ['hierarchy', 'tree'];
  const horizontal = horizontalModes.includes(mode);
  const vertical = verticalModes.includes(mode);
  const gap = mode === 'checklist' ? 18 : mode === 'matrix' ? 24 : horizontal || vertical ? 34 : 28;

  for (let pass = 0; pass < 32; pass += 1) {
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
        const requiredX = (metricsA.width / 2 + metricsB.width / 2) + gap;
        const requiredY = (metricsA.height / 2 + metricsB.height / 2) + gap;
        const overlapX = requiredX - Math.abs(dx);
        const overlapY = requiredY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;

        let xPush = 0;
        let yPush = 0;

        if (horizontal) {
          yPush = overlapY * signY;
        } else if (vertical) {
          xPush = overlapX * signX;
        } else {
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = (gap * 1.25 - dist) / dist;
          if (force > 0) {
            xPush = dx * force;
            yPush = dy * force;
          }
        }

        const damping = 0.85;
        const finalXPush = xPush * damping;
        const finalYPush = yPush * damping;

        if (nodeA.id === rootId) {
          pointB.x += finalXPush; pointB.y += finalYPush;
        } else if (nodeB.id === rootId) {
          pointA.x -= finalXPush; pointA.y -= finalYPush;
        } else {
          pointA.x -= finalXPush / 2; pointA.y -= finalYPush / 2;
          pointB.x += finalXPush / 2; pointB.y += finalYPush / 2;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function getViewBox(nodes: ConceptNode[], positions: Map<string, Point>, dimensions?: { width: number; height: number }) {
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

  const bboxW = Math.max(maxX - minX + MAP_PADDING * 2, 1000);
  const bboxH = Math.max(maxY - minY + MAP_PADDING * 2, 800);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  let width = bboxW;
  let height = bboxH;

  if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
    const containerRatio = dimensions.width / dimensions.height;
    const bboxRatio = bboxW / bboxH;

    if (containerRatio > bboxRatio) {
      width = bboxH * containerRatio;
    } else {
      height = bboxW / containerRatio;
    }
  }

  return {
    minX: centerX - width / 2,
    minY: centerY - height / 2,
    width,
    height,
  };
}

export function getEdgePoint(from: Point, to: Point, metrics: NodeMetrics, extraBuffer: number = 0): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return from;

  const width = metrics.width + 12 + extraBuffer * 2;
  const height = metrics.height + 12 + extraBuffer * 2;

  const xScale = Math.abs(dx) > 0 ? (width / 2) / Math.abs(dx) : Infinity;
  const yScale = Math.abs(dy) > 0 ? (height / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(xScale, yScale);

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale,
  };
}

export function getHeatColor(nodeTimeSpent: Map<string, number> | undefined, nodeId: string, isZenMode: boolean): string {
  const time = nodeTimeSpent?.get(nodeId) ?? 0;
  if (time <= 0) return isZenMode ? 'rgba(99,165,255,0.6)' : '#93c5fd';
  const t = Math.min(time / 120, 1);
  const h = Math.round(210 - t * 210);
  const s = 80;
  const l = isZenMode ? 50 : 55;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function getNodeStyle(node: ConceptNode, isHighlighted: boolean, isZenMode: boolean) {
  const colors = isZenMode ? ZEN_NODE_COLORS : NODE_COLORS;
  const color = colors[Math.min(node.depth, colors.length - 1)];
  const isCentral = node.depth === 0;

  if (isZenMode) {
    if (isCentral) return { fill: 'url(#node-grad-zen-0)', stroke: '#818cf8', text: '#fff', strokeWidth: 2, gradientId: 'node-grad-zen-0' };
    if (isHighlighted) return { fill: 'rgba(99,102,241,0.2)', stroke: '#6366f1', text: '#fff', strokeWidth: 3, gradientId: null };
    return { ...color, fill: `url(#node-grad-zen-${Math.min(node.depth, 3)})`, stroke: color.stroke, strokeWidth: 1.5, gradientId: `node-grad-zen-${Math.min(node.depth, 3)}` };
  }

  if (isCentral) return { fill: 'url(#node-grad-0)', stroke: '#4e5bff', text: '#fff', strokeWidth: 1.5, gradientId: 'node-grad-0' };
  if (isHighlighted) return { fill: '#f8fafc', stroke: '#4e5bff', text: '#4e5bff', strokeWidth: 2.5, gradientId: null };

  return { ...color, fill: `url(#node-grad-${Math.min(node.depth, 3)})`, stroke: color.stroke, strokeWidth: 1.5, gradientId: `node-grad-${Math.min(node.depth, 3)}` };
}
