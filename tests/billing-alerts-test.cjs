const { billingAlert, isBalanceLow } = require('./billing-alerts.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };

const TODAY = '2026-08-30';
/* A perfectly healthy account: active plan, card saved, card good for years. */
const healthy = {
  planStatus: 'ACTIVE', isTrial: 'N', planExpiryISO: '2026-12-31',
  lastPaymentStatus: 'Completed', hasPaymentMethod: true,
  cardExpMonth: 5, cardExpYear: 2030, todayISO: TODAY,
};

console.log('  --- silence is the normal state ---');
t('a healthy account gets no banner at all', billingAlert(healthy) === null);
t('an account we know nothing about is not accused of anything',
  billingAlert({ todayISO: TODAY }) === null);

console.log('  --- service has already stopped (red) ---');
let a = billingAlert({ ...healthy, planStatus: 'S' });
t('a suspended account is red', a && a.tone === 'danger');
t('and says calls are not connecting', /not connecting/.test(a.detail));
t('the single-letter and spelled-out forms agree',
  billingAlert({ ...healthy, planStatus: 'SUSPENDED' }).title === a.title);
a = billingAlert({ ...healthy, planStatus: 'EXPIRED' });
t('an expired plan is red', a.tone === 'danger');
t('and reassures that nothing was deleted', /nothing has been deleted/i.test(a.detail));
t('its action is to renew', a.actionLabel === 'Renew plan');

console.log('  --- service still works (amber) ---');
a = billingAlert({ ...healthy, lastPaymentStatus: 'Failed' });
t('a failed payment is amber, not red', a.tone === 'warning');
t('it says what still works', /still connecting/.test(a.detail));
t('and names the exact consequence', /new numbers cannot be purchased/.test(a.detail));
a = billingAlert({ ...healthy, hasPaymentMethod: false });
t('no card on file is a warning', a.tone === 'warning' && /No payment method/.test(a.title));
a = billingAlert({ ...healthy, cardExpMonth: 8, cardExpYear: 2026 });
t('a card expiring within 30 days warns', a && /about to expire/.test(a.title));
t('and offers to replace it, not edit it', a.actionLabel === 'Replace card');
t('a card that ran out last month is still flagged',
  billingAlert({ ...healthy, cardExpMonth: 6, cardExpYear: 2026 }) !== null);
t('a card 31 days out is just outside the window, so no nagging',
  billingAlert({ ...healthy, cardExpMonth: 9, cardExpYear: 2026 }) === null);
t('a card good for another year does not warn',
  billingAlert({ ...healthy, cardExpMonth: 9, cardExpYear: 2027 }) === null);

console.log('  --- trials ---');
a = billingAlert({ ...healthy, isTrial: 'Y', planExpiryISO: '2026-09-02' });
t('a trial ending in days warns', a && /trial ends soon/i.test(a.title));
t('with the date spelled out in full', /2 September 2026/.test(a.detail));
t('a trial with weeks to run does not nag',
  billingAlert({ ...healthy, isTrial: 'Y', planExpiryISO: '2026-11-30' }) === null);

console.log('  --- only the worst thing is shown ---');
a = billingAlert({
  ...healthy, planStatus: 'SUSPENDED', lastPaymentStatus: 'Failed',
  hasPaymentMethod: false, cardExpMonth: 9, cardExpYear: 2026,
});
t('four problems still produce one banner', a.tone === 'danger');
t('and it is the suspension', /suspended/i.test(a.title));

console.log('  --- a low balance is a nudge, not a banner ---');
t('a thin balance is flagged', isBalanceLow(4, 10) === true);
t('a healthy balance is not', isBalanceLow(250, 10) === false);
t('exactly on the threshold counts as low', isBalanceLow(10, 10) === true);
t('no balance figure is NOT "you have run out"', isBalanceLow(null) === null);
t('an empty string is not zero either', isBalanceLow('') === null);
t('a real zero balance is genuinely low', isBalanceLow(0) === true);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
