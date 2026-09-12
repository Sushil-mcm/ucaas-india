import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseBreakReasons } from './break-reasons';
import {
  adherenceText, averageOf, blocksText, coverageSummary, daysBetween, lunchCode, onQueueMinutes, parseBlocksText, shiftDate, templateBlocks, weekOf,
} from './workforce';

const reasons = normaliseBreakReasons({ reasons: [{ id: 'lunch', name: 'Lunch', limit_minutes: 30, built_in: true }, { id: 'training', name: 'Training' }] } as any).reasons;

test('weekOf runs Monday to Sunday and shiftDate crosses month ends', () => {
  assert.deepEqual(weekOf('2026-09-11'), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
  assert.equal(weekOf('2026-09-13')[0], '2026-09-07');
  assert.equal(shiftDate('2026-08-31', 1), '2026-09-01');
  assert.equal(daysBetween('2026-09-10', '2026-09-12'), 3);
});

test('blocks text round-trips, is sorted, and refuses what it cannot read', () => {
  const parsed = parseBlocksText('13:00-17:00 On queue; 9:00-12:30 on queue; 12:30–13:00 Lunch', reasons);
  assert.equal(parsed.error, '');
  assert.deepEqual(parsed.blocks.map((b) => `${b.start} ${b.code}`), ['09:00 on_queue', '12:30 lunch', '13:00 on_queue']);
  assert.equal(blocksText(parsed.blocks, reasons), '09:00–12:30 On queue; 12:30–13:00 Lunch; 13:00–17:00 On queue');
  assert.equal(onQueueMinutes(parsed.blocks), 450);
  assert.match(parseBlocksText('09:00-12:00 Yoga', reasons).error, /not an activity code/);
  assert.match(parseBlocksText('09:00-12:00 On queue; 11:00-13:00 Lunch', reasons).error, /overlap/);
  assert.match(parseBlocksText('12:00-09:00 On queue', reasons).error, /end must be after/);
  assert.match(parseBlocksText('whenever', reasons).error, /Cannot read/);
  assert.deepEqual(parseBlocksText('', reasons), { blocks: [], error: '' });
});

test('templates use the company Lunch code and the day-off template is empty', () => {
  assert.equal(lunchCode(reasons), 'lunch');
  const day = templateBlocks('day', 'lunch');
  assert.deepEqual(day.map((b) => `${b.start}-${b.end} ${b.code}`), ['09:00-12:30 on_queue', '12:30-13:00 lunch', '13:00-17:00 on_queue']);
  assert.deepEqual(templateBlocks('off', 'lunch'), []);
});

test('adherence text and averages, coverage summary', () => {
  assert.equal(adherenceText({ adherence: 92 }), '92%');
  assert.equal(adherenceText({ adherence: null, adherence_reason: 'needs schedules' }), 'Needs schedules');
  assert.equal(adherenceText({ adherence: null, adherence_reason: 'nothing scheduled that day' }), 'nothing scheduled that day');
  assert.equal(averageOf([90, null, 70]), 80);
  assert.equal(averageOf([null]), null);
  const summary = coverageSummary([
    { start: '09:00', scheduled: 2, need: 3, gap: -1, calls: 12 },
    { start: '09:30', scheduled: 3, need: 2, gap: 1, calls: 8 },
    { start: '10:00', scheduled: 1, need: 0, gap: 1, calls: 0 },
  ]);
  assert.deepEqual(summary, { short: 1, spare: 1, peakNeed: 3, peakScheduled: 3 });
});
