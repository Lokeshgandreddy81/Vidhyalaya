import React from 'react';
import { FileCode, Terminal, HelpCircle, Code } from 'lucide-react';

interface SandboxFilesProps {
  files: string[];
  activeFile: string;
  onSelect: (name: string) => void;
  isZenMode?: boolean;
}

const SandboxFiles: React.FC<SandboxFilesProps> = ({ files, activeFile, onSelect, isZenMode }) => {
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop() || '';
    if (ext === 'js') return <Code size={12} className="text-amber-500" />;
    if (ext === 'css') return <Code size={12} className="text-cyan-400" />;
    if (ext === 'html') return <Code size={12} className="text-rose-500" />;
    if (ext === 'py') return <Code size={12} className="text-blue-500" />;
    return <FileCode size={12} className="text-slate-400" />;
  };

  return (
    <div className={`shrink-0 w-40 border-r flex flex-col select-none ${isZenMode ? 'border-white/10 bg-[#07080b]' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isZenMode ? 'border-white/10' : 'border-slate-200'}`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Explorer
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
        {files.map((name) => {
          const isActive = activeFile === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[11px] font-semibold transition-all cursor-pointer relative ${
                isActive
                  ? isZenMode
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-200/40'
                  : isZenMode
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    : 'text-slate-600 hover:bg-white hover:text-slate-800'
              }`}
            >
              {isActive && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-indigo-500 rounded" />
              )}
              <div className="shrink-0 flex items-center justify-center">
                {getFileIcon(name)}
              </div>
              <span className="truncate pr-1">{name}</span>
            </button>
          );
        })}
      </div>
      <div className={`px-4 py-3 border-t text-[10px] font-medium leading-none shrink-0 ${isZenMode ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400 bg-slate-50/30'}`}>
        <span className="flex items-center gap-1.5">
          <Terminal size={11} className="opacity-60" />
          <span>Active Challenge</span>
        </span>
      </div>
    </div>
  );
};

export default SandboxFiles;
