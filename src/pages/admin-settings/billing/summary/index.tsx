/* What you are paying, what is next, and what you have paid — on one page.
 *
 * Billing is nine menu items. Everything a customer needs is in there somewhere,
 * but the three questions they actually arrive with —
 *
 *   what am I paying for
 *   what will I be charged next, and when
 *   what have I been charged before
 *
 * — are spread across three of those pages, and nothing answers them together.
 * Somebody checking their bill is not browsing, so this page answers all three
 * before a single click.
 *
 * Nothing here is a new figure. Every number comes from the same endpoints the
 * other billing pages use — and, importantly, under the same query keys. An
 * earlier version of this page fetched the plan and the cards under keys of its
 * own, which meant adding a card on the Credit & payment screen refreshed that
 * screen and left this one showing the old card indefinitely. Sharing the hooks
 * fixes that: one cache, one answer, everywhere.
 *
 * Where a figure has no source the screen says so rather than printing a zero.
 * On a billing page a zero is not a neutral placeholder — it is a claim the
 * customer will plan around, and then ask for a refund over.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { callList, getInvoice } from '@/services/api';
import { useGetMyPlanDetails, useGetSavedCards } from '@/hooks/common';
import { readTotals } from '@/lib/spend-breakdown';
import { UNAVAILABLE, dateOrUnavailable, knownNumber, moneyOrUnavailable } from '@/lib/billing-money';
import { describeStoredAllowance } from '@/lib/plan-catalogue';
import { billingAlert } from '@/lib/billing-alerts';
import { ABSOLUTE, CALL_HISTORY_PATH } from '../billing-sections';

/* Today and the first of this month, as plain calendar dates. Used both for the
   "this month" tile and for every "is this soon?" decision on the page, so the
   whole screen agrees about what day it is. */
const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* One tile: a big number with a small label beneath it.
 *
 * The number is what somebody is scanning for, so it leads and the label
 * explains it — the other way round makes a row of tiles read as a list of
 * headings. `hint` carries the second fact that makes the first one useful
 * ("7 unassigned" next to 43 of 50). */
const Tile = ({
  value,
  label,
  hint,
  loading,
  tone,
}: {
  value: string;
  label: string;
  hint?: string;
  loading?: boolean;
  tone?: 'warning';
}) => (
  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-4">
    {loading ? (
      <Skeleton className="h-7 w-24 bg-[#F0DFC5]" />
    ) : (
      <p
        className={`text-2xl font-semibold tabular-nums leading-tight ${
          tone === 'warning' ? 'text-amber-600' : 'text-[#2E2D35]'
        }`}
      >
        {value}
      </p>
    )}
    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9A948F]">
      {label}
    </p>
    {hint ? <p className="mt-0.5 text-xs text-[#9A948F]">{hint}</p> : null}
  </div>
);

const BillingSummary = () => {
  const today = useMemo(() => isoDay(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return isoDay(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const {
    data: plan,
    isLoading: planLoading,
    isError: planFailed,
  } = useGetMyPlanDetails(undefined, true) as any;

  const { data: cards = [], isLoading: cardsLoading } = useGetSavedCards() as any;

  const {
    data: invoiceData,
    isLoading: invoicesLoading,
    isError: invoicesFailed,
  } = useQuery({
    queryKey: ['getInvoice', 'summary'],
    queryFn: () => getInvoice({ page: 1, limit: 5 } as any),
    staleTime: 60 * 1000,
    retry: false,
  });

  /* This month's calling, from the server's own totals for the period so the
     tile cannot disagree with the Usage page or the invoice. */
  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['usage-totals', monthStart, today],
    queryFn: () =>
      callList({
        page: 1,
        limit: 1,
        filter: [],
        filter_date: { from: monthStart, to: today },
        sort: {},
      }),
    staleTime: 60 * 1000,
    retry: false,
  });

  const current = plan?.current_plan_details ?? {};
  const next = plan?.next_billing_details ?? {};
  const licences = plan?.license_detail ?? {};
  const lastBilling = plan?.last_billing ?? null;

  const monthTotals = useMemo(
    () => readTotals((monthData as any)?.data?.data?.result?.call_stats),
    [monthData],
  );

  /* The card that will actually be charged. Showing "a card is saved" when three
     are saved and the wrong one is primary would be worse than showing none. */
  const primaryCard = useMemo(() => {
    const list = Array.isArray(cards) ? cards : [];
    return list.find((c: any) => c?.is_primary === 'Y' || c?.is_primary === true) ?? list[0];
  }, [cards]);

  const invoices = useMemo(() => {
    const rows =
      (invoiceData as any)?.data?.data?.result?.rows ?? (invoiceData as any)?.data?.data?.rows ?? [];
    return Array.isArray(rows) ? rows.slice(0, 5) : [];
  }, [invoiceData]);

  /* One banner, only when something is actually wrong, and it names the
     consequence rather than the status. The rules live in billing-alerts so they
     can be tested — deciding whether an account is in trouble is not something
     to work out inside a ternary. */
  const alert = useMemo(() => {
    if (planLoading || cardsLoading) return null;
    return billingAlert({
      planStatus: current?.plan_status,
      isTrial: current?.is_trial,
      planExpiryISO: current?.plan_expiration_date,
      lastPaymentStatus: lastBilling?.status,
      hasPaymentMethod: Boolean(primaryCard),
      cardExpMonth: primaryCard?.exp_month,
      cardExpYear: primaryCard?.exp_year,
      todayISO: today,
    });
  }, [planLoading, cardsLoading, current, lastBilling, primaryCard, today]);

  const isTrial = String(current?.is_trial ?? '').toUpperCase() === 'Y';
  const expired = String(current?.plan_status ?? '').toUpperCase() === 'EXPIRED';

  const perSeat = current?.discount_enabled ? current?.discount_price : current?.original_price;

  const purchased = knownNumber(licences?.total_licenses);
  const assigned = knownNumber(licences?.used_licenses);
  const spare = knownNumber(licences?.free_licenses);

  return (
    <AdminPage
      section="Billing"
      title="Billing summary"
      description="What you are paying for, what is due next, and what you have paid before."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {/* Only on screen when there is something to do. A banner that is always
            there is wallpaper, and people scroll past the one time it matters. */}
        {alert ? (
          <div
            role="status"
            className={`mb-3 flex flex-wrap items-start gap-3 rounded-lg border p-3.5 ${
              alert.tone === 'danger'
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="min-w-[16rem] flex-1">
              <p
                className={`text-sm font-semibold ${
                  alert.tone === 'danger' ? 'text-red-800' : 'text-amber-900'
                }`}
              >
                {alert.title}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  alert.tone === 'danger' ? 'text-red-700' : 'text-amber-800'
                }`}
              >
                {alert.detail}
              </p>
            </div>
            <Link to={alert.actionHref}>
              <Button type="button" variant="outline">
                {alert.actionLabel}
              </Button>
            </Link>
          </div>
        ) : null}

        {/* The hero. Everything above the fold answers "what am I paying, and
            when" without a click, which is the whole point of the page. */}
        <SettingCard
          title="Your plan"
          description={
            planFailed
              ? 'Your plan could not be loaded just now.'
              : expired
                ? 'This plan has expired. Renewing puts your numbers and settings straight back into service.'
                : isTrial
                  ? 'You are on a trial. Choosing a plan before it ends keeps your numbers.'
                  : 'What you are paying for at the moment.'
          }
          aside={
            <Link to={ABSOLUTE('plan')}>
              <Button type="button" variant="outline">
                {expired || isTrial ? 'Choose a plan' : 'Change plan'}
              </Button>
            </Link>
          }
        >
          {planFailed ? (
            <SettingRow
              label="Nothing is wrong with your account"
              description="This screen could not read your plan. Reload the page; if it keeps happening the Plan screen shows the same details."
            />
          ) : planLoading ? (
            <>
              <SettingRow label="Plan" description="" control={<Skeleton className="h-4 w-32 bg-[#F0DFC5]" />} />
              <SettingRow label="Included each month" description="" control={<Skeleton className="h-4 w-40 bg-[#F0DFC5]" />} />
              <SettingRow label="Per licence" description="" control={<Skeleton className="h-4 w-20 bg-[#F0DFC5]" />} />
              <SettingRow label="Next bill" description="" control={<Skeleton className="h-4 w-24 bg-[#F0DFC5]" />} />
            </>
          ) : (
            <>
              <SettingRow
                label="Plan"
                description={current?.plan_name || 'No plan chosen yet'}
                control={
                  <span className="text-sm font-semibold text-[#2E2D35]">
                    {current?.plan_duration ? `Billed every ${current.plan_duration}` : UNAVAILABLE}
                  </span>
                }
              />
              {/* What the plan actually includes, which is half of "what am I
                  paying for" and used to be missing from the page that asks it.
                  Printed through the catalogue's own formatter: an unlimited
                  allowance is held as a very large number on the plan record, and
                  a customer who reads "999,999,999 minutes" learns nothing except
                  that we cannot be trusted with numbers. */}
              <SettingRow
                label="Included each month"
                description="Per seat. Past an allowance the service keeps working and each further minute or text comes off your credit."
                control={
                  <span className="text-sm font-semibold tabular-nums text-[#2E2D35]">
                    {describeStoredAllowance(current?.call_duration, 'minutes')} ·{' '}
                    {describeStoredAllowance(current?.sms, 'texts')}
                  </span>
                }
              />
              <SettingRow
                label="Per licence"
                description="What one seat costs for a full billing cycle."
                control={
                  <span className="text-sm font-semibold tabular-nums text-[#2E2D35]">
                    {moneyOrUnavailable(perSeat)}
                  </span>
                }
              />
              <SettingRow
                label="Licences on the bill"
                description="Seats you are charged for. Removed seats stop being charged from the next cycle."
                control={
                  <span className="text-sm font-semibold tabular-nums text-[#2E2D35]">
                    {knownNumber(licences?.payable_licenses) === null
                      ? UNAVAILABLE
                      : String(licences.payable_licenses)}
                  </span>
                }
              />
              <SettingRow
                label="Next bill"
                description={
                  expired
                    ? 'Nothing is scheduled while the plan is expired.'
                    : `You'll be charged on ${dateOrUnavailable(next?.next_billing_date ?? current?.plan_expiration_date)}.`
                }
                control={
                  <span className="text-base font-semibold tabular-nums text-[#2E2D35]">
                    {expired ? UNAVAILABLE : moneyOrUnavailable(next?.next_billing_amount)}
                  </span>
                }
              />
            </>
          )}
        </SettingCard>

        {/* Four figures somebody wants at a glance. Auto-fitting rather than a
            fixed four across, so they stay readable on a narrow window instead
            of squeezing into unreadable slivers. */}
        <div
          className="mb-3 grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          <Tile
            loading={planLoading}
            value={
              purchased === null || assigned === null ? UNAVAILABLE : `${assigned}/${purchased}`
            }
            label="Licences"
            hint={
              spare === null
                ? undefined
                : spare === 0
                  ? 'None spare'
                  : `${spare} unassigned`
            }
          />
          <Tile
            loading={planLoading}
            value={moneyOrUnavailable(current?.credits)}
            label="Credit balance"
            hint="Shared across the whole company."
          />
          <Tile
            loading={monthLoading}
            value={moneyOrUnavailable(monthTotals.amount)}
            label="This month's calling"
            hint="So far this month. An estimate until the month closes."
          />
          <Tile
            loading={planLoading}
            value={expired ? UNAVAILABLE : moneyOrUnavailable(next?.next_billing_amount)}
            label="Next payment"
            hint={
              expired
                ? 'Nothing scheduled.'
                : `Due ${dateOrUnavailable(next?.next_billing_date ?? current?.plan_expiration_date)}`
            }
          />
        </div>

        <SettingCard
          title="How it gets paid"
          description="The card charged when your plan renews or you buy a number."
          aside={
            <Link to={ABSOLUTE('purchase')}>
              <Button type="button" variant="outline">
                {primaryCard ? 'Replace card' : 'Add a card'}
              </Button>
            </Link>
          }
        >
          {cardsLoading ? (
            <SettingRow label="Card" description="" control={<Skeleton className="h-4 w-40 bg-[#F0DFC5]" />} />
          ) : primaryCard ? (
            <>
              <SettingRow
                label={`${String(primaryCard?.brand ?? 'Card').toUpperCase()} ending ${primaryCard?.last4 ?? '••••'}`}
                description={
                  cards.length > 1
                    ? `This is the one that gets charged. ${cards.length - 1} other ${cards.length === 2 ? 'card is' : 'cards are'} saved.`
                    : 'This is the one that gets charged.'
                }
                control={
                  <span className="text-sm tabular-nums text-[#2E2D35]">
                    {primaryCard?.exp_month && primaryCard?.exp_year
                      ? `Expires ${String(primaryCard.exp_month).padStart(2, '0')}/${primaryCard.exp_year}`
                      : UNAVAILABLE}
                  </span>
                }
              />
              <SettingRow
                label="Changing card"
                description="A replacement card is saved alongside this one and made primary — cards are never edited in place, so a mistyped number cannot leave you with no working card."
              />
            </>
          ) : (
            /* Said plainly rather than left blank: no card means a renewal will
               fail, and that is worth knowing before it happens rather than
               after the calls stop. */
            <SettingRow
              label="No card saved"
              description="Add one so your plan can renew and numbers can be bought without interruption."
            />
          )}
        </SettingCard>

        <SettingCard
          title="Where the charges came from"
          description="Your allowances against what has been used, and which people and destinations the charges went to."
          aside={
            <Link to={ABSOLUTE('usage')}>
              <Button type="button" variant="outline">
                Usage
              </Button>
            </Link>
          }
        >
          <SettingRow
            label="Looking for one particular charge?"
            description="Usage groups the charges by person and destination. The call history lists them one by one."
          />
          <SettingRow
            label="Call history"
            description="Every call with its length and what it cost."
            control={
              <Link to={CALL_HISTORY_PATH}>
                <Button type="button" variant="outline">
                  Open
                </Button>
              </Link>
            }
          />
        </SettingCard>

        <SettingCard
          title="What you have paid"
          description="Your five most recent charges."
          aside={
            <Link to={ABSOLUTE('invoices')}>
              <Button type="button" variant="outline">
                View all invoices
              </Button>
            </Link>
          }
        >
          {invoicesFailed ? (
            <SettingRow
              label="Your invoices could not be loaded"
              description="Reload the page. Nothing about your account has changed and no payment has been affected."
            />
          ) : invoicesLoading ? (
            <>
              {[0, 1, 2].map((i) => (
                <SettingRow
                  key={i}
                  label="Invoice"
                  description=""
                  control={<Skeleton className="h-4 w-16 bg-[#F0DFC5]" />}
                />
              ))}
            </>
          ) : invoices.length === 0 ? (
            <SettingRow
              label="No invoices yet"
              description="Charges appear here once your first payment goes through."
            />
          ) : (
            invoices.map((inv: any, i: number) => (
              <SettingRow
                key={inv?.uuid || inv?.bill_no || i}
                label={inv?.bill_no ? `Invoice ${inv.bill_no}` : 'Charge'}
                description={`${dateOrUnavailable(inv?.created_at)}${inv?.desc ? ` — ${inv.desc}` : ''}`}
                control={
                  <span className="text-sm font-semibold tabular-nums text-[#2E2D35]">
                    {moneyOrUnavailable(inv?.tax_detail?.total_amount ?? inv?.total_amount)}
                  </span>
                }
              />
            ))
          )}
        </SettingCard>
      </div>
    </AdminPage>
  );
};

export default BillingSummary;
