/* Proves what each add-on card is allowed to claim.
 *
 * The case that matters most is the one that looks like a detail: "we could not
 * read your plan" and "your plan does not include this" are different answers,
 * and showing the first as the second invites somebody to buy a thing they
 * already have.
 */

const {
  ADD_ONS,
  addOnState,
  STATE_LABEL,
  countByState,
  priceText,
  canPurchaseHere,
  estimateMonthlyCost,
} = require('./addons.build.cjs');

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

const addOn = (id) => ADD_ONS.find((a) => a.id === id);

/* ---- the catalogue itself --------------------------------------------- */

is('there are add-ons to show', ADD_ONS.length > 0, true);
is('every one has a name', ADD_ONS.every((a) => a.name.trim().length > 0), true);
/* The line that tells somebody whether it is worth the money. A card without it
   is a price with no reason attached. */
is('every one says what it replaces', ADD_ONS.every((a) => a.replaces.trim().length > 0), true);
is('every one says how it is charged', ADD_ONS.every((a) => a.billing.trim().length > 0), true);
is('any feature key given is non-empty', ADD_ONS.every((a) => a.featureKey === undefined || a.featureKey.trim().length > 0), true);
is('ids are unique', new Set(ADD_ONS.map((a) => a.id)).size, ADD_ONS.length);

/* ---- reading whether a company already has it -------------------------- */

const ai = addOn('ai');

is('a feature reported as an object with IS_SHOW true is included',
   addOnState({ ai: { IS_SHOW: true } }, ai), 'included');
is('IS_SHOW false is not included',
   addOnState({ ai: { IS_SHOW: false } }, ai), 'not-included');
/* Some features are reported as a bare object with no flag - the platform's way
   of saying "you have this". */
is('an object with no flag counts as included',
   addOnState({ ai: { action: {} } }, ai), 'included');
is('a plain true is included', addOnState({ ai: true }, ai), 'included');
is('a plain false is not included', addOnState({ ai: false }, ai), 'not-included');
is('a feature simply absent is not included', addOnState({ video: true }, ai), 'not-included');
/* AI voice is bought separately and has no flag, so it must never claim to be
   included just because AI assistance is. */
is('an add-on with no flag is unknown even on a full plan',
   addOnState({ ai: { IS_SHOW: true } }, addOn('ai_voice')), 'unknown');

/* The distinction this module exists for. */
is('no plan data at all is unknown, not "no"', addOnState(null, ai), 'unknown');
is('undefined is unknown', addOnState(undefined, ai), 'unknown');
is('a non-object is unknown', addOnState('yes', ai), 'unknown');

/* ---- the wording ------------------------------------------------------ */

is('included reads plainly', STATE_LABEL.included, 'On your plan');
is('not included reads plainly', STATE_LABEL['not-included'], 'Not on your plan');
/* Never "no" when the truth is "we do not know". */
is('unknown does not claim absence', STATE_LABEL.unknown, 'Not available yet');

/* ---- counting --------------------------------------------------------- */

const someOn = countByState({ ai: { IS_SHOW: true }, video: true, campaign: { IS_SHOW: false } });
const keyless = ADD_ONS.filter((a) => !a.featureKey).length;
is('included are counted', someOn.included, 2);
is('the rest are counted as not included', someOn.notIncluded, ADD_ONS.length - 2 - keyless);
/* An add-on with no flag of its own stays unknown even when the plan reads fine. */
is('add-ons with no flag stay unknown', someOn.unknown, keyless);
is('at least one add-on has no flag of its own', keyless > 0, true);

const noPlan = countByState(null);
is('an unreadable plan makes every one unknown', noPlan.unknown, ADD_ONS.length);
is('and claims none are included', noPlan.included, 0);
is('and claims none are excluded either', noPlan.notIncluded, 0);

/* ---- price and purchase ------------------------------------------------ */

/* Nothing in the API supplies an add-on price. A number here would be invented,
   and somebody would budget against it. */
is('no price is invented', priceText(), 'Not available yet');
is('and nothing can be bought from this screen', canPurchaseHere(), false);

/* ---- what an add-on costs this month ---------------------------------- */

const intl = addOn('international');
const aiVoice = addOn('ai_voice');

is('the bundle is priced', intl.monthlyPrice, 20);
is('and says what that includes', intl.included, 8000);
is('and what a minute costs past it', intl.overageRate, 0.02);
is('AI voice is priced', aiVoice.monthlyPrice, 45);
is('with its own smaller allowance', aiVoice.included, 100);
/* AI voice costs far more per minute to run than a normal call, so its rate is
   more than ten times the calling rate. They are deliberately not the same. */
is('and a much higher rate, because a minute of it costs more to run', aiVoice.overageRate, 0.25);

/* Inside the allowance, the bill is just the monthly price. */
is('well under the allowance costs the base price', estimateMonthlyCost(intl, 3000).total, 20);
is('exactly at the allowance is still the base price', estimateMonthlyCost(intl, 8000).total, 20);
is('and nothing is counted as overage there', estimateMonthlyCost(intl, 8000).overUnits, 0);

/* One minute past, and only that minute is charged - not the whole month. */
const oneOver = estimateMonthlyCost(intl, 8001);
is('one minute over charges for one minute', oneOver.overUnits, 1);
is('at two cents', oneOver.overage, 0.02);
is('so the total is the base plus two cents', oneOver.total, 20.02);

is('a hundred minutes over', estimateMonthlyCost(intl, 8100).overage, 2);
is('AI voice past its hundred minutes', estimateMonthlyCost(aiVoice, 110).overage, 2.5);
is('and its total', estimateMonthlyCost(aiVoice, 110).total, 47.5);
is('inside the allowance it is just the monthly price', estimateMonthlyCost(aiVoice, 60).total, 45);

/* Rounding is done once at the end. Rounding every minute first drifts by whole
   cents across thousands of them, and a bill that misses a quote by cents is
   still a bill somebody queries. */
is('an awkward number still lands on a clean cent', estimateMonthlyCost(intl, 8333).overage, 6.66);

/* Usage we do not know is not usage of zero - the honest answer is the base
   price, never a total implying nothing was used. */
is('no usage figure gives the base price', estimateMonthlyCost(intl).total, 20);
is('rubbish usage does not become a charge', estimateMonthlyCost(intl, NaN).total, 20);
is('negative usage is not a credit', estimateMonthlyCost(intl, -500).total, 20);

/* An add-on with no price cannot have a cost worked out for it. */
is('an unpriced add-on returns nothing rather than zero', estimateMonthlyCost(addOn('video'), 10), null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
