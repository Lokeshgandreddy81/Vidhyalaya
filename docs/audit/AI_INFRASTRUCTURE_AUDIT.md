# AI Infrastructure Audit Report

This report evaluates the stability, architecture, prompt management, and execution integrity of Vidhyalaya's AI orchestration systems.

---

## 1. AI Orchestration Architecture

Vidhyalaya operates a hybrid AI gateway:
- **Client-Side AI completions (`geminiService.ts`)**: Direct model connection utilizing client-configured BYOK keys. This is used for generating paths, custom lesson modules, quiz assessments, concept definitions, flashcards, and terminal advice.
- **Server-Side RAG completions (`chatService.js` / `studyService.js`)**: Backed by MongoDB Atlas Vector Search indices. Operates on the university's institutional key to retrieve vector search context, format prompt templates, and return answers to the Smart Study panel.

---

## 2. Component Verification

### A. Pathway & Lesson Generation
- **Flow**: User requests a new path -> Client compiles prompt context -> Submits directly to LLM completions (either Gemini REST API, OpenAI, Anthropic, OpenRouter, or Groq) -> Structured JSON output is received, decoded, validated, and saved.
- **Verification**: Frontend Vitest files verify prompt generation format and schema validation parser helpers.
- **Evidence**: Verified in [geminiService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts) and path creation pages.
- **Status**: **Secure & Functional**

### B. Smart Study / SARA Ecosystem RAG
- **Flow**: Student submits query -> Backend resolves university key -> Embeds query utilizing the university's model -> Searches collection chunks matching target document ID -> Assembles system context -> Calls LLM completions -> Returns response.
- **Verification**: Verified via backend integration testing. Fallbacks handle candidate model switching.
- **Evidence**: Verified in [chatService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/chatService.js) and [studyService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/studyService.js).
- **Status**: **Secure & Functional**

---

## 3. Failure & Recovery Assessment

### A. JSON Parser Resiliency
- **Problem**: When requesting JSON schemas, models occasionally wrap outputs in markdown enclosures (e.g. ` ```json ... ``` `).
- **Audit Findings**: The application implements regex cleaners to strip these markers before parsing.
  ```javascript
  const raw = response.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  ```
- **Risk Level**: **None** (well-mitigated).

### B. Fallback Model Candidates (Backend)
- **Problem**: What happens if a specific Gemini model is deprecated or hits a quota failure on the server?
- **Audit Findings**: The server loops through candidate models (`BACKEND_MODEL_CANDIDATES`) in sequence until a request succeeds.
  ```javascript
  const BACKEND_MODEL_CANDIDATES = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.0-flash-001'
  ];
  ```
- **Evidence**: Verified in [chatService.js:L5-L26](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/chatService.js#L5-L26).
- **Risk Level**: **Low** (excellent fallback design).
