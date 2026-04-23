import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const CROWN_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

function burst() {
  const base = {
    particleCount: 8,
    spread: 40,
    colors: CROWN_COLORS,
    ticks: 120,
    gravity: 0.8,
    scalar: 0.85,
    startVelocity: 25,
  };
  confetti({ ...base, origin: { x: 0.2, y: 1 }, angle: 75 });
  confetti({ ...base, origin: { x: 0.8, y: 1 }, angle: 105 });
}

export function useConfetti() {
  const elementRef = useRef<Element | null>(null);

  // useCallback makes the ref callback stable across renders.
  // Without it, React would call it with null + element on every render,
  // triggering a new observer each time.
  const ref = useCallback((el: Element | null) => {
    elementRef.current = el;
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let fired = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fired) {
          fired = true;
          burst();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);

    // Cleanup: disconnect if the component unmounts before the observer fires.
    // Without this, the observer holds a reference to the element indefinitely.
    return () => observer.disconnect();
  }, []);

  return { ref, fire: burst };
}
