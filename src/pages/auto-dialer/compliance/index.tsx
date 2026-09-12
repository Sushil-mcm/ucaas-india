import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { dropdownList, getCampaignComplianceReport } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useMemo, useState } from 'react';

/**
 * The figures a regulator asks for, read from the campaign call log:
 *   - per campaign per day: calls, live answers, abandoned, abandon rate
 *     against the cap (3 % over 30 days is the US rule)
 *   - per outgoing number per day: calls, answers, callbacks
 * Nothing here is stored separately; it is the call log, grouped.
 */

type DayRow = {
  day: string;
  campaignId: string | null;
  campaignName: string | null;
  dialMethod: string | null;
  calls: number;
  answered: number;
  abandoned: number;
  machine: number;
  busy: number;
  noAnswer: number;
  callbacks: number;
  talkSeconds: number;
  answeredLive: number;
  abandonRatePercent: number;
  overCap: boolean;
};

type NumberRow = Omit<DayRow, 'campaignId' | 'campaignName' | 'dialMethod'> & { didNumber: string | null };

const ABANDON_CAP_PERCENT = 3;

const pct = (n: number) => `${(Number(n) || 0).toFixed(1)}%`;
const mins = (s: number) => `${Math.round((Number(s) || 0) / 60)} min`;

const toCsv = (rows: Record<string, any>[], columns: string[]) =>
  [columns.join(','), ...rows.map((r) => columns.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');

const download = (name: string, text: string) => {
  const blob = new Blob([text], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};

const Compliance = () => {
  const [from, setFrom] = useState(moment().subtract(29, 'days').format('YYYY-MM-DD'));
  const [to, setTo] = useState(moment().format('YYYY-MM-DD'));
  const [campaign, setCampaign] = useState<ISELECTVALUE | undefined>();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const { data: campaignOptions = [] } = useQuery({
    queryKey: ['dropdownList', 'compliance'],
    queryFn: () => dropdownList({}),
    select: (data) =>
      (data?.data?.data?.result?.rows || []).map((c: any) => ({ label: c?.name, value: c?._id })),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['campaignComplianceReport', from, to, campaign?.value, timezone],
    queryFn: () =>
      getCampaignComplianceReport({
        from,
        to,
        timezone,
        campaignId: campaign?.value ? String(campaign.value) : undefined,
        abandonCapPercent: ABANDON_CAP_PERCENT,
      }),
    select: (res) => res?.data?.data?.result || null,
  });

  const byDay: DayRow[] = data?.byDay || [];
  const byNumber: NumberRow[] = data?.byNumber || [];
  const totals = data?.totals;

  /* One line per campaign across the whole window: this is the figure the
     rule is measured on, not any single day. */
  const byCampaign = useMemo(() => {
    const acc = new Map<string, DayRow>();
    for (const r of byDay) {
      const key = r.campaignId || '';
      const cur = acc.get(key) || { ...r, calls: 0, answered: 0, abandoned: 0, machine: 0, busy: 0, noAnswer: 0, callbacks: 0, talkSeconds: 0, answeredLive: 0, abandonRatePercent: 0, overCap: false };
      for (const k of ['calls', 'answered', 'abandoned', 'machine', 'busy', 'noAnswer', 'callbacks', 'talkSeconds', 'answeredLive'] as const) {
        cur[k] = (cur[k] || 0) + (r[k] || 0);
      }
      acc.set(key, cur);
    }
    return Array.from(acc.values()).map((r) => {
      const rate = r.answeredLive > 0 ? (r.abandoned / r.answeredLive) * 100 : 0;
      return { ...r, abandonRatePercent: Math.round(rate * 100) / 100, overCap: r.answeredLive > 0 && rate > ABANDON_CAP_PERCENT };
    });
  }, [byDay]);

  const cell = 'px-3 py-2 text-sm text-gray-800 whitespace-nowrap tabular-nums';
  const head = 'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 text-left whitespace-nowrap';

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white flex-wrap gap-2">
        <div>
          <p className="text-gray-900 font-semibold text-lg">Compliance</p>
          <p className="text-xs text-gray-500">
            Abandon rate per campaign against the {ABANDON_CAP_PERCENT}% cap, and calls per outgoing number. Days in {timezone}.
          </p>
        </div>
        <div className="flex items-center gap-2 filters flex-wrap">
          <input type="date" className="h-9 rounded-md border border-gray-200 px-2 text-sm" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="h-9 rounded-md border border-gray-200 px-2 text-sm" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          <div className="min-w-[220px]">
            <CustomSelect isClearable placeholder="All campaigns" options={campaignOptions} handleChange={(e: ISELECTVALUE) => setCampaign(e || undefined)} value={campaign} inputClass="team_chat" />
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-4 overflow-auto">
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load the report: {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'unknown error'}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            ['Calls', totals?.calls ?? '—'],
            ['Answered by a person', totals?.answeredLive ?? '—'],
            ['Abandoned', totals?.abandoned ?? '—'],
            ['Abandon rate', totals ? pct(totals.abandonRatePercent) : '—'],
            ['Answering machines', totals?.machine ?? '—'],
            ['Days over the cap', data?.daysOverCap ?? '—'],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-gray-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
              <p className={`text-xl font-semibold tabular-nums ${label === 'Abandon rate' && totals?.overCap ? 'text-red-600' : 'text-gray-900'}`}>{isLoading ? '…' : String(value)}</p>
            </div>
          ))}
        </div>

        <section className="rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Per campaign, whole window</p>
            <Button variant="secondary" size="sm" type="button" disabled={!byCampaign.length} onClick={() => download(`abandon-by-campaign-${from}-${to}.csv`, toCsv(byCampaign, ['campaignName', 'dialMethod', 'calls', 'answeredLive', 'abandoned', 'abandonRatePercent', 'machine', 'noAnswer', 'busy', 'callbacks', 'talkSeconds']))}>
              Download CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50"><tr>
                {['Campaign', 'Mode', 'Calls', 'Answered by a person', 'Abandoned', 'Abandon rate', 'Machines', 'No answer', 'Busy', 'Callbacks', 'Talk time'].map((h) => <th key={h} className={head}>{h}</th>)}
              </tr></thead>
              <tbody>
                {byCampaign.length === 0 ? (
                  <tr><td className={`${cell} text-gray-500`} colSpan={11}>{isLoading ? 'Loading…' : 'No campaign calls in this window.'}</td></tr>
                ) : byCampaign.map((r) => (
                  <tr key={r.campaignId || 'none'} className={r.overCap ? 'bg-red-50' : ''}>
                    <td className={cell}>{r.campaignName || r.campaignId || '—'}</td>
                    <td className={cell}>{r.dialMethod || '—'}</td>
                    <td className={cell}>{r.calls}</td>
                    <td className={cell}>{r.answeredLive}</td>
                    <td className={cell}>{r.abandoned}</td>
                    <td className={`${cell} ${r.overCap ? 'text-red-700 font-semibold' : ''}`}>{pct(r.abandonRatePercent)}{r.overCap ? ' over cap' : ''}</td>
                    <td className={cell}>{r.machine}</td>
                    <td className={cell}>{r.noAnswer}</td>
                    <td className={cell}>{r.busy}</td>
                    <td className={cell}>{r.callbacks}</td>
                    <td className={cell}>{mins(r.talkSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Per campaign, per day</p>
            <Button variant="secondary" size="sm" type="button" disabled={!byDay.length} onClick={() => download(`abandon-by-day-${from}-${to}.csv`, toCsv(byDay, ['day', 'campaignName', 'dialMethod', 'calls', 'answeredLive', 'abandoned', 'abandonRatePercent', 'overCap', 'machine', 'noAnswer', 'busy', 'callbacks', 'talkSeconds']))}>
              Download CSV
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0"><tr>
                {['Day', 'Campaign', 'Calls', 'Answered by a person', 'Abandoned', 'Abandon rate', 'Machines', 'No answer', 'Busy', 'Callbacks'].map((h) => <th key={h} className={head}>{h}</th>)}
              </tr></thead>
              <tbody>
                {byDay.length === 0 ? (
                  <tr><td className={`${cell} text-gray-500`} colSpan={10}>{isLoading ? 'Loading…' : 'Nothing in this window.'}</td></tr>
                ) : byDay.map((r) => (
                  <tr key={`${r.day}-${r.campaignId}`} className={r.overCap ? 'bg-red-50' : ''}>
                    <td className={cell}>{r.day}</td>
                    <td className={cell}>{r.campaignName || r.campaignId || '—'}</td>
                    <td className={cell}>{r.calls}</td>
                    <td className={cell}>{r.answeredLive}</td>
                    <td className={cell}>{r.abandoned}</td>
                    <td className={`${cell} ${r.overCap ? 'text-red-700 font-semibold' : ''}`}>{pct(r.abandonRatePercent)}</td>
                    <td className={cell}>{r.machine}</td>
                    <td className={cell}>{r.noAnswer}</td>
                    <td className={cell}>{r.busy}</td>
                    <td className={cell}>{r.callbacks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Per outgoing number, per day</p>
              <p className="text-xs text-gray-500">Complaints are not tracked yet; that column will appear once the carrier feed is in.</p>
            </div>
            <Button variant="secondary" size="sm" type="button" disabled={!byNumber.length} onClick={() => download(`calls-by-number-${from}-${to}.csv`, toCsv(byNumber, ['day', 'didNumber', 'calls', 'answeredLive', 'abandoned', 'machine', 'noAnswer', 'busy', 'callbacks', 'talkSeconds']))}>
              Download CSV
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0"><tr>
                {['Day', 'Number shown', 'Calls', 'Answered by a person', 'Answer rate', 'Callbacks', 'Machines', 'No answer'].map((h) => <th key={h} className={head}>{h}</th>)}
              </tr></thead>
              <tbody>
                {byNumber.length === 0 ? (
                  <tr><td className={`${cell} text-gray-500`} colSpan={8}>{isLoading ? 'Loading…' : 'Nothing in this window.'}</td></tr>
                ) : byNumber.map((r) => (
                  <tr key={`${r.day}-${r.didNumber}`}>
                    <td className={cell}>{r.day}</td>
                    <td className={cell}>{r.didNumber || '—'}</td>
                    <td className={cell}>{r.calls}</td>
                    <td className={cell}>{r.answeredLive}</td>
                    <td className={cell}>{r.calls > 0 ? pct((r.answeredLive / r.calls) * 100) : '—'}</td>
                    <td className={cell}>{r.callbacks}</td>
                    <td className={cell}>{r.machine}</td>
                    <td className={cell}>{r.noAnswer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Compliance;
