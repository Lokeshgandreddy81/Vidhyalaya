import { callAIEngine } from '../utils/aiClientRouter.js';

const PLAN_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
];

export function buildGraphTopologyFromPhases(phases) {
  const nodes = [];
  const edges = [];
  const allModules = phases.flatMap(p => p.modules || []);
  
  allModules.forEach(mod => {
    if (!mod.id) {
      mod.id = 'mod-' + mod.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    
    nodes.push({
      id: mod.id,
      title: mod.title,
      description: mod.description || '',
      estimatedMinutes: mod.estimatedMinutes || 45,
      prerequisites: mod.dependsOnModuleIds || [],
      skillsTargeted: mod.keyConcepts || [],
      isLocked: (mod.dependsOnModuleIds || []).length > 0,
      masteryPercentage: 0
    });

    if (mod.dependsOnModuleIds) {
      mod.dependsOnModuleIds.forEach(depId => {
        edges.push({ from: depId, to: mod.id });
      });
    }
  });

  return { nodes, edges };
}

function buildFallbackPlan(goal, skillLevel = 'beginner') {
  const match = goal.match(/Goal:\s*(.+)/i);
  const topic = (match?.[1] || goal).split('\n')[0].trim() || 'Learning Path';
  const module = (id, title, description, minutes, concepts, dependsOnModuleIds = []) => ({
    id,
    title,
    description,
    estimatedMinutes: minutes,
    keyConcepts: concepts,
    dependsOnModuleIds,
  });

  const phases = [
    {
      title: 'Core Foundations',
      description: `Essential concepts for ${topic}.`,
      modules: [
        module('mod-1-1', 'Introduction & Mental Model', `What ${topic} is and why it matters.`, 30, ['overview', 'terminology'], []),
        module('mod-1-2', 'Setup & First Steps', 'Environment, tooling, and a minimal working example.', 45, ['setup', 'basics'], ['mod-1-1']),
        module('mod-1-3', 'Syntax & Basic Types', 'Exploration of foundational syntax and primary data models.', 45, ['syntax', 'types'], ['mod-1-2']),
        module('mod-1-4', 'Core Operations & Logic', 'Flow control, conditional paths, and basic execution blocks.', 45, ['logic', 'execution'], ['mod-1-3']),
        module('mod-1-5', 'Primary Implementation Exercise', 'Consolidated exercises applying basic foundations.', 60, ['application', 'exercise'], ['mod-1-4']),
      ],
    },
    {
      title: 'Applied Practice',
      description: 'Hands-on skills and patterns.',
      modules: [
        module('mod-2-1', 'Guided Exercises', 'Structured drills on the most important skills.', 45, ['practice', 'patterns'], ['mod-1-5']),
        module('mod-2-2', 'Mini Build', 'A small project that connects the core ideas.', 60, ['project', 'integration'], ['mod-2-1']),
        module('mod-2-3', 'Code Refactoring & Style', 'Optimizing structure and standard code styling rules.', 40, ['style', 'refactoring'], ['mod-2-2']),
        module('mod-2-4', 'Debugging & Error Handling', 'Finding, isolating, and fixing system issues gracefully.', 45, ['debugging', 'exceptions'], ['mod-2-3']),
        module('mod-2-5', 'Integration Lab', 'Full integration testing and modular configuration exercises.', 60, ['lab', 'testing'], ['mod-2-4']),
      ],
    },
    {
      title: 'Mastery Checkpoint',
      description: 'Consolidate and extend.',
      modules: [
        module('mod-3-1', 'Advanced Patterns', 'Common pitfalls, best practices, and next-level techniques.', 45, ['advanced', 'best-practices'], ['mod-2-5']),
        module('mod-3-2', 'Performance Tuning', 'Code profile optimization, memory footprints, and scalability.', 45, ['performance', 'optimization'], ['mod-3-1']),
        module('mod-3-3', 'Testing & Verification', 'Writing assertions, unit tests, and validation scripts.', 45, ['verification', 'unit-tests'], ['mod-3-2']),
        module('mod-3-4', 'Deploy & Production Strategy', 'Releasing execution modules and staging processes securely.', 50, ['deployment', 'release'], ['mod-3-3']),
        module('mod-3-5', 'Review & Road Ahead', 'Summary, self-check, and what to learn next.', 30, ['review', 'roadmap'], ['mod-3-4']),
      ],
    },
  ];

  return {
    title: topic,
    description: `A focused ${skillLevel} path for ${topic}.`,
    isFallback: true,
    phases,
    graphTopology: buildGraphTopologyFromPhases(phases)
  };
}

function parsePlanJson(text) {
  let raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) raw = fenced[1].trim();
  else {
    const obj = raw.match(/(\{[\s\S]*\})/);
    if (obj) raw = obj[1];
  }
  return JSON.parse(raw);
}

export async function generateLearningPlan({
  goal,
  skillLevel = 'beginner',
  dailyCommitment = 45,
  expectedOutcome = 'Mastery',
  mode = 'preview',
  resources = '',
  studyLens,
  scholarPersona,
  cognitiveDensity,
  req,
}) {
  const isPreview = mode === 'preview';
  
  // Custom calibration prompt instruction
  let phaseInstruction = '';
  if (cognitiveDensity) {
    if (['spark', 'snapshot', 'overview'].includes(cognitiveDensity)) {
      phaseInstruction = 'CRITICAL: Output EXACTLY 3 phases. Each phase has EXACTLY 5 modules. Keep descriptions under 120 characters. No URLs or suggestedResources.';
    } else if (cognitiveDensity === 'deep') {
      phaseInstruction = 'Output 4-6 phases. Each phase MUST have at least 5 modules. Cover core concepts thoroughly.';
    } else if (cognitiveDensity === 'infinite') {
      phaseInstruction = 'Output 6-8 phases. Each phase MUST have at least 5-6 modules. Structure as an extensive, highly comprehensive, infinite mastery roadmap.';
    } else {
      phaseInstruction = 'Output 4-6 phases. Each phase MUST have at least 5 modules.';
    }
  } else {
    phaseInstruction = isPreview
      ? 'CRITICAL: Output EXACTLY 3 phases. Each phase has EXACTLY 5 modules. Keep descriptions under 120 characters. No URLs or suggestedResources.'
      : 'Output 4-6 phases. Each phase MUST have at least 5 modules.';
  }

  // Personalization prompt adjustment based on studyLens & scholarPersona
  let personalizationInstruction = '';
  if (studyLens) {
    personalizationInstruction += `\n- Study Lens: "${studyLens}". `;
    if (studyLens === 'practice') {
      personalizationInstruction += 'Emphasize practical hands-on exercises, coding challenges, implementation labs, and active drills in the modules.';
    } else if (studyLens === 'theory') {
      personalizationInstruction += 'Emphasize foundational theoretical principles, mathematical definitions, academic concepts, and conceptual theory.';
    } else if (studyLens === 'system') {
      personalizationInstruction += 'Emphasize systems engineering, production configurations, design patterns, architecture diagrams, scaling constraints, and diagnostic strategies.';
    }
  }
  if (scholarPersona) {
    personalizationInstruction += `\n- Scholar Persona: "${scholarPersona}". Adapt explanation style, complexity, and terminology to fit this profile perfectly (e.g. "builder" wants high execution, "visionary" wants trends/concepts).`;
  }

  const resourceBlock = isPreview || !resources
    ? ''
    : `\nGROUNDING RESOURCES (inform structure only — do not echo URLs):\n${String(resources).substring(0, 12000)}`;

  const moduleShape = isPreview
    ? `{ "id": "string", "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"], "dependsOnModuleIds": ["string"] }`
    : `{ "id": "string", "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"], "dependsOnModuleIds": ["string"], "suggestedResources": [{ "title": "string", "url": "string", "snippet": "string" }] }`;

  let hybridInstruction = '';
  if (/hybrid/i.test(goal) || /bridge/i.test(goal) || String(goal).includes('+')) {
    hybridInstruction = `\nHYBRID SYNTHESIS INSTRUCTIONS:
This is a multi-domain hybrid learning roadmap combining distinct skills/roles.
1. Enforce strict Prerequisite DAG Topology: Foundational core subjects of each domain MUST appear in Phase 1 before multi-domain fusion.
2. Domain Badging: Prefix EVERY module title with an explicit domain badge in brackets, e.g. "[Frontend]", "[DevOps]", "[Database]", or "[Hybrid Synthesis]".
3. Cross-Domain Capstones: The final module of EACH phase MUST be a practical multi-domain capstone exercise integrating the combined domains.`;
  }

  const prompt = `Return ONLY valid JSON. No markdown fences.

Roadmap for: "${String(goal).substring(0, 16000)}"
Skill: "${skillLevel}" | Outcome: "${expectedOutcome}" | Daily mins: ${dailyCommitment}
${resourceBlock}

${phaseInstruction}
${personalizationInstruction}
${hybridInstruction}

JSON:
{
  "title": "string",
  "description": "string (max 200 chars)",
  "phases": [{ "title": "string", "description": "string", "modules": [${moduleShape}] }],
  "graphTopology": {
    "nodes": [{
      "id": "string",
      "title": "string",
      "description": "string",
      "estimatedMinutes": 45,
      "prerequisites": ["string"],
      "skillsTargeted": ["string"],
      "isLocked": true,
      "masteryPercentage": 0
    }],
    "edges": [{
      "from": "string",
      "to": "string"
    }]
  }
}

CRITICAL STRUCTURAL CONSTRAINTS:
1. Every module in 'phases.modules' must have a unique identifier 'id' (e.g. "mod-intro", "mod-advanced-react").
2. The module ID pointers in 'graphTopology.nodes' and 'phases.modules' MUST align exactly.
3. Track dependencies strictly: specify the 'dependsOnModuleIds' for modules and 'prerequisites' for graph nodes to establish a clean Directed Acyclic Graph (DAG) for student advancement.
4. Ensure 'graphTopology.edges' lists all prerequisite links (from prerequisite 'from' to dependent 'to') corresponding to the module dependencies.
5. There must be no circular dependencies.`;

  try {
    const text = await callAIEngine({
      req,
      prompt,
      maxOutputTokens: isPreview ? 2800 : 5500,
      temperature: 0.35,
      responseMimeType: 'application/json',
      timeoutMs: 45_000,
    });
    const plan = parsePlanJson(text);
    if (!plan?.phases?.length) throw new Error('Invalid plan structure');

    // Ensure every module has an ID and dependencies are set
    plan.phases.forEach((phase, pIdx) => {
      phase.modules = (phase.modules || []).map((mod, mIdx) => {
        if (!mod.id) {
          mod.id = `mod-${pIdx}-${mIdx}`;
        }
        if (!mod.dependsOnModuleIds) {
          const prevMod = mIdx > 0 
            ? phase.modules[mIdx - 1] 
            : (pIdx > 0 ? plan.phases[pIdx - 1].modules[plan.phases[pIdx - 1].modules.length - 1] : null);
          mod.dependsOnModuleIds = prevMod ? [prevMod.id] : [];
        }
        return mod;
      });
    });

    if (!plan.graphTopology || !plan.graphTopology.nodes || plan.graphTopology.nodes.length === 0) {
      plan.graphTopology = buildGraphTopologyFromPhases(plan.phases);
    } else {
      plan.graphTopology.nodes.forEach(n => {
        if (n.isLocked === undefined) n.isLocked = (n.prerequisites || []).length > 0;
        if (n.masteryPercentage === undefined) n.masteryPercentage = 0;
      });
    }

    return plan;
  } catch (err) {
    console.error('[LearningPlan] generateLearningPlan failed:', err.message);
    throw err;
  }
}
