import React from 'react';
import { ExternalLink, BookMarked, Globe } from 'lucide-react';
import { ContentCitation } from '../types';

interface SourcesPanelProps {
  citations: ContentCitation[];
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ citations }) => {
  if (!citations || citations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <BookMarked size={32} />
        </div>
        <h3 className="mb-2 text-lg font-black text-[#000666]">No Sources Needed</h3>
        <p className="max-w-[260px] text-sm font-medium leading-relaxed text-slate-500">
          This module was generated using base architectural knowledge without requiring live web search grounding.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Globe size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#000666]">
              Live Sources
            </h3>
            <p className="text-[10px] font-bold text-slate-400">
              {citations.length} Verified {citations.length === 1 ? 'Reference' : 'References'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-4">
          {citations.map((citation) => (
            <div 
              key={citation.index}
              className="group relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#000666] text-[10px] font-black text-white">
                    {citation.index}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 line-clamp-1">
                    {citation.domain || 'External Source'}
                  </span>
                </div>
                <a 
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#000666] transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Open <ExternalLink size={10} />
                </a>
              </div>
              
              <h4 className="text-[13px] font-bold leading-snug text-slate-800 line-clamp-2">
                {citation.title}
              </h4>
              
              {citation.snippet && (
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500 line-clamp-3">
                  "{citation.snippet}"
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center justify-center px-4 pb-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Powered by Google Search Grounding
          </p>
        </div>
      </div>
    </div>
  );
};
