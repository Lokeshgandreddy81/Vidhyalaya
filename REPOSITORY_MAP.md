# Repository Map (REPOSITORY_MAP.md)

This map outlines the complete modular and structural hierarchy of Vidyal.ai's frontend and backend systems.

---

### 1. Frontend Architecture (`frontend/src/`)

#### ── Pages (`pages/`)
Routed views mapped in `App.tsx` (using HashRouter):
*   [Dashboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Dashboard.tsx): High-Level adaptive dashboard displaying path metrics, active streaks, level charts, and ongoing schedules.
*   [StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx): Immersive focus learning module with notes editors, AI tutor chat sidebar, active recall cards, and timers.
*   [CreatePath.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/CreatePath.tsx): 4-step wizard interface for customizing study paths (inputs, timelines, commitments).
*   [PathDetail.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/PathDetail.tsx): Detailed roadmap node view highlighting phases and modules.
*   [PathExplorer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/PathExplorer.tsx): Library card catalog of user-created and community paths.
*   [SmartStudy.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/SmartStudy.tsx): Interactive classroom study board and SARA virtual vault explorer.
*   [AuthPage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/AuthPage.tsx): Sign-in screen integrating Google OAuth credentials.
*   [ApiKeySetupPage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/ApiKeySetupPage.tsx): Local user token override panel.
*   [AdminDashboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/AdminDashboard.tsx): Global configuration, logs watcher, and user metrics dashboard.
*   [Library.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Library.tsx), [Courses.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Courses.tsx), [Schedule.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Schedule.tsx), [ExamMode.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/ExamMode.tsx), [SaraHome.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/SaraHome.tsx), [StudentVaultLogin.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudentVaultLogin.tsx), [Settings.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Settings.tsx).

#### ── Feature Modules (`features/`)
*   **Study Features (`features/study/`)**:
    *   [NeuralSynthesizer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/NeuralSynthesizer.tsx): Main interactive canvas container holding concept mapping and roadmap previews.
    *   [ConceptMapRenderer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/components/ConceptMapRenderer.tsx): HTML5 Canvas concept networks renderer with multiple layout projections.
    *   [BibliographyPanel.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/BibliographyPanel.tsx): Renders document references and Google search grounding citations.
    *   [FlashcardViewer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/FlashcardViewer.tsx): Active recall flashcard manager.
    *   [QuizViewer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/QuizViewer.tsx), [SARAQuizPanel.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/SARAQuizPanel.tsx): Quizzes parser and metrics layout.
    *   [Smartboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/Smartboard.tsx): Virtual vault document parser.
    *   [SARAVaultPanel.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/features/study/SARAVaultPanel.tsx): Enterprise user vault files selector.

#### ── UI Components (`components/`)
*   `layout/`:
    *   [Layout.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/layout/Layout.tsx): Sidebar layouts, dashboard grids, header navigations, and global panels.
*   `ui/`:
    *   [CodeSandbox.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/CodeSandbox.tsx): Virtual web compilation workspace.
    *   [ShellTerminal.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx): ANSI-supported local shell terminal.
    *   [InteractiveWhiteboard.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/InteractiveWhiteboard.tsx): Canvas whiteboard drawer.
    *   [ContentRenderer.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ContentRenderer.tsx): Markdown HTML parser.
    *   [AITerminalOverlay.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/AITerminalOverlay.tsx), [MermaidDiagram.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/MermaidDiagram.tsx), [SARAActionChips.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/SARAActionChips.tsx).
*   `portfolio/`: Static resumes and landing layouts.

#### ── Services (`services/`)
*   [api.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/api.ts): Backend integration wrapper handling authentication headers and database calls.
*   [geminiService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts): Gemini GenAI API wrappers for tutor responses, diagram schemas, and summaries.
*   [soundscapeService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/soundscapeService.ts): Web Audio synthesis player.
*   [videoLibrary.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/videoLibrary.ts): YouTube metadata scraper and course videos curator.
*   [smartboardService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/smartboardService.ts), [aiService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/aiService.ts).

#### ── State Contexts (`context/`)
*   [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx): Core paths and profiles store.
*   [FocusContext.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/FocusContext.tsx): Pomodoro timer contexts.
*   [SmartStudyContext.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/SmartStudyContext.tsx): Classroom smartboards inputs.

#### ── Global Hooks & Libraries (`hooks/`, `lib/`)
*   [useFocusSession.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/hooks/useFocusSession.ts): Dynamic countdown controls.
*   [utils.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/lib/utils.ts): Tailwind CSS classes merging wrappers.

---

### 2. Backend Architecture (`backend/`)

#### ── Configuration (`backend/src/config/`)
*   `db.js`: MongoDB Mongoose Atlas connection pool.
*   `ragConfig.js`: LLamaIndex embeddings configurations.

#### ── Models (`backend/src/models/`)
*   `UserProfile.js`: User XP, streaks, levels, and settings.
*   `LearningPath.js`: Structured learning roadmaps containing phases, modules, and sessions.
*   `Document.js`: Vault attachments and parsed vector indexes.
*   `ScheduledSession.js`, `Achievement.js`.

#### ── Routing (`backend/src/routes/`)
*   `auth.js`: Google login and JWT generation.
*   `paths.js`: Learning roadmap database retrieval.
*   `smartStudyRoutes.js`, `studyRoutes.js`, `adminRoutes.js`, `documentRoutes.js`, `studentRoutes.js`, `devRoutes.js`, `users.js`, `videos.js`.

#### ── Middleware (`backend/src/middleware/`)
*   `auth.js`: Express security layer verifying request tokens.

---

### 3. Infrastructure & Compilation

*   **Vite Configuration**: [vite.config.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/vite.config.ts) utilizing `@tailwindcss/vite` and `@vitejs/plugin-react`.
*   **TypeScript Setup**: Unified compiler strict checks via [tsconfig.json](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/tsconfig.json).
*   **Testing Suite**: Vitest runner configuring virtual DOM test runners (`jsdom`).
