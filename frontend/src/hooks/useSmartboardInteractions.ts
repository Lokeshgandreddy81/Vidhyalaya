import { useState, useCallback, useRef } from 'react';

/**
 * useSmartboardInteractions
 * Manages the three Luminous Board interactions:
 * 1. Aura Ripple — triggered when the board receives a new signal (video change / AI update)
 * 2. Focus Zoom  — double-tap toggles 80% screen overlay mode
 * 3. Mini-Map Bar — hover-reveal interaction controls
 */

export interface SmartboardInteractions {
  // Aura Ripple
  isRippling: boolean;
  triggerRipple: () => void;

  // Focus Zoom
  isFocusZoomed: boolean;
  toggleFocusZoom: () => void;

  // Mini-Map Bar (hover reveal)
  isBarVisible: boolean;
  showBar: () => void;
  hideBar: () => void;
}

export function useSmartboardInteractions(): SmartboardInteractions {
  const [isRippling, setIsRippling] = useState(false);
  const [isFocusZoomed, setIsFocusZoomed] = useState(false);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aura Ripple — emits a 900ms pulse then resets
  const triggerRipple = useCallback(() => {
    if (rippleTimer.current) clearTimeout(rippleTimer.current);
    setIsRippling(true);
    rippleTimer.current = setTimeout(() => setIsRippling(false), 900);
  }, []);

  // Focus Zoom toggle
  const toggleFocusZoom = useCallback(() => {
    setIsFocusZoomed(prev => !prev);
  }, []);

  // Mini-Map bar — debounced hide
  const showBar = useCallback(() => {
    if (barTimer.current) clearTimeout(barTimer.current);
    setIsBarVisible(true);
  }, []);

  const hideBar = useCallback(() => {
    barTimer.current = setTimeout(() => setIsBarVisible(false), 600);
  }, []);

  return { isRippling, triggerRipple, isFocusZoomed, toggleFocusZoom, isBarVisible, showBar, hideBar };
}
