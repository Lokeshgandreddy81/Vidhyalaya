# Dead Code Detection Report (DEAD_CODE_REPORT.md)

This report details candidates for safe removal within the Vidyal.ai repository, categorized by file layers.

---

### 1. Unused UI Components

*   **File Path**: [frontend/src/components/ui/command.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.jsx)
    *   **Reason**: Leftover scaffolding boilerplates.
    *   **Evidence**: Grep traces return zero occurrences of `command.jsx` or `<Command>` imports across the frontend pages or features.
    *   **Safe Removal Level**: **100% Safe**. Can be safely deleted.
*   **File Path**: [frontend/src/components/ui/dialog.jsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/dialog.jsx)
    *   **Reason**: Only imported in the unused `command.jsx`.
    *   **Evidence**: Grep traces return zero occurrences outside of the unused `command.jsx`.
    *   **Safe Removal Level**: **100% Safe**. Can be safely deleted.
*   **File Path**: [frontend/src/components/ui/command.d.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/command.d.ts)
    *   **Reason**: Type definition for the unused `command.jsx` component.
    *   **Evidence**: Unused by compiler since `command.jsx` is unused.
    *   **Safe Removal Level**: **100% Safe**.

---

### 2. Unused Backend Script Clutter

The backend root directory contains numerous one-off diagnostic and scripting files from development phases. These are not invoked by the Express routing layers or start scripts.

*   **File Path**: [backend/checkDb.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/checkDb.js)
    *   **Evidence**: Not in package.json scripts or routes.
    *   **Safe Removal Level**: High. Should be moved to a `backend/scripts/` folder or deleted.
*   **File Path**: [backend/checkKey.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/checkKey.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/queryDb.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/queryDb.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/queryPasscode.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/queryPasscode.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/test-gemini.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/test-gemini.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/testEmbed.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testEmbed.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/testQuota.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testQuota.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/testRetriever.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/testRetriever.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.
*   **File Path**: [backend/test_upload.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/test_upload.js)
    *   **Safe Removal Level**: High. Move to `scripts/`.

---

### 3. Portfolio Layer Separation

*   **File Paths**:
    - [frontend/src/portfolio/LandingPage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/portfolio/LandingPage.tsx) (Assuming this exists based on imports)
    - [frontend/src/portfolio/ResumePage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/portfolio/ResumePage.tsx)
*   **Reason**: Mixing product core features (adaptive study maps) with personal portfolio page routes (`/` and `/resume`).
*   **Safe Removal Level**: Low. While they are actively routed, they should be extracted to a separate static site repository to keep the core learning product isolated.
