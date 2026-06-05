import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { Play, RefreshCcw, AlertTriangle, MessageCircle, Loader } from 'lucide-react';
import { VideoSegment, SmartboardJumpEventDetail } from '../types';

interface VideoEntry {
  id: string;
  title: string;
  channel?: string;
  label?: string;
  matchScore?: number;
}

interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  label: string;
  matchScore: number;
}

interface SmartNotes {
  overview: string;
  keyConcepts: string[];
  insights: string[];
  mistakes: string[];
  resources: string[];
}

interface SmartboardProps {
  videoId: string;
  allVideoIds?: VideoEntry[];
  moduleTitle: string;
  moduleContent?: string | null;
  timeline: VideoSegment[];
  onTimestampReached?: (segment: VideoSegment) => void;
  onReSync?: () => void;
  activeSegmentId?: string;
  isMapping?: boolean;
  isTheaterMode?: boolean;
  boardControl?: React.ReactNode;
  onOpenContents?: () => void;
  focusMode?: 'content' | 'split';
  isZenMode?: boolean;
  onVideoError?: () => void;
  allowAutoplay?: boolean;
  complexity?: string;
  onAskAI?: () => void;
}

const PLAYLIST_LABELS = [
  'Best Overall',
  'Beginner Friendly',
  'Industry Practical',
  'Interview Focused',
  'Deep Dive',
  'Advanced',
];

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

const cleanLearningText = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const deriveSmartNotes = (content: string | null | undefined, moduleTitle: string): SmartNotes => {
  const safe = content || '';
  const lines = safe.split('\n');
  const sections: Record<string, string[]> = {};
  let current = 'overview';

  for (const line of lines) {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      const label = heading[1].toLowerCase();
      if (/overview|introduction|summary/.test(label)) current = 'overview';
      else if (/concept|topic|fundamental/.test(label)) current = 'keyConcepts';
      else if (/insight|takeaway|key point/.test(label)) current = 'insights';
      else if (/mistake|pitfall|common error|avoid/.test(label)) current = 'mistakes';
      else if (/resource|reference|further|bibliography/.test(label)) current = 'resources';
      else current = 'keyConcepts';
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    const text = bullet?.[1] || numbered?.[1];
    if (!text) continue;
    const cleaned = cleanLearningText(text);
    if (cleaned.length < 8) continue;
    if (!sections[current]) sections[current] = [];
    sections[current].push(cleaned);
  }

  const sentences = cleanLearningText(safe)
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.length > 30);

  return {
    overview: sections.overview?.[0] || sentences[0] || `Learn the core ideas of ${moduleTitle} through curated video instruction.`,
    keyConcepts: (sections.keyConcepts || sentences.slice(1, 5)).slice(0, 5),
    insights: (sections.insights || sentences.slice(5, 8)).slice(0, 4),
    mistakes: (sections.mistakes || []).slice(0, 3),
    resources: (sections.resources || []).slice(0, 4),
  };
};

const buildPlaylist = (videoList: VideoEntry[], primaryId: string): PlaylistItem[] => {
  const seen = new Set<string>();
  const items: PlaylistItem[] = [];

  for (const video of videoList) {
    if (!video.id || seen.has(video.id)) continue;
    seen.add(video.id);
    items.push({
      id: video.id,
      videoId: video.id,
      title: video.title,
      channel: video.channel || 'Verified Source',
      label: video.label || PLAYLIST_LABELS[items.length] || 'Alternative',
      matchScore: video.matchScore ?? Math.max(85, 98 - items.length * 2),
    });
  }

  // Ensure primary is first
  const primaryIdx = items.findIndex(i => i.videoId === primaryId);
  if (primaryIdx > 0) {
    const [primary] = items.splice(primaryIdx, 1);
    primary.label = 'Best Overall';
    items.unshift(primary);
  } else if (items.length > 0 && primaryId) {
    items[0].label = 'Best Overall';
  }

  return items.slice(0, 6);
};

const Smartboard: React.FC<SmartboardProps> = ({
  videoId,
  allVideoIds = [],
  moduleTitle,
  moduleContent,
  timeline,
  onTimestampReached,
  onReSync,
  activeSegmentId: externalActiveId,
  isMapping = false,
  isZenMode = false,
  allowAutoplay = true,
  onAskAI,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<{ timestamp: number; videoId?: string } | null>(null);
  const failedIdsRef = useRef<Set<string>>(new Set());

  const videoList: VideoEntry[] = useMemo(() => {
    const list: VideoEntry[] = [];
    const seen = new Set<string>();

    const add = (v: VideoEntry) => {
      if (v?.id?.trim() && !seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    };

    // Primary video first
    if (videoId) add({ id: videoId, title: moduleTitle });
    for (const v of allVideoIds) add(v);

    return list;
  }, [videoId, allVideoIds, moduleTitle]);

  const playlist = useMemo(() => buildPlaylist(videoList, videoId), [videoList, videoId]);

  const currentVideo = videoList[currentIdx] || videoList[0];
  const isActuallyFailed = allFailed || !currentVideo?.id?.trim();
  const isLoading = isMapping || (!videoId && videoList.length === 0);

  const smartNotes = useMemo(
    () => deriveSmartNotes(moduleContent, moduleTitle),
    [moduleContent, moduleTitle],
  );

  // Reset on module/video change
  useEffect(() => {
    setCurrentIdx(0);
    setAllFailed(false);
    setActiveSegmentId(null);
    setPlayerReady(false);
    failedIdsRef.current.clear();
    playerRef.current = null;
  }, [moduleTitle, videoId]);

  // Keep currentIdx aligned when videoId prop changes
  useEffect(() => {
    if (!videoId) return;
    const idx = videoList.findIndex(v => v.id === videoId);
    if (idx !== -1 && idx !== currentIdx) setCurrentIdx(idx);
  }, [videoId, videoList]);

  const seekPlayer = useCallback((ts: number) => {
    if (!playerRef.current) return false;
    try {
      playerRef.current.seekTo(Math.max(0, ts), true);
      playerRef.current.playVideo();
      return true;
    } catch {
      return false;
    }
  }, []);

  const switchToVideo = useCallback((targetId: string, timestamp = 0) => {
    const idx = videoList.findIndex(v => v.id === targetId);
    if (idx !== -1) {
      pendingSeekRef.current = { timestamp, videoId: targetId };
      setCurrentIdx(idx);
      setAllFailed(false);
    }
  }, [videoList]);

  const syncActiveSegmentAtTime = useCallback(() => {
    if (!playerRef.current || timeline.length === 0) return;
    try {
      const time = playerRef.current.getCurrentTime();
      const currentSeg = [...timeline]
        .reverse()
        .find(s => (!s.videoId || s.videoId === currentVideo?.id) && s.timestamp <= time);
      if (currentSeg && currentSeg.id !== activeSegmentId) {
        setActiveSegmentId(currentSeg.id);
        onTimestampReached?.(currentSeg);
      }
    } catch { /* player not ready */ }
  }, [timeline, currentVideo?.id, activeSegmentId, onTimestampReached]);

  useEffect(() => {
    if (!externalActiveId || externalActiveId === activeSegmentId) return;
    const seg = timeline.find(s => s.id === externalActiveId);
    if (!seg) return;
    setActiveSegmentId(seg.id);
    if (seg.videoId && seg.videoId !== currentVideo?.id) {
      switchToVideo(seg.videoId, seg.timestamp);
    } else {
      seekPlayer(seg.timestamp);
    }
  }, [externalActiveId, timeline, currentVideo?.id, activeSegmentId, switchToVideo, seekPlayer]);

  useEffect(() => {
    const handleGlobalJump = (e: Event) => {
      const { timestamp, videoId: jumpVideoId } = (e as CustomEvent<SmartboardJumpEventDetail>).detail;
      if (jumpVideoId && jumpVideoId !== currentVideo?.id) {
        switchToVideo(jumpVideoId, timestamp ?? 0);
      } else if (timestamp !== undefined) {
        seekPlayer(timestamp);
      }
    };
    window.addEventListener('smartboard-jump', handleGlobalJump);
    return () => window.removeEventListener('smartboard-jump', handleGlobalJump);
  }, [currentVideo?.id, switchToVideo, seekPlayer]);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setPlayerReady(true);
    setAllFailed(false);

    const pending = pendingSeekRef.current;
    if (pending) {
      pendingSeekRef.current = null;
      requestAnimationFrame(() => {
        try {
          if (pending.timestamp > 0) {
            event.target.seekTo(pending.timestamp, true);
          }
          if (allowAutoplay) event.target.playVideo();
        } catch { /* seek/autoplay blocked */ }
      });
    } else if (allowAutoplay) {
      try { event.target.playVideo(); } catch { /* autoplay blocked */ }
    }
  };

  const handleStateChange = (event: YouTubeEvent) => {
    setIsPlaying(event.data === 1);
    syncActiveSegmentAtTime();
  };

  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;
    const id = window.setInterval(syncActiveSegmentAtTime, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, syncActiveSegmentAtTime, timeline.length]);

  const handleError = () => {
    const failedId = currentVideo?.id;
    if (failedId) failedIdsRef.current.add(failedId);

    // Try next un-failed video silently
    const nextIdx = videoList.findIndex(
      (v, i) => i > currentIdx && !failedIdsRef.current.has(v.id)
    );
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
      setPlayerReady(false);
      return;
    }

    // Wrap around
    const wrapIdx = videoList.findIndex(v => !failedIdsRef.current.has(v.id));
    if (wrapIdx !== -1 && wrapIdx !== currentIdx) {
      setCurrentIdx(wrapIdx);
      setPlayerReady(false);
      return;
    }

    setAllFailed(true);
  };

  const handleReSync = async () => {
    setIsSyncing(true);
    setAllFailed(false);
    failedIdsRef.current.clear();
    setCurrentIdx(0);
    setPlayerReady(false);
    try {
      await onReSync?.();
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePlaylistSelect = (item: PlaylistItem) => {
    switchToVideo(item.videoId, 0);
  };

  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: allowAutoplay ? 1 : 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      fs: 1,
      playsinline: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };

  const surface = isZenMode ? 'bg-[#05070a] text-white' : 'bg-white text-slate-950';
  const border = isZenMode ? 'border-white/10' : 'border-slate-200';
  const muted = isZenMode ? 'text-slate-400' : 'text-slate-500';
  const accent = isZenMode ? 'text-indigo-300' : 'text-[#000666]';
  const activeBg = isZenMode ? 'bg-white/10' : 'bg-[#000666]/5';

  return (
    <div id="smartboard-container" className={`flex h-full min-h-0 flex-col overflow-hidden ${surface}`}>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_320px] lg:p-5">
        {/* Main Video */}
        <section className="flex min-h-0 min-w-0 flex-col">
          <div className={`relative overflow-hidden rounded-2xl border ${border} bg-black shadow-sm`}>
            <div className="relative aspect-video w-full">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                  <Loader size={24} className="mb-3 animate-spin text-[#000666]" />
                  <p className="text-[13px] font-semibold text-white">
                    Finding videos…
                  </p>
                  <p className={`mt-1 text-[12px] ${muted}`}>Matching sources for {moduleTitle}</p>
                </div>
              ) : !isActuallyFailed && currentVideo?.id ? (
                <>
                  <YouTube
                    key={currentVideo.id}
                    videoId={currentVideo.id}
                    opts={ytOpts}
                    onReady={handleReady}
                    onStateChange={handleStateChange}
                    onError={handleError}
                    className="absolute inset-0 h-full w-full"
                    iframeClassName="h-full w-full border-0"
                  />
                  {!playerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <Loader size={20} className="animate-spin text-white/60" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                  <AlertTriangle size={28} className="mb-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">No playable video</h3>
                  <p className="mt-2 max-w-xs text-xs text-slate-500">
                    Could not find an embeddable video for this topic. Try resyncing.
                  </p>
                  <button
                    onClick={handleReSync}
                    disabled={isSyncing}
                    className="mt-5 rounded-lg bg-[#000666] px-5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50 hover:bg-[#000888] transition-colors"
                  >
                    {isSyncing ? 'Resyncing…' : 'Resync'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <h1 className={`mt-3 text-lg font-semibold leading-snug tracking-tight lg:text-xl ${isZenMode ? 'text-white' : 'text-slate-950'}`}>
            {currentVideo?.title || moduleTitle}
          </h1>
        </section>

        {/* AI Playlist */}
        <aside className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border ${border} ${isZenMode ? 'bg-white/5' : 'bg-slate-50/50'}`}>
          <div className={`shrink-0 border-b px-4 py-3 ${border}`}>
            <p className={`text-[12px] font-semibold ${accent}`}>Playlist</p>
            <p className={`mt-0.5 text-[12px] ${muted}`}>
              {isLoading ? 'Loading…' : `${playlist.length} video${playlist.length === 1 ? '' : 's'} for this lesson`}
            </p>
          </div>
          <div ref={playlistRef} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8">
                <Loader size={16} className="animate-spin text-[#000666]" />
                <p className={`text-[12px] ${muted}`}>Ranking by topic match…</p>
              </div>
            ) : playlist.length === 0 ? (
              <div className="p-6 text-center">
                <p className={`text-[11px] ${muted}`}>No videos yet. Click resync below.</p>
              </div>
            ) : (
              playlist.map(item => {
                const isActive = item.videoId === currentVideo?.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePlaylistSelect(item)}
                    className={`flex w-full gap-3 border-b p-3 text-left transition-colors ${border} ${
                      isActive
                        ? activeBg
                        : isZenMode ? 'hover:bg-white/5' : 'hover:bg-white'
                    }`}
                  >
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                      <img src={getYouTubeThumbnail(item.videoId)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {isActive && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play size={14} fill="white" className="text-white" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-semibold ${accent}`}>{item.label}</span>
                        <span className="text-[10px] font-medium text-emerald-600">{item.matchScore}% match</span>
                      </div>
                      <p className={`mt-1 line-clamp-2 text-[12px] font-bold leading-snug ${isZenMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {item.title}
                      </p>
                      <p className={`mt-0.5 truncate text-[10px] ${muted}`}>{item.channel}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className={`shrink-0 border-t px-3 py-2 ${border}`}>
            <button
              onClick={handleReSync}
              disabled={isSyncing || isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold transition-colors disabled:opacity-50 ${isZenMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-[#000666]'}`}
            >
              <RefreshCcw size={12} className={isSyncing || isLoading ? 'animate-spin' : ''} />
              {isSyncing ? 'Resyncing…' : 'Refresh playlist'}
            </button>
          </div>
        </aside>
      </div>

      {/* AI Notes */}
      <section className={`shrink-0 border-t ${border} ${isZenMode ? 'bg-[#05070a]' : 'bg-slate-50/80'}`}>
        <div className="max-h-[280px] overflow-y-auto custom-scrollbar px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className={`text-[12px] font-semibold ${accent}`}>Lesson notes</p>
            {onAskAI && (
              <button
                onClick={onAskAI}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isZenMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-[#000666] text-white hover:bg-[#000888]'
                }`}
              >
                <MessageCircle size={11} />
                Ask AI
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NoteSection title="Overview" isZenMode={isZenMode}>
              <p className={`text-[12px] font-medium leading-relaxed text-justify hyphens-auto ${isZenMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {smartNotes.overview}
              </p>
            </NoteSection>
            <NoteSection title="Key Concepts" isZenMode={isZenMode}>
              <NoteList items={smartNotes.keyConcepts} isZenMode={isZenMode} empty="Concepts will appear as content loads." />
            </NoteSection>
            <NoteSection title="Important Insights" isZenMode={isZenMode}>
              <NoteList items={smartNotes.insights} isZenMode={isZenMode} empty="Insights will appear as you watch." />
            </NoteSection>
            {smartNotes.mistakes.length > 0 && (
              <NoteSection title="Common Mistakes" isZenMode={isZenMode}>
                <NoteList items={smartNotes.mistakes} isZenMode={isZenMode} />
              </NoteSection>
            )}
            {smartNotes.resources.length > 0 && (
              <NoteSection title="Resources" isZenMode={isZenMode}>
                <NoteList items={smartNotes.resources} isZenMode={isZenMode} />
              </NoteSection>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const NoteSection: React.FC<{ title: string; isZenMode: boolean; children: React.ReactNode }> = ({
  title, isZenMode, children,
}) => (
  <div className={`rounded-xl border p-3 ${isZenMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
    <h3 className={`mb-2 text-[11px] font-semibold ${isZenMode ? 'text-indigo-300' : 'text-[#000666]'}`}>{title}</h3>
    {children}
  </div>
);

const NoteList: React.FC<{ items: string[]; isZenMode: boolean; empty?: string }> = ({ items, isZenMode, empty }) => {
  if (items.length === 0) {
    return <p className={`text-[11px] italic ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>{empty || '—'}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`text-[12px] font-medium leading-relaxed text-justify hyphens-auto before:mr-1.5 before:content-['•'] ${isZenMode ? 'text-slate-300 before:text-indigo-400' : 'text-slate-700 before:text-[#000666]'}`}>
          {item}
        </li>
      ))}
    </ul>
  );
};

export default Smartboard;
