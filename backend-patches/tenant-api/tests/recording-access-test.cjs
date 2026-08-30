/* Who may hear a recording back — the server's copy of the rule.
 *
 *   node backend-patches/tenant-api/tests/recording-access-test.cjs
 *
 * Rebuild first if the TypeScript changed; the command is in the README next
 * door. Same plain-Node style as the tests in /tests.
 */

const {
  PERMISSIVE_RECORDING_ACCESS,
  readRecordingAccessPolicy,
  isRecordingAccessRestricted,
  ownershipOf,
  mayHearRecording,
  scrubRecordings,
  isExtensionDialTarget,
  normalizeExtension,
} = require('./recording-access.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

const OPEN = { own: true, adminsAll: true };
const NO_OWN = { own: false, adminsAll: true };
const NO_ADMIN_ALL = { own: true, adminsAll: false };
const CLOSED = { own: false, adminsAll: false };

console.log('  --- reading the saved answers ---');
t('nothing saved at all reads as allowed',
  readRecordingAccessPolicy(undefined).own === true &&
  readRecordingAccessPolicy(undefined).adminsAll === true);
t('an empty company record reads as allowed',
  readRecordingAccessPolicy({}).own === true);
t('a record with other sections but no policies reads as allowed',
  readRecordingAccessPolicy({ company_security: { mfa_required: true } }).adminsAll === true);
t('a policies section with no recording answers reads as allowed',
  readRecordingAccessPolicy({ company_policies: { recording_mode: 'off' } }).own === true);
t('a deliberate false is honoured',
  readRecordingAccessPolicy({ company_policies: { recording_access: { own: false } } }).own === false);
t('the two answers are read separately', (() => {
  const p = readRecordingAccessPolicy({
    company_policies: { recording_access: { own: true, admins_all: false } },
  });
  return p.own === true && p.adminsAll === false;
})());
t('a string "false" is NOT a false — only a real boolean restricts',
  readRecordingAccessPolicy({ company_policies: { recording_access: { own: 'false' } } }).own === true);
t('null reads as allowed',
  readRecordingAccessPolicy({ company_policies: { recording_access: { own: null } } }).own === true);
t('rubbish in the settings column does not throw',
  readRecordingAccessPolicy('not json at all').own === true);
t('an array where an object belongs reads as allowed',
  readRecordingAccessPolicy({ company_policies: [1, 2, 3] }).own === true);
t('the shipped default is allow-everything',
  PERMISSIVE_RECORDING_ACCESS.own === true && PERMISSIVE_RECORDING_ACCESS.adminsAll === true);

console.log('  --- is anything switched off at all ---');
t('nothing switched off means do not touch the request',
  isRecordingAccessRestricted(OPEN) === false);
t('own switched off counts', isRecordingAccessRestricted(NO_OWN) === true);
t('admins switched off counts', isRecordingAccessRestricted(NO_ADMIN_ALL) === true);

console.log('  --- what counts as one of our extensions ---');
t('a four digit extension does', isExtensionDialTarget('1001'));
t('a five digit extension does', isExtensionDialTarget('10015'));
t('a full phone number does not', isExtensionDialTarget('+441632960123') === false);
t('a star code does not', isExtensionDialTarget('*97') === false);
t('a sip address is reduced to its user part', isExtensionDialTarget('sip:1001@example.com'));
t('a web device suffix is ignored', isExtensionDialTarget('1001_web'));
t('empty is not an extension', isExtensionDialTarget('') === false);
t('extensions are compared as trimmed text', normalizeExtension('  1001 ') === '1001');

console.log('  --- whose call is it ---');
t('a call I placed is mine',
  ownershipOf({ direction: 'Outbound', extension: '1001' }, '1001') === 'own');
t('a call dialled to me is mine',
  ownershipOf({ direction: 'Inbound', destination_number: '1001' }, '1001') === 'own');
t('a call forwarded to my extension is mine',
  ownershipOf({ forward_type: 'EXTENSION', forward_value: '1001' }, '1001') === 'own');
t('a call forwarded to my voicemail is mine',
  ownershipOf({ forward_type: 'VOICEMAIL', forward_value: '1001' }, '1001') === 'own');
t('a colleague\'s call is somebody else\'s',
  ownershipOf({ extension: '1002' }, '1001') === 'other');
t('a queue call names the queue, so it cannot be decided',
  ownershipOf({ forward_type: 'QUEUE', forward_value: 'a-uuid-here',
                caller_id_number: '+441632960123' }, '1001') === 'unknown');
t('an outside number on both sides cannot be decided',
  ownershipOf({ caller_id_number: '+441632960123',
                destination_number: '+441632960999' }, '1001') === 'unknown');
t('not knowing my own extension means nothing can be decided',
  ownershipOf({ extension: '1001' }, '') === 'unknown');
t('a missing row cannot be decided', ownershipOf(null, '1001') === 'unknown');

console.log('  --- the decision ---');
t('with nothing switched off, anybody may hear anything',
  mayHearRecording(OPEN, 'own', false) &&
  mayHearRecording(OPEN, 'other', false) &&
  mayHearRecording(OPEN, 'unknown', true));
t('own switched off stops a person hearing their own call',
  mayHearRecording(NO_OWN, 'own', false) === false);
t('own switched off does NOT stop an admin who may hear everything',
  mayHearRecording(NO_OWN, 'own', true) === true);
t('admins switched off stops an admin hearing somebody else\'s call',
  mayHearRecording(NO_ADMIN_ALL, 'other', true) === false);
t('admins switched off leaves an admin their own calls',
  mayHearRecording(NO_ADMIN_ALL, 'own', true) === true);
t('admins switched off does not touch an ordinary person',
  mayHearRecording(NO_ADMIN_ALL, 'other', false) === true);
t('with both switched off, even an admin loses their own call',
  mayHearRecording(CLOSED, 'own', true) === false);
t('an undecidable call is never withheld from an ordinary person',
  mayHearRecording(NO_OWN, 'unknown', false) === true);
t('an undecidable call is never withheld from an admin',
  mayHearRecording(CLOSED, 'unknown', true) === true);

console.log('  --- scrubbing a real response ---');
const buildResponse = () => ({
  success: true,
  data: {
    message: 'Success',
    result: {
      totalItems: 3,
      rows: [
        { id: 1, extension: '1001', direction: 'Outbound',
          recording_file: 'mine.wav', recording_file_url: 'mine.wav', duration: 42 },
        { id: 2, extension: '1002', direction: 'Outbound',
          recording_file: 'theirs.wav', recording_file_url: 'theirs.wav', duration: 15 },
        { id: 3, forward_type: 'QUEUE', forward_value: 'queue-uuid',
          caller_id_number: '+441632960123',
          recording_file: 'queue.wav', recording_file_url: 'queue.wav', duration: 60 },
      ],
    },
  },
});

let body = buildResponse();
let withheld = scrubRecordings(body, NO_OWN, { extension: '1001', isAdmin: false });
t('my own call is withheld when own is off', body.data.result.rows[0].recording_file === null);
t('and the address alongside it goes too', body.data.result.rows[0].recording_file_url === null);
t('a colleague\'s call is untouched — that is a different rule',
  body.data.result.rows[1].recording_file === 'theirs.wav');
t('an undecidable call is left alone', body.data.result.rows[2].recording_file === 'queue.wav');
t('one call counts once however many fields pointed at it', withheld === 1);
t('everything else on the row survives',
  body.data.result.rows[0].duration === 42 && body.data.result.rows[0].extension === '1001');
t('the shape of the answer is unchanged',
  body.success === true && body.data.result.totalItems === 3 && body.data.result.rows.length === 3);

body = buildResponse();
withheld = scrubRecordings(body, NO_ADMIN_ALL, { extension: '1001', isAdmin: true });
t('an admin keeps their own call when only "admins" is off',
  body.data.result.rows[0].recording_file === 'mine.wav');
t('an admin loses a colleague\'s call', body.data.result.rows[1].recording_file === null);
t('an admin keeps an undecidable call', body.data.result.rows[2].recording_file === 'queue.wav');
t('one recording withheld', withheld === 1);

body = buildResponse();
withheld = scrubRecordings(body, OPEN, { extension: '1001', isAdmin: false });
t('with nothing switched off, nothing is withheld', withheld === 0);
t('and every file name is still there',
  body.data.result.rows.every((r) => typeof r.recording_file === 'string'));

body = buildResponse();
scrubRecordings(body, CLOSED, { extension: '1001', isAdmin: true });
t('with both off, an admin loses their own AND their colleague\'s',
  body.data.result.rows[0].recording_file === null &&
  body.data.result.rows[1].recording_file === null);

console.log('  --- awkward payloads ---');
t('an empty object does not throw', scrubRecordings({}, CLOSED, { extension: '1', isAdmin: false }) === 0);
t('null does not throw', scrubRecordings(null, CLOSED, { extension: '1', isAdmin: false }) === 0);
t('a row nested unusually deep is still reached', (() => {
  const deep = { a: { b: { c: { d: [{ extension: '1001', recording_file: 'x.wav' }] } } } };
  scrubRecordings(deep, NO_OWN, { extension: '1001', isAdmin: false });
  return deep.a.b.c.d[0].recording_file === null;
})());
t('a single call returned on its own is handled', (() => {
  const one = { success: true, data: { result: { extension: '1001', recording_file: 'x.wav' } } };
  scrubRecordings(one, NO_OWN, { extension: '1001', isAdmin: false });
  return one.data.result.recording_file === null;
})());
t('a row with an empty file name is not counted as withheld',
  scrubRecordings({ extension: '1001', recording_file: null },
                  NO_OWN, { extension: '1001', isAdmin: false }) === 0);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
