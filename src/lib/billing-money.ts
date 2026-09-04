/* The money rules behind every billing screen.
 *
 * Billing is the one part of the product where a wrong number is not a bug you
 * fix quietly — it is a refund conversation, and sometimes a chargeback. So the
 * arithmetic lives here, on its own, with tests, instead of being scattered
 * through the components that happen to display it.
 *
 * Three things this module is careful about, and why:
 *
 * 1. **"We don't know" is not zero.** An API that returns nothing for a figure
 *    is telling us it has no answer. Printing $0.00 turns that silence into a
 *    claim — the customer reads "you owe nothing" and plans around it. Every
 *    figure that reaches a screen goes through `knownNumber` first, which keeps
 *    a real 0 and turns anything unknown into `null` so the screen can say
 *    "Not available yet" instead of inventing a fact.
 *
 * 2. **The proration here matches what the server actually charges.** The
 *    server works in 30-day months (a "month" is 30 days no matter which month
 *    it is), rounds to the cent, and never charges a positive amount below
 *    $0.51 because card processors reject smaller ones. If this module rounded
 *    differently, the drawer would promise one number and the card statement
 *    would show another. The rules are copied deliberately, and the tests pin
 *    them, so a change on either side shows up as a failing test rather than a
 *    surprised customer.
 *
 * 3. **Currency is US dollars.** Every charge this platform makes goes through
 *    the payment processor in USD. Showing a different symbol would be a wrong
 *    fact on a billing screen, which is the one thing these screens must never
 *    do — so the symbol is fixed here rather than guessed per component.
 */

/* Everything is charged in US dollars today. Kept as a constant, not sprinkled
   through the screens, so the day a second currency exists there is one place
   to change and one place to test. */
export const BILLING_CURRENCY = 'USD';
const CURRENCY_SYMBOL = '$';

/* A month, for billing purposes, is 30 days — the same rule the charge itself
   uses. Calendar months of 28 and 31 days would make the same plan cost
   different amounts in February and March. */
export const DAYS_PER_BILLING_MONTH = 30;

/* Card processors refuse very small charges, so the server lifts any positive
   prorated amount up to this. Somebody buying one licence on the last day of a
   cycle pays this rather than four cents. */
export const MINIMUM_CHARGE = 0.51;

/* Is this a figure we actually have?
 *
 * Returns the number when the answer is real — including a genuine zero, which
 * is a fact worth showing — and null when there is no answer at all. Screens
 * branch on the null to show "Not available yet" rather than a made-up zero. */
export const knownNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/* Round to whole cents. Money is held as a float in transit, and 0.1 + 0.2 is
   famously not 0.3, so every amount that reaches a screen or a total is put
   back onto a cent boundary before it is shown or added up. */
export const roundMoney = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

/* Money, written the way a customer expects to read it: symbol, thousands
   separators, always two decimal places. "$124.50", never "$124.5".
   An unknown figure comes back as null so the caller shows its own wording -
   this function will not print a zero it was not given. */
export const formatMoney = (value: unknown): string | null => {
  const n = knownNumber(value);
  if (n === null) return null;
  const rounded = roundMoney(n);
  const negative = rounded < 0;
  const body = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? '-' : ''}${CURRENCY_SYMBOL}${body}`;
};

/* What to print when there is no answer. One phrase, used everywhere, so the
   product never says "N/A" on one screen and "—" on the next. */
export const UNAVAILABLE = 'Not available yet';

/* Money for a screen: the formatted amount, or the honest admission. */
export const moneyOrUnavailable = (value: unknown): string =>
  formatMoney(value) ?? UNAVAILABLE;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* Dates are spelled out — "15 September 2026".
 *
 * 15/09/26 means the fifteenth of September to a British reader and nothing at
 * all to an American one, who reads the same string as an invalid date. On a
 * page that tells somebody when money leaves their account, that ambiguity is
 * not acceptable. Parsed as a plain calendar date, not a moment in time, so a
 * bill dated the 15th does not display as the 14th for anybody west of us. */
export const formatBillingDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

export const dateOrUnavailable = (value: unknown): string =>
  formatBillingDate(value) ?? UNAVAILABLE;

/* Days between two calendar dates, ignoring clocks and time zones entirely.
   Both are treated as plain dates because a billing cycle turns over on a date,
   not at an instant. */
const daysBetween = (fromISO: string, toISO: string): number | null => {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? '').trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = parse(fromISO);
  const b = parse(toISO);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
};

/* How long the paid-for cycle is, in billing days. A one-month plan is 30 days,
   a yearly plan is 360 — deliberately, because that is the number the charge is
   divided by. */
export const planDays = (planDurationMonths: unknown): number | null => {
  const months = knownNumber(planDurationMonths);
  if (months === null || months <= 0) return null;
  return Math.round(months) * DAYS_PER_BILLING_MONTH;
};

/* How much of the cycle is still to come.
 *
 * Follows the server's rule exactly: whole calendar months left, counted as 30
 * days each, plus the leftover days. A cycle that has already ended has nothing
 * left. A cycle ending later today still counts as one day, so somebody buying
 * on the final day is charged for a day rather than for nothing. */
export const remainingDays = (
  planExpiryISO: unknown,
  todayISO: unknown,
): number | null => {
  if (typeof planExpiryISO !== 'string' || typeof todayISO !== 'string') return null;
  const gap = daysBetween(todayISO, planExpiryISO);
  if (gap === null) return null;
  if (gap <= 0) return 0;

  /* Whole months first, then the days that do not make up a month, matching the
     server's month-then-days split rather than dividing the total by 30. */
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())!;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  };
  const start = parse(todayISO);
  const end = parse(planExpiryISO);
  let fullMonths = (end.y - start.y) * 12 + (end.m - start.m);
  if (end.d < start.d) fullMonths -= 1;
  if (fullMonths < 0) fullMonths = 0;

  /* Move the start forward by those whole months, clamping to the end of a
     short month the way calendar arithmetic does, then count what is left. */
  const shifted = new Date(Date.UTC(start.y, start.m - 1 + fullMonths, 1));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = shifted.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(shiftedYear, shiftedMonth, 0)).getUTCDate();
  const shiftedDay = Math.min(start.d, lastDay);
  const leftover = daysBetween(
    `${shiftedYear}-${String(shiftedMonth).padStart(2, '0')}-${String(shiftedDay).padStart(2, '0')}`,
    planExpiryISO,
  );
  if (leftover === null) return null;

  const total = fullMonths * DAYS_PER_BILLING_MONTH + leftover;
  return total > 0 ? total : 1;
};

/* The part-cycle charge: what a full cycle costs, scaled down to the days that
   are actually left, rounded to the cent, and lifted to the minimum the card
   processor will accept if it lands below it. Nothing left in the cycle means
   nothing to pay. */
export const prorate = (
  fullCycleCost: unknown,
  cycleDays: unknown,
  daysLeft: unknown,
): number | null => {
  const cost = knownNumber(fullCycleCost);
  const days = knownNumber(cycleDays);
  const left = knownNumber(daysLeft);
  if (cost === null || days === null || left === null) return null;
  if (days <= 0) return null;
  if (left <= 0) return 0;
  const amount = roundMoney((cost / days) * left);
  if (amount > 0 && amount < MINIMUM_CHARGE) return MINIMUM_CHARGE;
  return amount;
};

export interface LicenceQuote {
  /* What leaves the card today, for the part of the cycle that is left. */
  chargedToday: number;
  /* What these licences add to every bill from the next one onwards. */
  monthlyFromNextBill: number;
  /* How many days today's charge covers — the number the sentence quotes. */
  daysCovered: number;
  /* The date the normal rate starts, spelled out for the sentence. */
  nextBillDate: string | null;
}

/* The whole answer behind the sentence a customer must see before they buy:
 * "You'll be charged $X today for N days until your next bill on 15 September.
 *  From then, $Y per month."
 *
 * Returns null rather than a guess if any input is missing. A drawer with no
 * quote must keep its Confirm button disabled — an unpriced purchase is the
 * exact thing that becomes a refund. */
export const licenceQuote = (input: {
  costPerLicencePerCycle: unknown;
  licences: unknown;
  planDurationMonths: unknown;
  planExpiryISO: unknown;
  todayISO: unknown;
  nextBillDateISO?: unknown;
}): LicenceQuote | null => {
  const perLicence = knownNumber(input.costPerLicencePerCycle);
  const count = knownNumber(input.licences);
  const cycleDays = planDays(input.planDurationMonths);
  const left = remainingDays(input.planExpiryISO, input.todayISO);
  if (perLicence === null || count === null || cycleDays === null || left === null) return null;
  if (count <= 0) return null;

  const fullCycle = roundMoney(perLicence * count);
  const chargedToday = prorate(fullCycle, cycleDays, left);
  if (chargedToday === null) return null;

  const nextBill =
    typeof input.nextBillDateISO === 'string' && input.nextBillDateISO
      ? input.nextBillDateISO
      : typeof input.planExpiryISO === 'string'
        ? input.planExpiryISO
        : null;

  return {
    chargedToday,
    monthlyFromNextBill: fullCycle,
    daysCovered: left,
    nextBillDate: nextBill,
  };
};

/* Is a card about to stop working?
 *
 * A card that expires mid-cycle fails the renewal silently, and the first the
 * customer hears is a suspension notice. Thirty days is enough warning to get a
 * new card without it becoming urgent. Month and year, no day, because that is
 * all a card carries — a card expiring in September works to the last of it. */
export const cardExpiresSoon = (
  expMonth: unknown,
  expYear: unknown,
  todayISO: unknown,
  withinDays = 30,
): boolean | null => {
  const m = knownNumber(expMonth);
  const y = knownNumber(expYear);
  if (m === null || y === null || m < 1 || m > 12) return null;
  if (typeof todayISO !== 'string') return null;
  /* Cards work through the last day of their expiry month. */
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const expiryISO = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const gap = daysBetween(todayISO, expiryISO);
  if (gap === null) return null;
  return gap <= withinDays;
};
