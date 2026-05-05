import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, Hash, Bookmark, Share2, Search } from 'lucide-react';
import { ContentCitation } from '../types';

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
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
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
         <div className={`relative flex items-center rounded-xl border ${isZenMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            <Search size={14} className="absolute left-3 text-slate-500" />
            <input 
               type="text" 
               placeholder="Search archive..." 
               className="w-full bg-transparent py-2.5 pl-10 pr-4 text-[11px] font-medium outline-none text-slate-400"
            />
         </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
             <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-700 mb-6">
                <Bookmark size={24} />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Vault is Empty</h4>
             <p className="text-[11px] font-medium text-slate-600 leading-relaxed max-w-[180px]">Save insights from SARA chat or explore module citations to build your archive.</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`group p-4 rounded-2xl border transition-all hover:scale-[1.02] ${isZenMode ? 'bg-white/5 border-white/5 hover:bg-white/[0.08]' : 'bg-white border-slate-100 hover:shadow-lg hover:shadow-indigo-500/5'}`}
              >
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.type === 'citation' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                         {item.type}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500"><Share2 size={12} /></button>
                      {item.type === 'citation' && (
                         <a href={item.source} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-400">
                            <ExternalLink size={12} />
                         </a>
                      )}
                   </div>
                </div>
                
                <h5 className={`text-[12px] font-black mb-2 line-clamp-1 ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h5>
                <p className={`text-[11px] font-medium leading-relaxed line-clamp-3 ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.content}</p>
                
                <div className="mt-4 flex items-center gap-4">
                   <div className="flex items-center gap-1.5">
                      <Hash size={10} className="text-slate-600" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Ref: {item.source.substring(0, 15)}...</span>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`p-4 border-t shrink-0 flex items-center justify-between ${isZenMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-50 bg-slate-50/30'}`}>
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Archive Size</span>
               <span className={`text-[11px] font-black ${isZenMode ? 'text-white' : 'text-slate-900'}`}>{items.length} Units</span>
            </div>
         </div>
         <button className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isZenMode ? 'border-white/10 text-indigo-400 hover:bg-white/5' : 'border-slate-200 text-[#000666] hover:bg-slate-100'}`}>Export Vault</button>
      </div>
    </div>
  );
};

export default SARAVaultPanel;
