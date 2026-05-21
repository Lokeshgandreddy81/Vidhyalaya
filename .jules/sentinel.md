## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2024-06-25 - Prevent Mass Assignment and NoSQL Injection in Mongoose Updates
**Vulnerability:** The `PUT /api/paths/:id` endpoint passed `req.body` directly to `LearningPath.findOneAndUpdate()`. This allowed malicious users to update any arbitrary field (e.g., `userId` or administrative flags) via Mass Assignment. Furthermore, it permitted NoSQL Operator Injection (e.g., passing `$set` or `$unset` objects within `req.body` directly) to bypass standard validations or alter query behavior.
**Learning:** Even with authenticated routes and ownership validation (verifying `path.userId === req.user.id`), passing an unfiltered `req.body` directly as an update payload to Mongoose exposes the underlying document to arbitrary data manipulation.
**Prevention:** Always whitelist explicit permitted update fields by extracting them into a new object and explicitly wrapping them inside a `$set` operator when performing MongoDB updates via `findOneAndUpdate`. Never pass `req.body` directly as the update document.
