import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportsPageLayout } from '../reports-content-layout';
import { Input } from '@/components/ui/input';
import { browserTimeZone } from '@/hooks/use-agent-day';
import { useCoverage } from '@/hooks/use-workforce';
import { coverageScale, coverageSummary, dayLabel, todayIn, type CoverageBucket } from '@/lib/workforce';

/* Reports › Coverage: for one day, how many people are scheduled on queue in
   each half hour against how many the campaign call history says are needed
   (the average of the last four same weekdays × handle time ÷ 30 min ÷ the
   occupancy target). A short bucket is red; the numbers are the forecast's
   inputs so a supervisor can see why. */

const Coverage = () => {
  const timeZone = browserTimeZone();
  const [date, setDate] = useState(todayIn(timeZone));
  const [handle, setHandle] = useState('');
  const [occupancy, setOccupancy] = useState('85');
  const params = useMemo(
    () => ({
      date,
      timezone: timeZone,
      ...(Number(handle) >= 30 ? { handle_seconds: Math.round(Number(handle)) } : {}),
      ...(Number(occupancy) >= 50 && Number(occupancy) <= 100 ? { occupancy: Number(occupancy) / 100 } : {}),
    }),
    [date, timeZone, handle, occupancy],
  );
  const query = useCoverage(params);
  const data = query.data || {};
  const buckets: CoverageBucket[] = data.buckets || [];
  const scale = coverageScale(buckets);
  const summary = coverageSummary(buckets);

  const filters = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Input type="date" className="h-9 w-40" value={date} onChange={(e) => setDate(e.target.value)} />
      <label className="flex items-center gap-1">
        Handle time (s) <Input type="number" className="h-9 w-24" placeholder={String(data.handle_seconds || 300)} value={handle} onChange={(e) => setHandle(e.target.value)} />
      </label>
      <label className="flex items-center gap-1">
        Occupancy % <Input type="number" className="h-9 w-20" value={occupancy} min={50} max={100} onChange={(e) => setOccupancy(e.target.value)} />
      </label>
      <span className="text-gray-600">{timeZone}</span>
    </div>
  );

  return (
    <ReportsPageLayout filters={filters}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Scheduled people', String(data.scheduled_people ?? 0), `with a published day on ${dayLabel(date)}`],
            ['Peak need', String(summary.peakNeed), `people at the busiest half hour`],
            ['Short half-hours', String(summary.short), 'need above scheduled'],
            ['History used', `${data.weeks_used ?? 0} of 4`, 'same weekdays with campaign calls'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-lg border bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-gray-500">{hint}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">{data.note || 'Need = average calls of the last four same weekdays × handle time ÷ 30 min ÷ occupancy target.'}</p>
        {query.isError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{(query.error as any)?.message || 'Could not load.'}</div>}
        <div className="rounded-lg border bg-white p-4">
          {query.isPending ? (
            <div className="text-sm text-gray-500">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex h-56 min-w-[960px] items-end gap-[3px]">
                {buckets.map((b) => (
                  <div key={b.start} className="group relative flex h-full flex-1 flex-col justify-end" title={`${b.start}: ${b.scheduled} scheduled, ${b.need} needed (${b.calls} calls avg)`}>
                    <div className="absolute inset-x-0 border-t-2 border-dashed border-gray-500" style={{ bottom: `${(b.need / scale) * 100}%` }} />
                    <div className={`w-full rounded-t ${b.gap < 0 ? 'bg-rose-400' : b.need > 0 ? 'bg-emerald-400' : 'bg-blue-200'}`} style={{ height: `${(b.scheduled / scale) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex min-w-[960px] gap-[3px] text-[10px] text-gray-500">
                {buckets.map((b, i) => (
                  <div key={b.start} className="flex-1 text-center">
                    {i % 4 === 0 ? b.start : ''}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-600">Bars: people scheduled on queue. Dashed line: people needed. Red: short. Green: covered. Blue: scheduled with no calls expected.</p>
            </div>
          )}
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default Coverage;
