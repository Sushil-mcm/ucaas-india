const {
  numberDigits, matchKey, isSameNumber, isEmergencyNumber, isShortCode,
  contactsForNumber, blockedContacts, planBlock, canBlock, unstoredParts,
  tagRequest, describeChoice, contactName,
  DEFAULT_BLOCK_CHOICE, TREATMENT_LABELS, SCOPE_LABELS,
} = require('./contact-blocking.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const msgs = (p) => p.map(x => x.message).join(' | ');

const choice = (over) => ({ number: '+442079460000', ...DEFAULT_BLOCK_CHOICE, ...over });
const person = (over) => ({
  _id: '1', name: { first: 'Jo', last: 'Baxter' },
  contact: { phone: '+442079460000' }, ...over,
});

console.log('  --- reading a number ---');
t('punctuation and spaces are dropped', numberDigits('+44 (20) 7946-0000') === '442079460000');
t('nothing in, nothing out', numberDigits(null) === '');
t('the key is the last nine digits', matchKey('+442079460000') === '079460000');
t('a short number keeps all of it', matchKey('1234567') === '1234567');
t('the same caller written two ways matches', isSameNumber('+44 20 7946 0000', '442079460000'));
t('two different callers do not', isSameNumber('+442079460000', '+442079461111') === false);
t('an empty number matches nothing, not everything', isSameNumber('', '') === false);

console.log('  --- what cannot be blocked ---');
t('999 is an emergency number', isEmergencyNumber('999'));
t('112 is an emergency number', isEmergencyNumber('+112'));
t('an ordinary number is not', isEmergencyNumber('442079460000') === false);
t('a five-digit number is a short code', isShortCode('60999'));
t('a full number is not a short code', isShortCode('442079460000') === false);

console.log('  --- finding the contact ---');
const book = [
  person(),
  person({ _id: '2', name: { first: 'Jo', last: 'Work' }, contact: { phone: '02079460000' } }),
  person({ _id: '3', name: { first: 'Sam' }, contact: { phone: '+442079461111' }, is_blocked: true }),
];
t('a number matches however either side is written',
  contactsForNumber(book, '+44 20 7946 0000').length === 2);
t('an unknown number matches nobody', contactsForNumber(book, '+15550001111').length === 0);
t('the blocked list is just the blocked ones', blockedContacts(book).length === 1);
t('a name reads as one string', contactName(book[0]) === 'Jo Baxter');

console.log('  --- planning a block ---');
let plan = planBlock(choice(), book);
t('a saved number can be blocked', canBlock(plan));
t('and every contact on that number is tagged', plan.targets.length === 2);
t('sharing a number is a warning, not a refusal',
  plan.problems.length === 1 && plan.problems[0].blocking === false);
t('and the warning says how many', /2 contacts share this number/.test(msgs(plan.problems)));

plan = planBlock(choice({ number: '999' }), book);
t('an emergency number is refused', canBlock(plan) === false);
t('and says why', /Emergency numbers cannot be blocked/.test(msgs(plan.problems)));

t('a short code is refused',
  /Short codes and service numbers/.test(msgs(planBlock(choice({ number: '60999' }), book).problems)));
t('an empty number is refused',
  /Enter a number to block/.test(msgs(planBlock(choice({ number: '' }), book).problems)));
t('your own number is refused',
  /one of your own numbers/.test(msgs(planBlock(choice(), book, ['+44 20 7946 0000']).problems)));

plan = planBlock(choice({ number: '+15550001111' }), book);
t('an unsaved number needs a contact first', plan.needsContact);
t('which is a refusal, not a silent no-op', canBlock(plan) === false);
t('and says what to do about it', /Save this number as a contact first/.test(msgs(plan.problems)));

t('blocking a VIP warns rather than refuses', (() => {
  const vip = planBlock(choice({ number: '+442079462222' }),
    [person({ _id: '9', contact: { phone: '+442079462222' }, is_vip: true })]);
  return canBlock(vip) && /marked VIP/.test(msgs(vip.problems));
})());

console.log('  --- what the platform cannot keep ---');
t('the plain block loses nothing', unstoredParts(choice()).length === 0);
t('calls-only has nowhere to go',
  unstoredParts(choice({ scope: 'calls' })).includes(SCOPE_LABELS.calls));
t('marking as spam has nowhere to go',
  unstoredParts(choice({ treatment: 'spam' })).includes(TREATMENT_LABELS.spam));
t('a shared-line block has nowhere to go',
  unstoredParts(choice({ line: 'shared' })).includes('Shared line only'));
t('a plan reports the loss alongside the targets',
  planBlock(choice({ treatment: 'reject' }), book).notStored.length === 1);

console.log('  --- the request ---');
let request = tagRequest(contactsForNumber(book, '+442079460000'), 'BLOCK');
t('every matching contact is sent', request.contact_uuid.length === 2);
t('with the one tag word the endpoint takes', request.tag === 'BLOCK');
t('unblocking goes back to Standard', tagRequest(book, 'STANDARD').tag === 'STANDARD');
t('a contact with no id is left out',
  tagRequest([{ contact: { phone: '1' } }], 'BLOCK').contact_uuid.length === 0);

console.log('  --- saying it in a sentence ---');
t('the sentence names what is stopped',
  /Calls, faxes and messages/.test(describeChoice(choice())));
t('and what the caller gets instead',
  /straight to voicemail/.test(describeChoice(choice())));
t('a shared line says so', /this shared line/.test(describeChoice(choice({ line: 'shared' }))));

console.log(`\n    ${pass} passed, ${fail} failed`);
