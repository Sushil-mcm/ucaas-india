/**
 * The numbers that ring a queue.
 *
 * A queue does not store its numbers. Each number stores where it forwards, and
 * a queue's pool is every number pointing at it — the same backwards read that
 * `number-labels.ts` does for shared lines, asked from the queue's side instead
 * of the number's.
 *
 * That direction matters for a support or sales line. One queue is fed by many
 * numbers: a local number per city, a toll-free number, a number on a campaign
 * landing page. They all reach the same agents, and the switch is told which
 * number was dialled, so reporting can still separate them. Nothing in the
 * product showed that grouping from the queue, so an admin had to open numbers
 * one at a time to find out what fed a queue.
 *
 * Everything here is a pure function of the number list and the queue record.
 */

import { FORWARD_TYPES } from '@/constants/forwarding-consts';

import { normaliseLabel, parseActions } from './number-labels';

/** The queue a number is being pointed at, as the routing blob has to record it. */
export type QueueRef = {
  /** The queue's `_id`. This is what the switch looks the queue up by. */
  id: string;
  name: string;
  /** The queue's internal extension. Carried so reporting can name the queue. */
  extension?: string;
};

/** A number's `uuid` plus the whole routing blob, ready for `callForwarding`. */
export type RoutePatch = { uuid: string; forward_call_actions: Record<string, unknown> };

const businessHoursOf = (did: any) =>
  parseActions(did?.forward_call_actions)?.call_handling?.business_hours ?? null;

/**
 * The queue this number rings during business hours, or ''.
 *
 * Business hours only, deliberately. A number whose closed-hours branch falls
 * back to a queue is not one of that queue's numbers — it belongs to whatever
 * answers it during the day, and counting the fallback would inflate a pool
 * with numbers nobody thinks of as belonging to it.
 */
export const queueIdOf = (did: any): string => {
  const hours = businessHoursOf(did);
  if (String(hours?.type || '').trim() !== FORWARD_TYPES.QUEUE) return '';
  return String(hours?.value || '').trim();
};

/** Every number pointing at this queue, in the order the list supplied them. */
export const numbersOnQueue = (dids: any[], queueId: unknown): any[] => {
  const wanted = String(queueId ?? '').trim();
  if (!wanted) return [];
  return (Array.isArray(dids) ? dids : []).filter((did) => queueIdOf(did) === wanted);
};

export type CurrentRoute = { type: string; name: string; busy: boolean };

/**
 * What a number does today, for the row in the "add a number" picker.
 *
 * `busy` is the bit an admin needs before choosing: attaching a number that
 * already answers somewhere takes it away from there, and the picker has to be
 * able to say so rather than silently re-pointing a live number.
 */
export const currentRouteOf = (did: any): CurrentRoute => {
  const hours = businessHoursOf(did);
  const type = String(hours?.type || '').trim();
  if (!type) return { type: '', name: '', busy: false };
  return {
    type,
    name: normaliseLabel(hours?.name || hours?.label || hours?.value) || '',
    busy: true,
  };
};

export type AttachBlock = { ok: true } | { ok: false; reason: string };

/**
 * Whether this number can be put on a queue.
 *
 * An unrouted number is allowed here, and that is the deliberate difference
 * from `canEditLabel`. Labelling refuses an unrouted number because it would
 * write a routing blob purely to hold a name, and three screens read "has a
 * blob" as "in use" — which would make an unused number unreleasable. Pointing
 * a number at a queue is the number becoming used, so creating the blob is the
 * whole intent rather than a side effect.
 */
export const canAttach = (did: any): AttachBlock => {
  if (!did?.uuid) return { ok: false, reason: 'This number has no record to save against.' };
  return { ok: true };
};

/**
 * The request that points one number at a queue.
 *
 * The stored blob is spread back verbatim and only the four routing keys are
 * replaced, because the endpoint writes the whole column with whatever it is
 * sent. Rebuilding the object instead would drop opening hours, recording,
 * caller ID and hold music — every field this screen does not render.
 *
 * `extension` is set from the queue rather than left alone: it is stale the
 * moment the target changes, and the switch reads it to name the queue in
 * reporting. Keys the queue does not own, `missed_call_action` among them, are
 * left exactly as they were — inert while a queue answers the call, and still
 * correct if the number is ever pointed back at a person.
 *
 * Returns null when the number is already on this queue, so a bulk attach over
 * a list writes only the numbers that actually change.
 */
export const buildQueueAttachPatch = (did: any, queue: QueueRef): RoutePatch | null => {
  if (!canAttach(did).ok) return null;

  const queueId = String(queue?.id ?? '').trim();
  if (!queueId) return null;
  if (queueIdOf(did) === queueId) return null;

  const actions = parseActions(did?.forward_call_actions) ?? {};
  const hours = actions?.call_handling?.business_hours ?? {};
  const name = normaliseLabel(queue?.name) || queueId;
  const extension = String(queue?.extension ?? '').trim();

  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      call_handling: {
        ...(actions?.call_handling ?? {}),
        business_hours: {
          ...hours,
          type: FORWARD_TYPES.QUEUE,
          value: queueId,
          label: name,
          name,
          ...(extension ? { extension } : {}),
        },
      },
    },
  };
};

/**
 * The request that takes one number off its queue.
 *
 * The route is emptied rather than the blob deleted, because the blob also
 * holds this number's hours, recording and hold music, and deleting it would
 * throw those away to undo one field.
 *
 * The consequence has to be said on screen: a number with an empty route rings
 * nowhere. The caller hears silence — not a mailbox, not an error — and the
 * number still counts as configured everywhere that tests for the blob, so it
 * will not reappear under unused numbers. Removing from a queue is therefore
 * only ever half a job; the other half is pointing it somewhere else.
 *
 * Returns null for a number that is not on a queue, so a repeated click cannot
 * blank the routing of a number that was never in the pool.
 */
export const buildQueueDetachPatch = (did: any): RoutePatch | null => {
  if (!did?.uuid) return null;
  if (!queueIdOf(did)) return null;

  const actions = parseActions(did?.forward_call_actions) ?? {};
  const hours = { ...(actions?.call_handling?.business_hours ?? {}) };
  delete hours.extension;

  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      call_handling: {
        ...(actions?.call_handling ?? {}),
        business_hours: { ...hours, type: '', value: '', label: '', name: '' },
      },
    },
  };
};

export type PoolSummary = {
  count: number;
  /** The number an agent thinks of as the queue's number: first in the list. */
  primary: string;
  numbers: string[];
};

/**
 * A queue's pool reduced to what a table cell can show.
 *
 * "Primary" is a position, not a stored flag — the platform has no such flag —
 * and this is the only place that decides it, matching how shared lines already
 * choose theirs.
 */
export const poolSummary = (dids: any[], queueId: unknown): PoolSummary => {
  const numbers = numbersOnQueue(dids, queueId).map((did) => String(did?.did_number || '').trim());
  return { count: numbers.length, primary: numbers[0] || '', numbers };
};

/**
 * Which numbers a bulk attach would actually change.
 *
 * Split rather than filtered so the confirmation can say "3 numbers will move
 * from where they answer now" instead of presenting every tick as equal.
 */
export const planBulkAttach = (
  dids: any[],
  queue: QueueRef,
): { moving: any[]; adding: any[]; unchanged: any[] } => {
  const queueId = String(queue?.id ?? '').trim();
  const moving: any[] = [];
  const adding: any[] = [];
  const unchanged: any[] = [];

  for (const did of Array.isArray(dids) ? dids : []) {
    if (!queueId || !canAttach(did).ok || queueIdOf(did) === queueId) {
      unchanged.push(did);
      continue;
    }
    if (currentRouteOf(did).busy) moving.push(did);
    else adding.push(did);
  }

  return { moving, adding, unchanged };
};
