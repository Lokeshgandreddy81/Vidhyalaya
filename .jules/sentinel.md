## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2024-05-18 - Missing Authentication on Smart Study API Routes
**Vulnerability:** The `/api/smart-study/upload`, `/api/smart-study/chat`, and `/api/smart-study/document/:id` endpoints were missing authentication middleware, allowing unauthenticated users to upload, query, and delete documents.
**Learning:** Always ensure new feature routes apply the standard `authenticateToken` middleware, especially when dealing with user uploads or potentially costly third-party API interactions (like Gemini).
**Prevention:** Make applying `router.use(authenticateToken);` a standard practice for all new API route files unless endpoints explicitly need to be public. When integrating frontend fetch requests, ensure they are also updated to use `fetchWithAuth`.
