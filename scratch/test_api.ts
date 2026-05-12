
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

const apiKey = process.env.GEMINI_API_KEY;

async function testKey() {
  if (!apiKey) {
    console.error("No API key found in backend/.env");
    return;
  }
  console.log("Testing key:", apiKey.substring(0, 8) + "...");
  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error: any) {
    console.error("FAILURE:", error.message);
    if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
      console.log("QUOTA EXHAUSTED for this key.");
    }
  }
}

testKey();
