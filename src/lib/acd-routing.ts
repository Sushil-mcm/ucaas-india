/* Deciding who a waiting call should ring, and when that answer changes.
 *
 * This is the whole of automatic call distribution reduced to one function. It
 * takes the queue's rules, the people in it and how long the caller has waited,
 * and returns who to ring right now. It touches no network and no switch, so it
 * can be proven with tests today and called by whatever ends up placing the
 * call — the dialplan, an API, or a screen showing an admin what would happen.
 *
 * ------------------------------------------------------------------------
 * The model
 * ------------------------------------------------------------------------
 * A queue rings in **steps**. Step one is the people you most want on this call.
 * If nobody answers within that step's wait, the next step is added — people are
 * added, never swapped out, so the first group keeps ringing. That widening is
 * what stops a specialist queue going unanswered because the one expert is busy.
 *
 * Each step can demand a **rating**: a number from 0 to 100 saying how well
 * somebody handles this queue's work. Everyone starts at 100, so a queue that
 * never rates anybody behaves exactly as an unrated queue does — the feature
 * costs nothing until it is used.
 *
 * Ratings are per queue, not per person. Somebody can be the strongest on
 * billing and the weakest on support, and one number per person could not say
 * that.
 *
 * ------------------------------------------------------------------------
 * Duty state, which is the part most systems get wrong
 * ------------------------------------------------------------------------
 * Being free is not the same as being on duty for this queue. Somebody can be
 * at their desk and deliberately not taking queue calls, or on a direct call and
 * still first in line for the queue when they finish. One on/off flag cannot say
 * either, so there are five states — and `busy` exists precisely so a person can
 * keep working without leaving the queue entirely.
 */

export type AgentDutyState =
  /* Ready for this queue now. */
  | 'available'
  /* At work, taking other calls, not this queue. Chosen, not a side effect. */
  | 'busy'
  /* On a queue call already. */
  | 'on-a-call'
  /* Finishing notes after a call. Rings again when the wrap-up time is up. */
  | 'wrapping-up'
  /* Signed out of the queue. */
  | 'off-duty';

export const RINGABLE_STATES: AgentDutyState[] = ['available'];

export interface AcdAgent {
  id: string;
  name?: string;
  state: AgentDutyState;
  /* 0 to 100 for this queue. Missing means 100 - an unrated person is assumed
     able, so rating some people does not silently sideline everyone else. */
  rating?: number;
  /* Epoch seconds when they last finished a call. Used to break ties, and to
     decide when wrapping-up becomes available again. */
  idleSince?: number;
  /* When wrapping up, how long that lasts. */
  wrapUpSeconds?: number;
}

export interface RingStep {
  /* Seconds to wait in this step before the next one is added. The last step's
     wait is ignored - there is nothing further to widen to. */
  waitSeconds: number;
  /* Lowest rating allowed in this step. Omitted means anybody. */
  minimumRating?: number;
}

export type RingOrder =
  | 'all-at-once'
  | 'longest-idle-first'
  | 'highest-rated-first'
  | 'fewest-calls-first'
  | 'in-order';

export interface AcdQueueRules {
  steps: RingStep[];
  order: RingOrder;
  /* Longest anybody waits before the queue gives up. */
  giveUpAfterSeconds?: number;
}

export interface AcdDecision {
  /* Who to ring, in the order to ring them. Empty means nobody can take it. */
  ring: AcdAgent[];
  /* Which step we are in, counting from 1. */
  step: number;
  /* Seconds until the answer would change - the next step opening, somebody
     finishing wrap-up, or the queue giving up. `null` when nothing further will
     change on its own. Lets a caller be re-asked at the right moment instead of
     polling blindly. */
  changesInSeconds: number | null;
  /* Why the ring list looks like this, in words an admin can read. */
  reason: string;
}

const ratingOf = (agent: AcdAgent) =>
  typeof agent.rating === 'number' ? agent.rating : 100;

/* Somebody wrapping up becomes ringable again once their wrap-up is over.
   Treating them as gone until then, rather than as available, is what stops a
   call landing on somebody still writing up the last one. */
const secondsUntilFree = (agent: AcdAgent, now: number): number | null => {
  if (agent.state !== 'wrapping-up') return null;
  const wrap = agent.wrapUpSeconds ?? 0;
  const since = agent.idleSince ?? now;
  const remaining = since + wrap - now;
  return remaining > 0 ? remaining : 0;
};

const isRingable = (agent: AcdAgent, now: number): boolean => {
  if (agent.state === 'available') return true;
  if (agent.state === 'wrapping-up') return (secondsUntilFree(agent, now) ?? 1) <= 0;
  return false;
};

/* Which step a caller is in, and when the next one opens. Steps are cumulative:
   at step three, everybody who qualified for steps one and two is still ringing. */
const stepAt = (steps: RingStep[], waitedSeconds: number) => {
  let elapsed = 0;
  for (let i = 0; i < steps.length - 1; i += 1) {
    elapsed += Math.max(0, steps[i].waitSeconds || 0);
    if (waitedSeconds < elapsed) {
      return { index: i, opensNextIn: elapsed - waitedSeconds };
    }
  }
  return { index: Math.max(0, steps.length - 1), opensNextIn: null as number | null };
};

const orderAgents = (agents: AcdAgent[], order: RingOrder, now: number): AcdAgent[] => {
  const copy = [...agents];
  switch (order) {
    case 'longest-idle-first':
      return copy.sort((a, b) => (a.idleSince ?? now) - (b.idleSince ?? now));
    case 'highest-rated-first':
      /* Longest idle breaks a tie on rating, so two equally rated people share
         the work instead of the first one taking everything. */
      return copy.sort(
        (a, b) => ratingOf(b) - ratingOf(a) || (a.idleSince ?? now) - (b.idleSince ?? now),
      );
    case 'fewest-calls-first':
    case 'in-order':
    case 'all-at-once':
    default:
      return copy;
  }
};

export const decideAcdRing = ({
  rules,
  agents,
  waitedSeconds,
  now = Math.floor(Date.now() / 1000),
}: {
  rules: AcdQueueRules;
  agents: AcdAgent[];
  waitedSeconds: number;
  now?: number;
}): AcdDecision => {
  const steps = rules.steps?.length ? rules.steps : [{ waitSeconds: 0 }];

  /* Given up before anything else is considered - a caller past the limit is
     not waiting for an agent, they are leaving. */
  if (
    typeof rules.giveUpAfterSeconds === 'number' &&
    waitedSeconds >= rules.giveUpAfterSeconds
  ) {
    return {
      ring: [],
      step: steps.length,
      changesInSeconds: null,
      reason: `The caller has waited ${waitedSeconds}s, which is the longest this queue holds anybody. They should go to the failover rather than keep ringing.`,
    };
  }

  const { index, opensNextIn } = stepAt(steps, waitedSeconds);

  /* Cumulative: the lowest rating demanded by any step up to and including this
     one. Widening can only ever let more people in, never fewer. */
  const thresholds = steps
    .slice(0, index + 1)
    .map((s) => (typeof s.minimumRating === 'number' ? s.minimumRating : 0));
  const threshold = Math.min(...thresholds);

  const eligible = agents.filter(
    (a) => isRingable(a, now) && ratingOf(a) >= threshold,
  );
  const ring = orderAgents(eligible, rules.order, now);

  /* The soonest anything changes on its own: the next step opening, the first
     person finishing wrap-up, or the queue giving up. */
  const candidates: number[] = [];
  if (opensNextIn !== null) candidates.push(opensNextIn);
  agents.forEach((a) => {
    const s = secondsUntilFree(a, now);
    if (s !== null && s > 0) candidates.push(s);
  });
  if (typeof rules.giveUpAfterSeconds === 'number') {
    const left = rules.giveUpAfterSeconds - waitedSeconds;
    if (left > 0) candidates.push(left);
  }
  const changesInSeconds = candidates.length ? Math.min(...candidates) : null;

  let reason: string;
  if (ring.length === 0) {
    const wrapping = agents.filter((a) => a.state === 'wrapping-up').length;
    const busy = agents.filter((a) => a.state === 'busy' || a.state === 'on-a-call').length;
    const off = agents.filter((a) => a.state === 'off-duty').length;
    if (agents.length === 0) {
      reason = 'Nobody is in this queue at all.';
    } else if (threshold > 0 && agents.some((a) => isRingable(a, now))) {
      reason = `People are free, but none are rated ${threshold} or above, which this step requires.`;
    } else {
      const parts = [
        wrapping ? `${wrapping} finishing notes` : '',
        busy ? `${busy} on other work` : '',
        off ? `${off} signed out` : '',
      ].filter(Boolean);
      reason = `Nobody can take it right now — ${parts.join(', ')}.`;
    }
  } else {
    const scope = threshold > 0 ? ` rated ${threshold} or above` : '';
    reason =
      steps.length > 1
        ? `Step ${index + 1} of ${steps.length}: ringing ${ring.length} ${ring.length === 1 ? 'person' : 'people'}${scope}.`
        : `Ringing ${ring.length} ${ring.length === 1 ? 'person' : 'people'}${scope}.`;
  }

  return { ring, step: index + 1, changesInSeconds, reason };
};

/* When somebody is in several queues at once, which queue's caller wins.
   Highest priority first; the longer wait breaks a tie, so a caller cannot be
   passed over forever by a busier queue at the same priority. */
export const pickQueueForAgent = <T extends { priority?: number; longestWaitSeconds?: number }>(
  queues: T[],
): T | null => {
  if (!queues?.length) return null;
  return [...queues].sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) ||
      (b.longestWaitSeconds ?? 0) - (a.longestWaitSeconds ?? 0),
  )[0];
};
