import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSourceFor, pickRecorderMime, screenFileName } from './screen-capture';

test('no rule -> no capture', () => {
  assert.equal(captureSourceFor({}), null);
  assert.equal(captureSourceFor({ queueId: 'q1', queueSettings: { screen_capture: false } }), null);
  assert.equal(captureSourceFor({ queueId: 'q1', queueSettings: null }), null);
  assert.equal(captureSourceFor({ queueSettings: { screen_capture: true } }), null, 'a setting without a queue id is not a queue call');
});

test('queue rule', () => {
  assert.deepEqual(captureSourceFor({ queueId: 'q1', queueSettings: { screen_capture: true } }), { source: 'queue', source_id: 'q1' });
  assert.deepEqual(captureSourceFor({ queueId: 'q1', queueSettings: { screen_capture: 'true' } }), { source: 'queue', source_id: 'q1' });
});

test('coaching rule wins the label', () => {
  assert.deepEqual(
    captureSourceFor({ queueId: 'q1', queueSettings: { screen_capture: true }, coachingTeamsWithScreen: [{ uuid: 't9' }] }),
    { source: 'coaching', source_id: 't9' },
  );
  assert.deepEqual(captureSourceFor({ coachingTeamsWithScreen: [{ uuid: 't9' }] }), { source: 'coaching', source_id: 't9' });
});

test('file name is safe and stable', () => {
  assert.equal(screenFileName('abc-123@host/x'), 'abc-123_host_x_screen.webm');
  assert.equal(screenFileName('a'.repeat(100)).length, 60 + '_screen.webm'.length);
});

test('recorder mime preference', () => {
  assert.equal(pickRecorderMime((m) => m.includes('vp9')), 'video/webm;codecs=vp9');
  assert.equal(pickRecorderMime((m) => m === 'video/webm'), 'video/webm');
  assert.equal(pickRecorderMime(() => false), '');
});
