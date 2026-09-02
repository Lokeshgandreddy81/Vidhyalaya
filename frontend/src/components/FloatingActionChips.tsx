import React from 'react';
import { motion } from 'framer-motion';

interface FloatingActionChipsProps {
  onAction: (action: string) => void;
}

const actions = [
  { label: 'Explain with D3', id: 'd3' },
  { label: 'Summarize', id: 'summary' },
  { label: 'Generate Quiz', id: 'quiz' },
];

export const FloatingActionChips: React.FC<FloatingActionChipsProps> = ({ onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -top-16 left-0 right-0 flex gap-2 p-2 backdrop-blur-md bg-white/80 border border-white/20 shadow-lg rounded-xl z-10"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
        >
          {action.label}
        </button>
      ))}
    </motion.div>
  );
};
