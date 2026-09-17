import { useEffect, useRef, useState } from 'react';

const SAMPLE_INTERVAL_MS = 60_000; // one point a minute
const HISTORY_WINDOW_MS = 40 * 60_000; // keep the last 40 minutes
const TREND_WINDOW_MS = 30 * 60_000; // "vs last 30 min" compares against this

export type HistoryPoint = { t: number; v: number };
export type Trend = { pct: number; direction: 'up' | 'down' | 'flat' };

/**
 * A small rolling in-memory history per KPI, sampled once a minute from
 * whatever value is passed in right now — there's no historical report
 * endpoint behind these live-only figures (queue waiting count, current
 * service level, ...), so this is what backs both the tile sparklines and
 * the "vs last 30 min" trend chip. Real numbers, accumulated over this
 * browser tab's own session: it starts empty on every page load, and the
 * trend only appears once ~30 minutes of samples actually exist rather
 * than inventing one early.
 */
export const useKpiHistory = (values: Record<string, number | null>) => {
  const historyRef = useRef<Record<string, HistoryPoint[]>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [, setTick] = useState(0);

  useEffect(() => {
    const sample = () => {
      const now = Date.now();
      Object.entries(valuesRef.current).forEach(([key, value]) => {
        if (value === null || Number.isNaN(value)) return;
        const list = historyRef.current[key] || [];
        list.push({ t: now, v: value });
        historyRef.current[key] = list.filter((point) => now - point.t <= HISTORY_WINDOW_MS);
      });
      setTick((t) => t + 1);
    };
    sample();
    const id = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const getHistory = (key: string): HistoryPoint[] => historyRef.current[key] || [];

  const getTrend = (key: string): Trend | null => {
    const list = historyRef.current[key] || [];
    if (list.length < 2) return null;
    const now = Date.now();
    const latest = list[list.length - 1];
    const baseline = list.find((point) => now - point.t >= TREND_WINDOW_MS * 0.9);
    if (!baseline) return null;
    if (baseline.v === 0 && latest.v === 0) return { pct: 0, direction: 'flat' };
    if (baseline.v === 0) return { pct: 100, direction: 'up' };
    const pct = ((latest.v - baseline.v) / Math.abs(baseline.v)) * 100;
    return {
      pct: Math.round(Math.abs(pct)),
      direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat',
    };
  };

  return { getHistory, getTrend };
};

export default useKpiHistory;
