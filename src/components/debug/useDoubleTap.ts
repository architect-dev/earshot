import { useRef, useCallback } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  delay?: number; // Max time between taps in ms
}

export function useDoubleTap({ onDoubleTap, delay = 300 }: UseDoubleTapOptions) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Double tap detected
      onDoubleTap();
      lastTapRef.current = 0; // Reset to prevent triple tap
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap, delay]);

  return handleTap;
}
