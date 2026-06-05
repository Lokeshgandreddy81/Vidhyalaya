# BYOK User Experience Design

Connecting an API key should never feel like configuring database connections. It should feel like unlocking a custom mental map and a personal workspace.

---

## 1. Unified Setup Flow (The "Intelligence Gateway")

When a user registers or logs in without an active key, they are presented with an immersive onboarding card:

1. **Provider Showcase**: Elegant cards representing Google Gemini, OpenAI, Anthropic, OpenRouter, and Groq with clean logos and latency/cost indicators (e.g., "Gemini: Best for visual recall, lowest cost" / "Anthropic: Best for coding, higher cost").
2. **One-Click Input**: A single passcode input styled with a lock icon.
3. **Instant Validation**: Once a key is pasted, Cortex sends a silent, lightweight check request in the background (e.g., a 5-token chat completion) with a spinning brain loader.
4. **Immediate Success Animation**: A clean micro-animation confirming authentication, revealing their custom AI model selection.

---

## 2. Key Management Control Center

A unified dashboard in **Settings > AI Workspace** allows users to:
- **Switch Providers**: Select their active model on the fly.
- **Inspect Key Health**: Real-time status badge showing "Active" or "Expired".
- **Monitor Usage**: A graphical visualization tracking approximate token output, cost savings, and average latency.
- **Configure Custom Endpoints**: Advanced option for self-hosters or local LLM developers (e.g., LM Studio, Ollama).

---

## 3. Graceful Error Handling & Fallbacks

- **Quota Exceeded (HTTP 429)**: Instead of a raw console dump, render: *"Your provider has paused requests. SARA is waiting for your API limit to reset."*
- **Invalid Key (HTTP 401)**: Render: *"Connection unsuccessful. Please review your API key or configure a different provider."*
- **Workspace Continuity**: If the key fails mid-session, all user notes and progress remain saved locally in the Zustand store. The interface offers a sliding sidebar to re-authenticate without forcing a page reload.
