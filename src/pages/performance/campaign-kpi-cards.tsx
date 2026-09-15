import { Users, PhoneIncoming, ShieldAlert, BadgeCheck } from 'lucide-react';
import { Sparkline, RingStat, AvatarStack, CountUp } from './campaign-card-primitives';
import { CA_ORANGE_DEEP, CA_GREEN_DEEP, CA_AMBER_DEEP } from './campaign-palette';

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');

/** The "vs average campaign" chip both ring cards share — arrow direction is
 * always "current vs average"; colour is "is that favourable", which flips
 * for a rate where lower is better (no-answer) vs one where higher is
 * (connect). */
const TrendChip = ({
  current,
  average,
  higherIsBetter,
}: {
  current: number | null;
  average: number | null;
  higherIsBetter: boolean;
}) => {
  if (current === null || average === null) return null;
  const diff = Math.round(current) - average;
  if (diff === 0) return null;
  const up = diff > 0;
  const good = higherIsBetter ? up : !up;
  return (
    <span
      className={`ca-kpi-trend ${good ? 'is-good' : 'is-bad'}`}
      title={`${Math.abs(diff)} pts ${up ? 'above' : 'below'} the average campaign's own rate`}
    >
      {up ? '▲' : '▼'} {Math.abs(diff)}
    </span>
  );
};

/**
 * The 8 top-of-tab KPI cards, each with its own visual identity (a
 * sparkline, a progress bar, a ring, an avatar stack…) rather than eight
 * copies of the same label/value/sub tile — the numbers are exactly what
 * campaign-activity-tab.tsx already computes from `campaignAnalytics`,
 * this only changes how each one is drawn.
 *
 * Classes are prefixed `ca-kpi`, not the design system's own `.kpi`
 * (mcm-page.css) — this tab sits inside a `.mcm-page` ancestor (the
 * embedded `<Campaign />` panel below), so a bare `.kpi` here would also
 * pick up that generic tile's background/padding/border rules and fight
 * this file's own.
 */
const CampaignKpiCards = ({
  totalLeads,
  campaignsCount,
  answeredLeads,
  assignedLeads,
  connectRate,
  avgCampaignConnectRate,
  noAnswerRate,
  noAnswerCount,
  avgCampaignNoAnswerRate,
  dncSkips,
  dncPercent,
  membersAssigned,
  membersPerCampaign,
  agentNames,
  activeCampaigns,
  completedCampaigns,
  leadsTrend,
}: {
  totalLeads: number;
  campaignsCount: number;
  answeredLeads: number;
  assignedLeads: number;
  connectRate: number | null;
  avgCampaignConnectRate: number | null;
  noAnswerRate: number | null;
  noAnswerCount: number;
  avgCampaignNoAnswerRate: number | null;
  dncSkips: number;
  dncPercent: number | null;
  membersAssigned: number;
  membersPerCampaign: number | null;
  agentNames: string[];
  activeCampaigns: number;
  completedCampaigns: number;
  leadsTrend: number[];
}) => {
  const answeredShare = assignedLeads ? Math.min(100, Math.round((answeredLeads / assignedLeads) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8 ca-kpi-grid">
      <div className="ca-kpi ca-kpi--spark">
        <div className="ca-kpi-top">
          <span className="ca-kpi-icon">
            <Users size={13} />
          </span>
          <span className="ca-kpi-label">Total leads</span>
        </div>
        <div className="ca-kpi-value">{totalLeads.toLocaleString('en-US')}</div>
        <div className="ca-kpi-sub">across {campaignsCount} campaigns</div>
        <Sparkline data={leadsTrend} color={CA_ORANGE_DEEP} />
      </div>

      <div className="ca-kpi ca-kpi--progress">
        <div className="ca-kpi-top">
          <span className="ca-kpi-icon">
            <PhoneIncoming size={13} />
          </span>
          <span className="ca-kpi-label">Answered leads</span>
        </div>
        <div className="ca-kpi-value">{answeredLeads.toLocaleString('en-US')}</div>
        <div className="ca-kpi-progress-track">
          <i style={{ width: `${answeredShare}%` }} />
        </div>
        <div className="ca-kpi-sub">
          {answeredShare}% of {assignedLeads.toLocaleString('en-US')} assigned
        </div>
      </div>

      <div className="ca-kpi ca-kpi--ring">
        <div className="ca-kpi-ring-top">
          <span className="ca-kpi-label">Connect rate</span>
          <TrendChip current={connectRate} average={avgCampaignConnectRate} higherIsBetter />
        </div>
        <div className="ca-kpi-ring-body">
          <div className="ca-kpi-ring-wrap">
            <RingStat value={connectRate ?? 0} color={CA_GREEN_DEEP} trackColor="rgba(127,169,143,0.16)" size={54} thickness={6} />
            <div className="ca-kpi-ring-mid">
              {connectRate === null ? '—' : <CountUp value={Math.round(connectRate)} format={(n) => `${Math.round(n)}%`} />}
            </div>
          </div>
          <div className="ca-kpi-ring-stats">
            <div className="ca-kpi-ring-stat">
              <b>{fmtNum(answeredLeads)}</b>
              <span>answered</span>
            </div>
            <div className="ca-kpi-ring-stat">
              <b>{fmtNum(assignedLeads)}</b>
              <span>assigned</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ca-kpi ca-kpi--warn">
        <div className="ca-kpi-ring-top">
          <span className="ca-kpi-label">No-answer rate</span>
          <TrendChip current={noAnswerRate} average={avgCampaignNoAnswerRate} higherIsBetter={false} />
        </div>
        <div className="ca-kpi-ring-body">
          <div className="ca-kpi-ring-wrap">
            <RingStat value={noAnswerRate ?? 0} color={CA_AMBER_DEEP} trackColor="rgba(201,154,92,0.16)" size={54} thickness={6} />
            <div className="ca-kpi-ring-mid">
              {noAnswerRate === null ? '—' : <CountUp value={Math.round(noAnswerRate)} format={(n) => `${Math.round(n)}%`} />}
            </div>
          </div>
          <div className="ca-kpi-ring-stats">
            <div className="ca-kpi-ring-stat">
              <b>{fmtNum(noAnswerCount)}</b>
              <span>unanswered</span>
            </div>
            <div className="ca-kpi-ring-stat">
              <b>{fmtNum(assignedLeads)}</b>
              <span>assigned</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ca-kpi ca-kpi--status">
        <div className="ca-kpi-top">
          <span className="ca-kpi-icon ca-kpi-icon--slate">
            <ShieldAlert size={13} />
          </span>
          <span className="ca-kpi-label">DNC skips</span>
        </div>
        <div className="ca-kpi-value">{dncSkips.toLocaleString('en-US')}</div>
        <div className="ca-kpi-mini-track">
          <i style={{ width: `${dncPercent ?? 0}%` }} />
        </div>
        <div className="ca-kpi-sub">{dncPercent === null ? '—' : `${dncPercent}%`} of assigned</div>
      </div>

      <div className="ca-kpi ca-kpi--avatar">
        <div className="ca-kpi-top">
          <span className="ca-kpi-label">Members assigned</span>
        </div>
        <div className="ca-kpi-value">{membersAssigned}</div>
        <AvatarStack names={agentNames} />
        <div className="ca-kpi-sub">
          {membersPerCampaign === null ? '—' : `≈${membersPerCampaign} per campaign`}
        </div>
      </div>

      <div className="ca-kpi ca-kpi--pulse">
        <div className="ca-kpi-pulse-ring">
          <span className="ca-kpi-pulse-dot" aria-hidden="true" />
          <span className="ca-kpi-value">{activeCampaigns}</span>
        </div>
        <div className="ca-kpi-label">Active campaigns</div>
        <div className="ca-kpi-sub">Running now</div>
      </div>

      <div className="ca-kpi ca-kpi--badge">
        <div className="ca-kpi-top">
          <span className="ca-kpi-icon ca-kpi-icon--done">
            <BadgeCheck size={14} />
          </span>
          <span className="ca-kpi-label">Completed campaigns</span>
        </div>
        <div className="ca-kpi-value">{completedCampaigns}</div>
        <div className="ca-kpi-sub">Completed campaigns</div>
      </div>
    </div>
  );
};

export default CampaignKpiCards;
