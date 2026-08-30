/* Blocking a number, and what the platform can actually do about it today.
 *
 * Blocking sounds like one decision and is really three:
 *
 *   which number      the digits, however they were typed or stored
 *   what to stop      calls, messages, or both
 *   what the caller
 *   hears instead     voicemail, a spam folder, or an out-of-service tone
 *
 * The contact book stores exactly one of those three. A contact carries a
 * single tag — Standard, VIP, DNC or Blocked — and nothing else. There is no
 * field for "calls only", none for "send to voicemail", and none for a number
 * that is not a saved contact. So this module does two jobs: it works out the
 * whole decision the way a person would make it, and it says plainly which
 * parts of that decision the platform can keep and which it cannot.
 *
 * That split is the point. A screen that quietly drops half of what somebody
 * chose is worse than one that says "we recorded the block; the notification
 * choice is not stored yet" — the second is honest, and it tells whoever builds
 * the backend exactly what is missing.
 *
 * Two rules come straight from how phone systems have always behaved:
 *
 *   emergency and short numbers cannot be blocked   blocking 999 or a 5-digit
 *                                                   short code would be unsafe
 *                                                   and, on most carriers,
 *                                                   simply ignored
 *   a number is matched on its digits               the same caller is stored
 *                                                   as +44 20 7946 0000 in one
 *                                                   place and 442079460000 in
 *                                                   another; comparing the two
 *                                                   as text finds nothing
 */

/** What the block should stop. Blocking calls also stops faxes — same channel. */
export type BlockScope = 'calls' | 'messages' | 'both';

/** What the caller gets instead, once the platform can act on the choice. */
export type BlockTreatment =
  /* Calls go to voicemail. The conversation still shows in the inbox and in
     recent calls, so nothing is hidden from the person who blocked it. */
  | 'voicemail'
  /* Voicemail as above, and calls and messages are filed under spam rather than
     the inbox. */
  | 'spam'
  /* The line reads as out of service to that caller. Nothing arrives at all. */
  | 'reject';

/** Whether the block applies to one person's line or to a shared line. */
export type BlockLine = 'personal' | 'shared';

export interface BlockChoice {
  number: string;
  scope: BlockScope;
  treatment: BlockTreatment;
  line: BlockLine;
}

export const DEFAULT_BLOCK_CHOICE: Omit<BlockChoice, 'number'> = {
  scope: 'both',
  treatment: 'voicemail',
  line: 'personal',
};

/* Written for the person choosing, not for the log. Each one says what the
   caller experiences, because that is the part people actually care about. */
export const TREATMENT_LABELS: Record<BlockTreatment, string> = {
  voicemail: 'Send to voicemail',
  spam: 'Mark as spam',
  reject: 'Block everything',
};

export const TREATMENT_DESCRIPTIONS: Record<BlockTreatment, string> = {
  voicemail:
    'Calls go straight to voicemail. You still see the conversation in your inbox and in recent calls.',
  spam: 'Calls go straight to voicemail, and calls and messages are filed under spam instead of your inbox.',
  reject: 'Your number reads as out of service to this caller. Nothing reaches you at all.',
};

export const SCOPE_LABELS: Record<BlockScope, string> = {
  calls: 'Calls and faxes',
  messages: 'Messages',
  both: 'Calls, faxes and messages',
};

/* Emergency numbers in the countries this platform sells into. Kept as a plain
   list rather than a pattern: an emergency number is a specific string, and a
   pattern loose enough to catch them all would catch ordinary numbers too. */
const EMERGENCY_NUMBERS = new Set([
  '000', '100', '101', '102', '108', '110', '111', '112', '113', '117', '118',
  '119', '911', '912', '933', '999',
]);

/* Below this, a number is a short code — a carrier service, an operator, or an
   internal extension. None of them can be blocked at the carrier. */
const SHORT_CODE_MAX_DIGITS = 6;

/**
 * The digits of a number, with everything else removed.
 *
 * Contacts arrive as `+44 20 7946 0000`, `(020) 7946 0000` and `442079460000`
 * from three different places, and all three are the same caller.
 */
export const numberDigits = (raw: unknown): string => String(raw ?? '').replace(/\D/g, '');

/**
 * The key two numbers are compared on.
 *
 * The last nine digits, because the same number is stored with a country code
 * in one record and without it in another — comparing the full string would
 * treat `+442079460000` and `02079460000` as two different callers. Nine is
 * short enough to survive a missing country code and long enough that two
 * unrelated numbers do not collide.
 */
export const matchKey = (raw: unknown): string => {
  const digits = numberDigits(raw);
  return digits.length > 9 ? digits.slice(-9) : digits;
};

/** Whether two numbers belong to the same caller, however each was written. */
export const isSameNumber = (a: unknown, b: unknown): boolean => {
  const left = matchKey(a);
  const right = matchKey(b);
  return Boolean(left) && left === right;
};

export const isEmergencyNumber = (raw: unknown): boolean =>
  EMERGENCY_NUMBERS.has(numberDigits(raw));

export const isShortCode = (raw: unknown): boolean => {
  const digits = numberDigits(raw);
  return digits.length > 0 && digits.length <= SHORT_CODE_MAX_DIGITS;
};

/* The shape a contact comes back in from the contact book. Only the parts
   blocking needs — the record itself carries far more. */
export interface BlockableContact {
  _id?: string;
  name?: { first?: string; last?: string };
  contact?: { phone?: string; email?: string };
  is_blocked?: boolean;
  is_dnc?: boolean;
  is_vip?: boolean;
}

export const contactName = (contact: BlockableContact | undefined): string =>
  `${contact?.name?.first || ''} ${contact?.name?.last || ''}`.trim();

/** Every contact saved against a number. The same number can be saved twice. */
export const contactsForNumber = (
  contacts: BlockableContact[],
  number: unknown,
): BlockableContact[] => {
  const key = matchKey(number);
  if (!key) return [];
  return contacts.filter((contact) => matchKey(contact?.contact?.phone) === key);
};

export const blockedContacts = (contacts: BlockableContact[]): BlockableContact[] =>
  contacts.filter((contact) => Boolean(contact?.is_blocked));

export interface BlockProblem {
  /* A blocking problem stops the action; a warning lets it through but must be
     shown, because the person would otherwise be surprised by the result. */
  blocking: boolean;
  message: string;
}

export interface BlockPlan {
  problems: BlockProblem[];
  /** The contacts that would be tagged. Empty when the number is not saved. */
  targets: BlockableContact[];
  /** True when the number has to be saved as a contact before it can be blocked. */
  needsContact: boolean;
  /** The parts of the choice the platform has nowhere to keep. */
  notStored: string[];
}

/** Whether a plan can go ahead. Warnings do not stop it; problems do. */
export const canBlock = (plan: BlockPlan): boolean =>
  !plan.needsContact && !plan.problems.some((problem) => problem.blocking);

/**
 * What blocking this number would actually do.
 *
 * Everything a screen needs to decide what to show before anybody presses the
 * button: whether it is allowed, what it will touch, and what will be lost.
 */
export const planBlock = (
  choice: BlockChoice,
  contacts: BlockableContact[],
  /** The numbers belonging to this account, so nobody blocks themselves. */
  ownNumbers: string[] = [],
): BlockPlan => {
  const problems: BlockProblem[] = [];
  const digits = numberDigits(choice.number);

  if (!digits) {
    problems.push({ blocking: true, message: 'Enter a number to block.' });
  } else if (isEmergencyNumber(choice.number)) {
    problems.push({
      blocking: true,
      message: 'Emergency numbers cannot be blocked.',
    });
  } else if (isShortCode(choice.number)) {
    problems.push({
      blocking: true,
      message: 'Short codes and service numbers cannot be blocked.',
    });
  } else if (ownNumbers.some((own) => isSameNumber(own, choice.number))) {
    problems.push({
      blocking: true,
      message: 'This is one of your own numbers.',
    });
  }

  const targets = digits ? contactsForNumber(contacts, choice.number) : [];
  const needsContact = problems.every((problem) => !problem.blocking) && targets.length === 0;

  if (needsContact) {
    problems.push({
      blocking: true,
      message: 'Save this number as a contact first — a block is recorded against a contact.',
    });
  }

  if (targets.length > 1) {
    problems.push({
      blocking: false,
      message: `${targets.length} contacts share this number, and all of them will be marked as blocked.`,
    });
  }

  if (targets.some((contact) => contact?.is_vip)) {
    problems.push({
      blocking: false,
      message: 'This contact is marked VIP. Blocking replaces that.',
    });
  }

  return {
    problems,
    targets,
    needsContact,
    notStored: unstoredParts(choice),
  };
};

/**
 * The parts of a block the contact book has no field for.
 *
 * A contact holds one tag and nothing else, so anything beyond "this number is
 * blocked" is lost the moment it is saved. Listing it here is what lets a
 * screen say so on its face instead of pretending otherwise.
 */
export const unstoredParts = (choice: BlockChoice): string[] => {
  const lost: string[] = [];
  if (choice.scope !== 'both') lost.push(SCOPE_LABELS[choice.scope]);
  if (choice.treatment !== DEFAULT_BLOCK_CHOICE.treatment)
    lost.push(TREATMENT_LABELS[choice.treatment]);
  if (choice.line !== 'personal') lost.push('Shared line only');
  return lost;
};

/**
 * The request body for a block or an unblock.
 *
 * `/api/contact/tag` takes a list of contact ids and one of four tag words, and
 * that is the whole of what can be sent. Unblocking goes back to Standard —
 * there is no "remove tag", so returning to the plain state is the only way.
 */
export const tagRequest = (
  contacts: BlockableContact[],
  tag: 'BLOCK' | 'STANDARD',
): { contact_uuid: string[]; tag: 'BLOCK' | 'STANDARD' } => ({
  contact_uuid: contacts.map((contact) => String(contact?._id || '')).filter(Boolean),
  tag,
});

/**
 * One sentence describing what a person just chose.
 *
 * Used above the confirm button, where a list of separate fields would make
 * somebody reassemble the sentence in their head.
 */
export const describeChoice = (choice: BlockChoice): string => {
  const what = SCOPE_LABELS[choice.scope].toLowerCase();
  const where = choice.line === 'shared' ? 'this shared line' : 'your line';
  const outcome = TREATMENT_DESCRIPTIONS[choice.treatment];
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} from this number to ${where} will be blocked. ${outcome}`;
};
