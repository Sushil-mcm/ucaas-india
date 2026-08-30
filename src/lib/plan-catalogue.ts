/* The plans we sell, what each includes, and what anything extra costs.
 *
 * One place, so a price cannot be right on the pricing page and wrong on the
 * bill. Every figure here maps onto a column the platform's plan record already
 * has, so this can seed those records rather than living beside them and
 * drifting.
 *
 * THE SHAPE, and why it is this shape
 *
 * A plan carries an allowance per service. Those are used first and cost
 * nothing. Past the allowance the service does not stop - each further minute,
 * text or reply is charged one at a time from the customer's balance. The rules
 * for that live in `plan-allowance.ts` and are tested there; this file is only
 * the numbers.
 *
 * UNLIMITED IS NOT A BIG NUMBER
 *
 * The trap this file exists to avoid. Two plans here include unlimited domestic
 * calling, and the obvious ways to store that are all wrong in the same
 * direction:
 *
 *   0 means every minute is charged from the first one
 *   null or undefined becomes NaN in arithmetic, and NaN comparisons are false,
 *     so "used > included" is false and it silently looks free - until some
 *     other sum turns NaN into a charge
 *   999999 works until somebody genuinely passes it
 *
 * So unlimited is its own value, `UNLIMITED`, and every function that reads an
 * allowance has to decide what to do with it rather than doing arithmetic on it
 * by accident. Getting this wrong bills an unlimited customer for calls they
 * were promised free, which is the worst billing bug there is: it looks correct
 * to us and outrageous to them.
 */

export const UNLIMITED = 'unlimited' as const;
export type Allowance = number | typeof UNLIMITED;

export const isUnlimited = (allowance: Allowance | undefined | null): boolean =>
  allowance === UNLIMITED;

/* How many units remain. Unlimited always has more, and says so honestly rather
   than returning a number somebody might print on a screen. */
export const allowanceLeft = (allowance: Allowance, used: number): Allowance => {
  if (isUnlimited(allowance)) return UNLIMITED;
  const total = Number(allowance) || 0;
  const spent = Number(used) || 0;
  return Math.max(0, total - spent);
};

export const describeAllowance = (allowance: Allowance, unit: string): string =>
  isUnlimited(allowance) ? `Unlimited ${unit}` : `${Number(allowance).toLocaleString()} ${unit}`;

export interface PlanDefinition {
  id: string;
  name: string;
  /* Per seat, per month, in US dollars. Zero is a real plan, not a missing
     price - the entry tier costs nothing and you pay only for numbers. */
  monthlyPerSeat: number;
  summary: string;
  /* What one seat includes each month. */
  includes: {
    domesticMinutes: Allowance;
    sms: Allowance;
    /* Numbers included before any are charged separately. */
    numbers: number;
  };
  /* What each further unit costs once an allowance is used up. Absent where the
     allowance is unlimited and the question cannot arise. */
  overage?: {
    domesticMinuteRate?: number;
    smsRate?: number;
  };
  /* The columns on the platform's own plan record these map to, so a plan can
     be created from this without anybody re-deriving the mapping. */
  maps: Record<string, string>;
  notes?: string[];
}

/* Priced to match the market reference the product owner chose, in USD. */
export const PLANS: PlanDefinition[] = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPerSeat: 0,
    summary: 'Pay only for the numbers you keep. No monthly seat charge.',
    includes: { domesticMinutes: 0, sms: 0, numbers: 0 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: '0',
      free_calls: '0',
      free_sms: '0',
      outbound_ratecard_uuid: 'standard outbound card',
      sms_rate_card_uuid: 'standard SMS card',
    },
    notes: [
      'Costs nothing to hold, so somebody can try the product before committing.',
      'Every minute and text is charged from the first one.',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPerSeat: 18,
    summary: '1,000 domestic minutes and 100 texts a month, per seat.',
    includes: { domesticMinutes: 1000, sms: 100, numbers: 1 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: '18',
      free_calls: '1000',
      free_sms: '100',
      did_count: '1',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPerSeat: 30,
    summary: 'Unlimited domestic calling and 500 texts a month, per seat.',
    includes: { domesticMinutes: UNLIMITED, sms: 500, numbers: 1 },
    /* No minute rate: domestic calling cannot run out on this plan. */
    overage: { smsRate: 0.04 },
    maps: {
      cost: '30',
      free_calls: 'unlimited - see note',
      free_sms: '500',
      did_count: '1',
    },
    notes: [
      'The platform stores allowances as numbers, so unlimited needs a deliberate representation on the plan record rather than a very large figure.',
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    monthlyPerSeat: 42,
    summary: 'Unlimited domestic calling and 1,000 texts a month, per seat.',
    includes: { domesticMinutes: UNLIMITED, sms: 1000, numbers: 1 },
    overage: { smsRate: 0.04 },
    maps: {
      cost: '42',
      free_calls: 'unlimited - see note',
      free_sms: '1000',
      did_count: '1',
    },
  },
];

export interface AddOnDefinition {
  id: string;
  name: string;
  summary: string;
  /* Per seat per month unless `per` says otherwise. */
  monthlyPrice: number;
  per: 'seat' | 'number' | 'account';
  included?: { units: number; unit: string };
  overageRate?: number;
  maps: Record<string, string>;
  notes?: string[];
}

export const PLAN_ADD_ONS: AddOnDefinition[] = [
  {
    id: 'ai_voice_agent',
    name: 'AI voice agent',
    summary: 'An AI voice that answers and speaks to callers.',
    monthlyPrice: 45,
    per: 'seat',
    included: { units: 100, unit: 'minutes' },
    overageRate: 0.25,
    maps: {
      ai_call_free_minutes: '100',
      ai_call_rate: '0.25',
    },
    notes: [
      'Every minute costs real money to run - speech recognition, the model, and the voice - so the rate here is set to cover that rather than to look cheap.',
    ],
  },
  {
    id: 'ai_copilot',
    name: 'AI copilot',
    summary: 'Transcription, call summaries, sentiment and topic tracking.',
    monthlyPrice: 10,
    per: 'seat',
    maps: {
      ai_message_free_reply: 'see plan',
      ai_message_rate: '0.08',
    },
    notes: [
      'Transcripts and summaries are given away by most of the market, so this is priced for the analysis on top of them rather than for the transcript itself.',
    ],
  },
  {
    id: 'call_recording',
    name: 'Call recording',
    summary: 'Record calls and keep them.',
    monthlyPrice: 0,
    per: 'seat',
    overageRate: 0.005,
    maps: { per_gb_price: 'storage beyond the plan allowance' },
    notes: ['Charged per minute recorded rather than as a monthly fee.'],
  },
  {
    id: 'spam_watch',
    name: 'Spam monitoring',
    summary: 'Watch whether your numbers get flagged as spam, and get them cleared.',
    monthlyPrice: 15,
    per: 'number',
    maps: {},
  },
];

/* Every plan and add-on as one list of "what does a seat cost", which is the
   question a pricing page answers. */
export const monthlyCostForSeat = (
  planId: string,
  addOnIds: string[] = [],
): { plan: number; addOns: number; total: number } | null => {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;

  const addOns = (addOnIds ?? [])
    .map((id) => PLAN_ADD_ONS.find((a) => a.id === id))
    .filter((a): a is AddOnDefinition => Boolean(a) && a!.per === 'seat')
    .reduce((sum, a) => sum + a.monthlyPrice, 0);

  return {
    plan: plan.monthlyPerSeat,
    addOns: Math.round(addOns * 100) / 100,
    total: Math.round((plan.monthlyPerSeat + addOns) * 100) / 100,
  };
};

/* The rates that apply to a named plan, or nothing if we cannot tell which plan
 * somebody is on.
 *
 * This exists so a usage screen can turn "412 minutes over" into "412 minutes
 * over, that is $8.24" - which is the number somebody actually wants.
 *
 * The refusal matters more than the lookup. A customer may be on a legacy plan,
 * a custom-priced one, or something renamed since. Falling back to a default
 * rate would put a confident figure on a billing screen that is wrong for that
 * customer, and a wrong money figure is worse than an absent one: the absent
 * one prompts a question, the wrong one prompts an invoice dispute. So an
 * unrecognised plan returns null and the screen says it cannot tell.
 */
export const ratesForPlan = (
  planName: string | undefined | null,
): { domesticMinuteRate?: number; smsRate?: number; planId: string } | null => {
  const wanted = String(planName ?? '')
    .trim()
    .toLowerCase();
  if (!wanted) return null;

  const plan = PLANS.find((p) => p.name.toLowerCase() === wanted || p.id.toLowerCase() === wanted);
  if (!plan) return null;

  return {
    planId: plan.id,
    domesticMinuteRate: plan.overage?.domesticMinuteRate,
    smsRate: plan.overage?.smsRate,
  };
};

/* Unlimited, as it has to be stored.
 *
 * The plan record keeps allowances as whole numbers, so unlimited needs a
 * number. Every candidate is wrong in some direction, and only one is wrong
 * SAFELY:
 *
 *   0     charges from the first minute - the opposite of unlimited
 *   NULL  becomes NaN, and NaN comparisons are false, so it looks free until
 *         some other sum quietly turns it into a charge
 *   -1    makes "used > included" true at once, so every minute bills
 *
 * A very large number is the only one that fails towards not charging: any
 * comparison against it says "still inside the allowance". So that is what is
 * stored, and this threshold is what turns it back into a word on screen.
 * Anything at or above it is unlimited - written down rather than left as a
 * magic number somebody later trims a zero from.
 */
export const UNLIMITED_STORED_THRESHOLD = 999_999_999;

export const storedAllowanceIsUnlimited = (value: unknown): boolean => {
  const n = Number(value);
  return Number.isFinite(n) && n >= UNLIMITED_STORED_THRESHOLD;
};

/* An allowance straight off the plan record, ready to show. Never prints the
   sentinel - a screen reading "999,999,999 minutes" tells a customer we do not
   know what we are doing. */
export const describeStoredAllowance = (value: unknown, unit: string): string => {
  /* Nothing at all is NOT zero. Number(null) is 0, so letting null through here
     would tell a customer their plan includes no minutes when the truth is that
     nobody told us. Checked before any conversion, because the conversion is
     what loses the difference. */
  if (value === null || value === undefined || value === '') return 'Not available yet';
  if (storedAllowanceIsUnlimited(value)) return `Unlimited ${unit}`;
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString()} ${unit}` : 'Not available yet';
};
