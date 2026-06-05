import { api, SERVER_BASE_URL } from './api';

export interface PerfectVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  description: string;
  durationSeconds: number;
  durationFormatted: string;
  viewCount: number;
  likeCount: number;
  embeddable: boolean;
  isAuthority: boolean;
  isElite: boolean;
  relevanceScore: number;
  relevanceReason?: string;
}

interface SearchResponse {
  query: string;
  videos: PerfectVideo[];
}

async function getToken(): Promise<string> {
  const token = localStorage.getItem('vidyal_user_token');
  if (token) return token;
  const userId = localStorage.getItem('vidyal_user_id') || 'default-user';

  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await response.json();
  localStorage.setItem('vidyal_user_token', data.token);
  return data.token;
}

export async function searchPerfectVideos(
  query: string,
  context?: string,
  minRelevanceScore?: number
): Promise<PerfectVideo[]> {
  if (!query || query.length < 2) return [];

  try {
    const token = await getToken();
    const response = await fetch(`${SERVER_BASE_URL}/api/smartboard/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, context, minRelevanceScore }),
    });

    if (!response.ok) {
      console.warn(`[SmartboardService] Search failed: ${response.status}`);
      return [];
    }

    const data: SearchResponse = await response.json();
    return data.videos || [];
  } catch (err) {
    console.error('[SmartboardService] Error:', err);
    return [];
  }
}

export function getYouTubeThumbnail(id: string, quality: 'mq' | 'hq' | 'sd' | 'maxres' = 'mq'): string {
  const qualityMap: Record<string, string> = {
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  return `https://i.ytimg.com/vi/${id}/${qualityMap[quality] || 'mqdefault'}.jpg`;
}
