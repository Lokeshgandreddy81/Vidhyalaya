## 2025-02-18 - Vite config injecting secrets

**Vulnerability:** The `frontend/vite.config.ts` was taking the `GEMINI_API_KEY` from the backend's `.env` (via Vite's `loadEnv`) and explicitly exposing it on `process.env` in the client bundle via the `define` property. This effectively shipped the raw API key directly to users.

**Learning:** Vite's `define` can bypass typical env prefix protections (`VITE_`). Also, removing keys from `define` might cause third-party dependencies expecting `process.env` to throw ReferenceErrors; masking them with `""` is safer. Furthermore, relying on an automatic frontend proxy fallback handles the missing client key correctly without breaking functionality.

**Prevention:** Never map backend secrets into `define` configurations in client bundlers. Rely on `import.meta.env` for public variables, use explicit prefixes like `VITE_`, and ensure API calls requiring authentication are proxied through a secure backend server.
