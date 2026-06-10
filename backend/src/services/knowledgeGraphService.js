import { callAIEngine } from '../utils/aiClientRouter.js';

function parseJson(text) {
  let raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) raw = fenced[1].trim();
  else {
    const obj = raw.match(/(\{[\s\S]*\})/);
    if (obj) raw = obj[1];
  }
  return JSON.parse(raw);
}

export async function generateKnowledgeGraph({
  moduleTitle,
  concepts = [],
  content = '',
  sourceModuleId,
  studyLens = 'roadmap',
  scholarPersona = 'visionary',
  cognitiveDensity = 'overview',
  goalContext = '',
  req,
}) {
  const headings = (content.match(/^#{2,3}\s+(.+)$/gm) || [])
    .map((h) => h.replace(/^#{2,3}\s+/, '').trim())
    .slice(0, 12);

  const lensInstruction = {
    roadmap: 'Organize as a step-by-step learning path from prerequisites to mastery.',
    foundations: 'Prioritize fundamentals, prerequisites, definitions, and first principles.',
    practice: 'Prioritize actionable skills, drills, implementation steps, and hands-on checkpoints.',
    exam: 'Prioritize high-yield facts, common question patterns, and fast revision order.',
    pitfalls: 'Prioritize misconceptions, confusing contrasts, failure modes, and debugging checkpoints.',
    feynman: 'Decompose every concept until a 10-year-old could explain it. Use analogies and simple language.',
    sherlock: 'Trace each concept back to its origin clue. Show the detective chain of reasoning.',
    einstein: 'Derive everything from first principles. Show axioms, then build up.',
    sprint: 'Organize for maximum retention in 60 minutes. Prioritize by impact-per-minute.',
    debate: 'For every concept, include a counter-argument or common misconception to stress-test understanding.',
  };

  const personaInstruction = {
    visionary: 'Frame each node as a future capability the student will unlock. Focus on what becomes possible.',
    analyst: 'Use precise, data-driven descriptions. Quantify relationships where possible.',
    builder: 'Frame everything as something constructable. Each node is a building block toward a project.',
    challenger: 'Each description should pose a provocative question or challenge an assumption.',
    storyteller: 'Each node is a chapter in a story. Show narrative progression and dramatic tension.',
    strategist: 'Frame mastery as a strategic campaign. Show tactical advantages of each concept.',
    hacker: 'Shortest path, maximum leverage. Each node shows the hack or shortcut to understanding.',
  };

  const densityNodes = {
    spark: '4-6',
    snapshot: '6-8',
    overview: '10-14',
    detailed: '16-22',
    deep: '24-30',
    mastery: '32-38',
    infinite: '40-50',
  };

  const nodesCount = densityNodes[cognitiveDensity] || '10-14';
  const lensPrompt = lensInstruction[studyLens] || '';
  const personaPrompt = personaInstruction[scholarPersona] || '';

  const prompt = `You are SARA, a senior learning architect. Build a rich knowledge graph for "${moduleTitle}" in the context of the overall learning goal "${goalContext || moduleTitle}".

CURRICULUM CONCEPTS (Mandatory Level 1 nodes):
${concepts.slice(0, 10).join(', ') || moduleTitle}

SECTION HEADINGS: ${headings.join(' | ') || 'derive from topic'}
CONTENT EXCERPT:
${content ? content.substring(0, 4500) : concepts.join('\n')}

STYLE & ADAPTATION CONFIGURATION:
- Study Lens: ${studyLens}. ${lensPrompt}
- Scholar Persona: ${scholarPersona}. ${personaPrompt}
- Cognitive Density / Complexity: ${cognitiveDensity} (Target node count: ${nodesCount} nodes)

REQUIREMENTS:
- ${nodesCount} nodes across 4 levels: 0=topic root, 1=major pillars, 2=mechanics/patterns, 3=examples/applications
- Root node id MUST be "root", representing "${moduleTitle}" at level 0.
- Level 1 nodes (major pillars) MUST map 1:1 to the CURRICULUM CONCEPTS: ${concepts.slice(0, 10).join(', ') || moduleTitle}. You must create exactly one level 1 node for each concept in this list, with the label matching the concept name. Do NOT introduce other level-1 major pillars outside this list.
- Level 2 (mechanics/patterns) and Level 3 (examples/applications) nodes must branch off from these level 1 concept nodes as children.
- Edges: Connect the 'root' node to each level 1 concept node. Show relationships between level 1, 2, and 3 nodes.
- learningPath: ordered node ids for mastery
- diagramType: concept_tree | dependency_graph | process_flow

Return ONLY valid JSON:
{
  "diagramType": "...",
  "topic": "${moduleTitle}",
  "nodes": [{ "id": "...", "label": "...", "description": "...", "level": 0, "importance": "critical|important|supplementary" }],
  "edges": [{ "from": "...", "to": "...", "type": "contains|requires|uses|implements|contrasts|leads_to|example_of", "label": "..." }],
  "learningPath": ["..."]
}`;

  const compactPrompt = `Return ONLY JSON for a knowledge graph about "${moduleTitle}" in the context of the overall learning goal "${goalContext || moduleTitle}".
Use ${nodesCount} nodes. Root id "root" at level 0.
Level 1 nodes MUST map 1:1 to the curriculum concepts: ${concepts.slice(0, 10).join(', ') || moduleTitle}. Do not introduce other major pillars at level 1.
Include diagramType, topic, nodes, edges, learningPath.`;

  const attempts = [
    { label: 'full graph', prompt, maxOutputTokens: 6500, timeoutMs: 100_000 },
    { label: 'compact graph', prompt: compactPrompt, maxOutputTokens: 4200, timeoutMs: 75_000 },
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const text = await callAIEngine({
        req,
        prompt: attempt.prompt,
        maxOutputTokens: attempt.maxOutputTokens,
        temperature: 0.28,
        responseMimeType: 'application/json',
        timeoutMs: attempt.timeoutMs,
      });
      const parsed = parseJson(text);
      return {
        ...parsed,
        generatedAt: Date.now(),
        sourceModuleId,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[KnowledgeGraph] ${attempt.label} failed:`, err.message);
    }
  }

  throw lastError || new Error('Knowledge graph generation failed');
}

