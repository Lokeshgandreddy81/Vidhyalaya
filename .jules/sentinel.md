## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).
## 2024-05-20 - Missing Authentication & IDOR in Smart Study API
**Vulnerability:** Missing authentication on the `/api/smart-study` routes and an Insecure Direct Object Reference (IDOR) where any user could pass arbitrary user IDs or document IDs to upload, access, and delete documents they didn't own.
**Learning:** Even internal-feeling or newly added API features must be plugged into standard authentication middleware (`authenticateToken`). Relying on clients to pass `userId` in the body is insecure.
**Prevention:** Always use `req.user.id` (extracted via signed JWT middleware) for authorization contexts rather than trusting request bodies, and always verify ownership (`doc.userId === req.user.id`) before returning or modifying resources.
