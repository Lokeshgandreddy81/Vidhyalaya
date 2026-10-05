## 2025-03-09 - Fix API key leakage in vite.config.ts
**Vulnerability:** GEMINI_API_KEY was being explicitly stringified and injected into the client bundle via `define: { 'process.env.GEMINI_API_KEY': ... }` in frontend/vite.config.ts, rather than restricting it to the backend or using Vite's safer environment variable mechanism (`VITE_`).
**Learning:** Even though a configuration file may load backend environment variables for dev tooling, blindly injecting them into the global frontend `define` exposes sensitive server-side secrets in cleartext in the production client bundle.
**Prevention:** Only use Vite's `import.meta.env.VITE_` prefix mechanism for variables that are safe to expose to the browser. Backend secrets must never be passed to the client via `define`.
## 2025-03-09 - Remove unsupported Node 18 from CI
**Vulnerability:** Not a direct vulnerability, but maintaining test coverage on unsupported environments causes false negative CI failures.
**Learning:** Frontend dependencies like jsdom and @google/genai enforce modern Node engines (>=20) which cause ERR_REQUIRE_ESM and EBADENGINE in Node 18.
**Prevention:** Keep CI test matrices in sync with project engine requirements.
