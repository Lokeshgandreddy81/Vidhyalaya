## 2024-05-18 - Exposing backend secrets in Vite build

**Vulnerability:** The Vite configuration in `frontend/vite.config.ts` explicitly bundles the backend `GEMINI_API_KEY` environment variable into the frontend application code using the `define` object map for `process.env`.
**Learning:** This overrides standard `.env` protections and silently bundles secrets into standard `.js` output chunks.
**Prevention:** Rely exclusively on `import.meta.env.VITE_*` for public keys, and never inject server-side secrets into the client build.
