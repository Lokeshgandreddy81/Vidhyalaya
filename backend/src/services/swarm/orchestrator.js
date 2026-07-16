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
import { callAIEngine } from '../../utils/aiClientRouter.js';

const AGENT_REGISTRY = {
  YouTubeScout: { execute: executeYouTubeScout, timeoutMs: 5000 },
  GoogleScout: { execute: executeGoogleScout, timeoutMs: 5000 },
  GitHubScout: { execute: executeGitHubScout, timeoutMs: 5000 },
  WorkspaceConfigurator: { execute: executeWorkspaceConfigurator, timeoutMs: 6000 },
};

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

