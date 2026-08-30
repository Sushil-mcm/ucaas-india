/* Proves which role somebody gets when you invite them.
 *
 * The single most important thing in here is what does NOT happen: no
 * arrangement of roles, and no missing answer, may ever cause an administrator
 * to be chosen for somebody automatically. Most of these cases exist to prove
 * that, because the failure is silent — nobody notices a new starter can reach
 * the billing screen until they do something with it.
 */

const {
  decideInviteRole,
  roleChoices,
  toRoleChoice,
  safestAutoRole,
  describeRole,
  roleWarning,
  willBecomeAdminByDefault,
  ADMIN_BY_DEFAULT_WARNING,
  AUTO_CHOOSABLE_TIERS,
  TIER_CHOICES,
} = require('./invite-role.build.cjs');

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

/* The roles a typical account ships with. */
const admin = { name: 'ADMIN', role_uuid: 'r-admin', type: 'system' };
const subAdmin = { name: 'SUB-ADMIN', role_uuid: 'r-sub', type: 'system' };
const manager = { name: 'MANAGER', role_uuid: 'r-mgr', type: 'system' };
const agent = { name: 'AGENT', role_uuid: 'r-agent', type: 'system' };
const user = { name: 'USER', role_uuid: 'r-user', type: 'system' };
const nightShift = { name: 'Night shift', uuid: 'c-night', type: 'custom' };

const SHIPPED = [admin, subAdmin, manager, agent, user];

/* ---- reading a role off the platform's list -------------------------- */

is('a system role travels under role_uuid', toRoleChoice(admin), {
  id: 'r-admin',
  name: 'ADMIN',
  custom: false,
  tier: 'company_admin',
});

is("a company's own role travels under its own uuid", toRoleChoice(nightShift), {
  id: 'c-night',
  name: 'Night shift',
  custom: true,
  /* Nothing in "Night shift" says what it allows, so nothing is claimed. */
  tier: null,
});

/* A role with no id cannot be written onto anybody, and a role with no name is
   stored as an empty role column — which is the case the platform turns into
   ADMIN. Both are dropped rather than half-used. */
is('a role with no id is unusable', toRoleChoice({ name: 'AGENT' }), null);
is('a role with no name is unusable', toRoleChoice({ role_uuid: 'r-x' }), null);
is('nothing at all is unusable', toRoleChoice(null), null);

is('unusable rows are dropped from the list', roleChoices([admin, {}, agent]).length, 2);
is('a missing list is an empty list', roleChoices(undefined).length, 0);
is('a non-list is an empty list', roleChoices('roles'), []);

/* ---- the safe automatic answer --------------------------------------- */

is('only the two narrowest tiers may be chosen unasked', AUTO_CHOOSABLE_TIERS, ['user', 'agent']);

is('User wins when both exist', safestAutoRole(roleChoices(SHIPPED)).name, 'USER');
is(
  'Agent is used when there is no User role',
  safestAutoRole(roleChoices([admin, manager, agent])).name,
  'AGENT',
);

/* The whole point of the file. An account with nothing but administrative roles
   gets no automatic answer at all, rather than the least-bad administrator. */
is(
  'an account of nothing but admins gets no automatic answer',
  safestAutoRole(roleChoices([admin, subAdmin, manager])),
  null,
);
is('a supervisor is never chosen unasked', safestAutoRole(roleChoices([{ name: 'Supervisor', role_uuid: 'r-sup' }])), null);
is('a custom role nobody can read is never chosen unasked', safestAutoRole(roleChoices([nightShift])), null);

/* Aliases are the platform's, not ours: "SUB-ADMIN", "Sub Admin" and
   "sub_admin" all mean the same tier, and none of them is auto-choosable. */
is(
  'punctuation does not smuggle an admin through',
  safestAutoRole(roleChoices([{ name: 'sub_admin', role_uuid: 'r-1' }])),
  null,
);

/* ---- the company's saved answer wins --------------------------------- */

const chosen = decideInviteRole({ savedRoleId: 'r-mgr', roles: SHIPPED });
is('the saved answer is used', chosen.role.name, 'MANAGER');
is('and is reported as the company saying so', chosen.source, 'company-choice');
ok('with a reason naming the role', chosen.reason.includes('MANAGER'));
ok('and a caution, because a manager administers other people', chosen.warning);

const chosenNarrow = decideInviteRole({ savedRoleId: 'r-user', roles: SHIPPED });
is('a narrow saved answer is used too', chosenNarrow.role.name, 'USER');
is('with no caution attached', chosenNarrow.warning, '');

/* An administrator chosen on purpose is fine — but it is said out loud. */
const chosenAdmin = decideInviteRole({ savedRoleId: 'r-admin', roles: SHIPPED });
is('an administrator saved on purpose is honoured', chosenAdmin.role.name, 'ADMIN');
ok('and the spending warning is the one shown', chosenAdmin.warning.includes('pay the bill'));

/* A company's own role can be the saved answer, and is found by its own uuid
   rather than by role_uuid — get that branch wrong and the setting silently
   stops working. */
const chosenCustom = decideInviteRole({ savedRoleId: 'c-night', roles: [...SHIPPED, nightShift] });
is('a custom saved answer is found by its own uuid', chosenCustom.role.name, 'Night shift');
is('and is marked as the company’s own', chosenCustom.role.custom, true);
is('a role nobody can read carries no caution', chosenCustom.warning, '');

/* ---- the saved answer has been deleted -------------------------------- */

const stale = decideInviteRole({ savedRoleId: 'r-gone', roles: SHIPPED });
is('a deleted saved answer falls back to the narrowest role', stale.role.name, 'USER');
is('and says it fell back', stale.source, 'safest-match');
ok('explaining that the chosen role is gone', stale.reason.includes('no longer exists'));

const staleNoFallback = decideInviteRole({ savedRoleId: 'r-gone', roles: [admin, manager] });
is('a deleted answer with nothing safe left chooses nothing', staleNoFallback.role, null);
is('and asks the person to choose', staleNoFallback.source, 'none');
ok('saying the old answer is gone', staleNoFallback.reason.includes('no longer exists'));

/* ---- nobody has saved anything ---------------------------------------- */

const unset = decideInviteRole({ roles: SHIPPED });
is('with no saved answer the narrowest role is used', unset.role.name, 'USER');
is('and it is reported as our choice, not the company’s', unset.source, 'safest-match');
ok('pointing at where to settle it once', unset.reason.includes('Default permissions'));

is('an empty saved answer counts as unset', decideInviteRole({ savedRoleId: '   ', roles: SHIPPED }).source, 'safest-match');

/* The case that used to create administrators. */
const adminsOnly = decideInviteRole({ roles: [admin, subAdmin, manager] });
is('an account of nothing but admins fills in nothing', adminsOnly.role, null);
is('and says so rather than guessing', adminsOnly.source, 'none');
notOk('with no caution, because nothing was chosen', adminsOnly.warning);

/* ---- nothing to decide from ------------------------------------------- */

const empty = decideInviteRole({ roles: [] });
is('no roles yet means no decision', empty.role, null);
is('and the reason says they are still loading', empty.reason, 'Roles are still loading.');
is('a missing list behaves the same', decideInviteRole({}).source, 'none');

/* ---- what a role means, in words -------------------------------------- */

const agentText = describeRole(toRoleChoice(agent));
ok('a known role borrows the tier’s own words', agentText.includes('own calls'));
const customText = describeRole(toRoleChoice(nightShift));
ok('an unreadable role gets an honest shrug', customText.includes('this account'));
ok('and points at where to look', customText.includes('Roles'));
is('nothing describes as nothing', describeRole(null), '');

/* ---- the cautions ------------------------------------------------------ */

ok('a company admin warns about money', roleWarning(toRoleChoice(admin)).includes('buy numbers'));
ok('a location admin warns about people', roleWarning(toRoleChoice(subAdmin)).includes('administers other people'));
ok('a department admin warns too', roleWarning(toRoleChoice(manager)).includes('administers other people'));
/* A supervisor watches; it changes nothing and removes nobody, so warning about
   it would be the sort of noise that trains people to ignore warnings. */
is('a supervisor gets no caution', roleWarning(toRoleChoice({ name: 'Supervisor', role_uuid: 'r-s' })), '');
is('an agent gets no caution', roleWarning(toRoleChoice(agent)), '');
is('a user gets no caution', roleWarning(toRoleChoice(user)), '');
is('nothing gets no caution', roleWarning(null), '');

/* ---- the platform's own fallback --------------------------------------- */

ok('an empty role name would become an administrator', willBecomeAdminByDefault(''));
ok('whitespace counts as empty', willBecomeAdminByDefault('   '));
ok('a missing role name would become an administrator', willBecomeAdminByDefault(undefined));
ok('a non-string would too', willBecomeAdminByDefault({ label: 'AGENT' }));
notOk('a real name is safe', willBecomeAdminByDefault('AGENT'));
ok('the warning names the consequence, not the field', ADMIN_BY_DEFAULT_WARNING.includes('administrator'));

/* ---- the six kinds, offered once --------------------------------------- */

is('all six kinds are offered', TIER_CHOICES.length, 6);
is('widest reach first', TIER_CHOICES[0].tier, 'company_admin');
is('narrowest last', TIER_CHOICES[5].tier, 'user');
ok('each one carries words to show', TIER_CHOICES.every((choice) => choice.label && choice.description));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
