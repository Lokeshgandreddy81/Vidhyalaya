## 2024-05-18 - Exposed API Key in Vite Config
**Vulnerability:** The GEMINI_API_KEY environment variable was explicitly mapped to `process.env` in Vite's `define` configuration.
**Learning:** This overrides `.env` protections and silently bundles backend secrets into the frontend `.js` output, exposing the API key to any client.
**Prevention:** Never use the `define` configuration to explicitly map backend API keys to `process.env` properties for the client. If dependencies require `process.env`, define the properties as empty strings (e.g., `JSON.stringify("")`) instead of removing them entirely. Rely exclusively on `import.meta.env.VITE_*` for public keys.
