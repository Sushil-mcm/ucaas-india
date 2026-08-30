/* Where the money went — by person, by country, by direction.
 *
 * Billing could say what was taken and Reports could list every call, but
 * nothing joined the two. An admin whose bill went up by a third had no way at
 * all to find out what changed: the invoice gave one number, and the call log
 * gave four thousand rows with no totals on them.
 *
 * The headline figures come from the server's own totals for the whole period,
 * so they agree with the invoice by construction. The breakdown underneath is
 * built from the call rows, which are read in pages and capped — and when the
 * cap is hit the page says so plainly rather than presenting a partial ranking
 * as the whole picture.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import Loader from '@/components/custom/loader';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal } from '@/components/custom/date-dropdown/constant';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { callList } from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
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

/* Enough rows to cover a month of ordinary calling without making somebody wait
   on twenty-five round trips for a page they are only glancing at. */
const MAX_PAGES = 10;
const SHOWN = 8;

const money = (n: number): string => `$${(Number(n) || 0).toFixed(2)}`;

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
                {money(g.amount)}
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

const Spending = () => {
  const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialVal);
  const from = dropdownVal?.value?.from;
  const to = dropdownVal?.value?.to;

  /* One request settles the headline: page 1 carries `call_stats` for the whole
     period regardless of how few rows come with it. */
  const { data: head, isLoading: headLoading } = useQuery({
    queryKey: ['spend-totals', from, to],
    queryFn: () => callList({ page: 1, limit: 1, filter: [], filter_date: { from, to }, sort: {} }),
    enabled: Boolean(from && to),
    staleTime: 60 * 1000,
  });

  const totals = useMemo(() => readTotals((head as any)?.data?.data?.result?.call_stats), [head]);

  /* The rows behind it, walked in pages. Kept as a separate query so the
     headline appears immediately and the breakdown fills in after. */
  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['spend-rows', from, to],
    queryFn: () =>
      fetchAllPages(
        callList as any,
        { filter: [], filter_date: { from, to }, sort: {} },
        { maxPages: MAX_PAGES },
      ),
    enabled: Boolean(from && to),
    staleTime: 60 * 1000,
  });

  const byPerson = useMemo(() => onlyCharged(spendByPerson(rows as any)), [rows]);
  const byDestination = useMemo(() => onlyCharged(spendByDestination(rows as any)), [rows]);
  const byDirection = useMemo(() => spendByDirection(rows as any), [rows]);

  const complete = isBreakdownComplete((rows as any).length, totals);

  /* The breakdown's own total, not the period's. A percentage of the period
     total would never reach 100% when the rows are capped, and a column of
     shares that adds to 58% reads as an error rather than as a limit. */
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
    a.download = `spending-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loading = headLoading || rowsLoading;

  return (
    <AdminPage
      title="Spending"
      description="What your calling cost over a period, and which people and destinations it went to."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <DateDropdown dropdownVal={dropdownVal} setDropdownVal={setDropdownVal} />
          <Button type="button" variant="outline" onClick={exportCsv} disabled={loading}>
            Export CSV
          </Button>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            <SettingCard
              title="The period"
              description={`${from} to ${to}. These totals cover every call in the period and match your invoice.`}
              aside={
                <span className="text-lg font-semibold text-gray-900 tabular-nums">
                  {money(totals.amount)}
                </span>
              }
            >
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
            </SettingCard>

            {/* Said once, above all three breakdowns, rather than repeated on
                each. A ranking built from part of the period is still useful —
                but only to somebody who knows that is what they are reading. */}
            {!complete ? (
              <p className="mcm-setrow-note is-info mb-3">
                This period holds more calls than can be read in one go, so the breakdowns below
                cover the {(rows as any).length.toLocaleString()} most recent of{' '}
                {totals.calls.toLocaleString()} calls. The totals above are for the whole period and
                are unaffected. Choose a shorter period to break down all of it.
              </p>
            ) : null}

            <SettingCard
              title="Who spent it"
              description="People whose calls carried a charge, most expensive first. Calls that cost nothing are left out."
            >
              <SpendTable
                groups={topN(byPerson, SHOWN)}
                total={readTotal}
                unit="Person"
                empty="No charged calls in this period."
              />
            </SettingCard>

            <SettingCard
              title="Where it went"
              description="Charges grouped by the country dialled. Internal calls between your own people are separated out."
            >
              <SpendTable
                groups={topN(byDestination, SHOWN)}
                total={readTotal}
                unit="Destination"
                empty="No charged calls in this period."
              />
            </SettingCard>

            <SettingCard
              title="Out against in"
              description="How the calling splits between the two directions."
            >
              <SpendTable
                groups={byDirection}
                total={byDirection.reduce((s, g) => s + g.amount, 0)}
                unit="Direction"
                empty="No calls in this period."
              />
            </SettingCard>

            <SettingCard
              title="The calls themselves"
              description="Every call with its length and charge, searchable by person, number or date."
              aside={
                <Link to="/reports/call-history">
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
          </>
        )}
      </div>
    </AdminPage>
  );
};

export default Spending;
