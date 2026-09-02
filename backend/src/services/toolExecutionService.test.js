import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatExecutionReport,
  runAutonomousToolExecution,
  shouldRunAutonomousExecution,
} from './toolExecutionService.js';

describe('Cortex autonomous tool execution', () => {
  it('detects runnable fenced JavaScript requests', () => {
    const shouldRun = shouldRunAutonomousExecution({
      newMessage: 'Run and verify this:\n```js\nconsole.log("ok")\n```',
      chatContext: null,
    });

    assert.strictEqual(shouldRun, true);
  });

  it('executes runnable JavaScript before response synthesis', async () => {
    const execution = await runAutonomousToolExecution({
      newMessage: 'Test this code:\n```javascript\nconsole.log(2 + 3)\n```',
    });

    assert.strictEqual(execution.executed, true);
    assert.strictEqual(execution.language, 'javascript');
    assert.strictEqual(execution.final.success, true);
    assert.strictEqual(execution.final.languageResult.stdout, '5');
  });

  it('returns a verified report for final answer injection', async () => {
    const execution = await runAutonomousToolExecution({
      newMessage: 'Run this code:\n```javascript\nconsole.log("verified")\n```',
    });
    const report = formatExecutionReport(execution);

    assert.match(report, /Verified Execution/);
    assert.match(report, /PASS/);
    assert.match(report, /verified/);
  });
});
