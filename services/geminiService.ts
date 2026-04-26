import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LearningPath, Resource, ChatMessage, QuizQuestion } from "../types";

const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3.1-pro-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

class AIRequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelayMs = 1500; 

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try { await task(); } catch (e) { console.error("Queue Task Error:", e); }
        await new Promise(resolve => setTimeout(resolve, this.minDelayMs));
      }
    }
    this.isProcessing = false;
  }
}

const apiQueue = new AIRequestQueue();

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = error.status === 429 || error.message?.includes('429') || error.message?.includes('exhausted');
    if (isQuotaError && retries > 0) {
      console.warn(`Quota hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 2); 
    }
    throw error;
  }
}

export const generateLearningPlan = async (
  goal: string,
  resources: string,
  dailyCommitment: number,
  skillLevel: string,
  expectedOutcome?: string,
  targetDate?: string
): Promise<any> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const prompt = `Create a 3-Phase learning roadmap for: "${goal}". Level: "${skillLevel}". Outcome: "${expectedOutcome || 'Mastery'}". Resources: ${resources.substring(0, 2000)}. Return JSON.`;
    const response = await getAI().models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  modules: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        estimatedMinutes: { type: Type.INTEGER },
                        keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["title", "description", "estimatedMinutes", "keyConcepts"]
                    }
                  }
                },
                required: ["title", "description", "modules"]
              }
            }
          },
          required: ["title", "phases"]
        },
      }
    });
    
    if (!response.text) {
      console.error("Empty AI response", response);
      throw new Error("AI returned an empty response. Please try again.");
    }

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("JSON Parse Error", e, "Raw Text:", response.text);
      throw new Error("AI returned invalid data format. Please try again.");
    }
  }));
};

export const scoutResources = async (topic: string): Promise<Resource[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: FLASH_MODEL,
      contents: `Suggest 2 YouTube video IDs and 2 documentation URLs for learning: "${topic}". Return ONLY a JSON array from your training data - do NOT perform live web search. Each item must have: title, type ('youtube' or 'url'), and content (video ID for youtube, full URL for docs).`
    });

    if (!response.text) throw new Error("Empty response from AI");

    // Parse JSON from response (may be wrapped in markdown)
    let jsonStr = response.text;
    const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const results = JSON.parse(jsonStr);
    return results.map((res: any) => {
      let videoId = undefined;
      if (res.type === 'youtube') {
        // Extract video ID if full URL was provided
        const match = res.content.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|\/embed\/|\/v\/))([^?&"'>]+)/);
        videoId = match ? match[1] : res.content; // If already an ID, use as-is
        return { id: Math.random().toString(36).substr(2, 9), title: res.title, type: 'youtube' as const, content: res.content, videoId };
      }
      return { id: Math.random().toString(36).substr(2, 9), ...res };
    });
  }));
};

export const generateQuizForModule = async (moduleTitle: string, concepts: string[]): Promise<QuizQuestion[]> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: FLASH_MODEL,
      contents: `Generate 5 Quiz questions for "${moduleTitle}". Concepts: ${concepts.join(", ")}. JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });
    
    if (!response.text) throw new Error("Empty response from AI");
    return JSON.parse(response.text);
  }));
};

export const chatWithTutor = async (history: ChatMessage[], newMessage: string, context: string): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const chat = getAI().chats.create({
      model: FLASH_MODEL,
      config: { systemInstruction: `AI Tutor for Vidyal.ai. Context: ${context}. Response in Markdown.` },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
    });
    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  }));
};

export const generateModuleContent = async (moduleTitle: string, concepts: string[], goal: string): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: FLASH_MODEL,
      contents: `Detailed Study Guide for "${moduleTitle}". Goal: "${goal}". Concepts: ${concepts.join(", ")}. Clean Markdown.`
    });
    return response.text;
  }));
};

export const generateAudioOverview = async (text: string): Promise<ArrayBuffer | null> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: TTS_MODEL,
      contents: `Read clearly: ${text.substring(0, 1000)}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }));
};

export const visualizeConcept = async (concept: string): Promise<string | null> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: `Educational diagram: ${concept}` }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  }));
};

export const searchWebForResources = async (topic: string): Promise<string> => {
  return apiQueue.add(() => retryWithBackoff(async () => {
    const response = await getAI().models.generateContent({
      model: FLASH_MODEL,
      contents: `Suggest high-quality learning resources for: "${topic}". Include well-known documentation links, tutorials, and courses from the model's training data. Do NOT perform live web search. Format as a clean list with titles and URLs.`
    });
    return response.text || "";
  }));
};
