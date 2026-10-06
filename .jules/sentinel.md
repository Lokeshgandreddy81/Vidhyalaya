## 2024-05-24 - Frontend API Key Leakage via vite.config.ts define block

**Vulnerability:** The `frontend/vite.config.ts` explicitly injected `env.GEMINI_API_KEY` into the frontend build via Vite's `define` property rather than using the standard `VITE_` prefixing mechanism, hardcoding backend secrets directly into client-side JS bundles.

**Learning:** When using Vite, explicitly adding keys to `define: { 'process.env.API_KEY': ... }` overrides standard `.env` protections and silently bundles secrets into standard `.js` output chunks, exposing them to anyone accessing the site.

**Prevention:** Never use the `define` configuration in Vite to map backend API keys to `process.env` properties for the client. Rely on `import.meta.env.VITE_*` exclusively for public keys, and ensure backend-only keys stay strictly in the backend `.env`.
