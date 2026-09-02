import { callAIEngine, callAIEngineStream } from '../utils/aiClientRouter.js';
import { classifyIntent } from './swarm/intentClassifier.js';
import { AGENT_REGISTRY, executeReActSwarm, rankAndNormalize } from './swarm/orchestrator.js';
import {
  formatExecutionEvidenceForPrompt,
  formatExecutionReport,
  runAutonomousToolExecution,
} from './toolExecutionService.js';
import {
  recallEpisodicMemories,
  extractAndPersistMemory,
} from './episodicMemoryService.js';

const TUTOR_SYSTEM_INSTRUCTION = `You are Cortex, the execution-first tutor inside Vidhyalaya.
Never expose hidden chain-of-thought or <think> blocks. Use concise private reasoning, then answer with verified facts.
When AUTONOMOUS TOOL EXECUTION RESULT is present, treat it as the source of truth and clearly distinguish executed results from recommendations.`;

// Models that are "heavy" (expensive/slow) for simple conversational questions
const HEAVY_MODELS = [
  'gemini-2.5-pro', 'gemini-2.0-pro', 'gpt-4o', 'gpt-4-turbo',
  'claude-3-5-sonnet-latest', 'claude-3-opus', 'gemini-exp',
];

function routePromptTemplate(newMessage) {
  const msg = newMessage.toLowerCase();
  if (/\b(error|fail|bug|exception|crash|wrong|not working|compile|undefined|null|nan|issue|fix|warning|syntax)\b/i.test(msg)) {
    return `

[ROUTED TEMPLATE: ROOT-CAUSE-FIX]
Since the student is debugging or encountering a compiler/runtime issue, you MUST structure your answer around:
1. Identify the Root Cause clearly.
2. Explain why the bug occurred under the hood.
3. Suggest exactly two fixes: one quick-fix to unblock, and one best-practice correction.`;
  }
  
  if (/\b(design|architecture|structure|system|pipeline|database|scale|refactor|optimize|pattern|solid|oop)\b/i.test(msg)) {
    return `

[ROUTED TEMPLATE: TRADE-OFFS & ARCHITECTURE]
Since the student is asking about architecture, refactoring, or design:
1. Focus on structural alternatives and layouts.
2. Compare trade-offs (e.g. read speed vs write speed, scaling, readability, decoupling).
3. Recommend a preferred design pattern and outline the folder structure/scaffold.`;
  }
  
  return `

[ROUTED TEMPLATE: ANALOGY-FORMAL-CODE]
Since this is a conceptual or general explanation request:
1. Punchy Core Definition: A bold, one-sentence plain explanation.
2. Vivid Metaphor/Analogy: Compare the concept to a real-world object or job.
3. Formal Definition & Mechanics: Break down how the internals execute.
4. Code Sandbox Example: Provide a clean, minimal code snippet.`;
}

export async function chatWithTutor({
  history = [],
  newMessage,
  context = '',
  currentContent = '',
  chatContext = null,
  req,
  res = null,
  onChunk = null,
}) {
  if (!newMessage?.trim()) throw new Error('Message is required.');

  const isGeneralMode = chatContext?.mode === 'general';

  // Check if broad intent qualification is triggered to halt agents and prompt qualification
  if (!isGeneralMode) {
    const broadQualification = evaluateBroadIntent(newMessage, history);
    if (broadQualification) {
      const textPrefix = `Hello! Let's calibrate your workspace first to tailor it specifically to your goals.\n\n`;
      
      let choicesXML = `<sara_qualification question="${broadQualification.question}">\n`;
      for (const choice of broadQualification.choices) {
        choicesXML += `  <choice id="${choice.id}">${choice.text}</choice>\n`;
      }
      choicesXML += `</sara_qualification>`;

      const metadata = `\n\n<sara_metadata>\n${JSON.stringify({
        intent: 'Conceptual',
        mode: 'Mentor',
        action: 'none',
        target: '',
        skill_update: { concept: newMessage.trim(), delta: 0 },
        interactive_block: null
      }, null, 2)}\n</sara_metadata>`;

      const fullMsgText = textPrefix + choicesXML + metadata;

      if (onChunk) {
        onChunk(fullMsgText);
      } else if (res) {
        res.write(`data: ${JSON.stringify({ text: fullMsgText })}\n\n`);
      }
      return { text: fullMsgText };
    }
  }

  // 1. Intent Complexity Assessor (ReAct scouting active for /scout and high-tier prompts)
  const classifiedIntent = classifyIntent(newMessage, history || []);
  const explicitScoutMode = newMessage.toLowerCase().startsWith('/scout');
  const isHighComplexity = explicitScoutMode || classifiedIntent.tier === 'high';
  let agents = [];
  let scoutTopic = '';
  if (isHighComplexity) {
    scoutTopic = explicitScoutMode ? newMessage.substring(6).trim() : newMessage.trim();
    const agentSet = new Set(classifiedIntent.agents || []);
    if (explicitScoutMode) {
      agentSet.add('GoogleScout');
    }
    if (/\b(file|folder|structure|scaffold|directory|setup|tsconfig|package\.json|boilerplate|project|code|repo)\b/i.test(scoutTopic)) {
      agentSet.add('WorkspaceConfigurator');
    }
    if (/\b(local|codebase|route|component|service|middleware|model|schema|implementation|source)\b/i.test(scoutTopic)) {
      agentSet.add('WorkspaceInspector');
    }
    if (agentSet.size === 0) {
      agentSet.add('GoogleScout');
    }
    agents = Array.from(agentSet);
  }
  const compiledContext = {};
  let rankedResources = [];
  let reactTrace = [];

  if (isHighComplexity) {
    // Execute a bounded ReAct loop: decide -> act -> observe -> decide again.
    const swarmRun = await executeReActSwarm({
      agents,
      topic: scoutTopic,
      context: currentContent || context,
      req,
      res
    });
    const workerResults = swarmRun.results || {};
    reactTrace = swarmRun.trace || [];
    agents = swarmRun.executedAgents?.length ? swarmRun.executedAgents : agents;

    // Run Context Ranker & Semantic Filter middleware
    rankedResources = await rankAndNormalize(scoutTopic, workerResults, req);
    
    // Assemble the compiled context for prompt injection and payload delivery
    compiledContext.YouTubeScout = { videos: workerResults.YouTubeScout?.videos || [] };
    compiledContext.GoogleScout = { resources: workerResults.GoogleScout?.resources || [] };
    compiledContext.GitHubScout = { repos: workerResults.GitHubScout?.repos || [] };
    compiledContext.WorkspaceConfigurator = workerResults.WorkspaceConfigurator || null;
    compiledContext.WorkspaceInspector = workerResults.WorkspaceInspector || null;
    compiledContext.ReActTrace = reactTrace;
  }

  const recentContext = (history || [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'USER' : 'SARA'}: ${m.content}`)
    .join('\n');

  const userId = req?.user?.id || chatContext?.userId || null;
  let memoryContextBlock = '';
  if (userId) {
    const recalledMemories = await recallEpisodicMemories({
      userId,
      queryText: newMessage,
      topK: 5,
      req,
    });
    if (recalledMemories && recalledMemories.length > 0) {
      memoryContextBlock = `\n[CORTEX RECALLED CROSS-SESSION EPISODIC MEMORY & LEARNER PREFERENCES]:`;
      for (const mem of recalledMemories) {
        memoryContextBlock += `\n- [${mem.category.toUpperCase()}] ${mem.content}`;
      }
      memoryContextBlock += `\nUse these recalled cross-session learner preferences, coding style, and historical error context naturally to tailor your guidance.`;
    }
  }

  let contextBlock = '';
  let studentSkillProfile = 'Beginner';
  if (chatContext) {
    const { activePathId, activeModule, openFiles, activeEditorFile, videoPlayback, activeLanguage, lastCompilationError, studentSkillProfile: skill, projectEcosystem, uploadedDocumentContext, uploadedImagesContext } = chatContext;
    if (skill) studentSkillProfile = skill;
    
    const hasWorkspaceCode = activeEditorFile?.trim() || lastCompilationError?.trim() || (openFiles && openFiles.length > 0);
    
    if (!isGeneralMode || hasWorkspaceCode) {
      contextBlock = `\n[CRITICAL LIVE STUDENT WORKSPACE CONTEXT]:`;
      contextBlock += `\n- Student Course Skill Profile: ${studentSkillProfile}`;
      
      if (activeModule) {
        contextBlock += `\n- Current Learning Module: "${activeModule}"`;
      }
      if (activePathId) {
        contextBlock += `\n- Active Path ID: "${activePathId}"`;
      }
      if (videoPlayback) {
        contextBlock += `\n- Active Lecture Video: watch?v=${videoPlayback.id} at timestamp ${Math.floor(videoPlayback.timestamp)}s${videoPlayback.activeChapterTitle ? ` (Chapter: "${videoPlayback.activeChapterTitle}")` : ''}`;
      }
      if (openFiles && openFiles.length > 0) {
        contextBlock += `\n- Open Files in Sandbox Workspace: ${openFiles.map(f => f.name).join(', ')}`;
      }
      if (projectEcosystem && projectEcosystem.length > 0) {
        contextBlock += `\n- Sandbox Project Ecosystem (AST Summary):\n${projectEcosystem.map(f => `  * File: ${f.filename}\n    - Key Imports: ${f.imports}\n    - Declarations: ${f.declarations}`).join('\n')}`;
      }
      if (activeEditorFile?.trim()) {
        contextBlock += `\n- Code inside Student Editor Window:\n\`\`\`${activeLanguage || 'javascript'}\n${activeEditorFile}\n\`\`\``;
      }
      if (lastCompilationError?.trim()) {
        contextBlock += `\n- **LIVE CRITICAL ERROR LOG IN TERMINAL**:\n\`\`\`\n${lastCompilationError}\n\`\`\``;
      }
    }
    
    if (uploadedDocumentContext?.trim()) {
      contextBlock += `\n- Uploaded Document Context:\n${uploadedDocumentContext}`;
    }
  }

  const resolvedContent = currentContent || (chatContext && chatContext.currentSyllabusContext) || '';
  let contentContext = '';
  if (resolvedContent && !isGeneralMode) {
    contentContext = `\nCURRENT MODULE CONTENT (ground answers here):\n${resolvedContent.substring(0, 3500)}`;
  }

  // Inject Swarm Grounded Research Context (semantic ranked resources)
  if (isHighComplexity && rankedResources && rankedResources.length > 0) {
    contentContext += `\n\n[SWARM AGENT SEMANTICALLY RANKED DISCOVERY RESULTS] (use these resources directly to build custom roadmaps, cite repositories, and suggest learning videos):`;
    for (const r of rankedResources) {
      contentContext += `\n- [Source: ${r.id}] Title: "${r.title}", URL: "${r.url}"`;
      if (r.snippet) {
        contentContext += `\n  Summary: ${r.snippet}`;
      }
    }
    if (compiledContext.WorkspaceConfigurator) {
      contentContext += `\n- Scaffolded Directory Structure & Starter Code:\n${JSON.stringify(compiledContext.WorkspaceConfigurator, null, 2)}`;
    }
    if (compiledContext.WorkspaceInspector?.files?.length > 0) {
      contentContext += `\n- Local Workspace Inspection Results:\n${JSON.stringify(compiledContext.WorkspaceInspector.files.slice(0, 5), null, 2)}`;
    }
    if (reactTrace.length > 0) {
      contentContext += `\n- ReAct Tool Trace:\n${JSON.stringify(reactTrace, null, 2)}`;
    }
  }

  let autonomousExecution = null;
  try {
    autonomousExecution = await runAutonomousToolExecution({
      newMessage,
      chatContext,
      req,
      onEvent: (event) => {
        const toolChunk = `data: tool: ${JSON.stringify(event)}\n\n`;
        if (onChunk) {
          onChunk(toolChunk);
        } else if (res) {
          res.write(toolChunk);
        }
      },
    });
  } catch (err) {
    console.warn('[CortexToolRunner] autonomous execution failed:', err);
  }

  const executionEvidence = formatExecutionEvidenceForPrompt(autonomousExecution);
  const executionReport = formatExecutionReport(autonomousExecution);
  if (executionEvidence) {
    contentContext += executionEvidence;
  }

  // Resolve active model and usage mode from request headers
  const activeModel = req?.headers?.['x-byok-active-model'] || 'gemini-2.5-flash';
  const byokMode = req?.headers?.['x-byok-mode'] || 'auto';
  const turnCount = (history || []).length;
  const isHeavyModel = HEAVY_MODELS.some(m => activeModel.toLowerCase().includes(m.toLowerCase()));
  const isAutoMode = byokMode === 'auto';

  // Model guidance block is removed to prevent pushing model-switching
  // or API quota warnings back to the user. SARA should handle this gracefully
  // and focus purely on teaching.
  let modelGuidanceBlock = '';

  let architectOpinion = '';
  let auditorOpinion = '';
  let agentDebateLog = '';

  const isTechnicalQuery = /\b(code|function|class|api|database|react|express|mongodb|docker|kubernetes|aws|build|deploy|error|fail|bug|refactor|design|architecture|system|route|schema|middleware|npm|package|git|auth)\b/i.test(newMessage);

  if (isGeneralMode && isTechnicalQuery) {
    try {
      const [archResult, auditResult] = await Promise.all([
        callAIEngine({
          req,
          prompt: `User request: "${newMessage}"\nProvide a high-level systems design and engineering strategy (libraries to use, folder structure, pattern to apply). Limit your answer to 120 words maximum. Be direct.`,
          systemInstruction: "You are an elite Software Architect. Your job is to output a clean, modern, and optimal technical layout.",
          maxOutputTokens: 250,
          temperature: 0.2,
        }),
        callAIEngine({
          req,
          prompt: `User request: "${newMessage}"\nAnalyze this request for potential security flaws, race conditions, edge cases, compiler pitfalls, or performance bugs. Limit your answer to 120 words maximum. Be direct.`,
          systemInstruction: "You are a senior Security and Performance Auditor. Your job is to call out critical edge cases, vulnerabilities, and performance bottlenecks.",
          maxOutputTokens: 250,
          temperature: 0.2,
        })
      ]);
      architectOpinion = archResult || 'No architectural concerns identified.';
      auditorOpinion = auditResult || 'No security/performance concerns identified.';
      agentDebateLog = `
[SWARM CONSENSUS DEBATE]
- summon: System Architect
- input: ${architectOpinion.trim()}
- summon: Security & Performance Auditor
- input: ${auditorOpinion.trim()}
`;
    } catch (err) {
      console.warn('[Swarm Debate] failed:', err);
    }
  }

  const prompt = isGeneralMode
    ? `Current Date: ${new Date().toISOString().slice(0, 10)}

# SYSTEM INSTRUCTION

## 1. IDENTITY & PRESENTATION
- You are a helpful, premium general-purpose AI assistant. 
- Speak like an everyday, well-informed human friend. 
- Avoid any specialized personas, character roles, clinical templates, or coaching identities.
- Deliver clear, insightful, and brief responses.

## 2. STRICT CONSTRAINTS
- NEVER use computing, developer, or software engineering analogies (e.g., "data stream," "logs," "debugging," "404," "cache") when discussing general topics like sports, news, or everyday life.
- If you do not have real-time data access to answer a current event query (like yesterday's sports scores), simply state: "I don't have access to live real-time search data to look up yesterday's match details right now." Do not invent excuses, dates, or technical system status layouts.

## 3. EXECUTION-FIRST PROTOCOL
- Never output hidden reasoning, chain-of-thought, or \`<think>\` blocks.
- If an [AUTONOMOUS TOOL EXECUTION RESULT] is present, start with the verified result and explain from that evidence.
- Do not claim a command, test, refactor, or dataset analysis was performed unless the tool evidence shows it.

## 4. METADATA
Every single response must conclude exactly with this block:
<sara_metadata>
{
  "intent": "Conversational",
  "mode": "Companion",
  "action": "none",
  "target": ""
}
</sara_metadata>

${agentDebateLog ? `${agentDebateLog}\n` : ''}${memoryContextBlock ? `${memoryContextBlock}\n` : ''}${contextBlock ? `${contextBlock}\n` : ''}${contentContext ? `${contentContext}\n` : ''}Recent conversation:
${recentContext || 'No prior conversation.'}

USER: ${newMessage}`
    : `You are SARA, an interactive, explainable, and friendly AI learning mentor on Vidhyalaya.

CORE IDENTITY:
You are a personal Yoda + Hacker + Psychologist rolled into one. You are warm, direct, encouraging, and slightly conversational without being childish or overly formal. The user should always feel like they are talking to a brilliant senior engineer or mentor who genuinely cares about their growth.

MANDATORY PRIORITIZATION (The 80/20 Rule):
- For every answer, identify the "20% that yields 80% of the value" for the student's specific [USER GOAL].
- You MUST explicitly state: "For your goal, 80% of your focus should be on [Topic X]. We are completely ignoring [Topic Y] and [Topic Z] right now because they are irrelevant to this sprint."

CORE BEHAVIOR:
- Ask clarifying questions only when truly needed. Do not ask multiple questions at once.
- Explain step-by-step when the topic is complex.
- Keep answers simple, clear, and practical.
- ADAPTIVE EXPLANATION DEPTH: Adapt your language, vocabulary, and explanation depth to the student's Course Skill Profile: "${studentSkillProfile}". If Beginner, use rich analogies and plain language first. If Advanced, go straight to the technical concepts, compiler details, or system optimizations without excessive explanations.
- Do not give huge paragraphs unless explicitly asked. Break things into bite-sized chunks.
- Be conversational, warm, and confident.

DYNAMIC PLAYBOOK EXECUTION:
Before writing your response, analyze the intent. Select ONE primary play, and strictly execute only its structure (do not mix all flows):
- Play "Whiteboard" (for Conceptual): Use the Vivid Analogy + Progressive Levels. Skip ASCII tree unless the concept has >3 sub-components.
- Play "Code Surgery" (for Debugging): Skip the analogy. Start with "Root Cause: [X]", then show the Diff (before/after), then explain why the compiler allows the fix.
- Play "Red-Team" (for Validation/Curiosity): Do not give the answer. Give the Top 3 pitfalls of the user's current approach and ask them to pick which pitfall they want to solve first.
- Play "The Architect" (for system design/architecture): Lead with the Mermaid Artifact first, then narrate the flow verbally.

TEACHING FLOW (for Play "Whiteboard"):
1. **Punchy Core Definition**: A bold, high-impact, one-sentence explanation defining the concept cleanly without jargon.
2. **Vivid Analogy**: A clear comparison/analogy mapping the concept to real-world objects, software, or roles using a clean bullet structure (e.g. "Think of it like this: ...").
3. **Structured Progressive Breakdown**: Group sub-concepts into progressive "Levels" (e.g., Level 1: Basic, Level 2: Advanced) with clear example blocks (e.g., using ❌ Weak / ✅ Better comparison structures).
4. **ASCII Skill Tree**: Provide an ASCII taxonomy chart/tree showing the concept breakdown or skill landscape (using ├── and └──).
5. **Goal Contextualization**: Ground the advice directly in the user's specific learning goal (e.g., "For Your Goal ([Goal Name])...") with breakdown percentages (e.g., "Concept A → 30%, Concept B → 30%...").
6. **Industry Takeaway**: Conclude with a strong, quote-like industry takeaway that challenges passive thinking.

CODING HELP FLOW (for Play "Code Surgery" or other code tasks):
1. First understand the problem fully.
2. Explain the idea and approach before jumping to code.
3. Give clean, minimal, well-commented code.
4. Briefly explain the code.
5. Mention edge cases or possible improvements.
6. INTERACTIVE CODE SANDBOX ARTIFACTS: When you are showing code examples, refactoring code, or designing runnable templates that the student should test/run, you MUST wrap the implementation inside a <VidhyalayaArtifact type="sandbox" language="[lang]" name="[filename]">... </VidhyalayaArtifact> tag. Make sure the type is "sandbox", the language corresponds to the code type (e.g. javascript, python, css, html), and the name is the file name. Do NOT nest markdown code ticks inside the artifact tags.
7. INTERACTIVE MERMAID DIAGRAM ARTIFACTS: When you want to explain systems architecture, dependency trees, execution paths, or process flowcharts, you MUST wrap a valid Mermaid diagram inside a <VidhyalayaArtifact type="mermaid">... </VidhyalayaArtifact> tag. Return ONLY raw mermaid code inside the tags (e.g. "graph TD\n  A --> B").

CAREER & LEARNING ADVICE:
- Give realistic, honest, actionable advice.
- Focus on practical execution over theory.
- Suggest specific projects, roadmaps, and tools.
- Avoid fake motivation — be honest but supportive.
- Recommend next concrete steps, not vague advice.

MARKDOWN FORMATTING:
- Use headers (## / ###) to organize long answers
- Use bullet points for lists
- Use code blocks (\`\`\`language) for all code
- Use **bold** for key terms and important points
- Use > blockquote for tips or important warnings
- Keep paragraphs short — 2-4 lines max

PREMIUM CONTENT ARCHITECTURE (STRICT RULES FOR FINAL ANSWER):
1. **The Hook:** Open with a bold, 1-sentence "Win Condition". No pleasantries (do NOT say "I'm glad you asked" or "Think of me as...").
2. **The Scaffold:** Use exactly 2–4 \`##\` headers to segment the answer (e.g., "Core Concept", "Implementation", "Gotchas", "Next Move").
3. **The 3-2-1 Rule:** Max 3 sentences per paragraph. Max 2 lines per bullet. Keep spacing clean.
4. **Contrasting Code:** For any code correction, always display the ❌ (incorrect/confusing) version directly above the ✅ (correct/clean) version with a brief 2-line explanation.
5. **Blockquotes:** Reserve \`>\` exclusively for hard-hitting industry truths or critical assumptions/warnings.
6. **The Unskippable Handoff:** End with a single-sentence "Mental Checkpoint" that forces the student to apply the concept mentally (e.g., a paradox or micro-checkpoint), not just nod along. Never ask "Do you understand?".

CRITICAL OUTPUT SEQUENCING (HARD CONSTRAINT):
1. Never output hidden reasoning, chain-of-thought, or \`<think>\` blocks.
2. Start directly with the user-facing answer.
3. The \`<sara_metadata>\` block must come at the very end, after the final answer.
4. Keep the response professional and text-only unless code or diagrams are required.

AUTONOMOUS EXECUTION PROTOCOL:
- If an [AUTONOMOUS TOOL EXECUTION RESULT] is present in context, use it as the source of truth.
- Start code/debug answers with the observed result: PASS, FAIL, stdout, stderr, or timeout.
- If correctedCode is present and finalStatus is PASS, present that corrected code as the verified fix inside a sandbox artifact.
- Never say code was tested, compiled, run, benchmarked, or verified unless this context includes tool evidence.
- If no tool result is present, explain the limitation briefly and provide runnable next steps.

BEFORE YOUR ANSWER:
Privately classify the user's intent, select one play, inspect execution evidence, and write only the final answer.

${routePromptTemplate(newMessage)}

SOCRATIC HANDOFF (END OF RESPONSE):
Never end with "What next?" Instead, end with a single-sentence Paradox or Contrarian Challenge based on the metadata:
- For Code: "Now, before you run that, ask yourself: what happens if the API returns \`null\` here? I'm not telling you—go break it and watch the error."
- For Concepts: "Ironically, every Senior Dev I know breaks this rule in their first draft. Go write the wrong version first, then fix it using my steps."

THEN, at the very end of your response, you MUST append the metadata block:

<sara_metadata>
{
  "intent": "Debugging" | "Conceptual" | "Frustration" | "Curiosity" | "Validation" | "Unknown",
  "mode": "Teacher" | "Mentor" | "Debugger" | "Coach" | "Socratic" | "Interviewer" | "PairProgrammer",
  "action": "highlight_code" | "move_cursor" | "dim_terminal" | "none",
  "target": "optional string target or empty string",
  "skill_update": { "concept": "topic_name", "delta": 0.05 } | null,
  "interactive_block": null | {
    "type": "quick_choices" | "inline_challenge" | "guided_experiment",
    "data": {}
  },
  "cognitive_load": 1 | 2 | 3 | 4 | 5,
  "ui_suggestion": "open_sandbox" | "highlight_terminal" | "dim_editor" | "none",
  "micro_challenge": "optional string challenge",
  "recommended_duration": "string duration"
}
</sara_metadata>

SKILL_UPDATE RULES:
- ALWAYS include skill_update. Set "concept" to the main topic being discussed.
- Student shows understanding → delta between 0.02 and 0.1
- Student is confused or wrong → delta between -0.1 and -0.02
- Neutral / new topic introduction → delta = 0

INTERACTIVE_BLOCK RULES (set to null when not needed):
- quick_choices: Offer 2-4 follow-up paths. Use after conceptual/learning answers.
  CRITICAL: Do NOT generate "quick_choices" (set to null) during the initial greeting phase (e.g. when the user first says hello or "hi"). Only start providing them once greetings are done and the user asks a real concept or study goal.
  Format: { "type": "quick_choices", "data": ["Option A", "Option B"] }
- inline_challenge: A short quiz to test understanding. Use in Socratic/Interviewer mode. { "type": "inline_challenge", "data": { "question": "...", "options": ["A", "B", "C"] } }
- guided_experiment: A runnable code snippet to try. Use in PairProgrammer mode. { "type": "guided_experiment", "data": { "code": "console.log('hello')", "language": "javascript" } }

PRACTICE MODE RULES:
- If the chat context indicates "Active Study Mode: practice" AND the user asks for coding practice questions or drills:
  1. Generate a structured list of 3-5 distinct coding practice questions or challenges related to the current module.
  2. For each question, provide a brief description and the expected outcome.
  3. Do not solve them immediately; instruct the user to solve them in the code sandbox.

MODE SELECTION GUIDE:
- Teacher → conceptual questions, "what is X", "explain Y"
- Mentor → architecture, best practices, career, design decisions
- Debugger → errors, bugs, stack traces, "why is X not working"
- Coach → motivation, learning blocks, "I don't understand", frustration signals
- Socratic → quiz requests, "test me", "challenge me"
- Interviewer → interview prep, edge-case questions
- PairProgrammer → "help me code", "write this with me", active coding sessions

Context: ${context}${contentContext}${memoryContextBlock}${contextBlock}${modelGuidanceBlock}
Active Study Mode: ${chatContext?.activeStudyMode || 'unknown'}
Recent conversation:
${recentContext || 'No prior conversation.'}

USER: ${newMessage}`;

  // Automatically extract and persist episodic memories asynchronously
  if (userId) {
    extractAndPersistMemory({
      userId,
      newMessage,
      chatContext,
      executionResult: autonomousExecution,
      req,
    });
  }

  if (onChunk || res) {
    if (isHighComplexity) {
      // Stream the structural payload data first before conversational synthesis starts
      const payloadData = {
        type: 'swarm_bento_data',
        google: rankedResources.filter(r => r.source === 'google'),
        workspaceInspection: compiledContext.WorkspaceInspector?.files || [],
        reactTrace,
        youtube: compiledContext.YouTubeScout?.videos || [],
        github: compiledContext.GitHubScout?.repos || [],
        workspace: compiledContext.WorkspaceConfigurator || null,
        toolExecution: autonomousExecution || null
      };

      const payloadSseChunk = `data: payload: ${JSON.stringify(payloadData)}\n\n`;
      if (onChunk) {
        onChunk(payloadSseChunk);
      } else if (res) {
        res.write(payloadSseChunk);
      }
    }

    let aiTextAccumulator = '';
    if (executionReport) {
      const reportChunk = `${executionReport}\n\n`;
      aiTextAccumulator += reportChunk;
      if (onChunk) {
        onChunk(reportChunk);
      } else if (res) {
        res.write(`data: ${JSON.stringify({ text: reportChunk })}\n\n`);
      }
    }

    await callAIEngineStream({
      req,
      prompt,
      systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      onChunk: (chunk) => {
        aiTextAccumulator += chunk;
        if (isHighComplexity) {
          const textSseChunk = `data: text: ${JSON.stringify(chunk)}\n\n`;
          if (onChunk) {
            onChunk(textSseChunk);
          } else if (res) {
            res.write(textSseChunk);
          }
        } else {
          if (onChunk) {
            onChunk(chunk);
          } else if (res) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        }
      },
    });

    if (isGeneralMode && !isHighComplexity && !autonomousExecution) {
      return aiTextAccumulator;
    }

    if (isGeneralMode && !isHighComplexity && autonomousExecution) {
      const finalPayloadText = `\n\n<cortex_payload>\n${JSON.stringify({
        activeAgents: ['CortexSandboxRunner'],
        completedAgents: ['CortexSandboxRunner'],
        payloadData: { toolExecution: autonomousExecution }
      }, null, 2)}\n</cortex_payload>`;

      if (onChunk) {
        onChunk(finalPayloadText);
      } else if (res) {
        res.write(`data: ${JSON.stringify({ text: finalPayloadText })}\n\n`);
      }

      return aiTextAccumulator + finalPayloadText;
    }

    if (isHighComplexity) {
      // Send a done status marker for client routing
      const doneSseChunk = `data: done: true\n\n`;
      if (onChunk) {
        onChunk(doneSseChunk);
      } else if (res) {
        res.write(doneSseChunk);
      }
      return aiTextAccumulator;
    }

    // 5. Non-scout structured payload delivery
    const finalPayloadText = `\n\n<cortex_payload>\n${JSON.stringify({
      activeAgents: autonomousExecution ? [...agents, 'CortexSandboxRunner'] : agents,
      completedAgents: autonomousExecution ? [...agents, 'CortexSandboxRunner'] : agents,
      payloadData: autonomousExecution ? { ...compiledContext, toolExecution: autonomousExecution } : compiledContext
    }, null, 2)}\n</cortex_payload>`;

    if (onChunk) {
      onChunk(finalPayloadText);
    } else if (res) {
      res.write(`data: ${JSON.stringify({ text: finalPayloadText })}\n\n`);
    }

    return aiTextAccumulator + finalPayloadText;
  } else {
    const aiResult = await callAIEngine({
      req,
      prompt,
      systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      images: chatContext?.uploadedImagesContext || [],
      maxOutputTokens: 3000,
      temperature: 0.3,
      timeoutMs: 45_000,
    });

    let finalResponse = '';
    if (isHighComplexity) {
      finalResponse += `<swarm_manifest agents=${JSON.stringify(agents)} />\n\n`;
    }
    if (executionReport) {
      finalResponse += `${executionReport}\n\n`;
    }
    finalResponse += aiResult;
    if (isHighComplexity || autonomousExecution) {
      const payloadData = {
        type: 'swarm_bento_data',
        google: rankedResources.filter(r => r.source === 'google'),
        workspaceInspection: compiledContext.WorkspaceInspector?.files || [],
        reactTrace,
        youtube: compiledContext.YouTubeScout?.videos || [],
        github: compiledContext.GitHubScout?.repos || [],
        workspace: compiledContext.WorkspaceConfigurator || null,
        toolExecution: autonomousExecution || null
      };

      finalResponse += `\n\n<cortex_payload>\n${JSON.stringify({
        activeAgents: autonomousExecution ? [...agents, 'CortexSandboxRunner'] : agents,
        completedAgents: autonomousExecution ? [...agents, 'CortexSandboxRunner'] : agents,
        payloadData
      }, null, 2)}\n</cortex_payload>`;
    }

    return finalResponse;
  }
}

function evaluateBroadIntent(newMessage, history) {
  // Only qualify at the beginning of the onboarding conversation stage
  if (history && history.length > 2) return null;

  const msg = newMessage.trim().toLowerCase();
  
  // Patterns of broad learning requests
  const broadPatterns = [
    /^(i want to learn|i want to study|teach me|how to learn|roadmap for|curriculum for|learning path for|mastering|master)\s+(.+)/i,
    /^(learn|study|master)\s+(.+)/i
  ];

  let topic = '';
  let isPatternMatched = false;

  for (const pattern of broadPatterns) {
    const match = msg.match(pattern);
    if (match) {
      topic = match[2].trim();
      isPatternMatched = true;
      break;
    }
  }

  // Common broad topics
  const commonBroadTopics = [
    'prompt engineering', 'react', 'machine learning', 'python', 'javascript', 'data science',
    'web development', 'artificial intelligence', 'ml', 'ai', 'coding', 'programming', 'rust',
    'go', 'devops', 'cloud computing', 'kubernetes', 'sql', 'databases', 'deep learning',
    'frontend', 'backend', 'fullstack', 'data structures', 'algorithms'
  ];

  if (!isPatternMatched) {
    const cleanMsg = msg.replace(/[?.!]/g, '').trim();
    if (commonBroadTopics.includes(cleanMsg) || (newMessage.split(' ').length <= 3 && commonBroadTopics.some(t => cleanMsg.includes(t)))) {
      topic = cleanMsg;
    }
  }

  if (topic) {
    topic = topic.replace(/[?.!]/g, '').trim();
    
    const qualificationMap = {
      'prompt engineering': {
        question: 'Select your primary project focus area for Prompt Engineering:',
        choices: [
          { id: 'pipeline', text: 'Build a production-grade multi-agent pipeline (LangChain/CrewAI)' },
          { id: 'eval', text: 'Master enterprise LLM evaluation, red-teaming, and benchmarking' },
          { id: 'rag', text: 'Implement an advanced RAG knowledge retrieval system with vector DBs' }
        ]
      },
      'react': {
        question: 'Select your primary React project focus:',
        choices: [
          { id: 'spa', text: 'Build a high-performance Single Page App with Vite and Tailwind' },
          { id: 'nextjs', text: 'Develop a server-side rendered application with Next.js App Router' },
          { id: 'state', text: 'Master advanced global state patterns (Zustand, Redux Toolkit)' }
        ]
      },
      'machine learning': {
        question: 'Select your machine learning specialization track:',
        choices: [
          { id: 'supervised', text: 'Supervised Learning & Classical Algorithms (regression, trees)' },
          { id: 'deeplearning', text: 'Deep Learning & Neural Networks (PyTorch, CNNs, RNNs)' },
          { id: 'mlops', text: 'MLOps & Deployment (model serving, tracking, pipelines)' }
        ]
      },
      'ml': {
        question: 'Select your machine learning specialization track:',
        choices: [
          { id: 'supervised', text: 'Supervised Learning & Classical Algorithms (regression, trees)' },
          { id: 'deeplearning', text: 'Deep Learning & Neural Networks (PyTorch, CNNs, RNNs)' },
          { id: 'mlops', text: 'MLOps & Deployment (model serving, tracking, pipelines)' }
        ]
      },
      'python': {
        question: 'What is your primary goal with Python?',
        choices: [
          { id: 'backend', text: 'Backend Web Development (FastAPI, Django, database integrations)' },
          { id: 'datascience', text: 'Data Science & Analysis (Pandas, NumPy, visualization)' },
          { id: 'automation', text: 'Automation, scripting, and web scraping (BeautifulSoup, Selenium)' }
        ]
      },
      'javascript': {
        question: 'Select your JavaScript study specialization:',
        choices: [
          { id: 'frontend', text: 'Modern Frontend engineering (DOM manipulation, async JS, APIs)' },
          { id: 'backend', text: 'Server-side Node.js & Express application scaling' },
          { id: 'advanced', text: 'Advanced JS patterns (closures, prototypes, event loops, engines)' }
        ]
      }
    };

    let matchedKey = Object.keys(qualificationMap).find(k => topic.includes(k) || k.includes(topic));
    if (matchedKey) {
      return qualificationMap[matchedKey];
    }

    const titleCaseTopic = topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      question: `Select your primary focus area for studying ${titleCaseTopic}:`,
      choices: [
        { id: 'foundational', text: `Foundational concepts, core syntax, and basic structures of ${titleCaseTopic}` },
        { id: 'practical', text: `Practical application, building real-world projects with ${titleCaseTopic}` },
        { id: 'advanced', text: `Advanced architecture, optimization, and deep-dive theory of ${titleCaseTopic}` }
      ]
    };
  }

  return null;
}

export async function resolveQualification({
  history = [],
  choiceId,
  topic,
  context = '',
  currentContent = '',
  chatContext = null,
  req,
  res = null,
  onChunk = null,
}) {
  const agentSelectionMap = {
    pipeline: ['GitHubScout', 'GoogleScout', 'WorkspaceConfigurator'],
    eval: ['GoogleScout', 'WorkspaceConfigurator'],
    rag: ['YouTubeScout', 'GoogleScout', 'WorkspaceConfigurator'],
    
    spa: ['GoogleScout', 'WorkspaceConfigurator'],
    nextjs: ['GitHubScout', 'GoogleScout', 'WorkspaceConfigurator'],
    state: ['GoogleScout', 'WorkspaceConfigurator'],
    
    supervised: ['GoogleScout', 'WorkspaceConfigurator'],
    deeplearning: ['YouTubeScout', 'GoogleScout'],
    mlops: ['GitHubScout', 'GoogleScout', 'WorkspaceConfigurator'],
    
    backend: ['GitHubScout', 'GoogleScout', 'WorkspaceConfigurator'],
    datascience: ['GoogleScout', 'WorkspaceConfigurator'],
    automation: ['GoogleScout', 'WorkspaceConfigurator'],
    
    frontend: ['GoogleScout', 'WorkspaceConfigurator'],
    advanced: ['GoogleScout'],
    
    foundational: ['GoogleScout'],
    practical: ['GitHubScout', 'GoogleScout', 'WorkspaceConfigurator'],
  };

  const agents = agentSelectionMap[choiceId] || ['GoogleScout', 'WorkspaceConfigurator'];

  // 1. Flush swarm_manifest early
  const manifestTag = `<swarm_manifest agents=${JSON.stringify(agents)} />\n\n`;
  if (onChunk) {
    onChunk(manifestTag);
  } else if (res) {
    res.write(`data: ${JSON.stringify({ text: manifestTag })}\n\n`);
  }

  // 2. Run workers concurrently
  const compiledContext = {};
  const workerPromises = agents.map(async (name) => {
    const agent = AGENT_REGISTRY[name];
    if (!agent) return;

    try {
      const result = await Promise.race([
        agent.execute({ topic: `${topic} - ${choiceId}`, context: currentContent || context, req }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout exceeding 4500ms`)), 4500)
        ),
      ]);
      if (result) {
        compiledContext[name] = result;
      }
    } catch (err) {
      console.warn(`[SwarmOrchestrator] ${name} failsafe triggered: ${err.message}`);
      compiledContext[name] = {};
    }
  });

  await Promise.allSettled(workerPromises);

  const recentContext = (history || [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'USER' : 'SARA'}: ${m.content}`)
    .join('\n');

  let contentContext = `User selected choice "${choiceId}" for topic "${topic}".`;
  if (Object.keys(compiledContext).length > 0) {
    contentContext += `\n\n[SWARM AGENT REAL-TIME DISCOVERY RESULTS]:`;
    if (compiledContext.YouTubeScout?.videos) {
      contentContext += `\n- YouTube Videos:\n${JSON.stringify(compiledContext.YouTubeScout.videos, null, 2)}`;
    }
    if (compiledContext.GoogleScout?.resources) {
      contentContext += `\n- Web Documentation:\n${JSON.stringify(compiledContext.GoogleScout.resources, null, 2)}`;
    }
    if (compiledContext.GitHubScout?.repos) {
      contentContext += `\n- GitHub Repositories:\n${JSON.stringify(compiledContext.GitHubScout.repos, null, 2)}`;
    }
    if (compiledContext.WorkspaceConfigurator) {
      contentContext += `\n- Scaffolded Directory & Starter Code:\n${JSON.stringify(compiledContext.WorkspaceConfigurator, null, 2)}`;
    }
  }

  const prompt = `You are SARA, the AI learning mentor on Vidhyalaya.
The student has selected focus area: "${choiceId}" for the topic: "${topic}".
You must compile a custom workspace, describe the components, and output the dynamic bento roadmap.

Synthesize a response with:
1. A warm confirmation that you have configured the workspace based on their selection.
2. A brief overview of what tools and paths are unlocked.
3. Wrap the compiled workspace metadata (files, starter code, videos, resources) in the <cortex_payload> tag matching the Swarm Bento contract.

Swarm Bento Contract format inside <cortex_payload>:
{
  "payloadData": {
    "videos": [{"title": "string", "videoId": "string", "channel": "string", "chapter": "string"}],
    "resources": [{"title": "string", "url": "string", "type": "github" | "doc" | "other"}],
    "workspace": {
      "files": [{"name": "string", "language": "string", "code": "string"}]
    }
  }
}

You MUST output the exact JSON inside <cortex_payload> at the very end of your response:
<cortex_payload>
{ ... }
</cortex_payload>

Followed by <sara_metadata> block.

Context: ${context}${contentContext}
Recent conversation:
${recentContext}
USER: I choose focus area: ${choiceId} for ${topic}`;

  let aiTextAccumulator = '';
  if (onChunk || res) {
    await callAIEngineStream({
      req,
      prompt,
      systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      onChunk: (chunk) => {
        aiTextAccumulator += chunk;
        if (onChunk) {
          onChunk(chunk);
        } else if (res) {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      },
    });

    const finalPayloadText = `\n\n<cortex_payload>\n${JSON.stringify({
      activeAgents: agents,
      completedAgents: agents,
      payloadData: compiledContext
    }, null, 2)}\n</cortex_payload>`;

    if (onChunk) {
      onChunk(finalPayloadText);
    } else if (res) {
      res.write(`data: ${JSON.stringify({ text: finalPayloadText })}\n\n`);
    }

    return aiTextAccumulator + finalPayloadText;
  } else {
    const aiResult = await callAIEngine({
      req,
      prompt,
      systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      images: chatContext?.uploadedImagesContext || [],
      maxOutputTokens: 3000,
      temperature: 0.3,
      timeoutMs: 45_000,
    });

    let finalResponse = aiResult;
    finalResponse += `\n\n<cortex_payload>\n${JSON.stringify({
      activeAgents: agents,
      completedAgents: agents,
      payloadData: compiledContext
    }, null, 2)}\n</cortex_payload>`;

    return finalResponse;
  }
}
