import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { HistoryPoint } from './use-kpi-history';

/**
 * Shared recharts wrappers for Home — kept out of the main file since they're
 * pure presentation (no data fetching), reused across the KPI strip, the
 * agent status panel and the Communication Overview section below.
 */

/** Service level (or any 0-100 value) as a ring instead of a linear bar --
 * the same `value`/`target` the old `.kpi-meter` bar read, just drawn as a
 * gauge so it reads at a glance from across the room. */
export const RadialGauge = ({
  value,
  size = 64,
  color = 'var(--accent)',
  trackColor = 'rgba(150, 100, 50, 0.12)',
}: {
  value: number;
  size?: number;
  color?: string;
  trackColor?: string;
}) => {
  const data = useMemo(() => [{ value: Math.max(0, Math.min(100, value)) }], [value]);
  return (
    <div style={{ width: size, height: size, flex: 'none' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          width={size}
          height={size}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={size * 0.16}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={999}
            fill={color}
            background={{ fill: trackColor }}
            isAnimationActive
            animationDuration={700}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** The roster split as a donut instead of two stacked bars saying the same
 * thing -- real counts (`stateDistribution`, home/index.tsx), just drawn
 * once instead of twice. */
export const StatusDonut = ({
  data,
  colors,
  size = 96,
}: {
  data: { state: string; count: number; pct: number }[];
  colors: Record<string, string>;
  size?: number;
}) => (
  <div style={{ width: size, height: size, flex: 'none' }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="state"
          innerRadius="62%"
          outerRadius="100%"
          paddingAngle={data.length > 1 ? 3 : 0}
          isAnimationActive
          animationDuration={700}
          stroke="none"
        >
          {data.map((slice) => (
            <Cell key={slice.state} fill={colors[slice.state] || 'var(--ink-4)'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: number, _name, entry: any) => [
            `${val} · ${entry?.payload?.pct ?? 0}%`,
            entry?.payload?.state,
          ]}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid rgba(225,200,165,0.9)',
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

/** One filled trend line, used by every Communication Overview tab -- same
 * shape, different series/colour per channel. */
export const TrendArea = ({
  data,
  dataKey,
  xKey = 'label',
  color = 'var(--accent)',
  height = 180,
}: {
  data: Record<string, any>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
}) => {
  const gradientId = useMemo(
    () => `home-trend-${dataKey}-${Math.random().toString(36).slice(2, 8)}`,
    [dataKey],
  );
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} hide />
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
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={700}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Tiny bar sparkline for a count-type KPI's own recent history
 * (`useKpiHistory`) -- Waiting Now, Answered Today, Abandon Rate. */
export const SparkBars = ({
  data,
  color = 'var(--accent)',
  height = 44,
}: {
  data: HistoryPoint[];
  color?: string;
  height?: number;
}) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" fill={color} fillOpacity={0.35} radius={[2, 2, 0, 0]} isAnimationActive />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

/** Smooth line sparkline for a time-type KPI's own recent history --
 * Longest Wait, Avg Handle Time. */
export const SparkLine = ({
  data,
  color = 'var(--accent)',
  height = 44,
}: {
  data: HistoryPoint[];
  color?: string;
  height?: number;
}) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/** Service level's own value-against-target rail -- a plain, honest
 * progress bar with a tick at the real target, not a chart. */
export const LinearMeter = ({
  value,
  target,
  color = 'var(--live)',
}: {
  value: number;
  target: number;
  color?: string;
}) => (
  <div className="kpi-linear-meter" role="img" aria-label={`${value}% against a ${target}% target`}>
    <span style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    <i style={{ left: `${Math.min(100, target)}%` }} />
  </div>
);

/** Queue x hour activity, real counts from `useQueueSeries` (the same
 * per-queue/per-bucket report the Communication Overview's Calls tab
 * reads from its totals) -- CSS grid with opacity-scaled cells rather
 * than a new charting dependency neither recharts nor this app already
 * ships a heatmap primitive for. */
export const QueueHeatmap = ({
  rows,
  hourLabels,
  color = 'var(--accent)',
}: {
  rows: { name: string; values: number[] }[];
  hourLabels: string[];
  color?: string;
}) => {
  const max = Math.max(1, ...rows.flatMap((row) => row.values));
  return (
    <div className="queue-heatmap">
      <div className="queue-heatmap-row queue-heatmap-head">
        <span className="queue-heatmap-row-label" />
        {hourLabels.map((hour, index) => (
          <span key={hour + index} className="queue-heatmap-hour">
            {index % 3 === 0 ? hour : ''}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div className="queue-heatmap-row" key={row.name}>
          <span className="queue-heatmap-row-label">{row.name}</span>
          {row.values.map((value, index) => (
            <span
              key={index}
              className="queue-heatmap-cell"
              style={{
                background: color,
                opacity: value === 0 ? 0.06 : 0.18 + (value / max) * 0.82,
              }}
              title={`${row.name} · ${hourLabels[index]}: ${value} call${value === 1 ? '' : 's'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
