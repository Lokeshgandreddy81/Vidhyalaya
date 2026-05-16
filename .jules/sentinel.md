## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2025-05-16 - Mass Assignment Vulnerability in LearningPath Update
**Vulnerability:** The PUT /api/paths/:id route passed req.body directly to Mongoose's findOneAndUpdate, allowing users to modify restricted fields like userId.
**Learning:** Directly passing user input to MongoDB update queries can lead to mass assignment, letting attackers overwrite fields they shouldn't have access to.
**Prevention:** Always whitelist permitted fields from req.body and construct an explicit update object (using $set) rather than trusting the entire payload.
