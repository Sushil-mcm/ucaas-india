import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Headset, Flame } from 'lucide-react';
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

export type QueueOverviewStat = {
  key: string;
  icon: LucideIcon;
  color: string;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
};

/**
 * "Queue Overview" — the busiest queue's real hourly call volume as its own
 * chart card, beside (not inside a shared box with) a grid of the other six
 * snapshot figures. Two independent blocks, not one card wrapping both.
 */
const QueueOverviewPanel = ({
  queueName,
  handledToday,
  interacting,
  series,
  hourLabels,
  stats,
}: {
  queueName: string | null;
  handledToday: number | null;
  interacting: number;
  /** Real hourly (or daily, for a multi-day range) call counts for the
      busiest queue — same shape the heatmap renders per row. */
  series: number[];
  hourLabels: string[];
  stats: QueueOverviewStat[];
}) => {
  const chartData = useMemo(
    () => series.map((value, index) => ({ label: hourLabels[index] || '', value })),
    [series, hourLabels],
  );
  const peakIndex = useMemo(() => {
    if (!series.length) return -1;
    let best = 0;
    series.forEach((value, index) => {
      if (value > series[best]) best = index;
    });
    return series[best] > 0 ? best : -1;
  }, [series]);

  return (
    <div className="queue-overview">
      <div className="queue-overview-head">
        <span className="queue-overview-head-icon">
          <Headset size={20} />
        </span>
        <h3>Queue Overview</h3>
      </div>

      <div className="queue-overview-body">
        <div className="queue-overview-hero">
          <div className="queue-overview-hero-top">
            <div>
              <span className="queue-overview-hero-label">Busiest queue</span>
              <div className="queue-overview-hero-name">{queueName || '—'}</div>
            </div>
            {queueName && (
              <span className="queue-overview-hero-badge">
                <Flame size={13} />
                Most Active
              </span>
            )}
          </div>
          <span className="queue-overview-hero-sub">
            {interacting > 0 ? `${interacting} interacting now` : `${handledToday ?? 0} handled today`}
          </span>
          {chartData.length > 1 ? (
            <div className="queue-overview-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 36, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="queue-overview-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f2994a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f2994a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid rgba(225,200,165,0.9)',
                      fontSize: 12,
                    }}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f2994a"
                    strokeWidth={2.5}
                    fill="url(#queue-overview-fill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {peakIndex >= 0 && (
                    <ReferenceDot
                      x={chartData[peakIndex].label}
                      y={chartData[peakIndex].value}
                      r={5}
                      fill="#f2994a"
                      stroke="#fff"
                      strokeWidth={2}
                      isFront
                      label={(props: any) => {
                        const { viewBox } = props;
                        const x = viewBox?.cx ?? 0;
                        const y = viewBox?.cy ?? 0;
                        return (
                          <foreignObject x={x - 46} y={y - 46} width={92} height={40}>
                            <div className="queue-overview-peak">
                              <span className="queue-overview-peak-t">Peak Hour</span>
                              <span className="queue-overview-peak-v">{chartData[peakIndex].label}</span>
                            </div>
                          </foreignObject>
                        );
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="queue-overview-chart-empty">Not enough activity yet to chart.</div>
          )}
        </div>

        <div className="queue-overview-stats">
          {stats.map((stat) => (
            <div className="queue-overview-stat" key={stat.key} style={{ background: `${stat.color}0f` }}>
              <span className="queue-overview-stat-icon" style={{ background: `${stat.color}1f`, color: stat.color }}>
                <stat.icon size={16} />
              </span>
              <div className="queue-overview-stat-body">
                <span className="queue-overview-stat-label">{stat.label}</span>
                <span className="queue-overview-stat-value">{stat.value}</span>
                <span className="queue-overview-stat-sub">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueueOverviewPanel;
