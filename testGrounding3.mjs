import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: "AIzaSyBMrvaqwUM8DyEvLhS5NvfxSBOJXNlmuN4" });

async function test() {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Find resources for React testing',
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  console.log("Chunks length:", chunks?.length);
  console.log("Text:", response.text);
}
test();
