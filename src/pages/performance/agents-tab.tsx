import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Trophy,
  PhoneCall,
  AlertTriangle,
  Gauge,
  ArrowLeftRight,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
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

const ITEMS_PER_PAGE = 10;

/* ─── Pagination ─────────────────────────────────────────────────────────── */

const AgentPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="ag-pagination">
      <span className="ag-pagination-info">
        {start}–{end} of {totalItems} agents
      </span>
      <div className="ag-pagination-controls">
        <button
          type="button"
          className="ag-page-btn ag-page-nav"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>

        {getPages().map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="ag-page-dots">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`ag-page-btn${page === currentPage ? ' is-active' : ''}`}
              onClick={() => onPageChange(page as number)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          className="ag-page-btn ag-page-nav"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
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

  const [currentPage, setCurrentPage] = useState(1);

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

  /* Reset to page 1 whenever the search query changes. */
  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

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
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        ),
    },
    { header: 'Queue / Campaign', accessorKey: 'queueOrCampaign' },
    { header: 'Caller ID', accessorKey: 'callerId' },
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
            <span className="ag-daily-k">Calls</span>
            <span className="ag-daily-v">{row.original.handledToday}</span>
          </span>
          <span className="ag-daily-row">
            <span className="ag-daily-k">AHT</span>
            <span className="ag-daily-v">
              {row.original.aht === null ? '—' : formatSecsToClock(row.original.aht)}
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
    <div className="perf-agents flex flex-col gap-4 px-[22px] py-4">
      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 py-3 md:grid-cols-8">
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
      <div className="ag-table-section">
        <div className="ag-table-head">
          <div className="ag-table-head-left">
            <h2 className="ag-table-title">Agent roster</h2>
            <span className="ag-table-count">
              {filteredRows.length !== rows.length
                ? `${filteredRows.length} of ${rows.length}`
                : rows.length}{' '}
              agents
            </span>
          </div>
        </div>

        <TableManager
          columns={columns}
          staticData={paginatedRows}
          loading={isLoading}
          showPagination={false}
          emptyTablePlaceholder={
            globalSearch?.trim() ? 'No agents match your search' : 'No agent activity yet'
          }
          descriptionEmptyTable={
            globalSearch?.trim() ? '' : 'Agent stats appear once calls are handled today.'
          }
        />

        <AgentPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AgentsTab;
