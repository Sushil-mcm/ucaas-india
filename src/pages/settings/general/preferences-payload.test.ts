/* The Preferences save must not delete keys the page does not show. node:test,
   after bundling with esbuild (the stub gives @/lib/utils the browser globals
   it touches at load):

     npx esbuild src/pages/settings/general/preferences-payload.test.ts --bundle --platform=node \
       --format=cjs --alias:@=./src '--define:import.meta.env={"MODE":"test"}' \
       --inject:tests/browser-globals-stub.js --outfile=/tmp/preferences-payload.test.cjs \
       && node --test /tmp/preferences-payload.test.cjs
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreferencesPayload, parseSettings } from './preferences-payload';

/* What the form holds after hydration: only the keys the page shows. */
const formSettings = () => ({
  role: { label: 'Agent', value: 'agent' },
  group: { label: '', value: '' },
  voicemail_pin: { value: '1234', users: [], voicemail_to_text: 'NO' },
  recording: { on_demand: { enabled: false }, override: true, apply: true, locked: false },
  transcription: false,
  ai_call_monitoring: false,
  display_number: {
    incoming: { label: 'Caller', value: 'caller' },
    masking: { type: { label: 'None', value: 'N' }, value: '' },
    show_number_if_blocked: 'NO',
  },
  operational_hours: {
    type: 'weekly',
    value: { monday: { enabled: true } },
    holidays: [],
    regional: { country: { value: 'US' }, timezone: { value: 'America/New_York' }, time_format: 12 },
    closed_hour_action: {
      type: { label: 'Voicemail', value: 'voicemail' },
      value: { label: '', value: '' },
      enabled: true,
      personal: true,
    },
  },
});

const blocked = { allowed: false, countries: [], updated_at: '2026-09-01T00:00:00.000Z' };

test('a stored international_calling rule survives a save the form does not own it in', () => {
  const stored = { international_calling: blocked, some_future_key: { a: 1 } };
  const out = buildPreferencesPayload(stored, formSettings());
  assert.deepEqual(out.international_calling, blocked);
  assert.deepEqual(out.some_future_key, { a: 1 });
  /* Control: the old builder started from the form alone. */
  const oldShape = buildPreferencesPayload({}, formSettings());
  assert.equal('international_calling' in oldShape, false);
});

test('the form still wins for the keys it owns', () => {
  const stored = { voicemail_pin: { value: '0000', users: [], voicemail_to_text: 'YES' } };
  const out = buildPreferencesPayload(stored, formSettings());
  assert.equal(out.voicemail_pin.value, '1234');
  assert.equal(out.operational_hours.type, 'weekly');
  assert.equal(out.display_number.masking.type, 'N');
});

test('"follow the company" chosen on the form removes the block rather than keeping the stored one', () => {
  const stored = { international_calling: blocked };
  const out = buildPreferencesPayload(stored, { ...formSettings(), international_calling: undefined });
  assert.equal(out.international_calling, undefined);
  assert.equal(JSON.parse(JSON.stringify(out)).international_calling, undefined);
});

test('company rule flags are stripped, the international rule is not', () => {
  const out = buildPreferencesPayload({ international_calling: blocked }, formSettings());
  assert.equal('override' in out.recording, false);
  assert.equal('apply' in out.recording, false);
  assert.equal('locked' in out.recording, false);
  assert.deepEqual(out.international_calling, blocked);
});

test('the stored record may arrive as JSON text', () => {
  const stored = parseSettings(JSON.stringify({ international_calling: blocked }));
  assert.deepEqual(buildPreferencesPayload(stored, formSettings()).international_calling, blocked);
  assert.deepEqual(parseSettings('not json'), {});
  assert.deepEqual(parseSettings(null), {});
});
