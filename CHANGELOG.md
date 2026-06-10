# Changelog

All notable changes to **Vidhyalaya** will be documented in this file. This project adheres strictly to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.2] - 2026-06-10

This release focuses on repository hardening, open-source readiness, dependency verification, and git merge consolidation.

### Added
*   **Frontend Environment Blueprint**: Created `frontend/.env.example` specifying URL patterns and BYOK configurations.
*   **Git Merge Consolidation**: Consolidated local uncommitted modifications and merged the remote `origin/opencode/neural-map-enhancements` branch.
*   **Sanitized Personal Artifacts**: Sanitized personal contact info and Cortex branding placeholders from the public `Resume.jsx` page.

### Changed
*   **Workspace Reorganization**:
    *   Archived `REFACTORING_MASTER_PLAN.md` to the historical planning archive `docs/archive/`.
    *   Relocated `backend/src/benchmark.js` to `backend/src/scripts/benchmark.js` to keep the source root clean.
    *   Rewrote `README.md` from scratch to provide a top-tier project overview.

### Fixed
*   **Type-Safety Compliance**: Resolved type conflict and leftover merge markers in `PathExplorer.tsx`, achieving 100% compilation success under `tsc --noEmit`.

---

## [1.0.0-rc.1] - 2026-06-10

This is the Release Candidate for the core **Cortex learning experience**. It integrates active recall sandbox environments, interactive neural maps, and production-grade security systems.

### Added
*   **Neural Map Synthesis**: Integrated D3-powered interactive knowledge graphs (`NeuralSynthesizer.tsx`, `ConceptMapRenderer.tsx`) for dynamic structural visualization of learning paths, concepts, and parent-child dependencies.
*   **Cortex Code Sandbox**: In-browser execution drawer (`CodeSandbox.tsx`, `ShellTerminal.tsx`) supporting HTML, CSS, JavaScript, and Python script execution. Includes a terminal HUD, error coach feedback, and floating run-in-sandbox options.
*   **Bring-Your-Own-Key (BYOK)**: Added browser-side configuration page (`ApiKeySetupPage.tsx`) for user-supplied LLM API keys (Gemini, OpenAI, Anthropic, OpenRouter, Groq).
*   **Security Hardening Systems**:
    *   Dynamic AES-256-GCM field-level encryption for API keys in the database.
    *   Auth token rotation with Refresh Token Rotation (RTR) to block reuse attacks.
    *   Brute-force lockout protections and tenant ownership verification middleware.
*   **Express In-Memory Fallback**: Configured backend database config to automatically fallback to an in-memory MongoDB Server (`mongodb-memory-server`) during local development if Atlas is unavailable.
*   **Ethereal Mailer Integration**: Configured Ethereal sandbox preview for user OTP registration emails if custom SMTP settings are missing.

### Changed
*   **Zen Mode Layout**: Standardized dark immersive view (`bg-[#05070a]`) for study session zen mode with soundscape overlays and D3 visualization calibration.
*   **UI Brand Alignment**: Polished dashboard interfaces, course guides, and curriculum paths with soft Framer Motion springs and "Academic Modernism" layouts.
*   **Gemini API Safety Throttle**: Configured serial queue executor (`apiQueue.add`) with 1.5s delay and 120s timeout thresholds to avoid rate limits.

### Fixed
*   **Unit Tests Hardening**: Resolved Express router mocking timeouts in `paths.test.js` and local storage bypass errors in `geminiService.test.ts`.
*   **TypeScript Import Alignment**: Stabilized frontend typescript build types (`types.ts`, `types.tsx`) and resolved path compilation issues.
