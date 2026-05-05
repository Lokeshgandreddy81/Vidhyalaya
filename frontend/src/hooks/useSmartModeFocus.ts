import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSmartModeFocus
 * Manages the SmartMode 2.0 focus behaviours:
 * - Space key "Spatial Peek": hold Space → smartboard expands, release → snap back
 * - Reading pace tracker: detects if user is paused (>3s) or scrolling fast
 * - Glass Command Bar visibility (auto-show after 2s idle, hide during scroll burst)
 */

export type ReadingPace = 'fast' | 'paused';

export interface SmartModeFocusState {
  isSpatialPeeking: boolean;       // Space held down
  readingPace: ReadingPace;        // 'fast' | 'paused'
  isCommandBarVisible: boolean;    // Glass Command Bar
  notifyScroll: (deltaY: number) => void;
}

export function useSmartModeFocus(isZenMode: boolean): SmartModeFocusState {
  const [isSpatialPeeking, setIsSpatialPeeking] = useState(false);
  const [readingPace, setReadingPace] = useState<ReadingPace>('paused');
  const [isCommandBarVisible, setIsCommandBarVisible] = useState(false);

  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTime = useRef<number>(0);

  // Space key → Spatial Peek
  useEffect(() => {
    if (!isZenMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpatialPeeking(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpatialPeeking(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isZenMode]);

  // Reading pace detection via scroll delta
  const notifyScroll = useCallback((deltaY: number) => {
    const now = Date.now();
    const timeSinceLast = now - lastScrollTime.current;
    lastScrollTime.current = now;

    // Fast scroll = large delta or very rapid events
    const isFast = Math.abs(deltaY) > 60 || timeSinceLast < 200;
    setReadingPace(isFast ? 'fast' : 'paused');

    // Reset to "paused" after 3s of no scroll
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setReadingPace('paused'), 3000);

    // Hide command bar during fast scroll, show when paused
    setIsCommandBarVisible(!isFast);
    if (barTimer.current) clearTimeout(barTimer.current);
    if (isFast) {
      barTimer.current = setTimeout(() => setIsCommandBarVisible(true), 2500);
    }
  }, []);

  // Always show command bar after 2s of no activity
  useEffect(() => {
    const show = setTimeout(() => setIsCommandBarVisible(true), 2000);
    return () => clearTimeout(show);
  }, []);

  return { isSpatialPeeking, readingPace, isCommandBarVisible, notifyScroll };
}
