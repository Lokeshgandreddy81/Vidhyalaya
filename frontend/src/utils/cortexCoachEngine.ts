import {
  MissionStep,
  SubSkill,
  SkillCategory,
  SkillProfile,
  ConceptMemory,
  LearningMemoryState,
  MissionConfig,
  ScenarioConfig
} from '../types';
import { GitRepo } from './virtualGit';

// ═══════════════════════════════════════════════════════════════
// §1. PROGRAMMATIC VERIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface VFSNode {
  name: string;
  type: 'file' | 'dir';
  content?: string;
}

/** Simple path resolver mirroring ShellTerminal's path logic */
export const resolvePathSimple = (currentDir: string, arg: string): string => {
  const cleanArg = arg.trim();
  if (!cleanArg) return currentDir;
  if (cleanArg === '/' || cleanArg === '~') return 'Vidhyalaya';

  let fullPath = '';
  if (cleanArg.startsWith('/')) {
    fullPath = cleanArg.substring(1);
  } else {
    fullPath = currentDir === 'Vidhyalaya' ? cleanArg : `${currentDir}/${cleanArg}`;
  }

  const parts = fullPath.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.length === 0 ? 'Vidhyalaya' : stack.join('/');
};

export const verifyStepState = (
  step: MissionStep,
  vfs: Record<string, VFSNode>,
  git: GitRepo,
  currentDir: string,
  lastExecutedCommand?: string
): boolean => {
  const param = step.validationParam || '';

  switch (step.validationType) {
    case 'directory_changed':
      // checks if active dir ends with target folder, or matches resolved path
      const resolvedTarget = resolvePathSimple(currentDir, param);
      return currentDir.toLowerCase() === resolvedTarget.toLowerCase() || currentDir.toLowerCase().endsWith(param.toLowerCase());

    case 'file_exists': {
      const resolvedFile = resolvePathSimple(currentDir, param);
      const node = vfs[resolvedFile];
      return !!node && node.type === 'file';
    }

    case 'file_contains': {
      const resolvedFile = resolvePathSimple(currentDir, param);
      const node = vfs[resolvedFile];
      if (!node || node.type !== 'file' || !node.content) return false;
      if (step.validationPattern) {
        const regex = new RegExp(step.validationPattern, 'i');
        return regex.test(node.content);
      }
      return true;
    }

    case 'git_initialized':
      return !!git.initialized;

    case 'git_staged':
      return git.files.some(f => f.name.endsWith(param) && f.status === 'staged');

    case 'git_committed':
      return git.commits.some(c => c.message.toLowerCase().includes(param.toLowerCase()));

    case 'command_executed':
      if (!lastExecutedCommand) return false;
      if (step.validationPattern) {
        const regex = new RegExp(step.validationPattern, 'i');
        return regex.test(lastExecutedCommand);
      }
      return lastExecutedCommand.toLowerCase().startsWith(param.toLowerCase());

    default:
      return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// §2. MASTERY MATH ENGINE
// ═══════════════════════════════════════════════════════════════

export const calculateSkillMastery = (category: SkillCategory): number => {
  let totalSubSkillScore = 0;
  const subSkills = Object.values(category.subSkills);

  if (subSkills.length === 0) return 0;

  subSkills.forEach(sub => {
    const successRate = sub.attempts > 0 ? sub.successes / sub.attempts : 0;
    // Sub-skill score = (SuccessRate * 80) + (min(successes, 5) * 4) -> encourages at least 5 successes
    const baseScore = (successRate * 80) + (Math.min(sub.successes, 5) * 4);
    sub.score = Math.max(0, Math.min(100, Math.round(baseScore)));
    totalSubSkillScore += sub.score;
  });

  const avgSubSkillScore = totalSubSkillScore / subSkills.length;

  // Deduct penalty for recurring mistakes
  let mistakePenalty = 0;
  Object.values(category.mistakeCounts).forEach(count => {
    if (count > 1) {
      mistakePenalty += (count - 1) * 3; // 3 points off per recurring mistake
    }
  });

  // Apply time decay based on lastActive
  let decayFactor = 1.0;
  const lastActiveTime = new Date(category.lastActive).getTime();
  const diffHours = (Date.now() - lastActiveTime) / (1000 * 60 * 60);
  if (diffHours > 24) {
    const diffDays = diffHours / 24;
    // 1% decay per day of inactivity
    decayFactor = Math.exp(-0.01 * diffDays);
  }

  const finalScore = (avgSubSkillScore - mistakePenalty) * decayFactor;
  return Math.max(0, Math.min(100, Math.round(finalScore)));
};

// ═══════════════════════════════════════════════════════════════
// §3. SPACED REPETITION ENGINE
// ═══════════════════════════════════════════════════════════════

export const decayMemoryStrengths = (
  memoryState: LearningMemoryState,
  currentUserId: string
): LearningMemoryState => {
  const updatedConcepts = { ...memoryState.concepts };
  const now = Date.now();

  Object.keys(updatedConcepts).forEach(conceptId => {
    const concept = updatedConcepts[conceptId];
    const lastExec = new Date(concept.lastSuccessfulExec).getTime();
    const diffHours = (now - lastExec) / (1000 * 60 * 60);

    // Retention Rt = exp(-t / S)
    const retention = Math.exp(-diffHours / concept.strength);

    // If retention falls low, reduce consecutive successes to prompt review
    if (retention < 0.65) {
      concept.consecutiveSuccesses = Math.max(0, concept.consecutiveSuccesses - 1);
    }
  });

  return {
    userId: currentUserId,
    concepts: updatedConcepts,
    commonMistakesLog: memoryState.commonMistakesLog,
    evidenceLog: memoryState.evidenceLog || [],
    reflectionQueue: memoryState.reflectionQueue || []
  };
};

export const updateConceptStrength = (
  concept: ConceptMemory,
  success: boolean
): ConceptMemory => {
  const nowStr = new Date().toISOString();
  let strength = concept.strength;
  let successes = concept.consecutiveSuccesses;
  let failures = concept.failureCount;

  if (success) {
    successes++;
    // S_new = S_old * (1.5 + 0.1 * successes)
    strength = strength * (1.5 + 0.1 * successes);
    // Clamp memory strength to max 720 hours (30 days)
    strength = Math.min(720, strength);
  } else {
    successes = 0;
    failures++;
    // S_new = S_old * 0.4
    strength = Math.max(2, strength * 0.4); // Floor strength at 2 hours
  }

  return {
    conceptId: concept.conceptId,
    strength: parseFloat(strength.toFixed(2)),
    lastSuccessfulExec: success ? nowStr : concept.lastSuccessfulExec,
    consecutiveSuccesses: successes,
    failureCount: failures,
    reviewsTriggered: concept.reviewsTriggered
  };
};

// ═══════════════════════════════════════════════════════════════
// §4. MISTAKE SCAFFOLDING & DETECTOR
// ═══════════════════════════════════════════════════════════════

export interface ScaffoldingCard {
  title: string;
  explanation: string[];
  level: 1 | 2 | 3;
}

export const detectMistakeScaffolding = (
  cmd: string,
  gitState: GitRepo,
  consecutiveErrorCount: number
): ScaffoldingCard | null => {
  const normalized = cmd.trim().toLowerCase();

  // Scenario 1: git push with no commits
  if (normalized.startsWith('git push')) {
    if (!gitState.initialized) {
      return {
        title: 'Git Not Initialized',
        explanation: consecutiveErrorCount === 1
          ? ['You are trying to push, but Git has not been set up yet.', '💡 Tip: Run "git init" first.']
          : ['In Git, you must initialize version history in your project folder before sharing it.', '🧩 Analogy: You cannot mail a letter before you fold the envelope.', '🔧 Action: Run "git init" in the workspace.'],
        level: consecutiveErrorCount >= 3 ? 3 : (consecutiveErrorCount === 2 ? 2 : 1)
      };
    }
    const hasCommits = gitState.commits.length > 0;
    const hasStaged = gitState.files.some(f => f.status === 'staged');
    if (!hasCommits) {
      if (consecutiveErrorCount === 1) {
        return {
          title: 'Empty Git Repository',
          explanation: ['Your local repository does not have any saved snapshots (commits) yet.', '💡 Tip: Stage files using "git add" and run "git commit" first.'],
          level: 1
        };
      } else if (consecutiveErrorCount === 2) {
        return {
          title: 'Git Snapshot Analogy',
          explanation: [
            'Git is a history tracker. Commits are like snapshots of your folder at a specific point in time.',
            'You are attempting to upload (push) changes to the cloud, but you have no snapshots saved locally.',
            '🧩 Analogy: Trying to post a photo to Instagram before taking the picture.'
          ],
          level: 2
        };
      } else {
        return {
          title: 'Save Snapshots Checklist',
          explanation: [
            'To push changes, follow these steps exactly:',
            '  1. Stage files:   git add README.md',
            '  2. Save commit:   git commit -m "My first commit"',
            '  3. Upload changes: git push'
          ],
          level: 3
        };
      }
    }
  }

  // Scenario 2: cd into a file
  if (normalized.startsWith('cd ')) {
    const parts = normalized.split(/\s+/);
    const targetFile = parts[1];
    if (targetFile && targetFile.includes('.')) {
      if (consecutiveErrorCount === 1) {
        return {
          title: 'Change Directory Blocked',
          explanation: ['`cd` stands for Change Directory. You can only cd into folders.', '💡 Tip: To view a file\'s contents, try using "cat".'],
          level: 1
        };
      } else if (consecutiveErrorCount === 2) {
        return {
          title: 'Folders vs Files',
          explanation: [
            'Directories (folders) contain files. Files (like .ts, .md, .js) contain code text.',
            'You cannot walk "inside" a file document.',
            '🧩 Analogy: You open a folder to browse documents, but you open a document to read its pages.'
          ],
          level: 2
        };
      } else {
        return {
          title: 'File Reading Formulas',
          explanation: [
            `To view the content of ${targetFile}, type:`,
            `  cat ${targetFile}`,
            `To edit the contents of ${targetFile}, type:`,
            `  nano ${targetFile}`
          ],
          level: 3
        };
      }
    }
  }

  // Scenario 3: npm run dev before npm install
  if (normalized === 'npm run dev' && !gitState.initialized) { // simple simulator check for missing node_modules
    if (consecutiveErrorCount === 1) {
      return {
        title: 'Dependencies Missing',
        explanation: ['Your dev server failed because package dependencies are not ready.', '💡 Tip: Run "npm install" first.'],
        level: 1
      };
    } else if (consecutiveErrorCount === 2) {
      return {
        title: 'Project Packages Analogy',
        explanation: [
          'Vite projects depend on external libraries listed in package.json.',
          'These libraries must be downloaded and stored in the "node_modules" folder before code can run.',
          '🧩 Analogy: Buying furniture but you haven\'t unboxed the tools to assemble it.'
        ],
        level: 2
      };
    } else {
      return {
        title: 'Booting Server Formula',
        explanation: [
          'Run these commands in order to boot the server:',
          '  1. npm install   (download packages)',
          '  2. npm run dev   (launch server preview)'
        ],
        level: 3
      };
    }
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════
// §5. MISSION & SCENARIO CATALOGS
// ═══════════════════════════════════════════════════════════════

export const MISSION_CATALOG: Record<string, MissionConfig> = {
  git_init_commit: {
    id: 'git_init_commit',
    title: 'Your First Commit',
    difficulty: 'Beginner',
    track: 'Git Basics',
    steps: [
      {
        stepIndex: 1,
        instruction: 'Initialize a new Git repository in the current folder.',
        placeholderText: 'git init',
        expectedPattern: '^git\\s+init',
        validationType: 'git_initialized',
        hints: ['Use the \'git\' command with the \'init\' subcommand.', 'Type: git init']
      },
      {
        stepIndex: 2,
        instruction: 'Create a file named README.md to describe your project.',
        placeholderText: 'touch README.md',
        expectedPattern: '^touch\\s+README\\.md',
        validationType: 'file_exists',
        validationParam: 'README.md',
        hints: ['The \'touch\' command creates empty files.', 'Type: touch README.md']
      },
      {
        stepIndex: 3,
        instruction: 'Stage README.md to prepare it for versioning.',
        placeholderText: 'git add README.md',
        expectedPattern: '^git\\s+add\\s+(\\.|README\\.md)',
        validationType: 'git_staged',
        validationParam: 'README.md',
        hints: ['Stage files using the \'git add\' command.', 'Type: git add README.md']
      },
      {
        stepIndex: 4,
        instruction: 'Commit the staged files with the message \'Initial commit\'.',
        placeholderText: 'git commit -m "Initial commit"',
        expectedPattern: '^git\\s+commit\\s+-m\\s+[\"\']Initial commit[\"\']',
        validationType: 'git_committed',
        validationParam: 'Initial commit',
        hints: ['Save snapshots with \'git commit -m "your message"\'.', 'Type: git commit -m "Initial commit"']
      }
    ]
  }
};

const BROKEN_REPO_MAIN_HASH = '8f4c2a1b9d3e6f708192a4b5c6d7e8f901234567';
const API_ENV_MAIN_HASH = '3c7a9e2f4b6d8012a345c6e7f890123456789abc';

export const SCENARIO_CATALOG: Record<string, ScenarioConfig> = {
  broken_repo_sync: {
    scenarioId: 'broken_repo_sync',
    title: 'Broken Repo Sync (Merge Conflict)',
    difficulty: 'Intermediate',
    estimatedMinutes: 15,
    description: 'Your coworker pushed conflicting changes to the main branch. Resolve the merge conflict to successfully pull.',
    startingDir: 'Vidhyalaya',
    vfsState: {
      'index.js': {
        type: 'file',
        content: `<<<<<<< HEAD\nconst port = 3000;\n=======\nconst port = 5000;\n>>>>>>> feature/ports\nconsole.log(\`Server starting on port \${port}\`);`
      }
    },
    gitState: {
      initialized: true,
      currentBranch: 'main',
      branches: [
        { name: 'main', headCommitHash: BROKEN_REPO_MAIN_HASH },
        { name: 'feature/ports', headCommitHash: BROKEN_REPO_MAIN_HASH }
      ],
      commits: [
        {
          hash: BROKEN_REPO_MAIN_HASH,
          shortHash: BROKEN_REPO_MAIN_HASH.slice(0, 7),
          message: 'Initial structure',
          author: 'lokeshgandreddy',
          timestamp: 1767225600000,
          parentHash: null,
          files: ['index.js'],
          branch: 'main'
        }
      ],
      files: [
        { name: 'index.js', status: 'modified', content: `<<<<<<< HEAD\nconst port = 3000;\n=======\nconst port = 5000;\n>>>>>>> feature/ports\nconsole.log(\`Server starting on port \${port}\`);` }
      ],
      stash: [],
      headHash: BROKEN_REPO_MAIN_HASH
    },
    steps: [
      {
        stepIndex: 1,
        instruction: 'Open \'index.js\' in the editor (nano or cat) and resolve the merge conflict markers. Keep the port set to 5000.',
        validationType: 'file_contains',
        validationParam: 'index.js',
        validationPattern: '^(?![\\s\\S]*(<<<<<<<|=======|>>>>>>>))[\\s\\S]*port\\s*=\\s*5000[\\s\\S]*$',
        hints: [
          'Use \'nano index.js\' to edit the file.',
          'Delete the Git conflict markers: <<<<<<<, =======, and >>>>>>>.',
          'Ensure const port is set to 5000.'
        ]
      },
      {
        stepIndex: 2,
        instruction: 'Stage the resolved index.js file.',
        validationType: 'git_staged',
        validationParam: 'index.js',
        hints: ['Run \'git add index.js\' to tell Git the conflict is resolved.']
      },
      {
        stepIndex: 3,
        instruction: 'Commit the resolution merge.',
        validationType: 'git_committed',
        validationParam: 'Merge',
        hints: ['Run: git commit -m "Merge branch \'feature/ports\' resolved"']
      }
    ]
  },
  api_env_repair: {
    scenarioId: 'api_env_repair',
    title: 'API Environment Repair',
    difficulty: 'Beginner',
    estimatedMinutes: 10,
    description: 'The frontend API client is pointing at the Vite dev server instead of the Express API. Repair the fallback URL and commit the fix.',
    startingDir: 'Vidhyalaya',
    vfsState: {
      'src': {
        type: 'dir'
      },
      'src/apiClient.ts': {
        type: 'file',
        content: `export const API_BASE_URL = "http://localhost:3000/api";\n\nexport async function getHealth() {\n  const response = await fetch(\`\${API_BASE_URL}/health\`);\n  return response.json();\n}`
      }
    },
    gitState: {
      initialized: true,
      currentBranch: 'feature/api-env',
      branches: [
        { name: 'main', headCommitHash: API_ENV_MAIN_HASH },
        { name: 'feature/api-env', headCommitHash: API_ENV_MAIN_HASH }
      ],
      commits: [
        {
          hash: API_ENV_MAIN_HASH,
          shortHash: API_ENV_MAIN_HASH.slice(0, 7),
          message: 'Add frontend API client',
          author: 'lokeshgandreddy',
          timestamp: 1767312000000,
          parentHash: null,
          files: ['src/apiClient.ts'],
          branch: 'main'
        }
      ],
      files: [
        {
          name: 'src/apiClient.ts',
          status: 'modified',
          content: `export const API_BASE_URL = "http://localhost:3000/api";\n\nexport async function getHealth() {\n  const response = await fetch(\`\${API_BASE_URL}/health\`);\n  return response.json();\n}`
        }
      ],
      stash: [],
      headHash: API_ENV_MAIN_HASH
    },
    steps: [
      {
        stepIndex: 1,
        instruction: 'Inspect src/apiClient.ts to find the incorrect API fallback.',
        placeholderText: 'cat src/apiClient.ts',
        expectedPattern: '^(cat|nano)\\s+src/apiClient\\.ts',
        validationType: 'command_executed',
        validationPattern: '^(cat|nano)\\s+src/apiClient\\.ts',
        hints: ['Use cat for a quick read, or nano if you want to inspect and edit in one pass.']
      },
      {
        stepIndex: 2,
        instruction: 'Update src/apiClient.ts so API_BASE_URL uses import.meta.env.VITE_API_URL with http://localhost:5001/api as the fallback.',
        placeholderText: 'nano src/apiClient.ts',
        validationType: 'file_contains',
        validationParam: 'src/apiClient.ts',
        validationPattern: 'import\\.meta\\.env\\.VITE_API_URL[\\s\\S]*localhost:5001/api',
        hints: [
          'Open the file with nano src/apiClient.ts.',
          'The fallback should target the Express API, not the frontend dev server.',
          'Use: export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";'
        ]
      },
      {
        stepIndex: 3,
        instruction: 'Stage the repaired API client.',
        placeholderText: 'git add src/apiClient.ts',
        expectedPattern: '^git\\s+add\\s+src/apiClient\\.ts',
        validationType: 'git_staged',
        validationParam: 'src/apiClient.ts',
        hints: ['Run git add src/apiClient.ts to stage only the repaired file.']
      },
      {
        stepIndex: 4,
        instruction: 'Commit the repair with the message "Fix API env fallback".',
        placeholderText: 'git commit -m "Fix API env fallback"',
        expectedPattern: '^git\\s+commit\\s+-m\\s+["\']Fix API env fallback["\']',
        validationType: 'git_committed',
        validationParam: 'Fix API env fallback',
        hints: ['Run: git commit -m "Fix API env fallback"']
      }
    ]
  }
};
