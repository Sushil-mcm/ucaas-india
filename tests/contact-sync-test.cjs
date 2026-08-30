const {
  tidyIncoming, mergeIncoming, planContactSync, syncPayload,
  describeSyncPlan, syncWouldChangeAnything,
} = require('./contact-sync.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

const stored = (over) => ({
  _id: '1', name: { first: 'Jo', last: 'Baxter' },
  contact: { phone: '+442079460000', email: 'jo@example.com' }, ...over,
});

console.log('  --- tidying what arrives ---');
let tidy = tidyIncoming({ name: '  Jo   Baxter ', phone: ' +44 20 7946 0000 ', email: ' JO@Example.COM ' });
t('the name loses its extra spaces', tidy.name === 'Jo Baxter');
t('the number keeps its formatting for display', tidy.phone === '+44 20 7946 0000');
t('the email is lowered', tidy.email === 'jo@example.com');
t('an empty email becomes nothing at all', tidyIncoming({ name: 'a', phone: '1' }).email === undefined);

console.log('  --- the same person twice in one import ---');
let merged = mergeIncoming([
  tidyIncoming({ name: 'Jo', phone: '+442079460000' }),
  tidyIncoming({ name: 'Jo Baxter', phone: '02079460000', email: 'jo@example.com' }),
]);
t('one number is one person', merged.merged.length === 1);
t('and the merge is counted', merged.mergedDuplicates === 1);
t('the fuller name wins', merged.merged[0].name === 'Jo Baxter');
t('and the email is picked up from either side', merged.merged[0].email === 'jo@example.com');
t('someone with no number is not merged away',
  mergeIncoming([tidyIncoming({ name: 'A', phone: '' }), tidyIncoming({ name: 'B', phone: '' })])
    .merged.length === 2);

console.log('  --- what a sync would do ---');
let plan = planContactSync([
  { name: 'Jo Baxter', phone: '+442079460000', email: 'jo@example.com' },
  { name: 'Sam New', phone: '+442079461111' },
  { name: 'No Number', phone: '' },
], [stored()]);
t('an unchanged contact is left alone', plan.unchanged.length === 1);
t('a new number is created', plan.create.length === 1 && plan.create[0].incoming.name === 'Sam New');
t('a contact with no number is skipped', plan.skipped.length === 1);
t('and the skip says why', /No phone number/.test(plan.skipped[0].reason));
t('every incoming contact is accounted for', plan.entries.length === 3);

console.log('  --- running it twice changes nothing ---');
const google = [{ name: 'Jo Baxter', phone: '+442079460000', email: 'jo@example.com' }];
t('the second run has nothing to send',
  syncWouldChangeAnything(planContactSync(google, [stored()])) === false);
t('and the first run does',
  syncWouldChangeAnything(planContactSync(google, [])) === true);

console.log('  --- matching on digits, not text ---');
t('a stored number without a country code still matches',
  planContactSync([{ name: 'Jo Baxter', phone: '+442079460000', email: 'jo@example.com' }],
    [stored({ contact: { phone: '02079460000', email: 'jo@example.com' } })]).unchanged.length === 1);
t('a different number does not',
  planContactSync([{ name: 'Jo', phone: '+442079462222' }], [stored()]).create.length === 1);

console.log('  --- updates ---');
plan = planContactSync([{ name: 'Jo Baxter-Smith', phone: '+442079460000' }], [stored()]);
t('a changed name is an update', plan.update.length === 1);
t('and says what changed', /name would change/.test(plan.update[0].reason));
plan = planContactSync([{ name: 'Jo Baxter', phone: '+442079460000', email: 'new@example.com' }], [stored()]);
t('a changed email is an update', /email would change/.test(plan.update[0].reason));
t('a blank incoming name never wipes a stored one',
  planContactSync([{ name: '', phone: '+442079460000' }], [stored()]).unchanged.length === 1);

console.log('  --- numbers that cannot be dialled ---');
plan = planContactSync([{ name: 'Reception', phone: '4021' }], []);
t('an extension is skipped rather than imported', plan.skipped.length === 1);
t('and says why', /too short to dial/.test(plan.skipped[0].reason));

console.log('  --- a book that already has duplicates ---');
plan = planContactSync([{ name: 'Jo Baxter', phone: '+442079460000', email: 'jo@example.com' }],
  [stored(), stored({ _id: '2' })]);
t('the import edits one, not both', plan.unchanged.length === 1);

console.log('  --- what gets sent ---');
plan = planContactSync([
  { name: 'Jo Baxter', phone: '+442079460000', email: 'jo@example.com' },
  { name: 'Sam New', phone: '+442079461111', externalId: 'g-99' },
], [stored()]);
let payload = syncPayload(plan);
t('only the new and changed are sent', payload.length === 1);
t('the shape is flat', payload[0].name === 'Sam New' && payload[0].phone === '+442079461111');
t('the source id travels with it', payload[0].external_id === 'g-99');
t('no email means no email key', 'email' in payload[0] === false);
t('a nameless contact is still sent, under a placeholder',
  syncPayload(planContactSync([{ name: '', phone: '+442079463333' }], []))[0].name === 'Unknown');

console.log('  --- saying it in a sentence ---');
t('the sentence counts each outcome',
  /1 new, 1 already up to date/.test(describeSyncPlan(plan)));
t('nothing to do says so plainly',
  /Nothing to change/.test(describeSyncPlan(planContactSync(google, [stored()]))));
t('an empty import is a real answer',
  describeSyncPlan(planContactSync([], [])) === 'There was nothing to bring in.');

console.log(`\n    ${pass} passed, ${fail} failed`);
