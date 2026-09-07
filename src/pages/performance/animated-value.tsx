import { useAnimatedNumber } from './use-animated-number';

/**
 * A KPI figure that counts to its new value.
 *
 * The animation used to run in the `Performance` component itself: seven
 * `useAnimatedNumber` hooks side by side, each calling `setState` on every
 * `requestAnimationFrame` for 1.8 seconds after a figure moved. Because that
 * state lived at page level, every one of those frames re-rendered the whole
 * page — the KPI band, the open tab and whatever table was inside it — to
 * repaint a number in one tile.
 *
 * Holding the animating state down here means a frame re-renders one span.
 * The arithmetic is unchanged, and so is what the viewer sees.
 *
 * A note on why this was worth doing on evidence rather than instinct: demo
 * data is static, so `delta` is zero, the hook returns before scheduling a
 * frame, and none of this cost is reproducible outside a live tenant. The fix
 * is cheap and directional either way — it cannot cost more than the version
 * it replaces — but the size of the win is genuinely unknown until it runs
 * against moving figures.
 */
const AnimatedValue = ({
  value,
  format,
  fallback = '—',
}: {
  value: number | null;
  format: (value: number) => string;
  /** Shown when the metric has no value at all, as distinct from zero. */
  fallback?: string;
}) => {
  const animated = useAnimatedNumber(value);
  if (value === null) return <>{fallback}</>;
  return <>{format(animated)}</>;
};

export default AnimatedValue;
