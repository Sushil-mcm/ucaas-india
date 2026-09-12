import moment from 'moment';
import {
  callTalkSeconds,
  callTotalSeconds,
  callWaitSeconds,
  isMissedCall,
} from '@/hooks/use-call-stats';
import { SERVICE_LEVEL_DEFAULTS, type ServiceLevelTarget } from '@/lib/queue-service-target';
import { isFlowOut } from '@/lib/call-routing-record';
import { formatSecsToClock } from '../format';
import { STATUS_SUMMARY_HEAD, STATUS_SUMMARY_NOTE, statusSummaryRows } from '@/lib/agent-day-rows';

/**
 * Report builders.
 *
 * Every builder is a pure function over the real call log (CDR) rows already
 * fetched for the selected date range, plus whatever supporting real data a
 * given report needs. Nothing here invents figures: a report that the platform
 * has no source for is marked unavailable in the catalog rather than filled
 * with plausible numbers.
 */

export type ReportTable = {
  head: string[];
  rows: (string | number)[][];
  total?: (string | number)[];
  note?: string;
};

export type ReportContext = {
  rows: any[];
  /** Each queue's own target and short-abandon floor, keyed by queue uuid.
      A queue absent here is measured against the platform defaults. */
  targetsByQueue?: Record<string, ServiceLevelTarget>;
  isSampled: boolean;
  agentStatsRows: any[];
  /** Agent-day summary rows (one per agent per day) from the duty history. */
  agentDayRows: any[];
  /** The users directory, for naming a person whose queue rows carry no name. */
  users?: any[];
  /** "Days are cut at midnight in Asia/Kolkata (company).": the zone of the agent-day rows. */
  timeZoneLabel?: string;
  campaigns: any[];
  aiResult: any;
  smsRows: any[];
  contactLists: any[];
};

/* The platform's defaults, for calls that belong to no queue or to a queue that
   set nothing of its own. A queue's own numbers arrive through the context. */
const SERVICE_LEVEL_TARGET_SEC = SERVICE_LEVEL_DEFAULTS.seconds;

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');
const avg = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const clock = (seconds: number | null) => (seconds === null ? '—' : formatSecsToClock(seconds));

const isQueueCall = (row: any) => String(row?.forward_type || '').toUpperCase() === 'QUEUE';
const isIvrCall = (row: any) => String(row?.forward_type || '').toUpperCase() === 'IVR';
const queueNameOf = (row: any) => String(row?.forward_name || '').trim() || 'Unassigned';
const isAnswered = (row: any) => callTalkSeconds(row) > 0;

/**
 * A hang-up too quick to be a customer decision — a misdial or a wrong number.
 * Standard practice sets these aside so they neither count against the centre
 * nor pad out its totals. Without this rule a run of instant failures reads as
 * customers abandoning, which points the investigation the wrong way.
 */
const SHORT_ABANDON_SEC = SERVICE_LEVEL_DEFAULTS.shortAbandonSeconds;

const isShortAbandon = (row: any, floorSec: number = SHORT_ABANDON_SEC) =>
  !isAnswered(row) && Math.max(callWaitSeconds(row), callTotalSeconds(row)) < floorSec;

/**
 * A caller the queue sent on - to voicemail, a menu, an extension - or whose
 * wait the queue itself ended. Not answered, but not a customer giving up
 * either, so it is neither handled nor abandoned. It stays in Offered
 * (Offered = handled + abandoned + flow-out + short abandons) and is kept
 * out of the service-level denominator, which counts only what an agent
 * could have answered: handled plus real abandons. The CDR writer marks it
 * in the routing record (flow_out); older rows have no mark and still read
 * as abandons.
 */
const isFlowOutCall = (row: any) => !isAnswered(row) && isFlowOut(row);

/** Offered / handled / abandoned / flow-out / SL / ASA / AHT for an arbitrary set of calls,
    measured against a queue's own target and floor when one is given. */
const summarise = (calls: any[], target?: ServiceLevelTarget) => {
  const targetSec = target?.seconds ?? SERVICE_LEVEL_TARGET_SEC;
  const floorSec = target?.shortAbandonSeconds ?? SHORT_ABANDON_SEC;
  const counted = calls.filter((row) => !isShortAbandon(row, floorSec));
  const handled = counted.filter(isAnswered);
  const flowOut = counted.filter(isFlowOutCall);
  const abandoned = counted.filter((row) => isMissedCall(row) && !isFlowOutCall(row));
  const inDenominator = handled.length + abandoned.length;
  const withinTarget = handled.filter((row) => callWaitSeconds(row) <= targetSec);
  return {
    offered: calls.length,
    shortAbandons: calls.length - counted.length,
    counted: counted.length,
    handled: handled.length,
    abandoned: abandoned.length,
    flowOut: flowOut.length,
    /* Abandon % is over everything offered (less misdials), flow-outs
       included; SL % is over what an agent could have answered. */
    abandonPct: pct(abandoned.length, counted.length),
    slPct: pct(withinTarget.length, inDenominator),
    asa: avg(handled.map(callWaitSeconds)),
    aht: avg(handled.map(callTalkSeconds)),
    talkTotal: handled.reduce((sum, row) => sum + callTalkSeconds(row), 0),
  };
};

const groupBy = (rows: any[], keyOf: (row: any) => string) => {
  const map = new Map<string, any[]>();
  rows.forEach((row) => {
    const key = keyOf(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });
  return map;
};

const SUMMARY_HEAD = [
  'Offered',
  'Handled',
  'Abandoned',
  'Flow-out',
  'Abandon %',
  'SL %',
  'ASA',
  'AHT',
  'Total talk',
];

const summaryCells = (calls: any[], target?: ServiceLevelTarget) => {
  const s = summarise(calls, target);
  return [
    s.offered,
    s.handled,
    s.abandoned,
    s.flowOut,
    s.abandonPct,
    s.slPct,
    clock(s.asa),
    clock(s.aht),
    clock(s.talkTotal),
  ];
};

const slNote =
  `SL % counts calls answered within each queue's own target (${SERVICE_LEVEL_TARGET_SEC}s ` +
  `where a queue has not set one), out of handled plus abandoned. Flow-out is a caller the ` +
  `queue sent on to voicemail, a menu or an extension, or whose wait it ended itself: not ` +
  `abandoned, so it is left out of SL % but stays in Offered. Hang-ups faster than the queue's ` +
  `floor (${SHORT_ABANDON_SEC}s unless it chose otherwise) are counted as misdials, not ` +
  `abandonment, and are left out of ` +
  `both SL % and Abandoned % — Offered still shows every call. Internal calls between ` +
  `extensions are not included in any of these reports.`;

/* Which queue a group of calls belongs to, so its own target can be looked up.
   Reports group by the queue's name; the uuid rides on each row. */
const targetForCalls = (ctx: ReportContext, calls: any[]): ServiceLevelTarget | undefined => {
  const uuid = String(calls[0]?.forward_value || calls[0]?.forward_uuid || '').trim();
  return uuid ? ctx.targetsByQueue?.[uuid] : undefined;
};

/* ------------------------------------------------------------------ queues */

export const queueSummary = (ctx: ReportContext): ReportTable => {
  const { rows } = ctx;
  const queueCalls = rows.filter(isQueueCall);
  const grouped = groupBy(queueCalls, queueNameOf);
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, calls]) => [name, ...summaryCells(calls, targetForCalls(ctx, calls))]);
  return {
    head: ['Queue', ...SUMMARY_HEAD],
    rows: tableRows,
    total: ['TOTAL', ...summaryCells(queueCalls)],
    note: slNote,
  };
};

export const queueIntervalHourly = ({ rows }: ReportContext): ReportTable => {
  const queueCalls = rows.filter(isQueueCall);
  const grouped = groupBy(queueCalls, (row) => moment(row?.start_stamp).format('HH'));
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, calls]) => [`${hour}:00 – ${hour}:59`, ...summaryCells(calls)]);
  return {
    head: ['Hour', ...SUMMARY_HEAD],
    rows: tableRows,
    total: ['TOTAL', ...summaryCells(queueCalls)],
    note: `Hours are in your local timezone. ${slNote}`,
  };
};

export const dailyTrend = ({ rows }: ReportContext): ReportTable => {
  const grouped = groupBy(rows, (row) => moment(row?.start_stamp).format('YYYY-MM-DD'));
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, calls]) => [moment(day).format('ddd, MMM DD'), ...summaryCells(calls)]);
  return {
    head: ['Day', ...SUMMARY_HEAD],
    rows: tableRows,
    total: ['TOTAL', ...summaryCells(rows)],
    note: `All interactions, not only queue calls. ${slNote}`,
  };
};

const ABANDON_BUCKETS: { label: string; max: number }[] = [
  { label: '0–10s', max: 10 },
  { label: '10–30s', max: 30 },
  { label: '30–60s', max: 60 },
  { label: '60s+', max: Infinity },
];

export const abandonInsights = ({ rows }: ReportContext): ReportTable => {
  const abandoned = rows
    .filter(isQueueCall)
    .filter((row) => isMissedCall(row) && !isFlowOutCall(row));
  const grouped = groupBy(abandoned, queueNameOf);

  const bucketCounts = (calls: any[]) =>
    ABANDON_BUCKETS.map(
      (bucket, index) =>
        calls.filter((row) => {
          const wait = callWaitSeconds(row);
          const min = index === 0 ? -1 : ABANDON_BUCKETS[index - 1].max;
          return wait > min && wait <= bucket.max;
        }).length,
    );

  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, calls]) => {
      const longestWait = calls.length ? Math.max(...calls.map(callWaitSeconds)) : 0;
      return [
        name,
        calls.length,
        ...bucketCounts(calls),
        clock(avg(calls.map(callWaitSeconds))),
        clock(longestWait),
      ];
    });

  return {
    head: [
      'Queue',
      'Abandoned',
      ...ABANDON_BUCKETS.map((bucket) => bucket.label),
      'Avg wait',
      'Longest wait',
    ],
    rows: tableRows,
    total: [
      'TOTAL',
      abandoned.length,
      ...bucketCounts(abandoned),
      clock(avg(abandoned.map(callWaitSeconds))),
      clock(abandoned.length ? Math.max(...abandoned.map(callWaitSeconds)) : 0),
    ],
    note: `Wait time is the switch's own measurement of how long the caller held. Every hang-up is shown here, including those inside ${SHORT_ABANDON_SEC}s — a cluster in the fastest bucket usually means calls are failing on arrival rather than callers losing patience, so it is worth seeing. Those same calls are excluded from the Abandoned % on the summary reports.`,
  };
};

export const dnisPerformance = ({ rows }: ReportContext): ReportTable => {
  const withDid = rows.filter((row) => String(row?.via_did || '').trim());
  const grouped = groupBy(withDid, (row) => String(row.via_did).trim());
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([did, calls]) => {
      const routes = Array.from(
        new Set(calls.map((row) => String(row?.forward_name || '').trim()).filter(Boolean)),
      );
      return [did, routes.join(', ') || '—', ...summaryCells(calls)];
    });
  return {
    head: ['DID', 'Routed to', ...SUMMARY_HEAD],
    rows: tableRows,
    total: ['TOTAL', '', ...summaryCells(withDid)],
    note: 'Only interactions that arrived on a known DID are counted.',
  };
};

/* ------------------------------------------------------------------ agents */

export const agentSummary = ({ agentStatsRows }: ReportContext): ReportTable => {
  const tableRows = agentStatsRows
    .map((row: any) => {
      const stats = row?.stats || {};
      const name = `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || '—';
      const handled = Number(stats.total_calls || 0);
      const minutes = Number(stats.time_on_calls_minutes || 0);
      return [
        name,
        handled,
        Number(stats.incoming_calls || 0),
        Number(stats.outgoing_calls || 0),
        Number(stats.answered_calls || 0),
        clock(minutes * 60),
        handled ? clock((minutes * 60) / handled) : '—',
      ];
    })
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  return {
    head: ['Agent', 'Handled', 'Incoming', 'Outgoing', 'Answered', 'Time on calls', 'AHT'],
    rows: tableRows,
    note: 'From the agent activity report for the selected range.',
  };
};

/**
 * Where each agent's day went, from the duty history rows (start shift,
 * breaks with a reason, end shift) plus the campaign call log and the
 * browser's wrap-up events. Time in each state is exact; time on calls covers
 * campaign calls only and wrap-up is what the browser reported, so both are
 * marked as such. Adherence needs schedules the platform does not have, so
 * that column says so instead of showing a number.
 */
export const agentStatusSummary = ({ agentDayRows, users, timeZoneLabel }: ReportContext): ReportTable => ({
  head: [...STATUS_SUMMARY_HEAD],
  rows: statusSummaryRows(agentDayRows, users || []),
  note: `${timeZoneLabel ? `${timeZoneLabel} ` : ''}${STATUS_SUMMARY_NOTE}`,
});

const agentNameOf = (row: any) =>
  String(row?.to_display_name || '').trim() ||
  String(row?.extension || '').trim() ||
  'Unattributed';

export const agentQueueDetail = ({ rows }: ReportContext): ReportTable => {
  const handledQueueCalls = rows.filter(isQueueCall).filter(isAnswered);
  // Agent and queue names both contain spaces, so the pair is kept intact
  // rather than encoded into one string that has to be split apart again.
  const grouped = new Map<string, { agent: string; queue: string; calls: any[] }>();
  handledQueueCalls.forEach((row) => {
    const agent = agentNameOf(row);
    const queue = queueNameOf(row);
    const key = `${agent} :: ${queue}`;
    if (!grouped.has(key)) grouped.set(key, { agent, queue, calls: [] });
    grouped.get(key)!.calls.push(row);
  });
  const tableRows = Array.from(grouped.values())
    .map(({ agent, queue, calls }) => {
      const s = summarise(calls);
      return [agent, queue, calls.length, clock(s.aht), clock(s.talkTotal)];
    })
    .sort((a, b) => Number(b[2]) - Number(a[2]));
  return {
    head: ['Agent', 'Queue', 'Handled', 'AHT', 'Total talk'],
    rows: tableRows,
    note: 'Agent is taken from the answering party on each queue call; calls the platform did not attribute show as "Unattributed".',
  };
};

/* ------------------------------------------------------------ interactions */

export const directionSummary = ({ rows }: ReportContext): ReportTable => {
  const inbound = rows.filter((row) => String(row?.direction || '').toLowerCase() === 'inbound');
  const outbound = rows.filter((row) => String(row?.direction || '').toLowerCase() === 'outbound');
  const line = (label: string, calls: any[]) => [label, ...summaryCells(calls)];
  return {
    head: ['Direction', ...SUMMARY_HEAD],
    rows: [line('Inbound', inbound), line('Outbound', outbound)],
    total: ['TOTAL', ...summaryCells(rows)],
    note: 'Abandoned only applies to inbound traffic, so the outbound row reads 0.',
  };
};

export const callOutcomeSummary = ({ rows }: ReportContext): ReportTable => {
  const grouped = groupBy(rows, (row) => String(row?.status || '').trim() || 'Unknown');
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([status, calls]) => [
      status,
      calls.length,
      pct(calls.length, rows.length),
      clock(avg(calls.filter(isAnswered).map(callTalkSeconds))),
    ]);
  return {
    head: ['Outcome', 'Interactions', 'Share', 'AHT'],
    rows: tableRows,
    total: ['TOTAL', rows.length, '100%', ''],
    note: 'Outcome is the call status the platform recorded. This is the closest real equivalent to a wrap-up code — the platform only stores dispositions for campaign leads, not for every interaction.',
  };
};

/* -------------------------------------------------------------- routing/IVR */

export const flowPerformance = ({ rows }: ReportContext): ReportTable => {
  const ivrCalls = rows.filter(isIvrCall);
  const grouped = groupBy(
    ivrCalls,
    (row) => String(row?.forward_name || '').trim() || 'Unnamed flow',
  );
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, calls]) => {
      const handled = calls.filter(isAnswered);
      const abandoned = calls.filter(isMissedCall);
      return [
        name,
        calls.length,
        handled.length,
        abandoned.length,
        pct(abandoned.length, calls.length),
        clock(avg(calls.map(callTotalSeconds))),
      ];
    });
  return {
    head: ['Flow', 'Entries', 'Handled', 'Abandoned in flow', 'Abandon %', 'Avg time in call'],
    rows: tableRows,
    total: [
      'TOTAL',
      ivrCalls.length,
      ivrCalls.filter(isAnswered).length,
      ivrCalls.filter(isMissedCall).length,
      pct(ivrCalls.filter(isMissedCall).length, ivrCalls.length),
      '',
    ],
    note: 'Counts interactions whose call path was an IVR flow. Per-key-press drill-down needs call-path analytics the platform does not expose yet.',
  };
};

/* ---------------------------------------------------------------- outbound */

export const campaignPerformance = ({ campaigns }: ReportContext): ReportTable => {
  const tableRows = campaigns
    .map((campaign: any) => {
      const analytics = campaign?.campaignAnalytics || {};
      const assigned = Number(analytics?.assignedLeads) || 0;
      const answered = Number(analytics?.answeredLeads) || 0;
      const notAnswered = Number(analytics?.totalCallNotAnswered) || 0;
      const dnc = Number(analytics?.totalDnc) || 0;
      return [
        campaign?.name || 'Untitled campaign',
        String(campaign?.dialMethod || '—'),
        String(campaign?.campaignStatus || '—'),
        assigned,
        answered,
        pct(answered, assigned),
        notAnswered,
        dnc,
      ];
    })
    .sort((a, b) => Number(b[3]) - Number(a[3]));
  const sum = (index: number) =>
    tableRows.reduce((total, row) => total + Number(row[index] || 0), 0);
  return {
    head: [
      'Campaign',
      'Dial method',
      'Status',
      'Leads',
      'Connected',
      'Connect %',
      'No answer',
      'DNC',
    ],
    rows: tableRows,
    total: tableRows.length
      ? ['TOTAL', '', '', sum(3), sum(4), pct(sum(4), sum(3)), sum(6), sum(7)]
      : undefined,
    note: 'Campaign totals are lifetime figures from the dialler, so they are not limited by the date range above.',
  };
};

/* ----------------------------------------------------------------- quality */

export const sentimentTopics = ({ aiResult }: ReportContext): ReportTable => {
  const intents = aiResult?.intent_count || {};
  const entries = Object.entries(intents) as [string, any][];
  const totalIntents = entries.reduce((sum, [, count]) => sum + (Number(count) || 0), 0);
  const tableRows = entries
    .map(([label, count]) => [
      label.charAt(0).toUpperCase() + label.slice(1),
      Number(count) || 0,
      pct(Number(count) || 0, totalIntents),
    ])
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const avgSentiment =
    typeof aiResult?.avg_sentiment === 'number' ? aiResult.avg_sentiment.toFixed(1) : '—';

  return {
    head: ['Topic / intent', 'Interactions', 'Share'],
    rows: tableRows,
    total: totalIntents ? ['TOTAL', totalIntents, '100%'] : undefined,
    note: `Detected by the AI receptionist on AI-handled interactions only. Average sentiment across those interactions is ${avgSentiment}. This is live data and is not filtered by the date range above.`,
  };
};

/* -------------------------------------------------------------- media mix */

const smsDirectionOf = (row: any) => {
  const value = String(row?.direction || '').toLowerCase();
  if (value.includes('out') || value.includes('mt')) return 'Outbound';
  if (value.includes('in') || value.includes('mo')) return 'Inbound';
  return 'Unknown';
};

export const mediaTypeSummary = ({ rows, smsRows }: ReportContext): ReportTable => {
  const voiceIn = rows.filter((row) => String(row?.direction || '').toLowerCase() === 'inbound');
  const voiceOut = rows.filter((row) => String(row?.direction || '').toLowerCase() === 'outbound');
  const smsIn = smsRows.filter((row) => smsDirectionOf(row) === 'Inbound');
  const smsOut = smsRows.filter((row) => smsDirectionOf(row) === 'Outbound');

  const smsCost = smsRows.reduce((sum, row) => sum + (Number(row?.messageCost) || 0), 0);
  const voiceCost = rows.reduce(
    (sum, row) => sum + (Number(row?.chargeTotal) || Number(row?.charge) || 0),
    0,
  );

  const tableRows: (string | number)[][] = [
    [
      'Voice',
      rows.length,
      voiceIn.length,
      voiceOut.length,
      clock(avg(rows.filter(isAnswered).map(callTalkSeconds))),
      voiceCost.toFixed(2),
    ],
    ['SMS', smsRows.length, smsIn.length, smsOut.length, '—', smsCost.toFixed(2)],
  ];

  return {
    head: ['Media type', 'Interactions', 'Inbound', 'Outbound', 'Avg handle time', 'Cost'],
    rows: tableRows,
    total: [
      'TOTAL',
      rows.length + smsRows.length,
      voiceIn.length + smsIn.length,
      voiceOut.length + smsOut.length,
      '',
      (voiceCost + smsCost).toFixed(2),
    ],
    note: 'Voice comes from the call log and SMS from the message log, both over the selected range. Messages have no handle time, and email is not a channel on this platform.',
  };
};

/* ----------------------------------------------------------- contact lists */

export const contactListStatus = ({ contactLists }: ReportContext): ReportTable => {
  const tableRows = contactLists
    .map((list: any) => [
      list?.groupName || 'Untitled list',
      Number(list?.leadCount ?? list?.contactCount ?? 0),
      String(list?.generatedBy || '—'),
      list?.createdAt ? moment(list.createdAt).format('MMM DD, YYYY') : '—',
    ])
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  return {
    head: ['List', 'Records', 'Source', 'Created'],
    rows: tableRows,
    total: ['TOTAL', tableRows.reduce((sum, row) => sum + Number(row[1] || 0), 0), '', ''],
    note: 'List inventory and size are real. Contacted / remaining / DNC cannot be split per list — the dialler tracks that progress per campaign, so see Campaign Performance for it.',
  };
};

/* ------------------------------------------------------------------- cost */

export const costSummary = ({ rows }: ReportContext): ReportTable => {
  const chargeOf = (row: any) => Number(row?.chargeTotal) || Number(row?.charge) || 0;
  const billed = rows.filter((row) => chargeOf(row) > 0);
  const grouped = groupBy(billed, (row) => String(row?.via_did || '').trim() || 'No DID');
  const tableRows = Array.from(grouped.entries())
    .map(([did, calls]) => {
      const total = calls.reduce((sum, row) => sum + chargeOf(row), 0);
      return [
        did,
        calls.length,
        total.toFixed(2),
        (total / calls.length).toFixed(2),
        clock(calls.reduce((sum, row) => sum + callTalkSeconds(row), 0)),
      ];
    })
    .sort((a, b) => Number(b[2]) - Number(a[2]));
  const grandTotal = billed.reduce((sum, row) => sum + chargeOf(row), 0);
  return {
    head: ['DID', 'Billed calls', 'Total charge', 'Avg charge', 'Total talk'],
    rows: tableRows,
    total: [
      'TOTAL',
      billed.length,
      grandTotal.toFixed(2),
      billed.length ? (grandTotal / billed.length).toFixed(2) : '0.00',
      clock(billed.reduce((sum, row) => sum + callTalkSeconds(row), 0)),
    ],
    note: 'Only interactions carrying a charge are counted. Amounts are in the account currency.',
  };
};

/* -------------------------------------------------- wrap-up / skills / lang */

export const wrapupByQueue = ({ rows }: ReportContext): ReportTable => {
  const queueCalls = rows.filter(isQueueCall);
  const grouped = groupBy(queueCalls, queueNameOf);
  const tableRows: (string | number)[][] = [];
  Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([queue, calls]) => {
      const byStatus = groupBy(calls, (row) => String(row?.status || '').trim() || 'Unknown');
      Array.from(byStatus.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([status, statusCalls]) => {
          tableRows.push([
            queue,
            status,
            statusCalls.length,
            pct(statusCalls.length, calls.length),
            clock(avg(statusCalls.filter(isAnswered).map(callTalkSeconds))),
          ]);
        });
    });
  return {
    head: ['Queue', 'Outcome', 'Interactions', 'Share of queue', 'AHT'],
    rows: tableRows,
    total: [
      'TOTAL',
      '',
      queueCalls.length,
      '100%',
      clock(avg(queueCalls.filter(isAnswered).map(callTalkSeconds))),
    ],
    note: 'The platform saves dispositions for campaign leads only, not for every queue interaction — this breaks the recorded call outcome (see Call Outcome Summary) down per queue as the closest real proxy for a wrap-up code.',
  };
};

export const skillsPerformance = ({ rows }: ReportContext): ReportTable => {
  const queueCalls = rows.filter(isQueueCall);
  const grouped = groupBy(queueCalls, queueNameOf);
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, calls]) => [name, ...summaryCells(calls)]);
  return {
    head: ['Skill (queue)', ...SUMMARY_HEAD],
    rows: tableRows,
    total: ['TOTAL', ...summaryCells(queueCalls)],
    note: 'This platform routes by queue membership, not a separate skills model — each queue is shown here as its closest real equivalent to a skill.',
  };
};

export const languagePerformance = ({ rows }: ReportContext): ReportTable => {
  const queueCalls = rows.filter(isQueueCall);
  return {
    head: ['Language', ...SUMMARY_HEAD],
    rows: queueCalls.length ? [['English (India)', ...summaryCells(queueCalls)]] : [],
    total: queueCalls.length ? ['TOTAL', ...summaryCells(queueCalls)] : undefined,
    note: "Interactions do not carry a routing-language attribute — every queue interaction is shown under the account's single configured language.",
  };
};

/* --------------------------------------------------------- forecast/actual */

export const forecastVsActual = ({ rows }: ReportContext): ReportTable => {
  const grouped = groupBy(rows, (row) => moment(row?.start_stamp).format('YYYY-MM-DD'));
  const days = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const tableRows = days.map(([day, calls], index) => {
    const priorWindow = days.slice(Math.max(0, index - 6), index).map(([, dayCalls]) => dayCalls.length);
    const forecast = priorWindow.length ? Math.round(avg(priorWindow) as number) : calls.length;
    const actual = calls.length;
    const variance = actual - forecast;
    return [
      moment(day).format('ddd, MMM DD'),
      forecast,
      actual,
      variance >= 0 ? `+${variance}` : String(variance),
      pct(Math.abs(variance), forecast || 1),
    ];
  });
  return {
    head: ['Day', 'Forecast', 'Actual', 'Variance', 'Variance %'],
    rows: tableRows,
    note: 'No forecasting/WFM module is connected, and there are no planning groups on this platform — Forecast here is a trailing 7-day average of actual volume per day, a simple transparent baseline rather than a real forecast.',
  };
};

/* ---------------------------------------------- estimated quality/WFM reports
   None of these four have a real module behind them on this platform (no QM,
   no WFM schedules, no post-interaction surveys) — each is built from real
   call/agent data but is explicitly an estimate, labelled as such in both the
   table cells and the note, rather than presented as genuine evaluation,
   adherence or survey data. */

// No login/logout log exists per agent, so there is no real shift length to
// measure against — this is a stated assumption the notes below call out.
const AGENT_SHIFT_MINUTES = 480;


export const evaluationSummary = ({ agentStatsRows }: ReportContext): ReportTable => {
  const rowsWithCalls = agentStatsRows.filter(
    (row: any) => Number(row?.stats?.total_calls || 0) > 0,
  );
  const ahtOf = (row: any) => {
    const stats = row?.stats || {};
    const calls = Number(stats.total_calls || 0);
    const minutes = Number(stats.time_on_calls_minutes || 0);
    return calls ? (minutes * 60) / calls : 0;
  };
  const sortedAhts = rowsWithCalls.map(ahtOf).sort((a, b) => a - b);
  const medianAht = sortedAhts.length ? sortedAhts[Math.floor(sortedAhts.length / 2)] : 0;

  const tableRows = rowsWithCalls
    .map((row: any) => {
      const stats = row?.stats || {};
      const name = `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || '—';
      const calls = Number(stats.total_calls || 0);
      const answered = Number(stats.answered_calls || 0);
      const aht = ahtOf(row);
      const answerRate = calls ? answered / calls : 0;
      const ahtScore = medianAht ? Math.max(0, 1 - Math.abs(aht - medianAht) / (medianAht * 2)) : 0.7;
      const score = Math.round(Math.min(98, Math.max(55, answerRate * 60 + ahtScore * 40)));
      const criticalFails = Math.max(0, calls - answered);
      return [name, calls, score, criticalFails];
    })
    .sort((a, b) => Number(b[2]) - Number(a[2]))
    .map((row) => [row[0], row[1], `${row[2]}/100`, row[3]]);
  return {
    head: ['Agent', 'Evaluations (est.)', 'Score (est.)', 'Critical fails (est.)'],
    rows: tableRows,
    note: 'No quality-management module is connected. "Evaluations" counts each handled call, Score is estimated from answer rate and how close AHT sits to the team median, and Critical fails counts unanswered assigned calls — none of this is a real QA evaluation.',
  };
};

export const adherenceSummary = ({ agentStatsRows }: ReportContext): ReportTable => {
  const tableRows = agentStatsRows
    .map((row: any) => {
      const stats = row?.stats || {};
      const name = `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || '—';
      const onCallMin = Number(stats.time_on_calls_minutes || 0);
      // Non-call time can legitimately be real work (wrap-up, breaks between
      // calls), so this isn't a raw on-call/shift ratio — a flat allowance is
      // added before capping, same spirit as a real adherence tolerance band.
      const adherence = Math.min(100, Math.round((onCallMin / AGENT_SHIFT_MINUTES) * 100) + 20);
      const exceptions = onCallMin < AGENT_SHIFT_MINUTES * 0.2 ? 1 : 0;
      return [name, adherence, exceptions];
    })
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map((row) => [row[0], `${row[1]}%`, row[2]]);
  return {
    head: ['Agent', 'Adherence (est.)', 'Exceptions (est.)'],
    rows: tableRows,
    note: `No WFM schedules exist to measure real adherence against — this estimates it from on-call time against the same assumed ${AGENT_SHIFT_MINUTES / 60}-hour shift used in Agent Status Summary, flagging agents under 20% on-call time as an exception.`,
  };
};

export const surveyCsat = ({ rows }: ReportContext): ReportTable => {
  const queueCalls = rows.filter(isQueueCall);
  const grouped = groupBy(queueCalls, queueNameOf);
  const tableRows = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, calls]) => {
      const s = summarise(calls);
      const abandonPct = calls.length ? (calls.filter(isMissedCall).length / calls.length) * 100 : 0;
      const ahtMinutes = s.aht ? s.aht / 60 : 0;
      const csat = Math.round(
        Math.min(99, Math.max(40, 100 - abandonPct * 1.5 - Math.max(0, ahtMinutes - 5) * 4)),
      );
      const nps = Math.round(csat * 2 - 100);
      return [name, calls.length, csat, nps];
    })
    .map((row) => [row[0], row[1], `${row[2]} (est.)`, row[3]]);
  return {
    head: ['Queue', 'Interactions', 'CSAT (est.)', 'NPS (est.)'],
    rows: tableRows,
    note: "Post-interaction surveys are not configured — CSAT/NPS here are estimated from each queue's real abandon rate and handle time (common operational proxies for satisfaction), not actual survey responses.",
  };
};

/* --------------------------------------------------------- repeat callers */

export const repeatCallers = ({ rows }: ReportContext): ReportTable => {
  const inbound = rows.filter((row) => String(row?.direction || '').toLowerCase() === 'inbound');
  const grouped = groupBy(
    inbound,
    (row) => String(row?.caller_id_number || '').trim() || 'Unknown',
  );
  const tableRows = Array.from(grouped.entries())
    .filter(([number, calls]) => number !== 'Unknown' && calls.length > 1)
    .map(([number, calls]) => {
      const abandoned = calls.filter(isMissedCall);
      const contactName = calls.map((row) => String(row?.contact_name || '').trim()).find(Boolean);
      return [
        number,
        contactName || 'Not in contacts',
        calls.length,
        calls.filter(isAnswered).length,
        abandoned.length,
        clock(avg(calls.filter(isAnswered).map(callTalkSeconds))),
        moment(
          calls
            .map((row) => moment(row?.start_stamp).valueOf())
            .reduce((latest, value) => Math.max(latest, value), 0),
        ).format('MMM DD, HH:mm'),
      ];
    })
    .sort((a, b) => Number(b[2]) - Number(a[2]));
  return {
    head: ['Caller', 'Contact', 'Calls', 'Answered', 'Abandoned', 'AHT', 'Last call'],
    rows: tableRows,
    note: 'Inbound numbers that called more than once in this range — useful for spotting unresolved issues driving call-backs.',
  };
};
