import { VectorStoreIndex, MetadataMode } from 'llamaindex';
import { Gemini, GeminiEmbedding } from '@llamaindex/google';
import { createVectorStore } from '../config/ragConfig.js';

/**
 * generateFlashcards — Phase 2 SARA AI Generator
 * Retrieves relevant context from MongoDB and instructs Gemini
 * to return a strict raw JSON array of 3 conceptual flashcards.
 */
export const generateFlashcards = async (highlightedText, documentId, userApiKey) => {
  if (!userApiKey) throw new Error('Internal Server Error: University API key could not be resolved.');
  if (!highlightedText) throw new Error('highlightedText is required.');
  if (!documentId) throw new Error('documentId is required.');

  const llm = new Gemini({ model: 'gemini-2.0-flash-001', apiKey: userApiKey });

  // Create a BYOK-specific embedding model and fresh vectorStore per request
  const embedModel = new GeminiEmbedding({
    model: 'models/gemini-embedding-001',
    apiKey: userApiKey,
  });
  const vectorStore = createVectorStore(embedModel);
  const index = await VectorStoreIndex.fromVectorStore(vectorStore);
  index.embedModel = embedModel; // Force the BYOK model for retrieval

  // Retrieve context chunks filtered by this document
  const retriever = index.asRetriever({
    similarityTopK: 4,
    preFilters: {
      filters: [{ key: 'documentId', value: documentId.toString(), operator: '==' }]
    }
  });

  const nodes = await retriever.retrieve({ query: highlightedText });
  const contextText = nodes.length > 0
    ? nodes.map(n => n.node.getContent(MetadataMode.NONE)).join('\n\n---\n\n')
    : `Highlighted text: "${highlightedText}"`;

  const prompt = `You are SARA, an academic study engine.

TASK: Generate exactly 3 Conceptual/Application flashcards based on the content below.

STRICT RULES:
1. Return ONLY a raw JSON array. No markdown, no code fences, no explanation text.
2. Each object must have exactly two keys: "question" and "answer".
3. Focus on deep conceptual understanding or application. NO trivial fact recall.
4. Answers must be concise but complete (2–4 sentences max).

Document Context:
${contextText}

Highlighted Text the student is studying:
"${highlightedText}"

Output ONLY valid JSON like this:
[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]`;

  console.log(`[StudyService] Generating flashcards for document ${documentId}...`);
  const response = await llm.complete({ prompt });

  // Sanitize: strip any accidental markdown code fences Gemini might wrap around it
  const raw = response.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  let flashcards;
  try {
    flashcards = JSON.parse(raw);
  } catch (e) {
    throw new Error(`SARA returned malformed JSON. Raw output: ${raw.substring(0, 200)}`);
  }

  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    throw new Error('SARA returned an empty or invalid flashcard array.');
  }

  return flashcards;
};

/**
 * gradeFlashcardAnswer — Conversational Semantic Grading
 * Does NOT use the vector store. Uses Gemini to semantically compare
 * the student's answer to the correct answer with a tutoring tone.
 */
export const gradeFlashcardAnswer = async (flashcardQuestion, correctAnswer, userInputAnswer, userApiKey) => {
  if (!userApiKey) throw new Error('Internal Server Error: University API key could not be resolved.');

  const llm = new Gemini({ model: 'gemini-2.0-flash-001', apiKey: userApiKey });

  const prompt = `You are SARA, a brilliant, empathetic senior peer tutor.

A student just answered a flashcard question. Evaluate their response with warmth and intelligence.

QUESTION: ${flashcardQuestion}

CORRECT ANSWER (Textbook Definition): ${correctAnswer}

STUDENT'S ANSWER: ${userInputAnswer}

YOUR TASK:
1. Start with a conversational, direct assessment. Give a rough accuracy estimate (e.g., "Spot on!", "About 80% there!", "You've got the right idea, but...").
2. Point out exactly what was correct in their response (be specific).
3. If anything was missing or wrong, gently explain what was missed and why it matters.
4. End with one brief encouraging sentence.

Keep it concise (3–5 sentences total). Speak like a smart friend, not a grading rubric.`;

  console.log(`[StudyService] Grading student answer for question: "${flashcardQuestion.substring(0, 60)}..."`);
  const response = await llm.complete({ prompt });

  return { feedback: response.text.trim() };
};
