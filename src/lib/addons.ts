/* The extras a company can have on top of its plan, and which it already has.
 *
 * An add-on is not a switch on this screen. It is a licence bought per seat, the
 * same way the plan itself is, and it changes what a person's line can do. That
 * distinction matters for the wording: "add" and "remove" here mean buying and
 * returning licences, not flicking something on.
 *
 * Two rules shape everything below, and both come from the same place - a
 * billing screen that states something untrue turns into a refund conversation.
 *
 *   The on/off state is read, never assumed. Whether a company has an add-on is
 *   decided by the plan features the platform actually reports, so the badge on
 *   each card is the truth about that account rather than a guess.
 *
 *   No price is invented. Nothing in the API supplies an add-on price, so the
 *   price line says so. A number here that turned out to be wrong would be the
 *   worst kind of wrong: somebody would budget against it.
 */

export interface AddOn {
  id: string;
  name: string;
  /* One line, in the customer's language, not the platform's. */
  summary: string;
  /* What a customer stops paying for, or stops doing by hand, if they take it.
     This is the line that tells somebody whether it is worth the money. */
  replaces: string;
  /* How it is charged, in words. Not a price - see the header. */
  billing: string;
  /* The plan-feature path that says whether this account already has it, read
     from what the platform reports. Left unset where the platform has no flag
     of its own for this add-on - then the honest answer is "we cannot tell",
     not "you do not have it". Sharing another add-on's flag would be worse
     still: it would claim you already had something you have not bought. */
  featureKey?: string;
  /* Extra detail worth expanding, where there is any. */
  detail?: string[];

  /* Price in US dollars per month. Set by the product owner - there is still no
     catalogue endpoint, so these live here until there is one. When that
     endpoint arrives this is the field that must come from it, because a price
     kept in two places drifts, and the copy customers budget against is the one
     that must be right. */
  monthlyPrice?: number;
  /* What the monthly price includes, and in what unit. */
  included?: number;
  includedUnit?: string;
  /* What each unit costs once the allowance is used up. */
  overageRate?: number;
}

/* What an add-on costs this month: the monthly price, plus anything used beyond
   the allowance. Kept here and tested because it is money - the same sum done
   slightly differently on two screens is how a bill stops matching a quote. */
export const estimateMonthlyCost = (
  addOn: AddOn,
  used?: number,
): { total: number; base: number; overage: number; overUnits: number } | null => {
  if (addOn.monthlyPrice === undefined) return null;

  const base = addOn.monthlyPrice;
  const allowance = addOn.included ?? 0;
  const rate = addOn.overageRate ?? 0;

  /* Usage we do not know is not usage of zero. Without a figure the honest
     answer is the base price alone, not a total implying nothing was used. */
  const consumed = Number.isFinite(used as number) ? Math.max(0, used as number) : 0;
  const overUnits = Math.max(0, consumed - allowance);
  /* Rounded to the cent at the end rather than per unit: rounding each minute
     first drifts by whole cents over thousands of them. */
  const overage = Math.round(overUnits * rate * 100) / 100;

  return { total: Math.round((base + overage) * 100) / 100, base, overage, overUnits };
};

/* The catalogue.
 *
 * Each entry is tied to a capability this platform genuinely has, and to the
 * plan-feature key that reports whether a given company has it. Nothing here
 * describes something the product cannot do - a catalogue of things we do not
 * sell would be a list of disappointments. */
export const ADD_ONS: AddOn[] = [
  {
    id: 'international',
    name: 'Global unlimited calling',
    summary: '8,000 international minutes a month, instead of paying for each one.',
    replaces: 'Replaces per-minute charges for calls abroad, up to 8,000 minutes.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'calling_rates',
    monthlyPrice: 20,
    included: 8000,
    includedUnit: 'minutes',
    overageRate: 0.08,
    detail: [
      'Calls abroad are charged per minute today. This turns that into one predictable monthly figure.',
      'Past 8,000 minutes, calls carry on at 8 cents a minute rather than being blocked.',
      'Unused minutes do not carry over to the following month.',
    ],
  },
  {
    id: 'numbers',
    name: 'Extra and toll-free numbers',
    summary: 'More numbers than your plan includes, including toll-free ones.',
    replaces: 'Replaces buying numbers one at a time as you need them.',
    billing: 'Bought per number, monthly.',
    featureKey: 'virtual_numbers',
  },
  {
    id: 'ai',
    name: 'AI assistance',
    summary: 'Live transcription, call summaries and the AI receptionist.',
    replaces: 'Replaces writing up calls by hand, and having somebody answer and transfer every call.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'ai',
  },
  {
    id: 'ai_voice',
    name: 'AI voice',
    summary: '50 minutes a month of an AI voice answering and speaking to callers.',
    replaces: 'Replaces somebody having to pick up simply to find out what a caller wants.',
    billing: 'Bought per seat, monthly.',
    /* No featureKey on purpose. This is bought separately from AI assistance and
       the platform reports no flag of its own for it, so the card says it cannot
       tell rather than borrowing the AI flag and claiming you have it. */
    monthlyPrice: 20,
    included: 50,
    includedUnit: 'minutes',
    overageRate: 0.08,
    detail: [
      'Past 50 minutes, it keeps working and each further minute costs 8 cents.',
      'Replies from the AI agent beyond the allowance are charged the same way.',
    ],
  },
  {
    id: 'quality',
    name: 'Quality scoring and coaching',
    summary: 'Score calls automatically, measure how satisfied callers were, and prompt agents while they talk.',
    replaces: 'Replaces listening back to calls one at a time to mark them.',
    billing: 'Bought per seat, monthly, for the people being scored.',
    featureKey: 'monitoring_features',
    detail: [
      'Calls are scored against your own checklist rather than a supervisor working through recordings.',
      'Caller satisfaction is worked out from the conversation, so you hear about a bad call without waiting for a survey.',
    ],
  },
  {
    id: 'monitoring',
    name: 'Live monitoring',
    summary: 'Listen to a live call, whisper to the agent, or join it.',
    replaces: 'Replaces sitting next to somebody to train them.',
    billing: 'Bought per seat, monthly, for the people who supervise.',
    featureKey: 'monitoring',
  },
  {
    id: 'contact_centre',
    name: 'Advanced call handling',
    summary: 'Route by skill, offer callers a call back instead of holding, and give agents time to write up.',
    replaces: 'Replaces a single queue that rings everybody the same way.',
    billing: 'Bought per seat, monthly, for the people answering.',
    featureKey: 'advance_call_management',
    detail: [
      'Skills routing sends a caller to somebody who can actually help rather than whoever is free.',
      'A call back means somebody keeps their place in the queue without holding the line.',
      'Wrap-up time keeps the next call away until the last one is written up.',
    ],
  },
  {
    id: 'campaigns',
    name: 'Outbound campaigns',
    summary: 'Work through a list of numbers automatically instead of dialling each one.',
    replaces: 'Replaces dialling from a spreadsheet.',
    billing: 'Bought per seat, monthly, for the people making the calls.',
    featureKey: 'campaign',
  },
  {
    id: 'reports',
    name: 'Advanced reporting',
    summary: 'Deeper reporting on calls, queues and people than the standard screens.',
    replaces: 'Replaces exporting call logs and building the report yourself.',
    billing: 'Bought per company, monthly.',
    featureKey: 'reports',
  },
  {
    id: 'omni_channel',
    name: 'Messaging channels',
    summary: 'Handle social and messaging conversations beside your calls.',
    replaces: 'Replaces watching several separate inboxes.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'omni_channel',
  },
  {
    id: 'fax',
    name: 'Internet fax',
    summary: 'Send and receive faxes without a fax machine or a separate line.',
    replaces: 'Replaces a physical fax line.',
    billing: 'Bought per number, monthly.',
    featureKey: 'messages',
  },
  {
    id: 'video',
    name: 'Video meetings',
    summary: 'Meetings with screen sharing, from the same app as the phone.',
    replaces: 'Replaces a separate meetings subscription.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'video',
  },
];

export type AddOnState = 'included' | 'not-included' | 'unknown';

/* Whether this company already has an add-on.
 *
 * `unknown` is a real answer and not a failure. If the platform has not told us
 * what the plan includes - the call has not returned, or the shape is not what
 * we expect - then saying "not included" would be a guess, and somebody could
 * buy a thing they already have on the strength of it.
 */
export const addOnState = (features: any, addOn: AddOn): AddOnState => {
  /* No flag exists for this one, so nothing can be concluded about it. */
  if (!addOn.featureKey) return 'unknown';
  if (!features || typeof features !== 'object') return 'unknown';

  const node = features[addOn.featureKey];
  if (node === undefined || node === null) return 'not-included';

  /* The platform reports a feature either as a plain flag or as an object with
     an IS_SHOW flag on it. Both mean the same thing here. */
  if (typeof node === 'boolean') return node ? 'included' : 'not-included';
  if (typeof node === 'object') {
    const shown = (node as any).IS_SHOW;
    if (shown === undefined) return 'included';
    return shown ? 'included' : 'not-included';
  }

  return 'unknown';
};

export const STATE_LABEL: Record<AddOnState, string> = {
  included: 'On your plan',
  'not-included': 'Not on your plan',
  unknown: 'Not available yet',
};

/* A one-line summary for the top of the screen. Counting only what is known,
   because an add-on whose state could not be read is not evidence either way. */
export const countByState = (
  features: any,
  addOns: AddOn[] = ADD_ONS,
): { included: number; notIncluded: number; unknown: number } => {
  const counts = { included: 0, notIncluded: 0, unknown: 0 };
  addOns.forEach((addOn) => {
    const state = addOnState(features, addOn);
    if (state === 'included') counts.included += 1;
    else if (state === 'not-included') counts.notIncluded += 1;
    else counts.unknown += 1;
  });
  return counts;
};

/* Nothing in the API supplies an add-on price, so this exists to be honest about
   that in one place rather than in six. When a catalogue endpoint arrives, this
   is the only function that needs to change. */
export const priceText = (): string => 'Not available yet';

export const canPurchaseHere = (): boolean => false;
