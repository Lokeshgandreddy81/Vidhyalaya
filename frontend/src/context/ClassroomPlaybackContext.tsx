import React, { createContext, useContext, useRef, useState } from 'react';

interface PlaybackContextType {
  playerRef: React.MutableRefObject<any>;
  currentTimestamp: number;
  activeChapter: string;
  seekToTimestamp: (seconds: number) => void;
  updateLivePlayback: (seconds: number, chapterTitle: string) => void;
}

const ClassroomPlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const ClassroomPlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const playerRef = useRef<any>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [activeChapter, setActiveChapter] = useState('');

  const seekToTimestamp = (seconds: number) => {
    // Check if playerRef has the internal YouTube player or a seekTo function directly
    if (playerRef.current?.internalPlayer?.seekTo) {
      playerRef.current.internalPlayer.seekTo(seconds, true);
    } else if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true);
    }
  };

  const updateLivePlayback = (seconds: number, chapterTitle: string) => {
    setCurrentTimestamp(seconds);
    setActiveChapter(chapterTitle);
  };

  return (
    <ClassroomPlaybackContext.Provider value={{ playerRef, currentTimestamp, activeChapter, seekToTimestamp, updateLivePlayback }}>
      {children}
    </ClassroomPlaybackContext.Provider>
  );
};

export const useClassroomPlayback = () => {
  const context = useContext(ClassroomPlaybackContext);
  if (!context) throw new Error('useClassroomPlayback must be wrapped in a ClassroomPlaybackProvider');
  return context;
};
