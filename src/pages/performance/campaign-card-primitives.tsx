import { useEffect, useState } from 'react';

/**
 * Small hand-rolled SVG/CSS pieces shared by Performance ▸ Campaigns' KPI
 * strip and analytics cards — plain SVG rather than pulling recharts in for
 * a 54px ring or an 8-point sparkline it isn't built for.
 */

/**
 * Counts up from 0 to `target` on mount and on every change — a separate,
 * smaller hook from the page's own `useAnimatedNumber` (animated-value.tsx),
 * which deliberately starts already-at-target on mount (a live KPI band
 * shouldn't replay from 0 on every tab switch). These four cards are a
 * one-time reveal, not a live band, so counting up from 0 is the effect
 * actually wanted here.
 */
const useCountUp = (target: number, durationMs = 1000) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion || document.hidden) {
      setDisplay(target);
      return;
    }

    let raf: number;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
};

export const CountUp = ({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 1000,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) => {
  const display = useCountUp(value, duration);
  return <>{format(display)}</>;
};

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/** A borderless area+line sparkline over a small, real value series (no
 * axes — this is a glance-level shape, not a chart to read values off). */
export const Sparkline = ({
  data,
  color,
  height = 30,
  width = 100,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((value, i) => `${i * step},${height - ((value - min) / range) * height}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="ca-spark" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={areaPoints} fill={color} opacity={0.14} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** A single circular progress arc (0–100), track + coloured sweep. Text in
 * the middle is the caller's job — this only draws the ring. */
export const RingStat = ({
  value,
  color,
  trackColor = 'rgba(148,124,102,0.16)',
  size = 54,
  thickness = 6,
}: {
  value: number;
  color: string;
  trackColor?: string;
  size?: number;
  thickness?: number;
}) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ca-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="ca-ring-arc"
      />
    </svg>
  );
};

/** Overlapping initials circles for a handful of real names, "+N" beyond
 * `max` — used where a full list would be too wide (the KPI strip), not a
 * substitute for the actual roster shown elsewhere on this tab. */
export const AvatarStack = ({ names, max = 4 }: { names: string[]; max?: number }) => {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="ca-avatars">
      {shown.map((name, i) => (
        <span key={name + i} className="ca-avatar" style={{ zIndex: max - i }}>
          {initialsOf(name)}
        </span>
      ))}
      {extra > 0 && <span className="ca-avatar ca-avatar-more">+{extra}</span>}
    </div>
  );
};
