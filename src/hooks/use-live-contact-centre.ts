import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useCallStats } from '@/hooks/use-call-stats';
import { useQueueSeries } from '@/hooks/use-queue-series';
import {
  addServiceLevelCounts,
  describeTargets,
  emptyServiceLevelCounts,
  serviceLevelOf,
} from '@/lib/queue-series';
import { serviceLevelTargetOf, type ServiceLevelTarget } from '@/lib/queue-service-target';
import { callLogQueueList, callQueueCallbacksList, callQueueList, callReportAgentList, getUserList } from '@/services/api';
import {
  getMonitoringCallTimestamp,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
} from '@/pages/monitoring/live-call-helpers';

/**
 * The live contact-centre picture — queues, agents and the headline KPIs.
 *
 * Lifted verbatim out of `pages/performance/index.tsx` so Home and Performance
 * read the same numbers from the same sources. They used to be the same eight
 * KPIs computed in one place; putting Home on a private copy would have let the
 * two drift, and "Home says 86%, Performance says 84%" is the kind of bug
 * nobody reports and everybody stops trusting the product over.
 *
 * The commentary below is the original's and still applies — it records which
 * feeds turned out trustworthy and which did not.
 */

/* How often the live numbers are re-read.
 *
 * This was 2s for every query below, which meant four report POSTs per tab per
 * two seconds — plus the directory's roster on the same clock. On Performance,
 * Home and Directory together that was enough to trip the API's rate limiter,
 * so the screens ended up showing *less* live data than a slower poll would:
 * a 429 returns nothing at all. */
export const KPI_REFRESH_MS = 10000;

/* Queues and the user roster are configuration, not live state — they change
 * when somebody edits them, not every few seconds. They are still refetched so
 * a newly added queue or user appears without a reload, just on a clock that
 * matches how often they actually change. Live call and agent presence arrive
 * over the socket, so nothing here gates how fast the board reacts to a call. */
export const CONFIG_REFRESH_MS = 5 * 60 * 1000;
/** The service-level series is a grouped query over the range; a slower beat is plenty. */
const SERIES_REFRESH_MS = 30000;

const INTERACTING_STATUSES = ['answered', 'bridged', 'on_hold'];

const parseQueueMembers = (members: any) => {
  try {
    const parsed = typeof members === 'string' ? JSON.parse(members || '[]') : members;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export type LiveQueue = {
  uuid: string;
  name: string;
  membersCount: number;
  memberKeys: string[];
  members: any[];
  /** What this queue is measured against, from its own settings. */
  target: ServiceLevelTarget;
};

export const PERF_QUERY_KEYS = {
  queueList: 'performanceQueueList',
  userRoster: 'performanceUserRoster',
  agentReport: 'performanceAgentReportList',
  queueStats: 'performanceQueueStatsList',
} as const;

export const useLiveContactCentre = (selectedRange: any) => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { liveCalls, eventLiveCallsData, usersOnlineStatus, liveQueueCalls, campaignLiveCallsData } =
    useSocketEvents();
  const liveSummary = campaignLiveCallsData?.data?.summary;

  const activeQueueCalls = useMemo(
    () => getMonitoringLiveCalls(liveCalls, eventLiveCallsData).filter(isActiveMonitoringCall),
    [liveCalls, eventLiveCallsData],
  );

  const { data: queueRows = [], isPending: isQueuesLoading } = useQuery({
    queryKey: ['performanceQueueList'],
    queryFn: () => callQueueList({ page: 1, limit: 200, filters: [], search: '' }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: CONFIG_REFRESH_MS,
  });

  const queues: LiveQueue[] = useMemo(
    () =>
      queueRows.map((row: any) => {
        const members = parseQueueMembers(row?.members);
        const memberKeys = members
          .map((member: any) => String(member?.user_uuid || member?.uuid || member?.extension || ''))
          .filter(Boolean);
        return {
          uuid: row?.uuid,
          name: row?.name || 'Untitled queue',
          membersCount: members.length,
          memberKeys,
          members,
          target: serviceLevelTargetOf(row),
        };
      }),
    [queueRows],
  );

  /* Each queue's own answering seconds, for the call-log arithmetic below. The
     server-side Queue report already measures every queue against its own
     number; this hands the same numbers to the client-side figures so
     Performance and the report cannot disagree about one queue. */
  const targetsByQueueUuid = useMemo(() => {
    const map: Record<string, ServiceLevelTarget> = {};
    queues.forEach((queue) => {
      if (queue.uuid) map[queue.uuid] = queue.target;
    });
    return map;
  }, [queues]);
  const targetSecondsByQueue = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(targetsByQueueUuid).forEach(([uuid, target]) => {
      map[uuid] = target.seconds;
    });
    return map;
  }, [targetsByQueueUuid]);

  /* Callers who asked to be called back and are keeping their place. They
     are not on a channel, so the live-call feed cannot see them; the queue
     service's ledger is the only source. Ten seconds is the same cadence the
     other summaries here use. */
  const { data: callbacks = { count: 0, by_queue: {}, rows: [] } } = useQuery({
    queryKey: ['performanceQueueCallbacks'],
    queryFn: () => callQueueCallbacksList({}),
    select: (res: any) => {
      const result = res?.data?.data?.result || {};
      return {
        count: Number(result?.count) || 0,
        by_queue: (result?.by_queue || {}) as Record<string, number>,
        rows: (result?.rows || []) as any[],
      };
    },
    refetchInterval: 10000,
  });

  const { data: roster = [], isPending: isRosterLoading } = useQuery({
    queryKey: ['performanceUserRoster'],
    queryFn: () => getUserList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: CONFIG_REFRESH_MS,
  });

  const { data: agentStatsRows = [] } = useQuery({
    queryKey: ['performanceAgentReportList', selectedRange],
    queryFn: () =>
      callReportAgentList({
        page: 1,
        limit: 200,
        timezone: browserTimezone,
        filter_date: selectedRange,
        /* No `filter` key. The agents report rejects it outright - the screen
           showed a red '"filter" is not allowed' every time this view opened -
           and an empty array filtered nothing anyway. */
      }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: KPI_REFRESH_MS,
  });

  const agentStatsByName = useMemo(() => {
    const map: Record<string, any> = {};
    agentStatsRows.forEach((row: any) => {
      const key = `${row?.first_name || ''} ${row?.last_name || ''}`.trim().toLowerCase();
      if (key) map[key] = row?.stats || {};
    });
    return map;
  }, [agentStatsRows]);

  const agentRows = useMemo(
    () =>
      roster.map((user: any) => {
        const key = `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toLowerCase();
        return { ...user, stats: agentStatsByName[key] || {} };
      }),
    [roster, agentStatsByName],
  );
  const isAgentsLoading = isRosterLoading;

  const { data: queueStatsRows = [] } = useQuery({
    queryKey: ['performanceQueueStatsList', selectedRange],
    queryFn: () =>
      callLogQueueList({
        page: 1,
        limit: 200,
        timezone: browserTimezone,
        filter_date: selectedRange,
      }),
    select: (res: any) => res?.data?.rows || res?.data?.data?.result?.rows || [],
    refetchInterval: KPI_REFRESH_MS,
  });

  const queueStatsByUuid = useMemo(() => {
    const map: Record<string, any> = {};
    queueStatsRows.forEach((row: any) => {
      if (row?.uuid) map[row.uuid] = row?.queue_stats || {};
    });
    return map;
  }, [queueStatsRows]);

  // A queue that has not been offered a call has no service level yet. The
  // feed still sends 0% for it (the percentage is forced to zero when
  // total_calls is zero), and read as a figure that 0% is a breach — Home
  // raised a red "breaching service level" for a queue nobody had rung. Such
  // queues are left out here, so every reader sees "no data" rather than 0.
  const liveSlaByName = useMemo(() => {
    const map: Record<string, number> = {};
    (liveQueueCalls || []).forEach((queue: any) => {
      if (!queue?.name || typeof queue?.sla_within_20_sec_percent !== 'number') return;
      if (typeof queue?.total_calls === 'number' && queue.total_calls <= 0) return;
      map[String(queue.name).toLowerCase()] = queue.sla_within_20_sec_percent;
    });
    return map;
  }, [liveQueueCalls]);

  // callLogQueueList (queueStatsByUuid) turned out unreliable for today's
  // handled/ASA counts — the live socket feed (same source already proven
  // correct for SLA above) reports real total_calls/avg_wait_time_sec per
  // queue, so use that instead.
  const liveQueueStatsByName = useMemo(() => {
    const map: Record<string, { totalCalls: number; avgWaitSec: number; availableCount: number }> =
      {};
    (liveQueueCalls || []).forEach((queue: any) => {
      if (!queue?.name) return;
      map[String(queue.name).toLowerCase()] = {
        totalCalls: typeof queue?.total_calls === 'number' ? queue.total_calls : 0,
        avgWaitSec: typeof queue?.avg_wait_time_sec === 'number' ? queue.avg_wait_time_sec : 0,
        availableCount: typeof queue?.available_count === 'number' ? queue.available_count : 0,
      };
    });
    return map;
  }, [liveQueueCalls]);

  const waitingCalls = useMemo(
    () => activeQueueCalls.filter((call: any) => call?.status === 'waiting'),
    [activeQueueCalls],
  );
  const interactingCalls = useMemo(
    () =>
      activeQueueCalls.filter((call: any) =>
        INTERACTING_STATUSES.includes(String(call?.status || '')),
      ),
    [activeQueueCalls],
  );
  const longestWaitingCall = useMemo(
    () =>
      waitingCalls.reduce((longest: any, call: any) => {
        if (!longest) return call;
        const callTimestamp = getMonitoringCallTimestamp(call) ?? Infinity;
        const longestTimestamp = getMonitoringCallTimestamp(longest) ?? Infinity;
        return callTimestamp < longestTimestamp ? call : longest;
      }, null),
    [waitingCalls],
  );

  // Volume figures (answered / abandoned / AHT) come from the call log for the
  // selected range. The live queue feed only carries a right-now snapshot and
  // the per-queue REST report reads near-zero for today, so neither matched
  // the call volume actually visible in Call History.
  const callStats = useCallStats(selectedRange, { targetSecondsByQueue });

  const totals = useMemo(
    () => ({ answered: callStats.answeredCalls, total: callStats.totalCalls }),
    [callStats.answeredCalls, callStats.totalCalls],
  );

  const onlineAgentsCount = (usersOnlineStatus || []).filter((user: any) => user?.online).length;

  /* The headline service level, across every queue, from totals.

     It used to be the arithmetic mean of each queue's live percentage under a
     caption that promised "80% in 20s" whatever the queues had asked for. A
     mean of percentages is not a service level - a queue that took 2 calls
     at 100% and one that took 200 at 40% did not run at 70% - and the caption
     was wrong for any queue with its own target. Now the counts come from the
     series report (answered within target, judged answered, abandoned beyond
     the floor, summed over the selected range and every queue) and the
     caption is whatever the queues actually ask for. Until that report is
     reachable the same sum is taken from the call-log rows already fetched,
     which is total-based too, just capped at the page the log returns. */
  const queueUuids = useMemo(() => queues.map((queue) => queue.uuid).filter(Boolean), [queues]);
  const { data: seriesForRange } = useQueueSeries(selectedRange, {
    granularity: 'day',
    queueUuids,
    enabled: queueUuids.length > 0,
    refetchMs: SERIES_REFRESH_MS,
  });
  const serviceLevel = useMemo(() => {
    const target = describeTargets(queues.map((queue) => queue.target));
    const reported = seriesForRange?.totals?.totals;
    if (reported) {
      return {
        percent: reported.service_level_percent,
        targetText: target.text,
        targetPercent: target.percent,
        targetsDiffer: target.differ,
        answeredUnmeasured: reported.answered_unmeasured,
        source: 'report' as const,
      };
    }
    const counts = emptyServiceLevelCounts();
    let unmeasured = 0;
    Object.values(callStats.byQueueUuid).forEach((queue) => {
      addServiceLevelCounts(counts, {
        answeredWithinTarget: queue.answeredWithinTarget,
        answeredMeasured: queue.answeredMeasured,
        abandoned: queue.missed,
      });
      unmeasured += Math.max(0, queue.answered - queue.answeredMeasured);
    });
    return {
      percent: serviceLevelOf(counts),
      targetText: target.text,
      targetPercent: target.percent,
      targetsDiffer: target.differ,
      answeredUnmeasured: unmeasured,
      source: 'call-log' as const,
    };
  }, [queues, seriesForRange, callStats.byQueueUuid]);
  const avgHandleTime =
    callStats.avgHandleSec ??
    (typeof liveSummary?.avg_handle_time === 'number' ? liveSummary.avg_handle_time : null);
  const abandonRate = callStats.abandonRate;
  /* How many of the people on queue are on a call this second.
     This is NOT occupancy. Occupancy is the share of an agent's DUTY time spent
     on calls over a period, and it needs a record of how long each person spent
     in each status — which nothing kept until agent_status_history was added.
     Shown under the industry's 75–85% occupancy target, an instantaneous
     snapshot invited a comparison that means nothing: a quiet minute reads 0%
     and a busy one reads 100%, and neither says anything about how hard anyone
     is working. Named for what it measures. */
  const agentsOnCallPct = onlineAgentsCount
    ? (interactingCalls.length / onlineAgentsCount) * 100
    : null;

  const longestWaitTimestamp = longestWaitingCall
    ? getMonitoringCallTimestamp(longestWaitingCall)
    : null;
  const longestWaitSecs = longestWaitTimestamp
    ? Math.max(0, Math.round((Date.now() - longestWaitTimestamp) / 1000))
    : 0;

  return {
    // raw feeds
    activeQueueCalls,
    usersOnlineStatus: usersOnlineStatus || [],
    liveQueueCalls: liveQueueCalls || [],
    // collections
    queues,
    agentRows,
    queueStatsByUuid,
    liveSlaByName,
    liveQueueStatsByName,
    // slices
    waitingCalls,
    callbacksWaiting: callbacks.rows as any[],
    callbacksWaitingCount: callbacks.count,
    callbacksByQueueUuid: callbacks.by_queue,
    interactingCalls,
    longestWaitingCall,
    longestWaitTimestamp,
    longestWaitSecs,
    // headline figures
    totals,
    onlineAgentsCount,
    serviceLevel,
    avgHandleTime,
    abandonRate: abandonRate as number | null,
    agentsOnCallPct,
    // call-log derived (date-ranged)
    callStats,
    cdrByQueueUuid: callStats.byQueueUuid,
    targetsByQueueUuid,
    isCdrSampled: callStats.isQueueBreakdownSampled,
    // loading
    isQueuesLoading,
    isAgentsLoading,
  };
};
