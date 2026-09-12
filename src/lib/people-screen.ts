/* Pure helpers for the single People screen: which tab a person belongs to,
 * how "last signed in" reads and filters, and the pending-invite map. Kept
 * out of the component so they can be tested with node:test.
 *
 * "Last signed in" is users.last_login_at, stamped by the gateway at most
 * once every ten minutes while a person is active (People module, stage 1).
 * Before that stamp existed the column was null for everyone, so a null
 * still reads "Never" rather than being hidden. */

export type PersonTab = 'active' | 'pending' | 'removed' | 'reserved';

export type InviteInfo = { expired: boolean; expiresAt: Date | null; expiresText: string };

const DAY_MS = 24 * 60 * 60 * 1000;
/* Fixed short months: the locale API writes "Sept" on newer runtimes and "Sep" on older ones. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** A person with an open or expired invite sits on the Pending tab; anyone
    else who is not removed sits on Active (suspended people included, with
    their status chip, so they are not lost). */
export const personTab = (
  row: { uuid: string; state: string | null },
  invites: Map<string, InviteInfo>,
): Exclude<PersonTab, 'reserved' | 'removed'> => {
  if (row.state === 'PENDING' || invites.has(row.uuid)) return 'pending';
  return 'active';
};

/** Short, human text for a timestamp: "Today 09:14", "Yesterday", "3 Sep", "3 Sep 2025". */
export const lastSeenText = (value: unknown, now: Date = new Date()): string => {
  const d = toDate(value);
  if (!d) return 'Never';
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay(d, now)) return `Today ${hhmm}`;
  if (sameDay(d, new Date(now.getTime() - DAY_MS))) return `Yesterday ${hhmm}`;
  const month = MONTHS[d.getMonth()];
  return d.getFullYear() === now.getFullYear() ? `${d.getDate()} ${month}` : `${d.getDate()} ${month} ${d.getFullYear()}`;
};

export type LastSeenFilter = 'any' | 'today' | '7d' | '30d' | 'over30' | 'never';

export const LAST_SEEN_FILTERS: Array<{ key: LastSeenFilter; label: string }> = [
  { key: 'any', label: 'Any' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'over30', label: 'More than 30 days ago' },
  { key: 'never', label: 'Never' },
];

export const matchesLastSeen = (value: unknown, filter: LastSeenFilter, now: Date = new Date()): boolean => {
  if (filter === 'any') return true;
  const d = toDate(value);
  if (filter === 'never') return !d;
  if (!d) return false;
  const age = now.getTime() - d.getTime();
  if (filter === 'today') return age < DAY_MS && d.getDate() === now.getDate();
  if (filter === '7d') return age <= 7 * DAY_MS;
  if (filter === '30d') return age <= 30 * DAY_MS;
  return age > 30 * DAY_MS;
};

/** The gateway's pending list, keyed by person. Accepts either an `expired`
    flag or an `expires_at` timestamp (both are sent), and never throws on a
    missing or odd row. */
export const pendingInviteMap = (rows: unknown, now: Date = new Date()): Map<string, InviteInfo> => {
  const map = new Map<string, InviteInfo>();
  if (!Array.isArray(rows)) return map;
  for (const raw of rows) {
    const row: any = raw || {};
    const uuid = String(row.user_uuid || row.uuid || '').trim();
    if (!uuid) continue;
    const expiresAt = toDate(row.expires_at ?? row.expiresAt);
    const expired = typeof row.expired === 'boolean' ? row.expired : expiresAt ? expiresAt.getTime() <= now.getTime() : false;
    map.set(uuid, { expired, expiresAt, expiresText: expiresAt ? lastSeenText(expiresAt, now) : '' });
  }
  return map;
};
