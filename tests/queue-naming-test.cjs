/* What a queue is called: that the word "Inbound" is added exactly once, that
   editing an existing queue cannot double it, and that the length is judged on
   what gets stored rather than on what was typed. */

const assert = require('assert');
const {
  FULL_PREFIX,
  QUEUE_NAME_MAX_LENGTH,
  TYPED_NAME_MIN_LENGTH,
  tidyName,
  hasInboundPrefix,
  stripInboundPrefix,
  buildQueueName,
  checkQueueName,
} = require('./queue-naming.build.cjs');

let passed = 0;
const check = (what, fn) => {
  fn();
  passed += 1;
  console.log('  ok  ' + what);
};

check('the admin types the team, the product adds the word', () => {
  assert.strictEqual(buildQueueName('Sales Team'), 'Inbound - Sales Team');
});

check('THE ONE THAT MATTERS: saving an edited queue cannot double the prefix', () => {
  const once = buildQueueName('Sales Team');
  const twice = buildQueueName(once);
  const thrice = buildQueueName(twice);
  assert.strictEqual(once, 'Inbound - Sales Team');
  assert.strictEqual(twice, once);
  assert.strictEqual(thrice, once);
});

check('CONTROL a naive prefix would have doubled it', () => {
  const naive = (n) => FULL_PREFIX + n;
  assert.strictEqual(naive(naive('Sales Team')), 'Inbound - Inbound - Sales Team');
});

check('an admin who typed the prefix themselves does not get it twice', () => {
  assert.strictEqual(buildQueueName('Inbound - Sales'), 'Inbound - Sales');
  assert.strictEqual(buildQueueName('inbound - sales'), 'Inbound - sales');
  assert.strictEqual(buildQueueName('Inbound- Sales'), 'Inbound - Sales');
  assert.strictEqual(buildQueueName('INBOUND -Sales'), 'Inbound - Sales');
});

check('a name that merely starts with the letters is left alone', () => {
  /* "Inbounds" is not the prefix, and neither is a team actually called
     "Inbound Sales" - there is no dash, so nothing was prefixed. */
  assert.strictEqual(buildQueueName('Inbounds Team'), 'Inbound - Inbounds Team');
  assert.strictEqual(buildQueueName('Inbound Sales'), 'Inbound - Inbound Sales');
});

check('the input is filled with what the admin typed, not the prefix', () => {
  assert.strictEqual(stripInboundPrefix('Inbound - Sales Team'), 'Sales Team');
  assert.strictEqual(stripInboundPrefix('Sales Team'), 'Sales Team');
  assert.strictEqual(stripInboundPrefix(''), '');
});

check('the prefix is detected however it was spaced', () => {
  assert.ok(hasInboundPrefix('Inbound - Sales'));
  assert.ok(hasInboundPrefix('inbound-Sales'));
  assert.ok(!hasInboundPrefix('Sales'));
  assert.ok(!hasInboundPrefix('Inbounds Team'));
});

check('a name pasted from a spreadsheet becomes one line', () => {
  assert.strictEqual(tidyName('Sales\nTeam'), 'Sales Team');
  assert.strictEqual(tidyName('  Sales   Team  '), 'Sales Team');
  assert.strictEqual(buildQueueName('Sales\tTeam'), 'Inbound - Sales Team');
});

check('an empty name gets no prefix, so a nameless queue cannot look named', () => {
  assert.strictEqual(buildQueueName(''), '');
  assert.strictEqual(buildQueueName('   '), '');
  assert.strictEqual(buildQueueName(null), '');
  assert.strictEqual(buildQueueName(undefined), '');
  assert.strictEqual(buildQueueName('Inbound - '), '');
});

check('an empty name is refused with a reason', () => {
  assert.strictEqual(checkQueueName('').ok, false);
  assert.ok(checkQueueName('').reason.length > 0);
  assert.strictEqual(checkQueueName('Sales').ok, true);
});

check('length is judged on the STORED name, prefix included', () => {
  const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
  const justFits = 'a'.repeat(room);
  const oneTooMany = 'a'.repeat(room + 1);
  assert.strictEqual(checkQueueName(justFits).ok, true);
  assert.strictEqual(buildQueueName(justFits).length, QUEUE_NAME_MAX_LENGTH);
  assert.strictEqual(checkQueueName(oneTooMany).ok, false);
});

check('CONTROL judging length on the typed name would have let it through', () => {
  const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
  const oneTooMany = 'a'.repeat(room + 1);
  assert.ok(oneTooMany.length <= QUEUE_NAME_MAX_LENGTH, 'typed name looks fine on its own');
  assert.ok(buildQueueName(oneTooMany).length > QUEUE_NAME_MAX_LENGTH, 'but stored it overflows');
});

check('a one-character name is refused, as it always was', () => {
  assert.strictEqual(checkQueueName('a').ok, false);
  assert.ok(checkQueueName('a').reason.includes(String(TYPED_NAME_MIN_LENGTH)));
  assert.strictEqual(checkQueueName('ab').ok, true);
});

check('the stored name fits the 50 the name field has always allowed', () => {
  assert.strictEqual(QUEUE_NAME_MAX_LENGTH, 50);
  const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
  assert.strictEqual(buildQueueName('a'.repeat(room)).length, 50);
});

check('the reason says how much room is actually left', () => {
  const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
  const reason = checkQueueName('a'.repeat(room + 5)).reason;
  assert.ok(reason.includes(String(room)), reason);
});

console.log('\n  ' + passed + ' checks passed');
