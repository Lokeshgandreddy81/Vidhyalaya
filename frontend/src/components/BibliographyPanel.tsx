import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ExternalLink, Globe, Youtube, BookOpen, Search, ArrowUpRight } from 'lucide-react';
import { ContentCitation } from '../types';

interface BibliographyPanelProps {
  citations: ContentCitation[];
  isZenMode?: boolean;
  onCitationClick?: (idx: number) => void;
}

const BibliographyPanel: React.FC<BibliographyPanelProps> = ({ citations, isZenMode, onCitationClick }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`relative p-8 border-b overflow-hidden shrink-0 ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
         {/* Background Glow */}
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
         
         <div className="relative flex items-center justify-between">
            <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-4 bg-indigo-500" />
                  <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${isZenMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Grounding Archive</span>
               </div>
               <h2 className={`text-[24px] font-black tracking-tight leading-none ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                 Bibliography
               </h2>
               <p className={`text-[11px] font-medium mt-2 opacity-50 ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
                 Verified scholarly evidence for this module.
               </p>
            </div>
            <div className={`relative group w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform hover:rotate-12 ${
              isZenMode 
                ? 'bg-indigo-500/10 text-indigo-400 border border-white/10' 
                : 'bg-[#000666] text-white shadow-indigo-900/20'
            }`}>
               <div className="absolute inset-0 rounded-2xl animate-pulse bg-indigo-400/20" />
               <ShieldCheck size={28} className="relative z-10" />
            </div>
         </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {citations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 opacity-50">
             <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-700 mb-6">
                <BookOpen size={24} />
             </div>
             <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">No Grounding Data</h4>
             <p className="text-[12px] font-medium text-slate-600 leading-relaxed max-w-[200px]">This module is currently using baseline knowledge. SARA will scout citations during synthesis.</p>
          </div>
        ) : (
          <AnimatePresence>
            {citations.map((citation, idx) => {
              if (!citation) return null;
              const isYoutube = citation.url?.includes('youtube.com') || citation.url?.includes('youtu.be') || citation.domain?.includes('youtube');
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`group relative p-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] ${
                    isZenMode 
                      ? 'bg-white/[0.03] border-white/5 hover:border-indigo-500/30' 
                      : 'bg-white border-slate-100 hover:border-[#000666]/20 hover:shadow-2xl hover:shadow-indigo-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-black shadow-inner ${
                          isZenMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-[#000666]'
                        }`}>
                           {citation.index}
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isZenMode ? 'text-slate-500' : 'text-slate-400'}`}>Source Domain</span>
                           <div className="flex items-center gap-1.5">
                              {isYoutube ? <Youtube size={12} className="text-red-500" /> : <Globe size={12} className="text-blue-500" />}
                              <span className={`text-[12px] font-black tracking-tight ${isZenMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                {citation.domain || (() => {
                                  try {
                                    return citation.url ? new URL(citation.url).hostname.replace(/^www\./, '') : 'Verified Web';
                                  } catch (e) {
                                    return 'Verified Web';
                                  }
                                })()}
                              </span>
                              {citation.snippet?.includes('AI Web Scout') && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[7px] font-black uppercase tracking-widest border border-indigo-500/20">
                                  Scouted
                                </span>
                              )}
                           </div>
                        </div>
                     </div>
                     
                     <button 
                        onClick={() => onCitationClick?.(citation.index)}
                        className={`p-2 rounded-xl transition-all ${
                          isZenMode ? 'bg-white/5 text-slate-500 hover:text-white hover:bg-indigo-500/20' : 'bg-slate-50 text-slate-400 hover:text-[#000666] hover:bg-indigo-50'
                        }`}
                     >
                        <ArrowUpRight size={18} />
                     </button>
                  </div>
                  
                  <h5 className={`text-[14px] font-black leading-tight mb-3 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>
                    {citation.title || 'Scholarly Source'}
                  </h5>
                  
                  {citation.snippet && (
                    <p className={`text-[11px] font-medium leading-relaxed italic border-l-2 pl-3 mb-4 ${isZenMode ? 'text-slate-400 border-indigo-500/30' : 'text-slate-500 border-indigo-100'}`}>
                      "{citation.snippet.substring(0, 120)}..."
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (citation.url) {
                          window.open(citation.url, '_blank', 'noopener,noreferrer');
                        } else {
                          window.open(`https://www.google.com/search?q=${encodeURIComponent(citation.title || 'Scholarly Source')}`, '_blank');
                        }
                      }}
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isZenMode 
                          ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-500 hover:text-white shadow-lg shadow-indigo-500/10' 
                          : 'bg-[#000666] text-white hover:bg-indigo-950 shadow-lg shadow-indigo-500/20'
                      }`}
                    >
                      Open Full Source
                      <ExternalLink size={12} />
                    </button>
                    
                    <button 
                      onClick={() => {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(`${citation.title} ${citation.domain || ''}`.trim())}`, '_blank');
                      }}
                      title="Verify via Search"
                      className={`px-4 rounded-xl transition-all flex items-center justify-center border-2 ${
                        isZenMode 
                          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                          : 'bg-white border-slate-100 text-slate-400 hover:text-[#000666] hover:border-[#000666]'
                      }`}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className={`p-6 border-t shrink-0 flex items-center justify-between ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-50 bg-slate-50/30'}`}>
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Grounding Units</span>
            <span className={`text-[12px] font-black ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{citations.length} Verified Sources</span>
         </div>
         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <ShieldCheck size={16} />
         </div>
      </div>
    </div>
  );
};

export default BibliographyPanel;
