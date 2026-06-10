import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeSandbox from '../ui/CodeSandbox';
import { SandboxState } from '../../types';

interface FloatingSandboxPanelProps {
  open: boolean;
  code: string;
  language: string;
  forceInitialCode?: boolean;
  runTrigger?: number;
  isZenMode?: boolean;
  onClose: () => void;
  onAskSara?: (prompt: string) => void;
  initialSandboxState?: SandboxState;
  onStateChange?: (state: SandboxState) => void;
}

const FloatingSandboxPanel: React.FC<FloatingSandboxPanelProps> = ({
  open,
  code,
  language,
  forceInitialCode = false,
  runTrigger = 0,
  isZenMode = false,
  onClose,
  onAskSara,
  initialSandboxState,
  onStateChange,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="floating-sandbox"
        initial={{ width: 0, opacity: 0, x: 24 }}
        animate={{ width: 400, opacity: 1, x: 0 }}
        exit={{ width: 0, opacity: 0, x: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`shrink-0 flex flex-col overflow-hidden z-30 border-l ${
          isZenMode ? 'border-white/10 bg-[#0a0c14]' : 'border-slate-200/80 bg-white shadow-xl'
        }`}
        style={{ minWidth: open ? 400 : 0 }}
      >
        <div className="flex-1 min-h-0 min-w-[400px] relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sandbox"
            className="absolute top-2 right-2 z-50 w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] shadow-sm transition-transform hover:scale-110"
          />
          <CodeSandbox
            initialCode={code}
            initialLanguage={language}
            forceInitialCode={forceInitialCode}
            runTrigger={runTrigger}
            onClose={onClose}
            isZenMode={isZenMode}
            onAskSara={onAskSara}
            initialSandboxState={initialSandboxState}
            onStateChange={onStateChange}
          />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default FloatingSandboxPanel;
