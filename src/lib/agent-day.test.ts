/* The pure agent-day arithmetic, on one realistic day: start shift 09:00,
   lunch 12:30–12:45, end shift 17:00 in Asia/Kolkata, a preview campaign
   with three offers (one skipped, two dialled) and two connected calls.
   Bundled by tests/run-stage-d.sh; run with node --test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breaksInWindow,
  chainIntervals,
  clockText,
  dayWindows,
  intervalWindows,
  pctOf,
  pctText,
  previewFigures,
  summariseWindow,
  zonedMidnightMs,
  type HistoryRow,
} from './agent-day';

const TZ = 'Asia/Kolkata';
const DAY = '2026-09-08';
const local = (h: number, m = 0) => zonedMidnightMs(DAY, TZ) + (h * 60 + m) * 60000;

const rows: HistoryRow[] = [
  { status: 'Logged Out', at: local(0) - 3600000, ended_at: null },
  { status: 'Available', at: local(9), ended_at: local(12, 30), source: 'agent' },
  { status: 'On Break', reason: 'Lunch', reason_id: 'lunch', at: local(12, 30), ended_at: local(12, 45), source: 'agent' },
  { status: 'Available', at: local(12, 45), ended_at: local(17), source: 'agent' },
  { status: 'Logged Out', at: local(17), ended_at: null, source: 'agent' },
];
/* well after the day, so the evening's Logged Out row runs to midnight */
const NOW = local(30);
const intervals = chainIntervals(rows, NOW);
const [window] = dayWindows(DAY, DAY, TZ);
const calls = [
  { start: local(10), seconds: 3600, connected: true },
  { start: local(14), seconds: 3600, connected: true },
  { start: local(15, 30), seconds: 0, connected: false },
];
const events = [
  { event: 'preview_offered', seconds: 0, at: local(9, 58) },
  { event: 'preview_dialled', seconds: 12, at: local(9, 59) },
  { event: 'wrapup_ended', seconds: 300, at: local(11, 1) },
  { event: 'preview_offered', seconds: 0, at: local(13, 58) },
  { event: 'preview_skipped', seconds: 8, at: local(13, 58) },
  { event: 'preview_offered', seconds: 0, at: local(13, 59) },
  { event: 'preview_dialled', seconds: 20, at: local(13, 59) },
  { event: 'wrapup_ended', seconds: 300, at: local(15, 1) },
];

test('chainIntervals: rows become back-to-back intervals, the open one ends now', () => {
  assert.equal(intervals.length, 5);
  assert.equal(intervals[1].bucket, 'on_duty');
  assert.equal(intervals[2].bucket, 'on_break');
  assert.equal(intervals[2].reason, 'Lunch');
  assert.equal(intervals[4].end, NOW);
  /* a row that says it ended after the next one started is cut at the next start */
  const overlapping = chainIntervals([{ status: 'Available', at: 0, ended_at: 5000 }, { status: 'On Break', at: 3000, ended_at: null }], 9000);
  assert.equal(overlapping[0].end, 3000);
  assert.equal(overlapping[1].end, 9000);
});

test('dayWindows: one window per day, midnight to midnight in the zone', () => {
  assert.equal(window.start, zonedMidnightMs(DAY, TZ));
  assert.equal(window.end - window.start, 86400000);
  assert.equal(dayWindows('2026-09-01', '2026-09-03', TZ).length, 3);
  assert.deepEqual(dayWindows('2026-09-03', '2026-09-01', TZ), []);
  assert.deepEqual(dayWindows('bad', DAY, TZ), []);
  /* Kolkata is UTC+5:30, so its midnight is 18:30 UTC the day before */
  assert.equal(new Date(window.start).toISOString(), '2026-09-07T18:30:00.000Z');
});

test('intervalWindows: 48 half-hours that tile the day', () => {
  const buckets = intervalWindows(window);
  assert.equal(buckets.length, 48);
  assert.equal(buckets[0].start, window.start);
  assert.equal(buckets[47].end, window.end);
  assert.equal(intervalWindows(window, 60).length, 24);
});

test('summariseWindow: the day adds up', () => {
  const day = summariseWindow(intervals, window, calls, events);
  assert.equal(day.signed_in_s, 8 * 3600);
  assert.equal(day.on_duty_s, 7 * 3600 + 45 * 60);
  assert.equal(day.break_s, 900);
  assert.deepEqual(day.breaks, [{ reason: 'Lunch', reason_id: 'lunch', count: 1, seconds: 900 }]);
  assert.equal(day.on_call_s, 7200);
  assert.equal(day.connected_calls, 2);
  assert.equal(day.wrapup_s, 600);
  assert.equal(day.free_s, 27900 - 7800);
  assert.equal(day.occupancy_pct, 28);
  assert.equal(day.productive_pct, 27.1);
  assert.equal(day.adherence, null);
  assert.equal(day.adherence_reason, 'needs schedules');
  assert.equal(day.first_start, local(9));
  assert.equal(day.last_end, local(17));
  assert.equal(day.off_duty_s, 16 * 3600);
  /* signed in = on duty + breaks */
  assert.equal(day.signed_in_s, day.on_duty_s + day.break_s);
});

test('summariseWindow: half-hour buckets sum to the day and the 12:30 bucket splits the lunch', () => {
  const parts = intervalWindows(window).map((b) => summariseWindow(intervals, b, calls, events));
  const total = (key: 'signed_in_s' | 'on_duty_s' | 'break_s' | 'on_call_s' | 'wrapup_s') => parts.reduce((s, p) => s + p[key], 0);
  const day = summariseWindow(intervals, window, calls, events);
  assert.equal(total('signed_in_s'), day.signed_in_s);
  assert.equal(total('on_duty_s'), day.on_duty_s);
  assert.equal(total('break_s'), day.break_s);
  assert.equal(total('on_call_s'), day.on_call_s);
  assert.equal(total('wrapup_s'), day.wrapup_s);
  const lunchBucket = parts[25]; // 12:30–13:00
  assert.equal(lunchBucket.break_s, 900);
  assert.equal(lunchBucket.on_duty_s, 900);
  /* the break is counted once, in the bucket where it started */
  assert.equal(parts.reduce((s, p) => s + (p.breaks[0]?.count || 0), 0), 1);
});

test('occupancy and productive: no division by zero, null when there is nothing to divide by', () => {
  assert.equal(pctOf(0, 0), null);
  assert.equal(pctOf(5, 0), null);
  assert.equal(pctOf(1, 3), 33.3);
  const empty = summariseWindow([], window, [], []);
  assert.equal(empty.occupancy_pct, null);
  assert.equal(empty.productive_pct, null);
  assert.equal(empty.signed_in_s, 0);
  /* on duty all day with no calls: occupancy 0, not NaN */
  const idle = summariseWindow(chainIntervals([{ status: 'Available', at: local(9), ended_at: local(17) }], NOW), window);
  assert.equal(idle.occupancy_pct, 0);
  assert.equal(idle.productive_pct, 0);
  /* wrap-up longer than the duty time cannot make free time negative */
  const overrun = summariseWindow(chainIntervals([{ status: 'Available', at: local(9), ended_at: local(9, 10) }], NOW), window, [], [
    { event: 'wrapup_ended', seconds: 3600, at: local(9, 5) },
  ]);
  assert.equal(overrun.free_s, 0);
  assert.equal(overrun.occupancy_pct, 100);
});

test('breaksInWindow: one line per break with the allowance and how far over it went', () => {
  const lines = breaksInWindow(intervals, window, { lunch: 10 }, NOW);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].reason, 'Lunch');
  assert.equal(lines[0].seconds, 900);
  assert.equal(lines[0].allowance_minutes, 10);
  assert.equal(lines[0].over_by_s, 300);
  assert.equal(lines[0].ended, local(12, 45));
  /* a generous allowance: nothing over; no allowance: null and nothing over */
  assert.equal(breaksInWindow(intervals, window, { lunch: 30 }, NOW)[0].over_by_s, 0);
  assert.equal(breaksInWindow(intervals, window, {}, NOW)[0].allowance_minutes, null);
  /* a break still open reads ended: null */
  const open = breaksInWindow(chainIntervals([{ status: 'On Break', reason: 'Break', at: local(16), ended_at: null }], local(16, 10)), window, {}, local(16, 10));
  assert.equal(open[0].ended, null);
  assert.equal(open[0].seconds, 600);
});

test('previewFigures: three offers, one skip, two dials, wrap-up and AHT incl. wrap-up', () => {
  const figures = previewFigures(events, calls, window);
  assert.equal(figures.leads_previewed, 3);
  assert.equal(figures.skipped, 1);
  assert.equal(figures.dialled, 2);
  assert.equal(figures.preview_seconds, 40);
  assert.equal(figures.avg_preview_s, 13);
  assert.equal(figures.wrapup_seconds, 600);
  assert.equal(figures.connected_calls, 2);
  assert.equal(figures.talk_seconds, 7200);
  assert.equal(figures.aht_incl_wrapup_s, 3900);
  /* nothing in the window: averages are null, not NaN */
  const none = previewFigures([], [], window);
  assert.equal(none.avg_preview_s, null);
  assert.equal(none.aht_incl_wrapup_s, null);
});

test('clockText and pctText', () => {
  assert.equal(clockText(0), '0:00');
  assert.equal(clockText(65), '1:05');
  assert.equal(clockText(3665), '1:01:05');
  assert.equal(clockText(null), '—');
  assert.equal(clockText(Number.NaN), '—');
  assert.equal(clockText(-5), '0:00');
  assert.equal(pctText(27.96), '28%');
  assert.equal(pctText(0), '0%');
  assert.equal(pctText(null), '—');
});
