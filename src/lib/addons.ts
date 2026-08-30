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
  /* The plan-feature path that says whether this account already has it. Read
     from what the platform reports, so the answer is about this company. */
  featureKey: string;
  /* Extra detail worth expanding, where there is any. */
  detail?: string[];
}

/* The catalogue.
 *
 * Each entry is tied to a capability this platform genuinely has, and to the
 * plan-feature key that reports whether a given company has it. Nothing here
 * describes something the product cannot do - a catalogue of things we do not
 * sell would be a list of disappointments. */
export const ADD_ONS: AddOn[] = [
  {
    id: 'international',
    name: 'International calling bundle',
    summary: 'A monthly allowance of international minutes shared across your company.',
    replaces: 'Replaces per-minute charges for calls abroad, up to the allowance.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'calling_rates',
    detail: [
      'Calls abroad are charged per minute today. A bundle turns that into one predictable monthly figure.',
      'Once the allowance is used, calls carry on and are charged at your usual rates rather than being blocked.',
      'Unused minutes do not carry over to the following month.',
    ],
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
    id: 'monitoring',
    name: 'Live monitoring and coaching',
    summary: 'Listen to a live call, whisper to the agent, or join it.',
    replaces: 'Replaces sitting next to somebody to train them.',
    billing: 'Bought per seat, monthly, for the people who supervise.',
    featureKey: 'monitoring',
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
    id: 'omni_channel',
    name: 'Messaging channels',
    summary: 'Handle social and messaging conversations beside your calls.',
    replaces: 'Replaces watching several separate inboxes.',
    billing: 'Bought per seat, monthly.',
    featureKey: 'omni_channel',
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
