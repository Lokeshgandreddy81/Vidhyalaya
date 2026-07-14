/**
 * Generates vector embeddings for a list of texts using the resolved AI provider client.
 */
export async function generateEmbeddings(texts, provider) {
    if (!texts || texts.length === 0) return [];
    
    if (provider.type === 'openai') {
        const response = await provider.instance.embeddings.create({
            model: provider.embeddingsModel,
            input: texts,
        });
        return response.data.map(item => item.embedding);
    } 
    
    if (provider.type === 'gemini') {
        // Utilize GoogleGenAI SDK's native batch embedding format
        const response = await provider.instance.models.embedContent({
            model: provider.embeddingsModel,
            contents: texts,
        });
        if (Array.isArray(response.embeddings)) {
            return response.embeddings.map(emb => emb.values || []);
        } else if (response.embedding) {
            return [response.embedding.values || []];
        }
        return [];
    }

    if (provider.type === 'anthropic') {
        throw new Error("Anthropic does not natively host text embeddings. Please provide an OpenAI or Gemini key for Lesson Sync.");
    }

    return [];
}
