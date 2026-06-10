function isValidKey(key) {
  return typeof key === 'string' && key.trim().length > 20 && !key.includes('your_');
}

/**
 * Resolve Gemini API key for server-side AI routes.
 * Server env key wins unless the client explicitly sends BYOK (Settings).
 */
export function resolveGeminiApiKey(req) {
  const keys = resolveGeminiApiKeys(req);
  return keys[0] || '';
}

/**
 * Ordered keys to try — BYOK first when explicit, then server env as fallback.
 */
export function resolveGeminiApiKeys(req) {
  const envKey = process.env.GEMINI_API_KEY?.trim() || '';
  const validEnv = isValidKey(envKey) ? envKey : '';

  const byokHeader = req.headers['x-user-gemini-byok'];
  const isExplicitByok = byokHeader === '1' || byokHeader === 'true';

  const headerKey = req.headers['x-user-gemini-key'];
  const userKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  const trimmedUserKey = typeof userKey === 'string' ? userKey.trim() : '';
  const validUser = isValidKey(trimmedUserKey) ? trimmedUserKey : '';

  if (isExplicitByok && validUser) {
    if (validEnv && validEnv !== validUser) return [validUser, validEnv];
    return [validUser];
  }

  if (validEnv) return [validEnv];
  if (validUser) return [validUser];
  return [];
}

export async function withGeminiKeyFallback(req, operation) {
  const keys = resolveGeminiApiKeys(req);
  if (!keys.length) {
    throw Object.assign(
      new Error('Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env or link a key in Settings.'),
      { status: 503 },
    );
  }

  let lastError;
  for (let i = 0; i < keys.length; i += 1) {
    try {
      return await operation(keys[i]);
    } catch (error) {
      lastError = error;
      const message = String(error?.message ?? '').toLowerCase();
      const status = error?.status;
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
        console.warn('[Gemini] Primary key rejected, retrying with server env key...');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Gemini request failed');
}
