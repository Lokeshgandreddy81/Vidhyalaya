import React from 'react';
import { X } from 'lucide-react';
import { KnowledgeGraph, KnowledgeNode, MasteryStatus } from '../../types';

interface MapInspectorProps {
  node: KnowledgeNode;
  graph: KnowledgeGraph;
  isZenMode: boolean;
  nodeMastery: Record<string, MasteryStatus>;
  onClose: () => void;
  onMasteryChange: (nodeId: string, status: MasteryStatus) => void;
  onAskAI?: (node: KnowledgeNode) => void;
}

export const MapInspector: React.FC<MapInspectorProps> = ({
  node,
  graph,
  nodeMastery,
  onClose,
  onMasteryChange,
  onAskAI,
}) => {
  const mastery = nodeMastery[node.id] || 'unknown';
  const connectionCount = graph.edges.filter(edge => edge.from === node.id || edge.to === node.id).length;

  return (
    <div className="nm-card" role="dialog" aria-label={node.label}>
      <div className="nm-card__head">
        <div>
          <h3 className="nm-card__title">{node.label}</h3>
          <div className="nm-card__meta">
            <span>Level {node.level}</span>
            <span>{connectionCount} links</span>
            <span>{mastery}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="nm-card__close" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      {node.description && (
        <p className="nm-card__desc">{node.description}</p>
      )}
      <div className="nm-card__actions">
        {(['learning', 'understood', 'mastered'] as MasteryStatus[]).map(status => (
          <button
            key={status}
            type="button"
            title={status}
            aria-label={status}
            onClick={() => onMasteryChange(node.id, status)}
            className={`nm-mastery-dot nm-mastery-dot--${status} ${mastery === status ? 'nm-mastery-dot--on' : ''}`}
          />
        ))}
        {onAskAI && (
          <button type="button" onClick={() => onAskAI(node)} className="nm-card__ask">
            Ask AI
          </button>
        )}
      </div>
    </div>
  );
};
