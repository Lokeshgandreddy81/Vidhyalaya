# AI Provider Audit Report

This report analyzes how Vidhyalaya integrates, authenticates, and handles exceptions across multiple AI providers.

---

## 1. Provider Compatibility Matrix

With the BYOK architecture implemented, Vidhyalaya integrates with 5 primary provider endpoints:

| Provider | Authentication | Native API Format | Default Model | Custom Endpoints |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini** | API Key parameter / header | Google GenAI SDK | `gemini-2.5-flash` | Supported |
| **OpenAI** | Bearer Authorization header | `/v1/chat/completions` | `gpt-4o-mini` | Supported |
| **Anthropic** | `x-api-key` header | `/v1/messages` | `claude-3-5-haiku-latest` | Supported |
| **OpenRouter** | Bearer Authorization header | `/v1/chat/completions` | `google/gemini-2.5-flash` | Supported |
| **Groq** | Bearer Authorization header | `/v1/chat/completions` | `llama-3.3-70b-versatile` | Supported |

---

## 2. Key Handling & Provider Switching

### A. Missing API Key
- **Flow**: If a user tries to generate a course path or start a lesson module, and they have not configured a key, the application throws a clear error message:
  `API Key is missing. Please configure your API key in Settings or the API Setup screen.`
- **UX Impact**: Friendly blocking overlays redirect users to the key setup page, avoiding blank/crashing screens.
- **Evidence**: Verified in [geminiService.ts:L80-L86](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts#L80-L86).

### B. Invalid API Key
- **Flow**: When a request is made with an invalid key, the target completions endpoint returns an HTTP 401 or 403 response. The helper catch blocks extract the message and present it as an alert via Sonner toasts:
  `AI Provider Error (401): ...` or `Anthropic Error (401): ...`
- **UX Impact**: Dynamic notification without interrupting current local state.
- **Evidence**: Verified in [geminiService.ts:L130-L139](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts#L130-L139) and [geminiService.ts:L170-L177](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts#L170-L177).

---

## 3. What Happens If a Provider Fails?

- **Frontend Client Calls**: If the user's selected provider is down or experiencing a rate limit, the API request throws an error. The user is informed via toast notifications. They can seamlessly switch to another provider (e.g., from OpenAI to Gemini) in [Settings.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/Settings.tsx) or [ApiKeySetupPage.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/ApiKeySetupPage.tsx) to continue their session immediately without losing local learning histories.
- **Backend RAG Calls**: If Gemini is down during a university RAG call, the backend automatically retries across multiple fallback model identifiers in sequence (`BACKEND_MODEL_CANDIDATES`) before giving up, ensuring maximum service availability.
