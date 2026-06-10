import { LearningPath, LLMConfig, UserProfile, SandboxRunResult } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const DEFAULT_API_BASE_URL = configuredApiUrl || 'http://localhost:5001/api';
const LOCAL_API_FALLBACK_BASE_URL = 'http://localhost:5000/api';

// Use Vite's environment variable or fallback to the local backend.
export const SERVER_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/api$/, '');

const API_BASE_URL = DEFAULT_API_BASE_URL;
const DEFAULT_USER_ID = 'default-user';
export const getActiveUserId = (): string => localStorage.getItem('vidyal_user_id') || DEFAULT_USER_ID;

const getBYOKHeaders = (headers: HeadersInit = {}): Headers => {
  const next = new Headers(headers);
  
  // 1. Inject BYOK Mode (Lock/Unlock)
  const mode = localStorage.getItem('vidyal_byok_mode') || 'auto';
  next.set('x-byok-mode', mode);

  // 2. Inject custom API config if Unlocked (custom)
  try {
    const rawByok = localStorage.getItem('vidyal_byok_config');
    if (rawByok) {
      const parsed = JSON.parse(rawByok) as Partial<LLMConfig>;
      if (parsed.apiKey?.trim()) {
        next.set('x-byok-provider', parsed.provider || 'gemini');
        next.set('x-byok-api-key', parsed.apiKey.trim());
        if (parsed.preferredModel?.trim()) {
          next.set('x-byok-model', parsed.preferredModel.trim());
        }
        if (parsed.customEndpoint?.trim()) {
          next.set('x-byok-endpoint', parsed.customEndpoint.trim());
        }
        
        // Backward compatibility: set legacy headers in case some route checks them
        if (parsed.provider === 'gemini') {
          next.set('x-user-gemini-key', parsed.apiKey.trim());
          next.set('x-user-gemini-byok', '1');
        }
      }
    }
  } catch {
    // Ignore malformed BYOK config
  }

  // 3. Inject User Persona Preferences (Personalization)
  try {
    const rawPref = localStorage.getItem('vidyal_user_preferences');
    if (rawPref) {
      const pref = JSON.parse(rawPref);
      if (pref.cognitivePace) next.set('x-persona-pace', pref.cognitivePace);
      if (pref.pedagogicalMode) next.set('x-persona-mode', pref.pedagogicalMode);
      if (pref.analogyDomain) next.set('x-persona-analogy', pref.analogyDomain);
      if (typeof pref.temperature === 'number') next.set('x-persona-temp', String(pref.temperature));
    }
  } catch {
    // Ignore
  }

  // 4. Inject the resolved active model name so SARA can give smart model-switch guidance
  try {
    const mode = localStorage.getItem('vidyal_byok_mode') || 'auto';
    const rawByok = localStorage.getItem('vidyal_byok_config');
    let activeModel = 'gemini-1.5-flash'; // system default in AUTO mode

    if (mode === 'auto') {
      const rawPref = localStorage.getItem('vidyal_user_preferences');
      if (rawPref) {
        const pref = JSON.parse(rawPref);
        if (pref.aiModel) activeModel = pref.aiModel;
      }
    } else if (mode === 'custom' && rawByok) {
      const parsed = JSON.parse(rawByok) as { provider?: string; preferredModel?: string };
      if (parsed.preferredModel?.trim()) {
        activeModel = parsed.preferredModel.trim();
      } else {
        const providerDefaults: Record<string, string> = {
          gemini: 'gemini-2.5-flash',
          openai: 'gpt-4o-mini',
          anthropic: 'claude-3-5-sonnet-latest',
          groq: 'llama-3.3-70b-versatile',
          openrouter: 'google/gemini-2.5-flash',
        };
        activeModel = providerDefaults[parsed.provider || 'gemini'] || 'gemini-2.5-flash';
      }
    }
    next.set('x-byok-active-model', activeModel);
  } catch {
    // Ignore
  }

  return next;
};


export type TokenScope = 'user' | 'student' | 'admin';

const currentTokens: Record<TokenScope, string | null> = {
  user: null,
  student: null,
  admin: null,
};

const isRefreshingMap: Record<TokenScope, boolean> = {
  user: false,
  student: false,
  admin: false,
};

const refreshSubscribersMap: Record<TokenScope, ((token: string) => void)[]> = {
  user: [],
  student: [],
  admin: [],
};

async function attemptTokenRefresh(scope: TokenScope = 'user'): Promise<string> {
  if (isRefreshingMap[scope]) {
    return new Promise((resolve) => {
      refreshSubscribersMap[scope].push((token) => resolve(token));
    });
  }

  isRefreshingMap[scope] = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh?scope=${scope}`, {
      method: 'POST',
      credentials: 'include', // Crucial: send the HttpOnly refresh token cookie
    });

    if (!response.ok) {
      throw new Error(`Session expired for scope ${scope}. Please log in again.`);
    }

    const data = await response.json();
    const newToken = data.token;

    // Update the correct storage key based on scope
    if (scope === 'student') {
      localStorage.setItem('vidyal_student_token', newToken);
    } else if (scope === 'admin') {
      localStorage.setItem('vidyal_admin_token', newToken);
    } else {
      localStorage.setItem('vidyal_user_token', newToken);
    }

    currentTokens[scope] = newToken;
    
    // Call subscribers
    refreshSubscribersMap[scope].forEach((cb) => cb(newToken));
    refreshSubscribersMap[scope] = [];
    
    isRefreshingMap[scope] = false;
    return newToken;
  } catch (err) {
    isRefreshingMap[scope] = false;
    
    // Clear the specific token on refresh failure
    if (scope === 'student') {
      localStorage.removeItem('vidyal_student_token');
    } else if (scope === 'admin') {
      localStorage.removeItem('vidyal_admin_token');
    } else {
      localStorage.removeItem('vidyal_user_token');
    }
    
    currentTokens[scope] = null;
    throw err;
  }
}

const getApiFallbackUrl = (url: string): string | null => {
  if (configuredApiUrl) return null;
  if (!url.startsWith(DEFAULT_API_BASE_URL)) return null;
  return url.replace(DEFAULT_API_BASE_URL, LOCAL_API_FALLBACK_BASE_URL);
};

async function fetchWithApiFallback(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    const fallbackUrl = getApiFallbackUrl(url);
    if (!fallbackUrl) throw error;
    console.warn(`[API] Primary local backend unavailable. Retrying via ${LOCAL_API_FALLBACK_BASE_URL}.`);
    return fetch(fallbackUrl, options);
  }
}

async function getToken(scope: TokenScope = 'user', userId: string = getActiveUserId()): Promise<string> {
  if (scope === 'student') {
    const studentToken = localStorage.getItem('vidyal_student_token');
    if (studentToken) return studentToken;
  } else if (scope === 'admin') {
    const adminToken = localStorage.getItem('vidyal_admin_token');
    if (adminToken) return adminToken;
  } else {
    const authenticatedToken = localStorage.getItem('vidyal_user_token');
    if (authenticatedToken) return authenticatedToken;
  }

  if (currentTokens[scope]) return currentTokens[scope]!;

  const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token for scope ${scope}`);
  }

  const data = await response.json();
  currentTokens[scope] = data.token;
  return currentTokens[scope]!;
}

async function fetchWithAuth(url: string, options: RequestInit = {}, scope: TokenScope = 'user'): Promise<Response> {
  const token = await getToken(scope);
  const headers = getBYOKHeaders(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  let response = await fetchWithApiFallback(url, { ...options, headers });
  
  if (response.status === 401) {
    console.warn(`[API] Access token for scope ${scope} expired (401). Attempting token refresh...`);
    try {
      const newToken = await attemptTokenRefresh(scope);
      // Clone headers and update authorization token for retry
      const retryHeaders = getBYOKHeaders(options.headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      response = await fetchWithApiFallback(url, { ...options, headers: retryHeaders });
      console.log(`[API] Token refresh for scope ${scope} succeeded, retried request successfully.`);
    } catch (refreshErr) {
      console.error(`[API] Token refresh for scope ${scope} failed, user session expired:`, refreshErr);
      throw refreshErr;
    }
  }
  
  return response;
}

async function readSseStream(
  response: Response,
  onChunk?: (text: string) => void
): Promise<{ text: string; citations?: any[]; error?: string }> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let citations: any[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            return { text: '', error: parsed.error };
          }
          if (parsed.text) {
            text += parsed.text;
            if (onChunk) onChunk(parsed.text);
          }
          if (parsed.done) {
            if (parsed.content) text = parsed.content;
            if (parsed.response) text = parsed.response;
            if (parsed.citations) citations = parsed.citations;
          }
        } catch (err) {
          console.warn('[API Stream] Error parsing SSE packet:', err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { text, citations };
}

export const api = {
  // Google Single Sign-On API
  async googleLogin(idToken: string): Promise<{ token: string; userId: string; isFirstLogin: boolean; profile: UserProfile }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Google authentication failed');
    }
    return response.json();
  },

  // Sandbox OTP access request
  async sandboxRequest(): Promise<{ requiresVerification: boolean; email: string; devCode: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/sandbox-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data.requiresVerification) {
      throw new Error(data.error || 'Failed to initialize sandbox session.');
    }
    return data;
  },

  // Email/Password Sign Up
  async signup(name: string, email: string, password: string): Promise<{ token?: string; userId?: string; isFirstLogin?: boolean; profile?: UserProfile; requiresVerification?: boolean; email?: string; devCode?: string; devUrl?: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.requiresVerification) {
        return { requiresVerification: true, email: data.email, devCode: data.devCode, devUrl: data.devUrl };
      }
      throw new Error(data.error || 'Signup failed. Please try again.');
    }
    return data;
  },

  // Email/Password Sign In
  async emailLogin(email: string, password: string): Promise<{ token?: string; userId?: string; isFirstLogin?: boolean; profile?: UserProfile; requiresVerification?: boolean; email?: string; devCode?: string; devUrl?: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.requiresVerification) {
        return { requiresVerification: true, email: data.email, devCode: data.devCode, devUrl: data.devUrl };
      }
      throw new Error(data.error || 'Sign in failed. Please check your credentials.');
    }
    return data;
  },

  // Email Verification
  async verifyEmail(email: string, code?: string, token?: string): Promise<{ token: string; userId: string; isFirstLogin: boolean; profile: UserProfile }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, token }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Email verification failed.');
    }
    return data;
  },

  // Resend Email Verification Code
  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string; devCode?: string; devUrl?: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend verification code.');
    }
    return data;
  },

  // Sign Out / Logout
  async logout(): Promise<{ success: boolean }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign out from server.');
    }
    return data;
  },

  // Request password reset email
  async forgotPassword(email: string): Promise<{ success: boolean; message: string; devResetUrl?: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send reset email. Please try again.');
    }
    return data;
  },

  // Submit new password using reset token
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password. Please try again.');
    }
    return data;
  },

  // Complete onboarding after first login
  async completeOnboarding(data: { name?: string; scholasticRole?: string; cognitivePace?: string; analogyDomain?: string }): Promise<{ success: boolean; profile: UserProfile }> {
    const token = localStorage.getItem('vidyal_user_token');
    const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/complete-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete onboarding.');
    }
    return response.json();
  },

  // Users API
  async getUserProfile(userId = getActiveUserId()): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  async getUserState(): Promise<any> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/state/get`);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn('[API] getUserState failed:', error);
      return null;
    }
  },

  async saveUserState(state: any): Promise<any> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/state/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error('Failed to update user state');
      return response.json();
    } catch (error) {
      console.warn('[API] saveUserState failed:', error);
      throw error;
    }
  },

  async updateUserProfile(data: Partial<UserProfile>, userId = getActiveUserId()): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
    return response.json();
  },

  async getUserPaths(userId = getActiveUserId()): Promise<LearningPath[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user paths');
    return response.json();
  },

  async getPath(pathId: string): Promise<LearningPath> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/${pathId}`);
    if (!response.ok) throw new Error('Failed to fetch path details');
    return response.json();
  },

  async createPath(path: LearningPath, userId = getActiveUserId()): Promise<LearningPath> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...path, userId }),
    });
    if (!response.ok) throw new Error('Failed to create path');
    return response.json();
  },

  async updatePath(pathId: string, data: Partial<LearningPath>): Promise<LearningPath> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/${pathId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = new Error('Failed to update path') as any;
      err.status = response.status;
      throw err;
    }
    return response.json();
  },

  async deletePath(pathId: string): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/${pathId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete path');
  },

  async verifyVideos(ids: string[]): Promise<{
    id: string;
    title: string;
    channel?: string;
    embeddable: boolean;
    durationFormatted?: string;
    viewCount?: number;
  }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return [];
      const data = await response.json() as {
        videos: {
          id: string;
          title: string;
          channel?: string;
          embeddable: boolean;
          durationFormatted?: string;
          viewCount?: number;
        }[];
      };
      return data.videos ?? [];
    } catch {
      return [];
    }
  },

  async getChapters(videoId: string): Promise<{ title: string; startSecs: number; endSecs: number }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/chapters/${videoId}`, {
        headers: getBYOKHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.chapters ?? [];
    } catch {
      return [];
    }
  },

  async getTranscript(
    videoId: string,
    title = '',
    context = '',
  ): Promise<{ start: number; duration: number; text: string }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/transcript/${videoId}`, {
        method: 'POST',
        headers: getBYOKHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title, context }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.transcript ?? [];
    } catch {
      return [];
    }
  },

  async matchChapters(sections: string[], videoIds: string[]): Promise<{ section: string; clips: any[] }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/match-chapters`, {
        method: 'POST',
        headers: getBYOKHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sections, videoIds }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.sectionClips ?? [];
    } catch {
      return [];
    }
  },

  // Smart Study API
  async uploadSmartDocument(file: File, userId = getActiveUserId()): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await fetchWithAuth(`${API_BASE_URL}/smart-study/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload document');
    }

    const data = await response.json();
    return data.documentId;
  },

  async chatWithSmartDocument(
    documentId: string,
    message: string,
    history: any[],
    onChunk?: (text: string) => void
  ): Promise<string> {
    const response = await fetchWithAuth(`${API_BASE_URL}/smart-study/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, message, history, stream: !!onChunk }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to chat with document');
    }

    if (onChunk) {
      const result = await readSseStream(response, onChunk);
      if (result.error) throw new Error(result.error);
      return result.text;
    }

    const data = await response.json();
    return data.response;
  },

  async deleteSmartDocument(documentId: string): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE_URL}/smart-study/document/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete document');
    }
  },
  async curateVideo(params: {
    moduleTitle?: string;
    keyConcepts?: string[];
    goalContext?: string;
    contextText?: string;
  } | string): Promise<{
    videoId?: string;
    title?: string;
    videos?: Array<{ videoId: string; title: string; channel: string; label: string; matchScore: number }>;
    triggerSignal?: boolean;
    error?: string;
  } | null> {
    const body = typeof params === 'string'
      ? { contextText: params, moduleTitle: params.substring(0, 80) }
      : params;
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/smartboard/curate`, {
        method: 'POST',
        headers: getBYOKHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  },

  async searchSmartboardVideos(
    query: string,
    context?: string,
    minRelevanceScore = 0,
    goalContext?: string,
  ): Promise<Array<{
    id: string;
    title: string;
    channel: string;
    durationFormatted: string;
    viewCount: number;
    embeddable: boolean;
    source?: 'youtube_api' | 'gemini_search' | 'curated_fallback';
  }>> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/smartboard/search`, {
        method: 'POST',
        headers: getBYOKHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, context, minRelevanceScore, goalContext }),
      });
      if (!response.ok) return [];
      const data = await response.json() as { videos?: Array<{
        id: string;
        title: string;
        channel: string;
        durationFormatted: string;
        viewCount: number;
        embeddable: boolean;
        source?: 'youtube_api' | 'gemini_search' | 'curated_fallback';
      }> };
      return data.videos ?? [];
    } catch {
      return [];
    }
  },

  async generateLearningPlan(params: {
    goal: string;
    skillLevel?: string;
    dailyCommitment?: number;
    expectedOutcome?: string;
    mode?: 'preview' | 'full';
    resources?: string;
    studyLens?: string;
    scholarPersona?: string;
    cognitiveDensity?: string;
  }): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/study/generate-learning-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Plan generation failed (${response.status})`);
      }
      const data = await response.json() as { plan?: Record<string, unknown> };
      return data.plan ?? null;
    } catch (error) {
      console.warn('[API] generateLearningPlan failed:', error);
      return null;
    }
  },

  async generateModuleContent(
    params: {
      moduleTitle: string;
      concepts?: string[];
      goal?: string;
      moduleResources?: Array<{ title?: string; content?: string; type?: string; url?: string }>;
      studyLens?: string;
      scholarPersona?: string;
      cognitiveDensity?: string;
    },
    onChunk?: (text: string) => void
  ): Promise<{ content: string; citations: import('../types').ContentCitation[]; error?: string } | null> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/study/generate-module-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, stream: !!onChunk }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        const message = err.error || `Module content failed (${response.status})`;
        console.warn('[API] generateModuleContent failed:', message);
        return { content: '', citations: [], error: message };
      }

      if (onChunk) {
        const result = await readSseStream(response, onChunk);
        if (result.error) {
          return { content: '', citations: [], error: result.error };
        }
        return { content: result.text, citations: result.citations || [] };
      }

      const data = await response.json() as {
        content?: string;
        citations?: import('../types').ContentCitation[];
      };
      if (!data.content) return { content: '', citations: [], error: 'Empty module content from server' };
      return { content: data.content, citations: data.citations || [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Module content request failed';
      console.warn('[API] generateModuleContent failed:', message);
      return { content: '', citations: [], error: message };
    }
  },

  async generateKnowledgeGraph(params: {
    moduleTitle: string;
    concepts?: string[];
    content?: string;
    sourceModuleId?: string;
    studyLens?: string;
    scholarPersona?: string;
    cognitiveDensity?: string;
    goalContext?: string;
  }): Promise<import('../types').KnowledgeGraph | null> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/study/generate-knowledge-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Knowledge graph failed (${response.status})`);
      }
      const data = await response.json() as { graph?: import('../types').KnowledgeGraph };
      return data.graph ?? null;
    } catch (error) {
      console.warn('[API] generateKnowledgeGraph failed:', error);
      return null;
    }
  },

  async tutorChat(params: {
    history?: Array<{ role: string; content: string }>;
    newMessage: string;
    context?: string;
    currentContent?: string;
  }): Promise<string | null> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/study/tutor-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Tutor chat failed (${response.status})`);
      }
      const data = await response.json() as { response?: string };
      return data.response ?? null;
    } catch (error) {
      console.warn('[API] tutorChat failed:', error);
      return null;
    }
  },

  async aiProxy(params: { kind: string; params: any }): Promise<any> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/study/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `AI Proxy failed (${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.warn('[API] aiProxy failed:', error);
      throw error;
    }
  },

  // Study API (Phase 2)
  async generateFlashcards(highlightedText: string, documentId: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/study/generate-flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highlightedText, documentId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate flashcards');
    }
    return response.json();
  },

  async generateQuiz(highlightedText: string, documentId: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/study/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highlightedText, documentId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate quiz');
    }
    return response.json();
  },

  async gradeFlashcardAnswer(flashcardQuestion: string, correctAnswer: string, userInputAnswer: string, documentId: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/study/grade-flashcard-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardQuestion, correctAnswer, userInputAnswer, documentId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to grade flashcard');
    }
    return response.json();
  },

  // Document Registry API (Step 1)
  async fetchDocuments(scope?: TokenScope) {
    const resolvedScope = scope || (localStorage.getItem('vidyal_admin_token') ? 'admin' : localStorage.getItem('vidyal_student_token') ? 'student' : 'user');
    const response = await fetchWithAuth(`${API_BASE_URL}/documents`, {
      method: 'GET',
    }, resolvedScope);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch documents');
    }
    return response.json();
  },

  async uploadRAGDocument(file: File, meta: {
    title: string;
    domain: string;
    branch: string;
    semester: string;
    subjectName: string;
    subjectCode?: string;
    chapterNumber?: number;
    chapterTitle?: string;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', meta.title);
    formData.append('domain', meta.domain);
    formData.append('branch', meta.branch);
    formData.append('semester', meta.semester);
    formData.append('subjectName', meta.subjectName);
    formData.append('subjectCode', meta.subjectCode || '');
    formData.append('chapterNumber', String(meta.chapterNumber || 1));
    formData.append('chapterTitle', meta.chapterTitle || '');

    const token = localStorage.getItem('vidyal_admin_token');
    const rawByok = localStorage.getItem('vidyal_byok_config');
    let byokConfig = null;
    try { if (rawByok) byokConfig = JSON.parse(rawByok); } catch (e) {}
    const legacyGeminiKey = localStorage.getItem('vidyal_custom_gemini_api_key');

    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    if (byokConfig) {
      headers['x-embedding-provider'] = byokConfig.provider;
      headers['x-embedding-api-key'] = byokConfig.apiKey;
    } else if (legacyGeminiKey) {
      headers['x-embedding-provider'] = 'gemini';
      headers['x-embedding-api-key'] = legacyGeminiKey;
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to ingest document');
    }

    return response.json();
  },

  async deleteRAGDocument(documentId: string) {
    const token = localStorage.getItem('vidyal_admin_token');
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to delete document');
    }

    return response.json();
  },

  // Admin API (B2B Pivot)
  async adminLogin(universityId: string, passcode: string) {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityId, passcode }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Invalid credentials');
    }
    return response.json();
  },

  async getAdminMe(token: string) {
    const response = await fetch(`${API_BASE_URL}/admin/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Unauthorized');
    }
    return response.json();
  },

  async updateAdminKey(token: string, geminiApiKey: string) {
    const response = await fetch(`${API_BASE_URL}/admin/update-key`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ geminiApiKey }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to update key');
    }
    return response.json();
  },

  // Student API
  async studentRegister(data: {
    rollNumber: string;
    universityId: string;
    name: string;
    branch: string;
    semester: string;
    passcode: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/students/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Registration failed');
    }
    return response.json();
  },

  async studentLogin(rollNumber: string, universityId: string, passcode: string) {
    const response = await fetch(`${API_BASE_URL}/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNumber, universityId, passcode }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Login failed');
    }
    return response.json();
  },

  async getStudentMe(token: string) {
    const response = await fetch(`${API_BASE_URL}/students/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Unauthorized');
    return response.json();
  },

  async fetchDocumentsByStudent(universityId: string, branch: string, semester: string) {
    const params = new URLSearchParams({ universityId, branch, semester });
    const response = await fetchWithAuth(`${API_BASE_URL}/documents?${params}`, {}, 'student');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to fetch documents');
    }
    return response.json();
  },

  async runCompiledCode(
    language: 'c' | 'cpp' | 'java' | 'python',
    code: string,
    testCode?: string,
  ): Promise<SandboxRunResult> {
    const resolvedScope = localStorage.getItem('vidyal_student_token') ? 'student' : 'user';
    const response = await fetchWithAuth(`${API_BASE_URL}/study/run-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, testCode }),
    }, resolvedScope);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Compiler service failed (${response.status})`);
    }
    return response.json();
  },
};
