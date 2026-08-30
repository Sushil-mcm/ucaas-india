/* Proves what the removal check finds, and — just as important — what it does
 * not. A warning that fires on everybody is ignored within a week, so the cases
 * where nothing should be reported are tested as carefully as the cases where
 * something should.
 */

const {
  checkRemoval,
  isAdmin,
  isSamePerson,
  sortImpacts,
  blocksRemoval,
  countByLevel,
  summarise,
  nameOf,
} = require('./removal.build.cjs');

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

const codes = (impacts) => impacts.map((i) => i.code);

const amara = {
  uuid: 'u-1',
  extension: '1001',
  first_name: 'Amara',
  last_name: 'Osei',
  email: 'amara@example.com',
  role: 'ADMIN',
};
const bo = { uuid: 'u-2', extension: '1002', first_name: 'Bo', email: 'bo@example.com', role: 'USER' };

/* ---- reading a person ------------------------------------------------ */

is('a full name reads', nameOf(amara), 'Amara Osei');
is('no name falls back to the email', nameOf({ email: 'x@y.com' }), 'x@y.com');
is('nothing at all still reads', nameOf({}), 'this person');

is('plain role', isAdmin({ role: 'ADMIN' }), true);
is('lower case still counts', isAdmin({ role: 'admin' }), true);
/* A custom role wins over the plain one, the same order the people list uses —
   read them in a different order here and the check silently stops firing. */
is('custom role wins', isAdmin({ role: 'ADMIN', custom_role_data: { name: 'Agent' } }), false);
is('role data counts', isAdmin({ role_data: { name: 'Admin' } }), true);
is('no role is not admin', isAdmin({}), false);

is('same uuid is the same person', isSamePerson({ uuid: 'a' }, { uuid: 'a' }), true);
is('user_uuid matches uuid', isSamePerson({ user_uuid: 'a' }, { uuid: 'a' }), true);
is('email is the fallback', isSamePerson({ email: 'A@b.com' }, { email: 'a@b.com' }), true);
is('different people are different', isSamePerson({ uuid: 'a' }, { uuid: 'b' }), false);
is('two blanks are not a match', isSamePerson({}, {}), false);

/* ---- the lockout ----------------------------------------------------- */

const onlyAdmin = checkRemoval({ person: amara, everyone: [amara, bo] });
is('the only admin is flagged', codes(onlyAdmin).includes('last-admin'), true);
is('and it blocks', blocksRemoval(onlyAdmin), true);

const twoAdmins = checkRemoval({
  person: amara,
  everyone: [amara, { ...bo, role: 'ADMIN' }],
});
is('a second admin means no lockout', codes(twoAdmins).includes('last-admin'), false);
is('and nothing blocks', blocksRemoval(twoAdmins), false);

/* The person being removed must not be counted as their own replacement — the
   list always contains them, so this is the mistake that would disable the
   check entirely. */
const selfOnly = checkRemoval({ person: amara, everyone: [{ ...amara }] });
is('they do not count as their own replacement', codes(selfOnly).includes('last-admin'), true);

is('removing a non-admin never locks anybody out', codes(checkRemoval({ person: bo, everyone: [bo] })).includes('last-admin'), false);

/* ---- queues ---------------------------------------------------------- */

const soleAgent = checkRemoval({
  person: bo,
  queues: [{ name: 'Support', members: [{ user_uuid: 'u-2' }] }],
});
is('the last agent on a queue stops calls', codes(soleAgent), ['queue-last-agent']);
is('and it is named', soleAgent[0].where, 'Support');
is('but it does not block', blocksRemoval(soleAgent), false);

const oneOfThree = checkRemoval({
  person: bo,
  queues: [{ name: 'Support', members: [{ user_uuid: 'u-2' }, { user_uuid: 'u-3' }, { user_uuid: 'u-4' }] }],
});
is('one of several is only worth knowing', codes(oneOfThree), ['queue-member']);
is('and it counts who is left', oneOfThree[0].message.includes('2 other people stay'), true);

is(
  'a queue they are not on says nothing',
  codes(checkRemoval({ person: bo, queues: [{ name: 'Sales', members: [{ user_uuid: 'u-9' }] }] })),
  [],
);
is(
  'members matched by extension too',
  codes(checkRemoval({ person: bo, queues: [{ name: 'Support', members: [{ extension: '1002' }] }] })),
  ['queue-last-agent'],
);
/* Somebody with no extension must not match every member row that also lacks
   one, or removing them would appear to empty every queue in the company. */
is(
  'a blank extension matches nobody',
  codes(checkRemoval({ person: { uuid: 'u-7' }, queues: [{ name: 'Support', members: [{ extension: '' }] }] })),
  [],
);
is('a queue with no members says nothing', codes(checkRemoval({ person: bo, queues: [{ name: 'Empty' }] })), []);

/* ---- menus ----------------------------------------------------------- */

const menu = {
  name: 'Welcome',
  ivr_option: [
    { key: '1', type: 'QUEUE', value: 'q-1' },
    { key: '3', type: 'EXTENSION', value: '1002' },
  ],
};
const ivrHit = checkRemoval({ person: bo, ivrs: [menu] });
is('a menu key pointing at them stops calls', codes(ivrHit), ['ivr-target']);
is('the key is named', ivrHit[0].message.includes('key 3'), true);
is('the menu is named', ivrHit[0].where, 'Welcome');

is(
  'a menu pointing elsewhere says nothing',
  codes(checkRemoval({ person: bo, ivrs: [{ name: 'Welcome', ivr_option: [{ key: '1', type: 'QUEUE', value: 'q-1' }] }] })),
  [],
);
is(
  'the form shape is read as well as the saved shape',
  codes(
    checkRemoval({
      person: bo,
      ivrs: [{ name: 'Welcome', ivrActions: [{ key: { value: '4' }, forwardType: { value: 'EXTENSION' }, forwardValue: { value: '1002' } }] }],
    }),
  ),
  ['ivr-target'],
);

/* ---- numbers --------------------------------------------------------- */

is(
  'a number forwarded to them stops calls',
  codes(checkRemoval({ person: bo, numbers: [{ did_number: '+441234', forward_type: 'EXTENSION', forward_value: '1002' }] })),
  ['number-forwarding'],
);
is(
  'a number forwarded elsewhere says nothing',
  codes(checkRemoval({ person: bo, numbers: [{ did_number: '+441234', forward_type: 'QUEUE', forward_value: 'q-1' }] })),
  [],
);
is(
  'their own number is worth knowing, not a break',
  codes(checkRemoval({ person: { ...bo, caller_id: '+441111' } })),
  ['keeps-a-number'],
);

/* ---- groups ---------------------------------------------------------- */

is(
  'the last person in a group stops calls',
  codes(checkRemoval({ person: bo, departments: [{ name: 'Ops', members: [{ user_uuid: 'u-2' }] }] })),
  ['department-last-member'],
);
is(
  'one of several is worth knowing',
  codes(checkRemoval({ person: bo, departments: [{ name: 'Ops', members: [{ user_uuid: 'u-2' }, { user_uuid: 'u-3' }] }] })),
  ['department-member'],
);

/* ---- ordering and the summary ---------------------------------------- */

const many = checkRemoval({
  person: amara,
  everyone: [amara],
  queues: [{ name: 'Support', members: [{ user_uuid: 'u-1' }, { user_uuid: 'u-2' }] }],
  numbers: [{ did_number: '+441234', forward_type: 'EXTENSION', forward_value: '1001' }],
});
const sorted = sortImpacts(many);
is('the lockout is read first', sorted[0].code, 'last-admin');
is('then what stops calls', sorted[1].code, 'number-forwarding');
is('then the rest', sorted[2].code, 'queue-member');

is('a lockout leads the summary', summarise(many).includes('cannot be undone'), true);
is('one break reads as one', summarise(checkRemoval({ person: bo, queues: [{ name: 'S', members: [{ user_uuid: 'u-2' }] }] })), 'One thing will stop working when they are removed.');
is('nothing at all is said plainly', summarise([]), 'Nothing else points at this person. Removing them changes nothing else.');
is(
  'only soft findings reads as safe',
  summarise(checkRemoval({ person: { ...bo, caller_id: '+441111' } })),
  'Nothing will stop working. A few things change.',
);

is('breaks are counted', countByLevel(many, 'stops-calls'), 1);

/* ---- a clean removal ------------------------------------------------- */

const clean = checkRemoval({
  person: bo,
  everyone: [amara, bo],
  queues: [{ name: 'Sales', members: [{ user_uuid: 'u-9' }] }],
  ivrs: [{ name: 'Welcome', ivr_option: [{ key: '1', type: 'QUEUE', value: 'q-1' }] }],
  numbers: [{ did_number: '+441234', forward_type: 'QUEUE', forward_value: 'q-1' }],
  departments: [{ name: 'Ops', members: [{ user_uuid: 'u-9' }] }],
});
is('somebody nothing points at reports nothing', clean.length, 0);
is('and does not block', blocksRemoval(clean), false);

is('no person at all is handled', checkRemoval({ person: null }).length, 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
