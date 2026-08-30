const {
  knownNumber, roundMoney, formatMoney, moneyOrUnavailable, UNAVAILABLE,
  formatBillingDate, dateOrUnavailable, planDays, remainingDays, prorate,
  licenceQuote, cardExpiresSoon, MINIMUM_CHARGE, DAYS_PER_BILLING_MONTH,
} = require('./billing-money.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

console.log('  --- a missing figure is not zero ---');
t('null has no answer', knownNumber(null) === null);
t('undefined has no answer', knownNumber(undefined) === null);
t('an empty string has no answer', knownNumber('') === null);
t('nonsense has no answer', knownNumber('abc') === null);
t('a real zero is kept, because zero is a fact', knownNumber(0) === 0);
t('a numeric string is a number', knownNumber('12.5') === 12.5);
t('the API sending a decimal as a string still works', knownNumber('0.00') === 0);

console.log('  --- rounding to the cent ---');
t('floating point noise is cleaned up', roundMoney(0.1 + 0.2) === 0.3);
t('half a cent rounds up', roundMoney(1.005) === 1.01);
t('an exact amount is left alone', roundMoney(124.5) === 124.5);

console.log('  --- writing money ---');
t('always two decimals', formatMoney(124.5) === '$124.50');
t('thousands are separated', formatMoney(12345.6) === '$12,345.60');
t('zero prints as zero when it really is zero', formatMoney(0) === '$0.00');
t('a refund shows its sign', formatMoney(-20) === '-$20.00');
t('an unknown amount is not invented', formatMoney(null) === null);
t('and the screen says so instead', moneyOrUnavailable(undefined) === UNAVAILABLE);
t('the admission is one fixed phrase', UNAVAILABLE === 'Not available yet');

console.log('  --- writing dates ---');
t('spelled out in full', formatBillingDate('2026-09-15') === '15 September 2026');
t('a timestamp still reads as its calendar day',
  formatBillingDate('2026-09-15T23:30:00Z') === '15 September 2026');
t('January and December are not off by one',
  formatBillingDate('2026-01-01') === '1 January 2026'
  && formatBillingDate('2026-12-31') === '31 December 2026');
t('a rubbish date is admitted, not guessed', formatBillingDate('not a date') === null);
t('a missing date says so', dateOrUnavailable(null) === UNAVAILABLE);

console.log('  --- how long a cycle is ---');
t('a monthly plan is 30 days', planDays(1) === 30);
t('a yearly plan is 360 billing days', planDays(12) === 360);
t('a month is 30 days by rule', DAYS_PER_BILLING_MONTH === 30);
t('no duration means no answer', planDays(null) === null);
t('a zero duration is not a cycle', planDays(0) === null);

console.log('  --- how much of the cycle is left ---');
t('a full month ahead is 30 days', remainingDays('2026-09-15', '2026-08-15') === 30);
t('a fortnight is counted plainly', remainingDays('2026-08-29', '2026-08-15') === 14);
t('one month and a few days adds up', remainingDays('2026-09-20', '2026-08-15') === 35);
t('a cycle that ended has nothing left', remainingDays('2026-08-01', '2026-08-15') === 0);
t('the same day has nothing left', remainingDays('2026-08-15', '2026-08-15') === 0);
t('the last day of the cycle still counts as a day',
  remainingDays('2026-08-16', '2026-08-15') === 1);
t('a short February does not produce a negative',
  remainingDays('2026-03-30', '2026-01-31') >= 1);
t('a missing expiry gives no answer', remainingDays(null, '2026-08-15') === null);

console.log('  --- the part-cycle charge ---');
t('half a cycle costs half', prorate(30, 30, 15) === 15);
t('a whole cycle costs the whole thing', prorate(30, 30, 30) === 30);
t('nothing left costs nothing', prorate(30, 30, 0) === 0);
t('the answer is rounded to the cent', prorate(100, 30, 7) === 23.33);
t('a tiny charge is lifted to the processor minimum',
  prorate(1, 30, 1) === MINIMUM_CHARGE);
t('but a genuine zero is not lifted', prorate(1, 30, 0) === 0);
t('a missing cost gives no answer, not zero', prorate(null, 30, 15) === null);

console.log('  --- the sentence shown before somebody buys ---');
let q = licenceQuote({
  costPerLicencePerCycle: 20, licences: 3, planDurationMonths: 1,
  planExpiryISO: '2026-09-15', todayISO: '2026-09-01',
});
t('a quote is produced', q !== null);
t('today covers only the days that are left', q.daysCovered === 14);
t('and is charged pro rata', q.chargedToday === 28);
t('the ongoing figure is the full cycle price', q.monthlyFromNextBill === 60);
t('the sentence has a date to name', q.nextBillDate === '2026-09-15');
q = licenceQuote({
  costPerLicencePerCycle: 20, licences: 3, planDurationMonths: 1,
  planExpiryISO: '2026-09-15', todayISO: '2026-09-01',
  nextBillDateISO: '2026-09-16',
});
t('an explicit next bill date wins', q.nextBillDate === '2026-09-16');
t('no price means no quote, so Confirm stays disabled',
  licenceQuote({
    costPerLicencePerCycle: null, licences: 3, planDurationMonths: 1,
    planExpiryISO: '2026-09-15', todayISO: '2026-09-01',
  }) === null);
t('buying nothing is not a purchase',
  licenceQuote({
    costPerLicencePerCycle: 20, licences: 0, planDurationMonths: 1,
    planExpiryISO: '2026-09-15', todayISO: '2026-09-01',
  }) === null);

console.log('  --- a card about to stop working ---');
t('expiring next month is a warning',
  cardExpiresSoon(9, 2026, '2026-09-01') === true);
t('a card works to the last day of its month',
  cardExpiresSoon(8, 2026, '2026-08-31') === true);
t('a year away is not a warning',
  cardExpiresSoon(8, 2027, '2026-08-30') === false);
t('an already expired card is still flagged',
  cardExpiresSoon(1, 2026, '2026-08-30') === true);
t('no expiry on file gives no answer, not a false alarm',
  cardExpiresSoon(null, 2026, '2026-08-30') === null);
t('a nonsense month gives no answer',
  cardExpiresSoon(13, 2026, '2026-08-30') === null);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
