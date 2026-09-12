/* How a queue routed one call, as the CDR writer stored it in `call_flow`.
 *
 * Written by /opt/cdr-ingest.py from the cc_route_* stamps the queue script
 * sets on every answer from the agent picker; the values are those of the
 * last answer - the one that produced the agent who picked up, or the last
 * before the queue gave up. Older calls, and calls outside a queue, have
 * nothing here. */
/* One requirement row as it stood when the answer was given: the category,
   its skills, the bar it asked for, and whether it held, had relaxed, was
   dropped by its clock, or was set aside because nobody held it. */
export interface CallRoutingRow {
  category: string;
  skills: string[];
  bar: number;
  state: 'held' | 'relaxed' | 'dropped' | 'waived' | '';
  caller: boolean;
}

/* An in-queue callback, on either of its two legs. On the ORIGINAL call
   (`requested`): the caller pressed the key and hung up, keeping their place.
   On the RETURN call (`returned`): the platform rang them back; `accepted`
   says whether they pressed 1, and the two waits are the seconds before they
   hung up and the seconds after they answered until an agent came on. */
export interface CallRoutingCallback {
  id: string;
  requested: boolean;
  returned: boolean;
  accepted: boolean;
  number: string;
  position: number | null;
  waited: number | null;
  waitBefore: number | null;
  waitAfter: number | null;
  outcome: string;
}

export interface CallRoutingRecord {
  callback: CallRoutingCallback | null;
  round: number | null;
  rounds: number | null;
  skills: string[];
  caller: string[];
  bar: number | null;
  dropped: boolean;
  waived: boolean;
  held: number;
  polls: number;
  priority: number | null;
  reason: string;
  /* Present on calls routed since categories existed; empty before. */
  rows: CallRoutingRow[];
  /* The caller left the queue without an agent and without hanging up: the
     queue timed out or overflowed and sent them on. Where to is in `exit`:
     voicemail, extension, menu, or timeout when it simply ended. A flow-out
     is not an abandon - the caller did not give up - so the reports count it
     on its own. Absent (false) on every call before the writer stamped it. */
  flowOut: boolean;
  exit: 'voicemail' | 'extension' | 'menu' | 'timeout' | 'callback' | '';
}

export const FLOW_OUT_WORD: Record<string, string> = {
  voicemail: 'to voicemail',
  extension: 'to an extension',
  menu: 'to a menu',
  timeout: 'queue timed out',
  callback: 'asked to be called back',
};

/* One or two words for a call-list cell: what the callback did on this row. */
export const describeCallback = (callback: CallRoutingCallback | null): string => {
  if (!callback) return '';
  if (callback.requested) return 'Callback requested';
  if (!callback.returned) return '';
  if (!callback.accepted) return callback.outcome === 'declined' ? 'Callback declined' : 'Callback not accepted';
  const before = callback.waitBefore ? ` (waited ${callback.waitBefore}s before hanging up)` : '';
  return `Callback${before}`;
};

/* True when the row is either leg of an in-queue callback. */
export const isCallbackCall = (row: any): boolean => Boolean(parseCallRoutingRecord(row?.call_flow)?.callback);

/* True when the row's routing record says the caller flowed out. Reads the
   raw column so a report needs no parsed record. */
export const isFlowOut = (row: any): boolean => Boolean(parseCallRoutingRecord(row?.call_flow)?.flowOut);

export const parseCallRoutingRecord = (raw: unknown): CallRoutingRecord | null => {
  if (!raw) return null;
  let value: any = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || !('polls' in value || 'flow_out' in value || 'callback' in value)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const exit = ['voicemail', 'extension', 'menu', 'timeout', 'callback'].includes(value.exit) ? value.exit : '';
  const cb = value.callback && typeof value.callback === 'object' ? value.callback : null;
  const callback: CallRoutingCallback | null = cb
    ? {
        id: String(cb.id || ''),
        requested: cb.requested === true,
        returned: cb.return === true,
        accepted: cb.accepted === true,
        number: String(cb.number || ''),
        position: num(cb.position),
        waited: num(cb.waited),
        waitBefore: num(cb.wait_before),
        waitAfter: num(cb.wait_after),
        outcome: String(cb.outcome || ''),
      }
    : null;
  return {
    callback,
    flowOut: value.flow_out === true,
    exit,
    round: num(value.round),
    rounds: num(value.rounds),
    skills: list(value.skills),
    caller: list(value.caller),
    bar: num(value.bar),
    dropped: Boolean(value.dropped),
    waived: Boolean(value.waived),
    held: num(value.held) ?? 0,
    polls: num(value.polls) ?? 0,
    priority: num(value.priority),
    reason: String(value.reason || ''),
    rows: Array.isArray(value.rows)
      ? value.rows
          .filter((row: unknown) => row && typeof row === 'object')
          .map((row: any) => ({
            category: String(row.category || ''),
            skills: list(row.skills),
            bar: num(row.bar) ?? 0,
            state: ['held', 'relaxed', 'dropped', 'waived'].includes(row.state) ? row.state : '',
            caller: Boolean(row.caller),
          }))
      : [],
  };
};

/* One line, for a table cell: "Round 2 of 3 · Accounting at 3+ stars · Spanish (caller)". */
export const describeCallRouting = (record: CallRoutingRecord | null): string => {
  if (!record) return '';
  const parts: string[] = [];
  const callback = describeCallback(record.callback);
  if (callback) parts.push(callback);
  if (record.round && record.rounds) parts.push(`Round ${record.round} of ${record.rounds}`);
  if (record.skills.length) {
    const bar = record.bar && record.bar > 1 ? ` at ${record.bar}+ stars` : '';
    parts.push(`${record.skills.join(', ')}${bar}`);
  }
  if (record.caller.length) parts.push(`${record.caller.join(', ')} (caller's choice)`);
  /* Name the category that gave way, however many rows there are.
     This used to require rows.length > 1, on the reasoning that with a single
     requirement the scalar `dropped`/`waived` below already said it. That was
     wrong twice over: "Language dropped" tells the reader WHICH requirement
     gave way and "skill requirement dropped" does not, and in practice every
     queue on the platform that asks for skills asks for exactly one category -
     so the per-row wording could never appear at all. */
  const gaveWay = record.rows.filter((row) => row.state === 'relaxed' || row.state === 'dropped' || row.state === 'waived');
  if (gaveWay.length) {
    parts.push(
      gaveWay
        .map((row) => `${row.category || row.skills.join('/')} ${row.state === 'relaxed' ? 'relaxed to 1 star' : row.state === 'dropped' ? 'dropped' : 'set aside'}`)
        .join(', '),
    );
  } else if (record.dropped) parts.push('skill requirement dropped');
  else if (record.waived) parts.push('nobody held the skill');
  if (record.held > 0) parts.push(`held for another caller ${record.held}×`);
  return parts.join(' · ');
};

export const PRIORITY_WORD: Record<number, string> = { 1: 'Low', 5: 'Normal', 8: 'High', 10: 'Urgent' };
