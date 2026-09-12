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
} from 'lucide-react';
import TableManager from '@/components/custom/table-manager';
import buildAgentRows from './agent-rows';
import Timer from '@/components/timer';
import CustomAvatar from '@/components/custom/custom-avatar';
import PerfStatCard from './stat-card';
import { formatSecsToClock } from './format';
import './agents-theme.css';

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
    return {
      onlineCount,
      onCallCount,
      zeroActivityCount,
      noQueueCount,
      avgAht,
      totalIncoming,
      totalOutgoing,
      topPerformer,
      totalTalkMinutes,
      hasTopPerformer: Boolean(topPerformer && topPerformer.handledToday > 0),
    };
  }, [rows]);
  const {
    onlineCount,
    onCallCount,
    zeroActivityCount,
    noQueueCount,
    avgAht,
    totalIncoming,
    totalOutgoing,
    topPerformer,
    totalTalkMinutes,
    hasTopPerformer,
  } = kpi;

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
      <div className="grid grid-cols-2 gap-2 md:grid-cols-8">
        <PerfStatCard
          label={'Agents\nOnline'}
          value={String(onlineCount)}
          sub={`of ${rows.length} agents`}
          icon={Users}
        />
        <PerfStatCard
          label={'Top\nPerformer'}
          value={hasTopPerformer ? topPerformer!.name : '—'}
          sub={hasTopPerformer ? `${topPerformer!.handledToday} handled today` : undefined}
          icon={Trophy}
          highlight="gold"
        />
        <PerfStatCard
          label={'Active\nCalls'}
          value={String(onCallCount)}
          sub={`of ${onlineCount} online`}
          icon={PhoneCall}
        />
        <PerfStatCard
          label={'Zero\nActivity'}
          value={String(zeroActivityCount)}
          sub="Idle agents"
          icon={AlertTriangle}
        />
        <PerfStatCard
          label={'Handle\nTime'}
          value={avgAht === null ? '—' : formatSecsToClock(avgAht)}
          sub="Team average"
          icon={Gauge}
        />
        <PerfStatCard
          label={'Inbound\nOutbound'}
          value={`${totalIncoming} / ${totalOutgoing}`}
          sub="incoming / outgoing"
          icon={ArrowLeftRight}
        />
        <PerfStatCard
          label={'No\nQueue'}
          value={String(noQueueCount)}
          sub="agents"
          icon={AlertCircle}
        />
        <PerfStatCard
          label={'Talk\nTime'}
          value={formatSecsToClock(totalTalkMinutes * 60)}
          sub="combined, all agents"
          icon={Clock}
        />
      </div>

      {/* ── Agent roster ───────────────────────────────────────────────────── */}
      <div className="ag-roster-section">
        <div className="flex items-center justify-between">
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
      </div>
    </div>
  );
};

export default AgentsTab;
