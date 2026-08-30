/* The whole thing running, with a pretend database.
 *
 *   node backend-patches/tenant-api/tests/filter-smoke-test.cjs <path-to-tenant-api/dist>
 *
 * The two tests next door prove the rules on their own. This one proves the
 * built service actually behaves: it loads the compiled middleware, hands it a
 * request and a pretend company record, and checks what comes out the other end.
 * It stands in a fake database, so it touches nothing real and can be run against
 * a build on a laptop.
 *
 * The case that matters most is the last but one: when the database will not
 * answer, the call log must still load with every recording in it. A company rule
 * that cannot be read must never be the reason somebody's screen is empty.
 */

const path = require('path');

const DIST = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..', 'tenant-api', 'dist'));

let db;
try {
  db = require.resolve(path.join(DIST, 'config', 'database.js'));
} catch (error) {
  console.error(`Could not find a build at ${DIST}.`);
  console.error('Build tenant-api first (npx tsc && npx tsc-alias), then pass its dist folder:');
  console.error('  node backend-patches/tenant-api/tests/filter-smoke-test.cjs /path/to/tenant-api/dist');
  process.exit(2);
}

/* Swapped in before anything can require the real one. */
let queryResult = [];
const fakeSequelize = { query: async () => queryResult };
require.cache[db] = {
  id: db,
  filename: db,
  loaded: true,
  exports: {
    __esModule: true,
    default: () => fakeSequelize,
    getSequelizeInstanceCache: () => fakeSequelize,
  },
};

const { RecordingAccessFilter } = require(path.join(DIST, 'middlewares', 'RecordingAccessFilter.js'));
const { invalidateCompanyDefaults, fetchCompanyDefaults } = require(path.join(DIST, 'helpers', 'companyDefaults.js'));

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

const rows = () => ([
  { id: 1, extension: '1001', recording_file: 'mine.wav', recording_file_url: 'mine.wav' },
  { id: 2, extension: '1002', recording_file: 'theirs.wav', recording_file_url: 'theirs.wav' },
]);

const run = async (headers) => {
  invalidateCompanyDefaults();
  const req = { headers, method: 'POST', originalUrl: '/api/v1/report/call-list' };
  let sent = null;
  const res = { json: (body) => { sent = body; return res; }, status: () => res };
  await new Promise((resolve) => RecordingAccessFilter(req, res, resolve));
  res.json({ success: true, data: { result: { rows: rows() } } });
  return sent;
};

const HEADERS_PERSON = { 'x-db-name': 'mcm_test', 'x-user-role': 'USER', 'x-user-extension': '1001' };
const HEADERS_ADMIN = { 'x-db-name': 'mcm_test', 'x-user-role': 'ADMIN', 'x-user-extension': '1001' };

(async () => {
  console.log('  --- a company that has never opened the Policies screen ---');
  queryResult = [];
  let out = await run(HEADERS_PERSON);
  t('every recording is still there', out.data.result.rows[0].recording_file === 'mine.wav');

  console.log('  --- a company record that says nothing about recordings ---');
  queryResult = [{ uuid: 'a', updated_at: '2026-01-01', settings: { company_holidays: [] }, greetings: {} }];
  out = await run(HEADERS_PERSON);
  t('still untouched', out.data.result.rows[0].recording_file === 'mine.wav');

  console.log('  --- "people may play their own calls" switched off ---');
  queryResult = [{ uuid: 'a', updated_at: '2026-01-01',
    settings: { company_policies: { recording_access: { own: false } } }, greetings: {} }];
  out = await run(HEADERS_PERSON);
  t('my own recording is withheld', out.data.result.rows[0].recording_file === null);
  t('a colleague\'s is left alone — that is a different rule',
    out.data.result.rows[1].recording_file === 'theirs.wav');

  console.log('  --- "admins may play anyone\'s calls" switched off ---');
  queryResult = [{ uuid: 'a', updated_at: '2026-01-01',
    settings: { company_policies: { recording_access: { admins_all: false } } }, greetings: {} }];
  out = await run(HEADERS_ADMIN);
  t('the admin keeps their own call', out.data.result.rows[0].recording_file === 'mine.wav');
  t('the admin loses a colleague\'s call', out.data.result.rows[1].recording_file === null);
  out = await run(HEADERS_PERSON);
  t('an ordinary person is not affected by the admin rule',
    out.data.result.rows[1].recording_file === 'theirs.wav');

  console.log('  --- a company whose record is split across two rows ---');
  queryResult = [
    { uuid: 'older', updated_at: '2026-08-28T13:48:39Z',
      settings: { company_policies: { recording_access: { own: false } } }, greetings: {} },
    { uuid: 'newer', updated_at: '2026-08-29T12:19:20Z',
      settings: { voicemail_pin: '1234' }, greetings: {} },
  ];
  out = await run(HEADERS_PERSON);
  t('a rule written on the older row is still enforced',
    out.data.result.rows[0].recording_file === null);
  const merged = await fetchCompanyDefaults('mcm_test');
  t('and the next save goes to the newer row', merged.uuid === 'newer');

  console.log('  --- the database will not answer ---');
  fakeSequelize.query = async () => { throw new Error('connection refused'); };
  out = await run(HEADERS_PERSON);
  t('the call log still loads, with every recording in it',
    out.data.result.rows[0].recording_file === 'mine.wav');
  fakeSequelize.query = async () => queryResult;

  console.log('  --- a request with no company on it ---');
  queryResult = [{ uuid: 'a', updated_at: '2026-01-01',
    settings: { company_policies: { recording_access: { own: false } } }, greetings: {} }];
  out = await run({ 'x-user-role': 'USER' });
  t('nothing is touched', out.data.result.rows[0].recording_file === 'mine.wav');

  console.log('  --- an answer with no recordings in it ---');
  invalidateCompanyDefaults();
  const req = {
    headers: HEADERS_PERSON,
    method: 'POST',
    originalUrl: '/api/v1/contact/list',
  };
  let sent = null;
  const res = { json: (body) => { sent = body; return res; }, status: () => res };
  await new Promise((resolve) => RecordingAccessFilter(req, res, resolve));
  const original = { success: true, data: { result: { rows: [{ name: 'Ada' }] } } };
  res.json(original);
  t('it is handed on as the very same object, not a copy', sent === original);

  console.log(`\n    ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
