import { useEffect } from 'react';
import TableManager from '@/components/custom/table-manager';
import Timer from '@/components/timer';
import { isMonitoringCallForMember } from '@/pages/monitoring/live-call-helpers';
import PerfStatCard from './stat-card';
import KpiStrip from './kpi-strip';
import type { QueueCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import buildQueueRows from './queue-rows';
import type { QueueRow, QueueStats, LiveQueueStats } from './queue-rows';
import './queues-theme.css';

export type { QueueRow } from './queue-rows';

const STATUS_STYLES: Record<string, string> = {
  'On Call': 'state busy',
  Available: 'state q',
  Offline: 'state away',
};

const getMemberStatus = (member: any, usersOnlineStatus: any[], activeQueueCalls: any[]) => {
  const key = member?.user_uuid || member?.extension || member?.uuid;
  if (!key) return 'Offline';
  if (activeQueueCalls.some((call) => isMonitoringCallForMember(call, key))) return 'On Call';
  const presence = usersOnlineStatus?.find((u: any) => String(u?.userId) === String(key));
  return presence?.online ? 'Available' : 'Offline';
};

const QUEUE_TAB_STYLES = `
  .mcm-page .live-pulse-dot-wrap { display:inline-flex; align-items:center; gap:5px; }
  .mcm-page .live-pulse-dot {
    width:7px; height:7px; border-radius:99px; background:var(--live); flex:none;
    animation: queueLivePulse 1.6s ease-out infinite;
  }
  @keyframes queueLivePulse {
    0% { box-shadow: 0 0 0 0 var(--live-wash); }
    70% { box-shadow: 0 0 0 6px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }

  /* Fixed Tailwind breakpoints (3 cols, then 6) meant the jump from 3 to 6
     columns landed at a viewport width where 6 was too narrow for this
     card's content — auto-fit adds columns only once there's genuinely
     enough room per card, and removes them just as smoothly on a narrower
     window instead of snapping at one width. */
  .mcm-page .summary-grid {
    display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap:8px; align-items:start; margin-bottom: 4px;
  }

  /* A one-number, one-line card stacked top-to-bottom left most of its own
     width empty. Laying it out left-to-right instead — value, then
     label/sub, then an icon pinned to the far edge — uses that width
     instead of wasting it. */
  .mcm-page .stat-inline { display:flex; align-items:center; gap:10px; }
  .mcm-page .stat-inline-value { margin-top:0; flex:none; white-space:nowrap; }
  .mcm-page .stat-inline-text { min-width:0; flex:1; }
  /* Pinning the summary row to 6 fixed columns leaves some labels narrower
     than their text - without this a 2-word label like "Busiest queue"
     wraps to a second line while its neighbours don't, so the cards no
     longer line up at the same height. Truncating instead keeps every
     card exactly as tall as its content, evenly. */
  .mcm-page .stat-inline-text .k {
    display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .mcm-page .stat-inline-text .d { margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mcm-page .stat-inline-icon {
    display:grid; place-items:center; width:30px; height:30px; flex:none;
    border-radius:99px; background:var(--accent-wash); color:var(--accent-ink);
  }

  /* One flat strip, cells divided by hairlines - the queue summary reads as
     one glanceable line instead of six separate boxed cards. */
  .mcm-page .kpi-strip {
    display:flex; align-items:stretch;
    background:var(--surface); border-radius:16px; overflow:hidden;
    border:1px solid var(--line);
    box-shadow: 0 1px 2px rgba(46,45,53,0.05);
    margin-bottom: 4px;
  }
  .mcm-page .kpi-strip-cell {
    flex:1; min-width:0; padding:14px 16px;
    display:flex; flex-direction:column; gap:4px;
    border-left:1px solid var(--line);
  }
  .mcm-page .kpi-strip-cell:first-child { border-left:none; }
  .mcm-page .kpi-strip-cell-breach { background:var(--crit-wash); }
  .mcm-page .kpi-strip-label {
    font-size:10.5px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--ink-3, #9A948F); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .mcm-page .kpi-strip-value {
    font-size:26px; font-weight:800; letter-spacing:-0.02em; line-height:1.15;
    color:var(--ink, #2E2D35); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .mcm-page .kpi-strip-value-success { color:var(--live); }
  .mcm-page .kpi-strip-value-danger { color:var(--crit); }
  .mcm-page .kpi-strip-sub {
    font-size:11.5px; color:var(--ink-3, #9A948F);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  @media (max-width: 1180px) {
    .mcm-page .kpi-strip { flex-wrap:wrap; }
    .mcm-page .kpi-strip-cell { flex:1 1 33.33%; min-width:150px; border-bottom:1px solid var(--line); }
  }
  @media (max-width: 620px) {
    .mcm-page .kpi-strip-cell { flex:1 1 50%; }
  }
`;

const QueuesActivityTab = ({
  queues,
  activeQueueCalls,
  queueStatsByUuid,
  liveSlaByName,
  liveQueueStatsByName,
  cdrByQueueUuid,
  isCdrSampled,
  usersOnlineStatus,
  isLoading,
  selectedQueueUuid,
  setSelectedQueueUuid,
}: {
  queues: QueueRow[];
  activeQueueCalls: any[];
  queueStatsByUuid: Record<string, QueueStats>;
  liveSlaByName: Record<string, number>;
  liveQueueStatsByName: Record<string, LiveQueueStats>;
  cdrByQueueUuid?: Record<string, QueueCallStats>;
  isCdrSampled?: boolean;
  usersOnlineStatus: any[];
  isLoading: boolean;
  selectedQueueUuid: string | null;
  setSelectedQueueUuid: (uuid: string | null) => void;
}) => {
  /* The warm ambient backdrop and the KPI hero band (Waiting / Longest wait
     / Service / Volume / Coverage) both render one level up, in the
     Performance page shell (index.tsx) — flagging the document while this
     tab is open is what lets queues-theme.css reach them, the same way
     Live and Campaigns already opt into this shared class. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  const rows = buildQueueRows({
    queues,
    activeQueueCalls,
    queueStatsByUuid,
    liveSlaByName,
    liveQueueStatsByName,
    cdrByQueueUuid,
  });

  const selectedRow = rows.find((row) => row.uuid === selectedQueueUuid) || null;

  // Prefer the queue with a live interacting call; when nothing is in progress
  // right now (common outside peak hours) fall back to who handled the most
  // today instead of always reading "—".
  const queuesWithInteracting = rows.filter((row) => row.interacting > 0);
  const busiestQueue = queuesWithInteracting.length
    ? queuesWithInteracting.reduce((top, row) => (row.interacting > top.interacting ? row : top))
    : rows.reduce((top: (typeof rows)[number] | null, row) => {
        if (row.handledToday === null) return top;
        if (!top || (top.handledToday ?? -1) < row.handledToday) return row;
        return top;
      }, null);

  const longestWaitingQueue = rows.reduce((top: (typeof rows)[number] | null, row) => {
    if (row.longestWaitTimestamp === null) return top;
    if (!top || top.longestWaitTimestamp === null) return row;
    return row.longestWaitTimestamp < top.longestWaitTimestamp ? row : top;
  }, null);
  const slaRows = rows.filter((row) => row.sla !== null);
  const lowestSlaQueue = slaRows.reduce(
    (worst: (typeof rows)[number] | null, row) =>
      !worst || (row.sla as number) < (worst.sla as number) ? row : worst,
    null,
  );
  const totalMembers = new Set(rows.flatMap((row) => row.memberKeys)).size;

  // Available Now — dedupe by agent, not by queue: an agent on 3 queues was
  // getting counted 3x by summing each queue's available_count directly.
  const distinctMembersByKey = new Map<string, any>();
  queues.forEach((queue) => {
    (queue.members || []).forEach((member: any) => {
      const key = member?.user_uuid || member?.extension || member?.uuid;
      if (key && !distinctMembersByKey.has(String(key)))
        distinctMembersByKey.set(String(key), member);
    });
  });
  const totalAvailable = Array.from(distinctMembersByKey.values()).filter(
    (member) => getMemberStatus(member, usersOnlineStatus, activeQueueCalls) === 'Available',
  ).length;

  const totalInteracting = rows.reduce((sum, row) => sum + row.interacting, 0);

  const columns = [
    {
      header: 'Queue',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <span
          className="qa-queue-name"
          onClick={() => setSelectedQueueUuid(row.original.uuid)}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      header: 'Media',
      accessorKey: 'media',
      cell: () => <span style={{ color: 'var(--ink-2)' }}>Voice</span>,
    },
    { header: 'Waiting', accessorKey: 'waiting' },
    {
      header: 'Longest',
      accessorKey: 'longestWaitTimestamp',
      cell: ({ row }: any) =>
        row.original.longestWaitTimestamp ? (
          <Timer startTime={row.original.longestWaitTimestamp} />
        ) : (
          '—'
        ),
    },
    { header: 'Members', accessorKey: 'membersCount' },
    { header: 'Interacting', accessorKey: 'interacting' },
    {
      header: 'Offered',
      accessorKey: 'offered',
      cell: ({ row }: any) => (row.original.offered === null ? '—' : row.original.offered),
    },
    {
      header: 'Handled',
      accessorKey: 'handledToday',
      cell: ({ row }: any) =>
        row.original.handledToday === null || row.original.handledToday === undefined
          ? '—'
          : row.original.handledToday,
    },
    {
      header: 'SL today',
      accessorKey: 'sla',
      cell: ({ row }: any) =>
        row.original.sla === null ? '—' : `${Math.round(row.original.sla)}%`,
    },
    {
      header: 'ASA',
      accessorKey: 'asa',
      cell: ({ row }: any) =>
        row.original.asa === null || row.original.asa === undefined
          ? '—'
          : formatSecsToClock(row.original.asa),
    },
    {
      header: 'AHT',
      accessorKey: 'aht',
      cell: ({ row }: any) =>
        row.original.aht === null ? '—' : formatSecsToClock(row.original.aht),
    },
    { header: 'Abandon', accessorKey: 'abandonRate' },
  ];

  if (selectedRow) {
    const memberRows = (selectedRow.members || []).map((member: any) => ({
      name: member?.name || 'Unknown',
      status: getMemberStatus(member, usersOnlineStatus, activeQueueCalls),
    }));

    const memberColumns = [
      { header: 'Agent', accessorKey: 'name' },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: any) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.original.status] || STATUS_STYLES.Offline}`}
          >
            {row.original.status}
          </span>
        ),
      },
    ];

    const detailKpis = [
      { label: 'Waiting', value: String(selectedRow.waiting) },
      {
        label: 'Longest wait',
        value: selectedRow.longestWaitTimestamp ? (
          <Timer startTime={selectedRow.longestWaitTimestamp} />
        ) : (
          '00:00'
        ),
      },
      { label: 'Interacting', value: String(selectedRow.interacting) },
      { label: 'Members', value: String(selectedRow.membersCount) },
      {
        label: 'Handled',
        value:
          selectedRow.handledToday === null || selectedRow.handledToday === undefined
            ? '—'
            : String(selectedRow.handledToday),
      },
      {
        label: 'Service level',
        value: selectedRow.sla === null ? '—' : `${Math.round(selectedRow.sla)}%`,
      },
      {
        label: 'ASA',
        value:
          selectedRow.asa === null || selectedRow.asa === undefined
            ? '—'
            : formatSecsToClock(selectedRow.asa),
      },
      { label: 'Abandon', value: selectedRow.abandonRate },
    ];

    return (
      <div className="perf-queues flex flex-col gap-3 px-[22px] py-4">
        <style>{QUEUE_TAB_STYLES}</style>
        <div
          className="qa-crumb flex items-center gap-1.5"
          style={{ fontSize: 11.5, color: 'var(--ink-3)' }}
        >
          <button
            type="button"
            onClick={() => setSelectedQueueUuid(null)}
            className="cursor-pointer hover:underline"
          >
            Queues Activity
          </button>
          <span>›</span>
          <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{selectedRow.name}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-.035em' }}>
          {selectedRow.name}
        </h2>

        <div className="summary-grid">
          {detailKpis.map((kpi) => (
            <PerfStatCard key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <div>
          <h3 className="sect-title" style={{ marginBottom: 8 }}>
            Members — live status
          </h3>
          <TableManager
            columns={memberColumns}
            staticData={memberRows}
            showPagination={false}
            emptyTablePlaceholder="No members in this queue"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="perf-queues flex flex-col gap-3 px-[22px] py-4">
      <KpiStrip
        items={[
          {
            key: 'busiest',
            label: 'Busiest queue',
            value: busiestQueue ? busiestQueue.name : '—',
            sub: busiestQueue
              ? busiestQueue.interacting > 0
                ? `${busiestQueue.interacting} interacting now`
                : `${busiestQueue.handledToday} handled today`
              : undefined,
          },
          {
            key: 'longest-waiting',
            label: 'Longest waiting',
            value:
              longestWaitingQueue && longestWaitingQueue.longestWaitTimestamp !== null ? (
                <Timer startTime={longestWaitingQueue.longestWaitTimestamp} />
              ) : (
                '00:00'
              ),
            sub:
              longestWaitingQueue && longestWaitingQueue.longestWaitTimestamp !== null
                ? longestWaitingQueue.name
                : undefined,
            tone:
              longestWaitingQueue && longestWaitingQueue.longestWaitTimestamp !== null
                ? 'danger'
                : 'default',
            breaching: Boolean(
              longestWaitingQueue && longestWaitingQueue.longestWaitTimestamp !== null,
            ),
          },
          {
            key: 'lowest-sla',
            label: 'Lowest SLA today',
            value: lowestSlaQueue ? `${Math.round(lowestSlaQueue.sla as number)}%` : '—',
            sub: lowestSlaQueue ? lowestSlaQueue.name : undefined,
            tone: lowestSlaQueue && (lowestSlaQueue.sla as number) < 60 ? 'danger' : 'default',
          },
          {
            key: 'total-members',
            label: 'Total members',
            value: totalMembers,
            sub: 'across all queues',
          },
          {
            key: 'available-now',
            label: 'Available now',
            value: totalAvailable,
            sub: 'free to take a call',
          },
          {
            key: 'total-interacting',
            label: 'Total interacting',
            value:
              totalInteracting > 0 ? (
                <span className="live-pulse-dot-wrap">
                  <span className="live-pulse-dot" />
                  {totalInteracting}
                </span>
              ) : (
                totalInteracting
              ),
            sub: 'on a call right now',
          },
        ]}
      />
      {isCdrSampled && (
        <div className="qa-notice">
          <p className="page-note">
            Offered, Handled, ASA, AHT and Abandon are counted from the most recent 1,000 calls in
            this range — older calls in the range aren't included in these columns.
          </p>
        </div>
      )}

      <style>{QUEUE_TAB_STYLES}</style>

      <div className="flex items-center justify-between">
        <h3 className="sect-title">Queues</h3>
      </div>

      <TableManager
        columns={columns}
        staticData={rows}
        loading={isLoading}
        showPagination={false}
        emptyTablePlaceholder="No queues configured"
        descriptionEmptyTable="Call queues you create will show live activity here."
      />
    </div>
  );
};

export default QueuesActivityTab;
