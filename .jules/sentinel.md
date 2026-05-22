## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2026-05-22 - Prevented Mass Assignment and NoSQL Injection in LearningPath Updates
**Vulnerability:** The PUT `/:id` route in `backend/src/routes/paths.js` passed `req.body` directly to `LearningPath.findOneAndUpdate()`.
**Learning:** This allowed attackers to update restricted fields (like `userId` or `id`) and potentially inject NoSQL operators (e.g. `$set`, `$inc`) in the top-level keys if `req.body` wasn't strictly checked.
**Prevention:** Always extract only permitted update fields into an explicit object, and wrap the updates in `{ $set: updateData }` to prevent arbitrary field assignment and NoSQL operator injection.
