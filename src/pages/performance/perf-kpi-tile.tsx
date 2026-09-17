import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HistoryPoint, Trend } from '@/pages/dashboard/home/use-kpi-history';
import { SparkLine, SparkBars, SparkArea, LinearMeter } from '@/pages/dashboard/home/charts';

/**
 * One tile in the Queues KPI band — a colour-coded card (icon, value,
 * trend pill, sparkline) matching the reference layout the rest of this
 * band was built against. Kept local to Performance rather than reusing
 * Home's own inline JSX, since Home's isn't a component to import — but it
 * shares Home's chart primitives and trend hook (both already generic)
 * rather than re-implementing sparklines/history from scratch.
 */
export type PerfKpiChart =
  | { type: 'line' | 'bar' | 'area'; data: HistoryPoint[] }
  | { type: 'meter'; value: number; target: number };

const PerfKpiTile = ({
  icon: Icon,
  color,
  title,
  subtitle,
  value,
  trend,
  /* Most of these metrics are "less is better" (fewer waiting, shorter
     handle time, lower abandon rate) — only Service Level and Answered
     Calls read "more is better". Defaulting to false keeps a rising
     Waiting Calls count red rather than green. */
  goodWhenUp = false,
  chart,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  subtitle: string;
  value: ReactNode;
  trend?: Trend | null;
  goodWhenUp?: boolean;
  chart?: PerfKpiChart;
}) => {
  const isGood =
    trend && trend.direction !== 'flat'
      ? trend.direction === 'up'
        ? goodWhenUp
        : !goodWhenUp
      : null;

  return (
    <div className="perf-kpi-tile" style={{ borderColor: `${color}26` }}>
      <div className="perf-kpi-top">
        <span className="perf-kpi-badge" style={{ background: `${color}1f`, color }}>
          <Icon size={18} />
        </span>
        {trend && (
          <span className={`perf-kpi-trend${isGood === null ? '' : isGood ? ' is-good' : ' is-bad'}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '·'} {trend.pct}%
          </span>
        )}
      </div>
      <div className="perf-kpi-titles">
        <span className="perf-kpi-title">{title}</span>
        <span className="perf-kpi-value">{value}</span>
        <span className="perf-kpi-subtitle">{subtitle}</span>
      </div>
      {chart?.type === 'line' && (
        <div className="perf-kpi-chart">
          <SparkLine data={chart.data} color={color} height={36} />
        </div>
      )}
      {chart?.type === 'bar' && (
        <div className="perf-kpi-chart">
          <SparkBars data={chart.data} color={color} height={36} />
        </div>
      )}
      {chart?.type === 'area' && (
        <div className="perf-kpi-chart">
          <SparkArea data={chart.data} color={color} height={36} />
        </div>
      )}
      {chart?.type === 'meter' && (
        <div className="perf-kpi-chart perf-kpi-chart-meter">
          <LinearMeter value={chart.value} target={chart.target} color={color} />
          <span className="perf-kpi-meter-target">Target: {chart.target}%</span>
        </div>
      )}
    </div>
  );
};

export default PerfKpiTile;
