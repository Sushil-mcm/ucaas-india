/* Friendly labels for the built-in roles.
 *
 * The important property is that this is a LABEL and never a rename. The stored
 * string is an authorisation gate - role !== "ADMIN" appears in AuthMiddleware
 * and fourteen other API files - so anything that changed the stored value would
 * quietly strip admin access from the people it is meant to let through.
 */

const {
  roleDisplayName,
  roleDisplayDescription,
  isBuiltInRole,
  ROLE_NAMES,
} = require('./role-display-names.build.cjs');

let passed = 0, failed = 0;
const is = (name, actual, expected) => {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else { failed += 1; console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`); }
};

/* The four built-ins, as they are actually stored. */
is('ADMIN reads as Account owner', roleDisplayName('ADMIN'), 'Account owner');
is('MANAGER reads as Account admin', roleDisplayName('MANAGER'), 'Account admin');
is('SUB-ADMIN reads as People admin', roleDisplayName('SUB-ADMIN'), 'People admin');
is('AGENT reads as Call reviewer', roleDisplayName('AGENT'), 'Call reviewer');

/* Case and padding come from stored data, not a picker. */
is('lower case still matches', roleDisplayName('manager'), 'Account admin');
is('padding too', roleDisplayName('  ADMIN '), 'Account owner');

/* A company's own role keeps the name somebody chose for it. */
is('a custom role is left alone', roleDisplayName('Custom Sub-Admin'), 'Custom Sub-Admin');
is('and so is anything unrecognised', roleDisplayName('New role'), 'New role');

/* About half the user records on this system carry a raw uuid where a role name
   should be. A uuid is not a role anybody can read. */
is('a uuid is not shown at somebody',
   roleDisplayName('36a0d0d5-57fd-11f0-a62f-9600043a34b1'), 'Unknown role');
is('upper-case uuids too',
   roleDisplayName('36A0D0D5-57FD-11F0-A62F-9600043A34B1'), 'Unknown role');

/* Nothing stored is a real state. */
is('empty reads as no role', roleDisplayName(''), 'No role');
is('null too', roleDisplayName(null), 'No role');
is('undefined too', roleDisplayName(undefined), 'No role');

/* Descriptions. Every built-in shipped saying "This is test description". */
is('a built-in gets a real description',
   roleDisplayDescription('MANAGER', 'This is test description'),
   'Runs the account day to day. Everything the company has.');
is('the placeholder is never shown, whoever wrote it',
   roleDisplayDescription('Custom Sub-Admin', 'This is test description'), '');
is('case does not save it',
   roleDisplayDescription('Custom Sub-Admin', 'this IS TEST description'), '');
is('a real description on a custom role is kept',
   roleDisplayDescription('Custom Sub-Admin', 'Handles onboarding only'),
   'Handles onboarding only');
is('no description at all is empty, not a placeholder',
   roleDisplayDescription('Custom Sub-Admin', null), '');

/* Knowing which are built in. */
is('ADMIN is built in', isBuiltInRole('ADMIN'), true);
is('a custom role is not', isBuiltInRole('Custom Sub-Admin'), false);
is('nor is a uuid', isBuiltInRole('36a0d0d5-57fd-11f0-a62f-9600043a34b1'), false);

/* The property this whole file exists to guarantee: nothing here returns a
   value that could be written back as a stored role. */
is('the label is never the stored value for ADMIN',
   roleDisplayName('ADMIN') === 'ADMIN', false);


/* One vocabulary. Every name a built-in role displays under has to be one of the
   five, or the roles list and the create-a-role screen are speaking differently
   about the same thing - which is exactly what this replaced. */
is('there are five names', ROLE_NAMES.length, 5);
for (const stored of ['ADMIN', 'MANAGER', 'SUB-ADMIN', 'AGENT']) {
  is(`${stored} displays as one of the five`,
     ROLE_NAMES.includes(roleDisplayName(stored)), true);
}
is('and the fifth has no built-in, which is fine',
   ROLE_NAMES.filter((n) => !['ADMIN','MANAGER','SUB-ADMIN','AGENT'].map(roleDisplayName).includes(n)),
   ['Call flow builder']);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
