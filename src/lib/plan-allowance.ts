/* What a plan includes, what happens when it runs out, and what that costs.
 *
 * The rule, in the product owner's words: a plan carries an allowance for each
 * service - so many minutes to a country, so many texts, so many AI replies, so
 * many AI voice minutes. Those are used first and cost nothing extra. Once an
 * allowance is gone the service does not stop: every further minute, text or
 * reply is charged one at a time from the customer's wallet.
 *
 * Three things follow from that, and each is a decision somebody would
 * otherwise make twice, differently, in two places.
 *
 *   An allowance can run out MID-EVENT. A call that lasts ten minutes when two
 *   remain is not "free" or "charged" - it is two free and eight charged. Any
 *   rule that treats an event as wholly one or the other bills the customer
 *   wrongly on exactly the call they will ring up about.
 *
 *   An empty wallet is a different answer from an exhausted allowance. Running
 *   out of allowance means "this now costs money". Running out of money means
 *   "this cannot go ahead". Collapsing the two either gives service away or
 *   refuses customers who were happy to pay.
 *
 *   Money is rounded once, at the end. Rounding each minute to the cent first
 *   drifts by whole cents across a long call, and a bill that misses its own
 *   quote by cents is still a bill somebody queries.
 *
 * This module decides. It does not know how to count anything - the counters
 * live on the platform - so every figure is passed in.
 */

export type ServiceId =
  | 'voice_minutes'
  | 'sms'
  | 'mms'
  | 'ai_replies'
  | 'ai_voice_minutes'
  | 'transcription_minutes';

export interface ServicePlan {
  service: ServiceId;
  /* What the plan includes for the billing period.
     Zero is a real value: every unit is charged from the first one.
     'unlimited' is also a real value and is NOT a large number - see the note
     on UNLIMITED in plan-catalogue.ts. Arithmetic on it would silently bill a
     customer who was promised unlimited calling. */
  included: number | 'unlimited';
  /* How much of that has been used so far this period. */
  used: number;
  /* What one unit costs once the allowance is gone. */
  rate: number;
  /* Minutes, texts, replies - what one unit is, for the wording. */
  unit: string;
}

export interface Wallet {
  /* What the customer has to spend. */
  balance: number;
}

export interface ChargeOutcome {
  /* Units covered by the plan, costing nothing extra. */
  fromAllowance: number;
  /* Units billed, one at a time, from the wallet. */
  charged: number;
  /* What those charged units cost. */
  cost: number;
  /* Whether the wallet covers it. */
  affordable: boolean;
  /* How much more money would be needed. Zero when affordable. */
  shortfall: number;
  /* What is left of the allowance afterwards. */
  allowanceLeft: number;
  /* One sentence a customer can read. */
  message: string;
}

const money = (value: number): number => Math.round(value * 100) / 100;

const clean = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/* What using `units` of a service costs, given the plan and the wallet.
 *
 * The split is the point: an event that straddles the end of an allowance is
 * partly included and partly charged, and both halves are reported. */
export const chargeFor = (
  plan: ServicePlan,
  units: number,
  wallet: Wallet,
): ChargeOutcome => {
  const wantedUnits = clean(units);

  /* Unlimited is answered before any arithmetic happens. Letting it fall
     through to the sums below is how an unlimited customer gets a bill. */
  if (plan?.included === 'unlimited') {
    return {
      fromAllowance: wantedUnits,
      charged: 0,
      cost: 0,
      affordable: true,
      shortfall: 0,
      allowanceLeft: Infinity,
      message: `Included — your plan has unlimited ${plan?.unit || 'units'}.`,
    };
  }

  const included = clean(plan?.included);
  const alreadyUsed = clean(plan?.used);
  const rate = clean(plan?.rate);
  const balance = clean(wallet?.balance);
  const wanted = clean(units);

  const remainingAllowance = Math.max(0, included - alreadyUsed);
  const fromAllowance = Math.min(wanted, remainingAllowance);
  const charged = Math.max(0, wanted - fromAllowance);
  const cost = money(charged * rate);

  const affordable = cost <= balance;
  const shortfall = affordable ? 0 : money(cost - balance);

  const unit = plan?.unit || 'units';
  let message: string;
  if (charged === 0) {
    message = `Covered by your plan. ${money(remainingAllowance - fromAllowance)} ${unit} left this month.`;
  } else if (fromAllowance > 0) {
    message = `${fromAllowance} ${unit} covered by your plan, then ${charged} charged at ${rate.toFixed(2)} each — $${cost.toFixed(2)} from your balance.`;
  } else if (affordable) {
    message = `Your plan's allowance is used up, so this is charged at ${rate.toFixed(2)} per ${unit.replace(/s$/, '')} — $${cost.toFixed(2)} from your balance.`;
  } else {
    message = `Your allowance is used up and your balance is $${balance.toFixed(2)}, which is $${shortfall.toFixed(2)} short of the $${cost.toFixed(2)} this would cost.`;
  }

  return {
    fromAllowance,
    charged,
    cost,
    affordable,
    shortfall,
    allowanceLeft: Math.max(0, remainingAllowance - fromAllowance),
    message,
  };
};

export type StartDecision = 'included' | 'charged' | 'refused';

export interface StartOutcome {
  decision: StartDecision;
  /* Why, in words a customer reads on screen or hears explained. */
  reason: string;
}

/* Whether something may go ahead at all.
 *
 * Asked before a call connects or a text is sent, when nobody yet knows how
 * long it will last. So it answers the only question that can be answered up
 * front: is there either allowance left, or money to pay for the first unit?
 *
 * Deliberately permissive about long events. A caller with one minute of
 * allowance and an empty wallet is allowed to start, because refusing a call
 * somebody is entitled to make is worse than a small overrun. Enforcement
 * mid-call is a separate decision and a separate risk. */
export const canStart = (plan: ServicePlan, wallet: Wallet): StartOutcome => {
  if (plan?.included === 'unlimited') {
    return {
      decision: 'included',
      reason: `Your plan includes unlimited ${plan?.unit || 'units'}.`,
    };
  }

  const included = clean(plan?.included);
  const used = clean(plan?.used);
  const rate = clean(plan?.rate);
  const balance = clean(wallet?.balance);
  const remaining = Math.max(0, included - used);

  if (remaining > 0) {
    return {
      decision: 'included',
      reason: `${remaining} ${plan?.unit || 'units'} left on your plan this month.`,
    };
  }

  /* No allowance left. It can still go ahead if the wallet covers one unit -
     charging begins immediately. A rate of nothing means we do not know what to
     charge, and guessing is worse than allowing it. */
  if (rate === 0) {
    return {
      decision: 'charged',
      reason: 'Your plan allowance is used up. No rate is set for this, so nothing is being charged.',
    };
  }

  if (balance >= rate) {
    return {
      decision: 'charged',
      reason: `Your plan allowance is used up. This is charged at ${rate.toFixed(2)} per ${(plan?.unit || 'unit').replace(/s$/, '')} from your balance.`,
    };
  }

  return {
    decision: 'refused',
    reason: `Your plan allowance is used up and your balance of $${balance.toFixed(2)} does not cover ${rate.toFixed(2)} for the next ${(plan?.unit || 'unit').replace(/s$/, '')}. Top up to carry on.`,
  };
};

/* What the whole period costs across every service - the figure a bill is built
   from. Services whose usage has not been counted are left out rather than
   counted as zero: "nobody measured this" is not "this cost nothing", and a
   total that quietly omits an unmeasured service while looking complete is the
   number somebody disputes. */
export const periodTotal = (
  lines: { plan: ServicePlan; units?: number; wallet: Wallet }[],
): { total: number; counted: number; uncounted: ServiceId[] } => {
  let total = 0;
  let counted = 0;
  const uncounted: ServiceId[] = [];

  (lines ?? []).forEach(({ plan, units, wallet }) => {
    if (units === undefined || units === null || !Number.isFinite(Number(units))) {
      uncounted.push(plan.service);
      return;
    }
    total += chargeFor(plan, Number(units), wallet).cost;
    counted += 1;
  });

  return { total: money(total), counted, uncounted };
};
