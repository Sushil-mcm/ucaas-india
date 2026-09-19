import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchPhone } from '@/services/api';
import { Ic } from '@/components/mcm/icons';
import { dayTimeText } from '@/lib/platform-clock';
import { KPI_REFRESH_MS } from '@/hooks/use-live-contact-centre';

/**
 * Recent calls (sheet 3): last 7 days, filter tabs All / Voicemail / Inbound /
 * Outbound with counts over the loaded rows (client-side, sheet 4), rows with a
 * direction tile, identifier + timestamp, number, type chip, duration and a
 * call button.
 */

type Filter = 'all' | 'voicemail' | 'inbound' | 'outbound';

type CallRow = {
  id?: string | number;
  start_stamp?: string;
  direction?: string;
  billsec?: string;
  is_voicemail?: boolean | number | string;
  contact_name?: string;
  caller_id_number?: string;
  display_caller_number?: string;
  destination_number?: string;
};

const kindOf = (row: CallRow): Exclude<Filter, 'all'> | 'missed' => {
  if (Number(row.is_voicemail) === 1 || row.is_voicemail === true) return 'voicemail';
  const direction = String(row.direction || '').toLowerCase();
  if (direction === 'outbound') return 'outbound';
  if (direction === 'missed') return 'missed';
  return 'inbound';
};

const KIND_META = {
  outbound: { chip: 'Out', icon: 'arrow-out', tone: 'out' },
  inbound: { chip: 'In', icon: 'arrow-in', tone: 'in' },
  missed: { chip: 'Missed', icon: 'miss', tone: 'missed' },
  voicemail: { chip: 'Voicemail', icon: 'vm', tone: 'vm' },
} as const;

const RecentCalls = ({
  from,
  to,
  timeZone,
  extension,
  myName,
  dial,
  isRegistered,
}: {
  from?: string;
  to?: string;
  timeZone: string;
  extension: string;
  myName: string;
  dial: (target: string) => unknown;
  isRegistered: boolean;
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: rows = [], isPending, isError } = useQuery({
    queryKey: ['homeRecentCallsOps', from, to],
    queryFn: () =>
      fetchPhone({
        page: 1,
        limit: 25,
        filter: [],
        filter_date: { from, to },
        sort: { key: 'start_stamp', desc: true },
      }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as CallRow[],
    refetchInterval: KPI_REFRESH_MS * 15,
  });

  const items = useMemo(
    () =>
      rows.map((row) => {
        const kind = kindOf(row);
        const outgoing = kind === 'outbound';
        const number = outgoing
          ? String(row.destination_number || '')
          : String(row.display_caller_number || row.caller_id_number || '');
        /* On outgoing rows the log's contact_name is often the caller — you. */
        const contact = String(row.contact_name || '').trim();
        const name =
          contact && !(outgoing && contact.toLowerCase() === myName.toLowerCase())
            ? contact
            : number || 'Number withheld';
        return { row, kind, number, name };
      }),
    [rows, myName],
  );

  const counts = {
    all: items.length,
    voicemail: items.filter((i) => i.kind === 'voicemail').length,
    inbound: items.filter((i) => i.kind === 'inbound' || i.kind === 'missed').length,
    outbound: items.filter((i) => i.kind === 'outbound').length,
  };
  const visible = items
    .filter((i) =>
      filter === 'all' ? true : filter === 'inbound' ? i.kind === 'inbound' || i.kind === 'missed' : i.kind === filter,
    )
    .slice(0, 10);

  return (
    <section className="ops-card ops-recent h3-rise" aria-label="Recent calls">
      <div className="ops-card-head">
        <div>
          <h3>Recent calls</h3>
          <p>Last 7 days{extension ? ` on ext ${extension}` : ''}</p>
        </div>
        <button type="button" className="ops-link" onClick={() => navigate('/reports/call-history')}>
          Call history ›
        </button>
      </div>

      <div className="ops-tabs" role="tablist" aria-label="Filter calls">
        {(
          [
            ['all', 'All'],
            ['voicemail', 'Voicemail'],
            ['inbound', 'Inbound'],
            ['outbound', 'Outbound'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? 'is-on' : ''}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="ops-mono">{counts[key]}</span>
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="ops-empty">Loading calls…</p>
      ) : isError ? (
        <p className="ops-empty">Recent calls could not load.</p>
      ) : !visible.length ? (
        <p className="ops-empty">
          {items.length ? 'No calls match this filter.' : 'No calls in the last 7 days.'}
        </p>
      ) : (
        <div className="ops-calls">
          {visible.map(({ row, kind, number, name }) => {
            const meta = KIND_META[kind];
            return (
              <div key={`${row.id}-${row.start_stamp}`} className="ops-call">
                <span className={`ops-dir ${meta.tone}`} aria-hidden="true">
                  <Ic n={meta.icon} size={14} />
                </span>
                <span className="ops-call-id">
                  <span className="t" title={name}>
                    {name}
                  </span>
                  <span className="d">{row.start_stamp ? dayTimeText(row.start_stamp, timeZone) : '—'}</span>
                </span>
                <span className="ops-mono ops-call-num" title={number}>
                  {number || '—'}
                </span>
                <span className={`ops-type ${meta.tone}`}>{meta.chip}</span>
                <span className="ops-mono ops-call-dur">
                  {row.billsec && row.billsec !== '00:00:00' ? row.billsec.replace(/^00:/, '') : '—'}
                </span>
                <button
                  type="button"
                  className="ops-callbtn"
                  disabled={!number || !isRegistered}
                  aria-label={number ? `Call ${name}` : 'No number to call'}
                  title={!number ? 'No number to call back' : !isRegistered ? "Your phone isn't connected yet" : `Call ${number}`}
                  onClick={() => number && isRegistered && dial(number)}
                >
                  <Ic n="phone" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentCalls;
