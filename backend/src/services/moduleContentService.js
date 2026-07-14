import { callAIEngine, callAIEngineStream } from '../utils/aiClientRouter.js';

function buildCitations(moduleResources = []) {
  return moduleResources.map((r, idx) => ({
    index: idx + 1,
    title: r.title || 'Source',
    url: r.content || r.url || '',
    domain:
      String(r.content || r.url || '').includes('youtube.com') ||
      String(r.content || r.url || '').includes('youtu.be')
        ? 'youtube.com'
        : (() => {
            try {
              return new URL(r.content || r.url).hostname.replace(/^www\./, '');
            } catch {
              return 'source';
            }
          })(),
    snippet: 'Scouted resource for this module.',
  }));
}

function buildPrompt(moduleTitle, concepts, goal, moduleResources, citations, studyLens = 'roadmap', scholarPersona = 'visionary', cognitiveDensity = 'overview') {
  const conceptList = (concepts || []).filter(Boolean).slice(0, 12);
  const readableSources = (moduleResources || []).filter((r) => r.type !== 'youtube');
  const ytSources = (moduleResources || []).filter((r) => r.type === 'youtube');
  const hasResources = citations.length > 0;

  const lensInstruction = {
    roadmap: 'Structure the paper as a clear, sequential step-by-step roadmap from foundations to advanced usage.',
    foundations: 'Focus deeply on core fundamentals, prerequisites, definitions, history, and base terminology.',
    practice: 'Emphasize real-world implementation, code drills, step-by-step tutorials, and concrete exercises.',
    exam: 'Focus on high-yield facts, core conceptual checkpoints, flashcard-style takeaways, and typical exam questions.',
    pitfalls: 'Explicitly focus on common mistakes, anti-patterns, performance bottlenecks, debugging strategies, and traps.',
    feynman: 'Explain all concepts using simple analogies, clear terminology, and plain English, as if explaining to a 10-year-old.',
    sherlock: 'Use detective-like deductive reasoning. Trace concepts from historical source/clues and analyze evidence.',
    einstein: 'Derive concepts strictly from first principles. Start with simple axioms, logic, and build up the logic tree.',
    sprint: 'High-impact, concise, fast-paced explanation optimized for maximum retention under time constraints.',
    debate: 'For every key concept, present a thesis and an opposing antithesis or counter-argument to stress-test validity.'
  };

  const personaInstruction = {
    visionary: 'Adopt a visionary tone: inspire the reader, highlight future applications, and show how this unlocks new capabilities.',
    analyst: 'Adopt an analytical tone: write with surgical precision, include metrics, performance specs, and quantitative relationships.',
    builder: 'Adopt a builder tone: explain concepts as building blocks for constructing actual systems, projects, or applications.',
    challenger: 'Adopt a challenger tone: ask provocative questions, challenge common dogmas, and stress-test every standard assumption.',
    storyteller: 'Adopt a storyteller tone: weave concepts into a narrative with historical progression, drama, conflict, and resolution.',
    strategist: 'Adopt a strategist tone: frame mastery as a strategic campaign, highlighting tactical advantages, trade-offs, and design choices.',
    hacker: 'Adopt a hacker tone: focus on maximum leverage, rapid shortcuts, neat hacks, real-world workarounds, and minimal fluff.'
  };

  const densityInstruction = {
    spark: 'Provide a very concise, ultra-focused summary of 1-2 core insights (approx. 300 words).',
    snapshot: 'Provide a brief, high-yield overview of 3-5 core concepts (approx. 500 words).',
    overview: 'Provide a balanced overview of 6-8 key concepts (approx. 900 words).',
    detailed: 'Provide a highly detailed analysis of 12-16 concepts with code details (approx. 1500 words).',
    deep: 'Provide a comprehensive deep dive covering advanced details and edge cases (approx. 2000 words).',
    mastery: 'Provide an exhaustive scholarly resource covering theoretical underpinnings and mathematical/logical details (approx. 2500 words).',
    infinite: 'Provide an absolute masterclass manual detailing internal architecture, low-level mechanics, and historical contexts (approx. 3000 words).'
  };

  const selectedLensPrompt = lensInstruction[studyLens] || lensInstruction.roadmap;
  const selectedPersonaPrompt = personaInstruction[scholarPersona] || personaInstruction.visionary;
  const selectedDensityPrompt = densityInstruction[cognitiveDensity] || densityInstruction.overview;

  const sourceBlock = hasResources
    ? `SCOUTED SOURCES FOR THIS MODULE:
${ytSources.length > 0 ? `YouTube Videos (use as topic signals for relevance):\n${ytSources.map((r, i) => `[YT${i + 1}] ${r.title}`).join('\n')}\n` : ''}${
        readableSources.length > 0
          ? `Reference Articles & Docs:\n${readableSources.map((r, i) => `[DOC${i + 1}] ${r.title} — ${r.content}`).join('\n')}\n`
          : ''
      }`
    : '';

  const bibliography = hasResources
    ? `UNIFIED BIBLIOGRAPHY:\n${citations.map((c) => `[${c.index}] ${c.title} — ${c.url}`).join('\n')}`
    : 'UNIFIED BIBLIOGRAPHY:\n[1] Course context and module key concepts supplied by Cortex.';

  const headingsFormat = conceptList.length > 0
    ? `## Introduction
> Source: [1]

${conceptList.map(c => `## ${c}\n> Source: [1]`).join('\n\n')}

## Mastery Checkpoint
> Source: [1]`
    : `## Introduction
> Source: [1]

## Core Concepts
> Source: [1]

## How It Works
> Source: [1]

## Common Patterns & Best Practices
> Source: [1]

## Common Mistakes
> Source: [1]

## Mastery Checkpoint
> Source: [1]`;

  return `You are SARA, a Senior Technical Strategist at Cortex.
Generate a high-fidelity scholarly whitepaper for "${moduleTitle}".

${sourceBlock}
${bibliography}

STYLE & PERSPECTIVE ADAPTATION:
- STUDY LENS: ${selectedLensPrompt}
- SCHOLAR PERSONA: ${selectedPersonaPrompt}
- COGNITIVE DENSITY / COMPLEXITY: ${selectedDensityPrompt}

MANDATE:
- Write accurate, expert-level content about "${moduleTitle}" specifically.
- Scope: strictly ${conceptList.join(', ') || moduleTitle} only.
- After every H2 heading, add "> Source: [1]" or "> Source: [1], [2]" referencing the bibliography.
- Minimum 900 words unless the topic is tiny.
- VISUAL LAYOUT & CALLOUTS (MANDATORY):
  * Avoid writing long blocks of plain text paragraphs. Break information down visually.
  * Use high-contrast blackboxes/callouts (e.g., markdown blockquotes "> [!NOTE]", "> [!IMPORTANT]", "> [!WARNING]") very sparingly. You must include a STRICT MAXIMUM of 2 callouts/blackboxes combined across the entire whitepaper. Do not clutter the text with more than 2 boxes.
  * Include at least 1-2 detailed, structured "mermaid" syntax flowchart diagrams (using triple-backticks with mermaid keyword fences) to visually map out conceptual relationships, system architectures, or workflow processes.
  * Always provide realistic, ready-to-run code snippets (e.g., JavaScript, Python, SQL) in standard markdown code fences rather than abstract code explanations.
  * Use structured checklists, comparisons, and tables to maximize structural variation.

FORMAT:
# ${moduleTitle}

${headingsFormat}

Goal: ${goal}
Concepts: ${conceptList.join(', ') || moduleTitle}

START DIRECTLY WITH THE # HEADING. No preamble.`;
}

function buildCompactPrompt(moduleTitle, concepts, goal, bibliography, studyLens = 'roadmap', scholarPersona = 'visionary', cognitiveDensity = 'overview') {
  const conceptList = (concepts || []).filter(Boolean).slice(0, 12);
  const headings = conceptList.length > 0
    ? `Introduction, ${conceptList.join(', ')}, Mastery Checkpoint`
    : `Introduction, Core Concepts, How It Works, Patterns, Mistakes, Mastery Checkpoint`;

  const lensInstruction = {
    roadmap: 'Structure the paper as a clear, sequential step-by-step roadmap from foundations to advanced usage.',
    foundations: 'Focus deeply on core fundamentals, prerequisites, definitions, history, and base terminology.',
    practice: 'Emphasize real-world implementation, code drills, step-by-step tutorials, and concrete exercises.',
    exam: 'Focus on high-yield facts, core conceptual checkpoints, flashcard-style takeaways, and typical exam questions.',
    pitfalls: 'Explicitly focus on common mistakes, anti-patterns, performance bottlenecks, debugging strategies, and traps.',
    feynman: 'Explain all concepts using simple analogies, clear terminology, and plain English, as if explaining to a 10-year-old.',
    sherlock: 'Use detective-like deductive reasoning. Trace concepts from historical source/clues and analyze evidence.',
    einstein: 'Derive concepts strictly from first principles. Start with simple axioms, logic, and build up the logic tree.',
    sprint: 'High-impact, concise, fast-paced explanation optimized for maximum retention under time constraints.',
    debate: 'For every key concept, present a thesis and an opposing antithesis or counter-argument to stress-test validity.'
  };

  const personaInstruction = {
    visionary: 'Adopt a visionary tone: inspire the reader, highlight future applications, and show how this unlocks new capabilities.',
    analyst: 'Adopt an analytical tone: write with surgical precision, include metrics, performance specs, and quantitative relationships.',
    builder: 'Adopt a builder tone: explain concepts as building blocks for constructing actual systems, projects, or applications.',
    challenger: 'Adopt a challenger tone: ask provocative questions, challenge common dogmas, and stress-test every standard assumption.',
    storyteller: 'Adopt a storyteller tone: weave concepts into a narrative with historical progression, drama, conflict, and resolution.',
    strategist: 'Adopt a strategist tone: frame mastery as a strategic campaign, highlighting tactical advantages, trade-offs, and design choices.',
    hacker: 'Adopt a hacker tone: focus on maximum leverage, rapid shortcuts, neat hacks, real-world workarounds, and minimal fluff.'
  };

  const densityInstruction = {
    spark: 'Provide a very concise, summary of 1-2 core insights.',
    snapshot: 'Provide a brief, overview of 3-5 concepts.',
    overview: 'Provide a balanced overview of 6-8 concepts.',
    detailed: 'Provide a highly detailed analysis of 12-16 concepts with code details.',
    deep: 'Provide a comprehensive deep dive covering advanced details and edge cases.',
    mastery: 'Provide an exhaustive scholarly resource covering theoretical underpinnings.',
    infinite: 'Provide an absolute masterclass manual detailing internal architecture.'
  };

  const selectedLensPrompt = lensInstruction[studyLens] || lensInstruction.roadmap;
  const selectedPersonaPrompt = personaInstruction[scholarPersona] || personaInstruction.visionary;
  const selectedDensityPrompt = densityInstruction[cognitiveDensity] || densityInstruction.overview;

  return `Generate a complete Cortex study whitepaper for "${moduleTitle}".
Grounding bibliography:
${bibliography}

STYLE & PERSPECTIVE ADAPTATION:
- STUDY LENS: ${selectedLensPrompt}
- SCHOLAR PERSONA: ${selectedPersonaPrompt}
- COGNITIVE DENSITY / COMPLEXITY: ${selectedDensityPrompt}

Goal: ${goal}
Concepts: ${conceptList.join(', ') || moduleTitle}

Rules:
- Start with "# ${moduleTitle}".
- Include H2 sections: ${headings}.
- After every H2 heading, include "> Source: [1]".
- Be specific and useful. Minimum 900 words unless the topic is tiny.
- VISUAL LAYOUT & CALLOUTS (MANDATORY):
  * Avoid long walls of plain text. Limit normal paragraphs.
  * Use high-contrast blackboxes/callouts (e.g., markdown blockquotes "> [!NOTE]", "> [!IMPORTANT]", "> [!WARNING]") very sparingly. You must include a STRICT MAXIMUM of 2 callouts/blackboxes combined across the entire whitepaper. Do not clutter the text with more than 2 boxes.
  * Include at least 1 detailed "mermaid" flowchart diagram mapping the main workflow or logical concept in action.
  * Provide executable code blocks in code fences (e.g., Python, JS, SQL).
  * Use comparative tables and bullet-pointed grids.`;
}

export async function generateModuleContent({
  moduleTitle,
  concepts = [],
  goal = 'General Mastery',
  moduleResources = [],
  studyLens = 'roadmap',
  scholarPersona = 'visionary',
  cognitiveDensity = 'overview',
  req,
  onChunk = null, // callback for streaming
}) {
  const citations = buildCitations(moduleResources);
  const bibliography =
    citations.length > 0
      ? citations.map((c) => `[${c.index}] ${c.title} — ${c.url}`).join('\n')
      : '[1] Course context and module key concepts supplied by Cortex.';
 
  const attempts = [
    {
      label: 'full synthesis',
      prompt: buildPrompt(moduleTitle, concepts, goal, moduleResources, citations, studyLens, scholarPersona, cognitiveDensity),
      maxOutputTokens: 9000,
      temperature: 0.32,
      timeoutMs: 110_000,
    },
    {
      label: 'compact synthesis',
      prompt: buildCompactPrompt(moduleTitle, concepts, goal, bibliography, studyLens, scholarPersona, cognitiveDensity),
      maxOutputTokens: 6500,
      temperature: 0.25,
      timeoutMs: 85_000,
    },
  ];
 
  let lastError;
  for (const attempt of attempts) {
    try {
      if (onChunk) {
        let text = '';
        await callAIEngineStream({
          req,
          prompt: attempt.prompt,
          maxOutputTokens: attempt.maxOutputTokens,
          temperature: attempt.temperature,
          onChunk: (chunk) => {
            text += chunk;
            onChunk(chunk);
          }
        });
        if (text.length >= 700 && !/AI Synthesis Paused|No content generated/i.test(text)) {
          console.log(`[ModuleContent] Streaming ${attempt.label} succeeded (${text.length} chars)`);
          return { content: text, citations };
        }
        lastError = new Error(`Weak streamed output (${text.length} chars)`);
      } else {
        const text = (
          await callAIEngine({
            req,
            prompt: attempt.prompt,
            maxOutputTokens: attempt.maxOutputTokens,
            temperature: attempt.temperature,
            timeoutMs: attempt.timeoutMs,
          })
        ).trim();
 
        if (text.length >= 700 && !/AI Synthesis Paused|No content generated/i.test(text)) {
          console.log(`[ModuleContent] ${attempt.label} succeeded (${text.length} chars)`);
          return { content: text, citations };
        }
        lastError = new Error(`Weak output (${text.length} chars)`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[ModuleContent] ${attempt.label} failed:`, err.message);
    }
  }
 
  throw lastError || new Error('Module content generation failed');
}

export async function generateHydratedSandboxExercise(nodeTitle, learningContext, req) {
  const prompt = `You are a Senior Software Engineer. Generate a practical coding task for a node titled: "${nodeTitle}".
  
  CONTEXT OF THE CURRENT LEARNING ROADMAP:
  "${learningContext.substring(0, 1000)}"

  Task: Create an interactive laboratory file configuration. The student code MUST contain a syntax placeholder line (e.g. "// EXERCISE: Implement code here" or "# EXERCISE: Implement code here" depending on the language) inside a broken, buggy script that fails until they apply the exact pattern.
  Detect and specify the most appropriate programming/query language for the concept (e.g. 'python' for data analytics, data science, BI, SQL, etc.; 'javascript' or 'typescript' for frontend/web; 'html' for layout).

  Return exactly this JSON format:
  {
    "initialCode": "string containing broken codebase boilerplates",
    "solutionCheckRegex": "string regex pattern to validate output strings",
    "instructionsMarkdown": "clear target goals explaining what needs to be refactored",
    "language": "string specifying code language identifier (e.g. 'javascript', 'typescript', 'python', 'html', 'java', 'cpp', 'c')"
  }`;

  const aiOutput = await callAIEngine({
    req,
    prompt,
    temperature: 0.1,
    responseMimeType: 'application/json'
  });

  let cleanJson = aiOutput.trim();
  const jsonMatch = cleanJson.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/) || cleanJson.match(/(\\{[\\s\\S]*\\})/);
  if (jsonMatch) {
    cleanJson = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(cleanJson);
  return {
    initialCode: parsed.initialCode,
    solutionCheckRegex: parsed.solutionCheckRegex,
    instructionsMarkdown: parsed.instructionsMarkdown,
    language: parsed.language || 'javascript'
  };
}

