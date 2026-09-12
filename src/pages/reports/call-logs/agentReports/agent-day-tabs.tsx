import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentDay } from '@/hooks/use-agent-day';
import { useBreakReasons } from '@/hooks/use-agent-duty';
import { categoryLabels } from '@/lib/break-reasons';
import { useCompanyTimeZone } from '@/hooks/use-company-time-zone';
import { useUser } from '@/hooks/use-user';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import {
  BREAK_HEAD,
  DAY_HEAD,
  breakRows,
  dayRows,
  filterByName,
  overAllowanceCount,
  truncationNote,
} from '@/lib/agent-day-rows';
import { downloadCsv } from '@/lib/csv-download';
import { canExportAgentReports } from '@/lib/report-export-rules';

/* The "Day" and "Breaks" tabs of Reports › Call logs › Agent reports.

   Day: one row per agent per calendar day - signed in, on duty, on calls,
   wrap-up, free, breaks by reason, occupancy and productive time - from the
   duty history (start shift, breaks with a reason, end shift). Breaks: every
   break on its own line with how far over the company allowance it went.

   Time in each state is exact. On calls counts campaign calls only and
   wrap-up is what the dialer reported, so both carry a ≈ on screen.
   Adherence needs schedules the platform does not have; the column says so.

   Days are cut at midnight in the COMPANY's zone (main location), so two
   people in two places read the same numbers; the note says which zone.
   The rows themselves are built in lib/agent-day-rows.ts, where they are
   tested. */

const Table = ({ head, rows, empty }: { head: readonly string[]; rows: (string | number)[][]; empty: string }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={head.length} className="px-3 py-8 text-center text-gray-500">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-gray-500">{children}</p>
);

const ExportButton = ({ name, head, rows }: { name: string; head: readonly string[]; rows: (string | number)[][] }) => {
  const { user } = useUser();
  if (!canExportAgentReports(user)) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className="h-8 shrink-0 gap-1 text-xs"
      disabled={!rows.length}
      onClick={() => downloadCsv(name, [...head], rows)}
    >
      <Download className="h-3.5 w-3.5" /> CSV
    </Button>
  );
};

export const AgentDayTab = ({ from, to, search }: { from: string; to: string; search: string }) => {
  const zone = useCompanyTimeZone();
  const { users } = useUsersDirectory();
  const { rows, isPending, isError, error, truncated, maxRows } = useAgentDay('summary', {
    date_from: from,
    date_to: to,
    timezone: zone.timeZone,
  });
  const shown = useMemo(() => filterByName(rows, search, users), [rows, search, users]);
  const tableRows = useMemo(() => dayRows(shown, { timeZone: zone.timeZone, users }), [shown, zone.timeZone, users]);
  const cut = truncationNote({ truncated, max_rows: maxRows });

  if (isPending) return <p className="p-3 text-sm text-gray-500">Loading the day…</p>;
  if (isError)
    return (
      <p className="p-3 text-sm text-red-600">
        The day report could not be loaded{error?.response?.data?.error?.message ? `: ${error.response.data.error.message}` : ''}.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Note>
          {zone.sentence} ≈ On calls counts campaign calls only; wrap-up is what each agent's dialer
          reported. Occupancy = (on calls + wrap-up) ÷ (on calls + wrap-up + free on duty). Productive = (on
          calls + wrap-up) ÷ signed in. Adherence needs schedules, which do not exist yet.
          {cut ? ` ${cut}` : ''}
        </Note>
        <ExportButton name={`agent-day_${from}_${to}`} head={DAY_HEAD} rows={tableRows} />
      </div>
      <Table head={DAY_HEAD} rows={tableRows} empty="No shifts in this range. Rows appear once people start a shift, take breaks and end it." />
    </div>
  );
};

export const AgentBreaksTab = ({ from, to, search }: { from: string; to: string; search: string }) => {
  const zone = useCompanyTimeZone();
  const { users } = useUsersDirectory();
  const { reasons } = useBreakReasons();
  const allowances = useMemo(() => {
    const map: Record<string, number> = {};
    (reasons || []).forEach((r: any) => {
      if (r?.id && Number(r?.limit_minutes) > 0) map[r.id] = Number(r.limit_minutes);
    });
    return map;
  }, [reasons]);
  const { rows, isPending, isError, error, truncated, maxRows } = useAgentDay('breaks', {
    date_from: from,
    date_to: to,
    timezone: zone.timeZone,
    allowances,
  });
  const shown = useMemo(() => filterByName(rows, search, users), [rows, search, users]);
  const categories = useMemo(() => categoryLabels(reasons), [reasons]);
  const tableRows = useMemo(() => breakRows(shown, { timeZone: zone.timeZone, users, categories }), [shown, zone.timeZone, users, categories]);
  const overCount = overAllowanceCount(shown);
  const cut = truncationNote({ truncated, max_rows: maxRows });

  if (isPending) return <p className="p-3 text-sm text-gray-500">Loading breaks…</p>;
  if (isError)
    return (
      <p className="p-3 text-sm text-red-600">
        The breaks could not be loaded{error?.response?.data?.error?.message ? `: ${error.response.data.error.message}` : ''}.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Note>
          {shown.length} break{shown.length === 1 ? '' : 's'}, {overCount} over the allowance; {zone.label}.
          Allowances come from Company › Break reasons; going over is shown and counted, never enforced.
          {cut ? ` ${cut}` : ''}
        </Note>
        <ExportButton name={`agent-breaks_${from}_${to}`} head={BREAK_HEAD} rows={tableRows} />
      </div>
      <Table head={BREAK_HEAD} rows={tableRows} empty="No breaks in this range." />
    </div>
  );
};
