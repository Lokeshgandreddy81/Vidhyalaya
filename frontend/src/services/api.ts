import { LearningPath, UserProfile } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const DEFAULT_API_BASE_URL = configuredApiUrl || 'http://localhost:5001/api';
const LOCAL_API_FALLBACK_BASE_URL = 'http://localhost:5000/api';

// Use Vite's environment variable or fallback to the local backend.
export const SERVER_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/api$/, '');

const API_BASE_URL = DEFAULT_API_BASE_URL;
const DEFAULT_USER_ID = 'default-user';
export const getActiveUserId = (): string => localStorage.getItem('vidyal_user_id') || DEFAULT_USER_ID;

let currentToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function attemptTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Crucial: send the HttpOnly refresh token cookie
    });

    if (!response.ok) {
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    const newToken = data.token;

    // Update the correct storage key
    if (localStorage.getItem('vidyal_student_token')) {
      localStorage.setItem('vidyal_student_token', newToken);
    } else if (localStorage.getItem('vidyal_admin_token')) {
      localStorage.setItem('vidyal_admin_token', newToken);
    } else if (localStorage.getItem('vidyal_user_token')) {
      localStorage.setItem('vidyal_user_token', newToken);
    }

    currentToken = newToken;
    onRefreshed(newToken);
    isRefreshing = false;
    return newToken;
  } catch (err) {
    isRefreshing = false;
    // Clear tokens to force logout/redirect to auth page
    localStorage.removeItem('vidyal_student_token');
    localStorage.removeItem('vidyal_admin_token');
    localStorage.removeItem('vidyal_user_token');
    currentToken = null;
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

async function getToken(userId: string = getActiveUserId()): Promise<string> {
  const studentToken = localStorage.getItem('vidyal_student_token');
  if (studentToken) return studentToken;

  const adminToken = localStorage.getItem('vidyal_admin_token');
  if (adminToken) return adminToken;

  const authenticatedToken = localStorage.getItem('vidyal_user_token');
  if (authenticatedToken) return authenticatedToken;
  if (currentToken) return currentToken;

  const response = await fetchWithApiFallback(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch token');
  }

  const data = await response.json();
  currentToken = data.token;
  return currentToken!;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetchWithApiFallback(url, { ...options, headers });
}

export const api = {
  // Google Single Sign-On API
  async googleLogin(idToken: string): Promise<{ token: string; userId: string; profile: UserProfile }> {
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

  // Users API
  async getUserProfile(userId = getActiveUserId()): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
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

  // Paths API
  async getUserPaths(userId = getActiveUserId()): Promise<LearningPath[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user paths');
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
    if (!response.ok) throw new Error('Failed to update path');
    return response.json();
  },

  async deletePath(pathId: string): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/${pathId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete path');
  },

  async verifyVideos(ids: string[]): Promise<{ id: string; title: string; embeddable: boolean }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return [];
      const data = await response.json() as { videos: { id: string; title: string; embeddable: boolean }[] };
      return data.videos ?? [];
    } catch {
      return [];
    }
  },

  async getChapters(videoId: string): Promise<{ title: string; startSecs: number; endSecs: number }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/chapters/${videoId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.chapters ?? [];
    } catch {
      return [];
    }
  },

  async getTranscript(videoId: string): Promise<{ start: number; duration: number; text: string }[]> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/videos/transcript/${videoId}`);
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
        headers: { 'Content-Type': 'application/json' },
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

  async chatWithSmartDocument(documentId: string, message: string, history: any[]): Promise<string> {
    const response = await fetchWithAuth(`${API_BASE_URL}/smart-study/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, message, history }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to chat with document');
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

  async curateVideo(contextText: string): Promise<any> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/smartboard/curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextText }),
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
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
  async fetchDocuments() {
    const response = await fetchWithAuth(`${API_BASE_URL}/documents`, {
      method: 'GET',
    });
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
    const response = await fetchWithAuth(`${API_BASE_URL}/documents?${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to fetch documents');
    }
    return response.json();
  },
};
