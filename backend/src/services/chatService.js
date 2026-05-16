import { VectorStoreIndex, MetadataMode, storageContextFromDefaults } from 'llamaindex';
import { Gemini, GeminiEmbedding } from '@llamaindex/google';
import { createVectorStore } from '../config/ragConfig.js';

export const askSaraWithRAG = async (query, documentId, userApiKey, history = []) => {
  try {
    if (!userApiKey) {
      throw new Error('Internal Server Error: University API key could not be resolved.');
    }

    // Create a BYOK embedding model instance for this request
    const embedModel = new GeminiEmbedding({
      model: 'models/gemini-embedding-001',
      apiKey: userApiKey,
    });

    // Create a fresh vectorStore with the BYOK embedModel injected directly
    // into the constructor — prevents the SDK caching bug entirely.
    const vectorStore = createVectorStore(embedModel);

    // Load the existing index from MongoDB Atlas without requiring nodes
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

    // Instantiate a per-request BYOK LLM for generation
    const llm = new Gemini({
      model: 'gemini-2.0-flash-001',
      apiKey: userApiKey,
    });

    const historyText = history.length > 0 
      ? history.map(h => `${h.role === 'user' ? 'Student' : 'SARA'}: ${h.text}`).join('\n')
      : 'No previous conversation history.';

    const systemPrompt = `You are SARA, an academic study assistant.
Use ONLY the provided context to answer. If the answer is not in the context, say so clearly. Do not use outside knowledge.

Context:
${contextText}

Conversation History:
${historyText}

Current Student Query: ${query}`;

    console.log(`[ChatService] Querying Gemini with ${nodes.length} retrieved chunks...`);
    const response = await llm.complete({ prompt: systemPrompt });

    return {
      answer: response.text,
      retrievedChunks: nodes.length,
    };
  } catch (error) {
    console.error(`❌ Error in askSaraWithRAG:`, error);
    throw error;
  }
};

export const explainHighlight = async (highlightedText, userApiKey) => {
  try {
    if (!userApiKey) {
      throw new Error('Missing userApiKey for BYOK student chat.');
    }

    const llm = new Gemini({
      model: 'gemini-2.0-flash-001',
      apiKey: userApiKey,
    });

    const systemPrompt = `You are SARA, an academic study assistant. 
Please explain the following highlighted text in simple, easy-to-understand terms. Break down complex words, and use a real-world analogy if helpful.

Highlighted Text:
"${highlightedText}"`;

    console.log(`[ChatService] Explaining highlight directly via Gemini...`);
    const response = await llm.complete({ prompt: systemPrompt });

    return {
      answer: response.text,
    };
  } catch (error) {
    console.error(`❌ Error in explainHighlight:`, error);
    throw error;
  }
};
