import type { ReactNode } from 'react';
import type { Trend } from './use-trend';

/**
 * "Waiting" and "Longest wait" are the two numbers a supervisor glances at
 * to decide whether to act right now — everything else on the KPI band is
 * a status check. Sizing them up and ringing them when they breach lets
 * that triage happen in the time it takes to look at the screen, instead of
 * reading eight same-size tiles to find the one that matters.
 */
const HeroStatCard = ({
  label,
  value,
  sub,
  breaching = false,
  trend,
  /** true when an increase is the bad direction for this metric (waiting
   *  calls, handle time) — false would be for a metric where up is good. */
  trendBadWhenUp = true,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  breaching?: boolean;
  trend?: Trend;
  trendBadWhenUp?: boolean;
  icon?: any;
}) => {
  const trendIsBad = trend && trend !== 'flat' && (trend === 'up') === trendBadWhenUp;
  const trendIsGood = trend && trend !== 'flat' && !trendIsBad;

  return (
    <div className={`stat hero-stat${breaching ? ' hero-stat-breach' : ''}`}>
      {/* Sized up to actually use the card's width, and coloured with the
          breach state rather than sitting there as neutral decoration. */}
      {Icon && (
        <span className={`hero-stat-icon${breaching ? ' hero-stat-icon-breach' : ''}`}>
          <Icon style={{ width: 22, height: 22 }} />
        </span>
      )}
      <div className="k">{label}</div>
      <div className="hero-stat-value-row">
        <span className="v num hero-stat-value">{value}</span>
        {trend && trend !== 'flat' && (
          <span
            className={`hero-stat-trend${trendIsBad ? ' bad' : ''}${trendIsGood ? ' good' : ''}`}
            aria-label={trend === 'up' ? 'trending up' : 'trending down'}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {sub && <div className="d">{sub}</div>}
    </div>
  );
};

export default HeroStatCard;
