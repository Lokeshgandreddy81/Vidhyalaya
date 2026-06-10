import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Captions,
  Clock,
  Eye,
  FileText,
  Layers,
  ListVideo,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';
import { SmartboardJumpEventDetail, VideoSegment } from '../../types';
import { searchPerfectVideos, PerfectVideo, getYouTubeThumbnail } from '../../services/smartboardService';
import { getVideosByTopic } from '../../services/videoLibrary';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useClassroomPlayback } from '../../context/ClassroomPlaybackContext';
import './Smartboard.css';

interface VideoEntry {
  id: string;
  title: string;
  channel?: string;
  durationFormatted?: string;
  viewCount?: number;
}

type FeedSource = 'loading' | 'youtube_api' | 'gemini_search' | 'curated_fallback' | 'verified' | 'empty';

interface SmartboardProps {
  videoId: string;
  allVideoIds?: VideoEntry[];
  moduleTitle: string;
  moduleContent?: string | null;
  goalContext?: string;
  onReSync?: () => void;
  isZenMode?: boolean;
  onVideoError?: () => void;
  allowAutoplay?: boolean;
  complexity?: string;
  videoTimeline?: VideoSegment[];
  isContentLoading?: boolean;
  isScouting?: boolean;
  onTimeUpdate?: (videoId: string, timestamp: number, activeChapterTitle?: string) => void;
}

function formatViewCount(n: number): string {
  if (!n || n < 1) return '';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  return `${n} views`;
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildPlaylist(
  base: VideoEntry[],
  apiVideos: PerfectVideo[],
  verified: { id: string; title: string; channel?: string; durationFormatted?: string; viewCount?: number }[],
): VideoEntry[] {
  const metaById = new Map<string, VideoEntry>();

  const upsert = (v: VideoEntry) => {
    if (!v?.id?.trim()) return;
    const existing = metaById.get(v.id);
    metaById.set(v.id, {
      id: v.id,
      title: v.title || existing?.title || '',
      channel: v.channel || existing?.channel,
      durationFormatted: v.durationFormatted || existing?.durationFormatted,
      viewCount: v.viewCount ?? existing?.viewCount,
    });
  };

  for (const v of base) upsert(v);
  for (const v of apiVideos) upsert({
    id: v.id,
    title: v.title,
    channel: v.channel,
    durationFormatted: v.durationFormatted,
    viewCount: v.viewCount,
  });
  for (const v of verified) upsert(v);

  const orderedIds: string[] = [];
  const pushId = (id: string) => {
    if (id?.length >= 10 && !orderedIds.includes(id)) orderedIds.push(id);
  };

  // YouTube API search is the playlist backbone — always merge multiple hits
  const embeddableApi = apiVideos.filter(v => v.embeddable !== false);
  for (const v of embeddableApi) pushId(v.id);
  for (const v of verified) pushId(v.id);
  for (const v of apiVideos) pushId(v.id);
  for (const v of base) pushId(v.id);

  return orderedIds
    .slice(0, 12)
    .map(id => metaById.get(id))
    .filter((v): v is VideoEntry => Boolean(v?.id));
}

const Smartboard: React.FC<SmartboardProps> = ({
  videoId,
  allVideoIds = [],
  moduleTitle,
  moduleContent,
  goalContext = '',
  onReSync,
  isZenMode = false,
  onVideoError,
  allowAutoplay = true,
  videoTimeline = [],
  isContentLoading = false,
  isScouting = false,
  onTimeUpdate,
}) => {
  const { playerRef: sharedPlayerRef, updateLivePlayback } = useClassroomPlayback();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [activeTab, setActiveTab] = useState<'chapters' | 'playlist' | 'sync'>('playlist');
  const [currentTime, setCurrentTime] = useState(0);
  const [chapters, setChapters] = useState<{ title: string; startSecs: number; endSecs: number }[]>([]);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<{ start: number; duration: number; text: string }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [verifiedList, setVerifiedList] = useState<VideoEntry[]>([]);
  const [feedSource, setFeedSource] = useState<FeedSource>('loading');
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showTopline, setShowTopline] = useState(true);
  const toplineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sidebarListRef = useRef<HTMLDivElement>(null);
  const transcriptListRef = useRef<HTMLDivElement>(null);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const errorThrottleRef = useRef<number>(0);
  const searchGenRef = useRef(0);

  const currentIdxRef = useRef(currentIdx);
  const verifiedListRef = useRef(verifiedList);
  currentIdxRef.current = currentIdx;
  verifiedListRef.current = verifiedList;

  // Stabilize allVideoIds prop to prevent pipeline re-fires on every parent render.
  // We compare by value (serialized JSON) and only update the ref when the IDs actually change.
  const prevSerializedRef = useRef<string>('');
  const stableVideoIdsRef = useRef<VideoEntry[]>(allVideoIds);
  const serializedVideoIds = JSON.stringify(allVideoIds.map(v => ({ id: v.id, title: v.title })));
  if (serializedVideoIds !== prevSerializedRef.current) {
    prevSerializedRef.current = serializedVideoIds;
    stableVideoIdsRef.current = allVideoIds;
  }
  const stableVideoIds = stableVideoIdsRef.current;

  const videoList = verifiedList;
  const currentVideo = videoList[currentIdx] || videoList[0];

  // Stabilize moduleContent to prevent streaming edits from re-scouting
  const moduleContentRef = useRef(moduleContent);
  useEffect(() => {
    moduleContentRef.current = moduleContent;
  }, [moduleContent]);

  const hasContent = Boolean(moduleContent && moduleContent.trim().length > 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mark player as transitioning when video changes
  useEffect(() => {
    setIsPlayerReady(false);
    if (onTimeUpdate && currentVideo?.id) {
      onTimeUpdate(currentVideo.id, 0);
    }
  }, [currentIdx, currentVideo?.id, onTimeUpdate]);

  // Search → verify → playlist (with fallbacks for Shorts + oEmbed)
  useEffect(() => {
    if (isContentLoading || isScouting) return;

    const gen = ++searchGenRef.current;
    let cancelled = false;

    const loadVideos = async () => {
      const activeVideoId = verifiedListRef.current[currentIdxRef.current]?.id || videoId;
      setIsLoadingVideos(true);
      setFeedSource('loading');
      const context = (moduleContentRef.current || '').substring(0, 2000);

      const candidates: VideoEntry[] = [];
      const seen = new Set<string>();

      const pushCandidate = (v: VideoEntry) => {
        const id = v.id?.trim();
        if (!id || id.length < 10 || seen.has(id)) return;
        seen.add(id);
        candidates.push({ ...v, id });
      };

      if (videoId?.trim().length >= 10) {
        pushCandidate({ id: videoId, title: moduleTitle });
      }
      for (const v of stableVideoIds) {
        pushCandidate(v);
      }

      let apiVideos: PerfectVideo[] = [];
      let hasLocalReserve = false;

      // Primary: YouTube Data API playlist (8–12 topic-matched, embeddable lessons)
      try {
        const searched = await searchPerfectVideos(moduleTitle, context, 0, goalContext);
        apiVideos = searched;
        for (const v of searched) {
          pushCandidate({
            id: v.id,
            title: v.title,
            channel: v.channel,
            durationFormatted: v.durationFormatted,
            viewCount: v.viewCount,
          });
        }
      } catch {
        /* search failed — fall through to curate */
      }

      try {
        const curation = await api.curateVideo({
          moduleTitle,
          contextText: context,
          goalContext: goalContext || undefined,
        });
        if (curation?.videos?.length) {
          for (const v of curation.videos) {
            pushCandidate({
              id: v.videoId,
              title: v.title,
              channel: v.channel,
            });
          }
        } else if (curation?.videoId) {
          pushCandidate({ id: curation.videoId, title: curation.title || moduleTitle });
        }
      } catch {
        /* curate failed — candidates from search remain */
      }

      if (candidates.length < 6) {
        const localReserve = getVideosByTopic(moduleTitle, 8);
        hasLocalReserve = localReserve.length > 0;
        for (const v of localReserve) {
          pushCandidate({
            id: v.id,
            title: v.title,
            channel: v.channel,
            durationFormatted: formatMinutes(v.durationMins),
          });
        }
      }

      if (cancelled || gen !== searchGenRef.current) return;

      const idsToVerify = candidates.map(c => c.id);
      let verified: { id: string; title: string; channel?: string; durationFormatted?: string; viewCount?: number }[] = [];

      if (idsToVerify.length > 0) {
        try {
          verified = await api.verifyVideos(idsToVerify);
        } catch {
          verified = [];
        }
      }

      if (cancelled || gen !== searchGenRef.current) return;

      const finalList = buildPlaylist(candidates, apiVideos, verified);
      setVerifiedList(finalList);
      const liveSource = apiVideos.find(v => v.source)?.source;
      setFeedSource(finalList.length === 0 ? 'empty' : liveSource || (verified.length > 0 && !hasLocalReserve ? 'verified' : 'curated_fallback'));
      
      if (activeVideoId) {
        const preservedIdx = finalList.findIndex(v => v.id === activeVideoId);
        setCurrentIdx(preservedIdx !== -1 ? preservedIdx : 0);
      } else {
        setCurrentIdx(0);
      }
      setIsLoadingVideos(false);

      if (finalList.length === 0 && !cancelled && !isContentLoading && !isScouting) {
        toast.error('No embeddable videos found — try Refresh after content loads.');
      }
    };

    loadVideos();
    return () => { cancelled = true; };
    // NOTE: `hasContent` is intentionally excluded — it changes with every streaming character
    // and would restart the entire pipeline (resetting currentIdx → video skips). Instead we
    // pass moduleContent via the stable ref (moduleContentRef) which is always current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleTitle, videoId, serializedVideoIds, goalContext, isContentLoading, isScouting]);

  const isActuallyFailed = !isLoadingVideos && (!currentVideo?.id?.trim() || videoList.length === 0);
  const channelInitial = (currentVideo?.channel || moduleTitle || 'V').charAt(0).toUpperCase();

  // Chapters effect with robust 2s retry mechanism
  useEffect(() => {
    if (!currentVideo?.id) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    let retryTimeout: NodeJS.Timeout;
    setIsChaptersLoading(true);
    setChapters([]);

    const fetchChapters = async (isRetry = false) => {
      try {
        const res = await api.getChapters(currentVideo.id);
        if (cancelled) return;
        if (res && res.length >= 1) {
          setChapters(res);
          setIsChaptersLoading(false);
        } else if (!isRetry) {
          retryTimeout = setTimeout(() => {
            if (!cancelled) {
              fetchChapters(true);
            }
          }, 2000);
        } else {
          setChapters([]);
          setIsChaptersLoading(false);
        }
      } catch {
        if (cancelled) return;
        if (!isRetry) {
          retryTimeout = setTimeout(() => {
            if (!cancelled) {
              fetchChapters(true);
            }
          }, 2000);
        } else {
          setChapters([]);
          setIsChaptersLoading(false);
        }
      }
    };

    fetchChapters();
    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [currentVideo?.id]);

  useEffect(() => {
    if (!currentVideo?.id) {
      setTranscript([]);
      return;
    }
    let cancelled = false;
    api.getTranscript(
      currentVideo.id,
      currentVideo.title || moduleTitle,
      (moduleContentRef.current || '').substring(0, 2500),
    )
      .then(res => {
        if (!cancelled) setTranscript(res || []);
      })
      .catch(() => {
        if (!cancelled) setTranscript([]);
      });
    return () => { cancelled = true; };
  }, [currentVideo?.id, currentVideo?.title, moduleTitle]);

  // Only auto-switch the sidebar tab when the VIDEO itself changes (not when chapters/sync
  // arrive asynchronously). This prevents hijacking a tab the user deliberately chose.
  const prevVideoIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (currentVideo?.id === prevVideoIdRef.current) return;
    prevVideoIdRef.current = currentVideo?.id;
    // On a new video, pick the best default tab once (chapters > sync > playlist).
    // Subsequent async chapter/sync arrivals will NOT re-run this effect.
    if (chapters.length > 0) setActiveTab('chapters');
    else if (videoTimeline.length > 0) setActiveTab('sync');
    else setActiveTab('playlist');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(time);
          let activeChTitle = '';
          if (chapters && chapters.length > 0) {
            const chIdx = chapters.findIndex(ch => time >= ch.startSecs && time < ch.endSecs);
            if (chIdx !== -1) {
              activeChTitle = chapters[chIdx].title;
            }
          }
          if (onTimeUpdate && currentVideo?.id) {
            onTimeUpdate(currentVideo.id, time, activeChTitle);
          }
          // Sync playback to centralized event source context
          updateLivePlayback(time, activeChTitle);
        }
        const dur = playerRef.current.getDuration();
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
      } catch { /* player not ready */ }
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [currentVideo?.id, onTimeUpdate, chapters, updateLivePlayback]);

  useEffect(() => {
    return () => {
      playerRef.current = null;
      sharedPlayerRef.current = null;
    };
  }, [sharedPlayerRef]);

  const resetToplineTimeout = useCallback(() => {
    setShowTopline(true);
    if (toplineTimeoutRef.current) {
      clearTimeout(toplineTimeoutRef.current);
    }
    
    let isPlaying = false;
    if (playerRef.current) {
      try {
        isPlaying = playerRef.current.getPlayerState() === 1; // 1 = PLAYING
      } catch { /* ignore */ }
    }
    
    if (isPlaying) {
      toplineTimeoutRef.current = setTimeout(() => {
        setShowTopline(false);
      }, 3000);
    }
  }, []);

  const handlePlayerShellPointerLeave = useCallback(() => {
    if (toplineTimeoutRef.current) {
      clearTimeout(toplineTimeoutRef.current);
    }
    let isPlaying = false;
    if (playerRef.current) {
      try {
        isPlaying = playerRef.current.getPlayerState() === 1;
      } catch { /* ignore */ }
    }
    if (isPlaying) {
      toplineTimeoutRef.current = setTimeout(() => {
        setShowTopline(false);
      }, 800);
    }
  }, []);

  const handlePlayerStateChange = useCallback((event: any) => {
    if (event.data !== 1) {
      setShowTopline(true);
      if (toplineTimeoutRef.current) {
        clearTimeout(toplineTimeoutRef.current);
      }
    } else {
      resetToplineTimeout();
    }
  }, [resetToplineTimeout]);

  const seekPlayer = useCallback((ts: number) => {
    if (!playerRef.current) {
      setPendingSeek(ts);
      return;
    }
    try {
      playerRef.current.seekTo(Math.max(0, ts), true);
      playerRef.current.playVideo();
      setShowTranscript(false);
    } catch {
      setPendingSeek(ts);
    }
  }, []);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    sharedPlayerRef.current = event.target;
    setIsPlayerReady(true);
    if (allowAutoplay) {
      try { event.target.playVideo(); } catch { /* ignore */ }
    }
    if (pendingSeek !== null) {
      try {
        event.target.seekTo(pendingSeek, true);
        event.target.playVideo();
      } catch { /* ignore */ }
      setPendingSeek(null);
    }
  };

  const advanceToNext = useCallback(() => {
    if (currentIdx < videoList.length - 1) {
      setCurrentIdx(i => i + 1);
      return true;
    }
    return false;
  }, [currentIdx, videoList.length]);

  const handleError = (event: { data?: number }) => {
    const errorCode = event?.data;
    const isFatal = errorCode === 100 || errorCode === 101 || errorCode === 150;
    if (!isFatal) return;

    const now = Date.now();
    if (now - errorThrottleRef.current < 300) return;
    errorThrottleRef.current = now;

    const failedId = currentVideo?.id;
    if (failedId) {
      setVerifiedList(prev => {
        const failedIdx = prev.findIndex(v => v.id === failedId);
        const next = prev.filter(v => v.id !== failedId);
        if (next.length === 0) {
          toast.error('No more embeddable videos — tap Refresh to scout again.');
          if (transcript.length > 0) setShowTranscript(true);
          onVideoError?.();
        } else {
          setCurrentIdx(Math.min(failedIdx, next.length - 1));
          toast.warning('Skipping blocked video — playing next in playlist.');
        }
        return next;
      });
      return;
    }

    if (!advanceToNext()) {
      toast.error('Video unavailable — try another from Up next.');
      onVideoError?.();
    }
  };

  const handleJumpToSegment = useCallback((vId: string, ts: number) => {
    const idx = videoList.findIndex(v => v.id === vId);
    if (idx !== -1) {
      if (idx === currentIdx) {
        seekPlayer(ts);
      } else {
        setPendingSeek(ts);
        setCurrentIdx(idx);
      }
    } else {
      toast.info('Loading segment video…');
      setPendingSeek(ts);
      api.verifyVideos([vId]).then(verified => {
        if (verified.length > 0) {
          const entry: VideoEntry = {
            id: verified[0].id,
            title: verified[0].title,
            channel: verified[0].channel,
          };
          setVerifiedList(prev => {
            if (prev.some(v => v.id === entry.id)) return prev;
            return [...prev, entry];
          });
          setTimeout(() => {
            setVerifiedList(prev => {
              const newIdx = prev.findIndex(v => v.id === vId);
              if (newIdx !== -1) setCurrentIdx(newIdx);
              return prev;
            });
          }, 100);
        }
      });
    }
  }, [videoList, currentIdx, seekPlayer]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { timestamp, videoId: targetVideoId } = (e as CustomEvent<SmartboardJumpEventDetail>).detail;
      if (targetVideoId) {
        handleJumpToSegment(targetVideoId, timestamp || 0);
      } else if (timestamp !== undefined) {
        seekPlayer(timestamp);
      }
    };
    window.addEventListener('smartboard-jump', handler);
    return () => window.removeEventListener('smartboard-jump', handler);
  }, [seekPlayer, handleJumpToSegment]);

  useEffect(() => {
    setShowTopline(true);
    if (toplineTimeoutRef.current) {
      clearTimeout(toplineTimeoutRef.current);
    }
  }, [currentIdx]);

  useEffect(() => {
    return () => {
      if (toplineTimeoutRef.current) {
        clearTimeout(toplineTimeoutRef.current);
      }
    };
  }, []);

  // Global keyboard shortcuts for premium native playback controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Exclude shortcuts when typing in inputs/textareas/editable zones
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (!playerRef.current) return;

      try {
        if (e.code === 'Space') {
          e.preventDefault();
          const state = playerRef.current.getPlayerState();
          if (state === 1) { // playing
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.playVideo();
          }
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          const time = playerRef.current.getCurrentTime();
          playerRef.current.seekTo(Math.max(0, time - 5), true);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          const time = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          playerRef.current.seekTo(Math.min(dur, time + 5), true);
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          if (playerRef.current.isMuted()) {
            playerRef.current.unMute();
          } else {
            playerRef.current.mute();
          }
        }
      } catch { /* ignore player not fully ready */ }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReSync = async () => {
    setIsSyncing(true);
    setCurrentIdx(0);
    setShowTranscript(false);
    try { await onReSync?.(); } finally { setIsSyncing(false); }
  };

  const handleEnd = () => {
    if (allowAutoplay) {
      const advanced = advanceToNext();
      if (advanced) {
        toast.info('Auto-playing next lesson stream video...');
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const activeChapterIdx = useMemo(() => {
    return chapters.findIndex(ch => currentTime >= ch.startSecs && currentTime < ch.endSecs);
  }, [chapters, currentTime]);

  const chapterProgress = useMemo(() => {
    if (activeChapterIdx === -1 || !chapters[activeChapterIdx]) return 0;
    const ch = chapters[activeChapterIdx];
    const durationSecs = ch.endSecs - ch.startSecs;
    if (durationSecs <= 0) return 0;
    const elapsed = currentTime - ch.startSecs;
    return Math.min(100, Math.max(0, (elapsed / durationSecs) * 100));
  }, [chapters, activeChapterIdx, currentTime]);

  const activeTranscriptIdx = useMemo(() => {
    return transcript.findIndex(line => currentTime >= line.start && currentTime < line.start + line.duration + 2);
  }, [transcript, currentTime]);

  // Active transcript auto-scrolling
  useEffect(() => {
    const listEl = transcriptListRef.current;
    if (!listEl || !showTranscript) return;

    const activeItem = listEl.querySelector('.yt-transcript__line--active');
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeTranscriptIdx, showTranscript]);

  // Sidebar list auto-scrolling for active chapter / playlist item / sync segments
  useEffect(() => {
    const listEl = sidebarListRef.current;
    if (!listEl) return;

    let activeItem: HTMLElement | null = null;
    if (activeTab === 'chapters') {
      activeItem = listEl.querySelector('.yt-chapter-item--active');
    } else if (activeTab === 'playlist') {
      activeItem = listEl.querySelector('.yt-list-item--active');
    } else if (activeTab === 'sync') {
      activeItem = listEl.querySelector('.yt-sync-item--active');
    }

    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeTab, activeChapterIdx, currentIdx]);

  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: allowAutoplay ? 1 : 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      iv_load_policy: 3,
      color: 'white',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };

  const displayDuration = currentVideo?.durationFormatted
    || (duration > 0 ? formatTime(duration) : '');

  const viewLabel = currentVideo?.viewCount ? formatViewCount(currentVideo.viewCount) : '';
  const contextPreview = moduleContent?.replace(/[#*_`>\[\]]/g, '').substring(0, 320).trim();
  const feedLabel = isLoadingVideos || feedSource === 'loading'
    ? 'Calibrating feed'
    : isActuallyFailed || feedSource === 'empty'
      ? 'No video signal'
      : feedSource === 'youtube_api'
        ? 'YouTube API live'
        : feedSource === 'gemini_search'
          ? 'Gemini scout live'
          : feedSource === 'curated_fallback'
            ? 'Curated reserve'
            : 'Verified resources';
  const syncCount = videoTimeline.length || chapters.length;

  return (
    <div id="smartboard-container" className={`yt-smartboard ${isZenMode ? 'yt-smartboard--zen' : ''}`}>
      <header className="yt-smartboard__masthead">
        <div className="yt-smartboard__identity">
          <div className={`yt-feed-pill ${isActuallyFailed ? 'yt-feed-pill--error' : ''}`}>
            <Radio size={14} />
            {feedLabel}
          </div>
          <h1 className="yt-board-title">{moduleTitle}</h1>
        </div>

        <div className="yt-board-metrics" aria-label="Smartboard status">
          <div className="yt-metric">
            <ListVideo size={15} />
            <span>{isLoadingVideos ? '...' : videoList.length}</span>
          </div>
          <div className="yt-metric">
            <Layers size={15} />
            <span>{syncCount}</span>
          </div>
          <button
            type="button"
            onClick={handleReSync}
            disabled={isSyncing}
            className="yt-refresh-btn"
            title="Refresh videos"
            aria-label="Refresh videos"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="yt-smartboard__layout">
        <div className="yt-smartboard__primary">
          <div 
            className="yt-player-shell"
            onPointerMove={resetToplineTimeout}
            onPointerLeave={handlePlayerShellPointerLeave}
          >
            <div className={`yt-player-topline ${showTopline ? '' : 'yt-player-topline--hidden'}`}>
              <span className="yt-player-kicker"><Sparkles size={13} /> Active lesson stream</span>
              <div className="yt-player-progress-pill">
                <span className="yt-player-count">{videoList.length > 0 ? `${currentIdx + 1} of ${videoList.length}` : 'Waiting'}</span>
                {videoList.length > 0 && (
                  <div className="yt-player-progress-bar-wrap">
                    <div 
                      className="yt-player-progress-bar" 
                      style={{ width: `${((currentIdx + 1) / videoList.length) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="yt-player-stage">
              <div className={`yt-player-wrap ${isPlayerReady ? 'yt-player-wrap--ready' : 'yt-player-wrap--transitioning'}`}>
                {isLoadingVideos ? (
                  <div className="yt-skeleton-player" />
                ) : showTranscript && transcript.length > 0 ? (
                  <div className="yt-transcript">
                    <div className="yt-transcript__header">
                      <span className="yt-transcript__title"><Captions size={16} /> Transcript</span>
                      <button
                        type="button"
                        onClick={() => setShowTranscript(false)}
                        className="yt-transcript__back"
                      >
                        Back to video
                      </button>
                    </div>
                    <div ref={transcriptListRef} className="yt-transcript__list custom-scrollbar">
                      {transcript.map((line, idx) => {
                        const isActive = currentTime >= line.start && currentTime < line.start + line.duration + 2;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => seekPlayer(line.start)}
                            className={`yt-transcript__line ${isActive ? 'yt-transcript__line--active' : ''}`}
                          >
                            <span className="yt-transcript__time">{formatTime(line.start)}</span>
                            {line.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : !isActuallyFailed && isMounted && currentVideo?.id ? (
                  <YouTube
                    key={currentVideo.id}
                    videoId={currentVideo.id}
                    opts={ytOpts}
                    onReady={handleReady}
                    onEnd={handleEnd}
                    onError={handleError}
                    onStateChange={handlePlayerStateChange}
                    className="absolute inset-0 w-full h-full"
                    iframeClassName="w-full h-full border-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : isActuallyFailed ? (
                  <div className="yt-error">
                    <AlertTriangle size={32} className="yt-error__icon" />
                    <p className="yt-error__title">Video signal unavailable</p>
                    <p className="yt-error__desc">
                      The live search returned no embeddable lesson videos. Refresh to scout again.
                    </p>
                    <button
                      type="button"
                      onClick={handleReSync}
                      disabled={isSyncing}
                      className="yt-error__btn"
                    >
                      {isSyncing ? 'Refreshing...' : 'Refresh videos'}
                    </button>
                  </div>
                ) : null}
              </div>

              {chapters.length >= 1 && duration > 0 && !isLoadingVideos && (
                <div className="yt-chapter-strip" role="tablist" aria-label="Chapters">
                  {chapters.map((ch, idx) => {
                    const segDuration = (ch.endSecs - ch.startSecs) / duration;
                    const isActive = idx === activeChapterIdx;
                    const isPast = idx < activeChapterIdx;
                    return (
                      <button
                        key={`${ch.startSecs}-${idx}`}
                        type="button"
                        title={ch.title}
                        onClick={() => seekPlayer(ch.startSecs)}
                        className={`yt-chapter-segment ${isActive ? 'yt-chapter-segment--active' : ''} ${isPast ? 'yt-chapter-segment--past' : ''}`}
                        style={{ flex: Math.max(segDuration, 0.02) }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {!isLoadingVideos && currentVideo?.id && (
            <div className="yt-meta">
              <div className="yt-video-kicker">
                <BookOpen size={14} />
                Now studying
              </div>
              <h2 className="yt-title">{currentVideo.title || moduleTitle}</h2>

              <div className="yt-meta-row">
                <div className="yt-channel-block">
                  <div className="yt-avatar" aria-hidden="true">{channelInitial}</div>
                  <div className="yt-channel-info">
                    <div className="yt-channel">{currentVideo.channel || 'Educational channel'}</div>
                    <div className="yt-submeta">
                      {[viewLabel, displayDuration, videoList.length > 1 ? `${currentIdx + 1} / ${videoList.length}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>

                <div className="yt-video-facts">
                  {viewLabel && (
                    <span><Eye size={14} /> {viewLabel}</span>
                  )}
                  {displayDuration && (
                    <span><Clock size={14} /> {displayDuration}</span>
                  )}
                </div>

                <div className="yt-actions">
                  {transcript.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowTranscript(true)}
                      className="yt-action-btn"
                    >
                      <FileText size={17} />
                      Transcript
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const url = `https://www.youtube.com/watch?v=${currentVideo.id}`;
                      navigator.clipboard?.writeText(url);
                      toast.success('Link copied');
                    }}
                    className="yt-action-btn"
                  >
                    <Share2 size={17} />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(v => !v)}
                    className="yt-action-btn yt-action-btn--panel"
                    title={isSidebarCollapsed ? 'Show panel' : 'Hide panel'}
                  >
                    {isSidebarCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
                  </button>
                </div>
              </div>

              {contextPreview && (
                <div className={`yt-description ${isDescriptionExpanded ? 'yt-description--expanded' : ''}`}>
                  <div className="yt-description__header-row">
                    <div className="yt-description__stats">Whiteboard context</div>
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded(v => !v)}
                      className="yt-description__expand-btn"
                    >
                      {isDescriptionExpanded ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                  <div className="yt-description__text">
                    {isDescriptionExpanded ? (
                      moduleContent?.replace(/[#*_`>\[\]]/g, '').trim()
                    ) : (
                      <>
                        {contextPreview}
                        {moduleContent && moduleContent.length > 320 ? '...' : ''}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={`yt-sidebar ${isSidebarCollapsed ? 'yt-sidebar--collapsed' : ''}`}>
          <div className="yt-sidebar-header">
            <div>
              <span>{activeTab === 'chapters' ? 'Chapter Index' : activeTab === 'sync' ? 'Lesson Sync' : 'Lesson Playlist'}</span>
              <small>{videoList.length > 0 ? `${videoList.length} resources` : 'Scanning'}</small>
            </div>
          </div>

          <div className="yt-tabs relative">
            {(['chapters', 'playlist', 'sync'] as const).map(tabName => {
              const label = tabName === 'chapters' ? 'Chapters' : tabName === 'playlist' ? 'Up next' : 'Lesson sync';
              const Icon = tabName === 'chapters' ? BookOpen : tabName === 'playlist' ? ListVideo : Layers;
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  type="button"
                  onClick={() => setActiveTab(tabName)}
                  className={`yt-tab relative z-10 ${isActive ? 'yt-tab--active' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="smartboard-sidebar-active-tab"
                      className="absolute inset-0 rounded-lg bg-indigo-600 z-[-1] yt-tab-indicator-bg"
                      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                    />
                  )}
                  <Icon size={14} className="relative z-10" />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <div ref={sidebarListRef} className={`yt-sidebar__list custom-scrollbar ${activeTab === 'sync' ? 'yt-sidebar__list--sync' : ''}`}>
            {isLoadingVideos ? (
              <>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="yt-skeleton-card">
                    <div className="yt-skeleton-thumb" />
                    <div className="yt-skeleton-lines">
                      <div className="yt-skeleton-line" />
                      <div className="yt-skeleton-line yt-skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </>
            ) : activeTab === 'chapters' ? (
              isChaptersLoading ? (
                <div className="yt-loading">
                  <div className="yt-spinner" />
                  Loading chapters…
                </div>
              ) : chapters.length > 0 ? (
                chapters.map((ch, idx) => {
                  const isActive = idx === activeChapterIdx;
                  return (
                    <button
                      key={`${ch.startSecs}-${idx}`}
                      type="button"
                      onClick={() => seekPlayer(ch.startSecs)}
                      className={`yt-chapter-item ${isActive ? 'yt-chapter-item--active' : ''}`}
                    >
                      <span className="yt-chapter-time">{formatTime(ch.startSecs)}</span>
                      <div className="yt-chapter-content flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="yt-chapter-title truncate">{ch.title}</span>
                          {isActive && (
                            <div className="yt-mini-equalizer flex items-end gap-[1.5px] h-2.5 pb-[1px] shrink-0" aria-hidden>
                              <div className="w-[1.5px] h-full bg-[#10b981] animate-eq-bar-1 origin-bottom"></div>
                              <div className="w-[1.5px] h-full bg-[#10b981] animate-eq-bar-2 origin-bottom"></div>
                              <div className="w-[1.5px] h-full bg-[#10b981] animate-eq-bar-3 origin-bottom"></div>
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="yt-chapter-progress-bg">
                            <div className="yt-chapter-progress-fill" style={{ width: `${chapterProgress}%` }} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="yt-empty">No chapters in this video. Try another from Up next.</p>
              )
            ) : activeTab === 'playlist' ? (
              videoList.length > 0 ? (
                videoList.map((vid, idx) => {
                  const isActive = idx === currentIdx;
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`yt-list-item ${isActive ? 'yt-list-item--active' : ''}`}
                    >
                      <div className="yt-thumb">
                        <img src={getYouTubeThumbnail(vid.id, 'hq')} alt="" loading="lazy" />
                        <span className="yt-thumb__index">{idx + 1}</span>
                        {vid.durationFormatted ? (
                          <span className="yt-thumb__duration">{vid.durationFormatted}</span>
                        ) : null}
                      </div>
                      <div className="yt-list-info">
                        <div className="yt-list-title-wrap">
                          <p className="yt-list-title">{vid.title}</p>
                          {isActive && (
                            <div className="yt-now-playing-bars">
                              <span className="yt-bar"></span>
                              <span className="yt-bar"></span>
                              <span className="yt-bar"></span>
                            </div>
                          )}
                        </div>
                        <p className="yt-list-channel">{vid.channel || 'YouTube'}</p>
                        {vid.viewCount ? (
                          <p className="yt-list-views">{formatViewCount(vid.viewCount)}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="yt-empty">No verified videos yet. Generate whiteboard content to scout videos.</p>
              )
            ) : videoTimeline.length > 0 ? (
              videoTimeline.map((seg, idx) => {
                const isCorrectVideo = seg.videoId === currentVideo?.id;
                const isActive = isCorrectVideo && Math.abs(currentTime - seg.timestamp) < 30;
                return (
                  <button
                    key={seg.id || idx}
                    type="button"
                    onClick={() => handleJumpToSegment(seg.videoId, seg.timestamp)}
                    className={`yt-sync-item ${isActive ? 'yt-sync-item--active' : ''}`}
                  >
                    <div className={`yt-sync-timeline-dot ${isActive ? 'yt-sync-timeline-dot--active' : ''}`} />
                    <p className="yt-sync-label">{seg.label}</p>
                    <div className="yt-sync-meta-row">
                      <span className="yt-sync-time">{formatTime(seg.timestamp)}</span>
                      {seg.confidence !== undefined && (
                        <span className={`yt-confidence-badge yt-confidence-badge--${
                          seg.confidence >= 0.85 ? 'high' : seg.confidence >= 0.7 ? 'medium' : 'low'
                        }`}>
                          {Math.round(seg.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="yt-empty">
                Lesson sync appears after whiteboard content is generated. Open Whiteboard first, then return here.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Smartboard;
