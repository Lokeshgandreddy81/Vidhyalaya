import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Video, FileText, Github, Globe, Terminal, 
  Code, FolderOpen, ExternalLink, Check, Copy 
} from 'lucide-react';

interface VideoData {
  id: string;
  title: string;
  channel: string;
}

interface ResourceData {
  title: string;
  url: string;
  snippet: string;
}

interface RepoData {
  name: string;
  url: string;
  description: string;
  stars?: number;
  language?: string;
}

interface FileScaffold {
  name: string;
  content: string;
  language: string;
}

interface SwarmPayload {
  // Flat properties (New)
  youtube?: VideoData[];
  google?: ResourceData[];
  github?: RepoData[];
  workspace?: {
    structure?: string;
    files?: FileScaffold[];
  } | null;

  // Nested properties (Legacy)
  YouTubeScout?: { videos?: VideoData[] };
  GoogleScout?: { resources?: ResourceData[] };
  GitHubScout?: { repos?: RepoData[] };
  WorkspaceConfigurator?: {
    structure?: string;
    files?: FileScaffold[];
  } | null;
}

interface SwarmBentoGridProps {
  payload: SwarmPayload;
  activeAgents?: string[];
  completedAgents?: string[];
  isGenerating?: boolean;
}

export const SwarmBentoGrid: React.FC<SwarmBentoGridProps> = ({ 
  payload,
  activeAgents = [],
  completedAgents = [],
  isGenerating = false
}) => {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);

  if (!payload || typeof payload !== 'object') return null;

  // Normalize data support for flat (new) and nested (legacy) schemas
  const videos = payload.youtube || payload.YouTubeScout?.videos || [];
  const resources = payload.google || payload.GoogleScout?.resources || [];
  const repos = payload.github || payload.GitHubScout?.repos || [];
  const workspace = payload.workspace || payload.WorkspaceConfigurator || null;

  const hasVideos = Array.isArray(videos) && videos.length > 0;
  const hasResources = Array.isArray(resources) && resources.length > 0;
  const hasRepos = Array.isArray(repos) && repos.length > 0;
  const hasConfigurator = !!workspace && (
    typeof workspace.structure === 'string' || 
    Array.isArray(workspace.files)
  );

  // Determine real-time active/completed state for loading skeletons
  const isYouTubeScouting = activeAgents.includes('YouTubeScout') && !completedAgents.includes('YouTubeScout') && !hasVideos;
  const isGoogleScouting = activeAgents.includes('GoogleScout') && !completedAgents.includes('GoogleScout') && !hasResources;
  const isGitHubScouting = activeAgents.includes('GitHubScout') && !completedAgents.includes('GitHubScout') && !hasRepos;
  const isWorkspaceScouting = activeAgents.includes('WorkspaceConfigurator') && !completedAgents.includes('WorkspaceConfigurator') && !hasConfigurator;

  const handleCopyCode = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedFileIndex(index);
    setTimeout(() => setCopiedFileIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 select-text text-white leading-relaxed"
    >
      {/* 1. MEDIA COLUMN (YouTubeScout or YouTube Loading Skeleton) */}
      {(hasVideos || isYouTubeScouting) && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 text-indigo-400">
            <Video size={14} className={isYouTubeScouting ? "animate-pulse" : ""} />
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              YouTube Video Scout {isYouTubeScouting && "— Ingesting..."}
            </span>
          </div>

          {isYouTubeScouting ? (
            <div className="flex-1 flex flex-col justify-center gap-3 animate-pulse">
              <div className="w-full aspect-video rounded-xl bg-white/[0.03]" />
              <div className="space-y-2 mt-2">
                <div className="h-4 bg-white/[0.03] rounded w-3/4" />
                <div className="h-3 bg-white/[0.02] rounded w-1/2" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3.5">
              {activeVideoId ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                    title="YouTube Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-none"
                  />
                  <button
                    onClick={() => setActiveVideoId(null)}
                    className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 hover:bg-black text-[9px] font-mono text-white/80 border border-white/15 cursor-pointer"
                  >
                    ✕ Close Player
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2.5 max-h-[260px] overflow-y-auto pr-0.5 custom-scrollbar">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setActiveVideoId(video.id)}
                    className={`group flex items-start gap-2.5 p-2 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] cursor-pointer transition-all duration-200 ${
                      activeVideoId === video.id ? 'border-indigo-500/30 bg-indigo-500/5' : ''
                    }`}
                  >
                    <div className="relative w-20 aspect-video shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
                      <img
                        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-90 transition-all duration-300"
                      />
                      <div className="relative z-10 w-6 h-6 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play size={10} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-bold text-white/90 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                        {video.title}
                      </div>
                      <div className="text-[9.5px] text-white/40 mt-1 font-mono">
                        {video.channel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. RESOURCE MATRIX COLUMN (GoogleScout & GitHubScout or Loading Skeletons) */}
      {(hasResources || hasRepos || isGoogleScouting || isGitHubScouting) && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 text-indigo-400">
            <Globe size={14} className={(isGoogleScouting || isGitHubScouting) ? "animate-pulse" : ""} />
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Web & Repository Intelligence
            </span>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
            {/* GoogleScout docs or loading */}
            {(hasResources || isGoogleScouting) && (
              <div>
                <div className="text-[9.5px] font-bold uppercase font-mono text-white/30 mb-2 tracking-wider">
                  Documentation & Guidelines
                </div>
                {isGoogleScouting ? (
                  <div className="flex gap-2 animate-pulse">
                    <div className="h-7 w-28 bg-white/[0.03] rounded-lg" />
                    <div className="h-7 w-36 bg-white/[0.03] rounded-lg" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {resources.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={doc.snippet}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/15 text-[11px] font-bold text-white/80 hover:text-white transition-all cursor-pointer"
                      >
                        <FileText size={11} className="text-blue-400" />
                        <span className="truncate max-w-[150px]">{doc.title}</span>
                        <ExternalLink size={10} className="text-white/20" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GitHubScout repos or loading */}
            {(hasRepos || isGitHubScouting) && (
              <div className="mt-3">
                <div className="text-[9.5px] font-bold uppercase font-mono text-white/30 mb-2 tracking-wider">
                  Open Source Codebases
                </div>
                {isGitHubScouting ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-10 w-full bg-white/[0.03] rounded-xl" />
                    <div className="h-10 w-full bg-white/[0.03] rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {repos.map((repo, idx) => (
                      <a
                        key={idx}
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.05] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-white/90 group-hover:text-indigo-300 transition-colors">
                            <Github size={12} className="text-purple-400" />
                            <span>{repo.name}</span>
                          </div>
                          <ExternalLink size={10} className="text-white/20" />
                        </div>
                        {repo.description && (
                          <div className="text-[10px] text-white/40 mt-1 line-clamp-1 leading-normal">
                            {repo.description}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. WORKSPACE CONFIGURATOR PANEL (Full span if alone, otherwise 2-col span) */}
      {(hasConfigurator || isWorkspaceScouting) && (
        <div className="col-span-1 md:col-span-2 flex flex-col gap-3.5 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-sm min-h-[180px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <FolderOpen size={14} className={isWorkspaceScouting ? "animate-pulse" : ""} />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                Workspace Scaffold Configurator {isWorkspaceScouting && "— Generating..."}
              </span>
            </div>
          </div>

          {isWorkspaceScouting ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
              <div className="md:col-span-1 h-36 bg-white/[0.03] rounded-xl" />
              <div className="md:col-span-2 h-36 bg-white/[0.03] rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File structure layout */}
              {workspace?.structure && (
                <div className="md:col-span-1 flex flex-col gap-2 bg-black/30 border border-white/5 rounded-xl p-3.5">
                  <div className="text-[9.5px] font-bold uppercase font-mono text-white/30 flex items-center gap-1">
                    <Terminal size={11} />
                    <span>Directory Tree</span>
                  </div>
                  <pre className="text-[10.5px] font-mono text-slate-300 leading-tight overflow-x-auto select-all p-1">
                    {workspace.structure}
                  </pre>
                </div>
              )}

              {/* Code starter viewer */}
              {Array.isArray(workspace?.files) && workspace.files.length > 0 && (
                <div className="md:col-span-2 flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden min-h-[220px]">
                  {/* Tabs bar */}
                  <div className="flex items-center border-b border-white/5 bg-black/20 overflow-x-auto max-w-full">
                    {workspace.files.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveFileIndex(idx)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[10.5px] font-mono border-r border-white/5 cursor-pointer transition-all ${
                          activeFileIndex === idx 
                            ? 'bg-white/[0.05] text-indigo-300 font-bold' 
                            : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <Code size={11} />
                        <span>{file.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selected File Content Viewer */}
                  {(() => {
                    const activeFile = workspace.files?.[activeFileIndex];
                    if (!activeFile) return null;

                    return (
                      <div className="relative flex-1 flex flex-col min-h-0">
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2">
                          <button
                            onClick={() => handleCopyCode(activeFile.content, activeFileIndex)}
                            className="p-1.5 rounded-lg border border-white/10 bg-black/60 hover:bg-black/90 text-white/60 hover:text-white cursor-pointer transition-all flex items-center gap-1"
                            title="Copy Code"
                          >
                            {copiedFileIndex === activeFileIndex ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-[9px] font-mono text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span className="text-[9px] font-mono">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex-1 p-4 overflow-auto max-h-[320px] custom-scrollbar">
                          <pre className="text-[11px] font-mono text-slate-350 leading-relaxed select-text p-1">
                            <code>{activeFile.content}</code>
                          </pre>
                        </div>

                        <div className="px-3.5 py-1.5 border-t border-white/5 bg-black/10 text-[9px] font-mono text-white/30 flex justify-between">
                          <span>Language: {activeFile.language}</span>
                          <span>File {activeFileIndex + 1} of {workspace.files.length}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
export default SwarmBentoGrid;
