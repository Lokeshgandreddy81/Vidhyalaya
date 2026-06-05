# Testing Audit (TESTING_AUDIT.md)

This report details a testing audit of Vidyal.ai, assessing coverage gaps, identifying untested components, and mapping critical integration risks.

---

### 1. Existing Test Coverage

The project uses Vitest for frontend unit tests and the native Node.js test runner for backend tests.

#### Current Test Files:
*   **Frontend**:
    *   [frontend/src/services/geminiService.test.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.test.ts) (API calls checks)
    *   [frontend/src/services/videoLibrary.test.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/videoLibrary.test.ts) (Video curation checks)
    *   [frontend/src/hooks/useFocusSession.test.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/hooks/useFocusSession.test.ts) (Timer ticks checks)
    *   [frontend/src/lib/utils.test.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/lib/utils.test.ts) (ClassName merging checks)
*   **Backend**:
    *   [backend/src/routes/paths.test.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/paths.test.js) (Database paths retrieval tests)
    *   [backend/src/routes/users.test.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/users.test.js) (User profile CRUD tests)

#### Coverage Estimation
*   **Unit Test Coverage**: **Under 10%** of source lines are covered by tests.
*   **Integration Test Coverage**: **0%**. There are no integration tests verifying client-server communication.
*   **End-to-End (E2E) Test Coverage**: **0%**. There are no automated browser tests (e.g. Playwright, Cypress) covering user flows.

---

### 2. High-Risk Untested Areas

The lack of test coverage in core application layers increases the risk of regressions.

#### Untested Area 1: Global Store (`Store.tsx`)
*   **Risk Level**: **Critical**.
*   **Details**: `Store.tsx` manages the state for all user paths, XP progressions, and database sync hooks. Any bug introduced here can disrupt the user experience across the entire application.
*   **Recommendation**: Write unit tests for the store actions (e.g., path creation, module completions) using mocked API clients.

#### Untested Area 2: Backend Security Middleware (`auth.js`)
*   **Risk Level**: **High**.
*   **Details**: The JWT token validation middleware in [backend/src/middleware/auth.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/middleware/auth.js) has no tests.
*   **Recommendation**: Add tests verifying that the middleware rejects expired, malformed, or missing tokens, and correctly processes valid credentials.

#### Untested Area 3: Complex Interactive Components
*   **Risk Level**: **High**.
*   **Details**: Interactive components like `ConceptMapRenderer.tsx`, `CodeSandbox.tsx`, and `ShellTerminal.tsx` are completely untested.
*   **Recommendation**: Implement React Testing Library checks to verify basic user interactions, such as canvas clicks, sandbox execution outputs, and terminal commands.
