import { useState, useEffect } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Uses a cubic ease-out curve — fast start, smooth landing.
 * Resets and replays whenever `target` changes (e.g. on data refresh).
 */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return; // initial state is already 0

    let rafId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out: decelerates toward the end
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}
