/**
 * CORTEX TERMINAL INTELLIGENCE ENGINE
 *
 * This module provides the learning-aware intelligence layer for the terminal:
 * - Fuzzy command matching (Levenshtein distance)
 * - Intent recognition ("install X" → "pip install X")
 * - Command knowledge base (explanations, tips, next steps)
 * - Mistake classification (typo / wrong-tool / dangerous / conceptual)
 * - Safety shield (intercepts dangerous commands)
 * - Expertise adaptation (verbose → concise based on usage)
 */

// ═══════════════════════════════════════════════════════════════
// §1. FUZZY MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════

export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

/** All commands the terminal recognizes (for fuzzy matching) */
export const KNOWN_COMMANDS = [
  'ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'cat', 'echo',
  'clear', 'help', 'history', 'whoami', 'date', 'find', 'grep', 'nano',
  'npm', 'node', 'npx', 'ts-node', 'top', 'man',
  'git', 'python', 'python3', 'pip', 'pip3',
  'chmod', 'chown', 'curl', 'wget', 'ssh', 'scp',
  'docker', 'kubectl', 'aws', 'gcloud',
  'make', 'gcc', 'java', 'javac', 'cargo', 'go',
  'sara', 'cortex',
];

/** Git subcommands for second-level fuzzy matching */
export const GIT_SUBCOMMANDS = [
  'init', 'clone', 'add', 'commit', 'push', 'pull', 'fetch',
  'status', 'log', 'diff', 'branch', 'checkout', 'switch',
  'merge', 'rebase', 'stash', 'cherry-pick', 'reset', 'revert',
  'remote', 'tag', 'show', 'blame',
];

export const NPM_SUBCOMMANDS = [
  'install', 'uninstall', 'run', 'init', 'test', 'start',
  'build', 'publish', 'update', 'list', 'audit', 'cache',
];

export interface FuzzyMatch {
  command: string;
  distance: number;
  isExact: boolean;
}

export const findClosestCommand = (input: string, candidates: string[] = KNOWN_COMMANDS, maxDistance = 2): FuzzyMatch | null => {
  const lower = input.toLowerCase().trim();

  // Exact match first
  const exact = candidates.find(c => c === lower);
  if (exact) return { command: exact, distance: 0, isExact: true };

  // Fuzzy search
  let bestMatch: FuzzyMatch | null = null;
  for (const candidate of candidates) {
    const dist = levenshteinDistance(lower, candidate);
    if (dist <= maxDistance && (!bestMatch || dist < bestMatch.distance)) {
      bestMatch = { command: candidate, distance: dist, isExact: false };
    }
  }
  return bestMatch;
};

// ═══════════════════════════════════════════════════════════════
// §2. INTENT RECOGNITION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface DetectedIntent {
  type: 'install_package' | 'run_script' | 'open_file' | 'delete_file' | 'search_text' | 'create_file' | 'navigate' | 'show_info' | 'unknown';
  originalInput: string;
  suggestedCommand: string;
  explanation: string;
}

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  type: DetectedIntent['type'];
  suggest: (match: RegExpMatchArray) => string;
  explain: (match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /^install\s+(.+)$/i,
    type: 'install_package',
    suggest: (m) => `npm install ${m[1]}`,
    explain: (m) => `To install a package, use a package manager like npm:\n  npm install ${m[1]}\n\nOr for Python packages:\n  pip install ${m[1]}`,
  },
  {
    pattern: /^run\s+(.+)$/i,
    type: 'run_script',
    suggest: (m) => `node ${m[1]}`,
    explain: (m) => `To run a script, specify the runtime:\n  node ${m[1]}     — Run with Node.js\n  python ${m[1]}   — Run with Python\n  ts-node ${m[1]}  — Run TypeScript`,
  },
  {
    pattern: /^open\s+(.+)$/i,
    type: 'open_file',
    suggest: (m) => `cat ${m[1]}`,
    explain: (m) => `To view a file in the terminal:\n  cat ${m[1]}    — Print file contents\n  nano ${m[1]}   — Open in text editor`,
  },
  {
    pattern: /^delete\s+(.+)$/i,
    type: 'delete_file',
    suggest: (m) => `rm ${m[1]}`,
    explain: (m) => `To delete a file:\n  rm ${m[1]}      — Delete the file\n  rm -i ${m[1]}   — Delete with confirmation (safer)`,
  },
  {
    pattern: /^(?:search|find|look for)\s+(.+)$/i,
    type: 'search_text',
    suggest: (m) => `grep -r "${m[1]}" .`,
    explain: (m) => `To search for text in files:\n  grep -r "${m[1]}" .   — Search recursively in current directory\n  find . -name "${m[1]}" — Find files by name`,
  },
  {
    pattern: /^(?:create|make|new)\s+(?:file\s+)?(.+)$/i,
    type: 'create_file',
    suggest: (m) => `touch ${m[1]}`,
    explain: (m) => `To create a new file:\n  touch ${m[1]}   — Create an empty file\n  nano ${m[1]}    — Create and open in editor`,
  },
  {
    pattern: /^(?:go to|navigate to|enter)\s+(.+)$/i,
    type: 'navigate',
    suggest: (m) => `cd ${m[1]}`,
    explain: (m) => `To navigate to a directory:\n  cd ${m[1]}   — Change directory`,
  },
  {
    pattern: /^(?:show|display|print|what is)\s+(.+)$/i,
    type: 'show_info',
    suggest: (m) => `echo ${m[1]}`,
    explain: (m) => `To display information:\n  echo ${m[1]}   — Print text\n  cat ${m[1]}    — Show file contents\n  pwd            — Show current directory`,
  },
];

export const detectIntent = (input: string): DetectedIntent | null => {
  const trimmed = input.trim();
  for (const { pattern, type, suggest, explain } of INTENT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        type,
        originalInput: trimmed,
        suggestedCommand: suggest(match),
        explanation: explain(match),
      };
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════
// §3. COMMAND KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════

export interface CommandKnowledge {
  command: string;
  shortDescription: string;
  whatItDoes: string;
  analogy?: string;
  commonFlags?: Array<{ flag: string; description: string }>;
  nextSteps?: string[];
  relatedConcepts?: string[];
  dangerLevel: 'safe' | 'caution' | 'dangerous';
}

export const COMMAND_KNOWLEDGE: Record<string, CommandKnowledge> = {
  ls: {
    command: 'ls',
    shortDescription: 'List directory contents',
    whatItDoes: '`ls` shows all files and folders in your current directory. Think of it as looking at the contents of the folder you have open.',
    analogy: 'Like opening a folder on your desktop and seeing all the files inside.',
    commonFlags: [
      { flag: '-l', description: 'Long format — shows permissions, size, date' },
      { flag: '-a', description: 'Show hidden files (starting with .)' },
      { flag: '-la', description: 'Both — full details including hidden files' },
      { flag: '-h', description: 'Human-readable file sizes (KB, MB)' },
    ],
    nextSteps: ['cd <folder>', 'cat <file>', 'ls -la'],
    relatedConcepts: ['File System', 'Directories', 'Hidden Files'],
    dangerLevel: 'safe',
  },
  cd: {
    command: 'cd',
    shortDescription: 'Change directory',
    whatItDoes: '`cd` moves you into a different folder. Like double-clicking a folder to open it.',
    analogy: 'Like navigating through folders in Finder/Explorer by clicking into them.',
    commonFlags: [
      { flag: '..', description: 'Go up one level (parent directory)' },
      { flag: '~', description: 'Go to home directory' },
      { flag: '-', description: 'Go to previous directory' },
    ],
    nextSteps: ['ls', 'pwd'],
    relatedConcepts: ['File System', 'Paths', 'Directory Navigation'],
    dangerLevel: 'safe',
  },
  pwd: {
    command: 'pwd',
    shortDescription: 'Print working directory',
    whatItDoes: '`pwd` shows the full path to where you currently are in the file system.',
    analogy: 'Like looking at the address bar in Finder to see which folder you\'re in.',
    nextSteps: ['ls', 'cd'],
    relatedConcepts: ['File System', 'Absolute Paths', 'Working Directory'],
    dangerLevel: 'safe',
  },
  mkdir: {
    command: 'mkdir',
    shortDescription: 'Make directory',
    whatItDoes: '`mkdir` creates a new empty folder.',
    analogy: 'Like right-clicking and selecting "New Folder" on your desktop.',
    commonFlags: [
      { flag: '-p', description: 'Create parent directories if they don\'t exist' },
    ],
    nextSteps: ['cd <new-folder>', 'ls'],
    relatedConcepts: ['File System', 'Directories', 'Project Structure'],
    dangerLevel: 'safe',
  },
  touch: {
    command: 'touch',
    shortDescription: 'Create empty file',
    whatItDoes: '`touch` creates a new empty file, or updates the timestamp of an existing file.',
    analogy: 'Like creating a new blank document.',
    nextSteps: ['nano <file>', 'cat <file>', 'ls'],
    relatedConcepts: ['File Creation', 'File System'],
    dangerLevel: 'safe',
  },
  cat: {
    command: 'cat',
    shortDescription: 'Display file contents',
    whatItDoes: '`cat` prints the entire contents of a file to the terminal.',
    analogy: 'Like opening a document and reading it, but the text appears right in the terminal.',
    nextSteps: ['nano <file>', 'grep <pattern> <file>'],
    relatedConcepts: ['File Reading', 'Standard Output', 'Piping'],
    dangerLevel: 'safe',
  },
  echo: {
    command: 'echo',
    shortDescription: 'Print text to terminal',
    whatItDoes: '`echo` prints whatever text you give it to the screen.',
    analogy: 'Like `console.log()` in JavaScript or `print()` in Python.',
    nextSteps: ['echo "text" > file.txt', 'echo $PATH'],
    relatedConcepts: ['Standard Output', 'Variables', 'Redirection'],
    dangerLevel: 'safe',
  },
  rm: {
    command: 'rm',
    shortDescription: 'Remove files or directories',
    whatItDoes: '`rm` permanently deletes files. Unlike moving to trash, this is usually irreversible.',
    analogy: 'Like shredding a document — it\'s gone forever, not in the recycle bin.',
    commonFlags: [
      { flag: '-r', description: 'Recursive — delete folders and everything inside' },
      { flag: '-f', description: 'Force — don\'t ask for confirmation' },
      { flag: '-i', description: 'Interactive — ask before each deletion (safer)' },
    ],
    nextSteps: ['ls'],
    relatedConcepts: ['File Deletion', 'Permissions', 'Safety'],
    dangerLevel: 'caution',
  },
  cp: {
    command: 'cp',
    shortDescription: 'Copy files or directories',
    whatItDoes: '`cp` duplicates a file or folder to a new location.',
    analogy: 'Like copying and pasting a file in Finder/Explorer.',
    commonFlags: [
      { flag: '-r', description: 'Recursive — copy entire directories' },
    ],
    nextSteps: ['ls', 'cat <copied-file>'],
    relatedConcepts: ['File System', 'File Duplication'],
    dangerLevel: 'safe',
  },
  mv: {
    command: 'mv',
    shortDescription: 'Move or rename files',
    whatItDoes: '`mv` moves a file to a new location, or renames it if the destination is in the same directory.',
    analogy: 'Like dragging a file to a different folder, or right-clicking to rename it.',
    nextSteps: ['ls'],
    relatedConcepts: ['File System', 'Renaming', 'File Organization'],
    dangerLevel: 'safe',
  },
  find: {
    command: 'find',
    shortDescription: 'Search for files',
    whatItDoes: '`find` searches for files and directories matching specific criteria.',
    analogy: 'Like using the search bar in Finder/Explorer, but much more powerful.',
    commonFlags: [
      { flag: '-name', description: 'Search by filename pattern' },
      { flag: '-type f', description: 'Only files' },
      { flag: '-type d', description: 'Only directories' },
    ],
    nextSteps: ['grep -r "text" .'],
    relatedConcepts: ['File System', 'Globbing', 'Regular Expressions'],
    dangerLevel: 'safe',
  },
  grep: {
    command: 'grep',
    shortDescription: 'Search text in files',
    whatItDoes: '`grep` searches for text patterns inside files and shows matching lines.',
    analogy: 'Like Ctrl+F (Find) but across multiple files at once.',
    commonFlags: [
      { flag: '-r', description: 'Recursive — search in all subdirectories' },
      { flag: '-i', description: 'Case-insensitive search' },
      { flag: '-n', description: 'Show line numbers' },
      { flag: '-c', description: 'Count matches instead of showing them' },
    ],
    nextSteps: ['find . -name "*.ts"'],
    relatedConcepts: ['Text Search', 'Regular Expressions', 'Piping'],
    dangerLevel: 'safe',
  },
  chmod: {
    command: 'chmod',
    shortDescription: 'Change file permissions',
    whatItDoes: '`chmod` changes who can read, write, or execute a file.',
    analogy: 'Like setting a document to "read-only" or "editable" in Google Docs sharing settings.',
    commonFlags: [
      { flag: '755', description: 'Owner: full, Others: read+execute' },
      { flag: '644', description: 'Owner: read+write, Others: read only' },
      { flag: '+x', description: 'Add execute permission' },
    ],
    nextSteps: ['ls -la'],
    relatedConcepts: ['Permissions', 'File Security', 'Users & Groups'],
    dangerLevel: 'caution',
  },

  // ── Git Commands ──
  'git init': {
    command: 'git init',
    shortDescription: 'Initialize a new Git repository',
    whatItDoes: '`git init` creates a new Git repository in the current directory, adding a hidden `.git/` folder to track all changes.',
    analogy: 'Like pressing "Enable Version History" on a Google Doc — from this point on, every change is tracked.',
    nextSteps: ['git status', 'git add .', 'touch README.md'],
    relatedConcepts: ['Version Control', 'Repository', '.git directory'],
    dangerLevel: 'safe',
  },
  'git status': {
    command: 'git status',
    shortDescription: 'Show repository state',
    whatItDoes: '`git status` shows which files have changed, which are staged for commit, and which are untracked.',
    analogy: 'Like checking "What have I changed since my last save point?"',
    nextSteps: ['git add <file>', 'git diff', 'git commit'],
    relatedConcepts: ['Working Directory', 'Staging Area', 'Untracked Files'],
    dangerLevel: 'safe',
  },
  'git add': {
    command: 'git add',
    shortDescription: 'Stage changes for commit',
    whatItDoes: '`git add` moves changes to the staging area — a "preview" of what your next commit will include.',
    analogy: 'Like putting items in a shopping cart before checkout. `git add` selects what to save.',
    commonFlags: [
      { flag: '.', description: 'Stage ALL changed files' },
      { flag: '-p', description: 'Stage parts of files interactively' },
    ],
    nextSteps: ['git status', 'git commit -m "message"'],
    relatedConcepts: ['Staging Area', 'Working Directory', 'Selective Commits'],
    dangerLevel: 'safe',
  },
  'git commit': {
    command: 'git commit',
    shortDescription: 'Save staged changes',
    whatItDoes: '`git commit` creates a permanent snapshot of your staged changes with a descriptive message.',
    analogy: 'Like pressing "Save" on a document, but this save is permanent and has a description attached.',
    commonFlags: [
      { flag: '-m "message"', description: 'Add commit message inline' },
      { flag: '--amend', description: 'Modify the last commit' },
    ],
    nextSteps: ['git log', 'git push', 'git status'],
    relatedConcepts: ['Commits', 'Snapshots', 'Version History'],
    dangerLevel: 'safe',
  },
  'git log': {
    command: 'git log',
    shortDescription: 'View commit history',
    whatItDoes: '`git log` shows all past commits in reverse chronological order — newest first.',
    analogy: 'Like scrolling through the version history of a Google Doc to see who changed what and when.',
    commonFlags: [
      { flag: '--oneline', description: 'Compact one-line-per-commit view' },
      { flag: '--graph', description: 'Show ASCII branch visualization' },
      { flag: '-n 5', description: 'Show only the last 5 commits' },
    ],
    nextSteps: ['git diff <hash>', 'git show <hash>'],
    relatedConcepts: ['Commit History', 'Hash IDs', 'Branches'],
    dangerLevel: 'safe',
  },
  'git branch': {
    command: 'git branch',
    shortDescription: 'List or create branches',
    whatItDoes: '`git branch` lists all branches, or creates a new one. Branches let you work on features without affecting the main code.',
    analogy: 'Like creating a copy of a document to experiment on, while keeping the original safe.',
    commonFlags: [
      { flag: '<name>', description: 'Create a new branch' },
      { flag: '-d <name>', description: 'Delete a branch' },
      { flag: '-a', description: 'Show all branches (including remote)' },
    ],
    nextSteps: ['git checkout <branch>', 'git merge <branch>'],
    relatedConcepts: ['Branching', 'Feature Branches', 'Git Flow'],
    dangerLevel: 'safe',
  },
  'git checkout': {
    command: 'git checkout',
    shortDescription: 'Switch branches or restore files',
    whatItDoes: '`git checkout` switches between branches, or restores files to a previous state.',
    analogy: 'Like opening a different version of your project from a list of saved copies.',
    commonFlags: [
      { flag: '-b <name>', description: 'Create AND switch to a new branch' },
      { flag: '-- <file>', description: 'Discard changes to a specific file' },
    ],
    nextSteps: ['git status', 'git branch', 'git log'],
    relatedConcepts: ['Branching', 'HEAD', 'Detached HEAD'],
    dangerLevel: 'caution',
  },
  'git merge': {
    command: 'git merge',
    shortDescription: 'Merge branches together',
    whatItDoes: '`git merge` combines changes from one branch into another.',
    analogy: 'Like taking your experimental copy of a document and merging the good changes back into the original.',
    nextSteps: ['git log --graph', 'git status'],
    relatedConcepts: ['Merging', 'Merge Conflicts', 'Fast-Forward'],
    dangerLevel: 'caution',
  },
  'git diff': {
    command: 'git diff',
    shortDescription: 'Show changes between states',
    whatItDoes: '`git diff` shows exactly what lines were added, removed, or modified.',
    analogy: 'Like the "Track Changes" feature in Word — green for additions, red for deletions.',
    commonFlags: [
      { flag: '--staged', description: 'Show changes that are staged for commit' },
      { flag: '<branch1> <branch2>', description: 'Compare two branches' },
    ],
    nextSteps: ['git add <file>', 'git status'],
    relatedConcepts: ['Diffs', 'Patches', 'Code Review'],
    dangerLevel: 'safe',
  },
  'git push': {
    command: 'git push',
    shortDescription: 'Upload commits to remote',
    whatItDoes: '`git push` sends your local commits to a remote repository (like GitHub).',
    analogy: 'Like uploading your saved files to cloud storage so others can access them.',
    commonFlags: [
      { flag: '-u origin <branch>', description: 'Set upstream tracking branch' },
      { flag: '--force', description: '⚠️ Overwrite remote history (dangerous!)' },
    ],
    nextSteps: ['git log', 'git pull'],
    relatedConcepts: ['Remote Repositories', 'Origin', 'Upstream'],
    dangerLevel: 'safe',
  },
  'git pull': {
    command: 'git pull',
    shortDescription: 'Download and merge remote changes',
    whatItDoes: '`git pull` fetches changes from the remote repository and merges them into your current branch.',
    analogy: 'Like syncing your cloud storage — downloading everyone else\'s changes to your local copy.',
    nextSteps: ['git status', 'git log'],
    relatedConcepts: ['Fetching', 'Merging', 'Remote Tracking'],
    dangerLevel: 'safe',
  },
  'git stash': {
    command: 'git stash',
    shortDescription: 'Temporarily shelve changes',
    whatItDoes: '`git stash` saves your uncommitted changes aside so you can work on something else, then come back later.',
    analogy: 'Like putting your half-finished work in a drawer so you can clean your desk for a different task.',
    commonFlags: [
      { flag: 'pop', description: 'Restore the most recent stash' },
      { flag: 'list', description: 'Show all stashed changes' },
    ],
    nextSteps: ['git stash pop', 'git stash list'],
    relatedConcepts: ['Work In Progress', 'Context Switching'],
    dangerLevel: 'safe',
  },

  // ── npm commands ──
  'npm install': {
    command: 'npm install',
    shortDescription: 'Install packages',
    whatItDoes: '`npm install` downloads and installs JavaScript packages from the npm registry into your project.',
    analogy: 'Like adding an app from the App Store — npm downloads the code someone else wrote so you can use it.',
    commonFlags: [
      { flag: '<package>', description: 'Install a specific package' },
      { flag: '--save-dev', description: 'Install as development dependency' },
      { flag: '-g', description: 'Install globally (available everywhere)' },
    ],
    nextSteps: ['cat package.json', 'npm run dev'],
    relatedConcepts: ['Package Management', 'Dependencies', 'node_modules'],
    dangerLevel: 'safe',
  },
  'npm run dev': {
    command: 'npm run dev',
    shortDescription: 'Start development server',
    whatItDoes: '`npm run dev` starts the local development server so you can preview your app in the browser.',
    analogy: 'Like pressing "Play" to see your app running live.',
    nextSteps: ['Open http://localhost:3000'],
    relatedConcepts: ['Dev Server', 'Hot Reload', 'Vite'],
    dangerLevel: 'safe',
  },
  'npm run test': {
    command: 'npm run test',
    shortDescription: 'Run test suite',
    whatItDoes: '`npm run test` executes your project\'s automated tests to verify everything works correctly.',
    analogy: 'Like running a spell-check on your code — it verifies all the expected behaviors are correct.',
    nextSteps: ['Read test results', 'Fix failing tests'],
    relatedConcepts: ['Testing', 'Unit Tests', 'Test Driven Development'],
    dangerLevel: 'safe',
  },
};

// ═══════════════════════════════════════════════════════════════
// §4. SAFETY SHIELD
// ═══════════════════════════════════════════════════════════════

export interface SafetyAlert {
  command: string;
  severity: 'warning' | 'danger';
  explanation: string;
  safeAlternatives: string[];
  conceptTeaching: string;
}

const DANGEROUS_PATTERNS: Array<{
  pattern: RegExp;
  severity: SafetyAlert['severity'];
  explanation: string;
  alternatives: string[];
  concept: string;
}> = [
  {
    pattern: /^rm\s+(-rf?|--force|-r\s+-f|-f\s+-r)\s+[\/~]/i,
    severity: 'danger',
    explanation: '`rm -rf /` would delete EVERYTHING on a real computer. Every file. Every program. The entire operating system. This is the most destructive command in Unix.',
    alternatives: ['rm file.txt', 'rm -r folder/', 'rm -i file.txt (with confirmation)'],
    concept: 'The `-r` flag means "recursive" (delete everything inside folders too). The `-f` flag means "force" (don\'t ask for confirmation). Together with `/` (root directory), this targets the entire system.',
  },
  {
    pattern: /^chmod\s+777/i,
    severity: 'warning',
    explanation: '`chmod 777` gives EVERYONE full permissions (read, write, execute) to this file. This is a security risk in production environments.',
    alternatives: ['chmod 755 file (owner: rwx, others: rx)', 'chmod 644 file (owner: rw, others: r)', 'chmod +x file (add execute only)'],
    concept: 'File permissions control who can read, write, and execute files. 7 = rwx (all permissions), so 777 means everyone gets full access.',
  },
  {
    pattern: /^git\s+push\s+.*--force/i,
    severity: 'warning',
    explanation: '`git push --force` overwrites the remote history. If teammates have pulled the old history, their repos will break.',
    alternatives: ['git push --force-with-lease (safer — checks for new remote commits first)', 'git push (normal push)'],
    concept: 'Force-pushing rewrites public history. Use `--force-with-lease` instead — it only force-pushes if no one else has pushed since your last fetch.',
  },
  {
    pattern: /^git\s+reset\s+--hard/i,
    severity: 'warning',
    explanation: '`git reset --hard` permanently discards all uncommitted changes. There is no undo.',
    alternatives: ['git stash (save changes for later)', 'git reset --soft (keep changes staged)', 'git checkout -- <file> (discard specific file)'],
    concept: '`--hard` resets your working directory AND staging area to match the target commit, throwing away everything else. Use `--soft` to keep your changes.',
  },
  {
    pattern: /^sudo\s+/i,
    severity: 'warning',
    explanation: '`sudo` runs a command with administrator (root) privileges. This bypasses all safety restrictions.',
    alternatives: ['Run without sudo first to see if you actually need elevated permissions'],
    concept: '`sudo` stands for "Super User DO". It gives the command full system access. Only use it when you understand exactly what the command does.',
  },
  {
    pattern: /^:(){ :\|:& };:/,
    severity: 'danger',
    explanation: 'This is a "fork bomb" — it creates processes that create more processes infinitely, crashing the system.',
    alternatives: ['Don\'t run this! This is a well-known destructive command.'],
    concept: 'A fork bomb is a denial-of-service attack that exploits the `fork()` system call to create infinite processes until the system runs out of resources.',
  },
];

export const checkSafety = (input: string): SafetyAlert | null => {
  const trimmed = input.trim();
  for (const { pattern, severity, explanation, alternatives, concept } of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        command: trimmed,
        severity,
        explanation,
        safeAlternatives: alternatives,
        conceptTeaching: concept,
      };
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════
// §5. EXPERTISE ADAPTATION
// ═══════════════════════════════════════════════════════════════

const COMMAND_USAGE_KEY = 'cortex-command-usage';

export interface CommandUsage {
  [command: string]: {
    count: number;
    lastUsed: number;
    firstUsed: number;
    errorCount: number;
  };
}

export const getCommandUsage = (): CommandUsage => {
  try {
    const raw = localStorage.getItem(COMMAND_USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const trackCommandUsage = (command: string, isError: boolean) => {
  const usage = getCommandUsage();
  const baseCmd = command.split(' ').slice(0, 2).join(' ').toLowerCase();
  const now = Date.now();

  if (!usage[baseCmd]) {
    usage[baseCmd] = { count: 0, lastUsed: now, firstUsed: now, errorCount: 0 };
  }

  usage[baseCmd].count++;
  usage[baseCmd].lastUsed = now;
  if (isError) usage[baseCmd].errorCount++;

  try {
    localStorage.setItem(COMMAND_USAGE_KEY, JSON.stringify(usage));
  } catch { /* localStorage full */ }
};

export type ExpertiseLevel = 'first_time' | 'beginner' | 'familiar' | 'proficient' | 'expert';

export const getExpertiseLevel = (command: string): ExpertiseLevel => {
  const usage = getCommandUsage();
  const baseCmd = command.split(' ').slice(0, 2).join(' ').toLowerCase();
  const data = usage[baseCmd];

  if (!data) return 'first_time';
  if (data.count <= 2) return 'beginner';
  if (data.count <= 6) return 'familiar';
  if (data.count <= 15) return 'proficient';
  return 'expert';
};

export const shouldShowExplanation = (command: string): boolean => {
  const level = getExpertiseLevel(command);
  return level === 'first_time' || level === 'beginner';
};

export const shouldShowNextSteps = (command: string): boolean => {
  const level = getExpertiseLevel(command);
  return level === 'first_time' || level === 'beginner' || level === 'familiar';
};

// ═══════════════════════════════════════════════════════════════
// §6. CONTEXT-AWARE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

export const getContextualSuggestions = (moduleTopic: string, moduleKeyConcepts: string[]): string[] => {
  const topicLower = moduleTopic.toLowerCase();
  const conceptsLower = moduleKeyConcepts.map(c => c.toLowerCase());
  const allContext = [topicLower, ...conceptsLower].join(' ');

  const suggestions: string[] = [];

  if (allContext.includes('git') || allContext.includes('version control') || allContext.includes('repository')) {
    suggestions.push('git init', 'git status', 'git add .', 'git commit -m "message"', 'git log --oneline', 'git branch');
  }
  if (allContext.includes('npm') || allContext.includes('node') || allContext.includes('package') || allContext.includes('javascript') || allContext.includes('react')) {
    suggestions.push('npm init -y', 'npm install', 'npm run dev', 'npm run test', 'node --version');
  }
  if (allContext.includes('python') || allContext.includes('pip') || allContext.includes('machine learning') || allContext.includes('data')) {
    suggestions.push('python3 --version', 'pip install', 'python3 script.py', 'pip list');
  }
  if (allContext.includes('linux') || allContext.includes('unix') || allContext.includes('file system') || allContext.includes('directory')) {
    suggestions.push('ls -la', 'pwd', 'mkdir', 'touch', 'find . -name "*.ts"', 'chmod');
  }
  if (allContext.includes('docker') || allContext.includes('container')) {
    suggestions.push('docker build', 'docker run', 'docker ps', 'docker images');
  }

  // Default basics if nothing matches
  if (suggestions.length === 0) {
    suggestions.push('ls', 'pwd', 'help', 'echo "Hello, World!"', 'cat README.md');
  }

  return suggestions;
};

// ═══════════════════════════════════════════════════════════════
// §7. WELCOME MESSAGE GENERATOR
// ═══════════════════════════════════════════════════════════════

export const generateWelcomeMessage = (moduleTopic?: string, userName?: string): string[] => {
  const name = userName || 'Scholar';
  const lines: string[] = [];

  lines.push('');
  lines.push('╭──────────────────────────────────────────────────╮');
  lines.push('│  🧠 CORTEX LEARNING TERMINAL v2.0                │');
  lines.push(`│  Welcome back, ${name.padEnd(35)}│`);
  lines.push('├──────────────────────────────────────────────────┤');

  if (moduleTopic) {
    const truncTopic = moduleTopic.length > 40 ? moduleTopic.slice(0, 37) + '...' : moduleTopic;
    lines.push(`│  📚 Module: ${truncTopic.padEnd(36)}│`);
    lines.push('│                                                  │');
    lines.push('│  Type commands to practice. Mistakes are          │');
    lines.push('│  welcome — I\'ll teach you along the way.          │');
  } else {
    lines.push('│  Every command is a learning moment.              │');
    lines.push('│  Type "help" to see available commands.           │');
  }

  lines.push('│                                                  │');
  lines.push('│  💡 TIP: Try typing "sara help" for AI guidance   │');
  lines.push('╰──────────────────────────────────────────────────╯');
  lines.push('');

  return lines;
};

// ═══════════════════════════════════════════════════════════════
// §8. TEACHING OUTPUT FORMATTER
// ═══════════════════════════════════════════════════════════════

export const formatTeachingCard = (
  title: string,
  content: string[],
  type: 'info' | 'success' | 'warning' | 'error' | 'tip' = 'info'
): string[] => {
  const icons: Record<string, string> = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    tip: '🎯',
  };

  const maxWidth = Math.max(
    title.length + 4,
    ...content.map(l => l.length + 4),
    48
  );

  const pad = (text: string) => text.padEnd(maxWidth - 4);

  const lines: string[] = [];
  lines.push(`╭${'─'.repeat(maxWidth - 2)}╮`);
  lines.push(`│ ${icons[type]} ${pad(title)} │`);
  lines.push(`├${'─'.repeat(maxWidth - 2)}┤`);

  for (const line of content) {
    lines.push(`│  ${pad(line)} │`);
  }

  lines.push(`╰${'─'.repeat(maxWidth - 2)}╯`);
  return lines;
};

export const formatMistakeResponse = (
  input: string,
  fuzzyMatch: FuzzyMatch | null,
  intent: DetectedIntent | null
): string[] => {
  const lines: string[] = [];

  if (fuzzyMatch && !fuzzyMatch.isExact) {
    lines.push('');
    lines.push(`🔧 Did you mean: \x1b[1m${fuzzyMatch.command}\x1b[0m?`);
    lines.push('');

    // Get knowledge for the suggested command
    const knowledge = COMMAND_KNOWLEDGE[fuzzyMatch.command];
    if (knowledge) {
      lines.push(`   ${knowledge.shortDescription}`);
    }
    lines.push('');
    return lines;
  }

  if (intent) {
    lines.push('');
    lines.push(`🔍 I see what you\'re trying to do!`);
    lines.push('');
    const explainLines = intent.explanation.split('\n');
    for (const line of explainLines) {
      lines.push(`   ${line}`);
    }
    lines.push('');
    lines.push(`   💡 Suggested command: \x1b[1m${intent.suggestedCommand}\x1b[0m`);
    lines.push('');
    return lines;
  }

  // Fallback — still helpful
  lines.push('');
  lines.push(`   Hmm, "\x1b[33m${input}\x1b[0m" isn't a recognized command.`);
  lines.push('');
  lines.push('   Try:');
  lines.push('   • \x1b[1mhelp\x1b[0m      — See all available commands');
  lines.push('   • \x1b[1msara help\x1b[0m — Ask SARA for guidance');
  lines.push('');
  return lines;
};

export const formatSafetyResponse = (alert: SafetyAlert): string[] => {
  const lines: string[] = [];
  const icon = alert.severity === 'danger' ? '🛡️' : '⚠️';
  const label = alert.severity === 'danger' ? 'SAFETY SHIELD ACTIVATED' : 'CAUTION';

  lines.push('');
  lines.push(...formatTeachingCard(
    `${icon} ${label}`,
    [
      '',
      ...alert.explanation.split('\n').map(l => l.trim()),
      '',
      '💡 CONCEPT:',
      ...alert.conceptTeaching.split('\n').map(l => `   ${l.trim()}`),
      '',
      '🔧 SAFE ALTERNATIVES:',
      ...alert.safeAlternatives.map(a => `   • ${a}`),
    ],
    alert.severity === 'danger' ? 'error' : 'warning'
  ));
  lines.push('');
  return lines;
};

export const formatCommandExplanation = (command: string, expertise: ExpertiseLevel): string[] => {
  // Build the lookup key (try "git add" first, then "git", then base command)
  const parts = command.toLowerCase().trim().split(/\s+/);
  const lookupKeys = [];
  if (parts.length >= 2) lookupKeys.push(parts.slice(0, 2).join(' '));
  lookupKeys.push(parts[0]);

  let knowledge: CommandKnowledge | undefined;
  for (const key of lookupKeys) {
    if (COMMAND_KNOWLEDGE[key]) {
      knowledge = COMMAND_KNOWLEDGE[key];
      break;
    }
  }

  if (!knowledge) return [];
  if (expertise === 'expert' || expertise === 'proficient') return [];

  const lines: string[] = [];

  if (expertise === 'first_time') {
    // Full explanation for first-timers
    lines.push('');
    const cardContent: string[] = ['', knowledge.whatItDoes, ''];

    if (knowledge.analogy) {
      cardContent.push(`🌏 ANALOGY: ${knowledge.analogy}`);
      cardContent.push('');
    }

    if (knowledge.commonFlags && knowledge.commonFlags.length > 0) {
      cardContent.push('COMMON FLAGS:');
      for (const flag of knowledge.commonFlags) {
        cardContent.push(`  ${flag.flag.padEnd(12)} ${flag.description}`);
      }
      cardContent.push('');
    }

    if (knowledge.nextSteps && knowledge.nextSteps.length > 0) {
      cardContent.push('🎯 TRY NEXT:');
      for (const step of knowledge.nextSteps) {
        cardContent.push(`  • ${step}`);
      }
    }

    lines.push(...formatTeachingCard(
      `💡 ${knowledge.shortDescription.toUpperCase()}`,
      cardContent,
      'info'
    ));
    lines.push('');
  } else if (expertise === 'beginner') {
    // Brief explanation for beginners
    lines.push('');
    lines.push(`   💡 ${knowledge.whatItDoes.split('.')[0]}.`);
    if (knowledge.nextSteps && knowledge.nextSteps.length > 0) {
      lines.push(`   🎯 Try next: ${knowledge.nextSteps[0]}`);
    }
    lines.push('');
  } else if (expertise === 'familiar') {
    // Just next steps hint
    if (knowledge.nextSteps && knowledge.nextSteps.length > 0) {
      lines.push(`   🎯 Next: ${knowledge.nextSteps[0]}`);
    }
  }

  return lines;
};
