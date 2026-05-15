## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2025-05-15 - Missing Authentication and IDOR in Smart Study API
**Vulnerability:** The `/api/smart-study/*` backend routes for uploading, chatting, and deleting documents were missing the `authenticateToken` middleware, allowing unauthorized access. Furthermore, they lacked authorization checks, allowing any user to chat with or delete any other user's documents if they knew the `documentId` (IDOR).
**Learning:** Even if a feature is intended for authenticated users, the backend routes must explicitly enforce authentication and authorization. Relying on the frontend to pass a `userId` in the body or URL without verifying it via an authentication token is insecure.
**Prevention:** Always apply authentication middleware to API routes that handle user data. Verify that the requested resource belongs to the authenticated user (`req.user.id`) before allowing access or modification. Use `req.user.id` instead of user-provided IDs whenever possible.
