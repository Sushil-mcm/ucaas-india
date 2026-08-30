/* Turning call records into an answer to "where did the money go".
 *
 * The platform already charges per call — every row in the call history carries
 * a `charge` and a `billsec` — and the billing screens already show what was
 * taken in total. What has never existed anywhere is the step between the two:
 * which people, and which destinations, that total is made of. An admin who
 * sees a bill go up has had no way at all to find out what changed.
 *
 * Two facts about the data shape everything here.
 *
 * The first: the server returns exact totals for the whole period alongside the
 * page of rows, so the headline figures never depend on how many rows were
 * read. The breakdown does. When the period holds more calls than can be read,
 * the totals stay right and the breakdown is short — and that has to be said on
 * the screen, not hidden, because a "top spenders" list that quietly omits half
 * the calls is worse than no list.
 *
 * The second: a call can have a charge of zero. Included minutes, internal
 * calls, unanswered calls. Those belong in the call count but not in a spend
 * ranking, or the list fills with rows that cost nothing.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface CallRow {
  /* Charge for this call. Comes back as a string from the database more often
     than not, which is why everything here goes through Number(). */
  charge?: number | string;
  chargeTotal?: number | string;
  billsectotal?: number | string;
  extension?: number | string;
  contact_name?: string;
  destination_number?: string;
  caller_id_number?: string;
  direction?: string;
  start_stamp?: string;
}

export interface SpendGroup {
  key: string;
  label: string;
  /* What this group cost, and how much of the period's calling it accounts for. */
  amount: number;
  calls: number;
  seconds: number;
}

const money = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* `chargeTotal` is the sum across the legs of one call; `charge` is a single
   leg. The list endpoints group by call and return both, so the total is the
   one to trust — but older rows have only the single value. */
export const chargeOf = (row: CallRow): number => money(row?.chargeTotal ?? row?.charge);

export const secondsOf = (row: CallRow): number => money(row?.billsectotal);

/* Outbound calls to the public network are what costs money. Splitting them out
   from inbound is the first question anybody asks of a phone bill, and the two
   behave differently enough that averaging them together tells you nothing. */
export const directionOf = (row: CallRow): 'Outbound' | 'Inbound' | 'Other' => {
  const d = String(row?.direction ?? '').toLowerCase();
  if (d === 'outbound') return 'Outbound';
  if (d === 'inbound' || d === 'missed' || d === 'voicemail') return 'Inbound';
  return 'Other';
};

/* Where a call went, as a country rather than a number. A list of two hundred
   individual numbers is not a finding; "most of it went to Germany" is.
   Numbers that cannot be parsed keep their prefix as the label rather than
   being dropped — a charge with nowhere to put it is exactly the thing somebody
   is looking for. */
export const destinationOf = (row: CallRow): { key: string; label: string } => {
  const raw = String(row?.destination_number ?? '').trim();
  if (!raw) return { key: 'unknown', label: 'Not recorded' };

  /* An extension is checked first, before any parsing. A four-digit extension
     with a `+` bolted on front parses quite happily as a country calling code -
     1001 becomes "+1", the United States - and every internal call in the
     company lands in a country it never dialled. */
  if (!raw.startsWith('+') && raw.replace(/\D/g, '').length <= 6) {
    return { key: 'internal', label: 'Internal' };
  }

  const parsed = parsePhoneNumberFromString(raw.startsWith('+') ? raw : `+${raw}`);
  if (parsed?.country) {
    return { key: parsed.country, label: parsed.country };
  }
  if (parsed?.countryCallingCode) {
    return { key: `+${parsed.countryCallingCode}`, label: `+${parsed.countryCallingCode}` };
  }

  return { key: 'unknown', label: 'Not recorded' };
};

const groupBy = (
  rows: CallRow[],
  pick: (row: CallRow) => { key: string; label: string } | null,
): SpendGroup[] => {
  const totals = new Map<string, SpendGroup>();

  (rows ?? []).forEach((row) => {
    const at = pick(row);
    if (!at) return;

    const current = totals.get(at.key) ?? {
      key: at.key,
      label: at.label,
      amount: 0,
      calls: 0,
      seconds: 0,
    };
    current.amount += chargeOf(row);
    current.calls += 1;
    current.seconds += secondsOf(row);
    totals.set(at.key, current);
  });

  /* Most expensive first — that is the order somebody reads this in. Ties break
     on call count so the ordering is stable rather than whatever the map
     happened to hold. */
  return [...totals.values()].sort((a, b) => b.amount - a.amount || b.calls - a.calls);
};

export const spendByPerson = (rows: CallRow[]): SpendGroup[] =>
  groupBy(rows, (row) => {
    const ext = String(row?.extension ?? '').trim();
    if (!ext) return null;
    const name = String(row?.contact_name ?? '').trim();
    return { key: ext, label: name ? `${name} (${ext})` : `Extension ${ext}` };
  });

export const spendByDestination = (rows: CallRow[]): SpendGroup[] => groupBy(rows, destinationOf);

export const spendByDirection = (rows: CallRow[]): SpendGroup[] =>
  groupBy(rows, (row) => {
    const d = directionOf(row);
    return { key: d, label: d === 'Other' ? 'Internal' : d };
  });

/* Rows that cost nothing are dropped from a ranking but counted everywhere
   else. An "included" call is not a spender, and letting it into a top-spend
   list pushes the calls that did cost money off the bottom of it. */
export const onlyCharged = (groups: SpendGroup[]): SpendGroup[] =>
  groups.filter((g) => g.amount > 0);

export const topN = (groups: SpendGroup[], n: number): SpendGroup[] =>
  groups.slice(0, Math.max(0, n));

/* The share of a total, rounded to a whole percent. Returns 0 rather than
   dividing by zero when nothing was spent, because "0%" is readable and "NaN%"
   is a bug report. */
export const shareOf = (amount: number, total: number): number => {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round((money(amount) / total) * 100);
};

export interface SpendTotals {
  /* Straight from the server, for the whole period — never derived from the
     rows, so these stay right even when the breakdown below them is short. */
  amount: number;
  calls: number;
  seconds: number;
  outboundCalls: number;
  inboundCalls: number;
}

export const readTotals = (callStats: any): SpendTotals => ({
  amount: money(callStats?.total_charge),
  calls: money(callStats?.total_calls),
  seconds: money(callStats?.total_duration),
  outboundCalls: money(callStats?.outbound_calls),
  inboundCalls: money(callStats?.inbound_calls),
});

/* Whether the breakdown covers every call in the period, or only the ones that
   could be read. The screen has to say which, and this is the one place that
   decides it. */
export const isBreakdownComplete = (rowsRead: number, totals: SpendTotals): boolean =>
  !Number.isFinite(totals.calls) || totals.calls <= 0 || rowsRead >= totals.calls;

/* Seconds as something a person reads. Whole minutes past an hour, because
   nobody checking a phone bill needs the seconds of a four-hour total. */
export const readDuration = (seconds: number): string => {
  const s = Math.max(0, Math.round(money(seconds)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
