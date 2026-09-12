import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabels, normaliseBreakReasons, pickableReasons } from './break-reasons';

test('old rows get category defaults; built-ins keep their meaning', () => {
  const s = normaliseBreakReasons({ reasons: [{ id: 'lunch', name: 'Lunch', limit_minutes: 30 }, { id: 'coffee', name: 'Coffee', limit_minutes: 10 }] });
  const lunch = s.reasons.find((r) => r.id === 'lunch')!; const coffee = s.reasons.find((r) => r.id === 'coffee')!;
  assert.equal(s.schema_version, 2);
  assert.equal(lunch.category, 'meal'); assert.equal(lunch.paid, false); assert.equal(lunch.agent_may_pick, true);
  assert.equal(coffee.category, 'break'); assert.equal(coffee.paid, true); assert.equal(coffee.counts_as_work, false); assert.equal(coffee.shrinkage, 'planned');
});

test('activity fields are kept when stored, and scheduled-only codes leave the chip', () => {
  const s = normaliseBreakReasons({ reasons: [{ id: 'training', name: 'Training', limit_minutes: null, category: 'training', paid: true, counts_as_work: true, shrinkage: 'planned', agent_may_pick: false }, { id: 'sick', name: 'Sick', category: 'time_off', paid: false, counts_as_work: false, shrinkage: 'unplanned', agent_may_pick: false }] });
  const t = s.reasons.find((r) => r.id === 'training')!;
  assert.equal(t.category, 'training'); assert.equal(t.counts_as_work, true); assert.equal(t.agent_may_pick, false);
  assert.deepEqual(pickableReasons(s.reasons).map((r) => r.id), ['break', 'lunch']);
  assert.equal(categoryLabels(s.reasons).sick, 'Time off');
  assert.equal(normaliseBreakReasons({ reasons: [{ id: 'x', name: 'X', category: 'nonsense' }] }).reasons.find((r) => r.id === 'x')!.category, 'break', 'an unknown category falls back');
});
