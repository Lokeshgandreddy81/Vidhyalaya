import React from 'react';
import { FileText } from 'lucide-react';

interface CitationProps {
  page: number;
  snippetText: string;
  onJumpToPage: (pageNumber: number) => void;
}

export const StudyDocCitation: React.FC<CitationProps> = ({ page, snippetText, onJumpToPage }) => {
  return (
    <div className="my-2 p-2.5 rounded-xl border border-slate-100 bg-white/80 shadow-sm hover:bg-white transition-all group text-left">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => onJumpToPage(page)}
          className="flex items-center gap-1.5 text-[10px] font-mono font-black text-indigo-600 uppercase tracking-wider cursor-pointer hover:text-indigo-500"
        >
          <FileText size={10} />
          <span>Reference: Page {page}</span>
        </button>
      </div>
      <p className="text-[11px] text-slate-500 italic line-clamp-2 leading-relaxed group-hover:text-slate-700">
        "{snippetText}"
      </p>
    </div>
  );
};
