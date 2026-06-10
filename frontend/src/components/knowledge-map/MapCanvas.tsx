import React, { useMemo, useCallback } from 'react';
import { LayoutEdge, LayoutNode, wrapLabel } from './computeLayout';
import { EdgeType, MapViewMode, MasteryStatus } from '../../types';

const EDGE_COLORS: Record<EdgeType, string> = {
  contains: 'rgba(148,163,184,0.35)',
  requires: '#f97316',
  uses: '#60a5fa',
  implements: '#a78bfa',
  contrasts: '#c084fc',
  leads_to: '#34d399',
  example_of: '#22d3ee',
};

interface MapCanvasProps {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  viewBox: string;
  viewMode: MapViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHoverChange: (nodeId: string | null) => void;
  isZenMode: boolean;
  nodeMastery: Record<string, MasteryStatus>;
  onNodeClick: (nodeId: string) => void;
}

function edgePath(x1: number, y1: number, x2: number, y2: number, radial: boolean): string {
  if (radial) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return `M ${x1} ${y1} Q ${mx - dy * 0.1} ${my + dx * 0.1}, ${x2} ${y2}`;
  }
  const dy = Math.abs(y2 - y1);
  const curve = Math.max(40, dy * 0.35);
  if (y2 > y1) return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function nodeRadius(node: LayoutNode, isRoot: boolean): number {
  if (isRoot) return Math.max(node.width, node.height) * 0.42;
  const base = Math.min(node.width, node.height) * 0.36;
  return Math.max(36, Math.min(68, base));
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  nodes,
  edges,
  viewBox,
  viewMode,
  selectedId,
  hoveredId,
  onHoverChange,
  isZenMode,
  nodeMastery,
  onNodeClick,
}) => {
  const radial = viewMode === 'orbit';
  const treeEdges = useMemo(() => edges.filter(e => e.type === 'contains'), [edges]);
  const semanticEdges = useMemo(() => edges.filter(e => e.type !== 'contains'), [edges]);

  const checkPrereqsSatisfied = useCallback((nodeId: string) => {
    if (nodeId === 'root' || nodeId === 'central' || nodeId.startsWith('phase-')) return true;
    const prereqs = edges.filter(e => e.to === nodeId && e.type === 'requires');
    if (prereqs.length === 0) return true;
    return prereqs.every(edge => {
      const m = nodeMastery[edge.from];
      return m === 'mastered' || m === 'understood';
    });
  }, [edges, nodeMastery]);

  const rootCenter = useMemo(() => {
    const root = nodes.find(n => n.level === 0);
    if (!root) return null;
    return { x: root.x + root.width / 2, y: root.y + root.height / 2 };
  }, [nodes]);

  const { connectedNodeIds, activeEdgeIds } = useMemo(() => {
    if (!hoveredId) return { connectedNodeIds: new Set<string>(), activeEdgeIds: new Set<string>() };
    const nodeIds = new Set<string>([hoveredId]);
    const edgeIds = new Set<string>();
    edges.forEach(edge => {
      const key = `${edge.from}-${edge.to}`;
      if (edge.from === hoveredId) {
        nodeIds.add(edge.to);
        edgeIds.add(key);
      } else if (edge.to === hoveredId) {
        nodeIds.add(edge.from);
        edgeIds.add(key);
      }
    });
    return { connectedNodeIds: nodeIds, activeEdgeIds: edgeIds };
  }, [hoveredId, edges]);

  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Knowledge constellation">
      <defs>
        <linearGradient id="nm-edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="nm-glass-glare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nm-hub-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="42%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </radialGradient>
        <radialGradient id="nm-hub-grad-light" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="46%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#312e81" />
        </radialGradient>
        <radialGradient id="nm-node-grad-light" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#dbeafe" />
        </radialGradient>
        <radialGradient id="nm-node-grad-dark" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="rgba(248,250,252,0.22)" />
          <stop offset="62%" stopColor="rgba(30,41,59,0.88)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0.98)" />
        </radialGradient>
        <filter id="nm-glow-filter" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nm-depth-filter" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#020617" floodOpacity={isZenMode ? '0.42' : '0.14'} />
        </filter>
      </defs>

      {/* Orbit rings */}
      {radial && rootCenter && [100, 180, 260, 340].map((r, i) => (
        <circle
          key={r}
          cx={rootCenter.x}
          cy={rootCenter.y}
          r={r}
          fill="none"
          stroke={isZenMode ? 'rgba(99,102,241,0.12)' : 'rgba(0,6,102,0.06)'}
          strokeWidth={1}
          style={{ animation: i === 1 ? 'nm-pulse 4s ease-in-out infinite' : undefined }}
        />
      ))}

      {/* Structural edges */}
      <g>
        {treeEdges.map((edge, i) => {
          const edgeKey = `${edge.from}-${edge.to}`;
          const isEdgeActive = hoveredId ? activeEdgeIds.has(edgeKey) : false;
          return (
            <g key={`t-${edge.from}-${edge.to}`}>
              <path
                d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2, radial)}
                fill="none"
                stroke={isZenMode ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)'}
                strokeWidth={radial ? 7 : 8}
                strokeLinecap="round"
                opacity={hoveredId ? (isEdgeActive ? 0.35 : 0.05) : (isZenMode ? 0.18 : 0.9)}
                style={{ transition: 'opacity 0.3s ease' }}
              />
              <path
                d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2, radial)}
                fill="none"
                stroke="url(#nm-edge-grad)"
                strokeWidth={radial ? (isEdgeActive ? 3.0 : 1.5) : (isEdgeActive ? 3.5 : 1.8)}
                strokeLinecap="round"
                className={`nm-edge-glow ${isEdgeActive ? 'nm-edge-glow--active' : ''}`}
                style={{
                  animationDelay: `${i * 0.05}s`,
                  transition: 'opacity 0.3s ease, stroke-width 0.3s ease',
                }}
                opacity={hoveredId ? (isEdgeActive ? 1.0 : 0.08) : 1.0}
              />
            </g>
          );
        })}
      </g>

      {/* Semantic edges */}
      {semanticEdges.map(edge => {
        const edgeKey = `${edge.from}-${edge.to}`;
        const isEdgeActive = hoveredId ? activeEdgeIds.has(edgeKey) : false;
        return (
          <path
            key={`s-${edge.from}-${edge.to}`}
            d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2, radial)}
            fill="none"
            stroke={EDGE_COLORS[edge.type as EdgeType] || '#94a3b8'}
            strokeWidth={isEdgeActive ? 2.5 : 1.25}
            strokeOpacity={hoveredId ? (isEdgeActive ? 0.95 : 0.08) : 0.55}
            strokeDasharray={edge.type === 'contrasts' ? '4 4' : undefined}
            className={`nm-semantic-edge ${isEdgeActive ? 'nm-semantic-edge--active' : ''}`}
            style={{
              transition: 'stroke-opacity 0.3s ease, stroke-width 0.3s ease',
            }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, index) => {
        const isRoot = node.level === 0;
        const isSelected = selectedId === node.id;
        const isHovered = hoveredId === node.id;
        const mastery = nodeMastery[node.id];
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        const r = nodeRadius(node, isRoot);
        const lines = wrapLabel(node.label, radial ? 18 : 22, isRoot ? 2 : 3);
        const labelY = cy + r + 14;
 
        const masteryColor = mastery === 'mastered' ? '#10b981'
          : mastery === 'understood' ? '#6366f1'
            : mastery === 'learning' ? '#f59e0b' : null;
 
        const isAvailable = checkPrereqsSatisfied(node.id);
 
        if (radial) {
          return (
            <g
              key={node.id}
              className={`nm-node-g transition-all duration-300 ${
                isAvailable ? 'cursor-pointer' : 'cursor-not-allowed select-none'
              }`}
              style={{
                animationDelay: `${index * 0.04}s`,
                opacity: !isAvailable ? 0.45 : (hoveredId ? (connectedNodeIds.has(node.id) ? 1.0 : 0.15) : 1.0),
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
              onMouseEnter={() => isAvailable && onHoverChange(node.id)}
              onMouseLeave={() => onHoverChange(null)}
              onClick={() => isAvailable && onNodeClick(node.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' && isAvailable) onNodeClick(node.id); }}
            >
              {(isSelected || isHovered) && (
                <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke="#38bdf8" strokeWidth={2} opacity={0.72} filter="url(#nm-glow-filter)" />
              )}
              {isRoot && (
                <>
                  <circle cx={cx} cy={cy} r={r + 24} fill="none" stroke={isZenMode ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.16)'} strokeWidth={1.5} className="nm-hub-ring" />
                  <circle cx={cx} cy={cy} r={r + 14} fill="url(#nm-hub-grad)" opacity={isZenMode ? 0.18 : 0.13} />
                </>
              )}
              {!isRoot && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 7}
                  fill={masteryColor || '#38bdf8'}
                  opacity={isSelected || isHovered ? 0.22 : 0.08}
                  className="nm-node-aura"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isRoot ? (isZenMode ? 'url(#nm-hub-grad)' : 'url(#nm-hub-grad-light)') : isZenMode ? 'url(#nm-node-grad-dark)' : 'url(#nm-node-grad-light)'}
                stroke={isSelected ? '#818cf8' : masteryColor || (isZenMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,6,102,0.1)')}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isRoot ? 'url(#nm-glow-filter)' : 'url(#nm-depth-filter)'}
              />
              {/* Glossy light reflection crescent glare */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="url(#nm-glass-glare)"
                pointerEvents="none"
              />
              <circle
                cx={cx - r * 0.26}
                cy={cy - r * 0.26}
                r={Math.max(3, r * 0.11)}
                fill={isRoot ? 'rgba(255,255,255,0.86)' : isZenMode ? 'rgba(125,211,252,0.7)' : 'rgba(37,99,235,0.52)'}
                opacity={0.82}
              />
              {masteryColor && (
                <circle cx={cx + r * 0.65} cy={cy - r * 0.65} r={5} fill={masteryColor} stroke={isZenMode ? '#07080f' : '#fff'} strokeWidth={1.5} />
              )}
              {!isAvailable && (
                <g transform={`translate(${cx - 8}, ${cy - 8})`} className="text-red-400/90 pointer-events-none select-none">
                  <rect x="2" y="7" width="12" height="8" rx="1.5" ry="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 7V4.5a3 3 0 0 1 6 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </g>
              )}
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill={isZenMode ? '#e4e4e7' : '#1e293b'}
                fontSize={isRoot ? 13 : 11}
                fontWeight={isRoot ? 700 : 600}
                fontFamily="system-ui, sans-serif"
                className="select-none pointer-events-none"
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={cx} dy={i === 0 ? 0 : 14}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        }
 
        // Tree / flow: cinematic knowledge cards
        const desc = node.description?.trim();
        const descLines = desc
          ? wrapLabel(desc, Math.max(28, Math.floor((node.width - 42) / 6.1)), 2)
          : [];
        const cardH = node.height;
        const labelBaseY = isRoot ? 28 : 24;
        const descBaseY = labelBaseY + lines.length * 18 + 8;
 
        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            className={`nm-node-g transition-all duration-300 ${
              isAvailable ? 'cursor-pointer' : 'cursor-not-allowed select-none'
            }`}
            style={{
              animationDelay: `${index * 0.03}s`,
              opacity: !isAvailable ? 0.45 : (hoveredId ? (connectedNodeIds.has(node.id) ? 1.0 : 0.15) : 1.0),
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
            onMouseEnter={() => isAvailable && onHoverChange(node.id)}
            onMouseLeave={() => onHoverChange(null)}
            onClick={() => isAvailable && onNodeClick(node.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' && isAvailable) onNodeClick(node.id); }}
          >
            {(isSelected || isHovered) && (
              <rect x={-8} y={-8} width={node.width + 16} height={cardH + 16} rx={16} fill="none" stroke="#38bdf8" strokeWidth={2.5} opacity={0.85} filter="url(#nm-glow-filter)" />
            )}
            {isRoot && (
              <rect x={-4} y={-4} width={node.width + 8} height={cardH + 8} rx={14} fill={isZenMode ? 'rgba(56,189,248,0.12)' : 'rgba(37,99,235,0.08)'} />
            )}
            <rect
              width={node.width}
              height={cardH}
              rx={12}
              fill={isRoot ? (isZenMode ? '#1e3a8a' : '#0f172a') : isZenMode ? 'rgba(15,23,42,0.94)' : '#ffffff'}
              stroke={isSelected ? '#6366f1' : isZenMode ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)'}
              strokeWidth={isSelected ? 2.5 : 1.25}
              filter="url(#nm-depth-filter)"
            />
            <rect
              width={6}
              height={cardH}
              rx={5}
              fill={masteryColor || (isRoot ? '#38bdf8' : '#2563eb')}
              opacity={isRoot ? 1 : 0.85}
            />
            <text
              x={18}
              y={labelBaseY}
              fill={isRoot ? '#fff' : isZenMode ? '#f8fafc' : '#0f172a'}
              fontSize={isRoot ? 16 : 14}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              className="select-none pointer-events-none"
            >
              {lines.map((line, i) => (
                <tspan key={i} x={18} dy={i === 0 ? 0 : 18}>{line}</tspan>
              ))}
            </text>
            {descLines.length > 0 && (
              <text
                x={18}
                y={descBaseY}
                fill={isZenMode ? '#94a3b8' : '#64748b'}
                fontSize={11}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
                className="select-none pointer-events-none"
              >
                {descLines.map((line, i) => (
                  <tspan key={i} x={18} dy={i === 0 ? 0 : 14}>{line}</tspan>
                ))}
              </text>
            )}
            {masteryColor && (
              <circle cx={node.width - 12} cy={12} r={5} fill={masteryColor} stroke={isZenMode ? '#07080f' : '#fff'} strokeWidth={1.5} />
            )}
            {!isAvailable && (
              <g transform={`translate(${node.width - 24}, 8)`} className="text-red-400/90 pointer-events-none select-none">
                <rect x="2" y="7" width="12" height="8" rx="1.5" ry="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 7V4.5a3 3 0 0 1 6 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
