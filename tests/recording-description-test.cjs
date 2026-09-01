/* What the Call recording card claims is happening.
 *
 * The line used to say "Every call is recorded automatically" whatever the
 * direction was. That is the kind of wrong that costs somebody the recordings
 * they most wanted: they read it, believe outbound calls are covered, and find
 * out months later that they never were.
 */

const { describeRecording } = require('./recording-description.build.cjs');

let passed = 0, failed = 0;
const is = (name, actual, expected) => {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else { failed += 1; console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`); }
};

/* Each direction says what IS recorded and what is not, because the half that
   is missing is the half somebody needs to know about. */
is('incoming names both halves',
   describeRecording({ automaticEnabled: true, direction: 'incoming' }),
   'Every call that comes in is recorded automatically. Calls you make out are not.');
is('outgoing likewise',
   describeRecording({ automaticEnabled: true, direction: 'outgoing' }),
   'Every call you make out is recorded automatically. Calls that come in are not.');
is('all says both are covered',
   describeRecording({ automaticEnabled: true, direction: 'all' }),
   'Every call is recorded automatically, both the ones that come in and the ones you make.');

/* The stored value is 'all', never 'both' - every live record uses it, and so
   does the dialplan gate. A test so nobody "tidies" it later. */
is('both is NOT a direction this understands',
   describeRecording({ automaticEnabled: true, direction: 'both' }),
   'Calls are recorded automatically.');

/* Case and spacing come from stored data, not from a picker. */
is('case is forgiven', describeRecording({ automaticEnabled: true, direction: 'ALL' }),
   'Every call is recorded automatically, both the ones that come in and the ones you make.');
is('padding too', describeRecording({ automaticEnabled: true, direction: '  incoming ' }),
   'Every call that comes in is recorded automatically. Calls you make out are not.');

/* An unreadable direction describes recording without naming a direction.
   Naming the wrong one is worse than naming none. */
for (const bad of [undefined, null, '', 'sideways', 42]) {
  is(`unknown direction stays vague: ${JSON.stringify(bad)}`,
     describeRecording({ automaticEnabled: true, direction: bad }),
     'Calls are recorded automatically.');
}

/* On-demand is separate and can stand alone. */
is('on demand alone', describeRecording({ onDemandEnabled: true }),
   'People can start a recording during a call.');
is('both switches together',
   describeRecording({ automaticEnabled: true, direction: 'incoming', onDemandEnabled: true }),
   'Every call that comes in is recorded automatically. Calls you make out are not. People can start a recording during a call.');

/* Neither on is a real sentence, not a blank - an empty description reads as
   something that failed to load. */
is('nothing on', describeRecording({}), 'Nothing is recorded.');
is('explicitly off', describeRecording({ automaticEnabled: false, onDemandEnabled: false }), 'Nothing is recorded.');
/* A direction set while automatic is off must not claim recording is happening. */
is('a direction with automatic off still says nothing is recorded',
   describeRecording({ automaticEnabled: false, direction: 'all' }), 'Nothing is recorded.');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
