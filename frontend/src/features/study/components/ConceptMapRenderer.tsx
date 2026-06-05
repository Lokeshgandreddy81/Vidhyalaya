import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  Thermometer, Eye, ShieldQuestion, FolderTree, Activity, MessageCircle,
  Gamepad2, X, Sparkles, Play, Flame, Volume2, VolumeX, Trophy, Loader
} from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { chatWithTutor } from '../../../services/geminiService';
import type { ConceptNode, ConceptMap, VisualMode, MasteryStatus, ScholarPersona, SoundRoomMode, Point, NodeMetrics, LayoutGraph } from '../types';
import { NODE_COLORS, ZEN_NODE_COLORS, MAP_PADDING } from '../types';
import { buildLayoutGraph, centerPositions, resolveNodeOverlaps, getViewBox, getEdgePoint, getNodeMetrics, wrapLabel, getHeatColor, getNodeStyle } from '../utils/layout';
import { CodeRainCanvas } from '../utils/sound';

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
}> = ({ conceptMap, mode: _mode, onNodeClick, highlightedNode, isZenMode = false, pingNodeId, moduleTitle, searchQuery, masteryMap, tourNodeId, tourOrder = [], connectionFilter, isHeatMapMode = false, nodeTimeSpent, onFoldBranch, onTestMastery, onAskSARA, zoomScale = 1, activeChallengeNodeId, onChallengeEnd, scholarPersona = 'visionary', soundRoomMode = 'muted', onSoundRoomModeChange, activeLensFilter = 'none', onDefrostNode }) => {
  const mode = _mode as string;
  const isTourRunning = !!tourNodeId;
  const activeTourNode = tourNodeId ? (conceptMap?.nodes || []).find(n => n.id === tourNodeId) : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const continuousOscsRef = useRef<OscillatorNode[]>([]);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Phase 10: 3D Cosmic Parallax Handlers ──
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
      const response = await chatWithTutor([], prompt, 'SYSTEM_AUTH: QUANTUM_ENTANGLER');
      setEntangledPair({ from: nodeA, to: nodeB, explanation: response });
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

  // ── Phase 10: Mind Palace Arena Drag and Drop handlers ──
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
    if (!draggedNode || !challenge) return;
    
    // Physical screen move deltas
    const deltaScreenX = e.clientX - draggedNode.startX;
    const deltaScreenY = e.clientY - draggedNode.startY;

    // Convert screen deltas to viewBox deltas using locked scale ratio
    const deltaX = deltaScreenX * draggedNode.scaleX;
    const deltaY = deltaScreenY * draggedNode.scaleY;

    setChallenge(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => {
          if (n.id === draggedNode.id) {
            return {
              ...n,
              currentX: draggedNode.offsetX + deltaX,
              currentY: draggedNode.offsetY + deltaY
            };
          }
          return n;
        })
      };
    });
  };

  const handlePointerUp = () => {
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
        const resp = await chatWithTutor([], `In exactly 2 sentences, explain "${node.label}" in the context of "${moduleTitle}". Be concise and precise.`, `TOOLTIP // ${node.label}`);
        const summary = resp.slice(0, 200);
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

    const newPositions = new Map<string, { x: number; y: number }>();

    const childMap = visibleChildMap;
    const rootId = layoutGraph.rootId;
    const nodeCount = visibleNodes.length;
    const isLinearMode = ['hierarchy', 'tree', 'flow', 'architect', 'chronos', 'ladder', 'matrix', 'checklist', 'cascade', 'pulse', 'mosaic'].includes(mode);

    const leafCountCache = new Map<string, number>();
    const getLeafCount = (id: string): number => {
      if (leafCountCache.has(id)) return leafCountCache.get(id)!;
      const children = childMap.get(id) || [];
      const count = children.length === 0 ? 1 : children.reduce((sum, childId) => sum + getLeafCount(childId), 0);
      leafCountCache.set(id, count);
      return count;
    };

    if (isLinearMode) {
      let nextLeaf = 0;
      const rootMetrics = getNodeMetrics(visibleNodes.find(node => node.id === rootId) || visibleNodes[0]);
      const crossGap = mode === 'checklist' ? 120 : mode === 'matrix' ? 220 : nodeCount > 22 ? 240 : 320;
      const layerGap = mode === 'chronos' || mode === 'ladder'
        ? Math.max(480, rootMetrics.width / 2 + 280)
        : mode === 'flow' || mode === 'architect'
          ? Math.max(520, rootMetrics.width / 2 + 350)
          : mode === 'matrix'
            ? Math.max(420, rootMetrics.width / 2 + 220)
            : mode === 'checklist'
              ? Math.max(340, rootMetrics.width / 2 + 180)
              : Math.max(450, rootMetrics.height / 2 + 320);
      const horizontal = ['flow', 'architect', 'chronos', 'ladder', 'matrix', 'pulse', 'mosaic'].includes(mode);

      const placeTree = (id: string, depth: number): number => {
        const children = childMap.get(id) || [];
        let cross: number;

        if (children.length === 0) {
          cross = nextLeaf * crossGap;
          nextLeaf += 1;
        } else {
          const childCrosses = children.map(childId => placeTree(childId, depth + 1));
          cross = childCrosses.reduce((sum, value) => sum + value, 0) / childCrosses.length;
        }

        let point = horizontal ? { x: depth * layerGap, y: cross } : { x: cross, y: depth * layerGap };

        if (mode === 'ladder') {
          point = { x: depth * layerGap, y: depth * (crossGap * 0.7) + (cross * 0.3) };
        } else if (mode === 'matrix') {
          const row = Math.round(cross / crossGap);
          point = { x: depth * layerGap, y: row * crossGap };
        } else if (mode === 'checklist') {
          point = { x: depth * 60, y: cross };
        } else if (mode === 'chronos') {
          point = { x: depth * layerGap, y: 0 + (cross * 0.1) };
        } else if (mode === 'cascade') {
          point = { x: depth * (layerGap * 0.8), y: cross + depth * 40 };
        } else if (mode === 'pulse') {
          point = { x: depth * (layerGap * 0.6), y: cross * 0.8 };
        } else if (mode === 'mosaic') {
          const col = depth;
          const row = Math.round(cross / (crossGap * 0.8));
          point = { x: col * (layerGap * 0.7), y: row * (crossGap * 0.7) };
        }

        newPositions.set(id, point);
        return cross;
      };

      placeTree(rootId, 0);
      centerPositions(newPositions);
    } else {
      newPositions.set(rootId, { x: 0, y: 0 });
      const primaryChildren = childMap.get(rootId) || [];
      const totalLeaves = Math.max(getLeafCount(rootId), primaryChildren.length, 1);
      const layerGap = mode === 'nexus'
        ? nodeCount > 24 ? 205 : 235
        : nodeCount > 24 ? 230 : nodeCount > 14 ? 255 : 290;

      const placeRadial = (id: string, startAngle: number, endAngle: number, depth: number) => {
        const children = childMap.get(id) || [];
        if (children.length === 0) return;

        const parentAngle = (startAngle + endAngle) / 2;
        let cursor = startAngle;
        const childLeafTotal = children.reduce((sum, childId) => sum + getLeafCount(childId), 0);

        children.forEach(childId => {
          const leafShare = getLeafCount(childId) / Math.max(childLeafTotal, 1);
          const span = (endAngle - startAngle) * leafShare;
          const childAngle = children.length === 1 ? parentAngle : cursor + span / 2;

          const radius = mode === 'orbit' 
            ? (depth * layerGap) 
            : mode === 'spiral'
              ? (depth * layerGap * 0.7 + (childAngle / (2 * Math.PI)) * 120 + depth * 30)
              : mode === 'galaxy'
                ? (depth * layerGap + (Math.sin(childAngle * 4) * 50))
                : mode === 'dna'
                  ? (depth * layerGap)
                  : Math.max(depth, 1) * layerGap;

          const xBase = Math.cos(childAngle) * radius;
          const yBase = Math.sin(childAngle) * radius;

          let point = { x: xBase, y: yBase };

          if (mode === 'dna') {
            const strand = depth % 2 === 0 ? 1 : -1;
            const wave = Math.sin(depth * 0.8) * 120;
            const twist = Math.cos(depth * 0.8) * 60;
            point = { 
              x: depth * 220, 
              y: wave * strand + (cursor * 0.5)
            };
          } else if (mode === 'quantum') {
             const qSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
             const qRadius = depth * 180 + (qSeed % 100);
             const qAngle = (qSeed % 360) * (Math.PI / 180);
             point = { x: Math.cos(qAngle) * qRadius, y: Math.sin(qAngle) * qRadius };
          } else if (mode === 'bridge') {
             const side = depth % 2 === 0 ? 1 : -1;
             point = { x: depth * 200 * side, y: cursor * 0.8 };
          } else if (mode === 'fractal') {
             const fScale = Math.pow(0.85, depth);
             const parentPos = newPositions.get(id) || { x: 0, y: 0 };
             point = { 
               x: parentPos.x + Math.cos(childAngle) * (200 * fScale), 
               y: parentPos.y + Math.sin(childAngle) * (200 * fScale) 
             };
          } else if (mode === 'constellation') {
             const sSeed = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
             point = { 
               x: Math.cos(childAngle) * (depth * 250 + (sSeed % 50)), 
               y: Math.sin(childAngle) * (depth * 250 + (sSeed % 50)) 
             };
          } else if (mode === 'cluster') {
             const parentPos = newPositions.get(id) || { x: 0, y: 0 };
             const cAngle = (children.indexOf(childId) / children.length) * Math.PI * 2;
             point = { 
               x: parentPos.x + Math.cos(cAngle) * 180, 
               y: parentPos.y + Math.sin(cAngle) * 180 
             };
          } else if (mode === 'nexus') {
             const nRadius = depth * 140;
             point = { x: Math.cos(childAngle) * nRadius, y: Math.sin(childAngle) * nRadius };
          }

          newPositions.set(childId, point);

          placeRadial(childId, cursor, cursor + span, depth + 1);
          cursor += span;
        });
      };

      const firstSpan = (2 * Math.PI) / Math.max(totalLeaves, 1);
      placeRadial(rootId, -Math.PI / 2 - firstSpan / 2 + 0.1, (3 * Math.PI) / 2 - firstSpan / 2 + 0.1, 1);

      visibleNodes.forEach(node => {
        if (!newPositions.has(node.id)) {
          const index = visibleNodes.findIndex(candidate => candidate.id === node.id);
          const angle = (index / Math.max(visibleNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          newPositions.set(node.id, {
            x: Math.cos(angle) * layerGap,
            y: Math.sin(angle) * layerGap,
          });
        }
      });
    }

    if (!isLinearMode && mode !== 'radial') {
      const posArray = Array.from(newPositions.entries());
      const minDist = mode === 'nexus' ? 130 : 155;
      for (let pass = 0; pass < 8; pass++) {
        for (let j = 0; j < posArray.length; j++) {
          for (let k = j + 1; k < posArray.length; k++) {
            const [, p1] = posArray[j];
            const [, p2] = posArray[k];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            if (dist < minDist) {
              const force = (minDist - dist) / (2 * dist);
              p1.x += dx * force;
              p1.y += dy * force;
              p2.x -= dx * force;
              p2.y -= dy * force;
            }
          }
        }
      }
    }

    resolveNodeOverlaps(visibleNodes, newPositions, mode, rootId);
    centerPositions(newPositions);
    setPositions(newPositions);
  }, [visibleNodes, visibleRelationships, visibleChildMap, mode]);

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
    const colors = isZenMode ? ZEN_NODE_COLORS : NODE_COLORS;
    const color = colors[Math.min(node.depth, colors.length - 1)];
    const isCentral = node.depth === 0;

    
    if (isZenMode) {
      if (isCentral) return { fill: 'url(#node-grad-zen-0)', stroke: '#818cf8', text: '#fff', strokeWidth: 2, gradientId: 'node-grad-zen-0' };
      if (isHighlighted) return { fill: 'rgba(99,102,241,0.2)', stroke: '#6366f1', text: '#fff', strokeWidth: 3, gradientId: null };
      return { ...color, fill: `url(#node-grad-zen-${Math.min(node.depth, 3)})`, stroke: color.stroke, strokeWidth: 1.5, gradientId: `node-grad-zen-${Math.min(node.depth, 3)}` };
    }

    if (isCentral) return { fill: 'url(#node-grad-0)', stroke: '#4e5bff', text: '#fff', strokeWidth: 1.5, gradientId: 'node-grad-0' };
    if (isHighlighted) return { fill: '#f8fafc', stroke: '#4e5bff', text: '#4e5bff', strokeWidth: 2.5, gradientId: null };
    
    return { ...color, fill: `url(#node-grad-${Math.min(node.depth, 3)})`, stroke: color.stroke, strokeWidth: 1.5, gradientId: `node-grad-${Math.min(node.depth, 3)}` };
  };

  // Traversing ancestors and descendants for the active hover path cascade
  const activeCascadeSet = React.useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const active = new Set<string>([hoveredNodeId]);

    // Ancestors
    let currentId = hoveredNodeId;
    let currentNode = visibleNodes.find(n => n.id === currentId);
    while (currentNode && currentNode.parentId) {
      active.add(currentNode.parentId);
      currentId = currentNode.parentId;
      currentNode = visibleNodes.find(n => n.id === currentId);
    }

    // Descendants
    const queue = [hoveredNodeId];
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
  }, [hoveredNodeId, visibleNodes, visibleChildMap]);

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
      const from = positions.get(rel.from);
      const to = positions.get(rel.to);
      const fromNode = visibleNodes.find(n => n.id === rel.from);
      const toNode = visibleNodes.find(n => n.id === rel.to);
      
      if (!from || !to) return null;

      const isHighlighted = highlightedNode === rel.from || highlightedNode === rel.to;
      const hasArrow = (mode === 'flow' || mode === 'architect' || mode === 'chronos' || mode === 'ladder' || mode === 'matrix' || mode === 'checklist' || (mode === 'nexus' && isHighlighted));
      const start = fromNode ? getEdgePoint(from, to, getNodeMetrics(fromNode)) : from;
      // extraBuffer=20 → endpoint is 20px outside the card boundary, giving arrowhead full clearance
      const end = toNode ? getEdgePoint(to, from, getNodeMetrics(toNode), hasArrow ? 20 : 2) : to;
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
      } else if (mode === 'radial' || mode === 'orbit' || mode === 'spiral' || mode === 'galaxy') {
        d = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${(start.y + end.y) / 2}, ${end.x} ${end.y}`;
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
      const isCascadeHighlighted = hoveredNodeId ? (activeCascadeSet.has(rel.from) && activeCascadeSet.has(rel.to)) : false;

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
        if (fromNode && toNode) {
          const prompt = `Explain the exact logical connection and dependency bridge between the concepts "${fromNode.label}" and "${toNode.label}" inside the context of ${moduleTitle}. Why does the latter build upon the former? How does understanding ${fromNode.label} make learning ${toNode.label} easier?`;
          const event = new CustomEvent('sara-action', { detail: prompt });
          document.dispatchEvent(event);
        }
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
      } else if (hoveredNodeId) {
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
        <g key={`${rel.from}-${rel.to}-${idx}`} opacity={connScale * pathOpacity} className="transition-all duration-500">
          {/* Glow under-path for cascade */}
          {(hoveredNodeId && isCascadeHighlighted) && (
            <path d={d} fill="none" stroke={finalStrokeColor} strokeWidth={activeWidth + 4} strokeLinecap="round" opacity={0.15} filter="url(#edge-glow)" className="transition-all duration-300" />
          )}
          <path
            d={d}
            fill="none"
            stroke={isTourHighlighted ? finalStrokeColor : `url(#edge-grad-${idx})`}
            strokeWidth={activeWidth}
            strokeDasharray={strokeDashForLens}
            strokeLinecap="round"
            className="transition-all duration-700"
          />

          {/* Phase 10: Neon Laser Synaptic Signal Overlay (Glows on hovered cascade, selected node paths, and tour paths) */}
          {(hoveredNodeId ? isCascadeHighlighted : (highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted)) && (
            <path
              d={d}
              fill="none"
              stroke={isZenMode ? '#a5b4fc' : '#4e5bff'}
              strokeWidth={activeWidth + 0.8}
              strokeDasharray="8,8"
              className="stroke-dash-animate pointer-events-none"
              opacity={0.85}
            />
          )}

          {/* Dual Neural Flow Particles — ONLY on active/highlighted connections, extremely calm and slow */}
          {(hoveredNodeId ? isCascadeHighlighted : (highlightedNode === rel.from || highlightedNode === rel.to || isTourHighlighted)) && (
            <g>
              <circle 
                r={isHeatMapMode ? 2.2 : 1.6} 
                fill={isHeatMapMode ? getHeatColor(rel.from) : (hoveredNodeId && isCascadeHighlighted ? '#10b981' : (isZenMode ? '#a78bfa' : '#6366f1'))} 
                opacity={0.7}
                style={{ 
                  filter: isHeatMapMode 
                    ? `drop-shadow(0 0 3px ${getHeatColor(rel.from)})` 
                    : (hoveredNodeId && isCascadeHighlighted ? 'drop-shadow(0 0 4px currentColor)' : 'drop-shadow(0 0 3px #4e5bff)') 
                }}
              >
                <animateMotion
                  dur={isHeatMapMode ? `${(6 + (idx % 2)) / Math.max(0.4, flowSpeedFactor * 0.3)}s` : (hoveredNodeId && isCascadeHighlighted ? '2.8s' : `${5 + (idx % 3)}s`)}
                  repeatCount="indefinite"
                  path={d}
                />
              </circle>
              <circle 
                r={isHeatMapMode ? 1.4 : 1.1} 
                fill={isHeatMapMode ? getHeatColor(rel.to) : (isZenMode ? '#c4b5fd' : '#a5b4fc')} 
                opacity={0.45}
                style={{ 
                  filter: isHeatMapMode 
                    ? `drop-shadow(0 0 2px ${getHeatColor(rel.to)})` 
                    : 'drop-shadow(0 0 2px currentColor)' 
                }}
              >
                <animateMotion
                  dur={isHeatMapMode ? `${(9 + (idx % 2)) / Math.max(0.4, flowSpeedFactor * 0.3)}s` : `${8 + (idx % 4)}s`}
                  repeatCount="indefinite"
                  path={d}
                  begin={`${2 + (idx % 2)}s`}
                />
              </circle>
            </g>
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

      const hasArrow = (mode === 'flow' || mode === 'architect' || mode === 'chronos' || mode === 'ladder' || mode === 'matrix' || mode === 'checklist');
      if (!hasArrow) return null;

      // Compute exact endpoint (same calculation as renderConnections)
      const end = getEdgePoint(to, from, getNodeMetrics(toNode), 20);

      // Compute path direction at the endpoint for arrowhead orientation
      const dx = end.x - from.x;
      const dy = end.y - from.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return null;

      // Opacity mirrors the connection's computed opacity
      const queryActive = searchQuery && searchQuery.trim() !== '';
      const isHighlighted = highlightedNode === rel.from || highlightedNode === rel.to;
      const fromMatched = fromNode ? (!queryActive || isMatch(fromNode)) : false;
      const toMatched = toNode ? (!queryActive || isMatch(toNode)) : false;
      const connectionMatched = !queryActive || (fromMatched && toMatched);
      let arrowOpacity = connectionMatched ? (isHighlighted ? 1 : 0.85) : 0.15;
      if (isTourRunning) {
        arrowOpacity = (tourNodeId === rel.from || tourNodeId === rel.to) ? 1 : 0.04;
      } else if (hoveredNodeId) {
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
        <g key={`arrow-${rel.from}-${rel.to}-${idx}`} opacity={arrowOpacity} className="pointer-events-none transition-all duration-500">
          {/* Glow halo behind arrowhead */}
          <polygon
            points={`${tip.x},${tip.y} ${bx + px},${by + py} ${bx - px},${by - py}`}
            fill={glowColor}
            filter="url(#edge-glow)"
            opacity={0.6}
          />
          {/* Crisp filled arrowhead on top */}
          <polygon
            points={`${tip.x},${tip.y} ${bx + px},${by + py} ${bx - px},${by - py}`}
            fill={arrowColor}
            stroke={isZenMode ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)'}
            strokeWidth="0.8"
            strokeLinejoin="round"
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
    const textColor = isZenMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(78, 91, 255, 0.35)';

    return (
      <g className="pointer-events-none select-none font-mono">
        {/* Axis Ticked Guides */}
        <line x1={minX} y1="0" x2={minX + vW} y2="0" stroke={strokeColor} strokeWidth="1" strokeDasharray="5,10" />
        <line x1="0" y1={minY} x2="0" y2={minY + vH} stroke={strokeColor} strokeWidth="1" strokeDasharray="5,10" />

        {/* Ticks along the X-Axis */}
        {[-800, -600, -400, -200, 200, 400, 600, 800].map(tick => (
          <g key={`xtick-${tick}`} transform={`translate(${tick}, 0)`}>
            <line y1="-5" y2="5" stroke={tickColor} strokeWidth="1" />
            <text y="-8" textAnchor="middle" fontSize="6" fill={textColor}>{tick > 0 ? `+` : ''}{tick}M</text>
          </g>
        ))}

        {/* Ticks along the Y-Axis */}
        {[-600, -400, -200, 200, 400, 600].map(tick => (
          <g key={`ytick-${tick}`} transform={`translate(0, ${tick})`}>
            <line x1="-5" x2="5" stroke={tickColor} strokeWidth="1" />
            <text x="8" alignmentBaseline="middle" fontSize="6" fill={textColor}>{tick > 0 ? `+` : ''}{tick}M</text>
          </g>
        ))}

        {/* Outer Concentric Range Guage Rings */}
        {[300, 600, 900].map(r => (
          <g key={r}>
            <circle cx="0" cy="0" r={r} fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray={r === 600 ? '4,8' : 'none'} />
            <text x={r + 8} y="15" fontSize="8" fontWeight="900" fill={textColor} letterSpacing="0.05em">
              R_{r} // {r === 300 ? 'CORE_SYNAPSE' : r === 600 ? 'ORBITAL_PLANE' : 'OUTER_VECTOR'}
            </text>
          </g>
        ))}

        {/* Compass Angles */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.cos(rad) * 280;
          const y1 = Math.sin(rad) * 280;
          const x2 = Math.cos(rad) * 310;
          const y2 = Math.sin(rad) * 310;
          
          const lx = Math.cos(rad) * 325;
          const ly = Math.sin(rad) * 325;

          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickColor} strokeWidth="1.5" />
              <text x={lx} y={ly + 3} textAnchor="middle" fontSize="7" fontWeight="bold" fill={textColor}>
                {deg}°
              </text>
            </g>
          );
        })}

        {/* Rotating tech compass ring - static for Visual Calmness */}
        <g style={{ transformOrigin: '0px 0px', transform: `scale(${audioFreqScale})` }}>
          <circle cx="0" cy="0" r="450" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="30,120,40,90" />
          {[0, 90, 180, 270].map(angle => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M 0 -445 L -15 -445 L -15 -455 M 0 -445 L 15 -445 L 15 -455" fill="none" stroke={tickColor} strokeWidth="1.5" />
              <text x="0" y="-432" textAnchor="middle" fontSize="7" fontWeight="900" fill={textColor} letterSpacing="0.1em">
                SEC_QUAD_{angle / 90 + 1}
              </text>
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

        {/* TOP LEFT */}
        <g transform={`translate(${minX + padX + 18}, ${minY + padY + 28})`}>
          <text y="0" fontSize="10" fontWeight="900" fill={hudFill} letterSpacing="0.15em">
            NEURAL SCANNER // OBS_CORE_V4.2
          </text>
          <text y="15" fill={textPrimary} fontSize="9" fontWeight="black" letterSpacing="0.05em">
            ACTIVE MODULE: {moduleTitle ? moduleTitle.toUpperCase() : 'CORTEX'}
          </text>
          <text y="30" fill={textMuted} fontSize="8" letterSpacing="0.05em">
            COGNITIVE STATE: <tspan fill="#10b981" fontWeight="bold">● SYNAPTIC FLOW OPTIMAL</tspan>
          </text>
          <text y="42" fill={textMuted} fontSize="7">
            UPLINK FREQ: 24.8GB/S // HEX_LOC: [0x7FF01A8]
          </text>
        </g>

        {/* TOP RIGHT */}
        <g transform={`translate(${minX + vW - padX - 260}, ${minY + padY + 28})`}>
          <text y="0" fontSize="9" fontWeight="900" fill={hudFill} textAnchor="end" transform="translate(242, 0)" letterSpacing="0.1em">
            COGNITIVE DENSITY METRICS
          </text>
          <text y="15" fill={textPrimary} textAnchor="end" transform="translate(242, 0)" fontWeight="bold">
            VISUAL MODE: [{mode}] // COMPONENT HIERARCHY
          </text>
          <text y="30" fill={textMuted} textAnchor="end" transform="translate(242, 0)">
            DENSITY INDEX: {nodeCount} SYNAPSES // COMPLEXITY: LVL {maxDepth}
          </text>
          <text y="42" fill={textMuted} textAnchor="end" transform="translate(242, 0)" fontSize="7">
            MATRIX INTEGRITY: 100% // SCANNING LATENCY: 0.18MS
          </text>
        </g>

        {/* BOTTOM LEFT */}
        <g transform={`translate(${minX + padX + 18}, ${minY + vH - padY - 55})`}>
          <text y="0" fill={hudFill} fontSize="9" fontWeight="black">
            BLUEPRINT VIEWPORT MATRIX
          </text>
          <text y="15" fill={textMuted} fontSize="8">
            CANVAS_VIEWPORT_X_Y: [{Math.round(minX)}, {Math.round(minY)}] TO [{Math.round(minX + vW)}, {Math.round(minY + vH)}]
          </text>
          <text y="27" fill={textMuted} fontSize="8">
            PHYSICAL DIMENSION: {Math.round(vW)}PX x {Math.round(vH)}PX
          </text>
          <text y="39" fill={textMuted} fontSize="7">
            SYSTEM ENGINE DRIVER: WEBGL_2.0 // STABLE BUILD
          </text>
        </g>

        {/* BOTTOM RIGHT */}
        <g transform={`translate(${minX + vW - padX - 260}, ${minY + vH - padY - 55})`}>
          <text y="0" fill={hudFill} fontWeight="bold" textAnchor="end" transform="translate(242, 0)" fontSize="9">
            CORTEX SYNAPSE GENERATOR
          </text>
          <text y="15" fill={textMuted} textAnchor="end" transform="translate(242, 0)">
            ENGINE LOAD: [■■■■■■■■□□] 82.5%
          </text>
          <text y="27" fill={textMuted} textAnchor="end" transform="translate(242, 0)">
            SYSTEM REF: 06-01-2026 // TIME CLOCK: UTC_SYNC
          </text>
          <text y="39" fill={textMuted} textAnchor="end" transform="translate(242, 0)" fontSize="7">
            SYSTEM AUTH: CTO_FOUNDER // EXPERT CREDENTIALS
          </text>
        </g>
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

      // Phase 9: Cinematic entrance — staggered by depth + index
      const entranceDelay = node.depth * 0.15 + nodeIndex * 0.03;
      const nodeEntranceProgress = entranceComplete ? 1 : Math.max(0, Math.min(1, (entranceProgress - entranceDelay) * 3));
      const entranceScale = 0.3 + nodeEntranceProgress * 0.7;
      const entranceOpacityFactor = nodeEntranceProgress;

      const shadow = isHighlighted || isTourActive
        ? `drop-shadow(0 ${12 + node.depth * 2}px ${24 + node.depth * 4}px rgba(78, 91, 255,0.28))` 
        : `drop-shadow(0 ${4 + node.depth}px ${12 + node.depth * 2}px rgba(15,23,42,${0.06 + node.depth * 0.02}))`;

      const queryActive = searchQuery && searchQuery.trim() !== '';
      const matched = !queryActive || isMatch(node);
      
      const isCascadeActive = hoveredNodeId ? activeCascadeSet.has(node.id) : true;
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
      } else if (hoveredNodeId) {
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
              animation: entranceComplete ? `neural-float ${duration}s ease-in-out infinite` : 'none',
              animationDelay: `-${delay}s`,
              transformOrigin: `${pos.x}px ${pos.y}px`
            }}
          >
            <g
              onClick={() => handleNodeClick(node, pos.x, pos.y)}
              onMouseEnter={() => {
                setHoveredNodeId(node.id);
                if (isAudioEnabled) playChime(node.depth - 0.5);
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
              }}
              className="cursor-pointer group transition-all duration-500"
              opacity={nodeOpacity * entranceOpacityFactor}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isSearchMatchHighlighted ? entranceScale * 1.04 : entranceScale})`,
                transformOrigin: '0px 0px',
                transition: 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease'
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

      // 2. Deep-Dive Expanded View (Scale > 1.35) - Full Inline Rich HTML Card
      if (zoomScale > 1.35) {
        const cardW = w + 80;
        const cardH = h + 65;
        const progressPercent = mastery === 'mastered' ? 100 : mastery === 'studying' ? 50 : 0;
        const isSpeaking = speakingNodeId === node.id;

        return (
          <g
            key={node.id}
            id={"neural-node-" + node.id}
            style={{
              animation: entranceComplete ? `neural-float ${duration}s ease-in-out infinite` : 'none',
              animationDelay: `-${delay}s`,
              transformOrigin: `${pos.x}px ${pos.y}px`
            }}
          >
            <g
              onClick={() => handleNodeClick(node, pos.x, pos.y)}
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
              className="cursor-pointer group transition-all duration-500"
              opacity={nodeOpacity * entranceOpacityFactor}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isTourActive ? entranceScale * 1.12 : (isSearchMatchHighlighted ? entranceScale * 1.04 : entranceScale)})`,
                transformOrigin: '0px 0px',
                transition: 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease'
              }}
            >
              {/* Guided Tour Spotlight clean border for Visual Calmness */}
              {isTourActive && (
                <rect
                  x={-cardW / 2}
                  y={-cardH / 2}
                  width={cardW}
                  height={cardH}
                  rx={16}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  className="pointer-events-none"
                />
              )}

              {/* Expanded Card Plate */}
              <rect
                x={-cardW / 2}
                y={-cardH / 2}
                width={cardW}
                height={cardH}
                rx={16}
                fill={isFrozen ? 'rgba(6, 182, 212, 0.06)' : style.fill}
                stroke={isSpeaking ? '#10b981' : (isFrozen ? '#06b6d4' : (isBurnedOut ? '#ef4444' : (isHeatMapMode && !isCentral ? getHeatColor(node.id) : style.stroke)))}
                strokeWidth={isSpeaking ? 3 : (isFrozen || isBurnedOut ? 3.5 : (isHeatMapMode && !isCentral ? 2.5 : 1.8))}
                style={{ 
                  filter: shadow, 
                  transition: 'all 0.4s ease' 
                }}
              />

              {/* Glowing Thermal Progress Gauge at bottom edge of Expanded card */}
              {isHeatMapMode && !isCentral && (
                <g>
                  <rect
                    x={-cardW / 2 + 16}
                    y={cardH / 2 - 5}
                    width={cardW - 32}
                    height={3.0}
                    rx={1.5}
                    fill={isZenMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)'}
                    className="pointer-events-none"
                  />
                  <rect
                    x={-cardW / 2 + 16}
                    y={cardH / 2 - 5}
                    width={(cardW - 32) * Math.min(nodeHeat / 120, 1)}
                    height={3.0}
                    rx={1.5}
                    fill={getHeatColor(node.id)}
                    className="pointer-events-none"
                    style={{ filter: `drop-shadow(0 0 3px ${getHeatColor(node.id)})` }}
                  />
                </g>
              )}

              {isSpeaking && (
                <rect
                  x={-cardW / 2 - 4}
                  y={-cardH / 2 - 4}
                  width={cardW + 8}
                  height={cardH + 8}
                  rx={20}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  className="animate-pulse opacity-60 pointer-events-none"
                />
              )}

              {/* foreignObject to load premium micro HTML details inside SVG coordinate system */}
              <foreignObject
                x={-cardW / 2 + 10}
                y={-cardH / 2 + 10}
                width={cardW - 20}
                height={cardH - 20}
                className="pointer-events-none select-none"
              >
                <div className="h-full w-full flex flex-col justify-between font-sans text-left">
                  <div className={`font-black text-[11px] truncate ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                    {node.label}
                  </div>
                  <div className={`text-[8px] opacity-75 line-clamp-3 leading-relaxed mt-1 mb-2 ${isZenMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {node.description || 'AI Synthesized study node. Hover or right-click to view radial options.'}
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/10 pointer-events-auto">
                    {isBurnedOut ? (
                      <div className="flex items-center gap-1">
                        <Flame size={9} className="text-red-500" />
                        <span className="text-[7px] font-mono font-black text-red-500 uppercase tracking-widest">
                          BURNOUT RISK
                        </span>
                      </div>
                    ) : isFrozen ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] font-mono font-black text-cyan-400 uppercase tracking-widest">
                          ❄️ FROZEN
                        </span>
                      </div>
                    ) : isHeatMapMode && !isCentral ? (
                      <div className="flex items-center gap-1">
                        <Flame size={9} className="text-amber-500" />
                        <span className="text-[7.5px] font-mono font-black text-amber-500 uppercase tracking-widest">
                          HEAT: {nodeHeat}s
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" className="-rotate-90">
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={isZenMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} strokeWidth="1.2" />
                          <circle 
                            cx="6" cy="6" r="4.5" 
                            fill="none" 
                            stroke={mastery === 'mastered' ? '#10b981' : '#6366f1'} 
                            strokeWidth="1.5" 
                            strokeDasharray={`${2 * Math.PI * 4.5}`}
                            strokeDashoffset={`${2 * Math.PI * 4.5 * (1 - progressPercent / 100)}`}
                          />
                        </svg>
                        <span className={`text-[7px] font-black uppercase tracking-wider ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{mastery}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-1.5 z-20">
                      <button 
                        title="Ask SARA"
                        onClick={(e) => { e.stopPropagation(); onAskSARA?.(node); }}
                        className={`p-1 rounded-md transition-all active:scale-75 cursor-pointer ${isZenMode ? 'bg-white/5 hover:bg-white/12 text-indigo-300' : 'bg-slate-100 hover:bg-slate-200 text-indigo-600'}`}
                      >
                        <Sparkles size={8} />
                      </button>
                      <button 
                        title="Read Concept Aloud"
                        onClick={(e) => { e.stopPropagation(); speakConcept(node); }}
                        className={`p-1 rounded-md transition-all active:scale-75 cursor-pointer ${isSpeaking ? 'bg-emerald-500/25 text-emerald-400' : (isZenMode ? 'bg-white/5 hover:bg-white/12 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')}`}
                      >
                        <Play size={8} />
                      </button>
                    </div>
                  </div>
                </div>
              </foreignObject>
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
            animation: entranceComplete ? `neural-float ${duration}s ease-in-out infinite` : 'none',
            animationDelay: `-${delay}s`,
            transformOrigin: `${pos.x}px ${pos.y}px`
          }}
        >
          <g 
            onClick={() => handleNodeClick(node, pos.x, pos.y)} 
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
            className="cursor-pointer group transition-all duration-500"
            opacity={nodeOpacity * entranceOpacityFactor}
            style={{ 
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${isTourActive ? entranceScale * 1.12 : (isSearchMatchHighlighted ? entranceScale * 1.04 : entranceScale)})`, 
              transformOrigin: '0px 0px',
              transition: 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease'
            }}
          >
            {/* Mastery Ring */}
            <circle
              cx={0} cy={0}
              r={ringR}
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

            {/* Main glassmorphic body */}
            <rect
              x={-w / 2}
              y={-h / 2}
              width={w} height={h} rx={rx}
              fill={isFrozen ? 'rgba(6, 182, 212, 0.05)' : style.fill}
              stroke={isFrozen ? '#06b6d4' : (isBurnedOut ? '#ef4444' : style.stroke)}
              strokeWidth={isFrozen || isBurnedOut ? 2.5 : style.strokeWidth}
              style={{ filter: shadow, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)' }}
            />
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
            {/* Inner glass highlight */}
            <rect
              x={-w / 2 + 2}
              y={-h / 2 + 2}
              width={w - 4} height={h / 2 - 2} rx={Math.max(rx - 2, 0)}
              fill={isCentral ? 'rgba(255,255,255,0.12)' : (isZenMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)')}
              className="pointer-events-none"
            />
            {/* Animated shimmer border */}
            <rect
              x={-w / 2 + 1}
              y={-h / 2 + 1}
              width={w - 2} height={h - 2} rx={Math.max(rx - 1, 0)}
              fill="none"
              stroke={isCentral ? 'rgba(255,255,255,0.2)' : (isZenMode ? 'rgba(99,102,241,0.15)' : 'rgba(78,91,255,0.08)')}
              strokeWidth={1}
              strokeDasharray={`${w * 0.3} ${w * 2}`}
              className="pointer-events-none"
              style={{
                strokeDashoffset: `${shimmerOffset * w * 2}`,
                animation: `shimmer-border ${8 + (idSum % 4)}s linear infinite`,
              }}
            />
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
      className={"w-full h-full min-h-0 transition-colors duration-1000 select-none relative " + (isZenMode ? "bg-[#05070a]" : "bg-slate-50/50")}
    >
      <svg
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
            `}
          </style>

          {/* Phase 9: Glassmorphic Node Gradients — Light Mode */}
          <linearGradient id="node-grad-0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4e5bff" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
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
          <linearGradient id="node-grad-zen-0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
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
          {stars.map(star => (
            <circle
              key={star.key}
              cx={star.x}
              cy={star.y}
              r={star.size}
              fill={isZenMode ? '#818cf8' : '#4e5bff'}
              opacity={0.4}
            />
          ))}
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

        {/* Phase 10: Mind Palace Arena placeholders */}
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

        {/* Phase 10: Mind Palace Arena Draggable Cards */}
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

      {/* Holographic Legend HUD */}
      {!challenge?.active && (
        <div 
          className={`absolute bottom-0 right-0 p-4 rounded-tl-3xl border-t border-l border-b-0 border-r-0 rounded-br-none rounded-tr-none rounded-bl-none shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl z-[100] select-none font-mono text-[9px] uppercase tracking-wider flex flex-col gap-1.5 transition-all ${
            isZenMode 
              ? 'bg-[#0f111a]/95 border-white/10 text-slate-400' 
              : 'bg-white/95 border-slate-200/60 text-slate-500'
          }`}
        >
          <div className={`border-b pb-1 mb-0.5 font-black ${isZenMode ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
            Synaptic Legend
          </div>
          {[
            { depth: 0, label: 'Core Foundation', colorClass: 'bg-indigo-500' },
            { depth: 1, label: 'Primary Concepts', colorClass: isZenMode ? 'bg-indigo-400' : 'bg-indigo-600' },
            { depth: 2, label: 'Sub-Topics', colorClass: isZenMode ? 'bg-slate-500' : 'bg-[#cbd5e1]' },
            { depth: 3, label: 'Nuance & Details', colorClass: 'bg-slate-400' }
          ].map(item => {
            const count = item.depth === 3 
              ? visibleNodes.filter(n => n.depth >= 3).length 
              : visibleNodes.filter(n => n.depth === item.depth).length;
            
            const isActive = hoveredLegendDepth === item.depth;
            
            return (
              <div 
                key={item.depth}
                onMouseEnter={() => setHoveredLegendDepth(item.depth)}
                onMouseLeave={() => setHoveredLegendDepth(null)}
                className={`flex items-center justify-between gap-6 p-1 rounded-lg cursor-help transition-all ${
                  isActive 
                    ? (isZenMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900') 
                    : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${item.colorClass}`} />
                  <span>{item.label}</span>
                </div>
                <span className="font-bold opacity-75">{count}</span>
              </div>
            );
          })}

          {/* Connection Lens Filters */}
          <div className={`border-t pt-1.5 mt-0.5 flex flex-col gap-1 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
            <div className={`font-black mb-0.5 ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>Connection Lens</div>
            {[
              { key: 'structural', label: 'Structural', color: '#6366f1', dash: 'none' },
              { key: 'prereq', label: 'Prerequisite', color: '#06b6d4', dash: '8,4' },
              { key: 'lateral', label: 'Lateral Bridge', color: '#8b5cf6', dash: '4,8' },
            ].map(lens => {
              const active = activeLensFilters.has(lens.key);
              return (
                <button
                  key={lens.key}
                  onClick={() => toggleLensFilter(lens.key)}
                  className={`flex items-center gap-2 px-1 py-0.5 rounded transition-all text-left ${
                    active ? (isZenMode ? 'opacity-100' : 'opacity-100') : 'opacity-35'
                  }`}
                >
                  <svg width="18" height="8">
                    <line x1="0" y1="4" x2="18" y2="4" stroke={lens.color} strokeWidth={active ? 2 : 1.5} strokeDasharray={lens.dash} />
                  </svg>
                  <span>{lens.label}</span>
                  {active && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: lens.color }} />}
                </button>
              );
            })}
          </div>

          {/* Mastery Status Legend */}
          <div className={`border-t pt-1.5 mt-0.5 flex flex-col gap-1 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
            <div className={`font-black mb-0.5 ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>Node Mastery</div>
            {[
              { status: 'unvisited', label: 'Unvisited', color: 'rgba(100,116,139,0.4)' },
              { status: 'studying', label: 'Studying', color: '#6366f1' },
              { status: 'mastered', label: 'Mastered', color: '#10b981' },
            ].map(m => (
              <div key={m.status} className="flex items-center gap-2 px-1">
                <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke={m.color} strokeWidth={1.8} /></svg>
                <span>{m.label}</span>
              </div>
            ))}
          </div>


          {/* Phase 9: Heat Map Toggle */}
          <div className={`border-t pt-1.5 mt-0.5 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
            <button
              onClick={() => {/* handled by parent via isHeatMapMode prop */}}
              className={`flex items-center gap-2 px-1 py-0.5 rounded transition-all text-left w-full ${
                isHeatMapMode ? (isZenMode ? 'text-amber-400' : 'text-amber-600') : ''
              }`}
            >
              <Thermometer size={10} className={isHeatMapMode ? 'text-amber-500' : ''} />
              <span>{isHeatMapMode ? 'Heat Map: On' : 'Heat Map: Off'}</span>
              {isHeatMapMode && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </button>
          </div>
        </div>
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
          { icon: <ShieldQuestion size={13} />, label: 'Test Mastery', action: () => { onTestMastery?.(radialMenu.node); setRadialMenu(null); } },
          { icon: <FolderTree size={13} />, label: 'Fold Branch', action: () => { toggleNodeCollapse(radialMenu.node.id); setRadialMenu(null); } },
          { icon: <Activity size={13} className="text-purple-400" />, label: 'Quantum Entangle', action: () => { setEntangleStartNode(radialMenu.node); toast.info(`Select second concept to entangle with "${radialMenu.node.label}"...`); setRadialMenu(null); } },
          { icon: <MessageCircle size={13} />, label: 'Ask SARA', action: () => { onAskSARA?.(radialMenu.node); setRadialMenu(null); } },
          ...(mode === 'palace' ? [
            { icon: <Gamepad2 size={13} />, label: 'Mind Challenge', action: () => { startChallenge(radialMenu.node); setRadialMenu(null); } }
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

      {/* Phase 10: Spatial Audio Control Overlay */}
      {!challenge?.active && (
        <div 
          className={`absolute bottom-6 left-[196px] p-2.5 px-4 rounded-full border shadow-xl backdrop-blur-xl z-[150] select-none font-mono text-[9px] uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer pointer-events-auto ${
            isZenMode 
              ? 'bg-[#0f111a]/95 border-white/10 text-indigo-400 hover:text-white shadow-black/85 shadow-indigo-500/5' 
              : 'bg-white/95 border-slate-200/60 text-[#4e5bff] hover:text-indigo-900 shadow-slate-200/50 shadow-indigo-500/5'
          }`}
          onClick={toggleAudio}
        >
          <div className="flex items-center gap-1.5">
            {isAudioEnabled ? (
              <Volume2 size={13} className={isZenMode ? 'text-indigo-400 animate-pulse' : 'text-indigo-600 animate-pulse'} />
            ) : (
              <VolumeX size={13} className="text-slate-400" />
            )}
            <span className="hidden sm:inline">Spatial Focus Beats</span>
          </div>
          {isAudioEnabled ? (
            <div className="flex items-end gap-[2px] h-3 w-5 overflow-hidden">
              <div className="w-[2px] bg-indigo-500 rounded-full animate-[soundWave_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.1s', height: '60%' }} />
              <div className="w-[2px] bg-indigo-400 rounded-full animate-[soundWave_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.25s', height: '100%' }} />
              <div className="w-[2px] bg-indigo-600 rounded-full animate-[soundWave_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.4s', height: '40%' }} />
            </div>
          ) : (
            <span className="text-[7px] opacity-40">Muted</span>
          )}
        </div>
      )}

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
              <Gamepad2 size={14} className="animate-pulse" />
              <span>Mind Palace Challenge</span>
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
            <span className={`text-[10px] font-bold ${isZenMode ? 'text-slate-450' : 'text-slate-500'}`}>Synapse Progress:</span>
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

      {/* Phase 10: Mind Palace Challenge Completed Celebration Banner */}
      {challenge?.active && challenge.nodes.every(n => n.isPlaced) && (
        <div 
          className="absolute inset-0 bg-[#020306]/75 backdrop-blur-md z-[250] flex items-center justify-center pointer-events-auto animate-in fade-in duration-500"
          onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
        >
          <div className="p-8 max-w-md rounded-3xl border border-emerald-500/35 bg-[#0f111a]/95 text-center shadow-[0_0_50px_rgba(16,185,129,0.18)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40 text-emerald-400 animate-bounce">
              <Trophy size={32} />
            </div>
            <div>
              <h3 className="text-emerald-400 text-base font-black uppercase tracking-widest mb-1">Synapse Restored!</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Outstanding! You have successfully reconstructed the relationship and dependency bridge for this branch. Mastery has been upgraded!
              </p>
            </div>
            <button 
              onClick={() => { setChallenge(null); onChallengeEnd?.(); }}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Mastery Achieved
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
            <span>Level {chronosDepth}</span>
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
    </div>
  );
};

export default ConceptMapRenderer;
export { ConceptMapRenderer };
