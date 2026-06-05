# AI Infrastructure Audit

This document details the current AI systems, token consumption points, and dependencies across the Vidhyalaya platform.

---

## 1. What Uses AI & Why

| Component | AI Role / Purpose | Technical Dependency | Cost Center |
| :--- | :--- | :--- | :--- |
| **Roadmap Generation** (`createPath`) | Dynamically parses user goals, queries external sources, and generates structured JSON roadmaps. | Client-side Gemini GenAI SDK | Medium (structured output queries) |
| **Module Content Generation** | Synthesizes academic whitepapers from grounding articles and web resources. | Client-side Gemini GenAI SDK (googleSearch tool) | High (long outputs, web search tool usage) |
| **Resource Scouting** | Live web searching for YouTube videos and articles matching learning topics. | Client-side Gemini GenAI SDK (googleSearch tool) | Medium |
| **SARA Tutor Chat** | Conversational peer tutoring with adaptive pedagogical modes (Socratic, Debugger, etc.) | Client-side Gemini GenAI SDK | High (context history accumulates tokens) |
| **Active Recall Flashcards** | Generates conceptual Q&A from highlighted course material and grades student answers. | Client-side Gemini GenAI SDK & `/api/study/*` | Low-Medium |
| **Mastery Quizzes** | Synthesizes multiple-choice testing questions based on key concepts. | Client-side Gemini GenAI SDK & `/api/study/*` | Low-Medium |
| **Mermaid Diagrams** | Auto-generates structured workflow charts for active visual recall. | Client-side Gemini GenAI SDK | Low |
| **Smart Study Document (RAG)** | Ingests university-provided PDFs, builds embeddings, and runs interactive vector search chats. | Backend LlamaIndex (`GeminiEmbedding`) + Gemini Files API | Very High (high-frequency embedding & ingestion) |

---

## 2. API Dependencies & SDK Footprint

### Frontend
- **SDK**: `@google/genai` (v1.52.0)
- **Instantiator**: `getAI()` inside [geminiService.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/services/geminiService.ts).
- **Fallbacks**: Resolves key via `localStorage.getItem('vidyal_custom_gemini_api_key')` or environment variables.

### Backend
- **Ingestion Pipeline**: In [documentService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/documentService.js), `LlamaParseReader` parses PDFs to Markdown. `GeminiEmbedding` (configured with university Admin Gemini keys) embeds chunks into MongoDB.
- **Smart Study Chat**: Uses Gemini File API (`ai.files.upload`) and `ai.models.generateContent` inside [geminiService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/geminiService.js) to upload PDFs directly to Gemini.

---

## 3. Cost Centers & Scalability Risks

1. **Google Search Tool Usage**: Live web scouting triggers Gemini search grounding charges, which are significantly higher than raw model generation.
2. **Accumulating Chat Context**: Active student chats send historical messages recursively, causing exponential input token growth.
3. **RAG Vector Ingestion**: Building vector indexes for multi-megabyte academic text documents requires hundreds of embedding calls per document.

---

## 4. Migration Risks & Friction Points

- **Prompt Adaptability**: Current system instructions and structured schemas are tailored specifically to Gemini's parameters (e.g. `responseSchema`, `googleSearch` tool configuration). Switching to OpenAI or Anthropic requires prompt translations.
- **File API Constraints**: The Smart Study panel relies on Gemini's native File API for document-based conversations. Supporting other LLM providers requires a unified file-processing strategy (e.g., extracting text on backend and passing it via system context).
