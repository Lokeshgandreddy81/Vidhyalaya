# Premium BYOK Experience Design

The UI must frame BYOK not as a configuration barrier, but as the user building and tuning their own custom, private cognitive engine.

---

## 1. Missing Key & Empty States (Zen Empty State)

If a student attempts to open a study module, chat with SARA, or run a quiz without a connected key:

- **Visual Sheet**: A beautiful, minimalist grid panel featuring a lock icon surrounded by a soft, pulse-animating purple aurora.
- **Copywriting**: 
  - *Title*: "Bring Your Intelligence Engine"
  - *Subtitle*: "SARA needs a connection key to serve as your mentor. Your key remains private, sandboxed, and stored strictly in your browser."
- **Action CTA**: A floating, glassmorphic button labeled "Initialize API Gateway".

---

## 2. Real-Time Provider Switching

During an active study session (e.g. `StudySession.tsx`):
- A clean dropdown badge sits at the top right of the chat panel displaying the active model name (e.g., "⚡ Gemini 2.5 Flash").
- Clicking this badge slides open a fast-switcher panel allowing immediate toggle to other configured providers (e.g., "Switching to GPT-4o-mini").
- Switching is completed mid-session without reloading the workspace or losing the conversational context.

---

## 3. Usage Guidance & Cost Awareness

To keep users informed about their consumption:
- **Session Cost Tracker**: Renders a tiny, subtle footer displaying approximate token usage for the current session (e.g., *"Session: ~2.4k tokens ($0.003)"*).
- **Latency Indicator**: A clean, color-coded dot showing average model response speeds (Green = excellent, Orange = slow, Red = rate-limited).
- **Clear Onboarding Links**: Visual instructions on how to quickly request a free Gemini key from Google AI Studio, or OpenAI tokens from their developer dashboard.
