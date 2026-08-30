/* One allowance, ready to put on a screen: what is included, what has been
 * used, what is left, and how full it is.
 *
 * Three billing screens each worked this out for themselves, and each got it
 * wrong in its own way once the plans were given real allowances:
 *
 *   Nothing became zero. `Number(null)` is 0, so a plan whose figures had not
 *   loaded said "0 minutes included" — which reads as a fact, and the fact was
 *   that the customer had been sold a thousand minutes.
 *
 *   Unlimited became a number. The plan record cannot hold the word
 *   "unlimited", so it holds a very large number instead. Printed straight out,
 *   an unlimited customer saw "999,999,999 minutes" and a progress bar sitting
 *   at zero per cent. That is not a plan description, it is a bug report.
 *
 *   An allowance of zero and an allowance nobody told us about were shown the
 *   same way, though one means "charged from the first minute" and the other
 *   means "we do not know what you were sold".
 *
 * So the decision is made once, here, with a test — and every screen prints
 * what comes back rather than deciding for itself.
 *
 * A percentage is deliberately absent for unlimited. There is no such thing as
 * ninety per cent of unlimited, and a bar that never moves is worse than no bar
 * at all: it invites somebody to read it as "plenty left" on the day we start
 * measuring something else.
 */

import { knownNumber, UNAVAILABLE } from './billing-money';
import { storedAllowanceIsUnlimited } from './plan-catalogue';

export type AllowanceKind =
  /* Nobody told us what this plan includes. Not the same as none. */
  | 'unknown'
  /* Included without limit, so nothing can run out and nothing is charged. */
  | 'unlimited'
  /* Genuinely nothing included — every unit is charged from the first one. */
  | 'none'
  /* A real allowance with a real number behind it. */
  | 'metered';

export interface AllowanceMeter {
  kind: AllowanceKind;
  /* Ready to print. Includes the unit, so no screen has to join them up. */
  includedText: string;
  usedText: string;
  leftText: string;
  /* How much of the allowance is gone, for a bar. Null whenever a bar would be
     a lie: unknown allowance, unlimited allowance, or nothing included. */
  percent: number | null;
  /* Used more than was included, so the extra is being charged. */
  over: boolean;
}

/* Past this share of an allowance somebody wants telling while they can still
   do something about it. */
export const RUNNING_LOW_PERCENT = 80;

const withUnit = (value: number, unit: string): string =>
  unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();

export const allowanceMeter = (
  included: unknown,
  used: unknown,
  unit: string,
): AllowanceMeter => {
  /* Read before any arithmetic. Converting first is exactly what turns "no
     answer" into a confident zero. */
  const inc = knownNumber(included);
  const use = knownNumber(used);

  const usedText = use === null ? UNAVAILABLE : withUnit(use, unit);

  if (inc === null) {
    return {
      kind: 'unknown',
      includedText: UNAVAILABLE,
      usedText,
      leftText: UNAVAILABLE,
      percent: null,
      over: false,
    };
  }

  if (storedAllowanceIsUnlimited(inc)) {
    return {
      kind: 'unlimited',
      includedText: `Unlimited ${unit}`.trim(),
      usedText,
      /* "No limit" rather than a number: subtracting from unlimited gives a
         figure that is arithmetically true and completely meaningless. */
      leftText: 'No limit',
      percent: null,
      over: false,
    };
  }

  if (inc <= 0) {
    return {
      kind: 'none',
      includedText: 'None included',
      usedText,
      leftText: 'None included',
      percent: null,
      over: false,
    };
  }

  if (use === null) {
    return {
      kind: 'metered',
      includedText: withUnit(inc, unit),
      usedText,
      leftText: UNAVAILABLE,
      percent: null,
      over: false,
    };
  }

  const left = Math.max(0, inc - use);
  return {
    kind: 'metered',
    includedText: withUnit(inc, unit),
    usedText,
    leftText: withUnit(left, unit),
    percent: Math.max(0, Math.round((use / inc) * 100)),
    over: use > inc,
  };
};

/* Is this allowance close enough to being used up to say so? Unlimited and
   unknown are never "running low" — one cannot run out, and the other we cannot
   speak for. */
export const isRunningLow = (meter: AllowanceMeter): boolean =>
  meter.percent !== null && meter.percent >= RUNNING_LOW_PERCENT;
