import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

/**
 * Unified factory to retrieve the correct AI provider client on the fly.
 * Resolves API keys from custom request headers or falls back to server environment keys.
 */
export function getAIProviderClient(headers) {
    const geminiKey = headers['x-gemini-key'] || (headers['x-byok-provider'] === 'gemini' ? headers['x-byok-api-key'] : null) || headers['x-user-gemini-key'];
    const openAIKey = headers['x-openai-key'] || (headers['x-byok-provider'] === 'openai' ? headers['x-byok-api-key'] : null);
    const anthropicKey = headers['x-anthropic-key'] || (headers['x-byok-provider'] === 'anthropic' ? headers['x-byok-api-key'] : null);

    // Prioritize OpenAI client if provided
    if (openAIKey) {
        return {
            type: 'openai',
            instance: new OpenAI({ apiKey: openAIKey }),
            embeddingsModel: 'text-embedding-3-small',
            chatModel: 'gpt-4o-mini'
        };
    } 
    
    // Prioritize Gemini client if provided
    if (geminiKey) {
        return {
            type: 'gemini',
            instance: new GoogleGenAI({ apiKey: geminiKey }),
            embeddingsModel: 'text-embedding-004', 
            chatModel: 'gemini-2.5-flash' 
        };
    } 
    
    // Prioritize Anthropic client if provided
    if (anthropicKey) {
        return {
            type: 'anthropic',
            instance: anthropicKey,
            chatModel: 'claude-3-5-haiku-latest',
            needsExternalEmbeddings: true
        };
    }

    // Fallback to internal server keys if no user keys were sent
    const defaultGeminiKey = process.env.INTERNAL_FREE_GEMINI_KEY || process.env.GEMINI_API_KEY || '';
    if (defaultGeminiKey && defaultGeminiKey.trim().length > 20) {
        return {
            type: 'gemini',
            instance: new GoogleGenAI({ apiKey: defaultGeminiKey.trim() }),
            embeddingsModel: 'text-embedding-004',
            chatModel: 'gemini-2.5-flash'
        };
    }

    throw new Error("No active API Key found. Please add a provider key in your Smartboard settings.");
}
