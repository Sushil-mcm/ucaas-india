/* Folding a split "Company Default" record back into one.
 *
 *   node backend-patches/tenant-api/tests/company-defaults-test.cjs
 *
 * Only the folding rule is tested here — the part with no database in it. The
 * reading, the caching and the list injection are all thin wrappers around it
 * and are checked by hand against a live company, as the README describes.
 */

/* companyDefaults.ts talks to the database, so two modules have to be stood in
   for before it can be loaded outside the service. Neither is used by the
   folding rule; this is only so the file can be required at all. */
const Module = require('module');
const realLoad = Module._load;
Module._load = function stubbedLoad(request, parent, isMain) {
  if (request === 'sequelize') return { QueryTypes: { SELECT: 'SELECT' } };
  if (request === '@/config/database') {
    return {
      default: () => { throw new Error('the database is not reachable from a test'); },
      __esModule: true,
    };
  }
  return realLoad(request, parent, isMain);
};

const {
  COMPANY_DEFAULT_TEMPLATE_NAME,
  mergeCompanyDefaultRows,
} = require('./company-defaults.build.cjs');

Module._load = realLoad;

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

console.log('  --- nothing to fold ---');
t('no rows means no company record', mergeCompanyDefaultRows([]) === null);
t('not a list means no company record', mergeCompanyDefaultRows(null) === null);

console.log('  --- one row ---');
const one = mergeCompanyDefaultRows([{
  uuid: 'row-1',
  created_by: 'admin-a',
  updated_at: '2026-08-01T10:00:00Z',
  settings: { company_policies: { recording_access: { own: false } } },
  greetings: {},
}]);
t('the row is returned as it stands', one.settings.company_policies.recording_access.own === false);
t('and it is the row a save goes back to', one.uuid === 'row-1');
t('the reserved name is used, not whatever was stored', one.name === COMPANY_DEFAULT_TEMPLATE_NAME);
t('and it says it came from one row', one.sourceRowCount === 1);

console.log('  --- the settings column has been written both ways ---');
const asText = mergeCompanyDefaultRows([{
  uuid: 'row-1',
  updated_at: '2026-08-01T10:00:00Z',
  settings: '{"company_policies":{"recording_mode":"all"}}',
  greetings: '{}',
}]);
t('a JSON string is read the same as an object',
  asText.settings.company_policies.recording_mode === 'all');
t('unreadable JSON becomes nothing set, not a crash',
  mergeCompanyDefaultRows([{ uuid: 'x', settings: '{oh dear', greetings: null }])
    .settings.company_policies === undefined);

console.log('  --- two rows, which is the real split we found live ---');
/* Taken from company mcm_1787814329776 on 30 August 2026: one admin's row held
   the policies, another admin's row held everything else, and neither admin
   could see the other's. */
const split = mergeCompanyDefaultRows([
  {
    uuid: 'older',
    created_by: 'admin-a',
    updated_at: '2026-08-28T13:48:39Z',
    settings: { company_holidays: ['christmas'], company_policies: { recording_mode: 'all' } },
    greetings: { voicemail: 'old.wav' },
  },
  {
    uuid: 'newer',
    created_by: 'admin-b',
    updated_at: '2026-08-29T12:19:20Z',
    settings: { role: 'AGENT', voicemail_pin: '1234', company_holidays: ['new year'] },
    greetings: {},
  },
]);
t('the older admin\'s policies survive', split.settings.company_policies.recording_mode === 'all');
t('the newer admin\'s settings survive', split.settings.voicemail_pin === '1234');
t('where both set the same thing, the newer one wins',
  JSON.stringify(split.settings.company_holidays) === JSON.stringify(['new year']));
t('a save goes back to the newer row', split.uuid === 'newer');
t('greetings are folded the same way', split.greetings.voicemail === 'old.wav');
t('and it reports that it folded two rows', split.sourceRowCount === 2);

console.log('  --- the order rows arrive in must not matter ---');
const reversed = mergeCompanyDefaultRows([
  { uuid: 'newer', updated_at: '2026-08-29T12:19:20Z', settings: { shared: 'newer' }, greetings: {} },
  { uuid: 'older', updated_at: '2026-08-28T13:48:39Z', settings: { shared: 'older' }, greetings: {} },
]);
t('newest still wins when the newest is listed first', reversed.settings.shared === 'newer');
t('and the newest is still the row to save to', reversed.uuid === 'newer');

console.log('  --- a row nobody can date ---');
const undated = mergeCompanyDefaultRows([
  { uuid: 'dated', updated_at: '2026-08-29T12:19:20Z', settings: { shared: 'dated' }, greetings: {} },
  { uuid: 'undated', updated_at: null, settings: { shared: 'undated', only_here: true }, greetings: {} },
]);
t('a row with no date never wins a clash', undated.settings.shared === 'dated');
t('but what only it holds is still kept', undated.settings.only_here === true);
t('and a save goes to the dated row', undated.uuid === 'dated');

console.log('  --- whole sections, not individual fields ---');
/* Each screen writes its whole section at once. Fusing two versions of one
   section field by field would produce a setting nobody ever chose. */
const sections = mergeCompanyDefaultRows([
  { uuid: 'a', updated_at: '2026-01-01T00:00:00Z',
    settings: { company_policies: { recording_mode: 'all', default_language: 'en-GB' } }, greetings: {} },
  { uuid: 'b', updated_at: '2026-02-01T00:00:00Z',
    settings: { company_policies: { recording_mode: 'off' } }, greetings: {} },
]);
t('the newer whole section replaces the older whole section',
  sections.settings.company_policies.recording_mode === 'off' &&
  sections.settings.company_policies.default_language === undefined);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
