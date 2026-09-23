import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/custom/loader';
import {
  NOT_RECORDED,
  buildChangeLog,
  entriesForAuditLog,
  changeLogToCsv,
  filterChangeLog,
  sectionLabel,
  type AuditLogRow,
  type ChangeLogEntry,
  type HistoryRow,
} from '@/lib/change-log';
import { listAuditLog } from '@/services/api';
import {
  isListResult,
  listSections,
  sectionHistory,
} from '@/lib/company-settings-api';
import { getCentralAuditHistory } from '@/lib/central-audit-api';
import { migrateLegacyAllowlist } from '@/lib/ip-allowlist';
import {
  getPropagationDashboard,
  propagationToCsv,
  type PropagationEvent,
  type PropagationState,
  type PropagationSystemKey,
} from '@/lib/propagation-audit-api';
import { SectionHeading } from './section-heading';
import { BackButton } from './section-actions';

/* Company › Change log.
 *
 * Who changed which company rule, when, and what it was before. The server
 * has written one history row per section per save since 3 Sep 2026 and the
 * Security page keeps its own list of IP-allowlist decisions; until now no
 * screen read either. This one reads both and shows one line per changed
 * field, newest first, with a CSV for the auditor.
 *
 * The third source is the server's own configuration-change log
 * (GET /api/audit/log): people, roles, numbers, locations, desk phones and
 * recording access, written by the audit trail on those routers. Until that
 * build is on the server the request 404s and this screen simply shows the
 * two older sources; the note at the top says which it has. */

/* The filter row: `appearance-none` so the chevron sits where we put it rather
   than wherever the platform draws its own, and `mcm-plain-select` to trade the
   admin focus ring for the border it already has. */
const FILTER_SELECT =
  'mcm-solid-card mcm-plain-select h-9 appearance-none rounded-md border border-gray-200 bg-white pl-3 pr-8 text-sm outline-none cursor-pointer';
const FILTER_CHEVRON =
  'pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400';

const HISTORY_PER_SECTION = 50;
const CHANGE_LOG_QUERY_KEY = ['companyChangeLog'];
const PROPAGATION_QUERY_KEY = ['companyPropagationDashboard'];

interface ChangeLogData {
  entries: ChangeLogEntry[];
  auditAvailable: boolean;
  warnings: string[];
}

const fetchChangeLog = async (): Promise<ChangeLogData> => {
  const warnings: string[] = [];
  let settings: Record<string, any> = {};
  try {
    const listed = await listSections();
    if (!isListResult(listed)) throw new Error('Invalid settings response');
    settings = listed.sections || {};
  } catch {
    warnings.push('Company-rule history and security decisions could not be read.');
  }
  const sections = Object.keys(settings);
  const histories: Record<string, HistoryRow[]> = {};
  await Promise.all(
    sections.map(async (section) => {
      try {
        histories[section] = await sectionHistory(section, HISTORY_PER_SECTION);
      } catch {
        histories[section] = [];
        warnings.push(`History unavailable: ${sectionLabel(section)}.`);
      }
    }),
  );
  const security = settings.security?.settings;
  const allowlist = migrateLegacyAllowlist(security?.ip_allowlist);
  let auditRows: AuditLogRow[] = [];
  let auditAvailable = false;
  try {
    const response: any = await listAuditLog({ limit: 200 });
    const result = response?.data?.data?.result ?? response?.data?.result ?? response?.data;
    if (!Array.isArray(result?.rows)) throw new Error('Invalid audit response');
    auditRows = result.rows;
    auditAvailable = true;
  } catch {
    /* Older server without the audit route: the two other sources still read. */
    auditAvailable = false;
    warnings.push('General audit history could not be read.');
  }
  return { entries: buildChangeLog(histories, allowlist.audit_log || [], auditRows), auditAvailable, warnings };
};

const whenLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATE_LABEL: Record<PropagationState, string> = {
  delivered: 'Acknowledged',
  pending: 'Pending',
  failed: 'Failed',
  not_connected: 'Not connected',
  not_required: 'Not required',
};

const STATE_CLASS: Record<PropagationState, string> = {
  delivered: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  not_connected: 'bg-red-50 text-red-700',
  not_required: 'bg-gray-100 text-gray-500',
};

const EventTarget = ({ event, system }: { event: PropagationEvent; system: PropagationSystemKey }) => {
  const target = event.targets.find((item) => item.system === system);
  if (!target) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${STATE_CLASS[target.state]}`}
      title={target.last_error || `${target.label}: ${STATE_LABEL[target.state]}`}
    >
      {target.deferred ? 'Deferred' : STATE_LABEL[target.state]}
    </span>
  );
};

const PropagationDashboardPanel = () => {
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: PROPAGATION_QUERY_KEY,
    queryFn: () => getPropagationDashboard(150),
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  });
  const [status, setStatus] = useState('');
  const [system, setSystem] = useState('');
  const [search, setSearch] = useState('');

  const events = data?.events ?? [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      if (status && event.status !== status) return false;
      if (system) {
        const target = event.targets.find((item) => item.system === system);
        if (!target || target.state === 'not_required') return false;
      }
      return needle
        ? [event.label, event.subject, event.correlation_id, ...event.changed_fields]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle))
        : true;
    });
  }, [events, search, status, system]);

  const exportDelivery = () => {
    const blob = new Blob([propagationToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `central-propagation-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Loader />;
  if (isError || !data) {
    /* A 404 here is the ordinary case on a server without the propagation
       service, not a fault to shout about — it reads as "not available",
       with the raw message kept underneath for whoever is diagnosing. */
    const message = String((error as any)?.message || 'unknown error');
    const missing = /404/.test(message);
    return (
      <div className="mcm-solid-card flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#2E2D35]">
            {missing ? 'Delivery receipts are not available on this server' : 'Delivery receipts could not be read'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#9A948F]">
            {missing
              ? 'The propagation service is not switched on here, so there is nothing to report on what each product received. Configuration history still works.'
              : 'The propagation dashboard did not answer. It may be a moment’s trouble rather than a missing service.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Checking…' : 'Try again'}
        </Button>
        <p className="text-[11px] text-gray-400">{message}</p>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Recent changes', value: data.summary.total, tone: 'text-slate-700' },
    { label: 'All required acknowledgements', value: data.summary.delivered, tone: 'text-emerald-700' },
    { label: 'Still moving', value: data.summary.pending, tone: 'text-amber-700' },
    { label: 'Need attention', value: data.summary.failed + data.summary.coverage_gaps, tone: 'text-red-700' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, tone }) => (
          <div key={label} className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Central connections</h3>
          <p className="text-sm text-muted-foreground">
            A fresh dispatcher heartbeat (within five minutes) shows the delivery worker is registered. An acknowledgement shows a consumer accepted a change; neither proves live call behaviour.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.systems.map((item) => {
            const connected = item.connected_event_types.length > 0;
            const attention = item.failed + item.coverage_gaps > 0;
            return (
              <div key={item.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{item.label}</strong>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.deferred ? 'bg-gray-100 text-gray-500' : !connected || attention ? 'bg-red-50 text-red-700' : item.pending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {item.deferred ? 'Deferred' : !connected ? 'Stale / absent' : attention ? 'Attention' : item.pending ? 'Pending' : 'Fresh heartbeat'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.deferred ? 'This integration is scheduled for a later phase.' : connected ? `${item.delivered} acknowledged · ${item.pending} pending` : 'No fresh dispatcher heartbeat. Earlier receipts do not establish current health.'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h3 className="font-semibold">Stored name verification</h3>
        <p className="text-sm text-muted-foreground">
          Read-only comparison of central names and profile versions with video and campaign records. Checks up to 25 newest users per company, cached for up to one minute. This does not test a live call, company settings, PBX or billing behaviour.
        </p>
        {data.projection_verification?.generated_at ? <p className="mt-2 text-xs text-muted-foreground">
          {data.projection_verification.sampled_users} of {data.projection_verification.total_users} users checked · {data.projection_verification.unverified_users} outside this sample · {whenLabel(data.projection_verification.generated_at)}
        </p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.projection_verification?.systems.map((item) => (
            <div key={item.system} className="rounded-lg border p-3">
              <strong className="text-sm">{item.system === 'video' ? 'Video' : 'Campaigns'}: {item.state === 'matched' ? 'Sample matched' : item.state === 'drift' ? 'Mismatch found' : item.state === 'source_changed' ? 'Changed during check — refresh' : item.state === 'no_users' ? 'No active users' : 'Verification unavailable'}</strong>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.checked_users !== undefined ? `${item.checked_users} profiles · ${item.checked_references} stored references · ${item.mismatched_profiles} profile mismatches · ${item.mismatched_references} reference mismatches` : item.reason || 'No success is assumed.'}
              </p>
            </div>
          ))}
          {!data.projection_verification?.systems.length ? <p className="text-sm text-muted-foreground">Verification unavailable. No success is assumed.</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-4">
          <h3 className="font-semibold">Coverage map</h3>
          <p className="text-sm text-muted-foreground">
            “Stale / absent” means no fresh dispatcher heartbeat. Historical acknowledgements are listed below; every listed target is required.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="mcm-plain-rows w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Central change</th><th className="px-3 py-2">Must reach</th><th className="px-3 py-2">Fresh heartbeat</th><th className="px-3 py-2">Stale / absent</th></tr>
            </thead>
            <tbody>
              {data.coverage.map((row, index) => (
                <tr key={`${row.label}-${index}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2">{row.expected.join(', ')}{row.deferred?.length ? ` (${row.deferred.join(', ')} deferred)` : ''}</td>
                  <td className="px-3 py-2 text-emerald-700">{row.connected.join(', ') || 'None yet'}</td>
                  <td className={row.missing.length ? 'px-3 py-2 font-medium text-red-700' : 'px-3 py-2 text-muted-foreground'}>{row.missing.join(', ') || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter delivery status">
            <option value="">All delivery states</option>
            <option value="delivered">All required acknowledgements</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="coverage_gap">Coverage gap</option>
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={system} onChange={(event) => setSystem(event.target.value)} aria-label="Filter target system">
            <option value="">All systems</option>
            {data.systems.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <Input className="h-9 w-64" placeholder="Search change, person or correlation ID" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search propagation events" />
          <span className="text-xs text-muted-foreground">{filtered.length} of {events.length} events</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Refreshing…' : 'Refresh'}</Button>
            <Button variant="outline" size="sm" onClick={exportDelivery} disabled={!filtered.length}>Export delivery CSV</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Change</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">PBX</th><th className="px-3 py-2">Video</th><th className="px-3 py-2">Campaigns</th><th className="px-3 py-2">AI</th><th className="px-3 py-2">Billing</th><th className="px-3 py-2">Correlation</th></tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.event_id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{whenLabel(String(event.occurred_at || ''))}</td>
                  <td className="px-3 py-2"><div className="font-medium">{event.label}</div><div className="text-xs text-muted-foreground">{event.changed_fields.join(', ') || 'Central record'}</div></td>
                  <td className="px-3 py-2">{event.subject}</td>
                  <td className="px-3 py-2"><EventTarget event={event} system="pbx" /></td>
                  <td className="px-3 py-2"><EventTarget event={event} system="video" /></td>
                  <td className="px-3 py-2"><EventTarget event={event} system="campaign" /></td>
                  <td className="px-3 py-2"><EventTarget event={event} system="ai" /></td>
                  <td className="px-3 py-2"><EventTarget event={event} system="billing" /></td>
                  <td className="px-3 py-2 font-mono text-xs" title={event.correlation_id}>{event.correlation_id.slice(0, 8) || '—'}</td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No central propagation events match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const CompanyChangeLog = () => {
  const [view, setView] = useState<'delivery' | 'history'>('delivery');
  const [centralCursors, setCentralCursors] = useState<string[]>([]);
  const centralCursor = centralCursors[centralCursors.length - 1];
  const central = useQuery({
    queryKey: ['companyCentralHistory', centralCursor || 'latest'],
    queryFn: () => getCentralAuditHistory(centralCursor),
    enabled: view === 'history',
    staleTime: 60 * 1000,
  });
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: CHANGE_LOG_QUERY_KEY,
    queryFn: fetchChangeLog,
    staleTime: 60 * 1000,
  });
  const entries = useMemo(() => [...(data?.entries ?? []), ...entriesForAuditLog(central.data?.rows ?? [])]
    .sort((a, b) => b.at.localeCompare(a.at)), [data, central.data]);
  const auditAvailable = data?.auditAvailable ?? false;

  const [section, setSection] = useState('');
  const [actor, setActor] = useState('');
  const [text, setText] = useState('');

  const sections = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.section))).sort(),
    [entries],
  );
  const actors = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.actor))).sort(),
    [entries],
  );
  const rows = useMemo(
    () => filterChangeLog(entries, { section, actor, text }),
    [entries, section, actor, text],
  );

  const exportCsv = () => {
    const blob = new Blob([changeLogToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `company-change-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        icon={<History className="size-5" />}
        title="Change and propagation log"
        description={
          <>
            One audit record says what changed. Delivery receipts say whether each required product actually received it. Missing integrations stay visible instead of being mistaken for success.
          </>
        }
        actions={view === 'history' ? (
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        ) : undefined}
      />

      {/* A segmented control rather than two buttons: these are two views of
          one screen, and as separate buttons the inactive one read as an
          action you could take rather than a place you could be. */}
      <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-gray-100 p-1">
        {([
          { key: 'delivery', label: 'Delivery' },
          { key: 'history', label: 'Configuration history' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              view === tab.key
                ? 'mcm-solid-card bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'delivery' ? <PropagationDashboardPanel /> : <>
      <div className="rounded-md border p-3 text-sm">
        <p>Central history includes committed user profiles, company profiles and office policies, with versions and correlation IDs. A commit does not prove delivery or live-call behaviour.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Central page {centralCursors.length + 1} · {central.data?.rows.length ?? 0} events</span>
          <Button variant="outline" size="sm" disabled={!centralCursors.length || central.isFetching} onClick={() => setCentralCursors((items) => items.slice(0, -1))}>Newer central events</Button>
          <Button variant="outline" size="sm" disabled={!central.data?.next_cursor || central.isFetching} onClick={() => {
            if (central.data?.next_cursor) setCentralCursors((items) => [...items, central.data!.next_cursor!]);
          }}>Older central events</Button>
          <Button variant="outline" size="sm" disabled={isFetching || central.isFetching} onClick={() => { void refetch(); void central.refetch(); }}>Refresh history</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Each page also includes the latest 50 company-rule versions per section and 200 general audit events. CSV exports only the visible, filtered rows. Values are redacted and size-limited; this is not yet complete coverage of every application action.</p>
      </div>
      {central.isError || data?.warnings.length ? <div role="alert" className="rounded-md border p-3 text-sm text-red-600">
        Partial history — do not treat missing rows as no changes.
        {central.isError ? <p>Central transactional history is unavailable.</p> : null}
        {data?.warnings.map((warning) => <p key={warning}>{warning}</p>)}
      </div> : null}
      {central.isLoading ? <p className="text-sm text-muted-foreground">Loading central history…</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            className={FILTER_SELECT}
            value={section}
            onChange={(e) => setSection(e.target.value)}
            aria-label="Filter by section"
          >
            <option value="">All sections</option>
            {sections.map((key) => (
              <option key={key} value={key}>
                {sectionLabel(key)}
              </option>
            ))}
          </select>
          <ChevronDown className={FILTER_CHEVRON} />
        </div>
        <div className="relative">
          <select
            className={FILTER_SELECT}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            aria-label="Filter by person"
          >
            <option value="">Everyone</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className={FILTER_CHEVRON} />
        </div>
        <Input
          className="h-9 w-64"
          placeholder="Search setting, value or correlation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Search the change log"
        />
        {/* Pushed to the far end so the count reads as a result of the filters
            rather than a fourth control in the row. */}
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} of {entries.length} changes
        </span>
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <p className="text-sm text-red-600">
          The change log could not be read: {String((error as any)?.message || 'unknown error')}.
        </p>
      ) : !entries.length ? (
        <p className="text-sm text-muted-foreground">
          No changes are available in the loaded history. Check any source warnings above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Section</th>
                <th className="px-3 py-2 font-medium">Setting</th>
                <th className="px-3 py-2 font-medium">Before</th>
                <th className="px-3 py-2 font-medium">After</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr key={`${entry.at}-${entry.section}-${entry.field}-${index}`} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{whenLabel(entry.at)}</td>
                  <td className="px-3 py-2">{sectionLabel(entry.section)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{entry.field || '—'}</td>
                  <td className={`max-w-[16rem] break-words px-3 py-2 ${entry.before === NOT_RECORDED ? 'italic text-muted-foreground/70' : 'text-muted-foreground'}`}>{entry.before}</td>
                  <td className="max-w-[16rem] break-words px-3 py-2">{entry.after}</td>
                  <td className="whitespace-nowrap px-3 py-2">{entry.actor}</td>
                  <td className="max-w-[18rem] break-words px-3 py-2 text-xs">
                    <div>{entry.source === 'central' ? 'Central commit' : entry.source}{entry.version !== undefined ? ` · v${entry.version}` : ''}</div>
                    {entry.entity_uuid ? <div>Subject: {entry.entity_uuid}</div> : null}
                    {entry.correlation_id ? <div>Correlation: {entry.correlation_id}</div> : null}
                    {entry.event_id ? <div>Event: {entry.event_id}</div> : null}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Nothing matches these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Configuration history combines central transactional history, company-rule versions, security decisions and the server audit trail.
        {auditAvailable
          ? ' Server audit rows record what was set; some older rows do not include the value they replaced.'
          : ' General audit history is unavailable; people, number and recording-access edits may be absent.'}
      </p>
      </>}

      <div className="flex justify-start border-t pt-4">
        <BackButton />
      </div>
    </div>
  );
};

export default CompanyChangeLog;
