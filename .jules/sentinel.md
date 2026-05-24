## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2026-05-24 - Mass Assignment & NoSQL Injection Prevented
**Vulnerability:** The `PUT /api/paths/:id` route was passing `req.body` directly to `findOneAndUpdate`, allowing an attacker to inject NoSQL operators and overwrite arbitrary fields on a `LearningPath` document (mass assignment).
**Learning:** Directly passing user input (like `req.body`) to MongoDB/Mongoose methods like `findOneAndUpdate` exposes the application to mass assignment and NoSQL injection vulnerabilities.
**Prevention:** Always explicitly define and enforce a whitelist of allowed fields. Build an update object (`$set`) using only the whitelisted properties from the request payload.
