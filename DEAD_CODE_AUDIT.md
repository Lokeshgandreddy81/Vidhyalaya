# Dead Code Audit (DEAD_CODE_AUDIT.md)

This report details candidates for safe removal within the Vidyal.ai repository, verified by import and reference analysis.

---

### 1. Unused Frontend Components & Boilerplates

The frontend UI components contain remnants of Shadcn/Radix scaffolds that are not referenced in the application routes, pages, or layouts.

#### Candidates:
*   **File Path**: [frontend/src/components/ui/command.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.jsx)
    *   **Reason**: Leftover prototyping scaffold.
    *   **Evidence**: A grep search for `<Command` or `command.jsx` imports returns zero results outside of comments.
    *   **Safe Removal Level**: **100% Safe**.
*   **File Path**: [frontend/src/components/ui/dialog.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/dialog.jsx)
    *   **Reason**: Radix dialog scaffold, only referenced inside the unused `command.jsx`.
    *   **Evidence**: A grep search for `dialog.jsx` or `<Dialog` imports returns zero results outside of the unused `command.jsx`.
    *   **Safe Removal Level**: **100% Safe**.
*   **File Path**: [frontend/src/components/ui/command.d.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.d.ts)
    *   **Reason**: Typings definition supporting the unused `command.jsx` file.
    *   **Evidence**: Tied strictly to the unused javascript UI component.
    *   **Safe Removal Level**: **100% Safe**.

---

### 2. Unused Backend Script Clutter

The backend root directory contains several diagnostic and test scripts from early development stages. They are not referenced by startup configuration profiles or routed controllers.

#### Candidates:
*   **File Path**: [backend/checkDb.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/checkDb.js)
    *   **Evidence**: Not in package.json run scripts or Express server routing.
    *   **Safe Removal Level**: **100% Safe**. Can be safely deleted or moved to a subfolder like `backend/src/scripts/`.
*   **File Path**: [backend/checkKey.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/checkKey.js)
    *   **Evidence**: Diagnostic key check. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/queryDb.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/queryDb.js)
    *   **Evidence**: Ad-hoc database utility. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/queryPasscode.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/queryPasscode.js)
    *   **Evidence**: One-off verification utility. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/test-gemini.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/test-gemini.js)
    *   **Evidence**: Standalone Gemini API test runner. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/testEmbed.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testEmbed.js)
    *   **Evidence**: Standalone embedding generator. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/testQuota.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testQuota.js)
    *   **Evidence**: Standalone quota benchmark script. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/testRetriever.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testRetriever.js)
    *   **Evidence**: Standalone test retriever. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/test_upload.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/test_upload.js)
    *   **Evidence**: Standalone upload testing client. Unused in production.
    *   **Safe Removal Level**: **100% Safe**. Move to `scripts/`.
*   **File Path**: [backend/test.pdf](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/test.pdf)
    *   **Evidence**: Sample PDF from testing phases.
    *   **Safe Removal Level**: **100% Safe**. Can be safely deleted.

---

### 3. Developer Test Pages & Routes

*   **File Path**: [frontend/src/components/DevRagTester.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/DevRagTester.tsx)
    *   **Reason**: Custom RAG (Retrieval-Augmented Generation) tester dashboard.
    *   **Evidence**: Configured under the active route `/dev-rag` in `App.tsx`.
    *   **Assessment**: While active, this is a diagnostic utility for developers. It should be removed from production builds using environment variable checks or deleted when the system reaches release stage.
    *   **Safe Removal Level**: **Medium**. Removal requires deleting the corresponding route from `App.tsx`.
