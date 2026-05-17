## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).

## 2025-02-14 - Mass Assignment Vulnerability in Mongoose Updates
**Vulnerability:** A mass assignment vulnerability existed in `backend/src/routes/paths.js` where the entire `req.body` was passed directly to Mongoose's `findOneAndUpdate`. This could allow attackers to modify protected fields or inject NoSQL operators.
**Learning:** Directly passing user input to database update functions without field whitelisting is a common source of NoSQL operator injection and mass assignment risks in Express/Mongoose applications.
**Prevention:** Always extract and whitelist specific allowed fields from `req.body` and wrap them in an explicit `$set` operator when performing database updates using functions like `findOneAndUpdate`.
