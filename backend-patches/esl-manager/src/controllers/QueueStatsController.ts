/**
 * Live queue figures: how many are waiting, and how long a call usually takes.
 *
 * WHY THIS EXISTS
 * The website can already be told to announce a caller's place in the line, to
 * announce the expected wait, and to offer a callback once the queue passes a
 * threshold. All three are built and all three sit inert, because nothing in the
 * platform could answer two questions: how many people are waiting in this queue
 * right now, and how long does a call in it usually take.
 *
 * Those are not database facts. They are live call state — and this service is
 * already reading it. `CallCenterController` receives `member-queue-start`,
 * `member-queue-end` and the agent bridge events from FreeSWITCH. This file adds
 * them up. It is not a new integration; it is arithmetic on a stream that is
 * already arriving.
 *
 * SAFETY
 * This runs inside the live call path. Two rules follow from that, and both are
 * enforced below rather than left to good intentions:
 *
 *   1. Nothing here may ever throw into the event handler. A bug in a statistics
 *      counter must not drop a real call. Every entry point is wrapped, and the
 *      failure mode is "no figures", never "no call".
 *   2. Memory is bounded. A queue that never reports an end event, or a service
 *      left running for months, must not grow without limit. Waiting lists are
 *      capped and pruned by age; the handle-time window is a fixed size.
 *
 * TRUST
 * `trustworthy` is the most important field this returns. An estimate given when
 * nobody is on duty, or from a handful of calls, is worse than no estimate: a
 * caller told "about two minutes" who then waits twenty is more annoyed than one
 * who was told nothing. When it is false, the caller should hear nothing.
 */

interface WaitingCaller {
  callUuid: string;
  joinedAtMs: number;
}

interface QueueState {
  waiting: WaitingCaller[];
  /** Talk time of recently completed calls, newest last. Fixed length. */
  recentHandleSeconds: number[];
  /** Agent names currently on a call in this queue. */
  agentsOnCall: Set<string>;
  /** Agent names seen available in this queue. */
  agentsAvailable: Set<string>;
}

export interface QueueStats {
  queue: string;
  waiting: number;
  agentsAvailable: number;
  averageHandleSeconds: number | null;
  estimatedWaitSeconds: number | null;
  /** False when the figures must not be read out to a caller. */
  trustworthy: boolean;
  reason?: string;
}

/* A caller who joined and never reported an end is dropped after this. Real
   waits do not run for four hours; an entry that old is a missed end event, and
   leaving it in would inflate every queue position behind it. */
const STALE_WAIT_MS = 4 * 60 * 60 * 1000;

/* Bounds. Both are deliberately generous — they exist to stop unbounded growth,
   not to model real traffic. The queue cap matches the ceiling the admin screen
   now allows. */
const MAX_WAITING_TRACKED = 500;
const HANDLE_WINDOW = 50;

/* Below this many completed calls the average says more about luck than about
   the queue, so no estimate is offered. */
const MIN_CALLS_FOR_ESTIMATE = 5;

export class QueueStatsController {
  private static queues = new Map<string, QueueState>();
  /** callUuid -> queue, so an end event can find its queue. The end event does
      not carry the queue name; only the member uuid. */
  private static callToQueue = new Map<string, string>();
  /** callUuid -> when an agent picked it up, for talk time. */
  private static answeredAtMs = new Map<string, number>();

  private static state(queue: string): QueueState {
    let existing = this.queues.get(queue);
    if (!existing) {
      existing = {
        waiting: [],
        recentHandleSeconds: [],
        agentsOnCall: new Set(),
        agentsAvailable: new Set(),
      };
      this.queues.set(queue, existing);
    }
    return existing;
  }

  private static prune(state: QueueState, nowMs: number): void {
    if (state.waiting.length === 0) return;
    const cutoff = nowMs - STALE_WAIT_MS;
    let removed = 0;
    state.waiting = state.waiting.filter((caller) => {
      const keep = caller.joinedAtMs >= cutoff;
      if (!keep) {
        this.callToQueue.delete(caller.callUuid);
        removed += 1;
      }
      return keep;
    });
    if (removed > 0) {
      console.warn(`[queue-stats] dropped ${removed} stale waiting entries`);
    }
  }

  /** A caller joined the queue. */
  public static onQueueStart(queue?: string, callUuid?: string, nowMs = Date.now()): void {
    try {
      if (!queue || !callUuid) return;
      const state = this.state(queue);
      this.prune(state, nowMs);

      /* Same caller reported twice — a retry or a duplicated event. Keep the
         first join time, because that is the one their place in the line is
         owed to. */
      if (state.waiting.some((caller) => caller.callUuid === callUuid)) return;

      if (state.waiting.length >= MAX_WAITING_TRACKED) {
        console.warn(`[queue-stats] ${queue} at the ${MAX_WAITING_TRACKED} cap, not tracking more`);
        return;
      }

      state.waiting.push({ callUuid, joinedAtMs: nowMs });
      this.callToQueue.set(callUuid, queue);
    } catch (error) {
      console.error('[queue-stats] onQueueStart failed', error);
    }
  }

  /** A caller left the queue — answered, gave up, or was sent elsewhere. */
  public static onQueueEnd(callUuid?: string, nowMs = Date.now()): void {
    try {
      if (!callUuid) return;
      const queue = this.callToQueue.get(callUuid);
      this.callToQueue.delete(callUuid);
      if (!queue) return;

      const state = this.state(queue);
      state.waiting = state.waiting.filter((caller) => caller.callUuid !== callUuid);

      /* Talk time is only counted for calls an agent actually took. Counting
         abandoned calls as zero-second handles would drag the average down and
         make every estimate optimistic — the exact direction that misleads a
         caller. */
      const answeredAt = this.answeredAtMs.get(callUuid);
      this.answeredAtMs.delete(callUuid);
      if (answeredAt) {
        const seconds = Math.max(1, Math.round((nowMs - answeredAt) / 1000));
        state.recentHandleSeconds.push(seconds);
        if (state.recentHandleSeconds.length > HANDLE_WINDOW) {
          state.recentHandleSeconds.shift();
        }
      }
    } catch (error) {
      console.error('[queue-stats] onQueueEnd failed', error);
    }
  }

  /** An agent picked up a call in this queue. */
  public static onAgentOnCall(
    queue?: string,
    agentName?: string,
    callUuid?: string,
    nowMs = Date.now(),
  ): void {
    try {
      if (!queue || !agentName) return;
      const state = this.state(queue);
      state.agentsOnCall.add(agentName);
      state.agentsAvailable.delete(agentName);
      if (callUuid) this.answeredAtMs.set(callUuid, nowMs);
    } catch (error) {
      console.error('[queue-stats] onAgentOnCall failed', error);
    }
  }

  /** An agent finished, or became available. */
  public static onAgentAvailable(queue?: string, agentName?: string): void {
    try {
      if (!queue || !agentName) return;
      const state = this.state(queue);
      state.agentsOnCall.delete(agentName);
      state.agentsAvailable.add(agentName);
    } catch (error) {
      console.error('[queue-stats] onAgentAvailable failed', error);
    }
  }

  /** Where this caller stands, counting from 1. Null if they are not waiting. */
  public static positionOf(callUuid: string): number | null {
    try {
      const queue = this.callToQueue.get(callUuid);
      if (!queue) return null;
      const index = this.state(queue).waiting.findIndex((c) => c.callUuid === callUuid);
      return index === -1 ? null : index + 1;
    } catch (error) {
      console.error('[queue-stats] positionOf failed', error);
      return null;
    }
  }

  public static statsFor(queue: string, nowMs = Date.now()): QueueStats {
    try {
      const state = this.state(queue);
      this.prune(state, nowMs);

      const waiting = state.waiting.length;
      const agentsAvailable = state.agentsAvailable.size;
      const samples = state.recentHandleSeconds;

      const averageHandleSeconds =
        samples.length > 0
          ? Math.round(samples.reduce((total, value) => total + value, 0) / samples.length)
          : null;

      /* Say nothing rather than guess. Each of these makes an estimate a
         fiction, and the reason is returned so the caller of this endpoint can
         log why it stayed quiet instead of wondering. */
      let trustworthy = true;
      let reason: string | undefined;
      if (samples.length < MIN_CALLS_FOR_ESTIMATE) {
        trustworthy = false;
        reason = 'not enough completed calls to average';
      } else if (agentsAvailable === 0 && state.agentsOnCall.size === 0) {
        trustworthy = false;
        reason = 'nobody is on duty';
      }

      const estimatedWaitSeconds =
        trustworthy && averageHandleSeconds !== null
          ? Math.round((waiting * averageHandleSeconds) / Math.max(1, agentsAvailable))
          : null;

      return {
        queue,
        waiting,
        agentsAvailable,
        averageHandleSeconds,
        estimatedWaitSeconds,
        trustworthy,
        reason,
      };
    } catch (error) {
      console.error('[queue-stats] statsFor failed', error);
      /* A failure here must read as "no figures", never as a figure of zero —
         zero waiting and a zero wait is a confident lie. */
      return {
        queue,
        waiting: 0,
        agentsAvailable: 0,
        averageHandleSeconds: null,
        estimatedWaitSeconds: null,
        trustworthy: false,
        reason: 'stats unavailable',
      };
    }
  }

  /** Everything, for the admin queue list and monitoring. */
  public static allStats(nowMs = Date.now()): QueueStats[] {
    try {
      return Array.from(this.queues.keys()).map((queue) => this.statsFor(queue, nowMs));
    } catch (error) {
      console.error('[queue-stats] allStats failed', error);
      return [];
    }
  }
}
