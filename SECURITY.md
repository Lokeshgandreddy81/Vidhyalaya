# Security Policy

We take the security of **Vidhyalaya** seriously. This document outlines our security features, secure defaults, and how to report vulnerabilities.

---

## 1. Supported Versions

Security updates are actively applied to the following branch:

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |
| `dev`   | Yes       |

---

## 2. Hardened Security Features

Vidhyalaya is designed with several production-grade security mechanisms to protect user credentials, APIs, and workspace execution environments:

### Bring-Your-Own-Key (BYOK) Encryption
*   All user-provided Gemini API keys are encrypted at rest using **AES-256-GCM** via Mongoose field-level encryption before being stored in MongoDB Atlas.
*   Decryption occurs dynamically inside the model schema layer when requests are dispatched, preventing plain-text keys from being stored in logs or DB backups.
*   Plain-text database key storage is blocked by a fail-safe verification check.

### Authentication & Token Hardening
*   **JWT authentication** with access tokens (short-lived) and rotation of refresh tokens stored in secure, `httpOnly`, `sameSite: "strict"` cookies.
*   **Refresh Token Rotation (RTR)**: Any attempt to reuse a refresh token triggers a suspicious activity log, invalidates all sessions for that user, and blocks subsequent requests until re-authentication.
*   **Tenant Isolation**: Routes check `req.user.id` against resource ownership (`userId`) to prevent NoSQL injection and Cross-Tenant access.

### Request Rate Limiting
*   General rate limiting is set to **100 requests per 1 minute** per IP address.
*   Auth endpoints (login/signup) use a stricter rate limiter with **exponential lockout decay** to prevent brute-force attacks.
*   Account lockouts occur after 5 consecutive failed attempts, locking the user out for 30 minutes.

### Sandbox Isolation & Constraints
*   The Cortex Code Sandbox utilizes a lightweight virtual sandbox environment for executing user-generated JavaScript/Python scripts.
*   **Strict Process Isolation**: Subprocesses run inside constrained environments with restricted file-system read/write privileges (explicitly blocking access to `.env` files and system configurations).
*   **Network Gating**: Outbound network requests from sandbox subprocesses are blocked by default to prevent data exfiltration.

---

## 3. Reporting a Vulnerability

**Please do not open a public GitHub issue for security bugs.**

If you discover a security vulnerability in Vidhyalaya, please report it privately:

1.  Send an email to **security@vidyal.ai** with details of the vulnerability.
2.  Provide a detailed description of the bug, including steps to reproduce (proof-of-concept scripts or screenshots are highly appreciated).
3.  We will acknowledge receipt of your report within 24–48 hours and work with you to resolve the issue.

---

## 4. Disclosure Policy

*   We ask you to give us a reasonable amount of time to fix the issue before making details public (typically 90 days).
*   We will coordinate release details with you to ensure a safe disclosure once a patch has been published.
