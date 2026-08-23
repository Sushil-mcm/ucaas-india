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
