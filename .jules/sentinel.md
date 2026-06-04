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
## 2026-06-04 - Critical Missing Authentication & IDOR in Study API
**Vulnerability:** The `/chat`, `/generate-flashcards`, `/grade-flashcard-answer`, and `/generate-quiz` endpoints in `backend/src/routes/studyRoutes.js` lacked the `authenticateToken` middleware. Furthermore, the `resolveUniversityKey` helper lacked IDOR (Insecure Direct Object Reference) checks, allowing any student to trigger actions and consume LLM quotas for documents belonging to *any* university by just providing a valid `documentId`.
**Learning:** Just like the `smartStudyRoutes.js` issue, any LLM-powered utility endpoints that take a document ID must be globally authenticated, and the requested document's association (e.g., `universityId`) must be cross-checked against the authenticated user's payload (`req.user.universityId`).
**Prevention:** Apply `authenticateToken` middleware at the router level (`router.use(authenticateToken)`) for all student-facing study endpoints. Ensure backend helper functions fetching configuration based on requested objects (like `resolveUniversityKey`) always accept `req.user` and validate ownership or institutional boundaries.
