/**
 * Intent Classifier — Ultra-fast keyword/pattern-based classifier.
 * NO AI calls. Pure regex and token matching for sub-millisecond classification.
 *
 * Returns { tier: 'low' | 'high', agents: string[] }
 */

// ── HIGH-tier trigger patterns ──────────────────────────────────────────────
// Each pattern maps a regex to the agents it implies.
const HIGH_TIER_PATTERNS = [
  // Multi-step synthesis & architecture
  {
    regex: /\b(architect(?:ure)?|system\s*design|design\s*pattern|micro\s*service|event[\s-]driven|distributed|scalab(?:le|ility)|infra(?:structure)?)\b/i,
    agents: ['GoogleScout', 'GitHubScout', 'WorkspaceConfigurator'],
  },
  // Pipeline / workflow building
  {
    regex: /\b(pipeline|ci[\s/]cd|workflow|deployment|docker(?:ize)?|kubernetes|k8s|terraform|devops|github\s*actions)\b/i,
    agents: ['GoogleScout', 'GitHubScout', 'WorkspaceConfigurator'],
  },
  // Framework comparison / evaluation
  {
    regex: /\b(compar(?:e|ison)|vs\.?|versus|pros?\s*(?:and|&)\s*cons?|trade[\s-]?offs?|which\s+(?:is|should|framework|library|tool))\b/i,
    agents: ['GoogleScout', 'YouTubeScout'],
  },
  // Roadmap / learning path creation
  {
    regex: /\b(roadmap|learning\s*path|curriculum|study\s*plan|from\s*(?:scratch|zero|beginner)|step[\s-]by[\s-]step\s+guide|complete\s+guide)\b/i,
    agents: ['YouTubeScout', 'GoogleScout'],
  },
  // Full-stack / project scaffolding
  {
    regex: /\b(full[\s-]?stack|project\s*(?:setup|structure|scaffold|boilerplate|starter)|build\s+(?:a|an|the)\s+\w+\s+app|create\s+(?:a|an)\s+\w+\s+project|init(?:ialize)?\s+(?:a|an)?\s*project)\b/i,
    agents: ['GitHubScout', 'WorkspaceConfigurator', 'YouTubeScout'],
  },
  // Implementation / tutorial requests
  {
    regex: /\b(implement(?:ation)?|build\s+(?:a|an)|how\s+(?:to|do\s+(?:i|you))\s+(?:build|create|implement|deploy|setup|configure|integrate))\b/i,
    agents: ['GoogleScout', 'YouTubeScout'],
  },
  // Explicit video / visual learning requests
  {
    regex: /\b(video|tutorial|watch|visual(?:ly)?|demo(?:nstrate)?|walkthrough|youtube|lecture|course)\b/i,
    agents: ['YouTubeScout'],
  },
  // Explicit documentation / research requests
  {
    regex: /\b(documentation|docs|whitepaper|research\s*paper|RFC|specification|official\s*(?:guide|docs|reference)|best\s*practices)\b/i,
    agents: ['GoogleScout'],
  },
  // Explicit code / repo requests
  {
    regex: /\b(github|repo(?:sitory)?|boilerplate|starter\s*(?:template|kit|code)|open[\s-]?source|npm\s+package|crate|gem\b|pip\s+install)\b/i,
    agents: ['GitHubScout'],
  },
  // Workspace / config / file structure
  {
    regex: /\b(file\s*(?:structure|tree|layout)|folder\s*(?:structure|layout)|project\s*(?:organization|layout)|config(?:uration)?\s+(?:file|setup)|\.env|package\.json|tsconfig|webpack|vite\s*config)\b/i,
    agents: ['WorkspaceConfigurator'],
  },
];

// ── LOW-tier patterns (greetings / simple questions) ────────────────────────
const LOW_TIER_PATTERNS = [
  // Greetings
  /^(?:hi|hello|hey|howdy|sup|yo|good\s*(?:morning|afternoon|evening|night)|greetings|namaste|hola)\s*[!?.]*$/i,
  // Very short messages (≤ 4 words, no HIGH patterns)
  /^(?:\S+\s*){1,4}$/,
  // Thank you / acknowledgment
  /^(?:thanks?|thank\s*you|ty|cool|ok(?:ay)?|got\s*it|nice|great|awesome|understood|makes?\s*sense|perfect)\s*[!.]*$/i,
  // Simple "what is" single-concept questions
  /^what\s+(?:is|are)\s+\w+\s*\??$/i,
  // Yes / No responses
  /^(?:yes|no|yep|nope|yeah|nah|sure|absolutely|definitely)\s*[!.]*$/i,
];

/**
 * Classify intent of a tutor chat message.
 * @param {string} message - The user's raw message text
 * @param {{ length: number }} history - Chat history array (used for context)
 * @returns {{ tier: 'low' | 'high', agents: string[] }}
 */
export function classifyIntent(message, history = []) {
  const trimmed = (message || '').trim();

  // Empty or very short messages → always LOW
  if (trimmed.length < 3) {
    return { tier: 'low', agents: [] };
  }

  // Check LOW-tier patterns first (fast-exit for greetings, acks, etc.)
  for (const pattern of LOW_TIER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { tier: 'low', agents: [] };
    }
  }

  // Scan for HIGH-tier triggers and accumulate unique agents
  const matchedAgents = new Set();
  let isHigh = false;

  for (const { regex, agents } of HIGH_TIER_PATTERNS) {
    if (regex.test(trimmed)) {
      isHigh = true;
      for (const agent of agents) {
        matchedAgents.add(agent);
      }
    }
  }

  // Additional heuristic: long messages (>80 chars) with multiple sentences
  // likely indicate complex multi-part requests
  if (!isHigh && trimmed.length > 80) {
    const sentenceCount = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 5).length;
    const wordCount = trimmed.split(/\s+/).length;

    if (sentenceCount >= 3 || wordCount >= 25) {
      isHigh = true;
      matchedAgents.add('GoogleScout');
    }
  }

  if (isHigh) {
    return { tier: 'high', agents: [...matchedAgents] };
  }

  return { tier: 'low', agents: [] };
}
