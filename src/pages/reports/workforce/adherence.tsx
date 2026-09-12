import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportsPageLayout } from '../reports-content-layout';
import { Input } from '@/components/ui/input';
import { browserTimeZone, useAgentDay } from '@/hooks/use-agent-day';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { clockText } from '@/lib/agent-day';
import { directoryName } from '@/lib/agent-day-rows';
import { adherenceText, averageOf, shiftDate, todayIn } from '@/lib/workforce';

/* Reports › Adherence: the agent-day summary rows, read for their adherence
   figures. A day has a number only when a published schedule exists for it;
   the rest say "Needs schedules" rather than pretending. Exceptions are the
   minutes where the schedule said one thing and the duty history another. */

const pct = (v: unknown) => (typeof v === 'number' ? `${v}%` : '—');

const Adherence = () => {
  const timeZone = browserTimeZone();
  const today = todayIn(timeZone);
  const [from, setFrom] = useState(shiftDate(today, -6));
  const [to, setTo] = useState(today);
  const [open, setOpen] = useState<string>('');
  const { users } = useUsersDirectory();
  const day = useAgentDay('summary', { date_from: from, date_to: to });
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u: any) => u?.uuid && map.set(u.uuid, directoryName(u)));
    return (row: any) => map.get(row.user_uuid) || row.name || row.user_uuid;
  }, [users]);
  const rows = day.rows;
  const measured = rows.filter((r) => typeof r.adherence === 'number');
  const average = averageOf(measured.map((r) => r.adherence));
  const conformance = averageOf(measured.map((r) => r.conformance_pct));

  const filters = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1">
        From <Input type="date" className="h-9 w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label className="flex items-center gap-1">
        To <Input type="date" className="h-9 w-40" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
      </label>
      <span className="text-gray-600">{timeZone}</span>
    </div>
  );

  return (
    <ReportsPageLayout filters={filters}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Adherence', average === null ? '—' : `${average}%`, 'average of measured days'],
            ['Conformance', conformance === null ? '—' : `${conformance}%`, 'scheduled time actually worked'],
            ['Measured days', String(measured.length), 'person-days with a published schedule'],
            ['Needs schedules', String(rows.length - measured.length), 'person-days without one'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-lg border bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-gray-500">{hint}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">Source: {day.sources?.adherence || 'needs schedules'}. Write and publish weeks under Reports › Schedules.</p>
        {day.isError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{day.error?.message || 'Could not load.'}</div>}
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Scheduled</th>
                <th className="px-3 py-2">In adherence</th>
                <th className="px-3 py-2">Adherence</th>
                <th className="px-3 py-2">Conformance</th>
                <th className="px-3 py-2">Exceptions</th>
              </tr>
            </thead>
            <tbody>
              {day.isPending && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={7}>
                    <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
                  </td>
                </tr>
              )}
              {!day.isPending && rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={7}>
                    No duty history in these days.
                  </td>
                </tr>
              )}
              {rows.map((row: any) => {
                const key = `${row.user_uuid}|${row.date}`;
                const exceptions: any[] = Array.isArray(row.exceptions) ? row.exceptions : [];
                const measuredRow = typeof row.adherence === 'number';
                return (
                  <>
                    <tr key={key} className="border-t">
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{nameOf(row)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2 tabular-nums">{measuredRow ? clockText(row.scheduled_s) : '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{measuredRow ? clockText(row.in_adherence_s) : '—'}</td>
                      <td className={`px-3 py-2 tabular-nums ${measuredRow ? (row.adherence >= 90 ? 'text-emerald-700' : row.adherence >= 75 ? 'text-amber-700' : 'text-rose-700') : 'text-gray-500'}`}>
                        {adherenceText(row)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{pct(row.conformance_pct)}</td>
                      <td className="px-3 py-2">
                        {exceptions.length ? (
                          <button className="text-blue-700 underline" onClick={() => setOpen(open === key ? '' : key)}>
                            {exceptions.length} {open === key ? '▾' : '▸'}
                          </button>
                        ) : measuredRow ? (
                          'none'
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    {open === key && (
                      <tr key={`${key}-x`} className="bg-gray-50">
                        <td colSpan={7} className="px-3 py-2 text-xs">
                          <ul className="space-y-0.5">
                            {exceptions.map((x, i) => (
                              <li key={i}>
                                {x.start}–{x.end}: expected <strong>{x.expected}</strong>, was <strong>{x.actual}</strong> ({clockText(x.seconds)})
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default Adherence;
