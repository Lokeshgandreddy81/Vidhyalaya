# BYOK Migration Plan

This plan documents the phased rollout strategy to transition existing and new users to the BYOK architecture with minimal friction.

---

## 1. User Rollout Streams

### A. Existing Active Users
- **Deprecation Grace Period**: We will maintain the platform-funded Gemini API key for a 14-day transition window.
- **In-App Notification**: A non-intrusive header banner appears: *"Cortex is moving to private user API keys. Set up your personal AI gateway before October 15 to continue learning seamlessly."*
- **Auto-import**: If an existing user has already entered a custom Gemini key in settings (`vidyal_custom_gemini_api_key`), the system will automatically import and migrate it to the new unified configuration key (`vidyal_byok_config`).

### B. New Onboarding Flow
- During registration, the onboarding guide introduces the "Intelligence Setup" screen.
- Users can choose to connect their key immediately or start in "Simulated Offline Mode" (using mocks or local LLM settings).

---

## 2. Testing Strategy

1. **Dry-run verification**: Test client-side connection flows against mocked API keys on different networks.
2. **Provider Multi-Compatibility Test**: Execute verification completions targeting OpenAI, Gemini, Anthropic, OpenRouter, and Groq to verify JSON structural compatibility.
3. **Ingestion Fallback Validation**: Upload test PDFs with invalid user keys to verify that the RAG pipeline correctly throws readable scope error feedback.

---

## 3. Rollback Protocol

- A master feature flag (`VITE_ENABLE_SHARED_FALLBACK_AI`) will remain in the production codebase.
- In case of critical onboarding blockers or key verification failures on the client side, setting this flag to `true` dynamically restores the shared platform API keys, allowing users to continue unblocked.
