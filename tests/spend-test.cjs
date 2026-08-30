/* Proves the spend breakdown, without a backend or a browser.
 *
 * The cases that matter most are the ones where a wrong answer would be
 * believed: a charge arriving as a string, a total that comes from the server
 * rather than from the rows, and a breakdown that is short because the period
 * held more calls than could be read.
 */

const {
  chargeOf,
  secondsOf,
  directionOf,
  destinationOf,
  spendByPerson,
  spendByDestination,
  spendByDirection,
  onlyCharged,
  topN,
  shareOf,
  readTotals,
  isBreakdownComplete,
  readDuration,
} = require('./spend.build.cjs');

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

/* ---- reading a charge ------------------------------------------------ */

is('charge prefers the per-call total', chargeOf({ charge: 1, chargeTotal: 3 }), 3);
is('charge falls back to the single leg', chargeOf({ charge: 1.5 }), 1.5);
/* The database hands these back as strings often enough that treating them as
   numbers without converting silently concatenates them. */
is('charge as a string still adds up', chargeOf({ chargeTotal: '2.40' }), 2.4);
is('missing charge is zero, not NaN', chargeOf({}), 0);
is('rubbish charge is zero', chargeOf({ charge: 'n/a' }), 0);
is('seconds read from billsectotal', secondsOf({ billsectotal: '90' }), 90);

/* ---- direction ------------------------------------------------------- */

is('outbound', directionOf({ direction: 'Outbound' }), 'Outbound');
is('inbound', directionOf({ direction: 'Inbound' }), 'Inbound');
/* The list endpoint relabels an unanswered inbound call as Missed and a
   voicemail as Voicemail. Both are still calls that came in. */
is('missed counts as inbound', directionOf({ direction: 'Missed' }), 'Inbound');
is('voicemail counts as inbound', directionOf({ direction: 'Voicemail' }), 'Inbound');
is('anything else is other', directionOf({ direction: 'local' }), 'Other');

/* ---- destination ----------------------------------------------------- */

is('a UK number reads as GB', destinationOf({ destination_number: '+442071838750' }).key, 'GB');
is('a US number reads as US', destinationOf({ destination_number: '12125551234' }).key, 'US');
is('an extension is internal', destinationOf({ destination_number: '1001' }).key, 'internal');
is('a blank destination is not recorded', destinationOf({}).key, 'unknown');
is(
  'an unparseable long number keeps something to look at',
  destinationOf({ destination_number: '99999999999999' }).label !== '',
  true,
);

/* ---- grouping -------------------------------------------------------- */

const rows = [
  { extension: '1001', contact_name: 'Amara', chargeTotal: '2.00', billsectotal: '120', direction: 'Outbound', destination_number: '+442071838750' },
  { extension: '1001', contact_name: 'Amara', chargeTotal: '1.00', billsectotal: '60', direction: 'Outbound', destination_number: '+442071838751' },
  { extension: '1002', contact_name: 'Bo', chargeTotal: '5.00', billsectotal: '300', direction: 'Outbound', destination_number: '+4930123456' },
  { extension: '1003', contact_name: 'Kit', chargeTotal: '0', billsectotal: '45', direction: 'Inbound', destination_number: '1003' },
];

const byPerson = spendByPerson(rows);
is('two calls by one person become one row', byPerson.length, 3);
is('most expensive person first', byPerson[0].label, 'Bo (1002)');
is('their charges add up', byPerson[1].amount, 3);
is('their calls are counted', byPerson[1].calls, 2);
is('their time adds up', byPerson[1].seconds, 180);

const byDest = spendByDestination(rows);
is('destinations group by country', byDest[0].key, 'DE');
is('the second country is GB', byDest[1].key, 'GB');
is('GB total is both calls', byDest[1].amount, 3);

const byDir = spendByDirection(rows);
is('outbound leads', byDir[0].key, 'Outbound');
is('outbound total', byDir[0].amount, 8);

/* A call that cost nothing is still a call, but it is not a spender — letting
   it into a top-spend list pushes a real one off the bottom. */
is('free calls drop out of a spend ranking', onlyCharged(byPerson).length, 2);
is('but they were still counted in the group', byPerson.find((g) => g.key === '1003').calls, 1);

is('topN trims', topN(byPerson, 2).length, 2);
is('topN past the end is safe', topN(byPerson, 99).length, 3);
is('topN of nothing is empty', topN([], 5).length, 0);

/* ---- shares ---------------------------------------------------------- */

is('a share is a whole percent', shareOf(3, 8), 38);
is('nothing spent is 0%, not NaN', shareOf(0, 0), 0);
is('a negative total does not produce nonsense', shareOf(5, -1), 0);

/* ---- totals come from the server, not the rows ----------------------- */

const totals = readTotals({
  total_charge: '812.55',
  total_calls: '4210',
  total_duration: '99000',
  outbound_calls: '3000',
  inbound_calls: '1210',
});
is('server total is used as given', totals.amount, 812.55);
is('server call count is used as given', totals.calls, 4210);
is('missing stats do not break it', readTotals(undefined).amount, 0);

/* The whole point of keeping the two apart: 200 rows read out of 4,210 calls
   means the headline is still exact and the breakdown is not the full picture.
   The screen has to say so. */
is('a short read is not complete', isBreakdownComplete(200, totals), false);
is('reading every call is complete', isBreakdownComplete(4210, totals), true);
is('reading more than claimed is complete', isBreakdownComplete(5000, totals), true);
is('no calls at all is trivially complete', isBreakdownComplete(0, readTotals({})), true);

/* ---- readable durations ---------------------------------------------- */

is('seconds under a minute', readDuration(45), '45s');
is('whole minutes', readDuration(120), '2m');
is('hours and minutes', readDuration(3900), '1h 5m');
is('a string of seconds still reads', readDuration('90'), '1m');
is('nothing is 0s', readDuration(0), '0s');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
