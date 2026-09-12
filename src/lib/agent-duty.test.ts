/* The duty axis helpers: the soft allowance ("over by"), the clock, and the
   amber threshold the chip uses. node:test, after bundling with esbuild:

     npx esbuild src/lib/agent-duty.test.ts --bundle --platform=node --format=cjs \
       --alias:@=./src --outfile=/tmp/agent-duty.test.cjs && node --test /tmp/agent-duty.test.cjs
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentDuty,
  clock,
  describeDuty,
  describePending,
  dutyTone,
  missedCallNotice,
  overBy,
  secondsInState,
} from './agent-duty';

const NOW = 1_800_000_000_000; // ms
const duty = (extra: Partial<AgentDuty> = {}): AgentDuty => ({
  user_uuid: 'u-1',
  extension: '1001',
  name: 'Ann',
  duty: 'on_duty',
  on_call: false,
  reason: '',
  reason_id: '',
  since: NOW / 1000 - 90,
  pending: null,
  no_answer_count: 0,
  max_no_answer: 3,
  missed_too_many: false,
  queues: 2,
  ...extra,
});
const onBreakFor = (minutes: number, extra: Partial<AgentDuty> = {}) =>
  duty({ duty: 'on_break', reason: 'Lunch', reason_id: 'lunch', since: NOW / 1000 - minutes * 60, ...extra });

test('clock: m:ss below an hour, h:mm:ss from an hour, never negative or fractional', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(9), '0:09');
  assert.equal(clock(59), '0:59');
  assert.equal(clock(60), '1:00');
  assert.equal(clock(90), '1:30');
  assert.equal(clock(3599), '59:59');
  assert.equal(clock(3600), '1:00:00');
  assert.equal(clock(3661), '1:01:01');
  assert.equal(clock(36_000 + 5 * 60 + 7), '10:05:07');
  assert.equal(clock(-5), '0:00', 'a negative figure shows as zero');
  assert.equal(clock(61.9), '1:01', 'fractions are floored, not rounded up');
  assert.equal(clock(Number.NaN), '0:00', 'NaN shows as zero');
});

test('secondsInState: since the last duty change, never negative, never NaN', () => {
  assert.equal(secondsInState(duty(), NOW), 90);
  assert.equal(secondsInState(duty({ since: 0 }), NOW), 0, 'no change recorded yet');
  assert.equal(secondsInState(duty({ since: NOW / 1000 + 30 }), NOW), 0, 'a clock ahead of the server is not negative');
  assert.equal(secondsInState(duty({ since: Number.NaN }), NOW), 0);
  assert.equal(secondsInState(null, NOW), 0);
  assert.equal(secondsInState(undefined, NOW), 0);
});

test('overBy: whole minutes past the allowance, only on a break, only with a positive limit', () => {
  assert.equal(overBy(onBreakFor(10), 30, NOW), 0, 'inside the allowance');
  assert.equal(overBy(onBreakFor(30), 30, NOW), 0, 'exactly at the allowance is not over');
  assert.equal(overBy(onBreakFor(30, { since: NOW / 1000 - 30 * 60 - 1 }), 30, NOW), 1, 'one second over rounds up to one minute');
  assert.equal(overBy(onBreakFor(35), 30, NOW), 5);
  assert.equal(overBy(onBreakFor(44.5), 30, NOW), 15, '14 min 30 s over rounds up to 15');
  assert.equal(overBy(onBreakFor(1.1666667), 1, NOW), 1, 'a 1-minute Break at 70 s is over by 0:10 -> 1 minute (test A3)');
  assert.equal(overBy(duty({ duty: 'on_duty', since: NOW / 1000 - 90 * 60 }), 30, NOW), 0, 'on duty has no allowance');
  assert.equal(overBy(duty({ duty: 'off_duty', since: NOW / 1000 - 90 * 60 }), 30, NOW), 0, 'off duty has no allowance');
  assert.equal(overBy(onBreakFor(90), null, NOW), 0, 'no limit means never over');
  assert.equal(overBy(onBreakFor(90), undefined, NOW), 0);
  assert.equal(overBy(onBreakFor(90), 0, NOW), 0, 'a zero limit means no limit');
  assert.equal(overBy(onBreakFor(90), -5, NOW), 0, 'a negative limit means no limit');
  assert.equal(overBy(null, 30, NOW), 0);
});

test('the amber threshold: the clock is amber the moment the break is over its allowance', () => {
  /* The chip paints the clock amber when overBy(...) > 0 and shows "over by
     N" to the supervisor; both read the same function, so one boundary. */
  const limit = 15;
  const at = (seconds: number) => overBy(onBreakFor(0, { since: NOW / 1000 - seconds }), limit, NOW) > 0;
  assert.equal(at(14 * 60 + 59), false, '14:59 is still inside');
  assert.equal(at(15 * 60), false, '15:00 exactly is inside');
  assert.equal(at(15 * 60 + 1), true, '15:01 is amber');
  assert.equal(at(70 * 60), true, 'and stays amber');
});

test('dutyTone: one colour per meaning, red for too many missed calls wins', () => {
  assert.equal(dutyTone(duty()), 'good');
  assert.equal(dutyTone(onBreakFor(5)), 'warn');
  assert.equal(dutyTone(duty({ duty: 'off_duty' })), 'idle');
  assert.equal(dutyTone(duty({ missed_too_many: true })), 'busy');
  assert.equal(dutyTone(onBreakFor(5, { missed_too_many: true })), 'busy');
  assert.equal(dutyTone(null), 'idle');
});

test('describeDuty / describePending: the words the chip shows', () => {
  assert.equal(describeDuty(duty()), 'On duty');
  assert.equal(describeDuty(onBreakFor(5)), 'On break · Lunch');
  assert.equal(describeDuty(onBreakFor(5, { reason: '' })), 'On break');
  assert.equal(describeDuty(duty({ duty: 'off_duty' })), 'Off duty');
  assert.equal(describeDuty(null), 'Off duty');
  assert.equal(describePending(duty()), '');
  assert.equal(describePending(duty({ pending: { duty: 'on_break', reason: 'Lunch', reason_id: 'lunch', source: 'agent' } })), 'next: break · Lunch (after this call)');
  assert.equal(describePending(duty({ pending: { duty: 'on_break', reason: '', reason_id: '', source: 'agent' } })), 'next: break (after this call)');
  assert.equal(describePending(duty({ pending: { duty: 'off_duty', reason: '', reason_id: '', source: 'supervisor' } })), 'next: off duty (after this call)');
  assert.equal(describePending(duty({ pending: { duty: 'on_duty', reason: '', reason_id: '', source: 'agent' } })), 'next: on duty (after this call)');
});

test('missedCallNotice: only when the engine stopped offering calls, with the count and plural', () => {
  assert.equal(missedCallNotice(duty()), null);
  assert.equal(missedCallNotice(duty({ no_answer_count: 2, max_no_answer: 3 })), null, 'under the limit says nothing');
  assert.equal(missedCallNotice(duty({ missed_too_many: true, no_answer_count: 3 })), 'You missed 3 queue calls in a row, so calls are not being offered to you.');
  assert.equal(missedCallNotice(duty({ missed_too_many: true, no_answer_count: 1 })), 'You missed 1 queue call in a row, so calls are not being offered to you.');
});
