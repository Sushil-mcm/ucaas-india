import { useState } from 'react';
import moment from 'moment';

import { Ic } from '@/components/mcm/icons';
import { BreakdownRow, fmt, num, pct } from './campaign-ui';
import {
  CampaignHistory,
  CampaignLeadStates,
  hhmm,
  rate,
  useAgentCallReport,
  useCampaignLeads,
  useDispositionMix,
} from './campaign-report-data';

/**
 * The panels the campaign monitor shows when it is reporting rather than
 * watching: the call log for the window, the lead list by outcome, the
 * disposition mix, and per-agent call figures.
 *
 * They are separate from the page so the Live tab can use the same panels
 * when the dialer engine is not holding the campaign - which is most of the
 * time, and used to leave that tab with nothing on it at all.
 */

/** billSec/duration arrive as seconds or as "HH:MM:SS" depending on who wrote the row. */
export const seconds = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  if (text.includes(':')) {
    const parts = text.split(':').map((part) => Number(part) || 0);
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
};

const SYSTEM_DISPOSITION_TONE: Record<string, string> = {
  ANSWERED: 'pos',
  COMPLETED: 'pos',
  ABANDONED: 'crit',
  FAILED: 'crit',
  NO_ANSWER: 'neu',
  BUSY: 'neu',
  USER_BUSY: 'neu',
  CANCEL: 'neu',
  MACHINE: 'warn',
  ANSWERING_MACHINE: 'warn',
  VOICEMAIL_LEFT: 'warn',
};

const prettify = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

/* ── the call log for the window ──────────────────────────────────────── */

export const CampaignWindowSummary = ({
  history,
  isLoading,
  cap,
}: {
  history?: CampaignHistory | null;
  isLoading: boolean;
  cap: number;
}) => {
  const totals = history?.totals;
  const window = history?.window;
  const calls = num(totals?.calls);
  const answered = num(totals?.answered);
  const abandoned = num(totals?.abandoned);
  const live = num(totals?.answeredLive);
  const talk = num(totals?.talkSeconds);
  const abandonPct = num(totals?.abandonRatePercent);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Calls placed</h3>
        <span className="src pc-right">
          {window ? `${window.from} to ${window.to} · ${window.timezone}` : 'the campaign call log'}
        </span>
      </div>
      {isLoading && !history ? (
        <div className="pc-body">
          <div className="src">Reading the call log…</div>
        </div>
      ) : calls ? (
        <>
          <div className="pc-body tight">
            <div className="kv">
              <span className="k">Calls placed</span>
              <span className="v num">{fmt(calls)}</span>
            </div>
            <div className="kv">
              <span className="k">Answered by a person</span>
              <span className="v num pos">
                {fmt(answered)} <span className="src">({rate(answered, calls)}%)</span>
              </span>
            </div>
            <div className="kv">
              <span className="k">Abandoned before an agent</span>
              <span className={`v num${abandoned ? ' warnv' : ''}`}>{fmt(abandoned)}</span>
            </div>
            <div className="kv">
              <span className="k">Abandon rate against the {cap}% cap</span>
              <span className={`v num${abandonPct > cap ? ' warnv' : ''}`}>
                {abandonPct.toFixed(1)}%{' '}
                <span className="src">of {fmt(live)} live answers</span>
              </span>
            </div>
            <div className="kv">
              <span className="k">Answering machine</span>
              <span className="v num">{fmt(totals?.machine)}</span>
            </div>
            <div className="kv">
              <span className="k">Busy</span>
              <span className="v num">{fmt(totals?.busy)}</span>
            </div>
            <div className="kv">
              <span className="k">No answer</span>
              <span className="v num">{fmt(totals?.noAnswer)}</span>
            </div>
            <div className="kv">
              <span className="k">Callbacks</span>
              <span className="v num">{fmt(totals?.callbacks)}</span>
            </div>
            <div className="kv">
              <span className="k">Talk time</span>
              <span className="v num">{hhmm(talk)}</span>
            </div>
            <div className="kv">
              <span className="k">Average talk per answered call</span>
              <span className="v num">{answered ? hhmm(talk / answered) : '—'}</span>
            </div>
          </div>
          {history && history.daysOverCap > 0 ? (
            <div className="pc-foot">
              <span className="tag crit">
                {history.daysOverCap} day{history.daysOverCap === 1 ? '' : 's'} over the abandon cap
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty">
          <Ic n="phone" />
          <b>No calls in this window</b>
          <p>
            Every call this campaign places is written to the call log; the totals appear here as
            soon as the first one ends.
          </p>
        </div>
      )}
    </div>
  );
};

/* ── day by day ───────────────────────────────────────────────────────── */

export const CampaignDailyTable = ({
  history,
  cap,
}: {
  history?: CampaignHistory | null;
  cap: number;
}) => {
  const rows = (history?.byDay || []).slice(0, 31);
  const busiest = rows.reduce((most, row) => Math.max(most, num(row.calls)), 0);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Day by day</h3>
        <span className="src pc-right">{rows.length ? `${rows.length} days` : ''}</span>
      </div>
      {rows.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 96 }}>Day</th>
                <th style={{ width: 120 }}>Calls</th>
                <th style={{ width: 90 }}>Answered</th>
                <th style={{ width: 90 }}>Connect</th>
                <th style={{ width: 90 }}>Abandon</th>
                <th style={{ width: 90 }}>Talk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.day}`}>
                  <td className="num">{moment(row.day).format('DD MMM')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="hbar-t" style={{ flex: 1 }}>
                        <i
                          style={{
                            width: `${pct(num(row.calls), busiest)}%`,
                            background: 'var(--accent)',
                          }}
                        />
                      </span>
                      <span className="num" style={{ minWidth: 28, textAlign: 'right' }}>
                        {fmt(row.calls)}
                      </span>
                    </div>
                  </td>
                  <td className="num">{fmt(row.answered)}</td>
                  <td className="num">{rate(num(row.answered), num(row.calls))}%</td>
                  <td className={`num${row.overCap ? ' warnv' : ''}`}>
                    {num(row.abandonRatePercent).toFixed(1)}%
                  </td>
                  <td className="num">{hhmm(num(row.talkSeconds))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Ic n="chart" />
          <b>No days with calls yet</b>
          <p>Each day the campaign dials becomes a row here, with its own abandon rate.</p>
        </div>
      )}
      <div className="pc-foot">
        Abandon rate is abandoned calls over calls a person answered — the measure the {cap}% cap
        applies to.
      </div>
    </div>
  );
};

/* ── per outgoing number ──────────────────────────────────────────────── */

export const CampaignNumberTable = ({ history }: { history?: CampaignHistory | null }) => {
  /* The report is per number PER DAY; a supervisor wants it per number. */
  const merged = new Map<string, { calls: number; answered: number; talkSeconds: number }>();
  for (const row of history?.byNumber || []) {
    const key = String(row.didNumber || 'unknown');
    const current = merged.get(key) || { calls: 0, answered: 0, talkSeconds: 0 };
    merged.set(key, {
      calls: current.calls + num(row.calls),
      answered: current.answered + num(row.answered),
      talkSeconds: current.talkSeconds + num(row.talkSeconds),
    });
  }
  const rows = Array.from(merged.entries())
    .map(([didNumber, values]) => ({ didNumber, ...values }))
    .sort((a, b) => b.calls - a.calls);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Outgoing numbers</h3>
        <span className="src pc-right">{rows.length ? `${rows.length} in use` : ''}</span>
      </div>
      {rows.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th style={{ width: 80 }}>Calls</th>
                <th style={{ width: 90 }}>Answered</th>
                <th style={{ width: 90 }}>Connect</th>
                <th style={{ width: 90 }}>Talk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.didNumber}>
                  <td className="num">
                    {row.didNumber === 'unknown' ? (
                      <span style={{ color: 'var(--ink-4)' }}>not recorded</span>
                    ) : (
                      row.didNumber
                    )}
                  </td>
                  <td className="num">{fmt(row.calls)}</td>
                  <td className="num">{fmt(row.answered)}</td>
                  <td className="num">{rate(row.answered, row.calls)}%</td>
                  <td className="num">{hhmm(row.talkSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Ic n="phone" />
          <b>No outgoing numbers yet</b>
          <p>The caller ID each call went out on is recorded with the call.</p>
        </div>
      )}
    </div>
  );
};

/* ── the lead list itself ─────────────────────────────────────────────── */

const LEAD_FILTERS: Array<[string, string]> = [
  ['', 'All leads'],
  ['DialedCall', 'Dialled'],
  ['connected', 'Answered'],
  ['DialedButNotAnswered', 'Not answered'],
  ['PendingCall', 'Still to call'],
  ['dnc', 'Do not call'],
];

export const CampaignLeadTable = ({ campaignId }: { campaignId: string }) => {
  const [filterKey, setFilterKey] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const { data, isLoading } = useCampaignLeads({ campaignId, filterKey, page, limit });
  const rows: any[] = data?.rows || [];
  const total = num(data?.total);
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Leads</h3>
        <span className="src pc-right">
          {isLoading ? 'loading…' : `${fmt(total)} matching`}
        </span>
      </div>
      <div
        className="pc-body"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 0 }}
      >
        {LEAD_FILTERS.map(([key, label]) => (
          <button
            key={key || 'all'}
            type="button"
            className={`fchip${filterKey === key ? ' on' : ''}`}
            onClick={() => {
              setFilterKey(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th style={{ width: 150 }}>Number</th>
                <th style={{ width: 70 }}>Tries</th>
                <th style={{ width: 130 }}>Outcome</th>
                <th style={{ width: 150 }}>Disposition</th>
                <th style={{ width: 80 }}>Talk</th>
                <th style={{ width: 140 }}>Last call</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => {
                const outcome = String(row?.systemDisposition || '').toUpperCase();
                const talk = seconds(row?.billSec ?? row?.duration);
                return (
                  <tr key={`${row?.contactNumber || index}-${index}`}>
                    <td>
                      <strong>{row?.contactName || 'Unknown'}</strong>
                      {row?.isDnc ? <span className="tag crit">DNC</span> : null}
                    </td>
                    <td className="num">{row?.contactNumber || '—'}</td>
                    <td className="num">{num(row?.totalCallAttempts)}</td>
                    <td>
                      {outcome ? (
                        <span className={`tag ${SYSTEM_DISPOSITION_TONE[outcome] || 'neu'}`}>
                          {prettify(outcome)}
                        </span>
                      ) : (
                        <span className="tag neu">
                          {prettify(row?.requestStatus) || 'Not dialled'}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--ink-3)' }}>
                      {row?.disposition?.disposition || (
                        <span style={{ color: 'var(--ink-4)' }}>—</span>
                      )}
                    </td>
                    <td className="num">{talk ? hhmm(talk) : '—'}</td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>
                      {row?.callEndTime
                        ? moment(row.callEndTime).format('DD MMM HH:mm')
                        : row?.createdAt
                          ? moment(row.createdAt).format('DD MMM HH:mm')
                          : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Ic n="list" />
          <b>{isLoading ? 'Loading leads…' : 'No leads match this filter'}</b>
          <p>Every contact assigned to the campaign is listed here with how its calls went.</p>
        </div>
      )}
      {pages > 1 ? (
        <div className="pc-foot">
          <button
            type="button"
            className="fchip"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span className="src">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="fchip"
            disabled={page >= pages}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
};

/* ── what agents coded the calls as ───────────────────────────────────── */

export const CampaignDispositionMix = ({
  campaignId,
  names,
}: {
  campaignId: string;
  names: string[];
}) => {
  const { rows, isLoading } = useDispositionMix({ campaignId, names });
  const counted = rows.reduce((total, row) => total + row.count, 0);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Disposition mix</h3>
        <span className="src pc-right">
          {isLoading ? 'counting…' : `${fmt(counted)} coded`}
        </span>
      </div>
      {names.length ? (
        <div className="pc-body">
          {rows.map((row) => (
            <BreakdownRow
              key={row.name}
              label={row.name}
              value={row.count}
              total={Math.max(counted, 1)}
              colour="var(--accent)"
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Ic n="list" />
          <b>No dispositions switched on</b>
          <p>Turn dispositions on in the campaign so agents can code how each call went.</p>
        </div>
      )}
      <div className="pc-foot">
        Counted from the leads themselves: one lead, one disposition — the last one an agent set.
      </div>
    </div>
  );
};

/* ── contact list, without the engine ─────────────────────────────────── */

export const CampaignContactBreakdown = ({ states }: { states?: CampaignLeadStates | null }) => {
  const total = num(states?.totalCall);
  const dialed = num(states?.DialedCall);
  const answered = num(states?.connected);
  const notAnswered = num(states?.DialedButNotAnswered);
  const dnc = num(states?.dnc);
  const remaining = Math.max(0, total - dialed - dnc);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Contact list</h3>
        <span className="tag neu num">{pct(dialed + dnc, total)}% done</span>
      </div>
      {total ? (
        <div className="pc-body">
          <div className="bar" style={{ marginBottom: 10 }}>
            <i style={{ width: `${pct(dialed + dnc, total)}%` }} />
          </div>
          <BreakdownRow label="Still to call" value={remaining} total={total} colour="var(--live)" />
          <BreakdownRow label="Answered" value={answered} total={total} colour="var(--live)" />
          <BreakdownRow
            label="Dialled, no answer"
            value={notAnswered}
            total={total}
            colour="var(--warn)"
          />
          <BreakdownRow label="Do not call" value={dnc} total={total} colour="var(--crit)" />
        </div>
      ) : (
        <div className="empty">
          <Ic n="users" />
          <b>No leads assigned</b>
          <p>Assign a lead group to the campaign before it can dial.</p>
        </div>
      )}
      <div className="pc-foot">
        Counted from the leads at the moment this page asked, not from a stored total.
      </div>
    </div>
  );
};

/* ── per agent ────────────────────────────────────────────────────────── */

export const CampaignAgentPerformance = ({
  members,
  from,
  to,
  timezone,
}: {
  members: any[];
  from: string;
  to: string;
  timezone: string;
}) => {
  const extensions = members
    .map((member: any) => String(member?.extension || '').trim())
    .filter(Boolean);
  const { data: rows = [], isLoading } = useAgentCallReport({
    extensions,
    from,
    to,
    timezone,
  });
  /* The gateway answers with one row per person and the call figures nested
     under `stats`; a tenant-api answer carries them flat. Read both, so the
     table stops showing 0 for people who made calls. */
  const byExtension = new Map<string, any>(
    (rows as any[]).map((row: any) => [
      String(row?.extension || row?.stats?.extension || ''),
      row?.stats && typeof row.stats === 'object' ? { ...row, ...row.stats } : row,
    ]),
  );

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Agent call figures</h3>
        <span className="src pc-right">
          {from} to {to}
        </span>
      </div>
      {extensions.length ? (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th style={{ width: 100 }}>Extension</th>
                <th style={{ width: 90 }}>Calls</th>
                <th style={{ width: 100 }}>Outbound</th>
                <th style={{ width: 100 }}>Answered</th>
                <th style={{ width: 110 }}>Talk time</th>
                <th style={{ width: 110 }}>Average call</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any, index: number) => {
                const extension = String(member?.extension || '').trim();
                const row = byExtension.get(extension);
                const calls = num(row?.total_calls);
                const answered = num(row?.answered_calls);
                const talk = num(row?.time_on_calls_raw);
                const name =
                  member?.label ||
                  `${member?.first_name || ''} ${member?.last_name || ''}`.trim() ||
                  'Unknown';
                return (
                  <tr key={member?.user_uuid || extension || index}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td className="num">{extension || '—'}</td>
                    <td className="num">{isLoading && !row ? '…' : fmt(calls)}</td>
                    <td className="num">{isLoading && !row ? '…' : fmt(row?.outgoing_calls)}</td>
                    <td className="num">{isLoading && !row ? '…' : fmt(answered)}</td>
                    <td className="num">{talk ? hhmm(talk) : '—'}</td>
                    <td className="num">{answered ? hhmm(talk / answered) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Ic n="users" />
          <b>No extensions to report on</b>
          <p>Agents need an extension before their calls can be counted.</p>
        </div>
      )}
      <div className="pc-foot">
        These are every call the person handled in the window, on this campaign or any other: the
        call history is kept per extension, and no report groups it by campaign yet.
      </div>
    </div>
  );
};
