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
is('every one is tied to a plan feature', ADD_ONS.every((a) => a.featureKey.trim().length > 0), true);
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
is('included are counted', someOn.included, 2);
is('the rest are counted as not included', someOn.notIncluded, ADD_ONS.length - 2);
is('and none are unknown when the plan was readable', someOn.unknown, 0);

const noPlan = countByState(null);
is('an unreadable plan makes every one unknown', noPlan.unknown, ADD_ONS.length);
is('and claims none are included', noPlan.included, 0);
is('and claims none are excluded either', noPlan.notIncluded, 0);

/* ---- price and purchase ------------------------------------------------ */

/* Nothing in the API supplies an add-on price. A number here would be invented,
   and somebody would budget against it. */
is('no price is invented', priceText(), 'Not available yet');
is('and nothing can be bought from this screen', canPurchaseHere(), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
