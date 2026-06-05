# Cost Optimization Report

By transitioning from a platform-funded model to a Bring Your Own Key (BYOK) architecture, Cortex achieves a permanent reduction in operating expenses (OpEx) while unlocking unbounded scaling capabilities.

---

## 1. Projected Platform Monthly Savings

| Category | Platform-Funded Cost (Per 1k Users) | BYOK Cost (Platform) | Net Platform Savings |
| :--- | :--- | :--- | :--- |
| **Model Generation Tokens** | $450.00 | $0.00 (User Funded) | 100% |
| **Grounding / Search Tools** | $250.00 | $0.00 (User Funded) | 100% |
| **RAG Embeddings (Mongoose/MongoDB)** | $120.00 | $0.00 (User Funded) | 100% |
| **Ingestion Pipeline Compute** | $80.00 | $20.00 (Shared Server Parsing) | 75% |
| **TOTAL** | **$900.00 / month** | **$20.00 / month** | **97.7% Savings** |

---

## 2. Infrastructure Reductions

1. **Elimination of Global Rate-Limiter Throttles**: Currently, Cortex enforces a strict 1.5s queue delay via `apiQueue.add()` on the frontend to avoid quota exhaustion. By shifting to user keys, global rate limits are eliminated. User queues can run concurrently without cross-user interference.
2. **Database Scale-down**: Embedding storage requirements in MongoDB can be pruned or capped per user, as users are responsible for managing their own indexed catalogs.
3. **Bandwidth Savings**: Direct browser-to-LLM execution avoids routing massive prompt payloads through backend proxies, resulting in lower server bandwidth consumption.
