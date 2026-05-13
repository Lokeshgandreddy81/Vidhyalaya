import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FocusContextType {
  isZenMode: boolean;
  setIsZenMode: (val: boolean) => void;
  isSidekickDocked: boolean;
  setIsSidekickDocked: (val: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (val: boolean) => void;
  highlightedText: string;
  setHighlightedText: (val: string) => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSidekickDocked, setIsSidekickDocked] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');

  return (
    <FocusContext.Provider
      value={{
        isZenMode,
        setIsZenMode,
        isSidekickDocked,
        setIsSidekickDocked,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        highlightedText,
        setHighlightedText,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = (): FocusContextType => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};
