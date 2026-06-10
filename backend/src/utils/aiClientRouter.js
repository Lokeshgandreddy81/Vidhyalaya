/**
 * Centralized Multi-Provider AI Client Router
 * Direct HTTP calls to OpenAI, Anthropic, Gemini, Groq, and OpenRouter REST endpoints.
 * Resolves Lock/Unlock mode (BYOK) and injects personalization parameters from headers.
 */
import { GoogleGenAI } from '@google/genai';

const PROVIDER_DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-latest',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'google/gemini-2.5-flash',
};

const PROVIDER_DEFAULT_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

/**
 * Call the targeted AI engine based on request BYOK headers and personalization preferences.
 */
export async function callAIEngine({
  req,
  prompt,
  systemInstruction = '',
  temperature = null,
  responseMimeType = null,
  maxOutputTokens = 2000,
  timeoutMs = 90_000,
}) {
  if (!prompt) {
    throw new Error('Prompt is required for callAIEngine.');
  }

  // 1. Resolve BYOK routing parameters
  const headers = req?.headers || {};
  const byokMode = headers['x-byok-mode'] || 'auto';
  
  let provider = 'gemini';
  let apiKey = '';
  let customModel = '';
  let customEndpoint = '';

  if (byokMode === 'custom') {
    provider = headers['x-byok-provider'] || 'gemini';
    apiKey = headers['x-byok-api-key'] || '';
    customModel = headers['x-byok-model'] || '';
    customEndpoint = headers['x-byok-endpoint'] || '';
  }

  // Fallback to Gemini if custom provider requested but no API key sent
  if (provider !== 'gemini' && !apiKey) {
    console.warn(`[aiClientRouter] Custom provider "${provider}" selected but no API key provided. Falling back to server-side Gemini.`);
    provider = 'gemini';
    customModel = 'gemini-2.5-flash';
  }

  // Default to server keys for Gemini if not provided or in auto mode
  let geminiKeys = [];
  if (provider === 'gemini') {
    const userKey = apiKey?.trim();
    const serverKey = process.env.GEMINI_API_KEY?.trim() || '';
    if (byokMode === 'custom' && userKey) {
      geminiKeys.push(userKey);
      if (serverKey && serverKey !== userKey) {
        geminiKeys.push(serverKey);
      }
    } else if (serverKey) {
      geminiKeys.push(serverKey);
    }
    
    if (geminiKeys.length === 0) {
      throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env or link a key in Settings.');
    }
  } else if (!apiKey) {
    throw new Error(`API key for provider "${provider}" is not configured. Please supply it in Settings.`);
  }

  // 2. Resolve Personalization Parameters
  const pace = headers['x-persona-pace'] || 'Balanced';
  const personaMode = headers['x-persona-mode'] || 'Coach';
  const analogy = headers['x-persona-analogy'] || 'Tech';
  const headerTemp = headers['x-persona-temp'] ? parseFloat(headers['x-persona-temp']) : 0.3;

  const actualTemperature = typeof temperature === 'number' ? temperature : headerTemp;
  const activeModelHeader = typeof headers['x-byok-active-model'] === 'string' ? headers['x-byok-active-model'].trim() : '';
  const actualModel = customModel || activeModelHeader || PROVIDER_DEFAULT_MODELS[provider] || 'gemini-2.5-flash';

  // 3. Inject Personalization Schema into System Instruction
  const personalizationBlock = `[STUDENT PERSONALIZATION DIRECTIVE]:
- Pedagogical Persona: Act strictly as a "${personaMode}". Your tone, explanation depth, and dialogue style must fit this role perfectly.
- Cognitive Pace: Speed of concept presentation should match a "${pace}" speed.
- Relatable Analogy Domain: Whenever explaining complex details or using metaphors, strictly pull comparisons from the "${analogy}" domain.`;

  const finalSystemInstruction = systemInstruction
    ? `${personalizationBlock}\n\n${systemInstruction}`
    : personalizationBlock;

  console.log(`[aiClientRouter] Routing request to ${provider.toUpperCase()} (Model: ${actualModel}, Mode: ${byokMode})`);

  // 4. Dispatch REST call per provider
  switch (provider) {
    case 'gemini':
      return await callGeminiREST({
        keys: geminiKeys,
        model: actualModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
      });

    case 'openai':
      return await callOpenAICompatibleREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.openai,
        apiKey,
        model: actualModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
      });

    case 'groq':
      return await callOpenAICompatibleREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.groq,
        apiKey,
        model: actualModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
      });

    case 'openrouter':
      return await callOpenAICompatibleREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.openrouter,
        apiKey,
        model: actualModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
        isOpenRouter: true,
      });

    case 'anthropic':
      return await callAnthropicREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.anthropic,
        apiKey,
        model: actualModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        maxOutputTokens,
        timeoutMs,
      });

    default:
      throw new Error(`Unsupported AI provider: "${provider}"`);
  }
}

/**
 * Native REST call to Google Gemini generateContent endpoint
 */
async function callGeminiREST({
  keys,
  model,
  prompt,
  systemInstruction,
  temperature,
  responseMimeType,
  maxOutputTokens,
  timeoutMs,
}) {
  const targetModel = model.startsWith('models/') ? model : `models/${model}`;
  
  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (responseMimeType) {
      requestBody.generationConfig.responseMimeType = responseMimeType;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err = new Error(`Gemini API Error (${res.status}): ${errText.substring(0, 300)}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API returned an empty response or invalid format.');
      }

      return text;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const message = String(err?.message || '').toLowerCase();
      const canRetry =
        i < keys.length - 1 &&
        (status === 400 ||
          status === 403 ||
          status === 429 ||
          status === 503 ||
          message.includes('api key') ||
          message.includes('quota') ||
          message.includes('invalid'));
      if (canRetry) {
        console.warn(`[aiClientRouter] Gemini API failed with status ${status || 'unknown'}. Retrying with fallback key...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All Gemini attempts failed.');
}


/**
 * Native REST call to OpenAI-compatible Chat Completions endpoints
 */
async function callOpenAICompatibleREST({
  endpoint,
  apiKey,
  model,
  prompt,
  systemInstruction,
  temperature,
  responseMimeType,
  maxOutputTokens,
  timeoutMs,
  isOpenRouter = false,
}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://vidyal.ai';
    headers['X-Title'] = 'Vidhyalaya';
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  };

  if (responseMimeType === 'application/json') {
    requestBody.response_format = { type: 'json_object' };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw Object.assign(new Error(`Completions API Error (${res.status}): ${errText.substring(0, 300)}`), { status: res.status });
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Completions API returned an empty response or invalid format.');
  }

  return text;
}

/**
 * Native REST call to Anthropic Messages endpoint
 */
async function callAnthropicREST({
  endpoint,
  apiKey,
  model,
  prompt,
  systemInstruction,
  temperature,
  maxOutputTokens,
  timeoutMs,
}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  const requestBody = {
    model,
    max_tokens: maxOutputTokens,
    messages: [{ role: 'user', content: prompt }],
    temperature,
  };

  if (systemInstruction) {
    requestBody.system = systemInstruction;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw Object.assign(new Error(`Anthropic API Error (${res.status}): ${errText.substring(0, 300)}`), { status: res.status });
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error('Anthropic API returned an empty response or invalid format.');
  }

  return text;
}

/**
 * Stream the AI engine response chunk-by-chunk for Gemini
 */
export async function callAIEngineStream({
  req,
  prompt,
  systemInstruction = '',
  temperature = null,
  maxOutputTokens = 2000,
  onChunk,
}) {
  if (!prompt) {
    throw new Error('Prompt is required for callAIEngineStream.');
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  // Resolve Personalization Parameters from headers
  const headers = req?.headers || {};
  const pace = headers['x-persona-pace'] || 'Balanced';
  const personaMode = headers['x-persona-mode'] || 'Coach';
  const analogy = headers['x-persona-analogy'] || 'Tech';
  const headerTemp = headers['x-persona-temp'] ? parseFloat(headers['x-persona-temp']) : 0.3;

  const actualTemperature = typeof temperature === 'number' ? temperature : headerTemp;
  const model = 'gemini-2.5-flash';

  const personalizationBlock = `[STUDENT PERSONALIZATION DIRECTIVE]:
- Pedagogical Persona: Act strictly as a "${personaMode}". Your tone, explanation depth, and dialogue style must fit this role perfectly.
- Cognitive Pace: Speed of concept presentation should match a "${pace}" speed.
- Relatable Analogy Domain: Whenever explaining complex details or using metaphors, strictly pull comparisons from the "${analogy}" domain.`;

  const finalSystemInstruction = systemInstruction
    ? `${personalizationBlock}\n\n${systemInstruction}`
    : personalizationBlock;

  const ai = new GoogleGenAI({ apiKey });

  const responseStream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: {
      systemInstruction: finalSystemInstruction,
      temperature: actualTemperature,
      maxOutputTokens,
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}
