import { useEffect, useRef, useState } from 'react';

export type Trend = 'up' | 'down' | 'flat';

/**
 * Compares the latest value against the one before it, so a KPI can show
 * which way it's moving rather than just where it sits right now — on a
 * page that refetches every 2s, direction is the more useful signal than a
 * snapshot. Holds the last direction until the value actually changes again,
 * rather than resetting to "flat" between ticks that happen to repeat.
 */
export const useTrend = (value: number | null): Trend => {
  const previousRef = useRef<number | null>(null);
  const [trend, setTrend] = useState<Trend>('flat');

  useEffect(() => {
    if (value === null) return;
    const previous = previousRef.current;
    if (previous !== null && value !== previous) {
      setTrend(value > previous ? 'up' : 'down');
    }
    previousRef.current = value;
  }, [value]);

  return trend;
};
