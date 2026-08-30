const {
  percentUsed, usageBand, overageUnits, overageCost, isFullyIncluded,
  makeUsageRow, sortUsageRows, hasAnyUsage, unavailableCount, WARNING_AT_PERCENT,
} = require('./billing-usage.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

console.log('  --- how far through the allowance ---');
t('half used is 50%', percentUsed(400, 200) === 50);
t('all used is 100%', percentUsed(400, 400) === 100);
t('over the allowance goes past 100', percentUsed(400, 500) === 125);
t('no allowance is not "instantly over"', percentUsed(0, 50) === null);
t('an unknown used count gives no percentage', percentUsed(400, null) === null);
t('an unknown allowance gives no percentage', percentUsed(null, 200) === null);

console.log('  --- the colour of the bar ---');
t('comfortably inside is quiet', usageBand(400, 100) === 'ok');
t('just under the warning line is still quiet', usageBand(100, 79) === 'ok');
t('the warning line is 80%', WARNING_AT_PERCENT === 80);
t('at 80% it turns amber', usageBand(100, 80) === 'warning');
t('at 100% it turns red', usageBand(100, 100) === 'over');
t('past the allowance stays red', usageBand(100, 250) === 'over');
t('unknown gets no colour at all', usageBand(null, 50) === null);

console.log('  --- what is over ---');
t('inside the allowance is nothing over', overageUnits(400, 200) === 0);
t('and never a negative', overageUnits(400, 0) === 0);
t('past it is counted', overageUnits(400, 450) === 50);
t('without an allowance we cannot know what is over',
  overageUnits(null, 450) === null);
t('without a used count we cannot know either',
  overageUnits(400, null) === null);

console.log('  --- what the overage costs ---');
t('units times rate, to the cent', overageCost(400, 450, 0.012) === 0.6);
t('nothing over costs nothing', overageCost(400, 100, 0.012) === 0);
t('no rate means no cost, NOT a free zero', overageCost(400, 450, null) === null);
t('no allowance means no cost either', overageCost(null, 450, 0.012) === null);

console.log('  --- building a row ---');
let r = makeUsageRow({ service: 'Voice minutes', unit: 'minutes', included: 400, used: 450, rate: 0.02 });
t('a fully known row fills every cell',
  r.included === 400 && r.used === 450 && r.over === 50 && r.cost === 1);
r = makeUsageRow({ service: 'AI voice', unit: 'minutes', included: 60 });
t('a row with no used count keeps used unknown', r.used === null);
t('and therefore keeps over unknown, not zero', r.over === null);
t('and therefore keeps cost unknown, not $0.00', r.cost === null);
r = makeUsageRow({ service: 'Voice minutes', unit: 'minutes', included: 400, used: 100 });
t('a metered row with no published rate still shows what is over', r.over === 0);
t('but not what it costs', r.cost === null);

console.log('  --- which rows get dimmed ---');
t('a row entirely inside its allowance is dimmed',
  isFullyIncluded(makeUsageRow({ service: 'a', unit: 'm', included: 400, used: 10 })));
t('a row over its allowance is not',
  !isFullyIncluded(makeUsageRow({ service: 'a', unit: 'm', included: 400, used: 500 })));
t('a row we know nothing about is NOT dimmed as though it were settled',
  !isFullyIncluded(makeUsageRow({ service: 'a', unit: 'm' })));

console.log('  --- the expensive thing first ---');
const rows = [
  makeUsageRow({ service: 'Unknown thing', unit: 'x' }),
  makeUsageRow({ service: 'Cheap overage', unit: 'm', included: 10, used: 20, rate: 0.1 }),
  makeUsageRow({ service: 'Inside allowance', unit: 'm', included: 100, used: 5 }),
  makeUsageRow({ service: 'Expensive overage', unit: 'm', included: 10, used: 20, rate: 5 }),
  makeUsageRow({ service: 'Over but unpriced', unit: 'm', included: 10, used: 90 }),
];
const sorted = sortUsageRows(rows);
t('the biggest bill is first', sorted[0].service === 'Expensive overage');
t('the smaller bill is second', sorted[1].service === 'Cheap overage');
t('then the overage nobody has priced yet', sorted[2].service === 'Over but unpriced');
t('then what is merely being used', sorted[3].service === 'Inside allowance');
t('and what we know nothing about sinks to the bottom',
  sorted[4].service === 'Unknown thing');
t('sorting does not mutate the original', rows[0].service === 'Unknown thing');

console.log('  --- does the table know anything at all ---');
t('a table with one real figure is worth showing',
  hasAnyUsage([makeUsageRow({ service: 'a', unit: 'm', included: 10 })]));
t('a table of nothing but blanks is not',
  !hasAnyUsage([makeUsageRow({ service: 'a', unit: 'm' })]));
t('the blanks are counted so the screen can warn once',
  unavailableCount(rows) === 1);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
