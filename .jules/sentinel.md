## 2025-02-14 - Hardcoded JWT Secret Removed
**Vulnerability:** A hardcoded default secret (`your-256-bit-secret`) was being used as a fallback if `process.env.JWT_SECRET` was missing.
**Learning:** This fallback meant anyone could mint tokens and access any account if the environment variable was accidentally omitted during deployment.
**Prevention:** Never provide a fallback value for cryptographic secrets. If a required secret is missing, the application must crash or fail securely (returning a 500 status code).
