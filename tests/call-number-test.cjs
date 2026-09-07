/* Call logs were showing 7770112568081009 where the person had dialled
   +1 256 808 1009, and 1000_web where their own extension belonged. The
   headline test is the plain one: the number that comes out is the number that
   went in. The rest guard the edge the rule turns on — a real number must never
   be shortened, however it happens to start. */

const assert = require('assert');
const {
  stripCarrierRoutingPrefix,
  normalizeCallNumber,
  pickCounterpartNumber,
  isInternalEndpoint,
} = require('./call-number.build.cjs');

let passed = 0;
const check = (what, fn) => {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`  FAIL  ${what}\n        ${err.message}`);
    process.exitCode = 1;
  }
};

check('the number dialled is the number shown', () => {
  assert.strictEqual(normalizeCallNumber('7770112568081009'), '12568081009');
});

check('an international destination comes back whole', () => {
  assert.strictEqual(normalizeCallNumber('77701917666718264'), '917666718264');
});

check('the web phone shows its extension, not its SIP endpoint', () => {
  assert.strictEqual(normalizeCallNumber('1000_web'), '1000');
});

check('a full SIP URI is reduced to the number', () => {
  assert.strictEqual(normalizeCallNumber('sip:1010_web@mycountrymobile.com'), '1010');
});

check('the second carrier prefix is handled too', () => {
  assert.strictEqual(normalizeCallNumber('6732912345678901'), '912345678901');
});

/* The guard. Stripping happens only when the value cannot be a real number as
   it stands, so a genuine number that begins with a prefix's digits survives
   untouched. `6732234567` is a valid Brunei number and `6732` is one of the
   listed carrier prefixes — exactly the collision the rule has to get right. */
check('a real number beginning with a carrier prefix is left alone', () => {
  assert.strictEqual(normalizeCallNumber('6732234567'), '6732234567');
});

check('a short value the prefix cannot be stripped from is left alone', () => {
  assert.strictEqual(normalizeCallNumber('777011234'), '777011234');
});

/* Length alone used to be the guard — "strip only above 15 digits, the E.164
   ceiling" — and this is the value that got past it. A call to our own
   +1 605 971 3935 is logged as 777016059713935, exactly 15 digits, so the old
   rule let it through and the list showed "+7 77016059713935", a Kazakh number
   that does not exist. Validity catches it; length never could. */
check('a rewritten number is undone at exactly the E.164 ceiling', () => {
  assert.strictEqual(normalizeCallNumber('777016059713935'), '6059713935');
});

check('an unrecognised long number is left as it is', () => {
  assert.strictEqual(normalizeCallNumber('99999912568081009'), '99999912568081009');
});

check('a leading plus is kept', () => {
  assert.strictEqual(normalizeCallNumber('+12568081009'), '+12568081009');
});

check('spaces and casing do not defeat it', () => {
  assert.strictEqual(normalizeCallNumber(' 1000_WEB '), '1000');
});

check('empty and missing values give an empty string', () => {
  assert.strictEqual(normalizeCallNumber(''), '');
  assert.strictEqual(normalizeCallNumber(null), '');
  assert.strictEqual(normalizeCallNumber(undefined), '');
});

check('a non-numeric value is not treated as a prefixed number', () => {
  assert.strictEqual(stripCarrierRoutingPrefix('77701abcdefghijkl'), '77701abcdefghijkl');
});

/* Which side of the call to show. Direction alone gets this wrong: a call made
   from the web phone is logged as Inbound with our own endpoint as the caller,
   so the person was shown their own extension instead of who they rang. */

check('a call from the web phone shows who was rung', () => {
  assert.strictEqual(
    pickCounterpartNumber({
      direction: 'Inbound',
      caller_id_number: '1000_web',
      destination_number: '917666718264',
    }),
    '917666718264',
  );
});

check('a real inbound call still shows the caller', () => {
  assert.strictEqual(
    pickCounterpartNumber({
      direction: 'Inbound',
      caller_id_number: '+14422129488',
      destination_number: '',
    }),
    '+14422129488',
  );
});

check('an inbound call to a DID shows the caller, not the DID', () => {
  assert.strictEqual(
    pickCounterpartNumber({
      direction: 'Inbound',
      caller_id_number: '+14422129488',
      destination_number: '12568081009',
    }),
    '+14422129488',
  );
});

check('an outbound call shows the destination, prefix removed', () => {
  assert.strictEqual(
    pickCounterpartNumber({
      direction: 'Outbound',
      caller_id_number: '12568081010',
      destination_number: '7770112568081009',
    }),
    '12568081009',
  );
});

check('an internal call between extensions still shows the caller', () => {
  assert.strictEqual(
    pickCounterpartNumber({
      direction: 'Local',
      caller_id_number: '1000',
      destination_number: '1001',
    }),
    '1000',
  );
});

check('a missing side falls back to the other one', () => {
  assert.strictEqual(
    pickCounterpartNumber({ direction: 'Outbound', caller_id_number: '1000', destination_number: '' }),
    '1000',
  );
});

check('our own endpoints are recognised, outside numbers are not', () => {
  assert.strictEqual(isInternalEndpoint('1000_web'), true);
  assert.strictEqual(isInternalEndpoint('12568081010_web'), true);
  assert.strictEqual(isInternalEndpoint('1000'), true);
  assert.strictEqual(isInternalEndpoint('917666718264'), false);
  assert.strictEqual(isInternalEndpoint('+14422129488'), false);
  assert.strictEqual(isInternalEndpoint(''), false);
});

console.log(`  ${passed} passed in total${process.exitCode ? ' (with failures above)' : ''}`);
