import type { ReactNode } from 'react';
import { Ic } from '@/components/mcm/icons';
import { DIALER_TYPE } from './add-edit-campaign/consts';

/**
 * Presentational pieces shared by the campaign list and the campaign
 * monitor, ported from the MCM Unified Console artifact.
 *
 * Every number these render comes from `campaignAnalytics` — the four
 * outcome counts and the percentages the API already returns. Nothing here
 * derives a metric the platform cannot actually measure; where the artifact
 * showed one (abandon rate, idle agents, line allocation), the pages say so
 * instead of inventing it.
 */

export type CampaignAnalytics = {
  assignedLeads?: number | string;
  dialedLeads?: number | string;
  answeredLeads?: number | string;
  totalCallNotAnswered?: number | string;
  totalDnc?: number | string;
  pendingLeads?: number | string;
  answeredPercentage?: number | string;
  notAnsweredPercentage?: number | string;
  dncPercentage?: number | string;
  pendingPercentage?: number | string;
};

export const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const fmt = (value: unknown) => num(value).toLocaleString('en-US');

export const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** The four states, already totalled, so callers stop re-deriving them. */
export const readOutcomes = (analytics?: CampaignAnalytics | null) => {
  const assigned = num(analytics?.assignedLeads);
  const answered = num(analytics?.answeredLeads);
  const noAnswer = num(analytics?.totalCallNotAnswered);
  const dnc = num(analytics?.totalDnc);
  // Trust the API's pending when it sends one; fall back to the remainder so
  // the bar always adds up to the assigned total.
  const pending =
    analytics?.pendingLeads == null
      ? Math.max(0, assigned - answered - noAnswer - dnc)
      : num(analytics.pendingLeads);
  const dialed = num(analytics?.dialedLeads) || answered + noAnswer + dnc;
  return { assigned, answered, noAnswer, dnc, pending, dialed };
};

export const CAMPAIGN_STATUS: Record<
  string,
  { label: string; cls: 'q' | 'acw' | 'busy' | 'away' | 'nr' }
> = {
  PROCESSING: { label: 'Running', cls: 'q' },
  PAUSE: { label: 'Paused', cls: 'acw' },
  NEW: { label: 'Scheduled', cls: 'busy' },
  COMPLETED: { label: 'Completed', cls: 'away' },
  COMPLETE: { label: 'Completed', cls: 'away' },
};

export const statusOf = (status?: string) =>
  CAMPAIGN_STATUS[String(status || '').toUpperCase()] || {
    label: status ? String(status).toLowerCase() : 'Unknown',
    cls: 'away' as const,
  };

export const DIAL_METHOD_LABEL: Record<string, string> = {
  [DIALER_TYPE.NORMAL]: 'Progressive',
  [DIALER_TYPE.PREVIEW]: 'Preview',
  [DIALER_TYPE.PREDICTIVE]: 'Predictive',
};

/** Status pill; running campaigns get a live dot. */
export const StatusPill = ({ status }: { status?: string }) => {
  const { label, cls } = statusOf(status);
  const running = String(status || '').toUpperCase() === 'PROCESSING';
  return (
    <span className={`state ${cls}`}>
      {running ? <span className="dot green pulse" /> : null}
      {label}
    </span>
  );
};

/**
 * The outcome bar: answered / no answer / DNC laid over the assigned total,
 * with whatever is left reading as pending through the track colour.
 */
export const OutcomeBar = ({
  analytics,
  showFoot = true,
}: {
  analytics?: CampaignAnalytics | null;
  showFoot?: boolean;
}) => {
  const { assigned, answered, noAnswer, dnc, pending, dialed } = readOutcomes(analytics);
  const width = (value: number) => (assigned > 0 ? `${(value / assigned) * 100}%` : '0%');

  if (!assigned) {
    return <span style={{ color: 'var(--ink-4)', fontWeight: 600 }}>No leads assigned</span>;
  }

  return (
    <>
      <div
        className="segbar"
        title={`${fmt(answered)} answered · ${fmt(noAnswer)} no answer · ${fmt(dnc)} DNC · ${fmt(pending)} pending`}
      >
        <i className="ans" style={{ width: width(answered) }} />
        <i className="na" style={{ width: width(noAnswer) }} />
        <i className="dnc" style={{ width: width(dnc) }} />
      </div>
      {showFoot ? (
        <div className="segfoot">
          <span>
            <b className="num">{pct(dialed, assigned)}%</b> dialled
          </span>
          <span className="num">{fmt(pending)} left</span>
        </div>
      ) : null}
    </>
  );
};

export const OUTCOME_LEGEND: Array<[string, string]> = [
  ['Answered', 'var(--live)'],
  ['No answer', 'var(--warn)'],
  ['DNC / blocked', 'var(--crit)'],
  ['Pending', 'var(--surface-3)'],
];

export const OutcomeLegend = () => (
  <>
    {OUTCOME_LEGEND.map(([label, colour]) => (
      <span className="legend" key={label}>
        <i className="swatch" style={{ background: colour }} />
        {label}
      </span>
    ))}
  </>
);

/** Progress donut — same three arcs as the bar, over a pending track. */
export const OutcomeDonut = ({ analytics }: { analytics?: CampaignAnalytics | null }) => {
  const { assigned, answered, noAnswer, dnc, dialed } = readOutcomes(analytics);
  const R = 74;
  const TAU = 2 * Math.PI * R;
  let offset = 0;

  const arcs = (
    [
      [answered, 'var(--live)'],
      [noAnswer, 'var(--warn)'],
      [dnc, 'var(--crit)'],
    ] as Array<[number, string]>
  ).map(([value, colour], index) => {
    const length = assigned > 0 ? (value / assigned) * TAU : 0;
    const node = (
      <circle
        key={index}
        cx="84"
        cy="84"
        r={R}
        fill="none"
        stroke={colour}
        strokeWidth="16"
        strokeDasharray={`${length.toFixed(2)} ${(TAU - length).toFixed(2)}`}
        strokeDashoffset={(-offset).toFixed(2)}
      />
    );
    offset += length;
    return node;
  });

  return (
    <div className="ring">
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="16" />
        {arcs}
      </svg>
      <div className="ring-mid">
        <span className="big num">{pct(dialed, assigned)}%</span>
        <span className="lbl">Dialled</span>
      </div>
    </div>
  );
};

/** A labelled horizontal bar, used for outcome and disposition breakdowns. */
export const BreakdownRow = ({
  label,
  value,
  total,
  colour,
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  colour: string;
  suffix?: ReactNode;
}) => (
  <div className="hbar">
    <span className="hbar-l">{label}</span>
    <span className="hbar-t">
      <i style={{ width: `${pct(value, total)}%`, background: colour }} />
    </span>
    <span className="hbar-v num">{suffix ?? fmt(value)}</span>
  </div>
);

/** Back link that sits above a page title. */
export const Crumb = ({
  onBack,
  label,
  trail,
}: {
  onBack: () => void;
  label: string;
  trail?: string;
}) => (
  <div className="crumb">
    <button type="button" onClick={onBack}>
      <Ic n="chev" size={12} />
      {label}
    </button>
    {trail ? (
      <>
        <span>/</span>
        <span className="num">{trail}</span>
      </>
    ) : null}
  </div>
);
