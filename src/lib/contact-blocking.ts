/* Blocking a number, and what the platform does about it.
 *
 * Blocking sounds like one decision and is really four:
 *
 *   which caller        a number, every number starting with a prefix, or
 *                       every caller who withholds their number
 *   what to stop        calls (and faxes, same line), texts, or both
 *   what the caller
 *   gets instead        the out-of-service tones, voicemail, or voicemail
 *                       filed as spam
 *   whose line          just yours, or every number the company owns
 *
 * Every one of those is stored, on its own record in the company's block
 * list, and read on every incoming call by the switch and on every incoming
 * text by the messaging gateway. The older way - tagging a saved contact as
 * Blocked - still works and is shown in the same list, so nothing anybody
 * blocked before is lost.
 *
 * Two rules come straight from how phone systems have always behaved:
 *
 *   emergency and short numbers cannot be blocked   blocking 999 or a short
 *                                                   code would be unsafe and,
 *                                                   on most carriers, ignored
 *   a number is matched on its digits               the same caller is stored
 *                                                   as +44 20 7946 0000 in one
 *                                                   place and 442079460000 in
 *                                                   another; comparing the two
 *                                                   as text finds nothing
 */

export type BlockKind = 'number' | 'prefix' | 'anonymous';
export type BlockScope = 'calls' | 'messages' | 'both';
export type BlockTreatment = 'reject' | 'voicemail' | 'spam';
/* company: every number the company owns. personal: the numbers that ring
   you. shared: chosen lines - a department's number, a queue's number - the
   ones a supervisor or group admin runs. */
export type BlockLine = 'company' | 'personal' | 'shared';

/** One number the signed-in person may block a caller on. */
export interface ReachLine {
  number: string;
  label?: string;
  route?: string;
}

/** What the server says this person may block for. */
export interface BlockReach {
  role?: string;
  level: 'company' | 'lines' | 'own';
  lines: ReachLine[];
  message?: string;
}

/** One record on the block list, as the server returns it. */
export interface BlockedEntry {
  _id: string;
  number: string;
  digits: string;
  tail?: string;
  kind: BlockKind;
  scope: BlockScope;
  treatment: BlockTreatment;
  line: BlockLine;
  user_uuid?: string;
  dids?: string[];
  label?: string;
  reason?: string;
  note?: string;
  source?: string;
  created_by?: { uuid?: string; name?: string };
  hits?: number;
  last_hit_at?: string | null;
  createdAt?: string;
}

export interface BlockChoice {
  /** What was typed: one number, several separated by commas or new lines. */
  numbers: string;
  kind: BlockKind;
  scope: BlockScope;
  treatment: BlockTreatment;
  line: BlockLine;
  /** shared only: the lines the block protects. */
  dids: string[];
  label: string;
  reason: string;
  note: string;
}

export const DEFAULT_BLOCK_CHOICE: Omit<BlockChoice, 'numbers'> = {
  kind: 'number',
  scope: 'both',
  treatment: 'reject',
  line: 'personal',
  dids: [],
  label: '',
  reason: '',
  note: '',
};

/* Written for the person choosing, not for the log. Each one says what the
   caller experiences, because that is the part people actually care about. */
export const TREATMENT_LABELS: Record<BlockTreatment, string> = {
  reject: 'Block everything',
  voicemail: 'Send to voicemail',
  spam: 'Mark as spam',
};

export const TREATMENT_DESCRIPTIONS: Record<BlockTreatment, string> = {
  reject: 'The caller hears the out-of-service tones and the call ends. Nothing reaches you.',
  voicemail: 'Calls go straight to voicemail without ringing. You still see them in your call history.',
  spam: 'Calls go straight to voicemail, and the record is marked as spam so you can tell it apart.',
};

export const SCOPE_LABELS: Record<BlockScope, string> = {
  both: 'Calls, faxes and texts',
  calls: 'Calls and faxes',
  messages: 'Texts',
};

export const KIND_LABELS: Record<BlockKind, string> = {
  number: 'A number',
  prefix: 'Every number starting with…',
  anonymous: 'Callers who withhold their number',
};

export const LINE_LABELS: Record<BlockLine, string> = {
  personal: 'My numbers',
  shared: 'Lines I run',
  company: 'Every number the company owns',
};

/** The line choices this reach allows, in the order the screen shows them. */
export const lineChoices = (reach: BlockReach | null | undefined): BlockLine[] => {
  const out: BlockLine[] = ['personal'];
  if (reach?.lines?.length) out.push('shared');
  if (reach?.level === 'company') out.push('company');
  return out;
};

/** The identity of a set of lines: sorted digits, joined. */
export const lineKey = (dids: unknown): string =>
  (Array.isArray(dids) ? dids : []).map(numberDigits).filter(Boolean).sort().join(',');

/* Why a number was blocked. Free text is allowed too; these are the ones
   people reach for, and they make the list searchable. */
export const BLOCK_REASONS = [
  'Spam or robocall',
  'Telemarketing',
  'Fraud attempt',
  'Harassment or abuse',
  'Wrong number',
  'Other',
];

/* Emergency numbers in the countries this platform sells into. Kept as a plain
   list rather than a pattern: an emergency number is a specific string, and a
   pattern loose enough to catch them all would catch ordinary numbers too. */
const EMERGENCY_NUMBERS = new Set([
  '000', '100', '101', '102', '108', '110', '111', '112', '113', '117', '118',
  '119', '911', '912', '933', '999',
]);

/* Below this, a number is a short code - a carrier service, an operator, or an
   internal extension. None of them can be blocked at the carrier. */
const SHORT_CODE_MAX_DIGITS = 6;
const PREFIX_MAX_DIGITS = 8;

/** The digits of a number, with everything else removed. */
export const numberDigits = (raw: unknown): string => String(raw ?? '').replace(/\D/g, '');

/**
 * The key two numbers are compared on: the last nine digits, because the same
 * number is stored with a country code in one record and without it in
 * another. Nine survives a missing country code and is long enough that two
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

/** The separate numbers in a pasted list: commas, semicolons and new lines. */
export const splitNumbers = (text: unknown): string[] =>
  String(text ?? '')
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

/* The shape a contact comes back in from the contact book. Only the parts
   blocking needs - the record itself carries far more. */
export interface BlockableContact {
  _id?: string;
  name?: { first?: string; last?: string };
  contact?: { phone?: string; email?: string; phones?: { number?: string }[] };
  is_blocked?: boolean;
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
  return contacts.filter(
    (contact) =>
      matchKey(contact?.contact?.phone) === key ||
      (contact?.contact?.phones || []).some((extra) => matchKey(extra?.number) === key),
  );
};

export interface BlockProblem {
  /* A blocking problem stops the action; a warning lets it through but must be
     shown, because the person would otherwise be surprised by the result. */
  blocking: boolean;
  message: string;
}

export interface BlockPlan {
  problems: BlockProblem[];
  /** The numbers (or prefixes) that would be sent, as typed. */
  numbers: string[];
  /** Typed numbers already on the list for the same line. */
  already: string[];
}

/** Whether a plan can go ahead. Warnings do not stop it; problems do. */
export const canBlock = (plan: BlockPlan): boolean =>
  !plan.problems.some((problem) => problem.blocking);

/** Whether an entry on the list already covers this number for this line. */
export const isAlreadyBlocked = (
  entries: BlockedEntry[],
  number: unknown,
  kind: BlockKind,
  line: BlockLine,
  dids: string[] = [],
): boolean => {
  const digits = numberDigits(number);
  return entries.some((entry) => {
    if (entry.line !== line || entry.kind !== kind) return false;
    if (line === 'shared' && lineKey(entry.dids) !== lineKey(dids)) return false;
    if (kind === 'anonymous') return true;
    if (kind === 'prefix') return numberDigits(entry.number) === digits;
    return isSameNumber(entry.number, number);
  });
};

/**
 * What blocking this would actually do - everything a screen needs before
 * anybody presses the button: whether it is allowed, and what will be sent.
 */
export const planBlock = (
  choice: BlockChoice,
  entries: BlockedEntry[],
  /** The numbers belonging to this account, so nobody blocks themselves. */
  ownNumbers: string[] = [],
  /** What the server says this person may block for; unknown = let the server decide. */
  reach: BlockReach | null = null,
): BlockPlan => {
  const problems: BlockProblem[] = [];
  const numbers: string[] = [];
  const already: string[] = [];

  if (choice.line === 'company' && reach && reach.level !== 'company') {
    problems.push({
      blocking: true,
      message: 'Only the account owner can block a number for the whole company.',
    });
  }
  if (choice.line === 'shared') {
    const chosen = (choice.dids || []).map(numberDigits).filter(Boolean);
    if (!chosen.length) {
      problems.push({ blocking: true, message: 'Choose at least one line to block this number on.' });
    } else if (reach) {
      const allowed = new Set(reach.lines.map((line) => numberDigits(line.number)));
      const outside = chosen.filter((d) => !allowed.has(d));
      if (outside.length) {
        problems.push({ blocking: true, message: `You cannot block for +${outside.join(', +')}.` });
      }
    }
  }

  if (choice.kind === 'anonymous') {
    if (isAlreadyBlocked(entries, '', 'anonymous', choice.line, choice.dids)) {
      problems.push({ blocking: true, message: 'Anonymous callers are already blocked here.' });
    }
    return { problems, numbers, already };
  }

  const typed = splitNumbers(choice.numbers);
  if (!typed.length) {
    problems.push({ blocking: true, message: 'Enter a number to block.' });
    return { problems, numbers, already };
  }

  for (const raw of typed) {
    const digits = numberDigits(raw);
    if (!digits) {
      problems.push({ blocking: true, message: `"${raw}" is not a number.` });
    } else if (isEmergencyNumber(raw)) {
      problems.push({ blocking: true, message: `${raw}: emergency numbers cannot be blocked.` });
    } else if (choice.kind === 'prefix') {
      if (digits.length > PREFIX_MAX_DIGITS) {
        problems.push({
          blocking: true,
          message: `${raw}: a prefix is the country code and area code, at most ${PREFIX_MAX_DIGITS} digits.`,
        });
      } else if (isAlreadyBlocked(entries, raw, 'prefix', choice.line, choice.dids)) {
        already.push(raw);
      } else {
        numbers.push(raw);
      }
    } else if (isShortCode(raw)) {
      problems.push({
        blocking: true,
        message: `${raw}: short codes and service numbers cannot be blocked.`,
      });
    } else if (ownNumbers.some((own) => isSameNumber(own, raw))) {
      problems.push({ blocking: true, message: `${raw} is one of your own numbers.` });
    } else if (isAlreadyBlocked(entries, raw, 'number', choice.line, choice.dids)) {
      already.push(raw);
    } else {
      numbers.push(raw);
    }
  }

  if (!numbers.length && already.length) {
    problems.push({
      blocking: true,
      message: already.length === 1 ? `${already[0]} is already blocked.` : 'Those numbers are already blocked.',
    });
  } else if (already.length) {
    problems.push({
      blocking: false,
      message: `Already blocked, so skipped: ${already.join(', ')}.`,
    });
  }

  if (choice.kind === 'prefix' && numbers.length) {
    problems.push({
      blocking: false,
      message: 'A prefix stops every caller whose number starts with it - a whole area, or a whole country.',
    });
  }

  return { problems, numbers, already };
};

/** The request body for the add call. */
export const addRequest = (choice: BlockChoice, plan: BlockPlan, country?: string) => ({
  numbers: choice.kind === 'anonymous' ? [] : plan.numbers,
  kind: choice.kind,
  scope: choice.scope,
  treatment: choice.treatment,
  line: choice.line,
  ...(choice.line === 'shared' ? { dids: choice.dids } : {}),
  label: choice.label.trim(),
  reason: choice.reason.trim(),
  note: choice.note.trim(),
  source: 'directory',
  ...(country ? { country } : {}),
});

/**
 * One sentence describing what a person just chose, used above the confirm
 * button, where a list of separate fields would make somebody reassemble the
 * sentence in their head.
 */
export const describeChoice = (choice: BlockChoice): string => {
  const what = SCOPE_LABELS[choice.scope].toLowerCase();
  const who =
    choice.kind === 'anonymous'
      ? 'callers who withhold their number'
      : choice.kind === 'prefix'
        ? 'every number starting with this prefix'
        : splitNumbers(choice.numbers).length > 1
          ? 'these numbers'
          : 'this number';
  const where =
    choice.line === 'company'
      ? 'every number the company owns'
      : choice.line === 'shared'
        ? choice.dids.length === 1
          ? prettyNumber(choice.dids[0])
          : `${choice.dids.length} lines`
        : 'your numbers';
  const outcome =
    choice.scope === 'messages'
      ? 'Their texts are not delivered.'
      : TREATMENT_DESCRIPTIONS[choice.treatment] +
        (choice.scope === 'both' ? ' Their texts are not delivered.' : '');
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} from ${who} to ${where} will be blocked. ${outcome}`;
};

/* --- the list ------------------------------------------------------------ */

/** A row on the Blocked screen: a list entry, or a contact tagged Blocked. */
export interface BlockedRow {
  key: string;
  id?: string;
  contactId?: string;
  title: string;
  number: string;
  kind: BlockKind | 'contact';
  scope: BlockScope;
  treatment: BlockTreatment;
  line: BlockLine;
  /** shared: the lines it protects. */
  dids: string[];
  reason: string;
  note: string;
  blockedBy: string;
  blockedAt: string;
  hits: number;
  lastHit: string;
  /** Whether the signed-in person may remove it. */
  mine: boolean;
}

/** A number the way a phone shows it: +1 415 555 1212. */
export const prettyNumber = (raw: unknown): string => {
  const text = String(raw ?? '').trim();
  const digits = numberDigits(text);
  if (!digits) return text;
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && !text.startsWith('+')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return `+${digits}`;
};

export const entryTitle = (entry: Pick<BlockedEntry, 'kind' | 'number' | 'label'>): string => {
  if (entry.label) return entry.label;
  if (entry.kind === 'anonymous') return 'Anonymous callers';
  if (entry.kind === 'prefix') return `Every number starting ${prettyNumber(entry.number)}`;
  return prettyNumber(entry.number);
};

export const rowsFromEntries = (
  entries: BlockedEntry[],
  currentUserUuid: string,
  isAdmin: boolean,
): BlockedRow[] =>
  entries.map((entry) => ({
    key: `entry:${entry._id}`,
    id: entry._id,
    title: entryTitle(entry),
    number: entry.kind === 'anonymous' ? '' : entry.number,
    kind: entry.kind,
    scope: entry.scope,
    treatment: entry.treatment,
    line: entry.line,
    dids: entry.dids || [],
    reason: entry.reason || '',
    note: entry.note || '',
    blockedBy: entry.created_by?.name || '',
    blockedAt: entry.createdAt || '',
    hits: Number(entry.hits) || 0,
    lastHit: entry.last_hit_at || '',
    mine:
      isAdmin ||
      (entry.line === 'personal' && String(entry.user_uuid || '') === currentUserUuid) ||
      (entry.line === 'shared' && String(entry.created_by?.uuid || '') === currentUserUuid),
  }));

/** Contacts tagged Blocked, shown beside the list so nothing is hidden. */
export const rowsFromContacts = (contacts: BlockableContact[], isAdmin: boolean): BlockedRow[] =>
  contacts
    .filter((contact) => contact?.is_blocked)
    .map((contact) => ({
      key: `contact:${contact._id || contact.contact?.phone}`,
      contactId: contact._id,
      title: contactName(contact) || prettyNumber(contact.contact?.phone),
      number: contact.contact?.phone || '',
      kind: 'contact' as const,
      scope: 'calls' as const,
      treatment: 'reject' as const,
      line: 'company' as const,
      dids: [],
      reason: 'Contact tagged Blocked',
      note: '',
      blockedBy: '',
      blockedAt: '',
      hits: 0,
      lastHit: '',
      mine: isAdmin,
    }));

/** The rows matching a search box: title, number, reason, note, who. */
export const filterRows = (rows: BlockedRow[], search: string): BlockedRow[] => {
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  const digits = numberDigits(needle);
  return rows.filter(
    (row) =>
      [row.title, row.reason, row.note, row.blockedBy].some((value) =>
        String(value || '').toLowerCase().includes(needle),
      ) || (digits.length > 0 && numberDigits(row.number).includes(digits)),
  );
};

/** The list as a CSV file, one row per block. */
/** "Whole company", "My numbers", or the lines a shared block protects. */
export const appliesTo = (row: Pick<BlockedRow, 'line' | 'dids'>): string =>
  row.line === 'company'
    ? 'Whole company'
    : row.line === 'shared'
      ? row.dids.length === 1
        ? prettyNumber(row.dids[0])
        : `${row.dids.length} lines`
      : 'My numbers';

export const rowsToCsv = (rows: BlockedRow[]): string => {
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Number', 'Label', 'Type', 'Stops', 'Caller gets', 'Applies to', 'Reason', 'Note', 'Blocked by', 'Blocked on', 'Times stopped', 'Last stopped'];
  const lines = rows.map((row) =>
    [
      row.number,
      row.title === row.number || row.title === prettyNumber(row.number) ? '' : row.title,
      row.kind,
      SCOPE_LABELS[row.scope],
      TREATMENT_LABELS[row.treatment],
      row.line === 'shared' ? row.dids.map(prettyNumber).join(' ') : LINE_LABELS[row.line],
      row.reason,
      row.note,
      row.blockedBy,
      row.blockedAt,
      row.hits,
      row.lastHit,
    ]
      .map(cell)
      .join(','),
  );
  return [header.map(cell).join(','), ...lines].join('\n');
};
