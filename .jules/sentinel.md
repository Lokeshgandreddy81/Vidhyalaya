## 2023-10-27 - [Sentinel] Fix missing NoSQL Injection and HPP protections
**Vulnerability:** The `express-mongo-sanitize` and `hpp` security packages were installed but not mounted in the Express application pipeline, leaving the app vulnerable to NoSQL Injection and HTTP Parameter Pollution.
**Learning:** Having security packages installed in `package.json` does not automatically protect the app. They must be explicitly mounted via `app.use()` in the application pipeline (e.g., `index.js`), immediately following body parsers, to protect all downstream routes from NoSQL Injection and HTTP Parameter Pollution.
**Prevention:** Ensure that security middleware is properly configured and mounted during the application startup process, rather than assuming installation equates to protection.
