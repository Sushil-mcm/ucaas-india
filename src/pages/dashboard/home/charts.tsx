import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

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
