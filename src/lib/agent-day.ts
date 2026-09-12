/* An agent's day, read from the duty history rows.
 *
 * The queue picker and the duty routes write one `agent_status_history` row
 * per change of status: Available (on duty), On Break with a reason, Logged
 * Out (off duty). Read forward, consecutive rows are durations, and a day is
 * those durations clipped to midnight-to-midnight in the company's time zone.
 *
 * Everything in this file is pure: rows in, numbers out. The same code runs
 * in campaign-api (src/services/agentDay.ts) and here, so a test written once
 * proves both. Keep the two copies identical.
 *
 * What is exact and what is not:
 *  - time in each state (signed in, on duty, on break by reason, off duty)
 *    is exact: it comes straight from the history rows;
 *  - time on calls is the campaign call log's billsec, so it is exact for
 *    campaign calls and does not include queue or direct calls;
 *  - wrap-up time is what the browser reported at the end of each wrap-up
 *    (a preview event); with no events it is zero, not a guess;
 *  - adherence needs a schedule to compare against, which does not exist, so
 *    it is always null with the reason "needs schedules". */

export type StateBucket = 'on_duty' | 'on_break' | 'off_duty' | 'missed' | 'other';

export interface HistoryRow {
  agent?: string;
  user_uuid?: string;
  status: string;
  reason?: string;
  reason_id?: string;
  source?: string;
  /* Epoch milliseconds. */
  at: number;
  /* Epoch milliseconds, or null while the row is still open. */
  ended_at?: number | null;
}

export interface StateInterval {
  bucket: StateBucket;
  status: string;
  reason: string;
  reason_id: string;
  source: string;
  start: number;
  end: number;
}

export interface CallRow {
  /* Epoch milliseconds of the call start. */
  start: number;
  /* Seconds the call was up (billsec). */
  seconds: number;
  connected: boolean;
}

export interface PreviewEventRow {
  event: string;
  seconds: number;
  /* Epoch milliseconds. */
  at: number;
}

export interface DayWindow {
  date: string;
  start: number;
  end: number;
}

export interface BreakSummary {
  reason: string;
  reason_id: string;
  count: number;
  seconds: number;
}

export interface DaySummary {
  signed_in_s: number;
  on_duty_s: number;
  on_call_s: number;
  wrapup_s: number;
  free_s: number;
  break_s: number;
  breaks: BreakSummary[];
  missed_s: number;
  other_s: number;
  off_duty_s: number;
  connected_calls: number;
  occupancy_pct: number | null;
  productive_pct: number | null;
  adherence: null;
  adherence_reason: string;
  first_start: number | null;
  last_end: number | null;
}

export interface BreakDetail {
  reason: string;
  reason_id: string;
  source: string;
  started: number;
  ended: number | null;
  seconds: number;
  allowance_minutes: number | null;
  over_by_s: number;
}

export const ADHERENCE_REASON = 'needs schedules';

/* Which bucket a status string lands in; the writers do not agree on case. */
export const bucketOf = (status: string): StateBucket => {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (s === 'available') return 'on_duty';
  if (s === 'on break') return 'on_break';
  if (s === 'logged out' || s === '') return 'off_duty';
  if (s.includes('missed')) return 'missed';
  return 'other';
};

/* Sort rows by time and turn them into intervals. A row ends where it says it
   does, or where the next row for the same person starts, whichever is
   earlier; the last row is still open and ends now. */
export const chainIntervals = (rows: HistoryRow[], nowMs: number): StateInterval[] => {
  const sorted = [...rows].sort((a, b) => a.at - b.at);
  return sorted.map((row, index) => {
    const next = sorted[index + 1];
    const declared = row.ended_at === null || row.ended_at === undefined ? null : Number(row.ended_at);
    let end = declared !== null && Number.isFinite(declared) ? declared : nowMs;
    if (next && next.at < end) end = next.at;
    if (end < row.at) end = row.at;
    return {
      bucket: bucketOf(row.status),
      status: String(row.status || ''),
      reason: String(row.reason || ''),
      reason_id: String(row.reason_id || ''),
      source: String(row.source || ''),
      start: row.at,
      end,
    };
  });
};

/* ---- time zones, without a library ---- */

const partsFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
};

/* Offset of the zone from UTC at that instant, in milliseconds. */
export const tzOffsetMs = (ms: number, timeZone: string): number => {
  const parts = partsFormatter(timeZone).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
};

/* Midnight of a calendar date in a zone, as epoch milliseconds. */
export const zonedMidnightMs = (date: string, timeZone: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  let result = guess - tzOffsetMs(guess, zone);
  /* A second pass settles the day a clock change lands on. */
  result = guess - tzOffsetMs(result, zone);
  return result;
};

const addDays = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
};

/* One window per calendar day of the range, in the zone. */
export const dayWindows = (dateFrom: string, dateTo: string, timeZone: string): DayWindow[] => {
  const from = dateFrom.slice(0, 10);
  const to = dateTo.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return [];
  const windows: DayWindow[] = [];
  let date = from;
  /* A year is the most anyone asks for on one screen. */
  for (let i = 0; i < 366 && date <= to; i += 1) {
    const next = addDays(date, 1);
    windows.push({ date, start: zonedMidnightMs(date, timeZone), end: zonedMidnightMs(next, timeZone) });
    date = next;
  }
  return windows;
};

/* Half-hour windows inside a day window. */
export const intervalWindows = (day: DayWindow, minutes = 30): DayWindow[] => {
  const step = minutes * 60 * 1000;
  const out: DayWindow[] = [];
  for (let start = day.start; start < day.end; start += step) {
    out.push({ date: day.date, start, end: Math.min(day.end, start + step) });
  }
  return out;
};

const overlapMs = (aStart: number, aEnd: number, bStart: number, bEnd: number): number =>
  Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

const secs = (ms: number) => Math.round(ms / 1000);

export const pctOf = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

/* The day (or any window) of one person. */
export const summariseWindow = (
  intervals: StateInterval[],
  window: DayWindow,
  calls: CallRow[] = [],
  events: PreviewEventRow[] = [],
): DaySummary => {
  let signedIn = 0;
  let onDuty = 0;
  let missed = 0;
  let other = 0;
  let offDuty = 0;
  let firstStart: number | null = null;
  let lastEnd: number | null = null;
  const breaks = new Map<string, BreakSummary>();

  intervals.forEach((interval) => {
    const ms = overlapMs(interval.start, interval.end, window.start, window.end);
    if (ms <= 0) return;
    if (interval.bucket === 'off_duty') {
      offDuty += ms;
      return;
    }
    signedIn += ms;
    const start = Math.max(interval.start, window.start);
    const end = Math.min(interval.end, window.end);
    if (firstStart === null || start < firstStart) firstStart = start;
    if (lastEnd === null || end > lastEnd) lastEnd = end;
    if (interval.bucket === 'on_duty') onDuty += ms;
    else if (interval.bucket === 'missed') missed += ms;
    else if (interval.bucket === 'other') other += ms;
    else if (interval.bucket === 'on_break') {
      const key = interval.reason_id || interval.reason || '';
      const entry = breaks.get(key) || {
        reason: interval.reason || 'Break (no reason)',
        reason_id: interval.reason_id,
        count: 0,
        seconds: 0,
      };
      /* A break counts once, in the window where it started. */
      if (interval.start >= window.start && interval.start < window.end) entry.count += 1;
      entry.seconds += secs(ms);
      breaks.set(key, entry);
    }
  });

  let onCallMs = 0;
  let connected = 0;
  calls.forEach((call) => {
    const end = call.start + Math.max(0, call.seconds) * 1000;
    onCallMs += overlapMs(call.start, end, window.start, window.end);
    if (call.connected && call.start >= window.start && call.start < window.end) connected += 1;
  });

  let wrapup = 0;
  events.forEach((event) => {
    if (event.event !== 'wrapup_ended') return;
    if (event.at < window.start || event.at >= window.end) return;
    wrapup += Math.max(0, Math.round(Number(event.seconds) || 0));
  });

  const signedInS = secs(signedIn);
  const onDutyS = secs(onDuty);
  const onCallS = secs(onCallMs);
  const busy = onCallS + wrapup;
  const free = Math.max(0, onDutyS - busy);
  const breakList = Array.from(breaks.values()).sort((a, b) => b.seconds - a.seconds);

  return {
    signed_in_s: signedInS,
    on_duty_s: onDutyS,
    on_call_s: onCallS,
    wrapup_s: wrapup,
    free_s: free,
    break_s: breakList.reduce((sum, b) => sum + b.seconds, 0),
    breaks: breakList,
    missed_s: secs(missed),
    other_s: secs(other),
    off_duty_s: secs(offDuty),
    connected_calls: connected,
    occupancy_pct: pctOf(busy, busy + free),
    productive_pct: pctOf(busy, signedInS),
    adherence: null,
    adherence_reason: ADHERENCE_REASON,
    first_start: firstStart,
    last_end: lastEnd,
  };
};

/* Every break inside a window, one line each, with how far it went over the
   company's allowance for that reason (soft: shown and counted, never
   enforced). */
export const breaksInWindow = (
  intervals: StateInterval[],
  window: DayWindow,
  allowances: Record<string, number> = {},
  nowMs: number = Date.now(),
): BreakDetail[] =>
  intervals
    .filter((i) => i.bucket === 'on_break' && overlapMs(i.start, i.end, window.start, window.end) > 0)
    .map((i) => {
      const allowance = allowances[i.reason_id] ?? allowances[i.reason] ?? null;
      const stillOpen = i.end >= nowMs - 1000;
      const seconds = secs(i.end - i.start);
      const limit = allowance !== null && Number.isFinite(Number(allowance)) ? Number(allowance) : null;
      return {
        reason: i.reason || 'Break (no reason)',
        reason_id: i.reason_id,
        source: i.source,
        started: i.start,
        ended: stillOpen ? null : i.end,
        seconds,
        allowance_minutes: limit,
        over_by_s: limit && limit > 0 ? Math.max(0, seconds - limit * 60) : 0,
      };
    });

/* Preview figures for one campaign, one person, one window. */
export const previewFigures = (events: PreviewEventRow[], calls: CallRow[], window: DayWindow) => {
  let offered = 0;
  let skipped = 0;
  let dialled = 0;
  let previewSeconds = 0;
  let wrapupSeconds = 0;
  events.forEach((event) => {
    if (event.at < window.start || event.at >= window.end) return;
    const seconds = Math.max(0, Math.round(Number(event.seconds) || 0));
    if (event.event === 'preview_offered') offered += 1;
    else if (event.event === 'preview_skipped') {
      skipped += 1;
      previewSeconds += seconds;
    } else if (event.event === 'preview_dialled') {
      dialled += 1;
      previewSeconds += seconds;
    } else if (event.event === 'wrapup_ended') wrapupSeconds += seconds;
  });
  let connected = 0;
  let talk = 0;
  calls.forEach((call) => {
    if (call.start < window.start || call.start >= window.end) return;
    if (!call.connected) return;
    connected += 1;
    talk += Math.max(0, Math.round(call.seconds));
  });
  return {
    leads_previewed: offered,
    skipped,
    dialled,
    preview_seconds: previewSeconds,
    avg_preview_s: dialled + skipped > 0 ? Math.round(previewSeconds / (dialled + skipped)) : null,
    wrapup_seconds: wrapupSeconds,
    connected_calls: connected,
    talk_seconds: talk,
    aht_incl_wrapup_s: connected > 0 ? Math.round((talk + wrapupSeconds) / connected) : null,
  };
};

/* "1:05:09" / "5:09" for a table cell; seconds in, text out. */
export const clockText = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return '—';
  const s = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

export const pctText = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${Math.round(Number(value))}%`;
