## 2024-10-16 - Vite Config API Key Exposure
**Vulnerability:** The `frontend/vite.config.ts` used `define` to statically inject `GEMINI_API_KEY` into `process.env.API_KEY` in the client bundle. This exposed the backend/private API key to anyone inspecting the frontend build.
**Learning:** Vite `define` behaves similarly to Webpack DefinePlugin; it replaces global text instances with the stringified values at build time, silently exposing secrets if not used carefully.
**Prevention:** Never inject private API keys using `define`. Exclusively rely on `import.meta.env.VITE_*` (which requires explicitly naming with a prefix to opt-in) for intended public keys, and proxy backend credentials via an API.
