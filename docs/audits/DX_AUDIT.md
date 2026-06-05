# Developer Experience Audit (DX_AUDIT.md)

This report audits the developer experience (DX) of Vidyal.ai, evaluating naming quality, project discoverability, onboarding speed, debugging difficulty, and code readability.

---

### 1. Onboarding Speed & Code Readability

#### Assessment
If a senior engineer joined the team today, they would face a steep learning curve due to the scale and complexity of the key page components:
*   **The 4,000-Line Codebase Gate**:
    *   To debug or modify the notes editor, they must open [StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx) (4,188 lines).
    *   They would have to trace through multiple inline classes, active recall flashcards, and Web Audio oscillators before finding the text formatting and AI copilot handlers.
*   **The Sandbox Execution Gate**:
    *   To debug compiler output issues, they must navigate [CodeSandbox.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/CodeSandbox.tsx) (3,598 lines), which mixes UI render blocks with simulated test runners and package dependency resolvers.

---

### 2. Discoverability & Folder Placement

#### Layout Issues
The project mixes UI elements with core business logic, making features hard to find:
*   **Misplaced Core Features**:
    *   Specialized tools like `CodeSandbox.tsx` (IDE virtual simulation) and `ShellTerminal.tsx` (ANSI terminal wrapper) are located in `components/ui/` alongside generic UI primitives.
    *   A new developer would typically expect to find these tools under a dedicated `features/` directory.
*   **The Portfolio Leak**:
    *   A nested personal website (`portfolio/`) is included inside the main application source folder, complete with its own redundant asset structures and styles. This clutters the workspace.

---

### 3. Debugging Difficulty

#### Lack of Isolation
*   **Mixed Responsibilities**: Because the codebase does not extract business logic into custom hooks, isolating bugs is difficult. 
*   **No Centralized Log Collectors**: Network calls, Gemini API prompts, and database sync handlers are scattered across various pages. A network failure during note-taking must be debugged within the notes component itself, rather than in a dedicated API service handler.

---

### 4. Compiler & Type-Safety Issues

*   **React 19 Types Mismatch**:
    *   The project uses React 19 (`"react": "^19.2.6"`), but the devDependencies specify React 18 types (`"@types/react": "^18.3.28"`).
    *   This type mismatch can cause compiler warnings when working with modern React 19 hooks.
*   **Types File Extension**:
    *   The file `features/study/types.tsx` uses a `.tsx` extension despite containing no React components or JSX code. It should be renamed to `.ts` to follow TypeScript conventions.
*   **Missing Barrel Exports**:
    *   The lack of barrel exports (`index.ts` files) results in long, verbose import lists at the top of page components.
