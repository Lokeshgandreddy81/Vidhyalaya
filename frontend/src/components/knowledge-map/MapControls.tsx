import React from 'react';
import { GitBranch, Network, Orbit, RefreshCw } from 'lucide-react';
import { MapViewMode } from '../../types';

const MODES: Array<{ id: MapViewMode; icon: React.ReactNode; label: string }> = [
  { id: 'orbit', icon: <Orbit size={16} />, label: 'Constellation' },
  { id: 'tree', icon: <Network size={16} />, label: 'Hierarchy' },
  { id: 'flow', icon: <GitBranch size={16} />, label: 'Mind Map' },
];

interface MapControlsProps {
  viewMode: MapViewMode;
  isLoading: boolean;
  onViewModeChange: (mode: MapViewMode) => void;
  onRegenerate: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  viewMode,
  isLoading,
  onViewModeChange,
  onRegenerate,
}) => (
  <div className="nm-toolbar" role="toolbar" aria-label="Map view controls">
    {MODES.map(mode => (
      <button
        key={mode.id}
        type="button"
        title={mode.label}
        aria-label={mode.label}
        aria-pressed={viewMode === mode.id}
        onClick={() => onViewModeChange(mode.id)}
        className={`nm-toolbar__btn ${viewMode === mode.id ? 'nm-toolbar__btn--active' : ''}`}
      >
        {mode.icon}
      </button>
    ))}
    <div className="nm-toolbar__divider" />
    <button
      type="button"
      title="Rebuild map"
      aria-label="Rebuild map"
      onClick={onRegenerate}
      disabled={isLoading}
      className="nm-toolbar__btn"
    >
      <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
    </button>
  </div>
);
