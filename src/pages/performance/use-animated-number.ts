import { useEffect, useRef, useState } from 'react';

export const useAnimatedNumber = (target: number | null, durationMs = 1800) => {
  const [display, setDisplay] = useState(target ?? 0);
  const displayRef = useRef(target ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const from = displayRef.current;
    const delta = target - from;
    let start: number | null = null;

    if (!delta) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    /* Snap rather than animate when no frames are coming.
       `requestAnimationFrame` does not fire in a hidden tab, and this hook has
       no other way of reaching its target — so a figure that changed while the
       dashboard sat in a background tab stayed frozen at the last value it had
       animated to. On a wall display or a second monitor that is exactly where
       this page lives, and a stale number is worse than an unanimated one.
       Reduced-motion gets the same treatment, which it should have had anyway:
       counting up is decoration, and the value is the content. */
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (document.hidden || prefersReducedMotion) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + delta * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return display;
};
