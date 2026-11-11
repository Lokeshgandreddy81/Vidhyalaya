## 2024-05-18 - Missing Security Middleware in Express
**Vulnerability:** The Express backend lacked comprehensive middleware for NoSQL Injection (`express-mongo-sanitize`) and HTTP Parameter Pollution (`hpp`) protection, despite the packages being present in `package.json`.
**Learning:** Security packages installed in `package.json` are inactive until explicitly mounted via `app.use()` in the main application pipeline (e.g., `index.js`). They must be placed immediately following body parsers (like `express.json()`) to protect downstream routes.
**Prevention:** Enforce a security baseline checklist for new Express applications ensuring that `express-mongo-sanitize` and `hpp` (along with `helmet` and rate limiting) are always explicitly initialized in the startup sequence.
