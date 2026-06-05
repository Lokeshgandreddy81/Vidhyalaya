# Observability Audit Report

This report evaluates logging, diagnostics, and debugging visibility within the Vidhyalaya application stack.

---

## 1. Diagnostic Visibility Audit

### A. Backend Logging Configuration
- **Status**: **Functional**
- **Implementation**: The backend uses structured console prints mapping server events (e.g. `[AUTH]`, `[DocumentService]`, `[Smartboard]`).
- **Production Readiness**: Output logging streams directly to `stdout` and `stderr`, allowing standard container platforms (e.g., Docker, AWS ECS, PM2) to collect logs automatically.
- **Evidence**: Verified in [index.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/index.js) and routes.

### B. Error Handling Middleware
- **Status**: **Functional**
- **Implementation**: The express server terminates the middleware chain with a global error handler that logs stack traces and returns standard JSON responses:
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });
  ```
- **Evidence**: Verified in [index.js:L71-L74](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/index.js#L71-L74).
- **Risk Level**: **Low**

---

## 2. Answers to Critical Scenarios

### Question: "If Auth fails at 2AM, would we know why?"

**Answer**: Yes, for the following reasons:
1. **SSO Google Login Errors**: If Google Token verification fails, the endpoint explicitly logs the failure along with the exact cryptographic error stack to stderr:
   `console.error('FAILED Google Token verification:', error);`
   This is easily searchable in logs.
2. **Student Login Failures**: Errors in password comparisons or missing parameter validation are caught, logged with `❌ POST /api/students/login error:`, and output to standard diagnostic channels.
3. **Admin Token Expiry**: Token verify operations throw explicit exception classes (`TokenExpiredError` or `JsonWebTokenError`) which are printed directly inside the routes/middleware controllers, identifying exact timing mismatches.

---

## 3. Recommended Observability Improvements

1. **Structured JSON Logs**: Transition from `console.log` strings to a structured JSON logging package (e.g., `winston` or `pino`) for easier querying in log managers (like Datadog or ELK Stack).
2. **APM Integration**: Integrate an Application Performance Monitoring (APM) tool (like Sentry or OpenTelemetry) to receive live slack/email alerts for 500 Internal Server errors.
