/* Proves the allowance-then-wallet rule, using the product owner's own example:
 * an enterprise plan with 1,500 US minutes, 100 texts, 100 AI replies and 10 AI
 * voice minutes. Past each allowance, every further unit is charged from the
 * wallet.
 *
 * The cases worth the most attention are the ones where being wrong is quiet:
 * an event that straddles the end of an allowance, and the difference between
 * "this now costs money" and "you cannot afford this".
 */

const { chargeFor, canStart, periodTotal } = require('./plan-allowance.build.cjs');

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

/* The plan as described. */
const voice = { service: 'voice_minutes', included: 1500, used: 0, rate: 0.02, unit: 'minutes' };
const sms = { service: 'sms', included: 100, used: 0, rate: 0.04, unit: 'texts' };
const replies = { service: 'ai_replies', included: 100, used: 0, rate: 0.08, unit: 'replies' };
const aiVoice = { service: 'ai_voice_minutes', included: 10, used: 0, rate: 0.1, unit: 'minutes' };

const rich = { balance: 50 };
const empty = { balance: 0 };

/* ---- inside the allowance --------------------------------------------- */

const early = chargeFor(voice, 30, rich);
is('a call inside the allowance is free', early.cost, 0);
is('and all of it comes from the plan', early.fromAllowance, 30);
is('nothing is charged', early.charged, 0);
is('and the remaining allowance is reported', early.allowanceLeft, 1470);

/* ---- the case that gets billed wrongly --------------------------------- */

/* Ten AI voice minutes used, an eleventh minute wanted: the eleventh is
   charged, not the whole call. This is the exact example given. */
const eleventh = chargeFor({ ...aiVoice, used: 10 }, 1, rich);
is('the eleventh AI voice minute is charged', eleventh.charged, 1);
is('at ten cents', eleventh.cost, 0.1);
is('and none of it came from the plan', eleventh.fromAllowance, 0);

/* An event that straddles the end of an allowance is SPLIT. Treating it as
   wholly free or wholly charged is wrong on the one call somebody queries. */
const straddle = chargeFor({ ...aiVoice, used: 8 }, 10, rich);
is('two minutes come from the allowance', straddle.fromAllowance, 2);
is('and eight are charged', straddle.charged, 8);
is('costing eighty cents', straddle.cost, 0.8);
is('with the allowance now empty', straddle.allowanceLeft, 0);
is('and the split is explained', straddle.message.includes('covered by your plan, then'), true);

is('exactly at the allowance is still free', chargeFor({ ...voice, used: 1490 }, 10, rich).cost, 0);
is('one past it is charged', chargeFor({ ...voice, used: 1500 }, 1, rich).cost, 0.02);

/* ---- texts and replies behave the same way ----------------------------- */

is('texts past the allowance are charged each',
   chargeFor({ ...sms, used: 100 }, 5, rich).cost, 0.2);
is('AI replies past the allowance are charged each',
   chargeFor({ ...replies, used: 100 }, 10, rich).cost, 0.8);
is('a plan including nothing charges from the first unit',
   chargeFor({ ...sms, included: 0 }, 3, rich).charged, 3);

/* ---- money ------------------------------------------------------------ */

/* Rounded once at the end. Rounding each minute first drifts across a long
   call, and a bill that misses its own quote by cents still gets queried. */
is('an awkward total lands on a clean cent',
   chargeFor({ ...voice, used: 1500, rate: 0.007 }, 333, rich).cost, 2.33);

/* ---- running out of money is NOT running out of allowance -------------- */

const cannotAfford = chargeFor({ ...aiVoice, used: 10 }, 100, empty);
is('the cost is still worked out', cannotAfford.cost, 10);
is('but it is not affordable', cannotAfford.affordable, false);
is('and the shortfall is named', cannotAfford.shortfall, 10);
is('and said plainly', cannotAfford.message.includes('short of'), true);

const partlyAfford = chargeFor({ ...aiVoice, used: 10 }, 100, { balance: 4 });
is('a partial balance is still short', partlyAfford.affordable, false);
is('by the difference', partlyAfford.shortfall, 6);

is('inside the allowance an empty wallet is fine',
   chargeFor(aiVoice, 5, empty).affordable, true);

/* ---- may this go ahead at all? ---------------------------------------- */

is('allowance left means included', canStart(aiVoice, empty).decision, 'included');
is('even with no money, because the plan covers it',
   canStart(aiVoice, empty).reason.includes('left on your plan'), true);

is('no allowance but money means charged',
   canStart({ ...aiVoice, used: 10 }, rich).decision, 'charged');
is('no allowance and no money is refused',
   canStart({ ...aiVoice, used: 10 }, empty).decision, 'refused');
is('and the refusal says how to fix it',
   canStart({ ...aiVoice, used: 10 }, empty).reason.includes('Top up'), true);

/* A balance that covers exactly one unit is enough to begin. */
is('enough for one unit is enough to start',
   canStart({ ...aiVoice, used: 10 }, { balance: 0.1 }).decision, 'charged');
is('less than one unit is refused',
   canStart({ ...aiVoice, used: 10 }, { balance: 0.09 }).decision, 'refused');

/* No rate means we do not know what to charge. Guessing a price is worse than
   letting it through. */
is('an unknown rate does not refuse anybody',
   canStart({ ...aiVoice, used: 10, rate: 0 }, empty).decision, 'charged');

/* ---- the period total -------------------------------------------------- */

const total = periodTotal([
  { plan: { ...voice, used: 1500 }, units: 100, wallet: rich },
  { plan: { ...sms, used: 100 }, units: 50, wallet: rich },
  { plan: { ...replies, used: 100 }, units: 25, wallet: rich },
]);
is('charges add up across services', total.total, 6);
is('and all three were counted', total.counted, 3);

/* A service nobody has counted is left out, not counted as zero - a total that
   quietly omits it while looking complete is the number somebody disputes. */
const withGap = periodTotal([
  { plan: { ...voice, used: 1500 }, units: 100, wallet: rich },
  { plan: { ...aiVoice, used: 10 }, units: undefined, wallet: rich },
]);
is('an uncounted service does not become zero', withGap.uncounted, ['ai_voice_minutes']);
is('and only the counted one is totalled', withGap.total, 2);
is('with the count made plain', withGap.counted, 1);

/* ---- nonsense in, nothing broken -------------------------------------- */

is('negative usage is not a credit', chargeFor(voice, -50, rich).charged, 0);
is('rubbish units charge nothing', chargeFor(voice, NaN, rich).cost, 0);
is('a missing wallet is treated as empty',
   chargeFor({ ...aiVoice, used: 10 }, 5, {}).affordable, false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
