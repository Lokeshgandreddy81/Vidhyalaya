import { LearningPath, UserProfile } from '../types';

// Use Vite's environment variable or fallback to the standard backend Port 5001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const DEFAULT_USER_ID = 'default-user';

let currentToken: string | null = null;

async function getToken(userId: string = DEFAULT_USER_ID): Promise<string> {
  if (currentToken) return currentToken;

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
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
  return fetch(url, { ...options, headers });
}

export const api = {
  // Users API
  async getUserProfile(userId = DEFAULT_USER_ID): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  async updateUserProfile(data: Partial<UserProfile>, userId = DEFAULT_USER_ID): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
    return response.json();
  },

  // Paths API
  async getUserPaths(userId = DEFAULT_USER_ID): Promise<LearningPath[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/paths/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user paths');
    return response.json();
  },

  async createPath(path: LearningPath, userId = DEFAULT_USER_ID): Promise<LearningPath> {
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
  async uploadSmartDocument(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithAuth(`${API_BASE_URL}/smart-study/upload`, {
      method: 'POST',
      body: formData,
      // Note: Do not set Content-Type header here when using FormData.
      // The browser will automatically set it with the correct multipart boundary.
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
  }
};
