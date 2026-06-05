# Repository Clutter Report

This report identifies unused components, redundant files, console logs, and legacy developmental scaffolding within the **Vidhyalaya** codebase that should be removed or refactored.

---

## 1. Dead Code & Unused Files

### A. Unused UI Components
*   **File Path**: [frontend/src/components/ui/command.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.jsx)
    - *Evidence*: Zero imports across the codebase. Leftover Shadcn boilerplate.
    - *Remediation*: **Safe to delete**.
*   **File Path**: [frontend/src/components/ui/dialog.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/dialog.jsx)
    - *Evidence*: Only imported inside the unused `command.jsx`.
    - *Remediation*: **Safe to delete**.
*   **File Path**: [frontend/src/components/ui/command.d.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.d.ts)
    - *Evidence*: Typings for the unused `command.jsx`.
    - *Remediation*: **Safe to delete**.

### B. Previously Deleted Workspace Files (Pending Commit)
The working tree contains several deletions that have not yet been committed to `main`. These represent diagnostic and development-only scripts:
- `backend/checkDb.js`
- `backend/checkKey.js`
- `backend/queryDb.js`
- `backend/queryPasscode.js`
- `backend/test-gemini.js`
- `backend/testEmbed.js`
- `backend/testQuota.js`
- `backend/testRetriever.js`
- `backend/test_upload.js`
- `backend/test.pdf`
- `backend/src/routes/devRoutes.js`
- `frontend/src/components/DevRagTester.tsx`
- `frontend/src/features/study/BibliographyPanel.tsx`
- `benchmark.js`
- `benchmark_mem.js`

*Remediation*: **Commit these deletions** to clean up the repository state.

---

## 2. Monolithic Code Structures & God Components

Several frontend components are overly large, making readability and maintenance difficult for open-source contributors:

| File Path | Size (KB) | Line Count | Main Violations |
| :--- | :--- | :--- | :--- |
| [StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx) | **177 KB** | ~4,200+ | Blends UI layout, sidebar rendering, routing, API synchronizations, Web Speech API hooks, and drawing state. |
| [CodeSandbox.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/CodeSandbox.tsx) | **140 KB** | ~3,300+ | Standard code execution editor, embedded iframe logic, local state management, and file explorer UI inside a single component. |
| [ShellTerminal.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx) | **118 KB** | ~2,800+ | Handles bash terminal command parser, virtual filesystem updates, and complex color-coded UI output rendering. |
| [NeuralSynthesizer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/NeuralSynthesizer.tsx) | **71 KB** | ~1,600+ | Canvas vector whiteboard render, coordinate mapping, and speech synthesis handlers combined. |

*Recommendation*: Break down these files into smaller sub-components (e.g., extracting hooks for Web Audio/Web Speech, creating sub-components for the layout columns, isolating the virtual terminal parser).

---

## 3. Console Logs & Debug Leftovers

There are debug logs and console entries left inside critical service loops. While useful during feature development, they clutter output in production:
- `frontend/src/services/geminiService.ts`: Contains console logs for checking model inputs and API quota queues.
- `backend/src/services/videoCurationService.js`: Prints scoring weights and topic match coefficients during runtime video selection queries.

---

## 4. Root Directory Clutter

The root directory contains 50+ raw markdown reports. This represents the primary clutter of the repository entry point.
- *Evidence*: `ls -l *.md` shows dozens of reports like `TERMINAL_*`, `ARCHITECTURE_*`, `DX_*`, etc.
- *Remediation*: **Move all audit reports** to a dedicated `docs/audits/` subfolder.
