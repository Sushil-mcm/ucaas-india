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

  /* Every class below is one Home's own stylesheet defines.
     This panel was written against an `ops-*` vocabulary that only exists in
     the console page's stylesheet, which Home does not import -- so all 99 of
     those rules were missing and the whole panel rendered as raw text with no
     card, no rows and no columns. Rather than import a dead page's theme, it
     now uses the same panel chrome and pill tabs as every other section
     here. */
  return (
    <section className="panel-card" aria-label="Recent calls">
      <div className="pc-head">
        <h3>Recent calls</h3>
        <span className="src">Last 7 days{extension ? ` on ext ${extension}` : ''}</span>
        <button
          type="button"
          className="mini pc-right"
          onClick={() => navigate('/reports/call-history')}
        >
          <Ic n="list" size={12} />
          Call history
        </button>
      </div>

      {/* the same pill tabs as Communication overview, so the two filter
          strips on this page do not read as two different controls */}
      <div className="comms-tabs" role="tablist" aria-label="Filter calls">
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
            className={`comms-tab${filter === key ? ' is-active' : ''}`}
            style={filter === key ? ({ '--tab-color': 'var(--accent)' } as any) : undefined}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="rc-count num">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="pc-body">
        {isPending ? (
          <div className="empty comms-empty">
            <Ic n="clock" />
            <p>Loading the last seven days of calls…</p>
          </div>
        ) : isError ? (
          <div className="empty comms-empty">
            <Ic n="phone" />
            <p>Recent calls could not load, so this list is showing nothing rather than a partial history.</p>
          </div>
        ) : !visible.length ? (
          <div className="empty comms-empty">
            <Ic n="phone" />
            <p>
              {items.length
                ? 'No calls match this filter. The counts on the tabs above show where the calls are.'
                : 'No calls on this extension in the last seven days.'}
            </p>
          </div>
        ) : (
          <div className="rc-list">
            {visible.map(({ row, kind, number, name }) => {
              const meta = KIND_META[kind];
              return (
                <div key={`${row.id}-${row.start_stamp}`} className="rc-row">
                  <span className={`rc-dir is-${meta.tone}`} aria-hidden="true">
                    <Ic n={meta.icon} size={13} />
                  </span>
                  <span className="rc-id">
                    <span className="rc-name" title={name}>
                      {name}
                    </span>
                    <span className="rc-when">
                      {row.start_stamp ? dayTimeText(row.start_stamp, timeZone) : '—'}
                    </span>
                  </span>
                  <span className="rc-num num" title={number}>
                    {number || '—'}
                  </span>
                  <span className={`rc-kind is-${meta.tone}`}>{meta.chip}</span>
                  <span className="rc-dur num">
                    {row.billsec && row.billsec !== '00:00:00'
                      ? row.billsec.replace(/^00:/, '')
                      : '—'}
                  </span>
                  <button
                    type="button"
                    className="rc-call"
                    disabled={!number || !isRegistered}
                    aria-label={number ? `Call ${name}` : 'No number to call'}
                    title={
                      !number
                        ? 'No number to call back'
                        : !isRegistered
                          ? "Your phone isn't connected yet"
                          : `Call ${number}`
                    }
                    onClick={() => number && isRegistered && dial(number)}
                  >
                    <Ic n="phone" size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecentCalls;
