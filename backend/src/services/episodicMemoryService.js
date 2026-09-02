import EpisodicMemory from '../models/EpisodicMemory.js';
import { getAIProviderClient } from './aiProviderFactory.js';
import { generateEmbeddings } from './embeddingService.js';
import { cosineSimilarity } from '../utils/math.js';

const DUP_SIMILARITY_THRESHOLD = 0.88;

/**
 * Safely resolves the AI provider client without throwing exceptions.
 */
function resolveProvider(req) {
  try {
    return getAIProviderClient(req?.headers || {});
  } catch (err) {
    return null;
  }
}

/**
 * Save an episodic memory item for a user with vector embedding generation and deduplication.
 */
export async function saveEpisodicMemory({
  userId,
  content,
  category = 'preference',
  metadata = {},
  req = null,
}) {
  if (!userId || !content || typeof content !== 'string' || !content.trim()) {
    return null;
  }

  const cleanedContent = content.trim().substring(0, 800);
  const provider = resolveProvider(req);

  let embedding = [];
  if (provider) {
    try {
      const embeddings = await generateEmbeddings([cleanedContent], provider);
      if (embeddings && embeddings.length > 0 && Array.isArray(embeddings[0])) {
        embedding = embeddings[0];
      }
    } catch (err) {
      console.warn('[EpisodicMemoryService] Embedding generation warning:', err.message);
    }
  }

  // Fetch existing memories for deduplication check
  try {
    const existingMemories = await EpisodicMemory.find({ userId });

    if (embedding.length > 0) {
      let highestSimilarity = 0;
      let targetMem = null;

      for (const mem of existingMemories) {
        if (mem.embedding && mem.embedding.length === embedding.length) {
          const sim = cosineSimilarity(embedding, mem.embedding);
          if (sim > highestSimilarity) {
            highestSimilarity = sim;
            targetMem = mem;
          }
        }
      }

      if (targetMem && highestSimilarity >= DUP_SIMILARITY_THRESHOLD) {
        targetMem.content = cleanedContent; // Refresh content with newest phrasing
        targetMem.metadata = { ...targetMem.metadata, ...metadata, lastSeenAt: new Date() };
        targetMem.embedding = embedding;
        await targetMem.save();
        return targetMem;
      }
    } else {
      // Fallback exact/fuzzy text matching if no embedding vector is available
      const exactMatch = existingMemories.find(
        (m) => m.content.toLowerCase() === cleanedContent.toLowerCase()
      );
      if (exactMatch) {
        exactMatch.metadata = { ...exactMatch.metadata, ...metadata, lastSeenAt: new Date() };
        await exactMatch.save();
        return exactMatch;
      }
    }

    const newMem = new EpisodicMemory({
      userId,
      category,
      content: cleanedContent,
      embedding,
      metadata,
    });

    await newMem.save();
    return newMem;
  } catch (err) {
    console.error('[EpisodicMemoryService] Failed to save memory:', err.message);
    return null;
  }
}

/**
 * Recall vector-backed memories for a user given a query string using cosine similarity.
 */
export async function recallEpisodicMemories({
  userId,
  queryText = '',
  topK = 5,
  minSimilarity = 0.35,
  req = null,
}) {
  if (!userId) return [];

  try {
    const allMemories = await EpisodicMemory.find({ userId }).lean();
    if (!allMemories || allMemories.length === 0) return [];

    const provider = resolveProvider(req);
    const cleanedQuery = (queryText || '').trim();

    if (cleanedQuery && provider) {
      try {
        const queryEmbeddings = await generateEmbeddings([cleanedQuery], provider);
        const queryVec = queryEmbeddings?.[0];

        if (queryVec && Array.isArray(queryVec) && queryVec.length > 0) {
          const scored = allMemories
            .map((mem) => {
              let sim = 0;
              if (mem.embedding && mem.embedding.length === queryVec.length) {
                sim = cosineSimilarity(queryVec, mem.embedding);
              }
              return { ...mem, similarity: sim };
            })
            .filter((mem) => mem.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity);

          if (scored.length > 0) {
            return scored.slice(0, topK);
          }
        }
      } catch (err) {
        console.warn('[EpisodicMemoryService] Recall vector embedding warning:', err.message);
      }
    }

    // Fallback: return most recent memories sorted by updated date
    return allMemories
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, topK)
      .map((m) => ({ ...m, similarity: 1.0 }));
  } catch (err) {
    console.error('[EpisodicMemoryService] Memory recall error:', err.message);
    return [];
  }
}

/**
 * Extract and automatically persist memory items from user actions, messages, compilation errors, or quiz results.
 */
export async function extractAndPersistMemory({
  userId,
  newMessage = '',
  chatContext = null,
  executionResult = null,
  quizResult = null,
  req = null,
}) {
  if (!userId) return;

  // Run asynchronously without blocking caller thread
  setImmediate(async () => {
    try {
      // 1. Detect explicit coding style or architectural preferences
      if (newMessage && typeof newMessage === 'string') {
        const msg = newMessage.trim();

        const preferencePatterns = [
          /\b(i\s+prefer\s+[\w\s/.-]{3,60})/i,
          /\b(my\s+coding\s+style\s+is\s+[\w\s/.-]{3,60})/i,
          /\b(always\s+use\s+[\w\s/.-]{3,60})/i,
          /\b(never\s+use\s+[\w\s/.-]{3,60})/i,
          /\b(favor\s+[\w\s/.-]{3,60}\s+over\s+[\w\s/.-]{3,60})/i,
          /\b(prefer\s+[\w\s/.-]{3,60}\s+instead\s+of\s+[\w\s/.-]{3,60})/i,
        ];

        for (const pattern of preferencePatterns) {
          const match = msg.match(pattern);
          if (match && match[1]) {
            const memoryContent = `Learner Preference: "${match[1].trim()}"`;
            await saveEpisodicMemory({
              userId,
              content: memoryContent,
              category: 'preference',
              metadata: { extractedFrom: 'chat_preference' },
              req,
            });
            break;
          }
        }
      }

      // 2. Extract terminal compilation errors
      if (chatContext?.lastCompilationError?.trim()) {
        const errLog = chatContext.lastCompilationError.trim().substring(0, 300);
        const memoryContent = `Struggled with compilation/runtime error: ${errLog.replace(/\n+/g, ' ')}`;
        await saveEpisodicMemory({
          userId,
          content: memoryContent,
          category: 'error',
          metadata: { activeModule: chatContext.activeModule || null },
          req,
        });
      }

      // 3. Extract execution errors from tool execution
      if (executionResult && (executionResult.status === 'error' || executionResult.output?.includes('Error:'))) {
        const execErr = (executionResult.output || executionResult.summary || '').trim().substring(0, 300);
        if (execErr) {
          const memoryContent = `Sandbox execution error: ${execErr.replace(/\n+/g, ' ')}`;
          await saveEpisodicMemory({
            userId,
            content: memoryContent,
            category: 'error',
            metadata: { toolName: executionResult.toolName || 'codeRunner' },
            req,
          });
        }
      }

      // 4. Extract quiz failures or benchmark struggles
      if (quizResult && quizResult.passed === false) {
        const topic = quizResult.topic || quizResult.question || 'quiz benchmark';
        const memoryContent = `Struggled with quiz assessment on concept: "${topic}"`;
        await saveEpisodicMemory({
          userId,
          content: memoryContent,
          category: 'quiz_failure',
          metadata: { score: quizResult.score || 0 },
          req,
        });
      }
    } catch (err) {
      console.warn('[EpisodicMemoryService] Extraction error:', err.message);
    }
  });
}
