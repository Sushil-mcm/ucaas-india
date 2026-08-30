/* Turning a plan's allowances into the rows of the usage table.
 *
 * A customer looking at usage is asking one question: "am I about to be charged
 * extra, and for what?" Everything here exists to answer that honestly.
 *
 * The hard part is not the arithmetic — it is that the platform knows far less
 * than a usage table implies. It knows how many voice minutes a plan includes
 * and how many have been used. It does not, today, expose a per-service rate or
 * a per-service cost to a customer's own admin, and for several services it has
 * no used-count at all. A table that filled those gaps with 0 would tell
 * somebody "you have used no AI minutes and owe nothing for them" when the
 * truth is "nobody has counted". That is the kind of wrong fact that turns into
 * a refund argument, so every cell here can be `null`, and `null` means the
 * screen prints "Not available yet" rather than a number.
 *
 * The other rule worth stating: **overage only exists once an allowance is
 * known.** If we do not know what is included, we cannot know what is over, so
 * the over cell stays unknown rather than defaulting to everything used.
 */

import { knownNumber, roundMoney } from './billing-money';

/* How close to the allowance somebody is. Drives the colour of the thin bar on
   each row — nothing more. Amber is a nudge; red means money is being spent. */
export type UsageBand = 'ok' | 'warning' | 'over';

/* Past this share of an allowance a customer wants warning while they can still
   do something about it. Past 100 they are paying per unit. */
export const WARNING_AT_PERCENT = 80;

export interface UsageRow {
  /* What the customer calls it — "Voice minutes", not "call_duration". */
  service: string;
  /* Minutes, messages, conversations. Shown next to the numbers so nobody has
     to guess whether 400 is minutes or calls. */
  unit: string;
  included: number | null;
  used: number | null;
  /* Units used beyond the allowance. Null when either side is unknown. */
  over: number | null;
  /* Price per unit past the allowance. */
  rate: number | null;
  /* What the overage costs. */
  cost: number | null;
  /* Why a row is short of numbers, in the customer's words. Shown once under
     the row rather than repeated in every empty cell. */
  note?: string;
}

/* How far through the allowance, as a percentage. Null when we cannot tell.
   An allowance of zero is "no allowance", not "instantly over" — a plan with no
   included SMS charges from the first message, and the bar would be a
   permanently red distraction. */
export const percentUsed = (included: unknown, used: unknown): number | null => {
  const inc = knownNumber(included);
  const use = knownNumber(used);
  if (inc === null || use === null || inc <= 0) return null;
  return Math.round((use / inc) * 100);
};

export const usageBand = (included: unknown, used: unknown): UsageBand | null => {
  const pct = percentUsed(included, used);
  if (pct === null) return null;
  if (pct >= 100) return 'over';
  if (pct >= WARNING_AT_PERCENT) return 'warning';
  return 'ok';
};

/* Units used past the allowance. Never negative — somebody who used 10 of 400
   is not "minus 390 over", they are simply inside their allowance. */
export const overageUnits = (included: unknown, used: unknown): number | null => {
  const inc = knownNumber(included);
  const use = knownNumber(used);
  if (inc === null || use === null) return null;
  return Math.max(0, use - inc);
};

/* What the overage costs. Needs a rate, and there is no per-service rate on
   offer today, so this returns null far more often than it returns a number -
   which is the honest outcome, not a failure. */
export const overageCost = (
  included: unknown,
  used: unknown,
  ratePerUnit: unknown,
): number | null => {
  const over = overageUnits(included, used);
  const rate = knownNumber(ratePerUnit);
  if (over === null || rate === null) return null;
  return roundMoney(over * rate);
};

/* Is this row entirely inside its allowance?
 *
 * Rows that are fully included get greyed down, so the eye lands on the one
 * line that is actually costing money. A row we know nothing about is not
 * "included" — it is unknown, and must not be dimmed as though it were settled. */
export const isFullyIncluded = (row: UsageRow): boolean =>
  row.over !== null && row.over === 0;

/* Build one row, doing the unknown-handling once so no screen has to. */
export const makeUsageRow = (input: {
  service: string;
  unit: string;
  included?: unknown;
  used?: unknown;
  rate?: unknown;
  note?: string;
}): UsageRow => {
  const included = knownNumber(input.included);
  const used = knownNumber(input.used);
  const rate = knownNumber(input.rate);
  return {
    service: input.service,
    unit: input.unit,
    included,
    used,
    over: overageUnits(included, used),
    rate,
    cost: overageCost(included, used, rate),
    note: input.note,
  };
};

/* Order for reading: the expensive thing first.
 *
 * Somebody opening this table wants the answer in the first row. So known costs
 * lead, largest first; then rows that are over their allowance but unpriced,
 * because those are the next bill's surprises; then everything else by how much
 * of its allowance is gone. Rows we know nothing about sink to the bottom -
 * they are not news. Ties fall back to the name so the order never jitters
 * between renders. */
export const sortUsageRows = (rows: UsageRow[]): UsageRow[] =>
  [...rows].sort((a, b) => {
    const rank = (r: UsageRow) => {
      if (r.cost !== null && r.cost > 0) return 0;
      if (r.over !== null && r.over > 0) return 1;
      if (r.used !== null) return 2;
      return 3;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return (b.cost ?? 0) - (a.cost ?? 0);
    if (ra === 1) return (b.over ?? 0) - (a.over ?? 0);
    if (ra === 2) return (percentUsed(b.included, b.used) ?? -1) - (percentUsed(a.included, a.used) ?? -1);
    return a.service.localeCompare(b.service);
  });

/* Does this table actually know anything?
 *
 * If every single row is blank the screen should say so plainly rather than
 * render an immaculate grid of dashes that looks like a loading failure. */
export const hasAnyUsage = (rows: UsageRow[]): boolean =>
  rows.some((r) => r.used !== null || r.included !== null);

/* How many of the figures on show are real, so a screen can warn once at the
   top — "some services are not metered yet" — instead of per row. */
export const unavailableCount = (rows: UsageRow[]): number =>
  rows.filter((r) => r.used === null).length;
