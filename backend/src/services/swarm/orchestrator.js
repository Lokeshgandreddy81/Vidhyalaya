/**
 * Swarm Orchestrator — DAG-based parallel execution engine with SSE multiplexed streaming.
 *
 * Runs workers within a Directed Acyclic Graph (DAG) state machine,
 * enforces individual timeouts and functional context isolation using AbortControllers,
 * semantic-reranks output candidates, and streams progress in real time.
 */

import { executeYouTubeScout } from './workers/YouTubeScout.js';
import { executeGoogleScout } from './workers/GoogleScout.js';
import { executeGitHubScout } from './workers/GitHubScout.js';
import { executeWorkspaceConfigurator } from './workers/WorkspaceConfigurator.js';
import { executeWorkspaceInspector } from './workers/WorkspaceInspector.js';
import { callAIEngine } from '../../utils/aiClientRouter.js';

export const AGENT_REGISTRY = {
  YouTubeScout: { execute: executeYouTubeScout, timeoutMs: 5000 },
  GoogleScout: { execute: executeGoogleScout, timeoutMs: 5000 },
  GitHubScout: { execute: executeGitHubScout, timeoutMs: 5000 },
  WorkspaceConfigurator: { execute: executeWorkspaceConfigurator, timeoutMs: 6000 },
  WorkspaceInspector: { execute: executeWorkspaceInspector, timeoutMs: 4500 },
};

const REACT_MAX_STEPS = 5;

/**
 * Send an SSE event to the response stream.
 * @param {import('express').Response} res
 * @param {Record<string, unknown>} payload
 */
function sendSSE(res, payload) {
  if (!res || res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if (res.flush) res.flush();
}

/**
 * NormalizedResource interface mapping.
 */
export async function rankAndNormalize(query, workerResults, req) {
  const normalized = [];

  if (workerResults.GoogleScout?.resources) {
    for (const r of workerResults.GoogleScout.resources) {
      normalized.push({
        id: `google-${r.url}`,
        source: 'google',
        title: r.title || 'Documentation Link',
        url: r.url,
        snippet: r.snippet || '',
        chunks: r.chunks || []
      });
    }
  }

  if (workerResults.YouTubeScout?.videos) {
    for (const v of workerResults.YouTubeScout.videos) {
      normalized.push({
        id: `youtube-${v.id}`,
        source: 'youtube',
        title: v.title || 'Educational Video',
        url: `https://youtube.com/watch?v=${v.id}`,
        snippet: `YouTube Video from channel: ${v.channel}`
      });
    }
  }

  if (workerResults.GitHubScout?.repos) {
    for (const r of workerResults.GitHubScout.repos) {
      normalized.push({
        id: `github-${r.name}`,
        source: 'github',
        title: r.name,
        url: r.url,
        snippet: `${r.description || ''} (${r.language || ''}, ${r.stars || 0} stars)`
      });
    }
  }

  if (workerResults.WorkspaceInspector?.files) {
    for (const f of workerResults.WorkspaceInspector.files) {
      normalized.push({
        id: `workspace-${f.path}`,
        source: 'workspace',
        title: f.path,
        url: `workspace://${f.path}`,
        snippet: f.snippet || '',
        score: Math.min(1, Number(f.score || 1) / 6),
      });
    }
  }

  if (normalized.length === 0) return [];

  // Lexical TF-IDF score calculation
  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  for (const item of normalized) {
    let matches = 0;
    const content = `${item.title} ${item.snippet}`.toLowerCase();
    for (const token of queryTokens) {
      if (content.includes(token)) matches++;
    }
    item.lexicalScore = matches / (queryTokens.length || 1);
  }

  // Gemini Cross-Encoder Scoring (Semantic Rerank)
  try {
    const listToScore = normalized.map((r, idx) => ({ index: idx, title: r.title, snippet: r.snippet }));
    const systemInstruction = `You are an elite semantic cross-encoder. Rate the relevance of each resource snippet to the query on a scale from 0.00 to 1.00. Return ONLY a valid JSON array of objects with "index" and "score" fields: [{"index": 0, "score": 0.9}]. No markdown or other words.`;
    const prompt = `Query: "${query}"\nCandidates:\n${JSON.stringify(listToScore)}`;

    const rankRes = await callAIEngine({
      req,
      prompt,
      systemInstruction,
      temperature: 0.1,
      maxOutputTokens: 600,
      timeoutMs: 2500
    });

    const cleanJson = rankRes.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const scores = JSON.parse(cleanJson);

    if (Array.isArray(scores)) {
      for (const s of scores) {
        if (normalized[s.index]) {
          normalized[s.index].score = Number(s.score);
        }
      }
    }
  } catch (err) {
    console.warn(`[SwarmOrchestrator] Rerank fallback used: ${err.message}`);
    for (const item of normalized) {
      item.score = item.lexicalScore;
    }
  }

  // Token Budget filter (keep score >= 0.4) and sort
  return normalized
    .map(item => ({
      ...item,
      score: item.score !== undefined ? item.score : item.lexicalScore
    }))
    .filter(item => item.score >= 0.4)
    .sort((a, b) => b.score - a.score);
}

export function summarizeToolResult(agent, result = {}) {
  if (agent === 'GoogleScout') {
    const resources = Array.isArray(result.resources) ? result.resources : [];
    const chunkCount = resources.reduce((sum, item) => sum + (Array.isArray(item.chunks) ? item.chunks.length : 0), 0);
    return {
      agent,
      count: resources.length,
      quality: resources.length > 0 && chunkCount > 0 ? 'useful' : resources.length > 0 ? 'thin' : 'empty',
      sample: resources.slice(0, 2).map((item) => item.title || item.url).filter(Boolean),
    };
  }

  if (agent === 'GitHubScout') {
    const repos = Array.isArray(result.repos) ? result.repos : [];
    return {
      agent,
      count: repos.length,
      quality: repos.length > 0 ? 'useful' : 'empty',
      sample: repos.slice(0, 2).map((item) => item.name).filter(Boolean),
    };
  }

  if (agent === 'YouTubeScout') {
    const videos = Array.isArray(result.videos) ? result.videos : [];
    return {
      agent,
      count: videos.length,
      quality: videos.length > 0 ? 'useful' : 'empty',
      sample: videos.slice(0, 2).map((item) => item.title).filter(Boolean),
    };
  }

  if (agent === 'WorkspaceConfigurator') {
    const files = Array.isArray(result.files) ? result.files : [];
    return {
      agent,
      count: files.length,
      quality: result.structure || files.length > 0 ? 'useful' : 'empty',
      sample: files.slice(0, 2).map((item) => item.name).filter(Boolean),
    };
  }

  if (agent === 'WorkspaceInspector') {
    const files = Array.isArray(result.files) ? result.files : [];
    return {
      agent,
      count: files.length,
      quality: files.length > 0 ? 'useful' : result.disabled ? 'disabled' : 'empty',
      sample: files.slice(0, 3).map((item) => item.path).filter(Boolean),
    };
  }

  return { agent, count: 0, quality: 'empty', sample: [] };
}

function hasUsefulResult(results, agent) {
  return summarizeToolResult(agent, results[agent]).quality === 'useful';
}

function wantsLocalInspection(topic) {
  return /\b(local|codebase|file|route|component|service|middleware|model|schema|bug|refactor|inspect|read|where|implementation|source)\b/i.test(topic);
}

function wantsDocs(topic) {
  return /\b(docs?|documentation|official|api|spec|reference|best\s*practice|guide|how\s+to|explain|compare|research)\b/i.test(topic);
}

function wantsRepoSearch(topic) {
  return /\b(github|repo|repository|starter|boilerplate|template|package|library|framework|example|open\s*source)\b/i.test(topic);
}

function wantsVideo(topic) {
  return /\b(video|youtube|tutorial|walkthrough|lecture|watch|visual)\b/i.test(topic);
}

function wantsWorkspaceBuild(topic) {
  return /\b(scaffold|structure|starter|boilerplate|setup|create|build|project|files?|folder|template)\b/i.test(topic);
}

function observationsFromResults(results) {
  return Object.entries(results).map(([agent, result]) => summarizeToolResult(agent, result));
}

export function decideNextReActStep({ topic, results = {}, executedAgents = [], initialAgents = [], step = 0 }) {
  const executed = new Set(executedAgents);

  if (step === 0) {
    if (wantsLocalInspection(topic) && !executed.has('WorkspaceInspector')) {
      return { action: 'WorkspaceInspector', reason: 'The prompt references implementation or local project context.' };
    }
    const firstInitial = initialAgents.find((agent) => AGENT_REGISTRY[agent] && !executed.has(agent));
    if (firstInitial) {
      return { action: firstInitial, reason: `Initial intent classifier selected ${firstInitial}.` };
    }
    if (wantsRepoSearch(topic)) return { action: 'GitHubScout', reason: 'The prompt asks for repositories, templates, or examples.' };
    if (wantsVideo(topic)) return { action: 'YouTubeScout', reason: 'The prompt asks for video learning material.' };
    return { action: 'GoogleScout', reason: 'Default first step is authoritative documentation search.' };
  }

  if (executed.has('WorkspaceInspector') && !hasUsefulResult(results, 'WorkspaceInspector')) {
    if (!executed.has('GoogleScout')) {
      return { action: 'GoogleScout', reason: 'Local workspace inspection was empty; pivoting to docs.' };
    }
  }

  if (executed.has('GoogleScout') && !hasUsefulResult(results, 'GoogleScout')) {
    if (wantsRepoSearch(topic) && !executed.has('GitHubScout')) {
      return { action: 'GitHubScout', reason: 'Docs were empty; pivoting to repositories/examples.' };
    }
    if (wantsVideo(topic) && !executed.has('YouTubeScout')) {
      return { action: 'YouTubeScout', reason: 'Docs were empty; pivoting to video resources.' };
    }
    if (!executed.has('GitHubScout')) {
      return { action: 'GitHubScout', reason: 'Docs were thin; checking implementation examples.' };
    }
  }

  if (executed.has('GitHubScout') && !hasUsefulResult(results, 'GitHubScout') && !executed.has('GoogleScout')) {
    return { action: 'GoogleScout', reason: 'Repository search was empty; pivoting to documentation.' };
  }

  if (executed.has('YouTubeScout') && !hasUsefulResult(results, 'YouTubeScout') && !executed.has('GoogleScout')) {
    return { action: 'GoogleScout', reason: 'Video search was empty; pivoting to documentation.' };
  }

  if (wantsWorkspaceBuild(topic) && !executed.has('WorkspaceConfigurator')) {
    const hasGrounding =
      hasUsefulResult(results, 'GoogleScout') ||
      hasUsefulResult(results, 'GitHubScout') ||
      hasUsefulResult(results, 'WorkspaceInspector');
    if (hasGrounding || executed.size >= 2) {
      return { action: 'WorkspaceConfigurator', reason: 'Enough grounding exists to generate a workspace scaffold.' };
    }
  }

  if (wantsDocs(topic) && !executed.has('GoogleScout')) {
    return { action: 'GoogleScout', reason: 'Documentation is still needed for the answer.' };
  }

  if (wantsVideo(topic) && !executed.has('YouTubeScout')) {
    return { action: 'YouTubeScout', reason: 'Video resources are still needed for the answer.' };
  }

  if (wantsRepoSearch(topic) && !executed.has('GitHubScout')) {
    return { action: 'GitHubScout', reason: 'Repository examples are still needed for the answer.' };
  }

  return { action: 'stop', reason: 'Available observations are sufficient or no unused tool can improve the answer.' };
}

async function runAgentWithTimeout(agent, { topic, context, req }) {
  const reg = AGENT_REGISTRY[agent];
  if (!reg) throw new Error(`Unknown ReAct agent: ${agent}`);

  const controller = new AbortController();
  const timeoutPromise = new Promise((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve({ timedOut: true, result: null });
    }, reg.timeoutMs);
    if (timer.unref) timer.unref();
  });

  const runPromise = reg.execute({
    topic,
    context,
    req,
    abortSignal: controller.signal,
  }).then((result) => ({ timedOut: false, result }));

  const outcome = await Promise.race([runPromise, timeoutPromise]);
  if (outcome.timedOut) {
    throw new Error(`Execution exceeded timeout window of ${reg.timeoutMs}ms`);
  }
  return outcome.result;
}

function buildReactContext(context, results, trace) {
  const observations = observationsFromResults(results);
  return `${context || ''}\n\n[REACT OBSERVATIONS]\n${JSON.stringify({ observations, trace }, null, 2)}`;
}

/**
 * Execute tools using a bounded ReAct loop: decide, act, observe, then decide again.
 */
export async function executeReActSwarm({ agents = [], topic, context = '', req, res, maxSteps = REACT_MAX_STEPS }) {
  const results = {};
  const trace = [];
  const executedAgents = [];

  sendSSE(res, { type: 'swarm_manifest', mode: 'react', agents: [] });

  for (let step = 0; step < maxSteps; step++) {
    const decision = decideNextReActStep({
      topic,
      results,
      executedAgents,
      initialAgents: agents,
      step,
    });

    trace.push({
      step: step + 1,
      thought: decision.reason,
      action: decision.action,
    });

    sendSSE(res, {
      type: 'react_step',
      step: step + 1,
      action: decision.action,
      reason: decision.reason,
    });

    if (decision.action === 'stop') break;

    if (!AGENT_REGISTRY[decision.action] || executedAgents.includes(decision.action)) {
      trace[trace.length - 1].observation = 'Skipped duplicate or unknown action.';
      continue;
    }

    sendSSE(res, { type: 'agent_status', agent: decision.action, status: 'processing' });

    try {
      const result = await runAgentWithTimeout(decision.action, {
        topic,
        context: buildReactContext(context, results, trace),
        req,
      });
      results[decision.action] = result;
      executedAgents.push(decision.action);
      const summary = summarizeToolResult(decision.action, result);
      trace[trace.length - 1].observation = summary;
      sendSSE(res, {
        type: 'agent_status',
        agent: decision.action,
        status: 'done',
        result,
      });
    } catch (err) {
      results[decision.action] = { error: err.message };
      executedAgents.push(decision.action);
      trace[trace.length - 1].observation = { quality: 'error', error: err.message };
      sendSSE(res, {
        type: 'agent_status',
        agent: decision.action,
        status: 'error',
        error: err.message,
      });
    }
  }

  return {
    results,
    trace,
    executedAgents,
  };
}

/**
 * DAG Execution Engine.
 */
class SwarmDAGEngine {
  constructor(agentsList, topic, context, req) {
    this.topic = topic;
    this.context = context;
    this.req = req;
    this.results = {};
    this.states = {};
    this.errors = {};
    this.abortControllers = {};

    // Build the tasks dependency graph
    this.tasks = agentsList
      .filter(name => AGENT_REGISTRY[name])
      .map(name => {
        const reg = AGENT_REGISTRY[name];
        // WorkspaceConfigurator depends on search results from GoogleScout and GitHubScout
        const dependencies = name === 'WorkspaceConfigurator' 
          ? agentsList.filter(n => n === 'GoogleScout' || n === 'GitHubScout') 
          : [];
        return {
          id: name,
          dependencies,
          execute: reg.execute,
          timeoutMs: reg.timeoutMs
        };
      });

    for (const task of this.tasks) {
      this.states[task.id] = 'pending';
    }
  }

  async run(onStateChange) {
    const runningPromises = [];

    const executeTask = async (taskId) => {
      const task = this.tasks.find(t => t.id === taskId);
      this.states[taskId] = 'processing';
      onStateChange(taskId, 'processing');

      const controller = new AbortController();
      this.abortControllers[taskId] = controller;

      const timeoutPromise = new Promise((resolve) => {
        const timer = setTimeout(() => {
          controller.abort();
          resolve({ timedOut: true });
        }, task.timeoutMs);
        if (timer.unref) timer.unref();
      });

      try {
        const runPromise = task.execute({
          topic: this.topic,
          context: this.context,
          req: this.req,
          abortSignal: controller.signal
        }).then(res => ({ result: res, timedOut: false }));

        const { result, timedOut } = await Promise.race([runPromise, timeoutPromise]);

        if (timedOut) {
          throw new Error(`Execution exceeded timeout window of ${task.timeoutMs}ms`);
        }

        this.results[taskId] = result;
        this.states[taskId] = 'success';
        onStateChange(taskId, 'success', result);
      } catch (err) {
        console.warn(`[SwarmDAGEngine] Task ${taskId} failed: ${err.message}`);
        this.errors[taskId] = err.message;
        this.states[taskId] = 'failed';
        onStateChange(taskId, 'failed', null, err.message);
      }
    };

    while (true) {
      const readyTasks = this.tasks.filter(task => {
        if (this.states[task.id] !== 'pending') return false;
        return task.dependencies.every(depId => 
          this.states[depId] === 'success' || this.states[depId] === 'failed'
        );
      });

      if (readyTasks.length === 0) {
        const isAnyProcessing = Object.values(this.states).some(s => s === 'processing');
        if (isAnyProcessing) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        break; // Graph execution finished or blocked
      }

      const promises = readyTasks.map(task => executeTask(task.id));
      runningPromises.push(...promises);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await Promise.allSettled(runningPromises);
    return this.results;
  }
}

/**
 * Execute the swarm — resolve DAG, stream SSE updates, semantic-rank output.
 */
export async function executeSwarm({ agents, topic, context, req, res }) {
  const validAgents = agents.filter((name) => AGENT_REGISTRY[name]);
  if (validAgents.length === 0) return {};

  // 1. Stream swarm_manifest immediately
  const manifest = validAgents.map((name) => ({
    name,
    label: name === 'YouTubeScout' ? 'Scouting video resources...'
         : name === 'GoogleScout' ? 'Searching authoritative documentation...'
         : name === 'GitHubScout' ? 'Discovering relevant repositories...'
         : 'Generating project structure...',
  }));
  sendSSE(res, { type: 'swarm_manifest', agents: validAgents });

  // 2. Stream pending agent statuses
  for (const name of validAgents) {
    sendSSE(res, { type: 'agent_status', agent: name, status: 'pending' });
  }

  // 3. Initialize & run Swarm DAG execution engine
  const dagEngine = new SwarmDAGEngine(validAgents, topic, context, req);
  const workerResults = await dagEngine.run((agent, status, result, errorMsg) => {
    sendSSE(res, {
      type: 'agent_status',
      agent,
      status: status === 'success' ? 'done' : status === 'failed' ? 'error' : status,
      result: result || null,
      error: errorMsg || null
    });
  });

  return workerResults;
}
