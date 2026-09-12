import {
  getMonitoringCallTimestamp,
  isMonitoringCallForForwardValue,
} from '@/pages/monitoring/live-call-helpers';
import type { QueueAgentStats, QueueCallStats } from '@/hooks/use-call-stats';
import { SERVICE_LEVEL_TARGET_SEC } from '@/hooks/use-call-stats';
import type { ServiceLevelTarget } from '@/lib/queue-service-target';
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
  /** The queue's own answering target, when the caller has it. */
  target?: ServiceLevelTarget;
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
  abandoned: number | null;
  sla: number | null;
  /** The seconds `sla` was measured against — the queue's own, else the platform's 20. */
  slaTargetSec: number;
  /** The share the queue asked to hit, or null when it set no goal. */
  slaTargetPct: number | null;
  asa: number | null;
  aht: number | null;
  available: number;
  abandonRate: string;
  /** Longest anyone waited over the selected range, answered or not. */
  longestWaitInRange: number | null;
  /** Total time agents spent talking to this queue's callers, in the range. */
  talkSec: number | null;
  /** Per-agent performance for this queue over the range, busiest first. */
  agents: QueueAgentStats[];
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

    /* Service level from the call log, so it covers the range the rest of the
       row covers. The live figure is a right-now snapshot from the socket and
       stays as the fallback for a queue with no calls in the range yet. */
    const serviceLevel =
      cdr?.serviceLevelPct ?? (typeof sla === 'number' ? sla : null);

    return {
      ...queue,
      waiting: waitingCalls.length,
      interacting: interactingCalls.length,
      longestWaitTimestamp: longestWaitingCall
        ? getMonitoringCallTimestamp(longestWaitingCall)
        : null,
      handledToday: handled,
      offered: offeredCount ?? null,
      abandoned: abandonedCount ?? null,
      sla: serviceLevel,
      slaTargetSec: cdr?.targetSec ?? queue.target?.seconds ?? SERVICE_LEVEL_TARGET_SEC,
      slaTargetPct: queue.target?.percent ?? null,
      asa,
      aht: cdr?.avgHandleSec ?? null,
      available: liveStats ? liveStats.availableCount : 0,
      abandonRate,
      longestWaitInRange: cdr?.longestWaitSec ?? null,
      talkSec: cdr?.talkSec ?? null,
      agents: cdr?.agents ?? [],
    };
  });

export default buildQueueRows;
