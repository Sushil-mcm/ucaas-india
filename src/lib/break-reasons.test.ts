/* Break reasons: the company section is read into a full, sane list with the
   two built-ins always present (Break 15, Lunch 30 once a day), allowances
   clamped, ids unique. node:test, after bundling with esbuild:

     npx esbuild src/lib/break-reasons.test.ts --bundle --platform=node --format=cjs \
       --alias:@=./src --outfile=/tmp/break-reasons.test.cjs && node --test /tmp/break-reasons.test.cjs
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAK_REASONS_SECTION,
  BUILT_IN_REASONS,
  LIMIT_RANGE,
  newReasonId,
  normaliseBreakReasons,
} from './break-reasons';

test('built-ins: Break 15 min, Lunch 30 min once a day, both built_in, section name fixed', () => {
  assert.equal(BREAK_REASONS_SECTION, 'break_reasons');
  assert.deepEqual(BUILT_IN_REASONS.map((r) => [r.id, r.name, r.limit_minutes, r.max_per_day, r.built_in]), [
    ['break', 'Break', 15, null, true],
    ['lunch', 'Lunch', 30, 1, true],
  ]);
  assert.deepEqual(LIMIT_RANGE, { min: 1, max: 240 });
});

test('nothing stored: the two built-ins, in order, schema_version 2', () => {
  for (const raw of [undefined, null, {}, { reasons: 'x' }, { reasons: [] }, 'junk', 42]) {
    const out = normaliseBreakReasons(raw);
    assert.equal(out.schema_version, 2);
    assert.deepEqual(out.reasons, BUILT_IN_REASONS, `raw=${JSON.stringify(raw)}`);
  }
});

test('a stored built-in may be renamed and re-limited but never removed or un-built-in', () => {
  const out = normaliseBreakReasons({
    reasons: [
      { id: 'lunch', name: 'Dinner', limit_minutes: 45, max_per_day: 2, built_in: false },
      /* Break left out on purpose: it must come back. */
      { id: 'coffee', name: 'Coffee', limit_minutes: 10, max_per_day: null },
    ],
  });
  assert.deepEqual(out.reasons.map((r) => r.id), ['break', 'lunch', 'coffee'], 'built-ins first, in their fixed order, then custom');
  const lunch = out.reasons.find((r) => r.id === 'lunch')!;
  assert.equal(lunch.name, 'Dinner');
  assert.equal(lunch.limit_minutes, 45);
  assert.equal(lunch.max_per_day, 2);
  assert.equal(lunch.built_in, true, 'a stored false cannot make a built-in custom');
  const brk = out.reasons.find((r) => r.id === 'break')!;
  assert.deepEqual(brk, BUILT_IN_REASONS[0], 'the missing built-in returns with its defaults');
  const coffee = out.reasons.find((r) => r.id === 'coffee')!;
  assert.equal(coffee.built_in, false);
  assert.equal(coffee.limit_minutes, 10);
  assert.equal(coffee.max_per_day, null);
});

test('allowance parsing: numbers clamp to 1..240 whole minutes; blanks, zero, negatives and junk mean no limit', () => {
  const limitOf = (limit_minutes: unknown) =>
    normaliseBreakReasons({ reasons: [{ id: 'x', name: 'X', limit_minutes }] }).reasons.find((r) => r.id === 'x')!.limit_minutes;
  assert.equal(limitOf(10), 10);
  assert.equal(limitOf('10'), 10, 'a numeric string is a number');
  assert.equal(limitOf(10.4), 10, 'rounded');
  assert.equal(limitOf(10.6), 11);
  assert.equal(limitOf(0.4), 1, 'a positive fraction rounds to the minimum, not to zero');
  assert.equal(limitOf(500), 240, 'clamped to the maximum');
  assert.equal(limitOf(240), 240);
  assert.equal(limitOf(241), 240);
  assert.equal(limitOf(0), null, 'zero means no limit');
  assert.equal(limitOf(-5), null);
  assert.equal(limitOf(''), null);
  assert.equal(limitOf(null), null);
  assert.equal(limitOf(undefined), null);
  assert.equal(limitOf('abc'), null);
  assert.equal(limitOf(Number.POSITIVE_INFINITY), null);
});

test('max_per_day: positive whole numbers up to 20, else no cap', () => {
  const maxOf = (max_per_day: unknown) =>
    normaliseBreakReasons({ reasons: [{ id: 'x', name: 'X', max_per_day }] }).reasons.find((r) => r.id === 'x')!.max_per_day;
  assert.equal(maxOf(1), 1);
  assert.equal(maxOf('3'), 3);
  assert.equal(maxOf(2.6), 3);
  assert.equal(maxOf(99), 20, 'capped at 20');
  assert.equal(maxOf(0), null);
  assert.equal(maxOf(-1), null);
  assert.equal(maxOf(null), null);
  assert.equal(maxOf('x'), null);
});

test('rows without an id or a name, and duplicate ids, are dropped; names are trimmed and cut at 50', () => {
  const out = normaliseBreakReasons({
    reasons: [
      { id: '', name: 'Nameless id' },
      { id: 'noname', name: '   ' },
      { id: 'dup', name: 'First' },
      { id: 'dup', name: 'Second' },
      { id: 'long', name: `  ${'n'.repeat(60)}  ` },
      { id: 'break', name: 'Break' }, // duplicate of the built-in: ignored the second time
    ],
  });
  assert.deepEqual(out.reasons.map((r) => r.id), ['break', 'lunch', 'dup', 'long']);
  assert.equal(out.reasons.find((r) => r.id === 'dup')!.name, 'First', 'the first of two duplicates wins');
  assert.equal(out.reasons.find((r) => r.id === 'long')!.name.length, 50);
});

test('newReasonId: a slug of the name, unique against the list, never empty', () => {
  const existing = normaliseBreakReasons(null).reasons;
  assert.equal(newReasonId('Coffee', existing), 'coffee');
  assert.equal(newReasonId('  Team  Meeting!! ', existing), 'team-meeting');
  assert.equal(newReasonId('Lunch', existing), 'lunch-2', 'a name that slugs to a built-in id gets a suffix');
  assert.equal(newReasonId('Lunch', [...existing, { id: 'lunch-2', name: 'x', limit_minutes: null, max_per_day: null, built_in: false }]), 'lunch-3');
  assert.equal(newReasonId('!!!', existing), 'reason', 'nothing slug-worthy falls back to "reason"');
  assert.equal(newReasonId('x'.repeat(80), existing).length, 32, 'cut at 32');
});
