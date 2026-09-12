import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Loader from '@/components/custom/loader';
import { useQueueSeries } from '@/hooks/use-queue-series';
import {
  bucketLabel,
  describeTargets,
  type QueueSeries,
  type SeriesBucket,
  type SeriesGranularity,
} from '@/lib/queue-series';
import { formatSecsToClock } from '../format';

/**
 * Service level by hour or by day.
 *
 * The other queue reports are built in the browser from the page of call-log
 * rows already fetched, which is a sample once a range holds more calls than
 * one page. This one is counted on the server over every call in the range,
 * bucketed by calendar hour or day in this browser's timezone, and every
 * total - per queue, per bucket, overall - is the sum of counts. No
 * percentage on this screen is an average of other percentages.
 */

const toCsvValue = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const pct = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${Math.round(value * 10) / 10}%`;
const clock = (seconds: number | null | undefined) =>
  seconds === null || seconds === undefined ? '—' : formatSecsToClock(seconds);

const HEAD = [
  'Interval',
  'Offered',
  'Answered',
  'Abandoned',
  'Short',
  'Flow-out',
  'Abandon %',
  'SL %',
  'ASA',
  'Waiting',
];

const cellsOf = (label: string, row: SeriesBucket | QueueSeries['totals']) => [
  label,
  row.offered,
  row.answered,
  row.abandoned,
  row.short_abandons,
  row.flow_outs ?? 0,
  pct(row.abandon_percent),
  pct(row.service_level_percent),
  clock(row.asa_seconds),
  row.waiting,
];

const ALL = '__all__';

const QueueSeriesReport = ({ selectedRange }: { selectedRange: { from: string; to: string } }) => {
  const [granularity, setGranularity] = useState<SeriesGranularity>('hour');
  const [queueUuid, setQueueUuid] = useState<string>(ALL);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, isPending, isError, error } = useQueueSeries(selectedRange, { granularity });

  const queues = data?.queues || [];
  const picked =
    queueUuid === ALL ? null : queues.find((queue) => queue.queue_uuid === queueUuid) || null;
  const series: SeriesBucket[] = picked ? picked.series : data?.totals?.series || [];
  const totals = picked ? picked.totals : data?.totals?.totals || null;
  const target = useMemo(
    () => describeTargets(picked ? [picked.target] : queues.map((queue) => queue.target)),
    [picked, queues],
  );

  /* Quiet buckets stay in the table (a quiet hour is information) but a chart
     of a month by the hour is unreadable, so the chart shows only buckets
     that took a call. */
  const chartData = useMemo(
    () =>
      series
        .filter((row) => row.offered > 0)
        .map((row) => ({
          label: bucketLabel(row.bucket, granularity),
          serviceLevel: row.service_level_percent,
          offered: row.offered,
          answered: row.answered,
          abandoned: row.abandoned,
          flowOuts: row.flow_outs ?? 0,
        })),
    [series, granularity],
  );

  const rows = useMemo(
    () => series.map((row) => cellsOf(bucketLabel(row.bucket, granularity), row)),
    [series, granularity],
  );
  const totalCells = totals ? cellsOf('TOTAL', totals) : null;

  const exportCsv = () => {
    if (!rows.length) return;
    const lines = [HEAD.map(toCsvValue).join(',')];
    rows.forEach((row) => lines.push(row.map(toCsvValue).join(',')));
    if (totalCells) lines.push(totalCells.map(toCsvValue).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-level-by-${granularity}_${selectedRange.from}_${selectedRange.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const status = (error as any)?.response?.status;
  const unavailable = isError && (status === 404 || status === 502 || status === 503);

  const note =
    `Counted on the server over every queue call in the range, by calendar ${granularity} in ${timezone}. ` +
    `SL % is calls answered within ${target.differ ? "each queue's own target" : `${target.seconds} s`} ` +
    `out of the calls that could be judged: answered calls with a recorded wait plus abandons beyond the ` +
    `short-abandon floor. Hang-ups inside the floor are shown as Short and left out of SL % and Abandon %. ` +
    `Flow-out is a caller the queue sent on to voicemail, a menu or an extension, or whose wait it ended ` +
    `itself: not abandoned, so it is out of SL % but stays in Offered and in the Abandon % base. ` +
    `Waiting is live and is 0 for a past interval.`;

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Service Level by Interval</h3>
        <span className="pc-right" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {selectedRange.from} – {selectedRange.to}
          {data ? ` · ${rows.length} ${granularity === 'hour' ? 'hours' : 'days'}` : ''}
        </span>
      </div>
      <div className="pc-body tight">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            margin: '10px 0',
          }}
        >
          <div style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="Interval">
            {(['hour', 'day'] as SeriesGranularity[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`btn ${granularity === option ? 'primary' : 'ghost'} sm`}
                aria-pressed={granularity === option}
                onClick={() => setGranularity(option)}
              >
                {option === 'hour' ? 'By hour' : 'By day'}
              </button>
            ))}
          </div>

          <select
            value={queueUuid}
            onChange={(event) => setQueueUuid(event.target.value)}
            aria-label="Queue"
            style={{
              height: 30,
              maxWidth: 260,
              padding: '0 8px',
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <option value={ALL}>All queues ({queues.length})</option>
            {queues.map((queue) => (
              <option key={queue.queue_uuid} value={queue.queue_uuid}>
                {queue.queue_name || queue.queue_uuid}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Target: <strong>{target.text}</strong>
          </span>

          <span style={{ flex: 1 }} />

          <button
            type="button"
            className="btn ghost sm"
            onClick={exportCsv}
            disabled={!rows.length}
            style={{ opacity: rows.length ? 1 : 0.5 }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Export CSV
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 7,
            margin: '0 0 10px',
            padding: '9px 12px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--accent-edge)',
            background: 'var(--accent-wash)',
            color: 'var(--accent-ink)',
            fontSize: 11.5,
            lineHeight: 1.5,
          }}
        >
          <Info style={{ width: 14, height: 14, flex: 'none', marginTop: 1 }} />
          <span>{note}</span>
        </div>

        {totals && totals.answered_unmeasured > 0 && (
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ink-4)' }}>
            {totals.answered_unmeasured} answered{' '}
            {totals.answered_unmeasured === 1 ? 'call' : 'calls'} had no wait recorded and{' '}
            {totals.answered_unmeasured === 1 ? 'is' : 'are'} left out of SL % and ASA.
          </p>
        )}

        {isPending ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader variant="blue" size="md" />
          </div>
        ) : unavailable ? (
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--crit)' }}>
            The interval report is not available on this server yet. The other queue reports still
            work.
          </p>
        ) : isError ? (
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--crit)' }}>
            This report couldn't be loaded for this range. Try a different date range.
          </p>
        ) : (
          <>
            {chartData.length > 0 && (
              <div style={{ width: '100%', height: 220, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line-2)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--ink-4)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--line)' }}
                      interval="preserveStartEnd"
                      minTickGap={18}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'var(--ink-4)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--surface-2)' }}
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--ink)',
                      }}
                      formatter={(value: any, name: any, item: any) => {
                        if (name === 'serviceLevel') {
                          const row = item?.payload || {};
                          return [
                            `${pct(value)} · ${row.offered} offered, ${row.answered} answered, ${row.abandoned} abandoned` +
                              (row.flowOuts ? `, ${row.flowOuts} flow-out` : ''),
                            'Service level',
                          ];
                        }
                        return [value, name];
                      }}
                    />
                    {target.percent !== null && (
                      <ReferenceLine
                        y={target.percent}
                        stroke="var(--crit)"
                        strokeDasharray="4 3"
                        label={{
                          value: `${target.percent}%`,
                          position: 'right',
                          fontSize: 10,
                          fill: 'var(--crit)',
                        }}
                      />
                    )}
                    <Bar
                      dataKey="serviceLevel"
                      name="serviceLevel"
                      fill="var(--accent)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: 'max-content',
                  borderCollapse: 'collapse',
                  fontSize: 12.5,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {HEAD.map((heading) => (
                      <th
                        key={heading}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.09em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-4)',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        style={{
                          borderBottom: '1px solid var(--line-2)',
                          opacity: series[rowIndex]?.offered ? 1 : 0.55,
                        }}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cellIndex === 0 ? undefined : 'num'}
                            style={{
                              whiteSpace: 'nowrap',
                              padding: '8px 12px',
                              fontWeight: cellIndex === 0 ? 700 : 500,
                              color: cellIndex === 0 ? 'var(--ink)' : 'var(--ink-2)',
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={HEAD.length}
                        style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--ink-4)' }}
                      >
                        No queue calls in this range
                      </td>
                    </tr>
                  )}
                  {totalCells && rows.length ? (
                    <tr style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                      {totalCells.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={cellIndex === 0 ? undefined : 'num'}
                          style={{ whiteSpace: 'nowrap', padding: '8px 12px', color: 'var(--ink)' }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QueueSeriesReport;
