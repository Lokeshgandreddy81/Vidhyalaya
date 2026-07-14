import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { ConceptNode, MasteryStatus, ScholarPersona, SoundRoomMode } from '../types';
import { Play, Pause, Sparkles, Flame } from 'lucide-react';

interface Scene3DProps {
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
  positions: Map<string, { x: number; y: number; z?: number }>;
  highlightedNode: string | null;
  setHighlightedNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  onNodeClick: (node: ConceptNode) => void;
  isZenMode: boolean;
  masteryMap: Map<string, MasteryStatus>;
  scholarPersona: ScholarPersona;
  activeTheme: {
    id: string;
    primary: string;
    bg: string;
    textClass: string;
    fontFamily: string;
    border: string;
  };
  isHeatMapMode: boolean;
  nodeTimeSpent: Map<string, number>;
  speakingNodeId: string | null;
  speakConcept: (node: ConceptNode) => void;
  onAskSARA: (node: ConceptNode) => void;
  pingNodeId: string | null;
  onRelationshipClick?: (rel: { from: string; to: string; label: string }) => void;
}

// 🌟 SCENE 3D CONTAINER WRAPPER
export const Scene3D: React.FC<Scene3DProps> = (props) => {
  const centralNode = useMemo(() => props.nodes.find((n) => n.depth === 0) || props.nodes[0], [props.nodes]);
  const centralPos = useMemo(() => {
    if (!centralNode) return [0, 0, 0];
    const pos = props.positions.get(centralNode.id) || { x: 0, y: 0, z: 0 };
    return [pos.x, pos.y, pos.z ?? 0];
  }, [centralNode, props.positions]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '500px' }}>
      <Canvas
        camera={{ position: [0, 0, 800], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {/* Lights designed to interact dynamically with glass materials and dynamic glows */}
        <ambientLight intensity={props.isZenMode ? 0.3 : 0.6} />
        <pointLight position={[1000, 1000, 1000]} intensity={props.isZenMode ? 0.9 : 1.3} />
        <pointLight position={[-1000, -1000, -1000]} intensity={0.4} />

        <Scene3DContent {...props} />

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          maxDistance={1800}
          minDistance={200}
          target={new THREE.Vector3(centralPos[0], centralPos[1], centralPos[2])}
        />
      </Canvas>
    </div>
  );
};

// 🌟 ANIMATED FLOWING SIGNAL PULSE COMPONENT WITH DYNAMIC LIGHTING
interface SignalPulseProps {
  curve: THREE.CatmullRomCurve3;
  speed: number;
  color: string;
}

const SignalPulse: React.FC<SignalPulseProps> = ({ curve, speed, color }) => {
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const time = state.clock.getElapsedTime();
    // Progress loops continuously along the curve
    const progress = (time * speed) % 1.0;
    const point = curve.getPointAt(progress);
    pulseRef.current.position.set(point.x, point.y, point.z);
  });

  return (
    <mesh ref={pulseRef}>
      <sphereGeometry args={[4, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} />
      {/* Dynamic light emission that illuminates adjacent lines/nodes as it travels */}
      <pointLight color={color} intensity={1.5} distance={80} decay={2} />
    </mesh>
  );
};

// 🌟 CURVED SYNAPSE COMPONENT
const SpatialConnection: React.FC<{
  fromPos: { x: number; y: number; z?: number };
  toPos: { x: number; y: number; z?: number };
  fromRadius: number;
  toRadius: number;
  isHighlighted: boolean;
  isZenMode: boolean;
  isHeatMapMode: boolean;
  avgHeat: number;
  idx: number;
  onRelationshipClick?: (rel: { from: string; to: string; label: string }) => void;
  relFromId: string;
  relToId: string;
  relLabel: string;
}> = ({
  fromPos,
  toPos,
  fromRadius,
  toRadius,
  isHighlighted,
  isZenMode,
  isHeatMapMode,
  avgHeat,
  idx,
  onRelationshipClick,
  relFromId,
  relToId,
  relLabel
}) => {
  // Create a curved CatmullRom Bezier arc and calculate exact geometric endpoints
  const { curve, conePosition, coneQuaternion } = useMemo(() => {
    const pStart = new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z ?? 0);
    const pEnd = new THREE.Vector3(toPos.x, toPos.y, toPos.z ?? 0);
    
    // Elevated midpoint for dynamic 3D depth arc
    const pMid = new THREE.Vector3()
      .addVectors(pStart, pEnd)
      .multiplyScalar(0.5);
    
    pMid.y += 60;
    pMid.z += ((fromPos.z ?? 0) + (toPos.z ?? 0)) / 2 + 40;

    const tempCurve = new THREE.CatmullRomCurve3([pStart, pMid, pEnd]);
    const L = tempCurve.getLength();
    
    // Calculate parameters along the curve to slice tube and place cone
    const uStart = Math.min(0.25, fromRadius / L);
    const uEnd = Math.max(0.75, 1 - (toRadius + 7.5) / L);
    const uCone = Math.max(0.75, 1 - (toRadius + 3.75) / L);
    const uTip = Math.max(0.75, 1 - toRadius / L);

    const tubeStart = tempCurve.getPointAt(uStart);
    const tubeEnd = tempCurve.getPointAt(uEnd);
    const conePoint = tempCurve.getPointAt(uCone);
    
    const tangent = tempCurve.getTangentAt(uTip).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);

    const tubeCurve = new THREE.CatmullRomCurve3([tubeStart, pMid, tubeEnd]);

    return {
      curve: tubeCurve,
      conePosition: [conePoint.x, conePoint.y, conePoint.z] as [number, number, number],
      coneQuaternion: quaternion
    };
  }, [fromPos, toPos, fromRadius, toRadius]);

  // Color calculation matching ConceptMapRenderer.tsx
  const color = useMemo(() => {
    if (isHighlighted) return isZenMode ? '#c084fc' : '#4e5bff';
    if (isHeatMapMode && avgHeat > 0) {
      const t = Math.min(avgHeat / 120, 1);
      const h = Math.round(210 - t * 210);
      return `hsl(${h}, 80%, ${isZenMode ? 50 : 55}%)`;
    }
    return isZenMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(78, 91, 255, 0.2)';
  }, [isHighlighted, isZenMode, isHeatMapMode, avgHeat]);

  const opacity = isHighlighted ? 0.95 : isZenMode ? 0.22 : 0.4;

  return (
    <group>
      {/* Structural connection tube */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onRelationshipClick?.({ from: relFromId, to: relToId, label: relLabel });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          document.body.style.cursor = 'auto';
        }}
      >
        <tubeGeometry args={[curve, 24, isHighlighted ? 1.8 : 0.6, 6, false]} />
        <meshStandardMaterial
          color={color}
          emissive={isHighlighted ? (isZenMode ? '#7c3aed' : '#4e5bff') : '#000000'}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      {/* 3D Cone Arrowhead indicating synapse direction */}
      <mesh position={conePosition} quaternion={coneQuaternion}>
        <coneGeometry args={[2.4, 7.5, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.95}
        />
      </mesh>
      {/* Flowing animated signal particle */}
      <SignalPulse
        curve={curve}
        speed={isHighlighted ? 0.8 : 0.35}
        color={isHighlighted ? (isZenMode ? "#d8b4fe" : "#818cf8") : (isZenMode ? "#c084fc" : "#6366f1")}
      />
    </group>
  );
};

// 🌟 RIGOROUS HOVER KINEMATICS & NODE COMPONENT
interface NodeMeshProps {
  node: ConceptNode;
  pos: { x: number; y: number; z?: number };
  isHighlighted: boolean;
  isCentral: boolean;
  isZenMode: boolean;
  mastery: MasteryStatus;
  nodeHeat: number;
  isSpeaking: boolean;
  activeTheme: {
    id: string;
    primary: string;
    bg: string;
    textClass: string;
    fontFamily: string;
    border: string;
  };
  isHeatMapMode: boolean;
  pingNodeId: string | null;
  speakingNodeId: string | null;
  speakConcept: (node: ConceptNode) => void;
  onAskSARA: (node: ConceptNode) => void;
  onNodeClick: (node: ConceptNode) => void;
  setHighlightedNode: (nodeId: string | null) => void;
}

const NodeMesh: React.FC<NodeMeshProps> = ({
  node,
  pos,
  isHighlighted,
  isCentral,
  isZenMode,
  mastery,
  nodeHeat,
  isSpeaking,
  activeTheme,
  isHeatMapMode,
  pingNodeId,
  speakingNodeId,
  speakConcept,
  onAskSARA,
  onNodeClick,
  setHighlightedNode,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. Smooth scale interpolation using vector lerp
    if (meshRef.current) {
      const baseScale = isCentral ? 1.4 : 1.0;
      const targetScale = isHighlighted ? baseScale * 1.35 : baseScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

      // Emissive intensity pulsing on glass material
      const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        const pulseIntensity = isHighlighted
          ? 2.0 + Math.sin(time * 8) * 0.5
          : 0.4 + Math.sin(time * 2) * 0.15;
        mat.emissiveIntensity = pulseIntensity;
      }
    }

    // 2. Rotate orbital rings
    if (ring1Ref.current) {
      if (isCentral) {
        ring1Ref.current.rotation.x = time * 0.5;
        ring1Ref.current.rotation.y = time * 0.3;
      } else {
        const speed = mastery === 'studying' ? 1.2 : mastery === 'mastered' ? 0.8 : 0.2;
        ring1Ref.current.rotation.z = time * speed;
      }
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.4;
      ring2Ref.current.rotation.z = time * 0.2;
    }
  });

  const ringColor =
    mastery === 'mastered'
      ? 'border-emerald-500 text-emerald-500'
      : mastery === 'studying'
      ? 'border-indigo-500 text-indigo-500'
      : 'border-slate-400/30 text-slate-400/50';

  return (
    <group position={[pos.x, pos.y, pos.z ?? 0]}>
      {/* Visual 3D sphere anchor */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHighlightedNode(node.id);
        }}
        onPointerOut={() => {
          setHighlightedNode(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onNodeClick(node);
        }}
      >
        <sphereGeometry args={[isCentral ? 14 : 10, 32, 32]} />
        {/* Premium Glassmorphic / Metallic Physics-Based Material */}
        <meshPhysicalMaterial
          color={isCentral ? (isZenMode ? '#818cf8' : '#4e5bff') : (isHighlighted ? '#c084fc' : (isZenMode ? '#312e81' : '#cbd5e1'))}
          emissive={isCentral ? '#818cf8' : (isHighlighted ? '#a855f7' : (isZenMode ? '#1e1b4b' : '#64748b'))}
          roughness={0.12}
          metalness={isZenMode ? 0.75 : 0.85}
          transmission={0.7} // Semi-transparent glass transmission
          thickness={3.0}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {/* Dynamic light emission that brightens the nebula when hovered */}
      {isHighlighted && (
        <pointLight color={isZenMode ? '#c084fc' : '#4e5bff'} intensity={2.5} distance={180} decay={2} />
      )}

      {/* Orbital knowledge rings for the Central Root Node */}
      {isCentral && (
        <group>
          <mesh ref={ring1Ref}>
            <torusGeometry args={[20, 0.4, 8, 48]} />
            <meshBasicMaterial color={isZenMode ? '#a855f7' : '#4e5bff'} transparent opacity={0.3} />
          </mesh>
          <mesh ref={ring2Ref}>
            <torusGeometry args={[25, 0.3, 8, 48]} />
            <meshBasicMaterial color={isZenMode ? '#818cf8' : '#6366f1'} transparent opacity={0.2} />
          </mesh>
        </group>
      )}

      {/* Saturn-like ring for normal nodes */}
      {!isCentral && (
        <group rotation={[0.5, 0.3, 0]}>
          <mesh ref={ring1Ref}>
            <torusGeometry args={[14, 0.35, 8, 48]} />
            <meshBasicMaterial
              color={
                mastery === 'mastered'
                  ? '#10b981'
                  : mastery === 'studying'
                  ? '#6366f1'
                  : isZenMode
                  ? '#475569'
                  : '#cbd5e1'
              }
              transparent
              opacity={mastery === 'mastered' ? 0.75 : mastery === 'studying' ? 0.6 : 0.25}
            />
          </mesh>
        </group>
      )}

      {/* Glowing ping indicator */}
      {node.id === pingNodeId && (
        <mesh>
          <sphereGeometry args={[25, 16, 16]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.15} wireframe />
        </mesh>
      )}

      {/* 3D HTML Card Overlay */}
      <Html
        center
        distanceFactor={550}
        sprite={false}
        transform
        occlude={false}
        zIndexRange={[10, 100]}
        style={{
          pointerEvents: 'auto',
          transition: 'transform 0.4s ease',
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onNodeClick(node);
          }}
          onMouseEnter={() => setHighlightedNode(node.id)}
          onMouseLeave={() => setHighlightedNode(null)}
          className={`select-none transition-all duration-300 backdrop-blur-md cursor-pointer flex flex-col justify-between font-sans text-left
            ${
              isZenMode
                ? 'bg-[#070c19]/90 text-slate-200 border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                : 'bg-white/90 text-slate-800 border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
            }
            ${
              isHighlighted
                ? (isZenMode
                    ? 'w-[190px] p-2.5 rounded-xl border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/20 scale-[1.02] z-50 translate-y-[-4px]'
                    : 'w-[190px] p-2.5 rounded-xl border-indigo-500 shadow-[0_0_20px_rgba(78,91,255,0.18)] ring-1 ring-indigo-500/20 scale-[1.02] z-50 translate-y-[-4px]')
                : 'w-[110px] p-2 rounded-lg border-white/5 opacity-80 shadow-none'
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <div
              className={`text-[8px] font-black uppercase tracking-wider truncate flex-1
                ${isCentral ? 'text-indigo-400' : isZenMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {isCentral ? 'CORE TARGET' : `PHASE ${node.depth}`}
            </div>
            <div className={`w-2 h-2 rounded-full ${ringColor.split(' ')[0]} border`} />
          </div>

          {/* Concept Title */}
          <h4
            className={`font-bold leading-tight ${
              isHighlighted ? 'text-[11.5px] whitespace-normal mb-1' : 'text-[9.5px] truncate mb-0'
            } ${
              isZenMode ? 'text-white' : 'text-slate-900'
            }`}
            style={{ fontFamily: activeTheme.fontFamily }}
          >
            {node.label}
          </h4>

          {/* Description */}
          {isHighlighted && (
            <p
              className={`text-[9px] leading-relaxed line-clamp-3 mb-2 text-justify hyphens-auto opacity-80 ${
                isZenMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {node.description || 'AI-synthesized conceptual milestone. Click node to inspect context.'}
            </p>
          )}

          {/* Footer Controls */}
          {isHighlighted && (
            <div className="flex items-center justify-between border-t border-white/10 pt-1.5 mt-auto">
              {isHeatMapMode && !isCentral ? (
                <div className="flex items-center gap-1">
                  <Flame size={8} className="text-amber-500" />
                  <span className="text-[7px] font-mono font-black text-amber-500 uppercase tracking-widest">
                    {nodeHeat}s
                  </span>
                </div>
              ) : (
                <span
                  className={`text-[7px] font-black uppercase tracking-widest ${
                    mastery === 'mastered'
                      ? 'text-emerald-500'
                      : mastery === 'studying'
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                  }`}
                >
                  {mastery}
                </span>
              )}

              <div className="flex gap-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <button
                  title="Ask SARA"
                  onClick={() => onAskSARA(node)}
                  className={`p-0.5 rounded transition-all active:scale-75 cursor-pointer ${
                    isZenMode
                      ? 'bg-white/5 hover:bg-white/12 text-indigo-300'
                      : 'bg-slate-150 hover:bg-slate-200 text-indigo-650'
                  }`}
                >
                  <Sparkles size={8} />
                </button>
                <button
                  title="Read Concept Aloud"
                  onClick={() => speakConcept(node)}
                  className={`p-0.5 rounded transition-all active:scale-75 cursor-pointer ${
                    isSpeaking
                      ? 'bg-emerald-500/25 text-emerald-400'
                      : isZenMode
                      ? 'bg-white/5 hover:bg-white/12 text-slate-300'
                      : 'bg-slate-150 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSpeaking ? <Pause size={8} /> : <Play size={8} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// 🌟 SCENE 3D CONTENT WITH AUTO-ROTATION & MULTI-LAYER NEBULA
export const Scene3DContent: React.FC<Scene3DProps> = ({
  nodes,
  relationships,
  positions,
  highlightedNode,
  setHighlightedNode,
  selectedNodeId,
  onNodeClick,
  isZenMode,
  masteryMap,
  scholarPersona,
  activeTheme,
  isHeatMapMode,
  nodeTimeSpent,
  speakingNodeId,
  speakConcept,
  onAskSARA,
  pingNodeId,
  onRelationshipClick,
}) => {
  const mainGroupRef = useRef<THREE.Group>(null);
  const outerNebulaRef = useRef<THREE.Points>(null);
  const innerNebulaRef = useRef<THREE.Points>(null);

  // 1. GENERATE BACKGROUND NEURAL STARFIELD (Cosmic Constellation)
  const [outerPositions] = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 2000;
    }
    return [positions];
  }, []);

  const [innerPositions] = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 1000;
    }
    return [positions];
  }, []);

  // 2. FRAME RUNTIME ANIMATION MATRIX (Auto-rotation & particle drift)
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Subtle, elegant auto-rotation when no node is actively inspected
    const activeFocus = highlightedNode || selectedNodeId;
    if (mainGroupRef.current && !activeFocus) {
      mainGroupRef.current.rotation.y = time * 0.015;
      mainGroupRef.current.rotation.x = Math.sin(time * 0.01) * 0.02;
    }

    // Gentle opposite-rotating drift for the multi-layered neural cloud particles
    if (outerNebulaRef.current) {
      outerNebulaRef.current.rotation.y = time * 0.003;
    }
    if (innerNebulaRef.current) {
      innerNebulaRef.current.rotation.y = -time * 0.006;
    }
  });

  return (
    <group ref={mainGroupRef}>
      {/* BACKGROUND LAYER 1: Outer Cosmic Nebula Particles */}
      <points ref={outerNebulaRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[outerPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={isZenMode ? "#c084fc" : "#a855f7"}
          size={3.5}
          sizeAttenuation
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* BACKGROUND LAYER 2: Inner Deep-Space Nebula Core */}
      <points ref={innerNebulaRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[innerPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={isZenMode ? "#818cf8" : "#6366f1"}
          size={2.2}
          sizeAttenuation
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Render 3D curved connection lines */}
      {relationships.map((rel, index) => {
        const fromPos = positions.get(rel.from);
        const toPos = positions.get(rel.to);
        if (!fromPos || !toPos) return null;

        const isHighlighted =
          highlightedNode === rel.from ||
          highlightedNode === rel.to ||
          selectedNodeId === rel.from ||
          selectedNodeId === rel.to;

        const heatFrom = nodeTimeSpent?.get(rel.from) ?? 0;
        const heatTo = nodeTimeSpent?.get(rel.to) ?? 0;
        const avgHeat = (heatFrom + heatTo) / 2;

        const fromNode = nodes.find(n => n.id === rel.from);
        const toNode = nodes.find(n => n.id === rel.to);
        const fromRadius = fromNode?.depth === 0 ? 14 : 10;
        const toRadius = toNode?.depth === 0 ? 14 : 10;

        return (
          <SpatialConnection
            key={`link-3d-${rel.from}-${rel.to}-${index}`}
            fromPos={fromPos}
            toPos={toPos}
            fromRadius={fromRadius}
            toRadius={toRadius}
            isHighlighted={isHighlighted}
            isZenMode={isZenMode}
            isHeatMapMode={isHeatMapMode}
            avgHeat={avgHeat}
            idx={index}
            onRelationshipClick={onRelationshipClick}
            relFromId={rel.from}
            relToId={rel.to}
            relLabel={rel.label}
          />
        );
      })}

      {/* Render 3D HTML cards on node anchors */}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const isHighlighted = highlightedNode === node.id || selectedNodeId === node.id;
        const isCentral = node.depth === 0;
        const mastery = masteryMap?.get(node.id) ?? 'unvisited';
        const nodeHeat = nodeTimeSpent?.get(node.id) ?? 0;
        const isSpeaking = speakingNodeId === node.id;

        return (
          <NodeMesh
            key={`node-3d-${node.id}`}
            node={node}
            pos={pos}
            isHighlighted={isHighlighted}
            isCentral={isCentral}
            isZenMode={isZenMode}
            mastery={mastery}
            nodeHeat={nodeHeat}
            isSpeaking={isSpeaking}
            activeTheme={activeTheme}
            isHeatMapMode={isHeatMapMode}
            pingNodeId={pingNodeId}
            speakingNodeId={speakingNodeId}
            speakConcept={speakConcept}
            onAskSARA={onAskSARA}
            onNodeClick={onNodeClick}
            setHighlightedNode={setHighlightedNode}
          />
        );
      })}
    </group>
  );
};
