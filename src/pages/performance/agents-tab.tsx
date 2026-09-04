import { useEffect } from 'react';
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

const AgentsTab = ({
  agentRows,
  usersOnlineStatus,
  activeQueueCalls,
  queues,
  isLoading,
}: {
  agentRows: any[];
  usersOnlineStatus: any[];
  activeQueueCalls: any[];
  queues: QueueMembership[];
  isLoading: boolean;
}) => {
  /* The warm ambient backdrop renders one level up, in the Performance page
     shell (index.tsx) — flagging the document while this tab is open is
     what lets agents-theme.css reach it, the same convention Queues/Live/
     Campaigns already use. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  const rows = buildAgentRows({ agentRows, queues, usersOnlineStatus, activeQueueCalls });

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

  const columns = [
    {
      header: 'Agent Info',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row.original;
        return (
          <div className="flex items-center gap-2">
            <CustomAvatar
              name={data.name}
              image={data.image}
              extension={data.extension}
              showPresence
              isActivityInfo={false}
              size="36"
            />
            <div className="flex flex-col">
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.01em' }}>
                {data.name}
              </span>
              <span className="num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                Ext: {data.extension || '—'}
              </span>
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
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${STATUS_STYLES[row.original.status] || STATUS_STYLES.Offline}`}
        >
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
          <span style={{ color: 'var(--ink-4)' }}>00:00:00</span>
        ),
    },
    { header: 'Queue / Campaign', accessorKey: 'queueOrCampaign' },
    { header: 'Caller ID', accessorKey: 'callerId' },
    {
      header: 'Utilization',
      accessorKey: 'isOnCall',
      cell: ({ row }: any) => (
        <div className="flex w-28 items-center gap-2">
          <div className="hbar-t" style={{ flex: 1 }}>
            <i
              style={{
                background: row.original.isOnCall ? 'var(--accent)' : 'var(--surface-3)',
                width: row.original.isOnCall ? '100%' : '0%',
              }}
            />
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
            {row.original.isOnCall ? '100%' : '0%'}
          </span>
        </div>
      ),
    },
    {
      header: 'Daily Stats',
      accessorKey: 'handledToday',
      cell: ({ row }: any) => (
        <div className="flex flex-col" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
          <span>Calls: {row.original.handledToday}</span>
          <span>AHT: {row.original.aht === null ? '—' : formatSecsToClock(row.original.aht)}</span>
        </div>
      ),
    },
    { header: 'Queues', accessorKey: 'queuesCount' },
  ];

  const hasTopPerformer = Boolean(topPerformer && topPerformer.handledToday > 0);

  return (
    <div className="perf-agents flex flex-col gap-3 px-[22px] py-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <PerfStatCard
          label="Online"
          value={String(onlineCount)}
          sub={`of ${rows.length} agents`}
          icon={Users}
        />
        <PerfStatCard
          label="Top performer"
          value={hasTopPerformer ? topPerformer!.name : '—'}
          sub={hasTopPerformer ? `${topPerformer!.handledToday} handled today` : undefined}
          icon={Trophy}
        />
        <PerfStatCard
          label="On a call"
          value={String(onCallCount)}
          sub={`of ${onlineCount} online`}
          icon={PhoneCall}
        />
        <PerfStatCard
          label="Zero activity"
          value={String(zeroActivityCount)}
          sub="online, nothing handled"
          icon={AlertTriangle}
        />
        <PerfStatCard
          label="Avg AHT"
          value={avgAht === null ? '—' : formatSecsToClock(avgAht)}
          icon={Gauge}
        />
        <PerfStatCard
          label="In / out calls"
          value={`${totalIncoming} / ${totalOutgoing}`}
          sub="incoming / outgoing"
          icon={ArrowLeftRight}
        />
        <PerfStatCard label="No queue assigned" value={String(noQueueCount)} icon={AlertCircle} />
        <PerfStatCard
          label="Talk time today"
          value={formatSecsToClock(totalTalkMinutes * 60)}
          sub="combined, all agents"
          icon={Clock}
        />
      </div>
      <TableManager
        columns={columns}
        staticData={rows}
        loading={isLoading}
        showPagination={false}
        emptyTablePlaceholder="No agent activity yet"
        descriptionEmptyTable="Agent stats appear once calls are handled today."
      />
    </div>
  );
};

export default AgentsTab;
