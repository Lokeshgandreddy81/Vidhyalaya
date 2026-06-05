# BYOK Architecture Plan

This document outlines the architectural blueprints to transform Cortex into a provider-agnostic, user-funded AI platform.

---

## 1. The Agnostic Abstraction Layer (`AiClientGateway`)

To support multiple providers, we will deprecate direct client-side imports of `@google/genai` and implement a unified interface:

```typescript
export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq';
  apiKey: string;
  customEndpoint?: string;
  preferredModel?: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  responseSchema?: any; // JSON Schema for structured outputs
  systemInstruction?: string;
}

export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### Gateway Implementation Strategy
All requests will pass through a client-side orchestrator class (`AiOrchestrator`) which inspects the active provider configuration:
1. **Gemini**: Directly calls standard Gemini GenAI REST endpoints or initialized GenAI client.
2. **OpenAI / OpenRouter / Groq**: Standardizes requests to the OpenAI-compatible `/v1/chat/completions` API format. This single protocol integrates OpenAI, OpenRouter, and Groq with minimal footprint.
3. **Anthropic**: Maps messages and formatting parameters to Anthropic's Messages API structure.

---

## 2. Server-Side Ingestion and Embedding Agnosticism

Currently, [documentService.js](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/backend/src/services/documentService.js) strictly creates a `GeminiEmbedding`.
We will modify the vector store creation to dynamically instantiate the appropriate embedding provider:

```javascript
import { GeminiEmbedding, OpenAIEmbedding } from 'llamaindex';

export const getEmbeddingModel = (provider, apiKey) => {
  switch (provider) {
    case 'openai':
      return new OpenAIEmbedding({ apiKey });
    case 'gemini':
    default:
      return new GeminiEmbedding({ model: 'models/gemini-embedding-001', apiKey });
  }
};
```

---

## 3. RAG Document Vector Storage Scoping

For user-specific custom RAG uploads (`/api/smart-study/upload`), document embeddings will be stored in a collection tagged with the user's provider configurations. 
For university-wide documents:
- Embedding model configuration is defined in the University settings by the Administrator.
- Students retrieve vector search responses utilizing the University's configured model, while personal study panels utilize their own connected keys.
