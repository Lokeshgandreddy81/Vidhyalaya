## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).
## 2024-05-12 - Mass Assignment Vulnerability in Learning Paths API
**Vulnerability:** The PUT endpoint for `/api/paths/:id` was directly accepting `req.body` and passing it to Mongoose's `findOneAndUpdate`. This allowed attackers to modify sensitive or restricted fields (such as `userId`, changing ownership of paths).
**Learning:** Even if the logic enforces ownership checks initially, directly piping the entire request payload into an update statement allows the payload to override those fields silently if they are present in the database schema.
**Prevention:** Always define a strict whitelist of editable fields for update operations, or manually extract and validate individual allowed fields from the request body before passing the update query to the database.
