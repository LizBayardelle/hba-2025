import { useRef, useState, useCallback, useEffect } from 'react';

const useSwipeToDismiss = (onDismiss) => {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const tracking = useRef(false);
  const decided = useRef(false);
  const entryGuard = useRef(false);

  // Block touch tracking for 300ms after mount (entry animation)
  useEffect(() => {
    entryGuard.current = true;
    const timer = setTimeout(() => {
      entryGuard.current = false;
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const reset = useCallback(() => {
    setTranslateX(0);
    setIsAnimating(false);
    setIsDismissing(false);
    tracking.current = false;
    decided.current = false;
  }, []);

  const onTouchStart = useCallback((e) => {
    if (entryGuard.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    tracking.current = false;
    decided.current = false;
    setIsAnimating(false);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (entryGuard.current || isDismissing) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX.current;
    const dy = currentY - startY.current;

    // Wait for 10px of movement before deciding direction
    if (!decided.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      decided.current = true;
      // Horizontal must dominate vertical by 1.5x ratio
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0) {
        tracking.current = true;
      } else {
        tracking.current = false;
        return;
      }
    }

    if (!tracking.current) return;

    // Prevent vertical scrolling while swiping
    e.preventDefault();

    // Only allow rightward (clamp at 0)
    const offset = Math.max(0, dx);
    setTranslateX(offset);
  }, [isDismissing]);

  const onTouchEnd = useCallback(() => {
    if (!tracking.current || isDismissing) {
      tracking.current = false;
      decided.current = false;
      return;
    }

    const screenWidth = window.innerWidth;
    const elapsed = Date.now() - startTime.current;
    const velocity = translateX / Math.max(elapsed, 1); // px/ms

    const pastThreshold = translateX > screenWidth * 0.35;
    const fastFlick = velocity > 0.5;

    setIsAnimating(true);

    if (pastThreshold || fastFlick) {
      // Dismiss — slide fully off screen
      setTranslateX(screenWidth);
      setIsDismissing(true);
      setTimeout(() => {
        onDismiss?.();
        // Reset after dismiss callback
        setTimeout(reset, 50);
      }, 250);
    } else {
      // Snap back
      setTranslateX(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, 250);
    }

    tracking.current = false;
    decided.current = false;
  }, [translateX, isDismissing, onDismiss, reset]);

  const handlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  return { translateX, isAnimating, isDismissing, handlers, reset };
};

export default useSwipeToDismiss;
