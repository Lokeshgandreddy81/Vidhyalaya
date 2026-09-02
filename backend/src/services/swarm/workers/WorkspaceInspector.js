import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MAX_FILES_TO_SCAN = 900;
const MAX_RESULTS = 8;
const MAX_FILE_BYTES = 120_000;

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'sandbox_temp',
  'uploads',
  '.next',
  '.turbo',
]);

const EXCLUDED_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
]);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.css',
  '.html',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.yml',
  '.yaml',
]);

function isEnabled(req) {
  if (process.env.CORTEX_ENABLE_WORKSPACE_INSPECTOR === '1') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return req?.user?.role === 'admin';
}

function getTerms(topic, context = '') {
  const text = `${topic} ${context}`.toLowerCase();
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'from',
    'into',
    'code',
    'file',
    'fix',
    'bug',
    'error',
    'route',
    'backend',
    'frontend',
    'project',
    'please',
  ]);

  return Array.from(new Set(
    text
      .split(/[^a-z0-9_./-]+/i)
      .map((term) => term.trim().replace(/^\/+|\/+$/g, ''))
      .filter((term) => term.length >= 3 && !stop.has(term))
      .slice(0, 12)
  ));
}

async function walk(dir, files = []) {
  if (files.length >= MAX_FILES_TO_SCAN) return files;

  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES_TO_SCAN) break;
    if (EXCLUDED_FILENAMES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await walk(fullPath, files);
      }
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    files.push(fullPath);
  }

  return files;
}

function makeSnippet(content, terms) {
  const lower = content.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) break;
  }
  if (idx === -1) idx = 0;

  const start = Math.max(0, idx - 260);
  const end = Math.min(content.length, idx + 620);
  return content.slice(start, end).replace(/\s+\n/g, '\n').trim();
}

function languageFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.css': 'css',
    '.html': 'html',
    '.md': 'markdown',
    '.json': 'json',
  };
  return map[ext] || ext.replace(/^\./, '') || 'text';
}

/**
 * Read-only local project inspector. Disabled in production unless explicitly enabled.
 * @param {{ topic: string, context: string, req: import('express').Request, abortSignal?: AbortSignal }} params
 * @returns {Promise<{ files: Array<{ path: string, language: string, score: number, snippet: string }> }>}
 */
export async function executeWorkspaceInspector({ topic, context, req, abortSignal }) {
  if (!isEnabled(req)) {
    return { files: [], disabled: true, reason: 'Workspace inspection is disabled in production.' };
  }

  const terms = getTerms(topic, context);
  if (terms.length === 0) return { files: [] };

  const files = await walk(PROJECT_ROOT);
  const results = [];

  for (const filePath of files) {
    if (abortSignal?.aborted) return { files: results };

    const relPath = path.relative(PROJECT_ROOT, filePath);
    const lowerPath = relPath.toLowerCase();
    const pathMatches = terms.filter((term) => lowerPath.includes(term.toLowerCase())).length;

    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      continue;
    }
    if (stat.size > MAX_FILE_BYTES && pathMatches === 0) continue;

    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const lowerContent = content.toLowerCase();
    const contentMatches = terms.filter((term) => lowerContent.includes(term.toLowerCase())).length;
    const score = pathMatches * 2 + contentMatches;
    if (score === 0) continue;

    results.push({
      path: relPath,
      language: languageFromPath(filePath),
      score,
      snippet: makeSnippet(content, terms),
    });
  }

  return {
    files: results
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS),
  };
}
