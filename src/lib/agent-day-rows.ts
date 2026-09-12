/* The rows the agent-day screens put on the table.
 *
 * Reports › Agent reports › Day and Breaks, Performance › Reports › Agent
 * Status Summary and the campaign Preview tab all read the same server rows
 * (src/lib/agent-day.ts describes the figures). What each screen shows is
 * built here, pure, so it can be proven without a browser: which name a
 * person gets, how a time is written in the company's zone, which rows a
 * search keeps, and what the CSV of the table carries.
 *
 * Names. The server names a person from their queue rows (first and last
 * name), and falls back to the extension and then the uuid when the queue
 * rows have nothing. A person who has history but sits on no queue any more
 * arrives with the uuid as their name; the users directory the site already
 * loads (context/users-directory-context) is asked before the uuid is shown. */

import { clockText, pctText } from './agent-day';

export interface DirectoryUser {
  uuid?: string;
  user_uuid?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  extension?: string;
  name?: string;
}

const text = (value: unknown) => String(value ?? '').trim();

export const directoryName = (user: DirectoryUser | undefined | null): string => {
  if (!user) return '';
  const full = `${text(user.first_name)} ${text(user.last_name)}`.trim();
  return full || text(user.name) || text(user.username) || '';
};

/* The name a row shows. The server's name is used when it is a real name;
   when it is only the uuid or the extension (nothing better was on the queue
   rows) the directory is asked; the extension is the last honest fallback
   before the uuid. */
export const personName = (row: any, users: DirectoryUser[] = []): string => {
  const uuid = text(row?.user_uuid);
  const extension = text(row?.extension);
  const fromServer = text(row?.name);
  if (fromServer && fromServer !== uuid && fromServer !== extension) return fromServer;
  const match = uuid ? users.find((u) => text(u?.uuid) === uuid || text(u?.user_uuid) === uuid) : undefined;
  const fromDirectory = directoryName(match);
  if (fromDirectory) return fromDirectory;
  return extension || fromServer || uuid || '—';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* "08 Sep, 09:00" in the zone the report is in. Assembled from numeric
   parts rather than a locale's short month: ICU builds differ ("Sep" in one
   browser, "Sept" in another) and a report should read the same everywhere. */
export const localTime = (ms: number | null | undefined, timeZone: string): string => {
  if (!ms) return '—';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'numeric',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const month = MONTHS[Number(get('month')) - 1] || get('month');
    return `${get('day')} ${month}, ${get('hour').padStart(2, '0')}:${get('minute')}`;
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
};

export const breaksText = (breaks: any[] | undefined | null): string =>
  (breaks || []).map((b: any) => `${b.reason} ×${b.count} ${clockText(b.seconds)}`).join('; ') || '—';

export const setByText = (source: unknown): string =>
  source === 'supervisor' ? 'a manager' : source === 'system' ? 'the system' : 'the agent';

/* Rows whose person matches the search box. */
export const filterByName = (rows: any[], search: string, users: DirectoryUser[] = []): any[] => {
  const needle = text(search).toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => personName(row, users).toLowerCase().includes(needle));
};

export const DAY_HEAD = [
  'Agent',
  'Date',
  'Signed in',
  'On duty',
  'On calls ≈',
  'Wrap-up ≈',
  'Free on duty',
  'Time on breaks',
  'Breaks',
  'Missed too many',
  'Connected calls',
  'Occupancy',
  'Productive',
  'Adherence',
  'First start',
  'Last end',
] as const;

export const dayRows = (
  rows: any[],
  options: { timeZone: string; users?: DirectoryUser[] },
): (string | number)[][] =>
  rows.map((row: any) => [
    personName(row, options.users),
    text(row?.date) || '—',
    clockText(row?.signed_in_s),
    clockText(row?.on_duty_s),
    clockText(row?.on_call_s),
    clockText(row?.wrapup_s),
    clockText(row?.free_s),
    clockText(row?.break_s),
    breaksText(row?.breaks),
    clockText(row?.missed_s),
    Number(row?.connected_calls || 0),
    pctText(row?.occupancy_pct),
    pctText(row?.productive_pct),
    'Needs schedules',
    localTime(row?.first_start, options.timeZone),
    localTime(row?.last_end, options.timeZone),
  ]);

export const BREAK_HEAD = [
  'Agent',
  'Reason',
  'Category',
  'Started',
  'Ended',
  'Length',
  'Allowance',
  'Over allowance',
  'Set by',
] as const;

export const breakRows = (
  rows: any[],
  options: { timeZone: string; users?: DirectoryUser[]; categories?: Record<string, string> },
): (string | number)[][] =>
  rows.map((row: any) => [
    personName(row, options.users),
    text(row?.reason) || 'Break (no reason)',
    /* The activity code's category (Company › Activity codes); a break whose code was deleted shows a dash. */
    options.categories?.[text(row?.reason_id)] || '—',
    localTime(row?.started, options.timeZone),
    row?.ended ? localTime(row.ended, options.timeZone) : 'still on break',
    clockText(row?.seconds),
    row?.allowance_minutes ? `${row.allowance_minutes} min` : '—',
    row?.over_by_s ? clockText(row.over_by_s) : '—',
    setByText(row?.source),
  ]);

export const overAllowanceCount = (rows: any[]): number =>
  rows.filter((row: any) => Number(row?.over_by_s) > 0).length;

/* The sentence under a report whose server reply was cut at its row cap. */
export const truncationNote = (data: { truncated?: boolean; max_rows?: number } | undefined | null): string =>
  data?.truncated
    ? `Only the first ${Number(data.max_rows || 0).toLocaleString()} rows are shown. Pick fewer days or fewer people to see everything.`
    : '';

/* Performance › Reports › Agent Status Summary: the same day rows without
   the two time columns, and the ≈ on the cell rather than the heading (the
   catalog's headings are one word each). */
export const STATUS_SUMMARY_HEAD = [
  'Agent',
  'Date',
  'Signed in',
  'On duty',
  'On calls',
  'Wrap-up',
  'Free on duty',
  'Time on breaks',
  'Breaks',
  'Connected calls',
  'Occupancy',
  'Productive',
  'Adherence',
] as const;

export const statusSummaryRows = (rows: any[], users: DirectoryUser[] = []): (string | number)[][] =>
  rows.map((row: any) => [
    personName(row, users),
    text(row?.date) || '—',
    clockText(row?.signed_in_s),
    clockText(row?.on_duty_s),
    `${clockText(row?.on_call_s)} ≈`,
    `${clockText(row?.wrapup_s)} ≈`,
    clockText(row?.free_s),
    clockText(row?.break_s),
    breaksText(row?.breaks),
    Number(row?.connected_calls || 0),
    pctText(row?.occupancy_pct),
    pctText(row?.productive_pct),
    'Needs schedules',
  ]);

export const STATUS_SUMMARY_NOTE =
  'From the duty history (start shift, breaks, end shift). ≈ On calls counts campaign calls only and wrap-up is what the browser reported; both are estimates of the whole day. Occupancy = (on calls + wrap-up) ÷ (on calls + wrap-up + free on duty). Productive = (on calls + wrap-up) ÷ signed in. Adherence needs schedules, which do not exist yet.';
