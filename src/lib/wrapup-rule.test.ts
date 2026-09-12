import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WRAPUP_MODES, holdsForLabel, wrapupVerdict } from './wrapup-rule';

test('a required wrap-up that runs out unlabelled is held open; the others close', () => {
  assert.equal(holdsForLabel(WRAPUP_MODES.MANDATORY), true);
  assert.equal(holdsForLabel(WRAPUP_MODES.MANDATORY_TIMEOUT), true);
  assert.equal(holdsForLabel('mandatory_timeout'), true);
  assert.equal(holdsForLabel(WRAPUP_MODES.MANDATORY_FORCED_TIMEOUT), false);
  assert.equal(holdsForLabel(WRAPUP_MODES.OPTIONAL), false);
  assert.equal(holdsForLabel(WRAPUP_MODES.AGENT_REQUESTED), false);
});

test('an unreadable rule behaves as the default (required, moves on when time runs out)', () => {
  assert.equal(holdsForLabel(undefined), true);
  assert.equal(holdsForLabel('whatever'), true);
});

test('the verdict itself is unchanged: expiry alone still ends a timed mandatory wrap-up', () => {
  const expired = wrapupVerdict({
    mode: WRAPUP_MODES.MANDATORY_TIMEOUT,
    totalSeconds: 15,
    elapsedSeconds: 15,
    hasDisposition: false,
  });
  assert.equal(expired.autoClose, true);
  assert.equal(expired.mayLeave, true);
  const labelled = wrapupVerdict({
    mode: WRAPUP_MODES.MANDATORY,
    totalSeconds: 0,
    elapsedSeconds: 99,
    hasDisposition: true,
  });
  assert.equal(labelled.mayLeave, true);
  assert.equal(labelled.autoClose, false);
});
