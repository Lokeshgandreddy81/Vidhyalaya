import React, { useState, useRef, useEffect, useMemo } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import {
  Play, Clock, RefreshCcw,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle,
  Search, Menu, X,
} from 'lucide-react';
import { VideoSegment } from '../types';

import { getVideosByTopic, CuratedVideo } from '../services/videoLibrary';
import MermaidDiagram from './MermaidDiagram';
import { generateMermaidDiagram } from '../services/geminiService';

interface VideoEntry { id: string; title: string; channel?: string; durationMins?: number; searchText?: string; }
type SmartboardRailMode = 'long' | 'shorts';

interface WatchRecommendation {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  durationLabel: string;
  timestamp?: number;
  kind: 'video' | 'clip';
  searchText?: string;
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
}

const WATCH_PAGE_SIZE = 20;

const clipText = (value: string, maxLength: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
};

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

const mockUserInterests = ['Python', 'Django', 'MongoDB'];

const RecommendedVideos: React.FC<{ topic: string; onSelect: (video: CuratedVideo) => void; isZenMode?: boolean }> = ({ topic, onSelect, isZenMode }) => {
  const recommendations = React.useMemo(() => getVideosByTopic(topic, 4, mockUserInterests), [topic]);

  if (recommendations.length === 0) return null;

  return (
    <div className={`w-full mt-10 border-t pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>Recommended Supplementals</h3>
          <p className={`text-[11px] font-medium font-serif italic ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>Curated for your academic profile</p>
        </div>
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full ${isZenMode ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className={`text-[9px] font-black uppercase tracking-widest ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>Topic Lock Active</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map(video => (
          <button 
            key={video.id} 
            onClick={() => onSelect(video)}
            className={`group text-left rounded-[24px] overflow-hidden transition-all duration-500 hover:-translate-y-2 ${isZenMode ? 'bg-white/5 border border-white/5 hover:border-white/20 hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.1)]' : 'bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-[0_20px_40px_-20px_rgba(0,6,102,0.1)]'}`}
          >
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <img src={getYouTubeThumbnail(video.id)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
              <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[9px] font-black tracking-widest">
                {video.durationMins}:00
              </div>
            </div>
            <div className="p-5">
              <h4 className={`text-[13px] font-black leading-snug mb-2 line-clamp-2 transition-colors ${isZenMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-[#000666]'}`}>{video.title}</h4>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isZenMode ? 'bg-white/20' : 'bg-slate-200'}`} />
                <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>{video.channel}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return '8:00';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}:00`;
  }
  return `${minutes}:00`;
};

const normalizeTopic = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const cleanLearningText = (value: string) => value
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/[>*_~|]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const deriveTopicNotes = (content: string | null | undefined, activeLabel: string, moduleTitle: string) => {
  const safeContent = content || '';
  const lines = safeContent.split('\n');
  const headings = lines
    .map((line, index) => {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      return match ? { index, label: cleanLearningText(match[2]) } : null;
    })
    .filter((item): item is { index: number; label: string } => Boolean(item));

  const target = headings.find(item => {
    const normalizedHeading = normalizeTopic(item.label);
    const normalizedActive = normalizeTopic(activeLabel);
    return normalizedHeading.includes(normalizedActive) || normalizedActive.includes(normalizedHeading);
  });

  const start = target?.index ?? 0;
  const next = headings.find(item => item.index > start)?.index ?? Math.min(lines.length, start + 18);
  const source = cleanLearningText(lines.slice(start + (target ? 1 : 0), next).join(' '));
  const sentences = (source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 32)
    .slice(0, 4);

  if (sentences.length > 0) return sentences;

  return [
    `${activeLabel || moduleTitle} is the current learning checkpoint for this Smartboard moment.`,
    'Use the video as the example layer, then connect it back to the Whiteboard concept before moving ahead.',
    'If this moment feels unclear, jump to the matching item in the Mastery Log and rewatch that exact section.',
  ];
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
  isTheaterMode = false,
  boardControl,
  onOpenContents,
  focusMode = 'split',
  isZenMode = false,
  onVideoError,
  allowAutoplay = true,
}) => {
  const [isLogExpanded, setIsLogExpanded] = useState(true);
  const [logHeight, setLogHeight] = useState(450);
  const [isVerticalResizing, setIsVerticalResizing] = useState(false);
  const [smartSearch, setSmartSearch] = useState('');
  const [railMode, setRailMode] = useState<SmartboardRailMode>('long');
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [curatedVideos, setCuratedVideos] = useState<VideoEntry[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<VideoEntry[]>([]);
  const [transientVideo, setTransientVideo] = useState<VideoEntry | null>(null);
  const [boardView, setBoardView] = useState<'video' | 'diagram'>('video');
  const [diagramCode, setDiagramCode] = useState<string>('');
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const videoList: VideoEntry[] = React.useMemo(() => {
    const base = allVideoIds.length > 0 ? allVideoIds : [];
    const has = base.some(v => v.id === videoId);
    const list = has ? [...base, ...curatedVideos] : [{ id: videoId, title: moduleTitle }, ...base, ...curatedVideos];
    if (transientVideo && !list.some(video => video.id === transientVideo.id)) {
      list.push(transientVideo);
    }
    let filtered = list
      .filter(video => video && video.id && video.id.trim() !== '')
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
    
    if (filtered.length === 0 && libraryVideos.length > 0) {
      filtered = libraryVideos;
    }
    return filtered;
  }, [videoId, allVideoIds, moduleTitle, curatedVideos, transientVideo, libraryVideos]);

  useEffect(() => {
    let mounted = true;
    import('../services/videoLibrary').then(({ CURATED_VIDEO_LIBRARY, getVideosByTopic }) => {
      if (!mounted) return;
      setLibraryVideos(CURATED_VIDEO_LIBRARY.map(video => ({
        id: video.id,
        title: video.title,
        channel: video.channel,
        durationMins: video.durationMins,
        searchText: `${video.title} ${video.channel} ${video.tags.join(' ')}`,
      })));
      setCuratedVideos(getVideosByTopic(moduleTitle, 28, mockUserInterests).map(video => ({
        id: video.id,
        title: video.title,
        channel: video.channel,
        durationMins: video.durationMins,
        searchText: `${video.title} ${video.channel} ${video.tags.join(' ')}`,
      })));
    }).catch(() => {
      if (mounted) {
        setCuratedVideos([]);
        setLibraryVideos([]);
      }
    });
    return () => { mounted = false; };
  }, [moduleTitle]);

  // Handle Vertical Resizing
  const resizeRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVerticalResizing) return;
    
    const handleMove = (e: MouseEvent) => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      
      resizeRafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        // Keep within reasonable bounds (min 100, max container - video min)
        const safeHeight = Math.max(100, Math.min(newHeight, rect.height - 240));
        setLogHeight(safeHeight);
      });
    };

    const handleUp = () => {
      setIsVerticalResizing(false);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isVerticalResizing]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVideoVeiled, setIsVideoVeiled] = useState(true);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<{ segment: VideoSegment; timestamp: number } | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideo = videoList[currentIdx] ?? { id: videoId, title: moduleTitle };
  const isActuallyFailed = allFailed || videoList.length === 0 || !currentVideo || !currentVideo.id || currentVideo.id.trim() === '';

  // Enforce Topic Lock: reset state when module changes
  useEffect(() => {
    setCurrentIdx(0);
    setTransientVideo(null);
    setIsVideoVeiled(true);
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
  }, [moduleTitle, videoId]);

  const seekPlayer = (ts: number) => {
    if (!playerRef.current) return false;
    try {
      playerRef.current.seekTo(Math.max(0, ts - 2), true);
      playerRef.current.playVideo();
      return true;
    } catch (_) {
      return false;
    }
  };

  const syncActiveSegmentAtTime = () => {
    if (!playerRef.current || timeline.length === 0) return;
    try {
      const time = playerRef.current.getCurrentTime();
      const currentSeg = [...timeline].reverse().find(
        s => (!s.videoId || s.videoId === currentVideo.id) && s.timestamp <= time
      );

      if (currentSeg && currentSeg.id !== activeSegmentId) {
        setActiveSegmentId(currentSeg.id);
        onTimestampReached?.(currentSeg);
      }
    } catch (_) {}
  };

  // Auto-scroll playlist to active segment
  useEffect(() => {
    if (activeSegmentId && playlistRef.current) {
      const activeEl = playlistRef.current.querySelector(`[data-segment-id="${activeSegmentId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSegmentId]);

  useEffect(() => {
    setCurrentIdx(0);
    setAllFailed(false);
    setActiveSegmentId(null);
    setTransientVideo(null);
  }, [videoId]);

  useEffect(() => {
    if (!externalActiveId || externalActiveId === activeSegmentId) return;
    const seg = timeline.find(s => s.id === externalActiveId);
    if (seg) {
      setActiveSegmentId(seg.id);
      if (seg.videoId && seg.videoId !== currentVideo.id) {
        const idx = videoList.findIndex(v => v.id === seg.videoId);
        if (idx !== -1) {
          pendingSeekRef.current = { segment: seg, timestamp: seg.timestamp };
          setCurrentIdx(idx);
        }
        return;
      }
      seekPlayer(seg.timestamp);
    }
  }, [externalActiveId, currentVideo.id, videoList]);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    const pending = pendingSeekRef.current;
    if (pending) {
      pendingSeekRef.current = null;
      window.setTimeout(() => {
        try {
          event.target.seekTo(Math.max(0, pending.timestamp - 2), true);
          event.target.playVideo();
          setActiveSegmentId(pending.segment.id);
          onTimestampReached?.(pending.segment);
        } catch (_) {}
      }, 0);
    } else {
      // Only force play if allowAutoplay is true
      if (allowAutoplay) {
        try {
          event.target.playVideo();
        } catch (_) {}
      }
    }

    // Playback Guard: If video doesn't start playing in 3s, it might be restricted or stuck
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = setTimeout(() => {
      try {
        const state = event.target.getPlayerState();
        // Trigger error if state is Unstarted (-1), Cued (5) or stalled
        if (state !== 1 && state !== 2) { 
          handleError();
        }
      } catch (e) {
        handleError();
      }
    }, 3000);
  };

  const handleStateChange = (event: YouTubeEvent) => {
    const isNowPlaying = event.data === 1;
    setIsPlaying(isNowPlaying);
    
    if (isNowPlaying) { // Playing
      setIsVideoVeiled(false); // Lift the Nebula Cloak
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }
    syncActiveSegmentAtTime();
  };

  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;
    const intervalId = window.setInterval(syncActiveSegmentAtTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, timeline, currentVideo.id, activeSegmentId]);

  useEffect(() => {
    if (!transientVideo) return;
    const idx = videoList.findIndex(video => video.id === transientVideo.id);
    if (idx !== -1 && currentIdx !== idx) {
      setCurrentIdx(idx);
    }
  }, [transientVideo, videoList, currentIdx]);

  // Resume playback when allowAutoplay becomes true (e.g. loading finished)
  const prevAllowAutoplayRef = useRef(allowAutoplay);
  useEffect(() => {
    if (allowAutoplay && !prevAllowAutoplayRef.current && playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch (_) {}
    }
    prevAllowAutoplayRef.current = allowAutoplay;
  }, [allowAutoplay]);

  const handleError = () => {
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    // Maintain the cloak during transitions
    setIsVideoVeiled(true);
    // Instant skip for a snappier "Seamless" feel
    setTimeout(() => {
      if (currentIdx < videoList.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        setAllFailed(true);
        // Seamless fallback to Whiteboard
        onVideoError?.();
      }
    }, 100);
  };

  const seekTo = (ts: number) => {
    seekPlayer(ts);
  };

  const handleSegmentClick = (seg: VideoSegment, clipVideoId?: string, timestamp?: number) => {
    const targetVideoId = clipVideoId || seg.videoId || videoId;
    const targetTs = timestamp !== undefined ? timestamp : seg.timestamp;
    if (targetVideoId !== currentVideo.id) {
      const idx = videoList.findIndex(v => v.id === targetVideoId);
      if (idx !== -1) {
        pendingSeekRef.current = { segment: seg, timestamp: targetTs };
        setCurrentIdx(idx);
      } else {
        pendingSeekRef.current = { segment: seg, timestamp: targetTs };
        setTransientVideo({ id: targetVideoId, title: seg.label || moduleTitle });
        setCurrentIdx(transientVideo ? Math.max(0, videoList.length - 1) : videoList.length);
      }
      setActiveSegmentId(seg.id);
      onTimestampReached?.(seg);
      return;
    }
    setActiveSegmentId(seg.id);
    onTimestampReached?.(seg);
    seekTo(targetTs);
  };

  const handleReSync = async () => {
    setIsSyncing(true);
    setAllFailed(false);
    setCurrentIdx(0);
    try {
      await onReSync?.();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleGlobalJump = (e: any) => {
      const { timestamp } = e.detail;
      if (timestamp !== undefined) {
        seekTo(timestamp);
      }
    };
    window.addEventListener('smartboard-jump', handleGlobalJump);
    return () => window.removeEventListener('smartboard-jump', handleGlobalJump);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const finderStageStyle: React.CSSProperties = {
    width: '100%',
  };

  const visibleActiveSegment = React.useMemo(() => {
    return timeline.find(segment => segment.id === activeSegmentId)
      || timeline.find(segment => segment.id === externalActiveId)
      || timeline[0];
  }, [timeline, activeSegmentId, externalActiveId]);

  const topicNotes = React.useMemo(
    () => deriveTopicNotes(moduleContent, visibleActiveSegment?.label || moduleTitle, moduleTitle),
    [moduleContent, visibleActiveSegment?.label, moduleTitle]
  );

  const upcomingSegments = React.useMemo(() => {
    if (!visibleActiveSegment) return timeline.slice(0, 4);
    const activeIndex = timeline.findIndex(segment => segment.id === visibleActiveSegment.id);
    return timeline.slice(Math.max(0, activeIndex + 1), activeIndex + 4);
  }, [timeline, visibleActiveSegment]);

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
      disablekb: 0,
      playsinline: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };

  const recommendations = useMemo<WatchRecommendation[]>(() => {
    const videoItems: WatchRecommendation[] = videoList.map((video, index) => ({
      id: `video-${video.id}-${index}`,
      videoId: video.id,
      title: video.title || moduleTitle,
      channel: video.channel || (index === 0 ? 'Current Smartboard Source' : 'Vidyalaya Library'),
      durationLabel: formatDuration(video.durationMins),
      kind: 'video' as const,
      searchText: video.searchText || `${video.title} ${video.channel || ''}`,
    }));

    const clipItems: WatchRecommendation[] = timeline.map((segment, index) => ({
      id: `clip-${segment.id}-${index}`,
      videoId: segment.videoId || currentVideo.id,
      title: segment.label,
      channel: 'Timestamp checkpoint',
      durationLabel: formatTime(segment.timestamp),
      timestamp: segment.timestamp,
      kind: 'clip' as const,
    }));

    const merged = [...videoItems, ...clipItems].filter((item, index, arr) =>
      arr.findIndex(match => match.videoId === item.videoId && match.title === item.title && match.timestamp === item.timestamp) === index
    );

    if (merged.length >= WATCH_PAGE_SIZE) return merged;

    const filler = Array.from({ length: WATCH_PAGE_SIZE - merged.length }, (_, index) => {
      const segment = timeline[index % Math.max(1, timeline.length)];
      const label = segment?.label || moduleTitle;
      return {
        id: `fallback-${index}-${currentVideo.id}`,
        videoId: currentVideo.id,
        title: `${label} — focused review`,
        channel: 'Vidyalaya generated checkpoint',
        durationLabel: segment ? formatTime(segment.timestamp) : '4:00',
        timestamp: segment?.timestamp,
        kind: 'clip' as const,
      };
    });

    return [...merged, ...filler];
  }, [videoList, timeline, currentVideo.id, moduleTitle]);

  const shortRecommendations = useMemo<WatchRecommendation[]>(() => {
    const shortVideoItems: WatchRecommendation[] = videoList
      .filter((video) => {
        const title = video.title.toLowerCase();
        return (video.durationMins !== undefined && video.durationMins <= 3)
          || /100 seconds|shorts?|quick/i.test(title);
      })
      .map((video, index) => ({
        id: `short-video-${video.id}-${index}`,
        videoId: video.id,
        title: video.title || moduleTitle,
        channel: video.channel || 'Short video',
        durationLabel: formatDuration(video.durationMins),
        kind: 'video' as const,
      }));

    const source = timeline.length > 0 ? timeline : [
      { id: 'intro', label: moduleTitle, timestamp: 0, confidence: 0.4 },
      { id: 'anchor', label: 'Core idea checkpoint', timestamp: 60, confidence: 0.4 },
      { id: 'review', label: 'Fast review moment', timestamp: 120, confidence: 0.4 },
    ];

    const timestampClips: WatchRecommendation[] = source.flatMap((segment, index) => [
      {
        id: `short-${segment.id}-a`,
        videoId: segment.videoId || currentVideo.id,
        title: clipText(segment.label, 66),
        channel: 'Short concept cut',
        durationLabel: formatTime(segment.timestamp),
        timestamp: segment.timestamp,
        kind: 'clip' as const,
      },
      {
        id: `short-${segment.id}-b-${index}`,
        videoId: segment.videoId || currentVideo.id,
        title: `${clipText(segment.label, 50)} — quick replay`,
        channel: '60-second rewind',
        durationLabel: formatTime(Math.max(0, segment.timestamp + 25)),
        timestamp: Math.max(0, segment.timestamp + 25),
        kind: 'clip' as const,
      },
    ]);

    return [...shortVideoItems, ...timestampClips].slice(0, WATCH_PAGE_SIZE);
  }, [videoList, timeline, currentVideo.id, moduleTitle]);

  const globalSearchResults = useMemo<WatchRecommendation[]>(() => {
    const query = normalizeTopic(smartSearch);
    if (!query) return [];
    const terms = query.split(' ').filter(term => term.length > 1);
    const lessonItems = [...recommendations, ...shortRecommendations];
    const libraryItems: WatchRecommendation[] = libraryVideos.map((video, index) => ({
      id: `library-${video.id}-${index}`,
      videoId: video.id,
      title: video.title,
      channel: video.channel || 'Vidyalaya Library',
      durationLabel: formatDuration(video.durationMins),
      kind: 'video' as const,
      searchText: video.searchText || `${video.title} ${video.channel || ''}`,
    }));

    const scored = [...lessonItems, ...libraryItems]
      .filter((item, index, arr) =>
        arr.findIndex(match => match.videoId === item.videoId && match.title === item.title && match.timestamp === item.timestamp) === index
      )
      .map(item => {
        const haystack = normalizeTopic(`${item.title} ${item.channel} ${item.searchText || ''}`);
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { item, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length);

    return scored.map(result => result.item);
  }, [libraryVideos, recommendations, shortRecommendations, smartSearch]);

  const activeRailItems = smartSearch.trim() ? globalSearchResults : railMode === 'shorts' ? shortRecommendations : recommendations;
  const filteredRailItems = activeRailItems.filter(item => {
    const query = smartSearch.trim().toLowerCase();
    if (globalSearchResults.length > 0) return true;
    if (!query) return true;
    return `${item.title} ${item.channel} ${item.searchText || ''}`.toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(filteredRailItems.length / WATCH_PAGE_SIZE));
  const safeRecommendationPage = Math.min(recommendationPage, pageCount - 1);
  const visibleRailItems = filteredRailItems.slice(
    safeRecommendationPage * WATCH_PAGE_SIZE,
    safeRecommendationPage * WATCH_PAGE_SIZE + WATCH_PAGE_SIZE
  );
  const horizontalRecommendationItems = recommendations
    .filter(item => item.kind === 'video')
    .slice(0, 10);

  useEffect(() => {
    setRecommendationPage(0);
  }, [smartSearch, railMode, currentVideo.id]);

  const handleWatchItem = (item: WatchRecommendation) => {
    const segment = item.timestamp !== undefined
      ? timeline.find(candidate => candidate.timestamp === item.timestamp && (candidate.videoId || currentVideo.id) === item.videoId) || {
          id: item.id,
          label: item.title,
          timestamp: item.timestamp,
          videoId: item.videoId,
          confidence: 0.5,
        }
      : null;

    if (segment) {
      handleSegmentClick(segment, item.videoId, item.timestamp);
      return;
    }

    const index = videoList.findIndex(video => video.id === item.videoId);
    if (index !== -1) {
      const segment = {
        id: item.id,
        label: item.title,
        timestamp: 0,
        videoId: item.videoId,
        confidence: 0.5,
      };
      if (item.videoId !== currentVideo.id) {
        pendingSeekRef.current = { segment, timestamp: 0 };
        setCurrentIdx(index);
      } else {
        setActiveSegmentId(null);
        seekPlayer(0);
      }
      return;
    }

    if (item.kind === 'video') {
      const segment = {
        id: item.id,
        label: item.title,
        timestamp: 0,
        videoId: item.videoId,
        confidence: 0.5,
      };
      pendingSeekRef.current = { segment, timestamp: 0 };
      setActiveSegmentId(null);
      setTransientVideo({ id: item.videoId, title: item.title, channel: item.channel });
    }
  };

  if (isTheaterMode) {
    return (
      <div
        ref={containerRef}
        id="smartboard-container"
        className={`flex h-full min-h-0 flex-col overflow-hidden transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a] text-white' : 'bg-white text-slate-950'}`}
      >
        <header className={`relative z-40 flex h-[52px] shrink-0 items-center justify-center border-b transition-all duration-700 px-5 ${isZenMode ? 'bg-[#05070a]/50 border-white/5 backdrop-blur-md' : 'border-slate-200/70 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]'}`}>
          <div className="absolute left-5 top-1/2 flex min-w-0 -translate-y-1/2 items-center gap-2.5">
            <button
              onClick={onOpenContents}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${isZenMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-[#000666]'}`}
              title="Open course contents"
            >
              <Menu size={18} strokeWidth={2.4} />
            </button>
            <div className="flex items-center min-w-0">
               <div>
                  <p className={`text-[9px] font-black uppercase tracking-[0.24em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>Smartboard</p>
                  <p className={`mt-0.5 text-[7px] font-black uppercase tracking-[0.3em] ${isZenMode ? 'text-slate-600' : 'text-slate-300'}`}>Vidhyalaya</p>
               </div>
               {boardControl}
            </div>
          </div>

          <label className={`hidden h-10 w-[min(520px,38vw)] items-center gap-3 rounded-full border px-5 transition-all lg:flex group/search ${isZenMode ? 'bg-white/5 border-white/10 focus-within:bg-white/10 focus-within:ring-white/5' : 'border-slate-200 bg-slate-50/30 focus-within:bg-white focus-within:ring-indigo-50'}`}>
            <Search size={14} className={`shrink-0 transition-colors ${isZenMode ? 'text-slate-600 group-focus-within/search:text-indigo-400' : 'text-slate-400 group-focus-within/search:text-[#000666]'}`} />
            <input
              value={smartSearch}
              onChange={event => setSmartSearch(event.target.value)}
              className={`min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none ${isZenMode ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
              placeholder="Search concepts or videos..."
            />
            {smartSearch && (
              <button
                onClick={() => setSmartSearch('')}
                className="text-slate-300 transition-colors hover:text-slate-800"
                type="button"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className={`flex rounded-full p-1 mx-4 ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>
            <button
              onClick={() => setBoardView('video')}
              className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${boardView === 'video' ? (isZenMode ? 'bg-white text-[#05070a] shadow-lg' : 'bg-white text-[#000666] shadow-sm') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700')}`}
            >
              Feed
            </button>
            <button
              onClick={async () => {
                setBoardView('diagram');
                if (!diagramCode && !isGeneratingDiagram) {
                  setIsGeneratingDiagram(true);
                  try {
                    const code = await generateMermaidDiagram(moduleTitle, [], 'flowchart TD', 'Core concepts and their relationships');
                    setDiagramCode(code);
                  } catch (e) {
                    console.error("Failed to generate diagram", e);
                  } finally {
                    setIsGeneratingDiagram(false);
                  }
                }
              }}
              className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${boardView === 'diagram' ? (isZenMode ? 'bg-white text-[#05070a] shadow-lg' : 'bg-white text-[#000666] shadow-sm') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700')}`}
            >
              {isGeneratingDiagram ? 'Mapping...' : 'Neural Map'}
            </button>
          </div>

          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 shrink-0 items-center gap-2">
            <button
              onClick={handleReSync}
              disabled={isSyncing}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-50 ${isZenMode ? 'bg-white/10 text-white hover:bg-white hover:text-[#05070a]' : 'bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white'}`}
              title="Resync timeline"
            >
              <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 custom-scrollbar transition-colors duration-1000 ${isZenMode ? 'bg-[#05070a]' : 'bg-white'}`}>
          <div className={`mx-auto grid w-full gap-6 transition-all duration-1000 ${isZenMode ? 'max-w-[900px] xl:grid-cols-1' : 'max-w-[1780px] xl:grid-cols-[minmax(0,1fr)_430px]'}`}>
            <section className="min-w-0">
              <div className={`overflow-hidden rounded-[22px] transition-all duration-1000 border border-white/10 ${isZenMode ? 'bg-black shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9),0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-white/5' : 'bg-black shadow-[0_20px_55px_-35px_rgba(15,23,42,0.8)]'}`}>
                <div className="relative isolate aspect-video w-full bg-black">
                  {boardView === 'diagram' ? (
                    <div className={`absolute inset-0 z-10 flex items-center justify-center ${isZenMode ? 'bg-[#05070a]/90' : 'bg-slate-50'}`}>
                      {isGeneratingDiagram ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] border border-white/10 flex items-center justify-center animate-pulse bg-indigo-500/10">
                            <RefreshCcw size={20} className="text-indigo-400 animate-spin" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesizing Visuals</span>
                        </div>
                      ) : diagramCode ? (
                        <MermaidDiagram chart={diagramCode} activeConcept={visibleActiveSegment?.label} isZenMode={isZenMode} />
                      ) : (
                        <div className="text-slate-500 text-sm">Diagram not available.</div>
                      )}
                    </div>
                  ) : !isActuallyFailed ? (
                    <YouTube
                      key={currentVideo.id}
                      videoId={currentVideo.id}
                      opts={ytOpts}
                      host="https://www.youtube-nocookie.com"
                      onReady={handleReady}
                      onStateChange={handleStateChange}
                      onError={handleError}
                      className="absolute inset-0 z-0 h-full w-full"
                      iframeClassName="h-full w-full border-0"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                         <AlertTriangle size={28} className="text-amber-500 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.1em]">Feed Restricted</h3>
                      <p className="mt-2 max-w-md text-sm font-medium text-slate-500">Try resyncing the lesson to find another embeddable learning source.</p>
                      <button
                        onClick={handleReSync}
                        disabled={isSyncing}
                        className="mt-6 rounded-full bg-[#000666] px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-50 hover:scale-105 transition-all"
                      >
                        {isSyncing ? 'Scouting Web...' : 'Re-scout source'}
                      </button>
                    </div>
                  )}

                  {/* ── THE NEBULA CLOAK ── */}
                  {!isActuallyFailed && isVideoVeiled && (
                    <div 
                      onClick={() => {
                        try { playerRef.current?.playVideo(); } catch(e) {}
                      }}
                      className={`absolute inset-0 z-[20] flex flex-col items-center justify-center backdrop-blur-3xl transition-all duration-1000 cursor-pointer ${isZenMode ? 'bg-[#05070a]/95' : 'bg-white/95'}`}
                    >
                       <div className="relative">
                          <div className={`w-20 h-20 rounded-[30px] border flex items-center justify-center animate-pulse ${isZenMode ? 'bg-indigo-500/10 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-[spin_4s_linear_infinite] rounded-[30px]" />
                             <RefreshCcw size={28} className="text-indigo-400 animate-spin" />
                          </div>
                          <div className="absolute -inset-6 border border-dashed border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                       </div>
                       <div className="mt-10 space-y-2 text-center">
                          <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isZenMode ? 'text-indigo-400' : 'text-[#000666]'}`}>Establishing Visual Feed</h4>
                          <p className={`text-[12px] font-medium font-serif italic ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>Click to initiate stream if stalled...</p>
                       </div>
                    </div>
                  )}
                  {boardView === 'video' && !isActuallyFailed && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-0 left-0 z-[80] h-[96px] w-[118px] rounded-tr-[26px] bg-gradient-to-tr from-black via-black/95 to-transparent shadow-[16px_-16px_38px_rgba(0,0,0,0.28)]"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h1 className={`text-[22px] font-black leading-tight tracking-tight md:text-[28px] transition-colors ${isZenMode ? 'text-white' : 'text-slate-950'}`}>
                  {currentVideo.title || moduleTitle}
                </h1>
              </div>

              <RecommendedVideos topic={moduleTitle} onSelect={(video) => {
                setTransientVideo({ id: video.id, title: video.title, channel: video.channel });
              }} isZenMode={isZenMode} />

              {horizontalRecommendationItems.length > 0 && !isZenMode && (
                <section className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#000666]">Recommended Videos</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">Quick picks for this Smartboard.</p>
                    </div>
                    <span className="hidden text-[9px] font-black uppercase tracking-[0.24em] text-slate-300 sm:inline">
                      Swipe sideways
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar">
                    {horizontalRecommendationItems.map(item => {
                      const isActive = item.videoId === currentVideo.id;
                      return (
                        <button
                          key={`horizontal-${item.id}`}
                          onClick={() => handleWatchItem(item)}
                          className={`group w-[210px] shrink-0 rounded-[20px] border bg-white p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-38px_rgba(0,6,102,0.72)] ${
                            isActive ? 'border-[#000666]/35 bg-[#f7f8ff]' : 'border-slate-200 hover:border-[#000666]/20'
                          }`}
                        >
                          <div className="relative aspect-video overflow-hidden rounded-[15px] bg-slate-100">
                            <img
                              src={getYouTubeThumbnail(item.videoId)}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-transparent" />
                            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-white">
                              {item.durationLabel}
                            </span>
                            <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-[#000666] shadow-sm">
                              <Play size={12} fill="currentColor" />
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[12px] font-black leading-snug text-slate-950">
                            {clipText(item.title, 58)}
                          </p>
                          <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{item.channel}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

            </section>

            {!isZenMode && (
              <aside className="min-w-0 xl:sticky xl:top-0 xl:max-h-[calc(100vh-96px)] xl:overflow-y-auto xl:pr-1 custom-scrollbar">
              <div className={`rounded-[32px] border p-4 transition-all duration-1000 ${isZenMode ? 'bg-white/5 border-white/5 shadow-2xl backdrop-blur-xl' : 'border-slate-200 bg-white shadow-[0_16px_42px_-34px_rgba(15,23,42,0.55)]'}`}>
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${isZenMode ? 'text-indigo-400' : 'text-slate-950'}`}>Related Videos</p>
                  </div>
                  <div className={`flex rounded-full p-1 ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                    {[
                      { id: 'long' as const, label: 'Long' },
                      { id: 'shorts' as const, label: 'Shorts' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setRailMode(mode.id)}
                        className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                          railMode === mode.id ? (isZenMode ? 'bg-white text-[#05070a] shadow-lg' : 'bg-white text-[#000666] shadow-sm') : (isZenMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700')
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {railMode === 'shorts' ? (
                  <>
                    <div className="space-y-2">
                      {visibleRailItems.map((item) => {
                        const isActive = item.videoId === currentVideo.id && (!item.timestamp || item.timestamp === visibleActiveSegment?.timestamp);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleWatchItem(item)}
                            className={`group flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition-all ${
                              isActive
                                ? 'border-[#000666]/20 bg-indigo-50/70 text-slate-950'
                                : 'border-transparent hover:border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <div className="relative h-[76px] w-[54px] shrink-0 overflow-hidden rounded-xl bg-slate-950 shadow-sm">
                              <img src={getYouTubeThumbnail(item.videoId)} alt="" className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/10" />
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/92 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-[#000666]">
                                Short
                              </span>
                              <span className="absolute bottom-1.5 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-white/92 text-[#000666] shadow">
                                <Play size={11} fill="currentColor" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[13px] font-black leading-snug text-slate-900">
                                {clipText(item.title, 74)}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                  {item.durationLabel}
                                </span>
                                {item.kind === 'clip' && (
                                  <span className="truncate text-[9px] font-bold text-slate-400">Checkpoint</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {pageCount > 1 && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <button
                          onClick={() => setRecommendationPage(page => Math.max(0, page - 1))}
                          disabled={safeRecommendationPage === 0}
                          className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-35"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setRecommendationPage(page => Math.min(pageCount - 1, page + 1))}
                          disabled={safeRecommendationPage >= pageCount - 1}
                          className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-35"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      {visibleRailItems.map((item) => {
                        const isActive = item.videoId === currentVideo.id && (!item.timestamp || item.timestamp === visibleActiveSegment?.timestamp);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleWatchItem(item)}
                            className={`group flex w-full gap-3 rounded-xl p-2 text-left transition-all ${
                              isActive ? 'bg-[#dcebe6] text-slate-950' : 'hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="relative h-[74px] w-[132px] shrink-0 overflow-hidden rounded-xl bg-slate-200">
                              <img src={getYouTubeThumbnail(item.videoId)} alt="" className="h-full w-full object-cover" loading="lazy" />
                              {isActive && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]">
                                  <Play size={17} fill="currentColor" />
                                </span>
                              )}
                              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-white">
                                {item.durationLabel}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 py-0.5">
                              <h3 className="line-clamp-2 min-w-0 text-[14px] font-black leading-snug text-slate-950">
                                {clipText(item.title, 82)}
                              </h3>
                              <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">{item.channel}</p>
                              {item.kind === 'clip' && (
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Jump checkpoint</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {visibleRailItems.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000666]">No matches yet</p>
                        <p className="mx-auto mt-2 max-w-[250px] text-[12px] font-semibold leading-relaxed text-slate-400">
                          Try a broader concept, tool name, or topic from this lesson.
                        </p>
                      </div>
                    )}

                    {pageCount > 1 && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <button
                          onClick={() => setRecommendationPage(page => Math.max(0, page - 1))}
                          disabled={safeRecommendationPage === 0}
                          className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-35"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setRecommendationPage(page => Math.min(pageCount - 1, page + 1))}
                          disabled={safeRecommendationPage >= pageCount - 1}
                          className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-35"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </aside>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="smartboard-container"
      className={`flex flex-col h-full overflow-hidden relative ${isTheaterMode || focusMode === 'content' ? 'bg-white' : 'bg-[#fcfcfd]'}`}
    >
      {/* ── DRAG SHIELD (Full Viewport Overlay) ── */}
      {isVerticalResizing && (
        <div className="fixed inset-0 z-[9999] cursor-row-resize select-none bg-transparent" />
      )}

      {/* ── UNIFIED SYSTEM FRAME ── */}
      {(() => {
        const isCleanMode = isTheaterMode || focusMode === 'content';
        return (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Main Workspace: Cinematic Studio Well */}
        <div className={`flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-stretch justify-start bg-white border-b border-slate-200/70`}>
          {/* AMBIENT LIGHT SPILL (SUBTLE GLOW) */}
          <div className={`absolute inset-0 blur-[120px] pointer-events-none ${isCleanMode ? 'bg-sky-200/25' : 'bg-indigo-500/5'}`} />

          {/* THE PRO MONITOR ASSEMBLY */}
          <div
            className={`relative w-full ${isCleanMode ? 'max-w-[1400px] mx-auto' : 'max-w-full'} px-4 lg:px-12 pt-6 shrink-0 pb-2`}
            style={finderStageStyle}
          >
            {/* BEZEL (CLEAN WHITE FRAME) */}
            <div className="relative border w-full overflow-hidden rounded-[24px] border-slate-200 bg-white shadow-[0_4px_32px_-8px_rgba(15,23,42,0.12)]">
              
              {/* VIDEO INSET WELL */}
              <div className="relative isolate overflow-hidden bg-black w-full rounded-[20px] aspect-video">
                
                {/* HIGH-END GLASS SHEEN */}
                <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-tr from-white/0 via-white/[0.04] to-white/0 opacity-40" />

                {!isActuallyFailed ? (
                  <YouTube
                    key={currentVideo.id}
                    videoId={currentVideo.id}
                    opts={ytOpts}
                    host="https://www.youtube-nocookie.com"
                    onReady={handleReady}
                    onStateChange={(e) => {
                      handleStateChange(e);
                      if (e.data === 1) setIsVideoVeiled(false);
                    }}
                    onError={handleError}
                    className="relative z-0 h-full w-full scale-[1.005]" // Subtle overscan for seamless fit
                    iframeClassName="w-full h-full border-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : null}

                {/* ── THE NEBULA CLOAK (ZEN MODE) ── */}
                {!isActuallyFailed && isVideoVeiled && (
                    <div 
                      onClick={() => {
                        try { playerRef.current?.playVideo(); } catch(e) {}
                      }}
                      className="absolute inset-0 z-[30] flex flex-col items-center justify-center backdrop-blur-[60px] bg-[#05070a]/90 transition-all duration-1000 cursor-pointer"
                    >
                       <div className="relative">
                          <div className="w-24 h-24 rounded-[36px] border border-white/10 flex items-center justify-center animate-pulse bg-indigo-500/5">
                             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-transparent animate-[spin_3s_linear_infinite] rounded-[36px]" />
                             <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]" />
                          </div>
                          <div className="absolute -inset-8 border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite]" />
                       </div>
                       <div className="mt-12 space-y-3 text-center">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400">Zen Feed Initializing</h4>
                          <p className="text-[13px] font-medium font-serif italic text-slate-500">Establishing deep focus link... (Click to force)</p>
                       </div>
                    </div>
                  )}
                {isActuallyFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                      <AlertTriangle size={28} className="text-amber-500 animate-pulse" />
                    </div>
                    <h3 className="text-slate-900 text-[14px] font-black uppercase tracking-[0.2em] mb-3">Feed Restricted</h3>
                    <p className="text-slate-500 text-[11px] mb-6 max-w-[240px] leading-relaxed">The video source is restricted or unavailable. Please scout for a new source.</p>
                    <button onClick={handleReSync} disabled={isSyncing}
                      className="px-8 py-3 bg-[#000666] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                      {isSyncing ? 'Scouting Web...' : 'Re-Scout Source'}
                    </button>
                  </div>
                )}
                {!isActuallyFailed && (
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 z-[80] h-[96px] w-[118px] rounded-tr-[26px] bg-gradient-to-tr from-black via-black/95 to-transparent shadow-[16px_-16px_38px_rgba(0,0,0,0.28)]"
                  />
                )}

                {/* Floating Contextual Controls */}
                <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xl px-2.5 py-2 rounded-2xl border border-white/10 shadow-2xl opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    {videoList.length > 1 && (
                      <>
                        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                          className="text-white/70 hover:text-white disabled:opacity-20 transition-all">
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] text-white font-black tabular-nums mx-1">{currentIdx + 1}/{videoList.length}</span>
                        <button onClick={() => setCurrentIdx(i => Math.min(videoList.length - 1, i + 1))} disabled={currentIdx === videoList.length - 1}
                          className="text-white/70 hover:text-white disabled:opacity-20 transition-all">
                          <ChevronRight size={14} />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-2" />
                      </>
                    )}
                    <button onClick={handleReSync} disabled={isSyncing}
                      className="text-white/70 hover:text-white transition-all">
                      <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>

              {/* TECHNICAL DETAILS (POWER LED) */}
              {!isTheaterMode && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-40">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <div className="text-[6px] font-black text-white/30 uppercase tracking-[0.3em]">Smartboard Studio 8K</div>
                </div>
              )}
            </div>
          </div>

          {/* RECOMMENDED VIDEOS RAIL */}
          <div className="px-4 lg:px-12 pb-8 shrink-0 w-full max-w-full">
            <RecommendedVideos 
              topic={moduleTitle} 
              onSelect={(video) => {
                const existingIdx = videoList.findIndex(v => v.id === video.id);
                if (existingIdx !== -1) {
                  setCurrentIdx(existingIdx);
                } else {
                  setTransientVideo({ id: video.id, title: video.title, channel: video.channel, durationMins: video.durationMins });
                }
              }} 
            />
          </div>
        </div>
      </div>
      );})()}
    </div>
  );
};

export default Smartboard;
