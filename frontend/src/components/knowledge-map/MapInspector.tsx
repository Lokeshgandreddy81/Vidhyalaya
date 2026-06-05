import React from 'react';
import { X, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { KnowledgeGraph, KnowledgeNode, MasteryStatus } from '../../types';
import { edgeLabel } from './graphValidator';

interface MapInspectorProps {
  node: KnowledgeNode;
  graph: KnowledgeGraph;
  isZenMode: boolean;
  nodeMastery: Record<string, MasteryStatus>;
  onClose: () => void;
  onMasteryChange: (nodeId: string, status: MasteryStatus) => void;
  onLearnNext?: (nodeId: string) => void;
  onAskAI?: (node: KnowledgeNode) => void;
}

export const MapInspector: React.FC<MapInspectorProps> = ({
  node,
  graph,
  isZenMode,
  nodeMastery,
  onClose,
  onMasteryChange,
  onLearnNext,
  onAskAI,
}) => {
  const incoming = graph.edges.filter(e => e.to === node.id);
  const outgoing = graph.edges.filter(e => e.from === node.id);
  const mastery = nodeMastery[node.id] || 'unknown';
  const levelLabel = ['Core Topic', 'Pillar', 'Supporting', 'Detail'][node.level] || 'Concept';
  const isNext = graph.learningPath[0] === node.id;

  const border = isZenMode ? 'border-white/10' : 'border-slate-200';
  const surface = isZenMode ? 'bg-[#0a0c12] text-white' : 'bg-white text-slate-900';
  const muted = isZenMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`absolute right-0 top-0 z-30 flex h-full w-[min(360px,90vw)] flex-col border-l shadow-2xl ${border} ${surface}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${border}`}>
        <div>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>
            {levelLabel} · {node.importance}
          </p>
          <h3 className="mt-0.5 text-sm font-black leading-snug">{node.label}</h3>
        </div>
        <button onClick={onClose} className={`rounded-lg p-1.5 ${muted} hover:opacity-80`} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <p className={`text-[13px] font-medium leading-relaxed text-justify hyphens-auto ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {node.description || 'No description available.'}
        </p>

        {node.sourceRef && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${border} ${isZenMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <BookOpen size={12} className={isZenMode ? 'text-indigo-400' : 'text-[#000666]'} />
            <span>Source: {node.sourceRef}</span>
          </div>
        )}

        {incoming.length > 0 && (
          <section>
            <h4 className={`mb-2 text-[9px] font-black uppercase tracking-widest ${muted}`}>Connected from</h4>
            <ul className="space-y-1.5">
              {incoming.map(e => {
                const fromNode = graph.nodes.find(n => n.id === e.from);
                return (
                  <li key={`in-${e.from}-${e.type}`} className={`text-[12px] ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="font-bold">{fromNode?.label || e.from}</span>
                    <span className={`mx-1.5 text-[10px] uppercase ${muted}`}>{e.label || edgeLabel(e.type)}</span>
                    <span className="font-medium">{node.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h4 className={`mb-2 text-[9px] font-black uppercase tracking-widest ${muted}`}>Connects to</h4>
            <ul className="space-y-1.5">
              {outgoing.map(e => {
                const toNode = graph.nodes.find(n => n.id === e.to);
                return (
                  <li key={`out-${e.to}-${e.type}`} className={`text-[12px] ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="font-bold">{node.label}</span>
                    <span className={`mx-1.5 text-[10px] uppercase ${muted}`}>{e.label || edgeLabel(e.type)}</span>
                    <span className="font-medium">{toNode?.label || e.to}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h4 className={`mb-2 text-[9px] font-black uppercase tracking-widest ${muted}`}>Mastery</h4>
          <div className="flex flex-wrap gap-2">
            {(['learning', 'understood', 'mastered'] as MasteryStatus[]).map(status => (
              <button
                key={status}
                onClick={() => onMasteryChange(node.id, status)}
                className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                  mastery === status
                    ? isZenMode ? 'bg-indigo-500 text-white' : 'bg-[#000666] text-white'
                    : isZenMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className={`shrink-0 border-t p-3 flex flex-col gap-2 ${border}`}>
        {isNext && onLearnNext && (
          <button
            onClick={() => onLearnNext(node.id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest ${
              isZenMode ? 'bg-indigo-500 text-white' : 'bg-[#000666] text-white'
            }`}
          >
            Learn this next
            <ArrowRight size={12} />
          </button>
        )}
        {onAskAI && (
          <button
            onClick={() => onAskAI(node)}
            className={`rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest ${
              isZenMode ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ask AI about this
          </button>
        )}
        {mastery === 'mastered' && (
          <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold ${isZenMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <CheckCircle2 size={12} />
            Marked as mastered
          </div>
        )}
      </div>
    </div>
  );
};
