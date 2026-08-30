/* Every destination you can call, with its dialling code and price.
 *
 * The rates screen next to this one answers one question at a time: pick a
 * country, see its rates. That is right for checking a single number before
 * dialling it, and no use for "which destinations cost the most" or "send our
 * price list to finance".
 *
 * The list of destinations is instant, because the countries and their dialling
 * codes already ship with the app. Prices are not: the endpoint that has them
 * takes one country per request, so a full price list is 250 round trips. They
 * are fetched in small batches, and every row says which of the four things it
 * is - priced, not sold here, still loading, or not asked for yet - because a
 * blank price reads as free.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { callingRatesList } from '@/services/api';
import countryList from '@/lib/countries.json';
import {
  buildDestinations,
  markFailed,
  markLoading,
  matchesSearch,
  nextToPrice,
  priceProgress,
  readRateAnswer,
  toCsv,
  type Destination,
} from '@/lib/destination-rates';

/* Small enough that the table fills visibly and the service is not hammered.
   250 at once would be refused by the browser and finish in an order nobody
   can predict. */
const BATCH = 8;

const price = (value?: number): string =>
  value === undefined ? '—' : `$${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;

const STATE_TEXT: Record<Destination['state'], string> = {
  unknown: 'Not loaded',
  loading: 'Loading…',
  priced: '',
  unpriced: 'Not sold',
  failed: 'Failed',
};

const Destinations = () => {
  const [rows, setRows] = useState<Destination[]>(() => buildDestinations(countryList as any));
  const [search, setSearch] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);
  /* Read inside the loop so pressing Stop takes effect on the next batch rather
     than only after every remaining country has been fetched. */
  const stopped = useRef(false);

  const shown = useMemo(() => rows.filter((r) => matchesSearch(r, search)), [rows, search]);
  const progress = useMemo(() => priceProgress(rows), [rows]);

  const fetchOne = useCallback(async (destination: Destination) => {
    setRows((all) => all.map((r) => (r.iso === destination.iso ? markLoading(r) : r)));
    try {
      const answer = await callingRatesList({
        filter: { key: 'COUNTRY', value: destination.name },
      });
      setRows((all) => all.map((r) => (r.iso === destination.iso ? readRateAnswer(r, answer) : r)));
    } catch {
      setRows((all) => all.map((r) => (r.iso === destination.iso ? markFailed(r) : r)));
    }
  }, []);

  /* Walks the whole list in batches. The queue is recomputed from current state
     each round rather than captured up front, so a row somebody loaded by hand
     in the meantime is not fetched twice. */
  const loadAll = useCallback(async () => {
    stopped.current = false;
    setLoadingAll(true);
    try {
      for (;;) {
        if (stopped.current) break;
        let batch: Destination[] = [];
        setRows((all) => {
          batch = nextToPrice(all, BATCH);
          return all;
        });
        await new Promise((r) => setTimeout(r, 0));
        if (batch.length === 0) break;
        await Promise.all(batch.map(fetchOne));
      }
    } finally {
      setLoadingAll(false);
    }
  }, [fetchOne]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'destinations-and-rates.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminPage
      title="Destinations and rates"
      description="Everywhere you can call, with its dialling code and what a call there costs."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <SettingCard
          title="The price list"
          description={
            progress.complete
              ? `All ${progress.total} destinations have been priced.`
              : `${progress.total} destinations. ${progress.known} priced so far — prices are fetched one country at a time, so the rest load as you go.`
          }
          aside={
            <div className="flex flex-wrap items-center gap-2">
              {loadingAll ? (
                <Button type="button" variant="outline" onClick={() => (stopped.current = true)}>
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadAll()}
                  disabled={progress.complete}
                >
                  {progress.missing > 0
                    ? `Load ${progress.missing} remaining prices`
                    : 'All loaded'}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
          }
        >
          <SettingRow
            label="Find a destination"
            description="By country, by dialling code, or by pasting a number you are about to call."
            control={
              <div className="w-full sm:w-72">
                <Input
                  placeholder="United Kingdom, 44, or +44 20 7183 8750"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            }
          />

          {/* Wide content scrolls inside its own box - the page itself must never
              move sideways. */}
          <div className="scroller overflow-x-auto py-2">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr>
                  {['Destination', 'Code', 'Outbound', 'Inbound', 'SMS', ''].map((h, i) => (
                    <th
                      key={h || i}
                      className={`border-b border-gray-200 pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 ${
                        i === 0 || i === 1 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.iso}>
                    <td className="border-b border-gray-100 py-2.5 pr-4 font-medium text-gray-900">
                      <span className="mr-2">{d.flag}</span>
                      {d.name}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-700">
                      {d.dialCode}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums text-gray-900">
                      {d.state === 'priced' ? price(d.outbound) : '—'}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums text-gray-700">
                      {d.state === 'priced' ? price(d.inbound) : '—'}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 text-right tabular-nums text-gray-700">
                      {d.state === 'priced' ? price(d.sms) : '—'}
                    </td>
                    {/* A dash on its own would read as "free". The state column is
                        what stops a blank price being mistaken for a zero one. */}
                    <td className="border-b border-gray-100 py-2.5 text-right text-xs">
                      {d.state === 'priced' ? null : d.state === 'unknown' ? (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => void fetchOne(d)}
                        >
                          Load price
                        </button>
                      ) : (
                        <span
                          className={
                            d.state === 'failed'
                              ? 'text-red-700'
                              : d.state === 'unpriced'
                                ? 'text-gray-500'
                                : 'text-gray-400'
                          }
                          title={d.note}
                        >
                          {STATE_TEXT[d.state]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-xs text-gray-600">
                      Nothing matches “{search}”.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!progress.complete ? (
            <p className="mcm-setrow-note is-info mt-2">
              A price only appears once it has been fetched. “Not sold” means no price is published
              for that destination — it is not the same as a price of nothing.
            </p>
          ) : null}
        </SettingCard>
      </div>
    </AdminPage>
  );
};

export default Destinations;
