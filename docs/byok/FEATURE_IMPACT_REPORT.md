# Feature Impact Report

Transitioning to a BYOK model affects core cognitive pipelines. Below is the impact assessment on all major Cortex learning modules.

---

## 1. Feature Map Impact

| Feature Module | What Breaks / Changes | Required Architectural Fix | Improvement / Opportunity |
| :--- | :--- | :--- | :--- |
| **SARA Tutor Chat** | Accumulating context causes cost spikes on shared key. | Client passes personal key directly. | Lower operational cost overhead for platform. |
| **Missions Engine** | Validation checks rely on Gemini outputs. | Validation endpoints request user key via headers to parse workspace. | Agnostic validation; supports cheaper models for simple verification steps. |
| **RAG Ingestion** | Embeddings creation is tied to Gemini models. | Support different embedding providers (e.g. `text-embedding-3-small`). | Users can switch to local/cheaper embeddings database schemas. |
| **Smart Study Document Chat** | Document Upload File API calls. | Direct client-to-Gemini File API or fallback to server-side extraction & context placement. | Direct upload limits backend filesystem burden and temporary memory leaks. |
| **Terminal simulator & Code Sandbox** | "Run in Sandbox" validation. | Local execution environment continues to run locally (fully client-side). No changes needed. | Completely safe; zero-cost environment operations. |
| **Learning Memory** | Optimistic sync of user strengths. | Logic is handled locally in Store.tsx. Runs without AI dependency. | Unchanged; highly stable. |

---

## 2. Platform Advantages & Simplifications

1. **Zero Abuse Vector**: Spammers or malicious script integrations cannot exhaust platform credits since they are locked to their own API billing keys.
2. **Simplified Scaling**: The platform no longer needs complex queue throttles or active rate limiting queues for the AI endpoint on the backend side.
3. **Decoupled API Lifecycles**: Upgrading to a newer model (e.g., from `gemini-2.0` to `gemini-2.5-pro` or `gpt-4o`) becomes a simple dropdown config update in the user UI.
