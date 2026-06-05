import React, { useMemo } from 'react';
import { LayoutEdge, LayoutNode } from './computeLayout';
import { EdgeType, MasteryStatus } from '../../types';

const EDGE_COLORS: Record<EdgeType, string> = {
  contains: '#64748b',
  requires: '#d97706',
  uses: '#2563eb',
  implements: '#7c3aed',
  contrasts: '#9333ea',
  leads_to: '#059669',
  example_of: '#0891b2',
};

const LEVEL_STYLES = [
  { fill: '#000666', stroke: '#000666', text: '#ffffff', fontSize: 14, rx: 14 },
  { fill: '#f8fafc', stroke: '#000666', text: '#0f172a', fontSize: 12, rx: 12 },
  { fill: '#ffffff', stroke: '#cbd5e1', text: '#334155', fontSize: 11, rx: 10 },
  { fill: '#ffffff', stroke: '#e2e8f0', text: '#64748b', fontSize: 10, rx: 8 },
];

const ZEN_LEVEL_STYLES = [
  { fill: '#6366f1', stroke: '#818cf8', text: '#ffffff', fontSize: 14, rx: 14 },
  { fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(99,102,241,0.5)', text: '#e2e8f0', fontSize: 12, rx: 12 },
  { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.15)', text: '#94a3b8', fontSize: 11, rx: 10 },
  { fill: 'transparent', stroke: 'rgba(255,255,255,0.08)', text: '#64748b', fontSize: 10, rx: 8 },
];

interface MapCanvasProps {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  viewBox: string;
  selectedId: string | null;
  highlightedId: string | null;
  showDetails: boolean;
  isZenMode: boolean;
  nodeMastery: Record<string, MasteryStatus>;
  onNodeClick: (nodeId: string) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  nodes,
  edges,
  viewBox,
  selectedId,
  highlightedId,
  showDetails,
  isZenMode,
  nodeMastery,
  onNodeClick,
}) => {
  const visibleNodes = useMemo(
    () => (showDetails ? nodes : nodes.filter(n => n.level <= 2)),
    [nodes, showDetails],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const styles = isZenMode ? ZEN_LEVEL_STYLES : LEVEL_STYLES;

  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Knowledge map">
      <defs>
        <marker id="arrow-requires" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#d97706" />
        </marker>
        <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
        </marker>
      </defs>

      {edges
        .filter(e => visibleIds.has(e.from) && visibleIds.has(e.to))
        .map(edge => {
          const color = EDGE_COLORS[edge.type as EdgeType] || '#94a3b8';
          const midX = (edge.x1 + edge.x2) / 2;
          const midY = (edge.y1 + edge.y2) / 2;
          const isRequires = edge.type === 'requires';
          return (
            <g key={`${edge.from}-${edge.to}-${edge.type}`}>
              <line
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={color}
                strokeWidth={edge.type === 'contains' ? 2 : 1.5}
                strokeDasharray={edge.type === 'contrasts' ? '6 4' : undefined}
                markerEnd={isRequires ? 'url(#arrow-requires)' : edge.type !== 'contains' ? 'url(#arrow-default)' : undefined}
                opacity={0.85}
              />
              <rect x={midX - 36} y={midY - 9} width={72} height={18} rx={4} fill={isZenMode ? '#05070a' : '#ffffff'} opacity={0.92} />
              <text
                x={midX}
                y={midY + 4}
                textAnchor="middle"
                className="select-none"
                fill={color}
                fontSize={9}
                fontWeight={700}
              >
                {edge.label}
              </text>
            </g>
          );
        })}

      {visibleNodes.map(node => {
        const style = styles[Math.min(node.level, 3)];
        const isSelected = selectedId === node.id;
        const isHighlighted = highlightedId === node.id;
        const mastery = nodeMastery[node.id];

        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => onNodeClick(node.id)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onNodeClick(node.id); }}
          >
            <rect
              width={node.width}
              height={node.height}
              rx={style.rx}
              fill={style.fill}
              stroke={isSelected || isHighlighted ? '#6366f1' : style.stroke}
              strokeWidth={isSelected ? 2.5 : isHighlighted ? 2 : 1.5}
            />
            <text
              x={node.width / 2}
              y={node.height / 2 + 4}
              textAnchor="middle"
              fill={style.text}
              fontSize={style.fontSize}
              fontWeight={node.level <= 1 ? 800 : 600}
              className="select-none pointer-events-none"
            >
              {node.label.length > 28 ? `${node.label.slice(0, 26)}…` : node.label}
            </text>
            {mastery && mastery !== 'unknown' && (
              <circle
                cx={node.width - 10}
                cy={10}
                r={5}
                fill={mastery === 'mastered' ? '#10b981' : mastery === 'understood' ? '#6366f1' : '#f59e0b'}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
