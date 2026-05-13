import { useState, useEffect, useCallback, useRef } from 'react';

interface FocusSessionState {
  isSidebarGhost: boolean;  // Sidebar fades to 10% after 5s of inactivity
  scrollProgress: number;   // 0–100 float for progress bar
  resetInactivity: () => void;
}

export function useFocusSession(isZenMode: boolean): FocusSessionState {
  const [isSidebarGhost, setIsSidebarGhost] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivity = useCallback(() => {
    setIsSidebarGhost(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isZenMode) return;
    timerRef.current = setTimeout(() => setIsSidebarGhost(true), 5000);
  }, [isZenMode]);

  // Ghost Sidebar — starts timer when Zen Mode is active
  useEffect(() => {
    if (!isZenMode) {
      setIsSidebarGhost(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    resetInactivity();
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivity));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isZenMode, resetInactivity]);

  // Scroll Progress Tracker
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { isSidebarGhost, scrollProgress, resetInactivity };
}
