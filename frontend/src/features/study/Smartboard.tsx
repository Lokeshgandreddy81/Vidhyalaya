import React, { useState, useRef, useEffect, useMemo } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import {
  Play, Clock, RefreshCcw,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle,
  Search, Menu, X, Activity, Sparkles, Zap, Brain
} from 'lucide-react';
import { VideoSegment, SmartboardJumpEventDetail } from '../../types';

import { getVideosByTopic, CuratedVideo, CURATED_VIDEO_LIBRARY } from '../../services/videoLibrary';
import MermaidDiagram from '../../components/ui/MermaidDiagram';
import { generateMermaidDiagram } from '../../services/geminiService';

interface VideoEntry { id: string; title: string; channel?: string; durationMins?: number; searchText?: string; }
type SmartboardRailMode = 'long' | 'shorts';
type SmartboardLens = 'standard' | 'skeptic' | 'strategist';

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
  boardControl?: React.ReactNode;
  onOpenContents?: () => void;
  focusMode?: 'content' | 'split';
  isZenMode?: boolean;
  onVideoError?: () => void;
  allowAutoplay?: boolean;
  complexity?: string;
}

const WATCH_PAGE_SIZE = 20;

const clipText = (value: string, maxLength: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
};

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

const mockUserInterests = ['Python', 'Django', 'MongoDB'];

const RecommendedVideos: React.FC<{ 
  topic: string; 
  searchQuery?: string;
  onSelect: (video: CuratedVideo) => void; 
  isZenMode?: boolean; 
  complexity?: string;
  currentVideoId?: string;
}> = ({ topic, searchQuery, onSelect, isZenMode, complexity, currentVideoId }) => {
  const [isSyncLocked, setIsSyncLocked] = React.useState(true);
  const query = (isSyncLocked && searchQuery && searchQuery.trim() !== '') ? searchQuery : topic;
  const recommendations = React.useMemo(() => {
    let results = getVideosByTopic(query, 5, mockUserInterests, complexity);
    if (currentVideoId) {
      results = results.filter(v => v.id !== currentVideoId);
    }
    return results.slice(0, 4);
  }, [query, complexity, currentVideoId]);

  const calculateMetrics = (video: CuratedVideo) => {
    if (!video || !query) return { coverage: 75, matchScore: 85 };
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const videoTags = (video.tags || []).map(t => t?.toLowerCase() || "");
    const intersection = queryWords.filter(w => videoTags.some(t => t && (t.includes(w) || w.includes(t))));
    const coverage = Math.min(98, Math.max(75, 75 + (intersection.length * 8)));
    const matchScore = Math.min(99, Math.max(88, 85 + (intersection.length * 5)));
    return { coverage, matchScore };
  };

  if (recommendations.length === 0) return null;

  return (
    <div className={`w-full mt-10 border-t pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Recommended Supplementals</h3>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
             <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500/80">Double Intensity Accuracy Active</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsSyncLocked(!isSyncLocked)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isSyncLocked ? (isZenMode ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600') : 'bg-transparent border-white/10 text-slate-500'}`}
           >
              <div className={`w-1 h-1 rounded-full ${isSyncLocked ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[7px] font-black uppercase tracking-widest">Playback Sync {isSyncLocked ? 'Active' : 'Paused'}</span>
           </button>
           <div className="w-px h-6 bg-white/10 mx-1" />
           <span className={`text-[9px] font-black uppercase tracking-widest ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>Topic Lock Active</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map(video => {
          if (!video) return null;
          const { coverage, matchScore } = calculateMetrics(video);
          return (
          <button 
            key={video.id} 
            onClick={() => onSelect(video)}
            className={`group text-left rounded-[24px] overflow-hidden transition-all duration-500 hover:-translate-y-2 ${isZenMode ? 'bg-white/5 border border-white/5 hover:border-white/20 hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.1)]' : 'bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-[0_20px_40px_-20px_rgba(78, 91, 255,0.1)]'}`}
          >
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <img src={getYouTubeThumbnail(video.id)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
              <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[9px] font-black tracking-widest">
                {video.durationMins}:00
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-1.5 group/match relative">
                    <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] ${matchScore > 94 ? 'animate-pulse' : ''}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 cursor-help">{matchScore}% Match</span>
                    <div className="absolute top-6 left-0 w-32 p-2 bg-[#05070a]/95 backdrop-blur-xl border border-white/10 rounded-lg opacity-0 group-hover/match:opacity-100 transition-opacity z-[130] pointer-events-none shadow-2xl">
                       <p className="text-[6px] font-black uppercase tracking-widest text-slate-500 mb-1">Semantic Overlap</p>
                       <div className="flex flex-wrap gap-1">
                          {(query || '').toLowerCase().split(/\s+/).filter(w => w.length > 2 && (video.tags || []).some(t => t && t.includes(w))).map(w => (
                            <span key={w} className="text-[6px] text-emerald-400 font-bold">{w}</span>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col items-end gap-1.5">
                    {video.alignment && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                         <span className="text-[6px] font-black uppercase tracking-widest text-emerald-500">Aligned: {video.alignment}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                       {video.voiceType && (
                          <div className={`px-1.5 py-0.5 rounded-md border text-[6px] font-black uppercase tracking-widest ${video.voiceType === 'theoretical' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                             {video.voiceType}
                          </div>
                       )}
                       {complexity && (
                         <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                            <div className="w-1 h-1 rounded-full bg-indigo-400" />
                            <span className="text-[6px] font-black uppercase tracking-widest text-indigo-400">Depth Locked</span>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              <h4 className={`text-[13px] font-black leading-snug mb-3 line-clamp-2 transition-colors ${isZenMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-[#4e5bff]'}`}>{video.title}</h4>
              
              <div className={`mb-4 p-2 rounded-xl border border-dashed transition-all group-hover:border-indigo-500/30 ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                 <p className="text-[9px] font-medium leading-relaxed italic text-slate-500">
                    "Accuracy analysis confirms this {video.alignment ? video.alignment + ' aligned' : ''} resource {video.difficulty ? `(Difficulty: ${video.difficulty}/10)` : ''} as a high-fidelity match for '{query}'."
                 </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                 {(video?.tags || []).slice(0, 3).map(tag => (
                   <span key={tag} className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${isZenMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-100 text-slate-500'}`}>
                      {tag}
                   </span>
                 ))}
              </div>

              <div className="mb-4 space-y-1.5">
                 <div className="flex items-center justify-between">
                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Predictive Heatmap</span>
                    <span className="text-[7px] font-black text-indigo-500">Neural Preview</span>
                 </div>
                 <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex gap-[1px]">
                    {[...Array(12)].map((_, idx) => (
                       <div key={idx} className="h-full flex-1 bg-indigo-500" style={{ opacity: 0.3 + (Math.random() * 0.7) }} />
                    ))}
                 </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${['3Blue1Brown', 'MIT OpenCourseWare', 'Computerphile'].includes(video.channel) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : (isZenMode ? 'bg-white/20' : 'bg-slate-200')}`} />
                  <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>{video.channel}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-1 hover:bg-white/10 rounded transition-colors" title="Accurate Match">
                      <div className="w-2.5 h-2.5 border-b border-r border-slate-400 rotate-45 -translate-y-0.5" style={{ borderLeftWidth: 0, borderTopWidth: 0, width: 6, height: 10, borderBottomWidth: 2, borderRightWidth: 2 }} />
                   </button>
                   <button className="p-1 hover:bg-white/10 rounded transition-colors opacity-40 hover:opacity-100" title="Inaccurate Match">
                      <div className="w-2.5 h-2.5 border-b border-r border-slate-400 -rotate-[135deg] translate-y-0.5" style={{ borderLeftWidth: 0, borderTopWidth: 0, width: 6, height: 10, borderBottomWidth: 2, borderRightWidth: 2 }} />
                   </button>
                </div>
              </div>
            </div>
          </button>
        )})}
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
  const next = headings.find(item => item.index > start)?.index ?? Math.min(lines.length, start + 25);
  const source = cleanLearningText(lines.slice(start + (target ? 1 : 0), next).join(' '));
  
  // Advanced semantic extraction: find sentences that actually contain keywords
  const keywords = normalizeTopic(activeLabel).split(' ');
  const sentences = (source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 25);

  const matched = sentences.filter(s => 
    keywords.some(k => k.length > 3 && normalizeTopic(s).includes(k))
  ).slice(0, 3);

  if (matched.length > 0) return matched;
  return sentences.slice(0, 3);
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
  boardControl,
  onOpenContents,
  focusMode = 'split',
  isZenMode = false,
  onVideoError,
  allowAutoplay = true,
  complexity = 'overview',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef1 = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef2 = useRef<NodeJS.Timeout | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorSkipThrottleRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) setIsMounted(true);
    });
    return () => {
      active = false;
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (transitionTimeoutRef1.current) clearTimeout(transitionTimeoutRef1.current);
      if (transitionTimeoutRef2.current) clearTimeout(transitionTimeoutRef2.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, []);
  
  // Safe State Initializers
  const [isLogExpanded, setIsLogExpanded] = useState(true);
  const [logHeight, setLogHeight] = useState(450);
  const [isVerticalResizing, setIsVerticalResizing] = useState(false);
  const [smartSearch, setSmartSearch] = useState('');
  const [isHighPrecision, setIsHighPrecision] = useState(false);
  const [railMode, setRailMode] = useState<SmartboardRailMode>('long');
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [curatedVideos, setCuratedVideos] = useState<VideoEntry[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<VideoEntry[]>([]);
  const [transientVideo, setTransientVideo] = useState<VideoEntry | null>(null);
  const [boardView, setBoardView] = useState<'video' | 'diagram'>('video');
  const [diagramCode, setDiagramCode] = useState<string>('');
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeLens, setActiveLens] = useState<SmartboardLens>('standard');
  const [showLedger, setShowLedger] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoList: VideoEntry[] = React.useMemo(() => {
    const base = (allVideoIds || []).filter(v => v && v.id && v.id.trim() !== '');
    const validCurated = (curatedVideos || []).filter(v => v && v.id && v.id.trim() !== '');
    const has = base.some(v => v && v.id === videoId);
    // Only prepend videoId if it's a real non-empty string — never push id='' into the player
    const validVideoId = videoId && videoId.trim().length >= 10;
    const list = has 
      ? [...base, ...validCurated] 
      : (validVideoId ? [{ id: videoId, title: moduleTitle }, ...base, ...validCurated] : [...base, ...validCurated]);
    
    if (transientVideo && transientVideo.id && !list.some(video => video && video.id === transientVideo.id)) {
      list.push(transientVideo);
    }
    
    const filtered = list
      .filter(video => video && video.id && video.id.trim() !== '')
      .filter((v, i, arr) => arr.findIndex(x => x && x.id === v.id) === i);

    if (filtered.length === 0) {
      // Topic-relevant fallback from curated library — NEVER show unrelated generic videos
      const topicFallback = getVideosByTopic(moduleTitle, 3);
      if (topicFallback && topicFallback.length > 0) {
        return topicFallback.filter(Boolean).map(v => ({
          id: v.id,
          title: v.title,
          channel: v.channel,
          durationMins: v.durationMins,
        }));
      }
      // Absolute last resort: return empty array (shows "Feed Restricted" UI)
      return [];
    }
    return filtered;
  }, [videoId, allVideoIds, moduleTitle, curatedVideos, transientVideo]);

  useEffect(() => {
    setLibraryVideos(CURATED_VIDEO_LIBRARY.filter(Boolean).map(video => ({
      id: video.id,
      title: video.title,
      channel: video.channel,
      durationMins: video.durationMins,
      searchText: `${video.title} ${video.channel} ${(video.tags || []).join(' ')}`,
    })));
    setCuratedVideos(getVideosByTopic(moduleTitle, 28, mockUserInterests).filter(Boolean).map(video => ({
      id: video.id,
      title: video.title,
      channel: video.channel,
      durationMins: video.durationMins,
      searchText: `${video.title} ${video.channel} ${(video.tags || []).join(' ')}`,
    })));
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

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRewinding, setIsRewinding] = useState(false);
  const lastTimeRef = useRef(0);
  const rewindCounterRef = useRef(0);

  const currentVideo = videoList[currentIdx] || videoList[0] || { id: videoId, title: moduleTitle };
  const isActuallyFailed = allFailed || !currentVideo?.id || currentVideo.id.trim() === '';

  // Enforce Topic Lock: reset state when module changes
  useEffect(() => {
    setCurrentIdx(0);
    setTransientVideo(null);
    setIsVideoVeiled(true);
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
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = setTimeout(() => {
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
  };

  const handleStateChange = (event: YouTubeEvent) => {
    const isNowPlaying = event.data === 1;
    setIsPlaying(isNowPlaying);
    
    if (isNowPlaying) { // Playing
      setIsVideoVeiled(false); // Lift the Nebula Cloak
      // Periodically trigger a "Neural Scan" to maintain high-fidelity accuracy perception
      if (Math.random() > 0.7) {
        setIsScanning(true);
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => setIsScanning(false), 2000);
      }
    }
    syncActiveSegmentAtTime();
  };

  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;
    const intervalId = window.setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        
        // Behavioral Analysis: Detect Rewind (Frustration Signal)
        if (time < lastTimeRef.current - 3 && !isTransitioning) {
           rewindCounterRef.current += 1;
           if (rewindCounterRef.current >= 2) {
              setIsRewinding(true);
           }
        } else if (time > lastTimeRef.current) {
           rewindCounterRef.current = 0;
           setIsRewinding(false);
        }

        lastTimeRef.current = time;
        syncActiveSegmentAtTime();
      }
    }, 1000);
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
    // Debounce/Throttle consecutive skips to prevent rapid recursive loops
    const now = Date.now();
    if (now - errorSkipThrottleRef.current < 400) {
      console.warn('[Smartboard] Skip loop throttled. Halting playback.');
      setAllFailed(true);
      onVideoError?.();
      return;
    }
    errorSkipThrottleRef.current = now;

    if (transitionTimeoutRef1.current) clearTimeout(transitionTimeoutRef1.current);
    if (transitionTimeoutRef2.current) clearTimeout(transitionTimeoutRef2.current);

    // Instant skip for a snappier "Seamless" feel with a glitch transition
    setIsTransitioning(true);
    transitionTimeoutRef1.current = setTimeout(() => {
      if (currentIdx < videoList.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        setAllFailed(true);
        onVideoError?.();
      }
      transitionTimeoutRef2.current = setTimeout(() => setIsTransitioning(false), 800);
    }, 150);
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
    const handleGlobalJump = (e: Event) => {
      const customEvent = e as CustomEvent<SmartboardJumpEventDetail>;
      const { timestamp } = customEvent.detail;
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
      channel: video.channel || (index === 0 ? 'Current Smartboard Source' : 'Cortex Library'),
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
        channel: 'Cortex generated checkpoint',
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
      channel: video.channel || 'Cortex Library',
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

  return (
    <div
      ref={containerRef}
      id="smartboard-container"
      className={`flex flex-col h-full overflow-hidden relative ${focusMode === 'content' ? 'bg-white' : 'bg-[#fcfcfd]'}`}
    >
      {/* ── DRAG SHIELD (Full Viewport Overlay) ── */}
      {isVerticalResizing && (
        <div className="fixed inset-0 z-[9999] cursor-row-resize select-none bg-transparent" />
      )}

      {/* ── UNIFIED SYSTEM FRAME ── */}
      {(() => {
        const isCleanMode = focusMode === 'content';
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



                {/* NEURAL INSIGHT HUD (THE 10/10 OVERLAY) */}
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-start pt-12 px-12">
                   {visibleActiveSegment && (
                      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                         <div className="flex items-center gap-3 px-6 py-2 bg-[#05070a]/40 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                            <Brain size={14} className="text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90">{visibleActiveSegment.label}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                         </div>
                         <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                      </div>
                   )}

                   {/* REWIND REFRESHEER PROMPT (BEHAVIORAL SYNC) */}
                   {isRewinding && (
                      <div className="mt-auto mb-12 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
                         <div className="bg-indigo-600/90 backdrop-blur-2xl border border-indigo-400/30 p-6 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-center gap-6 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                               <Sparkles size={24} className="text-white animate-spin-slow" />
                            </div>
                            <div className="space-y-1 text-left">
                               <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Need a Refresher?</h4>
                               <p className="text-[10px] font-medium text-indigo-100 leading-relaxed">It looks like this segment is dense. Should I suggest a simplified theoretical view?</p>
                            </div>
                            <button 
                               onClick={() => {
                                  const label = visibleActiveSegment?.label || moduleTitle;
                                  const refresher = getVideosByTopic(label, 1, [], 'spark', 'theoretical')[0];
                                  if (refresher) {
                                     setTransientVideo({
                                        id: refresher.id,
                                        title: refresher.title,
                                        channel: refresher.channel,
                                        durationMins: refresher.durationMins
                                     });
                                  }
                                  setIsRewinding(false);
                                  rewindCounterRef.current = 0;
                               }}
                               className="px-5 py-2 bg-white text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all whitespace-nowrap"
                            >
                               Simplify Now
                            </button>
                         </div>
                      </div>
                   )}
                </div>

                {!isActuallyFailed && isMounted ? (
                  <YouTube
                    key={currentVideo.id}
                    videoId={currentVideo.id}
                    opts={ytOpts}

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

                {/* ── NEURAL SCAN ANIMATION (Simulated OCR) ── */}
                {isScanning && !isVideoVeiled && (
                  <div className="absolute inset-0 z-[95] pointer-events-none overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-indigo-500/10 to-transparent animate-[scan_2s_ease-in-out_infinite] border-t border-indigo-400/30" />
                     <div className="absolute inset-0 border-[20px] border-indigo-500/5 animate-pulse" />
                  </div>
                )}

                {/* ── CONCEPTUAL DENSITY HEATMAP ── */}
                {!isVideoVeiled && !isActuallyFailed && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 z-[100] flex gap-px px-1">
                     {timeline.map((s, i) => {
                       const isMatch = smartSearch && s.label.toLowerCase().includes(smartSearch.toLowerCase());
                       return (
                        <div 
                          key={s.id} 
                          className={`flex-1 h-full transition-all duration-700 ${isMatch ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)]' : (s.confidence > 0.7 ? 'bg-indigo-500' : 'bg-slate-700/50')} ${activeSegmentId === s.id ? 'h-[4px] -translate-y-[2px] shadow-[0_0_10px_rgba(99,102,241,1)]' : ''}`}
                          title={isMatch ? `Search Match: ${s.label}` : `Conceptual Density: ${Math.round(s.confidence * 100)}%`}
                        />
                       );
                     })}
                  </div>
                )}



                {/* ── THE NEBULA CLOAK ── */}
                {!isActuallyFailed && isVideoVeiled && (
                  <div
                    onClick={() => { try { playerRef.current?.playVideo(); } catch(e) {} }}
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
                      <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400">Neural Scout Active</h4>
                      <p className="text-[13px] font-medium font-serif italic text-slate-500">Syncing cinematic learning feed...</p>
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
                      className="px-8 py-3 bg-[#4e5bff] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
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

                {/* ── DIGITAL GLITCH TRANSITION ── */}
                {isTransitioning && (
                  <div className="absolute inset-0 z-[100] bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <div className="relative w-full h-full overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 via-transparent to-purple-500/20 animate-pulse" />
                       <div className="absolute top-1/2 left-0 w-full h-1 bg-white/20 animate-[ping_0.5s_linear_infinite]" />
                       <div className="absolute top-1/4 left-0 w-full h-px bg-indigo-400/30 animate-[ping_0.7s_linear_infinite_reverse]" />
                    </div>
                  </div>
                )}

                {/* ── DYNAMIC CONCEPT RAIL ── */}
                {!isVideoVeiled && !isActuallyFailed && (
                  <div className="absolute bottom-6 left-6 right-32 z-[90] flex items-center gap-3 pointer-events-none">
                     <div className="flex gap-2 overflow-hidden">
                        {(visibleActiveSegment?.label?.split(' ') || []).slice(0, 5).map((word, i) => (
                          <div key={i} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border animate-in slide-in-from-bottom-2 duration-700 ${isZenMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-900/80 border-white/10 text-white'}`} style={{ animationDelay: `${i*100}ms` }}>
                             {word}
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                {/* ── VISUAL FRAME HIGHLIGHTING (The Insight Box) ── */}
                {!isVideoVeiled && !isActuallyFailed && isPlaying && (
                  <div className="absolute top-1/3 left-1/4 w-1/2 h-1/3 z-[85] pointer-events-none animate-in fade-in zoom-in duration-1000">
                     <div className="absolute inset-0 border border-indigo-500/30 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.2)]" />
                     <div className="absolute -top-6 left-0 bg-indigo-500/80 backdrop-blur-md px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-white">Focus: {visibleActiveSegment?.label || 'Key Concept'}</div>
                  </div>
                )}

                {/* ── LIVE TRANSCRIPTION RAIL ── */}
                {showTranscript && !isVideoVeiled && !isActuallyFailed && (
                  <div className="absolute bottom-16 left-6 right-6 z-[110] animate-in slide-in-from-bottom-4 duration-500">
                     <div className={`p-4 rounded-2xl border backdrop-blur-2xl ${isZenMode ? 'bg-[#05070a]/80 border-white/10 text-white' : 'bg-white/90 border-slate-200 text-slate-900'}`}>
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Live Neural Transcription</span>
                        </div>
                        <p className="text-[14px] font-bold leading-relaxed line-clamp-2 italic">
                           ...{visibleActiveSegment?.label} is being analyzed. The core logic suggests a high degree of correlation with the {moduleTitle} framework. Key takeaways include structural integrity and performance optimization...
                        </p>
                     </div>
                  </div>
                )}


              </div>

              {/* TECHNICAL DETAILS (POWER LED) */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-40">
                <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <div className="text-[6px] font-black text-white/30 uppercase tracking-[0.3em]">Smartboard Studio 8K</div>
              </div>
            </div>
          </div>

          {/* RECOMMENDED VIDEOS RAIL */}
          <div className="px-4 lg:px-12 pb-8 shrink-0 w-full max-w-full">
            <RecommendedVideos 
              topic={moduleTitle} 
              searchQuery={smartSearch || visibleActiveSegment?.label}
              complexity={complexity}
              currentVideoId={currentVideo?.id}
              onSelect={(video) => {
                if (!video?.id) return;
                // Only set transient video; the useEffect at line 542 will handle the index switch safely
                setTransientVideo({ 
                  id: video.id, 
                  title: video.title || 'Untitled Supplemental', 
                  channel: video.channel || 'Verified Source', 
                  durationMins: video.durationMins || 5
                });
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
