## 2024-05-24 - Do not map backend API keys to process.env in Vite config
**Vulnerability:** The application was vulnerable because it explicitly mapped backend secrets (`GEMINI_API_KEY`) to `process.env` properties for the client using Vite's `define` configuration.
**Learning:** This overrides `.env` protections in Vite and silently bundles secrets into the `.js` output, allowing any user to view the secret API key by inspecting the client bundle.
**Prevention:** Never use Vite's `define` configuration to pass secrets to the client. If dependencies require `process.env`, define the properties as empty strings (e.g., `JSON.stringify("")`) instead of removing them entirely to prevent `ReferenceError`s. Rely exclusively on `import.meta.env.VITE_*` for public keys.
