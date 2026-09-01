/**
 * What a call queue is called.
 *
 * Every queue in this product is an inbound line: outbound work is a campaign,
 * a different record with `type: 'CAMPAIGN'`. The type is already stored, but a
 * type nobody can see does not help the person reading a performance report at
 * the end of the month - there they see a name, and "Sales Team" does not say
 * whether it is the queue customers ring or the list agents dial out from.
 *
 * So the word goes in the name itself rather than being left to a badge on one
 * screen. The name travels: into reports, transfer lists, the switch's own
 * logs. A badge does not.
 *
 * The prefix is not typed by the admin. They type "Sales Team", the screen
 * shows them what it will be called, and this module joins the two. That is the
 * only way the convention actually holds - one people have to remember to type
 * is one half the records will miss.
 */

/** The word every queue name carries, and the separator, kept together. */
export const INBOUND_PREFIX = 'Inbound';
export const PREFIX_SEPARATOR = ' - ';
export const FULL_PREFIX = `${INBOUND_PREFIX}${PREFIX_SEPARATOR}`;

/* The ceiling the name field has always had (`requiredString` defaults to 50),
   and the floor. Both are measured against the STORED name, because that is
   what has to fit wherever the name is kept. */
export const QUEUE_NAME_MAX_LENGTH = 50;
export const TYPED_NAME_MIN_LENGTH = 2;

/* Matches the prefix however it was spaced or capitalised, but only when a real
   name follows the dash. Anchored on the dash so a team genuinely called
   "Inbound Sales" is not mistaken for an already-prefixed name. */
const PREFIX_PATTERN = new RegExp(`^${INBOUND_PREFIX}\\s*-\\s*`, 'i');

/* eslint-disable-next-line no-control-regex */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/**
 * A name as it will be stored: whitespace collapsed, control characters gone.
 *
 * A name pasted from a spreadsheet arrives with a newline in it, and a newline
 * breaks the cell it is rendered into and the log line it is written to.
 */
export const tidyName = (raw: unknown): string =>
  String(raw ?? '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * True when this name already carries the prefix.
 *
 * Deliberately case-insensitive and tolerant of the spacing around the dash.
 * An admin who typed "inbound- Sales" by hand meant the same thing, and
 * treating it as different would give them "Inbound - inbound- Sales".
 */
export const hasInboundPrefix = (raw: unknown): boolean => PREFIX_PATTERN.test(tidyName(raw));

/**
 * The part the admin actually typed, with any prefix taken off the front.
 *
 * Used to fill the input when an existing queue is opened, so they edit "Sales
 * Team" rather than being shown a prefix they cannot safely delete.
 */
export const stripInboundPrefix = (raw: unknown): string =>
  tidyName(tidyName(raw).replace(PREFIX_PATTERN, ''));

/**
 * The stored name: what the admin typed, with the prefix in front exactly once.
 *
 * Idempotent by construction - the prefix is stripped before it is added, so
 * saving an already-prefixed queue a second time cannot produce
 * "Inbound - Inbound - Sales". That case is not hypothetical: it is what an
 * edit-then-save does every single time.
 *
 * An empty name gets no prefix at all. "Inbound - " on its own is not a name,
 * and returning it would let a queue be saved that looks named and is not.
 */
export const buildQueueName = (raw: unknown): string => {
  const typed = stripInboundPrefix(raw);
  if (!typed) return '';
  return `${FULL_PREFIX}${typed}`;
};

/**
 * Why a name cannot be saved, for the message under the input.
 *
 * The length is measured on the *stored* name, prefix included, because that is
 * what has to fit. Telling somebody their 58-character name is fine and then
 * storing 68 characters is how a name gets silently cut short in a report.
 */
export const checkQueueName = (raw: unknown): { ok: boolean; reason?: string } => {
  const typed = stripInboundPrefix(raw);
  if (!typed) {
    return { ok: false, reason: 'Give this queue a name, so it can be told apart in reports.' };
  }

  if (typed.length < TYPED_NAME_MIN_LENGTH) {
    return {
      ok: false,
      reason: `Use at least ${TYPED_NAME_MIN_LENGTH} characters, so the name means something in a report.`,
    };
  }

  if (buildQueueName(raw).length > QUEUE_NAME_MAX_LENGTH) {
    const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
    return {
      ok: false,
      reason: `That is too long. "${FULL_PREFIX}" is added in front, which leaves ${room} characters.`,
    };
  }

  return { ok: true };
};
