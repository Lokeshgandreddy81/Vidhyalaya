# File Structure Review (STRUCTURE_REVIEW.md)

This report audits the folder consistency, file placement conventions, type organizations, barrel export status, and configuration consistency of Vidyal.ai.

---

### 1. Naming & File Extension Consistency

#### Inconsistencies Identified
*   **JS/TS Mix**: While the codebase is written in TypeScript, we find several JavaScript `.jsx` files:
    *   [frontend/src/components/ui/command.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.jsx) (Unused boilerplate)
    *   [frontend/src/components/ui/dialog.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/dialog.jsx) (Unused boilerplate)
    *   [frontend/src/portfolio/pages/Home.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/portfolio/pages/Home.jsx) (Active route)
    *   [frontend/src/portfolio/pages/ProjectAccess.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/portfolio/pages/ProjectAccess.jsx) (Active route)
    *   [frontend/src/portfolio/pages/Resume.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/portfolio/pages/Resume.jsx) (Active route)
*   **Incorrect File Extension**: [frontend/src/features/study/types.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/types.tsx) uses a `.tsx` extension but contains only pure TypeScript interfaces and constant arrays. It does not export any React components or use JSX syntax. It should be renamed to `.ts`.

---

### 2. File Placement & Folder Conventions

*   **UI Components vs. Features**:
    *   Files like `CodeSandbox.tsx` (140 KB), `ShellTerminal.tsx` (72 KB), and `InteractiveWhiteboard.tsx` (70 KB) are nested in `components/ui/`.
    *   *Issue*: These are complex features containing specific business logic (simulation engine, ANSI escaping, drawing templates). The `components/ui/` folder should contain only simple, highly reusable presentation components (buttons, badges, inputs, dropdowns).
*   **Styles Organization**:
    *   CSS styles are scattered: `CodeSandbox.css` and `AssistantGlass.css` are in `styles/`, but `portfolio.css` is in `portfolio/`.
    *   *Recommendation*: Consolidate all feature-specific style sheets inside their respective feature folders (e.g., `features/study/styles/`).

---

### 3. Barrel Exports Status

*   **Observation**: The project does not leverage barrel exports (`index.ts` files that export all files in a folder).
*   **Impact**: Imports across page layouts are verbose and hard to read:
    ```typescript
    import ContentRenderer from '../components/ui/ContentRenderer';
    import AITerminalOverlay from '../components/ui/AITerminalOverlay';
    import CodeSandbox from '../components/ui/CodeSandbox';
    ```
*   **Solution**: Introduce `index.ts` files in each shared folder (e.g., `components/ui/`, `features/study/`) to streamline imports:
    ```typescript
    import { ContentRenderer, AITerminalOverlay, CodeSandbox } from '../components/ui';
    ```

---

### 4. Type & Constants Organization

*   **Anti-pattern: Constants in Type Files**:
    *   In `types.tsx` (study features), constant color matrices are declared directly:
        ```typescript
        export const NODE_COLORS = [...];
        export const ZEN_NODE_COLORS = [...];
        ```
    *   *Issue*: Mixing type declarations with runtime JavaScript constants can lead to accidental bundler inclusion and prevents clean compiler separation.
*   **Solution**: Move all colors, padding constants, and configurations to a dedicated `constants.ts` file inside `features/study/`.
