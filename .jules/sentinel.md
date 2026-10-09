## 2024-10-09 - Fix API key leak in Vite config
**Vulnerability:** The Vite configuration `vite.config.ts` explicitly mapped `process.env.GEMINI_API_KEY` to client bundles via the `define` configuration block.
**Learning:** Vite's `define` performs static string replacement at build time. Exposing sensitive keys directly causes them to be silently compiled into `.js` artifacts sent to users' browsers, creating a critical credential leak.
**Prevention:** Never use the `define` configuration to map backend keys to `process.env` properties for the client. Rely exclusively on standard `import.meta.env.VITE_*` prefixes for keys that are safely meant to be public, and keep secure keys entirely on the backend server.
## 2024-10-09 - Node 18.x Dependency Compatibility
**Learning:** Some frontend dependencies (like `@tailwindcss/oxide` and `@google/genai`) strictly require Node >= 20. Running CI tests on Node 18.x will reliably fail with `EBADENGINE` or `ERR_REQUIRE_ESM` errors in the `vitest-pool` when using these modern packages.
**Prevention:** Do not configure CI workflows or testing environments to run on Node 18.x for the frontend, as it is fundamentally incompatible with the project's dependency matrix.
