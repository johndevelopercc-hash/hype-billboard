import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

// Replace requestAnimationFrame with a synchronous stub so tests are
// deterministic and don't depend on actual browser frame timing.
let rafCallback: FrameRequestCallback | null = null;

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    },
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('performance', { now: vi.fn(() => 0) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  rafCallback = null;
});

function tick(ms: number) {
  // Simulate the browser calling the rAF callback at `ms` milliseconds
  vi.mocked(performance.now).mockReturnValue(ms);
  act(() => {
    rafCallback?.(ms);
  });
}

describe('useCountUp', () => {
  it('starts at 0 before any animation frame fires', () => {
    const { result } = renderHook(() => useCountUp(0.5, 1000));
    expect(result.current).toBe(0);
  });

  it('returns 0 immediately and stays at 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0, 1000));
    expect(result.current).toBe(0);
    // No rAF scheduled — nothing to tick
    expect(rafCallback).toBeNull();
  });

  it('animates toward the target value as frames progress', () => {
    const { result } = renderHook(() => useCountUp(1, 1000));

    tick(500); // halfway through the animation
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1);
  });

  it('reaches the target value when the full duration has elapsed', () => {
    const { result } = renderHook(() => useCountUp(0.3079, 1000));

    tick(1000); // full duration
    expect(result.current).toBeCloseTo(0.3079, 4);
  });

  it('does not exceed the target value (easing stays within bounds)', () => {
    const { result } = renderHook(() => useCountUp(0.5, 1000));

    tick(500);
    tick(1000);
    tick(1200); // past the end — should be clamped

    expect(result.current).toBeLessThanOrEqual(0.5);
  });

  it('resets and re-animates when the target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, 1000),
      { initialProps: { target: 0.5 } },
    );

    tick(1000); // complete first animation
    expect(result.current).toBeCloseTo(0.5, 4);

    rerender({ target: 0.9 }); // new target — animation restarts
    tick(0);  // first frame of new animation
    expect(result.current).toBeLessThan(0.9);
  });
});
