/**
 * Centralized Multi-Provider AI Client Router
 * Direct HTTP calls to OpenAI, Anthropic, Gemini, Groq, and OpenRouter REST endpoints.
 * Resolves Lock/Unlock mode (BYOK) and injects personalization parameters from headers.
 */
import { GoogleGenAI } from '@google/genai';
import dns from 'dns';

const PROVIDER_DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',                // Real Production Flash
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-latest',
  groq: 'llama-3.3-70b-specdec',            // Fixed Groq Production Naming
  openrouter: 'google/gemini-2.5-flash',
};

const PROVIDER_DEFAULT_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

async function validateEndpointUrl(endpointUrl) {
  if (!endpointUrl) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch (err) {
    throw new Error('Invalid endpoint URL.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Endpoint URL must use HTTPS.');
  }

  const hostname = parsedUrl.hostname.replace(/\[|\]/g, '');

  const isInternal = (ip) => {
    return /^127\./.test(ip) ||
           /^10\./.test(ip) ||
           /^192\.168\./.test(ip) ||
           /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
           /^169\.254\./.test(ip) ||
           /^0\.0\.0\.0$/.test(ip) ||
           /^::1$/.test(ip) ||
           /^::$/.test(ip) ||
           /^[fF][cCdD]/.test(ip) ||
           /^[fF][eE][89aAbB]/.test(ip) ||
           /^::ffff:127\./i.test(ip) ||
           /^::ffff:0:0/i.test(ip) ||
           /^::ffff:0\.0\.0\.0/i.test(ip);
  };

  if (isInternal(hostname)) {
    throw new Error('Endpoint URL cannot resolve to an internal or reserved IP address.');
  }

  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isInternal(addr.address)) {
        throw new Error('Endpoint URL cannot resolve to an internal or reserved IP address.');
      }
    }
  } catch (err) {
    if (err.message === 'Endpoint URL cannot resolve to an internal or reserved IP address.') {
      throw err;
    }
    // Ignore valid lookup errors (ENOTFOUND, etc.), let fetch handle connection failures
  }
}

/**
 * Dynamic Model Scaler
 * Upgrade basic model requests to gemini-2.5-pro for complex engineering tasks.
 */
export async function determineOptimalModel(prompt, requestedModel) {
  const complexityIndicators = [
    'optimize', 'architecture', 'refactor', 'design a system', 'bug', 'memory leak',
    'explain why this step fails', 'why does it fail', 'compile error', 'runtime error',
    'segfault', 'nullpointer', 'performance bottleneck', 'fix this error'
  ];
  const lowerPrompt = prompt.toLowerCase();
  
  const basicFlashModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const isBasic = basicFlashModels.some(m => requestedModel.toLowerCase().includes(m));
  
  if (isBasic && complexityIndicators.some(term => lowerPrompt.includes(term))) {
    console.log(`[ModelScaler] Complex engineering request detected. Escalating model selection from ${requestedModel} to gemini-2.5-pro.`);
    return 'gemini-2.5-pro';
  }
  
  return requestedModel;
}

function buildPersonalizationBlock(personaMode, pace, analogy) {
  let personaDirective = '';
  if (personaMode === 'Socratic') {
    personaDirective = `- You must never give direct answers immediately. Guide the student using step-by-step questioning. Ask short, conceptual prompts to lead them to the answer.`;
  } else if (personaMode === 'Debugger') {
    personaDirective = `- Prioritize reading active workspace code. Explain compiler errors, offer line-by-line debugging walkthroughs, and point out logical code flaws.`;
  } else if (personaMode === 'Coach') {
    personaDirective = `- Provide motivational pacing, focus on practical applications, call out frustration signals, and break down complex concepts into small milestones.`;
  } else if (personaMode === 'PairProgrammer') {
    personaDirective = `- Walk through code design step-by-step. Provide minimal, clean starter files or inline challenges. Encourage active coding sandbox trials.`;
  } else if (personaMode === 'Teacher') {
    personaDirective = `- Provide structured progressive breakdowns, deep conceptual explanations, clear analogies, and visual models/diagrams.`;
  }

  let paceDirective = '';
  if (pace === 'Sprint') {
    paceDirective = `- Keep responses ultra-concise, fast-paced, and optimized for rapid retention. Avoid long intros/outros.`;
  } else if (pace === 'Spaced') {
    paceDirective = `- Present concepts slowly, verify understanding after each step, and offer spaced reviews of previous milestones.`;
  } else {
    paceDirective = `- Provide balanced, steady-paced coverage of topics with intermediate checkpoints.`;
  }

  return `[STUDENT PERSONALIZATION DIRECTIVE]:
- Pedagogical Persona Mode: Act strictly as a "${personaMode}".
  ${personaDirective}
- Cognitive Pacing: Present concepts at a "${pace}" pace.
  ${paceDirective}
- Relatable Analogy Domain: Pull comparisons, metaphors, and real-world examples strictly from the "${analogy}" domain.`;
}

/**
 * Call the targeted AI engine based on request BYOK headers and personalization preferences.
 */
export async function callAIEngine({
  req,
  prompt,
  systemInstruction = '',
  images = [],
  temperature = null,
  responseMimeType = null,
  maxOutputTokens = 8192,
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

  if (byokMode === 'custom' || headers['x-byok-api-key'] || headers['x-user-gemini-key']) {
    provider = headers['x-byok-provider'] || 'gemini';
    apiKey = headers['x-byok-api-key'] || headers['x-user-gemini-key'] || '';
    customModel = headers['x-byok-model'] || '';
    customEndpoint = headers['x-byok-endpoint'] || '';
  }

  if (customEndpoint) {
    await validateEndpointUrl(customEndpoint);
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
  const resolvedModel = await determineOptimalModel(prompt, actualModel);

  // 3. Inject Personalization Schema into System Instruction
  const personalizationBlock = buildPersonalizationBlock(personaMode, pace, analogy);

  const finalSystemInstruction = systemInstruction
    ? `${personalizationBlock}\n\n${systemInstruction}`
    : personalizationBlock;

  // Recency reinforcement to prevent prompt drift during long chats
  const reinforcementBlock = `\n\n[STUDENT PERSONALIZATION DIRECTIVE REMINDER]: Remember to communicate strictly as a "${personaMode}", using a "${pace}" pace. Draw all comparisons and analogies from the "${analogy}" domain.`;
  prompt = prompt + reinforcementBlock;

  console.log(`[aiClientRouter] Routing request to ${provider.toUpperCase()} (Model: ${resolvedModel}, Mode: ${byokMode})`);

  // 4. Dispatch REST call per provider
  switch (provider) {
    case 'gemini':
      return await callGeminiREST({
        keys: geminiKeys,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        images,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
      });

    case 'openai':
      return await callOpenAICompatibleREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.openai,
        apiKey,
        model: resolvedModel,
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
        model: resolvedModel,
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
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        responseMimeType,
        maxOutputTokens,
        timeoutMs,
        isOpenRouter: true,
      });

    case 'anthropic':
      let anthropicPrompt = prompt;
      if (responseMimeType === 'application/json') {
        if (!anthropicPrompt.includes('valid JSON')) {
          anthropicPrompt = `${anthropicPrompt}\n\nCRITICAL: Return strictly valid JSON. Do not wrap in markdown fences.`;
        }
      }
      return await callAnthropicREST({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.anthropic,
        apiKey,
        model: resolvedModel,
        prompt: anthropicPrompt,
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
  images = [],
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

    let contentsParts = [{ text: prompt }];
    if (images && images.length > 0) {
      for (const img of images) {
        contentsParts.push({
          inlineData: {
            data: typeof img === 'string' ? img : img.data,
            mimeType: typeof img === 'string' ? 'image/jpeg' : img.mimeType
          }
        });
      }
    }

    const requestBody = {
      contents: [{ role: 'user', parts: contentsParts }],
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
      
      if (status === 400 || message.includes('invalid_argument') || message.includes('400')) {
        throw new Error("SARA couldn't read that image—please ensure it's a clear, supported format (PNG/JPEG/WEBP) and under 5MB.");
      }

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

  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3') || model.includes('/o1') || model.includes('/o3');
  const messages = [];

  if (systemInstruction) {
    messages.push({ 
      role: isReasoningModel ? 'developer' : 'system', 
      content: systemInstruction 
    });
  }

  let finalPrompt = prompt;
  const isAnthropicModel = model.toLowerCase().includes('claude') || model.toLowerCase().includes('anthropic');

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  };

  if (responseMimeType === 'application/json') {
    if (isAnthropicModel) {
      if (!finalPrompt.includes('valid JSON')) {
        finalPrompt = `${finalPrompt}\n\nCRITICAL: Return strictly valid JSON. Do not wrap in markdown fences.`;
      }
    } else {
      requestBody.response_format = { type: 'json_object' };
    }
  }

  messages.push({ role: 'user', content: finalPrompt });

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
  images = [],
  temperature = null,
  maxOutputTokens = 8192,
  onChunk,
}) {
  if (!prompt) {
    throw new Error('Prompt is required for callAIEngineStream.');
  }

  // 1. Resolve BYOK routing parameters
  const headers = req?.headers || {};
  const byokMode = headers['x-byok-mode'] || 'auto';
  
  let provider = 'gemini';
  let apiKey = '';
  let customModel = '';
  let customEndpoint = '';

  if (byokMode === 'custom' || headers['x-byok-api-key'] || headers['x-user-gemini-key']) {
    provider = headers['x-byok-provider'] || 'gemini';
    apiKey = headers['x-byok-api-key'] || headers['x-user-gemini-key'] || '';
    customModel = headers['x-byok-model'] || '';
    customEndpoint = headers['x-byok-endpoint'] || '';
  }

  if (customEndpoint) {
    await validateEndpointUrl(customEndpoint);
  }

  // Fallback to Gemini if custom provider requested but no API key sent
  if (provider !== 'gemini' && !apiKey) {
    provider = 'gemini';
    customModel = 'gemini-2.5-flash';
  }

  // Default to server keys for Gemini if not provided or in auto mode
  let geminiKeys = [];
  if (provider === 'gemini') {
    const userKey = apiKey?.trim();
    const serverKey = process.env.GEMINI_API_KEY?.trim() || '';
    if ((byokMode === 'custom' || userKey) && userKey) {
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
  const resolvedModel = await determineOptimalModel(prompt, actualModel);

  // 3. Inject Personalization Schema into System Instruction
  const personalizationBlock = buildPersonalizationBlock(personaMode, pace, analogy);

  const finalSystemInstruction = systemInstruction
    ? `${personalizationBlock}\n\n${systemInstruction}`
    : personalizationBlock;

  // Recency reinforcement to prevent prompt drift during long chats
  const reinforcementBlock = `\n\n[STUDENT PERSONALIZATION DIRECTIVE REMINDER]: Remember to communicate strictly as a "${personaMode}", using a "${pace}" pace. Draw all comparisons and analogies from the "${analogy}" domain.`;
  prompt = prompt + reinforcementBlock;

  console.log(`[aiClientRouter] Routing streaming request to ${provider.toUpperCase()} (Model: ${resolvedModel}, Mode: ${byokMode})`);

  // 4. Dispatch Stream call per provider
  switch (provider) {
    case 'gemini':
      return await callGeminiStream({
        keys: geminiKeys,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        images,
        temperature: actualTemperature,
        maxOutputTokens,
        onChunk,
      });

    case 'openai':
      return await callOpenAICompatibleStream({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.openai,
        apiKey,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        maxOutputTokens,
        onChunk,
      });

    case 'groq':
      return await callOpenAICompatibleStream({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.groq,
        apiKey,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        maxOutputTokens,
        onChunk,
      });

    case 'openrouter':
      return await callOpenAICompatibleStream({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.openrouter,
        apiKey,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        maxOutputTokens,
        onChunk,
        isOpenRouter: true,
      });

    case 'anthropic':
      return await callAnthropicStream({
        endpoint: customEndpoint || PROVIDER_DEFAULT_ENDPOINTS.anthropic,
        apiKey,
        model: resolvedModel,
        prompt,
        systemInstruction: finalSystemInstruction,
        temperature: actualTemperature,
        maxOutputTokens,
        onChunk,
      });

    default:
      throw new Error(`Unsupported streaming AI provider: "${provider}"`);
  }
}

/**
 * Native streaming call helper to Google Gemini
 */
async function callGeminiStream({
  keys,
  model,
  prompt,
  systemInstruction,
  images = [],
  temperature,
  maxOutputTokens,
  onChunk,
}) {
  const targetModel = model.startsWith('models/') ? model : `models/${model}`;
  let lastError;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      const ai = new GoogleGenAI({ apiKey });

      let contentsParts = [{ text: prompt }];
      if (images && images.length > 0) {
        // Concisely override systemInstruction if images are present
        if (!systemInstruction || systemInstruction.trim() === '') {
            systemInstruction = "You are an expert visual analyst. Analyze the provided images spatially. Read text, interpret charts, describe layouts, and answer the user's query based strictly on the visual content.";
        }
        for (const img of images) {
          contentsParts.push({
            inlineData: {
              data: typeof img === 'string' ? img : img.data,
              mimeType: typeof img === 'string' ? 'image/jpeg' : img.mimeType
            }
          });
        }
      }

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents: contentsParts,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
      return;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const message = String(err?.message || '').toLowerCase();
      
      if (status === 400 || message.includes('invalid_argument') || message.includes('400')) {
        throw new Error("SARA couldn't read that image—please ensure it's a clear, supported format (PNG/JPEG/WEBP) and under 5MB.");
      }

      const canRetry =
        i < keys.length - 1 &&
        (status === 400 ||
          status === 403 ||
          status === 429 ||
          status === 503 ||
          message.includes('api key') ||
          message.includes('quota') ||
          message.includes('quota') ||
          message.includes('invalid'));
      if (canRetry) {
        console.warn(`[aiClientRouter] Gemini streaming failed with status ${status || 'unknown'}. Retrying with fallback key...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All Gemini streaming attempts failed.');
}

/**
 * Generic SSE stream helper for OpenAI-compatible completions endpoints
 */
async function callOpenAICompatibleStream({
  endpoint,
  apiKey,
  model,
  prompt,
  systemInstruction,
  temperature,
  maxOutputTokens,
  onChunk,
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

  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3') || model.includes('/o1') || model.includes('/o3');
  const messages = [];

  if (systemInstruction) {
    messages.push({ 
      role: isReasoningModel ? 'developer' : 'system', 
      content: systemInstruction 
    });
  }
  messages.push({ role: 'user', content: prompt });

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
    stream: true,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Completions Stream Error (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text = parsed.choices?.[0]?.delta?.content || '';
            if (text) onChunk(text);
          } catch {
            // Ignore partial/malformed JSON chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Native SSE stream helper for Anthropic messages endpoints
 */
async function callAnthropicStream({
  endpoint,
  apiKey,
  model,
  prompt,
  systemInstruction,
  temperature,
  maxOutputTokens,
  onChunk,
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
    stream: true,
  };

  if (systemInstruction) {
    requestBody.system = systemInstruction;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic Stream Error (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              onChunk(parsed.delta.text);
            }
          } catch {
            // Ignore partial/malformed JSON chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
