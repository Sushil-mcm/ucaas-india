const {
  TIERS, normaliseScope, checkScope, isScopeSaveable, canActOn,
  coverageOf, describeScope, canEditScope, readScopes, scopeFor,
} = require('./admin-scope.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const msgs = (p) => p.map(x => x.message).join(' | ');

const DIR = {
  locations: [
    { uuid: 'loc-lon', name: 'London' },
    { uuid: 'loc-man', name: 'Manchester' },
    { uuid: 'loc-ber', name: 'Berlin' },
  ],
  departments: [
    { uuid: 'dep-sales', name: 'Sales', locationUuid: 'loc-lon' },
    { uuid: 'dep-supp', name: 'Support', locationUuid: 'loc-man' },
    { uuid: 'dep-fin', name: 'Finance', locationUuid: null },
  ],
};

const company = { personUuid: 'u1', tier: 'company', locationUuids: [], departmentUuids: [] };
const london = { personUuid: 'u2', tier: 'location', locationUuids: ['loc-lon'], departmentUuids: [] };
const region = { personUuid: 'u3', tier: 'location', locationUuids: ['loc-lon', 'loc-man'], departmentUuids: [] };
const sales = { personUuid: 'u4', tier: 'department', locationUuids: [], departmentUuids: ['dep-sales'] };

console.log('  --- the tiers ---');
t('there are three of them', TIERS.length === 3);
t('every one says what it means in a sentence', TIERS.every(x => x.description.length > 30));

console.log('  --- reading a stored scope ---');
t('an unknown tier becomes the narrowest one', normaliseScope({ tier: 'wizard' }).tier === 'department');
t('rubbish is a scope, not a crash', normaliseScope(null).personUuid === '');
t('duplicates in a list are dropped',
  normaliseScope({ tier: 'location', locationUuids: ['a', 'a', 'b'] }).locationUuids.length === 2);
t('blanks in a list are dropped',
  normaliseScope({ tier: 'location', locationUuids: ['a', '', '  '] }).locationUuids.length === 1);
t('a company scope does not keep a stale location list',
  normaliseScope({ tier: 'company', locationUuids: ['loc-lon'] }).locationUuids.length === 0);
t('an location scope does not keep a stale department list',
  normaliseScope({ tier: 'location', locationUuids: ['loc-lon'], departmentUuids: ['dep-sales'] })
    .departmentUuids.length === 0);

console.log('  --- checking a scope before it is saved ---');
t('a scope needs somebody to belong to',
  checkScope({ ...london, personUuid: '' }, DIR).some(p => p.field === 'person'));
t('a good scope has nothing wrong with it', checkScope(london, DIR).length === 0);
let p = checkScope({ ...london, locationUuids: [] }, DIR);
t('an location admin with no locations is blocked', p.length === 1 && p[0].blocking);
t('and is told they would cover nobody', /covers nobody/.test(msgs(p)));
p = checkScope({ ...sales, departmentUuids: [] }, DIR);
t('a department admin with no departments is blocked', p.length === 1 && p[0].blocking);
p = checkScope({ ...london, locationUuids: ['loc-gone'] }, DIR);
t('an location that no longer exists is blocking', p.length === 1 && p[0].blocking);
t('and is named so it can be removed', /loc-gone/.test(msgs(p)));
p = checkScope({ ...sales, departmentUuids: ['dep-gone'] }, DIR);
t('so is a department that no longer exists', p.length === 1 && p[0].blocking);
p = checkScope({ ...london, locationUuids: ['loc-lon', 'loc-man', 'loc-ber'] }, DIR);
t('covering every location is a note, not a block', p.length === 1 && p[0].blocking === false);
t('and it still saves', isScopeSaveable(p));
t('a blocking problem does not save', isScopeSaveable(checkScope({ ...london, locationUuids: [] }, DIR)) === false);

console.log('  --- who a company admin may act on ---');
t('anybody', canActOn(company, { kind: 'person', locationUuid: 'loc-ber' }).allowed);
t('any location', canActOn(company, { kind: 'location', uuid: 'loc-ber' }).allowed);
t('the company itself', canActOn(company, { kind: 'company' }).allowed);

console.log('  --- who an location admin may act on ---');
t('somebody at their location', canActOn(london, { kind: 'person', locationUuid: 'loc-lon' }).allowed);
let d = canActOn(london, { kind: 'person', locationUuid: 'loc-man', name: 'Priya' });
t('not somebody at another location', d.allowed === false);
t('and the refusal names the person', /Priya/.test(d.reason));
t('a region admin reaches both their locations',
  canActOn(region, { kind: 'person', locationUuid: 'loc-man' }).allowed);
t('their own location', canActOn(london, { kind: 'location', uuid: 'loc-lon' }).allowed);
t('not another location', canActOn(london, { kind: 'location', uuid: 'loc-ber' }).allowed === false);
t('a department at their location', canActOn(london, { kind: 'department', uuid: 'dep-sales', locationUuid: 'loc-lon' }).allowed);
t('not company-wide settings', canActOn(london, { kind: 'company' }).allowed === false);
d = canActOn(london, { kind: 'person', locationUuid: null, name: 'Sam' });
t('somebody with no location set is refused, not assumed', d.allowed === false);
t('and is told what to fix', /Set an location/.test(d.reason));

console.log('  --- who a department admin may act on ---');
t('their own department', canActOn(sales, { kind: 'department', uuid: 'dep-sales' }).allowed);
t('not another department', canActOn(sales, { kind: 'department', uuid: 'dep-supp' }).allowed === false);
t('somebody in their department',
  canActOn(sales, { kind: 'person', departmentUuids: ['dep-sales', 'dep-supp'] }).allowed);
t('not somebody outside it',
  canActOn(sales, { kind: 'person', departmentUuids: ['dep-supp'] }).allowed === false);
d = canActOn(sales, { kind: 'person', departmentUuids: [], name: 'Ana' });
t('somebody in no department at all is refused', d.allowed === false);
t('and the reason says why, not just no', /not in a department/.test(d.reason));
t('never the location around their department',
  canActOn(sales, { kind: 'location', uuid: 'loc-lon' }).allowed === false);
t('never the company', canActOn(sales, { kind: 'company' }).allowed === false);

console.log('  --- how much of the company a scope reaches ---');
const PEOPLE = [
  { uuid: 'p1', locationUuid: 'loc-lon', departmentUuids: ['dep-sales'] },
  { uuid: 'p2', locationUuid: 'loc-lon', departmentUuids: [] },
  { uuid: 'p3', locationUuid: 'loc-man', departmentUuids: ['dep-supp'] },
  { uuid: 'p4', locationUuid: null, departmentUuids: ['dep-sales'] },
];
let c = coverageOf(company, PEOPLE, DIR);
t('the company reaches everyone', c.people === 4 && c.totalPeople === 4);
c = coverageOf(london, PEOPLE, DIR);
t('one location reaches only its own people', c.people === 2);
t('and counts the people with no location separately', c.unplaced === 1);
t('and the departments at that location', c.departments === 1);
c = coverageOf(region, PEOPLE, DIR);
t('two locations reach more people', c.people === 3);
c = coverageOf(sales, PEOPLE, DIR);
t('a department reaches its members wherever they sit', c.people === 2);
t('and counts the people in no department separately', c.unplaced === 1);
t('an empty company is zero, not a crash', coverageOf(london, [], DIR).people === 0);

console.log('  --- describing a scope ---');
t('the company says so', describeScope(company, DIR) === 'The whole company');
t('one location is named', describeScope(london, DIR) === 'London');
t('two locations are both named', describeScope(region, DIR) === 'London and Manchester');
t('many locations are summarised',
  /and 1 more$/.test(describeScope({ ...region, locationUuids: ['loc-lon', 'loc-man', 'loc-ber'] }, DIR)));
t('an empty location scope says it is unfinished',
  /No locations chosen/.test(describeScope({ ...london, locationUuids: [] }, DIR)));
t('a deleted location does not blank the line',
  /deleted entry/.test(describeScope({ ...london, locationUuids: ['loc-gone'] }, DIR)));

console.log('  --- changing a scope ---');
t('an location admin cannot change scopes at all', canEditScope(london, sales).allowed === false);
t('a company admin can change somebody else', canEditScope(company, london).allowed);
d = canEditScope(company, company);
t('but not their own', d.allowed === false);
t('and is told to ask another administrator', /another company administrator/.test(d.reason));

console.log('  --- the stored list ---');
const stored = readScopes([london, sales, { ...london, tier: 'company' }, { tier: 'company' }, 'junk']);
t('one entry per person, the first wins', stored.length === 2);
t('the first entry is kept, not the later one', stored[0].tier === 'location');
t('an entry with no person is dropped', stored.every(s => s.personUuid));
t('a non-list is an empty list', readScopes(null).length === 0);
t('somebody with a scope is found', scopeFor(stored, 'u4').tier === 'department');
t('somebody without one gets null, not a guess', scopeFor(stored, 'nobody') === null);

console.log(`\n    ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
