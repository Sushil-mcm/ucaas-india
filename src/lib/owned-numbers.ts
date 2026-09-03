/* Registering numbers the operator already holds.
 *
 * This platform does not sell numbers. Every +91 range on it was issued to the
 * operator by a licensed Indian carrier and reaches the switch over the
 * operator's own SIP trunk, so "adding a number" is bookkeeping — telling the
 * platform about a number that already terminates here — not a purchase.
 *
 * The parsing is deliberately forgiving about shape and strict about the
 * result. Numbers arrive pasted out of a carrier's portal, a spreadsheet column
 * or an email, which means +91 98765 43210, 09876543210, 919876543210 and bare
 * ten digits all show up in the same paste, separated by commas, tabs, newlines
 * or nothing but whitespace. Refusing the whole paste because one line has a
 * space in it would send an admin back to clean up a hundred rows by hand.
 *
 * What it will not do is guess. A line that is not a valid Indian subscriber
 * number comes back in `invalid` with the text as typed, so the screen can show
 * which rows were rejected instead of silently registering ninety-eight of a
 * hundred numbers and leaving the admin to discover the gap later.
 */

import { isIndianNumber, toE164, toNationalDigits } from '@/lib/india';

export interface ParsedNumbers {
  /** Valid, de-duplicated, in E.164 — the shape the switch and the API want. */
  valid: string[];
  /** Entries that are not usable Indian numbers, as the admin typed them. */
  invalid: string[];
  /** Valid entries that appeared more than once in the paste. */
  duplicates: string[];
}

/* One number per line, per comma, per tab, or per run of whitespace. Semicolons
   too, because a spreadsheet export in a European locale uses them. */
const SEPARATORS = /[\s,;]+/;

export const parseOwnedNumbers = (input: string): ParsedNumbers => {
  const entries = String(input ?? '')
    .split(SEPARATORS)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  entries.forEach((entry) => {
    if (!isIndianNumber(entry)) {
      invalid.push(entry);
      return;
    }
    const e164 = toE164(entry);
    if (seen.has(e164)) {
      /* Recorded rather than dropped silently: pasting the same number twice is
         usually a copy mistake worth mentioning, not an error worth refusing. */
      if (!duplicates.includes(e164)) duplicates.push(e164);
      return;
    }
    seen.add(e164);
    valid.push(e164);
  });

  return { valid, invalid, duplicates };
};

/* Numbers the account already has. Registering one twice is not harmful, but it
   is a mistake the admin should see before it happens rather than a no-op they
   have to infer from an unchanged list. */
export const splitAlreadyRegistered = (
  parsed: string[],
  existing: Iterable<unknown>,
): { fresh: string[]; already: string[] } => {
  const held = new Set<string>();
  for (const number of existing) {
    const national = toNationalDigits(number);
    if (national) held.add(national);
  }

  const fresh: string[] = [];
  const already: string[] = [];
  parsed.forEach((e164) => {
    if (held.has(toNationalDigits(e164))) already.push(e164);
    else fresh.push(e164);
  });

  return { fresh, already };
};

/** The one-line summary under the box, so the admin sees the count before saving. */
export const describeParse = (parsed: ParsedNumbers, alreadyCount = 0): string => {
  const parts: string[] = [];
  const ready = parsed.valid.length - alreadyCount;
  parts.push(`${ready} number${ready === 1 ? '' : 's'} ready to add`);
  if (alreadyCount) parts.push(`${alreadyCount} already on the account`);
  if (parsed.duplicates.length) parts.push(`${parsed.duplicates.length} repeated in the list`);
  if (parsed.invalid.length) parts.push(`${parsed.invalid.length} not valid Indian numbers`);
  return parts.join(' · ');
};
