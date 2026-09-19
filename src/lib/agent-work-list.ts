/**
 * Everything that is waiting for this agent, right now, in one list.
 *
 * The owner's words on 13 Sep 2026: the agent is "not able to pick holding
 * calls or call waiting calls, only waiting for ring". That is literally true
 * of the screens as they were - nothing anywhere told an agent that a customer
 * was on the line for them, so when the ring failed to arrive (12 Sep: a stale
 * `ring_contact`, and a missed-call guard that had quietly stopped offering)
 * six customers answered a campaign call and reached nobody. The agent had no
 * way to know, and no way to act.
 *
 * The reference products both answer this with a list, not a louder ring:
 * a contact centre's **Hold Queue** is "a list of all calls awaiting them",
 * visible to agents and supervisors, and a supervisor may assign any of those
 * calls to an agent "no matter where a call is in line". We are building the
 * agent's half of that.
 *
 * This module is the pure part: what the rows are, where each one came from,
 * how long it has been waiting, and - the honest bit - what the agent can
 * actually do about it. Three of the four kinds can be acted on from the
 * browser today. The fourth cannot, and says so with the real reason and the
 * real repair rather than a button that does nothing.
 *
 * What can be acted on, and why:
 *
 *  - `ringing`   this browser's own inbound SIP session. Answering it is a
 *                local JsSIP call. Real.
 *  - `held`      this browser's own session with the far end on hold. Resuming
 *                it is a local JsSIP call. Real.
 *  - `parked`    a call parked into the company's lot (*70). Picking it up is
 *                dialling `*7<slot>`, which the router already implements.
 *                Real, and it is the one path by which an agent can take a call
 *                nobody offered them.
 *  - `waiting`   a queue caller, or a campaign customer who has answered and is
 *                holding for a free agent. There is **no browser-reachable way
 *                to bridge that channel to this agent's device**; see the
 *                handover for the exact one-line change that would give us one.
 *                The row is still shown, because seeing that a customer is on
 *                the line is most of the value, and it carries the reason the
 *                call is not reaching this agent plus the repair that will fix
 *                it.
 */

export type AgentWorkRowKind = 'ringing' | 'held' | 'parked' | 'waiting';

/** Where a waiting row came from, so the screen can name it. */
export type AgentWorkSource = 'queue' | 'campaign' | 'device';

export type AgentWorkRow = {
  /** Stable across ticks, so React does not remount a ticking row. */
  id: string;
  kind: AgentWorkRowKind;
  source: AgentWorkSource;
  /** Who is on the line: a name when we have one, else the number. */
  who: string;
  /** Their number, printed under the name when it is not the name. */
  number: string;
  /** The queue or campaign this belongs to; '' when it belongs to neither. */
  where: string;
  /** Epoch ms this started waiting; null when nothing reliable is known. */
  waitingSinceMs: number | null;
  /** This browser's SIP session, for the rows it can act on directly. */
  sessionId?: string;
  /** The switch's own id for the call, for the route that should exist. */
  callId?: string;
  /** Park slot (71-79) for a parked row. */
  parkSlot?: string;
};

/** What the agent's state says about why a waiting call is not reaching them. */
export type AgentReadiness = {
  /** The duty axis: on duty, on a break, or signed off. */
  duty: 'on' | 'break' | 'off' | 'unknown';
  /** A live call or a wrap-up panel is holding this agent. */
  busy: boolean;
  /** The softphone is registered and has a contact. */
  registered: boolean;
  /**
   * The queue has stopped offering calls to this agent after missed rings.
   * Owned by the duty chip and its dialog - this list only points at it.
   */
  offersStopped: boolean;
  /** Another tab of this browser holds the campaign ring. */
  ringIsElsewhere: boolean;
};

export type AgentWorkAction =
  | { kind: 'take'; label: string; hint: string }
  | { kind: 'answer'; label: string; hint: string }
  | { kind: 'resume'; label: string; hint: string }
  | { kind: 'pickup'; label: string; hint: string }
  | { kind: 'none'; label: ''; hint: string; repair: AgentWorkRepair };

/** A repair the screen can genuinely offer beside a row it cannot take. */
export type AgentWorkRepair =
  | 'go-on-duty'
  | 'ready-again'
  | 'ring-this-tab'
  | 'finish-this-call'
  | 'wait'
  | 'register';

/**
 * The star code that collects a parked call. The router parks into slots 71-79
 * and `*71`..`*79` pick them back up, so the code is the slot with a star in
 * front of it - not `*7` plus the slot, which would dial `*773`.
 */
export const parkPickupCode = (slot: unknown): string => {
  const digits = String(slot ?? '').replace(/\D/g, '');
  const twoDigit = digits.length === 1 ? `7${digits}` : digits.slice(-2);
  return /^7[0-9]$/.test(twoDigit) ? `*${twoDigit}` : '';
};

/**
 * What the agent may do with one row.
 *
 * Only `answer`, `resume` and `pickup` are buttons; `none` carries the reason
 * and the repair instead. Nothing here ever returns a button for something the
 * browser cannot do.
 */
export const workRowAction = (row: AgentWorkRow, readiness: AgentReadiness): AgentWorkAction => {
  if (row.kind === 'ringing') {
    return {
      kind: 'answer',
      label: 'Take the call',
      hint: 'Answers here, on this device.',
    };
  }
  if (row.kind === 'held') {
    return {
      kind: 'resume',
      label: 'Resume',
      hint: 'Takes them off hold and puts you back on the line.',
    };
  }
  if (row.kind === 'parked') {
    return {
      kind: 'pickup',
      label: 'Pick up',
      hint: `Dials ${parkPickupCode(row.parkSlot)} to collect them from the parking slot.`,
    };
  }

  /* A waiting caller. Say the true reason, most actionable first. */
  if (!readiness.registered) {
    return {
      kind: 'none',
      label: '',
      hint: 'Your phone is not connected yet, so nothing can be sent to it.',
      repair: 'register',
    };
  }
  if (readiness.duty === 'off') {
    return {
      kind: 'none',
      label: '',
      hint: 'You are signed off, so calls are not being offered to you.',
      repair: 'go-on-duty',
    };
  }
  if (readiness.duty === 'break') {
    return {
      kind: 'none',
      label: '',
      hint: 'You are on a break, so calls are not being offered to you.',
      repair: 'go-on-duty',
    };
  }
  if (readiness.offersStopped) {
    return {
      kind: 'none',
      label: '',
      hint: 'Calls are not being offered to you after missed rings.',
      repair: 'ready-again',
    };
  }
  if (readiness.busy) {
    return {
      kind: 'none',
      label: '',
      hint: 'You are on a call, so this one is waiting for the next free agent.',
      repair: 'finish-this-call',
    };
  }
  if (readiness.ringIsElsewhere) {
    return {
      kind: 'none',
      label: '',
      hint: 'Calls for this campaign are ringing in another window.',
      repair: 'ring-this-tab',
    };
  }
  /* A waiting caller the switch knows by id, and an agent who is free: the
     call can be brought to this agent's own extension on request. The
     gateway pins the destination to the asker, so the button cannot send a
     call anywhere else. */
  if (row.kind === 'waiting' && row.callId) {
    /* NOT "Take the call": that is the ringing row's button, which answers a
       call already on this device. This one asks the switch to move a caller
       it has not offered yet. Two buttons a finger apart, doing completely
       different things, must not read the same. */
    return { kind: 'take', label: 'Bring to my phone', hint: 'Ask the switch to send this caller to your phone now.' };
  }
  return {
    kind: 'none',
    label: '',
    hint: 'Waiting for the switch to ring you.',
    repair: 'wait',
  };
};

/** "just now" / "18s" / "2m 04s" / "1h 12m". Ticks once a second on screen. */
export const describeWait = (waitingSinceMs: number | null, nowMs: number): string => {
  if (!waitingSinceMs || !Number.isFinite(waitingSinceMs)) return '';
  const seconds = Math.max(0, Math.floor((nowMs - waitingSinceMs) / 1000));
  if (seconds < 3) return 'just now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

/**
 * How urgent a wait is, so a customer who has been holding for a minute reads
 * differently from one who arrived a moment ago. Thresholds are deliberately
 * generous: nothing here should cry wolf.
 */
export const waitSeverity = (
  waitingSinceMs: number | null,
  nowMs: number,
): 'fresh' | 'waiting' | 'long' => {
  if (!waitingSinceMs || !Number.isFinite(waitingSinceMs)) return 'fresh';
  const seconds = Math.max(0, Math.floor((nowMs - waitingSinceMs) / 1000));
  if (seconds >= 60) return 'long';
  if (seconds >= 20) return 'waiting';
  return 'fresh';
};

const text = (value: unknown): string => String(value ?? '').trim();

const displayName = (name: unknown, number: unknown): string => {
  const named = text(name);
  if (named && named.toLowerCase() !== 'unknown' && named.toLowerCase() !== 'unknown contact') {
    return named;
  }
  return text(number) || 'Unknown caller';
};

/* Live-call statuses that mean "nobody is talking to this person yet". A call
   already bridged to an agent is somebody else's work, not a waiting row. */
const WAITING_STATUSES = new Set(['waiting', 'ringing', 'connecting', 'answered']);

const hasAgent = (call: any): boolean =>
  Boolean(
    text(call?.agent_extension) ||
      text(call?.answered_by) ||
      text(call?.agent_name) ||
      text(call?.bridged_at),
  );

export type BuildWorkListInput = {
  /** This browser's SIP sessions, keyed by id (the dialpad context's shape). */
  sessions: Record<string, any>;
  /** The company's live call-centre calls, from the socket. */
  liveCalls: any[];
  /** Queue uuids this agent is a member of, so other queues are not listed. */
  myQueueIds: string[];
  /** Queue names by uuid, for the "where" column. */
  queueNames: Record<string, string>;
  /** Rows off the campaign live board (`campaign-live-stats`). */
  campaignRows: any[];
  /** The campaign those rows belong to, for the "where" column. */
  campaignName: string;
  /** The board's own age, so a stale board makes no claim about now. */
  campaignBoardAgeMs: number;
  nowMs: number;
};

/** How old a live board may be before it is not evidence of anything. */
export const BOARD_MAX_AGE_MS = 30000;

const parseTimestampMs = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return null;
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstTimestampMs = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = parseTimestampMs(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

/**
 * The whole list, longest wait first inside each group, and the groups in the
 * order an agent should deal with them: ringing now, then held by them, then
 * parked, then waiting.
 */
export const buildAgentWorkList = (input: BuildWorkListInput): AgentWorkRow[] => {
  const rows: AgentWorkRow[] = [];
  const sessions = Object.values(input.sessions || {});

  for (const session of sessions) {
    const status = text(session?.status).toLowerCase();
    if (['ended', 'failed'].includes(status)) continue;

    const who = displayName(
      session?.liveCallData?.contact_name || session?.remoteName,
      session?.remoteNumber,
    );
    const number = text(session?.remoteNumber);
    const where = text(
      session?.campaignMetaData?.response?.name ||
        session?.liveCallData?.campaign_name ||
        session?.queueMetaData?.response?.name,
    );

    if (session?.isOnHold) {
      rows.push({
        id: `held:${text(session?.id)}`,
        kind: 'held',
        source: 'device',
        who,
        number,
        where,
        waitingSinceMs: firstTimestampMs(session?.heldAt, session?.connectedAt, session?.startedAt),
        sessionId: text(session?.id),
      });
      continue;
    }

    if (text(session?.direction).toLowerCase() === 'incoming' &&
      ['incoming', 'ringing', 'connecting'].includes(status)) {
      rows.push({
        id: `ringing:${text(session?.id)}`,
        kind: 'ringing',
        source: where ? 'campaign' : 'queue',
        who,
        number,
        where,
        waitingSinceMs: firstTimestampMs(session?.startedAt),
        sessionId: text(session?.id),
      });
    }
  }

  const myQueues = new Set(input.myQueueIds.map((id) => text(id)).filter(Boolean));
  for (const call of input.liveCalls || []) {
    const status = text(call?.status).toLowerCase();
    if (!WAITING_STATUSES.has(status)) continue;
    if (hasAgent(call)) continue;

    const queueId =
      [call?.queue_uuid, call?.queue_id, call?.forward_value]
        .map((value) => text(value))
        .find((value) => value && myQueues.has(value)) || '';
    if (!queueId) continue;

    rows.push({
      id: `waiting:${text(call?.sip_call_id || call?.call_uuid || call?.channel_uuid || queueId)}`,
      kind: 'waiting',
      source: 'queue',
      who: displayName(call?.contact_name, call?.caller_number || call?.called_number),
      number: text(call?.caller_number || call?.called_number),
      where: text(input.queueNames[queueId]) || 'a queue you are in',
      waitingSinceMs: firstTimestampMs(call?.start_time, call?.started_at, call?.answered_time),
      callId: text(call?.sip_call_id || call?.call_uuid || call?.channel_uuid),
    });
  }

  /* Campaign customers who answered and are holding for an agent. The board's
     own vocabulary: `answered` (on the line, nobody offered yet) and
     `offering` (an agent is being rung). Anything terminal, and anything the
     board has not seen recently enough to vouch for, is not a claim about now. */
  if (input.campaignBoardAgeMs <= BOARD_MAX_AGE_MS) {
    for (const row of input.campaignRows || []) {
      const state = text(row?.state).toLowerCase();
      if (state !== 'answered' && state !== 'offering') continue;
      const callId = text(row?.callId || row?.sipCallId || row?.callUuid);
      rows.push({
        id: `waiting:campaign:${callId || text(row?.phone)}`,
        kind: 'waiting',
        source: 'campaign',
        who: displayName(row?.contactName, row?.phone),
        number: text(row?.phone),
        where: text(input.campaignName),
        waitingSinceMs: firstTimestampMs(row?.answeredAt, row?.startedAt, row?.ts),
        callId,
      });
    }
  }

  const order: Record<AgentWorkRowKind, number> = {
    ringing: 0,
    held: 1,
    parked: 2,
    waiting: 3,
  };
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((left, right) => {
      if (order[left.kind] !== order[right.kind]) return order[left.kind] - order[right.kind];
      const leftWait = left.waitingSinceMs ?? input.nowMs;
      const rightWait = right.waitingSinceMs ?? input.nowMs;
      return leftWait - rightWait;
    });
};

/** The heading, which says how many and never says "0". */
export const workListHeading = (rows: AgentWorkRow[]): string => {
  if (!rows.length) return 'Nothing is waiting for you';
  if (rows.length === 1) return '1 call is waiting for you';
  return `${rows.length} calls are waiting for you`;
};
