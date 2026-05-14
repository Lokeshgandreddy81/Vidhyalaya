import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── High-Tech Skeleton Preloader ───────────────────────────────────────── 
   No spinning circles. No infinity paths. Just data loading — because 
   that's what Big AI products actually show.
──────────────────────────────────────────────────────────────────────────── */

const STAGES = [
  'Initializing runtime',
  'Loading model weights',
  'Connecting to inference engine',
  'Building interface',
  'Ready',
];

const Preloader = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setTimeout(onComplete, 400);
      }
      setProgress(Math.floor(p));
      setStage(Math.min(Math.floor((p / 100) * STAGES.length), STAGES.length - 1));
    }, 60);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[1000] bg-[#09090b] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-xs px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold">
            V
          </div>
          <span className="text-[13px] font-semibold text-white tracking-tight">
            vidhyal.ai
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              style={{ boxShadow: '0 0 10px rgba(99,102,241,0.4)' }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-zinc-500 mono">
              {STAGES[stage]}
            </span>
            <span className="text-[11px] text-zinc-600 mono tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Preloader;
