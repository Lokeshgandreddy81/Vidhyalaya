# Developer Experience (DX) Report

This report evaluates the onboarding, local execution setup, and contribution experience within the **Vidhyalaya** repository, identifying friction points and offering improvements for open-source contributors.

---

## 1. Onboarding Friction Analysis

| Metric | Score | status | Notes |
| :--- | :--- | :--- | :--- |
| **Setup Clarity** | **95 / 100** | Excellent | README and CONTRIBUTING contain clear step-by-step instructions. |
| **Local Boot Latency** | **90 / 100** | Good | Runs on standard `npm run dev` with separate ports. |
| **External Service Friction** | **70 / 100** | Fair | Requires a MongoDB connection string and a custom Gemini API Key. |

---

## 2. DX Critical Vulnerabilities

1. **Database Dependency**: Contributors need to supply their own MongoDB Atlas database URL or run a local mongo server.
   - *Friction*: Setting up a local database adds environment complexity.
   - *Remediation*: Recommend adding a root-level `docker-compose.yml` defining a standard MongoDB service.
2. **Key Config Blockers**: The system prevents accessing learning modules without a valid Google Gemini API Key.
   - *Friction*: Developers cannot run integration checks without signing up for Google AI Studio keys.
   - *Remediation*: Implement mock service triggers when `GEMINI_API_KEY=mock` is declared in the local environment variables.

---

## 3. Tooling & Testing Experience

- **Vitest**: The frontend uses Vitest, resulting in fast execution speeds (~2 seconds total latency for 40+ tests).
- **TypeScript**: The strict type checking compiler configuration (`tsc --noEmit`) ensures that type safety is verified before merges.
- **Node Test Runner**: The backend uses Node.js's built-in test runner (`node --test`), avoiding bloated runner packages.

---

## 4. Remediation Steps for Elite DX

* **Step 1: Containerized Local Database**: Create a simple docker compose file:
  ```yaml
  version: '3.8'
  services:
    mongo:
      image: mongo:latest
      ports:
        - "27017:27017"
  ```
* **Step 2: Mock API Integration**: Update `geminiService.ts` to fallback to static mock curriculum payloads if the Gemini key is undefined or explicitly mocked, allowing frontend-only developers to contribute instantly.
