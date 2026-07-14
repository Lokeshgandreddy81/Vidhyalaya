import React, { useState, useEffect } from 'react';
import { Eye, Loader, AlertTriangle, X, Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { explainRelationship } from '../../../services/geminiService';
import type { ConceptNode } from '../types';

export const RelationDetailPanel: React.FC<{
  relation: { from: string; to: string; label: string } | null;
  moduleTitle: string;
  onClose: () => void;
  isZenMode?: boolean;
  allNodes: ConceptNode[];
}> = ({ relation, moduleTitle, onClose, isZenMode = false, allNodes }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromNodeLabel = relation ? allNodes.find(n => n.id === relation.from)?.label || 'Concept A' : 'Concept A';
  const toNodeLabel = relation ? allNodes.find(n => n.id === relation.to)?.label || 'Concept B' : 'Concept B';

  const fetchExplanation = async () => {
    if (!relation) return;
    setIsLoading(true);
    setError(null);
    setExplanation('');

    try {
      const exp = await explainRelationship(fromNodeLabel, toNodeLabel, relation.label, moduleTitle);
      setExplanation(exp);
    } catch (err) {
      console.error("Failed to bridge relationship:", err);
      setError(`UPLINK FAILED: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (relation) {
      fetchExplanation();
    }
  }, [relation, moduleTitle]);

  if (!relation) return null;

  return (
    <div
      className={`absolute inset-x-4 bottom-4 backdrop-blur-2xl border rounded-3xl p-6 animate-in slide-in-from-bottom-8 duration-700 z-50 flex flex-col max-h-[60vh] transition-colors ${
        isZenMode
          ? 'bg-[#0b0f19]/98 border-white/10 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.5)] text-white'
          : 'bg-white/98 border-slate-200/60 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.12)] text-slate-800'
      }`}
    >
      <div className="flex items-start justify-between mb-4 shrink-0 mt-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-2xl relative">
            <Link2 size={20} className="text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className={`text-[9px] font-black uppercase tracking-[0.3em] ${isZenMode ? 'text-[#8b5cf6]/80' : 'text-[#8b5cf6]/60'}`}>Synaptic Crossover Bridge</h2>
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded border ${
                isZenMode
                  ? 'text-purple-400 bg-purple-950/20 border-purple-500/30'
                  : 'text-purple-600 bg-purple-50 border-purple-100'
              }`}>{relation.label || 'relationship'}</span>
            </div>
            <h3 className={`text-md font-black tracking-tight leading-none uppercase flex items-center gap-1.5 ${isZenMode ? 'text-white' : 'text-black'}`}>
              <span className="text-[#8b5cf6]">{fromNodeLabel}</span>
              <span className="opacity-40">↔</span>
              <span className="text-indigo-400">{toNodeLabel}</span>
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border ${
            isZenMode
              ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10'
              : 'bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 border-slate-100'
          }`}
        >
          <X size={18} />
        </button>
      </div>

      <div className={`rounded-xl p-5 border flex-1 overflow-y-auto custom-scrollbar relative flex flex-col gap-4 transition-colors ${
        isZenMode
          ? 'bg-white/[0.02] border-white/5'
          : 'bg-slate-50/50 border-slate-200/40'
      }`}>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-8 gap-4">
            <Loader size={32} className="animate-spin text-[#8b5cf6] opacity-60" />
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] animate-pulse block">Analyzing Crossover Logic...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center py-6 gap-4">
            <AlertTriangle size={36} className="text-amber-500" />
            <div className="text-center">
              <h4 className="text-[12px] font-black text-black uppercase tracking-[0.15em] mb-2">{error}</h4>
              <button onClick={fetchExplanation} className="px-6 py-2.5 bg-[#8b5cf6] text-white rounded-lg font-black text-[9px] uppercase tracking-[0.15em] shadow-xl">
                Re-Analyze Bridge
              </button>
            </div>
          </div>
        ) : (
          <div className={`prose prose-sm max-w-none text-justify hyphens-auto break-words
            prose-p:leading-relaxed prose-p:text-[14px]
            prose-strong:text-[#8b5cf6] prose-strong:font-black
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
            prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-[11px]
            prose-blockquote:border-l-4 prose-blockquote:border-[#8b5cf6]/25 prose-blockquote:p-3 prose-blockquote:rounded-r-lg
            ${
              isZenMode
                ? 'prose-invert text-slate-200 prose-p:text-slate-300 prose-headings:text-white prose-li:text-slate-300 prose-code:bg-white/10 prose-code:text-white prose-blockquote:bg-white/[0.02]'
                : 'prose-slate text-slate-800 prose-p:text-slate-600 prose-headings:text-black prose-li:text-slate-600 prose-code:bg-slate-200/50 prose-code:text-[#8b5cf6] prose-blockquote:bg-slate-100/50'
            }
          `}>
            <ReactMarkdown>{explanation || `SARA is scanning the synaptic connections between **${fromNodeLabel}** and **${toNodeLabel}**...`}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
