import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  Thermometer, Eye, ShieldQuestion, FolderTree, Activity, MessageCircle,
  Network, X, Sparkles, Play, Flame, Volume2, VolumeX, CheckCircle2, Loader
} from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { chatWithTutor } from '../../../services/geminiService';
import type { ConceptNode, ConceptMap, VisualMode, MasteryStatus, ScholarPersona, SoundRoomMode, Point, NodeMetrics, LayoutGraph } from '../types';
import { NODE_COLORS, ZEN_NODE_COLORS, MAP_PADDING } from '../types';
import { buildLayoutGraph, centerPositions, resolveNodeOverlaps, getViewBox, getEdgePoint, getNodeMetrics, wrapLabel, getHeatColor, getNodeStyle, computeNodePositions } from '../utils/layout';
import { CodeRainCanvas } from '../utils/sound';
import { Scene3D } from './Scene3D';
import { useControls } from 'react-zoom-pan-pinch';


const getVirtualFrom = (from: Point, to: Point, mode: string): Point => {
  if (['hierarchy', 'tree', 'ladder'].includes(mode)) {
    return { x: to.x, y: from.y };
  }
  if (['flow', 'architect', 'matrix', 'checklist', 'dna'].includes(mode)) {
    return { x: from.x, y: to.y };
  }
  return from;
};

const getNodeMetricsForEdge = (node: ConceptNode, zoomScale: number): NodeMetrics => {
  const metrics = getNodeMetrics(node);
  if (zoomScale < 0.65) {
    return {
      width: 32,
      height: 32,
      radius: 16,
      fontSize: 9,
      lineHeight: 12,
      lines: []
    };
  }
  if (zoomScale > 1.35) {
    const cardW = metrics.width + 80;
    const cardH = metrics.height + 65;
    return {
      width: cardW,
      height: cardH,
      radius: 16, // Match the rx={16} of the Deep-Dive cards to trigger AABB rectangle intersection math
      fontSize: metrics.fontSize,
      lineHeight: metrics.lineHeight,
      lines: metrics.lines
    };
  }
  return metrics;
};

const ConceptMapRenderer: React.FC<{
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
  dimensionMode?: '2D' | '3D';
  onRelationshipClick?: (rel: { from: string; to: string; label: string }) => void;
  autoMorphMode?: boolean;
  onMorphProgress?: (progress: number) => void;
  isSynthesizingApiActive?: boolean;
}> = ({ conceptMap, mode: _mode, dimensionMode = '2D', onNodeClick, highlightedNode, isZenMode = false, pingNodeId, moduleTitle, searchQuery, masteryMap, tourNodeId, tourOrder = [], connectionFilter, isHeatMapMode = false, nodeTimeSpent, onFoldBranch, onTestMastery, onAskSARA, zoomScale = 1, activeChallengeNodeId, onChallengeEnd, scholarPersona = 'visionary', soundRoomMode = 'muted', onSoundRoomModeChange, activeLensFilter = 'none', onDefrostNode, onRelationshipClick, autoMorphMode = false, onMorphProgress, isSynthesizingApiActive = false }) => {
  const { state: transformState, setTransform } = useControls();
  const [viewportBox, setViewportBox] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // ── AUTO-MORPH: 7 DRAMATICALLY different academic shapes ──
  const MORPH_SEQUENCE: Array<{ mode: string; label: string; icon: string; color: string; custom?: string }> = [
    { mode: 'radial',    label: 'Neural Web',       icon: '⬡', color: '#8b5cf6' },
    { mode: 'flow',      label: 'Knowledge Flow',   icon: '→', color: '#0ea5e9' },
    { mode: 'radial',    label: 'Fibonacci Bloom',  icon: '✿', color: '#f59e0b', custom: 'fibonacci' },
    { mode: 'hierarchy', label: 'Scholar Tree',      icon: '🌳', color: '#10b981' },
    { mode: 'radial',    label: 'Cosmic Grid',      icon: '⊞', color: '#ec4899', custom: 'grid' },
    { mode: 'tree',      label: 'Academic Tree',     icon: '🌲', color: '#0ea5e9' },
    { mode: 'radial',    label: 'Sine Wave',        icon: '∿', color: '#6366f1', custom: 'wave' },
  ];
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const [fps, setFps] = useState(60);
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;
    let lastTime = performance.now();
    let frames = 0;
    let animId: number;
    const checkFps = () => {
      const now = performance.now();
      frames++;
      if (now > lastTime + 1000) {
        const currentFps = Math.round((frames * 1000) / (now - lastTime));
        setFps(currentFps);
        frames = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(checkFps);
    };
    animId = requestAnimationFrame(checkFps);
    return () => cancelAnimationFrame(animId);
  }, [prefersReducedMotion]);

  const [morphIndex, setMorphIndex] = useState(0);
  const [morphLabel, setMorphLabel] = useState<string | null>(null);
  const [morphLabelVisible, setMorphLabelVisible] = useState(false);
  const [morphProgress, setMorphProgress] = useState(0);
  const [isInterpolating, setIsInterpolating] = useState(false);
  const lastInteractionRef = useRef<number>(0);
  const morphTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);




  const isTourRunning = !!tourNodeId;
  const activeTourNode = tourNodeId ? (conceptMap?.nodes || []).find(n => n.id === tourNodeId) : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; z?: number }>>(new Map());
  const layoutGraph = React.useMemo(() => buildLayoutGraph(conceptMap), [conceptMap]);

  const tourPathD = React.useMemo(() => {
    if (!tourNodeId || tourOrder.length < 2) return '';
    const points: Array<{ x: number, y: number }> = [];
    tourOrder.forEach(id => {
      const pos = positions.get(id);
      if (pos) points.push(pos);
    });
    if (points.length < 2) return '';
    return points.reduce((acc, p, idx) => {
      if (idx === 0) return `M ${p.x} ${p.y}`;
      const prev = points[idx - 1];
      const midX = (prev.x + p.x) / 2;
      const midY = (prev.y + p.y) / 2;
      return `${acc} Q ${prev.x} ${prev.y}, ${midX} ${midY} T ${p.x} ${p.y}`;
    }, '');
  }, [tourNodeId, tourOrder, positions]);

  const [hoveredRelation, setHoveredRelation] = useState<{ from: string; to: string } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [hoveredLegendDepth, setHoveredLegendDepth] = useState<number | null>(null);
  // Connection lens filter: 'structural' | 'prereq' | 'lateral'
  const [activeLensFilters, setActiveLensFilters] = useState<Set<string>>(new Set(['structural', 'prereq', 'lateral']));
  const [audioFreqScale, setAudioFreqScale] = useState(1);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (soundRoomMode && soundRoomMode !== 'muted') {
        const time = Date.now() * 0.006;
        setAudioFreqScale(1 + Math.sin(time) * 0.04 + Math.cos(time * 1.5) * 0.02);
      } else {
        setAudioFreqScale(1);
      }
      animId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animId);
  }, [soundRoomMode]);

  // Phase 10: State and Ref Declarations
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const isAudioEnabled = soundRoomMode !== 'muted';
  const toggleAudio = () => {
    if (!onSoundRoomModeChange) return;
    if (soundRoomMode === 'muted') {
      onSoundRoomModeChange('binaural');
    } else if (soundRoomMode === 'binaural') {
      onSoundRoomModeChange('solfeggio');
    } else if (soundRoomMode === 'solfeggio') {
      onSoundRoomModeChange('cosmic');
    } else {
      onSoundRoomModeChange('muted');
    }
  };
  const [speakingNodeId, setSpeakingNodeId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; opacity: number }>>([]);

  // Custom HUD and Lateral Bridgings States
  const [chronosDepth, setChronosDepth] = useState<number>(4);
  const [entangledPair, setEntangledPair] = useState<{ from: ConceptNode; to: ConceptNode; explanation?: string } | null>(null);
  const [entangleStartNode, setEntangleStartNode] = useState<ConceptNode | null>(null);
  const [isEntanglingApi, setIsEntanglingApi] = useState(false);

  const activeTheme = React.useMemo(() => {
    const zen = isZenMode;
    switch (scholarPersona) {
      case 'hacker':
      case 'strategist':
        return {
          id: 'hacker',
          primary: '#10b981',
          bg: zen ? '#030a06' : '#f0fdf4',
          gridStroke: zen ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.08)',
          gridDotFill: zen ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.15)',
          glowColor: zen ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.04)',
          fontFamily: 'monospace',
          textClass: 'font-mono tracking-tight text-[12.5px] font-semibold',
          border: zen ? 'border-emerald-500/25 text-emerald-350 bg-[#030a06]/95 shadow-emerald-950/20' : 'border-emerald-200 text-emerald-700 bg-white/95 shadow-slate-200/20',
        };
      case 'builder':
      case 'analyst':
        return {
          id: 'builder',
          primary: '#d97706',
          bg: zen ? '#0a0b0e' : '#fffbeb',
          gridStroke: zen ? 'rgba(217, 119, 6, 0.05)' : 'rgba(217, 119, 6, 0.08)',
          gridDotFill: zen ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.12)',
          glowColor: zen ? 'rgba(217, 119, 6, 0.12)' : 'rgba(217, 119, 6, 0.04)',
          fontFamily: 'sans-serif',
          textClass: 'font-sans tracking-normal font-extrabold text-[12.5px]',
          border: zen ? 'border-amber-500/25 text-amber-300 bg-[#0a0b0e]/95 shadow-amber-950/20' : 'border-amber-200 text-amber-700 bg-white/95 shadow-slate-200/20',
        };
      case 'challenger':
        return {
          id: 'einstein',
          primary: '#3b82f6',
          bg: zen ? '#020305' : '#f8fafc',
          gridStroke: zen ? 'rgba(59, 130, 246, 0.03)' : 'rgba(59, 130, 246, 0.06)',
          gridDotFill: zen ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.1)',
          glowColor: zen ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.03)',
          fontFamily: 'serif',
          textClass: 'font-serif italic tracking-wide text-[13.5px]',
          border: zen ? 'border-blue-500/15 text-blue-300 bg-[#020305]/95 shadow-blue-950/20' : 'border-blue-200 text-blue-700 bg-white/95 shadow-slate-200/20',
        };
      case 'visionary':
      case 'storyteller':
      default:
        return {
          id: 'visionary',
          primary: '#8b5cf6',
          bg: zen ? '#050410' : '#faf5ff',
          gridStroke: zen ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.08)',
          gridDotFill: zen ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.15)',
          glowColor: zen ? 'rgba(139, 92, 246, 0.14)' : 'rgba(139, 92, 246, 0.05)',
          fontFamily: 'sans-serif',
          textClass: 'font-sans tracking-wide font-black text-[12.5px]',
          border: zen ? 'border-purple-500/25 text-purple-300 bg-[#050410]/95 shadow-purple-950/20' : 'border-purple-200 text-purple-700 bg-white/95 shadow-slate-200/20',
        };
    }
  }, [scholarPersona, isZenMode]);

  const [challenge, setChallenge] = useState<{
    active: boolean;
    rootId: string;
    nodes: Array<{
      id: string;
      label: string;
      description: string;
      depth: number;
      originalX: number;
      originalY: number;
      currentX: number;
      currentY: number;
      isPlaced: boolean;
    }>;
  } | null>(null);
  const [draggedNode, setDraggedNode] = useState<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number; scaleX: number; scaleY: number } | null>(null);

  // ── Free Node Drag (always-on, non-challenge mode) ──
  const [freeNodeDrag, setFreeNodeDrag] = useState<{
    id: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    scaleX: number;
    scaleY: number;
    didMove: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const continuousOscsRef = useRef<OscillatorNode[]>([]);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hoveredNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  const freeNodeDragRef = useRef<any>(null);
  useEffect(() => {
    freeNodeDragRef.current = freeNodeDrag;
  }, [freeNodeDrag]);

  const challengeActiveRef = useRef<boolean>(false);
  useEffect(() => {
    challengeActiveRef.current = !!challenge?.active;
  }, [challenge?.active]);

  useEffect(() => {
    if (!autoMorphMode || prefersReducedMotion) {
      if (morphTimerRef.current) clearInterval(morphTimerRef.current);
      setMorphProgress(0);
      onMorphProgress?.(0);
      return;
    }

    // Show initial badge
    setMorphLabel(MORPH_SEQUENCE[morphIndex].label);
    setMorphLabelVisible(true);
    const badgeTimeout = setTimeout(() => setMorphLabelVisible(false), 2800);

    morphTimerRef.current = setInterval(() => {
      const isInteracting = 
        hoveredNodeIdRef.current !== null || 
        freeNodeDragRef.current !== null || 
        challengeActiveRef.current || 
        (Date.now() - lastInteractionRef.current < 3000);

      if (isInteracting) {
        return;
      }

      setMorphProgress(prev => {
        const next = prev + (100 / (6000 / 100)); // ~1.667% per 100ms
        onMorphProgress?.(Math.min(100, Math.round(next)));
        if (next >= 100) {
          setMorphIndex(idx => {
            const nextIdx = (idx + 1) % MORPH_SEQUENCE.length;
            setMorphLabel(MORPH_SEQUENCE[nextIdx].label);
            setMorphLabelVisible(true);
            setTimeout(() => setMorphLabelVisible(false), 2800);
            return nextIdx;
          });
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (morphTimerRef.current) clearInterval(morphTimerRef.current);
      clearTimeout(badgeTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMorphMode, prefersReducedMotion]);

  const mode = autoMorphMode && !prefersReducedMotion ? MORPH_SEQUENCE[morphIndex].mode : (_mode as string);



  // ── Phase 10: 3D Cosmic Parallax Handlers ──
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    lastInteractionRef.current = Date.now();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  // ── Phase 10: Spatial Web Audio Engine ──
  const initAudio = () => {
    if (audioCtxRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;
  };

  const startSoundHum = useCallback(() => {
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    continuousOscsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
    });
    continuousOscsRef.current = [];

    if (soundRoomMode === 'muted') return;

    try {
      if (soundRoomMode === 'binaural') {
        const oscL = ctx.createOscillator();
        const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const gainL = ctx.createGain();
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(120, ctx.currentTime);
        gainL.gain.setValueAtTime(0.04, ctx.currentTime);

        if (panL) {
          panL.pan.setValueAtTime(-1, ctx.currentTime);
          oscL.connect(gainL).connect(panL).connect(masterGain);
        } else {
          oscL.connect(gainL).connect(masterGain);
        }

        const oscR = ctx.createOscillator();
        const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const gainR = ctx.createGain();
        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(126, ctx.currentTime);
        gainR.gain.setValueAtTime(0.04, ctx.currentTime);

        if (panR) {
          panR.pan.setValueAtTime(1, ctx.currentTime);
          oscR.connect(gainR).connect(panR).connect(masterGain);
        } else {
          oscR.connect(gainR).connect(masterGain);
        }

        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc.type = 'triangle';
        padOsc.frequency.setValueAtTime(60, ctx.currentTime);
        padGain.gain.setValueAtTime(0.02, ctx.currentTime);
        padOsc.connect(padGain).connect(masterGain);

        oscL.start();
        oscR.start();
        padOsc.start();
        continuousOscsRef.current = [oscL, oscR, padOsc];
      } else if (soundRoomMode === 'solfeggio') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.006, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        osc.connect(gain).connect(masterGain);

        osc.start();
        lfo.start();
        continuousOscsRef.current = [osc, lfo];
      } else if (soundRoomMode === 'cosmic') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, ctx.currentTime);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(55.4, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(110, ctx.currentTime);
        filter.Q.setValueAtTime(2.5, ctx.currentTime);

        const sweepLfo = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweepLfo.frequency.setValueAtTime(0.08, ctx.currentTime);
        sweepGain.gain.setValueAtTime(40, ctx.currentTime);

        sweepLfo.connect(sweepGain);
        sweepGain.connect(filter.frequency);

        gain.gain.setValueAtTime(0.012, ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(masterGain);

        osc1.start();
        osc2.start();
        sweepLfo.start();

        continuousOscsRef.current = [osc1, osc2, sweepLfo];
      }
    } catch (e) {
      console.error('Failed to trigger soundscape:', e);
    }
  }, [soundRoomMode]);

  const stopThetaHum = () => {
    continuousOscsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
    });
    continuousOscsRef.current = [];
  };

  useEffect(() => {
    if (soundRoomMode && soundRoomMode !== 'muted') {
      initAudio();
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            startSoundHum();
          });
        } else {
          startSoundHum();
        }
      }
    } else {
      stopThetaHum();
    }
  }, [soundRoomMode, startSoundHum]);

  const triggerEntanglement = async (nodeA: ConceptNode, nodeB: ConceptNode) => {
    if (nodeA.id === nodeB.id) {
      toast.warning('A concept cannot be entangled with itself! Select a different concept.');
      return;
    }
    setEntangledPair({ from: nodeA, to: nodeB, explanation: '' });
    setIsEntanglingApi(true);

    // Shoot initial activation sparks!
    const posA = positions.get(nodeA.id);
    const posB = positions.get(nodeB.id);
    if (posA) triggerSpark(posA.x, posA.y, '#a78bfa');
    if (posB) triggerSpark(posB.x, posB.y, '#f472b6');

    try {
      const prompt = `Explain the non-obvious, advanced conceptual connection, quantum entanglement, and dependency bridge between the concept "${nodeA.label}" and the concept "${nodeB.label}" inside the subject "${moduleTitle}". How do these two separate domains enrich or Entangle with each other? Provide a concise, highly creative, builder-level scholarly response.`;
      const responseObj = await chatWithTutor([], prompt, 'SYSTEM_AUTH: QUANTUM_ENTANGLER');
      setEntangledPair({ from: nodeA, to: nodeB, explanation: responseObj.text || '' });
      toast.success('Quantum Entanglement calibrated successfully!');

      // Shoot double success sparks!
      if (posA && posB) {
        setTimeout(() => triggerSpark((posA.x + posB.x)/2, (posA.y + posB.y)/2, '#e9d5ff'), 200);
        setTimeout(() => triggerSpark(posA.x, posA.y, '#10b981'), 400);
        setTimeout(() => triggerSpark(posB.x, posB.y, '#10b981'), 400);
      }
    } catch (e) {
      setEntangledPair({
        from: nodeA,
        to: nodeB,
        explanation: `Failed to synthesize bridging. But logically, ${nodeA.label} and ${nodeB.label} create a cross-functional leverage point where structural foundations connect lateral disciplines.`
      });
    } finally {
      setIsEntanglingApi(false);
    }
  };

  const playChime = useCallback((depth: number) => {
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || ctx.state === 'suspended' || !masterGain) return;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const baseFreq = 261.63 * Math.pow(1.33, depth);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      chimeGain.gain.setValueAtTime(0.08, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(chimeGain);
      chimeGain.connect(masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.3);
      osc2.stop(ctx.currentTime + 1.3);
    } catch (e) {}
  }, []);

  // ── Phase 10: Spatial TTS Narration ──
  const speakConcept = useCallback((node: ConceptNode) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speakingNodeId === node.id) {
      window.speechSynthesis.cancel();
      setSpeakingNodeId(null);
      return;
    }
    window.speechSynthesis.cancel();

    const text = `${node.label}. ${node.description || ''}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const selectVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                        voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                        voices.find(v => v.lang.startsWith('en'));
    if (selectVoice) utterance.voice = selectVoice;

    utterance.onend = () => setSpeakingNodeId(null);
    utterance.onerror = () => setSpeakingNodeId(null);

    speechUtteranceRef.current = utterance;
    setSpeakingNodeId(node.id);
    window.speechSynthesis.speak(utterance);
  }, [speakingNodeId]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopThetaHum();
    };
  }, []);

  // ── Phase 10: Neon Spark Particle Physics ──
  const triggerSpark = useCallback((x: number, y: number, color: string = '#6366f1') => {
    const count = 16;
    const newParticles: Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; opacity: number }> = [];
    const baseId = Date.now() + Math.random();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      newParticles.push({
        id: baseId + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        opacity: 1
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const requestRef = useRef<number | null>(null);
  useEffect(() => {
    const update = () => {
      setParticles(prev => {
        if (prev.length === 0) return prev;
        return prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.94,
            vy: p.vy * 0.94 + 0.08, // gravity/drift
            size: Math.max(0.1, p.size - 0.06),
            opacity: Math.max(0, p.opacity - 0.015)
          }))
          .filter(p => p.opacity > 0 && p.size > 0.1);
      });
      requestRef.current = requestAnimationFrame(update);
    };
    if (particles.length > 0) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [particles.length]);

  // ── Phase 10: Relationship Lab Drag and Drop handlers ──
  const startChallenge = (rootNode: ConceptNode) => {
    const branchNodes = new Set<string>([rootNode.id]);
    const queue = [rootNode.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = layoutGraph.childMap.get(currentId) || [];
      children.forEach(childId => {
        if (!branchNodes.has(childId)) {
          branchNodes.add(childId);
          queue.push(childId);
        }
      });
    }

    const challengeNodes = visibleNodes
      .filter(n => branchNodes.has(n.id))
      .map((n) => {
        const pos = positions.get(n.id) || { x: 0, y: 0 };
        const angle = Math.random() * Math.PI * 2;
        const radius = 220 + Math.random() * 140;
        return {
          id: n.id,
          label: n.label,
          description: n.description || '',
          depth: n.depth,
          originalX: pos.x,
          originalY: pos.y,
          currentX: pos.x + Math.cos(angle) * radius,
          currentY: pos.y + Math.sin(angle) * radius,
          isPlaced: n.id === rootNode.id // Root is already placed!
        };
      });

    setChallenge({
      active: true,
      rootId: rootNode.id,
      nodes: challengeNodes
    });
  };

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const nodeItem = challenge?.nodes.find(n => n.id === nodeId);
    if (!nodeItem || nodeItem.isPlaced) return;

    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const { width: vW, height: vH } = getViewBox(visibleNodes, positions, dimensions);
    const scaleX = vW / rect.width;
    const scaleY = vH / rect.height;

    setDraggedNode({
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: nodeItem.currentX,
      offsetY: nodeItem.currentY,
      scaleX,
      scaleY
    });
    playChime(1.5);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    lastInteractionRef.current = Date.now();
    // ── Challenge mode drag ──
    if (draggedNode && challenge) {
      const deltaScreenX = e.clientX - draggedNode.startX;
      const deltaScreenY = e.clientY - draggedNode.startY;
      const deltaX = deltaScreenX * draggedNode.scaleX;
      const deltaY = deltaScreenY * draggedNode.scaleY;
      setChallenge(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n => {
            if (n.id === draggedNode.id) {
              return { ...n, currentX: draggedNode.offsetX + deltaX, currentY: draggedNode.offsetY + deltaY };
            }
            return n;
          })
        };
      });
      return;
    }

    // ── Free node drag ──
    if (!freeNodeDrag) return;
    const deltaScreenX = e.clientX - freeNodeDrag.startClientX;
    const deltaScreenY = e.clientY - freeNodeDrag.startClientY;
    const hasMoved = Math.hypot(deltaScreenX, deltaScreenY) > 4;
    const deltaX = deltaScreenX * freeNodeDrag.scaleX;
    const deltaY = deltaScreenY * freeNodeDrag.scaleY;
    setFreeNodeDrag(prev => prev ? { ...prev, didMove: hasMoved } : prev);
    if (!hasMoved) return;
    setPositions(prev => {
      const next = new Map(prev);
      next.set(freeNodeDrag.id, {
        x: freeNodeDrag.originX + deltaX,
        y: freeNodeDrag.originY + deltaY,
      });
      return next;
    });
  };

  const handlePointerUp = () => {
    // ── Free node drag release ──
    if (freeNodeDrag) {
      const wasDrag = freeNodeDrag.didMove;
      setFreeNodeDrag(null);
      // If the pointer barely moved, treat it as a click — do nothing here;
      // the onClick on the node will fire naturally.
      if (wasDrag) return; // suppress click-through after drag
    }

    if (!draggedNode || !challenge) return;
    const nodeId = draggedNode.id;
    setDraggedNode(null);

    const nodeItem = challenge.nodes.find(n => n.id === nodeId);
    if (!nodeItem) return;

    const distance = Math.hypot(nodeItem.currentX - nodeItem.originalX, nodeItem.currentY - nodeItem.originalY);
    if (distance < 55) {
      setChallenge(prev => {
        if (!prev) return prev;
        const updatedNodes = prev.nodes.map(n => {
          if (n.id === nodeId) {
            return { ...n, currentX: n.originalX, currentY: n.originalY, isPlaced: true };
          }
          return n;
        });

        const allPlaced = updatedNodes.every(n => n.isPlaced);
        if (allPlaced) {
          setTimeout(() => {
            triggerSpark(nodeItem.originalX, nodeItem.originalY, '#10b981');
            setTimeout(() => triggerSpark(nodeItem.originalX - 80, nodeItem.originalY - 40, '#6366f1'), 200);
            setTimeout(() => triggerSpark(nodeItem.originalX + 80, nodeItem.originalY + 40, '#f59e0b'), 400);
          }, 100);
          updatedNodes.forEach(n => {
            if (masteryMap) {
              const nextMap = new Map(masteryMap);
              nextMap.set(n.id, 'mastered');
              // Let parent update
            }
          });
          setTimeout(() => {
            setChallenge(null);
            onChallengeEnd?.();
          }, 2400);
        } else {
          triggerSpark(nodeItem.originalX, nodeItem.originalY, '#10b981');
        }
        return { ...prev, nodes: updatedNodes };
      });
      playChime(3);
    } else {
      setChallenge(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n => {
            if (n.id === nodeId) {
              const angle = Math.random() * Math.PI * 2;
              const radius = 200 + Math.random() * 80;
              return {
                ...n,
                currentX: n.originalX + Math.cos(angle) * radius,
                currentY: n.originalY + Math.sin(angle) * radius
              };
            }
            return n;
          })
        };
      });
      playChime(0.5);
    }
  };

  const handleNodeClick = (node: ConceptNode, x: number, y: number) => {
    playChime(node.depth);
    const mastery = masteryMap?.get(node.id) ?? 'unvisited';

    // Cognitive Freeze Defrost handling
    const isFrozen = activeLensFilter === 'freeze' && mastery === 'unvisited' && node.depth > 0;
    if (isFrozen) {
      if (onDefrostNode) {
        onDefrostNode(node.id);
        const color = '#06b6d4'; // Frost blue spark
        triggerSpark(x, y, color);
        return;
      }
    }

    const color = mastery === 'mastered' ? '#10b981' : mastery === 'studying' ? '#6366f1' : (isZenMode ? '#a5b4fc' : '#4e5bff');
    triggerSpark(x, y, color);

    if (entangleStartNode) {
      if (entangleStartNode.id === node.id) {
        setEntangleStartNode(null);
        toast.info('Quantum Entanglement selection reset.');
        return;
      }
      triggerEntanglement(entangleStartNode, node);
      setEntangleStartNode(null);
      return;
    }

    onNodeClick(node);
  };

  // Phase 9: Cinematic Entrance
  const [entranceProgress, setEntranceProgress] = useState(0);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const entranceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 9: AI Hover Tooltip
  const [hoverTooltip, setHoverTooltip] = useState<{ nodeId: string; summary: string; x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const summaryCache = useRef<Map<string, string>>(new Map());

  // Phase 9: Radial Command Menu
  const [radialMenu, setRadialMenu] = useState<{ node: ConceptNode; x: number; y: number } | null>(null);

  const toggleLensFilter = (lens: string) => {
    setActiveLensFilters(prev => {
      const next = new Set(prev);
      if (next.has(lens)) { next.delete(lens); } else { next.add(lens); }
      return next;
    });
  };

  // Phase 9: Trigger cinematic entrance when positions change
  useEffect(() => {
    if (positions.size > 0) {
      setEntranceProgress(0);
      setEntranceComplete(false);
      if (entranceTimerRef.current) clearInterval(entranceTimerRef.current);
      let tick = 0;
      const totalTicks = 20;
      entranceTimerRef.current = setInterval(() => {
        tick++;
        setEntranceProgress(tick / totalTicks);
        if (tick >= totalTicks) {
          if (entranceTimerRef.current) clearInterval(entranceTimerRef.current);
          setEntranceComplete(true);
        }
      }, 60);
      return () => { if (entranceTimerRef.current) clearInterval(entranceTimerRef.current); };
    }
  }, [positions]);

  // Phase 9: AI hover tooltip logic
  const startHoverTooltip = useCallback((node: ConceptNode, svgX: number, svgY: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(async () => {
      const cached = summaryCache.current.get(node.id);
      if (cached) {
        setHoverTooltip({ nodeId: node.id, summary: cached, x: svgX, y: svgY });
        return;
      }
      try {
        const respObj = await chatWithTutor([], `In exactly 2 sentences, explain "${node.label}" in the context of "${moduleTitle}". Be concise and precise.`, `TOOLTIP // ${node.label}`);
        const summary = (respObj.text || '').slice(0, 200);
        summaryCache.current.set(node.id, summary);
        setHoverTooltip({ nodeId: node.id, summary, x: svgX, y: svgY });
      } catch { /* silent */ }
    }, 1200);
  }, [moduleTitle]);

  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverTooltip(null);
  }, []);

  // Dismiss radial menu on click-away
  useEffect(() => {
    if (!radialMenu) return;
    const dismiss = () => setRadialMenu(null);
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [radialMenu]);

  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isMatch = (node: ConceptNode) => {
    if (!searchQuery || searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase().trim();
    return (node.label || '').toLowerCase().includes(query) ||
           (node.description || '').toLowerCase().includes(query);
  };

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPercentX = (e.clientX - rect.left) / rect.width;
    const clickPercentY = (e.clientY - rect.top) / rect.height;

    const clickX = minX + clickPercentX * vW;
    const clickY = minY + clickPercentY * vH;

    const scale = transformState.scale;
    const containerRect = containerRef.current.getBoundingClientRect();

    const nextX = containerRect.width / 2 - clickX * scale;
    const nextY = containerRect.height / 2 - clickY * scale;

    setTransform(nextX, nextY, scale, 350, 'easeOut');
  };

  // ── SARA Global Awareness (Neural-Chat Link) ──
  useEffect(() => {
    if (layoutGraph.nodes.length > 0) {
      (window as any).__NEURAL_NODES__ = layoutGraph.nodes;
    }
  }, [layoutGraph.nodes]);

  // Reactive dimension tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setDimensions({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);

  const { visibleNodes, visibleRelationships, visibleChildMap } = React.useMemo(() => {
    if (!layoutGraph.nodes.length) {
      return { visibleNodes: [], visibleRelationships: [], visibleChildMap: new Map<string, string[]>() };
    }

    const isNodeVisible = (nodeId: string): boolean => {
      let current = layoutGraph.nodes.find(n => n.id === nodeId);
      while (current && current.parentId) {
        if (collapsedNodeIds.has(current.parentId)) {
          return false;
        }
        current = layoutGraph.nodes.find(n => n.id === current.parentId);
      }
      return true;
    };

    const nodes = layoutGraph.nodes.filter(n => isNodeVisible(n.id));
    const nodeIds = new Set(nodes.map(n => n.id));
    const relationships = layoutGraph.relationships.filter(
      r => nodeIds.has(r.from) && nodeIds.has(r.to)
    );

    const childMap = new Map<string, string[]>();
    nodes.forEach(node => childMap.set(node.id, []));
    layoutGraph.childMap.forEach((children, parentId) => {
      if (nodeIds.has(parentId)) {
        const filtered = children.filter(childId => nodeIds.has(childId));
        childMap.set(parentId, filtered);
      }
    });

    return { visibleNodes: nodes, visibleRelationships: relationships, visibleChildMap: childMap };
  }, [layoutGraph, collapsedNodeIds]);

  // Hook listening to parent challenge trigger
  useEffect(() => {
    if (activeChallengeNodeId && positions.size > 0) {
      const rootNode = visibleNodes.find(n => n.id === activeChallengeNodeId);
      if (rootNode) {
        startChallenge(rootNode);
      }
    } else if (!activeChallengeNodeId) {
      setChallenge(null);
    }
  }, [activeChallengeNodeId, visibleNodes, positions]);

  useLayoutEffect(() => {
    if (!visibleNodes.length) return;
    const newPositions = computeNodePositions(
      visibleNodes,
      visibleChildMap,
      layoutGraph.rootId,
      mode,
      dimensionMode
    );

    // ── Custom morph shape overrides (produce COMPLETELY different layouts) ──
    if (autoMorphMode && MORPH_SEQUENCE[morphIndex]?.custom) {
      const customShape = MORPH_SEQUENCE[morphIndex].custom;
      // Sort nodes: root first, then by depth, then alphabetically for stable order
      const sorted = [...visibleNodes].sort((a, b) => {
        if (a.depth !== b.depth) return (a.depth ?? 0) - (b.depth ?? 0);
        return (a.label || '').localeCompare(b.label || '');
      });
      const n = sorted.length;

      if (customShape === 'fibonacci') {
        // Golden-angle sunflower: each node placed at 137.508° increment
        const goldenAngle = 137.508 * (Math.PI / 180);
        const scale = n > 15 ? 55 : 70;
        sorted.forEach((node, i) => {
          const angle = i * goldenAngle;
          const r = scale * Math.sqrt(i + 1);
          newPositions.set(node.id, { 
            x: Math.cos(angle) * r, 
            y: Math.sin(angle) * r,
            z: dimensionMode === '3D' ? (i * 25) - (n * 12.5) : undefined
          });
        });
      } else if (customShape === 'grid') {
        // Perfect rectangular grid — clean, organized, architectural
        const cols = Math.ceil(Math.sqrt(n));
        const spacing = 300;
        sorted.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const totalRows = Math.ceil(n / cols);
          newPositions.set(node.id, {
            x: (col - (cols - 1) / 2) * spacing,
            y: (row - (totalRows - 1) / 2) * spacing,
            z: dimensionMode === '3D' ? (row * 60) - (totalRows * 30) : undefined
          });
        });
      } else if (customShape === 'wave') {
        // Sinusoidal wave — nodes flow along a beautiful sine curve
        const waveSpacing = 220;
        const amplitude = 250;
        const frequency = 0.45;
        sorted.forEach((node, i) => {
          const x = (i - (n - 1) / 2) * waveSpacing;
          const y = Math.sin(i * frequency) * amplitude;
          newPositions.set(node.id, { 
            x, 
            y,
            z: dimensionMode === '3D' ? Math.cos(i * frequency) * 150 : undefined
          });
        });
      }
      
      // Center the overridden custom shapes on-screen
      centerPositions(newPositions);
    }

    const startPositions = new Map(positions);

    // If it's initial load, or positions is empty, set immediately
    if (startPositions.size === 0) {
      setPositions(newPositions);
      return;
    }

    // Cancel any ongoing coordinate interpolation animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsInterpolating(true);
    const startTime = performance.now();
    const duration = 2200; // 2.2 seconds of luxury morphing

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing curve: luxury easeInOutCubic for perfect fluid acceleration & deceleration
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const interpolated = new Map<string, { x: number; y: number; z?: number }>();
      
      newPositions.forEach((targetPos, id) => {
        const startPos = startPositions.get(id) || { x: 0, y: 0 };
        interpolated.set(id, {
          x: startPos.x + (targetPos.x - startPos.x) * ease,
          y: startPos.y + (targetPos.y - startPos.y) * ease,
          z: targetPos.z !== undefined && startPos.z !== undefined
            ? startPos.z + (targetPos.z - startPos.z) * ease
            : targetPos.z
        });
      });

      setPositions(interpolated);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        setIsInterpolating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      setIsInterpolating(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes, visibleRelationships, visibleChildMap, mode, dimensionMode, autoMorphMode, morphIndex]);

  // Phase 9: Heat map color computation
  const getHeatColor = (nodeId: string): string => {
    const time = nodeTimeSpent?.get(nodeId) ?? 0;
    if (time <= 0) return isZenMode ? 'rgba(99,165,255,0.6)' : '#93c5fd';
    const t = Math.min(time / 120, 1); // normalize to 0-1 over 120s
    // icy blue (210) -> warm amber (40) -> fire red (0)
    const h = Math.round(210 - t * 210);
    const s = 80;
    const l = isZenMode ? 50 : 55;
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  const getNodeStyle = (node: ConceptNode, isHighlighted: boolean) => {
    const isCentral = node.depth === 0;

    const lbl = (moduleTitle || '').toLowerCase();
    let themeNeon = '#4f46e5';
    let themeBorderDepth1 = '#6366f1';
    let themeBorderDepth2 = '#a5b4fc';
    let themeTextDepth1 = '#312e81';

    if (lbl.includes('front') || lbl.includes('ux') || lbl.includes('design') || lbl.includes('react') || lbl.includes('web')) {
      themeNeon = '#ea580c';
      themeBorderDepth1 = '#f97316';
      themeBorderDepth2 = '#fdba74';
      themeTextDepth1 = '#7c2d12';
    } else if (lbl.includes('back') || lbl.includes('sql') || lbl.includes('mongo') || lbl.includes('node') || lbl.includes('api') || lbl.includes('database')) {
      themeNeon = '#0891b2';
      themeBorderDepth1 = '#06b6d4';
      themeBorderDepth2 = '#67e8f9';
      themeTextDepth1 = '#164e63';
    } else if (lbl.includes('devops') || lbl.includes('cloud') || lbl.includes('platform') || lbl.includes('sre') || lbl.includes('aws') || lbl.includes('docker') || lbl.includes('kubernetes')) {
      themeNeon = '#db2777';
      themeBorderDepth1 = '#ec4899';
      themeBorderDepth2 = '#fbcfe8';
      themeTextDepth1 = '#831843';
    } else if (lbl.includes('ai') || lbl.includes('machine') || lbl.includes('data') || lbl.includes('mlops') || lbl.includes('nlp')) {
      themeNeon = '#059669';
      themeBorderDepth1 = '#10b981';
      themeBorderDepth2 = '#6ee7b7';
      themeTextDepth1 = '#064e3b';
    }

    const strokeColor = isCentral 
      ? themeNeon 
      : node.depth === 1 
        ? themeBorderDepth1 
        : themeBorderDepth2;

    const textColor = isCentral 
      ? '#ffffff' 
      : node.depth === 1 
        ? themeTextDepth1 
        : '#0f172a';

    if (isZenMode) {
      if (isCentral) return { fill: 'url(#node-grad-zen-0)', stroke: themeNeon, text: '#ffffff', strokeWidth: 3.5, gradientId: 'node-grad-zen-0' };
      if (isHighlighted) return { fill: '#0a0e17', stroke: themeNeon, text: '#ffffff', strokeWidth: 3.0, gradientId: null };
      return { fill: '#070a13', stroke: strokeColor, text: '#e2e8f0', strokeWidth: 2.2, gradientId: null };
    }

    if (isCentral) return { fill: 'url(#node-grad-0)', stroke: themeNeon, text: '#ffffff', strokeWidth: 3.5, gradientId: 'node-grad-0' };
    if (isHighlighted) return { fill: '#ffffff', stroke: themeNeon, text: themeNeon, strokeWidth: 3.0, gradientId: null };

    return { fill: '#ffffff', stroke: strokeColor, text: textColor, strokeWidth: 2.2, gradientId: null };
  };

  // Traversing ancestors and descendants for the active hover path cascade
  const activeCascadeSet = React.useMemo(() => {
    const targetId = hoveredNodeId || highlightedNode;
    if (!targetId) return new Set<string>();
    const active = new Set<string>([targetId]);

    // Ancestors
    let currentId = targetId;
    let currentNode = visibleNodes.find(n => n.id === currentId);
    while (currentNode && currentNode.parentId) {
      active.add(currentNode.parentId);
      currentId = currentNode.parentId;
      currentNode = visibleNodes.find(n => n.id === currentId);
    }

    // Descendants
    const queue = [targetId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = visibleChildMap.get(curr) || [];
      children.forEach(childId => {
        if (!active.has(childId)) {
          active.add(childId);
          queue.push(childId);
        }
      });
    }

    return active;
  }, [hoveredNodeId, highlightedNode, visibleNodes, visibleChildMap]);

  const renderConnectionGradients = () => {
    if (!visibleRelationships.length || positions.size === 0) return null;
    return visibleRelationships.map((rel, idx) => {
      const fromNode = visibleNodes.find(n => n.id === rel.from);
      const toNode = visibleNodes.find(n => n.id === rel.to);
      const fromDepth = fromNode?.depth ?? 0;
      const toDepth = toNode?.depth ?? 1;
      const fromColor = isHeatMapMode
        ? getHeatColor(rel.from)
        : isZenMode
          ? (fromDepth === 0 ? '#818cf8' : fromDepth === 1 ? '#6366f1' : '#4f46e5')
          : (fromDepth === 0 ? '#4e5bff' : fromDepth === 1 ? '#6366f1' : '#818cf8');
      const toColor = isHeatMapMode
        ? getHeatColor(rel.to)
        : isZenMode
          ? (toDepth === 0 ? '#818cf8' : toDepth === 1 ? '#a78bfa' : '#6366f1')
          : (toDepth === 0 ? '#4e5bff' : toDepth === 1 ? '#818cf8' : '#a5b4fc');
      const from = positions.get(rel.from);
      const to = positions.get(rel.to);
      if (!from || !to) return null;
      return (
        <linearGradient key={`edge-grad-${idx}`} id={`edge-grad-${idx}`}
          x1={from.x} y1={from.y} x2={to.x} y2={to.y} gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={fromColor} />
          <stop offset="100%" stopColor={toColor} />
        </linearGradient>
      );
    });
  };

  const renderConnections = () => {
    if (!visibleRelationships.length || positions.size === 0) return null;
    return visibleRelationships.map((rel, idx) => {
      const lblVal = (moduleTitle || '').toLowerCase();
      const from = positions.get(rel.from);
      const to = positions.get(rel.to);
      const fromNode = visibleNodes.find(n => n.id === rel.from);
      const toNode = visibleNodes.find(n => n.id === rel.to);

      if (!from || !to) return null;

      const isHighlighted = highlightedNode === rel.from || highlightedNode === rel.to;
      const hasArrow = (mode === 'flow' || mode === 'architect' || mode === 'chronos' || mode === 'ladder' || mode === 'matrix' || mode === 'checklist' || mode === 'hierarchy' || mode === 'tree' || (mode === 'nexus' && isHighlighted));
      
      const isLinear = ['hierarchy', 'tree', 'ladder', 'flow', 'architect', 'matrix', 'checklist', 'dna'].includes(mode);
      let virtualFromForStart = getVirtualFrom(to, from, mode);
      let virtualToForEnd = getVirtualFrom(from, to, mode);

      if (!isLinear && mode !== 'radial' && mode !== 'orbit' && mode !== 'spiral' && mode !== 'galaxy' && mode !== 'quantum' && mode !== 'chronos' && mode !== 'mindmap' && mode !== 'network') {
        const hashOffset = ((rel.from.charCodeAt(0) + rel.to.charCodeAt(0)) % 40) - 20;
        const mx = (from.x + to.x) / 2 + hashOffset;
        const my = (from.y + to.y) / 2 + hashOffset * 0.5;
        virtualFromForStart = { x: mx, y: my };
        virtualToForEnd = { x: mx, y: my };
      }

      const start = fromNode ? getEdgePoint(from, virtualFromForStart, getNodeMetricsForEdge(fromNode, zoomScale)) : from;
      const tip = toNode ? getEdgePoint(to, virtualToForEnd, getNodeMetricsForEdge(toNode, zoomScale), 2) : to;
      const dirX = tip.x - virtualToForEnd.x;
      const dirY = tip.y - virtualToForEnd.y;
      const dirDist = Math.hypot(dirX, dirY);
      const ux = dirDist > 0.1 ? dirX / dirDist : 0;
      const uy = dirDist > 0.1 ? dirY / dirDist : 0;
      
      const end = hasArrow ? { x: tip.x - ux * 14, y: tip.y - uy * 14 } : tip;
      let d = '';

      if (mode === 'hierarchy' || mode === 'tree') {
        const midY = (start.y + end.y) / 2;
        d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
      } else if (mode === 'ladder') {
        // Stepped line for ladder
        d = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (mode === 'matrix' || mode === 'checklist') {
        // Orthogonal for grid modes
        const midX = (start.x + end.x) / 2;
        d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      } else if (mode === 'flow' || mode === 'architect') {
        const midX = (start.x + end.x) / 2;
        d = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
      } else if (mode === 'chronos') {
        d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (mode === 'radial' || mode === 'orbit' || mode === 'spiral' || mode === 'galaxy' || mode === 'mindmap' || mode === 'network') {
        d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (mode === 'dna') {
        const midX = (start.x + end.x) / 2;
        d = `M ${start.x} ${start.y} C ${midX} ${start.y - 100}, ${midX} ${end.y + 100}, ${end.x} ${end.y}`;
      } else if (mode === 'quantum') {
        d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else {
        const hashOffset = ((rel.from.charCodeAt(0) + rel.to.charCodeAt(0)) % 40) - 20;
        const mx = (start.x + end.x) / 2 + hashOffset;
        const my = (start.y + end.y) / 2 + hashOffset * 0.5;
        d = `M ${start.x} ${start.y} Q ${mx} ${my}, ${end.x} ${end.y}`;
      }

      const isLateral = rel.from !== toNode?.parentId && rel.to !== fromNode?.parentId && fromNode?.parentId !== rel.to;
      const isPrereqConnection = fromNode && toNode && fromNode.depth < toNode.depth && !isLateral;

      // Connection lens filter
      const lensType = isLateral ? 'lateral' : isPrereqConnection ? 'prereq' : 'structural';
      if (!activeLensFilters.has(lensType)) return null;

      // Cascade highlight rules
      const isCascadeHighlighted = (hoveredNodeId || highlightedNode) ? (activeCascadeSet.has(rel.from) && activeCascadeSet.has(rel.to)) : false;

      // Tour highlight rules
      const isTourHighlighted = tourNodeId === rel.from || tourNodeId === rel.to;

      // Legend highlight rule
      const isLegendDimmed = hoveredLegendDepth !== null &&
        !(
          (hoveredLegendDepth === 3 && fromNode && fromNode.depth >= 3 && toNode && toNode.depth >= 3) ||
          (fromNode && fromNode.depth === hoveredLegendDepth && toNode && toNode.depth === hoveredLegendDepth)
        );

      let strokeColor = isHighlighted
        ? (isZenMode ? '#818cf8' : '#312e81')
        : isZenMode
          ? (isLateral ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)')
          : (isLateral ? 'rgba(78, 91, 255, 0.45)' : 'rgba(78, 91, 255, 0.72)');

      // Override stroke color for cascade highlights
      if (hoveredNodeId && isCascadeHighlighted) {
        strokeColor = isZenMode ? '#a78bfa' : '#4e5bff';
      }

      const isPrereq = fromNode && toNode && fromNode.depth < toNode.depth;
      const isBridgeHovered = hoveredRelation?.from === rel.from && hoveredRelation?.to === rel.to;
      const midPointX = (start.x + end.x) / 2;
      const midPointY = (start.y + end.y) / 2;

      const handleBridgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRelationshipClick?.({ from: rel.from, to: rel.to, label: rel.label });
      };

      const queryActive = searchQuery && searchQuery.trim() !== '';
      const fromMatched = fromNode ? (!queryActive || isMatch(fromNode)) : false;
      const toMatched = toNode ? (!queryActive || isMatch(toNode)) : false;
      const connectionMatched = !queryActive || (fromMatched && toMatched);

      let pathOpacity = connectionMatched ? (isHighlighted ? 1 : 0.7) : 0.15;
      if (isTourRunning) {
        const isAttached = tourNodeId === rel.from || tourNodeId === rel.to;
        pathOpacity = isAttached ? 0.95 : 0.04;
      } else if (mode === 'chronos' && ((fromNode && fromNode.depth > chronosDepth) || (toNode && toNode.depth > chronosDepth))) {
        pathOpacity = 0.02;
      } else if (hoveredNodeId || highlightedNode) {
        pathOpacity = isCascadeHighlighted ? (isHighlighted ? 1 : 0.8) : 0.08;
      } else if (hoveredLegendDepth !== null) {
        pathOpacity = isLegendDimmed ? 0.08 : 0.8;
      }

      // Dim connections if Mind Palace DND arena is active
      if (challenge?.active) {
        const fromItem = challenge.nodes.find(n => n.id === rel.from);
        const toItem = challenge.nodes.find(n => n.id === rel.to);
        if (!fromItem || !toItem || !fromItem.isPlaced || !toItem.isPlaced) {
          pathOpacity = 0.02;
        } else {
          pathOpacity = 0.85;
        }
      }

      // Override for tour
      let finalStrokeColor = strokeColor;
      if (isTourHighlighted && !hoveredNodeId) {
        finalStrokeColor = isZenMode ? '#f59e0b' : '#f59e0b';
      }

      const strokeDashForLens = isLateral ? '6,8' : (lensType === 'prereq' ? '12,4' : 'none');

      // Entrance animation: connections draw themselves
      const connEntranceDelay = Math.min(fromNode?.depth ?? 0, toNode?.depth ?? 0) * 0.15;
      const connVisible = entranceComplete || entranceProgress > connEntranceDelay + 0.3;
      const connScale = connVisible ? 1 : 0;

      // Connection thickness by type
      const baseWidth = lensType === 'structural' ? 3.0 : lensType === 'prereq' ? 2.4 : 1.6;
      const activeWidth = (isHighlighted || (hoveredNodeId && isCascadeHighlighted) || isTourHighlighted) ? baseWidth + 1.8 : baseWidth;

      const timeFrom = nodeTimeSpent?.get(rel.from) ?? 0;
      const timeTo = nodeTimeSpent?.get(rel.to) ?? 0;
      const avgTime = (timeFrom + timeTo) / 2;
      const flowSpeedFactor = Math.max(0.4, Math.min(3.0, 0.8 + avgTime / 40));

      return (
        <g 
          key={`${rel.from}-${rel.to}-${idx}`} 
          opacity={connScale * (isSynthesizingApiActive ? 0.18 : pathOpacity)} 
          style={{
            transition: autoMorphMode
              ? 'opacity 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'opacity 0.5s ease'
          }}
        >
          {/* Glow under-path for cascade */}
          {(hoveredNodeId && isCascadeHighlighted && !isSynthesizingApiActive) && (
            <path 
              d={d} 
              fill="none" 
              stroke={finalStrokeColor} 
              strokeWidth={activeWidth + 4} 
              strokeLinecap="round" 
              opacity={0.15} 
              filter="url(#edge-glow)" 
              style={{
                transition: (isSynthesizingApiActive || isInterpolating)
                  ? 'opacity 0.5s ease'
                  : autoMorphMode
                    ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1), d 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'all 0.3s ease'
              }}
            />
          )}
          <path
            d={d}
            fill="none"
            stroke={isTourHighlighted ? finalStrokeColor : `url(#edge-grad-${idx})`}
            strokeWidth={isSynthesizingApiActive ? activeWidth * 0.8 : activeWidth}
            strokeDasharray={isSynthesizingApiActive ? '4,6' : strokeDashForLens}
            strokeLinecap="round"
            style={{
              transition: (isSynthesizingApiActive || isInterpolating)
                ? 'opacity 0.5s ease'
                : autoMorphMode
                  ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1), d 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'all 0.7s ease'
            }}
          />

          {/* Phase 10: Neon Laser Synaptic Signal Overlay (Glows on hovered cascade, selected node paths, and tour paths) */}
          {/* Phase 10: Neon Laser Synaptic Signal Overlay (Always visible, higher opacity on highlight/cascade) */}
          <path
            d={d}
            fill="none"
            stroke={isZenMode ? '#a5b4fc' : (lblVal.includes('front') || lblVal.includes('ux') || lblVal.includes('design') || lblVal.includes('react') || lblVal.includes('web') ? '#ea580c' : '#4e5bff')}
            strokeWidth={isSynthesizingApiActive ? activeWidth * 0.8 + 0.4 : activeWidth + 0.8}
            strokeDasharray={isSynthesizingApiActive ? '3,5' : '8,8'}
            className="stroke-dash-animate pointer-events-none"
            opacity={isSynthesizingApiActive ? 0.55 : ((hoveredNodeId ? isCascadeHighlighted : (highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted)) ? 0.85 : 0.22)}
            style={{
              transition: (isSynthesizingApiActive || isInterpolating)
                ? 'opacity 0.5s ease'
                : autoMorphMode
                  ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1), d 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  : undefined
            }}
          />

          {/* Dual Neural Flow Particles — Always active, extremely calm and slow */}
          {!prefersReducedMotion && (
            <g>
              <circle
                r={isHeatMapMode ? 2.5 : 2.0}
                fill={isHeatMapMode ? getHeatColor(rel.from) : (hoveredNodeId && isCascadeHighlighted ? '#10b981' : (isZenMode ? '#a78bfa' : (lblVal.includes('front') || lblVal.includes('ux') || lblVal.includes('design') || lblVal.includes('react') || lblVal.includes('web') ? '#ea580c' : '#6366f1')))}
                opacity={(hoveredNodeId ? isCascadeHighlighted : (highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted)) ? 0.9 : 0.4}
                filter="url(#synapse-particle-glow)"
              >
                <animateMotion
                  dur={isHeatMapMode ? `${(6 + (idx % 2)) / Math.max(0.4, flowSpeedFactor * 0.3)}s` : (hoveredNodeId && isCascadeHighlighted ? '2.4s' : `${4.5 + (idx % 3)}s`)}
                  repeatCount="indefinite"
                  path={d}
                />
              </circle>
              <circle
                r={isHeatMapMode ? 1.8 : 1.4}
                fill={isHeatMapMode ? getHeatColor(rel.to) : (isZenMode ? '#c4b5fd' : '#a5b4fc')}
                opacity={(hoveredNodeId ? isCascadeHighlighted : (highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted)) ? 0.7 : 0.3}
                filter="url(#synapse-particle-glow)"
              >
                <animateMotion
                  dur={isHeatMapMode ? `${(9 + (idx % 2)) / Math.max(0.4, flowSpeedFactor * 0.3)}s` : `${7.5 + (idx % 4)}s`}
                  repeatCount="indefinite"
                  path={d}
                  begin={`${1.5 + (idx % 2)}s`}
                />
              </circle>
              {/* 3rd fast spark particle — only on cascade/highlighted paths */}
              {((hoveredNodeId && isCascadeHighlighted) || highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted) && (
                <circle
                  r={isZenMode ? 3.0 : 2.5}
                  fill={isZenMode ? '#f0abfc' : '#facc15'}
                  opacity={0.95}
                  filter="url(#synapse-particle-glow)"
                >
                  <animateMotion
                    dur={`${1.2 + (idx % 3) * 0.4}s`}
                    repeatCount="indefinite"
                    path={d}
                    begin={`${(idx % 3) * 0.3}s`}
                  />
                </circle>
              )}
            </g>
          )}

          {/* Edge surge — animated dashes racing along highlighted paths */}
          {(hoveredNodeId && isCascadeHighlighted) && (
            <path
              d={d}
              fill="none"
              stroke={isZenMode ? '#a78bfa' : (lblVal.includes('front') || lblVal.includes('ux') || lblVal.includes('design') || lblVal.includes('react') || lblVal.includes('web') ? '#fb923c' : '#818cf8')}
              strokeWidth={activeWidth + 3}
              strokeDasharray="24 216"
              strokeLinecap="round"
              className="pointer-events-none"
              style={{
                animation: `edge-surge ${1.6 + (idx % 2) * 0.4}s linear infinite`,
                animationDelay: `-${(idx % 3) * 0.5}s`,
                filter: 'drop-shadow(0 0 6px currentColor)',
                transition: autoMorphMode
                  ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1), d 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  : undefined
              }}
            />
          )}

          {/* Socratic Bridge Hover Target Overlay */}
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredRelation({ from: rel.from, to: rel.to })}
            onMouseLeave={() => setHoveredRelation(null)}
            onClick={handleBridgeClick}
            style={{
              transition: autoMorphMode
                ? 'd 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                : undefined
            }}
          />

          {/* Glowing Socratic Bridge Node */}
          {isBridgeHovered && (
            <g
              transform={`translate(${midPointX}, ${midPointY})`}
              className="cursor-pointer"
              onClick={handleBridgeClick}
              onMouseEnter={() => setHoveredRelation({ from: rel.from, to: rel.to })}
              onMouseLeave={() => setHoveredRelation(null)}
            >
              <circle r={14} className="fill-indigo-500/20 stroke-indigo-500/50 stroke-[1.5px] animate-ping" />
              <circle r={9} className="fill-indigo-600 stroke-white stroke-[1.5px]" />
              <path d="M -2.5 -2.5 L 2.5 2.5 M -2.5 2.5 L 2.5 -2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          )}
          {activeTheme.id === 'builder' && (
            <g className="font-mono pointer-events-none" opacity={pathOpacity * 0.55}>
              <text x={midPointX} y={midPointY - 6} textAnchor="middle" fontSize="6.5" fill="#d97706" fontWeight="bold">
                ΔX:{Math.round(end.x - start.x)} ΔY:{Math.round(end.y - start.y)} L:{Math.round(Math.hypot(end.x - start.x, end.y - start.y))}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  // ── Arrowheads rendered ABOVE nodes so they are never occluded by card backgrounds ──
  const renderArrowheads = () => {
    if (!visibleRelationships.length || positions.size === 0) return null;

    return visibleRelationships.map((rel, idx) => {
      const from = positions.get(rel.from);
      const to = positions.get(rel.to);
      const fromNode = visibleNodes.find(n => n.id === rel.from);
      const toNode = visibleNodes.find(n => n.id === rel.to);
      if (!from || !to || !fromNode || !toNode) return null;

      const isHighlighted = highlightedNode === rel.from || highlightedNode === rel.to;
      const hasArrow = (mode === 'flow' || mode === 'architect' || mode === 'chronos' || mode === 'ladder' || mode === 'matrix' || mode === 'checklist' || mode === 'hierarchy' || mode === 'tree' || (mode === 'nexus' && isHighlighted));
      if (!hasArrow) return null;

      // Compute exact endpoint (tip is 2px away from the capsule boundary)
      const virtualToForEnd = getVirtualFrom(from, to, mode);
      const end = getEdgePoint(to, virtualToForEnd, getNodeMetricsForEdge(toNode, zoomScale), 2);

      // Compute path direction at the endpoint for arrowhead orientation
      const dx = end.x - virtualToForEnd.x;
      const dy = end.y - virtualToForEnd.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return null;

      // Opacity mirrors the connection's computed opacity
      const queryActive = searchQuery && searchQuery.trim() !== '';
      const fromMatched = fromNode ? (!queryActive || isMatch(fromNode)) : false;
      const toMatched = toNode ? (!queryActive || isMatch(toNode)) : false;
      const connectionMatched = !queryActive || (fromMatched && toMatched);
      let arrowOpacity = connectionMatched ? (isHighlighted ? 1 : 0.85) : 0.15;
      if (isTourRunning) {
        arrowOpacity = (tourNodeId === rel.from || tourNodeId === rel.to) ? 1 : 0.04;
      } else if (hoveredNodeId || highlightedNode) {
        const isCascadeActive = activeCascadeSet.has(rel.from) && activeCascadeSet.has(rel.to);
        arrowOpacity = isCascadeActive ? 1 : 0.06;
      }
      if (challenge?.active) {
        const fromItem = challenge.nodes.find(n => n.id === rel.from);
        const toItem = challenge.nodes.find(n => n.id === rel.to);
        arrowOpacity = (!fromItem || !toItem || !fromItem.isPlaced || !toItem.isPlaced) ? 0.02 : 1;
      }

      const isTourHighlighted = tourNodeId === rel.from || tourNodeId === rel.to;
      const isLateral = rel.from !== toNode?.parentId && rel.to !== fromNode?.parentId && fromNode?.parentId !== rel.to;
      const lensType = isLateral ? 'lateral' : 'structural';
      if (!activeLensFilters.has(lensType) && !activeLensFilters.has('prereq')) return null;

      // Arrowhead: 14×10 triangle drawn with proper screen-space sizing
      const arrowL = 14; // arrowhead length in SVG units
      const arrowW = 5;  // half-width in SVG units
      // tip at end, base behind it
      const ux = dx / dist;
      const uy = dy / dist;
      const tip = end;
      const bx = tip.x - ux * arrowL;
      const by = tip.y - uy * arrowL;
      // perpendicular
      const px = -uy * arrowW;
      const py = ux * arrowW;

      const arrowColor = isTourHighlighted ? '#f59e0b' : (isZenMode ? '#a78bfa' : '#4e5bff');
      const glowColor = isTourHighlighted ? 'rgba(245,158,11,0.5)' : (isZenMode ? 'rgba(167,139,250,0.5)' : 'rgba(78,91,255,0.5)');

      return (
        <g 
          key={`arrow-${rel.from}-${rel.to}-${idx}`} 
          opacity={arrowOpacity} 
          className="pointer-events-none"
          style={{
            transition: autoMorphMode
              ? 'opacity 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'opacity 0.5s ease'
          }}
        >
          {/* Glow halo behind arrowhead */}
          <polygon
            points={`${tip.x},${tip.y} ${bx + px},${by + py} ${bx - px},${by - py}`}
            fill={glowColor}
            filter="url(#edge-glow)"
            opacity={0.6}
            style={{
              transition: autoMorphMode
                ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                : undefined
            }}
          />
          {/* Crisp filled arrowhead on top */}
          <polygon
            points={`${tip.x},${tip.y} ${bx + px},${by + py} ${bx - px},${by - py}`}
            fill={arrowColor}
            stroke={isZenMode ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)'}
            strokeWidth="0.8"
            strokeLinejoin="round"
            style={{
              transition: autoMorphMode
                ? 'all 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
                : undefined
            }}
          />
        </g>
      );
    });
  };

  // Chronos timeline rail (Focus-Aware)
  const renderChronosRail = () => {
    if (mode !== 'chronos' || positions.size === 0) return null;
    const coords = Array.from(positions.values());
    const minX = Math.min(...coords.map(p => p.x)) - 200;
    const maxX = Math.max(...coords.map(p => p.x)) + 200;

    const depths = Array.from(new Set(layoutGraph.nodes.map(n => n.depth))).sort((a,b) => a-b);

    return (
      <g opacity="0.15">
        <line x1={minX} y1="0" x2={maxX} y2="0" stroke="#4e5bff" strokeWidth="4" strokeDasharray="10,15" />
        {depths.map(d => {
          const nodeAtDepth = layoutGraph.nodes.find(n => n.depth === d);
          if (!nodeAtDepth) return null;
          const pos = positions.get(nodeAtDepth.id);
          if (!pos) return null;
          return (
            <g key={d} transform={`translate(${pos.x}, 0)`}>
              <line y1="-40" y2="40" stroke="#4e5bff" strokeWidth="2" />
              <text y="60" textAnchor="middle" className="fill-[#4e5bff] font-black text-[14px]">PHASE {d}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderCompassScope = (minX: number, minY: number, vW: number, vH: number) => {
    if (challenge?.active) return null;
    const strokeColor = isZenMode ? 'rgba(99, 102, 241, 0.05)' : 'rgba(78, 91, 255, 0.04)';
    const tickColor = isZenMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(78, 91, 255, 0.09)';

    return (
      <g className="pointer-events-none select-none font-mono">
        {/* Axis Ticked Guides */}
        <line x1={minX} y1="0" x2={minX + vW} y2="0" stroke={strokeColor} strokeWidth="1" strokeDasharray="5,10" />
        <line x1="0" y1={minY} x2="0" y2={minY + vH} stroke={strokeColor} strokeWidth="1" strokeDasharray="5,10" />

        {/* Ticks along the X-Axis */}
        {[-800, -600, -400, -200, 200, 400, 600, 800].map(tick => (
          <g key={`xtick-${tick}`} transform={`translate(${tick}, 0)`}>
            <line y1="-5" y2="5" stroke={tickColor} strokeWidth="1" />
          </g>
        ))}

        {/* Ticks along the Y-Axis */}
        {[-600, -400, -200, 200, 400, 600].map(tick => (
          <g key={`ytick-${tick}`} transform={`translate(0, ${tick})`}>
            <line x1="-5" x2="5" stroke={tickColor} strokeWidth="1" />
          </g>
        ))}

        {/* Outer Concentric Range Guage Rings */}
        {[300, 600, 900].map(r => (
          <g key={r}>
            <circle cx="0" cy="0" r={r} fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray={r === 600 ? '4,8' : 'none'} />
          </g>
        ))}

        {/* Compass Angles */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.cos(rad) * 280;
          const y1 = Math.sin(rad) * 280;
          const x2 = Math.cos(rad) * 310;
          const y2 = Math.sin(rad) * 310;

          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickColor} strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Rotating tech compass ring - static for Visual Calmness */}
        <g style={{ transformOrigin: '0px 0px', transform: `scale(${audioFreqScale})` }}>
          <circle cx="0" cy="0" r="450" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="30,120,40,90" />
          {[0, 90, 180, 270].map(angle => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M 0 -445 L -15 -445 L -15 -455 M 0 -445 L 15 -445 L 15 -455" fill="none" stroke={tickColor} strokeWidth="1.5" />
            </g>
          ))}
        </g>

        {/* Counter-rotating inner scope - static for Visual Calmness */}
        <g style={{ transformOrigin: '0px 0px', transform: `scale(${1 / audioFreqScale})` }}>
          <circle cx="0" cy="0" r="220" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="10,30,5,15" />
          <circle cx="0" cy="0" r="225" fill="none" stroke={strokeColor} strokeWidth="0.75" strokeDasharray="2,8" />
        </g>
      </g>
    );
  };

  const renderHUD = (minX: number, minY: number, vW: number, vH: number) => {
    if (challenge?.active) return null;
    const nodeCount = layoutGraph.nodes.length || 0;
    const maxDepth = Math.max(...(layoutGraph.nodes.map(n => n.depth) || [0]));

    const hudStroke = isZenMode ? 'rgba(99, 102, 241, 0.28)' : 'rgba(78, 91, 255, 0.24)';
    const hudFill = isZenMode ? '#818cf8' : '#4e5bff';
    const textMuted = isZenMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.45)';
    const textPrimary = isZenMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.8)';

    const padX = 40;
    const padY = 40;

    return (
      <g className="pointer-events-none select-none font-mono text-[9px] uppercase tracking-wider">
        {/* Corner HUD Brackets */}
        <path d={`M ${minX + padX} ${minY + padY + 25} L ${minX + padX} ${minY + padY} L ${minX + padX + 25} ${minY + padY}`} fill="none" stroke={hudStroke} strokeWidth="2" />
        <line x1={minX + padX} y1={minY + padY} x2={minX + padX + 110} y2={minY + padY} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />
        <line x1={minX + padX} y1={minY + padY} x2={minX + padX} y2={minY + padY + 110} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />

        <path d={`M ${minX + vW - padX} ${minY + padY + 25} L ${minX + vW - padX} ${minY + padY} L ${minX + vW - padX - 25} ${minY + padY}`} fill="none" stroke={hudStroke} strokeWidth="2" />
        <line x1={minX + vW - padX} y1={minY + padY} x2={minX + vW - padX - 110} y2={minY + padY} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />
        <line x1={minX + vW - padX} y1={minY + padY} x2={minX + vW - padX} y2={minY + padY + 110} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />

        <path d={`M ${minX + padX} ${minY + vH - padY - 25} L ${minX + padX} ${minY + vH - padY} L ${minX + padX + 25} ${minY + vH - padY}`} fill="none" stroke={hudStroke} strokeWidth="2" />
        <line x1={minX + padX} y1={minY + vH - padY} x2={minX + padX + 110} y2={minY + vH - padY} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />
        <line x1={minX + padX} y1={minY + vH - padY} x2={minX + padX} y2={minY + vH - padY - 110} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />

        <path d={`M ${minX + vW - padX} ${minY + vH - padY - 25} L ${minX + vW - padX} ${minY + vH - padY} L ${minX + vW - padX - 25} ${minY + vH - padY}`} fill="none" stroke={hudStroke} strokeWidth="2" />
        <line x1={minX + vW - padX} y1={minY + vH - padY} x2={minX + vW - padX - 110} y2={minY + vH - padY} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />
        <line x1={minX + vW - padX} y1={minY + vH - padY} x2={minX + vW - padX} y2={minY + vH - padY - 110} stroke={hudStroke} strokeWidth="0.75" strokeDasharray="3,3" />


      </g>
    );
  };

  const renderMatrixHeaders = () => {
    if (mode !== 'matrix' || positions.size === 0) return null;
    const coords = Array.from(positions.values());
    const minY = Math.min(...coords.map(p => p.y)) - 100;
    const depths = Array.from(new Set(layoutGraph.nodes.map(n => n.depth))).sort((a,b) => a-b);

    return (
      <g opacity="0.12">
        {depths.map(d => {
          const nodeAtDepth = layoutGraph.nodes.find(n => n.depth === d);
          if (!nodeAtDepth) return null;
          const pos = positions.get(nodeAtDepth.id);
          if (!pos) return null;
          return (
            <g key={d} transform={`translate(${pos.x}, ${minY})`}>
               <text textAnchor="middle" className="fill-[#4e5bff] font-black text-[28px] uppercase tracking-tighter">PHASE {d}</text>
               <line y1="40" y2="4000" stroke="#4e5bff" strokeWidth="1" strokeDasharray="5,10" />
            </g>
          );
        })}
      </g>
    );
  };

  // ── Start a free drag on any node (non-challenge mode) ──
  const startFreeNodeDrag = useCallback((e: React.PointerEvent, nodeId: string) => {
    if (challenge?.active) return; // let challenge system handle it
    e.stopPropagation();
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const { width: vW, height: vH } = getViewBox(visibleNodes, positions, dimensions);
    const scaleX = vW / rect.width;
    const scaleY = vH / rect.height;
    const origin = positions.get(nodeId) || { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setFreeNodeDrag({
      id: nodeId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: origin.x,
      originY: origin.y,
      scaleX,
      scaleY,
      didMove: false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, positions, visibleNodes, dimensions]);

  const renderNodes = () => {
    if (!visibleNodes.length || positions.size === 0) return null;
    return visibleNodes.map((node, nodeIndex) => {
      const pos = positions.get(node.id);
      if (!pos) return null;

      const isCentral = node.depth === 0;
      const isHighlighted = highlightedNode === node.id;
      const style = getNodeStyle(node, isHighlighted);
      const metrics = getNodeMetrics(node);
      const { width: w, height: h, radius: rx, lines, fontSize, lineHeight } = metrics;

      const mastery = masteryMap?.get(node.id) ?? 'unvisited';
      const isTourActive = tourNodeId === node.id;
      const nodeHeat = nodeTimeSpent?.get(node.id) ?? 0;
      const isBurnedOut = activeLensFilter === 'burnout' && nodeHeat > 45 && mastery !== 'mastered' && !isCentral;
      const isFrozen = activeLensFilter === 'freeze' && mastery === 'unvisited' && node.depth > 0;
      const isCodeNode = !isCentral && (
        (node.label || '').toLowerCase().includes('implementation') ||
        (node.label || '').toLowerCase().includes('linter') ||
        (node.label || '').toLowerCase().includes('pipeline') ||
        (node.label || '').toLowerCase().includes('parse') ||
        (node.label || '').toLowerCase().includes('parsing') ||
        (node.label || '').toLowerCase().includes('code') ||
        (node.label || '').toLowerCase().includes('sandbox') ||
        (node.label || '').toLowerCase().includes('react') ||
        (node.label || '').toLowerCase().includes('script') ||
        (node.label || '').toLowerCase().includes('syntax') ||
        (node.label || '').toLowerCase().includes('algorithm') ||
        (node.label || '').toLowerCase().includes('server') ||
        (node.label || '').toLowerCase().includes('terminal') ||
        (node.description || '').toLowerCase().includes('code') ||
        (node.description || '').toLowerCase().includes('sandbox') ||
        (node.description || '').toLowerCase().includes('syntax')
      );

      // Phase 9: Cinematic entrance — staggered by depth + index
      const entranceDelay = node.depth * 0.15 + nodeIndex * 0.03;
      const nodeEntranceProgress = entranceComplete ? 1 : Math.max(0, Math.min(1, (entranceProgress - entranceDelay) * 3));
      const entranceScale = 0.3 + nodeEntranceProgress * 0.7;
      const entranceOpacityFactor = nodeEntranceProgress;

      const lblVal = (moduleTitle || '').toLowerCase();
      let themeNeonColor = '#6366f1';
      if (lblVal.includes('front') || lblVal.includes('ux') || lblVal.includes('design') || lblVal.includes('react') || lblVal.includes('web')) {
        themeNeonColor = '#ea580c';
      } else if (lblVal.includes('back') || lblVal.includes('sql') || lblVal.includes('mongo') || lblVal.includes('node') || lblVal.includes('api') || lblVal.includes('database')) {
        themeNeonColor = '#06b6d4';
      } else if (lblVal.includes('devops') || lblVal.includes('cloud') || lblVal.includes('platform') || lblVal.includes('sre') || lblVal.includes('aws') || lblVal.includes('docker') || lblVal.includes('kubernetes')) {
        themeNeonColor = '#ec4899';
      } else if (lblVal.includes('ai') || lblVal.includes('machine') || lblVal.includes('data') || lblVal.includes('mlops') || lblVal.includes('nlp')) {
        themeNeonColor = '#10b981';
      }

      const shadow = isHighlighted || isTourActive
        ? `drop-shadow(0 12px 28px ${themeNeonColor}45)`
        : `drop-shadow(0 ${4 + node.depth}px ${12 + node.depth * 2}px rgba(15,23,42,${0.06 + node.depth * 0.02}))`;

      const queryActive = searchQuery && searchQuery.trim() !== '';
      const matched = !queryActive || isMatch(node);

      const isCascadeActive = (hoveredNodeId || highlightedNode) ? activeCascadeSet.has(node.id) : true;
      const isLegendActive = hoveredLegendDepth !== null
        ? (hoveredLegendDepth === 3 ? node.depth >= 3 : node.depth === hoveredLegendDepth)
        : true;

      let nodeOpacity = matched ? 1 : 0.22;
      if (isTourRunning) {
        const isFocused = tourNodeId === node.id;
        const isParent = node.id === activeTourNode?.parentId;
        const isChild = node.parentId === tourNodeId;
        nodeOpacity = isFocused ? 1.0 : isParent ? 0.75 : isChild ? 0.45 : 0.08;
      } else if (mode === 'chronos' && node.depth > chronosDepth) {
        nodeOpacity = 0.02;
      } else if (hoveredNodeId || highlightedNode) {
        nodeOpacity = isCascadeActive ? 1 : 0.08;
      } else if (hoveredLegendDepth !== null) {
        nodeOpacity = isLegendActive ? 1 : 0.08;
      }

      // Dim standard nodes if Mind Palace DND arena is active
      if (challenge?.active) {
        const cn = challenge.nodes.find(c => c.id === node.id);
        if (!cn || !cn.isPlaced) {
          nodeOpacity = 0.02;
        } else {
          nodeOpacity = 1.0;
        }
      }

      const isSearchMatchHighlighted = queryActive && matched;
      const isLegendHighlighted = hoveredLegendDepth !== null && isLegendActive;

      const hasChildren = (layoutGraph.childMap.get(node.id) || []).length > 0;
      const isCollapsed = collapsedNodeIds.has(node.id);

      // Mastery ring radius and color
      const ringR = Math.max(w, h) / 2 + 10;
      const ringColor = mastery === 'mastered' ? '#10b981' : mastery === 'studying' ? '#6366f1' : 'rgba(100,116,139,0.3)';
      const ringDash = mastery === 'mastered' ? 'none' : mastery === 'studying' ? '8,4' : '4,8';
      const ringWidth = mastery === 'unvisited' ? 1 : 2.5;

      // Float micro-animation settings
      const idSum = node.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const delay = (idSum % 20) / 4;
      const duration = 6 + (idSum % 4);

      // Phase 9: Shimmer animation offset
      const shimmerOffset = (idSum % 100) / 100;

      // ── Semantic Zoom Level-of-Detail (LOD) Templates ──

      // 1. Far View (Scale < 0.65) - Glowing minimalist circles
      if (zoomScale < 0.65) {
        return (
          <g
            key={node.id}
            id={"neural-node-" + node.id}
            style={{
              animation: entranceComplete 
                ? (isSynthesizingApiActive 
                    ? `cortex-drift ${(8 + (idSum % 6))}s ease-in-out infinite` 
                    : `neural-float ${duration}s ease-in-out infinite`)
                : 'none',
              animationDelay: `-${delay}s`,
              transformOrigin: `${pos.x}px ${pos.y}px`
            }}
          >
            <g
              onClick={() => { if (!freeNodeDrag?.didMove) handleNodeClick(node, pos.x, pos.y); }}
              onPointerDown={(e) => startFreeNodeDrag(e, node.id)}
              onMouseEnter={() => {
                setHoveredNodeId(node.id);
                if (isAudioEnabled) playChime(node.depth - 0.5);
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
              }}
              className="cursor-grab active:cursor-grabbing group transition-all duration-500"
              opacity={nodeOpacity * entranceOpacityFactor}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isSearchMatchHighlighted ? entranceScale * 1.04 : entranceScale})`,
                transformOrigin: '0px 0px',
                transition: freeNodeDrag?.id === node.id
                  ? 'opacity 0.5s ease'
                  : (isSynthesizingApiActive || isInterpolating)
                    ? 'opacity 0.5s ease, scale 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
                    : autoMorphMode
                      ? 'transform 2.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease'
                      : 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease'
              }}
            >
              <circle
                r={16}
                fill={isFrozen ? 'rgba(6, 182, 212, 0.15)' : style.fill}
                stroke={isFrozen ? '#06b6d4' : (isBurnedOut ? '#ef4444' : (isHeatMapMode && !isCentral ? getHeatColor(node.id) : style.stroke))}
                strokeWidth={isFrozen || isBurnedOut ? 3.5 : (isHeatMapMode && !isCentral ? 3.5 : 2)}
                style={{
                  filter: shadow
                }}
              />
              {mastery === 'mastered' && (
                <circle cx={10} cy={-10} r={5} fill="#10b981" stroke="white" strokeWidth={1} />
              )}
              {/* Simple title below */}
              <text
                y={26}
                textAnchor="middle"
                fill={style.text}
                fontSize={9}
                fontWeight={900}
                className={`select-none pointer-events-none ${activeTheme.textClass}`}
                style={{ fontFamily: activeTheme.fontFamily }}
              >
                {node.label.length > 10 ? node.label.substring(0, 8) + '..' : node.label}
              </text>
            </g>
          </g>
        );
      }



      // 3. Normal View (Scale 0.65 - 1.35) - Standard Glassmorphic Rectangles
      return (
        <g
          key={node.id}
          id={"neural-node-" + node.id}
          style={{
            animation: entranceComplete
              ? (isSynthesizingApiActive
                  ? `cortex-drift ${(8 + (idSum % 6))}s ease-in-out infinite`
                  : `neural-float ${duration}s ease-in-out infinite`)
              : `spring-in ${0.45 + entranceDelay * 0.6}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
            animationDelay: entranceComplete ? `-${delay}s` : `${entranceDelay * 0.4}s`,
            transformOrigin: `${pos.x}px ${pos.y}px`
          }}
        >
          <g
            onClick={() => { if (!freeNodeDrag?.didMove) handleNodeClick(node, pos.x, pos.y); }}
            onPointerDown={(e) => startFreeNodeDrag(e, node.id)}
            onMouseEnter={() => {
              setHoveredNodeId(node.id);
              startHoverTooltip(node, pos.x, pos.y);
              if (isAudioEnabled) playChime(node.depth - 0.5);
            }}
            onMouseLeave={() => {
              setHoveredNodeId(null);
            clearHoverTooltip();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRadialMenu({ node, x: pos.x, y: pos.y });
            }}
            className="cursor-grab active:cursor-grabbing group transition-all duration-500"
            opacity={nodeOpacity * entranceOpacityFactor}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${
                hoveredNodeId === node.id
                  ? (entranceScale * 1.12)
                  : activeCascadeSet.has(node.id) && hoveredNodeId && !isCentral
                    ? (entranceScale * 1.04)
                    : isTourActive
                      ? entranceScale * 1.12
                      : isSearchMatchHighlighted
                        ? entranceScale * 1.04
                        : entranceScale
              })`,
              transformOrigin: '0px 0px',
              transition: freeNodeDrag?.id === node.id
                ? 'opacity 0.5s ease'
                : (isSynthesizingApiActive || isInterpolating)
                  ? 'opacity 0.5s ease, scale 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
                  : autoMorphMode
                    ? 'transform 2.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease'
                    : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease'
            }}
          >
            {/* ── ROOT CORONA: permanent pulsing rings behind root node ── */}
            {isCentral && (
              <g className="pointer-events-none">
                {[1.0, 1.45, 1.9].map((scale, i) => {
                  const R = Math.max(w, h) / 2 + 2;
                  const halo6 = Array.from({ length: 6 }, (_, j) => {
                    const a = Math.PI / 180 * (60 * j - 30);
                    const r = R * scale + 12;
                    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
                  }).join(' ');
                  return (
                    <polygon
                      key={i}
                      points={halo6}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={1.5 - i * 0.4}
                      opacity={0.22 - i * 0.06}
                      style={{
                        transformOrigin: '0 0',
                        animation: `root-corona ${(3 + i * 1.2)}s ease-in-out infinite`,
                        animationDelay: `-${i * 0.8}s`,
                      }}
                    />
                  );
                })}
              </g>
            )}
            {/* ── HOVER RIPPLE BURST: expands outward on hover ── */}
            {hoveredNodeId === node.id && (
              <g className="pointer-events-none">
                {[0, 0.4, 0.8].map((delay, i) => (
                  <circle
                    key={i}
                    r={0}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={2 - i * 0.5}
                    style={{
                      animation: `ripple-out 1.4s ease-out infinite`,
                      animationDelay: `${delay}s`,
                      transformOrigin: '0 0',
                    }}
                  />
                ))}
              </g>
            )}
            {/* Mastery Ring (matches card shape for visual cleanliness) */}
            <rect
              x={-w / 2 - 8}
              y={-h / 2 - 8}
              width={w + 16}
              height={h + 16}
              rx={rx + 8}
              fill="none"
              stroke={ringColor}
              strokeWidth={ringWidth}
              strokeDasharray={ringDash}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={mastery === 'studying' ? { animation: `neural-float ${duration}s ease-in-out infinite` } : undefined}
            />
            {mastery === 'mastered' && (
              <g transform={`translate(${w / 2 - 2}, ${-h / 2 - 2})`}>
                <circle r={9} fill="#10b981" stroke="white" strokeWidth={1.5} />
                <path d="M -4 0 L -1.5 3 L 4.5 -3" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
              </g>
            )}
            {isCodeNode && (
              <g
                transform={`translate(${-w / 2 + 2}, ${-h / 2 + 2})`}
                className="cursor-pointer hover:scale-115 transition-transform duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  const prompt = `Provide an interactive JavaScript, TypeScript, or HTML coding exercise to test my understanding of "${node.label}" - ${node.description || ''}. Open the Cortex Code Sandbox.`;
                  document.dispatchEvent(new CustomEvent('sara-action', { detail: prompt }));
                  window.dispatchEvent(new CustomEvent('toggle-cortex-desk'));
                  toast.success(`Launching Sandbox for "${node.label}"`);
                }}
              >
                <title>Run in Cortex Sandbox</title>
                <circle r={9} fill="#ea580c" stroke="white" strokeWidth={1.2} style={{ filter: 'drop-shadow(0 2px 4px rgba(234, 88, 12, 0.4))' }} />
                <path d="M -2.5 -3.5 L 3.5 0 L -2.5 3.5 Z" fill="white" />
              </g>
            )}
            {/* Tour active border without glow overlay for Visual Calmness */}
            {isTourActive && (
              <g>
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={rx}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  className="pointer-events-none"
                />

                {/* 4. Top-Left Bracket */}
                <path d={`M ${-w/2 - 12} ${-h/2 + 4} L ${-w/2 - 12} ${-h/2 - 12} L ${-w/2 + 4} ${-h/2 - 12}`} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                {/* 5. Top-Right Bracket */}
                <path d={`M ${w/2 + 12} ${-h/2 + 4} L ${w/2 + 12} ${-h/2 - 12} L ${w/2 - 4} ${-h/2 - 12}`} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                {/* 6. Bottom-Left Bracket */}
                <path d={`M ${-w/2 - 12} ${h/2 - 4} L ${-w/2 - 12} ${h/2 + 12} L ${-w/2 + 4} ${h/2 + 12}`} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                {/* 7. Bottom-Right Bracket */}
                <path d={`M ${w/2 + 12} ${h/2 - 4} L ${w/2 + 12} ${h/2 + 12} L ${w/2 - 4} ${h/2 + 12}`} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {node.id === pingNodeId && (
              <g>
                <circle cx={0} cy={0} r={Math.max(w, h) / 1.5} className="fill-none stroke-indigo-500 stroke-[4px] animate-ping opacity-75" />
                <circle cx={0} cy={0} r={Math.max(w, h) / 1.2} className="fill-none stroke-indigo-400 stroke-[2px] animate-ping opacity-40" />
              </g>
            )}
            {isSearchMatchHighlighted && (
              <rect
                x={-w / 2 - 6}
                y={-h / 2 - 6}
                width={w + 12}
                height={h + 12}
                rx={rx + 6}
                className="fill-none stroke-emerald-500/40 dark:stroke-emerald-400/50 stroke-[3px]"
              />
            )}
            {isLegendHighlighted && (
              <rect
                x={-w / 2 - 6}
                y={-h / 2 - 6}
                width={w + 12}
                height={h + 12}
                rx={rx + 6}
                className="fill-none stroke-indigo-500/30 dark:stroke-indigo-400/40 stroke-[3px]"
              />
            )}
            {isHighlighted && (
              <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} rx={rx + 8} className="fill-none stroke-[#4e5bff]/25 stroke-[4px]" />
            )}
            {isHeatMapMode && !isCentral && !isBurnedOut && !isFrozen && (
              <g>
                {/* 2. Floating Thermal Telemetry Badge */}
                <g transform={`translate(0, ${h / 2 + 16})`}>
                  <rect
                    x="-32" y="-8"
                    width="64" height="16"
                    rx="8"
                    fill={isZenMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)'}
                    stroke={getHeatColor(node.id)}
                    strokeWidth="1.2"
                    style={{ backdropFilter: 'blur(8px)' }}
                  />
                  {nodeHeat > 0 ? (
                    <g transform="translate(-22, -4.5)">
                      <path d="M5 0C5 0 2 3.5 2 6C2 7.66 3.34 9 5 9C6.66 9 8 7.66 8 6C8 3.5 5 0 5 0Z" fill={getHeatColor(node.id)} />
                      <path d="M5 2.5C5 2.5 3.75 4.5 3.75 6C3.75 6.83 4.37 7.5 5 7.5C5.63 7.5 6.25 6.83 6.25 6C6.25 4.5 5 2.5 5 2.5Z" fill="white" opacity="0.8" />
                    </g>
                  ) : (
                    <g transform="translate(-22, -4.5)">
                      <circle cx="5" cy="5" r="2.5" fill={getHeatColor(node.id)} />
                    </g>
                  )}
                  <text x="6" y="3.5" textAnchor="middle" fontSize="7.5" fill={isZenMode ? '#f8fafc' : '#0f172a'} fontWeight="bold" className="font-mono tracking-wider">
                    {nodeHeat > 0 ? `${nodeHeat}s` : '0s'}
                  </text>
                </g>
              </g>
            )}

            {isBurnedOut && (
              <g>
                {/* 2. Floating Burnout Telemetry Badge */}
                <g transform={`translate(0, ${h / 2 + 16})`}>
                  <rect
                    x="-38" y="-8"
                    width="76" height="16"
                    rx="8"
                    fill={isZenMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    style={{ backdropFilter: 'blur(8px)' }}
                  />
                  <g transform="translate(-30, -5.5)">
                    <path d="M5 0C5 0 2 3.5 2 6C2 7.66 3.34 9 5 9C6.66 9 8 7.66 8 6C8 3.5 5 0 5 0Z" fill="#ef4444" />
                    <path d="M5 2.5C5 2.5 3.75 4.5 3.75 6C3.75 6.83 4.37 7.5 5 7.5C5.63 7.5 6.25 6.83 6.25 6C6.25 4.5 5 2.5 5 2.5Z" fill="white" opacity="0.8" />
                  </g>
                  <text x="8" y="3.5" textAnchor="middle" fontSize="7" fill="#ef4444" fontWeight="bold" className="font-mono tracking-wider">
                    BURNOUT
                  </text>
                </g>
              </g>
            )}

            {isFrozen && (
              <g>
                {/* 2. Floating Freeze Telemetry Badge */}
                <g transform={`translate(0, ${h / 2 + 16})`}>
                  <rect
                    x="-38" y="-8"
                    width="76" height="16"
                    rx="8"
                    fill={isZenMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke="#06b6d4"
                    strokeWidth="1.2"
                    style={{ backdropFilter: 'blur(8px)' }}
                  />
                  <text x="0" y="3" textAnchor="middle" fontSize="7.5" fill="#06b6d4" fontWeight="bold" className="font-sans tracking-wide">
                    ❄️ FROZEN
                  </text>
                </g>
              </g>
            )}

            {/* ── DEPTH-DRIVEN ANIMATED NODE SHAPES ── */}
            {(() => {
              const fillColor = isFrozen ? 'rgba(6, 182, 212, 0.05)' : style.fill;
              const strokeColor = isFrozen ? '#06b6d4' : (isBurnedOut ? '#ef4444' : style.stroke);
              const sWidth = isFrozen || isBurnedOut ? 2.5 : style.strokeWidth;
              const pulseDuration = `${4 + (idSum % 4)}s`;
              const haloDuration  = `${18 + (idSum % 6)}s`;

              /* ── ROOT: Animated Hexagon ── */
              if (isCentral) {
                const R = Math.max(w, h) / 2 + 2;
                const hex6 = Array.from({ length: 6 }, (_, i) => {
                  const a = Math.PI / 180 * (60 * i - 30);
                  return `${R * Math.cos(a)},${R * Math.sin(a)}`;
                }).join(' ');
                const hexInner = Array.from({ length: 6 }, (_, i) => {
                  const a = Math.PI / 180 * (60 * i - 30);
                  const ir = R - 6;
                  return `${ir * Math.cos(a)},${ir * Math.sin(a)}`;
                }).join(' ');
                const haloR = R + 10;
                const haloPoints = Array.from({ length: 6 }, (_, i) => {
                  const a = Math.PI / 180 * (60 * i - 30);
                  return `${haloR * Math.cos(a)},${haloR * Math.sin(a)}`;
                }).join(' ');
                return (
                  <g>
                    {/* Slow-spinning outer halo ring */}
                    <polygon
                      points={haloPoints}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1}
                      strokeDasharray="10 6"
                      opacity={0.45}
                      style={{
                        transformOrigin: '0 0',
                        animation: `halo-spin ${haloDuration} linear infinite`,
                      }}
                    />
                    {/* Counter-spin second ring */}
                    <polygon
                      points={haloPoints}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={0.6}
                      strokeDasharray="4 14"
                      opacity={0.25}
                      style={{
                        transformOrigin: '0 0',
                        animation: `halo-counter ${(parseInt(haloDuration) + 4)}s linear infinite`,
                      }}
                    />
                    {/* Filled hexagon body */}
                    <polygon
                      points={hex6}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={sWidth}
                      style={{
                        filter: shadow,
                        animation: `node-breathe ${pulseDuration} ease-in-out infinite`,
                        transformOrigin: '0 0',
                      }}
                    />
                    {/* Inner glass highlight */}
                    <polygon
                      points={hexInner}
                      fill="rgba(255,255,255,0.12)"
                      stroke="none"
                      className="pointer-events-none"
                    />
                  </g>
                );
              }

              /* ── DEPTH 1: Animated Rounded Diamond ── */
              if (node.depth === 1) {
                const dW = w * 0.9;
                const dH = h * 1.15;
                // Draw a 4-corner diamond using SVG polygon
                const points = `0,${-dH/2} ${dW/2},0 0,${dH/2} ${-dW/2},0`;
                const innerPts = `0,${-(dH/2 - 6)} ${dW/2 - 5},0 0,${dH/2 - 6} ${-(dW/2 - 5)},0`;
                return (
                  <g>
                    {/* Pulsing outer glow ring */}
                    <polygon
                      points={`0,${-(dH/2+10)} ${dW/2+8},0 0,${dH/2+10} ${-(dW/2+8)},0`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1}
                      strokeDasharray="6 8"
                      opacity={0.35}
                      style={{
                        transformOrigin: '0 0',
                        animation: `halo-spin ${haloDuration} linear infinite`,
                      }}
                    />
                    {/* Diamond body */}
                    <polygon
                      points={points}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={sWidth}
                      style={{
                        filter: shadow,
                        animation: `node-breathe ${pulseDuration} ease-in-out infinite`,
                        animationDelay: `-${delay}s`,
                        transformOrigin: '0 0',
                      }}
                    />
                    {/* Glass inner sheen */}
                    <polygon
                      points={innerPts}
                      fill={isZenMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)'}
                      stroke="none"
                      className="pointer-events-none"
                    />
                  </g>
                );
              }

              /* ── DEPTH 2: Polished Pill / Stadium shape ── */
              if (node.depth === 2) {
                const pr = Math.min(h / 2, 16); // large radius = pill
                return (
                  <g>
                    {/* Pill body */}
                    <rect
                      x={-w / 2} y={-h / 2}
                      width={w} height={h}
                      rx={pr}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={sWidth}
                      style={{
                        filter: shadow,
                        animation: `node-breathe ${pulseDuration} ease-in-out infinite`,
                        animationDelay: `-${delay}s`,
                        transformOrigin: '0 0',
                      }}
                    />
                    {/* Pill inner highlight */}
                    <rect
                      x={-w / 2 + 2} y={-h / 2 + 2}
                      width={w - 4} height={(h - 4) / 2}
                      rx={pr - 2}
                      fill={isZenMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.52)'}
                      className="pointer-events-none"
                    />
                  </g>
                );
              }

              /* ── DEPTH 3+: Glowing Circle ── */
              const cr = Math.max(w, h) / 2;
              return (
                <g>
                  {/* Outer glow aura */}
                  <circle
                    r={cr + 8}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.8}
                    opacity={0.3}
                    style={{
                      animation: `leaf-glow ${pulseDuration} ease-in-out infinite`,
                      animationDelay: `-${delay}s`,
                      transformOrigin: '0 0',
                    }}
                  />
                  {/* Circle body */}
                  <circle
                    r={cr}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={sWidth}
                    style={{
                      filter: shadow,
                      animation: `leaf-glow ${pulseDuration} ease-in-out infinite`,
                      animationDelay: `-${(delay + 0.5)}s`,
                      transformOrigin: '0 0',
                    }}
                  />
                  {/* Inner highlight */}
                  <circle
                    r={cr - 4}
                    fill={isZenMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)'}
                    stroke="none"
                    className="pointer-events-none"
                  />
                </g>
              );
            })()}
            {/* Glowing Thermal Border Overlay & Progress Gauge */}
            {isHeatMapMode && !isCentral && !isBurnedOut && !isFrozen && (
              <g>
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={rx}
                  fill="none"
                  stroke={getHeatColor(node.id)}
                  strokeWidth="2.5"
                  className="pointer-events-none"
                  opacity="0.85"
                />
                <rect
                  x={-w / 2 + 10}
                  y={h / 2 - 4}
                  width={w - 20}
                  height={2.5}
                  rx={1.25}
                  fill={isZenMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)'}
                  className="pointer-events-none"
                />
                <rect
                  x={-w / 2 + 10}
                  y={h / 2 - 4}
                  width={(w - 20) * Math.min(nodeHeat / 120, 1)}
                  height={2.5}
                  rx={1.25}
                  fill={getHeatColor(node.id)}
                  className="pointer-events-none"
                />
              </g>
            )}
            {/* Shimmer border — only for pill nodes (depth 2) */}
            {node.depth === 2 && (
              <rect
                x={-w / 2 + 1}
                y={-h / 2 + 1}
                width={w - 2} height={h - 2} rx={Math.min(h / 2, 15)}
                fill="none"
                stroke={isZenMode ? 'rgba(99,102,241,0.15)' : 'rgba(78,91,255,0.08)'}
                strokeWidth={1}
                strokeDasharray={`${w * 0.3} ${w * 2}`}
                className="pointer-events-none"
                style={{
                  strokeDashoffset: `${shimmerOffset * w * 2}`,
                  animation: `shimmer-border ${8 + (idSum % 4)}s linear infinite`,
                }}
              />
            )}
            <text
              x={0}
              y={-((lines.length - 1) * lineHeight) / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              dominantBaseline="central"
              fill={style.text}
              fontSize={fontSize}
              fontWeight={900}
              letterSpacing={0}
              className={`select-none pointer-events-none ${activeTheme.textClass}`}
              style={{ fontFamily: activeTheme.fontFamily }}
            >
              {lines.map((line, index) => (
                <tspan key={line + index} x={mode === 'checklist' ? 14 : 0} dy={index === 0 ? 0 : lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
            {mode === 'checklist' && !isCentral && (
              <g transform={`translate(${-w/2 + 20}, 0)`}>
                 <circle r="8" fill="none" stroke={style.stroke} strokeWidth="1.5" />
                 <path d="M -4 0 L -1 3 L 4 -3" fill="none" stroke={style.stroke} strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}

            {/* Folding subtree trigger */}
            {hasChildren && (
              <g
                transform={`translate(0, ${h / 2})`}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeCollapse(node.id);
                }}
              >
                <circle
                  r="9"
                  className={`fill-white stroke-[1.5px] shadow-sm ${
                    isZenMode
                      ? 'stroke-indigo-500 fill-[#0f111a]'
                      : 'stroke-[#4e5bff]'
                  }`}
                />
                {isCollapsed ? (
                  <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke={isZenMode ? '#818cf8' : '#4e5bff'} strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <path d="M -4 0 L 4 0" stroke={isZenMode ? '#818cf8' : '#4e5bff'} strokeWidth="1.5" strokeLinecap="round" />
                )}
              </g>
            )}
          </g>
        </g>
      );
    });
  };

  const { minX, minY, width: vW, height: vH } = getViewBox(visibleNodes, positions, dimensions);

  useEffect(() => {
    const updateViewport = () => {
      if (!containerRef.current || !svgRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      if (svgRect.width === 0 || svgRect.height === 0) return;

      const x = minX + ((containerRect.left - svgRect.left) / svgRect.width) * vW;
      const y = minY + ((containerRect.top - svgRect.top) / svgRect.height) * vH;
      const w = (containerRect.width / svgRect.width) * vW;
      const h = (containerRect.height / svgRect.height) * vH;

      setViewportBox({ x, y, w, h });
    };

    const timer = setTimeout(updateViewport, 350);

    window.addEventListener('cortex-transform', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('cortex-transform', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [minX, minY, vW, vH, conceptMap, zoomScale]);

  // Deterministic starfield particle system
  const stars = React.useMemo(() => {
    const list = [];
    const count = 40;
    const seed = layoutGraph.nodes.length || 12;
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count + (i * 1.37);
      const radius = 100 + (i * 27 + seed) % 750;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const size = 1.2 + ((i + seed) % 3) * 0.6;
      list.push({ x, y, size, key: i });
    }
    return list;
  }, [layoutGraph.nodes.length]);

  // Dynamic grid stroke and dot colors based on Zen Mode
  const gridStroke = isZenMode ? 'rgba(255, 255, 255, 0.035)' : 'rgba(78, 91, 255, 0.06)';
  const gridDotFill = isZenMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(78, 91, 255, 0.14)';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={"w-full h-full min-h-0 transition-colors duration-1000 select-none relative " + (isZenMode ? "bg-[#05070a]" : "bg-transparent")}
      style={{ cursor: freeNodeDrag?.didMove ? 'grabbing' : 'default' }}
    >
      {prefersReducedMotion && (
        <style>{`
          * {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            animation: none !important;
            transition: none !important;
          }
        `}</style>
      )}
      {/* ── AUTO-MORPH SHAPE TRANSITION BADGE ── */}
      {autoMorphMode && (
        <div
          className="absolute top-4 left-1/2 z-50 pointer-events-none select-none"
          style={{
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            opacity: morphLabelVisible ? 1 : 0,
            transform: morphLabelVisible ? 'translateX(-50%) translateY(0px)' : 'translateX(-50%) translateY(-14px)',
          }}
        >
          <div
            style={{
              background: isZenMode
                ? `rgba(5,4,16,0.88)`
                : `rgba(255,255,255,0.92)`,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${MORPH_SEQUENCE[morphIndex].color}55`,
              boxShadow: `0 4px 32px ${MORPH_SEQUENCE[morphIndex].color}30, 0 0 0 1px ${MORPH_SEQUENCE[morphIndex].color}18`,
              borderRadius: '100px',
              padding: '6px 20px 6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Pulsing color dot */}
            <span
              style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: MORPH_SEQUENCE[morphIndex].color,
                boxShadow: `0 0 10px ${MORPH_SEQUENCE[morphIndex].color}`,
                display: 'inline-block',
                animation: 'leaf-glow 1s ease-in-out infinite',
              }}
            />
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: isZenMode ? '#e2e8f0' : '#1e293b',
            }}>
              {MORPH_SEQUENCE[morphIndex].icon} {morphLabel}
            </span>
          </div>
        </div>
      )}
      {/* Dot indicators showing sequence position */}
      {autoMorphMode && (
        <div
          className="absolute bottom-4 left-1/2 z-50 pointer-events-none"
          style={{ transform: 'translateX(-50%)', display: 'flex', gap: 6 }}
        >
          {MORPH_SEQUENCE.map((m, i) => (
            <div
              key={i}
              style={{
                width: i === morphIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === morphIndex ? m.color : (isZenMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'),
                boxShadow: i === morphIndex ? `0 0 8px ${m.color}` : 'none',
                transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          ))}
        </div>
      )}
      {dimensionMode === '3D' ? (
        <Scene3D
          nodes={visibleNodes}
          relationships={visibleRelationships}
          positions={positions}
          highlightedNode={hoveredNodeId || highlightedNode}
          setHighlightedNode={setHoveredNodeId}
          selectedNodeId={highlightedNode}
          onNodeClick={onNodeClick}
          isZenMode={isZenMode}
          masteryMap={masteryMap}
          scholarPersona={scholarPersona}
          activeTheme={activeTheme}
          isHeatMapMode={isHeatMapMode}
          nodeTimeSpent={nodeTimeSpent}
          speakingNodeId={speakingNodeId}
          speakConcept={speakConcept}
          onAskSARA={onAskSARA}
          pingNodeId={pingNodeId}
          onRelationshipClick={onRelationshipClick}
        />
      ) : (
        <svg
          ref={svgRef}
          width="100%" height="100%"
          viewBox={minX + " " + minY + " " + vW + " " + vH}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full animate-in fade-in duration-700"
        >
        <defs>
          <style>
            {`
              @keyframes tech-spin-clockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes tech-spin-counter {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }
              @keyframes neural-float {
                0% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-1.5px) rotate(0.08deg); }
                100% { transform: translateY(0px) rotate(0deg); }
              }
              @keyframes cortex-drift {
                0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                33% { transform: translateY(-7px) translateX(4px) rotate(0.35deg); }
                66% { transform: translateY(5px) translateX(-5px) rotate(-0.25deg); }
                100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
              }
              @keyframes shimmer-border {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -600; }
              }
              @keyframes soundWave {
                0%, 100% { height: 3px; }
                50% { height: 8px; }
              }
              @keyframes activeCascadeFlow {
                from { stroke-dashoffset: 32; }
                to { stroke-dashoffset: 0; }
              }
              .stroke-dash-animate {
                animation: activeCascadeFlow 2.2s linear infinite;
                filter: drop-shadow(0 0 2px currentColor);
              }
              @keyframes quantumHelix {
                0% { stroke-dashoffset: 0; opacity: 0.85; }
                50% { stroke-dashoffset: 24; opacity: 1; }
                100% { stroke-dashoffset: 48; opacity: 0.85; }
              }
              .quantum-helix-line {
                animation: quantumHelix 3s linear infinite;
                filter: drop-shadow(0 0 4px currentColor);
              }
              .constellation-trail {
                filter: drop-shadow(0 0 2.5px rgba(245, 158, 11, 0.45));
              }
              @keyframes halo-spin {
                0%   { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes halo-counter {
                0%   { transform: rotate(0deg); }
                100% { transform: rotate(-360deg); }
              }
              @keyframes node-breathe {
                0%, 100% { opacity: 0.7; transform: scale(1); }
                50%       { opacity: 1;   transform: scale(1.035); }
              }
              @keyframes diamond-pulse {
                0%, 100% { transform: rotate(45deg) scale(1); }
                50%       { transform: rotate(45deg) scale(1.04); }
              }
              @keyframes leaf-glow {
                0%, 100% { opacity: 0.55; }
                50%       { opacity: 1; }
              }
              @keyframes ripple-out {
                0%   { r: 0;   opacity: 0.7; }
                100% { r: 80;  opacity: 0; }
              }
              @keyframes corona-pulse {
                0%, 100% { opacity: 0.18; transform: scale(1); }
                50%       { opacity: 0.45; transform: scale(1.08); }
              }
              @keyframes star-drift {
                0%   { transform: translate(0px, 0px); }
                33%  { transform: translate(4px, -3px); }
                66%  { transform: translate(-3px, 4px); }
                100% { transform: translate(0px, 0px); }
              }
              @keyframes edge-surge {
                0%   { stroke-dashoffset: 240; opacity: 0.9; }
                100% { stroke-dashoffset: 0;   opacity: 0.15; }
              }
              @keyframes spring-in {
                0%   { transform: scale(0.05); opacity: 0; }
                60%  { transform: scale(1.12);  opacity: 1; }
                80%  { transform: scale(0.94); }
                100% { transform: scale(1); }
              }
              @keyframes root-corona {
                0%, 100% { transform: scale(1);    opacity: 0.22; }
                50%       { transform: scale(1.15); opacity: 0.05; }
              }
              @keyframes node-hover-pulse {
                0%   { transform: scale(1); }
                30%  { transform: scale(1.08); }
                60%  { transform: scale(0.97); }
                100% { transform: scale(1); }
              }
            `}
          </style>

          {/* Phase 9: Dynamic Central Node Gradients & Premium Glassmorphic Gradients */}
          {(() => {
            const lblVal = (moduleTitle || '').toLowerCase();
            let gStart = '#4e5bff';
            let gMid = '#6366f1';
            let gEnd = '#4338ca';
            if (lblVal.includes('front') || lblVal.includes('ux') || lblVal.includes('design') || lblVal.includes('react') || lblVal.includes('web')) {
              gStart = '#ff512f';
              gMid = '#f09819';
              gEnd = '#ff512f';
            } else if (lblVal.includes('back') || lblVal.includes('sql') || lblVal.includes('mongo') || lblVal.includes('node') || lblVal.includes('api') || lblVal.includes('database')) {
              gStart = '#06b6d4';
              gMid = '#0891b2';
              gEnd = '#0369a1';
            } else if (lblVal.includes('devops') || lblVal.includes('cloud') || lblVal.includes('platform') || lblVal.includes('sre') || lblVal.includes('aws') || lblVal.includes('docker') || lblVal.includes('kubernetes')) {
              gStart = '#ec4899';
              gMid = '#d946ef';
              gEnd = '#7c3aed';
            } else if (lblVal.includes('ai') || lblVal.includes('machine') || lblVal.includes('data') || lblVal.includes('mlops') || lblVal.includes('nlp')) {
              gStart = '#10b981';
              gMid = '#059669';
              gEnd = '#047857';
            }
            return (
              <>
                <linearGradient id="node-grad-0" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gStart} />
                  <stop offset="50%" stopColor={gMid} />
                  <stop offset="100%" stopColor={gEnd} />
                </linearGradient>
                <linearGradient id="node-grad-zen-0" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gStart} />
                  <stop offset="50%" stopColor={gMid} />
                  <stop offset="100%" stopColor={gEnd} />
                </linearGradient>
              </>
            );
          })()}

          <linearGradient id="node-glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.94)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.74)" />
          </linearGradient>

          <linearGradient id="node-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <linearGradient id="node-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="100%" stopColor="#ede9fe" />
          </linearGradient>
          <linearGradient id="node-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Phase 9: Glassmorphic Node Gradients — Zen Mode */}
          <linearGradient id="node-grad-zen-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(14, 165, 233, 0.16)" />
            <stop offset="100%" stopColor="rgba(14, 165, 233, 0.06)" />
          </linearGradient>
          <linearGradient id="node-grad-zen-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.16)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.06)" />
          </linearGradient>
          <linearGradient id="node-grad-zen-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.06)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.01)" />
          </linearGradient>

          {/* Phase 9: Edge Glow Filter */}
          <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          <filter id="synapse-particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="thermal-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="15" />
          </filter>

          <linearGradient id="thermal-scan-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.18)" />
            <stop offset="40%" stopColor="rgba(239, 68, 68, 0.05)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
          </linearGradient>

          {/* Phase 9: Dynamic Connection Gradients */}
          {renderConnectionGradients()}

          {/* Fine Sub-grid Tick Pattern */}
          <pattern id="sub-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke={isZenMode ? 'rgba(255, 255, 255, 0.012)' : 'rgba(78, 91, 255, 0.025)'}
              strokeWidth="0.75"
            />
          </pattern>

          {/* Holographic Dual-Lattice Grid */}
          <pattern id="main-grid" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="url(#sub-grid)" />
            <path
              d="M 200 0 L 0 0 0 200"
              fill="none"
              stroke={gridStroke}
              strokeWidth="1.2"
            />
            {/* Holographic Plus Coordinate Intersections */}
            <path
              d="M -6 0 L 6 0 M 0 -6 L 0 6"
              stroke={gridDotFill}
              strokeWidth="1"
            />
          </pattern>

          {/* Vignette Depth Aura */}
          <radialGradient id="vignette-glow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={isZenMode ? 'rgba(99, 102, 241, 0.06)' : 'rgba(78, 91, 255, 0.03)'} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <filter id="arrowhead-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Arrowhead marker — markerUnits=userSpaceOnUse so dimensions are in SVG px, not strokeWidth multiples */}
          <marker id="arrowhead" markerWidth="14" markerHeight="10" refX="13" refY="5" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
            <polygon
              points="0 0, 14 5, 0 10"
              fill={isZenMode ? '#a78bfa' : '#4e5bff'}
              stroke={isZenMode ? 'rgba(167,139,250,0.4)' : 'rgba(78,91,255,0.4)'}
              strokeWidth="1"
              filter="url(#arrowhead-glow)"
            />
          </marker>
          <marker id="arrowhead-highlight" markerWidth="14" markerHeight="10" refX="13" refY="5" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
            <polygon points="0 0, 14 5, 0 10" fill="#f59e0b" stroke="rgba(245,158,11,0.5)" strokeWidth="1" filter="url(#arrowhead-glow)" />
          </marker>
        </defs>

        {/* Blueprint Grid and Radial Glow — Parallax Layer 1 */}
        <g style={{ transform: `translate(${parallax.x * 12}px, ${parallax.y * 12}px)`, transition: 'transform 0.1s ease-out' }}>
          {(isZenMode || isHeatMapMode) && (
            <rect x={minX - 100} y={minY - 100} width={vW + 200} height={vH + 200} fill={isHeatMapMode ? '#040712' : '#050410'} />
          )}
          <rect x={minX - 100} y={minY - 100} width={vW + 200} height={vH + 200} fill="url(#main-grid)" />
          <rect x={minX} y={minY} width={vW} height={vH} fill="url(#vignette-glow)" className="pointer-events-none" />
        </g>

        {/* Dynamic sliding thermal scan overlay */}


        {/* Starfield Particle Layer & Constellation Synapse Web — Parallax Layer 2 */}
        <g opacity={isZenMode ? 0.35 : 0.15} style={{ transform: `translate(${parallax.x * 24}px, ${parallax.y * 24}px)`, transition: 'transform 0.1s ease-out' }}>
          {stars.map((star, idx) => {
            if (idx >= stars.length - 1) return null;
            const nextStar = stars[idx + 1];
            const dist = Math.hypot(nextStar.x - star.x, nextStar.y - star.y);
            if (dist > 300) return null;
            return (
              <line
                key={'constel-' + idx}
                x1={star.x}
                y1={star.y}
                x2={nextStar.x}
                y2={nextStar.y}
                stroke={isZenMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(78, 91, 255, 0.06)'}
                strokeWidth="0.5"
                strokeDasharray="2,4"
              />
            );
          })}
          {stars.map(star => {
            const driftDur = 8 + (star.key * 3.7) % 12;
            const driftDelay = (star.key * 1.3) % 8;
            return (
              <circle
                key={star.key}
                cx={star.x}
                cy={star.y}
                r={star.size}
                fill={isZenMode ? '#818cf8' : '#4e5bff'}
                opacity={0.4}
                style={{
                  animation: `star-drift ${driftDur}s ease-in-out infinite`,
                  animationDelay: `-${driftDelay}s`,
                  transformOrigin: `${star.x}px ${star.y}px`,
                }}
              />
            );
          })}
        </g>

        {/* Dynamic Holographic Concentric Scope and Azimuth Guides — Parallax Layer 3 */}
        <g style={{ transform: `translate(${parallax.x * 6}px, ${parallax.y * 6}px)`, transition: 'transform 0.1s ease-out' }}>
          {renderCompassScope(minX, minY, vW, vH)}
          {activeTheme.id === 'einstein' && (
            <g style={{ transformOrigin: '0px 0px', animation: 'tech-spin-clockwise 180s linear infinite' }} opacity="0.35">
              <circle cx="0" cy="0" r="150" fill="none" stroke="rgba(59, 130, 246, 0.12)" strokeWidth="1" strokeDasharray="5,15" />
              <circle cx="0" cy="0" r="350" fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1" strokeDasharray="10,30" />
              <circle cx="106" cy="-106" r="4" fill="rgba(59, 130, 246, 0.5)" className="animate-pulse" />
              <circle cx="-247" cy="247" r="6" fill="rgba(59, 130, 246, 0.4)" />
            </g>
          )}
        </g>



        {/* BACKGROUND WATERMARK */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          className="fill-[#4e5bff] font-black pointer-events-none uppercase select-none"
          style={{ opacity: isZenMode ? 0.015 : 0.025 }}
          fontSize="110"
          letterSpacing="0.15em"
          transform="rotate(-20)"
        >
          {moduleTitle ? moduleTitle.substring(0, 20) : 'CORTEX'}
        </text>

        {renderHUD(minX, minY, vW, vH)}
        {renderChronosRail()}
        {renderMatrixHeaders()}
        {/* Cinematic Topological Guided Tour Constellation Path Trail */}
        {tourPathD && (() => {
          const tourIndex = tourNodeId ? tourOrder.indexOf(tourNodeId) : -1;
          return (
            <g opacity={isZenMode ? 0.45 : 0.6}>
              {/* Background neon blur glow */}
              <path
                d={tourPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                filter="url(#edge-glow)"
              />
              {/* Animated foreground dash line */}
              <path
                d={tourPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="12,12"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="constellation-trail"
              />
              {/* Waypoint beacons for upcoming tour nodes (static, clean) */}
              {tourOrder.slice(tourIndex + 1).map((id) => {
                const pos = positions.get(id);
                if (!pos) return null;
                return (
                  <g key={`waypoint-${id}`} transform={`translate(${pos.x}, ${pos.y})`} opacity="0.6">
                    <circle
                      r={11}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <circle
                      r={3.5}
                      fill="#f59e0b"
                    />
                  </g>
                );
              })}
            </g>
          );
        })()}
        {renderConnections()}
        {entangledPair && (() => {
          const fromPos = positions.get(entangledPair.from.id);
          const toPos = positions.get(entangledPair.to.id);
          if (!fromPos || !toPos) return null;

          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const angle = Math.atan2(dy, dx);

          const pointsCount = 40;
          const pathAPoints: string[] = [];
          const pathBPoints: string[] = [];

          for (let i = 0; i <= pointsCount; i++) {
            const t = i / pointsCount;
            const x = fromPos.x + dx * t;
            const y = fromPos.y + dy * t;

            const wave = Math.sin(t * Math.PI * 8) * 16;
            const px = -Math.sin(angle) * wave;
            const py = Math.cos(angle) * wave;

            pathAPoints.push(`${x + px},${y + py}`);
            pathBPoints.push(`${x - px},${y - py}`);
          }

          const dA = `M ${pathAPoints.join(' L ')}`;
          const dB = `M ${pathBPoints.join(' L ')}`;

          return (
            <g>
              <path d={dA} fill="none" stroke="#a78bfa" strokeWidth="3" className="quantum-helix-line animate-pulse" strokeDasharray="6,6" />
              <path d={dB} fill="none" stroke="#f472b6" strokeWidth="3" className="quantum-helix-line animate-pulse" strokeDasharray="6,6" />

              {Array.from({ length: 15 }).map((_, idx) => {
                const t = (idx + 1) / 16;
                const x = fromPos.x + dx * t;
                const y = fromPos.y + dy * t;
                const wave = Math.sin(t * Math.PI * 8) * 16;
                const px = -Math.sin(angle) * wave;
                const py = Math.cos(angle) * wave;

                return (
                  <line
                    key={idx}
                    x1={x + px} y1={y + py}
                    x2={x - px} y2={y - py}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                );
              })}

              <circle r="4" fill="#a78bfa" style={{ filter: 'drop-shadow(0 0 8px #a78bfa)' }}>
                <animateMotion dur="2s" repeatCount="indefinite" path={dA} />
              </circle>
              <circle r="4" fill="#f472b6" style={{ filter: 'drop-shadow(0 0 8px #f472b6)' }}>
                <animateMotion dur="2s" repeatCount="indefinite" path={dB} begin="1s" />
              </circle>
            </g>
          );
        })()}
        {renderNodes()}
        {/* Arrowheads rendered in their own top-layer group \u2014 always above node cards */}
        {renderArrowheads()}

        {/* Phase 10: Neon Spark Particles */}
        {particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size}
            fill={p.color}
            opacity={p.opacity}
            style={{ filter: 'drop-shadow(0 0 6px ' + p.color + ')' }}
            className="pointer-events-none"
          />
        ))}

        {/* Phase 10: Relationship Lab placeholders */}
        {challenge?.active && challenge.nodes.map(n => (
          <g key={'place-' + n.id} opacity={n.isPlaced ? 0.25 : 0.65}>
            <rect
              x={n.originalX - 60}
              y={n.originalY - 24}
              width={120}
              height={48}
              rx={12}
              fill="none"
              stroke={isZenMode ? '#818cf8' : '#4e5bff'}
              strokeWidth={1.8}
              strokeDasharray="6,4"
            />
            <text
              x={n.originalX}
              y={n.originalY}
              textAnchor="middle"
              alignmentBaseline="middle"
              dominantBaseline="central"
              fill={isZenMode ? '#a5b4fc' : '#4e5bff'}
              fontSize={7}
              fontWeight={900}
              className="opacity-60 pointer-events-none select-none font-mono"
            >
              PLACE HERE
            </text>
          </g>
        ))}

        {/* Phase 10: Relationship Lab Draggable Cards */}
        {challenge?.active && challenge.nodes.filter(n => !n.isPlaced).map(n => (
          <g
            key={'drag-' + n.id}
            transform={`translate(${n.currentX}, ${n.currentY})`}
            onPointerDown={(e) => handlePointerDown(e, n.id)}
            className="cursor-grab active:cursor-grabbing select-none"
          >
            <rect
              x={-60}
              y={-24}
              width={120}
              height={48}
              rx={12}
              fill={isZenMode ? 'rgba(15,17,26,0.92)' : 'rgba(255,255,255,0.95)'}
              stroke={isZenMode ? 'rgba(129,140,248,0.7)' : '#4e5bff'}
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              alignmentBaseline="middle"
              dominantBaseline="central"
              fill={isZenMode ? '#f8fafc' : '#0f172a'}
              fontSize={9}
              fontWeight={900}
              className="pointer-events-none select-none font-sans"
            >
              {n.label.length > 18 ? n.label.substring(0, 15) + '..' : n.label}
            </text>
          </g>
        ))}
      </svg>
      )}



      {/* Phase 9: AI Hover Tooltip */}
      {hoverTooltip && (() => {
        // Convert SVG coordinates to approximate screen position
        const svgEl = containerRef.current?.querySelector('svg');
        if (!svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const svgW = vW || 1;
        const svgH = vH || 1;
        const screenX = ((hoverTooltip.x - minX) / svgW) * rect.width;
        const screenY = ((hoverTooltip.y - minY) / svgH) * rect.height;
        return (
          <div
            className={`absolute z-[200] pointer-events-none animate-in fade-in zoom-in-95 duration-300`}
            style={{ left: screenX + 20, top: screenY - 40, maxWidth: 240 }}
          >
            <div className={`p-3 rounded-xl border shadow-2xl backdrop-blur-2xl ${
              isZenMode ? 'bg-[#0f111a]/95 border-indigo-500/30 text-slate-200' : 'bg-white/97 border-slate-200 text-slate-700'
            }`}>
              <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {visibleNodes.find(n => n.id === hoverTooltip.nodeId)?.label}
              </div>
              <p className="text-[11px] leading-relaxed opacity-80">{hoverTooltip.summary}</p>
            </div>
          </div>
        );
      })()}

      {/* Phase 9: Radial Command Menu */}
      {radialMenu && (() => {
        const svgEl = containerRef.current?.querySelector('svg');
        if (!svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const svgW = vW || 1;
        const svgH = vH || 1;
        const screenX = ((radialMenu.x - minX) / svgW) * rect.width;
        const screenY = ((radialMenu.y - minY) / svgH) * rect.height;

        const menuItems = [
          { icon: <Eye size={13} />, label: 'Deep Dive', action: () => { onNodeClick(radialMenu.node); setRadialMenu(null); } },
          { icon: <ShieldQuestion size={13} />, label: 'Check Understanding', action: () => { onTestMastery?.(radialMenu.node); setRadialMenu(null); } },
          { icon: <FolderTree size={13} />, label: 'Fold Branch', action: () => { toggleNodeCollapse(radialMenu.node.id); setRadialMenu(null); } },
          { icon: <Activity size={13} className="text-purple-400" />, label: 'Quantum Entangle', action: () => { setEntangleStartNode(radialMenu.node); toast.info(`Select second concept to entangle with "${radialMenu.node.label}"...`); setRadialMenu(null); } },
          { icon: <MessageCircle size={13} />, label: 'Ask SARA', action: () => { onAskSARA?.(radialMenu.node); setRadialMenu(null); } },
          ...(mode === 'palace' ? [
            { icon: <Network size={13} />, label: 'Relationship Check', action: () => { startChallenge(radialMenu.node); setRadialMenu(null); } }
          ] : []),
        ];

        return (
          <div
            className="absolute z-[300] animate-in fade-in zoom-in-50 duration-200"
            style={{ left: screenX - 75, top: screenY - 75, width: 150, height: 150 }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, i) => {
              const angle = (i / menuItems.length) * Math.PI * 2 - Math.PI / 2;
              const r = 58;
              const x = 75 + Math.cos(angle) * r - 16;
              const y = 75 + Math.sin(angle) * r - 16;
              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); item.action(); }}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-125 shadow-lg border ${
                    isZenMode
                      ? 'bg-[#0f111a] border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20'
                      : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                  }`}
                  style={{
                    left: x,
                    top: y,
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={item.label}
                >
                  {item.icon}
                </button>
              );
            })}
            {/* Center label */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-wider text-center ${
              isZenMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {radialMenu.node.label.substring(0, 8)}
            </div>
          </div>
        );
      })()}



      {/* Phase 10: Challenge Mode Floating Guide Panel */}
      {challenge?.active && (
        <div
          className={`absolute top-6 left-6 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl z-[250] select-none font-sans flex flex-col gap-2.5 w-72 pointer-events-auto animate-in slide-in-from-left-6 duration-300 ${
            isZenMode
              ? 'bg-[#0f111a]/95 border-indigo-500/25 text-slate-200 shadow-black/60'
              : 'bg-white/95 border-indigo-100 text-slate-800 shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#4e5bff] dark:text-indigo-450 text-[10.5px] font-black uppercase tracking-widest">
              <Network size={14} className="animate-pulse" />
              <span>Relationship Check</span>
            </div>
            <button
              onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
              className={`p-1 rounded-lg transition-all cursor-pointer ${
                isZenMode ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
              }`}
              title="Quit Challenge"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-[10px] font-bold ${isZenMode ? 'text-slate-450' : 'text-slate-500'}`}>Connection Progress:</span>
            <span className="text-xs font-black font-mono text-emerald-500">
              {challenge.nodes.filter(n => n.isPlaced).length} / {challenge.nodes.length}
            </span>
          </div>

          {/* Elegant progress track */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4e5bff] to-emerald-500 transition-all duration-500"
              style={{ width: `${(challenge.nodes.filter(n => n.isPlaced).length / challenge.nodes.length) * 100}%` }}
            />
          </div>

          <p className={`text-[9.5px] leading-relaxed mt-1 opacity-70 ${isZenMode ? 'text-slate-450' : 'text-slate-500'}`}>
            Drag the concepts from the outer ring onto their correct highlighted placeholders in the center.
          </p>

          <button
            onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
            className={`w-full py-2.5 mt-1.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center justify-center gap-1.5 active:scale-95 select-none ${
              isZenMode
                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300 shadow-red-950/20'
                : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-650 hover:text-red-800 shadow-slate-100'
            }`}
          >
            <X size={12} strokeWidth={2.5} />
            Exit Challenge
          </button>
        </div>
      )}

      {/* Phase 10: Relationship Check Completed Banner */}
      {challenge?.active && challenge.nodes.every(n => n.isPlaced) && (
        <div
          className="absolute inset-0 bg-[#020306]/75 backdrop-blur-md z-[250] flex items-center justify-center pointer-events-auto animate-in fade-in duration-500"
          onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
        >
          <div className="p-8 max-w-md rounded-3xl border border-emerald-500/35 bg-[#0f111a]/95 text-center shadow-[0_0_50px_rgba(16,185,129,0.18)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40 text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-emerald-400 text-base font-black uppercase tracking-widest mb-1">Relationship Evidence Captured</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                You reconstructed the dependency bridge for this branch. SARA can use this signal to decide whether to advance, review, or ask for transfer practice.
              </p>
            </div>
            <button
              onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Save Evidence
            </button>
          </div>
        </div>
      )}

      {/* Phase 10: Chronos Spacetime Scrubbing Slider HUD */}
      {mode === 'chronos' && (
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 p-3.5 px-6 rounded-2xl border shadow-xl backdrop-blur-xl z-[150] select-none font-mono text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 pointer-events-auto transition-all ${
            isZenMode
              ? 'bg-[#0f111a]/95 border-white/10 text-indigo-400'
              : 'bg-white/95 border-slate-200/60 text-[#4e5bff]'
          }`}
          style={{ width: 280 }}
        >
          <div className="flex justify-between w-full font-black">
            <span>Spacetime Depth</span>
            <span>Depth {chronosDepth}</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={chronosDepth}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setChronosDepth(val);
              playChime(val);
            }}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-[#4e5bff]"
          />
          <span className="text-[7px] text-slate-400 text-center font-bold">Scrub to fold/unfold conceptual depth layers</span>
        </div>
      )}

      {/* Phase 10: Quantum Entanglement Dialogue Overlay */}
      {entangledPair && (
        <div
          className="absolute inset-0 bg-[#020306]/75 backdrop-blur-md z-[260] flex items-center justify-center pointer-events-auto animate-in fade-in duration-500"
          onClick={() => setEntangledPair(null)}
        >
          <div
            style={{ width: 440 }}
            className={`p-6 rounded-3xl border text-left shadow-[0_0_50px_rgba(139,92,246,0.18)] flex flex-col gap-4 animate-in zoom-in-95 duration-300 max-h-[80%] overflow-y-auto ${
              isZenMode
                ? 'bg-[#0f111a]/95 border-purple-500/35 text-slate-100'
                : 'bg-white/98 border-purple-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-white/10">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-wider">
                <Activity size={16} className="animate-pulse" />
                <span>Quantum Concept Entanglement</span>
              </div>
              <button
                onClick={() => setEntangledPair(null)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X size={13} />
              </button>
            </div>
            <div>
              <h3 className="text-purple-300 text-sm font-black uppercase tracking-tight mb-0.5">
                {entangledPair.from.label} ⟷ {entangledPair.to.label}
              </h3>
              <div className="text-[7.5px] font-mono tracking-widest text-slate-500 uppercase mt-1 mb-3">
                Lateral Synaptic Bridge
              </div>
              {isEntanglingApi ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader size={20} className="animate-spin text-purple-400" />
                  <span className="text-[8.5px] font-mono tracking-wider uppercase text-purple-300 animate-pulse">Calculating Synaptic Entanglement...</span>
                </div>
              ) : (
                <div className={`prose prose-sm max-w-none text-[12px] leading-relaxed font-sans ${isZenMode ? 'text-slate-350' : 'text-slate-650'}`}>
                  <ReactMarkdown>{entangledPair.explanation || ''}</ReactMarkdown>
                </div>
              )}
            </div>
            {!isEntanglingApi && (
              <button
                onClick={() => setEntangledPair(null)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all mt-2 cursor-pointer"
              >
                Close Bridge
              </button>
            )}
          </div>
        </div>
      )}
      {/* ── Viewport Minimap HUD ── */}
      {!activeChallengeNodeId && visibleNodes.length > 0 && (
        <div
          className={`absolute bottom-6 right-6 z-[160] rounded-2xl border backdrop-blur-md shadow-2xl p-2.5 select-none pointer-events-auto transition-all ${
            isZenMode
              ? 'bg-[#0a0c14]/90 border-white/10 shadow-black/80'
              : 'bg-white/90 border-slate-200/60 shadow-slate-250/50'
          }`}
          style={{ width: 180, height: 135 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-1 mb-1.5 border-slate-100 dark:border-white/5 font-mono">
            <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Viewport Radar</span>
            <span className="text-[6.5px] font-bold text-slate-500">{zoomScale.toFixed(1)}x</span>
          </div>

          {/* Minimap Canvas */}
          <div className="w-full h-[95px] relative overflow-hidden rounded-lg bg-slate-50/50 dark:bg-black/30">
            <svg
              width="100%"
              height="100%"
              viewBox={`${minX} ${minY} ${vW} ${vH}`}
              preserveAspectRatio="xMidYMid meet"
              className="cursor-crosshair w-full h-full"
              onClick={handleMinimapClick}
            >
              {/* Simplified connections */}
              {visibleRelationships.map((rel, idx) => {
                const from = positions.get(rel.from);
                const to = positions.get(rel.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`mini-rel-${idx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isZenMode ? 'rgba(255,255,255,0.06)' : 'rgba(78,91,255,0.1)'}
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Simplified node dots */}
              {visibleNodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                const isCentral = node.depth === 0;
                const isNodeHighlighted = highlightedNode === node.id || hoveredNodeId === node.id;
                
                let fill = isCentral 
                  ? '#4e5bff' 
                  : node.depth === 1 
                    ? '#0ea5e9' 
                    : '#cbd5e1';
                
                if (isZenMode) {
                  fill = isCentral 
                    ? '#818cf8' 
                    : node.depth === 1 
                      ? '#a78bfa' 
                      : 'rgba(255,255,255,0.15)';
                }

                if (isNodeHighlighted) {
                  fill = '#f59e0b';
                }

                return (
                  <circle
                    key={`mini-node-${node.id}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={isCentral ? 8 : node.depth === 1 ? 5 : 3.5}
                    fill={fill}
                    className="transition-colors duration-350"
                  />
                );
              })}

              {/* Viewport tracking overlay */}
              {viewportBox.w > 0 && viewportBox.h > 0 && (
                <rect
                  x={viewportBox.x}
                  y={viewportBox.y}
                  width={viewportBox.w}
                  height={viewportBox.h}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={Math.max(vW, vH) * 0.006}
                  style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.4))' }}
                />
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptMapRenderer;
export { ConceptMapRenderer };
