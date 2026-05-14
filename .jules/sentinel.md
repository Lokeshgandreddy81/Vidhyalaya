## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).
## 2024-05-18 - Prevent mass assignment vulnerability in LearningPath update
**Vulnerability:** The PUT endpoint for updating Learning Paths passed `req.body` directly to `LearningPath.findOneAndUpdate`, which allowed a malicious user to modify unauthorized fields by injecting them into the request body.
**Learning:** Passing untrusted objects directly to database update commands like Mongoose's `findOneAndUpdate` creates a mass assignment risk unless strict whitelisting is enforced.
**Prevention:** Always extract and whitelist specific permitted fields from request bodies before constructing update payloads for database queries.
