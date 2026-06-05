# Repository Structure Audit

This report presents an architectural audit of the directory layout and module boundaries in the **Vidhyalaya** codebase, outlining paths to achieve premium open source organization.

---

## 1. Directory Structure Mapping

The repository consists of a standard Client-Server monorepo configuration:

```text
├── .github/                   # CI/CD configurations & PR/Issue templates
├── backend/                   # Express backend server
│   ├── src/
│   │   ├── config/            # Database & vector search config
│   │   ├── middleware/        # Security (JWT, Origin CORS validation)
│   │   ├── models/            # Mongoose Schemas (User, Path, Video)
│   │   ├── routes/            # Route Controllers (auth, paths, videos)
│   │   └── services/          # Curation & AI prompts
│   └── package.json
│
├── frontend/                  # React + Vite frontend client
│   ├── src/
│   │   ├── components/        # Shell layouts & shared UI widgets
│   │   │   ├── layout/        # Sidebar and main frame layouts
│   │   │   └── ui/            # Whiteboard, Terminal, CodeSandbox components
│   │   ├── context/           # React App State Context (Store.tsx)
│   │   ├── features/          # Isolated domain feature logic
│   │   │   └── study/         # Quizzes, Flashcards, Whiteboard components
│   │   ├── hooks/             # Shared React custom hooks
│   │   ├── lib/               # Clsx & Tailwind utilities
│   │   ├── pages/             # Core page routes (Dashboard, Create, Study)
│   │   └── services/          # Gemini API integrations, soundscapes
│   └── package.json
```

---

## 2. Strengths & Structural Advantages

1. **Decoupled Features**: Subcomponents like flashcard viewers and quiz views are neatly isolated inside `frontend/src/features/study/`, keeping the main `pages/` directory focused solely on routing and high-level layout wrappers.
2. **Centralized Global State**: State mutations and API synchronization are unified in [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx). This prevents prop-drilling and ensures consistent optimistic updates.
3. **Structured Backend Pipelines**: Backend logic flows cleanly from Express routers to mongoose schemas, separating network middleware checks (auth, CORS) from DB transactions.

---

## 3. Weaknesses & Technical Debt

1. **Monolithic UI Layouts**: 
   - `StudySession.tsx` is an extremely large file (~177KB) that handles responsive page divisions, speech synthesis voice menus, sidebar rendering, and active route parsing.
   - `CodeSandbox.tsx` (~140KB) embeds the iframe sandbox runtimes, file hierarchy viewports, and local code editing states inside a single file.
2. **Duplicate/Unused Node Modules**: Unused dependencies like `@google/generative-ai` were left inside `package.json`, which has now been pruned.
3. **Direct Config Declarations**: Local constants and setups (like vector search metrics or API ratelimits) are hardcoded in the file heads instead of flowing from a unified `constants/` registry.

---

## 4. Areas of Confusion for New Contributors

* **Whiteboard Drawing Synchronization**: The coordinate drawings from `InteractiveWhiteboard.tsx` are auto-saved to local storage, but their hook-ins with Mongoose schemas in the cloud database are implicit.
* **Virtually Executing Code**: Sandbox commands are checked for infinite loops via a custom loop guard parser in `CodeSandbox.tsx`. The division between the terminal simulator and the iframe execution engine is complex and lacks inline diagrams.

---

## 5. Recommended Refinements

1. **Subcomponent Separation**: Extract `InteractiveWhiteboard` resize, shape drawing, and undo/redo layers into custom hooks or smaller modular widgets.
2. **Hook Outsource**: Outsource speech synthesis voice triggers and timers from `StudySession.tsx` into a custom `useSpeech` React hook.
3. **Constants Registry**: Create a global `src/config/constants.ts` inside the frontend to declare rate limits (such as the 1.5s AI throttle) in one obvious location.
