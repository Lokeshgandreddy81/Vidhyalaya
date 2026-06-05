# Cortex BYOK Master Plan

This master plan establishes the core product, architectural, and business directives for the Bring-Your-Own-API-Key (BYOK) transformation.

---

## 1. Executive Summary & Business Rationale

Cortex is transitioning from a platform-funded model to a user-funded intelligence model:

| Operational Metric | Legacy Platform-Funded Model | Target BYOK Model |
| :--- | :--- | :--- |
| **API Cost Burdens** | Platform-absorbed (unpredictable OpEx) | User-funded (zero platform cost) |
| **Scalability Scope** | Artificially rate-limited (throttled) | Unbounded concurrent execution |
| **Abuse Protection** | Complex IP limiters & usage limits | Cryptographically isolated keys |

### Product Philosophy
**"User brings the intelligence. Cortex provides the environment."**
Cortex serves as the specialized orchestration workspace containing the classroom, terminal emulator, memory indexes, and UI agent frameworks. The user feeds the framework directly with their own chosen credentials.

---

## 2. Technical Architecture & Unified Gateway

We will wrap AI calls in a client-side abstraction layer (`AiClientGateway`) to make the interface provider-agnostic.

```
                  ┌───────────────────────┐
                  │   Cortex UX Clients   │
                  └───────────┬───────────┘
                              │
                    [ AiClientGateway ]
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Gemini API  │       │ OpenAI REST  │       │  Anthropic   │
└──────────────┘       └──────────────┘       └──────────────┘
```

- **OpenAI Compatibility**: All OpenAI-compatible APIs (OpenAI, OpenRouter, Groq, local models) are managed using standard `/v1/chat/completions` request formatting.
- **Dynamic Embeddings**: Backend RAG document ingestion reads model parameters from incoming request headers, supporting dynamic embedding configurations (Gemini, OpenAI, Cohere, etc.).

---

## 3. Security Isolation boundaries

To ensure absolute credential protection:
1. **No Backend Key Persistence**: Student API keys are never stored in the MongoDB Atlas database.
2. **Transient Header Forwarding**: When backend processing is required, keys are passed in transient, in-memory request headers (`X-User-API-Key`).
3. **Log Sanitization**: Middleware intercepts outgoing logs and sanitizes strings matching standard Gemini, OpenAI, and Anthropic API key patterns.

---

## 4. User Experience & Learning Continuity

- **Zen Setup State**: KEY-less states are presented as elegant, non-intrusive setup grids rather than technical errors.
- **Provider Quick-Switching**: Students can switch model families mid-session with a single click.
- **Cost & Health Dashboard**: Monitors latency, approximate token usage, and provides direct setup links to developers' consoles.

---

## 5. Rollout & Migration Roadmap

1. **Stage 1 (Audit & Docs)**: Complete final system-wide audit (Completed).
2. **Stage 2 (Gateway Foundations)**: Build the frontend `AiClientGateway` and verify REST completion logic.
3. **Stage 3 (Ingestion Alignment)**: Refactor backend `documentService.js` to dynamic embedding resolution.
4. **Stage 4 (UI Deployment)**: Release setup flows, connection status check badge, and telemetry dashboard.
5. **Stage 5 (Deprecation)**: Graceful 14-day transition period for active users before shared keys are sunset.
