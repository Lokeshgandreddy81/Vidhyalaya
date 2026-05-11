## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2025-02-14 - Mass Assignment Vulnerability in LearningPath PUT Route
**Vulnerability:** The PUT `/api/paths/:id` route was passing the raw `req.body` directly to `LearningPath.findOneAndUpdate()`. This mass-assignment vulnerability allowed unauthorized users to potentially update sensitive fields (like changing `userId` ownership, or altering the internal `_id`). Additionally, passing the root body could permit NoSQL operator injection.
**Learning:** Even when a user is authorized to edit a document, passing the entire request body to an update operation risks unauthorized field manipulation.
**Prevention:** Always whitelist explicit fields when updating documents. Construct an explicit `$set` object to ensure only valid fields are updated, and no arbitrary operators can be injected from the root request object.
