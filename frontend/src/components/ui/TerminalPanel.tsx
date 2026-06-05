import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronUp, ChevronDown, Activity, Sparkles } from 'lucide-react';
import { ShellTerminal } from './ShellTerminal';
import { TerminalHUD } from './TerminalHUD';

interface TerminalPanelProps {
  moduleTopic?: string;
  keyConcepts?: string[];
  isReadOnly?: boolean;
  editorFiles: any[];
  setEditorFiles: React.Dispatch<React.SetStateAction<any[]>>;
  selectedEditorFile: string;
  setSelectedEditorFile: React.Dispatch<React.SetStateAction<string>>;
  isServerRunning: boolean;
  setIsServerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkspaceTab: React.Dispatch<React.SetStateAction<any>>;
  setRightPaneState: React.Dispatch<React.SetStateAction<any>>;
  setBrowserUrl: React.Dispatch<React.SetStateAction<string>>;
  setBrowserHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setBrowserHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  loading?: boolean;
  onAskSara?: (context: string) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  moduleTopic,
  keyConcepts,
  isReadOnly,
  editorFiles,
  setEditorFiles,
  selectedEditorFile,
  setSelectedEditorFile,
  isServerRunning,
  setIsServerRunning,
  setWorkspaceTab,
  setRightPaneState,
  setBrowserUrl,
  setBrowserHistory,
  setBrowserHistoryIndex,
  loading,
  onAskSara,
}) => {
  const [height, setHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cortex-terminal-height');
      return saved ? parseInt(saved, 10) : 320;
    } catch {
      return 320;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cortex-terminal-collapsed');
      return saved ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const isResizing = useRef<boolean>(false);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('cortex-terminal-height', height.toString());
    } catch {}
  }, [height]);

  useEffect(() => {
    try {
      localStorage.setItem('cortex-terminal-collapsed', isCollapsed.toString());
    } catch {}
  }, [isCollapsed]);

  // Shortcut Listener for Ctrl+`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight >= 180 && newHeight <= 600) {
      setHeight(newHeight);
    }
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  return (
    <div className="w-full flex flex-col shrink-0 relative z-30 select-none bg-[#161616] border-t border-white/[0.04]">
      {/* Resizing Handle Bar (Active only when expanded) */}
      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          className="h-1.5 w-full bg-white/[0.02] hover:bg-emerald-500/30 active:bg-emerald-500/50 cursor-ns-resize transition-colors duration-150 absolute top-0 left-0 right-0 z-50 flex items-center justify-center group"
          title="Drag to resize terminal panel"
        >
          <div className="w-12 h-1 rounded bg-white/10 group-hover:bg-emerald-400/40 transition-colors" />
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {isCollapsed ? (
          /* Exercise Status Bar (Collapsed State) */
          <motion.div
            key="collapsed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-between px-4 py-2 bg-[#1a1a1a] hover:bg-[#202020] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-300 font-mono">Terminal (Collapsed)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] text-slate-500 font-mono">Press Ctrl+` to expand</span>
              <ChevronUp size={12} className="text-slate-400" />
            </div>
          </motion.div>
        ) : (
          /* Expanded State */
          <motion.div
            key="expanded"
            initial={{ height: 36, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 36, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full flex flex-col overflow-hidden pt-1.5"
          >
            {/* Header Bar */}
            <div className="w-full flex items-center justify-between px-4 py-2 bg-[#1a1a1a]/80 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 font-mono">Cortex AI Coach Terminal</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[8px] opacity-60 font-mono text-slate-300">Ctrl+` to Collapse</span>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-0.5 rounded hover:bg-white/5 hover:text-white transition-colors"
                  title="Collapse Terminal Panel"
                  aria-label="Collapse terminal panel"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>

            {/* Heads-up display (HUD) for missions and scenarios */}
            <TerminalHUD onAskSara={onAskSara} />
            
            {/* Inner Shell Component */}
            <div className="flex-1 min-h-0 min-w-0 bg-[#161616]">
              <ShellTerminal
                terminalHistory={terminalHistory}
                setTerminalHistory={setTerminalHistory}
                isReadOnly={isReadOnly}
                editorFiles={editorFiles}
                setEditorFiles={setEditorFiles}
                selectedEditorFile={selectedEditorFile}
                setSelectedEditorFile={setSelectedEditorFile}
                isServerRunning={isServerRunning}
                setIsServerRunning={setIsServerRunning}
                setWorkspaceTab={setWorkspaceTab}
                setRightPaneState={setRightPaneState}
                setBrowserUrl={setBrowserUrl}
                setBrowserHistory={setBrowserHistory}
                setBrowserHistoryIndex={setBrowserHistoryIndex}
                loading={loading}
                moduleTopic={moduleTopic}
                keyConcepts={keyConcepts}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
