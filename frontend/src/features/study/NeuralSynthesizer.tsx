import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrainCircuit, Network, Map as MapIcon, Layers, GitBranch,
  Target, ChevronDown, Plus, Minus, RefreshCw, Check, Sparkles,
  X, Compass, Maximize, Minimize, Flame, Users,
  ChevronLeft, ChevronRight, Play, Pause,
  Thermometer, Volume2, VolumeX, Workflow, Clock, Activity,
  Lightbulb, AlertTriangle, GraduationCap, Microscope, Timer,
  ShieldQuestion, Wrench, Swords, BookOpen, Zap
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { generateConceptMap } from '../../services/geminiService';
import { useAppStore } from '../../context/Store';
import { toast } from 'sonner';
import type { ConceptNode, ConceptMap, VisualMode, ComplexityLevel, StudyLens, MasteryStatus, ScholarPersona, SoundRoomMode } from './types';
import { ConceptMapRenderer } from './components/ConceptMapRenderer';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import NeuralSynthesisSimulator from './components/NeuralSynthesisSimulator';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

const VISUAL_MODES: Array<{ id: VisualMode; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'palace', label: 'Relationship Lab', icon: <BrainCircuit size={15} />, description: 'Drag-and-drop concept relationships' },
  { id: 'mindmap', label: 'Mind Map', icon: <BrainCircuit size={15} />, description: 'Radial concept mapping' },
  { id: 'hierarchy', label: 'Hierarchy', icon: <Layers size={15} />, description: 'Tree structure' },
  { id: 'network', label: 'Network', icon: <Network size={15} />, description: 'Interconnected web' },
  { id: 'flow', label: 'Flow', icon: <GitBranch size={15} />, description: 'Sequential process' },
  { id: 'orbit', label: 'Orbit', icon: <Workflow size={15} />, description: 'Planetary knowledge orbits' },
  { id: 'chronos', label: 'Chronos', icon: <Clock size={15} />, description: 'Timeline sequence' },
  { id: 'quantum', label: 'Quantum', icon: <BrainCircuit size={15} />, description: 'Superposition of ideas' },
  { id: 'dna', label: 'DNA Helix', icon: <Activity size={15} />, description: 'Intertwined concept strands' },
];

const COMPLEXITY_LEVELS: Array<{ id: ComplexityLevel; label: string; nodes: string }> = [
  { id: 'spark', label: 'Spark', nodes: '1-2 insights' },
  { id: 'snapshot', label: 'Snapshot', nodes: '3-5 concepts' },
  { id: 'overview', label: 'Overview', nodes: '6-8 concepts' },
  { id: 'detailed', label: 'Detailed', nodes: '12-16 concepts' },
  { id: 'deep', label: 'Deep Dive', nodes: '20-26 concepts' },
  { id: 'mastery', label: 'Mastery', nodes: '28-34 concepts' },
  { id: 'infinite', label: 'Infinite', nodes: '35-50 concepts' },
];

const STUDY_LENSES: Array<{ id: StudyLens; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'roadmap', label: 'Roadmap', icon: <Compass size={15} />, description: 'Learn in sequence' },
  { id: 'foundations', label: 'Foundations', icon: <Lightbulb size={15} />, description: 'Strengthen basics' },
  { id: 'practice', label: 'Practice', icon: <Activity size={15} />, description: 'Build through drills' },
  { id: 'exam', label: 'Exam Prep', icon: <Target size={15} />, description: 'Revise high-yield ideas' },
  { id: 'pitfalls', label: 'Pitfalls', icon: <AlertTriangle size={15} />, description: 'Avoid common traps' },
  { id: 'feynman', label: 'Feynman Decode', icon: <GraduationCap size={15} />, description: 'Explain like I\'m five' },
  { id: 'sherlock', label: 'Sherlock', icon: <Microscope size={15} />, description: 'Detective reasoning' },
  { id: 'einstein', label: 'First Principles', icon: <Flame size={15} />, description: 'Build from scratch' },
  { id: 'sprint', label: '60-Min Sprint', icon: <Timer size={15} />, description: 'Master it fast' },
  { id: 'debate', label: 'Devil\'s Advocate', icon: <ShieldQuestion size={15} />, description: 'Stress-test everything' },
];

const SCHOLAR_PERSONAS: Array<{ id: ScholarPersona; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'visionary', label: 'Visionary', icon: <Sparkles size={15} />, description: 'See the future application' },
  { id: 'analyst', label: 'Analyst', icon: <Microscope size={15} />, description: 'Surgical precision' },
  { id: 'builder', label: 'Builder', icon: <Wrench size={15} />, description: 'Construct & create' },
  { id: 'challenger', label: 'Challenger', icon: <Swords size={15} />, description: 'Question everything' },
  { id: 'storyteller', label: 'Storyteller', icon: <BookOpen size={15} />, description: 'Concepts as narrative' },
  { id: 'strategist', label: 'Strategist', icon: <Target size={15} />, description: 'Win mastery tactically' },
  { id: 'hacker', label: 'Hacker', icon: <Zap size={15} />, description: 'Maximum leverage, zero fluff' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface NeuralSynthesizerProps {
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
  initialComplexity?: ComplexityLevel;
  initialStudyLens?: StudyLens;
  initialScholarPersona?: ScholarPersona;
  onConfigChange?: (config: { complexity: ComplexityLevel; studyLens: StudyLens; scholarPersona: ScholarPersona }) => void;
  onReSynthesize?: (config: { complexity: ComplexityLevel; studyLens: StudyLens; scholarPersona: ScholarPersona }) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const NeuralSynthesizer: React.FC<NeuralSynthesizerProps> = ({
  moduleTitle,
  moduleContent,
  keyConcepts,
  generatedContent,
  initialMap,
  onNodeClick,
  isFullScreen = false,
  onFullScreenToggle,
  focusMode = 'split',
  isZenMode = false,
  pingNodeId,
  onTuneRoadmapClick,
  initialChallengeActive = false,
  initialComplexity = 'overview',
  initialStudyLens = 'roadmap',
  initialScholarPersona = 'visionary',
  onConfigChange,
  onReSynthesize,
}) => {
  const [visualMode, setVisualMode] = useState<VisualMode>('mindmap');
  const [complexity, setComplexity] = useState<ComplexityLevel>(initialComplexity);
  const [studyLens, setStudyLens] = useState<StudyLens>(initialStudyLens);
  const [scholarPersona, setScholarPersona] = useState<ScholarPersona>(initialScholarPersona);
  const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSynthesizingApiActive, setIsSynthesizingApiActive] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showHudConsole, setShowHudConsole] = useState(false);
  const [isUnsynced, setIsUnsynced] = useState(false);
  const [soundRoomMode, setSoundRoomMode] = useState<SoundRoomMode>('muted');
  const [showSoundRoomSelector, setShowSoundRoomSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomScale, setZoomScale] = useState(1);
  const [activeChallengeNodeId, setActiveChallengeNodeId] = useState<string | null>(null);
  const [hasManuallyExitedChallenge, setHasManuallyExitedChallenge] = useState(false);
  const [previousVisualMode, setPreviousVisualMode] = useState<VisualMode>('mindmap');

  const handleComplexityChange = (val: ComplexityLevel) => {
    setComplexity(val);
    onConfigChange?.({ complexity: val, studyLens, scholarPersona });
  };

  const handleStudyLensChange = (val: StudyLens) => {
    setStudyLens(val);
    onConfigChange?.({ complexity, studyLens: val, scholarPersona });
  };

  const handleScholarPersonaChange = (val: ScholarPersona) => {
    setScholarPersona(val);
    onConfigChange?.({ complexity, studyLens, scholarPersona: val });
  };

  useEffect(() => {
    if (initialComplexity) setComplexity(initialComplexity);
  }, [initialComplexity]);

  useEffect(() => {
    if (initialStudyLens) setStudyLens(initialStudyLens);
  }, [initialStudyLens]);

  useEffect(() => {
    if (initialScholarPersona) setScholarPersona(initialScholarPersona);
  }, [initialScholarPersona]);

  // ── Phase 8: Mastery Map & Guided Tour ──
  const [masteryMap, setMasteryMap] = useState<Map<string, MasteryStatus>>(new Map());
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourOrder, setTourOrder] = useState<string[]>([]);
  const [tourSpeaking, setTourSpeaking] = useState(false);

  // Autoplay state
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [autoplayDelay, setAutoplayDelay] = useState(8);

  // Thermographic Lens Filter state
  const [activeLensFilter, setActiveLensFilter] = useState<'none' | 'burnout' | 'freeze'>('none');

  const markNodeStudying = (nodeId: string) => {
    setMasteryMap(prev => {
      const next = new Map(prev);
      if (!next.has(nodeId) || next.get(nodeId) === 'unvisited') next.set(nodeId, 'studying');
      return next;
    });
  };

  const markNodeMastered = (nodeId: string) => {
    setMasteryMap(prev => {
      const next = new Map(prev);
      next.set(nodeId, 'mastered');
      return next;
    });
  };

  const handleDefrostNode = (nodeId: string) => {
    markNodeStudying(nodeId);
    const nodeLabel = conceptMap?.nodes.find(n => n.id === nodeId)?.label || nodeId;
    toast.success(`Defrosted: "${nodeLabel}" is now unlocked for learning!`);
  };

  // Kahn's topological sort on the concept map
  const buildTourOrder = React.useCallback((map: ConceptMap): string[] => {
    const nodes = map.nodes || [];
    const rels = map.relationships || [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    nodes.forEach(n => { inDegree.set(n.id, 0); adj.set(n.id, []); });
    rels.forEach(r => {
      if (nodeIds.has(r.from) && nodeIds.has(r.to) && r.from !== r.to) {
        adj.get(r.from)!.push(r.to);
        inDegree.set(r.to, (inDegree.get(r.to) ?? 0) + 1);
      }
    });
    const queue = nodes
      .filter(n => (inDegree.get(n.id) ?? 0) === 0)
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label))
      .map(n => n.id);
    const result: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      (adj.get(id) || []).forEach(childId => {
        const deg = (inDegree.get(childId) ?? 1) - 1;
        inDegree.set(childId, deg);
        if (deg === 0) {
          const childNode = nodes.find(n => n.id === childId);
          // Insert in sorted order
          const insertIdx = queue.findIndex(qId => {
            const qNode = nodes.find(n => n.id === qId);
            return (qNode?.depth ?? 99) > (childNode?.depth ?? 0) ||
              ((qNode?.depth ?? 99) === (childNode?.depth ?? 0) && (qNode?.label ?? '') > (childNode?.label ?? ''));
          });
          if (insertIdx === -1) queue.push(childId); else queue.splice(insertIdx, 0, childId);
        }
      });
    }
    // Add remaining nodes not reached by topological order
    nodes.forEach(n => { if (!result.includes(n.id)) result.push(n.id); });
    return result;
  }, []);

  const startSpeakingTourNode = (node: ConceptNode) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${node.label}. ${node.description || ''}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onend = () => setTourSpeaking(false);
    utterance.onerror = () => setTourSpeaking(false);
    setTourSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakTourNode = (node: ConceptNode) => {
    if (tourSpeaking) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setTourSpeaking(false);
    } else {
      startSpeakingTourNode(node);
    }
  };

  const startTour = () => {
    if (!conceptMap) return;
    const order = buildTourOrder(conceptMap);
    setTourOrder(order);
    setTourIndex(0);
    setIsTourActive(true);
    setIsAutoplay(false);
    if (order[0]) markNodeStudying(order[0]);
  };

  const tourNext = () => {
    const next = tourIndex + 1;
    if (next < tourOrder.length) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setTourSpeaking(false);
      setTourIndex(next);
      if (tourOrder[next]) markNodeStudying(tourOrder[next]);
    }
  };

  const tourPrev = () => {
    const prev = tourIndex - 1;
    if (prev >= 0) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setTourSpeaking(false);
      setTourIndex(prev);
    }
  };

  const stopTour = () => {
    setIsTourActive(false);
    setTourIndex(0);
    setIsAutoplay(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTourSpeaking(false);
  };

  const tourNodeId = isTourActive && tourOrder.length > 0 ? tourOrder[tourIndex] : null;
  const tourNode = tourNodeId ? conceptMap?.nodes.find(n => n.id === tourNodeId) : null;
  const masteredCount = Array.from(masteryMap.values()).filter(v => v === 'mastered').length;
  const studyingCount = Array.from(masteryMap.values()).filter(v => v === 'studying').length;

  // Phase 9: Heat Map Mode
  const [isHeatMapMode, setIsHeatMapMode] = useState(false);
  const nodeTimeSpentRef = useRef<Map<string, number>>(new Map());
  const [nodeTimeSpent, setNodeTimeSpent] = useState<Map<string, number>>(new Map());
  const timeTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track time spent viewing a node (via selectedNode / Observation Room)
  useEffect(() => {
    if (timeTrackingIntervalRef.current) clearInterval(timeTrackingIntervalRef.current);
    if (selectedNode) {
      timeTrackingIntervalRef.current = setInterval(() => {
        nodeTimeSpentRef.current.set(
          selectedNode.id,
          (nodeTimeSpentRef.current.get(selectedNode.id) ?? 0) + 1
        );
        setNodeTimeSpent(new Map(nodeTimeSpentRef.current));
      }, 1000);
    }
    return () => { if (timeTrackingIntervalRef.current) clearInterval(timeTrackingIntervalRef.current); };
  }, [selectedNode]);

  // Autoplay loop
  useEffect(() => {
    if (!isTourActive || !isAutoplay || !tourNode) return;

    // Start speaking the tour node text automatically
    startSpeakingTourNode(tourNode);

    const timer = setTimeout(() => {
      if (tourIndex < tourOrder.length - 1) {
        tourNext();
      } else {
        setIsAutoplay(false); // Tour completed, stop autoplay
        toast.info("Guided Study Tour Completed!");
      }
    }, autoplayDelay * 1000);

    return () => clearTimeout(timer);
  }, [isTourActive, isAutoplay, tourIndex, autoplayDelay, tourNode]);

  // Heat Map Conduction & Decay physics simulation
  useEffect(() => {
    if (!isHeatMapMode || !conceptMap) return;

    const physicsInterval = setInterval(() => {
      let changed = false;
      const newHeat = new Map(nodeTimeSpentRef.current);
      const nodes = conceptMap.nodes || [];
      const rels = conceptMap.relationships || [];
      const bleedAdditions = new Map<string, number>();

      nodes.forEach(n => {
        const currentHeat = newHeat.get(n.id) ?? 0;
        if (currentHeat > 0) {
          // 1. Memory Decay: cool down if not currently selected
          let decayVal = 0;
          if (selectedNode?.id !== n.id) {
            decayVal = Math.max(0.1, currentHeat * 0.02);
          }
          const postDecay = Math.max(0, currentHeat - decayVal);
          newHeat.set(n.id, postDecay);
          if (postDecay !== currentHeat) changed = true;

          // 2. Conduction: bleed 5% heat to connected neighbor nodes
          if (postDecay > 10) {
            const bleedAmt = postDecay * 0.05;
            const neighbors = rels
              .filter(r => r.from === n.id || r.to === n.id)
              .map(r => r.from === n.id ? r.to : r.from);

            if (neighbors.length > 0) {
              const bleedPerNeighbor = bleedAmt / neighbors.length;
              neighbors.forEach(neighId => {
                bleedAdditions.set(neighId, (bleedAdditions.get(neighId) ?? 0) + bleedPerNeighbor);
              });
              // Subtract bled amount from current node
              newHeat.set(n.id, Math.max(0, postDecay - bleedAmt));
              changed = true;
            }
          }
        }
      });

      // Apply bleed additions
      bleedAdditions.forEach((add, id) => {
        const h = newHeat.get(id) ?? 0;
        newHeat.set(id, h + add);
        changed = true;
      });

      if (changed) {
        nodeTimeSpentRef.current = newHeat;
        setNodeTimeSpent(new Map(newHeat));
      }
    }, 2000); // execute every 2 seconds

    return () => clearInterval(physicsInterval);
  }, [isHeatMapMode, conceptMap, selectedNode]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setContainerWidth(rect.width);
    return () => ro.disconnect();
  }, []);

  const transformRef = useRef<any>(null);
  const { geometryAnchors } = useAppStore();

  const anchoredConceptMap = React.useMemo(() => {
    if (!conceptMap) return conceptMap;
    const moduleAnchors = geometryAnchors.filter(anchor => anchor.moduleTitle === moduleTitle).slice(0, 10);
    if (moduleAnchors.length === 0) return conceptMap;

    const nodes = conceptMap.nodes || [];
    const relationships = conceptMap.relationships || [];
    const rootNode = nodes.find(node => node.depth === 0) || nodes[0];
    const rootId = rootNode?.id || 'root';
    const existingIds = new Set(nodes.map(node => node.id));

    const anchorNodes: ConceptNode[] = moduleAnchors.map((anchor, index) => {
      const idBase = `anchor-${anchor.kind}-${index}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const id = existingIds.has(idBase) ? `${idBase}-${anchor.id.slice(0, 6)}` : idBase;
      existingIds.add(id);
      return {
        id,
        label: anchor.label,
        description: `${anchor.kind.replace('-', ' ')}: ${anchor.detail}`,
        depth: 1,
        parentId: rootId,
        connections: [rootId],
      };
    });

    return {
      ...conceptMap,
      nodes: [...nodes, ...anchorNodes],
      relationships: [
        ...relationships,
        ...anchorNodes.map(node => ({ from: rootId, to: node.id, label: 'anchored' })),
      ],
    };
  }, [conceptMap, geometryAnchors, moduleTitle]);

  // Listen for bi-directional link jump events from Notes editor
  useEffect(() => {
    const handleSmartboardJump = (e: Event) => {
      const customEvent = e as CustomEvent;
      const conceptName = customEvent.detail?.concept;
      const conceptNodeId = customEvent.detail?.nodeId;
      const targetMap = anchoredConceptMap || conceptMap;
      if (!targetMap) return;

      const node = targetMap.nodes.find(n =>
        (conceptNodeId && n.id === conceptNodeId) ||
        (conceptName && n.label.toLowerCase() === conceptName.toLowerCase())
      );

      if (node) {
        setSelectedNode(node);
        markNodeStudying(node.id);
        if (onNodeClick) onNodeClick(node);

        // Zoom and center on the corresponding SVG node group
        setTimeout(() => {
          if (transformRef.current) {
            transformRef.current.zoomToElement('neural-node-' + node.id, 1.8, 800);
          }
        }, 150);
      }
    };

    window.addEventListener('smartboard-jump', handleSmartboardJump);
    return () => window.removeEventListener('smartboard-jump', handleSmartboardJump);
  }, [conceptMap, anchoredConceptMap, onNodeClick]);

  useEffect(() => {
    if (transformRef.current) {
      const timer = setTimeout(() => {
        transformRef.current.resetTransform();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

  const closeSelectors = () => {
    setShowModeSelector(false);
    setShowSoundRoomSelector(false);
    setShowHudConsole(false);
  };

  const synthesizeConceptMap = async () => {
    setIsSynthesizingApiActive(true);
    setIsSynthesizing(true);
    setSelectedNode(null);
    try {
      if (onReSynthesize) {
        await onReSynthesize({ complexity, studyLens, scholarPersona });
        setIsUnsynced(false);
      } else {
        const result = await generateConceptMap(moduleTitle, keyConcepts, generatedContent || '', complexity, studyLens, scholarPersona);
        setConceptMap(result);
        setIsUnsynced(false);
        setTimeout(() => transformRef.current?.resetTransform(0), 100);
      }
    } catch (error) {
      console.error('Failed to synthesize:', error);
      if (!onReSynthesize) {
        const nodes: ConceptNode[] = [
          { id: 'central', label: moduleTitle, description: `Master ${moduleTitle}`, depth: 0 },
          ...keyConcepts.map((c, i) => ({ id: `c-${i}`, label: c, description: c, depth: 1, parentId: 'central', connections: ['central'] })),
        ];
        setConceptMap({ centralConcept: moduleTitle, nodes, relationships: keyConcepts.map((_, i) => ({ from: 'central', to: `c-${i}`, label: 'includes' })) });
        setIsUnsynced(false);
        setTimeout(() => transformRef.current?.resetTransform(0), 100);
      }
    } finally {
      setIsSynthesizingApiActive(false);
    }
  };

  useEffect(() => {
    if (initialMap) {
      setConceptMap(initialMap);
    }
    // No auto-generation on mount — user must click 'Generate Map' for a fast experience
  }, [initialMap]);

  const handleSynthesisFinished = useCallback(() => {
    setIsSynthesizing(false);
  }, []);

  // Auto-trigger challenge when initialChallengeActive is true and map is loaded
  useEffect(() => {
    if (initialChallengeActive && conceptMap && !isSynthesizing && !activeChallengeNodeId && !hasManuallyExitedChallenge) {
      const rootNode = anchoredConceptMap?.nodes.find(n => n.depth === 0) || conceptMap.nodes.find(n => n.depth === 0) || conceptMap.nodes[0];
      if (rootNode) {
        setActiveChallengeNodeId(rootNode.id);
        setVisualMode('palace');
      }
    } else if (!initialChallengeActive) {
      if (activeChallengeNodeId) {
        setActiveChallengeNodeId(null);
      }
      setHasManuallyExitedChallenge(false);
    }
  }, [initialChallengeActive, conceptMap, isSynthesizing, anchoredConceptMap, activeChallengeNodeId, hasManuallyExitedChallenge]);

  // Track the previous visual mode to restore it when quitting the challenge
  useEffect(() => {
    if (visualMode !== 'palace') {
      setPreviousVisualMode(visualMode);
    }
  }, [visualMode]);

  // Sync visualMode selecting 'palace' with starting the relationship check.
  useEffect(() => {
    if (visualMode === 'palace') {
      const rootNode = anchoredConceptMap?.nodes.find(n => n.depth === 0) || conceptMap?.nodes.find(n => n.depth === 0) || conceptMap?.nodes[0];
      if (rootNode && !activeChallengeNodeId) {
        setHasManuallyExitedChallenge(false);
        setActiveChallengeNodeId(rootNode.id);
      }
    } else {
      if (activeChallengeNodeId) {
        setActiveChallengeNodeId(null);
      }
    }
  }, [visualMode, conceptMap, anchoredConceptMap]);

  // Mark unsynced when user changes study lens, complexity, or persona (only if map already exists)
  useEffect(() => {
    if (conceptMap) {
      setIsUnsynced(true);
    }
  }, [complexity, studyLens, scholarPersona]);



  // Robust auto-centering/reset transform when layout changes
  useEffect(() => {
    if (conceptMap && transformRef.current) {
      const frame = requestAnimationFrame(() => {
        transformRef.current?.resetTransform();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [conceptMap, visualMode]);

  // Cinematic Guided Tour camera auto-guidance
  useEffect(() => {
    if (isTourActive && tourNodeId && transformRef.current) {
      // Step 1: Pan & zoom out slightly to 1.1x (establishing shot)
      transformRef.current.zoomToElement('neural-node-' + tourNodeId, 1.1, 350);

      // Step 2: Zoom in tightly on the target node (spotlight shot) after establishing shot
      const timer = setTimeout(() => {
        if (transformRef.current) {
          transformRef.current.zoomToElement('neural-node-' + tourNodeId, 1.85, 500);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [isTourActive, tourNodeId]);

  // Global click handler to dismiss open selectors on click-away
  useEffect(() => {
    const handleGlobalClick = () => {
      setShowModeSelector(false);
      setShowSoundRoomSelector(false);
      setShowHudConsole(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div ref={containerRef} className={`h-full w-full flex flex-col overflow-hidden relative min-h-0 transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-transparent'}`}>

      {/* ── Neural Canvas Header (Unified Control Bar) ── */}
      {!activeChallengeNodeId && (
        <div className="absolute top-6 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Unified Left Controls */}
          <div className={`flex items-center gap-1.5 p-1.5 rounded-[22px] backdrop-blur-md border shadow-[0_8px_32px_-8px_rgba(78, 91, 255,0.12)] transition-all ${isZenMode ? 'bg-[#0c0e14]/80 border-white/10' : 'bg-white/90 border-slate-200/50'}`}>
            {/* View Mode Selector */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowModeSelector(prev => !prev);
                  setShowHudConsole(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  showModeSelector
                    ? (isZenMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-[#4e5bff]')
                    : (isZenMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-[#4e5bff]')
                }`}
              >
                <MapIcon size={14} className={isZenMode ? 'text-indigo-400' : 'text-indigo-500'} />
                <span className="hidden lg:inline">{VISUAL_MODES.find(m => m.id === visualMode)?.label}</span>
                <ChevronDown size={12} className={`opacity-35 transition-transform duration-200 ${showModeSelector ? 'rotate-180' : ''}`} />
              </button>
              {showModeSelector && (
                <div
                  style={{ width: containerWidth < 580 ? `${Math.min(containerWidth - 48, 480)}px` : '540px' }}
                  className="absolute top-full left-0 pt-2 z-50 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className={`p-2 rounded-2xl border shadow-2xl transition-all overflow-hidden ${isZenMode ? 'bg-[#0f111a]/95 border-white/10 shadow-black/80' : 'bg-white/95 border-slate-200/50 shadow-slate-200/40'} backdrop-blur-2xl`}>
                    <div className={`grid ${containerWidth < 420 ? 'grid-cols-1' : containerWidth < 600 ? 'grid-cols-2' : 'grid-cols-3'} gap-1`}>
                      {VISUAL_MODES.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setVisualMode(m.id);
                            setShowModeSelector(false);
                          }}
                          className={`flex flex-col items-start gap-0.5 p-2 rounded-xl transition-all cursor-pointer border ${visualMode === m.id ? (isZenMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : 'bg-indigo-50/70 text-[#4e5bff] border-indigo-100/50') : (isZenMode ? 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 border-transparent hover:text-slate-700')}`}
                        >
                          <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
                            <span className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider truncate">
                              {m.icon}
                              {m.label}
                            </span>
                            {visualMode === m.id && <Check size={10} className="shrink-0" />}
                          </div>
                          <span className={`text-[8px] font-medium normal-case truncate w-full text-left leading-tight ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {m.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`w-px h-4 ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            {/* Tune Cortex AI HUD Button */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowHudConsole(prev => !prev);
                  setShowModeSelector(false);
                  setShowSoundRoomSelector(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer relative overflow-hidden ${
                  showHudConsole
                    ? (isZenMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-[#4e5bff]')
                    : (isZenMode ? 'hover:bg-white/5 text-slate-355' : 'hover:bg-slate-50 text-[#4e5bff]')
                }`}
              >
                <Sparkles size={14} className={isZenMode ? 'text-indigo-400 animate-pulse' : 'text-indigo-500 animate-pulse'} />
                <span>Configure Cortex</span>
                {isUnsynced && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                )}
              </button>
            </div>

            <div className={`w-px h-4 transition-colors ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            {/* Sound Room Selector */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowSoundRoomSelector(prev => !prev);
                  setShowModeSelector(false);
                  setShowHudConsole(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  showSoundRoomSelector
                    ? (isZenMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700')
                    : (isZenMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-500')
                }`}
              >
                <Volume2 size={14} className={isZenMode ? 'text-indigo-400' : 'text-indigo-500'} />
                <span className="hidden lg:inline">{soundRoomMode === 'muted' ? 'Sound Room' : `Sound: ${soundRoomMode}`}</span>
                {soundRoomMode !== 'muted' && (
                  <div className="flex items-end gap-[1.5px] h-2.5 w-4 overflow-hidden pointer-events-none select-none">
                    <div className="w-[1.5px] bg-[#4e5bff] dark:bg-indigo-400 rounded-full animate-[soundWave_0.5s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0.1s' }} />
                    <div className="w-[1.5px] bg-[#4e5bff] dark:bg-indigo-400 rounded-full animate-[soundWave_0.5s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '0.2s' }} />
                    <div className="w-[1.5px] bg-[#4e5bff] dark:bg-indigo-400 rounded-full animate-[soundWave_0.5s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0.35s' }} />
                  </div>
                )}
                <ChevronDown size={12} className={`opacity-35 transition-transform duration-200 ${showSoundRoomSelector ? 'rotate-180' : ''}`} />
              </button>
              {showSoundRoomSelector && (
                <div className="absolute top-full right-0 pt-2 w-60 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className={`p-2 rounded-2xl border shadow-2xl transition-all flex flex-col gap-0.5 ${isZenMode ? 'bg-[#0f111a]/95 border-white/10 shadow-black/80' : 'bg-white/95 border-slate-200/50 shadow-slate-200/40'} backdrop-blur-2xl`}>
                    {[
                      { id: 'muted', label: 'Muted (Silence)', desc: 'Focus in deep silence' },
                      { id: 'binaural', label: 'Binaural Focus Theta', desc: '6Hz waves for learning flow' },
                      { id: 'solfeggio', label: 'Solfeggio 528Hz', desc: 'DNA repair & memory tuning' },
                      { id: 'cosmic', label: 'Cosmic Starfield', desc: 'Pink-noise cosmic hum swell' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSoundRoomMode(s.id as any);
                          setShowSoundRoomSelector(false);
                          toast.success(`Sound Room tuned to ${s.label}!`);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer border ${
                          soundRoomMode === s.id
                            ? (isZenMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : 'bg-indigo-50/70 text-[#4e5bff] border-indigo-100/50')
                            : (isZenMode ? 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 border-transparent hover:text-slate-700')
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {s.id === 'muted' ? <VolumeX size={13} /> : <Volume2 size={13} className="animate-pulse" />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9.5px] font-black uppercase tracking-wider truncate">{s.label}</span>
                            {soundRoomMode === s.id && <Check size={11} className="shrink-0" />}
                          </div>
                          <span className={`block text-[8px] font-medium normal-case truncate leading-tight mt-0.5 ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {s.desc}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`w-px h-4 transition-colors ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            {/* Concept Search Input Bar */}
            <div className="relative flex items-center pl-1" onClick={e => e.stopPropagation()}>
              <Compass size={12} className={isZenMode ? 'text-indigo-400' : 'text-slate-400'} />
              <input
                type="text"
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`text-[9.5px] font-bold pl-2.5 pr-6 py-1.5 ml-1 rounded-xl border outline-none transition-all w-28 focus:w-36 ${
                  isZenMode
                    ? 'bg-white/[0.02] border-white/5 text-white focus:border-indigo-500/50'
                    : 'bg-slate-50/50 border-slate-200/50 text-slate-700 focus:border-[#4e5bff] focus:bg-white'
                }`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="concept-search-input-field"
                id="concept-search-input-field"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Fifth Component: Tune Roadmap */}
            {onTuneRoadmapClick && (
              <>
                <div className={`w-px h-4 transition-colors ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                <button
                  onClick={onTuneRoadmapClick}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${isZenMode ? 'text-indigo-400 hover:bg-white/5' : 'text-[#4e5bff] hover:bg-indigo-50'} cursor-pointer`}
                >
                  <Sparkles size={14} className="text-[#4e5bff] animate-pulse" />
                  <span className="hidden lg:inline">Tune Roadmap</span>
                </button>
              </>
            )}

          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Right Controls */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-[22px] bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-[0_8px_32px_-8px_rgba(78, 91, 255,0.12)]">
            <button
              onClick={synthesizeConceptMap}
              disabled={isSynthesizing}
              className="group flex items-center gap-2.5 px-5 py-2.5 rounded-[16px] bg-indigo-50/50 text-[10px] font-black uppercase tracking-widest text-[#4e5bff] hover:bg-[#4e5bff] hover:text-white transition-all duration-500 disabled:opacity-40"
            >
              <RefreshCw size={14} className={isSynthesizing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              Resync Map
            </button>
            {onFullScreenToggle && (
              <>
                <div className={`w-px h-4 ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                <button
                  onClick={onFullScreenToggle}
                  className={`flex items-center gap-2 p-2.5 rounded-[16px] transition-all font-black uppercase tracking-widest text-[10px] ${isZenMode ? 'text-indigo-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:text-[#4e5bff] hover:bg-slate-50'}`}
                  title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  <span className="hidden sm:inline">{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Cortex HUD Console Overlay (Slide-down Control desk) ── */}
      {showHudConsole && (
         <div className={`absolute top-[90px] left-6 right-6 z-[150] p-6 rounded-[28px] border backdrop-blur-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 transition-all ${
           isZenMode
             ? 'bg-[#0b0d16]/95 border-white/10 shadow-black/80 text-white'
             : 'bg-white/95 border-slate-200/60 shadow-slate-250/50 text-slate-800'
         }`}
         onClick={e => e.stopPropagation()}
         >
           {/* Header */}
           <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100 dark:border-white/5">
             <div className="flex items-center gap-2.5">
               <BrainCircuit size={18} className="text-indigo-500 animate-pulse" />
               <div className="flex flex-col">
                 <h4 className="text-[12px] font-black uppercase tracking-[0.2em]">Cortex Synaptic Calibration Desk</h4>
                 <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tune roadmap filters & scholar style</span>
               </div>
             </div>
             <button
               onClick={() => setShowHudConsole(false)}
               className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                 isZenMode ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900'
               }`}
             >
               <X size={12} />
             </button>
           </div>

           {/* Grid layout */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Col 1: Lenses */}
             <div className="flex flex-col gap-2 min-h-0">
               <span className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1.5 mb-1 font-mono">
                 <Target size={11} /> 1. Curriculum Study Lens
               </span>
               <div className="flex-1 overflow-y-auto max-h-[220px] pr-1.5 custom-scrollbar space-y-1">
                 {STUDY_LENSES.map(l => {
                   const active = studyLens === l.id;
                   return (
                     <button
                       key={l.id}
                       onClick={() => handleStudyLensChange(l.id)}
                       className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                         active
                           ? (isZenMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/35 shadow-[0_4px_12px_rgba(99,102,241,0.15)] font-bold' : 'bg-indigo-50/70 text-[#4e5bff] border-indigo-100 shadow-sm font-bold')
                           : (isZenMode ? 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                       }`}
                     >
                       <div className="shrink-0 mt-0.5">{l.icon}</div>
                       <div className="min-w-0 flex-1">
                         <div className="flex items-center justify-between">
                           <span className="text-[9.5px] uppercase font-black tracking-wider truncate font-display">{l.label}</span>
                           {active && <Check size={10} className="shrink-0 text-indigo-500" />}
                         </div>
                         <span className="block text-[8px] font-medium leading-tight text-slate-500 mt-0.5 normal-case">
                           {l.description}
                         </span>
                       </div>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* Col 2: Personas */}
             <div className="flex flex-col gap-2 min-h-0">
               <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500 flex items-center gap-1.5 mb-1 font-mono">
                 <Users size={11} /> 2. Scholar Persona
               </span>
               <div className="flex-1 overflow-y-auto max-h-[220px] pr-1.5 custom-scrollbar space-y-1">
                 {SCHOLAR_PERSONAS.map(p => {
                   const active = scholarPersona === p.id;
                   return (
                     <button
                       key={p.id}
                       onClick={() => handleScholarPersonaChange(p.id)}
                       className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                         active
                           ? (isZenMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/35 shadow-[0_4px_12px_rgba(245,158,11,0.15)] font-bold' : 'bg-amber-50/70 text-amber-800 border-amber-100 shadow-sm font-bold')
                           : (isZenMode ? 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                       }`}
                     >
                       <div className="shrink-0 mt-0.5">{p.icon}</div>
                       <div className="min-w-0 flex-1">
                         <div className="flex items-center justify-between">
                           <span className="text-[9.5px] uppercase font-black tracking-wider truncate font-display">{p.label}</span>
                           {active && <Check size={10} className="shrink-0 text-amber-500" />}
                         </div>
                         <span className="block text-[8px] font-medium leading-tight text-slate-500 mt-0.5 normal-case">
                           {p.description}
                         </span>
                       </div>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* Col 3: Density & Sync Action */}
             <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                 <span className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1.5 font-mono">
                   <Layers size={11} /> 3. Cognitive Density
                 </span>
                 <div className="grid grid-cols-2 gap-1 font-mono">
                   {COMPLEXITY_LEVELS.map(c => {
                     const active = complexity === c.id;
                     return (
                       <button
                         key={c.id}
                         onClick={() => handleComplexityChange(c.id)}
                         className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                           active
                             ? (isZenMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/35' : 'bg-indigo-50/70 text-[#4e5bff] border-indigo-100')
                             : (isZenMode ? 'border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/5 hover:text-white' : 'border-slate-100 bg-slate-50/30 text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                         }`}
                       >
                         <span className="text-[9px] font-black uppercase tracking-wider">{c.label}</span>
                         <span className="text-[7.5px] font-medium text-slate-500 lowercase normal-case">{c.nodes}</span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* Manual Re-Synthesis Desk */}
               <div className={`mt-auto p-4 rounded-2xl border flex flex-col gap-3 ${
                 isZenMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50/50 border-slate-100'
               }`}>
                 <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-450 leading-none font-mono">Cortex Engine Status</span>
                   <span className="mt-1.5 flex items-center gap-1.5 text-[9px] font-mono font-bold leading-tight">
                     {isUnsynced ? (
                       <>
                         <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                         <span className="text-amber-500 uppercase">Blueprints Desynced</span>
                       </>
                     ) : (
                       <>
                         <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                         <span className="text-emerald-500 uppercase">Synced & Calibrated</span>
                       </>
                     )}
                   </span>
                 </div>

                 <button
                   onClick={() => {
                     synthesizeConceptMap();
                     setShowHudConsole(false);
                     toast.success("Calibrating & compiling new concept roadmap...");
                   }}
                   className={`w-full group relative py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden ${
                     isUnsynced
                       ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-amber-500/20'
                       : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/10'
                   }`}
                 >
                   <span className="relative z-10 flex items-center justify-center gap-2">
                     <Sparkles size={11} className="animate-pulse" />
                     {isUnsynced ? "Synthesize Calibrated Cortex" : "Force Re-Synthesis"}
                   </span>
                 </button>
               </div>
             </div>
           </div>
         </div>
      )}

      {/* ── Loading & Initialization Overlays ── */}
      {(isSynthesizing || !conceptMap) && (
        <div className={`absolute inset-0 z-[200] flex flex-col items-center justify-center p-12 backdrop-blur-md animate-in fade-in duration-500 transition-colors ${isZenMode ? 'bg-[#05070a]/95' : 'bg-white/95'}`}>
          {isSynthesizing ? (
            <NeuralSynthesisSimulator
              isZenMode={isZenMode}
              isCompleted={conceptMap !== null && !isSynthesizingApiActive}
              onFinished={handleSynthesisFinished}
              goal={moduleTitle}
            />
          ) : (
            <div className="flex flex-col items-center max-w-sm text-center">
              <div className={`w-20 h-20 border rounded-[2rem] flex items-center justify-center mb-8 shadow-inner transition-colors ${isZenMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                <Network size={32} />
              </div>
              <h3 className={`text-base font-black uppercase tracking-[0.3em] mb-3 transition-colors ${isZenMode ? 'text-white' : 'text-black'}`}>Neural Synthesizer</h3>
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed mb-10 transition-colors ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Map the underlying knowledge structure of this module into a technical roadmap.
              </p>
              <button
                onClick={synthesizeConceptMap}
                className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl hover:-translate-y-1 transition-all active:scale-95 overflow-hidden ${isZenMode ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-[#4e5bff] text-white shadow-indigo-900/20'}`}
              >
                <span className="relative z-10">Initialize Synthesis</span>
                <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${isZenMode ? 'from-indigo-500 to-purple-600' : 'from-indigo-600 to-[#4e5bff]'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CANVAS */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {conceptMap && !isSynthesizing && (
          <div className="w-full h-full relative">
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={0.3}
              maxScale={3}
              centerOnInit
              wheel={{ step: 0.1 }}
              disabled={!!activeChallengeNodeId}
              onTransform={(ref: any) => {
                if (ref?.state?.scale) {
                  setZoomScale(ref.state.scale);
                }
              }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {!activeChallengeNodeId && (
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 p-1.5 px-3 rounded-full shadow-2xl border backdrop-blur-xl z-[100] select-none transition-all duration-300 ${
                        visualMode === 'chronos' ? 'bottom-24' : 'bottom-6'
                      } ${
                        isZenMode
                          ? 'bg-[#0f111a]/95 border-white/10 text-indigo-400 shadow-black/80'
                          : 'bg-white/95 border-slate-200/60 text-[#4e5bff] shadow-slate-200/40'
                      }`}
                    >
                    <button
                      aria-label="Zoom out"
                      title="Zoom out"
                      onClick={() => zoomOut()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all focus:outline-none ${
                        isZenMode ? 'hover:bg-white/5 text-indigo-400' : 'hover:bg-slate-100 text-[#4e5bff]'
                      }`}
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      aria-label="Reset view"
                      title="Reset view"
                      onClick={() => resetTransform()}
                      className={`px-4 h-8 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 focus:outline-none border ${
                        isZenMode
                          ? 'bg-indigo-500/10 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
                          : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100/40 text-[#4e5bff]'
                      }`}
                    >
                      Reset View
                    </button>
                    <button
                      aria-label="Zoom in"
                      title="Zoom in"
                      onClick={() => zoomIn()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all focus:outline-none ${
                        isZenMode ? 'hover:bg-white/5 text-indigo-400' : 'hover:bg-slate-100 text-[#4e5bff]'
                      }`}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                  )}

                  <div className={`w-full h-full ${activeChallengeNodeId ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                      <div className="w-full h-full">
                        <ConceptMapRenderer
                          conceptMap={anchoredConceptMap || conceptMap}
                          mode={visualMode}
                          onNodeClick={(node) => {
                            setSelectedNode(node);
                            markNodeStudying(node.id);
                            if (onNodeClick) onNodeClick(node);
                          }}
                          highlightedNode={selectedNode?.id || tourNodeId || null}
                          isZenMode={isZenMode}
                          pingNodeId={pingNodeId}
                          moduleTitle={moduleTitle}
                          searchQuery={searchQuery}
                          masteryMap={masteryMap}
                          tourNodeId={tourNodeId}
                          tourOrder={tourOrder}
                          isHeatMapMode={isHeatMapMode}
                          nodeTimeSpent={nodeTimeSpent}
                          onTestMastery={(node) => {
                            setSelectedNode(node);
                            markNodeStudying(node.id);
                          }}
                          onAskSARA={(node) => {
                            const prompt = `Explain the concept "${node.label}" in the context of "${moduleTitle}" in detail.`;
                            const event = new CustomEvent('sara-action', { detail: prompt });
                            document.dispatchEvent(event);
                          }}
                          zoomScale={zoomScale}
                          activeChallengeNodeId={activeChallengeNodeId}
                          onChallengeEnd={() => {
                            setActiveChallengeNodeId(null);
                            setHasManuallyExitedChallenge(true);
                            setVisualMode(previousVisualMode);
                          }}
                          scholarPersona={scholarPersona}
                          soundRoomMode={soundRoomMode}
                          onSoundRoomModeChange={setSoundRoomMode}
                          activeLensFilter={activeLensFilter}
                          onDefrostNode={handleDefrostNode}
                        />
                      </div>
                    </TransformComponent>
                  </div>
                </>
              )}
            </TransformWrapper>

            {!onNodeClick && selectedNode && (
              <NodeDetailPanel
                node={selectedNode}
                moduleTitle={moduleTitle}
                onClose={() => setSelectedNode(null)}
                onMastered={markNodeMastered}
                isZenMode={isZenMode}
              />
            )}

            {/* ── Guided Study Tour HUD ── */}
            {isTourActive && tourNode && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 p-5 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in slide-in-from-bottom-6 w-[90vw] max-w-[480px] ${
                  visualMode === 'chronos' ? 'bottom-[160px]' : 'bottom-24'
                } ${
                  isZenMode
                    ? 'bg-[#0a0c14]/97 border-amber-500/30 shadow-amber-500/5'
                    : 'bg-white/97 border-amber-200 shadow-amber-200/40'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: isZenMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}>
                  <div className="flex flex-col text-left">
                    <span className={`text-[8px] font-black uppercase tracking-[0.25em] font-mono leading-none ${
                      isZenMode ? 'text-amber-400/80' : 'text-amber-600/70'
                    }`}>
                      {`Guided Tour · Step ${tourIndex + 1} of ${tourOrder.length}`}
                    </span>
                    <h4 className={`text-[14px] font-black tracking-tight mt-1 truncate max-w-[260px] leading-tight ${
                      isZenMode ? 'text-amber-200' : 'text-amber-900'
                    }`}>
                      {tourNode.label}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Autoplay & Duration badges */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsAutoplay(prev => !prev)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isAutoplay
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            : (isZenMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-705')
                        }`}
                        title={isAutoplay ? "Pause Autoplay" : "Start Autoplay"}
                      >
                        {isAutoplay ? <Pause size={10} className="animate-pulse" /> : <Play size={10} />}
                        {isAutoplay ? "Autoplay" : "Play"}
                      </button>
                      <button
                        onClick={() => setAutoplayDelay(prev => prev === 8 ? 15 : prev === 15 ? 25 : 8)}
                        className={`px-2 py-1 rounded-xl text-[9px] font-mono font-bold transition-all cursor-pointer ${
                          isZenMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-705'
                        }`}
                        title="Adjust Autoplay Duration"
                      >
                        {autoplayDelay}s
                      </button>
                    </div>

                    <button
                      onClick={stopTour}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isZenMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'
                      }`}
                      title="Exit Tour"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Concept Description Box */}
                <div className={`text-[11px] leading-relaxed text-left max-h-[85px] overflow-y-auto px-1 pr-1.5 scrollbar-thin font-sans ${
                  isZenMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {tourNode.description || 'No detailed description available for this concept.'}
                </div>

                {/* Progress bar */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                  isZenMode ? 'bg-amber-500/10' : 'bg-amber-100'
                }`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((tourIndex + 1) / tourOrder.length) * 100}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    }}
                  />
                </div>

                {/* Control Action Row */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t" style={{ borderColor: isZenMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                  <button
                    onClick={tourPrev}
                    disabled={tourIndex === 0}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer ${
                      isZenMode ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                    }`}
                  >
                    <ChevronLeft size={11} strokeWidth={3} />
                    Back
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const prompt = `Explain the concept "${tourNode.label}" in the context of "${moduleTitle}" in detail.`;
                        const event = new CustomEvent('sara-action', { detail: prompt });
                        document.dispatchEvent(event);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-105 ${
                        isZenMode ? 'bg-[#4e5bff]/15 hover:bg-[#4e5bff]/25 text-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 text-[#4e5bff]'
                      }`}
                      title="Ask SARA AI for deep analysis"
                    >
                      <Sparkles size={11} />
                      Ask SARA
                    </button>

                    <button
                      onClick={() => speakTourNode(tourNode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-105 ${
                        tourSpeaking
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : (isZenMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-705')
                      }`}
                      title="Listen to AI narration"
                    >
                      {tourSpeaking ? <Volume2 size={11} className="animate-pulse text-emerald-400" /> : <Volume2 size={11} className="opacity-60" />}
                      {tourSpeaking ? "Speaking" : "Listen"}
                    </button>
                  </div>

                  <button
                    onClick={tourNext}
                    disabled={tourIndex === tourOrder.length - 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer ${
                      isZenMode ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                    }`}
                  >
                    Next
                    <ChevronRight size={11} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Mastery Progress Badge (top-center) ── */}
            {masteredCount > 0 && (
              <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-xl animate-in fade-in duration-500 ${
                isZenMode ? 'bg-[#0f111a]/90 border-emerald-500/30 text-emerald-300' : 'bg-white/95 border-emerald-200 text-emerald-700'
              }`}>
                <Check size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {masteredCount} Evidence Captured · {studyingCount} In Study
                </span>
              </div>
            )}

            {!isTourActive && !activeChallengeNodeId && (
              <div className="absolute top-[92px] right-6 z-[150] flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#0f111a]/40 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setIsHeatMapMode(prev => !prev);
                      if (isHeatMapMode) setActiveLensFilter('none'); // reset on toggle off
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      isHeatMapMode
                        ? (isZenMode
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-amber-50 border-amber-300 text-amber-700')
                        : (isZenMode
                            ? 'bg-[#0f111a]/95 border-white/10 text-slate-400 hover:bg-white/5'
                            : 'bg-white/95 border-slate-200 text-slate-500 hover:bg-slate-50')
                    }`}
                    title="Toggle Knowledge Heat Map"
                  >
                    <Thermometer size={11} />
                    Heat Map
                  </button>

                  {isHeatMapMode && (
                    <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                      <button
                        onClick={() => setActiveLensFilter('none')}
                        className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeLensFilter === 'none'
                            ? 'bg-[#4e5bff]/25 text-[#4e5bff]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Standard Thermal View"
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => setActiveLensFilter('burnout')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeLensFilter === 'burnout'
                            ? 'bg-red-500/25 text-red-400'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Highlight Cognitive Burnout"
                      >
                        <Flame size={10} />
                        Burnout
                      </button>
                      <button
                        onClick={() => setActiveLensFilter('freeze')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeLensFilter === 'freeze'
                            ? 'bg-cyan-500/25 text-cyan-400'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Highlight Cognitive Freeze"
                      >
                        Freeze
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={startTour}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-lg backdrop-blur-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 cursor-pointer pointer-events-auto ${
                    isZenMode
                      ? 'bg-[#0f111a]/90 border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
                      : 'bg-white/95 border-amber-200 text-amber-700 hover:bg-amber-50'
                  }`}
                  title="Start Guided Study Tour"
                >
                  <Play size={11} fill="currentColor" />
                  Guided Tour
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeuralSynthesizer;

export type { ConceptNode, ConceptMap } from './types';
export { NodeDetailPanel } from './components/NodeDetailPanel';
