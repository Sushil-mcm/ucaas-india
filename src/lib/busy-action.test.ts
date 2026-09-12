import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBusyActionPayload, describeBusyAction, readBusyActionForm } from './busy-action';

const me = { name: 'Asha Rao', extension: '1000' };

test('nothing stored reads as call waiting with own voicemail preselected', () => {
  const form = readBusyActionForm(undefined, '1000');
  assert.equal(form.enabled, false);
  assert.deepEqual(form.type, { label: 'Send to Voicemail', value: 'VOICEMAIL' });
  assert.equal(form.value.value, '1000');
  assert.equal(form.personal, true);
});

test('a stored choice round-trips', () => {
  const stored = {
    enabled: true,
    type: 'EXTENSION',
    type_label: 'Send to Extension',
    value: '1002',
    value_label: 'Ben Ito (1002)',
    name: 'Ben Ito',
    personal: false,
  };
  const form = readBusyActionForm(stored, '1000');
  assert.equal(form.enabled, true);
  assert.equal(form.value.value, '1002');
  assert.equal(form.personal, false);
  const back = buildBusyActionPayload({ ...form, value: { ...form.value, name: 'Ben Ito' } }, me);
  assert.deepEqual(back, stored);
});

test('own voicemail stores the person, not what was typed', () => {
  const payload = buildBusyActionPayload(
    {
      enabled: true,
      type: { label: 'Send to Voicemail', value: 'VOICEMAIL' },
      value: { label: 'Select', value: '9999' },
      personal: true,
    },
    me,
  );
  assert.equal(payload.value, '1000');
  assert.equal(payload.name, 'Asha Rao');
  assert.equal(payload.personal, true);
});

test('an explicit false stays false; a missing personal defaults to true', () => {
  assert.equal(readBusyActionForm({ personal: false }, '1000').personal, false);
  assert.equal(readBusyActionForm({}, '1000').personal, true);
  assert.equal(buildBusyActionPayload(undefined, me).enabled, false);
});

test('the summary wording', () => {
  assert.equal(describeBusyAction(undefined), 'a second call rings you as call waiting');
  assert.equal(
    describeBusyAction(readBusyActionForm({ enabled: true }, '1000')),
    'a second call goes to your voicemail',
  );
  assert.equal(
    describeBusyAction({
      enabled: true,
      type: { label: 'Send to Extension', value: 'EXTENSION' },
      value: { label: 'Ben Ito (1002)', value: '1002' },
      personal: false,
    }),
    'a second call goes to Ben Ito (1002)',
  );
  assert.equal(
    describeBusyAction({ enabled: true, type: { label: 'Hang up', value: 'HANGUP' }, value: { label: '', value: '' }, personal: false }),
    'a second call is ended',
  );
});
