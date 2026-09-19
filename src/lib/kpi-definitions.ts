/* Generated 14 Sep 2026 from docs/performance-reporting-billing-reference/csv/01_area1.csv
   (product-neutral columns only). Regenerate rather than hand-edit. */

export type KpiDefinition = {
  item: string;
  what: string;
  type: string;
  formula: string;
  granularity: string;
};

export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    "item": "Average Speed of Answer (ASA)",
    "what": "How long the average caller waited in the queue before an agent picked up. Only calls that were actually answered count.",
    "type": "historical + real-time",
    "formula": "Numerator: sum of wait time of ANSWERED interactions. Denominator: count of answered interactions. Excludes abandoned, flow-out and never-answered interactions, and excludes time before the queue (IVR, greeting). Time basis: recorded in the interval in which the agent ANSWERED, not the interval the call arrived.",
    "granularity": "Per queue, per agent, per interval; Real-time tiles refresh in seconds; historical aggregate lags the interaction's completion."
  },
  {
    "item": "Service Level / SLA %",
    "what": "The share of calls answered inside a target time, e.g. 80% answered within 20 seconds. The headline promise a contact centre makes.",
    "type": "historical + real-time",
    "formula": "Numerator: interactions answered within the target. Denominator: vendor- and configuration-dependent - see N/O/P.",
    "granularity": "Per queue/skill, per interval; 15-30 min buckets. Real-time tile plus historical interval series."
  },
  {
    "item": "Abandon Rate (inbound queue)",
    "what": "The share of queued callers who hung up before an agent answered.",
    "type": "historical + real-time",
    "formula": "Numerator: interactions the customer disconnected before agent connect. Denominator: offered. Whether short abandons sit in the numerator, the denominator, both or neither is the configurable part.",
    "granularity": "Per queue, per interval; 15-30 min buckets. Real-time and historical."
  },
  {
    "item": "Short-abandon threshold",
    "what": "A cut-off in seconds under which a hang-up is treated as a misdial rather than a real abandonment.",
    "type": "historical",
    "formula": "Unit: seconds.",
    "granularity": "Takes effect on new data."
  },
  {
    "item": "Average Handle Time (AHT)",
    "what": "The average total time an agent spends finishing one interaction, including talking, holding and the paperwork afterwards.",
    "type": "historical",
    "formula": "Denominator: number of interactions handled. Time basis: stamped when the calculation completes - i.e. at ACW submission, so a call can land in a later interval than it started.",
    "granularity": "Per agent, per queue, per campaign, per interval. Historical only on all three; a live AHT tile is a running aggregate, not an event."
  },
  {
    "item": "Average Talk Time",
    "what": "The average time an agent actually spent speaking to the customer, with hold time taken out.",
    "type": "historical",
    "formula": "Numerator: total talk time.",
    "granularity": "Per agent, per queue, per interval. Historical."
  },
  {
    "item": "Average Hold Time",
    "what": "How long, on average, a customer sat on hold during a call.",
    "type": "historical",
    "formula": "Numerator: sum of all hold segments. Excludes queue wait, which is not hold.",
    "granularity": "Per agent, per queue, per interval. Historical."
  },
  {
    "item": "After-Call Work (ACW) / wrap-up time",
    "what": "The time an agent spends finishing paperwork after the customer has hung up, before they are ready for the next call.",
    "type": "historical",
    "formula": "Total ACW: cumulative seconds in the ACW state. Time basis: the interval in which ACW completes.",
    "granularity": "Per agent, per queue, per wrap-up code, per interval. Historical."
  },
  {
    "item": "Occupancy",
    "what": "Of the time an agent was available to take work, what share was spent actually working. A crowding measure, not a productivity one.",
    "type": "historical",
    "formula": "Time basis: per interval.",
    "granularity": "Per agent, per interval; Historical;"
  },
  {
    "item": "Utilization",
    "what": "Of the whole paid shift, what share was spent on productive work - including training and meetings, not just calls.",
    "type": "historical",
    "formula": "Industry: productive time / total paid or scheduled time x 100. Time basis: per interval or per shift.",
    "granularity": "Per agent, per interval or per shift. Historical."
  },
  {
    "item": "Agent Adherence",
    "what": "How closely an agent stuck to the schedule they were given - being on queue when they were meant to be.",
    "type": "historical + real-time",
    "formula": "Time basis: per shift or per interval.",
    "granularity": "Per agent, per interval, per activity."
  },
  {
    "item": "Offered (count)",
    "what": "How many calls the queue was asked to handle. The denominator for most other queue percentages.",
    "type": "historical + real-time",
    "formula": "Count. Time basis: interval of queue entry.",
    "granularity": "Per queue, per interval, per DNIS, per campaign. Real-time and historical."
  },
  {
    "item": "Answered (count)",
    "what": "How many queued calls an agent actually picked up.",
    "type": "historical + real-time",
    "formula": "Count. Time basis: interval of answer.",
    "granularity": "Per queue, per agent, per interval. Real-time and historical."
  },
  {
    "item": "Handled (count)",
    "what": "How many interactions an agent finished, counting outbound and non-queue work too.",
    "type": "historical",
    "formula": "Count. Time basis: the interval in which the interaction ENDS and ACW completes - not the interval it started.",
    "granularity": "Per agent, per queue, per campaign, per interval."
  },
  {
    "item": "Transfer Rate",
    "what": "How often agents pass a call on rather than finishing it themselves.",
    "type": "historical",
    "formula": "Numerator: interactions transferred by the agent. Denominator: interactions the agent answered.",
    "granularity": "Per agent, per queue, per interval."
  },
  {
    "item": "First Contact Resolution (FCR)",
    "what": "The share of customers whose problem was sorted on the first try, with no call-back needed.",
    "type": "historical",
    "formula": "Numerator: contacts resolved on the initial contact. Denominator: total contacts. The inclusion rule (what window counts as a repeat, who declares resolution) is the whole metric and no vendor fixes it.",
    "granularity": "Per queue, per agent, per interval; usually daily or monthly rather than intraday."
  },
  {
    "item": "Contact Rate (outbound)",
    "what": "Of the records dialled, how many reached a person at all.",
    "type": "historical",
    "formula": "Numerator: dials that reached a live person. Excludes non-live endpoints (machine, busy, SIT, no answer) from the numerator. Time basis: per campaign, per interval.",
    "granularity": "Per campaign, per list, per agent, per interval."
  },
  {
    "item": "Connect Rate (outbound)",
    "what": "Of the records dialled, how many ended up talking to one of our agents.",
    "type": "real-time + historical",
    "formula": "Numerator: campaign-connected conversations. Denominator: campaign attempts in the interval. Time basis: per interval, per campaign.",
    "granularity": "Per campaign, per interval."
  },
  {
    "item": "Right-Party Contact (RPC)",
    "what": "Of the people reached, how many were the person we were actually trying to reach - the metric collections and sales teams live on.",
    "type": "historical",
    "formula": "Numerator: attempts dispositioned as right-party contact. Denominator: contacts reached (or attempts, depending on the convention chosen). Entirely dependent on the disposition taxonomy.",
    "granularity": "Per campaign, per list, per agent, per interval."
  },
  {
    "item": "List Penetration %",
    "what": "How far through the calling list the campaign has got.",
    "type": "real-time",
    "formula": "Numerator: contact records completed. Denominator: contact records with callable numbers. Time basis: cumulative for the campaign run.",
    "granularity": "Per campaign, per contact list. Real-time indicator."
  },
  {
    "item": "Calls per Agent-Hour",
    "what": "How many calls each agent got through per hour on the campaign - the headline productivity number for outbound.",
    "type": "historical",
    "formula": "Numerator: calls (attempts, or connects) on the campaign. Denominator: agent hours logged in to that campaign. Time basis: per interval or per campaign run.",
    "granularity": "Per campaign, per agent, per interval."
  },
  {
    "item": "Abandoned-Call Rate (dialer / compliance)",
    "what": "The share of people the dialer called, who answered, and then got silence or a hang-up because no agent was free. This one is regulated.",
    "type": "real-time + historical",
    "formula": "Excludes non-live endpoints - answering machine, busy, tri-tone, no answer - from the calculation.",
    "granularity": "Per campaign, rolling window; also per interval for reporting. Real time for the dialer's own throttling."
  },
  {
    "item": "Average Pacing Ratio",
    "what": "How many numbers the dialer rings for each free agent. Turn it up and you get more conversations and more abandoned calls.",
    "type": "real-time",
    "formula": "Calls launched per available agent. a ratio of rates, not of calls.",
    "granularity": "Per campaign, live. Not normally a historical series."
  },
  {
    "item": "Conversion Rate (outbound)",
    "what": "How many calls turned into the outcome the campaign existed for - a sale, an appointment, a payment.",
    "type": "historical",
    "formula": "Numerator: attempts with a success-category outcome. Denominator: attempts, or contacts reached - state which. Time basis: per campaign or per interval.",
    "granularity": "Per campaign, per list, per agent, per interval."
  },
  {
    "item": "Attempts per Record",
    "what": "How many times we rang the same person before giving up.",
    "type": "historical",
    "formula": "Numerator: dial attempts against the record. Denominator: 1 record (reported as a mean across the list). Attempt limits configured per campaign or per list cap the numerator. Time basis: cumulative over the campaign run or the limit's reset period.",
    "granularity": "Per contact record, per list, per campaign."
  },
  {
    "item": "Agent Idle / Wait time (outbound)",
    "what": "How long agents sat waiting for the dialer to hand them a call.",
    "type": "real-time + historical",
    "formula": "WAIT TIME calculates the same amount of time the agent is in READY TIME.\" Time basis: per interval.",
    "granularity": "Per agent, per campaign, per interval."
  }
];

export const KPI_DICTIONARY_CHANGELOG: { date: string; change: string }[] = [
  { date: '2026-09-14', change: 'First published: 26 queue, agent and dialler definitions with formulas.' },
];
