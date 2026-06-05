# BYOK Security Plan

Handling user credentials demands a zero-trust design pattern. This security review outlines the isolation boundaries for keys stored and transmitted through Cortex.

---

## 1. Storage Security

- **Client-Side Only**: By default, user API keys are stored in the client browser's secure `localStorage` or `sessionStorage` under unique namespaces (e.g. `vidyal_custom_gemini_api_key`).
- **Encrypted Local Storage (Optional)**: Keys can be encrypted locally using AES-256 via a client-side generated key derived from the user's password/session signature to prevent physical extraction or extension access leaks.

---

## 2. Transmission & Execution Boundaries

To prevent key leak risks:
1. **No Backend Database Storage for Keys**: The backend database (MongoDB Atlas) will **never** store student API keys.
2. **Direct Browser-to-LLM Requests (Zero Server Logs)**: Wherever possible, AI operations (e.g., chat, quiz generation, roadmaps) compile payloads client-side and post directly to Google/OpenAI endpoints. The backend server never intercepts or inspects these payloads.
3. **Secure Proxying for Ingestion (Transient Headers)**: When backend assistance is mandatory (such as parsing PDFs and generating embeddings in `documentService.js`), keys are passed dynamically in transient, non-logged HTTP request headers (e.g., `X-User-Gemini-Key`). These headers are strictly kept in-memory and are never written to server logs or environment configurations.

---

## 3. Logging & Session Protection

- **Log Filtering Middleware**: A custom backend middleware will scan outgoing server logs and automatically mask any string matching common API key patterns:
  - Gemini: `/AIzaSy[A-Za-z0-9_-]{33}/`
  - OpenAI: `/sk-[A-Za-z0-9]{32,}/`
  - Anthropic: `/sk-ant-[A-Za-z0-9_-]{40,}/`
- **Request Sanitization**: All endpoint controllers will strip incoming query params or request bodies containing credentials before entering general logging hooks.
