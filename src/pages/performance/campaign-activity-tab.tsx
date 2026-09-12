import { useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { SocketEvents } from '@/context/socket-events-context';
import { campaignList, getCampaignComplianceReport } from '@/services/api';
import { DIAL_METHOD_LABEL, StatusPill } from '@/pages/auto-dialer/campaign/campaign-ui';
import { HEALTH_LABEL } from '@/lib/campaign-dial-mode';
import { capitalizeFirstLetter } from '@/lib/utils';
import PerfStatCard from './stat-card';
import buildCampaignRows, {
  ABANDON_CAP_PERCENT,
  pacingFor,
  summariseCampaignRows,
  type CampaignPerfRow,
  type ComplianceDayRow,
} from './campaign-rows';
import './campaigns-theme.css';

/**
 * Performance ▸ Campaigns.
 *
 * This tab used to show five account-wide totals and then embed the campaign
 * MANAGEMENT list — edit, pause and delete buttons on a performance screen,
 * and not one figure that told you whether a campaign was dialling safely.
 *
 * It now answers the three questions an outbound supervisor actually has:
 *   how much did each campaign dial, how much of it connected, and is the
 *   abandon rate inside the cap. Plus, for a running campaign, what the dialer
 *   is doing this second and how far ahead it is dialling.
 *
 * The abandon figures are the same ones the Compliance report shows, from the
 * same endpoint and the same grouping, so the two screens cannot disagree.
 */

const pct = (value: number | null, digits = 0) =>
  value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`;

const hhmm = (seconds: number) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  const s = total % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

const CSV_COLUMNS: Array<[string, (row: CampaignPerfRow) => string | number]> = [
  ['campaign', (r) => r.name],
  ['mode', (r) => DIAL_METHOD_LABEL[r.dialMethod] || r.dialMethod || ''],
  ['status', (r) => r.status],
  ['attempts', (r) => r.calls],
  ['live_answers', (r) => r.answeredLive],
  ['connect_rate_percent', (r) => (r.connectRatePct === null ? '' : r.connectRatePct.toFixed(1))],
  ['abandoned', (r) => r.abandoned],
  ['abandon_rate_percent', (r) => (r.abandonRatePct === null ? '' : r.abandonRatePct.toFixed(1))],
  ['abandon_cap_percent', (r) => r.capPercent],
  ['over_cap', (r) => (r.overCap ? 'yes' : 'no')],
  ['answering_machine', (r) => r.machine],
  ['busy', (r) => r.busy],
  ['no_answer', (r) => r.noAnswer],
  ['callbacks', (r) => r.callbacks],
  ['talk_seconds', (r) => r.talkSeconds],
  ['leads_assigned', (r) => r.assignedLeads ?? ''],
];

const downloadCsv = (rows: CampaignPerfRow[], from: string, to: string) => {
  const body = [
    CSV_COLUMNS.map(([header]) => header).join(','),
    ...rows.map((row) => CSV_COLUMNS.map(([, read]) => JSON.stringify(read(row) ?? '')).join(',')),
  ].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  link.download = `campaign-performance-${from}-${to}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const CampaignActivityTab = ({
  selectedRange,
}: {
  selectedRange: { from: string; to: string };
}) => {
  const navigate = useNavigate();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  /**
   * `perf-warm-backdrop` flags the document so campaigns-theme.css can paint
   * the full-page ambient gradient and the KPI band — done on
   * `.perf-campaigns` itself rather than through the generic `.mcm-page`
   * rule.
   *
   * The toolbar itself (`perf-warm-toolbar`) is toggled once in the parent
   * `Performance` component (index.tsx), since the toolbar renders
   * unconditionally there for every tab — adding it here too would race
   * with the parent's own toggle on tab switches.
   */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  /* The dialer service pushes a board per running campaign every few seconds.
     Kept by campaign id; a board older than 30 s is treated as gone, the same
     rule the campaign list uses, so the two screens age out together. */
  const { socketEventsManager } = useContext(SocketEvents);
  const [liveBoards, setLiveBoards] = useState<Record<string, { board: any; at: number }>>({});
  useEffect(() => {
    if (!socketEventsManager) return;
    const onLive = (payload: any) => {
      const id = String(payload?.campaignId || '');
      if (!id) return;
      setLiveBoards((prev) => ({ ...prev, [id]: { board: payload, at: Date.now() } }));
    };
    socketEventsManager.on('campaign-live-stats', onLive);
    return () => socketEventsManager.off('campaign-live-stats', onLive);
  }, [socketEventsManager]);

  /* A board goes stale on the clock, not on a re-render, so the rows need a
     reason to recompute even when nothing arrived. */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['performanceCampaignActivityList'],
    queryFn: () => campaignList({ page: 1, limit: 500, filters: [] }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 30000,
  });

  /* Every campaign's calls in the range, grouped by day — the same endpoint
     the Compliance report reads, asked without a campaign id. */
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['performanceCampaignCompliance', selectedRange.from, selectedRange.to, timezone],
    queryFn: () =>
      getCampaignComplianceReport({
        from: selectedRange.from,
        to: selectedRange.to,
        timezone,
        abandonCapPercent: ABANDON_CAP_PERCENT,
      }),
    select: (res: any) => res?.data?.data?.result || null,
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => {
    const liveBoardFor = (id: string) => {
      const entry = liveBoards[String(id)];
      return entry && Date.now() - entry.at < 30000 ? entry.board : null;
    };
    return buildCampaignRows({
      byDay: (report?.byDay || []) as ComplianceDayRow[],
      campaigns,
      liveBoardFor,
    });
    // `tick` is here on purpose: it ages the live boards out.
  }, [report, campaigns, liveBoards, tick]);

  const totals = useMemo(() => summariseCampaignRows(rows), [rows]);

  const openMonitor = (row: CampaignPerfRow) =>
    navigate(
      `/campaign/all-campaigns/compaign-record?campaignId=${encodeURIComponent(row.id)}`,
      { state: { campaignId: row.id } },
    );

  const columns: any = [
    {
      header: 'Campaign',
      accessorKey: 'name',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        const mode = DIAL_METHOD_LABEL[data.dialMethod];
        return (
          <button
            type="button"
            onClick={() => openMonitor(data)}
            style={{ minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            title="Open this campaign's monitor"
          >
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {capitalizeFirstLetter(data.name)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              {mode ? <span className="tag neu">{mode}</span> : null}
              {data.status ? (
                <span className="src">{capitalizeFirstLetter(data.status.toLowerCase())}</span>
              ) : null}
            </div>
          </button>
        );
      },
    },
    {
      header: 'Now',
      accessorKey: 'board',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        const health = data.board?.health?.state ? HEALTH_LABEL[data.board.health.state] : null;
        if (!data.board || !health)
          return <StatusPill status={data.status} dialMethod={data.dialMethod} />;
        const tone =
          health.tone === 'good'
            ? 'pos'
            : health.tone === 'crit'
              ? 'neg'
              : health.tone === 'warn'
                ? 'warn'
                : 'neu';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
            <span className={`tag ${tone}`} title={data.board?.health?.reason || health.label}>
              {health.tone === 'good' ? <span className="dot green" /> : null}
              {health.label}
            </span>
            <span className="src num">
              {Number(data.board?.calls?.linesInUse || 0)} up ·{' '}
              {Number(data.board?.agents?.idle || 0)} idle of{' '}
              {Number(data.board?.agents?.total || 0)}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Attempts',
      accessorKey: 'calls',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => (
        <span className="num">{row.original.calls.toLocaleString()}</span>
      ),
    },
    {
      header: 'Connected',
      accessorKey: 'answeredLive',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        return (
          <div>
            <div className="num">{data.answeredLive.toLocaleString()}</div>
            <span className="src">{pct(data.connectRatePct, 1)} of attempts</span>
          </div>
        );
      },
    },
    {
      header: 'Abandon rate',
      accessorKey: 'abandonRatePct',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        if (!data.paced)
          return (
            <div>
              <div className="num">—</div>
              <span className="src">
                {data.dialMethod?.toUpperCase() === 'INBOUND'
                  ? 'callers dial in'
                  : 'preview calls cannot abandon'}
              </span>
            </div>
          );
        return (
          <div>
            <div className="num" style={data.overCap ? { color: 'var(--crit)', fontWeight: 700 } : undefined}>
              {pct(data.abandonRatePct, 1)}
              {data.overCap ? ' over cap' : ''}
            </div>
            <span className="src">
              {data.abandoned.toLocaleString()} abandoned · cap {data.capPercent}%
            </span>
          </div>
        );
      },
    },
    {
      header: 'Dialling ahead',
      accessorKey: 'pacing',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const pacing = pacingFor(row.original);
        return (
          <div>
            <div className="num" style={pacing.warn ? { color: 'var(--warn)', fontWeight: 700 } : undefined}>
              {pacing.text}
            </div>
            {pacing.sub ? <span className="src">{pacing.sub}</span> : null}
          </div>
        );
      },
    },
    {
      header: 'Not reached',
      accessorKey: 'machine',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        return (
          <div>
            <div className="num">{(data.machine + data.busy + data.noAnswer).toLocaleString()}</div>
            <span className="src">
              {data.machine} machine · {data.busy} busy · {data.noAnswer} no answer
            </span>
          </div>
        );
      },
    },
    {
      header: 'Talk time',
      accessorKey: 'talkSeconds',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        return (
          <div>
            <div className="num">{hhmm(data.talkSeconds)}</div>
            <span className="src">
              {data.answeredLive > 0
                ? `${hhmm(data.talkSeconds / data.answeredLive)} per connect`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Leads',
      accessorKey: 'assignedLeads',
      cell: ({ row }: { row: { original: CampaignPerfRow } }) => {
        const data = row.original;
        if (data.assignedLeads === null) return <span className="src">—</span>;
        return (
          <div>
            <div className="num">{data.assignedLeads.toLocaleString()}</div>
            <span className="src">assigned</span>
          </div>
        );
      },
    },
  ];

  return (
    /* `pt-7` lands the first card on the same 28px as every other Performance
       tab (Agents/Calls reach it as a `py-4` root plus the 12px their stat
       grids add via `py-3`). Bottom keeps this tab's own `py-5`. */
    <div className="perf-campaigns flex w-full flex-col gap-4 px-[22px] pt-7 pb-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <PerfStatCard
          label="Attempts"
          value={totals.calls.toLocaleString()}
          sub={`${rows.length} campaign${rows.length === 1 ? '' : 's'} in range`}
        />
        <PerfStatCard label="Connected" value={totals.answeredLive.toLocaleString()} sub="a person answered" />
        <PerfStatCard
          label="Connect rate"
          value={pct(totals.connectRatePct, 1)}
          sub="connected ÷ attempts"
        />
        <PerfStatCard
          label="Abandon rate"
          value={pct(totals.abandonRatePct, 1)}
          sub={`cap ${ABANDON_CAP_PERCENT}% · paced campaigns only`}
          tone={
            totals.abandonRatePct !== null && totals.abandonRatePct > ABANDON_CAP_PERCENT
              ? 'danger'
              : 'success'
          }
        />
        <PerfStatCard
          label="Over the cap"
          value={String(totals.campaignsOverCap)}
          sub={totals.campaignsOverCap ? 'needs slowing down' : 'every campaign inside the cap'}
          tone={totals.campaignsOverCap > 0 ? 'danger' : 'default'}
        />
        <PerfStatCard
          label="Answering machines"
          value={totals.machine.toLocaleString()}
          sub={totals.calls > 0 ? `${((totals.machine / totals.calls) * 100).toFixed(1)}% of attempts` : undefined}
        />
        <PerfStatCard label="Talk time" value={hhmm(totals.talkSeconds)} sub="agents on campaign calls" />
      </div>

      {isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load campaign call figures:{' '}
          {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'unknown error'}
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={!rows.length}
          onClick={() => downloadCsv(rows, selectedRange.from, selectedRange.to)}
        >
          Export CSV
        </Button>
      </div>

      <TableManager
        columns={columns}
        staticData={rows}
        loading={isLoading}
        showPagination={false}
        emptyTablePlaceholder="No campaign calls in this range"
        descriptionEmptyTable="Campaigns that placed calls in the selected dates show their figures here."
      />

      <p className="page-note">
        Attempts, connects, abandons and talk time are the campaign call log for the selected
        dates, grouped in {timezone} — the same source and the same grouping as the Compliance
        report. The abandon rate is measured across the whole range, not per day, because that is
        how the {ABANDON_CAP_PERCENT}% rule is written. "Now" and "Dialling ahead" come from the
        dialer engine and only exist while it is running a campaign; a campaign that stopped shows
        its stored status instead. Per-lead progress and the dial log are on each campaign's own
        monitor — click a campaign name.
      </p>
    </div>
  );
};

export default CampaignActivityTab;
