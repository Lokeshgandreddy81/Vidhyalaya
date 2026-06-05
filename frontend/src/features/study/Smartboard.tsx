import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { AlertTriangle, Play, Clock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { SmartboardJumpEventDetail, VideoSegment } from '../../types';
import { searchPerfectVideos, PerfectVideo, getYouTubeThumbnail } from '../../services/smartboardService';
import { getVideosByTopic } from '../../services/videoLibrary';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface VideoEntry {
  id: string;
  title: string;
  channel?: string;
  durationMins?: number;
  searchText?: string;
}

interface SmartboardProps {
  videoId: string;
  allVideoIds?: VideoEntry[];
  moduleTitle: string;
  moduleContent?: string | null;
  onReSync?: () => void;
  isZenMode?: boolean;
  onVideoError?: () => void;
  allowAutoplay?: boolean;
  complexity?: string;
  videoTimeline?: VideoSegment[];
}

const Smartboard: React.FC<SmartboardProps> = ({
  videoId,
  allVideoIds = [],
  moduleTitle,
  moduleContent,
  onReSync,
  isZenMode = false,
  onVideoError,
  allowAutoplay = true,
  complexity = 'overview',
  videoTimeline = [],
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [transientVideo, setTransientVideo] = useState<VideoEntry | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Smartboard Hub states
  const [activeTab, setActiveTab] = useState<'chapters' | 'playlist' | 'sync'>('playlist');
  const [currentTime, setCurrentTime] = useState(0);
  const [chapters, setChapters] = useState<{ title: string; startSecs: number; endSecs: number }[]>([]);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Transcript Reader Mode states
  const [transcript, setTranscript] = useState<{ start: number; duration: number; text: string }[]>([]);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [showTranscriptReader, setShowTranscriptReader] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [perfectVideos, setPerfectVideos] = useState<PerfectVideo[]>([]);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const errorThrottleRef = useRef<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch AI recommended videos
  useEffect(() => {
    let cancelled = false;
    const context = (moduleContent || '').substring(0, 2000);

    setPerfectVideos([]);

    searchPerfectVideos(moduleTitle, context, 0).then(videos => {
      if (cancelled) return;
      if (videos.length >= 3) {
        setPerfectVideos(videos);
        return;
      }
      const fallback = getVideosByTopic(moduleTitle, 10, [], complexity).map(v => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        channelId: '',
        description: '',
        durationSeconds: (v.durationMins || 10) * 60,
        durationFormatted: `${v.durationMins || 10}:00`,
        viewCount: 0,
        likeCount: 0,
        embeddable: true,
        isAuthority: false,
        isElite: false,
        relevanceScore: 5,
      }));
      setPerfectVideos(fallback);
    });

    return () => { cancelled = true; };
  }, [moduleTitle, moduleContent, complexity]);

  // Compute final consolidated playlist
  const videoList: VideoEntry[] = useMemo(() => {
    const base = (allVideoIds || []).filter(v => v?.id?.trim());
    const has = base.some(v => v.id === videoId);
    const validVideoId = videoId?.trim().length >= 10;

    const list = has
      ? [...base]
      : validVideoId ? [{ id: videoId, title: moduleTitle }, ...base] : [...base];

    if (transientVideo?.id && !list.some(v => v.id === transientVideo.id)) {
      list.push(transientVideo);
    }

    const seenIds = new Set(list.map(v => v.id));
    for (const pv of perfectVideos) {
      if (!seenIds.has(pv.id)) {
        seenIds.add(pv.id);
        list.push({
          id: pv.id,
          title: pv.title,
          channel: pv.channel,
          durationMins: Math.round(pv.durationSeconds / 60),
          searchText: undefined,
        });
      }
    }

    return list
      .filter(v => v?.id?.trim())
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
  }, [videoId, allVideoIds, moduleTitle, transientVideo, perfectVideos]);

  const currentVideo = videoList[currentIdx] || videoList[0] || { id: videoId, title: moduleTitle };
  const isActuallyFailed = !currentVideo?.id?.trim();

  // Reset tracking state on module change
  useEffect(() => {
    setCurrentIdx(0);
    setTransientVideo(null);
    setAllFailed(false);
    setCurrentTime(0);
    setShowTranscriptReader(false);
  }, [videoId, moduleTitle]);

  useEffect(() => {
    setAllFailed(false);
  }, [currentIdx, transientVideo]);

  // Fetch actual YouTube chapters for the active video
  useEffect(() => {
    if (!currentVideo.id) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    setIsChaptersLoading(true);
    setChapters([]);
    api.getChapters(currentVideo.id)
      .then(res => {
        if (cancelled) return;
        setChapters(res || []);
        if (res && res.length > 0) {
          setActiveTab('chapters');
        } else {
          setActiveTab('playlist');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setChapters([]);
        setActiveTab('playlist');
      })
      .finally(() => {
        if (!cancelled) {
          setIsChaptersLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentVideo.id]);

  // Fetch closed-caption timed transcripts for the active video
  useEffect(() => {
    if (!currentVideo.id) {
      setTranscript([]);
      return;
    }
    let cancelled = false;
    setIsTranscriptLoading(true);
    setTranscript([]);
    api.getTranscript(currentVideo.id)
      .then(res => {
        if (cancelled) return;
        setTranscript(res || []);
      })
      .catch(() => {
        if (cancelled) return;
        setTranscript([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranscriptLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentVideo.id]);

  // Sync active playback time from YouTube player
  useEffect(() => {
    let interval: any;
    const trackTime = () => {
      if (playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(time);
          }
          const dur = playerRef.current.getDuration();
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        } catch {}
      }
    };
    interval = setInterval(trackTime, 1000);
    return () => {
      clearInterval(interval);
      playerRef.current = null; // Clean up old destroyed player reference
    };
  }, [currentVideo.id]);

  const seekPlayer = useCallback((ts: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(Math.max(0, ts - 1), true);
      playerRef.current.playVideo();
    } catch {}
  }, []);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    if (allowAutoplay) {
      try { event.target.playVideo(); } catch {}
    }
    // Seek if there is a pending seek action
    if (pendingSeek !== null) {
      try {
        event.target.seekTo(pendingSeek, true);
        event.target.playVideo();
      } catch {}
      setPendingSeek(null);
    }
  };

  const handleError = (event: any) => {
    const errorCode = event?.data;
    console.warn(`[Smartboard] YouTube error ${errorCode} on video ${currentVideo.id} (idx ${currentIdx}/${videoList.length})`);

    const isFatal = errorCode === 100 || errorCode === 101 || errorCode === 150;

    if (!isFatal) return;

    const now = Date.now();
    if (now - errorThrottleRef.current < 300) {
      console.error('[Smartboard] Rapid error loop detected, stopping.');
      return;
    }
    errorThrottleRef.current = now;

    if (currentIdx < videoList.length - 1) {
      console.log(`[Smartboard] Skipping to next video (idx ${currentIdx + 1})`);
      setCurrentIdx(i => i + 1);
    } else {
      toast.error("Video embedding is blocked. Activating Interactive Transcript Reader Mode!", { duration: 8000 });
      setShowTranscriptReader(true);
      onVideoError?.();
    }
  };

  // Listen to manual jump triggers from citations or external notes
  useEffect(() => {
    const handler = (e: Event) => {
      const { timestamp } = (e as CustomEvent<SmartboardJumpEventDetail>).detail;
      if (timestamp !== undefined) seekPlayer(timestamp);
    };
    window.addEventListener('smartboard-jump', handler);
    return () => window.removeEventListener('smartboard-jump', handler);
  }, [seekPlayer]);

  const handleReSync = async () => {
    setIsSyncing(true);
    setAllFailed(false);
    setCurrentIdx(0);
    setShowTranscriptReader(false);
    try { await onReSync?.(); } finally { setIsSyncing(false); }
  };

  const handleJumpToSegment = (vId: string, ts: number) => {
    const idx = videoList.findIndex(v => v.id === vId);
    if (idx !== -1) {
      setPendingSeek(ts);
      setCurrentIdx(idx);
      setTransientVideo(null);
      setShowTranscriptReader(false);
    } else {
      // Load as transient video if not present in the current playlist
      const transient: VideoEntry = { id: vId, title: "Scouted Topic Segment" };
      setTransientVideo(transient);
      setPendingSeek(ts);
      setShowTranscriptReader(false);
      // Wait for re-memo to place it at the end
      setTimeout(() => {
        const nextList = [...videoList, transient];
        const nextIdx = nextList.findIndex(v => v.id === vId);
        if (nextIdx !== -1) setCurrentIdx(nextIdx);
      }, 50);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: allowAutoplay ? 1 : 0,
      controls: 1,
      rel: 0,
      showinfo: 0,
      ecver: 2,
      playsinline: 1
    },
  };

  const zen = isZenMode;
  const bg = zen ? 'bg-[#0f0f14]' : 'bg-[#f9f9fb]';
  const text1 = zen ? 'text-slate-100' : 'text-slate-900';
  const text2 = zen ? 'text-slate-400' : 'text-slate-500';

  return (
    <div id="smartboard-container" className={`flex flex-col h-full min-h-0 overflow-hidden ${bg} ${text1}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sheen-sweep {
          0% { transform: translateX(-150%) skewX(-25deg); }
          35% { transform: translateX(150%) skewX(-25deg); }
          100% { transform: translateX(150%) skewX(-25deg); }
        }
      ` }} />
      {/* Immersive Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${zen ? 'border-white/5 bg-white/5' : 'border-slate-200/60 bg-white'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h1 className={`text-[10px] font-black uppercase tracking-[0.2em] ${zen ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>Immersive Smartboard</h1>
        </div>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${
            isSidebarCollapsed
              ? 'bg-slate-200/60 hover:bg-slate-200 text-slate-700' 
              : (zen ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60')
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
          <span>{isSidebarCollapsed ? "Show Playlists" : "Hide Playlists"}</span>
        </button>
      </div>

      {/* Main split-screen panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Left column: Player viewport & active meta */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-3 lg:p-5">
          <div className="relative w-full shrink-0">
            {/* Cinematic Backglow (Ambient Light) */}
            {isPlaying && (
              <div 
                className="absolute -inset-1.5 bg-gradient-to-r from-[#4e5bff] to-[#8b5cf6] rounded-2xl blur-xl opacity-40 animate-pulse pointer-events-none transition-opacity duration-700" 
                style={{ animationDuration: '4s' }}
              />
            )}
            
            <div className={`relative w-full overflow-hidden rounded-2xl z-10 border transition-all duration-500 ${
              zen ? 'border-white/5 bg-[#0a0c10]' : 'border-slate-200/50 bg-[#0c0e14]'
            } ${
              isPlaying
                ? 'shadow-[0_0_32px_rgba(99,102,241,0.25)]'
                : (zen ? 'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)]' : 'shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)]')
            }`}>
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
                {/* Cinematic Glass Reflection Sheen */}
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
                  <div 
                    className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.05] to-white/0"
                    style={{
                      width: '200%',
                      height: '100%',
                      animation: 'sheen-sweep 9s ease-in-out infinite',
                    }}
                  />
                </div>
              {showTranscriptReader ? (
                /* INTERACTIVE TRANSCRIPT READER BACKUP VIEW */
                <div className={`absolute inset-0 flex flex-col p-4 overflow-hidden ${zen ? 'bg-[#0f0f14]' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Interactive Transcript View</span>
                    <button 
                      onClick={() => setShowTranscriptReader(false)} 
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      Show Player
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {isTranscriptLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-2" />
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Loading dialogue transcript...</span>
                      </div>
                    ) : transcript.length > 0 ? (
                      transcript.map((line, idx) => {
                        const isActive = currentTime >= line.start && currentTime < (line.start + line.duration + 2);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              seekPlayer(line.start);
                              setShowTranscriptReader(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all text-slate-300 ${
                              isActive 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold' 
                                : 'border-transparent hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="text-[9px] font-mono text-slate-500 block mb-0.5">
                              {formatTime(line.start)}
                            </span>
                            <span className="text-xs leading-relaxed">
                              {line.text}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-xs font-semibold text-slate-400">Dialogue transcript is currently unavailable.</p>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Verify if closed-captions are enabled on this video.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* STANDARD YOUTUBE IFRAME VIEW */
                <>
                  {!isActuallyFailed && isMounted ? (
                    <YouTube
                      key={currentVideo.id}
                      videoId={currentVideo.id}
                      opts={ytOpts}
                      onReady={handleReady}
                      onError={handleError}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnd={() => setIsPlaying(false)}
                      className="h-full w-full"
                      iframeClassName="w-full h-full border-none"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : null}

                  {isActuallyFailed && (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${zen ? 'bg-[#0f0f14]' : 'bg-slate-50'}`}>
                      <AlertTriangle size={28} className="text-amber-500 mb-3" />
                      <h3 className={`text-sm font-semibold mb-1.5 ${text1}`}>Video Unavailable</h3>
                      <p className={`text-xs mb-4 max-w-[240px] leading-relaxed ${text2}`}>
                        No video resources could be loaded. Please check if Brave Shields or your adblocker is blocking YouTube embeds.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleReSync} disabled={isSyncing}
                          className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {isSyncing ? 'Scouting...' : 'Re-Scout Videos'}
                        </button>
                        {transcript.length > 0 && (
                          <button onClick={() => setShowTranscriptReader(true)}
                            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors">
                            Open Transcript View
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Visual Timeline Scrubber */}
          {duration > 0 && (
            <div className="mt-4 px-1 select-none shrink-0">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div 
                className="relative h-2 w-full rounded-full bg-white/5 border border-white/5 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seekPlayer(percent * duration);
                }}
              >
                {/* Progress fill */}
                <div 
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-[#4e5bff] to-[#8b5cf6] shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all"
                  style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                />
                
                {/* Chapter Nodes */}
                {chapters.map((ch, idx) => {
                  const posPercent = (ch.startSecs / duration) * 100;
                  const isPassed = currentTime >= ch.startSecs;
                  if (posPercent > 100) return null;
                  
                  return (
                    <div
                      key={idx}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/node"
                      style={{ left: `${posPercent}%` }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          seekPlayer(ch.startSecs);
                          setShowTranscriptReader(false);
                        }}
                        className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                          isPassed
                            ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                            : 'bg-slate-800 border-white/10 hover:bg-slate-400'
                        }`}
                      />
                      {/* Floating Micro-Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 w-52 p-3.5 rounded-2xl bg-[#0c0d10]/95 border border-indigo-500/30 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.25)] opacity-0 scale-90 translate-y-2 group-hover/node:opacity-100 group-hover/node:scale-100 group-hover/node:translate-y-0 transition-all duration-300 pointer-events-none z-50 text-left">
                        <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-2xl blur-md -z-10" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Lesson Milestone</p>
                        <p className="text-[11px] font-black text-slate-100 leading-snug mb-2">{ch.title}</p>
                        
                        {/* Dynamic Academic Checklist */}
                        <div className="space-y-1 py-1.5 border-t border-b border-white/5 my-1.5">
                          <p className="text-[7px] font-black uppercase tracking-wider text-slate-500">Core Objectives:</p>
                          <div className="flex items-start gap-1 text-[9px] text-slate-400 font-medium">
                            <span className="text-indigo-400 leading-none">✦</span>
                            <span className="leading-tight">Conceptual domain structure</span>
                          </div>
                          <div className="flex items-start gap-1 text-[9px] text-slate-400 font-medium">
                            <span className="text-indigo-400 leading-none">✦</span>
                            <span className="leading-tight">Active coordinate recall</span>
                          </div>
                        </div>

                        <p className="text-[8px] text-indigo-300 font-mono flex items-center justify-between">
                          <span>TIMESTAMP</span>
                          <span>{formatTime(ch.startSecs)}</span>
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#0c0d10]/95" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 shrink-0 px-1">
            <h2 className={`text-sm lg:text-base font-extrabold leading-snug tracking-tight ${text1}`}>
              {currentVideo.title || moduleTitle}
            </h2>
            
            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2">
                {currentVideo.channel && (
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${zen ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15' : 'bg-indigo-50 text-[#4e5bff]'}`}>
                    {currentVideo.channel}
                  </span>
                )}
                {currentVideo.durationMins && (
                  <span className={`text-[10px] font-bold ${text2} flex items-center gap-1`}>
                    <Clock size={11} />
                    {currentVideo.durationMins} mins
                  </span>
                )}
              </div>
              
              {transcript.length > 0 && (
                <button
                  onClick={() => setShowTranscriptReader(!showTranscriptReader)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    showTranscriptReader 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                      : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-300'
                  }`}
                >
                  {showTranscriptReader ? 'Close Transcript' : 'Transcript View'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Smartboard Hub Sidebar */}
        <div className={`transition-all duration-300 ease-in-out flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l overflow-hidden ${
          isSidebarCollapsed 
            ? 'w-0 h-0 opacity-0 border-none pointer-events-none' 
            : 'lg:w-[340px] xl:w-[380px] w-full h-auto opacity-100'
        } ${zen ? 'border-white/5 bg-[#0b0c10]' : 'border-slate-200 bg-slate-50/50'}`}>
          {/* Tabs Container */}
          <div className={`flex border-b shrink-0 ${zen ? 'border-white/5' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-center transition-all ${
                activeTab === 'chapters'
                  ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Chapters ({chapters.length})
            </button>
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-center transition-all ${
                activeTab === 'playlist'
                  ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              AI Playlists ({videoList.length})
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-center transition-all ${
                activeTab === 'sync'
                  ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Sync Map ({videoTimeline?.length || 0})
            </button>
          </div>

          {/* Dynamic Content Panel */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-0">
            {activeTab === 'chapters' && (
              <div className="space-y-1">
                {isChaptersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-2" />
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Syncing chapters...</span>
                  </div>
                ) : chapters.length > 0 ? (
                  chapters.map((ch, idx) => {
                    const isActive = currentTime >= ch.startSecs && currentTime < ch.endSecs;
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, type: 'spring', damping: 20, stiffness: 250 }}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          seekPlayer(ch.startSecs);
                          setShowTranscriptReader(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                          isActive
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                            : 'border border-transparent bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {ch.title}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {formatTime(ch.startSecs)} - {formatTime(ch.endSecs)}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isActive ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'
                        }`}>
                          <Play size={8} fill={isActive ? "currentColor" : "none"} />
                        </div>
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-xs font-semibold text-slate-400">No chapters found for this video.</p>
                    <p className="text-[9px] text-slate-500 mt-1.5 uppercase font-bold tracking-widest">Chapters sync requires a timestamp timeline in description.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'playlist' && (
              <div className="space-y-2">
                {videoList.map((vid, idx) => {
                  const isPlaying = idx === currentIdx;
                  return (
                    <motion.button
                      key={vid.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, type: 'spring', damping: 20, stiffness: 250 }}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setCurrentIdx(idx);
                        setTransientVideo(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all border flex gap-3 group relative overflow-hidden cursor-pointer ${
                        isPlaying
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                          : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] text-slate-300 hover:border-white/5'
                      }`}
                    >
                      {/* Thumbnail View */}
                      <div className="relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-955 border border-white/5">
                        <img
                          src={getYouTubeThumbnail(vid.id)}
                          alt={vid.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                          loading="lazy"
                        />
                        {vid.durationMins && (
                          <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.25 rounded text-[8px] font-mono text-white">
                            {vid.durationMins}:00
                          </span>
                        )}
                        {isPlaying && (
                          <div className="absolute inset-0 bg-indigo-500/25 flex items-center justify-center">
                            <div className="flex gap-0.5 items-end h-3">
                              <span className="w-0.5 h-2.5 bg-white rounded animate-pulse" />
                              <span className="w-0.5 h-3 bg-white rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                              <span className="w-0.5 h-1.5 bg-white rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info View */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <p className={`text-[11px] font-bold leading-tight line-clamp-2 ${isPlaying ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {vid.title}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-1 truncate">
                            {vid.channel || "Scouted Video"}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="space-y-1">
                {videoTimeline && videoTimeline.length > 0 ? (
                  videoTimeline.map((seg, idx) => {
                    const isCorrectVideo = seg.videoId === currentVideo.id;
                    const isActive = isCorrectVideo && Math.abs(currentTime - seg.timestamp) < 30;
                    return (
                      <button
                        key={seg.id || idx}
                        onClick={() => handleJumpToSegment(seg.videoId, seg.timestamp)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'border-transparent bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded ${
                              isCorrectVideo 
                                ? 'bg-indigo-500/10 text-indigo-400' 
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {isCorrectVideo ? 'Active Video' : 'Load Video'}
                            </span>
                            {seg.confidence && (
                              <span className="text-[8px] font-mono text-slate-500">
                                Match: {Math.round(seg.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 mt-1.5 ${isActive ? 'text-emerald-300 font-extrabold' : 'text-slate-200'}`}>
                            {seg.label}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Sync Point: {formatTime(seg.timestamp)}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isActive 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-white/5 text-slate-500'
                        }`}>
                          <Play size={8} fill={isActive ? "currentColor" : "none"} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-xs font-semibold text-slate-400">No headings synced to this timeline.</p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Generate lesson content first to map timestamps.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Smartboard;
