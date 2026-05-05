import React from 'react';
import { Sparkles, BookOpen, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface SARAActionChipsProps {
  onAction: (action: string) => void;
  isZenMode?: boolean;
}

const SARAActionChips: React.FC<SARAActionChipsProps> = ({ onAction, isZenMode }) => {
  const chips = [
    { label: 'Summarize', icon: <BookOpen size={12} />, prompt: 'Provide a concise, high-yield summary of this page.' },
    { label: 'Explain', icon: <Sparkles size={12} />, prompt: 'Explain the core technical concepts of this module in simple terms.' },
    { label: 'Quiz Me', icon: <Zap size={12} />, prompt: 'Give me a quick 3-question mastery check based on what I just read.' },
    { label: 'Next Steps', icon: <Target size={12} />, prompt: 'What should I focus on next to master this module?' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4 px-1">
      {chips.map((chip, idx) => (
        <motion.button
          key={chip.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4, type: 'spring' }}
          onClick={() => onAction(chip.prompt)}
          className={`action-chip flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
            isZenMode 
              ? 'text-indigo-400 border-white/5 hover:bg-white/10' 
              : 'text-[#000666] border-slate-100 hover:bg-slate-50'
          }`}
        >
          {chip.icon}
          {chip.label}
        </motion.button>
      ))}
    </div>
  );
};

export default SARAActionChips;
