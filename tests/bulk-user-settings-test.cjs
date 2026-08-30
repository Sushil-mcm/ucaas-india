const {
  RING_MIN_SECONDS, RING_MAX_SECONDS,
  asObject, ringTimeLabel, parseRingSeconds,
  readRecordingDirection, readOnDemandRecording, readVoicemailToText,
  readTranscription, readDeviceOptions, readRingSeconds,
  hasAnyChoice, planBulkUserUpdate, describeRun,
  readInternationalCalling,
} = require('./bulk-user-settings.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const fields = (list) => list.map(x => x.field).sort().join(',');

/* A person in the shape the user list hands back: JSON columns as objects,
   a role, a site, a caller ID. */
const device = (timeout) => ({
  type: 'web', name: 'web', value: '1001', label: '6 times / 30 secs',
  timeout, status: true, isDefault: true,
});

const PERSON = {
  uuid: 'u-1',
  first_name: 'Ana', last_name: 'Diaz', job_title: 'Support',
  caller_id: '+14155550100',
  site_uuid: 'site-1',
  role_uuid: 'role-1',
  greetings: { voicemail: { enabled: true, value: 'x.mp3' } },
  settings: {
    voicemail_pin: { value: '4821', voicemail_to_text: 'NO' },
    recording: {
      automatic: { enabled: false, value: 'incoming', label: 'Incoming', recording_on: 'a.mp3' },
      on_demand: { enabled: false, recording_on: 'b.mp3', recording_Off: 'c.mp3' },
    },
    transcription: false,
    operational_hours: { type: '24_hours' },
  },
  call_forwarding: {
    dnd: false,
    incoming_calls: { enabled: true, type: 'sequential', device_options: [device('30')] },
    outgoing_calls: { enabled: true },
  },
};

console.log('  --- reading stored columns ---');
t('an object comes back as itself', asObject({ a: 1 }).a === 1);
t('a JSON string is parsed', asObject('{"a":2}').a === 2);
t('broken JSON reads as empty, not a crash', Object.keys(asObject('{oops')).length === 0);
t('null reads as empty', Object.keys(asObject(null)).length === 0);

console.log('  --- reading what a person is set to ---');
t('recording off reads as off', readRecordingDirection(PERSON.settings) === 'off');
t('recording on reads its direction',
  readRecordingDirection({ recording: { automatic: { enabled: true, value: 'outgoing' } } }) === 'outgoing');
t('recording on with a nonsense direction falls back to all, not to blank',
  readRecordingDirection({ recording: { automatic: { enabled: true, value: 'sideways' } } }) === 'all');
t('a person with no recording node at all reads as off', readRecordingDirection({}) === 'off');
t('on demand reads its switch', readOnDemandRecording(PERSON.settings) === false);
t('voicemail to text reads the literal YES',
  readVoicemailToText({ voicemail_pin: { voicemail_to_text: 'YES' } }) === true);
t('a stored boolean true is NOT read as on, because the product compares to YES',
  readVoicemailToText({ voicemail_pin: { voicemail_to_text: true } }) === false);
t('transcription reads its boolean', readTranscription({ transcription: true }) === true);

console.log('  --- reading devices ---');
t('devices come back', readDeviceOptions(PERSON.call_forwarding).length === 1);
t('a person with no call rules has no devices', readDeviceOptions({}).length === 0);
t('a non-array device list is refused rather than trusted',
  readDeviceOptions({ incoming_calls: { device_options: 'web' } }).length === 0);
t('ring times come back as numbers', readRingSeconds(PERSON.call_forwarding)[0] === 30);
t('a device saved before ring times existed contributes nothing, not a zero',
  readRingSeconds({ incoming_calls: { device_options: [{ type: 'web' }] } }).length === 0);

console.log('  --- ring time input ---');
t('a whole number in range is accepted', parseRingSeconds(45) === 45);
t('a numeric string is accepted', parseRingSeconds('20') === 20);
t('blank is refused', parseRingSeconds('') === null);
t('a word is refused', parseRingSeconds('soon') === null);
t('a fraction is refused rather than rounded', parseRingSeconds(12.5) === null);
t('below the minimum is refused, not clamped', parseRingSeconds(RING_MIN_SECONDS - 1) === null);
t('above the maximum is refused, not clamped', parseRingSeconds(RING_MAX_SECONDS + 1) === null);
t('the label counts rings the way the shipped list does', ringTimeLabel(30) === '6 times / 30 secs');
t('one ring is singular', ringTimeLabel(5) === '1 time / 5 secs');

console.log('  --- an empty run ---');
t('no choices is refused', hasAnyChoice({}) === false);
t('one choice is enough', hasAnyChoice({ transcription: true }) === true);
t('choosing to switch something OFF still counts as a choice',
  hasAnyChoice({ recording_automatic: 'off' }) === true);

console.log('  --- planning one person ---');
let plan = planBulkUserUpdate(PERSON, { recording_automatic: 'all' });
t('a real change is reported as changed', plan.outcome === 'changed');
t('the change is named', fields(plan.changes) === 'recording_automatic');
t('recording is switched on', plan.payload.settings.recording.automatic.enabled === true);
t('the direction is stored', plan.payload.settings.recording.automatic.value === 'all');
t('the label the dialog expects travels with it',
  plan.payload.settings.recording.automatic.label === 'All');
t('the prompt file already on the record survives',
  plan.payload.settings.recording.automatic.recording_on === 'a.mp3');

console.log('  --- nothing that was not asked for is touched ---');
t('voicemail to text is left exactly as it was',
  plan.payload.settings.voicemail_pin.voicemail_to_text === 'NO');
t("the person's mailbox PIN is not rewritten",
  plan.payload.settings.voicemail_pin.value === '4821');
t('transcription is left alone', plan.payload.settings.transcription === false);
t('working hours survive the write', plan.payload.settings.operational_hours.type === '24_hours');
t('on demand recording is untouched',
  plan.payload.settings.recording.on_demand.enabled === false &&
  plan.payload.settings.recording.on_demand.recording_Off === 'c.mp3');
t('greetings are echoed back rather than dropped',
  plan.payload.greetings.voicemail.value === 'x.mp3');
t('call rules are echoed back rather than dropped',
  plan.payload.call_forwarding.incoming_calls.device_options[0].timeout === '30' &&
  plan.payload.call_forwarding.dnd === false);
t('do-not-disturb and outgoing rules survive',
  plan.payload.call_forwarding.outgoing_calls.enabled === true);
t('the person record is not mutated', PERSON.settings.recording.automatic.enabled === false);

console.log('  --- identity fields on the payload ---');
t('the uuid is sent both ways the endpoint wants it',
  plan.payload.uuid === 'u-1' && plan.payload.userID === 'u-1');
t('a plain role goes as role_uuid', plan.payload.role_uuid === 'role-1');
t('a custom role goes as custom_role_uuid instead',
  planBulkUserUpdate({ ...PERSON, custom_role_uuid: 'cr-9' }, { transcription: true })
    .payload.custom_role_uuid === 'cr-9');
t('a missing caller ID is omitted, not sent blank',
  !('caller_id' in planBulkUserUpdate({ ...PERSON, caller_id: '' }, { transcription: true }).payload));
t('a missing site is omitted, not sent blank',
  !('site_uuid' in planBulkUserUpdate(
    { ...PERSON, site_uuid: undefined, site: undefined }, { transcription: true }).payload));
t('a site nested under site.uuid is still found',
  planBulkUserUpdate({ ...PERSON, site_uuid: undefined, site: { uuid: 's-2' } },
    { transcription: true }).payload.site_uuid === 's-2');

console.log('  --- someone already set that way is not written ---');
plan = planBulkUserUpdate(PERSON, { recording_automatic: 'off' });
t('no change means no payload', plan.payload === null);
t('and it is reported as unchanged, not as a failure', plan.outcome === 'unchanged');
t('the setting that was already right is still named', fields(plan.unchanged) === 'recording_automatic');

console.log('  --- voicemail to text ---');
plan = planBulkUserUpdate(PERSON, { voicemail_to_text: true });
t('switching it on writes the literal YES',
  plan.payload.settings.voicemail_pin.voicemail_to_text === 'YES');
plan = planBulkUserUpdate({ ...PERSON, settings: { voicemail_pin: { voicemail_to_text: 'YES' } } },
  { voicemail_to_text: false });
t('switching it off writes the literal NO',
  plan.payload.settings.voicemail_pin.voicemail_to_text === 'NO');

console.log('  --- ring time ---');
plan = planBulkUserUpdate(PERSON, { ring_seconds: 45 });
t('every device gets the new time',
  plan.payload.call_forwarding.incoming_calls.device_options[0].timeout === '45');
t('the label is refreshed so it cannot show a time the phone no longer rings for',
  plan.payload.call_forwarding.incoming_calls.device_options[0].label === '9 times / 45 secs');
t('everything else on the device survives',
  plan.payload.call_forwarding.incoming_calls.device_options[0].value === '1001' &&
  plan.payload.call_forwarding.incoming_calls.device_options[0].isDefault === true);
t('the rest of incoming_calls survives',
  plan.payload.call_forwarding.incoming_calls.type === 'sequential');

plan = planBulkUserUpdate(PERSON, { ring_seconds: 30 });
t('a person already on that time is reported unchanged', plan.outcome === 'unchanged');

plan = planBulkUserUpdate({ ...PERSON, call_forwarding: {} }, { ring_seconds: 45 });
t('a person with no devices is skipped, not given invented ones', plan.outcome === 'skipped');
t('and the reason is named', fields(plan.skipped) === 'ring_seconds');
t('nothing is written for them', plan.payload === null);

plan = planBulkUserUpdate(PERSON, { ring_seconds: 999 });
t('an out-of-range time is skipped rather than clamped onto the person',
  plan.outcome === 'skipped' && plan.payload === null);

console.log('  --- a skipped setting does not block the others ---');
plan = planBulkUserUpdate({ ...PERSON, call_forwarding: {} },
  { ring_seconds: 45, transcription: true });
t('the setting that could be applied still is', plan.outcome === 'changed');
t('transcription lands', plan.payload.settings.transcription === true);
t('the one that could not is still reported', fields(plan.skipped) === 'ring_seconds');
t('a person with no call rules is not given an empty device list',
  plan.payload.call_forwarding.incoming_calls === undefined);

console.log('  --- several settings at once ---');
plan = planBulkUserUpdate(PERSON, {
  recording_automatic: 'incoming',
  recording_on_demand: true,
  voicemail_to_text: true,
  transcription: true,
  ring_seconds: 20,
});
t('all five are reported',
  fields(plan.changes) ===
  'recording_automatic,recording_on_demand,ring_seconds,transcription,voicemail_to_text');
t('both halves of recording are written together',
  plan.payload.settings.recording.automatic.enabled === true &&
  plan.payload.settings.recording.on_demand.enabled === true);
t('one write carries every change',
  plan.payload.settings.transcription === true &&
  plan.payload.settings.voicemail_pin.voicemail_to_text === 'YES' &&
  plan.payload.call_forwarding.incoming_calls.device_options[0].timeout === '20');

console.log('  --- an unchanged setting mixed with a changed one ---');
plan = planBulkUserUpdate(PERSON, { recording_automatic: 'off', transcription: true });
t('the run still goes ahead for the one that changed', plan.outcome === 'changed');
t('the already-correct one is listed separately',
  fields(plan.unchanged) === 'recording_automatic' && fields(plan.changes) === 'transcription');

console.log('  --- a person whose columns arrived as JSON strings ---');
plan = planBulkUserUpdate({
  ...PERSON,
  settings: JSON.stringify(PERSON.settings),
  call_forwarding: JSON.stringify(PERSON.call_forwarding),
  greetings: JSON.stringify(PERSON.greetings),
}, { transcription: true });
t('strings are parsed, so the write is not built on an empty record',
  plan.payload.settings.voicemail_pin.value === '4821');
t('and the payload goes back out as objects',
  typeof plan.payload.settings === 'object' && typeof plan.payload.call_forwarding === 'object');
t('greetings survive the round trip', plan.payload.greetings.voicemail.value === 'x.mp3');

console.log('  --- calling other countries, for many people at once ---');
t('a person with nothing stored follows the company',
  readInternationalCalling({}) === 'inherit');
t('a stored refusal reads as a refusal',
  readInternationalCalling({ international_calling: { allowed: false } }) === 'block');
t('a stored permission reads as a permission',
  readInternationalCalling({ international_calling: { allowed: true } }) === 'allow');
t('a half-written value falls back to the company rather than blocking anyone',
  readInternationalCalling({ international_calling: { allowed: 'no' } }) === 'inherit');

let intl = planBulkUserUpdate(
  { uuid: 'p1', settings: { transcription: true } },
  { international_calling: 'block' },
);
t('refusing somebody is a change', intl.outcome === 'changed');
t('and it is stored on their record',
  intl.payload.settings.international_calling.allowed === false);
t('while the rest of their settings survive', intl.payload.settings.transcription === true);
t('and the sentence says what moved',
  /not allowed to call other countries/.test(intl.changes[0].message));

intl = planBulkUserUpdate(
  { uuid: 'p1', settings: { international_calling: { allowed: false } } },
  { international_calling: 'block' },
);
t('somebody already refused is left alone', intl.outcome === 'unchanged' && intl.payload === null);

intl = planBulkUserUpdate(
  { uuid: 'p1', settings: { international_calling: { allowed: false }, transcription: true } },
  { international_calling: 'inherit' },
);
t('going back to the company setting removes the block entirely',
  'international_calling' in intl.payload.settings === false);
t('and still leaves everything else on the record',
  intl.payload.settings.transcription === true);

intl = planBulkUserUpdate(
  { uuid: 'p1', settings: { international_calling: { allowed: true, countries: ['FR'] } } },
  { international_calling: 'allow' },
);
t('a person already allowed is not written again', intl.outcome === 'unchanged');

/* This screen shows no per-country list, so it must not delete one. */
intl = planBulkUserUpdate(
  { uuid: 'p1', settings: { international_calling: { allowed: false, countries: [] } } },
  { international_calling: 'allow' },
);
t('allowing somebody stores a permission',
  intl.payload.settings.international_calling.allowed === true);

intl = planBulkUserUpdate({ uuid: 'p1', settings: {} }, { transcription: true });
t('a run that never mentions international calling does not touch it',
  'international_calling' in intl.payload.settings === false);

console.log('  --- saying how the run went ---');
t('the ordinary run reads as a success',
  describeRun({ changed: 12, unchanged: 0, skipped: 0, failed: 0 }) === 'Updated 12 people.');
t('one person is singular',
  describeRun({ changed: 1, unchanged: 0, skipped: 0, failed: 0 }) === 'Updated 1 person.');
t('a run that changed nothing says so rather than reporting a bare zero',
  describeRun({ changed: 0, unchanged: 0, skipped: 0, failed: 0 })
    === 'Nothing to do — no people were selected.');
t('people already set that way are counted, not hidden',
  describeRun({ changed: 2, unchanged: 3, skipped: 0, failed: 0 })
    === 'Updated 2 people. 3 people were already set that way.');
t('failures are named and never folded into the success count',
  describeRun({ changed: 2, unchanged: 0, skipped: 1, failed: 4 })
    === 'Updated 2 people. 1 person could not be changed. 4 people failed to save — please try again.');

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
