import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportsPageLayout } from '../reports-content-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { useAgentDuty, useBreakReasons } from '@/hooks/use-agent-duty';
import { usePublishSchedules, useSaveSchedules, useSchedules } from '@/hooks/use-workforce';
import { browserTimeZone } from '@/hooks/use-agent-day';
import { directoryName } from '@/lib/agent-day-rows';
import {
  blocksText,
  dayLabel,
  hoursText,
  lunchCode,
  onQueueMinutes,
  parseBlocksText,
  scheduleKey,
  shiftDate,
  TEMPLATES,
  templateBlocks,
  todayIn,
  weekOf,
  type ScheduleRow,
} from '@/lib/workforce';

/* Reports › Schedules: one week, one row per person, one cell per day. A cell
   is written as plain text ("09:00-12:30 On queue; 12:30-13:00 Lunch; …") so
   nothing is hidden in a picker; templates fill the common shapes. Drafts are
   private until "Publish week"; adherence only ever measures published days.
   An agent sees their own row and cannot edit; the server scopes anyway. */

interface Editing {
  user_uuid: string;
  name: string;
  date: string;
  text: string;
  error: string;
  weekdays: boolean;
}

const errorText = (error: any, fallback: string) => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback;

const Schedules = () => {
  const timeZone = browserTimeZone();
  const [anchor, setAnchor] = useState(todayIn(timeZone));
  const days = useMemo(() => weekOf(anchor), [anchor]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const { users } = useUsersDirectory();
  const { reasons } = useBreakReasons();
  const { canManageOthers, myUuid } = useAgentDuty();
  const query = useSchedules({ date_from: days[0], date_to: days[6] });
  const save = useSaveSchedules();
  const publish = usePublishSchedules();

  const rows: ScheduleRow[] = query.data?.rows || [];
  const byKey = useMemo(() => new Map(rows.map((r) => [scheduleKey(r.user_uuid, r.date), r])), [rows]);
  const people = useMemo(() => {
    const list = canManageOthers ? users : users.filter((u: any) => u?.uuid === myUuid);
    const q = search.trim().toLowerCase();
    return list
      .filter((u: any) => u?.uuid && (!q || directoryName(u).toLowerCase().includes(q) || String(u.extension || '').includes(q)))
      .sort((a: any, b: any) => directoryName(a).localeCompare(directoryName(b)));
  }, [users, canManageOthers, myUuid, search]);
  const drafts = rows.filter((r) => !r.published).length;

  const openCell = (u: any, date: string) => {
    if (!canManageOthers) return;
    const row = byKey.get(scheduleKey(u.uuid, date));
    setEditing({ user_uuid: u.uuid, name: directoryName(u) || u.uuid, date, text: blocksText(row?.blocks || [], reasons), error: '', weekdays: false });
  };

  const submit = async (publishNow: boolean) => {
    if (!editing) return;
    const parsed = parseBlocksText(editing.text, reasons);
    if (parsed.error) {
      setEditing({ ...editing, error: parsed.error });
      return;
    }
    const dates = editing.weekdays ? days.slice(0, 5) : [editing.date];
    try {
      await save.mutateAsync({ timezone: timeZone, publish: publishNow, rows: dates.map((date) => ({ user_uuid: editing.user_uuid, date, blocks: parsed.blocks })) });
      setNotice(`${publishNow ? 'Published' : 'Draft saved'} for ${editing.name}: ${dates.length} day${dates.length === 1 ? '' : 's'}.`);
      setEditing(null);
    } catch (error: any) {
      setEditing({ ...editing, error: errorText(error, 'Could not save.') });
    }
  };

  const publishWeek = async () => {
    try {
      const reply = await publish.mutateAsync({ date_from: days[0], date_to: days[6] });
      const n = Number(reply?.published ?? 0);
      setNotice(n ? `Published ${n} day${n === 1 ? '' : 's'}. People see their week now.` : 'Nothing left to publish this week.');
    } catch (error: any) {
      setNotice(errorText(error, 'Could not publish.'));
    }
  };

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setAnchor(shiftDate(days[0], -7))}>
        ← Previous week
      </Button>
      <Button variant="outline" size="sm" onClick={() => setAnchor(todayIn(timeZone))}>
        This week
      </Button>
      <Button variant="outline" size="sm" onClick={() => setAnchor(shiftDate(days[0], 7))}>
        Next week →
      </Button>
      <span className="text-sm text-gray-600">
        {dayLabel(days[0])} – {dayLabel(days[6])} · {timeZone}
      </span>
      <Input className="h-9 w-56" placeholder="Search people" value={search} onChange={(e) => setSearch(e.target.value)} />
      {canManageOthers && (
        <Button size="sm" onClick={publishWeek} disabled={publish.isPending || drafts === 0}>
          {publish.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Publish week{drafts ? ` (${drafts} draft${drafts === 1 ? '' : 's'})` : ''}
        </Button>
      )}
    </div>
  );

  return (
    <ReportsPageLayout filters={filters}>
      <div className="space-y-3">
        {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</div>}
        {query.isError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{errorText(query.error, 'Could not load schedules.')}</div>}
        <p className="text-sm text-gray-600">
          {canManageOthers
            ? 'Click a day to write it. A draft stays private until you publish the week (saving a published day without publishing makes it a draft again); adherence is measured against published days only.'
            : 'Your published week. Ask a supervisor to change it.'}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-3 py-2">Person</th>
                {days.map((d) => (
                  <th key={d} className="px-3 py-2 font-medium">
                    {dayLabel(d)}
                  </th>
                ))}
                <th className="px-3 py-2">On queue</th>
              </tr>
            </thead>
            <tbody>
              {query.isPending && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={9}>
                    <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
                  </td>
                </tr>
              )}
              {!query.isPending && people.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={9}>
                    Nobody matches.
                  </td>
                </tr>
              )}
              {people.map((u: any) => {
                const weekMinutes = days.reduce((sum, d) => sum + onQueueMinutes(byKey.get(scheduleKey(u.uuid, d))?.blocks || []), 0);
                return (
                  <tr key={u.uuid} className="border-t align-top">
                    <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium">
                      {directoryName(u) || u.uuid}
                      {u.extension ? <span className="ml-1 text-xs text-gray-500">{u.extension}</span> : null}
                    </td>
                    {days.map((d) => {
                      const row = byKey.get(scheduleKey(u.uuid, d));
                      const text = blocksText(row?.blocks || [], reasons);
                      return (
                        <td
                          key={d}
                          className={`max-w-[190px] px-3 py-2 text-xs ${canManageOthers ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                          onClick={() => openCell(u, d)}
                          title={canManageOthers ? 'Click to edit' : undefined}
                        >
                          {row && !row.published && <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-semibold uppercase text-amber-800">Draft</span>}
                          {row && row.blocks.length === 0 ? <span className="text-gray-500">Day off</span> : text || <span className="text-gray-400">—</span>}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{hoursText(weekMinutes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">
              {editing.name} · {dayLabel(editing.date)}
            </h3>
            <p className="mt-1 text-xs text-gray-600">One block per line or separated by semicolons: start-end and what they do. On queue, or any activity code.</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {TEMPLATES.map((t) => (
                <Button key={t.key} variant="outline" size="sm" onClick={() => setEditing({ ...editing, text: blocksText(templateBlocks(t.key, lunchCode(reasons)), reasons), error: '' })}>
                  {t.label}
                </Button>
              ))}
            </div>
            <textarea
              className="mt-3 h-28 w-full rounded-md border px-3 py-2 font-mono text-sm"
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value, error: '' })}
              placeholder="09:00-12:30 On queue; 12:30-13:00 Lunch; 13:00-17:00 On queue"
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.weekdays} onChange={(e) => setEditing({ ...editing, weekdays: e.target.checked })} />
              Apply to Monday–Friday of this week
            </label>
            {editing.error && <p className="mt-2 text-sm text-rose-700">{editing.error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={() => submit(false)} disabled={save.isPending}>
                Save draft
              </Button>
              <Button size="sm" onClick={() => submit(true)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Save and publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </ReportsPageLayout>
  );
};

export default Schedules;
