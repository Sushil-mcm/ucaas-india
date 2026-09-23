import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { useLiveContactCentre } from '@/hooks/use-live-contact-centre';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import buildQueueRows from '@/pages/performance/queue-rows';
import buildAgentRows from '@/pages/performance/agent-rows';
import { formatSecsToClock } from '@/pages/performance/format';
import DataFreshness from '@/pages/performance/data-freshness';
import { Ic, McmIconSprite } from '@/components/mcm/icons';
import './console.css';

/**
 * Operations console — the approved mockup, built as its own page.
 *
 * Deliberately does NOT import components/mcm/mcm-page.css. That stylesheet
 * is 9,930 lines read by 33 screens; on Home it governs roughly everything a
 * redesign would want to change, so restyling Home a rule at a time could
 * only ever produce "the old page with new details". This route owns its own
 * design system in console.css and inherits nothing, which is the only way
 * the mockup can actually look like the mockup.
 *
 * Every figure shown is real, and every figure the platform cannot yet
 * report is marked pending rather than estimated. The feeds carry no MOS,
 * jitter, SIP latency, packet loss or trunk capacity (see
 * copilot-adapter.ts, which already stubs the first three as 'n/a'), so
 * those slots render at full size with an "awaiting feed" marker: the
 * layout is final, the backend gap is visible, and nothing on screen is
 * invented. Wiring them later is a value swap, not a redesign.
 *
 * Fields this page is waiting on, for whoever adds them:
 *   per call     — mos (1.0-5.0), jitter_ms, packet_loss_pct, sentiment
 *   per platform — sip_latency_ms, licensed_channels, channels_in_use
 *   historical   — a per-day aggregate endpoint, for "vs yesterday"
 */

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '—';

/* A slot the design calls for and the platform cannot yet fill. Rendered as
   the reading it will become — label, unit, the space it will occupy — with
   the value marked pending rather than guessed. This is how the console
   already handles MOS and jitter on the dialer (copilot-adapter.ts), and it
   keeps the gap visible to whoever wires the feed instead of hiding it. */
const Pending = ({ hint }: { hint: string }) => (
  <span className="ops-pending" title={`Awaiting feed: ${hint}`}>
    —<i>awaiting feed</i>
  </span>
);

const Console = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const today = useMemo(() => handleDate('Today'), []);
  const live = useLiveContactCentre(today);

  const {
    queues,
    agentRows,
    activeQueueCalls,
    usersOnlineStatus,
    waitingCalls,
    interactingCalls,
    longestWaitSecs,
    serviceLevel,
    totals,
    abandonRate,
    avgHandleTime,
    onlineAgentsCount,
    liveSlaByName,
    lastUpdatedAt,
    hasSourceError,
    failedSources,
    retryFailedSources,
  } = live;

  const firstName = String(user?.user_info?.first_name || '').trim();

  const queueRows = useMemo(
    () =>
      buildQueueRows({
        queues,
        activeQueueCalls,
        queueStatsByUuid: live.queueStatsByUuid,
        liveSlaByName,
        liveQueueStatsByName: live.liveQueueStatsByName,
        cdrByQueueUuid: live.cdrByQueueUuid,
      }).sort((a, b) => b.waiting - a.waiting || a.name.localeCompare(b.name)),
    [live, queues, activeQueueCalls, liveSlaByName],
  );

  const liveAgents = useMemo(
    () => buildAgentRows({ agentRows, queues, usersOnlineStatus, activeQueueCalls }),
    [agentRows, queues, usersOnlineStatus, activeQueueCalls],
  );

  /* The verdict is derived from the same figures the cards below render, so
     the sentence cannot disagree with the instruments under it. */
  const breaching = queueRows.filter(
    (row) => row.sla !== null && row.slaTargetPct !== null && row.sla < (row.slaTargetPct ?? 80),
  );
  const longHold = longestWaitSecs > 120 && waitingCalls.length > 0;
  const problems = [
    breaching.length ? `${breaching.length} queue${breaching.length === 1 ? '' : 's'} below target` : null,
    longHold ? 'a caller past the 2-minute mark' : null,
    waitingCalls.length > 7 ? 'a queue backing up' : null,
  ].filter(Boolean) as string[];

  const staffed = liveAgents.length;
  const onCall = liveAgents.filter((agent) => agent.isOnCall).length;

  /* Four cards, as the mockup has. Each is a figure the feeds actually
     return — no MOS, no AI-deflection rate, no "vs yesterday". */
  const cards = [
    {
      key: 'inflight',
      icon: 'trend' as const,
      label: 'Active in flight',
      name: 'Calls connected now',
      value: String(interactingCalls.length),
      foot: `${waitingCalls.length} waiting · ${queues.length} queue${queues.length === 1 ? '' : 's'}`,
      tone: waitingCalls.length > 7 ? 'crit' : waitingCalls.length > 4 ? 'warn' : 'ok',
      pill: waitingCalls.length ? `${waitingCalls.length} in queue` : 'Nobody waiting',
    },
    {
      key: 'sla',
      icon: 'target' as const,
      label: 'Service level',
      name: serviceLevel.targetText || 'Answered within target',
      value: serviceLevel.percent === null ? '—' : `${Math.round(serviceLevel.percent)}%`,
      foot:
        serviceLevel.percent === null
          ? 'no calls yet today'
          : `goal ${serviceLevel.targetPercent ?? 80}%`,
      tone:
        serviceLevel.percent === null
          ? 'mute'
          : serviceLevel.percent >= (serviceLevel.targetPercent ?? 80)
            ? 'ok'
            : 'crit',
      pill:
        serviceLevel.percent === null
          ? 'No data'
          : serviceLevel.percent >= (serviceLevel.targetPercent ?? 80)
            ? 'Compliant'
            : 'Below goal',
      meter: serviceLevel.percent === null ? null : Math.round(serviceLevel.percent),
      goal: serviceLevel.targetPercent ?? 80,
    },
    {
      key: 'aht',
      icon: 'bolt' as const,
      label: 'Handle time',
      name: 'Talk, hold and wrap-up per call',
      value: avgHandleTime === null ? '—' : formatSecsToClock(avgHandleTime),
      foot: 'across completed calls today',
      tone: 'mute',
      pill: avgHandleTime === null ? 'No data' : 'Today',
    },
    {
      key: 'answered',
      icon: 'phone' as const,
      label: 'Answered today',
      name: 'Calls answered across all queues',
      value: String(totals.answered ?? 0),
      foot:
        abandonRate === null
          ? 'no calls in range'
          : `${Math.round(abandonRate)}% abandoned before answer`,
      tone: abandonRate !== null && abandonRate > 5 ? 'warn' : 'ok',
      pill: `${onlineAgentsCount} of ${staffed} on queue`,
    },
  ];

  return (
    <div className="ops">
      <McmIconSprite />

      {/* ── masthead ─────────────────────────────────────────────────── */}
      <header className="ops-mast">
        <div className="ops-mast-l">
          <div className="ops-eyebrow">Contact centre</div>
          <h1>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <div className="ops-mast-meta">
            <span className="ops-chip">
              <span className={`ops-dot ${problems.length ? 'crit' : 'ok'}`} />
              {problems.length ? 'Attention needed' : 'All queues operational'}
            </span>
            <DataFreshness updatedAt={lastUpdatedAt} />
          </div>
        </div>
        <div className="ops-mast-r">
          <button type="button" className="ops-btn" onClick={() => navigate('/performance')}>
            <Ic n="trend" size={15} />
            Performance
          </button>
          <button type="button" className="ops-btn primary" onClick={() => navigate('/phone')}>
            <Ic n="phone" size={15} />
            New call
          </button>
        </div>
      </header>

      {/* A failed feed defaults every query to an empty list, which renders as
          a calm floor. Naming what could not be read is the difference between
          "nobody is waiting" and "we cannot tell you". */}
      {hasSourceError ? (
        <div className="ops-alarm" role="alert">
          <Ic n="alert" size={17} />
          <div>
            <b>Some figures below could not be read</b>
            <span>
              {failedSources.length} of 5 sources failed ({failedSources.join(', ')}). The panels
              they feed show the last value received.
            </span>
          </div>
          <button type="button" className="ops-btn sm" onClick={retryFailedSources}>
            Try again
          </button>
        </div>
      ) : null}

      {/* ── telemetry strip: platform readings that actually exist ────── */}
      <div className="ops-strip">
        <div className="ops-strip-cell">
          <span className="k">Queues</span>
          <span className="v num">{queues.length}</span>
          <span className="t">{queueRows.filter((r) => r.waiting > 0).length} with callers waiting</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">On queue</span>
          <span className="v num">{onlineAgentsCount}</span>
          <span className="t">of {staffed} on the roster</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">On a call</span>
          <span className="v num">{onCall}</span>
          <span className="t">{Math.max(0, onlineAgentsCount - onCall)} idle on queue</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">Longest wait</span>
          <span className="v num">
            {waitingCalls.length ? formatSecsToClock(longestWaitSecs) : '—'}
          </span>
          <span className="t">{waitingCalls.length ? 'target 2:00' : 'no one waiting'}</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">Callbacks due</span>
          <span className="v num">{live.callbacksWaitingCount ?? 0}</span>
          <span className="t">queued for a return call</span>
        </div>
      </div>

      {/* ── call quality ─────────────────────────────────────────────────
          The mockup's telemetry row. These four are WebRTC/SBC readings the
          platform does not publish yet, so each slot shows what it will carry
          and marks itself pending. Nothing here is estimated. ─────────── */}
      <div className="ops-strip is-pending">
        <div className="ops-strip-cell">
          <span className="k">Avg MOS</span>
          <span className="v"><Pending hint="mean opinion score, per call and rolled up per queue" /></span>
          <span className="t">voice quality score, 1.0–5.0</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">Jitter</span>
          <span className="v"><Pending hint="RTP jitter in ms from WebRTC stats" /></span>
          <span className="t">buffer trips around 30 ms</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">SIP latency</span>
          <span className="v"><Pending hint="signalling round-trip in ms" /></span>
          <span className="t">round trip to the SBC</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">Packet loss</span>
          <span className="v"><Pending hint="percentage of RTP packets lost" /></span>
          <span className="t">share of RTP packets dropped</span>
        </div>
        <div className="ops-strip-cell">
          <span className="k">Trunk headroom</span>
          <span className="v"><Pending hint="licensed concurrent channels and current usage" /></span>
          <span className="t">free concurrent channels</span>
        </div>
      </div>

      {/* ── verdict ──────────────────────────────────────────────────── */}
      <section className={`ops-verdict${problems.length ? '' : ' is-calm'}`}>
        <span className="ops-verdict-mark">
          <Ic n={problems.length ? 'alert' : 'check'} size={19} />
        </span>
        <div>
          <p className="ops-verdict-t">
            {problems.length
              ? `${problems.length} thing${problems.length === 1 ? '' : 's'} need${
                  problems.length === 1 ? 's' : ''
                } you.`
              : 'Everything is inside target.'}
          </p>
          <p className="ops-verdict-d">
            {problems.length
              ? problems.join(' · ')
              : `${queues.length} queue${queues.length === 1 ? '' : 's'} active, ${
                  waitingCalls.length === 0 ? 'nobody waiting' : `${waitingCalls.length} waiting`
                }, ${onlineAgentsCount} of ${staffed} agents on queue.`}
          </p>
        </div>
      </section>

      {/* ── four cards ───────────────────────────────────────────────── */}
      <div className="ops-cards">
        {cards.map((card) => (
          <article key={card.key} className={`ops-card tone-${card.tone}`}>
            <div className="ops-card-top">
              <span className="ops-card-ic">
                <Ic n={card.icon} size={17} />
              </span>
              <div className="ops-card-titles">
                <span className="ops-card-k">{card.label}</span>
                <span className="ops-card-n">{card.name}</span>
              </div>
              <span className={`ops-pill ${card.tone}`}>{card.pill}</span>
            </div>
            <div className="ops-card-v num">{card.value}</div>
            {'meter' in card && card.meter !== null && card.meter !== undefined ? (
              <div className="ops-meter">
                <span className="ops-meter-fill" style={{ width: `${card.meter}%` }} />
                <span className="ops-meter-goal" style={{ left: `${card.goal}%` }} />
              </div>
            ) : null}
            <div className="ops-card-foot">{card.foot}</div>
          </article>
        ))}
      </div>

      {/* ── queues ───────────────────────────────────────────────────── */}
      <section className="ops-panel">
        <div className="ops-panel-head">
          <h2>Queues</h2>
          <span className="sub">Waiting and staffing are live · service level covers today</span>
          <button type="button" className="ops-btn sm" onClick={() => navigate('/performance')}>
            All queues
          </button>
        </div>
        <div className="ops-tbl-wrap">
          <table className="ops-tbl">
            <thead>
              <tr>
                <th>Queue</th>
                <th className="num">Waiting</th>
                <th className="num">On call</th>
                <th className="num">Staffed</th>
                <th>Service level</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.length ? (
                queueRows.slice(0, 8).map((row) => {
                  const goal = row.slaTargetPct ?? 80;
                  const miss = row.sla !== null && row.sla < goal;
                  return (
                    <tr key={row.uuid}>
                      <td>
                        <span className="ops-qname">
                          <span
                            className={`ops-dot ${
                              row.sla === null ? 'off' : miss ? 'crit' : 'ok'
                            }`}
                          />
                          {row.name}
                        </span>
                      </td>
                      <td className="num">{row.waiting}</td>
                      <td className="num">{row.interacting}</td>
                      <td className="num">
                        {row.available} / {row.membersCount}
                      </td>
                      <td>
                        {row.sla === null ? (
                          <span className="ops-muted">No calls yet today</span>
                        ) : (
                          <span className="ops-sla">
                            <span className={`ops-sla-track${miss ? ' is-miss' : ''}`}>
                              <span
                                className="ops-sla-fill"
                                style={{ width: `${Math.max(0, Math.min(100, row.sla))}%` }}
                              />
                              <span className="ops-sla-goal" style={{ left: `${goal}%` }} />
                            </span>
                            <b className="num">{Math.round(row.sla)}%</b>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="ops-empty">
                    No queues are configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {queueRows.length > 8 ? (
          <div className="ops-more">{queueRows.length - 8} more queues on Performance.</div>
        ) : null}
      </section>

      {/* ── live supervision ─────────────────────────────────────────── */}
      <section className="ops-panel">
        <div className="ops-panel-head">
          <h2>Live calls</h2>
          <span className="sub">
            {interactingCalls.length
              ? `${interactingCalls.length} connected now`
              : 'nothing on the wire right now'}
          </span>
          <button type="button" className="ops-btn sm" onClick={() => navigate('/monitoring')}>
            Monitoring
          </button>
        </div>
        {interactingCalls.length ? (
          <div className="ops-calls">
            {interactingCalls.slice(0, 4).map((call: any, index: number) => (
              <div key={call?.uuid || call?.call_uuid || index} className="ops-call">
                <span className="ops-av">{initials(String(call?.agent_name || call?.name || '—'))}</span>
                <div className="ops-person-b">
                  <span className="ops-person-n">
                    {call?.agent_name || call?.name || 'Connected call'}
                  </span>
                  <span className="ops-person-e">
                    {call?.queue_name ? `${call.queue_name} · ` : ''}
                    {call?.caller_id_number || call?.destination || ''}
                  </span>
                </div>
                <span className="ops-call-q">
                  <Pending hint="per-call MOS and live sentiment" />
                </span>
                <button type="button" className="ops-btn sm" onClick={() => navigate('/monitoring')}>
                  Listen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="ops-empty">
            Nothing on the wire right now. Connected calls appear here as they start.
          </div>
        )}
      </section>

      {/* ── floor ────────────────────────────────────────────────────── */}
      <section className="ops-panel">
        <div className="ops-panel-head">
          <h2>Floor</h2>
          <span className="sub">
            {onlineAgentsCount} of {staffed} on queue
          </span>
          <button type="button" className="ops-btn sm" onClick={() => navigate('/directory')}>
            Directory
          </button>
        </div>
        <div className="ops-roster">
          {liveAgents.length ? (
            liveAgents
              .slice(0, 8)
              .map((agent) => (
                <div key={agent.uuid || agent.extension} className="ops-person">
                  <span className="ops-av">{initials(agent.name)}</span>
                  <div className="ops-person-b">
                    <span className="ops-person-n">{agent.name}</span>
                    <span className="ops-person-e">
                      Ext. {agent.extension || '—'}
                      {agent.queueOrCampaign ? ` · ${agent.queueOrCampaign}` : ''}
                    </span>
                  </div>
                  <span
                    className={`ops-state ${
                      agent.isOnCall ? 'busy' : agent.isOnline ? 'free' : 'away'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
              ))
          ) : (
            <div className="ops-empty">Nobody is on the roster yet.</div>
          )}
        </div>
      </section>

      <p className="ops-note">
        Every figure on this page is live. Readings the platform does not report — call quality,
        jitter, day-over-day comparisons — are absent rather than estimated.
      </p>
    </div>
  );
};

export default Console;
