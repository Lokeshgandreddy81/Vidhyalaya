/**
 * Swarm Orchestrator — Parallel agent execution engine with SSE streaming.
 *
 * Spawns worker agents in parallel, enforces 4500ms timeout via Promise.race,
 * and streams agent_status events as workers start/complete.
 */

import { executeYouTubeScout } from './workers/YouTubeScout.js';
import { executeGoogleScout } from './workers/GoogleScout.js';
import { executeGitHubScout } from './workers/GitHubScout.js';
import { executeWorkspaceConfigurator } from './workers/WorkspaceConfigurator.js';

const WORKER_TIMEOUT_MS = 4500;

/** @type {Record<string, { label: string, execute: Function }>} */
const AGENT_REGISTRY = {
  YouTubeScout: {
    label: 'Scouting video resources...',
    execute: executeYouTubeScout,
  },
  GoogleScout: {
    label: 'Searching authoritative documentation...',
    execute: executeGoogleScout,
  },
  GitHubScout: {
    label: 'Discovering relevant repositories...',
    execute: executeGitHubScout,
  },
  WorkspaceConfigurator: {
    label: 'Generating project structure...',
    execute: executeWorkspaceConfigurator,
  },
};

/**
 * Send an SSE event to the response stream.
 * @param {import('express').Response} res
 * @param {Record<string, unknown>} payload
 */
function sendSSE(res, payload) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Wrap a worker execution with a timeout using Promise.race.
 * Workers that exceed WORKER_TIMEOUT_MS return an empty payload silently.
 *
 * @param {Function} executeFn - The worker execute function
 * @param {{ topic: string, context: string, req: import('express').Request }} params
 * @returns {Promise<{ result: Record<string, unknown> | null, error: boolean }>}
 */
async function runWithTimeout(executeFn, params) {
  const timeoutPromise = new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ result: null, error: false, timedOut: true });
    }, WORKER_TIMEOUT_MS);
    // Prevent timer from keeping the process alive
    if (timer.unref) timer.unref();
  });

  const workerPromise = executeFn(params)
    .then((result) => ({ result, error: false, timedOut: false }))
    .catch((err) => {
      console.warn(`[SwarmOrchestrator] Worker error: ${err.message}`);
      return { result: null, error: true, timedOut: false };
    });

  return Promise.race([workerPromise, timeoutPromise]);
}

/**
 * Execute the swarm — spawn workers, stream SSE events, compile context.
 *
 * @param {{
 *   agents: string[],
 *   topic: string,
 *   context: string,
 *   req: import('express').Request,
 *   res: import('express').Response
 * }} params
 * @returns {Promise<Record<string, unknown>>} Compiled context from all workers
 */
export async function executeSwarm({ agents, topic, context, req, res }) {
  // Filter to valid agents only
  const validAgents = agents.filter((name) => AGENT_REGISTRY[name]);

  if (validAgents.length === 0) {
    return {};
  }

  // 1. Stream swarm_manifest event immediately
  const manifest = validAgents.map((name) => ({
    name,
    label: AGENT_REGISTRY[name].label,
  }));

  sendSSE(res, { type: 'swarm_manifest', agents: manifest });

  // 2. Stream agent_status 'active' for all agents
  for (const name of validAgents) {
    sendSSE(res, { type: 'agent_status', agent: name, status: 'active' });
  }

  // 3. Execute all workers in parallel with timeout
  const workerEntries = validAgents.map((name) => ({
    name,
    promise: runWithTimeout(AGENT_REGISTRY[name].execute, { topic, context, req }),
  }));

  const settled = await Promise.allSettled(
    workerEntries.map((entry) => entry.promise)
  );

  // 4. Stream agent_status for each completed worker and compile results
  const compiledContext = {};

  for (let i = 0; i < workerEntries.length; i++) {
    const { name } = workerEntries[i];
    const settlement = settled[i];

    if (settlement.status === 'fulfilled') {
      const { result, error, timedOut } = settlement.value;

      if (timedOut) {
        console.warn(`[SwarmOrchestrator] ${name} timed out after ${WORKER_TIMEOUT_MS}ms`);
        sendSSE(res, { type: 'agent_status', agent: name, status: 'done', result: null });
      } else if (error || !result) {
        sendSSE(res, { type: 'agent_status', agent: name, status: 'error', result: null });
      } else {
        compiledContext[name] = result;
        sendSSE(res, { type: 'agent_status', agent: name, status: 'done', result });
      }
    } else {
      // Promise.allSettled with inner catch should not reach here, but handle gracefully
      sendSSE(res, { type: 'agent_status', agent: name, status: 'error', result: null });
    }
  }

  return compiledContext;
}
