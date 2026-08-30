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
is('three plans are sold', PLANS.map((p) => p.name), ['Starter', 'Professional', 'Enterprise']);

/* The prices, per seat. */
is('Starter is eighteen a month', planByName('Starter').monthlyPerSeat, 18);
is('and a hundred and sixty-two a year', planByName('Starter').yearlyPerSeat, 162);
is('Professional is thirty a month', planByName('Professional').monthlyPerSeat, 30);
is('and two hundred and seventy a year', planByName('Professional').yearlyPerSeat, 270);
is('Enterprise is forty-two a month', planByName('Enterprise').monthlyPerSeat, 42);
is('and three hundred and seventy-eight a year', planByName('Enterprise').yearlyPerSeat, 378);

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
  'Enterprise calling is unlimited',
  planByName('Enterprise').includes.domesticMinutes,
  UNLIMITED,
);
is('with a thousand texts', planByName('Enterprise').includes.sms, 1000);

/* A yearly plan saves a quarter against paying monthly, on every plan. */
is('Starter saves a quarter over the year', yearlySavingPercent(planByName('Starter')), 25);
is('so does Professional', yearlySavingPercent(planByName('Professional')), 25);
is('and so does Enterprise', yearlySavingPercent(planByName('Enterprise')), 25);

/* Looking a plan up by the name the platform reports. */
is('the lookup is not case-sensitive', planByName('enterprise').id, 'enterprise');
is('an unknown plan is refused rather than guessed', planByName('Platinum'), null);
is('and so is no plan at all', planByName(''), null);
is('as is nothing', planByName(null), null);

/* Rates only where they can apply. */
is('Starter charges for minutes past the allowance', ratesForPlan('Starter').domesticMinuteRate, 0.02);
is('and four cents a text', ratesForPlan('Starter').smsRate, 0.04);
is(
  'Enterprise has no minute rate, because minutes cannot run out',
  ratesForPlan('Enterprise').domesticMinuteRate,
  undefined,
);
is('but texts still have one', ratesForPlan('Enterprise').smsRate, 0.04);
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
