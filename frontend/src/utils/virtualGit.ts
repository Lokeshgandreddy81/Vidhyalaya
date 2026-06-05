/**
 * CORTEX VIRTUAL GIT ENGINE
 * 
 * A fully simulated Git environment that teaches Git concepts by 
 * providing realistic output with educational annotations.
 * 
 * Supports: init, add, commit, status, log, branch, checkout, diff, merge, stash
 */

// ═══════════════════════════════════════════════════════════════
// §1. GIT STATE MODEL
// ═══════════════════════════════════════════════════════════════

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: number;
  parentHash: string | null;
  files: string[];
  branch: string;
}

export interface GitBranch {
  name: string;
  headCommitHash: string | null;
}

export interface GitFileState {
  name: string;
  status: 'untracked' | 'modified' | 'staged' | 'committed';
  content: string;
  stagedContent?: string;
}

export interface GitRepo {
  initialized: boolean;
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  files: GitFileState[];
  stash: Array<{ message: string; files: GitFileState[]; branch: string }>;
  headHash: string | null;
}

// ═══════════════════════════════════════════════════════════════
// §2. HASH GENERATOR
// ═══════════════════════════════════════════════════════════════

const generateHash = (): string => {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

// ═══════════════════════════════════════════════════════════════
// §3. INITIAL STATE FACTORY
// ═══════════════════════════════════════════════════════════════

export const createInitialGitRepo = (): GitRepo => ({
  initialized: false,
  currentBranch: 'main',
  branches: [],
  commits: [],
  files: [],
  stash: [],
  headHash: null,
});

/** Create a pre-populated repo for modules that assume Git is already set up */
export const createPrePopulatedRepo = (moduleTopic: string): GitRepo => {
  const hash1 = generateHash();
  const hash2 = generateHash();
  const hash3 = generateHash();
  
  return {
    initialized: true,
    currentBranch: 'main',
    branches: [{ name: 'main', headCommitHash: hash3 }],
    commits: [
      {
        hash: hash1,
        shortHash: hash1.slice(0, 7),
        message: 'Initial commit',
        author: 'lokeshgandreddy',
        timestamp: Date.now() - 86400000 * 7,
        parentHash: null,
        files: ['README.md', 'package.json'],
        branch: 'main',
      },
      {
        hash: hash2,
        shortHash: hash2.slice(0, 7),
        message: 'Add project structure',
        author: 'lokeshgandreddy',
        timestamp: Date.now() - 86400000 * 3,
        parentHash: hash1,
        files: ['src/index.ts', 'src/App.tsx', 'tsconfig.json'],
        branch: 'main',
      },
      {
        hash: hash3,
        shortHash: hash3.slice(0, 7),
        message: `Set up ${moduleTopic} module`,
        author: 'lokeshgandreddy',
        timestamp: Date.now() - 86400000,
        parentHash: hash2,
        files: ['src/components/Main.tsx'],
        branch: 'main',
      },
    ],
    files: [
      { name: 'README.md', status: 'committed', content: `# ${moduleTopic}\n\nLearning project for ${moduleTopic}.` },
      { name: 'package.json', status: 'committed', content: '{\n  "name": "learning-project",\n  "version": "1.0.0"\n}' },
      { name: 'src/index.ts', status: 'committed', content: 'console.log("Hello, World!");' },
      { name: 'src/App.tsx', status: 'committed', content: 'export default function App() {\n  return <div>Hello</div>;\n}' },
      { name: 'src/components/Main.tsx', status: 'committed', content: 'export const Main = () => <main>Content</main>;' },
    ],
    stash: [],
    headHash: hash3,
  };
};

// ═══════════════════════════════════════════════════════════════
// §4. GIT COMMAND EXECUTOR
// ═══════════════════════════════════════════════════════════════

export interface GitCommandResult {
  output: string[];
  newState: GitRepo;
  isError: boolean;
  teachingLines?: string[];
}

export const executeGitCommand = (
  args: string,
  repo: GitRepo
): GitCommandResult => {
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || '';
  const subArgs = parts.slice(1).join(' ').trim();

  switch (subcommand) {
    case 'init':
      return gitInit(repo);
    case 'status':
      return gitStatus(repo);
    case 'add':
      return gitAdd(subArgs, repo);
    case 'commit':
      return gitCommit(subArgs, repo);
    case 'log':
      return gitLog(subArgs, repo);
    case 'branch':
      return gitBranch(subArgs, repo);
    case 'checkout':
      return gitCheckout(subArgs, repo);
    case 'switch':
      return gitCheckout(subArgs, repo);
    case 'diff':
      return gitDiff(subArgs, repo);
    case 'merge':
      return gitMerge(subArgs, repo);
    case 'stash':
      return gitStash(subArgs, repo);
    case 'push':
      return gitPush(repo);
    case 'pull':
      return gitPull(repo);
    case 'clone':
      return gitClone(subArgs, repo);
    case 'remote':
      return gitRemote(subArgs, repo);
    default:
      return {
        output: [`git: '${subcommand}' is not a git command. See 'git help' for available commands.`],
        newState: repo,
        isError: true,
      };
  }
};

// ═══════════════════════════════════════════════════════════════
// §5. GIT COMMAND IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════

const gitInit = (repo: GitRepo): GitCommandResult => {
  if (repo.initialized) {
    return {
      output: [
        'Reinitialized existing Git repository in /Users/lokeshgandreddy/Sara/Vidhyalaya/.git/',
      ],
      newState: repo,
      isError: false,
    };
  }

  const newState: GitRepo = {
    ...repo,
    initialized: true,
    currentBranch: 'main',
    branches: [{ name: 'main', headCommitHash: null }],
  };

  return {
    output: [
      'Initialized empty Git repository in /Users/lokeshgandreddy/Sara/Vidhyalaya/.git/',
      '',
    ],
    newState,
    isError: false,
    teachingLines: [
      '',
      '╭──────────────────────────────────────────────────╮',
      '│ 💡 WHAT JUST HAPPENED                            │',
      '│                                                  │',
      '│ Git created a hidden `.git/` folder that will    │',
      '│ track every change you make to files in this     │',
      '│ directory. Your project is now version-tracked!  │',
      '│                                                  │',
      '│ 🎯 NEXT STEPS:                                   │',
      '│   • touch README.md  — Create a file             │',
      '│   • git status       — See what Git sees         │',
      '│   • git add .        — Stage files for commit    │',
      '╰──────────────────────────────────────────────────╯',
      '',
    ],
  };
};

const gitStatus = (repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return {
      output: ['fatal: not a git repository (or any of the parent directories): .git'],
      newState: repo,
      isError: true,
      teachingLines: [
        '',
        '   💡 You need to initialize a Git repository first.',
        '   🎯 Try: git init',
        '',
      ],
    };
  }

  const lines: string[] = [];
  lines.push(`On branch \x1b[1m${repo.currentBranch}\x1b[0m`);
  
  if (repo.commits.length === 0) {
    lines.push('');
    lines.push('No commits yet');
  }

  const staged = repo.files.filter(f => f.status === 'staged');
  const modified = repo.files.filter(f => f.status === 'modified');
  const untracked = repo.files.filter(f => f.status === 'untracked');

  if (staged.length > 0) {
    lines.push('');
    lines.push('Changes to be committed:');
    lines.push('  (use "git restore --staged <file>..." to unstage)');
    for (const f of staged) {
      lines.push(`\t\x1b[32mnew file:   ${f.name}\x1b[0m`);
    }
  }

  if (modified.length > 0) {
    lines.push('');
    lines.push('Changes not staged for commit:');
    lines.push('  (use "git add <file>..." to update what will be committed)');
    for (const f of modified) {
      lines.push(`\t\x1b[31mmodified:   ${f.name}\x1b[0m`);
    }
  }

  if (untracked.length > 0) {
    lines.push('');
    lines.push('Untracked files:');
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    for (const f of untracked) {
      lines.push(`\t\x1b[31m${f.name}\x1b[0m`);
    }
  }

  if (staged.length === 0 && modified.length === 0 && untracked.length === 0) {
    lines.push('');
    lines.push('nothing to commit, working tree clean');
  }

  lines.push('');

  return {
    output: lines,
    newState: repo,
    isError: false,
  };
};

const gitAdd = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return {
      output: ['fatal: not a git repository (or any of the parent directories): .git'],
      newState: repo,
      isError: true,
    };
  }

  const newFiles = [...repo.files];
  let addedCount = 0;

  if (args === '.' || args === '-A' || args === '--all') {
    for (let i = 0; i < newFiles.length; i++) {
      if (newFiles[i].status === 'untracked' || newFiles[i].status === 'modified') {
        newFiles[i] = { ...newFiles[i], status: 'staged' };
        addedCount++;
      }
    }
  } else if (args) {
    const fileNames = args.split(/\s+/);
    for (const name of fileNames) {
      const idx = newFiles.findIndex(f => f.name === name || f.name.endsWith(`/${name}`));
      if (idx >= 0 && (newFiles[idx].status === 'untracked' || newFiles[idx].status === 'modified')) {
        newFiles[idx] = { ...newFiles[idx], status: 'staged' };
        addedCount++;
      } else if (idx < 0) {
        return {
          output: [`fatal: pathspec '${name}' did not match any files`],
          newState: repo,
          isError: true,
          teachingLines: [
            '',
            `   💡 The file "${name}" doesn't exist yet.`,
            `   🎯 Create it first: touch ${name}`,
            '',
          ],
        };
      }
    }
  } else {
    return {
      output: ['Nothing specified, nothing added.', 'hint: Maybe you wanted to say \'git add .\'?'],
      newState: repo,
      isError: true,
    };
  }

  return {
    output: addedCount > 0 ? [] : [''],
    newState: { ...repo, files: newFiles },
    isError: false,
    teachingLines: addedCount > 0 ? [
      '',
      `   ✅ ${addedCount} file${addedCount > 1 ? 's' : ''} staged for commit.`,
      `   🎯 Next: git commit -m "your message"`,
      '',
    ] : undefined,
  };
};

const gitCommit = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return {
      output: ['fatal: not a git repository'],
      newState: repo,
      isError: true,
    };
  }

  // Parse -m "message"
  const msgMatch = args.match(/-m\s+["'](.+?)["']/);
  const msgMatch2 = args.match(/-m\s+(\S+)/);
  const message = msgMatch?.[1] || msgMatch2?.[1];

  if (!message) {
    return {
      output: [
        'error: switch `m\' requires a value',
        '',
        'usage: git commit -m "your commit message"',
      ],
      newState: repo,
      isError: true,
      teachingLines: [
        '',
        '   💡 Every commit needs a message describing what changed.',
        '   🎯 Try: git commit -m "Add initial files"',
        '',
      ],
    };
  }

  const staged = repo.files.filter(f => f.status === 'staged');
  if (staged.length === 0) {
    return {
      output: [
        'nothing to commit (create/copy files and use "git add" to track)',
      ],
      newState: repo,
      isError: true,
      teachingLines: [
        '',
        '   💡 You need to stage files before committing.',
        '   🎯 Try: git add . (then git commit -m "message")',
        '',
      ],
    };
  }

  const hash = generateHash();
  const shortHash = hash.slice(0, 7);
  
  const newCommit: GitCommit = {
    hash,
    shortHash,
    message,
    author: 'lokeshgandreddy',
    timestamp: Date.now(),
    parentHash: repo.headHash,
    files: staged.map(f => f.name),
    branch: repo.currentBranch,
  };

  const newFiles = repo.files.map(f =>
    f.status === 'staged' ? { ...f, status: 'committed' as const } : f
  );

  const newBranches = repo.branches.map(b =>
    b.name === repo.currentBranch ? { ...b, headCommitHash: hash } : b
  );

  return {
    output: [
      `[\x1b[1m${repo.currentBranch}\x1b[0m ${shortHash}] ${message}`,
      ` ${staged.length} file${staged.length > 1 ? 's' : ''} changed`,
      '',
    ],
    newState: {
      ...repo,
      files: newFiles,
      commits: [...repo.commits, newCommit],
      headHash: hash,
      branches: newBranches,
    },
    isError: false,
    teachingLines: [
      '',
      `   ✅ Commit ${shortHash} created on branch "${repo.currentBranch}".`,
      `   🎯 Next: git log --oneline (see your history)`,
      '',
    ],
  };
};

const gitLog = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized || repo.commits.length === 0) {
    return {
      output: repo.initialized 
        ? ['fatal: your current branch \'main\' does not have any commits yet'] 
        : ['fatal: not a git repository'],
      newState: repo,
      isError: true,
    };
  }

  const isOneline = args.includes('--oneline');
  const isGraph = args.includes('--graph');
  const lines: string[] = [];

  // Filter commits for current branch
  const branchCommits = [...repo.commits].reverse();

  if (isOneline) {
    for (const commit of branchCommits) {
      const prefix = isGraph ? '* ' : '';
      const headMarker = commit.hash === repo.headHash ? ` \x1b[36m(HEAD -> ${repo.currentBranch})\x1b[0m` : '';
      lines.push(`${prefix}\x1b[33m${commit.shortHash}\x1b[0m${headMarker} ${commit.message}`);
    }
  } else {
    for (const commit of branchCommits) {
      const headMarker = commit.hash === repo.headHash ? ` \x1b[36m(HEAD -> ${repo.currentBranch})\x1b[0m` : '';
      lines.push(`\x1b[33mcommit ${commit.hash}\x1b[0m${headMarker}`);
      lines.push(`Author: ${commit.author} <${commit.author}@users.noreply.github.com>`);
      lines.push(`Date:   ${new Date(commit.timestamp).toUTCString()}`);
      lines.push('');
      lines.push(`    ${commit.message}`);
      lines.push('');
    }
  }
  
  lines.push('');
  return { output: lines, newState: repo, isError: false };
};

const gitBranch = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  if (!args || args === '-a' || args === '--all') {
    // List branches
    const lines = repo.branches.map(b =>
      b.name === repo.currentBranch
        ? `* \x1b[32m${b.name}\x1b[0m`
        : `  ${b.name}`
    );
    lines.push('');
    return { output: lines, newState: repo, isError: false };
  }

  // Delete branch
  if (args.startsWith('-d ') || args.startsWith('-D ') || args.startsWith('--delete ')) {
    const branchName = args.split(' ').slice(1).join(' ').trim();
    if (branchName === repo.currentBranch) {
      return {
        output: [`error: Cannot delete branch '${branchName}' checked out at '.'`],
        newState: repo,
        isError: true,
      };
    }
    const exists = repo.branches.find(b => b.name === branchName);
    if (!exists) {
      return {
        output: [`error: branch '${branchName}' not found.`],
        newState: repo,
        isError: true,
      };
    }
    return {
      output: [`Deleted branch ${branchName} (was ${exists.headCommitHash?.slice(0, 7) || 'empty'}).`, ''],
      newState: {
        ...repo,
        branches: repo.branches.filter(b => b.name !== branchName),
      },
      isError: false,
    };
  }

  // Create branch
  const branchName = args.trim();
  if (repo.branches.find(b => b.name === branchName)) {
    return {
      output: [`fatal: A branch named '${branchName}' already exists.`],
      newState: repo,
      isError: true,
    };
  }

  return {
    output: [''],
    newState: {
      ...repo,
      branches: [...repo.branches, { name: branchName, headCommitHash: repo.headHash }],
    },
    isError: false,
    teachingLines: [
      '',
      `   ✅ Created branch "${branchName}" from "${repo.currentBranch}".`,
      `   🎯 Switch to it: git checkout ${branchName}`,
      '',
    ],
  };
};

const gitCheckout = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  // git checkout -b <name> — create and switch
  if (args.startsWith('-b ')) {
    const branchName = args.slice(3).trim();
    if (repo.branches.find(b => b.name === branchName)) {
      return {
        output: [`fatal: A branch named '${branchName}' already exists.`],
        newState: repo,
        isError: true,
      };
    }
    
    return {
      output: [`Switched to a new branch '\x1b[32m${branchName}\x1b[0m'`, ''],
      newState: {
        ...repo,
        currentBranch: branchName,
        branches: [...repo.branches, { name: branchName, headCommitHash: repo.headHash }],
      },
      isError: false,
      teachingLines: [
        '',
        `   ✅ Created and switched to branch "${branchName}".`,
        `   Changes you make now won't affect "${repo.currentBranch}"`,
        `   until you merge them back.`,
        '',
      ],
    };
  }

  // Switch to existing branch
  const branchName = args.trim();
  const target = repo.branches.find(b => b.name === branchName);
  if (!target) {
    return {
      output: [`error: pathspec '${branchName}' did not match any file(s) known to git`],
      newState: repo,
      isError: true,
      teachingLines: [
        '',
        `   💡 Branch "${branchName}" doesn't exist.`,
        `   🎯 Create it: git checkout -b ${branchName}`,
        `   📋 See all branches: git branch`,
        '',
      ],
    };
  }

  if (branchName === repo.currentBranch) {
    return {
      output: [`Already on '${branchName}'`, ''],
      newState: repo,
      isError: false,
    };
  }

  return {
    output: [`Switched to branch '\x1b[32m${branchName}\x1b[0m'`, ''],
    newState: {
      ...repo,
      currentBranch: branchName,
      headHash: target.headCommitHash,
    },
    isError: false,
  };
};

const gitDiff = (_args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  const modified = repo.files.filter(f => f.status === 'modified');
  if (modified.length === 0) {
    return { output: [''], newState: repo, isError: false };
  }

  const lines: string[] = [];
  for (const file of modified) {
    lines.push(`\x1b[1mdiff --git a/${file.name} b/${file.name}\x1b[0m`);
    lines.push('--- a/' + file.name);
    lines.push('+++ b/' + file.name);
    lines.push('@@ -1,3 +1,4 @@');
    lines.push(' // existing code');
    lines.push('\x1b[32m+ // new changes\x1b[0m');
    lines.push('');
  }

  return { output: lines, newState: repo, isError: false };
};

const gitMerge = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  const branchName = args.trim();
  const target = repo.branches.find(b => b.name === branchName);
  
  if (!target) {
    return {
      output: [`merge: ${branchName} - not something we can merge`],
      newState: repo,
      isError: true,
    };
  }

  if (branchName === repo.currentBranch) {
    return {
      output: ['Already up to date.', ''],
      newState: repo,
      isError: false,
    };
  }

  const hash = generateHash();
  const mergeCommit: GitCommit = {
    hash,
    shortHash: hash.slice(0, 7),
    message: `Merge branch '${branchName}' into ${repo.currentBranch}`,
    author: 'lokeshgandreddy',
    timestamp: Date.now(),
    parentHash: repo.headHash,
    files: [],
    branch: repo.currentBranch,
  };

  return {
    output: [
      `Merge made by the 'ort' strategy.`,
      ` files changed, insertions(+)`,
      '',
    ],
    newState: {
      ...repo,
      commits: [...repo.commits, mergeCommit],
      headHash: hash,
      branches: repo.branches.map(b =>
        b.name === repo.currentBranch ? { ...b, headCommitHash: hash } : b
      ),
    },
    isError: false,
    teachingLines: [
      '',
      `   ✅ Branch "${branchName}" merged into "${repo.currentBranch}".`,
      `   🎯 Check the result: git log --oneline --graph`,
      '',
    ],
  };
};

const gitStash = (args: string, repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  if (args === 'list') {
    if (repo.stash.length === 0) {
      return { output: [''], newState: repo, isError: false };
    }
    const lines = repo.stash.map((s, i) =>
      `stash@{${i}}: WIP on ${s.branch}: ${s.message}`
    );
    lines.push('');
    return { output: lines, newState: repo, isError: false };
  }

  if (args === 'pop' || args === 'apply') {
    if (repo.stash.length === 0) {
      return {
        output: ['No stash entries found.'],
        newState: repo,
        isError: true,
      };
    }
    const stashEntry = repo.stash[0];
    const newStash = args === 'pop' ? repo.stash.slice(1) : [...repo.stash];
    return {
      output: [
        `On branch ${repo.currentBranch}`,
        'Changes restored from stash.',
        '',
      ],
      newState: { ...repo, stash: newStash },
      isError: false,
    };
  }

  // Default: stash push
  const modified = repo.files.filter(f => f.status !== 'committed');
  if (modified.length === 0) {
    return {
      output: ['No local changes to save'],
      newState: repo,
      isError: false,
    };
  }

  const newStash = [
    { message: `stashed changes`, files: modified, branch: repo.currentBranch },
    ...repo.stash,
  ];

  const newFiles = repo.files.map(f =>
    f.status !== 'committed' ? { ...f, status: 'committed' as const } : f
  );

  return {
    output: [
      `Saved working directory and index state WIP on ${repo.currentBranch}`,
      '',
    ],
    newState: { ...repo, stash: newStash, files: newFiles },
    isError: false,
    teachingLines: [
      '',
      `   ✅ Changes stashed! Working directory is clean.`,
      `   🎯 Get them back: git stash pop`,
      `   📋 See all stashes: git stash list`,
      '',
    ],
  };
};

const gitPush = (repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  return {
    output: [
      `Enumerating objects: ${repo.commits.length * 3}, done.`,
      `Counting objects: 100% (${repo.commits.length * 3}/${repo.commits.length * 3}), done.`,
      `Writing objects: 100% (${repo.commits.length}/${repo.commits.length}), done.`,
      `Total ${repo.commits.length} (delta 0), reused 0 (delta 0)`,
      `To github.com:lokeshgandreddy/learning-project.git`,
      `   ${repo.headHash?.slice(0, 7) || '0000000'}..${repo.headHash?.slice(0, 7) || '0000000'}  ${repo.currentBranch} -> ${repo.currentBranch}`,
      '',
    ],
    newState: repo,
    isError: false,
  };
};

const gitPull = (repo: GitRepo): GitCommandResult => {
  if (!repo.initialized) {
    return { output: ['fatal: not a git repository'], newState: repo, isError: true };
  }

  return {
    output: [
      `Already up to date.`,
      '',
    ],
    newState: repo,
    isError: false,
  };
};

const gitClone = (args: string, repo: GitRepo): GitCommandResult => {
  const url = args.trim();
  if (!url) {
    return {
      output: ['fatal: You must specify a repository to clone.', '', 'usage: git clone <repository> [<directory>]'],
      newState: repo,
      isError: true,
    };
  }

  // Extract repo name from URL
  const repoName = url.split('/').pop()?.replace('.git', '') || 'repo';

  return {
    output: [
      `Cloning into '${repoName}'...`,
      'remote: Enumerating objects: 142, done.',
      'remote: Counting objects: 100% (142/142), done.',
      'Receiving objects: 100% (142/142), 45.2 KiB, done.',
      'Resolving deltas: 100% (38/38), done.',
      '',
    ],
    newState: createPrePopulatedRepo(repoName),
    isError: false,
    teachingLines: [
      '',
      `   ✅ Repository "${repoName}" cloned successfully!`,
      `   🎯 Next: cd ${repoName} && ls`,
      '',
    ],
  };
};

const gitRemote = (args: string, repo: GitRepo): GitCommandResult => {
  if (args === '-v' || args === '--verbose') {
    return {
      output: [
        'origin\tgit@github.com:lokeshgandreddy/learning-project.git (fetch)',
        'origin\tgit@github.com:lokeshgandreddy/learning-project.git (push)',
        '',
      ],
      newState: repo,
      isError: false,
    };
  }
  
  return {
    output: ['origin', ''],
    newState: repo,
    isError: false,
  };
};
