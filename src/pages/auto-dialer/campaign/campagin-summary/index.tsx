import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Ic, McmIconSprite } from '@/components/mcm/icons';
import { campaignAnalytics, getCampaignDetail, playPauseCampaign } from '@/services/api';
import { capitalizeFirstLetter, convertDateFormateApis } from '@/lib/utils';
import { useCompanyFeatures } from '@/hooks/rbac';
import {
  BreakdownRow,
  DIAL_METHOD_LABEL,
  OutcomeDonut,
  OutcomeLegend,
  StatusPill,
  fmt,
  num,
  pct,
  readOutcomes,
} from '../campaign-ui';
import { RETRY_PERIOD_TYPE } from '../add-edit-campaign/consts';
import '@/components/mcm/mcm-page.css';
import '../campaign.css';

/**
 * MCM Unified Console — campaign monitor.
 *
 * The artifact's monitor answers two questions: how far through the list are
 * we, and what is the campaign actually configured to do. Both are answerable
 * from endpoints that exist — `campaignAnalytics` for the outcomes,
 * `getCampaignDetail` for the configuration.
 *
 * The artifact's third question — how is it pacing right now (abandon against
 * the compliance cap, idle and effective-idle agents, outbound lines,
 * adjusted calls per agent) — has no endpoint behind it. Rather than draw a
 * gauge over a number nobody computes, the pacing panel says what is missing.
 */

const RETRY_UNIT_LABEL: Record<string, string> = {
  [RETRY_PERIOD_TYPE.MIN]: 'minutes',
  [RETRY_PERIOD_TYPE.HOUR]: 'hours',
  [RETRY_PERIOD_TYPE.DAY]: 'days',
};

type TabId = 'overview' | 'agents' | 'config';

const CampaignRecord = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const campaignAccess = features?.plan_features?.campaign?.action;

  const { campaignDetails, campaignId } = (state || {}) as any;
  const resolvedCampaignId = campaignId || campaignDetails?._id;

  const [tab, setTab] = useState<TabId>('overview');
  const [analytics, setAnalytics] = useState<any>(campaignDetails?.campaignAnalytics || {});

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['campaignDetail', resolvedCampaignId],
    queryFn: () => getCampaignDetail({ campaignId: resolvedCampaignId }),
    select: (data: any) => data?.data?.data?.result,
    enabled: Boolean(resolvedCampaignId),
    refetchOnWindowFocus: false,
  });

  const campaign = detail || campaignDetails || {};

  const { mutate: refreshAnalytics, isPending: isRefreshing } = useMutation({
    mutationFn: campaignAnalytics,
    onSuccess: (response: any) => {
      const next = response?.data?.data?.result;
      if (next) setAnalytics(next);
    },
  });

  const { mutate: mutateStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: playPauseCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignDetail', resolvedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ['getCampaignListForPreview'] });
      queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
    },
  });

  const outcomes = useMemo(() => readOutcomes(analytics), [analytics]);
  const { assigned, answered, noAnswer, dnc, pending, dialed } = outcomes;

  const members: any[] = useMemo(() => {
    const raw = campaign?.members;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
      if (!Array.isArray(parsed)) return [];
      return Array.from(new Map(parsed.map((m: any) => [m?.user_uuid || m?.uuid, m])).values());
    } catch {
      return [];
    }
  }, [campaign?.members]);

  const dispositions: any[] = Array.isArray(campaign?.agentDisposition)
    ? campaign.agentDisposition
    : [];
  const callerIds: string[] = Array.isArray(campaign?.callerId) ? campaign.callerId : [];
  const dialer = campaign?.dialerSetting || {};
  const isRunning = String(campaign?.campaignStatus).toUpperCase() === 'PROCESSING';
  const mode = DIAL_METHOD_LABEL[campaign?.dialMethod];

  const KPI_CARDS = [
    {
      key: 'assigned',
      label: 'Leads assigned',
      value: fmt(assigned),
      sub: `${fmt(pending)} still callable`,
    },
    {
      key: 'dialed',
      label: 'Dialled',
      value: fmt(dialed),
      sub: `${pct(dialed, assigned)}% of assigned`,
    },
    {
      key: 'answered',
      label: 'Answered',
      value: `${pct(answered, dialed)}%`,
      sub: `${fmt(answered)} connects`,
      tone: 'good' as const,
    },
    { key: 'noanswer', label: 'No answer', value: `${pct(noAnswer, dialed)}%`, sub: fmt(noAnswer) },
    {
      key: 'dnc',
      label: 'DNC / blocked',
      value: `${pct(dnc, dialed)}%`,
      sub: fmt(dnc),
      tone: dnc > 0 ? ('warnv' as const) : undefined,
    },
    {
      key: 'agents',
      label: 'Agents assigned',
      value: String(members.length),
      sub: members.length ? 'on this campaign' : 'unassigned',
    },
  ];

  const TABS: Array<[TabId, string, any, number | null]> = [
    ['overview', 'Overview', 'chart', null],
    ['agents', 'Agents', 'users', members.length],
    ['config', 'Configuration', 'sliders', null],
  ];

  return (
    <div className="mcm-page cmp">
      <McmIconSprite />
      <div className="page">
        <div className="page-head">
          <div>
            <div className="cmp-title-row">
              <button
                type="button"
                className="cmp-back-btn"
                onClick={() => navigate(-1)}
                aria-label="Back to campaigns"
              >
                <Ic n="chev" size={14} />
              </button>
              <div className="eyebrow">Campaign</div>
            </div>
            <h1>{capitalizeFirstLetter(campaign?.name) || 'Campaign'}</h1>
            <p>
              {mode ? <span className="tag neu">{mode}</span> : null}{' '}
              {campaign?.startDate
                ? `${convertDateFormateApis(campaign?.startDate, 'DD MMM YYYY')} – ${convertDateFormateApis(campaign?.endDate, 'DD MMM YYYY')}`
                : 'No campaign window set'}
              {campaign?.description ? ` · ${campaign.description}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusPill status={campaign?.campaignStatus} />
            {campaignAccess?.pause && (
              <button
                type="button"
                className="btn ghost sm"
                disabled={isTogglingStatus}
                onClick={() =>
                  mutateStatus({
                    campaignId: resolvedCampaignId,
                    campaignStatus: isRunning ? 'PAUSE' : 'PROCESSING',
                  })
                }
              >
                <Ic n={isRunning ? 'pause' : 'play'} size={13} />
                {isRunning ? 'Pause' : 'Start'}
              </button>
            )}
            <button
              type="button"
              className="btn ghost sm"
              disabled={isRefreshing || !resolvedCampaignId}
              onClick={() =>
                resolvedCampaignId && refreshAnalytics({ campaignId: resolvedCampaignId })
              }
            >
              <Ic n="refresh" size={13} className={isRefreshing ? 'pulsing' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="kpis">
          {KPI_CARDS.map((kpi) => (
            <div className="kpi" key={kpi.key}>
              <div className="k">{kpi.label}</div>
              <div className={`v num${kpi.tone ? ` ${kpi.tone}` : ''}`}>{kpi.value}</div>
              <div className="d">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="ptabstrip">
          {TABS.map(([id, label, icon, count]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              <Ic n={icon} size={15} />
              {label}
              {count ? <span className="cnt num">{count}</span> : null}
            </button>
          ))}
        </div>

        {/* ── overview ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid2">
            <div className="panel-card">
              <div className="pc-head">
                <h3>Contact outcomes</h3>
                <span className="src pc-right">
                  {isRefreshing ? 'refreshing…' : 'refreshed on demand'}
                </span>
              </div>
              <div
                className="pc-body"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                {assigned ? (
                  <>
                    <OutcomeDonut analytics={analytics} />
                    <div style={{ textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 800 }}>
                        {fmt(dialed)}{' '}
                        <span style={{ color: 'var(--ink-4)', fontWeight: 600 }}>
                          of {fmt(assigned)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                        {fmt(pending)} records still callable
                      </div>
                    </div>
                    <div style={{ width: '100%' }}>
                      <BreakdownRow
                        label="Answered"
                        value={answered}
                        total={assigned}
                        colour="var(--live)"
                      />
                      <BreakdownRow
                        label="No answer"
                        value={noAnswer}
                        total={assigned}
                        colour="var(--warn)"
                      />
                      <BreakdownRow
                        label="DNC / blocked"
                        value={dnc}
                        total={assigned}
                        colour="var(--crit)"
                      />
                      <BreakdownRow
                        label="Pending"
                        value={pending}
                        total={assigned}
                        colour="var(--surface-3)"
                      />
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    <Ic n="mega" />
                    <b>Nothing dialled yet</b>
                    <p>
                      This campaign has no lead outcomes to show. Once it starts dialling, the
                      breakdown appears here.
                    </p>
                  </div>
                )}
              </div>
              <div className="pc-foot">
                <OutcomeLegend />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="panel-card">
                <div className="pc-head">
                  <h3>Dialling policy</h3>
                </div>
                <div className="pc-body tight">
                  <div className="kv">
                    <span className="k">Max attempts per record</span>
                    <span className="v num">{num(dialer?.max_attempt_per_record) || '—'}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Retry period</span>
                    <span className="v num">
                      {dialer?.default_retry_period
                        ? `${dialer.default_retry_period} ${RETRY_UNIT_LABEL[dialer?.default_retry_period_type] || ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Wrap-up time</span>
                    <span className="v num">
                      {dialer?.wrapup_time ? `${dialer.wrapup_time}s` : '—'}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Max ring time</span>
                    <span className="v num">
                      {dialer?.max_ring_time ? `${dialer.max_ring_time}s` : '—'}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Answering machine detection</span>
                    <span className="v">
                      {dialer?.answering_detection_machine?.enabled ||
                      dialer?.answering_detection_machine?.enable ? (
                        <span className="tag pos">on</span>
                      ) : (
                        <span className="tag neu">off</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="aicard warnc">
                <div className="ac-head">
                  <span className="ac-kind">
                    <Ic n="alert" size={12} />
                    Pacing is not measured yet
                  </span>
                </div>
                <div className="ac-body">
                  The design shows abandon rate against a compliance cap, idle and effective-idle
                  agents, outbound line allocation and adjusted calls per agent. No endpoint returns
                  those today — <strong>campaignAnalytics</strong> only carries lead outcomes. They
                  need a live campaign stats service before this panel can be filled.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── agents ───────────────────────────────────────────────── */}
        {tab === 'agents' && (
          <div className="panel-card">
            <div className="pc-head">
              <h3>Agents on this campaign</h3>
              <span className="tag neu num">{members.length}</span>
            </div>
            {members.length ? (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th style={{ width: 140 }}>Extension</th>
                      <th style={{ width: 180 }}>Role</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member: any, index: number) => {
                      const name =
                        member?.label ||
                        `${member?.first_name || ''} ${member?.last_name || ''}`.trim() ||
                        'Unknown';
                      return (
                        <tr key={member?.user_uuid || index}>
                          <td>
                            <strong>{name}</strong>
                          </td>
                          <td className="num">{member?.extension || '—'}</td>
                          <td>{member?.role ? capitalizeFirstLetter(member.role) : '—'}</td>
                          <td style={{ color: 'var(--ink-3)' }}>{member?.email || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Ic n="users" />
                <b>No agents assigned</b>
                <p>Edit the campaign to add members before it can dial.</p>
              </div>
            )}
            <div className="pc-foot">
              Live agent state — on call, wrapping up, idle — needs the same campaign stats service
              the pacing panel is waiting on.
            </div>
          </div>
        )}

        {/* ── configuration ────────────────────────────────────────── */}
        {tab === 'config' && (
          <div className="grid2">
            <div className="panel-card">
              <div className="pc-head">
                <h3>Targeting</h3>
              </div>
              <div className="pc-body tight">
                <div className="kv">
                  <span className="k">Dialing mode</span>
                  <span className="v">{mode || '—'}</span>
                </div>
                <div className="kv">
                  <span className="k">Lead groups</span>
                  <span className="v num">
                    {Array.isArray(campaign?.groupId) ? campaign.groupId.length : 0}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Caller IDs</span>
                  <span className="v num">{callerIds.length}</span>
                </div>
                <div className="kv">
                  <span className="k">Agent scripting</span>
                  <span className="v">
                    {campaign?.agentScripting ? (
                      <span className="tag pos">on</span>
                    ) : (
                      <span className="tag neu">off</span>
                    )}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Agents may skip records</span>
                  <span className="v">
                    {campaign?.allowSkipping ? (
                      <span className="tag pos">yes</span>
                    ) : (
                      <span className="tag neu">no</span>
                    )}
                  </span>
                </div>
              </div>
              {callerIds.length ? (
                <div className="pc-foot">
                  {callerIds.slice(0, 6).map((did) => (
                    <span className="tag acc num" key={did}>
                      {String(did).startsWith('+') ? did : `+${did}`}
                    </span>
                  ))}
                  {callerIds.length > 6 ? (
                    <span className="src">+{callerIds.length - 6} more</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="panel-card">
              <div className="pc-head">
                <h3>Dispositions</h3>
                <span className="tag neu num">{dispositions.length}</span>
              </div>
              {dispositions.length ? (
                <div className="pc-body tight">
                  {dispositions.map((item: any, index: number) => (
                    <div className="kv" key={item?._id || index}>
                      <span className="k">
                        {item?.disposition?.name || item?.name || 'Unnamed'}
                      </span>
                      <span className="v" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>
                        {item?.disposition?.description || ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Ic n="list" />
                  <b>No dispositions configured</b>
                  <p>Agents need at least one outcome code before the campaign can run.</p>
                </div>
              )}
              <div className="pc-foot">
                Per-disposition counts need a disposition report keyed by campaign.
              </div>
            </div>
          </div>
        )}

        {isLoadingDetail && !detail ? (
          <div className="src" style={{ marginTop: 12 }}>
            Loading campaign configuration…
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CampaignRecord;
