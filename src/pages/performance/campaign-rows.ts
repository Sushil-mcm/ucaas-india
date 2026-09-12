import { hasPacingControls, normalizeDialMode } from '@/lib/campaign-dial-mode';

/**
 * One derivation of a campaign's performance row, for Performance ▸ Campaigns.
 *
 * Three real sources, none of them derived twice:
 *
 *   call log     /campaign/compliance/report with no campaignId — every
 *                campaign's calls in the range, grouped by day, carrying the
 *                campaign name and dial method. This is where attempts, live
 *                answers, abandons and talk time come from, and it is the same
 *                grouping the regulator report uses, so the two screens can
 *                never disagree about an abandon rate.
 *   campaign     the campaign list, for status, mode and list size.
 *   live board   the "campaign-live-stats" socket push, for what the dialer is
 *                doing this second. It exists only while the engine holds the
 *                campaign in memory, so every row that reads it says so.
 *
 * The abandon rate is measured over the WHOLE selected window, not per day.
 * That is the rule: the US cap is 3% over 30 days, so a single bad hour inside
 * a compliant month is not a breach and must not be reported as one.
 */

/** The default cap. 3% over a rolling 30 days is the US rule. */
export const ABANDON_CAP_PERCENT = 3;

/** One day of one campaign, as the compliance report returns it. */
export type ComplianceDayRow = {
  day: string;
  campaignId: string | null;
  campaignName: string | null;
  dialMethod: string | null;
  calls: number;
  answered: number;
  abandoned: number;
  machine: number;
  busy: number;
  noAnswer: number;
  callbacks: number;
  talkSeconds: number;
  answeredLive: number;
};

export type CampaignPerfRow = {
  id: string;
  name: string;
  dialMethod: string;
  status: string;
  isRunning: boolean;
  /** True when this mode can abandon a call at all — preview cannot. */
  paced: boolean;

  calls: number;
  answeredLive: number;
  connectRatePct: number | null;
  abandoned: number;
  /** abandoned ÷ live answers over the whole window, or null when nothing answered. */
  abandonRatePct: number | null;
  /** The cap this campaign is measured against: its own target, else the rule. */
  capPercent: number;
  overCap: boolean;

  machine: number;
  busy: number;
  noAnswer: number;
  callbacks: number;
  talkSeconds: number;

  /** Leads assigned to the campaign, from its stored analytics. */
  assignedLeads: number | null;
  answeredLeads: number | null;

  /** The engine's board, when one arrived in the last 30 seconds. */
  board: any | null;
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const SUMMED = [
  'calls',
  'answered',
  'abandoned',
  'machine',
  'busy',
  'noAnswer',
  'callbacks',
  'talkSeconds',
  'answeredLive',
] as const;

/**
 * The pacing sentence for a campaign, and whether it is worth worrying about.
 *
 * Predictive is the only mode that dials ahead, so it is the only one with a
 * ratio to report. The others get the truth about who places the call rather
 * than a number that would always read the same.
 */
export const pacingFor = (row: CampaignPerfRow): { text: string; sub?: string; warn: boolean } => {
  const mode = normalizeDialMode(row.dialMethod);
  const run = row.board?.run || null;

  if (mode === 'INBOUND') return { text: 'Inbound', sub: 'callers dial in', warn: false };
  if (mode === 'PREVIEW')
    return { text: 'Agents dial', sub: 'from their own records', warn: false };

  if (!row.board) {
    return {
      text: '—',
      sub: row.isRunning ? 'no board from the dialer' : 'not dialling',
      warn: false,
    };
  }

  if (mode === 'PREDICTIVE') {
    if (run?.belowPredictiveFloor)
      return {
        text: 'Paused',
        sub: 'too few agents to dial ahead — one call per free agent',
        warn: true,
      };
    const ratio = Number(run?.callsPerAgent || 1);
    return {
      text: `${ratio.toFixed(1)}×`,
      sub: `${num(run?.soonFreeAgents)} about to be free · answers in ~${num(run?.avgAnswerSec)}s`,
      warn: false,
    };
  }

  return { text: '1×', sub: 'one call per free agent', warn: false };
};

/**
 * Build one row per campaign for the selected range.
 *
 * Campaigns appear when they placed calls in the range, and a running campaign
 * appears even with nothing to show — an idle running campaign is exactly what
 * somebody opening this tab needs to see.
 */
const buildCampaignRows = ({
  byDay,
  campaigns,
  liveBoardFor,
  capPercent = ABANDON_CAP_PERCENT,
}: {
  byDay: ComplianceDayRow[];
  campaigns: any[];
  liveBoardFor: (id: string) => any | null;
  capPercent?: number;
}): CampaignPerfRow[] => {
  const campaignById = new Map<string, any>();
  (campaigns || []).forEach((campaign: any) => {
    const id = String(campaign?._id || '');
    if (id) campaignById.set(id, campaign);
  });

  const totals = new Map<string, Record<(typeof SUMMED)[number], number> & { name: string; dialMethod: string }>();

  (byDay || []).forEach((day) => {
    const id = String(day?.campaignId || '');
    if (!id) return;
    const current =
      totals.get(id) ||
      ({
        name: day?.campaignName || '',
        dialMethod: day?.dialMethod || '',
        calls: 0,
        answered: 0,
        abandoned: 0,
        machine: 0,
        busy: 0,
        noAnswer: 0,
        callbacks: 0,
        talkSeconds: 0,
        answeredLive: 0,
      } as any);
    SUMMED.forEach((key) => {
      current[key] += num((day as any)[key]);
    });
    /* The name and mode are the same on every day of a campaign; keep the
       first non-empty one so a day the server left blank cannot erase it. */
    if (!current.name && day?.campaignName) current.name = day.campaignName;
    if (!current.dialMethod && day?.dialMethod) current.dialMethod = day.dialMethod;
    totals.set(id, current);
  });

  /* A campaign that is running right now belongs on the list even if it has
     not placed a call in the range — that is the state most worth seeing. */
  campaignById.forEach((campaign, id) => {
    const running = String(campaign?.campaignStatus || '').toUpperCase() === 'PROCESSING';
    if (!running || totals.has(id)) return;
    totals.set(id, {
      name: campaign?.name || '',
      dialMethod: campaign?.dialMethod || '',
      calls: 0,
      answered: 0,
      abandoned: 0,
      machine: 0,
      busy: 0,
      noAnswer: 0,
      callbacks: 0,
      talkSeconds: 0,
      answeredLive: 0,
    } as any);
  });

  const rows: CampaignPerfRow[] = [];

  totals.forEach((sums, id) => {
    const campaign = campaignById.get(id);
    const dialMethod = sums.dialMethod || campaign?.dialMethod || '';
    const status = String(campaign?.campaignStatus || '').toUpperCase();
    const analytics = campaign?.campaignAnalytics || null;

    /* The campaign's own target when it set one — a team may hold itself to
       1% — otherwise the rule. Never above the rule: the cap is a ceiling. */
    const ownTarget = Number(campaign?.dialerSetting?.target_abandon_rate);
    const cap = Number.isFinite(ownTarget) && ownTarget > 0 ? Math.min(ownTarget, capPercent) : capPercent;

    const paced = hasPacingControls(dialMethod);
    const rate = sums.answeredLive > 0 ? (sums.abandoned / sums.answeredLive) * 100 : null;

    rows.push({
      id,
      name: sums.name || campaign?.name || id,
      dialMethod,
      status,
      isRunning: status === 'PROCESSING',
      paced,

      calls: sums.calls,
      answeredLive: sums.answeredLive,
      connectRatePct: sums.calls > 0 ? (sums.answeredLive / sums.calls) * 100 : null,
      abandoned: sums.abandoned,
      abandonRatePct: rate === null ? null : Math.round(rate * 10) / 10,
      capPercent: cap,
      /* Only a paced mode can breach: an agent-dialled preview call has
         nobody to abandon it. */
      overCap: paced && rate !== null && rate > cap,

      machine: sums.machine,
      busy: sums.busy,
      noAnswer: sums.noAnswer,
      callbacks: sums.callbacks,
      talkSeconds: sums.talkSeconds,

      assignedLeads: analytics ? num(analytics.assignedLeads) : null,
      answeredLeads: analytics ? num(analytics.answeredLeads) : null,

      board: liveBoardFor(id),
    });
  });

  /* Anything over the cap first — it is the one row on this screen somebody
     has to act on — then the busiest. */
  return rows.sort((a, b) => {
    if (a.overCap !== b.overCap) return a.overCap ? -1 : 1;
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
    return b.calls - a.calls;
  });
};

export type CampaignPerfTotals = {
  calls: number;
  answeredLive: number;
  abandoned: number;
  machine: number;
  talkSeconds: number;
  connectRatePct: number | null;
  abandonRatePct: number | null;
  campaignsOverCap: number;
  running: number;
};

/** The strip above the table. Same arithmetic as the rows, applied to all of them. */
export const summariseCampaignRows = (rows: CampaignPerfRow[]): CampaignPerfTotals => {
  const acc = rows.reduce(
    (sum, row) => {
      sum.calls += row.calls;
      sum.answeredLive += row.answeredLive;
      sum.machine += row.machine;
      sum.talkSeconds += row.talkSeconds;
      /* Only paced calls count toward the rate — the denominator has to match
         the population the rule applies to, or a busy preview campaign would
         dilute a predictive campaign's breach into looking compliant. */
      if (row.paced) {
        sum.pacedAbandoned += row.abandoned;
        sum.pacedAnsweredLive += row.answeredLive;
      }
      sum.abandoned += row.abandoned;
      if (row.overCap) sum.campaignsOverCap += 1;
      if (row.isRunning) sum.running += 1;
      return sum;
    },
    {
      calls: 0,
      answeredLive: 0,
      abandoned: 0,
      machine: 0,
      talkSeconds: 0,
      pacedAbandoned: 0,
      pacedAnsweredLive: 0,
      campaignsOverCap: 0,
      running: 0,
    },
  );

  return {
    calls: acc.calls,
    answeredLive: acc.answeredLive,
    abandoned: acc.abandoned,
    machine: acc.machine,
    talkSeconds: acc.talkSeconds,
    connectRatePct: acc.calls > 0 ? (acc.answeredLive / acc.calls) * 100 : null,
    abandonRatePct:
      acc.pacedAnsweredLive > 0
        ? Math.round((acc.pacedAbandoned / acc.pacedAnsweredLive) * 1000) / 10
        : null,
    campaignsOverCap: acc.campaignsOverCap,
    running: acc.running,
  };
};

export default buildCampaignRows;
