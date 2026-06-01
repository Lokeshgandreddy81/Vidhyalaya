## 2024-05-23 - Critical Missing Authentication & IDOR in Smart Study API
**Vulnerability:** The `/upload`, `/chat`, and `/document/:id` endpoints in `smartStudyRoutes.js` were missing the `authenticateToken` middleware. Additionally, the routes did not perform Insecure Direct Object Reference (IDOR) checks, allowing any user (including unauthenticated users) to access, chat with, and delete other users' uploaded study documents by simply providing the `documentId`. The frontend `/upload` API also allowed bypassing user association.
**Learning:** Even if an API uses an explicit `userId` payload (e.g., in a request body), backend routes handling sensitive data must enforce global authentication middleware and explicitly cross-check the resource owner (`doc.userId`) against the verified token (`req.user.id`).
**Prevention:** Apply authentication middleware at the router level for sensitive grouped endpoints (`router.use(authenticateToken)`). Always validate document ownership against the authenticated token payload rather than trusting client-provided user IDs.

## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2026-05-22 - Prevented Mass Assignment and NoSQL Injection in LearningPath Updates
**Vulnerability:** The PUT `/:id` route in `backend/src/routes/paths.js` passed `req.body` directly to `LearningPath.findOneAndUpdate()`.
**Learning:** This allowed attackers to update restricted fields (like `userId` or `id`) and potentially inject NoSQL operators (e.g. `$set`, `$inc`) in the top-level keys if `req.body` wasn't strictly checked.
**Prevention:** Always extract only permitted update fields into an explicit object, and wrap the updates in `{ $set: updateData }` to prevent arbitrary field assignment and NoSQL operator injection.
## 2026-06-01 - Critical Account Takeover via Unauthenticated Token Minting
**Vulnerability:** The `/api/auth/token` endpoint allowed any user to generate a valid JWT for any arbitrary `userId` (including authenticated Google SSO users) simply by passing the `userId` in the request body.
**Learning:** This allowed an attacker to trivially impersonate any user and take over their account, effectively bypassing authentication entirely.
**Prevention:** Ensure that token generation endpoints (even those meant for anonymous/default sessions) strictly validate the requested `userId`. We restricted this endpoint to exclusively allow minting tokens for the explicit `'default-user'` ID used by the frontend for unauthenticated sessions.
