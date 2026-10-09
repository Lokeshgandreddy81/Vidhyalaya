## 2024-10-09 - Fix API key leak in Vite config
**Vulnerability:** The Vite configuration `vite.config.ts` explicitly mapped `process.env.GEMINI_API_KEY` to client bundles via the `define` configuration block.
**Learning:** Vite's `define` performs static string replacement at build time. Exposing sensitive keys directly causes them to be silently compiled into `.js` artifacts sent to users' browsers, creating a critical credential leak.
**Prevention:** Never use the `define` configuration to map backend keys to `process.env` properties for the client. Rely exclusively on standard `import.meta.env.VITE_*` prefixes for keys that are safely meant to be public, and keep secure keys entirely on the backend server.
## 2024-10-09 - Node 18.x Dependency Compatibility
**Learning:** Some frontend dependencies (like `@tailwindcss/oxide` and `@google/genai`) strictly require Node >= 20. Running CI tests on Node 18.x will reliably fail with `EBADENGINE` or `ERR_REQUIRE_ESM` errors in the `vitest-pool` when using these modern packages.
**Prevention:** Do not configure CI workflows or testing environments to run on Node 18.x for the frontend, as it is fundamentally incompatible with the project's dependency matrix.
## 2024-10-09 - CI Glob Pattern Expansion Failure
**Learning:** Using explicit glob patterns with escaped quotes in package.json scripts (e.g., `"test": "node --test \"src/**/*.test.js\""`) can cause cross-platform shell expansion failures in CI environments, leading to `Could not find files` errors that crash the test runner before any suites execute.
**Prevention:** When using the native Node.js test runner, simply use `"node --test"`. The runner automatically discovers and executes standard test files recursively without relying on brittle shell globbing.
## 2024-10-09 - JWT Invalid Token HTTP Status Codes
**Learning:** Returning a `401 Unauthorized` status for an invalid/tampered token contradicts standard security testing expectations which expect `403 Forbidden` for failed authorization, distinguishing it from `401` which strictly means authentication is missing or expired.
**Prevention:** In backend auth middleware (`authenticateToken`), ensure invalid or misconfigured tokens (e.g., wrong algorithm, tampered signatures) return a `403 Forbidden` status, while explicitly expired tokens (`TokenExpiredError`) return `401 Unauthorized`.
