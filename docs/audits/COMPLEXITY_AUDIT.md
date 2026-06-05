# Complexity Audit (COMPLEXITY_AUDIT.md)

This report logs complexity hotspots in Vidyal.ai, categorizing components by lines of code (LoC) thresholds, tracking massive functions, and identifying hooks containing mixed responsibilities.

---

### 1. Component Complexity Thresholds

We have categorized components by scale to identify maintenance bottlenecks.

#### Components Exceeding 1,000 Lines (Critical Complexity Hotspots)
*   **[StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx) (4,188 Lines)**
    *   *Why*: Houses four helper sub-components inline, manages state hooks for the chatbot, active timers, sound synthesis oscillators, and includes keyboard shortcut mapping routines.
*   **[CodeSandbox.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/CodeSandbox.tsx) (3,598 Lines)**
    *   *Why*: Embeds an entire JavaScript compiler execution engine, package installer mocks, unit test assertion suites, and multi-file tree navigators in a single component.
*   **[ConceptMapRenderer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/components/ConceptMapRenderer.tsx) (3,224 Lines)**
    *   *Why*: Controls canvas operations, zoom/drag calculations, visual projections for 25 distinct mode settings, and node defrosting vectors.
*   **[ShellTerminal.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx) (~1,500 Lines)**
    *   *Why*: Mocks a bash shell interpreter (cd, ls, grep, cat, npm), tracks input buffers, executes caret sync timers, and parses escape commands.

#### Components Exceeding 500 Lines (High Complexity Hotspots)
*   **[CreatePath.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/CreatePath.tsx) (approx. 950 Lines / 82.5 KB)**
    *   *Why*: Manages step wizard validation states, commitments settings, and Gemini path formatting prompts.
*   **[Dashboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Dashboard.tsx) (approx. 800 Lines / 67 KB)**
    *   *Why*: Hosts dashboard tabs, XP progress charts, level requirements, calendar logs, and achievement panels.
*   **[SmartStudy.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/SmartStudy.tsx) (approx. 750 Lines / 62.4 KB)**
    *   *Why*: Contains classroom session listeners, interactive whiteboard integrations, and video segment queries.

#### Components Exceeding 300 Lines (Moderate Complexity Hotspots)
*   [AdminDashboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/AdminDashboard.tsx) (approx. 400 Lines)
*   [Library.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Library.tsx) (approx. 380 Lines)
*   [PathExplorer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/PathExplorer.tsx) (approx. 350 Lines)
*   [Schedule.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Schedule.tsx) (approx. 320 Lines)
*   [ExamMode.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/ExamMode.tsx) (approx. 310 Lines)

---

### 2. Massive Functions (Exceeding 50 - 100 Lines)

We identified several functions within our "God Components" that handle excessive complexity:

*   **Function**: `insertMarkdown` in `RichNotesEditor` ([StudySession.tsx:L570-691](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx#L570-691))
    *   *Length*: 121 lines.
    *   *Issue*: Implements formatting logic for 11 different markdown elements (bold, lists, headings, code blocks, quote, links, tables) and handles cursor selections.
*   **Function**: `handleEditorKeyDown` in `RichNotesEditor` ([StudySession.tsx:L463-568](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx#L463-568))
    *   *Length*: 105 lines.
    *   *Issue*: Maps editor key codes, inserts tab characters, handles auto-closing of brackets, and processes deletion pairs.
*   **Function**: `generateScheduledSessions` in `AppProvider` ([Store.tsx:L95-138](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx#L95-138))
    *   *Length*: 44 lines.
    *   *Issue*: Programmatically generates date timelines and offsets based on commit minutes, which should be delegated to a utility helper module.

---

### 3. Mixed Responsibility Hooks

Vidyal.ai only defines one custom hook in `hooks/`: [useFocusSession.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/hooks/useFocusSession.ts).
*   **Analysis**: `useFocusSession.ts` is relatively clean, focusing only on Pomodoro ticks.
*   **The Mixed Responsibility Violation**:
    *   Because the project lacks custom hooks, **business logic and network calls are implemented directly inside component files**.
    *   For example, `CodeSandbox.tsx` and `ShellTerminal.tsx` combine terminal state trackers, execution models, and output logs. 
    *   *Solution*: Extract these into dedicated hooks like `useCodeSandboxSimulator` and `useShellInterpreter`.
