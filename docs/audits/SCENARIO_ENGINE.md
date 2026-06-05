# Cortex Scenario Engine

This document specifies the design, system states, and schemas for the **Cortex Scenario Engine**. The engine drives advanced interactive sandboxes that drop learners into realistic, broken environments (e.g. broken git syncs, corrupted files) to teach troubleshooting through real-world simulation.

---

## 1. Sandbox Isolation Architecture

To ensure scenarios are risk-free and do not corrupt the learner's primary project directory, the Scenario Engine runs in an isolated workspace container.

```mermaid
flowchart LR
    subgraph Main Workspace
        mainFS[Primary Virtual FS]
        mainGit[Primary Git State]
    end
    
    subgraph Isolated Scenario Container
        scenFS[Scenario-Specific VFS Snapshot]
        scenGit[Scenario-Specific Git State]
    end
    
    launch[Launch Scenario] -->|Freeze & Save| mainFS & mainGit
    launch -->|Load Preset| scenFS & scenGit
    
    terminal[Active Terminal UI] <==> Isolated Scenario Container
    
    exit[Exit/Complete Scenario] -->|Wipe Snapshot| Isolated Scenario Container
    exit -->|Restore state| mainFS & mainGit
```

When a scenario is launched:
1. The **Primary VFS** and **Primary Git state** are serialized and saved in local storage.
2. The terminal switches its context to the **Scenario VFS Snapshot**.
3. Upon exit or completion, the scenario state is wiped and the primary state is restored.

---

## 2. Scenario Data Schema

Each scenario is configured using a declarative structure defining the starting environment states and step check rules.

```json
{
  "scenarioId": "broken_repo_sync",
  "title": "Broken Repo Sync (Merge Conflict)",
  "difficulty": "Intermediate",
  "estimatedMinutes": 15,
  "description": "Your coworker pushed conflicting changes to the main branch. Resolve the merge conflict to successfully pull.",
  "startingDir": "/workspace/project",
  "vfsState": {
    "/workspace/project/index.js": {
      "type": "file",
      "content": "<<<<<<< HEAD\nconst port = 3000;\n=======\nconst port = 5000;\n>>>>>>> feature/ports\nconsole.log(`Server starting on port ${port}`);"
    }
  },
  "gitState": {
    "initialized": true,
    "currentBranch": "main",
    "branches": ["main", "feature/ports"],
    "commits": [
      { "id": "c1", "message": "Initial structure", "files": [] }
    ],
    "staging": [],
    "conflictFiles": ["index.js"]
  },
  "steps": [
    {
      "stepIndex": 1,
      "instruction": "Open 'index.js' in the editor (nano or cat) and resolve the merge conflict markers. Keep the port set to 5000.",
      "validationType": "file_contains",
      "validationParam": "index.js",
      "validationPattern": "^(?!.*(<<<<<<<|=======|>>>>>>>)).*port\\s*=\\s*5000.*",
      "hints": [
        "Use 'nano index.js' to edit the file.",
        "Delete the Git conflict markers: <<<<<<<, =======, and >>>>>>>.",
        "Ensure const port is set to 5000."
      ]
    },
    {
      "stepIndex": 2,
      "instruction": "Stage the resolved index.js file.",
      "validationType": "git_staged",
      "validationParam": "index.js",
      "hints": [
        "Run 'git add index.js' to tell Git the conflict is resolved."
      ]
    },
    {
      "stepIndex": 3,
      "instruction": "Commit the resolution merge.",
      "validationType": "git_committed",
      "validationParam": "Merge branch",
      "hints": [
        "Run: git commit -m \"Merge branch 'feature/ports' resolved\""
      ]
    }
  ]
}
```

---

## 3. Reference Scenarios

### Scenario 1: The Broken Repository Sync
* **Premise**: User is placed on a branch with unresolved merge markers.
* **Goal**: Understand conflict markers, edit files to resolve conflicts, and complete the merge commit.
* **Key Learning Concepts**: Conflict boundaries, staging as resolution marker, merge status lifecycle.

### Scenario 2: Accidental File Deletion Recovery
* **Premise**: A critical source file `server.js` was deleted using standard shell `rm server.js`, but it exists in Git history.
* **Goal**: Recover the file without starting the project over.
* **Environmental Setup**: VFS misses `server.js`. Git repository has the file in its commit list.
* **Action Steps**:
  1. Check status: `git status` (shows deleted file).
  2. Restore the file from last commit: `git checkout HEAD -- server.js` or `git restore server.js`.
  3. Verify file recovery: `cat server.js`.

---

## 4. Scenario Lifecycle Management

The lifecycle is controlled by the [scenarioEngine.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/utils/scenarioEngine.ts) module:

```typescript
export class ScenarioSession {
  private activeScenario: string | null = null;
  private backupState: { vfs: any; git: any } | null = null;

  public startScenario(scenario: any): void {
    // 1. Back up current user state
    this.backupState = {
      vfs: JSON.parse(localStorage.getItem('virtualFS') || '{}'),
      git: JSON.parse(localStorage.getItem('gitState') || '{}')
    };

    // 2. Load Scenario State
    localStorage.setItem('virtualFS', JSON.stringify(scenario.vfsState));
    localStorage.setItem('gitState', JSON.stringify(scenario.gitState));
    this.activeScenario = scenario.scenarioId;
  }

  public stopScenario(): void {
    if (this.backupState) {
      // Restore state
      localStorage.setItem('virtualFS', JSON.stringify(this.backupState.vfs));
      localStorage.setItem('gitState', JSON.stringify(this.backupState.git));
    }
    this.activeScenario = null;
    this.backupState = null;
  }
}
```

> [!CAUTION]
> If a user refreshes their browser or closes the window midway through a scenario, the app must auto-restore their backup state on reboot. Failing to do this could wipe out the learner's actual project file system progress.

---

## 5. UI Layout

When a scenario is active:
* A bold, red/orange glowing border (CSS: `animate-pulse border-amber-500/50`) surrounds the terminal to signal **"Isolated Sandbox Mode"**.
* An exit button is displayed prominently at the bottom right of the terminal panel: **[Exit Scenario & Restore Files]**.
