const PLAN_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
];

function buildFallbackPlan(goal, skillLevel = 'beginner') {
  const match = goal.match(/Goal:\s*(.+)/i);
  const topic = (match?.[1] || goal).split('\n')[0].trim() || 'Learning Path';
  const module = (title, description, minutes, concepts) => ({
    title,
    description,
    estimatedMinutes: minutes,
    keyConcepts: concepts,
  });

  return {
    title: topic,
    description: `A focused ${skillLevel} path for ${topic}.`,
    isFallback: true,
    phases: [
      {
        title: 'Core Foundations',
        description: `Essential concepts for ${topic}.`,
        modules: [
          module('Introduction & Mental Model', `What ${topic} is and why it matters.`, 30, ['overview', 'terminology']),
          module('Setup & First Steps', 'Environment, tooling, and a minimal working example.', 45, ['setup', 'basics']),
        ],
      },
      {
        title: 'Applied Practice',
        description: 'Hands-on skills and patterns.',
        modules: [
          module('Guided Exercises', 'Structured drills on the most important skills.', 45, ['practice', 'patterns']),
          module('Mini Build', 'A small project that connects the core ideas.', 60, ['project', 'integration']),
        ],
      },
      {
        title: 'Mastery Checkpoint',
        description: 'Consolidate and extend.',
        modules: [
          module('Advanced Patterns', 'Common pitfalls, best practices, and next-level techniques.', 45, ['advanced', 'best-practices']),
          module('Review & Road Ahead', 'Summary, self-check, and what to learn next.', 30, ['review', 'roadmap']),
        ],
      },
    ],
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

import { callAIEngine } from '../utils/aiClientRouter.js';

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
      phaseInstruction = 'CRITICAL: Output EXACTLY 3 phases. Each phase has EXACTLY 2 modules. Keep descriptions under 120 characters. No URLs or suggestedResources.';
    } else if (cognitiveDensity === 'deep') {
      phaseInstruction = 'Output 5-7 phases. Max 3 modules per phase. Cover core concepts thoroughly.';
    } else if (cognitiveDensity === 'infinite') {
      phaseInstruction = 'Output 8-10 phases. Max 4 modules per phase. Structure as an extensive, highly comprehensive, infinite mastery roadmap covering advanced elements.';
    } else {
      phaseInstruction = 'Output 5-7 phases. Max 3 modules per phase.';
    }
  } else {
    phaseInstruction = isPreview
      ? 'CRITICAL: Output EXACTLY 3 phases. Each phase has EXACTLY 2 modules. Keep descriptions under 120 characters. No URLs or suggestedResources.'
      : 'Output 5-7 phases. Max 3 modules per phase.';
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
    ? `{ "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"] }`
    : `{ "title": "string", "description": "string", "estimatedMinutes": 30, "keyConcepts": ["string"], "suggestedResources": [{ "title": "string", "url": "string", "snippet": "string" }] }`;

  const prompt = `Return ONLY valid JSON. No markdown fences.

Roadmap for: "${String(goal).substring(0, 16000)}"
Skill: "${skillLevel}" | Outcome: "${expectedOutcome}" | Daily mins: ${dailyCommitment}
${resourceBlock}

${phaseInstruction}
${personalizationInstruction}

JSON:
{
  "title": "string",
  "description": "string (max 200 chars)",
  "phases": [{ "title": "string", "description": "string", "modules": [${moduleShape}] }]
}`;

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
    return plan;
  } catch (err) {
    console.warn('[LearningPlan] generateLearningPlan failed:', err.message);
    const isCustomCalibration = !!cognitiveDensity || !!studyLens || !!scholarPersona;
    if (isPreview && !isCustomCalibration) return buildFallbackPlan(goal, skillLevel);
    throw err;
  }
}

