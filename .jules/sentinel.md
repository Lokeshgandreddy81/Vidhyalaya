## 2025-02-14 - Exposed API Key in Vite config

**Vulnerability:** The `VITE_GEMINI_API_KEY` was exposed to the client bundle via `define` config in `vite.config.ts`.
**Learning:** Never map sensitive variables like backend API keys using `define` in Vite config. It silently bundles the keys into the static JavaScript output, rendering `.env` protections useless.
**Prevention:** If dependencies expect `process.env` properties, set them to empty strings (e.g., `JSON.stringify("")`). For client-side functionality, rely exclusively on `import.meta.env.VITE_*` keys, and only for keys intentionally designed to be public.
