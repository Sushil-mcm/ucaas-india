import type { ReactNode } from 'react';
import type { Trend } from './use-trend';

type Metric = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  trend?: Trend;
  trendBadWhenUp?: boolean;
};

const TONE_STYLE: Record<NonNullable<Metric['tone']>, string | undefined> = {
  default: undefined,
  warning: 'var(--warn)',
  danger: 'var(--crit)',
  success: 'var(--live)',
};

const MetricBlock = ({ label, value, tone = 'default', trend, trendBadWhenUp = true }: Metric) => {
  const trendIsBad = trend && trend !== 'flat' && (trend === 'up') === trendBadWhenUp;
  const trendIsGood = trend && trend !== 'flat' && !trendIsBad;
  return (
    <div className="grouped-stat-metric">
      <div className="v num grouped-stat-value" style={{ color: TONE_STYLE[tone] }}>
        {value}
        {trend && trend !== 'flat' && (
          <span
            className={`grouped-stat-trend${trendIsBad ? ' bad' : ''}${trendIsGood ? ' good' : ''}`}
            aria-label={trend === 'up' ? 'trending up' : 'trending down'}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="d">{label}</div>
    </div>
  );
};

/**
 * Fourteen thin single-metric tiles took a full scroll's worth of space
 * before the queue table even started. Pairing related figures — service
 * quality, call volume, staffing — into one denser card each cuts that
 * down to three, and reads faster since related numbers sit together.
 */
const GroupedStatCard = ({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: Metric;
  secondary: Metric;
}) => (
  <div className="stat grouped-stat">
    <div className="k">{title}</div>
    <div className="grouped-stat-row">
      <MetricBlock {...primary} />
      <div className="grouped-stat-divider" />
      <MetricBlock {...secondary} />
    </div>
  </div>
);

export default GroupedStatCard;
