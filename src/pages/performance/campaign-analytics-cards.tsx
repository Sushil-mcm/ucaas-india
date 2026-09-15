import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  GitBranch,
  BarChart3,
  PieChart as PieChartIcon,
  Trophy,
  UserCog,
  Split,
  History,
} from 'lucide-react';
import moment from 'moment';
import { statusOf, DIAL_METHOD_LABEL, fmt } from '@/pages/auto-dialer/campaign/campaign-ui';
import { RingStat, initialsOf, CountUp } from './campaign-card-primitives';
import { CA_ORANGE, CA_ORANGE_DEEP, CA_GREEN_DEEP, CA_BLUE_DEEP, STATUS_COLORS, CARD_ACCENTS } from './campaign-palette';

/**
 * Performance ▸ Campaigns' "large analytics cards" row.
 *
 * Every figure here is derived from the same `campaignAnalytics` /
 * `campaignStatus` / `dialMethod` fields campaign-activity-tab.tsx already
 * reads for its KPI strip — no second fetch, no metric the API doesn't
 * actually return. Two requests (per-agent success rate, a "converted"
 * funnel stage distinct from "connected") have no backing field anywhere in
 * campaignAnalytics — the agent card reports campaigns/leads in scope
 * instead of calls handled, and the funnel's fourth stage is "Pending"
 * rather than "Converted", the same way the standalone dialer's own
 * OutcomeBar states what it cannot measure instead of inventing it.
 *
 * Each card also gets its own chart shape and header accent colour (see
 * `CARD_ACCENTS`) rather than reusing one "white box + line item" template
 * eight times over — a funnel is drawn as tapered bars, not another
 * horizontal track; the dial-method breakdown is three small rings, not a
 * fourth bar list.
 */

export type PerCampaign = {
  id: string;
  name: string;
  status: string;
  dialMethod: string;
  createdAt?: string;
  assigned: number;
  answered: number;
  noAnswer: number;
  dnc: number;
  pending: number;
  dialed: number;
  connectRate: number;
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(211,129,74,0.22)',
  fontSize: 12,
} as const;

/* Diagonal, not flat — a bit of gradient depth per stage, still the same
   four-tones-lighter-down-the-funnel progression as before. */
const RADIAL_TONES = [CA_ORANGE_DEEP, CA_BLUE_DEEP, CA_GREEN_DEEP];
/* Base tone per stage, each drawn as a diagonal gradient from a lighter
   tint of itself — flat fills read as clip-art; the gradient plus a
   top-edge highlight is what gives the shape depth. */
const FUNNEL_BAND_COLORS = ['#bd5c36', '#cf8049', '#dda172', '#ebc4a1'];
const FUNNEL_BAND_TINTS = ['#d4744c', '#dd9560', '#e6b189', '#f2d4b6'];
const FUNNEL_DOT_COLORS = FUNNEL_BAND_COLORS;

const FUNNEL_BAND_H = 54;
const FUNNEL_WIDTH = 250;
/* A gentler taper than a true point — every stage stays wide enough to
   carry its own figure inside the shape, which is what makes this a
   readable widget rather than a picture of a funnel. */
const FUNNEL_FRACS = [1, 0.78, 0.57, 0.37, 0.28];

/**
 * The funnel: four stages on one continuous silhouette (each stage's
 * bottom edge IS the next one's top edge — no gaps, no floating pieces),
 * each with its own diagonal gradient and top-edge highlight for depth,
 * its figure set inside the shape, and the stage-to-stage conversion
 * pinned at the seam where that drop-off actually happens.
 *
 * Widths step by a fixed geometric taper rather than by each stage's own
 * value: Assigned→Dialed is only a 25% drop, so value-scaled widths left
 * the top stage a near-flat slab and the silhouette never resolved into a
 * funnel. The real figures are in the shape and the panel beside it.
 */
const FunnelDiagram = ({
  stages,
  activeIndex,
  onHover,
}: {
  stages: Array<{ label: string; value: number; pct: number | null }>;
  activeIndex: number | null;
  onHover: (index: number | null) => void;
}) => {
  const bandH = FUNNEL_BAND_H;
  const width = FUNNEL_WIDTH;
  const height = stages.length * bandH;
  const cx = width / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="ac-funnel-svg"
      role="img"
      aria-label="Lead conversion funnel"
    >
      <defs>
        {stages.map((_, i) => (
          <linearGradient key={i} id={`ac-fnl-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={FUNNEL_BAND_TINTS[i % FUNNEL_BAND_TINTS.length]} />
            <stop offset="100%" stopColor={FUNNEL_BAND_COLORS[i % FUNNEL_BAND_COLORS.length]} />
          </linearGradient>
        ))}
        <filter id="ac-fnl-shadow" x="-30%" y="-15%" width="160%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#8a4f28" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#ac-fnl-shadow)">
        {stages.map((stage, i) => {
          const y = i * bandH;
          const topHalf = (FUNNEL_FRACS[i] * width) / 2;
          const bottomHalf = (FUNNEL_FRACS[i + 1] * width) / 2;
          const dim = activeIndex !== null && activeIndex !== i;
          return (
            <g
              key={stage.label}
              className={`ac-fnl-stage${dim ? ' is-dim' : ''}`}
              style={{ animationDelay: `${i * 140}ms` }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            >
              <polygon
                points={`${cx - topHalf},${y} ${cx + topHalf},${y} ${cx + bottomHalf},${y + bandH} ${cx - bottomHalf},${y + bandH}`}
                fill={`url(#ac-fnl-${i})`}
              />
              {/* The light catch along the top edge that reads as depth. */}
              <line
                x1={cx - topHalf + 4}
                y1={y + 1}
                x2={cx + topHalf - 4}
                y2={y + 1}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={1.5}
              />
              <text x={cx} y={y + bandH / 2 + 5} textAnchor="middle" className="ac-fnl-value">
                {fmt(stage.value)}
              </text>
            </g>
          );
        })}
      </g>

      {stages.map((stage, i) => {
        if (stage.pct === null) return null;
        const y = i * bandH;
        const half = (FUNNEL_FRACS[i] * width) / 2;
        return (
          <g key={`seam-${stage.label}`} className="ac-fnl-seam" style={{ animationDelay: `${620 + i * 120}ms` }}>
            <rect x={cx + half - 44} y={y - 9} width={42} height={18} rx={9} className="ac-fnl-seam-pill" />
            <text x={cx + half - 23} y={y + 4} textAnchor="middle" className="ac-fnl-seam-text">
              {Math.round(stage.pct)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const AnalyticsCard = ({
  icon: Icon,
  title,
  subtitle,
  children,
  index = 0,
  accent,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  index?: number;
  accent: { bg: string; fg: string };
}) => (
  <div className="ac-card" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="ac-card-head">
      <span className="ac-card-icon" style={{ background: accent.bg, color: accent.fg }}>
        <Icon size={15} />
      </span>
      <div>
        <div className="ac-card-title">{title}</div>
        {subtitle && <div className="ac-card-sub">{subtitle}</div>}
      </div>
    </div>
    <div className="ac-card-body">{children}</div>
  </div>
);

/** Greedily packs `text` onto two lines (by whole words) instead of
 * truncating to one line with an ellipsis — "Winback - lapsed" becomes
 * "Winback -" / "lapsed" rather than "Winback -…", so the full campaign
 * name is still there, just wrapped. Only hard-cuts a single word if it
 * alone can't fit a line. */
const wrapTwoLines = (text: string, maxLen = 9): [string, string] => {
  const words = text.split(' ');
  let line1 = '';
  let line2 = '';
  for (const word of words) {
    if (!line1) {
      line1 = word;
    } else if (`${line1} ${word}`.length <= maxLen) {
      line1 = `${line1} ${word}`;
    } else if (!line2) {
      line2 = word;
    } else if (`${line2} ${word}`.length <= maxLen) {
      line2 = `${line2} ${word}`;
    } else {
      line2 = `${line2}…`;
      break;
    }
  }
  if (line1.length > maxLen) line1 = `${line1.slice(0, maxLen - 1)}…`;
  if (line2.length > maxLen) line2 = `${line2.slice(0, maxLen - 1)}…`;
  return [line1, line2];
};

/** X-axis tick for both charts below — two lines, never angled. */
const TwoLineTick = ({ x, y, payload }: any) => {
  const [line1, line2] = wrapTwoLines(String(payload.value));
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fill="#a39c8e">
      <tspan x={x} dy={11}>
        {line1}
      </tspan>
      {line2 && (
        <tspan x={x} dy={11}>
          {line2}
        </tspan>
      )}
    </text>
  );
};

/** Replaces recharts' default Tooltip content, which reads its title off
 * the axis's own value — fine here since that value is now the campaign's
 * real full name (wrapped on the axis, not truncated), just laid out as a
 * small stat list instead of one line per series. */
const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="ac-chart-tip">
      <div className="ac-chart-tip-title">{point.name}</div>
      {payload.map((entry: any) => (
        <div className="ac-chart-tip-row" key={entry.dataKey}>
          <i style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b>{fmt(entry.value)}</b>
        </div>
      ))}
    </div>
  );
};

const CampaignAnalyticsCards = ({
  perCampaign,
  totals,
  statusCounts,
  dialMethodCounts,
  agentAssignment,
}: {
  perCampaign: PerCampaign[];
  totals: {
    assigned: number;
    answered: number;
    noAnswer: number;
    dnc: number;
    pending: number;
    dialed: number;
  };
  statusCounts: Record<string, number>;
  dialMethodCounts: Record<string, number>;
  agentAssignment: Array<{ name: string; campaigns: number; leads: number }>;
}) => {
  /* Campaign Status' hovered segment — drives the dimming of the other
     arcs, the legend row highlight, and the detail panel under the donut
     (which replaces recharts' cursor-following tooltip, see below). */
  const [activeStatus, setActiveStatus] = useState<number | null>(null);
  /* Lead Conversion Funnel's hovered stage — shared by the shape and the
     breakdown panel, so hovering either side highlights both. */
  const [activeStage, setActiveStage] = useState<number | null>(null);
  /* Campaign Timeline — which event's full detail shows in the panel
     beside the list. Null means "the most recent one" (the list's own
     default), so the panel is never empty on first load. */
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);

  const areaData = useMemo(
    () =>
      [...perCampaign]
        .sort((a, b) => b.assigned - a.assigned)
        .slice(0, 8)
        .map((c) => ({ name: c.name, leads: c.assigned, answered: c.answered })),
    [perCampaign],
  );

  const barData = useMemo(
    () =>
      [...perCampaign]
        .sort((a, b) => b.dialed - a.dialed)
        .slice(0, 8)
        .map((c) => ({ name: c.name, dialed: c.dialed })),
    [perCampaign],
  );

  const statusData = useMemo(
    () =>
      Object.entries(statusCounts)
        .filter(([, count]) => count > 0)
        .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#cbc4b8' })),
    [statusCounts],
  );

  const topPerforming = useMemo(
    () =>
      [...perCampaign]
        .filter((c) => c.assigned > 0)
        .sort((a, b) => b.connectRate - a.connectRate || b.assigned - a.assigned)
        .slice(0, 5),
    [perCampaign],
  );

  const timeline = useMemo(
    () =>
      [...perCampaign]
        .filter((c) => c.createdAt)
        .sort((a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf())
        .slice(0, 6),
    [perCampaign],
  );

  /* Each stage's own conversion share of the stage before it — real ratios
     already implied by the four totals, just spelled out per stage instead
     of left for the reader to divide themselves. Pending has no natural
     "previous stage" (it's the remainder that never got dialled), so it's
     read against Assigned like Dialed is. */
  const funnelStages = [
    { label: 'Assigned', value: totals.assigned, pct: null as number | null },
    { label: 'Dialed', value: totals.dialed, pct: totals.assigned ? (totals.dialed / totals.assigned) * 100 : null },
    { label: 'Connected', value: totals.answered, pct: totals.dialed ? (totals.answered / totals.dialed) * 100 : null },
    { label: 'Pending', value: totals.pending, pct: totals.assigned ? (totals.pending / totals.assigned) * 100 : null },
  ];

  const dialMethodEntries = useMemo(
    () =>
      Object.entries(dialMethodCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [dialMethodCounts],
  );
  const dialMethodTotal = dialMethodEntries.reduce((sum, [, count]) => sum + count, 0) || 1;

  const maxAgentLeads = Math.max(1, ...agentAssignment.map((a) => a.leads));

  return (
    <div className="ac-grid">
      <AnalyticsCard
        icon={TrendingUp}
        title="Campaign Performance Overview"
        subtitle="Leads vs answered, by campaign"
        index={0}
        accent={CARD_ACCENTS.line}
      >
        <div className="ac-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ac-leads-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CA_ORANGE_DEEP} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CA_ORANGE_DEEP} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ac-answered-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CA_GREEN_DEEP} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={CA_GREEN_DEEP} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,124,102,0.14)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={<TwoLineTick />}
                axisLine={false}
                tickLine={false}
                height={34}
                interval={0}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#a39c8e' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke={CA_ORANGE_DEEP}
                strokeWidth={2.25}
                fill="url(#ac-leads-fill)"
                dot={{ r: 2.5, fill: CA_ORANGE_DEEP, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="answered"
                name="Answered"
                stroke={CA_GREEN_DEEP}
                strokeWidth={2.25}
                fill="url(#ac-answered-fill)"
                dot={{ r: 2.5, fill: CA_GREEN_DEEP, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={180}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="ac-legend-row">
          <span className="ac-legend">
            <i style={{ background: CA_ORANGE_DEEP }} />
            Leads
          </span>
          <span className="ac-legend">
            <i style={{ background: CA_GREEN_DEEP }} />
            Answered
          </span>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={GitBranch}
        title="Lead Conversion Funnel"
        subtitle="Assigned → dialed → connected → pending"
        index={1}
        accent={CARD_ACCENTS.funnel}
      >
        <div className="ac-funnel-diagram">
          <FunnelDiagram stages={funnelStages} activeIndex={activeStage} onHover={setActiveStage} />
          <div className="ac-funnel-legend">
            {funnelStages.map((stage, i) => {
              /* Bar length is the stage's share of the whole book, so the
                 four bars shorten in step with the funnel beside them. */
              const share = funnelStages[0].value
                ? (stage.value / funnelStages[0].value) * 100
                : 0;
              return (
                <div
                  className={`ac-funnel-legend-row${activeStage === i ? ' is-on' : ''}${
                    activeStage !== null && activeStage !== i ? ' is-dim' : ''
                  }`}
                  key={stage.label}
                  style={{ animationDelay: `${420 + i * 110}ms` }}
                  onMouseEnter={() => setActiveStage(i)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  <div className="ac-funnel-legend-head">
                    <span className="ac-funnel-legend-dot" style={{ background: FUNNEL_DOT_COLORS[i] }} />
                    <span className="ac-funnel-legend-label">{stage.label}</span>
                    {stage.pct !== null && (
                      <span className="ac-funnel-legend-pct">{Math.round(stage.pct)}%</span>
                    )}
                  </div>
                  <div className="ac-funnel-legend-value">
                    <CountUp value={stage.value} format={fmt} />
                  </div>
                  <div className="ac-funnel-legend-track">
                    <i
                      style={{
                        width: `${share}%`,
                        background: FUNNEL_DOT_COLORS[i],
                        transitionDelay: `${420 + i * 110}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={BarChart3}
        title="Calls Activity"
        subtitle="Dialled calls by campaign"
        index={2}
        accent={CARD_ACCENTS.bar}
      >
        <div className="ac-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ac-bar-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CA_ORANGE} stopOpacity={1} />
                  <stop offset="100%" stopColor={CA_ORANGE} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,124,102,0.14)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={<TwoLineTick />}
                axisLine={false}
                tickLine={false}
                height={34}
                interval={0}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#a39c8e' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(211,129,74,0.06)' }} />
              <Bar
                dataKey="dialed"
                name="Dialled"
                fill="url(#ac-bar-fill)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={PieChartIcon}
        title="Campaign Status"
        subtitle="Running, paused, scheduled, completed"
        index={3}
        accent={CARD_ACCENTS.donut}
      >
        <div className="ac-donut-wrap">
          <div className="ac-chart ac-chart-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="95%"
                  paddingAngle={4}
                  isAnimationActive
                  animationDuration={1000}
                  animationEasing="ease-out"
                  onMouseEnter={(_: unknown, index: number) => setActiveStatus(index)}
                  onMouseLeave={() => setActiveStatus(null)}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke="none"
                      style={{
                        opacity: activeStatus === null || activeStatus === index ? 1 : 0.45,
                        transition: 'opacity 0.18s ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Pie>
                {/* No recharts <Tooltip>: it follows the cursor, which on a
                    donut means it lands over the ring and the centre label.
                    The panel below is anchored under the chart instead, so
                    "8 CAMPAIGNS" is never covered. */}
              </PieChart>
            </ResponsiveContainer>
            <div className="ac-donut-mid">
              <span className="ac-donut-big">{perCampaign.length}</span>
              <span className="ac-donut-lbl">Campaigns</span>
            </div>
            <div className={`ac-donut-tip${activeStatus !== null ? ' is-on' : ''}`} aria-live="polite">
              {activeStatus !== null && statusData[activeStatus] && (
                <>
                  <i style={{ background: statusData[activeStatus].color }} />
                  <b>{statusData[activeStatus].name}</b>
                  <span>
                    {statusData[activeStatus].value} of {perCampaign.length} ·{' '}
                    {Math.round((statusData[activeStatus].value / (perCampaign.length || 1)) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="ac-donut-legend">
            {statusData.map((entry, index) => (
              <span
                className={`ac-legend ac-donut-legend-row${activeStatus === index ? ' is-on' : ''}`}
                key={entry.name}
                onMouseEnter={() => setActiveStatus(index)}
                onMouseLeave={() => setActiveStatus(null)}
              >
                <i style={{ background: entry.color }} />
                <span className="ac-donut-legend-name">{entry.name}</span>
                <b className="ac-donut-legend-count">{entry.value}</b>
              </span>
            ))}
          </div>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={Trophy}
        title="Top Performing Campaigns"
        subtitle="By connect rate"
        index={4}
        accent={CARD_ACCENTS.rank}
      >
        <div className="ac-rank-list">
          {topPerforming.length === 0 && <div className="ac-empty">No campaigns with leads yet</div>}
          {topPerforming.map((c, i) => (
            <div className="ac-rank-row" key={c.id} style={{ animationDelay: `${300 + i * 70}ms` }}>
              <span className="ac-rank-pos">{i + 1}</span>
              <span className="ac-rank-name" title={c.name}>
                {c.name}
              </span>
              <span className="ac-rank-leads">{fmt(c.assigned)} leads</span>
              <span className="ac-rank-rate">{c.connectRate}%</span>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={UserCog}
        title="Agent Performance"
        subtitle="Campaigns & leads in scope"
        index={5}
        accent={CARD_ACCENTS.leaderboard}
      >
        <div className="ac-leaderboard">
          {agentAssignment.length === 0 && <div className="ac-empty">No agents assigned yet</div>}
          {agentAssignment.map((agent, i) => (
            <div className="ac-leader-row" key={agent.name + i} style={{ animationDelay: `${370 + i * 70}ms` }}>
              <span className="ac-leader-avatar">{initialsOf(agent.name)}</span>
              <div className="ac-leader-mid">
                <div className="ac-leader-top">
                  <span className="ac-leader-name" title={agent.name}>
                    {agent.name}
                  </span>
                  <span className="ac-leader-leads">{fmt(agent.leads)} leads</span>
                </div>
                <div className="ac-leader-track">
                  <i style={{ width: `${(agent.leads / maxAgentLeads) * 100}%` }} />
                </div>
              </div>
              <span className="ac-leader-campaigns">
                {agent.campaigns} {agent.campaigns === 1 ? 'camp.' : 'camps.'}
              </span>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        icon={Split}
        title="Dial Method Analytics"
        subtitle="Share of campaigns by dial method"
        index={6}
        accent={CARD_ACCENTS.radial}
      >
        {dialMethodEntries.length === 0 ? (
          <div className="ac-empty">No campaigns yet</div>
        ) : (
          /* Three equal full-width rows — a bigger ring on the left, the
             progress bar stretching the rest of the card's own width, so
             the layout uses the whole box instead of three narrow columns
             with air on either side. */
          <div className="ac-dial-rows">
            {dialMethodEntries.map(([method, count], i) => {
              const pct = Math.round((count / dialMethodTotal) * 100);
              const color = RADIAL_TONES[i % RADIAL_TONES.length];
              return (
                <div className="ac-dial-row" key={method} style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="ac-dial-row-ring">
                    <RingStat value={pct} color={color} trackColor="rgba(148,124,102,0.14)" size={68} thickness={7} />
                    <div className="ac-dial-row-mid">
                      <CountUp value={pct} format={(n) => `${Math.round(n)}%`} />
                    </div>
                  </div>
                  <div className="ac-dial-row-body">
                    <div className="ac-dial-row-top">
                      <span className="ac-dial-row-name">{DIAL_METHOD_LABEL[method] || method}</span>
                      <span className="ac-dial-row-value">
                        <CountUp value={count} /> · {pct}%
                      </span>
                    </div>
                    <span className="ac-dial-row-track">
                      <i style={{ width: `${pct}%`, background: color, transitionDelay: `${i * 120}ms` }} />
                    </span>
                    <span className="ac-dial-row-count">
                      {count} {count === 1 ? 'campaign' : 'campaigns'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsCard
        icon={History}
        title="Campaign Timeline"
        subtitle="Most recent activity"
        index={7}
        accent={CARD_ACCENTS.timeline}
      >
        {timeline.length === 0 ? (
          <div className="ac-empty">No campaigns yet</div>
        ) : (
          <div className="ac-timeline-wrap">
            <div className="ac-timeline">
              {timeline.map((c, i) => {
                const { label } = statusOf(c.status);
                const isSelected = (selectedTimelineId ?? timeline[0].id) === c.id;
                return (
                  <button
                    type="button"
                    className={`ac-timeline-row${isSelected ? ' is-selected' : ''}`}
                    key={c.id}
                    style={{ animationDelay: `${510 + i * 70}ms` }}
                    onClick={() => setSelectedTimelineId(c.id)}
                  >
                    <i className="ac-timeline-dot" style={{ background: STATUS_COLORS[label] || '#cbc4b8' }} />
                    <div className="ac-timeline-body">
                      <span className="ac-timeline-name" title={c.name}>
                        {c.name}
                      </span>
                      <span className="ac-timeline-meta">
                        {label} · {moment(c.createdAt).fromNow()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* The space beside the list — showing whichever campaign is
                selected (the most recent one, until you click another) —
                rather than sitting empty next to a narrow left-aligned
                list. */}
            {(() => {
              const selected = timeline.find((c) => c.id === selectedTimelineId) || timeline[0];
              const { label } = statusOf(selected.status);
              return (
                <div className="ac-timeline-detail" key={selected.id}>
                  <div className="ac-tld-head">
                    <span className="ac-tld-badge" style={{ color: STATUS_COLORS[label] || '#8a8478', background: `${STATUS_COLORS[label] || '#8a8478'}1f` }}>
                      {label}
                    </span>
                    <span className="ac-tld-when">{moment(selected.createdAt).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="ac-tld-name">{selected.name}</div>
                  <div className="ac-tld-grid">
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">Assigned</span>
                      <span className="ac-tld-stat-v">{fmt(selected.assigned)}</span>
                    </div>
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">Answered</span>
                      <span className="ac-tld-stat-v">{fmt(selected.answered)}</span>
                    </div>
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">Connect rate</span>
                      <span className="ac-tld-stat-v">{selected.connectRate}%</span>
                    </div>
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">Dialed</span>
                      <span className="ac-tld-stat-v">{fmt(selected.dialed)}</span>
                    </div>
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">Pending</span>
                      <span className="ac-tld-stat-v">{fmt(selected.pending)}</span>
                    </div>
                    <div className="ac-tld-stat">
                      <span className="ac-tld-stat-k">DNC</span>
                      <span className="ac-tld-stat-v">{fmt(selected.dnc)}</span>
                    </div>
                  </div>
                  <div className="ac-tld-foot">
                    <span>Dial method</span>
                    <b>{DIAL_METHOD_LABEL[selected.dialMethod] || selected.dialMethod}</b>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </AnalyticsCard>
    </div>
  );
};

export default CampaignAnalyticsCards;
