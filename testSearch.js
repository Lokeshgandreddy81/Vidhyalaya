import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim();

const genAI = new GoogleGenAI({ apiKey });

async function list() {
    const result = await genAI.models.list();
    console.log(JSON.stringify(result, null, 2));
}

list();
