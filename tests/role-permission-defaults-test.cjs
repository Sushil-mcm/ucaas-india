const {
  TIERS, TIER_ORDER, RULES, tierInfo, tierForRoleName,
  buildDefaultPermission, comparePermissions, hasAnyGrant, PER_PERSON_GAPS,
  NEW_PERSON_ROLE_KEY, readNewPersonRole,
} = require('./role-permission-defaults.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

/* A plan tree shaped like the one the platform really returns: a module map,
   each module carrying IS_SHOW plus `access` and `action` branches. */
const PLAN = {
  billing: { IS_SHOW: true, action: { view: true, change_plan: true, request_plan: true } },
  calling_rates: { IS_SHOW: true, action: { view: true } },
  account_setting: {
    IS_SHOW: true,
    access: {
      USER: { action: { view: true, add: true, edit: true, delete: true } },
      SITE: { action: { view: true, add: true } },
    },
  },
  virtual_numbers: {
    IS_SHOW: true,
    action: {
      view: true, buy: true, release: true, assign_number: true,
      set_forwarding: true, remove_forwarding: true,
    },
  },
  phone_system_action: {
    IS_SHOW: true,
    access: { IVR: true, QUEUE: true, DEPARTMENT: true, ANNOUNCEMENT: true },
    action: { view: true, add: true, edit: true, delete: true },
  },
  monitoring_features: {
    IS_SHOW: true,
    action: { listen: true, whisper: true, barge: true, intercept: true, hangup: true },
  },
  advance_call_management: { IS_SHOW: true, access: { RECORDING: true, TRANSCRIPTION: true } },
  reports: {
    IS_SHOW: true,
    access: {
      CALL_LOG: {
        action: { view: true },
        call_report_permission: { all: true, team: true, himself: true },
      },
    },
  },
  integration: { IS_SHOW: true, action: { view: true, ZOHO: true, HUBSPOT: true } },
  auto_dialer: { IS_SHOW: true, action: { view: true, add: true, edit: true, pause: true } },
  omni_channel: { IS_SHOW: true, action: { view: true }, access: { WHATSAPP: true } },
  chat: { IS_SHOW: true, action: { view: true, add: true, reply: true, upload_files: true } },
  contact: { IS_SHOW: true, action: { view: true, add: true, edit: true, delete: true } },
  messages: { IS_SHOW: true, action: { send_message: true, send_mms: true, send_fax: true } },
  video: { IS_SHOW: true, action: { view: true, create: true }, access: { RECORDING: true } },
  settings: { IS_SHOW: true, action: { greeting: true } },
  phone_system_services: { IS_SHOW: true, access: { EXTENSION: true, VOICEMAIL: true } },
};

const at = (tree, path) =>
  path.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), tree);

const build = (tier, plan = PLAN) => buildDefaultPermission(plan, tier);
const of_ = {};
['admin', 'sub_admin', 'manager', 'supervisor', 'agent', 'user'].forEach((tier) => {
  of_[tier] = build(tier);
});
const grantedAt = (tier, path) => at(of_[tier].permission, path) === true;

console.log('  --- the six kinds of person ---');
t('there are six of them', TIERS.length === 6 && TIER_ORDER.length === 6);
t('every one says what it is in a sentence', TIERS.every((x) => x.description.length > 40));
t('every one says what it does NOT get', TIERS.every((x) => x.boundary.length > 30));
t('they are ordered widest first', TIER_ORDER[0] === 'admin' && TIER_ORDER[5] === 'user');
t('each can be looked up by key', TIER_ORDER.every((k) => tierInfo(k).tier === k));
t('every rule explains itself to a customer', RULES.every((r) => r.why.length > 40 && r.title));
t('no rule grants nobody', RULES.every((r) => r.tiers.length > 0));

console.log('  --- reading the platform\'s role names ---');
t('ADMIN is recognised', tierForRoleName('ADMIN') === 'admin');
t('SUB-ADMIN is recognised', tierForRoleName('SUB-ADMIN') === 'sub_admin');
t('the same name with a space is the same role', tierForRoleName('Sub Admin') === 'sub_admin');
t('and with an underscore', tierForRoleName('sub_admin') === 'sub_admin');
t('MANAGER is recognised', tierForRoleName('MANAGER') === 'manager');
t('AGENT is recognised', tierForRoleName('AGENT') === 'agent');
t('a supervisor is recognised', tierForRoleName('Supervisor') === 'supervisor');
t('a plain user is recognised', tierForRoleName('User') === 'user');
t('a company\'s own name is not guessed at', tierForRoleName('Night shift') === null);
t('a blank name is not guessed at', tierForRoleName('   ') === null);
t('nothing at all is not a crash', tierForRoleName(null) === null);
t('a near miss is not a match', tierForRoleName('Admin assistant') === null);

console.log('  --- rule 1: the plan is the ceiling ---');
const capped = build('admin', { chat: { IS_SHOW: true, action: { view: false, add: true } } });
t('a feature the company has not got stays off, even for a full administrator',
  at(capped.permission, 'chat.action.view') === false);
t('one it has got is still granted', at(capped.permission, 'chat.action.add') === true);
t('a capped feature is not counted as withheld from anybody',
  capped.withheld.every((r) => r.id !== 'the_job'));

console.log('  --- question 1: money and the shape of the account ---');
t('only a full administrator sees billing', grantedAt('admin', 'billing.action.view'));
t('an office administrator does not', !grantedAt('sub_admin', 'billing.action.view'));
t('nor a manager', !grantedAt('manager', 'billing.action.view'));
t('nor anybody else', !grantedAt('agent', 'billing.action.view') && !grantedAt('user', 'billing.action.view'));
t('call rates go with the bill', grantedAt('admin', 'calling_rates.action.view') && !grantedAt('sub_admin', 'calling_rates.action.view'));
t('only a full administrator buys a number', grantedAt('admin', 'virtual_numbers.action.buy') && !grantedAt('sub_admin', 'virtual_numbers.action.buy'));
t('and only they can give one up', !grantedAt('sub_admin', 'virtual_numbers.action.release'));
t('only a full administrator changes an office', !grantedAt('sub_admin', 'account_setting.access.SITE.action.add'));

console.log('  --- question 2: the person, or their place in a team ---');
t('an office administrator creates people', grantedAt('sub_admin', 'account_setting.access.USER.action.add'));
t('a manager does not', !grantedAt('manager', 'account_setting.access.USER.action.add'));
t('nor deletes them', !grantedAt('manager', 'account_setting.access.USER.action.delete'));
t('but a manager can find their own team', grantedAt('manager', 'account_setting.access.USER.action.view'));
t('so can a supervisor', grantedAt('supervisor', 'account_setting.access.USER.action.view'));
t('an agent cannot browse the staff list', !grantedAt('agent', 'account_setting.access.USER.action.view'));
t('nor an everyday user', !grantedAt('user', 'account_setting.access.USER.action.view'));
t('an office administrator hands out numbers', grantedAt('sub_admin', 'virtual_numbers.action.assign_number'));
t('a manager does not', !grantedAt('manager', 'virtual_numbers.action.assign_number'));
t('but a manager can see which numbers exist', grantedAt('manager', 'virtual_numbers.action.view'));

console.log('  --- question 3: configuring versus supervising ---');
t('a supervisor can listen to a live call', grantedAt('supervisor', 'monitoring_features.action.listen'));
t('and whisper, and take it over', grantedAt('supervisor', 'monitoring_features.action.whisper') && grantedAt('supervisor', 'monitoring_features.action.barge'));
t('a manager can too', grantedAt('manager', 'monitoring_features.action.barge'));
t('an agent cannot listen to anybody', !grantedAt('agent', 'monitoring_features.action.listen'));
t('nor an everyday user', !grantedAt('user', 'monitoring_features.action.listen'));
t('a manager changes call routing', grantedAt('manager', 'phone_system_action.action.edit'));
t('a supervisor changes nothing', !grantedAt('supervisor', 'phone_system_action.action.edit'));
t('and cannot add a queue either', !grantedAt('supervisor', 'phone_system_action.action.add'));
t('but a supervisor can see how calls are routed', grantedAt('supervisor', 'phone_system_action.action.view'));
t('so can an agent', grantedAt('agent', 'phone_system_action.action.view'));
t('an everyday user does not need to', !grantedAt('user', 'phone_system_action.action.view'));
t('connecting other software stays with administrators', grantedAt('sub_admin', 'integration.action.ZOHO') && !grantedAt('manager', 'integration.action.ZOHO'));

console.log('  --- question 4: whose data is it ---');
t('a supervisor may hear a recording', grantedAt('supervisor', 'advance_call_management.access.RECORDING'));
t('an agent may not, by default', !grantedAt('agent', 'advance_call_management.access.RECORDING'));
t('nor an everyday user', !grantedAt('user', 'advance_call_management.access.RECORDING'));
t('company-wide reports stop at the office administrator',
  grantedAt('sub_admin', 'reports.access.CALL_LOG.call_report_permission.all') &&
  !grantedAt('manager', 'reports.access.CALL_LOG.call_report_permission.all'));
t('a manager gets their team\'s figures', grantedAt('manager', 'reports.access.CALL_LOG.call_report_permission.team'));
t('a supervisor does too', grantedAt('supervisor', 'reports.access.CALL_LOG.call_report_permission.team'));
t('an agent gets their own and no more',
  grantedAt('agent', 'reports.access.CALL_LOG.call_report_permission.himself') &&
  !grantedAt('agent', 'reports.access.CALL_LOG.call_report_permission.team'));
t('so does an everyday user',
  grantedAt('user', 'reports.access.CALL_LOG.call_report_permission.himself') &&
  !grantedAt('user', 'reports.access.CALL_LOG.call_report_permission.all'));

console.log('  --- question 5: just doing the job ---');
['admin', 'sub_admin', 'manager', 'supervisor', 'agent', 'user'].forEach((tier) => {
  t(`${tier} can use the phone and the chat`,
    grantedAt(tier, 'chat.action.view') && grantedAt(tier, 'messages.action.send_message'));
});
t('everybody keeps their own contacts', ['agent', 'user'].every((x) => grantedAt(x, 'contact.action.add')));
t('everybody can record their own greeting', grantedAt('user', 'settings.action.greeting'));
t('everybody has an extension and a mailbox', grantedAt('user', 'phone_system_services.access.VOICEMAIL'));
t('an agent works the dialler', grantedAt('agent', 'auto_dialer.action.pause'));
t('but does not build the campaign', !grantedAt('agent', 'auto_dialer.action.add'));
t('a manager builds it', grantedAt('manager', 'auto_dialer.action.add'));
t('an agent answers the shared inbox', grantedAt('agent', 'omni_channel.action.view'));
t('an everyday user does not', !grantedAt('user', 'omni_channel.action.view'));

console.log('  --- rule 2: anything unrecognised is withheld, and said out loud ---');
const odd = build('admin', { wallboard: { IS_SHOW: true, action: { view: true } } });
t('a capability nobody has classified is off', at(odd.permission, 'wallboard.action.view') === false);
t('even for a full administrator', odd.granted === 0);
t('and it is named so somebody can decide', odd.undecided.includes('wallboard.action.view'));
t('a recognised plan produces nothing undecided', of_.admin.undecided.length === 0);

console.log('  --- how much each kind gets ---');
t('every kind is measured against the same plan',
  new Set(TIER_ORDER.map((k) => of_[k].total)).size === 1);
t('a full administrator gets the most', TIER_ORDER.slice(1).every((k) => of_.admin.granted > of_[k].granted));
t('an office administrator gets less than a full one', of_.sub_admin.granted < of_.admin.granted);
t('a manager less than an office administrator', of_.manager.granted < of_.sub_admin.granted);
t('a supervisor less than a manager', of_.supervisor.granted < of_.manager.granted);
t('an everyday user gets the least', TIER_ORDER.slice(0, 5).every((k) => of_.user.granted < of_[k].granted));
t('but an everyday user still gets a working phone', of_.user.granted > 0);
t('nothing is granted beyond what the plan offers',
  TIER_ORDER.every((k) => of_[k].granted <= of_[k].total));

console.log('  --- saying what was given and what was held back ---');
t('a full administrator has nothing held back', of_.admin.withheld.length === 0);
t('an everyday user is told what was held back, in sentences',
  of_.user.withheld.length > 0 && of_.user.withheld.every((r) => r.why.length > 40));
t('and what they were given', of_.user.allowed.length > 0);
t('a rule never appears in both lists at once',
  of_.manager.allowed.every((r) => !of_.manager.withheld.some((w) => w.id === r.id)));
t('the money rule is named when an office administrator is refused it',
  of_.sub_admin.withheld.some((r) => r.id === 'money'));
t('supervision is named when an agent is refused it',
  of_.agent.withheld.some((r) => r.id === 'supervision'));

console.log('  --- whether a module appears at all ---');
t('a module with something in it is shown', of_.user.permission.chat.IS_SHOW === true);
t('a module with nothing in it is hidden', of_.user.permission.billing.IS_SHOW === false);
t('a module the plan hides stays hidden even when the rules would grant it',
  build('admin', { chat: { IS_SHOW: false, action: { view: true } } }).permission.chat.IS_SHOW === false);
t('IS_SHOW is not counted as a permission',
  build('admin', { chat: { IS_SHOW: true, action: { view: true } } }).total === 1);
t('hasAnyGrant ignores IS_SHOW', hasAnyGrant({ IS_SHOW: true, action: { view: false } }) === false);
t('hasAnyGrant finds a grant however deep', hasAnyGrant({ a: { b: { c: true } } }) === true);

console.log('  --- odd input is answered, not crashed on ---');
t('no plan at all is an empty default', buildDefaultPermission(null, 'user').total === 0);
t('a list is not a plan', buildDefaultPermission([1, 2], 'user').total === 0);
t('a value that is neither a branch nor a tick box is carried through',
  build('user', { chat: { IS_SHOW: true, label: 'Chat', action: { view: true } } })
    .permission.chat.label === 'Chat');

console.log('  --- comparing a default with a role that already exists ---');
const same = comparePermissions(of_.agent.permission, of_.agent.permission);
t('a role that already matches shows no changes', same.length === 0);
const drift = comparePermissions(of_.admin.permission, of_.agent.permission);
t('an over-wide role shows what it would lose', drift.length > 0 && drift.every((d) => d.kind === 'extra'));
t('billing is one of the things it would lose',
  drift.some((d) => d.path === 'billing.action.view' && d.kind === 'extra'));
const gain = comparePermissions(of_.user.permission, of_.manager.permission);
t('a too-narrow role shows what it would gain', gain.some((d) => d.kind === 'missing'));
t('a tick box that is simply absent counts as off',
  comparePermissions({}, { chat: { action: { view: true } } })
    .every((d) => d.kind === 'missing'));
t('an absent tick box that would also be off is not a change',
  comparePermissions({}, { chat: { action: { view: false } } }).length === 0);
t('IS_SHOW is not reported as a change',
  comparePermissions({ chat: { IS_SHOW: true } }, { chat: { IS_SHOW: false } }).length === 0);
t('the changes come back in a stable order',
  drift.map((d) => d.path).join() === [...drift.map((d) => d.path)].sort().join());
t('rubbish on either side is an empty comparison', comparePermissions(null, undefined).length === 0);

console.log('  --- what a role cannot say here at all ---');
t('the per-person gaps are listed', PER_PERSON_GAPS.length >= 3);
t('each says why it matters, in plain words', PER_PERSON_GAPS.every((g) => g.why.length > 60 && g.label));
t('dialling abroad is one of them', PER_PERSON_GAPS.some((g) => g.id === 'international'));

console.log('  --- which role a new person starts on ---');
t('it is kept under a name that reads correctly on the company record',
  NEW_PERSON_ROLE_KEY === 'new_person_default_role');
t('a saved choice is read back', readNewPersonRole('abc-123') === 'abc-123');
t('surrounding space is not part of the answer', readNewPersonRole('  abc-123 ') === 'abc-123');
t('nothing chosen is an empty answer', readNewPersonRole(undefined) === '');
t('an empty string is nothing chosen', readNewPersonRole('   ') === '');
t('something that is not text is nothing chosen', readNewPersonRole({ value: 'x' }) === '');

console.log(`\n    ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
