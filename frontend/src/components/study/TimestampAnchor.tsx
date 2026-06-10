import React from 'react';
import { useClassroomPlayback } from '../../context/ClassroomPlaybackContext';
import { Play } from 'lucide-react';

interface TimestampAnchorProps {
  seconds: number;
  label: string;
}

export const TimestampAnchor: React.FC<TimestampAnchorProps> = ({ seconds, label }) => {
  const { seekToTimestamp, currentTimestamp } = useClassroomPlayback();
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isActive = Math.abs(currentTimestamp - seconds) < 5;

  return (
    <button
      onClick={() => seekToTimestamp(seconds)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all border cursor-pointer ${
        isActive 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-black shadow-sm' 
          : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      <Play size={8} className={isActive ? 'text-blue-400 fill-blue-400' : 'text-zinc-500'} />
      <span>{label}</span>
      <span className="opacity-40">({formatTime(seconds)})</span>
    </button>
  );
};

export default TimestampAnchor;
