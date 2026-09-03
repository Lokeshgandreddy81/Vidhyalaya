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
  // Central: wrap at 20. Phase: wrap at 16. Module: wrap at 14.
  const wrapWidth = isCentral ? 20 : node.depth === 1 ? 16 : 14;
  const lines = wrapLabel(label, wrapWidth, isCentral ? 4 : 3);
  const longest = Math.max(...lines.map(line => line.length));
  
  // Premium typography scale for crisp legibility
  const fontSize = isCentral ? 24 : node.depth === 1 ? 17 : 14.5;
  const lineHeight = isCentral ? 30 : node.depth === 1 ? 23 : 19;
  
  // Balanced card aspect ratios (closer to golden ratio)
  const width = Math.min(
    Math.max(longest * (isCentral ? 15 : 10.5) + (isCentral ? 90 : 50), isCentral ? 320 : 170),
    isCentral ? 600 : 360
  );
  const height = Math.max(lines.length * lineHeight + (isCentral ? 50 : 35), isCentral ? 100 : 65);

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

export function centerPositions(positions: Map<string, { x: number; y: number; z?: number }>) {
  if (positions.size === 0) return;
  const coords = Array.from(positions.values());
  const minX = Math.min(...coords.map(point => point.x));
  const maxX = Math.max(...coords.map(point => point.x));
  const minY = Math.min(...coords.map(point => point.y));
  const maxY = Math.max(...coords.map(point => point.y));
  const hasZ = coords.some(point => point.z !== undefined);
  const minZ = hasZ ? Math.min(...coords.map(point => point.z ?? 0)) : 0;
  const maxZ = hasZ ? Math.max(...coords.map(point => point.z ?? 0)) : 0;

  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;
  const offsetZ = hasZ ? (minZ + maxZ) / 2 : 0;

  positions.forEach(point => {
    point.x -= offsetX;
    point.y -= offsetY;
    if (point.z !== undefined) {
      point.z -= offsetZ;
    }
  });
}

export function resolveNodeOverlaps(
  nodes: ConceptNode[],
  positions: Map<string, { x: number; y: number; z?: number }>,
  mode: string,
  rootId: string,
  is3DMode: boolean = false
) {
  const horizontalModes = ['flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist', 'cascade', 'pulse', 'mosaic'];
  const verticalModes = ['hierarchy', 'tree'];
  const horizontal = horizontalModes.includes(mode);
  const vertical = verticalModes.includes(mode);
  // Increased gap: checklist 24, matrix 38, linear 55, radial/general 60
  const gap = mode === 'checklist' ? 24 : mode === 'matrix' ? 38 : horizontal || vertical ? 55 : 60;

  // Use 80 passes (up from 32) — needed for 20+ node maps to fully separate.
  // damping = 1.0 (full correction per pass) — 0.85 left residual overlaps.
  for (let pass = 0; pass < 80; pass += 1) {
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
        const dz = is3DMode ? (pointB.z ?? 0) - (pointA.z ?? 0) : 0;

        const requiredX = (metricsA.width / 2 + metricsB.width / 2) + gap;
        const requiredY = (metricsA.height / 2 + metricsB.height / 2) + gap;
        const requiredZ = is3DMode ? (80 + gap) : 0;

        const overlapX = requiredX - Math.abs(dx);
        const overlapY = requiredY - Math.abs(dy);
        const overlapZ = is3DMode ? (requiredZ - Math.abs(dz)) : 1;

        if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) continue;

        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const signZ = dz >= 0 ? 1 : -1;

        let xPush = 0;
        let yPush = 0;
        let zPush = 0;

        if (is3DMode) {
          if (overlapX < overlapY && overlapX < overlapZ) {
            xPush = overlapX * signX;
          } else if (overlapY < overlapX && overlapY < overlapZ) {
            yPush = overlapY * signY;
          } else {
            zPush = overlapZ * signZ;
          }
        } else {
          if (horizontal) {
            yPush = overlapY * signY;
          } else if (vertical) {
            xPush = overlapX * signX;
          } else {
            if (overlapX < overlapY) {
              xPush = overlapX * signX;
            } else {
              yPush = overlapY * signY;
            }
          }
        }

        // damping = 1.0: apply the full correction so nodes fully clear each other.
        // 0.85 left nodes partially overlapping and the loop would exhaust before resolving.
        const damping = 1.0;
        const finalXPush = xPush * damping;
        const finalYPush = yPush * damping;
        const finalZPush = zPush * damping;

        if (nodeA.id === rootId) {
          pointB.x += finalXPush;
          pointB.y += finalYPush;
          if (is3DMode && pointB.z !== undefined) pointB.z += finalZPush;
        } else if (nodeB.id === rootId) {
          pointA.x -= finalXPush;
          pointA.y -= finalYPush;
          if (is3DMode && pointA.z !== undefined) pointA.z -= finalZPush;
        } else {
          pointA.x -= finalXPush / 2;
          pointA.y -= finalYPush / 2;
          pointB.x += finalXPush / 2;
          pointB.y += finalYPush / 2;
          if (is3DMode) {
            if (pointA.z !== undefined) pointA.z -= finalZPush / 2;
            if (pointB.z !== undefined) pointB.z += finalZPush / 2;
          }
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
  const dist = Math.hypot(dx, dy);
  if (dist < 0.1) return from;

  const w = metrics.width + 2 + extraBuffer * 2;
  const h = metrics.height + 2 + extraBuffer * 2;

  const ux = dx / dist;
  const uy = dy / dist;

  // If metrics.radius is small compared to height/2, it is a rounded rectangle (not a capsule).
  // In this case, use AABB rectangle ray casting to prevent lines from entering inside the card.
  const isCapsule = metrics.radius >= metrics.height / 2 - 2;

  if (!isCapsule) {
    const tx = ux !== 0 ? (w / 2) / Math.abs(ux) : Infinity;
    const ty = uy !== 0 ? (h / 2) / Math.abs(uy) : Infinity;
    const t = Math.min(tx, ty);
    return {
      x: from.x + ux * t,
      y: from.y + uy * t,
    };
  }

  const r = h / 2;
  const cx = Math.max(0, (w - h) / 2);
  const isSemicircle = cx === 0 || Math.abs(uy) * cx <= r * Math.abs(ux);

  let t = 0;
  if (isSemicircle && cx > 0) {
    const sideCx = ux >= 0 ? cx : -cx;
    const term = r * r - cx * cx * uy * uy;
    const sqrtTerm = term >= 0 ? Math.sqrt(term) : 0;
    t = ux * sideCx + sqrtTerm;
  } else {
    t = Math.abs(uy) > 0.001 ? r / Math.abs(uy) : r;
  }

  return {
    x: from.x + ux * t,
    y: from.y + uy * t,
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

export function computeNodePositions(
  visibleNodes: ConceptNode[],
  visibleChildMap: Map<string, string[]>,
  rootId: string,
  mode: string,
  dimensionMode: '2D' | '3D' = '2D'
): Map<string, { x: number; y: number; z?: number }> {
  const is3D = dimensionMode === '3D';
  const newPositions = new Map<string, { x: number; y: number; z?: number }>();
  const nodeCount = visibleNodes.length;
  const isLinearMode = ['hierarchy', 'tree', 'flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist', 'cascade', 'pulse', 'mosaic'].includes(mode);

  const depthCounts = new Map<number, number>();
  visibleNodes.forEach(node => {
    const d = node.depth ?? 0;
    depthCounts.set(d, (depthCounts.get(d) || 0) + 1);
  });

  const leafCountCache = new Map<string, number>();
  const getLeafCount = (id: string): number => {
    if (leafCountCache.has(id)) return leafCountCache.get(id)!;
    const children = visibleChildMap.get(id) || [];
    const count = children.length === 0 ? 1 : children.reduce((sum, childId) => sum + getLeafCount(childId), 0);
    leafCountCache.set(id, count);
    return count;
  };

  if (isLinearMode) {
    let nextLeaf = 0;
    const rootMetrics = getNodeMetrics(visibleNodes.find(node => node.id === rootId) || visibleNodes[0]);
    const crossGap = mode === 'checklist' ? 120 : mode === 'matrix' ? 220 : nodeCount > 22 ? 240 : 320;
    const layerGap = mode === 'chronos' || mode === 'ladder'
      ? Math.max(480, rootMetrics.width / 2 + 280)
      : mode === 'flow' || mode === 'architect'
        ? Math.max(520, rootMetrics.width / 2 + 350)
        : mode === 'matrix'
          ? Math.max(420, rootMetrics.width / 2 + 220)
          : mode === 'checklist'
            ? Math.max(340, rootMetrics.width / 2 + 180)
            : Math.max(450, rootMetrics.height / 2 + 320);
    const horizontal = ['flow', 'architect', 'chronos', 'ladder', 'matrix', 'pulse', 'mosaic'].includes(mode);

    const placeTree = (id: string, depth: number): number => {
      const children = visibleChildMap.get(id) || [];
      let cross: number;

      if (children.length === 0) {
        cross = nextLeaf * crossGap;
        nextLeaf += 1;
      } else {
        const childCrosses = children.map(childId => placeTree(childId, depth + 1));
        cross = childCrosses.reduce((sum, value) => sum + value, 0) / childCrosses.length;
      }

      let point: { x: number; y: number; z?: number } = horizontal ? { x: depth * layerGap, y: cross } : { x: cross, y: depth * layerGap };

      if (mode === 'ladder') {
        point = { x: depth * layerGap, y: depth * (crossGap * 0.7) + (cross * 0.3) };
      } else if (mode === 'matrix') {
        const row = Math.round(cross / crossGap);
        point = { x: depth * layerGap, y: row * crossGap };
      } else if (mode === 'checklist') {
        point = { x: depth * 60, y: cross };
      } else if (mode === 'chronos') {
        point = { x: depth * layerGap, y: 0 + (cross * 0.1) };
      } else if (mode === 'cascade') {
        point = { x: depth * (layerGap * 0.8), y: cross + depth * 40 };
      } else if (mode === 'pulse') {
        point = { x: depth * (layerGap * 0.6), y: cross * 0.8 };
      } else if (mode === 'mosaic') {
        const col = depth;
        const row = Math.round(cross / (crossGap * 0.8));
        point = { x: col * (layerGap * 0.7), y: row * (crossGap * 0.7) };
      }

      if (is3D) {
        point.z = (depth % 2 === 0 ? 1 : -1) * (depth * 50) + (Math.sin(cross * 0.05) * 60);
      }

      newPositions.set(id, point);
      return cross;
    };

    placeTree(rootId, 0);
    centerPositions(newPositions);
  } else {
    newPositions.set(rootId, { x: 0, y: 0, z: is3D ? 0 : undefined });
    const primaryChildren = visibleChildMap.get(rootId) || [];
    const totalLeaves = Math.max(getLeafCount(rootId), primaryChildren.length, 1);
    // Increased layerGap across all node-count tiers.
    // Old values (155/175/205+20) caused depth-1 siblings to crowd and overlap.
    // New values (200/230/260+20) give cards their full width + breathing room.
    let layerGap = mode === 'nexus'
      ? nodeCount > 24 ? 165 : 195
      : nodeCount > 24 ? 200 : nodeCount > 14 ? 230 : 260;

    if (is3D) {
      layerGap += 110;
    } else {
      layerGap += 20;
    }

    const placeRadial = (id: string, startAngle: number, endAngle: number, depth: number) => {
      const children = visibleChildMap.get(id) || [];
      if (children.length === 0) return;

      const parentAngle = (startAngle + endAngle) / 2;
      let cursor = startAngle;
      const childLeafTotal = children.reduce((sum, childId) => sum + getLeafCount(childId), 0);

      children.forEach(childId => {
        const leafShare = getLeafCount(childId) / Math.max(childLeafTotal, 1);
        const span = (endAngle - startAngle) * leafShare;
        const childAngle = children.length === 1 ? parentAngle : cursor + span / 2;

        const countAtDepth = depthCounts.get(depth) || 1;
        // Increased multiplier 140→200: ensures sibling rings are wide enough to
        // fit all nodes at a given depth without initial angular crowding.
        const minRadiusForDepth = (countAtDepth * 200) / (2 * Math.PI);
        const baseRadius = Math.max(Math.max(depth, 1) * layerGap, minRadiusForDepth);

        const radius = mode === 'orbit'
          ? baseRadius
          : mode === 'spiral'
            ? (baseRadius * 0.7 + (childAngle / (2 * Math.PI)) * 120 + depth * 30)
            : mode === 'galaxy'
              ? (baseRadius + (Math.sin(childAngle * 4) * 50))
              : mode === 'dna'
                ? baseRadius
                : baseRadius;

        const xBase = Math.cos(childAngle) * radius;
        const yBase = Math.sin(childAngle) * radius;

        let point: { x: number; y: number; z?: number } = { x: xBase, y: yBase };

        if (is3D) {
          if (mode === 'orbit') {
            const inclination = (depth * 0.35) + (children.indexOf(childId) * 0.05);
            point = {
              x: Math.cos(childAngle) * radius,
              y: Math.sin(childAngle) * radius * Math.cos(inclination),
              z: Math.sin(childAngle) * radius * Math.sin(inclination)
            };
          } else if (mode === 'spiral') {
            point = {
              x: xBase,
              y: yBase,
              z: depth * 70 + (childAngle / (2 * Math.PI)) * 100
            };
          } else if (mode === 'galaxy') {
            const seedVal = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const thickness = Math.sin(childAngle * 6) * 40 + ((seedVal % 40) - 20);
            point = {
              x: xBase,
              y: yBase,
              z: thickness
            };
          } else if (mode === 'dna') {
            const twistAngle = depth * 1.2 + (childAngle * 0.3);
            const helixRadius = 140;
            const strand = depth % 2 === 0 ? 1 : -1;
            point = {
              x: Math.cos(twistAngle) * helixRadius * strand,
              y: depth * 200 - 400,
              z: Math.sin(twistAngle) * helixRadius * strand
            };
          } else if (mode === 'quantum') {
            const qSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const qRadius = depth * 180 + (qSeed % 100);
            const qAngle = (qSeed % 360) * (Math.PI / 180);
            const orbitTilt = (qSeed % 8) * 0.4;
            point = {
              x: Math.cos(qAngle) * qRadius,
              y: Math.sin(qAngle) * qRadius * Math.cos(orbitTilt),
              z: Math.sin(qAngle) * qRadius * Math.sin(orbitTilt)
            };
          } else if (mode === 'constellation') {
            const sSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const radius3D = depth * 220 + (sSeed % 60);
            const thetaConst = childAngle;
            const phiConst = ((sSeed % 180) - 90) * (Math.PI / 180);
            point = {
              x: radius3D * Math.cos(phiConst) * Math.cos(thetaConst),
              y: radius3D * Math.cos(phiConst) * Math.sin(thetaConst),
              z: radius3D * Math.sin(phiConst)
            };
          } else if (mode === 'cluster') {
            const parentPos = newPositions.get(id) || { x: 0, y: 0, z: 0 };
            const cAngle = (children.indexOf(childId) / children.length) * Math.PI * 2;
            const tilt = (children.indexOf(childId) % 3) * 0.5;
            point = {
              x: parentPos.x + Math.cos(cAngle) * 160,
              y: parentPos.y + Math.sin(cAngle) * 160 * Math.cos(tilt),
              z: (parentPos.z ?? 0) + Math.sin(cAngle) * 160 * Math.sin(tilt)
            };
          } else if (mode === 'nexus') {
            const nRadius = depth * 140;
            const tilt = (depth % 3) * 0.4;
            point = {
              x: Math.cos(childAngle) * nRadius,
              y: Math.sin(childAngle) * nRadius * Math.cos(tilt),
              z: Math.sin(childAngle) * nRadius * Math.sin(tilt)
            };
          } else if (mode === 'hierarchy' || mode === 'tree') {
            const parentPos = newPositions.get(id) || { x: 0, y: 0, z: 0 };
            const spread = 220 / Math.max(depth, 1);
            point = {
              x: parentPos.x + Math.cos(childAngle) * spread,
              y: parentPos.y - 180,
              z: (parentPos.z ?? 0) + Math.sin(childAngle) * spread
            };
          } else {
            point = {
              x: xBase,
              y: yBase,
              z: (depth % 2 === 0 ? 1 : -1) * depth * 60 + (children.indexOf(childId) % 3) * 30
            };
          }
        } else {
          if (mode === 'dna') {
            const strand = depth % 2 === 0 ? 1 : -1;
            const wave = Math.sin(depth * 0.8) * 120;
            point = {
              x: depth * 220,
              y: wave * strand + (cursor * 0.5)
            };
          } else if (mode === 'quantum') {
            const qSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const qRadius = depth * 180 + (qSeed % 100);
            const qAngle = (qSeed % 360) * (Math.PI / 180);
            point = { x: Math.cos(qAngle) * qRadius, y: Math.sin(qAngle) * qRadius };
          } else if (mode === 'bridge') {
            const side = depth % 2 === 0 ? 1 : -1;
            point = { x: depth * 200 * side, y: cursor * 0.8 };
          } else if (mode === 'fractal') {
            const fScale = Math.pow(0.85, depth);
            const parentPos = newPositions.get(id) || { x: 0, y: 0 };
            point = {
              x: parentPos.x + Math.cos(childAngle) * (200 * fScale),
              y: parentPos.y + Math.sin(childAngle) * (200 * fScale)
            };
          } else if (mode === 'constellation') {
            const sSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            point = {
              x: Math.cos(childAngle) * (baseRadius * 0.85 + (sSeed % 50)),
              y: Math.sin(childAngle) * (baseRadius * 0.85 + (sSeed % 50))
            };
          } else if (mode === 'cluster') {
            const parentPos = newPositions.get(id) || { x: 0, y: 0 };
            const cAngle = (children.indexOf(childId) / children.length) * Math.PI * 2;
            point = {
              x: parentPos.x + Math.cos(cAngle) * 180,
              y: parentPos.y + Math.sin(cAngle) * 180
            };
          } else if (mode === 'nexus') {
            const nRadius = baseRadius * 0.55;
            point = { x: Math.cos(childAngle) * nRadius, y: Math.sin(childAngle) * nRadius };
          }
        }

        newPositions.set(childId, point);

        placeRadial(childId, cursor, cursor + span, depth + 1);
        cursor += span;
      });
    };

    const firstSpan = (2 * Math.PI) / Math.max(totalLeaves, 1);
    placeRadial(rootId, -Math.PI / 2 - firstSpan / 2 + 0.1, (3 * Math.PI) / 2 - firstSpan / 2 + 0.1, 1);

    visibleNodes.forEach(node => {
      if (!newPositions.has(node.id)) {
        const index = visibleNodes.findIndex(candidate => candidate.id === node.id);
        const angle = (index / Math.max(visibleNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
        newPositions.set(node.id, {
          x: Math.cos(angle) * layerGap,
          y: Math.sin(angle) * layerGap,
          z: is3D ? (index % 3) * 40 : undefined,
        });
      }
    });
  }

  // Pre-resolver: repel any nodes that are too close together.
  // Previously excluded 'radial' mode — but radial IS the default mindmap layout,
  // so this step was silently skipped for the most common view. Now runs for all modes.
  if (!isLinearMode) {
    const posArray = Array.from(newPositions.entries());
    // minDist = 240: cards can be up to 360px wide; 155 was far too small.
    const minDist = mode === 'nexus' ? 180 : 240;
    // 20 passes (up from 8) to handle dense graphs where many pairs need separation
    for (let pass = 0; pass < 20; pass++) {
      for (let j = 0; j < posArray.length; j++) {
        for (let k = j + 1; k < posArray.length; k++) {
          const [, p1] = posArray[j];
          const [, p2] = posArray[k];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = is3D ? (p1.z ?? 0) - (p2.z ?? 0) : 0;
          const dist = is3D ? Math.hypot(dx, dy, dz) : Math.hypot(dx, dy);
          const distMin = is3D ? minDist + 40 : minDist;
          if (dist < distMin) {
            const force = (distMin - dist) / (2 * Math.max(dist, 1));
            p1.x += dx * force;
            p1.y += dy * force;
            if (is3D && p1.z !== undefined && p2.z !== undefined) {
              p1.z += dz * force;
              p2.z -= dz * force;
            }
            p2.x -= dx * force;
            p2.y -= dy * force;
          }
        }
      }
    }
  }

  resolveNodeOverlaps(visibleNodes, newPositions, mode, rootId, is3D);
  centerPositions(newPositions);
  return newPositions;
}
