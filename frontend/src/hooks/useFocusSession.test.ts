import { renderHook, act, fireEvent } from '@testing-library/react';
import { useFocusSession } from './useFocusSession';

describe('useFocusSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should not activate sidebar ghost when isZenMode is false', () => {
    const { result } = renderHook(() => useFocusSession(false));

    expect(result.current.isSidebarGhost).toBe(false);

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isSidebarGhost).toBe(false);
  });

  it('should activate sidebar ghost after 5s of inactivity when isZenMode is true', () => {
    const { result } = renderHook(() => useFocusSession(true));

    expect(result.current.isSidebarGhost).toBe(false);

    // Fast-forward 4.9 seconds
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(result.current.isSidebarGhost).toBe(false);

    // Fast-forward 0.1 seconds to reach 5s
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isSidebarGhost).toBe(true);
  });

  it('should reset inactivity timer on user interactions in Zen Mode', () => {
    const { result } = renderHook(() => useFocusSession(true));

    expect(result.current.isSidebarGhost).toBe(false);

    // Fast-forward 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Simulate mouse move
    act(() => {
      fireEvent.mouseMove(window);
    });

    // Fast-forward another 4 seconds (total 8s, but reset happened)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.isSidebarGhost).toBe(false);

    // Now wait 5 full seconds without interaction
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.isSidebarGhost).toBe(true);

    // Keydown should also reset and turn off ghost mode
    act(() => {
      fireEvent.keyDown(window);
    });
    expect(result.current.isSidebarGhost).toBe(false);
  });

  it('should clean up event listeners and timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useFocusSession(true));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should calculate scroll progress correctly', () => {
    const { result } = renderHook(() => useFocusSession(false));

    expect(result.current.scrollProgress).toBe(0);

    // Mock document properties for scrolling
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 50, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 200, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 100, configurable: true });

    act(() => {
      fireEvent.scroll(window);
    });

    // scrolled = 50, total = 200 - 100 = 100. (50 / 100) * 100 = 50
    expect(result.current.scrollProgress).toBe(50);
  });
});
