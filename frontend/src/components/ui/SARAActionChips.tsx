import React from 'react';
import { Sparkles, BookOpen, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface SARAActionChipsProps {
  onAction: (action: string) => void;
  isZenMode?: boolean;
}

const SARAActionChips: React.FC<SARAActionChipsProps> = ({ onAction, isZenMode }) => {
  const chips = [
    { 
      label: 'Summarize', 
      desc: 'Get key takeaways',
      icon: <BookOpen size={13} />, 
      prompt: 'Provide a concise, high-yield summary of this page.',
      colorClass: isZenMode 
        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
        : 'bg-blue-50/70 border-blue-100/80 text-blue-700 hover:bg-blue-100/90 shadow-sm shadow-blue-500/5',
      iconColor: isZenMode ? 'text-blue-400' : 'text-blue-600'
    },
    { 
      label: 'Explain Concepts', 
      desc: 'Simplify complex ideas',
      icon: <Sparkles size={13} />, 
      prompt: 'Explain the core technical concepts of this module in simple terms.',
      colorClass: isZenMode 
        ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20' 
        : 'bg-violet-50/70 border-violet-100/80 text-violet-700 hover:bg-violet-100/90 shadow-sm shadow-violet-500/5',
      iconColor: isZenMode ? 'text-violet-400' : 'text-violet-600'
    },
    { 
      label: 'Quiz Me', 
      desc: 'Mastery check',
      icon: <Zap size={13} />, 
      prompt: 'Give me a quick 3-question mastery check based on what I just read.',
      colorClass: isZenMode 
        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
        : 'bg-amber-50/70 border-amber-100/80 text-amber-700 hover:bg-amber-100/90 shadow-sm shadow-amber-500/5',
      iconColor: isZenMode ? 'text-amber-400' : 'text-amber-600'
    },
    { 
      label: 'Next Steps', 
      desc: 'What to learn next',
      icon: <Target size={13} />, 
      prompt: 'What should I focus on next to master this module?',
      colorClass: isZenMode 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
        : 'bg-emerald-50/70 border-emerald-100/80 text-emerald-700 hover:bg-emerald-100/90 shadow-sm shadow-emerald-500/5',
      iconColor: isZenMode ? 'text-emerald-400' : 'text-emerald-600'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-3 px-1">
      {chips.map((chip, idx) => (
        <motion.button
          key={chip.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.35, type: 'spring', stiffness: 100 }}
          onClick={() => onAction(chip.prompt)}
          className={`action-chip flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left cursor-pointer ${chip.colorClass}`}
        >
          <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider">
            <span className={chip.iconColor}>{chip.icon}</span>
            <span>{chip.label}</span>
          </div>
          <span className={`text-[9px] font-medium leading-none ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {chip.desc}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default SARAActionChips;
