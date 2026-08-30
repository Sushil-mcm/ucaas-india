/* The one list of billing screens.
 *
 * Until now the sidebar kept its own list of billing links and the router kept
 * its own list of billing routes, by hand, in two files that nobody edits at
 * the same time. That is how a menu ends up pointing at a page that no longer
 * exists, and how a page ends up shipping with no way to reach it. Both now
 * read this, so a screen cannot appear in one and be missing from the other.
 *
 * `path` is relative to /admin-settings/billing. `ABSOLUTE` builds the full
 * address so nothing has to concatenate it by hand.
 *
 * **Everything in here is admin-only, deliberately.** Billing used to sit
 * behind the same phone-system feature flag as call handling, which is the
 * wrong question entirely — whether a company has bought the calling module has
 * nothing to do with whether this person is allowed to see the company's
 * invoices. Who may look at money is an administrator question, so that is the
 * check that guards these pages.
 */

export interface BillingSection {
  /* Address under /admin-settings/billing. */
  path: string;
  /* What the menu calls it. Written as a customer would say it out loud. */
  label: string;
  /* The sidebar's icon name. */
  icon: string;
  /* Why this page exists, for the next person editing this list. Not shown. */
  purpose: string;
}

export const BILLING_SECTIONS: BillingSection[] = [
  {
    /* First on purpose. Somebody opening Billing arrives with three questions -
       what am I paying for, what is due next, what have I paid - and this is
       the only page that answers all three without a click. */
    path: 'summary',
    label: 'Summary',
    icon: 'BillingPlanIcon',
    purpose: 'What am I paying, and when.',
  },
  {
    /* What the plan includes against what has been used, plus the calls behind
       the charges. Replaces the old menu entry that jumped straight out to the
       call history report - useful, but it answered "which calls" when the
       question was "am I about to be charged extra". */
    path: 'usage',
    label: 'Usage',
    icon: 'BillingPlanIcon',
    purpose: 'Allowances against what has been used, and where the money went.',
  },
  {
    path: 'plan',
    label: 'Plan',
    icon: 'BillingPlanIcon',
    purpose: 'The plan itself, and changing it.',
  },
  {
    /* The spec for this area called this page "Licences". It is called Licences
       and resources because the same screen also covers numbers, storage and
       AI seats, and splitting them would give four screens with one table
       each. */
    path: 'resources',
    label: 'Licences & resources',
    icon: 'BillingPlanIcon',
    purpose: 'Seats, numbers, storage and AI - bought, assigned and spare.',
  },
  {
    /* Credit top-ups and the saved cards live on one screen as two tabs. They
       are the same errand: making sure there is money to take. */
    path: 'purchase',
    label: 'Credit & payment',
    icon: 'Cart',
    purpose: 'Credit balance, top-ups, auto top-up and saved cards.',
  },
  {
    path: 'invoices',
    label: 'Invoices',
    icon: 'InvoiceIcon',
    purpose: 'Every charge, with its tax broken out.',
  },
  {
    path: 'statement',
    label: 'Statement',
    icon: 'BillingPlanIcon',
    purpose: 'The running ledger, for when the summary is not enough.',
  },
  {
    /* Not add-ons with prices - the platform has no add-on catalogue to price.
       This is the honest version: which modules the plan carries and whether
       this person's role can see them. */
    path: 'modules',
    label: 'Modules & access',
    icon: 'AllNumberIcon',
    purpose: 'Which modules the plan carries, and who can see them.',
  },
  {
    /* Add-ons are licences bought per seat, so they sit beside the plan rather
       than under settings. Nothing here can be bought yet - the page says so
       rather than offering a button that would take a browser-supplied price. */
    path: 'add-ons',
    label: 'Add-ons',
    icon: 'BillingPlanIcon',
    purpose: 'Extras on top of your plan, and which ones you already have.',
  },
  {
    path: 'cost-centres',
    label: 'Cost centres',
    icon: 'BillingPlanIcon',
    purpose: 'Reporting labels. They change nothing about what is charged.',
  },
];

export const BILLING_ROOT = '/admin-settings/billing';

export const ABSOLUTE = (section: BillingSection | string): string =>
  `${BILLING_ROOT}/${typeof section === 'string' ? section : section.path}`;

/* Where a bare /admin-settings/billing lands. */
export const BILLING_DEFAULT_SECTION = 'summary';

/* Screens that used to live at a different address.
 *
 * People bookmark billing pages and finance teams paste them into tickets, so a
 * moved page redirects rather than 404s. Kept here next to the list that moved
 * it, because a redirect added anywhere else is one nobody finds again.
 *
 * `spending` is the only entry today: it grew into the Usage screen, since
 * "what did we spend" and "what does the plan include" are two halves of the
 * same question and nobody wants to hold both pages in their head at once. */
export const BILLING_REDIRECTS: { from: string; to: string }[] = [
  { from: 'spending', to: 'usage' },
];

/* The full price list, which lives under Calling rates rather than Billing.
   Usage links to it instead of growing its own copy of every country's rate. */
export const DESTINATIONS_PATH = '/admin-settings/calling-rates/destinations';

/* The calls themselves. Usage summarises; this is the itemised list. */
export const CALL_HISTORY_PATH = '/reports/call-history';
