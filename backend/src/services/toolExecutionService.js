import { runCode } from '../utils/codeRunner.js';
import { callAIEngine } from '../utils/aiClientRouter.js';

const SUPPORTED_LANGUAGES = new Set(['javascript', 'python', 'go', 'rust', 'c', 'cpp', 'java']);
const EXECUTION_INTENT_PATTERN = /\b(run|execute|test|verify|compile|debug|fix|repair|refactor|failing|broken|error|exception|not working|unit test|assert)\b/i;
const CODE_FENCE_PATTERN = /```([a-zA-Z0-9+#.-]*)\s*\n([\s\S]*?)```/g;
const MAX_CODE_CHARS = 24_000;
const MAX_OUTPUT_CHARS = 2_400;

function normalizeLanguage(language = '') {
  const normalized = String(language).trim().toLowerCase();
  const aliases = {
    js: 'javascript',
    jsx: 'javascript',
    node: 'javascript',
    nodejs: 'javascript',
    py: 'python',
    golang: 'go',
    rs: 'rust',
    'c++': 'cpp',
  };
  return aliases[normalized] || normalized;
}

function inferLanguageFromFilename(filename = '') {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.rs')) return 'rust';
  if (lower.endsWith('.c')) return 'c';
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) return 'cpp';
  if (lower.endsWith('.java')) return 'java';
  return '';
}

function trimText(value, max = MAX_OUTPUT_CHARS) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

function extractFencedCode(message) {
  const candidates = [];
  let match;

  while ((match = CODE_FENCE_PATTERN.exec(message)) !== null) {
    const language = normalizeLanguage(match[1] || '');
    const code = String(match[2] || '').trim();
    if (!code) continue;
    if (!SUPPORTED_LANGUAGES.has(language)) continue;
    candidates.push({
      source: 'message_code_block',
      language,
      code: code.slice(0, MAX_CODE_CHARS),
    });
  }

  return candidates;
}

function extractActiveEditorCode(chatContext) {
  const code = String(chatContext?.activeEditorFile || '').trim();
  if (!code) return null;

  const language =
    normalizeLanguage(chatContext?.activeLanguage || '') ||
    inferLanguageFromFilename(chatContext?.activeFile || chatContext?.openFiles?.[0]?.name || '');

  if (!SUPPORTED_LANGUAGES.has(language)) return null;

  return {
    source: 'active_sandbox',
    language,
    code: code.slice(0, MAX_CODE_CHARS),
  };
}

function selectExecutionCandidate({ newMessage, chatContext }) {
  const message = String(newMessage || '');
  const hasExecutionIntent =
    EXECUTION_INTENT_PATTERN.test(message) ||
    Boolean(chatContext?.lastCompilationError?.trim());

  if (!hasExecutionIntent) return null;

  const [firstFencedCandidate] = extractFencedCode(message);
  if (firstFencedCandidate) return firstFencedCandidate;

  return extractActiveEditorCode(chatContext);
}

function makeAttemptRecord({ index, kind, code, result, note = '' }) {
  return {
    index,
    kind,
    success: Boolean(result?.success),
    languageResult: {
      stdout: trimText(result?.stdout),
      stderr: trimText(result?.stderr),
      errorMessage: trimText(result?.errorMessage),
      runtimeMissing: Boolean(result?.runtimeMissing),
      testsPassed: result?.testsPassed,
      testsTotal: result?.testsTotal,
      durationMs: result?.durationMs ?? 0,
    },
    codePreview: trimText(code, 900),
    note,
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function proposeCorrection({ req, newMessage, candidate, failedAttempt }) {
  const result = failedAttempt.languageResult;
  const prompt = `The user asked Cortex to execute or fix code. The first sandbox run failed.

User request:
${newMessage}

Language: ${candidate.language}

Code:
\`\`\`${candidate.language}
${candidate.code}
\`\`\`

Sandbox stdout:
${result.stdout || '(empty)'}

Sandbox stderr/error:
${result.stderr || result.errorMessage || '(empty)'}

Return strictly valid JSON with this schema:
{
  "code": "full corrected runnable code, no markdown fences",
  "explanation": "one concise sentence naming the root cause"
}

Do not add markdown. Do not change the requested language.`;

  const response = await callAIEngine({
    req,
    prompt,
    systemInstruction: 'You are Cortex Tool Fixer. Produce minimal, runnable corrections only. Return strict JSON and no markdown.',
    responseMimeType: 'application/json',
    maxOutputTokens: 2200,
    temperature: 0.1,
    timeoutMs: 35_000,
  });

  const parsed = extractJsonObject(response);
  if (!parsed || typeof parsed.code !== 'string' || !parsed.code.trim()) {
    throw new Error('Correction model did not return valid corrected code.');
  }

  return {
    code: parsed.code.trim().slice(0, MAX_CODE_CHARS),
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
  };
}

export function shouldRunAutonomousExecution({ newMessage, chatContext }) {
  return Boolean(selectExecutionCandidate({ newMessage, chatContext }));
}

export async function runAutonomousToolExecution({
  newMessage,
  chatContext = null,
  req = null,
  onEvent = null,
}) {
  const candidate = selectExecutionCandidate({ newMessage, chatContext });
  if (!candidate) return null;

  const emit = (event) => {
    if (typeof onEvent === 'function') onEvent(event);
  };

  emit({
    type: 'tool_status',
    tool: 'CortexSandboxRunner',
    status: 'running',
    language: candidate.language,
    source: candidate.source,
  });

  const attempts = [];
  const firstResult = await runCode(candidate.language, candidate.code);
  const firstAttempt = makeAttemptRecord({
    index: 1,
    kind: 'initial_run',
    code: candidate.code,
    result: firstResult,
  });
  attempts.push(firstAttempt);

  let correctedCode = '';
  let correctionExplanation = '';
  let correctionError = '';

  if (!firstResult.success && !req) {
    correctionError = 'Self-correction skipped: request context unavailable.';
    attempts.push({
      index: 2,
      kind: 'self_correction_unavailable',
      success: false,
      languageResult: {
        stdout: '',
        stderr: correctionError,
        errorMessage: correctionError,
        runtimeMissing: false,
        durationMs: 0,
      },
      codePreview: '',
      note: correctionError,
    });
  } else if (!firstResult.success) {
    try {
      emit({
        type: 'tool_status',
        tool: 'CortexSandboxRunner',
        status: 'self_correcting',
        language: candidate.language,
        source: candidate.source,
      });

      const correction = await proposeCorrection({
        req,
        newMessage,
        candidate,
        failedAttempt: firstAttempt,
      });
      correctedCode = correction.code;
      correctionExplanation = correction.explanation;

      const correctedResult = await runCode(candidate.language, correctedCode);
      attempts.push(makeAttemptRecord({
        index: 2,
        kind: 'self_corrected_run',
        code: correctedCode,
        result: correctedResult,
        note: correctionExplanation,
      }));
    } catch (error) {
      correctionError = error?.message || 'Self-correction failed.';
      attempts.push({
        index: 2,
        kind: 'self_correction_unavailable',
        success: false,
        languageResult: {
          stdout: '',
          stderr: correctionError,
          errorMessage: correctionError,
          runtimeMissing: false,
          durationMs: 0,
        },
        codePreview: '',
        note: correctionError,
      });
    }
  }

  const finalAttempt = attempts[attempts.length - 1];
  const result = {
    executed: true,
    tool: 'CortexSandboxRunner',
    source: candidate.source,
    language: candidate.language,
    attempts,
    final: finalAttempt,
    correctedCode,
    correctionExplanation,
    correctionError,
  };

  emit({
    type: 'tool_status',
    tool: 'CortexSandboxRunner',
    status: finalAttempt.success ? 'passed' : 'failed',
    language: candidate.language,
    source: candidate.source,
  });

  return result;
}

export function formatExecutionReport(execution) {
  if (!execution?.executed) return '';

  const finalResult = execution.final?.languageResult || {};
  const finalStatus = execution.final?.success ? 'PASS' : 'FAIL';
  const attemptsLabel = execution.attempts?.length === 1 ? '1 attempt' : `${execution.attempts.length} attempts`;
  const output = finalResult.stderr || finalResult.errorMessage || finalResult.stdout || 'Process finished with no output.';

  return `## Verified Execution
- Tool: \`${execution.tool}\`
- Source: \`${execution.source}\`
- Language: \`${execution.language}\`
- Result: ${finalStatus} after ${attemptsLabel} (${finalResult.durationMs || 0}ms)

\`\`\`text
${trimText(output)}
\`\`\``;
}

export function formatExecutionEvidenceForPrompt(execution) {
  if (!execution?.executed) return '';

  return `
[AUTONOMOUS TOOL EXECUTION RESULT]
${JSON.stringify({
    tool: execution.tool,
    source: execution.source,
    language: execution.language,
    attempts: execution.attempts,
    finalStatus: execution.final?.success ? 'PASS' : 'FAIL',
    correctedCode: execution.correctedCode || null,
    correctionExplanation: execution.correctionExplanation || null,
    correctionError: execution.correctionError || null,
  }, null, 2)}

Ground your response in this verified result. If a correctedCode value is present and the finalStatus is PASS, present that corrected code as the verified fix. Do not claim that unexecuted code was tested.`;
}
