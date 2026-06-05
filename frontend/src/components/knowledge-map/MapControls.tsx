import React from 'react';
import { Search, GitBranch, Clock, Columns3, Map as MapIcon } from 'lucide-react';
import { MapViewMode } from '../../types';

const VIEW_MODES: Array<{ id: MapViewMode; label: string; icon: React.ReactNode }> = [
  { id: 'tree', label: 'Tree', icon: <MapIcon size={13} /> },
  { id: 'flow', label: 'Flow', icon: <GitBranch size={13} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={13} /> },
  { id: 'compare', label: 'Compare', icon: <Columns3 size={13} /> },
];

interface MapControlsProps {
  search: string;
  viewMode: MapViewMode;
  showDetails: boolean;
  isZenMode: boolean;
  isLoading: boolean;
  onSearchChange: (v: string) => void;
  onViewModeChange: (mode: MapViewMode) => void;
  onToggleDetails: () => void;
  onRegenerate: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  search,
  viewMode,
  showDetails,
  isZenMode,
  isLoading,
  onSearchChange,
  onViewModeChange,
  onToggleDetails,
  onRegenerate,
}) => {
  const border = isZenMode ? 'border-white/10' : 'border-slate-200';
  const bg = isZenMode ? 'bg-[#05070a]/95' : 'bg-white/95';

  return (
    <div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 ${border} ${bg} backdrop-blur-md`}>
      <div className="relative min-w-[140px] flex-1">
        <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search concepts…"
          className={`w-full rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-medium outline-none ${
            isZenMode ? 'bg-white/5 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'
          }`}
        />
      </div>

      <div className={`flex rounded-lg p-0.5 ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>
        {VIEW_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onViewModeChange(mode.id)}
            title={mode.label}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              viewMode === mode.id
                ? isZenMode ? 'bg-[#000666] text-white' : 'bg-white text-[#000666] shadow-sm'
                : isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onToggleDetails}
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
          showDetails
            ? isZenMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
            : isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>

      <button
        onClick={onRegenerate}
        disabled={isLoading}
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
          isZenMode ? 'text-indigo-400 hover:bg-white/5' : 'text-[#000666] hover:bg-slate-50'
        }`}
      >
        {isLoading ? 'Building…' : 'Rebuild'}
      </button>
    </div>
  );
};
