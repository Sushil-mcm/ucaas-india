import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callList } from '@/services/api';
import { formatSecondsToMMSS } from '@/lib/utils';
import { SERVICE_LEVEL_DEFAULTS } from '@/lib/queue-service-target';

/**
 * Shared date-ranged call stats, derived from the call log (CDR).
 *
 * Why this exists: the per-queue REST report (`callLogQueueList`) reads
 * near-zero for "today" — the app's own shipped Queue report calls it with no
 * date filter at all — and the live socket queue feed only carries a
 * right-now snapshot. Neither matched the call volume actually visible in
 * Call History, which is why Performance showed empty cards and tables while
 * real calls were being handled. `callList` is the real CDR, so every
 * date-ranged number is derived from it here, once, and shared.
 */

/* How many call-log rows the derived figures are built from.
   There is no server-side cap on this endpoint — 200 was a client-side choice,
   and it made the per-queue breakdown a sample of the last 200 calls while the
   screen told the reader it covered 1,000. Headline totals come from the server
   aggregate either way; this is what the per-queue and per-agent breakdowns
   have to work with, so it is exported and quoted on screen rather than
   described from memory. */
export const CDR_LIMIT = 1000;
const REFRESH_MS = 15000;

/** Accepts a number of seconds or an "HH:MM:SS" string. */
const parseSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (!trimmed.includes(':')) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : null;
  }
  const parts = trimmed.split(':').map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const seconds = parts.reduceRight(
    (total, part, index) => total + part * Math.pow(60, parts.length - 1 - index),
    0,
  );
  return Math.max(0, Math.floor(seconds));
};

const toSeconds = (primary: unknown, fallback: unknown): number =>
  parseSeconds(primary) ?? parseSeconds(fallback) ?? 0;

export const callTalkSeconds = (row: any) => toSeconds(row?.billsectotal, row?.billsec);
export const callTotalSeconds = (row: any) => toSeconds(row?.durationtotal, row?.duration);
/**
 * How long the caller waited before somebody picked up.
 *
 * `waitsec` is the switch's own measurement and the figure Call History
 * already shows. It is preferred here; the subtraction is kept only as a
 * fallback for rows the switch never accounted for. The difference is not
 * cosmetic — on a held or transferred call, duration minus talk is not the
 * wait, and every service-level and speed-of-answer figure is built on this.
 */
export const callWaitSeconds = (row: any) => {
  const stored = parseSeconds(row?.waitsec);
  if (stored !== null) return stored;
  return Math.max(0, callTotalSeconds(row) - callTalkSeconds(row));
};

const isInbound = (row: any) => String(row?.direction || '').toLowerCase() === 'inbound';

/** Did this call come through a call queue? */
export const isQueueCall = (row: any) =>
  String(row?.forward_type || '').toUpperCase() === 'QUEUE';

/**
 * Was the call missed?
 *
 * Call History's own rule is "inbound and no talk time". A queue breaks it: the
 * queue answers the caller immediately so it can play hold music, so somebody
 * who gave up after 47 seconds on hold has 47 seconds of talk time and read as
 * handled — which is why every queue abandon rate showed 0%. The switch now
 * records whether an agent ever actually came on the line, and on a queue call
 * that is the only thing that settles it.
 */
export const isMissedCall = (row: any) => {
  if (isQueueCall(row) && row?.is_missed !== null && row?.is_missed !== undefined) {
    return Number(row.is_missed) === 1;
  }
  return isInbound(row) && callTalkSeconds(row) === 0 && !row?.is_voicemail;
};

/**
 * Time an agent actually spent talking to the caller.
 *
 * Same reason: on a queue call the hold music is inside billsec, so counting
 * billsec as handle time reports a two-minute wait and a ten-second
 * conversation as a two-minute-ten handle. The wait is recorded separately, so
 * take it back out.
 */
export const callHandleSeconds = (row: any) => {
  const talk = callTalkSeconds(row);
  if (!isQueueCall(row)) return talk;
  return Math.max(0, talk - callWaitSeconds(row));
};

/** What a queue with no target of its own is measured against: the platform
    default, defined once in queue-service-target and re-exported here for the
    readers that already import it from this module. */
export const SERVICE_LEVEL_TARGET_SEC: number = SERVICE_LEVEL_DEFAULTS.seconds;
const EMPTY_TARGETS: Record<string, number> = {};

/**
 * How long the caller waited in a queue, or null when nobody measured it.
 *
 * The fallback in `callWaitSeconds` — total time minus talk time — cannot be
 * used here. On a queue call the hold music is inside BOTH, so the subtraction
 * lands on zero, and a queue whose waits were never recorded would report an
 * average speed of answer of 00:00 and a 100% service level. That reads as
 * excellent when the truth is that nothing is known. A blank is the honest
 * answer, and these calls are left out of the averages rather than counted as
 * instant.
 */
export const queueWaitSeconds = (row: any): number | null => parseSeconds(row?.waitsec);

/**
 * The caller's wait, formatted for a call-log column, or a dash when it was
 * never measured.
 *
 * Four screens showed a column called "Wait Time" and computed it four
 * different ways: three subtracted talk from total and never read `waitsec` at
 * all, and the fourth fell back to printing the talk time when `waitsec` was
 * missing. On a queue call the subtraction is not merely imprecise — the hold
 * music sits inside both figures, so it lands on 00:00, and a queue whose
 * waits were never recorded reads as answered instantly.
 *
 * So the rule differs by call type, deliberately:
 *   - queue call, `waitsec` present  -> show it, it is the switch's own figure
 *   - queue call, `waitsec` absent   -> show a dash; nothing is known, and a
 *                                       plausible-looking number is worse than
 *                                       an honest blank
 *   - anything else                  -> the subtraction stands, as before
 *
 * Non-queue rows keep their existing behaviour so nothing that reads correctly
 * today changes.
 */
export const formatCallWaitTime = (row: any, blank = '—'): string => {
  if (isQueueCall(row)) {
    const measured = queueWaitSeconds(row);
    return measured === null ? blank : formatSecondsToMMSS(measured);
  }
  return formatSecondsToMMSS(callWaitSeconds(row));
};

/**
 * Which queue a call belongs to. Mirrors `isMonitoringCallForForwardValue`,
 * which accepts several id fields because the platform is not consistent
 * about which one it populates.
 */
const queueKeyOf = (row: any): string => {
  const candidate = [row?.forward_value, row?.forward_uuid, row?.queue_uuid, row?.queue_id].find(
    (value) => value !== null && value !== undefined && String(value).trim() !== '',
  );
  return candidate === undefined ? '' : String(candidate).trim();
};

export type QueueAgentStats = {
  /** The agent's extension — the only agent identity a CDR row carries. */
  extension: string;
  handled: number;
  talkSec: number;
  avgHandleSec: number;
  avgWaitSec: number | null;
  /** Blank when none of this agent's calls had a wait recorded. */
  longestWaitSec: number | null;
};

export type QueueCallStats = {
  total: number;
  answered: number;
  missed: number;
  avgWaitSec: number | null;
  avgHandleSec: number | null;
  /** Longest any caller waited in this queue over the range. */
  longestWaitSec: number | null;
  /** Share of answered calls picked up inside `targetSec`. */
  serviceLevelPct: number | null;
  /** The counts behind it, so several queues can be summed into one service
      level instead of averaging their percentages. */
  answeredWithinTarget: number;
  /** Answered calls whose wait was recorded - the only ones that can be judged. */
  answeredMeasured: number;
  /** The seconds that share was measured against: the queue's own, else 20. */
  targetSec: number;
  /** Total time agents spent talking to this queue's callers. */
  talkSec: number;
  /** One row per agent who answered for this queue, busiest first. */
  agents: QueueAgentStats[];
};

export type CallStatsOptions = {
  /**
   * Each queue's own answering target in seconds, keyed by queue uuid. A queue
   * absent here is measured against the platform's SERVICE_LEVEL_TARGET_SEC —
   * the same fallback the server-side Queue report applies — so the two
   * screens can never quote different service levels for the same queue.
   */
  targetSecondsByQueue?: Record<string, number>;
};

export const useCallStats = (
  selectedRange: { from: string; to: string },
  options: CallStatsOptions = {},
) => {
  const { data, isPending } = useQuery({
    queryKey: ['sharedCallStats', selectedRange?.from, selectedRange?.to],
    queryFn: () => callList({ page: 1, limit: CDR_LIMIT, filter_date: selectedRange }),
    select: (res: any) => {
      const result = res?.data?.data?.result || {};
      return {
        rows: Array.isArray(result?.rows) ? result.rows : [],
        callStats: result?.call_stats || null,
        totalCount: Number(result?.totalItems ?? result?.total ?? 0) || 0,
      };
    },
    refetchInterval: REFRESH_MS,
    enabled: Boolean(selectedRange?.from && selectedRange?.to),
  });

  const rows = data?.rows;
  const callStats = data?.callStats;
  const totalCount = data?.totalCount;
  const targetSecondsByQueue = options.targetSecondsByQueue || EMPTY_TARGETS;

  return useMemo(() => {
    const safeRows: any[] = rows || [];
    const stats = callStats || null;
    const count = totalCount || 0;

    // Headline volume comes from the server-side aggregate so it stays correct
    // even when the row sample below is capped.
    const totalCalls = Number(stats?.total_calls ?? 0) || 0;
    const missedCalls = Number(stats?.missed_calls ?? 0) || 0;
    const answeredCalls = Math.max(0, totalCalls - missedCalls);

    // Per-queue breakdown has no server-side aggregate, so it's grouped from
    // the CDR rows and flagged as sampled when the range exceeds one page.
    type AgentBucket = {
      handled: number;
      talkTotal: number;
      waitTotal: number;
      waitCount: number;
      longestWait: number;
    };
    type QueueBucket = {
      total: number;
      answered: number;
      missed: number;
      waitTotal: number;
      handleTotal: number;
      waitCount: number;
      longestWait: number;
      withinTarget: number;
      /** The seconds this queue's service level is measured against. */
      targetSec: number;
      agents: Record<string, AgentBucket>;
    };
    const working: Record<string, QueueBucket> = {};

    let waitTotal = 0;
    let waitCount = 0;
    let handleTotal = 0;
    let handleCount = 0;
    let totalCharge = 0;

    safeRows.forEach((row: any) => {
      const talk = callTalkSeconds(row);
      const wait = callWaitSeconds(row);

      totalCharge += Number(row?.chargeTotal) || Number(row?.charge) || 0;

      // Speed of answer is the average wait of the calls somebody answered.
      // Averaging abandoned calls into it drags the figure toward zero, so the
      // more calls fail instantly the healthier it would read — backwards.
      if (talk > 0) {
        handleTotal += talk;
        handleCount += 1;
        waitTotal += wait;
        waitCount += 1;
      }

      if (!isQueueCall(row)) return;
      const queueKey = queueKeyOf(row);
      if (!queueKey) return;

      if (!working[queueKey]) {
        working[queueKey] = {
          total: 0,
          answered: 0,
          missed: 0,
          waitTotal: 0,
          handleTotal: 0,
          waitCount: 0,
          longestWait: 0,
          withinTarget: 0,
          targetSec: targetSecondsByQueue[queueKey] ?? SERVICE_LEVEL_TARGET_SEC,
          agents: {},
        };
      }
      const bucket = working[queueKey];
      bucket.total += 1;
      const queueWait = queueWaitSeconds(row);
      // Every caller waited, whether or not anyone ever picked up — and the
      // ones who gave up are usually the longest waits in the range, so
      // leaving them out would flatter the queue exactly where it is worst.
      if (queueWait !== null) bucket.longestWait = Math.max(bucket.longestWait, queueWait);

      const missed = isMissedCall(row);
      if (missed) {
        bucket.missed += 1;
        return;
      }

      // Handle time is averaged only over the calls somebody answered: folding
      // abandoned calls in drags the figure toward zero, so the more calls
      // fail the healthier it reads — backwards. Wait and service level go
      // further and skip calls whose wait was never recorded, rather than
      // treating an unknown as an instant answer.
      const handle = callHandleSeconds(row);
      bucket.answered += 1;
      bucket.handleTotal += handle;
      if (queueWait !== null) {
        bucket.waitTotal += queueWait;
        bucket.waitCount += 1;
        if (queueWait <= bucket.targetSec) bucket.withinTarget += 1;
      }

      // Which of our people took it. Only a real extension counts — a caller's
      // own number sitting in this column would be reported as an agent.
      const agentKey = String(row?.extension ?? '').trim();
      if (!agentKey) return;
      if (!bucket.agents[agentKey]) {
        bucket.agents[agentKey] = {
          handled: 0,
          talkTotal: 0,
          waitTotal: 0,
          waitCount: 0,
          longestWait: 0,
        };
      }
      const agent = bucket.agents[agentKey];
      agent.handled += 1;
      agent.talkTotal += handle;
      if (queueWait !== null) {
        agent.waitTotal += queueWait;
        agent.waitCount += 1;
        agent.longestWait = Math.max(agent.longestWait, queueWait);
      }
    });

    const byQueueUuid: Record<string, QueueCallStats> = {};
    Object.entries(working).forEach(([queueKey, bucket]) => {
      byQueueUuid[queueKey] = {
        total: bucket.total,
        answered: bucket.answered,
        missed: bucket.missed,
        avgWaitSec: bucket.waitCount ? bucket.waitTotal / bucket.waitCount : null,
        avgHandleSec: bucket.answered ? bucket.handleTotal / bucket.answered : null,
        longestWaitSec: bucket.waitCount ? bucket.longestWait : null,
        serviceLevelPct: bucket.waitCount ? (bucket.withinTarget / bucket.waitCount) * 100 : null,
        answeredWithinTarget: bucket.withinTarget,
        answeredMeasured: bucket.waitCount,
        targetSec: bucket.targetSec,
        talkSec: bucket.handleTotal,
        agents: Object.entries(bucket.agents)
          .map(([extension, agent]) => ({
            extension,
            handled: agent.handled,
            talkSec: agent.talkTotal,
            avgHandleSec: agent.talkTotal / agent.handled,
            avgWaitSec: agent.waitCount ? agent.waitTotal / agent.waitCount : null,
            longestWaitSec: agent.waitCount ? agent.longestWait : null,
          }))
          .sort((a, b) => b.handled - a.handled || b.talkSec - a.talkSec),
      };
    });

    return {
      isPending,
      rows: safeRows,
      callStats: stats,
      totalCalls,
      missedCalls,
      answeredCalls,
      inboundCalls: Number(stats?.inbound_calls ?? 0) || 0,
      outboundCalls: Number(stats?.outbound_calls ?? 0) || 0,
      voicemailCalls: Number(stats?.voicemail ?? 0) || 0,
      abandonRate: totalCalls ? (missedCalls / totalCalls) * 100 : null,
      avgWaitSec: waitCount ? waitTotal / waitCount : null,
      avgHandleSec: handleCount ? handleTotal / handleCount : null,
      totalCharge,
      byQueueUuid,
      /** True when the range holds more calls than the single page pulled. */
      isQueueBreakdownSampled: count > safeRows.length,
      sampledRowCount: safeRows.length,
      totalCount: count,
    };
  }, [rows, callStats, totalCount, isPending, targetSecondsByQueue]);
};
