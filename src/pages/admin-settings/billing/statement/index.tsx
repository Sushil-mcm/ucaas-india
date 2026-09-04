import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { getInvoice } from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { useGetMyPlanDetails } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { allowanceMeter } from '@/lib/allowance-meter';
import { knownNumber, moneyOrUnavailable } from '@/lib/billing-money';
import { UNLIMITED_STORED_THRESHOLD } from '@/lib/plan-catalogue';
import '@/components/mcm/mcm-page.css';

/**
 * Billing ▸ Statement of account.
 *
 * Everything charged and everything consumed, from the start of the current
 * plan period to today, in one place. The other billing screens each answer a
 * fragment — Plan says what you bought, Invoices lists what you paid — and
 * neither says how much of the plan has actually been used, or what is still
 * outstanding.
 *
 * Every figure here comes from data the platform already returns:
 * `current-plan-detail` carries the allowances and what has been consumed of
 * them, `billing/list` carries the transactions. Nothing is estimated.
 */

type Txn = {
  bill_no?: string;
  created_at?: string;
  desc?: string;
  mode?: string;
  status?: string;
  tax_detail?: { total_amount?: number | string };
};

/** Money is only "taken" once a transaction completes. */
const isSettled = (status?: string) => String(status || '').toLowerCase() === 'completed';
const isInFlight = (status?: string) =>
  ['processing', 'pending'].includes(String(status || '').toLowerCase());
const isFailed = (status?: string) => String(status || '').toLowerCase() === 'failed';

/* One allowance with its bar.
 *
 * Everything it prints is decided by `allowance-meter`, so this screen cannot
 * disagree with the Plan or Usage screens about the same allowance. Before that
 * it converted its inputs to numbers first, which meant an unlimited plan —
 * stored as a very large number, because the column holds whole numbers — read
 * as "12,345 / 999,999,999 min" with the bar at nought per cent. */
const Meter = ({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: unknown;
  total: unknown;
  unit: string;
}) => {
  const meter = allowanceMeter(total, used, unit);
  const pct = meter.percent;

  return (
    <div className="mcm-soa-meter">
      <div className="mcm-soa-meter-h">
        <span className="mcm-soa-meter-l">{label}</span>
        <span className={`mcm-soa-meter-v${meter.over ? ' over' : ''}`}>
          {meter.kind === 'metered' ? `${meter.usedText} of ${meter.includedText}` : meter.usedText}
        </span>
      </div>
      {pct === null ? (
        <p className="mcm-soa-note">
          {meter.kind === 'unlimited'
            ? `Unlimited ${unit} on this plan — there is nothing to count down.`
            : meter.kind === 'none'
              ? 'Not bundled on this plan — charged as used.'
              : 'Not available yet — this figure did not come back with your plan.'}
        </p>
      ) : (
        <>
          <div className="mcm-soa-bar">
            <span
              className={`mcm-soa-bar-fill${pct >= 90 ? ' hot' : pct >= 75 ? ' warm' : ''}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mcm-soa-note">
            {pct}% used{meter.over ? ' — over the included allowance' : ''}
          </p>
        </>
      )}
    </div>
  );
};

const StatementOfAccount = () => {
  const { user } = useUser();
  const {
    data: planData = {},
    isPending: isPlanPending,
    isError: isPlanError,
  } = useGetMyPlanDetails(undefined, true);

  /* Walks every page: the list endpoints cap `limit` at 200 and reject a larger
     request rather than truncating it. A statement that quietly omitted older
     transactions would understate what has been charged. */
  const {
    data: transactions = [],
    isPending: isTxnPending,
    isError: isTxnError,
  } = useQuery({
    queryKey: ['billingList', 'statement'],
    queryFn: () => fetchAllPages(getInvoice),
  });

  const plan = (planData as any)?.current_plan_details || {};
  const lastBilling = (planData as any)?.last_billing || {};

  const planPrice = plan?.discount_enabled ? plan?.discount_price : plan?.original_price;
  const walletBalance = (user as any)?.company_info?.amount;

  /* Charged-to-date sums only what completed. Anything still processing is
     reported separately rather than folded in — it has not been taken yet and
     may still fail. */
  const totals = useMemo(() => {
    let settled = 0;
    let inFlight = 0;
    let failed = 0;
    let settledCount = 0;

    (transactions as Txn[]).forEach((txn) => {
      const amount = Number(txn?.tax_detail?.total_amount ?? 0);
      if (!Number.isFinite(amount)) return;
      if (isSettled(txn?.status)) {
        settled += amount;
        settledCount += 1;
      } else if (isInFlight(txn?.status)) {
        inFlight += amount;
      } else if (isFailed(txn?.status)) {
        failed += amount;
      }
    });

    return { settled, inFlight, failed, settledCount };
  }, [transactions]);

  /* A seat cap of nought means no cap on this platform, not "no seats". Said
     out loud here so the meter shows unlimited rather than an allowance of
     nothing, which would read as a company entitled to no licences at all. */
  const seatCap = knownNumber(plan?.licenses_limit);
  const seatAllowance = seatCap === 0 ? UNLIMITED_STORED_THRESHOLD : seatCap;

  const periodEnd = plan?.plan_expiration_date ? moment(plan.plan_expiration_date) : null;
  const daysLeft = periodEnd ? periodEnd.diff(moment(), 'days') : null;

  const recent = useMemo(
    () =>
      [...(transactions as Txn[])]
        .sort((a, b) => moment(b?.created_at).valueOf() - moment(a?.created_at).valueOf())
        .slice(0, 12),
    [transactions],
  );

  if (isPlanPending || isTxnPending) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <Loader variant="blue" size="lg" />
      </div>
    );
  }

  /* A statement that could not be loaded must say so. Rendering the page
     anyway would fill every figure with a zero and tell somebody they had been
     charged nothing and had no allowances — both untrue, and both the sort of
     thing that gets planned around. */
  if (isPlanError || isTxnError) {
    return (
      <AdminPage
      hideHead
        section="Billing"
        title="Statement of account"
        description="Everything charged and consumed on this account so far."
      >
        <div className="mcm-soa">
          <section className="mcm-soa-card">
            <div className="mcm-soa-card-h">
              <div>
                <h2>Your statement could not be loaded</h2>
                <p>
                  Nothing is wrong with your account and no payment has been affected. Reload the
                  page — if it keeps happening, the Invoices screen lists the same charges.
                </p>
              </div>
            </div>
          </section>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      section="Billing"
      title="Statement of account"
      description={
        periodEnd
          ? `Everything charged and consumed so far in this plan period, which ends ${periodEnd.format('D MMM YYYY')}.`
          : 'Everything charged and consumed on this account so far.'
      }
    >
      <div className="mcm-soa">
        <div className="mcm-soa-figures">
          <div className="mcm-soa-fig">
            <span className="mcm-soa-fig-l">Charged to date</span>
            <span className="mcm-soa-fig-v">{moneyOrUnavailable(totals.settled)}</span>
            <span className="mcm-soa-fig-s">
              {totals.settledCount} completed payment{totals.settledCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className={`mcm-soa-fig${totals.inFlight > 0 ? ' warn' : ''}`}>
            <span className="mcm-soa-fig-l">Pending</span>
            <span className="mcm-soa-fig-v">{moneyOrUnavailable(totals.inFlight)}</span>
            <span className="mcm-soa-fig-s">Still processing</span>
          </div>
          <div className={`mcm-soa-fig${totals.failed > 0 ? ' bad' : ''}`}>
            <span className="mcm-soa-fig-l">Failed</span>
            <span className="mcm-soa-fig-v">{moneyOrUnavailable(totals.failed)}</span>
            <span className="mcm-soa-fig-s">Needs another attempt</span>
          </div>
          <div className="mcm-soa-fig">
            <span className="mcm-soa-fig-l">Wallet balance</span>
            <span className="mcm-soa-fig-v">{moneyOrUnavailable(walletBalance)}</span>
            <span className="mcm-soa-fig-s">Available credit</span>
          </div>
        </div>

        <section className="mcm-soa-card">
          <div className="mcm-soa-card-h">
            <div>
              <h2>{plan?.plan_name || 'Current plan'}</h2>
              <p>
                {moneyOrUnavailable(planPrice)} per {plan?.plan_duration || 'month'}
                {plan?.discount_enabled ? ' · discounted' : ''}
                {plan?.is_trial === 'Y' ? ' · trial' : ''}
              </p>
            </div>
            {periodEnd ? (
              <div className="mcm-soa-period">
                <span className="mcm-soa-fig-l">Period ends</span>
                <span className="mcm-soa-period-v">{periodEnd.format('D MMM YYYY')}</span>
                {daysLeft !== null ? (
                  <span className="mcm-soa-fig-s">
                    {daysLeft >= 0 ? `${daysLeft} days remaining` : 'Expired'}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mcm-soa-meters">
            <Meter
              label="Call minutes"
              used={plan?.call_duration_used}
              total={plan?.call_duration}
              unit="min"
            />
            <Meter label="SMS" used={plan?.sms_used} total={plan?.sms} unit="messages" />
            <Meter label="Licences" used={lastBilling?.total_license} total={seatAllowance} unit="seats" />
          </div>
        </section>

        <section className="mcm-soa-card">
          <div className="mcm-soa-card-h">
            <div>
              <h2>Transactions</h2>
              <p>Most recent first — every charge raised against this account.</p>
            </div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.length ? (
                  recent.map((txn, index) => (
                    <tr key={`${txn?.bill_no}-${index}`}>
                      <td>{txn?.created_at ? moment(txn.created_at).format('D MMM YYYY') : '—'}</td>
                      <td className="num">{txn?.bill_no || '—'}</td>
                      <td>{txn?.desc || '—'}</td>
                      <td>{txn?.mode || '—'}</td>
                      <td>
                        <span
                          className={
                            isSettled(txn?.status)
                              ? 'tag pos'
                              : isFailed(txn?.status)
                                ? 'tag neg'
                                : 'tag warn'
                          }
                        >
                          {txn?.status || '—'}
                        </span>
                      </td>
                      <td className="num">{moneyOrUnavailable(txn?.tax_detail?.total_amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <p className="mcm-soa-note">No charges on this account yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminPage>
  );
};

export default StatementOfAccount;
