import { VectorStoreIndex, MetadataMode } from 'llamaindex';
import { Gemini, GeminiEmbedding } from '@llamaindex/google';
import { createVectorStore } from '../config/ragConfig.js';
import { callAIEngine } from '../utils/aiClientRouter.js';

/**
 * Helper to resolve the correct Gemini key for vector embeddings lookup
 */
const resolveGeminiEmbedKey = (req, fallbackApiKey) => {
  // Prefer the decrypted key from byokShield middleware (non-enumerable, not in headers)
  if (req?.rawByokKey?.trim().length > 20) return req.rawByokKey.trim();
  // Legacy fallback for any route that doesn't pass through byokShield
  const headers = req?.headers || {};
  const byokMode = headers['x-byok-mode'] || 'auto';
  if (byokMode === 'custom' && headers['x-byok-provider'] === 'gemini') {
    const key = headers['x-byok-api-key'] || '';
    if (key.trim().length > 20) return key.trim();
  }
  return fallbackApiKey || process.env.GEMINI_API_KEY || '';
};

/**
 * generateFlashcards — Phase 2 SARA AI Generator
 * Retrieves relevant context from MongoDB and instructs the LLM
 * to return a strict raw JSON array of 3 conceptual flashcards.
 */
export const generateFlashcards = async (highlightedText, documentId, req, fallbackApiKey) => {
  if (!highlightedText) throw new Error('highlightedText is required.');
  if (!documentId) throw new Error('documentId is required.');

  const embedApiKey = resolveGeminiEmbedKey(req, fallbackApiKey);
  if (!embedApiKey) throw new Error('Internal Server Error: Gemini API key for embeddings could not be resolved.');

  // Create a BYOK-specific embedding model and fresh vectorStore per request
  const embedModel = new GeminiEmbedding({
    model: 'models/gemini-embedding-001',
    apiKey: embedApiKey,
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
  const responseText = await callAIEngine({
    req,
    prompt,
    temperature: 0.35,
    responseMimeType: 'application/json',
  });

  // Sanitize: strip any accidental markdown code fences Gemini might wrap around it
  const raw = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

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
 * Does NOT use the vector store. Uses the LLM to semantically compare
 * the student's answer to the correct answer with a tutoring tone.
 */
export const gradeFlashcardAnswer = async (flashcardQuestion, correctAnswer, userInputAnswer, req) => {
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
  const responseText = await callAIEngine({
    req,
    prompt,
    temperature: 0.3,
  });

  return { feedback: responseText.trim() };
};

/**
 * generateQuiz — SARA Assessment Generator
 * Retrieves relevant context from MongoDB and instructs the LLM
 * to return a strict raw JSON array of 5 multiple choice questions.
 */
export const generateQuiz = async (highlightedText, documentId, req, fallbackApiKey) => {
  if (!highlightedText) throw new Error('highlightedText is required.');
  if (!documentId) throw new Error('documentId is required.');

  const embedApiKey = resolveGeminiEmbedKey(req, fallbackApiKey);
  if (!embedApiKey) throw new Error('Internal Server Error: Gemini API key for embeddings could not be resolved.');

  // Create a BYOK-specific embedding model and fresh vectorStore per request
  const embedModel = new GeminiEmbedding({
    model: 'models/gemini-embedding-001',
    apiKey: embedApiKey,
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

  const prompt = `You are SARA, an academic assessment engine.

TASK: Generate exactly 5 Multiple Choice Questions (MCQs) based on the content below.

STRICT RULES:
1. Return ONLY a raw JSON array. No markdown, no code fences, no explanation text.
2. Each object must have exactly these keys: "question", "options" (array of exactly 4 strings), "correctAnswerIndex" (integer 0-3), and "explanation" (string).
3. Focus on deep conceptual understanding or application. NO trivial fact recall.
4. The explanation should be a concise 1-2 sentence clarification of why the answer is correct.

Document Context:
${contextText}

Highlighted Text the student is studying:
"${highlightedText}"

Output ONLY valid JSON like this:
[{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0, "explanation": "..."}]`;

  console.log(`[StudyService] Generating quiz for document ${documentId}...`);
  const responseText = await callAIEngine({
    req,
    prompt,
    temperature: 0.35,
    responseMimeType: 'application/json',
  });

  // Sanitize: strip any accidental markdown code fences Gemini might wrap around it
  const raw = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  
  let quiz;
  try {
    quiz = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse AI output as JSON:', raw);
    throw new Error('SARA returned invalid quiz data format.');
  }

  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw new Error('SARA returned an empty or invalid quiz array.');
  }

  return quiz;
};

