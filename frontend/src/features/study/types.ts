export interface ConceptNode {
  id: string;
  label: string;
  description: string;
  depth: number;
  parentId?: string;
  children?: string[];
  connections?: string[];
}

export interface ConceptMap {
  centralConcept: string;
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
}

export type VisualMode = 'mindmap' | 'hierarchy' | 'network' | 'flow' | 'tree' | 'radial' | 'nexus' | 'architect' | 'chronos' | 'ladder' | 'matrix' | 'checklist' | 'orbit' | 'cascade' | 'spiral' | 'cluster' | 'bridge' | 'fractal' | 'galaxy' | 'dna' | 'constellation' | 'pulse' | 'quantum' | 'mosaic' | 'palace';
export type ComplexityLevel = 'spark' | 'snapshot' | 'overview' | 'detailed' | 'deep' | 'mastery' | 'infinite';
export type StudyLens = 'roadmap' | 'foundations' | 'practice' | 'exam' | 'pitfalls' | 'feynman' | 'sherlock' | 'einstein' | 'sprint' | 'debate';
export type MasteryStatus = 'unvisited' | 'studying' | 'mastered';
export type ScholarPersona = 'visionary' | 'analyst' | 'builder' | 'challenger' | 'storyteller' | 'strategist' | 'hacker';
export type SoundRoomMode = 'muted' | 'binaural' | 'solfeggio' | 'cosmic';

export interface NeuralSynthesizerProps {
  moduleTitle: string;
  moduleContent: string | null;
  keyConcepts: string[];
  generatedContent?: string;
  initialMap?: ConceptMap;
  onNodeClick?: (node: ConceptNode) => void;
  onFullScreenToggle?: () => void;
  isFullScreen?: boolean;
  focusMode?: 'content' | 'split';
  isZenMode?: boolean;
  pingNodeId?: string | null;
  onTuneRoadmapClick?: () => void;
  initialChallengeActive?: boolean;
}

export interface ConceptMapRendererProps {
  conceptMap: ConceptMap;
  mode: VisualMode;
  onNodeClick: (node: ConceptNode) => void;
  highlightedNode?: string | null;
  isZenMode?: boolean;
  pingNodeId?: string | null;
  moduleTitle: string;
  searchQuery?: string;
  masteryMap?: Map<string, MasteryStatus>;
  tourNodeId?: string | null;
  tourOrder?: string[];
  connectionFilter?: Set<string>;
  isHeatMapMode?: boolean;
  nodeTimeSpent?: Map<string, number>;
  onFoldBranch?: (nodeId: string) => void;
  onTestMastery?: (node: ConceptNode) => void;
  onAskSARA?: (node: ConceptNode) => void;
  zoomScale?: number;
  activeChallengeNodeId?: string | null;
  onChallengeEnd?: () => void;
  scholarPersona?: ScholarPersona;
  soundRoomMode?: SoundRoomMode;
  onSoundRoomModeChange?: (mode: SoundRoomMode) => void;
  activeLensFilter?: 'none' | 'burnout' | 'freeze';
  onDefrostNode?: (nodeId: string) => void;
}

export const NODE_COLORS = [
  { fill: '#4e5bff', stroke: '#312e81', text: '#ffffff' },
  { fill: '#e0f2fe', stroke: '#0284c7', text: '#0369a1' },
  { fill: '#f5f3ff', stroke: '#c084fc', text: '#6b21a8' },
  { fill: '#f8fafc', stroke: '#94a3b8', text: '#334155' },
  { fill: '#f8fafc', stroke: '#cbd5e1', text: '#475569' },
];

export const ZEN_NODE_COLORS = [
  { fill: '#6366f1', stroke: '#4338ca', text: '#ffffff' },
  { fill: 'rgba(14, 165, 233, 0.16)', stroke: 'rgba(14, 165, 233, 0.5)', text: '#e0f2fe' },
  { fill: 'rgba(168, 85, 247, 0.16)', stroke: 'rgba(168, 85, 247, 0.5)', text: '#f3e8ff' },
  { fill: 'rgba(255, 255, 255, 0.06)', stroke: 'rgba(255, 255, 255, 0.22)', text: '#cbd5e1' },
  { fill: 'rgba(255, 255, 255, 0.04)', stroke: 'rgba(255, 255, 255, 0.15)', text: '#94a3b8' },
];

export type Point = { x: number; y: number };
export type NodeMetrics = { width: number; height: number; radius: number; fontSize: number; lineHeight: number; lines: string[] };
export type LayoutGraph = {
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
  rootId: string;
  childMap: Map<string, string[]>;
};

export const MAP_PADDING = 240;
