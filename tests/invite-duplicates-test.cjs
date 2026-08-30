/* Proves what the invite form catches before it sends anything.
 *
 * Two halves matter equally. One is that a repeated person is found — the
 * platform will not find it, because neither row has been saved yet. The other
 * is that a form full of perfectly ordinary people reports nothing: a warning
 * that fires on a clean list is worse than no warning, because the next real
 * one gets clicked through.
 */

const {
  findInviteClashes,
  clashesForRow,
  clashForField,
  blocksInvite,
  summariseClashes,
  nameOfPerson,
  explainTakenEmail,
} = require('./invite-duplicates.build.cjs');

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
const notOk = (name, actual) => is(name, Boolean(actual), false);

const kinds = (clashes) => clashes.map((clash) => clash.kind);
const rowsOf = (clashes) => clashes.map((clash) => clash.row);

/* Already on the account. */
const amara = {
  uuid: 'u-1',
  first_name: 'Amara',
  last_name: 'Osei',
  email: 'amara@example.com',
  extension: '1001',
  site: { name: 'London' },
};
const bo = { uuid: 'u-2', first_name: 'Bo', email: 'bo@example.com', extension: '1002' };
const ROSTER = [amara, bo];

/* ---- naming somebody ------------------------------------------------- */

is('a full name reads', nameOfPerson(amara), 'Amara Osei');
is('a first name alone reads', nameOfPerson(bo), 'Bo');
is('no name falls back to the email', nameOfPerson({ email: 'x@y.com' }), 'x@y.com');
is('nothing at all still reads', nameOfPerson({}), 'somebody already on the account');
is('nothing passed still reads', nameOfPerson(null), 'somebody already on the account');

/* ---- a clean invite reports nothing ---------------------------------- */

const clean = findInviteClashes({
  rows: [
    { first_name: 'Cai', email: 'cai@example.com', extension: '1010', phone: '447700900001' },
    { first_name: 'Dee', email: 'dee@example.com', extension: '1011', phone: '447700900002' },
  ],
  roster: ROSTER,
});
is('three new people report nothing', clean, []);
notOk('and nothing is blocked', blocksInvite(clean));
is('and there is nothing to say', summariseClashes(clean), '');

is('an empty form reports nothing', findInviteClashes({ rows: [] }), []);
is('no form at all reports nothing', findInviteClashes({}), []);
is('a roster on its own reports nothing', findInviteClashes({ roster: ROSTER }), []);

/* Blank fields are somebody part-way through typing, not a duplicate. Two rows
   with empty emails must never be reported as the same person. */
const halfTyped = findInviteClashes({
  rows: [{ first_name: 'Cai' }, { first_name: 'Dee' }, { email: '', extension: '' }],
  roster: ROSTER,
});
is('empty fields are not duplicates of each other', halfTyped, []);

/* ---- the same person twice in one batch ------------------------------ */

const twice = findInviteClashes({
  rows: [
    { email: 'cai@example.com', extension: '1010' },
    { email: 'cai@example.com', extension: '1011' },
  ],
});
is('a repeated email is caught', kinds(twice), ['email-twice']);
/* Only the second row is flagged: flagging both reads as two problems and
   leaves an administrator wondering which of the two is the wrong one. */
is('and only the second row is flagged', rowsOf(twice), [1]);
ok('naming the row it repeats, counting from one', twice[0].message.includes('row 1'));

is(
  'case and spacing do not hide a repeat',
  kinds(findInviteClashes({ rows: [{ email: 'Cai@Example.com ' }, { email: ' cai@example.com' }] })),
  ['email-twice'],
);

is(
  'a repeated extension is caught',
  kinds(findInviteClashes({ rows: [{ extension: '1010' }, { extension: '1010' }] })),
  ['extension-twice'],
);

/* An extension typed as "1010" and as " 1010 " is the same extension. */
is(
  'punctuation does not hide a repeated extension',
  kinds(findInviteClashes({ rows: [{ extension: '1010' }, { extension: ' 1010' }] })),
  ['extension-twice'],
);

/* The same phone written two ways is the same phone. */
is(
  'a repeated phone is caught however it was typed',
  kinds(
    findInviteClashes({
      rows: [{ phone: '+44 7700 900001' }, { phone: '447700900001' }],
    }),
  ),
  ['phone-twice'],
);

/* Three of the same only reports the two repeats, both pointing at row 1. */
const thrice = findInviteClashes({
  rows: [{ email: 'a@b.com' }, { email: 'a@b.com' }, { email: 'a@b.com' }],
});
is('three of the same gives two reports', rowsOf(thrice), [1, 2]);
ok('both pointing back at the first', thrice[1].message.includes('row 1'));

/* ---- somebody already on the account --------------------------------- */

const known = findInviteClashes({
  rows: [{ email: 'amara@example.com', extension: '1050' }],
  roster: ROSTER,
});
is('an email already on the account is caught', kinds(known), ['email-taken']);
ok('and the person is named', known[0].message.includes('Amara Osei'));
ok('with where they sit', known[0].message.includes('London'));
ok('and what to do instead', known[0].message.includes('change their location'));

const knownNoSite = findInviteClashes({
  rows: [{ email: 'bo@example.com' }],
  roster: ROSTER,
});
ok('somebody with no location is still named', knownNoSite[0].message.includes('Bo'));
notOk('without inventing a location', knownNoSite[0].message.includes(' at '));

const takenExtension = findInviteClashes({
  rows: [{ email: 'new@example.com', extension: '1001' }],
  roster: ROSTER,
});
is('an extension already in use is caught', kinds(takenExtension), ['extension-taken']);
ok('naming who it rings today', takenExtension[0].message.includes('Amara Osei'));

/* An extension is a clash over a thing, not evidence of the same person: the
   person replacing a leaver is very often given their old extension, and that
   must read as "pick another", never as "you already added them". */
notOk(
  'a taken extension does not claim the person already exists',
  takenExtension[0].message.includes('cannot be added a second time'),
);

/* ---- both kinds at once ---------------------------------------------- */

const messy = findInviteClashes({
  rows: [
    { email: 'amara@example.com', extension: '1060' },
    { email: 'cai@example.com', extension: '1061' },
    { email: 'cai@example.com', extension: '1001' },
  ],
  roster: ROSTER,
});
is('every problem is reported in row order', kinds(messy), [
  'email-taken',
  'email-twice',
  'extension-taken',
]);
is('rows come back in order', rowsOf(messy), [0, 2, 2]);

is('the clashes on one row can be picked out', clashesForRow(messy, 2).length, 2);
is('a clean row has none', clashesForRow(messy, 1).length, 0);
is('one field of one row can be picked out', clashForField(messy, 2, 'email').kind, 'email-twice');
is('a clean field gives nothing', clashForField(messy, 1, 'email'), null);
is('a field nobody complained about gives nothing', clashForField(messy, 0, 'phone'), null);

ok('and the whole thing is blocked', blocksInvite(messy));

/* ---- the line at the top --------------------------------------------- */

ok(
  'both kinds together says both',
  summariseClashes(messy).includes('already on the account') &&
    summariseClashes(messy).includes('appear twice'),
);
ok(
  'one existing person reads as one',
  summariseClashes(known).startsWith('One of these people is already on the account'),
);
ok(
  'several existing people read as several',
  summariseClashes(
    findInviteClashes({
      rows: [{ email: 'amara@example.com' }, { email: 'bo@example.com' }],
      roster: ROSTER,
    }),
  ).startsWith('Some of these people'),
);
ok('one repeat reads as one', summariseClashes(twice).startsWith('One row repeats'));
ok('several repeats read as several', summariseClashes(thrice).startsWith('Some rows repeat'));
is('nothing wrong says nothing', summariseClashes([]), '');

/* ---- explaining what the platform said -------------------------------- */

const inHouse = explainTakenEmail('AMARA@example.com ', ROSTER);
ok('a colleague is named', inHouse.includes('Amara Osei'));
ok('with their location', inHouse.includes('London'));

const stranger = explainTakenEmail('someone@other-company.com', ROSTER);
ok('an address outside the company says so', stranger.includes('not by anybody in your company'));
ok('and explains why the platform said otherwise', stranger.includes('every organisation'));
notOk('without sending anybody hunting for them', stranger.includes('change their location'));

is('nothing to explain explains nothing', explainTakenEmail('', ROSTER), '');
ok('no roster still explains the stranger case', explainTakenEmail('x@y.com', null).includes('not by anybody in your company'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
