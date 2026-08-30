/* One allowance, ready for a screen.
 *
 * The cases that matter are the three that used to be shown as a number when
 * they were not one: an allowance nobody told us about, an unlimited allowance
 * held as a very large number, and an allowance of genuinely nothing. Getting
 * any of them wrong puts a wrong fact on a bill.
 */

const { allowanceMeter, isRunningLow, RUNNING_LOW_PERCENT } = require('./allowance-meter.build.cjs');

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

/* The Starter plan: a thousand minutes, four hundred used. */
const starter = allowanceMeter(1000, 400, 'minutes');
is('a real allowance is measured', starter.kind, 'metered');
is('and reads as a person says it', starter.includedText, '1,000 minutes');
is('what is used is shown with its unit', starter.usedText, '400 minutes');
is('what is left is the difference', starter.leftText, '600 minutes');
is('and the bar is forty per cent', starter.percent, 40);
is('nothing is being charged extra', starter.over, false);

/* Unlimited, as the plan record has to store it. */
const unlimited = allowanceMeter(999999999, 12345, 'minutes');
is('a very large allowance is unlimited', unlimited.kind, 'unlimited');
is('and says so in words', unlimited.includedText, 'Unlimited minutes');
is('the sentinel is never printed', unlimited.includedText.includes('999'), false);
is('there is nothing left to count down', unlimited.leftText, 'No limit');
is('and no percentage, because there is no such thing', unlimited.percent, null);
is('unlimited can never be over', unlimited.over, false);
is('use is still reported', unlimited.usedText, '12,345 minutes');

/* Nothing at all is not zero. This is the bug that costs money. */
const missing = allowanceMeter(null, null, 'messages');
is('an absent allowance is unknown', missing.kind, 'unknown');
is('and says so rather than showing a zero', missing.includedText, 'Not available yet');
is('use is unknown too', missing.usedText, 'Not available yet');
is('and no bar is drawn', missing.percent, null);

is(
  'undefined is treated the same way as null',
  allowanceMeter(undefined, undefined, 'minutes').kind,
  'unknown',
);
is('an empty string is not zero either', allowanceMeter('', 5, 'texts').kind, 'unknown');

/* An allowance of nothing is a real fact, and a different one. */
const none = allowanceMeter(0, 30, 'texts');
is('zero included is none, not unknown', none.kind, 'none');
is('and is worded as such', none.includedText, 'None included');
is('with no bar, because it would sit at infinity', none.percent, null);
is('and it is not reported as over', none.over, false);

/* Over the allowance: the row somebody opens the page to find. */
const over = allowanceMeter(100, 137, 'texts');
is('past the allowance is flagged', over.over, true);
is('the percentage keeps going past a hundred', over.percent, 137);
is('and nothing is left', over.leftText, '0 texts');

/* Half-known: the plan says what is included, nobody counted what was used. */
const halfKnown = allowanceMeter(500, null, 'texts');
is('a known allowance still shows', halfKnown.includedText, '500 texts');
is('but what is left cannot be worked out', halfKnown.leftText, 'Not available yet');
is('and no bar is drawn from a guess', halfKnown.percent, null);

/* Strings off an API are numbers as far as this is concerned. */
is('a numeric string is read as a number', allowanceMeter('1000', '400', 'minutes').percent, 40);
is(
  'and a string sentinel is still unlimited',
  allowanceMeter('999999999', '10', 'minutes').kind,
  'unlimited',
);

/* Running low. */
is('eighty per cent is low enough to warn', isRunningLow(allowanceMeter(1000, 800, 'minutes')), true);
is('seventy-nine is not', isRunningLow(allowanceMeter(1000, 790, 'minutes')), false);
is('unlimited is never running low', isRunningLow(unlimited), false);
is('nor is an allowance we cannot read', isRunningLow(missing), false);
is('the threshold is stated, not scattered', RUNNING_LOW_PERCENT, 80);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
