import React from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { Play, Sparkles, CheckCircle2, Monitor, AlertCircle, Tv, Youtube, Compass, ExternalLink, Activity } from 'lucide-react';
import { Resource } from '../types';

interface SaraMediaPanelProps {
  videos: Resource[];
  activeVideo: Resource | null;
  onSelectVideo: (video: Resource) => void;
  isLoading: boolean;
  topicName: string;
}

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
const getYouTubeFallbackThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

export const SaraMediaPanel: React.FC<SaraMediaPanelProps> = ({
  videos,
  activeVideo,
  onSelectVideo,
  isLoading,
  topicName,
}) => {
  const [thumbnailError, setThumbnailError] = React.useState<Record<string, boolean>>({});

  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      fs: 1,
      playsinline: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };

  const handleThumbnailError = (id: string) => {
    setThumbnailError(prev => ({ ...prev, [id]: true }));
  };

  // 1. Loading State (Aurora Glassmorphism)
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8 relative rounded-3xl overflow-hidden border border-white/20 bg-slate-950/20 backdrop-blur-xl">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Cortex Logo Scanner */}
          <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-indigo-500/20" />
            {/* Horizontal scan line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 animate-[bounce_2s_infinite] shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <Activity size={36} className="text-indigo-400 animate-pulse" />
          </div>

          <h3 className="text-lg font-black text-white tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Cortex Deep Scout Grounding Active
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-3 max-w-xs leading-relaxed">
            Executing live Google Search queries, matching verified YouTube transcripts, and filtering embed permissions for:
          </p>
          <div className="mt-4 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-300">"{topicName}"</span>
          </div>

          {/* Stepper logs */}
          <div className="mt-8 space-y-2.5 w-full text-left">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-2 rounded-xl">
              <CheckCircle2 size={12} className="shrink-0" />
              <span>Querying verified catalog</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3.5 py-2 rounded-xl animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
              <span>Scouting web indexing & player statuses</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 px-3.5 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
              <span>Mapping chapter moments</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (videos.length === 0) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8 relative rounded-3xl overflow-hidden border border-white/20 bg-slate-950/20 backdrop-blur-xl">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md">
            <AlertCircle size={32} className="text-indigo-400" />
          </div>
          <h3 className="text-base font-black text-white tracking-tight">No Media Matches Sourced</h3>
          <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
            Cortex couldn't find any embeddable reference videos matching this exact curriculum subject. Select another topic to re-trigger search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 3. Main Stage Player */}
      {activeVideo && (
        <div className="w-full bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
          {/* Iframe stage */}
          <div className="aspect-video w-full bg-slate-900 relative">
            <YouTube
              videoId={activeVideo.videoId}
              opts={ytOpts}
              className="absolute inset-0 z-0 h-full w-full"
              iframeClassName="h-full w-full border-0"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* Details header */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 bg-gradient-to-b from-transparent to-slate-950/20 border-t border-white/5">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                  <Sparkles size={10} className="fill-indigo-400/20" />
                  Cortex Grounded
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                  <CheckCircle2 size={10} />
                  Verified Playback
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white leading-tight tracking-tight">
                {activeVideo.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-slate-300">
                  <Youtube size={14} className="text-red-500" />
                  Reference Video
                </span>
              </div>
            </div>

            <a
              href={activeVideo.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all hover:scale-105 shadow-md shrink-0 self-start"
            >
              <ExternalLink size={12} />
              Open on YouTube
            </a>
          </div>
        </div>
      )}

      {/* 4. Alternative Cortex Verified Sources (The Recommended Grid) */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-2">
              <Compass size={12} />
              Cortex Sourced Supplementals
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Alternative highly-recommended modules verified by the grounding scraper
            </p>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {videos.length} Verified Clips
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => {
            const isActive = activeVideo?.videoId === video.videoId;
            const useFallback = thumbnailError[video.videoId];
            const thumbUrl = useFallback ? getYouTubeFallbackThumbnail(video.videoId) : getYouTubeThumbnail(video.videoId);

            return (
              <button
                key={video.id}
                onClick={() => onSelectVideo(video)}
                disabled={isActive}
                className={`group text-left flex flex-col rounded-3xl overflow-hidden transition-all duration-300 border backdrop-blur-xl relative ${
                  isActive
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-indigo-500/5 shadow-2xl pointer-events-none'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 hover:shadow-[0_20px_50px_-20px_rgba(99,102,241,0.15)] hover:-translate-y-1.5'
                }`}
              >
                {/* Active indicator border */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
                )}

                {/* Video thumbnail */}
                <div className="aspect-video bg-slate-900 relative overflow-hidden shrink-0">
                  <img
                    src={thumbUrl}
                    onError={() => handleThumbnailError(video.videoId)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    alt={video.title}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                  
                  {/* Overlay Play Hover */}
                  {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35 backdrop-blur-xs">
                      <div className="w-10 h-10 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play size={14} className="fill-slate-950 ml-0.5" />
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/65 backdrop-blur-xs">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                        <Monitor size={10} className="animate-pulse" />
                        Now Watching
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {isActive ? 'Active Node' : 'Verified Resource'}
                      </span>
                    </div>
                    <h4 className={`text-[12px] font-black leading-snug line-clamp-2 transition-colors ${
                      isActive ? 'text-indigo-300' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {video.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[130px]">
                      Topic: {topicName}
                    </span>
                    <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-widest">
                      Embed safe
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
