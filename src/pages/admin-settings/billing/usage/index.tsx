/* Usage — what the plan includes, what has been used, and where the money went.
 *
 * This page replaces the old Spending screen and absorbs everything it did.
 * They were always two halves of one question. Spending could tell you that
 * $400 went on calls to Germany; it could not tell you whether the first 400
 * minutes were included and only the rest was charged. The plan screen knew the
 * allowances but nothing about where the calls went. Somebody trying to work
 * out why a bill went up had to hold both pages in their head.
 *
 * The honest limits, stated here because they shape the whole screen:
 *
 * **The allowance table is cycle-to-date and ignores the date picker.** Those
 * used-counts are running totals held against the company, not something that
 * can be re-counted for an arbitrary fortnight. Letting the picker appear to
 * filter them would be a lie told by a working control, which is worse than no
 * control at all — so it is said in plain words above the table.
 *
 * **Most of the per-service columns have no source.** The platform meters voice
 * minutes and messages against a plan allowance. It does not, today, publish a
 * per-service overage rate or a per-service charge to a customer's own admin.
 * Those cells say "Not available yet" rather than showing $0.00, because a zero
 * on a billing screen reads as "you owe nothing for this" and gets planned
 * around. The one thing we will not do here is invent a number.
 *
 * What IS solid is the period total and the breakdown underneath it: those come
 * from the server's own figures for every call in the period, so they agree
 * with the invoice by construction.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal } from '@/components/custom/date-dropdown/constant';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { callList } from '@/services/api';
import { useGetMyPlanDetails } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { ratesForPlan, storedAllowanceIsUnlimited } from '@/lib/plan-catalogue';
import {
  isBreakdownComplete,
  onlyCharged,
  readDuration,
  readTotals,
  shareOf,
  spendByDestination,
  spendByDirection,
  spendByPerson,
  topN,
  type SpendGroup,
} from '@/lib/spend-breakdown';
import { UNAVAILABLE, knownNumber, moneyOrUnavailable } from '@/lib/billing-money';
import {
  hasAnyUsage,
  isFullyIncluded,
  makeUsageRow,
  percentUsed,
  sortUsageRows,
  usageBand,
  type UsageRow,
} from '@/lib/billing-usage';
import { CALL_HISTORY_PATH, DESTINATIONS_PATH } from '../billing-sections';

/* Enough rows to cover a month of ordinary calling without making somebody wait
   on twenty-five round trips for a page they are only glancing at. */
const MAX_PAGES = 10;
const SHOWN = 8;

/* A quantity with its unit, or the admission that nobody counted it. Kept
   separate from the money formatter because "0 minutes" and "$0.00" are
   different kinds of claim, and both must be avoidable. */
const units = (value: number | null, unit: string): string => {
  if (value === null) return UNAVAILABLE;
  /* An unlimited allowance is stored as a very large number because the column
     holds whole numbers. Printing it would show "999,999,999 minutes", which
     tells a customer we do not know what we are doing. */
  if (storedAllowanceIsUnlimited(value)) return `Unlimited ${unit}`;
  return `${value.toLocaleString()} ${unit}`;
};

/* The thin bar on each row. Absent entirely when there is nothing to measure -
   an empty grey track would suggest an allowance sitting at zero. */
const UsageBar = ({ row }: { row: UsageRow }) => {
  const pct = percentUsed(row.included, row.used);
  const band = usageBand(row.included, row.used);
  if (pct === null || band === null) return null;
  const colour =
    band === 'over' ? 'bg-red-500' : band === 'warning' ? 'bg-amber-500' : 'bg-gray-400';
  return (
    <div className="mt-1.5 h-1 w-full max-w-[8rem] overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${colour}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
};

const AllowanceTable = ({ rows }: { rows: UsageRow[] }) => (
  <div className="scroller overflow-x-auto py-2">
    <table className="w-full min-w-[38rem] border-collapse text-sm">
      <thead>
        <tr>
          {['Service', 'Included', 'Used', 'Over', 'Rate', 'Cost'].map((h, i) => (
            <th
              key={h}
              className={`border-b border-gray-200 pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 ${
                i === 0 ? 'text-left' : 'text-right'
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          /* A row entirely inside its allowance is greyed down so the eye lands
             on the line that is actually costing money. A row we know nothing
             about keeps its normal weight — dimming it would imply it had been
             checked and settled. */
          const dim = isFullyIncluded(row);
          return (
            <tr key={row.service} className={dim ? 'text-gray-500' : ''}>
              <td className="border-b border-gray-100 py-2.5 pr-4 align-top">
                <span className={dim ? 'font-medium' : 'font-medium text-gray-900'}>
                  {row.service}
                </span>
                <UsageBar row={row} />
                {row.note ? <p className="mt-1 text-[11px] text-gray-500">{row.note}</p> : null}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right align-top tabular-nums">
                {units(row.included, row.unit)}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right align-top tabular-nums">
                {units(row.used, row.unit)}
              </td>
              <td
                className={`border-b border-gray-100 py-2.5 pr-4 text-right align-top tabular-nums ${
                  row.over !== null && row.over > 0 ? 'font-semibold text-gray-900' : ''
                }`}
              >
                {units(row.over, row.unit)}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right align-top tabular-nums">
                {row.rate === null ? UNAVAILABLE : moneyOrUnavailable(row.rate)}
              </td>
              <td className="border-b border-gray-100 py-2.5 text-right align-top tabular-nums">
                {row.cost === null ? UNAVAILABLE : moneyOrUnavailable(row.cost)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const SpendTable = ({
  groups,
  total,
  unit,
  empty,
}: {
  groups: SpendGroup[];
  total: number;
  unit: string;
  empty: string;
}) => {
  if (groups.length === 0) {
    return <p className="py-3 text-xs text-gray-600">{empty}</p>;
  }

  return (
    <div className="scroller overflow-x-auto py-2">
      <table className="w-full min-w-[24rem] border-collapse text-sm">
        <thead>
          <tr>
            {[unit, 'Spent', 'Calls', 'Talk time', 'Share'].map((h, i) => (
              <th
                key={h}
                className={`border-b border-gray-200 pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <td className="border-b border-gray-100 py-2.5 pr-4 font-medium text-gray-900">
                {g.label}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums font-medium text-gray-900">
                {moneyOrUnavailable(g.amount)}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums text-gray-700">
                {g.calls.toLocaleString()}
              </td>
              <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums text-gray-700">
                {readDuration(g.seconds)}
              </td>
              <td className="border-b border-gray-100 py-2.5 text-right tabular-nums text-gray-500">
                {shareOf(g.amount, total)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* Skeleton rows rather than one spinner over the whole page. The shape of the
   answer is already known, so showing it settles the layout and stops the page
   jumping when the numbers land. */
const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="py-2">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 border-b border-gray-100 py-3">
        {Array.from({ length: cols }).map((__, c) => (
          <Skeleton key={c} className={`h-3 bg-gray-200 ${c === 0 ? 'w-40' : 'ml-auto w-16'}`} />
        ))}
      </div>
    ))}
  </div>
);

const Usage = () => {
  const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialVal);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const from = dropdownVal?.value?.from;
  const to = dropdownVal?.value?.to;

  const { user } = useUser() as any;
  const company = user?.company_info ?? {};

  const {
    data: planDetail,
    isLoading: planLoading,
    isError: planError,
  } = useGetMyPlanDetails(undefined, true) as any;

  const current = planDetail?.current_plan_details ?? {};

  /* One request settles the headline: page 1 carries `call_stats` for the whole
     period regardless of how few rows come with it. */
  const {
    data: head,
    isLoading: headLoading,
    isError: headError,
  } = useQuery({
    queryKey: ['usage-totals', from, to],
    queryFn: () => callList({ page: 1, limit: 1, filter: [], filter_date: { from, to }, sort: {} }),
    enabled: Boolean(from && to),
    staleTime: 60 * 1000,
  });

  const totals = useMemo(() => readTotals((head as any)?.data?.data?.result?.call_stats), [head]);

  /* The rows behind it, walked in pages. Kept as a separate query so the
     headline appears immediately and the breakdown fills in after. */
  const {
    data: rows = [],
    isLoading: rowsLoading,
    isError: rowsError,
  } = useQuery({
    queryKey: ['usage-rows', from, to],
    queryFn: () =>
      fetchAllPages(
        callList as any,
        { filter: [], filter_date: { from, to }, sort: {} },
        { maxPages: MAX_PAGES },
      ),
    enabled: Boolean(from && to),
    staleTime: 60 * 1000,
  });

  /* The allowance table.
   *
   * Every row below is built from the only figures the platform actually
   * publishes to a company's own admin. Where a counter does not exist the row
   * still appears — a customer paying for AI minutes deserves to know the
   * allowance exists even while nobody is counting against it — but its cells
   * say so instead of guessing. */
  /* The rate that applies to THIS customer, from the plan they are actually on.
     An unrecognised plan - legacy, custom-priced, renamed - gets no rate rather
     than a default one. A confident money figure that is wrong for this
     customer is worse than an absent one: the absent one prompts a question,
     the wrong one prompts an invoice dispute. */
  const planRates = useMemo(() => ratesForPlan(current?.plan_name), [current?.plan_name]);

  const allowanceRows = useMemo(() => {
    const built: UsageRow[] = [
      makeUsageRow({
        service: 'Voice minutes',
        unit: 'minutes',
        included: current?.call_duration,
        used: current?.call_duration_used,
        rate: planRates?.domesticMinuteRate,
        note: 'Calls to destinations your plan covers. Anything beyond the allowance is charged per minute at the rate for the country dialled.',
      }),
      makeUsageRow({
        service: 'Text messages',
        unit: 'messages',
        included: current?.sms,
        used: current?.sms_used,
        rate: planRates?.smsRate,
      }),
      makeUsageRow({
        service: 'Toll-free minutes',
        unit: 'minutes',
        note: 'Your plan carries a separate toll-free allowance, but it is not reported back to this screen yet.',
      }),
      makeUsageRow({
        service: 'AI voice minutes',
        unit: 'minutes',
        included: knownNumber(company?.ai_call_free_minutes),
        note: 'The allowance is on your plan. Minutes used are not counted back to this screen yet.',
      }),
      makeUsageRow({
        service: 'AI agent replies',
        unit: 'replies',
        included: knownNumber(company?.ai_message_free_reply),
        note: 'The allowance is on your plan. Replies used are not counted back to this screen yet.',
      }),
      makeUsageRow({
        service: 'Picture messages',
        unit: 'messages',
        note: 'Not metered on this screen yet.',
      }),
      makeUsageRow({
        service: 'Call transcription',
        unit: 'minutes',
        note: 'Not metered on this screen yet.',
      }),
    ];
    return sortUsageRows(built);
  }, [current, company, planRates]);

  const byPerson = useMemo(() => onlyCharged(spendByPerson(rows as any)), [rows]);
  const byDestination = useMemo(() => onlyCharged(spendByDestination(rows as any)), [rows]);
  const byDirection = useMemo(() => spendByDirection(rows as any), [rows]);

  const complete = isBreakdownComplete((rows as any).length, totals);
  const readTotal = useMemo(() => byPerson.reduce((sum, g) => sum + g.amount, 0), [byPerson]);

  const exportCsv = () => {
    const lines = [['Group', 'Type', 'Spent', 'Calls', 'Talk time (seconds)'].join(',')];
    const push = (type: string, groups: SpendGroup[]) =>
      groups.forEach((g) =>
        lines.push(
          [
            `"${g.label.replace(/"/g, '""')}"`,
            type,
            g.amount.toFixed(2),
            g.calls,
            Math.round(g.seconds),
          ].join(','),
        ),
      );
    push('Person', byPerson);
    push('Destination', byDestination);
    push('Direction', byDirection);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const spendLoading = headLoading || rowsLoading;
  const spendFailed = headError || rowsError;

  return (
    <AdminPage
      section="Billing"
      title="Usage"
      description="What your plan includes against what has been used, and where the charges went."
      actions={
        <Button type="button" variant="outline" onClick={exportCsv} disabled={spendLoading}>
          Export CSV
        </Button>
      }
      filters={<DateDropdown dropdownVal={dropdownVal} setDropdownVal={setDropdownVal} />}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {/* The period's one big number, split the way a customer thinks about it:
            the part the plan already covers, and the part being charged for. */}
        <SettingCard
          title="This period"
          description={
            from && to
              ? `${from} to ${to}. These totals cover every call in the period and match your invoice.`
              : 'Choose a period above.'
          }
          aside={
            spendLoading ? (
              <Skeleton className="h-6 w-24 bg-gray-200" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {moneyOrUnavailable(totals.amount)}
              </span>
            )
          }
          note="Charged calls only. Calls covered by your plan's allowance appear in the counts below but add nothing to this figure."
        >
          {spendFailed ? (
            <SettingRow
              label="This period could not be loaded"
              description="The call records did not come back. Reload the page, and if it keeps happening choose a shorter period — very long periods time out."
            />
          ) : spendLoading ? (
            <TableSkeleton rows={3} cols={2} />
          ) : (
            <>
              <SettingRow
                label="Charged"
                description="What these calls added to your bill."
                control={
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {moneyOrUnavailable(totals.amount)}
                  </span>
                }
              />
              <SettingRow
                label="Calls"
                description="Everything placed or received, whether it was charged or included."
                control={
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {totals.calls.toLocaleString()}
                  </span>
                }
              />
              <SettingRow
                label="Talk time"
                description="Connected time only. Ringing and unanswered calls are not counted."
                control={
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {readDuration(totals.seconds)}
                  </span>
                }
              />
              <SettingRow
                label="Out and in"
                description="Outbound calls are usually where the charges are. Inbound is here for comparison."
                control={
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {totals.outboundCalls.toLocaleString()} out ·{' '}
                    {totals.inboundCalls.toLocaleString()} in
                  </span>
                }
              />
            </>
          )}
        </SettingCard>

        <SettingCard
          title="What your plan includes"
          description="Allowances for the current billing cycle, against what has been used so far."
          note="These counters run for the whole billing cycle and are not affected by the period chosen above. Several services are not metered back to this screen yet — those say so rather than showing a zero."
          aside={
            <Link to={DESTINATIONS_PATH}>
              <Button type="button" variant="outline">
                Full rate list
              </Button>
            </Link>
          }
        >
          {planError ? (
            <SettingRow
              label="Your plan's allowances could not be loaded"
              description="Nothing is wrong with your account — this screen could not read the plan. Reload the page, and if it persists the Plan screen shows the same allowances."
            />
          ) : planLoading ? (
            <TableSkeleton />
          ) : !hasAnyUsage(allowanceRows) ? (
            <SettingRow
              label="No allowances on this plan"
              description="Your plan charges per minute and per message rather than including a bundle, so there is nothing to count down. The full rate list shows what each destination costs."
            />
          ) : (
            <AllowanceTable rows={allowanceRows} />
          )}
        </SettingCard>

        {/* Said once, above all three breakdowns, rather than repeated on each.
            A ranking built from part of the period is still useful — but only to
            somebody who knows that is what they are reading. */}
        {!spendLoading && !spendFailed && !complete ? (
          <p className="mcm-setrow-note is-info mb-3">
            This period holds more calls than can be read in one go, so the breakdowns below cover
            the {(rows as any).length.toLocaleString()} most recent of{' '}
            {totals.calls.toLocaleString()} calls. The totals above are for the whole period and are
            unaffected. Choose a shorter period to break down all of it.
          </p>
        ) : null}

        <SettingCard
          title="Where the charges went"
          description="The same period, split three ways. Credit is pooled across the company, but every charge belongs to somebody — this is who."
          aside={
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBreakdown((v) => !v)}
              aria-expanded={showBreakdown}
            >
              {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
            </Button>
          }
        >
          {!showBreakdown ? (
            <SettingRow
              label="Breakdown hidden"
              description="Show it to see spending by person, by destination and by direction."
            />
          ) : spendFailed ? (
            <SettingRow
              label="The breakdown could not be loaded"
              description="The call records did not come back, so there is nothing to group. Reload, or choose a shorter period."
            />
          ) : spendLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <>
              <p className="mcm-setrow-label mt-1">Who spent it</p>
              <SpendTable
                groups={topN(byPerson, SHOWN)}
                total={readTotal}
                unit="Person"
                empty="No charged calls in this period."
              />
              <p className="mcm-setrow-label mt-4">Where it went</p>
              <SpendTable
                groups={topN(byDestination, SHOWN)}
                total={readTotal}
                unit="Destination"
                empty="No charged calls in this period."
              />
              <p className="mcm-setrow-label mt-4">Out against in</p>
              <SpendTable
                groups={byDirection}
                total={byDirection.reduce((s, g) => s + g.amount, 0)}
                unit="Direction"
                empty="No calls in this period."
              />
            </>
          )}
        </SettingCard>

        <SettingCard
          title="The calls themselves"
          description="Every call with its length and charge, searchable by person, number or date."
          aside={
            <Link to={CALL_HISTORY_PATH}>
              <Button type="button" variant="outline">
                Call history
              </Button>
            </Link>
          }
        >
          <SettingRow
            label="Looking for one particular charge?"
            description="This page groups the charges. The call history lists them one by one, which is where to go when a single figure needs explaining."
          />
        </SettingCard>
      </div>
    </AdminPage>
  );
};

export default Usage;
