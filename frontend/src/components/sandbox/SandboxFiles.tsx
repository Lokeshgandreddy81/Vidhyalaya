import React from 'react';
import { FileCode, Plus } from 'lucide-react';

interface SandboxFilesProps {
  files: string[];
  activeFile: string;
  onSelect: (name: string) => void;
  isZenMode?: boolean;
}

const SandboxFiles: React.FC<SandboxFilesProps> = ({ files, activeFile, onSelect, isZenMode }) => (
  <div className={`shrink-0 w-36 border-r flex flex-col ${isZenMode ? 'border-white/10 bg-[#0d1117]' : 'border-slate-200 bg-slate-50'}`}>
    <div className={`px-3 py-2 border-b ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
      <span className={`text-[9px] font-bold uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Files
      </span>
    </div>
    <div className="flex-1 overflow-y-auto py-1">
      {files.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors ${
            activeFile === name
              ? isZenMode
                ? 'bg-white/10 text-white'
                : 'bg-white text-[#000666] shadow-sm'
              : isZenMode
                ? 'text-slate-400 hover:bg-white/5'
                : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <FileCode size={12} className="shrink-0 opacity-60" />
          <span className="truncate">{name}</span>
        </button>
      ))}
    </div>
    <div className={`px-3 py-2 border-t ${isZenMode ? 'border-white/10 text-slate-600' : 'border-slate-200 text-slate-300'}`}>
      <span className="flex items-center gap-1 text-[9px]">
        <Plus size={10} />
        Max 1 file per exercise
      </span>
    </div>
  </div>
);

export default SandboxFiles;
