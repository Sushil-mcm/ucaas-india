/* The people list, as a spreadsheet.
 *
 * WHY THIS EXISTS
 *
 * Every established phone system lets an administrator take the staff list away
 * with them, because the questions it answers are not questions a screen is good
 * at: who has no number, who is in no group, which of the forty people we pay
 * for has never signed in, and does any of this match the HR system. Those get
 * answered by sorting a column, and there is no screen anywhere that beats a
 * spreadsheet at it.
 *
 * The platform has no export endpoint of any kind for people — the only export
 * it has is for contacts. So this builds the file in the browser out of the
 * roster the People page has already loaded. That is a real limit worth knowing:
 * what comes out is what that page fetched, so it is the current page of people
 * and not a server-side dump of a company with ten thousand staff. For the size
 * of company this product serves, that is the whole roster.
 *
 * TWO THINGS THAT LOOK LIKE FUSSINESS AND ARE NOT
 *
 *   Quoting. Names contain commas, job titles contain quotation marks, and an
 *   address pasted from somewhere contains a line break. Any one of them shifts
 *   every following column by one and nobody notices until the numbers are
 *   wrong. So every field is quoted and every quote inside one is doubled — the
 *   rule spreadsheets actually implement.
 *
 *   Values that start with =, +, - or @. A spreadsheet treats those as formulas,
 *   which is how a field of ordinary text becomes a broken cell, and in the
 *   nastier version how a value somebody typed into a name box runs when the
 *   file is opened. A single quote in front makes it text again, which is what
 *   the spreadsheet itself does when you type one.
 *
 * It is pure: no React, no network, no clock. Give it rows, get back a string.
 */

/** One person, reduced to the columns that go in the file. */
export interface RosterExportRow {
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  location: string;
  extension: string;
  /** Every number that reaches this person. Joined with a space in the file. */
  numbers: string[];
  /** The groups they belong to. */
  groups: string[];
  /** The day they were added, as YYYY-MM-DD. Empty when the platform did not say. */
  addedOn: string;
}

/**
 * The columns, in order, with the heading each one gets.
 *
 * The headings are the words the People page uses, not the platform's column
 * names. Somebody opening this file has just come from that screen and should
 * recognise what they are looking at.
 */
export const EXPORT_COLUMNS: { key: keyof RosterExportRow; header: string }[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'jobTitle', header: 'Job title' },
  { key: 'location', header: 'Location' },
  { key: 'extension', header: 'Extension' },
  { key: 'numbers', header: 'Numbers' },
  { key: 'groups', header: 'Groups' },
  { key: 'addedOn', header: 'Added on' },
];

/** A person as the platform's user list hands them back. */
export interface RosterPersonLike {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  role_data?: { name?: string };
  custom_role_data?: { name?: string };
  job_title?: string;
  site?: { name?: string };
  extension?: string | number;
  caller_id?: string;
  /** One number or several, depending on which endpoint answered. */
  assigned_did?: unknown;
  created_at?: string;
  createdAt?: string;
}

const text = (value: unknown): string => String(value ?? '').trim();

/**
 * A day, as YYYY-MM-DD.
 *
 * Deliberately not the reader's local format. A file that says 04/03 is
 * ambiguous the moment it crosses a border, and this one is meant to be sent to
 * somebody. Anything unparseable becomes an empty cell rather than the word
 * "Invalid Date", which reads as a fault in the data rather than a gap in it.
 */
export const exportDate = (value: unknown): string => {
  const raw = text(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

/** Every number attached to a person, with duplicates and blanks removed. */
export const numbersOf = (person: RosterPersonLike | null | undefined): string[] => {
  const found: string[] = [];
  const push = (value: unknown) => {
    const number = text(value);
    if (number && !found.includes(number)) found.push(number);
  };

  push(person?.caller_id);

  const assigned = person?.assigned_did;
  /* The user list returns a list here; some of the narrower endpoints return a
     single record. Handling only one shape silently drops every number on the
     other, which reads as "nobody has a number". */
  if (Array.isArray(assigned)) {
    assigned.forEach((entry: any) => push(entry?.did_number ?? entry?.number ?? entry));
  } else if (assigned && typeof assigned === 'object') {
    push((assigned as any)?.did_number ?? (assigned as any)?.number);
  } else {
    push(assigned);
  }

  return found;
};

/**
 * The role a person actually holds.
 *
 * A role the company made itself wins over the one that ships, which is the
 * order every other screen in this product reads them in. Reading them the
 * other way round would report the parent role and quietly disagree with the
 * People page it was exported from.
 */
export const roleOf = (person: RosterPersonLike | null | undefined): string =>
  text(person?.custom_role_data?.name) || text(person?.role_data?.name) || text(person?.role);

/** Turn one person from the platform's list into one row of the file. */
export const toExportRow = (
  person: RosterPersonLike | null | undefined,
  groups: readonly string[] = [],
): RosterExportRow => ({
  name: [text(person?.first_name), text(person?.last_name)].filter(Boolean).join(' '),
  email: text(person?.email),
  role: roleOf(person),
  jobTitle: text(person?.job_title),
  location: text(person?.site?.name),
  extension: text(person?.extension),
  numbers: numbersOf(person),
  groups: (Array.isArray(groups) ? groups : []).map(text).filter(Boolean),
  addedOn: exportDate(person?.created_at ?? person?.createdAt),
});

/**
 * One value, safe to drop into a spreadsheet. See the file header for why the
 * leading apostrophe is there.
 */
export const escapeCell = (value: unknown): string => {
  const raw = Array.isArray(value) ? value.map(text).filter(Boolean).join(' ') : text(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * The whole file.
 *
 * Rows are separated by CRLF because that is what the CSV rule says and what
 * the older spreadsheet programs still expect; the newer ones accept either, so
 * following the rule costs nothing and fixes the ones that do not.
 */
export const buildRosterCsv = (rows: readonly RosterExportRow[] | null | undefined): string => {
  const header = EXPORT_COLUMNS.map((column) => escapeCell(column.header)).join(',');
  const body = (Array.isArray(rows) ? rows : []).map((row) =>
    EXPORT_COLUMNS.map((column) => escapeCell(row?.[column.key])).join(','),
  );
  /* A file with a header and no rows is the right answer for a company with
     nobody in it: it opens, it has columns, and it says there is nobody. An
     empty file looks like the export failed. */
  return [header, ...body].join('\r\n');
};

/**
 * What the downloaded file is called.
 *
 * The date is in it because these get exported monthly and end up in the same
 * folder; without it the second one is "people (1).csv" and nobody can tell
 * which is which. Anything that is not a letter, a digit or a dash is dropped
 * from the company's name, because a slash or a colon in a filename is refused
 * outright by some systems and silently mangled by others.
 */
export const rosterFileName = (companyName: unknown, on: unknown): string => {
  const slug = text(companyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const day = exportDate(on) || 'export';
  return `${slug ? `${slug}-` : ''}people-${day}.csv`;
};

/**
 * What the file leaves out, said once so a screen can show it rather than each
 * screen inventing its own wording.
 *
 * Every one of these is a column an established system exports and this one
 * cannot, because the platform does not keep the underlying fact. Listing them
 * beats letting somebody notice the gap in a spreadsheet and assume the data
 * was lost.
 */
export const EXPORT_LIMITS: { id: string; label: string; why: string }[] = [
  {
    id: 'state',
    label: 'Whether somebody has signed in yet',
    why: 'Everybody added here is switched on straight away — there is no invitation to accept, so there is no waiting state to report. Every row in the file is an active person.',
  },
  {
    id: 'licence',
    label: 'Which licence each person uses',
    why: 'Licences are counted against the company rather than named on a person, so there is one kind and no per-person type to put in a column. The Billing screen is where seats are matched to people.',
  },
  {
    id: 'removed',
    label: 'People who have been removed',
    why: 'Removed people are hidden from the list this file is built from, so they cannot appear here. Nothing in the product lists them.',
  },
];

export default buildRosterCsv;
