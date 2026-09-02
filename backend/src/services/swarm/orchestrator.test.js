import { describe, it } from 'node:test';
import assert from 'node:assert';
import { decideNextReActStep, summarizeToolResult } from './orchestrator.js';

describe('Cortex ReAct swarm planner', () => {
  it('starts with local workspace inspection for codebase implementation prompts', () => {
    const decision = decideNextReActStep({
      topic: 'Find and refactor the backend auth route in the local codebase',
      results: {},
      executedAgents: [],
      initialAgents: ['GoogleScout'],
      step: 0,
    });

    assert.strictEqual(decision.action, 'WorkspaceInspector');
  });

  it('pivots from empty documentation to GitHub examples', () => {
    const decision = decideNextReActStep({
      topic: 'Build a React auth starter template',
      results: { GoogleScout: { resources: [] } },
      executedAgents: ['GoogleScout'],
      initialAgents: ['GoogleScout'],
      step: 1,
    });

    assert.strictEqual(decision.action, 'GitHubScout');
  });

  it('generates a workspace scaffold only after grounding exists', () => {
    const decision = decideNextReActStep({
      topic: 'Scaffold a backend route project structure',
      results: {
        WorkspaceInspector: {
          files: [{ path: 'backend/src/routes/auth.js', score: 4, snippet: 'router.post("/login")' }],
        },
      },
      executedAgents: ['WorkspaceInspector'],
      initialAgents: ['WorkspaceInspector', 'WorkspaceConfigurator'],
      step: 1,
    });

    assert.strictEqual(decision.action, 'WorkspaceConfigurator');
  });

  it('stops when useful documentation satisfies a docs-only prompt', () => {
    const decision = decideNextReActStep({
      topic: 'Find official docs for Express middleware',
      results: {
        GoogleScout: {
          resources: [{ title: 'Express middleware', url: 'https://expressjs.com', chunks: ['middleware docs'] }],
        },
      },
      executedAgents: ['GoogleScout'],
      initialAgents: ['GoogleScout'],
      step: 1,
    });

    assert.strictEqual(decision.action, 'stop');
  });

  it('summarizes workspace inspection quality', () => {
    const summary = summarizeToolResult('WorkspaceInspector', {
      files: [{ path: 'frontend/src/App.tsx', score: 2, snippet: 'Route path' }],
    });

    assert.strictEqual(summary.quality, 'useful');
    assert.strictEqual(summary.count, 1);
    assert.deepStrictEqual(summary.sample, ['frontend/src/App.tsx']);
  });
});
