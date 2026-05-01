import { chatWithTutor, generateConceptMap } from './services/geminiService';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
process.env.VITE_GEMINI_API_KEY = env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    console.log("Testing chatWithTutor...");
    const res = await chatWithTutor([], "Hello", "test context");
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("ERROR in chatWithTutor:", e);
  }
}

test();
