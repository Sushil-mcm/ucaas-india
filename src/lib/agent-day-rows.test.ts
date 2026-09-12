/* The rows the Day and Breaks tabs put on the table, without a browser.
   Bundled by tests/run-stage-d.sh; run with node --test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { zonedMidnightMs } from './agent-day';
import {
  BREAK_HEAD,
  DAY_HEAD,
  breakRows,
  dayRows,
  filterByName,
  localTime,
  overAllowanceCount,
  personName,
  setByText,
  truncationNote,
} from './agent-day-rows';
import { csvFileText, csvText } from './csv-download';

const TZ = 'Asia/Kolkata';
const DAY = '2026-09-08';
const local = (h: number, m = 0) => zonedMidnightMs(DAY, TZ) + (h * 60 + m) * 60000;

const users = [
  { uuid: 'u-1001', first_name: 'Asha', last_name: 'Rao', extension: '1001' },
  { uuid: 'u-1002', first_name: '', last_name: '', username: 'priya', extension: '1002' },
];

const summaryRow = {
  user_uuid: 'u-1001', name: 'u-1001', extension: '1001', date: DAY,
  signed_in_s: 28800, on_duty_s: 27900, on_call_s: 7200, wrapup_s: 600, free_s: 20100, break_s: 900,
  breaks: [{ reason: 'Lunch', reason_id: 'lunch', count: 1, seconds: 900 }],
  missed_s: 0, connected_calls: 2, occupancy_pct: 28, productive_pct: 27.1,
  adherence: null, adherence_reason: 'needs schedules', first_start: local(9), last_end: local(17),
};

test('personName: a real server name wins; a uuid-as-name is looked up in the directory; extension before uuid', () => {
  assert.equal(personName({ user_uuid: 'u-1001', name: 'sushil yadav' }, users), 'sushil yadav');
  assert.equal(personName({ user_uuid: 'u-1001', name: 'u-1001', extension: '1001' }, users), 'Asha Rao');
  assert.equal(personName({ user_uuid: 'u-1002', name: '1002', extension: '1002' }, users), 'priya');
  assert.equal(personName({ user_uuid: 'u-1003', name: '1003', extension: '1003' }, users), '1003');
  assert.equal(personName({ user_uuid: 'u-1004', name: 'u-1004' }, users), 'u-1004');
  assert.equal(personName({ user_uuid: 'u-1001' }, []), 'u-1001');
  assert.equal(personName({}, users), '—');
});

test('localTime writes the instant in the report zone', () => {
  assert.equal(localTime(local(9), TZ), '08 Sep, 09:00');
  assert.equal(localTime(local(9), 'UTC'), '08 Sep, 03:30');
  assert.equal(localTime(null, TZ), '—');
  assert.equal(localTime(0, TZ), '—');
});

test('dayRows: sixteen cells in the order of the heading, the day in plain text', () => {
  const [row] = dayRows([summaryRow], { timeZone: TZ, users });
  assert.equal(row.length, DAY_HEAD.length);
  assert.deepEqual(row, [
    'Asha Rao', DAY, '8:00:00', '7:45:00', '2:00:00', '10:00', '5:35:00', '15:00', 'Lunch ×1 15:00', '0:00', 2, '28%', '27%',
    'Needs schedules', '08 Sep, 09:00', '08 Sep, 17:00',
  ]);
  assert.equal(DAY_HEAD[13], 'Adherence');
  assert.ok(DAY_HEAD[4].includes('≈') && DAY_HEAD[5].includes('≈'), 'the estimate columns carry ≈ in the heading');
  /* an empty day still renders without throwing */
  const [bare] = dayRows([{ user_uuid: 'u-9' }], { timeZone: TZ });
  assert.equal(bare[0], 'u-9');
  assert.equal(bare[8], '—');
  assert.equal(bare[11], '—');
});

test('breakRows: one line per break, still-open breaks say so, source in plain words', () => {
  const rows = breakRows(
    [
      { user_uuid: 'u-1001', name: 'u-1001', reason: 'Lunch', reason_id: 'lunch', started: local(12, 30), ended: local(12, 45), seconds: 900, allowance_minutes: 10, over_by_s: 300, source: 'agent' },
      { user_uuid: 'u-1002', name: '1002', extension: '1002', reason: '', started: local(15), ended: null, seconds: 120, allowance_minutes: null, over_by_s: 0, source: 'supervisor' },
    ],
    { timeZone: TZ, users, categories: { lunch: 'Break' } },
  );
  assert.equal(rows[0].length, BREAK_HEAD.length);
  assert.deepEqual(rows[0], ['Asha Rao', 'Lunch', 'Break', '08 Sep, 12:30', '08 Sep, 12:45', '15:00', '10 min', '5:00', 'the agent']);
  assert.deepEqual(rows[1], ['priya', 'Break (no reason)', '—', '08 Sep, 15:00', 'still on break', '2:00', '—', '—', 'a manager']);
  assert.equal(setByText('system'), 'the system');
  assert.equal(overAllowanceCount([{ over_by_s: 300 }, { over_by_s: 0 }, {}]), 1);
});

test('filterByName searches the shown name, so a directory name is searchable too', () => {
  const rows = [summaryRow, { ...summaryRow, user_uuid: 'u-1002', name: 'priya', extension: '1002' }];
  assert.equal(filterByName(rows, 'asha', users).length, 1);
  assert.equal(filterByName(rows, 'PRIYA', users).length, 1);
  assert.equal(filterByName(rows, '', users).length, 2);
  assert.equal(filterByName(rows, 'nobody', users).length, 0);
});

test('the Day CSV: plain-English headings, quoting where needed, ≈ and × kept, numbers bare', () => {
  const rows = dayRows([{ ...summaryRow, breaks: [{ reason: 'Lunch, long', reason_id: 'lunch', count: 1, seconds: 900 }] }], { timeZone: TZ, users });
  const text = csvText([...DAY_HEAD], rows);
  const lines = text.split('\n');
  assert.equal(lines[0], 'Agent,Date,Signed in,On duty,On calls ≈,Wrap-up ≈,Free on duty,Time on breaks,Breaks,Missed too many,Connected calls,Occupancy,Productive,Adherence,First start,Last end');
  assert.ok(lines[1].includes('"Lunch, long ×1 15:00"'), 'a comma inside a cell is quoted, × kept');
  assert.ok(lines[1].includes(',2,'), 'connected calls is a bare number');
  assert.ok(lines[1].endsWith('"08 Sep, 09:00","08 Sep, 17:00"'), 'the times carry a comma and are quoted');
  assert.ok(csvFileText([...DAY_HEAD], rows).startsWith('﻿'), 'the file starts with the UTF-8 BOM');
});

test('truncationNote says how many rows were kept, and nothing when nothing was cut', () => {
  assert.equal(truncationNote({ truncated: false }), '');
  assert.equal(truncationNote(undefined), '');
  assert.equal(truncationNote({ truncated: true, max_rows: 20000 }), 'Only the first 20,000 rows are shown. Pick fewer days or fewer people to see everything.');
});
