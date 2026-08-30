/* When the billing summary should shout, and exactly what it should say.
 *
 * A banner that is always there is wallpaper — people stop reading it, and the
 * one time it matters they scroll straight past. So this returns nothing at all
 * when the account is healthy, which is almost always, and the banner only
 * exists on screen when there is something to do.
 *
 * Two rules shape every message here:
 *
 * **Say the consequence, not the status.** "Payment failed" tells somebody a
 * fact about the past. "Calls are still connecting, but new numbers cannot be
 * purchased until payment is updated" tells them what it means for their
 * business today, which is the only reason they would act. Every message names
 * what still works as well as what does not, because a customer who thinks
 * their phones are about to die behaves very differently from one who knows
 * they have a week.
 *
 * **One banner at a time.** If three things are wrong the customer still only
 * has attention for the worst of them, and fixing the worst usually clears the
 * rest. The list below is in severity order and the first match wins.
 *
 * Kept out of the component because "is this account in trouble" is a decision
 * with real consequences and a dozen edge cases — an expired trial, a card that
 * ran out last week, an account with no card at all — and those deserve tests
 * rather than a chain of ternaries inside some JSX.
 */

import { cardExpiresSoon, formatBillingDate } from './billing-money';

export type AlertTone = 'warning' | 'danger';

export interface BillingAlert {
  /* Amber for "sort this out soon", red for "something has already stopped". */
  tone: AlertTone;
  /* One short line naming the problem. */
  title: string;
  /* What it means for the business — what still works, what does not. */
  detail: string;
  /* The single button. One action, so there is no decision to make. */
  actionLabel: string;
  actionHref: string;
}

/* Plan states that mean service has already been cut off, as opposed to states
   that merely mean somebody should look at something. The platform writes these
   as single letters in some places and whole words in others, so both spellings
   are listed rather than trusting one. */
const SUSPENDED_STATES = ['S', 'SUSPENDED', 'D', 'DISABLED'];
const EXPIRED_STATES = ['E', 'EXPIRED'];

const CREDIT_PATH = '/admin-settings/billing/purchase';
const PLAN_PATH = '/admin-settings/billing/plan';

const upper = (v: unknown) => String(v ?? '').trim().toUpperCase();

export interface AccountSnapshot {
  /* From the plan detail endpoint. */
  planStatus?: unknown;
  isTrial?: unknown;
  planExpiryISO?: unknown;
  /* The most recent plan payment the platform recorded, if any. */
  lastPaymentStatus?: unknown;
  /* The default card, if one is saved at all. */
  hasPaymentMethod?: boolean;
  cardExpMonth?: unknown;
  cardExpYear?: unknown;
  /* Today, passed in rather than read from the clock so this stays testable. */
  todayISO: string;
}

/* Days-until check for a plain date, sharing the card rule's shape so "soon"
   means the same thing everywhere on the page. */
const cardExpiresSoonByDate = (
  targetISO: string,
  todayISO: string,
  withinDays: number,
): boolean => {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? '').trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = parse(todayISO);
  const b = parse(targetISO);
  if (a === null || b === null) return false;
  const days = Math.round((b - a) / 86400000);
  return days <= withinDays;
};

export const billingAlert = (snapshot: AccountSnapshot): BillingAlert | null => {
  const status = upper(snapshot.planStatus);

  /* Worst first: the account has been switched off. Nothing else on the page
     matters until this is fixed, so it is stated without hedging. */
  if (SUSPENDED_STATES.includes(status)) {
    return {
      tone: 'danger',
      title: 'This account is suspended',
      detail:
        'Calls are not connecting and numbers cannot be used while the account is suspended. Renewing the plan restores service.',
      actionLabel: 'Renew plan',
      actionHref: PLAN_PATH,
    };
  }

  if (EXPIRED_STATES.includes(status)) {
    return {
      tone: 'danger',
      title: 'The plan has expired',
      detail:
        'Calls are not connecting on an expired plan. Renewing puts the same numbers and settings straight back into service — nothing has been deleted.',
      actionLabel: 'Renew plan',
      actionHref: PLAN_PATH,
    };
  }

  /* Service is still running from here down, and every message says so. */
  if (upper(snapshot.lastPaymentStatus) === 'FAILED') {
    return {
      tone: 'warning',
      title: 'The last payment did not go through',
      detail:
        'Calls are still connecting, but new numbers cannot be purchased until payment is updated. Adding a working card and retrying clears it.',
      actionLabel: 'Update payment method',
      actionHref: CREDIT_PATH,
    };
  }

  if (snapshot.hasPaymentMethod === false) {
    return {
      tone: 'warning',
      title: 'No payment method saved',
      detail:
        'Everything works today, but the next bill has nothing to charge and the account will go on hold when it is due. Saving a card now avoids that.',
      actionLabel: 'Add a card',
      actionHref: CREDIT_PATH,
    };
  }

  /* A card that runs out mid-cycle fails the renewal quietly, and the first
     anybody hears about it is a suspension. Thirty days is enough notice to
     deal with it as an errand rather than an emergency. */
  if (cardExpiresSoon(snapshot.cardExpMonth, snapshot.cardExpYear, snapshot.todayISO) === true) {
    return {
      tone: 'warning',
      title: 'The saved card is about to expire',
      detail:
        'Calls are still connecting. If the card expires before the next bill the payment will fail and the account will go on hold, so it is worth replacing now.',
      actionLabel: 'Replace card',
      actionHref: CREDIT_PATH,
    };
  }

  /* A trial that lapses without a plan behaves exactly like a suspension, and
     people are consistently surprised by it, so it gets its own warning with
     the date spelled out. */
  if (upper(snapshot.isTrial) === 'Y' || snapshot.isTrial === true) {
    const expiry = snapshot.planExpiryISO;
    const soon =
      typeof expiry === 'string' && cardExpiresSoonByDate(expiry, snapshot.todayISO, 7);
    if (soon) {
      const when = formatBillingDate(expiry);
      return {
        tone: 'warning',
        title: 'The trial ends soon',
        detail: `Calls stop connecting when the trial ends${when ? ` on ${when}` : ''}. Choosing a plan before then keeps the same numbers and settings.`,
        actionLabel: 'Choose a plan',
        actionHref: PLAN_PATH,
      };
    }
  }

  return null;
};

/* Is the balance low enough to be worth a quiet word on the credits tile?
 *
 * Separate from the banner on purpose: a thin balance is a nudge, not an
 * emergency, and promoting it to a red bar at the top of the page would train
 * people to ignore the red bar. Returns null when there is no balance figure to
 * judge, so a missing number never reads as "you have run out". */
export const isBalanceLow = (
  balance: unknown,
  threshold: unknown = 10,
): boolean | null => {
  if (balance === null || balance === undefined || balance === '') return null;
  const n = Number(balance);
  const limit = Number(threshold);
  if (!Number.isFinite(n) || !Number.isFinite(limit)) return null;
  return n <= limit;
};
