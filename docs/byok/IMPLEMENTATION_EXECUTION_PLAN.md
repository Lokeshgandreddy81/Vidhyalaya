# BYOK Implementation Execution Plan

This execution plan lists the exact source-code files, components, and database changes required to finalize the BYOK transformation.

---

## 1. Technical Tasks & Changes

### A. Frontend Updates

#### [MODIFY] [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx)
- Integrate a new configuration state: `byokConfig: LLMConfig | null` and action `updateByokConfig: (config: LLMConfig) => void`.
- Persist `byokConfig` automatically to `localStorage` under `vidyal_byok_config`.

#### [MODIFY] [geminiService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts)
- Refactor the helper `getAI()` to inspect `byokConfig`.
- Implement provider-specific generation wrappers: `callOpenAI()`, `callAnthropic()`, `callGemini()`.
- Unify JSON schema structured parsing across providers using a lightweight schema translator.

#### [NEW] [ApiSetupPage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/ApiKeySetupPage.tsx)
- Build the provider setup interface featuring quick setup guide links, credential validation spinner, and connection success checks.

---

### B. Backend Updates

#### [MODIFY] [documentService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/documentService.js)
- Refactor embedding model generation from standard `GeminiEmbedding` to dynamic provider resolution using `getEmbeddingModel(provider, apiKey)`.

#### [MODIFY] [documentRoutes.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/routes/documentRoutes.js)
- Update RAG document upload handler `/upload` to accept user embedding provider configurations via custom request headers.

---

## 2. Release Sequence

1. **Sprint 1 (Infrastructure Foundation)**: Build the frontend `AiClientGateway` abstraction layer and database updates.
2. **Sprint 2 (Security & Backend)**: Implement transient request header forwarding and log masking filters.
3. **Sprint 3 (User Experience)**: Release the first-time onboarding screen, key health metrics dashboard, and status badges.
4. **Sprint 4 (Deprecation Rollout)**: Switch production flags, trigger active header banners, and sunset global platform API credentials.
