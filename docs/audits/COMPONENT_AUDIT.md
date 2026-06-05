# Component Audit Report (COMPONENT_AUDIT.md)

This report audits every major component in the Vidyal.ai repository, identifying "God Components," analyzing props complexity, composition quality, and naming conventions.

---

### 1. "God Components" (Exceeding 500 Lines)

We have identified six major components that violate the single-responsibility principle. These files contain business logic, networking, complex local UI structures, and state management all in one file.

#### File 1: [StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx) (4,188 Lines)
*   **Role**: Primary immersive study layout for learning paths.
*   **Concerns**:
    *   **Logical Bloat**: Contains three nested sub-components (`StudySessionErrorBoundary`, `KeyboardSynth`, `FlippingRecallCard`, `RichNotesEditor`) directly in the same file.
    *   **Networking**: Implements direct service connections to Gemini APIs (chat, autocomplete, quiz generation).
    *   **Side Effects**: Initiates Web Audio API oscillators, handles manual text document editing keyboard shortcuts (markdown symbols wrapping, tab characters), and implements local storage disaster backups.
*   **Refactoring Recommendation**: 
    1. Extract `RichNotesEditor` into its own file in `features/study/components/RichNotesEditor.tsx`.
    2. Move `KeyboardSynth` to a utility class inside `services/soundscapeService.ts`.
    3. Extract `FlippingRecallCard` to `features/study/components/FlippingRecallCard.tsx`.
    4. Move the chat and quiz API orchestrations into custom hooks.

#### File 2: [ConceptMapRenderer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/components/ConceptMapRenderer.tsx) (3,224 Lines)
*   **Role**: Renders interactive 2D HTML5 canvas concept networks.
*   **Concerns**:
    *   **Visual Modes Overload**: Implements rendering mathematics for 25 different layout schemas (mindmap, chronos, orbital, spiral, nexus, etc.) in a single file.
    *   **Event Handling**: Handles mouse clicks, canvas zoom/drag offsets, node freeze/defrost vectors, and node click detail events.
    *   **Complex Canvas Context Manipulation**: Intermixes direct HTML5 2D canvas drawing logic (`ctx.arc()`, `ctx.lineTo()`, `ctx.bezierCurveTo()`) with React render state cycles.
*   **Refactoring Recommendation**:
    1. Separate the layout calculation algorithms (orbital coordinates, radial projections, fractal trees) into a dedicated pure mathematical helper file (`features/study/utils/layoutAlgorithms.ts`).
    2. Abstract direct canvas context painting functions into a custom rendering engine class (`features/study/utils/canvasPainter.ts`).

#### File 3: [CodeSandbox.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/CodeSandbox.tsx) (3,598 Lines)
*   **Role**: Provides a simulated browser IDE sandbox.
*   **Concerns**:
    *   **State Accumulation**: Manages local virtual files tree, active file paths, simulation stdout/stderr outputs, terminal execution arrays, and package installation mocks.
    *   **Simulated Compilation**: Houses a custom simulator engine that interprets virtual JS code, monitors imports, and mocks unit tests.
*   **Refactoring Recommendation**:
    1. Extract the sandbox file system logic and compiler simulator into a hook `useCodeSandboxSimulator.ts`.
    2. Move the sandbox file tree UI, terminal UI, and editor panels into smaller, separate React presentational components.

#### File 4: [ShellTerminal.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx) (~1,500 Lines)
*   **Role**: Virtual developer terminal console.
*   **Concerns**:
    *   **Simulated Commands Engine**: Embeds commands execution logic (ls, cd, cat, grep, npm run, etc.) and file system structures.
    *   **ANSI Code Rendering**: Manages escape sequence parsing, screen resizing calculations, text cursor blinking loops, and block selection buffers in a single react file.
*   **Refactoring Recommendation**:
    1. Extract the command interpreter to a clean class `ShellInterpreter.ts`.
    2. Move UI rendering, scrollbar metrics, and cursor overlays into separated view files.

---

### 2. Component Quality Audit

#### Props Complexity
*   **Observations**: Components like `ConceptMapRenderer` accept props containing over 25 callback handlers, visual overrides, modes, status maps, and filter parameters (e.g. `scholarPersona`, `soundRoomMode`, `zoomScale`, `isHeatMapMode`, `activeChallengeNodeId`). 
*   **Impact**: High prop clutter makes the component fragile. Adding new properties causes ripple effects across parent components.
*   **Solution**: Group related configurations into a single config object interface (e.g., `ConceptMapSettings`).

#### Reusability
*   Many components placed in `components/ui/` (e.g., `InteractiveWhiteboard`, `DevRagTester`) are completely specialized layouts and cannot be reused across other modules. They clutter the global UI folder and create confusion. Only generic elements (buttons, inputs, tooltips, dialogs) should reside in the global UI folder.

#### Composition vs. Configuration
*   **Anti-pattern**: Relying heavily on configuration properties (`mode`, `focusMode`, `isZenMode`) to completely switch component render paths, rather than using React child composition.
*   **Refactored Design Pattern**: Instead of `<ConceptMapRenderer mode="orbit" />`, use children layout injections like:
    ```tsx
    <ConceptMapContainer>
      <OrbitView conceptMap={map} />
    </ConceptMapContainer>
    ```

#### Naming Conventions
*   **Consistency**: File structures are clean (PascalCase for components, camelCase for hooks and services).
*   **Anomalies**:
    *   `frontend/src/features/study/types.tsx` uses a `.tsx` extension but contains only TypeScript interfaces and constant arrays. It should be renamed to `types.ts`.
    *   `command.jsx` and `dialog.jsx` in the UI directory mix javascript with typescript files. They are dead code, but their presence violates typescript strictness consistency.
