import { VectorStoreIndex, MetadataMode } from 'llamaindex';
import { GeminiEmbedding } from '@llamaindex/google';
import { createVectorStore } from '../config/ragConfig.js';
import { callAIEngine, callAIEngineStream } from '../utils/aiClientRouter.js';

/**
 * Helper to resolve the correct Gemini key for vector embeddings lookup
 */
const resolveGeminiEmbedKey = (req, fallbackApiKey) => {
  const headers = req?.headers || {};
  const byokMode = headers['x-byok-mode'] || 'auto';
  if (byokMode === 'custom' && headers['x-byok-provider'] === 'gemini') {
    const key = headers['x-byok-api-key'] || '';
    if (key.trim().length > 20) return key.trim();
  }
  return fallbackApiKey || process.env.GEMINI_API_KEY || '';
};

export const askSaraWithRAG = async (query, documentId, req, fallbackApiKey, history = [], onChunk = null) => {
  try {
    const embedApiKey = resolveGeminiEmbedKey(req, fallbackApiKey);
    if (!embedApiKey) {
      throw new Error('Internal Server Error: Gemini API key for embeddings could not be resolved.');
    }

    // Create a BYOK embedding model instance for this request
    const embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: embedApiKey,
    });

    // Create a fresh vectorStore with the BYOK embedModel injected directly
    const vectorStore = createVectorStore(embedModel);

    // Load the existing index from MongoDB Atlas
    const index = await VectorStoreIndex.fromVectorStore(vectorStore);
    index.embedModel = embedModel; // Force the BYOK model for retrieval

    // Perform vector search pre-filtered strictly by documentId
    const retriever = index.asRetriever({
      similarityTopK: 4,
      preFilters: {
        filters: [
          {
            key: 'documentId',
            value: documentId.toString(),
            operator: '==',
          },
        ],
      },
    });

    console.log(`[ChatService] Retrieving chunks for query: "${query}" on document ${documentId}...`);
    const nodes = await retriever.retrieve({ query });

    if (!nodes || nodes.length === 0) {
      return {
        answer: "I couldn't find any relevant information in this document to answer your question.",
        retrievedChunks: 0,
      };
    }

    // Combine retrieved text chunks as context
    const contextText = nodes.map(n => n.node.getContent(MetadataMode.NONE)).join('\n\n---\n\n');

    const historyText = history.length > 0 
      ? history.map(h => `${h.role === 'user' ? 'Student' : 'SARA'}: ${h.text}`).join('\n')
      : 'No previous conversation history.';

    const systemPrompt = `You are SARA, a brilliant, general-purpose autonomous study companion and academic AI assistant.
Your answers should be grounded in and prioritize the provided document context below. However, if the student asks for detailed explanations, coding examples, real-world analogies, or adjacent background knowledge that is not directly written in the context, you are fully authorized to use your vast general knowledge to provide a comprehensive, unconstrained answer. Make sure to keep the explanation relevant and bridge it back to the document context to keep the user directed on their study path.

Context:
${contextText}

Conversation History:
${historyText}

Current Student Query: ${query}`;

    console.log(`[ChatService] Querying AI engine with ${nodes.length} retrieved chunks...`);
    if (onChunk) {
      let text = '';
      await callAIEngineStream({
        req,
        prompt: systemPrompt,
        temperature: 0.3,
        onChunk: (chunk) => {
          text += chunk;
          onChunk(chunk);
        },
      });
      return {
        answer: text.trim(),
        retrievedChunks: nodes.length,
      };
    }

    const responseText = await callAIEngine({
      req,
      prompt: systemPrompt,
      temperature: 0.3,
    });

    return {
      answer: responseText.trim(),
      retrievedChunks: nodes.length,
    };
  } catch (error) {
    console.error(`❌ Error in askSaraWithRAG:`, error);
    throw error;
  }
};

export const explainHighlight = async (highlightedText, req, fallbackApiKey) => {
  try {
    const systemPrompt = `You are SARA, an academic study assistant. 
Please explain the following highlighted text in simple, easy-to-understand terms. Break down complex words, and use a real-world analogy if helpful.

Highlighted Text:
"${highlightedText}"`;

    console.log(`[ChatService] Explaining highlight directly via AI engine...`);
    const responseText = await callAIEngine({
      req,
      prompt: systemPrompt,
      temperature: 0.3,
    });

    return {
      answer: responseText.trim(),
    };
  } catch (error) {
    console.error(`❌ Error in explainHighlight:`, error);
    throw error;
  }
};

