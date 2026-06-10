const CONTENT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
];

export async function callGeminiText({
  apiKey,
  prompt,
  maxOutputTokens = 6500,
  temperature = 0.3,
  responseMimeType,
  timeoutMs = 90_000,
}) {
  let lastError;
  for (const model of CONTENT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const generationConfig = { temperature, maxOutputTokens };
      if (responseMimeType) generationConfig.responseMimeType = responseMimeType;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err = new Error(`Gemini ${model} → ${res.status}: ${errText.substring(0, 200)}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text.trim()) throw new Error(`Gemini ${model} returned empty text`);
      console.log(`[Gemini] Success via ${model}`);
      return text;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      if (status === 429 || status === 503) {
        console.warn(`[Gemini] ${model} quota/rate limited, trying next...`);
        continue;
      }
      if (String(err?.message || '').includes('404')) continue;
      console.warn(`[Gemini] ${model} failed:`, err.message);
    }
  }
  throw lastError || new Error('All Gemini models failed');
}
