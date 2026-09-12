import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportsPageLayout } from '../reports-content-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentDuty, useBreakReasons } from '@/hooks/use-agent-duty';
import { browserTimeZone } from '@/hooks/use-agent-day';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { useDecideTimeOff, useRequestTimeOff, useTimeOff } from '@/hooks/use-workforce';
import { directoryName } from '@/lib/agent-day-rows';
import { daysBetween, timeOffCodes, timeOffTone, todayIn } from '@/lib/workforce';

/* Reports › Time off: anyone asks for their own days; a supervisor or
   administrator (duty.others) decides, and may ask on somebody's behalf. An
   approval writes a whole-day block of that code into the schedule, so
   adherence expects the person off. Codes come from Company › Activity codes
   (category Time off). */

const errorText = (error: any, fallback: string) => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback;

const TimeOff = () => {
  const timeZone = browserTimeZone();
  const today = todayIn(timeZone);
  const { reasons } = useBreakReasons();
  const { users } = useUsersDirectory();
  const { canManageOthers, myUuid } = useAgentDuty();
  const codes = useMemo(() => timeOffCodes(reasons), [reasons]);
  const [status, setStatus] = useState('');
  const list = useTimeOff(status ? { status } : {});
  const request = useRequestTimeOff();
  const decide = useDecideTimeOff();
  const [form, setForm] = useState({ code: '', date_from: today, date_to: today, note: '', user_uuid: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u: any) => u?.uuid && map.set(u.uuid, directoryName(u)));
    return (uuid: string) => map.get(uuid) || (uuid === myUuid ? 'You' : uuid);
  }, [users, myUuid]);
  const rows: any[] = list.data?.rows || [];
  const code = form.code || codes[0]?.id || '';

  const submit = async () => {
    setError('');
    if (!code) {
      setError('Add an activity code with the category Time off under Company › Activity codes first.');
      return;
    }
    try {
      await request.mutateAsync({ code, date_from: form.date_from, date_to: form.date_to, note: form.note, ...(form.user_uuid ? { user_uuid: form.user_uuid } : {}) });
      setNotice(`Request sent for ${daysBetween(form.date_from, form.date_to)} day${daysBetween(form.date_from, form.date_to) === 1 ? '' : 's'}.`);
      setForm({ ...form, note: '' });
    } catch (e: any) {
      setError(errorText(e, 'Could not send the request.'));
    }
  };
  const judge = async (id: string, decision: 'approved' | 'declined') => {
    setError('');
    try {
      const reply = await decide.mutateAsync({ id, decision, timezone: timeZone });
      setNotice(decision === 'approved' ? `Approved: ${reply?.days ?? 0} day${reply?.days === 1 ? '' : 's'} written to the schedule.` : 'Declined.');
    } catch (e: any) {
      setError(errorText(e, 'Could not decide.'));
    }
  };

  const filters = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {['', 'pending', 'approved', 'declined'].map((s) => (
        <Button key={s || 'all'} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>
          {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
        </Button>
      ))}
    </div>
  );

  return (
    <ReportsPageLayout filters={filters}>
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Ask for time off</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            {canManageOthers && (
              <select className="h-9 rounded-md border px-2 text-sm" value={form.user_uuid} onChange={(e) => setForm({ ...form, user_uuid: e.target.value })}>
                <option value="">Myself</option>
                {users
                  .filter((u: any) => u?.uuid && u.uuid !== myUuid)
                  .map((u: any) => (
                    <option key={u.uuid} value={u.uuid}>
                      {directoryName(u) || u.uuid}
                    </option>
                  ))}
              </select>
            )}
            <select className="h-9 rounded-md border px-2 text-sm" value={code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
              {codes.length === 0 && <option value="">No time-off codes yet</option>}
              {codes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input type="date" className="h-9" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value, date_to: e.target.value > form.date_to ? e.target.value : form.date_to })} />
            <Input type="date" className="h-9" value={form.date_to} min={form.date_from} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
            <Input className="h-9" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Button size="sm" onClick={submit} disabled={request.isPending}>
              {request.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Send request
            </Button>
            {notice && <span className="text-sm text-emerald-800">{notice}</span>}
            {error && <span className="text-sm text-rose-700">{error}</span>}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Decided</th>
                {canManageOthers && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {list.isPending && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={7}>
                    <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
                  </td>
                </tr>
              )}
              {!list.isPending && rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={7}>
                    No requests{status ? ` (${status})` : ''}.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{nameOf(r.user_uuid)}</td>
                  <td className="px-3 py-2">{reasons.find((x) => x.id === r.code)?.name || r.code}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {r.date_from}
                    {r.date_to !== r.date_from ? ` → ${r.date_to}` : ''} ({daysBetween(r.date_from, r.date_to)})
                  </td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-gray-600" title={r.note}>
                    {r.note || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${timeOffTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                    {r.decided_at ? `${nameOf(r.decided_by)} · ${new Date(r.decided_at).toLocaleDateString()}` : '—'}
                    {r.decision_note ? ` · ${r.decision_note}` : ''}
                  </td>
                  {canManageOthers && (
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.status === 'pending' && (
                        <span className="flex gap-1">
                          <Button size="sm" onClick={() => judge(r.id, 'approved')} disabled={decide.isPending}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => judge(r.id, 'declined')} disabled={decide.isPending}>
                            Decline
                          </Button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default TimeOff;
