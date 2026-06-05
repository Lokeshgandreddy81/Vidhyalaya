/**
 * @deprecated Replaced by honest loading states. Kept for backward compatibility.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export type ActionType = 'refresh' | 'flashcards' | 'quiz';

interface AITerminalOverlayProps {
  isOpen: boolean;
  actionType?: ActionType;
  topic?: string;
  message?: string;
  onComplete?: (data: unknown) => void;
  onClose?: () => void;
  executor?: () => Promise<unknown>;
}

const LABELS: Record<ActionType, string> = {
  refresh: 'Preparing refresh…',
  flashcards: 'Building flashcards…',
  quiz: 'Generating quiz…',
};

const AITerminalOverlay: React.FC<AITerminalOverlayProps> = ({
  isOpen,
  actionType = 'quiz',
  message,
  onClose,
  executor,
  onComplete,
}) => {
  React.useEffect(() => {
    if (!isOpen || !executor) return;
    let cancelled = false;
    executor()
      .then((result) => { if (!cancelled) onComplete?.(result); })
      .catch(() => { if (!cancelled) onClose?.(); });
    return () => { cancelled = true; };
  }, [isOpen, executor, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3 min-w-[240px]">
        <Loader2 size={24} className="animate-spin text-[#000666]" />
        <p className="text-sm font-medium text-slate-700">{message || LABELS[actionType]}</p>
        {onClose && (
          <button onClick={onClose} className="text-[11px] text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default AITerminalOverlay;
