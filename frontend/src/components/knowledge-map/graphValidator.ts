import {
  DiagramType,
  EdgeType,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  NodeImportance,
} from '../../types';

const VALID_EDGE_TYPES: EdgeType[] = [
  'contains', 'requires', 'uses', 'implements', 'contrasts', 'leads_to', 'example_of',
];

const VALID_DIAGRAM_TYPES: DiagramType[] = [
  'concept_tree', 'process_flow', 'component_tree', 'architecture',
  'comparison_matrix', 'timeline', 'dependency_graph',
];

const MAX_NODES = 24;

export function normalizeEdgeType(raw: string): EdgeType {
  const lower = raw.toLowerCase().replace(/\s+/g, '_');
  const aliases: Record<string, EdgeType> = {
    includes: 'contains',
    contains: 'contains',
    requires: 'requires',
    prerequisite: 'requires',
    depends_on: 'requires',
    uses: 'uses',
    implements: 'implements',
    contrasts: 'contrasts',
    vs: 'contrasts',
    leads_to: 'leads_to',
    example_of: 'example_of',
    phase: 'contains',
    module: 'contains',
  };
  if (VALID_EDGE_TYPES.includes(lower as EdgeType)) return lower as EdgeType;
  return aliases[lower] || 'contains';
}

export function edgeLabel(type: EdgeType): string {
  const labels: Record<EdgeType, string> = {
    contains: 'contains',
    requires: 'requires',
    uses: 'uses',
    implements: 'implements',
    contrasts: 'contrasts with',
    leads_to: 'leads to',
    example_of: 'example of',
  };
  return labels[type];
}

function normalizeImportance(level: number, raw?: string): NodeImportance {
  if (raw === 'critical' || raw === 'important' || raw === 'supplementary') return raw;
  if (level === 0 || level === 1) return 'critical';
  if (level === 2) return 'important';
  return 'supplementary';
}

function normalizeLevel(raw: number): 0 | 1 | 2 | 3 {
  const n = Math.round(Number(raw));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export function validateAndNormalizeGraph(
  raw: Partial<KnowledgeGraph>,
  fallbackTopic: string,
  sourceModuleId?: string,
): KnowledgeGraph {
  const topic = raw.topic || fallbackTopic;
  const diagramType = VALID_DIAGRAM_TYPES.includes(raw.diagramType as DiagramType)
    ? (raw.diagramType as DiagramType)
    : 'concept_tree';

  const seenIds = new Set<string>();
  const nodes: KnowledgeNode[] = (raw.nodes || [])
    .map((node, index) => {
      const id = String(node.id || `node-${index}`).trim();
      const uniqueId = seenIds.has(id) ? `${id}-${index}` : id;
      seenIds.add(uniqueId);
      const level = normalizeLevel(node.level ?? (node as { depth?: number }).depth ?? (index === 0 ? 0 : 1));
      return {
        id: uniqueId,
        label: (node.label || node.description || `Concept ${index + 1}`).trim(),
        description: (node.description || node.label || '').trim(),
        level,
        sourceRef: node.sourceRef?.trim() || undefined,
        importance: normalizeImportance(level, node.importance),
        masteryStatus: node.masteryStatus,
      };
    })
    .slice(0, MAX_NODES);

  if (nodes.length === 0) {
    nodes.push({
      id: 'root',
      label: topic,
      description: topic,
      level: 0,
      importance: 'critical',
    });
  }

  const root = nodes.find(n => n.level === 0) ?? nodes[0];
  root.level = 0;

  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeKeys = new Set<string>();
  const edges: KnowledgeEdge[] = [];

  for (const edge of raw.edges || []) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) continue;
    const type = normalizeEdgeType(edge.type || edge.label || 'contains');
    const key = `${edge.from}->${edge.to}:${type}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({
      from: edge.from,
      to: edge.to,
      type,
      label: edge.label || edgeLabel(type),
    });
  }

  // Ensure tree backbone via contains edges from level hierarchy
  const byLevel = [...nodes].sort((a, b) => a.level - b.level);
  for (const node of byLevel) {
    if (node.id === root.id) continue;
    const parent = [...byLevel].reverse().find(
      p => p.level < node.level && p.id !== node.id,
    ) ?? root;
    const key = `${parent.id}->${node.id}:contains`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({ from: parent.id, to: node.id, type: 'contains', label: edgeLabel('contains') });
    }
  }

  const learningPath = (raw.learningPath || [])
    .filter(id => nodeIds.has(id))
    .slice(0, MAX_NODES);

  if (learningPath.length === 0) {
    learningPath.push(
      ...nodes
        .filter(n => n.level > 0)
        .sort((a, b) => a.level - b.level || a.label.localeCompare(b.label))
        .map(n => n.id),
    );
  }

  return {
    diagramType,
    topic,
    nodes,
    edges,
    learningPath,
    generatedAt: raw.generatedAt || Date.now(),
    sourceModuleId,
  };
}

/** Convert legacy curriculum ConceptMap shape to KnowledgeGraph */
export function legacyConceptMapToGraph(
  map: {
    centralConcept: string;
    nodes: Array<{ id: string; label: string; description: string; depth: number; parentId?: string }>;
    relationships: Array<{ from: string; to: string; label: string }>;
  },
  sourceModuleId?: string,
): KnowledgeGraph {
  const nodes: KnowledgeNode[] = map.nodes.map(n => ({
    id: n.id,
    label: n.label,
    description: n.description || n.label,
    level: Math.min(3, Math.max(0, n.depth)) as 0 | 1 | 2 | 3,
    importance: n.depth <= 1 ? 'critical' : n.depth === 2 ? 'important' : 'supplementary',
  }));

  const edges: KnowledgeEdge[] = map.relationships.map(r => ({
    from: r.from,
    to: r.to,
    type: normalizeEdgeType(r.label),
    label: r.label,
  }));

  return validateAndNormalizeGraph(
    {
      diagramType: 'dependency_graph',
      topic: map.centralConcept,
      nodes,
      edges,
      learningPath: map.nodes.filter(n => n.depth === 2).map(n => n.id),
      generatedAt: Date.now(),
    },
    map.centralConcept,
    sourceModuleId,
  );
}

function splitConceptLabel(concept: string): string[] {
  const parts = concept
    .split(/\s*(?:,|;|\/|&|\band\b|\bvs\.?\b)\s*/i)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.toLowerCase() !== concept.toLowerCase());

  if (parts.length >= 2) return parts.slice(0, 3);

  const words = concept.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const chunk = Math.ceil(words.length / 2);
    return [
      words.slice(0, chunk).join(' '),
      words.slice(chunk).join(' '),
    ];
  }

  return [
    `${concept} fundamentals`,
    `${concept} in practice`,
    `Common ${concept.toLowerCase()} pitfalls`,
  ];
}

export function isWeakKnowledgeGraph(graph: KnowledgeGraph): boolean {
  const nonContains = graph.edges.filter(e => e.type !== 'contains').length;
  const depth = Math.max(...graph.nodes.map(n => n.level), 0);
  return graph.nodes.length <= 5 || (depth <= 1 && nonContains === 0);
}

export function buildFallbackGraph(
  topic: string,
  concepts: string[],
  sourceModuleId?: string,
): KnowledgeGraph {
  const pillars = (concepts.length ? concepts : [topic]).slice(0, 6);
  const nodes: KnowledgeNode[] = [
    {
      id: 'root',
      label: topic,
      description: `Central topic: ${topic}. Master these connected ideas to build fluency.`,
      level: 0,
      importance: 'critical',
    },
  ];
  const edges: KnowledgeEdge[] = [];
  const learningPath: string[] = [];
  let subIdx = 0;

  pillars.forEach((pillar, i) => {
    const pillarId = `pillar-${i}`;
    nodes.push({
      id: pillarId,
      label: pillar,
      description: `Key pillar: ${pillar}`,
      level: 1,
      importance: 'critical',
    });
    edges.push({ from: 'root', to: pillarId, type: 'contains', label: edgeLabel('contains') });
    learningPath.push(pillarId);

    splitConceptLabel(pillar).forEach((sub, j) => {
      const subId = `sub-${subIdx++}`;
      nodes.push({
        id: subId,
        label: sub,
        description: `Deep dive: ${sub}`,
        level: 2,
        importance: j === 0 ? 'important' : 'supplementary',
      });
      edges.push({ from: pillarId, to: subId, type: 'contains', label: edgeLabel('contains') });
      learningPath.push(subId);
    });
  });

  // Cross-links for visual richness
  for (let i = 0; i < pillars.length - 1; i++) {
    edges.push({
      from: `pillar-${i}`,
      to: `pillar-${i + 1}`,
      type: i % 2 === 0 ? 'leads_to' : 'uses',
      label: edgeLabel(i % 2 === 0 ? 'leads_to' : 'uses'),
    });
  }

  return validateAndNormalizeGraph(
    {
      diagramType: 'concept_tree',
      topic,
      nodes,
      edges,
      learningPath,
      generatedAt: Date.now(),
    },
    topic,
    sourceModuleId,
  );
}
