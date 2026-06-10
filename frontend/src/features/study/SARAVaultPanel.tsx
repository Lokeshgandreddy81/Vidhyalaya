import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, Hash, Bookmark, Share2, Search, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface VaultItem {
  id: string;
  title: string;
  content: string;
  source: string;
  type: 'insight' | 'citation';
  timestamp: number;
}

interface SARAVaultPanelProps {
  items: VaultItem[];
  isZenMode?: boolean;
}

const SARAVaultPanel: React.FC<SARAVaultPanelProps> = ({ items, isZenMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success("Insight copied to clipboard.");
  };

  // Bug 6 fix: filter items by search term in title, content, or source
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Bug 11 fix: export vault items as formatted markdown document download
  const handleExportVault = () => {
    if (items.length === 0) {
      toast.error("Vault is empty. Nothing to export.");
      return;
    }

    let markdown = `# Vidyal.ai - SARA Study Vault Export\n`;
    markdown += `Generated on: ${new Date().toLocaleString()}\n`;
    markdown += `Total entries: ${items.length} units\n\n`;
    markdown += `This archive contains high-fidelity insights and scholarly citations curated with SARA AI during your Vidyal.ai study sessions.\n\n`;
    markdown += `---\n\n`;

    items.forEach((item, idx) => {
      markdown += `## ${idx + 1}. [${item.type.toUpperCase()}] ${item.title}\n`;
      markdown += `*Date saved: ${new Date(item.timestamp).toLocaleString()}*\n`;
      markdown += `*Reference: ${item.source}*\n\n`;
      markdown += `### Insight Content:\n${item.content}\n\n`;
      markdown += `---\n\n`;
    });

    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `VidyalAI_Vault_Export_${Date.now()}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Vault exported as a Markdown document.");
    } catch (e) {
      toast.error("Failed to generate export file.");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isZenMode ? 'border-white/5' : 'border-slate-200/60'}`}>
         <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Knowledge Archive</span>
            <span className={`text-[12px] font-black uppercase tracking-widest ${isZenMode ? 'text-white' : 'text-slate-900'}`}>The Vault</span>
         </div>
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isZenMode ? 'bg-indigo-500/10' : 'bg-slate-50'}`}>
            <Shield size={18} className="text-indigo-400" />
         </div>
      </div>

      {/* Search/Filter Bar */}
      <div className="p-4 shrink-0">
         <div className={`relative flex items-center rounded-xl border ${isZenMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/85 shadow-sm'}`}>
            <Search size={14} className="absolute left-3 text-slate-500" />
            <input
               type="text"
               placeholder="Search archive..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-transparent py-2.5 pl-10 pr-4 text-[11px] font-medium outline-none text-slate-400"
               autoComplete="off"
               autoCorrect="off"
               autoCapitalize="off"
               spellCheck={false}
               name="vault-search-input-field"
               id="vault-search-input-field"
            />
         </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
             <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-700 mb-6">
                <Bookmark size={24} />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
               {searchTerm ? 'No matches found' : 'Vault is Empty'}
             </h4>
             <p className="text-[11px] font-medium text-slate-600 leading-relaxed max-w-[180px]">
               {searchTerm
                 ? `No vault entries match "${searchTerm}"`
                 : 'Save insights from SARA chat or explore module citations to build your archive.'}
             </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredItems.map((item, idx) => {
              const isFlipped = flippedId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{ perspective: 1000 }}
                  className="relative w-full h-[180px] cursor-pointer group"
                  onClick={() => setFlippedId(isFlipped ? null : item.id)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
                    className="relative w-full h-full"
                  >
                     {/* FRONT SIDE */}
                     <div
                       style={{ backfaceVisibility: 'hidden' }}
                       className={`absolute inset-0 p-4 rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                         isZenMode
                           ? 'bg-white/5 border-white/5 group-hover:bg-white/[0.08] group-hover:border-white/10 group-hover:shadow-[0_15px_30px_rgba(99,102,241,0.18)]'
                           : 'bg-white border-slate-200 group-hover:border-[#4e5bff]/40 group-hover:shadow-[0_15px_35px_rgba(78,91,255,0.12)]'
                       }`}
                     >
                       <div>
                         <div className="flex items-center justify-between mb-3 pr-12">
                           <div className="flex items-center gap-2">
                             <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.type === 'citation' ? 'bg-emerald-500/10 text-emerald-550' : 'bg-indigo-500/10 text-indigo-455'}`}>
                               {item.type}
                             </div>
                             <span className="text-[9px] font-bold text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                           </div>
                         </div>
 
                         {/* Neon Index Badge in the corner */}
                         <div className={`absolute right-4 top-4 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border leading-none ${
                           item.type === 'citation'
                             ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                             : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                         }`}>
                           #{String(idx + 1).padStart(2, '0')}
                         </div>
 
                         <h5 className={`text-[12px] font-black mb-2 line-clamp-1 pr-6 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h5>
                         <p className={`text-[11px] font-medium leading-relaxed line-clamp-3 text-justify hyphens-auto ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.content}</p>
                       </div>
 
                       <div className={`flex items-center justify-between pt-2 border-t mt-auto ${isZenMode ? 'border-white/5' : 'border-slate-100'}`}>
                         <div className="flex items-center gap-1.5">
                           <Hash size={10} className="text-slate-550 animate-pulse" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-semibold">Ref: {item.source?.substring(0, 15) || 'Module'}...</span>
                         </div>
                         <span className="text-[8px] font-black uppercase tracking-widest text-[#4e5bff] group-hover:text-indigo-650 animate-pulse">Tap to Open ✦</span>
                       </div>
                     </div>
 
                     {/* BACK SIDE */}
                     <div
                       style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                       className={`absolute inset-0 p-4 rounded-2xl border flex flex-col justify-between overflow-hidden ${
                         isZenMode
                           ? 'bg-[#0e1220] border-indigo-500/20 shadow-[0_15px_30px_rgba(99,102,241,0.12)]'
                           : 'bg-white border-indigo-200 shadow-[0_15px_30px_rgba(78,91,255,0.08)]'
                       }`}
                     >
                       <div className="flex-1 flex flex-col min-h-0">
                         {/* Header controls on back */}
                         <div className="flex items-center justify-between mb-2 shrink-0">
                           <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">scholarly details</span>
                           <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                             <button
                               onClick={(e) => handleCopy(e, `${item.title}\n\n${item.content}`)}
                               className={`p-1.5 rounded-lg transition-all ${isZenMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                               title="Copy details"
                             >
                               <Copy size={11} />
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 const shareText = `**[SARA Vault Item: ${item.type.toUpperCase()}]**\nTitle: ${item.title}\nSource: ${item.source}\nSaved on: ${new Date(item.timestamp).toLocaleString()}\n\nContent:\n${item.content}`;
                                 navigator.clipboard.writeText(shareText);
                                 toast.success("Item markdown copied to clipboard!");
                               }}
                               className={`p-1.5 rounded-lg transition-all ${isZenMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                               title="Share entry"
                             >
                               <Share2 size={11} />
                             </button>
                             {item.type === 'citation' && (
                               <a
                                 href={item.source}
                                 target="_blank"
                                 rel="noreferrer"
                                 className={`p-1.5 rounded-lg transition-all ${isZenMode ? 'hover:bg-white/10 text-indigo-400 hover:text-indigo-300' : 'hover:bg-indigo-100 text-indigo-650'}`}
                                 title="Open resource link"
                               >
                                 <ExternalLink size={11} />
                               </a>
                             )}
                           </div>
                         </div>
 
                         {/* Scrollable detailed insights */}
                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 select-text">
                           <h6 className={`text-[11px] font-black mb-1 leading-snug ${isZenMode ? 'text-indigo-300' : 'text-[#4e5bff]'}`}>{item.title}</h6>
                           <p className={`text-[10px] font-medium leading-relaxed text-justify hyphens-auto ${isZenMode ? 'text-slate-350' : 'text-slate-655'}`}>{item.content}</p>
                         </div>
                       </div>
 
                       {/* Footer back controls */}
                       <div className={`flex items-center justify-between pt-2 border-t mt-2 shrink-0 ${isZenMode ? 'border-indigo-500/10' : 'border-slate-100'}`}>
                         <span className="text-[8px] font-mono text-slate-500 truncate max-w-[180px]">Src: {item.source}</span>
                         <button
                           onClick={(e) => { e.stopPropagation(); setFlippedId(null); }}
                           className="text-[8px] font-black uppercase tracking-widest text-[#4e5bff]"
                         >
                           Close ✕
                         </button>
                       </div>
                     </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`p-4 border-t shrink-0 flex items-center justify-between ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200/60 bg-slate-50/50'}`}>
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Archive Size</span>
               <span className={`text-[11px] font-black ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{filteredItems.length} Units</span>
            </div>
         </div>
         <button
           onClick={handleExportVault}
           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 cursor-pointer ${
             isZenMode
               ? 'border-white/10 text-indigo-400 hover:bg-white/5'
               : 'border-slate-200 text-[#4e5bff] hover:bg-slate-100'
           }`}
         >
           <Download size={11} />
           Export Vault
         </button>
      </div>
    </div>
  );
};

export default SARAVaultPanel;
