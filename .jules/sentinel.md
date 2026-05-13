## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2025-02-14 - Mass Assignment Vulnerability in Paths API Fixed
**Vulnerability:** The `PUT /api/paths/:id` route was passing the entire `req.body` directly into Mongoose's `findOneAndUpdate`. This allowed a malicious user to inject properties like `userId` or `id` which they are not authorized to change.
**Learning:** This existed because of convenience when updating a learning path, assuming that the client would only send updatable fields, rather than enforcing it on the server.
**Prevention:** Never pass `req.body` directly into database update operations. Always construct a specific update object (e.g. `updateData`) that only extracts permitted, whitelisted fields from `req.body`, and use `$set: updateData`.
