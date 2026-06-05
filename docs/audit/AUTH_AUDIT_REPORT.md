# Authentication Audit Report

This report documents the audit of the user, student, and admin authentication flows in the Vidhyalaya application.

---

## 1. Authentication Architecture Overview

Vidhyalaya employs a multi-role authentication model tailored to three different user segments:
1. **Scholars / Developers / Standard Users**: Authenticated via Google OAuth SSO. If no profile exists, a record is dynamically provisioned in the `UserProfile` collection.
2. **Students**: Authenticated via Roll Number + University ID + Passcode. Records are verified against the `Student` collection.
3. **University Administrators**: Authenticated via University ID + Passcode. Records are verified against the `University` collection.

All authenticated sessions are signed and verified server-side using JSON Web Tokens (JWT).

---

## 2. Findings & Verification

### A. Signup and Registration (Students)
- **Endpoint**: `POST /api/students/register`
- **Implementation**:
  - Validates that all fields (`rollNumber`, `universityId`, `name`, `branch`, `semester`, `passcode`) are provided.
  - Verifies that the associated `universityId` exists in the database.
  - Checks for duplicate students using a compound query on `{ rollNumber, universityId }`.
  - Hashes passwords using `bcrypt.hash(passcode, 10)` before storing.
- **Evidence**: Verified in [studentRoutes.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/studentRoutes.js#L10-L55).
- **Risk Level**: **Low**
- **Recommendation**: Ensure password length constraints are validated both frontend and backend (e.g. minimum 8 characters).

### B. SSO Google Authentication
- **Endpoint**: `POST /api/auth/google-login`
- **Implementation**:
  - If `process.env.GOOGLE_CLIENT_ID` is set, the endpoint cryptographically verifies the signature of the incoming Google ID Token using the official `google-auth-library`.
  - If the client ID is missing (e.g. local dev sandbox), it logs a warning and decodes the token raw via `jwt.decode` for onboarding simplicity.
  - Provisioning automatically maps users and assigns a 30-day session token.
- **Evidence**: Verified in [auth.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/auth.js#L32-L117).
- **Risk Level**: **Medium** (in development mode fallback only; secure in production when `GOOGLE_CLIENT_ID` is supplied).
- **Recommendation**: In production environments, strictly enforce token signature verification and reject requests if `GOOGLE_CLIENT_ID` is not loaded.

### C. Admin & Session Lifecycles
- **Token Expiries**:
  - Scholar/User Session: `30d` (30 days) signed via `JWT_SECRET`.
  - Student Session: `30d` (30 days) signed via `JWT_SECRET`.
  - Admin Session: `8h` (8 hours) signed via `JWT_SECRET`.
- **Evidence**: Verified in [auth.js:L93-L97](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/auth.js#L93-L97), [studentRoutes.js:L80-L92](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/studentRoutes.js#L80-L92), and [adminRoutes.js:L29-L37](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/adminRoutes.js#L29-L37).
- **Session Refresh**: Currently, there is no silent refresh token implementation. When tokens expire, requests return `401 Unauthorized` / `403 Forbidden`, and users are redirected to re-authenticate.
- **Risk Level**: **Low**

### D. Protected Routes & Middleware
- **Student/User Guard**: `authenticateToken` middleware verifies token signature and attaches `req.user` to the request block.
- **Admin Guard**: `requireAdminAuth` middleware verifies token signature, checks `decoded.role === 'admin'`, and attaches `req.universityId` and `req.universityName`.
- **Evidence**: Verified in [auth.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/middleware/auth.js) and [requireAdminAuth.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/middleware/requireAdminAuth.js).
- **Risk Level**: **Low**

---

## 3. Session Persistence & Browser Recovery
- The frontend holds the active tokens and metadata in local storage:
  - `vidyal_student_token` for student sessions.
  - `vidyal_admin_token` for administrator sessions.
  - `vidyal_user_token` for SSO scholar sessions.
- In the event of a browser tab reload or multiple tabs opening, the application successfully recovers states by reading these local keys.
- If a user signs out, all relevant localStorage entries (`vidyal_isAuthenticated`, `vidyal_user_token`, `vidyal_user_id`, `vidyal_student_token`, `vidyal_admin_token`) are properly cleared.
- **Evidence**: Verified in [Settings.tsx:L105-L112](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Settings.tsx#L105-L112) and [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx).
