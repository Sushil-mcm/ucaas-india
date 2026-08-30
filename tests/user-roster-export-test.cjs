/* Proves the exported people list survives a spreadsheet.
 *
 * Most of these are about the boring half — commas in names, quotes in job
 * titles, a value that starts with an equals sign. Every one of them has the
 * same failure: the file opens, looks fine, and one column is silently wrong.
 * That is worse than a file that will not open at all, so it is the half that
 * gets the tests.
 */

const {
  buildRosterCsv,
  escapeCell,
  toExportRow,
  numbersOf,
  roleOf,
  exportDate,
  rosterFileName,
  EXPORT_COLUMNS,
  EXPORT_LIMITS,
} = require('./user-roster-export.build.cjs');

let passed = 0;
let failed = 0;

const is = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`);
  }
};

const ok = (name, actual) => is(name, Boolean(actual), true);

/* ---- one value at a time --------------------------------------------- */

is('an ordinary value is quoted', escapeCell('Amara'), '"Amara"');
is('a comma stays inside its own cell', escapeCell('Osei, Amara'), '"Osei, Amara"');
is('a quotation mark is doubled', escapeCell('The "boss"'), '"The ""boss"""');
is('a line break stays inside its own cell', escapeCell('one\ntwo'), '"one\ntwo"');
is('nothing becomes an empty cell', escapeCell(undefined), '""');
is('null becomes an empty cell', escapeCell(null), '""');
is('a number becomes text', escapeCell(1001), '"1001"');

/* A spreadsheet reads these four as formulas. The apostrophe is what the
   spreadsheet itself puts there when you type one, so the cell reads back as
   the text somebody actually typed. */
is('an equals sign is defused', escapeCell('=1+1'), `"'=1+1"`);
is('a plus is defused', escapeCell('+44 7700 900001'), `"'+44 7700 900001"`);
is('a minus is defused', escapeCell('-5'), `"'-5"`);
is('an at sign is defused', escapeCell('@SUM(A1)'), `"'@SUM(A1)"`);
/* An email address contains an at sign but does not start with one. Defusing it
   would put an apostrophe in front of every address in the file. */
is('an email address is left alone', escapeCell('a@b.com'), '"a@b.com"');

/* A joined list is defused on the same rule as any other value — a cell of
   numbers beginning "+44…" is exactly the case a spreadsheet tries to add up. */
is('a list is joined with spaces', escapeCell(['+441', '+442']), `"'+441 +442"`);
is('an empty list is an empty cell', escapeCell([]), '""');
is('blanks are dropped from a list', escapeCell(['+441', '', null]), `"'+441"`);
is('a list that needs no defusing gets none', escapeCell(['Sales', 'Ops']), '"Sales Ops"');

/* ---- reading a person ------------------------------------------------ */

const amara = {
  first_name: 'Amara',
  last_name: 'Osei',
  email: 'amara@example.com',
  role: 'AGENT',
  role_data: { name: 'AGENT' },
  job_title: 'Support',
  site: { name: 'London' },
  extension: 1001,
  caller_id: '+441234567890',
  assigned_did: [{ did_number: '+441234567890' }, { did_number: '+441111111111' }],
  created_at: '2026-03-04T09:15:00.000Z',
};

is('a name is joined', toExportRow(amara).name, 'Amara Osei');
is('a first name alone still reads', toExportRow({ first_name: 'Bo' }).name, 'Bo');
is('nobody at all is an empty name', toExportRow(null).name, '');
is('an extension arrives as text', toExportRow(amara).extension, '1001');
is('the location comes from the site', toExportRow(amara).location, 'London');
is('groups are taken from the caller', toExportRow(amara, ['Sales', 'Ops']).groups, ['Sales', 'Ops']);
is('no groups is an empty list', toExportRow(amara).groups, []);

/* A role the company made itself wins, the same order every screen reads them
   in — the other way round reports the parent role and disagrees with People. */
is('a custom role wins', roleOf({ role: 'AGENT', role_data: { name: 'AGENT' }, custom_role_data: { name: 'Night shift' } }), 'Night shift');
is('the shipped role is next', roleOf({ role: 'x', role_data: { name: 'AGENT' } }), 'AGENT');
is('the plain column is the last resort', roleOf({ role: 'AGENT' }), 'AGENT');
is('no role reads as empty', roleOf({}), '');

/* The caller ID and the assigned number are usually the same number. Listing it
   twice makes it look like the person has two. */
is('numbers are collected without repeats', numbersOf(amara), ['+441234567890', '+441111111111']);
is('a single record is handled too', numbersOf({ assigned_did: { did_number: '+4422' } }), ['+4422']);
is('a bare string is handled too', numbersOf({ assigned_did: '+4433' }), ['+4433']);
is('nobody with a number gives an empty list', numbersOf({}), []);
is('nothing at all gives an empty list', numbersOf(null), []);

/* ---- dates ------------------------------------------------------------ */

is('a date becomes an unambiguous day', exportDate('2026-03-04T09:15:00.000Z'), '2026-03-04');
is('a plain day survives', exportDate('2026-03-04'), '2026-03-04');
/* "Invalid Date" in a cell reads as a fault in the data rather than a gap. */
is('nonsense becomes an empty cell', exportDate('not a date'), '');
is('nothing becomes an empty cell', exportDate(''), '');
is('null becomes an empty cell', exportDate(null), '');
is('the newer key is read as well', toExportRow({ createdAt: '2026-03-04' }).addedOn, '2026-03-04');

/* ---- the whole file --------------------------------------------------- */

const csv = buildRosterCsv([toExportRow(amara, ['Sales'])]);
const lines = csv.split('\r\n');

is('the columns are the ones agreed', EXPORT_COLUMNS.length, 9);
is(
  'the heading row reads like the People page',
  lines[0],
  '"Name","Email","Role","Job title","Location","Extension","Numbers","Groups","Added on"',
);
is('one person is one row', lines.length, 2);
is(
  'and every column lands where it should',
  lines[1],
  `"Amara Osei","amara@example.com","AGENT","Support","London","1001","'+441234567890 +441111111111","Sales","2026-03-04"`,
);

/* Rows are separated by CRLF, which is what the rule says and what the older
   spreadsheet programs still need. */
ok('rows are separated the way spreadsheets expect', csv.includes('\r\n'));

/* A company with nobody in it should still get a file that opens and has
   columns. An empty file reads as a failed export. */
const empty = buildRosterCsv([]);
is('nobody still gives a heading row', empty.split('\r\n').length, 1);
is('no list at all behaves the same', buildRosterCsv(null), empty);

/* The comma test, end to end: a name with a comma in it must not shift every
   following column by one. */
const commas = buildRosterCsv([
  toExportRow({ first_name: 'Osei, Amara', email: 'a@b.com', role: 'AGENT' }),
]);
is('a comma in a name does not shift the columns', commas.split('\r\n')[1].split('","').length, 9);

/* ---- what the file is called ------------------------------------------ */

is('the company and the day are both in it', rosterFileName('Acme Ltd', '2026-03-04'), 'acme-ltd-people-2026-03-04.csv');
is('punctuation is dropped from the name', rosterFileName('A/B: Co.', '2026-03-04'), 'a-b-co-people-2026-03-04.csv');
is('no company name still names the file', rosterFileName('', '2026-03-04'), 'people-2026-03-04.csv');
is('an unreadable date does not break the name', rosterFileName('Acme', 'nope'), 'acme-people-export.csv');
ok(
  'a very long company name is cut short',
  rosterFileName('a'.repeat(200), '2026-03-04').length < 70,
);

/* ---- what the file honestly leaves out --------------------------------- */

is('three gaps are named', EXPORT_LIMITS.length, 3);
ok('each one says why', EXPORT_LIMITS.every((limit) => limit.label && limit.why));
ok(
  'and the waiting-to-accept gap explains there is no invitation',
  EXPORT_LIMITS.find((limit) => limit.id === 'state').why.includes('no invitation'),
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
