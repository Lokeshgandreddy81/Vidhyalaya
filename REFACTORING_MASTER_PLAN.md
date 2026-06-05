# Refactoring Master Plan (REFACTORING_MASTER_PLAN.md)

This master plan outlines a phased roadmap to improve the security, performance, architecture, and maintainability of the Vidyal.ai codebase.

---

## P0: Critical Refactoring Tasks

### 1. Close Authentication Bypass Vulnerability
*   **Problem**: The backend route `/token` generates valid JWT session tokens for any `userId` without validating password or SSO credentials.
*   **Evidence**: [backend/src/routes/auth.js:L9-L25](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/auth.js#L9-L25)
*   **Impact**: High security risk. Allows arbitrary account hijacking in production.
*   **Recommendation**: Remove the bypass endpoint or restrict it to the local development environment:
    ```javascript
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Access denied' });
    }
    ```
*   **Risk Level**: Very Low.
*   **Estimated Effort**: Low (approx. 5 minutes).

### 2. Monolithic God Components Extraction
*   **Problem**: Files like `StudySession.tsx` (4,188 lines), `CodeSandbox.tsx` (3,598 lines), and `ConceptMapRenderer.tsx` (3,224 lines) handle multiple responsibilities, mixing rendering layouts, local compilers, and canvas drawing math.
*   **Evidence**: Lines of code (LoC) count and mixed responsibilities documented in the Complexity Audit.
*   **Impact**: Low testability, high regression risk, and slow build cycles.
*   **Recommendation**:
    1. Extract the rich notes editor into a separate React component file.
    2. Extract direct canvas context operations from `ConceptMapRenderer.tsx` into a utility helper class.
    3. Move the sandbox compiler execution logic into a custom hook (`useCodeSandboxSimulator.ts`).
*   **Risk Level**: Medium-High (potential regression risk for canvas layout operations and state bindings).
*   **Estimated Effort**: High (approx. 2-3 engineering days).

### 3. Global Store Context Split
*   **Problem**: `Store.tsx` encapsulates paths, profile details, and achievements in a single context value object.
*   **Evidence**: AppProvider declaration in [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx).
*   **Impact**: Any update to any global state property triggers a re-render in all components subscribing to `useAppStore`.
*   **Recommendation**: Split the store context into smaller, focused contexts (`AuthContext`, `LearningPathContext`, `UserPreferencesContext`).
*   **Risk Level**: Medium (requires updating components that consume the store).
*   **Estimated Effort**: Medium (approx. 4-6 hours).

---

## P1: Important Refactoring Tasks

### 4. Revoke and Relocate Exposed API Keys
*   **Problem**: The Google Gemini API key is hardcoded in the frontend configuration file and committed to source control.
*   **Evidence**: [frontend/.env.local](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/.env.local) containing `VITE_GEMINI_API_KEY`.
*   **Impact**: Risk of credential theft and unauthorized usage charges.
*   **Recommendation**: Revoke the compromised API key in the Google Cloud Console, configure keys locally, and add `.env.local` to the [.gitignore](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/.gitignore).
*   **Risk Level**: Low.
*   **Estimated Effort**: Low (approx. 10 minutes).

### 5. Code Splitting & Lazy Routing
*   **Problem**: Static loading of all pages at start increases bundle sizes.
*   **Evidence**: Static imports in [App.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/App.tsx).
*   **Impact**: Slow initial page load times.
*   **Recommendation**: Use `React.lazy` and `Suspense` for routed page views.
*   **Risk Level**: Low.
*   **Estimated Effort**: Low (approx. 1 hour).

### 6. Canvas Redrawing & Offscreen Rendering
*   **Problem**: Map panning and zooming calculations run on the main thread during render cycles.
*   **Evidence**: Canvas drawing loop in `ConceptMapRenderer.tsx`.
*   **Impact**: Frame rate drops when dragging concept maps containing many nodes.
*   **Recommendation**: Pre-render static links onto an offscreen canvas.
*   **Risk Level**: Medium.
*   **Estimated Effort**: Medium (approx. 4 hours).

---

## P2: Nice-to-Have Cleanups

### 7. Clean up Backend Root and UI Boilerplates
*   **Problem**: 9 diagnostic scripts clutter the backend root folder, and unused Shadcn templates are present in the frontend UI directory.
*   **Evidence**: Listing files in backend root and unused files `command.jsx`, `dialog.jsx` in the Dead Code Audit.
*   **Impact**: Cluttered workspace.
*   **Recommendation**: Move backend scripts to `backend/src/scripts/` and delete unused UI components.
*   **Risk Level**: Low.
*   **Estimated Effort**: Low (approx. 30 minutes).

### 8. Naming Consistency and TypeScript Renames
*   **Problem**: Pure TypeScript type declaration file uses a `.tsx` extension.
*   **Evidence**: `features/study/types.tsx`.
*   **Impact**: Inconsistent naming convention.
*   **Recommendation**: Rename the file to `types.ts`.
*   **Risk Level**: Low.
*   **Estimated Effort**: Low (approx. 5 minutes).
