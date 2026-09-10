// Captain > Activity — every lead/form/button/widget action a real visitor has
// filled in, read from the pipeline the public widget now feeds. Ported from
// Chatwoot's captain/pages/SubmissionsIndex.vue + SubmissionDetailDialog.vue.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Download, Inbox, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

const PER_PAGE = 25;

type Contact = { id: number; name: string | null; email: string | null };
type Submission = {
  id: number;
  kind: string | null;
  tool_name: string | null;
  contact?: Contact | null;
  submitted_data: Record<string, unknown>;
  created_at: number | null;
};
type KindFilter = '' | 'lead' | 'form';

const typeLabel = (kind: string | null) => (kind === 'lead' ? 'Lead' : kind === 'form' ? 'Form' : kind || '-');
const typeBadgeCls = (kind: string | null) =>
  kind === 'form'
    ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';

const fmtDate = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleDateString() : '-');
const fmtTime = (ts: number | null) =>
  ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const SubmittedDataChips = ({ data, max }: { data: Record<string, unknown>; max?: number }) => {
  const entries = Object.entries(data || {});
  const shown = max ? entries.slice(0, max) : entries;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(([key, value]) => (
        <span
          key={key}
          title={String(value ?? '')}
          className="inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <span className="shrink-0 font-medium capitalize text-gray-900 dark:text-white">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className="truncate">{String(value ?? '') || '-'}</span>
        </span>
      ))}
      {max && entries.length > max && (
        <span className="text-xs text-gray-400 dark:text-neutral-500">+{entries.length - max} more</span>
      )}
    </div>
  );
};

const SubmissionDetailDialog = ({
  submission,
  onOpenChange,
}: {
  submission: Submission | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={!!submission} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg bg-white dark:bg-neutral-900">
      {submission && (
        <div className="flex flex-col gap-4 py-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                {submission.tool_name || 'Submission'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeCls(submission.kind)}`}>
                  {typeLabel(submission.kind)}
                </span>
                {submission.created_at && (
                  <span className="text-xs text-gray-400 dark:text-neutral-500">
                    {new Date(submission.created_at * 1000).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-neutral-700 dark:text-neutral-300">
              <User className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{submission.contact?.name || '-'}</span>
              {submission.contact?.email && (
                <span className="truncate text-xs text-gray-500 dark:text-neutral-400">{submission.contact.email}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {Object.entries(submission.submitted_data || {}).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  {key.replace(/_/g, ' ')}
                </span>
                <p className="mb-0 max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-relaxed text-gray-900 dark:text-white">
                  {String(value ?? '') || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default function CaptainSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [kind, setKind] = useState<KindFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [selected, setSelected] = useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (kind) qs.set('kind', kind);
      if (fromDate && toDate) {
        qs.set('from_date', fromDate);
        qs.set('to_date', toDate);
      }
      const res = await captainFetch(`${CAPTAIN_API_BASE}/template_submissions?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.message || 'Failed to load activity.');
      setSubmissions(json.payload || json.data || []);
      setTotalCount(json.meta?.total_count ?? (json.payload || []).length);
    } catch (err) {
      setError((err as Error).message || 'Failed to load activity.');
    } finally {
      setIsLoading(false);
    }
  }, [page, kind, fromDate, toDate]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Any filter change resets to page 1 rather than possibly landing on an
  // out-of-range page for the newly-filtered result set.
  const handleKindChange = (value: KindFilter) => {
    setKind(value);
    setPage(1);
  };
  const handleDateChange = (which: 'from' | 'to', value: string) => {
    if (which === 'from') setFromDate(value);
    else setToDate(value);
    setPage(1);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const qs = new URLSearchParams();
      if (kind) qs.set('kind', kind);
      if (fromDate && toDate) {
        qs.set('from_date', fromDate);
        qs.set('to_date', toDate);
      }
      const res = await captainFetch(`${CAPTAIN_API_BASE}/template_submissions/export?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to export activity.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `captain-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleAlert({ text: (err as Error).message || 'Failed to export activity.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, totalCount);
  const hasActiveFilters = useMemo(() => Boolean(kind) || Boolean(fromDate && toDate), [kind, fromDate, toDate]);

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div>
        <div className="text-lg font-bold text-gray-950 dark:text-gray-100">Activity</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every lead and form a visitor has actually submitted through your assistant.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={kind}
            onChange={(e) => handleKindChange(e.target.value as KindFilter)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-gray-50 pl-3 pr-8 text-sm text-gray-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white cursor-pointer"
          >
            <option value="">All</option>
            <option value="lead">Lead</option>
            <option value="form">Form</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-neutral-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={isExporting || (!isLoading && totalCount === 0)}>
          <Download className="size-4" />
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 dark:border-neutral-800">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox className="size-9 text-gray-300 dark:text-neutral-700" />
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {hasActiveFilters ? 'No activity matches these filters.' : 'No activity yet'}
            </p>
            {!hasActiveFilters && (
              <p className="max-w-sm text-sm text-gray-500 dark:text-neutral-400">
                Once a visitor fills in a lead or form action from the chat widget, it shows up here.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Submitted data</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-neutral-700 dark:text-neutral-300">
                          <User className="size-3.5" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-gray-900 dark:text-white">{s.contact?.name || '-'}</span>
                          {s.contact?.email && <span className="truncate text-xs text-gray-500 dark:text-neutral-400">{s.contact.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeCls(s.kind)}`}>
                        {typeLabel(s.kind)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {s.tool_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SubmittedDataChips data={s.submitted_data || {}} max={3} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white">{fmtDate(s.created_at)}</span>
                        <span className="text-xs text-gray-400 dark:text-neutral-500">{fmtTime(s.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && submissions.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
          <span>
            Showing {rangeStart} – {rangeEnd} of {totalCount} item{totalCount === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 disabled:opacity-40 dark:border-neutral-700"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 disabled:opacity-40 dark:border-neutral-700"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span>
              {page} of {totalPages}
            </span>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 disabled:opacity-40 dark:border-neutral-700"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 disabled:opacity-40 dark:border-neutral-700"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      <SubmissionDetailDialog submission={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
