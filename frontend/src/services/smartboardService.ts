import { api } from './api';

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
  source?: 'youtube_api' | 'gemini_search' | 'curated_fallback';
}

export async function searchPerfectVideos(
  query: string,
  context?: string,
  minRelevanceScore?: number,
  goalContext?: string,
): Promise<PerfectVideo[]> {
  if (!query || query.length < 2) return [];

  const hits = await api.searchSmartboardVideos(query, context, minRelevanceScore ?? 0, goalContext);
  return hits.map(v => ({
    id: v.id,
    title: v.title,
    channel: v.channel,
    channelId: '',
    description: '',
    durationSeconds: 0,
    durationFormatted: v.durationFormatted || '',
    viewCount: v.viewCount || 0,
    likeCount: 0,
    embeddable: v.embeddable !== false,
    isAuthority: false,
    isElite: false,
    relevanceScore: 7,
    source: v.source,
  }));
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
