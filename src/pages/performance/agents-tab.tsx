import { useEffect, useMemo } from 'react';
import {
  Users,
  Trophy,
  PhoneCall,
  AlertTriangle,
  Gauge,
  ArrowLeftRight,
  AlertCircle,
  Clock,
  Headset,
} from 'lucide-react';
import TableManager from '@/components/custom/table-manager';
import buildAgentRows, { AGENT_STATES } from './agent-rows';
import Timer from '@/components/timer';
import CustomAvatar from '@/components/custom/custom-avatar';
import PerfKpiTile from './perf-kpi-tile';
import { useKpiHistory } from '@/pages/dashboard/home/use-kpi-history';
import { RadialGauge } from '@/pages/dashboard/home/charts';
import { formatSecsToClock } from './format';
import './perf-kpi-tile.css';
import './agents-theme.css';

/* Light, low-saturation pair per live status -- background tint + a
   readable text/dot colour on it -- shared by the presence dot in Top
   performers and the bar colour in Status breakdown, so the same state
   reads the same colour in both places. */
const STATUS_TONE: Record<string, { bar: string; dot: string; ink: string }> = {
  'On Call': { bar: '#fdba8c', dot: '#f87171', ink: '#c2410c' },
  Ringing: { bar: '#fdba8c', dot: '#fb923c', ink: '#c2410c' },
  'On Hold': { bar: '#c7d2fe', dot: '#a5b4fc', ink: '#4338ca' },
  Available: { bar: '#fed7aa', dot: '#34d399', ink: '#c2410c' },
  Busy: { bar: '#fde68a', dot: '#fbbf24', ink: '#a16207' },
  'Do Not Disturb': { bar: '#fecaca', dot: '#f87171', ink: '#b91c1c' },
  Offline: { bar: '#e2e8f0', dot: '#cbd5e1', ink: '#64748b' },
};

/* Cycled per row in Top performers -- pastel initials-avatar backgrounds,
   distinct from the KPI tiles' own palette so the two don't read as the
   same colour system. */
const AVATAR_TONES = [
  { bg: '#dcfce7', ink: '#15803d' },
  { bg: '#fee2e2', ink: '#b91c1c' },
  { bg: '#fce7f3', ink: '#be185d' },
];

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '—';

const STATUS_STYLES: Record<string, string> = {
  'On Call': 'state busy',
  Ringing: 'state acw',
  'On Hold': 'state hold',
  Available: 'state q',
  Busy: 'state acw',
  'Do Not Disturb': 'state nr',
  Offline: 'state away',
};

export type QueueMembership = {
  uuid?: string;
  name?: string;
  memberKeys: string[];
};

/* ─── Main tab ───────────────────────────────────────────────────────────── */

const AgentsTab = ({
  agentRows,
  usersOnlineStatus,
  activeQueueCalls,
  queues,
  isLoading,
  globalSearch,
}: {
  agentRows: any[];
  usersOnlineStatus: any[];
  activeQueueCalls: any[];
  queues: QueueMembership[];
  isLoading: boolean;
  globalSearch?: string;
}) => {
  /* Body class lets agents-theme.css reach the warm ambient backdrop that
     lives one level up in the Performance shell — same convention as
     Queues/Live/Campaigns. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  /* Derive all rows from live data — memoised so buildAgentRows (and the KPI
     computations that follow) only re-run when the underlying live data
     actually changes, not on every render triggered by parent state. */
  const rows = useMemo(
    () => buildAgentRows({ agentRows, queues, usersOnlineStatus, activeQueueCalls }),
    [agentRows, queues, usersOnlineStatus, activeQueueCalls],
  );

  /* Client-side search: filter here so we can paginate the results before
     handing them to TableManager, rather than letting TableManager filter
     an already-sliced page and silently drop matches on other pages. */
  const filteredRows = useMemo(() => {
    const q = (globalSearch ?? '').toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        String(row.extension ?? '').includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.queueOrCampaign.toLowerCase().includes(q) ||
        row.callerId.toLowerCase().includes(q),
    );
  }, [rows, globalSearch]);

  /* ── KPI stats — memoised on the full row set ──────────────────────────── */
  const kpi = useMemo(() => {
    const onlineCount = rows.filter((row) => row.isOnline).length;
    const onCallCount = rows.filter(
      (row) => row.status === 'On Call' || row.status === 'Ringing' || row.status === 'On Hold',
    ).length;
    const zeroActivityCount = rows.filter((row) => row.handledToday === 0).length;
    const noQueueCount = rows.filter((row) => row.queuesCount === 0).length;
    const ahtValues = rows.filter((row) => row.aht !== null && row.handledToday > 0);
    const weightedAhtTotal = ahtValues.reduce(
      (sum, row) => sum + (row.aht as number) * row.handledToday,
      0,
    );
    const weightedAhtCalls = ahtValues.reduce((sum, row) => sum + row.handledToday, 0);
    const avgAht = weightedAhtCalls ? weightedAhtTotal / weightedAhtCalls : null;
    const totalIncoming = rows.reduce((sum, row) => sum + row.incomingCalls, 0);
    const totalOutgoing = rows.reduce((sum, row) => sum + row.outgoingCalls, 0);
    const topPerformer = rows.reduce(
      (top: (typeof rows)[number] | null, row) =>
        !top || row.handledToday > top.handledToday ? row : top,
      null,
    );
    const totalTalkMinutes = rows.reduce((sum, row) => sum + row.timeOnCallsMinutes, 0);
    const totalInOut = totalIncoming + totalOutgoing;
    const inboundPct = totalInOut ? Math.round((totalIncoming / totalInOut) * 100) : 0;
    const noQueuePct = rows.length ? Math.round((noQueueCount / rows.length) * 100) : 0;

    /* Status breakdown -- every live status a row can report, count and
       share of the roster, busiest first (the same read order the
       reference lists them in). */
    const statusBreakdown = AGENT_STATES.map((state) => ({
      state,
      count: rows.filter((row) => row.status === state).length,
    })).sort((a, b) => b.count - a.count);
    const maxStatusCount = Math.max(1, ...statusBreakdown.map((s) => s.count));

    /* Agent Status Overview -- the same 7 live statuses collapsed into the
       4 buckets a supervisor actually scans for: ready to take a call
       (Available), already on one (On Call/Ringing/On Hold), tied up
       off-queue (Busy/DND), or not working (Offline). Always sums to the
       full roster, so the donut's segments always add to 100%. */
    const onQueueCount = rows.filter((row) => row.status === 'Available').length;
    const auxCount = rows.filter(
      (row) => row.status === 'Busy' || row.status === 'Do Not Disturb',
    ).length;
    const offlineStatusCount = rows.filter((row) => row.status === 'Offline').length;
    const readyPct = rows.length ? Math.round((onQueueCount / rows.length) * 100) : 0;

    /* Top performers -- the three highest handled-today counts, ties
       broken by name so the list doesn't reorder on every re-render. */
    const topThree = [...rows]
      .filter((row) => row.handledToday > 0)
      .sort((a, b) => b.handledToday - a.handledToday || a.name.localeCompare(b.name))
      .slice(0, 3);

    return {
      onlineCount,
      onCallCount,
      zeroActivityCount,
      noQueueCount,
      noQueuePct,
      avgAht,
      totalIncoming,
      totalOutgoing,
      inboundPct,
      topPerformer,
      totalTalkMinutes,
      hasTopPerformer: Boolean(topPerformer && topPerformer.handledToday > 0),
      statusBreakdown,
      maxStatusCount,
      onQueueCount,
      auxCount,
      offlineStatusCount,
      readyPct,
      topThree,
    };
  }, [rows]);
  const {
    onlineCount,
    onCallCount,
    zeroActivityCount,
    noQueueCount,
    noQueuePct,
    avgAht,
    totalIncoming,
    totalOutgoing,
    inboundPct,
    topPerformer,
    totalTalkMinutes,
    hasTopPerformer,
    statusBreakdown,
    maxStatusCount,
    onQueueCount,
    auxCount,
    offlineStatusCount,
    readyPct,
    topThree,
  } = kpi;

  /* Backs the KPI band's sparklines and "vs last 30 min" trend pills —
     same rolling in-memory sampler Queues/Home use; no historical report
     endpoint exists behind these live-only figures either. */
  const { getHistory, getTrend } = useKpiHistory({
    online: onlineCount,
    topHandled: hasTopPerformer ? topPerformer!.handledToday : 0,
    onCall: onCallCount,
    zeroActivity: zeroActivityCount,
    handleTime: avgAht ?? 0,
    noQueue: noQueueCount,
    talkTime: totalTalkMinutes,
  });

  /* ── Column definitions — stable reference so TableManager never re-mounts ── */
  const columns = useMemo(() => [
    {
      header: 'Agent',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row.original;
        return (
          <div className="ag-agent-cell">
            <CustomAvatar
              name={data.name}
              image={data.image}
              extension={data.extension}
              showPresence
              isActivityInfo={false}
              size="36"
            />
            <div className="ag-agent-info">
              <span className="ag-agent-name">{data.name}</span>
              <span className="ag-agent-ext num">Ext {data.extension || '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Live Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <span
          className={`ag-status-pill ${STATUS_STYLES[row.original.status] || STATUS_STYLES.Offline}`}
        >
          <i className="ag-status-dot" aria-hidden="true" />
          {row.original.status}
        </span>
      ),
    },
    {
      header: 'Time in State',
      accessorKey: 'timeInStatus',
      cell: ({ row }: any) =>
        row.original.callStart ? (
          <Timer startTime={row.original.callStart} />
        ) : (
          <span className="ag-dash">—</span>
        ),
    },
    {
      header: 'Queue / Campaign',
      accessorKey: 'queueOrCampaign',
      cell: ({ row }: any) =>
        row.original.queueOrCampaign === '--' ? (
          <span className="ag-dash">—</span>
        ) : (
          row.original.queueOrCampaign
        ),
    },
    {
      header: 'Caller ID',
      accessorKey: 'callerId',
      cell: ({ row }: any) =>
        row.original.callerId === '--' ? (
          <span className="ag-dash">—</span>
        ) : (
          row.original.callerId
        ),
    },
    {
      header: 'Utilization',
      accessorKey: 'isOnCall',
      cell: ({ row }: any) => (
        <div className="ag-util-cell">
          <div className="ag-util-bar">
            <i
              style={{
                width: row.original.isOnCall ? '100%' : '0%',
              }}
            />
          </div>
          <span className="ag-util-pct num">{row.original.isOnCall ? '100%' : '0%'}</span>
        </div>
      ),
    },
    {
      header: 'Daily Stats',
      accessorKey: 'handledToday',
      cell: ({ row }: any) => (
        <div className="ag-daily-cell num">
          <span className="ag-daily-row">
            <span className="ag-daily-k">Calls:</span>
            <span className="ag-daily-v">{row.original.handledToday}</span>
          </span>
          <span className="ag-daily-row">
            <span className="ag-daily-k">AHT:</span>
            <span className="ag-daily-v">
              {row.original.aht === null || row.original.aht === 0 ? (
                <span className="ag-dash">—</span>
              ) : (
                formatSecsToClock(row.original.aht)
              )}
            </span>
          </span>
        </div>
      ),
    },
    {
      header: 'Queues',
      accessorKey: 'queuesCount',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    /* `pt-[20px]`, not `pt-7` (28px) — Queues' own top offset, so the first
       KPI card starts the same distance below the toolbar Queues' hero band
       does. The KPI grid below carries no vertical padding of its own
       (previously `py-3`, which stacked on top of this and doubled the
       toolbar→cards gap) — the parent `gap-[16px]` is now the only thing
       spacing the grid from the roster section beneath it. */
    <div className="perf-agents flex flex-col gap-[16px] px-[22px] pt-[20px] pb-4">
      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="perf-kpi-row">
        <PerfKpiTile
          icon={Users}
          color="#34d399"
          title="Agents Online"
          subtitle={`of ${rows.length} agents`}
          value={onlineCount}
          trend={getTrend('online')}
          goodWhenUp
          chart={{ type: 'area', data: getHistory('online') }}
        />
        <PerfKpiTile
          icon={Trophy}
          color="#fbbf24"
          title="Top Performer"
          subtitle={hasTopPerformer ? `${topPerformer!.handledToday} handled today` : ''}
          value={hasTopPerformer ? topPerformer!.name : '—'}
          trend={getTrend('topHandled')}
          goodWhenUp
          chart={{ type: 'bar', data: getHistory('topHandled') }}
        />
        <PerfKpiTile
          icon={PhoneCall}
          color="#a78bfa"
          title="Active Calls"
          subtitle={`of ${onlineCount} online`}
          value={onCallCount}
          trend={getTrend('onCall')}
          goodWhenUp
          chart={{ type: 'line', data: getHistory('onCall') }}
        />
        <PerfKpiTile
          icon={AlertTriangle}
          color="#f87171"
          title="Zero Activity"
          subtitle="Idle agents"
          value={zeroActivityCount}
          trend={getTrend('zeroActivity')}
          chart={{ type: 'bar', data: getHistory('zeroActivity') }}
        />
        <PerfKpiTile
          icon={Gauge}
          color="#fb923c"
          title="Handle Time"
          subtitle="Team average"
          value={avgAht === null ? '—' : formatSecsToClock(avgAht)}
          trend={getTrend('handleTime')}
          chart={{ type: 'line', data: getHistory('handleTime') }}
        />
        <PerfKpiTile
          icon={ArrowLeftRight}
          color="#60a5fa"
          title="Inbound Outbound"
          subtitle="incoming / outgoing"
          value={`${totalIncoming} / ${totalOutgoing}`}
        >
          <div className="perf-kpi-split">
            <div className="perf-kpi-split-row">
              <span className="perf-kpi-split-label">Inbound</span>
              <span className="perf-kpi-split-bar">
                <span style={{ width: `${inboundPct}%`, background: '#60a5fa' }} />
              </span>
              <span className="perf-kpi-split-pct">{inboundPct}%</span>
            </div>
            <div className="perf-kpi-split-row">
              <span className="perf-kpi-split-label">Outbound</span>
              <span className="perf-kpi-split-bar">
                <span style={{ width: `${100 - inboundPct}%`, background: '#fb923c' }} />
              </span>
              <span className="perf-kpi-split-pct">{100 - inboundPct}%</span>
            </div>
          </div>
        </PerfKpiTile>
        <PerfKpiTile
          icon={AlertCircle}
          color="#2dd4bf"
          title="No Queue"
          subtitle="agents"
          value={noQueueCount}
          trend={getTrend('noQueue')}
        >
          <div className="perf-kpi-body-split">
            <span className="perf-kpi-title" style={{ fontSize: 11.5, color: 'var(--ink-4, #93a0b8)' }}>
              {noQueuePct}% of the roster
            </span>
            <RadialGauge value={noQueuePct} size={48} color="#a5b4fc" />
          </div>
        </PerfKpiTile>
        <PerfKpiTile
          icon={Clock}
          color="#c084fc"
          title="Talk Time"
          subtitle="combined, all agents"
          value={formatSecsToClock(totalTalkMinutes * 60)}
          trend={getTrend('talkTime')}
          goodWhenUp
          chart={{ type: 'area', data: getHistory('talkTime') }}
        />
      </div>

      {/* ── Agent roster heading — sits above the grid below (not inside its
          left column) so the side panels' top edge lines up with the
          table's own top edge, not with this heading row. ── */}
      <div className="ag-roster-head">
        <h2 className="sect-title">
          <Users className="ag-sect-icon" />
          Agent roster
        </h2>
        <span className="ag-sect-count">
          {filteredRows.length !== rows.length
            ? `${filteredRows.length} of ${rows.length}`
            : rows.length}{' '}
          {rows.length === 1 ? 'agent' : 'agents'}
        </span>
      </div>

      <div className="ag-layout">
        <div className="ag-table-section">
          <TableManager
            columns={columns}
            staticData={filteredRows}
            loading={isLoading}
            search={globalSearch ?? ''}
            isHeightSet={false}
            emptyTablePlaceholder={
              globalSearch?.trim() ? 'No agents match your search' : 'No agent activity yet'
            }
            descriptionEmptyTable={
              globalSearch?.trim() ? '' : 'Agent stats appear once calls are handled today.'
            }
          />
        </div>

        {/* ── Side panels: status overview, status breakdown, top performers ── */}
        <div className="ag-side-panels">
          <AgentStatusOverview
            total={rows.length}
            onQueueCount={onQueueCount}
            onCallCount={onCallCount}
            auxCount={auxCount}
            offlineCount={offlineStatusCount}
            readyPct={readyPct}
          />
          <StatusBreakdownCard breakdown={statusBreakdown} maxCount={maxStatusCount} />
          <TopPerformersCard rows={topThree} />
        </div>
      </div>
    </div>
  );
};

/* ── Agent Status Overview — a donut instead of the multi-axis-shaped
   pentagon a radar chart implies, since this is one whole (the roster)
   split into parts, not several independent measures to compare. ── */
const OVERVIEW_SEGMENTS = [
  { key: 'onQueue', label: 'On Queue', color: '#fdba8c' },
  { key: 'onCall', label: 'On Call', color: '#fde68a' },
  { key: 'aux', label: 'Aux', color: '#e7d4b5' },
  { key: 'offline', label: 'Offline', color: '#e2e8f0' },
] as const;

const AgentStatusOverview = ({
  total,
  onQueueCount,
  onCallCount,
  auxCount,
  offlineCount,
  readyPct,
}: {
  total: number;
  onQueueCount: number;
  onCallCount: number;
  auxCount: number;
  offlineCount: number;
  readyPct: number;
}) => {
  const counts = { onQueue: onQueueCount, onCall: onCallCount, aux: auxCount, offline: offlineCount };
  const r = 52;
  const circumference = 2 * Math.PI * r;
  let cursor = 0;
  const arcs = OVERVIEW_SEGMENTS.map((segment) => {
    const count = counts[segment.key];
    const pct = total ? count / total : 0;
    const len = pct * circumference;
    const arc = { ...segment, count, pct: Math.round(pct * 100), len, offset: -cursor };
    cursor += len;
    return arc;
  });

  return (
    <div className="ag-panel">
      <div className="ag-panel-title">Agent Status Overview</div>
      <div className="ag-donut-wrap">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(150,100,50,0.1)" strokeWidth="16" />
          {arcs.map(
            (arc) =>
              arc.len > 0 && (
                <circle
                  key={arc.key}
                  cx="65"
                  cy="65"
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="16"
                  strokeDasharray={`${arc.len} ${circumference - arc.len}`}
                  strokeDashoffset={arc.offset}
                  transform="rotate(-90 65 65)"
                />
              ),
          )}
          <text x="65" y="61" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1a1a1a">
            {total}
          </text>
          <text x="65" y="78" textAnchor="middle" fontSize="10" fill="#8a8578">
            Total Agents
          </text>
        </svg>
      </div>
      <div className="ag-donut-legend">
        {arcs.map((arc) => (
          <div className="ag-donut-legend-row" key={arc.key}>
            <span className="ag-donut-legend-label">
              <i style={{ background: arc.color }} />
              {arc.label}
            </span>
            <span className="ag-donut-legend-value">
              {arc.count} ({arc.pct}%)
            </span>
          </div>
        ))}
      </div>
      <div className="ag-tip-banner">
        <Headset size={16} />
        <span>
          Keep your team productive! {readyPct}% of your team is ready to take calls.
        </span>
      </div>
    </div>
  );
};

/* ── Status breakdown — every live status, busiest first. ── */
const StatusBreakdownCard = ({
  breakdown,
  maxCount,
}: {
  breakdown: { state: string; count: number }[];
  maxCount: number;
}) => (
  <div className="ag-panel">
    <div className="ag-panel-title">Status breakdown</div>
    <div className="ag-breakdown-list">
      {breakdown.map(({ state, count }) => {
        const tone = STATUS_TONE[state] ?? STATUS_TONE.Offline;
        return (
          <div className="ag-breakdown-row" key={state}>
            <span className="ag-breakdown-label" style={{ color: tone.ink }}>
              {state}
            </span>
            <span className="ag-breakdown-bar">
              <span
                style={{ width: `${maxCount ? (count / maxCount) * 100 : 0}%`, background: tone.bar }}
              />
            </span>
            <span className="ag-breakdown-count">{count}</span>
          </div>
        );
      })}
    </div>
  </div>
);

/* ── Top performers — top 3 by calls handled today. ── */
const TopPerformersCard = ({ rows }: { rows: any[] }) => (
  <div className="ag-panel">
    <div className="ag-panel-title">Top performers</div>
    {rows.length === 0 ? (
      <p className="ag-panel-empty">No calls handled yet today.</p>
    ) : (
      <div className="ag-top-list">
        {rows.map((row, index) => {
          const tone = AVATAR_TONES[index % AVATAR_TONES.length];
          const dot = STATUS_TONE[row.status]?.dot ?? STATUS_TONE.Offline.dot;
          return (
            <div className="ag-top-row" key={row.uuid}>
              <div className="ag-top-agent">
                <span className="ag-top-avatar" style={{ background: tone.bg, color: tone.ink }}>
                  {initials(row.name)}
                  <i style={{ background: dot }} />
                </span>
                <div>
                  <div className="ag-top-name">{row.name}</div>
                  <div className="ag-top-ext">Ext {row.extension || '—'}</div>
                </div>
              </div>
              <div className="ag-top-handled">
                <div className="ag-top-handled-v">{row.handledToday}</div>
                <div className="ag-top-handled-k">handled</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default AgentsTab;
