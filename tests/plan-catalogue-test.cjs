/* The plans we sell, pinned to what the platform's plan records actually say.
 *
 * These figures are the ones a customer is charged and the ones a comparison
 * table promises, so they are written down twice on purpose: once as the
 * catalogue, once here. If somebody reprices a plan and only edits one of them,
 * this test fails — which is the whole point. When a price genuinely changes,
 * the expectation below is updated deliberately, in the same commit.
 */

const {
  PLANS,
  planByName,
  ratesForPlan,
  yearlySavingPercent,
  describeIncludedAllowance,
  describeAllowance,
  describeStoredAllowance,
  storedAllowanceIsUnlimited,
  UNLIMITED,
  UNLIMITED_STORED_THRESHOLD,
} = require('./plan-catalogue.build.cjs');

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

/* What is on sale, in the order a customer sees it. */
is('four plans are sold', PLANS.map((p) => p.name), ['Basic', 'Starter', 'Professional', 'Ultimate']);

/* The prices, per seat. */
is('Starter is eighteen a month', planByName('Starter').monthlyPerSeat, 18);
is('with no published yearly price', planByName('Starter').yearlyPerSeat, null);
is('Professional is thirty a month', planByName('Professional').monthlyPerSeat, 30);
is('nor does Professional', planByName('Professional').yearlyPerSeat, null);
is('Ultimate is forty-two a month', planByName('Ultimate').monthlyPerSeat, 42);
is('nor does Ultimate', planByName('Ultimate').yearlyPerSeat, null);

/* The allowances. */
is('Starter includes a thousand minutes', planByName('Starter').includes.domesticMinutes, 1000);
is('and a hundred texts', planByName('Starter').includes.sms, 100);
is(
  'Professional calling is unlimited',
  planByName('Professional').includes.domesticMinutes,
  UNLIMITED,
);
is('with five hundred texts', planByName('Professional').includes.sms, 500);
is(
  'Ultimate calling is unlimited',
  planByName('Ultimate').includes.domesticMinutes,
  UNLIMITED,
);
is('with a thousand texts', planByName('Ultimate').includes.sms, 1000);

/* A year is priced individually now, so there is no saving to show. null is
   the honest answer - and it matters that it is null rather than 0, because a
   screen printing "save 0%" would be claiming a yearly plan exists. */
is('no yearly saving on Starter', yearlySavingPercent(planByName('Starter')), null);
is('nor on Professional', yearlySavingPercent(planByName('Professional')), null);
is('nor on Ultimate', yearlySavingPercent(planByName('Ultimate')), null);

/* Looking a plan up by the name the platform reports. */
is('the lookup is not case-sensitive', planByName('ultimate').id, 'ultimate');
is('an unknown plan is refused rather than guessed', planByName('Platinum'), null);
is('and so is no plan at all', planByName(''), null);
is('as is nothing', planByName(null), null);

/* Rates only where they can apply. */
is('Starter charges for minutes past the allowance', ratesForPlan('Starter').domesticMinuteRate, 0.02);
is('and four cents a text', ratesForPlan('Starter').smsRate, 0.04);
is(
  'Ultimate has no minute rate, because minutes cannot run out',
  ratesForPlan('Ultimate').domesticMinuteRate,
  undefined,
);
is('but texts still have one', ratesForPlan('Ultimate').smsRate, 0.04);
is('a plan we do not recognise gets no rates at all', ratesForPlan('Legacy Gold'), null);

/* Unlimited, in both the forms it comes in. */
is('the word is printed as a word', describeAllowance(UNLIMITED, 'minutes'), 'Unlimited minutes');
is(
  'and so is the stored form',
  describeStoredAllowance(UNLIMITED_STORED_THRESHOLD, 'minutes'),
  'Unlimited minutes',
);
is('the sentinel is a whole number the column can hold', UNLIMITED_STORED_THRESHOLD, 999999999);
is('anything at or above it counts', storedAllowanceIsUnlimited(1000000000), true);
is('and an ordinary allowance does not', storedAllowanceIsUnlimited(1000), false);
is(
  'nothing is not zero minutes',
  describeStoredAllowance(null, 'minutes'),
  'Not available yet',
);
is('a real allowance is grouped for reading', describeStoredAllowance(1000, 'minutes'), '1,000 minutes');


/* The entry plan - no seat charge, nothing included, pay per unit.
   Its zero is a real zero and must not be mistaken for "unknown". */
is('Basic costs nothing per seat', planByName('Basic').monthlyPerSeat, 0);
is('and includes no minutes', planByName('Basic').includes.domesticMinutes, 0);
is('and no texts', planByName('Basic').includes.sms, 0);
is('and no numbers', planByName('Basic').includes.numbers, 0);
is('but every minute has a price', ratesForPlan('Basic').domesticMinuteRate, 0.02);
is('and so does every text', ratesForPlan('Basic').smsRate, 0.04);

/* Zero included is not the same sentence as zero left. */
is(
  'an included zero reads as pay as you go',
  describeIncludedAllowance(0, 'minutes'),
  'Pay as you go',
);
is(
  'a real allowance still reads as a number',
  describeIncludedAllowance(1000, 'minutes'),
  '1,000 minutes',
);
is(
  'and unlimited still reads as unlimited',
  describeIncludedAllowance('unlimited', 'minutes'),
  'Unlimited minutes',
);

/* The old name must not quietly resolve to the renamed plan - a customer
   record still saying "Enterprise" is unknown to us, not Ultimate. */
is('the retired name resolves to nothing', planByName('Enterprise'), null);
is('and has no rates', ratesForPlan('Enterprise'), null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
