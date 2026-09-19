/* One clock for the whole platform.
 *
 * A time on a screen is only useful if the reader knows what time it is NOW,
 * in the SAME zone. "19:41" on a campaign report told nobody whether the
 * call was two minutes or two hours ago, and the live board used the
 * browser's zone while the stored report used the campaign's. Every time
 * the platform shows now goes through here, in the zone the header clock
 * shows (hooks/use-platform-clock.ts), and anything that can be stale says
 * how long ago it was read.
 *
 * Pure: no React, no network. The zone choice itself lives in
 * lib/company-time-zone.ts. */

import { isValidTimeZone } from '@/lib/company-time-zone';

type Stamp = number | string | Date | null | undefined;

const safeZone = (timeZone: string) => (isValidTimeZone(timeZone) ? timeZone : 'UTC');

/* A number, a string or a Date in; a millisecond epoch out, or NaN when the
   value is not a time at all (an empty string, a bad ISO, null). */
export const toMillis = (at: Stamp): number => {
  if (at === null || at === undefined || at === '') return NaN;
  if (at instanceof Date) return at.getTime();
  if (typeof at === 'number') return at;
  const trimmed = String(at).trim();
  /* A bare number in a string is an epoch, in seconds or milliseconds. */
  if (/^\d{9,}$/.test(trimmed)) {
    const n = Number(trimmed);
    return n < 1e12 ? n * 1000 : n;
  }
  return new Date(trimmed).getTime();
};

const parts = (at: number, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), hourCycle: 'h23', ...options })
      .formatToParts(new Date(at))
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

/* "IST", "EDT", "GMT+5:30" — the short name of a zone at a moment. */
export const zoneShort = (timeZone: string, at: number = Date.now()): string => {
  try {
    return parts(at, timeZone, { timeZoneName: 'short' }).timeZoneName || timeZone;
  } catch {
    return timeZone;
  }
};

/* "19:41:07" (or "19:41"). */
export const clockText = (at: Stamp, timeZone: string, withSeconds = true): string => {
  const ms = toMillis(at);
  if (!Number.isFinite(ms)) return '';
  const p = parts(ms, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
  return withSeconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
};

/* "12 Sep 19:41" — or "12 Sep 2026 19:41:07" with the year and seconds. */
export const dayTimeText = (
  at: Stamp,
  timeZone: string,
  options: { withSeconds?: boolean; withYear?: boolean } = {},
): string => {
  const ms = toMillis(at);
  if (!Number.isFinite(ms)) return '';
  const p = parts(ms, timeZone, {
    day: '2-digit',
    month: 'short',
    ...(options.withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(options.withSeconds ? { second: '2-digit' } : {}),
  });
  const day = `${p.day} ${p.month}${options.withYear ? ` ${p.year}` : ''}`;
  const time = options.withSeconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
  return `${day} ${time}`;
};

/* "Saturday 12 September 2026" — the date line under the header clock. */
export const longDateText = (at: Stamp, timeZone: string): string => {
  const ms = toMillis(at);
  if (!Number.isFinite(ms)) return '';
  const p = parts(ms, timeZone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
};

/* How long ago, in words a person reads at a glance: "just now", "42s ago",
   "3 min ago", "2 h ago", "5 days ago". A moment in the future (clocks
   never agree to the second) is "just now". */
export const agoWords = (at: Stamp, now: number = Date.now()): string => {
  const ms = toMillis(at);
  if (!Number.isFinite(ms)) return '';
  const seconds = Math.floor((now - ms) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/* "19:41 · 3 min ago" — a row's time with its distance from now. */
export const timeAgoText = (at: Stamp, now: number, timeZone: string): string => {
  const ms = toMillis(at);
  if (!Number.isFinite(ms)) return '';
  return `${dayTimeText(ms, timeZone)} · ${agoWords(ms, now)}`;
};

/* "Updated 19:41:07 · 12s ago" — the line every report panel carries so a
   number is never read without knowing how old it is. Nothing read yet:
   "not read yet". Read within the last few seconds: "Updated · just now" —
   its clock time would be the current time, which the header clock beside
   it already shows, so saying it twice tells nobody anything. */
export const asOfText = (
  readAt: Stamp,
  now: number,
  timeZone: string,
  word = 'Updated',
): string => {
  const ms = toMillis(readAt);
  if (!Number.isFinite(ms) || ms <= 0) return 'not read yet';
  const ago = agoWords(ms, now);
  if (ago === 'just now') return `${word} · just now`;
  return `${word} ${clockText(ms, timeZone)} · ${ago}`;
};
