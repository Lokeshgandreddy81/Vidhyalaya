import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/VITE_GEMINI_API_KEY=(.*)/);
if (!match) {
  console.log("No key found");
  process.exit(1);
}
const key = match[1].trim();

const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });
const preferredModels = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
];

function isQuotaError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.status === 429 || message.includes('quota exceeded') || message.includes('resource_exhausted');
}

async function listGenerateContentModels() {
  const pager = await ai.models.list();
  const names = [];

  for await (const model of pager) {
    const supportedActions = model.supportedActions ?? model.supported_actions ?? [];
    if (supportedActions.includes('generateContent') && model.name) {
      names.push(model.name.replace(/^models\//, ''));
    }
  }

  return names;
}

async function run() {
  try {
    const availableModels = await listGenerateContentModels();
    const candidates = [
      ...preferredModels.filter(model => availableModels.includes(model)),
      ...availableModels.filter(model => !preferredModels.includes(model)),
    ];

    console.log("Available models:", availableModels.join(', '));
    let lastError = null;

    for (const model of candidates) {
      console.log("Trying model:", model);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        });
        console.log("SUCCESS MODEL:", model);
        console.log("SUCCESS:", response.text);
        return;
      } catch (error) {
        lastError = error;
        if (isQuotaError(error)) {
          console.log(`Quota hit on ${model}, trying next model...`);
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('No available model succeeded.');
  } catch(e) {
    console.log("ERROR DETAILS:", e);
  }
}
run();
