import {
  getMonitoringCallTimestamp,
  isMonitoringCallForForwardValue,
} from '@/pages/monitoring/live-call-helpers';
import type { QueueCallStats } from '@/hooks/use-call-stats';
import { formatPercent } from './format';

/**
 * One derivation of a queue's live row, shared by Performance ▸ Queues and the
 * Home overview.
 *
 * Both surfaces read the same `useLiveContactCentre` feed, so they must also do
 * the same arithmetic on it — otherwise Home and Performance can quote
 * different SLA or waiting figures for the same queue in the same second. This
 * is that arithmetic, in one place.
 */

export const INTERACTING_STATUSES = ['answered', 'bridged', 'on_hold'];

export type QueueRow = {
  uuid: string;
  name: string;
  membersCount: number;
  memberKeys: string[];
  members: any[];
};

export type QueueStats = {
  answered_calls?: number;
  missed_calls?: number;
  total_calls?: number;
  avg_waiting_time?: number;
};

export type LiveQueueStats = { totalCalls: number; avgWaitSec: number; availableCount: number };

export type LiveQueueRow = QueueRow & {
  waiting: number;
  interacting: number;
  longestWaitTimestamp: number | null;
  handledToday: number | null;
  offered: number | null;
  sla: number | null;
  asa: number | null;
  aht: number | null;
  available: number;
  abandonRate: string;
};

type BuildInput = {
  queues: QueueRow[];
  activeQueueCalls: any[];
  queueStatsByUuid: Record<string, QueueStats>;
  liveSlaByName: Record<string, number>;
  liveQueueStatsByName: Record<string, LiveQueueStats>;
  cdrByQueueUuid?: Record<string, QueueCallStats>;
};

export const buildQueueRows = ({
  queues,
  activeQueueCalls,
  queueStatsByUuid,
  liveSlaByName,
  liveQueueStatsByName,
  cdrByQueueUuid,
}: BuildInput): LiveQueueRow[] =>
  queues.map((queue) => {
    const queueCalls = activeQueueCalls.filter((call) =>
      isMonitoringCallForForwardValue(call, queue.uuid),
    );
    const waitingCalls = queueCalls.filter((call) => call?.status === 'waiting');
    const interactingCalls = queueCalls.filter((call) =>
      INTERACTING_STATUSES.includes(String(call?.status || '')),
    );
    const longestWaitingCall = waitingCalls.reduce((longest: any, call: any) => {
      if (!longest) return call;
      const callTimestamp = getMonitoringCallTimestamp(call) ?? Infinity;
      const longestTimestamp = getMonitoringCallTimestamp(longest) ?? Infinity;
      return callTimestamp < longestTimestamp ? call : longest;
    }, null);

    const stats = queueStatsByUuid[queue.uuid] || {};
    const liveStats = liveQueueStatsByName[queue.name?.toLowerCase?.() || ''];
    const sla = liveSlaByName[queue.name?.toLowerCase?.() || ''];

    // The call log is the source of truth for the selected range; the REST
    // queue report and the live socket counter are only fallbacks now.
    const cdr = cdrByQueueUuid?.[queue.uuid];

    const handled =
      cdr?.answered ??
      (typeof stats.answered_calls === 'number' ? stats.answered_calls : null) ??
      (liveStats ? liveStats.totalCalls : null);
    const asa = cdr?.avgWaitSec ?? (liveStats ? liveStats.avgWaitSec : null);

    const abandonedCount = cdr?.missed ?? stats.missed_calls;
    const offeredCount = cdr?.total ?? stats.total_calls;
    const abandonRate = offeredCount ? formatPercent(abandonedCount || 0, offeredCount) : '—';

    return {
      ...queue,
      waiting: waitingCalls.length,
      interacting: interactingCalls.length,
      longestWaitTimestamp: longestWaitingCall
        ? getMonitoringCallTimestamp(longestWaitingCall)
        : null,
      handledToday: handled,
      offered: offeredCount ?? null,
      sla: typeof sla === 'number' ? sla : null,
      asa,
      aht: cdr?.avgHandleSec ?? null,
      available: liveStats ? liveStats.availableCount : 0,
      abandonRate,
    };
  });

export default buildQueueRows;
